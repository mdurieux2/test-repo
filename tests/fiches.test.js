// Fiches à imprimer (F22) : pour chaque jeu imprimable, une fiche se fabrique à chaque niveau
// proposé, avec 6 à 12 exercices différents et des corrigés justes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GAMES, findGame } from '../app/js/games/index.js';
import { createRng } from '../app/js/random.js';
import { equationHolds } from '../app/js/games/maths.js';
import { canMove } from '../app/js/games/labyrinthes.js';
import { mirrorCell } from '../app/js/games/logique.js';
import {
  FICHE_MAX, FICHE_MIN, FICHE_NIVEAUX, NON_IMPRIMABLES, answerText, exerciseFrom, ficheGames, ficheLevels, isPrintable, makeFiche, paperText,
} from '../app/js/fiches.js';

const SEEDS = [11, 2026, 777];

/** Le corrigé d'un exercice est cohérent avec ses données. */
function checkExercise(ex, ctx) {
  assert.ok(typeof ex.text === 'string', `consigne : ${ctx}`);
  assert.ok(answerText(ex).length > 0, `corrigé vide : ${ctx}`);
  assert.notEqual(ex.stage.type, 'listen', `question à écouter : ${ctx}`);
  switch (ex.kind) {
    case 'choice':
      assert.ok(ex.answer >= 0 && ex.answer < ex.choices.length, ctx);
      break;
    case 'number':
    case 'column':
      assert.ok(Number.isInteger(ex.answer) && ex.answer >= 0, ctx);
      if (ex.kind === 'column') {
        const { op, rows } = ex.stage;
        const expected = op === '+' ? rows.reduce((a, b) => a + b, 0) : rows.slice(1).reduce((a, b) => a - b, rows[0]);
        assert.equal(ex.answer, expected, ctx);
        assert.ok(String(ex.answer).length <= ex.stage.width, ctx);
      }
      break;
    case 'fill':
      for (const eq of ex.equations) assert.ok(equationHolds(eq, ...eq.solution), ctx);
      assert.deepEqual([...ex.tiles].sort((a, b) => a - b), ex.equations.flatMap((e) => e.solution).sort((a, b) => a - b), ctx);
      break;
    case 'match':
      assert.deepEqual(ex.rights.map(String).sort(), ex.pairs.map((p) => String(p.right)).sort(), ctx);
      break;
    case 'order': {
      const values = ex.sorted.map((it) => it.value);
      const sorted = [...values].sort((a, b) => a - b);
      assert.ok(String(values) === String(sorted) || String(values) === String(sorted.reverse()), `ordre faux : ${ctx}`);
      assert.equal(ex.sorted.length, ex.items.filter((it) => it.value !== null).length, ctx);
      if (ex.mode === 'write') assert.ok(ex.answer.length > 0, ctx);
      break;
    }
    case 'clock': {
      const [, hh, mm = '0'] = ex.answer.match(/^(\d+) h(?: (\d+))?$/);
      assert.equal(Number(hh) % 12, ex.target.h % 12, ctx);
      assert.equal(Number(mm), ex.target.m, ctx);
      break;
    }
    case 'sudoku': {
      const { puzzle, solution, size } = ex.stage;
      assert.equal(solution.length, size * size, ctx);
      puzzle.forEach((v, i) => { if (v !== null) assert.equal(v, solution[i], ctx); });
      assert.ok(puzzle.some((v) => v === null), ctx);
      break;
    }
    case 'maze': {
      const { open, cols, start, goal, solution } = ex.stage;
      assert.equal(solution[0], start, ctx);
      assert.equal(solution.at(-1), goal, ctx);
      for (let i = 1; i < solution.length; i++) assert.ok(canMove(open, cols, solution[i - 1], solution[i]), ctx);
      break;
    }
    case 'symmetry': {
      const { model, solution, cols, rows, axis, mode } = ex.stage;
      assert.ok(model.length > 0 && solution.length > 0, ctx);
      // symétrie : le reflet du modèle (les copies, décalées, agrandies… sont vérifiées par leurs propres tests)
      if (!mode) assert.deepEqual(model.map((c) => mirrorCell(c, cols, rows, axis)).sort((a, b) => a - b), [...solution].sort((a, b) => a - b), ctx);
      break;
    }
    case 'picross':
      assert.ok(ex.stage.solution.length > 0 && ex.answer, ctx);
      break;
    case 'dots':
      assert.equal(ex.stage.points.length, ex.stage.labels.length, ctx);
      break;
    case 'trace':
      assert.ok(ex.stage.strokes.length > 0, ctx);
      break;
    default:
      assert.fail(`forme inconnue ${ex.kind} : ${ctx}`);
  }
}

test('fiches : chaque jeu imprimable a une fiche à chaque niveau proposé (6 à 12 exercices, corrigés justes)', () => {
  const printable = ficheGames();
  assert.ok(printable.length >= 70, `${printable.length} jeux imprimables`);
  for (const game of printable) {
    const levels = ficheLevels(game);
    assert.ok(levels.length >= 2, `${game.id} : niveaux imprimables`);
    for (const level of levels) {
      for (const seed of SEEDS) {
        const ctx = `${game.id} niveau ${level} (graine ${seed})`;
        const fiche = makeFiche(game, level, { seed, name: 'Léa', season: 'automne' });
        assert.ok(fiche, `pas de fiche : ${ctx}`);
        assert.ok(fiche.exercises.length >= FICHE_MIN && fiche.exercises.length <= FICHE_MAX, `${fiche.exercises.length} exercices : ${ctx}`);
        assert.ok(fiche.consigne.length > 0 && fiche.title === game.title && fiche.levelLabel === game.levels[level - 1], ctx);
        fiche.exercises.forEach((ex, i) => checkExercise(ex, `${ctx}, exercice ${i + 1}`));
        // tous différents, sauf les lignes d'écriture (un prénom court se recopie)
        const kinds = new Set(fiche.exercises.map((e) => e.kind));
        if (!kinds.has('trace')) {
          const keys = fiche.exercises.map((e) => JSON.stringify([e.key, e.text, e.stage, e.choices?.map((c) => c.value), e.items?.map((it) => it.value)]));
          assert.equal(new Set(keys).size, keys.length, `exercices en double : ${ctx}`);
        }
      }
    }
  }
});

test('fiches : l’exercice papier garde la réponse du jeu', () => {
  for (const game of ficheGames()) {
    for (const level of ficheLevels(game)) {
      const rng = createRng(4242 + level);
      for (let i = 0; i < 30; i++) {
        const q = game.generate(level, rng, i, { name: 'Léa' });
        const ex = exerciseFrom(q);
        const ctx = `${game.id} niveau ${level} : ${q.key}`;
        if (q.listenOnly || ['listen', 'flash', 'karaoke'].includes(q.stage.type)) {
          assert.equal(ex, null, `question à écouter imprimée : ${ctx}`);
          continue;
        }
        if (!ex) continue;
        if (ex.kind === 'choice') assert.equal(ex.choices[ex.answer].value, q.answer, ctx);
        if (ex.kind === 'number') assert.equal(ex.answer, q.answer, ctx);
        if (ex.kind === 'clock') assert.deepEqual(ex.target, q.target, ctx);
        if (ex.kind === 'order' && ex.mode === 'write' && typeof q.answer === 'string') assert.equal(ex.answer, q.answer, ctx);
        if (ex.kind === 'match') assert.deepEqual(ex.pairs.map((p) => p.right), q.pairs.map((p) => p.right), ctx);
        if (ex.kind === 'sudoku' || ex.kind === 'maze') assert.deepEqual(ex.stage.solution, q.stage.solution, ctx);
      }
    }
  }
});

test('fiches : les jeux qui ne s’impriment pas sont absents, la liste des niveaux est juste', () => {
  for (const id of NON_IMPRIMABLES) {
    assert.ok(findGame(id), `jeu inconnu : ${id}`);
    assert.equal(isPrintable(id), false, id);
    assert.deepEqual(ficheLevels(findGame(id)), [], id);
  }
  for (const [id, levels] of Object.entries(FICHE_NIVEAUX)) {
    const game = findGame(id);
    assert.ok(game && !NON_IMPRIMABLES.has(id), id);
    assert.ok(levels.every((l) => l >= 1 && l <= game.levels.length), id);
    assert.ok(levels.length < game.levels.length, `${id} : tous les niveaux sont listés, inutile de le garder`);
  }
  // des formes variées : choix, calcul, trous, relier, ranger, heure, sudoku, labyrinthe, écriture…
  const kinds = new Set();
  for (const game of ficheGames()) {
    const fiche = makeFiche(game, ficheLevels(game)[0], { seed: 5 });
    fiche.exercises.forEach((e) => kinds.add(e.kind));
  }
  for (const kind of ['choice', 'number', 'fill', 'match', 'order', 'clock', 'column', 'sudoku', 'maze', 'trace', 'dots', 'symmetry', 'picross']) {
    assert.ok(kinds.has(kind), `aucune fiche « ${kind} »`);
  }
  // au moins quelques jeux de sciences et du monde
  assert.ok(ficheGames().filter((g) => g.domain === 'sciences').length >= 8);
  assert.ok(ficheGames().filter((g) => g.domain === 'monde').length >= 4);
  assert.equal(GAMES.filter((g) => isPrintable(g.id)).length, ficheGames().length);
});

test('fiches : les consignes sont dites pour le papier (entourer, cocher, écrire)', () => {
  assert.equal(paperText('Touche le nombre le plus grand.'), 'Entoure le nombre le plus grand.');
  assert.equal(paperText('Lis les mots, et touche le bon.', 'Coche'), 'Lis les mots, et coche le bon.');
  assert.equal(paperText('Trace un trait avec ton doigt.'), 'Trace un trait.');
  for (const game of ficheGames()) {
    for (const level of [ficheLevels(game)[0], ficheLevels(game).at(-1)]) {
      const fiche = makeFiche(game, level, { seed: 9, name: 'Léa' });
      const texts = [fiche.consigne, ...fiche.exercises.map((e) => e.text)].join(' ');
      assert.doesNotMatch(texts, /\b[Tt]ouche\b|\b[Gg]lisse\b|ton doigt|\b[Éé]coute\b/, `${game.id} niveau ${level} : ${texts.slice(0, 200)}`);
    }
  }
});

test('fiches : le prénom vient du profil, jamais écrit en dur', () => {
  const fiche = makeFiche(findGame('problemes'), 3, { seed: 1, name: 'Zoé' });
  assert.ok(JSON.stringify(fiche.exercises).includes('Zoé'));
  for (const file of ['app/js/fiches.js', 'app/js/fiches-ecran.js']) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /Eva-Rose|Matteo/, file);
  }
});

test('fiches : feuille A4, impression en noir et blanc, rien d’autre à l’impression', () => {
  const css = readFileSync(new URL('../app/css/fiches.css', import.meta.url), 'utf8');
  assert.match(css, /@page\s*\{[^}]*size:\s*A4/);
  assert.match(css, /@media print/);
  assert.match(css, /\.fiche-page\s*\{[^}]*width:\s*210mm;[^}]*height:\s*297mm/);
  const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
  assert.match(html, /css\/fiches\.css/);
});
