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

/** « jusqu’au fromage », « jusqu’à la fleur » (à + le = au). */
export function untilGoal(what) {
  return what.startsWith('le ') ? `jusqu’au ${what.slice(3)}` : `jusqu’à ${what}`;
}

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
// Après le 9 × 9 (la plus grande taille), le labyrinthe change de forme plutôt que de taille.
const MAZE_TWISTS = [
  { label: 'Avec des boucles, 9 × 9', twist: 'boucles' },
  { label: 'Au centre, 9 × 9', twist: 'centre' },
  { label: 'Le plus long chemin, 9 × 9', twist: 'long' },
];

/** La case la plus éloignée (en nombre de pas) d'une case de départ. */
function farthestCell(open, cols, start) {
  const dist = new Map([[start, 0]]);
  const queue = [start];
  let far = start;
  while (queue.length) {
    const cell = queue.shift();
    if (dist.get(cell) > dist.get(far)) far = cell;
    for (const next of [cell - cols, cell + 1, cell + cols, cell - 1]) {
      if (next >= 0 && next < open.length && !dist.has(next) && canMove(open, cols, cell, next)) {
        dist.set(next, dist.get(cell) + 1);
        queue.push(next);
      }
    }
  }
  return far;
}

/** Ouvre quelques murs en plus : plusieurs chemins possibles, et des boucles. */
function addLoops(rng, open, cols, rows, count) {
  const walls = [];
  for (let cell = 0; cell < cols * rows; cell++) {
    if (cell % cols < cols - 1 && !(open[cell] & E)) walls.push([cell, E, cell + 1, W]);
    if (cell < cols * (rows - 1) && !(open[cell] & S)) walls.push([cell, S, cell + cols, N]);
  }
  for (const [a, bit, b, opposite] of sample(rng, walls, count)) {
    open[a] |= bit;
    open[b] |= opposite;
  }
  return open;
}

/** Les cases voisines d'une case du labyrinthe carré (sans tenir compte des murs). */
function gridNeighbours(cols, rows, cell) {
  return [cell - cols, cell + 1, cell + cols, cell - 1]
    .filter((n) => n >= 0 && n < cols * rows && areNeighbours(cols, cell, n));
}

/**
 * Objets à ramasser (des clés) au bout des plus longues impasses : chaque objet est la case la
 * plus éloignée du chemin déjà connu (le chemin départ → arrivée, puis les impasses déjà choisies).
 * `linked(a, b)` dit si on passe de a à b ; l'arrivée est fermée tant qu'il reste des objets,
 * on ne choisit donc que des cases qu'on atteint sans passer par elle.
 */
export function deadEndItems(count, cellCount, neighbours, linked, start, goal, path) {
  const known = new Set(path);
  const items = [];
  for (let k = 0; k < count; k++) {
    const dist = new Map([...known].map((c) => [c, 0]));
    const previous = new Map();
    const queue = [...known].filter((c) => c !== goal);
    while (queue.length) {
      const c = queue.shift();
      for (const n of neighbours(c)) {
        if (n === goal || dist.has(n) || !linked(c, n)) continue;
        dist.set(n, dist.get(c) + 1);
        previous.set(n, c);
        queue.push(n);
      }
    }
    let best = null;
    for (let c = 0; c < cellCount; c++) if (dist.get(c) > (dist.get(best) ?? 0)) best = c;
    if (best === null) break; // pas d'impasse (labyrinthe minuscule)
    items.push(best);
    for (let c = best; c !== undefined && !known.has(c); c = previous.get(c)) known.add(c);
  }
  return items;
}

/**
 * Le trajet complet : du départ, ramasser chaque objet (le plus proche d'abord), puis aller à
 * l'arrivée. `solve(a, b)` donne le chemin de a à b.
 */
export function routeThrough(solve, start, goal, items) {
  const route = [start];
  const left = [...items];
  let pos = start;
  while (left.length) {
    const paths = left.map((c) => solve(pos, c));
    const k = paths.reduce((best, p, i) => (p.length < paths[best].length ? i : best), 0);
    route.push(...paths[k].slice(1));
    pos = left.splice(k, 1)[0];
  }
  route.push(...solve(pos, goal).slice(1));
  return route;
}

export const labyrinthe = {
  id: 'labyrinthe',
  domain: 'maths',
  section: 'Labyrinthes',
  title: 'Le labyrinthe',
  icon: '🌀',
  skill: 'Se repérer dans l’espace, anticiper un trajet',
  levels: [...MAZE_SIZES.map(([c, r]) => `${c} × ${r} cases`), ...MAZE_TWISTS.map((t) => t.label), 'Les trois clés, 9 × 9'],
  generate(level, rng) {
    const [cols, rows] = MAZE_SIZES[Math.min(level, MAZE_SIZES.length) - 1];
    // niveau 10 : trois clés au bout des plus longues impasses, avant d'atteindre l'arrivée
    const keys = level === 10 ? 3 : 0;
    const twist = keys ? 'cles' : MAZE_TWISTS[level - MAZE_SIZES.length - 1]?.twist;
    const open = makeMaze(rng, cols, rows);
    const pair = pick(rng, HEROES);
    const corners = [0, cols - 1, cols * (rows - 1), cols * rows - 1];
    let start = pick(rng, corners);
    let goal = corners[3 - corners.indexOf(start)]; // coin opposé
    if (twist === 'boucles') addLoops(rng, open, cols, rows, 10);
    if (twist === 'centre') goal = Math.floor(rows / 2) * cols + Math.floor(cols / 2);
    if (twist === 'long') {
      // les deux bouts du plus long chemin du labyrinthe
      start = farthestCell(open, cols, start);
      goal = farthestCell(open, cols, start);
    }
    // les clés : l'arrivée, fermée tant qu'il en reste, est au bout d'une impasse (la case la plus
    // éloignée du départ), pour ne jamais couper le labyrinthe en deux
    if (keys) goal = farthestCell(open, cols, start);
    const path = solveMaze(open, cols, start, goal);
    const items = keys
      ? deadEndItems(keys, cols * rows, (c) => gridNeighbours(cols, rows, c), (a, b) => canMove(open, cols, a, b), start, goal, path)
      : [];
    // le trajet à suivre : il passe par les clés (en revenant sur ses pas au bout de chaque impasse)
    const solution = items.length ? routeThrough((a, b) => solveMaze(open, cols, a, b), start, goal, items) : path;
    const locked = 'Il faut d’abord ramasser les trois clés.';
    return {
      key: twist ? `labyrinthe:${twist}:${start}:${open.join('')}` : `labyrinthe:${cols}:${open.join('')}`,
      interaction: 'maze',
      text: keys ? `Ramasse les 3 clés, puis trouve ${pair.what}.` : `Aide ${pair.who} à trouver ${pair.what}.`,
      instruction: keys
        ? `Guide ${pair.who} ${untilGoal(pair.what)}. ${locked}`
        : `Glisse ton doigt, ou touche les cases, pour guider ${pair.who} ${untilGoal(pair.what)}.${twist === 'boucles' ? ' Il y a plusieurs chemins !' : ''}`,
      short: keys
        ? { key: 'labyrinthe-cles', text: `Ramasse les 3 clés, puis trouve ${pair.what}.`, speak: `Ramasse les trois clés, puis trouve ${pair.what}.` }
        : { key: 'labyrinthe', text: `Aide ${pair.who} à trouver ${pair.what}.` },
      stage: {
        type: 'maze', cols, rows, open, start, goal, hero: pair.hero, goalEmoji: pair.goal, solution,
        ...(items.length ? { items, itemEmoji: '🔑', locked } : {}),
      },
      choices: [],
      answer: goal,
      success: { speak: `Bravo, ${pair.who} a trouvé ${pair.what} !` },
    };
  },
};

// ---------------------------------------------------------------- Le labyrinthe rond

// Un labyrinthe rond : une case ronde au centre (anneau 0), entourée d'anneaux découpés en
// secteurs. `sectors[r]` est le nombre de cases de l'anneau r (sectors[0] = 1, le centre) ;
// chaque anneau a un multiple du nombre de cases de l'anneau intérieur, et une case touche :
// ses deux voisines de l'anneau, la case de l'anneau intérieur qui la borde, et les cases de
// l'anneau extérieur qui la bordent. Les cases sont numérotées anneau par anneau, en partant
// du centre, chaque anneau dans le sens des aiguilles d'une montre depuis midi.

/** Le numéro de la première case de chaque anneau. */
export function ringOffsets(sectors) {
  const offsets = [];
  let n = 0;
  for (const s of sectors) {
    offsets.push(n);
    n += s;
  }
  return offsets;
}

/** Anneau et rang (dans l'anneau) d'une case. */
export function polarCell(sectors, cell) {
  const offsets = ringOffsets(sectors);
  let ring = sectors.length - 1;
  while (offsets[ring] > cell) ring--;
  return { ring, index: cell - offsets[ring] };
}

/** Les cases qui touchent une case (sans tenir compte des murs). */
export function polarNeighbours(sectors, cell) {
  const offsets = ringOffsets(sectors);
  const { ring, index } = polarCell(sectors, cell);
  const s = sectors[ring];
  const out = [];
  if (ring > 0) {
    if (s > 2) out.push(offsets[ring] + ((index + s - 1) % s), offsets[ring] + ((index + 1) % s));
    out.push(offsets[ring - 1] + Math.floor((index * sectors[ring - 1]) / s));
  }
  if (ring < sectors.length - 1) {
    const k = sectors[ring + 1] / s;
    for (let j = 0; j < k; j++) out.push(offsets[ring + 1] + index * k + j);
  }
  return out;
}

/**
 * Labyrinthe rond « parfait » (un seul chemin entre deux cases), par exploration aléatoire
 * en profondeur, qui fait de longs couloirs et de longues impasses. Le centre n'a qu'une porte
 * (c'est une impasse) : fermé tant qu'on n'a pas la clé, il ne coupe jamais le labyrinthe en deux.
 * Renvoie, pour chaque case, la liste des cases où l'on peut passer.
 */
export function makePolarMaze(rng, sectors) {
  const total = sectors.reduce((a, b) => a + b, 0);
  const links = Array.from({ length: total }, () => []);
  const link = (a, b) => {
    links[a].push(b);
    links[b].push(a);
  };
  // les anneaux d'abord (sans le centre), puis la porte du centre
  const first = randInt(rng, 1, total - 1);
  const visited = new Set([0, first]);
  const stack = [first];
  while (stack.length) {
    const cell = stack.at(-1);
    const next = shuffle(rng, polarNeighbours(sectors, cell)).find((n) => !visited.has(n));
    if (next === undefined) {
      stack.pop();
      continue;
    }
    link(cell, next);
    visited.add(next);
    stack.push(next);
  }
  link(0, randInt(rng, 1, sectors[1]));
  for (const l of links) l.sort((a, b) => a - b);
  return links;
}

/** Le chemin (liste de cases) d'une case à une autre dans un labyrinthe donné par ses passages. */
export function solveLinks(links, start, goal) {
  const previous = new Map([[start, null]]);
  const queue = [start];
  while (queue.length) {
    const cell = queue.shift();
    if (cell === goal) break;
    for (const next of links[cell]) {
      if (!previous.has(next)) {
        previous.set(next, cell);
        queue.push(next);
      }
    }
  }
  if (!previous.has(goal)) return [];
  const path = [];
  for (let c = goal; c !== null; c = previous.get(c)) path.unshift(c);
  return path;
}

/** Nombre de pas depuis une case, pour chaque case. */
function linkDistances(links, start) {
  const dist = new Map([[start, 0]]);
  const queue = [start];
  while (queue.length) {
    const cell = queue.shift();
    for (const next of links[cell]) {
      if (!dist.has(next)) {
        dist.set(next, dist.get(cell) + 1);
        queue.push(next);
      }
    }
  }
  return dist;
}

// Les cases restent assez grandes pour le doigt : 6 anneaux au plus autour du centre (sur un
// iPhone SE en portrait, un anneau fait alors 24 points d'épaisseur, 21 en paysage), et une case
// n'est jamais beaucoup plus étroite que l'anneau n'est épais (le nombre de cases d'un anneau
// double quand elles deviennent trop larges). Le « grand rond » a plus de cases par anneau.
const SIX_RINGS = [1, 6, 12, 12, 24, 24, 24];
const BIG_ROUND = [1, 8, 16, 16, 32, 32, 32];
const ROUND_LEVELS = [
  { label: '3 anneaux', sectors: [1, 4, 8, 8], mode: 'centre' },
  { label: '4 anneaux', sectors: [1, 4, 8, 8, 16], mode: 'centre' },
  { label: '5 anneaux', sectors: [1, 6, 12, 12, 24, 24], mode: 'centre' },
  { label: '6 anneaux', sectors: SIX_RINGS, mode: 'centre' },
  { label: 'Du centre à la sortie', sectors: SIX_RINGS, mode: 'sortie' },
  { label: 'La clé, 6 anneaux', sectors: SIX_RINGS, mode: 'cle' },
  { label: 'Le plus long chemin', sectors: SIX_RINGS, mode: 'long' },
  { label: 'Le grand rond', sectors: BIG_ROUND, mode: 'long' },
  { label: 'Le grand rond et la clé', sectors: BIG_ROUND, mode: 'cle' },
];
export const ROUND_MAZE_LEVELS = ROUND_LEVELS;

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

export const labyrintheRond = {
  id: 'labyrinthe-rond',
  domain: 'maths',
  section: 'Labyrinthes',
  title: 'Le labyrinthe rond',
  icon: '🎯',
  skill: 'Se repérer dans l’espace, anticiper un trajet sur un plan circulaire',
  levels: ROUND_LEVELS.map((l) => l.label),
  generate(level, rng) {
    const { sectors, mode } = ROUND_LEVELS[level - 1];
    const links = makePolarMaze(rng, sectors);
    const pair = pick(rng, HEROES);
    const offsets = ringOffsets(sectors);
    const rings = sectors.length - 1;
    const outer = Array.from({ length: sectors[rings] }, (_, i) => offsets[rings] + i);
    const fromCentre = linkDistances(links, 0);
    // une entrée (ou une sortie) au bord : au hasard parmi les cases du bord les plus éloignées
    // du centre (la moitié), ou la plus éloignée de toutes pour « le plus long chemin »
    const byDistance = [...outer].sort((a, b) => fromCentre.get(b) - fromCentre.get(a) || a - b);
    const door = mode === 'long' ? byDistance[0] : pick(rng, byDistance.slice(0, Math.ceil(outer.length / 2)));
    const [start, goal] = mode === 'sortie' ? [0, door] : [door, 0];
    const path = solveLinks(links, start, goal);
    const items = mode === 'cle'
      ? deadEndItems(1, links.length, (c) => links[c], () => true, start, goal, path)
      : [];
    const solution = items.length ? routeThrough((a, b) => solveLinks(links, a, b), start, goal, items) : path;
    const { who, what } = pair;
    const locked = 'Il faut d’abord ramasser la clé.';
    const texts = {
      centre: {
        text: `Aide ${who} à trouver ${what}, au centre.`,
        instruction: `${capitalize(what)} est au centre du labyrinthe. Glisse ton doigt le long du chemin pour guider ${who}.`,
      },
      long: {
        text: `Aide ${who} à trouver ${what}, au centre.`,
        instruction: `${capitalize(what)} est au centre du labyrinthe. Glisse ton doigt le long du chemin pour guider ${who}.`,
      },
      sortie: {
        text: `Aide ${who} à sortir du labyrinthe.`,
        instruction: `${capitalize(who)} est au centre du labyrinthe. Glisse ton doigt pour l’aider à sortir et à trouver ${what}.`,
      },
      cle: {
        text: `Ramasse la clé, puis trouve ${what}.`,
        instruction: `Guide ${who} ${untilGoal(what)}, au centre. ${locked}`,
      },
    }[mode];
    return {
      key: `labyrinthe-rond:${level}:${start}:${goal}:${links.map((l) => l.join('.')).join('-')}`,
      interaction: 'roundmaze',
      ...texts,
      short: { key: `labyrinthe-rond:${mode}`, text: texts.text },
      stage: {
        type: 'roundmaze', sectors, links, start, goal, door, hero: pair.hero, goalEmoji: pair.goal, solution,
        ...(items.length ? { items, itemEmoji: '🔑', locked } : {}),
      },
      choices: [],
      answer: goal,
      success: { speak: `Bravo, ${who} a trouvé ${what} !` },
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
  { label: 'De 3 en 3 jusqu’à 30', cols: 4, rows: 4, seq: range(3, 30, 3) },
  // Au-delà de 100 (les anciens niveaux 10 et 11, réunis) : un chemin sur deux passe la centaine
  // (de 95 à 110, les intrus sont des nombres proches : 87, 112…), l'autre va de 100 en 100
  // (les intrus, 150, 250…, ressemblent aux nombres du chemin ; 3 chiffres au plus, comme « 100 »).
  {
    label: 'Au-delà de 100',
    paths: [
      { cols: 5, rows: 4, seq: range(95, 110, 1), pool: range(80, 125, 1) },
      { cols: 4, rows: 4, seq: range(100, 900, 100), pool: range(50, 950, 100) },
    ],
  },
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
    // un niveau enregistré au-delà du dernier (il y en avait 11) joue le dernier niveau
    const path = NUMBER_PATHS[Math.min(level, NUMBER_PATHS.length) - 1];
    const { cols, rows, seq, pool: near } = path.paths ? pick(rng, path.paths) : path;
    const max = Math.max(...seq);
    const pool = (near || range(1, max + 10, 1)).filter((n) => !seq.includes(n));
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
  levels: ['Alphabet de A à E', 'Alphabet de A à J', 'Épelle un mot court', 'Épelle un mot long', 'Alphabet de K à T', 'Minuscules de a à j', 'À l’envers, de J à A'],
  generate(level, rng) {
    if (level >= 5) {
      // la suite de l'alphabet, les minuscules (b, d, p, q se ressemblent), l'alphabet à l'envers
      const lower = ALPHABET.map((l) => l.toLowerCase());
      let seq;
      let intruders;
      let how = '';
      let instruction;
      if (level === 5) {
        seq = ALPHABET.slice(10, 20);
        intruders = ALPHABET.filter((l) => !seq.includes(l));
      } else if (level === 6) {
        seq = lower.slice(0, 10);
        intruders = ['p', 'q', ...sample(rng, lower.slice(10).filter((l) => l !== 'p' && l !== 'q'), 4)];
        how = ' en minuscules';
        instruction = 'Suis l’alphabet en lettres minuscules, de a à j. Attention au b et au d ! Touche les lettres une par une.';
      } else {
        seq = ALPHABET.slice(0, 10).reverse();
        intruders = ALPHABET.slice(10);
        how = ' à l’envers';
      }
      const stage = pathStage(rng, 4, 4, seq, intruders);
      return {
        key: `chemin-lettres:${level}:${stage.path.join('-')}`,
        interaction: 'path',
        text: `Suis l’alphabet${how}, de ${seq[0]} à ${seq.at(-1)}.`,
        instruction: instruction || `Suis l’alphabet${how}, de ${seq[0]} à ${seq.at(-1)}. Touche les lettres une par une.`,
        short: { text: `De ${seq[0]} à ${seq.at(-1)} !` },
        stage: { ...stage, seq },
        choices: [],
        answer: seq.at(-1),
        success: { speak: seq.join(', ') },
      };
    }
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
      instruction: ['Écris le mot :', { text: word, rate: 0.8 }, 'Touche les lettres une par une.'],
      short: { key: 'chemin-mot', text: 'Écris le mot.', speak: [{ text: word, rate: 0.8 }] },
      replay: [{ text: word, rate: 0.8 }],
      stage: { ...stage, seq, spell: true, picture: PICTURES[word] },
      choices: [],
      answer: word,
      success: { speak: word },
    };
  },
};

export const LABYRINTHE_GAMES = [labyrinthe, labyrintheRond, cheminNombres, cheminLettres];
