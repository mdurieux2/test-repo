// Lot « ciel » : « Le ciel et la Terre » et « La météo », dans la rubrique « Sciences ».
// Chaque niveau est tiré 200 fois : la bonne réponse est présente une seule fois parmi les choix,
// et elle est juste (recalculée à partir des listes du jeu, écrites et vérifiées à la main).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOMAINS, findGame } from '../app/js/games/index.js';
import {
  CLOTHES, CONSTELLATIONS, DAY_NIGHT, DAY_NIGHT_PICTURES, DURATIONS, EARTH_FACTS, INSTRUMENTS, MOON_FACTS, MOON_SHAPES,
  PHASE_FACTS, PHASE_NAMES, PLANET_FACTS, PLANET_NAMES, PLANET_QUESTIONS, RAIN_FACTS, RAINBOW_FACTS, SEASON_FACTS,
  SEASON_SCENES, SHADOW_FACTS, SHADOW_OF, SHADOW_TIMES, STAR_FACTS, STORM_FACTS, STORM_PAIRS, SUN_FACTS, WATER_CYCLE,
  WEATHER, WEEK, WHICH_DAY, WIND_FACTS, WIND_FORCES, cielSvg, makeWeek, moonSvg,
} from '../app/js/games/ciel.js';
import { createRng } from '../app/js/random.js';

const IDS = ['ciel', 'meteo'];

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

const ALL_FACTS = [
  ...SUN_FACTS, ...MOON_FACTS, ...SHADOW_FACTS, ...STAR_FACTS, ...PHASE_FACTS, ...PLANET_FACTS, ...EARTH_FACTS,
  ...SEASON_FACTS, ...RAIN_FACTS, ...WIND_FACTS, ...STORM_FACTS, ...RAINBOW_FACTS,
];
const factOf = (q) => ALL_FACTS.find((f) => q.text === `${f.text} Vrai ou faux ?`);
const isTrueFalse = (q) => q.choices?.[0]?.value === 'vrai';

test('ciel et météo : rubrique « Sciences », section « Le ciel et la Terre » après « La matière et les objets », 7 à 10 niveaux', () => {
  const sciences = DOMAINS.find((d) => d.id === 'sciences');
  for (const id of IDS) {
    const game = findGame(id);
    assert.ok(game, `${id} absent de index.js`);
    assert.equal(game.domain, 'sciences');
    assert.equal(game.section, 'Le ciel et la Terre');
    assert.ok(sciences.games.includes(game));
    assert.ok(game.levels.length >= 7 && game.levels.length <= 10, `${id} : ${game.levels.length} niveaux`);
    assert.equal(new Set(game.levels).size, game.levels.length, `${id} : libellé en double`);
    for (const label of game.levels) assert.ok([...label].length <= 26, `${id} : « ${label} » trop long`);
  }
  // les sections se suivent (une section ne revient pas plus loin), et le ciel vient après la matière
  const sections = sciences.games.map((g) => g.section).filter((s, i, all) => s !== all[i - 1]);
  assert.equal(new Set(sections).size, sections.length, sections.join(' / '));
  assert.ok(sections.indexOf('Le ciel et la Terre') > sections.indexOf('La matière et les objets'), sections.join(' / '));
});

test('ciel et météo : bonne réponse présente une seule fois, choix tous différents', () => {
  for (const id of IDS) {
    for (let level = 1; level <= findGame(id).levels.length; level++) {
      for (const q of draw(id, level)) {
        assert.equal(q.listenOnly, undefined, q.key);
        if (q.interaction === 'order') {
          const values = q.items.map((it) => it.value);
          assert.ok(values.length >= 3, q.key);
          assert.deepEqual([...values].sort(), values.map((_, i) => i), q.key);
          assert.ok(values.some((v, i) => v !== i), `déjà rangé : ${q.key}`);
          assert.ok(q.items.every((it) => it.label), q.key);
          continue;
        }
        assert.equal(q.interaction, undefined, q.key);
        const values = q.choices.map((c) => c.value);
        assert.ok(values.length >= 2 && values.length <= 3, q.key);
        assert.equal(new Set(values).size, values.length, `choix en double : ${q.key}`);
        assert.equal(values.filter((v) => v === q.answer).length, 1, `bonne réponse absente ou en double : ${q.key}`);
        // chaque image a un nom (lecteurs d'écran), et les images sont toutes différentes
        for (const c of q.choices) {
          if (c.drawing || /\p{Extended_Pictographic}/u.test(c.label || '')) assert.ok(c.name, `image sans nom : ${q.key}`);
          if (c.drawing) assert.ok(cielSvg(c.drawing)?.startsWith('<svg'), `dessin inconnu : ${c.drawing.kind}`);
        }
        const looks = q.choices.map((c) => (c.drawing ? JSON.stringify(c.drawing) : c.label));
        assert.equal(new Set(looks).size, values.length, `images en double : ${q.key}`);
        for (const v of values) assert.ok(!/["\\]/.test(String(v)), v);
        if (q.stage.type === 'drawing') {
          assert.ok(q.stage.label, `dessin sans nom : ${q.key}`);
          assert.ok(cielSvg(q.stage.drawing)?.startsWith('<svg'), q.key);
        }
      }
    }
  }
});

test('ciel et météo : mêmes questions pour la même graine (generate reste pur)', () => {
  for (const id of IDS) {
    for (let level = 1; level <= findGame(id).levels.length; level++) {
      assert.deepEqual(draw(id, level, 30, 77), draw(id, level, 30, 77), `${id} niveau ${level}`);
    }
  }
});

test('ciel et météo : les questions varient à chaque niveau', () => {
  for (const id of IDS) {
    for (let level = 1; level <= findGame(id).levels.length; level++) {
      const keys = new Set(draw(id, level, 60).map((q) => q.key));
      assert.ok(keys.size >= 4, `${id} niveau ${level} : ${keys.size} questions différentes`);
    }
  }
});

test('ciel et météo : français soigné (apostrophes, ponctuation, phrases entières, pas de prénom)', () => {
  for (const id of IDS) {
    for (let level = 1; level <= findGame(id).levels.length; level++) {
      for (const q of draw(id, level, 120)) {
        for (const s of sentences(q)) {
          assert.ok(!s.includes("'"), `apostrophe droite : ${s}`);
          assert.ok(!s.includes('...'), `points de suspension : ${s}`);
          assert.ok(!/ {2}|\s$|^\s/.test(s), `espaces : ${s}`);
          assert.ok(!/[\u00a0\u202f]/.test(s), `espace insécable écrite à la main : ${s}`);
          assert.ok(!/(^|\s)(de le|de les|à le|à les) /i.test(s), `liaison : ${s}`);
          assert.ok(/^[A-ZÀÂÉÈÊÎÔÙÇŒ]/.test(s), `majuscule : ${s}`);
          assert.ok(/[.!?]$/.test(s), `ponctuation finale : ${s}`);
          assert.ok(!/\p{Extended_Pictographic}/u.test(s), `emoji dans une phrase : ${s}`);
          assert.ok(!s.includes('Zoé'), 'prénom inutile');
        }
        for (const c of q.choices) assert.ok([...String(c.label ?? '')].length <= 18, `choix trop long : ${c.label}`);
        for (const it of q.items || []) assert.ok([...it.label].length <= 18, `élément trop long : ${it.label}`);
      }
    }
  }
});

test('ciel et météo : une espace avant ? ! : et ; dans toutes les phrases', () => {
  for (const id of IDS) {
    for (let level = 1; level <= findGame(id).levels.length; level++) {
      for (const q of draw(id, level, 120)) {
        for (const s of sentences(q)) assert.ok(!/[^\s][?!:;]/.test(s), `espace manquante : ${s}`);
      }
    }
  }
});

// ------------------------------------------------------------------ Le ciel et la Terre : données justes

test('vrai ou faux : les réponses des phrases sensibles', () => {
  const expected = {
    'Le Soleil est une étoile.': 'vrai',
    'On peut regarder le Soleil en face.': 'faux',
    'Le Soleil est plus petit que la Terre.': 'faux',
    'La Lune fabrique sa propre lumière.': 'faux',
    'La Lune est une étoile.': 'faux',
    'Le jour, les étoiles disparaissent du ciel.': 'faux',
    'La Lune change vraiment de forme.': 'faux',
    'Le Soleil tourne autour de la Terre.': 'faux',
    'La Terre est plate.': 'faux',
    'En été, il fait chaud parce que la Terre est plus près du Soleil.': 'faux',
    'En été, le Soleil monte plus haut dans le ciel qu’en hiver.': 'vrai',
    'À midi, les ombres sont les plus longues.': 'faux',
    'Les nuages sont faits de toutes petites gouttes d’eau.': 'vrai',
    'L’eau de pluie est salée comme l’eau de la mer.': 'faux',
    'Pendant l’orage, on s’abrite sous un grand arbre.': 'faux',
    'On voit l’éclair avant d’entendre le tonnerre.': 'vrai',
    'On peut toucher un arc-en-ciel.': 'faux',
  };
  for (const [text, answer] of Object.entries(expected)) assert.equal(ALL_FACTS.find((f) => f.text === text)?.answer, answer, text);
  // jamais « plus près du Soleil en été » présenté comme vrai, jamais « la vapeur » pour les nuages
  for (const f of ALL_FACTS) {
    if (/plus près du Soleil/.test(f.text)) assert.equal(f.answer, 'faux', f.text);
    assert.ok(!/plus près du Soleil/.test(f.why), f.why);
    assert.ok(!/vapeur/.test(f.text + f.why), f.text);
  }
  for (const level of [2, 3, 4, 5, 6, 7, 8, 9]) {
    for (const q of draw('ciel', level).filter(isTrueFalse)) {
      const fact = factOf(q);
      assert.ok(fact, q.text);
      assert.equal(q.answer, fact.answer);
      assert.equal(q.success.speak[0], fact.answer === 'vrai' ? 'C’est vrai !' : 'C’est faux !');
    }
  }
});

test('le ciel, niveau 1 : le jour et la nuit', () => {
  for (const q of draw('ciel', 1)) {
    assert.deepEqual(q.choices.map((c) => c.value), ['le jour', 'la nuit']);
    const item = DAY_NIGHT.find((d) => d.text === q.text) || DAY_NIGHT_PICTURES.find((d) => d.emoji === q.stage.emoji);
    assert.equal(q.answer, item.answer, q.text);
  }
  assert.equal(DAY_NIGHT.find((d) => d.text.includes('étoiles')).answer, 'la nuit');
  assert.equal(DAY_NIGHT.find((d) => d.text.includes('école')).answer, 'le jour');
});

test('le ciel, niveau 2 : le Soleil se lève à l’est, il nous éclaire', () => {
  for (const q of draw('ciel', 2).filter((x) => !isTrueFalse(x))) {
    if (q.text.includes('lève')) assert.equal(q.answer, 'à l’est');
    else if (q.text.includes('couche')) assert.equal(q.answer, 'à l’ouest');
    else assert.equal(q.answer, 'le Soleil');
  }
});

test('le ciel, niveaux 3 et 6 : les phases de la Lune (dessins et ordre)', () => {
  // la Lune croissante est éclairée à droite (vue de France), la décroissante à gauche
  assert.match(moonSvg(1, 50, 50, 30), /A30 30 0 0 1 50 80/);
  assert.match(moonSvg(7, 50, 50, 30), /A30 30 0 0 0 50 80/);
  assert.match(moonSvg(2, 50, 50, 30), /A0 30/, 'premier quartier : moitié droite');
  assert.ok(!/<path/.test(moonSvg(0, 50, 50, 30)), 'nouvelle lune : rien d’éclairé');
  for (const q of draw('ciel', 3).filter((x) => !isTrueFalse(x))) {
    const shape = Object.entries(MOON_SHAPES).find(([, s]) => q.text === `Touche ${s.name}.`)[0];
    assert.equal(q.answer, shape);
    for (const c of q.choices) assert.ok(MOON_SHAPES[c.value].phases.includes(c.drawing.phase), q.key);
  }
  for (const q of draw('ciel', 6).filter((x) => !isTrueFalse(x))) {
    const { list, gap } = q.stage.drawing;
    // les phases se suivent dans l'ordre du cycle
    list.slice(1).forEach((k, i) => assert.equal(k, (list[i] + 1) % 8));
    assert.equal(q.answer, list[gap]);
    assert.ok(PHASE_NAMES[q.answer], q.key);
    for (const c of q.choices) assert.equal(c.drawing.phase, c.value);
  }
});

test('le ciel, niveau 4 : l’ombre est à l’opposé du Soleil, courte quand il est haut', () => {
  assert.deepEqual(SHADOW_OF, { gauche: 'droite', haut: 'courte', droite: 'gauche' });
  for (const t of SHADOW_TIMES) assert.equal(t.answer, t.sun === 'haut' ? 'courte' : 'longue', t.text);
  for (const q of draw('ciel', 4).filter((x) => !isTrueFalse(x))) {
    if (q.choiceStyle === 'drawings') assert.equal(q.answer, SHADOW_OF[q.stage.drawing.sun]);
    else assert.equal(q.answer, q.stage.drawing.sun === 'haut' ? 'courte' : 'longue');
  }
});

test('le ciel, niveau 5 : les constellations', () => {
  assert.equal(CONSTELLATIONS['grande-ourse'].stars.length, 7);
  assert.equal(CONSTELLATIONS.cassiopee.stars.length, 5);
  for (const q of draw('ciel', 5).filter((x) => !isTrueFalse(x))) {
    const id = q.stage.drawing.id;
    if (q.text.startsWith('Compte')) assert.equal(q.answer, CONSTELLATIONS[id].stars.length);
    else assert.equal(q.answer, { 'grande-ourse': 'une casserole', cassiopee: 'W', orion: '3' }[id]);
  }
});

test('le ciel, niveaux 7 et 10 : les planètes et leur ordre', () => {
  assert.deepEqual(PLANET_NAMES, ['Mercure', 'Vénus', 'la Terre', 'Mars', 'Jupiter', 'Saturne', 'Uranus', 'Neptune']);
  const facts = {
    'Sur quelle planète vivons-nous ?': 'la Terre', 'Quelle est la plus grande planète ?': 'Jupiter',
    'Quelle planète est la plus proche du Soleil ?': 'Mercure', 'Quelle planète est la plus loin du Soleil ?': 'Neptune',
    'Quelle planète a de grands anneaux bien visibles ?': 'Saturne', 'Quelle planète appelle-t-on la planète rouge ?': 'Mars',
    'Quelle planète est la plus chaude ?': 'Vénus',
  };
  for (const p of PLANET_QUESTIONS) {
    assert.equal(p.answer, facts[p.text], p.text);
    if (p.from) assert.ok(!p.from.includes(p.answer));
  }
  // les autres planètes proposées pour les anneaux n'en ont aucun
  assert.ok(PLANET_QUESTIONS.find((p) => p.answer === 'Saturne').from.every((n) => ['Mercure', 'Vénus', 'la Terre', 'Mars'].includes(n)));
  for (const q of draw('ciel', 7).filter((x) => !isTrueFalse(x))) {
    if (q.text.startsWith('Combien')) assert.equal(q.answer, 8);
    else assert.equal(q.answer, facts[q.text], q.text);
  }
  for (const q of draw('ciel', 10)) {
    if (q.interaction === 'order') {
      const names = [...q.items].sort((a, b) => a.value - b.value).map((it) => it.label);
      assert.deepEqual(names, PLANET_NAMES.filter((n) => names.includes(n)), q.key);
      continue;
    }
    if (q.stage.drawing.mark !== null) assert.equal(q.answer, PLANET_NAMES[q.stage.drawing.mark]);
    else {
      const [, a, b] = q.text.match(/entre (.+) et (.+) \?/);
      assert.equal(PLANET_NAMES.indexOf(q.answer), PLANET_NAMES.indexOf(a) + 1, q.text);
      assert.equal(PLANET_NAMES.indexOf(b), PLANET_NAMES.indexOf(a) + 2, q.text);
    }
  }
});

test('le ciel, niveaux 8 et 9 : la Terre tourne, les saisons', () => {
  assert.deepEqual(Object.fromEntries(DURATIONS.map((d) => [d.answer, d.text.includes('Lune') ? 'Lune' : d.text.includes('tour du Soleil') ? 'Soleil' : 'elle-même'])),
    { 'un jour': 'elle-même', 'un an': 'Soleil', 'un mois': 'Lune' });
  for (const q of draw('ciel', 8).filter((x) => !isTrueFalse(x))) {
    if (q.stage.type === 'drawing') {
      const { angle } = q.stage.drawing;
      // le Soleil est à gauche : la maison est du côté du jour si elle est à gauche de la Terre
      assert.equal(q.answer, Math.cos((angle * Math.PI) / 180) < 0 ? 'le jour' : 'la nuit', q.key);
    } else if (q.text.startsWith('Combien')) assert.equal(q.answer, DURATIONS.find((d) => d.text === q.text).answer);
    else assert.ok(['à l’est', 'à l’ouest'].includes(q.answer));
  }
  for (const s of SEASON_SCENES) assert.equal(s.answer, /longues et|neuf heures|très haut/.test(s.text) ? 'l’été' : 'l’hiver', s.text);
  for (const q of draw('ciel', 9).filter((x) => !isTrueFalse(x))) {
    if (q.stage.type === 'drawing') assert.equal(q.answer, q.stage.drawing.season === 'ete' ? 'l’été' : 'l’hiver');
    else assert.equal(q.answer, SEASON_SCENES.find((s) => s.text === q.text).answer);
  }
});

// ------------------------------------------------------------------ La météo : données justes

test('la météo, niveaux 1 et 2 : les symboles, s’habiller', () => {
  for (const q of draw('meteo', 1)) {
    const w = WEATHER.find((x) => q.text.startsWith(x.says));
    assert.equal(q.answer, w.id);
    // le soleil et « soleil et nuages » ne sont jamais proposés ensemble
    const ids = q.choices.map((c) => c.value);
    assert.ok(!(ids.includes('soleil') && ids.includes('nuages')), q.key);
  }
  for (const q of draw('meteo', 2)) {
    const item = CLOTHES.find((c) => c.text === q.text);
    assert.ok(item.good.some((g) => g.name === q.answer));
    for (const c of q.choices) if (c.value !== q.answer) assert.ok(item.bad.some((b) => b.name === c.value) && !item.good.some((g) => g.name === c.value));
  }
  // les lunettes de soleil ne sont jamais une mauvaise réponse pour la neige (on en met au ski)
  assert.ok(!CLOTHES.find((c) => c.emoji === '❄️').bad.some((b) => /lunettes/.test(b.name)));
});

test('la météo, niveaux 3 à 6 : la pluie, le vent, l’orage, l’arc-en-ciel', () => {
  assert.deepEqual(WATER_CYCLE.map((w) => w.label), ['la mer', 'le nuage', 'la pluie', 'la rivière']);
  for (const q of draw('meteo', 3).filter((x) => x.interaction === 'order')) {
    for (const it of q.items) assert.equal(WATER_CYCLE[it.value].label, it.label);
  }
  for (const q of draw('meteo', 4).filter((x) => !isTrueFalse(x))) {
    if (q.stage.drawing?.kind === 'manche') assert.equal(q.answer, WIND_FORCES[q.stage.drawing.force]);
    else if (q.choiceStyle === 'drawings') assert.equal(INSTRUMENTS[q.answer].ask, q.text);
    else assert.ok(['le voilier', 'le cerf-volant'].includes(q.answer));
  }
  for (const q of draw('meteo', 5).filter((x) => !isTrueFalse(x))) {
    if (q.choiceStyle === 'pictures') assert.equal(q.answer, 'dans la maison');
    else assert.equal(q.answer, STORM_PAIRS.find((p) => p.text === q.text).answer);
  }
  assert.equal(STORM_PAIRS.find((p) => p.text.includes('en premier')).answer, 'l’éclair');
  for (const q of draw('meteo', 6).filter((x) => !isTrueFalse(x))) {
    assert.ok(['le soleil et la pluie', 'dans ton dos'].includes(q.answer), q.answer);
  }
});

test('la météo, niveaux 7 et 8 : lire le thermomètre, chaud ou froid, le gel', () => {
  for (const q of draw('meteo', 7)) {
    const { value, min, max, minor } = q.stage.drawing;
    assert.deepEqual([min, max, minor], [-10, 40, 5]);
    if (q.text.startsWith('Quelle')) {
      assert.equal(q.answer, value);
      assert.equal(value % 5, 0);
      for (const c of q.choices) assert.ok(c.value % 5 === 0 && c.value >= 0 && c.value <= 40, q.key);
    } else if (q.text.includes('geler')) {
      assert.notEqual(value, 0);
      assert.equal(q.answer, value < 0 ? 'oui' : 'non');
    } else {
      assert.ok(value >= 25 || value <= 5, q.key);
      assert.equal(q.answer, value >= 25 ? 'chaud' : 'froid');
    }
  }
  for (const q of draw('meteo', 8)) {
    const { value, min, max, minor } = q.stage.drawing;
    assert.equal(minor, 1);
    assert.equal(max - min, 20);
    assert.equal(q.answer, value);
    assert.ok(value > min && value < max && value % 5 !== 0, q.key);
    for (const c of q.choices) assert.ok(c.value >= min && c.value <= max && Math.abs(c.value - value) <= 2, q.key);
    // les réponses sont rangées dans l'ordre croissant
    assert.deepEqual(q.choices.map((c) => c.value), [...q.choices.map((c) => c.value)].sort((a, b) => a - b));
  }
});

test('la météo, niveau 9 : le bulletin de la semaine', () => {
  for (let i = 0; i < 200; i++) {
    const days = makeWeek(createRng(i));
    assert.deepEqual(days.map((d) => d.day), WEEK);
    assert.equal(new Set(days.map((d) => d.w)).size, 5);
    assert.equal(new Set(days.map((d) => d.t)).size, 5);
    assert.ok(days.every((d) => d.t >= 0), 'jamais sous zéro');
    // pas de neige en été, pas d'orage en hiver
    assert.ok(!(days.some((d) => d.w === 'neige') && days.some((d) => d.t > 15)));
  }
  for (const q of draw('meteo', 9)) {
    const { days } = q.stage.drawing;
    const find = (day) => days.find((d) => d.day === day);
    if (q.choiceStyle === 'pictures') {
      const day = WEEK.find((d) => q.text === `Quel temps fait-il ${d} ?`);
      assert.equal(q.answer, find(day).w);
    } else if (q.text.includes('le plus')) {
      const temps = days.map((d) => d.t);
      assert.equal(find(q.answer).t, q.text.includes('chaud') ? Math.max(...temps) : Math.min(...temps));
      // les jours proposés sont dans l'ordre de la semaine
      assert.deepEqual(q.choices.map((c) => c.value), WEEK.filter((d) => q.choices.some((c) => c.value === d)));
    } else {
      const w = Object.keys(WHICH_DAY).find((k) => WHICH_DAY[k] === q.text);
      assert.equal(find(q.answer).w, w, q.key);
      assert.equal(days.filter((d) => d.w === w).length, 1);
    }
    assert.match(q.stage.label, /^La météo de la semaine\. Lundi : /);
  }
});

test('la météo, niveau 10 : un peu de tout', () => {
  const kinds = new Set(draw('meteo', 10).map((q) => q.key.split(':')[1]));
  assert.ok(kinds.size >= 8, [...kinds].join(', '));
});
