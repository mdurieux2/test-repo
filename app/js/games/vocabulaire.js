// « Ponctuation et majuscules » (GS → CE1) et « Les mots » (vocabulaire, MS → CE1).
// Données pures : le rendu est dans render.js et main.js (choix multiple, ou « order »).

import { pick, sample, shuffle } from '../random.js';
import { textChoices } from './helpers.js';

/** Typographie française pour ce qui est écrit tel quel (scène, étiquettes) : espace insécable avant ? ! : et dans « ». */
export const nb = (text) => text.replace(/ ([?!:;»])/g, ' $1').replace(/« /g, '« ');
const capitalize = (w) => w.charAt(0).toUpperCase() + w.slice(1);
const lowerFirst = (w) => w.charAt(0).toLowerCase() + w.slice(1);

// ================================================================ Ponctuation et majuscules

// Niveaux 1 et 2 : des phrases courtes, sans prénom (la seule majuscule est celle du début).
// Au moins trois mots, pour que le point puisse être mal placé à deux endroits.
const SHORT_SENTENCES = [
  { emoji: '🐱', text: 'Le chat dort.' },
  { emoji: '🐟', text: 'Le poisson nage.' },
  { emoji: '🐦', text: 'L’oiseau chante fort.' },
  { emoji: '🐄', text: 'La vache broute.' },
  { emoji: '🍎', text: 'Je mange une pomme.' },
  { emoji: '🚲', text: 'Je fais du vélo.' },
  { emoji: '☀️', text: 'Le soleil brille.' },
  { emoji: '🌧️', text: 'Il pleut beaucoup.' },
  { emoji: '🎂', text: 'Le gâteau est bon.' },
  { emoji: '🐸', text: 'La grenouille saute.' },
  { emoji: '🚀', text: 'La fusée décolle.' },
  { emoji: '🐝', text: 'L’abeille fait du miel.' },
  { emoji: '🦁', text: 'Le lion rugit.' },
  { emoji: '🥚', text: 'La poule pond un œuf.' },
  { emoji: '🚂', text: 'Le train arrive.' },
  { emoji: '📖', text: 'Je lis un livre.' },
  { emoji: '🍦', text: 'Je mange une glace.' },
  { emoji: '⚽', text: 'Je joue au foot.' },
  { emoji: '🛁', text: 'Je prends mon bain.' },
  { emoji: '🪥', text: 'Je me brosse les dents.' },
  { emoji: '🐌', text: 'L’escargot est lent.' },
  { emoji: '🌙', text: 'La lune brille.' },
  { emoji: '❄️', text: 'La neige tombe.' },
  { emoji: '🐢', text: 'La tortue est lente.' },
  { emoji: '🎈', text: 'Le ballon s’envole.' },
  { emoji: '🌸', text: 'La fleur pousse.' },
  { emoji: '🐰', text: 'Le lapin saute.' },
  { emoji: '🦆', text: 'Le canard nage.' },
];

/** Les mots d'une phrase, sans son signe final (« Qui est là ? » → qui, est, là). */
const wordsOf = (sentence) => sentence.slice(0, -1).trim().split(' ');

/** Niveau 1 : la phrase où le point est à la fin, et deux phrases où il est au milieu. */
function wherePoint(rng) {
  const item = pick(rng, SHORT_SENTENCES);
  const words = wordsOf(item.text);
  const places = sample(rng, words.slice(1).map((_, i) => i + 1), 2);
  const wrong = places.map((p) => `${words.slice(0, p).join(' ')}. ${words.slice(p).join(' ')}`);
  return {
    key: `ponctuation:point:${item.text}`,
    text: 'Le point se met à la fin de la phrase. Quelle phrase est bien écrite ?',
    instruction: 'Le point se met à la fin de la phrase. Quelle phrase est bien écrite ?',
    short: { key: 'ponctuation:point', text: 'Où est le point ?' },
    stage: { type: 'picture', emoji: item.emoji },
    choices: shuffle(rng, [item.text, ...wrong]).map((s) => ({ value: s, label: s })),
    choiceStyle: 'sentences',
    answer: item.text,
    success: { speak: item.text },
  };
}

/** Niveau 2 : la majuscule au début (et pas au milieu). */
function capitalStart(rng) {
  const item = pick(rng, SHORT_SENTENCES);
  const words = wordsOf(item.text);
  const lower = [lowerFirst(words[0]), ...words.slice(1)];
  const inner = 1 + Math.floor(rng() * (words.length - 1));
  const misplaced = lower.map((w, i) => (i === inner ? capitalize(w) : w));
  const wrong = [lower, misplaced].map((ws) => `${ws.join(' ')}.`);
  return {
    key: `ponctuation:majuscule:${item.text}`,
    text: 'Une phrase commence par une majuscule. Quelle phrase est bien écrite ?',
    instruction: 'Une phrase commence par une majuscule. Quelle phrase est bien écrite ?',
    short: { key: 'ponctuation:majuscule', text: 'La majuscule au début ?' },
    stage: { type: 'picture', emoji: item.emoji },
    choices: shuffle(rng, [item.text, ...wrong]).map((s) => ({ value: s, label: s })),
    choiceStyle: 'sentences',
    answer: item.text,
    success: { speak: item.text },
  };
}

// Niveaux 3 à 5 : des phrases qu'on peut écrire avec un point, un point d'interrogation ou un point
// d'exclamation. Leurs mots ne disent jamais lequel (pas de « est-ce que », d'inversion, de mot
// interrogatif, ni de « Quel… ! » ou « Comme… ! ») : seule l'intonation d'Estelle le dit.
// `marks` : les signes qui donnent une phrase naturelle.
export const SPOKEN_SENTENCES = [
  { text: 'Il neige', marks: '.?!' },
  { text: 'Tu as faim', marks: '.?' },
  { text: 'Le bus est parti', marks: '.?!' },
  { text: 'Tu viens avec moi', marks: '.?' },
  { text: 'Papa est rentré', marks: '.?!' },
  { text: 'Le chat dort', marks: '.?' },
  { text: 'Tu aimes les frites', marks: '.?' },
  { text: 'C’est ton vélo', marks: '.?!' },
  { text: 'Il fait froid', marks: '.?!' },
  { text: 'Tu as fini', marks: '.?!' },
  { text: 'Le magasin est fermé', marks: '.?!' },
  { text: 'Tu as vu la mer', marks: '.?' },
  { text: 'On va au parc', marks: '.?!' },
  { text: 'Le gâteau est prêt', marks: '.?!' },
  { text: 'Tu as un chien', marks: '.?!' },
  { text: 'Mamie arrive demain', marks: '.?!' },
  { text: 'Il est déjà midi', marks: '.?!' },
  { text: 'Tu as perdu une dent', marks: '.?!' },
  { text: 'Le film commence', marks: '.?!' },
  { text: 'Vous êtes prêts', marks: '.?' },
  { text: 'C’est l’heure du bain', marks: '.?!' },
  { text: 'Tu es malade', marks: '.?' },
  { text: 'On mange des crêpes', marks: '.?!' },
  { text: 'Le train est en retard', marks: '.?!' },
  { text: 'Il y a un loup', marks: '.?!' },
  { text: 'Elle a gagné', marks: '.?!' },
  { text: 'Tu as peur du noir', marks: '.?' },
  { text: 'Ton frère joue au foot', marks: '.?' },
  { text: 'C’est fini', marks: '.?!' },
  { text: 'Il a encore plu', marks: '.?!' },
  { text: 'La piscine est ouverte', marks: '.?!' },
  { text: 'Tu as rangé ta chambre', marks: '.?!' },
];
const MARK_SAY = {
  '.': 'La phrase raconte : on met un point.',
  '?': 'C’est une question : on met un point d’interrogation.',
  '!': 'On s’étonne ou on crie : on met un point d’exclamation.',
};
const LISTEN_MARKS = { 3: '.?', 4: '?!', 5: '.?!' };
/** La phrase écrite avec son signe (« Il neige ! »). */
const withMark = (text, mark) => (mark === '.' ? `${text}.` : `${text} ${mark}`);

/** Niveaux 3 à 5 : Estelle dit la phrase ; on choisit le signe d'après son intonation. */
function listenMark(rng, level) {
  const marks = LISTEN_MARKS[level];
  const pool = SPOKEN_SENTENCES.flatMap((s) => [...s.marks].filter((m) => marks.includes(m)).map((m) => [s.text, m]));
  const [text, mark] = pick(rng, pool);
  const said = { text: withMark(text, mark) };
  return {
    key: `ponctuation:ecoute:${level}:${said.text}`,
    text: 'Écoute bien la phrase. Quel signe faut-il mettre à la fin ?',
    instruction: ['Écoute bien la phrase.', said, 'Quel signe faut-il mettre à la fin ?'],
    short: { key: `ponctuation:ecoute:${level}`, text: 'Quel signe à la fin ?', speak: [said] },
    replay: [said],
    listenOnly: true, // seule l'intonation dit le signe
    stage: { type: 'sentence', text: `${text} □` },
    choices: textChoices([...marks]),
    choiceStyle: 'letters',
    answer: mark,
    success: { speak: [said, MARK_SAY[mark]] },
  };
}

// Niveau 6 : le prénom ou la ville écrit sans sa majuscule, et deux autres mots de la phrase
// (des noms communs ou des verbes, qui n'en prennent pas). Le nom propre n'est jamais le premier mot.
export const PROPER_NOUNS = [
  { text: 'Mon cousin habite à Lyon.', name: 'Lyon', kind: 'ville', others: ['cousin', 'habite'] },
  { text: 'Demain, nous allons à Paris.', name: 'Paris', kind: 'ville', others: ['nous', 'allons'] },
  { text: 'Ma copine s’appelle Inès.', name: 'Inès', kind: 'prénom', others: ['copine', 'appelle'] },
  { text: 'Le train va à Marseille.', name: 'Marseille', kind: 'ville', others: ['train', 'va'] },
  { text: 'Mon oncle habite à Nice.', name: 'Nice', kind: 'ville', others: ['oncle', 'habite'] },
  { text: 'Le chien de Léo est noir.', name: 'Léo', kind: 'prénom', others: ['chien', 'noir'] },
  { text: 'Nous jouons avec Hugo.', name: 'Hugo', kind: 'prénom', others: ['jouons', 'avec'] },
  { text: 'La maîtresse appelle Jade.', name: 'Jade', kind: 'prénom', others: ['maîtresse', 'appelle'] },
  { text: 'Cet été, je vais à Brest.', name: 'Brest', kind: 'ville', others: ['été', 'vais'] },
  { text: 'Il pleut beaucoup à Lille.', name: 'Lille', kind: 'ville', others: ['pleut', 'beaucoup'] },
  { text: 'Mon frère s’appelle Sami.', name: 'Sami', kind: 'prénom', others: ['frère', 'appelle'] },
  { text: 'Le bateau arrive à Nantes.', name: 'Nantes', kind: 'ville', others: ['bateau', 'arrive'] },
  { text: 'J’écris une lettre à Nina.', name: 'Nina', kind: 'prénom', others: ['une', 'lettre'] },
  { text: 'Ce soir, Lucas dort chez moi.', name: 'Lucas', kind: 'prénom', others: ['soir', 'dort'] },
  { text: 'Nous visitons la ville de Strasbourg.', name: 'Strasbourg', kind: 'ville', others: ['visitons', 'ville'] },
  { text: 'Papi pêche avec Théo.', name: 'Théo', kind: 'prénom', others: ['pêche', 'avec'] },
  { text: 'Le cirque est à Toulouse.', name: 'Toulouse', kind: 'ville', others: ['cirque', 'est'] },
  { text: 'Emma joue avec Lina.', name: 'Lina', kind: 'prénom', others: ['joue', 'avec'] },
  { text: 'Mon ami Malik a sept ans.', name: 'Malik', kind: 'prénom', others: ['ami', 'sept'] },
  { text: 'Il fait chaud à Bordeaux.', name: 'Bordeaux', kind: 'ville', others: ['fait', 'chaud'] },
  { text: 'Ma tante vit à Grenoble.', name: 'Grenoble', kind: 'ville', others: ['tante', 'vit'] },
  { text: 'Je donne un livre à Adam.', name: 'Adam', kind: 'prénom', others: ['donne', 'livre'] },
  { text: 'Le marché de Rennes est grand.', name: 'Rennes', kind: 'ville', others: ['marché', 'grand'] },
  { text: 'Mon voisin s’appelle Paul.', name: 'Paul', kind: 'prénom', others: ['voisin', 'appelle'] },
  { text: 'Nous partons à Dijon en train.', name: 'Dijon', kind: 'ville', others: ['partons', 'train'] },
  { text: 'J’ai invité Chloé à mon anniversaire.', name: 'Chloé', kind: 'prénom', others: ['invité', 'anniversaire'] },
];
const KIND_SAY = {
  ville: 'C’est le nom d’une ville : il prend une majuscule.',
  prénom: 'C’est un prénom : il prend une majuscule.',
};

/** Niveau 6 : quel mot a oublié sa majuscule ? */
function properNoun(rng) {
  const item = pick(rng, PROPER_NOUNS);
  const lower = item.name.toLowerCase();
  const shown = item.text.replace(new RegExp(`(?<![\\p{L}])${item.name}(?![\\p{L}])`, 'u'), lower);
  return {
    key: `ponctuation:nom:${item.text}`,
    text: 'Un mot a oublié sa majuscule. Lequel ?',
    instruction: 'Lis la phrase. Un mot a oublié sa majuscule : lequel ?',
    short: { key: 'ponctuation:nom', text: 'Quel mot oublie sa majuscule ?' },
    stage: { type: 'sentence', text: nb(shown) },
    choices: textChoices(shuffle(rng, [lower, ...item.others])),
    choiceStyle: 'words',
    answer: lower,
    success: { speak: [item.text, KIND_SAY[item.kind]], reveal: item.name, highlight: 1 },
  };
}

// Niveau 7 : combien de phrases ? Les pièges : une virgule ne termine pas une phrase, et un prénom
// ou une ville au milieu de la phrase a une majuscule. `n` : le nombre de phrases.
export const SHORT_TEXTS = [
  { text: 'Lou a un chat. Il s’appelle Pompon. Il dort beaucoup.', n: 3 },
  { text: 'Où est mon ballon ? Je ne le trouve pas !', n: 2 },
  { text: 'Ce matin, Tom et Léa vont à Paris en train.', n: 1 },
  { text: 'Il pleut. Nous restons à la maison. Nous jouons aux cartes.', n: 3 },
  { text: 'Quelle belle journée ! Allons au parc. Prends ton vélo, Léo.', n: 3 },
  { text: 'Le loup a faim. Il sort du bois. Il voit trois cochons. Il sourit.', n: 4 },
  { text: 'Mamie fait une tarte aux pommes, puis elle la met au four.', n: 1 },
  { text: 'Le bébé pleure. Il a faim.', n: 2 },
  { text: 'Tu viens jouer ? Oui, j’arrive !', n: 2 },
  { text: 'Nina habite à Lyon. Elle a un petit frère. Il s’appelle Hugo.', n: 3 },
  { text: 'Le soleil se couche, les oiseaux se taisent et la nuit tombe.', n: 1 },
  { text: 'C’est l’hiver. Il neige. Les enfants font un bonhomme de neige.', n: 3 },
  { text: 'Aïe ! Je me suis cogné. Ça fait mal !', n: 3 },
  { text: 'Le facteur passe. Il apporte une lettre pour Papa. Quelle surprise !', n: 3 },
  { text: 'Samedi, nous allons à la piscine avec Inès et Sami.', n: 1 },
  { text: 'Le chat voit une souris. Il saute. La souris file dans son trou. Raté !', n: 4 },
  { text: 'As-tu fini ton dessin ? Montre-le-moi !', n: 2 },
  { text: 'La maîtresse lit une histoire. Les élèves écoutent.', n: 2 },
  { text: 'Dans la forêt, il y a des arbres, des champignons et des écureuils.', n: 1 },
  { text: 'Le réveil sonne. Vite, il faut se lever ! Le bus passe à huit heures.', n: 3 },
  { text: 'J’ai perdu une dent. Ce soir, la petite souris va passer.', n: 2 },
  { text: 'Le train part. Au revoir, Mamie ! À bientôt !', n: 3 },
  { text: 'Les fleurs poussent. Les abeilles butinent. Le printemps est là. Il fait doux.', n: 4 },
  { text: 'Papa prépare des crêpes. Miam ! J’adore ça.', n: 3 },
  { text: 'Il était une fois un petit dragon. Il ne savait pas cracher le feu.', n: 2 },
  { text: 'Le matin, je me lave, je m’habille et je déjeune.', n: 1 },
  { text: 'Qui a mangé le gâteau ? Ce n’est pas moi ! C’est le chien.', n: 3 },
  { text: 'Léo et Lou partent à la mer. Ils font un château de sable.', n: 2 },
];
const NUMBER_WORDS = ['', 'une', 'deux', 'trois', 'quatre'];

/** Niveau 7 : compter les phrases d'un petit texte. */
function countSentences(rng) {
  const item = pick(rng, SHORT_TEXTS);
  return {
    key: `ponctuation:combien:${item.text}`,
    text: 'Combien y a-t-il de phrases dans le texte ?',
    instruction: 'Lis le texte. Combien y a-t-il de phrases ? Aide-toi des points et des majuscules.',
    short: { key: 'ponctuation:combien', text: 'Combien de phrases ?' },
    stage: { type: 'sentence', text: nb(item.text) },
    choices: [1, 2, 3, 4].map((n) => ({ value: n, label: String(n) })),
    choiceStyle: 'numbers',
    answer: item.n,
    success: { speak: item.n === 1 ? 'Il y a une seule phrase !' : `Il y a ${NUMBER_WORDS[item.n]} phrases !` },
  };
}

// Niveau 8 : deux phrases collées, sans point ni majuscule. Les prénoms gardent leur majuscule.
// Chaque phrase a au moins deux mots ; la première finit par un point.
export const GLUED = [
  ['Le chat dort.', 'Il a chaud.'],
  ['Lou rit.', 'Elle joue.'],
  ['Il pleut.', 'Tom a froid.'],
  ['Papa cuisine.', 'Ça sent bon.'],
  ['Le bus arrive.', 'On monte.'],
  ['Il fait nuit.', 'Je dors.'],
  ['La neige tombe.', 'On joue.'],
  ['Mila a faim.', 'Elle mange.'],
  ['Le chien aboie.', 'Il a peur.'],
  ['Tom tombe.', 'Il pleure.'],
  ['Il fait beau.', 'On sort.'],
  ['La cloche sonne.', 'On sort.'],
  ['Léa a six ans.', 'Elle lit.'],
  ['Le bébé pleure.', 'Il a faim.'],
  ['Il est midi.', 'On mange.'],
  ['Nina chante.', 'Tom danse.'],
  ['Le pain cuit.', 'Ça sent bon.'],
  ['On sonne.', 'Qui est là ?'],
  ['Le train part.', 'Au revoir !'],
  ['Il est tard.', 'Au lit !'],
  ['Tom a un vélo.', 'Il roule.'],
  ['C’est fini.', 'On rentre.'],
  ['Le chat miaule.', 'Il a faim.'],
  ['Zoé dessine.', 'Elle colorie.'],
];
// les noms propres de ces phrases : ils gardent leur majuscule au milieu d'une phrase
const NAMES = new Set(['Lou', 'Tom', 'Mila', 'Léa', 'Nina', 'Zoé']);
const markOf = (s) => s.at(-1);
/** Les mots tels qu'on les écrit au milieu d'une phrase (« il », mais « Tom »). */
const plainWords = (s) => wordsOf(s).map((w, i) => (i === 0 && !NAMES.has(w) ? lowerFirst(w) : w));

/** Le texte coupé après `cut` mots : majuscule au début de chaque phrase, signe à la fin. */
export function splitAt([first, second], cut) {
  const words = [...plainWords(first), ...plainWords(second)];
  const sentence = (ws, mark) => withMark([capitalize(ws[0]), ...ws.slice(1)].join(' '), mark);
  return nb(`${sentence(words.slice(0, cut), markOf(first))} ${sentence(words.slice(cut), markOf(second))}`);
}

/** Niveau 8 : remettre le point et la majuscule (la coupure juste, ou un mot trop tôt, ou trop tard). */
function gluedSentences(rng) {
  const pair = pick(rng, GLUED);
  const cut = wordsOf(pair[0]).length;
  const options = shuffle(rng, [cut, cut - 1, cut + 1].map((c) => splitAt(pair, c)));
  const answer = splitAt(pair, cut);
  return {
    key: `ponctuation:collees:${pair.join(' ')}`,
    text: 'Deux phrases sont collées. Où faut-il mettre le point et la majuscule ?',
    instruction: 'Deux phrases sont collées. Où faut-il mettre le point et la majuscule ? Trouve la bonne façon de les écrire.',
    short: { key: 'ponctuation:collees', text: 'Où mettre le point ?' },
    stage: { type: 'sentence', text: [...plainWords(pair[0]), ...plainWords(pair[1])].join(' ') },
    choices: options.map((s) => ({ value: s, label: s })),
    choiceStyle: 'sentences',
    answer,
    success: { speak: pair },
  };
}

// Niveau 9 (1) : les guillemets entourent les paroles. [qui parle, ce qu'il dit]
export const DIALOGUES = [
  ['Léo dit', 'Bonjour !'], ['Maman dit', 'Au lit !'], ['Tom crie', 'À l’aide !'], ['Papa dit', 'Merci !'],
  ['Mila dit', 'J’ai faim !'], ['Le loup dit', 'Miam !'], ['Inès crie', 'Bravo !'], ['Le chat fait', 'Miaou !'],
  ['Tom dit', 'Il pleut.'], ['Léa dit', 'Bonne nuit !'], ['Hugo dit', 'Salut !'], ['Lou dit', 'Au revoir !'],
  ['Sami dit', 'Qui es-tu ?'], ['Le roi dit', 'Silence !'], ['Zoé dit', 'Coucou !'], ['Nina crie', 'Youpi !'],
  ['Le bébé dit', 'Encore !'], ['Tom répond', 'Oui !'], ['Léo dit', 'J’ai froid.'], ['Lina dit', 'À moi !'],
  ['Mamie dit', 'À table !'], ['Lou demande', 'Ça va ?'], ['Papi dit', 'Bravo !'], ['Le chien fait', 'Ouaf !'],
];
/** La bonne phrase, et deux phrases où les guillemets n'entourent pas les paroles. */
export function dialogueVersions([who, words]) {
  return [`${who} : « ${words} »`, `« ${who} : ${words} »`, `« ${who} » : ${words}`].map(nb);
}

function dialogue(rng) {
  const item = pick(rng, DIALOGUES);
  const [answer, ...wrong] = dialogueVersions(item);
  return {
    key: `ponctuation:guillemets:${item.join(':')}`,
    text: 'Les guillemets entourent les paroles. Quelle phrase est bien écrite ?',
    instruction: 'Les guillemets entourent les mots que dit le personnage. Quelle phrase est bien écrite ?',
    short: { key: 'ponctuation:guillemets', text: 'Où vont les guillemets ?' },
    stage: { type: 'picture', emoji: '💬' },
    choices: shuffle(rng, [answer, ...wrong]).map((s) => ({ value: s, label: s })),
    choiceStyle: 'sentences',
    answer,
    success: { speak: [`${item[0]} : ${item[1]}`, 'Les guillemets entourent les paroles.'] },
  };
}

// Niveau 9 (2) : la virgule dans une énumération, et « et » devant le dernier élément.
// [début de la phrase, éléments, fin de la phrase]
export const LISTS = [
  ['Lou a', ['un chat', 'un chien', 'un lapin'], ''],
  ['J’achète', ['du pain', 'du lait', 'du beurre'], ''],
  ['Je mange', ['une pomme', 'une poire', 'une banane'], ''],
  ['Il y a', ['des lions', 'des tigres', 'des zèbres'], ''],
  ['Tom aime', ['le foot', 'le judo', 'la danse'], ''],
  ['Mon drapeau est', ['bleu', 'blanc', 'rouge'], ''],
  ['Je vois', ['le soleil', 'les nuages', 'un avion'], ''],
  ['', ['Nous chantons', 'nous dansons', 'nous rions'], ''],
  ['Mila a', ['des billes', 'des cartes', 'des feutres'], ''],
  ['J’ai mis', ['mon bonnet', 'mon écharpe', 'mes gants'], ''],
  ['Les saisons sont', ['le printemps', 'l’été', 'l’automne', 'l’hiver'], ''],
  ['Il faut', ['de la farine', 'des œufs', 'du lait', 'du sucre'], ''],
  ['Le fermier a', ['des vaches', 'des poules', 'des moutons', 'un cheval'], ''],
  ['', ['Léo', 'Lou', 'Tom'], 'jouent ensemble'],
  ['Le jardin a', ['des roses', 'des tulipes', 'des lilas'], ''],
  ['Mon cartable contient', ['un cahier', 'un stylo', 'une règle'], ''],
  ['Je bois', ['de l’eau', 'du jus', 'du lait'], ''],
  ['Nous avons vu', ['des singes', 'des girafes', 'des éléphants'], ''],
  ['', ['Elle saute', 'elle court', 'elle nage'], ''],
  ['Ma trousse contient', ['une gomme', 'un crayon', 'une règle', 'des ciseaux'], ''],
  ['', ['Le chat', 'le chien', 'le lapin'], 'dorment'],
  ['Pour la plage, je prends', ['un seau', 'une pelle', 'un ballon'], ''],
  ['', ['Papa', 'Maman', 'Mamie', 'moi'], 'partons en vacances'],
];
/** Ce qu'on met dans les trous : des virgules, et « et » devant le dernier élément. */
const listSigns = (count) => [...Array(count - 2).fill(','), 'et'];
const signsLabel = (signs) => signs.join(' … ');
export function listSentence([start, items, end], signs = listSigns(items.length)) {
  const body = items.reduce((acc, it, i) => (i === 0 ? it : `${acc}${signs[i - 1] === ',' ? ',' : ` ${signs[i - 1]}`} ${it}`), '');
  const text = [start, body, end].filter(Boolean).join(' ');
  return `${capitalize(text)}.`;
}

function enumeration(rng) {
  const item = pick(rng, LISTS);
  const [start, items, end] = item;
  const n = items.length;
  const right = listSigns(n);
  // deux mauvaises façons : « et » au début (puis des virgules), ou un point à la place des virgules
  const wrongs = [['et', ...Array(n - 2).fill(',')], [...Array(n - 2).fill('.'), 'et']];
  const shown = `${capitalize([start, items.join(' □ '), end].filter(Boolean).join(' '))}.`;
  const full = listSentence(item);
  return {
    key: `ponctuation:virgule:${full}`,
    text: 'Que faut-il écrire dans les cases ?',
    instruction: 'Lis la phrase. Que faut-il écrire dans les cases : une virgule, ou le petit mot « et » ?',
    short: { key: 'ponctuation:virgule', text: 'Virgule ou « et » ?' },
    stage: { type: 'sentence', text: shown.replace(/ □/g, ' □') },
    choices: shuffle(rng, [right, ...wrongs]).map((signs) => ({ value: signsLabel(signs), label: signsLabel(signs) })),
    choiceStyle: 'words',
    answer: signsLabel(right),
    success: { speak: [full, 'Entre les mots, on met une virgule, et le mot « et » avant le dernier.'] },
  };
}

const PONCTUATION_LEVELS = {
  1: wherePoint,
  2: capitalStart,
  3: (rng) => listenMark(rng, 3),
  4: (rng) => listenMark(rng, 4),
  5: (rng) => listenMark(rng, 5),
  6: properNoun,
  7: countSentences,
  8: gluedSentences,
  9: (rng) => (rng() < 0.5 ? dialogue(rng) : enumeration(rng)),
};

export const ponctuation = {
  id: 'ponctuation',
  domain: 'francais',
  section: 'Grammaire',
  title: 'Ponctuation et majuscules',
  icon: '❓',
  skill: 'Repérer la phrase (majuscule, point), choisir . ? ou ! selon l’intonation, majuscule des noms propres, guillemets et virgule',
  levels: [
    'Le point à la fin', 'La majuscule au début', '. ou ? : écoute bien', '? ou ! : écoute bien',
    '. ? ou ! : écoute bien', 'Prénoms et noms de villes', 'Combien de phrases ?', 'Deux phrases collées',
    'Guillemets et virgules', 'Tout mélangé',
  ],
  generate(level, rng) {
    // niveau 10 : les niveaux 3 à 9 mélangés
    const l = level >= 10 ? 3 + Math.floor(rng() * 7) : level;
    const q = PONCTUATION_LEVELS[l](rng);
    return level >= 10 ? { ...q, key: `${q.key}:melange` } : q;
  },
};

// ================================================================ Les mots (vocabulaire)

// Niveaux 1 à 3 : des catégories sans mot commun, chacune avec des images sans ambiguïté
// (pas de tomate ni d'avocat, qui sont aussi des fruits ; pas de « rose », qui est aussi une couleur).
// `group` : les catégories d'un même groupe se ressemblent (on ne les mélange pas aux niveaux 1 et 2).
export const CATEGORIES = [
  { name: 'fruits', group: 'manger', say: 'Ce sont tous des fruits !', items: [
    ['pomme', '🍎'], ['poire', '🍐'], ['banane', '🍌'], ['cerise', '🍒'], ['fraise', '🍓'], ['raisin', '🍇'],
    ['citron', '🍋'], ['pastèque', '🍉'], ['ananas', '🍍'], ['kiwi', '🥝'], ['pêche', '🍑'], ['orange', '🍊'],
    ['noix de coco', '🥥'], ['mangue', '🥭'], ['melon', '🍈']] },
  { name: 'légumes', group: 'manger', say: 'Ce sont tous des légumes !', items: [
    ['carotte', '🥕'], ['brocoli', '🥦'], ['poivron', '🫑'], ['concombre', '🥒'], ['pomme de terre', '🥔'], ['oignon', '🧅']] },
  { name: 'animaux', group: 'vivant', say: 'Ce sont tous des animaux !', items: [
    ['chat', '🐱'], ['chien', '🐶'], ['vache', '🐄'], ['cheval', '🐴'], ['lion', '🦁'], ['éléphant', '🐘'],
    ['girafe', '🦒'], ['lapin', '🐰'], ['cochon', '🐷'], ['mouton', '🐑'], ['singe', '🐒'], ['tigre', '🐯'],
    ['zèbre', '🦓'], ['souris', '🐭'], ['ours', '🐻'], ['loup', '🐺'], ['renard', '🦊'], ['panda', '🐼'], ['koala', '🐨'],
    ['poule', '🐔'], ['canard', '🦆'], ['tortue', '🐢']] },
  { name: 'parties du corps', group: 'vivant', say: 'Ce sont toutes des parties du corps !', items: [
    ['main', '✋'], ['pied', '🦶'], ['nez', '👃'], ['oreille', '👂'], ['œil', '👁️'], ['bouche', '👄'], ['dent', '🦷'],
    ['jambe', '🦵'], ['bras', '💪'], ['langue', '👅']] },
  { name: 'vêtements', group: 'objets', say: 'Ce sont tous des vêtements !', items: [
    ['pantalon', '👖'], ['robe', '👗'], ['tee-shirt', '👕'], ['chaussettes', '🧦'], ['écharpe', '🧣'], ['gants', '🧤'],
    ['manteau', '🧥'], ['casquette', '🧢'], ['short', '🩳'], ['chapeau', '🎩'], ['maillot de bain', '🩱']] },
  { name: 'moyens de transport', group: 'objets', say: 'Ce sont tous des moyens de transport !', items: [
    ['voiture', '🚗'], ['bus', '🚌'], ['train', '🚂'], ['avion', '✈️'], ['bateau', '⛵'], ['vélo', '🚲'], ['moto', '🏍️'],
    ['camion', '🚚'], ['hélicoptère', '🚁'], ['fusée', '🚀'], ['trottinette', '🛴'], ['taxi', '🚕']] },
  { name: 'instruments de musique', group: 'objets', say: 'Ce sont tous des instruments de musique !', items: [
    ['piano', '🎹'], ['guitare', '🎸'], ['trompette', '🎺'], ['tambour', '🥁'], ['violon', '🎻'], ['accordéon', '🪗'],
    ['saxophone', '🎷']] },
  { name: 'outils', group: 'objets', say: 'Ce sont tous des outils !', items: [
    ['marteau', '🔨'], ['scie', '🪚'], ['tournevis', '🪛'], ['hache', '🪓'], ['pioche', '⛏️'], ['clé à molette', '🔧']] },
];

/** Des images d'autres groupes de catégories (pas de légume à côté des fruits pour les petits). */
function farItems(rng, category, n) {
  const others = sample(rng, CATEGORIES.filter((c) => c.group !== category.group), n);
  return others.map((c) => pick(rng, c.items));
}
const pictureChoices = (items) => items.map(([word, emoji]) => ({ value: word, label: emoji, name: word }));

/** Niveau 1 : trois images d'une catégorie ; laquelle va avec elles ? */
function goesWith(rng) {
  const category = pick(rng, CATEGORIES);
  const [answer, ...shown] = sample(rng, category.items, 4);
  return {
    key: `vocabulaire:avec:${shown.map((i) => i[0]).join(',')}`,
    text: 'Regarde les images. Laquelle va avec elles ?',
    instruction: 'Regarde les images. Laquelle va avec elles ?',
    short: { key: 'vocabulaire:avec', text: 'Laquelle va avec ?' },
    stage: { type: 'pattern', items: [...shown.map((i) => i[1]), null] },
    choices: pictureChoices(shuffle(rng, [answer, ...farItems(rng, category, 2)])),
    choiceStyle: 'pictures',
    answer: answer[0],
    success: { speak: category.say },
  };
}

/** Niveau 2 : l'intrus parmi quatre images. */
function oddPicture(rng) {
  const category = pick(rng, CATEGORIES);
  const members = sample(rng, category.items, 3);
  const [odd] = farItems(rng, category, 1);
  return {
    key: `vocabulaire:intrus:${odd[0]}:${members.map((i) => i[0]).join(',')}`,
    text: 'Trouve l’intrus : quelle image ne va pas avec les autres ?',
    instruction: 'Trouve l’intrus : quelle image ne va pas avec les autres ?',
    short: { key: 'vocabulaire:intrus', text: 'Où est l’intrus ?' },
    stage: { type: 'none' },
    choices: pictureChoices(shuffle(rng, [odd, ...members])),
    choiceStyle: 'pictures',
    answer: odd[0],
    success: { speak: category.say },
  };
}

/** Niveau 3 : le mot qui regroupe trois images (« ce sont des fruits »). Les choix sont dits à voix haute. */
function categoryName(rng) {
  const category = pick(rng, CATEGORIES);
  const shown = sample(rng, category.items, 3);
  const names = shuffle(rng, [category.name, ...sample(rng, CATEGORIES.filter((c) => c !== category), 2).map((c) => c.name)]);
  const said = names.map((name, i) => (i === names.length - 1 ? `ou des ${name} ?` : `des ${name},`));
  return {
    key: `vocabulaire:categorie:${shown.map((i) => i[0]).join(',')}`,
    text: 'Regarde les images. Quel mot les regroupe ?',
    instruction: ['Regarde les images. Est-ce que ce sont :', ...said],
    short: { key: 'vocabulaire:categorie', text: 'Quel mot les regroupe ?', speak: said },
    replay: said,
    stage: { type: 'pattern', items: shown.map((i) => i[1]) },
    choices: textChoices(names),
    choiceStyle: 'words',
    answer: category.name,
    success: { speak: category.say },
  };
}

// Niveau 4 : contraires faciles ; niveau 5 : plus difficiles (verbes, mots avec in-, im-, mal-, dé-).
// [mot, contraire, deux mots qui ne sont pas son contraire (de la même sorte : adjectifs, verbes…)]
export const OPPOSITES = {
  4: [
    ['grand', 'petit', 'chaud', 'lourd'], ['chaud', 'froid', 'propre', 'vide'], ['jour', 'nuit', 'semaine', 'heure'],
    ['haut', 'bas', 'long', 'plein'], ['plein', 'vide', 'lourd', 'haut'], ['long', 'court', 'gros', 'chaud'],
    ['lourd', 'léger', 'grand', 'sale'], ['rapide', 'lent', 'fort', 'mouillé'], ['ouvert', 'fermé', 'cassé', 'propre'],
    ['propre', 'sale', 'neuf', 'ouvert'], ['dur', 'mou', 'lent', 'petit'], ['mouillé', 'sec', 'froid', 'sale'],
    ['jeune', 'vieux', 'rapide', 'gentil'], ['gentil', 'méchant', 'petit', 'rapide'], ['content', 'triste', 'grand', 'rapide'],
    ['beau', 'laid', 'fort', 'chaud'], ['fort', 'faible', 'gros', 'lent'], ['gros', 'mince', 'long', 'vieux'],
    ['monter', 'descendre', 'marcher', 'courir'], ['entrer', 'sortir', 'jouer', 'manger'], ['ouvrir', 'fermer', 'casser', 'laver'],
    ['rire', 'pleurer', 'chanter', 'dormir'], ['blanc', 'noir', 'rouge', 'bleu'], ['premier', 'dernier', 'petit', 'rapide'],
    ['vrai', 'faux', 'beau', 'petit'], ['debout', 'assis', 'lent', 'content'], ['riche', 'pauvre', 'grand', 'fort'],
    ['sucré', 'salé', 'chaud', 'mou'],
  ],
  5: [
    ['allumer', 'éteindre', 'ouvrir', 'chauffer'], ['gagner', 'perdre', 'jouer', 'courir'], ['acheter', 'vendre', 'payer', 'choisir'],
    ['remplir', 'vider', 'laver', 'porter'], ['se lever', 'se coucher', 'se laver', 'se cacher'],
    ['commencer', 'finir', 'attendre', 'choisir'], ['pousser', 'tirer', 'porter', 'lancer'], ['attacher', 'détacher', 'nouer', 'mouiller'],
    ['avancer', 'reculer', 'marcher', 'sauter'], ['donner', 'recevoir', 'offrir', 'montrer'], ['arriver', 'partir', 'venir', 'courir'],
    ['construire', 'détruire', 'bâtir', 'peindre'], ['apparaître', 'disparaître', 'briller', 'grandir'],
    ['plier', 'déplier', 'coller', 'ranger'], ['faire', 'défaire', 'dire', 'voir'], ['habiller', 'déshabiller', 'coiffer', 'laver'],
    ['coller', 'décoller', 'couper', 'plier'], ['ajouter', 'enlever', 'compter', 'garder'], ['oublier', 'se souvenir', 'chercher', 'écouter'],
    ['accepter', 'refuser', 'demander', 'aimer'], ['aimer', 'détester', 'adorer', 'regarder'], ['réussir', 'échouer', 'essayer', 'jouer'],
    ['possible', 'impossible', 'facile', 'rapide'], ['poli', 'impoli', 'gentil', 'sage'], ['heureux', 'malheureux', 'content', 'joyeux'],
    ['visible', 'invisible', 'lisible', 'brillant'], ['connu', 'inconnu', 'nouveau', 'perdu'], ['facile', 'difficile', 'simple', 'rapide'],
    ['patient', 'impatient', 'calme', 'gentil'], ['prudent', 'imprudent', 'sage', 'poli'], ['honnête', 'malhonnête', 'poli', 'gentil'],
    ['clair', 'sombre', 'léger', 'chaud'], ['réveillé', 'endormi', 'fatigué', 'calme'],
  ],
};

// Niveau 6 : synonymes. [mot, synonyme, un contraire (piège), un mot sans rapport]
export const SYNONYMS = [
  ['content', 'joyeux', 'triste', 'rapide'], ['joli', 'beau', 'laid', 'lourd'], ['commencer', 'débuter', 'finir', 'chanter'],
  ['finir', 'terminer', 'commencer', 'courir'], ['regarder', 'observer', 'écouter', 'cacher'], ['crier', 'hurler', 'chuchoter', 'manger'],
  ['peur', 'frayeur', 'courage', 'cadeau'], ['vélo', 'bicyclette', 'voiture', 'ballon'], ['voiture', 'automobile', 'vélo', 'maison'],
  ['gentil', 'aimable', 'méchant', 'grand'], ['triste', 'malheureux', 'joyeux', 'mouillé'], ['fâché', 'en colère', 'calme', 'petit'],
  ['drôle', 'amusant', 'ennuyeux', 'lourd'], ['bizarre', 'étrange', 'normal', 'chaud'], ['calme', 'tranquille', 'agité', 'jaune'],
  ['docteur', 'médecin', 'malade', 'facteur'], ['casser', 'briser', 'réparer', 'laver'], ['jeter', 'lancer', 'attraper', 'dormir'],
  ['se dépêcher', 'se presser', 'traîner', 'se laver'], ['habit', 'vêtement', 'maison', 'jardin'], ['chemin', 'sentier', 'forêt', 'pont'],
  ['copain', 'ami', 'ennemi', 'cousin'], ['rire', 'rigoler', 'pleurer', 'courir'], ['malin', 'rusé', 'bête', 'propre'],
  ['sauter', 'bondir', 'marcher', 'dormir'], ['peureux', 'craintif', 'courageux', 'lent'],
];

/** Niveaux 4 à 6 : le contraire, ou le mot qui veut dire la même chose. */
function wordPair(rng, level) {
  const synonym = level === 6;
  const [word, answer, ...others] = pick(rng, synonym ? SYNONYMS : OPPOSITES[level]);
  const sound = { text: word, rate: 0.8 };
  return {
    key: `vocabulaire:${synonym ? 'synonyme' : 'contraire'}:${word}`,
    text: synonym ? `Quel mot veut dire la même chose que « ${word} » ?` : `Quel est le contraire de « ${word} » ?`,
    instruction: [synonym ? 'Quel mot veut dire la même chose que :' : 'Quel est le contraire de :', sound],
    short: synonym
      ? { key: 'vocabulaire:synonyme', text: 'La même chose ?', speak: [sound] }
      : { key: 'vocabulaire:contraire', text: 'Le contraire ?', speak: [sound] },
    replay: [sound],
    stage: { type: 'word', text: word },
    choices: textChoices(shuffle(rng, [answer, ...others])),
    choiceStyle: 'words',
    answer,
    success: { speak: [word, answer, synonym ? 'Ces deux mots veulent dire la même chose !' : 'Ce sont des contraires !'] },
  };
}

// Niveaux 7 et 8 : familles de mots. [mot, mots de sa famille, mots qui lui ressemblent sans être de sa famille]
export const FAMILIES = [
  ['dent', ['dentiste', 'dentifrice'], ['dinde', 'danse']],
  ['fleur', ['fleuriste', 'fleurir'], ['fleuve', 'flèche']],
  ['jardin', ['jardinier', 'jardiner'], ['jambe', 'jaune']],
  ['terre', ['terrier', 'enterrer'], ['terrible', 'tarte']],
  ['nage', ['nager', 'nageur'], ['neige', 'nuage']],
  ['chant', ['chanter', 'chanteur'], ['champ', 'chameau']],
  ['coiffure', ['coiffeur', 'coiffer'], ['coffre', 'couteau']],
  ['jour', ['journée', 'bonjour'], ['jouet', 'joue']],
  ['roi', ['royaume', 'royal'], ['roue', 'rose']],
  ['feuille', ['feuillage'], ['feu', 'fouiller']],
  ['plume', ['plumage', 'plumer'], ['pluie', 'plage']],
  ['ferme', ['fermier', 'fermière'], ['fête', 'feutre']],
  ['pomme', ['pommier'], ['pompier', 'paume']],
  ['poire', ['poirier'], ['poireau', 'poisson']],
  ['lion', ['lionne', 'lionceau'], ['lien', 'ligne']],
  ['poule', ['poulailler', 'poulet'], ['pouce', 'poupée']],
  ['loup', ['louve', 'louveteau'], ['loupe', 'loutre']],
  ['âne', ['ânesse', 'ânon'], ['année', 'anneau']],
  ['savon', ['savonner', 'savonnette'], ['salon', 'sable']],
  ['étoile', ['étoilé'], ['toile', 'école']],
  ['soleil', ['ensoleillé'], ['sommeil', 'solide']],
  ['nuage', ['nuageux'], ['nager', 'neige']],
  ['rouge', ['rougir', 'rougeur'], ['route', 'rouler']],
  ['grand', ['grandir', 'agrandir'], ['gland', 'grenier']],
  ['chaud', ['chauffer', 'réchauffer'], ['chausson', 'chaussure']],
  ['long', ['longueur', 'allonger'], ['lent', 'lune']],
  ['froid', ['refroidir', 'froideur'], ['froisser', 'fromage']],
  ['blanc', ['blanchir', 'blancheur'], ['blé', 'blague']],
  ['dormir', ['dortoir', 'endormi'], ['dorer', 'dos']],
  ['laver', ['lavage', 'lavabo'], ['larve', 'lèvre']],
  ['bateau', ['batelier'], ['bâton', 'bataille']],
  ['sale', ['salir', 'saleté'], ['salé', 'salade']],
  ['fruit', ['fruitier'], ['fuite', 'frite']],
  ['peigne', ['peigner'], ['peindre', 'peine']],
  ['colle', ['coller', 'décoller'], ['collier', 'colline']],
];

/** Niveau 7 : le mot de la même famille, parmi des mots qui se ressemblent. */
function sameFamily(rng) {
  const [base, members, traps] = pick(rng, FAMILIES);
  const answer = pick(rng, members);
  const sound = { text: base, rate: 0.8 };
  return {
    key: `vocabulaire:famille:${base}:${answer}`,
    text: `Quel mot est de la même famille que « ${base} » ?`,
    instruction: ['Quel mot est de la même famille que :', sound],
    short: { key: 'vocabulaire:famille', text: `Même famille que « ${base} » ?`, speak: [sound] },
    replay: [sound],
    stage: { type: 'word', text: base },
    choices: textChoices(shuffle(rng, [answer, ...traps])),
    choiceStyle: 'words',
    answer,
    success: { speak: [base, answer, 'Ce sont des mots de la même famille !'] },
  };
}

/** Niveau 8 : l'intrus de la famille (« fleur, fleuriste, fleuve »). */
function oddFamily(rng) {
  const [base, members, traps] = pick(rng, FAMILIES);
  const odd = pick(rng, traps);
  return {
    key: `vocabulaire:intrus-famille:${base}:${odd}`,
    text: 'Quel mot n’est pas de la même famille que les autres ?',
    instruction: 'Lis les mots. Un mot n’est pas de la même famille que les autres : lequel ?',
    short: { key: 'vocabulaire:intrus-famille', text: 'L’intrus de la famille ?' },
    stage: { type: 'none' },
    choices: textChoices(shuffle(rng, [base, ...members, odd])),
    choiceStyle: 'words',
    answer: odd,
    success: { speak: [odd, 'Ce mot n’est pas de la même famille.'] },
  };
}

// Niveau 9 : du plus général au plus précis. [mot général, mot plus précis, [mot précis, image]…]
export const HIERARCHIES = [
  ['animal', 'oiseau', [['hibou', '🦉'], ['canard', '🦆'], ['aigle', '🦅'], ['perroquet', '🦜'], ['cygne', '🦢'], ['paon', '🦚'],
    ['poule', '🐔'], ['dinde', '🦃']]],
  ['animal', 'insecte', [['abeille', '🐝'], ['fourmi', '🐜'], ['coccinelle', '🐞'], ['papillon', '🦋'], ['mouche', '🪰'],
    ['moustique', '🦟'], ['grillon', '🦗']]],
  ['animal', 'reptile', [['serpent', '🐍'], ['crocodile', '🐊'], ['tortue', '🐢'], ['lézard', '🦎']]],
  ['animal', 'poisson', [['requin', '🦈']]],
  ['animal', 'chien', [['caniche', '🐩']]],
  ['plante', 'fleur', [['tulipe', '🌷'], ['rose', '🌹'], ['tournesol', '🌻']]],
  ['plante', 'arbre', [['sapin', '🌲'], ['palmier', '🌴']]],
  ['aliment', 'fruit', [['pomme', '🍎'], ['poire', '🍐'], ['cerise', '🍒'], ['fraise', '🍓'], ['banane', '🍌'], ['citron', '🍋'],
    ['ananas', '🍍'], ['kiwi', '🥝'], ['pêche', '🍑'], ['pastèque', '🍉']]],
  ['aliment', 'légume', [['carotte', '🥕'], ['brocoli', '🥦'], ['poivron', '🫑'], ['concombre', '🥒'], ['oignon', '🧅']]],
];

/** Niveau 9 : ranger trois mots, du plus général au plus précis (aliment, fruit, pomme). */
function generalToPrecise(rng) {
  const [top, mid, specifics] = pick(rng, HIERARCHIES);
  const [word, emoji] = pick(rng, specifics);
  const words = [top, mid, word];
  let order = shuffle(rng, [0, 1, 2]);
  if (order.every((v, i) => v === i)) order = [...order.slice(1), order[0]]; // jamais déjà rangés
  return {
    key: `vocabulaire:general:${words.join(',')}`,
    interaction: 'order',
    text: 'Range les mots, du plus général au plus précis.',
    instruction: 'Range les mots, du plus général au plus précis : d’abord le grand groupe, à la fin le mot le plus précis.',
    short: { key: 'vocabulaire:general', text: 'Du plus général au plus précis !' },
    stage: { type: 'picture', emoji },
    items: order.map((i) => ({ value: i, label: words[i] })),
    order: 'asc',
    sign: '>',
    choices: [],
    answer: words.join(','),
    success: { speak: words },
  };
}

const VOCABULAIRE_LEVELS = {
  1: goesWith,
  2: oddPicture,
  3: categoryName,
  4: (rng) => wordPair(rng, 4),
  5: (rng) => wordPair(rng, 5),
  6: (rng) => wordPair(rng, 6),
  7: sameFamily,
  8: oddFamily,
  9: generalToPrecise,
};

export const vocabulaire = {
  id: 'vocabulaire',
  domain: 'francais',
  section: 'Vocabulaire',
  title: 'Les mots',
  icon: '🗂️',
  skill: 'Ranger les mots par catégories, trouver les contraires et les synonymes, reconnaître les familles de mots',
  levels: [
    'Quelle image va avec ?', 'L’intrus', 'Le nom de la catégorie', 'Les contraires',
    'Contraires plus difficiles', 'Les synonymes', 'Les familles de mots', 'L’intrus de la famille',
    'Du général au précis', 'Tout mélangé',
  ],
  generate(level, rng) {
    // niveau 10 : les niveaux 2 à 9 mélangés
    const l = level >= 10 ? 2 + Math.floor(rng() * 8) : level;
    const q = VOCABULAIRE_LEVELS[l](rng);
    return level >= 10 ? { ...q, key: `${q.key}:melange` } : q;
  },
};

export const VOCABULAIRE_GAMES = [ponctuation, vocabulaire];
