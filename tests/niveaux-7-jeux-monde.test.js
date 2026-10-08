// Lot « jeux-monde » : 8 niveaux pour le puzzle, Reproduis le dessin, les pièces du carré, les pays
// et les drapeaux ; le chemin des nombres ramené à 10 niveaux. Chaque nouveau niveau est tiré
// 150 fois : la bonne réponse est juste (recalculée), présente une seule fois parmi les choix.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findGame } from '../app/js/games/index.js';
import { PIECES } from '../app/js/games/logique.js';
import { FLAGS } from '../app/js/games/drapeaux.js';
import { createRng } from '../app/js/random.js';

// Nombre de niveaux attendu, et les niveaux ajoutés à la fin.
const LEVELS = {
  puzzle: { count: 8, added: [7, 8] },
  reproduire: { count: 8, added: [7, 8] },
  tangram: { count: 8, added: [6, 7, 8] },
  'chemin-nombres': { count: 10, added: [10] },
  pays: { count: 8, added: [7, 8] },
  drapeaux: { count: 8, added: [7, 8] },
};

/** 150 questions tirées à ce niveau, avec le prénom de l'enfant. */
function draw(id, level, runs = 150) {
  const rng = createRng(4321 + level);
  return Array.from({ length: runs }, (_, i) => findGame(id).generate(level, rng, i, { name: 'Zoé' }));
}

const values = (q) => q.choices.map((c) => c.value);

/** La bonne réponse une seule fois, pas de choix en double. */
function checkChoices(q, count) {
  const v = values(q);
  assert.equal(v.length, count, q.key);
  assert.equal(new Set(v).size, v.length, `choix en double : ${q.key}`);
  assert.equal(v.filter((x) => x === q.answer).length, 1, `bonne réponse absente ou en double : ${q.key}`);
}

test('entre 7 et 10 niveaux, libellés courts et tous différents', () => {
  for (const [id, { count, added }] of Object.entries(LEVELS)) {
    const game = findGame(id);
    assert.equal(game.levels.length, count, id);
    assert.ok(count >= 7 && count <= 10, id);
    assert.equal(new Set(game.levels).size, count, `${id} : libellé en double`);
    for (const level of added) {
      const label = game.levels[level - 1];
      assert.ok([...label].length <= 26, `${id} : « ${label} » trop long`);
    }
  }
});

test('mêmes questions pour la même graine (generate reste pur)', () => {
  for (const [id, { added }] of Object.entries(LEVELS)) {
    for (const level of added) {
      assert.deepEqual(draw(id, level, 20), draw(id, level, 20), `${id} niveau ${level}`);
    }
  }
});

test('puzzle : 30 puis 36 pièces, 6 colonnes au plus, jamais déjà fini', () => {
  for (const [level, cols, rows] of [[7, 6, 5], [8, 6, 6]]) {
    for (const q of draw('puzzle', level)) {
      assert.equal(q.interaction, 'swap');
      assert.deepEqual([q.stage.cols, q.stage.rows], [cols, rows]);
      const { order } = q.stage;
      assert.deepEqual([...order].sort((a, b) => a - b), Array.from({ length: cols * rows }, (_, i) => i), q.key);
      assert.ok(order.some((v, i) => v !== i), `puzzle déjà fini : ${q.key}`);
    }
  }
});

test('reproduire : copie décalée en 8 × 8, dessin rétréci', () => {
  for (const q of draw('reproduire', 7)) {
    const { cols, rows, model, solution, mode } = q.stage;
    assert.equal(mode, 'shift');
    assert.deepEqual([cols, rows, model.length], [8, 8, 8]);
    assert.equal(new Set(model).size, 8);
    for (const c of model) assert.ok(c % cols < cols / 2 && Math.floor(c / cols) < rows - 1, q.key);
    assert.deepEqual(solution, model.map((c) => c + cols + cols / 2).sort((a, b) => a - b), q.key);
  }
  for (const q of draw('reproduire', 8)) {
    const { cols, rows, model, solution, mode } = q.stage;
    assert.equal(mode, 'shrink');
    assert.deepEqual([cols, rows], [8, 8]);
    const half = cols / 2;
    const x0 = Math.min(...model.map((c) => c % cols));
    const y0 = Math.min(...model.map((c) => Math.floor(c / cols)));
    // chaque case de la copie est un carré de 2 × 2 cases du modèle, en partant du coin en haut à gauche
    assert.ok(solution.length >= 3 && solution.length <= 4, q.key);
    assert.equal(model.length, 4 * solution.length, q.key);
    const expected = solution.flatMap((s) => {
      const [sx, sy] = [s % cols - half, Math.floor(s / cols)];
      assert.ok(sx >= 0 && sx < half && sy < rows, `copie hors de la moitié droite : ${q.key}`);
      return [[0, 0], [1, 0], [0, 1], [1, 1]].map(([dx, dy]) => (y0 + 2 * sy + dy) * cols + x0 + 2 * sx + dx);
    }).sort((a, b) => a - b);
    assert.deepEqual(expected, [...model].sort((a, b) => a - b), q.key);
    // la copie commence en haut, contre le trait
    assert.ok(solution.some((s) => s < cols) && solution.some((s) => s % cols === half), q.key);
  }
});

test('les pièces du carré : coins coupés, 3 × 3, 4 × 4 ; une seule pièce bouche le trou', () => {
  const area = (pts) => Math.abs(pts.reduce((s, [x, y], i) => {
    const [x2, y2] = pts[(i + 1) % pts.length];
    return s + x * y2 - x2 * y;
  }, 0)) / 2;
  // toutes les pièces sont différentes : une seule peut boucher le trou
  const shapes = Object.values(PIECES).map((pts) => pts.map((p) => p.join(',')).sort().join(' '));
  assert.equal(new Set(shapes).size, shapes.length);
  const family = (shape) => shape.replace(/-(hg|hd|bg|bd|haut|bas|gauche|droite)$/, '').replace(/^(haut|bas|gauche|droite)$/, 'x');
  for (const level of [6, 7, 8]) {
    let corners = 0;
    for (const q of draw('tangram', level)) {
      const { grid, pieces, missing } = q.stage;
      assert.equal(grid, { 6: 2, 7: 3, 8: 4 }[level]);
      for (let cell = 0; cell < grid * grid; cell++) {
        const covered = [...pieces, missing].filter((p) => p.cell === cell).reduce((s, p) => s + area(PIECES[p.shape]), 0);
        assert.ok(Math.abs(covered - 1) < 1e-9, `case ${cell} mal remplie : ${q.key}`);
      }
      assert.ok([...pieces, missing].some((p) => p.shape.startsWith('petit-')), `pas de coin coupé : ${q.key}`);
      assert.equal(q.answer, missing.shape);
      checkChoices(q, 4);
      for (const c of q.choices) assert.ok(PIECES[c.value], c.value);
      const same = values(q).filter((v) => family(v) === family(q.answer)).length;
      // niveau 6 : trois de la même forme, une autre ; niveaux 7 et 8 : la même forme dans les 4 sens
      assert.equal(same, level === 6 ? 3 : 4, q.key);
      if (/^(petit|penta)-/.test(q.answer)) corners++;
    }
    assert.ok(corners > 10, `niveau ${level} : le trou est assez souvent un coin coupé`);
  }
});

test('chemin des nombres : 10 niveaux, le niveau 10 réunit « de 95 à 110 » et « de 100 en 100 »', () => {
  const kinds = new Set();
  for (const level of [10, 11]) {
    // un enfant enregistré au niveau 11 joue le niveau 10
    for (const q of draw('chemin-nombres', level)) {
      const { seq, cells, path } = q.stage;
      const kind = seq.join() === '100,200,300,400,500,600,700,800,900' ? 'centaines'
        : seq.join() === Array.from({ length: 16 }, (_, i) => 95 + i).join() ? 'passer100' : null;
      assert.ok(kind, seq.join());
      kinds.add(kind);
      assert.equal(q.answer, seq.at(-1));
      path.forEach((cell, i) => assert.equal(cells[cell], seq[i]));
      // les intrus ne sont jamais des nombres du chemin
      cells.forEach((v, i) => { if (!path.includes(i)) assert.ok(!seq.includes(v), `${v} : ${q.key}`); });
    }
  }
  assert.equal(kinds.size, 2);
});

test('les pays : les voisins de la France, les océans', () => {
  const neighbours = ['Belgique', 'Luxembourg', 'Allemagne', 'Suisse', 'Italie', 'Espagne', 'Andorre', 'Monaco'];
  // voisins par la mer ou par l'outre-mer : jamais proposés
  const tricky = ['Royaume-Uni', 'Pays-Bas', 'Brésil', 'Suriname'];
  const seen = new Set();
  for (const q of draw('pays', 7)) {
    checkChoices(q, 3);
    assert.ok(neighbours.includes(q.answer), q.answer);
    for (const v of values(q)) {
      assert.ok(!tricky.includes(v), v);
      if (v !== q.answer) assert.ok(!neighbours.includes(v), `${v} est aussi un voisin`);
    }
    assert.ok(q.success.speak.includes('voisin de la France'));
    seen.add(q.answer);
  }
  assert.equal(seen.size, 6, 'tous les voisins sont demandés');
  const oceans = ['Atlantique', 'Pacifique', 'Indien', 'Arctique', 'Austral'];
  const expected = [
    ['l’Europe et l’Amérique', 'Atlantique'], ['La France', 'Atlantique'], ['l’Asie et l’Amérique', 'Pacifique'],
    ['plus grand océan', 'Pacifique'], ['l’Afrique et l’Australie', 'Indien'], ['pôle Nord', 'Arctique'], ['l’Antarctique', 'Austral'],
  ];
  for (const q of draw('pays', 8)) {
    checkChoices(q, 3);
    for (const v of values(q)) assert.ok(oceans.includes(v), v);
    const [, answer] = expected.find(([clue]) => q.text.includes(clue));
    assert.equal(q.answer, answer, q.text);
    assert.ok(q.success.speak.endsWith(`océan ${answer}.`), q.success.speak);
  }
});

test('les drapeaux : lire les couleurs, reconnaître un drapeau effacé', () => {
  const describe = (c) => `${FLAGS[c].bands.dir}:${FLAGS[c].bands.colors.join('-')}`;
  for (const q of draw('drapeaux', 7)) {
    checkChoices(q, 3);
    const { dir, colors } = FLAGS[q.answer].bands;
    // le texte décrit la bonne réponse…
    assert.ok(q.text.startsWith(`Bandes ${dir === 'v' ? 'verticales' : 'horizontales'} : `), q.text);
    const said = q.text.split(' : ')[1].replace(/\.$/, '').split(/, | et /);
    assert.deepEqual(said, colors, q.text);
    // … et aucun autre drapeau proposé
    for (const v of values(q)) {
      assert.ok(FLAGS[v].bands, v);
      if (v !== q.answer) assert.notEqual(describe(v), describe(q.answer), q.key);
    }
  }
  for (const q of draw('drapeaux', 8)) {
    checkChoices(q, 3);
    const { code, hole, caption } = q.stage;
    assert.equal(code, q.answer);
    assert.equal(caption, undefined, 'le nom du pays n’est pas écrit');
    const visible = (c) => {
      const { dir, colors } = FLAGS[c].bands;
      return `${dir}:${colors.length}:${colors.map((col, i) => (i === hole.index ? '?' : col)).join('-')}`;
    };
    assert.deepEqual([hole.dir, hole.count], [FLAGS[code].bands.dir, FLAGS[code].bands.colors.length]);
    for (const v of values(q)) if (v !== code) assert.notEqual(visible(v), visible(code), `${v} ressemble trop : ${q.key}`);
    assert.ok(!/le [aeiouy]/.test(q.success.speak), q.success.speak);
  }
});
