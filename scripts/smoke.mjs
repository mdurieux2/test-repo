// Test de bout en bout : un « enfant robot » choisit son profil, joue une partie de
// chaque jeu sur un écran d'iPhone (en se trompant une fois), puis visite l'album et
// l'espace parents. Vérifie aussi la mise en page de chaque niveau sur un petit iPhone.
// Usage : npm run test:e2e   (SCREENSHOTS=dossier pour enregistrer des captures)
//         ONLY=memory,points npm run test:e2e   (seulement la mise en page de ces jeux, sur tous les appareils)
//         ONLY=hors-ligne npm run test:e2e      (seulement le mode avion : chaque jeu sans réseau)
//         ONLY=ecrans npm run test:e2e          (seulement la mise en page des écrans fixes : accueil, listes, duo, parents)
//         PLAY=memory,points npm run test:e2e   (seulement une partie de ces jeux, sur iPhone)
//         PARTS=scenario | PARTS=layout SHARD=1/4   (une partie du test, comme dans la CI)
//         PORT=8124 pour lancer plusieurs tests en même temps
//         CHROMIUM_PATH=/chemin/vers/chrome pour un Chromium déjà installé

import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { startServer } from './serve.mjs';
import { DOMAINS, GAMES, findGame } from '../app/js/games/index.js';
import { CALC_PALIERS } from '../app/js/games/maths.js';
import { formatChrono } from '../app/js/games/chrono.js';
import { lineX, NL } from '../app/js/games/nombres-plus.js';
import { STORY_DATA } from '../app/js/games/histoires.js';
import { PROGRAMS } from '../app/js/programs.js';
import { starsFor } from '../app/js/progress.js';
import { stickersUnlocked } from '../app/js/rewards.js';
import { STORAGE_KEY } from '../app/js/storage.js';
import { APP } from '../app/js/config.js';
import { seasonOf } from '../app/js/themes.js';
import { cle, planLecture } from '../app/js/voix-cles.js';

const PORT = Number(process.env.PORT) || 8123;
const BASE = `http://localhost:${PORT}/`;
const SHOTS = process.env.SCREENSHOTS;
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const PLAY = process.env.PLAY ? process.env.PLAY.split(',') : null;
// En CI, le test est découpé : PARTS=scenario (le parcours complet), ou PARTS=layout avec SHARD=2/4
// (la mise en page sur un quart des appareils). Sans rien, tout est fait.
const PARTS = process.env.PARTS ? process.env.PARTS.split(',') : ['scenario', 'layout'];
const SHARD = process.env.SHARD ? process.env.SHARD.split('/').map(Number) : null;
// SPEECH_LOG=fichier.json : tout ce que l'application dit est noté (avec le nombre de fois et les
// écrans où c'est dit), pour choisir les phrases de la voix naturelle (scripts/voix/phrases.mjs) et
// vérifier écran par écran comment elles sont dites (scripts/voix/rapport.mjs)
const SPEECH_LOG = process.env.SPEECH_LOG;
const spokenLog = new Map();
const spokenScreens = new Map();
if (SPEECH_LOG) {
  // écrit à la fin, même si un test échoue : rien de ce qui a été noté n'est perdu
  process.on('exit', () => {
    const entries = [...spokenLog].map(([key, count]) => {
      const [text, lang, rate] = JSON.parse(key);
      return { text, lang, rate, count, ecrans: [...spokenScreens.get(key)] };
    });
    writeFileSync(SPEECH_LOG, `${JSON.stringify(entries.sort((a, b) => b.count - a.count), null, 1)}\n`);
    console.log(`✔ paroles notées : ${entries.length} phrases différentes → ${SPEECH_LOG}`);
  });
}
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const server = await startServer(PORT);
// CHROMIUM_PATH : utiliser un Chromium déjà installé (sinon celui téléchargé par Playwright)
// Micro factice (un bip), autorisé sans question : pour enregistrer les voix des parents.
const browser = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
});
const errors = [];

function fail(message) {
  throw new Error(message);
}

/** Voix factice : la vraie synthèse vocale n'existe pas dans Chromium sans tête (ce qui est dit va dans __spoken). */
async function newContext(viewport) {
  const context = await browser.newContext({
    viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-FR', permissions: ['microphone'],
  });
  if (SPEECH_LOG) {
    await context.exposeBinding('__parole', (_source, text, lang, rate, screen) => {
      const key = JSON.stringify([text, lang, rate]);
      spokenLog.set(key, (spokenLog.get(key) || 0) + 1);
      if (!spokenScreens.has(key)) spokenScreens.set(key, new Set());
      spokenScreens.get(key).add(screen);
    });
  }
  await context.addInitScript(() => {
    const fake = {
      speaking: false, pending: false,
      speak(u) {
        (window.__spoken = window.__spoken || []).push(u.text);
        // l'écran où c'est dit : « play compter », « welcome », « parents voices »…
        const main = document.querySelector('main.screen');
        const screen = main ? [...main.classList].filter((c) => c !== 'screen' && !c.startsWith('domain-theme') && !c.startsWith('play-')).join(' ') : '';
        window.__parole?.(u.text, u.lang, u.rate, main?.dataset.game ? `${screen} ${main.dataset.game}` : screen);
        setTimeout(() => u.onend && u.onend(), 5);
      },
      cancel() {}, getVoices: () => [], addEventListener() {},
    };
    Object.defineProperty(window, 'speechSynthesis', { value: fake });
    // Voix naturelle : ses sons ne sont pas joués (la voix factice prend le relais et note ce qui est dit),
    // sauf quand window.__voixNaturelle est vrai : le son est alors noté dans __clips et se termine aussitôt.
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function playForTests() {
      if (this.dataset?.voix !== 'naturelle') return play.call(this);
      if (!window.__voixNaturelle) return Promise.reject(new DOMException('test', 'NotAllowedError'));
      (window.__clips = window.__clips || []).push(this.src);
      setTimeout(() => this.dispatchEvent(new Event('ended')), 5);
      return Promise.resolve();
    };
    // tout ce que la règle de sécurité (CSP) bloque est une erreur
    document.addEventListener('securitypolicyviolation', (e) => console.error(`CSP ${e.violatedDirective} ${e.blockedURI}`));
  });
  context.on('console', (msg) => { if (msg.text().startsWith('CSP ')) errors.push(msg.text()); });
  return context;
}

/** Première classe où le jeu est au programme (avec ce niveau, si précisé). */
function gradeFor(gameId, level = null) {
  for (const [grade, domains] of Object.entries(PROGRAMS)) {
    for (const entries of Object.values(domains)) {
      const entry = entries.find(([id, min, max]) => id === gameId && (level === null || (level >= min && level <= max)));
      if (entry) return grade;
    }
  }
  return null;
}

/** Modifie les données enregistrées de l'app (le code reçoit l'objet `store`). */
async function setStore(page, code) {
  await page.evaluate(([key, body]) => {
    const store = JSON.parse(localStorage.getItem(key) || '{}');
    store.profiles = store.profiles || {};
    store.profiles['eva-rose'] = store.profiles['eva-rose'] || {};
    store.profiles['eva-rose'].games = store.profiles['eva-rose'].games || {};
    // eslint-disable-next-line no-new-func
    new Function('store', body)(store);
    localStorage.setItem(key, JSON.stringify(store));
  }, [STORAGE_KEY, code]);
}

/** Ouvre l'app sur l'écran « Qui joue ? ». */
async function goProfiles(page, url = BASE) {
  await page.goto(url);
  await page.waitForSelector('.profiles, .home');
  if (await page.locator('.home').count()) await page.click('.profile-chip');
  await page.waitForSelector('.profiles');
}

/** Ouvre l'app puis choisit un profil. */
async function goProfile(page, id = 'eva-rose', url = BASE) {
  await goProfiles(page, url);
  await page.click(`[data-profile="${id}"]`);
  await page.waitForSelector('.home');
}

/** Ouvre l'espace parents (en calculant la multiplication si la barrière est là). */
async function openParents(page) {
  await goProfiles(page);
  await page.click('.parent-btn');
  await page.waitForSelector('.parents, .gate');
  if (await page.locator('.gate').count()) {
    const [a, b] = (await page.textContent('.gate-question')).match(/\d+/g).map(Number);
    await page.fill('.gate-input', String(a * b));
    await page.click('.gate-form button');
    await page.waitForSelector('.parents');
  }
}

/** Écran « Vos voix » : Espace parents → Réglages → Vos voix pour les histoires. */
async function openVoices(page) {
  await openParents(page);
  await page.click('[data-tab="reglages"]');
  await page.click('[data-voices]');
  await page.waitForSelector('.voices');
}

async function openGame(page, game, { palier, format = 0 } = {}) {
  await goProfile(page, 'eva-rose', format ? `${BASE}?format=${format}` : BASE);
  await page.click(`[data-domain="${game.domain}"]`);
  await page.click(`[data-game="${game.id}"]`);
  // la tuile conseillée est animée en continu : clic forcé
  if (game.paliers) await page.click(palier ? `[data-palier="${palier}"]` : '.palier-tile.recommended', { force: true });
}

/** L'enfant actif et les étoiles de chacun, tels qu'enregistrés sur l'appareil. */
async function savedState(page) {
  return page.evaluate((key) => {
    const store = JSON.parse(localStorage.getItem(key));
    return { active: store.active, stars: Object.fromEntries(Object.entries(store.profiles).map(([id, kid]) => [id, kid.stars])) };
  }, STORAGE_KEY);
}

/** Ouvre « Jouer à deux » depuis « Qui joue ? » et choisit les deux joueurs (le premier commence). */
async function pickDuo(page, players) {
  await goProfiles(page);
  await page.click('[data-duo]');
  await page.waitForSelector('.duo-pick');
  for (const id of players) await page.click(`[data-pick="${id}"]`);
}

/** Aucun « null », « undefined » ou « NaN » ne doit apparaître à l'écran. */
async function assertNoJunk(page, label) {
  const junk = await page.evaluate(() => document.body.innerText.match(/\b(null|undefined|NaN)\b|\[object \w+\]/)?.[0]);
  if (junk) fail(`${label} : « ${junk} » affiché à l'écran`);
}

async function typeNumber(page, n) {
  for (const digit of String(n)) await page.click(`.key[data-key="${digit}"]`);
  await page.click('.key[data-key="✔"]');
}

/** Dessine une boucle au doigt (souris) passant par ces points de la page. */
async function drawLoop(page, points) {
  await page.mouse.move(...points[0]);
  await page.mouse.down();
  for (const p of [...points.slice(1), points[0]]) await page.mouse.move(...p, { steps: 3 });
  await page.mouse.up();
}

// Les patates : une boucle autour d'un seul objet est refusée, une boucle autour des
// deux objets les plus proches fait un paquet de 2.
let lassoTested = false;
let dragTested = false;
let dragMatchTested = false;
async function testLasso(page, q) {
  lassoTested = true;
  const centers = await page.$$eval('.lasso-object', (els) => els.map((el) => {
    const r = el.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  }));
  const box = await page.$eval('.lasso-field', (el) => el.getBoundingClientRect().width);
  const radius = (box / q.stage.cols) * 0.32;
  const circle = ([x, y]) => Array.from({ length: 16 }, (_, k) => [x + radius * Math.cos((k * Math.PI) / 8), y + radius * Math.sin((k * Math.PI) / 8)]);
  await drawLoop(page, circle(centers[0]));
  await page.waitForSelector('.try-again');
  if (!(await page.textContent('.try-again')).includes('entouré 1')) fail('patates : boucle autour d’un objet mal comptée');
  if (q.stage.group !== 2) return;
  let best = null;
  for (let i = 0; i < centers.length; i++) {
    for (let j = i + 1; j < centers.length; j++) {
      const d = Math.hypot(centers[i][0] - centers[j][0], centers[i][1] - centers[j][1]);
      if (!best || d < best.d) best = { i, j, d };
    }
  }
  // gélule autour du segment qui relie les deux objets
  const [a, b] = [centers[best.i], centers[best.j]];
  const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const arc = ([x, y], from) => Array.from({ length: 9 }, (_, k) => {
    const t = from + (k * Math.PI) / 8;
    return [x + radius * Math.cos(t), y + radius * Math.sin(t)];
  });
  await drawLoop(page, [...arc(b, angle - Math.PI / 2), ...arc(a, angle + Math.PI / 2)]);
  await page.waitForFunction(() => document.querySelectorAll('.lasso-object.grouped').length === 2, null, { timeout: 3000 })
    .catch(() => fail('patates : la boucle autour de deux objets n’a pas fait de paquet'));
  console.log('  ✔ patates : boucle dessinée au doigt (refusée autour d’un objet, acceptée autour de deux)');
}

/** Positions à l'écran des points d'un trait (carré 0–100 du dessin, avec sa marge de 8). */
async function tracePoints(page, points) {
  return page.$eval('.trace-drawing', (svg, pts) => {
    const r = svg.getBoundingClientRect();
    const scale = Math.min(r.width, r.height) / 116;
    const left = r.left + (r.width - 116 * scale) / 2;
    const top = r.top + (r.height - 116 * scale) / 2;
    return pts.map(([x, y]) => [left + (x + 8) * scale, top + (y + 8) * scale]);
  }, points);
}

/** Glisse le doigt (souris) par ces positions de la page. */
async function drag(page, points, steps = 2) {
  await page.mouse.move(...points[0]);
  await page.mouse.down();
  for (const p of points.slice(1)) await page.mouse.move(...p, { steps });
  await page.mouse.up();
}

// Écris au doigt : tracer à l'envers ne compte pas, s'éloigner du chemin donne un petit mot.
let traceTested = false;
async function testTrace(page, q) {
  traceTested = true;
  const first = q.stage.strokes[0];
  await drag(page, await tracePoints(page, [...first].reverse()));
  const state = await page.evaluate(() => ({
    finished: document.querySelector('.trace-drawing.finished') !== null,
    number: document.querySelector('.trace-start-num').textContent,
  }));
  if (state.finished || state.number !== '1') fail('écris au doigt : un trait tracé à l’envers a été accepté');
  const far = await tracePoints(page, [[-6, 106], [-4, 104], [-6, 102], [-3, 105]]);
  await page.mouse.move(...far[0]);
  await page.mouse.down();
  for (const p of far.slice(1)) {
    await page.waitForTimeout(150);
    await page.mouse.move(...p);
  }
  await page.mouse.up();
  await page.waitForSelector('.try-again');
  if (!(await page.textContent('.try-again')).includes('chemin gris')) fail('écris au doigt : pas de message hors du chemin');
  console.log('  ✔ écris au doigt : trait à l’envers refusé, « Reste sur le chemin gris ! » hors du chemin');
}

// Règle l'horloge : l'heure montrée par le cadran (attributs data-h et data-m du cadran).
let clockDragTested = false;
let numberLineButtonsTested = false; // la droite numérique : les boutons ◀ ▶ (une fois)
const clockMinutes = ({ h, m }) => (h % 12) * 60 + m;
async function clockTime(page) {
  return page.$eval('.setclock-dial', (el) => ({ h: Number(el.dataset.h), m: Number(el.dataset.m) }));
}

/** Règle l'horloge avec les boutons « +1 h », « −5 min »… (par le chemin le plus court). */
async function setClockWithButtons(page, target) {
  let diff = (((clockMinutes(target) - clockMinutes(await clockTime(page))) % 720) + 720) % 720;
  if (diff > 360) diff -= 720;
  const sign = diff < 0 ? -1 : 1;
  for (let k = 0; k < Math.floor(Math.abs(diff) / 60); k++) await page.click(`[data-shift="${sign * 60}"]`);
  for (let k = 0; k < (Math.abs(diff) % 60) / 5; k++) await page.click(`[data-shift="${sign * 5}"]`);
  const now = await clockTime(page);
  if (clockMinutes(now) !== clockMinutes(target)) fail(`régler l’horloge : ${now.h} h ${now.m} au lieu de ${target.h} h ${target.m}`);
}

/** Glisser la grande aiguille à la souris de 2 h 50 jusqu'à 3 h 10 : elle passe le 12 et l'heure avance. */
async function testClockDrag(page) {
  clockDragTested = true;
  await setClockWithButtons(page, { h: 2, m: 50 });
  const box = await page.locator('.setclock-dial svg').boundingBox();
  const [cx, cy, r] = [box.x + box.width / 2, box.y + box.height / 2, box.width * 0.3];
  const at = (deg) => [cx + r * Math.sin((deg * Math.PI) / 180), cy - r * Math.cos((deg * Math.PI) / 180)];
  await page.mouse.move(...at(300));
  await page.mouse.down();
  for (const deg of [315, 330, 345, 360, 15, 30, 45, 60]) await page.mouse.move(...at(deg), { steps: 3 });
  await page.mouse.up();
  const now = await clockTime(page);
  if (now.h !== 3 || now.m !== 10) fail(`régler l’horloge : après le glisser de la grande aiguille, ${now.h} h ${now.m} au lieu de 3 h 10`);
  console.log('  ✔ règle l’horloge : grande aiguille glissée à la souris (elle passe le 12, l’heure avance)');
}

async function answer(page, q, wrongFirst) {
  switch (q.interaction) {
    case 'keypad':
      if (wrongFirst) {
        await typeNumber(page, q.answer + 1);
        await page.waitForSelector('.try-again');
      }
      await typeNumber(page, q.answer);
      break;
    case 'match':
      if (!dragMatchTested && !wrongFirst) {
        // tracer un trait au doigt de la 1re étiquette jusqu'à son résultat
        dragMatchTested = true;
        const from = await page.locator('[data-left="0"]').boundingBox();
        const to = await page.locator(`[data-right="${q.pairs[0].right}"]`).boundingBox();
        await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
        await page.mouse.down();
        await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
        await page.mouse.up();
        if (!(await page.locator('[data-left="0"].matched').count())) fail('relier au doigt : la paire n’a pas été reliée');
        for (let i = 1; i < q.pairs.length; i++) {
          await page.click(`[data-left="${i}"]`);
          await page.click(`[data-right="${q.pairs[i].right}"]:not([disabled])`);
        }
        console.log('  ✔ relier : trait tracé au doigt');
        break;
      }
      if (wrongFirst) {
        const wrong = q.rights.find((v) => v !== q.pairs[0].right);
        await page.click('[data-left="0"]');
        await page.click(`[data-right="${wrong}"]`);
        await page.waitForSelector('.try-again');
      }
      for (let i = 0; i < q.pairs.length; i++) {
        await page.click(`[data-left="${i}"]`);
        await page.click(`[data-right="${q.pairs[i].right}"]:not([disabled])`);
        if (q.pairs[i].swatch) {
          // relier des couleurs : la paire prend la couleur reliée
          const pair = await page.$eval(`[data-left="${i}"]`, (el) => el.style.getPropertyValue('--pair'));
          if (pair !== q.pairs[i].swatch) fail(`relier les couleurs : ${pair} au lieu de ${q.pairs[i].swatch}`);
        }
      }
      break;
    case 'fill':
      if (wrongFirst) {
        // deux étiquettes qui ne donnent pas le bon résultat : la ligne tremble et se vide
        const eq = q.equations[0];
        const pairs = q.tiles.flatMap((x, i) => q.tiles.map((y, j) => [i, j, x, y]));
        const [i, j] = pairs.find(([a, b, x, y]) => a !== b && (eq.op === '+' ? x + y : x - y) !== eq.result);
        await page.click('.fill-box[data-row="0"][data-col="0"]');
        await page.click(`.tile[data-tile="${i}"]`);
        await page.click('.fill-box[data-row="0"][data-col="1"]');
        await page.click(`.tile[data-tile="${j}"]`);
        await page.waitForSelector('.try-again');
        await page.waitForFunction(() => !document.querySelector('.fill-box.filled'));
      }
      for (let r = 0; r < q.equations.length; r++) {
        for (let c = 0; c < 2; c++) {
          if (!dragTested && r === 0 && c === 0) {
            // glisser-déposer au doigt d'une étiquette dans la première case
            dragTested = true;
            const from = await page.locator(`.tile[data-value="${q.equations[0].solution[0]}"]:not(.used)`).first().boundingBox();
            const to = await page.locator('.fill-box[data-row="0"][data-col="0"]').boundingBox();
            await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
            await page.mouse.down();
            await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
            await page.mouse.up();
            if ((await page.textContent('.fill-box[data-row="0"][data-col="0"]')) !== String(q.equations[0].solution[0])) {
              fail('glisser-déposer : l’étiquette n’est pas arrivée dans la case');
            }
            console.log('  ✔ calculs à trous : glisser-déposer au doigt');
            continue;
          }
          await page.click(`.fill-box[data-row="${r}"][data-col="${c}"]`);
          await page.click(`.tile[data-value="${q.equations[r].solution[c]}"]:not(.used)`);
        }
      }
      break;
    case 'build': {
      for (const [i, item] of q.stage.items.entries()) {
        const bags = q.stage.tens && i === 0 ? Math.floor(item.target / 10) : 0;
        for (let k = 0; k < bags; k++) await page.click('[data-add="10"]');
        for (let k = 0; k < item.target - 10 * bags; k++) await page.click(`[data-add="1"][data-fruit="${i}"]`);
      }
      if (wrongFirst) {
        await page.click('[data-add="1"][data-fruit="0"]');
        await page.click('.validate-btn');
        await page.waitForSelector('.try-again');
        await page.click('.basket-item[data-fruit="0"]');
      }
      await page.click('.validate-btn');
      break;
    }
    case 'maze':
      // l'indice compte comme une aide : la question n'est plus « du premier coup »
      if (wrongFirst) await page.click('.maze-hint');
      for (const cell of q.stage.solution.slice(1)) await page.click(`.maze-cell[data-cell="${cell}"]`);
      break;
    case 'roundmaze': {
      // labyrinthe rond : on glisse le doigt de case en case (centre de chaque case, d'après le dessin)
      if (wrongFirst) await page.click('.maze-hint');
      const { sectors, solution } = q.stage;
      const box = await page.locator('.rmaze-svg').boundingBox();
      const V = sectors.length * 10 + 2; // comme dans main.js : centre et anneaux de 10, marge de 2
      const centre = (cell) => {
        let ring = 0;
        let first = 0;
        while (first + sectors[ring] <= cell) first += sectors[ring++];
        const a = 2 * Math.PI * ((cell - first + 0.5) / sectors[ring]);
        const rho = ring ? (ring + 0.5) * 10 : 0;
        return [box.x + ((rho * Math.sin(a) + V) / (2 * V)) * box.width, box.y + ((V - rho * Math.cos(a)) / (2 * V)) * box.height];
      };
      await page.mouse.move(...centre(solution[0]));
      await page.mouse.down();
      for (const cell of solution.slice(1)) await page.mouse.move(...centre(cell), { steps: 2 });
      await page.mouse.up();
      break;
    }
    case 'path': {
      const { path, cells } = q.stage;
      if (wrongFirst) {
        await page.click(`.path-cell[data-cell="${cells.findIndex((_, i) => !path.includes(i))}"]`);
        await page.waitForSelector('.try-again');
      }
      for (const cell of path.slice(1)) await page.click(`.path-cell[data-cell="${cell}"]`);
      break;
    }
    case 'order': {
      const sorted = q.items.filter((it) => it.value !== null)
        .sort((a, b) => (q.order === 'desc' ? b.value - a.value : a.value - b.value));
      if (wrongFirst) {
        // une lettre piège s'il y en a, sinon un élément différent du premier attendu
        const wrong = q.items.find((it) => it.value === null)
          || sorted.find((it) => (q.byLabel ? it.label !== sorted[0].label : it !== sorted[0]));
        await page.click(wrong.value === null ? `.order-item[data-value="null"][data-label="${wrong.label}"]` : `.order-item[data-value="${wrong.value}"]`);
        await page.waitForSelector('.try-again');
      }
      for (const item of sorted) await page.click(`.order-item[data-value="${item.value}"]:not([disabled])`);
      break;
    }
    case 'pay': {
      if (wrongFirst) {
        await page.click('[data-pay="1"]');
        if (q.answer === 1) await page.click('[data-pay="1"]');
        await page.click('.pay .validate-btn');
        await page.waitForSelector('.try-again');
        while (await page.locator('.pay-coin').count()) await page.click('.pay-coin >> nth=0');
      }
      let rest = q.answer;
      for (const v of [...q.values].sort((a, b) => b - a)) {
        while (rest >= v) {
          await page.click(`[data-pay="${v}"]`);
          rest -= v;
        }
      }
      await page.click('.pay .validate-btn');
      break;
    }
    case 'symmetry': {
      if (wrongFirst) {
        await page.click('.sym-zone .validate-btn'); // rien de colorié : il manque des cases
        await page.waitForSelector('.try-again');
      }
      for (const cell of q.stage.solution) await page.click(`.sym-cell[data-cell="${cell}"]`);
      await page.click('.sym-zone .validate-btn');
      break;
    }
    case 'picross': {
      const { solution, given, cols } = q.stage;
      if (wrongFirst) {
        await page.click('.picross-zone .validate-btn'); // rien de colorié : il manque des cases
        await page.waitForSelector('.try-again');
      }
      // une ligne d'un seul geste (le doigt glisse sur les cases), le reste case par case
      const todo = solution.filter((c) => !given.includes(c));
      const run = todo.filter((c) => Math.floor(c / cols) === Math.floor(todo[0] / cols));
      const contiguous = run.every((c, k) => !k || c === run[k - 1] + 1);
      if (!wrongFirst && run.length >= 2 && contiguous) {
        const box = async (c) => {
          const r = await page.locator(`.pc-cell[data-cell="${c}"]`).boundingBox();
          return [r.x + r.width / 2, r.y + r.height / 2];
        };
        await page.mouse.move(...await box(run[0]));
        await page.mouse.down();
        await page.mouse.move(...await box(run.at(-1)), { steps: 3 * run.length });
        await page.mouse.up();
        const painted = await page.locator('.pc-cell.on').count();
        if (painted !== given.length + run.length) fail(`dessin caché : ${painted - given.length} cases coloriées d’un geste au lieu de ${run.length}`);
      }
      for (const cell of todo) {
        if (!(await page.locator(`.pc-cell[data-cell="${cell}"].on`).count())) await page.click(`.pc-cell[data-cell="${cell}"]`);
      }
      break;
    }
    case 'sudoku': {
      const { puzzle, solution } = q.stage;
      const empty = puzzle.map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0);
      if (wrongFirst) {
        await page.click(`.sudoku-cell[data-cell="${empty[0]}"]`);
        await page.click(`.sudoku-symbol[data-symbol="${(solution[empty[0]] + 1) % q.stage.size}"]`);
        await page.waitForSelector('.try-again');
      }
      for (const cell of empty) {
        await page.click(`.sudoku-cell[data-cell="${cell}"]`);
        await page.click(`.sudoku-symbol[data-symbol="${solution[cell]}"]`);
      }
      break;
    }
    case 'lasso': {
      if (!lassoTested) await testLasso(page, q);
      const needed = Math.floor(q.stage.count / q.stage.group);
      while ((await page.locator('.lasso-object.grouped').count()) < needed * q.stage.group) {
        await page.click('.lasso-object:not(.grouped):not(.picked) >> nth=0');
      }
      await page.waitForSelector('.lasso-zone .choice');
      if (wrongFirst) {
        const wrong = q.choices.find((c) => c.value !== q.answer);
        await page.click(`.choice[data-value="${wrong.value}"]`);
        await page.waitForSelector('.choice.wrong');
      }
      await page.click(`.choice[data-value="${q.answer}"]`);
      break;
    }
    case 'swap': {
      // l'aide place une pièce (elle compte comme une aide), puis on échange les pièces
      if (wrongFirst) await page.click('.pz-hint');
      for (;;) {
        const order = await page.$$eval('.pz-tile', (els) => els.map((el) => Number(el.dataset.piece)));
        const pos = order.findIndex((v, i) => v !== i);
        if (pos < 0) break;
        await page.click(`.pz-tile[data-pos="${pos}"]`);
        await page.click(`.pz-tile[data-pos="${order.indexOf(pos)}"]`);
      }
      break;
    }
    case 'memory': {
      const { cards } = q;
      const first = (pair) => cards.findIndex((c) => c.pair === pair);
      if (wrongFirst) {
        // beaucoup de cartes retournées pour rien : pas d'étoile du premier coup
        const other = cards.findIndex((c) => c.pair !== cards[0].pair);
        for (let k = 0; k <= cards.length; k++) {
          await page.click('.memory-card[data-card="0"]');
          await page.click(`.memory-card[data-card="${other}"]`);
          await page.waitForFunction(() => !document.querySelector('.memory-card.open:not(.found)'));
        }
      }
      for (const pair of new Set(cards.map((c) => c.pair))) {
        const a = first(pair);
        const b = cards.findIndex((c, i) => i !== a && c.pair === pair);
        await page.click(`.memory-card[data-card="${a}"]`);
        await page.click(`.memory-card[data-card="${b}"]`);
        await page.waitForSelector(`.memory-card[data-card="${b}"].found`);
      }
      break;
    }
    case 'colorby': {
      const { zones } = q.stage;
      if (wrongFirst) {
        await page.click(`.magic-color[data-color="${(zones[0].c + 1) % q.stage.legend.length}"]`);
        await page.locator('.magic-zone[data-zone="0"]').dispatchEvent('click');
        await page.waitForSelector('.try-again');
      }
      for (const [i, z] of zones.entries()) {
        await page.click(`.magic-color[data-color="${z.c}"]`);
        await page.locator(`.magic-zone[data-zone="${i}"]`).dispatchEvent('click');
      }
      break;
    }
    case 'map': {
      // la carte du monde : une autre zone d'abord (son nom s'affiche), puis la bonne
      const zone = (id) => page.locator(`.world-map [data-zone="${id}"] >> nth=0`);
      if (wrongFirst) {
        await zone(q.choices.find((c) => c.value !== q.answer).value).dispatchEvent('click');
        await page.waitForSelector('.try-again');
      }
      await zone(q.answer).dispatchEvent('click');
      break;
    }
    case 'dots': {
      const centers = await page.$$eval('.dot .dot-point', (els) => els.map((el) => {
        const r = el.getBoundingClientRect();
        return [r.left + r.width / 2, r.top + r.height / 2];
      }));
      if (wrongFirst) {
        await page.mouse.click(...centers[2]);
        await page.waitForSelector('.try-again');
      }
      // un seul trait au doigt, d'un point au suivant
      await page.mouse.move(...centers[0]);
      await page.mouse.down();
      for (const c of centers.slice(1)) await page.mouse.move(...c, { steps: 4 });
      await page.mouse.up();
      break;
    }
    case 'trace': {
      // l'aide (💡) compte comme une aide : la question n'est plus « du premier coup »
      if (wrongFirst) await page.click('.trace-hint');
      else if (!traceTested) await testTrace(page, q);
      // chaque trait, en passant par ses points, dans l'ordre et dans le bon sens
      for (const st of q.stage.strokes) await drag(page, await tracePoints(page, st));
      break;
    }
    case 'setclock': {
      if (wrongFirst) {
        // une mauvaise heure : un conseil ; une deuxième : l'heure attendue est montrée
        if (clockMinutes(await clockTime(page)) === clockMinutes(q.target)) await page.click('[data-shift="5"]');
        await page.click('.setclock-zone .validate-btn');
        await page.waitForSelector('.try-again');
        if (!(await page.textContent('.try-again')).includes('aiguille')) fail('régler l’horloge : pas de conseil après une erreur');
        await page.click('.setclock-zone .validate-btn');
        await page.waitForSelector('.setclock-dial.show-hint');
        if (!(await page.textContent('.try-again')).includes(q.answer)) fail(`régler l’horloge : l’heure attendue (${q.answer}) n’est pas montrée`);
      } else if (!clockDragTested) {
        await testClockDrag(page);
      }
      await setClockWithButtons(page, q.target);
      await page.click('.setclock-zone .validate-btn');
      break;
    }
    case 'numberline': {
      // la droite numérique : toucher la droite à l'endroit du nombre (la flèche se cale sur la graduation)
      const touch = async (v) => {
        const box = await page.locator('.stage-nl .nl-svg').boundingBox();
        await page.mouse.click(box.x + (lineX(q.stage, v) / NL.width) * box.width, box.y + box.height * 0.6);
      };
      const placed = async () => Number(await page.getAttribute('.nl-place', 'data-value'));
      if (wrongFirst) {
        // trop loin (au-delà de l'écart accepté) : un conseil, puis encore : les pointillés
        const off = (q.tolerance || 0) + q.stage.snap;
        await touch(q.target + off <= q.stage.max ? q.target + off : q.target - off);
        await page.click('.numberline-zone .validate-btn');
        await page.waitForSelector('.try-again');
        if (!(await page.textContent('.try-again')).includes('C’est')) fail('droite numérique : pas de conseil après une erreur');
        await page.click('.numberline-zone .validate-btn');
        await page.waitForSelector('.nl-place.show-hint');
      } else if (!numberLineButtonsTested) {
        // les boutons ◀ ▶ déplacent la flèche d'une graduation
        numberLineButtonsTested = true;
        await touch(q.stage.min);
        await page.click('[data-move="1"]');
        if ((await placed()) !== q.stage.min + q.stage.snap) fail(`droite numérique : ▶ mène à ${await placed()}`);
      }
      await touch(q.target);
      if (Math.abs((await placed()) - q.target) > (q.tolerance || 0)) fail(`droite numérique : flèche sur ${await placed()} au lieu de ${q.target}`);
      await page.click('.numberline-zone .validate-btn');
      break;
    }
    case 'shade': {
      // colorier : une part de trop d'abord, puis exactement le bon nombre de parts
      const part = (i) => page.locator(`.fraction-shade [data-part="${i}"]`).dispatchEvent('click');
      if (wrongFirst) {
        for (let i = 0; i <= q.target; i++) await part(i);
        await page.click('.shade-zone .validate-btn');
        await page.waitForSelector('.try-again');
        await part(q.target);
      } else {
        for (let i = 0; i < q.target; i++) await part(i);
      }
      const count = Number(await page.getAttribute('.fraction-shade', 'data-count'));
      if (count !== q.target) fail(`fractions : ${count} parts coloriées au lieu de ${q.target}`);
      await page.click('.shade-zone .validate-btn');
      break;
    }
    default:
      if (wrongFirst) {
        const wrong = q.choices.find((c) => c.value !== q.answer);
        await page.click(`.choice[data-value="${wrong.value}"]`);
        await page.waitForSelector('.choice.wrong');
      }
      await page.click(`.choice[data-value="${q.answer}"]`);
  }
}

// ---------------------------------------------------------------- Défi chrono

/** Le record enregistré sur le profil pour ce jeu : { niveau: secondes }. */
async function savedRecords(page, gameId) {
  return page.evaluate(([key, id]) => JSON.parse(localStorage.getItem(key)).profiles['eva-rose'].records?.[id] || {}, [STORAGE_KEY, gameId]);
}

/** Pendant la partie : 10 points de progression, le chronomètre (mm:ss) dans le badge en haut à droite. */
async function checkChronoBadge(page, game, i) {
  const steps = await page.locator('.progress .step').count();
  if (steps !== game.questions) fail(`${game.id} : ${steps} questions au lieu de ${game.questions}`);
  const shown = (await page.textContent('.level-badge .chrono-clock')).trim();
  if (!/^⏱ \d{2}:\d{2}$/.test(shown)) fail(`${game.id} : chronomètre « ${shown} »`);
  if (i > 0 && shown === '⏱ 00:00') fail(`${game.id} : le chronomètre ne tourne pas`);
}

/** À la fin : le temps (mm:ss), le record du niveau (battu ou non), et ce qui est enregistré. */
async function checkChronoResults(page, game, { level = null, record = null } = {}) {
  const time = (await page.textContent('.chrono-time b')).trim();
  if (!/^\d{2}:\d{2}$/.test(time)) fail(`${game.id} : temps affiché « ${time} »`);
  const line = (await page.textContent('.chrono-record')).replace(/\s+/g, ' ');
  const saved = await savedRecords(page, game.id);
  if (record === null) {
    // premier défi : c'est un record, enregistré en secondes pour le niveau joué
    if (!line.includes('Nouveau record')) fail(`${game.id} : « Nouveau record » absent (${line})`);
    const levels = Object.keys(saved);
    if (levels.length !== 1 || formatChrono(saved[levels[0]]) !== time) fail(`${game.id} : record enregistré ${JSON.stringify(saved)} pour un temps de ${time}`);
    return Number(levels[0]);
  }
  // record imbattable : il est affiché et conservé
  if (line.includes('Nouveau') || !line.includes(`Ton record : ${formatChrono(record)}`)) fail(`${game.id} : record non conservé (${line})`);
  if (saved[level] !== record) fail(`${game.id} : record ${saved[level]} au lieu de ${record}`);
  return level;
}

/**
 * L'histoire à enregistrer pour le test : celle que le jeu tire le plus souvent aujourd'hui
 * (une histoire de la saison, seule de sa saison à son niveau, sort une fois sur deux).
 */
function storyToRecord() {
  const season = seasonOf(new Date()).id;
  const odds = (story) => {
    if (story.season && story.season !== season) return 0;
    const same = STORY_DATA.filter((s) => s.level === story.level);
    const seasonal = same.filter((s) => s.season === season);
    const common = same.filter((s) => !s.season);
    if (story.season) return (common.length ? 0.5 : 1) / seasonal.length;
    return (seasonal.length ? 0.5 : 1) / common.length;
  };
  return [...STORY_DATA].sort((a, b) => odds(b) - odds(a))[0];
}

/**
 * Histoires lues par un parent : Espace parents → Réglages → Vos voix → enregistrer une histoire
 * au micro (factice) → la garder ; puis, dans le jeu « Histoires », c'est l'enregistrement qui est
 * joué (élément audio, source blob:), les phrases s'allument, et la question est posée ensuite.
 */
async function checkRecordings(page) {
  const story = storyToRecord();
  await openVoices(page);
  if ((await page.locator('.voice-story').count()) !== STORY_DATA.length) fail('voix : toutes les histoires ne sont pas listées');
  if (!(await page.textContent('.voices-intro')).includes('restent sur cet appareil')) fail('voix : il manque le rappel « restent sur cet appareil »');
  await page.click(`[data-record="${story.id}"]`);
  await page.waitForSelector('[data-rec-start]');
  if (!(await page.textContent('.record-text')).replace(/\s+/g, ' ').includes(story.sentences[0].split(' ')[0])) fail('voix : le texte de l’histoire n’est pas affiché');
  // micro refusé une fois : un message clair, rien ne casse, et on peut réessayer
  await page.evaluate(() => {
    const devices = navigator.mediaDevices;
    const real = devices.getUserMedia.bind(devices);
    devices.getUserMedia = () => {
      devices.getUserMedia = real;
      return Promise.reject(new DOMException('Permission refusée', 'NotAllowedError'));
    };
  });
  await page.click('[data-rec-start]');
  await page.waitForSelector('.record-status.problem');
  if (!(await page.textContent('.record-status')).includes('micro est refusé')) fail('voix : pas de message clair quand le micro est refusé');
  await page.click('[data-rec-start]'); // « Réessayer »
  await page.waitForSelector('[data-rec-stop]');
  await page.waitForTimeout(1500);
  await page.click('[data-rec-stop]');
  await page.waitForSelector('[data-rec-keep]', { timeout: 5000 });
  if (!(await page.locator('[data-rec-listen]').count()) || !(await page.locator('[data-rec-redo]').count())) fail('voix : Écouter et Recommencer absents');
  await page.click('[data-rec-listen]');
  await page.waitForFunction(() => document.querySelector('.record-screen audio.story-audio')?.getAttribute('src')?.startsWith('blob:'), null, { timeout: 5000 });
  await page.click('[data-rec-keep]');
  await page.waitForSelector(`[data-story="${story.id}"][data-recorded]`);
  if (!(await page.textContent(`[data-story="${story.id}"]`)).includes('Enregistrée')) fail('voix : l’histoire n’apparaît pas comme enregistrée');
  if (!(await page.locator(`[data-listen="${story.id}"]`).count()) || !(await page.locator(`[data-delete="${story.id}"]`).count())) fail('voix : Écouter et Supprimer absents');
  const saved = await page.evaluate(async (id) => {
    const record = await (await import('./js/recordings.js')).get(id);
    return record && { duration: record.duration, size: record.size, mime: record.mime };
  }, story.id);
  if (!saved || !(saved.duration >= 1 && saved.duration <= 3) || !saved.size) fail(`voix : enregistrement inattendu ${JSON.stringify(saved)}`);
  console.log(`✔ voix des parents : « ${story.title} » enregistrée au micro (${saved.duration.toFixed(1)} s, ${saved.mime}), gardée sur l’appareil`);

  // dans le jeu : la voix enregistrée remplace la voix de synthèse pour l'histoire
  // (les phrases allumées sont relevées dès le chargement : une phrase courte ne reste allumée qu'un instant)
  await page.addInitScript(() => {
    window.__lit = [];
    new MutationObserver((records) => {
      for (const { target } of records) {
        if (target.classList?.contains('k-sentence') && target.classList.contains('on')) window.__lit.push(Number(target.dataset.s));
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'] });
  });
  await setStore(page, `store.profiles['eva-rose'].grade = '${gradeFor('histoires', story.level)}'; store.profiles['eva-rose'].games.histoires = { level: ${story.level} };`);
  let q = null;
  for (let tries = 0; tries < 40 && q?.stage.storyId !== story.id; tries++) {
    await openGame(page, findGame('histoires'));
    await page.waitForSelector('.choices');
    q = await page.evaluate(() => globalThis.__lc.question);
  }
  if (q.stage.storyId !== story.id) fail(`voix : l’histoire « ${story.title} » n’a pas été tirée en 40 essais`);
  await page.waitForSelector('.stage-karaoke audio.story-audio[src^="blob:"]', { state: 'attached', timeout: 5000 })
    .catch(() => fail('voix : l’enregistrement n’est pas joué dans le jeu'));
  await page.waitForFunction((text) => (globalThis.__spoken || []).includes(text), q.instruction[0], { timeout: 15000 })
    .catch(() => fail('voix : la question n’est pas posée après l’enregistrement'));
  const spoken = await page.evaluate(() => globalThis.__spoken);
  if (spoken.some((text) => story.sentences.includes(text))) fail('voix : l’histoire a aussi été lue par la voix de synthèse');
  // les phrases se sont allumées une à une, dans l'ordre, pendant la lecture ; plus rien ensuite
  const order = await page.evaluate(() => globalThis.__lit.filter((s, i, all) => s !== all[i - 1]));
  if (order.join() !== story.sentences.map((_, i) => i).join()) fail(`voix : phrases allumées ${order.join(', ') || 'jamais'} au lieu d’une à une`);
  if (await page.locator('.k-sentence.on').count()) fail('voix : une phrase reste allumée après la lecture');
  // 🔊 Relire l'histoire : l'enregistrement est rejoué
  await page.click('.karaoke-replay');
  await page.waitForFunction(() => {
    const audio = document.querySelector('.stage-karaoke audio.story-audio');
    return audio && !audio.paused && audio.getAttribute('src').startsWith('blob:');
  }, null, { timeout: 5000 }).catch(() => fail('voix : « Relire l’histoire » ne rejoue pas l’enregistrement'));
  console.log('✔ voix des parents : dans « Histoires », l’enregistrement est joué, les phrases s’allument, puis la question est posée');

  // 🗑 Supprimer : l'histoire revient à la voix de synthèse
  if (!page.listenerCount('dialog')) page.once('dialog', (dialog) => dialog.accept());
  await openVoices(page);
  await page.click(`[data-delete="${story.id}"]`);
  await page.waitForSelector(`[data-story="${story.id}"]:not([data-recorded])`);
  if (await page.locator('.voice-story[data-recorded]').count()) fail('voix : l’enregistrement supprimé est toujours là');
  console.log('✔ voix des parents : enregistrement supprimé');
}

// ---------------------------------------------------------------- Parcours complet (iPhone 13)

async function scenario() {

const context = await newContext({ width: 390, height: 844 });
const page = await context.newPage();
page.on('pageerror', (e) => errors.push(e.message));
// un son de la voix naturelle pas encore téléchargé (mode avion) : la voix de l'appareil prend le relais
const voiceClip = (m) => /\/voix\/(fr|en)\/[0-9a-f]+\.mp3$/.test(m.location()?.url || '');
page.on('console', (m) => m.type() === 'error' && !voiceClip(m) && errors.push(m.text()));
const shot = async (name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png` });

// premier lancement : la famille crée les profils (prénom, dessin, classe)
await page.goto(BASE);
await page.waitForSelector('.welcome');
await shot('00-bienvenue');
await page.click('.child-submit');
await page.waitForSelector('.form-error:not(:empty)'); // prénom obligatoire
await page.fill('[data-field="name"]', 'Eva-Rose');
await page.click('[data-look="fille"]');
await page.click('[data-grade="CP"]');
if ((await page.textContent('.look-option.on svg text')) !== 'Eva-Rose') fail('le prénom n’est pas écrit sur le tee-shirt');
await page.click('.child-submit');
await page.click('.add-another');
await page.fill('[data-field="name"]', 'Matteo');
await page.click('[data-look="garcon"]');
await page.click('[data-grade="MS"]');
await page.click('.child-submit');
await page.click('.start-btn');
await page.waitForSelector('.profiles');
if ((await page.locator('.profile-card').count()) !== 2) fail('il faut deux profils après la création');
if (!(await page.locator('[data-profile="eva-rose"]').count()) || !(await page.locator('[data-profile="matteo"]').count())) fail('identifiants de profil inattendus');
if ((await page.locator('.parent-btn').count()) !== 1) fail('un seul bouton pour les parents');
console.log('✔ premier lancement : profils créés (prénom, dessin, classe)');
await setStore(page, 'store.settings = { sessionLength: 5 };');
await page.reload();
await shot('01-qui-joue');
// inviter à installer l'icône : visible dans le navigateur, « Plus tard » le cache (et c'est retenu)
if (!(await page.locator('[data-install-hint]').count())) fail('installer l’icône : l’invitation est absente');
if (!(await page.textContent('[data-install-hint]')).includes('7 jours') && (await page.evaluate(() => /iPhone|iPad/.test(navigator.userAgent)))) fail('installer l’icône : explication des 7 jours absente');
await page.click('[data-install-later]');
await page.reload();
await page.waitForSelector('.profiles');
if (await page.locator('[data-install-hint]').count()) fail('installer l’icône : « Plus tard » n’est pas retenu');
console.log('✔ invitation à installer l’icône (masquée avec « Plus tard »)');
await page.click('[data-profile="eva-rose"]');
await page.waitForSelector('.home');
if (!(await page.textContent('.home-title')).replace('\u2011', '-').includes('Eva-Rose')) fail('prénom absent de l’accueil');
await shot('02-accueil');

const shotsWanted = {
  compter: '10-compter', 'vite-vu': '11-vite-vu', panier: '12-panier', dizaines: '13-dizaines', ecoute: '18-anglais',
  patates: '20-patates', labyrinthe: '21-labyrinthe', 'chemin-nombres': '22-chemin', ranger: '23-ranger',
  problemes: '24-probleme', heure: '25-heure', 'petits-textes': '26-texte', 'ou-est': '27-where', intrus: '28-intrus',
  ombres: '29-ombres', 'epelle-anglais': '30-epelle', relier: '31-relier', trous: '32-trous',
  sudoku: '33-sudoku', 'relie-calculs': '34-relie-calculs', symetrie: '36-symetrie', cubes: '37-cubes',
  'animaux-monde': '38-animaux', saisons: '39-saisons', pays: '40-pays', histoires: '44-histoire', monnaie: '45-monnaie',
  mesures: '46-mesures', calendrier: '47-calendrier', tangram: '48-tangram', reproduire: '49-reproduire', 'parle-anglais': '50-parle',
};
const bubbleText = (t) => t.replace(/[\u00a0\u202f]/g, ' ').replace(/\u2011/g, '-').replace(/\s+/g, ' ').trim();
let extraStars = 0; // étoiles gagnées en plus des 2 étoiles par jeu (deuxième défi chrono)
for (const game of GAMES.filter((g) => !PLAY || PLAY.includes(g.id))) {
  const grade = gradeFor(game.id);
  await setStore(page, `store.profiles['eva-rose'].grade = '${grade}';`);
  if (game.id === 'calcul') {
    await goProfile(page);
    await page.click('[data-domain="maths"]');
    await shot('03-maths');
    await page.click('[data-game="calcul"]');
    await page.waitForSelector('.palier-grid');
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot('04-paliers');
    await page.click('.palier-tile.recommended', { force: true });
  } else {
    await openGame(page, game);
  }
  const briefed = new Set();
  // une partie de 5 questions (réglage) avec une erreur : 2 étoiles ; le défi chrono a toujours
  // 10 questions : deux erreurs pour garder 2 étoiles (8 sur 10)
  const count = game.questions || 5;
  const wrongAt = game.questions ? [1, 6] : [1];
  for (let i = 0; i < count; i++) {
    const zone = await page.waitForSelector('.choices:not(.answered)');
    const q = await page.evaluate(() => globalThis.__lc.question);
    // consigne complète la première fois, puis la consigne courte
    const briefKey = q.short && (q.short.key ?? q.short.text);
    const expectedText = q.short && briefed.has(briefKey) ? q.short.text : q.text;
    if (q.short) briefed.add(briefKey);
    const shown = bubbleText(await page.textContent('.instruction .bubble'));
    if (shown !== bubbleText(expectedText)) fail(`${game.id} question ${i + 1} : bulle « ${shown} » au lieu de « ${expectedText} »`);
    if (i === 0 && shotsWanted[game.id]) await shot(shotsWanted[game.id]);
    if (game.id === 'calcul' && i === 0) await shot('14-calcul');
    if (game.id === 'calcul' && i === 1) await shot('15-relie');
    if (game.id === 'calcul' && i === 3) await shot('16-complete');
    if (!(await page.locator('.guide-btn .avatar-eva-rose').count())) fail(`${game.id} : la question n’est pas posée par Eva-Rose`);
    if (game.timed && (i === 0 || i === count - 1)) await checkChronoBadge(page, game, i);
    await answer(page, q, wrongAt.includes(i));
    await assertNoJunk(page, `${game.id} question ${i + 1}`);
    await page.waitForFunction((el) => !el.isConnected, zone, { timeout: 15000 });
  }
  await page.waitForSelector('.results');
  await assertNoJunk(page, `${game.id} résultats`);
  if ((await page.locator('.results .bar-actions [data-toggle-voice]').count()) !== 1) fail(`${game.id} : pas de bouton pour la voix sur les résultats`);
  const stars = await page.locator('.big-star.on').count();
  if (stars !== 2) fail(`${game.id} : ${stars} étoiles au lieu de 2 (${count - wrongAt.length} bonnes sur ${count})`);
  if (game.timed) {
    const level = await checkChronoResults(page, game);
    await shot('51-chrono');
    // deuxième défi avec un record imbattable (1 seconde) : il n'est pas battu, il est conservé
    await setStore(page, `const kid = store.profiles['eva-rose']; kid.records = { '${game.id}': { ${level}: 1 } };
      kid.games['${game.id}'] = { ...kid.games['${game.id}'], level: ${level} };`);
    await openGame(page, game);
    for (let i = 0; i < count; i++) {
      const zone = await page.waitForSelector('.choices:not(.answered)');
      await answer(page, await page.evaluate(() => globalThis.__lc.question), wrongAt.includes(i));
      await page.waitForFunction((el) => !el.isConnected, zone, { timeout: 15000 });
    }
    await page.waitForSelector('.results');
    await checkChronoResults(page, game, { level, record: 1 });
    extraStars += await page.locator('.big-star.on').count();
    console.log(`  ✔ ${game.id} : 10 questions, chronomètre, temps et record (battu, puis conservé)`);
  }
  if (game.id === 'calcul') {
    await page.waitForTimeout(2500);
    await shot('17-resultats');
  }
  console.log(`✔ ${game.id} (${grade}) : partie complète, ${stars} étoiles`);
}

if (PLAY) {
  if (PLAY.includes('histoires')) await checkRecordings(page);
  return;
}

// choisir directement son niveau
await setStore(page, "store.profiles['eva-rose'].grade = 'CP';");
await goProfile(page);
await page.click('[data-domain="maths"]');
await page.click('[data-levels="compter"]');
await page.waitForSelector('.level-list');
const [, compterMin, compterMax] = PROGRAMS.CP.maths.find(([id]) => id === 'compter');
if ((await page.locator('.level-row').count()) !== compterMax - compterMin + 1) fail(`compter (CP) : ${compterMax - compterMin + 1} niveaux attendus`);
await shot('19-niveaux');
await page.click('.level-row[data-level="4"]');
await page.waitForSelector('.choices');
if ((await page.textContent('.level-badge')) !== 'Niv. 4') fail('le niveau choisi n’est pas celui de la partie');
if ((await page.evaluate(() => globalThis.__lc.question.stage.count)) < 10) fail('compter niveau 4 : moins de 10 objets');
console.log('✔ choix direct du niveau');

// album : 2 étoiles par partie, un autocollant toutes les 5 étoiles (l'album en compte 30 au plus)
await goProfile(page);
await page.click('.domain-album');
const expected = stickersUnlocked(GAMES.length * 2 + extraStars);
const unlocked = await page.locator('.sticker:not(.locked)').count();
if (unlocked !== expected) fail(`${unlocked} autocollants au lieu de ${expected}`);
console.log(`✔ album : ${unlocked} autocollants`);

// défi du jour : 5 questions de jeux variés, une série de jours et une étoile bonus
await goProfile(page);
await page.click('[data-defi]');
const fromGames = new Set();
for (let i = 0; i < 5; i++) {
  const zone = await page.waitForSelector('.choices:not(.answered)');
  const q = await page.evaluate(() => globalThis.__lc.question);
  fromGames.add(q.from);
  await answer(page, q, false);
  await page.waitForFunction((el) => !el.isConnected, zone, { timeout: 15000 });
}
await page.waitForSelector('.daily-result');
if (!(await page.textContent('.daily-result')).includes('1 jour')) fail('défi du jour : série de jours absente');
if (fromGames.size < 3) fail(`défi du jour : seulement ${fromGames.size} jeux différents`);
await shot('35-defi');
await goProfile(page);
if (!(await page.textContent('[data-defi] .pill')).includes('fait')) fail('défi du jour : non marqué comme fait');
console.log(`✔ défi du jour (${fromGames.size} jeux différents, série de jours)`);

// révisions : les jeux où l'enfant s'est trompé reviennent, puis s'espacent
await goProfile(page);
if (!(await page.locator('[data-revision]').count())) fail('révisions : bouton absent après des erreurs');
await page.click('[data-revision]');
const revised = new Set();
for (let i = 0; i < 5; i++) {
  const zone = await page.waitForSelector('.choices:not(.answered)');
  const q = await page.evaluate(() => globalThis.__lc.question);
  revised.add(q.from);
  await answer(page, q, false);
  await page.waitForFunction((el) => !el.isConnected, zone, { timeout: 15000 });
}
await page.waitForSelector('.results');
const reviewSteps = await page.evaluate(([key, ids]) => {
  const kid = JSON.parse(localStorage.getItem(key)).profiles['eva-rose'];
  return ids.map((id) => kid.review[id]?.step ?? 'fini');
}, [STORAGE_KEY, [...revised]]);
if (reviewSteps.some((st) => st === 0)) fail(`révisions : pas espacées après une bonne réponse (${reviewSteps})`);
console.log(`✔ révisions (${revised.size} jeux revus, prochaines dans 1 jour ou plus)`);

// jeux bonus : après une partie à 2 étoiles ou plus
await page.click('[data-bonus-open]');
await page.click('[data-bonus="bulles"]');
await page.waitForSelector('.pop-bubble');
await page.click('.pop-bubble >> nth=0', { force: true });
await page.waitForFunction(() => document.querySelector('.bubble-score')?.textContent !== '0');
await shot('41-bulles');
await goProfile(page);
console.log('✔ jeu bonus : les bulles');

// habiller son personnage
await page.click('[data-dress]');
await assertNoJunk(page, 'personnage'); // l'écran ne doit pas afficher l'événement du toucher
if (await page.locator('.dress [disabled], .dress .lock').count()) fail('personnage : des tee-shirts ou accessoires sont encore verrouillés');
await page.click('[data-shirt="vert"]');
await page.click('[data-accessory="couronne"]');
if (!(await page.locator('.dress-preview svg text').allTextContents()).includes('👑')) fail('personnage : la couronne n’apparaît pas');
await shot('42-personnage');
console.log('✔ personnage habillé (tee-shirt vert, couronne)');

// objectif du jour et temps maximum (réglés par les parents)
await setStore(page, "store.profiles['eva-rose'].goals = { parts: 2, limit: 1 };");
await goProfile(page);
if (!(await page.textContent('.goal-bar')).includes('atteint')) fail('objectif du jour : non atteint malgré les parties jouées');
await page.click('[data-domain="maths"]');
await page.click('[data-game="compter"]');
await page.waitForSelector('.pause-card');
await shot('43-pause');
await setStore(page, "store.profiles['eva-rose'].goals = {};");
console.log('✔ objectif du jour et pause quand le temps est écoulé');

// lecture facilitée et décors de saison
await setStore(page, "store.profiles['eva-rose'].easyRead = true;");
await goProfile(page);
if (!(await page.evaluate(() => document.body.classList.contains('easy-read')))) fail('lecture facilitée non appliquée');
if (!(await page.evaluate(() => document.body.dataset.season))) fail('décor de saison absent');
await setStore(page, "store.profiles['eva-rose'].easyRead = false;");
console.log('✔ lecture facilitée et décor de saison');

// le son et la voix : deux boutons sur chaque écran (les mêmes réglages que dans l'espace parents)
await goProfile(page);
const soundState = (where = '.top-bar') => page.evaluate(([key, scope]) => {
  const { settings } = JSON.parse(localStorage.getItem(key));
  const button = (kind) => document.querySelector(`${scope} [data-toggle-${kind}]`);
  return {
    sounds: settings.sounds !== false, music: Boolean(settings.music), voice: settings.voice !== false,
    soundBtn: button('sound').getAttribute('aria-pressed'), voiceBtn: button('voice').getAttribute('aria-pressed'),
    soundOff: button('sound').classList.contains('off'), voiceOff: button('voice').classList.contains('off'),
  };
}, [STORAGE_KEY, where]);
let sound = await soundState();
if (!sound.sounds || sound.soundBtn !== 'true' || sound.soundOff) fail(`son : coupé par défaut ? ${JSON.stringify(sound)}`);
if (!sound.voice || sound.voiceBtn !== 'true' || sound.voiceOff) fail(`voix : coupée par défaut ? ${JSON.stringify(sound)}`);
await page.click('.top-bar [data-toggle-sound]');
sound = await soundState();
if (sound.sounds || sound.music || sound.soundBtn !== 'false' || !sound.soundOff) fail(`son : le bouton ne coupe pas les petits sons et la musique ${JSON.stringify(sound)}`);
await page.click('.top-bar [data-toggle-sound]');
sound = await soundState();
if (!sound.sounds || !sound.music || sound.soundBtn !== 'true') fail(`son : le bouton ne remet pas les petits sons et la musique ${JSON.stringify(sound)}`);
await setStore(page, 'store.settings.music = false;');
// sur les autres écrans aussi : liste des jeux, niveaux, espace parents, « Qui joue ? » (en bas)
await goProfile(page);
await page.click('[data-domain="maths"]');
if (!(await page.locator('.top-bar [data-toggle-sound]').count())) fail('son : pas de bouton dans la liste des jeux');
await page.click('.top-bar .icon-btn');
await goProfiles(page);
const footer = await page.evaluate(() => {
  const f = document.querySelector('.app-footer');
  return f && {
    text: f.textContent, mail: f.querySelector('a')?.getAttribute('href'),
    toggles: f.querySelectorAll('[data-toggle-sound], [data-toggle-voice]').length,
    changelog: f.querySelector('details.changelog .changelog-entry h3')?.textContent,
  };
});
if (!footer || !footer.text.includes(`Version ${APP.version}`) || !footer.text.includes(`Contact : ${APP.author}`) || footer.mail !== `mailto:${APP.contact}`
  || footer.toggles !== 2 || !footer.changelog?.startsWith(`Version ${APP.version}`)) {
  fail(`« Qui joue ? » : version, contact, journal ou boutons absents en bas ${JSON.stringify(footer)}`);
}
// voix coupée pendant un jeu : la consigne n'est plus dite ; remise : elle est redite
await goProfile(page);
await page.click('[data-domain="maths"]');
await page.click('[data-game="compter"]');
await page.waitForSelector('.choices');
await page.click('.top-bar [data-toggle-voice]');
sound = await soundState();
if (sound.voice || sound.voiceBtn !== 'false' || !sound.voiceOff) fail(`voix : le bouton du jeu ne la coupe pas ${JSON.stringify(sound)}`);
await page.evaluate(() => { window.__spoken = []; });
await page.click('.bubble');
await page.waitForTimeout(300);
if ((await page.evaluate(() => window.__spoken)).length) fail('voix coupée, mais la consigne est redite');
await page.click('.top-bar [data-toggle-voice]');
await page.waitForFunction(() => (window.__spoken || []).length > 0, null, { timeout: 5000 })
  .catch(() => fail('voix remise pendant le jeu : la consigne n’est pas redite'));
// voix coupée (et gardée au prochain lancement) : la consigne d'un jeu n'est pas dite
await page.click('.top-bar [data-toggle-voice]');
await goProfile(page);
await page.evaluate(() => { window.__spoken = []; });
await page.click('[data-domain="maths"]');
await page.click('[data-game="compter"]');
await page.waitForSelector('.choices');
await page.waitForTimeout(400);
const saidMuted = await page.evaluate(() => window.__spoken);
if (saidMuted.length) fail(`voix coupée, mais « ${saidMuted[0]} » est dit`);
// remise depuis l'accueil : Estelle dit bonjour
await goProfile(page);
await page.click('.top-bar [data-toggle-voice]');
await page.waitForFunction(() => (window.__spoken || []).some((t) => t.includes('Bonjour')), null, { timeout: 5000 })
  .catch(() => fail('voix remise : pas de « Bonjour »'));
if (!(await soundState()).voice) fail('voix : le bouton ne la remet pas');
console.log('✔ son et voix : boutons sur chaque écran ; version, contact et journal en bas de « Qui joue ? »');

// profils séparés : Matteo n'a pas les étoiles d'Eva-Rose
await goProfiles(page);
const matteoStars = await page.textContent('[data-profile="matteo"] .profile-stars');
if (matteoStars.replace(/\D/g, '') !== '0') fail(`Matteo a des étoiles qui ne sont pas à lui : ${matteoStars}`);
await page.click('[data-profile="matteo"]');
await page.waitForSelector('.home');
await shot('05-accueil-matteo');
console.log('✔ profils séparés');

// jouer à deux : Eva-Rose et Matteo, chacun son tour, 10 questions
const beforeDuo = await savedState(page);
await pickDuo(page, []);
if (!(await page.locator('.duo-go').isDisabled())) fail('duo : « C’est parti ! » possible sans avoir choisi deux enfants');
await page.click('[data-pick="eva-rose"]');
await page.click('[data-pick="matteo"]');
if (await page.locator('.duo-go').isDisabled()) fail('duo : « C’est parti ! » impossible avec deux enfants choisis');
await shot('51-duo-choix');
await page.click('.duo-go');
const programOf = (grade) => new Set(Object.values(PROGRAMS[grade]).flat().map(([id]) => id));
const duoPrograms = { 'eva-rose': programOf('CP'), matteo: programOf('MS') };
for (let i = 0; i < 10; i++) {
  const zone = await page.waitForSelector('.choices:not(.answered)');
  const q = await page.evaluate(() => globalThis.__lc.question);
  const turn = i % 2 === 0 ? 'eva-rose' : 'matteo';
  if (!(await page.locator(`.guide-btn .avatar-${turn}`).count())) fail(`duo question ${i + 1} : la question n’est pas posée par ${turn}`);
  if ((await page.locator('.duo-player').count()) !== 2) fail(`duo question ${i + 1} : les deux portraits ne sont pas en haut`);
  if (!(await page.locator(`.duo-player.turn[data-duo-player="${turn}"]`).count())) fail(`duo question ${i + 1} : le tour de ${turn} n’est pas mis en avant`);
  if (!duoPrograms[turn].has(q.from)) fail(`duo question ${i + 1} : ${q.from} n’est pas au programme de ${turn}`);
  if (i === 0) await shot('52-duo');
  await answer(page, q, false);
  await assertNoJunk(page, `duo question ${i + 1}`);
  await page.waitForFunction((el) => !el.isConnected, zone, { timeout: 15000 });
}
await page.waitForSelector('.duo-end');
await assertNoJunk(page, 'duo résultats');
await shot('53-duo-resultats');
if (!(await page.textContent('.duo-team')).includes('équipe')) fail('duo : pas de message pour l’équipe');
const afterDuo = await savedState(page);
const duoLines = [];
for (const id of ['eva-rose', 'matteo']) {
  const card = page.locator(`[data-duo-result="${id}"]`);
  const text = (await card.textContent()).replace(/\u2011/g, '-');
  const good = Number(text.match(/(\d+) bonnes? réponses?/)?.[1]);
  if (!text.includes(id === 'matteo' ? 'Matteo' : 'Eva-Rose') || Number.isNaN(good)) fail(`duo : résultats de ${id} absents`);
  const won = afterDuo.stars[id] - beforeDuo.stars[id];
  if (won < 1 || won !== starsFor(good, 5) || (await card.locator('.big-star.on').count()) !== won) {
    fail(`duo : ${id} gagne ${won} étoile(s) pour ${good} bonnes réponses sur 5`);
  }
  duoLines.push(`${id} ${good}/5, +${won} ⭐`);
}
if (afterDuo.active !== beforeDuo.active) fail(`duo : enfant actif « ${afterDuo.active} » au lieu de « ${beforeDuo.active} » après la partie`);
// rechargement au milieu d'une partie, puis abandon : « Qui joue ? » et l'enfant actif d'avant
await page.click('[data-duo-again]');
await page.waitForSelector('.duo-play');
await page.reload();
await page.waitForSelector('.profiles');
if ((await savedState(page)).active !== beforeDuo.active) fail('duo : enfant actif non restauré après un rechargement');
await pickDuo(page, ['matteo', 'eva-rose']);
await page.click('.duo-go');
await page.waitForSelector('.duo-play');
if (!(await page.locator('.guide-btn .avatar-matteo').count())) fail('duo : le premier enfant choisi ne commence pas');
await page.click('.top-bar .icon-btn');
await page.waitForSelector('.profiles');
if ((await savedState(page)).active !== beforeDuo.active) fail('duo : enfant actif non restauré après un abandon');
// temps du jour écoulé pour l'un des deux : on le dit, et la partie ne commence pas
await setStore(page, "store.profiles.matteo.goals = { limit: 10 }; store.profiles.matteo.history.push({ at: new Date().toISOString(), game: 'saisons', level: 1, correct: 5, total: 5, stars: 3, seconds: 900 });");
await pickDuo(page, ['eva-rose', 'matteo']);
await page.click('.duo-go');
await page.waitForSelector('.duo-hint.warning');
if (!(await page.textContent('.duo-hint')).includes('Matteo') || await page.locator('.duo-play').count()) fail('duo : lancé alors que Matteo a fini son temps du jour');
await setStore(page, 'store.profiles.matteo.goals = {}; store.profiles.matteo.history.pop();');
console.log(`✔ jouer à deux (10 questions en alternance, ${duoLines.join(', ')} ; enfant actif rendu ; temps du jour respecté)`);

// espace parents : barrière, tableau de bord, changement de classe
await goProfiles(page);
await page.click('.parent-btn');
const question = await page.textContent('.gate-question');
const [a, b] = question.match(/\d+/g).map(Number);
await page.fill('.gate-input', '1');
await page.click('.gate-form button');
await page.waitForSelector('.gate-error:not(:empty)');
await page.fill('.gate-input', String(a * b));
await page.click('.gate-form button');
await page.waitForSelector('.parents');
await page.click('[data-child="eva-rose"]');
if ((await page.locator('.stat-tile').count()) !== 4) fail('chiffres clés absents');
const rows = await page.locator('.game-row').count();
const programGames = Object.values(PROGRAMS.CP).flat().length;
if (rows !== programGames) fail(`${rows} jeux suivis au lieu de ${programGames}`);
if ((await page.locator('.chart-col').count()) !== 7) fail('graphique de la semaine absent');
await shot('06-parents');
const gamesBefore = await page.$$eval('.game-row', (els) => els.map((el) => el.textContent).join('|'));
// onglet Enfants : changer la classe et le prénom
await page.click('[data-tab="enfants"]');
await shot('06b-enfants');
await page.click('[data-edit="eva-rose"]');
await page.click('[data-grade="CE1"]');
await page.fill('[data-field="name"]', 'Lou');
await page.click('.child-submit');
await page.waitForSelector('.toast');
await shot('06c-modifier');
await page.click('.top-bar .icon-btn');
await page.click('[data-tab="suivi"]');
await page.click('[data-child="eva-rose"]');
await page.waitForFunction((before) => [...document.querySelectorAll('.game-row')].map((el) => el.textContent).join('|') !== before, gamesBefore);
await goProfiles(page);
if (!(await page.textContent('[data-profile="eva-rose"] .profile-name')).includes('Lou')) fail('nouveau prénom absent de « Qui joue ? »');
if ((await page.textContent('[data-profile="eva-rose"] svg text')) !== 'Lou') fail('nouveau prénom absent du tee-shirt');
await page.click('[data-profile="eva-rose"]');
await page.waitForSelector('.home');
if (!(await page.textContent('.home-title')).includes('Lou')) fail('nouveau prénom absent de l’accueil');
// ajouter puis supprimer un enfant, avec un prénom long tapé au clavier (gardé en entier)
const LONG_NAME = 'Paris Saint-Germain Féminines';
page.on('dialog', (dialog) => dialog.accept());
await goProfiles(page);
await page.click('.parent-btn');
await page.click('[data-tab="enfants"]');
await page.click('.add-child');
await page.locator('[data-field="name"]').pressSequentially(LONG_NAME);
await page.click('.child-submit');
const longId = 'paris-saint-germain-feminines';
await page.waitForSelector(`[data-child-card="${longId}"]`);
const longName = await page.evaluate(([key, id]) => JSON.parse(localStorage.getItem(key)).profiles[id]?.name, [STORAGE_KEY, longId]);
if (longName !== LONG_NAME) fail(`prénom long coupé : « ${longName} » au lieu de « ${LONG_NAME} »`);
await page.click('[data-edit="' + longId + '"]');
await page.click('.delete-child');
await page.waitForSelector('[data-child-card="matteo"]');
if (await page.locator(`[data-child-card="${longId}"]`).count()) fail('le profil supprimé est toujours là');
// remettre le prénom d'origine
await page.click('[data-edit="eva-rose"]');
await page.fill('[data-field="name"]', 'Eva-Rose');
await page.click('.child-submit');
await page.waitForSelector('.toast');
console.log('✔ espace parents (barrière, suivi, classe et prénom modifiés, enfant ajouté puis supprimé)');

// ses jeux : masquer un jeu et en conseiller un autre pour Eva-Rose (CE1), masquer une rubrique
await page.click('[data-domain-games="maths"] summary');
await page.click('[data-show-game="tables"]');
await page.waitForSelector('[data-show-game="tables"][aria-pressed="false"]');
if (!(await page.locator('[data-feature-game="tables"]').isDisabled())) fail('ses jeux : un jeu masqué peut être conseillé');
await page.click('[data-feature-game="problemes"]');
await page.waitForSelector('[data-feature-game="problemes"][aria-pressed="true"]');
await page.click('[data-domain-switch="monde"]');
await page.waitForSelector('[data-kid-domain="monde"].off');
await shot('54-ses-jeux');
const kidSettings = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).profiles['eva-rose'], STORAGE_KEY);
if (!kidSettings.hiddenGames.includes('tables') || !kidSettings.featured.includes('problemes') || !kidSettings.hiddenDomains.includes('monde')) {
  fail(`ses jeux : réglages non enregistrés (${JSON.stringify([kidSettings.hiddenGames, kidSettings.featured, kidSettings.hiddenDomains])})`);
}
await goProfile(page, 'eva-rose');
if (!(await page.textContent('.home-featured')).includes('Conseillé pour toi')) fail('accueil : bloc « Conseillé pour toi » absent');
if (!(await page.locator('.home-featured [data-featured="problemes"]').count())) fail('accueil : le jeu conseillé est absent');
if (await page.locator('[data-domain="monde"]').count()) fail('accueil : la rubrique masquée est affichée');
await shot('55-accueil-conseille');
await page.click('[data-domain="maths"]');
if (await page.locator('[data-game="tables"]').count()) fail('rubrique : le jeu masqué est affiché');
if (!(await page.locator('.game-card.featured [data-game="problemes"] .featured-badge').count())) fail('rubrique : pas de badge ⭐ sur le jeu conseillé');
await goProfile(page, 'eva-rose');
await page.click('[data-featured="problemes"]');
await page.waitForSelector('.choices');
if (!(await page.evaluate(() => globalThis.__lc.question.key))) fail('accueil : le jeu conseillé ne s’ouvre pas');
// on remet le jeu et la rubrique (le jeu conseillé reste) pour la suite du parcours
await goProfiles(page);
await page.click('.parent-btn');
await page.click('[data-tab="enfants"]');
await page.click('[data-edit="eva-rose"]');
await page.click('[data-domain-games="maths"] summary');
await page.click('[data-show-game="tables"]');
await page.click('[data-domain-switch="monde"]');
await page.waitForSelector('[data-show-game="tables"][aria-pressed="true"]');
await page.waitForSelector('[data-kid-domain="monde"]:not(.off)');
console.log('✔ ses jeux (jeu masqué, jeu conseillé en haut de l’accueil et avec un badge, rubrique masquée)');

// réglages : photo depuis l'iPhone (enregistrée automatiquement), version, journal, crédits
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
await page.click('.top-bar .icon-btn');
await page.click('[data-tab="reglages"]');
await page.waitForSelector('.settings');
await shot('07-reglages');
if ((await page.textContent('[data-version]')) !== pkg.version) fail('version affichée différente de package.json');
if (!(await page.textContent('.credits')).includes('Michaël Durieux')) fail('crédits absents');
if (!(await page.getAttribute('[data-contact]', 'href')).startsWith('mailto:')) fail('contact absent des crédits');
if (!(await page.locator('.changelog-entry').count())) fail('journal des modifications absent');
// le bouton du son (en haut) et les interrupteurs des réglages restent d'accord, dans les deux sens
const soundsSwitch = '.settings input[data-setting="sounds"]';
const musicSwitch = '.settings input[data-setting="music"]';
if (!(await page.isChecked(soundsSwitch)) || await page.isChecked(musicSwitch)) fail('réglages : petits sons coupés ou musique allumée par défaut');
await page.click('.top-bar [data-toggle-sound]');
if (await page.isChecked(soundsSwitch) || await page.isChecked(musicSwitch)) fail('réglages : le bouton du son en haut ne met pas à jour les interrupteurs');
await page.click(soundsSwitch);
if ((await page.getAttribute('.top-bar [data-toggle-sound]', 'aria-pressed')) !== 'true') fail('réglages : l’interrupteur des petits sons ne met pas à jour le bouton du son en haut');
await page.click('.settings input[data-setting="voice"]');
if ((await page.getAttribute('.top-bar [data-toggle-voice]', 'aria-pressed')) !== 'false') fail('réglages : l’interrupteur de la voix ne met pas à jour le bouton en haut');
await page.click('.top-bar [data-toggle-voice]');
if (!(await page.isChecked('.settings input[data-setting="voice"]'))) fail('réglages : le bouton de la voix en haut ne met pas à jour l’interrupteur');
// voix naturelle (Estelle) : allumée par défaut ; la phrase d'essai vient de ses sons (sinon, voix de l'appareil)
const VOICE_TEST = 'Bravo ! Tu as trouvé la bonne réponse.';
const voiceManifest = JSON.parse(readFileSync(new URL('../app/voix/manifest.json', import.meta.url), 'utf8'));
if (!(await page.locator('.natural-voice input[type=checkbox]').isChecked())) fail('voix naturelle coupée par défaut');
if (!(await page.textContent('.natural-voice-state')).trim()) fail('état de la voix naturelle absent');
if (!(await page.textContent('.credits')).includes('Pocket TTS')) fail('crédits de la voix naturelle absents');
await page.evaluate(() => { window.__spoken = []; window.__clips = []; window.__voixNaturelle = true; });
await page.click('.natural-voice input'); // coupée : la voix de l'appareil dit la phrase d'essai
await page.waitForFunction((text) => window.__spoken.includes(text), VOICE_TEST);
await page.click('.natural-voice input'); // rallumée
if (planLecture(VOICE_TEST, (key) => Object.hasOwn(voiceManifest.clips, key))?.length) {
  await page.waitForFunction(() => (window.__clips || []).some((src) => src.startsWith('blob:')));
  await page.waitForTimeout(300);
  if ((await page.evaluate(() => window.__spoken)).filter((t) => t === VOICE_TEST).length !== 1) fail('voix naturelle : la phrase a aussi été dite par la voix de l’appareil');
  console.log(`✔ voix naturelle : réglage, phrase jouée depuis ses sons (${voiceManifest.sons} sons)`);
} else {
  await page.waitForFunction((text) => window.__spoken.filter((t) => t === text).length === 2, VOICE_TEST);
  console.log('✔ voix naturelle : réglage ; sons pas encore générés, la voix de l’appareil prend le relais');
}
await page.evaluate(() => { window.__voixNaturelle = false; });
// téléchargement des sons pour le mode avion : en paquets, avec une barre en haut de l'écran
if (voiceManifest.paquets?.length) {
  const started = Date.now();
  await page.evaluate(() => { window.__telechargerVoix = true; window.dispatchEvent(new Event('online')); });
  await page.waitForSelector('.voice-progress', { timeout: 15000 });
  const during = await page.textContent('.voice-progress-text');
  if (!/^Voix d’Estelle : \d+ %$/.test(during)) fail(`barre de téléchargement : « ${during} »`);
  await page.waitForSelector('.voice-progress.done', { timeout: 180000 });
  const after = await page.textContent('.voice-progress-text');
  if (after !== 'Voix d’Estelle prête ✓') fail(`barre de téléchargement à la fin : « ${after} »`);
  await page.waitForSelector('.voice-progress', { state: 'detached', timeout: 5000 });
  const files = new Set(Object.values(voiceManifest.clips));
  const cached = await page.evaluate(async () => (await (await caches.open('lire-et-compter-voix')).keys())
    .map((r) => new URL(r.url).pathname.split('/voix/')[1]));
  const missing = [...files].filter((f) => !cached.includes(f));
  if (missing.length) fail(`téléchargement des sons : ${missing.length} manquants (${missing.slice(0, 3).join(', ')})`);
  // un son gardé est bien un MP3 (redécoupé au bon endroit dans son paquet)
  const head = await page.evaluate(async (file) => [...new Uint8Array(await (await fetch(`voix/${file}`)).arrayBuffer()).slice(0, 2)], [...files][5]);
  if (head[0] !== 0xff || (head[1] & 0xe0) !== 0xe0) fail(`son mal découpé : ${head}`);
  await page.evaluate(() => { window.__telechargerVoix = false; });
  console.log(`✔ voix : ${files.size} sons téléchargés en ${voiceManifest.paquets.length} paquets (${(voiceManifest.octets / 1e6).toFixed(0)} Mo) en ${((Date.now() - started) / 1000).toFixed(0)} s, barre « ${during} » puis « ${after} »`);
}
await page.click('[data-tab="enfants"]');
await page.click('[data-edit="eva-rose"]');
await page.setInputFiles('[data-photo-input="eva-rose"]', 'app/icons/icon-512.png');
await page.waitForSelector('.toast');
if (!(await page.locator('[data-photo-row="eva-rose"] .avatar-photo img').count())) fail('photo non affichée');
await page.reload();
await goProfiles(page);
if (!(await page.locator('[data-profile="eva-rose"] .avatar-photo img').count())) fail('photo non conservée après rechargement');
if (await page.locator('[data-profile="matteo"] .avatar-photo').count()) fail('la photo d’Eva-Rose est apparue chez Matteo');
await shot('08-qui-joue-photo');
await page.click('.parent-btn'); // barrière déjà franchie pendant cette séance
await page.click('[data-tab="enfants"]');
await page.click('[data-edit="eva-rose"]');
await page.click('[data-photo-row="eva-rose"] .link-action');
await page.waitForSelector('.toast');
if (await page.locator('[data-photo-row="eva-rose"] .avatar-photo').count()) fail('le dessin n’est pas revenu');
console.log('✔ réglages (photo enregistrée automatiquement, version, journal, crédits)');

// vos voix pour les histoires : enregistrer une histoire, puis l'entendre dans le jeu
await checkRecordings(page);

// hors ligne (mode avion) : le service worker doit servir l'app et tous les jeux sans réseau
await checkOffline(context, page);
await context.close();
}

/** Mode avion : après une première visite avec réseau, chaque jeu s'ouvre sans connexion. */
async function checkOffline(context, page) {
  await page.goto(BASE);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // la page est maintenant servie par le service worker
  const failed = [];
  let clipsMissing = 0;
  // un son de la voix naturelle pas encore téléchargé : la voix de l'appareil le remplace (vérifié plus bas)
  const onFail = (request) => {
    if (/\/voix\/(fr|en)\/[0-9a-f]+\.mp3$/.test(request.url())) clipsMissing++;
    // blob: : en mémoire, pas un fichier ; ERR_ABORTED : requête coupée par le changement de page
    else if (!request.url().startsWith('blob:') && request.failure()?.errorText !== 'net::ERR_ABORTED') failed.push(request.url());
  };
  page.on('requestfailed', onFail);
  await context.setOffline(true);
  await page.reload();
  await page.waitForSelector('.welcome, .profiles, .home');
  for (const game of GAMES) {
    await setStore(page, `store.profiles['eva-rose'].grade = '${gradeFor(game.id)}';`);
    await page.evaluate(() => { window.__spoken = []; });
    await openGame(page, game).catch(async (error) => {
      // ce qu'affiche la page à ce moment-là, pour comprendre sans pouvoir rejouer
      const seen = await page.evaluate(() => `${document.querySelector('main')?.className || '(aucun écran)'} : ${document.body.innerText.slice(0, 200)}`).catch(() => '?');
      fail(`hors ligne : ${game.id} ne s'ouvre pas (${page.url()} ; ${seen.replace(/\s+/g, ' ')}) : ${error.message.split('\n')[0]}`);
    });
    await page.waitForSelector('.choices');
    if (await page.locator('.choices').count() !== 1) fail(`hors ligne : ${game.id} ne s'affiche pas`);
    // la consigne est dite : par la voix naturelle si ses sons sont là, sinon par la voix de l'appareil
    await page.waitForFunction(() => (window.__spoken || []).length > 0 || (window.__clips || []).length > 0, null, { timeout: 15000 })
      .catch(() => fail(`hors ligne : ${game.id}, la consigne n'est pas dite`));
  }
  await context.setOffline(false);
  page.off('requestfailed', onFail);
  if (failed.length) fail(`hors ligne, fichiers introuvables : ${[...new Set(failed)].join(', ')}`);
  console.log(`✔ mode avion : l'app et les ${GAMES.length} jeux s'ouvrent sans réseau, consignes dites`
    + (clipsMissing ? ` (${clipsMissing} sons pas encore téléchargés : voix de l'appareil)` : ''));
}

if (!ONLY && PARTS.includes('scenario')) await scenario();
else if (ONLY?.includes('hors-ligne')) {
  const context = await newContext({ width: 390, height: 844 });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(`hors ligne : ${e.message}`));
  await checkOffline(context, page);
  await context.close();
}

// ---------------------------------------------------------------- Mise en page : tous les iPhone

// Tailles d'écran (points CSS) de l'iPhone 6 à l'iPhone 17 Pro Max (portrait et paysage),
// des iPad, et des principaux Android (le plus étroit : 360 points).
const DEVICES = [
  { name: 'iPhone 6-7-8-SE', width: 375, height: 667 },
  { name: 'iPhone 6-7-8 Plus', width: 414, height: 736 },
  { name: 'iPhone X-XS-11 Pro-12 mini-13 mini', width: 375, height: 812 },
  { name: 'iPhone XR-11-XS Max-11 Pro Max', width: 414, height: 896 },
  { name: 'iPhone 12-13-14', width: 390, height: 844 },
  { name: 'iPhone 12-13 Pro Max-14 Plus', width: 428, height: 926 },
  { name: 'iPhone 14 Pro-15-16', width: 393, height: 852 },
  { name: 'iPhone 14-15 Pro Max-15-16 Plus', width: 430, height: 932 },
  { name: 'iPhone 16-17 Pro-17', width: 402, height: 874 },
  { name: 'iPhone 16-17 Pro Max', width: 440, height: 956 },
  // téléphones en paysage
  { name: 'iPhone 6-7-8-SE paysage', width: 667, height: 375 },
  { name: 'iPhone 12-13-14 paysage', width: 844, height: 390 },
  { name: 'iPhone 16-17 Pro Max paysage', width: 956, height: 440 },
  { name: 'Samsung Galaxy S20-S24 paysage', width: 800, height: 360 },
  // Android (Chrome), téléphones puis tablette
  { name: 'Samsung Galaxy S8-S9, A50', width: 360, height: 740 },
  { name: 'Samsung Galaxy S20-S24, A54', width: 360, height: 800 },
  { name: 'Samsung Galaxy S23-S24 Ultra', width: 384, height: 824 },
  { name: 'Google Pixel 8a, Xiaomi Redmi', width: 393, height: 873 },
  { name: 'Google Pixel 7-8 Pro', width: 412, height: 915 },
  { name: 'Samsung Galaxy Tab S9', width: 800, height: 1280 },
  { name: 'Samsung Galaxy Tab S9 paysage', width: 1280, height: 800 },
  // iPad, en portrait puis en paysage
  { name: 'iPad mini', width: 744, height: 1133 },
  { name: 'iPad mini paysage', width: 1133, height: 744 },
  { name: 'iPad 10,2"', width: 810, height: 1080 },
  { name: 'iPad 10,2" paysage', width: 1080, height: 810 },
  { name: 'iPad 10e-11e gén., iPad Air 11"', width: 820, height: 1180 },
  { name: 'iPad 10e-11e gén., iPad Air 11" paysage', width: 1180, height: 820 },
  { name: 'iPad Pro 11"', width: 834, height: 1194 },
  { name: 'iPad Pro 11" paysage', width: 1194, height: 834 },
  { name: 'iPad Pro 12,9", iPad Air 13"', width: 1024, height: 1366 },
  { name: 'iPad Pro 12,9", iPad Air 13" paysage', width: 1366, height: 1024 },
  { name: 'iPad Pro 13" (M4)', width: 1032, height: 1376 },
  { name: 'iPad Pro 13" (M4) paysage', width: 1376, height: 1032 },
];

// Jeux dont la hauteur dépend du tirage (nombre de plaques, d'objets, de paquets) :
// plus de questions tirées sur le plus petit écran pour attraper le pire cas.
const STRESS = {
  dizaines: 15, compter: 8, tables: 8, 'vite-vu': 6, panier: 6, patates: 4, 'petits-textes': 8, problemes: 4, relier: 3,
  'relie-calculs': 3, trous: 3,
};

async function checkLayout(page, label, { reachable = true } = {}) {
  const problem = await page.evaluate((mustReach) => {
    if (document.documentElement.scrollWidth > window.innerWidth) return 'la page déborde en largeur';
    for (const el of document.querySelectorAll('.choice, .key, .match-item, .tile, .fill-row, .stage > *, .palier-tile, .game-card, .domain-btn, .profile-card, .parent-tab, .look-option, .child-row, .maze-arrow, .path-cell, .order-item, .order-slot, .level-row, .level-pick, .story-text, .text-body, .sudoku-cell, .sudoku-symbol, .sym-cell, .featured-game, .domain-tile, .kid-game')) {
      if (el.scrollWidth > el.clientWidth + 1) return `contenu trop large : « ${el.textContent.trim().slice(0, 30)} »`;
    }
    const zone = document.querySelector('.choices, .home-menu, .profile-list');
    if (mustReach && zone && zone.getBoundingClientRect().bottom > window.innerHeight + 1) {
      return `boutons hors de l'écran (${Math.round(zone.getBoundingClientRect().bottom)} > ${window.innerHeight})`;
    }
    // « Jouer à deux » : le bouton « C'est parti ! » sous les portraits doit aussi être visible
    const go = document.querySelector('.duo-go');
    if (mustReach && go && go.getBoundingClientRect().bottom > window.innerHeight + 1) {
      return `« C’est parti ! » hors de l'écran (${Math.round(go.getBoundingClientRect().bottom)} > ${window.innerHeight})`;
    }
    // en paysage, le dessin est à côté des réponses : il doit aussi tenir dans l'écran
    const stage = document.querySelector('.stage');
    if (mustReach && stage && stage.getBoundingClientRect().bottom > window.innerHeight + 1) {
      return `dessin hors de l'écran (${Math.round(stage.getBoundingClientRect().bottom)} > ${window.innerHeight})`;
    }
    return null;
  }, reachable);
  // on note tous les problèmes de mise en page, et on échoue à la fin avec la liste complète
  if (problem) layoutProblems.push(`${label} : ${problem}`);
}
const layoutProblems = [];

/** Les boutons de l'écran d'enregistrement restent visibles sans faire défiler. */
async function checkRecordButtons(page, label) {
  const problem = await page.evaluate(() => {
    const r = document.querySelector('.record-buttons').getBoundingClientRect();
    return r.top < 0 || r.bottom > window.innerHeight + 1 ? `boutons d’enregistrement hors de l’écran (${Math.round(r.top)}–${Math.round(r.bottom)})` : null;
  });
  if (problem) layoutProblems.push(`${label} : ${problem}`);
}

/** Vos voix : la liste des histoires, puis l'enregistrement de la plus longue (avant et après). */
async function checkVoicesLayout(page, tag) {
  await openVoices(page);
  await checkLayout(page, tag('vos voix'), { reachable: false });
  const longest = STORY_DATA.reduce((a, b) => (b.sentences.join(' ').length > a.sentences.join(' ').length ? b : a));
  await page.click(`[data-record="${longest.id}"]`);
  await page.waitForSelector('[data-rec-start]');
  await checkLayout(page, tag('enregistrer une histoire'), { reachable: false });
  await checkRecordButtons(page, tag('enregistrer une histoire'));
  await page.click('[data-rec-start]');
  await page.waitForSelector('[data-rec-stop]');
  await page.waitForTimeout(400);
  await page.click('[data-rec-stop]');
  await page.waitForSelector('[data-rec-keep]', { timeout: 5000 });
  await checkLayout(page, tag('enregistrement à garder'), { reachable: false });
  await checkRecordButtons(page, tag('enregistrement à garder'));
  return 3;
}

async function checkDevice(device, repeat, deviceIndex) {
  // découpage en morceaux (SHARD=k/n) : chaque morceau vérifie tous les appareils, mais un jeu sur n
  // (décalé selon l'appareil), et les écrans fixes d'un appareil sur n
  const mine = (key) => !SHARD || key % SHARD[1] === SHARD[0] - 1;
  const ctx = await newContext({ width: device.width, height: device.height });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${device.name} : ${e.message}`));
  const tag = (label) => `${label} (${device.name}, ${device.width}×${device.height})`;
  let checked = 0;
  await page.goto(BASE);
  await page.waitForSelector('.welcome');
  await checkLayout(page, tag('bienvenue'), { reachable: false });
  await setStore(page, "store.profiles['eva-rose'].grade = 'CP';");

  // écrans fixes
  const screens = !ONLY || ONLY.includes('ecrans');
  if (screens && mine(deviceIndex)) {
  await goProfiles(page);
  await checkLayout(page, tag('Qui joue ?'));
  for (const [id, grade] of [['matteo', 'MS'], ['eva-rose', 'CP']]) {
    await setStore(page, `store.profiles['${id}'] = store.profiles['${id}'] || {}; store.profiles['${id}'].grade = '${grade}';`);
    await goProfile(page, id);
    await checkLayout(page, tag(`accueil ${id}`));
    for (const domain of DOMAINS.map((d) => d.id)) {
      await page.click(`[data-domain="${domain}"]`);
      await checkLayout(page, tag(`liste ${domain} ${id}`), { reachable: false });
      await page.click('.top-bar .icon-btn');
    }
  }
  // accueil avec des jeux conseillés : un seul (Matteo), puis trois aux titres longs (Eva-Rose)
  await setStore(page, "store.profiles.matteo.featured = ['coloriage-magique'];");
  await goProfile(page, 'matteo');
  await checkLayout(page, tag('accueil conseillé matteo'));
  await setStore(page, "store.profiles['eva-rose'].featured = ['relie-calculs', 'petits-textes', 'chemin-nombres'];");
  await goProfile(page, 'eva-rose');
  await checkLayout(page, tag('accueil conseillé eva-rose'));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/devices/${device.width}x${device.height}-accueil-conseille.png` });
  await setStore(page, "store.profiles.matteo.featured = []; store.profiles['eva-rose'].featured = [];");
  // jouer à deux : le choix des deux joueurs
  await pickDuo(page, ['eva-rose', 'matteo']);
  await checkLayout(page, tag('choix du duo'));
  await goProfile(page);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/devices/${device.width}x${device.height}-accueil.png` });
  await page.click('[data-domain="maths"]');
  await page.click('[data-levels="calcul"], [data-levels="compter"]');
  await page.waitForSelector('.level-list');
  await checkLayout(page, tag('choix du niveau'), { reachable: false });
  await goProfile(page);
  await page.click('[data-dress]');
  await checkLayout(page, tag('personnage'), { reachable: false });
  checked += 22;
  }

  // chaque niveau de chaque jeu
  for (const [gameIndex, game] of GAMES.entries()) {
    if (game.paliers || ONLY && !ONLY.includes(game.id) || !mine(gameIndex + deviceIndex)) continue;
    for (let level = 1; level <= game.levels.length; level++) {
      const grade = gradeFor(game.id, level);
      await setStore(page, `store.profiles['eva-rose'].grade = '${grade}'; store.profiles['eva-rose'].games['${game.id}'] = { level: ${level} };`);
      for (let k = 0; k < (repeat > 1 ? STRESS[game.id] || repeat : repeat); k++) {
        await openGame(page, game);
        await page.waitForSelector('.choices');
        await checkLayout(page, tag(`${game.id} niveau ${level}`));
        checked++;
      }
    }
  }
  if ((ONLY && !screens) || !mine(deviceIndex)) {
    if (ONLY?.includes('histoires')) checked += await checkVoicesLayout(page, tag);
    await ctx.close();
    return checked;
  }
  // calcul : un palier sur trois, les 4 formes d'exercice (pas avec ONLY=ecrans)
  await setStore(page, "store.profiles['eva-rose'].grade = 'CP';");
  for (const palier of ONLY ? [] : CALC_PALIERS.filter((_, i) => i % 3 === 2)) {
    for (let format = 0; format < 4; format++) {
      await openGame(page, findGame('calcul'), { palier: palier.id, format });
      await page.waitForSelector('.choices');
      await checkLayout(page, tag(`calcul ${palier.id} format ${format}`));
      if (SHOTS && palier.max === 20 && format === 0) await page.screenshot({ path: `${SHOTS}/devices/${device.width}x${device.height}-calcul.png` });
      checked++;
    }
  }
  await goProfile(page);
  await page.click('[data-domain="maths"]');
  await page.click('[data-game="calcul"]');
  await checkLayout(page, tag('carte des paliers'));
  await page.goto(BASE);
  await goProfiles(page);
  await page.click('.parent-btn');
  const [a, b] = (await page.textContent('.gate-question')).match(/\d+/g).map(Number);
  await page.fill('.gate-input', String(a * b));
  await page.click('.gate-form button');
  await page.waitForSelector('.parents');
  await checkLayout(page, tag('espace parents'), { reachable: false });
  await page.click('[data-tab="enfants"]');
  await checkLayout(page, tag('enfants'), { reachable: false });
  await page.click('[data-edit="eva-rose"]');
  await page.click('[data-domain-games="maths"] summary'); // « Ses jeux » : une rubrique dépliée
  await checkLayout(page, tag('modifier un enfant'), { reachable: false });
  await page.click('.top-bar .icon-btn');
  await page.click('[data-tab="reglages"]');
  await page.waitForSelector('.settings');
  await checkLayout(page, tag('réglages'), { reachable: false });
  checked += 6;
  checked += await checkVoicesLayout(page, tag);
  await ctx.close();
  return checked;
}

if (SHOTS) mkdirSync(`${SHOTS}/devices`, { recursive: true });
// 6 appareils à la fois, pour ne pas saturer la machine de test
const devices = PLAY || !PARTS.includes('layout') ? [] : DEVICES;
// plus de tirages sur les deux écrans les plus petits (iPhone SE, Android 360 points)
const smallest = (d) => (d.width === 375 && d.height === 667) || (d.width === 360 && d.height === 740);
const counts = [];
for (let i = 0; i < devices.length; i += 6) {
  counts.push(...await Promise.all(devices.slice(i, i + 6).map((d, k) => checkDevice(d, smallest(d) ? 3 : 1, i + k))));
}
counts.forEach((n, i) => console.log(`✔ ${devices[i].name} (${devices[i].width}×${devices[i].height}) : ${n} écrans vérifiés`));
if (layoutProblems.length) fail(`mise en page :\n${layoutProblems.join('\n')}`);

await browser.close();
server.close();
if (errors.length) fail(`erreurs JavaScript :\n${errors.join('\n')}`);
console.log('Tous les scénarios sont passés.');
