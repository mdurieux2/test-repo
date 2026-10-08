// Point d'entrée : profils, navigation entre les écrans et déroulement d'une partie.

import { findGame } from './games/index.js';
import { CALC_PALIERS, equationHolds } from './games/maths.js';
import { canMove, polarCell, ringOffsets, solveLinks, solveMaze } from './games/labyrinthes.js';
import { clockLabel } from './games/maths-extra.js';
import {
  clockAdvice, dragHourHand, dragMinuteHand, fromClockMinutes, handAngles, pickHand, pointerAngle, shiftClock, toClockMinutes,
} from './games/horloge.js';
import {
  chronoLevelAfter, elapsedSeconds, formatChrono, questionsPerSession, recordAfter, spokenChrono,
} from './games/chrono.js';
import { featuredGames, levelRange, MAX_FEATURED, programFor, programForChild } from './programs.js';
import { dailyPicks, dueReviews as reviewsDue, duoPlan, drawPool } from './picks.js';
import { createRng, pick, randInt, sample, shuffle } from './random.js';
import { palierStarsAfter, PALIER_MAX_STARS, recordAnswer, starsFor } from './progress.js';
import { newStickers, STICKERS, starsToNextSticker, stickersUnlocked } from './rewards.js';
import {
  addChild, beginDuo, cleanName, endDuo, GRADES, gameStats, loadStore, logMistake, logSession, MAX_CHILDREN, NAME_MAX, removeChild,
  resetChild, saveStore,
} from './storage.js';
import {
  isNaturalVoiceOn, listFrenchVoices, loadNaturalVoice, naturalVoiceFiles, naturalVoicePacks, setNaturalVoice, setSpeechEnabled, setSpeechNames,
  setVoicePreferences, speak, stopSpeaking, unlockNaturalVoice,
} from './speech.js';
import { playSound, setSoundsEnabled, startMusic, stopMusic, unlockAudio } from './sounds.js';
import {
  avatar, clockSvg, flagElement, h, mapElement, moneyItem, renderChoiceContent, renderStage, revealWord, setProfiles,
} from './render.js';
import { zoneName } from './data/carte-data.js';
import { ACCESSORIES, LOOKS, makeCharacter, SHIRTS } from './characters.js';
import { dashboard } from './dashboard.js';
import { squarePhoto } from './photo.js';
import { APP, CHANGELOG } from './config.js';
import { SEASON_LABELS, seasonOf } from './themes.js';
import { STORY_DATA } from './games/histoires.js';
import * as recordings from './recordings.js';
import { formatDuration, MAX_SECONDS, pickMime, sentenceAt, sentenceTimeline } from './recordings.js';

const app = document.getElementById('app');
const rng = createRng();
const store = loadStore();
applySettings();

let leaveScreen = null; // ce qu'il faut arrêter en quittant l'écran affiché (le micro…)

const PRAISES = ['Bravo !', 'Super !', 'Génial !', 'Très bien !', 'Excellent !', 'Bien joué !', 'Parfait !'];
const SVG_NS = 'http://www.w3.org/2000/svg';

// ---------------------------------------------------------------- Outils

function child() {
  return store.profiles[store.active];
}

/** Le personnage de l'enfant qui joue : son prénom, son dessin, sa voix. */
function me(id = store.active) {
  return makeCharacter(id, store.profiles[id]);
}

function applySettings() {
  setSpeechEnabled(store.settings.voice);
  setSoundsEnabled(store.settings.sounds);
  setVoicePreferences(store.settings.voices);
  setNaturalVoice(store.settings.naturalVoice !== false);
  // les prénoms des enfants sont dits avec leur propre son (s'ils sont dans la liste des prénoms enregistrés)
  setSpeechNames(Object.values(store.profiles).flatMap((p) => [p.name, p.spoken]));
  setProfiles(store.profiles);
}

function save() {
  return saveStore(store);
}

function show(...children) {
  stopSpeaking();
  stopStoryAudio();
  if (leaveScreen) {
    const leave = leaveScreen;
    leaveScreen = null;
    leave();
  }
  document.body.classList.toggle('easy-read', Boolean(child()?.easyRead));
  document.body.dataset.season = store.settings.seasonal === false ? '' : currentSeason().id;
  app.replaceChildren(...children.filter(Boolean));
  window.scrollTo(0, 0);
  musicForScreen();
}

// ---------------------------------------------------------------- Saisons

function currentSeason() {
  return seasonOf(new Date());
}

function seasonDecor() {
  if (store.settings.seasonal === false) return null;
  return h('div', { class: 'season-decor', 'aria-hidden': 'true' }, currentSeason().deco.map((e) => h('span', {}, e)));
}

/**
 * Typographie française : espace insécable avant ? ! : ; et trait d'union insécable
 * (« Eva-Rose » ne se coupe jamais en fin de ligne, « sera-t-il » non plus : la lettre qui
 * suit le trait d'union n'est pas consommée, pour traiter aussi le trait d'union suivant).
 */
function frenchSpacing(text) {
  return text.replace(/ ([?!:;])/g, '\u00a0$1').replace(/(\p{L})-(?=\p{L})/gu, '$1\u2011');
}

/** Fait parler le personnage de l'enfant, avec sa voix (fille ou garçon). */
function say(who, parts) {
  stopStoryAudio(); // comme la voix de synthèse, une voix enregistrée s'arrête quand on parle
  return speak(parts, who?.voice);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function starCounter() {
  return h('div', { class: 'star-counter', 'aria-label': `${child().stars} étoiles` }, '⭐ ', child().stars);
}

/** La musique douce joue sur l'accueil et les menus, jamais pendant un jeu ni chez les parents. */
function musicForScreen() {
  const calm = app.querySelector('.screen.play, .screen.parents, .screen.gate');
  if (store.settings.music && !calm) startMusic();
  else stopMusic();
}

// Le son (musique et petits sons) et la voix : allumés ou non, d'après les réglages
const SOUND_ON = {
  sound: () => store.settings.sounds !== false || Boolean(store.settings.music),
  voice: () => store.settings.voice !== false,
};

/**
 * Met à jour les boutons du son et de la voix, et les interrupteurs des réglages des parents,
 * après un changement fait par l'un ou par l'autre.
 */
function syncSoundControls() {
  for (const btn of app.querySelectorAll('.sound-toggle')) {
    const on = SOUND_ON[btn.dataset.kind]();
    btn.classList.toggle('off', !on);
    btn.setAttribute('aria-pressed', String(on));
  }
  for (const box of app.querySelectorAll('input[data-setting]')) {
    const value = store.settings[box.dataset.setting];
    box.checked = box.dataset.setting === 'music' ? Boolean(value) : value !== false;
  }
}

/**
 * Le son (musique et petits sons) et la voix, à couper ou remettre d'un geste sur chaque écran
 * (les mêmes réglages que dans l'espace parents). Coupé : l'icône est barrée, pas seulement plus pâle.
 * Le son coupé coupe la musique et les petits sons ; remis, il remet les deux.
 */
function soundToggles() {
  const button = (kind, label, emoji, onToggle) => {
    const btn = h('button', { class: 'sound-toggle', 'data-kind': kind, [`data-toggle-${kind}`]: '', 'aria-label': label },
      h('span', { 'aria-hidden': 'true' }, emoji));
    btn.addEventListener('click', () => {
      onToggle(!SOUND_ON[kind]());
      save();
      syncSoundControls();
    });
    btn.classList.toggle('off', !SOUND_ON[kind]());
    btn.setAttribute('aria-pressed', String(SOUND_ON[kind]()));
    return btn;
  };
  return [
    button('sound', 'Musique et sons', '🎵', (on) => {
      store.settings.sounds = on;
      store.settings.music = on;
      applySettings();
      musicForScreen();
    }),
    // pas 🔊 : dans les jeux, 🔊 fait réécouter la consigne
    button('voice', 'Voix', '🗣️', (on) => {
      store.settings.voice = on;
      applySettings();
      stopStoryAudio();
      if (!on) return;
      // la voix revient : pendant un jeu, la consigne est redite ; ailleurs, bonjour (pas chez les parents)
      const instruction = app.querySelector('.screen.play .bubble');
      if (instruction) instruction.click();
      else if (child() && !app.querySelector('.screen.parents, .screen.gate')) say(me(), `Bonjour ${me().spoken} !`);
    }),
  ];
}

/** Le son et la voix, puis ce qui est déjà à droite de la barre (les étoiles…). */
function barActions(right) {
  return h('div', { class: 'bar-actions' }, ...soundToggles(), right);
}

/** Barre du haut de l'accueil : qui joue, puis le son, la voix et les étoiles. */
function homeBar() {
  return h('header', { class: 'top-bar' }, profileChip(), h('span'), barActions(starCounter()));
}

function topBar({ onBack, backLabel = 'Retour', title, right }) {
  const text = title && !(title instanceof Node);
  // un titre écrit passe sous la barre sur un téléphone en portrait (voir .top-bar.has-title)
  return h('header', { class: text ? 'top-bar has-title' : 'top-bar' },
    onBack ? h('button', { class: 'icon-btn', onclick: onBack, 'aria-label': backLabel }, backLabel === 'Quitter' ? '✕' : '←') : h('span'),
    text ? h('h1', { class: 'top-title' }, title) : title || h('span'),
    barActions(right));
}

/** Le son et la voix dans le coin en haut à droite, sur les écrans sans barre (résultats, bienvenue). */
function cornerActions() {
  return h('div', { class: 'bar-actions corner' }, ...soundToggles());
}

/** Le journal des modifications, replié (Réglages, et en bas de « Qui joue ? »). */
function changelog() {
  return h('details', { class: 'changelog' },
    h('summary', {}, 'Journal des modifications'),
    CHANGELOG.map((entry) => h('div', { class: 'changelog-entry' },
      h('h3', {}, `Version ${entry.version}`, h('span', { class: 'muted small' }, ` · ${new Date(entry.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`)),
      h('ul', { class: 'plain-list' }, entry.changes.map((c) => h('li', {}, c))))));
}

/** En bas de « Qui joue ? » : le son, la voix, la version, le contact et le journal, en petit. */
function appFooter() {
  return h('footer', { class: 'app-footer' },
    h('div', { class: 'bar-actions' }, ...soundToggles()),
    h('p', {}, h('span', { 'data-version': APP.version }, `Version ${APP.version}`), ' · Contact : ',
      h('a', { href: `mailto:${APP.contact}` }, APP.author)),
    changelog());
}

function isStandalone() {
  return navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
}

function sessionFlag(key, set = false) {
  try {
    if (set) sessionStorage.setItem(key, '1');
    return sessionStorage.getItem(key);
  } catch {
    return null; // navigation privée
  }
}

function clearSessionFlag(key) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // navigation privée
  }
}

/** Une rubrique de l'enfant qui joue (absente si les parents l'ont masquée). */
function domainById(id) {
  return programForChild(child()).find((d) => d.id === id);
}

// ---------------------------------------------------------------- Qui joue ?

// Petits pictogrammes (traits fins, couleur du texte).
const ICONS = {
  parents: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.5"/><circle cx="9" cy="17" r="2.5"/>',
  suivi: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  enfants: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14.6c2.3.2 4 1.8 4.6 4.4"/>',
  reglages: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M4.2 6.2l2.1 2.1M17.7 15.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 17.8l2.1-2.1M17.7 8.3l2.1-2.1"/>',
  partager: '<path d="M12 15V3M7.5 7.5 12 3l4.5 4.5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
};

function icon(name) {
  const el = h('span', { class: `icon icon-${name}`, 'aria-hidden': 'true' });
  el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
  return el;
}

/** Le bouton unique de l'espace parents (protégé par une multiplication). */
function parentButton() {
  return h('button', { class: 'parent-btn', onclick: () => parentGate(() => parentsScreen()), 'aria-label': 'Espace parents' },
    icon('parents'), h('span', {}, 'Parents'));
}

function profileScreen() {
  if (!store.order.length) return welcomeScreen();
  show(h('main', { class: 'screen profiles' },
    h('header', { class: 'top-bar' }, duoButton(), h('span'), parentButton()),
    h('h1', { class: 'profiles-title' }, 'Qui joue ?'),
    h('div', { class: `profile-list n${store.order.length}` },
      store.order.map((id) => {
        const kid = store.profiles[id];
        return h('button', { class: `profile-card look-${kid.look}`, 'data-profile': id, onclick: () => chooseProfile(id) },
          avatar(id, 'avatar-xl'),
          h('span', { class: 'profile-name' }, frenchSpacing(kid.name)),
          h('span', { class: 'profile-grade' }, GRADES[kid.grade]),
          h('span', { class: 'profile-stars' }, '⭐ ', kid.stars));
      })),
    installHint(),
    appFooter()));
}

// ---------------------------------------------------------------- Installer l'icône

// Android et ordinateur (Chrome, Edge) : le navigateur propose lui-même l'installation.
let installPrompt = null;
addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
});

function platform() {
  const ua = navigator.userAgent;
  // l'iPad se présente comme un Mac, mais il a un écran tactile
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

/** Les étapes pour mettre l'icône sur l'écran d'accueil, selon l'appareil. */
function installSteps() {
  const steps = {
    ios: [
      'Touchez Partager (le carré avec une flèche vers le haut).',
      'Faites défiler, puis touchez « Sur l’écran d’accueil ».',
      'Touchez « Ajouter » : l’icône apparaît, l’app marche sans Internet.',
    ],
    android: [
      'Touchez le menu ⋮ du navigateur, en haut à droite.',
      'Touchez « Installer l’application » ou « Ajouter à l’écran d’accueil ».',
      'Confirmez : l’icône apparaît, l’app marche sans Internet.',
    ],
    desktop: [
      'Cliquez sur l’icône d’installation dans la barre d’adresse, ou ouvrez le menu du navigateur.',
      'Choisissez « Installer Lire, compter et s’amuser ! ».',
      'L’app s’ouvre alors dans sa propre fenêtre, même sans Internet.',
    ],
  };
  return h('ol', { class: 'plain-list install-steps' }, steps[platform()].map((step) => h('li', {}, step)));
}

/**
 * Sous « Qui joue ? » : inviter à installer l'icône. Sur iPhone et iPad, le navigateur peut effacer
 * les données d'un site qu'on n'a pas ouvert depuis 7 jours ; l'app installée est protégée.
 */
function installHint() {
  const settings = store.settings;
  if (isStandalone() || settings.installHintDone || Date.now() < (settings.installHintUntil || 0)) return null;
  const hide = (patch) => {
    Object.assign(store.settings, patch);
    save();
    profileScreen();
  };
  const install = installPrompt
    ? h('button', {
      class: 'big-btn primary', 'data-install': '',
      onclick: async () => {
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice.catch(() => ({}));
        installPrompt = null;
        if (outcome === 'accepted') hide({ installHintDone: true });
      },
    }, '📲 Installer l’app')
    : null;
  return h('section', { class: 'card install-hint', 'data-install-hint': '' },
    h('h2', {}, '📲 Mettez l’icône sur l’écran d’accueil'),
    h('p', {}, platform() === 'ios'
      ? 'Sur iPhone et iPad, le navigateur peut effacer les prénoms et les progrès d’un site qu’on n’ouvre pas pendant 7 jours. Avec l’icône, tout est protégé, et l’app s’ouvre en plein écran, même sans Internet.'
      : 'Avec l’icône, l’app s’ouvre en plein écran, même sans Internet, et les prénoms et les progrès sont mieux protégés.'),
    install || h('details', { class: 'install-how' }, h('summary', {}, 'Comment faire ?'), installSteps()),
    h('div', { class: 'install-actions' },
      h('button', { class: 'link-action', 'data-install-later': '', onclick: () => hide({ installHintUntil: Date.now() + 14 * 24 * 3600 * 1000 }) }, 'Plus tard'),
      h('button', { class: 'link-action', 'data-install-done': '', onclick: () => hide({ installHintDone: true }) }, 'J’ai déjà l’icône')));
}

function chooseProfile(id) {
  store.active = id;
  save();
  homeScreen();
  say(me(), `Bonjour ${me().spoken} !`);
}

// ---------------------------------------------------------------- Jouer à deux

/** Sur « Qui joue ? », dès qu'il y a deux enfants : une partie de 10 questions chacun son tour. */
function duoButton() {
  if (store.order.length < 2) return h('span');
  return h('button', { class: 'duo-btn', 'data-duo': '', onclick: () => duoPickScreen() },
    h('span', { class: 'duo-btn-icon', 'aria-hidden': 'true' }, '👫'), h('span', {}, 'Jouer à deux'));
}

/** On touche deux portraits (le premier commence), puis « C'est parti ! ». */
function duoPickScreen({ picked = [], message = '', speech = message } = {}) {
  if (store.order.length < 2) return profileScreen();
  let chosen = picked.filter((id) => store.profiles[id]).slice(0, 2);
  const hint = h('p', { class: 'duo-hint', 'aria-live': 'polite' });
  const go = h('button', { class: 'big-btn primary duo-go', onclick: () => tryDuo(chosen) }, 'C’est parti !');
  const cards = store.order.map((id) => {
    const kid = store.profiles[id];
    return h('button', { class: `profile-card duo-card look-${kid.look}`, 'data-pick': id, onclick: () => choose(id) },
      h('span', { class: 'duo-order', 'aria-hidden': 'true' }),
      avatar(id, 'avatar-xl'),
      h('span', { class: 'profile-name' }, frenchSpacing(kid.name)),
      h('span', { class: 'profile-grade' }, GRADES[kid.grade]));
  });
  const draw = (text = '') => {
    for (const card of cards) {
      const n = chosen.indexOf(card.dataset.pick);
      card.classList.toggle('picked', n >= 0);
      card.setAttribute('aria-pressed', String(n >= 0));
      card.querySelector('.duo-order').textContent = n >= 0 ? `✓ ${n + 1}` : '';
    }
    go.disabled = chosen.length < 2;
    hint.classList.toggle('warning', Boolean(text));
    hint.textContent = frenchSpacing(text || ['Touchez deux portraits', 'Et le deuxième joueur ?', 'Prêts ? Touchez « C’est parti ! »'][chosen.length]);
  };
  // toucher un portrait le choisit (ou le retire) ; un troisième remplace le deuxième
  const choose = (id) => {
    if (chosen.includes(id)) chosen = chosen.filter((x) => x !== id);
    else chosen = chosen.length < 2 ? [...chosen, id] : [chosen[0], id];
    draw();
  };
  show(h('main', { class: 'screen profiles duo-pick' },
    topBar({ onBack: profileScreen, title: '👫 Jouer à deux' }),
    hint,
    h('div', { class: `profile-list n${store.order.length}` }, cards),
    go));
  draw(message);
  speak(speech || 'Qui joue ensemble ? Touchez deux portraits.');
}

/** Avant de commencer : si l'un des deux a fini son temps du jour, on le dit simplement. */
function tryDuo(players) {
  const tired = players.filter((id) => timeIsUp(store.profiles[id]));
  if (tired.length) {
    const verb = tired.length > 1 ? 'ont' : 'a';
    const names = (key) => tired.map((id) => me(id)[key]).join(' et ');
    return duoPickScreen({
      picked: players,
      message: `${names('name')} ${verb} assez joué aujourd’hui : c’est l’heure de la pause !`,
      speech: `${names('spoken')} ${verb} assez joué aujourd’hui. C’est l’heure de la pause !`,
    });
  }
  const plan = duoPlan(store.profiles, players, rng);
  if (!plan) return duoPickScreen({ picked: players, message: 'Chacun doit avoir au moins un jeu affiché (Espace parents).' });
  beginDuo(store, players);
  sessionFlag('duo', true);
  store.active = players[0];
  startSession(duoGame(plan), {
    total: plan.length,
    back: quitDuo,
    duo: { players, plan, scores: Object.fromEntries(players.map((id) => [id, 0])) },
  });
}

/** Abandon (ou fin) : l'enfant actif redevient celui d'avant, retour à « Qui joue ? ». */
function quitDuo() {
  endDuo(store);
  clearSessionFlag('duo');
  save();
  profileScreen();
}

/**
 * La partie à deux, sur le modèle du défi du jour : chaque question vient d'un jeu de l'enfant dont
 * c'est le tour, à son niveau (q.from), et les niveaux de ses jeux ne changent pas (fixedLevel).
 */
function duoGame(plan) {
  return {
    id: 'duo',
    domain: 'duo',
    title: 'Jouer à deux',
    icon: '👫',
    levels: ['Jouer à deux'],
    range: { min: 1, max: 1 },
    fixedLevel: true,
    generate(_level, rng, index, context) {
      const { game, level } = plan[index % plan.length];
      const q = game.generate(level, rng, index, context);
      return { ...q, key: `duo:${q.key}`, from: game.id, fromLevel: level };
    },
  };
}

/** En haut de l'écran : les deux portraits et leurs bonnes réponses ; celui dont c'est le tour est mis en avant. */
function duoScoreboard(session, progress) {
  const { players, scores } = session.duo;
  const label = players.map((id) => `${store.profiles[id].name} : ${scores[id]}`).join(', ');
  return h('div', { class: 'duo-score', 'aria-label': `${label}. À ${me().name} de jouer.` },
    h('div', { class: 'duo-players' }, players.map((id) => {
      const turn = id === store.active;
      return h('span', { class: turn ? 'duo-player turn' : 'duo-player', 'data-duo-player': id, 'aria-current': turn ? 'true' : undefined },
        avatar(id, 'avatar-xs'),
        h('span', { class: 'duo-name' }, store.profiles[id].name),
        h('b', { class: 'duo-points', 'aria-label': `${scores[id]} bonnes réponses` }, `✓ ${scores[id]}`));
    })),
    progress);
}

/** Fin de la partie à deux : les résultats des deux, des étoiles pour chacun selon ses réponses. */
function finishDuo(session) {
  const { players, plan, scores } = session.duo;
  const seconds = Math.round((Date.now() - session.startedAt) / 1000);
  const results = players.map((id) => {
    const kid = store.profiles[id];
    const total = plan.filter((turn) => turn.player === id).length;
    const correct = scores[id];
    const stars = starsFor(correct, total);
    const before = kid.stars;
    kid.stars += stars;
    const stats = gameStats(kid, 'duo', 1);
    kid.games.duo = { ...stats, sessions: stats.sessions + 1, bestStars: Math.max(stats.bestStars, stars) };
    // une partie pour chacun (objectif du jour) ; le temps compte pour les deux
    logSession(kid, { at: new Date().toISOString(), game: 'duo', level: 1, correct, total, stars, seconds });
    return { id, correct, stars, unlocked: newStickers(before, kid.stars) };
  });
  endDuo(store);
  clearSessionFlag('duo');
  save();

  const team = results.reduce((sum, r) => sum + r.correct, 0) / session.total;
  const title = team >= 0.9 ? 'Bravo l’équipe !' : team >= 0.6 ? 'Très bien l’équipe !' : 'Bien joué l’équipe !';
  const answers = (n) => `${n} bonne${n > 1 ? 's' : ''} réponse${n > 1 ? 's' : ''}`;
  show(h('main', { class: 'screen results duo-end domain-theme-duo' },
    confetti(Math.max(...results.map((r) => r.stars))),
    topBar({ onBack: profileScreen, backLabel: 'Qui joue ?', title: '👫 Jouer à deux' }),
    h('h2', { class: 'duo-team' }, frenchSpacing(title)),
    h('div', { class: 'duo-final' }, results.map(({ id, correct, stars, unlocked }) => h('section', { class: 'duo-final-card', 'data-duo-result': id },
      avatar(id, 'avatar-md cheer'),
      h('h3', { class: 'duo-final-name' }, frenchSpacing(store.profiles[id].name)),
      h('p', { class: 'duo-final-detail' }, answers(correct)),
      h('div', { class: 'result-stars', 'aria-label': `${stars} étoile${stars > 1 ? 's' : ''} sur 3` },
        [1, 2, 3].map((i) => h('span', { class: i <= stars ? 'big-star on' : 'big-star', style: { animationDelay: `${i * 0.25}s` } }, '⭐'))),
      h('p', { class: 'duo-final-gain' }, `+${stars} ⭐`),
      unlocked.length ? h('p', { class: 'duo-final-sticker' }, unlocked.at(-1).emoji, frenchSpacing(' Nouvel autocollant !')) : null))),
    h('div', { class: 'result-actions duo-actions' },
      h('button', { class: 'big-btn primary', 'data-duo-again': '', onclick: () => tryDuo(players) }, '🔁 Rejouer à deux'),
      h('button', { class: 'big-btn', 'data-duo-home': '', onclick: profileScreen }, '👫 Qui joue ?'))));
  playSound('fanfare');
  speak([
    title,
    results.map(({ id, correct }, i) => `${me(id).spoken} : ${i ? correct : answers(correct)}`).join(', ') + '.',
    ...results.filter((r) => r.unlocked.length).map((r) => `Nouvel autocollant pour ${me(r.id).spoken} !`),
  ]);
}

// ---------------------------------------------------------------- Premier lancement

/**
 * Formulaire d'un enfant : prénom, dessin (fille ou garçon, avec le prénom sur le tee-shirt)
 * et classe. Le prénom sert ensuite partout : « Bravo Léa ! », les petits problèmes…
 */
function childForm({ initial = {}, submitLabel, onSubmit }) {
  const state = { name: initial.name || '', look: initial.look || 'fille', grade: initial.grade || 'CP' };
  const input = h('input', {
    type: 'text', class: 'text-input', 'data-field': 'name', maxlength: NAME_MAX, value: state.name,
    autocomplete: 'off', autocapitalize: 'words', enterkeyhint: 'done', placeholder: 'Prénom', 'aria-label': 'Prénom de l’enfant',
  });
  const looks = h('div', { class: 'look-picker', role: 'radiogroup', 'aria-label': 'Dessin' });
  const grades = h('div', { class: 'segmented grade-picker', role: 'radiogroup', 'aria-label': 'Classe' });
  const error = h('p', { class: 'form-error', 'aria-live': 'polite' });
  const draw = () => {
    looks.replaceChildren(...Object.entries(LOOKS).map(([look, { label }]) => h('button', {
      type: 'button', class: state.look === look ? 'look-option on' : 'look-option', 'data-look': look,
      role: 'radio', 'aria-checked': String(state.look === look), onclick: () => { state.look = look; draw(); },
    }, avatar(`apercu-${look}`, 'avatar-md', { name: cleanName(state.name), look }), h('span', {}, label))));
    grades.replaceChildren(...Object.keys(GRADES).map((g) => h('button', {
      type: 'button', class: state.grade === g ? 'seg on' : 'seg', 'data-grade': g,
      role: 'radio', 'aria-checked': String(state.grade === g), onclick: () => { state.grade = g; draw(); },
    }, g)));
  };
  input.addEventListener('input', () => { state.name = input.value; error.textContent = ''; draw(); });
  draw();
  const submit = (e) => {
    e.preventDefault();
    if (!cleanName(state.name)) {
      error.textContent = 'Écrivez le prénom de l’enfant.';
      input.focus();
      return;
    }
    onSubmit({ ...state, name: cleanName(state.name) });
  };
  return h('form', { class: 'child-form', onsubmit: submit },
    h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Prénom'), input),
    h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Son personnage'), looks),
    h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Classe'), grades),
    error,
    h('button', { type: 'submit', class: 'big-btn primary child-submit' }, submitLabel));
}

/** Premier lancement (ou lien partagé à une autre famille) : on crée les profils des enfants. */
function welcomeScreen(adding = !store.order.length) {
  const added = store.order.map((id) => h('span', { class: 'child-chip', 'data-child': id }, avatar(id, 'avatar-xs'), store.profiles[id].name));
  show(h('main', { class: 'screen welcome' },
    cornerActions(),
    h('div', { class: 'welcome-hero' },
      h('div', { class: 'welcome-avatars', 'aria-hidden': 'true' },
        avatar('apercu-fille', 'avatar-md', { look: 'fille' }), avatar('apercu-garcon', 'avatar-md', { look: 'garcon' })),
      h('h1', { class: 'welcome-title' }, 'Bienvenue !'),
      h('p', { class: 'welcome-text' }, 'Des jeux pour apprendre à lire, à compter et à parler anglais, de la moyenne section au CE1.')),
    added.length ? h('section', { class: 'card' }, h('h2', {}, 'Ils vont jouer'), h('div', { class: 'child-chips' }, added)) : null,
    adding
      ? h('section', { class: 'card' },
        h('h2', {}, added.length ? 'Ajouter un autre enfant' : 'Qui va jouer ?'),
        h('p', { class: 'muted small' }, 'Le prénom est écrit sur le tee-shirt du personnage et sert à féliciter l’enfant. Tout reste sur cet appareil.'),
        childForm({
          submitLabel: 'Ajouter',
          onSubmit: (data) => {
            addChild(store, data);
            save();
            applySettings();
            welcomeScreen(false);
          },
        }))
      : null,
    added.length
      ? h('div', { class: 'welcome-actions' },
        !adding && store.order.length < MAX_CHILDREN
          ? h('button', { class: 'big-btn add-another', onclick: () => welcomeScreen(true) }, icon('plus'), 'Ajouter un autre enfant')
          : null,
        h('button', { class: 'big-btn primary start-btn', onclick: () => profileScreen() }, 'C’est parti !'))
      : null));
}

// ---------------------------------------------------------------- Accueil de l'enfant

function profileChip() {
  const c = me();
  return h('button', { class: 'profile-chip', onclick: profileScreen, 'aria-label': 'Changer de joueur' },
    avatar(c.id, 'avatar-xs'), h('span', {}, c.name));
}

function homeScreen() {
  const c = me();
  const domains = programForChild(child());
  const featured = featuredBlock();
  show(h('main', { class: `screen home${featured ? ' has-featured' : ''}` },
    homeBar(),
    h('div', { class: 'home-hero' },
      seasonDecor(),
      h('h1', { class: 'home-title' }, frenchSpacing(`Bonjour ${c.name} !`)),
      goalBar()),
    h('nav', { class: 'home-menu' },
      featured,
      h('div', { class: 'home-top' }, dailyButton(), reviewButton()),
      domains.length
        ? h('div', { class: `home-grid n${domains.length}` },
          domains.map((d) => h('button', { class: `domain-tile domain-${d.id}`, 'data-domain': d.id, onclick: () => domainScreen(d.id) },
            h('span', { class: 'domain-icon', 'aria-hidden': 'true' }, d.icon), h('span', { class: 'domain-name' }, d.title))))
        : h('p', { class: 'muted home-empty' }, 'Pas de jeux pour le moment : demande à un parent.'),
      h('div', { class: 'home-bottom' },
        h('button', { class: 'domain-btn domain-album', onclick: albumScreen },
          h('span', { class: 'domain-icon', 'aria-hidden': 'true' }, '🏆'),
          h('span', {}, 'Mon album'),
          h('span', { class: 'pill' }, `${stickersUnlocked(child().stars)}/${STICKERS.length}`)),
        h('button', { class: 'domain-btn domain-dress', 'data-dress': '', onclick: () => characterScreen() },
          h('span', { class: 'domain-icon', 'aria-hidden': 'true' }, '🎨'),
          h('span', {}, 'Mon personnage'))))));
}

/** « ⭐ Conseillé pour toi » : les jeux choisis par les parents, en haut de l'accueil. */
function featuredBlock() {
  const list = featuredGames(child()).slice(0, MAX_FEATURED);
  if (!list.length) return null;
  return h('section', { class: 'home-featured', 'aria-labelledby': 'featured-label' },
    h('h2', { class: 'featured-label', id: 'featured-label' }, '⭐ Conseillé pour toi'),
    h('div', { class: `featured-list n${list.length}` },
      list.map(({ game, min, max }) => h('button', {
        class: `featured-game domain-theme-${game.domain}`,
        'data-featured': game.id,
        onclick: () => (game.paliers ? palierMap(min, max) : startSession(game, { back: homeScreen })),
      },
      h('span', { class: 'featured-icon', 'aria-hidden': 'true' }, game.icon),
      h('span', { class: 'featured-title' }, game.title)))));
}

// ---------------------------------------------------------------- Défi du jour

/** Date du jour (ou d'un autre jour, en décalage), au format AAAA-MM-JJ, à l'heure locale. */
function dayKey(offset = 0, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Le défi du jour : 5 questions tirées des jeux de la classe, au niveau de l'enfant (jamais un
 * jeu masqué par les parents, ni un défi chrono, qui a son propre format). Les mêmes jeux toute
 * la journée ; une étoile bonus et un jour de plus dans la série.
 */
function dailyGame() {
  const picks = dailyPicks(child(), `${dayKey()}:${store.active}`);
  return {
    id: 'defi',
    domain: 'defi',
    title: 'Défi du jour',
    icon: '🔥',
    levels: ['Défi du jour'],
    range: { min: 1, max: 1 },
    fixedLevel: true,
    badge: () => 'Défi 🔥',
    generate(_level, rng, index, context) {
      const { game, min, max } = picks[index % picks.length];
      const level = Math.min(max, Math.max(min, gameStats(child(), game.id, min).level));
      const q = game.generate(level, rng, index, context);
      return { ...q, key: `defi:${q.key}`, from: game.id, fromLevel: level };
    },
  };
}

// ---------------------------------------------------------------- Révisions espacées

const REVIEW_STEPS = [1, 3, 7]; // jours avant la révision suivante

/** Une erreur dans un jeu : on le révisera dès aujourd'hui, au niveau où l'erreur a eu lieu (sauf calcul et défis chrono). */
function scheduleReview(gameId, level) {
  const kid = child();
  if (!kid || !findGame(gameId) || findGame(gameId).paliers || findGame(gameId).timed) return;
  kid.review = { ...(kid.review || {}), [gameId]: { level, due: dayKey(), step: 0 } };
}

/** Réussi du premier coup pendant une révision : on espace (1, 3, puis 7 jours), puis c'est acquis. */
function advanceReview(gameId) {
  const kid = child();
  const item = kid.review?.[gameId];
  if (!item) return;
  if (item.step >= REVIEW_STEPS.length - 1) delete kid.review[gameId];
  else kid.review[gameId] = { ...item, step: item.step + 1, due: dayKey(REVIEW_STEPS[item.step + 1]) };
}

/** Les révisions du jour (sans les jeux masqués par les parents). */
function dueReviews() {
  return reviewsDue(child(), dayKey());
}

function reviewGame() {
  const due = dueReviews();
  return {
    id: 'revision',
    domain: 'revision',
    title: 'Je révise',
    icon: '🔁',
    levels: ['Révisions'],
    range: { min: 1, max: 1 },
    fixedLevel: true,
    badge: () => 'Révision',
    generate(_level, rng, index, context) {
      const [gameId, item] = due[index % due.length];
      const q = findGame(gameId).generate(item.level, rng, index, context);
      return { ...q, key: `revision:${q.key}`, from: gameId, fromLevel: item.level };
    },
  };
}

function reviewButton() {
  const due = dueReviews();
  if (!due.length) return null;
  return h('button', { class: 'domain-btn domain-revision', 'data-revision': '', onclick: () => startSession(reviewGame(), { back: homeScreen, total: 5 }) },
    h('span', { class: 'domain-icon', 'aria-hidden': 'true' }, '🔁'),
    h('span', {}, 'Je révise'),
    h('span', { class: 'pill' }, `${due.length} jeu${due.length > 1 ? 'x' : ''}`));
}

// ---------------------------------------------------------------- Objectif du jour et temps d'écran

function todayStats(kid = child()) {
  const today = dayKey();
  const sessions = kid.history.filter((e) => e.at && dayKey(0, new Date(e.at)) === today);
  const extra = kid.extraTime?.day === today ? kid.extraTime.minutes : 0;
  return { parts: sessions.length, minutes: sessions.reduce((sum, e) => sum + (e.seconds || 0), 0) / 60, extra };
}

function goalBar() {
  const goal = child().goals?.parts || 0;
  if (!goal) return null;
  const { parts } = todayStats();
  const done = Math.min(parts, goal);
  return h('div', { class: `goal-bar${done >= goal ? ' reached' : ''}`, 'aria-label': `Objectif du jour : ${done} partie${done > 1 ? 's' : ''} sur ${goal}` },
    h('span', { class: 'goal-label' }, done >= goal ? '🎯 Objectif du jour atteint !' : `🎯 Objectif : ${done} / ${goal} parties`),
    h('span', { class: 'goal-track' }, Array.from({ length: goal }, (_, i) => h('span', { class: i < done ? 'goal-step on' : 'goal-step' }))));
}

/** Temps maximum atteint ? (réglé par les parents, avec du temps en plus possible) */
function timeIsUp(kid = child()) {
  const limit = kid.goals?.limit || 0;
  if (!limit) return false;
  const { minutes, extra } = todayStats(kid);
  return minutes >= limit + extra;
}

function pauseScreen() {
  const c = me();
  show(h('main', { class: 'screen pause' },
    homeBar(),
    h('div', { class: 'pause-card' },
      avatar(c.id, 'avatar-md'),
      h('h1', {}, 'C’est l’heure de la pause !'),
      h('p', {}, `Bravo ${c.name}, tu as bien travaillé aujourd’hui. Tu pourras rejouer demain.`),
      h('div', { class: 'pause-ideas', 'aria-hidden': 'true' }, '🌳 🎨 📚 ⚽'),
      h('button', { class: 'big-btn', onclick: albumScreen }, '🏆 Voir mon album'),
      h('button', {
        class: 'link-action pause-more',
        onclick: () => parentGate(() => {
          const kid = child();
          const today = dayKey();
          kid.extraTime = { day: today, minutes: (kid.extraTime?.day === today ? kid.extraTime.minutes : 0) + 10 };
          save();
          homeScreen();
        }),
      }, 'Parents : 10 minutes de plus'))));
  say(c, `C’est l’heure de la pause, ${c.spoken} ! Tu as bien travaillé.`);
}

function dailyButton() {
  if (!drawPool(child()).length) return null; // tous les jeux sont masqués
  const daily = child().daily;
  const done = daily?.last === dayKey();
  const streak = daily && (done || daily.last === dayKey(-1)) ? daily.streak : 0;
  return h('button', {
    class: `domain-btn domain-defi${done ? ' done' : ''}`,
    'data-defi': '',
    onclick: () => startSession(dailyGame(), { back: homeScreen, total: 5 }),
  },
  h('span', { class: 'domain-icon', 'aria-hidden': 'true' }, '🔥'),
  h('span', {}, 'Défi du jour'),
  done || streak ? h('span', { class: 'pill' }, done ? '✓ fait' : `${streak} j.`) : null);
}

// ---------------------------------------------------------------- Choix du jeu

function levelDots(level, min, max) {
  const total = max - min + 1;
  if (total > 6) return h('span', { class: 'level-text' }, `Niveau ${level - min + 1}/${total}`);
  return h('span', { class: 'level-dots', 'aria-label': `Niveau ${level - min + 1} sur ${total}` },
    Array.from({ length: total }, (_, i) => h('span', { class: i <= level - min ? 'dot on' : 'dot' })));
}

function palierSummary(min, max) {
  const done = CALC_PALIERS.slice(min - 1, max).filter((p) => (child().paliers[p.id]?.stars || 0) >= 3).length;
  return h('span', { class: 'level-text' }, `${done}/${max - min + 1} paliers`);
}

function domainScreen(domainId) {
  const domain = domainById(domainId);
  if (!domain) return homeScreen();
  const guide = me();
  const featured = new Set(featuredGames(child()).map(({ game }) => game.id));
  const blocks = [];
  let section = null;
  for (const { game, min, max } of domain.games) {
    if (game.section && game.section !== section) {
      section = game.section;
      blocks.push(h('h2', { class: 'section-title' }, section));
    }
    const stats = gameStats(child(), game.id, min);
    const level = Math.min(max, Math.max(min, stats.level));
    // La carte lance le jeu ; le bas de la carte (les points de niveau) permet de choisir le niveau.
    const pickable = !game.paliers && max > min;
    blocks.push(h('div', { class: featured.has(game.id) ? 'game-card featured' : 'game-card' },
      h('button', {
        class: 'game-play',
        'data-game': game.id,
        onclick: () => (game.paliers ? palierMap(min, max) : startSession(game)),
      },
      featured.has(game.id) ? h('span', { class: 'featured-badge' }, '⭐ Conseillé') : null,
      h('span', { class: 'game-icon', 'aria-hidden': 'true' }, game.icon),
      h('span', { class: 'game-title' }, game.title),
      game.paliers ? palierSummary(min, max) : null,
      !pickable && !game.paliers ? levelDots(level, min, max) : null,
      stats.bestStars ? h('span', { class: 'best' }, '⭐'.repeat(stats.bestStars)) : null),
      pickable
        ? h('button', {
          class: 'level-pick',
          'data-levels': game.id,
          'aria-label': `Choisir le niveau : ${game.title}`,
          onclick: () => levelScreen(game),
        }, levelDots(level, min, max), h('span', { class: 'level-pick-label' }, 'Niveaux ▾'))
        : null));
  }
  show(h('main', { class: `screen domain domain-theme-${domain.id}` },
    topBar({ onBack: homeScreen, title: `${domain.icon} ${domain.title}`, right: starCounter() }),
    h('div', { class: 'game-grid' }, blocks)));
  say(guide, `${domain.title}. Choisis un jeu !`);
}

/** Choisir directement son niveau (dans la fourchette de la classe). */
function levelScreen(game) {
  const { min, max } = levelRange(child().grade, game.id);
  const current = Math.min(max, Math.max(min, gameStats(child(), game.id, min).level));
  const rows = [];
  for (let level = min; level <= max; level++) {
    const n = level - min + 1;
    const state = level < current ? 'passed' : level === current ? 'current' : 'next';
    rows.push(h('button', {
      class: `level-row ${state}`,
      'data-level': level,
      onclick: () => startSession(game, { level }),
    },
    h('span', { class: 'level-num', 'aria-hidden': 'true' }, n),
    h('span', { class: 'level-label' }, h('b', {}, `Niveau ${n}`), h('span', {}, game.levels[level - 1])),
    h('span', { class: 'level-state' }, state === 'passed' ? '✓' : state === 'current' ? '▶ Ici' : '')));
  }
  show(h('main', { class: `screen levels domain-theme-${game.domain}` },
    topBar({ onBack: () => domainScreen(game.domain), title: `${game.icon} ${game.title}`, right: starCounter() }),
    h('p', { class: 'levels-intro' }, 'Choisis ton niveau :'),
    h('div', { class: 'level-list' }, rows)));
  say(me(), 'Choisis ton niveau !');
}

// ---------------------------------------------------------------- Carte des paliers de calcul

const OP_CLASS = { '+': 'plus', '−': 'moins', '±': 'mix' };
const OP_NAMES = { '+': 'Additions', '−': 'Soustractions', '±': 'Mélange' };

function palierMap(min = 1, max = CALC_PALIERS.length) {
  const game = findGame('calcul');
  const range = CALC_PALIERS.slice(min - 1, max);
  const recommended = range.find((p) => (child().paliers[p.id]?.stars || 0) < 3) || range.at(-1);
  const guide = me();
  const tiles = range.map((p) => {
    const index = CALC_PALIERS.indexOf(p) + 1;
    const stars = child().paliers[p.id]?.stars || 0;
    const classes = ['palier-tile', `op-${OP_CLASS[p.op]}`];
    if (stars >= PALIER_MAX_STARS) classes.push('done');
    if (p === recommended) classes.push('recommended');
    return h('button', { class: classes.join(' '), 'data-palier': p.id, onclick: () => startSession(game, { level: index, back: () => palierMap(min, max) }) },
      p === recommended ? h('span', { class: 'palier-flag' }, 'À toi !') : null,
      stars >= PALIER_MAX_STARS ? h('span', { class: 'palier-trophy', 'aria-hidden': 'true' }, '🏆') : null,
      h('span', { class: 'palier-label', 'aria-label': `${OP_NAMES[p.op]} jusqu'à ${p.max}` }, p.op, h('b', {}, p.max)),
      h('span', { class: 'palier-stars', 'aria-label': `${stars} étoiles sur ${PALIER_MAX_STARS}` },
        Array.from({ length: PALIER_MAX_STARS }, (_, i) => h('span', { class: i < stars ? 'pstar on' : 'pstar' }, '★'))));
  });
  show(h('main', { class: 'screen paliers domain-theme-maths' },
    topBar({ onBack: () => domainScreen('maths'), title: '➕ Calcul', right: starCounter() }),
    h('div', { class: 'palier-head' },
      h('span', { class: 'op-plus' }, '➕ Additions'), h('span', { class: 'op-moins' }, '➖ Soustractions'), h('span', { class: 'op-mix' }, '🔀 Mélange')),
    h('div', { class: 'palier-grid' }, tiles)));
  say(guide, 'Choisis ton palier !');
  app.querySelector('.palier-tile.recommended')?.scrollIntoView({ block: 'center' });
}

// ---------------------------------------------------------------- Partie

function startSession(game, { level, back, total, duo } = {}) {
  if (!duo && timeIsUp()) return pauseScreen(); // à deux, le temps de chacun est vérifié avant (tryDuo)
  const { min, max } = game.range || levelRange(child().grade, game.id);
  const stats = gameStats(child(), game.id, min);
  const startLevel = level || Math.min(max, Math.max(min, stats.level));
  const session = {
    game,
    min,
    max,
    back: back || (() => domainScreen(game.domain)),
    index: 0,
    total: questionsPerSession(game, total, store.settings.sessionLength), // défi chrono : toujours 10
    correct: 0,
    recentKeys: [],
    briefed: new Set(), // consignes déjà dites en entier pendant cette partie
    startedAt: Date.now(),
    // un niveau choisi à la main repart d'une série vierge
    levelState: { level: startLevel, streak: game.paliers || level ? 0 : stats.streak, recent: game.paliers || level ? [] : stats.recent },
    formatOffset: Number(new URLSearchParams(location.search).get('format') || 0),
    duo, // partie à deux : { players, plan, scores }
  };
  nextQuestion(session);
}

function newQuestion(session) {
  let q;
  for (let i = 0; i < 10; i++) {
    // contexte : le prénom de l'enfant et la saison (histoires et textes de saison)
    q = session.game.generate(session.levelState.level, rng, session.index + session.formatOffset, { name: me().name, season: currentSeason().id });
    if (!session.recentKeys.includes(q.key)) break;
  }
  session.recentKeys = [...session.recentKeys, q.key].slice(-4);
  return q;
}

function nextQuestion(session) {
  if (session.index >= session.total) return finishSession(session);
  // à deux : la question est celle de l'enfant dont c'est le tour (son prénom, son personnage, sa voix)
  if (session.duo) store.active = session.duo.plan[session.index].player;
  const q = newQuestion(session);
  session.question = q;
  session.attempts = 0;
  session.locked = false;
  globalThis.__lc = { question: q }; // utilisé par les tests de bout en bout

  const { game } = session;
  const guide = me(); // seul l'enfant qui joue apparaît, avec sa photo ou son dessin et sa voix
  session.guide = guide;
  // La consigne complète est dite la première fois ; ensuite, une version courte
  // (q.short) évite de répéter la même phrase à chaque question (à deux : pour chaque enfant).
  const shortKey = q.short && (q.short.key ?? q.short.text);
  const briefKey = session.duo && q.short ? `${store.active}:${shortKey}` : shortKey;
  const brief = Boolean(q.short) && session.briefed.has(briefKey);
  if (q.short) session.briefed.add(briefKey);
  const replay = () => say(guide, q.replay || q.instruction);
  const progress = h('div', { class: 'progress', 'aria-label': `Question ${session.index + 1} sur ${session.total}` },
    Array.from({ length: session.total }, (_, i) =>
      h('span', { class: i < session.index ? 'step done' : i === session.index ? 'step current' : 'step' })));
  const feedback = h('div', { class: 'feedback', 'aria-live': 'polite' });
  const ctx = { session, q, feedback };

  let stage = null;
  let zone;
  const custom = {
    build: buildZone, maze: mazeZone, roundmaze: roundMazeZone, path: pathZone, lasso: lassoZone, sudoku: sudokuZone, symmetry: symmetryZone,
    swap: swapZone, memory: memoryZone, colorby: colorbyZone, dots: dotsZone, trace: traceZone, setclock: setClockZone,
    picross: picrossZone,
    map: mapZone,
  }[q.interaction];
  if (custom) {
    ({ stage, zone } = custom(ctx));
  } else {
    if (q.stage.type !== 'none') stage = h('div', { class: 'stage' }, renderStage(q.stage, { replay, speak: (parts) => say(guide, parts), readAlong: () => readAlong() }));
    if (q.interaction === 'keypad') zone = keypadZone(ctx);
    else if (q.interaction === 'match') zone = matchZone(ctx);
    else if (q.interaction === 'fill') zone = fillZone(ctx);
    else if (q.interaction === 'order') zone = orderZone(ctx);
    else if (q.interaction === 'pay') zone = payZone(ctx);
    else zone = choiceZone(ctx);
  }
  if (stage) enableCounting(stage, guide);

  const levelText = game.badge ? game.badge(session.levelState.level) : `Niv. ${session.levelState.level - session.min + 1}`;
  // défi chrono : le chronomètre (mm:ss) s'affiche sous le niveau, en haut à droite
  const clock = game.timed ? h('span', { class: 'chrono-clock', role: 'timer' }) : null;
  const badge = clock
    ? h('span', { class: 'level-badge chrono-badge' }, h('span', { class: 'chrono-level' }, levelText), clock)
    : h('span', { class: 'level-badge' }, levelText);
  show(h('main', { class: `screen play domain-theme-${game.domain} play-${q.interaction || 'choice'}${session.duo ? ' duo-play' : ''}`, 'data-game': game.id },
    session.duo
      ? topBar({ onBack: session.back, backLabel: 'Quitter', title: duoScoreboard(session, progress) })
      : topBar({ onBack: session.back, backLabel: 'Quitter', title: progress, right: badge }),
    h('div', { class: 'instruction' },
      h('button', { class: 'guide-btn', onclick: replay, 'aria-label': `Réécouter ${guide.name}` },
        avatar(guide.id, 'avatar-sm'), h('span', { class: 'speak-badge', 'aria-hidden': 'true' }, '🔊')),
      h('button', { class: 'bubble bubble-left', onclick: replay }, frenchSpacing(brief ? q.short.text : q.text))),
    stage,
    zone,
    feedback));
  if (clock) runChrono(session, clock);
  // histoire en karaoké : la voix d'un parent (si l'histoire est enregistrée) ou la voix de
  // synthèse lit l'histoire pendant que le texte s'allume, puis la question est posée
  const readAlong = (before = []) => (q.karaoke ? readStory(stage, guide, q, before) : null);
  const turn = session.duo ? [`À toi, ${guide.spoken} !`] : []; // à deux : « À toi, Matteo ! »
  if (q.karaoke) readAlong(turn);
  else say(guide, [...turn, ...[brief ? (q.short.speak ?? q.short.text) : q.instruction].flat()]);
}

// ---- Défi chrono : le temps court de l'affichage de la 1re question à la dernière bonne réponse

let chronoTimer = null;

function chronoNow(session) {
  return elapsedSeconds(session.chronoStart, session.chronoEnd || Date.now());
}

/** Démarre le chrono à la 1re question, puis met à jour l'affichage (il s'arrête seul quand l'écran change). */
function runChrono(session, el) {
  if (!session.chronoStart) session.chronoStart = Date.now();
  clearInterval(chronoTimer);
  const tick = () => {
    if (!el.isConnected) {
      clearInterval(chronoTimer); // partie finie ou quittée
      return;
    }
    el.textContent = `⏱ ${formatChrono(chronoNow(session))}`;
  };
  tick();
  chronoTimer = setInterval(tick, 250);
}

/** Lit des phrases en allumant chaque mot ; repli au rythme moyen si le navigateur ne suit pas les mots. */
function karaoke(stageEl, guide, sentences, after = [], before = []) {
  const sentenceEls = [...stageEl.querySelectorAll('.k-sentence')];
  const clear = () => stageEl.querySelectorAll('.w.on').forEach((w) => w.classList.remove('on'));
  let timer = null;
  const parts = sentences.map((text, si) => {
    const words = [...sentenceEls[si].querySelectorAll('.w')];
    let tracked = false;
    const light = (w) => { clear(); w?.classList.add('on'); };
    return {
      text,
      rate: 0.85,
      onStart: () => {
        light(words[0]);
        clearInterval(timer);
        let i = 0;
        timer = setInterval(() => {
          if (tracked || ++i >= words.length) return clearInterval(timer);
          light(words[i]);
        }, 420);
      },
      onWord: (charIndex) => {
        tracked = true;
        clearInterval(timer);
        light(words.find((w) => charIndex >= Number(w.dataset.start) && charIndex <= Number(w.dataset.end)));
      },
    };
  });
  return say(guide, [...before, ...parts, ...(Array.isArray(after) ? after : [after])]).then(() => {
    clearInterval(timer);
    clear();
  });
}

// ---- Histoires lues par papa ou maman (enregistrées sur l'appareil, voir recordings.js)

let recordedIds = null; // identifiants des histoires enregistrées (null : pas encore lus)
let storyAudioEl = null;
let storyRun = 0; // chaque lecture a son numéro : une nouvelle lecture ou une parole annule la précédente
let stopCurrentAudio = null;
let audioUnlocked = false;

function refreshRecorded() {
  return recordings.list().then((ids) => {
    recordedIds = new Set(ids);
    return recordedIds;
  });
}

/** Un seul élément <audio> pour toute l'app (caché, sans commandes), placé là où il joue. */
function storyAudio() {
  if (!storyAudioEl) storyAudioEl = h('audio', { class: 'story-audio', preload: 'auto' });
  return storyAudioEl;
}

/**
 * Sur iPhone et iPad, un élément audio ne peut jouer après une attente (lecture de la base)
 * que s'il a déjà été lancé pendant un toucher : on le « débloque » au premier toucher.
 */
function unlockStoryAudio() {
  if (audioUnlocked || stopCurrentAudio || !recordedIds?.size) return;
  audioUnlocked = true;
  const audio = storyAudio();
  audio.load();
  audio.play()?.catch(() => {});
  audio.pause();
}

/** Arrête la voix enregistrée en cours (nouvel écran, nouvelle parole, réécoute…). */
function stopStoryAudio() {
  storyRun++;
  stopCurrentAudio?.();
}

/**
 * Joue un son enregistré avec l'élément audio de l'app, placé (caché) dans `into`.
 * `onTime(t, durée)` suit la lecture. Se termine par 'ended', 'stopped' ou 'failed'.
 */
function playAudio(blob, { into = null, duration = 0, onTime = null } = {}) {
  stopStoryAudio();
  const audio = storyAudio();
  if (into && audio.parentNode !== into) into.append(audio);
  const url = URL.createObjectURL(blob);
  return new Promise((resolve) => {
    let ticker = null;
    let safety = null;
    // un son WebM enregistré par Chrome n'annonce pas sa durée : on prend celle mesurée
    const length = () => (Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : duration);
    const finish = (outcome) => {
      if (stopCurrentAudio !== stop) return;
      stopCurrentAudio = null;
      clearInterval(ticker);
      clearTimeout(safety);
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      URL.revokeObjectURL(url);
      resolve(outcome);
    };
    const stop = () => finish('stopped');
    stopCurrentAudio = stop;
    audio.onended = () => finish('ended');
    audio.onerror = () => finish('failed');
    audio.src = url;
    if (onTime) ticker = setInterval(() => onTime(audio.currentTime, length()), 100);
    // filet de sécurité : certains navigateurs n'émettent jamais « ended »
    if (duration > 0) safety = setTimeout(() => finish('ended'), (duration + 4) * 1000);
    audio.play()?.catch(() => finish('failed'));
  });
}

/**
 * Lit l'histoire puis pose la question. Si un parent a enregistré l'histoire sur cet appareil,
 * c'est sa voix qu'on entend, et les phrases s'allument une à une au prorata de leur longueur ;
 * la question reste posée par la voix de synthèse. Sinon, karaoké avec la voix de synthèse.
 */
async function readStory(stageEl, guide, q, before = []) {
  const id = q.stage.storyId;
  // histoire non enregistrée, ou voix coupée (l'enfant lit seul) : la voix de synthèse tout de suite
  if (!id || store.settings.voice === false || (recordedIds && !recordedIds.has(id))) return karaoke(stageEl, guide, q.stage.sentences, q.instruction, before);
  stopSpeaking();
  stopStoryAudio();
  const run = storyRun;
  const saved = await recordings.get(id);
  if (run !== storyRun || !stageEl.isConnected) return undefined; // une autre lecture a commencé, ou l'écran a changé
  let intro = before;
  if (saved) {
    // à deux : « À toi, Matteo ! » avant l'histoire enregistrée (speak et non say, qui arrêterait cette lecture)
    if (intro.length) {
      await speak(intro, guide?.voice);
      intro = [];
      if (run !== storyRun || !stageEl.isConnected) return undefined;
    }
    const sentenceEls = [...stageEl.querySelectorAll('.k-sentence')];
    const light = (index) => sentenceEls.forEach((el, i) => el.classList.toggle('on', i === index));
    const outcome = await playAudio(saved.blob, {
      into: stageEl.querySelector('.stage-karaoke') || stageEl,
      duration: saved.duration,
      onTime: (t, length) => light(sentenceAt(sentenceTimeline(q.stage.sentences, length), t)),
    });
    light(-1);
    if (outcome === 'stopped' || !stageEl.isConnected) return undefined;
    if (outcome === 'ended') return say(guide, q.instruction);
    // son illisible sur cet appareil : la voix de synthèse prend le relais
  }
  return karaoke(stageEl, guide, q.stage.sentences, q.instruction, intro);
}

/** Toucher les objets pour les compter un par un : la voix dit « un, deux, trois… ». */
function enableCounting(stageEl, guide) {
  let counted = 0;
  const reset = h('button', { class: 'count-reset', 'aria-label': 'Recommencer à compter', hidden: true }, '↺');
  reset.addEventListener('click', (e) => {
    e.stopPropagation();
    counted = 0;
    stageEl.querySelectorAll('.object.counted').forEach((el) => { el.classList.remove('counted'); el.removeAttribute('data-n'); });
    reset.hidden = true;
  });
  stageEl.append(reset);
  stageEl.addEventListener('click', (e) => {
    const obj = e.target.closest('.object');
    if (!obj || obj.classList.contains('counted') || obj.classList.contains('removed') || obj.closest('.flash.hidden')) return;
    counted++;
    obj.classList.add('counted');
    obj.dataset.n = counted;
    reset.hidden = false;
    say(guide, { text: String(counted), rate: 1.1 });
  });
}

// ---- Réponses : bonne ou mauvaise, quelle que soit la forme de l'exercice

function markWrong(ctx, { message = 'Essaie encore !', speech, given } = {}) {
  const { session, q, feedback } = ctx;
  session.attempts++;
  playSound('error');
  feedback.replaceChildren(h('p', { class: 'try-again' }, message));
  say(session.guide, speech || message);
  if (given !== undefined) {
    logMistake(child(), { at: new Date().toISOString(), game: q.from || session.game.id, question: q.text, expected: q.answer, given });
  }
  scheduleReview(q.from || session.game.id, q.fromLevel || session.levelState.level);
  save();
}

async function markCorrect(ctx) {
  const { session, q, feedback } = ctx;
  if (session.locked) return;
  session.locked = true;
  const { game } = session;
  const firstTry = session.attempts === 0;
  playSound('success');
  app.querySelector('.guide-btn .avatar')?.classList.add('cheer');
  if (firstTry) session.correct++;
  if (firstTry && session.duo) session.duo.scores[store.active]++;
  if (firstTry && game.id === 'revision') advanceReview(q.from);

  let change = null;
  // défi chrono : le niveau ne change pas pendant la partie (le record est celui du niveau joué)
  if (!game.fixedLevel && !game.timed) {
    const result = recordAnswer(session.levelState, firstTry, session.max, session.min);
    session.levelState = result.state;
    change = result.change;
  }
  const stats = gameStats(child(), game.id, session.min);
  child().games[game.id] = {
    ...stats,
    ...(game.fixedLevel ? {} : session.levelState),
    answered: stats.answered + 1,
    correct: stats.correct + (firstTry ? 1 : 0),
    lastPlayed: new Date().toISOString(),
  };
  save();
  session.index++;
  if (game.timed && session.index >= session.total) session.chronoEnd = Date.now(); // dernière bonne réponse : le chrono s'arrête

  const name = me().name;
  const praise = firstTry ? (rng() < 0.3 ? `Bravo ${name} !` : pick(rng, PRAISES)) : 'Oui, c’est ça !';
  // replaceChildren(null) afficherait le texte « null » : on ne passe que de vrais éléments
  feedback.replaceChildren(...[
    h('p', { class: 'praise' }, praise),
    q.success?.reveal ? revealWord(q.success.reveal, q.success.highlight) : null,
  ].filter(Boolean));
  const toSay = [praise];
  if (q.success?.speak) toSay.push(...(Array.isArray(q.success.speak) ? q.success.speak : [q.success.speak]));
  if (change === 'up') {
    feedback.append(h('p', { class: 'level-up' }, '🚀 Niveau suivant !'));
    toSay.push('Tu passes au niveau suivant !');
    setTimeout(() => playSound('levelUp'), 300);
  }
  if (game.timed) {
    // défi chrono : on enchaîne vite, le temps tourne
    say(session.guide, praise);
    await sleep(800);
  } else {
    await Promise.all([sleep(1300), Promise.race([say(session.guide, toSay), sleep(4500)])]);
  }
  if (app.contains(feedback)) nextQuestion(session);
}

// ---- Choix multiple

function choiceZone(ctx) {
  const { q } = ctx;
  // un mot très long (« l’éléphanteau ») doit tenir sur la largeur d'une colonne
  const longWord = q.choices.some((c) => typeof c.label === 'string' && c.label.split(/\s+/).some((w) => w.length > 9));
  const zone = h('div', { class: `choices choices-${q.choiceStyle} n${q.choices.length}${q.stage.type === 'none' ? ' center' : ''}${longWord ? ' long-words' : ''}` });
  for (const choice of q.choices) {
    const label = typeof choice.label === 'string' ? choice.label : '';
    const classes = ['choice'];
    if (label.length > 7 && q.choiceStyle !== 'sentences') classes.push('long');
    if (/^\d{3,}$/.test(label)) classes.push(label.length >= 4 ? 'digits-4' : 'digits-3'); // grands nombres : police plus petite
    const btn = h('button', { class: classes.join(' '), 'data-value': String(choice.value) }, renderChoiceContent(choice));
    btn.addEventListener('click', () => {
      if (ctx.session.locked || btn.disabled) return;
      if (choice.value === q.answer) {
        btn.classList.add('correct');
        zone.classList.add('answered');
        markCorrect(ctx);
        return;
      }
      btn.classList.add('wrong');
      btn.disabled = true;
      if (ctx.session.attempts >= 1) {
        zone.querySelector(`[data-value="${CSS.escape(String(q.answer))}"]`)?.classList.add('hint');
        markWrong(ctx, { message: 'Touche celle qui brille !', given: choice.value });
      } else {
        markWrong(ctx, { speech: ['Essaie encore !', ...(q.replay || [])], given: choice.value });
      }
    });
    zone.append(btn);
  }
  return zone;
}

// ---- Pavé numérique

function keypadZone(ctx) {
  const { q } = ctx;
  let typed = '';
  const gap = () => app.querySelector('.stage .gap');
  const update = () => {
    const el = gap();
    if (!el) return;
    el.textContent = typed || '?';
    el.classList.toggle('typed', Boolean(typed));
  };
  const submit = () => {
    if (!typed) return;
    const value = Number(typed);
    if (value === q.answer) {
      zone.classList.add('answered');
      gap()?.classList.add('right');
      markCorrect(ctx);
      return;
    }
    gap()?.classList.add('shake');
    setTimeout(() => gap()?.classList.remove('shake'), 400);
    typed = '';
    update();
    const hint = ctx.session.attempts >= 1;
    markWrong(ctx, {
      message: hint ? `C’est ${q.answer} !` : 'Essaie encore !',
      speech: hint ? `C’est ${q.answer}. Tape ${q.answer} !` : 'Essaie encore !',
      given: value,
    });
  };
  const press = (key) => {
    if (ctx.session.locked) return;
    if (key === '⌫') typed = typed.slice(0, -1);
    else if (key === '✔') return submit();
    else if (typed.length < q.maxDigits) typed = typed === '0' ? key : typed + key;
    update();
  };
  const zone = h('div', { class: 'choices keypad' },
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✔'].map((key) =>
      h('button', {
        class: key === '✔' ? 'key key-ok' : key === '⌫' ? 'key key-del' : 'key',
        'data-key': key,
        'aria-label': key === '⌫' ? 'Effacer' : key === '✔' ? 'Valider' : key,
        onclick: () => press(key),
      }, key)));
  return zone;
}

// ---- Relie

const PAIR_COLORS = ['#ff8a3d', '#22b07d', '#7b61ff', '#ff5fa2'];

/** Luminance relative d'une couleur #rrggbb ou #rgb (0 = noir, 1 = blanc). */
function luminance(hex) {
  const full = hex.length === 4 ? hex.replace(/^#(.)(.)(.)$/, '#$1$1$2$2$3$3') : hex;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function matchZone(ctx) {
  const { q } = ctx;
  let pending = { left: null, right: null };
  let matched = 0;
  const lines = document.createElementNS(SVG_NS, 'svg');
  lines.setAttribute('class', 'match-lines');
  // à gauche : un calcul, un mot… ou une collection d'objets à compter
  const lefts = q.pairs.map((p, i) => h('button', { class: `match-item left${p.objects ? ' has-objects' : ''}${p.emoji ? ' has-emoji' : ''}`, 'data-left': i, 'aria-label': p.objects ? String(p.left) : undefined },
    p.objects ? renderChoiceContent({ objects: p.objects })
      : p.swatch ? h('span', { class: 'swatch', style: { background: p.swatch }, role: 'img', 'aria-label': p.left })
        : p.emoji || p.left));
  const rightLang = q.rightLang ? { lang: q.rightLang } : {};
  const rights = q.rights.map((v) => h('button', { class: `match-item right${typeof v === 'string' ? ' is-word' : ''}`, 'data-right': v, ...rightLang }, v));
  const zone = h('div', { class: `choices match pairs-${q.pairs.length}${q.vanish ? ' vanish' : ''}` },
    lines, h('div', { class: 'match-col' }, lefts), h('div', { class: 'match-col' }, rights));

  const local = (x, y) => {
    const box = zone.getBoundingClientRect();
    // coordonnées dans la zone (corrigées du zoom de l'écran sur iPad)
    const scale = box.width / zone.offsetWidth || 1;
    return [(x - box.left) / scale, (y - box.top) / scale];
  };
  const svgEl = (tag, attrs) => {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  };
  const drawLine = (a, b, color) => {
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    // deux colonnes (portrait) : de côté à côté ; deux lignes (paysage) : de haut en bas
    const stacked = rb.top >= ra.bottom - 1;
    const [x1, y1] = stacked ? local(ra.left + ra.width / 2, ra.bottom) : local(ra.right, ra.top + ra.height / 2);
    const [x2, y2] = stacked ? local(rb.left + rb.width / 2, rb.top) : local(rb.left, rb.top + rb.height / 2);
    const line = svgEl('line', { x1, y1, x2, y2, stroke: color });
    lines.append(line);
    return line;
  };
  const tryPair = (trace = null) => {
    if (pending.left === null || pending.right === null) return;
    const a = lefts[pending.left];
    const b = rights.find((r) => String(r.dataset.right) === String(pending.right) && !r.disabled);
    if (q.pairs[pending.left].right === pending.right) {
      // une couleur à relier (« pink ») : la paire prend cette couleur-là, pas une autre
      const swatch = q.pairs[pending.left].swatch;
      const color = q.vanish ? 'var(--good)' : swatch || PAIR_COLORS[matched % PAIR_COLORS.length];
      const light = swatch ? luminance(swatch) > 0.45 : false;
      for (const el of [a, b]) {
        el.classList.remove('selected');
        el.classList.add('matched');
        el.classList.toggle('light-pair', light);
        el.style.setProperty('--pair', color);
        el.disabled = true;
      }
      const stroke = swatch && luminance(swatch) > 0.8 ? '#b8b2a5' : color;
      let line = trace;
      if (line) line.setAttribute('class', 'trace done');
      else line = drawLine(a, b, stroke);
      line.style.stroke = stroke;
      matched++;
      playSound('tap');
      if (q.pairs[pending.left].say) say(ctx.session.guide, q.pairs[pending.left].say);
      if (q.vanish) {
        // la paire juste devient verte, puis disparaît
        setTimeout(() => {
          a.classList.add('vanished');
          b.classList.add('vanished');
          line.remove();
        }, 650);
      }
      if (matched === q.pairs.length) {
        zone.classList.add('answered');
        markCorrect(ctx);
      }
    } else {
      trace?.remove();
      for (const el of [a, b]) {
        el.classList.remove('selected');
        el.classList.add('shake');
        setTimeout(() => el.classList.remove('shake'), 400);
      }
      markWrong(ctx, { given: `${q.pairs[pending.left].left} → ${pending.right}` });
    }
    pending = { left: null, right: null };
  };
  const select = (el) => {
    if (ctx.session.locked || el.disabled) return;
    const isLeft = el.classList.contains('left');
    (isLeft ? lefts : rights).forEach((x) => x.classList.remove('selected'));
    el.classList.add('selected');
    if (isLeft) pending.left = Number(el.dataset.left);
    else pending.right = q.rights.find((v) => String(v) === el.dataset.right);
    tryPair();
  };

  // Tracer un trait au doigt d'un élément jusqu'à son partenaire (ou toucher l'un puis l'autre).
  for (const el of [...lefts, ...rights]) {
    el.addEventListener('click', (e) => {
      if (e.detail === 0) select(el); // clavier ; le doigt et la souris passent par pointerdown
    });
    el.addEventListener('pointerdown', (e) => {
      if (ctx.session.locked || el.disabled) return;
      e.preventDefault();
      const points = [local(e.clientX, e.clientY)];
      let trace = null;
      const move = (ev) => {
        const p = local(ev.clientX, ev.clientY);
        const last = points.at(-1);
        if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 3) return;
        points.push(p);
        if (!trace && points.length > 2) {
          trace = svgEl('polyline', { class: 'trace live' });
          lines.append(trace);
          el.classList.add('selected');
        }
        trace?.setAttribute('points', points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '));
      };
      const up = (ev) => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        if (!trace) return select(el); // simple toucher
        const target = ev.type === 'pointerup' ? document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.match-item') : null;
        const isLeft = el.classList.contains('left');
        if (!target || target.disabled || !zone.contains(target) || target.classList.contains('left') === isLeft) {
          trace.remove();
          el.classList.remove('selected');
          return;
        }
        pending = isLeft
          ? { left: Number(el.dataset.left), right: q.rights.find((v) => String(v) === target.dataset.right) }
          : { left: Number(target.dataset.left), right: q.rights.find((v) => String(v) === el.dataset.right) };
        tryPair(trace);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    });
  }
  return zone;
}

// ---- Complète (□ + □ = 8) : glisser ou toucher les étiquettes ; chaque calcul juste devient vert

function fillZone(ctx) {
  const { q } = ctx;
  const n = q.equations.length;
  const boxes = q.equations.map(() => [null, null]); // index de l'étiquette posée dans chaque case
  const done = q.equations.map(() => false); // calculs validés (verts)
  const misses = q.equations.map(() => 0);
  let selected = null;
  const tileEls = q.tiles.map((v, t) => h('button', { class: 'tile', 'data-value': v, 'data-tile': t }, v));
  const boxEls = q.equations.map((_, r) => [0, 1].map((c) => h('button', { class: 'fill-box', 'data-row': r, 'data-col': c, 'aria-label': 'Case vide' })));
  const rowEls = q.equations.map((eq, r) => h('div', { class: 'fill-row' },
    boxEls[r][0], h('span', { class: 'op' }, eq.op), boxEls[r][1], h('span', { class: 'op' }, '='), h('span', { class: 'num' }, eq.result)));
  const value = (r, c) => q.tiles[boxes[r][c]];
  const used = () => new Set(boxes.flat().filter((t) => t !== null));

  // Une solution pour les calculs pas encore verts, avec les étiquettes encore libres.
  const solution = (rows, free) => {
    if (!rows.length) return [];
    const [r, ...rest] = rows;
    for (const i of free) {
      for (const j of free) {
        if (i === j || !equationHolds(q.equations[r], q.tiles[i], q.tiles[j])) continue;
        const after = solution(rest, free.filter((t) => t !== i && t !== j));
        if (after) return [[r, i, j], ...after];
      }
    }
    return null;
  };
  const openRows = (except = -1) => q.equations.map((_, r) => r).filter((r) => !done[r] && r !== except);
  const freeTiles = (taken = []) => q.tiles.map((_, t) => t).filter((t) => !done.some((d, r) => d && boxes[r].includes(t)) && !taken.includes(t));

  const refresh = () => {
    boxEls.forEach((row, r) => row.forEach((el, c) => {
      const t = boxes[r][c];
      el.textContent = t === null ? '' : q.tiles[t];
      el.setAttribute('aria-label', t === null ? 'Case vide' : `Case : ${q.tiles[t]}`);
      el.classList.toggle('filled', t !== null);
      el.classList.toggle('selected', Boolean(selected) && selected[0] === r && selected[1] === c);
      el.disabled = done[r];
    }));
    const taken = used();
    tileEls.forEach((el, t) => {
      el.classList.toggle('used', taken.has(t));
      el.disabled = taken.has(t);
    });
  };
  const clearRow = (r) => {
    boxes[r] = [null, null];
    rowEls[r].classList.add('shake');
    setTimeout(() => rowEls[r].classList.remove('shake'), 400);
  };
  const checkRow = (r) => {
    if (done[r] || boxes[r].includes(null) || ctx.session.locked) return;
    const [x, y] = [value(r, 0), value(r, 1)];
    tileEls.forEach((el) => el.classList.remove('hint'));
    if (equationHolds(q.equations[r], x, y)) {
      // juste… mais il faut que les autres calculs restent possibles avec ce qui reste
      if (!solution(openRows(r), freeTiles(boxes[r]))) {
        clearRow(r);
        refresh();
        const message = 'C’est juste, mais ces nombres serviront ailleurs. Essaie autrement !';
        ctx.feedback.replaceChildren(h('p', { class: 'try-again' }, message));
        say(ctx.session.guide, message);
        return;
      }
      done[r] = true;
      rowEls[r].classList.add('right');
      ctx.feedback.replaceChildren();
      playSound('tap');
      refresh();
      if (done.every(Boolean)) {
        zone.classList.add('answered');
        markCorrect(ctx);
      }
      return;
    }
    misses[r]++;
    clearRow(r);
    refresh();
    markWrong(ctx, { given: `${x} ${q.equations[r].op} ${y} = ${q.equations[r].result}` });
    if (misses[r] >= 2) {
      // après deux essais, les bonnes étiquettes pour ce calcul brillent
      const step = solution([r, ...openRows(r)], freeTiles())?.[0];
      if (step) [step[1], step[2]].forEach((t) => tileEls[t].classList.add('hint'));
    }
  };
  const place = (t, r, c) => {
    if (done[r]) return;
    boxes[r][c] = t;
    selected = null;
    refresh();
    if (!boxes[r].includes(null)) setTimeout(() => checkRow(r), 250);
  };
  // toucher une étiquette : elle va dans la case choisie, sinon dans la première case vide
  const tapTile = (t) => {
    if (ctx.session.locked || tileEls[t].disabled) return;
    let target = selected && !done[selected[0]] && boxes[selected[0]][selected[1]] === null ? selected : null;
    for (let r = 0; r < n && !target; r++) {
      for (let c = 0; c < 2 && !target; c++) if (!done[r] && boxes[r][c] === null) target = [r, c];
    }
    if (target) place(t, ...target);
  };
  boxEls.forEach((row, r) => row.forEach((el, c) => el.addEventListener('click', () => {
    if (ctx.session.locked || done[r]) return;
    if (boxes[r][c] !== null) boxes[r][c] = null; // l'étiquette retourne en bas
    else selected = [r, c];
    refresh();
  })));

  // glisser-déposer au doigt
  let fromPointer = false;
  tileEls.forEach((el, t) => {
    el.addEventListener('click', () => {
      if (fromPointer) { fromPointer = false; return; }
      tapTile(t); // clavier, lecteur d'écran
    });
    el.addEventListener('pointerdown', (e) => {
      if (ctx.session.locked || el.disabled) return;
      e.preventDefault();
      const start = [e.clientX, e.clientY];
      const rect = el.getBoundingClientRect();
      let ghost = null;
      let over = null;
      const boxAt = (ev) => {
        const box = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.fill-box');
        return box && zone.contains(box) && !box.disabled ? box : null;
      };
      const move = (ev) => {
        if (!ghost && Math.hypot(ev.clientX - start[0], ev.clientY - start[1]) > 8) {
          ghost = h('div', { class: 'tile tile-ghost', 'aria-hidden': 'true', style: { width: `${rect.width}px`, height: `${rect.height}px` } }, q.tiles[t]);
          document.body.append(ghost);
          el.classList.add('dragging');
        }
        if (!ghost) return;
        ghost.style.transform = `translate(${ev.clientX - rect.width / 2}px, ${ev.clientY - rect.height / 2}px)`;
        ghost.hidden = true; // pour trouver la case sous le doigt
        const box = boxAt(ev);
        ghost.hidden = false;
        if (box !== over) {
          over?.classList.remove('drop-target');
          box?.classList.add('drop-target');
          over = box;
        }
      };
      const up = (ev) => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        fromPointer = true;
        setTimeout(() => { fromPointer = false; }, 400);
        over?.classList.remove('drop-target');
        if (!ghost) return tapTile(t);
        ghost.remove();
        el.classList.remove('dragging');
        const box = ev.type === 'pointerup' ? boxAt(ev) : null;
        if (box) place(t, Number(box.dataset.row), Number(box.dataset.col));
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    });
  });
  const zone = h('div', { class: `choices fill rows-${n}` },
    h('div', { class: 'fill-rows' }, rowEls),
    h('div', { class: `tile-tray tiles-${q.tiles.length}` }, tileEls));
  refresh();
  return zone;
}

// ---- Sudoku : toucher une case vide, puis une image ou un chiffre

function sudokuZone(ctx) {
  const { q } = ctx;
  const { size, box: [br, bc], puzzle, solution, symbols } = q.stage;
  const grid = [...puzzle];
  const misses = grid.map(() => 0);
  let selected = grid.indexOf(null);
  const label = (i) => `Ligne ${Math.floor(i / size) + 1}, colonne ${(i % size) + 1}${grid[i] === null ? ', vide' : ` : ${symbols[grid[i]]}`}`;
  const cells = grid.map((v, i) => {
    const r = Math.floor(i / size);
    const c = i % size;
    const classes = ['sudoku-cell'];
    if (v !== null) classes.push('given');
    if (c % bc === bc - 1 && c < size - 1) classes.push('box-right');
    if (r % br === br - 1 && r < size - 1) classes.push('box-bottom');
    const el = h('button', { class: classes.join(' '), 'data-cell': i, 'aria-label': label(i) }, v === null ? '' : symbols[v]);
    el.addEventListener('click', () => {
      if (ctx.session.locked || grid[i] !== null) return;
      selected = i;
      refresh();
    });
    return el;
  });
  // la ligne, la colonne et le carré de la case choisie sont teintés (repère pour le 9 × 9)
  const sameBox = (a, b) => Math.floor(Math.floor(a / size) / br) === Math.floor(Math.floor(b / size) / br)
    && Math.floor((a % size) / bc) === Math.floor((b % size) / bc);
  const isPeer = (i) => selected >= 0 && i !== selected
    && (Math.floor(i / size) === Math.floor(selected / size) || i % size === selected % size || sameBox(i, selected));
  const refresh = () => cells.forEach((el, i) => {
    el.classList.toggle('selected', i === selected);
    el.classList.toggle('peer', isPeer(i));
    el.setAttribute('aria-label', label(i));
  });
  // pourquoi c'est faux : la même image est déjà dans la ligne, la colonne ou le carré
  const conflict = (cell, v) => {
    const r = Math.floor(cell / size);
    const c = cell % size;
    if (grid.some((x, i) => x === v && Math.floor(i / size) === r)) return 'cette ligne';
    if (grid.some((x, i) => x === v && i % size === c)) return 'cette colonne';
    if (grid.some((x, i) => x === v && sameBox(i, cell))) return 'ce carré';
    return null;
  };
  const choose = (v) => {
    if (ctx.session.locked || selected < 0) return;
    const i = selected;
    if (solution[i] === v) {
      grid[i] = v;
      cells[i].textContent = symbols[v];
      cells[i].classList.add('found');
      palette.forEach((p) => p.classList.remove('hint'));
      playSound('tap');
      // case vide suivante (en continuant après celle-ci)
      const order = [...grid.keys()].slice(i + 1).concat([...grid.keys()].slice(0, i + 1));
      selected = order.find((k) => grid[k] === null) ?? -1;
      refresh();
      if (selected === -1) {
        zone.classList.add('answered');
        markCorrect(ctx);
      }
      return;
    }
    misses[i]++;
    cells[i].classList.add('shake');
    setTimeout(() => cells[i].classList.remove('shake'), 400);
    const where = conflict(i, v);
    markWrong(ctx, { message: where ? `Il y en a déjà dans ${where} !` : 'Essaie encore !', given: `${symbols[v]} (case ${i + 1})` });
    if (misses[i] >= 2) palette[solution[i]].classList.add('hint');
  };
  const palette = symbols.map((sym, v) => h('button', { class: 'sudoku-symbol', 'data-symbol': v, onclick: () => choose(v) }, sym));
  const board = h('div', { class: `sudoku size-${size}`, style: { '--size': size } }, cells);
  const zone = h('div', { class: `choices sudoku-palette size-${size}`, style: { '--n': size } }, palette);
  refresh();
  return { stage: h('div', { class: 'stage stage-sudoku' }, board), zone };
}

// ---- Symétrie : colorier les cases de l'autre côté du trait

function symmetryZone(ctx) {
  const { q } = ctx;
  const { cols, rows, axis, model, solution } = q.stage;
  const isTarget = (i) => (axis === 'v' ? i % cols >= cols / 2 : Math.floor(i / cols) >= rows / 2);
  const filled = new Set();
  const cells = Array.from({ length: cols * rows }, (_, i) => {
    const target = isTarget(i);
    const el = h(target ? 'button' : 'span', {
      class: `sym-cell ${target ? 'target' : 'model'}${model.includes(i) ? ' on' : ''}`,
      'data-cell': i,
      'aria-label': target ? `Case ${Math.floor(i / cols) + 1}-${(i % cols) + 1}` : undefined,
      'aria-pressed': target ? 'false' : undefined,
    });
    if (target) {
      el.addEventListener('click', () => {
        if (ctx.session.locked) return;
        if (filled.has(i)) filled.delete(i);
        else filled.add(i);
        el.classList.toggle('on', filled.has(i));
        el.classList.remove('wrong', 'hint');
        el.setAttribute('aria-pressed', String(filled.has(i)));
        playSound('tap');
      });
    }
    return el;
  });
  const validate = () => {
    if (ctx.session.locked) return;
    const wrong = [...filled].filter((c) => !solution.includes(c));
    const missing = solution.filter((c) => !filled.has(c));
    if (!wrong.length && !missing.length) {
      zone.classList.add('answered');
      markCorrect(ctx);
      return;
    }
    wrong.forEach((c) => cells[c].classList.add('wrong'));
    setTimeout(() => wrong.forEach((c) => cells[c].classList.remove('wrong')), 1600);
    if (ctx.session.attempts >= 1) missing.forEach((c) => cells[c].classList.add('hint'));
    markWrong(ctx, {
      message: wrong.length ? 'Regarde bien dans le miroir !' : `Il manque ${missing.length} case${missing.length > 1 ? 's' : ''} !`,
      given: `${filled.size} cases`,
    });
  };
  const grid = h('div', { class: `sym-grid axis-${axis}`, style: { '--cols': cols, '--rows': rows } }, cells);
  const zone = h('div', { class: 'choices sym-zone' }, h('button', { class: 'big-btn primary validate-btn', onclick: validate }, '✔ J’ai fini'));
  return { stage: h('div', { class: 'stage stage-sym' }, grid), zone };
}

// ---- Le dessin caché (picross) : colorier les cases d'après les nombres ; un dessin apparaît

function picrossZone(ctx) {
  const { q } = ctx;
  const { cols, rows, rowClues, colClues, solution, given, colors, name } = q.stage;
  const goal = new Set(solution);
  const filled = new Set(given); // les cases données sont déjà coloriées (et ne s'effacent pas)
  const crossed = new Set(); // les croix : des cases que l'enfant sait vides
  let tool = 'fill';
  let painting = null; // glisser le doigt colorie (ou efface) plusieurs cases d'un coup
  const lineOf = (r) => Array.from({ length: cols }, (_, c) => (filled.has(r * cols + c) ? 1 : 0));
  const colOf = (c) => Array.from({ length: rows }, (_, r) => (filled.has(r * cols + c) ? 1 : 0));
  const runs = (line) => line.join('').split('0').filter(Boolean).map((s) => s.length).join(',');
  const clueEl = (clue, cls, label) => h('span', { class: `pc-clue ${cls}`, 'aria-label': `${label} : ${clue.length ? clue.join(', ') : 'aucune case'}` },
    (clue.length ? clue : [0]).map((n) => h('b', {}, n)));
  const rowEls = rowClues.map((clue, r) => clueEl(clue, 'pc-row', `Ligne ${r + 1}`));
  const colEls = colClues.map((clue, c) => clueEl(clue, 'pc-col', `Colonne ${c + 1}`));
  const cellLabel = (i) => `Ligne ${Math.floor(i / cols) + 1}, colonne ${(i % cols) + 1}${filled.has(i) ? ', coloriée' : crossed.has(i) ? ', croix' : ''}`;
  const cells = Array.from({ length: cols * rows }, (_, i) => h('button', { class: `pc-cell${given.includes(i) ? ' given' : ''}`, 'data-cell': i }));
  const draw = (i) => {
    cells[i].classList.toggle('on', filled.has(i));
    cells[i].classList.toggle('crossed', crossed.has(i));
    cells[i].setAttribute('aria-label', cellLabel(i));
  };
  // une ligne (ou une colonne) qui a ses bons nombres est barrée
  const refreshClues = () => {
    rowEls.forEach((el, r) => el.classList.toggle('done', runs(lineOf(r)) === rowClues[r].join(',')));
    colEls.forEach((el, c) => el.classList.toggle('done', runs(colOf(c)) === colClues[c].join(',')));
  };
  const finished = () => filled.size === goal.size && [...goal].every((i) => filled.has(i));
  const win = () => {
    crossed.clear();
    cells.forEach((el, i) => {
      draw(i);
      el.classList.remove('hint', 'wrong');
      if (goal.has(i)) el.style.background = colors[i];
    });
    board.classList.add('finished');
    zone.replaceChildren(h('span', { class: 'dots-name' }, `C’est ${name} !`));
    zone.classList.add('answered');
    markCorrect(ctx);
  };
  const apply = (i) => {
    if (given.includes(i)) return;
    const { mode } = painting;
    if (mode === 'fill') { filled.add(i); crossed.delete(i); }
    else if (mode === 'erase') filled.delete(i);
    else if (mode === 'cross') { if (!filled.has(i)) crossed.add(i); }
    else crossed.delete(i);
    cells[i].classList.remove('wrong', 'hint');
    draw(i);
    refreshClues();
  };
  const start = (i) => {
    if (ctx.session.locked || given.includes(i)) return;
    painting = { mode: tool === 'fill' ? (filled.has(i) ? 'erase' : 'fill') : (crossed.has(i) ? 'uncross' : 'cross'), last: i };
    apply(i);
    playSound('tap');
  };
  const end = () => {
    if (!painting) return;
    painting = null;
    if (finished()) win();
  };
  const board = h('div', {
    class: 'picross',
    role: 'group',
    'aria-label': 'Grille du dessin caché',
    style: {
      '--cols': cols, '--rows': rows,
      '--rw': Math.max(1, ...rowClues.map((c) => c.length)), '--ch': Math.max(1, ...colClues.map((c) => c.length)),
    },
  }, h('span', { class: 'pc-corner' }), colEls, rowEls.flatMap((el, r) => [el, ...cells.slice(r * cols, (r + 1) * cols)]));
  board.addEventListener('pointerdown', (e) => {
    const cell = e.target.closest('.pc-cell');
    if (!cell) return;
    e.preventDefault();
    try { board.setPointerCapture(e.pointerId); } catch { /* le doigt peut sortir de la grille et revenir */ }
    start(Number(cell.dataset.cell));
  });
  board.addEventListener('pointermove', (e) => {
    if (!painting) return;
    const cell = document.elementFromPoint(e.clientX, e.clientY)?.closest('.pc-cell');
    const i = cell && board.contains(cell) ? Number(cell.dataset.cell) : -1;
    if (i < 0 || i === painting.last) return;
    painting.last = i;
    apply(i);
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((type) => board.addEventListener(type, end));
  // au clavier (Entrée ou Espace sur une case), un appui = une case
  board.addEventListener('click', (e) => {
    const cell = e.target.closest('.pc-cell');
    if (!cell || e.detail !== 0) return;
    start(Number(cell.dataset.cell));
    end();
  });
  const validate = () => {
    if (ctx.session.locked) return;
    if (finished()) return win();
    const wrong = [...filled].filter((i) => !goal.has(i));
    const missing = solution.filter((i) => !filled.has(i));
    wrong.forEach((i) => cells[i].classList.add('wrong'));
    setTimeout(() => wrong.forEach((i) => cells[i].classList.remove('wrong')), 1600);
    if (ctx.session.attempts >= 1) missing.forEach((i) => cells[i].classList.add('hint'));
    markWrong(ctx, {
      message: wrong.length ? 'Regarde bien les nombres : une case est en trop !' : `Il manque ${missing.length} case${missing.length > 1 ? 's' : ''} !`,
      given: `${filled.size} cases`,
    });
  };
  const tools = [['fill', '✏️ Colorier'], ['cross', '✕ Croix']].map(([id, text]) => h('button', {
    class: `pc-tool${id === tool ? ' on' : ''}`, 'data-tool': id, 'aria-pressed': String(id === tool),
    onclick: () => {
      tool = id;
      tools.forEach((b) => {
        b.classList.toggle('on', b.dataset.tool === id);
        b.setAttribute('aria-pressed', String(b.dataset.tool === id));
      });
    },
  }, text));
  const zone = h('div', { class: 'choices picross-zone' },
    h('div', { class: 'pc-tools', role: 'group', 'aria-label': 'Outil' }, tools),
    h('button', { class: 'big-btn primary validate-btn', onclick: validate }, '✔ Vérifier'));
  cells.forEach((_, i) => draw(i));
  refreshClues();
  return { stage: h('div', { class: 'stage stage-picross' }, board), zone };
}

// ---- Le puzzle : toucher deux pièces pour les échanger

/** Un morceau de l'image : le même dessin, recadré sur la case (x, y). */
function puzzlePiece({ cols, rows, picture, colors }, piece) {
  const w = 100 / cols;
  const hh = 100 / rows;
  const x = (piece % cols) * w;
  const y = Math.floor(piece / cols) * hh;
  const el = h('span', { class: 'pz-piece', 'aria-hidden': 'true' });
  el.innerHTML = `<svg viewBox="${x} ${y} ${w} ${hh}" preserveAspectRatio="none">
    <defs><linearGradient id="pz${piece}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="100">
      <stop offset="0" stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient></defs>
    <rect x="0" y="0" width="100" height="100" fill="url(#pz${piece})"/>
    <circle cx="14" cy="14" r="7" fill="#fff" opacity="0.7"/><circle cx="86" cy="86" r="10" fill="#fff" opacity="0.35"/>
    <text x="50" y="54" font-size="${Math.min(cols, rows) / Math.max(cols, rows) * 78}" text-anchor="middle" dominant-baseline="middle">${picture}</text>
  </svg>`;
  return el;
}

function swapZone(ctx) {
  const { q } = ctx;
  const { cols, rows } = q.stage;
  const order = [...q.stage.order];
  let selected = null;
  const board = h('div', { class: 'pz-board', style: { '--cols': cols, '--rows': rows } });
  const draw = () => {
    board.replaceChildren(...order.map((piece, pos) => {
      const tile = h('button', {
        class: `pz-tile${selected === pos ? ' selected' : ''}${piece === pos ? ' placed' : ''}`,
        'data-pos': pos,
        'data-piece': piece,
        'aria-label': `Pièce ${pos + 1}${piece === pos ? ', bien placée' : ''}`,
      }, puzzlePiece(q.stage, piece));
      tile.addEventListener('click', () => {
        if (ctx.session.locked) return;
        if (selected === null) selected = pos;
        else if (selected === pos) selected = null;
        else {
          [order[selected], order[pos]] = [order[pos], order[selected]];
          selected = null;
          playSound('tap');
        }
        draw();
        checkSolved();
      });
      return tile;
    }));
  };
  const checkSolved = () => {
    if (!order.every((v, i) => v === i)) return;
    board.classList.add('solved');
    zone.classList.add('answered');
    markCorrect(ctx);
  };
  // l'aide place une pièce ; elle compte comme une aide (pas d'étoile du premier coup)
  const help = () => {
    if (ctx.session.locked) return;
    const pos = order.findIndex((v, i) => v !== i);
    const from = order.indexOf(pos);
    [order[pos], order[from]] = [order[from], order[pos]];
    ctx.session.attempts++;
    selected = null;
    playSound('tap');
    draw();
    checkSolved();
  };
  draw();
  // le modèle, en petit, pour comparer
  const model = h('div', { class: 'pz-model', style: { '--cols': cols, '--rows': rows } },
    Array.from({ length: cols * rows }, (_, i) => puzzlePiece(q.stage, i)));
  const zone = h('div', { class: 'choices pz-zone' },
    h('span', { class: 'pz-model-label' }, 'Le modèle :'), model,
    h('button', { class: 'pz-hint', onclick: help, 'aria-label': 'Aide : placer une pièce' }, '💡'));
  return { stage: h('div', { class: 'stage stage-puzzle' }, board), zone };
}

// ---- Le memory : retourner deux cartes, retrouver les paires

function memoryZone(ctx) {
  const { q } = ctx;
  const n = q.cards.length;
  const cols = n <= 4 ? 2 : n <= 6 ? 3 : n <= 16 ? 4 : 5;
  const rows = Math.ceil(n / cols);
  const open = [];
  const found = new Set();
  let misses = 0;
  let busy = false;
  const count = h('span', { class: 'memory-count', 'aria-live': 'polite' }, `0 / ${n / 2}`);
  const cards = q.cards.map((card, i) => {
    const el = h('button', { class: 'memory-card', 'data-card': i, 'aria-label': 'Carte retournée' },
      h('span', { class: `memory-face${card.small ? ' small' : ''}${card.word ? ' word' : ''}`, lang: card.lang }, card.label));
    el.addEventListener('click', () => {
      if (ctx.session.locked || busy || found.has(i) || open.includes(i)) return;
      open.push(i);
      el.classList.add('open');
      el.setAttribute('aria-label', card.small ? `${card.pair} objets` : String(card.label));
      playSound('tap');
      if (open.length < 2) return;
      const [a, b] = open;
      if (q.cards[a].pair === q.cards[b].pair) {
        found.add(a).add(b);
        open.length = 0;
        cards[a].classList.add('found');
        cards[b].classList.add('found');
        count.textContent = `${found.size / 2} / ${n / 2}`;
        if (q.cards[a].say && found.size < n) say(ctx.session.guide, q.cards[a].say);
        if (found.size === n) {
          // beaucoup d'essais ratés : pas d'étoile du premier coup
          if (misses > n) ctx.session.attempts = 1;
          zone.classList.add('answered');
          markCorrect(ctx);
        }
        return;
      }
      misses++;
      busy = true;
      setTimeout(() => {
        for (const k of open) {
          cards[k].classList.remove('open');
          cards[k].setAttribute('aria-label', 'Carte retournée');
        }
        open.length = 0;
        busy = false;
      }, 900);
    });
    return el;
  });
  const grid = h('div', { class: 'memory-grid', style: { '--cols': cols, '--rows': rows } }, cards);
  const zone = h('div', { class: 'choices memory-zone' }, h('span', {}, 'Paires trouvées : '), count);
  return { stage: h('div', { class: 'stage stage-memory' }, grid), zone };
}

// ---- Le coloriage magique : la couleur de chaque zone dépend du nombre écrit dedans

function colorbyZone(ctx) {
  const { q } = ctx;
  const { zones, legend } = q.stage;
  let color = null;
  const done = new Set();
  const misses = zones.map(() => 0);
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 120 120');
  svg.setAttribute('class', 'magic-drawing');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Dessin à colorier');
  const shapes = zones.map((z, i) => {
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', z.d);
    path.setAttribute('fill', '#ffffff');
    path.setAttribute('fill-rule', 'evenodd');
    path.setAttribute('class', 'magic-zone');
    path.dataset.zone = i;
    path.addEventListener('click', () => paint(i));
    svg.append(path);
    return path;
  });
  // les nombres par-dessus (ils ne captent pas le doigt)
  zones.forEach((z) => {
    const t = document.createElementNS(ns, 'text');
    t.setAttribute('x', z.at[0]);
    t.setAttribute('y', z.at[1]);
    t.setAttribute('class', `magic-label${z.label.length > 3 ? ' long' : ''}`);
    t.textContent = z.label;
    svg.append(t);
  });
  const paint = (i) => {
    if (ctx.session.locked || done.has(i)) return;
    if (color === null) {
      buttons.forEach((b) => b.classList.add('hint'));
      nudge(ctx, 'Choisis d’abord une couleur en bas !');
      return;
    }
    if (zones[i].c === color) {
      done.add(i);
      shapes[i].setAttribute('fill', legend[color].hex);
      shapes[i].classList.add('painted');
      playSound('tap');
      if (done.size === zones.length) {
        zone.classList.add('answered');
        markCorrect(ctx);
      }
      return;
    }
    misses[i]++;
    shapes[i].classList.add('shake');
    setTimeout(() => shapes[i].classList.remove('shake'), 400);
    const right = legend[zones[i].c];
    markWrong(ctx, {
      message: misses[i] >= 2 ? `Ici, c’est ${right.n} : le ${right.name} !` : 'Regarde bien le nombre !',
      given: `${legend[color].name} pour ${zones[i].label}`,
    });
    if (misses[i] >= 2) buttons[zones[i].c].classList.add('hint');
  };
  // en anglais : la légende dit « 1 red, 2 blue… » et les pots de peinture n'ont pas de nom
  const words = legend.some((c) => c.word);
  const buttons = legend.map((c, i) => {
    const btn = h('button', {
      class: 'magic-color', 'data-color': i, style: { '--paint': c.hex },
      'aria-label': words ? c.name : `${c.n} : ${c.name}`, 'aria-pressed': 'false',
    }, h('span', { class: 'magic-swatch', 'aria-hidden': 'true' }), words ? null : h('span', { class: 'magic-n' }, c.n));
    btn.addEventListener('click', () => {
      color = i;
      buttons.forEach((b, k) => {
        b.classList.toggle('on', k === i);
        b.classList.remove('hint');
        b.setAttribute('aria-pressed', String(k === i));
      });
      playSound('tap');
    });
    return btn;
  });
  const zone = h('div', { class: `choices magic-palette${words ? ' with-legend' : ''}` },
    words ? h('div', { class: 'magic-legend' }, legend.map((c) => h('span', { class: 'magic-key' }, h('b', {}, c.n), ' ', h('span', { lang: 'en' }, c.word)))) : null,
    h('div', { class: 'magic-buttons', style: { '--n': legend.length } }, words ? shuffle(rng, buttons) : buttons));
  return { stage: h('div', { class: 'stage stage-magic' }, svg), zone };
}

// ---- La carte du monde : toucher un continent, un océan, un pays, une capitale

/** Ce que montre la carte sous la consigne : le nom à trouver, le drapeau, l'animal, le voyage. */
function mapClue(clue) {
  if (clue.flag) return [flagElement(clue.flag, null, 'map-clue-flag'), h('span', { class: 'map-clue-text' }, '?')];
  if (clue.trip) {
    return [h('span', { class: 'map-clue-text' }, `🚩 ${clue.trip.from}`), h('span', { class: 'map-clue-arrow', 'aria-hidden': 'true' }, clue.trip.arrow),
      h('span', { class: 'map-clue-text' }, clue.trip.dir)];
  }
  return [h('span', { class: 'map-clue-emoji', 'aria-hidden': 'true' }, clue.emoji || clue.icon),
    h('span', { class: 'map-clue-text' }, clue.text, clue.sub ? h('small', {}, clue.sub) : null)];
}

function mapZone(ctx) {
  const { q } = ctx;
  const st = q.stage;
  const map = mapElement(st);
  const named = new Set(q.choices.map((c) => c.value));
  const parts = (id) => [...map.querySelectorAll(`[data-zone="${CSS.escape(id)}"]`)];
  const labels = (id) => [...map.querySelectorAll(`.map-label[data-for="${CSS.escape(id)}"]`)];
  const water = st.layer === 'oceans' || st.layer === 'seas';
  const zone = h('div', { class: 'choices map-clue' }, mapClue(q.clue));
  map.addEventListener('click', (e) => {
    if (ctx.session.locked) return;
    const target = e.target.closest('[data-zone], [data-kind]');
    const id = target?.dataset.zone;
    if (id === q.answer) {
      parts(id).forEach((el) => { el.classList.remove('hint'); el.classList.add('found'); });
      labels(id).forEach((el) => el.classList.add('show'));
      zone.classList.add('answered');
      markCorrect(ctx);
      return;
    }
    if (id && id === st.start) {
      nudge(ctx, 'C’est le pays de départ. Touche son voisin !');
      return;
    }
    if (id && named.has(id)) {
      // une autre zone : son nom s'affiche un instant
      parts(id).forEach((el) => {
        el.classList.remove('missed');
        el.getBoundingClientRect(); // relance l'animation
        el.classList.add('missed');
      });
      labels(id).forEach((el) => el.classList.add('show'));
      setTimeout(() => labels(id).forEach((el) => el.classList.remove('show')), 1800);
      const name = zoneName(id);
      if (ctx.session.attempts >= 1) {
        parts(q.answer).forEach((el) => el.classList.add('hint'));
        markWrong(ctx, { message: `Ça, c’est ${name}. Touche celle qui brille !`, given: id });
      } else {
        markWrong(ctx, { message: `Ça, c’est ${name}. Essaie encore !`, given: id });
      }
      return;
    }
    // ailleurs : la mer, ou une terre sans nom sur cette carte
    const kind = target?.dataset.kind;
    if (st.layer === 'capitals') nudge(ctx, 'Touche une étoile sur la carte !');
    else if (water) nudge(ctx, kind === 'land' ? 'Là, c’est la terre. Touche la mer !' : 'Essaie encore !');
    else if (kind === 'sea') nudge(ctx, st.layer === 'continents' ? 'Là, c’est la mer. Touche un continent !' : 'Là, c’est la mer. Touche un pays !');
    else markWrong(ctx, { message: 'Ce n’est pas ce pays. Essaie encore !', given: 'autre pays' });
  });
  return { stage: h('div', { class: 'stage stage-map' }, map), zone };
}

/** Message court sous l'exercice, sans compter d'erreur. */
function nudge(ctx, message) {
  ctx.feedback.replaceChildren(h('p', { class: 'try-again' }, message));
  say(ctx.session.guide, message);
}

// ---- Les points à relier : glisser le doigt d'un nombre au suivant ; un dessin apparaît

function dotsZone(ctx) {
  const { q } = ctx;
  const { points, labels, close } = q.stage;
  const ns = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs) => {
    const node = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  };
  const svg = el('svg', { viewBox: '-4 -4 108 108', class: 'dots-drawing', role: 'img', 'aria-label': 'Points à relier' });
  const shape = el('polygon', { class: 'dots-shape', points: '' });
  const line = el('polyline', { class: 'dots-line', points: '' });
  const rubber = el('line', { class: 'dots-rubber', x1: 0, y1: 0, x2: 0, y2: 0, visibility: 'hidden' });
  svg.append(shape, line, rubber);
  // chaque nombre est écrit à l'extérieur du dessin, à côté de son point
  const cx = points.reduce((s, p) => s + p[0], 0) / points.length;
  const cy = points.reduce((s, p) => s + p[1], 0) / points.length;
  const dots = points.map(([x, y], i) => {
    const d = Math.hypot(x - cx, y - cy) || 1;
    const lx = x + ((x - cx) / d) * 7;
    const ly = y + ((y - cy) / d) * 7;
    const g = el('g', { class: 'dot', 'data-dot': i });
    g.append(el('circle', { cx: x, cy: y, r: 2.6, class: 'dot-point' }));
    const t = el('text', { x: lx, y: ly, class: 'dot-label' });
    t.textContent = labels[i];
    g.append(t);
    svg.append(g);
    return g;
  });
  let next = 0;
  let drawing = false;
  const linked = [];
  const refresh = () => {
    line.setAttribute('points', linked.map((i) => points[i].join(',')).join(' '));
    dots.forEach((g, i) => {
      g.classList.toggle('next', i === next);
      g.classList.toggle('done', linked.includes(i));
    });
  };
  const toSvg = (e) => {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  };
  const near = (p, i) => Math.hypot(p.x - points[i][0], p.y - points[i][1]) < 8;
  const link = (i) => {
    linked.push(i);
    next++;
    playSound('tap');
    if (next === points.length) {
      if (close) linked.push(linked[0]);
      refresh();
      rubber.setAttribute('visibility', 'hidden');
      drawing = false;
      shape.setAttribute('points', points.map((p) => p.join(',')).join(' '));
      svg.classList.add('finished');
      zone.replaceChildren(h('span', { class: 'dots-name' }, `C’est ${q.stage.name} !`));
      zone.classList.add('answered');
      markCorrect(ctx);
      return;
    }
    refresh();
  };
  const move = (p) => {
    if (!drawing || !linked.length) return;
    const last = points[linked.at(-1)];
    rubber.setAttribute('x1', last[0]);
    rubber.setAttribute('y1', last[1]);
    rubber.setAttribute('x2', p.x);
    rubber.setAttribute('y2', p.y);
    rubber.setAttribute('visibility', 'visible');
    if (near(p, next)) link(next);
  };
  svg.addEventListener('pointerdown', (e) => {
    if (ctx.session.locked) return;
    e.preventDefault();
    const p = toSvg(e);
    if (near(p, next)) {
      drawing = true;
      link(next);
      return;
    }
    // le premier point s'il n'y en a pas encore, sinon on repart du dernier point relié
    const start = linked.length ? linked.at(-1) : -1;
    if (start >= 0 && near(p, start)) {
      drawing = true;
      return;
    }
    const wrong = points.findIndex((_, i) => !linked.includes(i) && near(p, i));
    if (wrong >= 0) {
      dots[wrong].classList.add('shake');
      setTimeout(() => dots[wrong].classList.remove('shake'), 400);
      markWrong(ctx, { message: `Cherche le ${labels[next]} !`, given: `${labels[wrong]} au lieu de ${labels[next]}` });
    }
  });
  svg.addEventListener('pointermove', (e) => move(toSvg(e)));
  const stop = () => {
    drawing = false;
    rubber.setAttribute('visibility', 'hidden');
  };
  svg.addEventListener('pointerup', stop);
  svg.addEventListener('pointercancel', stop);
  svg.addEventListener('pointerleave', stop);
  refresh();
  const zone = h('div', { class: 'choices dots-zone' },
    h('span', { class: 'dots-help' }, `Commence au ${labels[0]}, puis glisse ton doigt jusqu’au ${labels[1]}…`));
  return { stage: h('div', { class: 'stage stage-dots' }, svg), zone };
}

// ---- Écris au doigt : suivre le chemin gris, trait après trait, en partant du point vert

const TRACE_REACH = 10; // distance (unités du dessin) à laquelle un point de contrôle est atteint
const TRACE_LOST = 25; // au-delà, le doigt n'est plus sur le chemin
const TRACE_VIEW = { x: -8, size: 116 }; // le carré 0–100 avec une marge pour l'épaisseur du trait

const tracePoint = (p) => `${p[0]} ${p[1]}`;

/** Chemin SVG lisse qui suit les points (courbes passant par le milieu de chaque segment). */
function traceCurve(points) {
  if (points.length < 3) return `M${points.map(tracePoint).join(' L')}`;
  let d = `M${tracePoint(points[0])}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i];
    const [nx, ny] = points[i + 1];
    d += ` Q${x} ${y} ${(x + nx) / 2} ${(y + ny) / 2}`;
  }
  return `${d} L${tracePoint(points.at(-1))}`;
}

/** Points de contrôle d'un trait (indices) : environ tous les 8 unités, le premier et le dernier compris. */
function traceCheckpoints(points) {
  const out = [0];
  let run = 0;
  for (let i = 1; i < points.length; i++) {
    run += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    if (run >= 8 || i === points.length - 1) {
      out.push(i);
      run = 0;
    }
  }
  return out;
}

/** Distance d'un point à une ligne brisée. */
function distanceToLine([px, py], points) {
  let best = Infinity;
  for (let i = 0; i < points.length; i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[Math.min(i + 1, points.length - 1)];
    const len = (bx - ax) ** 2 + (by - ay) ** 2;
    const t = len ? Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / len)) : 0;
    best = Math.min(best, Math.hypot(px - (ax + t * (bx - ax)), py - (ay + t * (by - ay))));
  }
  return best;
}

function traceZone(ctx) {
  const { q, session } = ctx;
  const { strokes, lines, set, glyph, word, position } = q.stage;
  const el = (tag, attrs = {}) => {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  };
  const what = {
    graphisme: 'Chemin', chiffres: `Chiffre ${glyph}`, capitales: `Lettre ${glyph}`, cursive: `Lettre ${glyph} attachée`,
    nombres: `Nombre ${glyph}`, attache: `« ${glyph} » en attaché`,
  }[set];
  const svg = el('svg', {
    viewBox: `${TRACE_VIEW.x} ${TRACE_VIEW.x} ${TRACE_VIEW.size} ${TRACE_VIEW.size}`,
    class: `trace-drawing trace-${set}`, role: 'img', 'aria-label': `${what} à tracer`,
  });
  // lignes d'écriture de la cursive : ligne de base (pleine) et hauteur des minuscules (pointillés)
  if (lines) {
    svg.append(
      el('line', { class: 'trace-line trace-line-x', x1: -8, x2: 108, y1: lines.x, y2: lines.x }),
      el('line', { class: 'trace-line trace-line-base', x1: -8, x2: 108, y1: lines.base, y2: lines.base }));
  }
  const guides = strokes.map((st) => el('path', { class: 'trace-guide', d: traceCurve(st) }));
  const done = strokes.map(() => el('path', { class: 'trace-done', d: '' }));
  const inkLayer = el('g', { class: 'trace-inks' });
  // départ du trait en cours : rond vert numéroté et petite flèche dans le sens du geste
  const start = el('g', { class: 'trace-start' });
  const startNumber = el('text', { class: 'trace-start-num' });
  start.append(el('circle', { class: 'trace-start-dot', r: 5.4 }), startNumber);
  const arrow = el('path', { class: 'trace-arrow', d: 'M-2.6 -3.4 L3.6 0 L-2.6 3.4 Z' });
  const here = el('circle', { class: 'trace-here', r: 3.4, visibility: 'hidden' });
  const hintDot = el('circle', { class: 'trace-hint-dot', r: 4.4, visibility: 'hidden' });
  svg.append(...guides, ...done, inkLayer, arrow, start, here, hintDot);

  const checkpoints = strokes.map(traceCheckpoints);
  let current = 0; // trait en cours
  let reached = 0; // points de contrôle déjà atteints sur ce trait
  let finished = false;
  let drawing = false;
  let waitLift = false; // trait fini : on lève le doigt avant le suivant
  let ink = null;
  let inkPoints = [];
  let last = null;
  let lostSince = 0;
  let lostAt = 0;
  let lostMessage = null;

  const steps = word
    ? null
    : strokes.map((_, i) => h('span', { class: 'trace-step', 'aria-hidden': 'true' }, String(i + 1)));
  const stepsLabel = h('span', { class: 'visually-hidden', 'aria-live': 'polite' });
  const refresh = () => {
    done.forEach((path, i) => {
      if (i < current) path.setAttribute('d', traceCurve(strokes[i]));
      else if (i === current && reached > 1) path.setAttribute('d', traceCurve(strokes[i].slice(0, checkpoints[i][reached - 1] + 1)));
      else path.setAttribute('d', '');
    });
    const show = !finished && current < strokes.length;
    start.setAttribute('visibility', show ? 'visible' : 'hidden');
    arrow.setAttribute('visibility', 'hidden');
    here.setAttribute('visibility', 'hidden');
    if (show) {
      const st = strokes[current];
      start.setAttribute('transform', `translate(${tracePoint(st[0])})`);
      start.classList.toggle('started', reached > 0);
      startNumber.textContent = String(current + 1);
      // la flèche, un peu après le départ, dans la direction du trait
      let k = 1;
      for (let run = 0; k < st.length - 1 && run < 12; k++) run += Math.hypot(st[k][0] - st[k - 1][0], st[k][1] - st[k - 1][1]);
      const [a, b] = [st[k - 1], st[k]];
      if (reached === 0 && st.length > 3) {
        const angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
        arrow.setAttribute('transform', `translate(${tracePoint(a)}) rotate(${angle.toFixed(1)})`);
        arrow.setAttribute('visibility', 'visible');
      }
      // doigt levé au milieu d'un trait : on montre où reprendre
      if (reached > 0 && !drawing) {
        const p = st[checkpoints[current][reached - 1]];
        here.setAttribute('cx', p[0]);
        here.setAttribute('cy', p[1]);
        here.setAttribute('visibility', 'visible');
      }
    }
    steps?.forEach((s, i) => {
      s.classList.toggle('done', i < current);
      s.classList.toggle('current', i === current && !finished);
      s.textContent = i < current ? '✓' : String(i + 1);
    });
    stepsLabel.textContent = finished ? 'Terminé' : `Trait ${current + 1} sur ${strokes.length}`;
  };

  const finish = () => {
    finished = true;
    drawing = false;
    stopHint();
    svg.classList.add('finished'); // le glyphe se remplit de couleur
    refresh();
    zone.classList.add('answered');
    setTimeout(() => { if (svg.isConnected) markCorrect(ctx); }, 600);
  };
  const strokeDone = () => {
    playSound('tap');
    current++;
    reached = 0;
    waitLift = true;
    stopHint();
    if (lostMessage?.isConnected) ctx.feedback.replaceChildren();
    if (current === strokes.length) finish();
    else refresh();
  };
  /** Le doigt passe en p : on avance tant que le point de contrôle suivant est assez près. */
  const reach = (p) => {
    if (finished || waitLift) return;
    const st = strokes[current];
    const cps = checkpoints[current];
    let moved = false;
    while (reached < cps.length && Math.hypot(p[0] - st[cps[reached]][0], p[1] - st[cps[reached]][1]) <= TRACE_REACH) {
      reached++;
      moved = true;
    }
    if (!moved) return;
    if (reached === cps.length) strokeDone();
    else refresh();
  };
  /** Suit le doigt de last à p par petits pas (un doigt rapide ne saute aucun point de contrôle). */
  const follow = (p) => {
    const from = last || p;
    const n = Math.max(1, Math.ceil(Math.hypot(p[0] - from[0], p[1] - from[1]) / 2));
    for (let i = 1; i <= n && !finished && !waitLift; i++) reach([from[0] + ((p[0] - from[0]) * i) / n, from[1] + ((p[1] - from[1]) * i) / n]);
    last = p;
    // loin du chemin un moment : un petit mot, sans compter d'erreur
    if (finished || waitLift) return;
    const now = Date.now();
    if (distanceToLine(p, strokes[current]) > TRACE_LOST) {
      if (!lostSince) lostSince = now;
      else if (now - lostSince > 300 && now - lostAt > 3000) {
        lostAt = now;
        nudge(ctx, 'Reste sur le chemin gris !');
        lostMessage = ctx.feedback.firstChild;
      }
    } else {
      lostSince = 0;
      if (lostMessage?.isConnected) ctx.feedback.replaceChildren();
    }
  };
  const toSvg = (e) => {
    const r = svg.getBoundingClientRect();
    const scale = Math.min(r.width, r.height) / TRACE_VIEW.size || 1;
    const left = r.left + (r.width - TRACE_VIEW.size * scale) / 2;
    const top = r.top + (r.height - TRACE_VIEW.size * scale) / 2;
    return [TRACE_VIEW.x + (e.clientX - left) / scale, TRACE_VIEW.x + (e.clientY - top) / scale];
  };
  const drawInk = (p) => {
    const prev = inkPoints.at(-1);
    if (prev && Math.hypot(p[0] - prev[0], p[1] - prev[1]) < 0.8) return;
    inkPoints.push(p);
    ink.setAttribute('points', inkPoints.map((pt) => `${pt[0].toFixed(1)},${pt[1].toFixed(1)}`).join(' '));
  };
  svg.addEventListener('pointerdown', (e) => {
    if (session.locked || finished) return;
    e.preventDefault();
    try { svg.setPointerCapture(e.pointerId); } catch { /* pointeur déjà relâché */ }
    drawing = true;
    waitLift = false;
    lostSince = 0;
    const p = toSvg(e);
    ink = el('polyline', { class: 'trace-ink', points: '' });
    inkLayer.append(ink);
    inkPoints = [];
    drawInk(p);
    last = null;
    follow(p);
    refresh();
  });
  svg.addEventListener('pointermove', (e) => {
    if (!drawing || finished) return;
    const p = toSvg(e);
    drawInk(p);
    follow(p);
  });
  const lift = () => {
    if (!drawing) return;
    drawing = false;
    lostSince = 0;
    refresh();
  };
  svg.addEventListener('pointerup', lift);
  svg.addEventListener('pointercancel', lift);

  // 💡 : un point parcourt le trait en cours (une aide : pas d'étoile du premier coup)
  let hintFrame = 0;
  let hintRun = 0;
  function stopHint() {
    hintRun++;
    cancelAnimationFrame(hintFrame);
    hintDot.setAttribute('visibility', 'hidden');
  }
  const hint = () => {
    if (session.locked || finished) return;
    session.attempts++;
    stopHint();
    const st = strokes[current].slice(reached ? checkpoints[current][reached - 1] : 0);
    const lengths = [0];
    for (let i = 1; i < st.length; i++) lengths.push(lengths[i - 1] + Math.hypot(st[i][0] - st[i - 1][0], st[i][1] - st[i - 1][1]));
    const total = lengths.at(-1);
    const duration = Math.min(2600, Math.max(900, total * 22));
    const begin = performance.now();
    const run = hintRun;
    const step = (now) => {
      if (run !== hintRun) return;
      const target = Math.min(1, (now - begin) / duration) * total;
      let i = 1;
      while (i < st.length - 1 && lengths[i] < target) i++;
      const span = lengths[i] - lengths[i - 1] || 1;
      const t = Math.max(0, Math.min(1, (target - lengths[i - 1]) / span));
      const [a, b] = [st[i - 1], st[Math.min(i, st.length - 1)]];
      hintDot.setAttribute('cx', a[0] + (b[0] - a[0]) * t);
      hintDot.setAttribute('cy', a[1] + (b[1] - a[1]) * t);
      hintDot.setAttribute('visibility', 'visible');
      if (target < total) hintFrame = requestAnimationFrame(step);
      else setTimeout(() => { if (run === hintRun) hintDot.setAttribute('visibility', 'hidden'); }, 500);
    };
    hintFrame = requestAnimationFrame(step);
    say(session.guide, 'Regarde le point jaune, puis fais pareil avec ton doigt !');
  };
  // ↺ : on efface et on recommence le glyphe
  const restart = () => {
    if (session.locked || finished) return;
    current = 0;
    reached = 0;
    drawing = false;
    waitLift = false;
    inkLayer.replaceChildren();
    stopHint();
    if (lostMessage?.isConnected) ctx.feedback.replaceChildren();
    refresh();
  };

  // « Ton prénom » : le prénom par morceaux (il passe à la ligne après un espace ou un tiret),
  // la lettre à écrire encadrée et soulignée
  const parts = [{ letters: [], spaced: false }];
  [...(word || '')].forEach((ch, i) => {
    if (ch === ' ') parts.push({ letters: [], spaced: true });
    else {
      parts.at(-1).letters.push(h('span', { class: i === position ? 'on' : '' }, ch));
      if (ch === '-') parts.push({ letters: [], spaced: false });
    }
  });
  const middle = word
    ? h('span', { class: `trace-word${word.length > 10 ? ' long' : ''}`, role: 'img', 'aria-label': word },
      parts.filter((p) => p.letters.length)
        .map((p) => h('span', { class: `trace-word-part${p.spaced ? ' spaced' : ''}`, 'aria-hidden': 'true' }, p.letters)))
    : h('span', { class: 'trace-steps' }, steps);
  const zone = h('div', { class: 'choices trace-zone' },
    h('button', { class: 'trace-btn trace-hint', onclick: hint, 'aria-label': 'Aide : montre-moi le chemin' }, '💡'),
    middle,
    stepsLabel,
    h('button', { class: 'trace-btn trace-reset', onclick: restart, 'aria-label': 'Effacer et recommencer' }, '↺'));
  refresh();
  return { stage: h('div', { class: 'stage stage-trace' }, svg), zone };
}

// ---- Règle l'horloge : déplacer les aiguilles au doigt (ou avec les boutons), puis valider

function setClockZone(ctx) {
  const { q } = ctx;
  const target = toClockMinutes(q.target);
  let time = toClockMinutes(q.stage.start);
  const dial = h('div', { class: 'setclock-dial', role: 'img' });
  dial.innerHTML = clockSvg(q.stage.start.h, q.stage.start.m);
  const svg = dial.querySelector('svg');
  const svgEl = (tag, attrs) => {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  };
  // l'heure attendue en pointillés, montrée en indice après deux erreurs (sous les vraies aiguilles)
  const goal = handAngles(target);
  const hourHand = svg.querySelector('.hand-hour');
  const minuteHand = svg.querySelector('.hand-minute');
  hourHand.before(
    svgEl('line', { class: 'ghost-hand ghost-hour', x1: 50, y1: 50, x2: 50, y2: 29, transform: `rotate(${goal.hour} 50 50)` }),
    svgEl('line', { class: 'ghost-hand ghost-minute', x1: 50, y1: 50, x2: 50, y2: 13, transform: `rotate(${goal.minute} 50 50)` }));
  // une poignée au bout de chaque aiguille : on voit qu'on peut les attraper
  const hourKnob = svgEl('circle', { class: 'hand-knob knob-hour', cx: 50, cy: 29, r: 4 });
  const minuteKnob = svgEl('circle', { class: 'hand-knob knob-minute', cx: 50, cy: 13, r: 3.4 });
  hourHand.after(hourKnob);
  minuteHand.after(minuteKnob);

  const render = () => {
    const { hour, minute } = handAngles(time);
    for (const el of [hourHand, hourKnob]) el.setAttribute('transform', `rotate(${hour} 50 50)`);
    for (const el of [minuteHand, minuteKnob]) el.setAttribute('transform', `rotate(${minute} 50 50)`);
    const shown = fromClockMinutes(time);
    dial.dataset.h = shown.h;
    dial.dataset.m = shown.m;
    dial.setAttribute('aria-label', `Horloge à régler : elle montre ${clockLabel(shown.h, shown.m)}`);
  };
  const setTime = (next) => {
    if (ctx.session.locked || next === time) return;
    time = next;
    playSound('tap');
    render();
  };

  // au doigt (ou à la souris) : on attrape l'aiguille la plus proche et on la fait tourner
  let grabbed = null;
  const pointer = (e) => {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { angle: pointerAngle(p.x - 50, p.y - 50), radius: Math.hypot(p.x - 50, p.y - 50) };
  };
  const follow = (p) => setTime(grabbed === 'minute' ? dragMinuteHand(time, p.angle) : dragHourHand(time, p.angle));
  svg.addEventListener('pointerdown', (e) => {
    if (ctx.session.locked) return;
    const p = pointer(e);
    if (p.radius > 50 || p.radius < 4) return; // hors du cadran, ou au centre (pas de direction)
    e.preventDefault();
    grabbed = pickHand(time, p.angle, p.radius);
    dial.classList.add(`grab-${grabbed}`);
    try {
      svg.setPointerCapture(e.pointerId);
    } catch {
      // sans capture, le glisser marche tant que le doigt reste sur le cadran
    }
    follow(p);
  });
  svg.addEventListener('pointermove', (e) => {
    if (grabbed) follow(pointer(e));
  });
  const release = () => {
    grabbed = null;
    dial.classList.remove('grab-minute', 'grab-hour');
  };
  svg.addEventListener('pointerup', release);
  svg.addEventListener('pointercancel', release);

  const validate = () => {
    if (ctx.session.locked) return;
    if (time === target) {
      dial.classList.add('right');
      zone.classList.add('answered');
      markCorrect(ctx);
      return;
    }
    dial.classList.add('shake');
    setTimeout(() => dial.classList.remove('shake'), 400);
    // après deux erreurs, l'heure attendue est montrée (aiguilles en pointillés et texte)
    const hint = ctx.session.attempts >= 1;
    if (hint) dial.classList.add('show-hint');
    const advice = clockAdvice(time, target);
    const shown = fromClockMinutes(time);
    markWrong(ctx, {
      message: hint ? `Il faut ${q.answer} : suis les pointillés !` : advice,
      speech: hint ? `Il faut ${q.answerSpeech}. Mets les aiguilles sur les pointillés.` : advice,
      given: clockLabel(shown.h, shown.m),
    });
  };
  // les boutons, pour les petits doigts (et l'accessibilité) : l'heure et les minutes séparément
  const shiftButton = (minutes, label, aria) => h('button', {
    class: `clock-btn ${Math.abs(minutes) === 60 ? 'clock-btn-hour' : 'clock-btn-minute'}`,
    'data-shift': minutes,
    'aria-label': aria,
    onclick: () => setTime(shiftClock(time, minutes)),
  }, label);
  const zone = h('div', { class: 'choices setclock-zone' },
    h('div', { class: 'clock-btns' },
      shiftButton(-60, '−1 h', 'Reculer d’une heure'), shiftButton(60, '+1 h', 'Avancer d’une heure'),
      shiftButton(-5, '−5 min', 'Reculer de 5 minutes'), shiftButton(5, '+5 min', 'Avancer de 5 minutes')),
    h('button', { class: 'big-btn primary validate-btn', onclick: validate }, '✔ C’est l’heure'));
  render();
  return { stage: h('div', { class: 'stage stage-setclock' }, dial), zone };
}

// ---- Payer le bon prix : toucher les pièces et les billets

function payZone(ctx) {
  const { q } = ctx;
  const given = [];
  const total = () => given.reduce((a, b) => a + b, 0);
  const tray = h('div', { class: 'pay-tray', 'aria-live': 'polite' });
  const render = () => {
    tray.replaceChildren(...(given.length
      ? given.map((v, i) => h('button', {
        class: 'pay-coin',
        'aria-label': `Reprendre ${v} euros`,
        onclick: () => { given.splice(i, 1); render(); },
      }, moneyItem(v)))
      : [h('span', { class: 'pay-empty' }, 'Touche les pièces et les billets ↓')]));
  };
  const add = (v) => {
    if (ctx.session.locked || total() + v > 50) return;
    given.push(v);
    playSound('tap');
    render();
  };
  const validate = () => {
    if (ctx.session.locked) return;
    const t = total();
    if (t === q.answer) {
      zone.classList.add('answered');
      markCorrect(ctx);
      return;
    }
    markWrong(ctx, {
      message: t > q.answer ? `C’est trop : tu donnes ${t} €.` : `Il manque de l’argent : tu donnes ${t} €.`,
      given: `${t} €`,
    });
  };
  render();
  const zone = h('div', { class: 'choices pay' },
    tray,
    h('div', { class: 'pay-buttons' }, q.values.map((v) => h('button', { class: 'pay-add', 'data-pay': v, 'aria-label': `Ajouter ${v} euros`, onclick: () => add(v) }, moneyItem(v)))),
    h('button', { class: 'big-btn primary validate-btn', onclick: validate }, '✔ Je paie'));
  return zone;
}

// ---- Ranger dans l'ordre (tailles ou nombres)

function orderZone(ctx) {
  const { q } = ctx;
  // les éléments à placer ; ceux qui valent null sont des pièges (lettres en trop dans la dictée)
  const sorted = q.items.filter((it) => it.value !== null)
    .sort((a, b) => (q.order === 'desc' ? b.value - a.value : a.value - b.value));
  // dictée : deux lettres identiques sont interchangeables (on compare ce qui est écrit)
  const same = (a, b) => (q.byLabel ? a.label === b.label : a.value === b.value);
  let next = 0;
  const content = (item) => (item.emoji
    ? h('span', { class: 'order-emoji', style: { '--scale': item.scale } }, item.emoji)
    : item.label);
  const slots = sorted.map(() => h('span', { class: 'order-slot', ...(q.lang ? { lang: q.lang } : {}) }));
  const sign = q.sign ?? (q.items[0].emoji ? '→' : q.order === 'desc' ? '>' : '<');
  const lang = q.lang ? { lang: q.lang } : {};
  const buttons = q.items.map((item) => {
    const btn = h('button', {
      class: `order-item${item.emoji ? ' order-picture' : ''}`, 'data-value': String(item.value), 'data-label': item.label,
      'aria-label': item.label || `Taille ${item.value + 1}`, ...lang,
    }, content(item));
    btn.addEventListener('click', () => {
      if (ctx.session.locked || btn.disabled) return;
      if (item.value !== null && same(item, sorted[next])) {
        btn.disabled = true;
        btn.classList.add('placed');
        slots[next].replaceChildren(content(item));
        slots[next].classList.add('filled');
        buttons.forEach((b) => b.classList.remove('hint'));
        next++;
        playSound('tap');
        if (next === sorted.length) {
          zone.classList.add('answered');
          markCorrect(ctx);
        }
        return;
      }
      btn.classList.add('shake');
      setTimeout(() => btn.classList.remove('shake'), 400);
      const hint = ctx.session.attempts >= 1;
      if (hint) buttons.find((b, i) => !b.disabled && q.items[i].value !== null && same(q.items[i], sorted[next]))?.classList.add('hint');
      markWrong(ctx, { message: hint ? 'Touche celui qui brille !' : 'Essaie encore !', given: item.label || `taille ${item.value + 1}` });
    });
    return btn;
  });
  // des mots entiers (une phrase à remettre dans l'ordre) : écrits un peu plus petit
  const words = q.items.some((it) => (it.label || '').length > 2);
  const zone = h('div', { class: `choices order center${words ? ' words' : ''}` },
    h('div', { class: `order-slots n${slots.length}` }, slots.flatMap((slot, i) => (i && sign ? [h('span', { class: 'order-sign', 'aria-hidden': 'true' }, sign), slot] : [slot]))),
    h('div', { class: `order-items n${q.items.length}` }, buttons));
  return zone;
}

// ---- Labyrinthe : glisser le doigt, toucher une case, ou les flèches

/**
 * Les objets à ramasser (des clés) avant d'atteindre l'arrivée d'un labyrinthe : l'arrivée est
 * fermée (🔒) tant qu'il en reste. `solve(a, b)` donne le chemin de a à b.
 */
function mazeKeys(ctx, { items = [], goal, locked }, solve) {
  const left = new Set(items);
  let saidAt = 0;
  return {
    left,
    /** L'arrivée est-elle encore fermée ? (on le dit, mais pas à chaque mouvement du doigt) */
    blocked(target) {
      if (target !== goal || !left.size) return false;
      if (Date.now() - saidAt > 3000) {
        saidAt = Date.now();
        ctx.feedback.replaceChildren(h('p', { class: 'try-again' }, locked));
        say(ctx.session.guide, locked);
      }
      return true;
    },
    /** La case atteinte a-t-elle une clé ? Renvoie vrai si on vient de la ramasser. */
    collect(cell) {
      if (!left.delete(cell)) return false;
      playSound('tap');
      if (!left.size) ctx.feedback.replaceChildren();
      return true;
    },
    /** La prochaine étape : la clé la plus proche, ou l'arrivée quand on les a toutes. */
    pathFrom(pos) {
      const paths = [...left].map((c) => solve(pos, c));
      return paths.length ? paths.reduce((a, b) => (b.length < a.length ? b : a)) : solve(pos, goal);
    },
  };
}

function mazeZone(ctx) {
  const { q } = ctx;
  const { cols, rows, open, start, goal, hero, goalEmoji, items = [], itemEmoji } = q.stage;
  let pos = start;
  const keys = mazeKeys(ctx, q.stage, (a, b) => solveMaze(open, cols, a, b));
  const cells = open.map((bits, i) => h('div', {
    class: ['maze-cell', ...['n', 'e', 's', 'w'].filter((_, k) => !(bits & (1 << k))).map((d) => `wall-${d}`)].join(' '),
    'data-cell': i,
  }));
  cells[goal].append(h('span', { class: 'maze-goal', 'aria-hidden': 'true' }, goalEmoji));
  const lock = items.length ? h('span', { class: 'maze-lock', 'aria-hidden': 'true' }, '🔒') : null;
  if (lock) cells[goal].append(lock);
  const itemEls = new Map(items.map((c) => [c, h('span', { class: 'maze-item', 'aria-hidden': 'true' }, itemEmoji)]));
  for (const [c, el] of itemEls) cells[c].append(el);
  cells[start].classList.add('maze-start');
  const heroEl = h('span', { class: 'maze-hero', 'aria-hidden': 'true' }, hero);
  const grid = h('div', {
    class: 'maze',
    role: 'img',
    'aria-label': `Labyrinthe de ${cols} cases sur ${rows}${items.length ? `, avec ${items.length} clés à ramasser` : ''}`,
    style: { '--cols': cols, '--rows': rows },
  }, cells);
  const place = () => {
    cells[pos].append(heroEl);
    cells.forEach((c, i) => c.classList.toggle('here', i === pos));
  };
  const bump = () => {
    heroEl.classList.remove('bump');
    void heroEl.offsetWidth; // relance l'animation
    heroEl.classList.add('bump');
  };
  const moveTo = (target) => {
    if (ctx.session.locked || !canMove(open, cols, pos, target)) return false;
    if (keys.blocked(target)) {
      bump();
      return false;
    }
    cells[pos].classList.add('trail');
    pos = target;
    place();
    cells[pos].classList.remove('hint');
    if (keys.collect(pos)) {
      itemEls.get(pos).remove();
      if (!keys.left.size) lock?.remove();
    }
    if (pos === goal) {
      grid.classList.add('solved');
      zone.classList.add('answered');
      markCorrect(ctx);
    }
    return true;
  };
  // Toucher une case : on avance en ligne droite tant qu'il n'y a pas de mur.
  const slideTo = (target, quiet = false) => {
    if (target === pos) return;
    const [px, py, tx, ty] = [pos % cols, Math.floor(pos / cols), target % cols, Math.floor(target / cols)];
    if (px !== tx && py !== ty) return quiet ? null : bump();
    const step = px === tx ? (ty > py ? cols : -cols) : (tx > px ? 1 : -1);
    for (let c = pos; c !== target; c += step) if (!canMove(open, cols, c, c + step)) return quiet ? null : bump();
    while (pos !== target && moveTo(pos + step));
  };
  const cellAt = (e) => {
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('.maze-cell');
    return el && grid.contains(el) ? Number(el.dataset.cell) : null;
  };
  let dragging = false;
  grid.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    dragging = true;
    grid.setPointerCapture?.(e.pointerId);
    const cell = cellAt(e);
    if (cell !== null) slideTo(cell);
  });
  grid.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const cell = cellAt(e);
    if (cell !== null) slideTo(cell, true);
  });
  for (const type of ['pointerup', 'pointercancel']) grid.addEventListener(type, () => { dragging = false; });
  place();

  const arrow = (label, symbol, delta) => h('button', {
    class: 'maze-arrow',
    'aria-label': label,
    onclick: () => { if (!moveTo(pos + delta)) bump(); },
  }, symbol);
  // L'indice montre les 3 prochaines cases (vers la clé la plus proche, s'il en reste) ;
  // il compte comme une aide (pas d'étoile « du premier coup »).
  const hint = () => {
    if (ctx.session.locked) return;
    ctx.session.attempts++;
    keys.pathFrom(pos).slice(1, 4).forEach((c) => cells[c].classList.add('hint'));
    say(ctx.session.guide, 'Suis les étoiles !');
  };
  const zone = h('div', { class: 'choices maze-controls' },
    arrow('Gauche', '←', -1), arrow('Haut', '↑', -cols), arrow('Bas', '↓', cols), arrow('Droite', '→', 1),
    h('button', { class: 'maze-arrow maze-hint', 'aria-label': 'Indice', onclick: hint }, '💡'));
  return { stage: h('div', { class: 'stage stage-maze' }, grid), zone };
}

// ---- Labyrinthe rond : des anneaux découpés en cases ; glisser le doigt ou toucher une case

function roundMazeZone(ctx) {
  const { q } = ctx;
  const { sectors, links, start, goal, door, hero, goalEmoji, items = [], itemEmoji } = q.stage;
  const rings = sectors.length - 1;
  const offsets = ringOffsets(sectors);
  const T = 10; // épaisseur d'un anneau (et rayon de la case du centre), en unités du dessin
  const R = (rings + 1) * T;
  const V = R + 2; // marge pour le trait du bord
  const linked = (a, b) => links[a].includes(b);
  const solve = (a, b) => solveLinks(links, a, b);
  const keys = mazeKeys(ctx, q.stage, solve);
  let pos = start;

  // géométrie : angle en fraction de tour, depuis midi, dans le sens des aiguilles d'une montre
  const point = (rho, a) => [rho * Math.sin(2 * Math.PI * a), -rho * Math.cos(2 * Math.PI * a)];
  const f = (n) => n.toFixed(2);
  const arc = (rho, a0, a1) => {
    const [x0, y0] = point(rho, a0);
    const [x1, y1] = point(rho, a1);
    return `M${f(x0)} ${f(y0)}A${rho} ${rho} 0 ${a1 - a0 > 0.5 ? 1 : 0} 1 ${f(x1)} ${f(y1)}`;
  };
  const radial = (rho0, rho1, a) => {
    const [x0, y0] = point(rho0, a);
    const [x1, y1] = point(rho1, a);
    return `M${f(x0)} ${f(y0)}L${f(x1)} ${f(y1)}`;
  };
  const ringOf = (cell) => polarCell(sectors, cell);
  const centreOf = (cell) => {
    const { ring, index } = ringOf(cell);
    return ring ? point((ring + 0.5) * T, (index + 0.5) / sectors[ring]) : [0, 0];
  };

  // les murs : pour chaque case, le mur côté centre et le mur suivant dans le sens des aiguilles
  let walls = '';
  for (let r = 1; r <= rings; r++) {
    const s = sectors[r];
    for (let i = 0; i < s; i++) {
      const cell = offsets[r] + i;
      const inner = offsets[r - 1] + Math.floor((i * sectors[r - 1]) / s);
      if (!linked(cell, inner)) walls += arc(r * T, i / s, (i + 1) / s);
      if (!linked(cell, offsets[r] + ((i + 1) % s))) walls += radial(r * T, (r + 1) * T, (i + 1) / s);
      // le bord, ouvert devant l'entrée (ou la sortie)
      if (r === rings && cell !== door) walls += arc(R, i / s, (i + 1) / s);
    }
  }
  const svgEl = (tag, attrs) => {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  };
  const svg = svgEl('svg', { class: 'rmaze-svg', viewBox: `${-V} ${-V} ${2 * V} ${2 * V}`, 'aria-hidden': 'true' });
  const trail = svgEl('g', { class: 'rmaze-trail' });
  const hints = svgEl('g', { class: 'rmaze-hints' });
  svg.append(
    svgEl('circle', { class: 'rmaze-floor', r: R }),
    svgEl('circle', { class: 'rmaze-centre', r: T }),
    trail, hints,
    svgEl('path', { class: 'rmaze-walls', d: walls }),
  );
  // le personnage, l'arrivée et les clés : des émojis posés par-dessus le dessin
  const at = (el, cell) => {
    const [x, y] = centreOf(cell);
    el.style.left = `${((x + V) / (2 * V)) * 100}%`;
    el.style.top = `${((y + V) / (2 * V)) * 100}%`;
    return el;
  };
  const token = (cls, emoji, cell) => at(h('span', { class: `rmaze-token ${cls}`, 'aria-hidden': 'true' }, emoji), cell);
  const heroEl = token('rmaze-hero', hero, start);
  const lock = items.length ? token('rmaze-lock', '🔒', goal) : null;
  const itemEls = new Map(items.map((c) => [c, token('rmaze-item', itemEmoji, c)]));
  const board = h('div', {
    class: 'rmaze',
    role: 'img',
    'aria-label': `Labyrinthe rond de ${rings} anneaux${items.length ? ', avec une clé à ramasser' : ''}`,
    style: { '--cell': (100 * T) / (2 * V) },
  }, svg, token('rmaze-goal', goalEmoji, goal), lock, [...itemEls.values()], heroEl);

  const bump = () => {
    heroEl.classList.remove('bump');
    void heroEl.offsetWidth; // relance l'animation
    heroEl.classList.add('bump');
  };
  const clearHint = (cell) => hints.querySelectorAll(`[data-cell="${cell}"]`).forEach((n) => n.remove());
  const moveTo = (target) => {
    if (ctx.session.locked || !linked(pos, target)) return false;
    if (keys.blocked(target)) {
      bump();
      return false;
    }
    const [x, y] = centreOf(pos);
    trail.append(svgEl('circle', { cx: f(x), cy: f(y), r: T * 0.16 }));
    pos = target;
    at(heroEl, pos);
    clearHint(pos);
    if (keys.collect(pos)) {
      itemEls.get(pos).remove();
      if (!keys.left.size) lock?.remove();
    }
    if (pos === goal) {
      board.classList.add('solved');
      zone.classList.add('answered');
      markCorrect(ctx);
    }
    return true;
  };
  // Les cases entre deux cases « en ligne droite » : le long d'un anneau (dans un sens ou dans
  // l'autre), ou le long d'un rayon. null si elles ne sont pas alignées.
  const straightLine = (from, to) => {
    const a = ringOf(from);
    const b = ringOf(to);
    if (a.ring === b.ring) {
      const s = sectors[a.ring];
      const lines = [1, -1].map((dir) => {
        const cells = [from];
        for (let i = a.index; i !== b.index;) {
          i = (i + dir + s) % s;
          cells.push(offsets[a.ring] + i);
        }
        return cells;
      }).filter((cells) => cells.every((c, k) => !k || linked(cells[k - 1], c)));
      return lines.sort((x, y) => x.length - y.length)[0] || null;
    }
    // le long d'un rayon : l'angle de la case la plus éloignée du centre
    const outer = a.ring > b.ring ? a : b;
    const angle = (outer.index + 0.5) / sectors[outer.ring];
    const step = b.ring > a.ring ? 1 : -1;
    const cells = [];
    for (let r = a.ring; r !== b.ring + step; r += step) cells.push(offsets[r] + Math.floor(angle * sectors[r]));
    return cells[0] === from && cells.at(-1) === to ? cells : null;
  };
  // Toucher une case : on y va si elle est en ligne droite sans mur ; en glissant le doigt, on suit
  // aussi le chemin s'il fait un coude (3 pas au plus), pour ne pas rester bloqué si le doigt va vite.
  const slideTo = (target, quiet = false) => {
    if (target === pos) return;
    let cells = straightLine(pos, target);
    if (cells && !cells.every((c, k) => !k || linked(cells[k - 1], c))) cells = null;
    if (!cells && quiet) {
      const path = solve(pos, target);
      if (path.length && path.length <= 4) cells = path;
    }
    if (!cells) return quiet ? null : bump();
    for (const c of cells.slice(1)) if (!moveTo(c)) break;
  };
  const cellAt = (e) => {
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 * V - V;
    const y = ((e.clientY - rect.top) / rect.height) * 2 * V - V;
    const rho = Math.hypot(x, y);
    let ring = Math.floor(rho / T);
    if (ring > rings) {
      if (rho > R + T / 2) return null;
      ring = rings; // juste au bord : la case du bord
    }
    if (ring === 0) return 0;
    const angle = ((Math.atan2(x, -y) / (2 * Math.PI)) + 1) % 1;
    return offsets[ring] + (Math.floor(angle * sectors[ring]) % sectors[ring]);
  };
  let dragging = false;
  board.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    dragging = true;
    board.setPointerCapture?.(e.pointerId);
    const cell = cellAt(e);
    if (cell !== null) slideTo(cell);
  });
  board.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const cell = cellAt(e);
    if (cell !== null) slideTo(cell, true);
  });
  for (const type of ['pointerup', 'pointercancel']) board.addEventListener(type, () => { dragging = false; });

  // L'indice montre les 3 prochaines cases ; il compte comme une aide (pas d'étoile « du premier coup »).
  const hint = () => {
    if (ctx.session.locked) return;
    ctx.session.attempts++;
    for (const c of keys.pathFrom(pos).slice(1, 4)) {
      clearHint(c);
      const [x, y] = centreOf(c);
      const star = svgEl('text', { x: f(x), y: f(y), 'data-cell': c, 'font-size': T * 0.55 });
      star.textContent = '⭐';
      hints.append(star);
    }
    say(ctx.session.guide, 'Suis les étoiles !');
  };
  const zone = h('div', { class: 'choices rmaze-controls' },
    h('button', { class: 'maze-arrow maze-hint', 'aria-label': 'Indice', onclick: hint }, '💡'));
  return { stage: h('div', { class: 'stage stage-maze stage-rmaze' }, board), zone };
}

// ---- Chemin des nombres ou des lettres : toucher les cases dans l'ordre

function pathZone(ctx) {
  const { q } = ctx;
  const { cols, rows, cells: values, path, seq, spell, picture } = q.stage;
  let step = 1; // la première case est déjà allumée
  const trail = document.createElementNS(SVG_NS, 'svg');
  trail.setAttribute('class', 'path-trail');
  trail.setAttribute('viewBox', `0 0 ${cols} ${rows}`);
  trail.setAttribute('aria-hidden', 'true');
  const line = document.createElementNS(SVG_NS, 'polyline');
  trail.append(line);
  const drawTrail = () => line.setAttribute('points',
    path.slice(0, step).map((c) => `${(c % cols) + 0.5},${Math.floor(c / cols) + 0.5}`).join(' '));
  const buttons = values.map((v, i) => h('button', { class: 'path-cell', 'data-cell': i, 'data-value': String(v) }, String(v)));
  buttons[path[0]].classList.add('done', 'start');
  buttons[path.at(-1)].classList.add('finish');
  const slots = spell ? seq.map((l, i) => h('span', { class: i === 0 ? 'spell-slot filled' : 'spell-slot' }, i === 0 ? l : '')) : null;
  buttons.forEach((btn, i) => btn.addEventListener('click', () => {
    if (ctx.session.locked || btn.classList.contains('done')) return;
    if (i === path[step]) {
      btn.classList.add('done');
      buttons.forEach((b) => b.classList.remove('hint'));
      if (slots) {
        slots[step].textContent = seq[step];
        slots[step].classList.add('filled');
      }
      step++;
      drawTrail();
      playSound('tap');
      if (typeof seq[0] === 'number' && step < path.length) say(ctx.session.guide, { text: String(values[i]), rate: 1.05 });
      if (step === path.length) {
        zone.classList.add('answered');
        markCorrect(ctx);
      }
      return;
    }
    btn.classList.add('shake');
    setTimeout(() => btn.classList.remove('shake'), 400);
    const hint = ctx.session.attempts >= 1;
    if (hint) buttons[path[step]].classList.add('hint');
    markWrong(ctx, { message: hint ? 'Touche celle qui brille !' : 'Essaie encore !', given: String(values[i]) });
  }));
  drawTrail();
  const grid = h('div', { class: `path-grid${spell ? ' spell' : ''}`, style: { '--cols': cols, '--rows': rows } }, trail, buttons);
  const top = spell
    ? h('div', { class: 'spell-top' },
      picture ? h('button', { class: 'spell-picture', onclick: () => say(ctx.session.guide, q.replay), 'aria-label': 'Réécouter le mot' }, picture) : null,
      h('div', { class: 'spell-word', 'aria-hidden': 'true' }, slots))
    : null;
  const zone = h('div', { class: 'choices path-zone' }, grid);
  return { stage: top ? h('div', { class: 'stage stage-path' }, top) : null, zone };
}

// ---- Faire des patates : entourer des paquets au doigt (ou toucher les objets un par un)

function pointInPolygon([x, y], polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function lassoZone(ctx) {
  const { q } = ctx;
  const { emoji, many, count, group, cols, rows, positions } = q.stage;
  const needed = Math.floor(count / group);
  const grouped = new Set();
  let groups = 0;
  let picked = [];
  const guide = ctx.session.guide;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'lasso-lines');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  // une marge de 5 % tout autour : aucun objet ne touche le bord du cadre
  const spot = positions.map((p) => [5 + p.x * 0.9, 5 + p.y * 0.9]);
  const objects = spot.map(([x, y], i) => h('span', { class: 'lasso-object', 'data-i': i, style: { left: `${x}%`, top: `${y}%` } }, emoji));
  const field = h('div', { class: 'lasso-field', role: 'img', 'aria-label': `${count} ${many}`, style: { '--cols': cols, '--rows': rows } }, svg, objects);
  const help = h('p', { class: 'lasso-help' }, `Entoure ${group} ${emoji} avec ton doigt, ou touche-les un par un.`);
  const zone = h('div', { class: 'choices lasso-zone' }, help);

  const newPath = (cls) => {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('class', cls);
    path.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.append(path);
    return path;
  };
  const pathData = (pts, closed) => `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')}${closed ? ' Z' : ''}`;
  const tell = (message) => {
    ctx.feedback.replaceChildren(h('p', { class: 'try-again' }, message));
    say(guide, message);
  };
  const askTotal = () => {
    const rest = count - groups * group;
    field.classList.add('done');
    const summary = `${groups === 1 ? 'Un paquet' : `${groups} paquets`} de ${group}${rest ? ` et ${rest} tout seul${rest > 1 ? 's' : ''}` : ''}.`;
    const bubble = app.querySelector('.instruction .bubble');
    if (bubble) bubble.textContent = 'Combien en tout ?';
    ctx.feedback.replaceChildren();
    zone.replaceChildren(h('p', { class: 'lasso-summary' }, summary), choiceZone(ctx));
    say(guide, `${summary} Combien y en a-t-il en tout ?`);
  };
  const closeGroup = (members, outline) => {
    const color = PAIR_COLORS[groups % PAIR_COLORS.length];
    groups++;
    for (const i of members) {
      grouped.add(i);
      objects[i].classList.remove('picked');
      objects[i].classList.add('grouped');
      objects[i].style.setProperty('--pair', color);
      objects[i].dataset.group = groups;
      delete objects[i].dataset.n;
    }
    if (outline) {
      outline.setAttribute('class', 'patate done');
      outline.style.stroke = color;
      outline.style.fill = `${color}22`;
    }
    picked = [];
    playSound('tap');
    ctx.feedback.replaceChildren();
    if (groups === needed) askTotal();
    else say(guide, `${groups === 1 ? 'Un paquet' : `${groups} paquets`} !`);
  };
  const togglePick = (i) => {
    if (grouped.has(i)) return;
    if (picked.includes(i)) {
      picked = picked.filter((x) => x !== i);
      objects[i].classList.remove('picked');
      delete objects[i].dataset.n;
    } else {
      picked.push(i);
      objects[i].classList.add('picked');
    }
    picked.forEach((x, n) => { objects[x].dataset.n = n + 1; });
    if (picked.length === group) closeGroup(picked, null);
  };

  let points = null;
  let live = null;
  const norm = (e) => {
    const r = field.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100];
  };
  field.addEventListener('pointerdown', (e) => {
    if (ctx.session.locked || groups === needed) return;
    e.preventDefault();
    field.setPointerCapture?.(e.pointerId);
    points = [norm(e)];
    live = newPath('patate live');
  });
  field.addEventListener('pointermove', (e) => {
    if (!points) return;
    const p = norm(e);
    const last = points.at(-1);
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 1.5) return;
    points.push(p);
    live.setAttribute('d', pathData(points, false));
  });
  field.addEventListener('pointerup', (e) => {
    if (!points) return;
    const pts = points;
    points = null;
    let length = 0;
    for (let i = 1; i < pts.length; i++) length += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (length < 15) {
      // un simple toucher : on choisit l'objet touché
      live.remove();
      const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('.lasso-object');
      if (target && field.contains(target)) togglePick(Number(target.dataset.i));
      return;
    }
    live.setAttribute('d', pathData(pts, true));
    const inside = spot.map((_, i) => i).filter((i) => !grouped.has(i) && pointInPolygon(spot[i], pts));
    if (inside.length === group) {
      picked.forEach((i) => { objects[i].classList.remove('picked'); delete objects[i].dataset.n; });
      picked = [];
      closeGroup(inside, live);
      return;
    }
    live.setAttribute('class', 'patate wrong');
    const wrongPath = live;
    setTimeout(() => wrongPath.remove(), 700);
    tell(inside.length === 0
      ? `Entoure ${group} ${many} avec ton doigt.`
      : `Il en faut ${group} dans une patate. Tu en as entouré ${inside.length}.`);
  });
  field.addEventListener('pointercancel', () => {
    points = null;
    live?.remove();
  });
  return { stage: h('div', { class: 'stage stage-lasso' }, field), zone };
}

// ---- Le panier : fabriquer une collection

function buildZone(ctx) {
  const { q } = ctx;
  const { items, tens, perRow, limit } = q.stage;
  const mixed = items.length > 1;
  const counts = items.map(() => 0); // fruits posés un par un, par sorte
  let bags = 0; // sachets de 10 (un seul fruit)
  const basket = h('div', { class: `basket per-${perRow}${mixed ? ' mixed' : ''}` });
  const counter = h('p', { class: 'basket-count', hidden: true });
  const amount = (i) => counts[i] + (i === 0 ? 10 * bags : 0);
  const render = () => {
    basket.replaceChildren(
      ...Array.from({ length: bags }, () => h('button', {
        class: 'bag-item',
        'aria-label': 'Enlever un sachet de 10',
        onclick: () => { bags--; render(); },
      }, Array.from({ length: 10 }, () => h('span', {}, items[0].emoji)))),
      ...items.map((item, i) => (counts[i] || !mixed
        ? h('div', { class: 'basket-singles' }, Array.from({ length: counts[i] }, () => h('button', {
          class: 'basket-item',
          'data-fruit': i,
          'aria-label': `Enlever ${item.one}`,
          onclick: () => { counts[i]--; render(); },
        }, item.emoji)))
        : null)));
    if (!bags && counts.every((c) => !c)) basket.append(h('span', { class: 'basket-empty' }, '🧺'));
    const parts = items.map((item, i) => `${amount(i)} ${item.emoji}`);
    counter.textContent = `Tu as mis ${parts.length > 1 ? `${parts.slice(0, -1).join(', ')} et ${parts.at(-1)}` : parts[0]}.`;
  };
  const add = (i, n = 1) => {
    if (ctx.session.locked || amount(i) + n > limit) return;
    if (n === 10) bags++;
    else counts[i]++;
    render();
  };
  const validate = () => {
    if (ctx.session.locked) return;
    const wrong = items.findIndex((item, i) => amount(i) !== item.target);
    if (wrong === -1) {
      zone.classList.add('answered');
      markCorrect(ctx);
      return;
    }
    const item = items[wrong];
    const tooMany = amount(wrong) > item.target;
    let message = tooMany ? 'Il y en a trop !' : 'Il en manque !';
    if (mixed) message = tooMany ? `Il y a trop de ${item.many} !` : `Il manque des ${item.many} !`;
    if (ctx.session.attempts >= 1) counter.hidden = false;
    markWrong(ctx, { message, given: items.map((it, i) => `${amount(i)} ${it.many}`).join(', ') });
  };
  render();
  // la liste de courses en images, pour les enfants qui ne lisent pas encore
  const list = mixed
    ? h('div', { class: 'shopping-list', 'aria-hidden': 'true' },
      items.map((item) => h('span', { class: 'shopping-item' }, h('b', {}, item.target), ' ', item.emoji)))
    : null;
  const zone = h('div', { class: 'choices build' },
    h('div', { class: 'build-buttons' },
      items.map((item, i) => h('button', {
        class: 'add-btn',
        'data-add': '1',
        'data-fruit': i,
        'aria-label': `Ajouter ${item.one}`,
        onclick: () => add(i),
      }, h('span', { class: 'add-emoji' }, item.emoji), '+1')),
      tens ? h('button', { class: 'add-btn bag', 'data-add': '10', onclick: () => add(0, 10) }, h('span', { class: 'add-emoji' }, '🛍️'), '+10') : null),
    h('button', { class: 'big-btn primary validate-btn', onclick: validate }, '✔ J’ai fini'));
  return { stage: h('div', { class: 'stage stage-build' }, list, basket, counter), zone };
}

// ---- Fin de partie

function finishSession(session) {
  if (session.duo) return finishDuo(session);
  const { game } = session;
  const kid = child();
  const stars = starsFor(session.correct, session.total);
  const before = kid.stars;
  kid.stars += stars;
  const stats = gameStats(kid, game.id, session.min);
  kid.games[game.id] = { ...stats, sessions: stats.sessions + 1, bestStars: Math.max(stats.bestStars, stars) };
  let palierLine = null;
  let dailyLine = null;
  if (game.id === 'defi') {
    const firstToday = kid.daily?.last !== dayKey();
    if (firstToday) {
      const streak = kid.daily?.last === dayKey(-1) ? (kid.daily.streak || 0) + 1 : 1;
      kid.daily = { last: dayKey(), streak, best: Math.max(streak, kid.daily?.best || 0) };
      kid.stars += 1; // une étoile bonus par jour
    }
    dailyLine = h('p', { class: 'daily-result' }, `🔥 ${kid.daily.streak} jour${kid.daily.streak > 1 ? 's' : ''} d’affilée`,
      firstToday ? h('b', {}, ' · +1 ⭐') : null);
  }
  if (game.paliers) {
    const palier = CALC_PALIERS[session.levelState.level - 1];
    const previous = kid.paliers[palier.id]?.stars || 0;
    const now = palierStarsAfter(previous, session.correct, session.total);
    kid.paliers[palier.id] = { stars: now, sessions: (kid.paliers[palier.id]?.sessions || 0) + 1 };
    palierLine = h('p', { class: 'palier-result' },
      `Palier ${palier.op}${palier.max} : `,
      h('span', { class: 'palier-stars' }, Array.from({ length: PALIER_MAX_STARS }, (_, i) => h('span', { class: i < now ? 'pstar on' : 'pstar' }, '★'))),
      now > previous ? h('b', {}, ' +1 !') : null);
  }
  // défi chrono : le temps, le record du niveau (battu ou non) et le niveau du prochain défi
  let chronoLine = null;
  let chronoSpeech = [];
  let newRecord = false;
  if (game.timed && session.chronoStart) {
    const level = session.levelState.level;
    const seconds = Math.max(1, chronoNow(session));
    const record = recordAfter(kid.records, game.id, level, seconds);
    kid.records = record.records;
    newRecord = record.isNew;
    const next = chronoLevelAfter(level, session.correct, session.total, session.min, session.max);
    kid.games[game.id] = { ...kid.games[game.id], level: next, streak: 0, recent: [] };
    chronoLine = h('div', { class: 'chrono-result' },
      h('p', { class: 'chrono-time' }, frenchSpacing('⏱ Ton temps : '), h('b', {}, formatChrono(seconds))),
      record.isNew
        ? h('p', { class: 'chrono-record new' }, frenchSpacing('🏆 Nouveau record !'))
        : h('p', { class: 'chrono-record' }, frenchSpacing('🏅 Ton record : '), h('b', {}, formatChrono(record.best))),
      record.isNew && record.previous ? h('p', { class: 'chrono-before' }, frenchSpacing(`Ancien record : ${formatChrono(record.previous)}`)) : null,
      next > level ? h('p', { class: 'chrono-next' }, frenchSpacing('🚀 Prêt pour le niveau suivant !')) : null);
    chronoSpeech = [`Ton temps : ${spokenChrono(seconds)}.`, record.isNew ? 'Nouveau record !' : `Ton record : ${spokenChrono(record.best)}.`];
  }
  logSession(kid, {
    at: new Date().toISOString(),
    game: game.id,
    level: session.levelState.level,
    correct: session.correct,
    total: session.total,
    stars,
    seconds: Math.round((Date.now() - session.startedAt) / 1000),
  });
  save();
  const unlocked = newStickers(before, kid.stars);
  const title = stars === 3 ? `Bravo ${me().name} !` : stars === 2 ? `Très bien ${me().name} !` : `Bien joué ${me().name} !`;

  show(h('main', { class: `screen results domain-theme-${game.domain}` },
    cornerActions(),
    confetti(newRecord ? 3 : stars),
    h('div', { class: 'duo duo-results' }, avatar(me().id, 'avatar-md cheer')),
    h('div', { class: 'result-stars', 'aria-label': `${stars} étoiles sur 3` },
      [1, 2, 3].map((i) => h('span', { class: i <= stars ? 'big-star on' : 'big-star', style: { animationDelay: `${i * 0.25}s` } }, '⭐'))),
    h('h1', {}, frenchSpacing(title)),
    h('p', { class: 'result-detail' }, `${session.correct} sur ${session.total} du premier coup`),
    chronoLine,
    palierLine,
    dailyLine,
    unlocked.length
      ? h('div', { class: 'new-sticker' }, h('span', { class: 'sticker-big' }, unlocked.at(-1).emoji), h('p', {}, 'Nouvel autocollant !'))
      : null,
    h('div', { class: 'result-actions' },
      // Rejouer : le même palier, ou le même niveau du défi chrono (pour battre son record)
      h('button', { class: 'big-btn primary', onclick: () => startSession(game, { level: game.paliers || game.timed ? session.levelState.level : undefined, back: session.back, total: game.id === 'defi' ? session.total : undefined }) }, '🔁 Rejouer'),
      stars >= 2 ? h('button', { class: 'big-btn bonus-btn', 'data-bonus-open': '', onclick: () => bonusMenu(session.back) }, '🎁 Jeu bonus') : null,
      h('button', { class: 'big-btn', onclick: session.back }, game.paliers ? '🗺️ Les paliers' : '🎲 Autres jeux'))));
  playSound(newRecord ? 'record' : 'fanfare'); // une fanfare plus longue pour un record battu
  say(me(), [
    `${title} ${stars} étoile${stars > 1 ? 's' : ''} !`,
    ...chronoSpeech,
    ...(unlocked.length ? [`Nouvel autocollant : ${unlocked.at(-1).name} !`] : []),
  ]);
}

function confetti(stars) {
  const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#b980f0'];
  return h('div', { class: 'confetti', 'aria-hidden': 'true' },
    Array.from({ length: stars * 12 }, () => h('span', {
      style: {
        left: `${randInt(rng, 0, 100)}%`,
        background: pick(rng, colors),
        animationDelay: `${rng() * 0.8}s`,
        animationDuration: `${1.8 + rng() * 1.5}s`,
      },
    })));
}

// ---------------------------------------------------------------- Album

function albumScreen() {
  const unlocked = stickersUnlocked(child().stars);
  const remaining = starsToNextSticker(child().stars);
  show(h('main', { class: 'screen album' },
    topBar({ onBack: homeScreen, title: '🏆 Mon album', right: starCounter() }),
    h('button', { class: 'big-btn dress-btn', onclick: () => characterScreen() }, '🎨 Habiller mon personnage'),
    h('p', { class: 'album-info' }, remaining === null
      ? 'Bravo, ton album est complet !'
      : frenchSpacing(`Encore ${remaining} ⭐ !`)),
    h('div', { class: 'sticker-grid' },
      STICKERS.map((s, i) => (i < unlocked
        ? h('button', { class: 'sticker', onclick: () => speak(s.name), 'aria-label': s.name }, s.emoji)
        : h('span', { class: 'sticker locked', 'aria-label': 'À gagner' }, '?'))))));
  speak(remaining === null ? 'Bravo, ton album est complet !' : `Encore ${remaining} étoile${remaining > 1 ? 's' : ''} pour le prochain autocollant.`);
}

// ---------------------------------------------------------------- Habiller son personnage

/** Couleurs de tee-shirt et accessoires : l'enfant choisit librement, sans attendre d'avoir des étoiles. */
function characterScreen() {
  const kid = child();
  const style = kid.style || {};
  const choose = (patch) => {
    kid.style = { ...style, ...patch };
    save();
    applySettings();
    characterScreen();
    playSound('success');
  };
  show(h('main', { class: 'screen dress' },
    topBar({ onBack: homeScreen, title: '🎨 Mon personnage', right: starCounter() }),
    h('div', { class: 'dress-preview' }, avatar(store.active, 'avatar-xl')),
    kid.photo ? h('p', { class: 'muted small dress-note' }, 'Avec une photo, seuls les accessoires se voient.') : null,
    h('section', { class: 'card' },
      h('h2', {}, 'Mon tee-shirt'),
      h('div', { class: 'shirt-row' }, SHIRTS.map((shirt) => h('button', {
        class: `shirt-btn${style.shirt === shirt.id ? ' on' : ''}`,
        'data-shirt': shirt.id,
        'aria-label': `Tee-shirt ${shirt.id}`,
        'aria-pressed': String(style.shirt === shirt.id),
        onclick: () => choose({ shirt: shirt.id }),
      }, h('span', { class: 'shirt-swatch', style: { background: shirt.color } }, style.shirt === shirt.id ? '✓' : ''))))),
    h('section', { class: 'card' },
      h('h2', {}, 'Mes accessoires'),
      h('div', { class: 'accessory-grid' },
        h('button', { class: `accessory-btn${!style.accessory ? ' on' : ''}`, onclick: () => choose({ accessory: null }), 'aria-pressed': String(!style.accessory) },
          h('span', { class: 'accessory-emoji' }, '🚫'), h('span', {}, 'Rien')),
        ACCESSORIES.map((item) => h('button', {
          class: `accessory-btn${style.accessory === item.id ? ' on' : ''}`,
          'data-accessory': item.id,
          'aria-pressed': String(style.accessory === item.id),
          onclick: () => choose({ accessory: item.id }),
        }, h('span', { class: 'accessory-emoji' }, item.emoji), h('span', {}, item.label)))))));
  speak('Choisis ton tee-shirt et tes accessoires !');
}

// ---------------------------------------------------------------- Jeux bonus (récompenses)

function bonusMenu(back) {
  show(h('main', { class: 'screen bonus' },
    topBar({ onBack: back, title: '🎁 Jeu bonus', right: starCounter() }),
    h('p', { class: 'album-info' }, 'Choisis ton jeu bonus !'),
    h('div', { class: 'bonus-grid' },
      [['bulles', '🫧', 'Les bulles', bubblesGame], ['puzzle', '🧩', 'Le puzzle', puzzleGame], ['coloriage', '🎨', 'Le coloriage', coloringGame]]
        .map(([id, icon, label, run]) => h('button', { class: 'game-card bonus-card', 'data-bonus': id, onclick: () => run(back) },
          h('span', { class: 'game-icon', 'aria-hidden': 'true' }, icon), h('span', { class: 'game-title' }, label))))));
  speak('Choisis ton jeu bonus !');
}

/** Éclate les bulles qui montent, pendant 20 secondes. */
function bubblesGame(back) {
  let popped = 0;
  let left = 20;
  const field = h('div', { class: 'bubble-field' });
  const score = h('span', { class: 'bubble-score', 'aria-live': 'polite' }, '0');
  const clock = h('span', { class: 'bubble-clock' }, '20 s');
  const spawn = () => {
    const b = h('button', {
      class: 'pop-bubble',
      'aria-label': 'Bulle',
      style: { left: `${5 + Math.random() * 80}%`, animationDuration: `${4 + Math.random() * 3}s`, '--hue': Math.floor(Math.random() * 360) },
    }, pick(rng, ['⭐', '🐟', '🍎', '🌸', '🦋', '']));
    b.addEventListener('pointerdown', () => {
      if (b.classList.contains('popped')) return;
      b.classList.add('popped');
      popped++;
      score.textContent = String(popped);
      playSound('tap');
      setTimeout(() => b.remove(), 250);
    });
    b.addEventListener('animationend', () => b.remove());
    field.append(b);
  };
  const timer = setInterval(() => {
    if (!app.contains(field)) return clearInterval(timer);
    left--;
    clock.textContent = `${left} s`;
    if (left <= 0) {
      clearInterval(timer);
      clearInterval(spawner);
      field.replaceChildren(h('div', { class: 'bonus-end' },
        h('p', {}, `🫧 ${popped} bulle${popped > 1 ? 's' : ''} éclatée${popped > 1 ? 's' : ''} !`),
        h('button', { class: 'big-btn primary', onclick: back }, 'Continuer')));
      say(me(), `Bravo, tu as éclaté ${popped} bulles !`);
    }
  }, 1000);
  const spawner = setInterval(() => { if (app.contains(field)) spawn(); else clearInterval(spawner); }, 650);
  show(h('main', { class: 'screen bonus-play' },
    topBar({ onBack: () => { clearInterval(timer); clearInterval(spawner); back(); }, backLabel: 'Quitter', title: h('div', { class: 'bubble-hud' }, '🫧 ', score, ' · ⏱ ', clock) }),
    field));
  speak('Éclate les bulles !');
}

/** Remets le portrait dans l'ordre : toucher deux pièces pour les échanger. */
function puzzleGame(back) {
  const n = ['MS', 'GS'].includes(child().grade) ? 2 : 3;
  const order = shuffle(rng, Array.from({ length: n * n }, (_, i) => i));
  if (order.every((v, i) => v === i)) order.reverse();
  let selected = null;
  const board = h('div', { class: 'puzzle-board', style: { '--n': n } });
  const draw = () => {
    board.replaceChildren(...order.map((piece, pos) => {
      const tile = h('button', { class: `puzzle-tile${selected === pos ? ' selected' : ''}`, 'data-pos': pos, 'aria-label': `Pièce ${pos + 1}` });
      const img = avatar(store.active, 'puzzle-img');
      img.style.setProperty('--x', piece % n);
      img.style.setProperty('--y', Math.floor(piece / n));
      tile.append(img);
      tile.addEventListener('click', () => {
        if (selected === null) selected = pos;
        else {
          [order[selected], order[pos]] = [order[pos], order[selected]];
          selected = null;
          playSound('tap');
        }
        draw();
        if (order.every((v, i) => v === i)) {
          board.classList.add('solved');
          playSound('fanfare');
          say(me(), 'Bravo, le puzzle est terminé !');
          board.after(h('button', { class: 'big-btn primary bonus-done', onclick: back }, 'Continuer'));
        }
      });
      return tile;
    }));
  };
  draw();
  show(h('main', { class: 'screen bonus-play' },
    topBar({ onBack: back, backLabel: 'Quitter', title: '🧩 Le puzzle' }),
    h('p', { class: 'album-info' }, 'Touche deux pièces pour les échanger.'),
    board));
  speak('Remets ton portrait dans l’ordre ! Touche deux pièces pour les échanger.');
}

// Dessins à colorier : chaque zone est un chemin SVG.
const COLORING = {
  maison: `<path data-zone d="M20 70 L60 35 L100 70 Z"/><rect data-zone x="28" y="70" width="64" height="44"/>
    <rect data-zone x="52" y="86" width="16" height="28"/><rect data-zone x="34" y="78" width="13" height="13"/>
    <rect data-zone x="73" y="78" width="13" height="13"/><circle data-zone cx="100" cy="22" r="11"/>
    <path data-zone d="M0 114 H120 V120 H0 Z"/>`,
  poisson: `<path data-zone d="M18 60 Q50 25 86 60 Q50 95 18 60 Z"/><path data-zone d="M86 60 L110 42 L110 78 Z"/>
    <circle data-zone cx="34" cy="55" r="5"/><path data-zone d="M48 40 Q55 60 48 80"/><path data-zone d="M62 38 Q70 60 62 82"/>
    <circle data-zone cx="20" cy="20" r="6"/><circle data-zone cx="30" cy="32" r="4"/>`,
  fleur: `<circle data-zone cx="60" cy="44" r="10"/><circle data-zone cx="60" cy="24" r="12"/><circle data-zone cx="80" cy="44" r="12"/>
    <circle data-zone cx="60" cy="64" r="12"/><circle data-zone cx="40" cy="44" r="12"/><path data-zone d="M57 76 H63 V116 H57 Z"/>
    <path data-zone d="M60 96 Q80 80 92 92 Q78 104 60 98 Z"/><path data-zone d="M0 116 H120 V120 H0 Z"/>`,
};
const PALETTE = ['#ff5c5c', '#ffb020', '#ffe14d', '#2fbf5b', '#3d7dff', '#9b5cff', '#ff6fa8', '#8b5a2b'];

function coloringGame(back) {
  const name = pick(rng, Object.keys(COLORING));
  let color = PALETTE[0];
  const drawing = h('div', { class: 'coloring' });
  drawing.innerHTML = `<svg viewBox="0 0 120 120">${COLORING[name]}</svg>`;
  drawing.querySelectorAll('[data-zone]').forEach((zone) => {
    zone.setAttribute('fill', '#ffffff');
    zone.addEventListener('click', () => { zone.setAttribute('fill', color); playSound('tap'); });
  });
  const palette = h('div', { class: 'palette' }, PALETTE.map((c, i) => {
    const btn = h('button', { class: i === 0 ? 'paint on' : 'paint', style: { background: c }, 'aria-label': `Couleur ${i + 1}`, 'data-color': c });
    btn.addEventListener('click', () => {
      color = c;
      palette.querySelectorAll('.paint').forEach((p) => p.classList.toggle('on', p === btn));
    });
    return btn;
  }));
  show(h('main', { class: 'screen bonus-play' },
    topBar({ onBack: back, backLabel: 'Quitter', title: '🎨 Le coloriage' }),
    drawing,
    palette,
    h('button', { class: 'big-btn primary bonus-done', onclick: () => { playSound('fanfare'); say(me(), 'Quel joli dessin !'); setTimeout(back, 900); } }, '✔ J’ai fini')));
  speak('Choisis une couleur, puis touche le dessin pour colorier.');
}

// ---------------------------------------------------------------- Espace parents

function parentGate(next) {
  if (sessionFlag('parent-ok')) return next();
  const a = randInt(rng, 3, 9);
  const b = randInt(rng, 3, 9);
  const input = h('input', { type: 'text', inputmode: 'numeric', pattern: '[0-9]*', class: 'gate-input', 'aria-label': 'Réponse', autocomplete: 'off' });
  const error = h('p', { class: 'gate-error' });
  const check = (e) => {
    e.preventDefault();
    if (Number(input.value) === a * b) {
      sessionFlag('parent-ok', true);
      next();
    } else {
      error.textContent = 'Ce n’est pas la bonne réponse.';
      input.value = '';
    }
  };
  show(h('main', { class: 'screen gate' },
    topBar({ onBack: () => (store.active ? homeScreen() : profileScreen()), title: 'Espace parents' }),
    h('form', { class: 'gate-form', onsubmit: check },
      h('p', {}, 'Pour entrer, calculez :'),
      h('p', { class: 'gate-question' }, `${a} × ${b} = ?`),
      input,
      h('button', { class: 'big-btn primary', type: 'submit' }, 'Entrer'),
      error)));
  setTimeout(() => input.focus(), 50);
}

function toggle(label, value, onChange, setting) {
  // `setting` : le réglage suivi aussi par les boutons du son et de la voix (voir syncSoundControls)
  const box = h('input', { type: 'checkbox', checked: value, role: 'switch', 'data-setting': setting });
  box.addEventListener('change', () => {
    onChange(box.checked);
    if (setting) syncSoundControls();
  });
  return h('label', { class: 'setting' }, h('span', {}, label), box);
}

/** Un réglage à choix (boutons côte à côte). */
function choiceSetting(label, key, options, value, onChange) {
  const group = h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': label });
  const draw = (current) => group.replaceChildren(...options.map(([v, text]) => h('button', {
    class: v === current ? 'seg on' : 'seg', role: 'radio', 'aria-checked': String(v === current), [`data-${key}`]: v,
    onclick: () => { onChange(v); draw(v); },
  }, text)));
  draw(value);
  return h('div', { class: 'setting setting-choice' }, h('span', {}, label), group);
}

const PARENT_TABS = [['suivi', 'Suivi'], ['enfants', 'Enfants'], ['reglages', 'Réglages']];
const leaveParents = () => (store.active && store.profiles[store.active] ? homeScreen() : profileScreen());

/** Espace parents : un seul écran, trois onglets (suivi, enfants, réglages). */
function parentsScreen({ tab = 'suivi', childId, message = '' } = {}) {
  if (!store.order.length) return welcomeScreen();
  const tabs = h('nav', { class: 'parent-tabs', role: 'tablist' }, PARENT_TABS.map(([id, label]) => h('button', {
    class: id === tab ? 'parent-tab on' : 'parent-tab', role: 'tab', 'aria-selected': String(id === tab), 'data-tab': id,
    onclick: () => parentsScreen({ tab: id, childId }),
  }, icon(id), h('span', {}, label))));
  const content = tab === 'enfants' ? childrenTab() : tab === 'reglages' ? settingsTab() : followTab(childId);
  show(h('main', { class: 'screen parents' },
    topBar({ onBack: leaveParents, title: 'Espace parents' }),
    tabs,
    message ? h('p', { class: 'toast', role: 'status' }, message) : null,
    content));
}

function followTab(childId) {
  const selected = store.profiles[childId] ? childId : store.profiles[store.active] ? store.active : store.order[0];
  const kid = store.profiles[selected];
  return h('div', { class: 'tab-panel' },
    store.order.length > 1
      ? h('div', { class: 'segmented tabs child-tabs' }, store.order.map((id) => h('button', {
        class: id === selected ? 'seg on' : 'seg', 'data-child': id, onclick: () => parentsScreen({ tab: 'suivi', childId: id }),
      }, avatar(id, 'avatar-xs'), store.profiles[id].name)))
      : null,
    h('p', { class: 'muted follow-grade' }, `${kid.name} · ${GRADES[kid.grade]} · `,
      h('button', { class: 'link-action', onclick: () => childEditScreen(selected) }, 'Modifier')),
    dashboard({ kid, grade: kid.grade, onChange: save }),
    h('details', { class: 'card tips' },
      h('summary', {}, 'Conseils'),
      h('ul', {},
        h('li', {}, '10 à 15 minutes par jour valent mieux qu’une longue séance.'),
        h('li', {}, 'Le niveau s’adapte seul pour viser 80 % de réussite ; l’enfant peut aussi choisir son niveau.'),
        h('li', {}, 'Dans « Combien ? », faites toucher chaque objet en comptant.'))));
}

function childrenTab() {
  return h('div', { class: 'tab-panel' },
    h('section', { class: 'card child-list' },
      store.order.map((id) => {
        const kid = store.profiles[id];
        return h('div', { class: 'child-row', 'data-child-card': id },
          avatar(id, 'avatar-sm'),
          h('div', { class: 'child-row-text' }, h('b', {}, kid.name), h('span', { class: 'muted small' }, `${GRADES[kid.grade]} · ⭐ ${kid.stars}`)),
          h('button', { class: 'pill-btn', 'data-edit': id, onclick: () => childEditScreen(id) }, 'Modifier'));
      }),
      store.order.length < MAX_CHILDREN
        ? h('button', { class: 'big-btn add-child', onclick: () => childAddScreen() }, icon('plus'), 'Ajouter un enfant')
        : null),
    shareCard());
}

function shareCard() {
  const url = location.href.split(/[?#]/)[0];
  const status = h('p', { class: 'muted small', 'aria-live': 'polite' });
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: APP.name, text: `${APP.name} Des jeux pour apprendre à lire, à compter et l’anglais.`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      status.textContent = 'Lien copié ✓';
    } catch {
      status.textContent = url;
    }
  };
  return h('section', { class: 'card share-card' },
    h('h2', {}, 'Partager l’app'),
    h('p', { class: 'muted small' }, 'Envoyez le lien à une autre famille : chacun crée ses propres profils (prénom, photo) sur son appareil. Rien n’est partagé entre les familles.'),
    h('button', { class: 'big-btn primary share-btn', onclick: share }, icon('partager'), 'Partager le lien'),
    status);
}

function childAddScreen() {
  show(h('main', { class: 'screen parents' },
    topBar({ onBack: () => parentsScreen({ tab: 'enfants' }), title: 'Nouvel enfant' }),
    h('section', { class: 'card' },
      childForm({
        submitLabel: 'Ajouter',
        onSubmit: (data) => {
          const id = addChild(store, data);
          save();
          applySettings();
          parentsScreen({ tab: 'enfants', message: id ? `${data.name} est ajouté·e ✓` : '' });
        },
      }))));
}

function photoRow(id) {
  const kid = store.profiles[id];
  const status = h('p', { class: 'photo-status muted small', 'aria-live': 'polite' });
  const input = h('input', { type: 'file', accept: 'image/*', class: 'visually-hidden', 'data-photo-input': id });
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    status.textContent = 'Enregistrement…';
    try {
      const previous = kid.photo;
      kid.photo = await squarePhoto(file);
      if (!save()) {
        kid.photo = previous;
        status.textContent = 'Photo trop lourde pour l’appareil. Essayez une autre photo.';
        return;
      }
      applySettings();
      childEditScreen(id, `Photo de ${kid.name} enregistrée ✓`);
    } catch {
      status.textContent = 'Impossible de lire cette image.';
    }
  });
  return h('div', { class: 'photo-row', 'data-photo-row': id },
    avatar(id, 'avatar-md'),
    h('div', { class: 'photo-actions' },
      h('label', { class: 'big-btn primary photo-btn' }, '📷 Choisir une photo', input),
      kid.photo
        ? h('button', {
          class: 'link-action',
          onclick: () => {
            kid.photo = null;
            save();
            applySettings();
            childEditScreen(id, `${kid.name} retrouve son dessin.`);
          },
        }, 'Revenir au dessin')
        : null,
      status));
}

function childEditScreen(id, message = '') {
  const kid = store.profiles[id];
  if (!kid) return parentsScreen({ tab: 'enfants' });
  show(h('main', { class: 'screen parents child-edit' },
    topBar({ onBack: () => parentsScreen({ tab: 'enfants' }), title: kid.name }),
    message ? h('p', { class: 'toast', role: 'status' }, message) : null,
    h('section', { class: 'card' },
      h('h2', {}, 'Photo'),
      h('p', { class: 'muted small' }, 'Photothèque ou appareil photo. Enregistrement automatique ; la photo reste sur l’appareil.'),
      photoRow(id)),
    h('section', { class: 'card' },
      h('h2', {}, 'Profil'),
      childForm({
        initial: kid,
        submitLabel: 'Enregistrer',
        onSubmit: ({ name, look, grade }) => {
          if (name !== kid.name) delete kid.spoken; // la prononciation suit le nouveau prénom
          Object.assign(kid, { name, look, grade });
          save();
          applySettings();
          childEditScreen(id, 'Enregistré ✓');
        },
      })),
    h('section', { class: 'card' },
      h('h2', {}, 'Lecture et temps de jeu'),
      toggle('Lecture facilitée (dyslexie) : texte espacé, mots en couleurs alternées', Boolean(kid.easyRead), (v) => { kid.easyRead = v; save(); }),
      choiceSetting('Objectif du jour', 'goal', [[0, 'Aucun'], [2, '2 parties'], [3, '3'], [5, '5']], kid.goals?.parts || 0,
        (v) => { kid.goals = { ...(kid.goals || {}), parts: v }; save(); }),
      choiceSetting('Temps maximum par jour', 'limit', [[0, 'Sans'], [10, '10 min'], [15, '15'], [20, '20'], [30, '30']], kid.goals?.limit || 0,
        (v) => { kid.goals = { ...(kid.goals || {}), limit: v }; save(); }),
      h('p', { class: 'muted small' }, 'Quand le temps est écoulé, la partie en cours se termine, puis une pause est proposée. Vous pouvez accorder 10 minutes de plus.')),
    kidGamesCard(id),
    h('section', { class: 'card danger-zone' },
      h('h2', {}, 'Données'),
      h('button', {
        class: 'big-btn danger reset-child',
        onclick: () => {
          if (confirm(`Effacer toute la progression de ${kid.name} ? Le prénom et la photo sont conservés.`)) {
            resetChild(store, id);
            save();
            childEditScreen(id, 'Progression effacée.');
          }
        },
      }, 'Effacer la progression'),
      h('button', {
        class: 'big-btn danger delete-child',
        onclick: () => {
          if (confirm(`Supprimer le profil de ${kid.name} et toute sa progression ?`)) {
            removeChild(store, id);
            save();
            applySettings();
            if (store.order.length) parentsScreen({ tab: 'enfants', message: 'Profil supprimé.' });
            else welcomeScreen();
          }
        },
      }, 'Supprimer ce profil'))));
}

/**
 * « Ses jeux » : les parents masquent une rubrique entière ou un jeu, et conseillent jusqu'à
 * MAX_FEATURED jeux (bloc « ⭐ Conseillé pour toi » en haut de l'accueil, badge dans la rubrique).
 * Enregistré sur le profil : child.hiddenDomains, child.hiddenGames, child.featured.
 */
function kidGamesCard(id) {
  const kid = store.profiles[id];
  const open = new Set(); // rubriques dépliées (gardées ouvertes quand la carte se redessine)
  const card = h('section', { class: 'card kid-games', 'data-kid-games': id });
  const setIn = (key, value, on) => {
    const list = new Set(kid[key] || []);
    if (on) list.add(value);
    else list.delete(value);
    kid[key] = [...list];
  };
  const change = (fn) => () => {
    // le bouton touché est redessiné : on lui rend le focus (clavier, VoiceOver)
    const focused = ['data-domain-switch', 'data-show-game', 'data-feature-game']
      .map((attr) => document.activeElement?.hasAttribute?.(attr) && `[${attr}="${document.activeElement.getAttribute(attr)}"]`).find(Boolean);
    fn();
    save();
    draw();
    if (focused) card.querySelector(focused)?.focus();
  };
  const draw = () => {
    const hiddenDomains = new Set(kid.hiddenDomains || []);
    const hiddenGames = new Set(kid.hiddenGames || []);
    const featured = new Set(featuredGames(kid).map(({ game }) => game.id));
    const full = featured.size >= MAX_FEATURED;
    // replaceChildren(null) afficherait « null » : on ne passe que de vrais éléments
    card.replaceChildren(...[
      h('h2', {}, 'Ses jeux'),
      h('p', { class: 'muted small' }, `Masquez une rubrique ou un jeu. Conseillez jusqu’à ${MAX_FEATURED} jeux ⭐ : ils apparaissent en haut de son accueil.`),
      ...programFor(kid.grade).map((domain) => {
        const domainHidden = hiddenDomains.has(domain.id);
        const nHidden = domain.games.filter(({ game }) => hiddenGames.has(game.id)).length;
        const nFeatured = domain.games.filter(({ game }) => featured.has(game.id)).length;
        const allHidden = nHidden === domain.games.length;
        const toggleBox = h('input', {
          type: 'checkbox', role: 'switch', checked: !domainHidden, 'data-domain-switch': domain.id, 'aria-label': `Afficher la rubrique ${domain.title}`,
        });
        toggleBox.addEventListener('change', change(() => setIn('hiddenDomains', domain.id, !toggleBox.checked)));
        const summary = domainHidden ? 'Rubrique masquée'
          : [`${domain.games.length} jeu${domain.games.length > 1 ? 'x' : ''}`, nHidden ? `${nHidden} masqué${nHidden > 1 ? 's' : ''}` : '',
            nFeatured ? `${nFeatured} ⭐` : ''].filter(Boolean).join(' · ');
        const details = h('details', { class: 'kid-domain-games', 'data-domain-games': domain.id, open: open.has(domain.id) },
          h('summary', {}, summary),
          domain.games.map(({ game }) => {
            const hidden = hiddenGames.has(game.id);
            const star = featured.has(game.id);
            return h('div', { class: hidden ? 'kid-game off' : 'kid-game', 'data-kid-game': game.id },
              h('span', { class: 'kid-game-title' }, h('span', { 'aria-hidden': 'true' }, game.icon), ' ', game.title),
              h('span', { class: 'kid-game-ctrls' },
                h('button', {
                  class: hidden ? 'kid-toggle' : 'kid-toggle on', 'data-show-game': game.id, 'aria-pressed': String(!hidden),
                  'aria-label': `Afficher ${game.title}`, disabled: domainHidden,
                  // un jeu masqué n'est plus conseillé
                  onclick: change(() => { setIn('hiddenGames', game.id, !hidden); if (!hidden) setIn('featured', game.id, false); }),
                }, hidden ? '🚫 Masqué' : '👁 Affiché'),
                h('button', {
                  class: star ? 'kid-toggle star on' : 'kid-toggle star', 'data-feature-game': game.id, 'aria-pressed': String(star),
                  'aria-label': `Conseiller ${game.title}`, disabled: domainHidden || hidden || (!star && full),
                  onclick: change(() => setIn('featured', game.id, !star)),
                }, star ? '⭐ Conseillé' : '☆ Conseiller')));
          }));
        details.addEventListener('toggle', () => (details.open ? open.add(domain.id) : open.delete(domain.id)));
        return h('div', { class: domainHidden || allHidden ? 'kid-domain off' : 'kid-domain', 'data-kid-domain': domain.id },
          h('label', { class: 'setting kid-domain-head' },
            h('span', { class: 'kid-domain-title' }, h('span', { 'aria-hidden': 'true' }, domain.icon), ' ', domain.title),
            h('span', { class: 'kid-domain-state', 'aria-hidden': 'true' }, domainHidden ? 'Masquée' : allHidden ? 'Aucun jeu' : 'Affichée'),
            toggleBox),
          details);
      }),
      full ? h('p', { class: 'muted small kid-games-full' }, `${MAX_FEATURED} jeux conseillés : retirez-en un pour en choisir un autre.`) : null,
    ].filter(Boolean));
  };
  draw();
  return card;
}

// ---- Voix naturelle : les sons sont téléchargés peu à peu, pour être joués hors connexion

const VOICE_CACHE = 'lire-et-compter-voix'; // le même que dans sw.js
// total, done : sons ; bytes, received : octets à télécharger cette fois-ci, et déjà reçus
const voiceDownload = { total: 0, done: 0, bytes: 0, received: 0, running: false, listeners: new Set() };

let voiceDownloadFrame = 0;
function voiceDownloadChanged() {
  // au plus une mise à jour de l'écran par image, même si les morceaux arrivent très vite
  if (voiceDownloadFrame) return;
  voiceDownloadFrame = requestAnimationFrame(() => {
    voiceDownloadFrame = 0;
    voiceDownload.listeners.forEach((fn) => fn());
  });
}

/** Le contenu d'un fichier, en suivant les octets reçus (pour la barre de progression). */
async function downloadBytes(url, size, onBytes) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} : ${response.status}`);
  if (!response.body?.getReader) {
    const body = new Uint8Array(await response.arrayBuffer());
    onBytes(body.length);
    return body;
  }
  const reader = response.body.getReader();
  const body = new Uint8Array(size);
  let at = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (at + value.length > body.length) throw new Error(`${url} : taille inattendue`);
    body.set(value, at);
    at += value.length;
    onBytes(value.length);
  }
  if (at !== size) throw new Error(`${url} : ${at} octets sur ${size}`);
  return body;
}

/**
 * Télécharge les sons qui manquent, pour jouer aussi hors connexion : ils sont rangés dans une
 * quinzaine de paquets (les plus entendus d'abord), téléchargés deux à la fois puis redécoupés,
 * bien plus vite que des milliers de petits fichiers. Un paquet dont il manque peu de sons n'est
 * pas retéléchargé : ces sons sont demandés un par un (le service worker les prend dans le paquet).
 */
async function prefetchVoices() {
  const packs = naturalVoicePacks();
  // navigateur piloté par un test automatique : pas de téléchargement en arrière-plan (sauf si le test le demande)
  if (voiceDownload.running || !packs.length || !isNaturalVoiceOn() || !('caches' in window)) return;
  if ((navigator.webdriver && !window.__telechargerVoix) || !navigator.serviceWorker?.controller || navigator.onLine === false) return;
  voiceDownload.running = true;
  try {
    const cache = await caches.open(VOICE_CACHE);
    const have = new Set((await cache.keys()).map((r) => new URL(r.url).pathname.split('/voix/')[1]));
    const wanted = new Set(naturalVoiceFiles());
    const plans = packs.map((pack) => {
      const size = pack.sons.reduce((sum, [, n]) => sum + n, 0);
      const missing = pack.sons.filter(([file]) => wanted.has(file) && !have.has(file));
      const missingBytes = missing.reduce((sum, [, n]) => sum + n, 0);
      return { pack, size, missing, whole: missingBytes > size * 0.3, bytes: missingBytes > size * 0.3 ? size : missingBytes };
    }).filter((p) => p.missing.length);
    Object.assign(voiceDownload, {
      total: wanted.size,
      done: [...wanted].filter((f) => have.has(f)).length,
      bytes: plans.reduce((sum, p) => sum + p.bytes, 0),
      received: 0,
    });
    voiceDownloadChanged();
    const keep = (file, bytes) => cache.put(new Request(`voix/${file}`), new Response(bytes, { headers: { 'Content-Type': 'audio/mpeg' } }));
    let next = 0;
    const worker = async () => {
      while (next < plans.length && isNaturalVoiceOn() && navigator.onLine !== false) {
        const { pack, size, missing, whole } = plans[next++];
        if (whole) {
          const body = await downloadBytes(`voix/${pack.nom}`, size, (n) => {
            voiceDownload.received += n;
            voiceDownloadChanged();
          });
          let start = 0;
          const wantedHere = new Set(missing.map(([file]) => file));
          await Promise.all(pack.sons.map(([file, n]) => {
            const part = body.slice(start, start + n);
            start += n;
            return wantedHere.has(file) ? keep(file, part) : null;
          }));
        } else {
          for (const [file, n] of missing) {
            await fetch(`voix/${file}`);
            voiceDownload.received += n;
            voiceDownloadChanged();
          }
        }
        voiceDownload.done += missing.length;
        voiceDownloadChanged();
      }
    };
    await Promise.all([worker(), worker()]);
  } catch {
    // réseau coupé, place insuffisante… : on reprendra plus tard (au retour du réseau, au prochain lancement)
  } finally {
    voiceDownload.running = false;
    voiceDownloadChanged();
  }
}

/**
 * Barre en haut de l'écran pendant le téléchargement des sons : « Voix d’Estelle : 45 % ».
 * Pendant un jeu, seule la fine barre reste (le texte ne cache rien) ; à la fin, elle s'efface.
 */
function voiceProgressBar() {
  let bar = null;
  let fill = null;
  let label = null;
  let hide = 0;
  voiceDownload.listeners.add(() => {
    const { bytes, received, running } = voiceDownload;
    if (running && bytes > 0 && received < bytes) {
      clearTimeout(hide);
      if (!bar) {
        fill = h('div', { class: 'voice-progress-fill' });
        label = h('span', { class: 'voice-progress-text' });
        bar = h('div', { class: 'voice-progress', role: 'progressbar', 'aria-label': 'Téléchargement de la voix', 'aria-valuemin': '0', 'aria-valuemax': '100' }, fill, label);
        document.body.append(bar);
      }
      const percent = Math.min(99, Math.floor((received / bytes) * 100));
      fill.style.width = `${percent}%`;
      label.textContent = `Voix d’Estelle : ${percent} %`;
      bar.setAttribute('aria-valuenow', String(percent));
    } else if (bar && !running && !hide) {
      const complete = voiceDownload.done >= voiceDownload.total;
      fill.style.width = complete ? '100%' : fill.style.width;
      label.textContent = complete ? 'Voix d’Estelle prête ✓' : 'Voix d’Estelle : la suite plus tard';
      bar.setAttribute('aria-valuenow', complete ? '100' : bar.getAttribute('aria-valuenow'));
      bar.classList.add('done');
      hide = setTimeout(() => {
        bar.remove();
        bar = null;
        hide = 0;
      }, 2500);
    }
  });
}

/** Réglages : « Voix naturelle » et l'état du téléchargement des sons. */
function naturalVoiceRow() {
  const state = h('p', { class: 'muted small natural-voice-state', 'aria-live': 'polite' });
  const draw = () => {
    // l'écran des réglages a été quitté : on ne suit plus le téléchargement
    if (state.isConnected) state.dataset.seen = '1';
    else if (state.dataset.seen) {
      voiceDownload.listeners.delete(draw);
      return;
    }
    const total = naturalVoiceFiles().length;
    if (!total) state.textContent = 'Les sons de la voix naturelle ne sont pas encore disponibles : la voix de l’appareil est utilisée.';
    else if (store.settings.naturalVoice === false) state.textContent = 'Coupée : la voix de l’appareil est utilisée.';
    else if (voiceDownload.total && voiceDownload.done < voiceDownload.total) {
      state.textContent = `Téléchargement pour jouer sans Internet : ${voiceDownload.done.toLocaleString('fr-FR')} sons sur ${voiceDownload.total.toLocaleString('fr-FR')}.`;
    } else if (voiceDownload.total) state.textContent = `Les ${total.toLocaleString('fr-FR')} sons sont sur l’appareil : la voix marche aussi sans Internet.`;
    else state.textContent = `${total.toLocaleString('fr-FR')} phrases enregistrées ; les autres sont dites par la voix de l’appareil.`;
  };
  voiceDownload.listeners.add(draw);
  draw();
  return h('div', { class: 'natural-voice' },
    toggle('Voix naturelle (Estelle)', store.settings.naturalVoice !== false, (v) => {
      store.settings.naturalVoice = v;
      applySettings();
      save();
      draw();
      if (v) prefetchVoices();
      say(makeCharacter('voix', { name: 'Léa' }), 'Bravo ! Tu as trouvé la bonne réponse.');
    }),
    state);
}

function voiceRow(voiceList) {
  const sample = makeCharacter('voix', { name: 'Léa' });
  const select = h('select', { class: 'select', 'aria-label': 'Voix de l’application' },
    h('option', { value: '' }, 'Automatique (la plus naturelle)'),
    voiceList.map((v) => h('option', { value: v.id, selected: (store.settings.voices.main || store.settings.voices.female) === v.id }, `${v.name} (${v.lang})`)));
  const test = () => say(sample, 'Bravo ! Tu as trouvé la bonne réponse.');
  select.addEventListener('change', () => {
    store.settings.voices = { main: select.value || undefined };
    save();
    applySettings();
    test();
  });
  return h('div', { class: 'setting voice-row' },
    h('span', {}, 'Voix'),
    h('div', { class: 'voice-ctrl' }, select,
      h('button', { class: 'mini-btn', 'aria-label': 'Écouter la voix', onclick: test }, '▶')));
}

// ---- Vos voix pour les histoires : les parents enregistrent les histoires (micro de l'appareil)

const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;

/** « 3 histoires enregistrées sur 49. » */
function recordedSummary(ids) {
  const n = STORY_DATA.filter((s) => ids.has(s.id)).length;
  return `${plural(n, 'histoire')} ${n > 1 ? 'enregistrées' : 'enregistrée'} sur ${STORY_DATA.length}.`;
}

/** Réglages : la section qui ouvre l'écran des voix. */
function voicesCard() {
  const count = h('p', { class: 'muted small voices-count', 'aria-live': 'polite', hidden: true });
  refreshRecorded().then((ids) => {
    if (!ids.size) return;
    count.textContent = recordedSummary(ids);
    count.hidden = false;
  });
  return h('section', { class: 'card voices-card' },
    h('h2', {}, 'Vos voix pour les histoires'),
    h('p', { class: 'muted small' }, 'Lisez les histoires à voix haute : votre enfant les entendra avec votre voix au lieu de la voix de synthèse. Les enregistrements restent sur cet appareil.'),
    h('button', { class: 'big-btn primary voices-open', 'data-voices': '', onclick: () => voicesScreen() }, '🎙 Enregistrer les histoires'),
    count);
}

/** Les classes qui entendent les histoires de ce niveau (« MS, GS, CP »). */
function gradesForStoryLevel(level) {
  return Object.keys(GRADES).filter((grade) => {
    const { min, max } = levelRange(grade, 'histoires');
    return level >= min && level <= max;
  }).join(', ');
}

/** Toutes les histoires, par niveau, chacune avec 🎙 Enregistrer, et ▶ Écouter, 🗑 Supprimer si elle est enregistrée. */
async function voicesScreen(message = '') {
  const saved = await refreshRecorded();
  const { levels } = findGame('histoires');
  show(h('main', { class: 'screen parents voices' },
    topBar({ onBack: () => parentsScreen({ tab: 'reglages' }), title: 'Vos voix' }),
    message ? h('p', { class: 'toast', role: 'status' }, message) : null,
    h('section', { class: 'card voices-intro' },
      h('p', {}, 'Choisissez une histoire et lisez-la à voix haute. Dans « Histoires lues », votre enfant l’entendra avec votre voix et les phrases s’allumeront au fil de la lecture ; la question est ensuite posée par la voix de l’application.'),
      h('p', { class: 'voices-private' }, '🔒 Les enregistrements restent sur cet appareil : ils ne sont envoyés nulle part.'),
      h('p', { class: 'muted small', 'data-recorded-count': '' }, recordedSummary(saved))),
    levels.map((label, i) => {
      const stories = STORY_DATA.filter((s) => s.level === i + 1);
      const grades = gradesForStoryLevel(i + 1);
      return h('section', { class: 'card voices-level' },
        h('h2', {}, `Niveau ${i + 1} · ${label}`),
        grades ? h('p', { class: 'muted small voices-grades' }, grades) : null,
        stories.map((story) => storyVoiceRow(story, saved.has(story.id))));
    })));
}

function storyVoiceRow(story, recorded) {
  const season = SEASON_LABELS[story.season];
  const listen = h('button', { class: 'pill-btn quiet', 'data-listen': story.id }, '▶ Écouter');
  listen.addEventListener('click', () => listenRecording(story, listen));
  return h('div', { class: recorded ? 'voice-story recorded' : 'voice-story', 'data-story': story.id, 'data-recorded': recorded },
    h('span', { class: 'voice-story-emoji', 'aria-hidden': 'true' }, story.emoji),
    h('div', { class: 'voice-story-text' },
      h('b', {}, story.title),
      h('span', { class: 'small voice-state' }, recorded ? '✔ Enregistrée' : 'À enregistrer',
        season ? h('span', { class: 'muted' }, ` · ${season}`) : null)),
    h('div', { class: 'voice-story-actions' },
      h('button', { class: 'pill-btn', 'data-record': story.id, onclick: () => recordScreen(story) }, '🎙 Enregistrer'),
      recorded ? listen : null,
      recorded ? h('button', { class: 'pill-btn warn', 'data-delete': story.id, onclick: () => deleteRecording(story) }, '🗑 Supprimer') : null));
}

/** ▶ Écouter un enregistrement (le bouton devient ⏹ Arrêter pendant la lecture). */
async function listenRecording(story, button) {
  if (button.classList.contains('playing')) {
    stopStoryAudio();
    return;
  }
  unlockStoryAudio(); // pendant le toucher : l'élément audio pourra jouer après la lecture de la base
  stopSpeaking();
  const saved = await recordings.get(story.id);
  if (!button.isConnected) return;
  if (!saved) {
    voicesScreen('Cet enregistrement est introuvable.');
    return;
  }
  button.classList.add('playing');
  button.textContent = '⏹ Arrêter';
  await playAudio(saved.blob, { into: button.closest('.voice-story'), duration: saved.duration });
  button.classList.remove('playing');
  button.textContent = '▶ Écouter';
}

async function deleteRecording(story) {
  if (!confirm(`Supprimer l’enregistrement de « ${story.title} » ? L’histoire sera de nouveau lue par la voix de l’application.`)) return;
  stopStoryAudio();
  const done = await recordings.remove(story.id);
  voicesScreen(done ? `Enregistrement de « ${story.title} » supprimé.` : 'L’enregistrement n’a pas pu être supprimé.');
}

/** Pourquoi le micro ne peut pas servir, en clair. */
function micProblem(error) {
  const name = error?.name || '';
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') {
    return 'L’accès au micro est refusé. Autorisez le micro pour cette app (sur iPhone : touchez « aA » dans la barre d’adresse → Réglages du site web → Micro, ou Réglages → Safari → Micro), puis réessayez.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
    return 'Aucun micro n’a été trouvé sur cet appareil.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') {
    return 'Le micro est occupé (un appel ou une autre app ?). Fermez-la, puis réessayez.';
  }
  return 'Le micro n’a pas pu démarrer. Réessayez.';
}

/**
 * Enregistrer une histoire : le texte en gros pour le lire, ⏺ Commencer puis ⏹ Terminer
 * (3 minutes au plus), puis ▶ Écouter, ✔ Garder ou ↺ Recommencer.
 */
function recordScreen(story) {
  const levelLabel = findGame('histoires').levels[story.level - 1];
  const timer = h('p', { class: 'record-timer', hidden: true });
  const status = h('p', { class: 'record-status', 'aria-live': 'polite' });
  const buttons = h('div', { class: 'record-buttons' });
  let take = null; // la lecture enregistrée : { blob, mime, duration }
  let capture = null; // l'enregistrement en cours : { recorder, stream, startedAt, … }

  const button = (label, className, data, onclick) => h('button', { class: `big-btn ${className}`, [`data-${data}`]: '', onclick }, label);

  // chaque étape : le message, puis les boutons
  const steps = {
    ready: () => ['Touchez « Commencer », puis lisez l’histoire à voix haute, lentement et avec le ton. 3 minutes au plus.',
      [button('⏺ Commencer', 'primary', 'rec-start', start)]],
    asking: () => ['Autorisez le micro si l’appareil le demande…', []],
    recording: () => ['Lisez l’histoire, puis touchez « Terminer ».', [button('⏹ Terminer', 'danger', 'rec-stop', stop)]],
    stopping: () => ['Un instant…', []],
    recorded: () => [take.duration >= MAX_SECONDS - 1
      ? 'L’enregistrement s’est arrêté à 3 minutes. Écoutez-le, puis gardez-le ou recommencez.'
      : `Votre lecture dure ${formatDuration(take.duration)}. Écoutez-la, puis gardez-la ou recommencez.`,
    [listenButton(), button('✔ Garder', 'primary', 'rec-keep', keep), button('↺ Recommencer', '', 'rec-redo', redo)]],
    saving: () => ['Enregistrement sur l’appareil…', []],
    error: (retry) => ['', retry ? [button('↺ Réessayer', '', 'rec-start', start)] : []],
  };

  function setState(state, message = '', retry = true) {
    timer.hidden = state !== 'recording';
    const [text, actions] = steps[state](retry);
    status.textContent = message || text;
    status.classList.toggle('problem', state === 'error');
    buttons.replaceChildren(...actions);
  }

  function listenButton() {
    const listen = button('▶ Écouter', '', 'rec-listen', async () => {
      if (listen.classList.contains('playing')) {
        stopStoryAudio();
        return;
      }
      listen.classList.add('playing');
      listen.textContent = '⏹ Arrêter';
      await playAudio(take.blob, { into: screen, duration: take.duration });
      listen.classList.remove('playing');
      listen.textContent = '▶ Écouter';
    });
    return listen;
  }

  function showTime() {
    if (!capture) return;
    timer.replaceChildren(h('span', { class: 'rec-dot', 'aria-hidden': 'true' }),
      `Enregistrement en cours · ${formatDuration((Date.now() - capture.startedAt) / 1000)} / ${formatDuration(MAX_SECONDS)}`);
  }

  async function start() {
    stopStoryAudio();
    stopSpeaking();
    take = null;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setState('error', 'Cet appareil ou ce navigateur ne permet pas d’enregistrer le son. Sur iPhone et iPad, mettez Safari à jour.', false);
      return;
    }
    setState('asking');
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      if (screen.isConnected) setState('error', micProblem(error));
      return;
    }
    const release = () => stream.getTracks().forEach((track) => track.stop());
    if (!screen.isConnected) {
      release();
      return;
    }
    const mime = pickMime((type) => MediaRecorder.isTypeSupported?.(type));
    let recorder;
    try {
      recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    } catch {
      release();
      setState('error', 'L’enregistrement n’a pas pu démarrer sur cet appareil.', false);
      return;
    }
    const chunks = [];
    const current = { recorder, release, startedAt: Date.now(), stoppedAt: 0, cancelled: false, ticker: null, limit: null };
    const end = () => {
      clearInterval(current.ticker);
      clearTimeout(current.limit);
      release();
      if (capture === current) capture = null;
    };
    recorder.ondataavailable = (e) => {
      if (e.data?.size) chunks.push(e.data);
    };
    recorder.onerror = () => {
      current.cancelled = true;
      end();
      if (screen.isConnected) setState('error', 'L’enregistrement s’est interrompu. Réessayez.');
    };
    recorder.onstop = () => {
      end();
      if (current.cancelled || !screen.isConnected) return;
      const type = recorder.mimeType || mime || chunks[0]?.type || '';
      const blob = new Blob(chunks, type ? { type } : {});
      if (!blob.size) {
        setState('error', 'Aucun son n’a été enregistré. Vérifiez le micro, puis réessayez.');
        return;
      }
      take = { blob, mime: type, duration: Math.min(MAX_SECONDS, ((current.stoppedAt || Date.now()) - current.startedAt) / 1000) };
      setState('recorded');
    };
    try {
      recorder.start();
    } catch {
      end();
      setState('error', 'L’enregistrement n’a pas pu démarrer. Réessayez.');
      return;
    }
    capture = current;
    current.ticker = setInterval(showTime, 250);
    current.limit = setTimeout(stop, MAX_SECONDS * 1000);
    showTime();
    setState('recording');
  }

  function stop() {
    if (!capture) return;
    capture.stoppedAt = Date.now();
    clearInterval(capture.ticker);
    clearTimeout(capture.limit);
    setState('stopping');
    try {
      capture.recorder.stop(); // la suite dans onstop
    } catch {
      capture.cancelled = true;
      capture.release();
      capture = null;
      setState('error', 'L’enregistrement s’est interrompu. Réessayez.');
    }
  }

  /** En quittant l'écran : on arrête tout et on libère le micro (rien n'est gardé). */
  function cancel() {
    stopStoryAudio();
    if (!capture) return;
    const current = capture;
    capture = null;
    current.cancelled = true;
    clearInterval(current.ticker);
    clearTimeout(current.limit);
    try {
      if (current.recorder.state !== 'inactive') current.recorder.stop();
    } catch {
      // déjà arrêté
    }
    current.release();
  }

  async function keep() {
    stopStoryAudio();
    setState('saving');
    const ok = await recordings.save(story.id, take.blob, { mime: take.mime, duration: take.duration });
    if (!ok) {
      if (screen.isConnected) setState('recorded', 'L’enregistrement n’a pas pu être gardé (espace plein ou navigation privée ?). Réessayez.');
      return;
    }
    recordedIds = new Set([...(recordedIds || []), story.id]);
    // demande à l'appareil de ne pas effacer ces données quand l'espace manque
    navigator.storage?.persist?.().catch(() => {});
    if (screen.isConnected) voicesScreen(`« ${story.title} » est enregistrée avec votre voix ✓`);
  }

  function redo() {
    stopStoryAudio();
    take = null;
    setState('ready');
  }

  const screen = h('main', { class: 'screen parents record-screen', 'data-recording': story.id },
    topBar({ onBack: () => { cancel(); voicesScreen(); }, title: 'Enregistrer' }),
    h('div', { class: 'record-layout' },
      h('section', { class: 'card record-story' },
        h('div', { class: 'record-head' },
          h('span', { class: 'record-emoji', 'aria-hidden': 'true' }, story.emoji),
          h('div', {},
            h('h2', {}, story.title),
            h('p', { class: 'muted small' }, `Niveau ${story.level} · ${levelLabel}`))),
        h('p', { class: 'record-text' }, frenchSpacing(story.sentences.join(' '))),
        h('p', { class: 'muted small' }, story.question
          ? `Ensuite, l’application pose la question : « ${frenchSpacing(story.question)} »`
          : 'Ensuite, l’enfant remet les images dans l’ordre de l’histoire.')),
      h('section', { class: 'card record-controls' },
        timer, status, buttons,
        h('p', { class: 'muted small' }, '🔒 L’enregistrement reste sur cet appareil.'))));
  show(screen);
  leaveScreen = cancel;
  setState('ready');
}

function settingsTab() {
  const lengthSelect = h('div', { class: 'segmented' }, [5, 10, 15].map((n) => {
    const btn = h('button', { class: store.settings.sessionLength === n ? 'seg on' : 'seg' }, n);
    btn.addEventListener('click', () => {
      store.settings.sessionLength = n;
      save();
      lengthSelect.querySelectorAll('.seg').forEach((el) => el.classList.toggle('on', el === btn));
    });
    return btn;
  }));
  const voiceList = listFrenchVoices();
  return h('div', { class: 'tab-panel settings' },
    h('section', { class: 'card' },
      h('h2', {}, 'Voix et sons'),
      toggle('Consignes lues à voix haute', store.settings.voice, (v) => { store.settings.voice = v; applySettings(); save(); }, 'voice'),
      naturalVoiceRow(),
      voiceList.length ? voiceRow(voiceList) : null,
      toggle('Petits sons', store.settings.sounds, (v) => { store.settings.sounds = v; applySettings(); save(); }, 'sounds'),
      toggle('Musique douce (accueil et menus)', Boolean(store.settings.music), (v) => { store.settings.music = v; save(); if (!v) stopMusic(); }, 'music'),
      toggle('Décors de saison (Noël, Halloween…)', store.settings.seasonal !== false, (v) => { store.settings.seasonal = v; save(); }),
      h('div', { class: 'setting' }, h('span', {}, 'Questions par partie'), lengthSelect),
      h('p', { class: 'muted small' }, 'Voix de l’appareil (phrases rares, ou voix naturelle coupée) : pour qu’elle soit plus naturelle, Réglages de l’iPhone → Accessibilité → Contenu énoncé → Voix → Français, puis téléchargez une voix « Premium » ou « améliorée ».')),
    voicesCard(),
    isStandalone() ? null : h('section', { class: 'card' },
      h('h2', {}, 'Installer sur l’écran d’accueil'),
      installSteps(),
      h('p', { class: 'muted small' }, 'Sur iPhone et iPad, l’app installée est protégée : le navigateur ne peut pas effacer ses données.')),
    h('section', { class: 'card about' },
      h('h2', {}, 'À propos'),
      h('div', { class: 'setting' }, h('span', {}, 'Version'), h('b', { 'data-version': APP.version }, APP.version)),
      changelog(),
      h('div', { class: 'credits' },
        h('p', {}, h('b', {}, APP.name), ' · conçue par ', h('b', {}, APP.author)),
        h('p', { class: 'contact' }, 'Une remarque, un bug, une idée ? Écrivez à ',
          h('a', { class: 'link-action', href: `mailto:${APP.contact}?subject=${encodeURIComponent(APP.name)}`, 'data-contact': '' }, APP.contact), '.'),
        h('p', { class: 'muted small' }, 'Police Andika © SIL International (licence OFL).'),
        h('p', { class: 'muted small' }, 'Voix naturelle : Pocket TTS © Kyutai, voix « Estelle » (corpus CML-TTS, licence CC-BY 4.0).'))));
}

// ---------------------------------------------------------------- Démarrage

document.addEventListener('pointerdown', unlockAudio, { capture: true });
document.addEventListener('pointerdown', unlockNaturalVoice, { capture: true });
// voix naturelle : la liste des sons, puis leur téléchargement en arrière-plan (pour le mode avion),
// avec une barre en haut de l'écran
voiceProgressBar();
loadNaturalVoice().then((ok) => {
  if (!ok) return;
  voiceDownloadChanged();
  setTimeout(prefetchVoices, 1500);
});
window.addEventListener('online', () => prefetchVoices());
document.addEventListener('pointerdown', unlockStoryAudio, { capture: true });
refreshRecorded(); // les histoires enregistrées par les parents sur cet appareil
document.addEventListener('visibilitychange', () => { if (document.hidden) stopMusic(); });
document.addEventListener('pointerdown', (e) => {
  if (e.target.closest('button')) playSound('tap');
});

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
// demander au navigateur de ne pas effacer les données de l'app (profils, progrès) quand il manque de place
if (store.order.length) navigator.storage?.persist?.().catch(() => {});

// Au lancement : « Qui joue ? » (sauf si l'app est rouverte pendant la même séance). Une partie à
// deux interrompue (rechargement) ramène aussi à « Qui joue ? », avec l'enfant actif d'avant la partie.
const duoInterrupted = sessionFlag('duo');
clearSessionFlag('duo');
if (store.active && sessionFlag('playing') && !duoInterrupted) homeScreen();
else profileScreen();
sessionFlag('playing', true);
