// « La carte du monde » : l'enfant touche une zone de la carte (continent, océan, mer, pays,
// capitale). Les contours sont dans data/carte-data.js ; le dessin et le toucher dans main.js
// (mapZone). Deux cartes : le monde entier, et l'Europe agrandie (les petits pays d'une carte
// ont un point touchable, assez grand pour un doigt).

import { pick, sample, shuffle } from '../random.js';
import { FLAGS } from './drapeaux.js';
import {
  CONTINENTS, COUNTRIES, EUROPE_DRAWN, EUROPE_TARGETS, OCEANS, SEAS, WORLD_TARGETS, atIn, toXY,
} from '../data/carte-data.js';

/** « l’Afrique » → « L’Afrique » */
function capitalize(text) {
  return `${text[0].toUpperCase()}${text.slice(1)}`;
}

const is = (c) => (c.plural ? 'sont' : 'est');
const label = (id) => (id.startsWith('cap-') ? COUNTRIES[id.slice(4)].capital[0] : (COUNTRIES[id] || CONTINENTS[id] || OCEANS[id] || SEAS[id]).label);
const zoneChoices = (ids) => ids.map((id) => ({ value: id, label: label(id) }));

/** La carte d'un pays : l'Europe agrandie pour les pays d'Europe (et le Maroc), le monde sinon. */
export const viewOf = (id) => (EUROPE_TARGETS.includes(id) ? 'europe' : 'monde');
const drawnIn = (view) => (view === 'europe' ? EUROPE_DRAWN : WORLD_TARGETS);

/** Une question « touche la carte » : les zones touchables sont aussi les choix possibles. */
function mapQuestion({ key, text, instruction = text, short, view, layer, zones, answer, success, clue, start, extra = {} }) {
  return {
    key,
    text,
    instruction,
    ...(short ? { short } : {}),
    stage: { type: 'map', view, layer, zones, ...(start ? { start } : {}), ...extra },
    interaction: 'map',
    choices: zoneChoices(zones),
    answer,
    clue,
    success: { speak: success },
  };
}

/** Tirage pondéré : les éléments de `easy` sortent trois fois plus souvent. */
function weighted(rng, items, easy) {
  return pick(rng, items.flatMap((id) => (easy.includes(id) ? [id, id, id] : [id])));
}

// ---------------------------------------------------------------- 1. Les continents

function continents(rng) {
  const id = pick(rng, Object.keys(CONTINENTS));
  const c = CONTINENTS[id];
  return mapQuestion({
    key: `carte:continent:${id}`,
    text: `Touche ${c.name}.`,
    view: 'monde',
    layer: 'continents',
    zones: Object.keys(CONTINENTS),
    answer: id,
    clue: { icon: '🌍', text: c.label },
    success: `Oui, voici ${c.name} !`,
  });
}

// ---------------------------------------------------------------- 2. Les océans

const OCEAN_FACTS = {
  pacifique: 'C’est le plus grand océan du monde.',
  atlantique: 'Il est entre l’Amérique, l’Europe et l’Afrique.',
  indien: 'Il est au sud de l’Inde.',
  arctique: 'Il est tout au nord, autour du pôle Nord.',
  austral: 'Il entoure l’Antarctique.',
};

function oceans(rng) {
  const id = weighted(rng, Object.keys(OCEANS), ['pacifique', 'atlantique', 'indien']);
  const o = OCEANS[id];
  return mapQuestion({
    key: `carte:ocean:${id}`,
    text: `Touche ${o.name}.`,
    view: 'monde',
    layer: 'oceans',
    zones: [...Object.keys(OCEANS), 'mediterranee'],
    answer: id,
    clue: { icon: '🌊', text: o.label },
    success: [`Oui, c’est ${o.name} !`, OCEAN_FACTS[id]],
  });
}

// ---------------------------------------------------------------- 3. Où est la France ?

const FRENCH_SEAS = {
  mediterranee: 'Oui ! La mer Méditerranée est au sud de la France.',
  atlantique: 'Oui ! L’océan Atlantique est à l’ouest de la France.',
  'mer-du-nord': 'Oui ! La mer du Nord est au nord de la France.',
};

function france(rng) {
  const r = rng();
  if (r < 0.45) {
    return mapQuestion({
      key: 'carte:france:europe',
      text: 'Touche la France.',
      view: 'europe',
      layer: 'countries',
      zones: EUROPE_DRAWN,
      answer: 'fr',
      clue: { icon: '📍', text: 'France' },
      success: 'Oui, voici la France !',
    });
  }
  if (r < 0.65) {
    return mapQuestion({
      key: 'carte:france:monde',
      text: 'Touche la France sur la carte du monde.',
      view: 'monde',
      layer: 'countries',
      zones: WORLD_TARGETS,
      answer: 'fr',
      clue: { icon: '📍', text: 'France' },
      success: 'Oui ! La France est en Europe.',
    });
  }
  const id = pick(rng, Object.keys(FRENCH_SEAS));
  return mapQuestion({
    key: `carte:france:${id}`,
    text: `Touche ${SEAS[id].name}.`,
    view: 'europe',
    layer: 'seas',
    zones: ['atlantique', 'mer-du-nord', 'mediterranee', 'baltique'],
    answer: id,
    clue: { icon: '🌊', text: SEAS[id].label },
    success: FRENCH_SEAS[id],
  });
}

// ---------------------------------------------------------------- 4 et 5. Les pays

const EUROPE_QUIZ = EUROPE_TARGETS.filter((id) => id !== 'fr' && id !== 'ma');
const EUROPE_EASY = ['es', 'it', 'de', 'gb', 'pt', 'be', 'ch'];
const WORLD_QUIZ = WORLD_TARGETS.filter((id) => id !== 'fr');
const WORLD_EASY = ['us', 'ca', 'br', 'cn', 'ru', 'au', 'in'];

/** « La Russie est en Europe et en Asie. » */
function whereIs(id) {
  const c = COUNTRIES[id];
  const where = c.both ? 'en Europe et en Asie' : CONTINENTS[c.continent].en;
  return `${capitalize(c.name)} ${is(c)} ${where}.`;
}

function country(rng, level) {
  const view = level === 4 ? 'europe' : 'monde';
  const id = level === 4 ? weighted(rng, EUROPE_QUIZ, EUROPE_EASY) : weighted(rng, WORLD_QUIZ, WORLD_EASY);
  const c = COUNTRIES[id];
  return mapQuestion({
    key: `carte:pays:${id}`,
    text: `Touche ${c.name}.`,
    view,
    layer: 'countries',
    zones: drawnIn(view),
    answer: id,
    clue: { icon: '📍', text: c.label },
    success: level === 4 ? [`Oui, c’est ${c.name} !`, `Sa capitale est ${c.capital[0]}.`] : [`Oui, c’est ${c.name} !`, whereIs(id)],
  });
}

// ---------------------------------------------------------------- 6. Le pays du drapeau

const FLAG_COUNTRIES = [...EUROPE_TARGETS, ...WORLD_QUIZ].filter((id) => FLAGS[id]);

function flag(rng) {
  const id = pick(rng, FLAG_COUNTRIES);
  const view = viewOf(id);
  return mapQuestion({
    key: `carte:drapeau:${id}`,
    text: 'Touche le pays de ce drapeau.',
    instruction: 'Regarde bien ce drapeau. Touche son pays sur la carte.',
    short: { key: 'carte:drapeau', text: 'Le pays de ce drapeau ?' },
    view,
    layer: 'countries',
    zones: drawnIn(view),
    answer: id,
    clue: { flag: id },
    success: `Oui, c’est le drapeau ${COUNTRIES[id].de} !`,
  });
}

// ---------------------------------------------------------------- 7. L'animal et son continent

export const MAP_ANIMALS = [
  { emoji: '🦘', name: 'le kangourou', continent: 'oceanie' },
  { emoji: '🐨', name: 'le koala', continent: 'oceanie' },
  { emoji: '🦁', name: 'le lion', continent: 'afrique' },
  { emoji: '🦒', name: 'la girafe', continent: 'afrique' },
  { emoji: '🦓', name: 'le zèbre', continent: 'afrique' },
  { emoji: '🦛', name: 'l’hippopotame', continent: 'afrique' },
  { emoji: '🐼', name: 'le panda', continent: 'asie' },
  { emoji: '🐅', name: 'le tigre', continent: 'asie' },
  { emoji: '🦙', name: 'le lama', continent: 'amerique-sud' },
  { emoji: '🦜', name: 'le perroquet ara', continent: 'amerique-sud' },
  { emoji: '🦬', name: 'le bison d’Amérique', continent: 'amerique-nord' },
  { emoji: '🦝', name: 'le raton laveur', continent: 'amerique-nord' },
  { emoji: '🐧', name: 'le manchot empereur', continent: 'antarctique' },
];

function animal(rng) {
  const a = pick(rng, MAP_ANIMALS);
  return mapQuestion({
    key: `carte:animal:${a.name}`,
    text: `Où vit ${a.name} ? Touche son continent.`,
    short: { key: 'carte:animal', text: `Où vit ${a.name} ?` },
    view: 'monde',
    layer: 'continents',
    zones: Object.keys(CONTINENTS),
    answer: a.continent,
    clue: { emoji: a.emoji, text: capitalize(a.name) },
    success: `Oui, ${a.name} vit ${CONTINENTS[a.continent].en} !`,
  });
}

// ---------------------------------------------------------------- 8. La capitale sur la carte

const CAPITAL_RADIUS = { europe: 2, monde: 11 }; // rayon touchable d'une étoile (unités de la carte)
const cityXY = (id) => toXY(COUNTRIES[id].capital[1], COUNTRIES[id].capital[2]);
const far = (view, a, b) => {
  const [[xa, ya], [xb, yb]] = [cityXY(a), cityXY(b)];
  return Math.hypot(xa - xb, ya - yb) >= CAPITAL_RADIUS[view] * 2.3;
};

function capital(rng) {
  const view = rng() < 0.6 ? 'europe' : 'monde';
  const pool = view === 'europe' ? EUROPE_TARGETS : WORLD_QUIZ;
  const id = weighted(rng, pool, view === 'europe' ? ['fr', ...EUROPE_EASY] : WORLD_EASY);
  // trois autres capitales, assez loin les unes des autres pour qu'un doigt ne les confonde pas
  const cities = [id];
  for (const other of shuffle(rng, pool)) {
    if (cities.length === 4) break;
    if (cities.every((c) => far(view, c, other))) cities.push(other);
  }
  const c = COUNTRIES[id];
  const [city] = c.capital;
  return mapQuestion({
    key: `carte:capitale:${id}`,
    text: `Touche ${city}, la capitale ${c.de}.`,
    view,
    layer: 'capitals',
    zones: cities.map((k) => `cap-${k}`),
    answer: `cap-${id}`,
    clue: { icon: '⭐', text: city, sub: `capitale ${c.de}` },
    success: `Oui ! ${city} est la capitale ${c.de}.`,
    extra: { radius: CAPITAL_RADIUS[view] },
  });
}

// ---------------------------------------------------------------- 9. Voyage chez le voisin

// to : « va vers le nord » ; at : « au nord de la France » (« vers l’ouest », « à l’ouest »)
export const DIRECTIONS = [
  ['nord', '↑', 0], ['nord-est', '↗', 45], ['est', '→', 90], ['sud-est', '↘', 135],
  ['sud', '↓', 180], ['sud-ouest', '↙', 225], ['ouest', '←', 270], ['nord-ouest', '↖', 315],
].map(([name, arrow, angle]) => ({
  name, arrow, angle, to: name === 'ouest' ? 'vers l’ouest' : `vers le ${name}`, at: name === 'ouest' ? 'à l’ouest' : `au ${name}`,
}));

/** Cap (en degrés, 0 = vers le haut de la carte) pour aller d'un point [lon, lat] à un autre. */
export function bearing(from, to) {
  const [[x0, y0], [x1, y1]] = [toXY(...from), toXY(...to)];
  return ((Math.atan2(x1 - x0, y0 - y1) * 180) / Math.PI + 360) % 360;
}
const gap = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

/**
 * Les voyages possibles : d'un pays vers un voisin dessiné, dans l'une des 8 directions,
 * seulement si ce voisin est sans hésitation dans cette direction (à 25° près) et qu'aucun
 * autre voisin (même non dessiné) n'est à moins de 55° de cette direction.
 */
export const TRIPS = (() => {
  const trips = [];
  for (const [from, c] of Object.entries(COUNTRIES)) {
    if (from === 'lu') continue;
    for (const to of c.neighbours) {
      if (to === 'lu') continue;
      const view = EUROPE_DRAWN.includes(from) && EUROPE_DRAWN.includes(to) ? 'europe' : 'monde';
      if (!drawnIn(view).includes(from) || !drawnIn(view).includes(to)) continue;
      // la Russie déborde de la carte d'Europe : on n'y voit qu'un petit bout, pas sa vraie direction
      if (view === 'europe' && (from === 'ru' || to === 'ru')) continue;
      const angle = bearing(atIn(view, from), atIn(view, to));
      const dir = DIRECTIONS.reduce((best, d) => (gap(d.angle, angle) < gap(best.angle, angle) ? d : best));
      if (gap(dir.angle, angle) > 25) continue;
      const others = [...c.neighbours.filter((n) => n !== to).map((n) => atIn(view, n)), ...(c.others || [])];
      if (others.some((p) => gap(bearing(atIn(view, from), p), dir.angle) < 55)) continue;
      trips.push({ from, to, view, dir });
    }
  }
  return trips;
})();

function trip(rng) {
  const { from, to, view, dir } = pick(rng, TRIPS);
  const [a, b] = [COUNTRIES[from], COUNTRIES[to]];
  return mapQuestion({
    key: `carte:voyage:${from}:${to}`,
    text: `Pars ${a.de} et va ${dir.to}. Touche le pays voisin.`,
    short: { key: 'carte:voyage', text: `Pars ${a.de} et va ${dir.to}.` },
    view,
    layer: 'countries',
    zones: drawnIn(view).filter((id) => id !== from),
    start: from,
    answer: to,
    clue: { trip: { from: a.label, arrow: dir.arrow, dir: dir.name } },
    success: `Oui ! ${capitalize(b.name)} ${is(b)} ${dir.at} ${a.de}.`,
    extra: { compass: true },
  });
}

// ---------------------------------------------------------------- le jeu

const BUILDERS = [null, continents, oceans, france, (rng) => country(rng, 4), (rng) => country(rng, 5), flag, animal, capital, trip];

export const carteMonde = {
  id: 'carte-monde',
  domain: 'monde',
  title: 'La carte du monde',
  icon: '🧭',
  skill: 'Se repérer sur une carte : continents, océans, pays, capitales, voisins',
  levels: [
    'Les continents', 'Les océans', 'Où est la France ?', 'Les pays d’Europe', 'Les grands pays du monde',
    'Le pays du drapeau', 'L’animal et son continent', 'La capitale sur la carte', 'Voyage chez le voisin', 'Grand mélange',
  ],
  generate(level, rng) {
    // le grand mélange : une question d'un des niveaux 3 à 9
    const l = level >= 10 ? 3 + Math.floor(rng() * 7) : Math.max(1, level);
    return BUILDERS[l](rng);
  },
};
