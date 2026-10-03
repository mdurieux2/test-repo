// Jeux d'anglais : on entend le mot prononcé par une voix anglaise.

import { pick, randInt, sample, shuffle } from '../random.js';
import { numberChoices } from './helpers.js';
import { ENGLISH_THEMES } from '../data/anglais-data.js';

const EN = 'en-GB';
const LEVELS = ENGLISH_THEMES.map((t) => `${t.icon} ${t.title}`);

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

function successSpeech(word) {
  return [{ text: word.en, lang: EN }, `C’est ${word.fr} !`];
}

export const ecoute = {
  id: 'ecoute',
  domain: 'anglais',
  title: 'Écoute et touche',
  icon: '👂',
  skill: 'Comprendre des mots anglais à l’oral',
  levels: LEVELS,
  generate(level, rng) {
    const { target, options } = themeWords(level, rng, 3);
    const sound = { text: target.en, lang: EN, rate: 0.8 };
    return {
      key: `ecoute:${target.en}`,
      text: 'Écoute le mot anglais et touche la bonne image.',
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
  levels: LEVELS,
  generate(level, rng) {
    const { target, options } = themeWords(level, rng, 4);
    return {
      key: `lis-anglais:${target.en}`,
      text: 'Lis le mot anglais. Quelle image va avec ?',
      instruction: 'Lis le mot anglais, et touche la bonne image. Tu peux toucher le mot pour l’entendre.',
      short: { text: 'Quelle image ?' },
      replay: [{ text: target.en, lang: EN, rate: 0.8 }],
      stage: { type: 'word', text: target.en, lang: 'en' },
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
  levels: LEVELS,
  generate(level, rng) {
    const { target, options } = themeWords(level, rng, 3);
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
  levels: LEVELS,
  generate(level, rng) {
    const words = sample(rng, ENGLISH_THEMES[level - 1].words, 4);
    return {
      key: `relie-anglais:${words.map((w) => w.en).join(',')}`,
      interaction: 'match',
      text: 'Relie chaque image à son mot anglais.',
      instruction: 'Relie chaque image à son mot anglais. Quand c’est juste, tu entends le mot.',
      short: { text: 'Relie !' },
      stage: { type: 'none' },
      pairs: words.map((w) => ({
        ...(w.swatch ? { swatch: w.swatch } : { emoji: w.emoji || w.label }),
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

const NUMBER_WORDS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const COUNT_THINGS = [
  { emoji: '🐱', one: 'cat', many: 'cats' }, { emoji: '🐶', one: 'dog', many: 'dogs' },
  { emoji: '🦆', one: 'duck', many: 'ducks' }, { emoji: '🍎', one: 'apple', many: 'apples' },
  { emoji: '⭐', one: 'star', many: 'stars' }, { emoji: '🎈', one: 'balloon', many: 'balloons' },
  { emoji: '🐸', one: 'frog', many: 'frogs' }, { emoji: '🚗', one: 'car', many: 'cars' },
];

export const compteAnglais = {
  id: 'compte-anglais',
  domain: 'anglais',
  title: 'Compte en anglais',
  icon: '🧮',
  skill: 'Comprendre et lire les nombres en anglais (one à ten)',
  levels: ['Écoute : de one à five', 'Écoute : de one à ten', 'Lis : de one à five', 'Lis : de one à ten'],
  generate(level, rng) {
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

export const ouEst = {
  id: 'ou-est',
  domain: 'anglais',
  title: 'Where is the cat?',
  icon: '📦',
  skill: 'Comprendre in, on, under, next to',
  levels: ['Écoute : in, on, under', 'Écoute : in, on, under, next to', 'Lis la phrase'],
  generate(level, rng) {
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
  levels: LEVELS,
  generate(level, rng) {
    const word = pick(rng, ENGLISH_THEMES[level - 1].words.filter(spellable));
    const letters = word.en.split('');
    let order = shuffle(rng, letters.map((_, i) => i));
    if (order.every((v, i) => v === i)) order = [...order.slice(1), order[0]]; // jamais déjà dans l'ordre
    const sound = { text: word.en, lang: EN, rate: 0.8 };
    const pic = picture(word);
    return {
      key: `epelle-anglais:${word.en}`,
      interaction: 'order',
      text: 'Écris le mot anglais : touche les lettres dans l’ordre.',
      instruction: ['Écris le mot anglais', sound, 'Touche les lettres dans l’ordre.'],
      short: { text: 'Écris le mot.', speak: [sound] },
      replay: [sound],
      stage: pic.swatch ? { type: 'swatch', color: pic.swatch } : { type: 'picture', emoji: pic.label },
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

export const parleAnglais = {
  id: 'parle-anglais',
  domain: 'anglais',
  title: 'Parle anglais',
  icon: '💬',
  skill: 'Saluer, se présenter, répondre en anglais ; connaître des comptines',
  levels: ['Bonjour, merci, au revoir', 'Petites conversations', 'Les comptines'],
  generate(level, rng, index = 0, context = {}) {
    const name = context.name || 'Lou';
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
      const talks = [
        { q: 'What’s your name?', a: `My name is ${name}.`, wrong: [`I’m ${age}.`, 'I’m fine, thank you.'] },
        { q: 'How old are you?', a: `I’m ${age}.`, wrong: [`My name is ${name}.`, 'I like cats.'] },
        { q: 'How are you?', a: 'I’m fine, thank you.', wrong: [`I’m ${age}.`, 'Goodbye!'] },
        { q: 'What colour is it?', a: 'It’s red.', wrong: ['It’s a dog.', `My name is ${name}.`], emoji: '🍎' },
        { q: 'What is it?', a: 'It’s a cat.', wrong: ['It’s blue.', 'I’m fine.'], emoji: '🐱' },
        { q: 'Do you like ice cream?', a: 'Yes, I do!', wrong: ['It’s a cat.', 'Good night!'], emoji: '🍦' },
      ];
      const talk = pick(rng, talks);
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
