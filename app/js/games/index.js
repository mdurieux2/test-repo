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
import { COMPRENDRE_GAMES } from './comprendre.js';
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
import { fluence } from './fluence.js';
import { SCIENCES_GAMES } from './sciences.js';
import { NOMBRES_PLUS_GAMES } from './nombres-plus.js';
import { GRAMMAIRE_GAMES } from './grammaire.js';
import { VIVRE_GAMES } from './vivre.js';
import { OPERATIONS_GAMES } from './operations.js';
import { VOCABULAIRE_GAMES } from './vocabulaire.js';
import { DONNEES_GAMES } from './donnees.js';
import { CIEL_GAMES } from './ciel.js';
import { CORPS_GAMES } from './corps.js';
import { TECHNO_GAMES } from './techno.js';
import { PLANETE_GAMES } from './planete.js';
import { CE2_GAMES } from './ce2.js';
import { emotions } from './emotions.js';
import { chercheTrouve } from './cherche.js';
import { gaucheDroite } from './gauche-droite.js';
import { conjugaisonCm } from './cm-conjugaison.js';
import { CM_GRAMMAIRE_GAMES } from './cm-grammaire.js';
import { vocabulaireCm } from './cm-vocabulaire.js';
import { lectureCm } from './cm-lecture.js';
import { CM_NOMBRES_GAMES } from './cm-nombres.js';
import { CM_OPERATIONS_GAMES } from './cm-operations.js';
import { CM_MESURES_GAMES } from './cm-mesures.js';
import { CM_ANGLAIS_GAMES } from './cm-anglais.js';
import { CM_MONDE_GAMES } from './cm-monde.js';

const ALL = [
  ...FRANCAIS_EXTRA_GAMES, ...LECTURE_GAMES, petitsTextes, histoires, ...COMPRENDRE_GAMES, ...MATHS_GAMES, ...MATHS_EXTRA_GAMES,
  ...LOGIQUE_GAMES, ...LOGIQUE_PLUS_GAMES, ...LABYRINTHE_GAMES, ...JEUX_GAMES, dictee, ...MESURES_GAMES, ...MONDE_GAMES, drapeaux, carteMonde, ...ANGLAIS_GAMES,
  ...ANGLAIS_PLUS_GAMES, ecrire, regleHorloge, tablesChrono, fluence, ...SCIENCES_GAMES, ...NOMBRES_PLUS_GAMES, ...GRAMMAIRE_GAMES,
  ...VIVRE_GAMES, ...OPERATIONS_GAMES, ...VOCABULAIRE_GAMES, ...DONNEES_GAMES, ...CIEL_GAMES, ...CORPS_GAMES, ...TECHNO_GAMES, ...PLANETE_GAMES,
  ...CE2_GAMES, emotions, chercheTrouve, gaucheDroite,
  // cours moyen
  conjugaisonCm, ...CM_GRAMMAIRE_GAMES, vocabulaireCm, lectureCm, ...CM_NOMBRES_GAMES, ...CM_OPERATIONS_GAMES, ...CM_MESURES_GAMES,
  ...CM_ANGLAIS_GAMES, ...CM_MONDE_GAMES,
];

const RUBRIQUES = [
  {
    id: 'francais',
    title: 'Lire et écrire',
    icon: '📚',
    games: [
      'syllabes-rythme', 'rimes', 'lettres', 'premier-son', 'syllabes', 'bon-mot', 'petits-mots', 'phrase', 'fluence', 'vocabulaire',
      'vocabulaire-cm', 'ponctuation', 'homophones', 'genre', 'conjugaison', 'accords', 'imparfait', 'conjugaison-cm', 'grammaire-cm',
      'orthographe-cm', 'ecrire', 'dictee',
    ],
  },
  { id: 'histoires', title: 'Histoires', icon: '📖', games: ['histoires', 'petits-textes', 'ordre-histoire', 'lecture-cm'] },
  {
    id: 'maths',
    title: 'Nombres et calcul',
    icon: '🔢',
    games: [
      'compter', 'vite-vu', 'panier', 'patates', 'dizaines', 'relier',
      'comparer', 'suite', 'calcul', 'trous', 'relie-calculs', 'faire-dix', 'tables', 'tables-chrono',
      'ranger', 'problemes', 'schemas', 'doubles', 'graphiques', 'droite-numerique', 'fractions', 'partage', 'addition-posee',
      'multiplication-posee', 'division', 'grands-nombres',
      'nombres-cm', 'decimaux', 'fractions-cm', 'calcul-cm', 'operations-cm', 'problemes-cm', 'donnees-cm',
    ],
  },
  {
    id: 'jeux',
    title: 'Jeux et logique',
    icon: '🧩',
    games: [
      'puzzle', 'memory', 'coloriage-magique', 'points',
      'formes', 'algorithmes', 'intrus', 'cherche-trouve', 'ombres', 'sudoku', 'tableau-logique', 'balances', 'picross', 'symetrie', 'reproduire', 'tangram', 'cubes',
      'geometrie-cm',
      'labyrinthe', 'labyrinthe-rond', 'chemin-nombres', 'chemin-lettres',
    ],
  },
  { id: 'temps', title: 'Temps et mesures', icon: '⏰', games: ['heure', 'regle-horloge', 'calendrier', 'saisons', 'monnaie', 'mesures', 'perimetres', 'mesures-cm'] },
  {
    id: 'monde',
    title: 'Le monde',
    icon: '🌍',
    games: [
      'histoire', 'geographie', 'republique',
      'animaux-monde', 'pays', 'drapeaux', 'carte-monde', 'vivre-ensemble', 'emotions', 'se-reperer', 'gauche-droite',
    ],
  },
  {
    id: 'sciences',
    title: 'Sciences',
    icon: '🔬',
    games: ['sciences-cm', 'vivant', 'corps', 'milieux', 'matiere', 'melanges', 'electricite', 'objets', 'ciel', 'meteo', 'planete'],
  },
  {
    id: 'anglais',
    title: 'Anglais',
    icon: '🇬🇧',
    games: [
      'ecoute', 'lis-anglais', 'mot-anglais', 'relie-anglais', 'epelle-anglais',
      'compte-anglais', 'nombres-anglais', 'calcul-anglais', 'couleurs-anglais', 'colorie-anglais',
      'memory-anglais', 'intrus-anglais', 'contraires-anglais', 'ou-est', 'phrase-anglais', 'parle-anglais', 'anglais-cm',
    ],
  },
];

// Sections affichées dans la liste des jeux de certaines rubriques.
const SECTION_GAMES = {
  'Écrire': ['ecrire'],
  'L’heure et le calendrier': ['heure', 'regle-horloge', 'calendrier', 'saisons'],
  'Monnaie et mesures': ['monnaie', 'mesures', 'perimetres', 'mesures-cm'],
  'Puzzles, memory et coloriages': ['puzzle', 'memory', 'coloriage-magique', 'points'],
  'Logique': ['formes', 'algorithmes', 'intrus', 'cherche-trouve', 'ombres', 'sudoku', 'tableau-logique', 'balances', 'picross'],
  'Formes et espace': ['symetrie', 'reproduire', 'tangram', 'cubes', 'geometrie-cm'],
  'Labyrinthes': ['labyrinthe', 'labyrinthe-rond', 'chemin-nombres', 'chemin-lettres'],
  'Histoire et géographie': ['histoire', 'geographie'],
  'Enseignement moral et civique': ['republique'],
  'Animaux, pays et cartes': ['animaux-monde', 'pays', 'drapeaux', 'carte-monde'],
  'Sciences et technologie': ['sciences-cm'],
  'Le vivant': ['vivant', 'corps', 'milieux'],
  'La matière et les objets': ['matiere', 'melanges', 'electricite', 'objets'],
  'Le ciel et la Terre': ['ciel', 'meteo'],
  'La planète': ['planete'],
  'Écouter et lire': ['ecoute', 'lis-anglais', 'mot-anglais', 'relie-anglais', 'epelle-anglais'],
  'Nombres et couleurs': ['compte-anglais', 'nombres-anglais', 'calcul-anglais', 'couleurs-anglais', 'colorie-anglais'],
  'Vivre ensemble et se repérer': ['vivre-ensemble', 'emotions', 'se-reperer', 'gauche-droite'],
  'Mots et phrases': ['memory-anglais', 'intrus-anglais', 'contraires-anglais', 'ou-est', 'phrase-anglais', 'parle-anglais', 'anglais-cm'],
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
