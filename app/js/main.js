// Point d'entrée : profils, navigation entre les écrans et déroulement d'une partie.

import { findGame } from './games/index.js';
import { CALC_PALIERS, equationHolds } from './games/maths.js';
import { canMove, solveMaze } from './games/labyrinthes.js';
import { levelRange, programFor } from './programs.js';
import { createRng, pick, randInt } from './random.js';
import { palierStarsAfter, PALIER_MAX_STARS, recordAnswer, starsFor } from './progress.js';
import { newStickers, STICKERS, starsToNextSticker, stickersUnlocked } from './rewards.js';
import { GRADES, gameStats, loadStore, logMistake, logSession, resetChild, saveStore } from './storage.js';
import { listFrenchVoices, setSpeechEnabled, setVoicePreferences, speak, stopSpeaking } from './speech.js';
import { playSound, setSoundsEnabled, unlockAudio } from './sounds.js';
import { avatar, h, renderChoiceContent, renderStage, revealWord, setPhotos } from './render.js';
import { CHARACTERS, character } from './characters.js';
import { dashboard } from './dashboard.js';
import { squarePhoto } from './photo.js';
import { APP, CHANGELOG } from './config.js';

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

function me() {
  return character(store.active);
}

function applySettings() {
  setSpeechEnabled(store.settings.voice);
  setSoundsEnabled(store.settings.sounds);
  setVoicePreferences(store.settings.voices);
  setPhotos(Object.fromEntries(Object.entries(store.profiles).map(([id, kid]) => [id, kid.photo])));
}

function save() {
  return saveStore(store);
}

function show(...children) {
  stopSpeaking();
  app.replaceChildren(...children.filter(Boolean));
  window.scrollTo(0, 0);
}

/**
 * Typographie française : espace insécable avant ? ! : ; et trait d'union insécable
 * (« Eva-Rose » ne se coupe jamais en fin de ligne).
 */
function frenchSpacing(text) {
  return text.replace(/ ([?!:;])/g, '\u00a0$1').replace(/(\p{L})-(\p{L})/gu, '$1\u2011$2');
}

/** Fait parler Eva-Rose ou Matteo, chacun avec sa voix. */
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

function profileScreen() {
  show(h('main', { class: 'screen profiles' },
    h('header', { class: 'top-bar' }, h('span'), h('span'),
      h('div', { class: 'grown-up-btns' },
        h('button', { class: 'parent-btn', onclick: () => parentGate(parentsScreen), 'aria-label': 'Suivi des parents' }, '👪'),
        h('button', { class: 'parent-btn settings-btn', onclick: () => parentGate(settingsScreen), 'aria-label': 'Réglages' }, '⚙️'))),
    h('h1', { class: 'profiles-title' }, 'Qui joue ?'),
    h('div', { class: 'profile-list' },
      CHARACTERS.map((c) => {
        const kid = store.profiles[c.id];
        return h('button', { class: `profile-card profile-${c.id}`, 'data-profile': c.id, onclick: () => chooseProfile(c) },
          avatar(c.id, 'avatar-xl'),
          h('span', { class: 'profile-name' }, frenchSpacing(c.name)),
          h('span', { class: 'profile-grade' }, GRADES[kid.grade]),
          h('span', { class: 'profile-stars' }, '⭐ ', kid.stars));
      }))));
}

function chooseProfile(c) {
  store.active = c.id;
  save();
  homeScreen();
  say(c, `Bonjour ${c.spoken} !`);
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
      h('h1', { class: 'home-title' }, frenchSpacing(`Bonjour ${c.name} !`))),
    h('nav', { class: 'home-menu' },
      domains.map((d) => h('button', { class: `domain-btn domain-${d.id}`, 'data-domain': d.id, onclick: () => domainScreen(d.id) },
        h('span', { class: 'domain-icon', 'aria-hidden': 'true' }, d.icon), h('span', {}, d.title))),
      h('button', { class: 'domain-btn domain-album', onclick: albumScreen },
        h('span', { class: 'domain-icon', 'aria-hidden': 'true' }, '🏆'),
        h('span', {}, 'Mon album'),
        h('span', { class: 'pill' }, `${stickersUnlocked(child().stars)}/${STICKERS.length}`)))));
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

function startSession(game, { level, back } = {}) {
  const { min, max } = levelRange(child().grade, game.id);
  const stats = gameStats(child(), game.id, min);
  const startLevel = level || Math.min(max, Math.max(min, stats.level));
  const session = {
    game,
    min,
    max,
    back: back || (() => domainScreen(game.domain)),
    index: 0,
    total: store.settings.sessionLength,
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
  const custom = { build: buildZone, maze: mazeZone, path: pathZone, lasso: lassoZone, sudoku: sudokuZone }[q.interaction];
  if (custom) {
    ({ stage, zone } = custom(ctx));
  } else {
    if (q.stage.type !== 'none') stage = h('div', { class: 'stage' }, renderStage(q.stage, { replay, speak: (parts) => say(guide, parts) }));
    if (q.interaction === 'keypad') zone = keypadZone(ctx);
    else if (q.interaction === 'match') zone = matchZone(ctx);
    else if (q.interaction === 'fill') zone = fillZone(ctx);
    else if (q.interaction === 'order') zone = orderZone(ctx);
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
  say(guide, brief ? (q.short.speak ?? q.short.text) : q.instruction);
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
    logMistake(child(), { at: new Date().toISOString(), game: session.game.id, question: q.text, expected: q.answer, given });
    save();
  }
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
    const [x1, y1] = local(ra.right, ra.top + ra.height / 2);
    const [x2, y2] = local(rb.left, rb.top + rb.height / 2);
    const line = svgEl('line', { x1, y1, x2, y2, stroke: color });
    lines.append(line);
    return line;
  };
  const tryPair = (trace = null) => {
    if (pending.left === null || pending.right === null) return;
    const a = lefts[pending.left];
    const b = rights.find((r) => String(r.dataset.right) === String(pending.right) && !r.disabled);
    if (q.pairs[pending.left].right === pending.right) {
      const color = q.vanish ? 'var(--good)' : PAIR_COLORS[matched % PAIR_COLORS.length];
      for (const el of [a, b]) {
        el.classList.remove('selected');
        el.classList.add('matched');
        el.style.setProperty('--pair', color);
        el.disabled = true;
      }
      let line = trace;
      if (line) line.setAttribute('class', 'trace done');
      else line = drawLine(a, b, color);
      line.style.stroke = color;
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
    unlocked.length
      ? h('div', { class: 'new-sticker' }, h('span', { class: 'sticker-big' }, unlocked.at(-1).emoji), h('p', {}, 'Nouvel autocollant !'))
      : null,
    h('div', { class: 'result-actions' },
      h('button', { class: 'big-btn primary', onclick: () => startSession(game, { level: game.paliers ? session.levelState.level : undefined, back: session.back }) }, '🔁 Rejouer'),
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
    h('p', { class: 'album-info' }, remaining === null
      ? 'Bravo, ton album est complet !'
      : frenchSpacing(`Encore ${remaining} ⭐ !`)),
    h('div', { class: 'sticker-grid' },
      STICKERS.map((s, i) => (i < unlocked
        ? h('button', { class: 'sticker', onclick: () => speak(s.name), 'aria-label': s.name }, s.emoji)
        : h('span', { class: 'sticker locked', 'aria-label': 'À gagner' }, '?'))))));
  speak(remaining === null ? 'Bravo, ton album est complet !' : `Encore ${remaining} étoile${remaining > 1 ? 's' : ''} pour le prochain autocollant.`);
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
  const box = h('input', { type: 'checkbox', checked: value });
  box.addEventListener('change', () => onChange(box.checked));
  return h('label', { class: 'setting' }, h('span', {}, label), box);
}

function parentsScreen(selectedId = store.active || CHARACTERS[0].id) {
  const tabs = h('div', { class: 'segmented tabs' }, CHARACTERS.map((c) => h('button', {
    class: c.id === selectedId ? 'seg on' : 'seg',
    'data-child': c.id,
    onclick: () => parentsScreen(c.id),
  }, avatar(c.id, 'avatar-xs'), c.name)));

  const kid = store.profiles[selectedId];
  const gradeSelect = h('select', { class: 'select', 'aria-label': 'Classe' },
    Object.entries(GRADES).map(([id, label]) => h('option', { value: id, selected: kid.grade === id }, label)));
  gradeSelect.addEventListener('change', () => {
    kid.grade = gradeSelect.value;
    save();
    parentsScreen(selectedId);
  });

  show(h('main', { class: 'screen parents' },
    topBar({
      onBack: () => (store.active ? homeScreen() : profileScreen()),
      title: '👪 Suivi',
      right: h('button', { class: 'parent-btn settings-btn', onclick: () => settingsScreen(), 'aria-label': 'Réglages' }, '⚙️'),
    }),
    tabs,
    h('section', { class: 'card' },
      h('h2', {}, `Profil de ${character(selectedId).name}`),
      h('label', { class: 'setting' }, h('span', {}, 'Classe'), gradeSelect)),
    dashboard({ kid, grade: kid.grade, onChange: save }),
    isStandalone() ? null : h('section', { class: 'card' },
      h('h2', {}, 'Installer sur l’iPhone ou l’iPad'),
      h('p', { class: 'muted' }, 'Dans Safari : Partager, puis « Sur l’écran d’accueil ». L’app fonctionne ensuite sans Internet.')),
    h('details', { class: 'card tips' },
      h('summary', {}, 'Conseils'),
      h('ul', {},
        h('li', {}, '10 à 15 minutes par jour valent mieux qu’une longue séance.'),
        h('li', {}, 'Le niveau s’adapte seul pour viser 80 % de réussite.'),
        h('li', {}, 'Dans « Combien ? », faites toucher chaque objet en comptant.'))),
    h('section', { class: 'card' },
      h('h2', {}, 'Données'),
      h('p', { class: 'muted' }, 'Tout reste sur cet appareil.'),
      h('button', {
        class: 'big-btn danger',
        onclick: () => {
          if (confirm(`Effacer toute la progression de ${character(selectedId).name} ?`)) {
            resetChild(store, selectedId);
            save();
            parentsScreen(selectedId);
          }
        },
      }, `Effacer la progression de ${character(selectedId).name}`))));
}

// ---------------------------------------------------------------- Réglages

function photoRow(c) {
  const kid = store.profiles[c.id];
  const status = h('p', { class: 'photo-status muted small', 'aria-live': 'polite' });
  const input = h('input', { type: 'file', accept: 'image/*', class: 'visually-hidden', 'data-photo-input': c.id });
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
      settingsScreen(`Photo de ${c.name} enregistrée ✓`);
    } catch {
      status.textContent = 'Impossible de lire cette image.';
    }
  });
  return h('div', { class: 'photo-row', 'data-photo-row': c.id },
    avatar(c.id, 'avatar-md'),
    h('div', { class: 'photo-actions' },
      h('span', { class: 'game-row-title' }, c.name),
      h('label', { class: 'big-btn primary photo-btn' }, '📷 Choisir une photo', input),
      kid.photo
        ? h('button', {
          class: 'link-action',
          onclick: () => {
            kid.photo = null;
            save();
            applySettings();
            settingsScreen(`${c.name} retrouve son dessin.`);
          },
        }, 'Revenir au dessin')
        : null,
      status));
}

function voiceRow(c, voiceList) {
  const select = h('select', { class: 'select', 'aria-label': `Voix de ${c.name}` },
    h('option', { value: '' }, 'Automatique (la plus naturelle)'),
    voiceList.map((v) => h('option', { value: v.id, selected: store.settings.voices[c.voice.voice] === v.id }, `${v.name} (${v.lang})`)));
  select.addEventListener('change', () => {
    store.settings.voices = { ...store.settings.voices, [c.voice.voice]: select.value || undefined };
    save();
    applySettings();
    say(c, c.hello);
  });
  return h('div', { class: 'setting voice-row' },
    h('span', {}, c.name),
    h('div', { class: 'voice-ctrl' }, select,
      h('button', { class: 'mini-btn', 'aria-label': `Écouter la voix de ${c.name}`, onclick: () => say(c, c.hello) }, '▶')));
}

function settingsScreen(message = '') {
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

  show(h('main', { class: 'screen parents settings' },
    topBar({ onBack: () => (store.active ? homeScreen() : profileScreen()), title: '⚙️ Réglages' }),
    message ? h('p', { class: 'toast', role: 'status' }, message) : null,
    h('section', { class: 'card' },
      h('h2', {}, 'Photos des profils'),
      h('p', { class: 'muted small' }, 'Photothèque ou appareil photo. Enregistrement automatique, la photo reste sur l’appareil.'),
      CHARACTERS.map(photoRow)),
    h('section', { class: 'card' },
      h('h2', {}, 'Voix et sons'),
      toggle('Consignes lues à voix haute', store.settings.voice, (v) => { store.settings.voice = v; applySettings(); save(); }),
      voiceList.length ? CHARACTERS.map((c) => voiceRow(c, voiceList)) : null,
      toggle('Petits sons', store.settings.sounds, (v) => { store.settings.sounds = v; applySettings(); save(); }),
      h('div', { class: 'setting' }, h('span', {}, 'Questions par partie'), lengthSelect),
      h('p', { class: 'muted small' }, 'Voix plus naturelles : Réglages de l’iPhone → Accessibilité → Contenu énoncé → Voix → Français, puis téléchargez une voix « Premium » ou « améliorée ».')),
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
        h('p', { class: 'muted small' }, 'Avec Eva-Rose et Matteo. Police Andika © SIL International (licence OFL).')))));
}

// ---------------------------------------------------------------- Démarrage

document.addEventListener('pointerdown', unlockAudio, { capture: true });
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
