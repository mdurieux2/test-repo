// Lot « vivre ensemble et se repérer » (rubrique « Le monde ») : Sécurité et vivre ensemble, et
// Se repérer. Chaque niveau est tiré 300 fois : la bonne réponse est juste (recalculée à partir du
// dessin quand il y en a un) et présente une seule fois parmi les choix.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOMAINS, findGame } from '../app/js/games/index.js';
import {
  BIKE, DANGERS, EMERGENCY, EMOTIONS, KINDNESS, MAGIC_WORDS, MOVERS, OTHERS, PLACES, RULES, SAFE, SIGNS, STREET, WHAT_IF,
  cellName, drawingSvg, follow,
} from '../app/js/games/vivre.js';
import { createRng } from '../app/js/random.js';

const IDS = ['vivre-ensemble', 'se-reperer'];

function draw(id, level, runs = 300, seed = 2468) {
  const rng = createRng(seed + level);
  return Array.from({ length: runs }, (_, i) => findGame(id).generate(level, rng, i, { name: 'Zoé' }));
}

const values = (q) => q.choices.map((c) => c.value);
const spoken = (q) => [q.instruction, q.success?.speak].flat(2).filter((p) => typeof p === 'string');

test('rubrique « Le monde », section « Vivre ensemble et se repérer »', () => {
  const monde = DOMAINS.find((d) => d.id === 'monde');
  for (const id of IDS) {
    const game = findGame(id);
    assert.ok(monde.games.includes(game), id);
    assert.equal(game.domain, 'monde');
    assert.equal(game.section, 'Vivre ensemble et se repérer');
  }
});

test('10 niveaux, libellés courts et tous différents', () => {
  for (const id of IDS) {
    const { levels } = findGame(id);
    assert.equal(levels.length, 10, id);
    assert.equal(new Set(levels).size, levels.length, `${id} : libellé en double`);
    for (const label of levels) assert.ok([...label].length <= 26, `${id} : « ${label} » trop long`);
  }
});

test('mêmes questions pour la même graine (generate reste pur)', () => {
  for (const id of IDS) {
    for (let level = 1; level <= 10; level++) assert.deepEqual(draw(id, level, 30), draw(id, level, 30), `${id} niveau ${level}`);
  }
});

test('une seule bonne réponse parmi les choix, consignes et phrases bien écrites', () => {
  for (const id of IDS) {
    for (let level = 1; level <= 10; level++) {
      for (const q of [...draw(id, level), findGame(id).generate(level, createRng(level))]) {
        const v = values(q);
        assert.ok(v.length >= 2 && v.length <= 4, q.key);
        assert.equal(new Set(v).size, v.length, `choix en double : ${q.key}`);
        assert.equal(v.filter((x) => x === q.answer).length, 1, `bonne réponse absente ou en double : ${q.key}`);
        assert.ok(q.text && q.instruction && q.stage?.type && q.success?.speak, q.key);
        for (const text of [q.text, ...spoken(q)]) {
          assert.ok(!/\b(de le|de les|à le|à les) /.test(text), `liaison oubliée : ${text}`);
          assert.ok(!/ {2}|\s[,.]/.test(text), `espace en trop : ${text}`);
          assert.ok(/[.!?…]$/.test(text), `phrase sans point final : ${text}`);
          assert.ok(!/'/.test(text), `apostrophe droite : ${text}`);
        }
        for (const c of q.choices) {
          const label = typeof c.label === 'string' ? c.label : '';
          // dans les boutons, pas de frenchSpacing : les espaces avant ? ! : sont insécables
          assert.ok(!/ [?!:;]/.test(label), `espace sécable avant la ponctuation : ${label}`);
          assert.ok([...label].length <= 26, `bouton trop long : ${label}`);
          if (!label) assert.ok(c.scene || c.drawing, `bouton sans contenu : ${q.key}`);
          if (c.drawing) assert.ok(c.name, `dessin sans nom : ${q.key}`);
        }
        if (q.stage.type === 'drawing') assert.ok(q.stage.label && drawingSvg(q.stage.drawing).startsWith('<svg'), q.key);
      }
    }
  }
});

test('les questions varient à chaque niveau', () => {
  for (const id of IDS) {
    for (let level = 1; level <= 10; level++) {
      const keys = new Set(draw(id, level, 60).map((q) => q.key));
      assert.ok(keys.size >= 4, `${id} niveau ${level} : seulement ${keys.size} questions différentes`);
    }
  }
});

// ---------------------------------------------------------------- Sécurité et vivre ensemble

test('vivre ensemble : données justes (émotions, mots magiques, situations)', () => {
  assert.deepEqual(Object.keys(EMOTIONS), ['content', 'triste', 'colere', 'peur']);
  assert.equal(new Set(Object.values(EMOTIONS).map((e) => e.emoji)).size, 4);
  for (const item of MAGIC_WORDS) {
    assert.ok(['Bonjour', 'Merci', 'S’il te plaît', 'Pardon', 'Au revoir'].includes(item.answer), item.text);
    assert.ok(item.wrong.length >= 2 && !item.wrong.includes(item.answer), item.text);
  }
  // une demande : jamais « merci » parmi les mauvaises réponses (on peut le dire après)
  for (const item of MAGIC_WORDS.filter((i) => i.answer === 'S’il te plaît')) assert.ok(!item.wrong.includes('Merci'), item.text);
  for (const list of [STREET, WHAT_IF, RULES, KINDNESS, BIKE]) {
    for (const item of list) {
      assert.equal(item.wrong.length, 2, item.text);
      assert.ok(!item.wrong.includes(item.answer), item.text);
      assert.ok(item.says, item.text);
    }
  }
  for (const item of OTHERS) {
    assert.ok(EMOTIONS[item.answer] && item.wrong.every((w) => EMOTIONS[w] && w !== item.answer), item.text);
    assert.ok(item.text.includes(item.who), item.text);
  }
  // les dangers et les objets sans danger ne se mélangent pas
  const names = [...DANGERS, ...SAFE].map((o) => o.name);
  assert.equal(new Set(names).size, names.length);
});

test('vivre ensemble : le feu des piétons (bonhomme rouge immobile en haut, vert qui marche en bas)', () => {
  let seen = 0;
  for (const q of [...draw('vivre-ensemble', 3), ...draw('vivre-ensemble', 10)]) {
    if (q.stage.drawing?.kind !== 'feu') continue;
    seen++;
    const { state } = q.stage.drawing;
    assert.equal(q.answer, state === 'rouge' ? 'J’attends' : 'Je traverse', q.key);
    assert.match(q.stage.label, state === 'rouge' ? /rouge, immobile/ : /vert, qui marche/);
  }
  assert.ok(seen > 20);
  // le dessin : la forme change avec la couleur (bras le long du corps / jambes écartées)
  assert.notEqual(drawingSvg({ kind: 'feu', state: 'rouge' }), drawingSvg({ kind: 'feu', state: 'vert' }));
});

test('vivre ensemble : les numéros d’urgence (15 SAMU, 17 police, 18 pompiers, 112 européen)', () => {
  assert.equal(EMERGENCY[15].who, 'le SAMU');
  assert.equal(EMERGENCY[17].who, 'la police');
  assert.equal(EMERGENCY[18].who, 'les pompiers');
  const asked = new Set();
  for (const q of draw('vivre-ensemble', 6, 500)) {
    asked.add(q.answer);
    if (q.answer === 112) {
      assert.match(q.text, /Europe/);
      continue;
    }
    // le 112 marche pour tout : il n'est jamais proposé quand on attend le 15, le 17 ou le 18
    assert.ok(!values(q).includes(112), q.key);
    if (/feu|pompiers/.test(q.text)) assert.equal(q.answer, 18, q.text);
    if (/police/.test(q.text)) assert.equal(q.answer, 17, q.text);
    if (/SAMU/.test(q.text)) assert.equal(q.answer, 15, q.text);
    const n = Number(q.text.match(/le (\d+) \?/)?.[1]);
    if (n) assert.equal(q.answer, EMERGENCY[n].who, q.text);
  }
  for (const a of [15, 17, 18, 112, 'le SAMU', 'la police', 'les pompiers']) assert.ok(asked.has(a), String(a));
});

test('vivre ensemble : dangers, émotions des autres, panneaux', () => {
  for (const q of draw('vivre-ensemble', 4)) {
    const safe = /pas dangereux/.test(q.text);
    const isDanger = (v) => DANGERS.some((d) => d.name === v);
    assert.equal(values(q).filter(isDanger).length, safe ? 2 : 1, q.key);
    assert.equal(isDanger(q.answer), !safe, q.key);
  }
  for (const q of draw('vivre-ensemble', 8)) {
    const item = OTHERS.find((o) => q.text === `${o.text} Comment se sent ${o.who} ?`);
    if (!item) continue;
    assert.equal(q.answer, item.answer, q.text);
    assert.ok(q.choices.every((c) => EMOTIONS[c.value]), q.text);
  }
  for (const q of draw('vivre-ensemble', 9)) {
    if (!SIGNS[q.answer]) continue;
    for (const v of values(q)) assert.ok(SIGNS[v], v);
    if (q.stage.type === 'drawing') assert.equal(q.stage.drawing.sign, q.answer);
    else assert.ok(q.text.includes(SIGNS[q.answer].label), q.text);
  }
  for (const [id, sign] of Object.entries(SIGNS)) {
    assert.ok(sign.label && sign.says && sign.code, id);
    assert.ok([...sign.label].length <= 26, sign.label);
  }
});

// ---------------------------------------------------------------- Se repérer

test('se repérer : sur, sous, dans ; devant, derrière', () => {
  for (const q of draw('se-reperer', 1)) {
    const wanted = { on: 'sur la table', under: 'sous la table', in: 'dans le panier' }[q.answer];
    assert.ok(q.text.endsWith(`${wanted}.`), q.text);
    assert.equal(q.choices.find((c) => c.value === q.answer).scene.where, q.answer);
  }
  for (const q of draw('se-reperer', 2)) {
    const right = q.choices.find((c) => c.value === q.answer);
    assert.equal(right.drawing.where === 'devant' ? 'devant' : 'derrière', q.text.match(/(devant|derrière) la boîte/)[1], q.text);
  }
});

test('se repérer : à gauche ou à droite de l’arbre (dans l’image)', () => {
  for (const q of draw('se-reperer', 3)) {
    const { items } = q.stage;
    const tree = items.indexOf('🌳');
    if (q.answer === 'gauche' || q.answer === 'droite') {
      const pet = items.find((x) => x !== '🌳');
      assert.equal(items.indexOf(pet) < tree ? 'gauche' : 'droite', q.answer, q.key);
    } else {
      const left = /à gauche/.test(q.text);
      const emoji = q.choices.find((c) => c.value === q.answer).label;
      assert.equal(items.indexOf(emoji), left ? tree - 1 : tree + 1, q.key);
    }
  }
});

test('se repérer : la main gauche a le pouce à droite (vue de dos), la main droite est son reflet', () => {
  const left = drawingSvg({ kind: 'main', side: 'gauche' });
  const right = drawingSvg({ kind: 'main', side: 'droite' });
  assert.ok(!left.includes('scale(-1 1)') && right.includes('scale(-1 1)'));
  // le pouce (tourné vers la droite) est dessiné à droite de la paume, côté x > 72
  assert.match(left, /rotate\(38 70 84\)/);
  for (const q of draw('se-reperer', 4)) {
    if (q.stage.type === 'drawing') assert.equal(q.stage.drawing.side, q.answer);
    else assert.equal(q.choices.find((c) => c.value === q.answer).drawing.side, q.answer);
    assert.ok(q.text.includes(q.answer) || /gauche ou la main droite/.test(q.text), q.text);
  }
});

test('se repérer : entre et à côté de', () => {
  const nameOf = (q, emoji) => q.choices.find((c) => c.label === emoji)?.value;
  for (const q of draw('se-reperer', 5)) {
    const { items } = q.stage;
    const i = items.indexOf(q.choices.find((c) => c.value === q.answer).label);
    if (q.text.startsWith('Qui est entre')) {
      assert.ok(i === 1 || i === 2, q.key);
      assert.equal(q.text, `Qui est entre ${nameOf(q, items[i - 1])} et ${nameOf(q, items[i + 1])} ?`);
    } else {
      // l'animal du bout n'a qu'un voisin, et les autres choix ne le touchent pas
      const end = i === 1 ? 0 : 3;
      assert.ok(i === 1 || i === 2, q.key);
      for (const c of q.choices) if (c.value !== q.answer) assert.ok(Math.abs(items.indexOf(c.label) - end) > 1, q.key);
    }
  }
});

test('se repérer : suivre les flèches mène à la bonne image, et à une seule', () => {
  for (const q of [...draw('se-reperer', 6), ...draw('se-reperer', 10).filter((x) => x.stage.drawing?.moves)]) {
    const { cols, rows, cells, start, moves } = q.stage.drawing;
    const end = follow(start, moves, cols, rows);
    assert.notEqual(end, null, q.key);
    const emoji = q.choices.find((c) => c.value === q.answer).label;
    assert.equal(cells[end], emoji, q.key);
    for (const c of q.choices) assert.equal(cells.filter((x) => x === c.label).length, 1, `${c.label} absent ou en double : ${q.key}`);
    assert.ok(MOVERS.some((m) => m.emoji === cells[start]), q.key);
  }
});

test('se repérer : lire un plan (colonnes A à D, lignes 1 à 3)', () => {
  assert.equal(cellName(0, 4), 'A1');
  assert.equal(cellName(5, 4), 'B2');
  assert.equal(cellName(11, 4), 'D3');
  for (const q of draw('se-reperer', 7)) {
    const { cols, cells } = q.stage.drawing;
    if (/^Où est/.test(q.text)) {
      const place = PLACES.find((p) => q.text.includes(p.name));
      const cell = cells.indexOf(place.emoji);
      assert.equal(q.answer, cellName(cell, cols), q.text);
    } else {
      const name = q.text.match(/case ([A-D][1-3])/)[1];
      const cell = 'ABCD'.indexOf(name[0]) + (Number(name[1]) - 1) * cols;
      assert.equal(PLACES.find((p) => p.name === q.answer).emoji, cells[cell], q.text);
    }
  }
});

test('se repérer : sa gauche et sa droite (de face, c’est l’inverse de l’écran ; de dos, pareil)', () => {
  for (const q of draw('se-reperer', 8)) {
    const { view, at } = q.stage.drawing;
    const expected = view === 'dos' ? at : { gauche: 'droite', droite: 'gauche' }[at];
    assert.equal(q.answer, expected, q.key);
    assert.match(q.text, view === 'face' ? /te regarde/ : /te tourne le dos/);
  }
});

test('se repérer : coder un déplacement, un seul chemin arrive au but', () => {
  for (const q of draw('se-reperer', 9)) {
    const { cols, rows, cells, start } = q.stage.drawing;
    const mover = MOVERS.find((m) => m.emoji === cells[start]);
    const goal = cells.indexOf(mover.goal);
    assert.equal(q.choices.length, 3, q.key);
    for (const c of q.choices) {
      const end = follow(start, c.drawing.moves, cols, rows);
      assert.notEqual(end, null, `chemin hors du quadrillage : ${q.key}`);
      assert.equal(end === goal, c.value === q.answer, q.key);
      assert.equal(c.value, c.drawing.moves.join(''));
    }
  }
});
