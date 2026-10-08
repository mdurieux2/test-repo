// Tableaux et graphiques, problèmes en schémas (app/js/games/donnees.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findGame } from '../app/js/games/index.js';
import {
  CHART_THEMES, SCHEMA_LEVELS, askedValue, barModelMarkup, chartMarkup, schemaMarkup, shownNumbers, validModel,
} from '../app/js/games/donnees.js';
import { createRng } from '../app/js/random.js';

const RUNS = 300;
const graphiques = findGame('graphiques');
const schemas = findGame('schemas');

function* questions(game, ctx = { name: 'Zélie' }) {
  for (let level = 1; level <= game.levels.length; level++) {
    const rng = createRng(4242 + level);
    for (let i = 0; i < RUNS; i++) yield { level, i, q: game.generate(level, rng, i, ctx) };
  }
}

/** Le texte, sans les fautes de typographie les plus courantes. */
function checkFrench(text, ctx) {
  assert.doesNotMatch(text, /\s{2,}|\s[.,]|undefined|null|NaN/, `${ctx} : « ${text} »`);
  assert.doesNotMatch(text, /[^ ][?!:;]/u, `espace avant ? ! : ; : « ${text} »`);
  assert.doesNotMatch(text, /'/, `apostrophe droite : « ${text} »`);
  assert.doesNotMatch(text, /\b(de|que) [aeiouéèêh]/i, `élision oubliée : « ${text} »`);
  assert.doesNotMatch(text, /\b1 [a-zé]+s\b/, `pluriel après 1 : « ${text} »`);
}

test('rubrique, section, 7 à 10 niveaux, libellés courts et différents', () => {
  for (const game of [graphiques, schemas]) {
    assert.equal(game.domain, 'maths');
    assert.equal(game.section, 'Nombres et calcul');
    assert.ok(game.levels.length >= 7 && game.levels.length <= 10, game.id);
    for (const label of game.levels) assert.ok([...label].length <= 26, `« ${label} » trop long`);
    assert.equal(new Set(game.levels).size, game.levels.length);
  }
  assert.equal(SCHEMA_LEVELS.length, 9, 'le niveau 10 de schemas mélange les niveaux 4 à 9');
});

test('les deux jeux sont déterministes', () => {
  for (const game of [graphiques, schemas]) {
    for (let level = 1; level <= game.levels.length; level++) {
      const rngA = createRng(77 + level);
      const rngB = createRng(77 + level);
      for (let i = 0; i < 20; i++) {
        assert.deepEqual(game.generate(level, rngA, i, { name: 'Lou' }), game.generate(level, rngB, i, { name: 'Lou' }), `${game.id} ${level}`);
      }
    }
  }
});

// ---------------------------------------------------------------- Tableaux et graphiques

test('graphiques : thèmes complets, noms courts, emoji tous différents', () => {
  for (const theme of CHART_THEMES) {
    assert.ok(theme.items.length >= 5, theme.id);
    assert.equal(new Set(theme.items.map((it) => it.emoji)).size, theme.items.length, theme.id);
    assert.equal(new Set(theme.items.map((it) => it.label)).size, theme.items.length, theme.id);
    for (const it of theme.items) {
      assert.ok(it.label.length <= 9, `${it.label} : trop long sous une barre`);
      assert.match(it.the, /^(les|le|la) /, it.the);
      if (it.de) assert.match(it.de, /^(de |d’)/, it.de);
    }
    assert.equal(theme.cols.length, 2);
  }
});

test('graphiques : la bonne réponse est lue dans le dessin, une seule fois parmi les choix', () => {
  for (const { level, q } of questions(graphiques)) {
    const ctx = `graphiques niveau ${level} : ${q.text}`;
    const { chart } = q.stage;
    assert.equal(q.stage.type, 'chart');
    assert.equal(q.interaction, undefined);
    const values = q.choices.map((c) => c.value);
    assert.ok(values.length >= 3 && values.length <= 4, ctx);
    assert.equal(new Set(values).size, values.length, `choix en double : ${ctx}`);
    assert.equal(values.filter((v) => v === q.answer).length, 1, `réponse absente : ${ctx}`);
    for (const t of [q.text, q.instruction, q.success.speak]) checkFrench(t, ctx);
    assert.ok(q.text.endsWith(' ?'), ctx);

    // les nombres du dessin : entiers positifs, tous différents, sur une graduation de l'axe
    const shown = chart.kind === 'table2' ? chart.items.flatMap((it) => it.values) : chart.items.map((it) => it.value);
    assert.equal(new Set(shown).size, shown.length, `nombres en double : ${ctx}`);
    for (const v of shown) assert.ok(Number.isInteger(v) && v >= 2, ctx);
    if (chart.kind === 'bars') for (const v of shown) assert.ok(v <= chart.max && v % chart.step === 0, `${v} hors graduation : ${ctx}`);
    if (chart.kind === 'picto') for (const v of shown) assert.ok(v <= 8, ctx);
    assert.equal(new Set(chart.items.map((it) => it.label)).size, chart.items.length, ctx);
    // jamais un nombre absurde : pas plus de 100, pas de bêtes par centaines
    for (const v of shown) assert.ok(v <= 100, ctx);
    if (chart.title.includes('bêtes')) for (const v of shown) assert.ok(v <= 20, ctx);

    // la réponse se déduit du dessin
    const byLabel = (label) => chart.items.find((it) => it.label === label);
    const where = (it) => [it.the, it.de].filter(Boolean).map((w) => q.text.indexOf(w)).find((k) => k >= 0) ?? -1;
    const mentioned = chart.items.filter((it) => where(it) >= 0).sort((a, b) => where(a) - where(b));
    if (typeof q.answer === 'string') {
      const best = (most) => chart.items.reduce((a, b) => ((most ? b.value > a.value : b.value < a.value) ? b : a));
      assert.equal(byLabel(q.answer), best(q.text.includes('plus')), ctx);
      assert.deepEqual(q.choices.map((c) => c.value).sort(), chart.items.map((it) => it.label).sort(), ctx);
      for (const c of q.choices) assert.ok(c.label.startsWith(byLabel(c.value).emoji), 'chaque choix a son dessin');
    } else if (q.text.includes('en tout')) {
      assert.equal(q.answer, shown.reduce((a, b) => a + b, 0), ctx);
    } else if (q.text.includes('de plus')) {
      // « Combien d’enfants de plus aiment A que B ? » : A en a le plus
      assert.equal(mentioned.length, 2, ctx);
      const [a, b] = mentioned;
      assert.ok(q.answer >= 1, ctx);
      assert.equal(q.answer, a.value - b.value, `différence négative ou fausse : ${ctx}`);
    } else if (chart.kind === 'table2') {
      const col = chart.cols.findIndex((c) => q.text.includes(` ${c} `));
      assert.ok(col >= 0, ctx);
      assert.equal(mentioned.length, 1, ctx);
      assert.equal(q.answer, mentioned[0].values[col], ctx);
      // les autres choix : la même ligne ou la même colonne (erreurs de lecture)
      for (const v of values) assert.ok(mentioned[0].values.includes(v) || chart.items.some((it) => it.values[col] === v), ctx);
    } else {
      assert.equal(mentioned.length, 1, ctx);
      assert.equal(q.answer, mentioned[0].value, ctx);
      if (chart.step > 1) for (const v of values) assert.equal(v % chart.step, 0, `choix hors graduation : ${ctx}`);
    }
  }
});

test('graphiques : la sorte de dessin et d’axe de chaque niveau', () => {
  const kinds = { 1: ['picto'], 2: ['table'], 3: ['bars'], 5: ['bars'], 6: ['bars'], 8: ['table2'], 9: ['bars'] };
  const steps = { 3: [1], 5: [1], 6: [2], 9: [5, 10] };
  const seen = {};
  for (const { level, q } of questions(graphiques)) {
    const { kind, step, max } = q.stage.chart;
    if (kinds[level]) assert.ok(kinds[level].includes(kind), `niveau ${level} : ${kind}`);
    if (steps[level]) assert.ok(steps[level].includes(step), `niveau ${level} : pas de ${step}`);
    if (kind === 'bars') assert.ok((max / step) <= 10, 'au plus 10 graduations');
    (seen[level] = seen[level] || new Set()).add(`${kind}:${step}`);
  }
  assert.ok(seen[4].size >= 3 && seen[7].size >= 3, 'plus/moins et total : pictogramme, tableau et barres');
  assert.ok(seen[10].size >= 5, 'mélange : toutes sortes de dessins');
  assert.ok(seen[9].has('bars:5') && seen[9].has('bars:10'));
});

test('graphiques : le dessin montre chaque catégorie avec son dessin et son nom', () => {
  for (const { q } of questions(graphiques)) {
    const { chart } = q.stage;
    const html = chartMarkup(chart);
    for (const it of chart.items) {
      assert.ok(html.includes(it.emoji) && html.includes(it.label), `${it.label} absent du dessin`);
    }
    if (chart.kind === 'picto') {
      for (const it of chart.items) assert.equal(html.split(`<span class="object">${it.emoji}</span>`).length - 1, it.value);
    }
    if (chart.kind === 'bars') {
      // graduations de 0 au maximum, de step en step
      const ticks = [...html.matchAll(/class="chart-tick">(\d+)</g)].map((m) => Number(m[1]));
      assert.deepEqual(ticks, Array.from({ length: chart.max / chart.step + 1 }, (_, i) => i * chart.step));
      assert.equal((html.match(/class="chart-bar"/g) || []).length, chart.items.length);
    }
    if (chart.kind === 'table2') for (const it of chart.items) for (const v of it.values) assert.ok(html.includes(`<td>${v}</td>`));
  }
});

// ---------------------------------------------------------------- Problèmes en schémas

test('schémas : le « ? » cache la bonne réponse, les nombres écrits sont ceux de l’histoire', () => {
  for (const { level, i, q } of questions(schemas)) {
    const p = q.problem;
    const ctx = `schemas niveau ${level} : ${p.facts} ${p.question}`;
    assert.ok(validModel(p.model), `schéma faux : ${ctx}`);
    const answer = askedValue(p.model);
    assert.ok(Number.isInteger(answer) && answer >= 1, ctx);
    for (const t of [p.facts, p.question, q.instruction, q.success.speak]) checkFrench(t, ctx);
    assert.ok(p.question.endsWith(' ?') && p.question.startsWith('Combien'), ctx);
    assert.ok(p.facts.includes('Zélie'), `le prénom de l'enfant : ${ctx}`);
    // tous les nombres de l'histoire sont sur le schéma, et le schéma n'en montre pas d'autre
    const told = (p.facts.match(/\d+/g) || []).map(Number).sort((a, b) => a - b);
    assert.deepEqual([...shownNumbers(p.model)].sort((a, b) => a - b), told, `nombres du schéma : ${ctx}`);
    for (const n of [...told, answer]) assert.ok(n >= 2 && n <= 100, `nombre absurde : ${ctx}`);
    // le calcul dit après la réponse se termine par la réponse, et chaque étape est juste
    assert.ok(q.success.speak.endsWith(`ça fait ${answer}.`) || q.interaction !== 'keypad', ctx);
    for (const step of p.speech.split('. ')) {
      const [calc, result] = step.replace(/\.$/, '').split(', ça fait ');
      const value = calc.split(' ').reduce((acc, w, k, words) => (k === 0 ? Number(w) : /^\d+$/.test(w) ? (words[k - 1] === 'plus' ? acc + Number(w) : acc - Number(w)) : acc), 0);
      assert.equal(value, Number(result), `calcul faux « ${step} » : ${ctx}`);
      assert.ok(Number(result) >= 1, ctx);
    }
    assert.ok(p.speech.endsWith(`ça fait ${answer}.`), ctx);

    if (q.interaction === 'keypad') {
      assert.equal(q.answer, answer, ctx);
      assert.equal(q.stage.model, p.model);
      assert.ok(String(answer).length <= q.maxDigits, ctx);
      // un seul « ? » sur le schéma, celui qui reçoit les chiffres tapés
      const html = schemaMarkup(q.stage);
      assert.equal((html.match(/class="bm-q gap"/g) || []).length, 1, ctx);
      assert.equal((html.match(/>\?</g) || []).length, 1, ctx);
    } else {
      assert.ok(level >= 3, 'niveaux 1 et 2 : on calcule seulement');
      assert.equal(i % 2, 0, 'on choisit le schéma une question sur deux');
      assert.equal(q.choiceStyle, 'schemas');
      const right = q.choices.filter((c) => c.value === q.answer);
      assert.equal(right.length, 1, ctx);
      assert.equal(right[0].model, p.model, ctx);
      assert.equal(new Set(q.choices.map((c) => c.value)).size, q.choices.length, ctx);
      assert.ok(q.stage.text.includes(p.question), 'l’histoire écrite contient la question');
      assert.equal(q.stage.model, undefined, 'le bon schéma n’est pas dans l’histoire');
      // les mauvais schémas sont justes en eux-mêmes, mais leur « ? » ne donne pas la réponse
      const markups = new Set();
      for (const c of q.choices) {
        assert.ok(validModel(c.model), `schéma proposé impossible : ${ctx}`);
        if (c.model !== p.model) assert.notEqual(askedValue(c.model), answer, `deux schémas donnent la réponse : ${ctx}`);
        const html = barModelMarkup(c.model);
        assert.equal((html.match(/>\?</g) || []).length, 1, ctx);
        markups.add(html);
        assert.ok(c.name.length > 5, 'chaque schéma est décrit pour les lecteurs d’écran');
      }
      assert.equal(markups.size, q.choices.length, `deux schémas identiques : ${ctx}`);
    }
  }
});

test('schémas : les sortes de problèmes et les nombres de chaque niveau', () => {
  const kind = (m) => (m.kind === 'parts' ? `${m.ask === 'whole' ? 'tout' : 'partie'}${m.parts.length}` : m.ask === 'total' ? 'total' : m.ask === 'diff' ? 'ecart' : 'barre');
  const seen = {};
  for (const { level, q } of questions(schemas)) {
    const p = q.problem;
    (seen[level] = seen[level] || new Set()).add(kind(p.model));
    const conf = SCHEMA_LEVELS[level - 1];
    if (conf) {
      for (const n of [...shownNumbers(p.model), askedValue(p.model)]) assert.ok(n <= conf.max, `niveau ${level} : ${n} > ${conf.max}`);
      if (q.interaction !== 'keypad') assert.equal(q.choices.length, conf.choices, `niveau ${level}`);
    }
    if (level === 5) assert.ok(p.facts.includes('de plus') || p.question.includes('de plus'), p.facts);
    if (level === 6) assert.ok(p.facts.includes('de moins') || p.question.includes('de moins'), p.facts);
    // comparaison : la question parle bien de celui qui en a le plus (« de plus ») ou le moins (« de moins »)
    if (p.model.kind === 'compare' && p.model.ask === 'diff') {
      const [me, friend] = p.model.rows.map((r) => r.value);
      assert.equal(p.question.includes('de plus'), me > friend, p.question);
    }
  }
  assert.deepEqual([...seen[1]], ['tout2']);
  assert.deepEqual([...seen[2]], ['partie2']);
  assert.deepEqual([...seen[3]].sort(), ['partie2', 'tout2']);
  assert.deepEqual([...seen[5]].sort(), ['barre', 'ecart']);
  assert.deepEqual([...seen[6]].sort(), ['barre', 'ecart']);
  assert.deepEqual([...seen[8]].sort(), ['partie3', 'tout3']);
  assert.deepEqual([...seen[9]].sort(), ['partie3', 'total']);
  assert.ok(seen[7].size >= 4 && seen[10].size >= 6);
});

test('schémas : « de plus » et « de moins » dessinés du bon côté', () => {
  for (const { q } of questions(schemas)) {
    const { model: m, facts } = q.problem;
    if (m.kind !== 'compare') continue;
    const [me, friend] = m.rows.map((r) => r.value);
    if (/de plus qu/.test(facts)) assert.ok(friend > me, facts);
    if (/de moins qu/.test(facts)) assert.ok(friend < me, facts);
    // deux étapes : le nombre de l'autre n'est pas écrit, l'accolade réunit les deux barres
    if (m.ask === 'total') {
      assert.deepEqual(m.hide, [1]);
      assert.ok(barModelMarkup(m).includes('bm-brace'));
      assert.match(q.problem.speech, /\. .* plus .*, ça fait \d+\.$/);
    }
  }
});

test('schémas : le prénom de l’enfant, avec l’élision (qu’Eva-Rose) et sans HTML', () => {
  const rng = createRng(3);
  let elided = 0;
  for (let i = 0; i < 400; i++) {
    const q = schemas.generate(randLevel(i), rng, i, { name: 'Eva-Rose' });
    assert.doesNotMatch(q.instruction, /que Eva/, q.instruction);
    if (q.instruction.includes('qu’Eva-Rose')) elided++;
  }
  assert.ok(elided > 0);
  const q = schemas.generate(5, createRng(1), 1, { name: '<b>Léo</b>' });
  const html = schemaMarkup(q.stage);
  assert.ok(!html.includes('<b>Léo'), 'le prénom est échappé');
  assert.equal(schemas.generate(1, createRng(1), 0).problem.facts.split(' ')[0], 'Lou', 'prénom par défaut sans profil');
});

function randLevel(i) {
  return [5, 6, 9][i % 3];
}

test('schémas : largeurs des barres (le tout fait 100 %, la grande barre aussi)', () => {
  for (const { q } of questions(schemas)) {
    const html = barModelMarkup(q.problem.model);
    const tracks = html.split('class="bm-track"').slice(1).map((t) => [...t.split('</span></span>')[0].matchAll(/width:([\d.]+)%/g)].map((m) => Number(m[1])));
    assert.equal(tracks.length, 2);
    for (const widths of tracks) for (const w of widths) assert.ok(w >= 14, `case trop étroite pour son nombre : ${w} %`);
    const total = (widths) => widths.reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(total(tracks[0]) - 100) < 0.5 || Math.abs(total(tracks[1]) - 100) < 0.5);
    assert.ok(Math.abs(total(tracks[0]) - total(tracks[1])) < 0.5, 'les deux barres ont la même longueur en tout');
  }
});
