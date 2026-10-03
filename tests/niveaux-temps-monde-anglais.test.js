// Les 3 niveaux ajoutés à la fin des jeux de mesures, du monde et d'anglais.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findGame } from '../app/js/games/index.js';
import { DAYS, MONTHS } from '../app/js/games/monde.js';
import { levelRange } from '../app/js/programs.js';
import { createRng } from '../app/js/random.js';
import { COLOUR_PHRASES } from '../app/js/data/anglais-data.js';

const LEVEL_COUNTS = {
  calendrier: 7, monnaie: 7, mesures: 8, saisons: 7, 'animaux-monde': 7, pays: 6,
  ecoute: 13, 'lis-anglais': 13, 'mot-anglais': 13, 'relie-anglais': 13, 'compte-anglais': 7,
  'ou-est': 6, 'epelle-anglais': 13, 'parle-anglais': 6,
};

/** Les questions d'un niveau, tirées avec une graine fixe. */
function draw(id, level, runs = 200) {
  const game = findGame(id);
  const rng = createRng(4321 + level);
  return Array.from({ length: runs }, (_, i) => game.generate(level, rng, i, { name: 'Zoé' }));
}

test('nouveaux niveaux : libellés courts, au programme du CE1', () => {
  for (const [id, count] of Object.entries(LEVEL_COUNTS)) {
    const game = findGame(id);
    assert.equal(game.levels.length, count, id);
    for (const label of game.levels.slice(-3)) assert.ok([...label].length <= 26, `${id} : « ${label} » trop long`);
    assert.equal(levelRange('CE1', id).max, count, `${id} : les nouveaux niveaux doivent être accessibles en CE1`);
  }
});

test('calendrier : après-demain, le premier lundi du mois, passer au mois suivant', () => {
  const shifts = { 'Après-demain': 2, 'Avant-hier': -2, 'Dans 3 jours': 3, 'Il y a 3 jours': -3 };
  for (const q of draw('calendrier', 5)) {
    const [, today, lead] = q.text.match(/c’est (\S+)\. (.+), (ce sera|c’était)…$/);
    assert.equal(q.answer, DAYS[(DAYS.indexOf(today) + shifts[lead] + 7) % 7], q.text);
    assert.equal(q.choices.length, 4, q.text);
  }
  const ordinals = ['premier', 'deuxième', 'troisième', 'dernier'];
  for (const q of draw('calendrier', 6)) {
    const { firstWeekday, days, mark } = q.stage;
    assert.equal(mark, undefined, 'aucune date entourée : il faut la trouver');
    const [, ordinal, weekday] = q.text.match(/^Le (\S+) (\S+) /);
    const weekdayOf = (d) => DAYS[(firstWeekday + d - 1) % 7];
    assert.equal(weekdayOf(q.answer), weekday, q.text);
    const sameDay = Array.from({ length: days }, (_, i) => i + 1).filter((d) => weekdayOf(d) === weekday);
    const rank = ordinals.indexOf(ordinal);
    assert.equal(q.answer, rank === 3 ? sameDay.at(-1) : sameDay[rank], q.text);
  }
  for (const q of draw('calendrier', 7)) {
    const { mark: date, days, month } = q.stage;
    const shift = q.text.includes('une semaine') ? 7 : Number(q.text.match(/Dans (\d) jours/)[1]);
    assert.ok(date + shift > days, `le mois doit changer : ${q.text}`);
    const next = (MONTHS.indexOf(month) + 1) % 12;
    assert.equal(q.answer, `${date + shift - days}-${next}`, q.text);
  }
});

test('monnaie : que peux-tu acheter, payer deux objets, retrouver le prix', () => {
  for (const q of draw('monnaie', 5)) {
    const money = q.stage.items.reduce((a, b) => a + b, 0);
    const prices = q.choices.map((c) => Number(c.label.match(/(\d+)\u00a0€/)[1]));
    const affordable = q.choices.filter((_, i) => prices[i] <= money);
    assert.deepEqual(affordable.map((c) => c.value), [q.answer], `un seul objet pas trop cher (${money} €) : ${prices}`);
  }
  for (const q of draw('monnaie', 6)) {
    const [a, b] = q.stage.text.match(/\d+/g).map(Number);
    assert.equal(q.interaction, 'pay');
    assert.equal(q.answer, a + b, q.stage.text);
  }
  for (const q of draw('monnaie', 7)) {
    const change = Number(q.text.match(/On te rend (\d+) €/)[1]);
    assert.equal(q.stage.price, '?', 'le prix est caché');
    assert.equal(q.stage.paid - change, q.answer, q.text);
    assert.ok(!/(?<!\d)1 euros|crayons coûte /.test(JSON.stringify(q)), q.instruction);
  }
});

test('mesures : estimer, convertir, comparer des mesures dans deux unités', () => {
  const toBase = (label) => {
    const [n, unit] = label.split(' ');
    return Number(n) * ({ m: 100, cm: 1, kg: 1000, g: 1, km: 100000 }[unit]);
  };
  for (const q of draw('mesures', 6)) assert.ok(q.choices.some((c) => c.value === q.answer) && q.stage.emoji, q.text);
  for (const q of draw('mesures', 7)) {
    const [left, right] = q.stage.text.split(' = ');
    const unit = right.split('\u00a0')[1];
    const answer = q.choices.find((c) => c.value === q.answer).label;
    assert.equal(answer.split(' ')[1], unit, q.stage.text);
    assert.equal(toBase(answer), toBase(left.replace('\u00a0', ' ')), `${q.stage.text} → ${answer}`);
  }
  for (const q of draw('mesures', 8)) {
    const sizes = q.choices.map((c) => toBase(c.label));
    assert.equal(new Set(sizes).size, 3, 'trois mesures différentes');
    assert.ok(q.choices.some((c) => / (m|kg)$/.test(c.label)) && q.choices.some((c) => / (cm|g)$/.test(c.label)), 'deux unités');
    const most = /plus (long|lourd)/.test(q.text);
    const expected = q.choices[sizes.indexOf(most ? Math.max(...sizes) : Math.min(...sizes))].value;
    assert.equal(q.answer, expected, `${q.text} ${q.choices.map((c) => c.label)}`);
  }
});

test('le temps qui passe : ordre des saisons, mois et saisons, durées', () => {
  const seasons = ['l’hiver', 'le printemps', 'l’été', 'l’automne'];
  for (const q of draw('saisons', 5)) {
    const [, way, season] = q.text.match(/vient (après|avant) (.+) \?$/);
    assert.equal(q.answer, seasons[(seasons.indexOf(season) + (way === 'après' ? 1 : 3)) % 4], q.text);
  }
  const bySeason = { janvier: 0, février: 0, avril: 1, mai: 1, juillet: 2, août: 2, octobre: 3, novembre: 3, Noël: 0, Pâques: 1, Halloween: 3 };
  for (const q of draw('saisons', 6)) {
    const clue = Object.keys(bySeason).find((k) => q.text.includes(k));
    if (clue) assert.equal(q.answer, seasons[bySeason[clue]], q.text);
    assert.equal(q.choices.length, 4);
  }
  const units = ['une seconde', 'une minute', 'une heure', 'un jour', 'une semaine', 'un mois', 'une année'];
  for (const q of draw('saisons', 7)) {
    const ranks = q.choices.map((c) => units.indexOf(c.value));
    if (ranks.includes(-1)) continue;
    const longest = q.text.includes('plus longtemps');
    assert.equal(q.answer, units[longest ? Math.max(...ranks) : Math.min(...ranks)], q.text);
  }
});

test('les animaux : le cri, la maison, poils, plumes ou écailles', () => {
  const cries = { aboie: 'le chien', miaule: 'le chat', meugle: 'la vache', hennit: 'le cheval', rugit: 'le lion', siffle: 'le serpent' };
  for (const q of draw('animaux-monde', 5)) {
    const cry = q.text.match(/^Qui (\S+) \?$/)[1];
    if (cries[cry]) assert.equal(q.answer, cries[cry], q.text);
  }
  const houses = { 'du chien': 'la niche', 'de la poule': 'le poulailler', 'du cheval': 'l’écurie', 'de la vache': 'l’étable' };
  for (const q of draw('animaux-monde', 6)) {
    const who = Object.keys(houses).find((k) => q.text.includes(`maison ${k} `));
    if (who) assert.equal(q.answer, houses[who], q.text);
    assert.equal(new Set(q.choices.map((c) => c.value)).size, 3);
  }
  const covers = { '🐔': 'plumes', '🦉': 'plumes', '🐍': 'écailles', '🐊': 'écailles', '🦁': 'poils', '🐶': 'poils' };
  for (const q of draw('animaux-monde', 7)) if (covers[q.stage.emoji]) assert.equal(q.answer, covers[q.stage.emoji], q.text);
});

test('les pays : habitants, bonjour dans le monde, capitales', () => {
  const capitals = { 'de la France': 'Paris', 'du Japon': 'Tokyo', 'de l’Italie': 'Rome', 'des États-Unis': 'Washington' };
  for (const q of draw('pays', 6)) {
    const country = Object.keys(capitals).find((k) => q.text.endsWith(`${k} ?`));
    if (country) assert.equal(q.answer, capitals[country], q.text);
  }
  for (const q of draw('pays', 4)) assert.ok(q.choices.every((c) => c.label.startsWith('les ')), q.text);
  const languages = { 'Hola !': 'espagnol', 'Ciao !': 'italien', 'Konnichiwa !': 'japonais', 'Guten Tag !': 'allemand' };
  for (const q of draw('pays', 5)) {
    if (languages[q.stage.text]) assert.equal(q.answer, languages[q.stage.text], q.stage.text);
    assert.ok(q.replay.length === 1, 'on peut réentendre le mot');
  }
});

test('anglais : petites phrases « a green book », tous les thèmes, mots proches', () => {
  assert.equal(new Set(COLOUR_PHRASES.map((p) => p.emoji)).size, COLOUR_PHRASES.length, 'une image par phrase');
  assert.ok(COLOUR_PHRASES.some((p) => p.en === 'an orange book'), 'an devant orange');
  assert.ok(COLOUR_PHRASES.some((p) => p.fr === 'la pomme verte'), 'accord en français');
  for (const id of ['ecoute', 'lis-anglais', 'mot-anglais']) {
    for (const q of draw(id, 13)) {
      const target = COLOUR_PHRASES.find((p) => p.en === q.answer);
      assert.ok(target, `${id} : ${q.answer}`);
      const others = q.choices.filter((c) => c.value !== q.answer).map((c) => COLOUR_PHRASES.find((p) => p.en === c.value));
      assert.ok(others.some((p) => p.thing === target.thing || p.colour === target.colour), `${id} : distracteurs trop faciles`);
    }
  }
  for (const q of draw('ecoute', 12)) assert.equal(q.choices.length, 4, 'ecoute : 4 images au niveau 12');
  for (const q of draw('lis-anglais', 12)) {
    assert.ok(q.stage.text.length <= 8, `mot trop long pour l'écran : ${q.stage.text}`);
    const close = q.choices.filter((c) => c.value !== q.answer && (c.value[0] === q.answer[0] || Math.abs(c.value.length - q.answer.length) <= 1));
    assert.ok(close.length >= 2, `lis-anglais : mots pas assez proches de ${q.answer}`);
  }
  for (const q of draw('relie-anglais', 12)) assert.ok(q.pairs.every((p) => !p.emoji && !p.swatch && p.left), 'sans image');
  for (const q of draw('relie-anglais', 13)) {
    const phrases = q.pairs.map((p) => COLOUR_PHRASES.find((x) => x.en === p.right));
    assert.equal(new Set(phrases.map((p) => p.thing)).size, 2, '2 objets');
    assert.equal(new Set(phrases.map((p) => p.colour)).size, 2, '2 couleurs');
  }
  for (const q of draw('epelle-anglais', 12)) assert.equal(q.stage.type, 'listen');
  for (const q of draw('epelle-anglais', 13)) {
    assert.equal(q.replay, undefined, 'pas de son : il faut se souvenir du mot');
    assert.ok(!JSON.stringify(q.instruction).includes(q.answer), q.answer);
    assert.ok(['picture', 'swatch'].includes(q.stage.type));
  }
});

test('anglais : nombres jusqu’à twenty et calculs, qui est où, parler', () => {
  const words = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  for (const q of draw('compte-anglais', 5)) assert.ok(q.answer >= 11 && q.answer <= 20 && q.replay[0].text.includes('teen') === (q.answer >= 13 && q.answer <= 19));
  for (const q of draw('compte-anglais', 6)) assert.equal(q.stage.count, q.answer);
  for (const q of draw('compte-anglais', 7)) {
    const [a, op, b] = q.stage.text.split(' ');
    const expected = op === '+' ? words.indexOf(a) + words.indexOf(b) + 2 : words.indexOf(a) - words.indexOf(b);
    assert.equal(q.answer, expected, q.stage.text);
    assert.ok(q.answer >= 1 && q.answer <= 10, q.stage.text);
  }
  for (const level of [4, 5, 6]) {
    for (const q of draw('ou-est', level)) {
      const said = q.success.speak[0].text; // « The cat is under the table. »
      const answer = q.choices.find((c) => c.value === q.answer);
      assert.ok(said.startsWith(`The ${answer.value.split(':')[0]} is`), said);
      assert.equal(new Set(q.choices.map((c) => c.scene.who)).size, 2, 'deux animaux');
      assert.equal(new Set(q.choices.map((c) => c.scene.where)).size, 2, 'deux endroits');
      if (level === 6) assert.ok(q.replay[1].text.includes(answer.value.split(':')[0]), 'la question porte sur le bon animal');
    }
  }
  for (const q of draw('parle-anglais', 5)) {
    const pairs = { 'It’s red.': 'What colour is it?', 'Yes, I do!': 'Do you like ice cream?', 'My name is Zoé.': 'What’s your name?' };
    if (pairs[q.stage.text]) assert.equal(q.answer, pairs[q.stage.text]);
  }
  for (const q of draw('parle-anglais', 6)) {
    assert.ok(q.stage.text.includes('___'), q.stage.text);
    assert.ok(!q.stage.text.includes('Lou'), 'le prénom de l’enfant, pas un prénom en dur');
    assert.equal(q.success.speak[0].text, q.stage.text.replace('___', q.answer));
  }
});
