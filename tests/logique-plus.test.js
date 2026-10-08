import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findGame } from '../app/js/games/index.js';
import {
  FIG_SHAPES, FIG_STYLES, MATRIX_LEVELS, PICTURES, PIXEL_COLORS, SCALE_LEVELS,
  countPicrossSolutions, describeFigure, figKey, figureSvg, lineClue, matrixHolds, picrossClues, sideWeight, solveByLines,
} from '../app/js/games/logique-plus.js';
import { createRng } from '../app/js/random.js';

const IDS = ['tableau-logique', 'balances', 'picross'];

function* questions(id, runs = 150) {
  const game = findGame(id);
  for (let level = 1; level <= game.levels.length; level++) {
    const rng = createRng(4242 + level);
    for (let i = 0; i < runs; i++) yield { level, q: game.generate(level, rng, i, { name: 'Léa' }) };
  }
}

test('logique pour aller plus loin : 7 à 10 niveaux, libellés courts, rubrique Jeux, section Logique', () => {
  for (const id of IDS) {
    const game = findGame(id);
    assert.ok(game, id);
    assert.equal(game.domain, 'jeux', id);
    assert.equal(game.section, 'Logique', id);
    assert.ok(game.levels.length >= 7 && game.levels.length <= 10, `${id} : ${game.levels.length} niveaux`);
    assert.equal(new Set(game.levels).size, game.levels.length, `${id} : deux niveaux ont le même nom`);
    for (const label of game.levels) assert.ok(label.length <= 26, `${id} : libellé trop long « ${label} »`);
  }
});

test('logique pour aller plus loin : consignes en phrases entières, sans prénom en dur', () => {
  for (const id of IDS) {
    for (const { level, q } of questions(id, 20)) {
      for (const s of [q.text, q.instruction, q.short.text, ...[q.success.speak].flat()]) {
        assert.match(s, /[.?!]$/, `${id} niveau ${level} : « ${s} »`);
        assert.ok(!/Léa|Eva|Matteo/.test(s), s);
      }
    }
  }
});

// ---------------------------------------------------------------- Le tableau logique

// tous les dessins possibles : pour vérifier qu'un seul convient à la case vide
const ALL_FIGURES = [...FIG_SHAPES, 'flèche'].flatMap((shape) => [1, 2, 3, 4].flatMap((n) => Object.keys(FIG_STYLES)
  .flatMap((style) => [0, 90, 180, 270].map((rot) => ({ shape, n, style, rot })))));

test('tableau logique : la bonne réponse suit toutes les règles, aucun intrus ne les suit', () => {
  for (const { level, q } of questions('tableau-logique')) {
    const { cells, rules } = q.stage;
    const gap = cells.indexOf(null);
    const ctx = `niveau ${level} : ${q.key}`;
    assert.equal(cells.filter((c) => c === null).length, 1, ctx);
    assert.deepEqual(rules, MATRIX_LEVELS[level - 1].rules, ctx);
    const withFig = (fig) => cells.map((c, i) => (i === gap ? fig : c));
    const answer = q.choices.find((c) => c.value === q.answer);
    assert.ok(answer, ctx);
    assert.ok(matrixHolds(withFig(answer.figure), rules), `la réponse ne suit pas la règle : ${ctx}`);
    assert.equal(q.choices.length, MATRIX_LEVELS[level - 1].choices, ctx);
    assert.equal(new Set(q.choices.map((c) => c.value)).size, q.choices.length, `choix en double : ${ctx}`);
    for (const c of q.choices) {
      assert.equal(c.value, figKey(c.figure), ctx);
      assert.equal(c.name, describeFigure(c.figure), ctx);
      if (c.value !== q.answer) assert.ok(!matrixHolds(withFig(c.figure), rules), `intrus qui suit la règle (${c.name}) : ${ctx}`);
    }
    // les règles : chaque caractéristique qui change a au moins un intrus qui la trompe
    for (const attr of Object.keys(rules)) {
      assert.ok(q.choices.some((c) => c.value !== q.answer && c.figure[attr] !== answer.figure[attr]), `aucun intrus pour la règle ${attr} : ${ctx}`);
    }
    // les intrus ne changent que ce qui suit une règle (sinon trop facile)
    for (const c of q.choices) for (const attr of ['shape', 'n', 'style', 'rot']) if (!rules[attr]) assert.equal(c.figure[attr], answer.figure[attr], ctx);
    assert.ok(q.success.speak.length >= 1, ctx);
  }
});

test('tableau logique : une seule case possible parmi tous les dessins', () => {
  for (const { level, q } of questions('tableau-logique', 25)) {
    const { cells, rules } = q.stage;
    const gap = cells.indexOf(null);
    const fits = ALL_FIGURES.filter((fig) => matrixHolds(cells.map((c, i) => (i === gap ? fig : c)), rules));
    assert.deepEqual(fits.map(figKey), [q.answer], `niveau ${level} : ${q.key}`);
  }
});

test('tableau logique : la règle se voit sans la couleur (chaque style a son motif)', () => {
  const svg = (style) => figureSvg({ shape: 'rond', n: 1, style, rot: 0 }, 'u');
  assert.ok(svg('raye').includes('<pattern id="ur"') && svg('raye').includes('fill="url(#ur)"'), 'rayures');
  assert.ok(svg('pois').includes('<circle') && svg('pois').includes('fill="url(#up)"'), 'pois');
  assert.ok(!svg('plein').includes('<pattern') && svg('plein').includes(`fill="${FIG_STYLES.plein.color}"`), 'plein');
  assert.ok(!svg('vide').includes('<pattern') && svg('vide').includes('fill="#ffffff"'), 'vide');
  // le nombre de dessins se compte
  for (const n of [1, 2, 3, 4]) assert.equal(figureSvg({ shape: 'cœur', n, style: 'plein', rot: 0 }).match(/<path/g).length, n);
  assert.equal(describeFigure({ shape: 'étoile', n: 2, style: 'raye', rot: 0 }), 'deux étoiles bleues à rayures');
  assert.equal(describeFigure({ shape: 'flèche', n: 1, style: 'vide', rot: 90 }), 'une flèche blanche qui pointe vers la droite');
});

test('tableau logique : les règles sont bien vérifiées', () => {
  const fig = (shape, n = 1, style = 'plein', rot = 0) => ({ shape, n, style, rot });
  const rows = ['rond', 'carré', 'cœur'].flatMap((s) => [fig(s), fig(s), fig(s)]);
  assert.ok(matrixHolds(rows, { shape: 'row' }));
  assert.ok(!matrixHolds(rows, { shape: 'latin' }));
  const latin = [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => fig(['rond', 'carré', 'cœur'][(r + c) % 3])));
  assert.ok(matrixHolds(latin, { shape: 'latin' }));
  // une 4e forme, différente des autres, ne remplace pas celle qui manque
  assert.ok(!matrixHolds([...latin.slice(0, 8), fig('étoile')], { shape: 'latin' }));
  const add = [[1, 2], [2, 2], [1, 1]].flatMap(([a, b]) => [fig('rond', a), fig('rond', b), fig('rond', a + b)]);
  assert.ok(matrixHolds(add, { n: 'add' }));
  const turn = [0, 90, 180].flatMap((s) => [0, 1, 2].map((c) => fig('flèche', 1, 'plein', (s + 90 * c) % 360)));
  assert.ok(matrixHolds(turn, { rot: 'turn' }));
  assert.ok(!matrixHolds([...turn.slice(0, 8), fig('flèche', 1, 'plein', 90)], { rot: 'turn' }));
});

// ---------------------------------------------------------------- Les balances

/** Toutes les façons de donner un poids (1 à 20 kg) aux animaux qui équilibrent les balances. */
function solveScales({ animals, balances }) {
  const out = [];
  const values = Array(animals.length).fill(1);
  const visit = (k) => {
    if (k === animals.length) {
      if (balances.every((b) => sideWeight(b.left, values) === sideWeight(b.right, values))) out.push([...values]);
      return;
    }
    for (let v = 1; v <= 20; v++) {
      values[k] = v;
      visit(k + 1);
    }
  };
  visit(0);
  return out;
}

test('balances : une seule solution, et c’est la bonne réponse', () => {
  for (const { level, q } of questions('balances', 60)) {
    const ctx = `niveau ${level} : ${q.key}`;
    const { balances, values, ask, animals } = q.stage;
    assert.equal(balances.length, SCALE_LEVELS[level - 1].balances, ctx);
    const solutions = solveScales(q.stage);
    assert.equal(solutions.length, 1, `${solutions.length} solutions : ${ctx}`);
    assert.deepEqual(solutions[0], values, ctx);
    assert.equal(q.answer, values[ask], ctx);
    assert.ok(q.text.includes(animals[ask].name), ctx);
    assert.ok([q.success.speak].flat().at(-1).endsWith(`${q.answer} kilo${q.answer > 1 ? 's' : ''}.`), ctx);
  }
});

test('balances : tout tient sur les plateaux, les poids sont positifs, l’animal demandé est sur une balance', () => {
  for (const { level, q } of questions('balances')) {
    const ctx = `niveau ${level} : ${q.key}`;
    const { balances, ask } = q.stage;
    for (const { left, right } of balances) {
      assert.ok(left.length >= 1 && left.length <= 4 && right.length >= 1 && right.length <= 4, ctx);
      for (const it of [...left, ...right]) assert.ok(it.animal !== undefined || (Number.isInteger(it.kg) && it.kg >= 1 && it.kg <= 20), ctx);
    }
    assert.ok(balances.some((b) => [...b.left, ...b.right].some((it) => it.animal === ask)), ctx);
    assert.ok(q.answer >= 1 && q.answer <= 20, ctx);
    assert.equal(q.choices.filter((c) => c.value === q.answer).length, 1, ctx);
    assert.equal(new Set(q.choices.map((c) => c.value)).size, 4, ctx);
  }
});

// ---------------------------------------------------------------- Le dessin caché (picross)

test('dessin caché : chaque dessin a une seule solution, trouvable ligne par ligne', () => {
  for (const p of PICTURES) {
    const size = p.rows.length;
    assert.ok(p.rows.every((r) => r.length === size && /^[.a-z]+$/.test(r)), p.name);
    for (const flip of [false, true]) {
      const rows = p.rows.map((r) => (flip ? [...r].reverse().join('') : r));
      const cells = rows.join('').split('').map((ch) => (ch === '.' ? 0 : 1));
      const { rowClues, colClues } = picrossClues(cells, size, size);
      assert.deepEqual(solveByLines(rowClues, colClues), cells, `${p.name} (${size} × ${size}) : pas trouvable ligne par ligne`);
      assert.equal(countPicrossSolutions(rowClues, colClues), 1, `${p.name} : plusieurs solutions`);
    }
    for (const ch of new Set(p.rows.join('').replace(/\./g, ''))) assert.ok(PIXEL_COLORS[ch], `${p.name} : couleur ${ch}`);
  }
  // au moins 5 dessins de chaque taille
  for (const size of [4, 5, 6, 7, 8]) assert.ok(PICTURES.filter((p) => p.rows.length === size).length >= 5, `${size} × ${size}`);
});

test('dessin caché : le solveur repère les grilles à plusieurs solutions', () => {
  // une diagonale : 1 / 1 sur les lignes et les colonnes, deux façons de la dessiner
  assert.equal(countPicrossSolutions([[1], [1]], [[1], [1]]), 2);
  assert.equal(countPicrossSolutions([[2], [2]], [[2], [2]]), 1);
  assert.equal(countPicrossSolutions([[2], [0]], [[1], [2]]), 0);
  assert.deepEqual(lineClue([1, 1, 0, 1, 0, 0, 1, 1]), [2, 1, 2]);
  assert.deepEqual(lineClue([0, 0, 0]), []);
});

test('dessin caché : nombres justes, taille et cases données du niveau', () => {
  const sizes = [4, 5, 6, 6, 7, 7, 8, 8];
  const givens = [0, 0, 3, 0, 4, 0, 5, 0];
  for (const { level, q } of questions('picross', 60)) {
    const ctx = `niveau ${level} : ${q.key}`;
    const { cols, rows, rowClues, colClues, solution, given, colors } = q.stage;
    assert.equal(cols, sizes[level - 1], ctx);
    assert.equal(rows, cols, ctx);
    assert.equal(given.length, givens[level - 1], ctx);
    const cells = Array.from({ length: cols * rows }, (_, i) => (solution.includes(i) ? 1 : 0));
    assert.deepEqual(picrossClues(cells, cols, rows), { rowClues, colClues }, ctx);
    assert.deepEqual(solveByLines(rowClues, colClues), cells, ctx);
    colors.forEach((color, i) => assert.equal(Boolean(color), Boolean(cells[i]), ctx));
    // les nombres tiennent à côté de la grille (4 au plus par ligne ou colonne)
    for (const clue of [...rowClues, ...colClues]) assert.ok(clue.length <= 4, ctx);
  }
});
