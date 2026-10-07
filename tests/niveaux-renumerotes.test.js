// Version 1.12 : les niveaux enregistrés des jeux d'anglais par thèmes (13 → 10) et du chemin des
// nombres (11 → 10) sont convertis une seule fois au chargement ; les nouveaux profils ne le sont jamais.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addChild, defaultStore, loadStore, saveStore, STORAGE_KEY } from '../app/js/storage.js';
import { findGame } from '../app/js/games/index.js';

function memory(data) {
  const items = { [STORAGE_KEY]: JSON.stringify(data) };
  return { getItem: (k) => items[k] ?? null, setItem: (k, v) => { items[k] = v; } };
}

test('niveaux d’avant la 1.12 convertis une fois, sans dépasser le nombre de niveaux', () => {
  const old = {
    order: ['lea'],
    profiles: {
      lea: { name: 'Léa', grade: 'CE1', games: { ecoute: { level: 13 }, 'lis-anglais': { level: 4 }, 'chemin-nombres': { level: 11 }, compter: { level: 5 } } },
    },
  };
  const storage = memory(old);
  const kid = loadStore(storage).profiles.lea;
  assert.equal(kid.games.ecoute.level, 9);
  assert.equal(kid.games['lis-anglais'].level, 3);
  assert.equal(kid.games['chemin-nombres'].level, 10);
  assert.equal(kid.games.compter.level, 5);
  for (const [id, { level }] of Object.entries(kid.games)) assert.ok(level <= findGame(id).levels.length, id);
  // enregistré puis relu : pas de seconde conversion
  saveStore({ ...loadStore(storage) }, storage);
  assert.equal(loadStore(storage).profiles.lea.games.ecoute.level, 9);
});

test('un nouveau profil garde ses niveaux tels quels', () => {
  const store = defaultStore();
  addChild(store, { name: 'Tom', grade: 'CE1' });
  const id = store.order[0];
  store.profiles[id].games.ecoute = { level: 10 };
  const storage = memory(store);
  assert.equal(loadStore(storage).profiles[id].games.ecoute.level, 10);
});
