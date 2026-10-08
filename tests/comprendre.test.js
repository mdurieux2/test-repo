// Comprendre une histoire : « Dans l'ordre » (remettre les images d'une histoire dans l'ordre,
// le début, la fin, avant, ensuite) et les questions « pourquoi ? » des petits textes (niveaux 9 et 10).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOMAINS, findGame } from '../app/js/games/index.js';
import { ORDER_STORIES } from '../app/js/games/comprendre.js';
import { TEXT_DATA } from '../app/js/games/textes.js';
import { createRng } from '../app/js/random.js';

const game = findGame('ordre-histoire');

/** `runs` questions tirées à ce niveau, avec le prénom de l'enfant. */
function draws(level, runs = 200, seed = 4242) {
  const rng = createRng(seed + level * 17);
  return Array.from({ length: runs }, (_, i) => game.generate(level, rng, i, { name: 'Zoé' }));
}

const storyOf = (q) => {
  const story = ORDER_STORIES.find((s) => `ordre-histoire:${s.id}` === q.key);
  assert.ok(story, `histoire inconnue : ${q.key}`);
  return story;
};
const emojiOf = (step) => step[0].replace(/ /g, '');
const kind = (q) => {
  if (q.interaction === 'order') return q.items.some((it) => it.caption) ? `ordre-${q.items.length}-lu` : `ordre-${q.items.length}`;
  if (q.text.endsWith('avant ?')) return 'avant';
  if (q.text.endsWith('ensuite ?')) return 'ensuite';
  return 'debut-fin';
};

test('dans l’ordre : rubrique Histoires, 10 niveaux aux libellés courts et uniques', () => {
  assert.ok(game, 'jeu absent');
  assert.equal(game.domain, 'histoires');
  assert.ok(DOMAINS.find((d) => d.id === 'histoires').games.includes(game));
  assert.ok(game.levels.length >= 7 && game.levels.length <= 10);
  assert.equal(game.levels.length, 10);
  for (const label of game.levels) assert.ok(label.length <= 26, `« ${label} » trop long`);
  assert.equal(new Set(game.levels).size, game.levels.length);
});

test('dans l’ordre : au moins 25 histoires de 3 à 5 images, phrases justes et courtes', () => {
  assert.ok(ORDER_STORIES.length >= 25, `${ORDER_STORIES.length} histoires`);
  assert.equal(new Set(ORDER_STORIES.map((s) => s.id)).size, ORDER_STORIES.length, 'identifiant en double');
  for (const story of ORDER_STORIES) {
    const n = story.steps.length;
    assert.ok(n >= 3 && n <= 5, story.id);
    assert.ok(['vie', 'nature', 'cuisine'].includes(story.theme), story.id);
    assert.equal(new Set(story.steps.map(([, s]) => s)).size, n, `${story.id} : phrase en double`);
    assert.equal(new Set(story.steps.map(emojiOf)).size, n, `${story.id} : image en double`);
    for (const [emoji, sentence] of story.steps) {
      assert.ok(emoji.trim() && emoji.split(' ').length <= 2, `${story.id} : scène « ${emoji} »`);
      assert.ok(/^[A-ZÀ-Ý].*[^ ]\.$/u.test(sentence), `${story.id} : « ${sentence} » (majuscule, point final)`);
      assert.ok(!sentence.includes("'") && !/ {2}/.test(sentence), `${story.id} : typographie de « ${sentence} »`);
      assert.ok(sentence.length <= 30, `${story.id} : « ${sentence} » trop long`);
      // la légende tient dans une image (4 ou 5 images par rangée sur un téléphone)
      if (n >= 4) for (const w of sentence.split(' ')) assert.ok(w.length <= 10, `${story.id} : mot trop long « ${w} »`);
    }
  }
  // assez d'histoires pour chaque niveau
  const count = (f) => ORDER_STORIES.filter(f).length;
  assert.ok(count((s) => s.steps.length === 3 && s.theme === 'vie') >= 5);
  assert.ok(count((s) => s.steps.length === 3 && s.theme !== 'vie') >= 5);
  assert.ok(count((s) => s.steps.length === 4 && s.clair) >= 5);
  assert.ok(count((s) => s.steps.length === 4) >= 10);
  assert.ok(count((s) => s.steps.length === 5) >= 6);
});

test('dans l’ordre : niveaux 1 à 5 et 7, ranger les images (jamais déjà rangées)', () => {
  const expected = { 1: [3, false], 2: [3, false], 3: [4, false], 4: [4, false], 5: [4, true], 7: [5, true] };
  for (const [level, [n, captions]] of Object.entries(expected).map(([l, v]) => [Number(l), v])) {
    const seen = new Set();
    for (const q of draws(level)) {
      const story = storyOf(q);
      seen.add(story.id);
      assert.equal(q.interaction, 'order', q.key);
      assert.equal(q.order, 'asc');
      assert.equal(q.items.length, n, q.key);
      assert.equal(story.steps.length, n, q.key);
      assert.deepEqual(q.items.map((it) => it.value).sort(), story.steps.map((_, i) => i), q.key);
      assert.ok(!q.items.every((it, i) => it.value === i), `${q.key} : déjà dans l’ordre`);
      for (const it of q.items) {
        assert.equal(it.emoji, emojiOf(story.steps[it.value]));
        assert.equal(it.label, story.steps[it.value][1]);
        assert.equal(Boolean(it.caption), captions, `${q.key} niveau ${level} : légende`);
      }
      assert.equal(q.answer, story.steps.map(([, s]) => s).join(' '));
      if (level === 1) assert.equal(story.theme, 'vie');
      if (level === 2) assert.notEqual(story.theme, 'vie');
      if (level === 3) assert.ok(story.clair, `${story.id} : les images seules ne suffisent pas`);
      // niveau 4 : l'histoire est racontée, phrase par phrase, dans l'ordre
      if (level === 4) {
        assert.deepEqual(q.instruction.slice(1), story.steps.map(([, s]) => s));
        assert.equal(q.stage.type, 'listen');
      } else {
        assert.deepEqual(q.instruction, ['Remets les images dans l’ordre de l’histoire.']);
      }
    }
    assert.ok(seen.size >= 5, `niveau ${level} : ${seen.size} histoires seulement`);
  }
});

test('dans l’ordre : niveaux 6, 8 et 9, la bonne image (une seule) parmi des images sans ambiguïté', () => {
  for (const level of [6, 8, 9]) {
    for (const q of draws(level)) {
      const story = storyOf(q);
      const values = q.choices.map((c) => c.value);
      const index = (v) => story.steps.findIndex(([, s]) => s === v);
      assert.equal(new Set(values).size, values.length, `${q.key} : choix en double`);
      assert.equal(values.filter((v) => v === q.answer).length, 1, `${q.key} : réponse absente ou en double`);
      assert.equal(q.choiceStyle, 'steps');
      for (const c of q.choices) {
        assert.ok(index(c.value) >= 0, `${q.key} : « ${c.value} » n’est pas de cette histoire`);
        assert.equal(c.caption, c.value);
        assert.equal(c.emoji, emojiOf(story.steps[index(c.value)]));
      }
      const n = story.steps.length;
      assert.ok(n >= 4, q.key);
      if (level === 6) {
        assert.equal(values.length, 4);
        const start = q.text.includes('début');
        assert.equal(index(q.answer), start ? 0 : n - 1, q.key);
        // le début et la fin sont toujours parmi les choix
        assert.ok(values.includes(story.steps[0][1]) && values.includes(story.steps[n - 1][1]));
      } else {
        assert.equal(values.length, 3);
        // l'image montrée est dite dans la question
        const k = story.steps.findIndex((step) => emojiOf(step) === q.stage.emoji);
        assert.ok(k >= 0, q.key);
        assert.equal(q.instruction[0], story.steps[k][1]);
        const others = values.filter((v) => v !== q.answer).map(index);
        if (level === 8) {
          assert.equal(index(q.answer), k - 1, q.key);
          assert.ok(others.every((i) => i > k), `${q.key} : un autre choix est aussi avant`);
        } else {
          assert.equal(index(q.answer), k + 1, q.key);
          assert.ok(others.every((i) => i < k), `${q.key} : un autre choix est aussi après`);
        }
      }
    }
  }
});

test('dans l’ordre : niveau 10, tout mélangé ; tirages déterministes', () => {
  const kinds = new Set(draws(10, 50).map(kind));
  for (const k of ['ordre-4-lu', 'ordre-5-lu', 'debut-fin', 'avant', 'ensuite']) assert.ok(kinds.has(k), `niveau 10 : pas de « ${k} »`);
  for (let level = 1; level <= game.levels.length; level++) {
    assert.deepEqual(draws(level, 20, 7), draws(level, 20, 7), `niveau ${level} : tirage non déterministe`);
  }
});

test('petits textes : niveaux 9 (pourquoi ?) et 10 (ce que pense le personnage)', () => {
  const textes = findGame('petits-textes');
  assert.equal(textes.levels.length, 10);
  assert.equal(textes.levels[8], 'Pourquoi ?');
  assert.equal(textes.levels[9], 'Ce que pense le personnage');
  for (const level of [9, 10]) {
    const texts = TEXT_DATA.filter((t) => t.level === level);
    assert.ok(texts.length >= 5, `niveau ${level} : ${texts.length} textes`);
    for (const t of texts) {
      assert.ok(!t.season, 'pas de texte de saison à ces niveaux');
      for (const [question] of t.questions) {
        assert.ok(question.endsWith(' ?'), question);
        if (level === 9) assert.ok(question.startsWith('Pourquoi '), question);
      }
    }
    // niveau 10 : au moins une question sur ce que ressent le personnage dans chaque texte
    if (level === 10) for (const t of texts) assert.ok(t.questions.some(([q]) => q.startsWith('Comment se sent')), t.title);
    const rng = createRng(99 + level);
    for (let i = 0; i < 100; i++) {
      const q = textes.generate(level, rng, i, { name: 'Zoé', season: 'noel' });
      const t = TEXT_DATA.find((x) => `petits-textes:${x.title}` === q.key);
      assert.equal(t.level, level);
      const [, answer, ...others] = t.questions.find(([question]) => question === q.text);
      assert.equal(q.answer, answer);
      assert.deepEqual(q.choices.map((c) => c.value).sort(), [answer, ...others].sort());
    }
  }
});
