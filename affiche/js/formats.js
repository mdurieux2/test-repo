// Formats d'impression (A4, A3 et grands formats jusqu'à 40 × 60 cm) et qualités (dpi).

export const FORMATS = {
  a4: { id: 'a4', name: 'A4', widthMm: 210, heightMm: 297, hint: '21 × 29,7 cm' },
  a3: { id: 'a3', name: 'A3', widthMm: 297, heightMm: 420, hint: '29,7 × 42 cm' },
  '30x40': { id: '30x40', name: '30 × 40 cm', widthMm: 300, heightMm: 400 },
  '40x50': { id: '40x50', name: '40 × 50 cm', widthMm: 400, heightMm: 500 },
  '40x60': { id: '40x60', name: '40 × 60 cm', widthMm: 400, heightMm: 600 },
};

/** Qualités proposées : points par pouce à la taille réelle de l'affiche. */
export const QUALITIES = {
  standard: { id: 'standard', name: 'Standard', dpi: 150, hint: 'fichier léger, pour partager' },
  hd: { id: 'hd', name: 'HD', dpi: 300, hint: 'qualité imprimeur' },
  uhd: { id: 'uhd', name: 'Ultra HD', dpi: 600, hint: 'très haute définition' },
};

export const findFormat = (id) => FORMATS[id] || FORMATS.a4;
export const findQuality = (id) => QUALITIES[id] || QUALITIES.hd;

/** Résolution d'impression standard (300 dpi), utilisée pour imprimer depuis le téléphone. */
export const TARGET_DPI = 300;

/** Les iPhone et iPad refusent les canvas de plus de 16 777 216 pixels. */
export const IOS_MAX_PIXELS = 16_000_000;

/** Pixels d'une bande de dessin : l'image est dessinée et compressée bande par bande. */
export const BAND_PIXELS = 4_000_000;

const MM_PER_INCH = 25.4;
const PT_PER_INCH = 72;

/** Hauteur de l'affiche dans le repère de dessin (1000 unités de large). */
export function posterHeight(formatId) {
  const f = findFormat(formatId);
  return (1000 * f.heightMm) / f.widthMm;
}

/** Taille de l'image exportée, en pixels, et sa résolution (réduite si `maxPixels` l'exige). */
export function exportSize(formatId, { dpi = TARGET_DPI, maxPixels = Infinity } = {}) {
  const f = findFormat(formatId);
  const [w, h] = [f.widthMm / MM_PER_INCH, f.heightMm / MM_PER_INCH];
  const best = Math.min(dpi, Math.floor(Math.sqrt(maxPixels / (w * h))));
  return { width: Math.round(w * best), height: Math.round(h * best), dpi: best };
}

/**
 * Découpe une image de `width` × `height` pixels en bandes horizontales d'au plus
 * `maxPixels` pixels, de hauteur multiple de 8 (blocs du JPEG), sauf la dernière.
 */
export function bands(width, height, maxPixels = BAND_PIXELS) {
  const step = Math.max(8, Math.floor(maxPixels / width / 8) * 8);
  const list = [];
  for (let top = 0; top < height; top += step) list.push({ top, height: Math.min(step, height - top) });
  return list;
}

/** Taille de la page PDF, en points (1/72 de pouce). */
export function pageSizePt(formatId) {
  const f = findFormat(formatId);
  const pt = (mm) => Math.round((mm / MM_PER_INCH) * PT_PER_INCH * 100) / 100;
  return { width: pt(f.widthMm), height: pt(f.heightMm) };
}

/** « 134 millions de pixels », « 8,7 millions de pixels ». */
export function megapixels({ width, height }) {
  const mp = (width * height) / 1e6;
  return `${mp.toLocaleString('fr-FR', { maximumFractionDigits: mp < 10 ? 1 : 0 })} millions de pixels`;
}
