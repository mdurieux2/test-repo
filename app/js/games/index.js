// Les rubriques de l'accueil et la répartition des jeux : c'est ici (et seulement ici) qu'on
// range un jeu dans une rubrique. Chaque jeu reçoit l'identifiant de sa rubrique (game.domain),
// qui donne aussi sa couleur.

import { LECTURE_GAMES } from './lecture.js';
import { FRANCAIS_EXTRA_GAMES } from './francais-extra.js';
import { MATHS_GAMES } from './maths.js';
import { MATHS_EXTRA_GAMES } from './maths-extra.js';
import { ANGLAIS_GAMES } from './anglais.js';
import { LABYRINTHE_GAMES } from './labyrinthes.js';
import { petitsTextes } from './textes.js';
import { histoires } from './histoires.js';
import { LOGIQUE_GAMES } from './logique.js';
import { MONDE_GAMES } from './monde.js';
import { MESURES_GAMES } from './mesures.js';

const ALL = [
  ...FRANCAIS_EXTRA_GAMES, ...LECTURE_GAMES, petitsTextes, histoires, ...MATHS_GAMES, ...MATHS_EXTRA_GAMES,
  ...LOGIQUE_GAMES, ...LABYRINTHE_GAMES, ...MESURES_GAMES, ...MONDE_GAMES, ...ANGLAIS_GAMES,
];

const RUBRIQUES = [
  {
    id: 'francais',
    title: 'Lire et écrire',
    icon: '📚',
    games: ['syllabes-rythme', 'rimes', 'lettres', 'premier-son', 'syllabes', 'bon-mot', 'petits-mots', 'phrase', 'homophones', 'genre'],
  },
  { id: 'histoires', title: 'Histoires', icon: '📖', games: ['histoires', 'petits-textes'] },
  {
    id: 'maths',
    title: 'Nombres et calcul',
    icon: '🔢',
    games: [
      'compter', 'vite-vu', 'panier', 'patates', 'dizaines', 'relier',
      'comparer', 'suite', 'calcul', 'trous', 'relie-calculs', 'faire-dix', 'tables', 'ranger', 'problemes', 'doubles',
    ],
  },
  {
    id: 'jeux',
    title: 'Jeux de logique',
    icon: '🧩',
    games: [
      'formes', 'algorithmes', 'intrus', 'ombres', 'sudoku', 'symetrie', 'reproduire', 'tangram', 'cubes',
      'labyrinthe', 'chemin-nombres', 'chemin-lettres',
    ],
  },
  { id: 'temps', title: 'Temps et mesures', icon: '⏰', games: ['heure', 'calendrier', 'saisons', 'monnaie', 'mesures'] },
  { id: 'monde', title: 'Le monde', icon: '🌍', games: ['animaux-monde', 'pays'] },
  {
    id: 'anglais',
    title: 'Anglais',
    icon: '🇬🇧',
    games: ['ecoute', 'lis-anglais', 'mot-anglais', 'relie-anglais', 'compte-anglais', 'ou-est', 'epelle-anglais', 'parle-anglais'],
  },
];

// Sections affichées dans la liste des jeux de certaines rubriques.
const SECTIONS = {
  heure: 'L’heure et le calendrier', calendrier: 'L’heure et le calendrier', saisons: 'L’heure et le calendrier',
  monnaie: 'Monnaie et mesures', mesures: 'Monnaie et mesures',
};

export const DOMAINS = RUBRIQUES.map(({ games, ...rubrique }) => ({
  ...rubrique,
  games: games.map((id) => {
    const game = ALL.find((g) => g.id === id);
    if (!game) throw new Error(`jeu inconnu : ${id}`);
    game.domain = rubrique.id;
    if (SECTIONS[id]) game.section = SECTIONS[id];
    return game;
  }),
}));

export const GAMES = DOMAINS.flatMap((d) => d.games);

export function findGame(id) {
  return GAMES.find((g) => g.id === id);
}
