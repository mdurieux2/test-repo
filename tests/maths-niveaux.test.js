// Les trois niveaux ajoutés à chaque jeu de maths.js : bonnes réponses, pièges, accès par classe.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findGame } from '../app/js/games/index.js';
import { equationHolds } from '../app/js/games/maths.js';
import { PROGRAMS } from '../app/js/programs.js';
import { createRng } from '../app/js/random.js';

const RUNS = 200;

/** Nombre de niveaux de chaque jeu (les trois derniers sont les nouveaux). */
const LEVELS = {
  compter: 9, 'vite-vu': 7, panier: 10, patates: 8, dizaines: 8,
  comparer: 7, suite: 8, trous: 9, 'relie-calculs': 9, 'faire-dix': 6,
};

function* questionsAt(id, level, context = {}) {
  const game = findGame(id);
  const rng = createRng(4321 + level);
  for (let i = 0; i < RUNS; i++) yield game.generate(level, rng, i, context);
}

const values = (q) => q.choices.map((c) => c.value);
const calc = (a, op, b) => (op === '+' ? a + b : op === '×' ? a * b : a - b);
/** « 12 + 5 », « 3 × 4 », « 7 + 3 + 5 » : le résultat. */
function evaluate(label) {
  const parts = label.split(' ');
  let result = Number(parts[0]);
  for (let i = 1; i < parts.length; i += 2) result = calc(result, parts[i], Number(parts[i + 1]));
  return result;
}

test('trois niveaux de plus par jeu, libellés courts, chacun au programme d’une classe', () => {
  for (const [id, count] of Object.entries(LEVELS)) {
    const game = findGame(id);
    assert.ok(game.levels.length >= count, id); // d'autres niveaux ont pu s'ajouter ensuite
    for (const label of game.levels.slice(count - 3, count)) assert.ok(label.length <= 26, `${id} : « ${label} » trop long`);
    const maxReached = Math.max(...Object.values(PROGRAMS).flatMap((domains) => Object.values(domains).flat())
      .filter(([gameId]) => gameId === id).map(([, , max]) => max));
    assert.ok(maxReached >= count, `${id} : le dernier niveau n’est au programme d’aucune classe`);
  }
});

test('compter : trouver la collection, trier puis compter, un de plus / un de moins', () => {
  for (const q of questionsAt('compter', 7)) {
    assert.equal(q.choiceStyle, 'objects');
    for (const c of q.choices) assert.equal(c.objects.count, c.value);
    assert.ok(q.text.includes(String(q.answer)), q.text);
  }
  for (const q of questionsAt('compter', 8)) {
    const counts = {};
    for (const e of q.stage.items) counts[e] = (counts[e] || 0) + 1;
    const kinds = Object.entries(counts);
    assert.equal(kinds.length, 2);
    assert.ok(kinds.some(([, n]) => n === q.answer), q.key);
    assert.ok(values(q).includes(q.stage.items.length), 'piège « tout compter » absent');
    assert.ok(!/ de [aeiouéè]/.test(q.text), `élision oubliée : ${q.text}`);
  }
  for (const q of questionsAt('compter', 9)) {
    const n = q.stage.count;
    assert.equal(q.answer, q.text.includes('ajoute') ? n + 1 : n - 1, q.text);
    assert.ok(values(q).includes(n), 'piège « rien changé » absent');
  }
});

test('vite-vu : calcul flash juste, jamais dit à voix haute', () => {
  for (const [level, max] of [[5, 10], [6, 10], [7, 20]]) {
    for (const q of questionsAt('vite-vu', level)) {
      const { inner } = q.stage;
      assert.equal(q.stage.type, 'flash');
      const [a, op, b, eq, gap] = inner.parts;
      assert.equal(eq, '=');
      assert.equal(gap, null);
      assert.equal(q.answer, calc(a, op, b));
      assert.ok(q.answer >= 0 && q.answer <= max && Math.max(a, b) <= max, inner.parts.join(' '));
      if (level === 5) assert.equal(op, '+');
      assert.ok(!/\d/.test(q.instruction), `le calcul est dit : ${q.instruction}`);
    }
  }
});

test('panier : deux fruits avec sachets, ce qui manque, le double et la moitié', () => {
  for (const q of questionsAt('panier', 8)) {
    const [first, second] = q.stage.items;
    assert.equal(q.stage.items.length, 2);
    assert.ok(q.stage.tens);
    assert.ok(first.target >= 21 && first.target <= 49 && second.target >= 2 && second.target <= 9);
    assert.ok(q.instruction.includes(`Un sachet contient 10 ${first.many}`), q.instruction);
  }
  for (const q of questionsAt('panier', 9)) {
    const [total, have] = q.text.match(/\d+/g).map(Number);
    assert.equal(q.stage.items[0].target, total - have, q.text);
    assert.equal(q.answer, total - have);
  }
  for (const q of questionsAt('panier', 10)) {
    const n = Number(q.text.match(/\d+/)[0]);
    assert.equal(q.answer, q.text.includes('moitié') ? n / 2 : 2 * n, q.text);
    assert.ok(Number.isInteger(q.answer));
  }
});

test('patates : paquets de 3, de 4, de 5, et un distracteur à un paquet près', () => {
  for (const [level, group] of [[6, 3], [7, 4], [8, 5]]) {
    let trap = 0;
    for (const q of questionsAt('patates', level)) {
      assert.equal(q.stage.group, group);
      assert.ok(q.answer >= 2 * group && q.answer <= 40);
      if (values(q).some((v) => Math.abs(v - q.answer) === group)) trap++;
    }
    assert.ok(trap > RUNS * 0.9, `paquets de ${group} : distracteur à ±${group} trop rare`);
  }
});

test('dizaines : plus de 10 barres, la place des chiffres, décomposé dans le désordre', () => {
  for (const q of questionsAt('dizaines', 6)) {
    assert.ok(q.stage.tens >= 10);
    assert.equal(q.answer, q.stage.tens * 10 + q.stage.units);
  }
  const PLACE = { centaines: 0, dizaines: 1, unités: 2 };
  for (const q of questionsAt('dizaines', 7)) {
    const digits = q.stage.text.split('').map(Number);
    const place = q.text.match(/chiffre des (\p{L}+)/u)[1];
    assert.equal(q.answer, digits[PLACE[place]], q.text);
    assert.deepEqual([...values(q)].sort(), [...digits].sort());
  }
  const WORTH = { centaine: 100, dizaine: 10, unité: 1 };
  for (const q of questionsAt('dizaines', 8)) {
    const parts = [...q.stage.text.matchAll(/(\d) (centaine|dizaine|unité)s?/gu)];
    assert.ok(parts.length >= 2, q.stage.text);
    assert.equal(q.answer, parts.reduce((sum, [, n, word]) => sum + Number(n) * WORTH[word], 0), q.stage.text);
    const words = parts.map((p) => p[2]);
    assert.notDeepEqual(words, Object.keys(WORTH).filter((w) => words.includes(w)), `dans l’ordre : ${q.stage.text}`);
    const readOrder = Number(parts.map(([, n]) => n).join(''));
    assert.ok(values(q).includes(readOrder), `piège « dans l’ordre de la phrase » absent : ${q.stage.text}`);
  }
});

test('comparer : les signes, encadrer, comparer des calculs', () => {
  let equal = 0;
  for (const q of questionsAt('comparer', 5)) {
    const [a, gap, b] = q.stage.parts;
    assert.equal(gap, null);
    assert.equal(q.answer, a < b ? '<' : a > b ? '>' : '=');
    if (a === b) equal++;
  }
  assert.ok(equal > 0, 'le signe = ne sort jamais');
  for (const q of questionsAt('comparer', 6)) {
    const n = Number(q.text.match(/\d+/)[0]);
    const unit = q.text.includes('centaines') ? 100 : 10;
    const [low, high] = q.answer.split(' et ').map(Number);
    assert.ok(low < n && n < high && high - low === unit && low % unit === 0, `${n} : ${q.answer}`);
    for (const label of values(q)) assert.ok(label.length <= 10, label);
  }
  for (const q of questionsAt('comparer', 7)) {
    const [x, y] = values(q).map(evaluate);
    assert.notEqual(x, y);
    const best = q.text.includes('grand') ? Math.max(x, y) : Math.min(x, y);
    assert.equal(evaluate(q.answer), best, `${values(q)} : ${q.answer}`);
  }
});

test('suite : à rebours, de 3, 4 ou 5 en 5, le nombre à taper', () => {
  const stepOf = (items) => {
    const known = items.map((n, i) => [n, i]).filter(([n]) => n !== null);
    return (known[1][0] - known[0][0]) / (known[1][1] - known[0][1]);
  };
  for (const q of questionsAt('suite', 6)) assert.ok([-1, -10].includes(stepOf(q.stage.items)), q.key);
  for (const q of questionsAt('suite', 7)) {
    assert.ok([3, 4, 5].includes(stepOf(q.stage.items)), q.key);
    for (const v of values(q)) assert.ok(!q.stage.items.includes(v), `${v} est déjà écrit dans la suite`);
  }
  for (const q of questionsAt('suite', 8)) {
    assert.equal(q.interaction, 'keypad');
    assert.ok(q.stage.items.includes(null) && q.answer >= 0 && q.answer <= 1000);
    assert.ok(String(q.answer).length <= q.maxDigits);
  }
});

test('calculs à trous : dizaines et centaines entières, tables, les trois signes', () => {
  assert.ok(equationHolds({ op: '×', result: 12 }, 3, 4));
  assert.ok(!equationHolds({ op: '×', result: 12 }, 2, 4));
  for (const q of questionsAt('trous', 7)) {
    assert.equal(q.equations.length, 4);
    for (const { solution, result } of q.equations) {
      for (const n of [...solution, result]) assert.ok(n % 10 === 0 && n >= 10 && n <= 900, `${solution} → ${result}`);
    }
  }
  for (const q of questionsAt('trous', 8)) {
    for (const { op, solution } of q.equations) {
      assert.equal(op, '×');
      assert.ok(solution.some((n) => [2, 5, 10].includes(n)) && Math.min(...solution) >= 2, String(solution));
    }
  }
  for (const q of questionsAt('trous', 9)) {
    assert.equal(q.equations.length, 5);
    assert.equal(q.tiles.length, 10);
    const ops = q.equations.map((e) => e.op);
    assert.equal(ops.filter((op) => op === '×').length, 2, ops.join(' '));
    assert.ok(ops.includes('+') && ops.includes('−'), ops.join(' '));
    for (const { result } of q.equations) assert.ok(result >= 1 && result <= 50);
  }
});

test('relie les calculs : additions de trois nombres, tables', () => {
  for (const [level, count] of [[7, 6], [8, 6], [9, 8]]) {
    for (const q of questionsAt('relie-calculs', level)) {
      assert.equal(q.pairs.length, count);
      for (const p of q.pairs) {
        assert.equal(evaluate(p.left), p.right, p.left);
        assert.ok(p.left.length <= 9, `étiquette trop longue : ${p.left}`);
        if (level === 7) assert.equal(p.left.split(' + ').length, 3);
        else assert.ok(p.left.includes(' × '));
      }
    }
  }
});

test('faire 10 : compléments à 20, à la dizaine, à 100', () => {
  for (const q of questionsAt('faire-dix', 4)) {
    assert.equal(q.stage.frames, 2);
    assert.equal(q.stage.filled + q.answer, 20);
  }
  for (const q of questionsAt('faire-dix', 5)) {
    const [n, , gap, , total] = q.stage.parts;
    assert.equal(gap, null);
    assert.ok(total % 10 === 0 && total - n >= 1 && total - n <= 9, q.text);
    assert.equal(q.answer, total - n);
  }
  for (const q of questionsAt('faire-dix', 6)) {
    const [n, , , , total] = q.stage.parts;
    assert.equal(total, 100);
    assert.equal(q.answer, 100 - n);
    assert.equal(n % 5, 0);
  }
});
