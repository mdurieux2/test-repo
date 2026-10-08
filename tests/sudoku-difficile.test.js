// Sudoku « encore plus compliqué » : 10 niveaux, du 4 × 4 en images au vrai 9 × 9 avec 25 indices.
// Chaque grille a une seule solution (vérifiée par deux solveurs), le bon nombre de cases à trouver,
// se résout sans deviner aux niveaux durs, et se fabrique vite et toujours pareil pour une graine donnée.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findGame } from '../app/js/games/index.js';
import { countSolutions, makeSudoku, solvesBySingles, sudokuBox } from '../app/js/games/maths-extra.js';
import { createRng } from '../app/js/random.js';

const game = findGame('sudoku');

// taille de la grille et nombre de cases à trouver, niveau par niveau
const LEVELS = {
  1: { size: 4, holes: 4 }, 2: { size: 4, holes: 7 }, 3: { size: 4, holes: 8 },
  4: { size: 6, holes: 15 }, 5: { size: 6, holes: 21 }, 6: { size: 6, holes: 24 }, 7: { size: 6, holes: 26 },
  8: { size: 9, holes: 40 }, 9: { size: 9, holes: 48 }, 10: { size: 9, holes: 56 },
};

/** Les lignes, colonnes et carrés d'une grille (listes de numéros de cases). */
function units(size) {
  const [br, bc] = sudokuBox(size);
  const cells = Array.from({ length: size * size }, (_, i) => i);
  const box = (i) => Math.floor(Math.floor(i / size) / br) * (size / bc) + Math.floor((i % size) / bc);
  return [
    ...Array.from({ length: size }, (_, r) => cells.filter((i) => Math.floor(i / size) === r)),
    ...Array.from({ length: size }, (_, c) => cells.filter((i) => i % size === c)),
    ...Array.from({ length: size }, (_, b) => cells.filter((i) => box(i) === b)),
  ];
}

/**
 * Solveur indépendant de celui du jeu (ensembles de possibilités, sans bits) : nombre de
 * solutions, en s'arrêtant à 2.
 */
function independentCount(puzzle, size) {
  const groups = units(size);
  const peers = puzzle.map((_, i) => [...new Set(groups.filter((u) => u.includes(i)).flat())].filter((k) => k !== i));
  const grid = [...puzzle];
  let count = 0;
  const search = () => {
    let best = -1;
    let options = null;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] !== null) continue;
      const used = new Set(peers[i].map((k) => grid[k]));
      const free = [];
      for (let v = 0; v < size; v++) if (!used.has(v)) free.push(v);
      if (!options || free.length < options.length) {
        best = i;
        options = free;
        if (free.length <= 1) break;
      }
    }
    if (best === -1) {
      count++;
      return;
    }
    for (const v of options) {
      if (count >= 2) return;
      grid[best] = v;
      search();
      grid[best] = null;
    }
  };
  search();
  return count;
}

/** « 8..36.. » → [7, null, null, 2, 5, null, …] (chiffres 1-9 → valeurs 0-8). */
const parse = (text) => [...text].map((ch) => (ch === '.' ? null : Number(ch) - 1));

test('sudoku : 10 niveaux au plus, libellés courts, de plus en plus difficiles', () => {
  assert.ok(game.levels.length >= 7 && game.levels.length <= 10);
  assert.equal(game.levels.length, Object.keys(LEVELS).length);
  for (const label of game.levels) assert.ok(label.length <= 26, `« ${label} » trop long`);
  assert.equal(new Set(game.levels).size, game.levels.length, 'deux niveaux du même nom');
  // à taille égale, de plus en plus de cases à trouver ; la taille ne diminue jamais
  for (let level = 2; level <= 10; level++) {
    const [before, now] = [LEVELS[level - 1], LEVELS[level]];
    assert.ok(now.size > before.size || now.holes > before.holes, `niveau ${level}`);
  }
});

test('sudoku : chaque grille est juste, a une seule solution et le nombre de cases du niveau', () => {
  for (let level = 1; level <= 10; level++) {
    const { size, holes } = LEVELS[level];
    const rng = createRng(2026 + level);
    const runs = size === 9 ? 25 : 60;
    for (let i = 0; i < runs; i++) {
      const q = game.generate(level, rng, i, { name: 'Zoé' });
      const { puzzle, solution, symbols, box } = q.stage;
      assert.equal(q.stage.size, size, `niveau ${level}`);
      assert.deepEqual(box, sudokuBox(size));
      assert.equal(symbols.length, size);
      assert.equal(new Set(symbols).size, size);
      assert.equal(puzzle.filter((v) => v === null).length, holes, `niveau ${level} : ${q.key}`);
      // les indices sont ceux de la solution, et la solution respecte les règles
      puzzle.forEach((v, k) => { if (v !== null) assert.equal(v, solution[k]); });
      for (const unit of units(size)) assert.equal(new Set(unit.map((k) => solution[k])).size, size, q.key);
      // une seule solution, selon le solveur du jeu et selon un solveur indépendant
      assert.equal(countSolutions(puzzle, size), 1, q.key);
      assert.equal(independentCount(puzzle, size), 1, q.key);
      // niveaux 5 et plus : la grille se résout sans jamais deviner
      if (level >= 5) assert.ok(solvesBySingles(puzzle, size), q.key);
      assert.ok(!/Eva|Matteo/.test(q.text + q.instruction), 'aucun prénom en dur');
    }
  }
});

test('sudoku 9 × 9 : carrés de 3 × 3, chiffres 1 à 9, de moins en moins d’indices', () => {
  const clues = { 8: 41, 9: 33, 10: 25 };
  for (const level of [8, 9, 10]) {
    const q = game.generate(level, createRng(level));
    assert.deepEqual(q.stage.box, [3, 3]);
    assert.deepEqual(q.stage.symbols, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.equal(q.stage.puzzle.filter((v) => v !== null).length, clues[level]);
    assert.equal(q.interaction, 'sudoku');
    // mêmes phrases que le 6 × 6 en chiffres (déjà enregistrées par la voix naturelle)
    assert.equal(q.text, 'Complète la grille : chaque chiffre une seule fois par ligne, par colonne et par carré.');
  }
});

test('sudoku : génération rapide (moins de 50 ms par grille en moyenne)', () => {
  for (let level = 1; level <= 10; level++) {
    const rng = createRng(77 + level);
    game.generate(level, rng); // échauffement
    const runs = 20;
    const start = performance.now();
    for (let i = 0; i < runs; i++) game.generate(level, rng, i);
    const average = (performance.now() - start) / runs;
    assert.ok(average < 50, `niveau ${level} : ${average.toFixed(1)} ms par grille`);
  }
});

test('sudoku : même graine, mêmes grilles', () => {
  for (const level of [1, 5, 7, 10]) {
    const run = () => {
      const rng = createRng(31415);
      return Array.from({ length: 5 }, (_, i) => {
        const q = game.generate(level, rng, i);
        return `${q.key}|${q.stage.symbols.join('')}`;
      });
    };
    assert.deepEqual(run(), run(), `niveau ${level}`);
  }
  assert.notDeepEqual(game.generate(10, createRng(1)).key, game.generate(10, createRng(2)).key);
});

test('sudoku : les solveurs ne se trompent pas', () => {
  // grille vide : plusieurs solutions, et on ne peut pas commencer sans deviner
  for (const size of [4, 6, 9]) {
    const empty = Array(size * size).fill(null);
    assert.equal(countSolutions(empty, size), 2);
    assert.equal(solvesBySingles(empty, size), false);
  }
  // deux fois le même chiffre dans une ligne : aucune solution
  const wrong = Array(81).fill(null);
  wrong[0] = 4;
  wrong[8] = 4;
  assert.equal(countSolutions(wrong, 9), 0);
  assert.equal(solvesBySingles(wrong, 9), false);
  // grille célèbre très difficile (A. Inkala) : une seule solution, mais il faut deviner
  const hard = parse('8..........36......7..9.2...5...7.......457.....1...3...1....68..85...1..9....4..');
  assert.equal(countSolutions(hard, 9), 1);
  assert.equal(independentCount(hard, 9), 1);
  assert.equal(solvesBySingles(hard, 9), false);
  // grille facile classique : se résout case par case
  const easy = parse('53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79');
  assert.equal(countSolutions(easy, 9), 1);
  assert.equal(solvesBySingles(easy, 9), true);
  // une case de moins dans une grille unique du jeu ouvre souvent une 2e solution : le compteur la voit
  const { puzzle, solution } = makeSudoku(createRng(5), 9, 56, true);
  let seenTwo = false;
  for (let k = 0; k < 81 && !seenTwo; k++) {
    if (puzzle[k] === null) continue;
    const more = [...puzzle];
    more[k] = null;
    const n = countSolutions(more, 9);
    assert.equal(n, independentCount(more, 9));
    if (n === 2) seenTwo = true;
  }
  assert.ok(seenTwo);
  assert.equal(countSolutions(solution, 9), 1);
});
