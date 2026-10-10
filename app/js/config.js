// Informations affichées dans Réglages → À propos.
// La version doit être la même que dans package.json, et la première entrée du
// journal des modifications doit la décrire (vérifié par les tests).

export const APP = {
  name: 'Lire, compter et s’amuser\u00a0!',
  version: '1.16.0',
  author: 'Michaël Durieux',
  contact: 'Michael.Durieux@gmail.com', // remarques, bugs, idées d'évolution
};

/** Journal des modifications, de la plus récente à la plus ancienne. */
export const CHANGELOG = [
  {
    version: '1.16.0',
    date: '2026-10-10',
    changes: [
      'Deux nouvelles classes, le CM1 et le CM2, avec 19 nouveaux jeux en dix niveaux : la conjugaison, la phrase et ses fonctions, accords et homophones, les mots et la lecture du CM ; les très grands nombres, les décimaux, les fractions, le calcul mental, les opérations, les problèmes, données et hasard, les mesures et la géométrie du CM ; l’histoire, la géographie, vivre en République, les sciences et l’anglais du CM.',
      'Chaque classe a maintenant son programme, d’après les textes officiels en vigueur : seuls les jeux et les niveaux de l’année sont proposés, de la petite section au CM2.',
      'Nouveau jeu « Gauche ou droite ? » (Le monde), de la moyenne section au CE2 : l’image de gauche ou de droite, lire de gauche à droite, sa main gauche, les flèches, le robot qui tourne, la voiture au carrefour, la droite d’une personne de face.',
      'Mettre l’icône sur l’écran d’accueil : les étapes suivent le navigateur (Safari et iOS 26, Chrome, Samsung Internet, Firefox, Brave, Edge…), et le bouton « Installer l’app » apparaît même quand le navigateur le propose après l’ouverture.',
      'Emoji en couleur sur les navigateurs qui ne les montrent qu’en noir et blanc (écran des voitures Tesla, Chromium sous Linux).',
      'Pictogrammes plus grands dans les suites, les dessins à toucher, les calculs illustrés et les balances.',
    ],
  },
  {
    version: '1.15.0',
    date: '2026-10-08',
    changes: [
      'Nouveau jeu « Les émotions » (Le monde) : reconnaître six émotions sur un visage, les nommer, les relier à une situation et à ce que l’on sent dans son corps, petites ou grandes émotions, émotions plus fines (fier, jaloux, déçu…), savoir se calmer et aider un copain.',
      'Nouveau jeu « Cherche et trouve » (Jeux et logique) : retrouver une image parmi beaucoup d’autres, de plus en plus petites, tournées et ressemblantes, un visage, ou celle qui n’est pas comme les autres.',
    ],
  },
  {
    version: '1.14.2',
    date: '2026-10-08',
    changes: [
      'Les fractions : sur un petit téléphone en paysage, la tablette dessinée dans les réponses tient dans son bouton.',
    ],
  },
  {
    version: '1.14.1',
    date: '2026-10-08',
    changes: [
      'Voix d’Estelle pour les nouveautés de la 1.14.0 : lecture à voix haute, correction expliquée, CE2 (imparfait, grands nombres) et petite section.',
      'Points à relier : le point suivant ne s’allume plus à chaque fois, seulement au départ et après une erreur.',
      'iPad mini en paysage : le pavé numérique et l’accueil tiennent dans l’écran, aussi avec le texte agrandi ou les grandes cibles.',
    ],
  },
  {
    version: '1.14.0',
    date: '2026-10-08',
    changes: [
      'Deux nouvelles classes : la petite section (des jeux sans lecture, aux niveaux les plus faciles) et le CE2, avec cinq nouveaux jeux : les grands nombres jusqu’à 10 000, la multiplication (de tête puis posée), la division, périmètres et longueurs, l’imparfait.',
      'Textes déchiffrables (CP) : dans la fiche de l’enfant, les parents cochent les sons déjà vus en classe ; les jeux de lecture n’utilisent alors que des mots lisibles avec ces sons (et les mots-outils choisis).',
      'Nouveau jeu « Lire à voix haute » (CP, CE1, CE2) : l’enfant lit le plus de mots possible en une minute, un adulte touche les mots ratés ; le score (mots lus par minute) et son évolution semaine par semaine sont dans le Suivi.',
      'Corriger en expliquant : après une première erreur en calcul, tables, doubles, comparer, dizaines, monnaie, homophones, accords ou conjugaison, une courte explication dessinée et dite aide à comprendre avant de réessayer.',
      'Démonstration : la première fois qu’un enfant ouvre un jeu au geste pas évident (tracer, relier, entourer, glisser…), une main montre le geste ; le bouton « ? » la remontre.',
      'Fiches à imprimer : depuis l’espace parents, une feuille A4 d’exercices au niveau de l’enfant, avec son corrigé, pour les jours sans écran.',
      'Sous-titres : ce qu’il faut trouver à l’oreille (le mot de la dictée, le mot anglais entendu…) n’est plus écrit dans le bandeau.',
    ],
  },
  {
    version: '1.13.0',
    date: '2026-10-08',
    changes: [
      'Français : nouveaux jeux « Conjugaison » (être, avoir, verbes en -er au présent, futur, passé composé), « Les accords » (pluriel, féminin, le verbe s’accorde, la lettre ajoutée soulignée), « Ponctuation et majuscules » (choisir . ? ou ! d’après l’intonation d’Estelle) et « Les mots » (catégories, contraires, synonymes, familles de mots).',
      'Histoires : nouveau jeu « Dans l’ordre » (remettre 3 à 5 images d’une histoire dans l’ordre, avant, ensuite), et deux niveaux de plus dans les petits textes : « Pourquoi ? » et « Ce que pense le personnage ».',
      'Maths : nouveaux jeux « La droite numérique » (placer et lire un nombre sur une ligne graduée), « Les fractions » (moitié, tiers, quart d’une pizza ou d’une quantité), « Tableaux et graphiques », « Problèmes en schémas » (le schéma en barres avant le calcul), « Le partage » (distribuer au doigt, restes, paquets) et « L’addition posée » (en colonnes, avec la retenue).',
      'Nouvelle rubrique « Sciences » 🔬 : dix jeux, du vivant à la planète. « Le vivant » (corps, cinq sens, cycles de vie, hygiène, sommeil, bien manger), « Le corps humain » (squelette, articulations, organes, dents : toucher la partie sur le dessin), « Les animaux et leur milieu » (classer, qui mange qui, l’hiver des animaux), « La matière » (eau, glace, vapeur, flotter ou couler, aimant, matériaux), « Les mélanges » (dissoudre, filtrer, évaporer, mener une expérience), « L’électricité » (dangers, circuit, interrupteur, conducteurs), « Objets et machines » (roue, levier, poulie, engrenages), « Le ciel et la Terre » (jour et nuit, Lune, planètes, saisons), « La météo » (symboles, thermomètre, s’habiller) et « Prendre soin de la planète » (trier, économiser l’eau et l’énergie).',
      'Le monde : nouveaux jeux « Sécurité et vivre ensemble » (émotions, politesse, traverser la rue, numéros d’urgence 15, 17, 18, 112) et « Se repérer » (devant, derrière, gauche, droite, plan, flèches) ; la rubrique est rangée en sections.',
      'Accessibilité, réglée pour chaque enfant dans l’espace parents : texte plus grand ou plus espacé, fort contraste, grandes cibles, mode calme (sans musique ni décor, animations réduites), sans chrono, syllabes colorées dans les textes à lire (dyslexie), couleurs nommées ou à motifs (daltonisme), sous-titres de tout ce que dit Estelle, niveaux d’écoute facultatifs (surdité) et « toucher plutôt que glisser » (chaque geste glissé ou tracé se fait aussi en touchers).',
      'Accessibilité pour tous : les jeux se jouent aussi au clavier (Tab, Entrée, flèches), dessins et labyrinthes compris, avec un contour de focus bien visible, les dessins sont décrits aux lecteurs d’écran, les contrastes des couleurs sont contrôlés automatiquement, et une déclaration d’accessibilité (RGAA) est jointe.',
    ],
  },
  {
    version: '1.12.0',
    date: '2026-10-08',
    changes: [
      'Chaque jeu a maintenant de 7 à 10 niveaux : près de 120 niveaux nouveaux, ajoutés à la fin de chaque jeu (les niveaux déjà atteints ne changent pas).',
      'Français : recoller les syllabes, sons proches (p/b, f/v…), syllabe de la fin, lettres muettes, mots qui regroupent, qui/où/quand/pourquoi, il/elle/ils/elles, phrases à remettre en ordre, phrase négative, la/là, ce/se, c’est/s’est, pluriel et accords.',
      'Écrire au doigt : nombres à 2 chiffres, syllabes et petits mots attachés. Dictée : lettres muettes et accents. Histoires : le sens des mots, vrai/faux/on ne sait pas. Petits textes documentaires et recettes.',
      'Maths et logique : compléter à 100, un de moins, la moitié, formes de la vie courante, devinettes, ombres tournées, fois 10 et fois 100, durées, « moins dix ». Puzzles de 30 et 36 pièces, coins coupés, rétrécir un dessin.',
      'Nouveau jeu « Le labyrinthe rond » : des anneaux à traverser au doigt jusqu’au trésor du centre (ou du centre vers la sortie), avec des clés à ramasser. Le labyrinthe carré gagne un niveau « Les trois clés ».',
      'Nouveau jeu « La carte du monde » : toucher les continents, les océans, la France, les pays d’Europe et du monde, le pays d’un drapeau, le continent d’un animal, les capitales, et voyager chez le voisin avec la rose des vents.',
      'Trois nouveaux jeux de logique : « Le tableau logique » (trouver le dessin qui manque, jusqu’à trois règles à la fois), « Les balances » (combien pèse l’animal ?) et « Le dessin caché » (picross de 4 × 4 à 8 × 8).',
      'Sudoku plus difficiles : grilles 6 × 6 très dures, puis un vrai sudoku 9 × 9 en trois niveaux, toujours avec une seule solution (les niveaux faciles sont regroupés, le niveau atteint est conservé).',
      'Le monde : les voisins de la France, les océans, lire les couleurs d’un drapeau, le drapeau effacé.',
      'Anglais : thèmes regroupés deux par deux (10 niveaux au lieu de 13, le niveau atteint est conservé), phrases croisées, l’ordre des mots, histoires « Who is…? », politesse, nombres jusqu’à 100, calculs jusqu’à 20, mélanges de couleurs, nouveaux memory, intrus et contraires, questions.',
    ],
  },
  {
    version: '1.11.0',
    date: '2026-10-07',
    changes: [
      'Le son 🎵 et la voix 🗣️ se coupent ou se remettent d’un geste sur chaque écran, même pendant un jeu : deux boutons en haut à droite (sur « Qui joue ? », en bas). Le son regroupe la musique et les petits sons.',
      'Voix remise pendant un jeu : la consigne est redite tout de suite.',
      'En bas de « Qui joue ? », en petit : le numéro de version, le contact et le journal des modifications.',
      '« Qui joue ? » : avec une photo, le prénom n’est plus écrit deux fois (il reste en gros sous la photo).',
      'Nouveau nom : « Lire, compter et s’amuser ! » (titre de la page, nom de l’app et crédits ; l’icône garde « Lire&Compter », plus court).',
    ],
  },
  {
    version: '1.10.1',
    date: '2026-10-07',
    changes: [
      'Préparation du déménagement de l’application vers sa nouvelle adresse : le mode hors ligne ne garde plus jamais une page de redirection à la place de l’application.',
    ],
  },
  {
    version: '1.10.0',
    date: '2026-10-07',
    changes: [
      'Accueil : deux boutons à côté des étoiles pour couper ou remettre la musique 🎵 et la voix 🔊, d’un seul geste (les mêmes réglages que dans l’Espace parents). Coupé, le bouton est barré.',
      'Voix coupée : plus aucune voix, même pas les histoires enregistrées par un parent ; l’enfant lit seul. En remettant la voix, Estelle dit bonjour.',
      'Un prénom très long se termine par « … » dans le bouton du joueur, en haut de l’accueil (il reste écrit en entier dans « Bonjour … ! »).',
    ],
  },
  {
    version: '1.9.1',
    date: '2026-10-07',
    changes: [
      'Mots dits seuls mieux prononcés : chaque mot a été réécouté son par son, et refait s’il était mal dit (« souris » sans le « s » final, « chat » sans le « t », « singe » qui ne sonne plus comme l’anglais « sing »…) : près de 1 000 mots refaits.',
      'Seuls les sons corrigés sont téléchargés à nouveau : un petit paquet, pas toute la voix.',
    ],
  },
  {
    version: '1.9.0',
    date: '2026-10-06',
    changes: [
      'Une seule voix, celle d’Estelle, partout : en anglais aussi, et plus jamais la voix de l’appareil au milieu d’une consigne (sauf pour un prénom rare, ou un son pas encore téléchargé).',
      'Chaque phrase est dite d’un seul tenant, et les phrases d’une consigne s’enchaînent sans trou, avec une petite pause naturelle entre elles.',
      'Voix plus égale : même volume d’un son à l’autre, même hauteur (les exclamations ne montent plus dans les aigus), et des mots moins ralentis.',
      'Chaque son est vérifié par une reconnaissance vocale (la diction doit être claire), et refait s’il le faut.',
      'Consignes réécrites en phrases entières (écrire les lettres, chemins de lettres, calendrier, rimes…).',
      'Premier lancement : la voix se télécharge bien plus vite (une quinzaine de paquets au lieu de milliers de petits fichiers), avec une barre en haut de l’écran qui montre l’avancement.',
    ],
  },
  {
    version: '1.8.1',
    date: '2026-10-06',
    changes: [
      'La voix naturelle arrive vraiment : environ 7 400 sons enregistrés avec la voix d’Estelle (consignes, félicitations, histoires, nombres de 0 à 1000, prénoms courants). Ils se téléchargent en arrière-plan, puis marchent sans Internet.',
      'Les pauses trop longues de la voix sont raccourcies.',
    ],
  },
  {
    version: '1.8.0',
    date: '2026-10-04',
    changes: [
      'Voix naturelle : les consignes, les histoires et les félicitations sont dites par une voix enregistrée bien plus naturelle (Estelle, et Alba pour l’anglais). Elle marche aussi sans Internet, une fois les sons téléchargés (automatiquement, en arrière-plan).',
      'Les phrases rares et les prénoms peu courants restent dits par la voix de l’appareil. Réglages → « Voix naturelle » pour revenir à la voix de l’appareil.',
    ],
  },
  {
    version: '1.7.0',
    date: '2026-10-03',
    changes: [
      'Nouveaux jeux : « Écris au doigt » (traits, chiffres, capitales, lettres attachées, puis son prénom), « La dictée de mots », « Règle l’horloge » et « Défi chrono des tables ».',
      'Jouer à deux : deux enfants jouent chacun leur tour sur le même appareil, chacun à son niveau.',
      'Vos voix pour les histoires : un parent enregistre une histoire (Espace parents → Réglages), et l’enfant l’entend avec sa voix pendant que les phrases s’allument. Les enregistrements restent sur l’appareil.',
      'Histoires et petits textes de saison (Halloween, Noël, hiver, printemps, été, automne) : ils reviennent plus souvent pendant leur saison.',
      'Espace parents : choisir les jeux de chaque enfant (masquer une rubrique ou un jeu, en conseiller jusqu’à 3 en haut de son accueil).',
      '« Qui joue ? » explique comment ajouter l’icône sur l’écran d’accueil.',
      'Les prénoms peuvent faire jusqu’à 30 caractères.',
    ],
  },
  {
    version: '1.6.0',
    date: '2026-10-03',
    changes: [
      'Nouveaux jeux : le puzzle (de 4 à 25 pièces), le memory (de 2 à 10 paires, chiffres et quantités), le coloriage magique (la couleur dépend du nombre ou du calcul) et les points à relier au doigt (un dessin apparaît).',
      'Les drapeaux : 46 pays dessinés, les reconnaître, les drapeaux qui se ressemblent, les continents, compléter un drapeau.',
      'Anglais : 8 nouveaux jeux pour les nombres jusqu’à 100, calculer en anglais, mélanger les couleurs, colorier en lisant les couleurs, le memory, l’intrus, les contraires et les petites phrases.',
      'Trois niveaux de plus dans chaque jeu, de plus en plus difficiles.',
      'Rubriques « Jeux et logique » et « Anglais » rangées en sections.',
      'Mon personnage : tous les tee-shirts et accessoires sont disponibles tout de suite, sans attendre les étoiles.',
      'Mode avion vérifié : tous les jeux s’ouvrent sans réseau ; hors connexion, la voix passe sur une voix installée sur l’appareil.',
      'Sécurité renforcée : la page n’accepte que ses propres fichiers.',
    ],
  },
  {
    version: '1.5.1',
    date: '2026-10-03',
    changes: [
      'Correction : l’écran « Mon personnage » affichait un message incompréhensible ([object PointerEvent]).',
    ],
  },
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
