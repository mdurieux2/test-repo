// Les personnages, vus de dos : un adulte porte un enfant sur ses épaules (ou deux, un sur
// chaque épaule) et leur tient les mains. Une ou deux familles côte à côte.
// Repère d'un adulte : celui de l'affiche « 1 parent, 1 enfant » (1000 de large, centre en x = 500).
// Les formes symétriques sont décrites pour le côté gauche puis reproduites en miroir.

import {
  both, clipped, fill, limb, pt, sheen, stroke,
} from './draw.js';
import { LONG_HAIRS, drawHair, drawHairBelow } from './hair.js';

// ---------------------------------------------------------------- adulte

// pantalon : jusqu'aux genoux (visibles quand les familles sont plus petites, à deux parents)
const pants = (l, r) => `M ${l} 1230 L ${r} 1230 C ${r + 4} 1320 ${r + 10} 1420 ${r + 12} 1560 C ${r + 14} 1760 ${r + 12} 1960 ${r + 8} 2140 `
  + 'L 520 2140 C 518 1900 512 1600 500 1400 C 488 1600 482 1900 480 2140 '
  + `L ${1000 - r - 8} 2140 C ${1000 - r - 12} 1960 ${1000 - r - 14} 1760 ${1000 - r - 12} 1560 C ${1000 - r - 10} 1420 ${l - 4} 1320 ${l} 1230 Z`;

const ADULT = {
  papa: {
    torso: 'M 294 772 C 328 738 390 718 440 708 L 560 708 C 610 718 672 738 706 772 C 696 800 690 822 686 848 '
      + 'C 672 940 658 1040 654 1120 C 652 1180 656 1232 660 1270 C 622 1280 584 1274 544 1282 C 520 1278 480 1278 456 1282 '
      + 'C 416 1274 378 1280 340 1270 C 344 1232 348 1180 346 1120 C 342 1040 328 940 314 848 C 310 822 304 800 294 772 Z',
    pants: pants(348, 652),
    sideX: [314, 686],
  },
  maman: {
    torso: 'M 304 774 C 336 742 392 720 440 710 L 560 710 C 608 720 664 742 696 774 C 688 800 682 822 678 846 '
      + 'C 666 930 642 1010 638 1080 C 636 1150 650 1220 656 1268 C 620 1280 584 1274 544 1282 C 520 1278 480 1278 456 1282 '
      + 'C 416 1274 380 1280 344 1268 C 350 1220 364 1150 362 1080 C 358 1010 334 930 322 846 C 318 822 312 800 304 774 Z',
    pants: pants(352, 648),
    sideX: [322, 678],
  },
};

const ADULT_ARM = 'M 342 736 C 298 684 240 636 199 598 C 200 560 187 492 182 448 L 134 448 '
  + 'C 129 492 118 560 121 604 C 122 630 133 648 152 655 C 188 722 248 792 316 844 Z';
const ADULT_ARM_SHADE = 'M 199 598 C 200 560 187 492 182 448 L 170 448 C 174 494 184 556 186 602 C 190 612 196 618 204 622 Z';
const ADULT_ARM_UNDER = 'M 152 655 C 188 722 248 792 316 844 L 318 828 C 262 786 204 722 176 668 C 168 664 160 660 152 655 Z';
const ADULT_ELBOW = 'M 136 628 C 140 640 148 646 158 648';
const ADULT_SLEEVE = 'M 380 714 C 350 700 322 686 298 668 C 272 688 244 716 222 750 C 254 786 292 822 324 852 C 334 800 352 748 380 714 Z';
const ADULT_SLEEVE_HEM = 'M 296 670 C 272 688 246 714 224 748 L 236 756 C 256 726 280 700 304 682 Z';
const ADULT_SLEEVE_FOLD = 'M 236 756 C 264 760 290 778 316 812 C 290 790 264 776 240 770 Z';
const ADULT_SLEEVE_SHADOW = 'M 298 668 C 272 688 244 716 222 750 L 214 742 C 236 708 262 682 288 662 Z';
const ADULT_ARMHOLE = 'M 372 718 C 350 750 334 800 326 852';

/** Mains de l'adulte (repère de l'adulte) : elles tiennent les mains des enfants. */
export const ADULT_HANDS = [[158, 412], [842, 412]];
const FIST = 'M 132 458 C 121 436 119 408 125 392 C 129 378 141 371 152 374 C 162 367 177 369 183 380 '
  + 'C 193 386 197 400 195 414 C 199 428 195 446 185 458 Z';
const FIST_KNUCKLES = ['M 141 381 C 139 388 139 394 141 400', 'M 156 377 C 155 385 155 391 157 397', 'M 171 379 C 171 386 171 392 172 398'];
const THUMB = 'M 183 414 C 197 412 202 430 195 444 C 191 451 181 451 179 444 C 177 434 178 424 183 414 Z';

/** Coiffures de l'adulte qui dépassent sous l'enfant quand sa tête est cachée. */
export const HAIRS_BELOW = ['long', 'queue'];

// tête de l'adulte (visible quand il porte deux enfants) : la tête de l'enfant, agrandie
const ADULT_HEAD = { x: 500, y: 600, s: 1.04 };
const ADULT_NECK = 'M 462 650 L 538 650 L 546 716 C 522 730 478 730 454 716 Z';
const ADULT_NECK_SHADE = 'M 462 650 L 538 650 L 540 690 C 520 702 480 702 460 690 Z';
const ADULT_COLLAR = 'M 448 712 C 470 734 530 734 552 712 L 546 702 C 526 722 474 722 454 702 Z';

function drawAdultArms(ctx, a) {
  both(ctx, () => {
    fill(ctx, ADULT_ARM, a.skin.base);
    fill(ctx, ADULT_ARM_SHADE, a.skin.shade);
    fill(ctx, ADULT_ARM_UNDER, a.skin.shade);
    stroke(ctx, ADULT_ELBOW, a.skin.shade, 3);
    stroke(ctx, ADULT_ARM, a.skin.line, 2);
  });
}

function drawAdultBody(ctx, c, a, { headVisible, raised }) {
  const body = ADULT[a.kind] || ADULT.papa;
  const s = c.shirt;

  // pantalon
  fill(ctx, body.pants, c.pants.base);
  clipped(ctx, body.pants, () => {
    fill(ctx, 'M 336 1230 L 664 1230 L 664 1300 C 560 1290 440 1290 336 1300 Z', c.pants.shade);
    stroke(ctx, 'M 400 1320 C 410 1360 404 1420 410 1560 C 412 1700 404 1860 410 2140', c.pants.shade, 4);
    stroke(ctx, 'M 600 1320 C 590 1360 596 1420 590 1560 C 588 1700 596 1860 590 2140', c.pants.shade, 4);
    stroke(ctx, 'M 500 1300 L 500 1400', c.pants.shade, 4);
  });

  // dos : arrondi (côtés plus sombres), plis tirés par les bras levés
  const [left, right] = body.sideX;
  const g = ctx.createLinearGradient(left, 0, right, 0);
  g.addColorStop(0, s.deep);
  g.addColorStop(0.14, s.base);
  g.addColorStop(0.5, s.light);
  g.addColorStop(0.86, s.base);
  g.addColorStop(1, s.deep);
  fill(ctx, body.torso, g);
  clipped(ctx, body.torso, () => {
    both(ctx, () => {
      fill(ctx, 'M 316 852 C 366 900 404 954 438 1012 C 398 962 352 914 318 874 Z', s.shade);
      fill(ctx, 'M 326 940 C 370 986 404 1036 428 1090 C 396 1040 362 996 328 962 Z', s.shade);
      fill(ctx, 'M 350 1150 C 372 1190 384 1230 388 1282 L 372 1282 C 370 1236 362 1196 350 1150 Z', s.shade);
      fill(ctx, 'M 440 1200 C 446 1230 448 1256 446 1282 L 434 1282 C 436 1254 438 1230 440 1200 Z', s.shade);
    });
    fill(ctx, 'M 497 820 C 494 930 495 1030 500 1150 C 505 1030 506 930 503 820 Z', s.shade);
    if (headVisible) fill(ctx, 'M 430 700 C 450 740 550 740 570 700 L 570 760 C 540 776 460 776 430 760 Z', s.shade);
  });
  stroke(ctx, body.torso, s.deep, 2);

  if (raised) {
    both(ctx, () => {
      fill(ctx, ADULT_SLEEVE_SHADOW, a.skin.shade);
      fill(ctx, ADULT_SLEEVE, g);
      clipped(ctx, ADULT_SLEEVE, () => {
        fill(ctx, ADULT_SLEEVE_FOLD, s.shade);
        fill(ctx, ADULT_SLEEVE_HEM, s.shade);
      });
      stroke(ctx, ADULT_ARMHOLE, s.shade, 2.5);
    });
  }

  if (!headVisible && HAIRS_BELOW.includes(a.hair)) {
    drawHairBelow(ctx, a.hairColor, a.hair);
  }
}

function drawAdultHead(ctx, c, a) {
  fill(ctx, ADULT_NECK, a.skin.base);
  fill(ctx, ADULT_NECK_SHADE, a.skin.shade);
  fill(ctx, ADULT_COLLAR, c.trim);
  ctx.save();
  ctx.translate(ADULT_HEAD.x, ADULT_HEAD.y);
  ctx.scale(ADULT_HEAD.s, ADULT_HEAD.s);
  ctx.translate(-500, -344);
  drawHead(ctx, c, a, a.kind === 'maman' ? 'fille' : 'garcon');
  ctx.restore();
}

function drawFists(ctx, a) {
  both(ctx, () => {
    fill(ctx, FIST, a.skin.base);
    stroke(ctx, FIST, a.skin.line, 2);
    for (const d of FIST_KNUCKLES) stroke(ctx, d, a.skin.shade, 3);
    fill(ctx, THUMB, a.skin.base);
    stroke(ctx, THUMB, a.skin.shade, 2.5);
  });
}

// ---------------------------------------------------------------- bras de l'adulte (autres postures)

const ARM_UPPER = 178;
const ARM_FORE = 168;
/** Épaules de l'adulte, quand ses bras ne sont pas levés. */
const SHOULDERS = [[326, 794], [674, 794]];
/** Main ouverte vue de dos, doigts vers le haut, poignet en (0, 0). */
const HAND = 'M -17 4 C -20 -14 -21 -34 -17 -50 C -15 -60 -8 -64 -2 -62 C 4 -66 13 -62 16 -52 C 20 -36 20 -14 17 4 Z';
const HAND_LINES = ['M -8 -28 L -9 -54', 'M 1 -30 L 1 -58', 'M 9 -28 L 10 -52'];

const sub = (p, q) => [p[0] - q[0], p[1] - q[1]];
const unit = ([x, y]) => {
  const len = Math.hypot(x, y) || 1;
  return [x / len, y / len];
};
const along = (p, v, d) => [p[0] + v[0] * d, p[1] + v[1] * d];

/** Coude d'un bras qui va de l'épaule `S` à la main `H`, plié vers l'extérieur (`side` : -1 à gauche). */
function solveElbow(S, H, side) {
  const [dx, dy] = sub(H, S);
  const d = Math.min(Math.hypot(dx, dy), ARM_UPPER + ARM_FORE - 1);
  const base = Math.atan2(dy, dx);
  const a = Math.acos(Math.min(1, (ARM_UPPER ** 2 + d * d - ARM_FORE ** 2) / (2 * ARM_UPPER * d)));
  const [p, q] = [base + a, base - a].map((t) => [S[0] + Math.cos(t) * ARM_UPPER, S[1] + Math.sin(t) * ARM_UPPER]);
  return p[0] * side > q[0] * side ? p : q;
}

/**
 * Bras dont la main se pose sur `target` (centre de la main) : le poignet est placé pour que
 * la main, dans le prolongement de l'avant-bras, couvre ce point.
 */
function reach(S, target, side) {
  let wrist = [target[0] + side * 22, target[1] + 30];
  let elbow = solveElbow(S, wrist, side);
  for (let i = 0; i < 2; i += 1) {
    wrist = along(target, unit(sub(target, elbow)), -30);
    elbow = solveElbow(S, wrist, side);
  }
  return { S, E: elbow, W: wrist };
}

/** Peau du bras (dessinée avant le dos) : de l'épaule au poignet. */
function drawArmSkin(ctx, a, { S, E, W }) {
  const v = unit(sub(E, S));
  const arm = limb([along(S, v, -16), E, W], [33, 27, 20]);
  const n = [-v[1], v[0]];
  const shade = limb([along(along(S, v, -16), n, 9), along(E, n, 9), along(W, n, 7)], [28, 22, 15]);
  fill(ctx, arm, a.skin.base);
  clipped(ctx, arm, () => fill(ctx, shade, a.skin.shade));
  stroke(ctx, arm, a.skin.line, 2);
}

/** Manche courte sur le haut du bras (dessinée après le dos). */
function drawSleeve(ctx, c, { S, E }) {
  const v = unit(sub(E, S));
  const end = along(S, v, 72);
  const n = [-v[1] * 40, v[0] * 40];
  fill(ctx, limb([along(S, v, -26), end], [44, 40]), c.shirt.base);
  stroke(ctx, `M ${pt([end[0] + n[0], end[1] + n[1]])} L ${pt([end[0] - n[0], end[1] - n[1]])}`, c.shirt.shade, 9);
}

/** Main ouverte posée (sur le flanc d'un enfant, sur le dos de l'autre parent). */
function drawHand(ctx, a, { E, W }) {
  const [dx, dy] = unit(sub(W, E));
  ctx.save();
  ctx.translate(W[0], W[1]);
  ctx.rotate(Math.atan2(dx, -dy));
  fill(ctx, HAND, a.skin.base);
  stroke(ctx, HAND, a.skin.line, 2);
  for (const d of HAND_LINES) stroke(ctx, d, a.skin.shade, 2.5);
  ctx.restore();
}

// ---------------------------------------------------------------- enfant (repère de l'enfant)

const CHILD_TORSO = 'M 466 452 C 440 456 414 462 392 470 C 382 488 380 510 384 532 C 378 600 370 680 360 754 '
  + 'C 420 766 580 766 640 754 C 630 680 622 600 616 532 C 620 510 618 488 608 470 C 586 462 560 456 534 452 '
  + 'C 520 462 480 462 466 452 Z';
const CHILD_COLLAR = 'M 462 450 C 478 464 522 464 538 450 L 532 444 C 518 456 482 456 468 444 Z';
const CHILD_NECK = 'M 476 400 L 524 400 L 528 458 C 516 466 484 466 472 458 Z';
const CHILD_NECK_SHADE = 'M 476 400 L 524 400 L 525 428 C 512 436 488 436 475 428 Z';
const CHILD_HEAD = 'M 500 264 C 538 264 566 300 566 344 C 566 388 538 424 500 424 C 462 424 434 388 434 344 C 434 300 462 264 500 264 Z';
const CHILD_EAR = 'M 438 332 C 424 328 418 350 422 364 C 425 376 434 379 441 372 Z';
const CHILD_EAR_LINE = 'M 432 342 C 428 350 429 360 434 365';
/** Épaules de l'enfant et longueur de ses bras. */
const CHILD_SHOULDERS = [[400, 494], [600, 494]];
const CHILD_ARM_LENGTH = 232;

/** Tête vue de dos : crâne, oreilles et cheveux (repère de la tête de l'enfant). */
function drawHead(ctx, c, person, gender) {
  fill(ctx, CHILD_HEAD, person.skin.base);
  if (!['carre', 'boucles', 'long'].includes(person.hair)) {
    both(ctx, () => {
      fill(ctx, CHILD_EAR, person.skin.base);
      stroke(ctx, CHILD_EAR_LINE, person.skin.shade, 2.5);
    });
  }
  drawHair(ctx, person.hairColor, c.trim, person.hair, gender);
}

/** Géométrie d'un bras de l'enfant, de l'épaule à la main (le coude plie si la main est proche). */
function childArm(shoulder, hand, side) {
  const [dx, dy] = [hand[0] - shoulder[0], hand[1] - shoulder[1]];
  const len = Math.hypot(dx, dy) || 1;
  const u = [dx / len, dy / len];
  let n = [-u[1], u[0]];
  if (n[0] * side + n[1] < 0) n = [-n[0], -n[1]];
  const bend = Math.min(80, Math.max(7, Math.sqrt(Math.max(0, (CHILD_ARM_LENGTH / 2) ** 2 - (len / 2) ** 2))));
  const elbow = [shoulder[0] + dx * 0.5 + n[0] * bend, shoulder[1] + dy * 0.5 + n[1] * bend];
  const wrist = [hand[0] - u[0] * 10, hand[1] - u[1] * 10];
  const start = [shoulder[0] - u[0] * 8, shoulder[1] - u[1] * 8];
  const first = Math.hypot(elbow[0] - shoulder[0], elbow[1] - shoulder[1]) || 1;
  const v = [(elbow[0] - shoulder[0]) / first, (elbow[1] - shoulder[1]) / first];
  const across = [-v[1] * 27, v[0] * 27];
  const cuffAt = [shoulder[0] + v[0] * 48, shoulder[1] + v[1] * 48];
  return {
    arm: limb([start, elbow, wrist], [22, 16, 13]),
    under: limb([[start[0] + n[0] * 6, start[1] + n[1] * 6], [elbow[0] + n[0] * 6, elbow[1] + n[1] * 6], [wrist[0] + n[0] * 5, wrist[1] + n[1] * 5]], [17, 12, 9]),
    sleeve: limb([[shoulder[0] - v[0] * 16, shoulder[1] - v[1] * 16], [shoulder[0] + v[0] * 48, shoulder[1] + v[1] * 48]], [30, 27]),
    cuff: `M ${pt([cuffAt[0] + across[0], cuffAt[1] + across[1]])} L ${pt([cuffAt[0] - across[0], cuffAt[1] - across[1]])}`,
    hand: `M ${pt([hand[0] - 13, hand[1]])} C ${pt([hand[0] - 13, hand[1] - 18])} ${pt([hand[0] + 13, hand[1] - 18])} ${pt([hand[0] + 13, hand[1]])} `
      + `C ${pt([hand[0] + 13, hand[1] + 16])} ${pt([hand[0] - 13, hand[1] + 16])} ${pt([hand[0] - 13, hand[1]])} Z`,
  };
}

/**
 * Enfant assis sur des épaules (repère de l'enfant). `hands` : position de chaque main
 * dans ce repère ; `free` : mains visibles (sinon cachées par la main de l'adulte).
 */
function drawChild(ctx, c, k, { hands, free = [false, false] }, jersey) {
  const s = c.shirt;
  const arms = CHILD_SHOULDERS.map((shoulder, i) => childArm(shoulder, hands[i], i === 0 ? -1 : 1));

  for (const a of arms) {
    fill(ctx, a.arm, k.skin.base);
    clipped(ctx, a.arm, () => fill(ctx, a.under, k.skin.shade));
    stroke(ctx, a.arm, k.skin.line, 2);
  }

  // ombre portée de l'enfant sur le dos de l'adulte (et sur les cheveux qui dépassent)
  sheen(ctx, 'M 356 748 C 420 772 580 772 644 748 L 642 766 C 580 790 420 790 358 766 Z', '#000000', 0.2);

  const g = ctx.createLinearGradient(380, 0, 620, 0);
  g.addColorStop(0, s.deep);
  g.addColorStop(0.2, s.base);
  g.addColorStop(0.5, s.light);
  g.addColorStop(0.8, s.base);
  g.addColorStop(1, s.deep);
  fill(ctx, CHILD_TORSO, g);
  clipped(ctx, CHILD_TORSO, () => {
    both(ctx, () => {
      fill(ctx, 'M 388 534 C 420 566 444 604 458 650 C 436 610 410 578 386 556 Z', s.shade);
      fill(ctx, 'M 378 700 C 390 720 398 738 400 762 L 386 762 C 386 740 384 720 378 700 Z', s.shade);
    });
    fill(ctx, 'M 352 740 C 420 752 580 752 648 740 L 648 770 L 352 770 Z', s.shade);
    fill(ctx, 'M 462 450 C 478 476 522 476 538 450 Z', s.shade);
  });
  stroke(ctx, CHILD_TORSO, s.deep, 2);

  for (const a of arms) {
    fill(ctx, a.sleeve, g);
    stroke(ctx, a.cuff, c.trim, 6);
  }
  jersey('child', k, { shift: LONG_HAIRS.includes(k.hair) ? 24 : 0 });

  fill(ctx, CHILD_NECK, k.skin.base);
  fill(ctx, CHILD_NECK_SHADE, k.skin.shade);
  fill(ctx, CHILD_COLLAR, c.trim);
  drawHead(ctx, c, k, k.gender);

  arms.forEach((a, i) => {
    if (!free[i]) return;
    fill(ctx, a.hand, k.skin.base);
    stroke(ctx, a.hand, k.skin.line, 2);
  });
}

// ---------------------------------------------------------------- scène

/**
 * Familles sur l'affiche : position (x, y) et taille (s) de chaque adulte dans le repère
 * de l'affiche, nombre d'enfants qu'il porte et façon de les tenir :
 * `mains` (bras levés, il tient les mains de l'enfant), `cotes` (une main sur le flanc
 * de chaque enfant), `cote-taille` (une main sur le flanc de son enfant, l'autre bras
 * autour de la taille de l'autre parent, collé à lui).
 */
export const PLACEMENTS = {
  solo: [{ x: 500, y: 0, s: 1, kids: 1, hold: 'mains' }],
  'deux-enfants': [{ x: 500, y: -40, s: 1, kids: 2, hold: 'cotes' }],
  'deux-parents': [{ x: 380, y: 92, s: 0.7, kids: 1, hold: 'cote-taille' }, { x: 620, y: 92, s: 0.7, kids: 1, hold: 'cote-taille' }],
  'deux-parents-quatre-enfants': [{ x: 270, y: 96, s: 0.62, kids: 2, hold: 'cotes' }, { x: 730, y: 96, s: 0.62, kids: 2, hold: 'cotes' }],
};

/** Places des enfants dans le repère de l'adulte : au centre, ou un sur chaque épaule. */
const SEATS = {
  1: [{ x: 500, y: 0, s: 1 }],
  2: [{ x: 318, y: 166, s: 0.79 }, { x: 682, y: 166, s: 0.79 }],
};
/** Les deux enfants se donnent la main au-dessus de la tête de l'adulte. */
const JOINED_HANDS = [[494, 438], [506, 434]];
/** Bras levés de joie (repère de l'enfant). */
const CHEER = [[292, 300], [708, 300]];
/** Flanc de l'enfant où l'adulte pose la main (repère de l'enfant). */
const FLANK = [[384, 650], [616, 650]];

const toSeat = (seat, [x, y]) => [(x - seat.x) / seat.s + 500, (y - seat.y) / seat.s];
const fromSeat = (seat, [x, y]) => [seat.x + (x - 500) * seat.s, seat.y + y * seat.s];

function inFrame(ctx, { x, y, s }, draw) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.translate(-500, 0);
  draw();
  ctx.restore();
}

/** Mains de chaque enfant (repère de l'adulte) et mains visibles. */
function childHands(hold, count, i) {
  const held = (k) => [ADULT_HANDS[k][0] + (k === 0 ? 26 : -26), ADULT_HANDS[k][1] - 2];
  if (hold === 'mains') return { hands: [held(0), held(1)], free: [false, false] };
  const seat = SEATS[count][i];
  const cheer = CHEER.map((p) => fromSeat(seat, p));
  if (count === 1) return { hands: cheer, free: [true, true] };
  return i === 0
    ? { hands: [cheer[0], JOINED_HANDS[0]], free: [true, true] }
    : { hands: [JOINED_HANDS[1], cheer[1]], free: [true, true] };
}

/** Bras d'un parent autour de la taille de l'autre (repère de ce parent). */
function waistArm(group, partner, side) {
  const S = SHOULDERS[side < 0 ? 0 : 1];
  const E = [S[0] + side * 30, S[1] + (side > 0 ? 300 : 330)];
  // main posée au milieu du dos de l'autre parent
  const target = [(partner.x + side * 20 - group.x) / group.s + 500, E[1] + 14];
  const W = along(target, unit(sub(target, E)), -30);
  return { S, E, W };
}

/**
 * Dessine les familles. `c` : couleurs communes (maillots, pantalon, liseré) ;
 * `adults`, `children` : personnes avec leurs couleurs (peau, cheveux) ;
 * `jersey(kind, person, { shift })` écrit le prénom et le numéro dans le repère courant.
 */
export function drawScene(ctx, c, layout, adults, children, jersey) {
  const groups = PLACEMENTS[layout] || PLACEMENTS.solo;
  let next = 0;
  const waist = [];
  groups.forEach((group, g) => {
    const adult = adults[g];
    const kids = children.slice(next, next + group.kids);
    next += group.kids;
    const seats = SEATS[group.kids];
    const headVisible = group.kids === 2;
    const raised = group.hold === 'mains';
    // bras qui tiennent un enfant par le côté : [bras, côté]
    const sides = [];
    if (group.hold === 'cotes') {
      seats.forEach((seat, i) => sides.push([reach(SHOULDERS[i], fromSeat(seat, FLANK[i]), i === 0 ? -1 : 1), i]));
    } else if (group.hold === 'cote-taille') {
      const outer = g === 0 ? 0 : 1;
      sides.push([reach(SHOULDERS[outer], fromSeat(seats[0], FLANK[outer]), outer === 0 ? -1 : 1), outer]);
      const partner = groups[1 - g];
      waist.push({ group, adult, arm: waistArm(group, partner, g === 0 ? 1 : -1) });
    }
    inFrame(ctx, group, () => {
      if (raised) drawAdultArms(ctx, adult);
      for (const [arm] of sides) drawArmSkin(ctx, adult, arm);
      drawAdultBody(ctx, c, adult, { headVisible, raised });
      for (const [arm] of sides) drawSleeve(ctx, c, arm);
      const below = !headVisible && HAIRS_BELOW.includes(adult.hair);
      jersey('adult', adult, { shift: below ? 34 : 0 });
      if (headVisible) drawAdultHead(ctx, c, adult);
      kids.forEach((kid, i) => {
        const seat = seats[i];
        const { hands, free } = childHands(group.hold, group.kids, i);
        inFrame(ctx, seat, () => drawChild(ctx, c, kid, { hands: hands.map((h) => toSeat(seat, h)), free }, jersey));
      });
      if (raised) drawFists(ctx, adult);
      for (const [arm] of sides) drawHand(ctx, adult, arm);
    });
  });
  // les parents se tiennent par la taille : bras croisés dans le dos, main posée sur l'autre
  for (const { group, adult, arm } of waist.reverse()) {
    inFrame(ctx, group, () => {
      drawArmSkin(ctx, adult, arm);
      drawSleeve(ctx, c, arm);
      drawHand(ctx, adult, arm);
    });
  }
}
