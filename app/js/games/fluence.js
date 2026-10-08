// Lire à voix haute (fluence), comme aux évaluations nationales de CP et de CE1 : « Lis le plus de
// mots possible en 1 minute ». L'enfant lit à voix haute une liste (syllabes, puis mots) ou un petit
// texte ; un adulte assis à côté écoute, touche les mots ratés (barrés en rouge), puis le dernier mot
// lu. Le score est le nombre de mots correctement lus par minute (MCLM).
//
// Ce fichier ne contient que des données et des fonctions pures (testées dans tests/fluence.test.js) :
// les listes et les textes, le calcul du score, les étoiles, le niveau suivant, l'évolution semaine par
// semaine et les repères par classe. L'affichage est dans main.js (fluenceZone) et dans dashboard.js.
// Estelle ne lit jamais les mots (c'est l'enfant qui lit) : elle dit seulement la consigne.

import { pick, shuffle } from '../random.js';

/** Durée de la lecture chronométrée (secondes). */
export const FLUENCE_SECONDS = 60;

// ---------------------------------------------------------------- Listes de syllabes et de mots

const CONSONNES = ['b', 'd', 'f', 'j', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v'];
const VOYELLES = ['a', 'e', 'i', 'o', 'u', 'é'];

/** Syllabes simples : une consonne et une voyelle (ma, li, ro, té…). */
export const SYLLABES_SIMPLES = CONSONNES.flatMap((c) => VOYELLES.map((v) => c + v));

/** Syllabes plus difficiles : ch, ou, on, an, in, oi, deux consonnes, syllabes fermées. */
export const SYLLABES_COMPLEXES = [
  'cha', 'chi', 'cho', 'chu', 'ché',
  'bou', 'dou', 'fou', 'jou', 'lou', 'mou', 'pou', 'rou', 'sou', 'tou',
  'bon', 'don', 'fon', 'lon', 'mon', 'pon', 'ron', 'son', 'ton',
  'ban', 'dan', 'fan', 'lan', 'man', 'pan', 'ran', 'tan', 'van',
  'fin', 'lin', 'min', 'pin', 'rin', 'sin', 'vin',
  'boi', 'foi', 'loi', 'moi', 'noi', 'poi', 'roi', 'soi', 'toi', 'voi',
  'bla', 'bra', 'cla', 'cra', 'dra', 'fla', 'fra', 'gla', 'gra', 'pla', 'pra', 'tra', 'vra',
  'bri', 'cri', 'fri', 'gri', 'pri', 'tri', 'blo', 'bro', 'clo', 'cro', 'flo', 'gro', 'plo', 'pro', 'tro',
  'al', 'ar', 'il', 'ir', 'ol', 'or', 'ul', 'ur',
  'bal', 'bar', 'dor', 'fil', 'mal', 'mar', 'nor', 'par', 'sal', 'tir', 'vol',
];

/** Mots courts : une ou deux syllabes, des lettres qui se lisent comme elles s'écrivent. */
export const MOTS_COURTS = [
  'ami', 'bal', 'bol', 'bus', 'fil', 'lac', 'lit', 'mur', 'rat', 'sac', 'sel', 'sol', 'vélo', 'moto',
  'papa', 'lune', 'pile', 'robe', 'rire', 'lama', 'mari', 'midi', 'mule', 'pipe', 'rame', 'ride', 'rose',
  'sale', 'tipi', 'tube', 'vite', 'dame', 'date', 'dune', 'fée', 'lime', 'lire', 'loto', 'menu', 'mode',
  'salé', 'film', 'parc', 'fort', 'port', 'bord', 'car', 'mer', 'fer', 'ver', 'polo', 'judo', 'kilo',
  'vase', 'balle', 'bulle', 'patte', 'botte', 'pomme', 'tasse', 'bébé', 'café', 'purée', 'pâte', 'tête',
  'fête', 'rêve', 'lèvre', 'carte', 'porte', 'finir', 'mardi', 'sirop', 'repas', 'radis',
];

/** Mots fréquents : les petits mots des phrases et des mots de tous les jours. */
export const MOTS_FREQUENTS = [
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'au', 'et', 'est', 'il', 'elle', 'ils', 'on', 'je', 'tu',
  'nous', 'vous', 'dans', 'sur', 'sous', 'avec', 'pour', 'par', 'mais', 'chez', 'qui', 'que', 'son', 'mon',
  'ton', 'ses', 'mes', 'très', 'plus', 'bien', 'petit', 'grand', 'maison', 'école', 'chat', 'chien', 'jour',
  'nuit', 'matin', 'soir', 'beau', 'belle', 'voici', 'voilà', 'aussi', 'alors', 'après', 'avant', 'encore',
  'toujours', 'maman', 'enfant', 'amie', 'ville', 'rouge', 'vert', 'bleu', 'jaune', 'noir', 'blanc', 'livre',
  'table', 'lundi', 'demain', 'hier', 'gâteau', 'oiseau', 'jardin', 'classe', 'maître', 'jouer', 'manger',
];

/** Mots plus longs : trois syllabes, des sons fréquents. */
export const MOTS_LONGS = [
  'tomate', 'salade', 'domino', 'lavabo', 'banane', 'cabane', 'pyjama', 'animal', 'samedi', 'vipère',
  'tulipe', 'limace', 'pirate', 'caméra', 'cinéma', 'numéro', 'malade', 'carotte', 'chocolat', 'pantalon',
  'girafe', 'machine', 'marmite', 'mercredi', 'vendredi', 'parasol', 'cerise', 'sardine', 'tartine',
  'farine', 'cheminée', 'robinet', 'lunette', 'canapé', 'galette', 'raquette', 'brioche', 'abricot',
  'matelas', 'valise', 'chemise', 'minute', 'rivière', 'musique', 'camarade', 'confiture', 'tortue',
  'mouton', 'lapin', 'bateau', 'château', 'cadeau', 'chapeau', 'moulin', 'dessiner', 'regarder', 'découper',
  'colorier', 'policier', 'jardinier', 'boulanger', 'récréation', 'kangourou', 'tambour', 'facteur', 'vacances',
];

/** Mots difficiles : sons complexes (ill, gn, eu, oin…), lettres muettes, quatre syllabes. */
export const MOTS_DIFFICILES = [
  'papillon', 'grenouille', 'écureuil', 'champignon', 'parapluie', 'téléphone', 'hélicoptère', 'crocodile',
  'cartable', 'croissant', 'escargot', 'chaussette', 'ordinateur', 'éléphant', 'pharmacie', 'anniversaire',
  'citrouille', 'feuille', 'soleil', 'abeille', 'poisson', 'coquillage', 'montagne', 'dauphin', 'pingouin',
  'écharpe', 'trampoline', 'magicien', 'chaussure', 'toboggan', 'bouteille', 'ascenseur', 'aquarium',
  'gymnase', 'spectacle', 'orchestre', 'chevalier', 'princesse', 'sorcière', 'fourchette', 'grenier',
  'bonhomme', 'framboise', 'ampoule', 'cuillère', 'aspirateur', 'déguisement', 'champion', 'cigogne',
  'araignée', 'épouvantail', 'noisette', 'patinoire', 'balançoire', 'tournesol', 'coccinelle', 'hérisson',
  'baignoire', 'oreiller', 'chenille', 'campagne', 'brouillard', 'quatorze', 'printemps', 'automne',
];

// ---------------------------------------------------------------- Petits textes

/** Textes à lire, du plus court au plus long (niveau du jeu, titre, texte). */
export const TEXTES_FLUENCE = [
  {
    level: 7, id: 'petit-chat', title: 'Le petit chat',
    text: 'Le petit chat est dans le jardin. Il voit un oiseau sur le mur. Le chat saute, mais l’oiseau part vite. '
      + 'Le chat a raté ! Il va sous l’arbre. Il fait une sieste au soleil. Le soir, il rentre à la maison. Il a faim. '
      + 'Maman lui donne du lait. Le chat est content. Il dort sur le lit.',
  },
  {
    level: 7, id: 'plage', title: 'À la plage',
    text: 'Papa et moi, nous allons à la plage. Il fait beau et chaud. Je fais un château de sable avec ma pelle. '
      + 'Papa lit un livre. La mer est bleue. Je vais dans l’eau avec ma bouée. L’eau est froide ! Je ris très fort. '
      + 'Après, nous mangeons une glace à la fraise. Quelle belle journée !',
  },
  {
    level: 7, id: 'gateau', title: 'Le gâteau',
    text: 'Ce matin, mamie fait un gâteau. Je l’aide. Je casse les œufs dans le bol. Mamie met la farine et le sucre. '
      + 'Je tourne avec la cuillère. Nous ajoutons du chocolat. Le gâteau va dans le four. Ça sent bon dans la cuisine ! '
      + 'Après le repas, nous mangeons le gâteau. Il est délicieux. Papi en veut encore.',
  },
  {
    level: 8, id: 'cabane', title: 'La cabane',
    text: 'Avec mon frère, nous construisons une cabane au fond du jardin. Nous prenons des branches, des planches et '
      + 'une vieille couverture. Mon frère tient les planches et je plante les clous avec papa. Le toit est un peu tordu, '
      + 'mais il tient bien. Dans la cabane, nous mettons des coussins, une lampe et nos livres préférés. Le soir, nous '
      + 'mangeons une soupe dedans, comme des explorateurs. Soudain, il commence à pleuvoir. Les gouttes tapent sur le '
      + 'toit. Nous restons bien au sec et nous rions. Notre cabane est la plus belle du monde !',
  },
  {
    level: 8, id: 'marche', title: 'Le marché',
    text: 'Le samedi matin, je vais au marché avec maman. Il y a beaucoup de monde et beaucoup de bruit. Les marchands '
      + 'crient pour vendre leurs fruits et leurs légumes. Maman achète des tomates, des carottes et une salade. Moi, je '
      + 'choisis des cerises bien rouges. Le marchand de fromage nous fait goûter un petit morceau. C’est très bon ! Plus '
      + 'loin, une dame vend des fleurs. Maman prend un bouquet de tulipes jaunes pour mettre sur la table. Mon panier est '
      + 'lourd, mais je le porte tout seul jusqu’à la maison. Je suis fier de moi.',
  },
  {
    level: 8, id: 'chien-perdu', title: 'Le chien perdu',
    text: 'Ce matin, en allant à l’école, je vois un petit chien tout seul sur le trottoir. Il a l’air triste et il '
      + 'tremble. Il porte un collier rouge avec une médaille. Je m’approche doucement et je lis un numéro de téléphone. '
      + 'Maman appelle tout de suite. Une voix répond : c’est la dame qui habite au bout de la rue ! Son chien s’est '
      + 'sauvé hier soir. Elle arrive en courant et prend son chien dans ses bras. Le petit chien remue la queue. La dame '
      + 'nous remercie et me donne un gros bonbon. Je suis arrivé en retard à l’école, mais la maîtresse a bien compris.',
  },
  {
    level: 9, id: 'zoo', title: 'La sortie au zoo',
    text: 'Aujourd’hui, toute la classe part au zoo en car. Nous avons chacun un sac avec un pique-nique et une gourde. '
      + 'Pendant le trajet, nous chantons des chansons avec la maîtresse. Dès l’entrée, nous entendons les singes qui crient '
      + 'dans les arbres. Ils sautent de branche en branche et font des grimaces. Plus loin, les girafes mangent les '
      + 'feuilles tout en haut des arbres, avec leur longue langue violette. Le gardien nous explique que l’éléphant boit '
      + 'plus de cent litres d’eau par jour. C’est incroyable ! À midi, nous pique-niquons sur l’herbe, près du bassin des '
      + 'otaries. Elles plongent, nagent très vite et attrapent les poissons que le soigneur leur lance. Tout le monde '
      + 'applaudit. L’après-midi, nous observons les lions qui dorment au soleil. Le plus gros ouvre un œil, bâille et se '
      + 'rendort. Dans le car du retour, beaucoup d’enfants s’endorment. Moi, je dessine dans mon carnet tous les animaux '
      + 'que j’ai vus, pour les montrer à mes parents.',
  },
  {
    level: 9, id: 'jardin-papi', title: 'Le jardin de papi',
    text: 'Pendant les vacances, je vais chez mon papi qui habite à la campagne. Derrière sa maison, il a un grand jardin '
      + 'avec des légumes, des fleurs et des arbres fruitiers. Chaque matin, nous mettons nos bottes et nous allons arroser '
      + 'les plantes avec un vieil arrosoir vert. Papi m’apprend à reconnaître les feuilles des carottes, des radis et des '
      + 'pommes de terre. Un jour, nous semons des graines de tournesol le long de la barrière. Il faut creuser un petit '
      + 'trou, poser la graine, la recouvrir de terre et arroser doucement. Papi dit qu’il faut être patient. Quelques '
      + 'jours plus tard, de petites pousses vertes sortent de la terre. Je suis tellement content que je cours le dire à '
      + 'mamie. À la fin des vacances, les tournesols sont plus grands que moi ! Avant de partir, papi me donne un sachet '
      + 'de graines, pour que je puisse en planter chez moi, sur le balcon.',
  },
  {
    level: 9, id: 'tempete', title: 'La tempête',
    text: 'Cette nuit, une grosse tempête a soufflé sur la ville. Le vent sifflait très fort et la pluie tapait contre les '
      + 'fenêtres. Je n’arrivais pas à dormir, alors je suis allé dans le lit de ma grande sœur. Elle m’a raconté une '
      + 'histoire de pirates pour me rassurer. Tout à coup, il y a eu un grand bruit dehors et la lumière s’est éteinte. '
      + 'Papa est arrivé avec une lampe de poche et des bougies. Nous nous sommes installés tous ensemble dans le salon, '
      + 'sous une grosse couverture. Papa a fait des ombres chinoises sur le mur avec ses mains : un lapin, un chien et '
      + 'même un dragon ! Nous avons beaucoup ri et j’ai fini par m’endormir. Le lendemain matin, le soleil brillait. Dans '
      + 'la rue, une branche d’arbre était tombée sur le trottoir. Les voisins sont sortis pour aider à la ranger. Tout le '
      + 'monde a eu peur, mais personne n’a été blessé.',
  },
];

/**
 * Les mots d'un texte, dans l'ordre : un mot par espace (« l’oiseau » compte pour un mot) ; un signe
 * de ponctuation seul (« ! », « : ») est accroché au mot d'avant par une espace insécable fine.
 */
export function fluenceTokens(text) {
  const out = [];
  for (const part of String(text).trim().split(/\s+/)) {
    if (!part) continue;
    if (!/[\p{L}\p{N}]/u.test(part) && out.length) out[out.length - 1] += ` ${part}`;
    else out.push(part);
  }
  return out;
}

// ---------------------------------------------------------------- Niveaux

const LIST_LENGTH = 60; // assez pour qu'un bon lecteur ne finisse pas la liste en une minute

const LEVELS = [
  { label: 'Syllabes simples (ma, li, ro)', kind: 'syllabes', pool: SYLLABES_SIMPLES },
  { label: 'Syllabes plus difficiles (cha, on, pla)', kind: 'syllabes', pool: SYLLABES_COMPLEXES },
  { label: 'Mots courts', kind: 'mots', pool: MOTS_COURTS },
  { label: 'Petits mots et mots fréquents', kind: 'mots', pool: MOTS_FREQUENTS },
  { label: 'Mots plus longs', kind: 'mots', pool: MOTS_LONGS },
  { label: 'Mots difficiles', kind: 'mots', pool: MOTS_DIFFICILES },
  { label: 'Un petit texte', kind: 'texte' },
  { label: 'Un texte', kind: 'texte' },
  { label: 'Un long texte', kind: 'texte' },
];

/** Une liste de `length` éléments tirés d'un réservoir, sans répétition tant que c'est possible. */
export function fluenceList(rng, pool, length = LIST_LENGTH) {
  const out = [];
  while (out.length < length) {
    const batch = shuffle(rng, pool).filter((w, i) => i || w !== out.at(-1)); // jamais deux fois de suite
    out.push(...batch.slice(0, length - out.length));
  }
  return out;
}

const CONSIGNES = {
  syllabes: ['Lis les syllabes à voix haute, le mieux possible.', 'Si tu ne sais pas lire une syllabe, passe à la suivante.'],
  mots: ['Lis les mots à voix haute, le mieux possible.', 'Si tu ne sais pas lire un mot, passe au suivant.'],
  texte: ['Lis le texte à voix haute, le mieux possible.', 'Si tu ne sais pas lire un mot, passe au suivant.'],
};

export const fluence = {
  id: 'fluence',
  domain: 'francais',
  title: 'Lire à voix haute',
  icon: '🗣️',
  skill: 'Fluence : lire à voix haute le plus de mots possible en 1 minute, avec un adulte',
  levels: LEVELS.map((l) => l.label),
  questions: 1, // une partie = une lecture
  adult: true, // un adulte écoute et note : hors du défi du jour, des révisions et des parties à deux
  generate(level, rng) {
    const { kind, pool } = LEVELS[level - 1];
    let tokens;
    let title = null;
    let id;
    if (kind === 'texte') {
      const text = pick(rng, TEXTES_FLUENCE.filter((t) => t.level === level));
      tokens = fluenceTokens(text.text);
      ({ title, id } = text);
    } else {
      tokens = fluenceList(rng, pool);
      id = tokens.slice(0, 4).join('-');
    }
    const consigne = CONSIGNES[kind];
    return {
      key: `fluence:${level}:${id}`,
      interaction: 'fluence',
      text: consigne[0],
      instruction: consigne,
      replay: consigne,
      stage: { type: 'fluence', kind, title, tokens },
      choices: [],
      answer: null,
    };
  },
};

// ---------------------------------------------------------------- Score

/**
 * Le score d'une lecture. `last` est l'indice du dernier mot lu (-1 : aucun), `missed` les indices des
 * mots ratés (ceux après le dernier mot lu ne comptent pas), `seconds` la durée de lecture.
 * MCLM : mots correctement lus, ramenés à une minute (une lecture finie en 40 secondes compte pour
 * ce qu'elle aurait donné en une minute ; une lecture libre, sans chrono, aussi).
 */
export function fluenceScore({ total, missed = [], last, seconds = FLUENCE_SECONDS }) {
  const read = Math.max(0, Math.min(total, Math.floor(last) + 1));
  const errors = [...new Set(missed)].filter((i) => Number.isInteger(i) && i >= 0 && i < read).length;
  const correct = read - errors;
  const time = Math.max(1, Math.round(seconds));
  return {
    total, read, errors, correct, seconds: time,
    mclm: Math.round((correct * 60) / time),
    accuracy: read ? correct / read : 0,
    allRead: total > 0 && read === total,
  };
}

/**
 * Durée à compter : une minute pour une lecture chronométrée (arrêtée par le temps, ou par l'adulte
 * avant la fin), le temps réel si l'enfant a tout lu avant la minute ou s'il lisait sans chrono.
 */
export function fluenceSeconds({ timed, allRead, elapsed }) {
  if (!timed) return Math.max(1, elapsed);
  return allRead ? Math.min(FLUENCE_SECONDS, Math.max(1, elapsed)) : FLUENCE_SECONDS;
}

/** Durée écrite pour les parents : « 1 minute », « 45 s », « 1 min 20 s ». */
export function fluenceTime(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const [min, sec] = [Math.floor(s / 60), s % 60];
  if (!min) return `${sec} s`;
  if (!sec) return min === 1 ? '1 minute' : `${min} minutes`;
  return `${min} min ${String(sec).padStart(2, '0')} s`;
}

/** Étoiles d'une lecture : toujours au moins 2 (l'effort de lire à voix haute), 3 sans presque aucune erreur. */
export function fluenceStars(score) {
  return score && score.read > 0 && score.accuracy >= 0.9 ? 3 : 2;
}

/**
 * Niveau de la prochaine lecture : on monte quand l'enfant lit presque sans erreur et avec aisance
 * (au moins 30 mots par minute, ou toute la liste) ; on redescend quand plus d'un mot sur quatre est raté.
 */
export function fluenceLevelAfter(level, score, min, max) {
  if (score.read > 0 && score.accuracy >= 0.95 && (score.allRead || score.mclm >= 30)) return Math.min(max, level + 1);
  if (score.read > 0 && score.accuracy < 0.75) return Math.max(min, level - 1);
  return level;
}

/** Ce qu'on garde d'une lecture sur le profil de l'enfant (child.fluence). */
export function fluenceEntry({ at, level, kind, timed, score }) {
  return {
    at, level, kind, timed: Boolean(timed),
    total: score.total, read: score.read, errors: score.errors, correct: score.correct, seconds: score.seconds, mclm: score.mclm,
  };
}

// ---------------------------------------------------------------- Suivi des parents

/** Lundi (0 h) de la semaine d'une date. */
export function weekStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/** Seules les lectures de mots et de textes comptent dans le suivi (pas les listes de syllabes). */
export function wordReadings(scores) {
  return (scores || []).filter((s) => s.kind !== 'syllabes');
}

/** Dernier score, meilleur score et nombre de lectures (null s'il n'y en a pas). */
export function fluenceSummary(scores) {
  if (!scores?.length) return null;
  const best = scores.reduce((a, b) => (b.mclm > a.mclm ? b : a));
  return { last: scores.at(-1), best, count: scores.length };
}

/**
 * L'évolution semaine par semaine : les `count` dernières semaines (la plus ancienne d'abord), au plus
 * depuis la semaine de la première lecture. Pour chaque semaine : meilleur et dernier score, nombre de lectures.
 */
export function fluenceWeeks(scores, now = Date.now(), count = 8) {
  const list = scores || [];
  const current = weekStart(now);
  const first = list.length ? weekStart(Math.min(...list.map((s) => new Date(s.at).getTime()))) : current;
  const span = Math.round((current - first) / (7 * 24 * 3600 * 1000)) + 1;
  const n = Math.max(1, Math.min(count, span));
  return Array.from({ length: n }, (_, i) => {
    const start = new Date(current);
    start.setDate(start.getDate() - (n - 1 - i) * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const inWeek = list.filter((s) => new Date(s.at) >= start && new Date(s.at) < end);
    return {
      start,
      readings: inWeek.length,
      best: inWeek.length ? Math.max(...inWeek.map((s) => s.mclm)) : null,
      last: inWeek.length ? inWeek.at(-1).mclm : null,
    };
  });
}

// Repères de l'Éducation nationale (guides et évaluations de CP et de CE1), donnés à titre indicatif.
const REPERES = {
  CP: 'environ 50 mots par minute en fin de CP',
  CE1: 'environ 70 à 90 mots par minute en fin de CE1',
  CE2: 'environ 90 à 110 mots par minute en fin de CE2',
};

/**
 * Le repère de la classe, formulé avec prudence (null pour la maternelle) ; `short` : la version
 * courte de l'écran de fin de partie (la version longue est dans le suivi des parents).
 */
export function fluenceBenchmark(grade, { short = false } = {}) {
  if (!REPERES[grade]) return null;
  if (short) return `Repère : ${REPERES[grade]} (chacun avance à son rythme).`;
  return `Repère indicatif (Éducation nationale) : ${REPERES[grade]}. En cours d’année, c’est normal d’en lire moins : chaque enfant avance à son rythme.`;
}
