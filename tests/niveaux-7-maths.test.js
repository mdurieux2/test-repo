// Lot « maths » : les niveaux ajoutés pour que chaque jeu ait de 7 à 10 niveaux
// (faire-dix, relier, formes, intrus, ombres, défi chrono des tables, règle l'horloge).
// Pour chaque nouveau niveau, 150 questions : réponse présente une fois, pas de choix en double,
// réponse juste (recalculée), libellés courts.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findGame } from '../app/js/games/index.js';
import { clockLabel, productWritings, SHAPE_OBJECTS, SHAPE_RIDDLES_2, SHADOW_LOOKALIKES } from '../app/js/games/maths-extra.js';
import { fromClockMinutes, minusLabel, shiftClock, toClockMinutes } from '../app/js/games/horloge.js';
import { createRng } from '../app/js/random.js';

// Nombre de niveaux avant ce lot : les niveaux suivants sont les nouveaux.
const BEFORE = {
  'faire-dix': 6, relier: 6, formes: 6, intrus: 6, ombres: 6, 'tables-chrono': 6, 'regle-horloge': 6,
};
const RUNS = 150;

/** 150 questions tirées à ce niveau, avec le prénom de l'enfant. */
function* draws(id, level, runs = RUNS) {
  const rng = createRng(2024 + level);
  for (let i = 0; i < runs; i++) yield findGame(id).generate(level, rng, i, { name: 'Zoé' });
}

const newLevels = (id) => Array.from({ length: findGame(id).levels.length - BEFORE[id] }, (_, i) => BEFORE[id] + 1 + i);
const values = (q) => q.choices.map((c) => c.value);

/** « 30 + 40 », « 90 − 20 », « 3 × 4 », « 4 + 4 + 4 » → le résultat. */
function evaluate(label) {
  const parts = label.split(' ');
  let result = Number(parts[0]);
  for (let i = 1; i < parts.length; i += 2) {
    const n = Number(parts[i + 1]);
    result = parts[i] === '+' ? result + n : parts[i] === '×' ? result * n : result - n;
  }
  return result;
}

/** Choix multiple : la réponse une seule fois, pas de doublon. */
function checkChoices(q, ctx) {
  const v = values(q);
  assert.ok(v.length >= 2, ctx);
  assert.equal(new Set(v).size, v.length, `choix en double : ${ctx}`);
  assert.equal(v.filter((x) => x === q.answer).length, 1, `réponse absente ou en double : ${ctx}`);
}

test('de 7 à 10 niveaux par jeu, nouveaux niveaux à la fin, libellés courts et uniques', () => {
  for (const [id, before] of Object.entries(BEFORE)) {
    const game = findGame(id);
    assert.ok(game.levels.length >= 7 && game.levels.length <= 10, `${id} : ${game.levels.length} niveaux`);
    assert.ok(game.levels.length > before, id);
    for (const label of game.levels.slice(before)) assert.ok([...label].length <= 26, `${id} : « ${label} » trop long`);
    assert.equal(new Set(game.levels).size, game.levels.length, `${id} : libellé en double`);
  }
  assert.equal(findGame('calcul').levels.length, 36, 'le calcul garde ses 36 paliers');
});

test('faire-dix : compléter à la centaine, puis n’importe quel nombre à 100', () => {
  for (const level of newLevels('faire-dix')) {
    for (const q of draws('faire-dix', level)) {
      checkChoices(q, q.key);
      const [n, plus, gap, equals, total] = q.stage.parts;
      assert.deepEqual([plus, gap, equals], ['+', null, '='], q.key);
      assert.equal(n + q.answer, total, q.key);
      assert.ok(values(q).every((v) => v > 0 && n + v !== total || v === q.answer), q.key);
      if (level === 7) {
        assert.ok(n > 100 && n < 1000 && n % 10 === 0 && n % 100 !== 0, q.key);
        assert.equal(total, Math.ceil(n / 100) * 100, q.key);
        assert.ok(values(q).every((v) => v % 10 === 0 && v >= 10 && v <= 90), q.key);
      } else {
        assert.equal(total, 100, q.key);
        assert.ok(n % 5 !== 0 && n > 10 && n < 90, q.key);
      }
    }
  }
});

test('relier : un de moins, la moitié', () => {
  const rules = { 7: (n) => n - 1, 8: (n) => n / 2 };
  for (const level of newLevels('relier')) {
    for (const q of draws('relier', level)) {
      assert.equal(q.interaction, 'match');
      assert.equal(q.pairs.length, 4, 'pas plus de paires que les niveaux voisins');
      for (const p of q.pairs) {
        assert.equal(Number(p.left), p.objects.count, q.key);
        assert.ok(p.objects.count >= 1 && p.objects.count <= 10, q.key);
        assert.equal(p.right, rules[level](p.objects.count), q.key);
        assert.ok(Number.isInteger(p.right) && p.right >= 1, q.key);
      }
      const rights = q.pairs.map((p) => p.right);
      assert.equal(new Set(rights).size, 4, `résultats en double : ${q.key}`);
      assert.deepEqual([...q.rights].sort((a, b) => a - b), [...rights].sort((a, b) => a - b), q.key);
    }
  }
});

test('formes : les formes autour de moi, devinettes à deux indices', () => {
  for (const q of draws('formes', 7)) {
    checkChoices(q, q.key);
    assert.equal(q.choices.length, 4);
    assert.ok(SHAPE_OBJECTS[q.answer].some((o) => o.emoji === q.stage.emoji), q.key);
    // jamais carré et rectangle ensemble quand l'un des deux est la réponse (une gaufre presque carrée…)
    if (q.answer === 'carré') assert.ok(!values(q).includes('rectangle'), q.key);
    if (q.answer === 'rectangle') assert.ok(!values(q).includes('carré'), q.key);
  }
  const SIDES = { rond: 0, triangle: 3, carré: 4, rectangle: 4, étoile: 10 };
  for (const q of draws('formes', 8)) {
    checkChoices(q, q.key);
    assert.equal(q.choices.length, 4);
    const riddle = SHAPE_RIDDLES_2.find((r) => q.text === `Touche ${r.text}.`);
    assert.ok(riddle, q.text);
    assert.equal(q.answer, riddle.answer);
    assert.ok(values(q).includes(riddle.near), `la forme presque juste manque : ${q.key}`);
    // les indices sur les côtés : une seule forme de la liste convient
    if (riddle.answer === 'triangle') {
      assert.deepEqual(values(q).filter((s) => SIDES[s] > 0 && SIDES[s] < 4), ['triangle'], q.key);
    }
    if (riddle.answer === 'étoile') assert.deepEqual(values(q).filter((s) => SIDES[s] > 4), ['étoile'], q.key);
  }
});

test('intrus : calculs de dizaines, plus et fois mélangés', () => {
  for (const level of newLevels('intrus')) {
    for (const q of draws('intrus', level)) {
      checkChoices(q, q.key);
      assert.equal(q.choices.length, 4);
      const results = values(q).map(evaluate);
      const odd = evaluate(q.answer);
      const others = results.filter((r, i) => values(q)[i] !== q.answer);
      assert.equal(new Set(others).size, 1, `les trois autres n’ont pas le même résultat : ${q.key}`);
      assert.notEqual(odd, others[0], q.key);
      assert.ok(q.success.speak.includes(String(others[0])), q.key);
      for (const label of values(q)) assert.ok(label.length <= 9, `étiquette trop longue : ${label}`);
      if (level === 7) {
        assert.equal(Math.abs(odd - others[0]), 10, `l’intrus fait 10 de plus ou de moins : ${q.key}`);
        for (const label of values(q)) {
          for (const n of label.split(' ').filter((p) => /^\d+$/.test(p))) assert.ok(Number(n) % 10 === 0 && Number(n) <= 100, label);
        }
      } else {
        assert.ok(Math.abs(odd - others[0]) <= 3, q.key);
        for (const label of values(q)) assert.ok(productWritings(evaluate(label)).includes(label), label);
      }
    }
  }
});

test('ombres : ombres tournées, même image et même sens', () => {
  for (const q of draws('ombres', 7)) {
    checkChoices(q, q.key);
    assert.equal(q.choices.length, 4);
    assert.equal(q.answer, q.stage.emoji);
    const transforms = new Set(q.choices.map((c) => c.transform));
    assert.equal(transforms.size, 1, 'toutes les ombres sont tournées pareil');
    assert.notEqual([...transforms][0], 'none', q.key);
    for (const c of q.choices) assert.equal(c.shadow, c.value);
  }
  for (const q of draws('ombres', 8)) {
    checkChoices(q, q.key);
    assert.equal(q.choices.length, 4);
    const good = q.choices.filter((c) => c.shadow === q.stage.emoji && c.transform === 'none');
    assert.equal(good.length, 1, q.key);
    assert.equal(good[0].value, q.answer);
    // une seule image est l'image montrée, et l'image voisine est de la même famille
    const pictures = [...new Set(q.choices.map((c) => c.shadow))];
    assert.equal(pictures.length, 2, q.key);
    assert.ok(SHADOW_LOOKALIKES.some((fam) => pictures.every((p) => fam.includes(p))), q.key);
  }
});

test('défi chrono : fois 10 et fois 100, fois des dizaines (le record de chaque niveau est gardé)', () => {
  const chrono = findGame('tables-chrono');
  assert.deepEqual(chrono.levels.slice(0, 6), [
    'Tables de 2, 5 et 10', 'Tables de 3 et 4', 'Tables de 6 et 7', 'Tables de 8 et 9', 'Toutes les tables', 'Multiplications à trou',
  ], 'les niveaux existants ne changent pas de numéro');
  for (const level of newLevels('tables-chrono')) {
    for (const q of draws('tables-chrono', level)) {
      assert.equal(q.interaction, 'keypad');
      const { a, b } = q.stage;
      assert.equal(a * b, q.answer, q.key);
      assert.ok(String(q.answer).length <= q.maxDigits, q.key);
      if (level === 7) {
        assert.ok([10, 100].includes(a) || [10, 100].includes(b), q.key);
        assert.ok([a, b].some((x) => x >= 2 && x <= 9), q.key);
      } else {
        const tens = [a, b].find((x) => x % 10 === 0 && x >= 20);
        const table = a === tens ? b : a;
        assert.ok(tens <= 90 && [2, 3, 4, 5].includes(table), q.key);
      }
    }
  }
});

test('règle l’horloge : durées de 5 en 5 minutes, « 4 h moins 10 »', () => {
  const seen = new Set();
  for (const q of draws('regle-horloge', 7)) {
    seen.add(q.shift);
    assert.equal(toClockMinutes(q.target), shiftClock(toClockMinutes(q.stage.start), q.shift), q.text);
    assert.ok(Math.abs(q.shift) < 60 && q.shift % 5 === 0, q.text);
    assert.ok(q.text.startsWith(`Il est ${clockLabel(q.stage.start.h, q.stage.start.m)}.`), q.text);
    assert.match(q.text, q.shift > 0 ? /Dans \d+ minutes, quelle heure sera-t-il/ : /Il y a \d+ minutes, quelle heure était-il/);
  }
  for (const shift of [5, 10, 20, 25, 40, -5, -10, -20]) assert.ok(seen.has(shift), `durée ${shift} jamais tirée`);
  for (const q of draws('regle-horloge', 8)) {
    const [, next, before] = q.text.match(/sur (\d+) h moins (\d+)\./);
    assert.ok([5, 10, 20, 25].includes(Number(before)), q.text);
    // « 4 h moins 10 » = 3 h 50
    const expected = fromClockMinutes(toClockMinutes({ h: Number(next), m: 0 }) - Number(before));
    assert.deepEqual(q.target, expected, q.text);
    assert.equal(q.answer, clockLabel(expected.h, expected.m));
    assert.notEqual(toClockMinutes(q.stage.start), toClockMinutes(q.target), q.text);
  }
  assert.deepEqual(minusLabel(3, 50), { text: '4 h moins 10', speech: '4 heures moins 10' });
  assert.deepEqual(minusLabel(12, 40), { text: '1 h moins 20', speech: 'une heure moins 20' });
  assert.deepEqual(minusLabel(11, 55), { text: '12 h moins 5', speech: '12 heures moins 5' });
});
