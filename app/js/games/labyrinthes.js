// Labyrinthes : guider un animal jusqu'à sa récompense, suivre un chemin de nombres
// ou de lettres. Tout est généré à partir de la graine (données pures, pas de DOM).

import { pick, randInt, sample, shuffle } from '../random.js';
import { PICTURES, READING_WORDS } from '../data/lecture-data.js';

const N = 1;
const E = 2;
const S = 4;
const W = 8;
const DIRS = [[N, 0, -1, S], [E, 1, 0, W], [S, 0, 1, N], [W, -1, 0, E]];

/**
 * Labyrinthe « parfait » (un seul chemin entre deux cases) par exploration aléatoire.
 * Renvoie, pour chaque case, les côtés ouverts (N=1, E=2, S=4, O=8).
 */
export function makeMaze(rng, cols, rows) {
  const open = Array(cols * rows).fill(0);
  const visited = new Set([0]);
  const stack = [0];
  while (stack.length) {
    const cell = stack.at(-1);
    const x = cell % cols;
    const y = Math.floor(cell / cols);
    const next = shuffle(rng, DIRS).find(([, dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      return nx >= 0 && ny >= 0 && nx < cols && ny < rows && !visited.has(ny * cols + nx);
    });
    if (!next) {
      stack.pop();
      continue;
    }
    const [bit, dx, dy, opposite] = next;
    const target = (y + dy) * cols + x + dx;
    open[cell] |= bit;
    open[target] |= opposite;
    visited.add(target);
    stack.push(target);
  }
  return open;
}

/** Peut-on passer de la case a à la case b (voisines, sans mur) ? */
export function canMove(open, cols, a, b) {
  const [ax, ay, bx, by] = [a % cols, Math.floor(a / cols), b % cols, Math.floor(b / cols)];
  if (bx === ax + 1 && by === ay) return Boolean(open[a] & E);
  if (bx === ax - 1 && by === ay) return Boolean(open[a] & W);
  if (by === ay + 1 && bx === ax) return Boolean(open[a] & S);
  if (by === ay - 1 && bx === ax) return Boolean(open[a] & N);
  return false;
}

/** Le chemin (liste de cases) du départ à l'arrivée. */
export function solveMaze(open, cols, start, goal) {
  const previous = new Map([[start, null]]);
  const queue = [start];
  while (queue.length) {
    const cell = queue.shift();
    if (cell === goal) break;
    for (const next of [cell - cols, cell + 1, cell + cols, cell - 1]) {
      if (next >= 0 && next < open.length && !previous.has(next) && canMove(open, cols, cell, next)) {
        previous.set(next, cell);
        queue.push(next);
      }
    }
  }
  const path = [];
  for (let c = goal; c !== null; c = previous.get(c)) path.unshift(c);
  return path;
}

export function areNeighbours(cols, a, b) {
  const dx = Math.abs((a % cols) - (b % cols));
  const dy = Math.abs(Math.floor(a / cols) - Math.floor(b / cols));
  return dx + dy === 1;
}

/** Chemin aléatoire qui ne repasse jamais par la même case, d'une longueur donnée. */
export function randomPath(rng, cols, rows, length) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const start = randInt(rng, 0, cols * rows - 1);
    const path = [start];
    const used = new Set(path);
    let steps = 0;
    const extend = () => {
      if (path.length === length) return true;
      if (++steps > 5000) return false;
      const cell = path.at(-1);
      const neighbours = shuffle(rng, [cell - cols, cell + 1, cell + cols, cell - 1])
        .filter((n) => n >= 0 && n < cols * rows && !used.has(n) && areNeighbours(cols, cell, n));
      for (const n of neighbours) {
        path.push(n);
        used.add(n);
        if (extend()) return true;
        path.pop();
        used.delete(n);
      }
      return false;
    };
    if (extend()) return path;
  }
  throw new Error('chemin introuvable');
}

// ---------------------------------------------------------------- Le labyrinthe

const HEROES = [
  { hero: '🐭', goal: '🧀', who: 'la souris', what: 'le fromage' },
  { hero: '🐰', goal: '🥕', who: 'le lapin', what: 'la carotte' },
  { hero: '🐶', goal: '🦴', who: 'le chien', what: "l'os" },
  { hero: '🐝', goal: '🌸', who: "l'abeille", what: 'la fleur' },
  { hero: '🐵', goal: '🍌', who: 'le singe', what: 'la banane' },
  { hero: '🐻', goal: '🍯', who: "l'ours", what: 'le miel' },
  { hero: '🐔', goal: '🌽', who: 'la poule', what: 'le maïs' },
];
const MAZE_SIZES = [[4, 4], [5, 5], [6, 6], [7, 7], [8, 8], [9, 9]];

export const labyrinthe = {
  id: 'labyrinthe',
  domain: 'maths',
  section: 'Labyrinthes',
  title: 'Le labyrinthe',
  icon: '🌀',
  skill: 'Se repérer dans l’espace, anticiper un trajet',
  levels: MAZE_SIZES.map(([c, r]) => `${c} × ${r} cases`),
  generate(level, rng) {
    const [cols, rows] = MAZE_SIZES[level - 1];
    const open = makeMaze(rng, cols, rows);
    const pair = pick(rng, HEROES);
    const corners = [0, cols - 1, cols * (rows - 1), cols * rows - 1];
    const start = pick(rng, corners);
    const goal = corners[3 - corners.indexOf(start)]; // coin opposé
    const solution = solveMaze(open, cols, start, goal);
    return {
      key: `labyrinthe:${cols}:${open.join('')}`,
      interaction: 'maze',
      text: `Aide ${pair.who} à trouver ${pair.what}.`,
      instruction: `Glisse ton doigt, ou touche les cases, pour guider ${pair.who} jusqu'à ${pair.what}.`,
      short: { key: 'labyrinthe', text: `Aide ${pair.who} à trouver ${pair.what}.` },
      stage: { type: 'maze', cols, rows, open, start, goal, hero: pair.hero, goalEmoji: pair.goal, solution },
      choices: [],
      answer: goal,
      success: { speak: `Bravo, ${pair.who} a trouvé ${pair.what} !` },
    };
  },
};

// ---------------------------------------------------------------- Chemins à suivre

const NUMBER_PATHS = [
  { label: 'De 1 à 5', cols: 3, rows: 3, seq: [1, 2, 3, 4, 5] },
  { label: 'De 1 à 10', cols: 4, rows: 4, seq: range(1, 10, 1) },
  { label: 'De 1 à 15', cols: 5, rows: 4, seq: range(1, 15, 1) },
  { label: 'De 1 à 20', cols: 5, rows: 5, seq: range(1, 20, 1) },
  { label: 'De 2 en 2 jusqu’à 20', cols: 4, rows: 4, seq: range(2, 20, 2) },
  { label: 'De 5 en 5 jusqu’à 50', cols: 4, rows: 4, seq: range(5, 50, 5) },
  { label: 'De 10 en 10 jusqu’à 100', cols: 4, rows: 4, seq: range(10, 100, 10) },
  { label: 'À rebours, de 20 à 1', cols: 5, rows: 5, seq: range(1, 20, 1).reverse() },
];

function range(from, to, step) {
  return Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);
}

/** Place la suite sur un chemin et remplit les autres cases avec des intrus. */
function pathStage(rng, cols, rows, seq, intruders) {
  const path = randomPath(rng, cols, rows, seq.length);
  const cells = Array(cols * rows).fill(null);
  path.forEach((cell, i) => { cells[cell] = seq[i]; });
  const others = shuffle(rng, intruders);
  let k = 0;
  for (let i = 0; i < cells.length; i++) if (cells[i] === null) cells[i] = others[k++ % others.length];
  return { type: 'path', cols, rows, cells, path };
}

export const cheminNombres = {
  id: 'chemin-nombres',
  domain: 'maths',
  section: 'Labyrinthes',
  title: 'Le chemin des nombres',
  icon: '🐾',
  skill: 'Réciter et lire la suite des nombres (de 1 en 1, de 2 en 2, de 5 en 5, de 10 en 10, à rebours)',
  levels: NUMBER_PATHS.map((p) => p.label),
  generate(level, rng) {
    const { cols, rows, seq } = NUMBER_PATHS[level - 1];
    const max = Math.max(...seq);
    const pool = range(1, max + 10, 1).filter((n) => !seq.includes(n));
    const stage = pathStage(rng, cols, rows, seq, pool);
    const step = seq[1] - seq[0];
    const how = step < 0 ? 'en comptant à rebours' : step === 1 ? 'dans l’ordre' : `de ${step} en ${step}`;
    return {
      key: `chemin-nombres:${level}:${stage.path.join('-')}`,
      interaction: 'path',
      text: `Suis le chemin ${how}, de ${seq[0]} à ${seq.at(-1)}.`,
      instruction: `Suis le chemin ${how}, de ${seq[0]} à ${seq.at(-1)}. Touche les nombres un par un.`,
      short: { text: `De ${seq[0]} à ${seq.at(-1)} !` },
      stage: { ...stage, seq },
      choices: [],
      answer: seq.at(-1),
      success: { speak: seq.join(', ') },
    };
  },
};

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const uniqueLetters = (w) => new Set(w).size === w.length;
const SPELL_WORDS = {
  short: [...READING_WORDS[1], ...READING_WORDS[2]].filter((w) => w.length >= 3 && w.length <= 4 && uniqueLetters(w)),
  long: [...READING_WORDS[2], ...READING_WORDS[3]].filter((w) => w.length >= 5 && w.length <= 6 && uniqueLetters(w)),
};

export const cheminLettres = {
  id: 'chemin-lettres',
  domain: 'francais',
  section: 'Labyrinthes',
  title: 'Le chemin des lettres',
  icon: '🔡',
  skill: 'Connaître l’ordre alphabétique, épeler un mot',
  levels: ['Alphabet de A à E', 'Alphabet de A à J', 'Épelle un mot court', 'Épelle un mot long'],
  generate(level, rng) {
    if (level <= 2) {
      const seq = ALPHABET.slice(0, level === 1 ? 5 : 10);
      const [cols, rows] = level === 1 ? [3, 3] : [4, 4];
      const stage = pathStage(rng, cols, rows, seq, ALPHABET.filter((l) => !seq.includes(l)));
      return {
        key: `chemin-lettres:${level}:${stage.path.join('-')}`,
        interaction: 'path',
        text: `Suis l’alphabet de ${seq[0]} à ${seq.at(-1)}.`,
        instruction: `Suis l'alphabet, de ${seq[0]} à ${seq.at(-1)}. Touche les lettres une par une.`,
        short: { text: `De ${seq[0]} à ${seq.at(-1)} !` },
        stage: { ...stage, seq },
        choices: [],
        answer: seq.at(-1),
        success: { speak: seq.join(', ') },
      };
    }
    const word = pick(rng, level === 3 ? SPELL_WORDS.short : SPELL_WORDS.long);
    const seq = word.split('');
    const [cols, rows] = level === 3 ? [3, 3] : [4, 4];
    const intruders = 'abcdefghijklmnoprstuv'.split('').filter((l) => !seq.includes(l));
    const stage = pathStage(rng, cols, rows, seq, sample(rng, intruders, intruders.length));
    return {
      key: `chemin-lettres:${word}:${stage.path.join('-')}`,
      interaction: 'path',
      text: 'Écris le mot en suivant les lettres.',
      instruction: ['Écris le mot', { text: word, rate: 0.8 }, 'en touchant les lettres une par une.'],
      short: { key: 'chemin-mot', text: 'Écris le mot.', speak: [{ text: word, rate: 0.8 }] },
      replay: [{ text: word, rate: 0.8 }],
      stage: { ...stage, seq, spell: true, picture: PICTURES[word] },
      choices: [],
      answer: word,
      success: { speak: word },
    };
  },
};

export const LABYRINTHE_GAMES = [labyrinthe, cheminNombres, cheminLettres];
