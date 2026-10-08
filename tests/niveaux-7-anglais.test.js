// Lot A, anglais : entre 7 et 10 niveaux par jeu. Les 5 jeux à thèmes passent de 13 à 10
// niveaux (thèmes regroupés deux par deux, sans perdre de mot), « Where is the cat? » et
// « Parle anglais » passent de 6 à 8 niveaux. Réponses justes, choix sans doublon, libellés courts.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findGame } from '../app/js/games/index.js';
import { createRng } from '../app/js/random.js';
import { COLOUR_PHRASES, ENGLISH_THEMES } from '../app/js/data/anglais-data.js';

const ALL_WORDS = ENGLISH_THEMES.flatMap((t) => t.words);
const THEME_GAMES = ['ecoute', 'lis-anglais', 'mot-anglais', 'relie-anglais', 'epelle-anglais'];
const NEW_LEVELS = {
  ecoute: [10], 'lis-anglais': [10], 'mot-anglais': [10], 'relie-anglais': [10], 'epelle-anglais': [10],
  'ou-est': [7, 8], 'parle-anglais': [7, 8],
};

/** Les questions d'un niveau, tirées avec une graine fixe. */
function draw(id, level, runs = 150) {
  const game = findGame(id);
  const rng = createRng(2024 + level * 31);
  return Array.from({ length: runs }, (_, i) => game.generate(level, rng, i, { name: 'Zoé' }));
}

/** Choix multiple : la bonne réponse une seule fois, pas de choix en double. */
function checkChoices(id, level, q) {
  const values = q.choices.map((c) => c.value);
  assert.equal(new Set(values).size, values.length, `${id} ${level} : choix en double ${values}`);
  assert.equal(values.filter((v) => v === q.answer).length, 1, `${id} ${level} : ${q.answer} absent de ${values}`);
}

test('anglais : entre 7 et 10 niveaux, libellés courts', () => {
  for (const id of Object.keys(NEW_LEVELS)) {
    const game = findGame(id);
    assert.ok(game.levels.length >= 7 && game.levels.length <= 10, `${id} : ${game.levels.length} niveaux`);
    for (const level of NEW_LEVELS[id]) assert.ok(level <= game.levels.length, `${id} : pas de niveau ${level}`);
    // les libellés nouveaux ou changés : tous ceux des jeux à thèmes, les derniers des autres
    const labels = THEME_GAMES.includes(id) ? game.levels : NEW_LEVELS[id].map((level) => game.levels[level - 1]);
    for (const label of labels) assert.ok([...label].length <= 26, `${id} : « ${label} » trop long`);
  }
  for (const id of THEME_GAMES) assert.equal(findGame(id).levels.length, 10, id);
});

test('anglais : les thèmes regroupés en 6 niveaux, aucun mot perdu, choix dans le même thème', () => {
  const themeOf = new Map(ENGLISH_THEMES.flatMap((t) => t.words.map((w) => [w.en, t.title])));
  for (const id of ['ecoute', 'mot-anglais', 'lis-anglais']) {
    const seen = new Set();
    for (let level = 1; level <= 6; level++) {
      for (const q of draw(id, level, 400)) {
        checkChoices(id, level, q);
        seen.add(q.answer);
        const themes = new Set(q.choices.map((c) => themeOf.get(c.value)));
        assert.equal(themes.size, 1, `${id} ${level} : un seul thème par question (${[...themes]})`);
      }
    }
    // « lis » écarte les mots de plus de 8 lettres (trop longs pour l'écran)
    const expected = ALL_WORDS.filter((w) => id !== 'lis-anglais' || w.en.length <= 8);
    for (const w of expected) assert.ok(seen.has(w.en), `${id} : « ${w.en} » n'est plus dans aucun niveau`);
  }
  // relier : les 4 mots du même thème ; chaque mot est relié au bon mot français
  const seen = new Set();
  for (let level = 1; level <= 6; level++) {
    for (const q of draw('relie-anglais', level, 300)) {
      assert.equal(new Set(q.pairs.map((p) => themeOf.get(p.right))).size, 1);
      for (const p of q.pairs) {
        assert.equal(ALL_WORDS.find((w) => w.en === p.right).fr, p.left);
        seen.add(p.right);
      }
    }
  }
  for (const w of ALL_WORDS) assert.ok(seen.has(w.en), `relie-anglais : « ${w.en} » perdu`);
  // le premier niveau reste facile : couleurs et nombres, 3 images (les MS jouent à « écoute »)
  for (const q of draw('ecoute', 1)) {
    assert.equal(q.choices.length, 3);
    assert.ok(['Les couleurs', 'Les nombres'].includes(themeOf.get(q.answer)), q.answer);
  }
});

test('écoute et lis, niveau 10 : les 4 phrases croisées (2 objets × 2 couleurs)', () => {
  for (const id of ['ecoute', 'lis-anglais']) {
    for (const q of draw(id, 10)) {
      checkChoices(id, 10, q);
      const said = id === 'ecoute' ? q.replay[0].text : q.stage.text;
      assert.equal(said, q.answer, `${id} : on entend ou on lit la bonne phrase`);
      const phrases = q.choices.map((c) => COLOUR_PHRASES.find((p) => p.en === c.value));
      assert.ok(phrases.every(Boolean), q.key);
      assert.equal(phrases.length, 4);
      assert.equal(new Set(phrases.map((p) => p.thing)).size, 2, '2 objets');
      assert.equal(new Set(phrases.map((p) => p.colour)).size, 2, '2 couleurs');
      for (const c of q.choices) assert.equal(c.label, COLOUR_PHRASES.find((p) => p.en === c.value).emoji);
    }
  }
});

test('le mot anglais, niveau 10 : l’ordre des mots (a green book, pas a book green)', () => {
  for (const q of draw('mot-anglais', 10)) {
    checkChoices('mot-anglais', 10, q);
    assert.equal(q.choices.length, 3);
    const target = COLOUR_PHRASES.find((p) => p.emoji === q.stage.emoji);
    assert.equal(q.answer, target.en, 'l’image va avec la réponse');
    assert.ok(q.choices.some((c) => c.value === `a ${target.thing} ${target.colour}`), 'le piège de l’ordre du français');
    const other = q.choices.find((c) => c.value !== q.answer && !c.value.endsWith(target.colour));
    const near = COLOUR_PHRASES.find((p) => p.en === other.value);
    assert.ok(near && (near.thing === target.thing || near.colour === target.colour), q.key);
  }
});

test('relie en anglais, niveau 10 : sans image, des mots anglais qui se ressemblent', () => {
  for (const q of draw('relie-anglais', 10)) {
    assert.equal(q.pairs.length, 4);
    assert.ok(q.pairs.every((p) => !p.emoji && !p.swatch), 'sans image');
    for (const p of q.pairs) {
      assert.equal(ALL_WORDS.find((w) => w.en === p.right).fr, p.left, `${p.left} ↔ ${p.right}`);
      assert.ok(p.left.split(/[\s'’-]/).every((part) => part.length <= 8), p.left);
    }
    assert.equal(new Set(q.pairs.map((p) => p.left)).size, 4);
    assert.deepEqual([...q.rights].sort(), q.pairs.map((p) => p.right).sort());
    const close = (a, b) => a[0] === b[0] || Math.abs(a.length - b.length) <= 1;
    assert.ok(q.rights.some((r) => q.rights.filter((o) => o !== r && close(o, r)).length >= 2), `mots pas assez proches : ${q.rights}`);
  }
});

test('épelle en anglais, niveau 10 : l’image sans le son, et deux lettres pièges', () => {
  for (const q of draw('epelle-anglais', 10)) {
    const letters = q.items.filter((i) => i.value !== null);
    const traps = q.items.filter((i) => i.value === null);
    assert.equal([...letters].sort((a, b) => a.value - b.value).map((i) => i.label).join(''), q.answer);
    assert.notEqual(letters.map((i) => i.label).join(''), q.answer, 'déjà dans l’ordre');
    assert.equal(traps.length, 2);
    assert.equal(new Set(traps.map((t) => t.label)).size, 2);
    for (const t of traps) assert.ok(!q.answer.includes(t.label), `piège ${t.label} dans ${q.answer}`);
    assert.ok(q.items.length <= 8, 'pas plus de 8 lettres');
    assert.equal(q.replay, undefined, 'pas de son');
    assert.ok(!new RegExp(`\\b${q.answer}\\b`).test(JSON.stringify(q.instruction)), `le mot ${q.answer} n’est pas dit`);
    const word = ALL_WORDS.find((w) => w.en === q.answer);
    assert.ok(q.stage.emoji === (word.emoji || word.label) || q.stage.color === word.swatch, q.answer);
  }
});

test('where is the cat?, niveaux 7 et 8 : la petite histoire, puis « Who is…? » ou « Where is…? »', () => {
  const PLACES = { 'in the basket': 'in', 'on the table': 'on', 'under the table': 'under', 'next to the table': 'next' };
  for (const level of [7, 8]) {
    for (const q of draw('ou-est', level)) {
      checkChoices('ou-est', level, q);
      const [story, question] = q.replay;
      const told = [...story.text.matchAll(/The (\w+) is ([a-z ]+)\./g)].map(([, pet, place]) => ({ pet, place }));
      assert.equal(told.length, level === 7 ? 2 : 3, story.text);
      assert.equal(new Set(told.map((t) => t.pet)).size, told.length, 'des animaux différents');
      assert.equal(new Set(told.map((t) => t.place)).size, told.length, 'des endroits différents');
      const who = question.text.match(/^Who is ([a-z ]+)\?$/);
      if (who) {
        assert.equal(q.answer, told.find((t) => t.place === who[1]).pet, `${story.text} ${question.text}`);
        assert.equal(q.choices.length, 3);
        assert.equal(q.choices.filter((c) => told.some((t) => t.pet === c.value)).length, told.length);
      } else {
        assert.equal(level, 8, '« Where is…? » seulement au niveau 8');
        const [, pet] = question.text.match(/^Where is the (\w+)\?$/);
        assert.equal(q.answer, `${pet}:${PLACES[told.find((t) => t.pet === pet).place]}`, `${story.text} ${question.text}`);
        assert.equal(q.choices.length, 4);
        assert.ok(q.choices.every((c) => c.value.startsWith(`${pet}:`)), 'le même animal aux 4 endroits');
      }
    }
  }
});

test('parle anglais, niveaux 7 et 8 : être poli, répondre selon l’image', () => {
  const polite = {
    bousculé: 'Sorry!', passer: 'Excuse me!', biscuit: 'A cookie, please!', merci: 'You’re welcome!',
    livre: 'Here you are!', tombé: 'Are you OK?', sœur: 'This is my sister.', compris: 'Can you repeat, please?',
  };
  for (const q of draw('parle-anglais', 7)) {
    checkChoices('parle-anglais', 7, q);
    assert.equal(q.choices.length, 3);
    const clue = Object.keys(polite).find((k) => q.text.includes(k));
    assert.equal(q.answer, polite[clue], q.text);
    const values = q.choices.map((c) => c.value);
    assert.ok(!(values.includes('Sorry!') && values.includes('Excuse me!')), 'sorry et excuse me jamais ensemble');
  }
  const weather = { '☀️': 'sunny', '🌧️': 'rainy', '❄️': 'snowy', '💨': 'windy', '☁️': 'cloudy' };
  const numbers = ['one', 'two', 'three', 'four', 'five', 'six'];
  const kinds = new Set();
  for (const q of draw('parle-anglais', 8)) {
    checkChoices('parle-anglais', 8, q);
    assert.equal(q.choices.length, 3);
    const ask = q.replay[0].text;
    kinds.add(ask.split(' ')[1]);
    if (ask === 'What colour is it?') {
      assert.equal(ALL_WORDS.find((w) => w.swatch === q.stage.color).en, q.answer.match(/^It’s (\w+)\.$/)[1]);
    } else if (ask === 'What is it?') {
      assert.equal(ALL_WORDS.find((w) => w.emoji === q.stage.emoji).en, q.answer.match(/^It’s an? (\w+)\.$/)[1]);
      assert.ok(!/ a [aeiou]/.test(q.answer), `an devant une voyelle : ${q.answer}`);
    } else if (ask === 'How are you?') {
      assert.equal(ALL_WORDS.find((w) => w.emoji === q.stage.emoji).en, q.answer.match(/^I’m (\w+)\.$/)[1]);
    } else if (ask === 'What’s the weather like?') {
      assert.equal(q.answer, `It’s ${weather[q.stage.emoji]}.`);
    } else {
      assert.match(ask, /^How many \w+\?$/);
      assert.equal(q.stage.type, 'objects');
      assert.equal(numbers.indexOf(q.answer.split(' ')[0].toLowerCase()) + 1, q.stage.count, q.answer);
    }
  }
  assert.equal(kinds.size, 5, 'cinq sortes de questions');
});
