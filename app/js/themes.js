// Décors de saison (Noël, Halloween, printemps, été, automne, hiver), selon la date.

/** Le décor du moment pour une date : identifiant et petits motifs. */
export function seasonOf(date) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if (m === 12) return { id: 'noel', deco: ['🎄', '⭐', '🎁', '❄️'] };
  if ((m === 10 && d >= 20) || (m === 11 && d <= 2)) return { id: 'halloween', deco: ['🎃', '🦇', '🍬', '👻'] };
  if ((m === 3 && d >= 20) || m === 4 || m === 5 || (m === 6 && d < 21)) return { id: 'printemps', deco: ['🌸', '🌷', '🐝', '🦋'] };
  if ((m === 6 && d >= 21) || m === 7 || m === 8 || (m === 9 && d < 23)) return { id: 'ete', deco: ['☀️', '🏖️', '🍉', '🐚'] };
  if (m === 9 || m === 10 || m === 11) return { id: 'automne', deco: ['🍂', '🍁', '🍄', '🌰'] };
  return { id: 'hiver', deco: ['❄️', '⛄', '🧣', '🌨️'] };
}

/** Le nom de chaque saison (histoires et textes de saison, écran des voix des parents). */
export const SEASON_LABELS = {
  noel: '🎄 Noël', halloween: '🎃 Halloween', hiver: '❄️ Hiver', printemps: '🌸 Printemps', ete: '☀️ Été', automne: '🍂 Automne',
};
