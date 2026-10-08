import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findGame } from '../app/js/games/index.js';
import {
  additionPosee, columnSteps, digitAt, KIDS, makeAddition, makeSubtraction, partage,
} from '../app/js/games/operations.js';
import { createRng } from '../app/js/random.js';

const RUNS = 300;
const NAME = 'Zoé';

function* questions(game, level, runs = RUNS) {
  const rng = createRng(4242 + level);
  for (let i = 0; i < runs; i++) yield game.generate(level, rng, i, { name: NAME });
}

/** Les textes d'une question : consigne, bulle, consigne courte, félicitations, question finale. */
const texts = (q) => [q.text, q.instruction, q.short?.text, q.short?.speak, q.ask?.text, q.ask?.summary, ...[q.success.speak].flat()].filter(Boolean);

function checkFrench(q) {
  for (const t of texts(q)) {
    assert.doesNotMatch(t, /\S[?!:;]/, `espace avant ? ! : ; : ${t}`);
    assert.doesNotMatch(t, / {2}|^ | $/, `espaces en trop : ${t}`);
    assert.doesNotMatch(t, /\bde [aeiouéèœ]/i, `élision oubliée : ${t}`);
    assert.doesNotMatch(t, /'/, `apostrophe droite : ${t}`);
    assert.doesNotMatch(t, /undefined|NaN|null/, t);
    assert.match(t, /^[A-ZÀ-ÖØ-Þ0-9Œ]/, `majuscule au début : ${t}`);
  }
}

test('le partage et l’addition posée : rubrique Nombres et calcul, 10 niveaux, libellés courts', () => {
  for (const game of [partage, additionPosee]) {
    assert.equal(findGame(game.id), game);
    assert.equal(game.domain, 'maths');
    assert.equal(game.section, 'Nombres et calcul');
    assert.ok(game.levels.length >= 7 && game.levels.length <= 10, game.id);
    for (const label of game.levels) assert.ok(label.length <= 26, `libellé trop long : ${label}`);
    assert.equal(new Set(game.levels).size, game.levels.length);
  }
});

test('le partage et l’addition posée : mêmes questions pour la même graine', () => {
  for (const game of [partage, additionPosee]) {
    for (let level = 1; level <= game.levels.length; level++) {
      const a = [...questions(game, level, 30)];
      const b = [...questions(game, level, 30)];
      assert.deepEqual(a, b, `${game.id} niveau ${level}`);
    }
  }
});

// ---------------------------------------------------------------- Le partage

test('partage : niveaux 1 à 3 et 7, partager au doigt en parts égales, sans reste', () => {
  const bounds = { 1: [[2], 4, 10], 2: [[3], 6, 15], 3: [[4], 8, 20], 7: [[2, 3, 4, 5], 12, 30] };
  for (const [level, [groups, min, max]] of Object.entries(bounds)) {
    for (const q of questions(partage, Number(level))) {
      const { total, groups: n, who, size, emoji } = q.stage;
      assert.equal(q.interaction, 'share');
      assert.equal(size, null);
      assert.ok(groups.includes(n), `niveau ${level} : ${n} enfants`);
      assert.ok(total >= min && total <= max, `niveau ${level} : ${total}`);
      assert.equal(total % n, 0);
      assert.equal(q.answer, total / n);
      assert.ok(q.answer >= 2);
      assert.equal(who.length, n);
      assert.equal(new Set(who).size, n);
      assert.ok(who.every((k) => KIDS.includes(k)));
      assert.ok(emoji);
      assert.equal(q.ask, undefined);
      assert.deepEqual(q.choices, []);
      assert.equal(q.text, `Partage ${total} ${q.stage.many} entre ${n} enfants.`);
      assert.equal(q.success.speak, `Chacun a ${q.answer} ${q.stage.many}.`);
      // l'assiette la plus remplie (part + 2) tient dans le dessin : 3 lignes au plus
      const perRow = { 2: 6, 3: 5, 4: 4, 5: 3 }[n];
      assert.ok(Math.ceil((Math.ceil(total / n) + 2) / perRow) <= 3, `niveau ${level} : ${total} entre ${n}`);
      checkFrench(q);
    }
  }
});

test('partage : « Combien chacun ? », la bonne part parmi trois réponses', () => {
  for (const q of questions(partage, 4)) {
    const { total, groups } = q.stage;
    assert.equal(q.interaction, undefined);
    assert.equal(q.answer * groups, total);
    const values = q.choices.map((c) => c.value);
    assert.equal(values.length, 3);
    assert.equal(new Set(values).size, 3);
    assert.equal(values.filter((v) => v === q.answer).length, 1);
    assert.ok(values.every((v) => v >= 0));
    checkFrench(q);
  }
});

test('partage : avec un reste, on dit combien il en reste (plus petit que le nombre d’enfants)', () => {
  for (const q of questions(partage, 5)) {
    const { total, groups } = q.stage;
    const rest = total % groups;
    assert.equal(q.interaction, 'share');
    assert.ok(rest >= 1 && rest < groups, `${total} entre ${groups}`);
    assert.ok(Math.floor(total / groups) >= 2);
    assert.equal(q.answer, rest);
    assert.equal(q.ask.text, 'Combien en reste-t-il ?');
    assert.equal(q.ask.summary, `Chacun a ${Math.floor(total / groups)} ${q.stage.many}.`);
    assert.equal(q.choices.filter((c) => c.value === rest).length, 1);
    assert.equal(new Set(q.choices.map((c) => c.value)).size, q.choices.length);
    checkFrench(q);
  }
});

test('partage : des paquets de 5, combien de paquets (le reste ne fait pas un paquet)', () => {
  const seen = new Set();
  for (const q of questions(partage, 6)) {
    const { total, size, groups } = q.stage;
    assert.equal(q.interaction, 'share');
    assert.equal(size, 5);
    assert.equal(groups, null);
    assert.ok(total >= 10 && total <= 30);
    assert.equal(q.answer, Math.floor(total / 5));
    assert.equal(q.choices.filter((c) => c.value === q.answer).length, 1);
    seen.add(total % 5);
    checkFrench(q);
  }
  assert.deepEqual([...seen].sort(), [0, 1, 2, 3, 4], 'avec et sans reste');
});

/** Les nombres d'un problème raconté, retrouvés dans le texte. */
function solveStory(q) {
  const share = q.stage.text.match(/^Zoé partage (\d+) .+ entre ses (\d+) .+, en parts égales\.$/);
  if (share) {
    const [total, n] = [Number(share[1]), Number(share[2])];
    return { kind: 'partage', total, n, answer: /reste-t-il/.test(q.text) ? total % n : Math.floor(total / n) };
  }
  const packs = q.stage.text.match(/^Zoé met (\d+) .+ dans des (\S+), (\d+) par (\S+)\.$/);
  assert.ok(packs, `problème inconnu : ${q.stage.text}`);
  const [total, size] = [Number(packs[1]), Number(packs[3])];
  assert.equal(total % size, 0);
  assert.equal(q.text, `Combien de ${packs[2]} faut-il ?`);
  return { kind: 'paquets', total, n: size, answer: total / size };
}

test('partage : problèmes racontés avec le prénom, la bonne réponse calculée d’après le texte', () => {
  for (const level of [8, 9]) {
    const kinds = new Set();
    for (const q of questions(partage, level)) {
      const story = solveStory(q);
      kinds.add(story.kind);
      assert.equal(q.answer, story.answer, q.instruction);
      assert.ok(story.total <= 30 && story.n >= 2 && story.n <= 6, q.instruction);
      assert.ok(q.instruction.includes(NAME) && !q.instruction.includes('Lou'));
      assert.equal(q.instruction, `${q.stage.text} ${q.text}`);
      const values = q.choices.map((c) => c.value);
      assert.equal(values.length, 4);
      assert.equal(new Set(values).size, 4, q.instruction);
      assert.equal(values.filter((v) => v === q.answer).length, 1);
      assert.ok(values.every((v) => Number.isInteger(v) && v >= 0));
      checkFrench(q);
    }
    assert.deepEqual([...kinds].sort(), level === 8 ? ['partage'] : ['paquets', 'partage']);
  }
  // niveau 8 : parfois un reste (et la question porte sur la part ou sur le reste)
  const withRest = [...questions(partage, 8)].filter((q) => /reste-t-il/.test(q.text));
  assert.ok(withRest.length > 20);
});

test('partage : le mélange reprend les niveaux 4 à 9', () => {
  const kinds = new Set([...questions(partage, 10)].map((q) => q.key.split(':')[1]));
  for (const k of ['guess', 'rest', 'paquets', 'share', 'histoire']) assert.ok(kinds.has(k), k);
});

// ---------------------------------------------------------------- L'addition posée

const carryInto = (rows, col) => Math.floor(rows.reduce((s, n) => s + (n % 10 ** col), 0) / 10 ** col);

/** Vérifie les étapes d'un calcul posé avec l'arithmétique (et non en refaisant le même algorithme). */
function checkSteps(rows, op, steps) {
  const result = op === '+' ? rows.reduce((a, b) => a + b, 0) : rows[0] - rows[1];
  const written = steps.filter((s) => s.kind === 'result');
  assert.equal(written.reduce((n, s) => n + s.digit * 10 ** s.col, 0), result, `${rows.join(op)} : résultat`);
  // chaque chiffre du résultat est écrit une fois, de droite à gauche, sans 0 devant
  assert.deepEqual(written.map((s) => s.col), written.map((_, i) => i));
  assert.equal(written.length, String(result).length, `${rows.join(op)} : 0 devant`);
  const len = Math.max(...rows.map((n) => String(n).length));
  for (let col = 1; col < len; col++) {
    const carry = op === '+' ? carryInto(rows, col) : 0;
    const posed = steps.find((s) => s.kind === 'carry' && s.col === col);
    if (carry) {
      assert.ok(posed, `${rows.join(op)} : retenue des ${col}`);
      assert.equal(posed.digit, carry, `${rows.join(op)} : retenue au-dessus de la colonne ${col}`);
      // la retenue se pose juste après le chiffre de la colonne de droite, avant la colonne suivante
      const at = steps.indexOf(posed);
      assert.equal(steps[at - 1].kind, 'result');
      assert.equal(steps[at - 1].col, col - 1);
      assert.equal(steps[at + 1].col, col);
    } else {
      assert.equal(posed, undefined, `${rows.join(op)} : retenue en trop`);
    }
  }
  // la retenue de la dernière colonne s'écrit directement au résultat
  assert.ok(steps.every((s) => s.kind !== 'carry' || s.col < len));
  return result;
}

test('addition posée : chiffres et retenues justes pour toutes les additions de deux nombres à deux chiffres', () => {
  for (let a = 10; a < 100; a++) {
    for (let b = 1; b < 100; b++) checkSteps([a, b], '+', columnSteps([a, b], '+'));
  }
  // 85 + 47 = 132 : je pose 2, je retiens 1 ; 8 + 4 + 1 = 13, j'écris 13
  assert.deepEqual(columnSteps([85, 47], '+').map((s) => [s.kind, s.col, s.digit]),
    [['result', 0, 2], ['carry', 1, 1], ['result', 1, 3], ['result', 2, 1]]);
  // 28 + 19 + 27 = 74 : 8 + 9 + 7 = 24, je pose 4, je retiens 2
  assert.deepEqual(columnSteps([28, 19, 27], '+').map((s) => [s.kind, s.col, s.digit]),
    [['result', 0, 4], ['carry', 1, 2], ['result', 1, 7]]);
  // 564 + 368 = 932 : deux retenues
  assert.deepEqual(columnSteps([564, 368], '+').map((s) => [s.kind, s.col, s.digit]),
    [['result', 0, 2], ['carry', 1, 1], ['result', 1, 3], ['carry', 2, 1], ['result', 2, 9]]);
  assert.deepEqual(columnSteps([476, 35], '−').map((s) => s.digit), [1, 4, 4]);
  assert.deepEqual(columnSteps([47, 5], '+').map((s) => s.label), ['Les unités', 'La retenue', 'Les dizaines']);
});

test('addition posée : additions et soustractions tirées au hasard, retenues dans les bonnes colonnes', () => {
  const rng = createRng(7);
  for (let i = 0; i < 3000; i++) {
    const lens = [[2, 2], [3, 2], [3, 3], [2, 2, 2], [3, 1], [2, 1]][i % 6];
    const carries = [[], [0], [1], [0, 1]][i % 4].filter((c) => c < Math.max(...lens) - 1);
    // impossible : une retenue des dizaines avec un seul chiffre aux dizaines, sans retenue des unités
    if ((lens.length === 3 && carries.includes(1)) || (lens[1] === 1 && carries.includes(1) && !carries.includes(0))) continue;
    const rows = makeAddition(rng, lens, carries);
    rows.forEach((n, r) => assert.equal(String(n).length, lens[r], `${rows} : longueur`));
    const len = Math.max(...lens);
    for (let col = 1; col < len; col++) assert.equal(carryInto(rows, col) > 0, carries.includes(col - 1), `${rows.join('+')} : retenue ${col}`);
    assert.ok(String(rows.reduce((a, b) => a + b, 0)).length === len, `${rows.join('+')} : pas de chiffre de plus`);
    checkSteps(rows, '+', columnSteps(rows, '+'));
    if (lens.length === 2) {
      const [a, b] = makeSubtraction(rng, lens);
      assert.equal(String(a).length, lens[0]);
      assert.equal(String(b).length, lens[1]);
      for (let col = 0; col < lens[0]; col++) assert.ok(digitAt(a, col) >= digitAt(b, col), `${a} − ${b} : retenue`);
      checkSteps([a, b], '−', columnSteps([a, b], '−'));
    }
  }
});

test('addition posée : chaque niveau pose les bons calculs', () => {
  const lengths = (q) => q.stage.rows.map((n) => String(n).length);
  const carries = (q) => q.stage.steps.filter((s) => s.kind === 'carry').map((s) => s.col);
  const expect = {
    1: (q) => { assert.deepEqual(lengths(q), [2, 2]); assert.deepEqual(carries(q), []); },
    2: (q) => { assert.deepEqual(lengths(q), [2, 2]); assert.deepEqual(carries(q), [1]); },
    4: (q) => { assert.deepEqual(lengths(q), [2, 2, 2]); assert.ok(carries(q).every((c) => c === 1)); },
    5: (q) => { assert.equal(lengths(q)[0], 3); assert.deepEqual(carries(q), []); },
    6: (q) => { assert.equal(lengths(q)[0], 3); assert.equal(carries(q).length, 1); },
    7: (q) => { assert.equal(lengths(q)[0], 3); assert.deepEqual(carries(q), [1, 2]); },
  };
  for (let level = 1; level <= 8; level++) {
    for (const q of questions(additionPosee, level)) {
      const { op, rows, steps, width } = q.stage;
      assert.equal(q.interaction, 'column');
      assert.equal(q.stage.type, 'column');
      assert.ok(width >= Math.max(...rows.map((n) => String(n).length)) && width <= 3);
      assert.ok(steps.every((s) => s.col < width));
      checkFrench(q);
      if (level === 3) {
        // la retenue toute seule : les unités (je pose), puis la retenue (je retiens)
        const units = rows.reduce((s, n) => s + (n % 10), 0);
        assert.ok(units >= 10, rows.join('+'));
        assert.deepEqual(steps.map((s) => [s.kind, s.col, s.digit, s.label]),
          [['result', 0, units % 10, 'Combien je pose ?'], ['carry', 1, Math.floor(units / 10), 'Combien je retiens ?']]);
        assert.ok(rows.reduce((a, b) => a + b, 0) < 100);
        assert.equal(q.success.speak, `Je pose ${units % 10}, je retiens ${Math.floor(units / 10)}.`);
        continue;
      }
      const result = checkSteps(rows, op, steps);
      assert.equal(q.answer, result);
      assert.equal(op, level === 8 ? '−' : '+');
      if (level <= 4) assert.ok(result < 100, `${rows.join(op)} = ${result}`);
      else assert.ok(result < 1000, `${rows.join(op)} = ${result}`);
      if (level === 8) assert.ok(rows[0] > rows[1]);
      expect[level]?.(q);
      assert.equal(q.success.speak, `${rows.join(op === '+' ? ' plus ' : ' moins ')}, égale ${result}`);
      assert.equal(q.instruction.includes('retenue'), carries(q).length > 0);
    }
  }
});

test('addition posée : bien poser, une seule disposition a les unités sous les unités', () => {
  for (const q of questions(additionPosee, 9)) {
    const [a, op, b] = q.stage.parts;
    assert.ok(['+', '−'].includes(op));
    if (op === '−') assert.ok(a > b);
    assert.ok(String(a).length > String(b).length);
    assert.equal(q.answer, 0);
    const values = q.choices.map((c) => c.value);
    assert.deepEqual([...values].sort(), [0, 1, 2]);
    // les trois dispositions sont différentes, et seule la bonne aligne les unités
    const drawn = q.choices.map(({ column: { rows, offsets, width } }) => {
      assert.ok(rows.every((n, r) => String(n).length + offsets[r] <= width));
      return rows.map((n, r) => `${' '.repeat(width - String(n).length - offsets[r])}${n}${' '.repeat(offsets[r])}`).join('/');
    });
    assert.equal(new Set(drawn).size, 3);
    const right = q.choices.find((c) => c.value === 0).column;
    assert.deepEqual(right.offsets, [0, 0]);
    assert.deepEqual(right.rows, [a, b]);
    checkFrench(q);
  }
});

test('addition posée : le mélange reprend les niveaux 2 et 4 à 9', () => {
  const kinds = new Set([...questions(additionPosee, 10)].map((q) => q.key.split(':')[1]));
  for (const k of ['add', 'sub', 'poser']) assert.ok(kinds.has(k), k);
});
