// Application d'affiches (dossier affiche/) : formats d'impression, JPEG, PDF, couleurs et PWA.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  FORMATS, IOS_MAX_PIXELS, QUALITIES, bands, exportSize, megapixels, pageSizePt, posterHeight,
} from '../affiche/js/formats.js';
import { imagesToPdf, jpegInfo, jpegToPdf } from '../affiche/js/pdf.js';
import { createJpegEncoder, quantTable } from '../affiche/js/jpeg.js';
import {
  ADULTS, ADULT_HAIRS, CHILD_HAIRS, CUSTOM_DEFAULT, GENDERS, HAIR_COLORS, LAYOUTS, SKINS, THEMES,
  adultHairsFor, contrast, customTheme, hairsFor,
} from '../affiche/js/themes.js';
import {
  DEFAULTS, LOGO_PLACES, LOGO_SIZES, jerseyName, jerseyNumber, resolveScene, titleSplits, withDefaults,
} from '../affiche/js/poster.js';
import { HAIRS_BELOW, PLACEMENTS } from '../affiche/js/figures.js';

const APP = new URL('../affiche/', import.meta.url).pathname;
const NOT_CACHED = new Set(['sw.js', 'fonts/OFL.txt']);

function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [relative(APP, path)];
  });
}

/** Petit JPEG factice : en-têtes seulement (SOI, APP0 JFIF éventuel, SOF0, EOI). */
function fakeJpeg(width, height, { jfif = true, components = 3 } = {}) {
  const app0 = jfif ? [0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0] : [];
  const sof = [0xff, 0xc0, 0, 8 + components * 3, 8, height >> 8, height & 0xff, width >> 8, width & 0xff, components];
  for (let c = 1; c <= components; c += 1) sof.push(c, 0x11, 0);
  return Uint8Array.from([0xff, 0xd8, ...app0, ...sof, 0xff, 0xd9]);
}

const latin1 = (bytes) => new TextDecoder('latin1').decode(bytes);

test('formats : A4 et A3 à 300 dpi, aux dimensions des imprimeurs', () => {
  assert.deepEqual(exportSize('a4'), { width: 2480, height: 3508, dpi: 300 });
  assert.deepEqual(exportSize('a3'), { width: 3508, height: 4961, dpi: 300 });
  assert.deepEqual(pageSizePt('a4'), { width: 595.28, height: 841.89 });
  assert.deepEqual(pageSizePt('a3'), { width: 841.89, height: 1190.55 });
  assert.equal(Math.round(posterHeight('a4')), 1414);
});

test('grands formats jusqu’à 40 × 60 cm, en Standard, HD et Ultra HD', () => {
  assert.deepEqual(Object.keys(FORMATS), ['a4', 'a3', '30x40', '40x50', '40x60']);
  assert.deepEqual(Object.values(QUALITIES).map((q) => q.dpi), [150, 300, 600]);
  assert.deepEqual(exportSize('40x60', { dpi: 300 }), { width: 4724, height: 7087, dpi: 300 });
  assert.deepEqual(exportSize('40x60', { dpi: 600 }), { width: 9449, height: 14173, dpi: 600 });
  assert.deepEqual(exportSize('30x40', { dpi: 150 }), { width: 1772, height: 2362, dpi: 150 });
  assert.deepEqual(pageSizePt('40x60'), { width: 1133.86, height: 1700.79 });
  assert.equal(posterHeight('40x60'), 1500);
  assert.equal(posterHeight('40x50'), 1250);
  assert.equal(megapixels(exportSize('40x60', { dpi: 600 })), '134 millions de pixels');
  assert.equal(megapixels(exportSize('a4')), '8,7 millions de pixels');
  // le JPEG accepte jusqu'à 65 535 pixels de côté
  for (const id of Object.keys(FORMATS)) {
    const size = exportSize(id, { dpi: 600 });
    assert.ok(size.width < 65535 && size.height < 65535, id);
  }
});

test('impression depuis un iPhone : image limitée à ce que le téléphone sait afficher', () => {
  const a3 = exportSize('a3', { maxPixels: IOS_MAX_PIXELS });
  assert.ok(a3.width * a3.height <= 16_777_216);
  assert.ok(a3.dpi >= 280, `${a3.dpi} dpi`);
  assert.deepEqual(exportSize('a4', { maxPixels: IOS_MAX_PIXELS }), exportSize('a4'));
});

test('bandes de dessin : toute la hauteur, multiples de 8 lignes, petites même en Ultra HD', () => {
  for (const [id, dpi] of [['a4', 300], ['a3', 300], ['40x60', 600]]) {
    const { width, height } = exportSize(id, { dpi });
    const list = bands(width, height);
    assert.ok(list.length > 1);
    assert.equal(list[0].top, 0);
    assert.equal(list.at(-1).top + list.at(-1).height, height);
    list.forEach((b, i) => {
      if (i > 0) assert.equal(b.top, list[i - 1].top + list[i - 1].height, 'bandes jointives');
      if (i < list.length - 1) assert.equal(b.height % 8, 0, 'multiple de 8');
      assert.ok(width * b.height <= 4_000_000, `bande trop grande (${b.height} lignes)`);
    });
  }
  assert.deepEqual(bands(100, 100), [{ top: 0, height: 100 }]);
});

/** Image RGBA de test : dégradé, bande rouge et disque jaune. */
function testImage(w, h) {
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const p = (y * w + x) * 4;
      const stripe = x > w * 0.4 && x < w * 0.6;
      const disc = (x - w * 0.75) ** 2 + (y - h * 0.4) ** 2 < (w * 0.12) ** 2;
      rgba.set(stripe ? [225, 50, 43, 255] : disc ? [250, 220, 100, 255] : [27 + (x % 50), 40 + (y % 30), 120, 255], p);
    }
  }
  return rgba;
}

function encode(rgba, w, h, rowsPerBand, options) {
  const encoder = createJpegEncoder(w, h, options);
  for (let top = 0; top < h; top += rowsPerBand) {
    const rows = Math.min(rowsPerBand, h - top);
    encoder.addRows(rgba.subarray(top * w * 4, (top + rows) * w * 4), rows);
  }
  return encoder.finish();
}

test('encodeur JPEG : fichier valide, résolution inscrite, même résultat quelle que soit la bande', () => {
  const [w, h] = [203, 157]; // ni largeur ni hauteur multiples de 8
  const rgba = testImage(w, h);
  const jpeg = encode(rgba, w, h, 40, { quality: 92, dpi: 600 });
  assert.deepEqual([jpeg[0], jpeg[1], jpeg.at(-2), jpeg.at(-1)], [0xff, 0xd8, 0xff, 0xd9]);
  assert.equal(latin1(jpeg.slice(6, 11)), 'JFIF\0');
  assert.deepEqual([jpeg[13], (jpeg[14] << 8) | jpeg[15], (jpeg[16] << 8) | jpeg[17]], [1, 600, 600]);
  assert.deepEqual(jpegInfo(jpeg), { width: w, height: h, components: 3 });
  // dans les données compressées, chaque octet 0xFF est suivi de 0x00 (sauf la fin)
  const sos = jpeg.findIndex((b, i) => b === 0xff && jpeg[i + 1] === 0xda);
  const data = jpeg.subarray(sos + 2 + ((jpeg[sos + 2] << 8) | jpeg[sos + 3]), jpeg.length - 2);
  data.forEach((b, i) => { if (b === 0xff) assert.equal(data[i + 1], 0, `octet ${i}`); });
  // découpage différent, fichier identique
  assert.deepEqual(encode(rgba, w, h, 8), encode(rgba, w, h, 200));
  // bandes : multiples de 8 lignes, et pas une ligne de trop ni de moins
  const encoder = createJpegEncoder(16, 16);
  assert.throws(() => encoder.addRows(new Uint8ClampedArray(16 * 5 * 4), 5));
  assert.throws(() => createJpegEncoder(16, 16).finish());
  assert.throws(() => createJpegEncoder(70000, 10));
});

test('encodeur JPEG : qualité (tables de quantification de l’IJG)', () => {
  const base = [16, 11, 10];
  assert.deepEqual(quantTable(base, 50), [16, 11, 10]);
  assert.deepEqual(quantTable(base, 100), [1, 1, 1]);
  assert.deepEqual(quantTable(base, 92), [3, 2, 2]);
  const light = encode(testImage(64, 64), 64, 64, 64, { quality: 40 });
  const fine = encode(testImage(64, 64), 64, 64, 64, { quality: 95 });
  assert.ok(light.length < fine.length);
});

test('JPEG : taille lue dans l’en-tête', () => {
  assert.deepEqual(jpegInfo(fakeJpeg(2480, 3508)), { width: 2480, height: 3508, components: 3 });
  assert.deepEqual(jpegInfo(fakeJpeg(10, 20, { jfif: false })), { width: 10, height: 20, components: 3 });
  assert.throws(() => jpegInfo(Uint8Array.from([1, 2, 3])));
});

test('PDF : une page A4, l’image en pleine page, table des objets exacte', () => {
  const page = pageSizePt('a4');
  const pdf = jpegToPdf(fakeJpeg(2480, 3508), { ...page, title: 'Affiche Léa et Jean', date: new Date(Date.UTC(2026, 9, 3, 12)) });
  const text = latin1(pdf);
  assert.ok(text.startsWith('%PDF-1.4\n'));
  assert.ok(text.endsWith('%%EOF\n'));
  assert.match(text, /\/MediaBox \[0 0 595\.28 841\.89\]/);
  assert.match(text, /\/Width 2480 \/Height 3508 \/ColorSpace \/DeviceRGB/);
  assert.match(text, /q 595\.28 0 0 841\.89 0 0 cm \/Im0 Do Q/);
  assert.match(text, /\/CreationDate \(D:20261003120000Z\)/);
  // titre en UTF-16 : le é de Léa est gardé
  assert.ok(text.includes('<FEFF00410066006600690063006800650020004C00E90061'));
  // chaque entrée de la table « xref » pointe sur le bon objet
  const xref = Number(text.match(/startxref\n(\d+)/)[1]);
  assert.equal(text.slice(xref, xref + 4), 'xref');
  const entries = [...text.slice(xref).matchAll(/(\d{10}) 00000 n /g)].map((m) => Number(m[1]));
  assert.equal(entries.length, 6);
  entries.forEach((offset, i) => assert.equal(text.slice(offset, offset + `${i + 1} 0 obj`.length), `${i + 1} 0 obj`));
  const size = Number(text.match(/\/Size (\d+)/)[1]);
  assert.equal(size, entries.length + 1);
});

test('PDF 40 × 60 cm : page au format exact, image Ultra HD en pleine page', () => {
  const page = pageSizePt('40x60');
  const { width, height } = exportSize('40x60', { dpi: 600 });
  const text = latin1(jpegToPdf(fakeJpeg(width, height), page));
  assert.match(text, /\/MediaBox \[0 0 1133\.86 1700\.79\]/);
  assert.match(text, /\/Width 9449 \/Height 14173/);
  assert.match(text, /q 1133\.86 0 0 1700\.79 0 0 cm \/Im0 Do Q/);
  // plusieurs images sur une page : placées du haut vers le bas
  const parts = [0, 1].map((i) => ({ jpeg: fakeJpeg(100, 50), x: 0, y: i * 50, width: 100, height: 50 }));
  const two = latin1(imagesToPdf(parts, { width: 100, height: 100 }));
  assert.match(two, /q 100 0 0 50 0 50 cm \/Im0 Do Q\nq 100 0 0 50 0 0 cm \/Im1 Do Q/);
});

test('maillots : prénoms en majuscules, numéros de 2 chiffres au plus', () => {
  assert.equal(jerseyName('  élodie   rose '), 'ÉLODIE ROSE');
  assert.equal(jerseyName(undefined), '');
  assert.equal(jerseyNumber('1a2b3'), '12');
  assert.equal(jerseyNumber(7), '7');
  assert.equal(jerseyNumber(''), '');
});

test('titre long : coupé aux espaces, sinon après un trait d’union', () => {
  assert.deepEqual(titleSplits('PARIS SAINT-GERMAIN'), [['PARIS', 'SAINT-GERMAIN']]);
  assert.deepEqual(titleSplits('ALLEZ LES BLEUS'), [['ALLEZ', 'LES BLEUS'], ['ALLEZ LES', 'BLEUS']]);
  assert.deepEqual(titleSplits('SAINT-ÉTIENNE'), [['SAINT-', 'ÉTIENNE']]);
  assert.deepEqual(titleSplits('PARIS'), []);
  assert.deepEqual(titleSplits('ALLEZ-'), []);
});

test('saisie : titre de 30 caractères, prénoms de 16 (PARIS SAINT-GERMAIN, JEAN-BAPTISTE…)', () => {
  const html = readFileSync(join(APP, 'index.html'), 'utf8');
  assert.equal(Number(html.match(/id="title"[^>]*maxlength="(\d+)"/)[1]), 30);
  const main = readFileSync(join(APP, 'js/main.js'), 'utf8');
  assert.equal(Number(main.match(/\.name" type="text" maxlength="(\d+)"/)[1]), 16);
});

test('couleurs : prénoms lisibles sur le maillot, titre lisible sur le fond', () => {
  for (const t of THEMES) {
    for (const c of [t.bg, t.shirt, t.pants, t.text, t.textOutline, t.titleColor, ...t.stripe.map(([color]) => color)]) {
      assert.match(c, /^#[0-9a-f]{6}$/i, `${t.id} : ${c}`);
    }
    assert.ok(contrast(t.text, t.shirt) >= 3, `${t.id} : prénoms peu lisibles (${contrast(t.text, t.shirt).toFixed(2)})`);
    assert.ok(contrast(t.titleColor, t.bg) >= 3, `${t.id} : titre peu lisible (${contrast(t.titleColor, t.bg).toFixed(2)})`);
    assert.ok(t.title && t.name, t.id);
  }
  assert.equal(new Set(THEMES.map((t) => t.id)).size, THEMES.length);
  const perso = customTheme(CUSTOM_DEFAULT);
  assert.equal(perso.bg, CUSTOM_DEFAULT.bg);
  const pale = customTheme({ bg: '#ffffff', stripe: '#ffffff', shirt: '#eeeeee', text: '#111111' });
  assert.ok(contrast(pale.titleColor, pale.bg) >= 3, 'titre lisible même sur un fond blanc');
});

test('options : genre, coiffures, couleurs de cheveux et de peau', () => {
  assert.deepEqual(GENDERS.map((g) => g.id), ['garcon', 'fille']);
  assert.deepEqual(ADULTS.map((a) => a.id), ['papa', 'maman']);
  const boy = hairsFor('garcon').map((h) => h.id);
  assert.ok(boy.includes('court') && boy.includes('long') && !boy.includes('queue'));
  assert.equal(hairsFor('fille').length, CHILD_HAIRS.length);
  assert.ok(HAIR_COLORS.length >= 6);
  assert.ok(SKINS.length >= 4);
  for (const k of DEFAULTS.children) assert.ok(hairsFor(k.gender).some((h) => h.id === k.hair), k.name);
  for (const a of DEFAULTS.adults) assert.ok(adultHairsFor(a.kind).some((h) => h.id === a.hair), a.name);
  assert.ok(THEMES.some((t) => t.id === DEFAULTS.theme));
  // papa : pas de queue de cheval ni de chignon ; maman : pas de crâne rasé
  assert.ok(!adultHairsFor('papa').some((h) => ['queue', 'chignon', 'carre'].includes(h.id)));
  assert.ok(!adultHairsFor('maman').some((h) => h.id === 'rase'));
  assert.equal(new Set([...adultHairsFor('papa'), ...adultHairsFor('maman')].map((h) => h.id)).size, ADULT_HAIRS.length);
  for (const id of HAIRS_BELOW) assert.ok(adultHairsFor('maman').some((h) => h.id === id), id);
  // longs et frisés, crépus : pour tous les enfants et tous les parents
  for (const id of ['frises', 'crepus']) {
    for (const list of [hairsFor('garcon'), hairsFor('fille'), adultHairsFor('papa'), adultHairsFor('maman')]) {
      assert.ok(list.some((h) => h.id === id), id);
    }
  }
});

test('compositions : 1 ou 2 parents, un enfant sur les épaules ou un sur chaque épaule', () => {
  assert.deepEqual(LAYOUTS.map((l) => [l.adults, l.children]), [[1, 1], [1, 2], [2, 2], [2, 4]]);
  for (const layout of LAYOUTS) {
    const groups = PLACEMENTS[layout.id];
    assert.equal(groups.length, layout.adults, layout.id);
    for (const g of groups) assert.ok(['mains', 'cotes', 'cote-taille'].includes(g.hold), `${layout.id} : ${g.hold}`);
    assert.equal(groups.reduce((sum, g) => sum + g.kids, 0), layout.children, layout.id);
    // les familles restent dans l'affiche (mains comprises : de 120 à 880 dans le repère d'un adulte)
    for (const g of groups) {
      assert.ok(g.x + (120 - 500) * g.s >= 34 - 1 && g.x + (880 - 500) * g.s <= 966 + 1, `${layout.id} : famille coupée`);
    }
    // deux parents avec un enfant chacun : collés (leurs dos se touchent)
    if (layout.id === 'deux-parents') assert.ok(groups[1].x - groups[0].x <= (706 - 294) * groups[0].s, 'parents collés');
    const scene = resolveScene(withDefaults({ layout: layout.id }));
    assert.equal(scene.adults.length, layout.adults);
    assert.equal(scene.children.length, layout.children);
    for (const p of [...scene.adults, ...scene.children]) assert.ok(p.skin.base && p.skin.line && p.hairColor.base);
  }
  assert.ok(DEFAULTS.children.length >= 4 && DEFAULTS.adults.length >= 2);
});

test('logo : places et tailles ; réglages par défaut', () => {
  assert.deepEqual(LOGO_PLACES.map((p) => p.id), ['haut-gauche', 'haut-droite', 'bas-gauche', 'bas-droite']);
  assert.ok(LOGO_SIZES.every((z, i) => i === 0 || z.size > LOGO_SIZES[i - 1].size));
  const s = withDefaults({ logo: { place: 'bas-droite' } });
  assert.deepEqual(s.logo, { place: 'bas-droite', size: DEFAULTS.logo.size });
  assert.equal(s.quality, 'hd');
  assert.ok(Object.keys(QUALITIES).includes(DEFAULTS.quality));
  assert.ok(Object.keys(FORMATS).includes(DEFAULTS.format));
});

test('réglages : complétés par le modèle de départ, personne par personne', () => {
  const s = withDefaults({ layout: 'deux-parents', children: [{ name: 'Inès' }], adults: [{}, { kind: 'papa' }] });
  assert.equal(s.children[0].name, 'Inès');
  assert.equal(s.children[0].hair, DEFAULTS.children[0].hair);
  assert.equal(s.children[1].name, DEFAULTS.children[1].name);
  assert.equal(s.adults[1].kind, 'papa');
  assert.equal(s.adults[0].name, DEFAULTS.adults[0].name);
  assert.equal(s.format, 'a4');
});

test('PWA : le service worker met en cache tous les fichiers de l’app (et seulement eux)', () => {
  const sw = readFileSync(join(APP, 'sw.js'), 'utf8');
  const list = sw.match(/const PRECACHE = \[([\s\S]*?)\];/)[1];
  const cached = [...list.matchAll(/'\.\/([^']*)'/g)].map((m) => m[1]).filter(Boolean);
  const files = listFiles(APP).filter((f) => !NOT_CACHED.has(f));
  assert.deepEqual([...cached].sort(), [...files].sort());
  // le cache de l'app ne supprime pas ceux des autres applications du même site
  assert.match(sw, /k\.startsWith\(PREFIX\)/);
});

test('PWA : manifeste et page d’accueil pointent vers des fichiers existants ; CSP stricte', () => {
  const manifest = JSON.parse(readFileSync(join(APP, 'manifest.webmanifest'), 'utf8'));
  for (const icon of manifest.icons) assert.ok(statSync(join(APP, icon.src)).isFile(), icon.src);
  const html = readFileSync(join(APP, 'index.html'), 'utf8');
  for (const [, ref] of html.matchAll(/(?:href|src)="([^"#:]+)"/g)) assert.ok(statSync(join(APP, ref)).isFile(), ref);
  const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1] || '';
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /object-src 'none'/);
  assert.doesNotMatch(csp, /script-src[^;]*unsafe/, 'aucun script en ligne ni eval');
});
