// Jeux de lecture. Chaque `generate(level, rng)` renvoie une question décrite
// uniquement par des données ; l'affichage est fait par js/render.js.

import { pick, sample, shuffle } from '../random.js';
import { pickForLevel, similarWords, textChoices } from './helpers.js';
import {
  CLUSTER_SOUNDS, FINAL_SOUNDS, FIRST_SOUNDS, PICTURES, READING_WORDS, SIGHT_WORDS, SYLLABLE_LEVELS, SYLLABLE_SPEECH,
} from '../data/lecture-data.js';

const SLOW = 0.7; // débit de la voix pour le son / la syllabe à entendre

/** « ballon, chat, ou lune » : les images nommées à voix haute. */
function sayList(words) {
  return words.map((w, i) => (i === words.length - 1 && i > 0 ? `ou ${w}` : w)).join(', ');
}

/** Niveau 4 : la lettre est écrite, l'enfant cherche l'image dont le nom commence par ce son. */
function letterToPicture(rng) {
  const target = pick(rng, FIRST_SOUNDS.filter((s) => s.grapheme.length === 1));
  const word = pick(rng, target.words);
  // aucun distracteur ne commence par cette lettre (« chat » n'est pas un intrus pour « c »)
  const others = FIRST_SOUNDS.filter((s) => s !== target).flatMap((s) => s.words).filter((w) => w[0] !== target.grapheme);
  const options = shuffle(rng, [word, ...sample(rng, others, 3)]);
  const letter = { text: target.grapheme, rate: SLOW };
  const list = sayList(options);
  return {
    key: `premier-son:lettre:${word}`,
    text: 'Quelle image commence par cette lettre ?',
    instruction: ['Trouve l’image qui commence par la lettre :', letter, list],
    short: { key: 'premier-son:lettre', text: 'Quelle image ?', speak: [letter, list] },
    replay: [letter, list],
    stage: { type: 'word', text: target.grapheme },
    choices: options.map((w) => ({ value: w, label: PICTURES[w] })),
    choiceStyle: 'pictures',
    answer: word,
    success: { speak: word, reveal: word, highlight: target.grapheme.length },
  };
}

/** Niveaux 5 et 6 : le son de la fin du mot, ou les deux premiers sons (tr, fl…). */
function soundChoice(rng, level) {
  const atEnd = level === 5;
  const sounds = atEnd ? FINAL_SOUNDS : CLUSTER_SOUNDS;
  const target = pick(rng, sounds);
  const word = pick(rng, target.words);
  const fits = (g) => (atEnd ? word.endsWith(g) : word.startsWith(g));
  const others = sounds.map((s) => s.grapheme).filter((g) => g !== target.grapheme && !fits(g));
  const choices = shuffle(rng, [target.grapheme, ...sample(rng, others, 3)]);
  const sound = { text: word, rate: SLOW };
  return {
    key: `premier-son:${atEnd ? 'fin' : 'groupe'}:${word}`,
    text: atEnd ? 'Quel son entends-tu à la fin du mot ?' : 'Quels deux sons entends-tu au début ?',
    instruction: [atEnd ? 'Quel son entends-tu à la fin du mot…' : 'Quels deux sons entends-tu au début du mot…', sound],
    short: atEnd
      ? { key: 'premier-son:fin', text: 'Le son de la fin ?', speak: [sound] }
      : { key: 'premier-son:groupe', text: 'Les deux premiers sons ?', speak: [sound] },
    replay: [sound],
    stage: { type: 'picture', emoji: PICTURES[word] },
    choices: textChoices(choices),
    choiceStyle: 'letters',
    answer: target.grapheme,
    success: atEnd ? { speak: word, reveal: word } : { speak: word, reveal: word, highlight: 2 },
  };
}

export const premierSon = {
  id: 'premier-son',
  domain: 'francais',
  section: 'Lettres et sons',
  title: 'Le premier son',
  icon: '👂',
  skill: "Entendre le premier son d'un mot (et le dernier) et l'associer à sa lettre",
  levels: [
    'Voyelles et l, m, r, s', 'Ajout de v, f, p, t, n, b, d', 'Ajout de ch, c, g, j, z',
    'De la lettre à l’image', 'Le son de la fin', 'Deux consonnes : tr, fl…',
  ],
  generate(level, rng) {
    if (level === 4) return letterToPicture(rng);
    if (level >= 5) return soundChoice(rng, level);
    const target = pickForLevel(rng, FIRST_SOUNDS, level);
    const word = pick(rng, target.words);
    const choiceCount = level >= 3 ? 4 : 3;
    // Un distracteur ne doit jamais être le début du mot (ex. « c » pour « chat »).
    const others = FIRST_SOUNDS.filter(
      (s) => s.level <= level && s.grapheme !== target.grapheme && !word.startsWith(s.grapheme),
    ).map((s) => s.grapheme);
    const choices = shuffle(rng, [target.grapheme, ...sample(rng, others, choiceCount - 1)]);
    return {
      key: `premier-son:${word}`,
      text: 'Quel son entends-tu au début du mot ?',
      instruction: ['Quel son entends-tu au début du mot…', { text: word, rate: SLOW }],
      short: { text: 'Le premier son ?', speak: [{ text: word, rate: SLOW }] },
      replay: [{ text: word, rate: SLOW }],
      stage: { type: 'picture', emoji: PICTURES[word] },
      choices: textChoices(choices),
      choiceStyle: 'letters',
      answer: target.grapheme,
      success: { speak: word, reveal: word, highlight: target.grapheme.length },
    };
  },
};

// Syllabes inversées (voyelle puis consonne) et syllabes à deux consonnes (tra, pli…).
// Comme pour SYLLABLE_SPEECH, un mot qui se prononce pareil guide la synthèse vocale.
const VC_SYLLABLES = { consonants: ['l', 'r', 's'], vowels: ['a', 'i', 'o', 'u'] };
const CCV_SYLLABLES = { clusters: ['tr', 'pr', 'br', 'cr', 'gr', 'fr', 'pl', 'bl', 'fl', 'cl'], vowels: ['a', 'i', 'o'] };
const EXTRA_SPEECH = {
  al: 'alle', il: 'il', ol: 'olle', ul: 'ulle', ar: 'are', ir: 'ire', or: 'or', ur: 'ure',
  as: 'asse', is: 'isse', os: 'osse', us: 'usse',
  tro: 'trop', pri: 'prix', bra: 'bras', bri: 'bris', cri: 'cri', cro: 'croc', gra: 'gras', gri: 'gris',
  gro: 'gros', fri: 'frit', pla: 'plat', pli: 'pli', plo: 'plot', blo: 'bloc', flo: 'flot', clo: 'clos',
};

function syllableSpeech(syllable) {
  return SYLLABLE_SPEECH[syllable] || EXTRA_SPEECH[syllable] || syllable;
}

/** Une syllabe entendue, à retrouver parmi 4 qui lui ressemblent. */
function syllableQuestion(rng, target, distractors) {
  const choices = shuffle(rng, [target, ...distractors]);
  const sound = { text: syllableSpeech(target), rate: SLOW };
  return {
    key: `syllabes:${target}`,
    text: 'Touche la syllabe que tu entends.',
    instruction: ['Touche la syllabe que tu entends :', sound],
    short: { text: 'Quelle syllabe ?', speak: [sound] },
    replay: [sound],
    stage: { type: 'listen' },
    choices: textChoices(choices),
    choiceStyle: 'letters',
    answer: target,
    success: { speak: sound },
  };
}

/** Niveau 4 : « al », « or »… et ses pièges : la syllabe dans l'autre sens (« la »), une voisine. */
function reversedSyllable(rng) {
  const { consonants, vowels } = VC_SYLLABLES;
  const c = pick(rng, consonants);
  const v = pick(rng, vowels);
  const sameVowel = v + pick(rng, consonants.filter((x) => x !== c));
  const sameConsonant = pick(rng, vowels.filter((x) => x !== v)) + c;
  return syllableQuestion(rng, v + c, [c + v, sameVowel, sameConsonant]);
}

/** Niveau 5 : « tra », « pli »… ; pièges : sans la 2e consonne (« ta »), autre voyelle, autre groupe. */
function clusterSyllable(rng) {
  const { clusters, vowels } = CCV_SYLLABLES;
  const cc = pick(rng, clusters);
  const v = pick(rng, vowels);
  const otherVowel = cc + pick(rng, vowels.filter((x) => x !== v));
  const otherCluster = pick(rng, clusters.filter((x) => x !== cc)) + v;
  return syllableQuestion(rng, cc + v, [cc[0] + v, otherVowel, otherCluster]);
}

/** Niveau 6 : écrire la syllabe entendue en touchant ses lettres dans l'ordre. */
function writeSyllable(rng) {
  let target;
  if (rng() < 0.5) {
    const { consonants, vowels } = SYLLABLE_LEVELS[3];
    target = pick(rng, consonants) + pick(rng, vowels);
  } else {
    target = pick(rng, CCV_SYLLABLES.clusters) + pick(rng, CCV_SYLLABLES.vowels);
  }
  const letters = target.split('');
  let order = shuffle(rng, letters.map((_, i) => i));
  if (order.every((v, i) => v === i)) order = [...order.slice(1), order[0]]; // jamais déjà dans l'ordre
  const sound = { text: syllableSpeech(target), rate: SLOW };
  return {
    key: `syllabes:ecris:${target}`,
    interaction: 'order',
    text: 'Écris la syllabe : touche les lettres dans l’ordre.',
    instruction: ['Écris la syllabe', sound, 'Touche les lettres dans l’ordre.'],
    short: { key: 'syllabes:ecris', text: 'Écris la syllabe.', speak: [sound] },
    replay: [sound],
    stage: { type: 'listen' },
    items: order.map((i) => ({ value: i, label: letters[i] })),
    order: 'asc',
    sign: '',
    choices: [],
    answer: target,
    success: { speak: sound },
  };
}

export const syllabes = {
  id: 'syllabes',
  domain: 'francais',
  section: 'Lettres et sons',
  title: 'Les syllabes',
  icon: '🧩',
  skill: 'Associer une syllabe entendue à son écriture (l + a = la), puis l’écrire',
  levels: [
    'l, m, r, s avec a, i, o, u', 'Plus de consonnes, et le é', 'Avec ou, on, an, in, oi',
    'Syllabes inversées (al)', 'Avec tr, pl, cr, fl…', 'Écris la syllabe',
  ],
  generate(level, rng) {
    if (level === 4) return reversedSyllable(rng);
    if (level === 5) return clusterSyllable(rng);
    if (level === 6) return writeSyllable(rng);
    const { consonants, vowels } = SYLLABLE_LEVELS[level];
    const c = pick(rng, consonants);
    const v = pick(rng, vowels);
    const target = c + v;
    // Distracteurs : même consonne ou même voyelle, et syllabe inversée (la / al).
    const pool = new Set();
    vowels.filter((x) => x !== v).forEach((x) => pool.add(c + x));
    consonants.filter((x) => x !== c).forEach((x) => pool.add(x + v));
    const distractors = sample(rng, [...pool], level >= 2 ? 3 : 2);
    if (level >= 2 && v.length === 1 && c.length === 1) distractors[0] = v + c;
    return syllableQuestion(rng, target, distractors);
  },
};

// « Le bon mot », niveaux 4 à 6 : [mot de l'image, autre mot, autre mot].
// Niveau 4 : des mots qui ne diffèrent que d'une ou deux lettres (lire chaque lettre).
const LOOK_ALIKE_WORDS = [
  ['poule', 'boule', 'foule'], ['pomme', 'gomme', 'somme'], ['bateau', 'gâteau', 'râteau'],
  ['main', 'pain', 'bain'], ['poisson', 'poison', 'boisson'], ['mouche', 'bouche', 'douche'],
  ['lapin', 'sapin', 'latin'], ['chapeau', 'château', 'chameau'], ['vache', 'tache', 'hache'],
  ['fusée', 'musée', 'rusée'], ['singe', 'linge', 'songe'], ['lit', 'lot', 'lin'],
  ['dent', 'vent', 'dont'], ['renard', 'regard', 'retard'], ['canard', 'cafard', 'canari'],
  ['loup', 'coup', 'loupe'], ['robot', 'rabot', 'robe'], ['valise', 'balise', 'valse'],
  ['étoile', 'toile', 'voile'], ['fleur', 'peur', 'fleuve'], ['souris', 'sourit', 'sourire'],
  ['livre', 'lièvre', 'libre'], ['train', 'grain', 'trait'], ['chaise', 'chaîne', 'chasse'],
  ['mouton', 'bouton', 'glouton'], ['ballon', 'balcon', 'salon'],
];
// Niveau 5 : le mot bien écrit, parmi des écritures qui se prononcent (presque) pareil.
const SPELLINGS = [
  ['bateau', 'bato', 'batau'], ['gâteau', 'gato', 'gâtau'], ['maison', 'méson', 'maizon'],
  ['oiseau', 'oizeau', 'oisau'], ['château', 'chato', 'châtau'], ['chapeau', 'chapo', 'chapau'],
  ['cadeau', 'cado', 'cadau'], ['éléphant', 'éléfant', 'éléphan'], ['girafe', 'girrafe', 'jirafe'],
  ['escargot', 'escargo', 'èscargot'], ['citron', 'sitron', 'citrond'], ['serpent', 'serpant', 'cerpent'],
  ['fraise', 'frèse', 'fraize'], ['chaise', 'chèse', 'chaize'], ['raisin', 'rèsin', 'raizin'],
  ['poisson', 'poison', 'poisont'], ['parapluie', 'parapluit', 'paraplui'], ['crocodile', 'crokodile', 'crocodil'],
  ['papillon', 'papiyon', 'papilon'], ['lunettes', 'lunètes', 'lunetes'], ['abeille', 'abeie', 'abeil'],
  ['tracteur', 'trakteur', 'tracteure'], ['soleil', 'solèy', 'soleille'], ['zèbre', 'zaibre', 'zèbr'],
  ['singe', 'cinge', 'sinje'], ['étoile', 'étoille', 'étwal'], ['cerise', 'serise', 'ceriz'],
];
// Niveau 6 : un mot de la même famille (et deux mots qui lui ressemblent seulement).
const FAMILIES = [
  { base: 'dent', words: ['dentiste', 'danse', 'dindon'] },
  { base: 'fleur', words: ['fleuriste', 'flèche', 'fleuve'] },
  { base: 'chat', words: ['chaton', 'château', 'chapeau'] },
  { base: 'glace', words: ['glacier', 'glisser', 'classe'] },
  { base: 'école', words: ['écolier', 'écureuil', 'colle'] },
  { base: 'cheval', words: ['chevalier', 'cheveu', 'chèvre'] },
  { base: 'livre', words: ['livret', 'lièvre', 'libre'] },
  { base: 'neige', words: ['neiger', 'nager', 'neuf'] },
  { base: 'bras', words: ['bracelet', 'brave', 'brosse'] },
  { base: 'mer', emoji: '🌊', words: ['marin', 'mère', 'merle'] },
  { base: 'dessin', emoji: '🖍️', words: ['dessiner', 'dessert', 'coussin'] },
  { base: 'sel', emoji: '🧂', words: ['salé', 'sale', 'selle'] },
  { base: 'lait', emoji: '🥛', words: ['laitier', 'laine', 'lame'] },
  { base: 'mont', emoji: '⛰️', words: ['montagne', 'montre', 'mouton'] },
  { base: 'peur', emoji: '😨', words: ['peureux', 'pleurer', 'pelure'] },
  { base: 'vent', emoji: '💨', words: ['éventail', 'vente', 'ventre'] },
  { base: 'danse', emoji: '💃', words: ['danseuse', 'dent', 'dinde'] },
];

/** « Le bon mot », niveaux 4 à 6 : l'image, et trois mots écrits à départager. */
function wordStudy(rng, level) {
  if (level === 6) {
    const family = pick(rng, FAMILIES);
    const [answer, ...others] = family.words;
    return {
      key: `bon-mot:famille:${family.base}`,
      text: `Quel mot est de la même famille que « ${family.base} » ?`,
      instruction: ['Quel mot est de la même famille que :', family.base],
      short: { key: 'bon-mot:famille', text: `Même famille que « ${family.base} » ?`, speak: [family.base] },
      replay: [family.base],
      stage: { type: 'picture', emoji: family.emoji || PICTURES[family.base] },
      choices: textChoices(shuffle(rng, [answer, ...others])),
      choiceStyle: 'words',
      answer,
      success: { speak: `${family.base}, ${answer} : ce sont des mots de la même famille !` },
    };
  }
  const [word, ...others] = pick(rng, level === 4 ? LOOK_ALIKE_WORDS : SPELLINGS);
  return {
    key: `bon-mot:${level}:${word}`,
    text: level === 4 ? 'Lis bien chaque lettre ! Quel mot va avec l’image ?' : 'Quel mot est bien écrit ?',
    instruction: level === 4
      ? 'Les mots se ressemblent : lis bien chaque lettre, et trouve celui qui va avec l’image.'
      : 'Un seul mot est bien écrit. Lequel ?',
    short: level === 4 ? { key: 'bon-mot:presque', text: 'Quel mot ?' } : { key: 'bon-mot:ecrit', text: 'Bien écrit ?' },
    stage: { type: 'picture', emoji: PICTURES[word] },
    choices: textChoices(shuffle(rng, [word, ...others])),
    choiceStyle: 'words',
    answer: word,
    success: { speak: word },
  };
}

export const bonMot = {
  id: 'bon-mot',
  domain: 'francais',
  section: 'Lire',
  title: 'Le bon mot',
  icon: '📖',
  skill: "Lire un mot et l'associer à son image ; orthographe et familles de mots",
  levels: [
    'Mots simples (moto, lune…)', 'Mots avec ch, ou, on, an, in', 'Mots avec oi, ai, eau, eu…',
    'Des mots presque pareils', 'Le mot bien écrit', 'Mots de la même famille',
  ],
  generate(level, rng) {
    if (level >= 4) return wordStudy(rng, level);
    const word = pick(rng, READING_WORDS[level]);
    const pool = [];
    for (let l = Math.max(1, level - 1); l <= level; l++) pool.push(...READING_WORDS[l]);
    const distractors = similarWords(rng, word, pool, level >= 2 ? 3 : 2);
    return {
      key: `bon-mot:${word}`,
      text: "Lis les mots. Lequel va avec l'image ?",
      instruction: "Lis les mots, et trouve celui qui va avec l'image.",
      short: { text: 'Quel mot ?' },
      stage: { type: 'picture', emoji: PICTURES[word] },
      choices: textChoices(shuffle(rng, [word, ...distractors])),
      choiceStyle: 'words',
      answer: word,
      success: { speak: word },
    };
  },
};

// « Les petits mots », niveaux 4 et 6 : [phrase, bon mot, autre mot, autre mot].
// Les deux autres mots ne vont jamais dans la phrase (pas de « sur le lit » pour « sous le lit »).
const MISSING_SMALL_WORDS = [
  ['Le poisson nage ___ l’eau.', 'dans', 'chez', 'pour'],
  ['Ce soir, je dors ___ mamie.', 'chez', 'sous', 'sur'],
  ['Je joue ___ mon frère.', 'avec', 'sous', 'dans'],
  ['Ce cadeau est ___ toi : bon anniversaire !', 'pour', 'sous', 'dans'],
  ['L’oiseau vole ___ le ciel.', 'dans', 'chez', 'avec'],
  ['Le chat se cache ___ le lit.', 'sous', 'chez', 'avec'],
  ['Je mets mon chapeau ___ ma tête.', 'sur', 'chez', 'avec'],
  ['Je bois ___ lait.', 'du', 'des', 'une'],
  ['Il a mangé ___ pommes.', 'des', 'du', 'une'],
  ['Le chien court ___ le jardin.', 'dans', 'chez', 'pour'],
  ['Mila écrit ___ un crayon.', 'avec', 'chez', 'sous'],
  ['Je me lave les mains ___ manger.', 'avant', 'sous', 'chez'],
];
const LINK_WORDS = [
  ['Il pleut, ___ je prends mon parapluie.', 'donc', 'mais', 'car'],
  ['Je prends mon parapluie ___ il pleut.', 'car', 'donc', 'mais'],
  ['J’ai faim, ___ le frigo est vide.', 'mais', 'car', 'donc'],
  ['Je me lave, ___ je m’habille.', 'puis', 'car', 'mais'],
  ['Léo est malade, ___ il reste au lit.', 'donc', 'mais', 'car'],
  ['Léo reste au lit ___ il est malade.', 'car', 'mais', 'puis'],
  ['Le chat est petit, ___ il saute très haut.', 'mais', 'car', 'donc'],
  ['Je mange ma soupe, ___ mon dessert.', 'puis', 'car', 'donc'],
  ['Elle court vite ___ elle est en retard.', 'car', 'mais', 'puis'],
  ['Il fait beau, ___ nous allons au parc.', 'donc', 'mais', 'car'],
  ['Tom voulait jouer, ___ il devait ranger.', 'mais', 'donc', 'puis'],
  ['D’abord on chante, ___ on danse.', 'puis', 'car', 'mais'],
];
// Niveau 5 : des mots-outils et leur contraire.
const OPPOSITES = [
  ['sur', 'sous'], ['avant', 'après'], ['dedans', 'dehors'], ['toujours', 'jamais'], ['beaucoup', 'peu'],
  ['devant', 'derrière'], ['avec', 'sans'], ['loin', 'près'], ['tôt', 'tard'], ['plus', 'moins'],
  ['tout', 'rien'], ['hier', 'demain'], ['dessus', 'dessous'],
];

/** Un petit mot à remettre dans la phrase (niveau 4 : sens de la phrase ; niveau 6 : mots de liaison). */
function missingSmallWord(rng, level) {
  const [sentence, answer, ...others] = pick(rng, level === 4 ? MISSING_SMALL_WORDS : LINK_WORDS);
  const full = sentence.replace('___', answer);
  return {
    key: `petits-mots:${level}:${sentence}`,
    text: level === 4 ? 'Quel petit mot manque dans la phrase ?' : 'Quel mot relie les deux parties de la phrase ?',
    instruction: level === 4 ? 'Lis la phrase, et trouve le petit mot qui manque.' : 'Lis la phrase, et trouve le mot qui la relie le mieux.',
    short: level === 4 ? { key: 'petits-mots:manque', text: 'Quel petit mot ?' } : { key: 'petits-mots:relie', text: 'Quel mot relie ?' },
    stage: { type: 'sentence', text: sentence.replace('___', '…') },
    choices: textChoices(shuffle(rng, [answer, ...others])),
    choiceStyle: 'words',
    answer,
    success: { speak: full },
  };
}

function opposite(rng) {
  const pair = shuffle(rng, pick(rng, OPPOSITES));
  const [word, answer] = pair;
  const others = sample(rng, OPPOSITES.flat().filter((w) => !pair.includes(w)), 2);
  const sound = { text: word, rate: 0.8 };
  return {
    key: `petits-mots:contraire:${word}`,
    text: `Quel est le contraire de « ${word} » ?`,
    instruction: ['Quel est le contraire de :', sound],
    short: { key: 'petits-mots:contraire', text: 'Le contraire ?', speak: [sound] },
    replay: [sound],
    stage: { type: 'word', text: word },
    choices: textChoices(shuffle(rng, [answer, ...others])),
    choiceStyle: 'words',
    answer,
    success: { speak: `${word}, ${answer} : ce sont des contraires !` },
  };
}

export const petitsMots = {
  id: 'petits-mots',
  domain: 'francais',
  section: 'Lire',
  title: 'Les petits mots',
  icon: '🔤',
  skill: 'Reconnaître les mots-outils (le, un, et, dans…) et les employer dans une phrase',
  levels: [
    'le, la, un, et, il…', 'dans, sur, avec, pour…', 'beaucoup, toujours, quand…',
    'Le petit mot qui manque', 'Les contraires', 'mais, car, donc, puis',
  ],
  generate(level, rng) {
    if (level === 4 || level === 6) return missingSmallWord(rng, level);
    if (level === 5) return opposite(rng);
    const target = pickForLevel(rng, SIGHT_WORDS, level);
    const pool = SIGHT_WORDS.filter((w) => w.level <= level).map((w) => w.word);
    const distractors = similarWords(rng, target.word, pool, level >= 2 ? 3 : 2);
    const sound = { text: target.speech || target.word, rate: 0.8 };
    return {
      key: `petits-mots:${target.word}`,
      text: 'Touche le mot que tu entends.',
      instruction: ['Touche le mot :', sound],
      short: { text: 'Quel mot ?', speak: [sound] },
      replay: [sound],
      stage: { type: 'listen' },
      choices: textChoices(shuffle(rng, [target.word, ...distractors])),
      choiceStyle: 'words',
      answer: target.word,
      success: { speak: sound },
    };
  },
};

export const LECTURE_GAMES = [premierSon, syllabes, bonMot, petitsMots];
