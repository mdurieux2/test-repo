import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState, palierStarsAfter, recordAnswer, starsFor, LEVEL_UP_STREAK } from '../app/js/progress.js';
import { createRng, randInt, sample, shuffle } from '../app/js/random.js';
import { newStickers, starsToNextSticker, stickersUnlocked, STICKERS, STARS_PER_STICKER } from '../app/js/rewards.js';
import {
  addChild, cleanName, defaultStore, gameStats, GRADES, loadStore, logMistake, logSession, MAX_CHILDREN, NAME_MAX,
  removeChild, resetChild, saveStore, slugify, STORAGE_KEY,
} from '../app/js/storage.js';

function play(state, answers, maxLevel = 3) {
  const changes = [];
  for (const ok of answers) {
    const r = recordAnswer(state, ok, maxLevel);
    state = r.state;
    changes.push(r.change);
  }
  return { state, changes };
}

test('monte de niveau après 5 bonnes réponses du premier coup', () => {
  const { state, changes } = play(createGameState(1), Array(LEVEL_UP_STREAK).fill(true));
  assert.equal(state.level, 2);
  assert.equal(changes.at(-1), 'up');
  assert.equal(changes.filter(Boolean).length, 1);
});

test('une erreur remet la série à zéro', () => {
  const { state } = play(createGameState(1), [true, true, true, true, false, true, true, true, true]);
  assert.equal(state.level, 1);
  assert.equal(state.streak, 4);
});

test('ne dépasse pas le niveau maximum', () => {
  const { state } = play(createGameState(3), Array(20).fill(true), 3);
  assert.equal(state.level, 3);
});

test('redescend après 3 erreurs sur les 5 dernières réponses', () => {
  const { state, changes } = play(createGameState(2), [false, true, false, true, false]);
  assert.equal(state.level, 1);
  assert.equal(changes.at(-1), 'down');
});

test('ne descend jamais sous le niveau 1', () => {
  const { state } = play(createGameState(1), Array(10).fill(false));
  assert.equal(state.level, 1);
});

test('étoiles : au moins une, trois à partir de 90 %', () => {
  assert.equal(starsFor(10, 10), 3);
  assert.equal(starsFor(9, 10), 3);
  assert.equal(starsFor(6, 10), 2);
  assert.equal(starsFor(0, 10), 1);
  assert.equal(starsFor(0, 0), 0);
});

test('aléatoire : reproductible et dans les bornes', () => {
  const a = createRng(42);
  const b = createRng(42);
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
  const rng = createRng(7);
  for (let i = 0; i < 1000; i++) {
    const n = randInt(rng, 3, 6);
    assert.ok(n >= 3 && n <= 6 && Number.isInteger(n));
  }
  assert.deepEqual(shuffle(rng, [1, 2, 3, 4]).sort(), [1, 2, 3, 4]);
  assert.equal(new Set(sample(rng, [1, 2, 3, 4, 5], 3)).size, 3);
});

test('autocollants : un toutes les 5 étoiles', () => {
  assert.equal(stickersUnlocked(4), 0);
  assert.equal(stickersUnlocked(5), 1);
  assert.deepEqual(newStickers(4, 11), STICKERS.slice(0, 2));
  assert.equal(starsToNextSticker(7), 3);
  assert.equal(stickersUnlocked(10_000), STICKERS.length);
  assert.equal(starsToNextSticker(STICKERS.length * STARS_PER_STICKER), null);
});

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
    data,
  };
}

test('données : aucun profil au premier lancement, chaque famille crée les siens', () => {
  const store = defaultStore();
  assert.deepEqual(store.profiles, {});
  assert.deepEqual(store.order, []);
  assert.equal(store.active, null);
  assert.equal(addChild(store, { name: '  Éva-Rose ', look: 'fille', grade: 'CP' }), 'eva-rose');
  assert.equal(addChild(store, { name: 'Eva Rose', look: 'garcon', grade: 'XX' }), 'eva-rose-2');
  assert.equal(addChild(store, { name: '   ' }), null);
  assert.deepEqual(store.order, ['eva-rose', 'eva-rose-2']);
  assert.equal(store.profiles['eva-rose'].name, 'Éva-Rose');
  assert.equal(store.profiles['eva-rose-2'].look, 'garcon');
  assert.equal(store.profiles['eva-rose-2'].grade, 'CP');
  assert.equal(slugify('Zoé  Lou'), 'zoe-lou');
  assert.equal(slugify('👶'), 'enfant');
  for (let i = 0; i < 10; i++) addChild(store, { name: `Enfant ${i}` });
  assert.equal(store.order.length, MAX_CHILDREN);
  assert.equal(cleanName('x'.repeat(50)).length, NAME_MAX);
  store.active = 'eva-rose';
  removeChild(store, 'eva-rose');
  assert.equal(store.active, null);
  assert.ok(!store.profiles['eva-rose'] && !store.order.includes('eva-rose'));
});

test('données : sauvegarde puis relecture, progression séparée par enfant', () => {
  const storage = fakeStorage();
  const store = defaultStore();
  addChild(store, { name: 'Eva-Rose', look: 'fille', grade: 'CP' });
  addChild(store, { name: 'Matteo', look: 'garcon', grade: 'MS' });
  store.active = 'matteo';
  store.profiles.matteo.stars = 12;
  store.profiles['eva-rose'].games.compter = { level: 4, streak: 1, recent: [true], sessions: 3 };
  logSession(store.profiles.matteo, { at: '2026-10-01T10:00:00Z', game: 'compter', correct: 8, total: 10, stars: 2, seconds: 120 });
  assert.ok(saveStore(store, storage));
  const loaded = loadStore(storage);
  assert.equal(loaded.active, 'matteo');
  assert.deepEqual(loaded.order, ['eva-rose', 'matteo']);
  assert.equal(loaded.profiles.matteo.name, 'Matteo');
  assert.equal(loaded.profiles.matteo.stars, 12);
  assert.equal(loaded.profiles.matteo.history.length, 1);
  assert.equal(gameStats(loaded.profiles['eva-rose'], 'compter').level, 4);
  assert.equal(gameStats(loaded.profiles.matteo, 'compter').level, 1);
  assert.equal(gameStats(loaded.profiles.matteo, 'calcul', 4).level, 4);
});

test('données : les profils Eva-Rose et Matteo d’avant la version 1.3 sont retrouvés', () => {
  const old = { active: 'eva-rose', profiles: { 'eva-rose': { grade: 'CE1', stars: 40 }, matteo: { grade: 'GS', stars: 3 }, fantome: { stars: 2 } } };
  const loaded = loadStore(fakeStorage({ [STORAGE_KEY]: JSON.stringify(old) }));
  assert.deepEqual(loaded.order, ['eva-rose', 'matteo']);
  assert.equal(loaded.active, 'eva-rose');
  assert.deepEqual([loaded.profiles['eva-rose'].name, loaded.profiles['eva-rose'].look, loaded.profiles['eva-rose'].stars], ['Eva-Rose', 'fille', 40]);
  assert.deepEqual([loaded.profiles.matteo.name, loaded.profiles.matteo.look, loaded.profiles.matteo.grade], ['Matteo', 'garcon', 'GS']);
  assert.equal(loaded.profiles.matteo.spoken, 'Mattéo');
  assert.ok(!loaded.profiles.fantome, 'un profil sans prénom est ignoré');
});

test('données : abîmées ou stockage indisponible → valeurs par défaut', () => {
  assert.deepEqual(loadStore(fakeStorage({ [STORAGE_KEY]: '{oups' })), defaultStore());
  const broken = { getItem: () => { throw new Error('bloqué'); }, setItem: () => { throw new Error('plein'); } };
  assert.deepEqual(loadStore(broken), defaultStore());
  assert.equal(saveStore(defaultStore(), broken), false);
});

test('données : classe inconnue ou profil incomplet → complété avec les valeurs par défaut', () => {
  const storage = fakeStorage({ [STORAGE_KEY]: JSON.stringify({ active: 'inconnu', settings: { voice: false }, profiles: { matteo: { grade: 'CM2', stars: 3 } } }) });
  const loaded = loadStore(storage);
  assert.equal(loaded.active, null);
  assert.equal(loaded.settings.voice, false);
  assert.equal(loaded.settings.sounds, true);
  assert.equal(loaded.profiles.matteo.stars, 3);
  assert.ok(GRADES[loaded.profiles.matteo.grade]);
  assert.deepEqual(loaded.profiles.matteo.mistakes, []);
});

test('données : effacer un enfant ne touche pas l’autre', () => {
  const store = defaultStore();
  addChild(store, { name: 'Eva-Rose', look: 'fille', grade: 'CP' });
  addChild(store, { name: 'Matteo', look: 'garcon', grade: 'MS' });
  store.profiles['eva-rose'].stars = 7;
  store.profiles.matteo.stars = 9;
  store.profiles.matteo.grade = 'GS';
  logMistake(store.profiles.matteo, { game: 'lettres', expected: 'b', given: 'd' });
  resetChild(store, 'matteo');
  assert.equal(store.profiles.matteo.stars, 0);
  assert.equal(store.profiles.matteo.grade, 'GS');
  assert.equal(store.profiles.matteo.name, 'Matteo');
  assert.equal(store.profiles.matteo.look, 'garcon');
  assert.equal(store.profiles['eva-rose'].stars, 7);
});

test('paliers : une étoile de maîtrise par partie réussie à 80 %, maximum 5', () => {
  assert.equal(palierStarsAfter(0, 8, 10), 1);
  assert.equal(palierStarsAfter(2, 7, 10), 2);
  assert.equal(palierStarsAfter(5, 10, 10), 5);
});

test('niveau minimum de la classe respecté quand on redescend', () => {
  let state = createGameState(3);
  for (const ok of [false, false, false]) state = recordAnswer(state, ok, 6, 3).state;
  assert.equal(state.level, 3);
});
