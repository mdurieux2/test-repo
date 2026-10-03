import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROGRAMS, programFor, levelRange } from '../app/js/programs.js';
import { findGame } from '../app/js/games/index.js';
import { GRADES } from '../app/js/storage.js';
import { dayKey, frequentMistakes, lastSevenDays, skillStatus, streakDays } from '../app/js/dashboard.js';

test('chaque classe a un programme dans les 7 rubriques', () => {
  assert.deepEqual(Object.keys(PROGRAMS), Object.keys(GRADES));
  for (const grade of Object.keys(GRADES)) {
    assert.deepEqual(programFor(grade).map((d) => d.id), ['francais', 'histoires', 'maths', 'jeux', 'temps', 'monde', 'anglais'], grade);
  }
});

test('les programmes ne citent que des jeux et des niveaux qui existent', () => {
  for (const [grade, domains] of Object.entries(PROGRAMS)) {
    for (const [domain, entries] of Object.entries(domains)) {
      for (const [id, min, max] of entries) {
        const game = findGame(id);
        assert.ok(game, `${grade} : jeu inconnu ${id}`);
        assert.equal(game.domain, domain, `${grade} : ${id} n'est pas en ${domain}`);
        assert.ok(min >= 1 && min <= max && max <= game.levels.length, `${grade} ${id} : niveaux ${min}-${max}`);
      }
    }
  }
});

test('la maternelle ne fait ni lecture de mots ni grands nombres', () => {
  const ms = programFor('MS').flatMap((d) => d.games.map((g) => g.game.id));
  for (const id of ['bon-mot', 'petits-mots', 'dizaines', 'tables', 'calcul']) assert.ok(!ms.includes(id), id);
  assert.deepEqual(levelRange('GS', 'calcul'), { min: 1, max: 6 });
  assert.deepEqual(levelRange('CE1', 'tables'), { min: 1, max: 6 });
});

test('suivi : activité des 7 derniers jours et jours d’affilée', () => {
  const now = new Date('2026-10-03T18:00:00').getTime();
  const day = (d, seconds = 300) => ({ at: new Date(`2026-10-0${d}T10:00:00`).toISOString(), correct: 8, total: 10, seconds });
  const history = [day(1), day(2), day(3), day(3, 120)];
  const days = lastSevenDays(history, now);
  assert.equal(days.length, 7);
  assert.equal(days.at(-1).key, dayKey(now));
  assert.equal(days.at(-1).sessions, 2);
  assert.equal(days.at(-1).minutes, 7);
  assert.equal(streakDays(history, now), 3);
  assert.equal(streakDays([day(1), day(2)], now), 2, 'la série reste active si on a joué hier');
  assert.equal(streakDays([day(1)], now), 0);
});

test('suivi : état des compétences et erreurs fréquentes', () => {
  assert.equal(skillStatus({ answered: 0, correct: 0, level: 1 }, 3), 'todo');
  assert.equal(skillStatus({ answered: 20, correct: 18, level: 3 }, 3), 'done');
  assert.equal(skillStatus({ answered: 20, correct: 18, level: 2 }, 3), 'doing');
  const mistakes = [
    { game: 'lettres', expected: 'b', given: 'd' }, { game: 'lettres', expected: 'b', given: 'd' },
    { game: 'calcul', expected: 15, given: 14 }, { game: 'calcul', expected: null, given: '8 + 1 → 7' },
  ];
  const top = frequentMistakes(mistakes);
  assert.equal(top[0].count, 2);
  assert.equal(top.length, 2);
});
