// Histoires et petits textes de saison : proposés une fois sur deux pendant leur saison,
// jamais en dehors ; identifiants stables des histoires (les voix enregistrées en dépendent).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findGame } from '../app/js/games/index.js';
import { pickSeasonal } from '../app/js/games/helpers.js';
import { STORY_DATA } from '../app/js/games/histoires.js';
import { TEXT_DATA } from '../app/js/games/textes.js';
import { SEASON_LABELS, seasonOf } from '../app/js/themes.js';
import { createRng } from '../app/js/random.js';

const SEASONS = ['noel', 'halloween', 'hiver', 'printemps', 'ete', 'automne'];
const GAMES = { histoires: STORY_DATA, 'petits-textes': TEXT_DATA };
const titleOf = (q) => q.key.slice(q.key.indexOf(':') + 1);

/** `runs` questions tirées à ce niveau, avec ce contexte. */
function draws(id, level, context, runs = 300, seed = 99) {
  const rng = createRng(seed + level);
  return Array.from({ length: runs }, (_, i) => findGame(id).generate(level, rng, i, context));
}

function itemOf(id, q) {
  return GAMES[id].find((item) => item.title === titleOf(q));
}

test('saisons : chaque saison de themes.js a un nom, et chaque élément de saison une saison connue', () => {
  const year = Array.from({ length: 366 }, (_, d) => seasonOf(new Date(2028, 0, 1 + d)).id);
  assert.deepEqual([...new Set(year)].sort(), [...SEASONS].sort());
  assert.deepEqual(Object.keys(SEASON_LABELS).sort(), [...SEASONS].sort());
  for (const item of [...STORY_DATA, ...TEXT_DATA]) {
    if ('season' in item) assert.ok(SEASONS.includes(item.season), `${item.title} : saison inconnue « ${item.season} »`);
  }
});

test('saisons : au moins 8 histoires (2 pour Noël) et 6 petits textes, au moins un de chaque saison', () => {
  const stories = STORY_DATA.filter((s) => s.season);
  const texts = TEXT_DATA.filter((t) => t.season);
  assert.ok(stories.length >= 8, `${stories.length} histoires de saison`);
  assert.ok(texts.length >= 6, `${texts.length} textes de saison`);
  for (const season of SEASONS) {
    assert.ok(stories.some((s) => s.season === season), `aucune histoire pour ${season}`);
    assert.ok(texts.some((t) => t.season === season), `aucun texte pour ${season}`);
  }
  assert.ok(stories.filter((s) => s.season === 'noel').length >= 2, 'deux histoires de Noël');
  // les titres restent uniques (la clé d'une question est le titre)
  for (const list of Object.values(GAMES)) assert.equal(new Set(list.map((x) => x.title)).size, list.length);
});

test('histoires : identifiants stables, ordre et niveaux d’origine inchangés', () => {
  const ORIGINAL = [
    ['chat-pelote', 1], ['pluie', 1], ['gateau', 1], ['petit-poisson', 1], ['au-parc', 1], ['ferme', 1], ['bonne-nuit', 1], ['neige', 1],
    ['velo-rouge', 2], ['loup-gourmand', 2], ['sortie-mer', 2], ['chien-perdu', 2], ['cabane', 2], ['fusee', 2],
    ['tresor-grenier', 3], ['course-escargots', 3], ['cerf-volant', 3], ['boulangerie', 3],
    ['parapluie-oublie', 4], ['paquet-dore', 4], ['glace-fraise', 4], ['pirate-attend', 4], ['tour-cubes', 4], ['traces', 4],
    ['pique-nique', 5], ['spectacle', 5], ['petit-bateau', 5], ['dent-qui-bouge', 5], ['herisson', 5], ['marche', 5],
    ['fleur-zoe', 6], ['bonhomme', 6], ['poussin', 6], ['chenille', 6], ['gateau-ines', 6], ['journee-leo', 6],
  ];
  // les histoires ajoutées depuis (nouveaux niveaux) viennent après
  assert.deepEqual(STORY_DATA.filter((s) => !s.season).slice(0, ORIGINAL.length).map((s) => [s.id, s.level]), ORIGINAL);
  const ids = STORY_DATA.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'identifiants en double');
  for (const id of ids) assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/, `identifiant mal formé : ${id}`);
  // l'identifiant est donné avec la question (pour jouer la voix enregistrée)
  for (const season of [undefined, ...SEASONS]) {
    for (let level = 1; level <= 6; level++) {
      for (const q of draws('histoires', level, { name: 'Zoé', season }, 40)) {
        assert.equal(q.stage.storyId, itemOf('histoires', q).id, q.key);
      }
    }
  }
});

test('saisons : sans saison dans le contexte (tests), aucun élément de saison', () => {
  for (const id of Object.keys(GAMES)) {
    for (let level = 1; level <= 6; level++) {
      for (const context of [undefined, {}, { name: 'Zoé' }]) {
        for (const q of draws(id, level, context, 200)) assert.ok(!itemOf(id, q).season, `${id} niveau ${level} : ${q.key}`);
      }
    }
  }
});

test('saisons : pendant leur saison, une fois sur deux environ ; jamais hors saison', () => {
  for (const [id, list] of Object.entries(GAMES)) {
    for (const season of SEASONS) {
      for (let level = 1; level <= 6; level++) {
        const mine = list.filter((x) => x.level === level && x.season === season);
        const qs = draws(id, level, { name: 'Zoé', season }, 400);
        const seasonal = qs.map((q) => itemOf(id, q)).filter((x) => x.season);
        for (const item of seasonal) assert.equal(item.season, season, `${id} : « ${item.title} » hors de sa saison (${season})`);
        if (!mine.length) {
          assert.equal(seasonal.length, 0);
          continue;
        }
        const share = seasonal.length / qs.length;
        assert.ok(share > 0.4 && share < 0.6, `${id} niveau ${level} (${season}) : ${Math.round(share * 100)} % de saison`);
        // chaque élément de la saison finit par sortir
        for (const item of mine) assert.ok(seasonal.includes(item), `${id} : « ${item.title} » jamais proposé`);
      }
    }
  }
});

test('saisons : tirage pur et déterministe, inchangé pour les éléments sans saison', () => {
  for (const id of Object.keys(GAMES)) {
    for (let level = 1; level <= 6; level++) {
      const keys = (context) => draws(id, level, context, 60, 7).map((q) => JSON.stringify(q));
      assert.deepEqual(keys({ season: 'noel' }), keys({ season: 'noel' }), `${id} niveau ${level}`);
      // une saison sans élément à ce niveau : exactement les mêmes questions que sans saison
      for (const season of SEASONS) {
        if (GAMES[id].some((x) => x.level === level && x.season === season)) continue;
        assert.deepEqual(keys({ season }), keys({}), `${id} niveau ${level} (${season})`);
      }
    }
  }
  // l'aide au tirage : un élément de saison quand il n'y a que ça, rien d'autre que les éléments sans saison sinon
  const rng = createRng(3);
  assert.equal(pickSeasonal(rng, [{ season: 'ete', n: 1 }], 'ete').n, 1);
  for (let i = 0; i < 50; i++) assert.equal(pickSeasonal(rng, [{ n: 1 }, { season: 'ete', n: 2 }], 'hiver').n, 1);
});

test('saisons : les éléments de saison tiennent à l’écran comme les autres (longueurs, réponses)', () => {
  const storyText = (s) => s.sentences.join(' ');
  const answersOf = (s) => (s.steps ? s.steps.map(([, label]) => label) : [s.answer, ...s.others]);
  const textAnswers = (t) => t.questions.flatMap(([, ...answers]) => answers);
  const longest = (list, level, measure) => Math.max(...list.filter((x) => !x.season && x.level === level).flatMap(measure).map((v) => v.length));
  for (const s of STORY_DATA.filter((x) => x.season)) {
    assert.ok(storyText(s).length <= longest(STORY_DATA, s.level, (x) => [storyText(x)]), `${s.title} : histoire trop longue`);
    for (const a of answersOf(s)) assert.ok(a.length <= longest(STORY_DATA, s.level, answersOf), `${s.title} : réponse trop longue « ${a} »`);
  }
  for (const t of TEXT_DATA.filter((x) => x.season)) {
    assert.ok(t.text.length <= longest(TEXT_DATA, t.level, (x) => [x.text]), `${t.title} : texte trop long`);
    for (const a of textAnswers(t)) assert.ok(a.length <= longest(TEXT_DATA, t.level, textAnswers), `${t.title} : réponse trop longue « ${a} »`);
  }
  // les questions tirées en saison : réponse présente une fois, choix distincts, mots courts
  for (const id of Object.keys(GAMES)) {
    for (const season of SEASONS) {
      for (let level = 1; level <= 6; level++) {
        for (const q of draws(id, level, { name: 'Zoé', season }, 80)) {
          if (q.interaction === 'order') {
            assert.notDeepEqual(q.items.map((i) => i.value), [...q.items].map((i) => i.value).sort((a, b) => a - b), q.key);
            continue;
          }
          const values = q.choices.map((c) => c.value);
          assert.equal(new Set(values).size, values.length, q.key);
          assert.equal(values.filter((v) => v === q.answer).length, 1, q.key);
          if (q.choiceStyle === 'answers') {
            for (const c of q.choices) for (const w of c.label.split(/\s+/)) assert.ok(w.length <= 11, `${q.key} : mot trop long « ${w} »`);
          }
        }
      }
    }
  }
});
