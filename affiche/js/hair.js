// Cheveux vus de dos, dans le repère de la tête de l'enfant (centre 500, 344) ; l'adulte
// utilise les mêmes dessins, agrandis. Rendu d'illustration peinte : la lumière vient d'en
// haut à droite, les tons passent de l'ombre (bord gauche, nuque) au reflet par zones
// emboîtées aux bords en duvet ; contours en fines pointes, longueurs qui finissent en mèches
// effilées de longueurs inégales, liseré clair sur le bord droit.

import {
  both, clipped, fill, flame, limb, pt, random, sheen, spindle,
} from './draw.js';
import { mix } from './themes.js';

/** Cheveux qui couvrent les épaules : les inscriptions du maillot de l'enfant descendent un peu. */
export const LONG_HAIRS = ['long', 'frises'];

/** Cheveux tirés en arrière (queue, chignon, couettes) : la nuque reste visible. */
const HAIR_CAP = 'M 500 256 C 550 256 576 298 574 346 C 573 376 566 396 556 408 C 542 414 524 412 512 422 '
  + 'C 505 428 495 428 488 422 C 476 412 458 414 444 408 C 434 396 427 376 426 346 C 424 298 450 256 500 256 Z';

const deg = (d) => (d * Math.PI) / 180;
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** Les tons d'une couleur de cheveux, du plus sombre au plus clair. */
function tones(h) {
  return {
    deep: mix(h.shade, '#000000', 0.35),
    shade: h.shade,
    dusk: mix(h.shade, h.base, 0.5),
    base: h.base,
    glow: mix(h.base, h.light, 0.5),
    light: h.light,
    rim: mix(h.light, '#ffffff', 0.18),
  };
}

/** Ovale plein (tracé). */
function ellipse(cx, cy, rx, ry) {
  const f = (v) => v.toFixed(1);
  return `M ${f(cx - rx)} ${f(cy)} A ${f(rx)} ${f(ry)} 0 1 1 ${f(cx + rx)} ${f(cy)} A ${f(rx)} ${f(ry)} 0 1 1 ${f(cx - rx)} ${f(cy)} Z`;
}

/** Contour d'ovale : point et normale extérieure à l'angle `d` (degrés, 90 = bas, 270 = haut). */
function oval(cx, cy, rx, ry) {
  return (d) => {
    const a = deg(d);
    const [nx, ny] = [Math.cos(a) / rx, Math.sin(a) / ry];
    const l = Math.hypot(nx, ny);
    return { p: [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry], n: [nx / l, ny / l] };
  };
}

/** Courbe de Bézier quadratique (`s` de 0 à 1) : point et normale, à gauche du sens de parcours. */
function curve(p0, p1, p2) {
  return (s) => {
    const u = 1 - s;
    const p = [u * u * p0[0] + 2 * u * s * p1[0] + s * s * p2[0], u * u * p0[1] + 2 * u * s * p1[1] + s * s * p2[1]];
    const d = [2 * u * (p1[0] - p0[0]) + 2 * s * (p2[0] - p1[0]), 2 * u * (p1[1] - p0[1]) + 2 * s * (p2[1] - p1[1])];
    const l = Math.hypot(d[0], d[1]) || 1;
    return { p, n: [d[1] / l, -d[0] / l] };
  };
}

/**
 * Duvet : fines pointes le long d'un contour (`at(s)` : point et normale), de `from` à `to`.
 * `lean` incline les pointes (radians). Un seul tracé pour toutes les pointes.
 */
function fur(rnd, at, { from, to, count, len: [l0, l1], width: [w0, w1], lean = 0, inset = 3, curl = 0.3 }) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const { p, n } = at(from + ((to - from) * (i + rnd())) / count);
    const tilt = lean + (rnd() - 0.5) * 0.5;
    const dir = [n[0] * Math.cos(tilt) - n[1] * Math.sin(tilt), n[0] * Math.sin(tilt) + n[1] * Math.cos(tilt)];
    const len = l0 + rnd() * (l1 - l0);
    const base = [p[0] - n[0] * inset, p[1] - n[1] * inset];
    out.push(flame(base, [p[0] + dir[0] * len, p[1] + dir[1] * len], w0 + rnd() * (w1 - w0), (rnd() - 0.5) * len * curl));
  }
  return out.join(' ');
}

/** Mèches tirées du contour vers `target` (cheveux attachés) ; un seul tracé. */
function pulled(rnd, at, target, { from, to, count, reach: [r0, r1], width: [w0, w1] }) {
  const list = [];
  for (let i = 0; i < count; i += 1) {
    const { p, n } = at(from + ((to - from) * (i + rnd() * 0.8)) / count);
    const base = [p[0] + n[0] * 4, p[1] + n[1] * 4];
    list.push(flame(base, lerp(base, target, r0 + rnd() * (r1 - r0)), w0 + rnd() * (w1 - w0), (rnd() - 0.5) * 6));
  }
  return list.join(' ');
}

/**
 * Contour bouclé : passe par les `points` (boucle fermée, dans le sens des aiguilles d'une montre)
 * avec une bosse vers l'extérieur entre deux points (hauteur voisine de `h`).
 */
function scallop(rnd, points, h) {
  let d = `M ${pt(points[0])} `;
  for (let i = 0; i < points.length; i += 1) {
    const [a, b] = [points[i], points[(i + 1) % points.length]];
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const l = Math.hypot(dx, dy) || 1;
    const k = 2 * h * (0.7 + rnd() * 0.6);
    d += `Q ${pt([(a[0] + b[0]) / 2 + (dy / l) * k, (a[1] + b[1]) / 2 - (dx / l) * k])} ${pt(b)} `;
  }
  return `${d}Z`;
}

/** Points d'un arc de contour, de `from` à `to`. */
function arcPoints(at, from, to, count) {
  return Array.from({ length: count + 1 }, (_, i) => at(from + ((to - from) * i) / count).p);
}

/** Ovale au contour bouclé. */
const bumpyOval = (rnd, cx, cy, rx, ry, count, h) => scallop(rnd, arcPoints(oval(cx, cy, rx, ry), 0, 360, count).slice(0, count), h);

/** Points d'une grille en quinconce (pas `gap`, un peu au hasard) dans le rectangle `x0 y0 x1 y1`. */
function grid(rnd, [x0, y0, x1, y1], gap) {
  const list = [];
  for (let row = 0, y = y0; y <= y1; row += 1, y += gap * 0.82) {
    for (let x = x0 + (row % 2) * gap * 0.5; x <= x1; x += gap) {
      list.push([x + (rnd() - 0.5) * gap * 0.4, y + (rnd() - 0.5) * gap * 0.4]);
    }
  }
  return list;
}

/** Croissant épais au milieu, effilé aux bouts : arc de rayon `r`, de l'angle `a` sur `sweep` (radians). */
function crescent([x, y], r, a, sweep) {
  const f = (v) => v.toFixed(1);
  const p = (u) => pt([x + Math.cos(u) * r, y + Math.sin(u) * r]);
  return `M ${p(a)} A ${f(r)} ${f(r)} 0 0 1 ${p(a + sweep)} A ${f(r * 1.7)} ${f(r * 1.7)} 0 0 0 ${p(a)} Z`;
}

/**
 * Boucles : pour chaque boucle, un croissant sombre sur son bord bas gauche et un croissant clair
 * sur son bord haut droit, plus ou moins clairs selon la place (lumière en haut à droite de `center`).
 */
function curlMarks(ctx, t, rnd, spots, [r0, r1], [cx, cy]) {
  const groups = [[], [], []];
  for (const [x, y] of spots) {
    const light = (x - cx) - (y - cy);
    const r = r0 + rnd() * (r1 - r0);
    const a = deg(30 + rnd() * 50);
    groups[light > 40 ? 2 : light > -50 ? 1 : 0].push([crescent([x, y], r, a, deg(150)), crescent([x, y], r * 0.78, a + deg(185), deg(115))]);
  }
  const [dark, lit] = [[t.deep, t.shade, t.dusk], [t.base, t.glow, t.light]];
  groups.forEach((list, g) => {
    if (!list.length) return;
    fill(ctx, list.map(([d]) => d).join(' '), dark[g]);
    fill(ctx, list.map(([, l]) => l).join(' '), lit[g]);
  });
}

// ---------------------------------------------------------------- cheveux courts

/** Courts : contour en duvet, ombre à gauche et sur la nuque, reflet en haut à droite. */
function shortHair(ctx, t, tie, rnd, gender) {
  const at = oval(500, 336, 72, 86);
  const P = (d) => pt(at(d).p);
  const shape = `M ${P(152)} A 72 86 0 1 1 ${P(388)} C 560 396 552 406 540 410 C 516 418 484 418 460 410 C 448 406 440 396 ${P(152)} Z`;
  // pointes du contour, derrière la masse : couchées vers le bas de chaque côté
  fill(ctx, fur(rnd, at, { from: 150, to: 222, count: 30, len: [3, 8], width: [3, 5], lean: -0.45 }), t.shade);
  fill(ctx, fur(rnd, at, { from: 222, to: 270, count: 22, len: [4, 11], width: [3, 5], lean: -0.3 }), t.base);
  fill(ctx, fur(rnd, at, { from: 270, to: 390, count: 44, len: [3, 10], width: [3, 5], lean: 0.35 }), t.base);
  fill(ctx, shape, t.shade);
  clipped(ctx, shape, () => {
    // zones de plus en plus claires vers le haut à droite, bords en duvet vers l'ombre
    const zone = ([cx, cy, rx, ry], d0, d1, count, len, color) => {
      fill(ctx, ellipse(cx, cy, rx, ry), color);
      fill(ctx, fur(rnd, oval(cx, cy, rx, ry), { from: d0, to: d1, count, len, width: [3, 6], lean: -0.35 }), color);
    };
    zone([507, 330, 68, 84], 95, 245, 34, [6, 16], t.dusk);
    zone([514, 324, 62, 78], 90, 240, 34, [6, 15], t.base);
    zone([530, 304, 36, 38], 70, 250, 22, [4, 11], mix(t.base, t.glow, 0.6));
    // nuque dans l'ombre, bord supérieur en pointes vers le haut
    fill(ctx, 'M 420 386 C 470 410 530 410 580 384 L 580 440 L 420 440 Z', t.shade);
    fill(ctx, fur(rnd, curve([426, 386], [500, 410], [576, 384]), { from: 0, to: 1, count: 16, len: [6, 16], width: [4, 7], lean: 0.2 }), t.shade);
    fill(ctx, 'M 420 404 C 470 422 530 422 580 402 L 580 440 L 420 440 Z', t.deep);
    // quelques mèches fines qui suivent la pousse (de l'épi vers le bas et les côtés)
    const flow = (n, from, to, color, w) => fill(ctx, Array.from({ length: n }, () => {
      const a = deg(from + rnd() * (to - from));
      const r0 = 30 + rnd() * 20;
      const r1 = r0 + 18 + rnd() * 16;
      return spindle([516 + Math.cos(a) * r0, 300 + Math.sin(a) * r0], [516 + Math.cos(a + 0.3) * r1, 300 + Math.sin(a + 0.3) * r1], w, 2);
    }).join(' '), color);
    flow(7, 120, 200, t.dusk, 1.4);
    flow(5, -60, 20, t.light, 1.6);
  });
  // petites pointes sur la nuque
  fill(ctx, fur(rnd, curve([544, 408], [500, 424], [456, 408]), { from: 0, to: 1, count: 12, len: [3, 8], width: [3, 5] }), t.deep);
  if (gender === 'fille') {
    fill(ctx, 'M 546 300 C 558 302 568 314 566 324 L 558 330 C 556 318 550 310 538 306 Z', tie);
    fill(ctx, 'M 548 302 C 552 304 556 308 558 312 L 554 314 C 552 310 549 307 545 305 Z', mix(tie, '#ffffff', 0.4));
  }
}

/** Crépus : coupe courte qui suit le crâne, contour en petites bosses, boucles serrées. */
function kinky(ctx, t, rnd) {
  const rim = [...arcPoints(oval(500, 334, 74, 88), 150, 390, 40), [556, 404], [528, 414], [500, 416], [472, 414], [444, 404]];
  const shape = scallop(rnd, rim, 1.8);
  fill(ctx, shape, t.shade);
  clipped(ctx, shape, () => {
    fill(ctx, bumpyOval(rnd, 508, 328, 68, 84, 34, 1.6), t.dusk);
    fill(ctx, bumpyOval(rnd, 516, 320, 60, 76, 34, 1.6), t.base);
    fill(ctx, bumpyOval(rnd, 530, 304, 38, 40, 22, 1.4), t.glow);
    fill(ctx, 'M 420 392 C 470 414 530 414 580 390 L 580 440 L 420 440 Z', t.deep);
    curlMarks(ctx, t, rnd, grid(rnd, [428, 250, 572, 416], 8), [2.2, 3.2], [500, 330]);
  });
}

// ---------------------------------------------------------------- cheveux longs et carré

/**
 * Bas de cheveux longs en mèches effilées de longueurs inégales, de droite (`r`) à gauche (`l`) :
 * suite de segments à ajouter à un contour arrivé en (`r`, `end`).
 */
function tips(rnd, l, r, end, [len0, len1] = [8, 38]) {
  const n = Math.round((r - l) / 12);
  const step = (r - l) / n;
  let edge = '';
  for (let i = n - 1; i >= 0; i -= 1) {
    edge += `L ${pt([l + step * (i + 0.5) + (rnd() - 0.5) * step * 0.4, end + len0 + rnd() * (len1 - len0)])} `;
    if (i > 0) edge += `L ${pt([l + step * i + (rnd() - 0.5) * 3, end - 4 - rnd() * 16])} `;
  }
  return edge;
}

/** Mèches de derrière, dans l'ombre, visibles entre les pointes (un seul tracé). */
function backTips(rnd, l, r, end, [len0, len1] = [14, 44]) {
  const n = Math.round((r - l) / 12) - 1;
  return Array.from({ length: n }, (_, i) => {
    const x = l + 12 + (i * (r - l - 24)) / Math.max(1, n - 1) + (rnd() - 0.5) * 4;
    return flame([x, end - 14], [x + (rnd() - 0.5) * 6, end + len0 + rnd() * (len1 - len0)], 10);
  }).join(' ');
}

/** Contour de cheveux longs : dôme sur la tête, côtés qui s'évasent un peu, bas en pointes. */
function hangingHair(rnd, end, spread) {
  const [l, r] = [500 - spread - 6, 500 + spread + 6];
  return `M 500 250 C 556 250 584 298 582 352 C 581 ${end - 60} ${r - 2} ${end - 24} ${r} ${end} ${tips(rnd, l, r, end)}`
    + `L ${l} ${end} C ${l + 2} ${end - 24} 419 ${end - 60} 418 352 C 416 298 444 250 500 250 Z`;
}

/** Longs et lisses, carré : bande d'ombre à gauche, liseré clair à droite, pointes effilées. */
function longHair(ctx, t, rnd, { bottom, spread }) {
  const end = bottom - 30;
  const [l, r] = [500 - spread - 6, 500 + spread + 6];
  fill(ctx, backTips(rnd, l, r, end), t.shade);
  const hair = hangingHair(rnd, end, spread);
  fill(ctx, hair, t.base);
  clipped(ctx, hair, () => {
    // ombre : bande sur le bord gauche, plus sombre tout au bord
    fill(ctx, `M 500 240 C 452 242 420 284 414 344 L ${l - 20} ${bottom + 40} L ${l + spread * 0.34} ${bottom + 40} `
      + `C ${l + spread * 0.3} ${bottom - 90} 448 340 472 262 C 480 250 490 244 500 240 Z`, t.shade);
    fill(ctx, `M 470 246 C 440 256 418 296 412 352 L ${l - 16} ${bottom + 40} L ${l + 10} ${bottom + 40} `
      + `C ${l + 12} ${bottom - 100} 426 330 446 272 Z`, t.deep);
    // mèches : traits fins qui suivent la tête puis tombent droit
    const strands = (from, to, n, width, len) => Array.from({ length: n }, () => {
      const u = from + rnd() * (to - from);
      const x1 = 500 + u * (spread + 4);
      return limb([[500 + u * 24, 262], [500 + u * 54, 290], [x1, 352], [x1 + u * 4, end + 20 - rnd() * (end - 352) * (1 - len)]],
        [0.5, width * 0.7, width, 0.5]);
    }).join(' ');
    fill(ctx, strands(-0.95, -0.35, 7, 3, 0.8), t.dusk);
    fill(ctx, strands(-0.3, 0.75, 9, 1.8, 0.7), t.dusk);
    fill(ctx, strands(0.1, 0.85, 8, 2.4, 0.5), t.glow);
    fill(ctx, strands(0.35, 0.8, 4, 1.6, 0.3), t.light);
    // liseré de lumière sur le bord droit
    fill(ctx, limb([[520, 251], [563, 281], [583, 352], [r - 2, (352 + end) / 2], [r, bottom + 20]], [2, 4, 5, 5, 4]), t.light);
  });
}

// ---------------------------------------------------------------- longs et frisés

/** Longs et frisés : masse volumineuse au contour bouclé qui tombe sur les épaules. */
function curlyLong(ctx, t, rnd) {
  const top = oval(500, 350, 96, 108);
  const loop = [[414, 452], [404, 396], ...arcPoints(top, 182, 358, 14), [596, 396], [586, 452],
    [568, 478], [542, 468], [516, 480], [490, 470], [462, 480], [436, 472]];
  const shape = scallop(rnd, loop, 6);
  fill(ctx, shape, t.shade);
  clipped(ctx, shape, () => {
    fill(ctx, bumpyOval(rnd, 512, 336, 92, 122, 22, 5), t.dusk);
    fill(ctx, bumpyOval(rnd, 524, 318, 76, 98, 20, 5), t.base);
    fill(ctx, bumpyOval(rnd, 538, 298, 44, 48, 14, 4), t.glow);
    curlMarks(ctx, t, rnd, grid(rnd, [404, 242, 596, 484], 15), [6, 8.5], [500, 350]);
  });
}

// ---------------------------------------------------------------- cheveux attachés

/** Calotte de cheveux tirés vers `target` (sommet ou chignon) : ombre à gauche, reflets à droite. */
function pulledCap(ctx, t, target, rnd) {
  const at = oval(500, 340, 74, 84);
  fill(ctx, HAIR_CAP, t.base);
  clipped(ctx, HAIR_CAP, () => {
    fill(ctx, pulled(rnd, at, target, { from: 96, to: 236, count: 15, reach: [0.6, 0.9], width: [16, 24] }), t.shade);
    fill(ctx, pulled(rnd, at, target, { from: 108, to: 200, count: 5, reach: [0.14, 0.28], width: [12, 16] }), t.deep);
    fill(ctx, pulled(rnd, at, target, { from: 40, to: 100, count: 8, reach: [0.3, 0.55], width: [8, 12] }), t.dusk);
    fill(ctx, pulled(rnd, at, target, { from: -90, to: 270, count: 20, reach: [0.7, 0.96], width: [2, 3] }), t.dusk);
    fill(ctx, pulled(rnd, at, target, { from: -80, to: 40, count: 12, reach: [0.72, 0.95], width: [3, 6] }), t.glow);
    fill(ctx, pulled(rnd, at, target, { from: -60, to: 20, count: 8, reach: [0.75, 0.95], width: [2, 3.5] }), t.light);
    fill(ctx, limb([[520, 258], [560, 284], [574, 340], [568, 384], [556, 406]], [2, 3.5, 4, 3, 1]), t.light);
  });
  napeWisps(ctx, t, rnd);
}

/** Petits cheveux sur la nuque (cheveux attachés). */
function napeWisps(ctx, t, rnd) {
  fill(ctx, fur(rnd, curve([554, 408], [500, 436], [446, 408]), { from: 0.05, to: 0.95, count: 14, len: [3, 9], width: [3, 5], inset: 4 }), t.shade);
}

/**
 * Mèche épaisse (queue, couette) le long de `spine` : ombre côté gauche, fins reflets à droite.
 * `widths` : demi-largeurs le long de la mèche.
 */
function tress(ctx, t, spine, widths) {
  const shape = limb(spine, widths);
  const shifted = (dx) => spine.map(([x, y], i) => [x + dx * Math.min(1, i / 2), y]);
  const scaled = (k, floor = 0.3) => widths.map((w) => Math.max(floor, w * k));
  fill(ctx, shape, t.base);
  clipped(ctx, shape, () => {
    fill(ctx, limb(shifted(-0.78 * Math.max(...widths)), scaled(0.4)), t.shade);
    fill(ctx, limb(shifted(-1.02 * Math.max(...widths)), scaled(0.2)), t.deep);
    const strand = (k, w, color) => fill(ctx, limb(shifted(k * Math.max(...widths)), scaled(w / Math.max(...widths), 0.2)), color);
    strand(-0.12, 1.4, t.dusk);
    strand(0.22, 2.4, t.glow);
    strand(0.5, 1.6, t.light);
    strand(0.72, 2.4, t.glow);
    strand(0.94, 1.4, t.rim);
  });
}

function ponytail(ctx, t, tie, rnd) {
  pulledCap(ctx, t, [500, 268], rnd);
  // la queue : part du sommet, dépasse un peu au-dessus, puis tombe dans le dos jusqu'au col
  const spine = [[493, 247], [497, 258], [501, 270], [505, 306], [508, 352], [510, 404], [508, 476]];
  const widths = [0.5, 11, 14, 23, 23, 16, 0.5];
  // ombre portée de la queue sur la calotte (lumière en haut à droite)
  clipped(ctx, HAIR_CAP, () => sheen(ctx, limb(spine.map(([x, y], i) => [x - 9 * Math.min(1, i / 2), y]), widths), t.deep, 0.4));
  tress(ctx, t, spine, widths);
  // élastique
  fill(ctx, 'M 486 262 C 494 258 506 258 514 262 L 514 272 C 506 268 494 268 486 272 Z', tie);
  fill(ctx, 'M 486 270 C 494 266 506 266 514 270 L 514 272 C 506 268 494 268 486 272 Z', mix(tie, '#000000', 0.3));
}

function bun(ctx, t, tie, rnd) {
  pulledCap(ctx, t, [500, 284], rnd);
  const ball = 'M 500 218 C 530 218 546 238 546 260 C 546 286 524 300 500 300 C 476 300 454 286 454 260 C 454 238 470 218 500 218 Z';
  fill(ctx, ball, t.base);
  clipped(ctx, ball, () => {
    fill(ctx, spindle([452, 250], [520, 304], 26), t.shade);
    fill(ctx, spindle([458, 272], [500, 302], 14), t.deep);
    // mèches enroulées autour du chignon : arcs qui suivent sa forme
    const wraps = (n, r0, color) => fill(ctx, Array.from({ length: n }, (_, i) => {
      const a = deg(-150 + i * (300 / n) + rnd() * 12);
      const b = a + deg(60 + rnd() * 30);
      const r = r0 + rnd() * 8;
      return spindle([500 + Math.cos(a) * r, 258 + Math.sin(a) * r * 0.8], [500 + Math.cos(b) * r, 258 + Math.sin(b) * r * 0.8], 1.6, r * 0.22);
    }).join(' '), color);
    wraps(4, 26, t.dusk);
    fill(ctx, spindle([478, 226], [546, 262], 8, -4), t.glow);
    fill(ctx, spindle([496, 240], [532, 280], 4, 6), t.light);
  });
  fill(ctx, 'M 466 292 C 478 304 522 304 534 292 L 532 304 C 518 312 482 312 468 304 Z', tie);
}

function pigtails(ctx, t, tie, rnd) {
  // deux couettes (même éclairage des deux côtés : ombre à gauche de chaque mèche)
  const left = [[440, 312], [414, 316], [398, 344], [398, 392], [404, 438], [398, 476]];
  const widths = [16, 20, 22, 20, 13, 0.5];
  tress(ctx, t, left, widths);
  tress(ctx, t, left.map(([x, y]) => [1000 - x, y]), widths);
  // la calotte est partagée par une raie, chaque moitié tirée vers sa couette
  fill(ctx, HAIR_CAP, t.base);
  const at = oval(500, 340, 74, 84);
  clipped(ctx, HAIR_CAP, () => {
    clipped(ctx, 'M 500 240 L 400 240 L 400 440 L 500 440 Z', () => {
      const r = random(31);
      const target = [438, 318];
      fill(ctx, pulled(r, at, target, { from: 96, to: 226, count: 18, reach: [0.6, 0.92], width: [10, 16] }), t.shade);
      fill(ctx, pulled(r, at, target, { from: 150, to: 200, count: 4, reach: [0.2, 0.35], width: [10, 14] }), t.deep);
      fill(ctx, pulled(r, at, target, { from: 60, to: 290, count: 24, reach: [0.7, 0.96], width: [2, 3.5] }), t.dusk);
      fill(ctx, pulled(r, at, target, { from: 262, to: 286, count: 4, reach: [0.55, 0.85], width: [4, 7] }), t.glow);
    });
    clipped(ctx, 'M 500 240 L 600 240 L 600 440 L 500 440 Z', () => {
      const r = random(37);
      const target = [562, 318];
      fill(ctx, pulled(r, at, target, { from: 40, to: 92, count: 6, reach: [0.3, 0.55], width: [5, 8] }), t.dusk);
      fill(ctx, pulled(r, at, target, { from: -100, to: 100, count: 22, reach: [0.7, 0.96], width: [2, 3.5] }), t.dusk);
      fill(ctx, pulled(r, at, target, { from: -76, to: 24, count: 12, reach: [0.7, 0.94], width: [4, 8] }), t.glow);
      fill(ctx, pulled(r, at, target, { from: -60, to: 10, count: 6, reach: [0.72, 0.94], width: [2, 3.5] }), t.light);
    });
    fill(ctx, 'M 498.5 256 L 501.5 256 L 503 426 L 497 426 Z', t.deep);
  });
  napeWisps(ctx, t, rnd);
  both(ctx, () => {
    fill(ctx, 'M 430 304 C 440 298 452 304 454 314 C 456 328 444 336 434 332 C 424 326 422 312 430 304 Z', tie);
    fill(ctx, 'M 428 322 C 434 330 444 332 452 326 C 448 334 440 336 432 332 Z', mix(tie, '#000000', 0.3));
  });
}

// ---------------------------------------------------------------- bouclés

function curls(ctx, t, rnd) {
  const shape = bumpyOval(rnd, 500, 336, 80, 82, 18, 6);
  fill(ctx, shape, t.shade);
  clipped(ctx, shape, () => {
    fill(ctx, bumpyOval(rnd, 510, 328, 76, 78, 16, 5), t.dusk);
    fill(ctx, bumpyOval(rnd, 520, 318, 62, 64, 16, 5), t.base);
    fill(ctx, bumpyOval(rnd, 536, 300, 32, 32, 12, 4), t.glow);
    curlMarks(ctx, t, rnd, grid(rnd, [420, 254, 580, 420], 16), [6.5, 9], [500, 336]);
  });
}

// ---------------------------------------------------------------- sous l'enfant (adulte)

/**
 * Cheveux de l'adulte qui dépassent sous l'enfant assis sur ses épaules (repère de l'adulte) :
 * queue de cheval, longueurs lisses ou frisées sur le haut du dos.
 */
export function drawHairBelow(ctx, h, style) {
  const t = tones(h);
  const rnd = random(23);
  if (style === 'queue') {
    tress(ctx, t, [[500, 742], [505, 772], [507, 802], [502, 836]], [30, 27, 17, 0.5]);
    return;
  }
  if (style === 'frises') {
    const shape = scallop(rnd, [[416, 738], [584, 738], [590, 772], [578, 804], [550, 816], [522, 808], [496, 818], [470, 808], [444, 816], [420, 804], [410, 772]], 6);
    fill(ctx, shape, t.dusk);
    clipped(ctx, shape, () => {
      fill(ctx, scallop(rnd, [[400, 730], [600, 730], [600, 762], [560, 770], [520, 764], [480, 772], [440, 764], [400, 770]], 4), t.shade);
      curlMarks(ctx, t, rnd, grid(rnd, [412, 748, 588, 816], 16), [7, 9.5], [520, 700]);
    });
    return;
  }
  // longueurs lisses sous l'enfant : ombrées par lui, finies par des mèches effilées
  const end = 786;
  fill(ctx, backTips(rnd, 420, 580, end, [12, 40]), t.shade);
  const hair = `M 418 738 L 582 738 C 584 756 582 772 580 ${end} ${tips(rnd, 420, 580, end, [6, 34])}L 420 ${end} C 418 772 416 756 418 738 Z`;
  fill(ctx, hair, t.base);
  clipped(ctx, hair, () => {
    fill(ctx, 'M 400 730 L 600 730 L 600 756 C 560 768 440 768 400 756 Z', t.shade);
    fill(ctx, fur(rnd, curve([594, 756], [500, 778], [406, 756]), { from: 0, to: 1, count: 18, len: [8, 22], width: [5, 8], inset: 2 }), t.shade);
    fill(ctx, 'M 400 740 L 436 740 C 430 770 430 800 438 840 L 400 840 Z', t.shade);
    const strands = (n, w) => Array.from({ length: n }, () => {
      const x = 430 + rnd() * 150;
      return spindle([x, 760 + rnd() * 10], [x + (x - 500) * 0.06, 800 + rnd() * 16], w);
    }).join(' ');
    fill(ctx, strands(8, 1.6), t.dusk);
    fill(ctx, strands(5, 2.2), t.glow);
    fill(ctx, 'M 576 742 C 584 766 584 790 580 830 L 574 830 C 578 790 578 766 570 742 Z', t.light);
  });
}

/**
 * Cheveux, dans le repère de la tête de l'enfant (centre 500, 344). `h` : couleurs des cheveux,
 * `tie` : couleur de l'élastique ou de la barrette.
 */
export function drawHair(ctx, h, tie, style, gender) {
  const t = tones(h);
  const rnd = random(17);
  if (style === 'queue') ponytail(ctx, t, tie, rnd);
  else if (style === 'chignon') bun(ctx, t, tie, rnd);
  else if (style === 'couettes') pigtails(ctx, t, tie, rnd);
  else if (style === 'carre') longHair(ctx, t, rnd, { bottom: 444, spread: 86 });
  else if (style === 'long') longHair(ctx, t, rnd, { bottom: 490, spread: 90 });
  else if (style === 'frises') curlyLong(ctx, t, rnd);
  else if (style === 'crepus') kinky(ctx, t, rnd);
  else if (style === 'court') shortHair(ctx, t, tie, rnd, gender);
  else if (style === 'rase') {
    // rasés : la peau du crâne reste visible sous des cheveux très courts
    sheen(ctx, HAIR_CAP, t.base, 0.55);
    clipped(ctx, HAIR_CAP, () => sheen(ctx, 'M 400 340 C 430 410 500 440 600 420 L 600 440 L 400 440 Z', t.deep, 0.35));
    sheen(ctx, 'M 520 268 C 548 276 566 300 568 330 C 556 306 540 288 520 278 Z', t.light, 0.4);
  } else curls(ctx, t, rnd);
}
