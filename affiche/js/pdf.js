// PDF minimal, sans bibliothèque : une page au format A4 ou A3 qui contient l'image JPEG
// de l'affiche en pleine page. Les imprimeurs et les copy-shops acceptent ce format.

const encoder = new TextEncoder();

/** Lit la taille et le nombre de couleurs d'un JPEG (marqueur SOF). */
export function jpegInfo(bytes) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('Ce fichier n’est pas un JPEG');
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) { i += 1; continue; }
    const marker = bytes[i + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0xff) { i += marker === 0xff ? 1 : 2; continue; }
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    const isSof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isSof) {
      return {
        height: (bytes[i + 5] << 8) | bytes[i + 6],
        width: (bytes[i + 7] << 8) | bytes[i + 8],
        components: bytes[i + 9],
      };
    }
    i += 2 + length;
  }
  throw new Error('JPEG illisible');
}

/** Chaîne de texte PDF (UTF-16 pour garder les accents des prénoms). */
function pdfText(text) {
  let hex = 'FEFF';
  for (const ch of String(text)) {
    const code = ch.codePointAt(0);
    const units = code > 0xffff ? [0xd800 + ((code - 0x10000) >> 10), 0xdc00 + ((code - 0x10000) & 0x3ff)] : [code];
    for (const u of units) hex += u.toString(16).toUpperCase().padStart(4, '0');
  }
  return `<${hex}>`;
}

function pdfDate(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `D:${date.getUTCFullYear()}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}Z`;
}

const num = (n) => String(Math.round(n * 100) / 100);

/**
 * Crée un PDF d'une page de `width` × `height` points avec le JPEG en pleine page.
 * Renvoie les octets du fichier (Uint8Array).
 */
export function jpegToPdf(jpeg, { width, height, ...info }) {
  return imagesToPdf([{ jpeg, x: 0, y: 0, width, height }], { width, height, ...info });
}

/**
 * PDF d'une page de `width` × `height` points composée de plusieurs JPEG (bandes de l'affiche).
 * `parts` : [{ jpeg, x, y, width, height }], positions en points depuis le coin haut gauche.
 */
export function imagesToPdf(parts, { width, height, title = 'Affiche', date = new Date() }) {
  const images = parts.map((part) => {
    const info = jpegInfo(part.jpeg);
    const colorSpace = { 1: '/DeviceGray', 3: '/DeviceRGB', 4: '/DeviceCMYK' }[info.components];
    if (!colorSpace) throw new Error('JPEG non pris en charge');
    return { ...part, info, colorSpace };
  });
  const firstImage = 5; // objets 1 à 4 : catalogue, pages, page, contenu ; puis les images ; puis les infos
  const content = images.map((im, i) => `q ${num(im.width)} 0 0 ${num(im.height)} ${num(im.x)} ${num(height - im.y - im.height)} cm /Im${i} Do Q\n`).join('');
  const xobjects = images.map((_, i) => `/Im${i} ${firstImage + i} 0 R`).join(' ');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(width)} ${num(height)}] `
      + `/Resources << /XObject << ${xobjects} >> /ProcSet [/PDF /ImageC] >> /Contents 4 0 R >>`,
    `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream`,
    ...images.map((im) => [
      `<< /Type /XObject /Subtype /Image /Width ${im.info.width} /Height ${im.info.height} /ColorSpace ${im.colorSpace} `
        + `/BitsPerComponent 8 /Filter /DCTDecode${im.info.components === 4 ? ' /Decode [1 0 1 0 1 0 1 0]' : ''} `
        + `/Length ${im.jpeg.length} >>\nstream\n`, im.jpeg, '\nendstream']),
    `<< /Title ${pdfText(title)} /Producer (Affiche foot) /CreationDate (${pdfDate(date)}) >>`,
  ];
  const infoRef = objects.length;

  const chunks = [];
  let offset = 0;
  const push = (part) => {
    const bytes = typeof part === 'string' ? encoder.encode(part) : part;
    chunks.push(bytes);
    offset += bytes.length;
  };

  push('%PDF-1.4\n');
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])); // commentaire binaire : « fichier binaire »
  const offsets = [];
  objects.forEach((body, index) => {
    offsets.push(offset);
    push(`${index + 1} 0 obj\n`);
    for (const part of [].concat(body)) push(part);
    push('\nendobj\n');
  });
  const xref = offset;
  push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  for (const o of offsets) push(`${String(o).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${infoRef} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const out = new Uint8Array(offset);
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.length; }
  return out;
}
