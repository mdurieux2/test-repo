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
      for (let r = 0; r < q.equations.length; r++) {
        for (let c = 0; c < 2; c++) {
          await page.click(`.fill-box[data-row="${r}"][data-col="${c}"]`);
          await page.click(`.tile[data-value="${q.equations[r].solution[c]}"]:not(.used)`);
        }
      }
      break;
    case 'build': {
      const bags = q.stage.tens ? Math.floor(q.answer / 10) : 0;
      const singles = q.answer - 10 * bags;
      for (let i = 0; i < bags; i++) await page.click('[data-add="10"]');
      for (let i = 0; i < singles; i++) await page.click('[data-add="1"]');
      if (wrongFirst) {
        await page.click('[data-add="1"]');
        await page.click('.validate-btn');
        await page.waitForSelector('.try-again');
        await page.click('.basket-item');
      }
      await page.click('.validate-btn');
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

await page.goto(BASE);
await page.waitForSelector('.profiles');
if ((await page.locator('.profile-card').count()) !== 2) fail('il faut deux profils au lancement');
await setStore(page, 'store.settings = { sessionLength: 5 };');
await page.reload();
await shot('01-qui-joue');
await page.click('[data-profile="eva-rose"]');
await page.waitForSelector('.home');
if (!(await page.textContent('.home-title')).replace('\u2011', '-').includes('Eva-Rose')) fail('prénom absent de l’accueil');
await shot('02-accueil');

const shotsWanted = { compter: '10-compter', 'vite-vu': '11-vite-vu', panier: '12-panier', dizaines: '13-dizaines', ecoute: '18-anglais' };
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
  for (let i = 0; i < 5; i++) {
    const zone = await page.waitForSelector('.choices:not(.answered)');
    const q = await page.evaluate(() => globalThis.__lc.question);
    if (i === 0 && shotsWanted[game.id]) await shot(shotsWanted[game.id]);
    if (game.id === 'calcul' && i === 0) await shot('14-calcul');
    if (game.id === 'calcul' && i === 1) await shot('15-relie');
    if (game.id === 'calcul' && i === 3) await shot('16-complete');
    await answer(page, q, i === 1 && q.interaction !== 'fill');
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

// album : 2 étoiles par partie, un autocollant toutes les 5 étoiles
await goProfile(page);
await page.click('.domain-album');
const expected = Math.floor((GAMES.length * 2) / 5);
const unlocked = await page.locator('.sticker:not(.locked)').count();
if (unlocked !== expected) fail(`${unlocked} autocollants au lieu de ${expected}`);
console.log(`✔ album : ${unlocked} autocollants`);

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
const grade = await page.inputValue('.parents select.select >> nth=0');
const rows = await page.locator('.game-row').count();
const programGames = Object.values(PROGRAMS[grade]).flat().length;
if (rows !== programGames) fail(`${rows} jeux suivis au lieu de ${programGames}`);
if ((await page.locator('.chart-col').count()) !== 7) fail('graphique de la semaine absent');
await shot('06-parents');
await page.selectOption('.parents select.select >> nth=0', grade === 'CP' ? 'CE1' : 'CP');
await page.waitForFunction((n) => document.querySelectorAll('.game-row').length !== n, rows);
console.log('✔ espace parents (barrière, suivi, changement de classe)');

// réglages : photo depuis l'iPhone (enregistrée automatiquement), version, journal, crédits
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
await page.click('.settings-btn');
await page.waitForSelector('.settings');
await shot('07-reglages');
if ((await page.textContent('[data-version]')) !== pkg.version) fail('version affichée différente de package.json');
if (!(await page.textContent('.credits')).includes('Michaël Durieux')) fail('crédits absents');
if (!(await page.locator('.changelog-entry').count())) fail('journal des modifications absent');
await page.setInputFiles('[data-photo-input="eva-rose"]', 'app/icons/icon-512.png');
await page.waitForSelector('.toast');
if (!(await page.locator('[data-photo-row="eva-rose"] .avatar-photo img').count())) fail('photo non affichée');
await page.reload();
await goProfiles(page);
if (!(await page.locator('[data-profile="eva-rose"] .avatar-photo img').count())) fail('photo non conservée après rechargement');
if (await page.locator('[data-profile="matteo"] .avatar-photo').count()) fail('la photo d’Eva-Rose est apparue chez Matteo');
await shot('08-qui-joue-photo');
await page.click('.settings-btn'); // barrière déjà franchie pendant cette séance
await page.waitForSelector('.settings');
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

// Tailles d'écran (points CSS) de l'iPhone 6 à l'iPhone 17 Pro Max.
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
const STRESS = { dizaines: 15, compter: 8, tables: 8, 'vite-vu': 6, panier: 4 };

async function checkLayout(page, label, { reachable = true } = {}) {
  const problem = await page.evaluate((mustReach) => {
    if (document.documentElement.scrollWidth > window.innerWidth) return 'la page déborde en largeur';
    for (const el of document.querySelectorAll('.choice, .key, .match-item, .tile, .fill-row, .stage > *, .palier-tile, .game-card, .domain-btn, .profile-card')) {
      if (el.scrollWidth > el.clientWidth + 1) return `contenu trop large : « ${el.textContent.trim().slice(0, 30)} »`;
    }
    const zone = document.querySelector('.choices, .home-menu, .profile-list');
    if (mustReach && zone && zone.getBoundingClientRect().bottom > window.innerHeight + 1) {
      return `boutons hors de l'écran (${Math.round(zone.getBoundingClientRect().bottom)} > ${window.innerHeight})`;
    }
    return null;
  }, reachable);
  if (problem) fail(`${label} : ${problem}`);
}

async function checkDevice(device, repeat) {
  const ctx = await newContext({ width: device.width, height: device.height });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${device.name} : ${e.message}`));
  const tag = (label) => `${label} (${device.name}, ${device.width}×${device.height})`;
  let checked = 0;
  await page.goto(BASE);
  await setStore(page, "store.profiles['eva-rose'].grade = 'CP';");

  // écrans fixes
  await goProfiles(page);
  await checkLayout(page, tag('Qui joue ?'));
  for (const [id, grade] of [['matteo', 'MS'], ['eva-rose', 'CP']]) {
    await setStore(page, `store.profiles['${id}'] = store.profiles['${id}'] || {}; store.profiles['${id}'].grade = '${grade}';`);
    await goProfile(page, id);
    await checkLayout(page, tag(`accueil ${id}`));
    for (const domain of ['francais', 'maths', 'anglais']) {
      await page.click(`[data-domain="${domain}"]`);
      await checkLayout(page, tag(`liste ${domain} ${id}`), { reachable: false });
      await page.click('.top-bar .icon-btn');
    }
  }
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/devices/${device.width}x${device.height}-accueil.png` });
  checked += 9;

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
  await page.click('.settings-btn');
  await page.waitForSelector('.settings');
  await checkLayout(page, tag('réglages'), { reachable: false });
  checked += 3;
  await ctx.close();
  return checked;
}

if (SHOTS) mkdirSync(`${SHOTS}/devices`, { recursive: true });
// 6 appareils à la fois, pour ne pas saturer la machine de test
const counts = [];
for (let i = 0; i < DEVICES.length; i += 6) {
  counts.push(...await Promise.all(DEVICES.slice(i, i + 6).map((d, k) => checkDevice(d, i + k === 0 ? 3 : 1))));
}
DEVICES.forEach((d, i) => console.log(`✔ ${d.name} (${d.width}×${d.height}) : ${counts[i]} écrans vérifiés`));

await browser.close();
server.close();
if (errors.length) fail(`erreurs JavaScript :\n${errors.join('\n')}`);
console.log('Tous les scénarios sont passés.');
