// Profil d'accessibilité de chaque enfant, réglé par les parents (espace parents) et gardé sur
// l'appareil avec le profil. Chaque réglage est appliqué à toute l'app : classes `a11y-…` sur
// <body> pour la mise en page, et `a11y(child).clé` pour le comportement des jeux.

export const A11Y_DEFAULTS = Object.freeze({
  textSize: 1, // taille du texte : 1 (normale), 1.15 (grande) ou 1.3 (très grande)
  spacing: false, // texte plus espacé (lettres, mots, lignes)
  contrast: false, // fort contraste
  bigTargets: false, // grandes cibles : boutons et cases plus grands
  calm: false, // mode calme : sans décor de saison ni musique, animations réduites
  noTimer: false, // sans chrono : les défis chronométrés se jouent sans le temps
  syllables: false, // syllabes colorées dans les textes à lire
  namedColors: false, // couleurs nommées (daltonisme) : chaque couleur porte son nom ou un motif
  captions: false, // sous-titres : tout ce que dit Estelle est aussi écrit
  skipListening: false, // niveaux d'écoute facultatifs (surdité) : les questions qui ne se jouent qu'à l'oreille sont écartées
  tapOnly: false, // toucher plutôt que glisser : chaque geste glissé ou tracé a une version en touchers
});

export const TEXT_SIZES = [1, 1.15, 1.3];

/** Profil nettoyé : seulement les clés connues, avec des valeurs valides. */
export function cleanA11y(saved) {
  const out = { ...A11Y_DEFAULTS };
  if (!saved || typeof saved !== 'object') return out;
  for (const key of Object.keys(A11Y_DEFAULTS)) {
    if (key === 'textSize') out.textSize = TEXT_SIZES.includes(saved.textSize) ? saved.textSize : 1;
    else out[key] = saved[key] === true;
  }
  return out;
}

/** Le profil d'accessibilité d'un enfant (valeurs par défaut s'il n'en a pas). */
export function a11y(child) {
  return cleanA11y(child?.a11y);
}

/** Applique le profil à la page : une classe par réglage actif, et la taille du texte. */
export function applyA11y(child, root = globalThis.document?.body) {
  if (!root) return;
  const settings = a11y(child);
  for (const [key, value] of Object.entries(settings)) {
    if (key === 'textSize') continue;
    root.classList.toggle(`a11y-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`, value);
  }
  root.style.setProperty('--text-scale', String(settings.textSize));
  root.classList.toggle('a11y-text-large', settings.textSize > 1);
  // les tailles en rem suivent la police de <html> : la taille du texte y est aussi posée (style.css)
  const html = root.ownerDocument?.documentElement;
  if (html && html !== root) html.style.setProperty('--text-scale', String(settings.textSize));
}
