// Niveaux ajoutés aux jeux de français et d'histoires : chaque nouvelle compétence est
// vérifiée sur de nombreux tirages (la bonne réponse est juste, les intrus sont faux).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findGame } from '../app/js/games/index.js';
import { LONG_SENTENCE, SOUND_DATA } from '../app/js/games/francais-extra.js';
import { TEXT_DATA } from '../app/js/games/textes.js';
import { STORY_DATA } from '../app/js/games/histoires.js';
import { PROGRAMS } from '../app/js/programs.js';
import { createRng } from '../app/js/random.js';
import { CLUSTER_SOUNDS, FINAL_SOUNDS, PICTURES } from '../app/js/data/lecture-data.js';

const NEW_LEVELS = {
  'syllabes-rythme': [4, 5, 6], rimes: [3, 4, 5], lettres: [5, 6, 7], phrase: [3, 4, 5], homophones: [3, 4, 5],
  genre: [4, 5, 6], 'premier-son': [4, 5, 6], syllabes: [4, 5, 6], 'bon-mot': [4, 5, 6], 'petits-mots': [4, 5, 6],
  'petits-textes': [4, 5, 6], histoires: [4, 5, 6],
};

/** 150 questions tirées à ce niveau. */
function* draws(id, level, runs = 150) {
  const rng = createRng(4321 + level);
  for (let i = 0; i < runs; i++) yield findGame(id).generate(level, rng, i, { name: 'Zoé' });
}

const values = (q) => q.choices.map((c) => c.value);
const wrongs = (q) => values(q).filter((v) => v !== q.answer);
const sortedItems = (q) => [...q.items].sort((a, b) => a.value - b.value);

test('trois niveaux ajoutés à la fin de chaque jeu, libellés courts', () => {
  for (const [id, levels] of Object.entries(NEW_LEVELS)) {
    const game = findGame(id);
    assert.ok(game.levels.length >= levels.at(-1), id); // d'autres niveaux ont pu s'ajouter depuis
    for (const label of game.levels.slice(levels[0] - 1)) assert.ok(label.length <= 26, `${id} : libellé trop long « ${label} »`);
    assert.equal(new Set(game.levels).size, game.levels.length, `${id} : libellé en double`);
  }
});

test('chaque nouveau niveau est au programme d’au moins une classe', () => {
  for (const [id, levels] of Object.entries(NEW_LEVELS)) {
    for (const level of levels) {
      const reachable = Object.values(PROGRAMS).some((domains) => Object.values(domains).flat()
        .some(([gameId, min, max]) => gameId === id && level >= min && level <= max));
      assert.ok(reachable, `${id} niveau ${level} : dans aucune classe`);
    }
  }
});

test('nouveaux niveaux : réponses courtes et choix sans doublon (mise en page téléphone)', () => {
  for (const [id, levels] of Object.entries(NEW_LEVELS)) {
    for (const level of levels) {
      for (const q of draws(id, level, 60)) {
        if (q.interaction === 'order') {
          assert.notDeepEqual(q.items.map((i) => i.value), sortedItems(q).map((i) => i.value), `${q.key} : déjà dans l’ordre`);
          continue;
        }
        assert.equal(new Set(q.choices.map((c) => c.label)).size, q.choices.length, `${q.key} : deux choix identiques`);
        if (q.choiceStyle === 'answers') {
          for (const c of q.choices) for (const w of c.label.split(/\s+/)) assert.ok(w.length <= 11, `${q.key} : mot trop long « ${w} »`);
        }
      }
    }
  }
});

test('frappe les syllabes : même syllabe au début ou à la fin, le mot le plus long', () => {
  const { SAME_START, SAME_END, SYLLABLE_WORDS } = SOUND_DATA;
  for (const [level, groups] of [[4, SAME_START], [5, SAME_END]]) {
    for (const q of draws('syllabes-rythme', level)) {
      const target = q.key.split(':').at(-1);
      const group = groups.find((g) => g.words.includes(target));
      assert.ok(group.words.includes(q.answer) && q.answer !== target, q.key);
      for (const w of wrongs(q)) assert.ok(!group.words.includes(w), `${q.key} : ${w}`);
      // à la fin : jamais un intrus qui rime avec le mot (ballon / cochon)
      if (level === 5) for (const w of wrongs(q)) assert.ok(!SAME_END.some((g) => g.rime === group.rime && g.words.includes(w)), `${q.key} : ${w} rime`);
      for (const c of q.choices) assert.ok(c.label, `${q.key} : ${c.value} sans image`);
    }
  }
  const syllables = (w) => Number(Object.keys(SYLLABLE_WORDS).find((n) => SYLLABLE_WORDS[n].includes(w)));
  for (const q of draws('syllabes-rythme', 6)) {
    const counts = values(q).map(syllables);
    assert.equal(new Set(counts).size, 3, q.key);
    assert.equal(syllables(q.answer), Math.max(...counts), q.key);
  }
});

test('rimes : l’intrus, la phrase à finir, la paire qui rime', () => {
  const { RHYMES } = SOUND_DATA;
  const group = (w) => RHYMES.findIndex((g) => g.includes(w));
  for (const q of draws('rimes', 3)) {
    const others = wrongs(q).map(group);
    assert.equal(new Set(others).size, 1, `${q.key} : les autres ne riment pas entre eux`);
    assert.notEqual(group(q.answer), others[0], q.key);
  }
  for (const q of draws('rimes', 4)) {
    const anchor = q.key.split(':').at(-1);
    assert.equal(group(q.answer), group(anchor), q.key);
    for (const w of wrongs(q)) assert.notEqual(group(w), group(anchor), `${q.key} : ${w}`);
  }
  for (const q of draws('rimes', 5)) {
    const rhyming = values(q).filter((v) => { const [a, b] = v.split('+'); return group(a) >= 0 && group(a) === group(b); });
    assert.deepEqual(rhyming, [q.answer], q.key);
    assert.equal(new Set(values(q).flatMap((v) => v.split('+'))).size, 6, `${q.key} : un mot en double`);
  }
});

test('lettres : compter les lettres, la lettre qui manque, l’ordre alphabétique', () => {
  for (const q of draws('lettres', 5)) assert.equal(q.answer, [...q.stage.text].length, q.key);
  const code = (l) => l.toLowerCase().charCodeAt(0);
  for (const q of draws('lettres', 6)) {
    const items = q.stage.items;
    const gap = items.indexOf(null);
    assert.ok(gap > 0, q.key);
    const first = code(items[0]);
    items.forEach((l, i) => { if (l) assert.equal(code(l), first + i, q.key); });
    assert.equal(code(q.answer), first + gap, q.key);
    for (const w of wrongs(q)) assert.ok(!items.includes(w.toUpperCase()), `${q.key} : ${w} déjà montrée`);
  }
  for (const q of draws('lettres', 7)) {
    const labels = sortedItems(q).map((i) => i.label);
    assert.deepEqual(labels, [...labels].sort(), q.key);
    assert.equal(labels.join(''), q.answer, q.key);
  }
});

test('lis la phrase : jamais trois réponses sur deux lignes (téléphone en paysage)', () => {
  for (const level of [1, 2, 3]) {
    for (const q of draws('phrase', level, 400)) {
      assert.ok(q.choices.filter((c) => c.label.length > LONG_SENTENCE).length <= 2, values(q).join(' / '));
    }
  }
});

test('lis la phrase : un seul mot change, la phrase absurde, le bon point', () => {
  for (const q of draws('phrase', 3)) {
    const words = (s) => s.split(' ');
    for (const w of wrongs(q)) {
      const diff = words(w).filter((x, i) => x !== words(q.answer)[i]).length;
      assert.ok(words(w).length === words(q.answer).length && diff === 1, `${q.answer} / ${w}`);
    }
  }
  for (const q of draws('phrase', 4)) assert.equal(q.stage.type, 'none');
  for (const q of draws('phrase', 5)) {
    assert.deepEqual(values(q), ['.', '?', '!']);
    const text = q.stage.text;
    if (/^(Quel|Quelle|Comme|Que |Vive)/.test(text)) assert.equal(q.answer, '!', text);
    else if (/-tu|Est-ce|^(Où|Quand|Qui) /.test(text)) assert.equal(q.answer, '?', text);
    else assert.equal(q.answer, '.', text);
  }
});

test('homophones : ou / où, a / as / à, deux mots dans la phrase', () => {
  for (const q of draws('homophones', 3)) assert.ok(values(q).length === 2, q.key);
  let tuAs = 0;
  for (const q of draws('homophones', 4)) {
    if (values(q).includes('as')) {
      assert.deepEqual(values(q), ['a', 'as', 'à']);
      if (q.stage.text.startsWith('Tu …')) assert.equal(q.answer, 'as', q.stage.text);
      tuAs++;
    }
  }
  assert.ok(tuAs > 75, 'niveau 4 : la nouvelle série doit être la plus fréquente');
  for (const q of draws('homophones', 5)) {
    assert.equal(q.choices.length, 4, q.key);
    assert.equal((q.stage.text.match(/…/g) || []).length, 2, q.key);
    const [x, y] = q.answer.split('|');
    let k = 0;
    assert.equal(q.stage.text.replace(/…/g, () => [x, y][k++]), q.success.speak, q.key);
  }
});

test('déterminants : mon / ma / mes, ce / cet / cette / ces, accord de l’adjectif', () => {
  const vowel = (w) => /^[aeéiouy]/.test(w);
  for (const q of draws('genre', 4)) {
    const shown = q.key.split(':').at(-1);
    assert.ok(!vowel(shown), shown);
    assert.equal(q.answer === 'mes', q.stage.count === 3, shown);
  }
  for (const q of draws('genre', 5)) {
    const shown = q.key.split(':').at(-1);
    assert.equal(q.answer === 'ces', q.stage.count === 3, shown);
    if (q.answer === 'cet') assert.ok(vowel(shown), `cet ${shown}`);
    if (q.answer === 'ce') assert.ok(!vowel(shown), `ce ${shown}`);
  }
  const seen = new Set();
  for (const q of draws('genre', 5)) seen.add(q.answer);
  assert.equal(seen.size, 4, 'ce, cet, cette et ces doivent tous apparaître');
  for (const q of draws('genre', 6)) {
    const det = q.stage.text.split(' ')[1];
    assert.equal(q.answer.endsWith('s'), det === 'les', q.stage.text);
    if (det === 'la') assert.ok(q.answer.endsWith('e'), q.stage.text);
    if (det === 'le') assert.ok(!/(e|s)$/.test(q.answer), q.stage.text);
  }
});

test('premier son : de la lettre à l’image, le son de la fin, les groupes tr, fl…', () => {
  for (const q of draws('premier-son', 4)) {
    const letter = q.stage.text;
    assert.ok(q.answer.startsWith(letter), q.key);
    for (const w of wrongs(q)) assert.ok(!w.startsWith(letter), `${letter} : ${w}`);
    for (const c of q.choices) assert.equal(c.label, PICTURES[c.value]);
  }
  for (const [level, sounds, fits] of [[5, FINAL_SOUNDS, (w, g) => w.endsWith(g)], [6, CLUSTER_SOUNDS, (w, g) => w.startsWith(g)]]) {
    for (const q of draws('premier-son', level)) {
      const word = q.success.reveal;
      assert.ok(fits(word, q.answer), `${word} / ${q.answer}`);
      for (const g of wrongs(q)) assert.ok(!fits(word, g), `${word} / ${g}`);
      assert.equal(q.stage.emoji, PICTURES[word]);
    }
    for (const s of sounds) for (const w of s.words) assert.ok(PICTURES[w] && fits(w, s.grapheme), w);
  }
});

test('syllabes : inversées, à deux consonnes, et écrire la syllabe', () => {
  for (const q of draws('syllabes', 4)) {
    assert.match(q.answer, /^[aiou][lrs]$/);
    assert.ok(values(q).includes(q.answer[1] + q.answer[0]), `${q.key} : la syllabe à l’endroit manque`);
  }
  for (const q of draws('syllabes', 5)) {
    assert.match(q.answer, /^[bcfgpt][rl][aio]$/);
    assert.ok(values(q).includes(q.answer[0] + q.answer[2]), `${q.key} : le piège sans 2e consonne manque`);
  }
  for (const q of draws('syllabes', 6)) {
    assert.equal(q.interaction, 'order');
    assert.equal(sortedItems(q).map((i) => i.label).join(''), q.answer);
    assert.equal(new Set(q.items.map((i) => i.label)).size, q.items.length, `${q.key} : lettre en double`);
  }
});

test('le bon mot et les petits mots : images, phrases à trous, contraires', () => {
  for (const level of [4, 5, 6]) {
    for (const q of draws('bon-mot', level)) {
      assert.ok(q.stage.emoji, q.key);
      assert.equal(q.choices.length, 3, q.key);
    }
  }
  for (const q of draws('bon-mot', 6)) assert.ok(!q.choices.some((c) => c.value === q.key.split(':').at(-1)), q.key);
  for (const level of [4, 6]) {
    for (const q of draws('petits-mots', level)) {
      assert.equal(q.stage.text.replace('…', q.answer), q.success.speak, q.key);
    }
  }
  for (const q of draws('petits-mots', 5)) assert.ok(!values(q).includes(q.stage.text), q.key);
});

test('petits textes et histoires : textes sans titre au niveau 6, images à remettre dans l’ordre', () => {
  for (const t of TEXT_DATA.filter((x) => x.level === 6)) {
    const titleQuestion = t.questions.find(([question]) => question.includes('titre'));
    assert.equal(titleQuestion[1], t.title, t.title);
  }
  for (const q of draws('petits-textes', 6)) assert.ok(!q.stage.title, q.key);
  for (const q of draws('petits-textes', 4)) assert.ok(q.stage.title, q.key);
  for (const q of draws('histoires', 6)) {
    assert.ok(q.karaoke && q.interaction === 'order' && q.stage.type === 'karaoke', q.key);
    const story = STORY_DATA.find((st) => `histoires:${st.title}` === q.key);
    assert.deepEqual(sortedItems(q).map((i) => i.emoji), story.steps.map(([emoji]) => emoji), q.key);
  }
  // les histoires doivent tenir sur l'écran d'un petit téléphone
  for (const story of STORY_DATA) assert.ok(story.sentences.join(' ').length <= 230, `${story.title} trop longue`);
});
