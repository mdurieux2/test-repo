// Point d'entrée : profils, navigation entre les écrans et déroulement d'une partie.

import { findGame } from './games/index.js';
import { CALC_PALIERS, equationHolds } from './games/maths.js';
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
    blocks.push(h('button', {
      class: 'game-card',
      'data-game': game.id,
      onclick: () => (game.paliers ? palierMap(min, max) : startSession(game)),
    },
    h('span', { class: 'game-icon', 'aria-hidden': 'true' }, game.icon),
    h('span', { class: 'game-title' }, game.title),
    game.paliers ? palierSummary(min, max) : levelDots(level, min, max),
    stats.bestStars ? h('span', { class: 'best' }, '⭐'.repeat(stats.bestStars)) : null));
  }
  show(h('main', { class: `screen domain domain-theme-${domain.id}` },
    topBar({ onBack: homeScreen, title: `${domain.icon} ${domain.title}`, right: starCounter() }),
    h('div', { class: 'game-grid' }, blocks)));
  say(guide, `${domain.title}. Choisis un jeu !`);
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
    startedAt: Date.now(),
    levelState: { level: startLevel, streak: game.paliers ? 0 : stats.streak, recent: game.paliers ? [] : stats.recent },
    formatOffset: Number(new URLSearchParams(location.search).get('format') || 0),
  };
  nextQuestion(session);
}

function newQuestion(session) {
  let q;
  for (let i = 0; i < 10; i++) {
    q = session.game.generate(session.levelState.level, rng, session.index + session.formatOffset);
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
  const replay = () => say(guide, q.replay || q.instruction);
  const progress = h('div', { class: 'progress', 'aria-label': `Question ${session.index + 1} sur ${session.total}` },
    Array.from({ length: session.total }, (_, i) =>
      h('span', { class: i < session.index ? 'step done' : i === session.index ? 'step current' : 'step' })));
  const feedback = h('div', { class: 'feedback', 'aria-live': 'polite' });
  const ctx = { session, q, feedback };

  let stage = null;
  let zone;
  if (q.interaction === 'build') {
    ({ stage, zone } = buildZone(ctx));
  } else {
    if (q.stage.type !== 'none') stage = h('div', { class: 'stage' }, renderStage(q.stage, { replay }));
    if (q.interaction === 'keypad') zone = keypadZone(ctx);
    else if (q.interaction === 'match') zone = matchZone(ctx);
    else if (q.interaction === 'fill') zone = fillZone(ctx);
    else zone = choiceZone(ctx);
  }
  if (stage) enableCounting(stage, guide);

  const badge = game.badge ? game.badge(session.levelState.level) : `Niv. ${session.levelState.level - session.min + 1}`;
  show(h('main', { class: `screen play domain-theme-${game.domain} play-${q.interaction || 'choice'}` },
    topBar({ onBack: session.back, backLabel: 'Quitter', title: progress, right: h('span', { class: 'level-badge' }, badge) }),
    h('div', { class: 'instruction' },
      h('button', { class: 'guide-btn', onclick: replay, 'aria-label': `Réécouter ${guide.name}` },
        avatar(guide.id, 'avatar-sm'), h('span', { class: 'speak-badge', 'aria-hidden': 'true' }, '🔊')),
      h('button', { class: 'bubble bubble-left', onclick: replay }, frenchSpacing(q.text))),
    stage,
    zone,
    feedback));
  say(guide, q.instruction);
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
  const lefts = q.pairs.map((p, i) => h('button', { class: 'match-item left', 'data-left': i }, p.left));
  const rights = q.rights.map((v) => h('button', { class: 'match-item right', 'data-right': v }, v));
  const zone = h('div', { class: 'choices match' }, lines, h('div', { class: 'match-col' }, lefts), h('div', { class: 'match-col' }, rights));

  const drawLine = (a, b, color) => {
    const box = zone.getBoundingClientRect();
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', ra.right - box.left);
    line.setAttribute('y1', ra.top + ra.height / 2 - box.top);
    line.setAttribute('x2', rb.left - box.left);
    line.setAttribute('y2', rb.top + rb.height / 2 - box.top);
    line.setAttribute('stroke', color);
    lines.append(line);
  };
  const tryPair = () => {
    if (pending.left === null || pending.right === null) return;
    const a = lefts[pending.left];
    const b = rights.find((r) => Number(r.dataset.right) === pending.right && !r.disabled);
    if (q.pairs[pending.left].right === pending.right) {
      const color = PAIR_COLORS[matched % PAIR_COLORS.length];
      for (const el of [a, b]) {
        el.classList.remove('selected');
        el.classList.add('matched');
        el.style.setProperty('--pair', color);
        el.disabled = true;
      }
      drawLine(a, b, color);
      matched++;
      playSound('tap');
      if (matched === q.pairs.length) {
        zone.classList.add('answered');
        markCorrect(ctx);
      }
    } else {
      for (const el of [a, b]) {
        el.classList.remove('selected');
        el.classList.add('shake');
        setTimeout(() => el.classList.remove('shake'), 400);
      }
      markWrong(ctx, { given: `${q.pairs[pending.left].left} → ${pending.right}` });
    }
    pending = { left: null, right: null };
  };
  lefts.forEach((el, i) => el.addEventListener('click', () => {
    if (ctx.session.locked) return;
    lefts.forEach((x) => x.classList.remove('selected'));
    el.classList.add('selected');
    pending.left = i;
    tryPair();
  }));
  rights.forEach((el) => el.addEventListener('click', () => {
    if (ctx.session.locked) return;
    rights.forEach((x) => x.classList.remove('selected'));
    el.classList.add('selected');
    pending.right = Number(el.dataset.right);
    tryPair();
  }));
  return zone;
}

// ---- Complète (□ + □ = 8)

function fillZone(ctx) {
  const { q } = ctx;
  const boxes = q.equations.map(() => [null, null]); // index de la tuile posée dans chaque case
  let selected = null;
  let checks = 0;
  const tileEls = q.tiles.map((v, t) => h('button', { class: 'tile', 'data-value': v, 'data-tile': t }, v));
  const boxEls = q.equations.map((_, r) => [0, 1].map((c) => h('button', { class: 'fill-box', 'data-row': r, 'data-col': c, 'aria-label': 'Case vide' })));
  const rowEls = q.equations.map((eq, r) => h('div', { class: 'fill-row' },
    boxEls[r][0], h('span', { class: 'op' }, eq.op), boxEls[r][1], h('span', { class: 'op' }, '='), h('span', { class: 'num' }, eq.result)));

  const refresh = () => {
    boxEls.forEach((row, r) => row.forEach((el, c) => {
      const t = boxes[r][c];
      el.textContent = t === null ? '' : q.tiles[t];
      el.classList.toggle('filled', t !== null);
      el.classList.toggle('selected', Boolean(selected) && selected[0] === r && selected[1] === c);
    }));
    const used = new Set(boxes.flat().filter((t) => t !== null));
    tileEls.forEach((el, t) => {
      el.classList.toggle('used', used.has(t));
      el.disabled = used.has(t);
    });
  };
  const value = (r, c) => q.tiles[boxes[r][c]];
  const showSolution = () => {
    const free = q.tiles.map((_, t) => t);
    q.equations.forEach((eq, r) => eq.solution.forEach((v, c) => {
      const t = free.find((i) => q.tiles[i] === v);
      free.splice(free.indexOf(t), 1);
      boxes[r][c] = t;
    }));
    refresh();
    rowEls.forEach((row) => row.classList.add('right'));
    zone.classList.add('answered');
    setTimeout(() => markCorrect(ctx), 1500);
  };
  const check = () => {
    checks++;
    const wrong = q.equations.map((eq, r) => !equationHolds(eq, value(r, 0), value(r, 1)));
    rowEls.forEach((row, r) => row.classList.toggle('right', !wrong[r]));
    if (!wrong.includes(true)) {
      zone.classList.add('answered');
      markCorrect(ctx);
      return;
    }
    if (checks >= 3) {
      // après 3 essais, on montre la solution pour ne pas bloquer l'enfant
      markWrong(ctx, { message: 'Regarde la solution.', given: 'solution montrée' });
      showSolution();
      return;
    }
    wrong.forEach((isWrong, r) => {
      if (!isWrong) return;
      rowEls[r].classList.add('shake');
      setTimeout(() => rowEls[r].classList.remove('shake'), 400);
      boxes[r] = [null, null];
    });
    refresh();
    markWrong(ctx, { given: 'calcul faux' });
  };
  boxEls.forEach((row, r) => row.forEach((el, c) => el.addEventListener('click', () => {
    if (ctx.session.locked) return;
    if (boxes[r][c] !== null) boxes[r][c] = null; // la tuile retourne en bas
    else selected = [r, c];
    refresh();
  })));
  tileEls.forEach((el, t) => el.addEventListener('click', () => {
    if (ctx.session.locked || el.disabled) return;
    let target = selected && boxes[selected[0]][selected[1]] === null ? selected : null;
    for (let r = 0; r < boxes.length && !target; r++) {
      for (let c = 0; c < 2 && !target; c++) if (boxes[r][c] === null) target = [r, c];
    }
    if (!target) return;
    boxes[target[0]][target[1]] = t;
    selected = null;
    refresh();
    if (boxes.flat().every((x) => x !== null)) setTimeout(check, 250);
  }));
  const zone = h('div', { class: 'choices fill' },
    h('div', { class: 'fill-rows' }, rowEls),
    h('div', { class: 'tile-tray' }, tileEls));
  return zone;
}

// ---- Le panier : fabriquer une collection

function buildZone(ctx) {
  const { q } = ctx;
  const { emoji, tens, perRow, max } = q.stage;
  let singles = 0;
  let bags = 0;
  const basket = h('div', { class: `basket per-${perRow}` });
  const counter = h('p', { class: 'basket-count', hidden: true });
  const total = () => singles + 10 * bags;
  const render = () => {
    basket.replaceChildren(
      ...Array.from({ length: bags }, () => h('button', {
        class: 'bag-item',
        'aria-label': 'Enlever un sachet de 10',
        onclick: () => { bags--; render(); },
      }, Array.from({ length: 10 }, () => h('span', {}, emoji)))),
      h('div', { class: 'basket-singles' }, Array.from({ length: singles }, () =>
        h('button', { class: 'basket-item', 'aria-label': 'Enlever', onclick: () => { singles--; render(); } }, emoji))));
    if (!bags && !singles) basket.append(h('span', { class: 'basket-empty' }, '🧺'));
    counter.textContent = `Tu en as mis ${total()}.`;
  };
  const add = (n) => {
    if (ctx.session.locked || total() + n > max) return;
    if (n === 10) bags++;
    else singles++;
    render();
  };
  const validate = () => {
    if (ctx.session.locked) return;
    if (total() === q.answer) {
      zone.classList.add('answered');
      markCorrect(ctx);
      return;
    }
    if (ctx.session.attempts >= 1) counter.hidden = false;
    markWrong(ctx, { message: total() > q.answer ? 'Il y en a trop !' : 'Il en manque !', given: total() });
  };
  render();
  const zone = h('div', { class: 'choices build' },
    h('div', { class: 'build-buttons' },
      h('button', { class: 'add-btn', 'data-add': '1', onclick: () => add(1) }, h('span', { class: 'add-emoji' }, emoji), '+1'),
      tens ? h('button', { class: 'add-btn bag', 'data-add': '10', onclick: () => add(10) }, h('span', { class: 'add-emoji' }, '🛍️'), '+10') : null),
    h('button', { class: 'big-btn primary validate-btn', onclick: validate }, '✔ J’ai fini'));
  return { stage: h('div', { class: 'stage stage-build' }, basket, counter), zone };
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
