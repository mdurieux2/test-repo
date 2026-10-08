// Comprendre une histoire (GS au CE1) : « Dans l'ordre ». Les images d'une petite histoire sont
// mélangées : on les remet dans l'ordre, on retrouve le début ou la fin, ce qui s'est passé avant,
// ce qui va se passer ensuite.
// Chaque image est un emoji (ou une petite scène de 2 emoji) et une phrase : la légende écrite
// aux niveaux du CP et du CE1 (5 à 10), la phrase dite par la voix au niveau 4 (l'histoire
// racontée), et l'histoire racontée dans l'ordre une fois les images rangées.

import { pick, shuffle } from '../random.js';

// theme : 'vie' (vie quotidienne), 'nature' ou 'cuisine' ; clair : les images suffisent, sans les
// phrases, pour trouver l'ordre (niveaux de GS sans légende ni histoire racontée).
// steps : [emoji (une scène de 2 emoji est séparée par une espace), phrase], dans l'ordre.
const STORIES = [
  // ---- 3 images : la vie de tous les jours (niveau 1)
  { id: 'matin', title: 'Le matin', theme: 'vie', clair: true, steps: [
    ['⏰', 'Le réveil sonne.'], ['🚿', 'Il prend sa douche.'], ['👕', 'Il s’habille.']] },
  { id: 'sortir', title: 'Pour sortir', theme: 'vie', clair: true, steps: [
    ['🧦', 'Elle met ses chaussettes.'], ['👟', 'Elle met ses baskets.'], ['🌳', 'Elle va au parc.']] },
  { id: 'repas', title: 'Le repas', theme: 'vie', clair: true, steps: [
    ['🧼', 'Il se lave les mains.'], ['🍝', 'Il mange des pâtes.'], ['🦷', 'Il se brosse les dents.']] },
  { id: 'dessin', title: 'Le dessin', theme: 'vie', clair: true, steps: [
    ['📄', 'Elle prend une feuille.'], ['🖍️', 'Elle dessine.'], ['🖼️', 'Elle accroche son dessin.']] },
  { id: 'coucher', title: 'Au lit !', theme: 'vie', clair: true, steps: [
    ['🛁', 'Il prend son bain.'], ['📖', 'Papa lit une histoire.'], ['😴', 'Il s’endort.']] },

  // ---- 3 images : une plante, un animal, une recette (niveau 2)
  { id: 'tulipe', title: 'La tulipe', theme: 'nature', clair: true, steps: [
    ['💧', 'Elle arrose la graine.'], ['🌱', 'Une pousse sort.'], ['🌷', 'La tulipe fleurit.']] },
  { id: 'pommier', title: 'Le pommier', theme: 'nature', clair: true, steps: [
    ['🌸', 'Le pommier fleurit.'], ['🍏', 'Les pommes poussent.'], ['🍎 🧺', 'On cueille les pommes.']] },
  { id: 'carotte', title: 'La carotte', theme: 'nature', clair: true, steps: [
    ['🌱', 'La carotte pousse.'], ['🥕', 'On arrache la carotte.'], ['🐰 🥕', 'Le lapin la mange.']] },
  { id: 'chenille', title: 'La chenille', theme: 'nature', clair: true, steps: [
    ['🥚', 'Il y a un petit œuf.'], ['🐛', 'Une chenille sort.'], ['🦋', 'Le papillon s’envole.']] },
  { id: 'gateau', title: 'Le gâteau', theme: 'cuisine', clair: true, steps: [
    ['🥚', 'On casse les œufs.'], ['🥣', 'On mélange la pâte.'], ['🍰', 'On mange le gâteau.']] },
  { id: 'crepes', title: 'Les crêpes', theme: 'cuisine', clair: true, steps: [
    ['🥣', 'On prépare la pâte.'], ['🍳', 'On cuit la crêpe.'], ['🥞', 'On mange les crêpes.']] },
  { id: 'fromage', title: 'Le fromage', theme: 'cuisine', clair: true, steps: [
    ['🐄', 'La vache mange de l’herbe.'], ['🥛', 'Elle donne du lait.'], ['🧀', 'On fait du fromage.']] },
  { id: 'miel', title: 'Le miel', theme: 'cuisine', clair: true, steps: [
    ['🐝 🌸', 'L’abeille butine les fleurs.'], ['🍯', 'Elle fabrique du miel.'], ['🍞 🍯', 'On en met sur le pain.']] },

  // ---- 4 images
  { id: 'bonhomme', title: 'Le bonhomme de neige', theme: 'nature', clair: true, steps: [
    ['🌨️', 'Il neige.'], ['⛄', 'On fait un bonhomme.'], ['☀️', 'Le soleil brille.'], ['💧', 'Le bonhomme fond.']] },
  { id: 'poussin', title: 'Le poussin', theme: 'nature', clair: true, steps: [
    ['🐔 🥚', 'La poule pond un œuf.'], ['🐣', 'Le poussin sort de l’œuf.'], ['🐥', 'Le poussin grandit.'], ['🐓', 'Il devient un coq.']] },
  { id: 'graine', title: 'La graine', theme: 'nature', clair: true, steps: [
    ['🌰', 'Elle plante une graine.'], ['💧', 'Elle arrose la terre.'], ['🌱', 'Une pousse sort.'], ['🌻', 'Une fleur s’ouvre.']] },
  { id: 'velo', title: 'La chute à vélo', theme: 'vie', clair: true, steps: [
    ['🚲', 'Il fait du vélo.'], ['💥', 'Il tombe.'], ['🩹', 'Maman met un pansement.'], ['😊', 'Il sourit.']] },
  { id: 'ballon', title: 'Le ballon', theme: 'vie', clair: true, steps: [
    ['🎈', 'Il gonfle le ballon.'], ['🌵 🎈', 'Le ballon touche un cactus.'], ['💥', 'Le ballon éclate.'], ['😢', 'Il pleure.']] },
  { id: 'tomate', title: 'Les tomates', theme: 'nature', clair: false, steps: [
    ['🌱', 'On plante la tomate.'], ['🌼', 'La plante fleurit.'], ['🍅', 'Les tomates poussent.'], ['🥗', 'On fait une salade.']] },
  { id: 'lettre', title: 'La lettre', theme: 'vie', clair: false, steps: [
    ['✍️', 'Il écrit une lettre.'], ['✉️', 'Il colle le timbre.'], ['📮', 'Il la met à la poste.'], ['👵', 'Mamie lit la lettre.']] },
  { id: 'pain', title: 'Le pain', theme: 'cuisine', clair: false, steps: [
    ['🌾', 'Le blé pousse.'], ['🚜', 'On coupe le blé.'], ['🥖', 'Le boulanger fait le pain.'], ['🥪', 'On fait un sandwich.']] },
  { id: 'pluie', title: 'La pluie', theme: 'nature', clair: false, steps: [
    ['🌧️', 'Il pleut.'], ['☂️', 'Elle ouvre son parapluie.'], ['☀️', 'Le soleil revient.'], ['🌂', 'Elle ferme son parapluie.']] },
  { id: 'dent', title: 'La dent', theme: 'vie', clair: false, steps: [
    ['😬', 'Sa dent bouge.'], ['🦷', 'La dent tombe.'], ['🛏️', 'Il la met sous son oreiller.'], ['💰', 'Il trouve une pièce.']] },
  { id: 'courses', title: 'Les courses', theme: 'vie', clair: false, steps: [
    ['📝', 'Maman fait la liste.'], ['🛒', 'Elle remplit le chariot.'], ['💳', 'Elle paie à la caisse.'], ['🏠', 'Elle range à la maison.']] },
  { id: 'ecole', title: 'À l’école', theme: 'vie', clair: false, steps: [
    ['🎒', 'Il prépare son cartable.'], ['🏫', 'Il entre à l’école.'], ['✏️', 'Il travaille en classe.'], ['🏠', 'Il rentre à la maison.']] },
  { id: 'chateau', title: 'Le château de sable', theme: 'vie', clair: false, steps: [
    ['🏖️', 'Il arrive à la plage.'], ['🏰', 'Il fait un château.'], ['🌊', 'Une vague arrive.'], ['😢', 'Le château est cassé.']] },

  // ---- 5 images
  { id: 'anniversaire', title: 'Le gâteau d’anniversaire', theme: 'cuisine', clair: false, steps: [
    ['🥚', 'On casse les œufs.'], ['🥣', 'On mélange la pâte.'], ['⏲️', 'Le gâteau cuit.'], ['🎂', 'On met les bougies.'], ['🍰', 'On mange une part.']] },
  { id: 'tournesol', title: 'Le tournesol', theme: 'nature', clair: false, steps: [
    ['🌰', 'Elle plante une graine.'], ['💧', 'Elle arrose la terre.'], ['🌱', 'Une pousse sort.'], ['🌻', 'Une fleur s’ouvre.'], ['🐝', 'Une abeille butine.']] },
  { id: 'averse', title: 'L’averse', theme: 'nature', clair: false, steps: [
    ['☁️', 'Le ciel devient gris.'], ['🌧️', 'Il pleut.'], ['☂️', 'Elle ouvre son parapluie.'], ['☀️', 'Le soleil revient.'], ['🌂', 'Elle ferme son parapluie.']] },
  { id: 'facteur', title: 'La lettre à mamie', theme: 'vie', clair: false, steps: [
    ['✍️', 'Il écrit une lettre.'], ['✉️', 'Il colle le timbre.'], ['📮', 'Il la met à la poste.'], ['📬', 'La lettre arrive.'], ['👵', 'Mamie lit la lettre.']] },
  { id: 'petite-souris', title: 'La petite souris', theme: 'vie', clair: false, steps: [
    ['😬', 'Sa dent bouge.'], ['🦷', 'La dent tombe.'], ['🛏️', 'Il la met sous son oreiller.'], ['🐭', 'La petite souris passe.'], ['💰', 'Il trouve une pièce.']] },
  { id: 'cactus', title: 'Le ballon et le cactus', theme: 'vie', clair: false, steps: [
    ['🎈', 'Il gonfle le ballon.'], ['🧵', 'Il attache une ficelle.'], ['🌵 🎈', 'Le ballon touche un cactus.'], ['💥', 'Le ballon éclate.'], ['😢', 'Il pleure.']] },
  { id: 'neige', title: 'Un jour de neige', theme: 'nature', clair: false, steps: [
    ['🌨️', 'Il neige toute la nuit.'], ['🧤', 'Elle met ses gants.'], ['⛄', 'Elle fait un bonhomme.'], ['☀️', 'Le soleil brille.'], ['💧', 'Le bonhomme fond.']] },
  { id: 'pique-nique', title: 'Le pique-nique', theme: 'vie', clair: false, steps: [
    ['🧺', 'On prépare le panier.'], ['🚗', 'On part en voiture.'], ['🌳', 'On s’installe sous un arbre.'], ['🥪', 'On mange des sandwichs.'], ['🗑️', 'On ramasse les papiers.']] },
];

const ORDER = 'Remets les images dans l’ordre de l’histoire.';
const LISTEN = 'Écoute l’histoire, puis remets les images dans l’ordre.';
const BRAVO = 'Bravo, tu as remis l’histoire dans l’ordre !';
const START = 'Touche l’image du début de l’histoire.';
const END = 'Touche l’image de la fin de l’histoire.';
const BEFORE = 'Qu’est-ce qui s’est passé avant ?';
const NEXT = 'Qu’est-ce qui va se passer ensuite ?';

const emojiOf = (step) => step[0].replace(/ /g, '');
const sizeOf = (step) => step[0].split(' ').length;

/** Les histoires de n images (et, au besoin, d'un thème, ou claires sans les phrases). */
const storiesOf = (n, keep = () => true) => STORIES.filter((s) => s.steps.length === n && keep(s));

/**
 * Remettre les images dans l'ordre (interaction « ranger » : on touche les images dans l'ordre).
 * captions : la phrase est écrite sous l'image ; told : l'histoire est d'abord racontée.
 */
function orderQuestion(rng, story, { captions = false, told = false } = {}) {
  const n = story.steps.length;
  let order = shuffle(rng, story.steps.map((_, i) => i));
  if (order.every((v, i) => v === i)) order = [...order.slice(1), order[0]]; // jamais déjà rangées
  const sentences = story.steps.map(([, sentence]) => sentence);
  const instruction = told ? [LISTEN, ...sentences] : [ORDER];
  return {
    key: `ordre-histoire:${story.id}`,
    interaction: 'order',
    text: told ? LISTEN : ORDER,
    instruction,
    replay: instruction,
    stage: told ? { type: 'listen' } : { type: 'none' },
    items: order.map((i) => {
      const step = story.steps[i];
      // une scène de 2 emoji est un peu plus petite, pour tenir dans la case
      const scale = sizeOf(step) === 1 ? 1 : [0, 0, 0, 0.9, 0.72, 0.6][n];
      return { value: i, emoji: emojiOf(step), label: step[1], scale, ...(captions ? { caption: step[1] } : {}) };
    }),
    order: 'asc',
    sign: '→',
    choices: [],
    answer: sentences.join(' '),
    // une fois les images rangées, la voix raconte l'histoire dans l'ordre
    success: { speak: captions || told ? BRAVO : sentences },
  };
}

/** Un choix : l'image et sa phrase écrite dessous. */
const stepChoice = (step) => ({ value: step[1], label: step[1], emoji: emojiOf(step), caption: step[1], scale: sizeOf(step) === 1 ? 1 : 0.7 });

/** Niveau 6 : l'image du début ou de la fin, parmi 4 images de l'histoire. */
function endsQuestion(rng, story) {
  const n = story.steps.length;
  const start = rng() < 0.5;
  const answer = story.steps[start ? 0 : n - 1];
  // le début, la fin, et des images du milieu (4 images en tout)
  const middle = shuffle(rng, story.steps.slice(1, n - 1)).slice(0, 2);
  const shown = shuffle(rng, [story.steps[0], ...middle, story.steps[n - 1]]);
  const text = start ? START : END;
  return {
    key: `ordre-histoire:${story.id}`,
    text,
    instruction: [text],
    replay: [text],
    stage: { type: 'none' },
    choices: shown.map(stepChoice),
    choiceStyle: 'steps',
    answer: answer[1],
    success: { speak: answer[1] },
  };
}

/**
 * Niveaux 8 et 9 : une image de l'histoire ; ce qui s'est passé juste avant (les autres choix
 * viennent après), ou ce qui va se passer ensuite (les autres choix sont déjà passés).
 */
function neighbourQuestion(rng, story, before) {
  const n = story.steps.length;
  // avant : l'image k a une image avant elle et au moins 2 après ; ensuite : 2 avant, 1 après
  const ks = story.steps.map((_, k) => k).filter((k) => (before ? k >= 1 && k <= n - 3 : k >= 2 && k <= n - 2));
  const k = pick(rng, ks);
  const step = story.steps[k];
  const answer = story.steps[before ? k - 1 : k + 1];
  const others = before ? story.steps.slice(k + 1, k + 3) : story.steps.slice(k - 2, k);
  const question = before ? BEFORE : NEXT;
  return {
    key: `ordre-histoire:${story.id}`,
    text: `${step[1]} ${question}`,
    instruction: [step[1], question],
    replay: [step[1], question],
    stage: { type: 'picture', emoji: emojiOf(step) },
    choices: shuffle(rng, [answer, ...others]).map(stepChoice),
    choiceStyle: 'steps',
    answer: answer[1],
    success: { speak: answer[1] },
  };
}

const LONG = (s) => s.steps.length >= 4;

/** Les niveaux : de quoi tirer l'histoire, et la question posée. */
const LEVELS = [
  null,
  // 1 : 3 images de la vie de tous les jours
  (rng) => orderQuestion(rng, pick(rng, storiesOf(3, (s) => s.theme === 'vie'))),
  // 2 : 3 images d'une plante, d'un animal ou d'une recette
  (rng) => orderQuestion(rng, pick(rng, storiesOf(3, (s) => s.theme !== 'vie'))),
  // 3 : 4 images, sans phrases (des images claires)
  (rng) => orderQuestion(rng, pick(rng, storiesOf(4, (s) => s.clair))),
  // 4 : 4 images, l'histoire est racontée par la voix
  (rng) => orderQuestion(rng, pick(rng, storiesOf(4)), { told: true }),
  // 5 : 4 images, avec les phrases à lire
  (rng) => orderQuestion(rng, pick(rng, storiesOf(4)), { captions: true }),
  // 6 : le début ou la fin
  (rng) => endsQuestion(rng, pick(rng, STORIES.filter(LONG))),
  // 7 : 5 images, avec les phrases à lire
  (rng) => orderQuestion(rng, pick(rng, storiesOf(5)), { captions: true }),
  // 8 : ce qui s'est passé avant
  (rng) => neighbourQuestion(rng, pick(rng, STORIES.filter(LONG)), true),
  // 9 : ce qui va se passer ensuite
  (rng) => neighbourQuestion(rng, pick(rng, STORIES.filter(LONG)), false),
  // 10 : tout mélangé (niveaux 5 à 9)
  (rng, index) => LEVELS[5 + (index % 5)](rng),
];

export const ordreHistoire = {
  id: 'ordre-histoire',
  domain: 'histoires',
  section: 'Comprendre une histoire',
  title: 'Dans l’ordre',
  icon: '🎞️',
  skill: 'Comprendre la chronologie d’une histoire : remettre les images dans l’ordre, le début, la fin, avant, après',
  levels: [
    'La vie de tous les jours', 'Plantes et recettes', '4 images', 'L’histoire racontée', '4 images à lire',
    'Le début ou la fin', '5 images à lire', 'Que s’est-il passé avant ?', 'Et ensuite ?', 'Tout mélangé',
  ],
  generate(level, rng, index = 0) {
    return LEVELS[Math.min(Math.max(level, 1), LEVELS.length - 1)](rng, index);
  },
};

export const COMPRENDRE_GAMES = [ordreHistoire];
export const ORDER_STORIES = STORIES;
