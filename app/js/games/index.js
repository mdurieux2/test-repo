import { LECTURE_GAMES } from './lecture.js';
import { FRANCAIS_EXTRA_GAMES } from './francais-extra.js';
import { MATHS_GAMES } from './maths.js';
import { MATHS_EXTRA_GAMES } from './maths-extra.js';
import { ANGLAIS_GAMES } from './anglais.js';

export const DOMAINS = [
  { id: 'francais', title: 'Français', icon: '📚', games: [...FRANCAIS_EXTRA_GAMES.slice(0, 3), ...LECTURE_GAMES, ...FRANCAIS_EXTRA_GAMES.slice(3)] },
  { id: 'maths', title: 'Maths', icon: '🔢', games: [...MATHS_GAMES, ...MATHS_EXTRA_GAMES] },
  { id: 'anglais', title: 'Anglais', icon: '🇬🇧', games: ANGLAIS_GAMES },
];

export const GAMES = DOMAINS.flatMap((d) => d.games);

export function findGame(id) {
  return GAMES.find((g) => g.id === id);
}
