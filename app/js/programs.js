// Programme par classe : quels jeux, et quels niveaux de chaque jeu. Construit à partir
// des programmes officiels (BO n°41 du 31/10/2024, en vigueur à la rentrée 2025, et
// programme de langues vivantes du BO n°12 du 19/03/2026) :
//   MS  : syllabes, rimes, lettres capitales ; dénombrer jusqu'à 6, formes, suites AB,
//         se repérer dans l'espace (labyrinthes, ombres), ranger par taille ;
//   GS  : son des lettres, premier son ; collections jusqu'à 10, décompositions, ajouter/retirer,
//         premiers problèmes, faire des paquets ;
//   CP  : correspondances lettres-sons, lecture de mots et de petits textes ; nombres jusqu'à 100,
//         calcul, problèmes, doubles, lire l'heure ;
//   CE1 : homophones, accords, compréhension de textes ; nombres jusqu'à 1000, tables, problèmes
//         en deux étapes, heure.
// [identifiant du jeu, niveau minimum, niveau maximum]. Le niveau s'adapte à
// l'enfant à l'intérieur de cette fourchette. Pour « calcul », les niveaux sont
// les paliers (1 = +5, 2 = −5, 3 = ±5, 4 = +10 … 36 = ±100).

import { DOMAINS, findGame } from './games/index.js';

export const PROGRAMS = {
  MS: {
    francais: [['syllabes-rythme', 1, 2], ['rimes', 1, 1], ['lettres', 1, 2], ['chemin-lettres', 1, 1]],
    maths: [
      ['compter', 1, 2], ['vite-vu', 1, 1], ['panier', 1, 3], ['relier', 1, 2],
      ['comparer', 1, 1], ['suite', 1, 1], ['faire-dix', 1, 1], ['ranger', 1, 2],
      ['formes', 1, 2], ['algorithmes', 1, 3], ['intrus', 1, 1], ['ombres', 1, 2], ['sudoku', 1, 1],
      ['labyrinthe', 1, 2], ['chemin-nombres', 1, 1],
    ],
    anglais: [['ecoute', 1, 3], ['compte-anglais', 1, 1], ['ou-est', 1, 1]],
  },
  GS: {
    francais: [
      ['syllabes-rythme', 1, 3], ['rimes', 1, 2], ['lettres', 2, 4], ['premier-son', 1, 2], ['syllabes', 1, 1],
      ['chemin-lettres', 1, 2],
    ],
    maths: [
      ['compter', 1, 4], ['vite-vu', 1, 2], ['panier', 1, 4], ['patates', 1, 2], ['relier', 1, 3],
      ['comparer', 1, 2], ['suite', 1, 2], ['faire-dix', 1, 2], ['calcul', 1, 6], ['relie-calculs', 1, 1], ['ranger', 1, 3],
      ['problemes', 1, 3], ['doubles', 1, 1],
      ['formes', 2, 3], ['algorithmes', 2, 4], ['intrus', 1, 2], ['ombres', 1, 3], ['sudoku', 1, 2],
      ['labyrinthe', 1, 3], ['chemin-nombres', 1, 2],
    ],
    anglais: [['ecoute', 1, 5], ['compte-anglais', 1, 2], ['ou-est', 1, 2]],
  },
  CP: {
    francais: [
      ['premier-son', 1, 3], ['syllabes', 1, 3], ['bon-mot', 1, 3], ['petits-mots', 1, 3], ['petits-textes', 1, 2],
      ['genre', 1, 1], ['chemin-lettres', 2, 3],
    ],
    maths: [
      ['compter', 1, 6], ['vite-vu', 1, 4], ['panier', 1, 7], ['patates', 2, 4], ['dizaines', 1, 4],
      ['comparer', 1, 3], ['suite', 1, 4], ['calcul', 1, 36], ['trous', 1, 4], ['relie-calculs', 1, 5], ['faire-dix', 1, 3], ['ranger', 3, 5],
      ['problemes', 1, 5], ['doubles', 1, 3],
      ['intrus', 1, 3], ['ombres', 2, 3], ['sudoku', 2, 4], ['heure', 1, 2],
      ['labyrinthe', 2, 4], ['chemin-nombres', 2, 7],
    ],
    anglais: [
      ['ecoute', 1, 10], ['lis-anglais', 1, 4], ['relie-anglais', 1, 4], ['compte-anglais', 1, 3], ['ou-est', 1, 3],
    ],
  },
  CE1: {
    francais: [
      ['bon-mot', 2, 3], ['petits-mots', 2, 3], ['petits-textes', 2, 3], ['phrase', 1, 2], ['homophones', 1, 2],
      ['genre', 1, 3], ['chemin-lettres', 3, 4],
    ],
    maths: [
      ['patates', 4, 5], ['dizaines', 2, 5],
      ['comparer', 2, 4], ['suite', 3, 5], ['calcul', 4, 36], ['trous', 3, 6], ['relie-calculs', 3, 6], ['tables', 1, 6], ['faire-dix', 2, 3],
      ['ranger', 5, 7], ['problemes', 4, 7], ['doubles', 2, 4],
      ['intrus', 2, 3], ['ombres', 3, 3], ['sudoku', 3, 6], ['heure', 2, 4],
      ['labyrinthe', 3, 6], ['chemin-nombres', 5, 8],
    ],
    anglais: [
      ['ecoute', 2, 10], ['lis-anglais', 1, 10], ['mot-anglais', 1, 10], ['relie-anglais', 1, 10],
      ['compte-anglais', 3, 4], ['ou-est', 2, 3], ['epelle-anglais', 1, 10],
    ],
  },
};

/** Les matières et jeux du programme d'une classe, avec la fourchette de niveaux de chaque jeu. */
export function programFor(grade) {
  const program = PROGRAMS[grade] || PROGRAMS.CP;
  return DOMAINS.map((domain) => ({
    ...domain,
    games: (program[domain.id] || []).map(([id, min, max]) => ({ game: findGame(id), min, max })),
  })).filter((d) => d.games.length);
}

/** Fourchette de niveaux d'un jeu pour une classe (tout le jeu s'il n'est pas au programme). */
export function levelRange(grade, gameId) {
  for (const entries of Object.values(PROGRAMS[grade] || {})) {
    const entry = entries.find(([id]) => id === gameId);
    if (entry) return { min: entry[1], max: entry[2] };
  }
  return { min: 1, max: findGame(gameId).levels.length };
}
