// Formats d'impression : A4 et A3 (même proportion 1 × √2 que l'affiche).

export const FORMATS = {
  a4: { id: 'a4', name: 'A4', widthMm: 210, heightMm: 297, hint: '21 × 29,7 cm' },
  a3: { id: 'a3', name: 'A3', widthMm: 297, heightMm: 420, hint: '29,7 × 42 cm' },
};

/** Qualité d'impression visée (points par pouce) : 300 dpi, la norme des imprimeurs. */
export const TARGET_DPI = 300;

/**
 * Les iPhone et iPad refusent les canvas de plus de 16 777 216 pixels. Le JPG A3 à 300 dpi
 * (17,4 millions de pixels) y passe alors à 287 dpi ; le PDF, lui, est dessiné par bandes
 * et garde ses 300 dpi partout.
 */
export const IOS_MAX_PIXELS = 16_000_000;

/** Hauteur maximale d'une bande pour le PDF (pixels), pour ménager la mémoire du téléphone. */
export const BAND_PIXELS = 4_000_000;

const MM_PER_INCH = 25.4;
const PT_PER_INCH = 72;

/** Taille de l'image exportée, en pixels, et sa résolution (réduite si l'appareil l'exige). */
export function exportSize(formatId, { dpi = TARGET_DPI, maxPixels = Infinity } = {}) {
  const f = FORMATS[formatId] || FORMATS.a4;
  const [w, h] = [f.widthMm / MM_PER_INCH, f.heightMm / MM_PER_INCH];
  const best = Math.min(dpi, Math.floor(Math.sqrt(maxPixels / (w * h))));
  return { width: Math.round(w * best), height: Math.round(h * best), dpi: best };
}

/**
 * Découpe une image de `width` × `height` pixels en bandes horizontales d'au plus
 * `maxPixels` pixels. Chaque bande déborde de `overlap` pixels sur la suivante
 * (pas de fil blanc entre deux bandes dans le PDF).
 */
export function bands(width, height, { maxPixels = BAND_PIXELS, overlap = 2 } = {}) {
  const count = Math.max(1, Math.ceil((width * height) / maxPixels));
  const step = Math.ceil(height / count);
  const list = [];
  for (let top = 0; top < height; top += step) {
    const bottom = Math.min(height, top + step + overlap);
    list.push({ top, height: bottom - top });
  }
  return list;
}

/** Taille de la page PDF, en points (1/72 de pouce). */
export function pageSizePt(formatId) {
  const f = FORMATS[formatId] || FORMATS.a4;
  const pt = (mm) => Math.round((mm / MM_PER_INCH) * PT_PER_INCH * 100) / 100;
  return { width: pt(f.widthMm), height: pt(f.heightMm) };
}
