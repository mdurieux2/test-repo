// Voix naturelle : chaque phrase prononcée a une clé (langue, vitesse, texte normalisé).
// Le même module sert à l'application (pour retrouver le son) et aux scripts de génération
// (pour savoir quels sons fabriquer) : les deux calculent donc exactement les mêmes clés.
//
// Un énoncé est dit phrase par phrase, chaque phrase d'un seul son (planLecture). Une phrase
// absente est dite par propositions (coupées aux virgules), puis par morceaux (les nombres et les
// prénoms ont leurs propres sons : « Combien font » + « 7 » + « plus » + « 5 »), puis mot à mot :
// toujours avec la même voix.

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

/**
 * Vitesse relative à la vitesse normale, ramenée à quatre allures : 0,8 (mot à écouter
 * lentement), 0,9 (histoire lue), 1 et 1,1 (comptage). Ralentir davantage déforme la voix.
 */
export function vitesse(rate = DEFAULT_RATE) {
  const r = (rate || DEFAULT_RATE) / DEFAULT_RATE;
  if (r >= 1.08) return 1.1;
  if (r >= 0.95) return 1;
  if (r >= 0.85) return 0.9;
  return 0.8;
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

/** Lettre ou chiffre : il y a quelque chose à dire (« 4, 5, 8 »). */
function dicible(text) {
  return /[\p{L}\d]/u.test(text);
}

/** Phrases d'un énoncé, coupées après « . », « ! » et « ? ». */
export function phrases(text) {
  return normaliser(text).split(/(?<=[.!?])\s+(?=\S)/u).map((s) => s.trim()).filter(dicible);
}

/** Propositions d'une phrase, coupées après « , », « ; », « : » et « … » (une pause naturelle). */
export function propositions(sentence) {
  return normaliser(sentence).split(/(?<=[,;:…])\s+(?=\S)/u).map((s) => s.trim()).filter(dicible);
}

/** Mots d'un morceau, sans la ponctuation autour, en minuscules (« L'arbre ! » → « l'arbre »). */
export function mots(text) {
  return normaliser(text).split(' ')
    .map((w) => w.replace(/^[^\p{L}\d]+|[^\p{L}\d]+$/gu, '').toLowerCase())
    .filter(dicible);
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

// pause après un son, selon la coupure (en secondes, en plus des courts silences des sons)
export const PAUSES = { phrase: 0.25, virgule: 0.1, court: 0, mot: 0 };

/** Coupe un texte autour des prénoms : [{ type: 'prenom' | 'texte', text }] (les nombres restent dans le texte). */
export function autourDesPrenoms(text, prenoms = []) {
  const names = [...new Set(prenoms.map(normaliser).filter(Boolean))].sort((a, b) => b.length - a.length);
  if (!names.length) return [{ type: 'texte', text: normaliser(text) }];
  const re = new RegExp(`(${names.map((n) => `(?<![\\p{L}])${escape(n)}(?![\\p{L}])`).join('|')})`, 'gu');
  return normaliser(text).split(re).map((t) => t.trim()).filter(dicible)
    .map((t) => (names.includes(t) ? { type: 'prenom', text: t } : { type: 'texte', text: t.replace(/^[,;:.!?)»\s]+/, '').trim() || t }))
    .filter((m) => dicible(m.text));
}

/**
 * Plan de lecture d'un énoncé avec les sons disponibles (`has(clé)`) : la liste des sons à
 * enchaîner, chacun avec la pause qui le suit ({ key, text, pause, kind }) ; [] s'il n'y a rien à
 * dire, null s'il manque un son.
 * Ordre de préférence : l'énoncé entier, chaque phrase entière, chaque proposition (coupée à la
 * virgule), les bouts entre les prénoms, les morceaux (nombres à part), et enfin les mots un par un.
 */
export function planLecture(text, has, { lang = 'fr-FR', rate, names = [] } = {}) {
  const l = langue(lang);
  const out = [];
  // un nombre, un prénom ou un mot seul peut être pris à la vitesse normale ; un prénom, en français
  const take = (t, pause, kind, normalSpeed = false) => {
    const keys = [cle(t, { lang, rate })];
    if (normalSpeed) keys.push(cle(t, { lang }));
    if (kind === 'prenom') keys.push(cle(t));
    for (const key of keys) {
      if (has(key)) {
        out.push({ key, text: normaliser(t), pause, kind });
        return true;
      }
    }
    return false;
  };
  if (take(text, 'phrase', 'phrase')) return out;
  for (const sentence of phrases(enMots(text, l))) {
    if (take(sentence, 'phrase', 'phrase')) continue;
    const props = propositions(sentence);
    for (const [i, prop] of props.entries()) {
      const end = i === props.length - 1 ? 'phrase' : 'virgule';
      if (take(prop, end, 'proposition')) continue;
      const parts = autourDesPrenoms(prop, names);
      for (const [j, part] of parts.entries()) {
        const partEnd = j === parts.length - 1 ? end : 'court';
        // prénoms (et nombres, plus bas) : à la vitesse demandée s'il existe, sinon à la vitesse normale
        if (part.type === 'prenom') {
          if (!take(part.text, partEnd, 'prenom', true)) return null;
          continue;
        }
        if (parts.length > 1 && take(part.text, partEnd, 'segment')) continue;
        const pieces = morceaux(part.text, [], l);
        for (const [k, piece] of pieces.entries()) {
          const pause = k === pieces.length - 1 ? partEnd : 'court';
          if (take(piece.text, pause, piece.type, piece.type !== 'texte')) continue;
          if (piece.type !== 'texte') return null;
          const words = mots(piece.text);
          for (const [n, word] of words.entries()) {
            if (!take(word, n === words.length - 1 ? pause : 'mot', 'mot', true)) return null;
          }
        }
      }
    }
  }
  return out;
}

/**
 * Pire coupure d'un plan : 'entier' (seulement entre des phrases), 'virgule', 'prenom' (autour d'un
 * prénom), 'court' (autour d'un nombre ou d'un morceau) ou 'mot' (mot à mot) ; 'absent' sans plan.
 */
export function qualitePlan(plan) {
  if (!plan) return 'absent';
  const order = ['entier', 'virgule', 'prenom', 'court', 'mot'];
  let worst = 0;
  for (let i = 0; i < plan.length - 1; i++) {
    const { pause, kind } = plan[i];
    let level = pause === 'phrase' ? 'entier' : pause;
    if (level === 'court' && (kind === 'prenom' || plan[i + 1].kind === 'prenom')) level = 'prenom';
    worst = Math.max(worst, order.indexOf(level));
  }
  return order[worst];
}
