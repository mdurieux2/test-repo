// Couleurs nommées (réglage d'accessibilité « namedColors », pour les enfants daltoniens) :
// partout où une couleur porte une information, son nom est écrit sur la pastille ou dessous.

// Émojis dont la couleur est l'information principale (suites de motifs, mélanges de couleurs).
const EMOJIS_COULEUR = {
  '🔴': 'rouge', '🟠': 'orange', '🟡': 'jaune', '🟢': 'vert', '🔵': 'bleu', '🟣': 'violet', '🟤': 'marron', '⚫': 'noir', '⚪': 'blanc',
  '🟥': 'rouge', '🟧': 'orange', '🟨': 'jaune', '🟩': 'vert', '🟦': 'bleu', '🟪': 'violet', '🟫': 'marron', '⬛': 'noir', '⬜': 'blanc',
};
// Émojis dont la couleur compte seulement dans les jeux d'anglais (« a red apple », « a green book ») :
// ailleurs, une pomme est une pomme.
const EMOJIS_COULEUR_ANGLAIS = {
  '❤': 'rouge', '🧡': 'orange', '💛': 'jaune', '💚': 'vert', '💙': 'bleu', '💜': 'violet', '🖤': 'noir', '🤍': 'blanc', '🤎': 'marron',
  '📕': 'rouge', '📗': 'vert', '📘': 'bleu', '📙': 'orange', '🍎': 'rouge', '🍏': 'vert', '🚗': 'rouge', '🚙': 'bleu',
};

/** Le nom de la couleur d'un émoji (« 🟥 » → « rouge »), ou null. */
export function couleurEmoji(texte, domain = null) {
  if (typeof texte !== 'string') return null;
  const t = texte.replace(/️/g, '').trim();
  return EMOJIS_COULEUR[t] || (domain === 'anglais' ? EMOJIS_COULEUR_ANGLAIS[t] : null) || null;
}

/**
 * Le nom à écrire près de la couleur : en français, entre parenthèses dans les jeux d'anglais
 * (l'enfant doit reconnaître le mot anglais : on lui donne le nom français, pas la réponse).
 */
export function nomAffiche(nom, domain = null) {
  if (!nom) return '';
  return domain === 'anglais' ? `(${nom})` : nom;
}
