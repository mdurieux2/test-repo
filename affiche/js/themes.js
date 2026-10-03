// Couleurs de l'affiche : thèmes (fond, bande centrale, maillots), peaux et cheveux.
// Aucun logo ni nom de club : seulement des couleurs et un titre libre (une ville…).

/** Bande centrale : couleurs de gauche à droite et largeurs (en unités de l'affiche, sur 1000). */
const edged = (color, edge = '#ffffff') => [[edge, 14], [color, 242], [edge, 14]];

export const THEMES = [
  {
    id: 'bleu-rouge', name: 'Bleu et rouge', title: 'PARIS',
    bg: '#1b2878', stripe: edged('#e1322b'), shirt: '#2a3b94', pants: '#18215c',
    text: '#ffffff', textOutline: '#e1322b', titleColor: '#ffffff',
  },
  {
    id: 'ciel-blanc', name: 'Ciel et blanc', title: 'MARSEILLE',
    bg: '#2a9fd8', stripe: edged('#ffffff'), shirt: '#f4f6f9', pants: '#0f2a57',
    text: '#0f2a57', textOutline: '#2a9fd8', titleColor: '#0f2a57',
  },
  {
    id: 'blanc-rouge-bleu', name: 'Blanc, rouge et bleu', title: 'LYON',
    bg: '#12306d', stripe: [['#ffffff', 10], ['#d8262f', 120], ['#ffffff', 10], ['#2a63c6', 120], ['#ffffff', 10]],
    shirt: '#f4f6f9', pants: '#12306d', text: '#12306d', textOutline: '#d8262f', titleColor: '#ffffff',
  },
  {
    id: 'sang-or', name: 'Sang et or', title: 'LENS',
    bg: '#c4141f', stripe: edged('#1c1c1c', '#ffd100'), shirt: '#ffd100', pants: '#1c1c1c',
    text: '#c4141f', textOutline: '#1c1c1c', titleColor: '#ffd100',
  },
  {
    id: 'vert', name: 'Vert', title: 'ALLEZ LES VERTS',
    bg: '#00703a', stripe: edged('#ffffff', '#ffffff'), shirt: '#00a04e', pants: '#0d3b22',
    text: '#ffffff', textOutline: '#0b4f29', titleColor: '#ffffff', titleOutline: '#0b4f29',
  },
  {
    id: 'jaune-vert', name: 'Jaune et vert', title: 'NANTES',
    bg: '#007a45', stripe: edged('#fcd405'), shirt: '#fcd405', pants: '#0d3b25',
    text: '#007a45', textOutline: '#ffffff', titleColor: '#ffffff', titleOutline: '#005530',
  },
  {
    id: 'tricolore', name: 'Bleu, blanc, rouge', title: 'ALLEZ LES BLEUS',
    bg: '#0b2459', stripe: [['#ffffff', 8], ['#1f55b5', 84], ['#ffffff', 84], ['#e2283a', 84], ['#ffffff', 8]],
    shirt: '#1d3c8f', pants: '#0b1b40', text: '#ffffff', textOutline: '#e2283a', titleColor: '#ffffff', titleOutline: '#0b2459',
  },
  {
    id: 'rouge-noir', name: 'Rouge et noir', title: 'ALLEZ !',
    bg: '#151515', stripe: edged('#d4121e'), shirt: '#d4121e', pants: '#151515',
    text: '#ffffff', textOutline: '#151515', titleColor: '#ffffff',
  },
  {
    id: 'violet', name: 'Violet', title: 'TOULOUSE',
    bg: '#3d1f6e', stripe: edged('#ffffff', '#ffffff'), shirt: '#5b2d9a', pants: '#24123f',
    text: '#ffffff', textOutline: '#2a1450', titleColor: '#ffffff', titleOutline: '#2a1450',
  },
];

/** Thème « Personnalisé » : 4 couleurs choisies, le reste s'en déduit. */
export const CUSTOM_DEFAULT = { bg: '#1b2878', stripe: '#e1322b', shirt: '#2a3b94', text: '#ffffff' };

export function customTheme({ bg, stripe, shirt, text }) {
  const dark = (c) => luminance(c) < 0.35;
  const outline = contrast(text, stripe) >= 1.8 && stripe.toLowerCase() !== shirt.toLowerCase() ? stripe : mix(shirt, '#000000', 0.55);
  const title = contrast('#ffffff', bg) >= 3 ? '#ffffff' : mix(bg, '#000000', 0.7);
  return {
    id: 'perso', name: 'Personnalisé', title: '',
    bg, stripe: edged(stripe), shirt, pants: mix(dark(shirt) ? shirt : bg, '#000000', 0.45),
    text, textOutline: outline, titleColor: title,
    titleOutline: contrast(title, stripe) < 2 ? mix(bg, '#000000', 0.5) : undefined,
  };
}

export const SKINS = [
  { id: 'tres-clair', name: 'Très claire', base: '#f7d7c0', shade: '#e6b496' },
  { id: 'clair', name: 'Claire', base: '#efbf98', shade: '#d89b72' },
  { id: 'mat', name: 'Mate', base: '#d29a6b', shade: '#b37a4c' },
  { id: 'fonce', name: 'Foncée', base: '#9e6743', shade: '#7c4b2d' },
  { id: 'tres-fonce', name: 'Très foncée', base: '#6c432b', shade: '#4d2d1b' },
];

export const HAIR_COLORS = [
  { id: 'blond', name: 'Blonds', base: '#e8c06a', shade: '#c4923a', light: '#f7dd97' },
  { id: 'roux', name: 'Roux', base: '#c7652e', shade: '#97441a', light: '#e48d55' },
  { id: 'chatain-clair', name: 'Châtain clair', base: '#a8784a', shade: '#7a5230', light: '#c99b6c' },
  { id: 'chatain', name: 'Châtains', base: '#6e4a2e', shade: '#4a2f1b', light: '#8f6646' },
  { id: 'brun', name: 'Bruns', base: '#3f2a1d', shade: '#24170f', light: '#5e4332' },
  { id: 'noir', name: 'Noirs', base: '#1f1b19', shade: '#0b0a09', light: '#3d3633' },
];

/** Coiffures de l'enfant ; `girl` : proposée seulement pour une fille. */
export const CHILD_HAIRS = [
  { id: 'court', name: 'Courts' },
  { id: 'long', name: 'Longs et lisses' },
  { id: 'queue', name: 'Queue de cheval', girl: true },
  { id: 'couettes', name: 'Couettes', girl: true },
  { id: 'chignon', name: 'Chignon', girl: true },
  { id: 'carre', name: 'Carré', girl: true },
  { id: 'boucles', name: 'Bouclés' },
];

/** Coiffures de l'adulte ; `mom` / `dad` : proposée seulement pour une maman / un papa. */
export const ADULT_HAIRS = [
  { id: 'court', name: 'Courts' },
  { id: 'rase', name: 'Rasés', dad: true },
  { id: 'long', name: 'Longs et lisses' },
  { id: 'queue', name: 'Queue de cheval', mom: true },
  { id: 'chignon', name: 'Chignon', mom: true },
  { id: 'carre', name: 'Carré', mom: true },
  { id: 'boucles', name: 'Bouclés' },
];

/** Coiffures proposées pour un papa ou une maman. */
export const adultHairsFor = (kind) => ADULT_HAIRS.filter((h) => (kind === 'maman' ? !h.dad : !h.mom));

/** Compositions : combien de parents et d'enfants sur l'affiche. */
export const LAYOUTS = [
  { id: 'solo', name: '1 parent, 1 enfant', adults: 1, children: 1 },
  { id: 'deux-enfants', name: '1 parent, 2 enfants', hint: 'un sur chaque épaule', adults: 1, children: 2 },
  { id: 'deux-parents', name: '2 parents, 2 enfants', hint: 'un enfant chacun', adults: 2, children: 2 },
  { id: 'deux-parents-quatre-enfants', name: '2 parents, 4 enfants', hint: 'un sur chaque épaule', adults: 2, children: 4 },
];

export const findLayout = (id) => LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];

export const GENDERS = [
  { id: 'garcon', name: 'Garçon' },
  { id: 'fille', name: 'Fille' },
];

/** Coiffures proposées pour ce genre. */
export const hairsFor = (gender) => CHILD_HAIRS.filter((h) => gender === 'fille' || !h.girl);

export const ADULTS = [
  { id: 'papa', name: 'Papa' },
  { id: 'maman', name: 'Maman' },
];

export const findTheme = (id) => THEMES.find((t) => t.id === id) || THEMES[0];
export const findSkin = (id) => SKINS.find((s) => s.id === id) || SKINS[1];
export const findHair = (id) => HAIR_COLORS.find((h) => h.id === id) || HAIR_COLORS[0];

// --- couleurs ---

function rgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

const toHex = (parts) => `#${parts.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;

/** Mélange deux couleurs (t = 0 : la première, t = 1 : la seconde). */
export function mix(a, b, t) {
  const [x, y] = [rgb(a), rgb(b)];
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
}

/** Luminance relative (WCAG). */
export function luminance(hex) {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Rapport de contraste (WCAG) entre deux couleurs, de 1 à 21. */
export function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Teintes dérivées d'un maillot : ombre, ombre profonde, reflet. */
export function shirtTones(shirt) {
  const light = luminance(shirt) > 0.6;
  return {
    base: shirt,
    shade: mix(shirt, light ? '#5a6478' : '#000000', light ? 0.2 : 0.22),
    deep: mix(shirt, light ? '#3c465a' : '#000000', light ? 0.34 : 0.38),
    light: mix(shirt, '#ffffff', light ? 0.6 : 0.08),
  };
}
