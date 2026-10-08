// Conjugaison et accords (CP, CE1) : formes justes, distracteurs plausibles, une seule bonne réponse.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOMAINS, findGame } from '../app/js/games/index.js';
import {
  GRAMMAIRE_DATA, changedRange, conjugate, personOf, sentenceForms, subjectOf,
} from '../app/js/games/grammaire.js';
import { createRng } from '../app/js/random.js';

const IDS = ['conjugaison', 'accords'];
const RUNS = 300;

function draws(id, level, seed = 77) {
  const rng = createRng(seed + level * 1009);
  return Array.from({ length: RUNS }, (_, i) => findGame(id).generate(level, rng, i, { name: 'Zoé', season: 'hiver' }));
}

test('grammaire : deux jeux de « Lire et écrire », après « Un, une, le, la », de 7 à 10 niveaux', () => {
  const francais = DOMAINS.find((d) => d.id === 'francais').games.map((g) => g.id);
  assert.deepEqual(francais.slice(francais.indexOf('genre'), francais.indexOf('genre') + 3), ['genre', ...IDS]);
  for (const id of IDS) {
    const game = findGame(id);
    assert.equal(game.domain, 'francais');
    assert.equal(game.section, 'Grammaire');
    assert.ok(game.levels.length >= 7 && game.levels.length <= 10, id);
    assert.equal(game.levels.length, 10, id);
    for (const label of game.levels) assert.ok([...label].length <= 26, `${id} : « ${label} » trop long`);
    assert.equal(new Set(game.levels).size, game.levels.length, `${id} : libellé en double`);
  }
});

test('grammaire : la bonne réponse une seule fois parmi 2 à 4 choix distincts, consignes présentes', () => {
  for (const id of IDS) {
    for (let level = 1; level <= 10; level++) {
      for (const q of draws(id, level)) {
        const ctx = `${id} niveau ${level} : ${q.key}`;
        assert.ok(q.key && q.text && q.instruction && q.stage?.type, ctx);
        assert.equal(q.interaction, undefined, ctx);
        const values = q.choices.map((c) => c.value);
        assert.ok(values.length >= 2 && values.length <= 4, ctx);
        assert.equal(values.filter((v) => v === q.answer).length, 1, `${ctx} : réponse absente ou en double`);
        assert.equal(new Set(values).size, values.length, `${ctx} : choix en double`);
        assert.equal(new Set(q.choices.map((c) => c.label)).size, values.length, `${ctx} : libellés en double`);
        assert.ok(['words', 'sentences'].includes(q.choiceStyle), ctx);
        // deux par ligne seulement avec des mots courts
        if (q.choiceStyle === 'words') for (const c of q.choices) assert.ok(c.label.split(' ').every((w) => w.length <= 9), ctx);
        assert.ok(q.success?.speak, ctx);
        // les lettres soulignées sont dans le mot révélé
        for (const [a, b] of q.success.highlight || []) {
          assert.ok(a >= 0 && b <= q.success.reveal.length && a < b, ctx);
        }
        for (const text of [q.text, ...[q.instruction].flat()]) assert.doesNotMatch(text, /Zoé/, `${ctx} : pas de prénom`);
      }
    }
  }
});

test('grammaire : mêmes questions pour la même graine', () => {
  for (const id of IDS) {
    for (let level = 1; level <= 10; level++) {
      assert.deepEqual(draws(id, level, 5).slice(0, 30), draws(id, level, 5).slice(0, 30), `${id} niveau ${level}`);
    }
  }
});

// ---------------------------------------------------------------- Conjugaison

test('conjugaison : formes calculées justes (présent, futur, passé composé)', () => {
  const table = (verb, tense) => [0, 1, 2, 3, 4, 5].map((p) => conjugate(verb, tense, p));
  assert.deepEqual(table('être', 'present'), ['suis', 'es', 'est', 'sommes', 'êtes', 'sont']);
  assert.deepEqual(table('avoir', 'present'), ['ai', 'as', 'a', 'avons', 'avez', 'ont']);
  assert.deepEqual(table('aller', 'present'), ['vais', 'vas', 'va', 'allons', 'allez', 'vont']);
  assert.deepEqual(table('faire', 'present'), ['fais', 'fais', 'fait', 'faisons', 'faites', 'font']);
  assert.deepEqual(table('chanter', 'present'), ['chante', 'chantes', 'chante', 'chantons', 'chantez', 'chantent']);
  assert.deepEqual(table('manger', 'present'), ['mange', 'manges', 'mange', 'mangeons', 'mangez', 'mangent']);
  assert.deepEqual(table('colorier', 'present'), ['colorie', 'colories', 'colorie', 'colorions', 'coloriez', 'colorient']);
  assert.deepEqual(table('jouer', 'futur'), ['jouerai', 'joueras', 'jouera', 'jouerons', 'jouerez', 'joueront']);
  assert.deepEqual(table('être', 'futur'), ['serai', 'seras', 'sera', 'serons', 'serez', 'seront']);
  assert.deepEqual(table('avoir', 'futur'), ['aurai', 'auras', 'aura', 'aurons', 'aurez', 'auront']);
  assert.deepEqual(table('nager', 'passe'), ['ai nagé', 'as nagé', 'a nagé', 'avons nagé', 'avez nagé', 'ont nagé']);
});

test('conjugaison : des verbes en -er réguliers, des phrases bien formées, le sujet reconnu', () => {
  const { CONJ_LEVELS } = GRAMMAIRE_DATA;
  // verbes en -er sans changement de radical (j’appelle, j’achète, je préfère, nous lançons…)
  const irregularStem = /(eler|eter|yer|cer|é[^aeiouéèêy]+er|e[^aeiouéèêy]er)$/;
  const PAST = /^(Hier|Hier soir|Ce matin), /;
  const FUTURE = /^(Demain|Demain soir|Ce soir|Bientôt|Plus tard|Cet été|Cet hiver|L’été prochain|La semaine prochaine|Samedi|Samedi prochain|Dimanche), /;
  const PRESENT = /^(En ce moment|Tous les jours|Tous les soirs), /;
  for (let level = 1; level <= 10; level++) {
    const def = CONJ_LEVELS[level];
    assert.ok(def.items.length >= 25, `niveau ${level} : ${def.items.length} phrases seulement`);
    assert.equal(new Set(def.items.map((it) => it.join('|'))).size, def.items.length, `niveau ${level} : phrase en double`);
    for (const [verb, template, itemTense] of def.items) {
      const ctx = `niveau ${level} : ${template}`;
      const tense = itemTense || def.tense;
      assert.equal(template.split('_').length, 2, `${ctx} : un seul trou`);
      assert.match(template, /^[A-ZÉÀÂÎÔÇŒ]/, `${ctx} : majuscule`);
      assert.match(template, /\.$/, `${ctx} : point final`);
      assert.doesNotMatch(template, / {2}|’ /, ctx);
      if (!['être', 'avoir', 'aller', 'faire'].includes(verb)) {
        assert.match(verb, /er$/, ctx);
        assert.doesNotMatch(verb, irregularStem, `${ctx} : radical qui change`);
      }
      const person = personOf(subjectOf(template));
      if (level === 4) assert.ok(person <= 2, `${ctx} : je, tu, il`);
      if (level === 5) assert.ok(person >= 3, `${ctx} : nous, vous, ils`);
      if (level === 1 || level === 2 || level === 3 || level === 8) assert.ok(['être', 'avoir'].includes(verb), ctx);
      if (level === 6) assert.ok(['aller', 'faire'].includes(verb), ctx);
      if (level === 3) assert.notEqual(person, 0, `${ctx} : « j’ » montrerait le verbe avoir`);
      if (tense === 'passe') assert.match(template, PAST, ctx);
      if (level >= 7 && tense === 'futur') assert.match(template, FUTURE, ctx);
      if (level === 10 && tense === 'present') assert.match(template, PRESENT, ctx);
      // niveau 10 : « je » seulement si « j’ » est le même aux trois temps
      if (level === 10 && person === 0) assert.match(verb, /^[aeéiouh]/, ctx);
    }
  }
});

test('conjugaison : la phrase dite à la fin, avec « j’ » devant une voyelle', () => {
  for (let level = 1; level <= 10; level++) {
    for (const q of draws('conjugaison', level)) {
      const full = q.success.speak;
      assert.doesNotMatch(full, /\b[Jj]e [aeéèêiouh]/, `${q.key} : élision oubliée`);
      assert.doesNotMatch(full, /_|…/, q.key);
      assert.ok(full.includes(q.answer), q.key);
      assert.match(q.stage.text, /…/, q.key);
      // le verbe à l'infinitif est donné, sauf au niveau 3 (être ou avoir ?)
      if (level === 3) assert.doesNotMatch(q.stage.text, /\(/, q.key);
      else assert.match(q.stage.text, /… \([a-zéèêîôûç]+\)/, q.key);
      assert.equal([q.instruction].flat()[0], 'Choisis la bonne forme du verbe.', q.key);
      const said = [q.instruction].flat().join(' ').split(/[\s,.?]+/);
      assert.ok(!said.includes(q.answer.split(' ').at(-1)), `${q.key} : la consigne ne donne pas la réponse`);
    }
  }
});

test('conjugaison : les distracteurs sont des formes du même verbe (ou d’être / avoir au niveau 3)', () => {
  const tenses = ['present', 'futur', 'passe'];
  const all = (verb) => tenses.flatMap((t) => { try { return [0, 1, 2, 3, 4, 5].map((p) => conjugate(verb, t, p)); } catch { return []; } });
  for (let level = 1; level <= 10; level++) {
    for (const q of draws('conjugaison', level)) {
      const verb = q.stage.text.match(/\(([^)]+)\)/)?.[1];
      for (const c of q.choices) {
        if (level === 3) assert.ok([...all('être'), ...all('avoir')].includes(c.value), `${q.key} : ${c.value}`);
        else if (level === 9) assert.match(c.value, new RegExp(`^(ai|as|a|avons|avez|ont) ${verb.slice(0, -2)}(é|er)$`), q.key);
        else assert.ok(all(verb).includes(c.value), `${q.key} : ${c.value}`);
      }
      if (level === 10) {
        // les trois temps du même sujet
        const forms = q.choices.map((c) => c.value);
        assert.equal(forms.filter((f) => f.includes(' ')).length, 1, q.key);
      }
    }
  }
});

// ---------------------------------------------------------------- Accords

test('accords : pluriels en s, en x et en -aux justes', () => {
  const { NOMS, NOMS_X, NOMS_AUX } = GRAMMAIRE_DATA;
  assert.ok(NOMS.length >= 40);
  for (const [w, g, emoji] of NOMS) {
    assert.ok(['m', 'f'].includes(g) && emoji, w);
    assert.doesNotMatch(w, /[sxz]$|(eau|eu|au|ou|al)$/, `${w} : pluriel qui n'est pas en s`);
  }
  assert.equal(new Set(NOMS.map((n) => n[0])).size, NOMS.length);
  assert.ok(NOMS_X.length >= 25);
  const OU_X = ['bijou', 'caillou', 'chou', 'genou', 'hibou', 'joujou', 'pou'];
  for (const [w, pl] of NOMS_X) {
    if (/(eau|eu)$/.test(w) || OU_X.includes(w)) assert.equal(pl, `${w}x`, w);
    else assert.ok(/ou$/.test(w) && pl === `${w}s`, w);
  }
  assert.deepEqual(NOMS_X.filter(([w]) => /ou$/.test(w) && !/eau$/.test(w)).map(([w, pl]) => pl.endsWith('x') && w).filter(Boolean).sort(), [...OU_X].sort());
  for (const [w, pl] of NOMS_AUX) assert.equal(pl, `${w.slice(0, -2)}aux`, w);
});

test('accords : féminins justes, erreurs proposées fausses', () => {
  const { FEMININS_E, FEMININS_PARTICULIERS } = GRAMMAIRE_DATA;
  assert.ok(FEMININS_E.length >= 25 && FEMININS_PARTICULIERS.length >= 25);
  for (const [m, f, from, to] of FEMININS_E) {
    assert.equal(f, `${m}e`, m);
    assert.ok(from.startsWith('un ') && from.includes(m), from);
    assert.ok(to.startsWith('une ') && to.split('~').length === 2, to);
  }
  for (const [m, f, wrong, from, to] of FEMININS_PARTICULIERS) {
    assert.notEqual(f, `${m}e`, m);
    assert.equal(wrong.length, 2, m);
    assert.ok(!wrong.includes(f) && wrong[0] !== wrong[1], m);
    assert.ok(from.startsWith('un ') && from.includes(m), from);
    assert.ok(to.startsWith('une ') && to.split('~').length === 2, to);
  }
});

test('accords : groupes, sujets et phrases au pluriel', () => {
  const { GROUPES, SUJETS_VERBES, PHRASES_ACCORD } = GRAMMAIRE_DATA;
  assert.ok(GROUPES.length >= 25 && SUJETS_VERBES.length >= 25 && PHRASES_ACCORD.length >= 25);
  for (const [det, [n, ns], [a, as]] of GROUPES) {
    assert.ok(['le', 'la', 'l’'].includes(det), n);
    assert.ok(ns === `${n}s` || ns === `${n}x`, n);
    assert.ok(as === `${a}s` || as === `${a}x`, a);
    if (det === 'la') assert.match(a, /e$/, `${a} : adjectif féminin`);
  }
  for (const [one, many, verb] of SUJETS_VERBES) {
    assert.match(one, /^(Il|Elle|Le |La |L’)/, one);
    assert.match(many, /^(Ils|Elles|Les )/, many);
    assert.match(verb, /er$/, verb);
  }
  for (const line of PHRASES_ACCORD) {
    const { singular, plural, wrongs, det } = sentenceForms(line);
    assert.match(singular, /^(Le|La) /, line);
    assert.equal(det, 'Les', line);
    assert.ok(wrongs.length >= 2, line);
    assert.ok(!wrongs.includes(plural) && new Set(wrongs).size === wrongs.length, line);
    assert.ok(plural.length <= 34, `${plural} : trop longue pour un téléphone en paysage`);
  }
});

test('accords : les lettres ajoutées sont soulignées dans le mot révélé', () => {
  assert.deepEqual(changedRange('chat', 'chats'), [4, 5]);
  assert.deepEqual(changedRange('cheval', 'chevaux', 4), [8, 11]);
  assert.deepEqual(changedRange('acteur', 'actrice'), [3, 7]);
  assert.equal(changedRange('rouge', 'rouge'), null);
  const cut = (q) => q.success.highlight.map(([a, b]) => q.success.reveal.slice(a, b));
  for (const q of draws('accords', 2)) assert.deepEqual(cut(q), ['s'], q.key);
  for (const q of draws('accords', 3)) assert.ok(['s', 'x'].includes(cut(q).join()), q.key);
  for (const q of draws('accords', 5)) assert.deepEqual(cut(q), ['e'], q.key);
  for (const q of draws('accords', 6)) {
    assert.equal(q.success.reveal, `les ${q.answer}`, q.key);
    assert.ok(cut(q).every((x) => ['s', 'x'].includes(x)) && cut(q).length === 2, q.key);
  }
  for (const q of draws('accords', 7)) {
    if (q.success.highlight) assert.deepEqual(cut(q), ['nt'], q.key);
    assert.ok(q.choices.some((c) => c.value.endsWith('ent')), q.key);
  }
});

test('accords : l’image et le mot de départ, la consigne ne donne pas l’écriture', () => {
  for (let level = 2; level <= 10; level++) {
    if (level === 4) continue;
    for (const q of draws('accords', level)) {
      assert.equal(q.stage.type, 'accord', q.key);
      assert.ok(q.stage.from && q.stage.to.includes('…'), q.key);
      // ce qu'on entend se prononce pareil pour toutes les écritures proposées : on ne dit pas l'écrit
      if (level === 5 || level === 8) assert.equal([q.instruction].flat()[0], q.stage.from, q.key);
    }
  }
  for (const q of draws('accords', 1)) {
    assert.equal(q.stage.type, 'objects');
    assert.equal(q.stage.count > 1, q.answer.startsWith('des '), q.key);
  }
});
