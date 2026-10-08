// Corriger en expliquant (app/js/explications.js) : pour un large échantillon de questions de chaque
// jeu concerné, l'explication est juste (chaque calcul écrit est vrai, et il mène bien à la bonne
// réponse), le dessin compte juste, et Estelle ne dit que des phrases d'une liste courte.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findGame } from '../app/js/games/index.js';
import { GRAMMAR_DATA } from '../app/js/games/francais-extra.js';
import { conjugate, GRAMMAIRE_DATA, personOf, subjectOf } from '../app/js/games/grammaire.js';
import { createRng } from '../app/js/random.js';
import { EXPLAIN_SENTENCES, explain, explainOperation, SAY } from '../app/js/explications.js';
import { readFileSync } from 'node:fs';

const RUNS = 150;

function* questionsAt(id, level) {
  const game = findGame(id);
  const rng = createRng(9173 + level * 31);
  for (let i = 0; i < RUNS; i++) yield game.generate(level, rng, i, { name: 'Zoé' });
}

const UNITS = {
  unité: 1, unités: 1, cube: 1, cubes: 1, dizaine: 10, dizaines: 10, barre: 10, barres: 10, centaine: 100, centaines: 100, plaque: 100, plaques: 100,
};

/** La valeur d'un côté d'un calcul écrit : « 4 + 4 + 4 », « 3 dizaines + 7 unités », « 6 × 4 ». */
function value(side) {
  const expr = side.trim()
    .replace(/(\d+) (unités?|cubes?|dizaines?|barres?|centaines?|plaques?)/g, (m, n, unit) => `(${n}*${UNITS[unit]})`)
    .replace(/−/g, '-').replace(/×/g, '*');
  assert.match(expr, /^[\d\s()+\-*]+$/, `calcul illisible : « ${side} »`);
  return Function(`return (${expr});`)();
}

/** Les valeurs d'une chaîne « a = b = c » ou « a < b < c », vérifiée ; renvoie [valeurs, signes]. */
function checkRelation(step, label) {
  const parts = step.split(/ (=|<|>) /);
  const values = parts.filter((_, i) => i % 2 === 0).map(value);
  const signs = parts.filter((_, i) => i % 2 === 1);
  assert.ok(signs.length >= 1, `${label} : « ${step} » n’est pas un calcul`);
  signs.forEach((sign, i) => {
    const [x, y] = [values[i], values[i + 1]];
    const ok = sign === '=' ? x === y : sign === '<' ? x < y : x > y;
    assert.ok(ok, `${label} : « ${step} » est faux`);
  });
  return [values, signs];
}

/** Tous les calculs écrits d'une explication sont justes ; renvoie les valeurs de chacun. */
function checkSteps(ex, label) {
  assert.ok(EXPLAIN_SENTENCES.includes(ex.say), `${label} : phrase inconnue « ${ex.say} »`);
  for (const step of ex.steps.filter((s) => typeof s !== 'string')) {
    assert.ok(step.text && !/undefined|NaN|null/.test(step.text), `${label} : « ${step.text} »`);
    if (step.em) {
      const ok = Number.isInteger(step.at) ? step.text.startsWith(step.em, step.at) : step.text.includes(step.em);
      assert.ok(ok, `${label} : « ${step.em} » introuvable dans « ${step.text} »`);
    }
  }
  return ex.steps.filter((s) => typeof s === 'string').map((s) => checkRelation(s, label)[0]);
}

const countMarks = (frames, mark) => frames.flat().filter((m) => m === mark).length;

test('les phrases dites : une liste courte de phrases entières, sans nombre', () => {
  assert.ok(EXPLAIN_SENTENCES.length <= 90, `${EXPLAIN_SENTENCES.length} phrases`);
  assert.equal(new Set(EXPLAIN_SENTENCES).size, EXPLAIN_SENTENCES.length, 'phrases en double');
  for (const s of EXPLAIN_SENTENCES) {
    assert.match(s, /^[A-ZÀ-Ý].*[.!]$/u, `« ${s} » n’est pas une phrase entière`);
    assert.doesNotMatch(s, /\d/, `« ${s} » contient un nombre`);
    assert.ok(s.length <= 110, `« ${s} » est trop longue`);
  }
});

test('additions et soustractions : chaque explication est juste et mène au résultat', () => {
  let n = 0;
  for (let a = 0; a <= 100; a++) {
    for (let b = 1; b <= 100; b++) {
      for (const op of ['+', '−']) {
        const r = op === '+' ? a + b : a - b;
        if (r < 0 || r > 100 || (op === '+' && a === 0)) continue;
        const label = `${a} ${op} ${b}`;
        const ex = explainOperation(a, op, b);
        const values = checkSteps(ex, label);
        assert.equal(values.at(-1).at(-1), r, `${label} : la dernière étape ne donne pas ${r}`);
        if (ex.visual?.type === 'places') assert.equal(ex.visual.rows[0].join(''), String(r), label);
        if (ex.visual?.type === 'frames') {
          const { frames } = ex.visual;
          assert.ok(r <= 20 && a <= 20, `${label} : boîtes de 10 au-delà de 20`);
          if (op === '+') {
            assert.equal(countMarks(frames, 'a'), a, `${label} : points du départ`);
            assert.equal(countMarks(frames, 'b'), b, `${label} : points ajoutés`);
          } else {
            assert.equal(countMarks(frames, 'a'), r, `${label} : points restants`);
            assert.equal(countMarks(frames, 'x'), b, `${label} : points barrés`);
          }
          for (const f of frames) assert.equal(f.length, 10, `${label} : boîte de 10 incomplète`);
        }
        n++;
      }
    }
  }
  assert.ok(n > 8000);
});

test('calcul (pavé) et calcul flash : une explication juste pour chaque question', () => {
  const calcul = findGame('calcul');
  for (let level = 1; level <= calcul.levels.length; level++) {
    for (const q of questionsAt('calcul', level)) {
      const ex = explain(q);
      if (q.interaction !== 'keypad') {
        assert.equal(ex, null, 'pas d’explication pour relier ou compléter');
        continue;
      }
      assert.ok(ex, q.key);
      assert.equal(checkSteps(ex, q.key).at(-1).at(-1), q.answer, q.key);
    }
  }
  for (const level of [5, 6, 7]) {
    for (const q of questionsAt('vite-vu', level)) {
      const ex = explain(q);
      assert.equal(checkSteps(ex, q.key).at(-1).at(-1), q.answer, q.key);
    }
  }
  for (const level of [1, 2, 3, 4]) for (const q of questionsAt('vite-vu', level)) assert.equal(explain(q), null);
});

test('faire 10 : le complément est dans un calcul juste, la boîte montre les cases vides', () => {
  for (let level = 1; level <= findGame('faire-dix').levels.length; level++) {
    for (const q of questionsAt('faire-dix', level)) {
      const ex = explain(q);
      assert.ok(ex, q.key);
      const values = checkSteps(ex, q.key);
      const total = q.stage.type === 'frame' ? q.stage.size : q.stage.type === 'frames' ? 20 : q.stage.parts[4];
      const n = total - q.answer;
      // la dernière étape : « n + réponse = total », ou « a + b = réponse » (en deux étapes)
      const last = ex.steps.at(-1);
      assert.ok(last === `${n} + ${q.answer} = ${total}` || values.at(-1).at(-1) === q.answer, `${q.key} : « ${last} »`);
      if (ex.visual) {
        assert.equal(countMarks(ex.visual.frames, ''), q.answer, `${q.key} : cases vides`);
        assert.equal(countMarks(ex.visual.frames, 'a'), n, `${q.key} : points`);
      }
    }
  }
});

test('les tables : n × t = t + t + … ; le nombre qui manque est retrouvé', () => {
  for (let level = 1; level <= 7; level++) {
    for (const q of questionsAt('tables', level)) {
      const ex = explain(q);
      assert.ok(ex, q.key);
      assert.equal(ex.say, SAY.tables);
      const values = checkSteps(ex, q.key);
      const product = values.at(-1).at(-1);
      if (level <= 6) assert.equal(product, q.answer, q.key);
      else {
        assert.equal(product, q.stage.parts[4], q.key);
        assert.ok(ex.steps[0].startsWith(`${q.stage.parts[0] ?? q.answer} × ${q.stage.parts[2] ?? q.answer} =`), `${q.key} : ${ex.steps[0]}`);
      }
      if (ex.visual) assert.equal(ex.visual.rows.reduce((s, r) => s + r, 0), product, `${q.key} : points`);
    }
  }
  for (const level of [8, 9]) for (const q of questionsAt('tables', level)) assert.equal(explain(q), null);
});

test('doubles et moitiés : le calcul écrit donne la bonne réponse', () => {
  for (let level = 1; level <= findGame('doubles').levels.length; level++) {
    for (const q of questionsAt('doubles', level)) {
      const ex = explain(q);
      assert.ok(ex, q.key);
      const values = checkSteps(ex, q.key);
      if (/moitié/.test(q.key)) {
        // « h + h = n » : la moitié est le nombre ajouté à lui-même
        assert.ok(ex.steps.at(-1).startsWith(`${q.answer} + ${q.answer} = `), `${q.key} : ${ex.steps.at(-1)}`);
        if (ex.visual) assert.deepEqual(ex.visual.rows, [q.answer, q.answer]);
      } else {
        assert.equal(values.at(-1).at(-1), q.answer, q.key);
        if (ex.visual) assert.equal(ex.visual.rows[0] + ex.visual.rows[1], q.answer);
      }
    }
  }
});

test('comparer : la comparaison écrite est vraie et désigne la bonne réponse', () => {
  for (let level = 2; level <= findGame('comparer').levels.length; level++) {
    for (const q of questionsAt('comparer', level)) {
      const ex = explain(q);
      assert.ok(ex, q.key);
      checkSteps(ex, q.key);
      const last = ex.steps.at(-1);
      if (level <= 4) {
        const [lo, hi] = last.split(' < ').map(Number);
        assert.equal(q.answer, q.text.includes('le plus grand') ? hi : lo, q.key);
        assert.deepEqual([lo, hi].sort((x, y) => x - y), q.choices.map((c) => c.value).sort((x, y) => x - y));
      } else if (level === 5) {
        const [a, b] = q.key.split(':').at(-1).split('-').map(Number);
        const shown = last.includes('=') ? '=' : Number(last.split(' < ')[0]) === a ? '<' : '>';
        assert.equal(shown, q.answer, q.key);
      } else if (level === 6) {
        const [low, , high] = last.split(' < ');
        assert.equal(`${low} et ${high}`, q.answer, q.key);
      } else {
        const [x, y] = ex.steps.slice(0, 2).map((s) => [s.split(' = ')[0], Number(s.split(' = ')[1])]);
        const winner = q.text.includes('le plus grand') ? (x[1] > y[1] ? x : y) : (x[1] < y[1] ? x : y);
        assert.equal(winner[0], q.answer, q.key);
      }
    }
  }
  for (const q of questionsAt('comparer', 1)) assert.equal(explain(q), null);
});

test('dizaines et unités : barres, cubes, plaques et places des chiffres', () => {
  for (let level = 1; level <= findGame('dizaines').levels.length; level++) {
    for (const q of questionsAt('dizaines', level)) {
      const ex = explain(q);
      assert.ok(ex, q.key);
      const values = checkSteps(ex, q.key);
      if (level === 7) {
        const { rows, mark } = ex.visual;
        assert.equal(rows[0][mark], String(q.answer), `${q.key} : chiffre mis en valeur`);
      } else {
        assert.equal(values.at(-1).at(-1), q.answer, q.key);
        if (ex.visual) assert.equal(ex.visual.rows[0].join(''), String(q.answer));
      }
    }
  }
});

test('la monnaie : la somme, la monnaie rendue, le prix', () => {
  for (const level of [1, 2, 4, 5, 7]) {
    for (const q of questionsAt('monnaie', level)) {
      const ex = explain(q);
      assert.ok(ex, q.key);
      const values = checkSteps(ex, q.key);
      if (level === 5) assert.equal(values[0].at(-1), q.stage.items.reduce((s, v) => s + v, 0));
      else if (level === 4) assert.equal(ex.steps[0], `${q.stage.price} + ${q.answer} = ${q.stage.paid}`);
      else assert.equal(values[0].at(-1), q.answer, q.key);
    }
  }
  for (const level of [3, 6]) for (const q of questionsAt('monnaie', level)) assert.equal(explain(q), null);
});

test('homophones : le test de remplacement est la phrase, et il désigne la bonne réponse', () => {
  const YES = { avait: 'a', avais: 'as', était: 'est', étaient: 'sont', avaient: 'ont', 'ou bien': 'ou', ici: 'là', un: 'ce', 'cela est': 'c’est' };
  for (let level = 1; level <= findGame('homophones').levels.length; level++) {
    for (const q of questionsAt('homophones', level)) {
      const ex = explain(q);
      assert.ok(ex, q.key);
      checkSteps(ex, q.key);
      const sentence = q.key.replace(/^homophones:(deux:)?/, '');
      const answers = String(q.answer).split('|');
      assert.equal(ex.steps.length, answers.length);
      ex.steps.forEach((step, i) => {
        let k = 0;
        assert.equal(step.text, sentence.replace(/___/g, () => (k++ === i ? step.em : '…')), q.key);
        assert.equal(step.ok, YES[step.em] === answers[i], `${q.key} : ${step.text}`);
        // le mot du test est l'un des deux mots proposés (ou « a » pour a, as, à)
        assert.ok(q.choices.some((c) => String(c.value).split('|').includes(YES[step.em])), `${q.key} : ${step.em}`);
      });
    }
  }
  // tous les homophones des données ont leur test
  for (const set of GRAMMAR_DATA.HOMOPHONES) {
    for (const [sentence, answer] of set.items) {
      const ex = explain({ key: `homophones:${sentence}`, answer, choices: set.pair.map((w) => ({ value: w })) });
      assert.ok(ex, sentence);
    }
  }
});

test('genre : le petit mot du test (un, une, le, la) va avec la bonne réponse', () => {
  const nouns = [...GRAMMAR_DATA.NOUNS, ...GRAMMAR_DATA.X_NOUNS];
  for (let level = 1; level <= findGame('genre').levels.length; level++) {
    for (const q of questionsAt('genre', level)) {
      const ex = explain(q);
      if (level === 1 && /^[aeéiouy]/.test(q.key.split(':')[2])) {
        assert.equal(ex, null, 'l’avion ne dit pas le genre');
        continue;
      }
      assert.ok(ex, q.key);
      checkSteps(ex, q.key);
      const first = ex.steps[0];
      if (level <= 5 && first.em && ['un', 'une', 'le', 'la'].includes(first.em)) {
        const masc = ['un', 'le'].includes(first.em);
        const expected = { 1: masc ? 'un' : 'une', 2: masc ? 'le' : 'la', 3: masc ? 'le' : 'la', 4: masc ? 'mon' : 'ma', 5: masc ? ['ce', 'cet'] : 'cette' }[level];
        assert.ok([expected].flat().includes(q.answer), `${q.key} : ${first.text} → ${q.answer}`);
      }
      if (ex.say === SAY.plural) assert.ok(['les', 'mes', 'ces'].includes(q.answer), q.key);
      if (ex.say === SAY.genreL) assert.equal(q.answer, "l'");
      if (ex.say === SAY.genreCet) assert.equal(q.answer, 'cet');
      if (level === 6 || level === 8) {
        // l'adjectif = l'adjectif de base, + e si féminin, + s si pluriel (comme le disent les étapes)
        const word = level === 6 ? q.answer : q.answer.split(' ')[1];
        const base = ['petit', 'grand', 'joli'].find((adj) => word.startsWith(adj));
        const fem = ex.steps[0].em === 'e';
        const pl = ex.steps[1].em === 's';
        assert.equal(word, `${base}${fem ? 'e' : ''}${pl ? 's' : ''}`, `${q.key} : ${word}`);
      }
      if (level === 7) {
        const noun = nouns.find((n) => n.pl === q.answer);
        const rule = noun.pl.endsWith('aux') && noun.w.endsWith('al') ? SAY.pluralAl : noun.pl.endsWith('x') ? SAY.pluralX : SAY.pluralS;
        assert.equal(ex.say, rule, q.key);
      }
    }
  }
});

test('accords : la règle dite va avec la bonne réponse', () => {
  for (let level = 1; level <= findGame('accords').levels.length; level++) {
    for (const q of questionsAt('accords', level)) {
      const ex = explain(q);
      if (/^accords:8:/.test(q.key) || (/^accords:4:/.test(q.key) && /^[aeéiouyh]/.test(q.key.slice(10)))) {
        assert.equal(ex, null, q.key);
        continue;
      }
      assert.ok(ex, q.key);
      checkSteps(ex, q.key);
      const answer = String(q.answer);
      if (q.key.startsWith('accords:pluriel:')) {
        if (ex.say === SAY.pluralAl) assert.ok(answer.endsWith('aux'), q.key);
        if (ex.say === SAY.pluralX) assert.ok(answer.endsWith('x'), q.key);
        if (ex.say === SAY.pluralS) assert.ok(answer.endsWith('s'), q.key);
        if (ex.say === SAY.pluralOu) assert.equal(answer.endsWith('x'), ex.steps[0].ok, q.key);
      }
      if (q.key.startsWith('accords:1:')) assert.equal(ex.steps[0].em === 'plusieurs', answer.startsWith('des '), q.key);
      if (q.key.startsWith('accords:4:')) assert.equal(ex.steps[0].em === 'le', answer === 'un', q.key);
      if (q.key.startsWith('accords:7:')) assert.equal(ex.say === SAY.verbPlural, answer.endsWith('ent'), q.key);
    }
  }
});

test('conjugaison : la personne mise en valeur donne la bonne forme', () => {
  const ENDINGS = { present: ['e', 'es', 'e', 'ons', 'ez', 'ent'], futur: ['ai', 'as', 'a', 'ons', 'ez', 'ont'] };
  for (let level = 1; level <= findGame('conjugaison').levels.length; level++) {
    for (const q of questionsAt('conjugaison', level)) {
      const ex = explain(q);
      if (level === 3) {
        assert.equal(ex, null);
        continue;
      }
      assert.ok(ex, q.key);
      checkSteps(ex, q.key);
      const template = q.key.slice(q.key.indexOf(':', 12) + 1);
      const person = personOf(subjectOf(template));
      const def = GRAMMAIRE_DATA.CONJ_LEVELS[level];
      if (def.tenses) {
        const tense = def.items.find((it) => it[1] === template)[2];
        assert.equal(conjugate(def.items.find((it) => it[1] === template)[0], tense, person), q.answer);
        assert.match(ex.steps[0].text, { passe: /passé/, present: /présent/, futur: /futur/ }[tense]);
        continue;
      }
      const em = ex.visual.cells.filter((c) => c.em);
      assert.equal(em.length, 1, q.key);
      const cell = em[0].text.replace('j’', 'je ');
      const verb = def.items.find((it) => it[1] === template)[0];
      // passé composé : la forme d'avoir ; verbes irréguliers : la forme entière
      if (level === 9) assert.ok(cell.endsWith(` ${q.answer.split(' ')[0]}`), `${q.key} : ${cell}`);
      else if (GRAMMAIRE_DATA.IRREGULAR[def.tense]?.[verb]) assert.ok(cell.endsWith(` ${q.answer}`), `${q.key} : ${cell} / ${q.answer}`);
      if (level === 4 || level === 5 || level === 7) {
        const ending = (level === 7 ? ENDINGS.futur : ENDINGS.present)[person];
        assert.ok(cell.endsWith(`…${ending}`) && q.answer.endsWith(ending), `${q.key} : ${cell} / ${q.answer}`);
      }
    }
  }
});

test('révisions, défis et parties à deux gardent l’explication ; les autres jeux n’en ont pas', () => {
  const q = findGame('calcul').generate(10, createRng(3), 0);
  assert.deepEqual(explain({ ...q, key: `revision:${q.key}`, from: 'calcul' }), explain(q));
  assert.deepEqual(explain({ ...q, key: `duo:${q.key}` }), explain(q));
  for (const id of ['compter', 'suite', 'trous', 'relie-calculs', 'lettres', 'tables-chrono', 'problemes']) {
    const game = findGame(id);
    for (let level = 1; level <= game.levels.length; level++) {
      for (const question of [...questionsAt(id, level)].slice(0, 20)) assert.equal(explain(question), null, `${id} ${level}`);
    }
  }
  assert.equal(explain(null), null);
  assert.equal(explain({ key: 'calcul:3+4', interaction: 'match', stage: { type: 'none' } }), null);
});

test('l’encart est affiché après la première erreur seulement, et ses fichiers sont mis en cache', () => {
  const main = readFileSync(new URL('../app/js/main.js', import.meta.url), 'utf8');
  assert.match(main, /session\.attempts === 0 && message === 'Essaie encore !' && !session\.chrono \? explain\(q\)/);
  const sw = readFileSync(new URL('../app/sw.js', import.meta.url), 'utf8');
  for (const file of ['./js/explications.js', './js/explications-rendu.js', './css/explications.css']) assert.ok(sw.includes(`'${file}'`), file);
  assert.match(readFileSync(new URL('../app/index.html', import.meta.url), 'utf8'), /css\/explications\.css/);
});
