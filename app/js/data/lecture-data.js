// Données pédagogiques « lecture » (programme de CP).
// Les niveaux suivent la progression habituelle d'une méthode syllabique :
//   1 = voyelles et consonnes « longues » (l, m, r, s), syllabes simples
//   2 = autres consonnes, lettres muettes, sons ch / ou / on / an / in
//   3 = sons complexes (oi, ai, eau, eu…), c et g doux, mots plus longs

/** Image (emoji) associée à chaque mot. Un mot = une seule image partout dans l'app. */
export const PICTURES = {
  // niveau 1
  moto: '🏍️', vélo: '🚲', lune: '🌙', tomate: '🍅', lama: '🦙', salade: '🥗',
  tulipe: '🌷', banane: '🍌', os: '🦴', radio: '📻', piano: '🎹', judo: '🥋',
  café: '☕', dé: '🎲', bébé: '👶',
  // niveau 2
  chat: '🐱', vache: '🐄', loup: '🐺', poule: '🐔', lion: '🦁', avion: '✈️',
  ballon: '🎈', lapin: '🐰', sapin: '🎄', robot: '🤖', lit: '🛏️', rat: '🐀',
  pomme: '🍎', tortue: '🐢', fusée: '🚀', melon: '🍈', mouton: '🐑', cheval: '🐴',
  ananas: '🍍', dragon: '🐉', panda: '🐼', cochon: '🐷', bonbon: '🍬', canard: '🦆',
  renard: '🦊', hibou: '🦉', valise: '🧳', dent: '🦷', pantalon: '👖',
  // niveau 3
  bateau: '⛵', gâteau: '🎂', maison: '🏠', poisson: '🐟', oiseau: '🐦',
  étoile: '⭐', soleil: '☀️', fleur: '🌸', main: '✋', chaise: '🪑', citron: '🍋',
  chien: '🐶', mouche: '🪰', cerise: '🍒', pied: '🦶', nuage: '☁️', crayon: '✏️',
  livre: '📖', train: '🚂', voiture: '🚗', fraise: '🍓', girafe: '🦒',
  escargot: '🐌', papillon: '🦋', abeille: '🐝', cadeau: '🎁', château: '🏰',
  chapeau: '🎩', lunettes: '👓', parapluie: '☂️', glace: '🍦', crocodile: '🐊',
  tracteur: '🚜', éléphant: '🐘', koala: '🐨', zèbre: '🦓', souris: '🐭',
  grenouille: '🐸', requin: '🦈', serpent: '🐍', singe: '🐒', raisin: '🍇',
  // utilisés seulement dans « Le premier son »
  arbre: '🌳', araignée: '🕷️', orange: '🍊', olive: '🫒', ordinateur: '💻',
  école: '🏫', écureuil: '🐿️', volcan: '🌋', feu: '🔥', fourmi: '🐜', tigre: '🐯',
  neige: '❄️', nez: '👃', dauphin: '🐬', dinosaure: '🦕', carotte: '🥕',
  cactus: '🌵', gorille: '🦍', guitare: '🎸', jus: '🧃', journal: '📰',
  champignon: '🍄',
  // « Le premier son » : groupes de consonnes (tr, cr, fl…) et son de la fin
  trompette: '🎺', crabe: '🦀', fromage: '🧀', drapeau: '🚩', plage: '🏖️', pluie: '🌧️',
  bras: '💪', blé: '🌾', clown: '🤡', prince: '🤴', kangourou: '🦘',
};

/** Mots à lire (jeu « Le bon mot »), par niveau. */
export const READING_WORDS = {
  1: ['moto', 'vélo', 'lune', 'tomate', 'lama', 'salade', 'tulipe', 'banane',
    'os', 'radio', 'piano', 'judo', 'café', 'dé', 'bébé'],
  2: ['chat', 'vache', 'loup', 'poule', 'lion', 'avion', 'ballon', 'lapin', 'sapin',
    'robot', 'lit', 'rat', 'pomme', 'tortue', 'fusée', 'melon', 'mouton', 'cheval',
    'ananas', 'dragon', 'panda', 'cochon', 'bonbon', 'canard', 'renard', 'hibou',
    'valise', 'dent', 'pantalon'],
  3: ['bateau', 'gâteau', 'maison', 'poisson', 'oiseau', 'étoile', 'soleil', 'fleur',
    'main', 'chaise', 'citron', 'chien', 'mouche', 'cerise', 'pied', 'nuage',
    'crayon', 'livre', 'train', 'voiture', 'fraise', 'girafe', 'escargot',
    'papillon', 'abeille', 'cadeau', 'château', 'chapeau', 'lunettes', 'parapluie',
    'glace', 'crocodile', 'tracteur', 'éléphant', 'koala', 'zèbre', 'souris',
    'grenouille', 'requin', 'serpent', 'singe', 'raisin'],
};

/**
 * Jeu « Le premier son » : chaque mot commence par la graphie du son entendu.
 * (On évite les pièges : pas de « girafe » pour g, pas de k à côté de c, etc.)
 */
export const FIRST_SOUNDS = [
  { grapheme: 'a', level: 1, words: ['avion', 'ananas', 'abeille', 'arbre', 'araignée'] },
  { grapheme: 'o', level: 1, words: ['os', 'orange', 'olive', 'ordinateur'] },
  { grapheme: 'é', level: 1, words: ['éléphant', 'étoile', 'école', 'écureuil'] },
  { grapheme: 'l', level: 1, words: ['lune', 'lion', 'lapin', 'loup', 'lit', 'livre', 'lunettes'] },
  { grapheme: 'm', level: 1, words: ['moto', 'maison', 'main', 'mouton', 'melon', 'mouche'] },
  { grapheme: 'r', level: 1, words: ['robot', 'rat', 'renard', 'radio', 'raisin', 'requin'] },
  { grapheme: 's', level: 1, words: ['soleil', 'salade', 'sapin', 'souris', 'serpent', 'singe'] },
  { grapheme: 'v', level: 2, words: ['vache', 'vélo', 'voiture', 'volcan'] },
  { grapheme: 'f', level: 2, words: ['fusée', 'fleur', 'fraise', 'feu', 'fourmi'] },
  { grapheme: 'p', level: 2, words: ['poule', 'pomme', 'poisson', 'panda', 'piano', 'pied'] },
  { grapheme: 't', level: 2, words: ['tomate', 'tortue', 'train', 'tigre', 'tulipe', 'tracteur'] },
  { grapheme: 'n', level: 2, words: ['nuage', 'nez', 'neige'] },
  { grapheme: 'b', level: 2, words: ['banane', 'ballon', 'bateau', 'bonbon', 'bébé'] },
  { grapheme: 'd', level: 2, words: ['dragon', 'dauphin', 'dinosaure', 'dé', 'dent'] },
  { grapheme: 'ch', level: 3, words: ['chat', 'chien', 'cheval', 'chaise', 'chapeau', 'château', 'champignon'] },
  { grapheme: 'c', level: 3, words: ['canard', 'cadeau', 'café', 'cochon', 'crayon', 'carotte', 'cactus'] },
  { grapheme: 'g', level: 3, words: ['gâteau', 'glace', 'gorille', 'grenouille', 'guitare'] },
  { grapheme: 'j', level: 3, words: ['judo', 'jus', 'journal'] },
  { grapheme: 'z', level: 3, words: ['zèbre'] },
];

/**
 * « Le premier son », niveau 5 : le son entendu à la fin du mot, écrit tel quel
 * à la fin du mot (pas de lettre muette : « loup » ou « éléphant » sont exclus).
 */
export const FINAL_SOUNDS = [
  { grapheme: 'o', words: ['moto', 'vélo', 'piano', 'judo', 'radio'] },
  { grapheme: 'a', words: ['lama', 'panda', 'koala'] },
  { grapheme: 'é', words: ['café', 'bébé', 'dé'] },
  { grapheme: 'ou', words: ['hibou', 'kangourou'] },
  { grapheme: 'on', words: ['ballon', 'melon', 'mouton', 'cochon', 'dragon', 'citron', 'crayon', 'poisson', 'avion'] },
  { grapheme: 'in', words: ['lapin', 'sapin', 'raisin', 'requin', 'dauphin', 'train', 'main'] },
];

/** « Le premier son », niveau 6 : les deux premiers sons, une consonne suivie de r ou de l. */
export const CLUSTER_SOUNDS = [
  { grapheme: 'tr', words: ['train', 'tracteur', 'trompette'] },
  { grapheme: 'cr', words: ['crayon', 'crocodile', 'crabe'] },
  { grapheme: 'gr', words: ['grenouille'] },
  { grapheme: 'fr', words: ['fraise', 'fromage'] },
  { grapheme: 'br', words: ['bras'] },
  { grapheme: 'dr', words: ['dragon', 'drapeau'] },
  { grapheme: 'pl', words: ['plage', 'pluie'] },
  { grapheme: 'fl', words: ['fleur'] },
  { grapheme: 'gl', words: ['glace'] },
  { grapheme: 'bl', words: ['blé'] },
  { grapheme: 'cl', words: ['clown'] },
  { grapheme: 'pr', words: ['prince'] },
];

/** Jeu « Les syllabes » : consonnes et voyelles combinées à chaque niveau. */
export const SYLLABLE_LEVELS = {
  1: { consonants: ['l', 'm', 'r', 's'], vowels: ['a', 'i', 'o', 'u'] },
  2: { consonants: ['l', 'm', 'r', 's', 'p', 't', 'n', 'v', 'f', 'ch', 'b', 'd'], vowels: ['a', 'i', 'o', 'u', 'é'] },
  3: { consonants: ['l', 'm', 'r', 's', 'p', 't', 'v', 'f', 'b', 'd'], vowels: ['ou', 'on', 'an', 'in', 'oi'] },
};

/**
 * Prononciation à donner à la synthèse vocale pour les syllabes de niveau 3 :
 * un mot homophone garantit le bon son (sinon « man » serait lu à l'anglaise).
 * Une syllabe absente de cette table est prononcée telle quelle.
 */
export const SYLLABLE_SPEECH = {
  lou: 'loup', rou: 'roue', tou: 'tout', vou: 'vous', bou: 'boue', dou: 'doux',
  lon: 'long', ron: 'rond', pon: 'pont', von: 'vont', fon: 'font',
  lan: 'lent', man: 'ment', ran: 'rang', san: 'sans', tan: 'temps', van: 'vent',
  fan: 'fend', ban: 'banc', dan: 'dent',
  min: 'main', rin: 'rein', sin: 'saint', tin: 'teint', bin: 'bain', din: 'daim',
  poi: 'pois', voi: 'voix', boi: 'bois', doi: 'doigt',
};

/** Mots-outils à reconnaître globalement (jeu « Les petits mots »). */
export const SIGHT_WORDS = [
  { word: 'le', level: 1 }, { word: 'la', level: 1 }, { word: 'les', level: 1 },
  { word: 'un', level: 1 }, { word: 'une', level: 1 }, { word: 'et', level: 1 },
  { word: 'est', level: 1, speech: 'è' }, { word: 'il', level: 1 },
  { word: 'elle', level: 1 }, { word: 'je', level: 1 },
  { word: 'dans', level: 2 }, { word: 'sur', level: 2 }, { word: 'avec', level: 2 },
  { word: 'pour', level: 2 }, { word: 'mais', level: 2 }, { word: 'qui', level: 2 },
  { word: 'des', level: 2 }, { word: 'du', level: 2 }, { word: 'mon', level: 2 },
  { word: 'ma', level: 2 },
  { word: 'sous', level: 3 }, { word: 'très', level: 3 }, { word: 'aussi', level: 3 },
  { word: 'beaucoup', level: 3 }, { word: 'toujours', level: 3 }, { word: 'voici', level: 3 },
  { word: 'après', level: 3 }, { word: 'avant', level: 3 }, { word: 'chez', level: 3 },
  { word: 'quand', level: 3 },
];
