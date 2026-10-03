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
];

export const nombresAnglais = {
  id: 'nombres-anglais',
  domain: 'anglais',
  title: 'Les nombres en anglais',
  icon: '🔢',
  skill: 'Comprendre et lire les nombres en anglais, de one à one hundred',
  levels: NUMBER_LEVELS.map((l) => l.label),
  generate(level, rng) {
    const { min, max, mode } = NUMBER_LEVELS[level - 1];
    const n = mode === 'tens' ? randInt(rng, min, max) * 10 : randInt(rng, min, max);
    const word = englishNumber(n);
    const sound = say(word, 0.8);
    const choices = (mode === 'tens'
      ? shuffle(rng, [n, ...sample(rng, [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].filter((v) => v !== n), 3)])
      : numberChoices(rng, n, 4, Math.max(1, min - 2), max + 2)
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

// ---------------------------------------------------------------- Calculer en anglais

const CALC_LEVELS = [
  { label: 'Plus, jusqu’à 5', op: '+', max: 5 },
  { label: 'Plus, jusqu’à 10', op: '+', max: 10 },
  { label: 'Minus, jusqu’à 10', op: '−', max: 10 },
  { label: 'Réponds en anglais', op: '±', max: 10, words: true },
];

export const calculAnglais = {
  id: 'calcul-anglais',
  domain: 'anglais',
  title: 'Calcule en anglais',
  icon: '➕',
  skill: 'Comprendre un calcul dit en anglais (plus, minus) et répondre',
  levels: CALC_LEVELS.map((l) => l.label),
  generate(level, rng) {
    const { op: kind, max, words } = CALC_LEVELS[level - 1];
    const op = kind === '±' ? pick(rng, ['+', '−']) : kind;
    let a;
    let b;
    if (op === '+') {
      a = randInt(rng, 1, max - 1);
      b = randInt(rng, 1, max - a);
    } else {
      a = randInt(rng, 2, max);
      b = randInt(rng, 1, a - 1);
    }
    const n = op === '+' ? a + b : a - b;
    const spoken = `${englishNumber(a)} ${op === '+' ? 'plus' : 'minus'} ${englishNumber(b)}`;
    const sound = say(`${spoken}?`, 0.8);
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
      success: { speak: [say(`${spoken} is ${englishNumber(n)}!`)] },
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

export const couleursAnglais = {
  id: 'couleurs-anglais',
  domain: 'anglais',
  title: 'Mélange les couleurs',
  icon: '🎨',
  skill: 'Les couleurs en anglais : mélanger deux couleurs et nommer le résultat',
  levels: ['Regarde et mélange', 'Lis et mélange', 'Le nom en anglais'],
  generate(level, rng) {
    const [a, b, result] = pick(rng, MIXES);
    const sentence = `${a} and ${b} make ${result}`;
    const others = sample(rng, Object.keys(EN_COLORS).filter((c) => c !== result && c !== a && c !== b), 2);
    const options = shuffle(rng, [result, ...others]);
    const pair = rng() < 0.5 ? [a, b] : [b, a];
    const stage = level === 2
      ? { type: 'word', text: `${pair[0]} + ${pair[1]} = ?`, lang: 'en' }
      : { type: 'pattern', items: [EN_COLORS[pair[0]].square, '+', EN_COLORS[pair[1]].square, '=', null] };
    const ask = say(`${pair[0]} and ${pair[1]} make...?`);
    return {
      key: `couleurs-anglais:${level}:${result}`,
      text: level === 3 ? 'Quelle couleur ? Réponds en anglais.' : 'Quelle couleur obtient-on ?',
      instruction: level === 3
        ? ['Si on mélange ces deux couleurs, quelle couleur obtient-on ? Touche son nom en anglais.', ask]
        : ['Si on mélange ces deux couleurs, quelle couleur obtient-on ?', ask],
      short: { key: `couleurs-anglais:${level}`, text: level === 3 ? 'Le nom en anglais ?' : 'Quelle couleur ?', speak: [ask] },
      replay: [ask],
      stage,
      choices: options.map((c) => (level === 3
        ? { value: c, label: c, lang: 'en' }
        : { value: c, swatch: EN_COLORS[c].hex, name: EN_COLORS[c].fr })),
      choiceStyle: level === 3 ? 'words' : 'pictures',
      answer: result,
      success: { speak: [say(`${sentence}!`), `${EN_COLORS[a].fr} et ${EN_COLORS[b].fr}, ça fait ${EN_COLORS[result].fr} !`] },
    };
  },
};

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

export const colorieAnglais = {
  id: 'colorie-anglais',
  domain: 'anglais',
  title: 'Colorie en anglais',
  icon: '🖌️',
  skill: 'Lire les noms des couleurs en anglais pour colorier un dessin',
  levels: ['3 couleurs', '5 couleurs', 'D’autres couleurs'],
  generate(level, rng) {
    const set = PAINT_SETS[level - 1];
    const drawing = pick(rng, EN_DRAWINGS);
    const legend = set.map((name, i) => ({ hex: EN_COLORS[name].hex, name: EN_COLORS[name].fr, n: i + 1, word: name }));
    const zones = drawing.zones.map((z) => {
      const c = z.c % set.length;
      return { d: z.d, at: z.at, c, label: String(c + 1) };
    });
    return {
      key: `colorie-anglais:${level}:${drawing.name}`,
      interaction: 'colorby',
      text: 'Lis la couleur en anglais à côté de chaque nombre, et colorie.',
      instruction: 'Lis la couleur en anglais à côté de chaque nombre, puis colorie les zones qui ont ce nombre.',
      short: { key: 'colorie-anglais', text: 'Lis la couleur, et colorie !' },
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
];

export const memoryAnglais = {
  id: 'memory-anglais',
  domain: 'anglais',
  title: 'Le memory anglais',
  icon: '🃏',
  skill: 'Retrouver les paires : une image et son mot anglais',
  levels: MEMORY_LEVELS.map((l) => l.label),
  generate(level, rng) {
    const { themes, pairs } = MEMORY_LEVELS[level - 1];
    const pool = themes[0] === 'colors'
      ? Object.entries(EN_COLORS).filter(([, c]) => c.square).map(([en, c]) => ({ en, emoji: c.square }))
      : themes.flatMap(theme).filter((w) => w.emoji && w.en.length <= 8);
    const words = sample(rng, pool, pairs);
    const cards = shuffle(rng, words.flatMap((w) => [
      { pair: w.en, label: w.emoji, say: say(w.en) },
      { pair: w.en, label: w.en, word: true, lang: 'en', say: say(w.en) },
    ]));
    return {
      key: `memory-anglais:${level}:${words.map((w) => w.en).join(',')}`,
      interaction: 'memory',
      text: 'Retrouve les paires : une image et son mot anglais.',
      instruction: 'Retrouve les paires : chaque image va avec son mot anglais. Retourne deux cartes à la fois.',
      short: { key: 'memory-anglais', text: 'Retrouve les paires.' },
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

export const intrusAnglais = {
  id: 'intrus-anglais',
  domain: 'anglais',
  title: 'L’intrus en anglais',
  icon: '🕵️',
  skill: 'Classer des mots anglais par famille et trouver l’intrus',
  levels: ['Avec les images', 'Avec les mots', 'Écoute l’intrus'],
  generate(level, rng) {
    const group = pick(rng, GROUPS);
    const other = pick(rng, GROUPS.filter((g) => g !== group));
    const short = (w) => w.en.length <= 9;
    const members = sample(rng, theme(group.theme).filter(short), 3);
    const odd = pick(rng, theme(other.theme).filter(short));
    const options = shuffle(rng, [...members, odd]);
    const question = say(`Which one is not ${group.en}?`);
    const listen = level === 3;
    return {
      key: `intrus-anglais:${level}:${odd.en}:${members.map((w) => w.en).join(',')}`,
      text: `Lequel n’est pas ${group.fr} ?`,
      instruction: listen
        ? [`Écoute les mots anglais : lequel n’est pas ${group.fr} ?`, question, say(options.map((w) => w.en).join(', '), 0.75)]
        : [`Lequel n’est pas ${group.fr} ?`, question],
      short: { key: `intrus-anglais:${level}`, text: `Lequel n’est pas ${group.fr} ?`, speak: [question] },
      replay: listen ? [say(options.map((w) => w.en).join(', '), 0.75)] : [question],
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

export const contrairesAnglais = {
  id: 'contraires-anglais',
  domain: 'anglais',
  title: 'Les contraires',
  icon: '↔️',
  skill: 'Connaître des adjectifs anglais et leurs contraires (big / small, hot / cold…)',
  levels: ['Avec les images', 'Lis les mots', 'Écoute et lis'],
  generate(level, rng) {
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

export const phraseAnglais = {
  id: 'phrase-anglais',
  domain: 'anglais',
  title: 'Une phrase en anglais',
  icon: '💬',
  skill: 'Remettre les mots d’une petite phrase anglaise dans l’ordre',
  levels: ['Phrases de 3 mots', 'Phrases de 4 mots', 'Phrases de 5 mots'],
  generate(level, rng) {
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
