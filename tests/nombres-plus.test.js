// La droite numérique et les fractions (app/js/games/nombres-plus.js) : graduations, flèche calée
// sur la bonne graduation, réponses justes et uniques, fractions justes, ce que dit la voix.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findGame, DOMAINS } from '../app/js/games/index.js';
import {
  FRACTIONS, NL, equalParts, fractionSvg, lineValueAt, lineX, numberLineSvg, shadedArea,
} from '../app/js/games/nombres-plus.js';
import { createRng } from '../app/js/random.js';
import { spoken } from '../scripts/voix/phrases.mjs';

const RUNS = 300;
const line = findGame('droite-numerique');
const frac = findGame('fractions');

function* questions(game, level, runs = RUNS) {
  const rng = createRng(777 + level);
  for (let i = 0; i < runs; i++) yield { i, q: game.generate(level, rng, i, { name: 'Zoé' }) };
}

const value = (f) => FRACTIONS[f].n / FRACTIONS[f].d;
const close = (a, b) => Math.abs(a - b) < 1e-9;

test('droite et fractions : rubrique « Nombres et calcul », 10 niveaux, libellés courts', () => {
  const maths = DOMAINS.find((d) => d.id === 'maths');
  for (const game of [line, frac]) {
    assert.ok(maths.games.includes(game), game.id);
    assert.equal(game.section, 'Nombres et calcul');
    assert.ok(game.levels.length >= 7 && game.levels.length <= 10, game.id);
    for (const label of game.levels) assert.ok(label.length <= 26, `« ${label} » trop long`);
  }
});

test('droite et fractions : mêmes questions pour la même graine', () => {
  for (const game of [line, frac]) {
    for (let level = 1; level <= game.levels.length; level++) {
      const a = [...questions(game, level, 20)].map(({ q }) => JSON.stringify(q));
      const b = [...questions(game, level, 20)].map(({ q }) => JSON.stringify(q));
      assert.deepEqual(a, b, `${game.id} niveau ${level}`);
    }
  }
});

// ---------------------------------------------------------------- La droite numérique

test('droite : la flèche se cale sur la graduation la plus proche, sans sortir de la droite', () => {
  const st = { min: 0, max: 20, snap: 1 };
  const unit = (NL.x1 - NL.x0) / 20;
  assert.equal(lineX(st, 0), NL.x0);
  assert.equal(lineX(st, 20), NL.x1);
  assert.equal(lineValueAt(st, lineX(st, 7)), 7);
  assert.equal(lineValueAt(st, lineX(st, 7) + unit * 0.45), 7);
  assert.equal(lineValueAt(st, lineX(st, 7) + unit * 0.55), 8);
  assert.equal(lineValueAt(st, lineX(st, 7) - unit * 0.45), 7);
  assert.equal(lineValueAt(st, -50), 0);
  assert.equal(lineValueAt(st, NL.width + 50), 20);
  // de 10 en 10, sur une droite qui commence à 40
  const st2 = { min: 40, max: 60, snap: 10 };
  assert.equal(lineValueAt(st2, lineX(st2, 47)), 50);
  assert.equal(lineValueAt(st2, lineX(st2, 44)), 40);
});

test('droite : graduations rangées, nombres écrits sur des graduations, assez de place pour un doigt', () => {
  for (let level = 1; level <= 10; level++) {
    for (const { q } of questions(line, level)) {
      const { min, max, ticks, labels, major } = q.stage;
      const ctx = `niveau ${level} : ${q.key}`;
      assert.equal(q.stage.type, 'numberline', ctx);
      assert.ok(min < max, ctx);
      assert.equal(ticks[0], min, ctx);
      assert.equal(ticks.at(-1), max, ctx);
      for (let k = 1; k < ticks.length; k++) assert.ok(ticks[k] > ticks[k - 1], ctx);
      // graduations régulières
      const gaps = new Set(ticks.slice(1).map((t, k) => t - ticks[k]));
      assert.equal(gaps.size, 1, ctx);
      for (const v of [...labels, ...major]) assert.ok(ticks.includes(v), `${v} hors des graduations : ${ctx}`);
      assert.ok(labels.includes(min) && labels.includes(max), `début et fin écrits : ${ctx}`);
      // chaque graduation qu'on peut toucher fait au moins 13 unités (≈ 13 px sur un iPhone SE)
      const width = ((NL.x1 - NL.x0) * q.stage.snap) / (max - min);
      if (!q.tolerance) assert.ok(width >= 13, `graduations trop serrées (${width}) : ${ctx}`);
    }
  }
});

test('droite : lire, la flèche montre une graduation sans nombre écrit, réponse unique', () => {
  for (const level of [1, 3, 4, 6, 7, 9]) {
    let reads = 0;
    for (const { q } of questions(line, level)) {
      if (q.interaction) continue;
      reads++;
      const { mark, ticks, labels } = q.stage;
      const ctx = `niveau ${level} : ${q.key}`;
      assert.equal(q.answer, mark, ctx);
      assert.ok(ticks.includes(mark) && mark > q.stage.min && mark < q.stage.max, ctx);
      const values = q.choices.map((c) => c.value);
      assert.equal(new Set(values).size, values.length, ctx);
      assert.equal(values.filter((v) => v === q.answer).length, 1, ctx);
      assert.ok(values.length === (level === 1 ? 3 : 4), ctx);
      if (q.key.includes(':milieu:')) {
        // le milieu : la flèche est au milieu des deux nombres écrits
        const [a, b] = labels;
        assert.deepEqual(ticks, [a, (a + b) / 2, b], ctx);
        assert.equal(q.answer * 2, a + b, ctx);
        assert.ok(q.text.includes(`de ${a} et ${b}`), ctx);
        for (const v of values) assert.ok(v > a && v < b, ctx);
      } else {
        // les autres choix sont d'autres graduations de la droite, sans nombre écrit si possible
        for (const v of values) assert.ok(ticks.includes(v), `${v} : ${ctx}`);
        if (level > 1) assert.ok(values.every((v) => !labels.includes(v)), `choix déjà écrit sur la droite : ${ctx}`);
        assert.ok(!labels.includes(mark) || level === 1, ctx);
      }
      // le « ? » remplace le nombre de la flèche : il n'est pas écrit sous la droite
      const svg = numberLineSvg(q.stage);
      assert.ok(!new RegExp(`class="nl-label"[^>]*>${mark}<`).test(svg), ctx);
      assert.ok(svg.includes('class="nl-mark"') && svg.includes('class="nl-ask"'), ctx);
    }
    assert.ok(reads > 0, `niveau ${level} : aucune question « lire »`);
  }
});

test('droite : placer, le nombre est sur la droite, la flèche s’y pose exactement', () => {
  for (const level of [2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    for (const { q } of questions(line, level)) {
      if (q.interaction !== 'numberline') continue;
      const st = q.stage;
      const ctx = `niveau ${level} : ${q.key}`;
      assert.equal(q.answer, q.target, ctx);
      assert.ok(q.target >= st.min && q.target <= st.max, ctx);
      // toucher la droite à l'endroit du nombre y pose la flèche
      assert.equal(lineValueAt(st, lineX(st, q.target)), q.target, ctx);
      if (q.tolerance) {
        assert.ok(q.key.includes(':environ:'), ctx);
        assert.equal(q.tolerance, 0.06 * st.max, ctx);
        assert.ok(!st.labels.includes(q.target), ctx);
        assert.deepEqual(st.ticks, [0, st.max / 2, st.max], ctx);
      } else {
        assert.ok(st.ticks.includes(q.target), ctx);
        // chaque graduation se touche (la flèche s'y cale)
        for (const t of st.ticks) assert.equal(lineValueAt(st, lineX(st, t) + 0.4), t, ctx);
      }
      if (q.key.includes(':bonds:')) {
        // la grenouille : départ + bonds = arrivée
        const [, start, count, size] = q.text.match(/part de (\d+) et fait (\d+) bonds de (\d+)/).map(Number);
        assert.equal(st.frog, start, ctx);
        assert.equal(q.target, start + count * size, ctx);
        assert.ok(count >= 2, ctx);
      } else {
        assert.ok(q.text.includes(String(q.target)), ctx);
        assert.ok(q.instruction.includes(`nombre ${q.target} `), ctx);
      }
      const svg = numberLineSvg(st, { place: true, target: q.target });
      assert.ok(svg.includes('nl-cursor') && svg.includes('nl-ghost') && svg.includes('nl-reveal'), ctx);
    }
  }
});

test('droite : chaque niveau a sa droite (0 à 10, 0 à 20, 0 à 100, dizaine, 40 à 60, 0 à 1000…)', () => {
  const kinds = new Map();
  for (let level = 1; level <= 9; level++) {
    const seen = new Set();
    for (const { q } of questions(line, level, 120)) {
      const st = q.stage;
      const step = st.ticks[1] - st.ticks[0];
      seen.add(q.interaction || 'lire');
      if (level <= 2) assert.deepEqual([st.min, st.max, step, st.labels.length], [0, 10, 1, 11]);
      if (level === 3) assert.deepEqual([st.min, st.max, step, st.labels], [0, 20, 1, [0, 5, 10, 15, 20]]);
      if (level === 4) assert.deepEqual([st.min, st.max, step], [0, 100, 10]);
      if (level === 5) assert.ok(st.min % 10 === 0 && st.max === st.min + 10 && step === 1 && st.max <= 100);
      if (level === 6) assert.ok(st.min > 0 && st.min % 10 === 0 && st.max === st.min + 20 && step === 1);
      if (level === 7) assert.deepEqual([st.min, st.max, step], [0, 1000, 100]);
      if (level === 8) assert.ok(q.tolerance > 0);
    }
    kinds.set(level, seen);
  }
  assert.deepEqual([...kinds.get(1)], ['lire']);
  assert.deepEqual([...kinds.get(2)], ['numberline']);
  assert.deepEqual([...kinds.get(5)], ['numberline']);
  for (const level of [3, 4, 6, 7, 9]) assert.equal(kinds.get(level).size, 2, `niveau ${level} : lire et placer`);
});

// ---------------------------------------------------------------- Les fractions

test('fractions : les dessins ont une part par fraction, les parts d’une pizza font le tour', () => {
  const pizza = { shape: 'disc', sizes: [1, 1, 1, 1], shaded: [1], rotate: 45 };
  const svg = fractionSvg(pizza, 'test');
  assert.equal(svg.match(/data-part=/g).length, 4);
  assert.equal(svg.match(/url\(#fr-test\)/g).length, 1, 'une seule part rayée');
  assert.ok(svg.includes('<pattern id="fr-test"'));
  const bar = { shape: 'bar', sizes: [2, 2, 2], rows: 2, shaded: [0, 2] };
  const svg2 = fractionSvg(bar, 7);
  assert.equal(svg2.match(/data-part=/g).length, 3);
  assert.equal(svg2.match(/url\(#fr-7\)/g).length, 2);
  assert.equal(svg2.match(/class="fr-cut"/g).length, 2, 'deux traits de coupe');
  assert.ok(close(shadedArea(bar), 2 / 3));
  assert.ok(close(shadedArea({ sizes: [1, 2, 4], shaded: [1] }), 2 / 7));
  assert.ok(equalParts(bar) && !equalParts({ sizes: [1, 2] }));
});

test('fractions : les mots de chaque fraction', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(FRACTIONS).map(([f, i]) => [f, i.words])), {
    '1/2': 'un demi', '1/3': 'un tiers', '1/4': 'un quart', '2/3': 'deux tiers', '2/4': 'deux quarts', '3/4': 'trois quarts',
  });
  for (const [f, { n, d }] of Object.entries(FRACTIONS)) assert.equal(f, `${n}/${d}`);
});

test('fractions : niveau 1, une seule pizza (ou tablette) coupée en 2 parts égales', () => {
  for (const { q } of questions(frac, 1)) {
    if (q.stage.type === 'fraction') {
      assert.equal(q.stage.sizes.length, 2);
      assert.equal(q.answer, equalParts(q.stage) ? 'oui' : 'non', q.key);
      continue;
    }
    const equal = q.choices.filter((c) => equalParts(c.fraction));
    assert.equal(equal.length, 1, q.key);
    assert.equal(equal[0].value, q.answer, q.key);
    for (const c of q.choices) assert.equal(c.fraction.sizes.length, 2, q.key);
  }
});

test('fractions : touche la moitié, le quart, le tiers ; un seul dessin juste, des pièges instructifs', () => {
  for (const [level, f] of [[2, '1/2'], [3, '1/4'], [4, '1/3']]) {
    let unequalTraps = 0;
    for (const { q } of questions(frac, level)) {
      if (q.interaction === 'shade') continue;
      const ctx = `niveau ${level} : ${q.key}`;
      const good = q.choices.filter((c) => equalParts(c.fraction) && close(shadedArea(c.fraction), value(f)));
      assert.equal(good.length, 1, ctx);
      assert.equal(good[0].value, q.answer, ctx);
      assert.equal(good[0].fraction.sizes.length, FRACTIONS[f].d, ctx);
      // aucun piège n'a la bonne aire coloriée (même avec des parts inégales)
      for (const c of q.choices) if (c !== good[0]) assert.ok(!close(shadedArea(c.fraction), value(f)), ctx);
      if (q.choices.some((c) => !equalParts(c.fraction))) unequalTraps++;
      assert.equal(new Set(q.choices.map((c) => c.fraction.shape)).size, 1, `même forme partout : ${ctx}`);
      assert.equal(q.choices.length, 3, ctx);
    }
    assert.ok(unequalTraps > RUNS / 3, `niveau ${level} : des parts inégales en piège`);
  }
});

test('fractions : colorier, des parts égales et le bon nombre de parts', () => {
  const expected = { 2: ['1/2'], 3: ['1/4'], 4: ['1/3'], 6: ['2/4', '3/4', '2/3'] };
  for (const [level, allowed] of Object.entries(expected)) {
    const seen = new Set();
    for (const { q } of questions(frac, Number(level))) {
      if (q.interaction !== 'shade') continue;
      const { sizes, shaded } = q.stage;
      const ctx = `niveau ${level} : ${q.key}`;
      assert.ok(equalParts(q.stage) && shaded.length === 0, ctx);
      assert.equal(q.answer, `${q.target}/${sizes.length}`, ctx);
      const f = allowed.find((g) => close(value(g), q.target / sizes.length) && q.text.includes(FRACTIONS[g].the));
      assert.ok(f, ctx);
      seen.add(f);
      assert.match(q.text, /^Colorie (la moitié|le quart|le tiers|les deux quarts|les trois quarts|les deux tiers) de la (pizza|tablette)\.$/, ctx);
    }
    assert.deepEqual([...seen].sort(), [...allowed].sort(), `niveau ${level}`);
  }
});

test('fractions : quelle fraction est coloriée ? la réponse est la seule juste', () => {
  for (const level of [5, 6]) {
    for (const { q } of questions(frac, level)) {
      if (q.interaction) continue;
      const ctx = `niveau ${level} : ${q.key}`;
      const { n, d } = FRACTIONS[q.answer];
      assert.ok(equalParts(q.stage), ctx);
      assert.equal(q.stage.sizes.length, d, ctx);
      assert.equal(q.stage.shaded.length, n, ctx);
      // aucun autre choix n'a la même valeur (pas « un demi » à côté de « deux quarts »)
      for (const c of q.choices) if (c.value !== q.answer) assert.ok(!close(value(c.value), value(q.answer)), ctx);
      assert.equal(new Set(q.choices.map((c) => c.value)).size, q.choices.length, ctx);
      assert.ok(q.choices.every((c) => c.frac.words === FRACTIONS[c.value].words), ctx);
      if (level === 5) assert.ok(['1/2', '1/3', '1/4'].includes(q.answer), ctx);
      if (level === 6) assert.ok(['2/4', '3/4', '2/3'].includes(q.answer), ctx);
      assert.ok(q.success.speak.includes(FRACTIONS[q.answer].words), ctx);
    }
  }
});

test('fractions : la moitié et le quart d’une quantité', () => {
  for (const level of [7, 8]) {
    const parts = level === 7 ? 2 : 4;
    for (const { q } of questions(frac, level)) {
      const ctx = `niveau ${level} : ${q.key}`;
      assert.equal(q.stage.type, 'objects', ctx);
      assert.equal(q.answer * parts, q.stage.count, ctx);
      assert.ok(q.stage.count <= 20 && q.answer >= 1, ctx);
      assert.ok(q.text.includes(String(q.stage.count)), ctx);
      assert.ok(q.instruction.startsWith('Zoé partage'), ctx);
      const values = q.choices.map((c) => c.value);
      assert.equal(values.filter((v) => v === q.answer).length, 1, ctx);
      assert.ok(values.every((v) => v >= 1 && v <= q.stage.count), ctx);
    }
  }
});

test('fractions : comparer, la plus grande part est celle du plus petit nombre de parts', () => {
  for (const { q } of questions(frac, 9)) {
    const biggest = q.text.includes('plus grande');
    assert.ok(biggest || q.text.includes('plus petite'), q.key);
    const values = q.choices.map((c) => c.value);
    assert.equal(values.length, 2, q.key);
    const sorted = [...values].sort((a, b) => value(b) - value(a));
    assert.equal(q.answer, biggest ? sorted[0] : sorted[1], q.key);
    for (const c of q.choices) {
      if (c.fraction) {
        // deux pizzas de même taille, une seule part coloriée, dont l'aire est la fraction
        assert.equal(c.fraction.shape, 'disc', q.key);
        assert.ok(close(shadedArea(c.fraction), value(c.value)), q.key);
        assert.equal(c.caption, FRACTIONS[c.value].words, q.key);
      } else {
        assert.ok(q.text.includes(FRACTIONS[c.value].words), q.key);
      }
    }
  }
});

test('droite et fractions : la voix dit les fractions en mots, consignes en phrases entières', () => {
  for (const game of [line, frac]) {
    for (let level = 1; level <= game.levels.length; level++) {
      for (const { q } of questions(game, level, 60)) {
        for (const { text } of spoken(q)) {
          assert.ok(!/\d\s*\/\s*\d/.test(text), `« ${text} » : fraction écrite en chiffres`);
          assert.match(text, /[.?!»]$/, `« ${text} » : phrase sans point final`);
          // typographie : une espace avant ? ! : (l'espace fine est ajoutée à l'affichage), pas avant la virgule
          assert.ok(!/\S[?!:]/.test(text.replace(/https?:/g, '')), `« ${text} » : espace manquante`);
          assert.ok(!/\s,/.test(text) && !/'/.test(text), `« ${text} »`);
        }
        assert.ok(!/\S[?!:]/.test(q.text) && !/'/.test(q.text), q.text);
      }
    }
  }
});
