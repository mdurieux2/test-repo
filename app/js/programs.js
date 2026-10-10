// Programme par classe : quels jeux, et quels niveaux de chaque jeu, d'après les programmes
// officiels en vigueur en 2026-2027 (le détail, avec les sources, est dans docs/programmes.md) :
//   maternelle : programme de 2024 pour le langage et les maths (BO n°41 du 31/10/2024), et
//     nouveau programme complet de la rentrée 2026 (BO n°19 du 7/5/2026), écrit par âge
//     (avant 4 ans = PS, à partir de 4 ans = MS, à partir de 5 ans = GS) ;
//   CP, CE1, CE2 : français et maths de 2024 (BO n°41), écrits classe par classe ; au CP, nouveaux
//     programmes de sciences (BO n°24 du 11/6/2026), d'histoire-géographie (BO n°22 du 28/5/2026)
//     et de langues vivantes (BO n°12 du 19/3/2026) ; au CE1 et au CE2, ceux de 2020 jusqu'en 2027 ;
//   CM1, CM2 : français et maths du cycle 3 de 2025 (le CM2 les applique pour la première fois en
//     2026-2027) ; au CM1, les nouveaux programmes de 2026 en sciences, histoire-géographie et
//     anglais ; au CM2, ceux de 2020 (2023 en sciences) jusqu'en 2027 ; EMC de 2024.
// Un jeu n'est proposé que dans les classes où ce qu'il travaille est au programme, et seulement à
// ses niveaux de l'année (avec un peu de l'année d'avant pour commencer) : rien de trop dur, ni
// rien de déjà su. Quelques repères qui décident de beaucoup de choses :
//   - lettres : capitales et voyelles en MS, toutes les lettres en GS ; lecture de mots au CP ;
//   - nombres : 3 ou 4 en PS, 6 en MS, 10 et un peu plus en GS, 100 au CP, 1 000 au CE1, 10 000 au CE2,
//     999 999 au CM1 (décimaux jusqu'aux centièmes), les centaines de millions au CM2 (millièmes) ;
//     le milliard, les pourcentages, l'arrondi au dixième et le « retour à l'unité » sont en 6e ;
//   - les fractions commencent au CE1 ; les tables de multiplication aussi ; la division au CE2 ;
//   - l'heure : les heures pile au CP, les demi-heures et les quarts d'heure au CE1, à la minute au CE2 ;
//   - conjugaison : être et avoir au présent au CP ; présent, imparfait, futur et passé composé
//     d'être, d'avoir et des verbes en -er au CE1 ; avec faire, aller, dire, venir… au CE2 ;
//   - gauche et droite : les mots en MS, sur soi en GS, tourner à gauche ou à droite au CP ;
//   - anglais : à l'oral seulement jusqu'au CE1 ; les premiers mots écrits au CE2 ;
//   - la symétrie est au CE2 ; les sciences de l'école élémentaire ne vont pas jusqu'au corps
//     qui respire et digère, ni au classement des animaux (cycle 3).
// [identifiant du jeu, niveau minimum, niveau maximum, niveaux retirés]. Les niveaux retirés sont
// d'une autre classe, au milieu de la fourchette (« de 5 en 5 minutes » pour l'heure au CE1, un
// niveau à lire dans un jeu d'anglais avant le CE2) : la progression les saute. Le niveau s'adapte
// à l'enfant parmi les niveaux de sa classe. Pour « calcul », les niveaux sont les paliers
// (1 = +5, 2 = −5, 3 = ±5, 4 = +10 … 36 = ±100).

import { DOMAINS, findGame } from './games/index.js';

export const PROGRAMS = {
  PS: {
    francais: [
      ['syllabes-rythme', 1, 2], ['vocabulaire', 1, 2], ['ecrire', 1, 1],
    ],
    histoires: [
      ['histoires', 1, 1],
    ],
    maths: [
      ['compter', 1, 1], ['vite-vu', 1, 1], ['panier', 1, 1], ['relier', 1, 1], ['comparer', 1, 1], ['ranger', 1, 1],
    ],
    jeux: [
      ['puzzle', 1, 2], ['memory', 1, 2], ['coloriage-magique', 1, 1], ['points', 1, 1],
      ['formes', 1, 1], ['algorithmes', 1, 1], ['intrus', 1, 2], ['cherche-trouve', 1, 2], ['ombres', 1, 1], ['labyrinthe', 1, 1],
    ],
    temps: [
      ['saisons', 1, 2], ['mesures', 1, 1],
    ],
    monde: [
      ['animaux-monde', 1, 1], ['vivre-ensemble', 1, 1], ['emotions', 1, 2], ['se-reperer', 1, 2],
    ],
    sciences: [
      ['vivant', 1, 2], ['objets', 1, 2], ['meteo', 1, 2],
    ],
    anglais: [
      ['ecoute', 1, 2], ['compte-anglais', 1, 1], ['parle-anglais', 3, 3],
    ],
  },
  MS: {
    francais: [
      ['syllabes-rythme', 1, 7], ['lettres', 1, 4], ['vocabulaire', 1, 3], ['ecrire', 1, 5],
    ],
    histoires: [
      ['histoires', 1, 3], ['ordre-histoire', 1, 3],
    ],
    maths: [
      ['compter', 1, 1], ['vite-vu', 1, 1], ['panier', 1, 1], ['relier', 1, 2], ['comparer', 1, 1],
      ['suite', 1, 1], ['faire-dix', 1, 1], ['ranger', 1, 2], ['problemes', 1, 2], ['partage', 1, 1],
    ],
    jeux: [
      ['formes', 1, 1], ['algorithmes', 1, 4], ['intrus', 1, 3], ['cherche-trouve', 2, 5], ['ombres', 1, 2], ['sudoku', 1, 1],
      ['tangram', 1, 1], ['cubes', 1, 1], ['labyrinthe', 1, 2], ['chemin-nombres', 1, 2],
      ['chemin-lettres', 1, 2],
      ['puzzle', 1, 3], ['memory', 1, 3], ['coloriage-magique', 1, 2], ['points', 1, 2],
    ],
    temps: [
      ['saisons', 1, 3], ['calendrier', 1, 1], ['mesures', 1, 4, [2, 3]],
    ],
    monde: [
      ['animaux-monde', 1, 5],
      ['vivre-ensemble', 1, 4], ['emotions', 1, 4], ['se-reperer', 1, 5, [4]], ['gauche-droite', 1, 3],
    ],
    sciences: [
      ['vivant', 1, 5], ['milieux', 1, 1], ['matiere', 1, 7, [4]], ['melanges', 1, 1], ['objets', 1, 3],
      ['ciel', 1, 2], ['meteo', 1, 4], ['planete', 1, 3],
    ],
    anglais: [
      ['ecoute', 1, 3], ['compte-anglais', 1, 2], ['ou-est', 1, 1], ['parle-anglais', 1, 4, [2]],
    ],
  },
  GS: {
    francais: [
      ['syllabes-rythme', 3, 8], ['rimes', 1, 8], ['lettres', 2, 7], ['premier-son', 1, 5],
      ['syllabes', 1, 1], ['vocabulaire', 2, 4], ['ponctuation', 1, 3], ['ecrire', 2, 8],
      ['dictee', 1, 2],
    ],
    histoires: [
      ['histoires', 1, 4], ['ordre-histoire', 1, 4],
    ],
    maths: [
      ['compter', 1, 4], ['vite-vu', 1, 2], ['panier', 1, 4], ['patates', 1, 2], ['relier', 2, 8],
      ['comparer', 1, 2], ['suite', 1, 2], ['calcul', 1, 6], ['faire-dix', 1, 3],
      ['ranger', 2, 4], ['problemes', 1, 4], ['doubles', 1, 1], ['droite-numerique', 1, 2], ['partage', 1, 5],
    ],
    jeux: [
      ['formes', 2, 7, [4, 5]], ['algorithmes', 2, 7], ['intrus', 1, 3], ['cherche-trouve', 3, 7], ['ombres', 2, 4], ['sudoku', 1, 2],
      ['tableau-logique', 1, 3], ['balances', 1, 2], ['picross', 1, 1],
      ['reproduire', 1, 1], ['tangram', 1, 2], ['cubes', 1, 2], ['labyrinthe', 2, 4], ['labyrinthe-rond', 1, 2],
      ['chemin-nombres', 2, 5], ['chemin-lettres', 1, 7],
      ['puzzle', 2, 5], ['memory', 2, 5], ['coloriage-magique', 1, 2], ['points', 2, 7, [5, 6]],
    ],
    temps: [
      ['saisons', 2, 7], ['calendrier', 1, 3], ['mesures', 1, 4, [2, 3]],
    ],
    monde: [
      ['animaux-monde', 2, 7], ['carte-monde', 1, 2],
      ['vivre-ensemble', 1, 6], ['emotions', 2, 6], ['se-reperer', 2, 9, [8]], ['gauche-droite', 1, 5],
    ],
    sciences: [
      ['vivant', 2, 7], ['corps', 1, 2], ['milieux', 1, 3], ['matiere', 1, 8], ['melanges', 1, 3],
      ['electricite', 1, 4], ['objets', 1, 5], ['ciel', 1, 4], ['meteo', 1, 6], ['planete', 1, 5],
    ],
    anglais: [
      ['ecoute', 1, 4], ['compte-anglais', 1, 2], ['ou-est', 1, 2], ['parle-anglais', 1, 4, [2]],
      ['nombres-anglais', 1, 1], ['couleurs-anglais', 1, 1], ['intrus-anglais', 1, 1], ['contraires-anglais', 1, 1],
    ],
  },
  CP: {
    francais: [
      ['premier-son', 2, 8], ['lettres', 6, 7], ['syllabes', 1, 8], ['bon-mot', 1, 8], ['petits-mots', 1, 8], ['phrase', 1, 8],
      ['fluence', 1, 7], ['vocabulaire', 3, 8], ['ponctuation', 1, 8], ['genre', 1, 4], ['conjugaison', 1, 3],
      ['accords', 1, 7, [3]],
      ['ecrire', 4, 8],
      ['dictee', 1, 8],
    ],
    histoires: [
      ['histoires', 2, 8], ['petits-textes', 1, 6], ['ordre-histoire', 3, 8],
    ],
    maths: [
      ['compter', 3, 9], ['vite-vu', 2, 7], ['panier', 4, 10], ['patates', 2, 8], ['dizaines', 1, 4],
      ['comparer', 2, 3], ['suite', 2, 6, [5]], ['calcul', 1, 36], ['trous', 1, 6], ['relie-calculs', 1, 7],
      ['faire-dix', 2, 6], ['ranger', 3, 7, [6]], ['problemes', 3, 9], ['schemas', 1, 4], ['doubles', 1, 5],
      ['graphiques', 1, 8], ['droite-numerique', 2, 6], ['partage', 3, 9], ['addition-posee', 1, 4],
    ],
    jeux: [
      ['formes', 2, 8], ['algorithmes', 5, 7], ['intrus', 4, 7], ['cherche-trouve', 4, 9], ['ombres', 3, 6], ['sudoku', 2, 4],
      ['tableau-logique', 2, 6], ['balances', 1, 5], ['picross', 1, 3], ['reproduire', 1, 3],
      ['tangram', 1, 3], ['cubes', 1, 3], ['labyrinthe', 3, 5], ['labyrinthe-rond', 2, 5], ['chemin-nombres', 4, 9],
      ['chemin-lettres', 4, 7],
      ['puzzle', 3, 6], ['memory', 3, 6], ['coloriage-magique', 3, 6], ['points', 3, 7],
    ],
    temps: [
      ['heure', 1, 1], ['regle-horloge', 1, 1], ['calendrier', 2, 7], ['saisons', 4, 7], ['monnaie', 1, 7], ['mesures', 2, 7],
    ],
    monde: [
      ['animaux-monde', 3, 7],
      ['pays', 3, 8, [4, 5, 6]], ['drapeaux', 1, 1], ['carte-monde', 1, 3],
      ['vivre-ensemble', 3, 9], ['emotions', 2, 8], ['se-reperer', 3, 9, [8]], ['gauche-droite', 3, 8],
    ],
    sciences: [
      ['vivant', 3, 10], ['corps', 1, 4], ['milieux', 1, 4], ['matiere', 2, 9], ['melanges', 1, 4],
      ['electricite', 1, 4], ['objets', 1, 7], ['ciel', 1, 9, [6, 7]], ['meteo', 2, 9], ['planete', 1, 8],
    ],
    // à l'oral seulement (pas d'écrit en langue vivante au CP) : les niveaux à lire sont retirés
    anglais: [
      ['ecoute', 1, 8], ['compte-anglais', 1, 5, [3, 4]], ['nombres-anglais', 1, 2], ['calcul-anglais', 1, 3],
      ['couleurs-anglais', 1, 4, [2, 3]], ['intrus-anglais', 1, 1], ['contraires-anglais', 1, 1],
      ['ou-est', 1, 4, [3]], ['parle-anglais', 1, 7, [2, 5, 6]],
    ],
  },
  CE1: {
    francais: [
      ['bon-mot', 4, 8], ['petits-mots', 4, 8], ['phrase', 3, 8], ['fluence', 5, 9], ['vocabulaire', 4, 10], ['ponctuation', 3, 8],
      ['homophones', 1, 4], ['genre', 3, 8],
      ['conjugaison', 1, 10, [6]], ['imparfait', 1, 8, [4, 5]], ['accords', 2, 9, [3]],
      ['ecrire', 7, 8],
      ['dictee', 3, 8],
    ],
    histoires: [
      ['histoires', 4, 8], ['petits-textes', 3, 10], ['ordre-histoire', 5, 10],
    ],
    maths: [
      ['dizaines', 4, 8], ['comparer', 3, 7], ['suite', 3, 8], ['calcul', 10, 36],
      ['trous', 4, 9], ['relie-calculs', 4, 9], ['faire-dix', 4, 8], ['tables', 1, 9], ['tables-chrono', 1, 7],
      ['ranger', 5, 10], ['problemes', 5, 10], ['schemas', 1, 10], ['doubles', 3, 7],
      ['graphiques', 3, 10], ['droite-numerique', 4, 10], ['fractions', 1, 10], ['partage', 6, 10], ['addition-posee', 2, 10],
      ['multiplication-posee', 1, 3],
    ],
    jeux: [
      ['intrus', 6, 8], ['cherche-trouve', 6, 10], ['ombres', 5, 8], ['sudoku', 3, 7], ['tableau-logique', 3, 8], ['balances', 3, 8],
      ['picross', 2, 6], ['reproduire', 2, 5], ['tangram', 2, 6], ['cubes', 2, 5], ['labyrinthe', 4, 8], ['labyrinthe-rond', 3, 7],
      ['chemin-nombres', 8, 10],
      ['puzzle', 4, 8], ['memory', 5, 7], ['coloriage-magique', 5, 7],
    ],
    temps: [
      ['heure', 1, 7, [4]], ['regle-horloge', 1, 5, [4]], ['calendrier', 4, 7], ['monnaie', 3, 7], ['mesures', 3, 8],
    ],
    monde: [
      ['pays', 1, 8], ['drapeaux', 1, 5], ['carte-monde', 1, 8],
      ['vivre-ensemble', 5, 10], ['emotions', 4, 10], ['se-reperer', 6, 10], ['gauche-droite', 5, 10],
    ],
    sciences: [
      ['vivant', 4, 10], ['corps', 2, 8, [5, 6]], ['milieux', 2, 9, [5, 6]], ['matiere', 2, 10], ['melanges', 2, 6],
      ['electricite', 3, 10], ['objets', 3, 10], ['ciel', 2, 9, [6, 7]], ['meteo', 4, 10], ['planete', 2, 10],
    ],
    // à l'oral seulement, comme au CP
    anglais: [
      ['ecoute', 2, 10], ['compte-anglais', 2, 5, [3, 4]], ['nombres-anglais', 1, 6, [3]], ['calcul-anglais', 1, 8, [4]],
      ['couleurs-anglais', 1, 4, [2, 3]], ['intrus-anglais', 1, 1], ['contraires-anglais', 1, 1],
      ['ou-est', 2, 8, [3, 5]], ['parle-anglais', 1, 7, [2, 5, 6]],
    ],
  },
  CE2: {
    francais: [
      ['bon-mot', 5, 8], ['petits-mots', 6, 8], ['phrase', 5, 8], ['fluence', 7, 9], ['vocabulaire', 6, 10], ['ponctuation', 6, 10],
      ['homophones', 2, 6], ['genre', 6, 8],
      ['conjugaison', 4, 10], ['imparfait', 1, 8], ['conjugaison-cm', 1, 3], ['accords', 3, 10],
      ['dictee', 5, 8],
    ],
    histoires: [
      ['histoires', 6, 8], ['petits-textes', 5, 10], ['ordre-histoire', 8, 10],
    ],
    maths: [
      ['dizaines', 6, 8], ['grands-nombres', 1, 8], ['comparer', 5, 7], ['suite', 7, 8], ['calcul', 22, 36],
      ['trous', 7, 9], ['relie-calculs', 8, 9], ['faire-dix', 7, 8], ['tables', 6, 9], ['tables-chrono', 3, 8],
      ['multiplication-posee', 1, 8], ['division', 1, 8],
      ['ranger', 8, 10], ['problemes', 7, 10], ['schemas', 5, 10], ['doubles', 6, 7],
      ['graphiques', 6, 10], ['droite-numerique', 7, 10], ['fractions', 5, 10], ['partage', 8, 10], ['addition-posee', 7, 10],
    ],
    jeux: [
      ['cherche-trouve', 8, 10], ['sudoku', 5, 9], ['tableau-logique', 4, 9], ['balances', 4, 8], ['picross', 3, 8], ['symetrie', 1, 7],
      ['reproduire', 3, 7], ['tangram', 4, 8], ['cubes', 3, 7], ['labyrinthe', 6, 10], ['labyrinthe-rond', 5, 9],
      ['puzzle', 6, 8],
    ],
    temps: [
      ['heure', 3, 7], ['regle-horloge', 3, 8], ['mesures', 6, 8], ['perimetres', 1, 9],
    ],
    monde: [
      ['pays', 3, 8], ['drapeaux', 2, 8], ['carte-monde', 3, 10],
      ['vivre-ensemble', 7, 10], ['emotions', 7, 10], ['se-reperer', 9, 10], ['gauche-droite', 8, 10],
    ],
    sciences: [
      ['vivant', 6, 10], ['corps', 3, 8], ['milieux', 3, 10, [5, 6]], ['matiere', 5, 10], ['melanges', 3, 8],
      ['electricite', 5, 10], ['objets', 5, 10], ['ciel', 4, 9, [6]], ['meteo', 7, 10], ['planete', 5, 10],
    ],
    // l'oral, et les premiers mots écrits (lire des mots familiers illustrés, épeler, copier : programme de 2026)
    anglais: [
      ['ecoute', 5, 10], ['lis-anglais', 1, 8], ['mot-anglais', 1, 8], ['relie-anglais', 1, 8], ['epelle-anglais', 1, 7],
      ['compte-anglais', 2, 7], ['nombres-anglais', 2, 8], ['calcul-anglais', 3, 8], ['couleurs-anglais', 2, 7], ['colorie-anglais', 1, 7],
      ['memory-anglais', 1, 8], ['intrus-anglais', 1, 4], ['contraires-anglais', 1, 5], ['ou-est', 3, 8], ['phrase-anglais', 1, 2],
      ['parle-anglais', 2, 8],
    ],
  },
  CM1: {
    francais: [
      ['fluence', 8, 9], ['vocabulaire-cm', 1, 8], ['ponctuation', 9, 10], ['homophones', 5, 8],
      ['conjugaison-cm', 1, 7], ['grammaire-cm', 1, 6], ['orthographe-cm', 1, 6], ['accords', 9, 10], ['dictee', 6, 8],
    ],
    histoires: [
      ['lecture-cm', 1, 8],
    ],
    // nombres jusqu'à 999 999, décimaux jusqu'aux centièmes, fractions jusqu'à 20, fraction unitaire d'une quantité
    maths: [
      ['nombres-cm', 1, 6], ['decimaux', 1, 8], ['fractions-cm', 1, 10, [8, 9]], ['calcul-cm', 1, 9, [8]], ['tables-chrono', 5, 8],
      ['operations-cm', 1, 8], ['multiplication-posee', 6, 8], ['division', 5, 8], ['problemes-cm', 1, 10], ['schemas', 8, 10],
      ['donnees-cm', 1, 6],
    ],
    jeux: [
      ['geometrie-cm', 1, 8], ['symetrie', 4, 7], ['reproduire', 6, 8], ['cubes', 5, 7], ['tangram', 6, 8],
      ['sudoku', 7, 10], ['tableau-logique', 6, 9], ['balances', 6, 8], ['picross', 6, 8], ['labyrinthe', 8, 10], ['labyrinthe-rond', 7, 9],
    ],
    temps: [
      ['mesures-cm', 1, 7], ['perimetres', 5, 9], ['heure', 6, 7], ['regle-horloge', 7, 8],
    ],
    // nouveaux programmes de 2026 : le Moyen Âge, la monarchie, les explorations, 1789 ; se nourrir, se déplacer, Internet
    monde: [
      ['histoire', 1, 5], ['geographie', 1, 5], ['republique', 1, 5], ['carte-monde', 5, 10], ['pays', 6, 8], ['se-reperer', 9, 10],
    ],
    // mélanges, lumière et ombres, phases de la Lune, classification, réseaux alimentaires, météo, objets techniques
    sciences: [
      ['sciences-cm', 1, 7], ['corps', 9, 10], ['melanges', 6, 10], ['milieux', 5, 10], ['ciel', 4, 6, [5]], ['meteo', 7, 10], ['objets', 7, 10],
    ],
    anglais: [
      ['anglais-cm', 1, 8], ['ecoute', 8, 10], ['lis-anglais', 8, 10], ['mot-anglais', 8, 10], ['relie-anglais', 8, 10], ['epelle-anglais', 7, 10],
      ['nombres-anglais', 6, 8], ['ou-est', 6, 8], ['phrase-anglais', 3, 7], ['parle-anglais', 4, 8],
      ['intrus-anglais', 4, 7], ['contraires-anglais', 5, 7],
    ],
  },
  CM2: {
    francais: [
      ['fluence', 9, 9], ['vocabulaire-cm', 2, 10], ['conjugaison-cm', 4, 10], ['grammaire-cm', 4, 10], ['orthographe-cm', 3, 10], ['dictee', 7, 8],
    ],
    histoires: [
      ['lecture-cm', 2, 10],
    ],
    // nombres jusqu'aux centaines de millions, millièmes, entier × fraction, proportionnalité (sans tableau)
    maths: [
      ['nombres-cm', 3, 10], ['decimaux', 2, 10], ['fractions-cm', 2, 10], ['calcul-cm', 2, 10], ['tables-chrono', 6, 8],
      ['operations-cm', 3, 10], ['problemes-cm', 2, 10], ['schemas', 9, 10], ['donnees-cm', 2, 10],
    ],
    jeux: [
      ['geometrie-cm', 3, 10], ['symetrie', 6, 7], ['reproduire', 7, 8], ['cubes', 6, 7], ['tangram', 7, 8],
      ['sudoku', 8, 10], ['tableau-logique', 7, 9], ['balances', 7, 8], ['picross', 7, 8], ['labyrinthe', 9, 10], ['labyrinthe-rond', 8, 9],
    ],
    temps: [
      ['mesures-cm', 4, 10], ['perimetres', 7, 9], ['regle-horloge', 8, 8],
    ],
    // programmes de 2020 jusqu'en 2027 : la République, l'âge industriel, les guerres mondiales, l'Europe (et les rois, 1789)
    monde: [
      ['histoire', 3, 10, [4]], ['geographie', 4, 10], ['republique', 6, 10], ['carte-monde', 7, 10], ['pays', 7, 8],
    ],
    sciences: [
      ['sciences-cm', 1, 10, [7]], ['corps', 9, 10], ['ciel', 7, 10], ['electricite', 7, 10], ['planete', 8, 10], ['milieux', 8, 10], ['objets', 8, 10],
    ],
    anglais: [
      ['anglais-cm', 1, 10], ['ecoute', 9, 10], ['lis-anglais', 9, 10], ['mot-anglais', 9, 10], ['relie-anglais', 9, 10], ['epelle-anglais', 8, 10],
      ['ou-est', 7, 8], ['phrase-anglais', 5, 7], ['parle-anglais', 6, 8],
    ],
  },
};

/**
 * Ce qu'on attend en fin d'année, en quelques mots (affiché aux parents dans le Suivi). Ce sont
 * les grandes lignes des programmes : chaque enfant avance à son rythme.
 */
export const GRADE_GOALS = {
  PS: 'Écouter des histoires et des comptines, nommer les formes et les couleurs, compter jusqu’à 3 ou 4, trier et assembler, dire sur, sous, devant, derrière. Rien à lire ni à écrire : la voix dit tout.',
  MS: 'Jouer avec les syllabes, reconnaître les lettres capitales, compter jusqu’à 6, comparer, reproduire des suites, dire à gauche et à droite, savoir qu’on lit de gauche à droite.',
  GS: 'Entendre les sons et les rimes, connaître toutes les lettres, écrire des mots simples, compter jusqu’à 10 et au-delà, décomposer, résoudre de premiers problèmes, connaître sa gauche et sa droite.',
  CP: 'Lire de petits textes (30 mots par minute), écrire sous la dictée, être et avoir au présent ; nombres jusqu’à 100, calcul, problèmes, l’heure pile, les euros, tourner à gauche ou à droite.',
  CE1: 'Lire des textes d’une quinzaine de lignes (70 mots par minute), conjuguer au présent, à l’imparfait, au futur et au passé composé ; nombres jusqu’à 1 000, tables, fractions, quarts d’heure.',
  CE2: 'Lire des textes plus longs (90 mots par minute), conjuguer les verbes fréquents, accorder ; nombres jusqu’à 10 000, multiplication posée, division, fractions, l’heure à la minute, l’anglais écrit.',
  CM1: 'Comprendre des textes variés, analyser la phrase, conjuguer ; nombres jusqu’à 999 999, décimaux, fractions, opérations posées, aires, angles ; le Moyen Âge à 1789 ; l’anglais (A1).',
  CM2: 'Lire des textes longs, le passé simple, les fonctions ; nombres jusqu’aux millions, millièmes, proportionnalité, aire du rectangle ; la République, l’Europe ; l’anglais (A1).',
};

/**
 * Les niveaux proposés pour une entrée du programme : de min à max, sans les niveaux retirés
 * (4e élément : un niveau d'une autre classe au milieu de la fourchette, comme « de 5 en 5
 * minutes » pour l'heure au CE1, ou un niveau à lire en anglais avant le CE2).
 */
export function entryLevels([, min, max, skip = []]) {
  return Array.from({ length: max - min + 1 }, (_, i) => min + i).filter((level) => !skip.includes(level));
}

/** Le niveau proposé le plus proche de `level` (à égalité, le plus facile). */
export function nearestLevel(levels, level) {
  return levels.reduce((best, l) => (Math.abs(l - level) < Math.abs(best - level) ? l : best), levels[0]);
}

/** Les matières et jeux du programme d'une classe, avec la fourchette et la liste des niveaux de chaque jeu. */
export function programFor(grade) {
  const program = PROGRAMS[grade] || PROGRAMS.CP;
  return DOMAINS.map((domain) => ({
    ...domain,
    games: (program[domain.id] || []).map((entry) => {
      const levels = entryLevels(entry);
      return { game: findGame(entry[0]), min: levels[0], max: levels.at(-1), levels };
    }),
  })).filter((d) => d.games.length);
}

/** Fourchette et liste des niveaux d'un jeu pour une classe (tout le jeu s'il n'est pas au programme). */
export function levelRange(grade, gameId) {
  for (const entries of Object.values(PROGRAMS[grade] || {})) {
    const entry = entries.find(([id]) => id === gameId);
    if (entry) {
      const levels = entryLevels(entry);
      return { min: levels[0], max: levels.at(-1), levels };
    }
  }
  const { length } = findGame(gameId).levels;
  return { min: 1, max: length, levels: Array.from({ length }, (_, i) => i + 1) };
}

// ---------------------------------------------------------------- Jeux choisis par les parents

/** Nombre maximum de jeux conseillés (ils tiennent en haut de l'accueil, sans faire défiler). */
export const MAX_FEATURED = 3;

/**
 * Le programme d'un enfant : celui de sa classe, sans les rubriques ni les jeux masqués par les
 * parents (child.hiddenDomains, child.hiddenGames). Une rubrique dont tous les jeux sont masqués
 * disparaît aussi. Sans réglage, c'est exactement le programme de la classe.
 */
export function programForChild(child) {
  const hiddenDomains = new Set(child?.hiddenDomains || []);
  const hiddenGames = new Set(child?.hiddenGames || []);
  return programFor(child?.grade)
    .filter((domain) => !hiddenDomains.has(domain.id))
    .map((domain) => ({ ...domain, games: domain.games.filter(({ game }) => !hiddenGames.has(game.id)) }))
    .filter((domain) => domain.games.length);
}

/** Jeu masqué pour cet enfant (lui-même ou toute sa rubrique), ou jeu inconnu. */
export function isGameHidden(child, gameId) {
  const game = findGame(gameId);
  return !game || (child?.hiddenGames || []).includes(gameId) || (child?.hiddenDomains || []).includes(game.domain);
}

/** Les jeux conseillés par les parents (child.featured), dans l'ordre du programme, sauf s'ils sont masqués. */
export function featuredGames(child) {
  const featured = new Set(child?.featured || []);
  return programForChild(child).flatMap((domain) => domain.games).filter(({ game }) => featured.has(game.id));
}
