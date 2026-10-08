// Défi chrono des tables : toujours 10 multiplications, le plus vite possible.
// Le temps va de l'affichage de la 1re question à la dernière bonne réponse ; une erreur
// ne fait pas perdre, le temps continue. Le record de chaque niveau (en secondes) est
// gardé sur le profil (child.records). Les fonctions de temps et de record sont pures
// (testées dans tests/) ; l'affichage est dans main.js.

import { pick, randInt } from '../random.js';

export const CHRONO_QUESTIONS = 10;

const LEVELS = [
  { label: 'Tables de 2, 5 et 10', tables: [2, 5, 10] },
  { label: 'Tables de 3 et 4', tables: [3, 4] },
  { label: 'Tables de 6 et 7', tables: [6, 7] },
  { label: 'Tables de 8 et 9', tables: [8, 9] },
  { label: 'Toutes les tables', tables: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
  { label: 'Multiplications à trou', tables: [2, 3, 4, 5, 6, 7, 8, 9] },
  // les niveaux suivants s'ajoutent à la fin : le record de chaque niveau est gardé par son numéro
  { label: 'Fois 10, fois 100', tables: [10, 100] },
  { label: 'Fois des dizaines', tables: [2, 3, 4, 5] },
];

/** Nombre de questions d'une partie : fixé par le jeu (défi chrono), sinon demandé, sinon le réglage. */
export function questionsPerSession(game, requested, setting) {
  return game.questions || requested || setting;
}

/** Secondes écoulées entre deux instants (en millisecondes), arrondies à la seconde inférieure. */
export function elapsedSeconds(start, end) {
  return Math.max(0, Math.floor((end - start) / 1000));
}

/** 65 → « 01:05 » (minutes:secondes). */
export function formatChrono(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** 65 → « 1 minute et 5 secondes » (pour la voix). */
export function spokenChrono(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  const part = (n, word) => `${n === 1 ? 'une' : n} ${word}${n > 1 ? 's' : ''}`;
  if (!min) return part(sec, 'seconde');
  return sec ? `${part(min, 'minute')} et ${part(sec, 'seconde')}` : part(min, 'minute');
}

/**
 * Enregistre un temps : renvoie les records mis à jour (sans modifier ceux reçus), le
 * meilleur temps, l'ancien record (ou null) et s'il est battu. Un temps égal ne bat pas le record.
 */
export function recordAfter(records, gameId, level, seconds) {
  const saved = records?.[gameId]?.[level];
  const previous = Number.isFinite(saved) && saved > 0 ? saved : null;
  const isNew = previous === null || seconds < previous;
  const best = isNew ? seconds : previous;
  return {
    records: { ...(records || {}), [gameId]: { ...(records?.[gameId] || {}), [level]: best } },
    best,
    previous,
    isNew,
  };
}

/**
 * Le chronomètre tourne-t-il ? Oui pour un défi chrono, sauf si l'enfant joue « sans chrono »
 * (profil d'accessibilité, a11y.js) : ni temps affiché, ni temps compté, ni record.
 */
export function chronoOn(game, settings) {
  return Boolean(game?.timed) && settings?.noTimer !== true;
}

/**
 * Une question de défi chrono jouée sans chrono : la consigne ne parle plus de vitesse
 * (« Défi chrono ! Dix calculs, le plus vite possible. » est retiré). Seules des phrases déjà
 * dites par le jeu sont gardées : la question seule (q.replay) et le texte court.
 */
export function untimedQuestion(q) {
  if (!q) return q;
  const calm = (text) => text.replace(/\s+vite(?=\s*[!?.])/u, ''); // « Calcule vite ! » → « Calcule ! »
  const plain = calm(q.short?.text ?? q.text.replace(/^Défi chrono\s*:\s*/u, ''));
  const text = plain.charAt(0).toUpperCase() + plain.slice(1);
  return {
    ...q,
    text,
    instruction: q.replay ?? q.instruction,
    ...(q.short ? { short: { ...q.short, key: q.short.key ?? q.short.text, text } } : {}),
  };
}

/**
 * Le niveau ne change pas pendant un défi (le record est celui du niveau joué) ; à la fin,
 * 9 bonnes réponses du premier coup sur 10 font monter, moins de 6 font redescendre.
 */
export function chronoLevelAfter(level, correct, total, min, max) {
  const ratio = total > 0 ? correct / total : 0;
  if (ratio >= 0.9) return Math.min(max, level + 1);
  if (ratio < 0.6) return Math.max(min, level - 1);
  return level;
}

export const tablesChrono = {
  id: 'tables-chrono',
  domain: 'maths',
  section: 'Nombres et calcul',
  title: 'Défi chrono des tables',
  icon: '⏱️',
  skill: 'Tables de multiplication : calculer vite et juste',
  levels: LEVELS.map((l) => l.label),
  questions: CHRONO_QUESTIONS, // une partie = toujours 10 questions, quel que soit le réglage
  timed: true, // chronomètre et record ; exclu du défi du jour et des révisions
  generate(level, rng) {
    const table = pick(rng, LEVELS[level - 1].tables);
    if (level === 6) {
      // … × 6 = 42 : le nombre qui manque (facteurs à un chiffre, pour que le calcul tienne sur l'écran)
      const n = randInt(rng, 2, 9);
      const product = n * table;
      const hideFirst = rng() < 0.5;
      const answer = hideFirst ? n : table;
      const ask = hideFirst ? `Combien de fois ${table} font ${product} ?` : `${n} fois combien font ${product} ?`;
      return {
        key: `tables-chrono:trou:${hideFirst ? `?x${table}` : `${n}x?`}=${product}`,
        interaction: 'keypad',
        text: 'Défi chrono : quel nombre manque ?',
        instruction: `Défi chrono ! Dix calculs, le plus vite possible. ${ask}`,
        short: { key: 'tables-chrono:trou', text: 'Quel nombre manque ?', speak: ask },
        replay: [ask],
        stage: { type: 'equation', parts: hideFirst ? [null, '×', table, '=', product] : [n, '×', null, '=', product] },
        choices: [],
        answer,
        maxDigits: 2,
        success: { speak: `${n} fois ${table}, égale ${product}` },
      };
    }
    // l'ordre des facteurs change : 3 × 7 ou 7 × 3 ; niveau 7 : 6 × 10, 100 × 4 ; niveau 8 : 3 × 40 (3 × 4 dizaines)
    const n = level === 7 ? randInt(rng, 2, 9) : level === 8 ? 10 * randInt(rng, 2, 9) : randInt(rng, 2, 10);
    const [a, b] = rng() < 0.5 ? [n, table] : [table, n];
    const answer = a * b;
    const ask = `${a} fois ${b} ?`;
    return {
      key: `tables-chrono:${a}x${b}`,
      interaction: 'keypad',
      text: 'Défi chrono : calcule vite !',
      instruction: `Défi chrono ! Dix calculs, le plus vite possible. Combien font ${a} fois ${b} ?`,
      short: { key: 'tables-chrono', text: 'Calcule vite !', speak: ask },
      replay: [`Combien font ${a} fois ${b} ?`],
      stage: { type: 'multiplication', a, b, groups: null },
      choices: [],
      answer,
      maxDigits: 3,
      success: { speak: `${a} fois ${b}, égale ${answer}` },
    };
  },
};
