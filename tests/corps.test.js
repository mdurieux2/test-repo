// Lot « corps et milieux » : « Le corps humain » et « Les animaux et leur milieu », dans la rubrique
// « Sciences », section « Le vivant ». Chaque niveau est tiré 200 fois : la bonne réponse est présente
// une seule fois, et elle est juste (recalculée à partir des listes, écrites et vérifiées à la main).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOMAINS, findGame } from '../app/js/games/index.js';
import {
  AGES, AWAKE, BITES, BODY_VIEWS, BONES, BREATHING, CHAINS, CLASSES, CLUES, DIETS, DIGESTION, DWELLERS, EATERS, FOOD_PATH,
  HEART, INSECTS, INVERTEBRATES, JOINT_SPOTS, JOINT_USES, JOINTS, LEG_COUNTS, MEMBERS, MILK_TEETH, MOVERS, MOVES, NEED_CASES,
  NEEDS, NOT_INSECTS, ORGANS, PLACES, TEETH, VERTEBRATES, WINTER, bodySvg,
} from '../app/js/games/corps.js';
import { createRng } from '../app/js/random.js';

const IDS = ['corps', 'milieux'];

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

/** Les parties à toucher d'un dessin. */
const zonesOf = (view) => new Set([...bodySvg(view).matchAll(/data-zone="([^"]+)"/g)].map((m) => m[1]));

test('corps et milieux : rubrique « Sciences », section « Le vivant », après « Le vivant », 7 à 10 niveaux', () => {
  const sciences = DOMAINS.find((d) => d.id === 'sciences');
  // les sciences du CM en tête (seulement au CM1 et au CM2), puis le vivant, le corps et les milieux
  assert.deepEqual(sciences.games.map((g) => g.id).slice(0, 4), ['sciences-cm', 'vivant', 'corps', 'milieux']);
  for (const id of IDS) {
    const game = findGame(id);
    assert.ok(game, `${id} absent de index.js`);
    assert.equal(game.domain, 'sciences');
    assert.equal(game.section, 'Le vivant');
    assert.ok(game.levels.length >= 7 && game.levels.length <= 10, `${id} : ${game.levels.length} niveaux`);
    assert.equal(new Set(game.levels).size, game.levels.length, `${id} : libellé en double`);
    for (const label of game.levels) assert.ok([...label].length <= 26, `${id} : « ${label} » trop long`);
  }
});

test('corps et milieux : bonne réponse présente une seule fois, choix tous différents', () => {
  for (const id of IDS) {
    for (let level = 1; level <= findGame(id).levels.length; level++) {
      for (const q of draw(id, level)) {
        if (q.interaction === 'order') {
          const values = q.items.map((it) => it.value);
          assert.ok(values.length >= 3, q.key);
          assert.deepEqual([...values].sort(), values.map((_, i) => i), q.key);
          assert.ok(values.some((v, i) => v !== i), `déjà rangé : ${q.key}`);
          assert.ok(q.items.every((it) => it.emoji && it.label), q.key);
          assert.equal(new Set(q.items.map((it) => it.label)).size, values.length, q.key);
          continue;
        }
        if (q.interaction === 'body') {
          // les parties nommées sont toutes sur le dessin, la (ou les) bonne(s) parmi elles
          const zones = zonesOf(q.stage.view);
          const values = q.choices.map((c) => c.value);
          assert.deepEqual([...zones].sort(), [...values].sort(), q.key);
          for (const step of q.sequence || [q.answer]) assert.ok(values.includes(step), q.key);
          assert.ok(q.choices.every((c) => c.name), q.key);
          continue;
        }
        assert.equal(q.interaction, undefined, q.key);
        const values = q.choices.map((c) => c.value);
        assert.ok(values.length >= 2 && values.length <= 3, q.key);
        assert.equal(new Set(values).size, values.length, `choix en double : ${q.key}`);
        assert.equal(values.filter((v) => v === q.answer).length, 1, `bonne réponse absente ou en double : ${q.key}`);
        assert.equal(new Set(q.choices.map((c) => c.label)).size, values.length, `images en double : ${q.key}`);
        // une image seule a un nom (lecteurs d'écran)
        if (q.choiceStyle === 'pictures' || q.choiceStyle === 'steps') assert.ok(q.choices.every((c) => c.name), q.key);
        for (const v of values) assert.ok(!/["\\]/.test(String(v)), v);
      }
    }
  }
});

test('corps et milieux : mêmes questions pour la même graine (generate reste pur)', () => {
  for (const id of IDS) {
    for (let level = 1; level <= findGame(id).levels.length; level++) {
      assert.deepEqual(draw(id, level, 30, 77), draw(id, level, 30, 77), `${id} niveau ${level}`);
    }
  }
});

test('corps et milieux : les questions varient à chaque niveau', () => {
  for (const id of IDS) {
    for (let level = 1; level <= findGame(id).levels.length; level++) {
      const keys = new Set(draw(id, level, 60).map((q) => q.key));
      assert.ok(keys.size >= 4, `${id} niveau ${level} : ${keys.size} questions différentes`);
    }
  }
});

test('corps et milieux : français soigné (apostrophes, phrases entières, choix courts)', () => {
  for (const id of IDS) {
    for (let level = 1; level <= findGame(id).levels.length; level++) {
      for (const q of draw(id, level, 80)) {
        for (const s of sentences(q)) {
          assert.ok(!s.includes("'"), `apostrophe droite : ${s}`);
          assert.ok(!s.includes('...'), `points de suspension : ${s}`);
          assert.ok(!/ {2}|\s$|^\s/.test(s), `espaces : ${s}`);
          assert.ok(!/[\u00a0\u202f]/.test(s), `espace insécable écrite à la main : ${s}`);
          assert.ok(!/(^|\s)(de le|de les|à le|à les) /i.test(s), `liaison : ${s}`);
          assert.ok(/^[A-ZÀÂÉÈÊÎÔÙÇŒ]/.test(s), `majuscule : ${s}`);
          assert.ok(/[.!?…]$/.test(s), `ponctuation finale : ${s}`);
          assert.ok(!/\s[.,]/.test(s), `espace avant un point ou une virgule : ${s}`);
          assert.ok(!/\p{Extended_Pictographic}/u.test(s), `emoji dans une phrase : ${s}`);
          assert.ok(!s.includes('Zoé'), 'prénom inutile');
        }
        if (q.interaction !== 'body') for (const c of q.choices) assert.ok([...c.label].length <= 18, `choix trop long : ${c.label}`);
      }
    }
  }
});

test('corps et milieux : emoji récents évités (affichés partout)', () => {
  const source = JSON.stringify([AGES, AWAKE, CLUES, DWELLERS, EATERS, INSECTS, NOT_INSECTS, MEMBERS, MOVERS, VERTEBRATES, INVERTEBRATES, WINTER, CHAINS]);
  for (const recent of ['🪷', '🪹', '🪿', '🪼', '🫎', '🪽', '🐦‍⬛']) assert.ok(!source.includes(recent), recent);
});

// ------------------------------------------------------------------ Le corps humain : données justes

test('le corps, niveaux 1 et 2 : les os et les articulations à toucher sur le dessin', () => {
  assert.deepEqual([...zonesOf('squelette')].sort(), Object.keys(BONES).sort());
  assert.deepEqual([...zonesOf('articulations')].sort(), Object.keys(JOINTS).sort());
  assert.deepEqual([...zonesOf('organes')].sort(), Object.keys(ORGANS).sort());
  assert.deepEqual([...zonesOf('digestion')].sort(), [...DIGESTION].sort());
  for (const view of BODY_VIEWS) {
    const svg = bodySvg(view);
    // chaque partie a un nom (lecteurs d'écran) et une place pour sa coche
    for (const id of zonesOf(view)) {
      assert.match(svg, new RegExp(`data-zone="${id}" role="button" tabindex="0" aria-label="[^"]+"`), id);
      assert.match(svg, new RegExp(`data-badge="${id}"`), id);
    }
  }
  // les deux coudes, les deux genoux… : la même partie des deux côtés
  for (const spots of Object.values(JOINT_SPOTS)) assert.equal(spots.length, 2);
  assert.match(BONES.femur.says, /cuisse/);
  assert.match(BONES.crane.says, /cerveau/);
  assert.match(BONES.cotes.says, /cœur et les poumons/);
  for (const q of draw('corps', 1)) {
    assert.equal(q.stage.view, 'squelette');
    assert.equal(q.text, `Touche ${BONES[q.answer].name}.`);
  }
  for (const q of draw('corps', 2)) {
    if (q.interaction === 'body') {
      assert.equal(q.text, `Touche ${JOINTS[q.answer].name}.`);
      continue;
    }
    // pour plier le bras, jamais le poignet ni l'épaule à côté du coude : les autres réponses sont de l'autre membre
    const use = JOINT_USES.find((u) => u.text === q.text);
    assert.equal(q.answer, JOINTS[use.answer].name);
    const limb = JOINTS[use.answer].limb;
    for (const c of q.choices) {
      if (c.value !== q.answer) assert.notEqual(Object.values(JOINTS).find((j) => j.name === c.value).limb, limb, q.key);
    }
  }
  assert.equal(JOINT_USES.find((u) => u.text.includes('plier la jambe')).answer, 'genou');
  assert.equal(JOINT_USES.find((u) => u.text.includes('plier le bras')).answer, 'coude');
});

test('le corps, niveaux 3 et 4 : les besoins du corps, grandir dans l’ordre', () => {
  const expected = { 'Tu as couru et tu as très soif.': 'eau', 'Tu bâilles et tes yeux se ferment tout seuls.': 'dormir' };
  for (const [text, need] of Object.entries(expected)) assert.equal(NEED_CASES.find((c) => c.text === text).need, need);
  for (const c of NEED_CASES) assert.ok(NEEDS[c.need], c.text);
  for (const q of draw('corps', 3)) {
    const item = NEED_CASES.find((c) => q.text.startsWith(c.text));
    assert.equal(q.answer, item.need, q.text);
  }
  assert.deepEqual(AGES.map((a) => a.name), ['le bébé', 'l’enfant', 'l’adolescent', 'l’adulte', 'la personne âgée']);
  for (const q of draw('corps', 4)) {
    if (q.interaction === 'order') {
      assert.equal(q.items.length, 5);
      for (const it of q.items) assert.equal(AGES[it.value].name, it.label);
      continue;
    }
    const [, where, name] = q.text.match(/juste (après|avant) (.+) \?$/);
    const i = AGES.findIndex((a) => a.name === name);
    assert.equal(q.answer, AGES[where === 'après' ? i + 1 : i - 1].name, q.text);
    assert.ok(!q.choices.some((c) => c.value === name), `la personne de la question parmi les réponses : ${q.key}`);
  }
});

test('le corps, niveaux 5 et 6 : la respiration, le cœur', () => {
  assert.equal(BREATHING.find((b) => b.text.startsWith('Quand tu cours')).answer, 'plus vite');
  assert.equal(BREATHING.find((b) => b.text.startsWith('Quand tu dors')).answer, 'moins vite');
  assert.equal(HEART.find((b) => b.text.startsWith('Quand tu cours')).answer, 'plus vite');
  assert.equal(HEART.find((b) => b.text.startsWith('Quand tu dors')).answer, 'moins vite');
  for (const b of BREATHING.filter((it) => it.wrong)) assert.ok(!b.wrong.some((w) => /nez|bouche|poumons/.test(w)), b.text);
  for (const level of [5, 6]) {
    for (const q of draw('corps', level)) {
      if (q.interaction === 'body') {
        assert.equal(q.answer, level === 5 ? 'poumons' : 'coeur');
        continue;
      }
      const item = [...BREATHING, ...HEART].find((b) => b.text === q.text && b.answer === q.answer);
      if (item) assert.ok(q.choices.some((c) => c.value === item.answer));
    }
  }
});

test('le corps, niveaux 8 et 9 : les dents, le trajet des aliments', () => {
  const uses = Object.fromEntries(TEETH.map((t) => [t.name, t.use]));
  assert.deepEqual(uses, { 'les incisives': 'à couper', 'les canines': 'à déchirer', 'les molaires': 'à écraser' });
  assert.equal(BITES.find((b) => b.text.includes('pomme')).answer, 'les incisives');
  assert.equal(BITES.find((b) => b.text.includes('viande')).answer, 'les canines');
  for (const m of MILK_TEETH) assert.equal(m.answer, /premières|tombent/.test(m.text) ? 'de lait' : 'définitives', m.text);
  for (const q of draw('corps', 8)) {
    const tooth = TEETH.find((t) => q.text === t.ask || q.text === `À quoi servent ${t.name} ?`);
    if (tooth) assert.equal(q.answer, q.text.startsWith('À quoi') ? tooth.use : tooth.name, q.text);
  }
  assert.deepEqual(DIGESTION, ['bouche', 'oesophage', 'estomac', 'intestins']);
  const names = { bouche: 'la bouche', oesophage: 'l’œsophage', estomac: 'l’estomac', intestins: 'les intestins' };
  for (const q of draw('corps', 9)) {
    if (q.interaction === 'body') {
      if (q.sequence) assert.deepEqual(q.sequence, DIGESTION);
      continue;
    }
    const item = FOOD_PATH.find((f) => f.text === q.text);
    assert.equal(q.answer, names[item.answer], q.text);
    // les réponses dans l'ordre du trajet : la phrase lue est toujours la même
    const order = q.choices.map((c) => Object.values(names).indexOf(c.value));
    assert.deepEqual(order, [...order].sort((a, b) => a - b), q.key);
  }
  // « après la bouche » : l'œsophage, « après l'estomac » : les intestins
  for (const f of FOOD_PATH.filter((it) => it.text.startsWith('Après'))) {
    const before = DIGESTION.find((d) => f.text.startsWith(`Après ${names[d]},`));
    assert.equal(DIGESTION[DIGESTION.indexOf(before) + 1], f.answer, f.text);
  }
});

// ------------------------------------------------------------------ Les animaux et leur milieu : données justes

test('les milieux, niveau 1 : comment il se déplace (jamais une autre bonne réponse)', () => {
  for (const m of MOVERS) {
    assert.ok(MOVES.includes(m.move), m.name);
    assert.ok(!m.no.includes(m.move), m.name);
    assert.ok(m.no.length >= 2, m.name);
  }
  // l'aigle marche aussi, le serpent et la grenouille nagent aussi : jamais proposés contre leur réponse
  assert.ok(!MOVERS.find((m) => m.name === 'l’aigle').no.includes('marche'));
  assert.ok(!MOVERS.find((m) => m.name === 'le serpent').no.includes('nage'));
  assert.ok(!MOVERS.find((m) => m.name === 'la grenouille').no.includes('nage'));
  for (const q of draw('milieux', 1)) {
    if (q.choiceStyle === 'pictures') {
      const move = q.text.match(/qui (\w+)\.$/)[1];
      for (const c of q.choices) {
        const m = MOVERS.find((it) => it.name === c.value);
        if (c.value === q.answer) assert.equal(m.move, move, q.key);
        else assert.ok(m.no.includes(move), q.key);
      }
      continue;
    }
    const m = MOVERS.find((it) => q.text === `Pour se déplacer, ${it.name}…`);
    assert.equal(q.answer, m.move);
    for (const c of q.choices) if (c.value !== q.answer) assert.ok(m.no.includes(c.value), q.key);
  }
});

test('les milieux, niveau 2 : mare, forêt, mer, désert (sans doublon avec « Les animaux »)', () => {
  // les animaux du jeu « Les animaux », niveau « Où vit-il ? »
  const others = new Set(draw('animaux-monde', 1, 400).map((q) => q.key.split(':').at(-1)));
  assert.ok(others.has('le dauphin') && others.has('le renard'));
  for (const d of DWELLERS) {
    assert.ok(PLACES[d.place], d.name);
    assert.ok(!others.has(d.name), `${d.name} est déjà dans « Les animaux »`);
  }
  for (const place of Object.keys(PLACES)) assert.ok(DWELLERS.filter((d) => d.place === place).length >= 2, place);
  assert.equal(new Set(DWELLERS.map((d) => d.emoji)).size, DWELLERS.length);
  for (const q of draw('milieux', 2)) {
    if (q.choiceStyle === 'pictures') {
      const place = Object.keys(PLACES).find((p) => q.text === `Quel animal vit ${PLACES[p].label} ?`);
      for (const c of q.choices) {
        const d = DWELLERS.find((it) => it.name === c.value);
        if (c.value === q.answer) assert.equal(d.place, place);
        else assert.ok(d.place !== place && d.place !== PLACES[place].near, `${q.key} : ${c.value}`);
      }
      continue;
    }
    const d = DWELLERS.find((it) => q.text === `Où vit ${it.name} ?`);
    assert.equal(q.answer, d.place);
    // jamais la forêt contre la mare (voisines)
    for (const c of q.choices) if (c.value !== q.answer) assert.notEqual(c.value, PLACES[d.place].near, q.key);
  }
});

test('les milieux, niveaux 3 et 4 : les indices, les insectes ont six pattes', () => {
  assert.equal(CLUES.find((c) => c.emoji === '🪶').answer.name, 'un oiseau');
  assert.equal(CLUES.find((c) => c.emoji === '🕸️').answer.name, 'une araignée');
  for (const c of CLUES) assert.ok(!c.others.some((o) => o.name === c.answer.name || o.emoji === c.answer.emoji), c.text);
  // les autres réponses à « Qui est sorti de cet œuf ? » sont des mammifères (ils ne pondent pas)
  assert.ok(CLUES.find((c) => c.emoji === '🥚').others.every((o) => ['un chaton', 'un chiot', 'un lapereau'].includes(o.name)));
  for (const q of draw('milieux', 3)) {
    const clue = CLUES.find((c) => q.text.startsWith(c.text));
    assert.equal(q.answer, clue.answer.name);
  }
  assert.ok(NOT_INSECTS.some((n) => n.name === 'l’araignée' && n.legs === 8), 'l’araignée a huit pattes');
  assert.ok(!INSECTS.some((i) => /chenille|araignée/.test(i.name)));
  for (const n of NOT_INSECTS) assert.notEqual(n.legs, 6, n.name);
  for (const l of LEG_COUNTS) assert.equal(l.legs, /araignée|scorpion/.test(l.name) ? 8 : 6, l.name);
  for (const q of draw('milieux', 4)) {
    if (q.text.startsWith('Combien')) {
      assert.equal(q.answer, String(LEG_COUNTS.find((l) => q.text === `Combien de pattes a ${l.name} ?`).legs));
    } else if (q.choiceStyle === 'pictures') {
      const findInsect = q.text === 'Touche l’insecte.';
      for (const c of q.choices) {
        const insect = INSECTS.some((i) => i.name === c.value);
        assert.equal(insect, (c.value === q.answer) === findInsect, q.key);
      }
    } else {
      const insect = INSECTS.find((i) => q.text.startsWith(`${i.name[0].toUpperCase()}${i.name.slice(1)},`));
      assert.equal(q.answer, insect ? 'oui' : 'non', q.text);
    }
  }
});

test('les milieux, niveaux 5 et 6 : vertébrés, invertébrés, familles d’animaux', () => {
  const vert = VERTEBRATES.map((v) => v.name);
  const inv = INVERTEBRATES.map((v) => v.name);
  for (const name of ['le requin', 'la grenouille', 'le serpent']) assert.ok(vert.includes(name), name);
  for (const name of ['le crabe', 'l’escargot', 'l’araignée']) assert.ok(inv.includes(name), name);
  assert.ok(!vert.some((n) => inv.includes(n)));
  assert.ok(![...vert, ...inv].some((n) => /pieuvre|méduse/.test(n)));
  for (const q of draw('milieux', 5)) {
    if (q.choiceStyle === 'pictures') {
      const backbone = q.text.includes('squelette');
      for (const c of q.choices) assert.equal(vert.includes(c.value), (c.value === q.answer) === backbone, q.key);
      continue;
    }
    const name = [...vert, ...inv].find((n) => q.text.startsWith(`${n[0].toUpperCase()}${n.slice(1)},`));
    assert.equal(q.answer, vert.includes(name) ? 'vertébré' : 'invertébré', q.text);
  }
  const kind = (name) => MEMBERS.find((m) => m.name === name).kind;
  assert.equal(kind('le dauphin'), 'mammifere');
  assert.equal(kind('la baleine'), 'mammifere');
  assert.equal(kind('la chauve-souris'), 'mammifere');
  assert.equal(kind('le manchot'), 'oiseau');
  assert.equal(kind('le requin'), 'poisson');
  assert.equal(kind('la grenouille'), 'amphibien');
  assert.equal(kind('la tortue'), 'reptile');
  for (const m of MEMBERS) assert.ok(CLASSES[m.kind] && (!m.trap || CLASSES[m.trap]), m.name);
  for (const q of draw('milieux', 6)) {
    const m = MEMBERS.find((it) => q.text === `${it.name[0].toUpperCase()}${it.name.slice(1)} est…`);
    assert.equal(q.answer, m.kind);
    if (m.trap) assert.ok(q.choices.some((c) => c.value === m.trap), `piège absent : ${q.key}`);
  }
});

test('les milieux, niveaux 7 et 8 : régimes et chaînes alimentaires', () => {
  const diet = (name) => EATERS.find((e) => e.name === name)?.diet;
  assert.equal(diet('le lapin'), 'herbivore');
  assert.equal(diet('le lion'), 'carnivore');
  assert.equal(diet('le cochon'), 'omnivore');
  assert.equal(diet('l’ours brun'), 'omnivore');
  for (const name of ['le renard', 'le chien', 'le panda']) assert.equal(diet(name), undefined, name);
  for (const e of EATERS) assert.ok(DIETS[e.diet], e.name);
  for (const q of draw('milieux', 7)) {
    if (q.text.startsWith('Un ')) {
      const d = q.text.match(/^Un (\w+) mange…$/)[1];
      assert.equal(q.answer, DIETS[d].eats);
      continue;
    }
    assert.deepEqual(q.choices.map((c) => c.value), ['herbivore', 'carnivore', 'omnivore']);
    assert.equal(q.answer, diet(EATERS.find((e) => q.text === `${e.name[0].toUpperCase()}${e.name.slice(1)} est…`).name), q.text);
  }
  const plants = ['l’herbe', 'la salade', 'les graines', 'les feuilles'];
  for (const c of CHAINS) {
    assert.equal(c.steps.length, 3);
    assert.ok(plants.includes(c.steps[0][1]), c.says);
    assert.ok(c.says.includes(`${c.steps[2][1]} mange ${c.steps[1][1]}`), c.says);
  }
  const predators = new Set(CHAINS.map((c) => c.steps[2][1]));
  for (const q of draw('milieux', 8)) {
    if (q.interaction === 'order') {
      const chain = CHAINS.find((c) => q.items.every((it) => c.steps[it.value][1] === it.label));
      assert.ok(chain, q.key);
      continue;
    }
    const chain = CHAINS.find((c) => q.text === `Qui mange ${c.steps[1][1]} ?`);
    assert.equal(q.answer, chain.steps[2][1]);
    // à côté du mangeur : des plantes et des mangeurs de plantes seulement (ni la souris ni un autre chasseur)
    for (const c of q.choices) {
      if (c.value === q.answer) continue;
      assert.ok(!predators.has(c.value) && c.value !== 'la souris', `${q.key} : ${c.value}`);
    }
  }
});

test('les milieux, niveau 9 : hiberner ou migrer', () => {
  const does = (name) => WINTER.find((w) => w.name === name)?.does;
  assert.equal(does('le hérisson'), 'hiberne');
  assert.equal(does('la marmotte'), 'hiberne');
  assert.equal(does('l’hirondelle'), 'migre');
  assert.equal(does('la cigogne'), 'migre');
  // l'écureuil ne dort pas tout l'hiver ; l'ours (hivernation, pas vraie hibernation) n'est pas proposé
  assert.ok(AWAKE.some((a) => a.name === 'l’écureuil'));
  assert.ok(![...WINTER, ...AWAKE].some((w) => /ours/.test(w.name)));
  assert.ok(!AWAKE.some((a) => WINTER.some((w) => w.name === a.name)));
  for (const q of draw('milieux', 9)) {
    if (q.text.startsWith('En hiver')) {
      const item = WINTER.find((w) => q.text === `En hiver, ${w.name} hiberne ou migre ?`);
      assert.equal(q.answer, item.does);
    } else if (q.choiceStyle === 'pictures') {
      assert.equal(does(q.answer), 'hiberne');
      for (const c of q.choices) if (c.value !== q.answer) assert.ok(AWAKE.some((a) => a.name === c.value));
    } else {
      assert.equal(q.answer, q.text.startsWith('Hiberner') ? 'dormir l’hiver' : 'partir au chaud');
    }
  }
});
