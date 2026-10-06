// Jeux d'anglais : on entend le mot prononcé par une voix anglaise.

import { pick, randInt, sample, shuffle } from '../random.js';
import { numberChoices, similarWords } from './helpers.js';
import { COLOUR_PHRASES, ENGLISH_THEMES } from '../data/anglais-data.js';

const EN = 'en-GB';
const LEVELS = ENGLISH_THEMES.map((t) => `${t.icon} ${t.title}`);
// Après les 10 thèmes, trois niveaux transversaux : tous les thèmes mélangés, des mots
// proches (ou une variante du jeu), puis une petite phrase ou une variante plus difficile.
const THEMES = ENGLISH_THEMES.length;
const CLOSE = THEMES + 2;
const EXTRA = THEMES + 3;
const ALL_WORDS = ENGLISH_THEMES.flatMap((t) => t.words);

function picture(word) {
  if (word.swatch) return { swatch: word.swatch, name: word.fr };
  if (word.emoji) return { label: word.emoji };
  return { label: word.label };
}

function themeWords(level, rng, count) {
  const { words } = ENGLISH_THEMES[level - 1];
  const target = pick(rng, words);
  const others = sample(rng, words.filter((w) => w !== target), count - 1);
  return { target, options: shuffle(rng, [target, ...others]) };
}

/**
 * Le mot à trouver et les images proposées : un thème (niveaux 1 à 10), tous les thèmes
 * mélangés (niveau 11), ou des mots qui se ressemblent (CLOSE : pig, pink, pen, pencil).
 * `fits` limite le mot à trouver (par exemple sa longueur, pour qu'il tienne à l'écran).
 */
function pickWords(level, rng, count, fits = () => true) {
  if (level <= THEMES) return themeWords(level, rng, count);
  const target = pick(rng, ALL_WORDS.filter(fits));
  const others = level === CLOSE
    ? similarWords(rng, target.en, ALL_WORDS.map((w) => w.en), count - 1).map((en) => ALL_WORDS.find((w) => w.en === en))
    : sample(rng, ALL_WORDS.filter((w) => w !== target), count - 1);
  return { target, options: shuffle(rng, [target, ...others]) };
}

/**
 * Une petite phrase « a green book » et des images proches : le même objet d'une autre
 * couleur, la même couleur sur un autre objet… il faut comprendre les deux mots.
 */
export function phraseOptions(rng, count) {
  const target = pick(rng, COLOUR_PHRASES);
  const near = [
    ...sample(rng, COLOUR_PHRASES.filter((p) => p !== target && p.thing === target.thing), 1),
    ...sample(rng, COLOUR_PHRASES.filter((p) => p !== target && p.colour === target.colour), 1),
  ];
  const rest = shuffle(rng, COLOUR_PHRASES.filter((p) => p !== target && !near.includes(p)));
  return { target, options: shuffle(rng, [target, ...near, ...rest].slice(0, count)) };
}

/** Quatre petites phrases croisées : 2 objets × 2 couleurs (a red book, a green book, a red heart, a green heart). */
export function phraseGrid(rng) {
  const things = [...new Set(COLOUR_PHRASES.map((p) => p.thing))];
  const coloursOf = (thing) => COLOUR_PHRASES.filter((p) => p.thing === thing).map((p) => p.colour);
  const pairs = things.flatMap((a, i) => things.slice(i + 1).map((b) => [a, b, coloursOf(a).filter((c) => coloursOf(b).includes(c))]))
    .filter(([, , shared]) => shared.length >= 2);
  const [a, b, shared] = pick(rng, pairs);
  const colours = sample(rng, shared, 2);
  return COLOUR_PHRASES.filter((p) => [a, b].includes(p.thing) && colours.includes(p.colour));
}

function successSpeech(word) {
  return [{ text: word.en, lang: EN }, `C’est ${word.fr} !`];
}

export const ecoute = {
  id: 'ecoute',
  domain: 'anglais',
  title: 'Écoute et touche',
  icon: '👂',
  skill: 'Comprendre des mots anglais à l’oral',
  levels: [...LEVELS, 'Tous les thèmes mélangés', '4 images, mots proches', 'Une petite phrase'],
  generate(level, rng) {
    const phrase = level === EXTRA;
    const { target, options } = phrase ? phraseOptions(rng, 4) : pickWords(level, rng, level === CLOSE ? 4 : 3);
    const sound = { text: target.en, lang: EN, rate: 0.8 };
    return {
      key: `ecoute:${target.en}`,
      text: phrase ? 'Écoute la petite phrase anglaise et touche la bonne image.' : 'Écoute le mot anglais et touche la bonne image.',
      instruction: ['Écoute bien, et touche :', sound],
      short: { text: 'Écoute et touche.', speak: [sound] },
      replay: [sound],
      stage: { type: 'listen' },
      choices: options.map((w) => ({ value: w.en, ...picture(w) })),
      choiceStyle: 'pictures',
      answer: target.en,
      success: { speak: successSpeech(target) },
    };
  },
};

export const lisAnglais = {
  id: 'lis-anglais',
  domain: 'anglais',
  title: 'Lis et touche',
  icon: '📗',
  skill: 'Lire un mot anglais et le relier à son image',
  levels: [...LEVELS, 'Tous les thèmes mélangés', 'Mots qui se ressemblent', 'Lis une petite phrase'],
  generate(level, rng) {
    const phrase = level === EXTRA;
    // un mot de plus de 8 lettres ne tiendrait pas en gros caractères sur un petit téléphone
    const { target, options } = phrase ? phraseOptions(rng, 4) : pickWords(level, rng, 4, (w) => w.en.length <= 8);
    return {
      key: `lis-anglais:${target.en}`,
      text: phrase ? 'Lis la petite phrase anglaise. Quelle image va avec ?' : 'Lis le mot anglais. Quelle image va avec ?',
      instruction: phrase
        ? 'Lis la petite phrase anglaise, et touche la bonne image. Attention à la couleur, et à l’objet !'
        : 'Lis le mot anglais, et touche la bonne image. Tu peux toucher le mot pour l’entendre.',
      short: { text: 'Quelle image ?' },
      replay: [{ text: target.en, lang: EN, rate: 0.8 }],
      stage: phrase ? { type: 'sentence', text: target.en, lang: 'en' } : { type: 'word', text: target.en, lang: 'en' },
      choices: options.map((w) => ({ value: w.en, ...picture(w) })),
      choiceStyle: 'pictures',
      answer: target.en,
      success: { speak: successSpeech(target) },
    };
  },
};

export const motAnglais = {
  id: 'mot-anglais',
  domain: 'anglais',
  title: 'Le mot anglais',
  icon: '🇬🇧',
  skill: 'Retrouver le mot anglais qui correspond à une image',
  levels: [...LEVELS, 'Tous les thèmes mélangés', 'Mots qui se ressemblent', 'Une petite phrase'],
  generate(level, rng) {
    const { target, options } = level === EXTRA ? phraseOptions(rng, 3) : pickWords(level, rng, 3);
    const pic = picture(target);
    return {
      key: `mot-anglais:${target.en}`,
      text: 'Comment dit-on en anglais ?',
      instruction: `Comment dit-on ${target.fr.replace(/^(le|la|les|l')\s?/, '')} en anglais ?`,
      short: { text: 'En anglais ?', speak: `${target.fr.replace(/^(le|la|les|l')\s?/, '')}, en anglais ?` },
      stage: pic.swatch ? { type: 'swatch', color: pic.swatch } : { type: 'picture', emoji: pic.label },
      choices: options.map((w) => ({ value: w.en, label: w.en, lang: 'en' })),
      choiceStyle: 'words',
      answer: target.en,
      success: { speak: successSpeech(target) },
    };
  },
};

// Jeux inspirés des applications d'anglais pour enfants (Lingokids, Duolingo ABC,
// Gus on the Go…) : relier mot et image, compter, « où est le chat ? », épeler.

export const relieAnglais = {
  id: 'relie-anglais',
  domain: 'anglais',
  title: 'Relie en anglais',
  icon: '🔗',
  skill: 'Associer des mots anglais écrits à leur image',
  levels: [...LEVELS, 'Tous les thèmes mélangés', 'Mot français ↔ anglais', 'Une petite phrase'],
  generate(level, rng) {
    // sans image (CLOSE) : le mot français à gauche ; un mot de plus de 8 lettres ne tiendrait pas
    const french = level === CLOSE;
    const shortFrench = (w) => w.fr.split(/[\s'’-]/).every((part) => part.length <= 8);
    const phrase = level === EXTRA;
    let words;
    if (level <= THEMES) words = sample(rng, ENGLISH_THEMES[level - 1].words, 4);
    else if (phrase) words = shuffle(rng, phraseGrid(rng));
    else words = sample(rng, french ? ALL_WORDS.filter(shortFrench) : ALL_WORDS, 4);
    let goal = 'chaque image à son mot anglais';
    if (french) goal = 'chaque mot français à son mot anglais';
    if (phrase) goal = 'chaque image à sa petite phrase anglaise';
    return {
      key: `relie-anglais:${words.map((w) => w.en).join(',')}`,
      interaction: 'match',
      text: `Relie ${goal}.`,
      instruction: `Relie ${goal}. Quand c’est juste, tu entends ${phrase ? 'la phrase' : 'le mot'}.`,
      short: { text: 'Relie !' },
      stage: { type: 'none' },
      pairs: words.map((w) => ({
        ...(french ? {} : w.swatch ? { swatch: w.swatch } : { emoji: w.emoji || w.label }),
        left: w.fr,
        right: w.en,
        say: { text: w.en, lang: EN, rate: 0.85 },
      })),
      rights: shuffle(rng, words.map((w) => w.en)),
      rightLang: 'en',
      choices: [],
      answer: null,
      success: { speak: [{ text: 'Well done!', lang: EN }] },
    };
  },
};

const NUMBER_WORDS = [
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
];
const COUNT_THINGS = [
  { emoji: '🐱', one: 'cat', many: 'cats' }, { emoji: '🐶', one: 'dog', many: 'dogs' },
  { emoji: '🦆', one: 'duck', many: 'ducks' }, { emoji: '🍎', one: 'apple', many: 'apples' },
  { emoji: '⭐', one: 'star', many: 'stars' }, { emoji: '🎈', one: 'balloon', many: 'balloons' },
  { emoji: '🐸', one: 'frog', many: 'frogs' }, { emoji: '🚗', one: 'car', many: 'cars' },
];

/** Niveaux 5 à 7 : les nombres de eleven à twenty (écouter, lire), puis de petits calculs en anglais. */
function comptePlus(level, rng) {
  if (level === 5) {
    const n = randInt(rng, 11, 20);
    const ask = { text: `Show me ${NUMBER_WORDS[n - 1]}!`, lang: EN, rate: 0.85 };
    return {
      key: `compte-anglais:${level}:${n}`,
      text: 'Écoute le nombre anglais, et touche le bon nombre.',
      instruction: ['Écoute le nombre anglais, et touche le bon nombre.', ask],
      short: { text: 'Écoute et touche.', speak: [ask] },
      replay: [ask],
      stage: { type: 'listen' },
      choices: numberChoices(rng, n, 4, 11, 20).map((v) => ({ value: v, label: String(v) })),
      choiceStyle: 'numbers',
      answer: n,
      success: { speak: [{ text: NUMBER_WORDS[n - 1], lang: EN }, `C’est ${n} !`] },
    };
  }
  if (level === 6) {
    const n = randInt(rng, 11, 20);
    const thing = pick(rng, COUNT_THINGS);
    const ask = { text: `How many ${thing.many}?`, lang: EN, rate: 0.9 };
    return {
      key: `compte-anglais:${level}:${n}`,
      text: 'Compte, et touche le bon mot anglais.',
      instruction: ['Compte, et touche le bon mot anglais.', ask],
      short: { text: 'Combien ? En anglais !', speak: [ask] },
      stage: { type: 'objects', emoji: thing.emoji, count: n, perRow: 10 },
      choices: numberChoices(rng, n, 4, 11, 20).map((v) => ({ value: v, label: NUMBER_WORDS[v - 1], lang: 'en' })),
      choiceStyle: 'words',
      answer: n,
      success: { speak: [{ text: `${NUMBER_WORDS[n - 1]} ${thing.many}`, lang: EN }] },
    };
  }
  // petits calculs écrits et dits en anglais : « two plus three », « seven minus two »
  const plus = rng() < 0.6;
  const a = plus ? randInt(rng, 1, 9) : randInt(rng, 3, 10);
  const b = plus ? randInt(rng, 1, 10 - a) : randInt(rng, 1, a - 1);
  const answer = plus ? a + b : a - b;
  const said = `${NUMBER_WORDS[a - 1]} ${plus ? 'plus' : 'minus'} ${NUMBER_WORDS[b - 1]}`;
  const ask = { text: `${said[0].toUpperCase()}${said.slice(1)}?`, lang: EN, rate: 0.85 };
  return {
    key: `compte-anglais:calcul:${a}${plus ? '+' : '-'}${b}`,
    text: 'Calcule, et touche le bon mot anglais.',
    instruction: ['Calcule, et touche le bon mot anglais.', ask],
    short: { key: 'compte-anglais:calcul', text: 'Calcule en anglais !', speak: [ask] },
    replay: [ask],
    stage: { type: 'sentence', text: `${NUMBER_WORDS[a - 1]} ${plus ? '+' : '−'} ${NUMBER_WORDS[b - 1]} = ?`, lang: 'en' },
    choices: numberChoices(rng, answer, 4, 1, 10).map((v) => ({ value: v, label: NUMBER_WORDS[v - 1], lang: 'en' })),
    choiceStyle: 'words',
    answer,
    success: { speak: [{ text: `${said} equals ${NUMBER_WORDS[answer - 1]}.`, lang: EN }, `${a} ${plus ? 'plus' : 'moins'} ${b}, égale ${answer}.`] },
  };
}

export const compteAnglais = {
  id: 'compte-anglais',
  domain: 'anglais',
  title: 'Compte en anglais',
  icon: '🧮',
  skill: 'Comprendre et lire les nombres en anglais (one à twenty), calculer en anglais',
  levels: [
    'Écoute : de one à five', 'Écoute : de one à ten', 'Lis : de one à five', 'Lis : de one à ten',
    'Écoute : eleven à twenty', 'Lis : eleven à twenty', 'Calcule en anglais',
  ],
  generate(level, rng) {
    if (level >= 5) return comptePlus(level, rng);
    const max = level % 2 === 1 ? 5 : 10;
    const n = randInt(rng, 1, max);
    const thing = pick(rng, COUNT_THINGS);
    const said = `${NUMBER_WORDS[n - 1]} ${n > 1 ? thing.many : thing.one}`;
    if (level <= 2) {
      const ask = { text: `Show me ${NUMBER_WORDS[n - 1]}!`, lang: EN, rate: 0.85 };
      return {
        key: `compte-anglais:${level}:${n}`,
        text: 'Écoute le nombre anglais, et touche le bon groupe.',
        instruction: ['Écoute le nombre anglais, et touche le bon groupe.', ask],
        short: { text: 'Écoute et touche.', speak: [ask] },
        replay: [ask],
        stage: { type: 'listen' },
        choices: numberChoices(rng, n, 3, 1, max).map((v) => ({ value: v, objects: { emoji: thing.emoji, count: v } })),
        choiceStyle: 'objects',
        answer: n,
        success: { speak: [{ text: said, lang: EN }] },
      };
    }
    const ask = { text: `How many ${thing.many}?`, lang: EN, rate: 0.9 };
    return {
      key: `compte-anglais:${level}:${n}`,
      text: 'Compte, et touche le bon mot anglais.',
      instruction: ['Compte, et touche le bon mot anglais.', ask],
      short: { text: 'Combien ? En anglais !', speak: [ask] },
      stage: { type: 'objects', emoji: thing.emoji, count: n, perRow: 5 },
      choices: numberChoices(rng, n, level === 3 ? 3 : 4, 1, max).map((v) => ({ value: v, label: NUMBER_WORDS[v - 1], lang: 'en' })),
      choiceStyle: 'words',
      answer: n,
      success: { speak: [{ text: said, lang: EN }] },
    };
  },
};

const PLACES = [
  { key: 'in', en: 'in the basket', fr: 'dans le panier' },
  { key: 'on', en: 'on the table', fr: 'sur la table' },
  { key: 'under', en: 'under the table', fr: 'sous la table' },
  { key: 'next', en: 'next to the table', fr: 'à côté de la table' },
];
const PETS = [
  { emoji: '🐱', en: 'cat', fr: 'le chat' }, { emoji: '🐶', en: 'dog', fr: 'le chien' },
  { emoji: '🐰', en: 'rabbit', fr: 'le lapin' }, { emoji: '🐭', en: 'mouse', fr: 'la souris' },
  { emoji: '🐥', en: 'chick', fr: 'le poussin' },
];

const scene = (pet, place) => ({ value: `${pet.en}:${place.key}`, scene: { who: pet.emoji, where: place.key }, name: `${pet.fr} est ${place.fr}` });

/**
 * Niveaux 4 à 6 : l'animal ET l'endroit changent d'une image à l'autre (écouter, puis lire),
 * puis une petite histoire de deux phrases suivie d'une question.
 */
function ouEstPlus(level, rng) {
  const [pet, other] = sample(rng, PETS, 2);
  const [place, otherPlace] = sample(rng, PLACES, 2);
  const sentence = `The ${pet.en} is ${place.en}.`;
  const choices = shuffle(rng, [scene(pet, place), scene(pet, otherPlace), scene(other, place), scene(other, otherPlace)]);
  const success = { speak: [{ text: sentence, lang: EN }, `${pet.fr[0].toUpperCase()}${pet.fr.slice(1)} est ${place.fr} !`] };
  const common = { stage: { type: 'listen' }, choices, choiceStyle: 'scenes', answer: `${pet.en}:${place.key}`, success };
  if (level === 6) {
    // deux animaux, deux endroits : il faut retenir l'histoire, puis écouter la question
    const story = { text: shuffle(rng, [sentence, `The ${other.en} is ${otherPlace.en}.`]).join(' '), lang: EN, rate: 0.85 };
    const question = { text: `Where is the ${pet.en}?`, lang: EN, rate: 0.85 };
    return {
      ...common,
      key: `ou-est:histoire:${pet.en}:${place.key}:${other.en}:${otherPlace.key}`,
      text: 'Écoute la petite histoire, puis la question.',
      instruction: ['Écoute la petite histoire, puis la question.', story, question],
      short: { key: 'ou-est:histoire', text: 'Écoute et touche.', speak: [story, question] },
      replay: [story, question],
    };
  }
  const sound = { text: sentence, lang: EN, rate: 0.85 };
  const read = level === 5;
  return {
    ...common,
    key: `ou-est:qui:${pet.en}:${place.key}:${other.en}`,
    text: read ? 'Lis la phrase : qui est où ? Touche la bonne image.' : 'Écoute bien : qui est où ? Touche la bonne image.',
    instruction: read ? 'Lis la phrase anglaise. Attention à l’animal, et à l’endroit !' : ['Écoute bien : attention à l’animal, et à l’endroit !', sound],
    short: read ? { key: 'ou-est:qui-lis', text: 'Quelle image ?' } : { key: 'ou-est:qui', text: 'Écoute et touche.', speak: [sound] },
    replay: [sound],
    stage: read ? { type: 'sentence', text: sentence, lang: 'en' } : { type: 'listen' },
  };
}

export const ouEst = {
  id: 'ou-est',
  domain: 'anglais',
  title: 'Where is the cat?',
  icon: '📦',
  skill: 'Comprendre in, on, under, next to',
  levels: [
    'Écoute : in, on, under', 'Écoute : in, on, under, next to', 'Lis la phrase',
    'Écoute : qui est où ?', 'Lis : qui est où ?', 'Écoute la petite histoire',
  ],
  generate(level, rng) {
    if (level >= 4) return ouEstPlus(level, rng);
    const pet = pick(rng, PETS);
    const places = level === 1 ? PLACES.slice(0, 3) : PLACES;
    const target = pick(rng, places);
    const sentence = `The ${pet.en} is ${target.en}.`;
    const sound = { text: sentence, lang: EN, rate: 0.85 };
    const read = level === 3;
    return {
      key: `ou-est:${pet.en}:${target.key}`,
      text: read ? 'Lis la phrase, et touche la bonne image.' : 'Écoute bien, et touche la bonne image.',
      instruction: read ? 'Lis la phrase anglaise, et touche la bonne image.' : ['Écoute bien, et touche la bonne image.', sound],
      short: read ? { key: 'ou-est:lis', text: 'Quelle image ?' } : { key: 'ou-est', text: 'Écoute et touche.', speak: [sound] },
      replay: [sound],
      stage: read ? { type: 'sentence', text: sentence, lang: 'en' } : { type: 'listen' },
      choices: shuffle(rng, places).map((p) => ({ value: p.key, scene: { who: pet.emoji, where: p.key }, name: `${pet.fr} est ${p.fr}` })),
      choiceStyle: 'scenes',
      answer: target.key,
      success: { speak: [{ text: sentence, lang: EN }, `${pet.fr[0].toUpperCase()}${pet.fr.slice(1)} est ${target.fr} !`] },
    };
  },
};

/** Mots qu'on peut épeler en touchant les lettres : 3 à 6 lettres, toutes différentes. */
export function spellable(word) {
  return /^[a-z]{3,6}$/.test(word.en) && new Set(word.en).size === word.en.length;
}

export const epelleAnglais = {
  id: 'epelle-anglais',
  domain: 'anglais',
  title: 'Épelle en anglais',
  icon: '🔠',
  skill: 'Écrire un mot anglais en remettant ses lettres dans l’ordre',
  levels: [...LEVELS, 'Tous les thèmes mélangés', 'Écoute sans l’image', 'L’image sans le son'],
  generate(level, rng) {
    const word = pick(rng, (level <= THEMES ? ENGLISH_THEMES[level - 1].words : ALL_WORDS).filter(spellable));
    const letters = word.en.split('');
    let order = shuffle(rng, letters.map((_, i) => i));
    if (order.every((v, i) => v === i)) order = [...order.slice(1), order[0]]; // jamais déjà dans l'ordre
    const sound = { text: word.en, lang: EN, rate: 0.8 };
    const pic = picture(word);
    const listen = level === CLOSE; // on entend le mot, sans image
    const silent = level === EXTRA; // on voit l'image, sans entendre le mot : il faut s'en souvenir
    const pictureStage = pic.swatch ? { type: 'swatch', color: pic.swatch } : { type: 'picture', emoji: pic.label };
    const silentText = 'Écris le mot anglais de cette image : touche les lettres dans l’ordre.';
    return {
      key: `epelle-anglais:${word.en}`,
      interaction: 'order',
      text: silent ? silentText : 'Écris le mot anglais : touche les lettres dans l’ordre.',
      instruction: silent ? silentText : ['Écris le mot anglais :', sound, 'Touche les lettres dans l’ordre.'],
      short: silent ? { key: 'epelle-anglais:image', text: 'Écris le mot.' } : { text: 'Écris le mot.', speak: [sound] },
      replay: silent ? undefined : [sound],
      stage: listen ? { type: 'listen' } : pictureStage,
      items: order.map((i) => ({ value: i, label: letters[i] })),
      order: 'asc',
      sign: '',
      lang: 'en',
      choices: [],
      answer: word.en,
      success: { speak: successSpeech(word) },
    };
  },
};

// Parler anglais : saluer, répondre à une question simple, finir une comptine.

const GREETINGS = [
  { emoji: '👋', situation: 'Tu arrives à l’école. Tu dis…', en: 'Hello!' },
  { emoji: '🚪', situation: 'Tu rentres chez toi. Tu dis à ta copine…', en: 'Goodbye!' },
  { emoji: '🎁', situation: 'On te donne un cadeau. Tu dis…', en: 'Thank you!' },
  { emoji: '🌙', situation: 'C’est l’heure de dormir. Tu dis…', en: 'Good night!' },
  { emoji: '🌅', situation: 'C’est le matin. Tu dis…', en: 'Good morning!' },
  { emoji: '🎂', situation: 'C’est l’anniversaire de ton ami. Tu dis…', en: 'Happy birthday!' },
];
// Les consignes de la classe d'anglais.
const COMMANDS = [
  { en: 'Stand up!', emoji: '🧍', fr: 'Lève-toi !' },
  { en: 'Sit down!', emoji: '🪑', fr: 'Assieds-toi !' },
  { en: 'Open your book!', emoji: '📖', fr: 'Ouvre ton livre !' },
  { en: 'Listen!', emoji: '👂', fr: 'Écoute !' },
  { en: 'Be quiet!', emoji: '🤫', fr: 'Chut, silence !' },
  { en: 'Clap your hands!', emoji: '👏', fr: 'Tape dans tes mains !' },
  { en: 'Raise your hand!', emoji: '🙋', fr: 'Lève la main !' },
  { en: 'Draw a picture!', emoji: '🖍️', fr: 'Fais un dessin !' },
  { en: 'Sing a song!', emoji: '🎤', fr: 'Chante une chanson !' },
  { en: 'Look at the board!', emoji: '👀', fr: 'Regarde le tableau !' },
];

/** Petites conversations : une question et sa réponse (avec le prénom et l'âge de l'enfant). */
function conversations(name, age) {
  return [
    { q: 'What’s your name?', a: `My name is ${name}.`, wrong: [`I’m ${age}.`, 'I’m fine, thank you.'] },
    { q: 'How old are you?', a: `I’m ${age}.`, wrong: [`My name is ${name}.`, 'I like cats.'] },
    { q: 'How are you?', a: 'I’m fine, thank you.', wrong: [`I’m ${age}.`, 'Goodbye!'] },
    { q: 'What colour is it?', a: 'It’s red.', wrong: ['It’s a dog.', `My name is ${name}.`], emoji: '🍎' },
    { q: 'What is it?', a: 'It’s a cat.', wrong: ['It’s blue.', 'I’m fine.'], emoji: '🐱' },
    { q: 'Do you like ice cream?', a: 'Yes, I do!', wrong: ['It’s a cat.', 'Good night!'], emoji: '🍦' },
  ];
}

/** Phrases à trous : le mot qui manque (___). */
function gapSentences(name, age) {
  return [
    { s: `My ___ is ${name}.`, a: 'name', wrong: ['old', 'like'] },
    { s: `I ___ ${age} years old.`, a: 'am', wrong: ['is', 'have'] },
    { s: 'How ___ are you?', a: 'old', wrong: ['name', 'red'] },
    { s: '___ is it? It’s a cat.', a: 'What', wrong: ['How', 'Yes'] },
    { s: 'I ___ ice cream.', a: 'like', wrong: ['am', 'is'] },
    { s: 'Good ___! Time for bed.', a: 'night', wrong: ['morning', 'thank'] },
    { s: 'I’m fine, ___ you.', a: 'thank', wrong: ['like', 'how'] },
    { s: 'Happy ___ to you!', a: 'birthday', wrong: ['night', 'name'] },
  ];
}

const NURSERY = [
  { line: 'Twinkle, twinkle, little…', word: 'star', emoji: '⭐', fr: 'étoile' },
  { line: 'Baa, baa, black…', word: 'sheep', emoji: '🐑', fr: 'mouton' },
  { line: 'Old MacDonald had a…', word: 'farm', emoji: '🚜', fr: 'ferme' },
  { line: 'Head, shoulders, knees and…', word: 'toes', emoji: '🦶', fr: 'orteils' },
  { line: 'Humpty Dumpty sat on a…', word: 'wall', emoji: '🧱', fr: 'mur' },
  { line: 'Incy Wincy…', word: 'spider', emoji: '🕷️', fr: 'araignée' },
  { line: 'Row, row, row your…', word: 'boat', emoji: '🚣', fr: 'bateau' },
  { line: 'The wheels on the…', word: 'bus', emoji: '🚌', fr: 'bus' },
];

/** Niveaux 4 à 6 : comprendre les consignes, retrouver la question, compléter une phrase. */
function parlePlus(level, rng, name) {
  if (level === 4) {
    const target = pick(rng, COMMANDS);
    const options = shuffle(rng, [target, ...sample(rng, COMMANDS.filter((c) => c !== target), 2)]);
    const sound = { text: target.en, lang: EN, rate: 0.85 };
    return {
      key: `parle:consigne:${target.en}`,
      text: 'Écoute la consigne en anglais, et touche la bonne image.',
      instruction: ['Écoute la consigne, et touche la bonne image.', sound],
      short: { key: 'parle:consigne', text: 'Écoute et touche.', speak: [sound] },
      replay: [sound],
      stage: { type: 'listen' },
      choices: options.map((c) => ({ value: c.en, label: c.emoji, name: c.fr })),
      choiceStyle: 'pictures',
      answer: target.en,
      success: { speak: [{ text: target.en, lang: EN }, target.fr] },
    };
  }
  const age = 5 + Math.floor(rng() * 4);
  if (level === 5) {
    // on connaît la réponse : quelle était la question ?
    const talks = [
      ...conversations(name, age),
      { q: 'Where is the cat?', a: 'It’s under the table.' },
      { q: 'How many cats?', a: 'Three cats.' },
    ];
    const talk = pick(rng, talks);
    const options = shuffle(rng, [talk, ...sample(rng, talks.filter((t) => t !== talk), 2)]).map((t) => t.q);
    const reply = { text: talk.a, lang: EN, rate: 0.85 };
    return {
      key: `parle:question:${talk.q}`,
      text: 'Voici la réponse. Quelle était la question ?',
      instruction: ['Voici la réponse :', reply, 'Quelle était la question ?'],
      short: { key: 'parle:question', text: 'Quelle était la question ?', speak: [reply, 'Quelle était la question ?'] },
      replay: [reply],
      stage: { type: 'sentence', text: talk.a, lang: 'en' },
      choices: options.map((o) => ({ value: o, label: o, lang: 'en' })),
      choiceStyle: 'answers',
      answer: talk.q,
      success: { speak: [{ text: talk.q, lang: EN }, { text: talk.a, lang: EN }] },
    };
  }
  const gap = pick(rng, gapSentences(name, age));
  const options = shuffle(rng, [gap.a, ...gap.wrong]);
  const line = { text: gap.s.replace('___', '…'), lang: EN, rate: 0.8 };
  return {
    key: `parle:trou:${gap.a}`,
    text: 'Lis la phrase, et trouve le mot qui manque.',
    instruction: ['Lis la phrase, et trouve le mot qui manque.', line],
    short: { key: 'parle:trou', text: 'Le mot qui manque ?', speak: [line] },
    replay: [line],
    stage: { type: 'sentence', text: gap.s, lang: 'en' },
    choices: options.map((o) => ({ value: o, label: o, lang: 'en' })),
    choiceStyle: 'words',
    answer: gap.a,
    success: { speak: [{ text: gap.s.replace('___', gap.a), lang: EN }] },
  };
}

export const parleAnglais = {
  id: 'parle-anglais',
  domain: 'anglais',
  title: 'Parle anglais',
  icon: '💬',
  skill: 'Saluer, se présenter, répondre en anglais ; comprendre les consignes ; connaître des comptines',
  levels: [
    'Bonjour, merci, au revoir', 'Petites conversations', 'Les comptines',
    'Les consignes de classe', 'Trouve la question', 'Le mot qui manque',
  ],
  generate(level, rng, index = 0, context = {}) {
    const name = context.name || 'Lou';
    if (level >= 4) return parlePlus(level, rng, name);
    if (level === 1) {
      const target = pick(rng, GREETINGS);
      const options = shuffle(rng, [target, ...sample(rng, GREETINGS.filter((g) => g !== target), 2)]);
      return {
        key: `parle:salut:${target.en}`,
        text: target.situation,
        instruction: [target.situation, ...options.flatMap((o, i) => [i ? 'ou' : '', { text: o.en, lang: EN, rate: 0.85 }]).filter(Boolean)],
        short: { key: 'parle:salut', text: target.situation },
        stage: { type: 'picture', emoji: target.emoji },
        choices: options.map((o) => ({ value: o.en, label: o.en, lang: 'en' })),
        choiceStyle: 'answers',
        answer: target.en,
        success: { speak: [{ text: target.en, lang: EN }] },
      };
    }
    if (level === 2) {
      const age = 5 + Math.floor(rng() * 4);
      const talk = pick(rng, conversations(name, age));
      const options = shuffle(rng, [talk.a, ...talk.wrong]);
      return {
        key: `parle:dialogue:${talk.q}`,
        text: 'Écoute la question et choisis la bonne réponse.',
        instruction: ['Écoute la question, et choisis la bonne réponse.', { text: talk.q, lang: EN, rate: 0.85 }],
        short: { key: 'parle:dialogue', text: 'Quelle réponse ?', speak: [{ text: talk.q, lang: EN, rate: 0.85 }] },
        replay: [{ text: talk.q, lang: EN, rate: 0.85 }],
        stage: talk.emoji ? { type: 'picture', emoji: talk.emoji } : { type: 'listen' },
        choices: options.map((o) => ({ value: o, label: o, lang: 'en' })),
        choiceStyle: 'answers',
        answer: talk.a,
        success: { speak: [{ text: talk.q, lang: EN }, { text: talk.a, lang: EN }] },
      };
    }
    const rhyme = pick(rng, NURSERY);
    const options = shuffle(rng, [rhyme, ...sample(rng, NURSERY.filter((r) => r !== rhyme), 2)]);
    return {
      key: `parle:comptine:${rhyme.word}`,
      text: 'Finis la comptine !',
      instruction: ['Écoute la comptine, et trouve le mot qui manque.', { text: rhyme.line, lang: EN, rate: 0.8 }],
      short: { key: 'parle:comptine', text: 'Finis la comptine !', speak: [{ text: rhyme.line, lang: EN, rate: 0.8 }] },
      replay: [{ text: rhyme.line, lang: EN, rate: 0.8 }],
      stage: { type: 'sentence', text: rhyme.line, lang: 'en' },
      choices: options.map((o) => ({ value: o.word, label: o.emoji, name: o.fr })),
      choiceStyle: 'pictures',
      answer: rhyme.word,
      success: { speak: [{ text: `${rhyme.line.replace('…', '')} ${rhyme.word}!`, lang: EN }] },
    };
  },
};

export const ANGLAIS_GAMES = [ecoute, lisAnglais, motAnglais, relieAnglais, compteAnglais, ouEst, epelleAnglais, parleAnglais];
