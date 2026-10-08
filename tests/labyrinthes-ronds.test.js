// Le labyrinthe rond (anneaux découpés en cases) et le dernier niveau du labyrinthe carré
// (trois clés à ramasser) : labyrinthes parfaits (une seule solution), tout est accessible,
// les clés sont au bout d'impasses qu'on atteint sans passer par l'arrivée.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findGame } from '../app/js/games/index.js';
import {
  canMove, makePolarMaze, polarCell, polarNeighbours, ringOffsets, ROUND_MAZE_LEVELS, solveLinks,
} from '../app/js/games/labyrinthes.js';
import { createRng } from '../app/js/random.js';

const RUNS = 80;

function* draws(id, level, runs = RUNS) {
  const rng = createRng(2027 + level);
  for (let i = 0; i < runs; i++) yield findGame(id).generate(level, rng, i, { name: 'Zoé' });
}

/** Les cases atteintes depuis une case (sans jamais entrer dans `closed`), avec leur distance. */
function reach(next, start, closed = null) {
  const dist = new Map([[start, 0]]);
  const queue = [start];
  while (queue.length) {
    const c = queue.shift();
    for (const n of next(c)) {
      if (n === closed || dist.has(n)) continue;
      dist.set(n, dist.get(c) + 1);
      queue.push(n);
    }
  }
  return dist;
}

test('labyrinthe rond : 7 à 10 niveaux, libellés courts et tous différents, dans la rubrique jeux', () => {
  const game = findGame('labyrinthe-rond');
  assert.ok(game.levels.length >= 7 && game.levels.length <= 10);
  assert.equal(new Set(game.levels).size, game.levels.length);
  for (const label of game.levels) assert.ok(label.length <= 26, `« ${label} » trop long`);
  assert.equal(game.domain, 'jeux');
  assert.equal(game.section, 'Labyrinthes');
});

test('labyrinthe rond : chaque anneau a un multiple des cases de l’anneau intérieur, voisins réciproques', () => {
  for (const { sectors } of ROUND_MAZE_LEVELS) {
    assert.equal(sectors[0], 1, 'une seule case au centre');
    for (let r = 1; r < sectors.length; r++) {
      assert.equal(sectors[r] % sectors[r - 1], 0);
      assert.ok(sectors[r] >= 4, 'au moins 4 cases par anneau');
    }
    const total = sectors.reduce((a, b) => a + b, 0);
    const offsets = ringOffsets(sectors);
    for (let c = 0; c < total; c++) {
      const { ring, index } = polarCell(sectors, c);
      assert.equal(offsets[ring] + index, c);
      const neighbours = polarNeighbours(sectors, c);
      assert.equal(new Set(neighbours).size, neighbours.length);
      for (const n of neighbours) {
        assert.ok(n >= 0 && n < total);
        assert.ok(polarNeighbours(sectors, n).includes(c), `${n} voisine de ${c}, mais pas l'inverse`);
        assert.ok(Math.abs(polarCell(sectors, n).ring - ring) <= 1);
      }
    }
    // le centre touche toutes les cases du premier anneau
    assert.equal(polarNeighbours(sectors, 0).length, sectors[1]);
  }
});

test('labyrinthe rond : des cases assez grandes pour le doigt sur un iPhone SE', () => {
  // en portrait, le dessin fait 343 points de large ; T = 10 unités par anneau, 2 de marge
  for (const { label, sectors } of ROUND_MAZE_LEVELS) {
    const rings = sectors.length - 1;
    assert.ok(rings <= 6, `${label} : ${rings} anneaux`);
    const ring = (343 * 10) / (2 * ((rings + 1) * 10 + 2));
    assert.ok(ring >= 22, `${label} : anneau de ${ring.toFixed(1)} points`);
    // une case est aussi large (au milieu de l'anneau) que l'anneau est épais, ou presque
    for (let r = 1; r <= rings; r++) {
      const width = (2 * Math.PI * (r + 0.5)) / sectors[r];
      assert.ok(width >= 0.85, `${label}, anneau ${r} : cases trop étroites (${width.toFixed(2)})`);
      assert.ok(width <= 2.8, `${label}, anneau ${r} : cases trop larges (${width.toFixed(2)})`);
    }
  }
});

test('labyrinthe rond : labyrinthe parfait (toutes les cases reliées, une seule solution)', () => {
  const game = findGame('labyrinthe-rond');
  for (let level = 1; level <= game.levels.length; level++) {
    for (const q of draws('labyrinthe-rond', level)) {
      const { sectors, links, start, goal, door, solution } = q.stage;
      const total = sectors.reduce((a, b) => a + b, 0);
      assert.equal(q.interaction, 'roundmaze');
      assert.equal(q.stage.type, 'roundmaze');
      assert.equal(links.length, total);
      // passages réciproques, entre cases voisines seulement
      let passages = 0;
      links.forEach((list, c) => {
        for (const n of list) {
          assert.ok(polarNeighbours(sectors, c).includes(n), `passage à travers un mur : ${c} → ${n}`);
          assert.ok(links[n].includes(c));
          passages++;
        }
      });
      // reliées et sans boucle : (cases − 1) passages, donc un seul chemin entre deux cases
      const dist = reach((c) => links[c], start);
      assert.equal(dist.size, total, `niveau ${level} : des cases inaccessibles`);
      assert.equal(passages / 2, total - 1, `niveau ${level} : il y a une boucle`);
      assert.equal(links[0].length, 1, 'le centre n’a qu’une porte');
      // départ et arrivée : l'une au centre, l'autre au bord (devant l'ouverture)
      assert.notEqual(start, goal);
      assert.ok([start, goal].includes(0));
      assert.ok([start, goal].includes(door));
      assert.equal(polarCell(sectors, door).ring, sectors.length - 1);
      assert.equal(q.answer, goal);
      // le trajet : de case en case, sans traverser de mur, et l'arrivée seulement à la fin
      assert.equal(solution[0], start);
      assert.equal(solution.at(-1), goal);
      assert.equal(solution.indexOf(goal), solution.length - 1);
      for (let i = 1; i < solution.length; i++) assert.ok(links[solution[i - 1]].includes(solution[i]));
      if (!q.stage.items) assert.equal(solution.length - 1, dist.get(goal), 'le plus court chemin');
    }
  }
});

test('labyrinthe rond : sortir du centre, le plus long chemin, la clé avant le trésor', () => {
  const game = findGame('labyrinthe-rond');
  ROUND_MAZE_LEVELS.forEach(({ mode }, k) => {
    const level = k + 1;
    for (const q of draws('labyrinthe-rond', level, 40)) {
      const { sectors, links, start, goal, solution, items } = q.stage;
      const offsets = ringOffsets(sectors);
      const rings = sectors.length - 1;
      const outer = Array.from({ length: sectors[rings] }, (_, i) => offsets[rings] + i);
      const fromCentre = reach((c) => links[c], 0);
      if (mode === 'sortie') assert.equal(start, 0, 'le personnage part du centre');
      else assert.equal(goal, 0, 'le trésor est au centre');
      if (mode === 'long') {
        assert.equal(fromCentre.get(start), Math.max(...outer.map((c) => fromCentre.get(c))), 'l’entrée la plus éloignée');
      }
      if (mode !== 'cle') {
        assert.equal(items, undefined);
        continue;
      }
      // une clé, au bout d'une impasse, qu'on atteint sans passer par le trésor
      assert.equal(items.length, 1);
      const [key] = items;
      assert.equal(links[key].length, 1, 'la clé est au bout d’une impasse');
      assert.ok(!solveLinks(links, start, goal).includes(key), 'la clé n’est pas sur le chemin direct');
      assert.ok(reach((c) => links[c], start, goal).has(key), 'la clé est accessible sans passer par le trésor');
      // le trésor, fermé, ne coupe pas le labyrinthe : tout le reste est accessible
      assert.equal(reach((c) => links[c], start, goal).size, links.length - 1);
      assert.ok(solution.indexOf(key) > 0 && solution.indexOf(key) < solution.length - 1);
      assert.match(q.instruction, /Il faut d’abord ramasser la clé\./);
      assert.equal(q.stage.locked, 'Il faut d’abord ramasser la clé.');
    }
  });
  // la difficulté augmente : jamais moins de cases d'un niveau au suivant
  const sizes = ROUND_MAZE_LEVELS.map(({ sectors }) => sectors.reduce((a, b) => a + b, 0));
  for (let i = 1; i < sizes.length; i++) assert.ok(sizes[i] >= sizes[i - 1]);
  assert.ok(game.levels[0].startsWith('3 anneaux'));
});

test('labyrinthe rond : les tirages varient, le générateur est déterministe', () => {
  const sectors = ROUND_MAZE_LEVELS.at(-1).sectors;
  assert.deepEqual(makePolarMaze(createRng(7), sectors), makePolarMaze(createRng(7), sectors));
  for (let level = 1; level <= ROUND_MAZE_LEVELS.length; level++) {
    const keys = new Set([...draws('labyrinthe-rond', level, 20)].map((q) => q.key));
    assert.ok(keys.size >= 18, `niveau ${level} : ${keys.size} labyrinthes différents`);
  }
});

test('labyrinthe carré : 10 niveaux, le dernier avec trois clés au bout des impasses', () => {
  const game = findGame('labyrinthe');
  assert.equal(game.levels.length, 10);
  assert.equal(game.levels[9], 'Les trois clés, 9 × 9');
  for (const label of game.levels) assert.ok(label.length <= 26);
  for (const q of draws('labyrinthe', 10)) {
    const { cols, rows, open, start, goal, solution, items } = q.stage;
    assert.ok(cols === 9 && rows === 9, 'des cases pas plus petites qu’au 9 × 9');
    const next = (c) => [c - cols, c + 1, c + cols, c - 1].filter((n) => n >= 0 && n < cols * rows && canMove(open, cols, c, n));
    // labyrinthe parfait
    const passages = open.reduce((s, bits) => s + [1, 2, 4, 8].filter((b) => bits & b).length, 0) / 2;
    assert.equal(passages, cols * rows - 1);
    assert.equal(reach(next, start).size, cols * rows);
    // trois clés différentes, au bout d'impasses, hors du chemin direct, accessibles sans passer par l'arrivée
    assert.equal(items.length, 3);
    assert.equal(new Set(items).size, 3);
    const direct = new Set();
    for (let c = goal, d = reach(next, start); c !== start;) {
      direct.add(c);
      c = next(c).find((n) => d.get(n) === d.get(c) - 1);
    }
    const open1 = reach(next, start, goal);
    // l'arrivée, fermée tant qu'il reste des clés, est une impasse : elle ne coupe pas le labyrinthe
    assert.equal(next(goal).length, 1);
    assert.equal(open1.size, cols * rows - 1);
    for (const key of items) {
      assert.equal(next(key).length, 1, 'au bout d’une impasse');
      assert.ok(!direct.has(key) && key !== start);
      assert.ok(open1.has(key));
    }
    // le trajet passe par les trois clés, puis arrive (et pas avant)
    assert.equal(solution[0], start);
    assert.equal(solution.indexOf(goal), solution.length - 1);
    for (const key of items) assert.ok(solution.includes(key));
    for (let i = 1; i < solution.length; i++) assert.ok(canMove(open, cols, solution[i - 1], solution[i]));
    assert.equal(q.answer, goal);
    assert.match(q.instruction, /Il faut d’abord ramasser les trois clés\./);
  }
});
