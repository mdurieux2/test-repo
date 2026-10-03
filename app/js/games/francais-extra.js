// Jeux de français pour la maternelle (conscience phonologique, lettres) et le CE1
// (compréhension de phrases, homophones, déterminants).

import { pick, sample, shuffle } from '../random.js';
import { textChoices } from './helpers.js';
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
const EXTRA_PICTURES = { ours: '🐻', kangourou: '🦘', coccinelle: '🐞', hélicoptère: '🚁', télévision: '📺' };
const pictureOf = (w) => PICTURES[w] || EXTRA_PICTURES[w];

export const syllabesRythme = {
  id: 'syllabes-rythme',
  domain: 'francais',
  section: 'Écouter les sons',
  title: 'Frappe les syllabes',
  icon: '👏',
  skill: 'Compter les syllabes d’un mot à l’oral (conscience phonologique)',
  levels: ['Mots de 1 ou 2 syllabes', "Jusqu'à 3 syllabes", "Jusqu'à 4 syllabes"],
  generate(level, rng) {
    const maxSyll = level + 1;
    const count = pick(rng, Array.from({ length: maxSyll }, (_, i) => i + 1));
    const word = pick(rng, SYLLABLE_WORDS[count]);
    const choices = Array.from({ length: Math.max(3, maxSyll) }, (_, i) => ({ value: i + 1, label: '👏'.repeat(i + 1) }));
    return {
      key: `syllabes-rythme:${word}`,
      text: 'Combien de syllabes entends-tu ? Frappe dans tes mains !',
      instruction: ['Frappe dans tes mains, et compte les syllabes du mot :', { text: word, rate: 0.6 }],
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

export const rimes = {
  id: 'rimes',
  domain: 'francais',
  section: 'Écouter les sons',
  title: 'Les rimes',
  icon: '🎵',
  skill: 'Repérer les mots qui riment (même son à la fin)',
  levels: ['3 images', '4 images'],
  generate(level, rng) {
    const group = pick(rng, RHYMES);
    const [target, rhyme] = sample(rng, group, 2);
    const others = RHYMES.filter((g) => g !== group).flat();
    const options = shuffle(rng, [rhyme, ...sample(rng, others, level + 1)]);
    const list = options.map((w, i) => (i === options.length - 1 ? `ou ${w}` : w)).join(', ');
    return {
      key: `rimes:${target}`,
      text: `Quel mot rime avec « ${target} » ?`,
      instruction: [`Quel mot rime avec : ${target} ?`, list],
      stage: { type: 'picture', emoji: pictureOf(target) },
      choices: options.map((w) => ({ value: w, label: pictureOf(w) })),
      choiceStyle: 'pictures',
      answer: rhyme,
      success: { speak: `${target}, ${rhyme} : ça rime !` },
    };
  },
};

// ---------------------------------------------------------------- Les lettres

const LETTER_NAMES = {
  a: 'a', b: 'bé', c: 'cé', d: 'dé', e: 'e', f: 'effe', g: 'gé', h: 'ache', i: 'i', j: 'ji', k: 'ka',
  l: 'elle', m: 'emme', n: 'enne', o: 'o', p: 'pé', q: 'cu', r: 'erre', s: 'esse', t: 'té', u: 'u',
  v: 'vé', w: 'double vé', x: 'ixe', y: 'i grec', z: 'zède',
};
const ALPHABET = Object.keys(LETTER_NAMES);
const VOWELS = ['a', 'e', 'i', 'o', 'u'];
// Lettres faciles à confondre : on les propose ensemble pour bien les distinguer.
const LOOK_ALIKE = [['b', 'd', 'p', 'q'], ['m', 'n', 'u'], ['e', 'f'], ['i', 'j', 'l'], ['o', 'c'], ['v', 'w', 'y']];

export const lettres = {
  id: 'lettres',
  domain: 'francais',
  section: 'Lettres et sons',
  title: 'Les lettres',
  icon: '🔠',
  skill: 'Reconnaître les lettres et connaître leur nom',
  levels: ['Les voyelles en capitales', 'Toutes les capitales', 'Les lettres minuscules', 'Majuscule et minuscule'],
  generate(level, rng) {
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
        instruction: ['Voici la lettre', name, 'en majuscule. Trouve-la en minuscule !'],
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

export const phrase = {
  id: 'phrase',
  domain: 'francais',
  section: 'Lire',
  title: 'Lis la phrase',
  icon: '📝',
  skill: 'Lire et comprendre une phrase',
  levels: ['Phrases courtes', 'Phrases plus longues'],
  generate(level, rng) {
    const pool = SENTENCES.filter((s) => s.level === level);
    const [target, ...others] = sample(rng, pool, 3);
    return {
      key: `phrase:${target.emoji}`,
      text: 'Quelle phrase va avec l’image ?',
      instruction: 'Lis les phrases, et trouve celle qui va avec l’image.',
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
];

export const homophones = {
  id: 'homophones',
  domain: 'francais',
  section: 'Grammaire',
  title: 'Le bon petit mot',
  icon: '🧐',
  skill: 'Choisir le bon homophone : a/à, et/est, son/sont, on/ont',
  levels: ['a / à et et / est', 'Aussi son / sont et on / ont'],
  generate(level, rng) {
    const set = pick(rng, HOMOPHONES.filter((h) => h.level <= level));
    const [sentence, answer] = pick(rng, set.items);
    const full = sentence.replace('___', answer);
    return {
      key: `homophones:${sentence}`,
      text: 'Quel mot complète la phrase ?',
      instruction: [full, 'Quel mot faut-il écrire ?'],
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

export const determinants = {
  id: 'genre',
  domain: 'francais',
  section: 'Grammaire',
  title: 'Un, une, le, la',
  icon: '🏷️',
  skill: 'Choisir le bon déterminant (genre et nombre)',
  levels: ['un ou une', "le, la ou l'", 'le, la ou les'],
  generate(level, rng) {
    const noun = pick(rng, level === 3 ? NOUNS.filter((n) => !startsWithVowel(n.w)) : NOUNS);
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
      pair = ['le', 'la', 'les'];
      const plural = rng() < 0.5;
      count = plural ? 3 : 1;
      shown = plural ? noun.pl : noun.w;
      answer = plural ? 'les' : noun.g === 'm' ? 'le' : 'la';
    }
    const full = answer === "l'" ? `l'${shown}` : `${answer} ${shown}`;
    return {
      key: `genre:${level}:${shown}`,
      text: `Quel petit mot va devant « ${shown} » ?`,
      instruction: `Quel petit mot va devant : ${shown} ?`,
      stage: { type: 'objects', emoji: PICTURES[noun.w], count, perRow: 5 },
      choices: textChoices(pair),
      choiceStyle: 'words',
      answer,
      success: { speak: full },
    };
  },
};

export const FRANCAIS_EXTRA_GAMES = [syllabesRythme, rimes, lettres, phrase, homophones, determinants];
