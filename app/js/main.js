// Point d'entrée : profils, navigation entre les écrans et déroulement d'une partie.

import { findGame } from './games/index.js';
import { CALC_PALIERS, equationHolds } from './games/maths.js';
import { canMove, solveMaze } from './games/labyrinthes.js';
import { levelRange, programFor } from './programs.js';
import { createRng, pick, randInt, sample, shuffle } from './random.js';
import { palierStarsAfter, PALIER_MAX_STARS, recordAnswer, starsFor } from './progress.js';
import { newStickers, STICKERS, starsToNextSticker, stickersUnlocked } from './rewards.js';
import {
  addChild, cleanName, GRADES, gameStats, loadStore, logMistake, logSession, MAX_CHILDREN, NAME_MAX, removeChild, resetChild, saveStore,
} from './storage.js';
import { listFrenchVoices, setSpeechEnabled, setVoicePreferences, speak, stopSpeaking } from './speech.js';
import { playSound, setSoundsEnabled, startMusic, stopMusic, unlockAudio } from './sounds.js';
import { avatar, h, moneyItem, renderChoiceContent, renderStage, revealWord, setProfiles } from './render.js';
import { ACCESSORIES, LOOKS, makeCharacter, SHIRTS } from './characters.js';
import { dashboard } from './dashboard.js';
import { squarePhoto } from './photo.js';
import { APP, CHANGELOG } from './config.js';
import { seasonOf } from './themes.js';

const app = document.getElementById('app');
const rng = createRng();
const store = loadStore();
applySettings();

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
  setProfiles(store.profiles);
}

function save() {
  return saveStore(store);
}

function show(...children) {
  stopSpeaking();
  document.body.classList.toggle('easy-read', Boolean(child()?.easyRead));
  document.body.dataset.season = store.settings.seasonal === false ? '' : currentSeason().id;
  app.replaceChildren(...children.filter(Boolean));
  window.scrollTo(0, 0);
  const calm = app.querySelector('.screen.play, .screen.parents, .screen.gate');
  if (store.settings.music && !calm) startMusic();
  else stopMusic();
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
 * (« Eva-Rose » ne se coupe jamais en fin de ligne).
 */
function frenchSpacing(text) {
  return text.replace(/ ([?!:;])/g, '\u00a0$1').replace(/(\p{L})-(\p{L})/gu, '$1\u2011$2');
}

/** Fait parler le personnage de l'enfant, avec sa voix (fille ou garçon). */
function say(who, parts) {
  return speak(parts, who?.voice);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function starCounter() {
  return h('div', { class: 'star-counter', 'aria-label': `${child().stars} étoiles` }, '⭐ ', child().stars);
}

function topBar({ onBack, backLabel = 'Retour', title, right }) {
  return h('header', { class: 'top-bar' },
    onBack ? h('button', { class: 'icon-btn', onclick: onBack, 'aria-label': backLabel }, backLabel === 'Quitter' ? '✕' : '←') : h('span'),
    title instanceof Node ? title : title ? h('h1', { class: 'top-title' }, title) : h('span'),
    right || h('span'));
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

function domainById(id) {
  return programFor(child().grade).find((d) => d.id === id);
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
    h('header', { class: 'top-bar' }, h('span'), h('span'), parentButton()),
    h('h1', { class: 'profiles-title' }, 'Qui joue ?'),
    h('div', { class: `profile-list n${store.order.length}` },
      store.order.map((id) => {
        const kid = store.profiles[id];
        return h('button', { class: `profile-card look-${kid.look}`, 'data-profile': id, onclick: () => chooseProfile(id) },
          avatar(id, 'avatar-xl'),
          h('span', { class: 'profile-name' }, frenchSpacing(kid.name)),
          h('span', { class: 'profile-grade' }, GRADES[kid.grade]),
          h('span', { class: 'profile-stars' }, '⭐ ', kid.stars));
      }))));
}

function chooseProfile(id) {
  store.active = id;
  save();
  homeScreen();
  say(me(), `Bonjour ${me().spoken} !`);
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
  const domains = programFor(child().grade);
  show(h('main', { class: 'screen home' },
    h('header', { class: 'top-bar' }, profileChip(), h('span'), starCounter()),
    h('div', { class: 'home-hero' },
      seasonDecor(),
      h('h1', { class: 'home-title' }, frenchSpacing(`Bonjour ${c.name} !`)),
      goalBar()),
    h('nav', { class: 'home-menu' },
      h('div', { class: 'home-top' }, dailyButton(), reviewButton()),
      h('div', { class: `home-grid n${domains.length}` },
        domains.map((d) => h('button', { class: `domain-tile domain-${d.id}`, 'data-domain': d.id, onclick: () => domainScreen(d.id) },
          h('span', { class: 'domain-icon', 'aria-hidden': 'true' }, d.icon), h('span', { class: 'domain-name' }, d.title)))),
      h('div', { class: 'home-bottom' },
        h('button', { class: 'domain-btn domain-album', onclick: albumScreen },
          h('span', { class: 'domain-icon', 'aria-hidden': 'true' }, '🏆'),
          h('span', {}, 'Mon album'),
          h('span', { class: 'pill' }, `${stickersUnlocked(child().stars)}/${STICKERS.length}`)),
        h('button', { class: 'domain-btn domain-dress', 'data-dress': '', onclick: characterScreen },
          h('span', { class: 'domain-icon', 'aria-hidden': 'true' }, '🎨'),
          h('span', {}, 'Mon personnage'))))));
}

// ---------------------------------------------------------------- Défi du jour

/** Date du jour (ou d'un autre jour, en décalage), au format AAAA-MM-JJ, à l'heure locale. */
function dayKey(offset = 0, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function hashText(text) {
  let hash = 2166136261;
  for (const ch of text) hash = Math.imul(hash ^ ch.codePointAt(0), 16777619);
  return hash >>> 0;
}

/**
 * Le défi du jour : 5 questions tirées des jeux de la classe, au niveau de l'enfant.
 * Les mêmes jeux toute la journée ; une étoile bonus et un jour de plus dans la série.
 */
function dailyGame() {
  const pool = programFor(child().grade).flatMap((d) => d.games).filter(({ game }) => !game.paliers);
  const picks = sample(createRng(hashText(`${dayKey()}:${store.active}`)), pool, 5);
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

/** Une erreur dans un jeu : on le révisera dès aujourd'hui, au niveau où l'erreur a eu lieu. */
function scheduleReview(gameId, level) {
  const kid = child();
  if (!kid || !findGame(gameId) || findGame(gameId).paliers) return;
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

function dueReviews() {
  return Object.entries(child().review || {}).filter(([id, r]) => findGame(id) && r.due <= dayKey());
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
function timeIsUp() {
  const limit = child().goals?.limit || 0;
  if (!limit) return false;
  const { minutes, extra } = todayStats();
  return minutes >= limit + extra;
}

function pauseScreen() {
  const c = me();
  show(h('main', { class: 'screen pause' },
    h('header', { class: 'top-bar' }, profileChip(), h('span'), starCounter()),
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
    blocks.push(h('div', { class: 'game-card' },
      h('button', {
        class: 'game-play',
        'data-game': game.id,
        onclick: () => (game.paliers ? palierMap(min, max) : startSession(game)),
      },
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

function startSession(game, { level, back, total } = {}) {
  if (timeIsUp()) return pauseScreen();
  const { min, max } = game.range || levelRange(child().grade, game.id);
  const stats = gameStats(child(), game.id, min);
  const startLevel = level || Math.min(max, Math.max(min, stats.level));
  const session = {
    game,
    min,
    max,
    back: back || (() => domainScreen(game.domain)),
    index: 0,
    total: total || store.settings.sessionLength,
    correct: 0,
    recentKeys: [],
    briefed: new Set(), // consignes déjà dites en entier pendant cette partie
    startedAt: Date.now(),
    // un niveau choisi à la main repart d'une série vierge
    levelState: { level: startLevel, streak: game.paliers || level ? 0 : stats.streak, recent: game.paliers || level ? [] : stats.recent },
    formatOffset: Number(new URLSearchParams(location.search).get('format') || 0),
  };
  nextQuestion(session);
}

function newQuestion(session) {
  let q;
  for (let i = 0; i < 10; i++) {
    q = session.game.generate(session.levelState.level, rng, session.index + session.formatOffset, { name: me().name });
    if (!session.recentKeys.includes(q.key)) break;
  }
  session.recentKeys = [...session.recentKeys, q.key].slice(-4);
  return q;
}

function nextQuestion(session) {
  if (session.index >= session.total) return finishSession(session);
  const q = newQuestion(session);
  session.question = q;
  session.attempts = 0;
  session.locked = false;
  globalThis.__lc = { question: q }; // utilisé par les tests de bout en bout

  const { game } = session;
  const guide = me(); // seul l'enfant qui joue apparaît, avec sa photo ou son dessin et sa voix
  session.guide = guide;
  // La consigne complète est dite la première fois ; ensuite, une version courte
  // (q.short) évite de répéter la même phrase à chaque question.
  const briefKey = q.short && (q.short.key ?? q.short.text);
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
  const custom = { build: buildZone, maze: mazeZone, path: pathZone, lasso: lassoZone, sudoku: sudokuZone, symmetry: symmetryZone }[q.interaction];
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

  const badge = game.badge ? game.badge(session.levelState.level) : `Niv. ${session.levelState.level - session.min + 1}`;
  show(h('main', { class: `screen play domain-theme-${game.domain} play-${q.interaction || 'choice'}` },
    topBar({ onBack: session.back, backLabel: 'Quitter', title: progress, right: h('span', { class: 'level-badge' }, badge) }),
    h('div', { class: 'instruction' },
      h('button', { class: 'guide-btn', onclick: replay, 'aria-label': `Réécouter ${guide.name}` },
        avatar(guide.id, 'avatar-sm'), h('span', { class: 'speak-badge', 'aria-hidden': 'true' }, '🔊')),
      h('button', { class: 'bubble bubble-left', onclick: replay }, frenchSpacing(brief ? q.short.text : q.text))),
    stage,
    zone,
    feedback));
  // histoire en karaoké : la voix lit l'histoire (chaque mot s'allume), puis pose la question
  const readAlong = () => (q.karaoke ? karaoke(stage, guide, q.stage.sentences, q.instruction) : null);
  if (q.karaoke) readAlong();
  else say(guide, brief ? (q.short.speak ?? q.short.text) : q.instruction);
}

/** Lit des phrases en allumant chaque mot ; repli au rythme moyen si le navigateur ne suit pas les mots. */
function karaoke(stageEl, guide, sentences, after = []) {
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
  return say(guide, [...parts, ...(Array.isArray(after) ? after : [after])]).then(() => {
    clearInterval(timer);
    clear();
  });
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
  if (firstTry && game.id === 'revision') advanceReview(q.from);

  let change = null;
  if (!game.fixedLevel) {
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
  await Promise.all([sleep(1300), Promise.race([say(session.guide, toSay), sleep(4500)])]);
  if (app.contains(feedback)) nextQuestion(session);
}

// ---- Choix multiple

function choiceZone(ctx) {
  const { q } = ctx;
  const zone = h('div', { class: `choices choices-${q.choiceStyle} n${q.choices.length}${q.stage.type === 'none' ? ' center' : ''}` });
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
  const refresh = () => cells.forEach((el, i) => {
    el.classList.toggle('selected', i === selected);
    el.setAttribute('aria-label', label(i));
  });
  // pourquoi c'est faux : la même image est déjà dans la ligne, la colonne ou le carré
  const conflict = (cell, v) => {
    const r = Math.floor(cell / size);
    const c = cell % size;
    if (grid.some((x, i) => x === v && Math.floor(i / size) === r)) return 'cette ligne';
    if (grid.some((x, i) => x === v && i % size === c)) return 'cette colonne';
    if (grid.some((x, i) => x === v && Math.floor(Math.floor(i / size) / br) === Math.floor(r / br) && Math.floor((i % size) / bc) === Math.floor(c / bc))) return 'ce carré';
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
  const zone = h('div', { class: 'choices sudoku-palette', style: { '--n': size } }, palette);
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
  const sorted = [...q.items].sort((a, b) => (q.order === 'desc' ? b.value - a.value : a.value - b.value));
  let next = 0;
  const content = (item) => (item.emoji
    ? h('span', { class: 'order-emoji', style: { '--scale': item.scale } }, item.emoji)
    : item.label);
  const slots = sorted.map(() => h('span', { class: 'order-slot', ...(q.lang ? { lang: q.lang } : {}) }));
  const sign = q.sign ?? (q.items[0].emoji ? '→' : q.order === 'desc' ? '>' : '<');
  const lang = q.lang ? { lang: q.lang } : {};
  const buttons = q.items.map((item) => {
    const btn = h('button', { class: `order-item${item.emoji ? ' order-picture' : ''}`, 'data-value': String(item.value), 'aria-label': item.label || `Taille ${item.value + 1}`, ...lang }, content(item));
    btn.addEventListener('click', () => {
      if (ctx.session.locked || btn.disabled) return;
      if (item.value === sorted[next].value) {
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
      if (hint) buttons[q.items.indexOf(sorted[next])].classList.add('hint');
      markWrong(ctx, { message: hint ? 'Touche celui qui brille !' : 'Essaie encore !', given: item.label || `taille ${item.value + 1}` });
    });
    return btn;
  });
  const zone = h('div', { class: 'choices order center' },
    h('div', { class: `order-slots n${slots.length}` }, slots.flatMap((slot, i) => (i && sign ? [h('span', { class: 'order-sign', 'aria-hidden': 'true' }, sign), slot] : [slot]))),
    h('div', { class: `order-items n${q.items.length}` }, buttons));
  return zone;
}

// ---- Labyrinthe : glisser le doigt, toucher une case, ou les flèches

function mazeZone(ctx) {
  const { q } = ctx;
  const { cols, rows, open, start, goal, hero, goalEmoji } = q.stage;
  let pos = start;
  const cells = open.map((bits, i) => h('div', {
    class: ['maze-cell', ...['n', 'e', 's', 'w'].filter((_, k) => !(bits & (1 << k))).map((d) => `wall-${d}`)].join(' '),
    'data-cell': i,
  }));
  cells[goal].append(h('span', { class: 'maze-goal', 'aria-hidden': 'true' }, goalEmoji));
  cells[start].classList.add('maze-start');
  const heroEl = h('span', { class: 'maze-hero', 'aria-hidden': 'true' }, hero);
  const grid = h('div', {
    class: 'maze',
    role: 'img',
    'aria-label': `Labyrinthe de ${cols} cases sur ${rows}`,
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
    cells[pos].classList.add('trail');
    pos = target;
    place();
    cells[pos].classList.remove('hint');
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
  // L'indice montre les 3 prochaines cases ; il compte comme une aide (pas d'étoile « du premier coup »).
  const hint = () => {
    if (ctx.session.locked) return;
    ctx.session.attempts++;
    solveMaze(open, cols, pos, goal).slice(1, 4).forEach((c) => cells[c].classList.add('hint'));
    say(ctx.session.guide, 'Suis les étoiles !');
  };
  const zone = h('div', { class: 'choices maze-controls' },
    arrow('Gauche', '←', -1), arrow('Haut', '↑', -cols), arrow('Bas', '↓', cols), arrow('Droite', '→', 1),
    h('button', { class: 'maze-arrow maze-hint', 'aria-label': 'Indice', onclick: hint }, '💡'));
  return { stage: h('div', { class: 'stage stage-maze' }, grid), zone };
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
    confetti(stars),
    h('div', { class: 'duo duo-results' }, avatar(me().id, 'avatar-md cheer')),
    h('div', { class: 'result-stars', 'aria-label': `${stars} étoiles sur 3` },
      [1, 2, 3].map((i) => h('span', { class: i <= stars ? 'big-star on' : 'big-star', style: { animationDelay: `${i * 0.25}s` } }, '⭐'))),
    h('h1', {}, frenchSpacing(title)),
    h('p', { class: 'result-detail' }, `${session.correct} sur ${session.total} du premier coup`),
    palierLine,
    dailyLine,
    unlocked.length
      ? h('div', { class: 'new-sticker' }, h('span', { class: 'sticker-big' }, unlocked.at(-1).emoji), h('p', {}, 'Nouvel autocollant !'))
      : null,
    h('div', { class: 'result-actions' },
      h('button', { class: 'big-btn primary', onclick: () => startSession(game, { level: game.paliers ? session.levelState.level : undefined, back: session.back, total: game.id === 'defi' ? session.total : undefined }) }, '🔁 Rejouer'),
      stars >= 2 ? h('button', { class: 'big-btn bonus-btn', 'data-bonus-open': '', onclick: () => bonusMenu(session.back) }, '🎁 Jeu bonus') : null,
      h('button', { class: 'big-btn', onclick: session.back }, game.paliers ? '🗺️ Les paliers' : '🎲 Autres jeux'))));
  playSound('fanfare');
  say(me(), [
    `${title} ${stars} étoile${stars > 1 ? 's' : ''} !`,
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
    h('button', { class: 'big-btn dress-btn', onclick: characterScreen }, '🎨 Habiller mon personnage'),
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

/** Couleurs de tee-shirt et accessoires, débloqués au fil des étoiles gagnées. */
function characterScreen(message = '') {
  const kid = child();
  const style = kid.style || {};
  const stars = kid.stars;
  const choose = (patch) => {
    kid.style = { ...style, ...patch };
    save();
    applySettings();
    characterScreen();
    playSound('success');
  };
  const lock = (need) => h('span', { class: 'lock' }, `🔒 ${need} ⭐`);
  show(h('main', { class: 'screen dress' },
    topBar({ onBack: homeScreen, title: '🎨 Mon personnage', right: starCounter() }),
    message ? h('p', { class: 'toast', role: 'status' }, message) : null,
    h('div', { class: 'dress-preview' }, avatar(store.active, 'avatar-xl')),
    kid.photo ? h('p', { class: 'muted small dress-note' }, 'Avec une photo, seuls les accessoires se voient.') : null,
    h('section', { class: 'card' },
      h('h2', {}, 'Mon tee-shirt'),
      h('div', { class: 'shirt-row' }, SHIRTS.map((shirt) => {
        const open = stars >= shirt.stars;
        return h('button', {
          class: `shirt-btn${style.shirt === shirt.id ? ' on' : ''}`,
          'data-shirt': shirt.id,
          disabled: !open,
          'aria-label': open ? `Tee-shirt ${shirt.id}` : `Tee-shirt ${shirt.id}, ${shirt.stars} étoiles`,
          'aria-pressed': String(style.shirt === shirt.id),
          onclick: () => choose({ shirt: shirt.id }),
        }, h('span', { class: 'shirt-swatch', style: { background: shirt.color } }, style.shirt === shirt.id ? '✓' : ''), open ? null : lock(shirt.stars));
      }))),
    h('section', { class: 'card' },
      h('h2', {}, 'Mes accessoires'),
      h('div', { class: 'accessory-grid' },
        h('button', { class: `accessory-btn${!style.accessory ? ' on' : ''}`, onclick: () => choose({ accessory: null }), 'aria-pressed': String(!style.accessory) },
          h('span', { class: 'accessory-emoji' }, '🚫'), h('span', {}, 'Rien')),
        ACCESSORIES.map((item) => {
          const open = stars >= item.stars;
          return h('button', {
            class: `accessory-btn${style.accessory === item.id ? ' on' : ''}`,
            'data-accessory': item.id,
            disabled: !open,
            'aria-pressed': String(style.accessory === item.id),
            onclick: () => choose({ accessory: item.id }),
          }, h('span', { class: 'accessory-emoji' }, item.emoji), open ? h('span', {}, item.label) : lock(item.stars));
        })))));
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

function toggle(label, value, onChange) {
  const box = h('input', { type: 'checkbox', checked: value, role: 'switch' });
  box.addEventListener('change', () => onChange(box.checked));
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
        await navigator.share({ title: APP.name, text: `${APP.name} : des jeux pour apprendre à lire, à compter et l’anglais.`, url });
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
      toggle('Consignes lues à voix haute', store.settings.voice, (v) => { store.settings.voice = v; applySettings(); save(); }),
      voiceList.length ? voiceRow(voiceList) : null,
      toggle('Petits sons', store.settings.sounds, (v) => { store.settings.sounds = v; applySettings(); save(); }),
      toggle('Musique douce (accueil et menus)', Boolean(store.settings.music), (v) => { store.settings.music = v; save(); if (!v) stopMusic(); }),
      toggle('Décors de saison (Noël, Halloween…)', store.settings.seasonal !== false, (v) => { store.settings.seasonal = v; save(); }),
      h('div', { class: 'setting' }, h('span', {}, 'Questions par partie'), lengthSelect),
      h('p', { class: 'muted small' }, 'Voix plus naturelles : Réglages de l’iPhone → Accessibilité → Contenu énoncé → Voix → Français, puis téléchargez une voix « Premium » ou « améliorée ».')),
    isStandalone() ? null : h('section', { class: 'card' },
      h('h2', {}, 'Installer sur l’écran d’accueil'),
      h('ol', { class: 'plain-list' },
        h('li', {}, 'Touchez Partager (le carré avec une flèche).'),
        h('li', {}, 'Faites défiler, puis touchez « Sur l’écran d’accueil ».'),
        h('li', {}, 'Touchez « Ajouter » : l’icône apparaît, l’app marche sans Internet.'))),
    h('section', { class: 'card about' },
      h('h2', {}, 'À propos'),
      h('div', { class: 'setting' }, h('span', {}, 'Version'), h('b', { 'data-version': APP.version }, APP.version)),
      h('details', { class: 'changelog' },
        h('summary', {}, 'Journal des modifications'),
        CHANGELOG.map((entry) => h('div', { class: 'changelog-entry' },
          h('h3', {}, `Version ${entry.version}`, h('span', { class: 'muted small' }, ` · ${new Date(entry.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`)),
          h('ul', { class: 'plain-list' }, entry.changes.map((c) => h('li', {}, c)))))),
      h('div', { class: 'credits' },
        h('p', {}, h('b', {}, APP.name), ' · conçue par ', h('b', {}, APP.author)),
        h('p', { class: 'contact' }, 'Une remarque, un bug, une idée ? Écrivez à ',
          h('a', { class: 'link-action', href: `mailto:${APP.contact}?subject=${encodeURIComponent(APP.name)}`, 'data-contact': '' }, APP.contact), '.'),
        h('p', { class: 'muted small' }, 'Police Andika © SIL International (licence OFL).'))));
}

// ---------------------------------------------------------------- Démarrage

document.addEventListener('pointerdown', unlockAudio, { capture: true });
document.addEventListener('visibilitychange', () => { if (document.hidden) stopMusic(); });
document.addEventListener('pointerdown', (e) => {
  if (e.target.closest('button')) playSound('tap');
});

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// Au lancement : « Qui joue ? » (sauf si l'app est rouverte pendant la même séance).
if (store.active && sessionFlag('playing')) homeScreen();
else profileScreen();
sessionFlag('playing', true);
