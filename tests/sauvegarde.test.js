import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  APP_ID, FORMAT, creerSauvegarde, dateEnClair, depuisBase64, exporterEnregistrements, importerEnregistrements, lireSauvegarde, nomFichier,
  versBase64,
} from '../app/js/sauvegarde.js';
import { addChild, beginDuo, defaultStore, loadStore, saveStore, storeSnapshot, STORAGE_KEY } from '../app/js/storage.js';

/** Un faux localStorage. */
function memoryStorage() {
  const data = new Map();
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k) };
}

/** Un faux magasin d'enregistrements (recordings.js). */
function fakeRecordings(initial = {}) {
  const saved = new Map(Object.entries(initial));
  return {
    saved,
    list: async () => [...saved.keys()].sort(),
    get: async (id) => (saved.has(id) ? { id, ...saved.get(id) } : null),
    save: async (id, blob, { mime = '', duration = 0 } = {}) => {
      saved.set(id, { blob, mime, duration, savedAt: '2026-10-10T10:00:00.000Z' });
      return true;
    },
  };
}

function familyStore() {
  const store = defaultStore();
  const eva = addChild(store, { name: 'Eva-Rose', look: 'fille', grade: 'CP' });
  const matteo = addChild(store, { name: 'Matteo', look: 'garcon', grade: 'MS' });
  store.profiles[eva].stars = 42;
  store.profiles[eva].games = { lettres: { level: 4, answered: 30, correct: 27 } };
  store.profiles[eva].photo = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ';
  store.profiles[matteo].hiddenGames = ['labyrinthe'];
  store.settings.sessionLength = 15;
  store.active = eva;
  return store;
}

test('sauvegarde : base64 aller-retour, même pour un gros son', () => {
  const bytes = new Uint8Array(200000).map((_, i) => (i * 7919) % 256);
  const back = depuisBase64(versBase64(bytes));
  assert.deepEqual(back, bytes);
  assert.deepEqual(depuisBase64(versBase64(bytes.buffer)), bytes);
  assert.equal(depuisBase64('pas du base64 !'), null);
});

test('sauvegarde : tout revient à l’identique (prénoms, photo, étoiles, niveaux, réglages)', () => {
  const store = familyStore();
  const file = JSON.stringify(creerSauvegarde(storeSnapshot(store), { version: '1.16.0', date: new Date('2026-10-10T14:30:00Z') }));
  const backup = lireSauvegarde(file);
  assert.equal(backup.ok, true);
  assert.deepEqual(backup.enfants, ['Eva-Rose', 'Matteo']);
  assert.equal(backup.date, '2026-10-10T14:30:00.000Z');
  assert.equal(backup.version, '1.16.0');
  // ce qui est restauré est exactement ce que l'app relirait sur l'appareil d'origine
  const storage = memoryStorage();
  saveStore(store, storage);
  assert.deepEqual(backup.store, loadStore(storage));
  const eva = backup.store.profiles['eva-rose'];
  assert.equal(eva.stars, 42);
  assert.equal(eva.games.lettres.level, 4);
  assert.match(eva.photo, /^data:image\/jpeg;base64,/);
  assert.deepEqual(backup.store.profiles.matteo.hiddenGames, ['labyrinthe']);
  assert.equal(backup.store.settings.sessionLength, 15);
});

test('sauvegarde : pendant une partie à deux, c’est l’enfant d’avant la partie qui est gardé', () => {
  const store = familyStore();
  beginDuo(store, ['eva-rose', 'matteo']);
  store.active = 'matteo';
  const snapshot = storeSnapshot(store);
  assert.equal(snapshot.active, 'eva-rose');
  assert.equal(JSON.parse(JSON.stringify(snapshot)).duo, undefined);
});

test('sauvegarde : un fichier qui n’en est pas une est refusé, avec une phrase claire', () => {
  const refus = (texte) => {
    const r = lireSauvegarde(texte);
    assert.equal(r.ok, false);
    assert.equal(typeof r.raison, 'string');
    return r.raison;
  };
  assert.match(refus('bonjour'), /pas une sauvegarde/);
  assert.match(refus('{"app":"autre","donnees":{}}'), /pas une sauvegarde/);
  assert.match(refus(JSON.stringify({ app: APP_ID })), /pas une sauvegarde/);
  assert.match(refus(JSON.stringify({ app: APP_ID, format: FORMAT + 1, donnees: {} })), /plus récente/);
  assert.match(refus(JSON.stringify({ app: APP_ID, format: FORMAT, donnees: { profiles: {} } })), /aucun enfant/);
  // un profil abîmé (sans prénom) est écarté, comme au lancement de l'app
  assert.match(refus(JSON.stringify({ app: APP_ID, format: FORMAT, donnees: { order: ['x'], profiles: { x: { stars: 3 } } } })), /aucun enfant/);
});

test('sauvegarde : les histoires lues par les parents partent avec, et reviennent', async () => {
  const sound = new Uint8Array([1, 2, 3, 250, 251, 252]);
  const source = fakeRecordings({ 'le-loup': { blob: new Blob([sound], { type: 'audio/mp4' }), mime: 'audio/mp4', duration: 65, savedAt: '2026-09-01T08:00:00.000Z' } });
  const enregistrements = await exporterEnregistrements(source);
  assert.deepEqual(enregistrements.map(({ id, mime, duration }) => ({ id, mime, duration })), [{ id: 'le-loup', mime: 'audio/mp4', duration: 65 }]);
  const file = JSON.stringify(creerSauvegarde(storeSnapshot(familyStore()), { enregistrements }));
  const backup = lireSauvegarde(file);
  assert.equal(backup.enregistrements.length, 1);
  // l'appareil où l'on restaure garde ses autres histoires
  const target = fakeRecordings({ 'la-fusee': { blob: new Blob([new Uint8Array([9])]), mime: 'audio/webm', duration: 3 } });
  assert.equal(await importerEnregistrements(target, [...backup.enregistrements, { id: 'abime', data: '***' }]), 1);
  assert.deepEqual([...target.saved.keys()].sort(), ['la-fusee', 'le-loup']);
  const restored = target.saved.get('le-loup');
  assert.deepEqual(new Uint8Array(await restored.blob.arrayBuffer()), sound);
  assert.equal(restored.mime, 'audio/mp4');
  assert.equal(restored.duration, 65);
});

test('sauvegarde : nom du fichier et date en clair', () => {
  assert.equal(nomFichier(new Date(2026, 9, 10, 14, 30)), 'lire-compter-sauvegarde-2026-10-10.json');
  assert.equal(nomFichier(new Date(2027, 2, 1)), 'lire-compter-sauvegarde-2027-03-01.json');
  assert.equal(dateEnClair(new Date(2026, 9, 10, 12).toISOString()), '10 octobre 2026');
  assert.equal(dateEnClair(new Date(2027, 2, 1, 12).toISOString()), '1er mars 2027');
  assert.equal(dateEnClair(undefined), '');
  assert.equal(dateEnClair('pas une date'), '');
});

test('sauvegarde : l’app garde la date de la dernière sauvegarde dans ses réglages', () => {
  const storage = memoryStorage();
  const store = familyStore();
  store.settings.lastBackup = '2026-10-10T14:30:00.000Z';
  saveStore(store, storage);
  assert.equal(loadStore(storage).settings.lastBackup, '2026-10-10T14:30:00.000Z');
  assert.ok(storage.getItem(STORAGE_KEY).includes('lastBackup'));
});
