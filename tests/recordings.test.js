// Histoires lues par papa ou maman : le stockage des enregistrements (avec un faux IndexedDB
// minimal), le karaoké au prorata de la longueur des phrases et le choix du format audio.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createRecordings, formatDuration, MAX_SECONDS, MIME_TYPES, pickMime, sentenceAt, sentenceTimeline,
} from '../app/js/recordings.js';
import * as shared from '../app/js/recordings.js';

/** Un IndexedDB réduit à ce que recordings.js utilise ; les réponses arrivent plus tard, comme dans un navigateur. */
function fakeIndexedDB({ failOpen = false } = {}) {
  const databases = new Map();
  const later = (fn) => setTimeout(fn, 0);
  function database() {
    const stores = new Map();
    return {
      stores,
      objectStoreNames: { contains: (name) => stores.has(name) },
      createObjectStore(name) {
        stores.set(name, new Map());
      },
      transaction(name, mode) {
        const data = stores.get(name);
        if (!data) throw new Error(`NotFoundError: ${name}`);
        const tx = {};
        let pending = 0;
        const op = (write, fn) => {
          if (write && mode !== 'readwrite') throw new Error('ReadOnlyError');
          const request = {};
          pending++;
          later(() => {
            request.result = fn();
            request.onsuccess?.();
            if (--pending === 0) later(() => tx.oncomplete?.());
          });
          return request;
        };
        tx.objectStore = () => ({
          put: (value, key) => op(true, () => { data.set(key, structuredClone(value)); return key; }),
          get: (key) => op(false, () => (data.has(key) ? structuredClone(data.get(key)) : undefined)),
          delete: (key) => op(true, () => { data.delete(key); }),
          getAllKeys: () => op(false, () => [...data.keys()]), // ordre d'insertion : à recordings.js de trier
        });
        return tx;
      },
    };
  }
  return {
    databases,
    open(name) {
      const request = {};
      later(() => {
        if (failOpen) {
          request.error = new Error('UnknownError');
          request.onerror?.();
          return;
        }
        let db = databases.get(name);
        if (!db) {
          db = database();
          databases.set(name, db);
          request.result = db;
          request.onupgradeneeded?.();
        }
        request.result = db;
        request.onsuccess?.();
      });
      return request;
    },
  };
}

const audio = (text, type = 'audio/mp4') => new Blob([text], { type });

test('enregistrements : garder, relire, lister dans l’ordre des clés, supprimer', async () => {
  const idb = fakeIndexedDB();
  const store = createRecordings(idb);
  assert.deepEqual(await store.list(), []);
  assert.equal(await store.get('sapin'), null);

  assert.equal(await store.save('sapin', audio('voix de papa'), { mime: 'audio/mp4', duration: 12.5 }), true);
  assert.equal(await store.save('chat-pelote', audio('voix de maman', 'audio/webm'), { mime: 'audio/webm', duration: 8 }), true);
  assert.equal(await store.save('au-parc', audio('encore'), { duration: 3 }), true);
  // base dédiée, magasin « recordings », clé = identifiant de l'histoire
  const db = idb.databases.get('lire-et-compter-voix');
  assert.ok(db.stores.has('recordings'));
  assert.deepEqual([...db.stores.get('recordings').keys()], ['sapin', 'chat-pelote', 'au-parc']);
  assert.deepEqual(await store.list(), ['au-parc', 'chat-pelote', 'sapin']);

  const saved = await store.get('sapin');
  assert.equal(saved.id, 'sapin');
  assert.equal(saved.mime, 'audio/mp4');
  assert.equal(saved.duration, 12.5);
  assert.ok(saved.blob instanceof Blob);
  assert.equal(saved.blob.type, 'audio/mp4');
  assert.equal(await saved.blob.text(), 'voix de papa');
  assert.equal(saved.size, 'voix de papa'.length);
  assert.ok(!Number.isNaN(Date.parse(saved.savedAt)));
  // sans type précisé, celui du son
  assert.equal((await store.get('au-parc')).mime, 'audio/mp4');

  // un nouvel enregistrement remplace l'ancien
  assert.equal(await store.save('sapin', audio('nouvelle voix'), { mime: 'audio/mp4', duration: 4 }), true);
  assert.equal(await (await store.get('sapin')).blob.text(), 'nouvelle voix');
  assert.deepEqual(await store.list(), ['au-parc', 'chat-pelote', 'sapin']);

  assert.equal(await store.remove('chat-pelote'), true);
  assert.equal(await store.get('chat-pelote'), null);
  assert.deepEqual(await store.list(), ['au-parc', 'sapin']);

  // la base est rouverte par une autre instance (nouvelle visite) : rien n'est perdu
  assert.deepEqual(await createRecordings(idb).list(), ['au-parc', 'sapin']);
});

test('enregistrements : rien ne casse sans IndexedDB ou si la base refuse de s’ouvrir', async () => {
  for (const store of [createRecordings(null), createRecordings(undefined), createRecordings(fakeIndexedDB({ failOpen: true }))]) {
    assert.equal(await store.save('sapin', audio('x')), false);
    assert.equal(await store.get('sapin'), null);
    assert.equal(await store.remove('sapin'), false);
    assert.deepEqual(await store.list(), []);
  }
  // une base qui ne répond jamais (certains Safari) : on n'attend pas indéfiniment
  const silent = createRecordings({ open: () => ({}) }, { timeout: 20 });
  assert.deepEqual(await silent.list(), []);
  assert.equal(await silent.get('sapin'), null);
  // dans node, pas d'IndexedDB : le magasin de l'app répond quand même
  assert.deepEqual(await shared.list(), []);
  assert.equal(await shared.get('sapin'), null);
  // arguments manquants
  const store = createRecordings(fakeIndexedDB());
  assert.equal(await store.save('', audio('x')), false);
  assert.equal(await store.save('sapin', null), false);
  assert.equal(await store.get(''), null);
});

test('karaoké d’un enregistrement : chaque phrase s’allume au prorata de sa longueur', () => {
  const sentences = ['Il pleut.', 'Léo met ses bottes et prend son parapluie.', 'Il saute !'];
  const total = sentences.join('').length;
  const timeline = sentenceTimeline(sentences, 30);
  assert.equal(timeline.length, 3);
  assert.equal(timeline[0].start, 0);
  assert.ok(Math.abs(timeline.at(-1).end - 30) < 1e-9);
  timeline.forEach(({ start, end }, i) => {
    if (i) assert.equal(start, timeline[i - 1].end, 'les phrases se suivent sans trou');
    assert.ok(Math.abs((end - start) - (30 * sentences[i].length) / total) < 1e-9, sentences[i]);
  });
  // la phrase allumée à chaque instant
  assert.equal(sentenceAt(timeline, 0), 0);
  assert.equal(sentenceAt(timeline, timeline[0].end - 0.01), 0);
  assert.equal(sentenceAt(timeline, timeline[0].end), 1);
  assert.equal(sentenceAt(timeline, 20), 1);
  assert.equal(sentenceAt(timeline, 29.9), 2);
  assert.equal(sentenceAt(timeline, 30), -1, 'après la fin, plus rien d’allumé');
  assert.equal(sentenceAt(timeline, Number.NaN), -1);
  // la plus longue phrase reste allumée le plus longtemps
  const spans = timeline.map(({ start, end }) => end - start);
  assert.equal(spans.indexOf(Math.max(...spans)), 1);
  // durée inconnue (son WebM sans durée) : rien ne s'allume plutôt que de tout allumer d'un coup
  for (const unknown of [0, Infinity, Number.NaN, -3]) assert.equal(sentenceAt(sentenceTimeline(sentences, unknown), 0), -1);
});

test('format d’enregistrement : MP4 sur iPhone, WebM sur Chrome, sinon celui du navigateur', () => {
  const supports = (...types) => (type) => types.includes(type);
  assert.equal(pickMime(supports('audio/mp4')), 'audio/mp4'); // Safari (iPhone, iPad)
  assert.equal(pickMime(supports('audio/webm', 'audio/webm;codecs=opus')), 'audio/webm;codecs=opus'); // Chrome, Android
  assert.equal(pickMime(supports('audio/webm')), 'audio/webm');
  assert.equal(pickMime(supports('audio/ogg;codecs=opus')), 'audio/ogg;codecs=opus'); // Firefox ancien
  assert.equal(pickMime(supports()), '');
  assert.equal(pickMime(undefined), '');
  assert.equal(pickMime(() => { throw new Error('non pris en charge'); }), '');
  assert.equal(MIME_TYPES[0], 'audio/mp4');
});

test('durées affichées aux parents, 3 minutes au plus', () => {
  assert.equal(MAX_SECONDS, 180);
  assert.equal(formatDuration(0), '0:00');
  assert.equal(formatDuration(7.4), '0:07');
  assert.equal(formatDuration(65), '1:05');
  assert.equal(formatDuration(MAX_SECONDS), '3:00');
  assert.equal(formatDuration(undefined), '0:00');
});
