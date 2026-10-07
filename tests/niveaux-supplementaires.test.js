// Les 3 niveaux ajoutés à la fin de chaque jeu de maths-extra, logique et labyrinthes :
// réponses justes, contraintes de mise en page, et accès dans au moins une classe.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findGame } from '../app/js/games/index.js';
import { canMove } from '../app/js/games/labyrinthes.js';
import { clockLabel, SHAPE_EMOJI, SHAPE_SIDES } from '../app/js/games/maths-extra.js';
import { hiddenCubes, PIECES } from '../app/js/games/logique.js';
import { PROGRAMS } from '../app/js/programs.js';
import { createRng } from '../app/js/random.js';

// Nombre de niveaux avant l'ajout : les 3 derniers niveaux de chaque jeu sont les nouveaux.
// (Le sudoku a depuis été réorganisé en 10 niveaux : voir sudoku-difficile.test.js.)
const BEFORE = {
  relier: 3, tables: 6, ranger: 7, problemes: 7, doubles: 4, formes: 3, algorithmes: 4, intrus: 3, ombres: 3,
  heure: 4, symetrie: 4, reproduire: 3, tangram: 2, cubes: 4, labyrinthe: 6, 'chemin-nombres': 8,
  'chemin-lettres': 4,
};
// Nombre de niveaux aujourd'hui, quand il a encore changé depuis (niveaux ajoutés ensuite, ou le chemin
// des nombres ramené à 10 niveaux : ses anciens niveaux 10 et 11 sont réunis dans le niveau 10).
const NOW = { reproduire: 8, tangram: 8, 'chemin-nombres': 10 };

/** Des questions de chaque nouveau niveau (k = 1, 2 ou 3), avec le prénom de l'enfant. */
function* newQuestions(id, runs = 150) {
  const game = findGame(id);
  for (const k of [1, 2, 3]) {
    const level = BEFORE[id] + k;
    const rng = createRng(4321 + level);
    for (let i = 0; i < runs; i++) yield { level, k, q: game.generate(level, rng, i, { name: 'Zoé' }) };
  }
}

/** « 7 + 3 », « 12 − 2 », « 9+6 » → le résultat. */
function calc(text) {
  const [, a, op, b] = text.match(/^(\d+)\s*([+−])\s*(\d+)$/);
  return op === '+' ? Number(a) + Number(b) : Number(a) - Number(b);
}

test('3 niveaux de plus par jeu, à la fin, libellés courts, accessibles dans une classe', () => {
  for (const [id, before] of Object.entries(BEFORE)) {
    const game = findGame(id);
    assert.ok(game.levels.length >= (NOW[id] ?? before + 3), id); // d'autres niveaux ont pu s'ajouter ensuite
    for (const label of game.levels.slice(before)) assert.ok(label.length <= 26, `${id} : « ${label} » trop long`);
    const entries = Object.values(PROGRAMS).flatMap((domains) => Object.values(domains).flat()).filter(([gid]) => gid === id);
    for (let level = before + 1; level <= Math.min(before + 3, game.levels.length); level++) {
      assert.ok(entries.some(([, min, max]) => level >= min && level <= max), `${id} niveau ${level} : dans aucune classe`);
    }
  }
});

test('formes : compter les côtés, côtés et pointes, compter les formes', () => {
  for (const { k, q } of newQuestions('formes')) {
    if (k === 1) assert.equal(q.answer, SHAPE_SIDES[q.stage.shape]);
    if (k === 2) {
      const shapes = q.choices.map((c) => c.shape);
      assert.equal(shapes.filter((s) => s === q.answer).length, 1);
      // le cœur n'a pas de côté droit non plus : jamais proposé avec « ni côté, ni pointe »
      if (q.answer === 'rond') assert.ok(!shapes.includes('cœur'), q.key);
      if (q.text.includes('3 côtés')) assert.equal(q.answer, 'triangle');
      if (q.text.includes('tous pareils')) assert.equal(q.answer, 'carré');
      if (q.text.includes('2 grands côtés')) assert.equal(q.answer, 'rectangle');
    }
    if (k === 3) {
      const kind = ['rond', 'carré', 'cœur'].find((s) => q.text.includes(`${s}s`));
      assert.equal(q.stage.items.length, 8);
      assert.equal(q.stage.items.filter((e) => SHAPE_EMOJI[kind].includes(e)).length, q.answer, q.key);
    }
  }
});

test('algorithmes : trou au milieu, aller-retour, suites qui grandissent', () => {
  const period = (seq) => [1, 2, 3, 4, 5, 6].find((p) => seq.every((x, i) => i < p || x === seq[i - p]));
  for (const { k, q } of newQuestions('algorithmes')) {
    const { items } = q.stage;
    const gap = items.indexOf(null);
    const full = items.map((x) => x ?? q.answer);
    assert.ok(items.length <= 9, 'pas plus de motifs que les niveaux existants');
    if (k === 1) {
      assert.ok(gap > 0 && gap < items.length - 1, 'le trou est au milieu');
      assert.ok(period(full) <= 4, q.key);
      continue;
    }
    assert.equal(gap, items.length - 1);
    if (k === 2) {
      // A B C B…, A B C C B A…, A B C D C B… : le motif se lit pareil à l'aller et au retour
      const p = period(full);
      assert.ok(p === 4 || p === 6, q.key);
      const motif = full.slice(0, p);
      assert.ok(motif.every((x, i) => x === motif[(p - i) % p]) || motif.every((x, i) => x === motif[p - 1 - i]), q.key);
    } else {
      // A B, A A B, A A A B… (ou A B, A B B…) : chaque groupe grandit d'un
      const [a] = full;
      const b = full.find((x) => x !== a);
      const grow = (first) => {
        const s = [];
        for (let n = 1; s.length < full.length; n++) s.push(...(first ? [...Array(n).fill(a), b] : [a, ...Array(n).fill(b)]));
        return s.slice(0, full.length);
      };
      assert.ok([true, false].some((first) => grow(first).every((x, i) => x === full[i])), q.key);
    }
  }
});

test('intrus : un seul mot, nombre ou calcul qui n’est pas comme les autres', () => {
  for (const { k, q } of newQuestions('intrus')) {
    const others = q.choices.map((c) => c.value).filter((v) => v !== q.answer);
    assert.equal(others.length, 3);
    if (k === 1) for (const c of q.choices) assert.ok(c.label.length <= 7, c.label);
    if (k === 2) {
      // une règle que suivent les trois autres, pas l'intrus : dizaines, unités, centaines, finir par 0
      const rules = [(n) => Math.floor(n / 10) % 10, (n) => n % 10, (n) => Math.floor(n / 100), (n) => n % 10 === 0];
      assert.ok(rules.some((f) => others.every((n) => f(n) === f(others[0])) && f(q.answer) !== f(others[0])), q.key);
    }
    if (k === 3) {
      const results = others.map(calc);
      assert.ok(results.every((r) => r === results[0]), q.key);
      assert.notEqual(calc(q.answer), results[0], q.key);
    }
  }
});

test('ombres : ombres qui se ressemblent, positions nommées, l’ombre tournée autrement', () => {
  const TRANSFORMS = { miroir: ['scaleX(-1)', 'miroir'], 'tete-en-bas': ['rotate(180deg)', 'tête en bas'], couche: ['rotate(90deg)', 'couchée'] };
  for (const { k, q } of newQuestions('ombres')) {
    if (k === 1) assert.equal(q.stage.emoji, q.answer);
    if (k === 2) {
      assert.equal(q.choices.find((c) => c.value === q.answer).transform, TRANSFORMS[q.answer][0]);
      assert.ok(q.text.includes(TRANSFORMS[q.answer][1]), q.text);
    }
    if (k === 3) {
      const odd = q.choices.find((c) => c.value === q.answer);
      const rest = q.choices.filter((c) => c !== odd);
      assert.ok(rest.every((c) => c.transform === rest[0].transform && c.shadow === odd.shadow), q.key);
      assert.notEqual(odd.transform, rest[0].transform);
    }
  }
});

test('tables : le nombre qui manque, les paquets, les partages', () => {
  for (const { k, q } of newQuestions('tables')) {
    if (k === 1) {
      const [a, , b, , product] = q.stage.parts;
      assert.equal((a ?? q.answer) * (b ?? q.answer), product);
      assert.ok(product <= 50, 'l’opération tient sur la largeur d’un téléphone');
      continue;
    }
    const [x, y] = q.stage.text.match(/\d+/g).map(Number);
    assert.ok(q.instruction.includes('Zoé'));
    if (k === 2) assert.equal(q.answer, x * y, q.instruction);
    if (k === 3) assert.equal(q.answer * y, x, q.instruction);
  }
});

test('relier : un de plus, le double, pour faire 10', () => {
  const rules = { 1: (n) => n + 1, 2: (n) => 2 * n, 3: (n) => 10 - n };
  for (const { k, q } of newQuestions('relier')) {
    assert.equal(q.pairs.length, 4);
    for (const p of q.pairs) {
      assert.ok(p.objects.count >= 1 && p.objects.count <= 10);
      assert.equal(p.right, rules[k](p.objects.count));
    }
  }
});

test('ranger : des calculs, les mêmes chiffres, attention aux zéros', () => {
  for (const { k, q } of newQuestions('ranger')) {
    assert.equal(q.items.length, 4);
    for (const it of q.items) assert.ok(it.label.length <= 4, `étiquette trop longue : ${it.label}`);
    if (k === 1) for (const it of q.items) assert.equal(it.value, calc(it.label));
    if (k === 2) assert.equal(new Set(q.items.map((it) => [...it.label].sort().join(''))).size, 1, q.key);
    if (k === 3) {
      assert.ok(q.items.some((it) => it.value < 100), q.key);
      assert.ok(q.items.filter((it) => it.label.includes('0')).length >= 2, q.key);
    }
  }
});

test('petits problèmes : comparer, trouver ce qui a changé, trouver le départ', () => {
  for (const { k, q } of newQuestions('problemes')) {
    assert.ok(q.instruction.includes('Zoé'), q.instruction);
    assert.ok(Number.isInteger(q.answer) && q.answer >= 1, q.instruction);
    assert.ok(!/\b1 [a-zé]+s\b/.test(q.instruction), `pluriel après 1 : ${q.instruction}`);
    const [x, y] = q.stage.text.match(/\d+/g).map(Number);
    if (k === 1) {
      assert.equal(q.answer, Math.abs(x - y), q.instruction);
      assert.equal(q.text.includes('de plus'), x > y, q.instruction);
    }
    if (k === 2) assert.equal(q.answer, Math.abs(x - y), q.instruction);
    if (k === 3) assert.equal(q.answer, q.stage.text.includes('reste') ? y + x : y - x, q.instruction);
  }
});

test('doubles : presque des doubles, doubles à deux chiffres, moitiés', () => {
  for (const { k, q } of newQuestions('doubles')) {
    if (k === 1) {
      const [a, , b] = q.stage.parts;
      assert.equal(Math.abs(a - b), 1);
      assert.equal(q.answer, a + b);
    } else {
      const n = Number(q.text.match(/\d+/)[0]);
      assert.ok(n >= 10 && n < 100, q.text);
      assert.equal(q.answer, k === 2 ? 2 * n : n / 2, q.text);
      assert.ok(Number.isInteger(q.answer));
    }
  }
});

test('heure : l’après-midi, l’heure qu’il sera, le temps qu’il reste', () => {
  const later = { 'un quart d’heure': 15, 'une demi-heure': 30, 'une heure': 60, 'deux heures': 120 };
  const duration = (label) => (label.endsWith('min') ? parseInt(label, 10) : 60 * parseInt(label, 10) + (Number(label.split('h')[1]) || 0));
  for (const { k, q } of newQuestions('heure')) {
    const { h, m } = q.stage;
    if (k === 1) {
      assert.equal(q.answer, clockLabel(h + 12, m));
      assert.ok(q.choices.some((c) => c.value === clockLabel(h, m)), 'piège : l’heure du matin');
    }
    if (k === 2) {
      const d = later[Object.keys(later).find((phrase) => q.text.includes(`Dans ${phrase},`))];
      const total = (h % 12) * 60 + m + d;
      assert.equal(q.answer, clockLabel(Math.floor(total / 60) % 12 || 12, total % 60), q.text);
    }
    if (k === 3) {
      const [, eh, em] = q.text.match(/à (\d+) h(?: (\d+))?/).map((v) => Number(v) || 0);
      assert.equal(duration(q.answer), ((eh % 12) * 60 + em - (h % 12) * 60 - m + 720) % 720, q.text);
    }
    assert.equal(new Set(q.choices.map((c) => c.value)).size, 4);
  }
});

test('symétrie : des figures d’un seul morceau, collées au trait', () => {
  for (const { k, q } of newQuestions('symetrie', 100)) {
    const { cols, rows, axis, model } = q.stage;
    assert.ok(cols <= 8 && rows <= cols, 'jamais plus haut que large, 8 × 8 au plus');
    const near = (c) => [c - cols, c + cols, c % cols ? c - 1 : -1, c % cols < cols - 1 ? c + 1 : -1];
    // les morceaux du dessin (cases qui se touchent par un côté)
    const left = new Set(model);
    const parts = [];
    while (left.size) {
      const [first] = left;
      const stack = [first];
      const part = [];
      left.delete(first);
      while (stack.length) {
        const c = stack.pop();
        part.push(c);
        for (const n of near(c)) if (left.delete(n)) stack.push(n);
      }
      parts.push(part);
    }
    const onAxis = (c) => (axis === 'v' ? c % cols === cols / 2 - 1 : Math.floor(c / cols) === rows / 2 - 1);
    assert.equal(parts.length, k === 3 ? 2 : 1, q.key);
    assert.equal(parts.filter((part) => part.some(onAxis)).length, 1, `une seule figure collée au trait : ${q.key}`);
  }
});

test('reproduire : une case plus bas, la tête en bas, en plus grand', () => {
  for (const { k, q } of newQuestions('reproduire', 100)) {
    const { cols, rows, model, solution, mode } = q.stage;
    assert.equal(mode, ['shift', 'turn', 'zoom'][k - 1]);
    assert.ok(cols <= 8 && rows <= 8);
    if (k === 2) assert.notDeepEqual(solution, model.map((c) => c + cols / 2), 'le demi-tour doit changer le dessin');
    if (k === 3) assert.equal(solution.length, 4 * model.length);
  }
});

test('les pièces du carré : coupes mélangées, chaque case bien remplie', () => {
  const area = (pts) => Math.abs(pts.reduce((s, [x, y], i) => {
    const [x2, y2] = pts[(i + 1) % pts.length];
    return s + x * y2 - x2 * y;
  }, 0)) / 2;
  for (const { k, q } of newQuestions('tangram', 100)) {
    const { grid, pieces, missing } = q.stage;
    assert.equal(grid, k === 3 ? 3 : 2);
    for (let cell = 0; cell < grid * grid; cell++) {
      const covered = [...pieces, missing].filter((p) => p.cell === cell).reduce((s, p) => s + area(PIECES[p.shape]), 0);
      assert.ok(Math.abs(covered - 1) < 1e-9, `case ${cell} mal remplie : ${q.key}`);
    }
    assert.equal(q.choices.length, 4);
    for (const c of q.choices) assert.ok(PIECES[c.value]);
  }
});

/** Combien de cubes on ne voit pas du tout sur le dessin (même perspective et même ordre que render.js). */
function hiddenOnDrawing(heights) {
  const iso = (x, y, z) => [(x - y) * 0.866, (x + y) * 0.5 - z];
  const cubes = [];
  heights.forEach((row, y) => row.forEach((hgt, x) => { for (let z = 0; z < hgt; z++) cubes.push([x, y, z]); }));
  cubes.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
  const faces = cubes.flatMap(([x, y, z], k) => [
    [iso(x + 1, y, z), iso(x + 1, y + 1, z), iso(x + 1, y + 1, z + 1), iso(x + 1, y, z + 1)],
    [iso(x, y + 1, z), iso(x + 1, y + 1, z), iso(x + 1, y + 1, z + 1), iso(x, y + 1, z + 1)],
    [iso(x, y, z + 1), iso(x + 1, y, z + 1), iso(x + 1, y + 1, z + 1), iso(x, y + 1, z + 1)],
  ].map((poly) => ({ poly, k })));
  const inside = ([px, py], poly) => {
    let inn = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i];
      const [xj, yj] = poly[j];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inn = !inn;
    }
    return inn;
  };
  // les faces se voient en entier ou pas du tout : un échantillonnage assez fin suffit
  const seen = new Set();
  for (let X = -2.7; X <= 2.7; X += 0.06) {
    for (let Y = -3.1; Y <= 3.1; Y += 0.06) {
      let top = -1;
      for (const { poly, k } of faces) if (inside([X, Y], poly)) top = k; // le dernier dessiné est devant
      if (top >= 0) seen.add(top);
    }
  }
  return cubes.length - seen.size;
}

test('cubes : toutes à la même hauteur, cubes cachés (vérifiés sur le dessin), gros cube', () => {
  let drawn = 0;
  for (const { k, q } of newQuestions('cubes')) {
    const { heights } = q.stage;
    const total = heights.flat().reduce((a, b) => a + b, 0);
    assert.ok(heights.length <= 3 && heights[0].length <= 3 && heights[0][0] <= 3, 'pas plus grand que les niveaux existants');
    if (k === 1) assert.equal(q.answer, heights.length * heights[0].length * heights[0][0] - total);
    if (k === 2) {
      assert.equal(q.answer, hiddenCubes(heights));
      if (drawn++ < 8) assert.equal(q.answer, hiddenOnDrawing(heights), JSON.stringify(heights));
    }
    if (k === 3) {
      assert.equal(heights[0][0], 3);
      assert.equal(q.answer, 27 - total);
    }
  }
});

test('labyrinthe : des boucles, le trésor au centre, le plus long chemin', () => {
  const distances = (open, cols, start) => {
    const dist = new Map([[start, 0]]);
    const queue = [start];
    while (queue.length) {
      const c = queue.shift();
      for (const n of [c - cols, c + 1, c + cols, c - 1]) {
        if (n >= 0 && n < open.length && !dist.has(n) && canMove(open, cols, c, n)) {
          dist.set(n, dist.get(c) + 1);
          queue.push(n);
        }
      }
    }
    return dist;
  };
  for (const { k, q } of newQuestions('labyrinthe', 60)) {
    const { cols, rows, open, start, goal, solution } = q.stage;
    assert.ok(cols === 9 && rows === 9);
    const passages = open.reduce((s, bits) => s + [1, 2, 4, 8].filter((b) => bits & b).length, 0) / 2;
    // un labyrinthe sans boucle a exactement (cases − 1) passages
    if (k === 1) assert.ok(passages > cols * rows - 1, 'des boucles');
    else assert.equal(passages, cols * rows - 1);
    const dist = distances(open, cols, start);
    assert.equal(dist.size, cols * rows, 'toutes les cases sont accessibles');
    assert.equal(solution.length - 1, dist.get(goal), 'la solution est le plus court chemin');
    if (k === 2) assert.equal(goal, 40);
    if (k === 3) assert.equal(dist.get(goal), Math.max(...dist.values()), 'l’arrivée est la case la plus éloignée');
  }
});

test('chemins : de 3 en 3, au-delà de 100 (passer 100, de 100 en 100) ; de K à T, minuscules, à l’envers', () => {
  // k = 3 : l'ancien niveau 11, joué comme le niveau 10 (le dernier)
  const seen = new Set();
  for (const { k, q } of newQuestions('chemin-nombres', 60)) {
    const { seq, cells, cols, rows } = q.stage;
    assert.ok(cols <= 5 && rows <= 5);
    for (const v of cells) assert.ok(String(v).length <= 3, `${v} : pas plus de chiffres que « 100 »`);
    if (k === 1) assert.deepEqual(seq, [3, 6, 9, 12, 15, 18, 21, 24, 27, 30]);
    if (k >= 2) {
      const passe100 = seq.includes(99) && seq.includes(100) && seq.includes(101);
      assert.ok(passe100 || seq.join() === '100,200,300,400,500,600,700,800,900', seq.join());
      seen.add(passe100);
    }
  }
  assert.equal(seen.size, 2, 'les deux chemins au-delà de 100');
  const expected = { 1: 'KLMNOPQRST', 2: 'abcdefghij', 3: 'JIHGFEDCBA' };
  for (const { k, q } of newQuestions('chemin-lettres', 60)) {
    assert.equal(q.stage.seq.join(''), expected[k]);
    if (k === 2) assert.ok(q.stage.cells.includes('p') && q.stage.cells.includes('q'), 'des lettres qui ressemblent à b et d');
  }
});
