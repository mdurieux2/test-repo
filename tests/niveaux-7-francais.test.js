// Niveaux ajoutés aux jeux de français pour qu'ils aient de 7 à 10 niveaux : réponses justes
// (recalculées quand c'est possible), choix sans doublon, libellés courts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findGame } from '../app/js/games/index.js';
import { GRAMMAR_DATA, LONG_SENTENCE, SOUND_DATA } from '../app/js/games/francais-extra.js';
import { LECTURE_LEVEL_DATA } from '../app/js/games/lecture.js';
import { FIRST_SOUNDS, PICTURES } from '../app/js/data/lecture-data.js';
import { createRng } from '../app/js/random.js';

// Nombre de niveaux avant l'ajout, et nombre de niveaux après.
const LEVELS = {
  'syllabes-rythme': [6, 8], rimes: [5, 8], 'premier-son': [6, 8], syllabes: [6, 8], 'bon-mot': [6, 8],
  'petits-mots': [6, 8], phrase: [5, 8], homophones: [5, 8], genre: [6, 8],
};
const RUNS = 150;

/** 150 questions tirées à ce niveau, avec le prénom de l'enfant. */
function draws(id, level, runs = RUNS) {
  const rng = createRng(2024 + level * 31 + id.length);
  return Array.from({ length: runs }, (_, i) => findGame(id).generate(level, rng, i, { name: 'Zoé' }));
}

const values = (q) => q.choices.map((c) => c.value);
const wrongs = (q) => values(q).filter((v) => v !== q.answer);
const sortedItems = (q) => [...q.items].sort((a, b) => a.value - b.value);
const last = (key) => key.split(':').at(-1);

test('jeux de français : de 7 à 10 niveaux, les nouveaux à la fin, libellés courts et uniques', () => {
  for (const [id, [before, after]] of Object.entries(LEVELS)) {
    const game = findGame(id);
    assert.equal(game.levels.length, after, id);
    assert.ok(game.levels.length >= 7 && game.levels.length <= 10, id);
    for (const label of game.levels.slice(before)) assert.ok([...label].length <= 26, `${id} : « ${label} » trop long`);
    assert.equal(new Set(game.levels).size, game.levels.length, `${id} : libellé en double`);
  }
});

test('nouveaux niveaux : la bonne réponse une seule fois, pas de choix en double, ordre à retrouver', () => {
  for (const [id, [before, after]] of Object.entries(LEVELS)) {
    for (let level = before + 1; level <= after; level++) {
      for (const q of draws(id, level)) {
        const ctx = `${id} niveau ${level} : ${q.key}`;
        assert.ok(q.key && q.text && q.instruction && q.stage?.type, ctx);
        if (q.interaction === 'order') {
          const v = q.items.map((i) => i.value);
          assert.ok(v.length >= 3 && new Set(v).size === v.length, ctx);
          assert.notDeepEqual(v, sortedItems(q).map((i) => i.value), `${ctx} : déjà dans l’ordre`);
          continue;
        }
        assert.ok(q.choices.length >= 2 && q.choices.length <= 4, ctx); // homophones : 2 ou 3 mots
        assert.equal(values(q).filter((v) => v === q.answer).length, 1, `${ctx} : réponse absente ou en double`);
        assert.equal(new Set(values(q)).size, q.choices.length, `${ctx} : valeur en double`);
        assert.equal(new Set(q.choices.map((c) => c.label)).size, q.choices.length, `${ctx} : choix identiques`);
        for (const c of q.choices) assert.ok(c.label, `${ctx} : choix sans libellé`);
      }
    }
  }
});

// ---------------------------------------------------------------- Frappe les syllabes et les rimes

test('frappe les syllabes : recoller les syllabes, du plus court au plus long', () => {
  const { SPOKEN_SYLLABLES, SYLLABLE_WORDS } = SOUND_DATA;
  for (const q of draws('syllabes-rythme', 7)) {
    assert.equal(q.answer, last(q.key));
    assert.deepEqual(q.replay.map((p) => p.text), SPOKEN_SYLLABLES[q.answer], q.key);
    for (const w of wrongs(q)) assert.notDeepEqual(SPOKEN_SYLLABLES[w], SPOKEN_SYLLABLES[q.answer], `${q.key} : ${w}`);
  }
  const syllables = (w) => Number(Object.keys(SYLLABLE_WORDS).find((n) => SYLLABLE_WORDS[n].includes(w)));
  for (const q of draws('syllabes-rythme', 8)) {
    assert.equal(q.interaction, 'order');
    const sorted = sortedItems(q);
    for (const it of q.items) assert.equal(it.value, syllables(it.label), it.label);
    assert.ok(sorted.every((it, i) => i === 0 || it.value > sorted[i - 1].value), q.key);
    assert.equal(sorted.map((it) => it.label).join(','), q.answer);
    assert.ok(q.stage.emoji, q.key);
  }
});

test('rimes : le piège du même début, le piège du sens, le son de la fin', () => {
  const { RHYMES, START_TRAPS, SENSE_TRAPS, RHYME_SOUNDS } = SOUND_DATA;
  const group = (w) => RHYMES.findIndex((g) => g.includes(w));
  for (const q of draws('rimes', 6)) {
    const target = last(q.key);
    assert.equal(group(q.answer), group(target), q.key);
    assert.notEqual(q.answer, target);
    for (const w of wrongs(q)) assert.notEqual(group(w), group(target), `${q.key} : ${w} rime`);
    const traps = START_TRAPS.filter(([t]) => t === target).map(([, trap]) => trap);
    assert.equal(values(q).filter((w) => traps.includes(w)).length, 1, `${q.key} : le piège manque`);
  }
  for (const [target, trap] of START_TRAPS) {
    assert.ok(group(target) >= 0 && group(trap) !== group(target), `${target} / ${trap}`);
  }
  for (const q of draws('rimes', 7)) {
    const item = SENSE_TRAPS.find((s) => s.anchor === last(q.key));
    assert.equal(q.answer, item.answer);
    assert.equal(group(q.answer), group(item.anchor), q.key);
    assert.ok(values(q).includes(item.trap), q.key);
    for (const w of wrongs(q)) assert.notEqual(group(w), group(item.anchor), `${q.key} : ${w} rime`);
  }
  for (const q of draws('rimes', 8)) {
    const sound = q.key.split(':')[2];
    const index = RHYME_SOUNDS.findIndex((s) => s?.sound === sound);
    assert.ok(RHYMES[index].includes(q.answer), q.key);
    for (const w of wrongs(q)) assert.ok(!RHYMES[index].includes(w), `${q.key} : ${w} finit pareil`);
  }
  for (const level of [6, 7, 8]) {
    for (const q of draws('rimes', level)) {
      assert.ok(q.stage.emoji, q.key);
      for (const c of q.choices) assert.ok(c.label, `${q.key} : ${c.value} sans image`);
    }
  }
});

// ---------------------------------------------------------------- Lecture

test('premier son : sons proches, puis au début, au milieu ou à la fin', () => {
  const { CLOSE_SOUNDS, SOUND_PLACES } = LECTURE_LEVEL_DATA;
  for (const q of draws('premier-son', 7)) {
    const word = q.success.reveal;
    assert.ok(FIRST_SOUNDS.find((s) => s.grapheme === q.answer).words.includes(word), `${word} / ${q.answer}`);
    const twin = CLOSE_SOUNDS.find((p) => p.includes(q.answer)).find((g) => g !== q.answer);
    assert.ok(values(q).includes(twin), `${word} : ${twin} manque`);
    for (const g of wrongs(q)) assert.ok(!word.startsWith(g), `${word} / ${g}`);
    assert.equal(q.stage.emoji, PICTURES[word]);
  }
  for (const { sound, words } of SOUND_PLACES) {
    const all = words.flat();
    assert.equal(new Set(all).size, all.length, `${sound} : un mot à deux places`);
  }
  const places = new Set();
  for (const q of draws('premier-son', 8)) {
    const [, , sound, word] = q.key.split(':');
    const { words } = SOUND_PLACES.find((s) => s.sound === sound);
    assert.deepEqual(values(q), ['au début', 'au milieu', 'à la fin']);
    assert.ok(words[values(q).indexOf(q.answer)].includes(word), `${word} : ${q.answer}`);
    if (q.answer === 'au début') assert.ok(word.startsWith(sound[0]), word);
    assert.ok(q.stage.emoji, word);
    places.add(q.answer);
  }
  assert.equal(places.size, 3, 'les trois places doivent sortir');
});

test('syllabes : la syllabe de la fin, écrire un mot de trois syllabes', () => {
  const { TWO_SYLLABLE_WORDS } = LECTURE_LEVEL_DATA;
  const words = TWO_SYLLABLE_WORDS.map((w) => w.join(''));
  for (const q of draws('syllabes', 7)) {
    const stem = q.stage.text.replace('…', '');
    assert.equal(stem + q.answer, q.success.reveal, q.key);
    assert.ok(TWO_SYLLABLE_WORDS.some(([a, b]) => a === stem && b === q.answer), q.key);
    for (const w of wrongs(q)) assert.ok(!words.includes(stem + w), `${q.key} : ${stem + w} est aussi un mot`);
    assert.equal(q.choices.length, 4, q.key);
  }
  for (const q of draws('syllabes', 8)) {
    assert.equal(q.interaction, 'order');
    assert.equal(q.items.length, 3);
    assert.equal(sortedItems(q).map((i) => i.label).join(''), q.answer, q.key);
    assert.equal(new Set(q.items.map((i) => i.label)).size, 3, `${q.key} : syllabe en double`);
  }
});

test('le bon mot : la lettre muette, le mot qui regroupe', () => {
  const { SILENT_LETTERS, CATEGORIES } = LECTURE_LEVEL_DATA;
  for (const q of draws('bon-mot', 7)) {
    const item = SILENT_LETTERS.find((s) => s.word === q.answer);
    assert.deepEqual(wrongs(q).sort(), [...item.wrongs].sort(), q.key);
    // la lettre muette s'entend dans le mot de la même famille
    assert.ok(item.family.startsWith(item.word) || item.family.startsWith(item.word.slice(0, -1)), item.family);
    for (const w of item.wrongs) assert.ok(w.startsWith(item.word.slice(0, -1)) && w !== item.word, w);
    assert.ok(q.stage.emoji, q.key);
  }
  const all = CATEGORIES.flatMap((c) => c.words);
  assert.equal(new Set(all).size, all.length, 'un mot dans deux catégories');
  for (const q of draws('bon-mot', 8)) {
    const shown = q.stage.text.replace(' : ce sont des…', '').split(', ');
    assert.equal(shown.length, 3);
    const fits = CATEGORIES.filter((c) => shown.every((w) => c.words.includes(w))).map((c) => c.name);
    assert.deepEqual(fits, [q.answer], q.key);
    for (const w of wrongs(q)) assert.ok(CATEGORIES.some((c) => c.name === w), w);
  }
});

test('les petits mots : le mot de la question, il / elle / ils / elles', () => {
  const { QUESTIONS, PRONOUN_SENTENCES } = LECTURE_LEVEL_DATA;
  for (const q of draws('petits-mots', 7)) {
    const [rest, reply] = q.key.replace('petits-mots:question:', '').split(':');
    const item = QUESTIONS.find(([r, rep]) => r === rest && rep === reply);
    assert.equal(q.answer, item[2], q.key);
    assert.equal(q.stage.text, `… ${rest} — ${reply}`);
  }
  for (const q of draws('petits-mots', 8)) {
    assert.deepEqual(values(q), ['il', 'elle', 'ils', 'elles']);
    const [sentence, answer] = PRONOUN_SENTENCES.find(([s]) => s.replace('___', '…') === q.stage.text);
    assert.equal(q.answer, answer, sentence);
    assert.equal(q.stage.text.replace('…', q.answer), q.success.speak);
    // le verbe ou l'adjectif s'accorde avec le pronom : pluriel avec ils / elles
    const after = sentence.split('___')[1];
    assert.equal(/ (sont|ont|[a-z]+ent)[ .]/.test(after), q.answer.endsWith('s'), sentence);
  }
  for (const [s, answer] of PRONOUN_SENTENCES) {
    const subject = s.split(',')[0];
    if (/^Les |\bet\b/.test(subject)) assert.ok(answer.endsWith('s'), s);
    else assert.ok(!answer.endsWith('s'), s);
  }
});

// ---------------------------------------------------------------- Lis la phrase, homophones, déterminants

test('lis la phrase : remettre les mots en ordre, qui / quoi / quand / où, la phrase négative', () => {
  const { WORD_ORDER, WH_SENTENCES, NEGATIONS } = GRAMMAR_DATA;
  for (const q of draws('phrase', 6)) {
    const text = sortedItems(q).map((i) => i.label).join(' ');
    assert.equal(text, q.answer);
    assert.ok(WORD_ORDER.some((s) => s.text === text), text);
    assert.match(text, /^[A-Z][^.]*\.$/, text);
    assert.ok(q.items.length >= 4 && q.items.length <= 5, text);
  }
  for (const q of draws('phrase', 7)) {
    const item = WH_SENTENCES.find((s) => s.text === q.stage.text);
    const kind = Object.keys(item.parts).find((k) => item.parts[k][0] === q.text);
    assert.equal(q.answer, item.parts[kind][1], q.text);
    for (const v of values(q)) assert.ok(item.text.toLowerCase().includes(v.toLowerCase()), `${v} pas dans « ${item.text} »`);
    for (const c of q.choices) for (const w of c.label.split(/\s+/)) assert.ok(w.length <= 11, w);
  }
  const negative = (s) => /\b(ne|n’)/.test(s) && / pas\b/.test(s) && !/ ne [aeéiouy]/.test(s) && !/ ne pas /.test(s);
  for (const q of draws('phrase', 8)) {
    const item = NEGATIONS.find(([s]) => s === q.stage.text);
    assert.equal(q.answer, item[1]);
    assert.ok(negative(q.answer), q.answer);
    for (const w of wrongs(q)) assert.ok(!negative(w), w);
    assert.ok(q.choices.filter((c) => c.label.length > LONG_SENTENCE).length <= 2, values(q).join(' / '));
  }
});

test('homophones : la / là, ce / se, c’est / s’est (et des révisions)', () => {
  const { HOMOPHONES } = GRAMMAR_DATA;
  const pairs = { 6: ['la', 'là'], 7: ['ce', 'se'], 8: ['c’est', 's’est'] };
  for (const level of [6, 7, 8]) {
    let fresh = 0;
    for (const q of draws('homophones', level)) {
      assert.equal(values(q).length, values(q).includes('as') ? 3 : 2, q.key);
      const sentence = q.key.replace('homophones:', '');
      const set = HOMOPHONES.find((h) => h.items.some(([s]) => s === sentence));
      assert.ok(set.level <= level, q.key);
      assert.equal(q.answer, set.items.find(([s]) => s === sentence)[1], q.key);
      assert.deepEqual(values(q), set.pair);
      assert.equal(q.stage.text.replace('…', q.answer), q.success.speak, q.key);
      if (set.level === level) fresh++;
    }
    assert.deepEqual(HOMOPHONES.find((h) => h.level === level).pair, pairs[level]);
    assert.ok(fresh > RUNS / 2, `niveau ${level} : la nouvelle paire doit être la plus fréquente`);
  }
  // indices de grammaire : « se » devant un verbe après il / elle / ils, « s’est » devant un participe
  for (const [s, answer] of HOMOPHONES.find((h) => h.level === 7).items) {
    assert.equal(/^(Il|Elle|Ils|Le chat) ___/.test(s), answer === 'se', s);
  }
});

test('déterminants : le nom au pluriel, tout le groupe s’accorde', () => {
  const { NOUNS, X_NOUNS } = GRAMMAR_DATA;
  const all = [...NOUNS, ...X_NOUNS];
  let x = 0;
  for (const q of draws('genre', 7)) {
    const noun = all.find((n) => n.pl === q.answer);
    assert.ok(noun, q.answer);
    assert.equal(values(q)[0], noun.w);
    assert.match(q.answer, /[sx]$/);
    assert.equal(q.stage.count, 3);
    assert.ok(q.stage.emoji, q.answer);
    if (q.answer.endsWith('x')) x++;
  }
  assert.ok(x > RUNS / 4, 'des pluriels en x doivent sortir souvent');
  for (const q of draws('genre', 8)) {
    const [det, adj, word] = q.answer.split(' ');
    const plural = det === 'les';
    const noun = NOUNS.find((n) => (plural ? n.pl : n.w) === word);
    assert.ok(noun, q.answer);
    if (!plural) assert.equal(det, noun.g === 'f' ? 'la' : 'le', q.answer);
    const base = ['petit', 'grand', 'joli'].find((a) => adj.startsWith(a));
    assert.equal(adj, `${base}${noun.g === 'f' ? 'e' : ''}${plural ? 's' : ''}`, q.answer);
    assert.equal(q.stage.count, plural ? 3 : 1);
    for (const w of wrongs(q)) assert.equal(w.split(' ')[0], det, w);
  }
});
