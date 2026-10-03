// Jeux de réflexion : le puzzle, le memory, le coloriage magique (la couleur dépend du
// chiffre) et les points à relier (une forme apparaît).

import { pick, randInt, sample, shuffle } from '../random.js';

// ---------------------------------------------------------------- Le puzzle

// Chaque image : un grand emoji sur un fond en dégradé (le haut et le bas n'ont pas la même couleur,
// ce qui aide à placer les pièces).
const PUZZLE_PICTURES = [
  { picture: '🦁', colors: ['#fff3b0', '#f4a259'] }, { picture: '🚀', colors: ['#1d3557', '#a8dadc'] },
  { picture: '🏰', colors: ['#bde0fe', '#90be6d'] }, { picture: '🐢', colors: ['#caf0f8', '#0096c7'] },
  { picture: '🦄', colors: ['#ffc8dd', '#cdb4db'] }, { picture: '🌻', colors: ['#a2d2ff', '#80b918'] },
  { picture: '🐳', colors: ['#e0fbfc', '#3d5a80'] }, { picture: '🚂', colors: ['#ffe5d9', '#9d8189'] },
  { picture: '🦋', colors: ['#d8f3dc', '#52b788'] }, { picture: '🍓', colors: ['#fff1e6', '#f08080'] },
  { picture: '🐼', colors: ['#e9f5db', '#718355'] }, { picture: '🎈', colors: ['#caf0f8', '#ffafcc'] },
]
const PUZZLE_LEVELS = [
  { label: '4 pièces (2 × 2)', cols: 2, rows: 2 },
  { label: '6 pièces (3 × 2)', cols: 3, rows: 2 },
  { label: '9 pièces (3 × 3)', cols: 3, rows: 3 },
  { label: '12 pièces (4 × 3)', cols: 4, rows: 3 },
  { label: '16 pièces (4 × 4)', cols: 4, rows: 4 },
  { label: '25 pièces (5 × 5)', cols: 5, rows: 5 },
];

export const puzzle = {
  id: 'puzzle',
  domain: 'jeux',
  title: 'Le puzzle',
  icon: '🧩',
  skill: 'Reconstituer une image : observer, comparer les formes et les couleurs',
  levels: PUZZLE_LEVELS.map((l) => l.label),
  generate(level, rng) {
    const { cols, rows } = PUZZLE_LEVELS[level - 1];
    const { picture, colors } = pick(rng, PUZZLE_PICTURES);
    let order = shuffle(rng, Array.from({ length: cols * rows }, (_, i) => i));
    if (order.every((v, i) => v === i)) order = [...order.slice(1), order[0]];
    return {
      key: `puzzle:${level}:${picture}:${order.join('-')}`,
      interaction: 'swap',
      text: 'Remets l’image dans l’ordre.',
      instruction: 'Remets l’image dans l’ordre : touche deux pièces pour les échanger.',
      short: { key: 'puzzle', text: 'Remets l’image dans l’ordre.' },
      stage: { type: 'puzzle', cols, rows, picture, colors, order },
      choices: [],
      answer: null,
      success: { speak: 'Bravo, le puzzle est terminé !' },
    };
  },
};

// ---------------------------------------------------------------- Le memory

const MEMORY_PICTURES = ['🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '🐸', '🐵', '🦁', '🐯', '🐮', '🐷', '🐔', '🐧'];
const MEMORY_LEVELS = [
  { label: '2 paires', pairs: 2 },
  { label: '3 paires', pairs: 3 },
  { label: '4 paires', pairs: 4 },
  { label: '6 paires', pairs: 6 },
  { label: '8 paires', pairs: 8 },
  { label: 'Chiffre et quantité (6 paires)', pairs: 6, mode: 'nombres' },
  { label: '10 paires', pairs: 10 },
];

export const memory = {
  id: 'memory',
  domain: 'jeux',
  title: 'Le memory',
  icon: '🃏',
  skill: 'Mémoriser où sont les cartes, retrouver les paires',
  levels: MEMORY_LEVELS.map((l) => l.label),
  generate(level, rng) {
    const { pairs, mode } = MEMORY_LEVELS[level - 1];
    let cards;
    if (mode === 'nombres') {
      const numbers = sample(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9], pairs);
      const emoji = pick(rng, ['🍎', '⭐', '🐟', '🌸']);
      cards = numbers.flatMap((n) => [{ pair: n, label: String(n) }, { pair: n, label: emoji.repeat(n), small: true }]);
    } else {
      cards = sample(rng, MEMORY_PICTURES, pairs).flatMap((e) => [{ pair: e, label: e }, { pair: e, label: e }]);
    }
    cards = shuffle(rng, cards);
    return {
      key: `memory:${level}:${cards.map((c) => c.pair).join('')}`,
      interaction: 'memory',
      text: 'Retrouve les paires.',
      instruction: mode === 'nombres'
        ? 'Retrouve les paires : chaque chiffre va avec le bon nombre d’objets. Retourne deux cartes à la fois.'
        : 'Retrouve les paires d’images. Retourne deux cartes à la fois.',
      short: { key: `memory:${mode || 'images'}`, text: 'Retrouve les paires.' },
      stage: { type: 'none' },
      cards,
      choices: [],
      answer: null,
      success: { speak: 'Bravo, tu as trouvé toutes les paires !' },
    };
  },
};

// ---------------------------------------------------------------- Le coloriage magique

// Chaque dessin : des zones (chemin SVG dans un carré de 120), la position du nombre, et le
// numéro de la couleur attendue (0, 1, 2…). Les zones sont assez grandes pour un doigt d'enfant.
const MAGIC_DRAWINGS = [
  {
    name: 'la maison',
    zones: [
      { d: 'M0 96 H120 V120 H0 Z', at: [60, 110], c: 2 },
      { d: 'M18 58 L60 22 L102 58 Z', at: [60, 46], c: 0 },
      { d: 'M26 58 H94 V96 H26 Z M64 70 H82 V96 H64 Z M32 64 H48 V78 H32 Z', at: [55, 66], c: 1 },
      { d: 'M64 70 H82 V96 H64 Z', at: [73, 85], c: 3 },
      { d: 'M32 64 H48 V78 H32 Z', at: [40, 71], c: 4 },
      { d: 'M92 4 a12 12 0 1 0 0.1 0 Z', at: [92, 17], c: 3 },
    ],
  },
  {
    name: 'le bateau',
    zones: [
      { d: 'M0 90 Q30 80 60 90 T120 90 V120 H0 Z', at: [60, 108], c: 1 },
      { d: 'M18 72 H102 L90 90 H30 Z', at: [60, 81], c: 0 },
      { d: 'M55 14 V68 H26 Z', at: [45, 57], c: 4 },
      { d: 'M65 20 V68 H96 Z', at: [75, 58], c: 3 },
      { d: 'M55 4 H65 V72 H55 Z', at: [60, 12], c: 2 },
    ],
  },
  {
    name: 'le poisson',
    zones: [
      { d: 'M0 0 H120 V120 H0 Z M14 60 Q48 22 84 60 Q48 98 14 60 Z M84 60 L108 40 L108 80 Z', at: [100, 108], c: 1 },
      { d: 'M14 60 Q48 22 84 60 Q48 98 14 60 Z M36 47 a7 7 0 1 0 0.1 0 Z', at: [58, 64], c: 0 },
      { d: 'M84 60 L108 40 L108 80 Z', at: [99, 61], c: 3 },
      { d: 'M36 47 a7 7 0 1 0 0.1 0 Z', at: [36, 54], c: 4 },
    ],
  },
  {
    name: 'la fleur',
    zones: [
      { d: 'M0 104 H120 V120 H0 Z', at: [100, 113], c: 2 },
      { d: 'M55 70 H65 V104 H55 Z', at: [60, 96], c: 2 },
      { d: 'M60 16 a13 13 0 1 0 0.1 0 Z', at: [60, 26], c: 0 },
      { d: 'M85 36 a13 13 0 1 0 0.1 0 Z', at: [88, 49], c: 0 },
      { d: 'M35 36 a13 13 0 1 0 0.1 0 Z', at: [32, 49], c: 0 },
      { d: 'M60 58 a13 13 0 1 0 0.1 0 Z', at: [60, 74], c: 0 },
      { d: 'M60 37 a11 11 0 1 0 0.1 0 Z', at: [60, 48], c: 3 },
      { d: 'M64 90 Q86 72 100 84 Q84 100 64 94 Z', at: [84, 88], c: 1 },
    ],
  },
  {
    name: 'le papillon',
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
export const MAGIC_COLORS = [
  { hex: '#ff5c5c', name: 'rouge' }, { hex: '#3d7dff', name: 'bleu' }, { hex: '#2fbf5b', name: 'vert' },
  { hex: '#ffd23f', name: 'jaune' }, { hex: '#b37dff', name: 'violet' },
];
// les nombres de la légende, et ce qui est écrit dans les zones
const MAGIC_LEVELS = [
  { label: 'Les nombres de 1 à 3', kind: 'chiffre', numbers: [1, 2, 3] },
  { label: 'Les nombres de 1 à 5', kind: 'chiffre', numbers: [1, 2, 3, 4, 5] },
  { label: 'Des additions (jusqu’à 5)', kind: 'plus', numbers: [1, 2, 3, 4, 5] },
  { label: 'Des soustractions', kind: 'moins', numbers: [1, 2, 3, 4, 5] },
  { label: 'Des additions (jusqu’à 10)', kind: 'plus', numbers: [2, 4, 6, 8, 10] },
  { label: 'Des additions (jusqu’à 20)', kind: 'plus', numbers: [11, 12, 13, 14, 15] },
  { label: 'Des multiplications', kind: 'fois', numbers: [6, 8, 10, 12, 15] },
];

/** Ce qui est écrit dans une zone : le nombre, ou un calcul dont le résultat est ce nombre. */
export function magicLabel(kind, n, rng) {
  if (kind === 'chiffre') return String(n);
  if (kind === 'plus') {
    const a = randInt(rng, 1, Math.max(1, n - 1));
    return `${a}+${n - a}`;
  }
  if (kind === 'moins') {
    const b = randInt(rng, 1, 5);
    return `${n + b}−${b}`;
  }
  const pairs = [];
  for (let a = 2; a <= 5; a++) if (n % a === 0 && n / a >= 2 && n / a <= 10) pairs.push([a, n / a]);
  const [a, b] = pick(rng, pairs.length ? pairs : [[1, n]]);
  return rng() < 0.5 ? `${a}×${b}` : `${b}×${a}`;
}

export const coloriageMagique = {
  id: 'coloriage-magique',
  domain: 'jeux',
  title: 'Le coloriage magique',
  icon: '🖍️',
  skill: 'Lire les nombres (puis calculer) pour trouver la bonne couleur',
  levels: MAGIC_LEVELS.map((l) => l.label),
  generate(level, rng) {
    const { kind, numbers } = MAGIC_LEVELS[level - 1];
    const drawing = pick(rng, MAGIC_DRAWINGS);
    const legend = numbers.map((n, i) => ({ ...MAGIC_COLORS[i], n }));
    const zones = drawing.zones.map((z) => {
      const c = z.c % numbers.length;
      return { d: z.d, at: z.at, c, label: magicLabel(kind, numbers[c], rng) };
    });
    const plain = kind === 'chiffre';
    return {
      key: `magique:${level}:${drawing.name}:${zones.map((z) => z.label).join(',')}`,
      interaction: 'colorby',
      text: plain ? 'Colorie chaque zone avec la couleur de son nombre.' : 'Calcule, puis colorie avec la couleur du résultat.',
      instruction: plain
        ? 'Colorie chaque zone avec la couleur de son nombre. Touche une couleur en bas, puis les zones.'
        : 'Calcule ce qui est écrit dans chaque zone, puis colorie avec la couleur du résultat. Touche une couleur en bas, puis les zones.',
      short: { key: `magique:${kind}`, text: plain ? 'La couleur de chaque nombre !' : 'Calcule, puis colorie !' },
      stage: { type: 'colorby', zones, legend, name: drawing.name },
      choices: [],
      answer: null,
      success: { speak: `Bravo, c’est ${drawing.name} !` },
    };
  },
};

// ---------------------------------------------------------------- Les points à relier

// Formes dessinées par des points (dans un carré 0–100), dans l'ordre du tracé.
const DOT_SHAPES = [
  { name: 'une maison', points: [[20, 90], [20, 45], [50, 15], [80, 45], [80, 90]], close: true },
  { name: 'un bateau', points: [[10, 60], [90, 60], [75, 85], [25, 85]], close: true },
  { name: 'une étoile', points: [[50, 8], [61, 38], [94, 38], [67, 58], [78, 90], [50, 70], [22, 90], [33, 58], [6, 38], [39, 38]], close: true },
  { name: 'un cœur', points: [[50, 30], [62, 14], [80, 12], [92, 26], [90, 46], [50, 88], [10, 46], [8, 26], [20, 12], [38, 14]], close: true },
  { name: 'un poisson', points: [[10, 50], [30, 30], [55, 25], [75, 40], [92, 25], [92, 75], [75, 60], [55, 75], [30, 70]], close: true },
  { name: 'une fusée', points: [[50, 5], [64, 25], [64, 65], [78, 85], [62, 80], [50, 92], [38, 80], [22, 85], [36, 65], [36, 25]], close: true },
  { name: 'un sapin', points: [[50, 6], [70, 32], [60, 32], [80, 58], [66, 58], [88, 84], [56, 84], [56, 96], [44, 96], [44, 84], [12, 84], [34, 58], [20, 58], [40, 32], [30, 32]], close: true },
  { name: 'un diamant', points: [[30, 20], [70, 20], [90, 40], [50, 92], [10, 40]], close: true },
];
const DOT_LEVELS = [
  { label: 'De 1 à 5', min: 4, max: 5, step: 1 },
  { label: 'De 1 à 10', min: 6, max: 10, step: 1 },
  { label: 'De 1 à 15', min: 9, max: 15, step: 1 },
  { label: 'De 2 en 2', min: 5, max: 10, step: 2 },
  { label: 'De 5 en 5', min: 5, max: 10, step: 5 },
  { label: 'De 10 en 10', min: 5, max: 10, step: 10 },
  { label: 'À rebours', min: 5, max: 10, step: -1 },
];

export const pointsRelier = {
  id: 'points',
  domain: 'jeux',
  title: 'Les points à relier',
  icon: '✨',
  skill: 'Réciter la suite des nombres (de 1 en 1, de 2 en 2, de 5 en 5…) pour faire apparaître un dessin',
  levels: DOT_LEVELS.map((l) => l.label),
  generate(level, rng) {
    const { min, max, step } = DOT_LEVELS[level - 1];
    const shape = pick(rng, DOT_SHAPES.filter((sh) => sh.points.length >= min && sh.points.length <= max));
    const n = shape.points.length;
    const labels = step === -1
      ? Array.from({ length: n }, (_, i) => n - i)
      : Array.from({ length: n }, (_, i) => (step === 1 ? i + 1 : (i + 1) * step));
    return {
      key: `points:${level}:${shape.name}`,
      interaction: 'dots',
      text: step === -1 ? `Relie les points en comptant à rebours, de ${labels[0]} à 1.` : `Relie les points dans l’ordre, de ${labels[0]} à ${labels.at(-1)}.`,
      instruction: step === -1
        ? `Relie les points en comptant à rebours, de ${labels[0]} à 1. Un dessin va apparaître !`
        : `Relie les points dans l’ordre, de ${labels[0]} à ${labels.at(-1)}. Un dessin va apparaître !`,
      short: { key: `points:${step}`, text: `De ${labels[0]} à ${labels.at(-1)} !` },
      stage: { type: 'dots', points: shape.points, labels, close: shape.close, name: shape.name },
      choices: [],
      answer: null,
      success: { speak: `Bravo, c’est ${shape.name} !` },
    };
  },
};

export const JEUX_GAMES = [puzzle, memory, coloriageMagique, pointsRelier];
