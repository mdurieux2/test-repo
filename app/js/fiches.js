// Fiches à imprimer (espace parents) : pour les jours sans écran, des exercices tirés par
// generate() au niveau choisi, transformés en exercices « papier » (entourer, cocher, écrire dans
// une case, relier, numéroter…), avec leurs corrigés. Ce fichier ne fabrique que des données
// (pas de DOM) : le dessin de la fiche et l'écran sont dans fiches-ecran.js.

import { GAMES } from './games/index.js';
import { createRng } from './random.js';

export const FICHE_MIN = 6;
export const FICHE_MAX = 12;
// place sur la feuille, en « petits calculs » (exerciseSize) : on tire un peu plus que ce qui tient,
// l'écran retire ensuite les derniers exercices qui dépasseraient de la feuille A4
const FICHE_ROOM = 18;

/**
 * Jeux qui ne s'impriment pas : on les joue en glissant, en écoutant, en coloriant ou en
 * cherchant sur une carte (le papier n'apporterait rien), ou presque toutes leurs questions
 * s'écoutent. Tous les autres jeux ont leur fiche, aux niveaux donnés par ficheLevels (vérifié par
 * tests/fiches.test.js : un niveau ajouté qui ne s'imprime pas oblige à lister les autres dans FICHE_NIVEAUX).
 */
export const NON_IMPRIMABLES = new Set([
  'histoires', 'ecoute', // à l'oreille
  'vite-vu', // en vue éclair
  // au doigt, en manipulant ou en coloriant
  'panier', 'patates', 'puzzle', 'memory', 'memory-anglais', 'coloriage-magique', 'colorie-anglais',
  'labyrinthe-rond', 'chemin-nombres', 'chemin-lettres', 'carte-monde',
  'tangram', // des pièces qu'on reconnaît à leur couleur et qu'on fait tourner
  'fluence', // lire à voix haute en une minute, avec un adulte qui écoute et touche les mots ratés
]);

/**
 * Jeux dont certains niveaux seulement s'impriment (les autres s'écoutent, ou n'ont pas assez de
 * questions différentes pour remplir une feuille). Les autres jeux s'impriment à tous les niveaux.
 */
export const FICHE_NIVEAUX = {
  'syllabes-rythme': [1, 2, 3, 4, 5, 6, 8],
  lettres: [4, 5, 6, 7],
  syllabes: [7, 8],
  'petits-mots': [4, 5, 6, 7, 8],
  ponctuation: [1, 2, 6, 7, 8, 9, 10],
  dictee: [1, 2, 3, 4],
  'ordre-histoire': [1, 2, 3, 5, 6, 7, 8, 9, 10],
  'droite-numerique': [1, 3, 4, 6, 7, 9, 10],
  partage: [4, 8, 9, 10],
  points: [4, 5, 6, 7],
  monnaie: [1, 2, 4, 5, 7],
  corps: [2, 3, 4, 5, 6, 7, 8, 9, 10],
  electricite: [1, 2, 3, 4, 5, 7, 9, 10],
  'epelle-anglais': [1, 2, 3, 4, 5, 6, 7, 9, 10],
  'compte-anglais': [3, 4, 6, 7],
  'nombres-anglais': [3, 7, 8],
  'calcul-anglais': [1, 2, 3, 4, 5, 6],
  'couleurs-anglais': [1, 2, 3, 5, 7],
  'intrus-anglais': [1, 2, 4, 6, 7],
  'contraires-anglais': [1, 2, 4, 6],
  'ou-est': [3, 5],
  'phrase-anglais': [1, 2, 3, 4, 6, 7],
  'parle-anglais': [1, 2, 3, 5, 6, 7, 8],
};

/** Les niveaux d'un jeu qui ont une fiche. */
export function ficheLevels(game) {
  if (NON_IMPRIMABLES.has(game.id)) return [];
  return FICHE_NIVEAUX[game.id] || game.levels.map((_, i) => i + 1);
}

// Ce qui ne se voit pas sur le papier : un son à écouter, une vue éclair, une histoire lue en karaoké.
const SKIP_STAGES = new Set(['listen', 'flash', 'karaoke']);

/** Une consigne de l'app, dite pour le papier : on entoure (ou on coche) au lieu de toucher. */
export function paperText(text, verb = 'Entoure') {
  if (typeof text !== 'string') return '';
  const lower = verb.toLowerCase();
  return text
    .replace(/\bTouche-les\b/g, `${verb}-les`)
    .replace(/\bTouche\b/g, verb)
    .replace(/\btouche-les\b/g, `${lower}-les`)
    .replace(/\btouche\b/g, lower)
    .replace(/\bGlisse les nombres\b/g, 'Écris les nombres')
    .replace(/ avec ton doigt/g, '')
    .replace(/ en touchant les lettres/g, '');
}

/** Réponses longues (des phrases) : on coche une case ; sinon on entoure la bonne réponse. */
function tickChoices(q) {
  return q.choices.some((c) => typeof c.label === 'string' && c.label.length > 16);
}

/** Le texte écrit d'un choix (pour le corrigé et les tests). */
export function choiceText(choice) {
  if (!choice) return '';
  if (choice.frac) return `${choice.frac.n}/${choice.frac.d}`;
  if (choice.column) return 'les unités sous les unités';
  if ((typeof choice.label === 'string' && choice.label) || typeof choice.label === 'number') {
    const label = String(choice.label);
    return choice.name && label.length <= 2 && !/\p{L}|\d/u.test(label) ? `${label} (${choice.name})` : label;
  }
  if (choice.name) return choice.name;
  if (choice.objects) return String(choice.objects.count);
  return String(choice.value);
}

/** Résultat d'une opération posée en colonnes. */
function columnResult({ op, rows }) {
  if (op === '+') return rows.reduce((a, b) => a + b, 0);
  if (op === '×') return rows.reduce((a, b) => a * b, 1);
  return rows.slice(1).reduce((a, b) => a - b, rows[0]);
}

/**
 * Une question du jeu, transformée en exercice papier ; null si elle ne s'imprime pas (à écouter,
 * à manipuler…). L'exercice garde les données de la question nécessaires au dessin et au corrigé.
 */
export function exerciseFrom(q) {
  if (!q || q.listenOnly || !q.stage || SKIP_STAGES.has(q.stage.type)) return null;
  const base = { key: q.key, stage: q.stage };
  switch (q.interaction) {
    case undefined: {
      if (!Array.isArray(q.choices) || q.choices.length < 2) return null;
      const answer = q.choices.findIndex((c) => c.value === q.answer);
      if (answer < 0) return null;
      const tick = tickChoices(q);
      return {
        ...base, kind: 'choice', text: paperText(q.text, tick ? 'Coche' : 'Entoure'), tick,
        choices: q.choices, choiceStyle: q.choiceStyle || '', answer,
      };
    }
    case 'keypad':
      return { ...base, kind: 'number', text: paperText(q.text), answer: q.answer };
    case 'fill':
      return {
        ...base, kind: 'fill', text: 'Écris un nombre dans chaque case pour que les calculs soient justes. Utilise chaque nombre une fois.',
        equations: q.equations.map(({ op, result, solution }) => ({ op, result, solution: [...solution] })), tiles: [...q.tiles],
      };
    case 'match':
      return {
        ...base, kind: 'match', text: paperText(q.text).replace(/^Relie\b/, 'Relie avec un trait'),
        pairs: q.pairs.map(({ left, right, emoji, objects }) => ({ left, right, emoji, objects })),
        rights: [...q.rights], rightLang: q.rightLang || null,
      };
    case 'order': {
      const sorted = q.items.filter((it) => it.value !== null)
        .sort((a, b) => (q.order === 'desc' ? b.value - a.value : a.value - b.value));
      // pas de signe entre les cases : des lettres, des syllabes ou des mots à écrire dans l'ordre
      const write = q.sign === '';
      const answer = write && typeof q.answer === 'string'
        ? q.answer
        : sorted.map((it) => it.label ?? '').join(write ? '' : ' ');
      return {
        ...base, kind: 'order', mode: write ? 'write' : 'number', lang: q.lang || null,
        text: write
          ? paperText(q.text).replace(/ : entoure les (lettres|syllabes|mots) dans l’ordre\./, ' avec ces $1.')
            .replace(/,? et entoure les mots dans l’ordre( pour écrire la phrase)?\./, ' : écris les mots dans l’ordre.')
            .replace(/^Entoure les (lettres|syllabes|mots) dans l’ordre/, 'Écris les $1 dans l’ordre')
            .replace(/^Écoute le mot, et écris-le\.?/, 'Regarde l’image, et écris le mot avec ces lettres.')
          : paperText(q.text, q.items.some((it) => it.emoji) ? 'Numérote' : 'Range'),
        items: q.items.map(({ value, label, emoji, scale, caption }) => ({ value, label, emoji, scale, caption })),
        sorted: sorted.map(({ value, label, emoji, scale, caption }) => ({ value, label, emoji, scale, caption })),
        sign: q.sign ?? (q.items[0].emoji ? '→' : q.order === 'desc' ? '>' : '<'),
        answer,
      };
    }
    case 'column': {
      const { op, rows, width } = q.stage;
      const result = columnResult(q.stage);
      return {
        ...base, kind: 'column', text: op === '+' ? 'Calcule l’addition.' : op === '×' ? 'Calcule la multiplication.' : 'Calcule la soustraction.',
        stage: { type: 'column', op, rows, width: Math.max(width, String(result).length) }, answer: result,
      };
    }
    case 'setclock': {
      const text = /Règle l’horloge sur /.test(q.text)
        ? q.text.replace(/Règle l’horloge sur /, 'Dessine les aiguilles : ')
        : `${q.text} Dessine les aiguilles.`;
      return { ...base, kind: 'clock', text, target: { ...q.target }, answer: q.answer };
    }
    case 'sudoku':
      return { ...base, kind: 'sudoku', text: paperText(q.text) };
    case 'maze':
      return { ...base, kind: 'maze', text: q.stage.items?.length ? `${paperText(q.text)} Passe d’abord par les clés.` : paperText(q.text) };
    case 'trace':
      return { ...base, kind: 'trace', text: q.text, answer: q.stage.glyph };
    case 'dots':
      return { ...base, kind: 'dots', text: q.text, answer: q.stage.name };
    case 'symmetry':
      return { ...base, kind: 'symmetry', text: paperText(q.text).replace(/\. Puis.*$/, '.') };
    case 'picross':
      return { ...base, kind: 'picross', text: q.text, answer: q.stage.name };
    default:
      return null;
  }
}

/** Place prise par un exercice sur la feuille (une unité : un petit calcul). */
export function exerciseSize(ex) {
  switch (ex.kind) {
    case 'number':
      return ['operation', 'equation', 'none', 'sequence', 'multiplication'].includes(ex.stage.type) && !ex.stage.emoji ? 1 : 1.5;
    case 'choice':
      return ['none', 'equation', 'sequence', 'word', 'sentence'].includes(ex.stage.type) && !ex.tick ? 1 : 1.5;
    case 'order':
      return ex.items.some((it) => it.caption) ? 2 : 1.5;
    default:
      return 2;
  }
}

/** Exercices qui prennent toute la largeur de la feuille. */
export function isWide(ex) {
  if (ex.sharedStage) return false;
  return ['fill', 'trace'].includes(ex.kind) || ex.stage?.type === 'text'
    || (ex.kind === 'order' && ex.items.some((it) => it.caption))
    || (ex.kind === 'choice' && ex.tick && ex.choices.some((c) => String(c.label).length > 32));
}

/** La réponse d'un exercice, écrite (corrigé). */
export function answerText(ex) {
  switch (ex.kind) {
    case 'choice': return choiceText(ex.choices[ex.answer]);
    case 'number': case 'column': case 'clock': return String(ex.answer);
    case 'fill': return ex.equations.map((e) => `${e.solution[0]} ${e.op} ${e.solution[1]} = ${e.result}`).join(' ; ');
    case 'match': return ex.pairs.map((p) => `${p.left} → ${p.right}`).join(' ; ');
    case 'order':
      return ex.mode === 'write' || ex.sorted.every((it) => it.label)
        ? ex.answer
        : ex.sorted.map((it, i) => `${i + 1}`).join(' ');
    case 'sudoku': return ex.stage.solution.join('');
    case 'maze': return ex.stage.solution.join('-');
    case 'trace': case 'dots': case 'picross': return ex.answer || '';
    case 'symmetry': return ex.stage.solution.join('-');
    default: return '';
  }
}

/** Les jeux qui ont une fiche à imprimer. */
export function ficheGames() {
  return GAMES.filter((g) => !NON_IMPRIMABLES.has(g.id));
}

/** Le jeu a-t-il une fiche ? */
export function isPrintable(gameId) {
  return GAMES.some((g) => g.id === gameId) && !NON_IMPRIMABLES.has(gameId);
}

/** Ce qu'on fait sur le papier, quand la question ne le dit pas : entourer, cocher, écrire… */
function paperAction(ex) {
  const text = ex.text || '';
  switch (ex.kind) {
    case 'choice':
      if (/\b(entoure|coche)/i.test(text)) return '';
      return ex.tick ? 'Coche la bonne réponse.' : 'Entoure la bonne réponse.';
    case 'number':
      return /\bÉcris\b/.test(text) ? '' : 'Écris la réponse dans la case.';
    case 'order':
      return ex.mode === 'number' ? (ex.items.some((it) => it.emoji) ? 'Écris 1, 2, 3… sous les images, dans l’ordre.' : 'Écris-les dans les cases, dans l’ordre.') : '';
    case 'column':
      return 'Écris le résultat dans les cases.';
    case 'maze':
      return 'Trace le chemin au crayon.';
    case 'clock':
      return 'La petite aiguille montre les heures, la grande les minutes.';
    default:
      return '';
  }
}

/** La consigne écrite en haut de la fiche, d'après la forme des exercices. */
function sheetConsigne(exercises) {
  const texts = new Set(exercises.map((e) => e.text));
  const actions = new Set(exercises.map(paperAction));
  const [first] = exercises;
  const action = actions.size === 1 ? [...actions][0] : '';
  if (texts.size === 1 && first.text) return { consigne: [first.text, action].filter(Boolean).join(' '), same: true };
  const kinds = new Set(exercises.map((e) => e.kind));
  const consigne = kinds.size === 1 && first.kind === 'choice' && action
    ? `Lis chaque question. ${action}`
    : action ? `Lis bien chaque consigne. ${action}` : 'Lis bien chaque consigne avant de répondre.';
  return { consigne, same: false };
}

/** Les questions rangées texte par texte (les textes qui ont le plus de questions d'abord). */
function byText(pool) {
  const texts = new Map();
  for (const ex of pool) {
    const id = ex.stage.type === 'text' ? ex.stage.text : ex.key;
    if (!texts.has(id)) texts.set(id, []);
    const list = texts.get(id);
    if (!list.some((e) => e.text === ex.text)) list.push(ex);
  }
  return [...texts.values()].sort((a, b) => b.length - a.length)
    .flatMap((list) => list.map((ex, i) => (i ? { ...ex, sharedStage: true } : ex)));
}

/** Place prise par une liste d'exercices. */
function room(list) {
  return list.reduce((sum, e) => sum + exerciseSize(e), 0);
}

/**
 * Une fiche : de 6 à 12 exercices du même niveau (selon leur taille), tous différents si possible,
 * et de la même forme si possible. Renvoie null si le niveau ne donne pas assez d'exercices imprimables.
 */
export function makeFiche(game, level, { seed = Date.now(), name = '', season = null, tries = 160 } = {}) {
  const rng = createRng(seed);
  const context = { name, season };
  const keys = new Set();
  const variants = new Set();
  // pour chaque forme : les questions différentes, puis les variantes d'une même question
  // (mêmes données, réponses dans un autre ordre), gardées pour les niveaux qui en ont peu
  const groups = new Map();
  for (let i = 0; i < tries; i++) {
    let q;
    try {
      q = game.generate(level, rng, i, context);
    } catch {
      continue;
    }
    const ex = exerciseFrom(q);
    if (!ex) continue;
    const variant = JSON.stringify([ex.kind, ex.key, ex.stage, ex.choices?.map((c) => c.value), ex.items?.map((it) => it.value), ex.text]);
    if (variants.has(variant)) continue;
    variants.add(variant);
    if (!groups.has(ex.kind)) groups.set(ex.kind, { unique: [], extra: [] });
    const group = groups.get(ex.kind);
    if (keys.has(ex.key)) group.extra.push(ex);
    else {
      keys.add(ex.key);
      group.unique.push(ex);
    }
    if (group.unique.length >= FICHE_MAX || (group.unique.length >= FICHE_MIN && room(group.unique) >= FICHE_ROOM)) break;
  }
  // la forme qui a le plus de questions différentes ; à défaut, toutes les formes mêlées
  const ranked = [...groups.values()].sort((a, b) => b.unique.length - a.unique.length || b.extra.length - a.extra.length);
  // les variantes ne servent qu'à compléter une feuille trop courte (ou aux questions d'un même texte)
  const top = ranked[0];
  let pool = !top ? []
    : top.unique.length >= FICHE_MIN && !top.unique.some((e) => e.stage.type === 'text') ? top.unique : [...top.unique, ...top.extra];
  if (pool.length < FICHE_MIN) pool = [...ranked.flatMap((g) => g.unique), ...ranked.flatMap((g) => g.extra)];
  // écrire : on recopie les mêmes lettres (prénom court) sur plusieurs lignes
  const distinct = pool.length;
  if (distinct && pool.every((e) => e.kind === 'trace')) {
    while (pool.length < FICHE_MIN) pool.push(pool[pool.length % distinct]);
  }
  if (pool.length < FICHE_MIN) return null;
  // petits textes : deux ou trois questions sur chaque texte, le texte écrit une seule fois
  if (pool.some((e) => e.stage.type === 'text')) pool = byText(pool);
  let exercises = [];
  let used = 0;
  for (const ex of pool) {
    if (exercises.length >= FICHE_MIN && used + exerciseSize(ex) > FICHE_ROOM) break;
    exercises.push(ex);
    used += exerciseSize(ex);
    if (exercises.length >= FICHE_MAX) break;
  }
  // des réponses à cocher et d'autres à entourer : on coche partout, c'est plus simple à expliquer
  if (exercises.some((e) => e.tick) && exercises.some((e) => e.kind === 'choice' && !e.tick)) {
    exercises = exercises.map((e) => (e.kind === 'choice' && !e.tick
      ? { ...e, tick: true, text: e.text.replace(/\bEntoure\b/g, 'Coche').replace(/\bentoure\b/g, 'coche') }
      : e));
  }
  const { consigne, same } = sheetConsigne(exercises);
  return {
    gameId: game.id, level, seed, title: game.title, icon: game.icon, levelLabel: game.levels[level - 1],
    consigne, sameText: same, exercises,
  };
}
