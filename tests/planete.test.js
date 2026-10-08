// Lot « planète et mélanges » : « Prendre soin de la planète » et « Les mélanges », rubrique « Sciences ».
// Chaque niveau est tiré 200 fois : la bonne réponse est présente une seule fois parmi les choix,
// et elle est juste (recalculée à partir des listes de app/js/games/planete.js, vérifiées à la main).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOMAINS, findGame } from '../app/js/games/index.js';
import {
  ACTIONS, BINS, CLEAN, DAILY, DURATIONS, ENERGY_GESTURES, EVAPORATE, EXPERIMENTS, FILTERS, INSOLUBLE, KITCHEN, LITTER,
  MIXES, NATURE_GESTURES, OIL, POLLUTES, POLLUTION_PICTURES, SEPARATE, SETTLE, SOLUBLE, STEPS, THREE_R, TRIP_PICTURES,
  WASTE, WATER_GESTURES, WATER_PICTURES,
} from '../app/js/games/planete.js';
import { createRng } from '../app/js/random.js';

const IDS = ['planete', 'melanges'];
const SECTIONS = { planete: 'La planète', melanges: 'La matière et les objets' };

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

const byName = (list, name) => list.find((it) => it.name === name);

test('planète et mélanges : rubrique « Sciences », sections, 7 à 10 niveaux, libellés courts', () => {
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
  // les mélanges juste après la matière ; les jeux d'une même section se suivent
  const ids = sciences.games.map((g) => g.id);
  assert.equal(ids.indexOf('melanges'), ids.indexOf('matiere') + 1);
  const sections = sciences.games.map((g) => g.section);
  assert.deepEqual(sections, [...sections].sort((a, b) => sections.indexOf(a) - sections.indexOf(b)));
});

test('planète et mélanges : bonne réponse présente une seule fois, choix tous différents', () => {
  for (const id of IDS) {
    for (let level = 1; level <= findGame(id).levels.length; level++) {
      for (const q of draw(id, level)) {
        if (q.interaction === 'order') {
          const values = q.items.map((it) => it.value);
          assert.equal(values.length, 3, q.key);
          assert.deepEqual([...values].sort(), [0, 1, 2], q.key);
          assert.ok(values.some((v, i) => v !== i), `déjà rangé : ${q.key}`);
          assert.ok(q.items.every((it) => it.emoji && it.label && it.caption), q.key);
          continue;
        }
        assert.equal(q.interaction, undefined, q.key);
        const values = q.choices.map((c) => c.value);
        assert.ok(values.length >= 2 && values.length <= 4, q.key);
        assert.equal(new Set(values).size, values.length, `choix en double : ${q.key}`);
        assert.equal(values.filter((v) => v === q.answer).length, 1, `bonne réponse absente ou en double : ${q.key}`);
        assert.equal(new Set(q.choices.map((c) => c.label)).size, values.length, `images en double : ${q.key}`);
        // une image a toujours un nom (lecteurs d'écran), et une légende quand c'est une image légendée
        for (const c of q.choices) if (c.emoji) assert.ok(c.caption && c.name, q.key);
        if (q.choiceStyle === 'pictures') for (const c of q.choices) assert.ok(c.name, q.key);
        if (q.choiceStyle === 'steps') assert.equal(new Set(q.choices.map((c) => c.emoji)).size, values.length, q.key);
        // pas de guillemets droits (sélecteurs CSS du test de bout en bout)
        for (const v of values) assert.ok(!/["\\]/.test(String(v)), v);
        // oui / non et vrai / faux toujours dans le même ordre
        if (values.includes('oui')) assert.deepEqual(values, ['oui', 'non'], q.key);
        if (values.includes('vrai')) assert.deepEqual(values, ['vrai', 'faux'], q.key);
      }
    }
  }
});

test('planète et mélanges : mêmes questions pour la même graine (generate reste pur)', () => {
  for (const id of IDS) {
    for (let level = 1; level <= findGame(id).levels.length; level++) {
      assert.deepEqual(draw(id, level, 30, 77), draw(id, level, 30, 77), `${id} niveau ${level}`);
    }
  }
});

test('planète et mélanges : les questions varient à chaque niveau', () => {
  for (const id of IDS) {
    for (let level = 1; level <= findGame(id).levels.length; level++) {
      const keys = new Set(draw(id, level, 60).map((q) => q.key));
      assert.ok(keys.size >= 4, `${id} niveau ${level} : ${keys.size} questions différentes`);
    }
  }
});

test('planète et mélanges : français soigné (apostrophes, ponctuation, phrases entières)', () => {
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
        // chaque phrase dite est une phrase seule (la voix les dit une par une)
        const said = Array.isArray(q.instruction) ? q.instruction : [q.instruction];
        for (const s of said) assert.ok(!/[.!?…] [A-ZÀÂÉÈÊÎÔÙÇŒ]/.test(s), `deux phrases en une : ${s}`);
        for (const c of q.choices) assert.ok([...c.label].length <= 22, `choix trop long : ${c.label}`);
      }
    }
  }
});

// ------------------------------------------------------------------ La planète : données justes

test('planète, niveaux 1 et 2 : chaque déchet dans la bonne poubelle (consignes françaises)', () => {
  const bin = (name) => byName(WASTE, name).bin;
  // tous les emballages et les papiers dans le bac de tri, le verre au conteneur, les épluchures au compost
  for (const name of ['la boîte de conserve', 'la brique de jus', 'le journal', 'le flacon de shampoing']) assert.equal(bin(name), 'emballages et papiers', name);
  assert.equal(bin('la bouteille en verre'), 'verre');
  for (const name of ['la peau de banane', 'les épluchures de carotte', 'la coquille d’œuf']) assert.equal(bin(name), 'compost', name);
  assert.equal(bin('le pansement'), 'ordures ménagères');
  // aucun déchet ambigu (verre à boire, vaisselle, mouchoir, viande, couche, pile)
  for (const w of WASTE) assert.ok(!/verre à boire|vaisselle|assiette|mouchoir|viande|couche|pile/.test(w.name), w.name);
  for (const w of WASTE) assert.ok(BINS.some((b) => b.name === w.bin), w.name);
  // chaque poubelle a une image et un nom écrit (jamais la seule couleur)
  assert.equal(new Set(BINS.map((b) => b.emoji)).size, 4);
  for (const level of [1, 2]) {
    for (const q of draw('planete', level)) {
      const item = WASTE.find((w) => q.text === `Où ${w.plural ? 'vont' : 'va'} ${w.name} ?`);
      assert.ok(item, q.text);
      assert.equal(q.stage.emoji, item.emoji);
      assert.equal(q.answer, item.bin);
      assert.equal(q.choices.length, level === 1 ? 2 : 4, q.key);
      // les poubelles toujours dans le même ordre
      const values = q.choices.map((c) => c.value);
      assert.deepEqual(values, BINS.map((b) => b.name).filter((n) => values.includes(n)));
      for (const c of q.choices) assert.equal(c.emoji, byName(BINS, c.value).emoji);
    }
  }
});

test('planète, niveaux 3 et 4 : économiser l’eau et l’énergie', () => {
  const good = (list, text) => list.find((g) => g.text === text).good;
  assert.equal(good(WATER_GESTURES, 'Je prends une douche rapide plutôt qu’un bain.'), true);
  assert.equal(good(WATER_GESTURES, 'Je laisse couler l’eau pendant que je me brosse les dents.'), false);
  assert.equal(good(ENERGY_GESTURES, 'J’éteins la lumière en sortant de la pièce.'), true);
  assert.equal(good(ENERGY_GESTURES, 'Le chauffage marche et la fenêtre reste grande ouverte.'), false);
  // chaque mauvais geste propose quoi faire à la place (ton positif)
  for (const g of [...WATER_GESTURES, ...ENERGY_GESTURES]) if (!g.good) assert.ok(g.tip, g.text);
  for (const [level, list, pictures] of [[3, WATER_GESTURES, WATER_PICTURES], [4, ENERGY_GESTURES, TRIP_PICTURES]]) {
    for (const q of draw('planete', level)) {
      if (q.choiceStyle === 'steps') {
        assert.ok(pictures.good.some((g) => g.name === q.answer), q.key);
        assert.equal(q.choices.filter((c) => pictures.good.some((g) => g.name === c.value)).length, 1, q.key);
        continue;
      }
      const item = list.find((g) => q.instruction[0] === g.text);
      assert.ok(item, q.text);
      assert.equal(q.answer, item.good ? 'oui' : 'non', q.text);
    }
  }
  assert.ok(TRIP_PICTURES.bad.every((b) => /voiture|moto/.test(b.name)));
});

test('planète, niveau 5 : ce qui pollue', () => {
  assert.ok(POLLUTES.some((p) => /fumée/.test(p.name)) && POLLUTES.some((p) => /mer|herbe|par terre/.test(p.name)));
  assert.ok(!POLLUTES.some((p) => CLEAN.some((c) => c.name === p.name)));
  for (const q of draw('planete', 5)) {
    if (q.choiceStyle === 'steps') {
      assert.ok(POLLUTION_PICTURES.good.some((g) => g.name === q.answer), q.key);
      assert.equal(q.choices.filter((c) => POLLUTION_PICTURES.good.some((g) => g.name === c.value)).length, 1, q.key);
      continue;
    }
    const item = [...POLLUTES, ...CLEAN].find((it) => q.text === `${it.name[0].toUpperCase()}${it.name.slice(1)}, ça pollue ?`);
    assert.ok(item, q.text);
    assert.equal(q.answer, POLLUTES.includes(item) ? 'oui' : 'non');
  }
});

test('planète, niveau 6 : le temps pour disparaître (ordres de grandeur de l’ADEME)', () => {
  const duration = (name) => byName(LITTER, name).answer;
  assert.equal(duration('les épluchures de légumes'), 'quelques mois');
  assert.equal(duration('le trognon de pomme'), 'quelques mois');
  assert.equal(duration('la bouteille en plastique'), 'des centaines d’années');
  assert.equal(duration('le sac en plastique'), 'des centaines d’années');
  assert.equal(duration('la bouteille en verre'), 'des milliers d’années');
  for (const q of draw('planete', 6)) {
    if (q.choiceStyle === 'pictures') {
      assert.equal(duration(q.answer), 'quelques mois');
      assert.equal(q.choices.filter((c) => duration(c.value) === 'quelques mois').length, 1, q.key);
      continue;
    }
    assert.deepEqual(q.choices.map((c) => c.value), DURATIONS);
    const item = LITTER.find((l) => q.text.startsWith(`Dans la nature, ${l.name} `));
    assert.equal(q.answer, item.answer, q.text);
  }
});

test('planète, niveaux 7 à 9 : réparer, réutiliser, recycler ; protéger la nature ; vrai ou faux', () => {
  const kind = (text) => ACTIONS.find((a) => a.text === text).answer;
  assert.equal(kind('On recoud la peluche décousue.'), 'réparer');
  assert.equal(kind('Le vieux tee-shirt devient un chiffon.'), 'réutiliser');
  assert.equal(kind('À l’usine, les vieux journaux deviennent du papier neuf.'), 'recycler');
  // recycler, c'est toujours à l'usine
  for (const a of ACTIONS) assert.equal(a.answer === 'recycler', a.text.startsWith('À l’usine'), a.text);
  for (const q of draw('planete', 7)) {
    assert.deepEqual(q.choices.map((c) => c.value), THREE_R);
    assert.equal(q.answer, kind(q.instruction[0]));
  }
  for (const text of ['On regarde le nid de loin, sans le toucher.', 'On cueille toutes les fleurs du parc.', 'On attrape le papillon par les ailes.']) {
    assert.ok(NATURE_GESTURES.some((g) => g.text === text), text);
  }
  assert.equal(NATURE_GESTURES.find((g) => g.text.includes('cueille toutes')).good, false);
  for (const q of draw('planete', 8)) {
    const item = NATURE_GESTURES.find((g) => g.text === q.instruction[0]);
    assert.equal(q.answer, item.good ? 'oui' : 'non');
    assert.ok(item.good ? item.why : item.tip, item.text);
  }
  const expected = {
    'Le verre se recycle encore et encore.': 'vrai', 'Les piles usées vont dans la poubelle de la maison.': 'faux',
    'Une bouteille en plastique disparaît en une semaine dans la nature.': 'faux', 'Le trognon de pomme peut aller au compost.': 'vrai',
  };
  for (const [text, answer] of Object.entries(expected)) assert.equal(DAILY.find((d) => d.text === text).answer, answer, text);
  for (const q of draw('planete', 9)) {
    const item = DAILY.find((d) => d.text === q.instruction[0]);
    assert.equal(q.answer, item.answer);
    assert.equal(q.success.speak[0], item.answer === 'vrai' ? 'C’est vrai !' : 'C’est faux !');
  }
});

// ------------------------------------------------------------------ Les mélanges : données justes

test('mélanges, niveaux 1 et 2 : ce qui se dissout dans l’eau, ce qu’on voit encore', () => {
  const soluble = SOLUBLE.map((s) => s.part);
  const insoluble = INSOLUBLE.map((s) => s.part);
  for (const part of ['du sucre', 'du sel', 'du sirop']) assert.ok(soluble.includes(part), part);
  for (const part of ['du sable', 'de l’huile', 'des cailloux']) assert.ok(insoluble.includes(part), part);
  for (const q of draw('melanges', 1)) {
    const part = q.instruction[0].replace('On met ', '').replace(' dans l’eau et on mélange.', '');
    assert.ok(soluble.includes(part) || insoluble.includes(part), q.text);
    assert.equal(q.answer, soluble.includes(part) ? 'oui' : 'non', q.text);
  }
  // on ne voit plus le sel, le sucre, le sirop ; on voit encore le sable, l'huile…
  for (const m of MIXES) assert.equal(m.visible, !/du sel|du sucre|du sirop/.test(m.mix), m.mix);
  for (const q of draw('melanges', 2)) {
    const item = MIXES.find((m) => q.instruction[0] === `On mélange ${m.mix}.`);
    assert.equal(q.answer, item.visible ? 'oui' : 'non', q.text);
  }
});

test('mélanges, niveaux 3 et 4 : filtrer, laisser reposer', () => {
  for (const f of FILTERS) assert.ok(['l’eau', 'le thé'].includes(f.passes), f.pour);
  for (const q of draw('melanges', 3)) {
    if (q.key === 'melanges:filtre:sel') {
      assert.equal(q.answer, 'non'); // le sel dissous passe à travers le filtre
      continue;
    }
    const item = FILTERS.find((f) => q.instruction[0] === f.pour);
    assert.deepEqual(q.choices.map((c) => c.value), [item.stays, item.passes]);
    assert.equal(q.answer, q.instruction[1].includes('reste') ? item.stays : item.passes, q.text);
  }
  for (const s of SETTLE) assert.equal(s.where, s.name === 'l’huile' ? 'en haut' : 'au fond', s.name);
  for (const q of draw('melanges', 4)) {
    if (q.key === 'melanges:reposer:claire') {
      assert.equal(q.answer, 'en haut');
      continue;
    }
    const item = SETTLE.find((s) => q.instruction[0].includes(` ${s.part},`));
    assert.equal(q.answer, item.where, q.text);
  }
});

test('mélanges, niveaux 5, 6, 8 et 9 : réponses écrites à la main, jamais deux bonnes', () => {
  assert.equal(OIL.find((o) => o.ask === 'Quel liquide flotte sur l’eau ?').answer, 'l’huile');
  assert.equal(EVAPORATE[0].answer, 'du sel');
  assert.equal(SEPARATE.find((s) => s.ask.includes('sel')).answer, 'fait évaporer l’eau');
  assert.ok(SEPARATE.find((s) => s.ask.includes('sel')).others.includes('filtre l’eau'), 'le filtre ne retient pas le sel');
  assert.equal(SEPARATE.find((s) => s.ask.includes('trombones')).answer, 'un aimant');
  // séparer le sable de l'eau : jamais « laisser reposer » parmi les autres réponses (ce serait juste aussi)
  for (const s of SEPARATE) assert.ok(!s.others.some((o) => /reposer|filtre(?! l’eau)|tamis|passoire/.test(o)), s.ask);
  for (const [level, list] of [[5, OIL], [6, EVAPORATE], [8, KITCHEN], [9, SEPARATE]]) {
    for (const it of list) {
      assert.ok(!it.others.includes(it.answer), it.ask);
      assert.equal(new Set(it.others).size, it.others.length, it.ask);
    }
    for (const q of draw('melanges', level)) {
      const item = list.find((it) => (Array.isArray(it.ask) ? it.ask.join(' ') : it.ask) === q.text);
      assert.ok(item, q.text);
      assert.equal(q.answer, item.answer);
      assert.deepEqual(q.choices.map((c) => c.value).sort(), [item.answer, ...item.others].sort());
    }
  }
});

test('mélanges, niveau 7 : les étapes d’une expérience dans l’ordre (je pense, j’essaie, j’observe)', () => {
  for (const exp of EXPERIMENTS) {
    assert.equal(exp.steps[0][0], '🤔', exp.title);
    assert.ok(/^je pense que (oui|non)$/.test(exp.steps[0][1]), exp.title);
    assert.equal(exp.steps.at(-1)[0], '👀', exp.title);
    assert.ok(exp.title.endsWith('?'));
  }
  assert.deepEqual(STEPS.map((s) => s.name), ['je pense', 'j’essaie', 'j’observe']);
  for (const q of draw('melanges', 7)) {
    if (q.interaction === 'order') {
      const exp = EXPERIMENTS.find((e) => q.instruction[0] === e.title);
      for (const it of q.items) assert.deepEqual(exp.steps[it.value], [it.emoji, it.caption]);
      continue;
    }
    const expected = { 'Que fait-on en premier ?': 'je pense', 'Que fait-on à la fin ?': 'j’observe' }[q.text] ?? 'j’essaie';
    assert.equal(q.answer, expected, q.text);
  }
});
