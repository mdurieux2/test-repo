// Accessibilité des interactions : niveaux d'écoute facultatifs (skipListening), toucher plutôt
// que glisser (tapOnly) et sous-titres (captions). La mise en page et les jeux joués au doigt (sans
// glisser) et au clavier sont vérifiés par le test de bout en bout (scripts/smoke.mjs).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAMES, findGame } from '../app/js/games/index.js';
import { PROGRAMS, programFor } from '../app/js/programs.js';
import { createRng } from '../app/js/random.js';
import {
  CAPTION_HIDDEN, DRAG_WORDS, captionPart, gameListenOnly, isListenOnly, levelListenOnly, playableQuestion, tapQuestion, tapText, withoutListenOnly,
} from '../app/js/a11y-jeux.js';
import { onCaption, setSpeechEnabled, speak } from '../app/js/speech.js';

const CONTEXT = { name: 'Lou', season: 'printemps' };
const SAMPLES = 40;

/** Nombre de questions qui ne se jouent qu'à l'oreille, sur SAMPLES tirées, pour chaque niveau. */
function listenCounts(game) {
  const out = {};
  for (let level = 1; level <= game.levels.length; level++) {
    const rng = createRng(1000 + level);
    let n = 0;
    for (let i = 0; i < SAMPLES; i++) if (isListenOnly(game.generate(level, rng, i, CONTEXT))) n++;
    if (n) out[level] = n;
  }
  return out;
}

// Les questions qui ne se jouent qu'à l'oreille (sur 40 tirées), jeu par jeu et niveau par niveau.
// 40 : tout le niveau. Si un jeu change, mettre à jour ce tableau en jugeant chaque question :
// si la consigne écrite (ou l'image) suffit pour répondre, ce n'est pas une question d'écoute.
const LISTEN_ONLY = {
  'syllabes-rythme': { 7: 40 }, // recoller des syllabes entendues
  lettres: { 1: 40, 2: 40, 3: 40 }, // la lettre entendue
  syllabes: { 1: 40, 2: 40, 3: 40, 4: 40, 5: 40, 6: 40, 8: 15 }, // la syllabe entendue ; un mot sans image
  'petits-mots': { 1: 40, 2: 40, 3: 40 }, // le mot entendu
  ponctuation: { 3: 40, 4: 40, 5: 40, 10: 22 }, // le signe d'après l'intonation
  dictee: { 5: 40, 6: 40, 7: 40, 8: 40 }, // la dictée sans image
  ecoute: { 1: 40, 2: 40, 3: 40, 4: 40, 5: 40, 6: 40, 7: 40, 8: 40, 9: 40, 10: 40 },
  'epelle-anglais': { 8: 40 },
  'compte-anglais': { 1: 40, 2: 40, 5: 40 },
  'nombres-anglais': { 1: 40, 2: 40, 4: 40, 5: 40, 6: 40 },
  'calcul-anglais': { 7: 40, 8: 40 }, // « écouter seulement », puis écrire le résultat entendu
  'couleurs-anglais': { 4: 40, 6: 40 }, // les couleurs à mélanger, entendues
  'contraires-anglais': { 3: 40, 5: 40, 7: 40 },
  'ou-est': { 1: 40, 2: 40, 4: 40, 6: 40, 7: 40, 8: 40 },
  'phrase-anglais': { 5: 40 },
  'parle-anglais': { 2: 19, 4: 40 }, // la question sans image ; la consigne entendue
};

test('écoute : nombre de questions qui ne se jouent qu’à l’oreille, jeu par jeu et niveau par niveau', () => {
  const actual = {};
  for (const game of GAMES) {
    const counts = listenCounts(game);
    if (Object.keys(counts).length) actual[game.id] = counts;
  }
  assert.deepEqual(actual, LISTEN_ONLY);
});

test('écoute : une question sans rien à voir (scène « écoute ») dit si elle se joue à l’oreille', () => {
  for (const game of GAMES) {
    for (let level = 1; level <= game.levels.length; level++) {
      const rng = createRng(level);
      for (let i = 0; i < 12; i++) {
        const q = game.generate(level, rng, i, CONTEXT);
        if (q.stage?.type === 'listen') assert.equal(typeof q.listenOnly, 'boolean', `${game.id} niveau ${level} : listenOnly manquant`);
        if (q.listenOnly !== undefined) assert.equal(typeof q.listenOnly, 'boolean', `${game.id} niveau ${level}`);
      }
    }
  }
  // les mots de l'intrus sont écrits : ce n'est pas une question d'écoute, même s'ils sont dits
  assert.equal(levelListenOnly(findGame('intrus-anglais'), 3), false);
});

test('écoute : les niveaux entiers, et les jeux masqués quand on écarte l’écoute', () => {
  assert.equal(levelListenOnly(findGame('lettres'), 1), true);
  assert.equal(levelListenOnly(findGame('lettres'), 4), false);
  assert.equal(levelListenOnly(findGame('parle-anglais'), 2), false); // une question sur deux a une image
  assert.equal(gameListenOnly(findGame('ecoute')), true);
  assert.equal(gameListenOnly(findGame('lettres')), false);
  assert.equal(gameListenOnly(findGame('lettres'), [1, 2, 3]), true);
  // classe par classe : les jeux qui disparaissent de l'accueil
  const hidden = {};
  for (const grade of Object.keys(PROGRAMS)) {
    const before = programFor(grade).flatMap((d) => d.games.map(({ game }) => game.id));
    const after = new Set(withoutListenOnly(programFor(grade)).flatMap((d) => d.games.map(({ game }) => game.id)));
    hidden[grade] = before.filter((id) => !after.has(id));
  }
  // (aux niveaux de la classe : au CP et au CE1, l'anglais est à l'oral seulement, donc ses jeux
  // d'écoute disparaissent tous ; au CE2, la dictée est sans image : elle ne se joue qu'à l'oreille)
  assert.deepEqual(hidden, {
    PS: ['ecoute', 'compte-anglais'],
    MS: ['ecoute', 'compte-anglais', 'ou-est'],
    GS: ['syllabes', 'ecoute', 'compte-anglais', 'ou-est', 'nombres-anglais'],
    CP: ['ecoute', 'compte-anglais', 'nombres-anglais', 'ou-est'],
    CE1: ['ecoute', 'compte-anglais', 'nombres-anglais', 'ou-est'],
    CE2: ['dictee', 'ecoute'],
  });
});

test('écoute : chaque jeu affiché reste jouable, à chaque niveau de chaque classe', () => {
  for (const grade of Object.keys(PROGRAMS)) {
    for (const { game, levels } of withoutListenOnly(programFor(grade)).flatMap((d) => d.games)) {
      for (const level of levels) {
        const rng = createRng(level * 31);
        const generate = (l, index) => game.generate(l, rng, index, CONTEXT);
        for (let k = 0; k < 4; k++) {
          const found = playableQuestion(generate, { level, levels, index: k * 13 });
          const where = `${grade} ${game.id} niveau ${level}`;
          assert.ok(!found.listenOnly && !isListenOnly(found.q), `${where} : pas de question jouable`);
          assert.ok(levels.includes(found.level), `${where} : niveau ${found.level} hors de la classe`);
          // un niveau qui a des questions à voir n'est jamais passé
          if (!levelListenOnly(game, level)) assert.equal(found.level, level, where);
        }
      }
    }
  }
});

test('écoute : un niveau entier à l’oreille est passé (le suivant, sinon le précédent)', () => {
  const syllabes = findGame('syllabes');
  const rng = createRng(5);
  const generate = (l, index) => syllabes.generate(l, rng, index, CONTEXT);
  const upTo = (n) => Array.from({ length: n }, (_, i) => i + 1);
  assert.equal(playableQuestion(generate, { level: 3, levels: upTo(8) }).level, 7);
  assert.equal(playableQuestion(generate, { level: 3, levels: upTo(6) }).listenOnly, true);
  // un niveau retiré pour la classe n'est jamais proposé à la place
  assert.equal(playableQuestion(generate, { level: 3, levels: [1, 2, 3, 4, 5, 6, 8] }).level, 8);
  const dictee = findGame('dictee');
  const fromDictee = (l, index) => dictee.generate(l, rng, index, CONTEXT);
  assert.equal(playableQuestion(fromDictee, { level: 6, levels: upTo(8) }).level, 4); // rien après : le précédent
  // une question d'un niveau mélangé : une autre du même niveau
  const ponctuation = findGame('ponctuation');
  const found = playableQuestion((l, index) => ponctuation.generate(l, rng, index, CONTEXT), { level: 10, levels: upTo(10) });
  assert.equal(found.level, 10);
  assert.equal(isListenOnly(found.q), false);
});

test('toucher plutôt que glisser : aucune consigne ne demande de glisser ou de tracer', () => {
  assert.equal(tapText('Glisse les nombres dans les cases.'), 'Touche une case, puis un nombre.');
  assert.equal(tapText('Trace un trait avec ton doigt, de chaque calcul jusqu’à son résultat.'), 'Touche chaque calcul, puis son résultat.');
  assert.equal(tapText('Écris la lettre bé. Suis le chemin avec ton doigt, en partant du point vert.'),
    'Écris la lettre bé. Touche les points du chemin, un par un, en partant du point vert.');
  assert.equal(tapText('Fais des patates : entoure des paquets de 2 pommes avec ton doigt. Ensuite, on comptera combien il y en a en tout.'),
    'Fais des paquets de 2 pommes : touche-les un par un. Ensuite, on comptera combien il y en a en tout.');
  const said = (parts) => [parts].flat(2).map((p) => (typeof p === 'string' ? p : p?.text || '')).join(' ');
  let changed = 0;
  for (const game of GAMES) {
    for (let level = 1; level <= game.levels.length; level++) {
      const rng = createRng(level + 7);
      for (let i = 0; i < 6; i++) {
        const q = game.generate(level, rng, i, CONTEXT);
        const tap = tapQuestion(q);
        const texts = [tap.text, said(tap.instruction), said(tap.replay), tap.short?.text, said(tap.short?.speak)].join(' ');
        assert.doesNotMatch(texts, DRAG_WORDS, `${game.id} niveau ${level} : « ${texts.match(DRAG_WORDS)?.[0]} »`);
        assert.equal(tap.answer, q.answer);
        if (tap.text !== q.text || said(tap.instruction) !== said(q.instruction)) changed++;
      }
    }
  }
  assert.ok(changed > 50, `${changed} consignes changées`);
  // sans le réglage, rien ne change : la question d'origine n'est pas modifiée
  const q = findGame('trous').generate(1, createRng(1), 0, CONTEXT);
  tapQuestion(q);
  assert.equal(q.text, 'Glisse les nombres dans les cases.');
});

test('sous-titres : ce que dit Estelle est annoncé, morceau par morceau, même voix coupée', async () => {
  const events = [];
  const stop = onCaption((e) => events.push(e));
  setSpeechEnabled(false);
  await speak(['Écoute bien, et touche :', { text: 'red', lang: 'en-GB' }]);
  stop();
  setSpeechEnabled(true);
  assert.equal(events.length, 2);
  assert.equal(events[0].type, 'start');
  assert.deepEqual(events[0].parts, [{ text: 'Écoute bien, et touche :', lang: undefined }, { text: 'red', lang: 'en-GB' }]);
  assert.equal(events[0].spoken, false);
  assert.deepEqual(events[1], { type: 'end', id: events[0].id, spoken: false });
  // sans abonné, rien n'est annoncé
  await speak('Bravo !');
  assert.equal(events.length, 2);
});

test('sous-titres : ce qu’il faut trouver à l’oreille n’est pas écrit (dictée, lettre, anglais, ponctuation)', () => {
  const said = (q) => [].concat(q.instruction).map((p) => (typeof p === 'string' ? { text: p } : p));
  for (const [id, level] of [['dictee', 1], ['lettres', 1], ['ecoute', 1], ['epelle-anglais', 1], ['phrase-anglais', 5], ['nombres-anglais', 1]]) {
    for (let i = 0; i < 10; i++) {
      const q = findGame(id).generate(level, createRng(i + 1), i, CONTEXT);
      const parts = said(q).map((p) => captionPart(p, q));
      assert.ok(parts.includes(CAPTION_HIDDEN), `${id} : ${parts.join(' / ')}`);
      if (typeof q.answer === 'string') assert.ok(!parts.some((t) => t.trim() === q.answer), `${id} : la réponse « ${q.answer} » est écrite`);
    }
  }
  // ponctuation : la phrase est écrite, sans le signe qu'il faut choisir
  for (let i = 0; i < 10; i++) {
    const q = findGame('ponctuation').generate(3, createRng(i + 1), i, CONTEXT);
    const parts = said(q).map((p) => captionPart(p, q));
    assert.ok(!parts.some((t) => /[a-zé] ?[.?!]$/.test(t) && !/^(Écoute|Quel)/.test(t)), parts.join(' / '));
  }
  // une consigne ordinaire, ou un mot à lire qui n'est pas la réponse, reste écrite
  const q = findGame('vocabulaire').generate(4, createRng(3), 0, CONTEXT);
  assert.deepEqual(said(q).map((p) => captionPart(p, q)), said(q).map((p) => p.text));
  assert.equal(captionPart({ text: 'Bravo !' }, null), 'Bravo !');
});
