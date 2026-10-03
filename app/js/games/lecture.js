// Jeux de lecture. Chaque `generate(level, rng)` renvoie une question décrite
// uniquement par des données ; l'affichage est fait par js/render.js.

import { pick, sample, shuffle } from '../random.js';
import { pickForLevel, similarWords, textChoices } from './helpers.js';
import {
  FIRST_SOUNDS, PICTURES, READING_WORDS, SIGHT_WORDS, SYLLABLE_LEVELS, SYLLABLE_SPEECH,
} from '../data/lecture-data.js';

const SLOW = 0.7; // débit de la voix pour le son / la syllabe à entendre

export const premierSon = {
  id: 'premier-son',
  domain: 'francais',
  section: 'Lettres et sons',
  title: 'Le premier son',
  icon: '👂',
  skill: "Entendre le premier son d'un mot et l'associer à sa lettre",
  levels: ['Voyelles et l, m, r, s', 'Ajout de v, f, p, t, n, b, d', 'Ajout de ch, c, g, j, z'],
  generate(level, rng) {
    const target = pickForLevel(rng, FIRST_SOUNDS, level);
    const word = pick(rng, target.words);
    const choiceCount = level >= 3 ? 4 : 3;
    // Un distracteur ne doit jamais être le début du mot (ex. « c » pour « chat »).
    const others = FIRST_SOUNDS.filter(
      (s) => s.level <= level && s.grapheme !== target.grapheme && !word.startsWith(s.grapheme),
    ).map((s) => s.grapheme);
    const choices = shuffle(rng, [target.grapheme, ...sample(rng, others, choiceCount - 1)]);
    return {
      key: `premier-son:${word}`,
      text: 'Quel son entends-tu au début du mot ?',
      instruction: ['Quel son entends-tu au début du mot…', { text: word, rate: SLOW }],
      short: { text: 'Le premier son ?', speak: [{ text: word, rate: SLOW }] },
      replay: [{ text: word, rate: SLOW }],
      stage: { type: 'picture', emoji: PICTURES[word] },
      choices: textChoices(choices),
      choiceStyle: 'letters',
      answer: target.grapheme,
      success: { speak: word, reveal: word, highlight: target.grapheme.length },
    };
  },
};

function syllableSpeech(syllable) {
  return SYLLABLE_SPEECH[syllable] || syllable;
}

export const syllabes = {
  id: 'syllabes',
  domain: 'francais',
  section: 'Lettres et sons',
  title: 'Les syllabes',
  icon: '🧩',
  skill: 'Associer une syllabe entendue à son écriture (l + a = la)',
  levels: ['l, m, r, s avec a, i, o, u', 'Plus de consonnes, et le é', 'Avec ou, on, an, in, oi'],
  generate(level, rng) {
    const { consonants, vowels } = SYLLABLE_LEVELS[level];
    const c = pick(rng, consonants);
    const v = pick(rng, vowels);
    const target = c + v;
    // Distracteurs : même consonne ou même voyelle, et syllabe inversée (la / al).
    const pool = new Set();
    vowels.filter((x) => x !== v).forEach((x) => pool.add(c + x));
    consonants.filter((x) => x !== c).forEach((x) => pool.add(x + v));
    const distractors = sample(rng, [...pool], level >= 2 ? 3 : 2);
    if (level >= 2 && v.length === 1 && c.length === 1) distractors[0] = v + c;
    const choices = shuffle(rng, [target, ...distractors]);
    const sound = { text: syllableSpeech(target), rate: SLOW };
    return {
      key: `syllabes:${target}`,
      text: 'Touche la syllabe que tu entends.',
      instruction: ['Touche la syllabe que tu entends :', sound],
      short: { text: 'Quelle syllabe ?', speak: [sound] },
      replay: [sound],
      stage: { type: 'listen' },
      choices: textChoices(choices),
      choiceStyle: 'letters',
      answer: target,
      success: { speak: sound },
    };
  },
};

export const bonMot = {
  id: 'bon-mot',
  domain: 'francais',
  section: 'Lire',
  title: 'Le bon mot',
  icon: '📖',
  skill: "Lire un mot et l'associer à son image",
  levels: ['Mots simples (moto, lune…)', 'Mots avec ch, ou, on, an, in', 'Mots avec oi, ai, eau, eu…'],
  generate(level, rng) {
    const word = pick(rng, READING_WORDS[level]);
    const pool = [];
    for (let l = Math.max(1, level - 1); l <= level; l++) pool.push(...READING_WORDS[l]);
    const distractors = similarWords(rng, word, pool, level >= 2 ? 3 : 2);
    return {
      key: `bon-mot:${word}`,
      text: "Lis les mots. Lequel va avec l'image ?",
      instruction: "Lis les mots, et trouve celui qui va avec l'image.",
      short: { text: 'Quel mot ?' },
      stage: { type: 'picture', emoji: PICTURES[word] },
      choices: textChoices(shuffle(rng, [word, ...distractors])),
      choiceStyle: 'words',
      answer: word,
      success: { speak: word },
    };
  },
};

export const petitsMots = {
  id: 'petits-mots',
  domain: 'francais',
  section: 'Lire',
  title: 'Les petits mots',
  icon: '🔤',
  skill: 'Reconnaître les mots-outils (le, un, et, dans…)',
  levels: ['le, la, un, et, il…', 'dans, sur, avec, pour…', 'beaucoup, toujours, quand…'],
  generate(level, rng) {
    const target = pickForLevel(rng, SIGHT_WORDS, level);
    const pool = SIGHT_WORDS.filter((w) => w.level <= level).map((w) => w.word);
    const distractors = similarWords(rng, target.word, pool, level >= 2 ? 3 : 2);
    const sound = { text: target.speech || target.word, rate: 0.8 };
    return {
      key: `petits-mots:${target.word}`,
      text: 'Touche le mot que tu entends.',
      instruction: ['Touche le mot :', sound],
      short: { text: 'Quel mot ?', speak: [sound] },
      replay: [sound],
      stage: { type: 'listen' },
      choices: textChoices(shuffle(rng, [target.word, ...distractors])),
      choiceStyle: 'words',
      answer: target.word,
      success: { speak: sound },
    };
  },
};

export const LECTURE_GAMES = [premierSon, syllabes, bonMot, petitsMots];
