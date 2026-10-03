// Règles de progression adaptative, sans dépendance au DOM (testées dans tests/).
//
// - 5 bonnes réponses du premier coup d'affilée  → niveau supérieur.
// - 3 erreurs sur les 5 dernières réponses        → on redescend d'un niveau,
//   pour que l'enfant reste dans la zone où il réussit (et garde confiance).

export const LEVEL_UP_STREAK = 5;
export const RECENT_WINDOW = 5;
export const LEVEL_DOWN_ERRORS = 3;

export function createGameState(level = 1) {
  return { level, streak: 0, recent: [] };
}

/**
 * Enregistre une réponse et renvoie le nouvel état + le changement de niveau éventuel.
 * @param {{level:number, streak:number, recent:boolean[]}} state
 * @param {boolean} firstTry  bonne réponse dès le premier essai
 * @param {number} maxLevel  niveau le plus haut prévu pour la classe de l'enfant
 * @param {number} minLevel  niveau le plus bas prévu pour la classe de l'enfant
 * @returns {{state: object, change: 'up'|'down'|null}}
 */
export function recordAnswer(state, firstTry, maxLevel, minLevel = 1) {
  const recent = [...state.recent, firstTry].slice(-RECENT_WINDOW);
  const streak = firstTry ? state.streak + 1 : 0;

  if (firstTry && streak >= LEVEL_UP_STREAK && state.level < maxLevel) {
    return { state: { level: state.level + 1, streak: 0, recent: [] }, change: 'up' };
  }
  const errors = recent.filter((ok) => !ok).length;
  if (!firstTry && errors >= LEVEL_DOWN_ERRORS && state.level > minLevel) {
    return { state: { level: state.level - 1, streak: 0, recent: [] }, change: 'down' };
  }
  return { state: { level: state.level, streak, recent }, change: null };
}

/** Étoiles gagnées en fin de partie : toujours au moins une pour l'effort. */
export function starsFor(correct, total) {
  if (total <= 0) return 0;
  const ratio = correct / total;
  if (ratio >= 0.9) return 3;
  if (ratio >= 0.6) return 2;
  return 1;
}

/** Étoiles de maîtrise d'un palier de calcul (0 à 5) : +1 par partie réussie à 80 %. */
export const PALIER_MAX_STARS = 5;
export function palierStarsAfter(current, correct, total) {
  const earned = total > 0 && correct / total >= 0.8 ? 1 : 0;
  return Math.min(PALIER_MAX_STARS, current + earned);
}
