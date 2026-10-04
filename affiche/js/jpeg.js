// Encodeur JPEG (baseline, sans sous-échantillonnage des couleurs), sans bibliothèque.
// Il reçoit l'image par bandes horizontales : on peut ainsi créer une affiche 40 × 60 cm
// à 600 dpi (134 millions de pixels) même sur iPhone, où un canvas ne dépasse pas
// 16 millions de pixels. Algorithme : norme JPEG (ITU T.81), tables de l'annexe K,
// DCT rapide d'Arai, Agui et Nakajima.

const ZIGZAG = [
  0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40, 48, 41, 34, 27, 20, 13, 6, 7, 14, 21, 28,
  35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51, 58, 59, 52, 45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63,
];

// tables de quantification de base (ordre naturel, ligne par ligne)
const LUMA_Q = [
  16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87, 80, 62,
  18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99,
];
const CHROMA_Q = [
  17, 18, 24, 47, 99, 99, 99, 99, 18, 21, 26, 66, 99, 99, 99, 99, 24, 26, 56, 99, 99, 99, 99, 99, 47, 66, 99, 99, 99, 99, 99, 99,
  ...new Array(32).fill(99),
];

// tables de Huffman standard : nombre de codes par longueur (1 à 16), puis les symboles
const DC_LUMA = [[0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]];
const DC_CHROMA = [[0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]];
const AC_LUMA = [[0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 0x7d], [
  0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06, 0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08,
  0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72, 0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28,
  0x29, 0x2a, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
  0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
  0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6,
  0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2,
  0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa,
]];
const AC_CHROMA = [[0, 2, 1, 2, 4, 4, 3, 4, 7, 5, 4, 4, 0, 1, 2, 0x77], [
  0x00, 0x01, 0x02, 0x03, 0x11, 0x04, 0x05, 0x21, 0x31, 0x06, 0x12, 0x41, 0x51, 0x07, 0x61, 0x71, 0x13, 0x22, 0x32, 0x81, 0x08, 0x14, 0x42, 0x91,
  0xa1, 0xb1, 0xc1, 0x09, 0x23, 0x33, 0x52, 0xf0, 0x15, 0x62, 0x72, 0xd1, 0x0a, 0x16, 0x24, 0x34, 0xe1, 0x25, 0xf1, 0x17, 0x18, 0x19, 0x1a, 0x26,
  0x27, 0x28, 0x29, 0x2a, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58,
  0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87,
  0x88, 0x89, 0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4,
  0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda,
  0xe2, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa,
]];

/** Codes de Huffman canoniques : symbole → [code, longueur]. */
function huffmanCodes([counts, symbols]) {
  const codes = [];
  let code = 0;
  let k = 0;
  counts.forEach((n, i) => {
    for (let j = 0; j < n; j += 1) codes[symbols[k++]] = [code++, i + 1];
    code <<= 1;
  });
  return codes;
}

/** Table de quantification pour une qualité de 1 à 100 (formule de l'IJG). */
export function quantTable(base, quality) {
  const q = Math.min(100, Math.max(1, quality));
  const scale = q < 50 ? 5000 / q : 200 - q * 2;
  return base.map((v) => Math.min(255, Math.max(1, Math.floor((v * scale + 50) / 100))));
}

const AAN = [1, 1.387039845, 1.306562965, 1.175875602, 1, 0.785694958, 0.5411961, 0.275899379];

/** Diviseurs de la DCT rapide (quantification incluse). */
function divisors(table) {
  const out = new Float64Array(64);
  for (let i = 0; i < 64; i += 1) out[i] = 1 / (table[i] * AAN[i >> 3] * AAN[i & 7] * 8);
  return out;
}

/** Octets de sortie, par morceaux (pas de grand tableau à recopier). */
class Output {
  constructor() {
    this.chunks = [];
    this.buf = new Uint8Array(1 << 20);
    this.pos = 0;
    this.length = 0;
  }

  byte(b) {
    if (this.pos === this.buf.length) {
      this.chunks.push(this.buf);
      this.buf = new Uint8Array(1 << 20);
      this.pos = 0;
    }
    this.buf[this.pos++] = b;
    this.length += 1;
  }

  bytes(list) { for (const b of list) this.byte(b); }

  word(w) { this.byte((w >> 8) & 0xff); this.byte(w & 0xff); }

  result() {
    const out = new Uint8Array(this.length);
    let at = 0;
    for (const c of this.chunks) { out.set(c, at); at += c.length; }
    out.set(this.buf.subarray(0, this.pos), at);
    return out;
  }
}

/**
 * Crée un encodeur pour une image de `width` × `height` pixels.
 * `addRows(rgba, rows)` : ajoute des lignes (RGBA, comme getImageData) ; chaque bande
 * doit compter un multiple de 8 lignes, sauf la dernière. `finish()` renvoie le fichier.
 */
export function createJpegEncoder(width, height, { quality = 92, dpi = 300 } = {}) {
  if (width < 1 || height < 1 || width > 65535 || height > 65535) throw new Error('Taille JPEG impossible');
  const lumaTable = quantTable(LUMA_Q, quality);
  const chromaTable = quantTable(CHROMA_Q, quality);
  const lumaDiv = divisors(lumaTable);
  const chromaDiv = divisors(chromaTable);
  const huff = { dcY: huffmanCodes(DC_LUMA), acY: huffmanCodes(AC_LUMA), dcC: huffmanCodes(DC_CHROMA), acC: huffmanCodes(AC_CHROMA) };
  const out = new Output();

  // --- en-têtes
  out.word(0xffd8);
  out.word(0xffe0); out.word(16); out.bytes([0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 1]); out.word(dpi); out.word(dpi); out.bytes([0, 0]);
  out.word(0xffdb); out.word(2 + 65 * 2);
  out.byte(0); for (let i = 0; i < 64; i += 1) out.byte(lumaTable[ZIGZAG[i]]);
  out.byte(1); for (let i = 0; i < 64; i += 1) out.byte(chromaTable[ZIGZAG[i]]);
  out.word(0xffc0); out.word(17); out.byte(8); out.word(height); out.word(width); out.byte(3);
  out.bytes([1, 0x11, 0, 2, 0x11, 1, 3, 0x11, 1]);
  const tables = [[0x00, DC_LUMA], [0x10, AC_LUMA], [0x01, DC_CHROMA], [0x11, AC_CHROMA]];
  out.word(0xffc4); out.word(2 + tables.reduce((n, [, [, s]]) => n + 17 + s.length, 0));
  for (const [id, [counts, symbols]] of tables) { out.byte(id); out.bytes(counts); out.bytes(symbols); }
  out.word(0xffda); out.word(12); out.byte(3); out.bytes([1, 0x00, 2, 0x11, 3, 0x11]); out.bytes([0, 63, 0]);

  // --- données compressées
  let bitBuf = 0;
  let bitCount = 0;
  const writeBits = (code, length) => {
    bitBuf = (bitBuf << length) | code;
    bitCount += length;
    while (bitCount >= 8) {
      const b = (bitBuf >>> (bitCount - 8)) & 0xff;
      out.byte(b);
      if (b === 0xff) out.byte(0);
      bitCount -= 8;
    }
    bitBuf &= (1 << bitCount) - 1;
  };

  const block = new Float64Array(64);
  const coeffs = new Int32Array(64);
  const Y = new Float64Array(64);
  const U = new Float64Array(64);
  const V = new Float64Array(64);
  const prevDc = [0, 0, 0];

  /** DCT 8 × 8 (AAN) puis quantification ; résultat dans `coeffs` (ordre naturel). */
  function fdct(data, div) {
    for (let i = 0; i < 64; i += 8) {
      const t0 = data[i] + data[i + 7]; const t7 = data[i] - data[i + 7];
      const t1 = data[i + 1] + data[i + 6]; const t6 = data[i + 1] - data[i + 6];
      const t2 = data[i + 2] + data[i + 5]; const t5 = data[i + 2] - data[i + 5];
      const t3 = data[i + 3] + data[i + 4]; const t4 = data[i + 3] - data[i + 4];
      let t10 = t0 + t3; const t13 = t0 - t3; let t11 = t1 + t2; let t12 = t1 - t2;
      block[i] = t10 + t11; block[i + 4] = t10 - t11;
      const z1 = (t12 + t13) * 0.707106781;
      block[i + 2] = t13 + z1; block[i + 6] = t13 - z1;
      t10 = t4 + t5; t11 = t5 + t6; t12 = t6 + t7;
      const z5 = (t10 - t12) * 0.382683433;
      const z2 = 0.5411961 * t10 + z5;
      const z4 = 1.306562965 * t12 + z5;
      const z3 = t11 * 0.707106781;
      const z11 = t7 + z3; const z13 = t7 - z3;
      block[i + 5] = z13 + z2; block[i + 3] = z13 - z2;
      block[i + 1] = z11 + z4; block[i + 7] = z11 - z4;
    }
    for (let i = 0; i < 8; i += 1) {
      const t0 = block[i] + block[i + 56]; const t7 = block[i] - block[i + 56];
      const t1 = block[i + 8] + block[i + 48]; const t6 = block[i + 8] - block[i + 48];
      const t2 = block[i + 16] + block[i + 40]; const t5 = block[i + 16] - block[i + 40];
      const t3 = block[i + 24] + block[i + 32]; const t4 = block[i + 24] - block[i + 32];
      let t10 = t0 + t3; const t13 = t0 - t3; let t11 = t1 + t2; let t12 = t1 - t2;
      block[i] = t10 + t11; block[i + 32] = t10 - t11;
      const z1 = (t12 + t13) * 0.707106781;
      block[i + 16] = t13 + z1; block[i + 48] = t13 - z1;
      t10 = t4 + t5; t11 = t5 + t6; t12 = t6 + t7;
      const z5 = (t10 - t12) * 0.382683433;
      const z2 = 0.5411961 * t10 + z5;
      const z4 = 1.306562965 * t12 + z5;
      const z3 = t11 * 0.707106781;
      const z11 = t7 + z3; const z13 = t7 - z3;
      block[i + 40] = z13 + z2; block[i + 24] = z13 - z2;
      block[i + 8] = z11 + z4; block[i + 56] = z11 - z4;
    }
    for (let i = 0; i < 64; i += 1) coeffs[i] = Math.round(block[i] * div[i]);
  }

  /** Nombre de bits d'une valeur et ses bits (convention JPEG pour les négatifs). */
  function writeValue(v) {
    const a = v < 0 ? -v : v;
    const size = a === 0 ? 0 : 32 - Math.clz32(a);
    return [size, v < 0 ? v + (1 << size) - 1 : v];
  }

  function encodeBlock(data, div, component, dcCodes, acCodes) {
    fdct(data, div);
    const dc = coeffs[0];
    const [dcSize, dcBits] = writeValue(dc - prevDc[component]);
    prevDc[component] = dc;
    writeBits(dcCodes[dcSize][0], dcCodes[dcSize][1]);
    if (dcSize) writeBits(dcBits, dcSize);
    let run = 0;
    for (let k = 1; k < 64; k += 1) {
      const c = coeffs[ZIGZAG[k]];
      if (c === 0) { run += 1; continue; }
      while (run > 15) { writeBits(acCodes[0xf0][0], acCodes[0xf0][1]); run -= 16; }
      const [size, bits] = writeValue(c);
      const sym = (run << 4) | size;
      writeBits(acCodes[sym][0], acCodes[sym][1]);
      writeBits(bits, size);
      run = 0;
    }
    if (run > 0) writeBits(acCodes[0][0], acCodes[0][1]);
  }

  let rowsDone = 0;

  return {
    width,
    height,
    /** Ajoute `rows` lignes de pixels RGBA (largeur `width`). */
    addRows(rgba, rows) {
      if (rowsDone + rows > height) throw new Error('Trop de lignes');
      if (rows % 8 && rowsDone + rows !== height) throw new Error('Bande de hauteur non multiple de 8');
      for (let by = 0; by < rows; by += 8) {
        for (let bx = 0; bx < width; bx += 8) {
          for (let y = 0; y < 8; y += 1) {
            // au bord de l'image, la dernière ligne et la dernière colonne sont répétées
            const row = Math.min(by + y, rows - 1);
            for (let x = 0; x < 8; x += 1) {
              const p = (row * width + Math.min(bx + x, width - 1)) * 4;
              const [r, g, b] = [rgba[p], rgba[p + 1], rgba[p + 2]];
              const i = y * 8 + x;
              Y[i] = 0.299 * r + 0.587 * g + 0.114 * b - 128;
              U[i] = -0.168736 * r - 0.331264 * g + 0.5 * b;
              V[i] = 0.5 * r - 0.418688 * g - 0.081312 * b;
            }
          }
          encodeBlock(Y, lumaDiv, 0, huff.dcY, huff.acY);
          encodeBlock(U, chromaDiv, 1, huff.dcC, huff.acC);
          encodeBlock(V, chromaDiv, 2, huff.dcC, huff.acC);
        }
      }
      rowsDone += rows;
    },
    /** Termine le fichier et renvoie ses octets. */
    finish() {
      if (rowsDone !== height) throw new Error(`Image incomplète (${rowsDone}/${height} lignes)`);
      if (bitCount > 0) writeBits((1 << (8 - bitCount)) - 1, 8 - bitCount);
      out.word(0xffd9);
      return out.result();
    },
  };
}
