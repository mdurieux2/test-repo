// Fabrique des éléments DOM à partir des données des questions.

import { ACCESSORIES, avatarSvg } from './characters.js';
import { PIECES } from './games/logique.js';
import { FLAGS, flagMarkup } from './games/drapeaux.js';
import { balanceSvg, describeBalance, describeFigure, figureSvg } from './games/logique-plus.js';
import { fractionSvg, numberLineSvg } from './games/nombres-plus.js';
import { drawingSvg } from './games/vivre.js';
import { gaucheDroiteSvg } from './games/gauche-droite.js';
import { cielSvg } from './games/ciel.js';
import { technoSvg } from './games/techno.js';
import { ce2Svg } from './games/ce2.js';
import { barModelMarkup, chartMarkup, describeChart, describeModel, schemaMarkup } from './games/donnees.js';
import {
  CONTINENTS, COUNTRIES, EUROPE_DRAWN, EUROPE_TARGETS, OCEANS, SEAS, VIEWS, WORLD_TARGETS, atIn, dotFor, mapPaths, toXY,
} from './data/carte-data.js';
import { decouperPhrase } from './syllabes.js';
import { couleurEmoji, nomAffiche } from './couleurs.js';

// Aides de la question en cours, d'après le profil d'accessibilité de l'enfant (main.js les règle
// avant de dessiner chaque question) : syllabes colorées, couleurs nommées.
let aides = { syllables: false, namedColors: false, domain: null };
export function setAides(next) {
  aides = { syllables: false, namedColors: false, domain: null, ...next };
}

/** Le nom d'une couleur, écrit sous sa pastille (réglage « couleurs nommées »). */
export function colorName(name) {
  return aides.namedColors && name ? h('span', { class: 'color-name', 'aria-hidden': 'true' }, nomAffiche(name, aides.domain)) : null;
}

/** Le nom d'un émoji de couleur (🟥 → rouge), écrit dessous avec les couleurs nommées. */
export function emojiColorName(emoji) {
  return aides.namedColors ? colorName(couleurEmoji(emoji, aides.domain)) : null;
}

/** Un émoji de couleur (🟥, 🔵…) et, avec les couleurs nommées, son nom dessous. */
function withColorName(content, emoji) {
  const name = aides.namedColors ? couleurEmoji(emoji, aides.domain) : null;
  return name ? h('span', { class: 'color-named' }, content, colorName(name)) : content;
}

/** Les syllabes d'un morceau de texte (parties de decouperPhrase) : deux couleurs, lettres muettes en gris. */
function syllableNodes(parts) {
  return parts.flatMap((part) => (part.syllabes
    ? part.syllabes.map((syl, i) => h('span', { class: `syl ${i % 2 ? 'syl-b' : 'syl-a'}` },
      syl.map((m) => (m.muet ? h('span', { class: 'muet' }, m.text) : m.text))))
    : [part.text]));
}

/** Un texte à lire (consigne, phrase, choix) : ses syllabes colorées si le réglage est actif, sinon le texte tel quel. */
export function readable(text) {
  if (!aides.syllables || typeof text !== 'string' || !/\p{L}/u.test(text)) return text;
  return h('span', { class: 'syllabes' }, decouperPhrase(text).flatMap((parts, i) => (i ? [' ', ...syllableNodes(parts)] : syllableNodes(parts))));
}

/** h('div', {class: 'x', onclick}, enfant1, enfant2…) */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else if (key === 'class') el.className = value;
    else if (key === 'style' && typeof value === 'object') {
      for (const [prop, v] of Object.entries(value)) {
        if (prop.startsWith('--')) el.style.setProperty(prop, v); // variables CSS (--cols…)
        else el.style[prop] = v;
      }
    }
    else el.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

/** Une collection d'objets rangés par lignes de 5 (ou 10) : plus facile à dénombrer. */
export function objectsGrid(emoji, count, perRow = 5, extraClass = '') {
  const rows = [];
  for (let i = 0; i < count; i += perRow) {
    const n = Math.min(perRow, count - i);
    rows.push(h('div', { class: 'objects-row' }, Array.from({ length: n }, () => h('span', { class: 'object' }, emoji))));
  }
  return h('div', { class: `objects per-${perRow} ${extraClass}`, 'aria-label': String(count), role: 'img' }, rows);
}

function operationStage({ a, b, op, emoji, hideEquation = false }) {
  const eq = h('div', { class: 'equation' },
    h('span', { class: 'num' }, a), h('span', { class: 'op' }, op),
    h('span', { class: 'num' }, b), h('span', { class: 'op' }, '='),
    h('span', { class: 'num gap' }, '?'));
  if (!emoji) return h('div', { class: 'stage-operation' }, eq);
  // --cols : le nombre d'objets sur la ligne la plus large ; moins il y en a, plus ils sont grands (style.css)
  let visual;
  if (op === '+') {
    visual = h('div', { class: 'operation-visual', style: { '--cols': Math.min(a, 5) + Math.min(b, 5) + 1 } },
      objectsGrid(emoji, a, 5, 'small'), h('span', { class: 'op' }, '+'), objectsGrid(emoji, b, 5, 'small'));
  } else {
    // Soustraction : on barre les objets qu'on enlève.
    const items = Array.from({ length: a }, (_, i) =>
      h('span', { class: i >= a - b ? 'object removed' : 'object' }, emoji));
    const perRow = a > 10 ? 10 : 5;
    const rows = [];
    for (let i = 0; i < a; i += perRow) rows.push(h('div', { class: 'objects-row' }, items.slice(i, i + perRow)));
    visual = h('div', { class: 'operation-visual', style: { '--cols': Math.min(a, perRow) } }, h('div', { class: `objects small per-${perRow}` }, rows));
  }
  return h('div', { class: 'stage-operation' }, visual, hideEquation ? null : eq);
}

/** Petit problème : l'histoire écrite, et des images pour les plus jeunes. */
function storyStage({ text, picture }) {
  return h('div', { class: 'stage-story' },
    h('p', { class: 'story-text' }, wordSpans(text)),
    picture ? operationStage({ ...picture, hideEquation: true }) : null);
}

/** Horloge à aiguilles : la petite aiguille (heures) est courte et épaisse, la grande est longue et fine. */
export function clockSvg(hours, minutes) {
  const hourAngle = ((hours % 12) + minutes / 60) * 30;
  const minuteAngle = minutes * 6;
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const big = i % 5 === 0;
    return `<line x1="50" y1="${big ? 7 : 6}" x2="50" y2="${big ? 12 : 9}" stroke="${big ? '#2b2d42' : '#b9b2a3'}" stroke-width="${big ? 1.6 : 0.8}" transform="rotate(${i * 6} 50 50)"/>`;
  }).join('');
  const numbers = Array.from({ length: 12 }, (_, i) => {
    const n = i + 1;
    const a = (n * 30 * Math.PI) / 180;
    return `<text x="${(50 + 32 * Math.sin(a)).toFixed(2)}" y="${(50 - 32 * Math.cos(a)).toFixed(2)}">${n}</text>`;
  }).join('');
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="50" r="47" fill="#fff" stroke="#2b2d42" stroke-width="3"/>
    ${ticks}
    <g class="clock-numbers">${numbers}</g>
    <line class="hand-hour" x1="50" y1="50" x2="50" y2="29" stroke="#2b2d42" stroke-width="5" stroke-linecap="round" transform="rotate(${hourAngle} 50 50)"/>
    <line class="hand-minute" x1="50" y1="50" x2="50" y2="13" stroke="#e8650c" stroke-width="2.6" stroke-linecap="round" transform="rotate(${minuteAngle} 50 50)"/>
    <circle cx="50" cy="50" r="3.2" fill="#2b2d42"/>
  </svg>`;
}

function clockStage({ h: hours, m: minutes }) {
  const el = h('div', { class: 'stage-clock', role: 'img', 'aria-label': 'Une horloge à aiguilles' });
  el.innerHTML = clockSvg(hours, minutes);
  return el;
}

function frameStage({ size, filled }) {
  const cells = Array.from({ length: size }, (_, i) => h('span', { class: i < filled ? 'cell full' : 'cell' }));
  return h('div', { class: `frame frame-${size}` }, cells);
}

/** Boîtes de 10 côte à côte (11 à 20 : deux boîtes). */
function framesStage({ filled, frames = 1 }) {
  return h('div', { class: 'frames' },
    Array.from({ length: frames }, (_, f) => frameStage({ size: 10, filled: Math.max(0, Math.min(10, filled - f * 10)) })));
}

// Constellations du dé, cases d'une grille 3 × 3.
const DICE = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

function diceStage({ value }) {
  return h('div', { class: 'dice', role: 'img', 'aria-label': String(value) },
    Array.from({ length: 9 }, (_, i) => h('span', { class: DICE[value].includes(i) ? 'pip on' : 'pip' })));
}

/** Matériel de numération : plaques de 100, barres de 10 et cubes. */
function blocksStage({ hundreds = 0, tens, units }) {
  const bar = () => h('span', { class: 'bar' }, Array.from({ length: 10 }, () => h('span', { class: 'cube' })));
  return h('div', { class: hundreds ? 'blocks has-hundreds' : 'blocks', role: 'img', 'aria-label': String(hundreds * 100 + tens * 10 + units) },
    hundreds ? h('div', { class: 'plates' }, Array.from({ length: hundreds }, () => h('span', { class: 'plate' }))) : null,
    tens ? h('div', { class: 'bars' }, Array.from({ length: tens }, bar)) : null,
    units ? h('div', { class: 'loose-cubes' }, Array.from({ length: units }, () => h('span', { class: 'cube' }))) : null);
}

/** Objets éparpillés : positions en % calculées par le jeu (sans chevauchement). */
function scatterStage({ emoji, positions }) {
  return h('div', { class: 'scatter', role: 'img', 'aria-label': String(positions.length) },
    // marge de 7 % pour qu'aucun objet ne touche le bord du cadre
    positions.map((p) => h('span', { class: 'object', style: { left: `${7 + p.x * 0.86}%`, top: `${7 + p.y * 0.86}%` } }, emoji)));
}

/** Affiche la quantité quelques secondes puis la cache (« Vite vu ! »). */
function flashStage({ inner, duration }, actions) {
  const box = h('div', { class: 'flash' }, h('div', { class: 'flash-inner' }, renderStage(inner, actions)), h('div', { class: 'flash-cover' }, '?'));
  let timer;
  const showFor = () => {
    box.classList.remove('hidden');
    clearTimeout(timer);
    timer = setTimeout(() => box.classList.add('hidden'), duration);
  };
  showFor();
  return h('div', { class: 'flash-wrap' }, box, h('button', { class: 'again-btn', onclick: showFor }, '👀 Revoir'));
}

/** 3 × 2 : l'opération, et pour les petits produits, 3 paquets de 2 objets. */
function multiplicationStage({ a, b, groups }) {
  const eq = h('div', { class: 'equation' },
    h('span', { class: 'num' }, a), h('span', { class: 'op' }, '×'), h('span', { class: 'num' }, b),
    h('span', { class: 'op' }, '='), h('span', { class: 'num gap' }, '?'));
  if (!groups) return h('div', { class: 'stage-operation' }, eq);
  return h('div', { class: 'stage-operation' },
    h('div', { class: 'groups' }, Array.from({ length: groups.groups }, () =>
      h('span', { class: 'group' }, Array.from({ length: groups.size }, () => h('span', { class: 'object' }, groups.emoji))))),
    eq);
}

/** Formes géométriques simples en SVG. */
export function shapeSvg(shape, color = '#7b61ff') {
  const paths = {
    rond: '<circle cx="50" cy="50" r="40"/>',
    carré: '<rect x="12" y="12" width="76" height="76" rx="6"/>',
    triangle: '<path d="M50 10 L92 86 L8 86 Z" stroke-linejoin="round"/>',
    rectangle: '<rect x="4" y="26" width="92" height="48" rx="6"/>',
    étoile: '<path d="M50 6 L62 38 L96 38 L68 58 L79 92 L50 71 L21 92 L32 58 L4 38 L38 38 Z"/>',
    cœur: '<path d="M50 88 C10 60 4 34 22 20 C36 10 48 18 50 28 C52 18 64 10 78 20 C96 34 90 60 50 88 Z"/>',
  };
  const el = h('span', { class: 'shape', role: 'img', 'aria-label': shape });
  el.innerHTML = `<svg viewBox="0 0 100 100" fill="${color}">${paths[shape]}</svg>`;
  return el;
}

/**
 * @param {object} stage   description venant de la question
 * @param {object} actions { replay: () => void }
 */
export function renderStage(stage, actions) {
  switch (stage.type) {
    case 'picture':
      return withColorName(h('button', { class: 'stage-picture', onclick: actions.replay, 'aria-label': 'Réécouter' }, stage.emoji), stage.emoji);
    case 'listen':
      return h('button', { class: 'stage-listen', onclick: actions.replay, 'aria-label': 'Réécouter' }, '🔊');
    case 'objects':
      return objectsGrid(stage.emoji, stage.count, stage.perRow);
    case 'scatter':
      return scatterStage(stage);
    case 'dice':
      return diceStage(stage);
    case 'frames':
      return framesStage(stage);
    case 'blocks':
      return blocksStage(stage);
    case 'flash':
      return flashStage(stage, actions);
    case 'pattern':
      // suite de motifs (algorithme) : le dernier élément est à trouver ; peu d'images (4 au plus :
      // « quel mot les regroupe ? », une rangée d'animaux) : plus grandes
      return h('div', { class: `pattern n${stage.items.length}${stage.items.length <= 4 ? ' few' : ''}` },
        stage.items.map((it) => withColorName(h('span', { class: it === null ? 'pattern-item gap' : 'pattern-item' }, it === null ? '?' : it), it)));
    case 'shape':
      return shapeSvg(stage.shape, stage.color);
    case 'multiplication':
      return multiplicationStage(stage);
    case 'swatch': {
      const swatch = h('span', { class: 'stage-swatch', style: { background: stage.color }, role: stage.name ? 'img' : undefined, 'aria-label': stage.name });
      return aides.namedColors && stage.name ? h('span', { class: 'color-named' }, swatch, colorName(stage.name)) : swatch;
    }
    case 'sentence':
      return h('p', { class: 'stage-sentence', lang: stage.lang }, wordSpans(stage.text, stage.lang));
    case 'accord':
      return accordStage(stage);
    case 'text':
      return textStage(stage, actions);
    case 'word':
      return h('button', { class: 'stage-word', lang: stage.lang, onclick: actions.replay }, stage.lang ? stage.text : readable(stage.text));
    case 'operation':
      return operationStage(stage);
    case 'story':
      return storyStage(stage);
    case 'clock':
      return clockStage(stage);
    case 'cubes':
      return cubesStage(stage);
    case 'money':
      return h('div', { class: 'stage-money' }, stage.items.map(moneyItem));
    case 'price':
      return priceStage(stage);
    case 'ruler':
      return rulerStage(stage);
    case 'balance':
      return balanceStage(stage);
    case 'calendar':
      return calendarStage(stage);
    case 'tangram':
      return tangramStage(stage);
    case 'karaoke':
      return karaokeStage(stage, actions);
    case 'sequence':
      return h('div', { class: `sequence${stage.items.some((n) => typeof n === 'string') ? ' words' : ''}` },
        stage.items.map((n) => h('span', { class: n === null ? 'seq-item gap' : 'seq-item' }, n === null ? '?' : n)));
    case 'frame':
      return frameStage(stage);
    case 'flag':
      return flagStage(stage);
    case 'matrix':
      return matrixStage(stage);
    case 'scales':
      return scalesStage(stage);
    case 'numberline':
      return numberLineElement(stage);
    case 'fraction':
      return h('div', { class: 'stage-fraction' }, fractionElement(stage));
    case 'drawing':
      return drawingElement(stage.drawing, `stage-drawing drawing-${stage.drawing.kind}`, stage.label);
    case 'chart':
      return markupStage(`stage-chart chart-${stage.chart.kind}`, chartMarkup(stage.chart), describeChart(stage.chart));
    case 'schema':
      return markupStage(`stage-schema${stage.model ? ' with-model' : ''}`, schemaMarkup(stage), stage.model ? describeModel(stage.model) : null);
    case 'equation':
      return h('div', { class: 'equation big' },
        stage.parts.map((p) => h('span', { class: p === null ? 'num gap' : typeof p === 'number' ? 'num' : 'op' }, p === null ? '?' : p)));
    case 'share':
      return shareScene(stage);
    case 'column':
      return columnGrid(stage);
    default:
      return h('div', { class: 'stage-empty' });
  }
}

/** Accords : le mot (ou la phrase) de départ et ce qu'il devient (« un chat → des … »), avec son image. */
function accordStage({ emoji, count = 1, from, to }) {
  return h('div', { class: 'stage-accord' },
    emoji ? objectsGrid(emoji, count, 5, 'small') : null,
    h('p', { class: 'accord-line' },
      from ? h('span', { class: 'accord-from' }, from) : null,
      from ? h('span', { class: 'accord-arrow', 'aria-hidden': 'true' }, '→') : null,
      h('span', { class: 'accord-to' }, to)));
}
/** Un dessin fabriqué en texte (HTML ou SVG) par le jeu : tableaux, graphiques, schémas en barres. */
function markupStage(cls, markup, label) {
  const el = h('div', { class: cls, 'aria-label': label || undefined });
  el.innerHTML = markup;
  return el;
}

/** Petit texte à lire ; le bouton 🔊 le lit à voix haute, en cas de besoin. */
function textStage({ title, text }, actions) {
  return h('div', { class: 'stage-text' },
    title ? h('h2', { class: 'text-title' }, title) : null,
    h('p', { class: 'text-body' }, wordSpans(text)),
    h('button', { class: 'text-listen', onclick: () => actions.speak?.([{ text: `${title ? `${title}. ` : ''}${text}`, rate: 0.9 }]) }, '🔊 Écouter le texte'));
}

/** Petite scène « où est le chat ? » : sur, sous, à côté de la table, ou dans le panier. */
function sceneContent({ who, where }, label) {
  const el = h('span', { class: `scene scene-${where}`, role: 'img', 'aria-label': label });
  if (where === 'in') {
    el.append(h('span', { class: 'scene-who' }, who), h('span', { class: 'scene-basket' }, '🧺'));
  } else {
    el.append(h('span', { class: 'scene-table' }, h('span', { class: 'tbl-top' }), h('span', { class: 'tbl-leg l' }), h('span', { class: 'tbl-leg r' })),
      h('span', { class: 'scene-who' }, who));
  }
  return el;
}

/**
 * Des cubes empilés, dessinés en perspective (isométrique). heights[y][x] = nombre de cubes
 * de la pile ; y grandit vers l'enfant, x vers la droite. On dessine du fond vers l'avant.
 */
export function cubesSvg(heights) {
  const iso = (x, y, z) => [(x - y) * 0.866, (x + y) * 0.5 - z];
  const cubes = [];
  heights.forEach((row, y) => row.forEach((hgt, x) => { for (let z = 0; z < hgt; z++) cubes.push([x, y, z]); }));
  cubes.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
  const all = [];
  const face = (cls, pts) => {
    all.push(...pts);
    return `<polygon class="${cls}" points="${pts.map(([X, Y]) => `${X.toFixed(3)},${Y.toFixed(3)}`).join(' ')}"/>`;
  };
  const faces = cubes.map(([x, y, z]) => [
    face('cube-right', [iso(x + 1, y, z), iso(x + 1, y + 1, z), iso(x + 1, y + 1, z + 1), iso(x + 1, y, z + 1)]),
    face('cube-left', [iso(x, y + 1, z), iso(x + 1, y + 1, z), iso(x + 1, y + 1, z + 1), iso(x, y + 1, z + 1)]),
    face('cube-top', [iso(x, y, z + 1), iso(x + 1, y, z + 1), iso(x + 1, y + 1, z + 1), iso(x, y + 1, z + 1)]),
  ].join('')).join('');
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const [minX, minY] = [Math.min(...xs) - 0.1, Math.min(...ys) - 0.1];
  const [w, hgt] = [Math.max(...xs) - minX + 0.1, Math.max(...ys) - minY + 0.1];
  return `<svg viewBox="${minX.toFixed(2)} ${minY.toFixed(2)} ${w.toFixed(2)} ${hgt.toFixed(2)}" aria-hidden="true">${faces}</svg>`;
}

function cubesStage({ heights }) {
  const el = h('div', { class: 'stage-cubes', role: 'img', 'aria-label': 'Des cubes empilés' });
  el.innerHTML = cubesSvg(heights);
  return el;
}

/** Une pièce ou un billet en euros (le montant est toujours écrit). */
export function moneyItem(value) {
  if (value <= 2) return h('span', { class: `coin coin-${value}`, 'aria-label': `${value} euro${value > 1 ? 's' : ''}` }, h('b', {}, value), '€');
  return h('span', { class: `note note-${value}`, 'aria-label': `billet de ${value} euros` }, h('b', {}, value), ' €');
}

function priceStage({ emoji, price, paid }) {
  return h('div', { class: 'stage-price' },
    h('span', { class: 'price-item', 'aria-hidden': 'true' }, emoji),
    h('span', { class: 'price-tag' }, `${price} €`),
    paid ? h('span', { class: 'price-paid' }, 'Tu donnes ', moneyItem(paid)) : null);
}

/** Une règle graduée en centimètres, avec un crayon posé dessus. */
function rulerStage({ start, length }) {
  const el = h('div', { class: 'stage-ruler', role: 'img', 'aria-label': 'Un crayon sur une règle' });
  const ticks = Array.from({ length: 11 }, (_, i) => `<line x1="${5 + i * 10}" y1="34" x2="${5 + i * 10}" y2="24" /><text x="${5 + i * 10}" y="46">${i}</text>`).join('');
  const half = Array.from({ length: 10 }, (_, i) => `<line x1="${10 + i * 10}" y1="34" x2="${10 + i * 10}" y2="29" />`).join('');
  const x0 = 5 + start * 10;
  const x1 = x0 + length * 10;
  el.innerHTML = `<svg viewBox="0 0 110 50">
    <rect x="1" y="22" width="108" height="27" rx="3" class="ruler-body"/>
    <g class="ruler-ticks">${ticks}${half}</g>
    <rect x="${x0}" y="8" width="${length * 10 - 6}" height="9" class="pencil-body"/>
    <polygon points="${x1 - 6},8 ${x1},12.5 ${x1 - 6},17" class="pencil-tip"/>
    <rect x="${x0}" y="8" width="3" height="9" class="pencil-end"/>
  </svg>`;
  return el;
}

/** Une balance penchée du côté le plus lourd. */
function balanceStage({ left, right, heavier }) {
  const tilt = heavier === 'left' ? -12 : 12;
  const el = h('div', { class: 'stage-balance', role: 'img', 'aria-label': 'Une balance' });
  el.innerHTML = `<svg viewBox="0 0 120 80">
    <polygon points="52,76 68,76 60,40" class="balance-foot"/>
    <g transform="rotate(${tilt} 60 40)">
      <rect x="12" y="37" width="96" height="5" rx="2" class="balance-beam"/>
      <line x1="20" y1="40" x2="20" y2="52" class="balance-rope"/><line x1="100" y1="40" x2="100" y2="52" class="balance-rope"/>
      <path d="M6 52 h28 a14 6 0 0 1 -28 0z" class="balance-pan"/><path d="M86 52 h28 a14 6 0 0 1 -28 0z" class="balance-pan"/>
      <text x="20" y="50" class="balance-emoji">${left}</text><text x="100" y="50" class="balance-emoji">${right}</text>
    </g>
    <circle cx="60" cy="40" r="3.5" class="balance-pivot"/>
  </svg>`;
  return el;
}

/** Un mois du calendrier (lundi en premier), une date entourée. */
function calendarStage({ month, days, firstWeekday, mark }) {
  const head = ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d) => h('span', { class: 'cal-head' }, d));
  const blanks = Array.from({ length: firstWeekday }, () => h('span', { class: 'cal-day empty' }));
  const dates = Array.from({ length: days }, (_, i) => h('span', { class: i + 1 === mark ? 'cal-day mark' : 'cal-day' }, i + 1));
  return h('div', { class: 'stage-calendar' },
    h('div', { class: 'cal-month' }, month),
    h('div', { class: 'cal-grid' }, head, blanks, dates));
}

/** Les pièces du carré : les triangles posés, et le trou (en pointillés). */
function tangramStage({ grid, pieces, missing }) {
  const cell = (c) => [(c % grid), Math.floor(c / grid)];
  const poly = (shape, c, attrs) => {
    const [cx, cy] = cell(c);
    const pts = PIECES[shape].map(([x, y]) => `${(cx + x) * 50},${(cy + y) * 50}`).join(' ');
    return `<polygon points="${pts}" ${attrs}/>`;
  };
  const size = grid * 50;
  const el = h('div', { class: 'stage-tangram', role: 'img', 'aria-label': 'Un carré avec une pièce qui manque' });
  el.innerHTML = `<svg viewBox="-3 -3 ${size + 6} ${size + 6}">
    ${pieces.map((p) => poly(p.shape, p.cell, `fill="${p.color}" class="tangram-piece"`)).join('')}
    ${poly(missing.shape, missing.cell, 'class="tangram-hole"')}
  </svg>`;
  return el;
}

function pieceContent(shape) {
  const el = h('span', { class: 'tangram-choice', role: 'img', 'aria-label': 'pièce' });
  el.innerHTML = `<svg viewBox="-4 -4 58 58"><polygon points="${PIECES[shape].map(([x, y]) => `${x * 50},${y * 50}`).join(' ')}" class="tangram-piece choice-piece"/></svg>`;
  return el;
}

/** Silhouette noire d'un objet (jeu des ombres). */
function shadowContent(emoji, label, transform) {
  return h('span', { class: 'shadow', role: 'img', 'aria-label': label || 'ombre', style: transform ? { transform } : undefined }, emoji);
}

/** Un drapeau ; `hole` efface une bande (niveau « Complète le drapeau »). */
export function flagElement(code, hole = null, extraClass = '') {
  const el = h('span', { class: `flag ${extraClass}`.trim(), role: 'img', 'aria-label': `Drapeau : ${FLAGS[code].label}` });
  el.innerHTML = flagMarkup(code);
  // couleurs nommées : les couleurs des bandes, dans l'ordre (« ? » pour la bande effacée)
  const { bands } = FLAGS[code];
  if (aides.namedColors && bands) {
    el.append(h('span', { class: `flag-colors flag-colors-${bands.dir}`, 'aria-hidden': 'true' },
      bands.colors.map((c, i) => h('span', {}, hole && hole.index === i ? '?' : c))));
  }
  if (hole) {
    const size = (hole.dir === 'v' ? 30 : 20) / hole.count;
    const rect = hole.dir === 'v'
      ? `<rect x="${hole.index * size}" y="0" width="${size}" height="20" class="flag-hole"/>`
      : `<rect x="0" y="${hole.index * size}" width="30" height="${size}" class="flag-hole"/>`;
    el.querySelector('svg').insertAdjacentHTML('beforeend', `${rect}<text x="${hole.dir === 'v' ? (hole.index + 0.5) * size : 15}" y="${hole.dir === 'v' ? 10 : (hole.index + 0.5) * size}" class="flag-q">?</text>`);
  }
  return el;
}

function flagStage({ code, hole, caption }) {
  return h('div', { class: 'stage-flag' }, flagElement(code, hole), caption ? h('span', { class: 'flag-caption' }, caption) : null);
}

// Le tableau logique : chaque dessin a ses propres motifs (rayures, pois), d'où un numéro unique.
let figureCount = 0;
export function figureElement(fig, extraClass = '') {
  const el = h('span', { class: `figure ${extraClass}`.trim(), role: 'img', 'aria-label': describeFigure(fig) });
  el.innerHTML = figureSvg(fig, `fig${++figureCount}`);
  return el;
}

/** La grille 3 × 3 du tableau logique ; la case vide porte un « ? ». */
function matrixStage({ cells }) {
  return h('div', { class: 'matrix', role: 'group', 'aria-label': 'Tableau de 3 lignes et 3 colonnes' },
    cells.map((fig) => (fig ? h('span', { class: 'matrix-cell' }, figureElement(fig)) : h('span', { class: 'matrix-cell gap', 'aria-label': 'Case vide' }, '?'))));
}

/** Les balances en équilibre, et l'animal dont on cherche le poids. */
function scalesStage({ balances, animals, ask }) {
  return h('div', { class: `stage-scales n${balances.length}`, style: { '--n': balances.length } },
    balances.map((b) => {
      const el = h('span', { class: 'scale', role: 'img', 'aria-label': describeBalance(b, animals) });
      el.innerHTML = balanceSvg(b, animals);
      return el;
    }),
    h('div', { class: 'scales-ask' }, h('span', { class: 'scales-animal', 'aria-label': animals[ask].name }, animals[ask].emoji), ' = ', h('span', { class: 'gap' }, '?'), ' kg'));
}

// ---------------------------------------------------------------- La carte du monde

const SVG_NS = 'http://www.w3.org/2000/svg';
/** svg('path', {d: …}, enfants…) : comme h(), pour les éléments SVG. */
function svg(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) if (value !== undefined && value !== null) el.setAttribute(key, value);
  el.append(...children.flat().filter(Boolean));
  return el;
}

// Couleurs de la carte : décoratives seulement (chaque zone a son contour, et son nom s'affiche
// quand on la touche). Deux pays voisins n'ont jamais la même couleur.
const CONTINENT_FILL = {
  europe: '#f4b6c2', asie: '#f9d27a', afrique: '#f6a96b', 'amerique-nord': '#8fd3c7', 'amerique-sud': '#b8e08c', oceanie: '#c9a7e8',
  antarctique: '#f4f8fb',
};
const PASTELS = { A: '#f7c59f', B: '#a8dadc', C: '#f6e27f', D: '#c3b1e1', E: '#b5e48c', F: '#f4a6a6' };
const COUNTRY_FILL = {
  fr: 'A', es: 'C', pt: 'B', it: 'C', de: 'D', ch: 'B', at: 'E', cz: 'F', pl: 'B', be: 'C', nl: 'A', lu: 'E', dk: 'A', gb: 'D', ie: 'E',
  no: 'B', se: 'F', fi: 'C', ru: 'A', gr: 'F', ma: 'B', us: 'D', ca: 'B', mx: 'E', br: 'A', ar: 'F', cn: 'C', in: 'E', au: 'E', jp: 'F',
  eg: 'C', za: 'D',
};

/** Une étoile à 5 branches de rayon r, en (x, y). */
function starAt(x, y, r) {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    return `${(x + rr * Math.cos(a)).toFixed(2)},${(y + rr * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
}

/**
 * La carte d'une question du jeu « La carte du monde » : un SVG dont les zones touchables portent
 * data-zone (continent, océan, mer, pays, capitale) ; la mer porte data-kind="sea" et les terres
 * sans nom data-kind="land". Les noms (.map-label) sont cachés jusqu'à ce qu'on touche la zone.
 */
export function mapElement({ view, layer, zones = [], start = null, radius = 1, compass = false }) {
  const paths = mapPaths(view);
  const [bx, by, bw, bh] = paths.box;
  const L = VIEWS[view].label; // taille des noms, en unités de la carte
  const touch = new Set(zones);
  const zone = (id) => (touch.has(id) ? id : undefined);
  const root = svg('svg', {
    viewBox: paths.box.map((v) => v.toFixed(2)).join(' '),
    class: `world-map map-${view} layer-${layer}`,
    role: 'img',
    'aria-label': view === 'europe' ? 'Carte de l’Europe' : 'Carte du monde',
    style: `--ratio: ${(bw / bh).toFixed(4)}`,
  });
  root.append(
    svg('defs', {}, svg('pattern', { id: 'map-hatch', width: L * 0.7, height: L * 0.7, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' },
      svg('rect', { width: L * 0.3, height: L * 0.7, class: 'map-hatch-line' }))),
    svg('rect', { x: bx, y: by, width: bw, height: bh, class: 'map-sea', 'data-kind': 'sea' }),
  );
  // les océans et les mers, sous les terres (leurs bords passent sur les continents)
  const waters = layer === 'oceans' ? [...Object.keys(OCEANS).map((id) => [id, paths.oceans[id]]), ['mediterranee', paths.seas.mediterranee]]
    : layer === 'seas' ? ['atlantique', 'mer-du-nord', 'baltique', 'mediterranee'].map((id) => [id, paths.seas[id]]) : [];
  for (const [id, d] of waters) root.append(svg('path', { d, class: 'map-water map-zone', 'data-zone': zone(id) }));
  // les terres : chaque continent (sans les frontières entre ses morceaux), ou toutes les terres sans nom
  const landGroup = (d, attrs) => svg('g', attrs, svg('path', { d, class: 'map-outline' }), svg('path', { d, class: 'map-fill' }));
  if (layer === 'continents') {
    for (const id of Object.keys(CONTINENTS)) {
      root.append(landGroup(paths.continents[id], { class: 'map-continent map-zone', 'data-zone': zone(id), style: `--fill: ${CONTINENT_FILL[id]}` }));
    }
  } else {
    root.append(landGroup(Object.values(paths.continents).join(''), { class: 'map-land', 'data-kind': 'land' }));
  }
  // les pays (dessinés sur les cartes de pays et de capitales)
  const drawn = view === 'europe' ? EUROPE_DRAWN : WORLD_TARGETS;
  if (layer === 'countries' || layer === 'capitals') {
    for (const id of drawn) {
      root.append(svg('path', {
        d: paths.countries[id],
        class: `map-country${zone(id) || id === start ? ' map-zone' : ''}${id === start ? ' map-start' : ''}`,
        'data-zone': zone(id) || (id === start ? id : undefined),
        style: `--fill: ${PASTELS[COUNTRY_FILL[id]]}`,
      }));
    }
    if (start) root.append(svg('path', { d: paths.countries[start], class: 'map-start-hatch' }));
    // les petits pays qu'on peut demander : un point touchable, assez grand pour un doigt
    for (const id of view === 'europe' ? EUROPE_TARGETS : WORLD_TARGETS) {
      const dot = layer === 'countries' && touch.has(id) && dotFor(view, id);
      if (!dot) continue;
      const [x, y, r] = dot;
      root.append(svg('g', { class: 'map-dot map-zone', 'data-zone': id, style: `--fill: ${PASTELS[COUNTRY_FILL[id]]}` },
        svg('circle', { cx: x, cy: y, r, class: 'map-dot-hit' }), svg('circle', { cx: x, cy: y, r: r * 0.45, class: 'map-dot-mark' })));
    }
  }
  // les capitales : des étoiles
  const cityAt = (id) => toXY(COUNTRIES[id.slice(4)].capital[1], COUNTRIES[id.slice(4)].capital[2]);
  if (layer === 'capitals') {
    for (const id of zones) {
      const [x, y] = cityAt(id);
      root.append(svg('g', { class: 'map-city map-zone', 'data-zone': id },
        svg('circle', { cx: x, cy: y, r: radius, class: 'map-dot-hit' }), svg('polygon', { points: starAt(x, y, radius * 0.75), class: 'map-star' })));
    }
  }
  // les noms, cachés tant qu'on n'a pas touché la zone
  const labels = svg('g', { class: 'map-labels' });
  const addLabel = (id, [lon, lat], { text = zoneLabel(id), size = L, cls = '' } = {}) => {
    const [x, y] = id.startsWith('cap-') ? cityAt(id) : toXY(lon, lat);
    const dy = id.startsWith('cap-') ? -radius * 1.1 : size * 0.35;
    // le nom reste entier dans la carte, même pour un pays au bord
    const half = text.length * size * 0.28;
    const cx = Math.min(Math.max(x, bx + half + size * 0.2), bx + bw - half - size * 0.2);
    labels.append(svg('text', { x: cx, y: Math.max(y + dy, by + size), class: `map-label ${cls}`.trim(), 'data-for': id, 'font-size': size }, text));
  };
  for (const id of touch) {
    if (id.startsWith('cap-')) addLabel(id, [0, 0]);
    else if (COUNTRIES[id]) addLabel(id, atIn(view, id));
    else {
      const z = CONTINENTS[id] || OCEANS[id] || SEAS[id];
      addLabel(id, view === 'europe' && SEAS[id] ? SEAS[id].at : z.at);
      if (layer === 'oceans' && z.at2) addLabel(id, z.at2);
    }
  }
  // le pays de départ : hachuré, avec un drapeau (son nom est écrit sous la carte)
  if (start) addLabel(start, atIn(view, start), { text: '🚩', size: L * 1.4, cls: 'map-start-label show' });
  root.append(labels);
  // la rose des vents (voyages) : N en haut, E à droite, S en bas, O à gauche
  if (compass) {
    const r = L * 1.6;
    const [cx, cy] = [bx + bw - r * 1.7, by + r * 1.7];
    const letter = (t, x, y) => svg('text', { x, y: y + L * 0.32, class: 'map-compass-letter', 'font-size': L * 0.85 }, t);
    root.append(svg('g', { class: 'map-compass', 'aria-hidden': 'true' },
      svg('circle', { cx, cy, r: r * 1.05, class: 'map-compass-disc' }),
      svg('polygon', { points: `${cx},${cy - r * 0.55} ${cx + r * 0.22},${cy + r * 0.2} ${cx - r * 0.22},${cy + r * 0.2}`, class: 'map-compass-needle' }),
      letter('N', cx, cy - r * 0.78), letter('S', cx, cy + r * 0.78), letter('E', cx + r * 0.75, cy), letter('O', cx - r * 0.75, cy)));
  }
  return root;
}

/** Le nom court d'une zone, tel qu'écrit sur la carte. */
function zoneLabel(id) {
  if (id.startsWith('cap-')) return COUNTRIES[id.slice(4)].capital[0];
  const z = COUNTRIES[id] || CONTINENTS[id] || OCEANS[id] || SEAS[id];
  return z.label;
}

// ---------------------------------------------------------------- La droite numérique et les fractions

/** La droite graduée ; `options` (main.js) ajoute la flèche à placer. */
export function numberLineElement(stage, options = {}) {
  const el = h('div', { class: 'stage-numberline', role: 'img', 'aria-label': `Une droite graduée de ${stage.min} à ${stage.max}` });
  el.innerHTML = numberLineSvg(stage, options);
  return el;
}

// Chaque dessin de fraction a son propre motif de rayures, d'où un numéro unique.
let fractionCount = 0;
/** Une pizza ou une tablette coupée en parts (les parts coloriées sont rayées). */
export function fractionElement(st, extraClass = '') {
  const n = st.sizes.length;
  const label = `${st.shape === 'disc' ? 'Une pizza' : 'Une tablette'} coupée en ${n} parts, ${st.shaded.length} coloriée${st.shaded.length > 1 ? 's' : ''}`;
  // largeur / hauteur du dessin : la tablette est plus ou moins longue (voir fractionSvg)
  const ratio = st.shape === 'disc' ? 1 : (st.sizes.reduce((x, y) => x + y, 0) * 20 + 6) / ((st.rows || 2) * 20 + 6);
  const el = h('span', { class: `fraction-pic fraction-${st.shape} ${extraClass}`.trim(), role: 'img', 'aria-label': label, style: { '--ratio': ratio.toFixed(3) } });
  el.innerHTML = fractionSvg(st, ++fractionCount);
  return el;
}

/** 3/4 écrit en fraction (3 sur la barre, 4 dessous), et en mots : « trois quarts ». */
function fractionLabel({ n, d, words }) {
  return h('span', { class: 'frac-choice' },
    h('span', { class: 'frac', 'aria-hidden': 'true' }, h('span', { class: 'frac-n' }, n), h('span', { class: 'frac-d' }, d)),
    h('span', { class: 'frac-words' }, words));
}

export function renderChoiceContent(choice) {
  if (choice.column) return columnGrid({ ...choice.column, mini: true });
  if (choice.drawing) return drawingElement(choice.drawing, `drawing-choice drawing-${choice.drawing.kind}`, choice.name);
  if (choice.fraction) {
    return h('span', { class: 'fraction-option' }, fractionElement(choice.fraction, 'fraction-choice'),
      choice.caption ? h('span', { class: 'fraction-caption' }, choice.caption) : null);
  }
  if (choice.frac) return fractionLabel(choice.frac);
  if (choice.figure) return figureElement(choice.figure, 'figure-choice');
  if (choice.flag) return flagElement(choice.flag, null, 'flag-choice');
  if (choice.scene) return sceneContent(choice.scene, choice.name);
  if (choice.shadow) return shadowContent(choice.shadow, choice.name, choice.transform);
  if (choice.piece) return pieceContent(choice.piece);
  if (choice.bar) {
    return h('span', { class: 'pencil-choice', role: 'img', 'aria-label': choice.name, style: { width: `${choice.bar.length * 10}%`, '--pencil': choice.bar.color } });
  }
  if (choice.model) {
    const el = h('span', { class: 'bm-choice', role: 'img', 'aria-label': choice.name });
    el.innerHTML = barModelMarkup(choice.model);
    return el;
  }
  if (choice.objects) return objectsGrid(choice.objects.emoji, choice.objects.count, 5, 'small');
  if (choice.shape) return shapeSvg(choice.shape, choice.color);
  if (choice.swatch) {
    const swatch = h('span', { class: 'swatch', style: { background: choice.swatch }, role: 'img', 'aria-label': choice.name });
    return aides.namedColors && choice.name ? h('span', { class: 'color-named' }, swatch, colorName(choice.name)) : swatch;
  }
  // une image d'histoire et sa phrase écrite dessous
  if (choice.caption) {
    return [
      h('span', { class: 'step-emoji', 'aria-hidden': 'true', style: { '--scale': choice.scale ?? 1 } }, choice.emoji),
      h('span', { class: 'step-caption' }, readable(choice.caption)),
    ];
  }
  if (choice.lang) return h('span', { lang: choice.lang }, choice.label);
  if (aides.namedColors && couleurEmoji(choice.label, aides.domain)) return withColorName(h('span', {}, choice.label), choice.label);
  return readable(choice.label);
}
// ---------------------------------------------------------------- Le partage et l'addition posée

/** Le tas d'objets à partager, rangés par lignes de 5 (ou de 10). */
export function sharePile(emoji, count, total, objectClass = 'share-object') {
  return h('div', { class: `share-pile per-${total > 10 ? 10 : 5}`, role: 'img', 'aria-label': String(count) },
    Array.from({ length: count }, () => h('span', { class: objectClass }, emoji)));
}

/** « Combien chacun ? » : les objets (qu'on peut toucher pour les compter) et les enfants, assiettes vides. */
function shareScene({ emoji, total, who }) {
  return h('div', { class: 'share-scene' },
    sharePile(emoji, total, total, 'object share-object'),
    h('div', { class: `share-plates n${who.length}` }, who.map((kid) => h('div', { class: 'share-plate' },
      h('span', { class: 'share-who', 'aria-hidden': 'true' }, kid), h('span', { class: 'share-dish' })))));
}

const PLACE_LETTERS = ['u', 'd', 'c', 'm'];

/**
 * Une opération posée en colonnes : en haut les lettres u, d, c et les cases des retenues, puis les
 * nombres (unités sous les unités), le trait, et les cases du résultat. Les cases à remplir portent
 * data-cell (« r0 » : résultat des unités, « c1 » : retenue au-dessus des dizaines). En petit
 * (`mini`, réponses du niveau « Bien poser ») : les nombres seuls, décalés de `offsets` colonnes.
 */
export function columnGrid({ op, rows, width, steps = [], offsets = [], mini = false }) {
  const cols = Array.from({ length: width }, (_, i) => width - 1 - i); // de gauche à droite
  const targets = new Set(steps.map((s) => `${s.kind === 'carry' ? 'c' : 'r'}${s.col}`));
  const digit = (n, r, c) => {
    const s = String(n);
    const k = c - (offsets[r] || 0);
    return k >= 0 && k < s.length ? s[s.length - 1 - k] : '';
  };
  const box = (id, cls) => (targets.has(id) ? h('span', { class: cls, 'data-cell': id }) : h('span', { class: 'col-space' }));
  const cells = [];
  const row = (sign, list) => cells.push(h('span', { class: 'col-sign' }, sign), ...list);
  if (!mini) {
    row('', cols.map((c) => h('span', { class: 'col-head' }, PLACE_LETTERS[c])));
    row('', cols.map((c) => box(`c${c}`, 'col-carry')));
  }
  rows.forEach((n, r) => row(r === rows.length - 1 ? op : '', cols.map((c) => h('span', { class: 'col-digit' }, digit(n, r, c)))));
  cells.push(h('span', { class: 'col-line' }));
  if (!mini) row('', cols.map((c) => box(`r${c}`, 'col-result')));
  return h('div', {
    class: `column-sum${mini ? ' mini' : ''} rows-${rows.length}`, style: { '--width': width }, role: 'img', 'aria-label': rows.join(` ${op} `),
  }, cells);
}

/** Un dessin en SVG (feu des piétons, panneau, main, quadrillage…, Lune, thermomètre…), voir games/vivre.js et games/ciel.js. */
function drawingElement(d, cls, label) {
  const el = h('span', { class: cls, role: 'img', 'aria-label': label });
  el.innerHTML = cielSvg(d) ?? technoSvg(d) ?? ce2Svg(d) ?? gaucheDroiteSvg(d) ?? drawingSvg(d);
  return el;
}


/**
 * Le mot révélé après une bonne réponse, son initial souligné et en couleur (`highlight` : nombre
 * de lettres du début), ou les lettres ajoutées d'un accord (liste de tranches [début, fin]).
 */
export function revealWord(word, highlight = 0) {
  const ranges = Array.isArray(highlight) ? highlight : highlight ? [[0, highlight]] : [];
  const parts = [];
  let pos = 0;
  for (const [start, end] of ranges) {
    if (start > pos) parts.push(word.slice(pos, start));
    parts.push(h('span', { class: 'reveal-hl' }, word.slice(start, end)));
    pos = end;
  }
  if (pos < word.length) parts.push(word.slice(pos));
  return h('div', { class: word.length > 12 ? 'reveal long' : 'reveal' }, parts);
}

// Profils des enfants (prénom, dessin, photo) pour dessiner les portraits.
let profiles = {};
export function setProfiles(map) {
  profiles = { ...map };
}

/** Portrait d'un enfant : sa photo si elle existe, sinon son dessin avec son prénom sur le tee-shirt. */
export function avatar(id, extraClass = '', override = null) {
  const { name = '', look = 'fille', photo = null, style = {} } = override || profiles[id] || {};
  if (photo) {
    const extra = ACCESSORIES.find((a) => a.id === style?.accessory);
    return h('span', { class: `avatar avatar-photo avatar-${id} ${extraClass}` },
      h('img', { src: photo, alt: name }),
      extra ? h('span', { class: 'avatar-extra', 'aria-hidden': 'true' }, extra.emoji) : null,
      h('span', { class: 'avatar-name', 'aria-hidden': 'true' }, name));
  }
  const el = h('span', { class: `avatar avatar-${id} ${extraClass}` });
  el.innerHTML = avatarSvg(look, name, { style: style || {} });
  return el;
}

/**
 * Les mots d'une phrase, chacun dans une étiquette (lecture facilitée, karaoké) ; avec les
 * syllabes colorées, chaque mot garde son étiquette et ses syllabes sont dedans.
 */
export function wordSpans(text, lang = null) {
  let pos = 0;
  const syllables = aides.syllables && !lang ? decouperPhrase(text) : null;
  return text.split(' ').flatMap((word, i) => {
    const span = h('span', { class: 'w', 'data-start': pos, 'data-end': pos + word.length }, syllables ? syllableNodes(syllables[i]) : word);
    pos += word.length + 1;
    return i ? [' ', span] : [span];
  });
}

/** Histoire lue en karaoké : titre, image, phrases (chaque mot s'allume quand il est lu). */
function karaokeStage({ title, emoji, sentences }, actions) {
  return h('div', { class: 'stage-karaoke' },
    h('div', { class: 'karaoke-head' }, h('span', { class: 'karaoke-emoji', 'aria-hidden': 'true' }, emoji), h('h2', { class: 'text-title' }, title)),
    h('p', { class: 'karaoke-text' }, sentences.flatMap((sentence, i) => {
      const el = h('span', { class: 'k-sentence', 'data-s': i }, wordSpans(sentence));
      return i ? [' ', el] : [el];
    })),
    h('button', { class: 'text-listen karaoke-replay', onclick: () => actions.readAlong?.() }, '🔊 Relire l’histoire'));
}
