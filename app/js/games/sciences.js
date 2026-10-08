// « Le vivant » et « La matière » (explorer le monde au cycle 1, questionner le monde au cycle 2) :
// le corps, les sens, les cycles de vie, la santé ; l'eau, flotter et couler, l'aimant, les matériaux.
// Chaque réponse a été vérifiée : on évite les objets ambigus (une clé peut être en laiton, une
// cuillère en inox, une pièce de 1 € en cuivre-nickel : jamais proposées pour l'aimant).

import { pick, sample, shuffle } from '../random.js';

const capitalize = (text) => `${text[0].toUpperCase()}${text.slice(1)}`;
/** « en bois, en métal ou en verre » : les réponses lues à voix haute. */
const spokenList = (labels) => (labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(', ')} ou ${labels.at(-1)}`);
const textChoices = (values) => values.map((v) => ({ value: v, label: v }));
/** Des images à toucher : l'emoji, et son nom pour les lecteurs d'écran. */
const pictureChoices = (items) => items.map((it) => ({ value: it.name, label: it.emoji, name: it.name }));

/** Une question à deux réponses toujours dans le même ordre (« vrai ou faux », « solide ou liquide »). */
function twoWay({ key, text, instruction = text, emoji, options, answer, success, style = 'words' }) {
  return {
    key,
    text,
    instruction,
    stage: emoji ? { type: 'picture', emoji } : { type: 'none' },
    choices: textChoices(options),
    choiceStyle: style,
    answer,
    success: { speak: success },
  };
}

/** Une image à trouver parmi trois : la bonne, et deux autres d'une autre famille. */
function pictureQuestion({ key, text, instruction = text, emoji, answer, others, success, rng }) {
  const options = shuffle(rng, [answer, ...others]);
  return {
    key,
    text,
    instruction,
    stage: emoji ? { type: 'picture', emoji } : { type: 'none' },
    choices: pictureChoices(options),
    choiceStyle: 'pictures',
    answer: answer.name,
    success: { speak: success },
  };
}

// ================================================================= Le vivant

// ---------------------------------------------------------------- 1. Les parties du corps

export const BODY = [
  { emoji: '👃', name: 'le nez' }, { emoji: '👂', name: 'l’oreille' }, { emoji: '👁️', name: 'l’œil' },
  { emoji: '👄', name: 'la bouche', group: 'bouche' }, { emoji: '👅', name: 'la langue', group: 'bouche' },
  { emoji: '🦷', name: 'la dent', group: 'bouche' }, { emoji: '✋', name: 'la main' }, { emoji: '🦶', name: 'le pied' },
  { emoji: '🦵', name: 'la jambe' }, { emoji: '💪', name: 'le bras' },
];

function bodyParts(rng) {
  const part = pick(rng, BODY);
  // la bouche, la langue et les dents vont ensemble : jamais deux d'entre elles parmi les choix
  const others = sample(rng, BODY.filter((p) => p !== part && (!part.group || p.group !== part.group)), 2);
  if (others[0].group && others[0].group === others[1].group) others[1] = pick(rng, BODY.filter((p) => !p.group && p !== part && p !== others[0]));
  return pictureQuestion({
    key: `vivant:corps:${part.name}`,
    text: `Touche ${part.name}.`,
    answer: part,
    others,
    success: `Oui, c’est ${part.name} !`,
    rng,
  });
}

// ---------------------------------------------------------------- 2. Les cinq sens

export const SENSES = [
  {
    emoji: '👀', name: 'les yeux', ask: 'Avec quoi vois-tu ?', says: 'Avec les yeux : c’est la vue.',
    uses: [['🌈', 'Pour regarder l’arc-en-ciel, tu utilises…'], ['📖', 'Pour regarder les images du livre, tu utilises…']],
  },
  {
    emoji: '👂', name: 'les oreilles', ask: 'Avec quoi entends-tu ?', says: 'Avec les oreilles : c’est l’ouïe.',
    uses: [['🎵', 'Pour écouter la musique, tu utilises…'], ['🔔', 'Pour entendre la cloche, tu utilises…']],
  },
  {
    emoji: '👃', name: 'le nez', ask: 'Avec quoi sens-tu les odeurs ?', says: 'Avec le nez : c’est l’odorat.',
    uses: [['🌹', 'Pour sentir le parfum de la rose, tu utilises…'], ['🍰', 'Pour sentir l’odeur du gâteau, tu utilises…']],
  },
  {
    emoji: '👅', name: 'la langue', ask: 'Avec quoi goûtes-tu ?', says: 'Avec la langue : c’est le goût.',
    uses: [['🍋', 'Pour savoir si le citron est acide, tu utilises…'], ['🍯', 'Pour goûter le miel, tu utilises…']],
  },
  {
    emoji: '✋', name: 'les mains', ask: 'Avec quoi touches-tu ?', says: 'Avec les mains et toute la peau : c’est le toucher.',
    uses: [['🧸', 'Pour savoir si la peluche est douce, tu utilises…'], ['🧊', 'Pour savoir si le glaçon est froid, tu utilises…']],
  },
];

function senses(rng) {
  const sense = pick(rng, SENSES);
  const others = sample(rng, SENSES.filter((s) => s !== sense), 2);
  // une fois sur deux, une situation (la musique, la rose…) au lieu de la question directe
  const use = rng() < 0.5 ? pick(rng, sense.uses) : null;
  return pictureQuestion({
    key: `vivant:sens:${use ? use[1] : sense.ask}`,
    text: use ? use[1] : sense.ask,
    emoji: use?.[0],
    answer: sense,
    others,
    success: sense.says,
    rng,
  });
}

// ---------------------------------------------------------------- 3. Vivant ou pas vivant ?

export const LIVING = [
  { emoji: '🐱', name: 'le chat' }, { emoji: '🌳', name: 'l’arbre' }, { emoji: '🌻', name: 'la fleur' },
  { emoji: '🐟', name: 'le poisson' }, { emoji: '🐌', name: 'l’escargot' }, { emoji: '🍄', name: 'le champignon' },
  { emoji: '🐦', name: 'l’oiseau' }, { emoji: '🐞', name: 'la coccinelle' }, { emoji: '👶', name: 'le bébé' },
  { emoji: '🐜', name: 'la fourmi' }, { emoji: '🌵', name: 'le cactus' }, { emoji: '🦋', name: 'le papillon' },
];
export const NOT_LIVING = [
  { emoji: '🪨', name: 'le caillou' }, { emoji: '🚗', name: 'la voiture' }, { emoji: '🧸', name: 'la peluche' },
  { emoji: '⚽', name: 'le ballon' }, { emoji: '🤖', name: 'le robot' }, { emoji: '🪑', name: 'la chaise' },
  { emoji: '⏰', name: 'le réveil' }, { emoji: '✏️', name: 'le crayon' }, { emoji: '🚂', name: 'le train' },
  { emoji: '⌚', name: 'la montre' },
];

function livingOrNot(rng) {
  const alive = rng() < 0.5;
  const item = pick(rng, alive ? LIVING : NOT_LIVING);
  return twoWay({
    key: `vivant:vivant:${item.name}`,
    text: `${capitalize(item.name)}, c’est vivant ou pas vivant ?`,
    emoji: item.emoji,
    options: ['vivant', 'pas vivant'],
    answer: alive ? 'vivant' : 'pas vivant',
    success: alive
      ? 'Oui, c’est vivant : ça naît, ça se nourrit et ça grandit.'
      : 'Oui, ce n’est pas vivant : ça ne se nourrit pas et ça ne grandit pas.',
  });
}

// ---------------------------------------------------------------- 4. Le cycle de vie : ce qui vient après

// Chaque étape et ce qu'elle devient. Les autres images proposées viennent toujours d'un autre
// cycle : « Que devient la graine ? » ne propose jamais l'arbre à côté de la pousse.
export const GROWTH = [
  { cycle: 'arbre', from: 'la graine', emoji: '🌰', to: { emoji: '🌱', name: 'la pousse' }, says: 'La graine germe : elle devient une petite pousse.' },
  { cycle: 'poule', from: 'l’œuf de la poule', emoji: '🥚', to: { emoji: '🐥', name: 'le poussin' }, says: 'Le poussin sort de l’œuf.' },
  { cycle: 'poule', from: 'le poussin', emoji: '🐥', to: { emoji: '🐔', name: 'la poule' }, says: 'Le poussin grandit : il devient une poule ou un coq.' },
  { cycle: 'papillon', from: 'la chenille', emoji: '🐛', to: { emoji: '🦋', name: 'le papillon' }, says: 'La chenille fait une chrysalide, puis elle devient un papillon.' },
  { cycle: 'grenouille', from: 'le têtard', to: { emoji: '🐸', name: 'la grenouille' }, says: 'Le têtard perd sa queue et devient une grenouille.' },
  { cycle: 'humain', from: 'le bébé', emoji: '👶', to: { emoji: '🧒', name: 'l’enfant' }, says: 'Le bébé grandit : il devient un enfant.' },
  { cycle: 'humain', from: 'l’enfant', emoji: '🧒', to: { emoji: '🧑', name: 'l’adulte' }, says: 'L’enfant grandit : il devient un adulte.' },
  { cycle: 'pommier', from: 'la fleur du pommier', emoji: '🌸', to: { emoji: '🍎', name: 'la pomme' }, says: 'La fleur du pommier devient une pomme.' },
];

function growth(rng) {
  const step = pick(rng, GROWTH);
  const pool = [...new Map(GROWTH.filter((g) => g.cycle !== step.cycle).map((g) => [g.to.name, g.to])).values()];
  return pictureQuestion({
    key: `vivant:devient:${step.from}`,
    text: `Que devient ${step.from} ?`,
    emoji: step.emoji,
    answer: step.to,
    others: sample(rng, pool, 2),
    success: step.says,
    rng,
  });
}

// ---------------------------------------------------------------- 5. Le cycle de vie dans l'ordre

export const CYCLES = [
  { title: 'La vie de la poule.', steps: [['🥚', 'l’œuf'], ['🐣', 'le poussin qui sort de l’œuf'], ['🐔', 'la poule']], says: 'L’œuf, le poussin, puis la poule.' },
  { title: 'La vie du papillon.', steps: [['🥚', 'l’œuf'], ['🐛', 'la chenille'], ['🦋', 'le papillon']], says: 'L’œuf, la chenille, la chrysalide, puis le papillon.' },
  { title: 'La vie de l’arbre.', steps: [['🌰', 'la graine'], ['🌱', 'la pousse'], ['🌳', 'l’arbre']], says: 'La graine, la pousse, puis l’arbre.' },
  { title: 'La vie du pommier.', steps: [['🌱', 'la pousse'], ['🌳', 'le pommier'], ['🌸', 'la fleur'], ['🍎', 'la pomme']], says: 'La pousse, le pommier, la fleur, puis la pomme.' },
  { title: 'La vie d’un être humain.', steps: [['👶', 'le bébé'], ['🧒', 'l’enfant'], ['🧑', 'l’adulte'], ['🧓', 'la personne âgée']], says: 'Le bébé, l’enfant, l’adulte, puis la personne âgée.' },
];

function cycleOrder(rng) {
  const cycle = pick(rng, CYCLES);
  let order = shuffle(rng, cycle.steps.map((_, i) => i));
  if (order.every((v, i) => v === i)) order = [...order.slice(1), order[0]]; // jamais déjà rangé
  const ask = 'Touche les images dans l’ordre.';
  return {
    key: `vivant:cycle:${cycle.title}:${order.join('')}`,
    interaction: 'order',
    text: `${cycle.title} ${ask}`,
    instruction: [cycle.title, ask],
    stage: { type: 'none' },
    items: order.map((i) => ({ value: i, emoji: cycle.steps[i][0], label: cycle.steps[i][1] })),
    order: 'asc',
    choices: [],
    answer: null,
    success: { speak: cycle.says },
  };
}

// ---------------------------------------------------------------- 6. Les besoins des plantes

const PLANT_NEEDS = [{ emoji: '💧', name: 'd’eau' }, { emoji: '☀️', name: 'de lumière' }];
const NOT_NEEDED = [{ emoji: '🍫', name: 'de chocolat' }, { emoji: '🧸', name: 'de jouets' }, { emoji: '📺', name: 'de télé' }, { emoji: '🍬', name: 'de bonbons' }];
export const PLANT_CASES = [
  { text: 'Cette plante a de l’eau et de la lumière.', grows: true },
  { text: 'Cette plante est près de la fenêtre et on l’arrose.', grows: true },
  { text: 'On n’arrose jamais cette plante.', grows: false, why: 'Sans eau, la plante se fane.' },
  { text: 'Cette plante est dans un placard tout noir.', grows: false, why: 'Sans lumière, la plante jaunit et pousse mal.' },
];

function plantNeeds(rng) {
  if (rng() < 0.5) {
    const need = pick(rng, PLANT_NEEDS);
    const options = shuffle(rng, [need, ...sample(rng, NOT_NEEDED, 2)]);
    const text = 'De quoi une plante a-t-elle besoin pour pousser ?';
    return {
      key: `vivant:plante:${options.map((o) => o.name).join(',')}`,
      text,
      instruction: text,
      stage: { type: 'picture', emoji: '🪴' },
      choices: options.map((o) => ({ value: o.name, label: `${o.emoji} ${o.name}` })),
      choiceStyle: 'answers',
      answer: need.name,
      success: { speak: 'Oui, une plante a besoin d’eau et de lumière pour pousser.' },
    };
  }
  const item = pick(rng, PLANT_CASES);
  const ask = 'Va-t-elle bien pousser ?';
  return twoWay({
    key: `vivant:plante:${item.text}`,
    text: `${item.text} ${ask}`,
    instruction: [item.text, ask],
    emoji: '🪴',
    options: ['oui', 'non'],
    answer: item.grows ? 'oui' : 'non',
    success: item.grows ? 'Oui : avec de l’eau et de la lumière, la plante pousse bien.' : `Non. ${item.why}`,
  });
}

// ---------------------------------------------------------------- 7 et 8. Vrai ou faux : l'hygiène, le sommeil

export const HYGIENE = [
  { emoji: '🪥', text: 'On se brosse les dents matin et soir.', answer: 'vrai', why: 'On les brosse pendant deux minutes.' },
  { emoji: '🪥', text: 'On se brosse les dents une fois par semaine.', answer: 'faux', why: 'On se brosse les dents matin et soir.' },
  { emoji: '🧼', text: 'On se lave les mains avant de manger.', answer: 'vrai', why: 'Le savon enlève les microbes.' },
  { emoji: '🧼', text: 'Après les toilettes, on se lave les mains.', answer: 'vrai', why: 'Le savon enlève les microbes.' },
  { emoji: '🧼', text: 'Se laver les mains ne sert à rien.', answer: 'faux', why: 'Le savon enlève les microbes.' },
  { emoji: '🍬', text: 'Les bonbons sont bons pour les dents.', answer: 'faux', why: 'Le sucre abîme les dents.' },
  { emoji: '🪥', text: 'On peut prêter sa brosse à dents.', answer: 'faux', why: 'Chacun a sa brosse à dents.' },
  { emoji: '🦷', text: 'Le dentiste soigne les dents.', answer: 'vrai', why: 'On va le voir pour vérifier ses dents.' },
  { emoji: '🦷', text: 'Les dents de lait tombent, puis d’autres dents poussent.', answer: 'vrai', why: 'Les nouvelles dents doivent durer toute la vie.' },
  { emoji: '🤧', text: 'Quand on tousse, on met son coude devant sa bouche.', answer: 'vrai', why: 'Comme ça, on ne donne pas ses microbes.' },
  { emoji: '🤧', text: 'On se mouche dans un mouchoir, puis on le jette.', answer: 'vrai', why: 'Comme ça, on ne donne pas ses microbes.' },
];
export const SLEEP = [
  { emoji: '😴', text: 'Pendant le sommeil, le corps se repose et grandit.', answer: 'vrai', why: 'Bien dormir aide aussi à apprendre.' },
  { emoji: '🛏️', text: 'Un enfant a besoin de dormir environ dix heures par nuit.', answer: 'vrai', why: 'Les enfants ont besoin de beaucoup de sommeil.' },
  { emoji: '📱', text: 'Regarder un écran aide à s’endormir.', answer: 'faux', why: 'Les écrans gênent le sommeil.' },
  { emoji: '🥱', text: 'Quand on est très fatigué, on apprend mieux.', answer: 'faux', why: 'Bien dormir aide à apprendre.' },
  { emoji: '⚽', text: 'Bouger et jouer dehors, c’est bon pour la santé.', answer: 'vrai', why: 'Bouger rend le cœur et les muscles plus forts.' },
  { emoji: '💧', text: 'L’eau est la meilleure boisson pour le corps.', answer: 'vrai', why: 'On peut en boire quand on a soif, toute la journée.' },
  { emoji: '🥣', text: 'Le petit-déjeuner donne de l’énergie pour la matinée.', answer: 'vrai', why: 'Il aide à bien commencer la journée.' },
];

const TRUE_FALSE = ['vrai', 'faux'];

function trueOrFalse(rng, list, topic) {
  const item = pick(rng, list);
  return twoWay({
    key: `vivant:${topic}:${item.text}`,
    text: `${item.text} Vrai ou faux ?`,
    instruction: [item.text, 'Vrai ou faux ?'],
    emoji: item.emoji,
    options: TRUE_FALSE,
    answer: item.answer,
    success: [item.answer === 'vrai' ? 'C’est vrai !' : 'C’est faux !', item.why],
  });
}

// Ce qui aide à bien dormir, ce qui est bon pour la santé (une seule bonne réponse sur trois).
export const HEALTH_CHOICES = [
  {
    ask: 'Qu’est-ce qui aide à bien dormir ?',
    good: [{ emoji: '📖', name: 'une histoire' }, { emoji: '🤫', name: 'le calme' }],
    bad: [{ emoji: '📱', name: 'un écran' }, { emoji: '🥤', name: 'un soda' }, { emoji: '🎮', name: 'un jeu vidéo' }, { emoji: '🔊', name: 'du bruit' }],
    says: 'Oui : le soir, le calme aide à bien dormir.',
  },
  {
    ask: 'Qu’est-ce qui est bon pour la santé ?',
    good: [{ emoji: '🚲', name: 'faire du vélo' }, { emoji: '⚽', name: 'jouer dehors' }, { emoji: '💧', name: 'boire de l’eau' }, { emoji: '🍎', name: 'manger un fruit' }],
    bad: [{ emoji: '🍬', name: 'trop de bonbons' }, { emoji: '📺', name: 'trop de télé' }, { emoji: '🥤', name: 'trop de soda' }],
    says: 'Oui, c’est bon pour la santé !',
  },
];

function sleepHealth(rng) {
  if (rng() < 0.5) return trueOrFalse(rng, SLEEP, 'sommeil');
  const topic = pick(rng, HEALTH_CHOICES);
  const good = pick(rng, topic.good);
  const options = shuffle(rng, [good, ...sample(rng, topic.bad, 2)]);
  return {
    key: `vivant:sante:${good.name}:${options.map((o) => o.name).join(',')}`,
    text: topic.ask,
    instruction: topic.ask,
    stage: { type: 'none' },
    choices: options.map((o) => ({ value: o.name, label: `${o.emoji} ${o.name}` })),
    choiceStyle: 'answers',
    answer: good.name,
    success: { speak: topic.says },
  };
}

// ---------------------------------------------------------------- 9. Bien manger : les familles d'aliments

// La phrase dite après la bonne réponse est écrite pour chaque aliment (« La carotte est un légume. »).
// La pomme de terre est un féculent (et non un légume) dans les repères nutritionnels.
export const FOOD_FAMILIES = {
  fruits: {
    touch: 'Touche un fruit ou un légume.',
    foods: [
      ['🍎', 'la pomme', 'La pomme est un fruit.'], ['🍌', 'la banane', 'La banane est un fruit.'],
      ['🍐', 'la poire', 'La poire est un fruit.'], ['🍓', 'la fraise', 'La fraise est un fruit.'],
      ['🥕', 'la carotte', 'La carotte est un légume.'], ['🥦', 'le brocoli', 'Le brocoli est un légume.'],
    ],
  },
  feculents: {
    touch: 'Touche un féculent.',
    foods: [
      ['🍞', 'le pain', 'Le pain est un féculent.'], ['🍝', 'les pâtes', 'Les pâtes sont des féculents.'],
      ['🍚', 'le riz', 'Le riz est un féculent.'], ['🥔', 'la pomme de terre', 'La pomme de terre est un féculent.'],
    ],
  },
  laitiers: {
    touch: 'Touche un produit laitier.',
    foods: [['🥛', 'le lait', 'Le lait est un produit laitier.'], ['🧀', 'le fromage', 'Le fromage est un produit laitier.']],
  },
  proteines: {
    touch: 'Touche une viande, un poisson ou un œuf.',
    foods: [
      ['🍗', 'le poulet', 'Le poulet est une viande.'], ['🥩', 'la viande', 'Oui, c’est de la viande.'],
      ['🐟', 'le poisson', 'Oui, c’est un poisson.'], ['🥚', 'l’œuf', 'Oui, c’est un œuf.'],
    ],
  },
  sucres: {
    touch: 'Touche un produit sucré.', more: 'On en mange un peu, pas trop souvent.',
    foods: [
      ['🍬', 'le bonbon', 'Le bonbon est un produit sucré.'], ['🍫', 'le chocolat', 'Le chocolat est un produit sucré.'],
      ['🍰', 'le gâteau', 'Le gâteau est un produit sucré.'], ['🍭', 'la sucette', 'La sucette est un produit sucré.'],
    ],
  },
};
const foodOf = ([emoji, name, says]) => ({ emoji, name, says });

function foodFamilies(rng) {
  const ids = Object.keys(FOOD_FAMILIES);
  const id = pick(rng, ids);
  const family = FOOD_FAMILIES[id];
  const food = foodOf(pick(rng, family.foods));
  // deux aliments de deux autres familles
  const others = sample(rng, ids.filter((f) => f !== id), 2).map((f) => foodOf(pick(rng, FOOD_FAMILIES[f].foods)));
  return pictureQuestion({
    key: `vivant:aliments:${id}:${food.name}`,
    text: family.touch,
    answer: food,
    others,
    success: [food.says, family.more].filter(Boolean),
    rng,
  });
}

// ---------------------------------------------------------------- Le jeu

const VIVANT_LEVELS = [
  bodyParts, senses, livingOrNot, growth, cycleOrder, plantNeeds,
  (rng) => trueOrFalse(rng, HYGIENE, 'hygiene'), sleepHealth, foodFamilies,
];

export const vivant = {
  id: 'vivant',
  domain: 'monde',
  title: 'Le vivant',
  icon: '🌱',
  skill: 'Découvrir le vivant : le corps, les sens, les cycles de vie, la santé',
  levels: [
    'Les parties du corps', 'Les cinq sens', 'Vivant ou pas vivant ?', 'Le cycle de vie', 'Le cycle dans l’ordre',
    'Les besoins des plantes', 'L’hygiène et les dents', 'Le sommeil et la santé', 'Bien manger', 'Tout le vivant',
  ],
  generate(level, rng) {
    // niveau 10 : un peu de tout (sauf les parties du corps, trop faciles)
    const make = level >= 10 ? pick(rng, VIVANT_LEVELS.slice(1)) : VIVANT_LEVELS[level - 1];
    return make(rng);
  },
};

// ================================================================= La matière

// ---------------------------------------------------------------- 1. Solide ou liquide ?

export const SOLIDS = [
  { emoji: '🪨', name: 'le caillou' }, { emoji: '🧊', name: 'le glaçon' }, { emoji: '🔑', name: 'la clé' },
  { emoji: '🧱', name: 'la brique' }, { emoji: '✏️', name: 'le crayon' }, { emoji: '🥄', name: 'la cuillère' },
  { emoji: '🪵', name: 'la bûche' }, { emoji: '🍎', name: 'la pomme' },
];
export const LIQUIDS = [
  { emoji: '💧', name: 'l’eau' }, { emoji: '🥛', name: 'le lait' }, { emoji: '🍵', name: 'le thé' },
  { emoji: '🌧️', name: 'la pluie' }, { emoji: '🌊', name: 'la mer' },
];

function solidOrLiquid(rng) {
  const solid = rng() < 0.5;
  const item = pick(rng, solid ? SOLIDS : LIQUIDS);
  return twoWay({
    key: `matiere:etat:${item.name}`,
    text: `${capitalize(item.name)}, c’est solide ou liquide ?`,
    emoji: item.emoji,
    options: ['solide', 'liquide'],
    answer: solid ? 'solide' : 'liquide',
    success: solid ? 'Oui, c’est solide : ça garde sa forme.' : 'Oui, c’est liquide : ça coule et ça prend la forme du récipient.',
  });
}

// ---------------------------------------------------------------- 2 et 3. Glace, eau liquide ou vapeur

const WATER = ['de la glace', 'de l’eau liquide', 'de la vapeur'];
const WATER_SPOKEN = `${capitalize(spokenList(WATER))} ?`;
const [ICE, LIQUID, VAPOUR] = WATER;
// La vapeur d'eau est un gaz invisible : la buée et les nuages sont faits de gouttelettes (jamais
// présentés comme de la vapeur).
export const WATER_FORMS = [
  { emoji: '🧊', text: 'Le glaçon, c’est…', answer: ICE, says: 'Le glaçon, c’est de l’eau solide : de la glace.' },
  { emoji: '☃️', text: 'La neige, c’est…', answer: ICE, says: 'La neige, c’est de la glace en petits flocons.' },
  { emoji: '⛸️', text: 'Sur la patinoire, on glisse sur…', answer: ICE, says: 'La patinoire, c’est de l’eau gelée : de la glace.' },
  { emoji: '🌧️', text: 'La pluie, c’est…', answer: LIQUID, says: 'La pluie, c’est de l’eau liquide.' },
  { emoji: '🌊', text: 'La mer, c’est…', answer: LIQUID, says: 'La mer, c’est de l’eau liquide.' },
  { emoji: '🚿', text: 'Dans la douche, il coule…', answer: LIQUID, says: 'Dans la douche, il coule de l’eau liquide.' },
  { emoji: '♨️', text: 'Quand l’eau bout, elle devient…', answer: VAPOUR, says: 'L’eau devient de la vapeur : un gaz invisible.' },
  { emoji: '👕', text: 'Le linge sèche : son eau devient…', answer: VAPOUR, says: 'L’eau devient de la vapeur : un gaz invisible.' },
];
export const CHANGES = [
  { emoji: '☀️', text: 'On laisse un glaçon au soleil. Il devient…', answer: LIQUID, says: 'Il fond : la glace devient de l’eau liquide.' },
  { emoji: '☀️', text: 'Le soleil chauffe la neige. Elle devient…', answer: LIQUID, says: 'Elle fond : la glace devient de l’eau liquide.' },
  { emoji: '❄️', text: 'On met de l’eau au congélateur. Elle devient…', answer: ICE, says: 'Elle gèle : l’eau devient de la glace.' },
  { emoji: '❄️', text: 'En hiver, il gèle. L’eau de la mare devient…', answer: ICE, says: 'Elle gèle : l’eau devient de la glace.' },
  { emoji: '🔥', text: 'On fait bouillir de l’eau. Elle devient…', answer: VAPOUR, says: 'L’eau devient de la vapeur : un gaz invisible.' },
  { emoji: '☀️', text: 'Le soleil sèche la flaque. Son eau devient…', answer: VAPOUR, says: 'L’eau devient de la vapeur : un gaz invisible.' },
];
export const HEAT = [
  { emoji: '🧊', text: 'Pour faire fondre un glaçon, il faut…', answer: 'chauffer' },
  { emoji: '🍫', text: 'Pour faire fondre du chocolat, il faut…', answer: 'chauffer' },
  { emoji: '🧈', text: 'Pour faire fondre du beurre, il faut…', answer: 'chauffer' },
  { emoji: '💧', text: 'Pour fabriquer des glaçons, il faut…', answer: 'refroidir' },
  { emoji: '🍊', text: 'Pour faire geler du jus d’orange, il faut…', answer: 'refroidir' },
];
const HEAT_LABELS = { chauffer: '🔥 chauffer', refroidir: '❄️ refroidir' };

function waterQuestion(item, kind) {
  return {
    key: `matiere:${kind}:${item.text}`,
    text: item.text,
    instruction: [item.text, WATER_SPOKEN],
    stage: { type: 'picture', emoji: item.emoji },
    choices: textChoices(WATER),
    choiceStyle: 'answers',
    answer: item.answer,
    success: { speak: item.says },
  };
}

function heatOrCool(rng) {
  if (rng() < 0.5) return waterQuestion(pick(rng, CHANGES), 'changer');
  const item = pick(rng, HEAT);
  return {
    key: `matiere:chauffer:${item.text}`,
    text: item.text,
    instruction: [item.text, 'Chauffer ou refroidir ?'],
    stage: { type: 'picture', emoji: item.emoji },
    choices: ['chauffer', 'refroidir'].map((v) => ({ value: v, label: HEAT_LABELS[v] })),
    choiceStyle: 'words',
    answer: item.answer,
    success: { speak: `Oui, il faut ${item.answer}.` },
  };
}

// ---------------------------------------------------------------- 4. Flotte ou coule ?

export const FLOATS = [
  { emoji: '🍎', name: 'la pomme', fact: 'La pomme contient un peu d’air.' },
  { emoji: '🧊', name: 'le glaçon', fact: 'La glace est plus légère que l’eau.' },
  { emoji: '⚽', name: 'le ballon' }, { emoji: '🪵', name: 'la bûche' }, { emoji: '🍂', name: 'la feuille morte' },
  { emoji: '🪶', name: 'la plume' }, { emoji: '⛵', name: 'le bateau' }, { emoji: '🦆', name: 'le canard' },
];
export const SINKS = [
  { emoji: '🔑', name: 'la clé' }, { emoji: '🪨', name: 'le caillou' }, { emoji: '🪙', name: 'la pièce' },
  { emoji: '⚓', name: 'l’ancre' }, { emoji: '🔩', name: 'le boulon' }, { emoji: '🥄', name: 'la cuillère en métal' },
  { emoji: '💍', name: 'la bague' },
];

function floatOrSink(rng) {
  const floats = rng() < 0.5;
  const item = pick(rng, floats ? FLOATS : SINKS);
  return twoWay({
    key: `matiere:flotte:${item.name}`,
    text: `Dans l’eau, ${item.name} flotte ou coule ?`,
    emoji: item.emoji,
    options: ['flotte', 'coule'],
    answer: floats ? 'flotte' : 'coule',
    success: [floats ? 'Oui, ça flotte !' : 'Oui, ça coule !', item.fact].filter(Boolean),
  });
}

// ---------------------------------------------------------------- 5. Attiré par l'aimant ?

// Des objets en fer ou en acier, sans doute possible (pas de clé, de cuillère ni de pièce).
export const MAGNETIC = [
  { emoji: '📎', name: 'le trombone' }, { emoji: '🧷', name: 'l’épingle de nourrice' }, { emoji: '🪡', name: 'l’aiguille' }, { emoji: '🥫', name: 'la boîte de conserve' },
];
export const NOT_MAGNETIC = [
  { emoji: '🪵', name: 'la bûche' }, { emoji: '🧸', name: 'la peluche' }, { emoji: '🧦', name: 'la chaussette' },
  { emoji: '📄', name: 'la feuille de papier' }, { emoji: '🎈', name: 'le ballon' }, { emoji: '🍎', name: 'la pomme' },
  { emoji: '🪶', name: 'la plume' }, { emoji: '🧽', name: 'l’éponge' },
];

function magnet(rng) {
  const attracted = rng() < 0.5;
  const item = pick(rng, attracted ? MAGNETIC : NOT_MAGNETIC);
  return twoWay({
    key: `matiere:aimant:${item.name}`,
    text: `L’aimant attire-t-il ${item.name} ?`,
    emoji: item.emoji,
    options: ['oui', 'non'],
    answer: attracted ? 'oui' : 'non',
    success: attracted ? 'Oui : l’aimant attire le fer et l’acier.' : 'Non : cet objet n’est ni en fer ni en acier.',
  });
}

// ---------------------------------------------------------------- 6. De quoi est fait l'objet ?

export const MATERIALS = ['bois', 'métal', 'plastique', 'verre'];
export const OBJECTS = [
  { emoji: '🪵', name: 'la bûche', material: 'bois' }, { emoji: '🎻', name: 'le violon', material: 'bois' },
  { emoji: '🪆', name: 'la poupée russe', material: 'bois' },
  { emoji: '🔑', name: 'la clé', material: 'métal' }, { emoji: '🪙', name: 'la pièce', material: 'métal' },
  { emoji: '⚓', name: 'l’ancre', material: 'métal' },
  { emoji: '🔔', name: 'la cloche', material: 'métal' },
  { emoji: '🪥', name: 'la brosse à dents', material: 'plastique' }, { emoji: '🎮', name: 'la manette', material: 'plastique' },
  { emoji: '🧴', name: 'le flacon', material: 'plastique' },
  { emoji: '🪟', name: 'la vitre', material: 'verre' }, { emoji: '🫙', name: 'le bocal', material: 'verre' },
  { emoji: '🪞', name: 'le miroir', material: 'verre' },
];

function materials(rng) {
  const item = pick(rng, OBJECTS);
  // trois matières dans l'ordre habituel (bois, métal, plastique, verre) : la phrase lue reste la même
  const others = sample(rng, MATERIALS.filter((m) => m !== item.material), 2);
  const options = MATERIALS.filter((m) => m === item.material || others.includes(m));
  const text = `${capitalize(item.name)} est en quelle matière ?`;
  return {
    key: `matiere:matiere:${item.name}:${options.join(',')}`,
    text,
    instruction: [text, `${capitalize(spokenList(options.map((m) => `en ${m}`)))} ?`],
    stage: { type: 'picture', emoji: item.emoji },
    choices: textChoices(options),
    choiceStyle: 'words',
    answer: item.material,
    success: { speak: `Oui, c’est en ${item.material}.` },
  };
}

// ---------------------------------------------------------------- 7. Transparent ou opaque ?

export const TRANSPARENT = [
  { emoji: '🪟', name: 'la vitre' }, { emoji: '💧', name: 'l’eau' }, { emoji: '👓', name: 'les verres de lunettes' },
  { emoji: '🔍', name: 'la loupe' },
];
// Le miroir est opaque : on s'y voit, mais on ne voit pas à travers.
export const OPAQUE = [
  { emoji: '🧱', name: 'la brique' }, { emoji: '📕', name: 'le livre' }, { emoji: '🚪', name: 'la porte' },
  { emoji: '📦', name: 'le carton' }, { emoji: '🪵', name: 'la bûche' }, { emoji: '🪨', name: 'le caillou' },
  { emoji: '🧸', name: 'la peluche' }, { emoji: '🪞', name: 'le miroir' },
];

function transparency(rng) {
  const clear = rng() < 0.5;
  const item = pick(rng, clear ? TRANSPARENT : OPAQUE);
  return twoWay({
    key: `matiere:lumiere:${item.name}`,
    text: `${capitalize(item.name)}, c’est transparent ou opaque ?`,
    emoji: item.emoji,
    options: ['transparent', 'opaque'],
    answer: clear ? 'transparent' : 'opaque',
    success: clear ? 'Oui, c’est transparent : on voit à travers.' : 'Oui, c’est opaque : on ne voit pas à travers.',
    style: 'answers',
  });
}

// ---------------------------------------------------------------- 8. L'eau dans la nature

// Les nuages sont faits de toutes petites gouttes d'eau (ou de glace), pas de vapeur.
export const NATURE = [
  { emoji: '🌧️', text: 'D’où tombe la pluie ?', answer: 'des nuages', others: ['du soleil', 'de la lune'], says: 'La pluie tombe des nuages.' },
  { emoji: '☁️', text: 'De quoi est fait un nuage ?', answer: 'de gouttes d’eau', others: ['de coton', 'de fumée'], says: 'Un nuage est fait de toutes petites gouttes d’eau.' },
  { emoji: '🥶', text: 'Quand il fait très froid, les nuages donnent…', answer: 'de la neige', others: ['des feuilles', 'du sable'], says: 'Quand il fait très froid, il neige.' },
  { emoji: '🏞️', text: 'Les rivières coulent jusqu’à…', answer: 'la mer', others: ['la montagne', 'la lune'], says: 'Les rivières descendent des montagnes jusqu’à la mer.' },
  { emoji: '☀️', text: 'Le soleil chauffe la mer. L’eau monte dans le ciel et forme…', answer: 'des nuages', others: ['des étoiles', 'des cailloux'], says: 'L’eau monte dans le ciel et forme les nuages.' },
  { emoji: '🌦️', text: 'Avec du soleil et de la pluie, on peut voir…', answer: 'un arc-en-ciel', others: ['des étoiles', 'de la neige'], says: 'Le soleil éclaire les gouttes de pluie : c’est l’arc-en-ciel.' },
  { emoji: '❄️', text: 'Quand il gèle, l’eau de la flaque devient…', answer: 'de la glace', others: ['du sable', 'de la vapeur'], says: 'Quand il gèle, l’eau devient de la glace.' },
  { emoji: '☃️', text: 'Quand la neige fond, elle devient…', answer: 'de l’eau', others: ['du sel', 'du sable'], says: 'La neige fond : elle devient de l’eau.' },
];

function nature(rng) {
  const item = pick(rng, NATURE);
  const options = shuffle(rng, [item.answer, ...item.others]);
  return {
    key: `matiere:nature:${item.text}`,
    text: item.text,
    instruction: item.text,
    stage: { type: 'picture', emoji: item.emoji },
    choices: textChoices(options),
    choiceStyle: 'answers',
    answer: item.answer,
    success: { speak: item.says },
  };
}

// ---------------------------------------------------------------- 9. Prévoir et tester

export const TOOLS = [
  { emoji: '🧲', name: 'un aimant', ask: 'Pour savoir si un objet est en fer, que prends-tu ?' },
  { emoji: '🌡️', name: 'un thermomètre', ask: 'Pour savoir s’il fait chaud ou froid, que prends-tu ?' },
  { emoji: '🔍', name: 'une loupe', ask: 'Pour voir une fourmi en plus grand, que prends-tu ?' },
  { emoji: '🪣', name: 'un seau d’eau', ask: 'Pour savoir si un objet flotte, que prends-tu ?' },
  { emoji: '🔦', name: 'une lampe de poche', ask: 'Pour savoir si la lumière passe à travers, que prends-tu ?' },
];
const MELTS = [{ emoji: '🧊', name: 'le glaçon' }, { emoji: '☃️', name: 'le bonhomme de neige' }, { emoji: '🍦', name: 'la glace à la vanille' }];
const STAYS = [{ emoji: '🪨', name: 'le caillou' }, { emoji: '🔑', name: 'la clé' }, { emoji: '🪵', name: 'la bûche' }, { emoji: '📕', name: 'le livre' }, { emoji: '🧸', name: 'la peluche' }];
// Ce qu'on prévoit : la bonne image, les deux autres, et ce qui se passe.
/** « la clé coule », « les verres de lunettes laissent passer la lumière » */
const agree = (name, one, many) => `${name} ${name.startsWith('les ') ? many : one}`;
export const PREDICT = [
  { ask: 'Lequel va couler ?', yes: SINKS, no: FLOATS, says: (n) => agree(n, 'coule.', 'coulent.') },
  { ask: 'Lequel va flotter ?', yes: FLOATS, no: SINKS, says: (n) => agree(n, 'flotte.', 'flottent.') },
  { ask: 'Lequel sera attiré par l’aimant ?', yes: MAGNETIC, no: NOT_MAGNETIC, says: (n) => `l’aimant attire ${n}.` },
  { ask: 'Lequel va fondre au soleil ?', yes: MELTS, no: STAYS, says: (n) => agree(n, 'fond au soleil.', 'fondent au soleil.') },
  { ask: 'Lequel laisse passer la lumière ?', yes: TRANSPARENT.filter((t) => t.name !== 'l’eau'), no: OPAQUE, says: (n) => agree(n, 'laisse passer la lumière.', 'laissent passer la lumière.') },
];

function predict(rng) {
  if (rng() < 0.4) {
    const tool = pick(rng, TOOLS);
    return pictureQuestion({
      key: `matiere:outil:${tool.name}`,
      text: tool.ask,
      answer: tool,
      others: sample(rng, TOOLS.filter((t) => t !== tool), 2),
      success: `Oui, avec ${tool.name}.`,
      rng,
    });
  }
  const test = pick(rng, PREDICT);
  const answer = pick(rng, test.yes);
  // les deux autres ne sont jamais aussi dans la bonne liste (le caillou et la bûche, par exemple)
  const others = sample(rng, test.no.filter((o) => !test.yes.some((y) => y.name === o.name) && o.emoji !== answer.emoji), 2);
  return pictureQuestion({
    key: `matiere:prevoir:${test.ask}:${answer.name}`,
    text: test.ask,
    answer,
    others,
    success: `Bien prévu : ${test.says(answer.name)}`,
    rng,
  });
}

// ---------------------------------------------------------------- Le jeu

const MATIERE_LEVELS = [
  solidOrLiquid, (rng) => waterQuestion(pick(rng, WATER_FORMS), 'eau'), heatOrCool, floatOrSink, magnet,
  materials, transparency, nature, predict,
];

export const matiere = {
  id: 'matiere',
  domain: 'monde',
  title: 'La matière',
  icon: '🧊',
  skill: 'Explorer la matière : l’eau, flotter ou couler, l’aimant, les matériaux',
  levels: [
    'Solide ou liquide ?', 'Glace, eau ou vapeur ?', 'Chauffer ou refroidir', 'Flotte ou coule ?', 'Attiré par l’aimant ?',
    'De quoi est-ce fait ?', 'Transparent ou opaque ?', 'L’eau dans la nature', 'Prévoir et tester', 'Toute la matière',
  ],
  generate(level, rng) {
    const make = level >= 10 ? pick(rng, MATIERE_LEVELS) : MATIERE_LEVELS[level - 1];
    return make(rng);
  },
};

export const SCIENCES_GAMES = [vivant, matiere];
