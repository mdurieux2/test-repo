// Histoires lues à voix haute en karaoké : le mot lu s'allume. Puis une question.
// Niveau 1 : écouter (réponses en images) ; niveaux 2 et 3 : lire en suivant ; niveau 4 :
// deviner ce qui n'est pas dit ; niveau 5 : 6 phrases ; niveau 6 : remettre les images dans l'ordre ;
// niveau 7 : le sens d'un mot ; niveau 8 : vrai, faux, ou l'histoire ne le dit pas.
// Chaque histoire a un identifiant stable (`id`) : un parent peut l'enregistrer de sa voix
// (recordings.js), et l'enregistrement remplace alors la voix de synthèse.

import { shuffle } from '../random.js';
import { pickSeasonal } from './helpers.js';
import { sonsActifs, texteDechiffrable } from '../graphemes.js';

const STORIES = [
  // ---- Niveau 1 : écouter une histoire (maternelle), réponses en images
  { id: 'chat-pelote', level: 1, title: 'Le chat et la pelote', emoji: '🐱', sentences: ['Minou est un petit chat.', 'Il joue avec une pelote de laine.', 'La pelote roule sous le lit !'],
    question: 'Avec quoi joue Minou ?', answer: '🧶', others: ['⚽', '🦴'] },
  { id: 'pluie', level: 1, title: 'La pluie', emoji: '🌧️', sentences: ['Il pleut très fort.', 'Léo met ses bottes et prend son parapluie.', 'Il saute dans les flaques !'],
    question: 'Que prend Léo ?', answer: '☂️', others: ['🕶️', '🧢'] },
  { id: 'gateau', level: 1, title: 'Le gâteau', emoji: '🎂', sentences: ['C’est l’anniversaire de Zoé.', 'Maman a fait un gros gâteau au chocolat.', 'Zoé souffle les bougies.'],
    question: 'C’est l’anniversaire de qui ?', answer: '👧', others: ['👴', '🐶'] },
  { id: 'petit-poisson', level: 1, title: 'Le petit poisson', emoji: '🐟', sentences: ['Un petit poisson nage dans la mer.', 'Il rencontre une grosse baleine.', 'Ils deviennent amis.'],
    question: 'Qui le poisson rencontre-t-il ?', answer: '🐳', others: ['🐱', '🐦'] },
  { id: 'au-parc', level: 1, title: 'Au parc', emoji: '🌳', sentences: ['Sami va au parc avec papi.', 'Il fait du toboggan.', 'Puis il mange une glace.'],
    question: 'Que mange Sami ?', answer: '🍦', others: ['🍕', '🍌'] },
  { id: 'ferme', level: 1, title: 'La ferme', emoji: '🚜', sentences: ['À la ferme, la vache fait meuh.', 'Le cochon se roule dans la boue.', 'La poule pond un œuf.'],
    question: 'Qui pond un œuf ?', answer: '🐔', others: ['🐄', '🐷'] },
  { id: 'bonne-nuit', level: 1, title: 'Bonne nuit', emoji: '🌙', sentences: ['Le soir, Lina met son pyjama.', 'Papa lui lit une histoire.', 'Lina s’endort avec son doudou lapin.'],
    question: 'Quel est le doudou de Lina ?', answer: '🐰', others: ['🐻', '🐶'] },
  { id: 'neige', level: 1, title: 'La neige', emoji: '❄️', sentences: ['Ce matin, tout est blanc.', 'Il a neigé toute la nuit.', 'Hugo fait un bonhomme de neige.'],
    question: 'Que fait Hugo ?', answer: '⛄', others: ['🏰', '🪁'] },

  // ---- Niveau 2 : lire en suivant (CP)
  { id: 'velo-rouge', level: 2, title: 'Le vélo rouge', emoji: '🚲', sentences: ['Tom a un vélo rouge.', 'Il roule vite dans la rue.', 'Oh non ! Il tombe.', 'Il a mal au genou, mais il repart.'],
    question: 'De quelle couleur est le vélo ?', answer: 'rouge', others: ['bleu', 'vert'] },
  { id: 'loup-gourmand', level: 2, title: 'Le loup gourmand', emoji: '🐺', sentences: ['Le loup a très faim.', 'Il voit un pot de miel.', 'Il le mange en entier.', 'Maintenant, il a mal au ventre !'],
    question: 'Que mange le loup ?', answer: 'du miel', others: ['une pomme', 'du pain'] },
  { id: 'sortie-mer', level: 2, title: 'La sortie à la mer', emoji: '🏖️', sentences: ['Samedi, Lou va à la mer.', 'Elle ramasse des coquillages.', 'Elle les met dans son seau.', 'Le soir, elle les montre à mamie.'],
    question: 'Que ramasse Lou ?', answer: 'des coquillages', others: ['des fleurs', 'des cailloux'] },
  { id: 'chien-perdu', level: 2, title: 'Le chien perdu', emoji: '🐶', sentences: ['Un petit chien pleure dans la rue.', 'Nina le prend dans ses bras.', 'Sur son collier, il y a un nom : Pilou.', 'Nina le ramène chez lui.'],
    question: 'Comment s’appelle le chien ?', answer: 'Pilou', others: ['Nina', 'Médor'] },
  { id: 'cabane', level: 2, title: 'La cabane', emoji: '🛖', sentences: ['Dans le jardin, Max fait une cabane.', 'Il prend des branches et une vieille couverture.', 'Sa sœur l’aide.', 'Ils y mangent leur goûter.'],
    question: 'Qui aide Max ?', answer: 'sa sœur', others: ['son papa', 'son chien'] },
  { id: 'fusee', level: 2, title: 'La fusée', emoji: '🚀', sentences: ['Léa construit une fusée en carton.', 'Elle la peint en jaune.', 'Elle met un casque sur sa tête.', 'Cinq, quatre, trois, deux, un… décollage !'],
    question: 'En quoi est la fusée ?', answer: 'en carton', others: ['en bois', 'en fer'] },

  // ---- Niveau 3 : histoires plus longues (CE1)
  { id: 'tresor-grenier', level: 3, title: 'Le trésor du grenier', emoji: '🗝️', sentences: ['Un jour de pluie, Arthur monte au grenier.', 'Sous une couverture, il trouve un vieux coffre.', 'Il l’ouvre doucement : dedans, il y a des photos de son grand-père enfant.', 'Le soir, son grand-père lui raconte ses souvenirs.'],
    question: 'Qu’y a-t-il dans le coffre ?', answer: 'des photos', others: ['de l’or', 'des jouets'] },
  { id: 'course-escargots', level: 3, title: 'La course des escargots', emoji: '🐌', sentences: ['Dans le potager, deux escargots font la course.', 'Le premier part très vite, puis s’endort sous une feuille de salade.', 'Le second avance lentement, sans jamais s’arrêter.', 'C’est lui qui gagne la course !'],
    question: 'Pourquoi le premier escargot perd-il ?', answer: 'il s’endort', others: ['il se perd', 'il a peur'] },
  { id: 'cerf-volant', level: 3, title: 'Le cerf-volant', emoji: '🪁', sentences: ['Chloé et son père vont sur la colline avec un cerf-volant.', 'Le vent souffle fort, le cerf-volant monte très haut.', 'Soudain, la ficelle casse !', 'Le cerf-volant atterrit dans un arbre, et un pompier vient le chercher.'],
    question: 'Qui va chercher le cerf-volant ?', answer: 'un pompier', others: ['le père de Chloé', 'un oiseau'] },
  { id: 'boulangerie', level: 3, title: 'La boulangerie', emoji: '🥐', sentences: ['Tous les dimanches, Malo achète le pain.', 'Il demande une baguette et trois croissants.', 'La boulangère lui rend la monnaie en souriant.', 'Sur le chemin, Malo croque un petit bout de baguette !'],
    question: 'Combien de croissants Malo achète-t-il ?', answer: 'trois', others: ['deux', 'cinq'] },

  // ---- Niveau 4 : pourquoi ? comment se sent-il ? (la réponse n'est pas écrite dans l'histoire)
  { id: 'parapluie-oublie', level: 4, title: 'Le parapluie oublié', emoji: '🌂', sentences: ['Ce matin, le ciel est tout gris.', 'Maman dit à Tom de prendre son parapluie, mais il l’oublie.', 'À midi, Tom rentre de l’école.', 'Il est trempé de la tête aux pieds !'],
    question: 'Pourquoi Tom est-il trempé ?', answer: 'il a plu', others: ['il a nagé', 'il a couru'] },
  { id: 'paquet-dore', level: 4, title: 'Le paquet doré', emoji: '🎁', sentences: ['Lila emballe une boîte dans du papier doré.', 'Elle dessine des cœurs sur une carte.', 'Demain, c’est la fête des mères.', 'Vite, Lila cache la boîte sous son lit !'],
    question: 'Pour qui est le cadeau ?', answer: 'pour maman', others: ['pour papa', 'pour Lila'] },
  { id: 'glace-fraise', level: 4, title: 'La glace à la fraise', emoji: '🍦', sentences: ['Il fait très chaud.', 'Hugo achète une glace à la fraise.', 'Il parle longtemps avec son copain.', 'Quand il veut la manger, sa main est toute collante !'],
    question: 'Pourquoi la main d’Hugo colle-t-elle ?', answer: 'la glace a fondu', others: ['il a du miel', 'il a peint'] },
  { id: 'pirate-attend', level: 4, title: 'Pirate attend', emoji: '🐕', sentences: ['À quatre heures, Pirate s’assoit devant la porte.', 'Il remue la queue en regardant la rue.', 'Quand le bus jaune s’arrête, il aboie de joie.', 'Emma descend du bus et court le caresser.'],
    question: 'Qui Pirate attend-il ?', answer: 'Emma', others: ['le facteur', 'le chat'] },
  { id: 'tour-cubes', level: 4, title: 'La tour de cubes', emoji: '🧱', sentences: ['Nina construit une très haute tour.', 'Son petit frère arrive en courant.', 'Boum ! La tour tombe par terre.', 'Nina croise les bras et fronce les sourcils.'],
    question: 'Comment se sent Nina ?', answer: 'elle est fâchée', others: ['elle est contente', 'elle a faim'] },
  { id: 'traces', level: 4, title: 'Les traces', emoji: '🐾', sentences: ['Ce matin, il y a de la neige dans le jardin.', 'Léon voit de petites traces de pattes.', 'Elles vont jusqu’à la cabane du lapin.', 'La porte de la cabane est ouverte !'],
    question: 'Qui a laissé les traces ?', answer: 'le lapin', others: ['un ours', 'le facteur'] },

  // ---- Niveau 5 : histoires en 6 phrases (plus de détails à retenir, l'ordre des événements)
  { id: 'pique-nique', level: 5, title: 'Le pique-nique', emoji: '🧺', sentences: ['Dimanche, la famille part pique-niquer.', 'Papa porte le grand panier.', 'Les enfants posent une nappe sur l’herbe.', 'Oh ! Une fourmi grimpe sur le sandwich de Léa.', 'Tout le monde rit.', 'Après le repas, ils jouent au ballon.'],
    question: 'Que font-ils après le repas ?', answer: 'ils jouent au ballon', others: ['ils dorment', 'ils nagent'] },
  { id: 'spectacle', level: 5, title: 'Le spectacle', emoji: '🎭', sentences: ['Ce soir, Clara joue au spectacle.', 'Elle porte un costume de papillon.', 'Avant de monter sur scène, elle a peur.', 'Elle cherche ses parents dans la salle.', 'Quand elle les voit, elle se sent mieux.', 'À la fin, tout le monde applaudit.'],
    question: 'Qu’est-ce qui rassure Clara ?', answer: 'voir ses parents', others: ['son costume', 'la musique'] },
  { id: 'petit-bateau', level: 5, title: 'Le petit bateau', emoji: '⛵', sentences: ['Malo et papi fabriquent un bateau en bois.', 'Ils peignent la voile en blanc.', 'Puis ils vont à la rivière.', 'Malo pose le bateau sur l’eau.', 'Oh non ! Le courant l’emporte.', 'Papi le rattrape juste avant le pont.'],
    question: 'Qui rattrape le bateau ?', answer: 'papi', others: ['Malo', 'un pêcheur'] },
  { id: 'dent-qui-bouge', level: 5, title: 'La dent qui bouge', emoji: '🦷', sentences: ['Une dent de Sofia bouge.', 'Au dîner, elle croque une pomme.', 'Crac ! La dent tombe dans l’assiette.', 'Sofia la range dans une petite boîte.', 'Le soir, elle la glisse sous l’oreiller.', 'Le matin, il y a une pièce à la place !'],
    question: 'Quand la dent tombe-t-elle ?', answer: 'au dîner', others: ['le matin', 'à l’école'] },
  { id: 'herisson', level: 5, title: 'Le hérisson', emoji: '🦔', sentences: ['Un soir, Jules entend du bruit dehors.', 'Il prend sa lampe et s’approche.', 'C’est un petit hérisson qui a faim !', 'Jules lui apporte un bol d’eau.', 'Le hérisson boit, puis il repart.', 'Depuis, Jules le guette chaque soir.'],
    question: 'Que donne Jules au hérisson ?', answer: 'de l’eau', others: ['du lait', 'du pain'] },
  { id: 'marche', level: 5, title: 'Le marché', emoji: '🍅', sentences: ['Rose va au marché avec mamie.', 'Elles achètent des tomates et du fromage.', 'Le marchand donne une pomme à Rose.', 'Sur le chemin, il se met à pleuvoir.', 'Elles courent sous un grand arbre.', 'Rose croque sa pomme en attendant.'],
    question: 'Que se passe-t-il sur le chemin ?', answer: 'il pleut', others: ['il neige', 'Rose tombe'] },

  // ---- Niveau 6 : remettre les images dans l'ordre de l'histoire (début, milieu, fin)
  { id: 'fleur-zoe', level: 6, title: 'La fleur de Zoé', emoji: '🌱', sentences: ['Zoé plante une graine.', 'Elle l’arrose tous les jours.', 'Une petite pousse sort de la terre.', 'Bientôt, une belle fleur s’ouvre !'],
    steps: [['💧', 'Zoé arrose'], ['🌱', 'la pousse sort'], ['🌻', 'la fleur s’ouvre']] },
  { id: 'bonhomme', level: 6, title: 'Le bonhomme', emoji: '⛄', sentences: ['Il neige toute la nuit.', 'Le matin, Max fait un bonhomme de neige.', 'Puis le soleil se met à briller.', 'Le bonhomme fond…'],
    steps: [['🌨️', 'il neige'], ['⛄', 'le bonhomme de neige'], ['☀️', 'le soleil brille']] },
  { id: 'poussin', level: 6, title: 'Le poussin', emoji: '🐣', sentences: ['La poule couve son œuf.', 'Crac ! La coquille se casse.', 'Un petit poussin sort.', 'Il suit sa maman partout.'],
    steps: [['🥚', 'l’œuf'], ['🐣', 'le poussin sort'], ['🐔', 'avec sa maman']] },
  { id: 'chenille', level: 6, title: 'La chenille', emoji: '🐛', sentences: ['Sur une feuille, il y a un petit œuf.', 'Une chenille en sort et mange.', 'Elle dort dans un cocon.', 'Un matin, un papillon s’envole !'],
    steps: [['🥚', 'l’œuf'], ['🐛', 'la chenille'], ['🦋', 'le papillon']] },
  { id: 'gateau-ines', level: 6, title: 'Le gâteau d’Inès', emoji: '🎂', sentences: ['Papa et Inès cassent des œufs.', 'Ils mélangent tout dans un bol.', 'Le gâteau cuit dans le four.', 'Le soir, Inès souffle les bougies !'],
    steps: [['🥚', 'les œufs'], ['🥣', 'on mélange'], ['🎂', 'les bougies']] },
  { id: 'journee-leo', level: 6, title: 'La journée de Léo', emoji: '🕗', sentences: ['Léo prend son petit déjeuner.', 'Ensuite, il va à l’école à vélo.', 'Le soir, il prend son bain.', 'Puis il s’endort.'],
    steps: [['🥣', 'le petit déjeuner'], ['🚲', 'à vélo'], ['🛁', 'le bain']] },

  // ---- Histoires de saison (identifiants de themes.js) : pendant leur saison, une histoire
  // sur deux en est une ; hors saison, elles ne sont jamais proposées. Ajoutées à la fin
  // pour ne rien changer au tirage des autres histoires.
  { id: 'sapin', season: 'noel', level: 1, title: 'Le sapin', emoji: '🎄', sentences: ['C’est bientôt Noël.', 'Papa et Jade décorent le sapin.', 'Jade met une étoile tout en haut !'],
    question: 'Que met Jade en haut du sapin ?', answer: '⭐', others: ['🎈', '🧦'] },
  { id: 'lettre-pere-noel', season: 'noel', level: 2, title: 'La lettre au père Noël', emoji: '✉️', sentences: ['Malo écrit une lettre au père Noël.', 'Il demande un petit train rouge.', 'Il dessine un renne dessus.', 'Puis il la poste avec maman.'],
    question: 'Que demande Malo ?', answer: 'un train', others: ['un ballon', 'une poupée'] },
  { id: 'matin-noel', season: 'noel', level: 4, title: 'Le matin de Noël', emoji: '🎁', sentences: ['Ce matin, Léna se lève très tôt.', 'Elle descend l’escalier sans faire de bruit.', 'Sous le sapin, il y a plein de paquets !', 'Le verre de lait est vide et les biscuits ont disparu.'],
    question: 'Qui a mangé les biscuits ?', answer: 'le père Noël', others: ['le chat', 'Léna'] },
  { id: 'citrouille', season: 'halloween', level: 1, title: 'La citrouille', emoji: '🎃', sentences: ['C’est bientôt Halloween.', 'Papi et Lou creusent une citrouille.', 'Ils mettent une bougie dedans.'],
    question: 'Que mettent-ils dans la citrouille ?', answer: '🕯️', others: ['🍬', '🧸'] },
  { id: 'soir-halloween', season: 'halloween', level: 5, title: 'Le soir d’Halloween', emoji: '🦇', sentences: ['Ce soir, c’est Halloween.', 'Adam se déguise en fantôme.', 'Avec sa sœur, il sonne chez les voisins.', 'Madame Rose leur donne des sucettes.', 'Sur le chemin, un chat noir passe devant eux.', 'Adam sursaute, puis il éclate de rire.'],
    question: 'En quoi Adam est-il déguisé ?', answer: 'en fantôme', others: ['en sorcier', 'en vampire'] },
  { id: 'luge', season: 'hiver', level: 1, title: 'La luge', emoji: '🏔️', sentences: ['Il a neigé sur la colline.', 'Tom s’assoit sur sa luge.', 'Hop ! Il glisse jusqu’en bas.'],
    question: 'Sur quoi glisse Tom ?', answer: '🛷', others: ['🚲', '🛴'] },
  { id: 'galette-rois', season: 'hiver', level: 3, title: 'La galette des rois', emoji: '👑', sentences: ['En janvier, on partage la galette des rois.', 'Sous la table, le plus jeune dit à qui donner chaque part.', 'Dans sa part, Inès sent quelque chose de dur : c’est la fève !', 'Elle devient la reine et porte la couronne.'],
    question: 'Que trouve Inès dans sa part ?', answer: 'la fève', others: ['une bague', 'une pièce'] },
  { id: 'chasse-oeufs', season: 'printemps', level: 1, title: 'La chasse aux œufs', emoji: '🥚', sentences: ['C’est Pâques !', 'Lucas cherche des œufs dans le jardin.', 'Il en trouve un sous une fleur.'],
    question: 'Où Lucas trouve-t-il un œuf ?', answer: '🌷', others: ['🚗', '🛁'] },
  { id: 'hirondelles', season: 'printemps', level: 4, title: 'Les hirondelles', emoji: '🌸', sentences: ['Les jours sont plus longs et plus doux.', 'Les arbres du jardin se couvrent de fleurs.', 'Les hirondelles reviennent faire leur nid.', 'Papi range les gros manteaux au grenier.'],
    question: 'Quelle saison commence ?', answer: 'le printemps', others: ['l’hiver', 'l’automne'] },
  { id: 'pasteque', season: 'ete', level: 1, title: 'La pastèque', emoji: '☀️', sentences: ['C’est l’été.', 'Mamie coupe une grosse pastèque.', 'Rayan croque une tranche bien fraîche.'],
    question: 'Que coupe mamie ?', answer: '🍉', others: ['🍞', '🎂'] },
  { id: 'feu-artifice', season: 'ete', level: 4, title: 'Le feu d’artifice', emoji: '🎆', sentences: ['Ce soir, c’est le 14 Juillet.', 'Il fait nuit et tout le monde regarde le ciel.', 'Boum ! Des étoiles de toutes les couleurs éclatent.', 'Le petit chien de Léo se cache sous le banc.'],
    question: 'Pourquoi le chien se cache-t-il ?', answer: 'il a peur', others: ['il a froid', 'il a faim'] },
  { id: 'foret-automne', season: 'automne', level: 1, title: 'Dans la forêt', emoji: '🍂', sentences: ['C’est l’automne.', 'Maya ramasse des châtaignes.', 'Dans un arbre, un écureuil la regarde.'],
    question: 'Qui regarde Maya ?', answer: '🐿️', others: ['🐻', '🦉'] },
  { id: 'pomme-papi', season: 'automne', level: 6, title: 'La pomme de papi', emoji: '🍎', sentences: ['Le pommier de papi est en fleurs.', 'Une petite pomme verte pousse.', 'Elle grandit tout l’été.', 'En automne, elle est toute rouge !'],
    steps: [['🌸', 'les fleurs'], ['🍏', 'la pomme verte'], ['🍎', 'la pomme rouge']] },

  // ---- Niveau 7 : le sens d'un mot nouveau, deviné grâce à l'histoire (vocabulaire)
  { id: 'bonnet-perdu', level: 7, title: 'Le bonnet perdu', emoji: '🧣', sentences: ['Il neige et Paul a perdu son bonnet.', 'Dans la cour, il grelotte.', 'Son amie Inès lui prête son écharpe.', 'Paul se sent tout de suite mieux.'],
    question: 'Que veut dire « il grelotte » ?', answer: 'il tremble de froid', others: ['il chante fort', 'il court vite'] },
  { id: 'gros-orage', level: 7, title: 'Le gros orage', emoji: '⛈️', sentences: ['Le ciel devient tout noir.', 'Un éclair traverse le ciel, puis le tonnerre gronde.', 'Le petit chat est terrifié.', 'Il file se cacher sous le lit.'],
    question: 'Que veut dire « terrifié » ?', answer: 'il a très peur', others: ['il est très content', 'il a très faim'] },
  { id: 'soupe-mamie', level: 7, title: 'La soupe de mamie', emoji: '🥣', sentences: ['Mamie sert une soupe de légumes.', 'Attention, elle est brûlante !', 'Léo souffle doucement sur sa cuillère.', 'Puis il la boit à petites gorgées.'],
    question: 'Que veut dire « brûlante » ?', answer: 'très chaude', others: ['très froide', 'très sucrée'] },
  { id: 'grand-menage', level: 7, title: 'Le grand ménage', emoji: '🧹', sentences: ['Samedi, toute la famille range la maison.', 'Lou passe le balai et papa lave les vitres.', 'Le soir, tout le monde est épuisé.', 'Ils s’endorment très vite !'],
    question: 'Que veut dire « épuisé » ?', answer: 'très fatigué', others: ['très sale', 'très joyeux'] },
  { id: 'provisions-ecureuil', level: 7, title: 'Les provisions', emoji: '🐿️', sentences: ['En automne, l’écureuil ramasse des noisettes.', 'Il les cache dans le creux d’un arbre.', 'Ce sont ses provisions pour l’hiver.', 'Quand il fera froid, il aura de quoi manger.'],
    question: 'Que sont des « provisions » ?', answer: 'de la nourriture', others: ['des jouets', 'des vêtements'] },
  { id: 'secret-zoe', level: 7, title: 'Le secret', emoji: '🤫', sentences: ['Zoé a un secret pour son amie Léna.', 'Elle se penche vers elle et lui chuchote quelque chose.', 'Personne d’autre ne peut entendre.', 'Léna sourit.'],
    question: 'Que veut dire « chuchoter » ?', answer: 'parler tout bas', others: ['crier très fort', 'chanter'] },

  // ---- Niveau 8 : vrai, faux, ou l'histoire ne le dit pas ? (la question est une phrase à juger)
  { id: 'rex-balle', level: 8, title: 'Rex et la balle', emoji: '🐕', sentences: ['Rex est le chien de Malik.', 'Chaque soir, ils jouent à la balle dans le jardin.', 'Ce soir, la balle passe par-dessus la haie.', 'Rex va la chercher chez la voisine.'],
    question: 'Rex et Malik jouent le matin.', answer: 'faux', others: ['vrai', 'on ne sait pas'] },
  { id: 'piscine-jade', level: 8, title: 'À la piscine', emoji: '🏊', sentences: ['Mercredi, Jade va à la piscine avec son père.', 'Elle met ses lunettes et saute dans l’eau.', 'Elle nage jusqu’au bout du bassin.', 'Son père l’applaudit.'],
    question: 'Jade sait nager.', answer: 'vrai', others: ['faux', 'on ne sait pas'] },
  { id: 'gouter-lea', level: 8, title: 'Le goûter de Léa', emoji: '🍪', sentences: ['À quatre heures, Léa ouvre son sac.', 'Elle a des biscuits et une pomme.', 'Elle partage ses biscuits avec Sami.', 'Sami lui dit merci.'],
    question: 'Sami aime les pommes.', answer: 'on ne sait pas', others: ['vrai', 'faux'] },
  { id: 'train-papi', level: 8, title: 'Le train de papi', emoji: '🚂', sentences: ['Papi offre un petit train à Hugo.', 'Le train a trois wagons rouges.', 'Hugo construit un grand circuit dans sa chambre.', 'Le train fait le tour du lit !'],
    question: 'Le train a trois wagons.', answer: 'vrai', others: ['faux', 'on ne sait pas'] },
  { id: 'dessin-nina', level: 8, title: 'Le dessin de Nina', emoji: '🎨', sentences: ['En classe, Nina dessine une maison.', 'Elle peint le toit en rouge et la porte en bleu.', 'La maîtresse accroche le dessin au mur.'],
    question: 'La porte de la maison est rouge.', answer: 'faux', others: ['vrai', 'on ne sait pas'] },
  { id: 'sans-roulettes', level: 8, title: 'Sans les roulettes', emoji: '🚲', sentences: ['Aujourd’hui, Adam enlève les roulettes de son vélo.', 'Maman tient la selle, puis elle la lâche.', 'Adam roule tout seul jusqu’au portail !'],
    question: 'Le vélo d’Adam est bleu.', answer: 'on ne sait pas', others: ['vrai', 'faux'] },
];

/** Niveau 8 : les trois réponses, toujours dans le même ordre. */
const TRUE_FALSE = ['vrai', 'faux', 'on ne sait pas'];
const TRUE_FALSE_QUESTION = 'Vrai, faux, ou on ne sait pas ?';

/**
 * Textes déchiffrables (ctx.sons) : les histoires dont le titre, les phrases, la question et les réponses
 * écrites se lisent avec les sons vus (vrai, faux, on ne sait pas : toujours les mêmes, non comptés).
 * Il en faut au moins deux hors saison ; sinon, toutes.
 */
function readableStories(stories, sons) {
  if (!sonsActifs(sons)) return stories;
  const known = stories.filter((s) => [s.title, ...s.sentences, s.question, s.answer, ...(s.others || []), ...(s.steps || []).map(([, label]) => label)]
    .every((t) => !t || texteDechiffrable(t, sons)));
  return known.filter((s) => !s.season).length >= 2 ? known : stories;
}

/** Le décor d'une histoire : titre, image, phrases, et son identifiant (voix enregistrée). */
function storyStage(story) {
  return { type: 'karaoke', storyId: story.id, title: story.title, emoji: story.emoji, sentences: story.sentences };
}

/** Niveau 6 : après l'histoire, toucher les images dans l'ordre (jamais déjà rangées). */
function orderStory(rng, story) {
  let order = shuffle(rng, story.steps.map((_, i) => i));
  if (order.every((v, i) => v === i)) order = [...order.slice(1), order[0]];
  const text = 'Remets les images dans l’ordre de l’histoire.';
  return {
    key: `histoires:${story.title}`,
    karaoke: true,
    interaction: 'order',
    text,
    instruction: [text],
    replay: [text],
    stage: storyStage(story),
    items: order.map((i) => ({ value: i, emoji: story.steps[i][0], label: story.steps[i][1] })),
    order: 'asc',
    choices: [],
    answer: story.steps.map(([, label]) => label).join(', '),
    success: { speak: 'Bravo, tu as remis l’histoire dans l’ordre !' },
  };
}

/** Niveau 8 : la phrase est-elle vraie, fausse, ou l'histoire ne le dit-elle pas ? */
function trueFalseStory(story) {
  const { answer } = story;
  return {
    key: `histoires:${story.title}`,
    karaoke: true,
    text: `${story.question} ${TRUE_FALSE_QUESTION}`,
    instruction: [story.question, TRUE_FALSE_QUESTION],
    replay: [story.question, TRUE_FALSE_QUESTION],
    stage: storyStage(story),
    choices: TRUE_FALSE.map((o) => ({ value: o, label: o })),
    choiceStyle: 'answers',
    answer,
    success: { speak: answer === 'on ne sait pas' ? 'Bravo, l’histoire ne le dit pas !' : `C’est ${answer}, bravo !` },
  };
}

export const histoires = {
  id: 'histoires',
  domain: 'francais',
  section: 'Lire',
  title: 'Histoires lues',
  icon: '📖',
  skill: 'Écouter et suivre une histoire lue (karaoké), la comprendre et la raconter dans l’ordre',
  levels: [
    'Écoute une histoire', 'Lis en suivant', 'Histoires plus longues', 'Pourquoi ? (inférence)', 'Histoires en 6 phrases',
    'Remets dans l’ordre', 'Le sens des mots', 'Vrai, faux, on ne sait pas',
  ],
  // context.season : la saison du moment (seasonOf), pour les histoires de saison ;
  // context.sons : les sons vus en classe (textes déchiffrables, voir graphemes.js)
  generate(level, rng, _index, context = {}) {
    const story = pickSeasonal(rng, readableStories(STORIES.filter((s) => s.level === level), context.sons), context.season);
    if (level === 6) return orderStory(rng, story);
    if (level === 8) return trueFalseStory(story);
    const pictures = level === 1;
    const options = shuffle(rng, [story.answer, ...story.others]);
    return {
      key: `histoires:${story.title}`,
      karaoke: true,
      text: story.question,
      instruction: [story.question],
      replay: [story.question],
      stage: storyStage(story),
      choices: options.map((o) => ({ value: o, label: o })),
      choiceStyle: pictures ? 'pictures' : 'answers',
      answer: story.answer,
      success: { speak: pictures ? 'Bravo, tu as bien écouté l’histoire !' : `${story.answer[0].toUpperCase()}${story.answer.slice(1)}, bravo !` },
    };
  },
};

export const STORY_DATA = STORIES;
