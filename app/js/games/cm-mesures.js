// Grandeurs, géométrie et données du cours moyen (programme de mathématiques du cycle 3, 2025) :
//  - « Les mesures du CM » : longueurs (du mm au km), masses (du mg à la tonne), contenances (du mL
//    à l'hL), conversions sans tableau (« 3,5 m = 350 cm car 1 m = 100 cm »), durées en heures et
//    minutes, aires sur quadrillage en cm² (CM1, sans formule) ; aire du rectangle et du carré, cm²,
//    dm², m², secondes (CM2) ;
//  - « La géométrie du CM » : angles (droit, aigu, obtus), parallèles et perpendiculaires, triangles
//    et quadrilatères reconnus d'après leurs codes (côtés égaux, angles droits), cercle, solides (dont
//    le prisme droit) et patron du cube (CM1) ; trapèze, pentagone, hexagone, l'angle droit mesure 90°
//    (CM2) ;
//  - « Données et hasard » : tableaux, diagrammes en barres, courbes, problèmes, possible, impossible,
//    certain, probable (CM1) ; diagramme circulaire, « a chances sur b », comparer des chances,
//    expériences en deux étapes (CM2).
// Les dessins sont faits ici (cmSvg) et posés par render.js ; chaque dessin a sa description pour
// les lecteurs d'écran, et rien n'est dit par la couleur seule (hachures, codes, mots).

import { pick, randInt, sample, shuffle } from '../random.js';
import { ecrit } from './ce2.js';
import { virgule } from './cm-nombres.js';

const MESURES = 'Monnaie et mesures';
const INK = '#2b2d42';
const PALE = '#e3f0ff';
const GRID = '#c3cfdf';

/** `count` écritures distinctes : la bonne, puis les pièges dans l'ordre (le tout mélangé). */
function avecPieges(rng, bonne, pieges, count) {
  const out = [bonne];
  for (const p of pieges) if (out.length < count && p !== null && p !== undefined && p !== '' && !out.includes(p)) out.push(p);
  return shuffle(rng, out);
}
const textes = (labels) => labels.map((label) => ({ value: label, label }));

function aToucher({ key, consigne, court, stage = { type: 'none' }, choices, style = 'words', answer, dire }) {
  return {
    key,
    text: consigne,
    instruction: consigne,
    short: { key: `${key.split(':')[0]}:${consigne}`, text: court || consigne },
    stage,
    choices,
    choiceStyle: style,
    answer,
    ...(dire ? { success: { speak: dire } } : {}),
  };
}

function aTaper({ key, consigne, court = 'Tape la réponse.', stage, answer, dire }) {
  return {
    key,
    text: consigne,
    instruction: consigne,
    short: { key: `${key.split(':')[0]}:${consigne}`, text: court },
    stage,
    interaction: 'keypad',
    choices: [],
    maxDigits: String(answer).length + 1,
    answer,
    ...(dire ? { success: { speak: dire } } : {}),
  };
}

/** Une question à choix tirée d'une liste écrite à la main ({ ask, answer, others, says }). */
function qcm(prefix, item, rng, style = 'answers') {
  return aToucher({
    key: `${prefix}:${item.ask}`, consigne: item.ask, stage: item.stage || { type: 'none' },
    choices: textes(shuffle(rng, [item.answer, ...item.others])), style, answer: item.answer, dire: item.says,
  });
}

// ================================================================ Les dessins

let motifs = 0; // chaque dessin a ses propres hachures (plusieurs dessins dans la même page)

/** Des hachures (et non une couleur seule) pour ce qui est colorié. */
function hachures(id, fond = '#ffd8a8', trait = '#b85c00') {
  return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)"><rect width="7" height="7" fill="${fond}"/><line x1="0" y1="0" x2="0" y2="7" stroke="${trait}" stroke-width="2.4"/></pattern>`;
}

const pt = ([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`;
const unit = ([x1, y1], [x2, y2]) => {
  const l = Math.hypot(x2 - x1, y2 - y1) || 1;
  return [(x2 - x1) / l, (y2 - y1) / l];
};

/** Le petit carré d'un angle droit en P (entre les côtés vers Q et vers R). */
function angleDroit(p, q, r, size = 12) {
  const [ux, uy] = unit(p, q);
  const [vx, vy] = unit(p, r);
  const a = [p[0] + ux * size, p[1] + uy * size];
  const b = [a[0] + vx * size, a[1] + vy * size];
  const c = [p[0] + vx * size, p[1] + vy * size];
  return `<polyline points="${pt(a)} ${pt(b)} ${pt(c)}" fill="none" stroke="${INK}" stroke-width="2"/>`;
}

/** Les traits qui disent que des côtés ont la même longueur (1, 2 ou 3 petits traits au milieu). */
function codeLongueur(p, q, n = 1) {
  const [ux, uy] = unit(p, q);
  const [nx, ny] = [-uy, ux];
  const mx = (p[0] + q[0]) / 2;
  const my = (p[1] + q[1]) / 2;
  return Array.from({ length: n }, (_, i) => {
    const o = (i - (n - 1) / 2) * 5;
    const cx = mx + ux * o;
    const cy = my + uy * o;
    return `<line x1="${(cx - nx * 7).toFixed(1)}" y1="${(cy - ny * 7).toFixed(1)}" x2="${(cx + nx * 7).toFixed(1)}" y2="${(cy + ny * 7).toFixed(1)}" stroke="${INK}" stroke-width="2.4"/>`;
  }).join('');
}

/** Le code des côtés parallèles : une petite flèche au milieu du côté. */
function codeParallele(p, q) {
  const [ux, uy] = unit(p, q);
  const [nx, ny] = [-uy, ux];
  const mx = (p[0] + q[0]) / 2;
  const my = (p[1] + q[1]) / 2;
  const tip = [mx + ux * 5, my + uy * 5];
  return `<polyline points="${pt([tip[0] - ux * 9 + nx * 6, tip[1] - uy * 9 + ny * 6])} ${pt(tip)} ${pt([tip[0] - ux * 9 - nx * 6, tip[1] - uy * 9 - ny * 6])}" fill="none" stroke="${INK}" stroke-width="2.4"/>`;
}

/** Tourne des points autour de leur centre, puis les cadre dans une boîte (viewBox) avec une marge. */
function cadrer(points, deg, marge = 18) {
  const cx = points.reduce((s, p) => s + p[0], 0) / points.length;
  const cy = points.reduce((s, p) => s + p[1], 0) / points.length;
  const a = (deg * Math.PI) / 180;
  const turned = points.map(([x, y]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]);
  const xs = turned.map((p) => p[0]);
  const ys = turned.map((p) => p[1]);
  const box = [Math.min(...xs) - marge, Math.min(...ys) - marge, Math.max(...xs) - Math.min(...xs) + 2 * marge, Math.max(...ys) - Math.min(...ys) + 2 * marge];
  return { pts: turned, viewBox: box.map((v) => v.toFixed(1)).join(' ') };
}

// Les figures planes : les sommets, les côtés de même longueur (groupes), les angles droits, les côtés parallèles.
const FIGURES = {
  equilateral: { pts: [[40, 140], [160, 140], [100, 36.1]], egaux: [[0, 1, 2]], droits: [] },
  isocele: { pts: [[50, 140], [150, 140], [100, 26]], egaux: [[1, 2]], droits: [] },
  'triangle-rectangle': { pts: [[40, 140], [170, 140], [40, 50]], egaux: [], droits: [0] },
  'triangle-rectangle-isocele': { pts: [[40, 140], [140, 140], [40, 40]], egaux: [[0, 2]], droits: [0] },
  triangle: { pts: [[30, 140], [175, 140], [75, 50]], egaux: [], droits: [] },
  carre: { pts: [[50, 30], [150, 30], [150, 130], [50, 130]], egaux: [[0, 1, 2, 3]], droits: [0, 1, 2, 3] },
  rectangle: { pts: [[25, 45], [175, 45], [175, 125], [25, 125]], egaux: [[0, 2], [1, 3]], droits: [0, 1, 2, 3] },
  losange: { pts: [[100, 25], [180, 85], [100, 145], [20, 85]], egaux: [[0, 1, 2, 3]], droits: [] },
  parallelogramme: { pts: [[30, 130], [140, 130], [175, 45], [65, 45]], egaux: [[0, 2], [1, 3]], droits: [], paralleles: [0, 2] },
  trapeze: { pts: [[25, 130], [175, 130], [135, 50], [65, 50]], egaux: [], droits: [], paralleles: [0, 2] },
  'trapeze-rectangle': { pts: [[40, 130], [175, 130], [125, 50], [40, 50]], egaux: [], droits: [0, 3], paralleles: [0, 2] },
  quadrilatere: { pts: [[30, 120], [165, 138], [148, 42], [62, 30]], egaux: [], droits: [] },
  pentagone: { pts: Array.from({ length: 5 }, (_, i) => [100 + 70 * Math.sin((2 * Math.PI * i) / 5), 90 - 70 * Math.cos((2 * Math.PI * i) / 5)]), egaux: [[0, 1, 2, 3, 4]], droits: [] },
  hexagone: { pts: Array.from({ length: 6 }, (_, i) => [100 + 70 * Math.cos((2 * Math.PI * i) / 6), 90 + 70 * Math.sin((2 * Math.PI * i) / 6)]), egaux: [[0, 1, 2, 3, 4, 5]], droits: [] },
};

function figureSvg({ nom, rot = 0 }) {
  const f = FIGURES[nom];
  const { pts, viewBox } = cadrer(f.pts, rot);
  const n = pts.length;
  const cote = (i) => [pts[i], pts[(i + 1) % n]];
  const codes = [
    ...f.egaux.flatMap((groupe, g) => groupe.map((i) => codeLongueur(...cote(i), g + 1))),
    ...f.droits.map((i) => angleDroit(pts[i], pts[(i + 1) % n], pts[(i + n - 1) % n])),
    // les deux côtés parallèles : leurs flèches dans le même sens
    ...(f.paralleles || []).map((i) => {
      const [p, q] = cote(i);
      return q[0] - p[0] >= 0 ? codeParallele(p, q) : codeParallele(q, p);
    }),
  ];
  return `<svg viewBox="${viewBox}" aria-hidden="true"><polygon points="${pts.map(pt).join(' ')}" fill="${PALE}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>${codes.join('')}</svg>`;
}

/** Un angle : deux demi-droites et leur sommet ; un petit carré si l'angle est droit. */
function angleSvg({ deg, rot = 0 }) {
  const o = [100, 100];
  const r1 = (rot * Math.PI) / 180;
  const r2 = ((rot - deg) * Math.PI) / 180;
  const a = [o[0] + 82 * Math.cos(r1), o[1] - 82 * Math.sin(r1)];
  const b = [o[0] + 82 * Math.cos(r2), o[1] - 82 * Math.sin(r2)];
  const mark = deg === 90
    ? angleDroit(o, a, b, 16)
    : `<path d="M${pt([o[0] + 26 * Math.cos(r1), o[1] - 26 * Math.sin(r1)])} A26 26 0 0 1 ${pt([o[0] + 26 * Math.cos(r2), o[1] - 26 * Math.sin(r2)])}" fill="none" stroke="#b85c00" stroke-width="3"/>`;
  // le cadre serré autour du dessin (sinon l'angle reste dans un coin, petit et décentré)
  const xs = [o[0], a[0], b[0]];
  const ys = [o[1], a[1], b[1]];
  const [x0, y0] = [Math.min(...xs) - 30, Math.min(...ys) - 30];
  const box = `${x0.toFixed(1)} ${y0.toFixed(1)} ${(Math.max(...xs) + 30 - x0).toFixed(1)} ${(Math.max(...ys) + 30 - y0).toFixed(1)}`;
  return `<svg viewBox="${box}" aria-hidden="true"><line x1="${o[0]}" y1="${o[1]}" x2="${a[0].toFixed(1)}" y2="${a[1].toFixed(1)}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`
    + `<line x1="${o[0]}" y1="${o[1]}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>${mark}<circle cx="${o[0]}" cy="${o[1]}" r="4" fill="${INK}"/></svg>`;
}

/** Deux droites : parallèles (deg = 0), ou qui se coupent avec un angle de deg degrés. */
function droitesSvg({ deg, rot = 0 }) {
  const ligne = (angle, decal) => {
    const a = (angle * Math.PI) / 180;
    const [dx, dy] = [Math.cos(a) * 95, -Math.sin(a) * 95];
    const [ox, oy] = [100 - Math.sin(a) * decal, 100 - Math.cos(a) * decal];
    return `<line x1="${(ox - dx).toFixed(1)}" y1="${(oy - dy).toFixed(1)}" x2="${(ox + dx).toFixed(1)}" y2="${(oy + dy).toFixed(1)}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
  };
  const deux = deg === 0 ? [ligne(rot, 32), ligne(rot, -32)] : [ligne(rot, 0), ligne(rot + deg, 0)];
  return `<svg viewBox="0 0 200 200" aria-hidden="true">${deux.join('')}</svg>`;
}

/** Une figure faite de carreaux sur un quadrillage (1 carreau = 1 cm²). */
function aireSvg({ cols, rows, cells }) {
  const s = 24;
  const id = `cm-hachures-${++motifs}`;
  const grille = [];
  for (let x = 0; x <= cols; x++) grille.push(`<line x1="${x * s}" y1="0" x2="${x * s}" y2="${rows * s}" stroke="${GRID}" stroke-width="1"/>`);
  for (let y = 0; y <= rows; y++) grille.push(`<line x1="0" y1="${y * s}" x2="${cols * s}" y2="${y * s}" stroke="${GRID}" stroke-width="1"/>`);
  const carres = cells.map(([x, y]) => `<rect x="${x * s}" y="${y * s}" width="${s}" height="${s}" fill="url(#${id})" stroke="${INK}" stroke-width="1.6"/>`);
  return `<svg viewBox="-3 -3 ${cols * s + 6} ${rows * s + 6}" aria-hidden="true"><defs>${hachures(id)}</defs>${grille.join('')}${carres.join('')}</svg>`;
}

/** Un rectangle (ou un carré) et ses mesures écrites sur deux côtés. */
function rectangleSvg({ longueur, largeur, unite }) {
  const k = Math.min(170 / longueur, 110 / largeur);
  const w = longueur * k;
  const hgt = largeur * k;
  const p = [[0, 0], [w, 0], [w, hgt], [0, hgt]];
  const marks = p.map((q, i) => angleDroit(q, p[(i + 1) % 4], p[(i + 3) % 4], 10)).join('');
  const egaux = longueur === largeur ? p.map((q, i) => codeLongueur(q, p[(i + 1) % 4])).join('') : '';
  return `<svg viewBox="-14 -14 ${(w + 70).toFixed(1)} ${(hgt + 46).toFixed(1)}" aria-hidden="true"><rect width="${w.toFixed(1)}" height="${hgt.toFixed(1)}" fill="${PALE}" stroke="${INK}" stroke-width="3"/>${marks}${egaux}`
    + `<text x="${(w / 2).toFixed(1)}" y="${(hgt + 24).toFixed(1)}" font-size="16" font-weight="700" fill="${INK}" text-anchor="middle">${virgule(longueur * 1000)} ${unite}</text>`
    + `${longueur === largeur ? '' : `<text x="${(w + 8).toFixed(1)}" y="${(hgt / 2 + 6).toFixed(1)}" font-size="16" font-weight="700" fill="${INK}">${virgule(largeur * 1000)} ${unite}</text>`}</svg>`;
}

const pointille = 'stroke-dasharray="6 5"';
/** Les solides, en perspective cavalière : les arêtes cachées en pointillés. */
function solideSvg({ nom }) {
  const trait = (a, b, cache = false) => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${INK}" stroke-width="3" stroke-linecap="round" ${cache ? pointille : ''}/>`;
  const face = (list, fill = PALE) => `<polygon points="${list.map((p) => p.join(',')).join(' ')}" fill="${fill}" stroke="none"/>`;
  const boite = (x0, y0, w, hgt, dx, dy) => {
    const A = [x0, y0 + hgt]; const B = [x0 + w, y0 + hgt]; const C = [x0 + w, y0]; const D = [x0, y0];
    const E = [A[0] + dx, A[1] - dy]; const F = [B[0] + dx, B[1] - dy]; const G = [C[0] + dx, C[1] - dy]; const H = [D[0] + dx, D[1] - dy];
    return face([A, B, F, G, H, D]) + [[A, B], [B, C], [C, D], [D, A], [B, F], [F, G], [G, C], [G, H], [H, D]].map(([p, q]) => trait(p, q)).join('')
      + [[A, E], [E, F], [E, H]].map(([p, q]) => trait(p, q, true)).join('');
  };
  let body = '';
  if (nom === 'cube') body = boite(40, 70, 90, 90, 45, 40);
  else if (nom === 'pave') body = boite(20, 80, 140, 75, 45, 38);
  else if (nom === 'pyramide') {
    const A = [30, 160]; const B = [130, 160]; const C = [175, 125]; const D = [75, 125]; const S = [100, 25];
    body = face([A, B, C, S]) + [[A, B], [B, C], [A, S], [B, S], [C, S]].map(([p, q]) => trait(p, q)).join('')
      + [[C, D], [D, A], [D, S]].map(([p, q]) => trait(p, q, true)).join('');
  } else if (nom === 'prisme') {
    const A = [25, 165]; const B = [115, 165]; const C = [70, 95];
    const [dx, dy] = [70, 40];
    const D = [A[0] + dx, A[1] - dy]; const E = [B[0] + dx, B[1] - dy]; const F = [C[0] + dx, C[1] - dy];
    body = face([A, B, E, F, C]) + [[A, B], [B, C], [C, A], [B, E], [E, F], [F, C]].map(([p, q]) => trait(p, q)).join('')
      + [[A, D], [D, E], [D, F]].map(([p, q]) => trait(p, q, true)).join('');
  } else if (nom === 'cylindre') {
    body = `<path d="M40 45 L40 150 A60 18 0 0 0 160 150 L160 45 Z" fill="${PALE}"/><ellipse cx="100" cy="45" rx="60" ry="18" fill="#f3f8ff" stroke="${INK}" stroke-width="3"/>`
      + `<path d="M40 150 A60 18 0 0 0 160 150" fill="none" stroke="${INK}" stroke-width="3"/><path d="M40 150 A60 18 0 0 1 160 150" fill="none" stroke="${INK}" stroke-width="3" ${pointille}/>`
      + `${trait([40, 45], [40, 150])}${trait([160, 45], [160, 150])}`;
  } else if (nom === 'cone') {
    body = `<path d="M100 20 L40 150 A60 18 0 0 0 160 150 Z" fill="${PALE}"/>${trait([100, 20], [40, 150])}${trait([100, 20], [160, 150])}`
      + `<path d="M40 150 A60 18 0 0 0 160 150" fill="none" stroke="${INK}" stroke-width="3"/><path d="M40 150 A60 18 0 0 1 160 150" fill="none" stroke="${INK}" stroke-width="3" ${pointille}/>`;
  } else {
    body = `<circle cx="100" cy="95" r="70" fill="${PALE}" stroke="${INK}" stroke-width="3"/><path d="M30 95 A70 20 0 0 0 170 95" fill="none" stroke="${INK}" stroke-width="2"/><path d="M30 95 A70 20 0 0 1 170 95" fill="none" stroke="${INK}" stroke-width="2" ${pointille}/>`;
  }
  return `<svg viewBox="0 0 200 185" aria-hidden="true">${body}</svg>`;
}

/** Un patron (ou un faux patron) de cube : six carrés sur un quadrillage. */
function patronSvg({ cells }) {
  const s = 26;
  const w = Math.max(...cells.map(([x]) => x)) + 1;
  const hgt = Math.max(...cells.map(([, y]) => y)) + 1;
  return `<svg viewBox="-3 -3 ${w * s + 6} ${hgt * s + 6}" aria-hidden="true">${cells.map(([x, y]) => `<rect x="${x * s}" y="${y * s}" width="${s}" height="${s}" fill="${PALE}" stroke="${INK}" stroke-width="2.4"/>`).join('')}</svg>`;
}

/** Un cercle, son centre O et quelques points, sur le cercle ou non. */
function cercleSvg({ points = [] }) {
  const dots = points.map(({ nom, x, y }) => `<circle cx="${x}" cy="${y}" r="4.5" fill="${INK}"/><text x="${x + 8}" y="${y - 6}" font-size="17" font-weight="700" fill="${INK}">${nom}</text>`);
  return `<svg viewBox="0 0 220 200" aria-hidden="true"><circle cx="100" cy="100" r="70" fill="none" stroke="${INK}" stroke-width="3"/>`
    + `<circle cx="100" cy="100" r="4.5" fill="${INK}"/><text x="88" y="94" font-size="17" font-weight="700" fill="${INK}">O</text>${dots.join('')}</svg>`;
}

/** Une courbe : des points reliés, l'axe des valeurs gradué, l'axe du temps en bas. */
function courbeSvg({ xs, ys, max, step, unite }) {
  const [x0, x1, yTop, yBottom] = [40, 290, 14, 160];
  const y = (v) => yBottom - (v / max) * (yBottom - yTop);
  const x = (i) => x0 + 12 + (i * (x1 - x0 - 24)) / (xs.length - 1);
  const grid = [];
  for (let v = 0; v <= max; v += step) {
    grid.push(`<line x1="${x0}" y1="${y(v).toFixed(1)}" x2="${x1}" y2="${y(v).toFixed(1)}" stroke="${v ? '#e3d8c3' : INK}" stroke-width="${v ? 1 : 2}"/>`,
      `<text x="${x0 - 6}" y="${(y(v) + 4).toFixed(1)}" font-size="12" font-weight="700" text-anchor="end" fill="${INK}">${v}</text>`);
  }
  const line = `<polyline points="${ys.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}" fill="none" stroke="#b85c00" stroke-width="3"/>`;
  const dots = ys.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="4.5" fill="${INK}"/>`).join('');
  const labels = xs.map((l, i) => `<text x="${x(i).toFixed(1)}" y="${yBottom + 20}" font-size="12.5" font-weight="700" text-anchor="middle" fill="${INK}">${l}</text>`).join('');
  return `<svg viewBox="0 0 300 186" aria-hidden="true">${grid.join('')}<line x1="${x0}" y1="${yTop - 6}" x2="${x0}" y2="${yBottom}" stroke="${INK}" stroke-width="2"/>`
    + `<text x="${x0 - 30}" y="${yTop - 2}" font-size="12" font-weight="700" fill="${INK}">${unite}</text>${line}${dots}${labels}</svg>`;
}

// Les parts d'un diagramme circulaire : un motif différent pour chacune (pas seulement une couleur), et son nom écrit dedans.
const PARTS_FONDS = [['#ffd8a8', '#b85c00'], ['#cfe6ff', '#2f6db3'], ['#d8f0c8', '#3c8a2e'], ['#eedcff', '#7a4bb8']];

function secteursSvg({ parts }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  let angle = -Math.PI / 2;
  const defs = [];
  const slices = parts.map((p, i) => {
    const a0 = angle;
    const a1 = angle + (2 * Math.PI * p.value) / total;
    angle = a1;
    const id = `cm-part-${++motifs}`;
    const [fond, trait] = PARTS_FONDS[i % PARTS_FONDS.length];
    defs.push(i % 2 ? `<pattern id="${id}" patternUnits="userSpaceOnUse" width="8" height="8"><rect width="8" height="8" fill="${fond}"/><circle cx="4" cy="4" r="1.8" fill="${trait}"/></pattern>` : hachures(id, fond, trait));
    const [cx, cy, r] = [100, 100, 85];
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const path = `M${cx} ${cy} L${(cx + r * Math.cos(a0)).toFixed(1)} ${(cy + r * Math.sin(a0)).toFixed(1)} A${r} ${r} 0 ${large} 1 ${(cx + r * Math.cos(a1)).toFixed(1)} ${(cy + r * Math.sin(a1)).toFixed(1)} Z`;
    const mid = (a0 + a1) / 2;
    const [tx, ty] = [cx + 52 * Math.cos(mid), cy + 52 * Math.sin(mid)];
    return `<path d="${path}" fill="url(#${id})" stroke="${INK}" stroke-width="2.5"/>`
      + `<text x="${tx.toFixed(1)}" y="${(ty + 5).toFixed(1)}" font-size="15" font-weight="700" text-anchor="middle" fill="${INK}" stroke="#fff" stroke-width="4" paint-order="stroke">${p.label}</text>`;
  });
  return `<svg viewBox="0 0 200 200" aria-hidden="true"><defs>${defs.join('')}</defs>${slices.join('')}</svg>`;
}

/** Les dessins de ce fichier (null pour les autres : render.js essaie alors les autres jeux). */
export function cmSvg(d) {
  switch (d.kind) {
    case 'cm-figure': return figureSvg(d);
    case 'cm-angle': return angleSvg(d);
    case 'cm-droites': return droitesSvg(d);
    case 'cm-aire': return aireSvg(d);
    case 'cm-rectangle': return rectangleSvg(d);
    case 'cm-solide': return solideSvg(d);
    case 'cm-patron': return patronSvg(d);
    case 'cm-cercle': return cercleSvg(d);
    case 'cm-courbe': return courbeSvg(d);
    case 'cm-secteurs': return secteursSvg(d);
    default: return null;
  }
}

const dessin = (drawing, label) => ({ type: 'drawing', drawing, label });
const choixDessin = (value, drawing, name) => ({ value, label: '', drawing, name });

// ================================================================ Les mesures du CM

// [unité, nom, valeur en unité de base] : 1 km = 1 000 m, 1 cm = 0,01 m…
const LONGUEURS = [['km', 'kilomètre', 1000000], ['m', 'mètre', 1000], ['dm', 'décimètre', 100], ['cm', 'centimètre', 10], ['mm', 'millimètre', 1]];
const MASSES = [['t', 'tonne', 1000000000], ['kg', 'kilogramme', 1000000], ['g', 'gramme', 1000], ['mg', 'milligramme', 1]];
const CONTENANCES = [['hL', 'hectolitre', 100000], ['L', 'litre', 1000], ['dL', 'décilitre', 100], ['cL', 'centilitre', 10], ['mL', 'millilitre', 1]];
// ce que dit la voix après une bonne réponse (en mots : « 1 000 » serait lu « 1 » puis « 000 »)
const RELATIONS = {
  km: 'Un kilomètre, c’est mille mètres.', m: 'Un mètre, c’est cent centimètres.', dm: 'Un décimètre, c’est dix centimètres.',
  cm: 'Un centimètre, c’est dix millimètres.', t: 'Une tonne, c’est mille kilogrammes.', kg: 'Un kilogramme, c’est mille grammes.',
  g: 'Un gramme, c’est mille milligrammes.', hL: 'Un hectolitre, c’est cent litres.', L: 'Un litre, c’est cent centilitres.',
  dL: 'Un décilitre, c’est dix centilitres.', cL: 'Un centilitre, c’est dix millilitres.',
};
// les conversions travaillées (on évite dm et dL avec des grands nombres : peu utilisés)
const PAIRES = {
  longueurs: [['km', 'm'], ['m', 'cm'], ['cm', 'mm'], ['m', 'mm'], ['dm', 'cm']],
  masses: [['t', 'kg'], ['kg', 'g'], ['g', 'mg']],
  contenances: [['hL', 'L'], ['L', 'cL'], ['L', 'mL'], ['dL', 'cL'], ['cL', 'mL']],
};
const UNITES = { longueurs: LONGUEURS, masses: MASSES, contenances: CONTENANCES };

/** Convertir un nombre entier d'une grande unité vers une petite, ou l'inverse. */
function convertir(rng, grandeur) {
  const [grande, petite] = pick(rng, PAIRES[grandeur]);
  const liste = UNITES[grandeur];
  const f = liste.find(([u]) => u === grande)[2] / liste.find(([u]) => u === petite)[2];
  const versPetite = rng() < 0.6;
  const n = randInt(rng, 2, f >= 1000 ? 12 : 60);
  const [x, ux, r, ur] = versPetite ? [n, grande, n * f, petite] : [n * f, petite, n, grande];
  const pieges = versPetite ? [n * f * 10, n * f / 10, n * f * 100] : [n * 10, n * 100, (n * f) / (f * 10)];
  const values = [...new Set([r, ...pieges.filter((v) => Number.isInteger(v) && v > 0)])].slice(0, 4);
  return aToucher({
    key: `mesures-cm:${grandeur}:${x}${ux}:${ur}`,
    consigne: 'Convertis cette mesure : touche la mesure égale.',
    court: 'La mesure égale ?',
    stage: { type: 'equation', parts: [`${ecrit(x)} ${ux}`, '=', null] },
    choices: textes(shuffle(rng, values).map((v) => `${ecrit(v)} ${ur}`)), answer: `${ecrit(r)} ${ur}`,
    dire: RELATIONS[grande],
  });
}

/** 3,5 m = 350 cm (car 1 m = 100 cm) ; 1,2 kg = 1 200 g ; 2,5 L = 250 cL. */
function convertirVirgule(rng) {
  const [grande, petite, f] = pick(rng, [['m', 'cm', 100], ['km', 'm', 1000], ['kg', 'g', 1000], ['L', 'cL', 100], ['cm', 'mm', 10], ['t', 'kg', 1000]]);
  const x = randInt(rng, 1, 9) * 1000 + pick(rng, [5, randInt(rng, 1, 9)]) * 100; // 3,5 ; 1,2…
  const r = (x * f) / 1000;
  const pieges = [r / 10, r * 10, Math.floor(x / 1000) * f + (x % 1000) / 100];
  const values = [...new Set([r, ...pieges.filter((v) => Number.isInteger(v) && v > 0 && v !== r)])].slice(0, 4);
  return aToucher({
    key: `mesures-cm:virgule:${x}${grande}`,
    consigne: 'Convertis cette mesure : touche la mesure égale.',
    court: 'La mesure égale ?',
    stage: { type: 'equation', parts: [`${virgule(x)} ${grande}`, '=', null] },
    choices: textes(shuffle(rng, values).map((v) => `${ecrit(v)} ${petite}`)), answer: `${ecrit(r)} ${petite}`,
    dire: RELATIONS[grande],
  });
}

const hmin = (min) => `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
const minsec = (s) => `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;

/** Heures et minutes : 2 h 15 min = 135 min, et l'inverse. */
function durees(rng) {
  const h = randInt(rng, 1, 4);
  const m = randInt(rng, 1, 11) * 5;
  const total = h * 60 + m;
  if (rng() < 0.5) {
    return aTaper({
      key: `mesures-cm:enmin:${total}`, consigne: 'Combien de minutes en tout ? Une heure, c’est 60 minutes.', court: 'Combien de minutes ?',
      stage: { type: 'equation', parts: [hmin(total), '=', null, 'min'] }, answer: total,
      dire: `${h} heure${h > 1 ? 's' : ''}, c’est ${h * 60} minutes ; plus ${m} minutes, cela fait ${total} minutes.`,
    });
  }
  const pieges = [h * 100 + m - 60, total + 60, (h + 1) * 60 + m - 100].filter((v) => v > 0 && v !== total);
  return aToucher({
    key: `mesures-cm:enh:${total}`, consigne: 'Combien d’heures et de minutes cela fait-il ?', court: 'En heures et minutes ?',
    stage: { type: 'equation', parts: [`${total} min`, '=', null] },
    choices: textes(avecPieges(rng, hmin(total), [`${Math.floor(total / 100)} h ${String(total % 100).padStart(2, '0')} min`, ...pieges.map(hmin)], 4)),
    answer: hmin(total), dire: 'On cherche combien de fois 60 minutes, puis ce qui reste.',
  });
}

/** CM2 : les secondes (1 min = 60 s ; 1 h = 3 600 s). */
function secondes(rng) {
  if (rng() < 0.3) {
    const h = randInt(rng, 1, 3);
    return aTaper({
      key: `mesures-cm:heures-s:${h}`, consigne: 'Combien de secondes y a-t-il ? Une minute, c’est 60 secondes.', court: 'Combien de secondes ?',
      stage: { type: 'equation', parts: [`${h} h`, '=', null, 's'] }, answer: h * 3600, dire: 'Une heure, c’est 60 fois 60 secondes : 3 mille 600 secondes.',
    });
  }
  const m = randInt(rng, 1, 5);
  const s = randInt(rng, 1, 11) * 5;
  const total = m * 60 + s;
  if (rng() < 0.5) {
    return aTaper({
      key: `mesures-cm:ens:${total}`, consigne: 'Combien de secondes y a-t-il ? Une minute, c’est 60 secondes.', court: 'Combien de secondes ?',
      stage: { type: 'equation', parts: [minsec(total), '=', null, 's'] }, answer: total,
    });
  }
  return aToucher({
    key: `mesures-cm:enminsec:${total}`, consigne: 'Combien de minutes et de secondes cela fait-il ?', court: 'En minutes et secondes ?',
    stage: { type: 'equation', parts: [`${total} s`, '=', null] },
    choices: textes(avecPieges(rng, minsec(total), [`${Math.floor(total / 100)} min ${String(total % 100).padStart(2, '0')} s`, minsec(total + 60), minsec(Math.max(60, total - 60))], 4)),
    answer: minsec(total),
  });
}

/** Une figure de carreaux reliés (sans trou) : on part d'un carreau et on en ajoute à côté. */
function polyomino(rng, n, cols, rows) {
  const cells = [[randInt(rng, 1, cols - 2), randInt(rng, 1, rows - 2)]];
  const has = (x, y) => cells.some(([a, b]) => a === x && b === y);
  while (cells.length < n) {
    const [x, y] = pick(rng, cells);
    const [dx, dy] = pick(rng, [[1, 0], [-1, 0], [0, 1], [0, -1]]);
    if (x + dx >= 0 && x + dx < cols && y + dy >= 0 && y + dy < rows && !has(x + dx, y + dy)) cells.push([x + dx, y + dy]);
  }
  return cells;
}

/** Aire sur quadrillage : combien de carreaux (de cm²) ? */
function aireCarreaux(rng) {
  const n = randInt(rng, 7, 16);
  const cells = polyomino(rng, n, 8, 5);
  return aTaper({
    key: `mesures-cm:aire:${cells.map((c) => c.join('-')).join('/')}`,
    consigne: 'Un carreau mesure 1 centimètre carré. Quelle est l’aire de la figure hachurée, en centimètres carrés ?',
    court: 'L’aire, en centimètres carrés ?',
    stage: dessin({ kind: 'cm-aire', cols: 8, rows: 5, cells }, `Une figure de ${n} carreaux hachurés sur un quadrillage`),
    answer: n,
    dire: `La figure couvre ${n} carreaux : son aire est de ${n} centimètres carrés.`,
  });
}

/** Comparer des aires : la figure qui a la plus grande aire (les trois figures n'ont pas la même forme). */
function comparerAires(rng) {
  const tailles = sample(rng, [6, 7, 8, 9, 10, 11, 12], 3);
  const grand = rng() < 0.6;
  const answer = grand ? Math.max(...tailles) : Math.min(...tailles);
  return aToucher({
    key: `mesures-cm:comparer-aires:${tailles.join(',')}:${grand}`,
    consigne: grand ? 'Quelle figure a la plus grande aire ? Compte les carreaux.' : 'Quelle figure a la plus petite aire ? Compte les carreaux.',
    court: grand ? 'La plus grande aire ?' : 'La plus petite aire ?',
    choices: tailles.map((n) => choixDessin(n, { kind: 'cm-aire', cols: 5, rows: 4, cells: polyomino(rng, n, 5, 4) }, `Une figure de ${n} carreaux`)),
    style: 'drawings', answer,
    dire: 'L’aire, c’est la place que prend la figure : on compte les carreaux.',
  });
}

/** CM2 : l'aire du rectangle (longueur × largeur) et du carré (côté × côté). */
function aireRectangle(rng) {
  const carre = rng() < 0.35;
  const longueur = randInt(rng, 3, 12);
  const largeur = carre ? longueur : randInt(rng, 2, longueur - 1);
  const unite = pick(rng, ['cm', 'm']);
  const aire = longueur * largeur;
  const perimetre = 2 * (longueur + largeur);
  const pieges = [perimetre, longueur + largeur, aire + longueur].filter((v) => v !== aire);
  return aToucher({
    key: `mesures-cm:aire-rect:${longueur}x${largeur}${unite}`,
    consigne: carre ? 'Quelle est l’aire de ce carré ?' : 'Quelle est l’aire de ce rectangle ?',
    stage: dessin({ kind: 'cm-rectangle', longueur, largeur, unite }, carre ? `Un carré de ${longueur} ${unite} de côté` : `Un rectangle de ${longueur} ${unite} sur ${largeur} ${unite}`),
    choices: textes(avecPieges(rng, `${aire} ${unite}²`, pieges.map((v) => `${v} ${unite}²`), 4)),
    answer: `${aire} ${unite}²`,
    dire: carre ? 'L’aire du carré, c’est côté fois côté.' : 'L’aire du rectangle, c’est longueur fois largeur.',
  });
}

/** CM2 : cm², dm², m² (1 dm² = 100 cm² ; 1 m² = 100 dm²). */
function unitesAire(rng) {
  const [grande, petite] = pick(rng, [['m²', 'dm²'], ['dm²', 'cm²']]);
  const n = randInt(rng, 2, 9);
  const versPetite = rng() < 0.6;
  const [x, ux, r, ur] = versPetite ? [n, grande, n * 100, petite] : [n * 100, petite, n, grande];
  const pieges = versPetite ? [n * 10, n * 1000] : [n * 10, n * 1000];
  return aToucher({
    key: `mesures-cm:unites-aire:${x}${ux}`,
    consigne: 'Convertis cette aire : touche l’aire égale. Un carré d’un décimètre de côté contient 100 carrés d’un centimètre.',
    court: 'L’aire égale ?',
    stage: { type: 'equation', parts: [`${ecrit(x)} ${ux}`, '=', null] },
    choices: textes(avecPieges(rng, `${ecrit(r)} ${ur}`, pieges.map((v) => `${ecrit(v)} ${ur}`), 3)), answer: `${ecrit(r)} ${ur}`,
    dire: 'Pour les aires, on passe d’une unité à l’autre en multipliant ou en divisant par 100.',
  });
}

function questionMesures(level, rng) {
  switch (level) {
    case 1: return convertir(rng, 'longueurs');
    case 2: return convertir(rng, 'masses');
    case 3: return convertir(rng, 'contenances');
    case 4: return convertirVirgule(rng);
    case 5: return durees(rng);
    case 6: return aireCarreaux(rng);
    case 7: return comparerAires(rng);
    // CM2
    case 8: return aireRectangle(rng);
    case 9: return unitesAire(rng);
    default: return secondes(rng);
  }
}

export const mesuresCm = {
  id: 'mesures-cm',
  domain: 'temps',
  section: MESURES,
  title: 'Les mesures du CM',
  icon: '📏',
  skill: 'Convertir longueurs, masses, contenances et durées ; aires sur quadrillage, puis aire du rectangle et unités d’aire',
  levels: [
    'Longueurs : km, m, cm, mm', 'Masses : t, kg, g, mg', 'Contenances : hL, L, cL, mL', 'Convertir avec la virgule', 'Heures et minutes',
    'Aires : compter les carreaux', 'Comparer des aires', 'Aire du rectangle', 'Unités d’aire : cm², dm², m²', 'Les secondes',
  ],
  generate(level, rng) {
    return questionMesures(level, rng);
  },
};

// ================================================================ La géométrie du CM

const NATURE_ANGLE = (deg) => (deg === 90 ? 'droit' : deg < 90 ? 'aigu' : 'obtus');

/** Droit, aigu ou obtus ? (les angles proches de 90° sont évités : on voit la différence à l'œil) */
function angles(rng) {
  const deg = pick(rng, [90, 90, randInt(rng, 25, 65), randInt(rng, 115, 160)]);
  const rot = randInt(rng, 0, 7) * 45 + randInt(rng, -10, 10);
  const nature = NATURE_ANGLE(deg);
  return aToucher({
    key: `geometrie-cm:angle:${deg}:${rot}`,
    consigne: 'Cet angle est-il droit, aigu ou obtus ?',
    stage: dessin({ kind: 'cm-angle', deg, rot }, 'Un angle'),
    choices: textes(['aigu', 'droit', 'obtus']), answer: nature,
    dire: { droit: 'Il est droit, comme le coin de l’équerre.', aigu: 'Il est aigu : plus petit qu’un angle droit.', obtus: 'Il est obtus : plus grand qu’un angle droit.' }[nature],
  });
}

/** Le plus grand (ou le plus petit) de trois angles, tournés différemment. */
function comparerAngles(rng) {
  const degs = sample(rng, [30, 45, 60, 90, 120, 150], 3);
  const grand = rng() < 0.6;
  const answer = grand ? Math.max(...degs) : Math.min(...degs);
  return aToucher({
    key: `geometrie-cm:comparer:${degs.join(',')}:${grand}`,
    consigne: grand ? 'Quel angle est le plus grand ? Regarde l’écart entre les deux côtés, pas leur longueur.' : 'Quel angle est le plus petit ? Regarde l’écart entre les deux côtés, pas leur longueur.',
    court: grand ? 'L’angle le plus grand ?' : 'L’angle le plus petit ?',
    choices: degs.map((deg) => choixDessin(deg, { kind: 'cm-angle', deg, rot: randInt(rng, 0, 359) }, `Un angle ${NATURE_ANGLE(deg)}`)),
    style: 'drawings', answer,
  });
}

/** Parallèles, perpendiculaires, ou ni l'un ni l'autre ? */
function droites(rng) {
  const kind = pick(rng, ['paralleles', 'perpendiculaires', 'secantes']);
  const deg = { paralleles: 0, perpendiculaires: 90, secantes: pick(rng, [35, 50, 130, 145]) }[kind];
  const rot = randInt(rng, 0, 11) * 15;
  const answer = { paralleles: 'parallèles', perpendiculaires: 'perpendiculaires', secantes: 'ni l’un ni l’autre' }[kind];
  return aToucher({
    key: `geometrie-cm:droites:${kind}:${deg}:${rot}`,
    consigne: 'Ces deux droites sont-elles parallèles, perpendiculaires, ou ni l’un ni l’autre ?',
    court: 'Parallèles ou perpendiculaires ?',
    stage: dessin({ kind: 'cm-droites', deg, rot }, 'Deux droites'),
    // « perpendiculaires » est trop long pour trois colonnes : une réponse par ligne
    choices: textes(['parallèles', 'perpendiculaires', 'ni l’un ni l’autre']), style: 'sentences', answer,
    dire: {
      paralleles: 'Parallèles : elles ne se coupent jamais, l’écart reste le même.',
      perpendiculaires: 'Perpendiculaires : elles se coupent en formant un angle droit.',
      secantes: 'Elles se coupent, mais sans faire d’angle droit.',
    }[kind],
  });
}

const NOMS_FIGURES = {
  equilateral: 'triangle équilatéral', isocele: 'triangle isocèle', 'triangle-rectangle': 'triangle rectangle',
  'triangle-rectangle-isocele': 'triangle rectangle isocèle', triangle: 'triangle quelconque',
  carre: 'carré', rectangle: 'rectangle', losange: 'losange', parallelogramme: 'parallélogramme', quadrilatere: 'quadrilatère quelconque',
  trapeze: 'trapèze', 'trapeze-rectangle': 'trapèze rectangle', pentagone: 'pentagone', hexagone: 'hexagone',
};
const DIT_FIGURES = {
  equilateral: 'Ses trois côtés ont la même longueur : c’est un triangle équilatéral.',
  isocele: 'Il a deux côtés de même longueur : c’est un triangle isocèle.',
  'triangle-rectangle': 'Il a un angle droit : c’est un triangle rectangle.',
  'triangle-rectangle-isocele': 'Un angle droit et deux côtés égaux : c’est un triangle rectangle isocèle.',
  triangle: 'Ni angle droit, ni côtés égaux : c’est un triangle quelconque.',
  carre: 'Quatre angles droits et quatre côtés égaux : c’est un carré.',
  rectangle: 'Quatre angles droits : c’est un rectangle.',
  losange: 'Quatre côtés égaux, sans angle droit : c’est un losange.',
  parallelogramme: 'Ses côtés opposés sont parallèles et de même longueur : c’est un parallélogramme.',
  quadrilatere: 'Quatre côtés, sans propriété particulière : c’est un quadrilatère quelconque.',
  trapeze: 'Deux côtés parallèles : c’est un trapèze.',
  'trapeze-rectangle': 'Deux côtés parallèles et deux angles droits : c’est un trapèze rectangle.',
  pentagone: 'Cinq côtés : c’est un pentagone.',
  hexagone: 'Six côtés : c’est un hexagone.',
};

/** Reconnaître une figure d'après ses codes (traits sur les côtés égaux, petits carrés des angles droits). */
function figures(rng, noms, pieges) {
  const nom = pick(rng, noms);
  const autres = sample(rng, pieges[nom] || noms.filter((n) => n !== nom), 2);
  return aToucher({
    key: `geometrie-cm:figure:${nom}`,
    consigne: 'Quelle est cette figure ? Regarde les codes : les petits traits marquent les côtés de même longueur, les petits carrés les angles droits.',
    court: 'Quelle est cette figure ?',
    stage: dessin({ kind: 'cm-figure', nom, rot: randInt(rng, -25, 25) }, `Une figure à ${FIGURES[nom].pts.length} côtés, avec ses codes`),
    choices: textes(shuffle(rng, [nom, ...autres].map((n) => NOMS_FIGURES[n]))), style: 'answers',
    answer: NOMS_FIGURES[nom], dire: DIT_FIGURES[nom],
  });
}
const TRIANGLES = ['equilateral', 'isocele', 'triangle-rectangle', 'triangle'];
const QUADRILATERES = ['carre', 'rectangle', 'losange', 'quadrilatere'];
const PIEGES_QUADRI = { carre: ['rectangle', 'losange'], rectangle: ['carre', 'losange'], losange: ['carre', 'rectangle'], quadrilatere: ['rectangle', 'losange'] };
const CM2_FIGURES = ['trapeze', 'trapeze-rectangle', 'pentagone', 'hexagone', 'parallelogramme', 'triangle-rectangle-isocele'];
const PIEGES_CM2 = {
  trapeze: ['parallelogramme', 'losange'],
  'trapeze-rectangle': ['trapeze', 'rectangle'], pentagone: ['hexagone', 'quadrilatere'], hexagone: ['pentagone', 'losange'],
  parallelogramme: ['trapeze', 'losange'], 'triangle-rectangle-isocele': ['triangle-rectangle', 'isocele'],
};

// Le cercle : des questions écrites à la main, avec le dessin du cercle.
const CERCLE = [
  { ask: 'Tous les points du cercle sont à la même distance d’un point. Comment s’appelle ce point ?', answer: 'le centre', others: ['le sommet', 'le milieu du rayon'], says: 'C’est le centre du cercle.' },
  { ask: 'Pour tracer un cercle, quel instrument utilise-t-on ?', answer: 'le compas', others: ['l’équerre', 'le rapporteur'], says: 'On trace un cercle avec un compas.' },
  { ask: 'Le compas est écarté de 4 centimètres. À quelle distance du centre seront tous les points du cercle ?', answer: '4 centimètres', others: ['8 centimètres', '2 centimètres'], says: 'Tous les points du cercle seront à 4 centimètres du centre.' },
  { ask: 'Le point A est sur le cercle, à 3 centimètres du centre O. À quelle distance de O est un autre point B du cercle ?', answer: '3 centimètres', others: ['6 centimètres', 'on ne peut pas savoir'], says: 'Tous les points du cercle sont à la même distance du centre.' },
  { ask: 'Le cercle est la ligne. Comment s’appelle la surface à l’intérieur du cercle ?', answer: 'le disque', others: ['le rond', 'le rayon'], says: 'La surface à l’intérieur du cercle, c’est le disque.' },
  { ask: 'Un point est à 2 centimètres du centre, sur un cercle de 5 centimètres de rayon. Où est ce point ?', answer: 'à l’intérieur du cercle', others: ['sur le cercle', 'à l’extérieur du cercle'], says: '2 centimètres, c’est moins que 5 : le point est dans le disque.' },
  { ask: 'Un point est à 7 centimètres du centre, sur un cercle de 5 centimètres de rayon. Où est ce point ?', answer: 'à l’extérieur du cercle', others: ['sur le cercle', 'à l’intérieur du cercle'], says: '7 centimètres, c’est plus que 5 : le point est en dehors du cercle.' },
  { ask: 'Quelle figure n’a aucun sommet ?', answer: 'le cercle', others: ['le carré', 'le triangle'], says: 'Le cercle n’a ni côté ni sommet.' },
];

// Les solides : leur nom, leurs faces, leurs sommets, leurs arêtes.
const SOLIDES = {
  cube: { nom: 'cube', le: 'le cube', du: 'du cube', faces: 6, sommets: 8, aretes: 12, formes: 'des carrés' },
  pave: { nom: 'pavé droit', le: 'le pavé droit', du: 'du pavé droit', faces: 6, sommets: 8, aretes: 12, formes: 'des rectangles' },
  pyramide: { nom: 'pyramide', le: 'la pyramide', du: 'de la pyramide', faces: 5, sommets: 5, aretes: 8, formes: 'un carré et des triangles' },
  prisme: { nom: 'prisme droit', le: 'le prisme droit', du: 'du prisme droit', faces: 5, sommets: 6, aretes: 9, formes: 'des triangles et des rectangles' },
  cylindre: { nom: 'cylindre' },
  cone: { nom: 'cône' },
  boule: { nom: 'boule' },
};
const cap1 = (t) => `${t[0].toUpperCase()}${t.slice(1)}`;

function solides(rng, index) {
  const kind = index % 3;
  if (kind === 0) {
    const id = pick(rng, Object.keys(SOLIDES));
    const autres = sample(rng, Object.keys(SOLIDES).filter((s) => s !== id), 2);
    return aToucher({
      key: `geometrie-cm:solide:${id}`, consigne: 'Comment s’appelle ce solide ?', stage: dessin({ kind: 'cm-solide', nom: id }, 'Un solide'),
      choices: textes(shuffle(rng, [id, ...autres].map((s) => SOLIDES[s].nom))), style: 'answers', answer: SOLIDES[id].nom,
    });
  }
  const id = pick(rng, ['cube', 'pave', 'pyramide', 'prisme']);
  const s = SOLIDES[id];
  if (kind === 1) {
    const quoi = pick(rng, ['faces', 'sommets', 'aretes']);
    const mot = { faces: 'faces', sommets: 'sommets', aretes: 'arêtes' }[quoi];
    const values = [...new Set([s[quoi], s.faces, s.sommets, s.aretes, s[quoi] + 1, s[quoi] - 2])].slice(0, 4);
    return aToucher({
      key: `geometrie-cm:compter:${id}:${quoi}`,
      consigne: `Combien ce solide a-t-il ${quoi === 'aretes' ? 'd’arêtes' : `de ${mot}`} ? Pense aussi à ${quoi === 'sommets' ? 'ceux' : 'celles'} qu’on ne voit pas.`,
      court: `Combien ${quoi === 'aretes' ? 'd’arêtes' : `de ${mot}`} ?`,
      stage: dessin({ kind: 'cm-solide', nom: id }, cap1(s.le)),
      choices: shuffle(rng, values).map((v) => ({ value: v, label: String(v) })), style: 'numbers', answer: s[quoi],
      dire: `${cap1(s.le)} a ${s.faces} faces, ${s.sommets} sommets et ${s.aretes} arêtes.`,
    });
  }
  const autres = ['des carrés', 'des rectangles', 'un carré et des triangles', 'des triangles et des rectangles'].filter((f) => f !== s.formes);
  return aToucher({
    key: `geometrie-cm:formes:${id}`, consigne: 'Quelles sont les formes des faces de ce solide ?', court: 'La forme des faces ?',
    stage: dessin({ kind: 'cm-solide', nom: id }, cap1(s.le)),
    choices: textes(shuffle(rng, [s.formes, ...sample(rng, autres, 2)])), style: 'sentences', answer: s.formes,
    dire: `Les faces ${s.du} sont ${s.formes}.`,
  });
}

// Patrons du cube (vérifiés par tests/cm.test.js en « roulant » le cube) et faux patrons.
export const PATRONS = [
  [[0, 1], [1, 1], [2, 1], [3, 1], [1, 0], [1, 2]], // la croix
  [[0, 1], [1, 1], [2, 1], [3, 1], [0, 0], [0, 2]],
  [[0, 1], [1, 1], [2, 1], [3, 1], [0, 0], [3, 2]],
  [[0, 1], [1, 1], [2, 1], [3, 1], [1, 0], [2, 2]],
  [[0, 1], [1, 1], [2, 1], [3, 1], [2, 0], [0, 2]],
  [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]], // l'escalier
  [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1], [4, 1]],
];
export const FAUX_PATRONS = [
  [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]], // un rectangle de 2 sur 3
  [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [1, 1]], // 5 carrés en ligne
  [[0, 1], [1, 1], [2, 1], [3, 1], [0, 0], [3, 0]], // deux faces au-dessus de la même rangée : elles se chevauchent
  [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1], [3, 1]], // un carré de 2 sur 2
  [[0, 1], [1, 1], [2, 1], [1, 0], [2, 0], [1, 2]],
  [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]], // 6 carrés en ligne
];

function patronCube(rng) {
  const bon = pick(rng, PATRONS);
  const faux = sample(rng, FAUX_PATRONS, 2);
  const all = shuffle(rng, [['oui', bon], ['non-1', faux[0]], ['non-2', faux[1]]]);
  return aToucher({
    key: `geometrie-cm:patron:${PATRONS.indexOf(bon)}:${faux.map((f) => FAUX_PATRONS.indexOf(f)).join(',')}`,
    consigne: 'Quel dessin est un patron de cube ? Imagine que tu le plies.',
    court: 'Le patron du cube ?',
    choices: all.map(([value, cells], i) => choixDessin(value, { kind: 'cm-patron', cells }, `Dessin ${i + 1} : six carrés assemblés`)),
    style: 'drawings', answer: 'oui',
    dire: 'En le pliant, les six carrés deviennent les six faces du cube, sans se chevaucher.',
  });
}

// CM2 : l'angle droit mesure 90 degrés.
const DEGRES = [
  { ask: 'Combien de degrés mesure un angle droit ?', answer: '90 degrés', others: ['100 degrés', '45 degrés'], says: 'Un angle droit mesure 90 degrés.' },
  { ask: 'On plie un angle droit en deux. Combien de degrés mesure chaque moitié ?', answer: '45 degrés', others: ['30 degrés', '90 degrés'], says: 'La moitié de 90 degrés, c’est 45 degrés.' },
  { ask: 'On met deux angles droits côte à côte. Combien de degrés mesure l’angle obtenu ?', answer: '180 degrés', others: ['90 degrés', '360 degrés'], says: 'Deux angles droits, c’est 180 degrés : un angle plat.' },
  { ask: 'Un angle mesure 120 degrés. Comment est-il ?', answer: 'obtus', others: ['aigu', 'droit'], says: 'Plus de 90 degrés : l’angle est obtus.' },
  { ask: 'Un angle mesure 35 degrés. Comment est-il ?', answer: 'aigu', others: ['obtus', 'droit'], says: 'Moins de 90 degrés : l’angle est aigu.' },
  { ask: 'On met côte à côte un angle de 30 degrés et un angle de 60 degrés. Quel angle obtient-on ?', answer: 'un angle droit', others: ['un angle aigu', 'un angle obtus'], says: '30 degrés plus 60 degrés, cela fait 90 degrés : un angle droit.' },
  { ask: 'Combien d’angles droits a un rectangle ?', answer: '4', others: ['2', '3'], says: 'Le rectangle a quatre angles droits.' },
  { ask: 'Avec quel instrument vérifie-t-on qu’un angle est droit ?', answer: 'l’équerre', others: ['le compas', 'la règle'], says: 'On vérifie un angle droit avec l’équerre.' },
  { ask: 'Un triangle peut-il avoir deux angles droits ?', answer: 'non', others: ['oui'], says: 'Non : avec deux angles droits, les côtés ne se rejoindraient jamais.' },
  { ask: 'On trace un angle trois fois plus grand qu’un angle de 20 degrés. Combien mesure-t-il ?', answer: '60 degrés', others: ['23 degrés', '80 degrés'], says: 'Trois fois 20 degrés, c’est 60 degrés.' },
];

function questionGeometrie(level, rng, index) {
  switch (level) {
    case 1: return angles(rng);
    case 2: return comparerAngles(rng);
    case 3: return droites(rng);
    case 4: return figures(rng, TRIANGLES, {});
    case 5: return figures(rng, QUADRILATERES, PIEGES_QUADRI);
    case 6: return qcm('geometrie-cm:cercle', { ...pick(rng, CERCLE), stage: dessin({ kind: 'cm-cercle' }, 'Un cercle de centre O') }, rng);
    case 7: return solides(rng, index);
    case 8: return patronCube(rng);
    // CM2
    case 9: return figures(rng, CM2_FIGURES, PIEGES_CM2);
    default: return qcm('geometrie-cm:degres', pick(rng, DEGRES), rng);
  }
}

export const geometrieCm = {
  id: 'geometrie-cm',
  domain: 'jeux',
  section: 'Formes et espace',
  title: 'La géométrie du CM',
  icon: '📐',
  skill: 'Angles, droites parallèles et perpendiculaires, triangles et quadrilatères, cercle, solides et patron du cube ; trapèze, pentagone, hexagone, 90°',
  levels: [
    'Droit, aigu ou obtus ?', 'Comparer des angles', 'Parallèles, perpendiculaires', 'Les triangles', 'Carré, rectangle, losange',
    'Le cercle', 'Les solides', 'Le patron du cube', 'Trapèze, pentagone, hexagone', 'L’angle droit : 90°',
  ],
  generate(level, rng, index = 0) {
    return questionGeometrie(level, rng, index);
  },
};

// ================================================================ Données et hasard

const TABLEAUX = [
  {
    title: 'Les visiteurs du musée', head: 'Jour', cols: ['adultes', 'enfants'],
    items: [{ emoji: '📅', label: 'Samedi' }, { emoji: '📅', label: 'Dimanche' }, { emoji: '📅', label: 'Mercredi' }],
    cell: (it, col) => `Combien d’${col === 'adultes' ? 'adultes' : 'enfants'} sont venus le ${it.label.toLowerCase()} ?`,
    total: (it) => `Combien de visiteurs sont venus le ${it.label.toLowerCase()} ?`,
  },
  {
    title: 'Les livres prêtés par la bibliothèque', head: 'Mois', cols: ['romans', 'BD'],
    items: [{ emoji: '📚', label: 'Mars' }, { emoji: '📚', label: 'Avril' }, { emoji: '📚', label: 'Mai' }],
    cell: (it, col) => `Combien de ${col} ont été ${col === 'BD' ? 'prêtées' : 'prêtés'} en ${it.label.toLowerCase()} ?`,
    total: (it) => `Combien de livres ont été prêtés en ${it.label.toLowerCase()} ?`,
  },
];

/** Un tableau à double entrée : lire une case, ou ajouter une ligne. */
function lireTableau(rng) {
  const t = pick(rng, TABLEAUX);
  const items = t.items.map((it) => ({ ...it, values: [randInt(rng, 12, 95) * 10 + randInt(rng, 0, 9), randInt(rng, 12, 95) * 10 + randInt(rng, 0, 9)] }));
  const it = pick(rng, items);
  const col = randInt(rng, 0, 1);
  const total = rng() < 0.4;
  const answer = total ? it.values[0] + it.values[1] : it.values[col];
  const chart = { kind: 'table2', title: t.title, head: t.head, cols: t.cols, items };
  const pieges = total ? [it.values[0], it.values[1], answer + 10] : [it.values[1 - col], ...items.filter((x) => x !== it).map((x) => x.values[col])];
  const values = [...new Set([answer, ...pieges])].slice(0, 4);
  return aToucher({
    key: `donnees-cm:tableau:${t.title}:${items.map((x) => x.values.join('-')).join('/')}:${it.label}:${total ? 'total' : col}`,
    consigne: total ? t.total(it) : t.cell(it, t.cols[col]),
    stage: { type: 'chart', chart },
    choices: shuffle(rng, values).map((v) => ({ value: v, label: ecrit(v) })), style: 'numbers', answer,
  });
}

const BARRES = [
  {
    title: 'Les élèves inscrits aux ateliers', unit: 'Élèves',
    items: [{ emoji: '🎨', label: 'Peinture' }, { emoji: '🎵', label: 'Musique' }, { emoji: '⚽', label: 'Football' }, { emoji: '🎭', label: 'Théâtre' }],
    ask: (it) => `Combien d’élèves sont inscrits à l’atelier ${it.label.toLowerCase()} ?`,
    diff: (g, p) => `Combien d’élèves de plus sont inscrits à l’atelier ${g.label.toLowerCase()} qu’à l’atelier ${p.label.toLowerCase()} ?`,
    total: 'Combien d’élèves sont inscrits en tout ?',
  },
  {
    title: 'Les arbres plantés dans la commune', unit: 'Arbres',
    items: [{ emoji: '🌳', label: 'Chênes' }, { emoji: '🌲', label: 'Sapins' }, { emoji: '🍁', label: 'Érables' }, { emoji: '🌸', label: 'Cerisiers' }],
    ask: (it) => `Combien ${/^[aeéiou]/i.test(it.label) ? 'd’' : 'de '}${it.label.toLowerCase()} ont été plantés ?`,
    diff: (g, p) => `Combien ${/^[aeéiou]/i.test(g.label) ? 'd’' : 'de '}${g.label.toLowerCase()} de plus que ${/^[aeéiou]/i.test(p.label) ? 'd’' : 'de '}${p.label.toLowerCase()} ont été plantés ?`,
    total: 'Combien d’arbres ont été plantés en tout ?',
  },
];

/** Un diagramme en barres gradué de 10 en 10 (ou de 20 en 20) : lire une barre, comparer, ajouter. */
function lireBarres(rng, probleme) {
  const t = pick(rng, BARRES);
  const step = pick(rng, [10, 20]);
  const items = t.items.map((it) => ({ ...it, value: randInt(rng, 1, 9) * step / (rng() < 0.3 ? 2 : 1) }));
  const vals = items.map((it) => it.value);
  if (new Set(vals).size < vals.length) return lireBarres(rng, probleme);
  const max = Math.ceil(Math.max(...vals) / step) * step;
  const chart = { kind: 'bars', title: t.title, unit: t.unit, max, step, items };
  const [a, b] = sample(rng, items, 2);
  let consigne;
  let answer;
  let pieges;
  if (!probleme) {
    consigne = t.ask(a);
    answer = a.value;
    pieges = [a.value + step / 2, a.value - step / 2, b.value];
  } else if (rng() < 0.5) {
    const [g, p] = a.value > b.value ? [a, b] : [b, a];
    consigne = t.diff(g, p);
    answer = g.value - p.value;
    pieges = [g.value, p.value, answer + step];
  } else {
    consigne = t.total;
    answer = vals.reduce((s, v) => s + v, 0);
    pieges = [answer + step, answer - step, Math.max(...vals) * 4];
  }
  const values = [...new Set([answer, ...pieges.filter((v) => v > 0)])].slice(0, 4);
  return aToucher({
    key: `donnees-cm:barres:${t.title}:${vals.join(',')}:${consigne}`,
    consigne,
    stage: { type: 'chart', chart },
    choices: shuffle(rng, values).map((v) => ({ value: v, label: ecrit(v) })), style: 'numbers', answer,
  });
}

/** Une courbe : la température au fil de la journée. */
function lireCourbe(rng) {
  const xs = ['8 h', '10 h', '12 h', '14 h', '16 h', '18 h'];
  const base = randInt(rng, 6, 12);
  const pic = randInt(rng, 2, 4);
  const ys = xs.map((_, i) => base + Math.max(0, 8 - 3 * Math.abs(i - pic)) + (i > pic ? -1 : 0));
  const kind = pick(rng, ['valeur', 'max', 'min']);
  const drawing = { kind: 'cm-courbe', xs, ys, max: Math.ceil((Math.max(...ys) + 2) / 5) * 5, step: 5, unite: '°C' };
  const stage = dessin(drawing, `La température de la journée : ${xs.map((x, i) => `${x}, ${ys[i]} degrés`).join(' ; ')}`);
  if (kind === 'valeur') {
    const i = randInt(rng, 0, xs.length - 1);
    const values = [...new Set([ys[i], ys[i] + 1, ys[i] - 1, ys[(i + 1) % ys.length]])].slice(0, 4);
    return aToucher({
      key: `donnees-cm:courbe:${ys.join(',')}:${i}`, consigne: `Quelle température fait-il à ${xs[i].replace(' h', ' heures')} ?`,
      stage, choices: shuffle(rng, values).map((v) => ({ value: v, label: `${v} °C` })), answer: ys[i],
    });
  }
  const target = kind === 'max' ? Math.max(...ys) : Math.min(...ys);
  const i = ys.indexOf(target);
  if (ys.indexOf(target, i + 1) !== -1) return lireCourbe(rng);
  return aToucher({
    key: `donnees-cm:courbe:${ys.join(',')}:${kind}`,
    consigne: kind === 'max' ? 'À quelle heure fait-il le plus chaud ?' : 'À quelle heure fait-il le plus froid ?',
    stage, choices: textes(sample(rng, xs.filter((x) => x !== xs[i]), 3).concat(xs[i]).sort((p, q) => parseInt(p, 10) - parseInt(q, 10))),
    style: 'words', answer: xs[i],
  });
}

// Le hasard (CM1) : possible, impossible, certain ; probable, peu probable, une chance sur deux.
const HASARD = [
  { ask: 'On lance un dé à six faces. Obtenir 7, c’est…', answer: 'impossible', others: ['possible', 'certain'], says: 'Le dé n’a pas de face 7 : c’est impossible.' },
  { ask: 'On lance un dé à six faces. Obtenir un nombre plus petit que 10, c’est…', answer: 'certain', others: ['possible', 'impossible'], says: 'Toutes les faces sont plus petites que 10 : c’est certain.' },
  { ask: 'On lance un dé à six faces. Obtenir 3, c’est…', answer: 'possible', others: ['certain', 'impossible'], says: 'Le 3 peut sortir, mais pas à coup sûr : c’est possible.' },
  { ask: 'Dans un sac, il n’y a que des billes rouges. Tirer une bille rouge, c’est…', answer: 'certain', others: ['possible', 'impossible'], says: 'Toutes les billes sont rouges : c’est certain.' },
  { ask: 'Dans un sac, il n’y a que des billes rouges. Tirer une bille verte, c’est…', answer: 'impossible', others: ['possible', 'certain'], says: 'Il n’y a pas de bille verte : c’est impossible.' },
  { ask: 'On lance une pièce. Tomber sur pile, c’est…', answer: 'possible', others: ['certain', 'impossible'], says: 'Pile peut sortir, face aussi : c’est possible.' },
  { ask: 'On tire une carte dans un jeu qui n’a que des cœurs. Tirer un cœur, c’est…', answer: 'certain', others: ['possible', 'impossible'], says: 'Il n’y a que des cœurs : c’est certain.' },
  { ask: 'On fait tourner une roue avec les nombres de 1 à 8. Obtenir 0, c’est…', answer: 'impossible', others: ['possible', 'certain'], says: 'Le 0 n’est pas sur la roue : c’est impossible.' },
];
const PROBABLE = [
  { ask: 'Un sac contient 9 billes rouges et 1 bille bleue. Tirer une bille rouge, c’est…', answer: 'probable', others: ['peu probable', 'impossible'], says: 'Presque toutes les billes sont rouges : c’est probable.' },
  { ask: 'Un sac contient 9 billes rouges et 1 bille bleue. Tirer la bille bleue, c’est…', answer: 'peu probable', others: ['probable', 'certain'], says: 'Une seule bille bleue sur dix : c’est peu probable.' },
  { ask: 'Un sac contient 5 billes rouges et 5 billes bleues. Tirer une bille rouge, c’est…', answer: 'une chance sur deux', others: ['peu probable', 'certain'], says: 'Autant de rouges que de bleues : une chance sur deux.' },
  { ask: 'On lance une pièce. Tomber sur face, c’est…', answer: 'une chance sur deux', others: ['certain', 'peu probable'], says: 'Pile ou face : une chance sur deux.' },
  { ask: 'On lance un dé à six faces. Obtenir un 6, c’est…', answer: 'peu probable', others: ['probable', 'une chance sur deux'], says: 'Une seule face sur six : c’est peu probable.' },
  { ask: 'On lance un dé à six faces. Obtenir un nombre pair, c’est…', answer: 'une chance sur deux', others: ['peu probable', 'certain'], says: 'Trois faces paires sur six : une chance sur deux.' },
  { ask: 'On lance un dé à six faces. Obtenir plus que 1, c’est…', answer: 'probable', others: ['peu probable', 'impossible'], says: 'Cinq faces sur six : c’est probable.' },
  { ask: 'Une roue a 3 cases jaunes et 1 case grise, de même taille. Tomber sur une case jaune, c’est…', answer: 'probable', others: ['peu probable', 'une chance sur deux'], says: 'Trois cases sur quatre : c’est probable.' },
  { ask: 'Deux issues possibles, est-ce toujours une chance sur deux ? Une roue a 1 case gagnante et 9 cases perdantes.', answer: 'non, perdre est plus probable', others: ['oui, une chance sur deux', 'non, gagner est plus probable'], says: 'Deux issues ne veulent pas dire une chance sur deux : il faut compter les cases.' },
];

/** CM2 : « a chances sur b » (dé, cartes, sac de billes : toutes les issues ont la même chance). */
function chancesSur(rng) {
  const kind = pick(rng, ['de', 'sac', 'cartes']);
  let ask;
  let a;
  let b;
  if (kind === 'de') {
    const [texte, nb] = pick(rng, [['un nombre pair', 3], ['un nombre plus grand que 4', 2], ['le 6', 1], ['un multiple de 3', 2], ['un nombre impair', 3], ['un nombre plus petit que 5', 4]]);
    ask = `On lance un dé à six faces. Combien de chances y a-t-il d’obtenir ${texte} ?`;
    [a, b] = [nb, 6];
  } else if (kind === 'sac') {
    const r = randInt(rng, 1, 6);
    const v = randInt(rng, 1, 6);
    ask = `Un sac contient ${r} bille${r > 1 ? 's' : ''} rouge${r > 1 ? 's' : ''} et ${v} bille${v > 1 ? 's' : ''} verte${v > 1 ? 's' : ''}. Combien de chances y a-t-il de tirer une bille verte ?`;
    [a, b] = [v, r + v];
  } else {
    const n = pick(rng, [10, 12, 20]);
    const g = randInt(rng, 1, 5);
    ask = `Dans ${n} cartes retournées, ${g} sont gagnantes. Combien de chances y a-t-il de tirer une carte gagnante ?`;
    [a, b] = [g, n];
  }
  const ecrire = (x, y) => `${x} chance${x > 1 ? 's' : ''} sur ${y}`;
  const pieges = [ecrire(b - a, b), ecrire(a, b - a), ecrire(1, b), ecrire(a, b + 1)].filter((p, i) => !(i === 1 && b - a <= 0));
  return aToucher({
    key: `donnees-cm:chances:${ask}`, consigne: ask, choices: textes(avecPieges(rng, ecrire(a, b), pieges, 3)), style: 'answers',
    answer: ecrire(a, b), dire: `Il y a ${b} issues en tout, dont ${a} qui conviennent : ${ecrire(a, b)}.`,
  });
}

/** CM2 : comparer des chances (deux sacs) ; le dé ne se souvient pas. */
function comparerChances(rng) {
  if (rng() < 0.25) {
    return qcm('donnees-cm:independance', pick(rng, [
      { ask: 'Avec un dé, on vient d’obtenir trois fois le 6. Au prochain lancer, le 6 a-t-il moins de chances de sortir ?', answer: 'non, toujours une chance sur six', others: ['oui, il est déjà beaucoup sorti', 'non, il a plus de chances'], says: 'Le dé ne se souvient pas : une chance sur six à chaque lancer.' },
      { ask: 'Une pièce est tombée cinq fois sur pile. Au lancer suivant, quelle est la chance de tomber sur face ?', answer: 'une chance sur deux', others: ['plus d’une chance sur deux', 'moins d’une chance sur deux'], says: 'La pièce ne se souvient pas : toujours une chance sur deux.' },
    ]), rng);
  }
  const sac = () => {
    const r = randInt(rng, 1, 8);
    const v = randInt(rng, 1, 8);
    return { r, v };
  };
  const A = sac();
  const B = sac();
  // on compare les proportions de billes rouges (sans égalité)
  if (A.r * (B.r + B.v) === B.r * (A.r + A.v)) return comparerChances(rng);
  const answer = A.r * (B.r + B.v) > B.r * (A.r + A.v) ? 'le sac A' : 'le sac B';
  return aToucher({
    key: `donnees-cm:comparer:${A.r}-${A.v}:${B.r}-${B.v}`,
    consigne: `Le sac A contient ${A.r} billes rouges et ${A.v} billes vertes. Le sac B contient ${B.r} billes rouges et ${B.v} billes vertes. Dans quel sac a-t-on le plus de chances de tirer une bille rouge ?`
      .replace(/\b1 billes rouges/g, '1 bille rouge').replace(/\b1 billes vertes/g, '1 bille verte'),
    court: 'Quel sac ?',
    choices: textes(['le sac A', 'le sac B']), style: 'words', answer,
    dire: 'On compare la part des billes rouges dans chaque sac, pas seulement leur nombre.',
  });
}

/** CM2 : deux étapes (deux pièces, deux dés, un menu) : compter les issues avec un tableau ou un arbre. */
function deuxEtapes(rng) {
  return qcm('donnees-cm:etapes', pick(rng, [
    { ask: 'On lance deux pièces. Combien y a-t-il d’issues possibles : pile-pile, pile-face… ?', answer: '4', others: ['2', '3'], says: 'Pile-pile, pile-face, face-pile et face-face : 4 issues.' },
    { ask: 'On lance deux pièces. Combien de chances y a-t-il d’obtenir deux fois pile ?', answer: '1 chance sur 4', others: ['1 chance sur 2', '1 chance sur 3'], says: 'Une seule issue sur quatre : pile-pile.' },
    { ask: 'On lance deux pièces. Combien de chances y a-t-il d’obtenir un pile et un face ?', answer: '2 chances sur 4', others: ['1 chance sur 4', '1 chance sur 3'], says: 'Pile-face et face-pile : 2 issues sur 4, une chance sur deux.' },
    { ask: 'Au menu : 2 entrées et 3 plats. Combien de repas différents peut-on composer ?', answer: '6', others: ['5', '3'], says: 'Pour chaque entrée, 3 plats : 2 fois 3, cela fait 6 repas.' },
    { ask: 'Tu as 3 tee-shirts et 2 pantalons. Combien de tenues différentes peux-tu faire ?', answer: '6', others: ['5', '4'], says: '3 tee-shirts fois 2 pantalons : 6 tenues.' },
    { ask: 'On lance deux dés et on ajoute les nombres. Quelle somme est impossible ?', answer: '1', others: ['2', '12'], says: 'Le plus petit total est 1 plus 1, soit 2 : la somme 1 est impossible.' },
    { ask: 'On lance deux dés et on ajoute les nombres. Combien de façons y a-t-il d’obtenir 12 ?', answer: '1', others: ['2', '6'], says: 'Seulement 6 et 6 : une seule façon.' },
    { ask: 'On lance une pièce puis un dé à six faces. Combien y a-t-il d’issues possibles ?', answer: '12', others: ['8', '6'], says: '2 côtés de la pièce fois 6 faces du dé : 12 issues.' },
  ]), rng);
}

/** CM2 : le diagramme circulaire (les parts écrites dedans, chacune avec son motif). */
function diagrammeCirculaire(rng) {
  const t = pick(rng, [
    { title: 'Comment les élèves viennent à l’école', noms: [['À pied', 'vient à pied'], ['Vélo', 'vient à vélo'], ['Bus', 'vient en bus'], ['Voiture', 'vient en voiture']] },
    { title: 'Les sports préférés de la classe', noms: [['Foot', 'préfère le football'], ['Danse', 'préfère la danse'], ['Judo', 'préfère le judo'], ['Natation', 'préfère la natation']] },
  ]);
  const decoupe = pick(rng, [[2, 1, 1], [2, 2], [3, 1], [1, 1, 1, 1], [2, 1, 1]]);
  const noms = sample(rng, t.noms, decoupe.length);
  const parts = decoupe.map((value, i) => ({ value, label: noms[i][0], phrase: noms[i][1] }));
  const total = decoupe.reduce((s, v) => s + v, 0); // en quarts
  const p = pick(rng, parts);
  const nomPart = { 1: 'un quart', 2: 'la moitié', 3: 'les trois quarts' }[p.value * (4 / total)];
  const all = ['un quart', 'la moitié', 'les trois quarts', 'le tiers'];
  return aToucher({
    key: `donnees-cm:secteurs:${parts.map((x) => `${x.label}${x.value}`).join(',')}:${p.label}`,
    consigne: `Quelle part des élèves ${p.phrase} ?`,
    court: 'Quelle part ?',
    stage: dessin({ kind: 'cm-secteurs', parts }, `${t.title} : ${parts.map((x) => `${x.label}, ${x.value * (4 / total)} quart${x.value * (4 / total) > 1 ? 's' : ''}`).join(' ; ')}`),
    choices: textes(avecPieges(rng, nomPart, all.filter((x) => x !== nomPart), 3)), style: 'answers', answer: nomPart,
    dire: 'On compare la part au disque entier : la moitié, un quart…',
  });
}

function questionDonnees(level, rng) {
  switch (level) {
    case 1: return lireTableau(rng);
    case 2: return lireBarres(rng, false);
    case 3: return lireCourbe(rng);
    case 4: return lireBarres(rng, true);
    case 5: return qcm('donnees-cm:hasard', pick(rng, HASARD), rng, 'words');
    case 6: return qcm('donnees-cm:probable', pick(rng, PROBABLE), rng);
    // CM2
    case 7: return diagrammeCirculaire(rng);
    case 8: return chancesSur(rng);
    case 9: return comparerChances(rng);
    default: return deuxEtapes(rng);
  }
}

export const donneesCm = {
  id: 'donnees-cm',
  domain: 'maths',
  section: 'Nombres et calcul',
  title: 'Données et hasard',
  icon: '🎲',
  skill: 'Lire tableaux, diagrammes et courbes ; possible, impossible, certain, probable ; « a chances sur b », expériences en deux étapes',
  levels: [
    'Lire un tableau', 'Lire un diagramme en barres', 'Lire une courbe', 'Problèmes avec des données', 'Possible, impossible, certain',
    'Probable ou peu probable ?', 'Le diagramme circulaire', 'Combien de chances ?', 'Comparer des chances', 'Deux étapes',
  ],
  generate(level, rng) {
    return questionDonnees(level, rng);
  },
};

export const CM_MESURES_GAMES = [mesuresCm, geometrieCm, donneesCm];
