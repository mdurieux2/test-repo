// Les personnages, vus de dos : un adulte porte un enfant sur ses épaules (ou deux, un sur
// chaque épaule) et leur tient les mains. Une ou deux familles côte à côte.
// Repère d'un adulte : celui de l'affiche « 1 parent, 1 enfant » (1000 de large, centre en x = 500).
// Les formes symétriques sont décrites pour le côté gauche puis reproduites en miroir.

const cache = new Map();
/** Path2D mémorisé (le même tracé sert à chaque rendu). */
function path(d) {
  if (!cache.has(d)) cache.set(d, new Path2D(d));
  return cache.get(d);
}

function fill(ctx, d, color) {
  ctx.fillStyle = color;
  ctx.fill(path(d));
}

function stroke(ctx, d, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(path(d));
}

/** Reflet : couleur claire à moitié transparente. */
function sheen(ctx, d, color, alpha = 0.55) {
  ctx.save();
  ctx.globalAlpha = alpha;
  fill(ctx, d, color);
  ctx.restore();
}

/** Dessine `draw` à gauche, puis en miroir à droite. */
function both(ctx, draw) {
  draw();
  ctx.save();
  ctx.translate(1000, 0);
  ctx.scale(-1, 1);
  draw();
  ctx.restore();
}

/** Remplit `d` en limitant les dessins de `inside` à cette forme. */
function clipped(ctx, d, inside) {
  ctx.save();
  ctx.clip(path(d));
  inside();
  ctx.restore();
}

// ---------------------------------------------------------------- outils

const f1 = (n) => n.toFixed(1);
const pt = ([x, y]) => `${f1(x)} ${f1(y)}`;

/**
 * Membre arrondi (bras) : passe par `points`, avec une demi-largeur par point.
 * Bout arrondi au dernier point, départ caché sous la manche.
 */
function limb(points, widths) {
  const n = points.length;
  const normals = points.map((_, i) => {
    const [a, b] = [points[Math.max(0, i - 1)], points[Math.min(n - 1, i + 1)]];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
  });
  const side = (k) => points.map((p, i) => [p[0] + normals[i][0] * widths[i] * k, p[1] + normals[i][1] * widths[i] * k]);
  const [left, right] = [side(1), side(-1)];
  const smooth = (list) => {
    let d = '';
    for (let i = 1; i < list.length - 1; i += 1) {
      const m = [(list[i][0] + list[i + 1][0]) / 2, (list[i][1] + list[i + 1][1]) / 2];
      d += `Q ${pt(list[i])} ${pt(m)} `;
    }
    return `${d}L ${pt(list.at(-1))} `;
  };
  const [end, prev] = [points[n - 1], points[n - 2]];
  const len = Math.hypot(end[0] - prev[0], end[1] - prev[1]) || 1;
  const tip = [end[0] + ((end[0] - prev[0]) / len) * widths[n - 1] * 1.3, end[1] + ((end[1] - prev[1]) / len) * widths[n - 1] * 1.3];
  const back = [...right].reverse();
  return `M ${pt(left[0])} ${smooth(left)}Q ${pt(tip)} ${pt(right[n - 1])} ${smooth(back)}Z`;
}

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

// cheveux longs de l'adulte : dépassent sous l'enfant, sur le haut du dos
const HAIR_BELOW = 'M 418 748 C 416 772 424 794 438 808 C 452 804 462 814 476 816 C 488 824 500 818 512 822 '
  + 'C 526 816 538 820 552 810 C 566 806 578 792 582 770 C 584 760 584 752 582 748 Z';
const HAIR_BELOW_SHADE = 'M 418 748 L 582 748 C 582 760 580 768 578 774 C 530 784 470 784 422 774 C 420 766 418 758 418 748 Z';
const HAIR_BELOW_STRANDS = ['M 442 770 C 444 784 446 796 448 806', 'M 470 776 C 472 790 476 802 482 812',
  'M 500 778 C 500 794 502 806 504 816', 'M 530 776 C 530 790 528 802 524 812', 'M 558 770 C 558 784 556 794 552 804'];
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

function drawAdultBody(ctx, c, a, { headVisible }) {
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

  both(ctx, () => {
    fill(ctx, ADULT_SLEEVE_SHADOW, a.skin.shade);
    fill(ctx, ADULT_SLEEVE, g);
    clipped(ctx, ADULT_SLEEVE, () => {
      fill(ctx, ADULT_SLEEVE_FOLD, s.shade);
      fill(ctx, ADULT_SLEEVE_HEM, s.shade);
    });
    stroke(ctx, ADULT_ARMHOLE, s.shade, 2.5);
  });

  if (!headVisible && HAIRS_BELOW.includes(a.hair)) {
    fill(ctx, HAIR_BELOW, a.hairColor.base);
    clipped(ctx, HAIR_BELOW, () => fill(ctx, HAIR_BELOW_SHADE, a.hairColor.shade));
    for (const d of HAIR_BELOW_STRANDS) stroke(ctx, d, a.hairColor.shade, 2.4);
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

/** Cheveux tirés en arrière (queue, chignon, couettes) : la nuque reste visible. */
const HAIR_CAP = 'M 500 256 C 550 256 576 298 574 346 C 573 376 566 396 556 408 C 542 414 524 412 512 422 '
  + 'C 505 428 495 428 488 422 C 476 412 458 414 444 408 C 434 396 427 376 426 346 C 424 298 450 256 500 256 Z';
/** Cheveux qui couvrent les épaules : les inscriptions du maillot de l'enfant descendent un peu. */
export const LONG_HAIRS = ['long'];

/**
 * Cheveux, dans le repère de la tête de l'enfant (centre 500, 344). `h` : couleurs des cheveux,
 * `tie` : couleur de l'élastique ou de la barrette.
 */
function drawHair(ctx, h, tie, style, gender) {
  const strands = (list, color = h.shade, w = 2.4) => list.forEach((d) => stroke(ctx, d, color, w));
  const cap = (to) => {
    fill(ctx, HAIR_CAP, h.base);
    strands([`M 452 398 C 448 350 462 310 ${to[0] - 10} ${to[1] + 8}`, `M 476 412 C 474 362 480 320 ${to[0] - 4} ${to[1] + 12}`,
      `M 548 398 C 552 350 538 310 ${to[0] + 10} ${to[1] + 8}`, `M 524 412 C 526 362 520 320 ${to[0] + 4} ${to[1] + 12}`,
      `M 436 350 C 442 320 458 300 ${to[0] - 14} ${to[1] + 4}`, `M 564 350 C 558 320 542 300 ${to[0] + 14} ${to[1] + 4}`]);
    sheen(ctx, 'M 450 300 C 464 276 484 266 496 268 C 478 282 464 302 456 326 Z', h.light);
  };

  if (style === 'queue') {
    cap([494, 282]);
    // queue de cheval haute : part du sommet, monte un peu et retombe le long de l'arrière de la tête
    const tail = 'M 480 286 C 468 252 494 226 524 232 C 560 240 566 296 552 346 C 542 384 526 420 508 456 '
      + 'C 500 420 504 384 506 350 C 508 318 502 298 480 286 Z';
    clipped(ctx, HAIR_CAP, () => {
      ctx.save();
      ctx.translate(-7, 5);
      sheen(ctx, tail, h.shade, 0.7);
      ctx.restore();
    });
    fill(ctx, tail, h.base);
    clipped(ctx, tail, () => fill(ctx, 'M 548 250 C 572 300 560 380 526 456 L 580 456 L 580 250 Z', h.shade));
    strands(['M 496 262 C 520 238 552 252 548 306 C 544 350 530 392 516 436', 'M 520 256 C 540 280 538 330 530 370',
      'M 506 300 C 516 330 516 370 510 420']);
    stroke(ctx, 'M 508 242 C 530 238 546 256 546 284', h.light, 3.5);
    fill(ctx, 'M 478 288 C 476 276 490 268 504 273 C 511 278 508 290 497 294 C 488 296 480 294 478 288 Z', tie);
  } else if (style === 'chignon') {
    cap([500, 280]);
    const bun = 'M 500 220 C 528 220 542 240 542 260 C 542 284 522 296 500 296 C 478 296 458 284 458 260 C 458 240 472 220 500 220 Z';
    fill(ctx, bun, h.base);
    clipped(ctx, bun, () => fill(ctx, 'M 458 270 C 480 292 522 292 542 270 L 542 300 L 458 300 Z', h.shade));
    strands(['M 472 248 C 486 228 520 228 530 252', 'M 470 268 C 484 282 516 284 530 268', 'M 486 258 C 494 248 510 250 514 262']);
    stroke(ctx, 'M 478 236 C 488 228 500 226 512 228', h.light, 3.5);
    fill(ctx, 'M 468 290 C 480 302 520 302 532 290 L 530 302 C 516 310 484 310 470 302 Z', tie);
  } else if (style === 'couettes') {
    both(ctx, () => {
      const tail = 'M 442 306 C 412 296 388 318 390 354 C 392 388 404 426 398 470 C 426 440 436 398 436 364 C 436 342 440 328 446 330 Z';
      fill(ctx, tail, h.base);
      strands(['M 428 312 C 406 326 402 362 408 398 C 412 422 410 444 404 460', 'M 420 342 C 418 370 424 400 420 428']);
    });
    fill(ctx, HAIR_CAP, h.base);
    fill(ctx, 'M 498 260 L 502 260 L 503 418 L 497 418 Z', h.shade);
    strands(['M 452 400 C 446 370 446 340 448 318', 'M 476 412 C 470 380 466 344 452 318', 'M 494 262 C 476 270 458 288 450 312',
      'M 548 400 C 554 370 554 340 552 318', 'M 524 412 C 530 380 534 344 548 318', 'M 506 262 C 524 270 542 288 550 312']);
    fill(ctx, 'M 456 284 C 466 272 480 266 490 266 C 476 280 466 296 460 314 Z', h.light);
    both(ctx, () => fill(ctx, 'M 432 304 C 442 298 454 304 456 314 C 458 328 446 336 436 332 C 426 326 424 312 432 304 Z', tie));
  } else if (style === 'carre') {
    const bob = 'M 500 252 C 554 252 580 300 578 352 C 578 392 584 422 590 440 C 562 448 532 444 500 446 '
      + 'C 468 444 438 448 410 440 C 416 422 422 392 422 352 C 420 300 446 252 500 252 Z';
    fill(ctx, bob, h.base);
    strands(['M 500 262 C 470 300 450 360 442 438', 'M 500 262 C 486 310 476 370 472 442', 'M 500 262 C 514 310 524 370 528 442',
      'M 500 262 C 530 300 550 360 558 438', 'M 472 268 C 446 300 434 360 428 434', 'M 528 268 C 554 300 566 360 572 434']);
    sheen(ctx, 'M 446 310 C 472 294 528 294 554 310 C 528 302 472 302 446 310 Z', h.light);
  } else if (style === 'long') {
    // longs et lisses : tombent sur les épaules
    const hair = 'M 500 252 C 554 252 582 298 580 350 C 580 400 588 446 596 480 C 576 490 550 486 532 492 '
      + 'C 520 488 510 494 500 490 C 490 494 480 488 468 492 C 450 486 424 490 404 480 C 412 446 420 400 420 350 '
      + 'C 418 298 446 252 500 252 Z';
    fill(ctx, hair, h.base);
    clipped(ctx, hair, () => sheen(ctx, 'M 400 452 C 460 470 540 470 600 452 L 600 500 L 400 500 Z', h.shade, 0.5));
    strands(['M 498 258 C 470 296 452 380 444 476', 'M 498 262 C 484 320 476 400 472 484', 'M 502 262 C 516 320 524 400 528 484',
      'M 502 258 C 530 296 548 380 556 476', 'M 494 256 C 452 280 434 380 426 470', 'M 506 256 C 548 280 566 380 574 470']);
    stroke(ctx, 'M 500 254 L 500 296', h.shade, 3);
    sheen(ctx, 'M 446 300 C 462 280 480 270 494 266 C 476 284 464 304 458 330 Z', h.light);
    sheen(ctx, 'M 554 300 C 538 280 520 270 506 266 C 524 284 536 304 542 330 Z', h.light, 0.35);
  } else if (style === 'rase') {
    // rasés : la peau du crâne reste visible sous des cheveux très courts
    sheen(ctx, HAIR_CAP, h.base, 0.55);
    sheen(ctx, 'M 452 300 C 466 280 484 270 496 270 C 480 284 468 300 462 320 Z', h.light, 0.35);
  } else if (style === 'court') {
    // courts : petites mèches en pointe sur le dessus, nuque dégagée
    const [cx, cy, rx, ry, n] = [500, 344, 71, 85, 22];
    const at = (t, k = 1) => [cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k].map((v) => v.toFixed(1)).join(' ');
    const [t0, t1] = [Math.PI * 0.93, Math.PI * 2.07];
    let crop = `M ${at(t0)} `;
    const tips = [1.05, 1.08, 1.04, 1.07, 1.06, 1.09, 1.04, 1.07, 1.08, 1.05, 1.07, 1.04, 1.08, 1.06, 1.05, 1.08, 1.04, 1.07, 1.06, 1.08, 1.05, 1.06];
    for (let i = 0; i < n; i += 1) {
      const [a, b] = [t0 + ((t1 - t0) * i) / n, t0 + ((t1 - t0) * (i + 1)) / n];
      crop += `L ${at((a + b) / 2 + 0.03, tips[i])} L ${at(b)} `;
    }
    crop += 'C 566 390 552 402 538 404 L 530 412 L 520 406 L 510 414 L 500 408 L 490 414 L 480 406 L 470 412 L 462 404 '
      + 'C 448 402 434 390 431 368 Z';
    fill(ctx, crop, h.base);
    clipped(ctx, crop, () => sheen(ctx, 'M 430 380 C 470 396 530 396 570 380 L 570 420 L 430 420 Z', h.shade, 0.6));
    strands(['M 508 298 C 488 296 470 310 462 330', 'M 508 298 C 528 300 542 316 548 336', 'M 508 298 C 502 326 500 350 502 372',
      'M 508 298 C 482 312 470 338 466 362', 'M 508 298 C 534 314 544 340 542 364', 'M 508 298 C 512 284 500 274 486 276',
      'M 476 398 L 472 384', 'M 494 402 L 492 388', 'M 516 402 L 518 388', 'M 536 398 L 540 384']);
    fill(ctx, 'M 504 294 C 510 290 516 294 514 300 C 512 304 504 304 504 294 Z', h.shade);
    sheen(ctx, 'M 454 302 C 466 282 484 272 496 272 C 480 286 468 302 462 322 Z', h.light);
    if (gender === 'fille') fill(ctx, 'M 548 300 C 560 304 568 316 566 326 L 558 330 C 556 318 550 310 540 306 Z', tie);
  } else {
    // bouclés : contour en festons et petites boucles
    let d = '';
    const n = 18;
    for (let i = 0; i <= n; i += 1) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const [x, y] = [500 + Math.cos(a) * 80, 336 + Math.sin(a) * 82];
      if (i === 0) { d += `M ${x.toFixed(1)} ${y.toFixed(1)} `; continue; }
      const m = a - Math.PI / n;
      d += `Q ${(500 + Math.cos(m) * 98).toFixed(1)} ${(336 + Math.sin(m) * 100).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)} `;
    }
    fill(ctx, `${d}Z`, h.base);
    const curls = [[470, 292], [520, 284], [448, 332], [500, 322], [552, 326], [462, 374], [512, 366], [556, 378], [486, 406], [532, 406], [434, 382], [572, 342]];
    for (const [x, y] of curls) stroke(ctx, `M ${x - 9} ${y + 2} C ${x - 9} ${y - 10} ${x + 9} ${y - 10} ${x + 9} ${y} C ${x + 9} ${y + 8} ${x - 1} ${y + 9} ${x - 3} ${y + 2}`, h.shade, 3);
    stroke(ctx, 'M 462 278 C 476 268 494 264 506 266', h.light, 4);
  }
}


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
 * de l'affiche, et nombre d'enfants qu'il porte.
 */
export const PLACEMENTS = {
  solo: [{ x: 500, y: 0, s: 1, kids: 1 }],
  'deux-enfants': [{ x: 500, y: -40, s: 1, kids: 2 }],
  'deux-parents': [{ x: 270, y: 136, s: 0.62, kids: 1 }, { x: 730, y: 136, s: 0.62, kids: 1 }],
  'deux-parents-quatre-enfants': [{ x: 270, y: 96, s: 0.62, kids: 2 }, { x: 730, y: 96, s: 0.62, kids: 2 }],
};

/** Places des enfants dans le repère de l'adulte : au centre, ou un sur chaque épaule. */
const SEATS = {
  1: [{ x: 500, y: 0, s: 1 }],
  2: [{ x: 318, y: 166, s: 0.79 }, { x: 682, y: 166, s: 0.79 }],
};
/** Les deux enfants se donnent la main au-dessus de la tête de l'adulte. */
const JOINED_HANDS = [[494, 438], [506, 434]];

const toSeat = (seat, [x, y]) => [(x - seat.x) / seat.s + 500, (y - seat.y) / seat.s];

function inFrame(ctx, { x, y, s }, draw) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.translate(-500, 0);
  draw();
  ctx.restore();
}

/**
 * Dessine les familles. `c` : couleurs communes (maillots, pantalon, liseré) ;
 * `adults`, `children` : personnes avec leurs couleurs (peau, cheveux) ;
 * `jersey(kind, person, { shift })` écrit le prénom et le numéro dans le repère courant.
 */
export function drawScene(ctx, c, layout, adults, children, jersey) {
  const groups = PLACEMENTS[layout] || PLACEMENTS.solo;
  let next = 0;
  groups.forEach((group, g) => {
    const adult = adults[g];
    const kids = children.slice(next, next + group.kids);
    next += group.kids;
    const seats = SEATS[group.kids];
    const headVisible = group.kids === 2;
    inFrame(ctx, group, () => {
      drawAdultArms(ctx, adult);
      drawAdultBody(ctx, c, adult, { headVisible });
      const below = !headVisible && HAIRS_BELOW.includes(adult.hair);
      jersey('adult', adult, { shift: below ? 34 : 0 });
      if (headVisible) drawAdultHead(ctx, c, adult);
      kids.forEach((kid, i) => {
        const seat = seats[i];
        const hands = group.kids === 1
          ? ADULT_HANDS.map((h) => [h[0] + (h[0] < 500 ? 26 : -26), h[1] - 2])
          : [i === 0 ? [ADULT_HANDS[0][0] + 26, ADULT_HANDS[0][1] - 2] : JOINED_HANDS[1], i === 0 ? JOINED_HANDS[0] : [ADULT_HANDS[1][0] - 26, ADULT_HANDS[1][1] - 2]];
        const free = group.kids === 1 ? [false, false] : [i === 1, i === 0];
        inFrame(ctx, seat, () => drawChild(ctx, c, kid, { hands: hands.map((h) => toSeat(seat, h)), free }, jersey));
      });
      drawFists(ctx, adult);
    });
  });
}
