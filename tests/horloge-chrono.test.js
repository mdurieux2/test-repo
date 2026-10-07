import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findGame } from '../app/js/games/index.js';
import {
  clockAdvice, dragHourHand, dragMinuteHand, fromClockMinutes, handAngles, pickHand, pointerAngle, regleHorloge, shiftClock,
  toClockMinutes,
} from '../app/js/games/horloge.js';
import {
  CHRONO_QUESTIONS, chronoLevelAfter, elapsedSeconds, formatChrono, questionsPerSession, recordAfter, spokenChrono, tablesChrono,
} from '../app/js/games/chrono.js';
import { clockLabel } from '../app/js/games/maths-extra.js';
import { levelRange } from '../app/js/programs.js';
import { createRng } from '../app/js/random.js';
import { addChild, defaultStore, loadStore, resetChild, saveStore } from '../app/js/storage.js';

const t = (h, m) => toClockMinutes({ h, m });
const show = (time) => {
  const { h, m } = fromClockMinutes(time);
  return `${h} h ${String(m).padStart(2, '0')}`;
};

// ---------------------------------------------------------------- Règle l'horloge

test('horloge : heures de 1 à 12, on passe de 12 h 55 à 1 h et de 1 h à 12 h', () => {
  assert.deepEqual(fromClockMinutes(t(12, 0)), { h: 12, m: 0 });
  assert.equal(show(shiftClock(t(12, 55), 5)), '1 h 00');
  assert.equal(show(shiftClock(t(1, 0), -60)), '12 h 00');
  assert.equal(show(shiftClock(t(11, 30), 60)), '12 h 30');
  assert.equal(show(shiftClock(t(3, 0), -5)), '2 h 55');
});

test('horloge : la petite aiguille est dessinée de façon réaliste (h + m/60)', () => {
  assert.deepEqual(handAngles(t(3, 0)), { hour: 90, minute: 0 });
  assert.deepEqual(handAngles(t(3, 30)), { hour: 105, minute: 180 });
  assert.deepEqual(handAngles(t(12, 45)), { hour: 22.5, minute: 270 });
  assert.equal(pointerAngle(0, -10), 0);
  assert.equal(pointerAngle(10, 0), 90);
  assert.equal(pointerAngle(0, 10), 180);
  assert.equal(pointerAngle(-10, 0), 270);
});

test('horloge : la grande aiguille se cale de 5 en 5 et fait avancer ou reculer l’heure en passant le 12', () => {
  assert.equal(show(dragMinuteHand(t(3, 0), 47)), '3 h 10', 'calée sur 10 minutes');
  assert.equal(show(dragMinuteHand(t(3, 0), 92)), '3 h 15');
  assert.equal(show(dragMinuteHand(t(3, 10), 3)), '3 h 00', 'revenir au 12 sans le passer');
  // en avançant : 2 h 50 → le 12 → 3 h 00, puis 3 h 10
  let time = t(2, 50);
  for (const angle of [315, 330, 345, 0, 15, 30, 60]) time = dragMinuteHand(time, angle);
  assert.equal(show(time), '3 h 10');
  // en reculant : 3 h 05 → le 12 → 2 h 55, puis 2 h 45
  time = t(3, 5);
  for (const angle of [15, 0, 345, 330, 300, 270]) time = dragMinuteHand(time, angle);
  assert.equal(show(time), '2 h 45');
  // autour de midi : 12 h 55 → 1 h 00 ; 1 h 00 → 12 h 55
  assert.equal(show(dragMinuteHand(t(12, 55), 1)), '1 h 00');
  assert.equal(show(dragMinuteHand(t(1, 0), 330)), '12 h 55');
  // deux tours complets dans le même sens : deux heures de plus
  time = t(6, 0);
  for (let turn = 0; turn < 2; turn++) for (let angle = 30; angle <= 360; angle += 30) time = dragMinuteHand(time, angle % 360);
  assert.equal(show(time), '8 h 00');
});

test('horloge : la petite aiguille se place sur l’heure, les minutes ne bougent pas', () => {
  assert.equal(show(dragHourHand(t(3, 0), 180)), '6 h 00');
  assert.equal(show(dragHourHand(t(3, 0), 8)), '12 h 00');
  assert.equal(show(dragHourHand(t(5, 20), 278)), '9 h 20');
  // à 3 h 45, la petite aiguille est presque sur le 4 : la lâcher là garde 3 h 45
  assert.equal(show(dragHourHand(t(3, 45), 120)), '3 h 45');
  assert.equal(show(dragHourHand(t(3, 45), 150)), '4 h 45');
});

test('horloge : on attrape l’aiguille la plus proche du doigt', () => {
  // à 3 h : petite aiguille sur le 3 (90°), grande sur le 12 (0°)
  assert.equal(pickHand(t(3, 0), 10, 30), 'minute');
  assert.equal(pickHand(t(3, 0), 80, 30), 'hour');
  assert.equal(pickHand(t(3, 0), 200, 30), 'hour');
  // aiguilles superposées (12 h) : la grande au bord du cadran, la petite près du centre
  assert.equal(pickHand(t(12, 0), 0, 35), 'minute');
  assert.equal(pickHand(t(12, 0), 0, 15), 'hour');
});

test('horloge : le conseil dit quelle aiguille regarder', () => {
  assert.equal(clockAdvice(t(3, 30), t(3, 15)), 'La grande aiguille montre les minutes.');
  assert.equal(clockAdvice(t(4, 15), t(3, 15)), 'La petite aiguille montre les heures.');
  assert.match(clockAdvice(t(12, 15), t(3, 0)), /grande aiguille montre les minutes, la petite les heures/);
});

function* clockQuestions(level, runs = 300) {
  const rng = createRng(77 + level);
  for (let i = 0; i < runs; i++) yield regleHorloge.generate(level, rng, i);
}

test('règle l’horloge : 8 niveaux aux libellés courts, minutes de chaque niveau', () => {
  assert.equal(regleHorloge.levels.length, 8);
  for (const label of regleHorloge.levels) assert.ok([...label].length <= 26, label);
  assert.equal(findGame('regle-horloge').domain, 'temps');
  assert.equal(findGame('regle-horloge').section, 'L’heure et le calendrier');
  const allowed = { 1: [0], 2: [0, 30], 3: [0, 15, 30, 45] };
  for (const [level, minutes] of Object.entries(allowed)) {
    for (const q of clockQuestions(Number(level))) assert.ok(minutes.includes(q.target.m), `niveau ${level} : ${q.answer}`);
  }
  for (const q of clockQuestions(1)) assert.equal(q.stage.start.m, 0, 'niveau 1 : on ne règle que la petite aiguille');
  assert.ok([...clockQuestions(4)].some((q) => ![0, 15, 30, 45].includes(q.target.m)), 'niveau 4 : de 5 en 5 minutes');
});

test('règle l’horloge : « Dans 1 heure… », « Il y a 30 minutes… » donnent la bonne heure', () => {
  const seen = new Set();
  for (const q of clockQuestions(5)) {
    seen.add(q.shift);
    // le cadran part de l'heure qu'il est ; il faut régler l'heure calculée
    assert.equal(toClockMinutes(q.target), shiftClock(toClockMinutes(q.stage.start), q.shift), q.text);
    assert.ok(q.text.startsWith(`Il est ${clockLabel(q.stage.start.h, q.stage.start.m)}.`), q.text);
    assert.match(q.text, q.shift > 0 ? /Dans .*sera-t-il/ : /Il y a .*était-il/);
  }
  for (const shift of [60, 30, -30, -60]) assert.ok(seen.has(shift), `décalage ${shift} jamais tiré`);
  // exemples : 11 h 45 + 30 min = 12 h 15 ; 12 h 30 + 1 h = 1 h 30 ; 1 h 15 − 30 min = 12 h 45
  assert.equal(show(shiftClock(t(11, 45), 30)), '12 h 15');
  assert.equal(show(shiftClock(t(12, 30), 60)), '1 h 30');
  assert.equal(show(shiftClock(t(1, 15), -30)), '12 h 45');
});

test('règle l’horloge : l’après-midi, « 15 h » se règle sur 3 h', () => {
  for (const q of clockQuestions(6)) {
    const said = Number(q.text.match(/sur (\d+) h/)[1]);
    assert.ok(said >= 13 && said <= 23, q.text);
    assert.equal(said, q.hour24, q.text);
    assert.equal(q.target.h, said - 12, q.text);
    assert.match(q.success.speak, /de l’après-midi/);
  }
});

// ---------------------------------------------------------------- Défi chrono des tables

test('défi chrono : une partie fait toujours 10 questions, quel que soit le réglage', () => {
  assert.equal(CHRONO_QUESTIONS, 10);
  for (const setting of [5, 10, 15]) assert.equal(questionsPerSession(tablesChrono, undefined, setting), 10);
  assert.equal(questionsPerSession(findGame('tables'), undefined, 15), 15, 'les autres jeux suivent le réglage');
  assert.equal(questionsPerSession(findGame('tables'), 5, 15), 5, 'défi du jour et révisions : 5 questions');
  assert.equal(findGame('tables-chrono').domain, 'maths');
  assert.deepEqual(levelRange('CE1', 'tables-chrono'), { min: 1, max: 8 });
});

test('défi chrono : multiplications justes, au pavé, et le nombre qui manque', () => {
  for (let level = 1; level <= tablesChrono.levels.length; level++) {
    const rng = createRng(500 + level);
    for (let i = 0; i < 200; i++) {
      const q = tablesChrono.generate(level, rng, i);
      assert.equal(q.interaction, 'keypad');
      assert.ok(String(q.answer).length <= q.maxDigits, q.key);
      if (level !== 6) {
        assert.equal(q.stage.a * q.stage.b, q.answer, q.key);
      } else {
        const [x, , y, , product] = q.stage.parts;
        assert.equal((x ?? q.answer) * (y ?? q.answer), product, q.key);
        assert.equal(q.stage.parts.filter((p) => p === null).length, 1, q.key);
      }
    }
  }
  // chaque niveau travaille ses tables
  const TABLES = { 1: [2, 5, 10], 2: [3, 4], 3: [6, 7], 4: [8, 9] };
  for (const [level, tables] of Object.entries(TABLES)) {
    const rng = createRng(9);
    for (let i = 0; i < 100; i++) {
      const q = tablesChrono.generate(Number(level), rng, i);
      assert.ok(tables.includes(q.stage.a) || tables.includes(q.stage.b), `niveau ${level} : ${q.key}`);
    }
  }
});

test('défi chrono : temps en mm:ss, dit à voix haute', () => {
  assert.equal(formatChrono(0), '00:00');
  assert.equal(formatChrono(42), '00:42');
  assert.equal(formatChrono(65), '01:05');
  assert.equal(formatChrono(600), '10:00');
  assert.equal(elapsedSeconds(1000, 43_900), 42, 'arrondi à la seconde inférieure, comme le chronomètre affiché');
  assert.equal(spokenChrono(42), '42 secondes');
  assert.equal(spokenChrono(61), 'une minute et une seconde');
  assert.equal(spokenChrono(125), '2 minutes et 5 secondes');
  assert.equal(spokenChrono(120), '2 minutes');
});

test('défi chrono : nouveau record seulement si le temps est meilleur', () => {
  const first = recordAfter({}, 'tables-chrono', 2, 50);
  assert.deepEqual({ isNew: first.isNew, best: first.best, previous: first.previous }, { isNew: true, best: 50, previous: null });
  assert.deepEqual(first.records, { 'tables-chrono': { 2: 50 } });
  const slower = recordAfter(first.records, 'tables-chrono', 2, 61);
  assert.equal(slower.isNew, false);
  assert.equal(slower.best, 50);
  assert.deepEqual(slower.records, first.records, 'le record est conservé');
  const same = recordAfter(first.records, 'tables-chrono', 2, 50);
  assert.equal(same.isNew, false, 'un temps égal ne bat pas le record');
  const faster = recordAfter(first.records, 'tables-chrono', 2, 38);
  assert.deepEqual({ isNew: faster.isNew, best: faster.best, previous: faster.previous }, { isNew: true, best: 38, previous: 50 });
  // un record par niveau ; les records reçus ne sont pas modifiés
  const other = recordAfter(faster.records, 'tables-chrono', 5, 90);
  assert.equal(other.isNew, true);
  assert.deepEqual(other.records, { 'tables-chrono': { 2: 38, 5: 90 } });
  assert.deepEqual(first.records, { 'tables-chrono': { 2: 50 } });
});

test('défi chrono : le niveau est fixe pendant la partie, ajusté à la fin', () => {
  assert.equal(chronoLevelAfter(2, 10, 10, 1, 6), 3);
  assert.equal(chronoLevelAfter(2, 9, 10, 1, 6), 3);
  assert.equal(chronoLevelAfter(2, 8, 10, 1, 6), 2);
  assert.equal(chronoLevelAfter(2, 5, 10, 1, 6), 1);
  assert.equal(chronoLevelAfter(6, 10, 10, 1, 6), 6, 'pas au-delà du programme');
  assert.equal(chronoLevelAfter(1, 2, 10, 1, 6), 1);
});

function memoryStorage() {
  const data = {};
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = String(v); }, removeItem: (k) => { delete data[k]; } };
}

test('défi chrono : le record est conservé sur le profil (et effacé avec la progression)', () => {
  const storage = memoryStorage();
  const store = defaultStore();
  const id = addChild(store, { name: 'Léa', grade: 'CE1' });
  assert.deepEqual(store.profiles[id].records, {});
  store.profiles[id].records = { 'tables-chrono': { 1: 42, 2: 'abc', 3: -5 }, abime: 7 };
  saveStore(store, storage);
  const loaded = loadStore(storage);
  assert.deepEqual(loaded.profiles[id].records, { 'tables-chrono': { 1: 42 } }, 'les valeurs abîmées sont écartées');
  saveStore(loaded, storage);
  assert.deepEqual(loadStore(storage).profiles[id].records, { 'tables-chrono': { 1: 42 } });
  // profil enregistré avant les records : rien ne casse
  const old = memoryStorage();
  old.setItem('lire-et-compter:v2', JSON.stringify({ order: ['lou'], profiles: { lou: { name: 'Lou', grade: 'CE1' } } }));
  assert.deepEqual(loadStore(old).profiles.lou.records, {});
  resetChild(loaded, id);
  assert.deepEqual(loaded.profiles[id].records, {});
  assert.equal(loaded.profiles[id].name, 'Léa');
});
