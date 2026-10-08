// « Ponctuation et majuscules » et « Les mots » : niveaux, réponses justes et uniques, données
// vérifiées (signes, majuscules, catégories sans mot commun, contraires, familles), déterminisme.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOMAINS, findGame } from '../app/js/games/index.js';
import {
  CATEGORIES, DIALOGUES, FAMILIES, GLUED, HIERARCHIES, LISTS, OPPOSITES, PROPER_NOUNS, SHORT_TEXTS, SPOKEN_SENTENCES, SYNONYMS,
  dialogueVersions, listSentence, nb, splitAt,
} from '../app/js/games/vocabulaire.js';
import { createRng } from '../app/js/random.js';

const IDS = ['ponctuation', 'vocabulaire'];
const RUNS = 200;
const LONG_SENTENCE = 26; // au-delà, une phrase-réponse passe sur deux lignes (téléphone en paysage)

function draws(id, level, runs = RUNS, seed = 0) {
  const rng = createRng(4242 + level * 17 + seed);
  return Array.from({ length: runs }, (_, i) => findGame(id).generate(level, rng, i, { name: 'Zoé' }));
}
const values = (q) => q.choices.map((c) => c.value);
/** Le niveau d'origine d'une question (le niveau 10 mélange les autres). */
const isListen = (q) => q.key.startsWith('ponctuation:ecoute:');

test('ponctuation et les mots : de 7 à 10 niveaux, libellés courts et uniques, rubrique Lire et écrire', () => {
  const francais = DOMAINS.find((d) => d.id === 'francais').games.map((g) => g.id);
  for (const id of IDS) {
    const game = findGame(id);
    assert.ok(game.levels.length >= 7 && game.levels.length <= 10, id);
    for (const label of game.levels) assert.ok([...label].length <= 26, `${id} : « ${label} » trop long`);
    assert.equal(new Set(game.levels).size, game.levels.length, `${id} : libellé en double`);
    assert.equal(game.domain, 'francais');
    assert.ok(francais.includes(id), id);
  }
  assert.equal(findGame('ponctuation').section, 'Grammaire');
  assert.equal(findGame('vocabulaire').section, 'Vocabulaire');
});

test('ponctuation et les mots : la bonne réponse une seule fois, choix distincts, ordre à retrouver', () => {
  for (const id of IDS) {
    for (let level = 1; level <= findGame(id).levels.length; level++) {
      for (const q of draws(id, level)) {
        const ctx = `${id} niveau ${level} : ${q.key}`;
        assert.ok(q.key && q.text && q.instruction && q.stage?.type && q.short?.text, ctx);
        if (q.interaction === 'order') {
          const v = q.items.map((i) => i.value);
          assert.ok(v.length >= 3 && new Set(v).size === v.length, ctx);
          assert.notDeepEqual(v, [...v].sort((a, b) => a - b), `${ctx} : déjà dans l’ordre`);
          assert.equal([...q.items].sort((a, b) => a.value - b.value).map((i) => i.label).join(','), q.answer, ctx);
          continue;
        }
        assert.equal(q.interaction, undefined, ctx);
        assert.ok(q.choices.length >= 2 && q.choices.length <= 4, ctx);
        assert.equal(values(q).filter((v) => v === q.answer).length, 1, `${ctx} : réponse absente ou en double`);
        assert.equal(new Set(values(q)).size, q.choices.length, `${ctx} : valeur en double`);
        assert.equal(new Set(q.choices.map((c) => c.label)).size, q.choices.length, `${ctx} : choix identiques`);
        for (const c of q.choices) assert.ok(c.label, `${ctx} : choix sans libellé`);
        // trois phrases longues ne tiennent pas sur un téléphone en paysage
        if (q.choiceStyle === 'sentences') for (const c of q.choices) assert.ok(c.label.length <= LONG_SENTENCE, `${ctx} : « ${c.label} » trop long`);
      }
    }
  }
});

test('ponctuation et les mots : mêmes questions pour la même graine, et des questions variées', () => {
  for (const id of IDS) {
    for (let level = 1; level <= findGame(id).levels.length; level++) {
      assert.deepEqual(draws(id, level, 30), draws(id, level, 30), `${id} niveau ${level}`);
      const keys = new Set(draws(id, level, 100, 5).map((q) => q.key));
      assert.ok(keys.size >= 10, `${id} niveau ${level} : seulement ${keys.size} questions différentes`);
    }
  }
});

test('ponctuation et les mots : des données riches (au moins 20 éléments par niveau quand c’est possible)', () => {
  assert.ok(SPOKEN_SENTENCES.length >= 20);
  for (const marks of ['.?', '?!', '.?!']) {
    const pairs = SPOKEN_SENTENCES.flatMap((s) => [...s.marks].filter((m) => marks.includes(m)));
    assert.ok(pairs.length >= 20, marks);
  }
  for (const list of [PROPER_NOUNS, SHORT_TEXTS, GLUED, DIALOGUES, LISTS, OPPOSITES[4], OPPOSITES[5], SYNONYMS, FAMILIES]) {
    assert.ok(list.length >= 20, JSON.stringify(list[0]));
  }
  assert.ok(HIERARCHIES.flatMap((h) => h[2]).length >= 20);
  assert.ok(CATEGORIES.length >= 6);
});

// ---------------------------------------------------------------- Ponctuation et majuscules

test('ponctuation 1 et 2 : le point à la fin, la majuscule au début, une seule phrase bien écrite', () => {
  for (const q of draws('ponctuation', 1)) {
    assert.match(q.answer, /^[A-Z][^.]*\.$/u, q.key);
    for (const v of values(q)) if (v !== q.answer) assert.ok(!v.endsWith('.') && v.includes('. '), v);
    assert.equal(q.success.speak, q.answer);
  }
  for (const q of draws('ponctuation', 2)) {
    assert.match(q.answer, /^\p{Lu}[^\p{Lu}]*\.$/u, q.key);
    for (const v of values(q)) if (v !== q.answer) assert.match(v, /^\p{Ll}/u, v);
  }
});

test('ponctuation 3 à 5 : la phrase écrite ne dit pas son signe, la voix le dit', () => {
  const marksOf = { 3: '.?', 4: '?!', 5: '.?!' };
  for (const s of SPOKEN_SENTENCES) {
    assert.ok(!/[.?!]/.test(s.text), s.text);
    // ni « est-ce que », ni inversion (« viens-tu »), ni mot interrogatif ou exclamatif au début
    assert.ok(!/est-ce|-(tu|il|elle|on|vous|nous|ils|elles)\b/i.test(s.text), s.text);
    assert.ok(!/^(qui|que|quoi|où|quand|comment|pourquoi|combien|quel|quelle|comme)\b/i.test(s.text), s.text);
    assert.ok(s.marks.includes('.') && s.marks.length >= 2, s.text);
  }
  for (const level of [3, 4, 5]) {
    const seen = new Set();
    for (const q of draws('ponctuation', level)) {
      assert.deepEqual(values(q), [...marksOf[level]], q.key);
      const said = q.replay[0].text;
      const item = SPOKEN_SENTENCES.find((s) => q.stage.text === `${s.text} □`);
      assert.ok(item, q.stage.text);
      assert.ok(item.marks.includes(q.answer), q.key);
      assert.equal(said, q.answer === '.' ? `${item.text}.` : `${item.text} ${q.answer}`);
      // la phrase est dite à voix haute dans la consigne, avec son signe ; rien d'écrit ne le dit
      assert.ok(q.instruction.some((p) => p.text === said), q.key);
      assert.ok(!q.text.includes(item.text) && !q.stage.text.includes(q.answer), q.key);
      seen.add(q.answer);
    }
    assert.deepEqual([...seen].sort(), [...marksOf[level]].sort(), `niveau ${level} : tous les signes sortent`);
  }
});

test('ponctuation 6 : le prénom ou la ville a perdu sa majuscule, les autres choix n’en prennent pas', () => {
  for (const item of PROPER_NOUNS) {
    const words = item.text.split(/[ ,.]+/).filter(Boolean);
    assert.ok(words.indexOf(item.name) > 0, `${item.text} : le nom propre n’est pas le premier mot`);
    assert.match(item.name, /^\p{Lu}\p{Ll}+$/u, item.name);
    for (const w of item.others) {
      assert.match(w, /^\p{Ll}+$/u, w);
      assert.ok(item.text.toLowerCase().split(/[ ,.’]+/).includes(w), `${item.text} : ${w}`);
    }
    // aucune autre majuscule qu'au début et au nom propre (le prénom du début de « Emma joue avec Lina » est permis)
    const capitals = words.slice(1).filter((w) => /^\p{Lu}/u.test(w));
    assert.deepEqual(capitals, [item.name], item.text);
  }
  for (const q of draws('ponctuation', 6)) {
    const item = PROPER_NOUNS.find((i) => i.name.toLowerCase() === q.answer);
    assert.ok(item && q.stage.text.includes(q.answer), q.key);
    assert.equal(q.success.reveal, item.name);
  }
});

test('ponctuation 7 : le nombre de phrases est juste (une majuscule au début, . ? ou ! à la fin)', () => {
  for (const item of SHORT_TEXTS) {
    const sentences = item.text.split(/(?<=[.?!])\s+/);
    assert.equal(sentences.length, item.n, item.text);
    for (const s of sentences) assert.match(s, /^\p{Lu}.*[.?!]$/u, s);
    assert.ok(item.n >= 1 && item.n <= 4, item.text);
  }
  const answers = new Set(SHORT_TEXTS.map((t) => t.n));
  assert.deepEqual([...answers].sort(), [1, 2, 3, 4]);
});

test('ponctuation 8 : deux phrases collées, la seule bonne coupure est la vraie', () => {
  for (const pair of GLUED) {
    const [first, second] = pair;
    assert.ok(first.endsWith('.') && first.split(' ').length >= 2 && second.split(' ').length >= 2, pair.join(' '));
    assert.equal(splitAt(pair, first.split(' ').length), nb(pair.join(' ')), pair.join(' '));
    assert.ok(nb(pair.join(' ')).length <= LONG_SENTENCE, `${pair.join(' ')} : trop long`);
  }
  for (const q of draws('ponctuation', 8)) {
    assert.equal(q.choices.length, 3);
    // ni point ni majuscule, sauf aux prénoms
    const words = q.stage.text.split(' ');
    assert.ok(words.every((w) => !/[.?!]/.test(w) && (/^\p{Ll}/u.test(w) || ['Lou', 'Tom', 'Mila', 'Léa', 'Nina', 'Zoé'].includes(w))), q.stage.text);
  }
});

test('ponctuation 9 : les guillemets autour des paroles, la virgule et « et » dans une énumération', () => {
  for (const item of DIALOGUES) {
    const [right, ...wrong] = dialogueVersions(item);
    assert.ok(right.length <= LONG_SENTENCE, right);
    assert.match(right, /^[^«]+ : « .+ »$/u, right);
    assert.equal(new Set([right, ...wrong]).size, 3, right);
    assert.match(item[1], /^\p{Lu}.*[.?!]$/u, item[1]);
  }
  assert.equal(listSentence(LISTS[0]), 'Lou a un chat, un chien et un lapin.');
  for (const item of LISTS) {
    const s = listSentence(item);
    assert.equal((s.match(/,/g) || []).length - (item[0].match(/,/g) || []).length, item[1].length - 2, s);
    assert.equal(s.match(/ et /g).length, 1, s);
  }
  for (const q of draws('ponctuation', 9)) {
    if (q.key.startsWith('ponctuation:virgule')) assert.match(q.answer, /^(, … )+et$/u, q.key);
  }
});

test('ponctuation 10 : un mélange des niveaux 3 à 9', () => {
  const kinds = new Set(draws('ponctuation', 10, 300).map((q) => q.key.split(':')[1]));
  for (const k of ['ecoute', 'nom', 'combien', 'collees']) assert.ok(kinds.has(k), k);
  assert.ok(!kinds.has('point') && !kinds.has('majuscule'));
  assert.ok(draws('ponctuation', 10, 300).some(isListen));
});

// ---------------------------------------------------------------- Les mots

test('les mots : catégories sans mot ni image en commun, une image par mot', () => {
  const words = CATEGORIES.flatMap((c) => c.items.map((i) => i[0]));
  const emojis = CATEGORIES.flatMap((c) => c.items.map((i) => i[1]));
  assert.equal(new Set(words).size, words.length, 'mot dans deux catégories');
  assert.equal(new Set(emojis).size, emojis.length, 'image en double');
  for (const c of CATEGORIES) {
    assert.ok(c.items.length >= 6, c.name);
    assert.ok(c.say.endsWith(`des ${c.name} !`), c.say);
    assert.ok(!words.includes(c.name), c.name);
  }
});

test('les mots 1 à 3 : la bonne image, l’intrus, le nom de la catégorie', () => {
  const categoryOf = (word) => CATEGORIES.find((c) => c.items.some((i) => i[0] === word));
  const byEmoji = (e) => CATEGORIES.find((c) => c.items.some((i) => i[1] === e));
  for (const q of draws('vocabulaire', 1)) {
    const shown = q.stage.items.filter(Boolean);
    const category = byEmoji(shown[0]);
    assert.ok(shown.every((e) => byEmoji(e) === category), q.key);
    assert.equal(categoryOf(q.answer), category);
    for (const v of values(q)) if (v !== q.answer) assert.notEqual(categoryOf(v).group, category.group, `${q.key} : ${v}`);
    for (const c of q.choices) assert.equal(categoryOf(c.value).items.find((i) => i[0] === c.value)[1], c.label);
  }
  for (const q of draws('vocabulaire', 2)) {
    const groups = values(q).map((v) => categoryOf(v));
    const odd = categoryOf(q.answer);
    assert.equal(groups.filter((c) => c === odd).length, 1, q.key);
    const others = groups.filter((c) => c !== odd);
    assert.equal(new Set(others).size, 1, q.key);
    assert.notEqual(others[0].group, odd.group, q.key);
  }
  for (const q of draws('vocabulaire', 3)) {
    const category = CATEGORIES.find((c) => c.name === q.answer);
    assert.ok(q.stage.items.every((e) => byEmoji(e) === category), q.key);
    // les choix sont dits à voix haute, dans l'ordre où ils sont écrits
    assert.deepEqual(q.replay.map((s) => s.replace(/^(ou )?des |[,?]$| \?$/g, '').replace(/ \?$/, '')), values(q));
  }
});

test('les mots 4 à 6 : contraires et synonymes sans doublon, un seul bon choix', () => {
  for (const list of [OPPOSITES[4], OPPOSITES[5], SYNONYMS]) {
    const firsts = list.map((i) => i[0]);
    assert.equal(new Set(firsts).size, firsts.length, `mot en double : ${firsts}`);
    for (const item of list) assert.equal(new Set(item).size, 4, item.join(' '));
  }
  // un contraire n'est jamais un des mots proposés à tort pour son contraire
  const pairs = new Set([...OPPOSITES[4], ...OPPOSITES[5]].flatMap(([a, b]) => [`${a}|${b}`, `${b}|${a}`]));
  for (const [word, , ...wrong] of [...OPPOSITES[4], ...OPPOSITES[5]]) {
    for (const w of wrong) assert.ok(!pairs.has(`${word}|${w}`), `${word} / ${w}`);
  }
  for (const [word, , trap] of SYNONYMS) {
    const synonymOfTrap = SYNONYMS.find((s) => s[0] === trap)?.[1];
    assert.notEqual(synonymOfTrap, word, `${word} / ${trap}`);
  }
  for (const level of [4, 5, 6]) {
    for (const q of draws('vocabulaire', level)) {
      assert.equal(q.stage.text, q.replay[0].text);
      assert.ok(!values(q).includes(q.stage.text), q.key);
    }
  }
});

test('les mots 7 et 8 : familles de mots, intrus qui ressemble sans être de la famille', () => {
  const all = FAMILIES.flatMap(([base, members]) => [base, ...members]);
  assert.equal(new Set(all).size, all.length, 'mot dans deux familles');
  for (const [base, members, traps] of FAMILIES) {
    assert.ok(members.length >= 1 && traps.length >= 2, base);
    // un piège n'est ni le mot ni un mot de sa famille (il peut être d'une autre famille : « nager » pour « nuage »)
    for (const t of traps) assert.ok(t !== base && !members.includes(t), `${base} : ${t}`);
    assert.equal(new Set([base, ...members, ...traps]).size, 1 + members.length + traps.length, base);
  }
  for (const q of draws('vocabulaire', 7)) {
    const [, members] = FAMILIES.find(([base]) => base === q.stage.text);
    assert.ok(members.includes(q.answer), q.key);
    assert.equal(values(q).filter((v) => members.includes(v)).length, 1, q.key);
  }
  for (const q of draws('vocabulaire', 8)) {
    const family = FAMILIES.find(([base]) => base === q.key.split(':')[2]);
    assert.ok(family && family[2].includes(q.answer), q.key);
    for (const v of values(q)) if (v !== q.answer) assert.ok([family[0], ...family[1]].includes(v), `${q.key} : ${v}`);
  }
});

test('les mots 9 : du plus général au plus précis, avec l’image du mot précis', () => {
  for (const q of draws('vocabulaire', 9)) {
    const [top, mid, word] = q.answer.split(',');
    const h = HIERARCHIES.find((x) => x[0] === top && x[1] === mid);
    assert.ok(h, q.key);
    assert.equal(h[2].find((s) => s[0] === word)?.[1], q.stage.emoji, q.key);
    assert.equal(q.sign, '>');
  }
  for (const [, , specifics] of HIERARCHIES) for (const [w, e] of specifics) assert.ok(w && e, w);
});

test('les mots 10 : un mélange des niveaux 2 à 9', () => {
  const kinds = new Set(draws('vocabulaire', 10, 300).map((q) => q.key.split(':')[1]));
  for (const k of ['intrus', 'categorie', 'contraire', 'synonyme', 'famille', 'intrus-famille', 'general']) assert.ok(kinds.has(k), k);
  assert.ok(!kinds.has('avec'));
});
