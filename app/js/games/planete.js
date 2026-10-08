// « Prendre soin de la planète » (la planète) et « Les mélanges » (la matière et les objets) :
// questionner le monde au cycle 2, explorer le monde au cycle 1.
// Chaque réponse a été vérifiée à la main :
// - le tri suit les consignes françaises simplifiées (depuis 2023, tous les emballages et les
//   papiers vont dans le bac de tri jaune ; le verre au conteneur à verre ; les restes de fruits
//   et de légumes au compost ; seuls des déchets sans ambiguïté sont proposés : pas de verre à
//   boire, de vaisselle, de mouchoir ni de reste de viande) ;
// - les durées de dégradation sont celles de l'ADEME (pelures de fruits et légumes : 3 à 6 mois ;
//   trognon de pomme : 1 à 6 mois ; mouchoir en papier : 3 mois ; journal : 3 à 12 mois ;
//   sac en plastique : 450 ans ; bouteille en plastique : 100 à 1 000 ans ; verre : 4 000 ans),
//   en ordre de grandeur seulement (« quelques mois », « des centaines », « des milliers d'années ») ;
// - les mélanges : le sucre, le sel, le miel et le sirop se dissolvent dans l'eau ; le sable,
//   l'huile, les cailloux, le riz et les pâtes non ; le sel dissous passe à travers un filtre.
// Ton positif : on dit ce qu'on peut faire, jamais « c'est mal ».

import { pick, sample, shuffle } from '../random.js';

const capitalize = (text) => `${text[0].toUpperCase()}${text.slice(1)}`;
const textChoices = (values) => values.map((v) => ({ value: v, label: v }));
/** Une image et son nom écrit dessous (les poubelles, les gestes). */
const captionChoice = (it) => ({ value: it.name, label: it.name, emoji: it.emoji, caption: it.name, name: it.name });
/** Une image seule à toucher, et son nom pour les lecteurs d'écran. */
const pictureChoice = (it) => ({ value: it.name, label: it.emoji, name: it.name });
const YES_NO = ['oui', 'non'];
const TRUE_FALSE = ['vrai', 'faux'];

/** Une question à deux réponses toujours dans le même ordre (« oui ou non », « vrai ou faux »). */
function twoWay({ key, sentences, emoji, options = YES_NO, answer, success, style = 'words' }) {
  return {
    key,
    text: sentences.join(' '),
    instruction: sentences,
    stage: emoji ? { type: 'picture', emoji } : { type: 'none' },
    choices: textChoices(options),
    choiceStyle: style,
    answer,
    success: { speak: success },
  };
}

/**
 * Une question à choix multiple écrite à la main : `ask` (une ou deux phrases), la bonne réponse
 * et deux autres, jamais justes. Les réponses sont mélangées.
 */
function qcm(prefix, item, rng) {
  // oui et non : toujours dans cet ordre
  const yesNo = item.others.length === 1 && YES_NO.includes(item.answer);
  const options = yesNo ? YES_NO : shuffle(rng, [item.answer, ...item.others]);
  const sentences = Array.isArray(item.ask) ? item.ask : [item.ask];
  return {
    key: `${prefix}:${sentences.join(' ')}`,
    text: sentences.join(' '),
    instruction: sentences,
    stage: item.emoji ? { type: 'picture', emoji: item.emoji } : { type: 'none' },
    choices: textChoices(options),
    choiceStyle: 'answers',
    answer: item.answer,
    success: { speak: item.says },
  };
}

/** Une bonne image légendée parmi trois (les deux autres viennent de la liste `bad`). */
function captionQuestion({ key, sentences, good, bad, success, rng }) {
  const answer = pick(rng, good);
  const options = shuffle(rng, [answer, ...sample(rng, bad, 2)]);
  return {
    key: `${key}:${answer.name}:${options.map((o) => o.name).join(',')}`,
    text: sentences.join(' '),
    instruction: sentences,
    stage: { type: 'none' },
    choices: options.map(captionChoice),
    choiceStyle: 'steps',
    answer: answer.name,
    success: { speak: success },
  };
}

// ================================================================= Prendre soin de la planète

// ---------------------------------------------------------------- 1 et 2. Trier les déchets

// Les quatre poubelles, toujours dans cet ordre, reconnues par leur image et leur nom écrit.
export const BINS = [
  { name: 'emballages et papiers', emoji: '♻️', says: 'Oui : les emballages et les papiers vont dans le bac de tri jaune. Ils seront recyclés.' },
  { name: 'verre', emoji: '🍾', says: 'Oui : le verre va dans le conteneur à verre. Il sera recyclé.' },
  { name: 'ordures ménagères', emoji: '🗑️', says: 'Oui : ça ne se recycle pas. Ça va dans la poubelle des ordures ménagères.' },
  { name: 'compost', emoji: '🪱', says: 'Oui : au compost, les restes deviennent de la bonne terre.' },
];
const [PACKAGING, GLASS, RUBBISH, COMPOST] = BINS.map((b) => b.name);

export const WASTE = [
  { emoji: '🥫', name: 'la boîte de conserve', bin: PACKAGING },
  { emoji: '📦', name: 'la boîte en carton', bin: PACKAGING },
  { emoji: '📰', name: 'le journal', bin: PACKAGING },
  { emoji: '🧃', name: 'la brique de jus', bin: PACKAGING },
  { emoji: '🧴', name: 'le flacon de shampoing', bin: PACKAGING },
  { emoji: '✉️', name: 'l’enveloppe', bin: PACKAGING },
  { emoji: '🍾', name: 'la bouteille en verre', bin: GLASS },
  { emoji: '🫙', name: 'le pot de confiture en verre', bin: GLASS },
  { emoji: '🪥', name: 'la vieille brosse à dents', bin: RUBBISH },
  { emoji: '🧽', name: 'l’éponge usée', bin: RUBBISH },
  { emoji: '🩹', name: 'le pansement', bin: RUBBISH },
  { emoji: '🍌', name: 'la peau de banane', bin: COMPOST },
  { emoji: '🥕', name: 'les épluchures de carotte', bin: COMPOST, plural: true },
  { emoji: '🍎', name: 'le trognon de pomme', bin: COMPOST },
  { emoji: '🥚', name: 'la coquille d’œuf', bin: COMPOST },
  { emoji: '🍂', name: 'les feuilles mortes', bin: COMPOST, plural: true },
];

/** Niveau 1 : deux poubelles (la bonne et une autre) ; niveau 2 : les quatre. */
function sortWaste(rng, all) {
  const item = pick(rng, WASTE);
  const other = pick(rng, BINS.filter((b) => b.name !== item.bin));
  const bins = all ? BINS : BINS.filter((b) => b.name === item.bin || b === other);
  const text = `Où ${item.plural ? 'vont' : 'va'} ${item.name} ?`;
  return {
    key: `planete:tri:${item.name}:${bins.map((b) => b.name).join(',')}`,
    text,
    instruction: text,
    stage: { type: 'picture', emoji: item.emoji },
    choices: bins.map(captionChoice),
    choiceStyle: 'steps',
    answer: item.bin,
    success: { speak: BINS.find((b) => b.name === item.bin).says },
  };
}

// ---------------------------------------------------------------- 3 et 4. Économiser l'eau et l'énergie

export const WATER_GESTURES = [
  { emoji: '🪥', text: 'Je ferme le robinet pendant que je me brosse les dents.', good: true },
  { emoji: '🚿', text: 'Je prends une douche rapide plutôt qu’un bain.', good: true },
  { emoji: '🔧', text: 'On répare le robinet qui goutte.', good: true },
  { emoji: '🪣', text: 'On arrose les fleurs avec l’eau de pluie.', good: true },
  { emoji: '🧼', text: 'Je ferme le robinet pendant que je me savonne les mains.', good: true },
  { emoji: '🚰', text: 'Je laisse couler l’eau pendant que je me brosse les dents.', good: false, tip: 'On peut fermer le robinet.' },
  { emoji: '🛁', text: 'Je remplis la baignoire jusqu’en haut tous les jours.', good: false, tip: 'Une douche rapide utilise moins d’eau.' },
  { emoji: '💧', text: 'Le robinet goutte toute la journée.', good: false, tip: 'On peut le faire réparer.' },
];
export const ENERGY_GESTURES = [
  { emoji: '💡', text: 'J’éteins la lumière en sortant de la pièce.', good: true },
  { emoji: '📺', text: 'J’éteins la télé quand je ne la regarde plus.', good: true },
  { emoji: '🚲', text: 'Pour aller à l’école tout près, je prends mon vélo.', good: true },
  { emoji: '🚶', text: 'Pour aller à la boulangerie tout près, on y va à pied.', good: true },
  { emoji: '🧥', text: 'J’ai un peu froid à la maison : je mets un pull.', good: true },
  { emoji: '🚌', text: 'On prend le bus plutôt que la voiture.', good: true },
  { emoji: '💡', text: 'La lumière reste allumée dans la chambre vide.', good: false, tip: 'On éteint en sortant.' },
  { emoji: '📺', text: 'La télé reste allumée, mais personne ne la regarde.', good: false, tip: 'On l’éteint quand on a fini.' },
  { emoji: '🪟', text: 'Le chauffage marche et la fenêtre reste grande ouverte.', good: false, tip: 'On ouvre la fenêtre un petit moment, puis on la ferme.' },
  { emoji: '🚗', text: 'Pour aller chez le voisin d’à côté, on prend la voiture.', good: false, tip: 'Tout près, on peut y aller à pied.' },
];

/** « Est-ce que ça économise l'eau ? » : oui ou non. */
function saving(rng, list, topic, what) {
  const item = pick(rng, list);
  return twoWay({
    key: `planete:${topic}:${item.text}`,
    sentences: [item.text, `Est-ce que ça économise ${what} ?`],
    emoji: item.emoji,
    answer: item.good ? 'oui' : 'non',
    success: item.good ? [`Oui, ça économise ${what} !`] : [`Tu as raison : ça gaspille ${what === 'l’eau' ? 'de l’eau' : 'de l’énergie'}.`, item.tip],
  });
}

// Une bonne image parmi trois : les deux autres gaspillent ou polluent.
export const WATER_PICTURES = {
  good: [
    { emoji: '🚿', name: 'une douche rapide' }, { emoji: '🔧', name: 'réparer la fuite' },
    { emoji: '🪣', name: 'garder l’eau de pluie' }, { emoji: '🚰', name: 'fermer le robinet' },
  ],
  bad: [{ emoji: '🛁', name: 'un grand bain' }, { emoji: '💦', name: 'laisser couler l’eau' }],
};
export const TRIP_PICTURES = {
  good: [{ emoji: '🚲', name: 'à vélo' }, { emoji: '🚶', name: 'à pied' }, { emoji: '🛴', name: 'en trottinette' }],
  bad: [{ emoji: '🚗', name: 'en voiture' }, { emoji: '🏍️', name: 'à moto' }],
};

function water(rng) {
  if (rng() < 0.65) return saving(rng, WATER_GESTURES, 'eau', 'l’eau');
  return captionQuestion({
    key: 'planete:eau-image',
    sentences: ['Qu’est-ce qui économise l’eau ?'],
    ...WATER_PICTURES,
    success: 'Oui, ça économise l’eau !',
    rng,
  });
}

function energy(rng) {
  if (rng() < 0.7) return saving(rng, ENERGY_GESTURES, 'energie', 'l’énergie');
  return captionQuestion({
    key: 'planete:trajet',
    sentences: ['L’école est tout près.', 'Comment y vas-tu sans polluer ?'],
    ...TRIP_PICTURES,
    success: 'Oui : ça ne pollue pas, et ça fait bouger !',
    rng,
  });
}

// ---------------------------------------------------------------- 5. Ce qui pollue

export const POLLUTES = [
  { emoji: '🏭', name: 'la fumée de l’usine', tip: 'Elle salit l’air que l’on respire.' },
  { emoji: '🚗', name: 'la fumée des voitures', tip: 'Marcher ou pédaler, ça ne pollue pas.' },
  { emoji: '🛍️', name: 'un sac en plastique dans la mer', tip: 'Une tortue peut le prendre pour une méduse.' },
  { emoji: '🥤', name: 'un gobelet jeté dans l’herbe', tip: 'On le garde jusqu’à la poubelle.' },
  { emoji: '🍬', name: 'un papier de bonbon jeté par terre', tip: 'On le garde jusqu’à la poubelle.' },
];
export const CLEAN = [
  { emoji: '🚲', name: 'un vélo', tip: 'Il avance grâce à tes jambes.' },
  { emoji: '🚶', name: 'marcher', tip: 'Marcher, c’est bon pour toi et pour la planète.' },
  { emoji: '🌳', name: 'un arbre', tip: 'Au contraire, il aide à nettoyer l’air.' },
  { emoji: '🍌', name: 'une épluchure dans le compost', tip: 'Elle devient de la bonne terre.' },
];
export const POLLUTION_PICTURES = {
  good: [
    { emoji: '🏭', name: 'la fumée d’usine' }, { emoji: '🚗', name: 'la fumée des voitures' },
    { emoji: '🛍️', name: 'un sac dans la mer' }, { emoji: '🥤', name: 'un gobelet par terre' },
  ],
  bad: [
    { emoji: '🚲', name: 'le vélo' }, { emoji: '🌳', name: 'l’arbre' }, { emoji: '🌻', name: 'la fleur' },
    { emoji: '☀️', name: 'le soleil' },
  ],
};

function pollution(rng) {
  if (rng() < 0.35) {
    return captionQuestion({
      key: 'planete:pollue-image',
      sentences: ['Qu’est-ce qui pollue ?'],
      ...POLLUTION_PICTURES,
      success: 'Oui, ça pollue. Ensemble, on peut polluer moins !',
      rng,
    });
  }
  const pollutes = rng() < 0.5;
  const item = pick(rng, pollutes ? POLLUTES : CLEAN);
  return twoWay({
    key: `planete:pollue:${item.name}`,
    sentences: [`${capitalize(item.name)}, ça pollue ?`],
    emoji: item.emoji,
    answer: pollutes ? 'oui' : 'non',
    success: [pollutes ? 'Oui, ça pollue.' : 'Non, ça ne pollue pas.', item.tip],
  });
}

// ---------------------------------------------------------------- 6. Combien de temps pour disparaître ?

export const DURATIONS = ['quelques mois', 'des centaines d’années', 'des milliers d’années'];
const [MONTHS, CENTURIES, MILLENNIA] = DURATIONS;
const DURATIONS_SPOKEN = 'Quelques mois, des centaines d’années ou des milliers d’années ?';
// Source : ADEME (durées de vie des déchets abandonnés dans la nature).
export const LITTER = [
  { emoji: '🥕', name: 'les épluchures de légumes', plural: true, answer: MONTHS, says: 'Oui : quelques mois. Au compost, elles deviennent de la terre.' },
  { emoji: '🍎', name: 'le trognon de pomme', answer: MONTHS, says: 'Oui : de un à six mois.' },
  { emoji: '🤧', name: 'le mouchoir en papier', answer: MONTHS, says: 'Oui : environ trois mois.' },
  { emoji: '📰', name: 'le journal', answer: MONTHS, says: 'Oui : de quelques mois à un an.' },
  { emoji: '🛍️', name: 'le sac en plastique', answer: CENTURIES, says: 'Oui : environ quatre cent cinquante ans !' },
  { emoji: '🧴', name: 'la bouteille en plastique', answer: CENTURIES, says: 'Oui : des centaines d’années ! Elle va dans le bac de tri.' },
  { emoji: '🍾', name: 'la bouteille en verre', answer: MILLENNIA, says: 'Oui : environ quatre mille ans ! Heureusement, le verre se recycle très bien.' },
];

function lifetime(rng) {
  const r = rng();
  if (r < 0.3) {
    // la plus rapide : une épluchure, un trognon… parmi deux déchets qui durent des siècles
    const answer = pick(rng, LITTER.filter((l) => l.answer === MONTHS));
    const options = shuffle(rng, [answer, ...sample(rng, LITTER.filter((l) => l.answer !== MONTHS), 2)]);
    const text = 'Lequel disparaît le plus vite dans la nature ?';
    return {
      key: `planete:duree-vite:${answer.name}:${options.map((o) => o.name).join(',')}`,
      text,
      instruction: text,
      stage: { type: 'none' },
      choices: options.map(pictureChoice),
      choiceStyle: 'pictures',
      answer: answer.name,
      success: { speak: `Oui : ${answer.name} ${answer.plural ? 'disparaissent' : 'disparaît'} en quelques mois.` },
    };
  }
  const item = pick(rng, LITTER);
  const text = `Dans la nature, ${item.name} ${item.plural ? 'disparaissent' : 'disparaît'} en…`;
  return {
    key: `planete:duree:${item.name}`,
    text,
    instruction: [text, DURATIONS_SPOKEN],
    stage: { type: 'picture', emoji: item.emoji },
    choices: textChoices(DURATIONS),
    choiceStyle: 'answers',
    answer: item.answer,
    success: { speak: item.says },
  };
}

// ---------------------------------------------------------------- 7. Réparer, réutiliser, recycler

export const THREE_R = ['réparer', 'réutiliser', 'recycler'];
const [REPAIR, REUSE, RECYCLE] = THREE_R;
// Réparer : on remet l'objet en état. Réutiliser : on s'en sert encore, tel quel ou pour autre
// chose. Recycler : à l'usine, on transforme sa matière pour fabriquer un nouvel objet.
export const ACTIONS = [
  { emoji: '🧸', text: 'On recoud la peluche décousue.', answer: REPAIR },
  { emoji: '☕', text: 'On recolle l’anse de la tasse.', answer: REPAIR },
  { emoji: '🧦', text: 'On recoud le trou de la chaussette.', answer: REPAIR },
  { emoji: '🚲', text: 'On change le pneu crevé du vélo.', answer: REPAIR },
  { emoji: '🫙', text: 'Le pot de confiture vide devient un pot à crayons.', answer: REUSE },
  { emoji: '👕', text: 'Le vieux tee-shirt devient un chiffon.', answer: REUSE },
  { emoji: '🛍️', text: 'On garde le sac pour les prochaines courses.', answer: REUSE },
  { emoji: '📦', text: 'La boîte en carton devient une maison de poupée.', answer: REUSE },
  { emoji: '📰', text: 'À l’usine, les vieux journaux deviennent du papier neuf.', answer: RECYCLE },
  { emoji: '🍾', text: 'À l’usine, le verre fondu devient de nouvelles bouteilles.', answer: RECYCLE },
  { emoji: '🧴', text: 'À l’usine, les bouteilles en plastique deviennent des fils pour faire des pulls.', answer: RECYCLE },
  { emoji: '🥫', text: 'À l’usine, les boîtes de conserve fondues deviennent de nouveaux objets en métal.', answer: RECYCLE },
];
const THREE_R_SAYS = {
  [REPAIR]: 'Oui, on répare : l’objet peut encore servir.',
  [REUSE]: 'Oui, on réutilise : on s’en sert encore une fois.',
  [RECYCLE]: 'Oui, on recycle : la matière sert à fabriquer un nouvel objet.',
};

function threeR(rng) {
  const item = pick(rng, ACTIONS);
  return twoWay({
    key: `planete:3r:${item.text}`,
    sentences: [item.text, 'Réparer, réutiliser ou recycler ?'],
    emoji: item.emoji,
    options: THREE_R,
    answer: item.answer,
    success: THREE_R_SAYS[item.answer],
  });
}

// ---------------------------------------------------------------- 8. Protéger les animaux et les plantes

export const NATURE_GESTURES = [
  { emoji: '🐦', text: 'On regarde le nid de loin, sans le toucher.', good: true, why: 'Les oiseaux ont besoin de calme pour couver.' },
  { emoji: '🐞', text: 'On observe la coccinelle, puis on la laisse repartir.', good: true, why: 'Elle retourne vivre dans le jardin.' },
  { emoji: '🌼', text: 'On laisse pousser des fleurs sauvages pour les abeilles.', good: true, why: 'Les abeilles s’en nourrissent.' },
  { emoji: '🌳', text: 'On plante un arbre.', good: true, why: 'Il abritera des oiseaux et des insectes.' },
  { emoji: '🦔', text: 'On fabrique un abri pour les hérissons.', good: true, why: 'Ils peuvent y dormir tout l’hiver.' },
  { emoji: '🐸', text: 'On regarde les têtards dans la mare, sans les emporter.', good: true, why: 'Ils deviendront des grenouilles dans leur mare.' },
  { emoji: '🎒', text: 'En promenade, on garde ses déchets jusqu’à la poubelle.', good: true, why: 'La nature reste propre pour les animaux.' },
  { emoji: '🌷', text: 'On cueille toutes les fleurs du parc.', good: false, tip: 'On les laisse pour les abeilles et pour les promeneurs.' },
  { emoji: '🏔️', text: 'En montagne, on cueille une fleur protégée.', good: false, tip: 'Certaines fleurs sont rares : on les regarde sans les cueillir.' },
  { emoji: '🐦', text: 'On fait du bruit tout près d’un nid.', good: false, tip: 'Les oiseaux ont besoin de calme pour couver.' },
  { emoji: '🦋', text: 'On attrape le papillon par les ailes.', good: false, tip: 'Ses ailes sont fragiles : on le regarde sans le toucher.' },
  { emoji: '🐌', text: 'On garde l’escargot pour toujours dans une boîte.', good: false, tip: 'On l’observe un moment, puis on le remet dans l’herbe.' },
];

function protect(rng) {
  const item = pick(rng, NATURE_GESTURES);
  return twoWay({
    key: `planete:proteger:${item.text}`,
    sentences: [item.text, 'Est-ce une bonne idée pour la nature ?'],
    emoji: item.emoji,
    answer: item.good ? 'oui' : 'non',
    success: item.good ? ['Oui, c’est une bonne idée !', item.why] : ['Tu as raison, ce n’est pas une bonne idée.', item.tip],
  });
}

// ---------------------------------------------------------------- 9. Les gestes du quotidien : vrai ou faux

export const DAILY = [
  { emoji: '🍬', text: 'Le papier de bonbon va à la poubelle, pas par terre.', answer: 'vrai', why: 'Comme ça, la nature reste propre.' },
  { emoji: '📄', text: 'On peut dessiner des deux côtés de la feuille.', answer: 'vrai', why: 'Comme ça, on utilise moins de papier.' },
  { emoji: '🍾', text: 'Le verre se recycle encore et encore.', answer: 'vrai', why: 'Une bouteille recyclée devient une nouvelle bouteille.' },
  { emoji: '🛍️', text: 'Un sac en tissu peut servir de très nombreuses fois.', answer: 'vrai', why: 'Il remplace beaucoup de sacs jetables.' },
  { emoji: '🍽️', text: 'Se servir juste ce qu’on va manger évite le gaspillage.', answer: 'vrai', why: 'On peut se resservir si on a encore faim.' },
  { emoji: '🍎', text: 'Le trognon de pomme peut aller au compost.', answer: 'vrai', why: 'Il deviendra de la bonne terre.' },
  { emoji: '🌊', text: 'La mer fait disparaître les déchets qu’on y jette.', answer: 'faux', why: 'Les déchets y restent longtemps et gênent les animaux.' },
  { emoji: '🧴', text: 'Une bouteille en plastique disparaît en une semaine dans la nature.', answer: 'faux', why: 'Il lui faut des centaines d’années.' },
  { emoji: '🔋', text: 'Les piles usées vont dans la poubelle de la maison.', answer: 'faux', why: 'On les rapporte au magasin, dans une boîte spéciale.' },
  { emoji: '🥕', text: 'Les épluchures vont dans la poubelle des emballages.', answer: 'faux', why: 'Elles vont au compost.' },
  { emoji: '🚰', text: 'Il faut laisser couler l’eau pour se brosser les dents.', answer: 'faux', why: 'On ferme le robinet pendant qu’on se brosse les dents.' },
];

function daily(rng) {
  const item = pick(rng, DAILY);
  return twoWay({
    key: `planete:gestes:${item.text}`,
    sentences: [item.text, 'Vrai ou faux ?'],
    emoji: item.emoji,
    options: TRUE_FALSE,
    answer: item.answer,
    success: [item.answer === 'vrai' ? 'C’est vrai !' : 'C’est faux !', item.why],
  });
}

// ---------------------------------------------------------------- Le jeu

const PLANETE_LEVELS = [
  (rng) => sortWaste(rng, false), (rng) => sortWaste(rng, true), water, energy, pollution, lifetime, threeR, protect, daily,
];

export const planete = {
  id: 'planete',
  domain: 'sciences',
  title: 'Prendre soin de la planète',
  icon: '♻️',
  skill: 'Prendre soin de la planète : trier, économiser l’eau et l’énergie, protéger la nature',
  levels: [
    'Trier : deux poubelles', 'Trier : quatre poubelles', 'Économiser l’eau', 'Économiser l’énergie', 'Ce qui pollue',
    'Le temps de disparaître', 'Réparer et recycler', 'Protéger la nature', 'Les bons gestes', 'Toute la planète',
  ],
  generate(level, rng) {
    // niveau 10 : un peu de tout (le tri à quatre poubelles plutôt qu'à deux)
    const make = level >= 10 ? pick(rng, PLANETE_LEVELS.slice(1)) : PLANETE_LEVELS[level - 1];
    return make(rng);
  },
};

// ================================================================= Les mélanges

// ---------------------------------------------------------------- 1. Se dissout dans l'eau ?

// `part` : ce qu'on verse (« du sucre ») ; l'image est celle de l'objet, ou la cuillère qui mélange.
export const SOLUBLE = [
  { part: 'du sucre', says: 'Oui : on ne voit plus le sucre, mais l’eau a un goût sucré.' },
  { part: 'du sel', emoji: '🧂', says: 'Oui : on ne voit plus le sel, mais l’eau a un goût salé.' },
  { part: 'du sirop', says: 'Oui : le sirop se mélange à toute l’eau, qui devient colorée.' },
  { part: 'du miel', emoji: '🍯', says: 'Oui : le miel se dissout, surtout dans l’eau chaude.' },
];
export const INSOLUBLE = [
  { part: 'du sable', emoji: '🏖️', says: 'Non : on voit encore les grains de sable.' },
  { part: 'de l’huile', emoji: '🫒', says: 'Non : l’huile ne se dissout pas, elle reste au-dessus de l’eau.' },
  { part: 'des cailloux', emoji: '🪨', says: 'Non : les cailloux restent au fond, on les voit encore.' },
  { part: 'du riz', emoji: '🍚', says: 'Non : on voit encore les grains de riz.' },
  { part: 'des pâtes', emoji: '🍝', says: 'Non : on voit encore les pâtes.' },
];

function dissolve(rng) {
  const yes = rng() < 0.5;
  const item = pick(rng, yes ? SOLUBLE : INSOLUBLE);
  return twoWay({
    key: `melanges:dissout:${item.part}`,
    sentences: [`On met ${item.part} dans l’eau et on mélange.`, 'Est-ce que ça se dissout ?'],
    emoji: item.emoji || '🥄',
    answer: yes ? 'oui' : 'non',
    success: item.says,
  });
}

// ---------------------------------------------------------------- 2. Voit-on encore les deux ?

export const MIXES = [
  { emoji: '🏖️', mix: 'de l’eau et du sable', visible: true },
  { emoji: '🪨', mix: 'de l’eau et des cailloux', visible: true },
  { emoji: '🫒', mix: 'de l’eau et de l’huile', visible: true },
  { emoji: '🍚', mix: 'du riz et des lentilles', visible: true },
  { emoji: '🍓', mix: 'des fraises et des bananes', visible: true },
  { emoji: '🧂', mix: 'de l’eau et du sel', visible: false, says: 'Non : le sel s’est dissous, on ne le voit plus.' },
  { emoji: '🥄', mix: 'de l’eau et du sucre', visible: false, says: 'Non : le sucre s’est dissous, on ne le voit plus.' },
  { emoji: '🥤', mix: 'de l’eau et du sirop', visible: false, says: 'Non : le sirop s’est mélangé à toute l’eau.' },
];

function visible(rng) {
  const item = pick(rng, MIXES);
  return twoWay({
    key: `melanges:voir:${item.mix}`,
    sentences: [`On mélange ${item.mix}.`, 'Voit-on encore les deux ?'],
    emoji: item.emoji,
    answer: item.visible ? 'oui' : 'non',
    success: item.visible ? 'Oui : on les voit encore tous les deux.' : item.says,
  });
}

// ---------------------------------------------------------------- 3. Filtrer

// Ce qui reste dans le filtre (ou la passoire), et ce qui passe à travers.
export const FILTERS = [
  { emoji: '☕', pour: 'On verse de l’eau et du sable dans un filtre à café.', tool: 'le filtre', stays: 'le sable', passes: 'l’eau' },
  { emoji: '🪨', pour: 'On verse de l’eau et des cailloux dans une passoire.', tool: 'la passoire', stays: 'les cailloux', passes: 'l’eau' },
  { emoji: '🍝', pour: 'On verse les pâtes et leur eau dans une passoire.', tool: 'la passoire', stays: 'les pâtes', passes: 'l’eau' },
  { emoji: '🍓', pour: 'On lave les fraises dans une passoire.', tool: 'la passoire', stays: 'les fraises', passes: 'l’eau' },
  { emoji: '🍵', pour: 'On verse le thé et ses feuilles dans une petite passoire.', tool: 'la passoire', stays: 'les feuilles', passes: 'le thé' },
];
const plural = (name) => name.startsWith('les ');

function filter(rng) {
  if (rng() < 0.2) {
    return twoWay({
      key: 'melanges:filtre:sel',
      sentences: ['On filtre de l’eau salée.', 'Le sel reste-t-il dans le filtre ?'],
      emoji: '🧂',
      answer: 'non',
      success: 'Non : le sel est dissous, il passe à travers le filtre avec l’eau.',
    });
  }
  const item = pick(rng, FILTERS);
  const stays = rng() < 0.6;
  const ask = stays ? `Qu’est-ce qui reste dans ${item.tool} ?` : 'Qu’est-ce qui passe à travers ?';
  return twoWay({
    key: `melanges:filtre:${item.pour}:${stays}`,
    sentences: [item.pour, ask],
    emoji: item.emoji,
    options: [item.stays, item.passes],
    answer: stays ? item.stays : item.passes,
    success: `Oui : ${item.stays} ${plural(item.stays) ? 'restent' : 'reste'} dans ${item.tool}, ${item.passes} passe à travers.`,
  });
}

// ---------------------------------------------------------------- 4. Laisser reposer (décanter)

export const SETTLE = [
  { emoji: '🏖️', part: 'du sable', name: 'le sable', where: 'au fond', says: 'Oui : le sable tombe au fond. L’eau au-dessus devient plus claire.' },
  { emoji: '🪣', part: 'de la terre', name: 'la terre', where: 'au fond', says: 'Oui : la terre se dépose au fond. L’eau au-dessus devient plus claire.' },
  { emoji: '🪨', part: 'des cailloux', name: 'les cailloux', where: 'au fond', says: 'Oui : les cailloux tombent au fond.' },
  { emoji: '🍚', part: 'du riz', name: 'le riz', where: 'au fond', says: 'Oui : les grains de riz tombent au fond.' },
  { emoji: '🫒', part: 'de l’huile', name: 'l’huile', where: 'en haut', says: 'Oui : l’huile remonte et flotte sur l’eau.' },
];
const WHERE = ['au fond', 'en haut'];

function settle(rng) {
  if (rng() < 0.2) {
    return twoWay({
      key: 'melanges:reposer:claire',
      sentences: ['On laisse reposer de l’eau boueuse.', 'Où l’eau est-elle la plus claire ?'],
      emoji: '🪣',
      options: WHERE,
      answer: 'en haut',
      success: 'Oui : la terre tombe au fond, l’eau est plus claire en haut.',
    });
  }
  const item = pick(rng, SETTLE);
  return twoWay({
    key: `melanges:reposer:${item.name}`,
    sentences: [`On mélange de l’eau et ${item.part}, puis on attend.`, `Où ${plural(item.name) ? 'vont' : 'va'} ${item.name} ?`],
    emoji: item.emoji,
    options: WHERE,
    answer: item.where,
    success: item.says,
  });
}

// ---------------------------------------------------------------- 5. L'huile et l'eau

export const OIL = [
  { emoji: '🫒', ask: ['On verse de l’huile dans un verre d’eau.', 'Où va l’huile ?'], answer: 'au-dessus de l’eau', others: ['au fond du verre', 'elle disparaît'], says: 'Oui : l’huile flotte au-dessus de l’eau.' },
  { emoji: '🫗', ask: ['On secoue fort l’huile et l’eau, puis on attend.', 'Que se passe-t-il ?'], answer: 'l’huile remonte', others: ['l’huile se dissout', 'l’huile tombe au fond'], says: 'Oui : l’huile remonte toujours au-dessus de l’eau.' },
  { emoji: '🥗', ask: 'Dans la vinaigrette, qu’est-ce qui flotte au-dessus ?', answer: 'l’huile', others: ['le vinaigre', 'le sel'], says: 'Oui : l’huile flotte sur le vinaigre.' },
  { emoji: '💧', ask: 'Quel liquide flotte sur l’eau ?', answer: 'l’huile', others: ['le sirop', 'le lait'], says: 'Oui : l’huile flotte sur l’eau.' },
  { emoji: '🫒', ask: 'L’huile se dissout-elle dans l’eau ?', answer: 'non', others: ['oui'], says: 'Non : l’huile et l’eau ne se mélangent pas.' },
  { emoji: '🍳', ask: 'Qu’est-ce qui aide l’eau à enlever l’huile de la poêle ?', answer: 'le savon', others: ['le sel', 'le sucre'], says: 'Oui : le savon aide l’eau à enlever l’huile.' },
];

// ---------------------------------------------------------------- 6. Faire évaporer l'eau

export const EVAPORATE = [
  { emoji: '♨️', ask: ['On fait chauffer de l’eau salée jusqu’à ce que l’eau s’évapore.', 'Que reste-t-il ?'], answer: 'du sel', others: ['rien du tout', 'du sable'], says: 'Oui : l’eau s’évapore, le sel reste au fond.' },
  { emoji: '☀️', ask: ['On laisse une assiette d’eau salée au soleil plusieurs jours.', 'Que reste-t-il ?'], answer: 'du sel', others: ['de la glace', 'du sable'], says: 'Oui : le soleil fait évaporer l’eau, le sel reste.' },
  { emoji: '🌊', ask: ['Dans les marais salants, le soleil fait évaporer l’eau de mer.', 'On récolte…'], answer: 'du sel', others: ['du sucre', 'du sable'], says: 'Oui : l’eau de mer s’évapore, on récolte le sel.' },
  { emoji: '🥄', ask: ['On laisse de l’eau sucrée au soleil.', 'L’eau s’évapore.', 'Que reste-t-il ?'], answer: 'du sucre', others: ['du sel', 'rien du tout'], says: 'Oui : l’eau s’évapore, le sucre reste.' },
  { emoji: '💨', ask: 'Quand l’eau s’évapore, elle devient…', answer: 'de la vapeur', others: ['de la glace', 'du sel'], says: 'Oui : elle devient de la vapeur, un gaz invisible.' },
  { emoji: '🔥', ask: 'Pour que l’eau s’évapore plus vite, il faut…', answer: 'la chauffer', others: ['la refroidir', 'la mettre à l’ombre'], says: 'Oui : plus l’eau est chaude, plus elle s’évapore vite.' },
  { emoji: '👕', ask: ['Le linge mouillé sèche au soleil.', 'Où part son eau ?'], answer: 'dans l’air', others: ['dans le soleil', 'dans le linge'], says: 'Oui : l’eau s’évapore dans l’air.' },
];

// ---------------------------------------------------------------- 7. Mener une expérience

// Les étapes dans l'ordre : je pense (l'hypothèse), j'essaie (l'expérience), je regarde (l'observation).
export const EXPERIMENTS = [
  { title: 'Le sel disparaît-il dans l’eau ?', steps: [['🤔', 'je pense que oui'], ['🥄', 'je mélange'], ['👀', 'je ne le vois plus']] },
  { title: 'Le filtre garde-t-il le sable ?', steps: [['🤔', 'je pense que oui'], ['☕', 'je verse dans le filtre'], ['👀', 'le sable est resté']] },
  { title: 'L’huile se mélange-t-elle à l’eau ?', steps: [['🤔', 'je pense que non'], ['🫗', 'je verse l’huile'], ['👀', 'elle reste au-dessus']] },
  { title: 'Le sable tombe-t-il au fond ?', steps: [['🤔', 'je pense que oui'], ['⏳', 'j’attends un peu'], ['👀', 'le sable est au fond']] },
  { title: 'Reste-t-il du sel quand l’eau s’évapore ?', steps: [['🤔', 'je pense que oui'], ['🔥', 'je fais chauffer'], ['👀', 'il reste du sel']] },
];
export const STEPS = [
  { emoji: '🤔', name: 'je pense' }, { emoji: '🧪', name: 'j’essaie' }, { emoji: '👀', name: 'j’observe' },
];
const STEP_ASKS = [
  { ask: 'Que fait-on en premier ?', answer: 0 },
  { ask: 'Que fait-on après avoir dit ce que l’on pense ?', answer: 1 },
  { ask: 'Que fait-on à la fin ?', answer: 2 },
];
const EXPERIMENT_SAYS = 'Je pense, j’essaie, puis j’observe : c’est une expérience !';

function experiment(rng) {
  if (rng() < 0.35) {
    const step = pick(rng, STEP_ASKS);
    const options = shuffle(rng, STEPS);
    return {
      key: `melanges:etape:${step.ask}:${options.map((o) => o.name).join(',')}`,
      text: step.ask,
      instruction: step.ask,
      stage: { type: 'picture', emoji: '🔬' },
      choices: options.map(captionChoice),
      choiceStyle: 'steps',
      answer: STEPS[step.answer].name,
      success: { speak: EXPERIMENT_SAYS },
    };
  }
  const exp = pick(rng, EXPERIMENTS);
  let order = shuffle(rng, exp.steps.map((_, i) => i));
  if (order.every((v, i) => v === i)) order = [...order.slice(1), order[0]]; // jamais déjà rangé
  const ask = 'Touche les images dans l’ordre.';
  return {
    key: `melanges:experience:${exp.title}:${order.join('')}`,
    interaction: 'order',
    text: `${exp.title} ${ask}`,
    instruction: [exp.title, ask],
    stage: { type: 'none' },
    items: order.map((i) => ({ value: i, emoji: exp.steps[i][0], label: exp.steps[i][1], caption: exp.steps[i][1] })),
    order: 'asc',
    choices: [],
    answer: null,
    success: { speak: EXPERIMENT_SAYS },
  };
}

// ---------------------------------------------------------------- 8. Les mélanges en cuisine

export const KITCHEN = [
  { emoji: '🥞', ask: 'Pour la pâte à crêpes, on mélange la farine, les œufs et…', answer: 'le lait', others: ['le sable', 'le savon'], says: 'Oui : la farine, les œufs et le lait.' },
  { emoji: '🥗', ask: 'Pour la vinaigrette, on mélange l’huile et…', answer: 'le vinaigre', others: ['le lait', 'le chocolat'], says: 'Oui : l’huile et le vinaigre.' },
  { emoji: '🍋', ask: 'Pour la citronnade, on mélange l’eau, le jus de citron et…', answer: 'le sucre', others: ['le sel', 'le poivre'], says: 'Oui : le sucre se dissout dans l’eau.' },
  { emoji: '🍰', ask: 'Pour le gâteau, on mélange la farine, le sucre, le beurre et…', answer: 'les œufs', others: ['les cailloux', 'le ketchup'], says: 'Oui : on ajoute les œufs.' },
  { emoji: '☕', ask: 'Pour le chocolat chaud, on mélange le lait et…', answer: 'le cacao', others: ['le sel', 'le vinaigre'], says: 'Oui : le lait et le cacao.' },
  { emoji: '🧈', ask: ['On secoue longtemps de la crème dans un pot.', 'On obtient…'], answer: 'du beurre', others: ['du sucre', 'du sel'], says: 'Oui : la crème secouée devient du beurre.' },
  { emoji: '🍝', ask: 'Pour égoutter les pâtes, on utilise…', answer: 'une passoire', others: ['une fourchette', 'une assiette'], says: 'Oui : l’eau passe, les pâtes restent.' },
  { emoji: '🥚', ask: 'Pour bien mélanger la pâte, on utilise…', answer: 'un fouet', others: ['un marteau', 'des ciseaux'], says: 'Oui : on mélange avec un fouet.' },
  { emoji: '🥤', ask: 'Pour faire un sirop à l’eau, on verse le sirop dans…', answer: 'l’eau', others: ['l’huile', 'le sable'], says: 'Oui : le sirop se mélange à l’eau.' },
];

// ---------------------------------------------------------------- 9. Comment séparer ?

export const SEPARATE = [
  { emoji: '🏖️', ask: 'Pour séparer le sable et l’eau, on utilise…', answer: 'un filtre', others: ['un aimant', 'une loupe'], says: 'Oui : le filtre garde le sable, l’eau passe.' },
  { emoji: '🧂', ask: 'Pour récupérer le sel de l’eau salée, on…', answer: 'fait évaporer l’eau', others: ['filtre l’eau', 'secoue l’eau'], says: 'Oui : l’eau s’évapore, le sel reste. Le filtre, lui, laisse passer le sel.' },
  { emoji: '📎', ask: 'Pour séparer des trombones et du sable, on utilise…', answer: 'un aimant', others: ['une loupe', 'de l’eau'], says: 'Oui : l’aimant attire les trombones en fer.' },
  { emoji: '🫒', ask: 'Pour séparer l’huile et l’eau, on…', answer: 'laisse reposer', others: ['mélange fort', 'ajoute du sel'], says: 'Oui : l’huile remonte, puis on peut l’enlever.' },
  { emoji: '🪨', ask: 'Pour séparer le sable et les cailloux, on utilise…', answer: 'un tamis', others: ['un aimant', 'un verre d’eau'], says: 'Oui : le sable passe, les cailloux restent dans le tamis.' },
  { emoji: '🥔', ask: 'Pour séparer les pommes de terre de leur eau de cuisson, on utilise…', answer: 'une passoire', others: ['un aimant', 'une loupe'], says: 'Oui : l’eau passe, les pommes de terre restent.' },
  { emoji: '🪣', ask: 'Pour avoir de l’eau plus claire avec de l’eau boueuse, on…', answer: 'la filtre', others: ['la secoue', 'ajoute de la terre'], says: 'Oui : le filtre garde la terre.' },
];

// ---------------------------------------------------------------- Le jeu

const MELANGES_LEVELS = [
  dissolve, visible, filter, settle, (rng) => qcm('melanges:huile', pick(rng, OIL), rng),
  (rng) => qcm('melanges:evaporer', pick(rng, EVAPORATE), rng), experiment,
  (rng) => qcm('melanges:cuisine', pick(rng, KITCHEN), rng), (rng) => qcm('melanges:separer', pick(rng, SEPARATE), rng),
];

export const melanges = {
  id: 'melanges',
  domain: 'sciences',
  title: 'Les mélanges',
  icon: '🥣',
  skill: 'Mélanger et séparer : dissoudre, filtrer, décanter, évaporer, mener une expérience',
  levels: [
    'Se dissout dans l’eau ?', 'Voit-on les deux ?', 'Filtrer', 'Laisser reposer', 'L’huile et l’eau',
    'Faire évaporer l’eau', 'Mener une expérience', 'Les mélanges en cuisine', 'Comment séparer ?', 'Tous les mélanges',
  ],
  generate(level, rng) {
    const make = level >= 10 ? pick(rng, MELANGES_LEVELS) : MELANGES_LEVELS[level - 1];
    return make(rng);
  },
};

export const PLANETE_GAMES = [melanges, planete];
