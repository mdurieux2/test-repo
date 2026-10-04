// Voix naturelle : chaque phrase prononcée a une clé (langue, vitesse, texte normalisé).
// Le même module sert à l'application (pour retrouver le son) et aux scripts de génération
// (pour savoir quels sons fabriquer) : les deux calculent donc exactement les mêmes clés.
//
// Une phrase absente est découpée en morceaux : les nombres et les prénoms ont leurs propres
// sons (« Combien font » + « 7 » + « plus » + « 5 »).

export const DEFAULT_RATE = 0.95;

/** Espaces insécables, apostrophes typographiques et espaces multiples ramenés à une forme unique. */
export function normaliser(text) {
  return String(text ?? '')
    .replace(/[   ]/g, ' ')
    .replace(/[’ʼ‘]/g, "'")
    .replace(/‑/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export function langue(lang = 'fr-FR') {
  return String(lang).toLowerCase().startsWith('en') ? 'en' : 'fr';
}

/** Vitesse relative à la vitesse normale, par pas de 0,05 (0,95 → 1 ; 0,8 → 0,85). */
export function vitesse(rate = DEFAULT_RATE) {
  return Math.round(((rate || DEFAULT_RATE) / DEFAULT_RATE) * 20) / 20;
}

export function cle(text, { lang, rate } = {}) {
  return `${langue(lang)}|${vitesse(rate)}|${normaliser(text)}`;
}

// nombres (« 7 », « 2,5 ») et ordinaux (« 1er », « 2e »)
const NUMBER = String.raw`\d+(?:[.,]\d+)?(?:er|re|e|ème)?(?![\p{L}\d])`;
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Un morceau de texte ne vaut la peine d'être dit que s'il contient une lettre. */
export function utile(text) {
  return /\p{L}/u.test(text);
}

// symboles et unités écrits en mots, pour que chaque morceau se prononce seul
const WORDS = {
  fr: { '+': 'plus', '−': 'moins', '×': 'fois', '÷': 'divisé par', '=': 'égale', '€': 'euros', h: 'heures', min: 'minutes', cm: 'centimètres', mm: 'millimètres', km: 'kilomètres', m: 'mètres', kg: 'kilos', g: 'grammes', L: 'litres', l: 'litres', ml: 'millilitres' },
  en: { '+': 'plus', '−': 'minus', '×': 'times', '÷': 'divided by', '=': 'equals' },
};

/** « 12 + 7 = ? » → « 12 plus 7 égale ? » ; « 8 h 15 » → « 8 heures 15 » ; « 3 € » → « 3 euros ». */
export function enMots(text, lang = 'fr') {
  const words = WORDS[langue(lang)];
  return normaliser(text)
    .replace(/(\d) ?- ?(\d)/g, '$1 − $2')
    .replace(/(^|\s)([+−×÷=])(?=\s|$)/g, (_, s, sym) => `${s}${words[sym] || sym}`)
    .replace(/(\d) ?(€|h|min|cm|mm|km|m|kg|g|L|l|ml)(?![\p{L}\d])/gu, (all, d, unit) => (words[unit] ? `${d} ${words[unit]}` : all));
}

/**
 * Découpe une phrase en morceaux : { type: 'nombre' | 'prenom' | 'texte', text }.
 * Les morceaux sans lettre (ponctuation seule) sont retirés.
 */
export function morceaux(text, prenoms = [], lang = 'fr') {
  const names = [...new Set(prenoms.map(normaliser).filter(Boolean))].sort((a, b) => b.length - a.length);
  const pattern = [NUMBER, ...names.map((n) => `(?<![\\p{L}])${escape(n)}(?![\\p{L}])`)].join('|');
  const re = new RegExp(`(${pattern})`, 'gu');
  const out = [];
  for (const raw of enMots(text, lang).split(re)) {
    const part = raw.trim();
    if (!part) continue;
    if (new RegExp(`^${NUMBER}$`, 'u').test(part)) out.push({ type: 'nombre', text: part });
    else if (names.includes(part)) out.push({ type: 'prenom', text: part });
    else if (utile(part)) out.push({ type: 'texte', text: part.replace(/^[,;:.!?)»\s]+/, '').trim() || part });
  }
  return out.filter((m) => m.type !== 'texte' || utile(m.text));
}
