import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAMES, DOMAINS, findGame } from '../app/js/games/index.js';
import { CALC_PALIERS, CALC_FORMATS, equationHolds } from '../app/js/games/maths.js';
import { areNeighbours, canMove } from '../app/js/games/labyrinthes.js';
import { clockLabel, countSolutions, solvesBySingles, sudokuAllows } from '../app/js/games/maths-extra.js';
import { TEXT_DATA } from '../app/js/games/textes.js';
import { mirrorCell, PIECES } from '../app/js/games/logique.js';
import { makeChange } from '../app/js/games/mesures.js';
import { STORY_DATA } from '../app/js/games/histoires.js';
import { seasonOf } from '../app/js/themes.js';
import { createRng } from '../app/js/random.js';
import {
  FIRST_SOUNDS, PICTURES, READING_WORDS, SIGHT_WORDS, SYLLABLE_LEVELS,
} from '../app/js/data/lecture-data.js';
import { ENGLISH_THEMES } from '../app/js/data/anglais-data.js';
import {
  CAPITALES, CHIFFRES, CURSIVE, GLYPHS, GRAPHISMES, WRITING_LINES, capitalName, nameLetters, signedArea,
} from '../app/js/data/ecriture-data.js';

const RUNS = 200;

function* questions(game) {
  for (let level = 1; level <= game.levels.length; level++) {
    const rng = createRng(1234 + level);
    for (let i = 0; i < RUNS; i++) yield { level, i, q: game.generate(level, rng, i) };
  }
}

function checkQuestion(q, ctx) {
  assert.ok(q.key && q.text && q.instruction, ctx);
  assert.ok(q.stage && q.stage.type, ctx);
  if (q.short) assert.ok(typeof q.short.text === 'string' && q.short.text.length > 0, `consigne courte vide : ${ctx}`);
  switch (q.interaction) {
    case 'keypad':
      assert.ok(Number.isInteger(q.answer) && q.answer >= 0, ctx);
      assert.ok(String(q.answer).length <= q.maxDigits, ctx);
      break;
    case 'match': {
      assert.ok(q.pairs.length >= 3, ctx);
      const answers = q.pairs.map((p) => p.right);
      assert.equal(new Set(answers).size, answers.length, `résultats en double : ${ctx}`);
      assert.deepEqual(q.rights.map(String).sort(), answers.map(String).sort(), ctx);
      break;
    }
    case 'fill':
      assert.ok(q.equations.length >= 2, ctx);
      for (const eq of q.equations) assert.ok(equationHolds(eq, ...eq.solution), ctx);
      assert.deepEqual([...q.tiles].sort((a, b) => a - b), q.equations.flatMap((e) => e.solution).sort((a, b) => a - b), ctx);
      break;
    case 'build': {
      const { items, limit } = q.stage;
      assert.ok(items.length >= 1 && items.length <= 3, ctx);
      assert.equal(q.answer, items.reduce((sum, i) => sum + i.target, 0), ctx);
      for (const item of items) assert.ok(item.target >= 1 && item.target <= limit && item.emoji && item.many, ctx);
      assert.equal(new Set(items.map((i) => i.emoji)).size, items.length, `fruit en double : ${ctx}`);
      break;
    }
    case 'maze': {
      const { cols, rows, open, start, goal, solution } = q.stage;
      assert.equal(open.length, cols * rows, ctx);
      assert.equal(solution[0], start, ctx);
      assert.equal(solution.at(-1), goal, ctx);
      assert.notEqual(start, goal, ctx);
      for (let i = 1; i < solution.length; i++) assert.ok(canMove(open, cols, solution[i - 1], solution[i]), ctx);
      // les clés à ramasser sont sur le trajet, avant l'arrivée
      for (const item of q.stage.items || []) assert.ok(solution.includes(item) && item !== goal, ctx);
      break;
    }
    case 'roundmaze': {
      // détails dans tests/labyrinthes-ronds.test.js
      const { sectors, links, start, goal, solution } = q.stage;
      assert.equal(links.length, sectors.reduce((a, b) => a + b, 0), ctx);
      assert.equal(solution[0], start, ctx);
      assert.equal(solution.at(-1), goal, ctx);
      assert.notEqual(start, goal, ctx);
      for (let i = 1; i < solution.length; i++) assert.ok(links[solution[i - 1]].includes(solution[i]), ctx);
      assert.equal(q.answer, goal, ctx);
      break;
    }
    case 'path': {
      const { cols, rows, cells, path, seq } = q.stage;
      assert.equal(cells.length, cols * rows, ctx);
      assert.equal(path.length, seq.length, ctx);
      assert.equal(new Set(path).size, path.length, ctx);
      path.forEach((cell, i) => assert.equal(cells[cell], seq[i], ctx));
      for (let i = 1; i < path.length; i++) assert.ok(areNeighbours(cols, path[i - 1], path[i]), ctx);
      // les cases hors du chemin ne contiennent jamais un élément de la suite
      cells.forEach((v, i) => { if (!path.includes(i)) assert.ok(!seq.includes(v), `intrus ambigu ${v} : ${ctx}`); });
      break;
    }
    case 'order': {
      // les lettres pièges de la dictée valent null
      const values = q.items.filter((i) => i.value !== null).map((i) => i.value);
      assert.ok(values.length >= 3, ctx);
      assert.equal(new Set(values).size, values.length, ctx);
      assert.ok(['asc', 'desc'].includes(q.order), ctx);
      break;
    }
    case 'symmetry': {
      const { cols, rows, axis, model, solution, mode } = q.stage;
      const half = cols / 2;
      const xs = model.map((c) => c % cols);
      const ys = model.map((c) => Math.floor(c / cols));
      const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      // ce qu'il faut colorier pour chaque case du modèle : reflet, copie, copie plus bas, demi-tour, agrandie,
      // rétrécie (chaque carré de 2 × 2 cases du modèle donne une seule case)
      const image = (c) => {
        const [x, y] = [c % cols, Math.floor(c / cols)];
        if (mode === 'shrink') return [Math.floor((y - y0) / 2) * cols + half + Math.floor((x - x0) / 2)];
        if (mode === 'copy') return [c + half];
        if (mode === 'shift') return [c + cols + half];
        if (mode === 'turn') return [(y0 + y1 - y) * cols + (x0 + x1 - x) + half];
        if (mode === 'zoom') return [0, 1, cols, cols + 1].map((d) => (2 * (y - y0)) * cols + half + 2 * (x - x0) + d);
        return [mirrorCell(c, cols, rows, axis)];
      };
      const expected = [...new Set(model.flatMap(image))].sort((a, b) => a - b);
      if (mode === 'shrink') assert.equal(model.length, 4 * expected.length, `le modèle est fait de carrés de 4 cases : ${ctx}`);
      assert.deepEqual(expected, solution, ctx);
      assert.equal(new Set(solution).size, solution.length, ctx);
      for (const c of solution) assert.ok(c >= 0 && c < cols * rows, `case hors du quadrillage : ${ctx}`);
      // le modèle est d'un côté du trait, ce qu'on colorie de l'autre
      const target = (c) => (axis === 'v' ? c % cols >= half : Math.floor(c / cols) >= rows / 2);
      assert.ok(model.every((c) => !target(c)) && solution.every(target), `modèle et reflet se chevauchent : ${ctx}`);
      break;
    }
    case 'pay':
      assert.ok(Number.isInteger(q.answer) && q.answer >= 1 && q.answer <= 50, ctx);
      assert.ok(q.values.includes(1), `on doit pouvoir payer toute somme : ${ctx}`);
      break;
    case 'sudoku': {
      const { size, puzzle, solution } = q.stage;
      assert.equal(puzzle.length, size * size, ctx);
      assert.equal(solution.length, size * size, ctx);
      assert.ok(puzzle.includes(null), ctx);
      break;
    }
    case 'lasso': {
      const { count, group, positions } = q.stage;
      assert.equal(q.answer, count, ctx);
      assert.ok(count >= group && positions.length === count, ctx);
      assert.equal(new Set(positions.map((p) => `${p.x},${p.y}`)).size, count, ctx);
      for (const p of positions) assert.ok(p.x > 0 && p.x < 100 && p.y > 0 && p.y < 100, ctx);
      const values = q.choices.map((c) => c.value);
      assert.equal(values.filter((v) => v === q.answer).length, 1, ctx);
      break;
    }
    case 'swap': {
      const { cols, rows, order } = q.stage;
      assert.deepEqual([...order].sort((a, b) => a - b), Array.from({ length: cols * rows }, (_, i) => i), ctx);
      assert.ok(order.some((v, i) => v !== i), `puzzle déjà fini : ${ctx}`);
      break;
    }
    case 'memory': {
      const counts = {};
      for (const c of q.cards) counts[c.pair] = (counts[c.pair] || 0) + 1;
      assert.ok(Object.values(counts).every((n) => n === 2), `chaque carte a exactement une paire : ${ctx}`);
      assert.ok(q.cards.length >= 4 && q.cards.length <= 20, ctx);
      break;
    }
    case 'colorby': {
      const { zones, legend } = q.stage;
      for (const z of zones) {
        assert.ok(z.c >= 0 && z.c < legend.length, ctx);
        // le calcul écrit dans la zone donne bien le nombre de sa couleur
        const value = Function(`return ${z.label.replace('−', '-').replace('×', '*')}`)();
        assert.equal(value, legend[z.c].n, `${z.label} ≠ ${legend[z.c].n} : ${ctx}`);
      }
      assert.ok(new Set(zones.map((z) => z.c)).size >= 2, ctx);
      break;
    }
    case 'trace': {
      const { set, glyph, strokes } = q.stage;
      assert.ok(Array.isArray(strokes) && strokes.length >= 1, `aucun trait : ${ctx}`);
      for (const st of strokes) {
        assert.ok(st.length >= 2, `trait vide : ${ctx}`);
        for (const [x, y] of st) assert.ok(x >= 0 && x <= 100 && y >= 0 && y <= 100, `point hors du carré : ${ctx}`);
      }
      // le glyphe attendu existe, et ce sont bien ses traits qu'on fait tracer
      const expected = GLYPHS[set]?.[glyph];
      assert.ok(expected, `glyphe inconnu : ${ctx}`);
      assert.deepEqual(strokes, expected.strokes || expected, ctx);
      assert.equal(q.answer, glyph, ctx);
      break;
    }
    case 'dots': {
      const { points, labels } = q.stage;
      assert.equal(points.length, labels.length, ctx);
      assert.equal(new Set(labels).size, labels.length, ctx);
      for (const [x, y] of points) assert.ok(x >= 0 && x <= 100 && y >= 0 && y <= 100, ctx);
      break;
    }
    case 'picross': {
      // le dessin caché : les nombres sont ceux du dessin, les cases données en font partie
      const { cols, rows, rowClues, colClues, solution, given, colors } = q.stage;
      assert.equal(rowClues.length, rows, ctx);
      assert.equal(colClues.length, cols, ctx);
      assert.equal(colors.length, cols * rows, ctx);
      assert.ok(solution.length >= 2 && solution.every((i) => i >= 0 && i < cols * rows && colors[i]), ctx);
      assert.ok(given.every((i) => solution.includes(i)), `case donnée hors du dessin : ${ctx}`);
      assert.deepEqual(q.choices, [], ctx);
      break;
    }
    case 'setclock': {
      // l'heure à régler et l'heure de départ du cadran : de 1 h à 12 h, minutes de 5 en 5
      const { start } = q.stage;
      assert.equal(q.stage.type, 'setclock', ctx);
      for (const t of [start, q.target]) {
        assert.ok(Number.isInteger(t.h) && t.h >= 1 && t.h <= 12, `heure hors du cadran : ${ctx}`);
        assert.ok(Number.isInteger(t.m) && t.m >= 0 && t.m < 60 && t.m % 5 === 0, `minutes pas de 5 en 5 : ${ctx}`);
      }
      const minutes = ({ h, m }) => (h % 12) * 60 + m;
      assert.notEqual(minutes(start), minutes(q.target), `le cadran est déjà à la bonne heure : ${ctx}`);
      assert.equal(q.answer, clockLabel(q.target.h, q.target.m), ctx);
      assert.ok(q.answerSpeech, ctx);
      assert.deepEqual(q.choices, [], ctx);
      break;
    }
    case 'numberline': {
      // placer un nombre sur la droite (détails dans tests/nombres-plus.test.js)
      const { min, max, snap } = q.stage;
      assert.ok(q.target >= min && q.target <= max && (q.target - min) % snap === 0, ctx);
      assert.equal(q.answer, q.target, ctx);
      assert.deepEqual(q.choices, [], ctx);
      break;
    }
    case 'shade': {
      // colorier des parts égales (détails dans tests/nombres-plus.test.js)
      const { sizes, shaded } = q.stage;
      assert.ok(sizes.every((s) => s === sizes[0]) && shaded.length === 0, ctx);
      assert.ok(q.target >= 1 && q.target < sizes.length, ctx);
      assert.deepEqual(q.choices, [], ctx);
      break;
    }
    case 'share': {
      // le partage (détails dans tests/operations.test.js) : des parts égales, et un reste plus petit
      const { total, groups, size, who } = q.stage;
      const unit = size || groups;
      assert.ok(Number.isInteger(total) && total >= unit && total <= 30, ctx);
      if (!size) assert.equal(new Set(who).size, groups, ctx);
      if (q.ask) {
        assert.equal(q.answer, size ? Math.floor(total / size) : total % groups, ctx);
        assert.equal(q.choices.filter((c) => c.value === q.answer).length, 1, ctx);
      } else {
        assert.equal(total % groups, 0, ctx);
        assert.equal(q.answer, total / groups, ctx);
      }
      break;
    }
    case 'column': {
      const { steps } = q.stage;
      assert.ok(steps.length >= 2 && steps.every((s) => Number.isInteger(s.digit) && s.digit >= 0 && s.digit <= 9 && s.label), ctx);
      assert.deepEqual(q.choices, [], ctx);
      break;
    }
    default: {
      const values = q.choices.map((c) => c.value);
      assert.ok(values.length >= 2, ctx);
      assert.equal(new Set(values).size, values.length, `choix en double : ${ctx}`);
      assert.equal(values.filter((v) => v === q.answer).length, 1, `réponse absente : ${ctx}`);
    }
  }
}

test('les identifiants de jeux sont uniques et rangés par matière', () => {
  const ids = GAMES.map((g) => g.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const d of DOMAINS) for (const g of d.games) assert.equal(g.domain, d.id, g.id);
  assert.deepEqual(DOMAINS.map((d) => d.id), ['francais', 'histoires', 'maths', 'jeux', 'temps', 'monde', 'sciences', 'anglais']);
  assert.equal(findGame('calcul').title, 'Calcul');
});

for (const game of GAMES) {
  test(`${game.id} : questions bien formées à tous les niveaux`, () => {
    for (const { level, q } of questions(game)) checkQuestion(q, `${game.id} niveau ${level} ${JSON.stringify(q).slice(0, 400)}`);
  });

  test(`${game.id} : les questions varient`, () => {
    for (let level = 1; level <= game.levels.length; level++) {
      const rng = createRng(99);
      const keys = new Set(Array.from({ length: 60 }, (_, i) => game.generate(level, rng, i).key));
      assert.ok(keys.size >= 3, `${game.id} niveau ${level} : seulement ${keys.size} questions différentes`);
    }
  });
}

test('premier-son : le mot commence par le son, jamais par un distracteur', () => {
  for (const { level, q } of questions(findGame('premier-son'))) {
    if (level > 3) continue; // niveaux 4 à 6 : voir tests/nouveaux-niveaux.test.js
    const word = q.success.reveal;
    assert.ok(word.startsWith(q.answer), word);
    for (const c of q.choices) {
      if (c.value !== q.answer) assert.ok(!word.startsWith(c.value), `${word} / ${c.value}`);
    }
    assert.equal(q.stage.emoji, PICTURES[word]);
  }
});

test('compter : nombre d’objets dans les bornes du niveau, positions sans chevauchement', () => {
  const bounds = { 1: [1, 5], 2: [1, 10], 3: [3, 10], 4: [10, 20], 5: [8, 20], 6: [20, 30] };
  for (const { level, q } of questions(findGame('compter'))) {
    if (!bounds[level]) continue; // niveaux 7 à 9 : voir maths-niveaux.test.js
    const [min, max] = bounds[level];
    assert.equal(q.stage.count, q.answer);
    assert.ok(q.answer >= min && q.answer <= max);
    if (q.stage.type === 'scatter') {
      assert.equal(q.stage.positions.length, q.answer);
      const seen = new Set(q.stage.positions.map((p) => `${p.x},${p.y}`));
      assert.equal(seen.size, q.answer);
      for (const p of q.stage.positions) assert.ok(p.x > 0 && p.x < 100 && p.y > 0 && p.y < 100);
    }
  }
});

test('vite-vu, dizaines : la quantité montrée est la réponse', () => {
  for (const { level, q } of questions(findGame('vite-vu'))) {
    if (level > 4) continue; // calcul flash : voir maths-niveaux.test.js
    const inner = q.stage.inner;
    const shown = inner.type === 'dice' ? inner.value : inner.type === 'frames' ? inner.filled : inner.tens * 10 + inner.units;
    assert.equal(shown, q.answer);
  }
  for (const { q } of questions(findGame('dizaines'))) {
    if (q.stage.type !== 'blocks') continue;
    const { hundreds = 0, tens, units } = q.stage;
    assert.equal(hundreds * 100 + tens * 10 + units, q.answer);
  }
});

test('panier : listes de courses à 2 et 3 fruits, sachets de 10 au niveau 6 seulement', () => {
  const kinds = { 1: 1, 2: 1, 3: 2, 4: 3, 5: 1, 6: 1, 7: 3 };
  for (const { level, q } of questions(findGame('panier'))) {
    if (!kinds[level]) continue; // niveaux 8 à 10 : voir maths-niveaux.test.js
    assert.equal(q.stage.tens, level === 6);
    assert.equal(q.stage.items.length, kinds[level]);
    if (kinds[level] > 1) assert.ok(q.text.includes(' et '), q.text);
  }
  const q = findGame('panier').generate(4, createRng(3));
  assert.match(q.text, /^Mets .+, .+ et .+ dans le panier\.$/);
});

test('calculs à trous : 3 à 5 calculs, deux étiquettes par calcul, résultats dans le niveau', () => {
  const levels = { 1: [3, 5], 2: [4, 10], 3: [5, 10], 4: [5, 20], 5: [4, 50], 6: [4, 100] };
  for (const { level, q } of questions(findGame('trous'))) {
    if (!levels[level]) continue; // niveaux 7 à 9 : voir maths-niveaux.test.js
    const [count, max] = levels[level];
    assert.equal(q.interaction, 'fill');
    assert.equal(q.equations.length, count);
    assert.equal(q.tiles.length, count * 2);
    for (const eq of q.equations) assert.ok(eq.result <= max && Math.max(...eq.solution) <= max && Math.min(...eq.solution) >= 1, JSON.stringify(eq));
    if (level <= 2) assert.ok(q.equations.every((eq) => eq.op === '+'));
  }
});

test('sudoku : grille juste, une seule solution, nombre de cases à trouver du niveau', () => {
  // niveaux 1 à 7 (4 × 4 et 6 × 6) ; le 9 × 9 (niveaux 8 à 10) : voir sudoku-difficile.test.js
  const holes = { 1: 4, 2: 7, 3: 8, 4: 15, 5: 21, 6: 24, 7: 26 };
  for (let level = 1; level <= 7; level++) {
    const rng = createRng(level);
    for (let i = 0; i < 40; i++) {
      const q = findGame('sudoku').generate(level, rng);
      const { size, puzzle, solution, symbols } = q.stage;
      assert.equal(symbols.length, size);
      assert.equal(new Set(symbols).size, size);
      assert.equal(size, level <= 3 ? 4 : 6);
      if (level <= 2) assert.ok(symbols.every((s) => !/^[A-Z0-9]$/.test(s)), 'des images aux niveaux 1 et 2');
      // niveau 5 : des images ou les lettres A à F
      if (level === 5 && /^[A-F]$/.test(symbols[0])) assert.deepEqual(symbols, ['A', 'B', 'C', 'D', 'E', 'F']);
      if (level === 5 && !/^[A-F]$/.test(symbols[0])) assert.ok(symbols.every((s) => !/^[A-Z0-9]$/.test(s)), 'des images');
      if (level === 3 || level === 4 || level >= 6) assert.deepEqual(symbols, Array.from({ length: size }, (_, i) => String(i + 1)));
      // les grilles les plus dures (niveau 5 et plus) se résolvent sans jamais deviner
      if (level >= 5) assert.ok(solvesBySingles(puzzle, size), q.key);
      assert.equal(puzzle.filter((v) => v === null).length, holes[level]);
      puzzle.forEach((v, k) => { if (v !== null) assert.equal(v, solution[k]); });
      solution.forEach((v, k) => {
        const others = [...solution];
        others[k] = null;
        assert.ok(sudokuAllows(others, size, k, v), `grille fausse en ${k}`);
      });
      assert.equal(countSolutions(puzzle, size), 1);
    }
  }
});

test('relie les calculs : 4 à 8 paires, résultats tous différents et justes', () => {
  const counts = { 1: 4, 2: 6, 3: 8, 4: 6, 5: 8, 6: 6 };
  for (const { level, q } of questions(findGame('relie-calculs'))) {
    if (!counts[level]) continue; // niveaux 7 à 9 : voir maths-niveaux.test.js
    assert.equal(q.pairs.length, counts[level]);
    for (const p of q.pairs) {
      const [a, op, b] = p.left.split(' ');
      assert.equal(p.right, op === '+' ? Number(a) + Number(b) : Number(a) - Number(b), p.left);
    }
  }
});

test('cubes : le dessus de chaque pile est visible (escaliers vers l’enfant), réponse = nombre de cubes', () => {
  for (const { level, q } of questions(findGame('cubes'))) {
    const { heights } = q.stage;
    if (level <= 4) assert.equal(q.answer, heights.flat().reduce((a, b) => a + b, 0));
    if (level >= 3) {
      heights.forEach((row, y) => row.forEach((hgt, x) => {
        if (y > 0) assert.ok(hgt <= heights[y - 1][x], JSON.stringify(heights));
        if (x > 0) assert.ok(hgt <= row[x - 1], JSON.stringify(heights));
      }));
    }
    if (level === 1) assert.ok(heights.flat().every((hgt) => hgt === 1));
  }
});

test('le monde : réponses présentes, phrases sans faute de liaison', () => {
  for (const id of ['animaux-monde', 'saisons', 'pays']) {
    for (const { q } of questions(findGame(id))) {
      assert.ok(!/de le |de les |à le /.test(`${q.text} ${q.success.speak}`), `${q.text} / ${q.success.speak}`);
    }
  }
});

test('monnaie : la somme montrée est la réponse, payer et rendre sont justes', () => {
  assert.deepEqual(makeChange(18, [1, 2, 5, 10]), [10, 5, 2, 1]);
  for (const { level, q } of questions(findGame('monnaie'))) {
    if (level <= 2) assert.equal(q.stage.items.reduce((a, b) => a + b, 0), q.answer);
    if (level === 4) assert.equal(q.stage.paid - q.stage.price, q.answer);
  }
});

test('mesures et calendrier : réponses justes', () => {
  for (const { level, q } of questions(findGame('mesures'))) {
    if (level === 1) assert.equal(q.answer, Math.max(...q.choices.map((c) => c.value)));
    if (level === 2 || level === 3) {
      assert.equal(q.answer, q.stage.length);
      assert.ok(q.stage.start + q.stage.length <= 10, 'le crayon dépasse la règle');
    }
    if (level === 4) assert.equal(q.stage.heavier === 'left' ? q.stage.left : q.stage.right, q.answer);
  }
  const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  for (const { level, q } of questions(findGame('calendrier'))) {
    if (level === 2) assert.equal(q.answer, days[(q.stage.firstWeekday + q.stage.mark - 1) % 7]);
    if (level === 3) assert.ok(q.answer <= q.stage.days);
  }
});

test('les pièces du carré : la bonne pièce a la forme du trou', () => {
  for (const { q } of questions(findGame('tangram'))) {
    assert.equal(q.answer, q.stage.missing.shape);
    assert.ok(PIECES[q.answer]);
    assert.ok(!q.stage.pieces.some((p) => p.cell === q.stage.missing.cell && p.shape === q.stage.missing.shape));
  }
});

test('histoires : 6 niveaux, une bonne réponse parmi 3, histoires courtes', () => {
  for (const level of [1, 2, 3, 4, 5, 6]) assert.ok(STORY_DATA.filter((st) => st.level === level).length >= 4);
  for (const story of STORY_DATA) {
    // niveau 6 : des images à remettre dans l'ordre au lieu d'une question
    if (story.level === 6) assert.equal(new Set(story.steps.map(([emoji]) => emoji)).size, 3, story.title);
    else assert.equal(new Set([story.answer, ...story.others]).size, 3, story.title);
    // niveau 5 : 6 phrases (courtes : l'histoire doit tenir sur l'écran d'un petit téléphone)
    const [min, max] = story.level === 5 ? [6, 6] : [3, 4];
    assert.ok(story.sentences.length >= min && story.sentences.length <= max, story.title);
  }
});

test('anglais parlé : le prénom de l’enfant dans la conversation', () => {
  const game = findGame('parle-anglais');
  const rng = createRng(5);
  for (let i = 0; i < 100; i++) {
    const q = game.generate(2, rng, i, { name: 'Zoé' });
    if (q.answer.startsWith('My name')) assert.equal(q.answer, 'My name is Zoé.');
  }
});

test('décors de saison selon la date', () => {
  assert.equal(seasonOf(new Date(2026, 11, 20)).id, 'noel');
  assert.equal(seasonOf(new Date(2026, 9, 31)).id, 'halloween');
  assert.equal(seasonOf(new Date(2026, 3, 10)).id, 'printemps');
  assert.equal(seasonOf(new Date(2026, 6, 14)).id, 'ete');
  assert.equal(seasonOf(new Date(2026, 9, 3)).id, 'automne');
  assert.equal(seasonOf(new Date(2026, 0, 15)).id, 'hiver');
});

test('patates : paquets de 2, 3, 4, 5 ou 10, la réponse est le nombre d’objets', () => {
  const groups = { 1: 2, 2: 5, 3: 10, 4: 10, 5: 10, 6: 3, 7: 4, 8: 5 };
  for (const { level, q } of questions(findGame('patates'))) {
    assert.equal(q.stage.group, groups[level]);
    assert.equal(q.stage.positions.length, q.answer);
  }
});

test('labyrinthe : le chemin solution existe, la taille augmente avec le niveau', () => {
  const game = findGame('labyrinthe');
  let previous = 0;
  for (let level = 1; level <= game.levels.length; level++) {
    const q = game.generate(level, createRng(level));
    // jusqu'au 9 × 9, la taille augmente ; ensuite le labyrinthe change de forme (9 × 9 au plus)
    if (level <= 6) assert.ok(q.stage.cols * q.stage.rows > previous);
    else assert.ok(q.stage.cols <= 9 && q.stage.rows <= 9);
    previous = q.stage.cols * q.stage.rows;
    assert.ok(q.stage.solution.length >= q.stage.cols, 'chemin trop court');
  }
});

test('chemins : suites de nombres et mots épelés', () => {
  // niveau 10 : de 1 en 1 (de 95 à 110) ou de 100 en 100
  const steps = { 1: [1], 2: [1], 3: [1], 4: [1], 5: [2], 6: [5], 7: [10], 8: [-1], 9: [3], 10: [1, 100] };
  for (const { level, q } of questions(findGame('chemin-nombres'))) {
    const { seq } = q.stage;
    assert.ok(steps[level].includes(seq[1] - seq[0]), q.key);
    for (let i = 1; i < seq.length; i++) assert.equal(seq[i] - seq[i - 1], seq[1] - seq[0]);
  }
  for (const { level, q } of questions(findGame('chemin-lettres'))) {
    if (level === 3 || level === 4) assert.equal(q.stage.seq.join(''), q.answer);
  }
});

test('ranger : ordre croissant, sauf le niveau 7 (décroissant)', () => {
  for (const { level, q } of questions(findGame('ranger'))) {
    assert.equal(q.order, level === 7 ? 'desc' : 'asc');
    if (level >= 6 && level < 7) for (const item of q.items) assert.ok(item.value >= 100 && item.value <= 999);
  }
});

test('petits problèmes : le prénom de l’enfant, des nombres justes', () => {
  const game = findGame('problemes');
  for (let level = 1; level <= 7; level++) {
    const rng = createRng(level);
    for (let i = 0; i < 100; i++) {
      const q = game.generate(level, rng, i, { name: 'Matteo' });
      assert.ok(q.instruction.includes('Matteo'), q.instruction);
      assert.ok(Number.isInteger(q.answer) && q.answer >= 1, q.instruction);
      const numbers = q.stage.text.match(/\d+/g)?.map(Number) || [];
      const one = /\b(un|une) /.test(q.stage.text.split('.')[0]) ? 1 : null;
      const [a, b, c] = one ? [1, ...numbers] : numbers;
      const expected = level === 7 ? a + b - c : q.text.includes('reste') ? a - b : a + b;
      assert.equal(q.answer, expected, q.instruction);
      assert.ok(!/\b1 [a-zé]+s\b/.test(q.instruction), `pluriel après 1 : ${q.instruction}`);
      assert.ok(!/de [aeioué]/.test(q.text), `élision oubliée : ${q.text}`);
    }
  }
});

test('doubles et heure : réponses justes', () => {
  for (const { level, q } of questions(findGame('doubles'))) {
    if (level === 5) continue; // presque des doubles : test à part
    const n = Number(q.text.match(/\d+/)[0]);
    assert.equal(q.answer, q.text.includes('moitié') ? n / 2 : n * 2, q.text);
    if (level === 3) assert.equal(q.stage.count, n);
  }
  for (const { level, q } of questions(findGame('heure'))) {
    if (level <= 4) assert.equal(q.answer, clockLabel(q.stage.h, q.stage.m));
    assert.ok([[0], [0, 30], [0, 15, 30, 45]][level - 1]?.includes(q.stage.m) ?? q.stage.m % 5 === 0);
  }
});

test('intrus et ombres : une seule bonne réponse, dans le bon sens', () => {
  for (const { level, q } of questions(findGame('ombres'))) {
    if (level === 3) assert.equal(q.choices.find((c) => c.value === q.answer).transform, 'none');
    else if (level <= 4) assert.equal(q.stage.emoji, q.answer);
  }
  for (const { level, q } of questions(findGame('intrus'))) {
    if (level === 3) {
      const shapes = q.choices.map((c) => c.shape);
      const odd = q.choices.find((c) => c.value === q.answer).shape;
      assert.equal(shapes.filter((x) => x === odd).length, 1);
    }
  }
});

test('petits textes : questions variées, réponses distinctes, textes courts', () => {
  for (const level of [1, 2, 3, 4, 5, 6]) assert.ok(TEXT_DATA.filter((t) => t.level === level).length >= 5);
  for (const t of TEXT_DATA) {
    assert.ok(t.text.length <= [0, 80, 140, 220, 220, 220, 220, 220, 220, 220, 220][t.level], `${t.title} trop long (${t.text.length})`);
    for (const [question, ...answers] of t.questions) {
      assert.ok(question.endsWith('?') || question.endsWith('…'), question);
      assert.equal(new Set(answers).size, 3, question);
    }
  }
});

test('anglais : relie, compte, où est, épelle', () => {
  for (const { q } of questions(findGame('epelle-anglais'))) {
    // les lettres pièges (value null, dernier niveau) ne font pas partie du mot
    const letters = q.items.filter((i) => i.value !== null);
    const word = [...letters].sort((a, b) => a.value - b.value).map((i) => i.label).join('');
    assert.equal(word, q.answer);
    assert.notEqual(letters.map((i) => i.label).join(''), q.answer, 'déjà dans l’ordre');
  }
  for (const { level, q } of questions(findGame('compte-anglais'))) {
    if (level <= 2) assert.equal(q.choices.find((c) => c.value === q.answer).objects.count, q.answer);
  }
  for (const { q } of questions(findGame('ou-est'))) assert.ok(q.replay[0].text.includes(q.choices.length === 3 ? '' : 'the'));
});

test('calcul : 36 paliers, résultats justes et dans le palier', () => {
  assert.equal(CALC_PALIERS.length, 36);
  const game = findGame('calcul');
  CALC_PALIERS.forEach(({ op, max }, index) => {
    const rng = createRng(index);
    for (let i = 0; i < 300; i++) {
      const q = game.generate(index + 1, rng, 0);
      const { a, b } = q.stage;
      assert.ok(op === '±' ? ['+', '−'].includes(q.stage.op) : q.stage.op === op);
      assert.equal(q.answer, q.stage.op === '+' ? a + b : a - b);
      assert.ok(q.answer >= 0 && a >= 0 && b >= 1, JSON.stringify(q.stage));
      assert.ok(Math.max(a, q.answer) <= max, `${op}${max} : ${a} ${q.stage.op} ${b}`);
      assert.equal(Boolean(q.stage.emoji), max <= 10);
    }
  });
  assert.deepEqual(CALC_FORMATS.map((_, i) => game.generate(5, createRng(1), i).interaction), CALC_FORMATS);
});

test('comparer : jamais deux valeurs égales, la bonne réponse est la bonne', () => {
  for (const { level, q } of questions(findGame('comparer'))) {
    if (level === 1) {
      const [g, d] = q.choices.map((c) => c.objects.count);
      assert.notEqual(g, d);
      assert.equal(q.answer, g > d ? 'gauche' : 'droite');
    } else if (level <= 4) { // niveaux 5 à 7 : voir maths-niveaux.test.js
      const [a, b] = q.choices.map((c) => c.value);
      assert.notEqual(a, b);
      const expected = q.text.includes('grand') ? Math.max(a, b) : Math.min(a, b);
      assert.equal(q.answer, expected);
      if (level === 3) assert.ok(a >= 10 && a <= 99 && b >= 10 && b <= 99);
      if (level === 4) assert.ok(a >= 100 && a <= 999 && b >= 100 && b <= 999, `${a} ${b}`);
    }
  }
});

test('suite : le trou correspond à la réponse', () => {
  for (const { level, q } of questions(findGame('suite'))) {
    const items = q.stage.items;
    const gap = items.indexOf(null);
    assert.ok(gap >= 0);
    const known = items.map((n, i) => [n, i]).filter(([n]) => n !== null);
    const step = (known[1][0] - known[0][0]) / (known[1][1] - known[0][1]);
    const start = known[0][0] - known[0][1] * step;
    assert.equal(q.answer, start + gap * step);
    assert.ok(Math.max(...known.map(([n]) => n), q.answer) <= (level === 5 || level === 8 ? 1000 : 100));
  }
});

test('faire-dix et tables : résultats justes', () => {
  for (const { level, q } of questions(findGame('faire-dix'))) {
    if (level > 3) continue; // niveaux 4 à 6 : voir maths-niveaux.test.js
    const total = level === 1 ? 5 : 10;
    const filled = q.stage.type === 'frame' ? q.stage.filled : q.stage.parts[0];
    assert.equal(filled + q.answer, total);
  }
  for (const { level, q } of questions(findGame('tables'))) if (level <= 6) assert.equal(q.answer, q.stage.a * q.stage.b);
});

test('algorithmes : la réponse continue bien le motif', () => {
  for (const { level, q } of questions(findGame('algorithmes'))) {
    if (level >= 5) continue; // trou au milieu, aller-retour, suites qui grandissent : test à part
    const items = q.stage.items.slice(0, -1);
    const period = [1, 2, 3, 4].find((p) => items.every((x, i) => i < p || x === items[i - p]));
    assert.ok(period, q.key);
    assert.equal(q.answer, items[items.length - period]);
  }
});

test('données lecture : chaque mot a une image, images uniques', () => {
  const words = [...Object.values(READING_WORDS).flat(), ...FIRST_SOUNDS.flatMap((s) => s.words)];
  for (const w of words) assert.ok(PICTURES[w], `pas d'image pour ${w}`);
  const emojis = Object.values(PICTURES);
  assert.equal(new Set(emojis).size, emojis.length, 'une image utilisée pour deux mots');
  const reading = Object.values(READING_WORDS).flat();
  assert.equal(new Set(reading).size, reading.length, 'mot en double');
});

test('données lecture : mots-outils et syllabes cohérents', () => {
  const sight = SIGHT_WORDS.map((w) => w.word);
  assert.equal(new Set(sight).size, sight.length);
  for (const level of [1, 2, 3]) {
    assert.ok(SIGHT_WORDS.filter((w) => w.level === level).length >= 4);
    assert.ok(SYLLABLE_LEVELS[level].consonants.length >= 3);
  }
});

test('données anglais : chaque mot a une image, au moins 4 mots par thème', () => {
  for (const theme of ENGLISH_THEMES) {
    assert.ok(theme.words.length >= 4, theme.title);
    for (const w of theme.words) assert.ok(w.en && w.fr && (w.emoji || w.swatch || w.label), JSON.stringify(w));
    assert.equal(new Set(theme.words.map((w) => w.en)).size, theme.words.length);
  }
  for (const id of ['rimes', 'syllabes-rythme']) {
    for (const { q } of questions(findGame(id))) {
      assert.ok(q.stage.emoji, `${id} : pas d'image pour ${q.key}`);
      for (const c of q.choices) assert.ok(c.label, `${id} : choix sans image`);
    }
  }
});

test('dictée : les lettres à placer forment le mot, les pièges n’en font pas partie', () => {
  const game = findGame('dictee');
  for (let level = 1; level <= game.levels.length; level++) {
    const rng = createRng(level * 7);
    for (let i = 0; i < 40; i++) {
      const q = game.generate(level, rng, i);
      const word = q.items.filter((it) => it.value !== null).sort((a, b) => a.value - b.value).map((it) => it.label).join('');
      assert.equal(word, q.answer);
      assert.ok(q.byLabel, 'deux lettres identiques sont interchangeables');
      const traps = q.items.filter((it) => it.value === null);
      for (const t of traps) assert.ok(!q.answer.includes(t.label), `piège ${t.label} dans ${q.answer}`);
      if (level === 6) assert.ok(traps.length >= 1, `niveau 6 sans piège : ${q.answer}`);
      if (level <= 4) assert.equal(q.stage.type, 'picture');
      else assert.equal(q.stage.type, 'listen');
    }
  }
});

// ---------------------------------------------------------------- Écris au doigt

const allStrokes = () => Object.entries(GLYPHS).flatMap(([set, glyphs]) =>
  Object.entries(glyphs).flatMap(([name, g]) => (g.strokes || g).map((st, i) => ({ label: `${set} ${name} trait ${i + 1}`, st }))));

test('écriture : tous les chiffres et toutes les capitales, points réguliers dans le carré', () => {
  assert.deepEqual(Object.keys(CHIFFRES), ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
  assert.deepEqual(Object.keys(CAPITALES), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''));
  for (const l of 'leiutcoadmnsrp') assert.ok(CURSIVE[l], `minuscule attachée absente : ${l}`);
  for (const id of ['verticaux', 'horizontaux', 'obliques', 'vagues', 'ponts', 'boucles', 'rond']) assert.ok(GRAPHISMES[id], id);
  for (const { label, st } of allStrokes()) {
    assert.ok(st.length >= 2, label);
    for (const [x, y] of st) assert.ok(x >= 0 && x <= 100 && y >= 0 && y <= 100, `${label} : [${x}, ${y}] hors du carré`);
    for (let i = 1; i < st.length; i++) {
      const d = Math.hypot(st[i][0] - st[i - 1][0], st[i][1] - st[i - 1][1]);
      assert.ok(d <= 6.5, `${label} : points trop espacés (${d.toFixed(1)})`);
    }
  }
});

test('écriture : traits verticaux de haut en bas, horizontaux de gauche à droite', () => {
  let verticals = 0;
  let horizontals = 0;
  for (const { label, st } of allStrokes()) {
    const xs = st.map((p) => p[0]);
    const ys = st.map((p) => p[1]);
    const [first, last] = [st[0], st.at(-1)];
    if (Math.max(...xs) - Math.min(...xs) < 1 && Math.max(...ys) - Math.min(...ys) > 10) {
      verticals++;
      assert.ok(last[1] > first[1], `${label} : un trait vertical se trace de haut en bas`);
    }
    if (Math.max(...ys) - Math.min(...ys) < 1 && Math.max(...xs) - Math.min(...xs) > 10) {
      horizontals++;
      assert.ok(last[0] > first[0], `${label} : un trait horizontal se trace de gauche à droite`);
    }
  }
  assert.ok(verticals >= 15 && horizontals >= 10, `${verticals} verticaux, ${horizontals} horizontaux`);
});

test('écriture : les ronds commencent en haut et tournent vers la gauche', () => {
  const rounds = {
    'O': CAPITALES.O[0], 'Q': CAPITALES.Q[0], 'C': CAPITALES.C[0], 'G': CAPITALES.G[0], 'S (haut)': CAPITALES.S[0].slice(0, 20),
    '0': CHIFFRES[0][0], '6': CHIFFRES[6][0], '9': CHIFFRES[9][0], 'rond': GRAPHISMES.rond.strokes[0],
    'o': CURSIVE.o[0], 'a': CURSIVE.a[0], 'c': CURSIVE.c[0], 'd': CURSIVE.d[0], 'q': CURSIVE.q[0],
  };
  // y vers le bas : une aire signée négative = sens inverse des aiguilles d'une montre
  for (const [name, st] of Object.entries(rounds)) assert.ok(signedArea(st) < 0, `${name} tourne dans le mauvais sens`);
  // le rond du O, du 0 et du graphisme part du haut, vers la gauche
  for (const st of [CAPITALES.O[0], CHIFFRES[0][0], GRAPHISMES.rond.strokes[0]]) {
    assert.ok(st[0][1] <= Math.min(...st.map((p) => p[1])) + 0.5, 'le rond commence en haut');
    assert.ok(st[1][0] < st[0][0], 'le rond part vers la gauche');
  }
  // les boucles du l et du e tournent aussi vers la gauche ; celle du bas du g, du j et du y vers la droite
  for (const l of ['l', 'e']) assert.ok(signedArea(CURSIVE[l][0]) < 0, l);
});

test('écriture : la cursive part de la ligne d’écriture, avec un trait d’attaque qui monte vers la droite', () => {
  for (const [letter, strokes] of Object.entries(CURSIVE)) {
    const [start, next] = strokes[0];
    const lines = WRITING_LINES[letter];
    assert.ok(lines && lines.x < lines.base, letter);
    assert.ok(Math.abs(start[1] - lines.base) <= 4, `${letter} : départ loin de la ligne (${start})`);
    assert.ok(next[1] < start[1], `${letter} : le trait d’attaque monte`);
    // tout le glyphe tient dans le carré, entre le haut des boucles et le bas des jambages
    for (const st of strokes) for (const [, y] of st) assert.ok(y >= 4 && y <= 97, `${letter} : ${y}`);
  }
});

test('écriture : les lettres du prénom, en capitales et sans accent', () => {
  assert.equal(nameLetters('Éva-Rose'), 'EVAROSE');
  assert.equal(capitalName('Éva-Rose'), 'EVA-ROSE');
  assert.equal(nameLetters('Zoë'), 'ZOE');
  assert.equal(nameLetters('Maël Noël'), 'MAELNOEL');
  assert.equal(nameLetters('Françoise'), 'FRANCOISE');
  assert.equal(nameLetters('Chloé'), 'CHLOE');
  assert.equal(nameLetters('123'), '');
  const game = findGame('ecrire');
  assert.ok(game.levels.every((label) => label.length <= 26));
  const rng = createRng(7);
  const letters = Array.from({ length: 9 }, (_, i) => game.generate(5, rng, i, { name: 'Éva-Rose' }));
  assert.deepEqual(letters.map((q) => q.answer).join(''), 'EVAROSEEV');
  assert.equal(letters[0].text, 'Écris le E de EVA-ROSE.');
  assert.equal(letters[3].text, 'Écris le R de EVA-ROSE.');
  // la lettre à écrire est repérée dans le prénom (le R est après le tiret)
  assert.equal(letters[3].stage.word, 'EVA-ROSE');
  assert.equal(letters[3].stage.position, 4);
  for (const q of letters) {
    assert.deepEqual(q.stage.strokes, CAPITALES[q.answer]);
    assert.equal(q.stage.word[q.stage.position], q.answer);
  }
  assert.equal(new Set(letters.map((q) => q.key)).size, 7, 'les deux E du prénom sont deux questions différentes');
  // pas de lettre dans le prénom : des capitales au hasard
  for (const name of ['', '123', undefined]) {
    const q = game.generate(5, createRng(3), 0, { name });
    assert.ok(CAPITALES[q.answer], q.key);
  }
  assert.ok(CAPITALES[game.generate(5, createRng(3), 0).answer], 'sans contexte');
});

test('écriture : la consigne parle à l’enfant', () => {
  const game = findGame('ecrire');
  const rng = createRng(11);
  for (let level = 1; level <= 5; level++) {
    for (let i = 0; i < 30; i++) {
      const q = game.generate(level, rng, i, { name: 'Léo' });
      const said = [q.instruction].flat().map((p) => (typeof p === 'string' ? p : p.text)).join(' ');
      assert.ok(said.includes('en partant du point vert'), said);
      if (level === 2) assert.match(q.text, /^Écris le chiffre \d\.$/);
      if (level === 4) assert.deepEqual(q.stage.lines, WRITING_LINES[q.answer]);
      if (level !== 4) assert.equal(q.stage.lines, null);
      if (level === 5) assert.match(q.text, /^Écris le [LEO] de LEO\.$/);
    }
  }
});
