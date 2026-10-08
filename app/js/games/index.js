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
import { LOGIQUE_PLUS_GAMES } from './logique-plus.js';
import { MONDE_GAMES } from './monde.js';
import { MESURES_GAMES } from './mesures.js';
import { JEUX_GAMES } from './jeux.js';
import { drapeaux } from './drapeaux.js';
import { carteMonde } from './carte.js';
import { dictee } from './dictee.js';
import { ANGLAIS_PLUS_GAMES } from './anglais-plus.js';
import { ecrire } from './ecriture.js';
import { regleHorloge } from './horloge.js';
import { tablesChrono } from './chrono.js';

const ALL = [
  ...FRANCAIS_EXTRA_GAMES, ...LECTURE_GAMES, petitsTextes, histoires, ...MATHS_GAMES, ...MATHS_EXTRA_GAMES,
  ...LOGIQUE_GAMES, ...LOGIQUE_PLUS_GAMES, ...LABYRINTHE_GAMES, ...JEUX_GAMES, dictee, ...MESURES_GAMES, ...MONDE_GAMES, drapeaux, carteMonde, ...ANGLAIS_GAMES,
  ...ANGLAIS_PLUS_GAMES, ecrire, regleHorloge, tablesChrono,
];

const RUBRIQUES = [
  {
    id: 'francais',
    title: 'Lire et écrire',
    icon: '📚',
    games: ['syllabes-rythme', 'rimes', 'lettres', 'premier-son', 'syllabes', 'bon-mot', 'petits-mots', 'phrase', 'homophones', 'genre', 'ecrire', 'dictee'],
  },
  { id: 'histoires', title: 'Histoires', icon: '📖', games: ['histoires', 'petits-textes'] },
  {
    id: 'maths',
    title: 'Nombres et calcul',
    icon: '🔢',
    games: [
      'compter', 'vite-vu', 'panier', 'patates', 'dizaines', 'relier',
      'comparer', 'suite', 'calcul', 'trous', 'relie-calculs', 'faire-dix', 'tables', 'tables-chrono',
      'ranger', 'problemes', 'doubles',
    ],
  },
  {
    id: 'jeux',
    title: 'Jeux et logique',
    icon: '🧩',
    games: [
      'puzzle', 'memory', 'coloriage-magique', 'points',
      'formes', 'algorithmes', 'intrus', 'ombres', 'sudoku', 'tableau-logique', 'balances', 'picross', 'symetrie', 'reproduire', 'tangram', 'cubes',
      'labyrinthe', 'labyrinthe-rond', 'chemin-nombres', 'chemin-lettres',
    ],
  },
  { id: 'temps', title: 'Temps et mesures', icon: '⏰', games: ['heure', 'regle-horloge', 'calendrier', 'saisons', 'monnaie', 'mesures'] },
  { id: 'monde', title: 'Le monde', icon: '🌍', games: ['animaux-monde', 'pays', 'drapeaux', 'carte-monde'] },
  {
    id: 'anglais',
    title: 'Anglais',
    icon: '🇬🇧',
    games: [
      'ecoute', 'lis-anglais', 'mot-anglais', 'relie-anglais', 'epelle-anglais',
      'compte-anglais', 'nombres-anglais', 'calcul-anglais', 'couleurs-anglais', 'colorie-anglais',
      'memory-anglais', 'intrus-anglais', 'contraires-anglais', 'ou-est', 'phrase-anglais', 'parle-anglais',
    ],
  },
];

// Sections affichées dans la liste des jeux de certaines rubriques.
const SECTION_GAMES = {
  'Écrire': ['ecrire'],
  'L’heure et le calendrier': ['heure', 'regle-horloge', 'calendrier', 'saisons'],
  'Monnaie et mesures': ['monnaie', 'mesures'],
  'Puzzles, memory et coloriages': ['puzzle', 'memory', 'coloriage-magique', 'points'],
  'Logique': ['formes', 'algorithmes', 'intrus', 'ombres', 'sudoku', 'tableau-logique', 'balances', 'picross'],
  'Formes et espace': ['symetrie', 'reproduire', 'tangram', 'cubes'],
  'Labyrinthes': ['labyrinthe', 'labyrinthe-rond', 'chemin-nombres', 'chemin-lettres'],
  'Écouter et lire': ['ecoute', 'lis-anglais', 'mot-anglais', 'relie-anglais', 'epelle-anglais'],
  'Nombres et couleurs': ['compte-anglais', 'nombres-anglais', 'calcul-anglais', 'couleurs-anglais', 'colorie-anglais'],
  'Mots et phrases': ['memory-anglais', 'intrus-anglais', 'contraires-anglais', 'ou-est', 'phrase-anglais', 'parle-anglais'],
};
const SECTIONS = Object.fromEntries(Object.entries(SECTION_GAMES).flatMap(([section, ids]) => ids.map((id) => [id, section])));

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
