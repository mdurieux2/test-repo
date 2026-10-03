// Jeux d'anglais : on entend le mot prononcé par une voix anglaise.

import { pick, sample, shuffle } from '../random.js';
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
      stage: pic.swatch ? { type: 'swatch', color: pic.swatch } : { type: 'picture', emoji: pic.label },
      choices: options.map((w) => ({ value: w.en, label: w.en, lang: 'en' })),
      choiceStyle: 'words',
      answer: target.en,
      success: { speak: successSpeech(target) },
    };
  },
};

export const ANGLAIS_GAMES = [ecoute, lisAnglais, motAnglais];
