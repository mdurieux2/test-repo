// Cheveux vus de dos, dans le repère de la tête de l'enfant (centre 500, 344) ; l'adulte
// utilise les mêmes dessins, agrandis. Style « affiche » : aplats de 4 tons (reflet, base,
// ombre, ombre profonde), mèches effilées qui convergent vers le sommet ou la raie,
// contours en petites pointes. Lumière venant d'en haut à droite.

import {
  both, clipped, fill, flame, limb, random, sheen, spindle, stroke,
} from './draw.js';
import { mix } from './themes.js';

/** Cheveux qui couvrent les épaules : les inscriptions du maillot de l'enfant descendent un peu. */
export const LONG_HAIRS = ['long'];

/** Cheveux tirés en arrière (queue, chignon, couettes) : la nuque reste visible. */
const HAIR_CAP = 'M 500 256 C 550 256 576 298 574 346 C 573 376 566 396 556 408 C 542 414 524 412 512 422 '
  + 'C 505 428 495 428 488 422 C 476 412 458 414 444 408 C 434 396 427 376 426 346 C 424 298 450 256 500 256 Z';

const deg = (d) => (d * Math.PI) / 180;
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** Point du contour de la calotte (ellipse) à l'angle `d` (degrés, 90 = nuque, 270 = sommet). */
const capPoint = (d, k = 1) => [500 + Math.cos(deg(d)) * 74 * k, 340 + Math.sin(deg(d)) * 84 * k];

/** Les 4 tons d'une couleur de cheveux. */
function tones(h) {
  return { light: h.light, base: h.base, shade: h.shade, deep: mix(h.shade, '#000000', 0.35) };
}

/**
 * Mèches qui partent du contour (angles `from` → `to`) et filent vers le point `to`
 * sur une fraction `reach` du chemin.
 */
function locks(ctx, rnd, { from, to, count, target, reach: [r0, r1], width: [w0, w1], color, k = 1.04 }) {
  for (let i = 0; i < count; i += 1) {
    const d = from + ((to - from) * (i + rnd() * 0.6)) / count;
    const base = capPoint(d, k);
    const tip = lerp(base, target, r0 + rnd() * (r1 - r0));
    fill(ctx, flame(base, tip, w0 + rnd() * (w1 - w0), (rnd() - 0.5) * 8), color);
  }
}

/** Calotte de cheveux tirés vers `target` (sommet, chignon ou couette), ombrée à gauche. */
function pulledCap(ctx, t, target, rnd, { right = true, left = true } = {}) {
  fill(ctx, HAIR_CAP, t.base);
  clipped(ctx, HAIR_CAP, () => {
    if (left) {
      locks(ctx, rnd, { from: 100, to: 232, count: 14, target, reach: [0.62, 0.86], width: [16, 24], color: t.shade });
      locks(ctx, rnd, { from: 112, to: 168, count: 4, target, reach: [0.14, 0.24], width: [12, 16], color: mix(t.shade, t.deep, 0.6) });
    }
    if (right) {
      locks(ctx, rnd, { from: 50, to: 96, count: 5, target, reach: [0.4, 0.62], width: [14, 20], color: t.shade });
      locks(ctx, rnd, { from: -80, to: 40, count: 10, target, reach: [0.76, 0.95], width: [6, 10], color: t.light });
    }
    locks(ctx, rnd, { from: 240, to: 292, count: 4, target, reach: [0.6, 0.88], width: [6, 9], color: t.light });
  });
  // petites mèches folles sur la nuque
  for (let i = 0; i < 6; i += 1) {
    const x = 462 + i * 15 + rnd() * 6;
    const y = 412 + 12 * Math.sin((Math.PI * (x - 444)) / 112);
    fill(ctx, flame([x, y - 8], [x + (rnd() - 0.5) * 8, y + 5 + rnd() * 6], 9), i < 3 ? t.shade : t.base);
  }
}

/** Mèche épaisse le long d'une courbe (`points`), pointue au bout : queue, couettes, longueurs. */
function rope(ctx, points, widths, color) {
  fill(ctx, limb(points, widths), color);
}

function ponytail(ctx, t, tie, rnd) {
  const T = [494, 282];
  pulledCap(ctx, t, T, rnd);
  // ombre de la queue sur la calotte
  clipped(ctx, HAIR_CAP, () => sheen(ctx, limb([[500, 280], [536, 300], [534, 370], [512, 440]], [18, 26, 22, 8]), t.deep, 0.45));
  // la queue : monte au-dessus de la tête puis retombe dans le dos, jusqu'au col
  const spine = [T, [498, 244], [516, 224], [538, 238], [544, 292], [534, 362], [518, 424], [506, 476]];
  rope(ctx, spine, [20, 24, 26, 30, 32, 28, 18, 2], t.base);
  rope(ctx, [[500, 266], [512, 300], [512, 362], [504, 420], [496, 462]], [4, 9, 9, 6, 1], t.shade);
  rope(ctx, [[505, 250], [520, 238], [530, 266], [526, 330], [514, 398], [504, 448]], [3, 5, 7, 8, 5, 1], t.shade);
  rope(ctx, [[514, 232], [536, 250], [546, 300], [538, 360], [526, 412]], [3, 7, 9, 7, 1], t.light);
  rope(ctx, [[528, 240], [552, 276], [548, 340]], [2, 6, 1], t.light);
  rope(ctx, [[540, 300], [548, 340], [536, 392]], [2, 4, 1], mix(t.light, '#ffffff', 0.25));
  rope(ctx, [[530, 400], [522, 440], [512, 470]], [9, 6, 1], t.base);
  // élastique : fine bande à la base de la queue
  fill(ctx, 'M 479 284 C 486 278 502 277 511 281 L 510 291 C 501 287 487 288 480 293 Z', tie);
  fill(ctx, 'M 480 290 C 487 286 501 285 510 288 L 510 291 C 501 287 487 288 480 293 Z', mix(tie, '#000000', 0.3));
}

function bun(ctx, t, tie, rnd) {
  const T = [500, 284];
  pulledCap(ctx, t, T, rnd);
  const ball = 'M 500 218 C 530 218 546 238 546 260 C 546 286 524 300 500 300 C 476 300 454 286 454 260 C 454 238 470 218 500 218 Z';
  fill(ctx, ball, t.base);
  clipped(ctx, ball, () => {
    fill(ctx, spindle([452, 250], [520, 304], 26), t.shade);
    fill(ctx, spindle([458, 272], [500, 302], 14), t.deep);
    fill(ctx, spindle([478, 226], [546, 262], 9, -4), t.light);
    fill(ctx, spindle([496, 240], [532, 280], 5, 6), t.light);
    fill(ctx, spindle([466, 244], [492, 230], 4, 3), t.shade);
  });
  fill(ctx, 'M 466 292 C 478 304 522 304 534 292 L 532 304 C 518 312 482 312 468 304 Z', tie);
}

function pigtails(ctx, t, tie, rnd) {
  // deux couettes : la calotte est partagée par une raie, chaque moitié tirée vers sa couette
  both(ctx, () => {
    const tail = [[440, 312], [414, 316], [398, 344], [398, 392], [404, 438], [398, 476]];
    rope(ctx, tail, [16, 20, 22, 20, 13, 2], t.base);
    rope(ctx, [[430, 318], [414, 340], [412, 392], [414, 440]], [3, 8, 9, 1], t.shade);
    rope(ctx, [[418, 322], [404, 352], [404, 400], [400, 446]], [2, 5, 6, 1], t.light);
    rope(ctx, [[410, 420], [398, 450], [388, 470]], [7, 5, 1], t.base);
  });
  fill(ctx, HAIR_CAP, t.base);
  const half = (d) => `M 500 240 L ${d === 'left' ? '400 240 L 400 440' : '600 240 L 600 440'} L 500 440 Z`;
  clipped(ctx, HAIR_CAP, () => {
    for (const side of ['left', 'right']) {
      clipped(ctx, half(side), () => {
        const r = random(side === 'left' ? 31 : 37);
        if (side === 'left') {
          // moitié loin de la lumière : ombrée, quelques reflets près de la raie
          const target = [438, 318];
          locks(ctx, r, { from: 128, to: 214, count: 9, target, reach: [0.6, 0.9], width: [14, 20], color: t.shade });
          locks(ctx, r, { from: 92, to: 128, count: 5, target, reach: [0.5, 0.8], width: [6, 9], color: t.shade });
          locks(ctx, r, { from: 150, to: 200, count: 3, target, reach: [0.2, 0.35], width: [10, 14], color: mix(t.shade, t.deep, 0.6) });
          locks(ctx, r, { from: 262, to: 286, count: 3, target, reach: [0.55, 0.8], width: [5, 8], color: t.light });
        } else {
          // moitié éclairée : reflets en haut et à droite, ombre légère sur la nuque
          const target = [562, 318];
          locks(ctx, r, { from: 40, to: 92, count: 4, target, reach: [0.3, 0.55], width: [4, 7], color: t.shade });
          locks(ctx, r, { from: -70, to: 24, count: 9, target, reach: [0.7, 0.92], width: [6, 10], color: t.light });
        }
      });
    }
    fill(ctx, 'M 498 256 L 502 256 L 504 426 L 496 426 Z', t.deep);
  });
  both(ctx, () => {
    fill(ctx, 'M 430 304 C 440 298 452 304 454 314 C 456 328 444 336 434 332 C 424 326 422 312 430 304 Z', tie);
    fill(ctx, 'M 428 322 C 434 330 444 332 452 326 C 448 334 440 336 432 332 Z', mix(tie, '#000000', 0.3));
  });
  void rnd;
}

/** Contour de cheveux longs qui finissent en pointes (`bottom` : hauteur des pointes). */
function hangingHair(bottom, spread) {
  const [l, r] = [500 - spread, 500 + spread];
  return `M 500 250 C 556 250 584 298 582 352 C 580 ${bottom - 70} ${r + 4} ${bottom - 30} ${r + 8} ${bottom - 8} `
    + `L ${l - 8} ${bottom - 8} C ${l - 4} ${bottom - 30} 420 ${bottom - 70} 418 352 C 416 298 444 250 500 250 Z`;
}

/**
 * Mèche de cheveux longs : part de la raie, suit le crâne puis tombe droit.
 * `u` : place de -1 (bord gauche) à 1 (bord droit) ; `end` : 1 = jusqu'en bas.
 */
function hangingLock(ctx, { bottom, spread }, u, width, end, color, rnd) {
  const x = (k) => 500 + u * k + (rnd() - 0.5) * 3;
  const tipY = 262 + (bottom - 262) * end;
  const points = [[500 + u * 4, 256], [x(56), 282], [x(spread * 0.86), 342], [x(spread * 0.95), (342 + tipY) / 2], [x(spread * 0.98), tipY]];
  fill(ctx, limb(points, [1, width * 0.6, width, width * 0.9, 1]), color);
}

function longHair(ctx, t, rnd, { bottom, spread }) {
  const shape = hangingHair(bottom, spread);
  // les mèches dépassent un peu le contour en bas : ce sont elles qui font les pointes
  const outline = hangingHair(bottom + 24, spread + 2);
  const hair = { bottom, spread };
  clipped(ctx, `M 380 200 L 620 200 L 620 ${bottom - 5} L 380 ${bottom - 5} Z`, () => fill(ctx, shape, t.base));
  clipped(ctx, outline, () => {
    const lock = (u, width, end, color) => hangingLock(ctx, hair, u, width, end, color, rnd);
    for (let i = 0; i <= 9; i += 1) lock(-1.08 + (2.16 * i) / 9, 34, 0.99 + rnd() * 0.06, t.base);
    // ombre : côté gauche (loin de la lumière) et bord droit
    for (let i = 0; i < 8; i += 1) lock(-1.1 + i * 0.12 + rnd() * 0.04, 18 + rnd() * 6, 0.97 + rnd() * 0.07, t.shade);
    lock(-1.12, 22, 1.02, t.deep);
    lock(-0.98, 10, 0.9, mix(t.shade, t.deep, 0.6));
    for (let i = 0; i < 3; i += 1) lock(0.88 + i * 0.1, 14 + rnd() * 4, 0.96 + rnd() * 0.06, t.shade);
    // mèches de base qui recoupent l'ombre : la limite suit les mèches
    for (let i = 0; i < 3; i += 1) lock(-0.42 + i * 0.16 + rnd() * 0.04, 8 + rnd() * 4, 0.9 + rnd() * 0.1, t.base);
    // reflets : fines mèches claires à droite de la raie, qui s'arrêtent avant les pointes
    for (let i = 0; i < 6; i += 1) lock(0.12 + i * 0.12 + rnd() * 0.04, 5 + rnd() * 4, 0.5 + rnd() * 0.3, t.light);
    fill(ctx, 'M 498 252 L 503 252 L 502 296 L 499 296 Z', t.deep);
  });
}

/** Courts : contour en petites pointes, nuque en pointe, ombre à gauche et en bas. */
function shortHair(ctx, t, tie, rnd, gender) {
  const [cx, cy, rx, ry] = [500, 342, 71, 84];
  const at = (a, k = 1) => [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
  const n = 34;
  const [a0, a1] = [Math.PI * 0.94, Math.PI * 2.06];
  let d = `M ${at(a0).map((v) => v.toFixed(1)).join(' ')} `;
  for (let i = 1; i <= n; i += 1) {
    const a = a0 + ((a1 - a0) * i) / n;
    const mid = a - (a1 - a0) / (2 * n) + 0.05;
    const tip = at(mid, 1.07 + rnd() * 0.13);
    const ctl = at(mid - 0.04, 1.02);
    d += `Q ${ctl.map((v) => v.toFixed(1)).join(' ')} ${tip.map((v) => v.toFixed(1)).join(' ')} L ${at(a).map((v) => v.toFixed(1)).join(' ')} `;
  }
  // nuque : les côtés se resserrent, petites pointes vers le bas
  d += 'C 568 382 560 398 548 404 ';
  for (let i = 0; i < 6; i += 1) {
    const x = 548 - (i + 1) * 15.5;
    d += `L ${(x + 8).toFixed(1)} ${(416 + rnd() * 8).toFixed(1)} L ${x.toFixed(1)} ${(406 + rnd() * 3).toFixed(1)} `;
  }
  d += 'C 446 400 436 388 432 370 Z';
  fill(ctx, d, t.base);
  const whorl = [514, 300];
  clipped(ctx, d, () => {
    // ombre : côté gauche et bas, en mèches pointues vers l'épi
    const ring = (deg0, deg1, count, reach, width, color) => {
      for (let i = 0; i < count; i += 1) {
        const a = deg((deg0 + ((deg1 - deg0) * (i + rnd() * 0.7)) / count));
        const base = at(a, 1.2);
        fill(ctx, flame(base, lerp(base, whorl, reach[0] + rnd() * (reach[1] - reach[0])), width[0] + rnd() * (width[1] - width[0]), (rnd() - 0.5) * 10), color);
      }
    };
    ring(90, 250, 12, [0.42, 0.62], [30, 40], t.shade);
    ring(100, 200, 6, [0.22, 0.34], [26, 34], t.deep);
    ring(40, 95, 5, [0.25, 0.4], [22, 30], t.shade);
    ring(-80, 30, 9, [0.55, 0.8], [8, 14], t.light);
  });
  if (gender === 'fille') {
    fill(ctx, 'M 546 300 C 558 302 568 314 566 324 L 558 330 C 556 318 550 310 538 306 Z', tie);
    fill(ctx, 'M 548 302 C 552 304 556 308 558 312 L 554 314 C 552 310 549 307 545 305 Z', mix(tie, '#ffffff', 0.4));
  }
}

function bob(ctx, t, rnd) {
  longHair(ctx, t, rnd, { bottom: 444, spread: 86 });
}

function curls(ctx, t, rnd) {
  let d = '';
  const n = 18;
  const [cx, cy] = [500, 336];
  for (let i = 0; i <= n; i += 1) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const [x, y] = [cx + Math.cos(a) * 80, cy + Math.sin(a) * 82];
    if (i === 0) { d += `M ${x.toFixed(1)} ${y.toFixed(1)} `; continue; }
    const m = a - Math.PI / n;
    d += `Q ${(cx + Math.cos(m) * 98).toFixed(1)} ${(cy + Math.sin(m) * 100).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  d += 'Z';
  fill(ctx, d, t.base);
  clipped(ctx, d, () => {
    // ombre à gauche et en bas, boucles claires en haut à droite
    fill(ctx, 'M 380 300 C 400 380 460 440 560 450 L 380 450 Z', t.shade);
    fill(ctx, 'M 400 380 C 430 430 480 446 540 448 L 400 448 Z', t.deep);
    const spots = [[470, 292], [522, 282], [448, 332], [500, 320], [552, 324], [462, 376], [514, 366], [558, 376], [488, 408], [534, 404], [434, 382], [574, 340]];
    for (const [x, y] of spots) {
      const lit = x > 480 && y < 360;
      stroke(ctx, `M ${x - 10} ${y + 3} C ${x - 10} ${y - 11} ${x + 10} ${y - 11} ${x + 10} ${y} C ${x + 10} ${y + 9} ${x - 1} ${y + 10} ${x - 3} ${y + 3}`,
        lit ? t.light : t.deep, lit ? 4 : 3.5);
    }
  });
  void rnd;
}

/**
 * Cheveux longs ou queue de cheval de l'adulte qui dépassent sous l'enfant assis sur ses
 * épaules (repère de l'adulte) : mèches pointues sur le haut du dos.
 */
export function drawHairBelow(ctx, h, style) {
  const t = tones(h);
  const rnd = random(23);
  const top = 742;
  if (style === 'queue') {
    rope(ctx, [[500, top], [505, 772], [507, 802], [502, 832]], [30, 27, 17, 2], t.base);
    rope(ctx, [[488, top + 4], [491, 782], [494, 818]], [7, 7, 1], t.shade);
    rope(ctx, [[512, top + 8], [516, 786], [511, 818]], [3, 5, 1], t.light);
    return;
  }
  // masse de cheveux en éventail, finie par des pointes, ombrée sous l'enfant
  const mass = 'M 418 740 L 582 740 C 584 768 578 790 566 802 C 540 816 460 816 434 802 C 422 790 416 768 418 740 Z';
  for (let i = 0; i < 11; i += 1) {
    const x = 432 + i * 13.6 + rnd() * 4;
    const y = 790 + 12 * Math.sin((Math.PI * (i + 0.5)) / 11);
    fill(ctx, flame([x, y - 16], [x + (rnd() - 0.5) * 8, y + 10 + rnd() * 14], 20), i % 3 === 1 ? t.shade : t.base);
  }
  fill(ctx, mass, t.base);
  clipped(ctx, mass, () => {
    fill(ctx, 'M 410 736 L 590 736 L 590 760 C 540 772 460 772 410 760 Z', t.shade);
    for (let i = 0; i < 6; i += 1) {
      const x = 430 + i * 28 + rnd() * 8;
      fill(ctx, flame([x, 820], [x + (rnd() - 0.5) * 8, 768 + rnd() * 16], 18), t.shade);
    }
    for (let i = 0; i < 4; i += 1) {
      const x = 452 + i * 30 + rnd() * 8;
      fill(ctx, spindle([x, 754], [x + 6, 800 + rnd() * 10], 4), t.light);
    }
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
  else if (style === 'carre') bob(ctx, t, rnd);
  else if (style === 'long') longHair(ctx, t, rnd, { bottom: 490, spread: 90 });
  else if (style === 'court') shortHair(ctx, t, tie, rnd, gender);
  else if (style === 'rase') {
    // rasés : la peau du crâne reste visible sous des cheveux très courts
    sheen(ctx, HAIR_CAP, t.base, 0.55);
    clipped(ctx, HAIR_CAP, () => sheen(ctx, 'M 400 340 C 430 410 500 440 600 420 L 600 440 L 400 440 Z', t.deep, 0.35));
    sheen(ctx, 'M 520 268 C 548 276 566 300 568 330 C 556 306 540 288 520 278 Z', t.light, 0.4);
  } else curls(ctx, t, rnd);
}
