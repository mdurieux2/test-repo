// Test sur un vrai simulateur iOS (Xcode, sur un Mac) : l'app est ouverte dans Safari, pilotée par
// safaridriver (le WebDriver d'Apple). Le parcours passe par le premier lancement, « Qui joue ? »,
// l'accueil, un jeu de chaque rubrique, les jeux aux mises en page délicates (textes et grands
// nombres du CM, pavé et explication d'une erreur) et les réglages des parents ; chaque écran est
// capturé et mesuré (débordements, erreurs JavaScript), avec un rapport en Markdown et en HTML.
//
// Usage, sur un Mac avec Xcode (une fois : sudo safaridriver --enable) :
//   IOS_APPAREIL="iPhone SE (3rd generation)" npm run test:ios
//   IOS_APPAREIL="iPad mini (A17 Pro)" IOS_VERSION=26.2 IOS_PAYSAGE=1 npm run test:ios
// Dans la CI : workflow « Simulateur iOS » (.github/workflows/ios.yml), captures dans les artefacts.
// Pour mettre au point le parcours sans Mac : PILOTE=playwright npm run test:ios (Chromium à la
// taille de l'appareil : ce n'est pas Safari, seulement le même parcours).
//
// Les réponses qui passent sous le bas de la fenêtre sont des avertissements, pas des échecs : dans
// Safari, les barres du navigateur prennent de la place que l'app installée sur l'écran d'accueil n'a
// pas à partager (c'est ce que mesure, en plein écran, npm run test:e2e).

import { execFileSync, spawn } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { startServer } from './serve.mjs';
import { addChild, defaultStore, storeSnapshot, STORAGE_KEY } from '../app/js/storage.js';
import { findGame } from '../app/js/games/index.js';
import { PROGRAMS } from '../app/js/programs.js';

const APPAREIL = process.env.IOS_APPAREIL || 'iPhone SE (3rd generation)';
const VERSION = process.env.IOS_VERSION || ''; // « 18 », « 26.2 »… ; sinon la plus récente
const PAYSAGE = Boolean(process.env.IOS_PAYSAGE);
const PILOTE = process.env.PILOTE || 'safari';
const SORTIE = process.env.SORTIE || 'ios-sortie';
const PORT = Number(process.env.PORT) || 8080;
const WD = `http://127.0.0.1:${Number(process.env.WD_PORT) || 4444}`;
// le simulateur partage le réseau du Mac : l'app servie sur le Mac s'ouvre à « localhost »
const BASE = `http://localhost:${PORT}/`;

// [jeu, niveau (ou palier du calcul)] : un jeu de chaque rubrique, puis les mises en page délicates
const PARCOURS = [
  ['lettres', 2], ['petits-textes', 4], ['compter', 4], ['memory', 1], ['heure', 2], ['gauche-droite', 3],
  ['corps', 1], ['ecoute', 1], ['calcul', '±10'], ['lecture-cm', 3], ['nombres-cm', 7], ['conjugaison-cm', 9],
  ['donnees-cm', 1], ['histoire', 1], ['anglais-cm', 1],
];

// taille de l'écran (points CSS) pour PILOTE=playwright ; le vrai simulateur donne la sienne
const TAILLES = {
  'iPhone SE (3rd generation)': [375, 667], 'iPhone 16e': [390, 844], 'iPhone 17': [402, 874], 'iPhone 17 Pro Max': [440, 956],
  'iPad mini (A17 Pro)': [744, 1133], 'iPad (A16)': [820, 1180],
};

const pause = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });
const slug = (texte) => texte.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();

/** Première classe où ce niveau du jeu est au programme. */
function classePour(id, niveau) {
  for (const [classe, rubriques] of Object.entries(PROGRAMS)) {
    for (const entrees of Object.values(rubriques)) {
      if (entrees.some(([jeu, min, max]) => jeu === id && (typeof niveau !== 'number' || (niveau >= min && niveau <= max)))) return classe;
    }
  }
  return 'CP';
}

/** Les données de l'app : deux enfants, Eva-Rose dans la classe voulue, son jeu au niveau voulu. */
function magasin(classe = 'CP', jeu = null, niveau = 1) {
  const store = defaultStore();
  addChild(store, { name: 'Eva-Rose', look: 'fille', grade: classe });
  addChild(store, { name: 'Matteo', look: 'garcon', grade: 'MS' });
  if (jeu && typeof niveau === 'number') store.profiles['eva-rose'].games[jeu] = { level: niveau };
  store.settings.installHintUntil = Date.now() + 365 * 24 * 3600 * 1000; // pas d'invitation à installer
  return JSON.stringify(storeSnapshot(store));
}

// ---------------------------------------------------------------- simulateur (xcrun simctl)

const simctl = (...args) => execFileSync('xcrun', ['simctl', ...args], { encoding: 'utf8' });

function compare(a, b) {
  const [x, y] = [a.split('.').map(Number), b.split('.').map(Number)];
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0);
  return 0;
}

/** Le simulateur de ce nom (le système iOS le plus récent, ou celui de IOS_VERSION). */
function trouverSimulateur() {
  const { devices } = JSON.parse(simctl('list', 'devices', 'available', '-j'));
  const trouves = [];
  for (const [runtime, liste] of Object.entries(devices)) {
    const m = /iOS-(\d+)-(\d+)/.exec(runtime);
    if (!m) continue;
    const version = `${m[1]}.${m[2]}`;
    if (VERSION && version !== VERSION && !version.startsWith(`${VERSION}.`)) continue;
    for (const d of liste) if (d.name === APPAREIL) trouves.push({ udid: d.udid, nom: d.name, version, etat: d.state });
  }
  trouves.sort((a, b) => compare(b.version, a.version));
  if (!trouves.length) {
    const noms = Object.values(devices).flat().map((d) => d.name);
    throw new Error(`simulateur « ${APPAREIL} »${VERSION ? ` (iOS ${VERSION})` : ''} introuvable ; disponibles : ${[...new Set(noms)].join(', ')}`);
  }
  return trouves[0];
}

function demarrer(sim) {
  if (sim.etat !== 'Booted') {
    try {
      simctl('boot', sim.udid);
    } catch (e) {
      if (!/Booted/.test(String(e.stderr))) throw e;
    }
  }
  simctl('bootstatus', sim.udid, '-b'); // attend que le système soit prêt
  // l'application Simulator (fenêtre) : utile pour tourner l'appareil
  try {
    execFileSync('open', ['-a', 'Simulator', '--args', '-CurrentDeviceUDID', sim.udid]);
  } catch {
    // sans fenêtre, le test se fait quand même (en portrait)
  }
}

/**
 * Tourne l'appareil : menu « Device → Rotate Right » de Simulator (« Hardware » sur les anciens
 * Xcode), sinon Cmd + flèche droite. Après chaque essai, on attend que Safari soit en paysage.
 * Renvoie vrai si l'appareil a tourné.
 */
async function tourner(pilote) {
  const menu = (barre) => `tell application "System Events" to tell process "Simulator" to click menu item "Rotate Right" of menu 1 of menu bar item "${barre}" of menu bar 1`;
  const essais = [
    ['menu Device', menu('Device')],
    ['menu Hardware', menu('Hardware')],
    ['Cmd + →', 'tell application "System Events" to key code 124 using command down'],
  ];
  for (const [nom, script] of essais) {
    try {
      execFileSync('osascript', ['-e', 'tell application "Simulator" to activate', '-e', 'delay 1', '-e', script], { stdio: 'pipe' });
    } catch (e) {
      console.log(`rotation (${nom}) : ${String(e.stderr || e.message).trim()}`);
      continue;
    }
    for (let i = 0; i < 20; i++) {
      await pause(500);
      const [l, h] = await pilote.evaluer(() => [innerWidth, innerHeight]).catch(() => [0, 1]);
      if (l > h) {
        console.log(`rotation (${nom}) : ${l}×${h}`);
        return true;
      }
    }
    console.log(`rotation (${nom}) : sans effet`);
  }
  return false;
}

// ---------------------------------------------------------------- pilotes : Safari (WebDriver) ou Playwright

async function wd(methode, chemin, corps) {
  const res = await fetch(`${WD}${chemin}`, {
    method: methode, headers: { 'Content-Type': 'application/json' }, body: corps ? JSON.stringify(corps) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.value?.error) throw new Error(`${methode} ${chemin} : ${json.value?.error || res.status} ${json.value?.message || ''}`.trim());
  return json.value;
}

/** Safari dans le simulateur, piloté par safaridriver (W3C WebDriver). */
async function piloteSafari(sim) {
  // Safari déjà ouvert dans le simulateur : sans cela, safaridriver ne le trouvait pas sur l'iPad
  // (« waiting for its RWIApplication to appear »)
  try {
    simctl('launch', sim.udid, 'com.apple.mobilesafari');
    await pause(8000);
  } catch (e) {
    console.log(`Safari ne s'ouvre pas d'avance : ${String(e.stderr || e.message).trim()}`);
  }
  const driver = spawn('safaridriver', ['--port', new URL(WD).port], { stdio: 'inherit' });
  for (let i = 0; i < 40; i++) {
    if (await fetch(`${WD}/status`).then((r) => r.ok, () => false)) break;
    await pause(250);
  }
  // le simulateur désigné par son identifiant, sinon par son nom ; Safari met parfois du temps à
  // accepter la première session après le démarrage du simulateur
  const variantes = [
    { browserName: 'safari', platformName: 'iOS', 'safari:useSimulator': true, 'safari:deviceUDID': sim.udid },
    { browserName: 'safari', platformName: 'ios', 'safari:useSimulator': true, 'safari:deviceName': sim.nom },
  ];
  let session = null;
  for (let essai = 0; !session; essai++) {
    try {
      session = await wd('POST', '/session', { capabilities: { alwaysMatch: variantes[essai % variantes.length] } });
    } catch (e) {
      console.log(`session Safari, essai ${essai + 1} : ${e.message}`);
      if (essai >= 5) throw e;
      await pause(10000);
    }
  }
  const id = session.sessionId;
  await wd('POST', `/session/${id}/timeouts`, { script: 30000, pageLoad: 60000 }).catch(() => {});
  const evaluer = (fn, ...args) => wd('POST', `/session/${id}/execute/sync`, { script: `return (${fn}).apply(null, arguments);`, args });
  return {
    ouvrir: (url) => wd('POST', `/session/${id}/url`, { url }),
    evaluer,
    // un clic en JavaScript : le toucher simulé par WebDriver (element/click) ne déclenchait aucun
    // bouton dans Safari sur le simulateur (iOS 18.5 et 26.2), sans erreur
    async toucher(selecteur) {
      const ok = await evaluer((s) => {
        const el = document.querySelector(s);
        if (!el) return false;
        el.scrollIntoView({ block: 'center' });
        el.click();
        return true;
      }, selecteur);
      if (!ok) throw new Error(`« ${selecteur} » introuvable`);
    },
    capture: async () => Buffer.from(await wd('GET', `/session/${id}/screenshot`), 'base64'),
    async fermer() {
      await wd('DELETE', `/session/${id}`).catch(() => {});
      driver.kill();
    },
  };
}

/** Chromium à la taille de l'appareil (mise au point du parcours, sans Mac). */
async function pilotePlaywright() {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const [width, height] = TAILLES[APPAREIL] || [375, 667];
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-FR' });
  const page = await context.newPage();
  return {
    ouvrir: (url) => page.goto(url),
    evaluer: (fn, ...args) => page.evaluate(`(${fn}).apply(null, ${JSON.stringify(args)})`),
    toucher: (selecteur) => page.click(selecteur, { force: true }),
    capture: () => page.screenshot(),
    fermer: () => browser.close(),
  };
}

// ---------------------------------------------------------------- mesures, faites dans la page

/** Note les erreurs JavaScript de la page (après son chargement). */
function guetter() {
  if (window.__erreurs) return;
  window.__erreurs = [];
  addEventListener('error', (e) => window.__erreurs.push(e.message));
  addEventListener('unhandledrejection', (e) => window.__erreurs.push(String(e.reason?.message || e.reason)));
}

/** Débordements de l'écran affiché (comme checkLayout dans smoke.mjs). */
function mesurer() {
  const problemes = [];
  const avertissements = [];
  const largeur = window.innerWidth;
  const hauteur = window.innerHeight;
  if (document.documentElement.scrollWidth > largeur + 1) problemes.push(`la page déborde en largeur (${document.documentElement.scrollWidth} > ${largeur})`);
  for (const el of document.querySelectorAll('.choice, .key, .match-item, .tile, .fill-row, .stage > *, .text-body, .order-item, .level-row, .game-card, .domain-btn, .profile-card, .featured-game, .domain-tile')) {
    if (el.clientWidth <= 1) continue;
    if (el.scrollWidth > el.clientWidth + 1) {
      problemes.push(`contenu trop large : « ${el.textContent.trim().slice(0, 30)} » (${el.scrollWidth} > ${el.clientWidth})`);
      break;
    }
  }
  const zone = document.querySelector('.choices, .home-menu, .profile-list');
  if (zone && zone.getBoundingClientRect().bottom > hauteur + 1) {
    avertissements.push(`réponses sous le bas de la fenêtre de Safari (${Math.round(zone.getBoundingClientRect().bottom)} > ${hauteur})`);
  }
  const explication = document.querySelector('.explain');
  if (explication && explication.getBoundingClientRect().bottom > hauteur + 1) {
    avertissements.push(`explication sous le bas de la fenêtre (${Math.round(explication.getBoundingClientRect().bottom)} > ${hauteur})`);
  }
  return { problemes, avertissements, fenetre: `${largeur}×${hauteur}`, erreurs: (window.__erreurs || []).splice(0) };
}

/** Ce que Safari sait faire de ce dont l'app a besoin. */
function fonctions() {
  const ecran = document.querySelector('.screen');
  return {
    navigateur: navigator.userAgent,
    ecran: `${screen.width}×${screen.height} (×${devicePixelRatio})`,
    fenetre: `${innerWidth}×${innerHeight}`,
    has: CSS.supports('selector(:has(*))'),
    conteneurs: CSS.supports('container-type: inline-size'),
    dvh: CSS.supports('height: 100dvh'),
    zoom: ecran ? getComputedStyle(ecran).zoom : '',
    serviceWorker: 'serviceWorker' in navigator,
    voixAppareil: 'speechSynthesis' in window ? speechSynthesis.getVoices().filter((v) => v.lang.startsWith('fr')).length : 'absente',
    emojiDeSecours: document.documentElement.classList.contains('emoji-secours'),
    polices: [...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family))].join(', '),
  };
}

// ---------------------------------------------------------------- parcours

async function attendre(pilote, selecteur, ms = 20000, pas = 250) {
  for (const fin = Date.now() + ms; Date.now() < fin;) {
    if (await pilote.evaluer((s) => Boolean(document.querySelector(s)), selecteur).catch(() => false)) return;
    await pause(pas);
  }
  throw new Error(`« ${selecteur} » n'apparaît pas`);
}

async function main() {
  mkdirSync(SORTIE, { recursive: true });
  const serveur = await startServer(PORT);
  let sim = null;
  if (PILOTE === 'safari') {
    sim = trouverSimulateur();
    console.log(`simulateur : ${sim.nom}, iOS ${sim.version} (${sim.udid})`);
    demarrer(sim);
  }
  let pilote;
  try {
    pilote = PILOTE === 'safari' ? await piloteSafari(sim) : await pilotePlaywright();
  } catch (e) {
    console.log(`✘ Safari ne répond pas : ${e.message}`);
    try {
      simctl('io', sim.udid, 'screenshot', '--type=png', `${SORTIE}/appareil-sans-session.png`);
    } catch {
      // pas de capture
    }
    serveur.close();
    rapport(sim, null, [{ nom: 'session Safari', fichier: null, appareil: 'appareil-sans-session.png', problemes: [`Safari ne répond pas : ${e.message}`], avertissements: [], erreurs: [] }]);
    process.exit(1);
  }
  const ecrans = [];
  let fonctionsSafari = null;

  async function capturer(nom, { appareil = false } = {}) {
    const mesure = await pilote.evaluer(mesurer).catch((e) => ({ problemes: [`mesure impossible : ${e.message}`], avertissements: [], erreurs: [] }));
    const fichier = `${String(ecrans.length + 1).padStart(2, '0')}-${slug(nom)}.png`;
    writeFileSync(`${SORTIE}/${fichier}`, await pilote.capture());
    // tout l'écran du simulateur, avec les barres de Safari
    if (appareil && sim) {
      try {
        simctl('io', sim.udid, 'screenshot', '--type=png', `${SORTIE}/appareil-${fichier}`);
      } catch {
        // la capture de la page suffit
      }
    }
    if (mesure.erreurs.length) mesure.problemes.push(...mesure.erreurs.map((e) => `erreur JavaScript : ${e}`));
    ecrans.push({ nom, fichier, appareil: appareil && sim ? `appareil-${fichier}` : null, ...mesure });
    const etat = mesure.problemes.length ? '✘' : mesure.avertissements.length ? '⚠' : '✔';
    console.log(`${etat} ${nom} (${mesure.fenetre || '?'}) ${[...mesure.problemes, ...mesure.avertissements].join(' ; ')}`);
  }

  /** Ouvre l'app avec ces données, puis « Qui joue ? » → Eva-Rose. */
  async function accueil(donnees) {
    await pilote.ouvrir(BASE);
    await pilote.evaluer((k, v) => { localStorage.setItem(k, v); }, STORAGE_KEY, donnees);
    await pilote.ouvrir(BASE);
    await attendre(pilote, '.profiles, .home');
    await pilote.evaluer(guetter);
    if (await pilote.evaluer(() => Boolean(document.querySelector('.profiles')))) await pilote.toucher('[data-profile="eva-rose"]');
    await attendre(pilote, '.home');
  }

  async function etape(nom, faire) {
    try {
      await faire();
    } catch (e) {
      const page = await pilote.evaluer(() => `${document.querySelector('main.screen')?.className || '(aucun écran)'} : ${document.body.innerText.replace(/\s+/g, ' ').slice(0, 160)}`).catch(() => '?');
      console.log(`✘ ${nom} : ${e.message}\n   à l'écran : ${page}`);
      ecrans.push({ nom, fichier: null, problemes: [`étape impossible : ${e.message}`], avertissements: [], erreurs: [] });
    }
  }

  /** Espace parents → Réglages (la question de la barrière est calculée). */
  async function reglages() {
    await pilote.ouvrir(BASE);
    await attendre(pilote, '.profiles, .home');
    if (await pilote.evaluer(() => Boolean(document.querySelector('.home')))) await pilote.toucher('.profile-chip');
    await attendre(pilote, '.parent-btn');
    await pilote.toucher('.parent-btn');
    await attendre(pilote, '.gate, .parents');
    if (await pilote.evaluer(() => Boolean(document.querySelector('.gate')))) {
      await pilote.evaluer(() => {
        const [a, b] = document.querySelector('.gate-question').textContent.match(/\d+/g).map(Number);
        const champ = document.querySelector('.gate-input');
        champ.value = String(a * b);
        champ.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await pilote.toucher('.gate-form button');
    }
    await attendre(pilote, '.parents');
    await pilote.toucher('[data-tab="reglages"]');
    await attendre(pilote, '.settings');
  }

  async function parcourir(suffixe = '') {
    await etape(`premier lancement${suffixe}`, async () => {
      await pilote.ouvrir(BASE);
      await pilote.evaluer(() => { localStorage.clear(); sessionStorage.clear(); });
      await pilote.ouvrir(BASE);
      await attendre(pilote, '.welcome');
      await pilote.evaluer(guetter);
      fonctionsSafari = fonctionsSafari || await pilote.evaluer(fonctions);
      await capturer(`premier lancement${suffixe}`, { appareil: true });
    });
    await etape(`qui joue${suffixe}`, async () => {
      await pilote.ouvrir(BASE);
      await pilote.evaluer((k, v) => { localStorage.setItem(k, v); }, STORAGE_KEY, magasin());
      await pilote.ouvrir(BASE);
      await attendre(pilote, '.profiles');
      await pilote.evaluer(guetter);
      await capturer(`qui joue${suffixe}`);
      await pilote.toucher('[data-profile="eva-rose"]');
      await attendre(pilote, '.home');
      await capturer(`accueil${suffixe}`, { appareil: true });
    });
    for (const [id, niveau] of PARCOURS) {
      const jeu = findGame(id);
      const nom = `${id} ${typeof niveau === 'number' ? `niveau ${niveau}` : niveau}${suffixe}`;
      await etape(nom, async () => {
        await accueil(magasin(classePour(id, niveau), id, niveau));
        await pilote.toucher(`[data-domain="${jeu.domain}"]`);
        await attendre(pilote, `[data-game="${id}"]`);
        await pilote.toucher(`[data-game="${id}"]`);
        if (jeu.paliers) {
          await attendre(pilote, `[data-palier="${niveau}"]`);
          await pilote.toucher(`[data-palier="${niveau}"]`);
        }
        await attendre(pilote, '.choices');
        await pause(400);
        await capturer(nom, { appareil: id === 'lecture-cm' || id === 'calcul' });
        // une erreur au pavé : l'explication, et l'égalité une fois immobile
        if (await pilote.evaluer(() => Boolean(document.querySelector('.key[data-key="✔"]')))) {
          const reponse = await pilote.evaluer(() => globalThis.__lc?.question?.answer);
          if (typeof reponse === 'number') {
            for (const chiffre of String(reponse + 1)) await pilote.toucher(`.key[data-key="${chiffre}"]`);
            await pilote.toucher('.key[data-key="✔"]');
            await pause(700);
            await capturer(`${nom}, explication`);
          }
        }
      });
    }
    await etape(`réglages des parents${suffixe}`, async () => {
      await reglages();
      await capturer(`réglages des parents${suffixe}`);
    });
    // la vérification de l'app elle-même (espace parents) : chaque niveau de chaque jeu, dans ce Safari.
    // Dans le navigateur, ses barres prennent le bas de l'écran : une réponse « sous le bas de
    // l'écran » est un avertissement (l'app installée a cette place) ; le reste est un échec.
    await etape(`vérifier l'affichage, toutes les classes${suffixe}`, async () => {
      await reglages();
      await pilote.toucher('[data-verif="toutes"]');
      await attendre(pilote, '.verif-result', 30 * 60 * 1000, 3000);
      const r = await pilote.evaluer(() => ({
        resume: document.querySelector('.verif-result > p')?.textContent || '',
        lignes: [...document.querySelectorAll('.verif-list li')].map((li) => li.textContent),
      }));
      const bas = (l) => /sous le bas de l'écran|sous le bas de l’écran/.test(l) && !/dépasse|plus large|erreur/.test(l);
      const nom = `vérifier l'affichage, toutes les classes${suffixe}`;
      console.log(`  ${r.resume}`);
      for (const l of r.lignes) console.log(`  ${bas(l) ? '⚠' : '✘'} ${l}`);
      await capturer(nom);
      const ecran = ecrans.at(-1);
      ecran.problemes.push(...r.lignes.filter((l) => !bas(l)));
      const enBas = r.lignes.filter(bas);
      if (enBas.length) ecran.avertissements.push(`${enBas.length} niveaux avec des réponses sous les barres de Safari`);
      ecran.resume = r.resume;
    });
  }

  await parcourir();
  // iPad : le même parcours en paysage, si l'appareil a pu tourner
  if (PAYSAGE && sim) {
    if (await tourner(pilote)) {
      await pause(1500); // la fin de l'animation de rotation
      await parcourir(' (paysage)');
    } else {
      const [l, h] = await pilote.evaluer(() => [innerWidth, innerHeight]);
      ecrans.push({ nom: 'paysage', fichier: null, problemes: [], avertissements: [`l'appareil n'a pas tourné (${l}×${h})`], erreurs: [] });
    }
  }

  await pilote.fermer();
  serveur.close();
  rapport(sim, fonctionsSafari, ecrans);
  if (sim) {
    try {
      simctl('shutdown', sim.udid);
    } catch {
      // déjà éteint
    }
  }
  process.exitCode = ecrans.some((e) => e.problemes.length) ? 1 : 0;
}

// ---------------------------------------------------------------- rapport

function rapport(sim, infos, ecrans) {
  const titre = sim ? `${sim.nom}, iOS ${sim.version}` : `${APPAREIL} (Chromium, mise au point)`;
  const nbProblemes = ecrans.filter((e) => e.problemes.length).length;
  const nbAvertis = ecrans.filter((e) => !e.problemes.length && e.avertissements.length).length;
  const resume = `${ecrans.length} écrans : ${ecrans.length - nbProblemes - nbAvertis} sans remarque, ${nbAvertis} avec avertissement, ${nbProblemes} en échec`;
  const lignes = [
    `## Simulateur iOS : ${titre}`, '', resume, '',
    infos ? `Safari : ${infos.navigateur}` : '', '',
    infos ? `Écran ${infos.ecran}, fenêtre ${infos.fenetre} ; :has() ${infos.has ? 'oui' : 'non'}, requêtes de conteneur ${infos.conteneurs ? 'oui' : 'non'}, dvh ${infos.dvh ? 'oui' : 'non'}, zoom de l'écran ${infos.zoom || '?'} ; voix françaises de l'appareil : ${infos.voixAppareil} ; emoji de secours : ${infos.emojiDeSecours ? 'oui' : 'non'} ; polices : ${infos.polices || '?'}` : '',
    '', '| Écran | Fenêtre | Résultat |', '| --- | --- | --- |',
    ...ecrans.map((e) => `| ${e.nom} | ${e.fenetre || ''} | ${[...e.problemes.map((p) => `✘ ${p}`), ...e.avertissements.map((a) => `⚠ ${a}`)].join('<br>') || '✔'} |`),
    '',
  ];
  writeFileSync(`${SORTIE}/rapport.md`, lignes.join('\n'));
  writeFileSync(`${SORTIE}/rapport.json`, JSON.stringify({ simulateur: sim, infos, ecrans }, null, 1));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lignes.join('\n'));
  const echapper = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cartes = ecrans.map((e) => `<figure class="${e.problemes.length ? 'ko' : e.avertissements.length ? 'warn' : 'ok'}">
  ${e.fichier ? `<a href="${e.fichier}"><img src="${e.fichier}" alt="${echapper(e.nom)}" loading="lazy"></a>` : ''}
  ${e.appareil ? `<a class="appareil" href="${e.appareil}">Tout l'écran du simulateur</a>` : ''}
  <figcaption><b>${echapper(e.nom)}</b> ${e.fenetre ? `<small>${echapper(e.fenetre)}</small>` : ''}
  ${[...e.problemes.map((p) => `<p>✘ ${echapper(p)}</p>`), ...e.avertissements.map((a) => `<p>⚠ ${echapper(a)}</p>`)].join('')}</figcaption>
</figure>`).join('\n');
  writeFileSync(`${SORTIE}/index.html`, `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Simulateur iOS : ${echapper(titre)}</title><style>
body { font-family: system-ui, sans-serif; margin: 16px; color: #222; background: #faf7f0; }
main { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
figure { margin: 0; background: #fff; border-radius: 10px; padding: 8px; border: 2px solid #cbd5c0; }
figure.warn { border-color: #e0a100; } figure.ko { border-color: #c43d3d; }
img { width: 100%; height: auto; border-radius: 6px; } p { margin: 4px 0; font-size: 0.85rem; } small { color: #666; }
</style></head><body><h1>Simulateur iOS : ${echapper(titre)}</h1><p>${echapper(resume)}</p>
${infos ? `<p><small>${echapper(infos.navigateur)}</small></p>` : ''}<main>${cartes}</main></body></html>`);
  console.log(`\n${resume} → ${SORTIE}/index.html`);
}

await main();
