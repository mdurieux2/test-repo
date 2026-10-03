// Dessin de l'affiche sur un canvas, à n'importe quelle taille (aperçu à l'écran ou
// fichier A3 en haute définition). Repère : 1000 unités de large, 1414 de haut (A4/A3).

import { drawScene } from './figures.js';
import {
  CUSTOM_DEFAULT, customTheme, findHair, findLayout, findSkin, findTheme, mix, shirtTones,
} from './themes.js';

export const POSTER_W = 1000;
export const POSTER_H = 1414;
/** Marge blanche autour de l'illustration (comme un passe-partout). */
export const MARGIN = 34;

export const FONT_TITLE = '"Archivo Black"';
export const FONT_JERSEY = 'Anton';

export const DEFAULTS = {
  layout: 'solo',
  title: 'PARIS',
  showTitle: true,
  children: [
    { name: 'AVA', number: '27', gender: 'fille', hair: 'queue', hairColor: 'blond', skin: 'clair' },
    { name: 'LÉO', number: '7', gender: 'garcon', hair: 'court', hairColor: 'chatain', skin: 'clair' },
    { name: 'JADE', number: '11', gender: 'fille', hair: 'couettes', hairColor: 'chatain-clair', skin: 'clair' },
    { name: 'TOM', number: '3', gender: 'garcon', hair: 'court', hairColor: 'blond', skin: 'clair' },
  ],
  adults: [
    { name: 'JULIEN', number: '9', kind: 'papa', hair: 'court', hairColor: 'chatain', skin: 'clair' },
    { name: 'CLAIRE', number: '8', kind: 'maman', hair: 'long', hairColor: 'blond', skin: 'clair' },
  ],
  theme: 'bleu-rouge',
  custom: { ...CUSTOM_DEFAULT },
  border: true,
  format: 'a4',
};

/** Charge les polices avant de dessiner (sinon le canvas utilise une police de secours). */
export function loadFonts() {
  if (typeof document === 'undefined' || !document.fonts) return Promise.resolve();
  return Promise.all([
    document.fonts.load(`100px ${FONT_TITLE}`, 'PARIS'),
    document.fonts.load(`100px ${FONT_JERSEY}`, 'AVA 27'),
  ]).catch(() => {});
}

/** Texte du maillot : majuscules, sans espaces en trop. */
export const jerseyName = (s) => String(s || '').trim().replace(/\s+/g, ' ').toLocaleUpperCase('fr-FR');
export const jerseyNumber = (s) => String(s ?? '').replace(/\D/g, '').slice(0, 2);

/** Générateur pseudo-aléatoire déterministe (même texture à l'écran et à l'impression). */
function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Réglages complets : ceux de l'utilisateur, complétés par le modèle de départ. */
export function withDefaults(settings = {}) {
  const list = (key) => DEFAULTS[key].map((person, i) => ({ ...person, ...(settings[key]?.[i] || {}) }));
  return {
    ...DEFAULTS,
    ...settings,
    children: list('children'),
    adults: list('adults'),
    custom: { ...DEFAULTS.custom, ...settings.custom },
  };
}

const skinOf = (id) => {
  const skin = findSkin(id);
  return { ...skin, line: mix(skin.shade, '#000000', 0.12) };
};

/** Couleurs communes (thème) et personnes de la composition, avec leurs couleurs. */
export function resolveScene(settings) {
  const theme = settings.theme === 'perso' ? customTheme({ ...CUSTOM_DEFAULT, ...settings.custom }) : findTheme(settings.theme);
  const layout = findLayout(settings.layout);
  const person = (p) => ({ ...p, skin: skinOf(p.skin), hairColor: findHair(p.hairColor) });
  return {
    layout,
    colors: {
      theme,
      shirt: shirtTones(theme.shirt),
      pants: { base: theme.pants, shade: mix(theme.pants, '#000000', 0.3) },
      trim: theme.textOutline,
    },
    adults: settings.adults.slice(0, layout.adults).map(person),
    children: settings.children.slice(0, layout.children).map(person),
  };
}

// ---------------------------------------------------------------- fond et titre

function drawBackground(ctx, theme, H) {
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, POSTER_W, H);
  const total = theme.stripe.reduce((sum, [, w]) => sum + w, 0);
  let x = (POSTER_W - total) / 2;
  for (const [color, w] of theme.stripe) {
    ctx.fillStyle = color;
    ctx.fillRect(x, 0, w + 0.5, H);
    x += w;
  }
  // grain léger, comme une affiche imprimée
  const rnd = random(11);
  for (let i = 0; i < 2600; i += 1) {
    const [px, py, r] = [rnd() * POSTER_W, rnd() * H, 0.4 + rnd() * 1.6];
    ctx.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Taille de police pour que `text` tienne en largeur, avec une hauteur de capitale donnée. */
function fitFont(ctx, family, text, capHeight, maxWidth, spacing = 0) {
  ctx.font = `100px ${family}`;
  const capRatio = (ctx.measureText('H').actualBoundingBoxAscent || 72) / 100;
  let size = capHeight / capRatio;
  ctx.font = `${size}px ${family}`;
  const width = spacedWidth(ctx, text, size * spacing);
  if (width > maxWidth) size *= maxWidth / width;
  return { size, cap: size * capRatio };
}

function spacedWidth(ctx, text, spacing) {
  const chars = [...text];
  return chars.reduce((sum, ch) => sum + ctx.measureText(ch).width, 0) + spacing * Math.max(0, chars.length - 1);
}

/** Écrit `text` centré sur `cx`, lettre par lettre avec un espacement donné. */
function spacedText(ctx, text, cx, baseline, spacing, paint) {
  const chars = [...text];
  let x = cx - spacedWidth(ctx, text, spacing) / 2;
  for (const ch of chars) {
    paint(ch, x, baseline);
    x += ctx.measureText(ch).width + spacing;
  }
}

/** Coupe un titre trop long en deux lignes équilibrées. */
function titleLines(ctx, title) {
  const words = title.split(' ');
  if (words.length < 2) return [title];
  ctx.font = `100px ${FONT_TITLE}`;
  let best = null;
  for (let i = 1; i < words.length; i += 1) {
    const lines = [words.slice(0, i).join(' '), words.slice(i).join(' ')];
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (!best || widest < best.widest) best = { lines, widest };
  }
  return best.lines;
}

/** Zone du titre, en haut de l'affiche. */
const TITLE_BOX = { x: 70, y: 62, w: 860, h: 168 };

function drawTitle(ctx, theme, rawTitle, scale) {
  const title = jerseyName(rawTitle);
  if (!title) return;
  const box = TITLE_BOX;
  ctx.font = `100px ${FONT_TITLE}`;
  let lines = [title];
  let fit = fitFont(ctx, FONT_TITLE, title, 138, box.w);
  if (fit.cap < 92) {
    const two = titleLines(ctx, title);
    if (two.length === 2) {
      const fits = two.map((l) => fitFont(ctx, FONT_TITLE, l, 68, box.w));
      const size = Math.min(...fits.map((f) => f.size));
      if (fits[0].cap * (size / fits[0].size) > fit.cap) {
        lines = two;
        fit = { size, cap: fits[0].cap * (size / fits[0].size) };
      }
    }
  }
  const gap = fit.cap * 0.42;
  const blockH = lines.length * fit.cap + (lines.length - 1) * gap;
  const top = box.y + (box.h - blockH) / 2;

  // le titre est dessiné à part, puis « usé » (éraflures), puis posé sur l'affiche
  const pad = 12;
  const off = document.createElement('canvas');
  off.width = Math.ceil((box.w + pad * 2) * scale);
  off.height = Math.ceil((box.h + pad * 2) * scale);
  const o = off.getContext('2d');
  o.scale(scale, scale);
  o.translate(pad - box.x, pad - box.y);
  o.font = `${fit.size}px ${FONT_TITLE}`;
  o.textAlign = 'center';
  o.lineJoin = 'round';
  lines.forEach((line, i) => {
    const baseline = top + fit.cap * (i + 1) + gap * i;
    if (theme.titleOutline) {
      o.strokeStyle = theme.titleOutline;
      o.lineWidth = fit.size * 0.08;
      o.strokeText(line, 500, baseline);
    }
    o.fillStyle = theme.titleColor;
    o.fillText(line, 500, baseline);
  });
  distress(o, box, random(7));
  ctx.drawImage(off, box.x - pad, box.y - pad, box.w + pad * 2, box.h + pad * 2);
}

/** Éraflures et petits manques dans les lettres, façon impression usée. */
function distress(o, box, rnd) {
  o.globalCompositeOperation = 'destination-out';
  o.fillStyle = '#000';
  o.strokeStyle = '#000';
  o.lineCap = 'round';
  for (let i = 0; i < 260; i += 1) {
    const [x, y] = [box.x + rnd() * box.w, box.y + rnd() * box.h];
    o.beginPath();
    o.arc(x, y, 0.4 + rnd() ** 4 * 3, 0, Math.PI * 2);
    o.fill();
  }
  for (let i = 0; i < 45; i += 1) {
    const [x, y, len] = [box.x + rnd() * box.w, box.y + rnd() * box.h, 6 + rnd() * 30];
    o.lineWidth = 0.5 + rnd() * 1.2;
    o.beginPath();
    o.moveTo(x, y);
    o.lineTo(x + len, y + (rnd() - 0.5) * 6);
    o.stroke();
  }
  // un « coup » plus marqué, comme sur le A de l'original
  for (let i = 0; i < 5; i += 1) {
    const [x, y] = [box.x + rnd() * box.w, box.y + box.h * (0.2 + rnd() * 0.6)];
    o.beginPath();
    o.moveTo(x, y);
    for (let k = 0; k < 7; k += 1) o.lineTo(x + (rnd() - 0.3) * 14, y + (rnd() - 0.5) * 14);
    o.closePath();
    o.fill();
  }
  o.globalCompositeOperation = 'source-over';
}

// ---------------------------------------------------------------- maillots

function jerseyLine(ctx, text, { cy, cap, maxWidth, spacing, fill, outline, outlineRatio }) {
  if (!text) return;
  const fit = fitFont(ctx, FONT_JERSEY, text, cap, maxWidth, spacing);
  ctx.save();
  ctx.font = `${fit.size}px ${FONT_JERSEY}`;
  ctx.textAlign = 'left';
  ctx.lineJoin = 'round';
  const baseline = cy + fit.cap / 2;
  const gap = fit.size * spacing;
  ctx.strokeStyle = outline;
  ctx.lineWidth = fit.size * outlineRatio;
  spacedText(ctx, text, 500, baseline, gap, (ch, x, y) => ctx.strokeText(ch, x, y));
  ctx.fillStyle = fill;
  spacedText(ctx, text, 500, baseline, gap, (ch, x, y) => ctx.fillText(ch, x, y));
  ctx.restore();
}

/** Prénom et numéro sur le dos d'un adulte ou d'un enfant (dans son repère). */
function drawJersey(ctx, theme, kind, person, { shift = 0 } = {}) {
  const style = { fill: theme.text, outline: theme.textOutline };
  if (kind === 'child') {
    jerseyLine(ctx, jerseyName(person.name), { ...style, cy: 498 + shift, cap: 40, maxWidth: 196, spacing: 0.06, outlineRatio: 0.1 });
    jerseyLine(ctx, jerseyNumber(person.number), { ...style, cy: 610 + shift, cap: 130 - shift / 2, maxWidth: 200, spacing: 0.02, outlineRatio: 0.06 });
  } else {
    jerseyLine(ctx, jerseyName(person.name), { ...style, cy: 846 + shift, cap: 50, maxWidth: 270, spacing: 0.06, outlineRatio: 0.1 });
    jerseyLine(ctx, jerseyNumber(person.number), { ...style, cy: 978 + shift, cap: 168, maxWidth: 250, spacing: 0.02, outlineRatio: 0.055 });
  }
}

// ---------------------------------------------------------------- affiche complète

/**
 * Dessine l'affiche. `scale` : pixels par unité (largeur en pixels / 1000).
 * Pour un rendu par bandes : `height` = hauteur totale de l'affiche en pixels,
 * `offsetY` = haut de la bande en pixels (le canvas ne contient que la bande).
 */
export function drawPoster(ctx, settings, scale, { height = ctx.canvas.height, offsetY = 0 } = {}) {
  const s = withDefaults(settings);
  const scene = resolveScene(s);
  const { theme } = scene.colors;
  const H = height / scale;

  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, 0, -offsetY);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, POSTER_W, H);
  const m = s.border ? MARGIN : 0;
  ctx.beginPath();
  ctx.rect(m, m, POSTER_W - 2 * m, H - 2 * m);
  ctx.clip();

  drawBackground(ctx, theme, H);
  // rendu par bandes : le titre n'est dessiné que dans les bandes qui le contiennent
  const [bandTop, bandBottom] = [offsetY / scale, (offsetY + ctx.canvas.height) / scale];
  if (s.showTitle && bandTop < TITLE_BOX.y + TITLE_BOX.h + 20 && bandBottom > TITLE_BOX.y - 20) drawTitle(ctx, theme, s.title, scale);
  drawScene(ctx, scene.colors, scene.layout.id, scene.adults, scene.children,
    (kind, person, options) => drawJersey(ctx, theme, kind, person, options));
  ctx.restore();
}
