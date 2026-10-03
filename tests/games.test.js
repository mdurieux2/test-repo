import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAMES, DOMAINS, findGame } from '../app/js/games/index.js';
import { CALC_PALIERS, CALC_FORMATS, equationHolds } from '../app/js/games/maths.js';
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
  switch (q.interaction) {
    case 'keypad':
      assert.ok(Number.isInteger(q.answer) && q.answer >= 0, ctx);
      assert.ok(String(q.answer).length <= q.maxDigits, ctx);
      break;
    case 'match': {
      assert.ok(q.pairs.length >= 3, ctx);
      const answers = q.pairs.map((p) => p.right);
      assert.equal(new Set(answers).size, answers.length, `résultats en double : ${ctx}`);
      assert.deepEqual([...q.rights].sort((a, b) => a - b), [...answers].sort((a, b) => a - b), ctx);
      break;
    }
    case 'fill':
      assert.ok(q.equations.length >= 2, ctx);
      for (const eq of q.equations) assert.ok(equationHolds(eq, ...eq.solution), ctx);
      assert.deepEqual([...q.tiles].sort((a, b) => a - b), q.equations.flatMap((e) => e.solution).sort((a, b) => a - b), ctx);
      break;
    case 'build':
      assert.equal(q.answer, q.stage.target, ctx);
      assert.ok(q.stage.max >= q.stage.target, ctx);
      break;
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

test('panier : sachets de 10 seulement au dernier niveau', () => {
  for (const { level, q } of questions(findGame('panier'))) assert.equal(q.stage.tens, level === 4);
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
