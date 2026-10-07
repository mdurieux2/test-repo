// La dictée de mots : on entend le mot, on l'écrit en touchant les lettres dans l'ordre.
// Les mots suivent la progression de la lecture (syllabes simples, puis ou / on / an / ch,
// puis les sons complexes) ; ensuite le mot n'est plus montré, puis des lettres pièges s'ajoutent.
// Enfin (CE1) : les lettres muettes en fin de mot, puis les accents (é, è, ê).

import { pick, sample, shuffle } from '../random.js';
import { PICTURES } from '../data/lecture-data.js';

const WORDS = {
  1: ['moto', 'vélo', 'lune', 'lama', 'lit', 'rat', 'judo', 'café', 'bébé', 'radio', 'piano', 'robot'],
  2: ['tomate', 'salade', 'tulipe', 'banane', 'panda', 'valise', 'ananas', 'melon', 'tortue', 'fusée', 'sapin', 'lapin'],
  3: ['chat', 'vache', 'loup', 'poule', 'mouton', 'ballon', 'cochon', 'bonbon', 'dragon', 'canard', 'renard', 'avion', 'lion', 'dent'],
  4: ['bateau', 'gâteau', 'maison', 'poisson', 'oiseau', 'étoile', 'soleil', 'fleur', 'chaise', 'citron', 'chien', 'nuage', 'livre', 'train', 'fraise', 'cadeau', 'raisin', 'mouche'],
  // une lettre muette à la fin, qu'on n'entend pas (le t de « petit » s'entend dans « petite »)
  5: ['souris', 'tapis', 'bras', 'riz', 'nez', 'gant', 'lait', 'petit', 'grand', 'vert', 'bois', 'trois', 'sirop', 'nid', 'pied', 'drap', 'rond', 'abricot', 'poulet', 'jouet', 'sabot', 'radis', 'noix', 'croix'],
  // des accents : é, è, ê
  6: ['été', 'fête', 'tête', 'zèbre', 'flèche', 'règle', 'crêpe', 'forêt', 'rivière', 'élève', 'frère', 'fée', 'clé', 'épée', 'école', 'chèvre', 'pêche', 'fenêtre', 'tempête', 'planète'],
};
// les lettres pièges ressemblent à celles du mot (b/d, m/n, é/è…) pour obliger à bien écouter
const LOOKALIKE = {
  b: 'd', d: 'b', p: 'q', m: 'n', n: 'm', u: 'n', é: 'è', è: 'é', a: 'o', o: 'a', i: 'l', l: 'i', s: 'z', t: 'f', v: 'f', c: 'k', e: 'é',
};
// pièges des derniers niveaux : d'autres lettres muettes possibles, ou un autre accent sur le e
const TRAPS = {
  muettes: ['s', 't', 'd', 'x'],
  accents: ['é', 'è', 'ê', 'e'],
};

const LEVELS = [
  { label: 'Mots simples', words: [1], picture: true },
  { label: 'Mots plus longs', words: [2], picture: true },
  { label: 'ou, on, an, ch…', words: [3], picture: true },
  { label: 'oi, eau, ai, eu…', words: [4], picture: true },
  { label: 'Sans l’image', words: [2, 3, 4], picture: false },
  { label: 'Avec des lettres pièges', words: [3, 4], picture: false, decoys: 2 },
  { label: 'Les lettres muettes', words: [5], picture: false, decoys: 2, traps: 'muettes' },
  { label: 'Les accents', words: [6], picture: false, decoys: 2, traps: 'accents' },
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
    const { words, picture, decoys = 0, traps: kind } = LEVELS[level - 1];
    const word = pick(rng, words.flatMap((w) => WORDS[w]));
    const letters = [...word];
    const sound = { text: word, rate: 0.8 };
    let order = shuffle(rng, letters.map((_, i) => i));
    if (order.every((v, i) => v === i)) order = [...order.slice(1), order[0]];
    const items = order.map((i) => ({ value: i, label: letters[i] }));
    // lettres pièges : des sosies de lettres du mot qui n'y figurent pas (ou, aux derniers
    // niveaux, d'autres lettres muettes, d'autres accents)
    const absent = (list) => [...new Set(list.filter((l) => l && !letters.includes(l)))];
    let candidates = absent(letters.map((l) => LOOKALIKE[l]));
    if (kind) {
      const special = absent(TRAPS[kind]);
      if (special.length) candidates = special; // « élève » : un seul piège, le ê
    }
    const traps = sample(rng, candidates, Math.min(decoys, candidates.length)).map((label) => ({ value: null, label }));
    // le dernier mélange peut remettre le mot dans l'ordre : on échange alors deux lettres différentes
    const mixed = shuffle(rng, [...items, ...traps]);
    const real = mixed.flatMap((it, i) => (it.value === null ? [] : [i]));
    if (real.map((i) => mixed[i].label).join('') === word) {
      const other = real.find((i) => mixed[i].label !== mixed[real[0]].label);
      [mixed[real[0]], mixed[other]] = [mixed[other], mixed[real[0]]];
    }
    return {
      key: `dictee:${level}:${word}`,
      interaction: 'order',
      byLabel: true,
      text: 'Écoute le mot, et écris-le en touchant les lettres.',
      instruction: ['Écoute bien, et écris :', sound, 'Touche les lettres dans l’ordre.'],
      short: { key: `dictee:${picture}`, text: 'Écris le mot.', speak: [sound] },
      replay: [sound],
      stage: picture ? { type: 'picture', emoji: PICTURES[word] } : { type: 'listen' },
      items: mixed,
      order: 'asc',
      sign: '',
      choices: [],
      answer: word,
      success: { speak: word, reveal: word },
    };
  },
};

export const DICTEE_WORDS = WORDS;
