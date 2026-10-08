// Lot « écrire et lire » : les niveaux ajoutés à la fin de « Écris au doigt », de la dictée,
// des histoires lues et des petits textes (7 à 10 niveaux par jeu). Pour chaque nouveau niveau,
// de nombreux tirages : bonne réponse présente une fois, choix sans doublon, réponse juste.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findGame } from '../app/js/games/index.js';
import { STORY_DATA } from '../app/js/games/histoires.js';
import { TEXT_DATA } from '../app/js/games/textes.js';
import { createRng } from '../app/js/random.js';
import {
  ATTACHE, CHIFFRES, MOTS_ATTACHES, NOMBRES, SYLLABES_ATTACHEES,
} from '../app/js/data/ecriture-data.js';

// nombre de niveaux avant l'ajout : les suivants sont les nouveaux
const BEFORE = { ecrire: 5, dictee: 6, histoires: 6, 'petits-textes': 6 };

/** `runs` questions tirées à ce niveau, avec le prénom de l'enfant. */
function draws(id, level, runs = 150) {
  const rng = createRng(2027 + level * 31);
  return Array.from({ length: runs }, (_, i) => findGame(id).generate(level, rng, i, { name: 'Zoé' }));
}

/** Les nouveaux niveaux d'un jeu, chacun avec ses tirages. */
function* newLevels(id) {
  const game = findGame(id);
  for (let level = BEFORE[id] + 1; level <= game.levels.length; level++) yield { level, qs: draws(id, level) };
}

const said = (q) => [q.instruction].flat().map((p) => (typeof p === 'string' ? p : p.text)).join(' ');

/** Choix multiple : la bonne réponse une fois, pas de doublon, des mots courts (téléphone). */
function checkChoices(q) {
  const values = q.choices.map((c) => c.value);
  assert.ok(values.length >= 2 && values.length <= 3, `${q.key} : ${values.length} choix`);
  assert.equal(new Set(values).size, values.length, `${q.key} : choix en double`);
  assert.equal(new Set(q.choices.map((c) => c.label)).size, values.length, `${q.key} : libellés en double`);
  assert.equal(values.filter((v) => v === q.answer).length, 1, `${q.key} : réponse absente ou en double`);
  for (const c of q.choices) for (const w of c.label.split(/\s+/)) assert.ok(w.length <= 11, `${q.key} : mot trop long « ${w} »`);
}

test('lot écrire et lire : 7 à 10 niveaux par jeu, au moins 2 nouveaux, libellés courts et uniques', () => {
  for (const [id, before] of Object.entries(BEFORE)) {
    const { levels } = findGame(id);
    assert.ok(levels.length >= 7 && levels.length <= 10, `${id} : ${levels.length} niveaux`);
    assert.ok(levels.length >= before + 2, `${id} : pas assez de nouveaux niveaux`);
    for (const label of levels) assert.ok(label.length <= 26, `${id} : « ${label} » trop long`);
    assert.equal(new Set(levels).size, levels.length, `${id} : libellé en double`);
  }
});

test('écris au doigt : nombres à 2 chiffres (dizaines puis unités), syllabes et mots attachés', () => {
  const step = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  for (const { level, qs } of newLevels('ecrire')) {
    for (const q of qs) {
      const { set, glyph, strokes, lines } = q.stage;
      assert.equal(q.interaction, 'trace', q.key);
      assert.equal(q.answer, glyph, q.key);
      assert.deepEqual(q.choices, [], q.key);
      assert.ok(said(q).includes('en partant du point vert'), q.key);
      assert.ok(q.text.includes(glyph), `${q.key} : le texte ne dit pas quoi écrire`);
      for (const st of strokes) {
        assert.ok(st.length >= 2, `${q.key} : trait vide`);
        for (const [x, y] of st) assert.ok(x >= 0 && x <= 100 && y >= 0 && y <= 100, `${q.key} : [${x}, ${y}] hors du carré`);
        for (let i = 1; i < st.length; i++) assert.ok(step(st[i - 1], st[i]) <= 6.5, `${q.key} : points trop espacés`);
      }
      if (level === 6) {
        // le nombre : ses deux chiffres, réduits, celui des dizaines à gauche et en premier
        assert.equal(set, 'nombres');
        assert.match(q.text, /^Écris le nombre \d\d\.$/);
        const n = Number(glyph);
        assert.ok(n >= 10 && n <= 99, q.key);
        assert.deepEqual(strokes, NOMBRES[glyph]);
        const tens = CHIFFRES[glyph[0]].length;
        assert.equal(strokes.length, tens + CHIFFRES[glyph[1]].length, q.key);
        strokes.slice(0, tens).flat().forEach(([x]) => assert.ok(x < 50, `${q.key} : dizaines à droite`));
        strokes.slice(tens).flat().forEach(([x]) => assert.ok(x > 50, `${q.key} : unités à gauche`));
        assert.equal(lines, null);
        continue;
      }
      // syllabes (niveau 7), petits mots (niveau 8) : en attaché, d'un seul geste
      assert.equal(set, 'attache');
      assert.ok((level === 7 ? SYLLABES_ATTACHEES : MOTS_ATTACHES).includes(glyph), q.key);
      assert.ok(level === 7 ? glyph.length === 2 : glyph.length >= 3 && glyph.length <= 4, q.key);
      assert.deepEqual(strokes, ATTACHE[glyph].strokes);
      assert.deepEqual(lines, ATTACHE[glyph].lines);
      // un seul trait pour tout le mot, puis les points du i et du j, les barres du t et du x
      assert.equal(strokes.length, 1 + [...glyph].filter((l) => 'ijtx'.includes(l)).length, q.key);
      const [main] = strokes;
      assert.ok(Math.abs(main[0][1] - lines.base) <= 4, `${q.key} : départ loin de la ligne`);
      assert.ok(main[1][1] < main[0][1], `${q.key} : le trait d’attaque monte`);
      assert.ok(main.at(-1)[0] > main[0][0] + 30, `${q.key} : le mot s’écrit de gauche à droite`);
      assert.ok(lines.base - lines.x >= 13, `${q.key} : lettres trop petites`);
      assert.ok(said(q).includes('attachées'), q.key);
    }
  }
  // toutes les syllabes et tous les mots sont prêts, et les mots sont bien des mots de la liste
  for (const w of [...SYLLABES_ATTACHEES, ...MOTS_ATTACHES]) assert.ok(ATTACHE[w], w);
  assert.equal(new Set([...SYLLABES_ATTACHEES, ...MOTS_ATTACHES]).size, SYLLABES_ATTACHEES.length + MOTS_ATTACHES.length);
});

test('dictée : lettres muettes puis accents, avec des pièges du même genre', () => {
  const seen = { 7: new Set(), 8: new Set() };
  for (const { level, qs } of newLevels('dictee')) {
    for (const q of qs) {
      const placed = q.items.filter((it) => it.value !== null).sort((a, b) => a.value - b.value).map((it) => it.label);
      const traps = q.items.filter((it) => it.value === null).map((it) => it.label);
      assert.equal(placed.join(''), q.answer, q.key);
      assert.notEqual(q.items.filter((it) => it.value !== null).map((it) => it.label).join(''), q.answer, `${q.key} : déjà dans l’ordre`);
      assert.ok(traps.length >= 1 && traps.length <= 2, `${q.key} : ${traps.length} pièges`);
      assert.equal(new Set(traps).size, traps.length, q.key);
      for (const t of traps) assert.ok(!q.answer.includes(t), `${q.key} : le piège ${t} est dans le mot`);
      assert.ok(q.answer.length >= 3 && q.answer.length <= 7, `${q.key} : mot trop long pour l’écran`);
      assert.ok(q.items.length <= 9, q.key);
      assert.equal(q.stage.type, 'listen', 'plus d’image : on écoute');
      assert.equal(q.replay[0].text, q.answer);
      if (level === 7) {
        assert.match(q.answer, /[stdxzp]$/, `${q.key} : pas de lettre muette à la fin`);
        for (const t of traps) assert.ok('stdx'.includes(t), `${q.key} : piège ${t}`);
      }
      if (level === 8) {
        assert.match(q.answer, /[éèê]/, `${q.key} : pas d’accent`);
        for (const t of traps) assert.ok(['é', 'è', 'ê', 'e'].includes(t), `${q.key} : piège ${t}`);
      }
      seen[level].add(q.answer);
    }
  }
  assert.ok(seen[7].size >= 15 && seen[8].size >= 15, 'des mots variés');
});

test('histoires : le sens des mots, puis vrai, faux ou on ne sait pas', () => {
  for (const level of [7, 8]) {
    const stories = STORY_DATA.filter((s) => s.level === level);
    assert.ok(stories.length >= 4, `niveau ${level} : ${stories.length} histoires`);
    for (const s of stories) {
      assert.ok(s.sentences.length >= 3 && s.sentences.length <= 4, s.title);
      assert.ok(s.sentences.join(' ').length <= 230, `${s.title} trop longue`);
      assert.equal(new Set([s.answer, ...s.others]).size, 3, s.title);
      assert.ok(!s.season, s.title);
      if (level === 7) assert.match(s.question, /« .+ »/, `${s.title} : le mot à expliquer est entre guillemets`);
      if (level === 8) assert.deepEqual([s.answer, ...s.others].sort(), ['faux', 'on ne sait pas', 'vrai'], s.title);
    }
    // chaque histoire de ce niveau sort, avec son identifiant (voix enregistrée par un parent)
    const qs = draws('histoires', level, 300);
    for (const s of stories) assert.ok(qs.some((q) => q.stage.storyId === s.id), `${s.title} jamais proposée`);
    for (const q of qs) {
      const story = STORY_DATA.find((s) => `histoires:${s.title}` === q.key);
      assert.ok(story && story.level === level, q.key);
      assert.equal(q.stage.type, 'karaoke');
      assert.equal(q.stage.storyId, story.id);
      assert.deepEqual(q.stage.sentences, story.sentences);
      assert.ok(q.karaoke);
      checkChoices(q);
      assert.equal(q.choices.length, 3);
      assert.equal(q.answer, story.answer, `${q.key} : réponse juste`);
      if (level === 8) {
        // toujours dans le même ordre : on ne cherche pas « vrai » à chaque fois
        assert.deepEqual(q.choices.map((c) => c.value), ['vrai', 'faux', 'on ne sait pas']);
        assert.ok(q.text.startsWith(story.question), q.key);
      }
    }
  }
  const ids = STORY_DATA.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'identifiants d’histoires en double');
});

test('petits textes : textes documentaires, puis consignes et recettes', () => {
  for (const { level, qs } of newLevels('petits-textes')) {
    const texts = TEXT_DATA.filter((t) => t.level === level);
    assert.ok(texts.length >= 5, `niveau ${level} : ${texts.length} textes`);
    for (const t of texts) {
      assert.ok(t.text.length <= 220, `${t.title} trop long`);
      assert.ok(t.questions.length >= 2, t.title);
      for (const [question, ...answers] of t.questions) {
        assert.ok(question.endsWith('?'), question);
        assert.equal(new Set(answers).size, 3, question);
      }
    }
    for (const q of qs) {
      const t = TEXT_DATA.find((x) => `petits-textes:${x.title}` === q.key);
      assert.ok(t && t.level === level, q.key);
      assert.equal(q.stage.type, 'text');
      assert.equal(q.stage.title, t.title, 'le titre est montré');
      assert.equal(q.stage.text, t.text);
      checkChoices(q);
      // la réponse est bien celle du texte pour cette question
      const [, answer] = t.questions.find(([question]) => question === q.text);
      assert.equal(q.answer, answer, q.key);
    }
  }
});
