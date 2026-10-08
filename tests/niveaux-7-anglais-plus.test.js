// Les niveaux ajoutés aux jeux d'anglais « plus » (nombres, calcul, couleurs, coloriage, memory,
// intrus, contraires, phrases) : de 7 à 10 niveaux par jeu, réponses justes, choix sans doublon.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findGame } from '../app/js/games/index.js';
import {
  ALL_GROUPS, ALL_OPPOSITES, EN_COLORS, OPPOSITE_SENTENCES, englishNumber, lookAlikes,
} from '../app/js/games/anglais-plus.js';
import { ENGLISH_THEMES } from '../app/js/data/anglais-data.js';
import { createRng } from '../app/js/random.js';

// Nombre de niveaux avant l'ajout : les niveaux suivants sont les nouveaux.
const BEFORE = {
  'nombres-anglais': 6, 'calcul-anglais': 4, 'couleurs-anglais': 3, 'colorie-anglais': 3,
  'memory-anglais': 4, 'intrus-anglais': 3, 'contraires-anglais': 3, 'phrase-anglais': 3,
};

// Les mélanges de couleurs, recopiés ici pour vérifier les réponses.
const MIX = {
  'red+yellow': 'orange', 'blue+yellow': 'green', 'red+blue': 'purple',
  'red+white': 'pink', 'black+white': 'grey', 'red+green': 'brown',
};
const mix = (a, b) => MIX[`${a}+${b}`] || MIX[`${b}+${a}`];

/** Des questions de chaque nouveau niveau d'un jeu, avec le prénom de l'enfant. */
function* newQuestions(id, runs = 150) {
  const game = findGame(id);
  for (let level = BEFORE[id] + 1; level <= game.levels.length; level++) {
    const rng = createRng(4321 + level);
    for (let i = 0; i < runs; i++) yield { level, q: game.generate(level, rng, i, { name: 'Zoé' }) };
  }
}

/** Bonne réponse présente une fois, pas de choix en double. */
function checkChoices(q) {
  const values = q.choices.map((c) => c.value);
  assert.ok(values.length >= 2, q.key);
  assert.equal(new Set(values).size, values.length, `choix en double : ${q.key}`);
  assert.equal(values.filter((v) => v === q.answer).length, 1, `réponse absente ou en double : ${q.key}`);
  const labels = q.choices.map((c) => c.label ?? c.swatch);
  assert.equal(new Set(labels).size, labels.length, `deux choix écrits pareil : ${q.key}`);
}

/** Le texte anglais dit par la question (instruction, rappel). */
const spoken = (q) => [...(q.replay || []), ...[].concat(q.instruction)].filter((p) => p && p.lang).map((p) => p.text);

test('anglais plus : de 7 à 10 niveaux par jeu, libellés courts, nouveaux niveaux à la fin', () => {
  for (const [id, before] of Object.entries(BEFORE)) {
    const game = findGame(id);
    assert.ok(game.levels.length >= 7 && game.levels.length <= 10, `${id} : ${game.levels.length} niveaux`);
    assert.ok(game.levels.length > before, id);
    assert.equal(new Set(game.levels).size, game.levels.length, `${id} : deux niveaux du même nom`);
    for (const label of game.levels) assert.ok([...label].length <= 26, `${id} : « ${label} » trop long`);
  }
});

test('nombres en anglais : lire jusqu’à 100, trouver le nom anglais (fourteen ou forty ?)', () => {
  const seen = new Set();
  for (const { level, q } of newQuestions('nombres-anglais')) {
    checkChoices(q);
    for (const c of q.choices) assert.ok(c.value >= 10 && c.value <= 99, q.key);
    if (level === 7) {
      assert.equal(q.stage.text, englishNumber(q.answer), q.key);
      assert.ok(q.answer >= 21 && q.answer <= 99, q.key);
      assert.equal(q.choices.length, 4);
      for (const c of q.choices) assert.equal(c.label, String(c.value));
    } else {
      assert.equal(q.stage.text, String(q.answer), q.key);
      assert.ok(q.answer >= 13 && q.answer <= 99, q.key);
      assert.equal(q.choices.length, 3);
      for (const c of q.choices) assert.equal(c.label, englishNumber(c.value), q.key);
      seen.add(q.answer < 20 ? 'teen' : q.answer % 10 === 0 ? 'dizaine' : 'autre');
    }
    // les pièges d'abord : 14 et 40, 42 et 24
    const { traps } = lookAlikes(q.answer);
    for (const t of traps.slice(0, q.choices.length - 1)) assert.ok(q.choices.some((c) => c.value === t), `${q.key} : sans ${t}`);
  }
  assert.deepEqual([...seen].sort(), ['autre', 'dizaine', 'teen']);
  assert.deepEqual(lookAlikes(14).traps, [40]);
  assert.deepEqual(lookAlikes(40).traps, [14]);
  assert.deepEqual(lookAlikes(42).traps, [24]);
});

test('calcul en anglais : jusqu’à 20, écouter seulement, écrire le résultat', () => {
  const ops = new Set();
  for (const { level, q } of newQuestions('calcul-anglais')) {
    const [, a, op, b] = q.key.match(/:(\d+)([+−])(\d+)$/);
    const [x, y] = [Number(a), Number(b)];
    const result = op === '+' ? x + y : x - y;
    assert.equal(q.answer, result, q.key);
    assert.ok(result >= 1 && result <= 20 && x <= 20 && y <= 20, q.key);
    assert.ok(Math.max(x, result) >= 11, `un nombre de 11 à 20 : ${q.key}`);
    assert.ok(spoken(q).includes(`${englishNumber(x)} ${op === '+' ? 'plus' : 'minus'} ${englishNumber(y)}?`), q.key);
    if (level === 5) assert.equal(op, '+');
    if (level === 6) assert.equal(op, '−');
    if (level >= 7) ops.add(op);
    if (level === 7) assert.equal(q.stage.type, 'listen');
    if (level === 8) {
      assert.equal(q.interaction, 'keypad');
      assert.ok(String(q.answer).length <= q.maxDigits);
    } else {
      checkChoices(q);
      assert.equal(q.choices.length, 4);
    }
  }
  assert.deepEqual([...ops].sort(), ['+', '−']);
});

test('couleurs en anglais : écouter, répondre en anglais, retrouver les deux couleurs', () => {
  for (const { level, q } of newQuestions('couleurs-anglais')) {
    checkChoices(q);
    if (level <= 6) {
      const [, a, b] = spoken(q)[0].match(/^(\w+) and (\w+) make\.\.\.\?$/);
      assert.equal(q.answer, mix(a, b), q.key);
      if (level === 4 || level === 6) assert.equal(q.stage.type, 'listen');
      if (level === 5) assert.equal(q.stage.text, `${a} + ${b} = ?`);
      if (level === 4) for (const c of q.choices) assert.equal(c.swatch, EN_COLORS[c.value].hex);
      else for (const c of q.choices) assert.equal(c.label, c.value);
    } else {
      assert.equal(q.stage.text, `? + ? = ${q.answer}`);
      for (const c of q.choices) {
        const [, a, b] = c.label.match(/^(\w+) and (\w+)$/);
        assert.equal(mix(a, b), c.value, c.label);
      }
    }
  }
});

test('colorie en anglais : tout le nuancier, mots qui se ressemblent, mélanges', () => {
  for (const { level, q } of newQuestions('colorie-anglais')) {
    const { legend, zones } = q.stage;
    assert.equal(q.interaction, 'colorby');
    assert.equal(legend.length, { 4: 5, 5: 5, 6: 3, 7: 4 }[level], q.key);
    assert.equal(new Set(legend.map((c) => c.hex)).size, legend.length, `deux couleurs pareilles : ${q.key}`);
    legend.forEach((c, i) => assert.equal(c.n, i + 1));
    for (const c of legend) {
      if (level <= 5) {
        assert.equal(c.hex, EN_COLORS[c.word].hex, q.key);
        assert.notEqual(c.word, 'white', 'du blanc sur un dessin blanc');
      } else {
        const [a, b] = c.word.split(' + ');
        assert.equal(c.hex, EN_COLORS[mix(a, b)].hex, c.word);
        assert.equal(c.name, EN_COLORS[mix(a, b)].fr);
      }
    }
    if (level === 5) assert.deepEqual(legend.map((c) => c.word).sort(), ['black', 'blue', 'brown', 'green', 'grey']);
    for (const z of zones) assert.equal(z.label, String(legend[z.c].n));
    assert.ok(new Set(zones.map((z) => z.c)).size >= 3, q.key);
  }
});

test('memory anglais : vêtements, corps, nombres, mots français', () => {
  const byEn = new Map(ENGLISH_THEMES.flatMap((t) => t.words).map((w) => [w.en, w]));
  for (const { level, q } of newQuestions('memory-anglais')) {
    const pairs = { 5: 5, 6: 5, 7: 6, 8: 6 }[level];
    assert.equal(q.cards.length, pairs * 2, q.key);
    const groups = Map.groupBy(q.cards, (c) => c.pair);
    assert.equal(groups.size, pairs, q.key);
    for (const [pair, cards] of groups) {
      assert.equal(cards.length, 2, q.key);
      const [english, other] = cards[0].lang === 'en' && cards[0].label === pair ? cards : [cards[1], cards[0]];
      assert.equal(english.label, pair);
      assert.notEqual(other.label, pair);
      if (level === 5) assert.ok(ENGLISH_THEMES.find((t) => t.title === 'Les vêtements').words.some((w) => w.en === pair));
      if (level === 6) assert.ok(ENGLISH_THEMES.find((t) => t.title === 'Le corps').words.some((w) => w.en === pair));
      if (level <= 6) assert.equal(other.label, byEn.get(pair).emoji);
      if (level === 7) assert.equal(englishNumber(Number(other.label)), pair);
      if (level === 8) {
        assert.equal(other.lang, 'fr');
        assert.equal(other.label, byEn.get(pair).fr.replace(/'/g, '’'));
      }
      // un mot tient sur une carte
      for (const c of cards) assert.ok(c.label.split(/[\s’]/).every((w) => [...w].length <= 8), c.label);
    }
  }
});

test('intrus anglais : plus de familles, mots qui se ressemblent, trouver la famille', () => {
  const themeOf = (title) => ENGLISH_THEMES.find((t) => t.title === title).words.map((w) => w.en);
  const themes = ALL_GROUPS.map((g) => themeOf(g.theme));
  for (const { level, q } of newQuestions('intrus-anglais')) {
    checkChoices(q);
    assert.equal(q.choices.length, 4);
    const words = q.choices.map((c) => c.value);
    // une seule famille contient trois des mots, et l'intrus n'en fait pas partie
    const families = themes.filter((t) => words.filter((w) => t.includes(w)).length >= 3);
    assert.equal(families.length, 1, `famille ambiguë : ${q.key}`);
    const [family] = families;
    assert.deepEqual(words.filter((w) => !family.includes(w)), [q.answer], q.key);
    assert.ok(!words.includes('family'), q.key);
    if (family === themeOf('À manger')) assert.notEqual(q.answer, 'fish', 'le poisson se mange');
    if (level === 5) assert.equal(q.stage.type, 'listen');
    if (level === 7) assert.equal(q.text, 'Lequel n’est pas de la même famille que les autres ?');
    else {
      const group = ALL_GROUPS[themes.indexOf(family)];
      assert.equal(q.text, `Lequel n’est pas ${group.fr} ?`);
    }
  }
});

test('contraires anglais : plus de contraires, phrases à compléter', () => {
  const opposite = new Map(ALL_OPPOSITES.flatMap(([x, y]) => [[x.en, y.en], [y.en, x.en]]));
  assert.equal(opposite.size, ALL_OPPOSITES.length * 2, 'un mot n’a qu’un contraire');
  for (const { level, q } of newQuestions('contraires-anglais')) {
    checkChoices(q);
    assert.equal(q.choices.length, 3);
    if (level <= 5) {
      const word = level === 4 ? q.stage.text : q.replay[0].text;
      assert.equal(q.answer, opposite.get(word), q.key);
      for (const c of q.choices) if (c.value !== q.answer) assert.notEqual(opposite.get(c.value), word, q.key);
    } else {
      const item = OPPOSITE_SENTENCES.find((it) => q.key.endsWith(it.s));
      assert.ok(item, q.key);
      const [first] = item.s.split('. ');
      const word = opposite.get(q.answer);
      assert.ok(first.split(' ').includes(word), `${q.answer} n’est pas le contraire d’un mot de « ${first} »`);
      assert.ok(q.choices.some((c) => c.value === word), 'le même mot est un piège');
      assert.equal(q.stage.type, level === 6 ? 'sentence' : 'listen');
    }
  }
});

test('phrase anglaise : questions, sans image, réponses, d’après le français', () => {
  for (const { level, q } of newQuestions('phrase-anglais')) {
    assert.equal(q.interaction, 'order');
    const words = [...q.items].sort((a, b) => a.value - b.value).map((i) => i.label);
    assert.ok(words.length >= 3 && words.length <= 5, q.key);
    assert.ok(q.items.some((it, i) => it.value !== i), `déjà dans l’ordre : ${q.key}`);
    assert.equal(q.answer, `${words.join(' ')}${level === 4 ? '?' : '.'}`, q.key);
    // les mots tiennent sur une ligne de 5 cases
    for (const w of words) assert.ok([...w].length <= (words.length === 5 ? 6 : 7), `${w} : trop long (${q.key})`);
    if (level === 5) assert.equal(q.stage.type, 'listen');
    if (level === 6 && q.key.endsWith('What is your name?')) assert.equal(q.answer, 'My name is Zoé.');
    if (level === 7) {
      assert.equal(q.stage.type, 'sentence');
      assert.ok(!spoken(q).length, 'pas d’anglais à entendre avant de répondre');
      assert.match(q.stage.text, /[.!?]$/);
    }
  }
});
