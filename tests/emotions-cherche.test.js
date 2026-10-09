import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emotions, FACES, SITUATIONS, NUANCES } from '../app/js/games/emotions.js';
import { chercheTrouve } from '../app/js/games/cherche.js';
import { findGame } from '../app/js/games/index.js';
import { createRng } from '../app/js/random.js';

const questions = (game, level, n = 40) =>
  Array.from({ length: n }, (_, s) => game.generate(level, createRng(s * 7919 + level), s, { name: 'Léa' }));

test('émotions et cherche et trouve : rangés dans leur rubrique, 10 niveaux', () => {
  assert.equal(findGame('emotions').domain, 'monde');
  assert.equal(findGame('cherche-trouve').domain, 'jeux');
  assert.equal(emotions.levels.length, 10);
  assert.equal(chercheTrouve.levels.length, 10);
});

test('émotions : une seule bonne réponse, présente parmi les choix, à chaque niveau', () => {
  for (let level = 1; level <= 10; level++) {
    for (const q of questions(emotions, level)) {
      const values = q.choices.map((c) => c.value);
      assert.equal(new Set(values).size, values.length, `${level} : ${values}`);
      assert.ok(values.includes(q.answer), `${level} : ${q.answer} absent de ${values}`);
      assert.ok(q.text && q.instruction, `${level} : consigne`);
    }
  }
});

test('émotions : les visages ont un nom (lecteurs d’écran), les situations une émotion connue', () => {
  for (const level of [1, 2, 4]) {
    for (const q of questions(emotions, level)) for (const c of q.choices) assert.ok(c.name, `${level} : ${c.label}`);
  }
  for (const s of SITUATIONS) for (const e of [s.answer, ...s.wrong]) assert.ok(FACES[e], `${s.who} : ${e}`);
  for (const n of NUANCES) assert.ok(!n.wrong.includes(n.answer), n.who);
});

test('cherche et trouve : une seule cible, toujours dans la carte, jamais en double', () => {
  for (let level = 1; level <= 10; level++) {
    for (const q of questions(chercheTrouve, level)) {
      const targets = q.choices.filter((c) => c.value === q.answer);
      assert.equal(targets.length, 1, `${level} : une seule cible`);
      const [target] = targets;
      // la cible ne se retrouve pas ailleurs sur la carte
      assert.ok(!q.choices.some((c) => c !== target && c.label === target.label), `${level} : ${target.label} en double`);
      const values = q.choices.map((c) => c.value);
      assert.equal(new Set(values).size, values.length);
      for (const { place, name } of q.choices) {
        assert.ok(name, `${level} : nom`);
        assert.ok(place.x > 0 && place.x < 100 && place.y > 0 && place.y < 100, `${level} : ${JSON.stringify(place)}`);
      }
      // une image par case de la grille : jamais deux images au même endroit
      const cells = q.choices.map(({ place }) => `${Math.floor((place.x / 100) * q.seek.cols)},${Math.floor((place.y / 100) * q.seek.rows)}`);
      assert.equal(new Set(cells).size, cells.length, `${level} : deux images dans la même case`);
    }
  }
});

test('cherche et trouve : de plus en plus d’images au fil des niveaux', () => {
  const count = (level) => questions(chercheTrouve, level, 1)[0].choices.length;
  assert.ok(count(1) < count(3) && count(3) < count(6) && count(6) < count(10));
});
