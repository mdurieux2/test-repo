// Textes déchiffrables (CP) : l'analyseur de graphèmes, le réglage « sons vus en classe » de chaque
// enfant, et le filtre des jeux de lecture (avec peu de sons, les mots tirés se lisent ; sans réglage,
// rien ne change).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MOTS_OUTILS, SONS, SON_IDS, cleanOutils, cleanSons, contexteSons, decouper, estDechiffrable, garderDechiffrables,
  motsDuTexte, resumeSons, sonsDuMot, syllabeDechiffrable, texteDechiffrable,
} from '../app/js/graphemes.js';
import { addChild, defaultStore, loadStore, resetChild, saveStore, STORAGE_KEY } from '../app/js/storage.js';
import { findGame } from '../app/js/games/index.js';
import { createRng } from '../app/js/random.js';
import { READING_WORDS } from '../app/js/data/lecture-data.js';
import { DICTEE_WORDS } from '../app/js/games/dictee.js';
import { TEXT_DATA } from '../app/js/games/textes.js';
import { STORY_DATA } from '../app/js/games/histoires.js';
import { LECTURE_LEVEL_DATA } from '../app/js/games/lecture.js';

/** « ch-a-(t) » : les graphèmes d'un mot, les lettres muettes entre parenthèses. */
const cut = (mot) => decouper(mot).map((g) => (g.muet ? `(${g.g})` : g.g)).join('-');
const sons = (vus, outils = MOTS_OUTILS) => ({ vus, outils });

// ---------------------------------------------------------------- Analyseur

test('graphèmes : les sons de plusieurs lettres restent ensemble, les lettres muettes de la fin sont repérées', () => {
  const expected = {
    chat: 'ch-a-(t)', loup: 'l-ou-(p)', souris: 's-ou-r-i-(s)', lapin: 'l-a-p-in', maison: 'm-ai-s-on', oiseau: 'oi-s-eau',
    poisson: 'p-oi-ss-on', château: 'ch-â-t-eau', éléphant: 'é-l-é-ph-an-(t)', fleur: 'f-l-eu-r', lune: 'l-u-n-(e)',
    pomme: 'p-o-mm-(e)', bonne: 'b-o-nn-(e)', une: 'u-n-(e)', année: 'a-nn-é-(e)', maman: 'm-a-m-an', jambe: 'j-am-b-(e)',
    champ: 'ch-am-(p)', dent: 'd-en-(t)', main: 'm-ain', chien: 'ch-ien', coin: 'c-oin', papillon: 'p-a-p-ill-on',
    soleil: 's-o-l-eil', abeille: 'a-b-eill-(e)', grenouille: 'g-r-e-n-ouill-(e)', feuille: 'f-euill-(e)', travail: 't-r-a-v-ail',
    ville: 'v-i-ll-(e)', fille: 'f-ill-(e)', crayon: 'c-r-ay-on', montagne: 'm-on-t-a-gn-(e)', guitare: 'gu-i-t-a-r-(e)',
    pigeon: 'p-i-ge-on', quatre: 'qu-a-t-r-(e)', hibou: '(h)-i-b-ou', pied: 'p-i-e-(d)', nez: 'n-e-(z)', manger: 'm-an-g-e-(r)',
    attention: 'a-tt-en-tion', cœur: 'c-œu-r', grand: 'g-r-an-(d)', riz: 'r-i-(z)', jouent: 'j-ou-(ent)',
  };
  for (const [mot, attendu] of Object.entries(expected)) assert.equal(cut(mot), attendu, mot);
});

test('graphèmes : le e se lit e, è ou é selon les lettres qui le suivent, ou il est muet', () => {
  const sonDuE = (mot) => decouper(mot).find((g) => g.g === 'e' && !g.muet)?.sons[0];
  for (const mot of ['cheval', 'petit', 'melon', 'le', 'je', 'requin', 'secret']) assert.equal(sonDuE(mot), 'e', mot);
  for (const mot of ['elle', 'merci', 'mer', 'sec', 'escargot', 'poulet', 'et', 'est', 'avec', 'lunettes']) assert.equal(sonDuE(mot), 'è', mot);
  for (const mot of ['nez', 'pied', 'manger', 'rocher']) assert.equal(sonDuE(mot), 'er', mot);
  assert.equal(sonDuE('des'), 'é');
  for (const mot of ['lune', 'pommes', 'tomate']) assert.equal(decouper(mot).at(-1).muet, true, mot);
});

test('graphèmes : c, g et s changent de son devant certaines lettres', () => {
  assert.deepEqual([...sonsDuMot('cerise')].sort(), ['ce', 'e', 'i', 'r', 'se'].sort());
  assert.ok(sonsDuMot('leçon').has('ce'));
  assert.ok(sonsDuMot('girafe').has('ge'));
  assert.ok(sonsDuMot('glace').has('g') && sonsDuMot('glace').has('ce'));
  assert.ok(sonsDuMot('rose').has('se'));
  assert.ok(sonsDuMot('poisson').has('s') && !sonsDuMot('poisson').has('se'));
  assert.ok(sonsDuMot('canard').has('c'));
});

test('graphèmes : tous les mots des jeux de lecture se découpent avec les sons du programme', () => {
  const words = new Set([...Object.values(READING_WORDS).flat(), ...Object.values(DICTEE_WORDS).flat()]);
  for (const t of TEXT_DATA) for (const x of [t.title, t.text, ...t.questions.flat()]) motsDuTexte(x).forEach((w) => words.add(w));
  for (const s of STORY_DATA) for (const x of [s.title, ...s.sentences, s.question || '']) motsDuTexte(x).forEach((w) => words.add(w));
  for (const w of LECTURE_LEVEL_DATA.TWO_SYLLABLE_WORDS) words.add(w.join(''));
  assert.ok(words.size > 1000, `${words.size} mots`);
  const known = new Set(SON_IDS);
  const all = sons(SON_IDS, []);
  for (const w of words) {
    const last = w.split(/['’]/).pop();
    for (const id of sonsDuMot(last)) assert.ok(known.has(id), `${w} : son inconnu ${id}`);
    assert.ok(estDechiffrable(w, all), `${w} se lit avec tout le programme`);
  }
});

// ---------------------------------------------------------------- Mots et textes déchiffrables

test('déchiffrable : un mot se lit avec les sons vus, les lettres muettes de la fin sont tolérées', () => {
  const debut = sons(['a', 'i', 'o', 'u', 'é', 'e', 'l', 'm', 'r', 's']);
  for (const mot of ['lama', 'mur', 'rire', 'lit', 'rat', 'riz', 'ami', 'Lili', 'mari']) assert.ok(estDechiffrable(mot, debut), mot);
  for (const mot of ['moto', 'lune', 'souris', 'chat', 'maison', 'rose']) assert.equal(estDechiffrable(mot, debut), false, mot);
  // un son de plus, et le mot devient lisible
  assert.ok(estDechiffrable('moto', sons([...debut.vus, 't'])));
  assert.ok(estDechiffrable('souris', sons([...debut.vus, 'ou'])));
  assert.ok(estDechiffrable('rose', sons([...debut.vus, 'se'])));
  // le h muet s'apprend aussi
  assert.equal(estDechiffrable('hibou', sons(['i', 'b', 'ou'])), false);
  assert.ok(estDechiffrable('hibou', sons(['i', 'b', 'ou', 'h'])));
});

test('déchiffrable : les mots-outils sont permis, même avec des sons pas encore vus', () => {
  const peu = sons(['a', 'l']);
  for (const mot of ['le', 'la', 'les', 'un', 'une', 'et', 'est', 'il', 'elle', 'Elle']) assert.ok(estDechiffrable(mot, peu), mot);
  assert.equal(estDechiffrable('dans', sons(['a'], [])), false, 'sans mots-outils, il faut les sons');
  assert.ok(estDechiffrable('l’ami', sons(['a', 'm', 'i'])), 'l’ : comme le, la');
  assert.ok(estDechiffrable('l’ami', sons(['a', 'm', 'i', 'l'], [])), 'l’ : la lettre l');
  assert.equal(estDechiffrable('l’ami', sons(['a', 'm', 'i'], [])), false);
});

test('déchiffrable : un texte se lit si tous ses mots se lisent (ponctuation, nombres et emoji ignorés)', () => {
  const vus = sons(['a', 'i', 'o', 'é', 'e', 'l', 'r', 'ch', 't']);
  assert.ok(texteDechiffrable('Léo a un chat.', vus));
  assert.ok(texteDechiffrable('Le chat de Léo ! 🐱 12', sons([...vus.vus, 'd'])));
  assert.equal(texteDechiffrable('Le chat dort sur le lit.', vus), false);
  assert.deepEqual(motsDuTexte('C’est l’heure, Léa ! 3 pommes.'), ['C’est', 'l’heure', 'Léa', 'pommes']);
});

test('déchiffrable : une syllabe seule n’a pas de lettre muette (« as », « ran »)', () => {
  const vus = sons(['a', 'r', 'an']);
  assert.ok(syllabeDechiffrable('ra', vus));
  assert.ok(syllabeDechiffrable('ran', vus));
  assert.equal(syllabeDechiffrable('as', vus), false);
  assert.equal(syllabeDechiffrable('in', vus), false);
});

test('déchiffrable : sans réglage, ou sans son coché, tout est permis', () => {
  for (const reglage of [undefined, null, {}, { vus: [] }]) {
    assert.ok(estDechiffrable('grenouille', reglage));
    assert.ok(texteDechiffrable('Le chat dort.', reglage));
    const list = ['a', 'b'];
    assert.equal(garderDechiffrables(list, reglage), list);
  }
});

test('filtre : la liste entière reste si trop peu d’éléments se lisent (jamais d’écran vide)', () => {
  const list = ['lama', 'moto', 'chat', 'souris'];
  const vus = sons(['a', 'l', 'm']);
  assert.deepEqual(garderDechiffrables(list, vus), ['lama']);
  assert.equal(garderDechiffrables(list, vus, (w) => w, { min: 2 }), list);
  assert.equal(garderDechiffrables(list, sons(['i'])), list);
});

// ---------------------------------------------------------------- Le réglage de l'enfant

test('réglage : les sons inconnus sont écartés, dans l’ordre du programme ; les mots-outils nettoyés', () => {
  assert.deepEqual(cleanSons(undefined), { vus: [], outils: null });
  assert.deepEqual(cleanSons({ vus: ['ou', 'a', 'pirate', 'a', 3] }), { vus: ['a', 'ou'], outils: null });
  assert.deepEqual(cleanOutils(' Le, LA ;les  le  12 '), ['le', 'la', 'les']);
  assert.deepEqual(cleanSons({ vus: ['a'], outils: ['Et', 'est', ''] }).outils, ['et', 'est']);
  assert.equal(new Set(SON_IDS).size, SONS.length, 'identifiants uniques');
  assert.ok(SONS.length >= 40);
  for (const id of ['a', 'ou', 'on', 'an', 'in', 'oi', 'ch', 'eu', 'è', 'ai', 'au', 'gn', 'ill', 'ph']) assert.ok(SON_IDS.includes(id), id);
});

test('réglage : ce que reçoivent les jeux, et la ligne du Suivi', () => {
  assert.equal(contexteSons({ name: 'Léa' }), undefined);
  assert.equal(contexteSons({ sons: { vus: [] } }), undefined, 'rien de coché : tout est permis');
  assert.deepEqual(contexteSons({ sons: { vus: ['i', 'a'] } }), { vus: ['a', 'i'], outils: MOTS_OUTILS });
  assert.deepEqual(contexteSons({ sons: { vus: ['a'], outils: [] } }), { vus: ['a'], outils: [] });
  assert.equal(resumeSons({ name: 'Léa' }), null);
  assert.equal(resumeSons({ sons: { vus: ['a', 'i', 'h'] } }), `a · i, y · h (3 sur ${SONS.length})`);
});

function memoryStorage() {
  const data = new Map();
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)) };
}

test('réglage : enregistré avec l’enfant, il survit à « effacer la progression »', () => {
  const store = defaultStore();
  const id = addChild(store, { name: 'Léa', grade: 'CP' });
  const other = addChild(store, { name: 'Tom', grade: 'GS' });
  store.profiles[id].sons = { vus: ['a', 'ou', 'zzz'], outils: ['le', 'la'] };
  store.profiles[id].stars = 12;
  const storage = memoryStorage();
  saveStore(store, storage);
  const loaded = loadStore(storage);
  assert.deepEqual(loaded.profiles[id].sons, { vus: ['a', 'ou'], outils: ['le', 'la'] });
  assert.deepEqual(loaded.profiles[other].sons, { vus: [], outils: null }, 'chaque enfant a son propre réglage');
  resetChild(loaded, id);
  assert.equal(loaded.profiles[id].stars, 0);
  assert.deepEqual(loaded.profiles[id].sons, { vus: ['a', 'ou'], outils: ['le', 'la'] });
  assert.ok(JSON.parse(storage.getItem(STORAGE_KEY)).profiles[id].sons);
});

// ---------------------------------------------------------------- Le filtre dans les jeux

/** Ce que l'enfant lit : le décor écrit, les réponses, le mot à écrire (dictée, syllabes à ranger). */
function readTexts(q) {
  const st = q.stage || {};
  return [st.text, st.title, ...(st.sentences || []), ...(q.choices || []).map((c) => c.label), q.interaction === 'order' ? q.answer : null]
    .filter((t) => typeof t === 'string');
}

const DEBUT = ['a', 'i', 'o', 'u', 'é', 'e', 'l', 'm', 'r', 's', 'f', 'v', 'p', 't', 'n', 'd'];
const SANS_SONS_DIFFICILES = SON_IDS.filter((id) => !['gn', 'ill', 'ph', 'oin', 'ien', 'tion', 'y', 'x', 'w', 'ain', 'qu', 'z'].includes(id));
// [jeu, niveaux, sons] : des cas où assez de mots se lisent pour que le filtre s'applique
const CASES = [
  ['bon-mot', [1, 2, 7], DEBUT], ['bon-mot', [1, 2, 3, 4, 5, 6, 7, 8], SANS_SONS_DIFFICILES],
  ['syllabes', [1, 2, 4, 5, 6, 8], DEBUT], ['syllabes', [1, 2, 3, 4, 5, 6, 7, 8], SANS_SONS_DIFFICILES],
  ['dictee', [1, 2, 5, 7, 8], DEBUT], ['dictee', [1, 2, 3, 4, 5, 6, 7, 8], SANS_SONS_DIFFICILES],
  ['phrase', [1, 2, 3, 4, 5, 6, 8], SANS_SONS_DIFFICILES], ['petits-mots', [4, 6, 8], SANS_SONS_DIFFICILES],
  ['petits-textes', [1, 2, 3], SANS_SONS_DIFFICILES], ['histoires', [1], SANS_SONS_DIFFICILES],
];

test('filtre : avec les sons vus, les mots et les textes tirés sont déchiffrables', () => {
  for (const [id, levels, vus] of CASES) {
    const game = findGame(id);
    const reglage = sons(vus);
    for (const level of levels) {
      for (let i = 0; i < 80; i++) {
        const q = game.generate(level, createRng(500 + i), i, { name: 'Lou', season: 'printemps', sons: reglage });
        // les syllabes isolées se lisent sans lettre muette ; les petits mots proposés sont appris par cœur
        const syllables = id === 'syllabes' && (q.choiceStyle === 'letters' || q.key.startsWith('syllabes:ecris'));
        const texts = id === 'petits-mots' ? [q.stage.text] : readTexts(q);
        for (const t of texts) {
          const ok = syllables ? syllabeDechiffrable(t, reglage) : texteDechiffrable(t, reglage);
          assert.ok(ok, `${id} niveau ${level} : « ${t} » (${q.key})`);
        }
      }
    }
  }
});

test('filtre : avec très peu de sons, chaque jeu de lecture garde des questions complètes (comportement habituel)', () => {
  const reglage = sons(['a', 'l']);
  for (const id of ['bon-mot', 'petits-mots', 'syllabes', 'phrase', 'petits-textes', 'histoires', 'dictee']) {
    const game = findGame(id);
    for (let level = 1; level <= game.levels.length; level++) {
      for (let i = 0; i < 20; i++) {
        const q = game.generate(level, createRng(900 + i), i, { name: 'Lou', season: 'noel', sons: reglage });
        assert.ok(q && q.key && q.answer !== undefined, `${id} niveau ${level}`);
        if (q.interaction === 'order') assert.ok(q.items.length >= 2, `${id} niveau ${level} : des éléments à ranger`);
        else assert.ok(q.choices.length >= 2 && q.choices.some((c) => c.value === q.answer), `${id} niveau ${level} : des réponses`);
      }
    }
  }
});

test('filtre : sans réglage (ou rien de coché), les jeux tirent exactement les mêmes questions', () => {
  for (const id of ['bon-mot', 'petits-mots', 'syllabes', 'phrase', 'petits-textes', 'histoires', 'dictee']) {
    const game = findGame(id);
    for (let level = 1; level <= game.levels.length; level++) {
      for (let i = 0; i < 25; i++) {
        const base = JSON.stringify(game.generate(level, createRng(i + 1), i, { name: 'Lou', season: 'printemps' }));
        for (const reglage of [undefined, { vus: [], outils: MOTS_OUTILS }]) {
          assert.equal(JSON.stringify(game.generate(level, createRng(i + 1), i, { name: 'Lou', season: 'printemps', sons: reglage })), base, `${id} ${level}`);
        }
      }
    }
  }
});

test('filtre : avec peu de sons, le bon mot ne propose que des mots faits de ces sons', () => {
  const reglage = sons(['a', 'i', 'o', 'u', 'é', 'l', 'm', 'r', 't', 'v', 'p', 'n', 'd', 's']);
  const seen = new Set();
  for (let i = 0; i < 100; i++) {
    const q = findGame('bon-mot').generate(1, createRng(i), i, { sons: reglage });
    seen.add(q.answer);
    for (const c of q.choices) assert.ok(estDechiffrable(c.label, reglage), c.label);
  }
  assert.ok(!seen.has('bébé') && !seen.has('café') && !seen.has('judo'), 'ni b, ni c, ni j');
  assert.ok(seen.size >= 5, 'assez de variété');
});
