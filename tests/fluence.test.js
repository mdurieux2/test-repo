// Lire à voix haute (fluence) : listes et textes, calcul du score (mots correctement lus par minute),
// étoiles, niveau suivant, scores gardés sur le profil, évolution semaine par semaine dans le suivi.
import './aides-dom.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { text, withClass } from './aides-dom.js';
import {
  FLUENCE_SECONDS, MOTS_COURTS, MOTS_DIFFICILES, MOTS_FREQUENTS, MOTS_LONGS, SYLLABES_COMPLEXES, SYLLABES_SIMPLES, TEXTES_FLUENCE,
  fluence, fluenceBenchmark, fluenceEntry, fluenceLevelAfter, fluenceList, fluenceScore, fluenceSeconds, fluenceStars,
  fluenceSummary, fluenceTime, fluenceTokens, fluenceWeeks, weekStart, wordReadings,
} from '../app/js/games/fluence.js';
import { findGame } from '../app/js/games/index.js';
import { levelRange, programFor } from '../app/js/programs.js';
import { dailyPicks, dueReviews, drawPool } from '../app/js/picks.js';
import {
  addChild, cleanFluence, defaultStore, FLUENCE_LIMIT, loadStore, logFluence, resetChild, saveStore, STORAGE_KEY,
} from '../app/js/storage.js';
import { fluenceCard } from '../app/js/dashboard.js';
import { createRng } from '../app/js/random.js';

const memory = () => {
  const data = {};
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
};

// ---------------------------------------------------------------- Données

test('fluence : le jeu est dans « Lire et écrire », avec 7 à 10 niveaux, au programme du CP et du CE1', () => {
  const game = findGame('fluence');
  assert.equal(game, fluence);
  assert.equal(game.domain, 'francais');
  assert.equal(game.title, 'Lire à voix haute');
  assert.ok(game.levels.length >= 7 && game.levels.length <= 10);
  assert.equal(game.questions, 1, 'une partie = une lecture');
  assert.equal(game.adult, true);
  assert.deepEqual(levelRange('CP', 'fluence').levels, [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(levelRange('CE1', 'fluence').levels, [5, 6, 7, 8, 9]);
  for (const grade of ['MS', 'GS']) {
    assert.ok(!programFor(grade).some((d) => d.games.some(({ game: g }) => g.id === 'fluence')), grade);
  }
});

test('fluence : réservoirs de syllabes et de mots sans doublon, assez grands pour une liste de 60', () => {
  for (const [name, pool] of Object.entries({ SYLLABES_SIMPLES, SYLLABES_COMPLEXES, MOTS_COURTS, MOTS_FREQUENTS, MOTS_LONGS, MOTS_DIFFICILES })) {
    assert.equal(new Set(pool).size, pool.length, `${name} : doublon`);
    assert.ok(pool.length >= 60, `${name} : ${pool.length}`);
    for (const w of pool) assert.match(w, /^[a-zàâçéèêëîïôûùüœ]+$/u, `${name} : « ${w} »`);
  }
  // syllabes simples : une consonne puis une voyelle
  for (const s of SYLLABES_SIMPLES) assert.equal(s.length, 2, s);
});

test('fluence : une liste de 60 sans le même élément deux fois de suite, même quand le réservoir est petit', () => {
  const rng = createRng(3);
  const list = fluenceList(rng, MOTS_COURTS);
  assert.equal(list.length, 60);
  assert.equal(new Set(list).size, 60, 'pas de répétition tant que le réservoir suffit');
  const small = fluenceList(rng, ['a', 'b', 'c'], 30);
  assert.equal(small.length, 30);
  for (let i = 1; i < small.length; i++) assert.notEqual(small[i], small[i - 1]);
});

test('fluence : les mots d’un texte (la ponctuation reste accrochée au mot d’avant)', () => {
  assert.deepEqual(fluenceTokens('Le chat a raté ! Il va sous l’arbre.'), ['Le', 'chat', 'a', 'raté !', 'Il', 'va', 'sous', 'l’arbre.']);
  assert.deepEqual(fluenceTokens('  Une voix répond : c’est la dame  '), ['Une', 'voix', 'répond :', 'c’est', 'la', 'dame']);
  // de plus en plus long d'un niveau à l'autre, au moins 3 textes par niveau, sans prénom d'enfant en dur
  const lengths = {};
  for (const t of TEXTES_FLUENCE) {
    (lengths[t.level] ||= []).push(fluenceTokens(t.text).length);
    assert.doesNotMatch(t.text, /Eva|Matteo|Mattéo/u);
    assert.ok(t.title && t.id);
  }
  assert.deepEqual(Object.keys(lengths), ['7', '8', '9']);
  for (const list of Object.values(lengths)) assert.ok(list.length >= 3);
  assert.ok(Math.min(...lengths[7]) >= 50 && Math.max(...lengths[7]) < Math.min(...lengths[8]));
  assert.ok(Math.max(...lengths[8]) < Math.min(...lengths[9]) && Math.min(...lengths[9]) >= 150, 'assez pour un bon lecteur de CE1');
  assert.equal(new Set(TEXTES_FLUENCE.map((t) => t.id)).size, TEXTES_FLUENCE.length);
});

test('fluence : syllabes, puis mots, puis textes ; Estelle dit la consigne, jamais les mots', () => {
  const kinds = fluence.levels.map((_, i) => fluence.generate(i + 1, createRng(i), 0).stage.kind);
  assert.deepEqual(kinds, ['syllabes', 'syllabes', 'mots', 'mots', 'mots', 'mots', 'texte', 'texte', 'texte']);
  for (let level = 1; level <= fluence.levels.length; level++) {
    for (let i = 0; i < 20; i++) {
      const q = fluence.generate(level, createRng(level * 100 + i), i);
      assert.equal(q.interaction, 'fluence');
      const said = [q.instruction, q.replay].flat().join(' ');
      assert.match(said, /à voix haute/);
      // aucun mot de la feuille n'est dit seul (c'est l'enfant qui lit)
      for (const part of [q.instruction, q.replay].flat()) assert.ok(!q.stage.tokens.includes(part), part);
      assert.equal(q.success, undefined);
      if (q.stage.kind === 'texte') {
        const t = TEXTES_FLUENCE.find((x) => x.title === q.stage.title);
        assert.equal(t.level, level);
        assert.deepEqual(q.stage.tokens, fluenceTokens(t.text));
      } else {
        assert.equal(q.stage.tokens.length, 60);
        assert.equal(q.stage.title, null);
      }
    }
  }
});

// ---------------------------------------------------------------- Score

test('fluence : mots correctement lus par minute (MCLM)', () => {
  // une minute pleine : 10 mots lus (jusqu'au 10e), 2 ratés → 8
  assert.deepEqual(fluenceScore({ total: 60, missed: [1, 3], last: 9, seconds: 60 }),
    { total: 60, read: 10, errors: 2, correct: 8, seconds: 60, mclm: 8, accuracy: 0.8, allRead: false });
  // un mot raté après le dernier mot lu ne compte pas ; les doublons non plus
  assert.equal(fluenceScore({ total: 60, missed: [3, 3, 20], last: 9 }).errors, 1);
  // tout lu en 40 secondes : ramené à une minute
  const fast = fluenceScore({ total: 55, missed: [0], last: 54, seconds: 40 });
  assert.equal(fast.correct, 54);
  assert.equal(fast.mclm, 81);
  assert.equal(fast.allRead, true);
  // aucun mot lu
  const none = fluenceScore({ total: 60, missed: [], last: -1 });
  assert.equal(none.read, 0);
  assert.equal(none.mclm, 0);
  assert.equal(none.accuracy, 0);
  // durée jamais nulle ; dernier mot au-delà de la liste : la liste entière
  assert.equal(fluenceScore({ total: 5, last: 99, seconds: 0 }).seconds, 1);
  assert.equal(fluenceScore({ total: 5, last: 99, seconds: 30 }).read, 5);
});

test('fluence : la durée comptée (une minute, ou le temps réel si tout est lu, ou sans chrono)', () => {
  assert.equal(fluenceSeconds({ timed: true, allRead: false, elapsed: 60 }), FLUENCE_SECONDS);
  assert.equal(fluenceSeconds({ timed: true, allRead: false, elapsed: 25 }), 60, 'arrêté avant la fin : la minute compte');
  assert.equal(fluenceSeconds({ timed: true, allRead: true, elapsed: 42.4 }), 42.4);
  assert.equal(fluenceSeconds({ timed: true, allRead: true, elapsed: 75 }), 60);
  assert.equal(fluenceSeconds({ timed: false, allRead: false, elapsed: 95 }), 95, 'lecture libre : le temps réel');
  assert.equal(fluenceSeconds({ timed: false, allRead: true, elapsed: 0 }), 1);
  assert.equal(fluenceTime(60), '1 minute');
  assert.equal(fluenceTime(45), '45 s');
  assert.equal(fluenceTime(95), '1 min 35 s');
  assert.equal(fluenceTime(120), '2 minutes');
});

test('fluence : jamais moins de 2 étoiles ; 3 avec presque aucune erreur', () => {
  assert.equal(fluenceStars(fluenceScore({ total: 60, missed: [1, 3], last: 9 })), 2);
  assert.equal(fluenceStars(fluenceScore({ total: 60, missed: [1], last: 9 })), 3);
  assert.equal(fluenceStars(fluenceScore({ total: 60, missed: [0, 1, 2, 3, 4], last: 5 })), 2);
  assert.equal(fluenceStars(fluenceScore({ total: 60, last: -1 })), 2);
});

test('fluence : le niveau suivant (monter avec aisance, redescendre si trop de mots ratés)', () => {
  const at = (missed, last, seconds = 60) => fluenceScore({ total: 60, missed, last, seconds });
  assert.equal(fluenceLevelAfter(3, at([], 39), 1, 7), 4, '40 mots sans erreur');
  assert.equal(fluenceLevelAfter(7, at([], 39), 1, 7), 7, 'pas au-delà de la classe');
  assert.equal(fluenceLevelAfter(3, at([], 19), 1, 7), 3, 'sans erreur mais lentement : on reste');
  assert.equal(fluenceLevelAfter(3, fluenceScore({ total: 20, last: 19, seconds: 50 }), 1, 7), 4, 'tout lu sans erreur');
  assert.equal(fluenceLevelAfter(3, at([1, 3], 9), 1, 7), 3);
  assert.equal(fluenceLevelAfter(3, at([1, 3, 5], 9), 1, 7), 2, '3 ratés sur 10');
  assert.equal(fluenceLevelAfter(4, at([1, 3, 5], 9), 4, 9), 4, 'pas en dessous de la classe');
  assert.equal(fluenceLevelAfter(3, at([], -1), 1, 7), 3, 'rien lu : on ne bouge pas');
});

// ---------------------------------------------------------------- Scores gardés par enfant

test('fluence : les lectures sont gardées sur le profil, nettoyées au chargement, effacées avec la progression', () => {
  const store = defaultStore();
  const id = addChild(store, { name: 'Zoé', grade: 'CP' });
  assert.deepEqual(store.profiles[id].fluence, []);
  const score = fluenceScore({ total: 60, missed: [1, 3], last: 9 });
  const entry = fluenceEntry({ at: '2026-10-08T10:00:00.000Z', level: 3, kind: 'mots', timed: true, score });
  assert.deepEqual(entry, { at: '2026-10-08T10:00:00.000Z', level: 3, kind: 'mots', timed: true, total: 60, read: 10, errors: 2, correct: 8, seconds: 60, mclm: 8 });
  logFluence(store.profiles[id], entry);
  store.profiles[id].fluence.push({ at: 'pas une date', mclm: 3, read: 1, errors: 0, correct: 1 }, { at: '2026-10-08T11:00:00Z', mclm: -1, read: 1, errors: 0, correct: 1 }, null);
  const storage = memory();
  saveStore(store, storage);
  const loaded = loadStore(storage);
  assert.deepEqual(loaded.profiles[id].fluence, [entry], 'les lectures abîmées sont écartées');
  assert.ok(JSON.parse(storage.getItem(STORAGE_KEY)).profiles[id].fluence.length >= 1);
  // un ancien profil (sans lectures) se charge avec une liste vide
  assert.deepEqual(cleanFluence(undefined), []);
  // limite
  const kid = { fluence: [] };
  for (let i = 0; i < FLUENCE_LIMIT + 5; i++) logFluence(kid, { ...entry, mclm: i });
  assert.equal(kid.fluence.length, FLUENCE_LIMIT);
  assert.equal(kid.fluence.at(-1).mclm, FLUENCE_LIMIT + 4);
  resetChild(loaded, id);
  assert.deepEqual(loaded.profiles[id].fluence, []);
});

test('fluence : jamais tiré dans le défi du jour, les révisions ni les parties à deux', () => {
  for (const grade of ['CP', 'CE1']) {
    assert.ok(!drawPool({ grade }).some(({ game }) => game.id === 'fluence'), grade);
    for (let day = 1; day <= 30; day++) assert.ok(!dailyPicks({ grade }, `2026-10-${day}:x`).some(({ game }) => game.id === 'fluence'));
  }
  const review = { fluence: { level: 3, due: '2026-10-01', step: 0 }, compter: { level: 1, due: '2026-10-01', step: 0 } };
  assert.deepEqual(dueReviews({ grade: 'CP', review }, '2026-10-03').map(([id]) => id), ['compter']);
});

// ---------------------------------------------------------------- Suivi des parents

test('fluence : semaine par semaine, dernier et meilleur score', () => {
  const now = new Date('2026-10-08T18:00:00').getTime(); // un jeudi
  assert.equal(weekStart(now).getDay(), 1, 'la semaine commence le lundi');
  assert.equal(weekStart(now).getDate(), 5);
  const at = (d, mclm, kind = 'mots') => ({ at: new Date(`2026-${d}T10:00:00`).toISOString(), mclm, kind, read: mclm, errors: 0, correct: mclm });
  const scores = [at('09-15', 20), at('09-17', 26), at('09-29', 31), at('10-06', 35), at('10-07', 33)];
  const weeks = fluenceWeeks(scores, now);
  assert.equal(weeks.length, 4, 'depuis la semaine de la première lecture');
  assert.deepEqual(weeks.map((w) => w.best), [26, null, 31, 35]);
  assert.deepEqual(weeks.map((w) => w.last), [26, null, 31, 33]);
  assert.deepEqual(weeks.map((w) => w.readings), [2, 0, 1, 2]);
  assert.equal(weeks.at(-1).start.getDate(), 5);
  assert.equal(fluenceWeeks(scores, now, 2).length, 2, 'au plus le nombre de semaines demandé');
  assert.equal(fluenceWeeks([], now).length, 1);
  const summary = fluenceSummary(scores);
  assert.equal(summary.last.mclm, 33);
  assert.equal(summary.best.mclm, 35);
  assert.equal(summary.count, 5);
  assert.equal(fluenceSummary([]), null);
  assert.deepEqual(wordReadings([at('10-01', 40, 'syllabes'), at('10-02', 20)]).map((s) => s.mclm), [20]);
});

test('fluence : un repère bienveillant pour la classe (pas pour la maternelle)', () => {
  assert.match(fluenceBenchmark('CP'), /environ 50 mots par minute en fin de CP/);
  assert.match(fluenceBenchmark('CE1'), /environ 70 à 90 mots par minute en fin de CE1/);
  for (const grade of ['CP', 'CE1']) assert.match(fluenceBenchmark(grade), /indicatif.*chaque enfant avance à son rythme/s);
  assert.equal(fluenceBenchmark('MS'), null);
  assert.equal(fluenceBenchmark('GS'), null);
});

test('fluence : la carte du suivi (valeurs écrites, une phrase par semaine pour les lecteurs d’écran)', () => {
  const now = new Date('2026-10-08T18:00:00').getTime();
  const empty = fluenceCard({ fluence: [] }, 'CP', now);
  assert.match(text(empty), /Pas encore de lecture/);
  assert.match(text(empty), /50 mots par minute/);
  const at = (d, mclm, kind = 'mots') => ({ at: new Date(`2026-${d}T10:00:00`).toISOString(), mclm, kind, read: mclm, errors: 0, correct: mclm });
  const card = fluenceCard({ fluence: [at('09-30', 12, 'syllabes'), at('09-29', 31), at('10-06', 35), at('10-07', 33)] }, 'CE1', now);
  const all = text(card);
  assert.match(all, /Dernier score33 \/ min/);
  assert.match(all, /Meilleur score35 \/ min/);
  assert.match(all, /3 lectures · dernière lecture : [^(]+ \(33 mots lus, 0 raté\)\./, 'les syllabes sont à part');
  assert.match(all, /Syllabes : dernier score 12 par minute/);
  assert.match(all, /70 à 90 mots par minute/);
  const weeks = withClass(card, 'fl-week');
  assert.equal(weeks.length, 2);
  assert.match(text(weeks[0]), /Semaine du 28 septembre : meilleur score 31 mots par minute \(1 lecture\)\./);
  assert.match(text(weeks[1]), /Semaine du 5 octobre : meilleur score 35 mots par minute \(2 lectures\)\./);
  assert.deepEqual(withClass(card, 'fl-week-value').map(text), ['31', '35'], 'la valeur est écrite au-dessus de chaque barre');
  // seulement des syllabes : le suivi parle de syllabes
  const syll = fluenceCard({ fluence: [at('10-06', 22, 'syllabes')] }, 'CP', now);
  assert.match(text(syll), /Syllabes correctement lues par minute/);
});
