// Emoji en couleur sur tous les écrans. Les images des jeux sont des emoji, dessinés par la police
// du système ; certains navigateurs n'en ont qu'en noir et blanc (celui des voitures Tesla, Chromium
// sous Linux sans police d'emoji en couleur). On le vérifie en dessinant une pomme : si elle n'a
// aucune couleur, on charge Twemoji (fonts/twemoji.woff2, réduite aux emoji de l'app par
// scripts/emoji/police.mjs), qui ne sert alors qu'aux emoji (classe emoji-secours, voir style.css).

const FAMILLE = 'Emoji couleur';
// les plages des emoji seulement : lettres, chiffres et ponctuation restent dans la police de l'app
const PLAGES = 'U+200D, U+2194-21AA, U+231A-23FF, U+24C2, U+25AA-25FE, U+2600-27BF, U+2934-2935, U+2B05-2B55, '
  + 'U+3030, U+303D, U+3297-3299, U+FE0F, U+1F000-1FAFF';

/**
 * Vrai si les emoji sont dessinés en couleur avec cette police. Dans le doute (pas de dessin
 * possible), vrai : on ne change rien.
 */
export function emojiEnCouleur(police = 'system-ui, sans-serif') {
  try {
    const taille = 32;
    const canvas = document.createElement('canvas');
    canvas.width = taille;
    canvas.height = taille;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.font = `24px ${police}`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#000';
    ctx.fillText('🍎', 2, 2);
    const { data } = ctx.getImageData(0, 0, taille, taille);
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
      if (a > 100 && Math.max(r, g, b) - Math.min(r, g, b) > 60) return true;
    }
    return false;
  } catch {
    return true;
  }
}

/** Au démarrage : charge les emoji en couleur de secours si l'appareil n'en a pas. */
export function emojiCouleur() {
  if (typeof FontFace === 'undefined' || !document.fonts || emojiEnCouleur()) return;
  const police = new FontFace(FAMILLE, 'url(fonts/twemoji.woff2)', { unicodeRange: PLAGES });
  document.fonts.add(police);
  police.load()
    .then(() => {
      if (emojiEnCouleur(`'${FAMILLE}'`)) document.documentElement.classList.add('emoji-secours');
    })
    .catch(() => {});
}
