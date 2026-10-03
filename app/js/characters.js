// Eva-Rose et Matteo, les deux personnages qui guident l'enfant dans l'app.
// Les dessins sont en SVG (aucune image à télécharger) : couleurs de peau,
// de cheveux et de vêtements se modifient dans COLORS ci-dessous.

const COLORS = {
  'eva-rose': { bg: '#ffd9e8', skin: '#f6c9a3', hair: '#7a4a2a', shirt: '#ff6fa8', accent: '#ff3d7f' },
  matteo: { bg: '#d6ecff', skin: '#efbf98', hair: '#3d2b1f', shirt: '#3d9bff' },
};

export const CHARACTERS = [
  {
    id: 'eva-rose',
    name: 'Eva-Rose',
    spoken: 'Éva-Rose',
    voice: { voice: 'female', pitch: 1.05 },
    hello: 'Coucou ! Moi, c’est Éva-Rose. Tu viens jouer avec nous ?',
  },
  {
    id: 'matteo',
    name: 'Matteo',
    spoken: 'Mattéo',
    voice: { voice: 'male', pitch: 1 },
    hello: 'Salut ! Moi, c’est Mattéo. On va bien s’amuser !',
  },
];

export function character(id) {
  return CHARACTERS.find((c) => c.id === id);
}

function face() {
  return `
    <circle cx="51" cy="60" r="4.2" fill="#2b2d42"/><circle cx="69" cy="60" r="4.2" fill="#2b2d42"/>
    <circle cx="52.6" cy="58.4" r="1.4" fill="#fff"/><circle cx="70.6" cy="58.4" r="1.4" fill="#fff"/>
    <ellipse cx="44" cy="68" rx="5" ry="3" fill="#ff8fab" opacity="0.55"/>
    <ellipse cx="76" cy="68" rx="5" ry="3" fill="#ff8fab" opacity="0.55"/>
    <path d="M51 69 Q60 80 69 69 Z" fill="#d94a5f" stroke="#2b2d42" stroke-width="2" stroke-linejoin="round"/>`;
}

/** Le prénom écrit sur le tee-shirt. */
function shirtName(name) {
  return `<text x="60" y="108.5" text-anchor="middle" font-family="Andika, 'Avenir Next', sans-serif"
    font-weight="700" font-size="11.5" fill="#fff" letter-spacing="0.2">${name}</text>`;
}

const DRAWINGS = {
  'eva-rose': (c) => `
    <path d="M31 56 C28 26 92 26 89 56 L93 100 C80 106 40 106 27 100 Z" fill="${c.hair}"/>
    <path d="M16 120 C18 98 38 90 60 90 C82 90 102 98 104 120 Z" fill="${c.shirt}"/>
    <path d="M48 90 Q60 97 72 90" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
    ${shirtName('Eva-Rose')}
    <rect x="52" y="76" width="16" height="16" rx="5" fill="${c.skin}"/>
    <circle cx="60" cy="56" r="26" fill="${c.skin}"/>
    <path d="M33 56 C31 33 47 25 61 27 C77 27 90 38 87 57 C80 45 70 39 58 41 C49 43 40 47 33 56 Z" fill="${c.hair}"/>
    <path d="M34 50 C29 66 31 82 35 94 L42 94 C38 80 37 64 40 52 Z" fill="${c.hair}"/>
    <path d="M86 50 C91 66 89 82 85 94 L78 94 C82 80 83 64 80 52 Z" fill="${c.hair}"/>
    <path d="M82 31 L69 22 L71 41 Z" fill="${c.accent}"/><path d="M82 31 L95 22 L93 41 Z" fill="${c.accent}"/>
    <circle cx="82" cy="31" r="4.5" fill="#ffb3cf"/>
    ${face()}`,
  matteo: (c) => `
    <path d="M16 120 C18 98 38 90 60 90 C82 90 102 98 104 120 Z" fill="${c.shirt}"/>
    ${shirtName('Matteo')}
    <rect x="52" y="76" width="16" height="16" rx="5" fill="${c.skin}"/>
    <circle cx="34" cy="59" r="6" fill="${c.skin}"/><circle cx="86" cy="59" r="6" fill="${c.skin}"/>
    <circle cx="60" cy="56" r="26" fill="${c.skin}"/>
    <path d="M33 55 C29 30 47 22 62 24 C79 24 93 34 87 55 C84 45 79 40 73 40 C67 35 59 41 51 38 C44 40 38 45 33 55 Z" fill="${c.hair}"/>
    <path d="M57 26 C58 15 70 12 74 19 C69 19 64 21 62 27 Z" fill="${c.hair}"/>
    <path d="M45 51 Q51 48 56 51 M64 51 Q69 48 75 51" fill="none" stroke="${c.hair}" stroke-width="2.4" stroke-linecap="round"/>
    ${face()}`,
};

/** Portrait SVG (chaîne de caractères) d'un personnage en buste, sur fond coloré. */
export function avatarSvg(id, { background = true } = {}) {
  const c = COLORS[id];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="${character(id).name}">
  ${background ? `<rect width="120" height="120" fill="${c.bg}"/>` : ''}
  ${DRAWINGS[id](c)}
</svg>`;
}
