import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAMES, DOMAINS, findGame } from '../app/js/games/index.js';
import { CALC_PALIERS, CALC_FORMATS, equationHolds } from '../app/js/games/maths.js';
import { areNeighbours, canMove } from '../app/js/games/labyrinthes.js';
import { clockLabel, countSolutions, sudokuAllows } from '../app/js/games/maths-extra.js';
import { TEXT_DATA } from '../app/js/games/textes.js';
import { createRng } from '../app/js/random.js';
import {
  FIRST_SOUNDS, PICTURES, READING_WORDS, SIGHT_WORDS, SYLLABLE_LEVELS,
} from '../app/js/data/lecture-data.js';
import { ENGLISH_THEMES } from '../app/js/data/anglais-data.js';

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
      const values = q.items.map((i) => i.value);
      assert.ok(values.length >= 3, ctx);
      assert.equal(new Set(values).size, values.length, ctx);
      assert.ok(['asc', 'desc'].includes(q.order), ctx);
      break;
    }
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
  assert.deepEqual(DOMAINS.map((d) => d.id), ['francais', 'maths', 'anglais']);
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
  for (const { q } of questions(findGame('premier-son'))) {
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
  for (const { q } of questions(findGame('vite-vu'))) {
    const inner = q.stage.inner;
    const shown = inner.type === 'dice' ? inner.value : inner.type === 'frames' ? inner.filled : inner.tens * 10 + inner.units;
    assert.equal(shown, q.answer);
  }
  for (const { q } of questions(findGame('dizaines'))) {
    const { hundreds = 0, tens, units } = q.stage;
    assert.equal(hundreds * 100 + tens * 10 + units, q.answer);
  }
});

test('panier : listes de courses à 2 et 3 fruits, sachets de 10 au niveau 6 seulement', () => {
  const kinds = { 1: 1, 2: 1, 3: 2, 4: 3, 5: 1, 6: 1, 7: 3 };
  for (const { level, q } of questions(findGame('panier'))) {
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
    const [count, max] = levels[level];
    assert.equal(q.interaction, 'fill');
    assert.equal(q.equations.length, count);
    assert.equal(q.tiles.length, count * 2);
    for (const eq of q.equations) assert.ok(eq.result <= max && Math.max(...eq.solution) <= max && Math.min(...eq.solution) >= 1, JSON.stringify(eq));
    if (level <= 2) assert.ok(q.equations.every((eq) => eq.op === '+'));
  }
});

test('sudoku : grille juste, une seule solution, nombre de cases à trouver du niveau', () => {
  const holes = { 1: 4, 2: 7, 3: 6, 4: 10, 5: 12, 6: 18 };
  for (let level = 1; level <= 6; level++) {
    const rng = createRng(level);
    for (let i = 0; i < 40; i++) {
      const q = findGame('sudoku').generate(level, rng);
      const { size, puzzle, solution, symbols } = q.stage;
      assert.equal(symbols.length, size);
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
    assert.equal(q.pairs.length, counts[level]);
    for (const p of q.pairs) {
      const [a, op, b] = p.left.split(' ');
      assert.equal(p.right, op === '+' ? Number(a) + Number(b) : Number(a) - Number(b), p.left);
    }
  }
});

test('patates : paquets de 2, 5 ou 10, la réponse est le nombre d’objets', () => {
  const groups = { 1: 2, 2: 5, 3: 10, 4: 10, 5: 10 };
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
    assert.ok(q.stage.cols * q.stage.rows > previous);
    previous = q.stage.cols * q.stage.rows;
    assert.ok(q.stage.solution.length >= q.stage.cols, 'chemin trop court');
  }
});

test('chemins : suites de nombres et mots épelés', () => {
  const steps = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 2, 6: 5, 7: 10, 8: -1 };
  for (const { level, q } of questions(findGame('chemin-nombres'))) {
    const { seq } = q.stage;
    for (let i = 1; i < seq.length; i++) assert.equal(seq[i] - seq[i - 1], steps[level]);
  }
  for (const { level, q } of questions(findGame('chemin-lettres'))) {
    if (level >= 3) assert.equal(q.stage.seq.join(''), q.answer);
  }
});

test('ranger : ordre croissant, sauf le dernier niveau (décroissant)', () => {
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
    const n = Number(q.text.match(/\d+/)[0]);
    assert.equal(q.answer, q.text.includes('moitié') ? n / 2 : n * 2, q.text);
    if (level === 3) assert.equal(q.stage.count, n);
  }
  for (const { level, q } of questions(findGame('heure'))) {
    assert.equal(q.answer, clockLabel(q.stage.h, q.stage.m));
    assert.ok([[0], [0, 30], [0, 15, 30, 45]][level - 1]?.includes(q.stage.m) ?? q.stage.m % 5 === 0);
  }
});

test('intrus et ombres : une seule bonne réponse, dans le bon sens', () => {
  for (const { level, q } of questions(findGame('ombres'))) {
    if (level === 3) assert.equal(q.choices.find((c) => c.value === q.answer).transform, 'none');
    else assert.equal(q.stage.emoji, q.answer);
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
  for (const level of [1, 2, 3]) assert.ok(TEXT_DATA.filter((t) => t.level === level).length >= 5);
  for (const t of TEXT_DATA) {
    assert.ok(t.text.length <= [0, 80, 140, 220][t.level], `${t.title} trop long (${t.text.length})`);
    for (const [question, ...answers] of t.questions) {
      assert.ok(question.endsWith('?') || question.endsWith('…'), question);
      assert.equal(new Set(answers).size, 3, question);
    }
  }
});

test('anglais : relie, compte, où est, épelle', () => {
  for (const { q } of questions(findGame('epelle-anglais'))) {
    const word = [...q.items].sort((a, b) => a.value - b.value).map((i) => i.label).join('');
    assert.equal(word, q.answer);
    assert.notEqual(q.items.map((i) => i.label).join(''), q.answer, 'déjà dans l’ordre');
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
    } else {
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
    assert.ok(Math.max(...known.map(([n]) => n), q.answer) <= (level === 5 ? 1000 : 100));
  }
});

test('faire-dix et tables : résultats justes', () => {
  for (const { level, q } of questions(findGame('faire-dix'))) {
    const total = level === 1 ? 5 : 10;
    const filled = q.stage.type === 'frame' ? q.stage.filled : q.stage.parts[0];
    assert.equal(filled + q.answer, total);
  }
  for (const { q } of questions(findGame('tables'))) assert.equal(q.answer, q.stage.a * q.stage.b);
});

test('algorithmes : la réponse continue bien le motif', () => {
  for (const { q } of questions(findGame('algorithmes'))) {
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
