// Données des tracés de « Écris au doigt » : graphisme, chiffres, capitales (bâton) et
// minuscules attachées (cursive scolaire).
//
// Chaque glyphe est une liste de traits, dans l'ORDRE où on les trace à l'école ; chaque trait
// est une liste de points [x, y] dans un carré 0–100 (y vers le bas), dans le SENS du geste :
//   - les traits verticaux vont de haut en bas, les horizontaux de gauche à droite ;
//   - les ronds commencent en haut et tournent vers la gauche (sens inverse des aiguilles
//     d'une montre) ;
//   - la cursive part de la ligne d'écriture avec un trait d'attaque et repart vers la droite.
// Les points sont générés par de petites fonctions (segment, arc, courbe) avec un espacement
// régulier d'environ 5 unités.

const STEP = 5;

const round1 = (v) => Math.round(v * 10) / 10;
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** Rééchantillonne une ligne brisée dense : points réguliers (≈ STEP), extrémités conservées. */
function resample(dense) {
  const lengths = [0];
  for (let i = 1; i < dense.length; i++) lengths.push(lengths[i - 1] + dist(dense[i - 1], dense[i]));
  const total = lengths.at(-1);
  const n = Math.max(1, Math.round(total / STEP));
  const out = [];
  let j = 0;
  for (let k = 0; k <= n; k++) {
    const target = (total * k) / n;
    while (j < dense.length - 2 && lengths[j + 1] < target) j++;
    const span = lengths[j + 1] - lengths[j] || 1;
    const t = Math.min(1, Math.max(0, (target - lengths[j]) / span));
    out.push([
      round1(dense[j][0] + (dense[j + 1][0] - dense[j][0]) * t),
      round1(dense[j][1] + (dense[j + 1][1] - dense[j][1]) * t),
    ]);
  }
  return out;
}

/** Segment de a à b. */
export function segment(a, b) {
  return resample([a, b]);
}

/**
 * Arc d'ellipse de centre (cx, cy), de rayons rx et ry, de l'angle a0 à l'angle a1 (en degrés :
 * 0 = à droite, 90 = en haut). Un angle qui augmente tourne vers la gauche (sens inverse des
 * aiguilles d'une montre) ; un angle qui diminue tourne vers la droite.
 */
export function arc(cx, cy, rx, ry, a0, a1) {
  const count = Math.max(8, Math.ceil(Math.abs(a1 - a0) / 2));
  const dense = Array.from({ length: count + 1 }, (_, i) => {
    const a = ((a0 + ((a1 - a0) * i) / count) * Math.PI) / 180;
    return [cx + rx * Math.cos(a), cy - ry * Math.sin(a)];
  });
  return resample(dense);
}

/** Courbe lisse (Catmull-Rom centripète) qui passe par tous les points donnés. */
export function curve(...pts) {
  if (pts.length < 3) return resample(pts);
  const first = [2 * pts[0][0] - pts[1][0], 2 * pts[0][1] - pts[1][1]];
  const last = [2 * pts.at(-1)[0] - pts.at(-2)[0], 2 * pts.at(-1)[1] - pts.at(-2)[1]];
  const all = [first, ...pts, last];
  const dense = [pts[0]];
  const lerp = (p, q, t0, t1, t) => {
    const k = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
    return [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
  };
  for (let i = 1; i < all.length - 2; i++) {
    const [p0, p1, p2, p3] = [all[i - 1], all[i], all[i + 1], all[i + 2]];
    const t0 = 0;
    const t1 = t0 + Math.sqrt(dist(p0, p1)) + 1e-6;
    const t2 = t1 + Math.sqrt(dist(p1, p2)) + 1e-6;
    const t3 = t2 + Math.sqrt(dist(p2, p3)) + 1e-6;
    const samples = Math.max(6, Math.ceil(dist(p1, p2)));
    for (let s = 1; s <= samples; s++) {
      const t = t1 + ((t2 - t1) * s) / samples;
      const a1 = lerp(p0, p1, t0, t1, t);
      const a2 = lerp(p1, p2, t1, t2, t);
      const a3 = lerp(p2, p3, t2, t3, t);
      const b1 = lerp(a1, a2, t0, t2, t);
      const b2 = lerp(a2, a3, t1, t3, t);
      dense.push(lerp(b1, b2, t1, t2, t));
    }
  }
  return resample(dense);
}

/** Un trait fait de plusieurs morceaux qui se suivent (les angles sont gardés tels quels). */
export function stroke(...parts) {
  const out = [...parts[0]];
  for (const part of parts.slice(1)) {
    const gap = dist(out.at(-1), part[0]);
    if (gap > 0.6) out.push(...segment(out.at(-1), part[0]).slice(1, -1));
    out.push(...(gap > 0.6 ? part : part.slice(1)));
  }
  return out;
}

/** Un point (le point du i, du j) : un tout petit trait qu'il suffit de toucher. */
const dot = (x, y) => [[x, y], [x, y + 1.5]];

// Raccourcis : un trait d'un seul segment, une ligne brisée.
const line = (a, b) => segment(a, b);
const polyline = (...pts) => stroke(...pts.slice(1).map((p, i) => segment(pts[i], p)));

// ---------------------------------------------------------------- Graphisme

/** Une rangée de vagues (sinusoïde) de gauche à droite. */
function wave(y, amplitude, x0, x1, periods) {
  const dense = Array.from({ length: 121 }, (_, i) => {
    const t = i / 120;
    return [x0 + (x1 - x0) * t, y - amplitude * Math.sin(t * periods * 2 * Math.PI)];
  });
  return resample(dense);
}

/** Des ponts (arcs vers le haut) ou des coupes (arcs vers le bas), reliés, de gauche à droite. */
function arches(n, x0, x1, yBase, height, up) {
  const w = (x1 - x0) / n;
  const parts = [];
  for (let i = 0; i < n; i++) {
    const cx = x0 + w * (i + 0.5);
    // ponts : on monte, on tourne vers la droite et on redescend ; coupes : on descend et on remonte
    parts.push(up ? arc(cx, yBase, w / 2, height, 180, 0) : arc(cx, yBase, w / 2, height, 180, 360));
  }
  return stroke(...parts);
}

/** Des boucles montantes reliées (comme des l), de gauche à droite, tournant vers la gauche. */
function loops(n, x0, x1, yBase, height) {
  const w = (x1 - x0) / n;
  const dense = [];
  for (let i = 0; i <= n * 60; i++) {
    const t = (i / 60) * 2 * Math.PI; // un tour par boucle
    const x = x0 + (w * t) / (2 * Math.PI) + w * 0.56 * Math.sin(t);
    const y = yBase - (height / 2) * (1 - Math.cos(t));
    dense.push([x, y]);
  }
  return resample(dense);
}

export const GRAPHISMES = {
  verticaux: {
    text: 'Trace les traits du haut vers le bas.',
    strokes: [20, 40, 60, 80].map((x) => line([x, 15], [x, 85])),
  },
  horizontaux: {
    text: 'Trace les traits de gauche à droite.',
    strokes: [18, 39, 61, 82].map((y) => line([15, y], [85, y])),
  },
  obliques: {
    text: 'Trace les traits penchés, du haut vers le bas.',
    strokes: [12, 37, 62].map((x) => line([x, 15], [x + 26, 85])),
  },
  zigzags: {
    text: 'Trace les pointes, comme des dents.',
    strokes: [polyline([10, 68], [20, 32], [30, 68], [40, 32], [50, 68], [60, 32], [70, 68], [80, 32], [90, 68])],
  },
  vagues: {
    text: 'Trace les vagues.',
    strokes: [wave(32, 10, 10, 90, 2), wave(70, 10, 10, 90, 2)],
  },
  ponts: {
    text: 'Trace les ponts.',
    strokes: [arches(3, 10, 90, 68, 30, true)],
  },
  coupes: {
    text: 'Trace les coupes.',
    strokes: [arches(3, 10, 90, 34, 30, false)],
  },
  boucles: {
    text: 'Trace les boucles.',
    strokes: [loops(4, 12, 88, 70, 40)],
  },
  rond: {
    text: 'Trace le rond, en tournant vers la gauche.',
    strokes: [arc(50, 50, 34, 34, 90, 450)],
  },
};

// ---------------------------------------------------------------- Chiffres (de 12 à 88)

export const CHIFFRES = {
  0: [arc(50, 50, 22, 38, 90, 450)],
  1: [polyline([34, 32], [54, 12], [54, 88])],
  2: [stroke(arc(49, 31, 20, 19, 160, -25), line([67.1, 39], [28, 88]), line([28, 88], [74, 88]))],
  3: [stroke(arc(48, 30, 19, 18, 155, -90), arc(48, 68, 22, 20, 90, -155))],
  4: [polyline([54, 12], [26, 62], [78, 62]), line([64, 30], [64, 88])],
  5: [stroke(line([35, 12], [33, 47.4]), arc(48, 65, 22, 23, 130, -145)), line([35, 12], [71, 12])],
  6: [curve([67, 18], [58, 12], [46, 13], [36, 22], [30, 38], [29, 56], [31, 72], [39, 84], [51, 88], [63, 85], [70, 74], [70, 62], [63, 52], [51, 48], [39, 52], [31, 63])],
  7: [polyline([26, 12], [74, 12], [40, 88])],
  8: [curve([64, 20], [56, 12], [44, 12], [35, 19], [35, 31], [43, 42], [50, 48], [60, 55], [67, 66], [66, 80], [56, 88], [44, 88], [34, 80], [33, 66], [40, 55], [50, 48], [58, 42], [65, 31], [64, 20])],
  9: [stroke(arc(48, 32, 19, 20, 20, 380), line([65.9, 25.2], [63, 88]))],
};

// ---------------------------------------------------------------- Capitales bâton (de 12 à 88)

export const CAPITALES = {
  A: [line([50, 12], [22, 88]), line([50, 12], [78, 88]), line([31.6, 62], [68.4, 62])],
  B: [line([28, 12], [28, 88]),
    stroke(line([28, 12], [48, 12]), arc(48, 30, 18, 18, 90, -90), line([48, 48], [28, 48]),
      line([28, 48], [51, 48]), arc(51, 68, 22, 20, 90, -90), line([51, 88], [28, 88]))],
  C: [arc(52, 50, 28, 38, 45, 315)],
  D: [line([28, 12], [28, 88]), stroke(line([28, 12], [40, 12]), arc(40, 50, 34, 38, 90, -90), line([40, 88], [28, 88]))],
  E: [line([30, 12], [30, 88]), line([30, 12], [72, 12]), line([30, 50], [64, 50]), line([30, 88], [72, 88])],
  F: [line([32, 12], [32, 88]), line([32, 12], [72, 12]), line([32, 50], [64, 50])],
  G: [stroke(arc(52, 50, 28, 38, 45, 345), line([79, 59.8], [79, 52])), line([56, 52], [79, 52])],
  H: [line([26, 12], [26, 88]), line([74, 12], [74, 88]), line([26, 50], [74, 50])],
  I: [line([50, 12], [50, 88])],
  J: [stroke(line([62, 12], [62, 68]), arc(44, 68, 18, 20, 0, -160))],
  K: [line([30, 12], [30, 88]), polyline([72, 12], [31, 52], [74, 88])],
  L: [polyline([32, 12], [32, 88], [72, 88])],
  M: [line([22, 12], [22, 88]), polyline([22, 12], [50, 62], [78, 12], [78, 88])],
  N: [line([26, 12], [26, 88]), line([26, 12], [74, 88]), line([74, 12], [74, 88])],
  O: [arc(50, 50, 30, 38, 90, 450)],
  P: [line([30, 12], [30, 88]), stroke(line([30, 12], [50, 12]), arc(50, 32, 22, 20, 90, -90), line([50, 52], [30, 52]))],
  Q: [arc(50, 50, 30, 38, 90, 450), line([58, 66], [80, 90])],
  R: [line([30, 12], [30, 88]),
    stroke(line([30, 12], [50, 12]), arc(50, 32, 21, 20, 90, -90), line([50, 52], [32, 52]), line([32, 52], [74, 88]))],
  S: [stroke(arc(50, 31, 22, 19, 30, 270), arc(50, 69, 24, 19, 90, -150))],
  T: [line([24, 12], [76, 12]), line([50, 12], [50, 88])],
  U: [stroke(line([26, 12], [26, 62]), arc(50, 62, 24, 26, 180, 360), line([74, 62], [74, 12]))],
  V: [polyline([22, 12], [50, 88], [78, 12])],
  W: [polyline([12, 12], [30, 88], [50, 24], [70, 88], [88, 12])],
  X: [line([24, 12], [76, 88]), line([76, 12], [24, 88])],
  Y: [line([24, 12], [50, 50]), polyline([76, 12], [50, 50], [50, 88])],
  Z: [polyline([24, 12], [76, 12], [24, 88], [76, 88])],
};

// ---------------------------------------------------------------- Minuscules attachées

// Les modèles sont dessinés avec une ligne de base à 66 et une hauteur des minuscules de 26
// (boucles hautes jusqu'à 6, jambages jusqu'à 95). Chaque lettre est ensuite agrandie pour remplir
// le carré (une petite lettre comme le « s » devient plus grande que le « l »), avec ses lignes.
const MODEL_LINES = { base: 66, x: 40 };

/** Outils de tracé d'une lettre, agrandie (scale) puis déplacée (dx, dy). */
function writer(scale = 1, dx = 0, dy = 0) {
  const at = ([x, y]) => [x * scale + dx, y * scale + dy];
  return {
    curve: (...pts) => curve(...pts.map(at)),
    arc: (cx, cy, rx, ry, a0, a1) => arc(...at([cx, cy]), rx * scale, ry * scale, a0, a1),
    line: (a, b) => segment(at(a), at(b)),
    dot: (x, y) => dot(...at([x, y]).map(round1)),
    y: (y) => round1(y * scale + dy),
  };
}

/** La lettre centrée dans le carré, aussi grande que possible (au plus 1,7 fois le modèle). */
function fitLetter(model) {
  const points = model(writer()).flat();
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const scale = Math.min(1.7, 84 / (x1 - x0), 84 / (y1 - y0));
  const w = writer(scale, 50 - ((x0 + x1) / 2) * scale, 50 - ((y0 + y1) / 2) * scale);
  return { strokes: model(w), lines: { base: w.y(MODEL_LINES.base), x: w.y(MODEL_LINES.x) } };
}

// Morceaux communs : le rond du a, du d, du g et du q (il part d'en haut à droite et tourne vers
// la gauche), et la boucle des lettres qui descendent sous la ligne (g, j, y).
const ROUND = [[56, 40], [49, 38.5], [42, 41], [37, 47], [36, 56], [39, 63], [45, 66.5], [51, 65], [55, 58], [56.5, 49]];
const LOWER_LOOP = [[57, 86], [54, 93], [48, 95], [43, 91], [45, 83], [51, 75], [58, 69]];

const CURSIVE_MODELS = {
  a: (w) => [stroke(
    w.curve([24, 64], [32, 59], [41, 50], [49, 43], [56, 40]),
    w.curve(...ROUND, [57, 40]),
    w.curve([57, 40], [57, 58], [59, 64], [64, 66.5], [70, 64], [76, 58]),
  )],
  b: (w) => [stroke(
    w.curve([24, 64], [33, 59], [42, 50], [50, 36], [54, 21], [53, 11], [48, 6], [43, 10], [41.5, 22], [41.5, 40], [41.5, 56], [44, 64], [50, 67], [56, 64], [59, 56], [58, 47], [54, 41.5], [49.5, 41], [49.5, 44.5], [55, 45], [62, 43], [69, 41]),
  )],
  c: (w) => [stroke(
    w.curve([28, 64], [36, 58], [45, 50], [52, 43], [56, 41]),
    w.curve([56, 41], [55, 39], [50, 38.5], [43, 41], [38, 47], [37, 56], [40, 63], [47, 66.5], [56, 66], [63, 62], [68, 57]),
  )],
  d: (w) => [stroke(
    w.curve([24, 64], [32, 59], [41, 50], [49, 43], [56, 40]),
    w.curve(...ROUND, [57.5, 38], [58, 28], [58, 20]),
    w.curve([58, 20], [58, 40], [58, 58], [60, 64], [65, 66.5], [71, 64], [77, 58]),
  )],
  e: (w) => [stroke(
    w.curve([28, 64], [36, 59], [45, 53], [52, 47], [54, 42], [51, 39], [45, 40], [41, 46], [40, 55], [43, 62], [50, 66.5], [58, 65], [65, 60], [69, 56]),
  )],
  f: (w) => [stroke(
    w.curve([26, 64], [34, 58], [42, 48], [48, 34], [51, 20], [50, 10], [46, 6], [42, 9], [41, 20], [41, 40], [41, 60], [41, 80], [42, 92]),
    w.curve([42, 92], [45, 95], [48, 91], [48, 82], [45, 72], [44, 66]),
    w.curve([44, 66], [52, 63], [60, 61], [68, 57]),
  )],
  g: (w) => [stroke(
    w.curve([24, 64], [32, 59], [41, 50], [49, 43], [56, 40]),
    w.curve(...ROUND, [57, 40]),
    w.curve([57, 40], [57, 60], ...LOWER_LOOP, [65, 64], [72, 59]),
  )],
  h: (w) => [stroke(
    w.curve([22, 64], [31, 59], [40, 50], [48, 36], [52, 21], [51, 11], [46, 6], [41, 10], [39.5, 22], [39.5, 44], [39.5, 66]),
    w.curve([39.5, 66], [40, 56], [43, 47], [48, 41.5], [54, 41], [58, 46], [59, 53], [59, 60], [61, 65], [66, 66.5], [72, 63], [77, 58]),
  )],
  i: (w) => [stroke(
    w.curve([32, 64], [38, 58], [44, 49], [48, 40]),
    w.curve([48, 40], [48, 50], [48, 58], [50, 64], [55, 66.5], [61, 65], [67, 59]),
  ), w.dot(48, 28)],
  j: (w) => [stroke(
    w.curve([34, 64], [40, 58], [46, 49], [50, 40]),
    w.curve([50, 40], [50, 60], [50, 78], [49, 88], [46, 94], [40, 95], [36, 90], [38, 82], [45, 74], [52, 68], [60, 63], [68, 58]),
  ), w.dot(50, 28)],
  k: (w) => [stroke(
    w.curve([22, 64], [31, 59], [40, 50], [48, 36], [52, 21], [51, 11], [46, 6], [41, 10], [39.5, 22], [39.5, 44], [39.5, 66]),
    w.curve([39.5, 66], [40, 56], [44, 47], [50, 41.5], [56, 42], [57, 47], [52, 52], [44, 54]),
    w.curve([44, 54], [50, 56], [54, 61], [57, 65], [63, 66.5], [70, 63], [75, 58]),
  )],
  l: (w) => [stroke(
    w.curve([24, 64], [33, 59], [42, 50], [50, 36], [54, 21], [53, 11], [48, 6], [43, 10], [41.5, 22], [41.5, 40], [41.5, 56], [44, 64], [50, 67], [58, 65], [65, 60], [69, 56]),
  )],
  m: (w) => [stroke(
    w.curve([14, 66], [16, 56], [19, 46], [23, 41], [27, 41.5], [29, 47], [29.5, 56], [29.5, 66]),
    w.curve([29.5, 66], [30, 56], [32, 47], [36, 41.5], [41, 41], [45, 45], [46, 52], [46, 66]),
    w.curve([46, 66], [46.5, 56], [48.5, 47], [52.5, 41.5], [57.5, 41], [61.5, 45], [62.5, 52], [62.5, 60], [64.5, 65], [69.5, 66.5], [75, 63], [80, 58]),
  )],
  n: (w) => [stroke(
    w.curve([22, 66], [24, 56], [27, 46], [31, 41], [35, 41.5], [37, 47], [37.5, 56], [37.5, 66]),
    w.curve([37.5, 66], [38, 56], [40, 47], [44, 41.5], [49, 41], [53, 45], [54, 52], [54, 60], [56, 65], [61, 66.5], [67, 63], [72, 58]),
  )],
  o: (w) => [stroke(
    w.curve([26, 64], [33, 59], [41, 51], [48, 44.5], [51.5, 42]),
    w.arc(46, 53, 11, 13, 60, 450),
    w.curve([46, 40], [53, 40], [60, 41.5], [66, 44], [71, 44]),
  )],
  p: (w) => [stroke(
    w.curve([26, 64], [31, 56], [35, 45], [38, 32]),
    w.curve([38, 32], [38, 50], [38, 70], [38, 95]),
    w.curve([38, 95], [38, 70], [38, 50]),
    w.curve([38, 50], [42, 43], [49, 40], [56, 43], [59, 51], [57, 60], [50, 65.5], [42, 65]),
    w.curve([42, 65], [50, 67], [58, 66], [65, 61], [69, 57]),
  )],
  q: (w) => [stroke(
    w.curve([24, 64], [32, 59], [41, 50], [49, 43], [56, 40]),
    w.curve(...ROUND, [57, 40]),
    w.curve([57, 40], [57, 60], [57, 80], [57, 94]),
    w.curve([57, 94], [61, 89], [63, 80], [61, 71], [64, 66], [70, 62], [75, 58]),
  )],
  r: (w) => [stroke(
    w.curve([28, 64], [35, 57], [41, 47], [44, 38]),
    w.curve([44, 38], [46, 42], [50, 43], [54, 41], [57, 40]),
    w.curve([57, 40], [57.5, 46], [57.5, 58], [59.5, 64], [64.5, 66.5], [70, 64], [75, 58]),
  )],
  s: (w) => [stroke(
    w.curve([30, 64], [37, 57], [44, 48], [49, 38]),
    w.curve([49, 38], [53, 45], [58, 52], [59, 59], [56, 64.5], [49, 67], [42, 65], [39, 62]),
    w.curve([39, 62], [47, 66.5], [56, 67], [63, 64], [68, 59]),
  )],
  t: (w) => [stroke(
    w.curve([34, 64], [40, 56], [45, 44], [48, 30], [49, 20]),
    w.curve([49, 20], [49, 40], [49, 58], [51, 64], [56, 66.5], [62, 65], [68, 59]),
  ), w.line([39, 40], [60, 40])],
  u: (w) => [stroke(
    w.curve([20, 64], [26, 58], [31, 48], [34, 40]),
    w.curve([34, 40], [34, 50], [34, 58], [37, 64.5], [44, 66.5], [51, 63], [55, 54], [57, 40]),
    w.curve([57, 40], [57, 50], [57, 58], [59, 64], [64, 66.5], [70, 64], [76, 58]),
  )],
  v: (w) => [stroke(
    w.curve([22, 66], [24, 56], [27, 46], [31, 41], [35, 41.5], [37, 47], [38, 56], [41, 63.5], [47, 66.5], [53, 63], [56, 55], [57, 46], [56, 40]),
    w.curve([56, 40], [54, 44], [58, 45.5], [64, 43.5], [71, 43]),
  )],
  w: (w) => [stroke(
    w.curve([14, 66], [16, 56], [19, 46], [23, 41], [27, 41.5], [29, 47], [30, 56], [33, 63.5], [38, 66.5], [43, 63], [46, 55], [47, 40]),
    w.curve([47, 40], [47, 48], [48, 57], [51, 63.5], [56, 66.5], [62, 63], [65, 55], [66, 46], [65, 40]),
    w.curve([65, 40], [63, 44], [67, 45.5], [73, 43.5], [80, 43]),
  )],
  x: (w) => [stroke(
    w.curve([26, 64], [33, 56], [39, 47], [44, 41.5], [49, 41], [52, 46], [53, 55], [55, 63], [60, 66.5], [67, 64], [73, 58]),
  ), w.line([62, 42], [42, 65])],
  y: (w) => [stroke(
    w.curve([20, 64], [26, 58], [31, 48], [34, 40]),
    w.curve([34, 40], [34, 50], [34, 58], [37, 64.5], [44, 66.5], [51, 63], [55, 54], [57, 40]),
    w.curve([57, 40], [57, 60], ...LOWER_LOOP, [65, 64], [72, 59]),
  )],
  z: (w) => [stroke(
    w.curve([26, 64], [31, 52], [38, 43], [45, 40], [52, 40], [57, 44], [56, 50], [50, 57], [44, 63], [41, 66]),
    w.curve([41, 66], [48, 64], [55, 66], [58, 72], [58, 82], [55, 91], [48, 95], [43, 91], [46, 83], [53, 75], [60, 69], [67, 63], [72, 58]),
  )],
};

const FITTED = Object.fromEntries(Object.entries(CURSIVE_MODELS).map(([letter, model]) => [letter, fitLetter(model)]));

/** Les minuscules attachées : les traits de chaque lettre… */
export const CURSIVE = Object.fromEntries(Object.entries(FITTED).map(([letter, f]) => [letter, f.strokes]));

/** … et ses lignes d'écriture : ligne de base et ligne de hauteur des minuscules. */
export const WRITING_LINES = Object.fromEntries(Object.entries(FITTED).map(([letter, f]) => [letter, f.lines]));

/** Tous les jeux de glyphes, par catégorie. */
export const GLYPHS = { graphisme: GRAPHISMES, chiffres: CHIFFRES, capitales: CAPITALES, cursive: CURSIVE };

/**
 * Les lettres d'un prénom, telles qu'on les écrit en capitales : sans accent (É → E),
 * seulement les lettres (« Eva-Rose » → EVAROSE).
 */
export function nameLetters(name) {
  return capitalName(name).replace(/[^A-Z]/g, '');
}

/** Le prénom en capitales, sans accent, en gardant tirets et espaces (« Éva-Rose » → EVA-ROSE). */
export function capitalName(name) {
  return String(name ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/œ/gi, 'oe').replace(/æ/gi, 'ae').toUpperCase().trim();
}

/** Aire signée d'un trait fermé (y vers le bas) : négative quand on tourne vers la gauche. */
export function signedArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    sum += x1 * y2 - x2 * y1;
  }
  return sum / 2;
}
