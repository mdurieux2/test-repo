// Fabrique des éléments DOM à partir des données des questions.

import { avatarSvg } from './characters.js';

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
  let visual;
  if (op === '+') {
    visual = h('div', { class: 'operation-visual' },
      objectsGrid(emoji, a, 5, 'small'), h('span', { class: 'op' }, '+'), objectsGrid(emoji, b, 5, 'small'));
  } else {
    // Soustraction : on barre les objets qu'on enlève.
    const items = Array.from({ length: a }, (_, i) =>
      h('span', { class: i >= a - b ? 'object removed' : 'object' }, emoji));
    const perRow = a > 10 ? 10 : 5;
    const rows = [];
    for (let i = 0; i < a; i += perRow) rows.push(h('div', { class: 'objects-row' }, items.slice(i, i + perRow)));
    visual = h('div', { class: 'operation-visual' }, h('div', { class: `objects small per-${perRow}` }, rows));
  }
  return h('div', { class: 'stage-operation' }, visual, hideEquation ? null : eq);
}

/** Petit problème : l'histoire écrite, et des images pour les plus jeunes. */
function storyStage({ text, picture }) {
  return h('div', { class: 'stage-story' },
    h('p', { class: 'story-text' }, text),
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
      return h('button', { class: 'stage-picture', onclick: actions.replay, 'aria-label': 'Réécouter' }, stage.emoji);
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
      // suite de motifs (algorithme) : le dernier élément est à trouver
      return h('div', { class: 'pattern' },
        stage.items.map((it) => h('span', { class: it === null ? 'pattern-item gap' : 'pattern-item' }, it === null ? '?' : it)));
    case 'shape':
      return shapeSvg(stage.shape, stage.color);
    case 'multiplication':
      return multiplicationStage(stage);
    case 'swatch':
      return h('span', { class: 'stage-swatch', style: { background: stage.color } });
    case 'sentence':
      return h('p', { class: 'stage-sentence', lang: stage.lang }, stage.text);
    case 'text':
      return textStage(stage, actions);
    case 'word':
      return h('button', { class: 'stage-word', lang: stage.lang, onclick: actions.replay }, stage.text);
    case 'operation':
      return operationStage(stage);
    case 'story':
      return storyStage(stage);
    case 'clock':
      return clockStage(stage);
    case 'cubes':
      return cubesStage(stage);
    case 'sequence':
      return h('div', { class: `sequence${stage.items.some((n) => typeof n === 'string') ? ' words' : ''}` },
        stage.items.map((n) => h('span', { class: n === null ? 'seq-item gap' : 'seq-item' }, n === null ? '?' : n)));
    case 'frame':
      return frameStage(stage);
    case 'equation':
      return h('div', { class: 'equation big' },
        stage.parts.map((p) => h('span', { class: p === null ? 'num gap' : typeof p === 'number' ? 'num' : 'op' }, p === null ? '?' : p)));
    default:
      return h('div', { class: 'stage-empty' });
  }
}

/** Petit texte à lire ; le bouton 🔊 le lit à voix haute, en cas de besoin. */
function textStage({ title, text }, actions) {
  return h('div', { class: 'stage-text' },
    title ? h('h2', { class: 'text-title' }, title) : null,
    h('p', { class: 'text-body' }, text),
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

/** Silhouette noire d'un objet (jeu des ombres). */
function shadowContent(emoji, label, transform) {
  return h('span', { class: 'shadow', role: 'img', 'aria-label': label || 'ombre', style: transform ? { transform } : undefined }, emoji);
}

export function renderChoiceContent(choice) {
  if (choice.scene) return sceneContent(choice.scene, choice.name);
  if (choice.shadow) return shadowContent(choice.shadow, choice.name, choice.transform);
  if (choice.objects) return objectsGrid(choice.objects.emoji, choice.objects.count, 5, 'small');
  if (choice.shape) return shapeSvg(choice.shape, choice.color);
  if (choice.swatch) return h('span', { class: 'swatch', style: { background: choice.swatch }, role: 'img', 'aria-label': choice.name });
  return choice.lang ? h('span', { lang: choice.lang }, choice.label) : choice.label;
}

/** Le mot révélé après une bonne réponse, son initial en couleur. */
export function revealWord(word, highlight = 0) {
  return h('div', { class: 'reveal' },
    highlight ? h('span', { class: 'reveal-hl' }, word.slice(0, highlight)) : null,
    word.slice(highlight));
}

// Profils des enfants (prénom, dessin, photo) pour dessiner les portraits.
let profiles = {};
export function setProfiles(map) {
  profiles = { ...map };
}

/** Portrait d'un enfant : sa photo si elle existe, sinon son dessin avec son prénom sur le tee-shirt. */
export function avatar(id, extraClass = '', override = null) {
  const { name = '', look = 'fille', photo = null } = override || profiles[id] || {};
  if (photo) {
    return h('span', { class: `avatar avatar-photo avatar-${id} ${extraClass}` },
      h('img', { src: photo, alt: name }),
      h('span', { class: 'avatar-name', 'aria-hidden': 'true' }, name));
  }
  const el = h('span', { class: `avatar avatar-${id} ${extraClass}` });
  el.innerHTML = avatarSvg(look, name);
  return el;
}
