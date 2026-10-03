// Jeux de maths complémentaires : formes et suites de motifs (maternelle), tables (CE1).

import { pick, randInt, sample, shuffle } from '../random.js';
import { numberChoices } from './helpers.js';

// ---------------------------------------------------------------- Les formes

const SHAPES_BY_LEVEL = {
  1: ['rond', 'carré', 'triangle'],
  2: ['rond', 'carré', 'triangle', 'rectangle'],
  3: ['rond', 'carré', 'triangle', 'rectangle', 'étoile', 'cœur'],
};
const SHAPE_ARTICLE = { rond: 'le rond', carré: 'le carré', triangle: 'le triangle', rectangle: 'le rectangle', étoile: "l'étoile", cœur: 'le cœur' };
const COLORS = ['#ff5c5c', '#3d7dff', '#2fbf5b', '#ffb020', '#9b5cff', '#ff6fa8'];

export const formes = {
  id: 'formes',
  domain: 'maths',
  section: 'Formes et logique',
  title: 'Les formes',
  icon: '🔺',
  skill: 'Reconnaître et nommer les formes',
  levels: ['Rond, carré, triangle', 'Avec le rectangle', 'Formes et couleurs mélangées'],
  generate(level, rng) {
    const pool = SHAPES_BY_LEVEL[level];
    const target = pick(rng, pool);
    const options = shuffle(rng, [target, ...sample(rng, pool.filter((s) => s !== target), level === 1 ? 2 : 3)]);
    const sameColor = level < 3 ? pick(rng, COLORS) : null;
    return {
      key: `formes:${target}`,
      text: `Touche ${SHAPE_ARTICLE[target]}.`,
      instruction: `Touche ${SHAPE_ARTICLE[target]}.`,
      stage: { type: 'none' },
      choices: options.map((s) => ({ value: s, shape: s, color: sameColor || pick(rng, COLORS) })),
      choiceStyle: 'pictures',
      answer: target,
      success: { speak: `Oui, c’est ${SHAPE_ARTICLE[target]} !` },
    };
  },
};

// ---------------------------------------------------------------- Suites de motifs (algorithmes)

const MOTIFS = [
  ['🔴', '🔵', '🟡', '🟢'], ['🍎', '🍌', '🍇', '🍊'], ['🐱', '🐶', '🐰', '🐻'],
  ['⭐', '🌙', '☀️', '☁️'], ['🚗', '🚲', '✈️', '🚂'], ['🟥', '🟦', '🟨', '🟩'],
];
const PATTERNS = { 1: ['AB'], 2: ['AAB', 'ABB'], 3: ['ABC'], 4: ['AABB', 'ABCD'] };

export const algorithmes = {
  id: 'algorithmes',
  domain: 'maths',
  section: 'Formes et logique',
  title: 'Les suites de motifs',
  icon: '🔁',
  skill: 'Continuer une suite logique (algorithme)',
  levels: ['A B A B…', 'A A B…, A B B…', 'A B C…', 'A A B B…, A B C D…'],
  generate(level, rng) {
    const pattern = pick(rng, PATTERNS[level]);
    const motif = shuffle(rng, pick(rng, MOTIFS));
    const symbol = (c) => motif[c.charCodeAt(0) - 65];
    const length = Math.max(6, pattern.length * 2 + 1);
    const items = Array.from({ length }, (_, i) => symbol(pattern[i % pattern.length]));
    const answer = items[length - 1];
    const used = [...new Set(items)];
    const extra = motif.find((m) => !used.includes(m));
    const options = shuffle(rng, [...new Set([...used, ...(extra ? [extra] : [])])]).slice(0, 4);
    if (!options.includes(answer)) options[0] = answer;
    return {
      key: `algorithmes:${pattern}:${items.join('')}`,
      text: 'Qu’est-ce qui vient après ?',
      instruction: 'Regarde bien la suite. Qu’est-ce qui vient après ?',
      short: { text: 'Et après ?' },
      stage: { type: 'pattern', items: [...items.slice(0, -1), null] },
      choices: shuffle(rng, options).map((m) => ({ value: m, label: m })),
      choiceStyle: 'pictures',
      answer,
    };
  },
};

// ---------------------------------------------------------------- Les tables (CE1)

const TABLES = [[2], [5], [10], [3], [4], [2, 3, 4, 5, 10]];
const GROUP_EMOJI = ['🍎', '⭐', '🐟', '🌸', '🍓'];

export const tables = {
  id: 'tables',
  domain: 'maths',
  section: 'Nombres et calcul',
  title: 'Les tables',
  icon: '✖️',
  skill: 'Tables de multiplication (×2, ×3, ×4, ×5, ×10)',
  levels: ['Table de 2', 'Table de 5', 'Table de 10', 'Table de 3', 'Table de 4', 'Tables mélangées'],
  generate(level, rng) {
    const table = pick(rng, TABLES[level - 1]);
    const n = randInt(rng, 1, 10);
    const answer = n * table;
    // Pour les petits produits, on montre les paquets (3 × 2 = 3 paquets de 2).
    const groups = answer <= 20 ? { emoji: pick(rng, GROUP_EMOJI), groups: n, size: table } : null;
    return {
      key: `tables:${n}x${table}`,
      text: 'Calcule !',
      instruction: `Combien font ${n} fois ${table} ?`,
      short: { key: 'tables', text: 'Calcule !', speak: `${n} fois ${table} ?` },
      stage: { type: 'multiplication', a: n, b: table, groups },
      choices: numberChoices(rng, answer, 4, 0, 100, table).map((v) => ({ value: v, label: String(v) })),
      choiceStyle: 'numbers',
      answer,
      success: { speak: `${n} fois ${table}, égale ${answer}` },
    };
  },
};

// ---------------------------------------------------------------- Relie les quantités

const COUNT_EMOJI = ['🍎', '⭐', '🐟', '🌸', '🍓', '🐞', '⚽', '🐥'];

export const relier = {
  id: 'relier',
  domain: 'maths',
  section: 'Dénombrement',
  title: 'Relie les quantités',
  icon: '🔗',
  skill: 'Associer une quantité et son chiffre',
  levels: ['De 1 à 4', 'De 1 à 6', 'De 1 à 10'],
  generate(level, rng) {
    const [max, count] = [[4, 3], [6, 4], [10, 4]][level - 1];
    const numbers = sample(rng, Array.from({ length: max }, (_, i) => i + 1), count);
    const emoji = pick(rng, COUNT_EMOJI);
    return {
      key: `relier:${numbers.join('-')}`,
      interaction: 'match',
      text: 'Relie chaque groupe à son nombre.',
      instruction: 'Compte, et relie chaque groupe à son nombre.',
      short: { text: 'Relie !' },
      stage: { type: 'none' },
      pairs: numbers.map((n) => ({ objects: { emoji, count: n }, left: String(n), right: n })),
      rights: shuffle(rng, numbers),
      choices: [],
      answer: null,
      success: { speak: 'Tout est relié !' },
    };
  },
};

// ---------------------------------------------------------------- Ranger

const SIZE_EMOJI = ['🐘', '🌳', '🎈', '🐻', '🏠', '🍎', '⭐', '🐟'];
const SIZE_SCALE = [0.55, 0.8, 1.1, 1.45];

export const ranger = {
  id: 'ranger',
  domain: 'maths',
  section: 'Nombres et calcul',
  title: 'Range dans l’ordre',
  icon: '📶',
  skill: 'Ranger des objets par taille, des nombres dans l’ordre',
  levels: [
    '3 tailles, du plus petit au plus grand',
    '4 tailles',
    '3 nombres jusqu’à 10',
    '4 nombres jusqu’à 20',
    '5 nombres jusqu’à 100',
    '4 nombres jusqu’à 1000',
    'Du plus grand au plus petit (jusqu’à 100)',
  ],
  generate(level, rng) {
    if (level <= 2) {
      const emoji = pick(rng, SIZE_EMOJI);
      const scales = level === 1 ? [SIZE_SCALE[0], SIZE_SCALE[1], SIZE_SCALE[3]] : SIZE_SCALE;
      const items = shuffle(rng, scales.map((scale, i) => ({ value: i, emoji, scale })));
      return {
        key: `ranger:${level}:${items.map((i) => i.value).join('')}`,
        interaction: 'order',
        text: 'Touche du plus petit au plus grand.',
        instruction: 'Touche les images, du plus petit au plus grand.',
        short: { key: 'ranger:tailles', text: 'Du plus petit au plus grand.' },
        stage: { type: 'none' },
        items,
        order: 'asc',
        choices: [],
        answer: null,
        success: { speak: 'Bravo, tout est bien rangé !' },
      };
    }
    const [count, min, max] = [[3, 0, 10], [4, 0, 20], [5, 0, 100], [4, 100, 999], [4, 0, 100]][level - 3];
    const values = sample(rng, Array.from({ length: max - min + 1 }, (_, i) => min + i), count);
    const desc = level === 7;
    return {
      key: `ranger:${level}:${values.join('-')}`,
      interaction: 'order',
      text: desc ? 'Touche du plus grand au plus petit.' : 'Touche du plus petit au plus grand.',
      instruction: desc ? 'Touche les nombres, du plus grand au plus petit.' : 'Touche les nombres, du plus petit au plus grand.',
      short: { text: desc ? 'Du plus grand au plus petit.' : 'Du plus petit au plus grand.' },
      stage: { type: 'none' },
      items: values.map((v) => ({ value: v, label: String(v) })),
      order: desc ? 'desc' : 'asc',
      choices: [],
      answer: null,
      success: { speak: [...values].sort((a, b) => (desc ? b - a : a - b)).join(', ') },
    };
  },
};

// ---------------------------------------------------------------- Petits problèmes

const STORY_OBJECTS = [
  { emoji: '🍎', one: 'pomme', many: 'pommes', f: true }, { emoji: '🎈', one: 'ballon', many: 'ballons' },
  { emoji: '🍬', one: 'bonbon', many: 'bonbons' }, { emoji: '🐟', one: 'poisson', many: 'poissons' },
  { emoji: '🚗', one: 'petite voiture', many: 'petites voitures', f: true }, { emoji: '⭐', one: 'étoile', many: 'étoiles', f: true },
  { emoji: '🧁', one: 'gâteau', many: 'gâteaux' }, { emoji: '🖍️', one: 'crayon', many: 'crayons' },
];

/** « une pomme », « 3 pommes » */
function amountOf(obj, n) {
  return n === 1 ? `${obj.f ? 'une' : 'un'} ${obj.one}` : `${n} ${obj.many}`;
}

/** « de pommes », « d'étoiles » */
function deMany(obj) {
  return /^[aeiouéèêh]/i.test(obj.many) ? `d’${obj.many}` : `de ${obj.many}`;
}

export const problemes = {
  id: 'problemes',
  domain: 'maths',
  section: 'Nombres et calcul',
  title: 'Petits problèmes',
  icon: '🧠',
  skill: 'Résoudre un petit problème raconté (ajouter, retirer)',
  levels: [
    'Ajouter jusqu’à 5, avec images',
    'Retirer jusqu’à 5, avec images',
    'Ajouter ou retirer jusqu’à 10, avec images',
    'Jusqu’à 10, sans image',
    'Jusqu’à 20',
    'Jusqu’à 100',
    'Deux étapes, jusqu’à 20',
  ],
  generate(level, rng, index = 0, context = {}) {
    const name = context.name || 'Lou';
    const obj = pick(rng, STORY_OBJECTS);
    const max = [5, 5, 10, 10, 20, 100, 20][level - 1];
    let facts;
    let question;
    let answer;
    let picture = null; // images pour les plus jeunes (sans le calcul écrit)
    if (level === 7) {
      const a = randInt(rng, 3, 10);
      const b = randInt(rng, 1, 6);
      const c = randInt(rng, 1, a + b - 1);
      answer = a + b - c;
      facts = `${name} a ${amountOf(obj, a)}. On lui en donne ${b}, puis ${name} en donne ${c} à un copain.`;
      question = `Combien ${deMany(obj)} a ${name} maintenant ?`;
    } else {
      const add = level === 1 || (level !== 2 && rng() < 0.5);
      const most = max >= 100 ? 40 : 9;
      if (add) {
        const total = randInt(rng, 2, max);
        const b = randInt(rng, 1, Math.min(total - 1, most));
        const a = total - b;
        answer = total;
        facts = `${name} a ${amountOf(obj, a)}. On lui en donne ${b}.`;
        question = `Combien ${deMany(obj)} a ${name} maintenant ?`;
        picture = { a, b, op: '+' };
      } else {
        const a = randInt(rng, 2, max);
        const b = randInt(rng, 1, Math.min(a - 1, most));
        answer = a - b;
        facts = `${name} a ${amountOf(obj, a)}. ${name} en donne ${b}.`;
        question = `Combien ${deMany(obj)} reste-t-il à ${name} ?`;
        picture = { a, b, op: '−' };
      }
    }
    return {
      key: `problemes:${facts}`,
      text: question,
      instruction: `${facts} ${question}`,
      replay: [`${facts} ${question}`],
      stage: { type: 'story', text: facts, ...(level <= 3 && picture ? { picture: { ...picture, emoji: obj.emoji } } : {}) },
      choices: numberChoices(rng, answer, level >= 4 ? 4 : 3, 0, Math.max(max, answer + 3)).map((v) => ({ value: v, label: String(v) })),
      choiceStyle: 'numbers',
      answer,
      success: { speak: `${name} a ${amountOf(obj, answer)}.` },
    };
  },
};

// ---------------------------------------------------------------- Doubles et moitiés

export const doubles = {
  id: 'doubles',
  domain: 'maths',
  section: 'Nombres et calcul',
  title: 'Doubles et moitiés',
  icon: '👯',
  skill: 'Connaître les doubles et les moitiés',
  levels: ['Doubles jusqu’à 5 + 5, avec images', 'Doubles jusqu’à 10 + 10', 'Moitiés jusqu’à 20', 'Doubles et moitiés des dizaines'],
  generate(level, rng) {
    let n;
    let answer;
    let text;
    let stage = { type: 'none' };
    if (level <= 2) {
      n = randInt(rng, 1, level === 1 ? 5 : 10);
      answer = 2 * n;
      text = `Quel est le double de ${n} ?`;
      stage = level === 1
        ? { type: 'operation', a: n, b: n, op: '+', emoji: pick(rng, COUNT_EMOJI), hideEquation: true }
        : { type: 'equation', parts: [n, '+', n, '=', null] };
    } else if (level === 3) {
      n = 2 * randInt(rng, 1, 10);
      answer = n / 2;
      text = `Quelle est la moitié de ${n} ?`;
      stage = { type: 'objects', emoji: pick(rng, COUNT_EMOJI), count: n, perRow: n > 10 ? 10 : 5 };
    } else {
      const half = rng() < 0.5;
      n = half ? 20 * randInt(rng, 1, 5) : 10 * randInt(rng, 1, 5);
      answer = half ? n / 2 : n * 2;
      text = half ? `Quelle est la moitié de ${n} ?` : `Quel est le double de ${n} ?`;
    }
    return {
      key: `doubles:${text}`,
      text,
      instruction: text,
      stage,
      choices: numberChoices(rng, answer, level === 1 ? 3 : 4, 0, 200, level === 4 ? 10 : 1).map((v) => ({ value: v, label: String(v) })),
      choiceStyle: 'numbers',
      answer,
      success: { speak: `${text.replace('Quel est le', 'Le').replace('Quelle est la', 'La').replace(' ?', '')}, c’est ${answer}.` },
    };
  },
};

// ---------------------------------------------------------------- L'heure

const HOUR_LEVELS = [
  { label: 'Heures pile', minutes: [0] },
  { label: 'Et demie', minutes: [0, 30] },
  { label: 'Et quart, moins le quart', minutes: [0, 15, 30, 45] },
  { label: 'De 5 en 5 minutes', minutes: Array.from({ length: 12 }, (_, i) => i * 5) },
];

export function clockLabel(h, m) {
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

function clockSpeech(h, m) {
  const hours = `${h === 1 ? 'une' : h} heure${h > 1 ? 's' : ''}`;
  if (m === 0) return hours;
  if (m === 30) return `${hours} et demie`;
  if (m === 15) return `${hours} et quart`;
  if (m === 45) {
    const next = (h % 12) + 1;
    return `${next === 1 ? 'une' : next} heure${next > 1 ? 's' : ''} moins le quart`;
  }
  return `${hours} ${m}`;
}

export const heure = {
  id: 'heure',
  domain: 'maths',
  section: 'Heure et mesures',
  title: 'Quelle heure est-il ?',
  icon: '🕒',
  skill: 'Lire l’heure sur une horloge à aiguilles',
  levels: HOUR_LEVELS.map((l) => l.label),
  generate(level, rng) {
    const { minutes } = HOUR_LEVELS[level - 1];
    const h = randInt(rng, 1, 12);
    const m = pick(rng, minutes);
    const options = new Set([clockLabel(h, m)]);
    const nextH = (h % 12) + 1;
    const prevH = h === 1 ? 12 : h - 1;
    const tries = [
      [nextH, m], [prevH, m], [h, (m + 30) % 60],
      [m === 0 ? 12 : Math.round(m / 5) || 12, h * 5 % 60], // aiguilles inversées
      [h, pick(rng, minutes)], [nextH, pick(rng, minutes)],
    ];
    for (const [hh, mm] of tries) {
      if (options.size >= 4) break;
      if (level === 1 && mm !== 0) continue;
      options.add(clockLabel(hh, mm));
    }
    return {
      key: `heure:${h}:${m}`,
      text: 'Quelle heure est-il ?',
      instruction: 'Regarde l’horloge. Quelle heure est-il ?',
      short: { text: 'Quelle heure est-il ?' },
      stage: { type: 'clock', h, m },
      choices: shuffle(rng, [...options]).map((label) => ({ value: label, label })),
      choiceStyle: 'words',
      answer: clockLabel(h, m),
      success: { speak: `Il est ${clockSpeech(h, m)}.` },
    };
  },
};

// ---------------------------------------------------------------- L'intrus (logique)

const FAMILIES = {
  fruits: { name: 'des fruits', items: ['🍎', '🍌', '🍇', '🍓', '🍐', '🍊', '🍒', '🍍'] },
  vehicules: { name: 'des véhicules', items: ['🚗', '🚌', '🚲', '🚂', '✈️', '🚀', '🚜', '🛴'] },
  animaux: { name: 'des animaux', items: ['🐶', '🐱', '🐰', '🐭', '🐻', '🦊', '🐮', '🐷'] },
  vetements: { name: 'des vêtements', items: ['👕', '👖', '👗', '🧦', '🧢', '🧥', '🧤'] },
  musique: { name: 'des instruments de musique', items: ['🎸', '🥁', '🎹', '🎺', '🎻'] },
  ecole: { name: 'des affaires d’école', items: ['✏️', '📏', '✂️', '🎒', '📖'] },
  legumes: { name: 'des légumes', items: ['🥕', '🥦', '🌽', '🍆', '🥔', '🥒'] },
  ferme: { name: 'des animaux de la ferme', items: ['🐮', '🐷', '🐑', '🐴', '🐐'] },
  mer: { name: 'des animaux de la mer', items: ['🐟', '🐙', '🦀', '🐬', '🐳', '🦈'] },
  insectes: { name: 'des petites bêtes', items: ['🐞', '🐝', '🦋', '🐜', '🐛'] },
  oiseaux: { name: 'des oiseaux', items: ['🐦', '🦆', '🦉', '🐧', '🦜'] },
};
const FAR_FAMILIES = ['fruits', 'vehicules', 'animaux', 'vetements', 'musique', 'ecole'];
const CLOSE_PAIRS = [['fruits', 'legumes'], ['legumes', 'fruits'], ['ferme', 'mer'], ['mer', 'ferme'], ['insectes', 'oiseaux'], ['oiseaux', 'insectes'], ['mer', 'oiseaux']];
const INTRUS_SHAPES = ['rond', 'carré', 'triangle', 'étoile', 'cœur'];

export const intrus = {
  id: 'intrus',
  domain: 'maths',
  section: 'Formes et logique',
  title: 'L’intrus',
  icon: '🕵️',
  skill: 'Trouver l’intrus : classer, comparer, raisonner',
  levels: ['Familles très différentes', 'Familles proches', 'Formes de toutes les couleurs'],
  generate(level, rng) {
    if (level === 3) {
      const [same, odd] = sample(rng, INTRUS_SHAPES, 2);
      const colors = sample(rng, COLORS, 4);
      const options = shuffle(rng, [0, 1, 2, 3]).map((k, i) => ({ value: i === 0 ? 'intrus' : `forme${i}`, shape: i === 0 ? odd : same, color: colors[k] }));
      return {
        key: `intrus:${same}:${odd}`,
        text: 'Trouve l’intrus.',
        instruction: 'Trouve l’intrus : la forme qui n’est pas comme les autres. Attention, les couleurs ne comptent pas !',
        short: { key: 'intrus:formes', text: 'Trouve l’intrus.' },
        stage: { type: 'none' },
        choices: shuffle(rng, options),
        choiceStyle: 'pictures',
        answer: 'intrus',
        success: { speak: `Oui ! Les autres sont des ${same === 'cœur' ? 'cœurs' : `${same}s`}.` },
      };
    }
    const [fam, other] = level === 1 ? sample(rng, FAR_FAMILIES, 2) : pick(rng, CLOSE_PAIRS);
    const group = sample(rng, FAMILIES[fam].items, 3);
    const odd = pick(rng, FAMILIES[other].items.filter((e) => !FAMILIES[fam].items.includes(e)));
    return {
      key: `intrus:${odd}:${group.join('')}`,
      text: 'Trouve l’intrus.',
      instruction: 'Trouve l’intrus : celui qui n’est pas de la même famille que les autres.',
      short: { key: 'intrus', text: 'Trouve l’intrus.' },
      stage: { type: 'none' },
      choices: shuffle(rng, [...group, odd]).map((e) => ({ value: e, label: e })),
      choiceStyle: 'pictures',
      answer: odd,
      success: { speak: `Oui ! Les autres sont ${FAMILIES[fam].name}.` },
    };
  },
};

// ---------------------------------------------------------------- Les ombres (repérage)

const SHADOW_ITEMS = ['🦒', '🐘', '🐌', '🦕', '🐿️', '🦔', '🐢', '🐕', '🐎', '🦖', '🚲', '🛴', '✈️', '🚁', '🦩', '🐈'];
const SHADOW_SIMPLE = ['🍎', '⭐', '🌙', '☂️', '🎈', '🔑', '⚽', '🏠', '🦋', '🐟', '🌳', '🎸'];
const ORIENTATIONS = [
  { value: 'pareil', transform: 'none' },
  { value: 'miroir', transform: 'scaleX(-1)' },
  { value: 'tete-en-bas', transform: 'rotate(180deg)' },
  { value: 'couche', transform: 'rotate(90deg)' },
];

export const ombres = {
  id: 'ombres',
  domain: 'maths',
  section: 'Formes et logique',
  title: 'Les ombres',
  icon: '👤',
  skill: 'Reconnaître une forme, repérer l’orientation (droite, gauche, à l’envers)',
  levels: ['Trouve l’ombre (3 ombres)', 'Trouve l’ombre (4 animaux)', 'Dans le bon sens'],
  generate(level, rng) {
    if (level === 3) {
      const item = pick(rng, SHADOW_ITEMS);
      return {
        key: `ombres:sens:${item}`,
        text: 'Quelle ombre est dans le même sens ?',
        instruction: 'Regarde bien l’image. Quelle ombre est tournée dans le même sens ?',
        short: { key: 'ombres:sens', text: 'Dans le même sens ?' },
        stage: { type: 'picture', emoji: item },
        choices: shuffle(rng, ORIENTATIONS).map((o) => ({ value: o.value, shadow: item, transform: o.transform, name: 'ombre' })),
        choiceStyle: 'pictures',
        answer: 'pareil',
        success: { speak: 'Oui, elle est dans le même sens !' },
      };
    }
    const pool = level === 1 ? SHADOW_SIMPLE : SHADOW_ITEMS;
    const options = sample(rng, pool, level === 1 ? 3 : 4);
    const target = options[0];
    return {
      key: `ombres:${target}`,
      text: 'Quelle est son ombre ?',
      instruction: 'Regarde l’image. Touche son ombre.',
      short: { key: 'ombres', text: 'Quelle est son ombre ?' },
      stage: { type: 'picture', emoji: target },
      choices: shuffle(rng, options).map((e) => ({ value: e, shadow: e, name: 'ombre' })),
      choiceStyle: 'pictures',
      answer: target,
      success: { speak: 'Bravo, c’est la bonne ombre !' },
    };
  },
};

// ---------------------------------------------------------------- Sudoku

const SUDOKU_LEVELS = [
  { label: '4 × 4 avec des images, 4 cases', size: 4, holes: 4, pictures: true },
  { label: '4 × 4 avec des images, 7 cases', size: 4, holes: 7, pictures: true },
  { label: '4 × 4 avec des chiffres, 6 cases', size: 4, holes: 6 },
  { label: '4 × 4 avec des chiffres, 10 cases', size: 4, holes: 10 },
  { label: '6 × 6 avec des chiffres, 12 cases', size: 6, holes: 12 },
  { label: '6 × 6 avec des chiffres, 18 cases', size: 6, holes: 18 },
];
const SUDOKU_PICTURES = [['🍎', '🍌', '🍇', '🍓'], ['🐶', '🐱', '🐰', '🐻'], ['🚗', '🚲', '🚂', '✈️'], ['⭐', '🌙', '☀️', '☁️']];
const range = (n) => Array.from({ length: n }, (_, i) => i);

/** Taille des carrés : 2 × 2 pour une grille de 4, 2 lignes × 3 colonnes pour une grille de 6. */
export function sudokuBox(size) {
  return size === 4 ? [2, 2] : [2, 3];
}

/** Une grille pleine et juste (valeurs 0…size-1), mélangée à partir d'un motif de base. */
export function sudokuGrid(rng, size) {
  const [br, bc] = sudokuBox(size);
  const base = (r, c) => (bc * (r % br) + Math.floor(r / br) + c) % size;
  const rows = shuffle(rng, range(size / br)).flatMap((band) => shuffle(rng, range(br)).map((i) => band * br + i));
  const cols = shuffle(rng, range(size / bc)).flatMap((stack) => shuffle(rng, range(bc)).map((i) => stack * bc + i));
  const symbols = shuffle(rng, range(size));
  return rows.flatMap((r) => cols.map((c) => symbols[base(r, c)]));
}

/** Peut-on poser cette valeur dans cette case (ligne, colonne, carré) ? */
export function sudokuAllows(grid, size, cell, value) {
  const [br, bc] = sudokuBox(size);
  const r = Math.floor(cell / size);
  const c = cell % size;
  for (let i = 0; i < size; i++) {
    if (grid[r * size + i] === value || grid[i * size + c] === value) return false;
  }
  const r0 = r - (r % br);
  const c0 = c - (c % bc);
  for (let y = r0; y < r0 + br; y++) for (let x = c0; x < c0 + bc; x++) if (grid[y * size + x] === value) return false;
  return true;
}

/** Nombre de solutions (on s'arrête à 2) : une grille d'enfant doit n'en avoir qu'une. */
export function countSolutions(puzzle, size, limit = 2) {
  const grid = [...puzzle];
  let count = 0;
  const solve = () => {
    const cell = grid.indexOf(null);
    if (cell === -1) {
      count++;
      return;
    }
    for (let v = 0; v < size && count < limit; v++) {
      if (!sudokuAllows(grid, size, cell, v)) continue;
      grid[cell] = v;
      solve();
      grid[cell] = null;
    }
  };
  solve();
  return count;
}

export function makeSudoku(rng, size, holes) {
  for (;;) {
    const solution = sudokuGrid(rng, size);
    const puzzle = [...solution];
    let removed = 0;
    for (const cell of shuffle(rng, range(size * size))) {
      if (removed === holes) break;
      puzzle[cell] = null;
      if (countSolutions(puzzle, size) === 1) removed++;
      else puzzle[cell] = solution[cell];
    }
    if (removed === holes) return { solution, puzzle };
  }
}

export const sudoku = {
  id: 'sudoku',
  domain: 'maths',
  section: 'Formes et logique',
  title: 'Sudoku',
  icon: '🔲',
  skill: 'Raisonner : chaque image (ou chiffre) une seule fois par ligne, par colonne et par carré',
  levels: SUDOKU_LEVELS.map((l) => l.label),
  generate(level, rng) {
    const { size, holes, pictures } = SUDOKU_LEVELS[level - 1];
    const { solution, puzzle } = makeSudoku(rng, size, holes);
    const symbols = pictures ? pick(rng, SUDOKU_PICTURES) : range(size).map((i) => String(i + 1));
    const what = pictures ? 'chaque image' : 'chaque chiffre';
    return {
      key: `sudoku:${puzzle.map((v) => (v === null ? '.' : v)).join('')}`,
      interaction: 'sudoku',
      text: `Complète la grille : ${what} une seule fois par ligne, par colonne et par carré.`,
      instruction: `Complète la grille. Dans chaque ligne, chaque colonne et chaque carré, ${what} doit être là une seule fois. Touche une case vide, puis ${pictures ? 'une image' : 'un chiffre'}.`,
      short: { key: `sudoku:${size}:${Boolean(pictures)}`, text: 'Complète la grille !' },
      stage: { type: 'sudoku', size, box: sudokuBox(size), puzzle, solution, symbols },
      choices: [],
      answer: null,
      success: { speak: 'Bravo, la grille est complète !' },
    };
  },
};

export const MATHS_EXTRA_GAMES = [formes, algorithmes, intrus, ombres, sudoku, tables, relier, ranger, problemes, doubles, heure];
