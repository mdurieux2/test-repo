// Lot « techno » : « L'électricité » et « Objets et machines », rubrique Sciences, section
// « La matière et les objets ». Chaque niveau est tiré 200 fois : la bonne réponse est présente une
// seule fois parmi les choix, et elle est juste (recalculée à partir des listes, vérifiées à la main).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOMAINS, findGame } from '../app/js/games/index.js';
import {
  BUILDS, CHOOSE, CIRCUITS, CONDUCTORS, DANGERS, ELECTRIC, ENERGY_USES, INSULATORS, LIFTING, MATTERS, NOT_ELECTRIC,
  NOT_ROLLING, PARTS, POWER, ROUND, SAVING, THEN_NOW, USES, WEIGHTS, WHEELED, technoSvg,
} from '../app/js/games/techno.js';
import { createRng } from '../app/js/random.js';

const IDS = ['electricite', 'objets'];

/** 200 questions tirées à ce niveau, avec le prénom de l'enfant. */
function draw(id, level, runs = 200, seed = 1357) {
  const rng = createRng(seed + level);
  return Array.from({ length: runs }, (_, i) => findGame(id).generate(level, rng, i, { name: 'Zoé' }));
}

/** Tout ce qui est écrit ou dit dans une question. */
function sentences(q) {
  const out = [q.text];
  const push = (p) => (Array.isArray(p) ? p.forEach(push) : typeof p === 'string' && out.push(p));
  push(q.instruction);
  push(q.success?.speak);
  return out.filter(Boolean);
}

const names = (list) => list.map((it) => it.name);

test('techno : rubrique Sciences, section « La matière et les objets », après « La matière », 10 niveaux', () => {
  const sciences = DOMAINS.find((d) => d.id === 'sciences');
  const ids = sciences.games.map((g) => g.id);
  // dans la section « La matière et les objets », après « La matière »
  assert.ok(ids.indexOf('electricite') > ids.indexOf('matiere') && ids.indexOf('objets') > ids.indexOf('electricite'), ids.join(', '));
  for (const id of IDS) {
    const game = findGame(id);
    assert.equal(game.domain, 'sciences');
    assert.equal(game.section, 'La matière et les objets');
    assert.equal(game.levels.length, 10, id);
    assert.equal(new Set(game.levels).size, game.levels.length, `${id} : libellé en double`);
    for (const label of game.levels) {
      assert.ok([...label].length <= 26, `${id} : « ${label} » trop long`);
      assert.ok(!label.includes("'"), label);
    }
  }
});

test('techno : bonne réponse présente une seule fois, choix tous différents, images nommées', () => {
  for (const id of IDS) {
    for (let level = 1; level <= 10; level++) {
      for (const q of draw(id, level)) {
        assert.ok(q.key && q.text && q.instruction && q.stage?.type, q.key);
        if (q.interaction === 'order') {
          const values = q.items.map((it) => it.value);
          assert.ok(values.length >= 3, q.key);
          assert.deepEqual([...values].sort(), values.map((_, i) => i), q.key);
          assert.ok(values.some((v, i) => v !== i), `déjà rangé : ${q.key}`);
          assert.ok(q.items.every((it) => it.emoji && it.label && it.caption), q.key);
          assert.equal(new Set(q.items.map((it) => it.emoji)).size, values.length, `images en double : ${q.key}`);
          continue;
        }
        assert.equal(q.interaction, undefined, q.key);
        const values = q.choices.map((c) => c.value);
        assert.ok(values.length >= 2 && values.length <= 3, q.key);
        assert.equal(new Set(values).size, values.length, `choix en double : ${q.key}`);
        assert.equal(values.filter((v) => v === q.answer).length, 1, `bonne réponse absente ou en double : ${q.key}`);
        for (const c of q.choices) {
          // une image (emoji ou dessin) a toujours un nom pour les lecteurs d'écran
          if (c.drawing || /\p{Extended_Pictographic}/u.test(c.label) && !/\s/.test(c.label)) assert.ok(c.name, `image sans nom : ${q.key}`);
          if (c.drawing) assert.ok(technoSvg(c.drawing)?.startsWith('<svg'), q.key);
          else assert.ok([...c.label].length <= 18, `choix trop long : ${c.label}`);
          assert.ok(!/["\\]/.test(String(c.value)), c.value);
        }
        assert.equal(new Set(q.choices.map((c) => c.name || c.label)).size, values.length, `images en double : ${q.key}`);
        if (q.stage.type === 'drawing') {
          assert.ok(q.stage.label, `dessin sans nom : ${q.key}`);
          assert.ok(technoSvg(q.stage.drawing)?.startsWith('<svg'), q.key);
        }
      }
    }
  }
});

test('techno : mêmes questions pour la même graine, et des questions variées à chaque niveau', () => {
  for (const id of IDS) {
    for (let level = 1; level <= 10; level++) {
      assert.deepEqual(draw(id, level, 30, 77), draw(id, level, 30, 77), `${id} niveau ${level}`);
      const keys = new Set(draw(id, level, 60).map((q) => q.key));
      assert.ok(keys.size >= 4, `${id} niveau ${level} : ${keys.size} questions différentes`);
    }
  }
});

test('techno : français soigné (apostrophes, phrases entières, ni emoji ni prénom dans les phrases)', () => {
  for (const id of IDS) {
    for (let level = 1; level <= 10; level++) {
      for (const q of draw(id, level, 80)) {
        for (const s of sentences(q)) {
          assert.ok(!s.includes("'"), `apostrophe droite : ${s}`);
          assert.ok(!s.includes('...'), `points de suspension : ${s}`);
          assert.ok(!/ {2}|\s$|^\s/.test(s), `espaces : ${s}`);
          assert.ok(!/[\u00a0\u202f]/.test(s), `espace insécable écrite à la main : ${s}`);
          assert.ok(!/\S[?!:;]/.test(s), `espace manquante avant la ponctuation : ${s}`);
          assert.ok(!/(^|\s)(de le|de les|à le|à les) /i.test(s), `liaison : ${s}`);
          assert.ok(/^[A-ZÀÂÉÈÊÎÔÙÇŒ]/.test(s), `majuscule : ${s}`);
          assert.ok(/[.!?…]$/.test(s), `ponctuation finale : ${s}`);
          assert.ok(!/\p{Extended_Pictographic}/u.test(s), `emoji dans une phrase : ${s}`);
          assert.ok(!s.includes('Zoé'), 'prénom inutile');
        }
      }
    }
  }
});

// ------------------------------------------------------------------ L'électricité : données justes

test('électricité, niveaux 1 et 2 : électrique ou pas, pile ou prise', () => {
  const electric = names(ELECTRIC);
  const not = names(NOT_ELECTRIC);
  assert.ok(!electric.some((n) => not.includes(n)));
  for (const n of ['le vélo', 'les ciseaux']) assert.ok(not.includes(n), n);
  for (const n of ['l’ampoule', 'la lampe de poche']) assert.ok(electric.includes(n), n);
  // ni trottinette, ni téléphone (rechargé), ni brosse à dents : ils existent avec et sans électricité
  for (const word of ['trottinette', 'téléphone', 'brosse']) assert.ok(![...electric, ...not].some((n) => n.includes(word)), word);
  for (const q of draw('electricite', 1)) {
    const wantsElectric = q.text.includes('à l’électricité');
    const [yes, no] = wantsElectric ? [electric, not] : [not, electric];
    assert.ok(yes.includes(q.answer), q.key);
    for (const c of q.choices) if (c.value !== q.answer) assert.ok(no.includes(c.value), q.key);
  }
  assert.equal(POWER.find((p) => p.text.startsWith('La lampe de poche')).answer, 'pile');
  assert.equal(POWER.find((p) => p.text.startsWith('Le grille-pain')).answer, 'prise');
  for (const q of draw('electricite', 2)) {
    assert.deepEqual(q.choices.map((c) => c.value), ['pile', 'prise']);
    assert.equal(q.answer, POWER.find((p) => p.text === q.text).answer);
  }
});

test('électricité, niveaux 3 et 4 : les dangers, économiser', () => {
  const expected = {
    'On ne met jamais les doigts dans une prise.': 'vrai',
    'Pour débrancher un appareil, on tire sur le fil.': 'faux',
    'On peut toucher un appareil électrique avec les mains mouillées.': 'faux',
    'On peut mettre une petite pile dans sa bouche.': 'faux',
  };
  for (const [text, answer] of Object.entries(expected)) assert.equal(DANGERS.find((d) => d.text === text).answer, answer, text);
  for (const q of draw('electricite', 3)) {
    const item = DANGERS.find((d) => q.text === `${d.text} Vrai ou faux ?`);
    assert.equal(q.answer, item.answer);
    assert.equal(q.success.speak[0], item.answer === 'vrai' ? 'C’est vrai !' : 'C’est faux !');
  }
  assert.equal(SAVING.find((s) => s.text.includes('éteins la lumière')).saves, true);
  assert.equal(SAVING.find((s) => s.text.includes('réfrigérateur')).saves, false);
  for (const q of draw('electricite', 4)) {
    const item = SAVING.find((s) => q.text.startsWith(s.text));
    assert.equal(q.answer, item.saves ? 'oui' : 'non', q.text);
  }
});

test('électricité, niveaux 5 à 8 : le circuit, l’ampoule, l’interrupteur', () => {
  for (const q of draw('electricite', 5)) {
    const part = PARTS.find((p) => p.part === q.answer);
    assert.ok(q.text === part.ask || q.text === `Touche ${part.name}.`, q.text);
    // le dessin montre le circuit complet, ampoule allumée (avec ses rayons)
    assert.equal(q.stage.drawing.lit, true);
  }
  // seul le circuit branché sur les deux bornes, sans interrupteur ouvert, allume l'ampoule
  assert.deepEqual(Object.keys(CIRCUITS).filter((k) => CIRCUITS[k].lights), ['ok']);
  for (const q of draw('electricite', 6)) {
    assert.equal(q.answer, CIRCUITS[q.stage.drawing.state].lights ? 'oui' : 'non', q.key);
    assert.ok(!q.stage.drawing.lit, 'on ne montre pas la réponse');
  }
  for (const q of draw('electricite', 7)) {
    const lights = (c) => c.drawing.state === 'ok' && c.drawing.sw !== 'open';
    assert.equal(q.choices.filter(lights).length, 1, q.key);
    assert.equal(q.answer, q.choices.find(lights).value);
  }
  for (const q of draw('electricite', 8)) {
    const { sw, lit } = q.stage.drawing;
    if (q.text === 'L’ampoule va-t-elle s’allumer ?') {
      assert.equal(q.answer, sw === 'closed' ? 'oui' : 'non');
      assert.ok(!lit);
    } else {
      // allumée = interrupteur fermé ; pour éteindre, on l'ouvre
      assert.equal(lit, sw === 'closed');
      assert.equal(q.answer, sw === 'closed' ? 'ouvrir' : 'fermer', q.text);
      assert.match(q.text, sw === 'closed' ? /éteindre/ : /allumer/);
    }
  }
});

test('électricité, niveau 9 : conducteurs (métal) et isolants, sans cas ambigu', () => {
  const all = [...CONDUCTORS, ...INSULATORS].map((o) => o.name).join(' ');
  for (const word of ['eau', 'crayon', 'mine', 'main', 'ciseaux', 'corps']) assert.ok(!new RegExp(`\\b${word}\\b`).test(all), word);
  for (const o of INSULATORS) assert.ok(['le bois', 'le plastique', 'le caoutchouc', 'la laine', 'le papier'].includes(o.matter), o.name);
  for (const q of draw('electricite', 9)) {
    if (q.stage.type === 'drawing') {
      const item = [...CONDUCTORS, ...INSULATORS].find((o) => o.emoji === q.stage.drawing.gap);
      assert.ok(q.text.startsWith(`On met ${item.name} entre les deux fils.`), q.text);
      assert.equal(q.answer, CONDUCTORS.includes(item) ? 'oui' : 'non');
      continue;
    }
    const metal = !q.text.includes('ne laisse pas');
    const [yes, no] = metal ? [CONDUCTORS, INSULATORS] : [INSULATORS, CONDUCTORS];
    assert.ok(yes.some((o) => o.name === q.answer), q.key);
    for (const c of q.choices) if (c.value !== q.answer) assert.ok(no.some((o) => o.name === c.value), q.key);
  }
});

test('électricité : le circuit dessiné, lisible sans la couleur', () => {
  const lit = technoSvg({ kind: 'circuit', state: 'ok', lit: true });
  const off = technoSvg({ kind: 'circuit', state: 'ok' });
  // l'ampoule allumée a des rayons (des traits) en plus de sa couleur
  assert.ok((lit.match(/<line /g) || []).length >= (off.match(/<line /g) || []).length + 5);
  // la pile porte + et −
  assert.ok(off.includes('>+<') && off.includes('>−<'));
  // fil débranché ou coupé : des embouts de fil libres
  for (const state of ['open', 'openPile', 'cut']) assert.ok(technoSvg({ kind: 'circuit', state }).includes(`r="4.5"`), state);
  // interrupteur ouvert ou fermé : la lame n'est pas au même endroit
  assert.notEqual(technoSvg({ kind: 'circuit', state: 'ok', sw: 'open' }), technoSvg({ kind: 'circuit', state: 'ok', sw: 'closed' }));
  assert.equal(technoSvg({ kind: 'feu' }), null, 'les dessins des autres jeux ne sont pas pris');
});

// ------------------------------------------------------------------ Objets et machines : données justes

test('objets, niveaux 1 à 3 : l’usage, ce qui roule, avant et aujourd’hui', () => {
  for (const q of draw('objets', 1)) {
    const tool = USES.find((t) => t.ask === q.text);
    assert.equal(q.answer, tool.name);
    // jamais les ciseaux et la scie ensemble (les deux coupent)
    assert.ok(!(q.choices.some((c) => c.value === 'les ciseaux') && q.choices.some((c) => c.value === 'la scie')), q.key);
  }
  const wheeled = names(WHEELED);
  const round = names(ROUND);
  const still = names(NOT_ROLLING);
  for (const q of draw('objets', 2)) {
    const wanted = q.text === 'Touche ce qui roule.' ? [...wheeled, ...round] : wheeled;
    assert.ok(wanted.includes(q.answer), q.key);
    for (const c of q.choices) if (c.value !== q.answer) assert.ok(!wanted.includes(c.value) && [...round, ...still].includes(c.value), q.key);
  }
  for (const q of draw('objets', 3)) {
    if (q.text === 'Touche l’objet d’autrefois.') {
      assert.ok(THEN_NOW.some((p) => p.old.name === q.answer), q.key);
      for (const c of q.choices) if (c.value !== q.answer) assert.ok(THEN_NOW.some((p) => p.now.name === c.value), q.key);
      continue;
    }
    const pair = THEN_NOW.find((p) => p.text === q.text);
    assert.equal(q.answer, pair.now.name);
    assert.equal(q.stage.emoji, pair.old.emoji);
  }
});

test('objets, niveaux 4 et 5 : monter un objet dans l’ordre, l’énergie', () => {
  for (const b of BUILDS) {
    assert.ok(b.steps.length >= 3 && b.steps.length <= 4, b.title);
    for (const [, caption] of b.steps) assert.ok(caption.length <= 20, caption);
  }
  for (const q of draw('objets', 4)) {
    const build = BUILDS.find((b) => q.text.startsWith(b.title));
    for (const it of q.items) assert.deepEqual(build.steps[it.value], [it.emoji, it.label]);
  }
  const energyOf = Object.fromEntries(ENERGY_USES.map((e) => [e.text, e.answer]));
  assert.equal(energyOf['Qu’est-ce qui fait avancer le vélo ?'], 'muscles');
  assert.equal(energyOf['Qu’est-ce qui fait avancer le voilier ?'], 'vent');
  assert.equal(energyOf['Qu’est-ce qui fait marcher la télévision ?'], 'electricite');
  for (const q of draw('objets', 5)) {
    const item = ENERGY_USES.find((e) => e.text === q.text);
    assert.equal(q.answer, item.answer);
    if (item.also) assert.ok(!q.choices.some((c) => c.value === item.also), `deux bonnes réponses : ${q.key}`);
    // toujours dans le même ordre : la phrase lue ne change pas
    const order = ['muscles', 'electricite', 'vent', 'soleil'];
    assert.deepEqual(q.choices.map((c) => c.value), order.filter((e) => q.choices.some((c) => c.value === e)));
  }
});

test('objets, niveau 6 : la balance penche du côté le plus lourd, le levier', () => {
  for (const q of draw('objets', 6)) {
    if (q.stage.type === 'balance') {
      const [left, right] = [q.stage.left, q.stage.right].map((e) => WEIGHTS.find((w) => w.emoji === e));
      assert.ok(Math.abs(left.w - right.w) >= 3, q.key);
      assert.equal(q.stage.heavier, left.w > right.w ? 'left' : 'right');
      const heavy = left.w > right.w ? left : right;
      const light = heavy === left ? right : left;
      assert.equal(q.answer, q.text.includes('lourd') ? heavy.name : light.name, q.key);
      continue;
    }
    const { mode, mirror } = q.stage.drawing;
    // les lettres A, B, C vont de gauche à droite ; le rocher est à gauche (ou à droite si mirror)
    // appui : le plus loin de la cale, donc du côté opposé au rocher ; cale : le plus près du rocher
    const rockSide = mirror ? 'C' : 'A';
    const farSide = mirror ? 'A' : 'C';
    assert.equal(q.answer, mode === 'appui' ? farSide : rockSide, q.key);
  }
});

test('objets, niveaux 7 à 9 : le matériau, la poulie, les engrenages', () => {
  for (const item of CHOOSE) {
    assert.ok(MATTERS.includes(item.answer) && item.others.every((m) => MATTERS.includes(m) && m !== item.answer), item.text);
  }
  assert.equal(CHOOSE.find((c) => c.text.includes('vitre')).answer, 'verre');
  assert.equal(CHOOSE.find((c) => c.text.includes('manteau de pluie')).answer, 'plastique');
  for (const q of draw('objets', 7)) {
    const item = CHOOSE.find((c) => c.text === q.text);
    assert.equal(q.answer, item.answer);
    const values = q.choices.map((c) => c.value);
    assert.deepEqual(values, MATTERS.filter((m) => values.includes(m)));
  }
  for (const q of draw('objets', 8)) {
    if (q.stage.type === 'drawing') {
      assert.equal(q.answer, q.stage.drawing.pull === 'bas' ? 'il monte' : 'il descend', q.key);
      continue;
    }
    assert.equal(q.answer, LIFTING.find((l) => l.text === q.text).answer);
  }
  for (const q of draw('objets', 9)) {
    const { count, clockwise } = q.stage.drawing;
    assert.ok(count === 2 || count === 3);
    const turnsLikeA = (w) => w === 'C'; // A et B se touchent : sens contraire ; C touche B : comme A
    const asked = q.text.match(/roues A et ([BC])/);
    if (asked) {
      assert.equal(q.answer, turnsLikeA(asked[1]) ? 'oui' : 'non', q.text);
      continue;
    }
    const wheel = q.text.match(/la roue ([BC]) \?/)[1];
    assert.ok(wheel !== 'C' || count === 3, q.text);
    const cw = turnsLikeA(wheel) ? clockwise : !clockwise;
    assert.equal(q.answer, cw ? 'horaire' : 'inverse', q.text);
  }
});
