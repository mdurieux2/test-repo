// Jeux de maths complémentaires : formes et suites de motifs (maternelle), tables (CE1).

import { pick, randInt, sample, shuffle } from '../random.js';
import { numberChoices } from './helpers.js';

// ---------------------------------------------------------------- Les formes

const SHAPES_BY_LEVEL = {
  1: ['rond', 'carré', 'triangle'],
  2: ['rond', 'carré', 'triangle', 'rectangle'],
  3: ['rond', 'carré', 'triangle', 'rectangle', 'étoile', 'cœur'],
};
const SHAPE_ARTICLE = { rond: 'le rond', carré: 'le carré', triangle: 'le triangle', rectangle: 'le rectangle', étoile: "l'étoile", cœur: 'le cœur' };
const COLORS = ['#ff5c5c', '#3d7dff', '#2fbf5b', '#ffb020', '#9b5cff', '#ff6fa8'];

export const formes = {
  id: 'formes',
  domain: 'maths',
  section: 'Formes et logique',
  title: 'Les formes',
  icon: '🔺',
  skill: 'Reconnaître et nommer les formes',
  levels: ['Rond, carré, triangle', 'Avec le rectangle', 'Formes et couleurs mélangées'],
  generate(level, rng) {
    const pool = SHAPES_BY_LEVEL[level];
    const target = pick(rng, pool);
    const options = shuffle(rng, [target, ...sample(rng, pool.filter((s) => s !== target), level === 1 ? 2 : 3)]);
    const sameColor = level < 3 ? pick(rng, COLORS) : null;
    return {
      key: `formes:${target}`,
      text: `Touche ${SHAPE_ARTICLE[target]}.`,
      instruction: `Touche ${SHAPE_ARTICLE[target]}.`,
      stage: { type: 'none' },
      choices: options.map((s) => ({ value: s, shape: s, color: sameColor || pick(rng, COLORS) })),
      choiceStyle: 'pictures',
      answer: target,
      success: { speak: `Oui, c’est ${SHAPE_ARTICLE[target]} !` },
    };
  },
};

// ---------------------------------------------------------------- Suites de motifs (algorithmes)

const MOTIFS = [
  ['🔴', '🔵', '🟡', '🟢'], ['🍎', '🍌', '🍇', '🍊'], ['🐱', '🐶', '🐰', '🐻'],
  ['⭐', '🌙', '☀️', '☁️'], ['🚗', '🚲', '✈️', '🚂'], ['🟥', '🟦', '🟨', '🟩'],
];
const PATTERNS = { 1: ['AB'], 2: ['AAB', 'ABB'], 3: ['ABC'], 4: ['AABB', 'ABCD'] };

export const algorithmes = {
  id: 'algorithmes',
  domain: 'maths',
  section: 'Formes et logique',
  title: 'Les suites de motifs',
  icon: '🔁',
  skill: 'Continuer une suite logique (algorithme)',
  levels: ['A B A B…', 'A A B…, A B B…', 'A B C…', 'A A B B…, A B C D…'],
  generate(level, rng) {
    const pattern = pick(rng, PATTERNS[level]);
    const motif = shuffle(rng, pick(rng, MOTIFS));
    const symbol = (c) => motif[c.charCodeAt(0) - 65];
    const length = Math.max(6, pattern.length * 2 + 1);
    const items = Array.from({ length }, (_, i) => symbol(pattern[i % pattern.length]));
    const answer = items[length - 1];
    const used = [...new Set(items)];
    const extra = motif.find((m) => !used.includes(m));
    const options = shuffle(rng, [...new Set([...used, ...(extra ? [extra] : [])])]).slice(0, 4);
    if (!options.includes(answer)) options[0] = answer;
    return {
      key: `algorithmes:${pattern}:${items.join('')}`,
      text: 'Qu’est-ce qui vient après ?',
      instruction: 'Regarde bien la suite. Qu’est-ce qui vient après ?',
      stage: { type: 'pattern', items: [...items.slice(0, -1), null] },
      choices: shuffle(rng, options).map((m) => ({ value: m, label: m })),
      choiceStyle: 'pictures',
      answer,
    };
  },
};

// ---------------------------------------------------------------- Les tables (CE1)

const TABLES = [[2], [5], [10], [3], [4], [2, 3, 4, 5, 10]];
const GROUP_EMOJI = ['🍎', '⭐', '🐟', '🌸', '🍓'];

export const tables = {
  id: 'tables',
  domain: 'maths',
  section: 'Nombres et calcul',
  title: 'Les tables',
  icon: '✖️',
  skill: 'Tables de multiplication (×2, ×3, ×4, ×5, ×10)',
  levels: ['Table de 2', 'Table de 5', 'Table de 10', 'Table de 3', 'Table de 4', 'Tables mélangées'],
  generate(level, rng) {
    const table = pick(rng, TABLES[level - 1]);
    const n = randInt(rng, 1, 10);
    const answer = n * table;
    // Pour les petits produits, on montre les paquets (3 × 2 = 3 paquets de 2).
    const groups = answer <= 20 ? { emoji: pick(rng, GROUP_EMOJI), groups: n, size: table } : null;
    return {
      key: `tables:${n}x${table}`,
      text: 'Calcule !',
      instruction: `Combien font ${n} fois ${table} ?`,
      stage: { type: 'multiplication', a: n, b: table, groups },
      choices: numberChoices(rng, answer, 4, 0, 100, table).map((v) => ({ value: v, label: String(v) })),
      choiceStyle: 'numbers',
      answer,
      success: { speak: `${n} fois ${table}, égale ${answer}` },
    };
  },
};

export const MATHS_EXTRA_GAMES = [formes, algorithmes, tables];
