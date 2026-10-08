// Lot « sciences » : « Le vivant » et « La matière », dans la rubrique « Le monde ».
// Chaque niveau est tiré 200 fois : la bonne réponse est présente une seule fois parmi les choix,
// et elle est juste (recalculée à partir des listes ci-dessous, écrites et vérifiées à la main).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOMAINS, findGame } from '../app/js/games/index.js';
import {
  BODY, CHANGES, CYCLES, FLOATS, FOOD_FAMILIES, GROWTH, HEAT, HYGIENE, LIQUIDS, LIVING, MAGNETIC, MATERIALS, NATURE,
  NOT_LIVING, NOT_MAGNETIC, OBJECTS, OPAQUE, PLANT_CASES, SINKS, SLEEP, SOLIDS, TOOLS, TRANSPARENT, WATER_FORMS,
} from '../app/js/games/sciences.js';
import { createRng } from '../app/js/random.js';

const IDS = ['vivant', 'matiere'];
const SECTIONS = { vivant: 'Le vivant', matiere: 'La matière et les objets' };

/** 200 questions tirées à ce niveau, avec le prénom de l'enfant. */
function draw(id, level, runs = 200, seed = 2468) {
  const rng = createRng(seed + level);
  return Array.from({ length: runs }, (_, i) => findGame(id).generate(level, rng, i, { name: 'Zoé' }));
}

/** Tout ce qui est écrit ou dit dans une question. */
function sentences(q) {
  const out = [q.text, q.short?.text];
  const push = (p) => (Array.isArray(p) ? p.forEach(push) : typeof p === 'string' && out.push(p));
  push(q.instruction);
  push(q.success?.speak);
  return out.filter(Boolean);
}

const nameIn = (text, list) => list.find((it) => text.includes(it.name));

test('sciences : rangés dans la rubrique « Sciences », sections « Le vivant » et « La matière et les objets », 7 à 10 niveaux', () => {
  const sciences = DOMAINS.find((d) => d.id === 'sciences');
  for (const id of IDS) {
    const game = findGame(id);
    assert.ok(game, `${id} absent de index.js`);
    assert.equal(game.domain, 'sciences');
    assert.equal(game.section, SECTIONS[id]);
    assert.ok(sciences.games.includes(game));
    assert.ok(game.levels.length >= 7 && game.levels.length <= 10, `${id} : ${game.levels.length} niveaux`);
    assert.equal(new Set(game.levels).size, game.levels.length, `${id} : libellé en double`);
    for (const label of game.levels) assert.ok([...label].length <= 26, `${id} : « ${label} » trop long`);
  }
  // les autres jeux de la rubrique sont rangés eux aussi (identifiants inchangés)
  assert.equal(findGame('animaux-monde').section, 'Animaux, pays et cartes');
  for (const id of ['pays', 'drapeaux', 'carte-monde']) assert.equal(findGame(id).section, 'Animaux, pays et cartes', id);
  // les jeux d'une même section se suivent dans la rubrique
  const sections = monde.games.map((g) => g.section);
  assert.deepEqual(sections, [...sections].sort((a, b) => sections.indexOf(a) - sections.indexOf(b)));
});

test('sciences : bonne réponse présente une seule fois, choix tous différents', () => {
  for (const id of IDS) {
    for (let level = 1; level <= findGame(id).levels.length; level++) {
      for (const q of draw(id, level)) {
        if (q.interaction === 'order') {
          const values = q.items.map((it) => it.value);
          assert.ok(values.length >= 3, q.key);
          assert.deepEqual([...values].sort(), values.map((_, i) => i), q.key);
          assert.ok(values.some((v, i) => v !== i), `déjà rangé : ${q.key}`);
          assert.ok(q.items.every((it) => it.emoji && it.label), q.key);
          continue;
        }
        assert.equal(q.interaction, undefined, q.key);
        const values = q.choices.map((c) => c.value);
        assert.ok(values.length >= 2 && values.length <= 3, q.key);
        assert.equal(new Set(values).size, values.length, `choix en double : ${q.key}`);
        assert.equal(values.filter((v) => v === q.answer).length, 1, `bonne réponse absente ou en double : ${q.key}`);
        // des images toutes différentes
        assert.equal(new Set(q.choices.map((c) => c.label)).size, values.length, `images en double : ${q.key}`);
        // pas de guillemets droits (sélecteurs CSS du test de bout en bout)
        for (const v of values) assert.ok(!/["\\]/.test(String(v)), v);
      }
    }
  }
});

test('sciences : mêmes questions pour la même graine (generate reste pur)', () => {
  for (const id of IDS) {
    for (let level = 1; level <= findGame(id).levels.length; level++) {
      assert.deepEqual(draw(id, level, 30, 77), draw(id, level, 30, 77), `${id} niveau ${level}`);
    }
  }
});

test('sciences : les questions varient à chaque niveau', () => {
  for (const id of IDS) {
    for (let level = 1; level <= findGame(id).levels.length; level++) {
      const keys = new Set(draw(id, level, 60).map((q) => q.key));
      assert.ok(keys.size >= 4, `${id} niveau ${level} : ${keys.size} questions différentes`);
    }
  }
});

test('sciences : français soigné (apostrophes, points de suspension, phrases entières)', () => {
  for (const id of IDS) {
    const game = findGame(id);
    for (let level = 1; level <= game.levels.length; level++) {
      for (const q of draw(id, level, 80)) {
        for (const s of sentences(q)) {
          assert.ok(!s.includes("'"), `apostrophe droite : ${s}`);
          assert.ok(!s.includes('...'), `points de suspension : ${s}`);
          assert.ok(!/ {2}|\s$|^\s/.test(s), `espaces : ${s}`);
          assert.ok(!/[\u00a0\u202f]/.test(s), `espace insécable écrite à la main : ${s}`);
          assert.ok(!/(^|\s)(de le|de les|à le|à les) /i.test(s), `liaison : ${s}`);
          assert.ok(/^[A-ZÀÂÉÈÊÎÔÙÇŒ]/.test(s), `majuscule : ${s}`);
          assert.ok(/[.!?…]$/.test(s), `ponctuation finale : ${s}`);
          assert.ok(!/\p{Extended_Pictographic}/u.test(s), `emoji dans une phrase : ${s}`);
          assert.ok(!s.includes('Zoé'), 'prénom inutile');
        }
        for (const c of q.choices) assert.ok([...c.label].length <= 18, `choix trop long : ${c.label}`);
      }
    }
  }
});

// ------------------------------------------------------------------ Le vivant : données justes

test('le vivant, niveaux 1 et 2 : la partie du corps demandée, l’organe du sens', () => {
  for (const q of draw('vivant', 1)) {
    const part = BODY.find((p) => p.name === q.answer);
    assert.equal(q.text, `Touche ${part.name}.`);
    assert.equal(q.choices.find((c) => c.value === q.answer).label, part.emoji);
    // jamais deux images de la bouche (bouche, langue, dent) parmi les choix
    const mouth = q.choices.filter((c) => BODY.find((p) => p.name === c.value).group === 'bouche');
    assert.ok(mouth.length <= 1, q.key);
  }
  const organs = {
    'les yeux': /vois|regarder/, 'les oreilles': /entends|écouter|entendre/, 'le nez': /odeur|sentir le parfum/,
    'la langue': /goût|acide/, 'les mains': /touches|douce|froid/,
  };
  for (const q of draw('vivant', 2)) assert.match(q.text, organs[q.answer], q.text);
});

test('le vivant, niveau 3 : vivant ou pas vivant', () => {
  assert.ok(LIVING.some((l) => l.name === 'le champignon'), 'le champignon est vivant');
  for (const name of ['le robot', 'le réveil', 'la peluche']) assert.ok(NOT_LIVING.some((l) => l.name === name), name);
  assert.ok(!LIVING.some((l) => NOT_LIVING.some((n) => n.name === l.name || n.emoji === l.emoji)));
  for (const q of draw('vivant', 3)) {
    assert.deepEqual(q.choices.map((c) => c.value), ['vivant', 'pas vivant']);
    const item = [...LIVING, ...NOT_LIVING].find((it) => q.text.startsWith(`${it.name[0].toUpperCase()}${it.name.slice(1)},`));
    assert.equal(q.stage.emoji, item.emoji);
    assert.equal(q.answer, LIVING.includes(item) ? 'vivant' : 'pas vivant', q.text);
  }
});

test('le vivant, niveaux 4 et 5 : les cycles de vie', () => {
  const next = {
    'la graine': 'la pousse', 'l’œuf de la poule': 'le poussin', 'le poussin': 'la poule', 'la chenille': 'le papillon',
    'le têtard': 'la grenouille', 'le bébé': 'l’enfant', 'l’enfant': 'l’adulte', 'la fleur du pommier': 'la pomme',
  };
  assert.deepEqual(Object.fromEntries(GROWTH.map((g) => [g.from, g.to.name])), next);
  for (const q of draw('vivant', 4)) {
    const step = GROWTH.find((g) => q.text === `Que devient ${g.from} ?`);
    assert.equal(q.answer, step.to.name);
    // les autres images viennent d'un autre cycle : jamais l'arbre à côté de la pousse
    for (const c of q.choices) {
      if (c.value === q.answer) continue;
      assert.ok(GROWTH.filter((g) => g.to.name === c.value).every((g) => g.cycle !== step.cycle), `${q.text} / ${c.value}`);
    }
  }
  assert.deepEqual(CYCLES.find((c) => c.title === 'La vie du papillon.').steps.map(([e]) => e), ['🥚', '🐛', '🦋']);
  assert.deepEqual(CYCLES.find((c) => c.title === 'La vie de la poule.').steps.map(([e]) => e), ['🥚', '🐣', '🐔']);
  for (const q of draw('vivant', 5)) {
    const cycle = CYCLES.find((c) => q.text.startsWith(c.title));
    assert.equal(q.items.length, cycle.steps.length);
    for (const it of q.items) assert.deepEqual(cycle.steps[it.value], [it.emoji, it.label]);
  }
});

test('le vivant, niveau 6 : une plante a besoin d’eau et de lumière', () => {
  for (const q of draw('vivant', 6)) {
    if (q.choices[0].value === 'oui') {
      const item = PLANT_CASES.find((p) => q.text.startsWith(p.text));
      assert.equal(q.answer, item.grows ? 'oui' : 'non', q.text);
    } else {
      assert.ok(['d’eau', 'de lumière'].includes(q.answer), q.answer);
      assert.equal(q.choices.filter((c) => ['d’eau', 'de lumière'].includes(c.value)).length, 1, q.key);
    }
  }
  assert.ok(PLANT_CASES.find((p) => p.text.includes('noir')).grows === false);
});

test('le vivant, niveaux 7 et 8 : vrai ou faux, et ce qui est bon pour la santé', () => {
  const expected = {
    'Les bonbons sont bons pour les dents.': 'faux', 'On se brosse les dents matin et soir.': 'vrai',
    'On peut prêter sa brosse à dents.': 'faux', 'Regarder un écran aide à s’endormir.': 'faux',
    'Quand on tousse, on met son coude devant sa bouche.': 'vrai',
  };
  for (const [text, answer] of Object.entries(expected)) assert.equal([...HYGIENE, ...SLEEP].find((s) => s.text === text).answer, answer, text);
  for (const level of [7, 8]) {
    for (const q of draw('vivant', level)) {
      if (q.choices[0].value !== 'vrai') {
        assert.ok(/dormir|santé/.test(q.text));
        assert.ok(!/trop|écran|soda|bruit|jeu vidéo/.test(q.answer), q.answer);
        assert.equal(q.choices.filter((c) => !/trop|écran|soda|bruit|jeu vidéo/.test(c.value)).length, 1, q.key);
        continue;
      }
      assert.deepEqual(q.choices.map((c) => c.value), ['vrai', 'faux']);
      const item = (level === 7 ? HYGIENE : SLEEP).find((s) => q.text.startsWith(s.text));
      assert.ok(item, q.text);
      assert.equal(q.answer, item.answer);
      assert.equal(q.success.speak[0], item.answer === 'vrai' ? 'C’est vrai !' : 'C’est faux !');
    }
  }
});

test('le vivant, niveau 9 : les familles d’aliments', () => {
  const familyOf = (name) => Object.keys(FOOD_FAMILIES).find((f) => FOOD_FAMILIES[f].foods.some(([, n]) => n === name));
  assert.equal(familyOf('la pomme de terre'), 'feculents');
  assert.equal(familyOf('le fromage'), 'laitiers');
  const all = Object.values(FOOD_FAMILIES).flatMap((f) => f.foods);
  assert.equal(new Set(all.map(([e]) => e)).size, all.length, 'un aliment dans une seule famille');
  for (const q of draw('vivant', 9)) {
    const family = Object.keys(FOOD_FAMILIES).find((f) => FOOD_FAMILIES[f].touch === q.text);
    assert.equal(familyOf(q.answer), family, q.key);
    const families = q.choices.map((c) => familyOf(c.value));
    assert.equal(new Set(families).size, 3, `deux aliments de la même famille : ${q.key}`);
  }
});

// ------------------------------------------------------------------ La matière : données justes

test('la matière, niveaux 1 à 3 : solide, liquide, glace, vapeur', () => {
  assert.ok(SOLIDS.some((s) => s.name === 'le glaçon'), 'la glace est solide');
  for (const q of draw('matiere', 1)) {
    const item = [...SOLIDS, ...LIQUIDS].find((it) => q.stage.emoji === it.emoji);
    assert.equal(q.answer, SOLIDS.includes(item) ? 'solide' : 'liquide', q.text);
  }
  const ice = 'de la glace';
  const vapour = 'de la vapeur';
  assert.equal(WATER_FORMS.find((w) => w.text.startsWith('La neige')).answer, ice);
  assert.equal(WATER_FORMS.find((w) => w.text.startsWith('Quand l’eau bout')).answer, vapour);
  assert.equal(CHANGES.find((w) => w.text.includes('congélateur')).answer, ice);
  assert.equal(CHANGES.find((w) => w.text.includes('glaçon au soleil')).answer, 'de l’eau liquide');
  // les nuages ne sont pas de la vapeur (de toutes petites gouttes d'eau)
  for (const w of [...WATER_FORMS, ...CHANGES]) assert.ok(!/nuage|buée/.test(w.text), w.text);
  for (const level of [2, 3]) {
    for (const q of draw('matiere', level)) {
      const item = [...WATER_FORMS, ...CHANGES, ...HEAT].find((w) => w.text === q.text);
      assert.ok(item, q.text);
      assert.equal(q.answer, item.answer);
    }
  }
  for (const h of HEAT) assert.equal(h.answer, /fondre/.test(h.text) ? 'chauffer' : 'refroidir', h.text);
});

test('la matière, niveaux 4 et 5 : flotte ou coule, l’aimant (sans objet ambigu)', () => {
  const floats = FLOATS.map((f) => f.name);
  const sinks = SINKS.map((f) => f.name);
  for (const name of ['la pomme', 'le glaçon', 'la bûche']) assert.ok(floats.includes(name), name);
  for (const name of ['la clé', 'le caillou', 'la pièce']) assert.ok(sinks.includes(name), name);
  assert.ok(!floats.some((n) => sinks.includes(n)));
  // une clé (laiton), une cuillère (inox), une pièce (cuivre-nickel), une canette (aluminium) : jamais pour l'aimant
  const magnetNames = [...MAGNETIC, ...NOT_MAGNETIC].map((m) => m.name).join(' ');
  for (const word of ['clé', 'cuillère', 'pièce', 'canette', 'ciseaux', 'boulon']) assert.ok(!magnetNames.includes(word), word);
  for (const q of draw('matiere', 4)) {
    const item = nameIn(q.text, [...FLOATS, ...SINKS]);
    assert.equal(q.answer, FLOATS.includes(item) ? 'flotte' : 'coule', q.text);
  }
  for (const q of draw('matiere', 5)) {
    const item = [...MAGNETIC, ...NOT_MAGNETIC].find((m) => q.text === `L’aimant attire-t-il ${m.name} ?`);
    assert.equal(q.answer, MAGNETIC.includes(item) ? 'oui' : 'non', q.text);
  }
});

test('la matière, niveaux 6 et 7 : les matériaux, transparent ou opaque', () => {
  for (const o of OBJECTS) assert.ok(MATERIALS.includes(o.material), o.name);
  for (const q of draw('matiere', 6)) {
    const item = OBJECTS.find((o) => q.stage.emoji === o.emoji);
    assert.equal(q.answer, item.material);
    // les matières proposées sont dans l'ordre habituel : la phrase lue est toujours la même
    const values = q.choices.map((c) => c.value);
    assert.deepEqual(values, MATERIALS.filter((m) => values.includes(m)));
  }
  assert.ok(OPAQUE.some((o) => o.name === 'le miroir'), 'on ne voit pas à travers un miroir');
  for (const q of draw('matiere', 7)) {
    const item = [...TRANSPARENT, ...OPAQUE].find((o) => q.stage.emoji === o.emoji);
    assert.equal(q.answer, TRANSPARENT.includes(item) ? 'transparent' : 'opaque', q.text);
  }
});

test('la matière, niveaux 8 et 9 : l’eau dans la nature, prévoir et tester', () => {
  assert.equal(NATURE.find((n) => n.text.includes('nuage ?')).answer, 'de gouttes d’eau');
  for (const q of draw('matiere', 8)) {
    const item = NATURE.find((n) => n.text === q.text);
    assert.equal(q.answer, item.answer);
  }
  const tools = { aimant: 'un aimant', chaud: 'un thermomètre', fourmi: 'une loupe', flotte: 'un seau d’eau', lumière: 'une lampe de poche' };
  for (const q of draw('matiere', 9)) {
    const tool = TOOLS.find((t) => t.ask === q.text);
    if (tool) {
      const [, name] = Object.entries(tools).find(([word]) => q.text.includes(word === 'aimant' ? 'en fer' : word));
      assert.equal(q.answer, name, q.text);
      continue;
    }
    const lists = {
      'Lequel va couler ?': [SINKS, FLOATS], 'Lequel va flotter ?': [FLOATS, SINKS],
      'Lequel sera attiré par l’aimant ?': [MAGNETIC, NOT_MAGNETIC], 'Lequel laisse passer la lumière ?': [TRANSPARENT, OPAQUE],
    }[q.text];
    if (!lists) {
      assert.equal(q.text, 'Lequel va fondre au soleil ?');
      assert.ok(['le glaçon', 'le bonhomme de neige', 'la glace à la vanille'].includes(q.answer), q.answer);
      continue;
    }
    const [yes, no] = lists;
    assert.ok(yes.some((y) => y.name === q.answer), q.key);
    for (const c of q.choices) if (c.value !== q.answer) assert.ok(no.some((n) => n.name === c.value) && !yes.some((y) => y.name === c.value), q.key);
  }
});
