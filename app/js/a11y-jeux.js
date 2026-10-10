// Accessibilité dans les jeux (sans DOM, testé par tests/a11y-interactions.test.js) :
// - « Toucher plutôt que glisser » (réglage tapOnly) : les consignes qui demandent de glisser ou de
//   tracer sont dites autrement (« touche… »), car chaque jeu se joue aussi par touchers successifs.
// - « Niveaux d'écoute facultatifs » (réglage skipListening) : les questions marquées
//   `listenOnly: true` (elles ne se jouent qu'à l'oreille) sont remplacées par une autre question du
//   même niveau ; un niveau entièrement à l'oreille est passé ; un jeu entièrement à l'oreille est
//   masqué de l'accueil.

import { createRng } from './random.js';

// ---------------------------------------------------------------- Toucher plutôt que glisser

/** Phrases des consignes à changer : [ce qui est écrit dans le jeu, ce qu'on dit à la place]. */
const TAP_WORDING = [
  // Écris au doigt
  [/Suis le chemin avec ton doigt, en partant du point vert\./g, 'Touche les points du chemin, un par un, en partant du point vert.'],
  [/, sans lever le doigt\./g, '.'],
  // labyrinthes
  [/Glisse ton doigt, ou touche les cases, pour guider ([^.!?]+)\./g, 'Touche les cases, une par une, pour guider $1.'],
  [/Glisse ton doigt le long du chemin pour guider ([^.!?]+)\./g, 'Touche les cases du chemin pour guider $1.'],
  [/Glisse ton doigt pour l’aider à sortir et à trouver ([^.!?]+)\./g, 'Touche les cases du chemin pour l’aider à sortir et à trouver $1.'],
  // patates
  [/Fais des patates : entoure des paquets de (\d+) ([^.!?]+) avec ton doigt\./g, 'Fais des paquets de $1 $2 : touche-les un par un.'],
  // calculs à trous, relie les calculs
  [/Glisse les nombres dans les cases, pour que/g, 'Touche une case, puis un nombre, pour que'],
  [/Glisse les nombres dans les cases\./g, 'Touche une case, puis un nombre.'],
  [/Trace un trait avec ton doigt, de chaque calcul jusqu’à son résultat\./g, 'Touche chaque calcul, puis son résultat.'],
];

/** Une consigne écrite pour le doigt qui glisse, dite pour le doigt qui touche. */
export function tapText(text) {
  if (typeof text !== 'string') return text;
  return TAP_WORDING.reduce((out, [from, to]) => out.replace(from, to), text);
}

/** Un morceau d'énoncé (chaîne ou { text, … }) ou une liste de morceaux. */
function tapParts(parts) {
  if (Array.isArray(parts)) return parts.map(tapParts);
  if (parts && typeof parts === 'object' && typeof parts.text === 'string') return { ...parts, text: tapText(parts.text) };
  return tapText(parts);
}

/** La question, avec ses consignes (écrites et dites) pour le toucher. */
export function tapQuestion(q) {
  if (!q) return q;
  const out = { ...q, text: tapText(q.text), instruction: tapParts(q.instruction) };
  if (q.replay) out.replay = tapParts(q.replay);
  if (q.short) {
    out.short = { ...q.short, text: tapText(q.short.text) };
    if (q.short.speak !== undefined) out.short.speak = tapParts(q.short.speak);
  }
  return out;
}

/** Ce qui ne doit plus apparaître dans une consigne avec le réglage (vérifié par les tests). */
export const DRAG_WORDS = /\b(Glisse|glisse ton doigt|Entoure|entoure des|Trace un trait|avec ton doigt|sans lever le doigt)\b/;

// ---------------------------------------------------------------- Niveaux d'écoute facultatifs

/** Nombre d'essais pour trouver, au même niveau, une question qui ne se joue pas qu'à l'oreille. */
export const PLAYABLE_TRIES = 12;

export function isListenOnly(q) {
  return q?.listenOnly === true;
}

/**
 * Une question jouable sans entendre : `generate(level, index)` est appelé au même niveau (avec un
 * index différent à chaque essai : certains jeux alternent leurs formes de questions), puis aux
 * niveaux suivants (jusqu'à max), puis aux niveaux précédents (jusqu'à min).
 * Renvoie { q, level } ; `listenOnly: true` si aucun niveau n'a de question jouable.
 */
export function playableQuestion(generate, { level, levels: allowed = [level], index = 0, tries = PLAYABLE_TRIES }) {
  // le niveau demandé, puis les suivants de la classe, puis les précédents (du plus proche au plus loin)
  const levels = [level, ...allowed.filter((l) => l > level), ...allowed.filter((l) => l < level).reverse()];
  let last = null;
  for (const l of levels) {
    for (let k = 0; k < tries; k++) {
      const q = generate(l, index + k);
      last = { q, level: l };
      if (!isListenOnly(q)) return last;
    }
  }
  return { ...last, listenOnly: true };
}

/** Questions tirées pour savoir si un niveau entier ne se joue qu'à l'oreille. */
export const LEVEL_SAMPLES = 24;

/** Le niveau ne se joue-t-il qu'à l'oreille ? (tirage fixe : la réponse ne change pas) */
export function levelListenOnly(game, level, samples = LEVEL_SAMPLES) {
  const rng = createRng(level * 7919 + 17);
  for (let i = 0; i < samples; i++) {
    if (!isListenOnly(game.generate(level, rng, i, { name: 'Lou', season: 'printemps' }))) return false;
  }
  return true;
}

const gameCache = new Map();

/** Le jeu (aux niveaux de la classe de l'enfant) ne se joue-t-il qu'à l'oreille ? */
export function gameListenOnly(game, levels = game.levels.map((_, i) => i + 1)) {
  const key = `${game.id}:${levels.join(',')}`;
  if (!gameCache.has(key)) gameCache.set(key, levels.every((level) => levelListenOnly(game, level)));
  return gameCache.get(key);
}

/** Les rubriques sans les jeux qui ne se jouent qu'à l'oreille (et sans rubrique vide). */
export function withoutListenOnly(domains) {
  return domains
    .map((domain) => ({ ...domain, games: domain.games.filter(({ game, levels }) => !gameListenOnly(game, levels)) }))
    .filter((domain) => domain.games.length);
}

// ---------------------------------------------------------------- Sous-titres sans la réponse

/** Ce que le bandeau écrit à la place d'un mot à trouver à l'oreille. */
export const CAPTION_HIDDEN = '🔊 …';

const plain = (text) => String(text).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/**
 * Le texte d'un morceau dit, tel que les sous-titres l'écrivent pendant la question `q` : ce qu'il
 * faut trouver en écoutant n'est pas écrit (sinon la dictée devient une copie). Le mot dit qui est la
 * réponse (dictée, lettre ou mot anglais entendu, phrase à remettre dans l'ordre) est remplacé par
 * « 🔊 … » ; pour une question qui ne se joue qu'à l'oreille, aussi les mots dits seuls et l'anglais ;
 * pour la ponctuation à choisir d'après l'intonation, le signe de la fin.
 */
export function captionPart({ text, lang }, q) {
  if (!q || typeof text !== 'string') return text;
  const answer = typeof q.answer === 'string' || typeof q.answer === 'number' ? String(q.answer) : '';
  if (/^[.?!]$/.test(answer)) return /[.?!…]\s*$/.test(text) && text.trim().split(/\s+/).length > 1 && !/^(Écoute|Quel|Touche)/.test(text) ? text.replace(/\s*[.?!…]+\s*$/, ' …') : text;
  if (answer && plain(answer) && plain(text) === plain(answer)) return CAPTION_HIDDEN;
  if (q.listenOnly) {
    if (lang && !lang.startsWith('fr')) return CAPTION_HIDDEN;
    if (!/\s/.test(text.trim()) && !/[.!?:]$/.test(text.trim())) return CAPTION_HIDDEN;
  }
  return text;
}
