import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP, CHANGELOG } from '../app/js/config.js';
import { voiceScore } from '../app/js/speech.js';
import { defaultStore, loadStore, resetChild, saveStore } from '../app/js/storage.js';

test('la version affichée est celle du projet', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(APP.version, pkg.version);
  assert.equal(APP.author, 'Michaël Durieux');
});

test('le journal des modifications décrit la version actuelle, du plus récent au plus ancien', () => {
  assert.equal(CHANGELOG[0].version, APP.version);
  for (const entry of CHANGELOG) {
    assert.ok(entry.changes.length > 0 && !Number.isNaN(Date.parse(entry.date)), entry.version);
  }
  const versions = CHANGELOG.map((e) => e.version.split('.').map(Number));
  for (let i = 1; i < versions.length; i++) {
    const [a, b] = [versions[i - 1], versions[i]];
    assert.ok(a[0] > b[0] || (a[0] === b[0] && (a[1] > b[1] || (a[1] === b[1] && a[2] > b[2]))), 'ordre des versions');
  }
});

test('voix : Premium > améliorée > compacte, voix gadget écartées, accent de France préféré', () => {
  const v = (name, lang = 'fr-FR', voiceURI = '') => ({ name, lang, voiceURI, localService: true });
  const premium = voiceScore(v('Audrey (Premium)'));
  const enhanced = voiceScore(v('Thomas (Enhanced)'));
  const compact = voiceScore(v('Thomas'));
  assert.ok(premium > enhanced && enhanced > compact);
  assert.ok(voiceScore(v('Grand-mère (français (France))')) < compact);
  assert.ok(voiceScore(v('Rocko (français (France))')) < compact);
  assert.ok(voiceScore(v('Amélie', 'fr-CA')) < compact);
  assert.ok(voiceScore(v('Audrey', 'fr-FR', 'com.apple.voice.premium.fr-FR.Audrey')) > compact);
});

function memoryStorage() {
  const data = {};
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = String(v); }, removeItem: (k) => { delete data[k]; } };
}

test('photo de profil : enregistrée, conservée après « effacer la progression », refusée si invalide', () => {
  const storage = memoryStorage();
  const store = defaultStore();
  store.profiles.matteo.photo = 'data:image/jpeg;base64,AAAA';
  store.profiles.matteo.stars = 8;
  store.profiles['eva-rose'].photo = 'javascript:alert(1)';
  saveStore(store, storage);
  const loaded = loadStore(storage);
  assert.equal(loaded.profiles.matteo.photo, 'data:image/jpeg;base64,AAAA');
  assert.equal(loaded.profiles['eva-rose'].photo, null);
  resetChild(loaded, 'matteo');
  assert.equal(loaded.profiles.matteo.stars, 0);
  assert.equal(loaded.profiles.matteo.photo, 'data:image/jpeg;base64,AAAA');
});

test('réglages : les préférences de voix existent par défaut', () => {
  assert.deepEqual(defaultStore().settings.voices, {});
});
