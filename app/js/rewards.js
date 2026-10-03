// Album d'autocollants : un nouvel autocollant toutes les STARS_PER_STICKER étoiles.

export const STARS_PER_STICKER = 5;

export const STICKERS = [
  { emoji: '🐶', name: 'le chien' },
  { emoji: '🐱', name: 'le chat' },
  { emoji: '🐰', name: 'le lapin' },
  { emoji: '🦊', name: 'le renard' },
  { emoji: '🐻', name: "l'ours" },
  { emoji: '🐼', name: 'le panda' },
  { emoji: '🐨', name: 'le koala' },
  { emoji: '🐯', name: 'le tigre' },
  { emoji: '🦁', name: 'le lion' },
  { emoji: '🐮', name: 'la vache' },
  { emoji: '🐷', name: 'le cochon' },
  { emoji: '🐸', name: 'la grenouille' },
  { emoji: '🐵', name: 'le singe' },
  { emoji: '🐔', name: 'la poule' },
  { emoji: '🐧', name: 'le pingouin' },
  { emoji: '🦉', name: 'le hibou' },
  { emoji: '🦄', name: 'la licorne' },
  { emoji: '🐝', name: "l'abeille" },
  { emoji: '🦋', name: 'le papillon' },
  { emoji: '🐢', name: 'la tortue' },
  { emoji: '🐙', name: 'la pieuvre' },
  { emoji: '🐬', name: 'le dauphin' },
  { emoji: '🐳', name: 'la baleine' },
  { emoji: '🦈', name: 'le requin' },
  { emoji: '🐊', name: 'le crocodile' },
  { emoji: '🦒', name: 'la girafe' },
  { emoji: '🐘', name: "l'éléphant" },
  { emoji: '🦓', name: 'le zèbre' },
  { emoji: '🦖', name: 'le dinosaure' },
  { emoji: '🐉', name: 'le dragon' },
];

export function stickersUnlocked(totalStars) {
  return Math.min(STICKERS.length, Math.floor(totalStars / STARS_PER_STICKER));
}

/** Autocollants débloqués en passant de `before` à `after` étoiles. */
export function newStickers(before, after) {
  return STICKERS.slice(stickersUnlocked(before), stickersUnlocked(after));
}

/** Étoiles restantes avant le prochain autocollant (null si l'album est complet). */
export function starsToNextSticker(totalStars) {
  if (stickersUnlocked(totalStars) >= STICKERS.length) return null;
  return STARS_PER_STICKER - (totalStars % STARS_PER_STICKER);
}
