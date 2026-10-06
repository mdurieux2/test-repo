// Outils de dessin communs aux personnages et aux cheveux (canvas, tracés SVG mémorisés).

const cache = new Map();
/** Path2D mémorisé (le même tracé sert à chaque rendu). */
export function path(d) {
  if (!cache.has(d)) cache.set(d, new Path2D(d));
  return cache.get(d);
}

export function fill(ctx, d, color) {
  ctx.fillStyle = color;
  ctx.fill(path(d));
}

export function stroke(ctx, d, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(path(d));
}

/** Reflet : couleur claire à moitié transparente. */
export function sheen(ctx, d, color, alpha = 0.55) {
  ctx.save();
  ctx.globalAlpha = alpha;
  fill(ctx, d, color);
  ctx.restore();
}

/** Dessine `draw` à gauche, puis en miroir à droite. */
export function both(ctx, draw) {
  draw();
  ctx.save();
  ctx.translate(1000, 0);
  ctx.scale(-1, 1);
  draw();
  ctx.restore();
}

/** Remplit `d` en limitant les dessins de `inside` à cette forme. */
export function clipped(ctx, d, inside) {
  ctx.save();
  ctx.clip(path(d));
  inside();
  ctx.restore();
}

const f1 = (n) => n.toFixed(1);
export const pt = ([x, y]) => `${f1(x)} ${f1(y)}`;

/**
 * Membre arrondi (bras) : passe par `points`, avec une demi-largeur par point.
 * Bout arrondi au dernier point, départ caché sous la manche.
 */
export function limb(points, widths) {
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

/** Générateur pseudo-aléatoire déterministe : même dessin à l'écran et à l'impression. */
export function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const normal = (a, b) => {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
};

/**
 * Mèche effilée : large de `width` à sa base, pointue au bout, courbée de `bend`
 * (décalage du milieu, positif vers la gauche du sens base → pointe).
 */
export function flame(base, tip, width, bend = 0) {
  const n = normal(base, tip);
  const h = width / 2;
  const mid = [(base[0] + tip[0]) / 2 + n[0] * bend, (base[1] + tip[1]) / 2 + n[1] * bend];
  const a = [base[0] + n[0] * h, base[1] + n[1] * h];
  const b = [base[0] - n[0] * h, base[1] - n[1] * h];
  const ca = [mid[0] + n[0] * h * 0.75, mid[1] + n[1] * h * 0.75];
  const cb = [mid[0] - n[0] * h * 0.75, mid[1] - n[1] * h * 0.75];
  return `M ${pt(a)} Q ${pt(ca)} ${pt(tip)} Q ${pt(cb)} ${pt(b)} Z`;
}

/** Mèche pointue aux deux bouts (fuseau), de `a` à `b`, large de `width` au milieu. */
export function spindle(a, b, width, bend = 0) {
  const n = normal(a, b);
  const mid = [(a[0] + b[0]) / 2 + n[0] * bend, (a[1] + b[1]) / 2 + n[1] * bend];
  return `M ${pt(a)} Q ${pt([mid[0] + n[0] * width, mid[1] + n[1] * width])} ${pt(b)} `
    + `Q ${pt([mid[0] - n[0] * width, mid[1] - n[1] * width])} ${pt(a)} Z`;
}
