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
    francais: [
      ['syllabes-rythme', 1, 2], ['rimes', 1, 1], ['lettres', 1, 2],
      ['ecrire', 1, 3],
    ],
    histoires: [
      ['histoires', 1, 1],
    ],
    maths: [
      ['compter', 1, 2], ['vite-vu', 1, 1], ['panier', 1, 3], ['relier', 1, 2], ['comparer', 1, 1],
      ['suite', 1, 1], ['faire-dix', 1, 1], ['ranger', 1, 2],
    ],
    jeux: [
      ['formes', 1, 2], ['algorithmes', 1, 3], ['intrus', 1, 1], ['ombres', 1, 2], ['sudoku', 1, 1],
      ['tangram', 1, 1], ['cubes', 1, 1], ['labyrinthe', 1, 2], ['chemin-nombres', 1, 1],
      ['chemin-lettres', 1, 1],
      ['puzzle', 1, 3], ['memory', 1, 3], ['coloriage-magique', 1, 2], ['points', 1, 2],
    ],
    temps: [
      ['saisons', 1, 1],
    ],
    monde: [
      ['animaux-monde', 1, 1],
    ],
    anglais: [
      ['ecoute', 1, 3], ['compte-anglais', 1, 1], ['ou-est', 1, 1],
    ],
  },
  GS: {
    francais: [
      ['syllabes-rythme', 1, 6], ['rimes', 1, 5], ['lettres', 2, 7], ['premier-son', 1, 2],
      ['syllabes', 1, 1], ['ecrire', 1, 5],
      ['dictee', 1, 1],
    ],
    histoires: [
      ['histoires', 1, 1],
    ],
    maths: [
      ['compter', 1, 4], ['vite-vu', 1, 2], ['panier', 1, 4], ['patates', 1, 2], ['relier', 1, 6],
      ['comparer', 1, 2], ['suite', 1, 2], ['calcul', 1, 6], ['relie-calculs', 1, 1], ['faire-dix', 1, 2],
      ['ranger', 1, 3], ['problemes', 1, 3], ['doubles', 1, 1],
    ],
    jeux: [
      ['formes', 2, 6], ['algorithmes', 2, 7], ['intrus', 1, 2], ['ombres', 1, 3], ['sudoku', 1, 2],
      ['symetrie', 1, 1], ['reproduire', 1, 1], ['tangram', 1, 2], ['cubes', 1, 2], ['labyrinthe', 1, 3],
      ['chemin-nombres', 1, 2], ['chemin-lettres', 1, 2],
      ['puzzle', 1, 4], ['memory', 1, 5], ['coloriage-magique', 1, 3], ['points', 1, 3],
    ],
    temps: [
      ['saisons', 1, 2], ['mesures', 1, 1],
    ],
    monde: [
      ['animaux-monde', 1, 2],
      ['drapeaux', 1, 1],
    ],
    anglais: [
      ['ecoute', 1, 5], ['compte-anglais', 1, 2], ['ou-est', 1, 2], ['parle-anglais', 1, 1],
      ['nombres-anglais', 1, 1], ['couleurs-anglais', 1, 1], ['intrus-anglais', 1, 1], ['contraires-anglais', 1, 1],
    ],
  },
  CP: {
    francais: [
      ['premier-son', 1, 6], ['syllabes', 1, 6], ['bon-mot', 1, 3], ['petits-mots', 1, 3], ['genre', 1, 1],
      ['ecrire', 2, 5],
      ['dictee', 1, 5],
    ],
    histoires: [
      ['histoires', 1, 2], ['petits-textes', 1, 2],
    ],
    maths: [
      ['compter', 1, 9], ['vite-vu', 1, 7], ['panier', 1, 10], ['patates', 2, 4], ['dizaines', 1, 4],
      ['comparer', 1, 3], ['suite', 1, 4], ['calcul', 1, 36], ['trous', 1, 4], ['relie-calculs', 1, 5],
      ['faire-dix', 1, 3], ['ranger', 3, 5], ['problemes', 1, 5], ['doubles', 1, 3],
    ],
    jeux: [
      ['intrus', 1, 3], ['ombres', 2, 3], ['sudoku', 2, 4], ['symetrie', 1, 3], ['reproduire', 1, 2],
      ['tangram', 1, 2], ['cubes', 1, 3], ['labyrinthe', 2, 4], ['chemin-nombres', 2, 7],
      ['chemin-lettres', 2, 3],
      ['puzzle', 2, 5], ['memory', 3, 6], ['coloriage-magique', 2, 5], ['points', 2, 5],
    ],
    temps: [
      ['heure', 1, 2], ['calendrier', 1, 2], ['saisons', 1, 3], ['monnaie', 1, 3], ['mesures', 1, 4],
    ],
    monde: [
      ['animaux-monde', 1, 3], ['pays', 1, 2],
      ['drapeaux', 1, 4],
    ],
    anglais: [
      ['ecoute', 1, 10], ['lis-anglais', 1, 4], ['relie-anglais', 1, 4], ['compte-anglais', 1, 3],
      ['ou-est', 1, 3], ['parle-anglais', 1, 2],
      ['nombres-anglais', 1, 4], ['calcul-anglais', 1, 2], ['couleurs-anglais', 1, 2], ['colorie-anglais', 1, 2],
      ['memory-anglais', 1, 3], ['intrus-anglais', 1, 2], ['contraires-anglais', 1, 2], ['phrase-anglais', 1, 1],
    ],
  },
  CE1: {
    francais: [
      ['bon-mot', 2, 6], ['petits-mots', 2, 6], ['phrase', 1, 5], ['homophones', 1, 5], ['genre', 1, 6],
      ['ecrire', 4, 5],
      ['dictee', 2, 6],
    ],
    histoires: [
      ['histoires', 2, 6], ['petits-textes', 2, 6],
    ],
    maths: [
      ['patates', 4, 8], ['dizaines', 2, 8], ['comparer', 2, 7], ['suite', 3, 8], ['calcul', 4, 36],
      ['trous', 3, 9], ['relie-calculs', 3, 9], ['faire-dix', 2, 6], ['tables', 1, 9], ['ranger', 5, 10],
      ['problemes', 4, 10], ['doubles', 2, 7],
    ],
    jeux: [
      ['intrus', 2, 6], ['ombres', 3, 6], ['sudoku', 3, 9], ['symetrie', 2, 7], ['reproduire', 2, 6],
      ['tangram', 2, 5], ['cubes', 2, 7], ['labyrinthe', 3, 9], ['chemin-nombres', 5, 11],
      ['chemin-lettres', 3, 7],
      ['puzzle', 3, 6], ['memory', 4, 7], ['coloriage-magique', 3, 7], ['points', 3, 7],
    ],
    temps: [
      ['heure', 2, 7], ['calendrier', 2, 7], ['saisons', 2, 7], ['monnaie', 2, 7], ['mesures', 2, 8],
    ],
    monde: [
      ['animaux-monde', 2, 7], ['pays', 1, 6],
      ['drapeaux', 1, 6],
    ],
    anglais: [
      ['ecoute', 2, 13], ['lis-anglais', 1, 13], ['mot-anglais', 1, 13], ['relie-anglais', 1, 13],
      ['compte-anglais', 3, 7], ['ou-est', 2, 6], ['epelle-anglais', 1, 13], ['parle-anglais', 1, 6],
      ['nombres-anglais', 1, 6], ['calcul-anglais', 1, 4], ['couleurs-anglais', 1, 3], ['colorie-anglais', 1, 3],
      ['memory-anglais', 1, 4], ['intrus-anglais', 1, 3], ['contraires-anglais', 1, 3], ['phrase-anglais', 1, 3],
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
