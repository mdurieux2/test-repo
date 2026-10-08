// Accessibilité : les réglages de chaque enfant (profil kid.a11y), leur enregistrement, et
// les effets qui ne dépendent pas de l'écran (défi chrono sans chrono, sons du mode calme).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { A11Y_DEFAULTS, TEXT_SIZES, a11y, applyA11y, cleanA11y } from '../app/js/a11y.js';
import { addChild, defaultStore, loadStore, resetChild, saveStore, STORAGE_KEY } from '../app/js/storage.js';
import { chronoOn, tablesChrono, untimedQuestion } from '../app/js/games/chrono.js';
import { findGame } from '../app/js/games/index.js';
import { soundNotes } from '../app/js/sounds.js';
import { createRng } from '../app/js/random.js';

function memoryStorage() {
  const data = new Map();
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)), data };
}

// ---------------------------------------------------------------- Profil nettoyé

test('accessibilité : sans profil, tous les réglages sont éteints et le texte est de taille normale', () => {
  assert.deepEqual(cleanA11y(undefined), { ...A11Y_DEFAULTS });
  assert.deepEqual(cleanA11y(null), { ...A11Y_DEFAULTS });
  assert.deepEqual(cleanA11y('grand'), { ...A11Y_DEFAULTS });
  assert.deepEqual(a11y({ name: 'Léa' }), { ...A11Y_DEFAULTS });
  assert.equal(A11Y_DEFAULTS.textSize, 1);
  for (const [key, value] of Object.entries(A11Y_DEFAULTS)) if (key !== 'textSize') assert.equal(value, false, key);
});

test('accessibilité : seules les clés connues sont gardées, avec des valeurs valides', () => {
  const clean = cleanA11y({ textSize: 1.3, spacing: true, contrast: 'oui', calm: 1, noTimer: true, pirate: true });
  assert.equal(clean.textSize, 1.3);
  assert.equal(clean.spacing, true);
  assert.equal(clean.contrast, false, 'un texte n’allume pas un réglage');
  assert.equal(clean.calm, false, 'un nombre non plus');
  assert.equal(clean.noTimer, true);
  assert.equal('pirate' in clean, false);
  assert.deepEqual(Object.keys(clean).sort(), Object.keys(A11Y_DEFAULTS).sort());
});

test('accessibilité : la taille du texte vaut 1, 1.15 ou 1.3 (Normale, Grande, Très grande)', () => {
  assert.deepEqual(TEXT_SIZES, [1, 1.15, 1.3]);
  for (const size of TEXT_SIZES) assert.equal(cleanA11y({ textSize: size }).textSize, size);
  for (const bad of [0, 2, 1.2, '1.3', null, Number.NaN]) assert.equal(cleanA11y({ textSize: bad }).textSize, 1, String(bad));
});

test('accessibilité : chaque réglage est une classe a11y-… sur <body>, la taille du texte une variable CSS', () => {
  const classes = new Set();
  const vars = {};
  const htmlVars = {};
  const root = {
    classList: { toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)) },
    style: { setProperty: (k, v) => { vars[k] = v; } },
    ownerDocument: { documentElement: { style: { setProperty: (k, v) => { htmlVars[k] = v; } } } },
  };
  applyA11y({ a11y: { textSize: 1.3, bigTargets: true, noTimer: true, skipListening: true } }, root);
  assert.deepEqual([...classes].sort(), ['a11y-big-targets', 'a11y-no-timer', 'a11y-skip-listening', 'a11y-text-large']);
  assert.equal(vars['--text-scale'], '1.3');
  assert.equal(htmlVars['--text-scale'], '1.3', 'les tailles en rem suivent <html>');
  // un autre enfant, sans réglage : tout s'éteint
  applyA11y({ name: 'Tom' }, root);
  assert.deepEqual([...classes], []);
  assert.equal(vars['--text-scale'], '1');
  assert.equal(htmlVars['--text-scale'], '1');
});

// ---------------------------------------------------------------- Enregistrement

test('accessibilité : le profil est enregistré avec l’enfant et relu nettoyé', () => {
  const storage = memoryStorage();
  const store = defaultStore();
  const id = addChild(store, { name: 'Inès', grade: 'CP' });
  const other = addChild(store, { name: 'Noé', grade: 'GS' });
  store.profiles[id].a11y = cleanA11y({ textSize: 1.15, contrast: true, captions: true });
  assert.ok(saveStore(store, storage));
  const loaded = loadStore(storage);
  assert.deepEqual(loaded.profiles[id].a11y, { ...A11Y_DEFAULTS, textSize: 1.15, contrast: true, captions: true });
  assert.deepEqual(loaded.profiles[other].a11y, { ...A11Y_DEFAULTS }, 'chaque enfant a son propre profil');
});

test('accessibilité : un profil abîmé sur l’appareil est relu sans erreur', () => {
  const storage = memoryStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify({
    active: 'ines', order: ['ines'],
    profiles: { ines: { name: 'Inès', grade: 'CP', a11y: { textSize: 5, spacing: 'true', tapOnly: true, inconnu: 3 } } },
  }));
  const loaded = loadStore(storage);
  assert.deepEqual(loaded.profiles.ines.a11y, { ...A11Y_DEFAULTS, tapOnly: true });
});

test('accessibilité : « effacer la progression » garde le profil d’accessibilité', () => {
  const store = defaultStore();
  const id = addChild(store, { name: 'Inès', grade: 'CE1' });
  Object.assign(store.profiles[id], { stars: 42, records: { 'tables-chrono': { 1: 30 } }, a11y: cleanA11y({ textSize: 1.3, noTimer: true, calm: true }) });
  resetChild(store, id);
  assert.equal(store.profiles[id].stars, 0);
  assert.deepEqual(store.profiles[id].records, {});
  assert.deepEqual(store.profiles[id].a11y, { ...A11Y_DEFAULTS, textSize: 1.3, noTimer: true, calm: true });
  // et il survit à l'enregistrement
  const storage = memoryStorage();
  saveStore(store, storage);
  assert.equal(loadStore(storage).profiles[id].a11y.noTimer, true);
});

// ---------------------------------------------------------------- Sans chrono

test('sans chrono : le chronomètre ne tourne que pour un défi chrono, et pas pour un enfant « sans chrono »', () => {
  const chrono = findGame('tables-chrono');
  assert.equal(chronoOn(chrono, a11y({})), true);
  assert.equal(chronoOn(chrono, undefined), true);
  assert.equal(chronoOn(chrono, cleanA11y({ noTimer: true })), false);
  assert.equal(chronoOn(findGame('tables'), a11y({})), false, 'un jeu ordinaire n’a pas de chrono');
  assert.equal(chronoOn(findGame('tables'), cleanA11y({ noTimer: true })), false);
});

test('sans chrono : la consigne ne parle plus de vitesse et ne garde que des phrases déjà dites', () => {
  const rng = createRng(7);
  for (let level = 1; level <= tablesChrono.levels.length; level++) {
    for (let i = 0; i < 20; i++) {
      const q = tablesChrono.generate(level, rng);
      const calm = untimedQuestion(q);
      assert.equal(calm.answer, q.answer);
      assert.equal(calm.key, q.key);
      for (const text of [calm.text, calm.short.text, ...[calm.instruction].flat()]) {
        assert.doesNotMatch(text, /chrono|vite/i, `${level} : « ${text} »`);
      }
      assert.deepEqual(calm.instruction, q.replay, 'la question seule, déjà dite par « Réécouter »');
      assert.equal(calm.short.speak, q.short.speak);
      assert.equal(calm.short.key, q.short.key, 'la consigne courte reste reconnue d’une question à l’autre');
      assert.match(calm.text, /^[A-ZÀ-Ý]/u, 'le texte commence par une majuscule');
    }
  }
  // la question d'origine n'est pas modifiée
  const q = tablesChrono.generate(1, createRng(1));
  untimedQuestion(q);
  assert.match(q.instruction, /Défi chrono/);
});

// ---------------------------------------------------------------- Mode calme

test('mode calme : les petits sons sont plus doux et les fanfares raccourcies', () => {
  for (const name of ['success', 'error', 'levelUp', 'fanfare', 'record', 'tap']) {
    const normal = soundNotes(name, false);
    const calm = soundNotes(name, true);
    assert.ok(calm.length <= 3 && calm.length >= 1, name);
    calm.forEach(([freq, start, duration, opts], i) => {
      assert.deepEqual([freq, start, duration], normal[i].slice(0, 3));
      assert.ok(opts.volume < (normal[i][3]?.volume ?? 0.18), `${name} : plus bas`);
    });
  }
  assert.equal(soundNotes('inconnu', true), null);
});
