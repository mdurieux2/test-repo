// Jeux de mathématiques : dénombrement (4 séries), nombres et calcul.

import { pick, randInt, sample, shuffle } from '../random.js';
import { numberChoices } from './helpers.js';

const DENOMBREMENT = 'Dénombrement';
const CALCUL = 'Nombres et calcul';

const OBJECTS = [
  { emoji: '🍎', one: 'pomme', many: 'pommes', f: true }, { emoji: '⭐', one: 'étoile', many: 'étoiles', f: true },
  { emoji: '🐟', one: 'poisson', many: 'poissons' }, { emoji: '🚗', one: 'voiture', many: 'voitures', f: true },
  { emoji: '🦋', one: 'papillon', many: 'papillons' }, { emoji: '🍓', one: 'fraise', many: 'fraises', f: true },
  { emoji: '🐞', one: 'coccinelle', many: 'coccinelles', f: true }, { emoji: '🌸', one: 'fleur', many: 'fleurs', f: true },
  { emoji: '⚽', one: 'ballon', many: 'ballons' }, { emoji: '🐥', one: 'poussin', many: 'poussins' },
  { emoji: '🧁', one: 'gâteau', many: 'gâteaux' }, { emoji: '🐸', one: 'grenouille', many: 'grenouilles', f: true },
];

const FRUITS = [
  { emoji: '🍎', one: 'pomme', many: 'pommes', f: true }, { emoji: '🍓', one: 'fraise', many: 'fraises', f: true },
  { emoji: '🍊', one: 'orange', many: 'oranges', f: true }, { emoji: '🍌', one: 'banane', many: 'bananes', f: true },
  { emoji: '🥕', one: 'carotte', many: 'carottes', f: true }, { emoji: '🍐', one: 'poire', many: 'poires', f: true },
  { emoji: '🥝', one: 'kiwi', many: 'kiwis' }, { emoji: '🍋', one: 'citron', many: 'citrons' },
];

function numberOptions(values) {
  return values.map((n) => ({ value: n, label: String(n) }));
}

/** « de pommes », « d’étoiles » */
function deMany(obj) {
  return /^[aeiouéèêh]/i.test(obj.many) ? `d’${obj.many}` : `de ${obj.many}`;
}

const capitalize = (text) => `${text[0].toUpperCase()}${text.slice(1)}`;

/** Remplace un distracteur par `trap` (erreur classique), s'il n'est pas déjà parmi les choix. */
function withTrap(rng, values, answer, trap) {
  if (trap === answer || values.includes(trap)) return values;
  const out = [...values];
  out[out.findIndex((v) => v !== answer)] = trap;
  return shuffle(rng, out);
}

/**
 * Nombres proches + un distracteur à ±10 (erreur classique sur les dizaines),
 * ou à ±`step` (un paquet de trop ou de moins).
 */
function choicesWithTens(rng, answer, count, min, max, step = 10) {
  const values = numberChoices(rng, answer, count, min, max);
  const tens = [answer + step, answer - step].filter((n) => n >= min && n <= max && !values.includes(n));
  if (tens.length && count >= 4) {
    const replace = values.findIndex((v) => v !== answer);
    values[replace] = pick(rng, tens);
  }
  return shuffle(rng, values);
}

/** Positions « en désordre » sans chevauchement : cases d'une grille, légèrement décalées. */
export function scatterPositions(rng, count) {
  const cols = count <= 10 ? 4 : 6;
  const rows = count <= 10 ? 4 : 5;
  const cells = sample(rng, Array.from({ length: cols * rows }, (_, i) => i), count);
  const jitter = () => (rng() - 0.5) * 0.4;
  return cells.map((cell) => ({
    x: Math.round(((cell % cols) + 0.5 + jitter()) * (1000 / cols)) / 10,
    y: Math.round((Math.floor(cell / cols) + 0.5 + jitter()) * (1000 / rows)) / 10,
  }));
}

// ---------------------------------------------------------------- Dénombrement

export const compter = {
  id: 'compter',
  domain: 'maths',
  section: DENOMBREMENT,
  title: 'Combien ?',
  icon: '🍎',
  skill: 'Dénombrer une collection (pointer chaque objet en comptant)',
  levels: [
    "Jusqu'à 5, objets rangés",
    "Jusqu'à 10, objets rangés",
    "Jusqu'à 10, objets en désordre",
    "Jusqu'à 20, rangés par 10",
    "Jusqu'à 20, en désordre",
    "Jusqu'à 30, rangés par 10",
    'Trouve la bonne collection',
    'Trier, puis compter',
    'Un de plus, un de moins',
  ],
  generate(level, rng) {
    if (level === 7) return collectionQuestion(rng);
    if (level === 8) return sortAndCountQuestion(rng);
    if (level === 9) return oneMoreQuestion(rng);
    const [min, max, layout, choiceCount] = [
      [1, 5, 'rows', 3], [1, 10, 'rows', 3], [3, 10, 'scatter', 3],
      [10, 20, 'rows', 4], [8, 20, 'scatter', 4], [20, 30, 'rows', 4],
    ][level - 1];
    const count = randInt(rng, min, max);
    const obj = pick(rng, OBJECTS);
    const stage = layout === 'scatter'
      ? { type: 'scatter', emoji: obj.emoji, count, positions: scatterPositions(rng, count) }
      : { type: 'objects', emoji: obj.emoji, count, perRow: max > 10 ? 10 : 5 };
    const tip = layout === 'scatter' ? ' Touche chaque objet pour le compter.' : '';
    return {
      key: `compter:${count}`,
      text: `Combien y a-t-il ${deMany(obj)} ?`,
      instruction: `Combien y a-t-il ${deMany(obj)} ?${tip}`,
      short: { key: `compter:${layout}`, text: `Combien ${deMany(obj)} ?` },
      stage,
      choices: numberOptions(choicesWithTens(rng, count, choiceCount, 1, Math.max(max, 6))),
      choiceStyle: 'numbers',
      answer: count,
      success: { speak: `${count} ${count > 1 ? obj.many : obj.one}` },
    };
  },
};

/** Le nombre est donné : trouver la collection qui a ce nombre d'objets. */
function collectionQuestion(rng) {
  const n = randInt(rng, 4, 10);
  const obj = pick(rng, OBJECTS);
  return {
    key: `compter:collection:${n}`,
    text: `Touche le groupe de ${n} ${obj.many}.`,
    instruction: `Touche le groupe où il y a ${n} ${obj.many}. Compte bien chaque groupe !`,
    short: { key: 'compter:collection', text: `Le groupe de ${n} ${obj.many} ?` },
    stage: { type: 'none' },
    choices: numberChoices(rng, n, 3, 2, 10).map((v) => ({ value: v, objects: { emoji: obj.emoji, count: v } })),
    choiceStyle: 'objects',
    answer: n,
    success: { speak: `${n} ${obj.many}` },
  };
}

/** Une collection mélangée : ne compter qu'une sorte d'objets (trier avant de dénombrer). */
function sortAndCountQuestion(rng) {
  const [target, other] = sample(rng, OBJECTS, 2);
  const total = randInt(rng, 9, 14);
  const n = randInt(rng, 3, total - 3);
  const items = shuffle(rng, [...Array(n).fill(target.emoji), ...Array(total - n).fill(other.emoji)]);
  return {
    key: `compter:tri:${items.join('')}`,
    text: `Combien y a-t-il ${deMany(target)} ?`,
    instruction: `Attention, il y a des ${target.many} et des ${other.many}. Combien y a-t-il ${deMany(target)} ?`,
    short: { key: 'compter:tri', text: `Combien ${deMany(target)} ?` },
    stage: { type: 'pattern', items },
    // piège : compter tous les objets
    choices: numberOptions(withTrap(rng, numberChoices(rng, n, 4, 1, total), n, total)),
    choiceStyle: 'numbers',
    answer: n,
    success: { speak: `${n} ${target.many}` },
  };
}

/** Un de plus, un de moins : compter, puis trouver le nombre suivant (ou précédent). */
function oneMoreQuestion(rng) {
  const n = randInt(rng, 5, 19);
  const obj = pick(rng, OBJECTS);
  const more = rng() < 0.5;
  const answer = more ? n + 1 : n - 1;
  const article = obj.f ? 'une' : 'un';
  const question = more
    ? `Si on ajoute ${article} ${obj.one}, combien y aura-t-il ${deMany(obj)} ?`
    : `Si on enlève ${article} ${obj.one}, combien restera-t-il ${deMany(obj)} ?`;
  return {
    key: `compter:plus-moins:${n}:${more}`,
    text: question,
    instruction: `Compte les ${obj.many}. ${question}`,
    short: { key: 'compter:plus-moins', text: `${capitalize(article)} ${obj.one} de ${more ? 'plus' : 'moins'} ?` },
    stage: { type: 'objects', emoji: obj.emoji, count: n, perRow: n > 10 ? 10 : 5 },
    // piège : oublier d'ajouter (ou d'enlever)
    choices: numberOptions(withTrap(rng, numberChoices(rng, answer, 4, 1, 21), answer, n)),
    choiceStyle: 'numbers',
    answer,
    success: { speak: more ? `${n}, et encore ${article} : ${answer} !` : `${n}, moins ${article} : il en reste ${answer} !` },
  };
}

export const viteVu = {
  id: 'vite-vu',
  domain: 'maths',
  section: DENOMBREMENT,
  title: 'Vite vu !',
  icon: '👀',
  skill: 'Reconnaître une quantité d’un coup d’œil (dé, boîte de 10, dizaines), calcul flash',
  levels: [
    'Les points du dé (1 à 6)', 'La boîte de 10 (1 à 10)', 'Deux boîtes de 10 (11 à 20)', 'Dizaines et unités (jusqu’à 50)',
    'Calcul flash : additions', 'Calcul flash : + et −', 'Calcul flash jusqu’à 20',
  ],
  generate(level, rng) {
    if (level >= 5) return flashCalculation(rng, level);
    let n;
    let inner;
    if (level === 1) {
      n = randInt(rng, 1, 6);
      inner = { type: 'dice', value: n };
    } else if (level === 2) {
      n = randInt(rng, 1, 10);
      inner = { type: 'frames', filled: n, frames: 1 };
    } else if (level === 3) {
      n = randInt(rng, 11, 20);
      inner = { type: 'frames', filled: n, frames: 2 };
    } else {
      n = randInt(rng, 11, 50);
      inner = { type: 'blocks', tens: Math.floor(n / 10), units: n % 10 };
    }
    const max = [6, 10, 20, 50][level - 1];
    return {
      key: `vite-vu:${n}`,
      text: 'Regarde bien… Combien y en a-t-il ?',
      instruction: 'Regarde bien ! Combien y en a-t-il ?',
      short: { text: 'Combien ?' },
      stage: { type: 'flash', duration: [2500, 2500, 3000, 3500][level - 1], inner },
      choices: numberOptions(choicesWithTens(rng, n, level >= 3 ? 4 : 3, 1, max)),
      choiceStyle: 'numbers',
      answer: n,
      success: { speak: String(n) },
    };
  },
};

// Calcul flash : le calcul s'affiche quelques secondes puis se cache ; on le retient et on calcule.
const FLASH_LEVELS = {
  5: { op: '+', max: 10, duration: 3000 },
  6: { op: '±', max: 10, duration: 3000 },
  7: { op: '±', max: 20, duration: 3500 },
};

function flashCalculation(rng, level) {
  const { op: kind, max, duration } = FLASH_LEVELS[level];
  const { a, b, op, answer } = palierOperation(rng, { op: kind, max });
  return {
    key: `vite-vu:${a}${op}${b}`,
    text: 'Calcul flash ! Combien ça fait ?',
    // le calcul n'est pas dit à voix haute : il faut le lire avant qu'il se cache
    instruction: 'Calcul flash ! Regarde bien le calcul avant qu’il se cache. Combien ça fait ?',
    short: { key: 'vite-vu:calcul', text: 'Combien ça fait ?' },
    stage: { type: 'flash', duration, inner: { type: 'equation', parts: [a, op, b, '=', null] } },
    choices: numberOptions(numberChoices(rng, answer, 4, 0, 20)),
    choiceStyle: 'numbers',
    answer,
    success: { speak: `${a} ${opWord(op)} ${b}, égale ${answer}` },
  };
}

/** « un citron », « 3 citrons » */
function quantity(fruit, n) {
  return n === 1 ? `${fruit.f ? 'une' : 'un'} ${fruit.one}` : `${n} ${fruit.many}`;
}

/** « 6 bananes, 3 pommes et 2 fraises » */
function listPhrase(parts) {
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} et ${parts.at(-1)}`;
}

// Niveaux du panier : un seul fruit, puis des « listes de courses » de 2 ou 3 fruits ;
// enfin, le nombre à mettre se calcule (ce qui manque, le double, la moitié).
const PANIER_LEVELS = [
  { label: "Jusqu'à 5", kinds: 1, min: 1, max: 5 },
  { label: "Jusqu'à 10", kinds: 1, min: 1, max: 10 },
  { label: 'Liste de courses : 2 fruits', kinds: 2, min: 1, max: 5 },
  { label: 'Liste de courses : 3 fruits', kinds: 3, min: 1, max: 6 },
  { label: 'De 11 à 20', kinds: 1, min: 11, max: 20 },
  { label: 'De 20 à 50 avec des sachets de 10', kinds: 1, min: 20, max: 50, tens: true },
  { label: 'Liste de courses : 3 fruits, jusqu’à 10 de chaque', kinds: 3, min: 2, max: 10 },
  // le premier fruit, de 21 à 49, se range aussi en sachets de 10
  { label: '2 fruits, avec des sachets', kinds: 2, min: 2, max: 9, tens: true, first: [21, 49] },
  { label: 'Mettre ce qui manque', kinds: 1, mode: 'manque' },
  { label: 'Le double, la moitié', kinds: 1, mode: 'double' },
];

export const panier = {
  id: 'panier',
  domain: 'maths',
  section: DENOMBREMENT,
  title: 'Le panier',
  icon: '🧺',
  skill: 'Fabriquer une collection d’un nombre donné (plusieurs fruits à la fois), grouper par 10',
  levels: PANIER_LEVELS.map((l) => l.label),
  generate(level, rng) {
    const { kinds, min, max, tens = false, first, mode } = PANIER_LEVELS[level - 1];
    if (mode) return basketToCompute(rng, mode);
    const items = sample(rng, FRUITS, kinds).map((fruit) => ({ ...fruit, target: randInt(rng, min, max) }));
    if (first) items[0].target = randInt(rng, ...first);
    const what = listPhrase(items.map((i) => quantity(i, i.target)));
    const total = items.reduce((sum, i) => sum + i.target, 0);
    return {
      key: `panier:${items.map((i) => i.emoji + i.target).join('')}`,
      interaction: 'build',
      text: `Mets ${what} dans le panier.`,
      instruction: `Mets ${what} dans le panier.${tens ? ` Un sachet contient 10 ${items[0].many}.` : ''}`,
      short: { key: `panier:${kinds}:${tens}`, text: `Mets ${what}.` },
      stage: {
        type: 'build',
        items: items.map((i) => ({ emoji: i.emoji, one: i.one, many: i.many, f: Boolean(i.f), target: i.target })),
        tens,
        perRow: kinds === 1 && max > 10 ? 10 : 5,
        limit: (first ? first[1] : max) + (tens ? 10 : 5), // nombre maximum d'un même fruit dans le panier
      },
      choices: [],
      answer: total,
      success: { speak: what },
    };
  },
};

/** Un seul fruit, mais le nombre à mettre se calcule : compléter ce qu'on a déjà, le double, la moitié. */
function basketToCompute(rng, mode) {
  const fruit = pick(rng, FRUITS);
  let target;
  let text;
  let short;
  let speak;
  let key;
  if (mode === 'manque') {
    const total = randInt(rng, 8, 20);
    const have = randInt(rng, 2, total - 2);
    target = total - have;
    text = `Il te faut ${total} ${fruit.many}. Tu en as déjà ${have}. Mets dans le panier ${fruit.f ? 'celles' : 'ceux'} qui manquent.`;
    short = `Il en faut ${total}, tu en as ${have}.`;
    speak = `${have} et ${target}, ça fait ${total}.`;
    key = `${total}-${have}`;
  } else {
    const half = rng() < 0.5;
    const n = half ? 2 * randInt(rng, 3, 10) : randInt(rng, 3, 10);
    const what = half ? 'la moitié' : 'le double';
    target = half ? n / 2 : 2 * n;
    text = `Mets ${what} de ${n} ${fruit.many} dans le panier.`;
    short = `${capitalize(what)} de ${n} !`;
    speak = `${capitalize(what)} de ${n}, c’est ${target}.`;
    key = `${half ? 'moitie' : 'double'}${n}`;
  }
  return {
    key: `panier:${mode}:${fruit.emoji}${key}`,
    interaction: 'build',
    text,
    instruction: text,
    short: { key: `panier:${mode}`, text: short },
    stage: {
      type: 'build',
      items: [{ emoji: fruit.emoji, one: fruit.one, many: fruit.many, f: Boolean(fruit.f), target }],
      tens: false,
      perRow: 10,
      limit: 25,
    },
    choices: [],
    answer: target,
    success: { speak: [speak, `${quantity(fruit, target)} !`] },
  };
}

// « Faire des patates » : entourer des paquets de 2, de 5 ou de 10, puis compter le tout ;
// enfin des paquets de 3, de 4 et de 5 pour compter de 3 en 3, de 4 en 4, de 5 en 5 (vers les tables).
const PATATES_LEVELS = [
  { label: 'Paquets de 2 (jusqu’à 10)', group: 2, min: 5, max: 10 },
  { label: 'Paquets de 5 (jusqu’à 15)', group: 5, min: 7, max: 15 },
  { label: 'Paquets de 10 (de 11 à 20)', group: 10, min: 11, max: 20 },
  { label: 'Paquets de 10 (de 20 à 30)', group: 10, min: 20, max: 30 },
  { label: 'Paquets de 10 (jusqu’à 40)', group: 10, min: 30, max: 40 },
  { label: 'Paquets de 3 (jusqu’à 20)', group: 3, min: 10, max: 20 },
  { label: 'Paquets de 4 (jusqu’à 30)', group: 4, min: 17, max: 30 },
  { label: 'Paquets de 5 (jusqu’à 40)', group: 5, min: 26, max: 40 },
];

/** Objets éparpillés sans chevauchement, avec assez de place pour les entourer. */
export function patatePositions(rng, count) {
  const [cols, rows] = count <= 10 ? [4, 4] : count <= 15 ? [5, 5] : count <= 24 ? [6, 6] : count <= 32 ? [7, 6] : [8, 7];
  const cells = sample(rng, Array.from({ length: cols * rows }, (_, i) => i), count);
  const jitter = () => (rng() - 0.5) * 0.3;
  const positions = cells.map((cell) => ({
    x: Math.round(((cell % cols) + 0.5 + jitter()) * (1000 / cols)) / 10,
    y: Math.round((Math.floor(cell / cols) + 0.5 + jitter()) * (1000 / rows)) / 10,
  }));
  return { cols, rows, positions };
}

export const patates = {
  id: 'patates',
  domain: 'maths',
  section: DENOMBREMENT,
  title: 'Fais des patates',
  icon: '🥔',
  skill: 'Faire des paquets (de 2, 3, 4, 5 ou 10) pour dénombrer une grande collection',
  levels: PATATES_LEVELS.map((l) => l.label),
  generate(level, rng) {
    const { group, min, max } = PATATES_LEVELS[level - 1];
    const count = randInt(rng, min, max);
    const obj = pick(rng, OBJECTS);
    const groups = Math.floor(count / group);
    const rest = count - groups * group;
    const parts = `${groups === 1 ? 'un paquet' : `${groups} paquets`} de ${group}${rest ? ` et ${rest}` : ''}`;
    return {
      key: `patates:${count}`,
      interaction: 'lasso',
      text: `Fais des paquets de ${group}.`,
      instruction: `Fais des patates : entoure des paquets de ${group} ${obj.many} avec ton doigt. Ensuite, on comptera combien il y en a en tout.`,
      short: { key: `patates:${group}`, text: `Des paquets de ${group} !` },
      stage: { type: 'lasso', emoji: obj.emoji, one: obj.one, many: obj.many, count, group, ...patatePositions(rng, count) },
      // avec des paquets de 3, 4 ou 5 : un distracteur à un paquet près
      choices: numberOptions(choicesWithTens(rng, count, level <= 2 ? 3 : 4, 1, max + 10, level >= 6 ? group : 10)),
      choiceStyle: 'numbers',
      answer: count,
      success: { speak: `${parts} : ${count} ${obj.many} !` },
    };
  },
};

export const dizaines = {
  id: 'dizaines',
  domain: 'maths',
  section: DENOMBREMENT,
  title: 'Dizaines et unités',
  icon: '🧱',
  skill: 'Compter des dizaines (barres de 10) et des unités (cubes) ; la valeur de chaque chiffre',
  levels: [
    'De 10 à 19 (une barre)', "Jusqu'à 50", "Jusqu'à 99", 'Attention : plus de 10 cubes !', "Centaines : jusqu'à 999",
    'Plus de 10 barres !', 'La place des chiffres', 'Décomposé dans le désordre',
  ],
  generate(level, rng) {
    if (level >= 6) return placeValueQuestion(rng, level);
    let tens;
    let units;
    if (level === 5) {
      const hundreds = randInt(rng, 1, 9);
      tens = randInt(rng, 0, 9);
      units = randInt(rng, 0, 9);
      const n = hundreds * 100 + tens * 10 + units;
      const swapped = hundreds * 100 + units * 10 + tens;
      const values = shuffle(rng, [...new Set([n, swapped !== n ? swapped : n + 100 <= 999 ? n + 100 : n - 100,
        ...numberChoices(rng, n, 3, 100, 999, 10)])].slice(0, 4));
      if (!values.includes(n)) values[0] = n;
      return {
        key: `dizaines:${hundreds}-${tens}-${units}`,
        text: 'Quel nombre est représenté ? (plaque = 100, barre = 10)',
        instruction: 'Quel nombre est représenté ? Une plaque, c’est 100. Une barre, c’est 10.',
        short: { key: 'dizaines:100', text: 'Quel nombre ?' },
        stage: { type: 'blocks', hundreds, tens, units },
        choices: numberOptions(values),
        choiceStyle: 'numbers',
        answer: n,
        success: { speak: `${hundreds} centaine${hundreds > 1 ? 's' : ''}, ${tens} dizaine${tens > 1 ? 's' : ''} et ${units} unité${units > 1 ? 's' : ''} : ${n}` },
      };
    }
    if (level === 1) {
      tens = 1;
      units = randInt(rng, 0, 9);
    } else if (level <= 3) {
      tens = randInt(rng, 2, level === 2 ? 4 : 9);
      units = randInt(rng, 0, 9);
    } else {
      tens = randInt(rng, 1, 5);
      units = randInt(rng, 10, 15);
    }
    const n = tens * 10 + units;
    let values;
    if (level === 4) {
      // piège : oublier d'échanger 10 cubes contre une barre
      values = shuffle(rng, [n, n - 10, ...sample(rng, [n - 1, n + 1, n + 10], 2)]);
    } else {
      values = choicesWithTens(rng, n, level === 1 ? 3 : 4, 10, 99);
    }
    return {
      key: `dizaines:${tens}-${units}`,
      text: 'Combien de cubes en tout ? (une barre = 10 cubes)',
      instruction: 'Combien de cubes en tout ? Une barre, c’est 10 cubes.',
      short: { key: 'dizaines:10', text: 'Combien de cubes ?' },
      stage: { type: 'blocks', tens, units },
      choices: numberOptions(values),
      choiceStyle: 'numbers',
      answer: n,
      success: { speak: `${tens} dizaine${tens > 1 ? 's' : ''} et ${units} unité${units > 1 ? 's' : ''} : ${n}` },
    };
  },
};

const PLACES = [['centaines', 0], ['dizaines', 1], ['unités', 2]];
const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;

/** Les permutations des chiffres d'un nombre à trois chiffres (sans zéro devant). */
function digitPermutations(digits) {
  const [x, y, z] = digits;
  return [[x, y, z], [x, z, y], [y, x, z], [y, z, x], [z, x, y], [z, y, x]]
    .filter((d) => d[0] !== 0)
    .map((d) => Number(d.join('')));
}

/**
 * Dizaines, niveaux 6 à 8 : 10 barres ou plus (= 100), la place des chiffres (centaines,
 * dizaines, unités), puis un nombre décomposé dans le désordre (« 7 unités et 4 centaines »).
 */
function placeValueQuestion(rng, level) {
  if (level === 6) {
    const tens = randInt(rng, 10, 12);
    const units = randInt(rng, 0, 9);
    const n = tens * 10 + units;
    return {
      key: `dizaines:${tens}-${units}`,
      text: 'Combien de cubes en tout ? (10 barres = 100 cubes)',
      instruction: 'Combien de cubes en tout ? Une barre, c’est 10 cubes. Et 10 barres, c’est 100 cubes !',
      short: { key: 'dizaines:100cubes', text: 'Combien de cubes ?' },
      stage: { type: 'blocks', tens, units },
      choices: numberOptions(choicesWithTens(rng, n, 4, 100, 139)),
      choiceStyle: 'numbers',
      answer: n,
      success: { speak: `${tens} dizaines, c’est ${tens * 10}.${units ? ` Et ${plural(units, 'unité')} : ${n}.` : ''}` },
    };
  }
  // niveau 7 : trois chiffres différents ; niveau 8 : au moins deux parties non nulles
  let digits;
  do {
    digits = [randInt(rng, 1, 9), randInt(rng, 0, 9), randInt(rng, 0, 9)];
  } while (level === 7 ? new Set(digits).size < 3 : !digits[1] && !digits[2]);
  const n = Number(digits.join(''));
  if (level === 7) {
    const [place, i] = pick(rng, PLACES);
    return {
      key: `dizaines:chiffre:${n}:${place}`,
      text: `Dans ${n}, quel est le chiffre des ${place} ?`,
      instruction: `Dans ${n}, quel est le chiffre des ${place} ?`,
      short: { key: 'dizaines:chiffre', text: `Le chiffre des ${place} de ${n} ?` },
      stage: { type: 'word', text: String(n) },
      choices: numberOptions(shuffle(rng, digits)),
      choiceStyle: 'numbers',
      answer: digits[i],
      success: { speak: `Dans ${n}, le chiffre des ${place}, c’est ${digits[i]}.` },
    };
  }
  // les parties qui valent zéro ne sont pas dites : c'est à l'enfant de mettre le 0
  const parts = [[digits[0], 'centaine'], [digits[1], 'dizaine'], [digits[2], 'unité']].filter(([v]) => v > 0);
  let order = shuffle(rng, parts);
  if (order.every((p, i) => p === parts[i])) order = [...order.slice(1), order[0]]; // toujours dans le désordre
  const phrase = listPhrase(order.map(([v, word]) => plural(v, word)));
  // pièges : écrire les chiffres dans l'ordre de la phrase, oublier le zéro, mélanger les chiffres
  const traps = [Number(order.map(([v]) => v).join('')), ...shuffle(rng, digitPermutations(digits))];
  const values = [...new Set([n, ...traps.filter((v) => v !== n)])].slice(0, 4);
  for (const v of numberChoices(rng, n, 4, 100, 999, 10)) if (values.length < 4 && !values.includes(v)) values.push(v);
  return {
    key: `dizaines:mots:${phrase}`,
    text: 'Quel est ce nombre ?',
    instruction: `${phrase} : quel est ce nombre ? Attention, c’est dans le désordre !`,
    short: { key: 'dizaines:mots', text: 'Quel est ce nombre ?' },
    stage: { type: 'sentence', text: phrase },
    choices: numberOptions(shuffle(rng, values)),
    choiceStyle: 'numbers',
    answer: n,
    success: { speak: `${phrase}, c’est ${n}.` },
  };
}

// ---------------------------------------------------------------- Nombres et calcul

/** Deux nombres à deux chiffres, avec les pièges classiques : chiffres inversés (47 / 74) ou même dizaine (43 / 48). */
function twoDigitPair(rng) {
  const tens = randInt(rng, 1, 9);
  const units = randInt(rng, 0, 9);
  const a = tens * 10 + units;
  let b;
  const trap = rng();
  if (trap < 0.3 && units !== tens && units !== 0) {
    b = units * 10 + tens;
  } else if (trap < 0.6) {
    b = tens * 10 + ((units + randInt(rng, 1, 9)) % 10);
  } else {
    b = randInt(rng, 10, 98);
    if (b >= a) b += 1;
  }
  return [a, b];
}

/** Deux nombres à trois chiffres : mêmes chiffres dans un autre ordre (352 / 325) ou même centaine. */
function threeDigitPair(rng) {
  const a = randInt(rng, 100, 999);
  const digits = String(a).split('');
  const swapped = Number(digits[0] + digits[2] + digits[1]);
  let b = swapped !== a && rng() < 0.5 ? swapped : randInt(rng, 100, 998);
  if (b >= a && b !== swapped) b += 1;
  if (b === a) b = a === 999 ? 998 : a + 1;
  return [a, b];
}

/** Un petit calcul (+ ou −, résultat jusqu'à 99) à comparer avec un autre. */
function smallCalculation(rng) {
  if (rng() < 0.5) {
    const result = randInt(rng, 20, 99);
    const b = randInt(rng, 2, Math.min(40, result - 10));
    return { label: `${result - b} + ${b}`, value: result, said: `${result - b} plus ${b}` };
  }
  const a = randInt(rng, 20, 99);
  const b = randInt(rng, 2, Math.min(40, a - 5));
  return { label: `${a} − ${b}`, value: a - b, said: `${a} moins ${b}` };
}

const SIGN_WORDS = { '<': 'est plus petit que', '>': 'est plus grand que', '=': 'est égal à' };

/**
 * Comparer, niveaux 5 à 7 : les signes <, > et =, encadrer un nombre entre deux dizaines
 * (ou deux centaines), puis comparer les résultats de deux calculs.
 */
function compareMore(rng, level) {
  if (level === 5) {
    const [a, b0] = rng() < 0.6 ? twoDigitPair(rng) : threeDigitPair(rng);
    const b = rng() < 0.2 ? a : b0; // parfois égaux : le signe =
    const sign = a < b ? '<' : a > b ? '>' : '=';
    return {
      key: `comparer:signe:${a}-${b}`,
      text: 'Quel signe faut-il mettre ?',
      instruction: `Quel signe faut-il mettre entre ${a} et ${b} ? Plus petit, plus grand, ou égal ?`,
      short: { key: 'comparer:signe', text: 'Quel signe ?', speak: `${a} et ${b} ?` },
      stage: { type: 'equation', parts: [a, null, b] },
      choices: ['<', '>', '='].map((s) => ({ value: s, label: s })),
      choiceStyle: 'letters',
      answer: sign,
      success: { speak: `${a} ${SIGN_WORDS[sign]} ${b}.` },
    };
  }
  if (level === 6) {
    const unit = rng() < 0.4 ? 100 : 10;
    let n;
    do {
      n = unit === 100 ? randInt(rng, 101, 799) : rng() < 0.4 ? randInt(rng, 11, 99) : randInt(rng, 101, 979);
    } while (n % unit === 0);
    const low = n - (n % unit);
    const between = (x) => `${x} et ${x + unit}`;
    const word = unit === 100 ? 'centaines' : 'dizaines';
    return {
      key: `comparer:encadrer:${n}:${unit}`,
      text: `Entre quelles ${word} se trouve ${n} ?`,
      instruction: `Entre quelles ${word} se trouve ${n} ?`,
      short: { key: `comparer:encadrer:${unit}`, text: `${n} : entre quelles ${word} ?` },
      stage: { type: 'none' },
      choices: shuffle(rng, [low, low - unit, low + unit]).map((x) => ({ value: between(x), label: between(x) })),
      choiceStyle: 'words',
      answer: between(low),
      success: { speak: `${n} est entre ${low} et ${low + unit}.` },
    };
  }
  // deux calculs aux résultats proches (jamais égaux)
  const x = smallCalculation(rng);
  let y = smallCalculation(rng);
  for (let i = 0; i < 50 && (y.value === x.value || Math.abs(y.value - x.value) > 12); i++) y = smallCalculation(rng);
  if (y.value === x.value) {
    const r = x.value === 99 ? 98 : x.value + 1;
    y = { label: `${r - 5} + 5`, value: r, said: `${r - 5} plus 5` };
  }
  const biggest = rng() < 0.5;
  const winner = (x.value > y.value) === biggest ? x : y;
  const word = biggest ? 'le plus grand' : 'le plus petit';
  return {
    key: `comparer:calculs:${x.label}|${y.label}`,
    text: `Quel calcul donne ${word} résultat ?`,
    instruction: `Calcule de tête. Quel calcul donne ${word} résultat ?`,
    short: { key: `comparer:calculs:${word}`, text: `${capitalize(word)} résultat ?` },
    stage: { type: 'none' },
    choices: shuffle(rng, [x, y]).map((c) => ({ value: c.label, label: c.label })),
    choiceStyle: 'numbers',
    answer: winner.label,
    success: { speak: `${x.said} égale ${x.value}, et ${y.said} égale ${y.value}.` },
  };
}

export const comparer = {
  id: 'comparer',
  domain: 'maths',
  section: CALCUL,
  title: 'Le plus grand',
  icon: '⚖️',
  skill: 'Comparer des collections, des nombres (signes <, >, =), encadrer, comparer des calculs',
  levels: [
    'Collections (le plus)', "Nombres jusqu'à 20", "Nombres jusqu'à 100", "Nombres jusqu'à 1000",
    'Les signes <, > et =', 'Encadrer un nombre', 'Comparer des calculs',
  ],
  generate(level, rng) {
    if (level >= 5) return compareMore(rng, level);
    if (level === 1) {
      const obj = pick(rng, OBJECTS);
      const a = randInt(rng, 1, 10);
      let b = randInt(rng, 1, 9);
      if (b >= a) b += 1;
      return {
        key: `comparer:${a}-${b}`,
        text: `Où y a-t-il le plus de ${obj.many} ?`,
        instruction: `Où y a-t-il le plus de ${obj.many} ?`,
        short: { key: 'comparer:plus', text: 'Où y en a-t-il le plus ?' },
        stage: { type: 'none' },
        choices: [
          { value: 'gauche', objects: { emoji: obj.emoji, count: a } },
          { value: 'droite', objects: { emoji: obj.emoji, count: b } },
        ],
        choiceStyle: 'objects',
        answer: a > b ? 'gauche' : 'droite',
      };
    }
    let a;
    let b;
    if (level === 2) {
      a = randInt(rng, 0, 20);
      b = randInt(rng, 0, 19);
      if (b >= a) b += 1;
    } else if (level === 4) {
      [a, b] = threeDigitPair(rng);
    } else {
      [a, b] = twoDigitPair(rng);
    }
    const biggest = rng() < 0.5;
    const answer = biggest ? Math.max(a, b) : Math.min(a, b);
    const word = biggest ? 'le plus grand' : 'le plus petit';
    return {
      key: `comparer:${Math.min(a, b)}-${Math.max(a, b)}`,
      text: `Touche le nombre ${word}.`,
      instruction: `Touche le nombre ${word}.`,
      short: { key: `comparer:${word}`, text: `${word[0].toUpperCase()}${word.slice(1)} ?` },
      stage: { type: 'none' },
      choices: numberOptions([a, b]),
      choiceStyle: 'big-numbers',
      answer,
    };
  },
};

export const suite = {
  id: 'suite',
  domain: 'maths',
  section: CALCUL,
  title: 'La suite',
  icon: '🔢',
  skill: 'Connaître la suite des nombres (en avançant, à rebours, de 2, 3, 4, 5, 10 ou 100 en 100)',
  levels: [
    "Jusqu'à 10", "Jusqu'à 20", "Jusqu'à 100", 'De 2 en 2, de 10 en 10', "Jusqu'à 1000 (de 1, 10 ou 100 en 100)",
    'À rebours : 20, 19, 18…', 'De 3 en 3, 4 en 4, 5 en 5', 'Tape le nombre qui manque',
  ],
  generate(level, rng) {
    if (level === 8) return missingNumberKeypad(rng);
    const length = 5;
    let step = 1;
    let start;
    if (level === 1) start = randInt(rng, 1, 6);
    else if (level === 2) start = randInt(rng, 0, 16);
    else if (level === 3) start = randInt(rng, 20, 95);
    else if (level === 5) {
      step = pick(rng, [1, 10, 100]);
      start = step === 100 ? 100 * randInt(rng, 0, 5) : randInt(rng, 100, 995 - 4 * step);
    } else if (level === 6) {
      // à rebours, de 1 en 1 ou de 10 en 10 (sans forcément partir d'une dizaine : 87, 77, 67…)
      step = rng() < 0.7 ? -1 : -10;
      start = step === -1 ? randInt(rng, 14, 100) : randInt(rng, 45, 100);
    } else if (level === 7) {
      // la table de 3, de 4 ou de 5 : on ne dit pas de combien on avance, il faut le trouver
      step = pick(rng, [3, 4, 5]);
      start = step * randInt(rng, 0, step === 5 ? 15 : 6);
    } else if (rng() < 0.5) {
      step = 2;
      start = 2 * randInt(rng, 0, 5);
    } else {
      step = 10;
      start = 10 * randInt(rng, 0, 5);
    }
    const numbers = Array.from({ length }, (_, i) => start + i * step);
    const gap = randInt(rng, level === 1 ? 1 : 0, length - 1);
    const answer = numbers[gap];
    const items = numbers.map((n, i) => (i === gap ? null : n));
    let how = step === 1 ? '' : `On compte de ${step} en ${step}. `;
    if (step < 0) how = step === -1 ? 'On compte à rebours. ' : `On recule de ${-step} en ${-step}. `;
    if (level === 7) how = 'Trouve de combien on avance à chaque fois. ';
    let values;
    if (level === 7) {
      // de 3, 4 ou 5 en 5 : des voisins à ±1 ou ±2, jamais un nombre déjà écrit dans la suite
      const near = shuffle(rng, [-2, -1, 1, 2].map((d) => answer + d).filter((v) => v >= 0));
      values = shuffle(rng, [answer, ...[...near, answer + step + 2].slice(0, 3)]);
    } else {
      values = numberChoices(rng, answer, level >= 3 ? 4 : 3, 0, level === 5 ? 1000 : 100, Math.abs(step));
    }
    return {
      key: `suite:${start}-${step}-${gap}`,
      text: 'Quel nombre manque ?',
      instruction: `${how}Quel nombre manque ?`,
      short: { key: level === 7 ? 'suite:regle' : `suite:${step}`, text: 'Quel nombre manque ?' },
      stage: { type: 'sequence', items },
      choices: numberOptions(values),
      choiceStyle: 'numbers',
      answer,
      success: { speak: numbers.join(', ') },
    };
  },
};

/** Le nombre qui manque, à taper sur le pavé (en avançant ou à rebours, jusqu'à 1000). */
function missingNumberKeypad(rng) {
  const step = pick(rng, [1, 2, 5, 10, 10, 100]);
  const first = randInt(rng, 20, 1000 - 4 * step);
  const start = step === 5 ? first - (first % 5) : first;
  const numbers = Array.from({ length: 5 }, (_, i) => start + i * step);
  const down = rng() < 0.4;
  if (down) numbers.reverse();
  const gap = randInt(rng, 0, 4);
  const answer = numbers[gap];
  let how = `On ${down ? 'recule' : 'avance'} de ${step} en ${step}. `;
  if (step === 1) how = down ? 'On compte à rebours. ' : '';
  return {
    key: `suite:pave:${numbers[0]}-${step}-${down}-${gap}`,
    interaction: 'keypad',
    text: 'Tape le nombre qui manque.',
    instruction: `${how}Quel nombre manque ? Tape-le sur le pavé.`,
    short: { key: 'suite:pave', text: 'Tape le nombre qui manque.' },
    stage: { type: 'sequence', items: numbers.map((n, i) => (i === gap ? null : n)) },
    choices: [],
    answer,
    maxDigits: 4,
    success: { speak: numbers.join(', ') },
  };
}

/** Les 36 paliers de calcul : +5, −5, ±5, +10, −10, ±10 … +100, −100, ±100. */
export const CALC_PALIERS = [5, 10, 15, 20, 30, 40, 50, 60, 70, 80, 90, 100]
  .flatMap((max) => ['+', '−', '±'].map((op) => ({ id: `${op}${max}`, op, max })));

const OP_NAMES = { '+': 'additions', '−': 'soustractions', '±': 'additions et soustractions' };
const opWord = (op) => (op === '+' ? 'plus' : 'moins');

/**
 * Une opération du palier. Le résultat (addition) ou le nombre de départ
 * (soustraction) se situe entre la moitié et le maximum du palier, pour que
 * chaque palier travaille vraiment ses nombres. Dès 30, un calcul sur quatre
 * ajoute ou retire des dizaines entières (34 + 10, 56 − 20).
 */
export function palierOperation(rng, { op, max }) {
  const realOp = op === '±' ? (rng() < 0.5 ? '+' : '−') : op;
  const low = max <= 10 ? 2 : Math.ceil(max / 2);
  const bMax = (n) => (max <= 20 ? Math.min(9, n) : Math.min(n, max / 2));
  const roundTens = max >= 30 && rng() < 0.25;
  let a;
  let b;
  if (realOp === '+') {
    const result = randInt(rng, low, max);
    b = roundTens ? 10 * randInt(rng, 1, Math.floor((result - 1) / 10)) : randInt(rng, 1, bMax(result - 1));
    a = result - b;
  } else {
    a = randInt(rng, low, max);
    b = roundTens ? 10 * randInt(rng, 1, Math.floor((a - 1) / 10)) : randInt(rng, 1, bMax(a - 1));
  }
  return { a, b, op: realOp, answer: realOp === '+' ? a + b : a - b };
}

/** `n` opérations fabriquées par `make`, toutes différentes selon `keyOf`. */
function distinct(make, n, keyOf) {
  const ops = [];
  const seen = new Set();
  for (let tries = 0; ops.length < n && tries < 300; tries++) {
    const o = make();
    if (!seen.has(keyOf(o))) {
      seen.add(keyOf(o));
      ops.push(o);
    }
  }
  return ops;
}

function distinctOperations(rng, palier, n, keyOf) {
  return distinct(() => palierOperation(rng, palier), n, keyOf);
}

/** Dizaines ou centaines entières : 80 + 50 = 130, 700 − 300 = 400 (résultats jusqu'à 900). */
function roundOperation(rng) {
  const unit = rng() < 0.5 ? 10 : 100;
  const op = rng() < 0.5 ? '+' : '−';
  const big = randInt(rng, 3, unit === 10 ? 15 : 9); // avec les dizaines, on passe parfois la centaine
  const small = randInt(rng, 1, big - 1);
  return op === '+'
    ? { a: (big - small) * unit, b: small * unit, op, answer: big * unit }
    : { a: big * unit, b: small * unit, op, answer: (big - small) * unit };
}

/** Une multiplication d'une des tables (jamais × 1 ni 10 × 10) : « 3 × 5 » = 3 fois 5. */
function tableOperation(rng, tables, maxProduct = 100) {
  const table = pick(rng, tables);
  const n = randInt(rng, 2, Math.min(table === 10 ? 9 : 10, Math.floor(maxProduct / table)));
  return { a: n, b: table, op: '×', answer: n * table };
}

/** Une addition de trois nombres (jusqu'à 20) ; une fois sur deux, deux d'entre eux font 10. */
function threeTermSum(rng) {
  let terms;
  if (rng() < 0.5) {
    const x = randInt(rng, 1, 9);
    terms = shuffle(rng, [x, 10 - x, randInt(rng, 1, 9)]);
  } else {
    do {
      terms = [randInt(rng, 1, 9), randInt(rng, 1, 9), randInt(rng, 1, 9)];
    } while (terms[0] + terms[1] + terms[2] > 20);
  }
  return { left: terms.join(' + '), right: terms[0] + terms[1] + terms[2] };
}

/** Calcul à taper sur le pavé numérique. */
function keypadQuestion(rng, palier) {
  const { a, b, op, answer } = palierOperation(rng, palier);
  return {
    key: `calcul:${a}${op}${b}`,
    interaction: 'keypad',
    text: 'Calcule !',
    instruction: `Combien font ${a} ${opWord(op)} ${b} ?`,
    short: { key: 'calcul:pave', text: 'Calcule !', speak: `${a} ${opWord(op)} ${b} ?` },
    stage: { type: 'operation', a, b, op, emoji: palier.max <= 10 ? pick(rng, OBJECTS).emoji : null },
    choices: [],
    answer,
    maxDigits: String(palier.max).length,
    success: { speak: `${a} ${opWord(op)} ${b}, égale ${answer}` },
  };
}

/** « Relie » : 4 calculs à associer à leur résultat. */
function matchQuestion(rng, palier) {
  const ops = distinctOperations(rng, palier, 4, (o) => o.answer);
  return {
    key: `calcul:relie:${ops.map((o) => `${o.a}${o.op}${o.b}`).join(',')}`,
    interaction: 'match',
    text: 'Relie chaque calcul à son résultat.',
    instruction: 'Relie chaque calcul à son résultat.',
    short: { text: 'Relie !' },
    stage: { type: 'none' },
    pairs: ops.map((o) => ({ left: `${o.a} ${o.op} ${o.b}`, right: o.answer })),
    rights: shuffle(rng, ops.map((o) => o.answer)),
    choices: [],
    answer: null,
    success: { speak: 'Tout est relié !' },
  };
}

/** « Complète » : placer les nombres dans les cases (□ + □ = 8). */
function fillQuestion(rng, palier, count = 3) {
  return fillFromOperations(rng, distinctOperations(rng, palier, count, (o) => `${o.op}${o.answer}`));
}

function fillFromOperations(rng, ops) {
  return {
    key: `calcul:complete:${ops.map((o) => `${o.op}${o.answer}`).join(',')}`,
    interaction: 'fill',
    text: 'Place les nombres dans les cases.',
    instruction: 'Place les nombres dans les cases, pour que les calculs soient justes.',
    short: { text: 'Complète !' },
    stage: { type: 'none' },
    equations: ops.map((o) => ({ op: o.op, result: o.answer, solution: [o.a, o.b] })),
    tiles: shuffle(rng, ops.flatMap((o) => [o.a, o.b])),
    choices: [],
    answer: null,
    success: { speak: 'Tous les calculs sont justes !' },
  };
}

/** Juste si les deux nombres placés donnent bien le résultat (addition, soustraction ou multiplication). */
export function equationHolds({ op, result }, x, y) {
  if (op === '+') return x + y === result;
  if (op === '×') return x * y === result;
  return x - y === result;
}

// « Les calculs à trous » : glisser les étiquettes dans les cases ; chaque calcul juste devient vert.
const TROUS_LEVELS = [
  { label: '3 additions jusqu’à 5', count: 3, op: '+', max: 5 },
  { label: '4 additions jusqu’à 10', count: 4, op: '+', max: 10 },
  { label: '5 calculs, + et −, jusqu’à 10', count: 5, op: '±', max: 10 },
  { label: '5 calculs, + et −, jusqu’à 20', count: 5, op: '±', max: 20 },
  { label: '4 calculs, + et −, jusqu’à 50', count: 4, op: '±', max: 50 },
  { label: '4 calculs, + et −, jusqu’à 100', count: 4, op: '±', max: 100 },
  { label: 'Dizaines et centaines', count: 4, kind: 'rond' },
  { label: 'Tables de 2, 5 et 10', count: 4, kind: 'tables' },
  { label: '5 calculs : +, − et ×', count: 5, kind: 'mix' },
];

/** Calculs à trous, niveaux 7 à 9 : dizaines et centaines entières, tables, puis les trois signes mélangés. */
function trousOperations(rng, kind, count) {
  const keyOf = (o) => `${o.op}${o.answer}`;
  if (kind === 'rond') return distinct(() => roundOperation(rng), count, keyOf);
  if (kind === 'tables') return distinct(() => tableOperation(rng, [2, 5, 10]), count, keyOf);
  // 2 multiplications, une addition, une soustraction, et un cinquième calcul + ou −, résultats jusqu'à 50
  const signs = shuffle(rng, ['×', '×', '+', '−', pick(rng, ['+', '−'])]);
  const ops = [];
  for (const sign of signs) {
    for (let tries = 0; tries < 100; tries++) {
      const o = sign === '×' ? tableOperation(rng, [2, 3, 4, 5], 50) : palierOperation(rng, { op: sign, max: 50 });
      if (!ops.some((p) => keyOf(p) === keyOf(o))) {
        ops.push(o);
        break;
      }
    }
  }
  return ops;
}

export const trous = {
  id: 'trous',
  domain: 'maths',
  section: CALCUL,
  title: 'Les calculs à trous',
  icon: '🧩',
  skill: 'Trouver les nombres qui rendent des calculs justes (additions, soustractions, puis multiplications)',
  levels: TROUS_LEVELS.map((l) => l.label),
  generate(level, rng) {
    const { count, op, max, kind } = TROUS_LEVELS[level - 1];
    const q = kind
      ? fillFromOperations(rng, trousOperations(rng, kind, count))
      : fillQuestion(rng, { op, max }, count);
    return {
      ...q,
      key: q.key.replace('calcul:complete', 'trous'),
      text: 'Glisse les nombres dans les cases.',
      instruction: 'Glisse les nombres dans les cases, pour que les calculs soient justes. Chaque calcul juste devient vert.',
      short: { key: 'trous', text: 'Complète !' },
    };
  },
};

// « Relie les calculs » : tracer un trait au doigt de chaque calcul à son résultat ;
// la paire juste devient verte puis disparaît.
const RELIE_LEVELS = [
  { label: '4 additions jusqu’à 10', count: 4, op: '+', max: 10 },
  { label: '6 calculs, + et −, jusqu’à 10', count: 6, op: '±', max: 10 },
  { label: '8 calculs, + et −, jusqu’à 10', count: 8, op: '±', max: 10 },
  { label: '6 calculs, + et −, jusqu’à 20', count: 6, op: '±', max: 20 },
  { label: '8 calculs, + et −, jusqu’à 20', count: 8, op: '±', max: 20 },
  { label: '6 calculs, + et −, jusqu’à 100', count: 6, op: '±', max: 100 },
  { label: 'Additions de 3 nombres', count: 6, kind: 'trois' },
  { label: 'Tables de 2, 5 et 10', count: 6, tables: [2, 5, 10] },
  { label: 'Tables de 2, 3, 4, 5, 10', count: 8, tables: [2, 3, 4, 5, 10] },
];

export const relieCalculs = {
  id: 'relie-calculs',
  domain: 'maths',
  section: CALCUL,
  title: 'Relie les calculs',
  icon: '🖍️',
  skill: 'Calculer de tête (additions, soustractions, tables) et associer chaque calcul à son résultat',
  levels: RELIE_LEVELS.map((l) => l.label),
  generate(level, rng) {
    const { count, op, max, kind, tables } = RELIE_LEVELS[level - 1];
    let pairs;
    if (kind === 'trois') {
      pairs = distinct(() => threeTermSum(rng), count, (p) => p.right);
    } else {
      const ops = tables
        ? distinct(() => tableOperation(rng, tables), count, (o) => o.answer)
        : distinctOperations(rng, { op, max }, count, (o) => o.answer);
      pairs = ops.map((o) => ({ left: `${o.a} ${o.op} ${o.b}`, right: o.answer }));
    }
    return {
      key: `relie-calculs:${pairs.map((p) => p.left.replaceAll(' ', '')).join(',')}`,
      interaction: 'match',
      vanish: true,
      text: 'Relie chaque calcul à son résultat.',
      instruction: 'Trace un trait avec ton doigt, de chaque calcul jusqu’à son résultat.',
      short: { key: 'relie-calculs', text: 'Relie !' },
      stage: { type: 'none' },
      pairs,
      rights: shuffle(rng, pairs.map((p) => p.right)),
      choices: [],
      answer: null,
      success: { speak: 'Tout est relié !' },
    };
  },
};

/** Ordre des exercices dans une partie de calcul. */
export const CALC_FORMATS = ['keypad', 'match', 'keypad', 'fill'];

export const calcul = {
  id: 'calcul',
  domain: 'maths',
  section: CALCUL,
  title: 'Calcul',
  icon: '➕',
  skill: 'Additions et soustractions par paliers (de ±5 à ±100)',
  paliers: CALC_PALIERS,
  fixedLevel: true, // l'enfant choisit son palier sur la carte, il ne change pas pendant la partie
  levels: CALC_PALIERS.map(({ op, max }) => `${op}${max} : ${OP_NAMES[op]} jusqu’à ${max}`),
  badge: (level) => CALC_PALIERS[level - 1].id,
  generate(level, rng, index = 0) {
    const palier = CALC_PALIERS[level - 1];
    const format = CALC_FORMATS[index % CALC_FORMATS.length];
    if (format === 'match') return matchQuestion(rng, palier);
    if (format === 'fill') return fillQuestion(rng, palier);
    return keypadQuestion(rng, palier);
  },
};

/**
 * Faire 10, niveaux 4 à 8 : compléments à 20 avec deux boîtes de 10, compléter à la
 * dizaine supérieure (37 + ? = 40), compléments à 100 (dizaines, puis multiples de 5),
 * compléter à la centaine supérieure (370 + ? = 400), compléter n'importe quel nombre à 100.
 */
function bigComplement(rng, level) {
  if (level === 7) {
    // 370 + ? = 400 : le complément des dizaines à 10 ; piège : le chiffre des dizaines (70)
    let n;
    do {
      n = 10 * randInt(rng, 11, 99);
    } while (n % 100 === 0);
    const total = n + 100 - (n % 100);
    const answer = total - n;
    const values = withTrap(rng, numberChoices(rng, answer, 4, 10, 90, 10), answer, n % 100);
    return {
      key: `faire-dix:${total}:${n}`,
      text: `${n} + ? = ${total}`,
      instruction: `${n} plus combien égale ${total} ?`,
      stage: { type: 'equation', parts: [n, '+', null, '=', total] },
      choices: numberOptions(values),
      choiceStyle: 'numbers',
      answer,
      success: { speak: `${n} plus ${answer}, égale ${total}` },
    };
  }
  if (level === 8) {
    // 47 + ? = 100 : 3 pour aller à 50, puis 50 ; piège : 63 (dizaines complétées à 10 au lieu de 9)
    let n;
    do {
      n = randInt(rng, 11, 89);
    } while (n % 5 === 0);
    const answer = 100 - n;
    let values = numberChoices(rng, answer, 4, 1, 99);
    if (answer + 10 <= 99) values = withTrap(rng, values, answer, answer + 10);
    return {
      key: `faire-dix:100:${n}`,
      text: `${n} + ? = 100`,
      instruction: `${n} plus combien égale 100 ?`,
      stage: { type: 'equation', parts: [n, '+', null, '=', 100] },
      choices: numberOptions(values),
      choiceStyle: 'numbers',
      answer,
      success: { speak: `${n} plus ${answer}, égale 100` },
    };
  }
  if (level === 4) {
    const filled = randInt(rng, 2, 18);
    const answer = 20 - filled;
    return {
      key: `faire-dix:20:${filled}`,
      text: 'Combien en manque-t-il pour faire 20 ?',
      instruction: 'Voici deux boîtes de 10. Combien en manque-t-il pour faire 20 ?',
      short: { key: 'faire-dix:20', text: 'Pour faire 20 ?' },
      stage: { type: 'frames', filled, frames: 2 },
      choices: numberOptions(choicesWithTens(rng, answer, 4, 0, 20)),
      choiceStyle: 'numbers',
      answer,
      success: { speak: `${filled} plus ${answer}, égale 20` },
    };
  }
  let n;
  let total;
  if (level === 5) {
    do {
      n = randInt(rng, 11, 98);
    } while (n % 10 === 0);
    total = n + 10 - (n % 10);
  } else {
    n = rng() < 0.6 ? 10 * randInt(rng, 1, 9) : 5 * (2 * randInt(rng, 1, 8) + 1);
    total = 100;
  }
  const answer = total - n;
  let values;
  if (level === 5) {
    // piège : répondre le chiffre des unités (37 + 7 = 40 ?)
    values = withTrap(rng, numberChoices(rng, answer, 4, 1, 10), answer, n % 10);
  } else {
    values = numberChoices(rng, answer, 4, 5, 95, n % 10 ? 5 : 10);
    // piège : 35 + 75 = 100 ? (les dizaines complétées à 10 au lieu de 9)
    if (n % 10 && answer + 10 <= 95) values = withTrap(rng, values, answer, answer + 10);
  }
  return {
    key: `faire-dix:${total}:${n}`,
    text: `${n} + ? = ${total}`,
    instruction: `${n} plus combien égale ${total} ?`,
    stage: { type: 'equation', parts: [n, '+', null, '=', total] },
    choices: numberOptions(values),
    choiceStyle: 'numbers',
    answer,
    success: { speak: `${n} plus ${answer}, égale ${total}` },
  };
}

export const faireDix = {
  id: 'faire-dix',
  domain: 'maths',
  section: CALCUL,
  title: 'Faire 10',
  icon: '🔟',
  skill: 'Connaître les compléments à 5, à 10, à 20, à la dizaine, à la centaine et à 100',
  levels: [
    'Compléments à 5', 'Compléments à 10 avec la boîte', 'Compléments à 10 sans la boîte',
    'Faire 20 avec deux boîtes', 'Compléter à la dizaine', 'Compléments à 100',
    'Compléter à la centaine', 'Compléter à 100',
  ],
  generate(level, rng) {
    if (level >= 4) return bigComplement(rng, level);
    const total = level === 1 ? 5 : 10;
    const filled = randInt(rng, 1, total - 1);
    const answer = total - filled;
    const withFrame = level <= 2;
    return {
      key: `faire-dix:${filled}`,
      text: withFrame ? `Combien en manque-t-il pour faire ${total} ?` : `${filled} + ? = ${total}`,
      instruction: withFrame
        ? `Combien en manque-t-il pour faire ${total} ?`
        : `${filled} plus combien égale ${total} ?`,
      short: withFrame ? { key: `faire-dix:${total}`, text: `Pour faire ${total} ?` } : undefined,
      stage: withFrame
        ? { type: 'frame', size: total, filled }
        : { type: 'equation', parts: [filled, '+', null, '=', total] },
      choices: numberOptions(numberChoices(rng, answer, level >= 3 ? 4 : 3, 0, total)),
      choiceStyle: 'numbers',
      answer,
      success: { speak: `${filled} plus ${answer}, égale ${total}` },
    };
  },
};

export const MATHS_GAMES = [compter, viteVu, panier, patates, dizaines, comparer, suite, calcul, trous, relieCalculs, faireDix];
