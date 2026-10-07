// Jeux de français pour la maternelle (conscience phonologique, lettres) et le CE1
// (compréhension de phrases, homophones, déterminants).

import { pick, randInt, sample, shuffle } from '../random.js';
import { numberChoices, textChoices } from './helpers.js';
import { PICTURES } from '../data/lecture-data.js';

// ---------------------------------------------------------------- Frappe les syllabes

/** Mots choisis sans « e » muet final pour que le nombre de syllabes orales soit sans ambiguïté. */
const SYLLABLE_WORDS = {
  1: ['chat', 'lit', 'main', 'pied', 'train', 'loup', 'rat', 'nez', 'feu', 'jus', 'os', 'ours', 'dé'],
  2: ['lapin', 'ballon', 'moto', 'vélo', 'robot', 'sapin', 'panda', 'cochon', 'bonbon', 'canard',
    'renard', 'hibou', 'mouton', 'melon', 'dragon', 'poisson', 'bateau', 'gâteau', 'maison', 'oiseau',
    'soleil', 'citron', 'chapeau', 'cadeau', 'crayon', 'avion', 'requin', 'dauphin'],
  3: ['éléphant', 'papillon', 'crocodile', 'dinosaure', 'escargot', 'pantalon', 'parapluie',
    'koala', 'écureuil', 'champignon', 'kangourou', 'coccinelle'],
  4: ['ordinateur', 'hélicoptère', 'télévision'],
};
const EXTRA_PICTURES = {
  ours: '🐻', kangourou: '🦘', coccinelle: '🐞', hélicoptère: '🚁', télévision: '📺', hérisson: '🦔', glaçon: '🧊',
};
const pictureOf = (w) => PICTURES[w] || EXTRA_PICTURES[w];

/** « chat, rat, ou lit » : les images nommées à voix haute. */
const sayList = (words) => words.map((w, i) => (i === words.length - 1 ? `ou ${w}` : w)).join(', ');

// Mots qui commencent par la même syllabe orale (« ca » : canard, cadeau…).
const SAME_START = [
  { syllable: 'la', words: ['lapin', 'lama'] },
  { syllable: 'ca', words: ['canard', 'cadeau', 'café', 'carotte'] },
  { syllable: 'ba', words: ['banane', 'ballon', 'bateau'] },
  { syllable: 'pa', words: ['papillon', 'parapluie'] },
  { syllable: 'cha', words: ['chat', 'chapeau', 'château'] },
  { syllable: 'ra', words: ['rat', 'radio'] },
  { syllable: 'é', words: ['éléphant', 'étoile', 'école', 'écureuil'] },
  { syllable: 'sa', words: ['salade', 'sapin'] },
  { syllable: 'pan', words: ['panda', 'pantalon'] },
  { syllable: 'co', words: ['cochon', 'koala'] },
];
// Mots qui finissent par la même syllabe orale (« to » : bateau, moto…). `rime` = le son de la
// fin : les intrus ne riment jamais avec le mot (sinon « ballon / cochon » prêterait à confusion).
const SAME_END = [
  { rime: 'on', words: ['ballon', 'melon', 'pantalon'] }, // lon
  { rime: 'o', words: ['bateau', 'gâteau', 'château', 'moto'] }, // to
  { rime: 'in', words: ['lapin', 'sapin'] }, // pin
  { rime: 'ar', words: ['canard', 'renard'] }, // nard
  { rime: 'on', words: ['poisson', 'hérisson', 'glaçon'] }, // son
  { rime: 'on', words: ['crayon', 'papillon'] }, // yon
];
const END_FILLERS = [
  { rime: 'a', words: ['tomate', 'banane', 'panda'] }, { rime: 'u', words: ['tortue', 'tulipe'] },
  { rime: 'é', words: ['fusée', 'café', 'bébé'] }, { rime: 'i', words: ['souris', 'lit'] },
  { rime: 'ou', words: ['hibou', 'loup'] }, { rime: 'eil', words: ['soleil', 'abeille'] },
];

/** Niveaux 4 et 5 : l'image qui commence (ou finit) par la même syllabe que le mot entendu. */
function sameSyllable(rng, atEnd) {
  const groups = atEnd ? SAME_END : SAME_START;
  const group = pick(rng, groups);
  const [target, answer] = sample(rng, group.words, 2);
  const pool = atEnd
    ? [...SAME_END, ...END_FILLERS].filter((g) => g.rime !== group.rime)
    : SAME_START.filter((g) => g !== group);
  const options = shuffle(rng, [answer, ...sample(rng, pool.flatMap((g) => g.words), 2)]);
  const word = { text: target, rate: 0.6 };
  const list = sayList(options);
  const how = atEnd ? 'finit' : 'commence';
  return {
    key: `syllabes-rythme:${how}:${target}`,
    text: `Quelle image ${how} comme « ${target} » ?`,
    instruction: [`Quelle image ${how} par la même syllabe que :`, word, list],
    short: { key: `syllabes-rythme:${how}`, text: `${atEnd ? 'Finit' : 'Commence'} comme « ${target} » ?`, speak: [word, list] },
    replay: [word, list],
    stage: { type: 'picture', emoji: pictureOf(target) },
    choices: options.map((w) => ({ value: w, label: pictureOf(w) })),
    choiceStyle: 'pictures',
    answer,
    success: atEnd
      ? { speak: `${target}, ${answer} : ça finit pareil !` }
      : { speak: `${target}, ${answer} : ça commence pareil !`, reveal: answer, highlight: group.syllable.length },
  };
}

/** Niveau 6 : le mot le plus long à dire (et non la chose la plus grande : un train, un ours…). */
function longestWord(rng) {
  const counts = sample(rng, [1, 2, 3, 4], 3);
  const words = counts.map((n) => pick(rng, SYLLABLE_WORDS[n]));
  const longest = Math.max(...counts);
  const answer = words[counts.indexOf(longest)];
  const options = shuffle(rng, words);
  const spoken = options.map((w, i) => ({ text: i === options.length - 1 ? `ou ${w}` : w, rate: 0.7 }));
  return {
    key: `syllabes-rythme:long:${answer}`,
    text: 'Quel mot est le plus long à dire ?',
    instruction: ['Quel mot est le plus long à dire ? Frappe les syllabes pour le savoir !', ...spoken],
    short: { key: 'syllabes-rythme:long', text: 'Le mot le plus long ?', speak: spoken },
    replay: spoken,
    stage: { type: 'picture', emoji: '🗣️' },
    choices: options.map((w) => ({ value: w, label: pictureOf(w) })),
    choiceStyle: 'pictures',
    answer,
    success: { speak: `${answer} : ${longest} syllabes, c’est le mot le plus long !` },
  };
}

// Niveau 7 : les syllabes orales de chaque mot, écrites comme elles se disent (« ca », « nar »).
const SPOKEN_SYLLABLES = {
  lapin: ['la', 'pin'], sapin: ['sa', 'pin'], lama: ['la', 'ma'], canard: ['ca', 'nar'], renard: ['re', 'nar'],
  cadeau: ['ca', 'do'], café: ['ca', 'fé'], bateau: ['ba', 'to'], gâteau: ['gâ', 'to'], château: ['châ', 'to'],
  ballon: ['ba', 'lon'], melon: ['me', 'lon'], moto: ['mo', 'to'], vélo: ['vé', 'lo'], robot: ['ro', 'bo'],
  cochon: ['co', 'chon'], mouton: ['mou', 'ton'], hibou: ['i', 'bou'], panda: ['pan', 'da'], chapeau: ['cha', 'po'],
  poisson: ['poi', 'son'], dragon: ['dra', 'gon'], citron: ['ci', 'tron'], requin: ['re', 'quin'],
  papillon: ['pa', 'pi', 'yon'], pantalon: ['pan', 'ta', 'lon'], escargot: ['es', 'car', 'go'],
  éléphant: ['é', 'lé', 'fant'], kangourou: ['kan', 'gou', 'rou'], parapluie: ['pa', 'ra', 'pluie'],
};

/**
 * Niveau 7 : recoller les syllabes entendues une à une (« ca… nar ») pour trouver le mot.
 * Les intrus ont une syllabe en commun avec le mot (« cadeau », « renard ») : il faut écouter les deux.
 */
function blendSyllables(rng) {
  const words = Object.keys(SPOKEN_SYLLABLES);
  const word = pick(rng, words);
  const parts = SPOKEN_SYLLABLES[word];
  const shares = (w) => w !== word && SPOKEN_SYLLABLES[w].some((p) => parts.includes(p));
  const close = sample(rng, words.filter(shares), 2);
  const rest = sample(rng, words.filter((w) => w !== word && !close.includes(w)), 2 - close.length);
  const options = shuffle(rng, [word, ...close, ...rest]);
  const said = parts.map((p) => ({ text: p, rate: 0.6 }));
  return {
    key: `syllabes-rythme:recolle:${word}`,
    text: 'Recolle les syllabes : quel mot entends-tu ?',
    instruction: ['Écoute les syllabes, et recolle-les. Quel mot entends-tu ?', ...said],
    short: { key: 'syllabes-rythme:recolle', text: 'Quel mot ?', speak: said },
    replay: said,
    stage: { type: 'picture', emoji: '🧩' },
    choices: options.map((w) => ({ value: w, label: pictureOf(w) })),
    choiceStyle: 'pictures',
    answer: word,
    success: { speak: [...said, `${word} !`] },
  };
}

/** Niveau 8 : ranger trois images, du mot le plus court au mot le plus long à dire. */
function shortestToLongest(rng) {
  const counts = sample(rng, [1, 2, 3, 4], 3).sort((a, b) => a - b);
  const words = counts.map((n) => pick(rng, SYLLABLE_WORDS[n]));
  let order = shuffle(rng, [0, 1, 2]);
  if (order.every((v, i) => v === i)) order = [...order.slice(1), order[0]]; // jamais déjà rangées
  const shown = order.map((i) => words[i]);
  const spoken = shown.map((w, i) => ({ text: i === shown.length - 1 ? `et ${w}` : w, rate: 0.7 }));
  return {
    key: `syllabes-rythme:range:${words.join('-')}`,
    interaction: 'order',
    text: 'Range les images, du mot le plus court au mot le plus long.',
    instruction: ['Range les images, du mot le plus court au mot le plus long à dire. Frappe les syllabes pour t’aider !', ...spoken],
    short: { key: 'syllabes-rythme:range', text: 'Du plus court au plus long !', speak: spoken },
    replay: spoken,
    stage: { type: 'picture', emoji: '👏' },
    items: order.map((i) => ({ value: counts[i], emoji: pictureOf(words[i]), label: words[i], scale: 1 })),
    order: 'asc',
    choices: [],
    answer: words.join(','),
    success: { speak: `${words.join(', ')} : du plus court au plus long !` },
  };
}

export const syllabesRythme = {
  id: 'syllabes-rythme',
  domain: 'francais',
  section: 'Écouter les sons',
  title: 'Frappe les syllabes',
  icon: '👏',
  skill: 'Compter, repérer et recoller les syllabes d’un mot à l’oral (conscience phonologique)',
  levels: [
    'Mots de 1 ou 2 syllabes', "Jusqu'à 3 syllabes", "Jusqu'à 4 syllabes",
    'Même syllabe au début', 'Même syllabe à la fin', 'Le mot le plus long',
    'Recolle les syllabes', 'Du plus court au plus long',
  ],
  generate(level, rng) {
    if (level === 4 || level === 5) return sameSyllable(rng, level === 5);
    if (level === 6) return longestWord(rng);
    if (level === 7) return blendSyllables(rng);
    if (level === 8) return shortestToLongest(rng);
    const maxSyll = level + 1;
    const count = pick(rng, Array.from({ length: maxSyll }, (_, i) => i + 1));
    const word = pick(rng, SYLLABLE_WORDS[count]);
    const choices = Array.from({ length: Math.max(3, maxSyll) }, (_, i) => ({ value: i + 1, label: '👏'.repeat(i + 1) }));
    return {
      key: `syllabes-rythme:${word}`,
      text: 'Combien de syllabes entends-tu ? Frappe dans tes mains !',
      instruction: ['Frappe dans tes mains, et compte les syllabes du mot :', { text: word, rate: 0.6 }],
      short: { text: 'Combien de syllabes ?', speak: [{ text: word, rate: 0.6 }] },
      replay: [{ text: word, rate: 0.6 }],
      stage: { type: 'picture', emoji: pictureOf(word) },
      choices,
      choiceStyle: 'claps',
      answer: count,
      success: { speak: `${word} : ${count} syllabe${count > 1 ? 's' : ''} !` },
    };
  },
};

// ---------------------------------------------------------------- Les rimes

const RHYMES = [
  ['chat', 'rat'],
  ['vélo', 'moto', 'robot', 'bateau', 'gâteau', 'cadeau', 'chapeau', 'oiseau'],
  ['ballon', 'cochon', 'mouton', 'melon', 'dragon', 'poisson', 'citron', 'bonbon', 'avion', 'crayon'],
  ['lapin', 'sapin', 'raisin', 'train', 'main', 'requin', 'dauphin'],
  ['loup', 'hibou', 'kangourou'],
  ['lit', 'souris'],
  ['dé', 'café', 'bébé', 'fusée', 'nez'],
  ['fleur', 'tracteur', 'ordinateur'],
  ['canard', 'renard'],
];

const rhymeGroup = (w) => RHYMES.find((g) => g.includes(w));

/** Niveau 3 : trois mots riment, un seul ne rime pas. */
function oddRhyme(rng) {
  const group = pick(rng, RHYMES.filter((g) => g.length >= 3));
  const rhyming = sample(rng, group, 3);
  const odd = pick(rng, RHYMES.filter((g) => g !== group).flat());
  const options = shuffle(rng, [...rhyming, odd]);
  const list = sayList(options);
  return {
    key: `rimes:intrus:${odd}`,
    text: 'Quel mot ne rime pas avec les autres ?',
    instruction: ['Écoute bien : quel mot ne rime pas avec les autres ?', list],
    short: { key: 'rimes:intrus', text: 'Lequel ne rime pas ?', speak: [list] },
    replay: ['Quel mot ne rime pas ?', list],
    stage: { type: 'picture', emoji: '🎵' },
    choices: options.map((w) => ({ value: w, label: pictureOf(w) })),
    choiceStyle: 'pictures',
    answer: odd,
    success: { speak: [`${odd} ne rime pas avec les autres !`, `${rhyming[0]}, ${rhyming[1]}, ${rhyming[2]} : ça rime !`] },
  };
}

// Niveau 4 : finir une phrase avec un mot qui rime (le mot qui rime est sur l'image).
const RHYME_SENTENCES = [
  { text: 'Le petit chat a vu un…', anchor: 'chat', answer: 'rat' },
  { text: 'Sur le bateau, on mange un…', anchor: 'bateau', answer: 'gâteau' },
  { text: 'Au pied du sapin, il y a un…', anchor: 'sapin', answer: 'lapin' },
  { text: 'Le gros cochon joue au…', anchor: 'cochon', answer: 'ballon' },
  { text: 'Dans le bois, le loup voit un…', anchor: 'loup', answer: 'hibou' },
  { text: 'Dans mon lit, il y a une…', anchor: 'lit', answer: 'souris' },
  { text: 'Le canard a peur du…', anchor: 'canard', answer: 'renard' },
  { text: 'Le robot fait de la…', anchor: 'robot', answer: 'moto' },
  { text: 'Le bébé joue avec un…', anchor: 'bébé', answer: 'dé' },
  { text: 'Le dauphin mange du…', anchor: 'dauphin', answer: 'raisin' },
  { text: 'Le requin prend le…', anchor: 'requin', answer: 'train' },
  { text: 'Avec mon chapeau, je fais du…', anchor: 'chapeau', answer: 'vélo' },
];

function rhymeSentence(rng) {
  const item = pick(rng, RHYME_SENTENCES);
  const group = rhymeGroup(item.anchor);
  const options = shuffle(rng, [item.answer, ...sample(rng, RHYMES.filter((g) => g !== group).flat(), 2)]);
  const sentence = { text: item.text, rate: 0.85 };
  const list = sayList(options);
  return {
    key: `rimes:phrase:${item.anchor}`,
    text: 'Finis la phrase avec un mot qui rime.',
    instruction: ['Écoute, et finis la phrase avec un mot qui rime :', sentence, list],
    short: { key: 'rimes:phrase', text: 'Quel mot rime ?', speak: [sentence, list] },
    replay: [sentence, list],
    stage: { type: 'picture', emoji: pictureOf(item.anchor) },
    choices: options.map((w) => ({ value: w, label: pictureOf(w) })),
    choiceStyle: 'pictures',
    answer: item.answer,
    success: { speak: `${item.text.slice(0, -1)} ${item.answer} !` },
  };
}

// Niveau 5 : trouver la paire qui rime. Pièges : deux mots qui commencent pareil (sans rimer).
const SAME_START_PAIRS = [
  ['ballon', 'bateau'], ['lapin', 'lama'], ['chat', 'chapeau'], ['canard', 'cadeau'], ['cochon', 'koala'],
  ['salade', 'sapin'], ['panda', 'pantalon'], ['éléphant', 'étoile'], ['radio', 'rat'], ['papillon', 'parapluie'],
];

function rhymingPair(rng) {
  const group = pick(rng, RHYMES);
  const good = sample(rng, group, 2);
  const trap = pick(rng, SAME_START_PAIRS.filter((p) => !p.some((w) => good.includes(w))));
  const used = [...good, ...trap];
  const [g1, g2] = sample(rng, RHYMES.filter((g) => !g.some((w) => used.includes(w))), 2);
  const other = [pick(rng, g1), pick(rng, g2)];
  const pairs = shuffle(rng, [good, trap, other]);
  const said = pairs.map(([a, b], i) => `${i === pairs.length - 1 ? 'ou ' : ''}${a} et ${b} ?`);
  return {
    key: `rimes:paire:${good.join('-')}`,
    text: 'Quels deux mots riment ensemble ?',
    instruction: ['Quels deux mots riment ensemble ?', ...said],
    short: { key: 'rimes:paire', text: 'Quelle paire rime ?', speak: said },
    replay: said,
    stage: { type: 'picture', emoji: '🎵' },
    choices: pairs.map(([a, b]) => ({ value: `${a}+${b}`, label: `${pictureOf(a)} ${pictureOf(b)}` })),
    choiceStyle: 'words',
    answer: `${good[0]}+${good[1]}`,
    success: { speak: `${good[0]}, ${good[1]} : ça rime !` },
  };
}

// Niveau 6 : [mot, piège] — le piège commence par la même syllabe que le mot, mais ne rime pas.
const START_TRAPS = [
  ['bateau', 'ballon'], ['bateau', 'banane'], ['ballon', 'bateau'], ['ballon', 'banane'], ['lapin', 'lama'],
  ['chat', 'chapeau'], ['chat', 'château'], ['chapeau', 'chat'], ['canard', 'cadeau'], ['canard', 'café'],
  ['cadeau', 'canard'], ['cadeau', 'café'], ['café', 'canard'], ['café', 'cadeau'], ['cochon', 'koala'],
  ['sapin', 'salade'], ['rat', 'radio'], ['mouton', 'mouche'], ['requin', 'renard'], ['renard', 'requin'],
  ['avion', 'abeille'], ['dragon', 'drapeau'], ['lit', 'lion'],
];

/** Niveau 6 : le mot qui rime, avec un piège qui commence pareil (« bateau » : ballon ou gâteau ?). */
function rhymeWithStartTrap(rng) {
  const [target, trap] = pick(rng, START_TRAPS);
  const group = rhymeGroup(target);
  const rhyme = pick(rng, group.filter((w) => w !== target));
  const others = RHYMES.filter((g) => g !== group).flat()
    .filter((w) => w !== trap && w.slice(0, 2) !== target.slice(0, 2) && w.slice(0, 2) !== rhyme.slice(0, 2));
  const options = shuffle(rng, [rhyme, trap, ...sample(rng, others, 2)]);
  const list = sayList(options);
  return {
    key: `rimes:piege:${target}`,
    text: `Quel mot rime avec « ${target} » ?`,
    instruction: ['Attention au piège : écoute bien la fin des mots.', `Quel mot rime avec : ${target} ?`, list],
    short: { key: 'rimes', text: `Rime avec « ${target} » ?`, speak: [`${target} ?`, list] },
    replay: [`${target} ?`, list],
    stage: { type: 'picture', emoji: pictureOf(target) },
    choices: options.map((w) => ({ value: w, label: pictureOf(w) })),
    choiceStyle: 'pictures',
    answer: rhyme,
    success: { speak: `${target}, ${rhyme} : ça rime !` },
  };
}

// Niveau 7 : finir la phrase avec un mot qui rime, alors qu'un autre mot irait mieux pour le sens.
const SENSE_TRAPS = [
  { text: 'Le petit chat attrape un…', anchor: 'chat', answer: 'rat', trap: 'poisson' },
  { text: 'Le lapin mange du…', anchor: 'lapin', answer: 'raisin', trap: 'melon' },
  { text: 'Dans la nuit, le loup voit un…', anchor: 'loup', answer: 'hibou', trap: 'renard' },
  { text: 'Sur le bateau, je mange un…', anchor: 'bateau', answer: 'gâteau', trap: 'poisson' },
  { text: 'Le bébé lance le…', anchor: 'bébé', answer: 'dé', trap: 'ballon' },
  { text: 'Le canard a peur du…', anchor: 'canard', answer: 'renard', trap: 'loup' },
  { text: 'Le dauphin saute près du…', anchor: 'dauphin', answer: 'requin', trap: 'bateau' },
  { text: 'Avec mon crayon, je dessine un…', anchor: 'crayon', answer: 'mouton', trap: 'soleil' },
  { text: 'Le robot conduit une…', anchor: 'robot', answer: 'moto', trap: 'voiture' },
  { text: 'Le gros cochon mange du…', anchor: 'cochon', answer: 'melon', trap: 'raisin' },
  { text: 'Le petit poisson a peur du…', anchor: 'poisson', answer: 'dragon', trap: 'requin' },
  { text: 'Le hibou se pose sur le…', anchor: 'hibou', answer: 'loup', trap: 'sapin' },
];

/** Niveau 7 : le mot qui rime, et non le mot qui irait le mieux dans la phrase. */
function rhymeOverSense(rng) {
  const item = pick(rng, SENSE_TRAPS);
  const group = rhymeGroup(item.anchor);
  const other = pick(rng, RHYMES.filter((g) => g !== group).flat().filter((w) => w !== item.trap && pictureOf(w) !== pictureOf(item.trap)));
  const options = shuffle(rng, [item.answer, item.trap, other]);
  const sentence = { text: item.text, rate: 0.85 };
  const list = sayList(options);
  return {
    key: `rimes:sens:${item.anchor}`,
    text: 'Finis la phrase avec un mot qui rime, même si c’est rigolo !',
    instruction: ['Attention au piège ! Finis la phrase avec un mot qui rime, même si c’est rigolo.', sentence, list],
    short: { key: 'rimes:phrase', text: 'Quel mot rime ?', speak: [sentence, list] },
    replay: [sentence, list],
    stage: { type: 'picture', emoji: pictureOf(item.anchor) },
    choices: options.map((w) => ({ value: w, label: pictureOf(w) })),
    choiceStyle: 'pictures',
    answer: item.answer,
    success: { speak: `${item.text.slice(0, -1)} ${item.answer} ! ${item.anchor}, ${item.answer} : ça rime !` },
  };
}

// Niveau 8 : le son de la fin, entendu seul. Un son par groupe de RHYMES (même ordre) ;
// `say` est un mot qui se prononce comme ce son, pour guider la voix.
const RHYME_SOUNDS = [
  { sound: 'a', say: 'a' }, { sound: 'o', say: 'eau' }, { sound: 'on', say: 'on' }, { sound: 'in', say: 'hein' },
  { sound: 'ou', say: 'ou' }, { sound: 'i', say: 'i' }, { sound: 'é', say: 'et' }, null, null, // « eur », « ar » : deux sons
];

/** Niveau 8 : l'image qui finit par le son entendu (« on » : ballon). */
function endsWithSound(rng) {
  const index = pick(rng, RHYME_SOUNDS.map((s, i) => (s ? i : null)).filter((i) => i !== null));
  const { sound, say } = RHYME_SOUNDS[index];
  const answer = pick(rng, RHYMES[index]);
  const others = sample(rng, RHYMES.filter((_, i) => i !== index).flat(), 3);
  const options = shuffle(rng, [answer, ...others]);
  const heard = { text: say, rate: 0.7 };
  const list = sayList(options);
  return {
    key: `rimes:son:${sound}:${answer}`,
    text: `Quelle image finit par le son « ${sound} » ?`,
    instruction: ['Quelle image finit par le son :', heard, list],
    short: { key: 'rimes:son', text: `Finit par « ${sound} » ?`, speak: [heard, list] },
    replay: [heard, list],
    stage: { type: 'picture', emoji: '👂' },
    choices: options.map((w) => ({ value: w, label: pictureOf(w) })),
    choiceStyle: 'pictures',
    answer,
    success: { speak: [`${answer} !`, heard] },
  };
}

export const rimes = {
  id: 'rimes',
  domain: 'francais',
  section: 'Écouter les sons',
  title: 'Les rimes',
  icon: '🎵',
  skill: 'Repérer les mots qui riment (même son à la fin), sans se laisser piéger',
  levels: [
    '3 images', '4 images', 'L’intrus qui ne rime pas', 'Finis la phrase qui rime', 'La paire qui rime',
    'Le piège du même début', 'Le piège du sens', 'Le son de la fin',
  ],
  generate(level, rng) {
    if (level === 3) return oddRhyme(rng);
    if (level === 4) return rhymeSentence(rng);
    if (level === 5) return rhymingPair(rng);
    if (level === 6) return rhymeWithStartTrap(rng);
    if (level === 7) return rhymeOverSense(rng);
    if (level === 8) return endsWithSound(rng);
    const group = pick(rng, RHYMES);
    const [target, rhyme] = sample(rng, group, 2);
    const others = RHYMES.filter((g) => g !== group).flat();
    const options = shuffle(rng, [rhyme, ...sample(rng, others, level + 1)]);
    const list = options.map((w, i) => (i === options.length - 1 ? `ou ${w}` : w)).join(', ');
    return {
      key: `rimes:${target}`,
      text: `Quel mot rime avec « ${target} » ?`,
      instruction: [`Quel mot rime avec : ${target} ?`, list],
      short: { key: 'rimes', text: `Rime avec « ${target} » ?`, speak: [`${target} ?`, list] },
      stage: { type: 'picture', emoji: pictureOf(target) },
      choices: options.map((w) => ({ value: w, label: pictureOf(w) })),
      choiceStyle: 'pictures',
      answer: rhyme,
      success: { speak: `${target}, ${rhyme} : ça rime !` },
    };
  },
};

// ---------------------------------------------------------------- Les lettres

export const LETTER_NAMES = {
  a: 'a', b: 'bé', c: 'cé', d: 'dé', e: 'e', f: 'effe', g: 'gé', h: 'ache', i: 'i', j: 'ji', k: 'ka',
  l: 'elle', m: 'emme', n: 'enne', o: 'o', p: 'pé', q: 'cu', r: 'erre', s: 'esse', t: 'té', u: 'u',
  v: 'vé', w: 'double vé', x: 'ixe', y: 'i grec', z: 'zède',
};
const ALPHABET = Object.keys(LETTER_NAMES);
const VOWELS = ['a', 'e', 'i', 'o', 'u'];
// Lettres faciles à confondre : on les propose ensemble pour bien les distinguer.
const LOOK_ALIKE = [['b', 'd', 'p', 'q'], ['m', 'n', 'u'], ['e', 'f'], ['i', 'j', 'l'], ['o', 'c'], ['v', 'w', 'y']];

const spell = (letters) => letters.map((l) => LETTER_NAMES[l] || l).join(', ');

// Niveau 5 : des mots de 2 à 6 lettres à écrire en capitales (pour compter leurs lettres).
const COUNT_WORDS = [
  'os', 'dé', 'lit', 'rat', 'nez', 'jus', 'chat', 'loup', 'lune', 'moto', 'vélo', 'lion', 'pomme', 'lapin',
  'poule', 'robot', 'sapin', 'avion', 'panda', 'fusée', 'melon', 'tomate', 'banane', 'cheval', 'tortue', 'ballon',
];

/** Niveau 5 : compter les lettres d'un mot (une lettre n'est pas un mot, « ch » fait deux lettres). */
function countLetters(rng) {
  const word = pick(rng, COUNT_WORDS);
  const n = word.length;
  const spoken = { text: word, rate: 0.8 };
  return {
    key: `lettres:compte:${word}`,
    text: 'Combien de lettres y a-t-il dans ce mot ?',
    instruction: ['Voici le mot :', spoken, 'Combien a-t-il de lettres ?'],
    short: { key: 'lettres:compte', text: 'Combien de lettres ?', speak: [spoken] },
    replay: [spoken],
    stage: { type: 'word', text: word.toUpperCase() },
    choices: numberChoices(rng, n, 3, 2, 7).map((v) => ({ value: v, label: String(v) })),
    choiceStyle: 'numbers',
    answer: n,
    success: { speak: [`${n} lettres :`, { text: spell([...word]), rate: 0.85 }] },
  };
}

/** Niveau 6 : la lettre qui manque dans un morceau de l'alphabet (A B … D). */
function missingLetter(rng) {
  const start = randInt(rng, 0, ALPHABET.length - 4);
  const run = ALPHABET.slice(start, start + 4);
  const gap = randInt(rng, 1, 3);
  const letter = run[gap];
  // intrus : la lettre juste avant ou juste après le morceau, une lettre qui lui ressemble, une autre
  const near = [ALPHABET[start - 1], ALPHABET[start + 4]].filter(Boolean);
  const lookAlike = (LOOK_ALIKE.find((g) => g.includes(letter)) || []).filter((l) => l !== letter && !run.includes(l));
  const rest = ALPHABET.filter((l) => !run.includes(l) && !near.includes(l) && !lookAlike.includes(l));
  const distractors = [...new Set([...sample(rng, near, 1), ...sample(rng, lookAlike, 1), ...sample(rng, rest, 3)])].slice(0, 3);
  const shown = run.map((l, i) => (i === gap ? null : l.toUpperCase()));
  const said = { text: run.map((l, i) => (i === gap ? '…' : LETTER_NAMES[l])).join(', '), rate: 0.8 };
  return {
    key: `lettres:manque:${letter}`,
    text: 'Quelle lettre manque dans l’alphabet ?',
    instruction: ['Quelle lettre manque dans l’alphabet ?', said],
    short: { key: 'lettres:manque', text: 'Quelle lettre manque ?', speak: [said] },
    replay: [said],
    stage: { type: 'sequence', items: shown },
    choices: shuffle(rng, [letter, ...distractors]).map((l) => ({ value: l, label: l.toUpperCase() })),
    choiceStyle: 'letters',
    answer: letter,
    success: { speak: { text: spell(run), rate: 0.85 } },
  };
}

/** Niveau 7 : ranger 4 lettres dans l'ordre de l'alphabet (prises dans un morceau de 6 lettres). */
function alphabetOrder(rng) {
  const start = randInt(rng, 0, ALPHABET.length - 6);
  const letters = sample(rng, ALPHABET.slice(start, start + 6), 4).sort();
  let order = shuffle(rng, letters.map((_, i) => i));
  if (order.every((v, i) => v === i)) order = [...order.slice(1), order[0]]; // jamais déjà rangées
  return {
    key: `lettres:ordre:${letters.join('')}`,
    interaction: 'order',
    text: 'Touche les lettres dans l’ordre de l’alphabet.',
    instruction: 'Range les lettres dans l’ordre de l’alphabet : touche d’abord celle qui vient en premier.',
    short: { key: 'lettres:ordre', text: 'Dans l’ordre de l’alphabet !' },
    stage: { type: 'none' },
    items: order.map((i) => ({ value: ALPHABET.indexOf(letters[i]), label: letters[i].toUpperCase() })),
    order: 'asc',
    sign: '',
    choices: [],
    answer: letters.join('').toUpperCase(),
    success: { speak: { text: spell(letters), rate: 0.85 } },
  };
}

export const lettres = {
  id: 'lettres',
  domain: 'francais',
  section: 'Lettres et sons',
  title: 'Les lettres',
  icon: '🔠',
  skill: 'Reconnaître les lettres, connaître leur nom et l’ordre de l’alphabet',
  levels: [
    'Les voyelles en capitales', 'Toutes les capitales', 'Les lettres minuscules', 'Majuscule et minuscule',
    'Combien de lettres ?', 'La lettre qui manque', 'L’ordre alphabétique',
  ],
  generate(level, rng) {
    if (level === 5) return countLetters(rng);
    if (level === 6) return missingLetter(rng);
    if (level === 7) return alphabetOrder(rng);
    const pool = level === 1 ? VOWELS : ALPHABET;
    const letter = pick(rng, pool);
    let others = pool.filter((l) => l !== letter);
    const lookAlike = LOOK_ALIKE.find((g) => g.includes(letter));
    if (level >= 3 && lookAlike) others = [...lookAlike.filter((l) => l !== letter), ...sample(rng, others, 4)];
    const distractors = [...new Set(others)].slice(0, 6);
    const choices = shuffle(rng, [letter, ...sample(rng, distractors, level === 1 ? 2 : 3)]);
    const show = (l) => (level === 3 || level === 4 ? l : l.toUpperCase());
    const name = { text: LETTER_NAMES[letter], rate: 0.8 };
    if (level === 4) {
      return {
        key: `lettres:${letter}`,
        text: 'Trouve la même lettre en minuscule.',
        instruction: ['Voici la lettre majuscule :', name, 'Trouve-la en minuscule !'],
        short: { text: 'En minuscule ?', speak: [name] },
        replay: [name],
        stage: { type: 'word', text: letter.toUpperCase() },
        choices: textChoices(choices),
        choiceStyle: 'letters',
        answer: letter,
        success: { speak: name },
      };
    }
    return {
      key: `lettres:${letter}`,
      text: 'Touche la lettre que tu entends.',
      instruction: ['Touche la lettre :', name],
      short: { text: 'Quelle lettre ?', speak: [name] },
      replay: [name],
      stage: { type: 'listen' },
      choices: choices.map((l) => ({ value: l, label: show(l) })),
      choiceStyle: 'letters',
      answer: letter,
      success: { speak: name },
    };
  },
};

// ---------------------------------------------------------------- Lis la phrase (CE1)

const SENTENCES = [
  { level: 1, emoji: '🌧️', text: 'Il pleut.' }, { level: 1, emoji: '❄️', text: 'Il neige.' },
  { level: 1, emoji: '☀️', text: 'Le soleil brille.' }, { level: 1, emoji: '😴', text: 'Il dort.' },
  { level: 1, emoji: '📖', text: 'Elle lit un livre.' }, { level: 1, emoji: '🎨', text: 'Il peint.' },
  { level: 1, emoji: '🚀', text: 'La fusée décolle.' }, { level: 1, emoji: '🎂', text: 'Joyeux anniversaire !' },
  { level: 2, emoji: '🏊', text: 'Le garçon nage dans la piscine.' },
  { level: 2, emoji: '🚴', text: 'La fille fait du vélo dans le parc.' },
  { level: 2, emoji: '⚽', text: 'Les enfants jouent au football.' },
  { level: 2, emoji: '🚂', text: 'Le train arrive à la gare.' },
  { level: 2, emoji: '🥚', text: 'La poule a pondu un œuf.' },
  { level: 2, emoji: '🪥', text: 'Je me brosse les dents.' },
  { level: 2, emoji: '🍦', text: 'Nous mangeons une glace à la vanille.' },
  { level: 2, emoji: '🎁', text: 'Papa ouvre un grand cadeau.' },
];

/** Au-delà de 26 caractères, une phrase-réponse passe sur deux lignes (téléphone en paysage). */
export const LONG_SENTENCE = 26;

// Niveau 3 : la bonne phrase et deux phrases où un seul mot change (lire chaque mot).
const ONE_WORD_CHANGES = [
  { emoji: '🍏', text: 'La pomme est verte.', others: ['La pomme est rouge.', 'La poire est verte.'] },
  { emoji: '🐸', text: 'La grenouille est verte.', others: ['La grenouille est bleue.', 'La tortue est verte.'] },
  { emoji: '🐌', text: 'Un escargot avance lentement.', others: ['Un escargot avance vite.', 'Un lapin avance lentement.'] },
  { emoji: '🐢', text: 'La tortue a une carapace.', others: ['La tortue a une crinière.', 'La souris a une carapace.'] },
  { emoji: '🐟', text: 'Le poisson nage dans l’eau.', others: ['Le poisson vole dans l’eau.', 'Le canard nage dans l’eau.'] },
  { emoji: '🧊', text: 'Le glaçon est froid.', others: ['Le glaçon est chaud.', 'Le café est froid.'] },
  { emoji: '🦁', text: 'Le lion a une crinière.', others: ['Le lion a une trompe.', 'Le loup a une crinière.'] },
  { emoji: '🦒', text: 'La girafe a un long cou.', others: ['La girafe a un long nez.', 'La vache a un long cou.'] },
  { emoji: '🍌', text: 'La banane est jaune.', others: ['La banane est bleue.', 'La tomate est jaune.'] },
  { emoji: '👟', text: 'Je mets mes chaussures.', others: ['Je mets mes chaussettes.', 'Je lave mes chaussures.'] },
  { emoji: '🔥', text: 'Le feu est chaud.', others: ['Le feu est froid.', 'Le jeu est chaud.'] },
  { emoji: '🐄', text: 'La vache donne du lait.', others: ['La vache donne du miel.', 'La poule donne du lait.'] },
  { emoji: '🐝', text: 'L’abeille fait du miel.', others: ['L’abeille fait du lait.', 'L’oiseau fait du miel.'] },
];
// Niveau 4 : une phrase qui n'a pas de sens, cachée parmi des phrases qui en ont.
const ABSURD_SENTENCES = [
  'Le poisson grimpe aux arbres.', 'La vache pond des œufs.', 'Je bois ma soupe avec une fourchette.',
  'Le chat aboie très fort.', 'Papa met ses chaussures sur la tête.', 'Je me brosse les dents avec un peigne.',
  'Le soleil brille toute la nuit.', 'Les poules ont des dents.', 'Mon chien lit le journal.',
  'La glace est brûlante.', 'Le bébé conduit le bus.', 'La tortue court plus vite que le train.',
];
const SENSIBLE_SENTENCES = [
  'Le chat boit du lait.', 'La poule pond des œufs.', 'Je mange ma soupe avec une cuillère.',
  'Le chien aboie très fort.', 'Papa met son chapeau sur la tête.', 'L’avion vole dans le ciel.',
  'Je me brosse les dents.', 'La lune brille la nuit.', 'Le poisson nage dans la rivière.',
  'Mon frère lit une histoire.', 'La soupe est brûlante.', 'Les oiseaux font leur nid.',
];
// Niveau 5 : quel point mettre à la fin ? Questions (inversion, « est-ce que », mot interrogatif),
// exclamations (« Quel… ! », « Comme… ! », « Vive… ! ») ou phrases qui racontent.
const PUNCTUATION = [
  ['As-tu un chien', '?'], ['Est-ce que tu viens au parc', '?'], ['Où est mon cartable', '?'],
  ['Quand part le train', '?'], ['Aimes-tu les pommes', '?'], ['Qui a mangé le gâteau', '?'],
  ['Quel beau chien', '!'], ['Comme il fait chaud', '!'], ['Vive les vacances', '!'],
  ['Que ce gâteau est bon', '!'], ['Quelle belle journée', '!'], ['Comme tu as grandi', '!'],
  ['Tom a un chien', '.'], ['Il fait chaud aujourd’hui', '.'], ['Les vacances commencent demain', '.'],
  ['Mamie fait un gâteau', '.'], ['Le train part à midi', '.'], ['Lou range son cartable', '.'],
];

function sentenceStudy(rng, level) {
  if (level === 3) {
    const item = pick(rng, ONE_WORD_CHANGES);
    return {
      key: `phrase:mot:${item.emoji}`,
      text: 'Un seul mot change : quelle phrase va avec l’image ?',
      instruction: 'Lis bien chaque mot : une seule phrase va avec l’image.',
      short: { key: 'phrase:mot', text: 'Quelle phrase ?' },
      stage: { type: 'picture', emoji: item.emoji },
      choices: shuffle(rng, [item.text, ...item.others]).map((s) => ({ value: s, label: s })),
      choiceStyle: 'sentences',
      answer: item.text,
      success: { speak: item.text },
    };
  }
  if (level === 4) {
    const absurd = pick(rng, ABSURD_SENTENCES);
    const options = shuffle(rng, [absurd, ...sample(rng, SENSIBLE_SENTENCES, 2)]);
    return {
      key: `phrase:absurde:${absurd}`,
      text: 'Quelle phrase n’a pas de sens ?',
      instruction: 'Lis les phrases. Une phrase n’a pas de sens : laquelle ?',
      short: { key: 'phrase:absurde', text: 'Pas de sens ?' },
      stage: { type: 'none' },
      choices: options.map((s) => ({ value: s, label: s })),
      choiceStyle: 'sentences',
      answer: absurd,
      success: { speak: `${absurd} Ça n’a pas de sens !` },
    };
  }
  const [text, mark] = pick(rng, PUNCTUATION);
  return {
    key: `phrase:point:${text}`,
    text: 'Quel point faut-il mettre à la fin de la phrase ?',
    instruction: 'Lis la phrase. Quel point faut-il mettre à la fin : un point, un point d’interrogation, ou un point d’exclamation ?',
    short: { key: 'phrase:point', text: 'Quel point ?' },
    stage: { type: 'sentence', text: `${text} □` },
    choices: textChoices(['.', '?', '!']),
    choiceStyle: 'letters',
    answer: mark,
    success: { speak: `${text}${mark === '.' ? '.' : ` ${mark}`}` },
  };
}

// Niveau 6 : des mots à remettre dans l'ordre (la majuscule et le point aident).
const WORD_ORDER = [
  { emoji: '🐱', text: 'Le chat boit du lait.' }, { emoji: '🥚', text: 'La poule pond un œuf.' },
  { emoji: '🦴', text: 'Le chien ronge un os.' }, { emoji: '📰', text: 'Papa lit le journal.' },
  { emoji: '🚲', text: 'Lou fait du vélo.' }, { emoji: '🎂', text: 'Mamie fait un gâteau.' },
  { emoji: '🐟', text: 'Le poisson nage vite.' }, { emoji: '🐦', text: 'Les oiseaux chantent fort.' },
  { emoji: '🍦', text: 'Tom mange une glace.' }, { emoji: '🚂', text: 'Le train arrive en gare.' },
  { emoji: '🚀', text: 'La fusée part très haut.' }, { emoji: '🌧️', text: 'Il pleut sur la ville.' },
];

/** Niveau 6 : remettre les mots d'une phrase dans l'ordre, sans l'entendre (il faut la lire). */
function wordOrder(rng) {
  const item = pick(rng, WORD_ORDER);
  const words = item.text.split(' ');
  let order = shuffle(rng, words.map((_, i) => i));
  if (order.every((v, i) => v === i)) order = [...order.slice(1), order[0]]; // jamais déjà rangés
  return {
    key: `phrase:ordre:${item.text}`,
    interaction: 'order',
    byLabel: true,
    text: 'Remets les mots dans l’ordre pour écrire la phrase.',
    instruction: 'Regarde l’image, et remets les mots dans l’ordre. La majuscule va au début, le point à la fin.',
    short: { key: 'phrase:ordre', text: 'Les mots dans l’ordre !' },
    stage: { type: 'picture', emoji: item.emoji },
    items: order.map((i) => ({ value: i, label: words[i] })),
    order: 'asc',
    sign: '',
    choices: [],
    answer: item.text,
    success: { speak: item.text },
  };
}

// Niveau 7 : une phrase, une question (qui ? quoi ? quand ? où ?). Les intrus sont les autres
// morceaux de la même phrase : ils répondent à une autre question.
const WH_SENTENCES = [
  { text: 'Ce matin, Lou mange une pomme dans le jardin.', parts: {
    qui: ['Qui mange une pomme ?', 'Lou'], quoi: ['Que mange Lou ?', 'une pomme'],
    quand: ['Quand Lou mange-t-elle une pomme ?', 'ce matin'], où: ['Où Lou mange-t-elle une pomme ?', 'dans le jardin'] } },
  { text: 'Samedi, Papa lave la voiture dans la rue.', parts: {
    qui: ['Qui lave la voiture ?', 'Papa'], quoi: ['Que lave Papa ?', 'la voiture'],
    quand: ['Quand Papa lave-t-il la voiture ?', 'samedi'], où: ['Où Papa lave-t-il la voiture ?', 'dans la rue'] } },
  { text: 'Le soir, le chat boit du lait dans la cuisine.', parts: {
    qui: ['Qui boit du lait ?', 'le chat'], quoi: ['Que boit le chat ?', 'du lait'],
    quand: ['Quand le chat boit-il du lait ?', 'le soir'], où: ['Où le chat boit-il du lait ?', 'dans la cuisine'] } },
  { text: 'À midi, Tom mange des frites à la cantine.', parts: {
    qui: ['Qui mange des frites ?', 'Tom'], quoi: ['Que mange Tom ?', 'des frites'],
    quand: ['Quand Tom mange-t-il des frites ?', 'à midi'], où: ['Où Tom mange-t-il des frites ?', 'à la cantine'] } },
  { text: 'Dimanche, Mamie cueille des fleurs au jardin.', parts: {
    qui: ['Qui cueille des fleurs ?', 'Mamie'], quoi: ['Que cueille Mamie ?', 'des fleurs'],
    quand: ['Quand Mamie cueille-t-elle des fleurs ?', 'dimanche'], où: ['Où Mamie cueille-t-elle des fleurs ?', 'au jardin'] } },
  { text: 'Mercredi, Léo joue au ballon dans le parc.', parts: {
    qui: ['Qui joue au ballon ?', 'Léo'], quoi: ['À quoi joue Léo ?', 'au ballon'],
    quand: ['Quand Léo joue-t-il au ballon ?', 'mercredi'], où: ['Où Léo joue-t-il au ballon ?', 'dans le parc'] } },
  { text: 'Hier, Mila a lu un livre dans son lit.', parts: {
    qui: ['Qui a lu un livre ?', 'Mila'], quoi: ['Qu’a lu Mila ?', 'un livre'],
    quand: ['Quand Mila a-t-elle lu un livre ?', 'hier'], où: ['Où Mila a-t-elle lu un livre ?', 'dans son lit'] } },
  { text: 'En hiver, les oiseaux mangent des graines sur le balcon.', parts: {
    qui: ['Qui mange des graines ?', 'les oiseaux'], quoi: ['Que mangent les oiseaux ?', 'des graines'],
    quand: ['Quand les oiseaux mangent-ils des graines ?', 'en hiver'], où: ['Où les oiseaux mangent-ils des graines ?', 'sur le balcon'] } },
];

/** Niveau 7 : répondre à une question sur une phrase (qui ? quoi ? quand ? où ?). */
function whQuestion(rng) {
  const item = pick(rng, WH_SENTENCES);
  const kinds = Object.keys(item.parts);
  const kind = pick(rng, kinds);
  const [question, answer] = item.parts[kind];
  const others = sample(rng, kinds.filter((k) => k !== kind), 2).map((k) => item.parts[k][1]);
  return {
    key: `phrase:question:${question}`,
    text: question,
    instruction: ['Lis la phrase, puis réponds à la question.', question],
    short: { key: 'phrase:question', text: question, speak: [question] },
    replay: [question],
    stage: { type: 'sentence', text: item.text },
    choices: shuffle(rng, [answer, ...others]).map((value) => ({ value, label: value })),
    choiceStyle: 'answers',
    answer,
    success: { speak: [question, `${answer[0].toUpperCase()}${answer.slice(1)}.`] },
  };
}

// Niveau 8 : la phrase négative (ne … pas, n’ devant une voyelle), puis trois phrases mal écrites
// (deux sont proposées à chaque fois).
const NEGATIONS = [
  ['Il pleut.', 'Il ne pleut pas.', 'Il pleut pas.', 'Il ne pas pleut.'],
  ['Le chat dort.', 'Le chat ne dort pas.', 'Le chat dort pas.', 'Le chat ne pas dort.'],
  ['Tom joue au foot.', 'Tom ne joue pas au foot.', 'Tom joue pas au foot.', 'Tom ne pas joue au foot.'],
  ['Elle aime la soupe.', 'Elle n’aime pas la soupe.', 'Elle ne aime pas la soupe.', 'Elle aime pas la soupe.'],
  ['J’ai faim.', 'Je n’ai pas faim.', 'J’ai pas faim.', 'Je ne ai pas faim.'],
  ['Le bébé crie.', 'Le bébé ne crie pas.', 'Le bébé crie pas.', 'Le bébé ne pas crie.'],
  ['Nous partons.', 'Nous ne partons pas.', 'Nous partons pas.', 'Nous ne pas partons.'],
  ['Il est content.', 'Il n’est pas content.', 'Il est pas content.', 'Il ne est pas content.'],
  ['Le train arrive.', 'Le train n’arrive pas.', 'Le train arrive pas.', 'Le train ne arrive pas.'],
  ['Je vois la mer.', 'Je ne vois pas la mer.', 'Je vois pas la mer.', 'Je ne pas vois la mer.'],
  ['Papa chante.', 'Papa ne chante pas.', 'Papa chante pas.', 'Papa ne pas chante.'],
  ['Les poules volent.', 'Les poules ne volent pas.', 'Les poules volent pas.', 'Les poules ne pas volent.'],
  ['Lou a froid.', 'Lou n’a pas froid.', 'Lou a pas froid.', 'Lou ne a pas froid.'],
];

/** Niveau 8 : écrire la phrase à la forme négative. */
function negativeSentence(rng) {
  const [sentence, answer, ...wrong] = pick(rng, NEGATIONS);
  return {
    key: `phrase:negative:${sentence}`,
    text: 'Quelle phrase dit le contraire, avec « ne… pas » ?',
    instruction: 'Lis la phrase. Trouve la même phrase avec ne… pas, bien écrite.',
    short: { key: 'phrase:negative', text: 'Avec « ne… pas » ?' },
    stage: { type: 'sentence', text: sentence },
    choices: shuffle(rng, [answer, ...sample(rng, wrong, 2)]).map((s) => ({ value: s, label: s })),
    choiceStyle: 'sentences',
    answer,
    success: { speak: answer },
  };
}

export const phrase = {
  id: 'phrase',
  domain: 'francais',
  section: 'Lire',
  title: 'Lis la phrase',
  icon: '📝',
  skill: 'Lire et comprendre une phrase, la construire, la ponctuer, la mettre à la forme négative',
  levels: [
    'Phrases courtes', 'Phrases plus longues', 'Un seul mot change', 'La phrase absurde', 'Le bon point : . ? !',
    'Remets les mots en ordre', 'Qui ? Quoi ? Quand ? Où ?', 'La phrase négative',
  ],
  generate(level, rng) {
    if (level === 6) return wordOrder(rng);
    if (level === 7) return whQuestion(rng);
    if (level === 8) return negativeSentence(rng);
    if (level >= 3) return sentenceStudy(rng, level);
    const pool = SENTENCES.filter((s) => s.level === level);
    const [target, ...drawn] = sample(rng, pool, 3);
    // téléphone en paysage : trois phrases longues (chacune sur deux lignes) dépasseraient de l'écran
    const isLong = (s) => s.text.length > LONG_SENTENCE;
    const others = isLong(target) && drawn.every(isLong) ? [drawn[0], pick(rng, pool.filter((s) => !isLong(s)))] : drawn;
    return {
      key: `phrase:${target.emoji}`,
      text: 'Quelle phrase va avec l’image ?',
      instruction: 'Lis les phrases, et trouve celle qui va avec l’image.',
      short: { text: 'Quelle phrase ?' },
      stage: { type: 'picture', emoji: target.emoji },
      choices: shuffle(rng, [target, ...others]).map((s) => ({ value: s.text, label: s.text })),
      choiceStyle: 'sentences',
      answer: target.text,
      success: { speak: target.text },
    };
  },
};

// ---------------------------------------------------------------- Homophones (CE1)

const HOMOPHONES = [
  { level: 1, pair: ['a', 'à'], items: [
    ['Léo ___ un vélo.', 'a'], ['Je vais ___ l’école.', 'à'], ['Elle ___ faim.', 'a'],
    ['Il joue ___ la balle.', 'à'], ['Papa ___ une voiture rouge.', 'a'], ['Nous allons ___ la plage.', 'à']] },
  { level: 1, pair: ['et', 'est'], items: [
    ['Le chat ___ noir.', 'est'], ['Je mange une pomme ___ une poire.', 'et'], ['Il ___ content.', 'est'],
    ['Lucie ___ Tom jouent.', 'et'], ['La soupe ___ chaude.', 'est'], ['J’ai un chien ___ un chat.', 'et']] },
  { level: 2, pair: ['son', 'sont'], items: [
    ['Les enfants ___ dans la cour.', 'sont'], ['Il range ___ cartable.', 'son'],
    ['Les fleurs ___ jolies.', 'sont'], ['Elle mange ___ goûter.', 'son']] },
  { level: 2, pair: ['on', 'ont'], items: [
    ['Ils ___ un ballon.', 'ont'], ['Ce soir, ___ regarde un film.', 'on'],
    ['Mes amis ___ faim.', 'ont'], ['Demain, ___ va au parc.', 'on']] },
  { level: 3, pair: ['ou', 'où'], items: [
    ['Tu veux une pomme ___ une poire ?', 'ou'], ['Je ne sais pas ___ est le chat.', 'où'],
    ['Il joue au foot ___ au tennis.', 'ou'], ['La maison ___ j’habite est jaune.', 'où'],
    ['Tu viens ___ tu restes ?', 'ou'], ['Dis-moi ___ tu vas.', 'où']] },
  // « tu as » (verbe avoir) s'ajoute à a / à : trois mots qui se prononcent pareil
  { level: 4, pair: ['a', 'as', 'à'], items: [
    ['Tu ___ un joli vélo.', 'as'], ['Il ___ un joli vélo.', 'a'], ['Nous allons ___ la piscine.', 'à'],
    ['Tu ___ faim ?', 'as'], ['Maman ___ un chapeau.', 'a'], ['Je pense ___ toi.', 'à'],
    ['Tu ___ perdu ta clé.', 'as'], ['Léa ___ six ans.', 'a'], ['Il va ___ Paris.', 'à']] },
  // niveaux 6 à 8 : la / là, ce / se, c’est / s’est
  { level: 6, pair: ['la', 'là'], items: [
    ['Le chat est ___, sous la table.', 'là'], ['Je mange ___ pomme.', 'la'], ['Viens ___, près de moi !', 'là'],
    ['Elle ferme ___ porte.', 'la'], ['Mon livre est ___, sur le lit.', 'là'], ['Il range ___ boîte.', 'la'],
    ['Pose ton sac ___, dans le coin.', 'là'], ['Lou chante ___ chanson.', 'la']] },
  { level: 7, pair: ['ce', 'se'], items: [
    ['Il ___ lave les mains.', 'se'], ['Regarde ___ chien !', 'ce'], ['Elle ___ cache sous le lit.', 'se'],
    ['J’aime ___ gâteau.', 'ce'], ['Le chat ___ couche au soleil.', 'se'], ['Je mets ___ pull.', 'ce'],
    ['Ils ___ disent bonjour.', 'se'], ['Tu as vu ___ bateau ?', 'ce']] },
  { level: 8, pair: ['c’est', 's’est'], items: [
    ['Regarde, ___ mon chien !', 'c’est'], ['Le chat ___ caché.', 's’est'], ['Lou ___ coupée au doigt.', 's’est'],
    ['Ce gâteau, ___ pour toi.', 'c’est'], ['Il ___ levé tôt.', 's’est'], ['Vite, ___ l’heure !', 'c’est'],
    ['Mamie ___ assise.', 's’est'], ['Oh, ___ très beau !', 'c’est']] },
];
// Niveau 5 : deux mots à trouver dans la même phrase (les deux homophones d'une paire).
const DOUBLE_HOMOPHONES = [
  { pair: ['et', 'est'], text: 'Le chat ___ noir ___ blanc.', answer: ['est', 'et'] },
  { pair: ['et', 'est'], text: 'Léo ___ Lou jouent : Léo ___ content.', answer: ['et', 'est'] },
  { pair: ['et', 'est'], text: 'Mila ___ grande ___ très drôle.', answer: ['est', 'et'] },
  { pair: ['a', 'à'], text: 'Léo ___ mal ___ la tête.', answer: ['a', 'à'] },
  { pair: ['a', 'à'], text: 'Il va ___ la piscine : il ___ son maillot.', answer: ['à', 'a'] },
  { pair: ['a', 'à'], text: 'Papa ___ un vélo ___ trois roues.', answer: ['a', 'à'] },
  { pair: ['son', 'sont'], text: 'Tom range ___ sac : ses livres ___ dedans.', answer: ['son', 'sont'] },
  { pair: ['son', 'sont'], text: 'Ses amis ___ venus pour ___ anniversaire.', answer: ['sont', 'son'] },
  { pair: ['on', 'ont'], text: 'Demain, ___ va chez mes cousins : ils ___ un chien.', answer: ['on', 'ont'] },
  { pair: ['on', 'ont'], text: 'Les élèves ___ fini : ___ peut sortir.', answer: ['ont', 'on'] },
  { pair: ['ou', 'où'], text: 'Va ___ tu veux : au parc ___ à la plage.', answer: ['où', 'ou'] },
  { pair: ['ou', 'où'], text: 'Dis-moi ___ tu vas : chez Léa ___ chez Tom ?', answer: ['où', 'ou'] },
];

function doubleHomophone(rng) {
  const item = pick(rng, DOUBLE_HOMOPHONES);
  const [p, q] = item.pair;
  let k = 0;
  const full = item.text.replace(/___/g, () => item.answer[k++]);
  return {
    key: `homophones:deux:${item.text}`,
    text: 'Quels mots complètent la phrase ?',
    instruction: [full, 'Quels mots faut-il écrire, dans l’ordre ?'],
    short: { key: 'homophones:deux', text: 'Quels mots ?', speak: [full] },
    replay: [full],
    stage: { type: 'sentence', text: item.text.replace(/___/g, '…') },
    choices: [[p, p], [p, q], [q, p], [q, q]].map(([x, y]) => ({ value: `${x}|${y}`, label: `${x} … ${y}` })),
    choiceStyle: 'words',
    answer: item.answer.join('|'),
    success: { speak: full },
  };
}

export const homophones = {
  id: 'homophones',
  domain: 'francais',
  section: 'Grammaire',
  title: 'Le bon petit mot',
  icon: '🧐',
  skill: 'Choisir le bon homophone : a/à/as, et/est, son/sont, on/ont, ou/où, la/là, ce/se, c’est/s’est',
  levels: [
    'a / à et et / est', 'Aussi son / sont et on / ont', 'Aussi ou / où', 'a, as ou à', 'Deux mots à trouver',
    'Aussi la / là', 'Aussi ce / se', 'Aussi c’est / s’est',
  ],
  generate(level, rng) {
    if (level === 5) return doubleHomophone(rng);
    // niveaux 3, 4 et 6 à 8 : surtout la nouvelle paire, et parfois une révision des précédentes
    const fresh = level <= 2 || rng() < 0.75;
    const sets = HOMOPHONES.filter((h) => (level <= 2 ? h.level <= level : fresh ? h.level === level : h.level < level));
    const set = pick(rng, sets);
    const [sentence, answer] = pick(rng, set.items);
    const full = sentence.replace('___', answer);
    return {
      key: `homophones:${sentence}`,
      text: 'Quel mot complète la phrase ?',
      instruction: [full, 'Quel mot faut-il écrire ?'],
      short: { text: 'Quel mot ?', speak: [full] },
      replay: [full],
      stage: { type: 'sentence', text: sentence.replace('___', '…') },
      choices: textChoices(set.pair),
      choiceStyle: 'words',
      answer,
      success: { speak: full },
    };
  },
};

// ---------------------------------------------------------------- Un, une, le, la, les

const NOUNS = [
  { w: 'chat', g: 'm', pl: 'chats' }, { w: 'maison', g: 'f', pl: 'maisons' }, { w: 'voiture', g: 'f', pl: 'voitures' },
  { w: 'ballon', g: 'm', pl: 'ballons' }, { w: 'pomme', g: 'f', pl: 'pommes' }, { w: 'livre', g: 'm', pl: 'livres' },
  { w: 'fleur', g: 'f', pl: 'fleurs' }, { w: 'lapin', g: 'm', pl: 'lapins' }, { w: 'fusée', g: 'f', pl: 'fusées' },
  { w: 'gâteau', g: 'm', pl: 'gâteaux' }, { w: 'fraise', g: 'f', pl: 'fraises' }, { w: 'bateau', g: 'm', pl: 'bateaux' },
  { w: 'poule', g: 'f', pl: 'poules' }, { w: 'lion', g: 'm', pl: 'lions' }, { w: 'vache', g: 'f', pl: 'vaches' },
  { w: 'étoile', g: 'f', pl: 'étoiles' }, { w: 'avion', g: 'm', pl: 'avions' }, { w: 'abeille', g: 'f', pl: 'abeilles' },
  { w: 'éléphant', g: 'm', pl: 'éléphants' }, { w: 'oiseau', g: 'm', pl: 'oiseaux' }, { w: 'arbre', g: 'm', pl: 'arbres' },
];
const startsWithVowel = (w) => /^[aeéiouy]/.test(w);

/** Niveau 5 : ce, cet (devant un nom masculin qui commence par une voyelle), cette, ces. */
function demonstrative(rng) {
  const answer = pick(rng, ['ce', 'cet', 'cette', 'ces']);
  const pools = {
    ce: NOUNS.filter((n) => n.g === 'm' && !startsWithVowel(n.w)),
    cet: NOUNS.filter((n) => n.g === 'm' && startsWithVowel(n.w)),
    cette: NOUNS.filter((n) => n.g === 'f'),
    ces: NOUNS,
  };
  const noun = pick(rng, pools[answer]);
  const plural = answer === 'ces';
  const shown = plural ? noun.pl : noun.w;
  return {
    key: `genre:5:${shown}`,
    text: `Quel petit mot va devant « ${shown} » ?`,
    instruction: `Quel petit mot va devant : ${shown} ? Ce, cet, cette, ou ces ?`,
    short: { key: 'genre:ce', text: `Devant « ${shown} » ?`, speak: `${shown} ?` },
    stage: { type: 'objects', emoji: PICTURES[noun.w], count: plural ? 3 : 1, perRow: 5 },
    choices: textChoices(['ce', 'cet', 'cette', 'ces']),
    choiceStyle: 'words',
    answer,
    success: { speak: `${answer} ${shown}` },
  };
}

/** Niveau 6 : accorder l'adjectif avec le nom (petit, petite, petits, petites). */
const ADJECTIVES = ['petit', 'grand', 'joli'];

function adjectiveAgreement(rng) {
  const noun = pick(rng, NOUNS);
  const adj = pick(rng, ADJECTIVES);
  const plural = rng() < 0.5;
  const forms = [adj, `${adj}e`, `${adj}s`, `${adj}es`];
  const answer = forms[(noun.g === 'f' ? 1 : 0) + (plural ? 2 : 0)];
  const det = plural ? 'les' : noun.g === 'm' ? 'le' : 'la';
  const shown = plural ? noun.pl : noun.w;
  const full = `Regarde ${det} ${answer} ${shown} !`;
  return {
    key: `genre:6:${adj}:${shown}`,
    text: 'Comment s’écrit le mot qui manque ?',
    instruction: [full, 'Comment faut-il écrire le mot qui manque ?'],
    short: { key: 'genre:accord', text: 'Quel mot ?', speak: [full] },
    replay: [full],
    stage: { type: 'sentence', text: `Regarde ${det} … ${shown} !` },
    choices: textChoices(forms),
    choiceStyle: 'words',
    answer,
    success: { speak: full },
  };
}

// Niveau 7 : des noms en -eau, -al et -eu (pluriel en x), mêlés aux noms de NOUNS (pluriel en s).
const X_NOUNS = [
  { w: 'château', g: 'm', pl: 'châteaux' }, { w: 'chapeau', g: 'm', pl: 'chapeaux' },
  { w: 'cadeau', g: 'm', pl: 'cadeaux' }, { w: 'cheval', g: 'm', pl: 'chevaux' },
  { w: 'journal', g: 'm', pl: 'journaux' }, { w: 'feu', g: 'm', pl: 'feux' },
];

/** Les trois écritures proposées : le nom sans marque du pluriel, avec un s, avec un x (-al → -aux). */
function pluralForms(w) {
  return [w, `${w}s`, w.endsWith('al') ? `${w.slice(0, -2)}aux` : `${w}x`];
}

/** Niveau 7 : écrire le nom au pluriel (s ou x). */
function nounPlural(rng) {
  const noun = rng() < 0.4 ? pick(rng, X_NOUNS) : pick(rng, [...NOUNS, ...X_NOUNS]);
  return {
    key: `genre:7:${noun.pl}`,
    text: 'Des… Comment s’écrit ce mot au pluriel ?',
    instruction: `Comment écrit-on : des ${noun.pl} ? Avec un s, avec un x, ou sans rien ?`,
    short: { key: 'genre:pluriel', text: 'Au pluriel ?', speak: `des ${noun.pl} ?` },
    stage: { type: 'objects', emoji: PICTURES[noun.w], count: 3, perRow: 5 },
    choices: textChoices(pluralForms(noun.w)),
    choiceStyle: 'words',
    answer: noun.pl,
    success: { speak: `des ${noun.pl}` },
  };
}

/** Niveau 8 : le déterminant, l'adjectif et le nom s'accordent ensemble (« les petites fleurs »). */
function nounPhraseAgreement(rng) {
  const noun = pick(rng, NOUNS);
  const adj = pick(rng, ADJECTIVES);
  const plural = rng() < 0.6;
  const fem = noun.g === 'f';
  const det = plural ? 'les' : fem ? 'la' : 'le';
  const adjOf = (f, p) => `${adj}${f ? 'e' : ''}${p ? 's' : ''}`;
  const group = (a, n) => `${det} ${a} ${n}`;
  const answer = group(adjOf(fem, plural), plural ? noun.pl : noun.w);
  // une erreur sur le nom, une erreur sur l'adjectif (le genre, ou le nombre)
  const wrongNoun = group(adjOf(fem, plural), plural ? noun.w : noun.pl);
  const wrongAdj = group(rng() < 0.5 ? adjOf(!fem, plural) : adjOf(fem, !plural), plural ? noun.pl : noun.w);
  return {
    key: `genre:8:${answer}`,
    text: 'Quel groupe de mots est bien accordé ?',
    instruction: 'Lis bien chaque mot : un seul groupe de mots est bien accordé. Lequel ?',
    short: { key: 'genre:groupe', text: 'Bien accordé ?' },
    stage: { type: 'objects', emoji: PICTURES[noun.w], count: plural ? 3 : 1, perRow: 5 },
    choices: shuffle(rng, [answer, wrongNoun, wrongAdj]).map((v) => ({ value: v, label: v })),
    choiceStyle: 'sentences',
    answer,
    success: { speak: answer },
  };
}

export const determinants = {
  id: 'genre',
  domain: 'francais',
  section: 'Grammaire',
  title: 'Un, une, le, la',
  icon: '🏷️',
  skill: 'Choisir le bon déterminant (genre et nombre), accorder l’adjectif et le nom',
  levels: [
    'un ou une', "le, la ou l'", 'le, la ou les', 'mon, ma ou mes', 'ce, cet, cette ou ces', 'L’adjectif s’accorde',
    'Le nom au pluriel', 'Tout le groupe s’accorde',
  ],
  generate(level, rng) {
    if (level === 5) return demonstrative(rng);
    if (level === 6) return adjectiveAgreement(rng);
    if (level === 7) return nounPlural(rng);
    if (level === 8) return nounPhraseAgreement(rng);
    const noun = pick(rng, level >= 3 ? NOUNS.filter((n) => !startsWithVowel(n.w)) : NOUNS);
    let pair;
    let answer;
    let shown = noun.w;
    let count = 1;
    if (level === 1) {
      pair = ['un', 'une'];
      answer = noun.g === 'm' ? 'un' : 'une';
    } else if (level === 2) {
      pair = ['le', 'la', "l'"];
      answer = startsWithVowel(noun.w) ? "l'" : noun.g === 'm' ? 'le' : 'la';
    } else {
      // niveau 4 : mon, ma, mes (« mon étoile » : les noms qui commencent par une voyelle sont exclus)
      pair = level === 3 ? ['le', 'la', 'les'] : ['mon', 'ma', 'mes'];
      const plural = rng() < 0.5;
      count = plural ? 3 : 1;
      shown = plural ? noun.pl : noun.w;
      answer = plural ? pair[2] : noun.g === 'm' ? pair[0] : pair[1];
    }
    const full = answer === "l'" ? `l'${shown}` : `${answer} ${shown}`;
    return {
      key: `genre:${level}:${shown}`,
      text: `Quel petit mot va devant « ${shown} » ?`,
      instruction: `Quel petit mot va devant : ${shown} ?`,
      short: { key: 'genre', text: `Devant « ${shown} » ?`, speak: `${shown} ?` },
      stage: { type: 'objects', emoji: PICTURES[noun.w], count, perRow: 5 },
      choices: textChoices(pair),
      choiceStyle: 'words',
      answer,
      success: { speak: full },
    };
  },
};

export const FRANCAIS_EXTRA_GAMES = [syllabesRythme, rimes, lettres, phrase, homophones, determinants];

/** Données de conscience phonologique (pour les tests). */
export const SOUND_DATA = {
  SYLLABLE_WORDS, RHYMES, SAME_START, SAME_END, SPOKEN_SYLLABLES, START_TRAPS, SENSE_TRAPS, RHYME_SOUNDS,
};

/** Données des niveaux de grammaire (pour les tests). */
export const GRAMMAR_DATA = { WORD_ORDER, WH_SENTENCES, NEGATIONS, HOMOPHONES, NOUNS, X_NOUNS };
