// Jeux de logique et d'espace (inspirés des applis d'énigmes) : la symétrie sur
// quadrillage, et compter des cubes empilés (certains sont cachés).

import { pick, randInt, sample, shuffle } from '../random.js';
import { numberChoices } from './helpers.js';

// ---------------------------------------------------------------- La symétrie

const SYM_LEVELS = [
  { label: 'Quadrillage 4 × 4, 3 cases', cols: 4, rows: 4, axis: 'v', cells: 3 },
  { label: 'Quadrillage 6 × 6, 5 cases', cols: 6, rows: 6, axis: 'v', cells: 5 },
  { label: 'Axe horizontal, 6 × 6', cols: 6, rows: 6, axis: 'h', cells: 5 },
  { label: 'Quadrillage 8 × 8, 9 cases', cols: 8, rows: 8, axis: 'v', cells: 9 },
];

/** La case symétrique de part et d'autre de l'axe (vertical : gauche/droite, horizontal : haut/bas). */
export function mirrorCell(cell, cols, rows, axis) {
  const x = cell % cols;
  const y = Math.floor(cell / cols);
  return axis === 'v' ? y * cols + (cols - 1 - x) : (rows - 1 - y) * cols + x;
}

export const symetrie = {
  id: 'symetrie',
  domain: 'maths',
  section: 'Formes et logique',
  title: 'La symétrie',
  icon: '🦋',
  skill: 'Compléter une figure par symétrie sur un quadrillage',
  levels: SYM_LEVELS.map((l) => l.label),
  generate(level, rng) {
    const { cols, rows, axis, cells } = SYM_LEVELS[level - 1];
    // le modèle est à gauche (axe vertical) ou en haut (axe horizontal)
    const half = Array.from({ length: cols * rows }, (_, i) => i)
      .filter((i) => (axis === 'v' ? i % cols < cols / 2 : Math.floor(i / cols) < rows / 2));
    const model = sample(rng, half, cells).sort((a, b) => a - b);
    const solution = model.map((c) => mirrorCell(c, cols, rows, axis)).sort((a, b) => a - b);
    const where = axis === 'v' ? 'de l’autre côté du trait' : 'de l’autre côté du trait, en bas';
    return {
      key: `symetrie:${level}:${model.join('-')}`,
      interaction: 'symmetry',
      text: 'Colorie le reflet du dessin.',
      instruction: `Colorie les cases ${where}, comme dans un miroir. Puis touche « J’ai fini ».`,
      short: { key: `symetrie:${axis}`, text: 'Colorie le reflet !' },
      stage: { type: 'symmetry', cols, rows, axis, model, solution },
      choices: [],
      answer: null,
      success: { speak: 'Bravo, le dessin est symétrique !' },
    };
  },
};

// ---------------------------------------------------------------- Compter les cubes

const CUBE_LEVELS = [
  { label: 'Une rangée de cubes', rows: 1, cols: [2, 5], height: [1, 1] },
  { label: 'Des escaliers (jusqu’à 3 étages)', rows: 1, cols: [2, 4], height: [1, 3] },
  { label: 'Deux rangées : des cubes cachés', rows: 2, cols: [2, 3], height: [1, 3] },
  { label: 'Trois rangées : des cubes cachés', rows: 3, cols: [3, 3], height: [1, 3] },
];

export const cubes = {
  id: 'cubes',
  domain: 'maths',
  section: 'Formes et logique',
  title: 'Compte les cubes',
  icon: '🧊',
  skill: 'Voir dans l’espace : compter des cubes empilés, même ceux qu’on ne voit pas',
  levels: CUBE_LEVELS.map((l) => l.label),
  generate(level, rng) {
    const { rows, cols: [c0, c1], height: [h0, h1] } = CUBE_LEVELS[level - 1];
    const cols = randInt(rng, c0, c1);
    let heights;
    do {
      heights = Array.from({ length: rows }, () => Array.from({ length: cols }, () => randInt(rng, h0, h1)));
      if (rows > 1) {
        // escaliers qui descendent vers l'enfant : le dessus de chaque pile reste visible,
        // seuls les cubes qui portent les autres sont cachés (on peut les deviner)
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            if (y > 0) heights[y][x] = Math.min(heights[y][x], heights[y - 1][x]);
            if (x > 0) heights[y][x] = Math.min(heights[y][x], heights[y][x - 1]);
          }
        }
      }
    } while (
      // au moins un étage dès le niveau 2, et toujours des cubes au premier rang
      (level >= 2 && !heights.flat().some((h) => h >= 2))
      || heights.flat().reduce((a, b) => a + b, 0) < (level >= 3 ? rows * cols + 2 : 2)
    );
    const answer = heights.flat().reduce((a, b) => a + b, 0);
    const hidden = level >= 3;
    return {
      key: `cubes:${heights.map((r) => r.join('')).join('|')}`,
      text: 'Combien y a-t-il de cubes ?',
      instruction: hidden ? 'Combien y a-t-il de cubes ? Attention, certains sont cachés derrière ou dessous !' : 'Combien y a-t-il de cubes ?',
      short: { key: `cubes:${hidden}`, text: 'Combien de cubes ?' },
      stage: { type: 'cubes', heights },
      choices: numberChoices(rng, answer, 4, 1, 30).map((v) => ({ value: v, label: String(v) })),
      choiceStyle: 'numbers',
      answer,
      success: { speak: `Il y a ${answer} cubes.` },
    };
  },
};

// ---------------------------------------------------------------- Reproduire une figure

const COPY_LEVELS = [
  { label: 'Quadrillage 4 × 4, 3 cases', cols: 4, rows: 4, cells: 3 },
  { label: 'Quadrillage 6 × 6, 5 cases', cols: 6, rows: 6, cells: 5 },
  { label: 'Quadrillage 8 × 8, 8 cases', cols: 8, rows: 8, cells: 8 },
];

export const reproduire = {
  id: 'reproduire',
  domain: 'maths',
  section: 'Formes et logique',
  title: 'Reproduis le dessin',
  icon: '✏️',
  skill: 'Se repérer sur un quadrillage : reproduire une figure',
  levels: COPY_LEVELS.map((l) => l.label),
  generate(level, rng) {
    const { cols, rows, cells } = COPY_LEVELS[level - 1];
    const left = Array.from({ length: cols * rows }, (_, i) => i).filter((i) => i % cols < cols / 2);
    const model = sample(rng, left, cells).sort((a, b) => a - b);
    const solution = model.map((c) => c + cols / 2);
    return {
      key: `reproduire:${level}:${model.join('-')}`,
      interaction: 'symmetry',
      text: 'Fais le même dessin de l’autre côté.',
      instruction: 'Colorie les cases pour faire exactement le même dessin de l’autre côté du trait. Puis touche « J’ai fini ».',
      short: { key: 'reproduire', text: 'Le même dessin !' },
      stage: { type: 'symmetry', cols, rows, axis: 'v', model, solution, mode: 'copy' },
      choices: [],
      answer: null,
      success: { speak: 'Bravo, c’est le même dessin !' },
    };
  },
};

// ---------------------------------------------------------------- Les pièces du carré (tangram simplifié)

// Triangles dans une case de côté 1 : par les deux diagonales (niveau 1) ou par une seule (niveau 2).
export const PIECES = {
  haut: [[0, 0], [1, 0], [0.5, 0.5]],
  droite: [[1, 0], [1, 1], [0.5, 0.5]],
  bas: [[0, 1], [1, 1], [0.5, 0.5]],
  gauche: [[0, 0], [0, 1], [0.5, 0.5]],
  'coin-hg': [[0, 0], [1, 0], [0, 1]],
  'coin-hd': [[0, 0], [1, 0], [1, 1]],
  'coin-bg': [[0, 0], [0, 1], [1, 1]],
  'coin-bd': [[1, 0], [0, 1], [1, 1]],
};
const PIECE_COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#b980f0', '#ff9f43', '#2ec4b6', '#f368e0'];

export const tangram = {
  id: 'tangram',
  domain: 'maths',
  section: 'Formes et logique',
  title: 'Les pièces du carré',
  icon: '🔷',
  skill: 'Reconnaître une forme et son orientation pour compléter une figure',
  levels: ['Un carré en 4 triangles', 'Quatre carrés coupés en deux'],
  generate(level, rng) {
    let pieces;
    let missing;
    const colors = shuffle(rng, PIECE_COLORS);
    let options;
    if (level === 1) {
      const shapes = ['haut', 'droite', 'bas', 'gauche'];
      missing = { cell: 0, shape: pick(rng, shapes) };
      pieces = shapes.filter((sh) => sh !== missing.shape).map((shape, i) => ({ cell: 0, shape, color: colors[i] }));
      options = shapes;
    } else {
      // chaque case est coupée par une diagonale « \ » (coin-hd + coin-bg) ou « / » (coin-hg + coin-bd)
      const cuts = Array.from({ length: 4 }, () => (rng() < 0.5 ? ['coin-hd', 'coin-bg'] : ['coin-hg', 'coin-bd']));
      const all = cuts.flatMap((pair, cell) => pair.map((shape) => ({ cell, shape })));
      missing = pick(rng, all);
      pieces = all.filter((p) => p !== missing).map((p, i) => ({ ...p, color: colors[i % colors.length] }));
      options = ['coin-hg', 'coin-hd', 'coin-bg', 'coin-bd'];
    }
    return {
      key: `tangram:${level}:${missing.cell}:${missing.shape}:${pieces.map((p) => p.shape[0]).join('')}`,
      text: 'Quelle pièce bouche le trou ?',
      instruction: 'Regarde le trou dans le carré. Quelle pièce le bouche exactement ?',
      short: { key: 'tangram', text: 'Quelle pièce ?' },
      stage: { type: 'tangram', grid: level === 1 ? 1 : 2, pieces, missing },
      choices: shuffle(rng, options).map((shape) => ({ value: shape, piece: shape, name: 'pièce' })),
      choiceStyle: 'pictures',
      answer: missing.shape,
      success: { speak: 'Oui, c’est la bonne pièce !' },
    };
  },
};

export const LOGIQUE_GAMES = [symetrie, reproduire, tangram, cubes];
