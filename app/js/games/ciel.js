// « Le ciel et la Terre » et « La météo » (explorer le monde au cycle 1, questionner le monde au
// cycle 2) : le jour et la nuit, le Soleil, la Lune et ses phases, les étoiles, les planètes, la
// rotation de la Terre, les saisons, les ombres ; les symboles météo, le thermomètre, le vent, la
// pluie, l'orage, l'arc-en-ciel et le bulletin de la semaine.
// Les dessins (phases de la Lune, constellations, Terre éclairée, système solaire, ombres,
// thermomètre, manche à air, éolienne, bulletin) sont des SVG fabriqués ici par cielSvg et affichés
// par render.js (dessins de type 'drawing') : `generate` ne renvoie que des données.
// Contenu vérifié : les saisons ne viennent pas de la distance au Soleil (la Terre en est même un
// peu plus loin en juillet), le Soleil se lève du côté de l'est, la Lune ne fait pas de lumière,
// les nuages sont faits de gouttelettes. Jamais d'information portée par la couleur seule : la
// partie éclairée de la Lune est claire, l'ombre est une forme, le thermomètre a ses nombres.

import { pick, randInt, sample, shuffle } from '../random.js';

const capitalize = (text) => `${text[0].toUpperCase()}${text.slice(1)}`;
const textChoices = (values) => values.map((v) => ({ value: v, label: String(v) }));
/** Des images à toucher : l'emoji, et son nom pour les lecteurs d'écran. */
const pictureChoices = (items) => items.map((it) => ({ value: it.name, label: it.emoji, name: it.name }));
const picture = (emoji) => ({ type: 'picture', emoji });
const drawing = (d, label) => ({ type: 'drawing', drawing: d, label });
const NONE = { type: 'none' };
/** Une phrase vraie ou fausse, et ce qu'on explique ensuite. */
const vf = (emoji, text, answer, why) => ({ emoji, text, answer, why });

/**
 * Une question à réponses écrites toujours dans le même ordre (« le jour, la nuit »). `ask` est
 * la phrase qui lit les réponses à voix haute (« Le jour ou la nuit ? »), pour ceux qui ne lisent
 * pas encore.
 */
function fixed({ key, text, ask, stage = NONE, options, answer, success, style = 'words' }) {
  return {
    key,
    text,
    instruction: ask ? [text, ask] : text,
    stage,
    choices: textChoices(options),
    choiceStyle: style,
    answer,
    success: { speak: success },
  };
}

/** Vrai ou faux ? */
function trueFalse(rng, list, key) {
  const item = pick(rng, list);
  return {
    key: `${key}:${item.text}`,
    text: `${item.text} Vrai ou faux ?`,
    instruction: [item.text, 'Vrai ou faux ?'],
    stage: picture(item.emoji),
    choices: textChoices(['vrai', 'faux']),
    choiceStyle: 'words',
    answer: item.answer,
    success: { speak: [item.answer === 'vrai' ? 'C’est vrai !' : 'C’est faux !', item.why] },
  };
}

/** Une image à trouver parmi trois. */
function pictureQuestion({ key, text, instruction = text, stage = NONE, answer, others, success, rng }) {
  const options = shuffle(rng, [answer, ...others]);
  return {
    key: `${key}:${options.map((o) => o.name).join(',')}`,
    text,
    instruction,
    stage,
    choices: pictureChoices(options),
    choiceStyle: 'pictures',
    answer: answer.name,
    success: { speak: success },
  };
}

/** Une réponse écrite parmi trois (mélangées). */
function wordQuestion({ key, text, stage = NONE, answer, others, success, style = 'words', rng }) {
  return {
    key: `${key}:${[answer, ...others].join(',')}`,
    text,
    instruction: text,
    stage,
    choices: textChoices(shuffle(rng, [answer, ...others])),
    choiceStyle: style,
    answer,
    success: { speak: success },
  };
}

/** Des éléments à toucher dans l'ordre (jamais déjà rangés). */
function orderQuestion({ key, title, ask, items, success, sign, rng }) {
  let order = shuffle(rng, items.map((_, i) => i));
  if (order.every((v, i) => v === i)) order = [...order.slice(1), order[0]];
  return {
    key: `${key}:${order.join('')}`,
    interaction: 'order',
    text: `${title} ${ask}`,
    instruction: [title, ask],
    stage: NONE,
    items: order.map((i) => ({ value: i, ...items[i] })),
    order: 'asc',
    ...(sign ? { sign } : {}),
    choices: [],
    answer: null,
    success: { speak: success },
  };
}

// ================================================================= Les dessins (SVG)

const INK = '#2b2d42';
const NIGHT = '#1d2550';
const MOON = '#f6e7a1';
const MOON_DARK = '#4a5274';
const STAR = '#fff4b8';
const SUN = '#ffc531';
const SUN_LINE = '#c77700';
const SKY = '#d4ecff';
const GRASS = '#8fcf6f';
const GRASS_LINE = '#5c9a44';
const TRUNK = '#8a5a2b';
const LEAVES = '#3f9b4a';
const SHADOW = '#454b5a';
const RED = '#d6202a';
const EMOJI = 'class="dr-emoji" text-anchor="middle"';

const r2 = (x) => Math.round(x * 100) / 100;

/** Un soleil avec ses rayons. */
function sunSvg(cx, cy, r) {
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    return `<line x1="${r2(cx + Math.cos(a) * (r + 3))}" y1="${r2(cy + Math.sin(a) * (r + 3))}" x2="${r2(cx + Math.cos(a) * (r + 8))}" y2="${r2(cy + Math.sin(a) * (r + 8))}"/>`;
  }).join('');
  return `<g stroke="${SUN_LINE}" stroke-width="2.2" stroke-linecap="round">${rays}</g>`
    + `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${SUN}" stroke="${SUN_LINE}" stroke-width="1.6"/>`;
}

/** Une étoile à cinq branches. */
function starSvg(cx, cy, R, fill = STAR) {
  const points = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? R * 0.45 : R;
    return `${r2(cx + Math.cos(a) * rad)},${r2(cy + Math.sin(a) * rad)}`;
  }).join(' ');
  return `<polygon points="${points}" fill="${fill}" stroke="#c9a400" stroke-width="0.6" stroke-linejoin="round"/>`;
}

// ---------------------------------------------------------------- La Lune

/**
 * La Lune vue de France (hémisphère nord) : phase k de 0 à 7 (0 nouvelle lune, 2 premier quartier,
 * 4 pleine lune, 6 dernier quartier). La Lune croissante est éclairée à droite, la Lune
 * décroissante à gauche. La partie éclairée est limitée par le bord du disque et par une
 * demi-ellipse (le terminateur) de demi-largeur r·|cos(2πk/8)|.
 */
export function moonSvg(k, cx, cy, r) {
  const outline = k === 0 ? ' stroke-dasharray="3 2.5"' : '';
  const disc = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${MOON_DARK}" stroke="#a3abcf" stroke-width="${k === 0 ? 1.6 : 1}"${outline}/>`;
  if (k === 0) return disc;
  if (k === 4) return `${disc}<circle cx="${cx}" cy="${cy}" r="${r}" fill="${MOON}"/>`;
  const waxing = k < 4;
  const crescent = k === 1 || k === 7;
  const rx = k === 2 || k === 6 ? 0 : r2(Math.abs(Math.cos((k / 8) * 2 * Math.PI)) * r);
  // le bord éclairé : à droite (croissante) ou à gauche (décroissante) ; le terminateur revient
  // vers le haut en passant du côté éclairé (croissant) ou du côté sombre (gibbeuse)
  const outer = waxing ? 1 : 0;
  const term = waxing === crescent ? 0 : 1;
  return `${disc}<path d="M${cx} ${cy - r} A${r} ${r} 0 0 ${outer} ${cx} ${cy + r} A${rx} ${r} 0 0 ${term} ${cx} ${cy - r}Z" fill="${MOON}"/>`;
}

function moonDrawing(k) {
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="16" fill="${NIGHT}"/>`
    + `${starSvg(14, 16, 3)}${starSvg(86, 84, 2.6)}${starSvg(88, 14, 2)}${moonSvg(k, 50, 50, 34)}</svg>`;
}

/** Une suite de phases (dans l'ordre, de gauche à droite), l'une remplacée par « ? ». */
function phasesDrawing(list, gap) {
  const w = list.length * 56 + 8;
  const moons = list.map((k, i) => {
    const cx = 32 + i * 56;
    if (i === gap) {
      return `<circle cx="${cx}" cy="36" r="22" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="4 3"/>`
        + `<text x="${cx}" y="45" font-size="26" font-weight="700" text-anchor="middle" fill="#fff">?</text>`;
    }
    return moonSvg(k, cx, 36, 22);
  }).join('');
  const arrows = list.slice(1).map((_, i) => `<path d="M${56 + i * 56} 66 l6 3 l-6 3" fill="none" stroke="#c7cdea" stroke-width="1.6" stroke-linecap="round"/>`).join('');
  return `<svg viewBox="0 0 ${w} 76" aria-hidden="true"><rect width="${w}" height="76" rx="14" fill="${NIGHT}"/>${moons}${arrows}</svg>`;
}

// ---------------------------------------------------------------- Les constellations

export const CONSTELLATIONS = {
  'grande-ourse': {
    name: 'la Grande Ourse',
    stars: [[22, 80], [48, 62], [72, 52], [98, 48], [138, 34], [142, 72], [104, 80]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]],
  },
  cassiopee: {
    name: 'Cassiopée',
    stars: [[18, 34], [50, 76], [80, 46], [112, 80], [142, 32]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4]],
  },
  // Bételgeuse et Bellatrix (les épaules), les trois étoiles de la ceinture, Saïph et Rigel
  orion: {
    name: 'Orion',
    stars: [[50, 18], [112, 22], [68, 58], [80, 55], [92, 52], [52, 94], [114, 90]],
    lines: [[0, 1], [0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6]],
  },
};

function constellationDrawing(id) {
  const c = CONSTELLATIONS[id];
  const lines = c.lines.map(([a, b]) => `<line x1="${c.stars[a][0]}" y1="${c.stars[a][1]}" x2="${c.stars[b][0]}" y2="${c.stars[b][1]}"/>`).join('');
  return `<svg viewBox="0 0 160 110" aria-hidden="true"><rect width="160" height="110" rx="14" fill="${NIGHT}"/>`
    + `<g stroke="#8fa0dc" stroke-width="1.3" stroke-dasharray="3 2">${lines}</g>`
    + `${c.stars.map(([x, y]) => starSvg(x, y, 6.5)).join('')}</svg>`;
}

// ---------------------------------------------------------------- La Terre éclairée par le Soleil

/** Le Soleil à gauche, la Terre éclairée de son côté ; la maison est du côté du jour ou de la nuit. */
function earthDrawing({ angle }) {
  const [cx, cy, r] = [138, 60, 40];
  const a = (angle * Math.PI) / 180;
  const hx = r2(cx + Math.cos(a) * (r + 10));
  const hy = r2(cy + Math.sin(a) * (r + 10) + 6);
  const rays = [36, 60, 84].map((y) => `<path d="M42 ${y} H70 m-6 -4 l6 4 l-6 4" fill="none"/>`).join('');
  return `<svg viewBox="0 0 200 120" aria-hidden="true"><rect width="200" height="120" rx="14" fill="${NIGHT}"/>`
    + `<circle cx="2" cy="60" r="34" fill="${SUN}" stroke="${SUN_LINE}" stroke-width="2"/>`
    + `<g stroke="${SUN}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${rays}</g>`
    + `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#3f86d0"/>`
    + `<path d="M118 34 q14 -8 22 4 q8 10 -4 18 q-12 6 -16 -6 z M132 70 q16 -4 18 10 q0 12 -14 10 q-10 -6 -4 -20 z M158 40 q10 2 10 12 q-6 6 -12 -2 z" fill="#5cb85c"/>`
    + `<path d="M${cx} ${cy - r} A${r} ${r} 0 0 1 ${cx} ${cy + r} Z" fill="#0b1030" opacity="0.72"/>`
    + `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#9fb4e6" stroke-width="1.4"/>`
    + `<text x="${hx}" y="${hy}" font-size="18" ${EMOJI}>🏠</text></svg>`;
}

// ---------------------------------------------------------------- Le système solaire

/** Les huit planètes, dans l'ordre depuis le Soleil (tailles du dessin : les géantes sont grosses). */
export const PLANETS = [
  { name: 'Mercure', r: 3, color: '#a9a9a9' },
  { name: 'Vénus', r: 5, color: '#e8cf8e' },
  { name: 'la Terre', r: 5.5, color: '#3f86d0' },
  { name: 'Mars', r: 4, color: '#d2643c' },
  { name: 'Jupiter', r: 14, color: '#d9b38c' },
  { name: 'Saturne', r: 11, color: '#e6cf8a' },
  { name: 'Uranus', r: 8, color: '#9fe0e6' },
  { name: 'Neptune', r: 8, color: '#4f6fdc' },
];
export const PLANET_NAMES = PLANETS.map((p) => p.name);
const PLANET_X = [34, 50, 67, 83, 112, 158, 202, 234];

function systemDrawing(mark) {
  const cy = 50;
  const planets = PLANETS.map((p, i) => {
    const x = PLANET_X[i];
    const ring = p.name === 'Saturne'
      ? `<ellipse cx="${x}" cy="${cy}" rx="${p.r * 1.9}" ry="${p.r * 0.5}" fill="none" stroke="#c9b06a" stroke-width="2.4"/>`
      : '';
    const body = `<circle cx="${x}" cy="${cy}" r="${p.r}" fill="${p.color}" stroke="#ffffff" stroke-width="0.7"/>`;
    const marked = i === mark
      ? `<circle cx="${x}" cy="${cy}" r="${p.r + 5}" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="3 2"/>`
        + `<text x="${x}" y="${cy - p.r - 9}" font-size="15" font-weight="700" text-anchor="middle" fill="#fff">?</text>`
      : '';
    return body + ring + marked;
  }).join('');
  return `<svg viewBox="0 0 252 92" aria-hidden="true"><rect width="252" height="92" rx="14" fill="${NIGHT}"/>`
    + `<circle cx="-14" cy="${cy}" r="36" fill="${SUN}" stroke="${SUN_LINE}" stroke-width="2"/>${planets}</svg>`;
}

// ---------------------------------------------------------------- Les ombres et le chemin du Soleil

const SUN_SPOTS = { gauche: [20, 58], haut: [80, 15], droite: [140, 58] };

/** Un arbre au soleil : le Soleil (s'il est dessiné) et l'ombre (si elle est dessinée). */
function shadowDrawing({ sun, shadow }) {
  const mirror = (d) => (shadow === 'gauche' ? `<g transform="translate(160 0) scale(-1 1)">${d}</g>` : d);
  let shade = '';
  if (shadow === 'courte') shade = `<ellipse cx="82" cy="91" rx="15" ry="4" fill="${SHADOW}" opacity="0.8"/>`;
  else if (shadow) shade = mirror(`<path d="M80 88 L126 89.5 L126 94.5 L80 92 Z" fill="${SHADOW}" opacity="0.8"/><ellipse cx="139" cy="92" rx="17" ry="5.5" fill="${SHADOW}" opacity="0.8"/>`);
  const sunPart = sun ? sunSvg(...SUN_SPOTS[sun], 10) : '';
  return `<svg viewBox="0 0 160 110" aria-hidden="true"><rect width="160" height="110" rx="14" fill="${SKY}"/>`
    + `<path d="M0 88 H160 V96 Q160 110 146 110 H14 Q0 110 0 96 Z" fill="${GRASS}" stroke="${GRASS_LINE}" stroke-width="1"/>`
    + `${shade}<rect x="76" y="58" width="8" height="32" fill="${TRUNK}" stroke="#5e3b1a" stroke-width="1"/>`
    + `<g fill="${LEAVES}" stroke="#2a6b33" stroke-width="1"><circle cx="69" cy="54" r="12"/><circle cx="91" cy="54" r="12"/><circle cx="80" cy="44" r="16"/></g>`
    + `${sunPart}</svg>`;
}

/** Le chemin du Soleil dans le ciel en un jour : haut et long en été, bas et court en hiver. */
function sunPathDrawing(season) {
  const [x0, x1, ctrl, peak] = season === 'ete' ? [10, 190, -56, 20] : [55, 145, 30, 63];
  return `<svg viewBox="0 0 200 120" aria-hidden="true"><rect width="200" height="120" rx="14" fill="${SKY}"/>`
    + `<path d="M0 96 H200 V106 Q200 120 186 120 H14 Q0 120 0 106 Z" fill="${GRASS}" stroke="${GRASS_LINE}" stroke-width="1"/>`
    + `<path d="M${x0} 96 Q100 ${ctrl} ${x1} 96" fill="none" stroke="${SUN_LINE}" stroke-width="2" stroke-dasharray="4 4"/>`
    + `<g stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"><rect x="18" y="80" width="22" height="16" fill="#fff3d6"/><path d="M15 81 L29 69 L43 81 Z" fill="#e0664a"/></g>`
    + `${sunSvg(100, peak, 9)}</svg>`;
}

// ---------------------------------------------------------------- Le thermomètre

/**
 * Thermomètre gradué : un trait tous les `minor` degrés, un nombre tous les `major` degrés
 * (de 1 en 1 : trait moyen tous les 5). Le liquide monte jusqu'à `value`. En petit (`mini`,
 * pour une réponse à toucher) : sans nombres.
 */
function thermoDrawing({ value, min, max, minor, major, mini = false }) {
  const [top, bottom] = [22, 176];
  const y = (v) => r2(bottom - ((v - min) / (max - min)) * (bottom - top));
  const ticks = [];
  const labels = [];
  for (let v = min; v <= max; v += minor) {
    const big = v % major === 0;
    const len = big ? 12 : minor === 1 && v % 5 === 0 ? 9 : 6;
    ticks.push(`<line x1="${43 - len}" y1="${y(v)}" x2="43" y2="${y(v)}" stroke-width="${big ? 1.8 : 1.1}"/>`);
    if (big && !mini) {
      labels.push(`<text x="27" y="${r2(y(v) + 4.5)}" font-size="13" font-weight="700" text-anchor="end" fill="${INK}">${v < 0 ? `−${-v}` : v}</text>`);
    }
  }
  return `<svg viewBox="0 0 84 224" aria-hidden="true">`
    + `<rect x="44" y="10" width="14" height="182" rx="7" fill="#fff" stroke="${INK}" stroke-width="2"/>`
    + `<rect x="47.5" y="${y(value)}" width="7" height="${r2(200 - y(value))}" fill="${RED}"/>`
    + `<circle cx="51" cy="202" r="15" fill="${RED}" stroke="${INK}" stroke-width="2"/>`
    + `<g stroke="${INK}">${ticks.join('')}</g>${labels.join('')}`
    + (mini ? '' : `<text x="62" y="30" font-size="12" font-weight="700" fill="${INK}">°C</text>`)
    + '</svg>';
}

// ---------------------------------------------------------------- Le vent : manche à air, éolienne

/** Manche à air : pendante (pas de vent), à moitié levée (un peu de vent), à l'horizontale (beaucoup). */
function windsockDrawing(force) {
  const angle = [82, 38, 2][force];
  const stripes = Array.from({ length: 5 }, (_, i) => {
    const [xa, xb] = [i * 18, (i + 1) * 18];
    const [ha, hb] = [11 - (5 * xa) / 90, 11 - (5 * xb) / 90];
    return `<polygon points="${xa},${r2(-ha)} ${xb},${r2(-hb)} ${xb},${r2(hb)} ${xa},${r2(ha)}" fill="${i % 2 ? '#fff' : RED}"/>`;
  }).join('');
  return `<svg viewBox="0 0 130 130" aria-hidden="true"><rect width="130" height="130" rx="14" fill="${SKY}"/>`
    + `<path d="M0 116 H130 V118 Q130 130 118 130 H12 Q0 130 0 118 Z" fill="${GRASS}" stroke="${GRASS_LINE}" stroke-width="1"/>`
    + `<rect x="13" y="12" width="5" height="108" rx="2" fill="#7a7f8c" stroke="${INK}" stroke-width="1"/>`
    + `<g transform="translate(19 24) rotate(${angle})" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round">${stripes}`
    + '<ellipse cx="0" cy="0" rx="2.5" ry="11" fill="#d9dce3"/></g></svg>';
}

function windTurbineDrawing() {
  const blade = 'M0 -3.2 L35 -1.2 Q38.5 0 35 1.2 L0 3.2 Z';
  const blades = [-90, 30, 150].map((a) => `<path d="${blade}" transform="translate(50 40) rotate(${a})"/>`).join('');
  return `<svg viewBox="0 0 100 130" aria-hidden="true"><rect width="100" height="130" rx="14" fill="${SKY}"/>`
    + `<path d="M0 118 H100 V118 Q100 130 88 130 H12 Q0 130 0 118 Z" fill="${GRASS}" stroke="${GRASS_LINE}" stroke-width="1"/>`
    + `<g fill="#f4f5f8" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"><path d="M47 42 L53 42 L56 120 L44 120 Z"/>${blades}</g>`
    + `<circle cx="50" cy="40" r="4.5" fill="#d9dce3" stroke="${INK}" stroke-width="1.3"/></svg>`;
}

// ---------------------------------------------------------------- Le bulletin de la semaine

function weekDrawing(days) {
  const cols = days.map((d, i) => {
    const x = i * 64;
    const fit = d.day.length > 7 ? ' textLength="56" lengthAdjust="spacingAndGlyphs"' : '';
    return `<rect x="${x + 1}" y="1" width="62" height="24" fill="#ffe9b8" stroke="#d9cdb6" stroke-width="1.5"/>`
      + `<rect x="${x + 1}" y="25" width="62" height="88" fill="#fff" stroke="#d9cdb6" stroke-width="1.5"/>`
      + `<text x="${x + 32}" y="18" font-size="13" font-weight="700" text-anchor="middle" fill="${INK}"${fit}>${d.day}</text>`
      + `<text x="${x + 32}" y="70" font-size="32" ${EMOJI}>${WEATHER_BY_ID[d.w].emoji}</text>`
      + (d.t === undefined ? '' : `<text x="${x + 32}" y="102" font-size="16" font-weight="700" text-anchor="middle" fill="${INK}">${d.t}°</text>`);
  }).join('');
  return `<svg viewBox="0 0 ${days.length * 64} 114" aria-hidden="true">${cols}</svg>`;
}

/** Les dessins de ce fichier (null pour un autre dessin : render.js essaie alors ceux de vivre.js). */
export function cielSvg(d) {
  switch (d.kind) {
    case 'lune': return moonDrawing(d.phase);
    case 'phases': return phasesDrawing(d.list, d.gap);
    case 'constellation': return constellationDrawing(d.id);
    case 'terre': return earthDrawing(d);
    case 'systeme': return systemDrawing(d.mark);
    case 'ombre': return shadowDrawing(d);
    case 'chemin-soleil': return sunPathDrawing(d.season);
    case 'thermo': return thermoDrawing(d);
    case 'manche': return windsockDrawing(d.force);
    case 'eolienne': return windTurbineDrawing();
    case 'semaine': return weekDrawing(d.days);
    default: return null;
  }
}

// ================================================================= Le ciel et la Terre

const DAY_NIGHT_OPTIONS = ['le jour', 'la nuit'];
const DAY_NIGHT_ASK = 'Le jour ou la nuit ?';
const DAY_NIGHT_SAYS = { 'le jour': 'Oui, le jour : il fait clair.', 'la nuit': 'Oui, la nuit : il fait noir.' };

// ---------------------------------------------------------------- 1. Le jour et la nuit

export const DAY_NIGHT = [
  { emoji: '🏫', text: 'Quand va-t-on à l’école ?', answer: 'le jour' },
  { emoji: '⚽', text: 'Quand joue-t-on au ballon dehors ?', answer: 'le jour' },
  { emoji: '🥣', text: 'Quand prend-on le petit-déjeuner ?', answer: 'le jour' },
  { emoji: '☀️', text: 'Quand voit-on le Soleil dans le ciel ?', answer: 'le jour' },
  { emoji: '🛏️', text: 'Quand dort-on dans son lit ?', answer: 'la nuit' },
  { emoji: '⭐', text: 'Quand voit-on les étoiles ?', answer: 'la nuit' },
  { emoji: '🦉', text: 'Quand la chouette part-elle chasser ?', answer: 'la nuit' },
  { emoji: '🦇', text: 'Quand la chauve-souris vole-t-elle ?', answer: 'la nuit' },
];
export const DAY_NIGHT_PICTURES = [
  { emoji: '🏙️', answer: 'le jour' }, { emoji: '🏞️', answer: 'le jour' },
  { emoji: '🌃', answer: 'la nuit' }, { emoji: '🌌', answer: 'la nuit' },
];

function dayNight(rng) {
  if (rng() < 0.3) {
    const item = pick(rng, DAY_NIGHT_PICTURES);
    return fixed({
      key: `ciel:image:${item.emoji}`,
      text: 'Regarde l’image. C’est le jour ou la nuit ?',
      stage: picture(item.emoji),
      options: DAY_NIGHT_OPTIONS,
      answer: item.answer,
      success: DAY_NIGHT_SAYS[item.answer],
    });
  }
  const item = pick(rng, DAY_NIGHT);
  return fixed({
    key: `ciel:jour:${item.text}`,
    text: item.text,
    ask: DAY_NIGHT_ASK,
    stage: picture(item.emoji),
    options: DAY_NIGHT_OPTIONS,
    answer: item.answer,
    success: DAY_NIGHT_SAYS[item.answer],
  });
}

// ---------------------------------------------------------------- 2. Le Soleil

const SUN_IS_STAR = vf('☀️', 'Le Soleil est une étoile.', 'vrai', 'C’est l’étoile la plus proche de la Terre.');
export const SUN_FACTS = [
  SUN_IS_STAR,
  vf('☀️', 'Le Soleil nous éclaire et nous chauffe.', 'vrai', 'Sans lui, la Terre serait noire et glacée.'),
  vf('👀', 'On peut regarder le Soleil en face.', 'faux', 'Jamais ! Le Soleil abîme les yeux, même avec des lunettes de soleil.'),
  vf('🌅', 'Le Soleil se lève le matin et se couche le soir.', 'vrai', 'Entre les deux, c’est le jour.'),
  vf('🌍', 'Le Soleil est plus petit que la Terre.', 'faux', 'Le Soleil est énorme : plus d’un million de Terres pourraient tenir dedans.'),
  vf('🌻', 'Les plantes ont besoin du Soleil pour pousser.', 'vrai', 'Elles ont besoin de sa lumière.'),
  vf('❄️', 'Le Soleil brille seulement en été.', 'faux', 'Il brille toute l’année, même en hiver.'),
];
export const SUN_SIDES = [
  { emoji: '🌅', text: 'De quel côté le Soleil se lève-t-il ?', answer: 'à l’est' },
  { emoji: '🌇', text: 'De quel côté le Soleil se couche-t-il ?', answer: 'à l’ouest' },
];
const SKY_LIGHTS = [{ emoji: '☀️', name: 'le Soleil' }, { emoji: '🌙', name: 'la Lune' }, { emoji: '☁️', name: 'les nuages' }];

function sunSides(rng) {
  const item = pick(rng, SUN_SIDES);
  return fixed({
    key: `ciel:cote:${item.text}`,
    text: item.text,
    ask: 'À l’est ou à l’ouest ?',
    stage: picture(item.emoji),
    options: ['à l’est', 'à l’ouest'],
    answer: item.answer,
    success: 'Le Soleil se lève à l’est et se couche à l’ouest.',
  });
}

function sun(rng) {
  const roll = rng();
  if (roll < 0.2) {
    const [answer, ...others] = SKY_LIGHTS;
    return pictureQuestion({
      key: 'ciel:eclaire',
      text: 'Qu’est-ce qui nous éclaire et nous chauffe le jour ?',
      answer,
      others,
      success: 'Oui, le Soleil nous éclaire et nous chauffe.',
      rng,
    });
  }
  if (roll < 0.35) return sunSides(rng);
  return trueFalse(rng, SUN_FACTS, 'ciel:soleil');
}

// ---------------------------------------------------------------- 3. La Lune

/** Les formes de la Lune à reconnaître (phases dessinées : voir moonSvg). */
export const MOON_SHAPES = {
  pleine: { name: 'la pleine lune', phases: [4], says: 'Oui, la pleine lune : on voit toute sa face éclairée.' },
  nouvelle: { name: 'la nouvelle lune', phases: [0], says: 'Oui : à la nouvelle lune, on ne voit presque pas la Lune.' },
  croissant: { name: 'le croissant de lune', phases: [1, 7], says: 'Oui, la Lune a la forme d’un croissant.' },
  demi: { name: 'la demi-lune', phases: [2, 6], says: 'Oui, on voit la moitié de la Lune.' },
};
export const MOON_FACTS = [
  vf('🌍', 'La Lune tourne autour de la Terre.', 'vrai', 'Elle met environ un mois pour en faire le tour.'),
  vf('💡', 'La Lune fabrique sa propre lumière.', 'faux', 'La Lune est éclairée par le Soleil.'),
  vf('🏙️', 'On peut parfois voir la Lune pendant le jour.', 'vrai', 'Regarde bien le ciel : elle est souvent là le matin ou l’après-midi.'),
  vf('🚀', 'Des astronautes ont marché sur la Lune.', 'vrai', 'C’était la première fois en 1969.'),
  vf('⭐', 'La Lune est une étoile.', 'faux', 'La Lune ne brille pas toute seule : c’est le Soleil qui l’éclaire.'),
  vf('🌬️', 'Sur la Lune, il y a de l’air pour respirer.', 'faux', 'Il n’y a pas d’air : les astronautes ont un scaphandre.'),
];

function moon(rng) {
  if (rng() < 0.4) return trueFalse(rng, MOON_FACTS, 'ciel:lune');
  const ids = Object.keys(MOON_SHAPES);
  const id = pick(rng, ids);
  const options = shuffle(rng, [id, ...sample(rng, ids.filter((s) => s !== id), 2)]);
  const shape = MOON_SHAPES[id];
  const text = `Touche ${shape.name}.`;
  return {
    key: `ciel:forme:${id}:${options.join(',')}`,
    text,
    instruction: text,
    stage: NONE,
    choices: options.map((s) => ({ value: s, drawing: { kind: 'lune', phase: pick(rng, MOON_SHAPES[s].phases) }, name: MOON_SHAPES[s].name })),
    choiceStyle: 'drawings',
    answer: id,
    success: { speak: shape.says },
  };
}

// ---------------------------------------------------------------- 4. Les ombres

export const SHADOW_OF = { gauche: 'droite', haut: 'courte', droite: 'gauche' };
const SHADOW_NAMES = { droite: 'l’ombre à droite', courte: 'l’ombre courte', gauche: 'l’ombre à gauche' };
export const SHADOW_TIMES = [
  { text: 'Le matin, le Soleil est bas dans le ciel.', sun: 'gauche', answer: 'longue' },
  { text: 'À midi, le Soleil est haut dans le ciel.', sun: 'haut', answer: 'courte' },
  { text: 'Le soir, le Soleil est bas dans le ciel.', sun: 'droite', answer: 'longue' },
];
export const SHADOW_FACTS = [
  vf('🔦', 'Sans lumière, il n’y a pas d’ombre.', 'vrai', 'Une ombre se forme quand un objet arrête la lumière.'),
  vf('🌳', 'L’ombre est toujours du même côté que le Soleil.', 'faux', 'L’ombre est de l’autre côté, à l’opposé du Soleil.'),
  vf('🌳', 'L’ombre d’un arbre change pendant la journée.', 'vrai', 'Le Soleil change de place dans le ciel : l’ombre tourne et change de longueur.'),
  vf('🕛', 'À midi, les ombres sont les plus longues.', 'faux', 'À midi, le Soleil est haut : les ombres sont courtes.'),
  vf('🧍', 'Ton ombre fait les mêmes gestes que toi.', 'vrai', 'C’est ton corps qui arrête la lumière.'),
];

function shadows(rng) {
  const roll = rng();
  if (roll < 0.4) {
    const sunAt = pick(rng, Object.keys(SHADOW_OF));
    const options = shuffle(rng, ['droite', 'courte', 'gauche']);
    const text = 'Le Soleil éclaire l’arbre. Touche la bonne ombre.';
    return {
      key: `ciel:ombre:${sunAt}:${options.join(',')}`,
      text,
      instruction: ['Le Soleil éclaire l’arbre.', 'Touche la bonne ombre.'],
      stage: drawing({ kind: 'ombre', sun: sunAt }, 'Un arbre éclairé par le Soleil'),
      choices: options.map((s) => ({ value: s, drawing: { kind: 'ombre', shadow: s }, name: SHADOW_NAMES[s] })),
      choiceStyle: 'drawings',
      answer: SHADOW_OF[sunAt],
      success: { speak: SHADOW_OF[sunAt] === 'courte' ? 'Oui : le Soleil est haut, l’ombre est courte.' : 'Oui : l’ombre est de l’autre côté du Soleil.' },
    };
  }
  if (roll < 0.7) {
    const item = pick(rng, SHADOW_TIMES);
    return fixed({
      key: `ciel:longueur:${item.text}`,
      text: `${item.text} L’ombre de l’arbre est longue ou courte ?`,
      stage: drawing({ kind: 'ombre', sun: item.sun }, 'Un arbre éclairé par le Soleil'),
      options: ['longue', 'courte'],
      answer: item.answer,
      success: item.answer === 'longue' ? 'Oui : quand le Soleil est bas, l’ombre est longue.' : 'Oui : quand le Soleil est haut, l’ombre est courte.',
    });
  }
  return trueFalse(rng, SHADOW_FACTS, 'ciel:ombres');
}

// ---------------------------------------------------------------- 5. Les étoiles

export const CONSTELLATION_QUESTIONS = [
  {
    id: 'grande-ourse', text: 'Voici la Grande Ourse. À quoi ressemble-t-elle ?', ask: 'Une casserole, un poisson ou une maison ?',
    options: ['une casserole', 'un poisson', 'une maison'], answer: 'une casserole', says: 'Oui ! On l’appelle aussi la Grande Casserole.',
  },
  {
    id: 'cassiopee', text: 'Voici Cassiopée. À quelle lettre ressemble-t-elle ?',
    options: ['W', 'O', 'L'], answer: 'W', says: 'Oui, Cassiopée a la forme d’un W.',
  },
  {
    id: 'orion', text: 'Voici Orion. Combien d’étoiles sont alignées au milieu ?',
    options: ['2', '3', '4'], answer: '3', says: 'Oui, trois étoiles : c’est la ceinture d’Orion.',
  },
];
export const STAR_FACTS = [
  SUN_IS_STAR,
  vf('🔭', 'Les étoiles sont très loin de la Terre.', 'vrai', 'Elles sont beaucoup plus loin que la Lune et le Soleil.'),
  vf('🏙️', 'Le jour, les étoiles disparaissent du ciel.', 'faux', 'Elles sont toujours là, mais le Soleil éclaire trop : on ne les voit pas.'),
  vf('✨', 'Les étoiles sont toutes petites.', 'faux', 'Elles sont énormes, mais si loin qu’elles nous paraissent petites.'),
  vf('✨', 'Une constellation, c’est un groupe d’étoiles qui dessine une figure dans le ciel.', 'vrai', 'Par exemple la Grande Ourse, qui ressemble à une casserole.'),
  vf('🌌', 'Les étoiles brillent avec leur propre lumière.', 'vrai', 'Les étoiles fabriquent leur lumière, comme le Soleil.'),
];

function stars(rng) {
  const roll = rng();
  if (roll < 0.4) return trueFalse(rng, STAR_FACTS, 'ciel:etoiles');
  if (roll < 0.6) {
    const id = pick(rng, Object.keys(CONSTELLATIONS));
    const count = CONSTELLATIONS[id].stars.length;
    const text = 'Compte les étoiles du dessin. Combien y en a-t-il ?';
    return {
      key: `ciel:compte:${id}`,
      text,
      instruction: ['Compte les étoiles du dessin.', 'Combien y en a-t-il ?'],
      stage: drawing({ kind: 'constellation', id }, `${capitalize(CONSTELLATIONS[id].name)}, une constellation`),
      choices: textChoices([count - 1, count, count + 1]),
      choiceStyle: 'words',
      answer: count,
      success: { speak: `Oui, ${count} étoiles.` },
    };
  }
  const item = pick(rng, CONSTELLATION_QUESTIONS);
  return fixed({
    key: `ciel:constellation:${item.id}`,
    text: item.text,
    ask: item.ask,
    stage: drawing({ kind: 'constellation', id: item.id }, `${capitalize(CONSTELLATIONS[item.id].name)}, une constellation`),
    options: item.options,
    answer: item.answer,
    success: item.says,
  });
}

// ---------------------------------------------------------------- 6. Les phases de la Lune

/** Les phases nommées (les autres, presque pleines, ne sont jamais à trouver). */
export const PHASE_NAMES = {
  0: 'la nouvelle lune', 1: 'le premier croissant', 2: 'le premier quartier', 4: 'la pleine lune',
  6: 'le dernier quartier', 7: 'le dernier croissant',
};
export const PHASE_FACTS = [
  vf('🌙', 'La Lune change vraiment de forme.', 'faux', 'La Lune est toujours ronde : on voit seulement la partie éclairée par le Soleil.'),
  vf('🌕', 'Entre deux pleines lunes, il se passe environ un mois.', 'vrai', 'Environ vingt-neuf jours et demi.'),
  vf('🌑', 'À la nouvelle lune, on ne voit presque pas la Lune.', 'vrai', 'Sa face éclairée est tournée vers le Soleil, pas vers nous.'),
  vf('🌒', 'Quand le croissant grandit, la Lune va vers la pleine lune.', 'vrai', 'On dit que la Lune est croissante.'),
  vf('🌘', 'Après la pleine lune, la partie éclairée grandit encore.', 'faux', 'Après la pleine lune, la partie éclairée diminue jusqu’à la nouvelle lune.'),
];

function phases(rng) {
  if (rng() < 0.35) return trueFalse(rng, PHASE_FACTS, 'ciel:phases');
  // cinq phases qui se suivent (le cycle recommence après le dernier croissant), l'une à trouver
  let start;
  let gap;
  do {
    start = randInt(rng, 0, 7);
    gap = randInt(rng, 0, 4);
  } while (PHASE_NAMES[(start + gap) % 8] === undefined);
  const list = Array.from({ length: 5 }, (_, i) => (start + i) % 8);
  const answer = list[gap];
  const others = sample(rng, Object.keys(PHASE_NAMES).map(Number).filter((k) => k !== answer), 2);
  const options = shuffle(rng, [answer, ...others]);
  const text = 'Voici les phases de la Lune, dans l’ordre. Quelle Lune manque ?';
  return {
    key: `ciel:manque:${list.join('')}:${gap}:${options.join(',')}`,
    text,
    instruction: ['Voici les phases de la Lune, dans l’ordre.', 'Quelle Lune manque ?'],
    stage: drawing({ kind: 'phases', list, gap }, 'Les phases de la Lune, dans l’ordre, avec une Lune qui manque'),
    choices: options.map((k) => ({ value: k, drawing: { kind: 'lune', phase: k }, name: PHASE_NAMES[k] })),
    choiceStyle: 'drawings',
    answer,
    success: { speak: `Oui, c’est ${PHASE_NAMES[answer]}.` },
  };
}

// ---------------------------------------------------------------- 7. Les planètes

/** Chaque question, sa réponse, et les autres planètes proposées (sans piège). */
export const PLANET_QUESTIONS = [
  { text: 'Sur quelle planète vivons-nous ?', answer: 'la Terre', says: 'Oui, nous vivons sur la Terre.' },
  { text: 'Quelle est la plus grande planète ?', answer: 'Jupiter', from: ['Mercure', 'Vénus', 'la Terre', 'Mars'], says: 'Oui, Jupiter est la plus grande planète.' },
  { text: 'Quelle planète est la plus proche du Soleil ?', answer: 'Mercure', from: ['Jupiter', 'Saturne', 'Uranus', 'Neptune', 'la Terre'], says: 'Oui, Mercure est la plus proche du Soleil.' },
  { text: 'Quelle planète est la plus loin du Soleil ?', answer: 'Neptune', from: ['Mercure', 'Vénus', 'la Terre', 'Mars'], says: 'Oui, Neptune est la plus loin du Soleil.' },
  { text: 'Quelle planète a de grands anneaux bien visibles ?', answer: 'Saturne', from: ['Mercure', 'Vénus', 'la Terre', 'Mars'], says: 'Oui, Saturne a de grands anneaux.' },
  { text: 'Quelle planète appelle-t-on la planète rouge ?', answer: 'Mars', from: ['Jupiter', 'Uranus', 'Neptune', 'la Terre'], says: 'Oui, Mars est couverte de poussière rouge.' },
  { text: 'Quelle planète est la plus chaude ?', answer: 'Vénus', from: ['la Terre', 'Mars', 'Uranus', 'Neptune'], says: 'Oui, Vénus est la plus chaude, à cause de ses épais nuages.' },
];
export const PLANET_FACTS = [
  vf('🌍', 'La Terre est une planète.', 'vrai', 'Elle tourne autour du Soleil, comme les sept autres planètes.'),
  vf('☀️', 'Le Soleil est une planète.', 'faux', 'Le Soleil est une étoile.'),
  vf('🪐', 'Les planètes tournent autour du Soleil.', 'vrai', 'Il y a huit planètes.'),
  vf('🌍', 'La Terre est la plus grande planète.', 'faux', 'La plus grande planète est Jupiter.'),
];

function planets(rng) {
  const roll = rng();
  if (roll < 0.3) return trueFalse(rng, PLANET_FACTS, 'ciel:planete');
  if (roll < 0.42) {
    return {
      key: 'ciel:huit',
      text: 'Combien de planètes tournent autour du Soleil ?',
      instruction: 'Combien de planètes tournent autour du Soleil ?',
      stage: picture('🪐'),
      choices: textChoices([6, 8, 10]),
      choiceStyle: 'words',
      answer: 8,
      success: { speak: 'Oui, huit planètes tournent autour du Soleil.' },
    };
  }
  const item = pick(rng, PLANET_QUESTIONS);
  return wordQuestion({
    key: `ciel:planetes:${item.text}`,
    text: item.text,
    stage: picture(item.answer === 'la Terre' ? '🌍' : '🪐'),
    answer: item.answer,
    others: sample(rng, item.from || PLANET_NAMES.filter((p) => p !== item.answer), 2),
    success: item.says,
    rng,
  });
}

// ---------------------------------------------------------------- 8. La Terre tourne

export const DURATIONS = [
  { emoji: '🌍', text: 'Combien de temps la Terre met-elle pour faire un tour sur elle-même ?', answer: 'un jour', says: 'Un jour : c’est ce qui fait le jour et la nuit.' },
  { emoji: '☀️', text: 'Combien de temps la Terre met-elle pour faire le tour du Soleil ?', answer: 'un an', says: 'Un an : la Terre fait le tour du Soleil chaque année.' },
  { emoji: '🌙', text: 'Combien de temps la Lune met-elle pour faire le tour de la Terre ?', answer: 'un mois', says: 'Environ un mois.' },
];
export const EARTH_FACTS = [
  vf('🌍', 'La Terre tourne sur elle-même : c’est ce qui fait le jour et la nuit.', 'vrai', 'Du côté tourné vers le Soleil, c’est le jour ; de l’autre côté, c’est la nuit.'),
  vf('☀️', 'Le Soleil tourne autour de la Terre.', 'faux', 'C’est la Terre qui tourne autour du Soleil.'),
  vf('🌏', 'Quand il fait jour en France, il fait nuit de l’autre côté de la Terre.', 'vrai', 'Le Soleil n’éclaire qu’une moitié de la Terre à la fois.'),
  vf('🌍', 'La Terre est plate.', 'faux', 'La Terre est ronde comme une boule.'),
  MOON_FACTS[0],
];

function earthTurns(rng) {
  const roll = rng();
  if (roll < 0.35) {
    const side = rng() < 0.5 ? 'le jour' : 'la nuit';
    const angle = side === 'le jour' ? randInt(rng, 150, 210) : randInt(rng, -30, 30);
    return fixed({
      key: `ciel:terre:${side}:${Math.round(angle / 15)}`,
      text: 'Le Soleil éclaire la Terre. Pour cette maison, est-ce le jour ou la nuit ?',
      ask: null,
      stage: drawing({ kind: 'terre', side, angle }, 'La Terre éclairée d’un côté par le Soleil, et une maison'),
      options: DAY_NIGHT_OPTIONS,
      answer: side,
      success: side === 'le jour' ? 'Le jour : la maison est du côté éclairé par le Soleil.' : 'La nuit : la maison est du côté qui ne voit pas le Soleil.',
    });
  }
  if (roll < 0.6) {
    const item = pick(rng, DURATIONS);
    return fixed({
      key: `ciel:duree:${item.text}`,
      text: item.text,
      ask: 'Un jour, un mois ou un an ?',
      stage: picture(item.emoji),
      options: ['un jour', 'un mois', 'un an'],
      answer: item.answer,
      success: item.says,
    });
  }
  if (roll < 0.75) return sunSides(rng);
  return trueFalse(rng, EARTH_FACTS, 'ciel:tourne');
}

// ---------------------------------------------------------------- 9. Les saisons et le Soleil

export const SEASON_SCENES = [
  { text: 'Les journées sont longues et le Soleil monte très haut dans le ciel.', answer: 'l’été' },
  { text: 'Il fait encore jour à neuf heures du soir.', answer: 'l’été' },
  { text: 'À midi, le Soleil est très haut et les ombres sont courtes.', answer: 'l’été' },
  { text: 'Il fait déjà nuit à six heures du soir.', answer: 'l’hiver' },
  { text: 'À midi, le Soleil reste bas dans le ciel et les ombres sont longues.', answer: 'l’hiver' },
];
export const SEASON_FACTS = [
  vf('🌍', 'La Terre met un an pour faire le tour du Soleil.', 'vrai', 'Pendant ce voyage, les saisons se suivent.'),
  vf('☀️', 'En été, il fait chaud parce que la Terre est plus près du Soleil.', 'faux', 'Ce n’est pas la distance : en été, le Soleil monte plus haut et brille plus longtemps.'),
  vf('☀️', 'En été, le Soleil monte plus haut dans le ciel qu’en hiver.', 'vrai', 'Ses rayons chauffent plus fort, et plus longtemps.'),
  vf('❄️', 'En hiver, les journées sont plus courtes qu’en été.', 'vrai', 'Le Soleil se lève tard et se couche tôt.'),
  vf('☀️', 'Le Soleil devient plus gros en été.', 'faux', 'Le Soleil garde toujours la même taille.'),
  vf('🍂', 'Les saisons reviennent dans le même ordre chaque année.', 'vrai', 'Le printemps, l’été, l’automne, puis l’hiver.'),
];
const SEASON_OPTIONS = ['l’été', 'l’hiver'];
const SEASON_ASK = 'C’est l’été ou l’hiver ?';

function seasons(rng) {
  const roll = rng();
  if (roll < 0.3) {
    const season = rng() < 0.5 ? 'ete' : 'hiver';
    return fixed({
      key: `ciel:chemin:${season}`,
      text: 'Voici le chemin du Soleil dans le ciel pendant une journée.',
      ask: SEASON_ASK,
      stage: drawing({ kind: 'chemin-soleil', season }, 'Le chemin du Soleil dans le ciel pendant une journée'),
      options: SEASON_OPTIONS,
      answer: season === 'ete' ? 'l’été' : 'l’hiver',
      success: season === 'ete' ? 'C’est l’été : le Soleil monte haut et reste longtemps dans le ciel.' : 'C’est l’hiver : le Soleil reste bas et la journée est courte.',
    });
  }
  if (roll < 0.6) {
    const item = pick(rng, SEASON_SCENES);
    return fixed({
      key: `ciel:saison:${item.text}`,
      text: item.text,
      ask: SEASON_ASK,
      stage: picture('☀️'),
      options: SEASON_OPTIONS,
      answer: item.answer,
      success: `Oui, c’est ${item.answer}.`,
    });
  }
  return trueFalse(rng, SEASON_FACTS, 'ciel:saisons');
}

// ---------------------------------------------------------------- 10. L'ordre des planètes

const PLANETS_IN_ORDER = 'Mercure, Vénus, la Terre, Mars, Jupiter, Saturne, Uranus, Neptune.';
const ORDINALS = ['première', 'deuxième', 'troisième', 'quatrième', 'cinquième', 'sixième', 'septième', 'huitième'];

function planetOrder(rng) {
  const roll = rng();
  if (roll < 0.35) {
    const mark = randInt(rng, 0, 7);
    const answer = PLANET_NAMES[mark];
    return wordQuestion({
      key: `ciel:marque:${mark}`,
      text: 'Quelle planète porte le point d’interrogation ?',
      stage: drawing({ kind: 'systeme', mark }, 'Le Soleil et les huit planètes, dans l’ordre ; une planète porte un point d’interrogation'),
      answer,
      others: sample(rng, PLANET_NAMES.filter((p) => p !== answer), 2),
      success: `Oui, c’est la ${ORDINALS[mark]} planète : ${answer}.`,
      rng,
    });
  }
  if (roll < 0.65) {
    const k = randInt(rng, 1, 6);
    const answer = PLANET_NAMES[k];
    return wordQuestion({
      key: `ciel:entre:${k}`,
      text: `Quelle planète est entre ${PLANET_NAMES[k - 1]} et ${PLANET_NAMES[k + 1]} ?`,
      stage: drawing({ kind: 'systeme', mark: null }, 'Le Soleil et les huit planètes, dans l’ordre'),
      answer,
      others: sample(rng, PLANET_NAMES.filter((_, i) => Math.abs(i - k) > 1), 2),
      success: PLANETS_IN_ORDER,
      rng,
    });
  }
  // 3 ou 4 planètes à ranger, de la plus proche du Soleil à la plus loin
  const picked = sample(rng, PLANET_NAMES.map((_, i) => i), rng() < 0.5 ? 3 : 4).sort((a, b) => a - b);
  return orderQuestion({
    key: `ciel:ranger:${picked.join('')}`,
    title: 'Range ces planètes, de la plus proche du Soleil à la plus loin.',
    ask: 'Touche-les dans l’ordre.',
    items: picked.map((i) => ({ label: PLANET_NAMES[i] })),
    sign: '→',
    success: PLANETS_IN_ORDER,
    rng,
  });
}

const CIEL_LEVELS = [dayNight, sun, moon, shadows, stars, phases, planets, earthTurns, seasons, planetOrder];

export const ciel = {
  id: 'ciel',
  domain: 'sciences',
  title: 'Le ciel et la Terre',
  icon: '🌙',
  skill: 'Découvrir le ciel : le jour et la nuit, le Soleil, la Lune, les étoiles, les planètes, les saisons',
  levels: [
    'Le jour et la nuit', 'Le Soleil', 'La Lune', 'Les ombres', 'Les étoiles',
    'Les phases de la Lune', 'Les planètes', 'La Terre tourne', 'Les saisons et le Soleil', 'L’ordre des planètes',
  ],
  generate(level, rng) {
    return CIEL_LEVELS[Math.min(level, CIEL_LEVELS.length) - 1](rng);
  },
};

// ================================================================= La météo

export const WEATHER = [
  { id: 'soleil', emoji: '☀️', name: 'le soleil', says: 'Il y a du soleil.', found: 'Oui : un grand soleil, il fait beau.' },
  { id: 'nuages', emoji: '⛅', name: 'le soleil et les nuages', says: 'Il y a du soleil et des nuages.', found: 'Oui : le soleil est à moitié caché par un nuage.' },
  { id: 'pluie', emoji: '🌧️', name: 'la pluie', says: 'Il pleut.', found: 'Oui : un nuage et des gouttes, c’est la pluie.' },
  { id: 'neige', emoji: '❄️', name: 'la neige', says: 'Il neige.', found: 'Oui : le flocon, c’est la neige.' },
  { id: 'orage', emoji: '🌩️', name: 'l’orage', says: 'Il y a de l’orage.', found: 'Oui : un nuage et un éclair, c’est l’orage.' },
  { id: 'vent', emoji: '🌬️', name: 'le vent', says: 'Il y a du vent.', found: 'Oui : le visage qui souffle, c’est le vent.' },
];
const WEATHER_BY_ID = Object.fromEntries(WEATHER.map((w) => [w.id, w]));
const weatherChoice = (w) => ({ value: w.id, label: w.emoji, name: w.name });

// ---------------------------------------------------------------- 1. Les symboles météo

function symbols(rng) {
  const target = pick(rng, WEATHER);
  // le soleil et « soleil et nuages » ne sont jamais proposés ensemble (les deux ont un soleil)
  const sunny = ['soleil', 'nuages'];
  let others = sample(rng, WEATHER.filter((w) => w !== target), 2);
  if (sunny.includes(target.id)) others = sample(rng, WEATHER.filter((w) => !sunny.includes(w.id)), 2);
  else if (others.every((w) => sunny.includes(w.id))) others = [others[0], pick(rng, WEATHER.filter((w) => w !== target && !sunny.includes(w.id)))];
  const options = shuffle(rng, [target, ...others]);
  return {
    key: `meteo:symbole:${target.id}:${options.map((w) => w.id).join(',')}`,
    text: `${target.says} Touche le bon dessin.`,
    instruction: [target.says, 'Touche le bon dessin.'],
    stage: NONE,
    choices: options.map(weatherChoice),
    choiceStyle: 'pictures',
    answer: target.id,
    success: { speak: target.found },
  };
}

// ---------------------------------------------------------------- 2. S'habiller selon le temps

// Les vêtements proposés à côté ne vont jamais avec ce temps (pas de lunettes de soleil à côté de
// la neige : on en met au ski).
export const CLOTHES = [
  {
    emoji: '🌧️', text: 'Il pleut. Que prends-tu pour sortir ?',
    good: [{ emoji: '☂️', name: 'le parapluie' }],
    bad: [{ emoji: '🩱', name: 'le maillot de bain' }, { emoji: '🕶️', name: 'les lunettes de soleil' }, { emoji: '🩳', name: 'le short' }],
    says: 'Oui, le parapluie protège de la pluie.',
  },
  {
    emoji: '❄️', text: 'Il neige et il fait froid. Que mets-tu pour sortir ?',
    good: [{ emoji: '🧤', name: 'les gants' }, { emoji: '🧣', name: 'l’écharpe' }, { emoji: '🧥', name: 'le manteau' }],
    bad: [{ emoji: '🩱', name: 'le maillot de bain' }, { emoji: '🩳', name: 'le short' }, { emoji: '🩴', name: 'les tongs' }],
    says: 'Oui, ça tient chaud quand il fait froid.',
  },
  {
    emoji: '☀️', text: 'Il fait très chaud et il y a du soleil. Que mets-tu pour sortir ?',
    good: [{ emoji: '🧢', name: 'la casquette' }, { emoji: '🕶️', name: 'les lunettes de soleil' }, { emoji: '🧴', name: 'la crème solaire' }],
    bad: [{ emoji: '🧤', name: 'les gants' }, { emoji: '🧣', name: 'l’écharpe' }, { emoji: '🧥', name: 'le manteau' }],
    says: 'Oui, ça protège du soleil.',
  },
];

function clothes(rng) {
  const item = pick(rng, CLOTHES);
  const answer = pick(rng, item.good);
  return pictureQuestion({
    key: `meteo:habits:${item.emoji}:${answer.name}`,
    text: item.text,
    stage: picture(item.emoji),
    answer,
    others: sample(rng, item.bad, 2),
    success: item.says,
    rng,
  });
}

// ---------------------------------------------------------------- 3. Les nuages et la pluie

export const WATER_CYCLE = [
  { emoji: '🌊', label: 'la mer' }, { emoji: '☁️', label: 'le nuage' },
  { emoji: '🌧️', label: 'la pluie' }, { emoji: '🏞️', label: 'la rivière' },
];
export const RAIN_FACTS = [
  vf('☁️', 'Les nuages sont faits de toutes petites gouttes d’eau.', 'vrai', 'Quand les gouttes deviennent grosses et lourdes, elles tombent : il pleut.'),
  vf('☁️', 'Les nuages sont faits de coton.', 'faux', 'Les nuages sont faits de toutes petites gouttes d’eau.'),
  vf('🌧️', 'La pluie tombe des nuages.', 'vrai', 'Les gouttes grossissent, deviennent lourdes et tombent.'),
  vf('🏞️', 'L’eau de pluie coule dans les rivières jusqu’à la mer.', 'vrai', 'Puis le soleil chauffe la mer et l’eau remonte dans le ciel.'),
  vf('🌫️', 'Le brouillard, c’est un nuage tout près du sol.', 'vrai', 'Dans le brouillard, on ne voit pas loin.'),
  vf('🧊', 'La grêle, ce sont de petites boules de glace qui tombent du ciel.', 'vrai', 'Elles se forment dans les gros nuages d’orage.'),
  vf('❄️', 'Quand il fait très froid, il peut neiger au lieu de pleuvoir.', 'vrai', 'La neige, ce sont de petits cristaux de glace.'),
  vf('🌧️', 'L’eau de pluie est salée comme l’eau de la mer.', 'faux', 'Quand l’eau de la mer monte dans le ciel, le sel reste dans la mer.'),
];

function rain(rng) {
  if (rng() < 0.4) {
    return orderQuestion({
      key: 'meteo:cycle',
      title: 'Le voyage de l’eau commence dans la mer.',
      ask: 'Touche les images dans l’ordre.',
      items: WATER_CYCLE,
      success: 'Le soleil chauffe la mer, l’eau monte et forme les nuages, il pleut, puis la rivière ramène l’eau à la mer.',
      rng,
    });
  }
  return trueFalse(rng, RAIN_FACTS, 'meteo:pluie');
}

// ---------------------------------------------------------------- 4. Le vent

export const WIND_FORCES = ['pas de vent', 'un peu de vent', 'beaucoup de vent'];
const WIND_SAYS = [
  'Oui : la manche à air pend, il n’y a pas de vent.',
  'Oui : la manche à air se lève un peu, il y a un peu de vent.',
  'Oui : la manche à air est toute droite, il y a beaucoup de vent.',
];
/** Les instruments à reconnaître (trois dessins, toujours les mêmes). */
export const INSTRUMENTS = {
  manche: { name: 'la manche à air', ask: 'Quel objet montre la force du vent ?', says: 'Oui, la manche à air montre la force du vent.' },
  eolienne: { name: 'l’éolienne', ask: 'Quel objet fabrique de l’électricité avec le vent ?', says: 'Oui, le vent fait tourner l’éolienne, qui fabrique de l’électricité.' },
  thermo: { name: 'le thermomètre', ask: 'Quel objet mesure la température ?', says: 'Oui, le thermomètre dit s’il fait chaud ou froid.' },
};
const INSTRUMENT_DRAWINGS = {
  manche: { kind: 'manche', force: 2 },
  eolienne: { kind: 'eolienne' },
  thermo: { kind: 'thermo', value: 20, min: 0, max: 40, minor: 5, major: 10, mini: true },
};
export const WIND_FACTS = [
  vf('🌬️', 'On ne voit pas le vent, mais on voit ce qu’il fait bouger.', 'vrai', 'Le vent, c’est de l’air qui bouge.'),
  vf('🍃', 'Quand il y a du vent, les feuilles des arbres bougent.', 'vrai', 'Le vent pousse les feuilles.'),
  vf('👕', 'Le vent aide le linge à sécher.', 'vrai', 'L’air qui bouge emporte l’eau du linge.'),
  vf('🌀', 'Une tempête, c’est un vent très, très fort.', 'vrai', 'Pendant une tempête, on reste à l’abri.'),
  vf('🪁', 'Le cerf-volant vole mieux sans vent.', 'faux', 'Il faut du vent pour faire voler un cerf-volant.'),
];
const WIND_THINGS = [
  { emoji: '⛵', name: 'le voilier', ask: 'Qu’est-ce qui avance grâce au vent ?', says: 'Oui, le vent pousse la voile du voilier.' },
  { emoji: '🪁', name: 'le cerf-volant', ask: 'Qu’est-ce qui vole grâce au vent ?', says: 'Oui, le vent fait voler le cerf-volant.' },
];
const NO_WIND = [{ emoji: '🚗', name: 'la voiture' }, { emoji: '🚂', name: 'le train' }, { emoji: '🚲', name: 'le vélo' }];

function wind(rng) {
  const roll = rng();
  if (roll < 0.35) {
    const force = randInt(rng, 0, 2);
    return fixed({
      key: `meteo:manche:${force}`,
      text: 'Regarde la manche à air. Y a-t-il du vent ?',
      ask: 'Pas de vent, un peu de vent ou beaucoup de vent ?',
      stage: drawing({ kind: 'manche', force }, 'Une manche à air'),
      options: WIND_FORCES,
      answer: WIND_FORCES[force],
      success: WIND_SAYS[force],
      style: 'answers',
    });
  }
  if (roll < 0.55) {
    const id = pick(rng, Object.keys(INSTRUMENTS));
    const options = shuffle(rng, Object.keys(INSTRUMENTS));
    return {
      key: `meteo:objet:${id}:${options.join(',')}`,
      text: INSTRUMENTS[id].ask,
      instruction: INSTRUMENTS[id].ask,
      stage: NONE,
      choices: options.map((o) => ({ value: o, drawing: INSTRUMENT_DRAWINGS[o], name: INSTRUMENTS[o].name })),
      choiceStyle: 'drawings',
      answer: id,
      success: { speak: INSTRUMENTS[id].says },
    };
  }
  if (roll < 0.7) {
    const thing = pick(rng, WIND_THINGS);
    return pictureQuestion({
      key: `meteo:pousse:${thing.name}`,
      text: thing.ask,
      answer: thing,
      others: sample(rng, NO_WIND, 2),
      success: thing.says,
      rng,
    });
  }
  return trueFalse(rng, WIND_FACTS, 'meteo:vent');
}

// ---------------------------------------------------------------- 5. L'orage

export const STORM_PAIRS = [
  { emoji: '⚡', text: 'Pendant l’orage, que voit-on en premier ?', answer: 'l’éclair', says: 'L’éclair d’abord, puis on entend le tonnerre : la lumière va plus vite que le bruit.' },
  { emoji: '🔊', text: 'Pendant l’orage, qu’est-ce qui fait un grand bruit ?', answer: 'le tonnerre', says: 'Oui, le tonnerre gronde.' },
  { emoji: '⚡', text: 'Pendant l’orage, qu’est-ce qui fait une grande lumière dans le ciel ?', answer: 'l’éclair', says: 'Oui, l’éclair illumine le ciel.' },
];
export const STORM_SHELTERS = {
  good: { emoji: '🏠', name: 'dans la maison' },
  bad: [{ emoji: '🌳', name: 'sous un arbre' }, { emoji: '🏊', name: 'dans la piscine' }, { emoji: '⛰️', name: 'en haut de la colline' }],
};
export const STORM_FACTS = [
  vf('🌳', 'Pendant l’orage, on s’abrite sous un grand arbre.', 'faux', 'C’est dangereux : la foudre tombe souvent sur les arbres. On rentre dans une maison.'),
  vf('🏊', 'Pendant l’orage, on sort de la piscine.', 'vrai', 'Dans l’eau, la foudre est très dangereuse.'),
  vf('⚡', 'On voit l’éclair avant d’entendre le tonnerre.', 'vrai', 'La lumière va beaucoup plus vite que le bruit.'),
  vf('🔊', 'Le tonnerre, c’est le bruit de l’éclair.', 'vrai', 'L’éclair chauffe l’air d’un coup : ça fait un grand bruit.'),
  vf('⚡', 'La foudre, c’est un éclair qui touche le sol.', 'vrai', 'C’est pour ça qu’on s’abrite dans une maison.'),
];

function storm(rng) {
  const roll = rng();
  if (roll < 0.35) {
    const item = pick(rng, STORM_PAIRS);
    return fixed({
      key: `meteo:orage:${item.text}`,
      text: item.text,
      ask: 'L’éclair ou le tonnerre ?',
      stage: picture(item.emoji),
      options: ['l’éclair', 'le tonnerre'],
      answer: item.answer,
      success: item.says,
    });
  }
  if (roll < 0.6) {
    return pictureQuestion({
      key: 'meteo:abri',
      text: 'Il y a de l’orage. Où vas-tu t’abriter ?',
      stage: picture('🌩️'),
      answer: STORM_SHELTERS.good,
      others: sample(rng, STORM_SHELTERS.bad, 2),
      success: 'Oui, on s’abrite dans une maison.',
      rng,
    });
  }
  return trueFalse(rng, STORM_FACTS, 'meteo:orages');
}

// ---------------------------------------------------------------- 6. L'arc-en-ciel

export const RAINBOW_WHEN = {
  good: { emoji: '🌦️', name: 'le soleil et la pluie' },
  bad: [{ emoji: '🌙', name: 'la nuit' }, { emoji: '❄️', name: 'la neige' }, { emoji: '🌫️', name: 'le brouillard' }],
};
export const RAINBOW_FACTS = [
  vf('🌈', 'L’arc-en-ciel apparaît quand le soleil éclaire des gouttes de pluie.', 'vrai', 'Les gouttes séparent la lumière en couleurs.'),
  vf('🌈', 'On peut toucher un arc-en-ciel.', 'faux', 'C’est de la lumière : on ne peut pas l’attraper.'),
  vf('🌈', 'La lumière du soleil contient toutes les couleurs.', 'vrai', 'Les gouttes de pluie les séparent : on voit l’arc-en-ciel.'),
  vf('🚿', 'Avec un tuyau d’arrosage, au soleil, on peut faire un arc-en-ciel.', 'vrai', 'Les gouttes d’eau font comme la pluie.'),
  vf('🌈', 'On compte sept couleurs dans l’arc-en-ciel.', 'vrai', 'Rouge, orange, jaune, vert, bleu, indigo et violet.'),
];

function rainbow(rng) {
  const roll = rng();
  if (roll < 0.35) {
    return pictureQuestion({
      key: 'meteo:arc',
      text: 'Quand peut-on voir un arc-en-ciel ?',
      answer: RAINBOW_WHEN.good,
      others: sample(rng, RAINBOW_WHEN.bad, 2),
      success: 'Oui : il faut du soleil et de la pluie en même temps.',
      rng,
    });
  }
  if (roll < 0.55) {
    return fixed({
      key: 'meteo:dos',
      text: 'Pour voir l’arc-en-ciel, où doit être le soleil ?',
      ask: 'Dans ton dos ou devant toi ?',
      stage: picture('🌈'),
      options: ['dans ton dos', 'devant toi'],
      answer: 'dans ton dos',
      success: 'Oui : le soleil est derrière toi, et la pluie devant toi.',
    });
  }
  return trueFalse(rng, RAINBOW_FACTS, 'meteo:arcenciel');
}

// ---------------------------------------------------------------- 7 et 8. Le thermomètre

/** Gradué de 5 en 5, de −10 à 40 degrés (un nombre tous les 10). */
const THERMO_5 = { min: -10, max: 40, minor: 5, major: 10 };
const thermoStage = (scale, value) => drawing({ kind: 'thermo', value, ...scale }, 'Un thermomètre');
const degrees = (v) => `${v} °C`;

function thermoRead(rng, value, candidates, scale) {
  const others = sample(rng, candidates, 2);
  const values = [value, ...others].sort((a, b) => a - b);
  return {
    key: `meteo:thermo:${scale.minor}:${scale.min}:${values.join(',')}:${value}`,
    text: 'Quelle température indique le thermomètre ?',
    instruction: 'Quelle température indique le thermomètre ?',
    stage: thermoStage(scale, value),
    choices: values.map((v) => ({ value: v, label: degrees(v) })),
    choiceStyle: 'words',
    answer: value,
    success: { speak: `Oui, il fait ${value} degrés.` },
  };
}

function thermometer(rng) {
  const roll = rng();
  if (roll < 0.5) {
    // lire de 5 en 5, entre 0 et 40 degrés
    const value = 5 * randInt(rng, 0, 8);
    const near = [value - 10, value - 5, value + 5, value + 10].filter((v) => v >= 0 && v <= 40);
    return thermoRead(rng, value, near, THERMO_5);
  }
  if (roll < 0.75) {
    const hot = rng() < 0.5;
    const value = hot ? pick(rng, [25, 30, 35]) : pick(rng, [-10, -5, 0, 5]);
    return fixed({
      key: `meteo:chaud:${value}`,
      text: 'Regarde le thermomètre. Il fait chaud ou froid ?',
      stage: thermoStage(THERMO_5, value),
      options: ['chaud', 'froid'],
      answer: hot ? 'chaud' : 'froid',
      success: hot ? 'Oui, il fait chaud : le liquide monte haut.' : 'Oui, il fait froid : le liquide reste bas.',
    });
  }
  const freezes = rng() < 0.5;
  const value = freezes ? pick(rng, [-8, -6, -4, -2]) : pick(rng, [5, 10, 15]);
  return fixed({
    key: `meteo:gel:${value}`,
    text: 'Regarde le thermomètre. L’eau des flaques va-t-elle geler ?',
    ask: 'Oui ou non ?',
    stage: thermoStage(THERMO_5, value),
    options: ['oui', 'non'],
    answer: freezes ? 'oui' : 'non',
    success: freezes ? 'Oui : en dessous de zéro degré, l’eau gèle.' : 'Non : au-dessus de zéro degré, l’eau ne gèle pas.',
  });
}

function thermometerPrecise(rng) {
  // gradué de 1 en 1 sur 20 degrés (0 à 20, 10 à 30 ou 20 à 40) : une température qui n'est pas
  // un multiple de 5
  const min = pick(rng, [0, 10, 20]);
  const scale = { min, max: min + 20, minor: 1, major: 10 };
  let value;
  do value = randInt(rng, min + 1, min + 19); while (value % 5 === 0);
  const near = [value - 2, value - 1, value + 1, value + 2].filter((v) => v >= min && v <= min + 20);
  return thermoRead(rng, value, near, scale);
}

// ---------------------------------------------------------------- 9. La météo de la semaine

export const WEEK = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'];
/** Le temps possible selon la saison, et ses températures (jamais en dessous de zéro). */
const SEASON_WEATHER = {
  hiver: { soleil: [6, 10], nuages: [5, 9], pluie: [4, 8], neige: [0, 2], vent: [3, 7] },
  ete: { soleil: [26, 32], nuages: [21, 25], pluie: [17, 21], orage: [24, 29], vent: [19, 23] },
};
/** Les questions « Quel jour… ? » (jamais sur les nuages : la pluie et l'orage en ont aussi). */
export const WHICH_DAY = {
  pluie: 'Quel jour pleut-il ?',
  neige: 'Quel jour neige-t-il ?',
  orage: 'Quel jour y a-t-il de l’orage ?',
  vent: 'Quel jour y a-t-il du vent ?',
};

/** Une semaine : cinq temps tous différents, cinq températures toutes différentes. */
export function makeWeek(rng) {
  const season = pick(rng, Object.keys(SEASON_WEATHER));
  const ids = shuffle(rng, Object.keys(SEASON_WEATHER[season]));
  let temps;
  do temps = ids.map((id) => randInt(rng, ...SEASON_WEATHER[season][id])); while (new Set(temps).size < temps.length);
  return WEEK.map((day, i) => ({ day, w: ids[i], t: temps[i] }));
}

const describeWeek = (days) => `La météo de la semaine. ${days.map((d) => `${capitalize(d.day)} : ${WEATHER_BY_ID[d.w].name}, ${d.t} degrés`).join(' ; ')}.`;

/** Le bon jour et deux autres, dans l'ordre de la semaine. */
function dayChoices(rng, days, answer) {
  const others = sample(rng, days.filter((d) => d !== answer), 2);
  return days.filter((d) => d === answer || others.includes(d)).map((d) => ({ value: d.day, label: d.day }));
}

function forecast(rng) {
  const days = makeWeek(rng);
  const stage = drawing({ kind: 'semaine', days }, describeWeek(days));
  const roll = rng();
  const base = { stage, choiceStyle: 'words' };
  if (roll < 0.4) {
    const answer = pick(rng, days.filter((d) => WHICH_DAY[d.w]));
    const text = WHICH_DAY[answer.w];
    const choices = dayChoices(rng, days, answer);
    return {
      ...base,
      key: `meteo:jour:${days.map((d) => d.w).join(',')}:${answer.w}:${choices.map((c) => c.value).join(',')}`,
      text,
      instruction: text,
      choices,
      answer: answer.day,
      success: { speak: `Oui, ${answer.day}.` },
    };
  }
  if (roll < 0.7) {
    const day = pick(rng, days);
    const text = `Quel temps fait-il ${day.day} ?`;
    const options = shuffle(rng, [day, ...sample(rng, days.filter((d) => d !== day), 2)]);
    return {
      ...base,
      key: `meteo:temps:${days.map((d) => d.w).join(',')}:${day.day}:${options.map((d) => d.w).join(',')}`,
      text,
      instruction: text,
      choices: options.map((d) => weatherChoice(WEATHER_BY_ID[d.w])),
      choiceStyle: 'pictures',
      answer: day.w,
      success: { speak: WEATHER_BY_ID[day.w].says },
    };
  }
  const hottest = rng() < 0.5;
  const answer = days.reduce((a, b) => ((hottest ? b.t > a.t : b.t < a.t) ? b : a));
  const text = hottest ? 'Quel jour fait-il le plus chaud ?' : 'Quel jour fait-il le plus froid ?';
  const choices = dayChoices(rng, days, answer);
  return {
    ...base,
    key: `meteo:${hottest ? 'chaud' : 'froid'}:${days.map((d) => d.t).join(',')}:${choices.map((c) => c.value).join(',')}`,
    text,
    instruction: text,
    choices,
    answer: answer.day,
    success: { speak: `Oui, il fait ${answer.t} degrés.` },
  };
}

// ---------------------------------------------------------------- Le jeu

const METEO_LEVELS = [symbols, clothes, rain, wind, storm, rainbow, thermometer, thermometerPrecise, forecast];

export const meteo = {
  id: 'meteo',
  domain: 'sciences',
  title: 'La météo',
  icon: '🌦️',
  skill: 'Observer la météo : les symboles, s’habiller, le thermomètre, la pluie, le vent, l’orage',
  levels: [
    'Les symboles météo', 'S’habiller selon le temps', 'Les nuages et la pluie', 'Le vent', 'L’orage',
    'L’arc-en-ciel', 'Le thermomètre', 'Lire au degré près', 'La météo de la semaine', 'Toute la météo',
  ],
  generate(level, rng) {
    // niveau 10 : un peu de tout (sauf les symboles, trop faciles)
    const make = level >= 10 ? pick(rng, METEO_LEVELS.slice(1)) : METEO_LEVELS[level - 1];
    return make(rng);
  },
};

export const CIEL_GAMES = [ciel, meteo];
