// Informations affichées dans Réglages → À propos.
// La version doit être la même que dans package.json, et la première entrée du
// journal des modifications doit la décrire (vérifié par les tests).

export const APP = {
  name: 'Lire & Compter',
  version: '1.5.0',
  author: 'Michaël Durieux',
  contact: 'michael.jurier@gmail.com', // remarques, bugs, idées d'évolution
};

/** Journal des modifications, de la plus récente à la plus ancienne. */
export const CHANGELOG = [
  {
    version: '1.5.0',
    date: '2026-10-03',
    changes: [
      'Nouvel accueil en rubriques : Lire et écrire, Histoires, Nombres et calcul, Jeux de logique, Temps et mesures, Le monde, Anglais.',
      'Histoires lues en karaoké : chaque mot s’allume quand il est lu, puis une question.',
      'Monnaie (compter, payer le bon prix, rendre la monnaie), mesures (règle, balance, unités) et calendrier.',
      'Géométrie : reproduire un dessin sur quadrillage, les pièces du carré (tangram).',
      'Anglais parlé : saluer, petites conversations avec le prénom de l’enfant, comptines.',
      'Je révise : les jeux ratés reviennent, puis de plus en plus espacés (1, 3 et 7 jours).',
      'Objectif du jour et temps maximum par enfant, avec une pause douce.',
      'Habiller son personnage avec les étoiles gagnées ; jeux bonus (bulles, puzzle, coloriage) après une bonne partie.',
      'Lecture facilitée (dyslexie), décors de saison et musique douce (à activer).',
      'Relier des couleurs : la paire reliée prend sa propre couleur.',
      'Une seule voix pour toute l’app, réglable ; contact pour les remarques dans « À propos ».',
    ],
  },
  {
    version: '1.4.0',
    date: '2026-10-03',
    changes: [
      'Défi du jour : 5 questions de jeux variés, une étoile bonus et une série de jours 🔥.',
      'Nouvelle matière « Le monde » : les animaux (où ils vivent, leurs bébés, ce qu’ils mangent), le temps qui passe (saisons, moments de la journée, jours, mois), les pays et les continents.',
      'Logique : la symétrie sur quadrillage et « Compte les cubes » (empilements en 3D, avec des cubes cachés).',
      'Téléphone en paysage : le dessin à gauche, la consigne et les réponses à droite.',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-10-03',
    changes: [
      'Premier lancement : chaque famille crée ses profils (prénom, personnage fille ou garçon, classe, photo).',
      'Le prénom est écrit sur le tee-shirt du personnage et sert à féliciter l’enfant dans les jeux.',
      'Partager l’app : un lien à envoyer à d’autres familles ; chaque appareil garde ses propres enfants.',
      'Espace parents réorganisé : un seul bouton « Parents », trois onglets (Suivi, Enfants, Réglages).',
      'Ajouter, renommer ou supprimer un enfant (jusqu’à 6 profils).',
      'Nouvelle icône, sans prénom.',
      'Vérifiée aussi sur les principaux téléphones et tablettes Android (Chrome).',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-10-03',
    changes: [
      'Labyrinthes de 4 × 4 à 9 × 9 cases, chemins des nombres (de 1 en 1, de 2 en 2, de 5 en 5, de 10 en 10, à rebours) et des lettres.',
      'Fais des patates : entourer au doigt des paquets de 2, de 5 ou de 10, puis compter le tout.',
      'Les calculs à trous : glisser les nombres dans les cases, chaque calcul juste devient vert (6 niveaux).',
      'Relie les calculs : tracer un trait au doigt jusqu’au résultat ; la paire juste devient verte puis disparaît.',
      'Sudoku pour enfants : 4 × 4 avec des images, puis avec des chiffres, jusqu’au 6 × 6.',
      'Le panier : listes de courses avec plusieurs fruits (6 bananes, 3 pommes et 2 fraises).',
      'Nouveaux jeux de maths : relie les quantités, range dans l’ordre, petits problèmes avec le prénom de l’enfant, doubles et moitiés, l’heure, l’intrus, les ombres.',
      'Petits textes à lire, avec des questions de compréhension.',
      'Anglais : relie en anglais, compte en anglais, « Where is the cat? », épelle en anglais, et deux thèmes (émotions, famille).',
      'Chaque jeu permet de choisir directement son niveau.',
      'Consigne complète à la première question, puis une consigne courte pour ne pas répéter.',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-10-03',
    changes: [
      'Menu Réglages : photo de chaque enfant (photothèque ou appareil photo), enregistrée automatiquement.',
      'Voix plus naturelles : choix automatique des voix « Premium » ou « améliorées », voix réglable pour chaque personnage.',
      'Fonctionne sur tous les iPad, en portrait comme en paysage.',
      'Version, journal des modifications et crédits dans les Réglages.',
      'Correction : le mot « null » ne s’affiche plus après une bonne réponse.',
      'Accueil plus simple, sans les deux portraits.',
      'Pendant le jeu, seul l’enfant qui joue apparaît, avec sa photo ou son dessin et sa voix.',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-10-03',
    changes: [
      'Un profil par enfant, programme de la moyenne section au CE1.',
      '24 jeux de français, maths et anglais, dont 4 séries de dénombrement.',
      'Calcul en 36 paliers : pavé numérique, « Relie » et « Complète ».',
      'Espace parents : suivi de la semaine, compétences, erreurs fréquentes.',
      'Fonctionne sans Internet une fois installée.',
    ],
  },
];
