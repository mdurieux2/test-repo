import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findGame } from '../app/js/games/index.js';
import { featuredGames, isGameHidden, MAX_FEATURED, programFor, programForChild } from '../app/js/programs.js';
import { currentLevel, dailyPicks, drawPool, dueReviews, DUO_QUESTIONS, duoPlan, duoTurn, hashText } from '../app/js/picks.js';
import { createRng, sample } from '../app/js/random.js';
import {
  addChild, beginDuo, defaultStore, endDuo, loadStore, resetChild, saveStore, STORAGE_KEY,
} from '../app/js/storage.js';

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = String(v); }, removeItem: (k) => { delete data[k]; } };
}

const ids = (domains) => domains.flatMap((d) => d.games.map(({ game }) => game.id));

function family() {
  const store = defaultStore();
  addChild(store, { name: 'Eva-Rose', look: 'fille', grade: 'CP' });
  addChild(store, { name: 'Matteo', look: 'garcon', grade: 'MS' });
  return store;
}

// ---------------------------------------------------------------- Stockage

test('stockage : rubriques et jeux masqués, jeux conseillés conservés à l’enregistrement', () => {
  const storage = memoryStorage();
  const store = family();
  Object.assign(store.profiles['eva-rose'], { hiddenDomains: ['anglais'], hiddenGames: ['tables', 'rimes'], featured: ['compter'] });
  saveStore(store, storage);
  const kid = loadStore(storage).profiles['eva-rose'];
  assert.deepEqual(kid.hiddenDomains, ['anglais']);
  assert.deepEqual(kid.hiddenGames, ['tables', 'rimes']);
  assert.deepEqual(kid.featured, ['compter']);
  assert.deepEqual(loadStore(storage).profiles.matteo.featured, [], 'sans réglage : listes vides');
});

test('stockage : migration des anciennes données (sans réglage, abîmées, profils d’avant la 1.3)', () => {
  const old = {
    active: 'eva-rose',
    order: ['eva-rose', 'lea'],
    profiles: {
      // profil d'avant la 1.3 (sans prénom enregistré), avec des réglages
      'eva-rose': { stars: 4, games: {}, hiddenDomains: ['monde', 'monde', 3, null], hiddenGames: 'tables', featured: ['heure', ''] },
      // profil d'avant la 1.7 : aucun des nouveaux champs
      lea: { name: 'Léa', look: 'fille', grade: 'GS', stars: 2, games: {}, goals: { parts: 2 }, style: { shirt: 'vert' } },
    },
  };
  const loaded = loadStore(memoryStorage({ [STORAGE_KEY]: JSON.stringify(old) }));
  const eva = loaded.profiles['eva-rose'];
  assert.equal(eva.name, 'Eva-Rose');
  assert.deepEqual(eva.hiddenDomains, ['monde'], 'doublons et valeurs invalides retirés');
  assert.deepEqual(eva.hiddenGames, [], 'une valeur qui n’est pas une liste est ignorée');
  assert.deepEqual(eva.featured, ['heure']);
  const lea = loaded.profiles.lea;
  assert.deepEqual([lea.hiddenDomains, lea.hiddenGames, lea.featured], [[], [], []]);
  assert.deepEqual(lea.goals, { parts: 2 });
  assert.deepEqual(lea.style, { shirt: 'vert' });
});

test('stockage : « effacer la progression » garde les jeux masqués et conseillés (comme les objectifs et le personnage)', () => {
  const store = family();
  Object.assign(store.profiles['eva-rose'], {
    stars: 12, games: { rimes: { level: 3 } }, hiddenDomains: ['anglais'], hiddenGames: ['tables'], featured: ['compter'],
    goals: { parts: 3, limit: 20 }, style: { shirt: 'vert', accessory: 'couronne' }, easyRead: true,
  });
  resetChild(store, 'eva-rose');
  const kid = store.profiles['eva-rose'];
  assert.equal(kid.stars, 0);
  assert.deepEqual(kid.games, {});
  assert.deepEqual(kid.hiddenDomains, ['anglais']);
  assert.deepEqual(kid.hiddenGames, ['tables']);
  assert.deepEqual(kid.featured, ['compter']);
  assert.deepEqual(kid.goals, { parts: 3, limit: 20 });
  assert.deepEqual(kid.style, { shirt: 'vert', accessory: 'couronne' });
  assert.equal(kid.easyRead, true);
  assert.equal(kid.name, 'Eva-Rose');
});

test('stockage : pendant une partie à deux, l’enfant actif d’avant est enregistré, puis rendu à la fin', () => {
  const storage = memoryStorage();
  const store = family();
  store.active = 'eva-rose';
  beginDuo(store, ['matteo', 'eva-rose']);
  store.active = 'matteo'; // c'est au tour de Matteo
  store.profiles.matteo.stars = 3;
  saveStore(store, storage);
  const saved = JSON.parse(storage.data[STORAGE_KEY]);
  assert.equal(saved.active, 'eva-rose', 'l’enfant du tour n’est jamais enregistré comme actif');
  assert.equal(saved.duo, undefined);
  assert.equal(saved.profiles.matteo.stars, 3, 'les progrès du duo sont bien enregistrés');
  // rechargement au milieu de la partie
  assert.equal(loadStore(storage).active, 'eva-rose');
  // fin (ou abandon) de la partie
  endDuo(store);
  assert.equal(store.active, 'eva-rose');
  assert.equal(store.duo, undefined);
  // une ancienne sauvegarde qui contiendrait la partie en cours
  const stale = memoryStorage({ [STORAGE_KEY]: JSON.stringify({ ...saved, active: 'matteo', duo: { players: ['matteo', 'eva-rose'], home: 'eva-rose' } }) });
  assert.equal(loadStore(stale).active, 'eva-rose');
  // personne n'était actif avant le duo
  const fresh = family();
  beginDuo(fresh, ['eva-rose', 'matteo']);
  fresh.active = 'eva-rose';
  assert.equal(JSON.parse((saveStore(fresh, storage), storage.data[STORAGE_KEY])).active, null);
  assert.equal(endDuo(fresh).active, null);
});

// ---------------------------------------------------------------- Programme de l'enfant

test('programme de l’enfant : sans réglage, c’est celui de sa classe', () => {
  const store = family();
  for (const id of store.order) {
    const kid = store.profiles[id];
    assert.deepEqual(ids(programForChild(kid)), ids(programFor(kid.grade)));
    assert.deepEqual(featuredGames(kid), []);
  }
});

test('programme de l’enfant : rubriques et jeux masqués retirés, rubrique vide retirée aussi', () => {
  const kid = { grade: 'CP', hiddenDomains: ['anglais'], hiddenGames: ['tables', 'compter', 'histoires', 'petits-textes', 'ordre-histoire'] };
  const program = programForChild(kid);
  const domains = program.map((d) => d.id);
  assert.ok(!domains.includes('anglais'), 'rubrique masquée');
  assert.ok(!domains.includes('histoires'), 'tous ses jeux sont masqués : la rubrique disparaît');
  assert.ok(domains.includes('maths'));
  assert.ok(!ids(program).includes('compter'));
  assert.ok(ids(program).includes('calcul'));
  assert.ok(isGameHidden(kid, 'compter'));
  assert.ok(isGameHidden(kid, 'ecoute'), 'jeu d’une rubrique masquée');
  assert.ok(!isGameHidden(kid, 'calcul'));
  assert.ok(isGameHidden(kid, 'jeu-inconnu'));
});

test('jeux conseillés : dans l’ordre du programme, jamais un jeu masqué', () => {
  const kid = { grade: 'CP', featured: ['heure', 'compter', 'ecoute', 'trous', 'rimes'], hiddenDomains: ['anglais'], hiddenGames: ['trous'] };
  // « rimes » n'est pas au programme du CP, « ecoute » est dans une rubrique masquée, « trous » est masqué
  assert.deepEqual(featuredGames(kid).map(({ game }) => game.id), ['compter', 'heure']);
  assert.ok(MAX_FEATURED >= 1);
});

// ---------------------------------------------------------------- Défi du jour et révisions

test('défi du jour : jamais un jeu ni une rubrique masqués', () => {
  const kid = { grade: 'CP', hiddenDomains: ['anglais', 'jeux'], hiddenGames: ['compter', 'heure', 'bon-mot', 'histoires'] };
  for (let day = 1; day <= 200; day++) {
    const picks = dailyPicks(kid, `2026-10-${day}:eva-rose`);
    assert.equal(picks.length, 5);
    assert.equal(new Set(picks.map(({ game }) => game.id)).size, 5, 'jeux distincts');
    for (const { game } of picks) {
      assert.ok(!isGameHidden(kid, game.id), `${game.id} est masqué`);
      assert.ok(!game.paliers, 'pas la carte des paliers');
    }
  }
});

test('défi du jour : sans réglage, le même tirage qu’avant (mêmes jeux le même jour)', () => {
  for (const grade of ['PS', 'MS', 'GS', 'CP', 'CE1', 'CE2']) {
    const kid = { grade };
    const seed = `2026-10-03:${grade}`;
    // le calcul d'avant les réglages des parents (main.js : sans paliers ni défis chrono)
    const pool = programFor(grade).flatMap((d) => d.games).filter(({ game }) => !game.paliers && !game.timed);
    const before = sample(createRng(hashText(seed)), pool, 5).map(({ game }) => game.id);
    assert.deepEqual(dailyPicks(kid, seed).map(({ game }) => game.id), before, grade);
  }
});

test('révisions : les jeux masqués ne reviennent pas', () => {
  const review = {
    compter: { level: 2, due: '2026-10-01', step: 0 },
    heure: { level: 1, due: '2026-10-03', step: 1 },
    ecoute: { level: 1, due: '2026-10-02', step: 0 },
    tables: { level: 1, due: '2026-10-09', step: 2 }, // pas encore
    disparu: { level: 1, due: '2026-10-01', step: 0 },
  };
  const today = '2026-10-03';
  assert.deepEqual(dueReviews({ grade: 'CP', review }, today).map(([id]) => id), ['compter', 'heure', 'ecoute']);
  const kid = { grade: 'CP', review, hiddenGames: ['heure'], hiddenDomains: ['anglais'] };
  assert.deepEqual(dueReviews(kid, today).map(([id]) => id), ['compter']);
  assert.deepEqual(dueReviews({ grade: 'CP' }, today), []);
});

// ---------------------------------------------------------------- Jouer à deux

test('duo : 10 questions en alternance A, B, A, B…, chacune du programme de l’enfant, à son niveau', () => {
  const store = family();
  const eva = store.profiles['eva-rose'];
  eva.games = { compter: { level: 4 }, heure: { level: 9 } }; // au-delà du programme : ramené au maximum du CP
  eva.hiddenDomains = ['anglais'];
  eva.hiddenGames = ['trous'];
  const players = ['matteo', 'eva-rose'];
  assert.deepEqual([0, 1, 2, 3].map((i) => duoTurn(players, i)), ['matteo', 'eva-rose', 'matteo', 'eva-rose']);
  for (let seed = 1; seed <= 50; seed++) {
    const plan = duoPlan(store.profiles, players, createRng(seed));
    assert.equal(plan.length, DUO_QUESTIONS);
    plan.forEach(({ player, game, level }, i) => {
      assert.equal(player, players[i % 2], `question ${i + 1}`);
      const kid = store.profiles[player];
      const entry = drawPool(kid).find((e) => e.game.id === game.id);
      assert.ok(entry, `${game.id} n’est pas dans le programme de ${player}`);
      assert.ok(!isGameHidden(kid, game.id), `${game.id} est masqué pour ${player}`);
      assert.equal(level, currentLevel(kid, entry));
      assert.ok(level >= entry.min && level <= entry.max);
      assert.ok(game.levels[level - 1], 'niveau existant');
    });
    // 5 questions chacun, sans répéter un jeu tant qu'il en reste
    for (const id of players) {
      const games = plan.filter((t) => t.player === id).map((t) => t.game.id);
      assert.equal(games.length, 5);
      assert.equal(new Set(games).size, 5);
    }
  }
  // niveau actuel : celui de l'enfant, dans la fourchette de sa classe
  assert.equal(currentLevel(eva, { game: findGame('compter'), min: 1, max: 9 }), 4);
  assert.equal(currentLevel(eva, { game: findGame('heure'), min: 1, max: 2 }), 2);
  assert.equal(currentLevel(eva, { game: findGame('rimes'), min: 2, max: 5 }), 2);
});

test('duo : impossible si l’un des deux n’a plus aucun jeu affiché', () => {
  const store = family();
  store.profiles.matteo.hiddenDomains = ['francais', 'histoires', 'maths', 'jeux', 'temps', 'monde', 'sciences', 'anglais'];
  assert.equal(duoPlan(store.profiles, ['eva-rose', 'matteo'], createRng(1)), null);
  assert.equal(duoPlan(store.profiles, ['eva-rose'], createRng(1)), null);
  // un seul jeu affiché : il revient à chaque tour
  store.profiles.matteo.hiddenDomains = [];
  store.profiles.matteo.hiddenGames = drawPool(store.profiles.matteo).map(({ game }) => game.id).filter((id) => id !== 'saisons');
  const plan = duoPlan(store.profiles, ['eva-rose', 'matteo'], createRng(1));
  assert.deepEqual([...new Set(plan.filter((t) => t.player === 'matteo').map((t) => t.game.id))], ['saisons']);
});
