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
  // des figures d'un seul morceau, collées au trait : on complète un vrai dessin
  { label: 'Figure collée au trait', cols: 6, rows: 6, axis: 'v', figures: [6] },
  { label: 'Figure, axe horizontal', cols: 8, rows: 6, axis: 'h', figures: [8] },
  { label: 'Deux figures, 8 × 8', cols: 8, rows: 8, axis: 'v', figures: [6, 4] },
];

/** La case symétrique de part et d'autre de l'axe (vertical : gauche/droite, horizontal : haut/bas). */
export function mirrorCell(cell, cols, rows, axis) {
  const x = cell % cols;
  const y = Math.floor(cell / cols);
  return axis === 'v' ? y * cols + (cols - 1 - x) : (rows - 1 - y) * cols + x;
}

/** Les cases voisines (haut, bas, gauche, droite) dans le quadrillage. */
function gridNeighbours(cell, cols, rows) {
  const x = cell % cols;
  const y = Math.floor(cell / cols);
  return [[x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y]]
    .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < cols && ny < rows)
    .map(([nx, ny]) => ny * cols + nx);
}

/** Une figure d'un seul morceau : on part d'une case et on ajoute des voisines, parmi les cases permises. */
function growFigure(rng, allowed, start, size, cols, rows) {
  const figure = new Set([start]);
  for (let tries = 0; figure.size < size && tries < 500; tries++) {
    const from = pick(rng, [...figure]);
    const next = pick(rng, gridNeighbours(from, cols, rows).filter((c) => allowed.has(c) && !figure.has(c)));
    if (next !== undefined) figure.add(next);
  }
  return [...figure];
}

/**
 * Le modèle des niveaux « figures » : la première figure touche le trait ; les suivantes
 * en sont éloignées, et séparées des autres par au moins une case vide.
 */
function figureModel(rng, cols, rows, axis, sizes) {
  const inHalf = (c) => (axis === 'v' ? c % cols < cols / 2 : Math.floor(c / cols) < rows / 2);
  const onAxis = (c) => (axis === 'v' ? c % cols === cols / 2 - 1 : Math.floor(c / cols) === rows / 2 - 1);
  for (;;) {
    const taken = new Set();
    let ok = true;
    for (const [k, size] of sizes.entries()) {
      const blocked = new Set([...taken].flatMap((c) => [c, ...gridNeighbours(c, cols, rows)]));
      const allowed = new Set(Array.from({ length: cols * rows }, (_, i) => i)
        .filter((c) => inHalf(c) && !blocked.has(c) && (k === 0 || !onAxis(c))));
      const starts = [...allowed].filter((c) => (k === 0 ? onAxis(c) : true));
      if (!starts.length) { ok = false; break; }
      const figure = growFigure(rng, allowed, pick(rng, starts), size, cols, rows);
      if (figure.length < size) { ok = false; break; }
      figure.forEach((c) => taken.add(c));
    }
    if (ok) return [...taken].sort((a, b) => a - b);
  }
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
    const { cols, rows, axis, cells, figures } = SYM_LEVELS[level - 1];
    // le modèle est à gauche (axe vertical) ou en haut (axe horizontal)
    const half = Array.from({ length: cols * rows }, (_, i) => i)
      .filter((i) => (axis === 'v' ? i % cols < cols / 2 : Math.floor(i / cols) < rows / 2));
    const model = figures ? figureModel(rng, cols, rows, axis, figures) : sample(rng, half, cells).sort((a, b) => a - b);
    const solution = model.map((c) => mirrorCell(c, cols, rows, axis)).sort((a, b) => a - b);
    const where = axis === 'v' ? 'de l’autre côté du trait' : 'de l’autre côté du trait, en bas';
    return {
      key: `symetrie:${level}:${model.join('-')}`,
      interaction: 'symmetry',
      text: figures ? 'Complète le dessin en miroir.' : 'Colorie le reflet du dessin.',
      instruction: figures
        ? `Complète le dessin : colorie les cases ${where}, comme dans un miroir. Puis touche « J’ai fini ».`
        : `Colorie les cases ${where}, comme dans un miroir. Puis touche « J’ai fini ».`,
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
  { label: 'Toutes à la même hauteur', rows: 2, cols: [2, 3], height: [1, 3], ask: 'hauteur' },
  { label: 'Combien sont cachés ?', rows: [2, 3], cols: [3, 3], height: [1, 3], ask: 'caches' },
  { label: 'Pour faire un gros cube', rows: 3, cols: [3, 3], height: [1, 3], ask: 'gros' },
];

/** Des piles de cubes tirées au hasard ; avec plusieurs rangées, rangées en escaliers. */
function stairs(rng, rows, cols, h0, h1) {
  const heights = Array.from({ length: rows }, () => Array.from({ length: cols }, () => randInt(rng, h0, h1)));
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
  return heights;
}

/**
 * Cubes qu'on ne voit pas du tout : dans un escalier, un cube est caché quand le cube du
 * dessus, celui de devant et celui de droite sont là (sinon une de ses faces se voit).
 */
export function hiddenCubes(heights) {
  const at = (x, y) => heights[y]?.[x] ?? 0;
  return heights.reduce((sum, row, y) => sum + row.reduce((s, hgt, x) => s + Math.max(0, Math.min(hgt - 1, at(x + 1, y), at(x, y + 1))), 0), 0);
}

const CUBE_ASKS = {
  hauteur: (heights) => {
    const top = heights[0][0]; // la pile du fond, à gauche, est la plus haute
    return {
      answer: heights.flat().reduce((sum, hgt) => sum + top - hgt, 0),
      text: `Combien de cubes faut-il ajouter pour que toutes les piles aient ${top} étages ?`,
      short: { key: 'cubes:hauteur', text: `Combien pour ${top} étages partout ?` },
      speak: (n) => `Il faut ajouter ${n} cubes.`,
    };
  },
  caches: (heights) => ({
    answer: hiddenCubes(heights),
    text: 'Combien de cubes sont cachés ?',
    instruction: 'Combien de cubes sont cachés ? Ce sont ceux qu’on ne voit pas du tout, derrière ou dessous.',
    short: { key: 'cubes:caches', text: 'Combien de cubes cachés ?' },
    speak: (n) => `${n} cubes sont cachés.`,
  }),
  gros: (heights) => ({
    answer: 27 - heights.flat().reduce((a, b) => a + b, 0),
    text: 'Combien de cubes faut-il ajouter pour faire un gros cube de 3 × 3 × 3 ?',
    instruction: 'Combien de cubes faut-il ajouter pour faire un gros cube : 3 étages, 3 rangées et 3 colonnes ? Attention aux cubes cachés !',
    short: { key: 'cubes:gros', text: 'Pour faire le gros cube ?' },
    speak: (n) => `Il faut ajouter ${n} cubes : le gros cube en a 27.`,
  }),
};

export const cubes = {
  id: 'cubes',
  domain: 'maths',
  section: 'Formes et logique',
  title: 'Compte les cubes',
  icon: '🧊',
  skill: 'Voir dans l’espace : compter des cubes empilés, même ceux qu’on ne voit pas',
  levels: CUBE_LEVELS.map((l) => l.label),
  generate(level, rng) {
    const { rows: rowRange, cols: [c0, c1], height: [h0, h1], ask } = CUBE_LEVELS[level - 1];
    const rows = Array.isArray(rowRange) ? randInt(rng, ...rowRange) : rowRange;
    const cols = randInt(rng, c0, c1);
    if (ask) {
      // mêmes escaliers que les niveaux 3 et 4 ; la réponse doit valoir au moins 2
      let heights;
      let q;
      do {
        heights = stairs(rng, rows, cols, h0, h1);
        q = CUBE_ASKS[ask](heights);
      } while (heights[0][0] < (ask === 'gros' ? 3 : 2) || q.answer < 2);
      return {
        key: `cubes:${ask}:${heights.map((r) => r.join('')).join('|')}`,
        text: q.text,
        instruction: q.instruction || q.text,
        short: q.short,
        stage: { type: 'cubes', heights },
        choices: numberChoices(rng, q.answer, 4, 0, 30).map((v) => ({ value: v, label: String(v) })),
        choiceStyle: 'numbers',
        answer: q.answer,
        success: { speak: q.speak(q.answer) },
      };
    }
    let heights;
    do {
      heights = stairs(rng, rows, cols, h0, h1);
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
  // la copie change : une case plus bas, la tête en bas (demi-tour), en deux fois plus grand
  { label: 'Copie décalée vers le bas', cols: 6, rows: 6, cells: 5, mode: 'shift' },
  { label: 'Copie tête en bas', cols: 6, rows: 6, cells: 5, mode: 'turn' },
  { label: 'Agrandis le dessin', cols: 8, rows: 8, cells: [3, 4], mode: 'zoom' },
  // plus de cases à décaler, puis l'inverse de l'agrandissement (chaque carré de 4 cases devient une case)
  { label: 'Copie décalée, 8 × 8', cols: 8, rows: 8, cells: 8, mode: 'shift' },
  { label: 'Rétrécis le dessin', cols: 8, rows: 8, cells: [3, 4], mode: 'shrink' },
];

/**
 * Les cases à colorier de l'autre côté du trait pour reproduire le modèle (à gauche) :
 * à la même place (copie), une case plus bas, la tête en bas (demi-tour dans le même
 * rectangle), deux fois plus grand (chaque case devient un carré de 4 cases, en
 * commençant en haut, contre le trait) ou deux fois plus petit (chaque carré de 4 cases
 * du modèle devient une case, en commençant aussi en haut, contre le trait).
 */
export function copyImage(model, cols, mode = 'copy') {
  const half = cols / 2;
  const xs = model.map((c) => c % cols);
  const ys = model.map((c) => Math.floor(c / cols));
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  if (mode === 'shrink') {
    const small = model.map((c) => Math.floor((Math.floor(c / cols) - y0) / 2) * cols + half + Math.floor((c % cols - x0) / 2));
    return [...new Set(small)].sort((a, b) => a - b);
  }
  return model.flatMap((cell) => {
    const x = cell % cols;
    const y = Math.floor(cell / cols);
    if (mode === 'shift') return [(y + 1) * cols + x + half];
    if (mode === 'turn') return [(y0 + y1 - y) * cols + (x0 + x1 - x) + half];
    if (mode === 'zoom') return [[0, 0], [1, 0], [0, 1], [1, 1]].map(([dx, dy]) => (2 * (y - y0) + dy) * cols + half + 2 * (x - x0) + dx);
    return [cell + half];
  }).sort((a, b) => a - b);
}

/** Le modèle d'une copie transformée : il doit laisser la place à la copie, et la copie doit changer le dessin. */
function copyModel(rng, cols, rows, mode, count) {
  const cells = Array.from({ length: cols * rows }, (_, i) => i);
  const xy = (c) => [c % cols, Math.floor(c / cols)];
  for (;;) {
    let model;
    if (mode === 'turn') {
      // dans un carré de 3 × 3 qu'il remplit d'un bord à l'autre : la place de la copie est claire
      const top = randInt(rng, 0, rows - 3);
      model = sample(rng, cells.filter((c) => xy(c)[0] < 3 && xy(c)[1] >= top && xy(c)[1] < top + 3), count);
      const xs = model.map((c) => xy(c)[0]);
      const ys = model.map((c) => xy(c)[1]);
      if (Math.min(...xs) !== 0 || Math.max(...xs) !== 2 || Math.min(...ys) !== top || Math.max(...ys) !== top + 2) continue;
      // un dessin qui reste pareil après un demi-tour ne fait rien travailler
      const turned = copyImage(model, cols, 'turn');
      if (turned.every((c) => model.includes(c - cols / 2))) continue;
    } else if (mode === 'shrink') {
      // des carrés de 2 × 2 cases, posés sur un quadrillage de 2 en 2 dans la moitié gauche
      const blocks = Array.from({ length: (cols / 4) * (rows / 2) }, (_, i) => i);
      model = sample(rng, blocks, count).flatMap((b) => {
        const bx = 2 * (b % (cols / 4));
        const by = 2 * Math.floor(b / (cols / 4));
        return [[0, 0], [1, 0], [0, 1], [1, 1]].map(([dx, dy]) => (by + dy) * cols + bx + dx);
      });
    } else if (mode === 'zoom') {
      // assez petit pour tenir, agrandi, dans la moitié droite (2 colonnes, 4 lignes au plus)
      model = sample(rng, cells.filter((c) => xy(c)[0] < 2 && xy(c)[1] < rows / 2), count);
    } else {
      // la copie descend d'une case : pas de modèle sur la dernière ligne
      model = sample(rng, cells.filter((c) => xy(c)[0] < cols / 2 && xy(c)[1] < rows - 1), count);
    }
    return model.sort((a, b) => a - b);
  }
}

const COPY_TEXTS = {
  shift: {
    text: 'Le même dessin, une case plus bas.',
    instruction: 'Fais le même dessin de l’autre côté du trait, mais une case plus bas. Puis touche « J’ai fini ».',
    short: { key: 'reproduire:bas', text: 'Une case plus bas !' },
    speak: 'Bravo, le dessin est descendu d’une case !',
  },
  turn: {
    text: 'Le même dessin, la tête en bas.',
    instruction: 'Fais le même dessin de l’autre côté du trait, à la même hauteur, mais la tête en bas, comme s’il faisait un demi-tour. Puis touche « J’ai fini ».',
    short: { key: 'reproduire:tourne', text: 'La tête en bas !' },
    speak: 'Bravo, le dessin a fait un demi-tour !',
  },
  zoom: {
    text: 'Fais le dessin en plus grand.',
    instruction: 'Fais le même dessin, deux fois plus grand : chaque case devient un carré de 4 cases. Commence en haut, à côté du trait. Puis touche « J’ai fini ».',
    short: { key: 'reproduire:grand', text: 'En plus grand !' },
    speak: 'Bravo, le dessin est deux fois plus grand !',
  },
  shrink: {
    text: 'Fais le dessin en plus petit.',
    instruction: 'Fais le même dessin, deux fois plus petit : chaque carré de 4 cases devient une seule case. Commence en haut, à côté du trait. Puis touche « J’ai fini ».',
    short: { key: 'reproduire:petit', text: 'En plus petit !' },
    speak: 'Bravo, le dessin est deux fois plus petit !',
  },
};

export const reproduire = {
  id: 'reproduire',
  domain: 'maths',
  section: 'Formes et logique',
  title: 'Reproduis le dessin',
  icon: '✏️',
  skill: 'Se repérer sur un quadrillage : reproduire une figure',
  levels: COPY_LEVELS.map((l) => l.label),
  generate(level, rng) {
    const { cols, rows, cells, mode = 'copy' } = COPY_LEVELS[level - 1];
    if (mode !== 'copy') {
      const model = copyModel(rng, cols, rows, mode, Array.isArray(cells) ? randInt(rng, ...cells) : cells);
      const solution = copyImage(model, cols, mode);
      const t = COPY_TEXTS[mode];
      return {
        key: `reproduire:${level}:${model.join('-')}`,
        interaction: 'symmetry',
        text: t.text,
        instruction: t.instruction,
        short: t.short,
        stage: { type: 'symmetry', cols, rows, axis: 'v', model, solution, mode },
        choices: [],
        answer: null,
        success: { speak: t.speak },
      };
    }
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

// Triangles dans une case de côté 1 : par les deux diagonales (niveau 1) ou par une seule (niveau 2) ;
// rectangles : la case coupée en deux par le milieu (niveaux 4 et 5) ; un petit coin coupé (niveaux 6 à 8).
export const PIECES = {
  haut: [[0, 0], [1, 0], [0.5, 0.5]],
  droite: [[1, 0], [1, 1], [0.5, 0.5]],
  bas: [[0, 1], [1, 1], [0.5, 0.5]],
  gauche: [[0, 0], [0, 1], [0.5, 0.5]],
  'coin-hg': [[0, 0], [1, 0], [0, 1]],
  'coin-hd': [[0, 0], [1, 0], [1, 1]],
  'coin-bg': [[0, 0], [0, 1], [1, 1]],
  'coin-bd': [[1, 0], [0, 1], [1, 1]],
  'demi-haut': [[0, 0], [1, 0], [1, 0.5], [0, 0.5]],
  'demi-bas': [[0, 0.5], [1, 0.5], [1, 1], [0, 1]],
  'demi-gauche': [[0, 0], [0.5, 0], [0.5, 1], [0, 1]],
  'demi-droite': [[0.5, 0], [1, 0], [1, 1], [0.5, 1]],
  // niveaux 6 à 8 : un coin coupé entre les milieux de deux côtés (un petit triangle et un pentagone)
  'petit-hg': [[0, 0], [0.5, 0], [0, 0.5]],
  'petit-hd': [[0.5, 0], [1, 0], [1, 0.5]],
  'petit-bg': [[0, 0.5], [0.5, 1], [0, 1]],
  'petit-bd': [[1, 0.5], [1, 1], [0.5, 1]],
  'penta-hg': [[0.5, 0], [1, 0], [1, 1], [0, 1], [0, 0.5]],
  'penta-hd': [[0, 0], [0.5, 0], [1, 0.5], [1, 1], [0, 1]],
  'penta-bg': [[0, 0], [1, 0], [1, 1], [0.5, 1], [0, 0.5]],
  'penta-bd': [[0, 0], [1, 0], [1, 0.5], [0.5, 1], [0, 1]],
};
const PIECE_COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#b980f0', '#ff9f43', '#2ec4b6', '#f368e0'];

// Les façons de couper une case, et les familles de pièces (même forme, 4 orientations).
const CUTS = {
  x: ['haut', 'droite', 'bas', 'gauche'],
  '\\': ['coin-hd', 'coin-bg'],
  '/': ['coin-hg', 'coin-bd'],
  '-': ['demi-haut', 'demi-bas'],
  '|': ['demi-gauche', 'demi-droite'],
  'c-hg': ['petit-hg', 'penta-hg'],
  'c-hd': ['petit-hd', 'penta-hd'],
  'c-bg': ['petit-bg', 'penta-bg'],
  'c-bd': ['petit-bd', 'penta-bd'],
};
const CORNER_CUTS = ['c-hg', 'c-hd', 'c-bg', 'c-bd'];
const PIECE_FAMILIES = [
  ['haut', 'droite', 'bas', 'gauche'],
  ['coin-hg', 'coin-hd', 'coin-bg', 'coin-bd'],
  ['demi-haut', 'demi-bas', 'demi-gauche', 'demi-droite'],
  ['petit-hg', 'petit-hd', 'petit-bg', 'petit-bd'],
  ['penta-hg', 'penta-hd', 'penta-bg', 'penta-bd'],
];
// Niveaux 3 à 8 : taille du carré, coupes possibles, coupes qu'il faut voir au moins une fois,
// et choix : deux pièces de la même forme et une d'une autre forme, ou la même forme dans les 4 sens (`turns`).
const TANGRAM_MIXES = {
  3: { grid: 2, cuts: ['x', '\\', '/'], need: [['x'], ['\\', '/']] },
  4: { grid: 2, cuts: ['\\', '/', '-', '|'], need: [['-', '|'], ['\\', '/']] },
  5: { grid: 3, cuts: ['x', '\\', '/', '-', '|'], need: [['x'], ['\\', '/'], ['-', '|']], turns: true },
  6: { grid: 2, cuts: [...CORNER_CUTS, '\\', '/'], need: [CORNER_CUTS, ['\\', '/']] },
  7: { grid: 3, cuts: [...CORNER_CUTS, '\\', '/', '-', '|'], need: [CORNER_CUTS, ['\\', '/'], ['-', '|']], turns: true },
  8: { grid: 4, cuts: [...CORNER_CUTS, 'x', '\\', '/', '-', '|'], need: [CORNER_CUTS, ['x'], ['\\', '/'], ['-', '|']], turns: true },
};

/** Niveaux 3 à 8 : des carrés coupés de plusieurs façons ; les choix ressemblent à la bonne pièce. */
function tangramMix(level, rng, colors) {
  const { grid, cuts, need, turns } = TANGRAM_MIXES[level];
  let cellCuts;
  do {
    cellCuts = Array.from({ length: grid * grid }, () => pick(rng, cuts));
  } while (!need.every((group) => group.some((c) => cellCuts.includes(c))));
  const all = cellCuts.flatMap((cut, cell) => CUTS[cut].map((shape) => ({ cell, shape })));
  const missing = pick(rng, all);
  const pieces = all.filter((p) => p !== missing).map((p, i) => ({ ...p, color: colors[i % colors.length] }));
  const family = PIECE_FAMILIES.find((f) => f.includes(missing.shape));
  const sameFamily = family.filter((s) => s !== missing.shape);
  let options;
  if (turns) {
    options = family; // la même forme dans les 4 sens : il faut le bon
  } else {
    // deux de la même forme, une d'une autre forme
    const otherFamilies = PIECE_FAMILIES.filter((f) => f !== family && f.some((s) => cuts.some((c) => CUTS[c].includes(s))));
    options = [missing.shape, ...sample(rng, sameFamily, 2), pick(rng, pick(rng, otherFamilies))];
  }
  return {
    key: `tangram:${level}:${missing.cell}:${missing.shape}:${cellCuts.join('')}`,
    text: 'Quelle pièce bouche le trou ?',
    instruction: 'Regarde le trou dans le carré. Quelle pièce le bouche exactement ?',
    short: { key: 'tangram', text: 'Quelle pièce ?' },
    stage: { type: 'tangram', grid, pieces, missing },
    choices: shuffle(rng, options).map((shape) => ({ value: shape, piece: shape, name: 'pièce' })),
    choiceStyle: 'pictures',
    answer: missing.shape,
    success: { speak: 'Oui, c’est la bonne pièce !' },
  };
}

export const tangram = {
  id: 'tangram',
  domain: 'maths',
  section: 'Formes et logique',
  title: 'Les pièces du carré',
  icon: '🔷',
  skill: 'Reconnaître une forme et son orientation pour compléter une figure',
  levels: [
    'Un carré en 4 triangles', 'Quatre carrés coupés en deux', 'Petits et grands triangles', 'Avec des rectangles', 'Grand carré 3 × 3',
    'Des coins coupés', 'Coins coupés, 3 × 3', 'Grand carré 4 × 4',
  ],
  generate(level, rng) {
    let pieces;
    let missing;
    const colors = shuffle(rng, PIECE_COLORS);
    if (level >= 3) return tangramMix(level, rng, colors);
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
