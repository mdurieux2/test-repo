// Test de bout en bout : un « enfant robot » choisit son profil, joue une partie de
// chaque jeu sur un écran d'iPhone (en se trompant une fois), puis visite l'album et
// l'espace parents. Vérifie aussi la mise en page de chaque niveau sur un petit iPhone.
// Usage : npm run test:e2e   (SCREENSHOTS=dossier pour enregistrer des captures)

import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
import { startServer } from './serve.mjs';
import { GAMES, findGame } from '../app/js/games/index.js';
import { CALC_PALIERS } from '../app/js/games/maths.js';
import { PROGRAMS } from '../app/js/programs.js';
import { STORAGE_KEY } from '../app/js/storage.js';

const PORT = 8123;
const BASE = `http://localhost:${PORT}/`;
const SHOTS = process.env.SCREENSHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const server = await startServer(PORT);
const browser = await chromium.launch();
const errors = [];

function fail(message) {
  throw new Error(message);
}

/** Voix factice : la vraie synthèse vocale n'existe pas dans Chromium sans tête. */
async function newContext(viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-FR' });
  await context.addInitScript(() => {
    const fake = {
      speaking: false, pending: false,
      speak(u) { setTimeout(() => u.onend && u.onend(), 5); },
      cancel() {}, getVoices: () => [], addEventListener() {},
    };
    Object.defineProperty(window, 'speechSynthesis', { value: fake });
  });
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

async function openGame(page, game, { palier, format = 0 } = {}) {
  await goProfile(page, 'eva-rose', format ? `${BASE}?format=${format}` : BASE);
  await page.click(`[data-domain="${game.domain}"]`);
  await page.click(`[data-game="${game.id}"]`);
  // la tuile conseillée est animée en continu : clic forcé
  if (game.paliers) await page.click(palier ? `[data-palier="${palier}"]` : '.palier-tile.recommended', { force: true });
}

/** Aucun « null », « undefined » ou « NaN » ne doit apparaître à l'écran. */
async function assertNoJunk(page, label) {
  const junk = await page.evaluate(() => document.body.innerText.match(/\b(null|undefined|NaN)\b/)?.[0]);
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
      const sorted = [...q.items].sort((a, b) => (q.order === 'desc' ? b.value - a.value : a.value - b.value));
      if (wrongFirst) {
        await page.click(`.order-item[data-value="${sorted[1].value}"]`);
        await page.waitForSelector('.try-again');
      }
      for (const item of sorted) await page.click(`.order-item[data-value="${item.value}"]:not([disabled])`);
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
    default:
      if (wrongFirst) {
        const wrong = q.choices.find((c) => c.value !== q.answer);
        await page.click(`.choice[data-value="${wrong.value}"]`);
        await page.waitForSelector('.choice.wrong');
      }
      await page.click(`.choice[data-value="${q.answer}"]`);
  }
}

// ---------------------------------------------------------------- Parcours complet (iPhone 13)

const context = await newContext({ width: 390, height: 844 });
const page = await context.newPage();
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
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
  'animaux-monde': '38-animaux', saisons: '39-saisons', pays: '40-pays',
};
const bubbleText = (t) => t.replace(/[\u00a0\u202f]/g, ' ').replace(/\u2011/g, '-').replace(/\s+/g, ' ').trim();
for (const game of GAMES) {
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
  for (let i = 0; i < 5; i++) {
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
    await answer(page, q, i === 1);
    await assertNoJunk(page, `${game.id} question ${i + 1}`);
    await page.waitForFunction((el) => !el.isConnected, zone, { timeout: 15000 });
  }
  await page.waitForSelector('.results');
  await assertNoJunk(page, `${game.id} résultats`);
  const stars = await page.locator('.big-star.on').count();
  if (stars !== 2) fail(`${game.id} : ${stars} étoiles au lieu de 2 (4 bonnes sur 5)`);
  if (game.id === 'calcul') {
    await page.waitForTimeout(2500);
    await shot('17-resultats');
  }
  console.log(`✔ ${game.id} (${grade}) : partie complète, ${stars} étoiles`);
}

// choisir directement son niveau
await setStore(page, "store.profiles['eva-rose'].grade = 'CP';");
await goProfile(page);
await page.click('[data-domain="maths"]');
await page.click('[data-levels="compter"]');
await page.waitForSelector('.level-list');
if ((await page.locator('.level-row').count()) !== 6) fail('compter (CP) : 6 niveaux attendus');
await shot('19-niveaux');
await page.click('.level-row[data-level="4"]');
await page.waitForSelector('.choices');
if ((await page.textContent('.level-badge')) !== 'Niv. 4') fail('le niveau choisi n’est pas celui de la partie');
if ((await page.evaluate(() => globalThis.__lc.question.stage.count)) < 10) fail('compter niveau 4 : moins de 10 objets');
console.log('✔ choix direct du niveau');

// album : 2 étoiles par partie, un autocollant toutes les 5 étoiles
await goProfile(page);
await page.click('.domain-album');
const expected = Math.floor((GAMES.length * 2) / 5);
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

// profils séparés : Matteo n'a pas les étoiles d'Eva-Rose
await goProfiles(page);
const matteoStars = await page.textContent('[data-profile="matteo"] .profile-stars');
if (matteoStars.replace(/\D/g, '') !== '0') fail(`Matteo a des étoiles qui ne sont pas à lui : ${matteoStars}`);
await page.click('[data-profile="matteo"]');
await page.waitForSelector('.home');
await shot('05-accueil-matteo');
console.log('✔ profils séparés');

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
// ajouter puis supprimer un enfant
page.on('dialog', (dialog) => dialog.accept());
await goProfiles(page);
await page.click('.parent-btn');
await page.click('[data-tab="enfants"]');
await page.click('.add-child');
await page.fill('[data-field="name"]', 'Zoé');
await page.click('.child-submit');
await page.waitForSelector('[data-child-card="zoe"]');
await page.click('[data-edit="zoe"]');
await page.click('.delete-child');
await page.waitForSelector('[data-child-card="matteo"]');
if (await page.locator('[data-child-card="zoe"]').count()) fail('le profil supprimé est toujours là');
// remettre le prénom d'origine
await page.click('[data-edit="eva-rose"]');
await page.fill('[data-field="name"]', 'Eva-Rose');
await page.click('.child-submit');
await page.waitForSelector('.toast');
console.log('✔ espace parents (barrière, suivi, classe et prénom modifiés, enfant ajouté puis supprimé)');

// réglages : photo depuis l'iPhone (enregistrée automatiquement), version, journal, crédits
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
await page.click('.top-bar .icon-btn');
await page.click('[data-tab="reglages"]');
await page.waitForSelector('.settings');
await shot('07-reglages');
if ((await page.textContent('[data-version]')) !== pkg.version) fail('version affichée différente de package.json');
if (!(await page.textContent('.credits')).includes('Michaël Durieux')) fail('crédits absents');
if (!(await page.locator('.changelog-entry').count())) fail('journal des modifications absent');
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

// hors ligne : le service worker doit servir l'app sans réseau
await page.goto(BASE);
await page.evaluate(() => navigator.serviceWorker.ready);
await page.reload();
await context.setOffline(true);
await page.reload();
await page.waitForSelector('.profiles, .home');
await context.setOffline(false);
await context.close();
console.log('✔ fonctionne hors ligne');

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
    for (const el of document.querySelectorAll('.choice, .key, .match-item, .tile, .fill-row, .stage > *, .palier-tile, .game-card, .domain-btn, .profile-card, .parent-tab, .look-option, .child-row, .maze-arrow, .path-cell, .order-item, .order-slot, .level-row, .level-pick, .story-text, .text-body, .sudoku-cell, .sudoku-symbol, .sym-cell')) {
      if (el.scrollWidth > el.clientWidth + 1) return `contenu trop large : « ${el.textContent.trim().slice(0, 30)} »`;
    }
    const zone = document.querySelector('.choices, .home-menu, .profile-list');
    if (mustReach && zone && zone.getBoundingClientRect().bottom > window.innerHeight + 1) {
      return `boutons hors de l'écran (${Math.round(zone.getBoundingClientRect().bottom)} > ${window.innerHeight})`;
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

async function checkDevice(device, repeat) {
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
  await goProfiles(page);
  await checkLayout(page, tag('Qui joue ?'));
  for (const [id, grade] of [['matteo', 'MS'], ['eva-rose', 'CP']]) {
    await setStore(page, `store.profiles['${id}'] = store.profiles['${id}'] || {}; store.profiles['${id}'].grade = '${grade}';`);
    await goProfile(page, id);
    await checkLayout(page, tag(`accueil ${id}`));
    for (const domain of ['francais', 'maths', 'anglais', 'monde']) {
      await page.click(`[data-domain="${domain}"]`);
      await checkLayout(page, tag(`liste ${domain} ${id}`), { reachable: false });
      await page.click('.top-bar .icon-btn');
    }
  }
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/devices/${device.width}x${device.height}-accueil.png` });
  await page.click('[data-domain="maths"]');
  await page.click('[data-levels="calcul"], [data-levels="compter"]');
  await page.waitForSelector('.level-list');
  await checkLayout(page, tag('choix du niveau'), { reachable: false });
  checked += 12;

  // chaque niveau de chaque jeu
  for (const game of GAMES) {
    if (game.paliers) continue;
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
  // calcul : un palier sur trois, les 4 formes d'exercice
  await setStore(page, "store.profiles['eva-rose'].grade = 'CP';");
  for (const palier of CALC_PALIERS.filter((_, i) => i % 3 === 2)) {
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
  await checkLayout(page, tag('modifier un enfant'), { reachable: false });
  await page.click('.top-bar .icon-btn');
  await page.click('[data-tab="reglages"]');
  await page.waitForSelector('.settings');
  await checkLayout(page, tag('réglages'), { reachable: false });
  checked += 6;
  await ctx.close();
  return checked;
}

if (SHOTS) mkdirSync(`${SHOTS}/devices`, { recursive: true });
// 6 appareils à la fois, pour ne pas saturer la machine de test
const counts = [];
for (let i = 0; i < DEVICES.length; i += 6) {
  // plus de tirages sur les deux écrans les plus petits (iPhone SE, Android 360 points)
  counts.push(...await Promise.all(DEVICES.slice(i, i + 6).map((d, k) => checkDevice(d, i + k === 0 || d.width === 360 && d.height === 740 ? 3 : 1))));
}
DEVICES.forEach((d, i) => console.log(`✔ ${d.name} (${d.width}×${d.height}) : ${counts[i]} écrans vérifiés`));
if (layoutProblems.length) fail(`mise en page :\n${layoutProblems.join('\n')}`);

await browser.close();
server.close();
if (errors.length) fail(`erreurs JavaScript :\n${errors.join('\n')}`);
console.log('Tous les scénarios sont passés.');
