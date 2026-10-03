// Histoires lues à voix haute en karaoké : le mot lu s'allume. Puis une question.
// Niveau 1 : écouter (réponses en images) ; niveaux 2 et 3 : lire en suivant.

import { pick, shuffle } from '../random.js';

const STORIES = [
  // ---- Niveau 1 : écouter une histoire (maternelle), réponses en images
  { level: 1, title: 'Le chat et la pelote', emoji: '🐱', sentences: ['Minou est un petit chat.', 'Il joue avec une pelote de laine.', 'La pelote roule sous le lit !'],
    question: 'Avec quoi joue Minou ?', answer: '🧶', others: ['⚽', '🦴'] },
  { level: 1, title: 'La pluie', emoji: '🌧️', sentences: ['Il pleut très fort.', 'Léo met ses bottes et prend son parapluie.', 'Il saute dans les flaques !'],
    question: 'Que prend Léo ?', answer: '☂️', others: ['🕶️', '🧢'] },
  { level: 1, title: 'Le gâteau', emoji: '🎂', sentences: ['C’est l’anniversaire de Zoé.', 'Maman a fait un gros gâteau au chocolat.', 'Zoé souffle les bougies.'],
    question: 'C’est l’anniversaire de qui ?', answer: '👧', others: ['👴', '🐶'] },
  { level: 1, title: 'Le petit poisson', emoji: '🐟', sentences: ['Un petit poisson nage dans la mer.', 'Il rencontre une grosse baleine.', 'Ils deviennent amis.'],
    question: 'Qui le poisson rencontre-t-il ?', answer: '🐳', others: ['🐱', '🐦'] },
  { level: 1, title: 'Au parc', emoji: '🌳', sentences: ['Sami va au parc avec papi.', 'Il fait du toboggan.', 'Puis il mange une glace.'],
    question: 'Que mange Sami ?', answer: '🍦', others: ['🍕', '🍌'] },
  { level: 1, title: 'La ferme', emoji: '🚜', sentences: ['À la ferme, la vache fait meuh.', 'Le cochon se roule dans la boue.', 'La poule pond un œuf.'],
    question: 'Qui pond un œuf ?', answer: '🐔', others: ['🐄', '🐷'] },
  { level: 1, title: 'Bonne nuit', emoji: '🌙', sentences: ['Le soir, Lina met son pyjama.', 'Papa lui lit une histoire.', 'Lina s’endort avec son doudou lapin.'],
    question: 'Quel est le doudou de Lina ?', answer: '🐰', others: ['🐻', '🐶'] },
  { level: 1, title: 'La neige', emoji: '❄️', sentences: ['Ce matin, tout est blanc.', 'Il a neigé toute la nuit.', 'Hugo fait un bonhomme de neige.'],
    question: 'Que fait Hugo ?', answer: '⛄', others: ['🏰', '🪁'] },

  // ---- Niveau 2 : lire en suivant (CP)
  { level: 2, title: 'Le vélo rouge', emoji: '🚲', sentences: ['Tom a un vélo rouge.', 'Il roule vite dans la rue.', 'Oh non ! Il tombe.', 'Il a mal au genou, mais il repart.'],
    question: 'De quelle couleur est le vélo ?', answer: 'rouge', others: ['bleu', 'vert'] },
  { level: 2, title: 'Le loup gourmand', emoji: '🐺', sentences: ['Le loup a très faim.', 'Il voit un pot de miel.', 'Il le mange en entier.', 'Maintenant, il a mal au ventre !'],
    question: 'Que mange le loup ?', answer: 'du miel', others: ['une pomme', 'du pain'] },
  { level: 2, title: 'La sortie à la mer', emoji: '🏖️', sentences: ['Samedi, Lou va à la mer.', 'Elle ramasse des coquillages.', 'Elle les met dans son seau.', 'Le soir, elle les montre à mamie.'],
    question: 'Que ramasse Lou ?', answer: 'des coquillages', others: ['des fleurs', 'des cailloux'] },
  { level: 2, title: 'Le chien perdu', emoji: '🐶', sentences: ['Un petit chien pleure dans la rue.', 'Nina le prend dans ses bras.', 'Sur son collier, il y a un nom : Pilou.', 'Nina le ramène chez lui.'],
    question: 'Comment s’appelle le chien ?', answer: 'Pilou', others: ['Nina', 'Médor'] },
  { level: 2, title: 'La cabane', emoji: '🛖', sentences: ['Dans le jardin, Max fait une cabane.', 'Il prend des branches et une vieille couverture.', 'Sa sœur l’aide.', 'Ils y mangent leur goûter.'],
    question: 'Qui aide Max ?', answer: 'sa sœur', others: ['son papa', 'son chien'] },
  { level: 2, title: 'La fusée', emoji: '🚀', sentences: ['Léa construit une fusée en carton.', 'Elle la peint en jaune.', 'Elle met un casque sur sa tête.', 'Cinq, quatre, trois, deux, un… décollage !'],
    question: 'En quoi est la fusée ?', answer: 'en carton', others: ['en bois', 'en fer'] },

  // ---- Niveau 3 : histoires plus longues (CE1)
  { level: 3, title: 'Le trésor du grenier', emoji: '🗝️', sentences: ['Un jour de pluie, Arthur monte au grenier.', 'Sous une couverture, il trouve un vieux coffre.', 'Il l’ouvre doucement : dedans, il y a des photos de son grand-père enfant.', 'Le soir, son grand-père lui raconte ses souvenirs.'],
    question: 'Qu’y a-t-il dans le coffre ?', answer: 'des photos', others: ['de l’or', 'des jouets'] },
  { level: 3, title: 'La course des escargots', emoji: '🐌', sentences: ['Dans le potager, deux escargots font la course.', 'Le premier part très vite, puis s’endort sous une feuille de salade.', 'Le second avance lentement, sans jamais s’arrêter.', 'C’est lui qui gagne la course !'],
    question: 'Pourquoi le premier escargot perd-il ?', answer: 'il s’endort', others: ['il se perd', 'il a peur'] },
  { level: 3, title: 'Le cerf-volant', emoji: '🪁', sentences: ['Chloé et son père vont sur la colline avec un cerf-volant.', 'Le vent souffle fort, le cerf-volant monte très haut.', 'Soudain, la ficelle casse !', 'Le cerf-volant atterrit dans un arbre, et un pompier vient le chercher.'],
    question: 'Qui va chercher le cerf-volant ?', answer: 'un pompier', others: ['le père de Chloé', 'un oiseau'] },
  { level: 3, title: 'La boulangerie', emoji: '🥐', sentences: ['Tous les dimanches, Malo achète le pain.', 'Il demande une baguette et trois croissants.', 'La boulangère lui rend la monnaie en souriant.', 'Sur le chemin, Malo croque un petit bout de baguette !'],
    question: 'Combien de croissants Malo achète-t-il ?', answer: 'trois', others: ['deux', 'cinq'] },
];

export const histoires = {
  id: 'histoires',
  domain: 'francais',
  section: 'Lire',
  title: 'Histoires lues',
  icon: '📖',
  skill: 'Écouter et suivre une histoire lue (karaoké), la comprendre',
  levels: ['Écoute une histoire', 'Lis en suivant', 'Histoires plus longues'],
  generate(level, rng) {
    const story = pick(rng, STORIES.filter((s) => s.level === level));
    const pictures = level === 1;
    const options = shuffle(rng, [story.answer, ...story.others]);
    return {
      key: `histoires:${story.title}`,
      karaoke: true,
      text: story.question,
      instruction: [story.question],
      replay: [story.question],
      stage: { type: 'karaoke', title: story.title, emoji: story.emoji, sentences: story.sentences },
      choices: options.map((o) => ({ value: o, label: o })),
      choiceStyle: pictures ? 'pictures' : 'answers',
      answer: story.answer,
      success: { speak: pictures ? 'Bravo, tu as bien écouté l’histoire !' : `${story.answer[0].toUpperCase()}${story.answer.slice(1)}, bravo !` },
    };
  },
};

export const STORY_DATA = STORIES;
