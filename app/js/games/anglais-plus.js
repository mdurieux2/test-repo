// Encore des jeux d'anglais : les nombres jusqu'à 100, calculer en anglais, mélanger les
// couleurs, colorier en lisant les couleurs, le memory, l'intrus, les contraires et les phrases.

import { pick, randInt, sample, shuffle } from '../random.js';
import { numberChoices } from './helpers.js';
import { ENGLISH_THEMES } from '../data/anglais-data.js';

const EN = 'en-GB';
const say = (text, rate = 0.85) => ({ text, lang: EN, rate });
const theme = (title) => ENGLISH_THEMES.find((t) => t.title === title).words;

// ---------------------------------------------------------------- Les nombres jusqu'à 100

const UNITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** 42 → « forty-two ». */
export function englishNumber(n) {
  if (n < 20) return UNITS[n];
  if (n === 100) return 'one hundred';
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${UNITS[n % 10]}` : ''}`;
}

const NUMBER_LEVELS = [
  { label: 'Écoute : de 1 à 10', min: 1, max: 10, mode: 'listen' },
  { label: 'Écoute : de 11 à 20', min: 11, max: 20, mode: 'listen' },
  { label: 'Lis : de 11 à 20', min: 11, max: 20, mode: 'read' },
  { label: 'Les dizaines', min: 1, max: 10, mode: 'tens' },
  { label: 'Écoute : jusqu’à 100', min: 21, max: 99, mode: 'listen' },
  { label: 'Écris le nombre', min: 1, max: 20, mode: 'keypad' },
  // niveaux 7 et 8 : jusqu’à 100, avec des nombres faciles à confondre (14 et 40, 42 et 24)
  { label: 'Lis : jusqu’à 100', min: 21, max: 99, mode: 'read', tricky: true },
  { label: 'Le nom en anglais', min: 13, max: 99, mode: 'name' },
];

/**
 * Des nombres faciles à confondre avec n, les pièges d'abord : fourteen et forty,
 * forty-two et twenty-four, puis les voisins (± 10, ± 1, ± 2). Tous entre 11 et 99.
 */
export function lookAlikes(n) {
  const tens = Math.floor(n / 10);
  const units = n % 10;
  const traps = [];
  if (n >= 13 && n <= 19) traps.push(units * 10);
  if (units === 0 && tens >= 2) traps.push(tens + 10);
  if (tens >= 2 && units >= 1) traps.push(units * 10 + tens);
  const near = [n + 10, n - 10, n + 1, n - 1, n + 2, n - 2];
  const ok = (v) => v !== n && v >= 11 && v <= 99;
  const first = [...new Set(traps)].filter(ok);
  return { traps: first, near: near.filter((v) => ok(v) && !first.includes(v)) };
}

/** `count` choix dont n : les pièges, puis des voisins tirés au hasard. */
function trickyChoices(rng, n, count) {
  const { traps, near } = lookAlikes(n);
  return shuffle(rng, [n, ...[...shuffle(rng, traps), ...shuffle(rng, near)].slice(0, count - 1)]);
}

/** Un nombre de 13 à 99 : un tiers de « teens », un tiers de dizaines, un tiers d'autres nombres. */
function trickyNumber(rng) {
  const r = rng();
  if (r < 1 / 3) return randInt(rng, 13, 19);
  if (r < 2 / 3) return randInt(rng, 2, 9) * 10;
  let n = randInt(rng, 21, 98);
  if (n % 10 === 0) n += 1;
  return n;
}

export const nombresAnglais = {
  id: 'nombres-anglais',
  domain: 'anglais',
  title: 'Les nombres en anglais',
  icon: '🔢',
  skill: 'Comprendre et lire les nombres en anglais, de one à one hundred',
  levels: NUMBER_LEVELS.map((l) => l.label),
  generate(level, rng) {
    const { min, max, mode, tricky } = NUMBER_LEVELS[level - 1];
    if (mode === 'name') return numberName(level, rng);
    const n = mode === 'tens' ? randInt(rng, min, max) * 10 : randInt(rng, min, max);
    const word = englishNumber(n);
    const sound = say(word, 0.8);
    const choices = (mode === 'tens'
      ? shuffle(rng, [n, ...sample(rng, [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].filter((v) => v !== n), 3)])
      : tricky ? trickyChoices(rng, n, 4) : numberChoices(rng, n, 4, Math.max(1, min - 2), max + 2)
    ).map((v) => ({ value: v, label: String(v) }));
    const base = { key: `nombres-anglais:${level}:${n}`, answer: n, success: { speak: [say(word), `C’est ${n} !`] } };
    if (mode === 'read') {
      return {
        ...base,
        text: 'Lis le nombre anglais. Quel est ce nombre ?',
        instruction: 'Lis le nombre en anglais, et touche le bon nombre. Tu peux toucher le mot pour l’entendre.',
        short: { key: 'nombres-anglais:read', text: 'Quel nombre ?' },
        replay: [sound],
        stage: { type: 'word', text: word, lang: 'en' },
        choices,
        choiceStyle: 'numbers',
      };
    }
    if (mode === 'keypad') {
      return {
        ...base,
        interaction: 'keypad',
        maxDigits: 2,
        text: 'Écoute le nombre anglais, et écris-le.',
        instruction: ['Écoute le nombre anglais, et écris-le avec les touches.', sound],
        short: { key: 'nombres-anglais:keypad', text: 'Écris le nombre.', speak: [sound] },
        replay: [sound],
        stage: { type: 'equation', parts: ['🔊', '→', null] },
        choices: [],
      };
    }
    return {
      ...base,
      text: 'Écoute le nombre anglais, et touche-le.',
      instruction: ['Écoute le nombre anglais, et touche-le.', sound],
      short: { key: 'nombres-anglais:listen', text: 'Écoute et touche.', speak: [sound] },
      replay: [sound],
      stage: { type: 'listen' },
      choices,
      choiceStyle: 'numbers',
    };
  },
};

/** Niveau 8 : on voit le nombre écrit en chiffres, on choisit son nom anglais (fourteen ou forty ?). */
function numberName(level, rng) {
  const n = trickyNumber(rng);
  const word = englishNumber(n);
  return {
    key: `nombres-anglais:${level}:${n}`,
    text: 'Comment dit-on ce nombre en anglais ?',
    instruction: 'Comment dit-on ce nombre en anglais ? Lis bien les mots, et touche le bon.',
    short: { key: 'nombres-anglais:name', text: 'Le nom en anglais ?' },
    stage: { type: 'word', text: String(n) },
    choices: trickyChoices(rng, n, 3).map((v) => ({ value: v, label: englishNumber(v), lang: 'en' })),
    choiceStyle: 'sentences',
    answer: n,
    success: { speak: [say(word), `C’est ${n} !`] },
  };
}

// ---------------------------------------------------------------- Calculer en anglais

const CALC_LEVELS = [
  { label: 'Plus, jusqu’à 5', op: '+', max: 5 },
  { label: 'Plus, jusqu’à 10', op: '+', max: 10 },
  { label: 'Minus, jusqu’à 10', op: '−', max: 10 },
  { label: 'Réponds en anglais', op: '±', max: 10, words: true },
  // niveaux 5 à 8 : jusqu’à 20, puis le calcul seulement entendu
  { label: 'Plus, jusqu’à 20', op: '+', max: 20 },
  { label: 'Minus, jusqu’à 20', op: '−', max: 20 },
  { label: 'Écoute seulement', op: '±', max: 20, listen: true },
  { label: 'Écoute, et écris', op: '±', max: 20, keypad: true },
];

export const calculAnglais = {
  id: 'calcul-anglais',
  domain: 'anglais',
  title: 'Calcule en anglais',
  icon: '➕',
  skill: 'Comprendre un calcul dit en anglais (plus, minus) et répondre',
  levels: CALC_LEVELS.map((l) => l.label),
  generate(level, rng) {
    const { op: kind, max, words, listen, keypad } = CALC_LEVELS[level - 1];
    const op = kind === '±' ? pick(rng, ['+', '−']) : kind;
    let a;
    let b;
    if (max > 10) {
      // jusqu’à 20 : un nombre de 11 à 20 dans chaque calcul (le résultat, ou le premier nombre)
      if (op === '+') {
        const sum = randInt(rng, 11, max);
        a = randInt(rng, 1, sum - 1);
        b = sum - a;
      } else {
        a = randInt(rng, 11, max);
        b = randInt(rng, 1, a - 1);
      }
    } else if (op === '+') {
      a = randInt(rng, 1, max - 1);
      b = randInt(rng, 1, max - a);
    } else {
      a = randInt(rng, 2, max);
      b = randInt(rng, 1, a - 1);
    }
    const n = op === '+' ? a + b : a - b;
    const spoken = `${englishNumber(a)} ${op === '+' ? 'plus' : 'minus'} ${englishNumber(b)}`;
    const sound = say(`${spoken}?`, 0.8);
    const success = { speak: [say(`${spoken} is ${englishNumber(n)}!`)] };
    if (keypad) {
      return {
        key: `calcul-anglais:${level}:${a}${op}${b}`,
        interaction: 'keypad',
        maxDigits: 2,
        text: 'Écoute le calcul en anglais, et écris le résultat.',
        instruction: ['Écoute le calcul en anglais, et écris le résultat avec les touches.', sound],
        short: { key: 'calcul-anglais:clavier', text: 'Écris le résultat.', speak: [sound] },
        replay: [sound],
        stage: { type: 'equation', parts: ['🔊', '=', null] },
        choices: [],
        answer: n,
        success,
      };
    }
    if (listen) {
      return {
        key: `calcul-anglais:${level}:${a}${op}${b}`,
        text: 'Écoute bien le calcul en anglais.',
        instruction: ['Écoute bien le calcul en anglais, et touche la réponse.', sound],
        short: { key: 'calcul-anglais:ecoute', text: 'Combien ?', speak: [sound] },
        replay: [sound],
        stage: { type: 'listen' },
        choices: numberChoices(rng, n, 4, 0, max).map((v) => ({ value: v, label: String(v) })),
        choiceStyle: 'numbers',
        answer: n,
        success,
      };
    }
    return {
      key: `calcul-anglais:${level}:${a}${op}${b}`,
      text: words ? 'Calcule, et réponds en anglais.' : 'Écoute le calcul en anglais.',
      instruction: [words ? 'Calcule, et touche la réponse en anglais.' : 'Écoute le calcul en anglais, et touche la réponse.', sound],
      short: { key: `calcul-anglais:${words ? 'mots' : 'nombres'}`, text: words ? 'La réponse en anglais ?' : 'Combien ?', speak: [sound] },
      replay: [sound],
      stage: { type: 'word', text: `${spoken} = ?`, lang: 'en' },
      choices: numberChoices(rng, n, words ? 3 : 4, 0, max).map((v) => (words
        ? { value: v, label: englishNumber(v), lang: 'en' }
        : { value: v, label: String(v) })),
      choiceStyle: words ? 'words' : 'numbers',
      answer: n,
      success,
    };
  },
};

// ---------------------------------------------------------------- Mélanger les couleurs

export const EN_COLORS = {
  red: { fr: 'rouge', hex: '#ff4d4d', square: '🟥' }, yellow: { fr: 'jaune', hex: '#ffd23f', square: '🟨' },
  blue: { fr: 'bleu', hex: '#3d7dff', square: '🟦' }, green: { fr: 'vert', hex: '#2fbf5b', square: '🟩' },
  orange: { fr: 'orange', hex: '#ff8a3d', square: '🟧' }, purple: { fr: 'violet', hex: '#9b5cff', square: '🟪' },
  brown: { fr: 'marron', hex: '#8b5a2b', square: '🟫' }, black: { fr: 'noir', hex: '#222222', square: '⬛' },
  white: { fr: 'blanc', hex: '#ffffff', square: '⬜' }, pink: { fr: 'rose', hex: '#ff8fc7' }, grey: { fr: 'gris', hex: '#9e9e9e' },
};
const MIXES = [
  ['red', 'yellow', 'orange'], ['blue', 'yellow', 'green'], ['red', 'blue', 'purple'],
  ['red', 'white', 'pink'], ['black', 'white', 'grey'], ['red', 'green', 'brown'],
];

// Ce qu'on voit (les carrés, les mots, ou rien : on écoute) et comment on répond (pastille ou mot).
const MIX_LEVELS = [
  { label: 'Regarde et mélange', show: 'squares', answer: 'swatch' },
  { label: 'Lis et mélange', show: 'words', answer: 'swatch' },
  { label: 'Le nom en anglais', show: 'squares', answer: 'word' },
  // niveaux 4 à 7 : écouter seulement, répondre en anglais, puis retrouver les deux couleurs
  { label: 'Écoute et mélange', show: 'listen', answer: 'swatch' },
  { label: 'Lis, réponds en anglais', show: 'words', answer: 'word' },
  { label: 'Écoute, réponds en anglais', show: 'listen', answer: 'word' },
  { label: 'Retrouve les 2 couleurs', reverse: true },
];

export const couleursAnglais = {
  id: 'couleurs-anglais',
  domain: 'anglais',
  title: 'Mélange les couleurs',
  icon: '🎨',
  skill: 'Les couleurs en anglais : mélanger deux couleurs et nommer le résultat',
  levels: MIX_LEVELS.map((l) => l.label),
  generate(level, rng) {
    const { show, answer, reverse } = MIX_LEVELS[level - 1];
    if (reverse) return mixReverse(level, rng);
    const [a, b, result] = pick(rng, MIXES);
    const sentence = `${a} and ${b} make ${result}`;
    const others = sample(rng, Object.keys(EN_COLORS).filter((c) => c !== result && c !== a && c !== b), 2);
    const options = shuffle(rng, [result, ...others]);
    const pair = rng() < 0.5 ? [a, b] : [b, a];
    const stage = show === 'listen' ? { type: 'listen' }
      : show === 'words'
        ? { type: 'word', text: `${pair[0]} + ${pair[1]} = ?`, lang: 'en' }
        : { type: 'pattern', items: [EN_COLORS[pair[0]].square, '+', EN_COLORS[pair[1]].square, '=', null] };
    const ask = say(`${pair[0]} and ${pair[1]} make...?`);
    const word = answer === 'word';
    const listen = show === 'listen';
    let instruction = word
      ? ['Si on mélange ces deux couleurs, quelle couleur obtient-on ? Touche son nom en anglais.', ask]
      : ['Si on mélange ces deux couleurs, quelle couleur obtient-on ?', ask];
    if (listen) {
      instruction = word
        ? ['Écoute les deux couleurs en anglais. Si on les mélange, quelle couleur obtient-on ? Touche son nom en anglais.', ask]
        : ['Écoute les deux couleurs en anglais. Si on les mélange, quelle couleur obtient-on ?', ask];
    }
    return {
      key: `couleurs-anglais:${level}:${result}`,
      text: listen ? 'Écoute, et trouve la couleur.' : word ? 'Quelle couleur ? Réponds en anglais.' : 'Quelle couleur obtient-on ?',
      instruction,
      short: { key: `couleurs-anglais:${level}`, text: word ? 'Le nom en anglais ?' : 'Quelle couleur ?', speak: [ask] },
      replay: [ask],
      stage,
      choices: options.map((c) => (word
        ? { value: c, label: c, lang: 'en' }
        : { value: c, swatch: EN_COLORS[c].hex, name: EN_COLORS[c].fr })),
      choiceStyle: word ? 'words' : 'pictures',
      answer: result,
      success: { speak: [say(`${sentence}!`), `${EN_COLORS[a].fr} et ${EN_COLORS[b].fr}, ça fait ${EN_COLORS[result].fr} !`] },
    };
  },
};

/** Niveau 7 : on lit la couleur à obtenir (« ? + ? = pink ») ; quelles deux couleurs faut-il mélanger ? */
function mixReverse(level, rng) {
  const mix = pick(rng, MIXES);
  const [a, b, result] = mix;
  const options = shuffle(rng, [mix, ...sample(rng, MIXES.filter((m) => m !== mix), 2)]);
  const ask = say(`What colours make ${result}?`);
  return {
    key: `couleurs-anglais:${level}:${result}`,
    text: 'Quelles couleurs faut-il mélanger ?',
    instruction: ['Quelles couleurs faut-il mélanger pour obtenir cette couleur ? Lis, et touche la bonne réponse.', ask],
    short: { key: `couleurs-anglais:${level}`, text: 'Quelles couleurs ?', speak: [ask] },
    replay: [ask],
    stage: { type: 'word', text: `? + ? = ${result}`, lang: 'en' },
    choices: options.map(([x, y, made]) => ({ value: made, label: `${x} and ${y}`, lang: 'en' })),
    choiceStyle: 'sentences',
    answer: result,
    success: { speak: [say(`${a} and ${b} make ${result}!`), `${EN_COLORS[a].fr} et ${EN_COLORS[b].fr}, ça fait ${EN_COLORS[result].fr} !`] },
  };
}

// ---------------------------------------------------------------- Colorie en anglais

// Les dessins du coloriage magique, avec des nombres ; la légende dit les couleurs en anglais.
const EN_DRAWINGS = [
  {
    name: 'a house',
    zones: [
      { d: 'M0 96 H120 V120 H0 Z', at: [60, 110], c: 2 },
      { d: 'M18 58 L60 22 L102 58 Z', at: [60, 46], c: 0 },
      { d: 'M26 58 H94 V96 H26 Z M64 70 H82 V96 H64 Z', at: [44, 80], c: 1 },
      { d: 'M64 70 H82 V96 H64 Z', at: [73, 85], c: 3 },
      { d: 'M92 4 a12 12 0 1 0 0.1 0 Z', at: [92, 17], c: 4 },
    ],
  },
  {
    name: 'a boat',
    zones: [
      { d: 'M0 90 Q30 80 60 90 T120 90 V120 H0 Z', at: [60, 108], c: 1 },
      { d: 'M18 72 H102 L90 90 H30 Z', at: [60, 81], c: 0 },
      { d: 'M55 14 V68 H26 Z', at: [45, 57], c: 3 },
      { d: 'M65 20 V68 H96 Z', at: [75, 58], c: 4 },
      { d: 'M55 4 H65 V72 H55 Z', at: [60, 12], c: 2 },
    ],
  },
  {
    name: 'a butterfly',
    zones: [
      { d: 'M55 58 C30 14 4 26 12 52 C16 66 40 68 55 58 Z', at: [30, 46], c: 0 },
      { d: 'M65 58 C90 14 116 26 108 52 C104 66 80 68 65 58 Z', at: [90, 46], c: 0 },
      { d: 'M55 64 C34 62 16 76 26 94 C36 106 52 92 55 70 Z', at: [38, 82], c: 3 },
      { d: 'M65 64 C86 62 104 76 94 94 C84 106 68 92 65 70 Z', at: [82, 82], c: 3 },
      { d: 'M55 30 H65 V96 H55 Z', at: [60, 40], c: 2 },
      { d: 'M0 106 H120 V120 H0 Z', at: [60, 114], c: 1 },
    ],
  },
];
const PAINT_SETS = [
  ['red', 'blue', 'green'],
  ['red', 'blue', 'green', 'yellow', 'orange'],
  ['pink', 'purple', 'brown', 'orange', 'grey'],
];
// Niveaux 4 à 7 : 5 couleurs au hasard (tout le nuancier, sauf le blanc : invisible sur le
// dessin), des mots qui se ressemblent (blue, black, brown ; green, grey), puis des mélanges
// à faire dans sa tête (« red + yellow » : on colorie en orange).
const COLORIE_LEVELS = ['3 couleurs', '5 couleurs', 'D’autres couleurs', 'Toutes les couleurs', 'Mots qui se ressemblent',
  'Mélange, puis colorie', 'Mélange : 4 couleurs'];
const LOOK_ALIKE_COLOURS = ['blue', 'black', 'brown', 'green', 'grey'];

/** La légende du niveau : { hex, name, n, word } ; `word` est ce qu'on lit. */
function paintLegend(level, rng) {
  if (level >= 6) {
    const mixes = sample(rng, MIXES, level === 6 ? 3 : 4);
    // espaces insécables : « red + yellow » reste d'un bloc dans la légende
    return mixes.map(([a, b, result], i) => ({ hex: EN_COLORS[result].hex, name: EN_COLORS[result].fr, n: i + 1, word: `${a}\u00a0+\u00a0${b}` }));
  }
  const set = level === 4 ? sample(rng, Object.keys(EN_COLORS).filter((c) => c !== 'white'), 5)
    : level === 5 ? shuffle(rng, LOOK_ALIKE_COLOURS) : PAINT_SETS[level - 1];
  return set.map((name, i) => ({ hex: EN_COLORS[name].hex, name: EN_COLORS[name].fr, n: i + 1, word: name }));
}

export const colorieAnglais = {
  id: 'colorie-anglais',
  domain: 'anglais',
  title: 'Colorie en anglais',
  icon: '🖌️',
  skill: 'Lire les noms des couleurs en anglais pour colorier un dessin',
  levels: COLORIE_LEVELS,
  generate(level, rng) {
    const drawing = pick(rng, EN_DRAWINGS);
    const legend = paintLegend(level, rng);
    const zones = drawing.zones.map((z) => {
      const c = z.c % legend.length;
      return { d: z.d, at: z.at, c, label: String(c + 1) };
    });
    const mix = level >= 6;
    return {
      key: level <= 3 ? `colorie-anglais:${level}:${drawing.name}` : `colorie-anglais:${level}:${drawing.name}:${legend.map((c) => c.word).join(',')}`,
      interaction: 'colorby',
      text: mix ? 'Mélange les deux couleurs dans ta tête, et colorie.' : 'Lis la couleur en anglais à côté de chaque nombre, et colorie.',
      instruction: mix
        ? 'À côté de chaque nombre, il y a deux couleurs en anglais. Mélange-les dans ta tête, puis colorie les zones qui ont ce nombre.'
        : 'Lis la couleur en anglais à côté de chaque nombre, puis colorie les zones qui ont ce nombre.',
      short: mix ? { key: 'colorie-anglais:melange', text: 'Mélange, et colorie !' } : { key: 'colorie-anglais', text: 'Lis la couleur, et colorie !' },
      stage: { type: 'colorby', zones, legend, name: drawing.name },
      choices: [],
      answer: null,
      success: { speak: [say(`Well done! It's ${drawing.name}!`)] },
    };
  },
};

// ---------------------------------------------------------------- Le memory en anglais

const MEMORY_LEVELS = [
  { label: 'Les animaux (3 paires)', themes: ['Les animaux'], pairs: 3 },
  { label: 'À manger (4 paires)', themes: ['À manger'], pairs: 4 },
  { label: 'Les couleurs (4 paires)', themes: ['colors'], pairs: 4 },
  { label: 'Tout mélangé (6 paires)', themes: ['Les animaux', 'À manger', 'Les vêtements', 'L\'école', 'La météo'], pairs: 6 },
  // niveaux 5 à 8 : d'autres thèmes, les nombres (fourteen et forty…), puis sans image
  { label: 'Les vêtements (5 paires)', themes: ['Les vêtements'], pairs: 5 },
  { label: 'Le corps (5 paires)', themes: ['Le corps'], pairs: 5 },
  { label: 'Les nombres (6 paires)', mode: 'numbers', pairs: 6 },
  {
    label: 'Sans image (6 paires)', mode: 'french', pairs: 6,
    themes: ['Les animaux', 'À manger', 'Le corps', 'Les vêtements', 'L\'école', 'La météo', 'La famille'],
  },
];
// Les nombres du memory : de 11 à 20 et les dizaines, pour ne pas confondre fourteen et forty
// (seventeen, trop long pour une carte, n'y est pas).
const MEMORY_NUMBERS = [11, 12, 13, 14, 15, 16, 18, 19, 20, 30, 40, 50, 60, 70, 80, 90];
/** Un mot court sur une carte : pas plus de 8 lettres par mot (« le cochon », « l'oiseau »). */
const fitsCard = (text) => text.split(/[\s']/).every((w) => w.length <= 8);

/** Les cartes : une image (ou un nombre, ou le mot français) et le mot anglais. */
function memoryCards(rng, { themes, pairs, mode }) {
  if (mode === 'numbers') {
    return sample(rng, MEMORY_NUMBERS, pairs).flatMap((n) => {
      const en = englishNumber(n);
      return [{ pair: en, label: String(n), say: say(en) }, { pair: en, label: en, word: true, lang: 'en', say: say(en) }];
    });
  }
  if (mode === 'french') {
    const pool = themes.flatMap(theme).filter((w) => w.en.length <= 8 && fitsCard(w.fr));
    return sample(rng, pool, pairs).flatMap((w) => [
      { pair: w.en, label: w.fr.replace(/'/g, '’'), word: true, lang: 'fr', say: say(w.en) },
      { pair: w.en, label: w.en, word: true, lang: 'en', say: say(w.en) },
    ]);
  }
  const pool = themes[0] === 'colors'
    ? Object.entries(EN_COLORS).filter(([, c]) => c.square).map(([en, c]) => ({ en, emoji: c.square }))
    : themes.flatMap(theme).filter((w) => w.emoji && w.en.length <= 8);
  return sample(rng, pool, pairs).flatMap((w) => [
    { pair: w.en, label: w.emoji, say: say(w.en) },
    { pair: w.en, label: w.en, word: true, lang: 'en', say: say(w.en) },
  ]);
}

const MEMORY_TEXTS = {
  numbers: {
    text: 'Retrouve les paires : un nombre et son nom anglais.',
    instruction: 'Retrouve les paires : chaque nombre va avec son nom anglais. Retourne deux cartes à la fois.',
  },
  french: {
    text: 'Retrouve les paires : un mot français et son mot anglais.',
    instruction: 'Retrouve les paires : chaque mot français va avec son mot anglais. Retourne deux cartes à la fois.',
  },
};

export const memoryAnglais = {
  id: 'memory-anglais',
  domain: 'anglais',
  title: 'Le memory anglais',
  icon: '🃏',
  skill: 'Retrouver les paires : une image et son mot anglais',
  levels: MEMORY_LEVELS.map((l) => l.label),
  generate(level, rng) {
    const settings = MEMORY_LEVELS[level - 1];
    const pairsOf = memoryCards(rng, settings);
    const cards = shuffle(rng, pairsOf);
    const words = pairsOf.filter((_, i) => i % 2 === 0).map((c) => c.pair);
    const texts = MEMORY_TEXTS[settings.mode];
    return {
      key: `memory-anglais:${level}:${words.join(',')}`,
      interaction: 'memory',
      text: texts ? texts.text : 'Retrouve les paires : une image et son mot anglais.',
      instruction: texts ? texts.instruction : 'Retrouve les paires : chaque image va avec son mot anglais. Retourne deux cartes à la fois.',
      short: { key: settings.mode ? `memory-anglais:${settings.mode}` : 'memory-anglais', text: 'Retrouve les paires.' },
      stage: { type: 'none' },
      cards,
      choices: [],
      answer: null,
      success: { speak: [say('Well done!')] },
    };
  },
};

// ---------------------------------------------------------------- L'intrus en anglais

const GROUPS = [
  { theme: 'Les animaux', en: 'an animal', fr: 'un animal' },
  { theme: 'À manger', en: 'food', fr: 'à manger' },
  { theme: 'Les vêtements', en: 'clothes', fr: 'un vêtement' },
  { theme: 'L\'école', en: 'for school', fr: 'pour l’école' },
  { theme: 'Le corps', en: 'a part of the body', fr: 'une partie du corps' },
  { theme: 'La météo', en: 'weather', fr: 'la météo' },
];
// Niveaux 4 à 7 : d'autres familles de mots (les émotions, la famille, les couleurs, les nombres).
export const ALL_GROUPS = [
  ...GROUPS,
  { theme: 'Les émotions', en: 'a feeling', fr: 'une émotion' },
  { theme: 'La famille', en: 'in the family', fr: 'de la famille' },
  { theme: 'Les couleurs', en: 'a colour', fr: 'une couleur' },
  { theme: 'Les nombres', en: 'a number', fr: 'un nombre' },
];
const INTRUS_LEVELS = [
  { label: 'Avec les images' },
  { label: 'Avec les mots' },
  { label: 'Écoute l’intrus', listen: true },
  { label: 'Plus de familles', more: true },
  { label: 'Écoute, plus de familles', more: true, listen: true },
  { label: 'Mots qui se ressemblent', more: true, lookAlike: true },
  { label: 'Trouve la famille', more: true, hidden: true },
];

/** L'intrus qui ressemble le plus à un mot de la famille : même début, même longueur, même fin. */
function lookAlikeOdd(rng, members, pool) {
  const likeness = (w, m) => (w.en[0] === m.en[0] ? 2 : 0)
    + (Math.abs(w.en.length - m.en.length) <= 1 ? 1 : 0) + (w.en.slice(-2) === m.en.slice(-2) ? 1 : 0);
  return pool
    .map((w) => ({ w, s: rng() + Math.max(...members.map((m) => likeness(w, m))) }))
    .sort((x, y) => y.s - x.s)[0].w;
}

/** Niveaux 4 à 7 : plus de familles ; au niveau 7, la famille n'est pas dite, il faut la trouver. */
function moreIntrus(level, { group, odd, members, options, list, listen, hidden }) {
  const question = say(hidden ? 'Which one is the odd one out?' : `Which one is not ${group.en}?`);
  const ask = hidden ? 'Lequel n’est pas de la même famille que les autres ?' : `Lequel n’est pas ${group.fr} ?`;
  const name = odd.fr.charAt(0).toUpperCase() + odd.fr.slice(1).replace(/'/g, '’');
  return {
    key: `intrus-anglais:${level}:${odd.en}:${members.map((w) => w.en).join(',')}`,
    text: ask,
    instruction: listen ? [`Écoute les mots anglais : lequel n’est pas ${group.fr} ?`, question, list] : [ask, question],
    short: { key: `intrus-anglais:${level}`, text: hidden ? 'Lequel n’est pas de la famille ?' : ask, speak: [question] },
    replay: listen ? [list] : [question],
    stage: listen ? { type: 'listen' } : { type: 'none' },
    choices: options.map((w) => ({ value: w.en, label: w.en, lang: 'en' })),
    choiceStyle: 'words',
    answer: odd.en,
    success: { speak: [say(`${odd.en}!`), `Oui ! ${name}, ce n’est pas ${group.fr}.`] },
  };
}

export const intrusAnglais = {
  id: 'intrus-anglais',
  domain: 'anglais',
  title: 'L’intrus en anglais',
  icon: '🕵️',
  skill: 'Classer des mots anglais par famille et trouver l’intrus',
  levels: INTRUS_LEVELS.map((l) => l.label),
  generate(level, rng) {
    const { more, listen, lookAlike, hidden } = INTRUS_LEVELS[level - 1];
    const groups = more ? ALL_GROUPS : GROUPS;
    const group = pick(rng, groups);
    // (le mot « family » ne sert pas : « Which one is not in the family? » deviendrait confus)
    const short = (w) => w.en.length <= 9 && w.en !== 'family';
    // nouveaux niveaux : le poisson (fish) se mange aussi, ce n'est pas un intrus parmi les aliments
    const oddOk = (w) => short(w) && !(more && group.theme === 'À manger' && w.en === 'fish');
    let odd;
    let members;
    if (lookAlike) {
      members = sample(rng, theme(group.theme).filter(short), 3);
      const pool = groups.filter((g) => g !== group).flatMap((g) => theme(g.theme)).filter(oddOk);
      odd = lookAlikeOdd(rng, members, pool);
    } else {
      const other = pick(rng, groups.filter((g) => g !== group));
      members = sample(rng, theme(group.theme).filter(short), 3);
      odd = pick(rng, theme(other.theme).filter(oddOk));
    }
    const options = shuffle(rng, [...members, odd]);
    const list = say(options.map((w) => w.en).join(', '), 0.75);
    if (more) return moreIntrus(level, { group, odd, members, options, list, listen, hidden });
    const question = say(`Which one is not ${group.en}?`);
    return {
      key: `intrus-anglais:${level}:${odd.en}:${members.map((w) => w.en).join(',')}`,
      text: `Lequel n’est pas ${group.fr} ?`,
      instruction: listen
        ? [`Écoute les mots anglais : lequel n’est pas ${group.fr} ?`, question, list]
        : [`Lequel n’est pas ${group.fr} ?`, question],
      short: { key: `intrus-anglais:${level}`, text: `Lequel n’est pas ${group.fr} ?`, speak: [question] },
      replay: listen ? [list] : [question],
      stage: listen ? { type: 'listen' } : { type: 'none' },
      choices: options.map((w) => (level === 1
        ? { value: w.en, label: w.emoji }
        : { value: w.en, label: w.en, lang: 'en' })),
      choiceStyle: level === 1 ? 'pictures' : 'words',
      answer: odd.en,
      success: { speak: [say(`Yes! The ${odd.en} is not ${group.en}.`)] },
    };
  },
};

// ---------------------------------------------------------------- Les contraires

const OPPOSITES = [
  [{ en: 'big', emoji: '🐘' }, { en: 'small', emoji: '🐭' }],
  [{ en: 'hot', emoji: '🔥' }, { en: 'cold', emoji: '❄️' }],
  [{ en: 'happy', emoji: '😀' }, { en: 'sad', emoji: '😢' }],
  [{ en: 'day', emoji: '☀️' }, { en: 'night', emoji: '🌙' }],
  [{ en: 'fast', emoji: '🚀' }, { en: 'slow', emoji: '🐢' }],
  [{ en: 'up', emoji: '⬆️' }, { en: 'down', emoji: '⬇️' }],
  [{ en: 'young', emoji: '👶' }, { en: 'old', emoji: '👴' }],
  [{ en: 'loud', emoji: '📢' }, { en: 'quiet', emoji: '🤫' }],
  [{ en: 'tall', emoji: '🦒' }, { en: 'short', emoji: '🐧' }],
  [{ en: 'open', emoji: '📖' }, { en: 'closed', emoji: '📕' }],
];
// Niveaux 4 et 5 : d'autres contraires, sans image (aucun mot n'a deux contraires dans la liste).
export const ALL_OPPOSITES = [
  ...OPPOSITES,
  ...[['wet', 'dry'], ['clean', 'dirty'], ['full', 'empty'], ['hard', 'soft'], ['heavy', 'light'], ['black', 'white'],
    ['near', 'far'], ['first', 'last'], ['left', 'right'], ['strong', 'weak'], ['in', 'out'], ['on', 'off']]
    .map((pair) => pair.map((en) => ({ en }))),
];

// Niveaux 6 et 7 : deux petites phrases ; le mot qui manque est le contraire d'un mot de la
// première. Les mauvaises réponses : le même mot (pas son contraire) et un mot qui n'a pas de sens.
export const OPPOSITE_SENTENCES = [
  { s: 'The elephant is big. The mouse is…', a: 'small', wrong: ['big', 'empty'] },
  { s: 'The fire is hot. The snow is…', a: 'cold', wrong: ['hot', 'happy'] },
  { s: 'The giraffe is tall. The penguin is…', a: 'short', wrong: ['tall', 'open'] },
  { s: 'The rocket is fast. The tortoise is…', a: 'slow', wrong: ['fast', 'empty'] },
  { s: 'The baby is young. Grandpa is…', a: 'old', wrong: ['young', 'closed'] },
  { s: 'The lion is loud. The mouse is…', a: 'quiet', wrong: ['loud', 'closed'] },
  { s: 'The box is heavy. The feather is…', a: 'light', wrong: ['heavy', 'sad'] },
  { s: 'The glass is full. The cup is…', a: 'empty', wrong: ['full', 'loud'] },
  { s: 'The rock is hard. The pillow is…', a: 'soft', wrong: ['hard', 'fast'] },
  { s: 'The pig is dirty. The cat is…', a: 'clean', wrong: ['dirty', 'empty'] },
  { s: 'The duck is wet. The cat is…', a: 'dry', wrong: ['wet', 'open'] },
  { s: 'The door is open. The window is…', a: 'closed', wrong: ['open', 'young'] },
  { s: 'The night is black. The snow is…', a: 'white', wrong: ['black', 'happy'] },
  { s: 'The clown is happy. The baby is…', a: 'sad', wrong: ['happy', 'empty'] },
];

const CONTRAIRES_LEVELS = ['Avec les images', 'Lis les mots', 'Écoute et lis', 'Plus de contraires', 'Écoute, plus de mots',
  'Complète avec le contraire', 'Écoute et complète'];

/** Niveaux 6 et 7 : compléter la deuxième phrase avec le contraire (lue, puis seulement entendue). */
function oppositeSentence(level, rng) {
  const item = pick(rng, OPPOSITE_SENTENCES);
  const listen = level === 7;
  const line = say(item.s, 0.8);
  const ask = listen
    ? 'Écoute les deux phrases. Quel mot manque ? C’est le contraire d’un mot de la première phrase.'
    : 'Lis les deux phrases. Quel mot manque ? C’est le contraire d’un mot de la première phrase.';
  return {
    key: `contraires-anglais:${level}:${item.a}:${item.s}`,
    text: 'Quel mot manque ? C’est un contraire.',
    instruction: [ask, line],
    short: { key: `contraires-anglais:${level}`, text: 'Le contraire ?', speak: [line] },
    replay: [line],
    stage: listen ? { type: 'listen' } : { type: 'sentence', text: item.s, lang: 'en' },
    choices: shuffle(rng, [item.a, ...item.wrong]).map((w) => ({ value: w, label: w, lang: 'en' })),
    choiceStyle: 'words',
    answer: item.a,
    success: { speak: [say(item.s.replace('…', ` ${item.a}.`))] },
  };
}

export const contrairesAnglais = {
  id: 'contraires-anglais',
  domain: 'anglais',
  title: 'Les contraires',
  icon: '↔️',
  skill: 'Connaître des adjectifs anglais et leurs contraires (big / small, hot / cold…)',
  levels: CONTRAIRES_LEVELS,
  generate(level, rng) {
    if (level >= 6) return oppositeSentence(level, rng);
    if (level >= 4) return moreOpposites(level, rng);
    const pair = pick(rng, OPPOSITES);
    const flip = rng() < 0.5;
    const [word, opposite] = flip ? [pair[1], pair[0]] : pair;
    const distractors = sample(rng, OPPOSITES.filter((p) => p !== pair).flat(), 2);
    const options = shuffle(rng, [opposite, ...distractors]);
    const ask = say(`What is the opposite of ${word.en}?`);
    const stage = level === 3 ? { type: 'listen' } : { type: 'word', text: `${word.emoji} ${word.en}`, lang: 'en' };
    return {
      key: `contraires-anglais:${level}:${word.en}`,
      text: 'Quel est le contraire ?',
      instruction: level === 3
        ? ['Écoute le mot anglais, et touche son contraire.', say(word.en, 0.75)]
        : [`Quel est le contraire de « ${word.en} » ?`, ask],
      short: { key: `contraires-anglais:${level}`, text: 'Le contraire ?', speak: level === 3 ? [say(word.en, 0.75)] : [ask] },
      replay: level === 3 ? [say(word.en, 0.75)] : [ask],
      stage,
      choices: options.map((w) => (level === 1
        ? { value: w.en, label: w.emoji }
        : { value: w.en, label: w.en, lang: 'en' })),
      choiceStyle: level === 1 ? 'pictures' : 'words',
      answer: opposite.en,
      success: { speak: [say(`${word.en}, ${opposite.en}!`)] },
    };
  },
};

/** Niveaux 4 et 5 : plus de contraires, le mot écrit sans image, puis seulement entendu. */
function moreOpposites(level, rng) {
  const pair = pick(rng, ALL_OPPOSITES);
  const [word, opposite] = rng() < 0.5 ? [pair[1], pair[0]] : pair;
  const distractors = sample(rng, ALL_OPPOSITES.filter((p) => p !== pair).flat(), 2);
  const options = shuffle(rng, [opposite, ...distractors]);
  const listen = level === 5;
  const heard = say(word.en, 0.75);
  const ask = say(`What is the opposite of ${word.en}?`);
  return {
    key: `contraires-anglais:${level}:${word.en}`,
    text: 'Quel est le contraire ?',
    instruction: listen ? ['Écoute le mot anglais, et touche son contraire.', heard] : [`Quel est le contraire de « ${word.en} » ?`, ask],
    short: { key: `contraires-anglais:${level}`, text: 'Le contraire ?', speak: listen ? [heard] : [ask] },
    replay: listen ? [heard] : [ask],
    stage: listen ? { type: 'listen' } : { type: 'word', text: word.en, lang: 'en' },
    choices: options.map((w) => ({ value: w.en, label: w.en, lang: 'en' })),
    choiceStyle: 'words',
    answer: opposite.en,
    success: { speak: [say(`${word.en}, ${opposite.en}!`)] },
  };
}

// ---------------------------------------------------------------- Une phrase en anglais

const SENTENCES = [
  { words: ['I', 'like', 'apples'], emoji: '🍎', fr: 'J’aime les pommes.' },
  { words: ['I', 'am', 'happy'], emoji: '😀', fr: 'Je suis content.' },
  { words: ['It', 'is', 'sunny'], emoji: '☀️', fr: 'Il fait beau.' },
  { words: ['I', 'love', 'cats'], emoji: '🐱', fr: 'J’adore les chats.' },
  { words: ['The', 'dog', 'is', 'big'], emoji: '🐕', fr: 'Le chien est grand.' },
  { words: ['I', 'have', 'two', 'dogs'], emoji: '🐶', fr: 'J’ai deux chiens.' },
  { words: ['My', 'hat', 'is', 'red'], emoji: '👒', fr: 'Mon chapeau est rouge.' },
  { words: ['It', 'is', 'very', 'cold'], emoji: '❄️', fr: 'Il fait très froid.' },
  { words: ['I', 'can', 'see', 'a', 'bird'], emoji: '🐦', fr: 'Je vois un oiseau.' },
  { words: ['The', 'cat', 'is', 'very', 'small'], emoji: '🐈', fr: 'Le chat est tout petit.' },
  { words: ['I', 'like', 'to', 'eat', 'cake'], emoji: '🎂', fr: 'J’aime manger du gâteau.' },
];
// Niveaux 5 et 7 : d'autres phrases de 4 et 5 mots (pas plus : les mots doivent tenir sur une ligne).
const MORE_SENTENCES = [
  { words: ['I', 'have', 'a', 'red', 'hat'], emoji: '👒', fr: 'J’ai un chapeau rouge.' },
  { words: ['The', 'sun', 'is', 'hot'], emoji: '☀️', fr: 'Le soleil est chaud.' },
  { words: ['I', 'can', 'ride', 'a', 'bike'], emoji: '🚲', fr: 'Je sais faire du vélo.' },
  { words: ['My', 'mum', 'is', 'tall'], emoji: '👩', fr: 'Ma maman est grande.' },
  { words: ['We', 'play', 'at', 'school'], emoji: '🏫', fr: 'Nous jouons à l’école.' },
  { words: ['I', 'see', 'a', 'big', 'fish'], emoji: '🐟', fr: 'Je vois un gros poisson.' },
  { words: ['The', 'frog', 'is', 'green'], emoji: '🐸', fr: 'La grenouille est verte.' },
  { words: ['I', 'like', 'my', 'blue', 'bag'], emoji: '🎒', fr: 'J’aime mon cartable bleu.' },
  { words: ['The', 'bird', 'can', 'fly'], emoji: '🐦', fr: 'L’oiseau sait voler.' },
  { words: ['I', 'eat', 'a', 'green', 'apple'], emoji: '🍏', fr: 'Je mange une pomme verte.' },
];
// Niveau 4 : des questions.
const QUESTIONS = [
  { words: ['What', 'is', 'your', 'name'], emoji: '👋', fr: 'Comment t’appelles-tu ?' },
  { words: ['How', 'old', 'are', 'you'], emoji: '🎂', fr: 'Quel âge as-tu ?' },
  { words: ['Where', 'is', 'the', 'cat'], emoji: '🐱', fr: 'Où est le chat ?' },
  { words: ['Do', 'you', 'like', 'apples'], emoji: '🍎', fr: 'Est-ce que tu aimes les pommes ?' },
  { words: ['Can', 'you', 'swim'], emoji: '🏊', fr: 'Est-ce que tu sais nager ?' },
  { words: ['What', 'colour', 'is', 'it'], emoji: '🎨', fr: 'De quelle couleur est-ce ?' },
  { words: ['Is', 'it', 'a', 'dog'], emoji: '🐶', fr: 'Est-ce que c’est un chien ?' },
  { words: ['How', 'are', 'you'], emoji: '😀', fr: 'Comment vas-tu ?' },
  { words: ['Do', 'you', 'have', 'a', 'pet'], emoji: '🐹', fr: 'Est-ce que tu as un animal ?' },
  { words: ['Can', 'I', 'have', 'some', 'cake'], emoji: '🍰', fr: 'Est-ce que je peux avoir du gâteau ?' },
];
/** Niveau 6 : on entend une question, on écrit la réponse (avec le prénom de l'enfant). */
function answers(name) {
  return [
    { q: 'What is your name?', emoji: '👋', words: ['My', 'name', 'is', name], fr: `Je m’appelle ${name}.` },
    { q: 'What is it?', emoji: '🐱', words: ['It', 'is', 'a', 'cat'], fr: 'C’est un chat.' },
    { q: 'What colour is the frog?', emoji: '🐸', words: ['The', 'frog', 'is', 'green'], fr: 'La grenouille est verte.' },
    { q: 'Do you like cake?', emoji: '🎂', words: ['Yes,', 'I', 'like', 'cake'], fr: 'Oui, j’aime le gâteau.' },
    { q: 'How are you?', emoji: '😀', words: ['I', 'am', 'fine,', 'thank', 'you'], fr: 'Je vais bien, merci.' },
    { q: 'Where is the dog?', emoji: '🐶', words: ['It', 'is', 'in', 'the', 'garden'], fr: 'Il est dans le jardin.' },
    { q: 'Can you swim?', emoji: '🏊', words: ['Yes,', 'I', 'can', 'swim'], fr: 'Oui, je sais nager.' },
    { q: 'Is it sunny?', emoji: '🌧️', words: ['No,', 'it', 'is', 'raining'], fr: 'Non, il pleut.' },
    { q: 'Do you have a pet?', emoji: '🐰', words: ['I', 'have', 'a', 'rabbit'], fr: 'J’ai un lapin.' },
  ];
}
// Les phrases de 4 et 5 mots, pour écouter sans image (niveau 5) et écrire d'après le français (niveau 7).
const LONG_SENTENCES = [...SENTENCES.filter((st) => st.words.length >= 4), ...MORE_SENTENCES];

/** Les mots mélangés (jamais déjà dans l'ordre). */
function shuffledWords(rng, words) {
  let order = shuffle(rng, words.map((_, i) => i));
  if (order.every((v, i) => v === i)) order = [...order.slice(1), order[0]];
  return order.map((i) => ({ value: i, label: words[i] }));
}

/** Niveaux 4 à 7 : une question, écouter sans image, répondre à une question, écrire d'après le français. */
function morePhrases(level, rng, name) {
  const common = { interaction: 'order', order: 'asc', sign: '', lang: 'en', byLabel: true, choices: [] };
  if (level === 6) {
    const item = pick(rng, answers(name));
    const text = `${item.words.join(' ')}.`;
    const question = say(item.q, 0.8);
    return {
      ...common,
      key: `phrase-anglais:${level}:${item.q}`,
      text: 'Réponds à la question : touche les mots dans l’ordre.',
      instruction: ['Écoute la question. Pour répondre, touche les mots dans l’ordre.', question],
      short: { key: 'phrase-anglais:reponse', text: 'Réponds à la question !', speak: [question] },
      replay: [question],
      stage: { type: 'picture', emoji: item.emoji },
      items: shuffledWords(rng, item.words),
      answer: text,
      success: { speak: [question, say(text, 0.75), item.fr] },
    };
  }
  const question = level === 4;
  const sentence = pick(rng, question ? QUESTIONS : LONG_SENTENCES);
  const text = `${sentence.words.join(' ')}${question ? '?' : '.'}`;
  const sound = say(text, 0.75);
  const base = {
    ...common,
    key: `phrase-anglais:${level}:${text}`,
    items: shuffledWords(rng, sentence.words),
    answer: text,
    success: { speak: [sound, sentence.fr] },
  };
  if (level === 7) {
    // on lit la phrase en français, sans l'entendre en anglais
    return {
      ...base,
      text: 'Écris cette phrase en anglais : touche les mots dans l’ordre.',
      instruction: 'Lis la phrase en français. Écris-la en anglais : touche les mots dans l’ordre.',
      short: { key: 'phrase-anglais:francais', text: 'En anglais !' },
      stage: { type: 'sentence', text: sentence.fr },
    };
  }
  return {
    ...base,
    text: question ? 'Touche les mots dans l’ordre pour écrire la question.' : 'Écoute la phrase, et touche les mots dans l’ordre.',
    instruction: [question ? 'Écoute la question, puis touche les mots dans l’ordre.' : 'Écoute bien la phrase, puis touche les mots dans l’ordre.', sound],
    short: { key: question ? 'phrase-anglais:question' : 'phrase-anglais:ecoute', text: 'Les mots dans l’ordre !', speak: [sound] },
    replay: [sound],
    stage: question ? { type: 'picture', emoji: sentence.emoji } : { type: 'listen' },
  };
}

export const phraseAnglais = {
  id: 'phrase-anglais',
  domain: 'anglais',
  title: 'Une phrase en anglais',
  icon: '💬',
  skill: 'Remettre les mots d’une petite phrase anglaise dans l’ordre',
  levels: ['Phrases de 3 mots', 'Phrases de 4 mots', 'Phrases de 5 mots', 'Les questions', 'Écoute, sans image',
    'Réponds à la question', 'D’après le français'],
  generate(level, rng, index = 0, context = {}) {
    if (level >= 4) return morePhrases(level, rng, context.name || 'Lou');
    const sentence = pick(rng, SENTENCES.filter((st) => st.words.length === level + 2));
    const text = `${sentence.words.join(' ')}.`;
    const sound = say(text, 0.75);
    let order = shuffle(rng, sentence.words.map((_, i) => i));
    if (order.every((v, i) => v === i)) order = [...order.slice(1), order[0]];
    return {
      key: `phrase-anglais:${text}`,
      interaction: 'order',
      text: 'Touche les mots dans l’ordre pour écrire la phrase.',
      instruction: ['Écoute la phrase, puis touche les mots dans l’ordre.', sound],
      short: { key: 'phrase-anglais', text: 'Les mots dans l’ordre !', speak: [sound] },
      replay: [sound],
      stage: { type: 'picture', emoji: sentence.emoji },
      items: order.map((i) => ({ value: i, label: sentence.words[i] })),
      order: 'asc',
      sign: '',
      lang: 'en',
      choices: [],
      answer: text,
      success: { speak: [sound, sentence.fr] },
    };
  },
};

export const ANGLAIS_PLUS_GAMES = [
  nombresAnglais, calculAnglais, couleursAnglais, colorieAnglais, memoryAnglais, intrusAnglais, contrairesAnglais, phraseAnglais,
];
