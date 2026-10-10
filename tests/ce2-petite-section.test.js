// Petite section et CE2 : les deux nouvelles classes (programmes, jeux sans lecture en PS) et les
// nouveaux jeux du CE2 (grands nombres, multiplication, division, périmètres, imparfait).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findGame } from '../app/js/games/index.js';
import { CE2_GAMES, ce2Svg, dit, ecrit, enLettres, imparfait, mulSteps } from '../app/js/games/ce2.js';
import { GRADE_GOALS, PROGRAMS, levelRange, programFor } from '../app/js/programs.js';
import { addChild, defaultStore, GRADES } from '../app/js/storage.js';
import { dailyPicks, drawPool } from '../app/js/picks.js';
import { isListenOnly } from '../app/js/a11y-jeux.js';
import { createRng } from '../app/js/random.js';

const CONTEXT = { name: 'Zoé', season: 'printemps' };
const RUNS = 120;

function* questions(game, levels = game.levels.map((_, i) => i + 1), runs = RUNS) {
  for (const level of levels) {
    const rng = createRng(4242 + level);
    for (let i = 0; i < runs; i++) yield { level, q: game.generate(level, rng, i, CONTEXT) };
  }
}

/** Ce que dit la voix : la consigne, sa version courte, la réécoute et la phrase de réussite. */
function spokenTexts(q) {
  const parts = [q.instruction, q.short?.speak, q.replay, q.success?.speak];
  return parts.flat(3).filter(Boolean).map((p) => (typeof p === 'string' ? p : p.text));
}

const numbersIn = (text) => (text.replace(/[  ](?=\d{3}\b)/g, '').match(/\d+/g) || []).map(Number);

// ---------------------------------------------------------------- Les classes

test('six classes, de la petite section au CE2, chacune avec son programme et ses attendus', () => {
  assert.deepEqual(Object.keys(GRADES), ['PS', 'MS', 'GS', 'CP', 'CE1', 'CE2']);
  assert.equal(GRADES.PS, 'Petite section');
  assert.equal(GRADES.CE2, 'CE2');
  assert.deepEqual(Object.keys(PROGRAMS), Object.keys(GRADES));
  for (const grade of Object.keys(GRADES)) {
    assert.ok(GRADE_GOALS[grade] && GRADE_GOALS[grade].length < 200, `${grade} : attendus`);
    const games = programFor(grade).flatMap((d) => d.games);
    assert.ok(games.length >= 25, `${grade} : ${games.length} jeux seulement`);
    assert.equal(new Set(games.map(({ game }) => game.id)).size, games.length, `${grade} : jeu en double`);
    // le défi du jour tire 5 jeux distincts du programme
    const picks = dailyPicks({ grade }, `2026-10-08:${grade}`);
    assert.equal(new Set(picks.map(({ game }) => game.id)).size, 5, grade);
    const pool = drawPool({ grade }).map(({ game }) => game.id);
    assert.ok(picks.every(({ game }) => pool.includes(game.id)), grade);
  }
});

test('un enfant de petite section ou de CE2 garde sa classe', () => {
  const store = defaultStore();
  const ps = addChild(store, { name: 'Noé', grade: 'PS' });
  const ce2 = addChild(store, { name: 'Inès', grade: 'CE2' });
  assert.equal(store.profiles[ps].grade, 'PS');
  assert.equal(store.profiles[ce2].grade, 'CE2');
});

test('PS : seulement les niveaux les plus faciles, rien de chiffré ni de lu au-delà de 5', () => {
  for (const { game, min, max } of programFor('PS').flatMap((d) => d.games)) {
    if (game.id === 'parle-anglais') assert.deepEqual([min, max], [3, 3]); // les comptines
    else assert.ok(min === 1 && max <= 2, `${game.id} : ${min}-${max}`);
    assert.ok(!game.paliers && !game.timed, game.id);
  }
  const ids = programFor('PS').flatMap((d) => d.games.map(({ game }) => game.id));
  for (const id of ['lettres', 'premier-son', 'syllabes', 'bon-mot', 'calcul', 'dictee', 'tables', 'heure', 'sudoku', 'chemin-lettres']) {
    assert.ok(!ids.includes(id), `${id} n'est pas pour la petite section`);
  }
});

/** Un libellé se comprend sans savoir lire : vide (un dessin), une image, ou un nombre jusqu'à 10. */
function withoutReading(label) {
  if (label === undefined || label === null || label === '') return true;
  const text = String(label);
  if (/\p{Extended_Pictographic}/u.test(text)) return true;
  return /^\d+$/.test(text) && Number(text) <= 10;
}

test('PS : chaque jeu se joue sans savoir lire (la voix dit la consigne, on répond en touchant des images)', () => {
  for (const { game, levels } of programFor('PS').flatMap((d) => d.games)) {
    for (const level of levels) {
      for (const { q } of questions(game, [level], 40)) {
        const where = `${game.id} niveau ${level} (${q.key})`;
        assert.ok(!['keypad', 'fill', 'order'].includes(q.interaction) || q.items?.every((i) => withoutReading(i.label)), `${where} : ${q.interaction}`);
        assert.ok(!['word', 'text'].includes(q.stage.type), `${where} : un mot à lire`);
        if (q.stage.type === 'sentence') assert.equal(q.stage.lang, 'en', `${where} : une phrase à lire`); // la comptine, dite par la voix
        if (q.interaction === 'trace') assert.equal(q.stage.set, 'graphisme', `${where} : des lettres à écrire`);
        for (const c of q.choices || []) assert.ok(withoutReading(c.label) || c.e || c.emoji, `${where} : « ${c.label} »`);
        for (const p of q.pairs || []) assert.ok(withoutReading(p.left) && (p.objects || withoutReading(p.right)), where);
        for (const card of q.cards || []) assert.ok(withoutReading(card.label), `${where} : carte « ${card.label} »`);
        assert.ok(q.instruction, where); // la consigne est toujours dite
      }
    }
  }
});

test('CE2 : à la suite du CE1, et les jeux du CE2 en entier', () => {
  // un jeu du CE1 qui continue au CE2 y va au moins aussi loin
  for (const entries of Object.values(PROGRAMS.CE1)) {
    for (const [id] of entries) {
      if (!programFor('CE2').some((d) => d.games.some(({ game }) => game.id === id))) continue;
      const ce1 = levelRange('CE1', id);
      const ce2 = levelRange('CE2', id);
      assert.ok(ce2.min >= ce1.min && ce2.max >= ce1.max, `${id} : CE1 ${ce1.min}-${ce1.max}, CE2 ${ce2.min}-${ce2.max}`);
    }
  }
  // avant le CE2, seulement ce que le programme du CE1 en demande : l'imparfait d'être, d'avoir et des
  // verbes en -er, et les débuts de la multiplication (fois 10, 13 × 7 = 10 × 7 + 3 × 7)
  const before = { imparfait: [1, 2, 3, 6, 7, 8], 'multiplication-posee': [1, 2, 3] };
  for (const game of CE2_GAMES) {
    assert.deepEqual(levelRange('CE2', game.id).levels, game.levels.map((_, i) => i + 1), game.id);
    for (const grade of ['PS', 'MS', 'GS', 'CP', 'CE1']) {
      const entry = programFor(grade).flatMap((d) => d.games).find((g) => g.game.id === game.id);
      if (grade === 'CE1' && before[game.id]) assert.deepEqual(entry?.levels, before[game.id], game.id);
      else assert.ok(!entry, `${game.id} n'est pas au programme avant le CE2 (${grade})`);
    }
  }
  assert.deepEqual(levelRange('CE2', 'calcul').levels, Array.from({ length: 15 }, (_, i) => 22 + i));
});

// ---------------------------------------------------------------- Les nouveaux jeux

test('nouveaux jeux : rangés dans les rubriques, de 7 à 10 niveaux, rien à écouter seulement', () => {
  const where = { 'grands-nombres': 'maths', 'multiplication-posee': 'maths', division: 'maths', perimetres: 'temps', imparfait: 'francais' };
  assert.deepEqual(CE2_GAMES.map((g) => g.id).sort(), Object.keys(where).sort());
  for (const game of CE2_GAMES) {
    assert.equal(findGame(game.id), game);
    assert.equal(game.domain, where[game.id]);
    assert.ok(game.section, game.id);
    assert.ok(game.levels.length >= 7 && game.levels.length <= 10, game.id);
    assert.equal(new Set(game.levels).size, game.levels.length, `${game.id} : libellé en double`);
    for (const { level, q } of questions(game)) assert.ok(!isListenOnly(q), `${game.id} niveau ${level}`);
  }
  assert.equal(findGame('perimetres').section, 'Monnaie et mesures');
});

test('nouveaux jeux : le prénom vient du profil, et la voix ne coupe jamais un nombre en deux', () => {
  for (const game of CE2_GAMES) {
    for (const { level, q } of questions(game, undefined, 40)) {
      const said = spokenTexts(q);
      const all = [q.text, q.stage.text, ...said].filter(Boolean).join(' ');
      assert.ok(!/\bLou\b/.test(all), `${game.id} niveau ${level} : prénom en dur`);
      for (const s of said) {
        assert.doesNotMatch(s, /\d[\s  ]\d{3}\b/, `${game.id} niveau ${level} : « ${s} »`);
        assert.ok(/[.?!…]$/.test(s.trim()) || /, /.test(s), `${game.id} niveau ${level} : phrase entière « ${s} »`);
      }
    }
  }
  // les problèmes racontés avec l'enfant : son prénom, dit par la voix
  for (const { q } of questions(findGame('division'), [4], 10)) assert.ok(q.instruction.startsWith('Zoé range'), q.instruction);
  for (const { q } of questions(findGame('perimetres'), [8], 20)) assert.ok(q.instruction.includes('Zoé'), q.instruction);
});

test('les nombres : écrits avec l’espace des milliers, en lettres, et dits par morceaux', () => {
  assert.equal(ecrit(4725), '4 725');
  assert.equal(ecrit(10000), '10 000');
  assert.equal(ecrit(725), '725');
  assert.equal(dit(4725), '4 mille 725');
  assert.equal(dit(1030), 'mille 30');
  assert.equal(dit(10000), '10 mille');
  assert.equal(dit(999), '999');
  const words = {
    21: 'vingt et un', 71: 'soixante et onze', 77: 'soixante-dix-sept', 80: 'quatre-vingts', 81: 'quatre-vingt-un',
    91: 'quatre-vingt-onze', 200: 'deux cents', 201: 'deux cent un', 1000: 'mille', 2080: 'deux mille quatre-vingts',
    3090: 'trois mille quatre-vingt-dix', 1716: 'mille sept cent seize', 9999: 'neuf mille neuf cent quatre-vingt-dix-neuf',
  };
  for (const [n, w] of Object.entries(words)) assert.equal(enLettres(Number(n)), w, n);
});

test('les grands nombres : chaque réponse est juste', () => {
  const game = findGame('grands-nombres');
  for (const { level, q } of questions(game)) {
    const where = `niveau ${level} ${q.key}`;
    switch (level) {
      case 1: assert.equal(q.stage.text, enLettres(q.answer), where); break;
      case 2: {
        const [n] = numbersIn(q.stage.text);
        const col = { milliers: 3, centaines: 2, dizaines: 1, unités: 0 }[q.text.match(/des (\S+)\s\?/)[1]];
        assert.equal(q.answer, Math.floor(n / 10 ** col) % 10, where);
        break;
      }
      case 3: assert.equal(numbersIn(q.stage.text).reduce((a, b) => a + b, 0), q.answer, where); break;
      case 4: {
        const values = q.choices.map((c) => c.value);
        assert.equal(q.answer, q.text.includes('grand') ? Math.max(...values) : Math.min(...values), where);
        break;
      }
      case 5:
        assert.equal(q.interaction, 'order');
        assert.equal(new Set(q.items.map((i) => i.value)).size, 4, where);
        assert.ok(q.items.every((i) => i.value >= 1000 && i.value <= 9999 && i.label === ecrit(i.value)), where);
        break;
      case 6: {
        const items = q.stage.items.map((v) => v ?? q.answer);
        assert.equal(q.stage.items.filter((v) => v === null).length, 1, where);
        const step = items[1] - items[0];
        assert.ok([10, 100, 1000].includes(Math.abs(step)), where);
        items.forEach((v, i) => assert.equal(v, items[0] + i * step, where));
        assert.ok(String(q.answer + 1).length <= q.maxDigits && q.answer <= 10000, where);
        break;
      }
      case 7: {
        const [n] = numbersIn(q.stage.text);
        assert.equal(q.answer, Math.floor(n / (q.text.includes('dizaines') ? 10 : 100)), where);
        break;
      }
      default: {
        const [n] = numbersIn(q.stage.text);
        assert.ok(q.answer <= n && n < q.answer + 1000 && q.answer % 1000 === 0, where);
      }
    }
  }
});

test('la multiplication : posée chiffre par chiffre avec ses retenues, et chaque réponse juste', () => {
  assert.deepEqual(mulSteps(47, 3).map((s) => [s.kind, s.col, s.digit]), [['result', 0, 1], ['carry', 1, 2], ['result', 1, 4], ['result', 2, 1]]);
  const game = findGame('multiplication-posee');
  for (const { level, q } of questions(game)) {
    const where = `niveau ${level} ${q.key}`;
    if (q.interaction === 'column') {
      const [a, b] = q.stage.rows;
      assert.equal(q.answer, a * b, where);
      assert.ok(b >= 2 && b <= 9, where);
      // en refaisant le calcul avec les chiffres posés, on retrouve le produit
      const result = q.stage.steps.filter((s) => s.kind === 'result').reduce((sum, s) => sum + s.digit * 10 ** s.col, 0);
      assert.equal(result, a * b, where);
      const carries = q.stage.steps.filter((s) => s.kind === 'carry').length;
      if (level === 4) assert.equal(carries, 0, where);
      if (level === 5 || level === 6) assert.ok(carries >= 1, where);
      assert.equal(String(a).length, level === 6 ? 3 : level >= 4 && level <= 5 ? 2 : String(a).length, where);
    } else if (q.interaction === 'keypad') {
      const [a, , b] = q.stage.parts;
      assert.equal(q.answer, a * b, where);
      assert.ok(String(q.answer + 1).length <= q.maxDigits, where);
    } else {
      const [a, b] = level === 3 || q.stage.type === 'sentence' ? numbersIn(q.text) : numbersIn(q.stage.text);
      assert.equal(q.answer, a * b, where);
    }
  }
});

test('la division : partage, groupements, quotient et reste justes', () => {
  const game = findGame('division');
  for (const { level, q } of questions(game)) {
    const where = `niveau ${level} ${q.key}`;
    if (q.interaction === 'keypad' && q.stage.parts[1] === '×') {
      const [b, , , , n] = q.stage.parts;
      assert.equal(q.answer * b, n, where);
    } else if (q.interaction === 'keypad') {
      const [n, , b] = q.stage.parts;
      assert.equal(q.answer * b, n, where);
    } else if (/reste/.test(q.text) && q.stage.type === 'sentence') {
      const [n, b] = numbersIn(q.text);
      assert.equal(q.answer, n % b, where);
      assert.ok(q.answer >= 1 && q.answer < b, where);
    } else {
      const [x, y] = numbersIn(q.stage.text);
      const [n, b] = x > y ? [x, y] : [y, x];
      const expected = /reste/.test(q.text) ? n % b : Math.floor(n / b);
      assert.equal(q.answer, expected, where);
      if (!/reste|complets|complètes/.test(q.text)) assert.equal(n % b, 0, `${where} : partage sans reste`);
    }
  }
});

test('périmètres et longueurs : unités, conversions et périmètres justes, dessin du polygone', () => {
  const game = findGame('perimetres');
  const ratio = { cm: 100, mm: 10, m: 1000 };
  for (const { level, q } of questions(game)) {
    const where = `niveau ${level} ${q.key}`;
    if (level === 1) assert.ok(['mm', 'cm', 'm', 'km'].includes(q.answer), where);
    if (level >= 2 && level <= 4) {
      const [a, b = 0] = numbersIn(q.stage.text);
      const small = q.stage.text.split('? ')[1];
      assert.equal(q.answer, a * ratio[small] + b, where);
    }
    if (level === 5) assert.equal(q.answer, Math.max(...q.choices.map((c) => c.value)), where);
    if (q.stage.type === 'drawing') {
      const { sides, shape, labels } = q.stage.drawing;
      assert.equal(q.answer, sides.reduce((a, b) => a + b, 0), where);
      if (shape === 'rect' || shape === 'carre') assert.equal(sides[0], sides[2], where);
      assert.ok(labels.length >= 1, where);
      const svg = ce2Svg(q.stage.drawing);
      assert.match(svg, /^<svg viewBox=/);
      for (const i of labels) assert.ok(svg.includes(`>${sides[i]} ${q.stage.drawing.unit}</text>`), where);
    }
  }
  // les problèmes : faire le tour, couper, mettre bout à bout
  for (const { q } of questions(game, [8])) {
    const [kind, ...rest] = q.key.split(':').slice(2);
    if (kind === 'tour') {
      const [L, l] = rest[0].split('x').map(Number);
      assert.equal(q.answer, 2 * (L + l), q.key);
    } else if (kind === 'couper') {
      const [m, cut] = rest[0].split('-').map(Number);
      assert.equal(q.answer, 100 * m - cut, q.key);
    } else {
      const [km, m1, m2] = rest[0].split('-').map(Number);
      assert.equal(q.answer, 1000 * km + m1 + m2, q.key);
    }
  }
  assert.equal(ce2Svg({ kind: 'feu' }), null);
});

test('l’imparfait : formes justes (mangeais, mangions, lançait…), une seule bonne réponse', () => {
  const forms = {
    'manger 0': 'mangeais', 'manger 3': 'mangions', 'lancer 2': 'lançait', 'lancer 3': 'lancions', 'jouer 5': 'jouaient',
    'être 0': 'étais', 'être 5': 'étaient', 'avoir 4': 'aviez', 'aller 3': 'allions', 'faire 3': 'faisions', 'dire 2': 'disait',
    'venir 5': 'venaient', 'pouvoir 1': 'pouvais', 'voir 3': 'voyions', 'vouloir 2': 'voulait', 'prendre 4': 'preniez',
  };
  for (const [key, form] of Object.entries(forms)) {
    const [verb, person] = key.split(' ');
    assert.equal(imparfait(verb, Number(person)), form, key);
  }
  const game = findGame('imparfait');
  const tenseOf = { présent: /\b(joue|chantes|regarde|dansons|dessinez|ramassent|écoute|ranges|prépare|plantons|lavez|grimpent)\b/ };
  for (const { level, q } of questions(game)) {
    const where = `niveau ${level} ${q.key}`;
    const labels = q.choices.map((c) => c.value);
    assert.equal(labels.filter((v) => v === q.answer).length, 1, where);
    if (level <= 5) {
      assert.match(q.stage.text, /… \(\S+\)/, where);
      assert.ok(q.success.speak.includes(q.answer), where);
      assert.ok(/(ais|ait|ions|iez|aient)$/.test(q.answer), where);
    }
    if (level === 6) assert.ok(['ais', 'ait', 'ions', 'iez', 'aient'].includes(q.answer), where);
    if (level === 7) {
      const s = q.stage.text;
      const expected = /\b(ai|as|a|avons|avez|ont) \S+é(?=[\s.])/.test(s) ? 'passé composé'
        : /(erai|eras|era|erons|erez|eront)\b/.test(s) ? 'futur'
          : /(ais|ait|ions|iez|aient)\b/.test(s) ? 'imparfait' : 'présent';
      assert.equal(q.answer, expected, `${where} : ${s}`);
      if (expected === 'présent') assert.match(s, tenseOf.présent, where);
    }
    if (level === 8) {
      const marker = q.stage.text.split(',')[0];
      const tense = { Autrefois: /(ais|ait|ions|iez|aient)$/, Demain: /(rai|ras|ra|rons|rez|ront)$/ }[marker];
      if (tense) assert.match(q.answer, tense, where);
      else assert.doesNotMatch(q.answer, /(ais|ait|ions|iez|aient|rai|ras|ra|rons|rez|ront)$/, where);
    }
  }
});

test('tous les jeux de chaque classe génèrent des questions à chaque niveau de leur fourchette', () => {
  for (const grade of ['PS', 'CE2']) {
    for (const { game, levels } of programFor(grade).flatMap((d) => d.games)) {
      for (const level of levels) {
        const q = game.generate(level, createRng(level), 0, CONTEXT);
        assert.ok(q.key && q.text && q.stage, `${grade} ${game.id} niveau ${level}`);
      }
    }
  }
});
