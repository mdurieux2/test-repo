// La dictée de mots : on entend le mot, on l'écrit en touchant les lettres dans l'ordre.
// Les mots suivent la progression de la lecture (syllabes simples, puis ou / on / an / ch,
// puis les sons complexes) ; ensuite le mot n'est plus montré, puis des lettres pièges s'ajoutent.

import { pick, sample, shuffle } from '../random.js';
import { PICTURES } from '../data/lecture-data.js';

const WORDS = {
  1: ['moto', 'vélo', 'lune', 'lama', 'lit', 'rat', 'judo', 'café', 'bébé', 'radio', 'piano', 'robot'],
  2: ['tomate', 'salade', 'tulipe', 'banane', 'panda', 'valise', 'ananas', 'melon', 'tortue', 'fusée', 'sapin', 'lapin'],
  3: ['chat', 'vache', 'loup', 'poule', 'mouton', 'ballon', 'cochon', 'bonbon', 'dragon', 'canard', 'renard', 'avion', 'lion', 'dent'],
  4: ['bateau', 'gâteau', 'maison', 'poisson', 'oiseau', 'étoile', 'soleil', 'fleur', 'chaise', 'citron', 'chien', 'nuage', 'livre', 'train', 'fraise', 'cadeau', 'raisin', 'mouche'],
};
// les lettres pièges ressemblent à celles du mot (b/d, m/n, é/è…) pour obliger à bien écouter
const LOOKALIKE = {
  b: 'd', d: 'b', p: 'q', m: 'n', n: 'm', u: 'n', é: 'è', è: 'é', a: 'o', o: 'a', i: 'l', l: 'i', s: 'z', t: 'f', v: 'f', c: 'k', e: 'é',
};

const LEVELS = [
  { label: 'Mots simples', words: [1], picture: true },
  { label: 'Mots plus longs', words: [2], picture: true },
  { label: 'ou, on, an, ch…', words: [3], picture: true },
  { label: 'oi, eau, ai, eu…', words: [4], picture: true },
  { label: 'Sans l’image', words: [2, 3, 4], picture: false },
  { label: 'Avec des lettres pièges', words: [3, 4], picture: false, decoys: 2 },
];

export const dictee = {
  id: 'dictee',
  domain: 'francais',
  section: 'Écrire',
  title: 'La dictée de mots',
  icon: '📝',
  skill: 'Écrire un mot entendu, lettre après lettre, en faisant correspondre les sons et les lettres',
  levels: LEVELS.map((l) => l.label),
  generate(level, rng) {
    const { words, picture, decoys = 0 } = LEVELS[level - 1];
    const word = pick(rng, words.flatMap((w) => WORDS[w]));
    const letters = [...word];
    const sound = { text: word, rate: 0.8 };
    let order = shuffle(rng, letters.map((_, i) => i));
    if (order.every((v, i) => v === i)) order = [...order.slice(1), order[0]];
    const items = order.map((i) => ({ value: i, label: letters[i] }));
    // lettres pièges : des sosies de lettres du mot qui n'y figurent pas
    const candidates = [...new Set(letters.map((l) => LOOKALIKE[l]).filter((l) => l && !letters.includes(l)))];
    const traps = sample(rng, candidates, Math.min(decoys, candidates.length)).map((label) => ({ value: null, label }));
    return {
      key: `dictee:${level}:${word}`,
      interaction: 'order',
      byLabel: true,
      text: 'Écoute le mot, et écris-le en touchant les lettres.',
      instruction: ['Écoute bien, et écris :', sound, 'Touche les lettres dans l’ordre.'],
      short: { key: `dictee:${picture}`, text: 'Écris le mot.', speak: [sound] },
      replay: [sound],
      stage: picture ? { type: 'picture', emoji: PICTURES[word] } : { type: 'listen' },
      items: shuffle(rng, [...items, ...traps]),
      order: 'asc',
      sign: '',
      choices: [],
      answer: word,
      success: { speak: word, reveal: word },
    };
  },
};

export const DICTEE_WORDS = WORDS;
