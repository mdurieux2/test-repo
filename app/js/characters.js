// Les personnages qui guident l'enfant : un dessin « fille » ou « garçon », avec le
// prénom de l'enfant écrit sur le tee-shirt. Chaque famille crée ses propres profils
// (prénom, dessin, photo) : rien n'est propre à une famille dans le code.
// Les dessins sont en SVG (aucune image à télécharger).

export const LOOKS = {
  fille: {
    label: 'Fille',
    colors: { bg: '#ffd9e8', skin: '#f6c9a3', hair: '#7a4a2a', shirt: '#ff6fa8', accent: '#ff3d7f' },
    voice: { pitch: 1 },
  },
  garcon: {
    label: 'Garçon',
    colors: { bg: '#d6ecff', skin: '#efbf98', hair: '#3d2b1f', shirt: '#3d9bff' },
    voice: { pitch: 1 },
  },
};

/** Le personnage d'un profil : prénom, dessin, voix et phrase de présentation. */
export function makeCharacter(id, profile = {}) {
  const look = LOOKS[profile.look] ? profile.look : 'fille';
  const name = profile.name || 'Toi';
  const spoken = profile.spoken || name;
  return {
    id,
    name,
    spoken,
    look,
    voice: LOOKS[look].voice,
    hello: `Coucou ! Moi, c’est ${spoken}. On va bien s’amuser !`,
  };
}

/** Échappe le texte saisi (prénom) avant de l'écrire dans un dessin SVG. */
export function escapeXml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function face() {
  return `
    <circle cx="51" cy="60" r="4.2" fill="#2b2d42"/><circle cx="69" cy="60" r="4.2" fill="#2b2d42"/>
    <circle cx="52.6" cy="58.4" r="1.4" fill="#fff"/><circle cx="70.6" cy="58.4" r="1.4" fill="#fff"/>
    <ellipse cx="44" cy="68" rx="5" ry="3" fill="#ff8fab" opacity="0.55"/>
    <ellipse cx="76" cy="68" rx="5" ry="3" fill="#ff8fab" opacity="0.55"/>
    <path d="M51 69 Q60 80 69 69 Z" fill="#d94a5f" stroke="#2b2d42" stroke-width="2" stroke-linejoin="round"/>`;
}

/** Le prénom écrit sur le tee-shirt (plus petit si le prénom est long). */
function shirtName(name) {
  if (!name) return '';
  const size = Math.min(11.5, 100 / name.length).toFixed(1);
  return `<text x="60" y="108.5" text-anchor="middle" font-family="Andika, 'Avenir Next', sans-serif"
    font-weight="700" font-size="${size}" fill="#fff" letter-spacing="0.2">${escapeXml(name)}</text>`;
}

const DRAWINGS = {
  fille: (c, name) => `
    <path d="M31 56 C28 26 92 26 89 56 L93 100 C80 106 40 106 27 100 Z" fill="${c.hair}"/>
    <path d="M16 120 C18 98 38 90 60 90 C82 90 102 98 104 120 Z" fill="${c.shirt}"/>
    <path d="M48 90 Q60 97 72 90" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
    ${shirtName(name)}
    <rect x="52" y="76" width="16" height="16" rx="5" fill="${c.skin}"/>
    <circle cx="60" cy="56" r="26" fill="${c.skin}"/>
    <path d="M33 56 C31 33 47 25 61 27 C77 27 90 38 87 57 C80 45 70 39 58 41 C49 43 40 47 33 56 Z" fill="${c.hair}"/>
    <path d="M34 50 C29 66 31 82 35 94 L42 94 C38 80 37 64 40 52 Z" fill="${c.hair}"/>
    <path d="M86 50 C91 66 89 82 85 94 L78 94 C82 80 83 64 80 52 Z" fill="${c.hair}"/>
    <path d="M82 31 L69 22 L71 41 Z" fill="${c.accent}"/><path d="M82 31 L95 22 L93 41 Z" fill="${c.accent}"/>
    <circle cx="82" cy="31" r="4.5" fill="#ffb3cf"/>
    ${face()}`,
  garcon: (c, name) => `
    <path d="M16 120 C18 98 38 90 60 90 C82 90 102 98 104 120 Z" fill="${c.shirt}"/>
    ${shirtName(name)}
    <rect x="52" y="76" width="16" height="16" rx="5" fill="${c.skin}"/>
    <circle cx="34" cy="59" r="6" fill="${c.skin}"/><circle cx="86" cy="59" r="6" fill="${c.skin}"/>
    <circle cx="60" cy="56" r="26" fill="${c.skin}"/>
    <path d="M33 55 C29 30 47 22 62 24 C79 24 93 34 87 55 C84 45 79 40 73 40 C67 35 59 41 51 38 C44 40 38 45 33 55 Z" fill="${c.hair}"/>
    <path d="M57 26 C58 15 70 12 74 19 C69 19 64 21 62 27 Z" fill="${c.hair}"/>
    <path d="M45 51 Q51 48 56 51 M64 51 Q69 48 75 51" fill="none" stroke="${c.hair}" stroke-width="2.4" stroke-linecap="round"/>
    ${face()}`,
};

// Pour habiller son personnage : couleurs de tee-shirt et accessoires, débloqués avec les étoiles.
export const SHIRTS = [
  { id: 'rose', color: '#ff6fa8', stars: 0 }, { id: 'bleu', color: '#3d9bff', stars: 0 },
  { id: 'vert', color: '#22b07d', stars: 15 }, { id: 'violet', color: '#8b5cf6', stars: 25 },
  { id: 'orange', color: '#f97316', stars: 35 }, { id: 'rouge', color: '#e11d48', stars: 45 },
];
export const ACCESSORIES = [
  { id: 'casquette', emoji: '🧢', label: 'Casquette', stars: 5, y: 26, size: 40 },
  { id: 'noeud', emoji: '🎀', label: 'Nœud', stars: 10, y: 24, size: 30 },
  { id: 'couronne', emoji: '👑', label: 'Couronne', stars: 20, y: 25, size: 38 },
  { id: 'lunettes', emoji: '🕶️', label: 'Lunettes', stars: 30, y: 68, size: 34 },
  { id: 'chapeau', emoji: '🎩', label: 'Chapeau', stars: 40, y: 24, size: 40 },
  { id: 'toque', emoji: '🎓', label: 'Toque', stars: 60, y: 24, size: 38 },
  { id: 'fleur', emoji: '🌼', label: 'Fleur', stars: 80, y: 30, size: 26, x: 84 },
  { id: 'astronaute', emoji: '🪐', label: 'Planète', stars: 100, y: 22, size: 28, x: 92 },
];

/** Portrait SVG (chaîne de caractères) en buste, sur fond coloré, avec le prénom sur le tee-shirt. */
export function avatarSvg(look, name = '', { background = true, style = {} } = {}) {
  const key = LOOKS[look] ? look : 'fille';
  const shirt = SHIRTS.find((s) => s.id === style.shirt);
  const c = { ...LOOKS[key].colors, ...(shirt ? { shirt: shirt.color } : {}) };
  const extra = ACCESSORIES.find((a) => a.id === style.accessory);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="${escapeXml(name || LOOKS[key].label)}">
  ${background ? `<rect width="120" height="120" fill="${c.bg}"/>` : ''}
  ${DRAWINGS[key](c, name)}
  ${extra ? `<text x="${extra.x || 60}" y="${extra.y}" font-size="${extra.size}" text-anchor="middle" dominant-baseline="central">${extra.emoji}</text>` : ''}
</svg>`;
}
