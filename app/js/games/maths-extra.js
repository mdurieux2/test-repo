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

// Nombre de côtés (le rond n'en a pas : il est tout arrondi).
export const SHAPE_SIDES = { rond: 0, triangle: 3, carré: 4, rectangle: 4 };

// Devinettes : une seule forme convient parmi les choix (les autres sont dans « others »).
const SHAPE_RIDDLES = [
  { text: 'la forme qui a 3 côtés', answer: 'triangle', others: ['rond', 'carré', 'rectangle', 'étoile', 'cœur'] },
  { text: 'la forme qui a 4 côtés tous pareils', answer: 'carré', others: ['rond', 'triangle', 'rectangle', 'étoile', 'cœur'] },
  { text: 'la forme qui a 2 grands côtés et 2 petits', answer: 'rectangle', others: ['rond', 'triangle', 'carré', 'étoile', 'cœur'] },
  { text: 'la forme qui n’a ni côté, ni pointe', answer: 'rond', others: ['triangle', 'carré', 'rectangle', 'étoile'] },
  { text: 'la forme qui a 5 pointes', answer: 'étoile', others: ['rond', 'triangle', 'carré', 'rectangle'] },
];

// Formes en émojis, de plusieurs couleurs : c'est la forme qui compte, pas la couleur.
export const SHAPE_EMOJI = {
  rond: ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠'],
  carré: ['🟥', '🟦', '🟩', '🟨', '🟪', '🟧'],
  cœur: ['❤️', '💙', '💚', '💛', '💜', '🧡'],
  triangle: ['🔺', '🔻'],
};
const SHAPE_PLURAL = { rond: 'ronds', carré: 'carrés', cœur: 'cœurs' };

/** Niveau 4 : compter les côtés d'une forme. */
function shapeSides(rng) {
  const shape = pick(rng, Object.keys(SHAPE_SIDES));
  const color = pick(rng, COLORS);
  const answer = SHAPE_SIDES[shape];
  const name = SHAPE_ARTICLE[shape];
  return {
    key: `formes:cotes:${shape}:${color}`,
    text: 'Combien de côtés a cette forme ?',
    instruction: 'Compte les côtés de cette forme. Combien y en a-t-il ?',
    short: { key: 'formes:cotes', text: 'Combien de côtés ?' },
    stage: { type: 'shape', shape, color },
    choices: numberChoices(rng, answer, 3, 0, 6).map((v) => ({ value: v, label: String(v) })),
    choiceStyle: 'numbers',
    answer,
    success: { speak: answer ? `${name[0].toUpperCase()}${name.slice(1)} a ${answer} côtés.` : 'Le rond n’a pas de côté : il est tout rond !' },
  };
}

/** Niveau 5 : trouver la forme d'après ses côtés ou ses pointes. */
function shapeRiddle(rng) {
  const riddle = pick(rng, SHAPE_RIDDLES);
  const options = shuffle(rng, [riddle.answer, ...sample(rng, riddle.others, 3)]);
  return {
    key: `formes:devinette:${riddle.answer}:${options.join('')}`,
    text: `Touche ${riddle.text}.`,
    instruction: `Touche ${riddle.text}.`,
    stage: { type: 'none' },
    choices: options.map((s) => ({ value: s, shape: s, color: pick(rng, COLORS) })),
    choiceStyle: 'pictures',
    answer: riddle.answer,
    success: { speak: `Oui, c’est ${SHAPE_ARTICLE[riddle.answer]} !` },
  };
}

/** Niveau 6 : compter les formes d'une sorte parmi d'autres, de toutes les couleurs. */
function shapeCount(rng) {
  const kind = pick(rng, Object.keys(SHAPE_PLURAL));
  const answer = randInt(rng, 2, 5);
  const others = Object.keys(SHAPE_EMOJI).filter((k) => k !== kind).flatMap((k) => SHAPE_EMOJI[k]);
  const items = shuffle(rng, [
    ...Array.from({ length: answer }, () => pick(rng, SHAPE_EMOJI[kind])),
    ...Array.from({ length: 8 - answer }, () => pick(rng, others)),
  ]);
  const plural = SHAPE_PLURAL[kind];
  return {
    key: `formes:compte:${kind}:${items.join('')}`,
    text: `Combien y a-t-il de ${plural} ?`,
    instruction: `Compte les ${plural}. Attention, les couleurs ne comptent pas ! Combien y en a-t-il ?`,
    short: { key: 'formes:compte', text: `Combien de ${plural} ?` },
    stage: { type: 'pattern', items },
    choices: numberChoices(rng, answer, 4, 1, 8).map((v) => ({ value: v, label: String(v) })),
    choiceStyle: 'numbers',
    answer,
    success: { speak: `Il y a ${answer} ${plural}.` },
  };
}

export const formes = {
  id: 'formes',
  domain: 'maths',
  section: 'Formes et logique',
  title: 'Les formes',
  icon: '🔺',
  skill: 'Reconnaître et nommer les formes',
  levels: ['Rond, carré, triangle', 'Avec le rectangle', 'Formes et couleurs mélangées', 'Combien de côtés ?', 'Côtés et pointes', 'Compte les formes'],
  generate(level, rng) {
    if (level === 4) return shapeSides(rng);
    if (level === 5) return shapeRiddle(rng);
    if (level === 6) return shapeCount(rng);
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
const PATTERNS = { 1: ['AB'], 2: ['AAB', 'ABB'], 3: ['ABC'], 4: ['AABB', 'ABCD'], 5: ['AAB', 'ABB', 'ABC', 'AABB', 'ABCD'], 6: ['ABCB', 'ABCCBA', 'ABCDCB'] };
// Pour les nouveaux niveaux : des motifs qui ne se distinguent pas seulement par la couleur.
const SHAPED_MOTIFS = MOTIFS.slice(1, 5);

/** Les choix : les motifs de la suite, plus un autre (4 au plus), dont la réponse. */
function patternOptions(rng, items, motif, answer) {
  const used = [...new Set(items.filter((it) => it !== null))];
  const extra = motif.filter((m) => !used.includes(m));
  const options = shuffle(rng, [...new Set([...used, answer, ...extra])]).slice(0, 4);
  if (!options.includes(answer)) options[0] = answer;
  return shuffle(rng, options).map((m) => ({ value: m, label: m }));
}

/** « Suite qui grandit » : A B, A A B, A A A B… (ou A B, A B B, A B B B…), puis ce qui vient après. */
export function growingPattern(firstGrows, length) {
  const seq = [];
  for (let k = 1; seq.length <= length; k++) {
    seq.push(...(firstGrows ? [...Array(k).fill('A'), 'B'] : ['A', ...Array(k).fill('B')]));
  }
  return seq.slice(0, length + 1);
}

export const algorithmes = {
  id: 'algorithmes',
  domain: 'maths',
  section: 'Formes et logique',
  title: 'Les suites de motifs',
  icon: '🔁',
  skill: 'Continuer une suite logique (algorithme)',
  levels: ['A B A B…', 'A A B…, A B B…', 'A B C…', 'A A B B…, A B C D…', 'Trouve ce qui manque', 'Suites aller-retour', 'Suites qui grandissent'],
  generate(level, rng) {
    if (level >= 5) {
      const motif = shuffle(rng, pick(rng, SHAPED_MOTIFS));
      const symbol = (c) => motif[c.charCodeAt(0) - 65];
      if (level === 5) {
        // un trou au milieu de la suite : il faut trouver la règle, pas seulement continuer
        const pattern = pick(rng, PATTERNS[5]);
        const length = Math.min(9, pattern.length * 2 + 2);
        const full = Array.from({ length }, (_, i) => symbol(pattern[i % pattern.length]));
        const gap = randInt(rng, 1, length - 2);
        const items = full.map((it, i) => (i === gap ? null : it));
        return {
          key: `algorithmes:trou:${pattern}:${items.map((it) => it ?? '?').join('')}`,
          text: 'Qu’est-ce qui manque ?',
          instruction: 'Regarde bien la suite. Qu’est-ce qui manque à la place du point d’interrogation ?',
          short: { key: 'algorithmes:trou', text: 'Qu’est-ce qui manque ?' },
          stage: { type: 'pattern', items },
          choices: patternOptions(rng, items, motif, full[gap]),
          choiceStyle: 'pictures',
          answer: full[gap],
        };
      }
      let letters;
      if (level === 6) {
        // aller-retour : A B C B A B C B…, A B C C B A…
        const pattern = pick(rng, PATTERNS[6]);
        letters = Array.from({ length: randInt(rng, 8, 9) }, (_, i) => pattern[i % pattern.length]);
      } else {
        letters = growingPattern(rng() < 0.5, randInt(rng, 5, 8));
      }
      const items = letters.map(symbol);
      const answer = items.at(-1);
      const shown = [...items.slice(0, -1), null];
      const growing = level === 7;
      return {
        key: `algorithmes:${growing ? 'grandit' : 'retour'}:${shown.map((it) => it ?? '?').join('')}`,
        text: 'Qu’est-ce qui vient après ?',
        instruction: growing
          ? 'Attention, cette suite grandit à chaque fois ! Qu’est-ce qui vient après ?'
          : 'Cette suite va et revient, comme un aller-retour. Qu’est-ce qui vient après ?',
        short: { key: `algorithmes:${growing ? 'grandit' : 'retour'}`, text: 'Et après ?' },
        stage: { type: 'pattern', items: shown },
        choices: patternOptions(rng, shown, motif, answer),
        choiceStyle: 'pictures',
        answer,
      };
    }
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

// Des paquets tous pareils : « 4 sachets de 5 bonbons ».
const PACKS = [
  { box: 'boîte', boxes: 'boîtes', obj: { one: 'crayon', many: 'crayons' } },
  { box: 'sachet', boxes: 'sachets', obj: { one: 'bonbon', many: 'bonbons' } },
  { box: 'panier', boxes: 'paniers', obj: { one: 'pomme', many: 'pommes', f: true } },
  { box: 'assiette', boxes: 'assiettes', obj: { one: 'gâteau', many: 'gâteaux' } },
  { box: 'bocal', boxes: 'bocaux', obj: { one: 'poisson', many: 'poissons' } },
  { box: 'vase', boxes: 'vases', obj: { one: 'fleur', many: 'fleurs', f: true } },
];

/** Un produit des tables (×2, ×3, ×4, ×5, ×10) qui ne dépasse pas 50. */
function smallProduct(rng) {
  const table = pick(rng, TABLES[5]);
  const n = randInt(rng, 2, table === 10 ? 5 : 9);
  return [n, table];
}

/** Niveaux 7 à 9 : le nombre qui manque, les paquets, les partages. */
function tablesBeyond(level, rng, name) {
  if (level === 7) {
    const [n, table] = smallProduct(rng);
    const product = n * table;
    const hideFirst = rng() < 0.5;
    const answer = hideFirst ? n : table;
    const instruction = hideFirst ? `Combien de fois ${table} font ${product} ?` : `${n} fois combien font ${product} ?`;
    return {
      key: `tables:trou:${hideFirst ? `?x${table}` : `${n}x?`}=${product}`,
      text: 'Quel nombre manque ?',
      instruction,
      short: { key: 'tables:trou', text: 'Quel nombre manque ?', speak: instruction },
      stage: { type: 'equation', parts: hideFirst ? [null, '×', table, '=', product] : [n, '×', null, '=', product] },
      choices: numberChoices(rng, answer, 4, 1, 10).map((v) => ({ value: v, label: String(v) })),
      choiceStyle: 'numbers',
      answer,
      success: { speak: `${n} fois ${table}, égale ${product}` },
    };
  }
  const pack = pick(rng, PACKS);
  const { obj } = pack;
  const [n, table] = smallProduct(rng);
  let facts;
  let question;
  let answer;
  let speech;
  if (level === 8) {
    answer = n * table;
    facts = `${name} a ${n} ${pack.boxes}. Dans chaque ${pack.box}, il y a ${table} ${obj.many}.`;
    question = `Combien ${deMany(obj)} a ${name} en tout ?`;
    speech = `${n} fois ${table}, égale ${answer}. ${name} a ${answer} ${obj.many}.`;
  } else if (rng() < 0.5) {
    // partage en parts égales : combien chacun ?
    answer = n;
    facts = `${name} partage ${n * table} ${obj.many} entre ${table} enfants, en parts égales.`;
    question = `Combien ${deMany(obj)} a chaque enfant ?`;
    speech = `Chaque enfant a ${n} ${obj.many}, car ${table} fois ${n}, égale ${n * table}.`;
  } else {
    // groupement : combien de paquets ?
    answer = n;
    facts = `${name} met ${n * table} ${obj.many} dans des ${pack.boxes}, ${table} par ${pack.box}.`;
    question = `Combien ${deMany({ many: pack.boxes })} faut-il ?`;
    speech = `Il faut ${n} ${pack.boxes}, car ${n} fois ${table}, égale ${n * table}.`;
  }
  return {
    key: `tables:${level}:${facts}`,
    text: question,
    instruction: `${facts} ${question}`,
    replay: [`${facts} ${question}`],
    stage: { type: 'story', text: facts },
    choices: numberChoices(rng, answer, 4, 1, level === 8 ? 60 : 12).map((v) => ({ value: v, label: String(v) })),
    choiceStyle: 'numbers',
    answer,
    success: { speak: speech },
  };
}

export const tables = {
  id: 'tables',
  domain: 'maths',
  section: 'Nombres et calcul',
  title: 'Les tables',
  icon: '✖️',
  skill: 'Tables de multiplication (×2, ×3, ×4, ×5, ×10)',
  levels: ['Table de 2', 'Table de 5', 'Table de 10', 'Table de 3', 'Table de 4', 'Tables mélangées', 'Le nombre qui manque', 'Problèmes de paquets', 'Problèmes de partage'],
  generate(level, rng, index = 0, context = {}) {
    if (level >= 7) return tablesBeyond(level, rng, context.name || 'Lou');
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

// Niveaux 4 à 6 : on compte, puis on relie au nombre qui a un de plus, au double, au complément à 10.
export const RELIER_RULES = {
  4: {
    from: [1, 9], to: (n) => n + 1, key: 'plus',
    text: 'Relie chaque groupe au nombre qui a un de plus.', short: 'Un de plus !',
  },
  5: {
    from: [1, 5], to: (n) => 2 * n, key: 'double',
    text: 'Relie chaque groupe à son double.', short: 'Le double !',
  },
  6: {
    from: [1, 9], to: (n) => 10 - n, key: 'dix',
    text: 'Relie chaque groupe au nombre qui manque pour faire 10.', short: 'Pour faire 10 !',
  },
};

export const relier = {
  id: 'relier',
  domain: 'maths',
  section: 'Dénombrement',
  title: 'Relie les quantités',
  icon: '🔗',
  skill: 'Associer une quantité et son chiffre',
  levels: ['De 1 à 4', 'De 1 à 6', 'De 1 à 10', 'Un de plus', 'Le double', 'Pour faire 10'],
  generate(level, rng) {
    const rule = RELIER_RULES[level];
    if (rule) {
      const [lo, hi] = rule.from;
      const numbers = sample(rng, Array.from({ length: hi - lo + 1 }, (_, i) => lo + i), 4);
      const emoji = pick(rng, COUNT_EMOJI);
      return {
        key: `relier:${rule.key}:${numbers.join('-')}`,
        interaction: 'match',
        text: rule.text,
        instruction: `Compte, et ${rule.text[0].toLowerCase()}${rule.text.slice(1)}`,
        short: { key: `relier:${rule.key}`, text: rule.short },
        stage: { type: 'none' },
        pairs: numbers.map((n) => ({ objects: { emoji, count: n }, left: String(n), right: rule.to(n) })),
        rights: shuffle(rng, numbers.map(rule.to)),
        choices: [],
        answer: null,
        success: { speak: 'Tout est relié !' },
      };
    }
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

/** Un petit calcul écrit serré (« 9+6 », « 15−7 ») pour tenir dans une étiquette. */
function smallCalc(rng) {
  if (rng() < 0.5) {
    const a = randInt(rng, 1, 9);
    const b = randInt(rng, 1, 9);
    return { label: `${a}+${b}`, value: a + b };
  }
  const a = randInt(rng, 5, 18);
  const b = randInt(rng, 1, Math.min(9, a - 1));
  return { label: `${a}−${b}`, value: a - b };
}

/** Niveaux 8 à 10 : ranger des calculs, des nombres faits des mêmes chiffres, des nombres avec des zéros. */
function rangerBeyond(level, rng) {
  let items;
  let instruction;
  let short;
  if (level === 8) {
    items = [];
    while (items.length < 4) {
      const c = smallCalc(rng);
      if (!items.some((it) => it.value === c.value)) items.push(c);
    }
    instruction = 'Calcule, puis touche les calculs du plus petit résultat au plus grand.';
    short = { key: 'ranger:calculs', text: 'Du plus petit au plus grand résultat.' };
  } else {
    let values;
    if (level === 9) {
      // les mêmes trois chiffres, dans un autre ordre : 345, 354, 435…
      const [a, b, c] = sample(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9], 3);
      values = sample(rng, [[a, b, c], [a, c, b], [b, a, c], [b, c, a], [c, a, b], [c, b, a]], 4).map(([x, y, z]) => 100 * x + 10 * y + z);
      instruction = 'Ces nombres ont les mêmes chiffres ! Touche-les du plus petit au plus grand.';
    } else {
      // des zéros qui changent tout : 35, 305, 350, 503…
      const [a, b] = sample(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9], 2);
      values = shuffle(rng, [10 * a + b, ...sample(rng, [100 * a + b, 100 * a + 10 * b, 100 * b + a, 100 * b + 10 * a, 100 * a, 100 * b], 3)]);
      instruction = 'Attention aux zéros ! Touche les nombres du plus petit au plus grand.';
    }
    items = values.map((v) => ({ value: v, label: String(v) }));
    short = { key: `ranger:${level}`, text: 'Du plus petit au plus grand.' };
  }
  return {
    key: `ranger:${level}:${items.map((i) => i.label).join(',')}`,
    interaction: 'order',
    text: level === 8 ? 'Range du plus petit au plus grand résultat.' : 'Touche du plus petit au plus grand.',
    instruction,
    short,
    stage: { type: 'none' },
    items,
    order: 'asc',
    choices: [],
    answer: null,
    success: { speak: items.map((i) => i.value).sort((a, b) => a - b).join(', ') },
  };
}

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
    'Ranger des calculs',
    'Les mêmes chiffres',
    'Attention aux zéros',
  ],
  generate(level, rng) {
    if (level >= 8) return rangerBeyond(level, rng);
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
    'Combien de plus ?',
    'Trouver ce qui a changé',
    'Trouver le départ',
  ],
  generate(level, rng, index = 0, context = {}) {
    const name = context.name || 'Lou';
    const obj = pick(rng, STORY_OBJECTS);
    const max = [5, 5, 10, 10, 20, 100, 20, 20, 50, 100][level - 1];
    let facts;
    let question;
    let answer;
    let speech = null;
    let picture = null; // images pour les plus jeunes (sans le calcul écrit)
    const gain = level >= 9 && rng() < 0.5; // on gagne (on lui en donne) ou on perd (on en donne)
    if (level === 8) {
      // comparer : combien de plus, ou de moins, que son copain ?
      const [a, b] = sample(rng, Array.from({ length: max - 1 }, (_, i) => i + 2), 2);
      const friend = pick(rng, ['Son copain', 'Sa copine']);
      const more = a > b;
      answer = Math.abs(a - b);
      facts = `${name} a ${amountOf(obj, a)}. ${friend} en a ${b}.`;
      question = `Combien ${deMany(obj)} de ${more ? 'plus' : 'moins'} a ${name} ?`;
      speech = `${name} a ${amountOf(obj, answer)} de ${more ? 'plus' : 'moins'}.`;
    } else if (level === 9) {
      // la transformation est inconnue : combien en a-t-on donné, ou enlevé ?
      const big = randInt(rng, 6, max);
      const small = randInt(rng, 2, big - 2);
      answer = big - small;
      if (gain) {
        facts = `${name} a ${amountOf(obj, small)}. On lui en donne d’autres. Maintenant, ${name} a ${amountOf(obj, big)}.`;
        question = `Combien ${deMany(obj)} lui donne-t-on ?`;
        speech = `On lui donne ${amountOf(obj, answer)}.`;
      } else {
        facts = `${name} a ${amountOf(obj, big)}. ${name} en donne à un copain. Maintenant, il lui reste ${amountOf(obj, small)}.`;
        question = `Combien ${deMany(obj)} donne ${name} ?`;
        speech = `${name} donne ${amountOf(obj, answer)}.`;
      }
    } else if (level === 10) {
      // l'état de départ est inconnu
      const big = randInt(rng, 6, max);
      const b = randInt(rng, 2, Math.min(40, big - 2));
      answer = gain ? big - b : big;
      const now = gain ? big : big - b;
      facts = gain
        ? `${name} a des ${obj.many}. On lui en donne ${b}. Maintenant, ${name} a ${amountOf(obj, now)}.`
        : `${name} a des ${obj.many}. ${name} en donne ${b} à un copain. Maintenant, il lui reste ${amountOf(obj, now)}.`;
      question = `Combien ${deMany(obj)} avait ${name} au début ?`;
      speech = `Au début, ${name} avait ${amountOf(obj, answer)}.`;
    } else if (level === 7) {
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
      success: { speak: speech || `${name} a ${amountOf(obj, answer)}.` },
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
  levels: [
    'Doubles jusqu’à 5 + 5, avec images', 'Doubles jusqu’à 10 + 10', 'Moitiés jusqu’à 20', 'Doubles et moitiés des dizaines',
    'Presque des doubles', 'Doubles de 12, 23, 34…', 'Moitiés de 30, 50, 70…',
  ],
  generate(level, rng) {
    if (level === 5) {
      // 6 + 7, c'est le double de 6, plus 1
      const n = randInt(rng, 2, 9);
      const [a, b] = rng() < 0.5 ? [n, n + 1] : [n + 1, n];
      const answer = a + b;
      return {
        key: `doubles:presque:${a}+${b}`,
        text: 'Calcule avec un double !',
        instruction: `Combien font ${a} plus ${b} ? Pense au double de ${n} !`,
        short: { key: 'doubles:presque', text: 'Calcule !', speak: `${a} plus ${b} ?` },
        stage: { type: 'equation', parts: [a, '+', b, '=', null] },
        choices: numberChoices(rng, answer, 4, 0, 40).map((v) => ({ value: v, label: String(v) })),
        choiceStyle: 'numbers',
        answer,
        success: { speak: `${a} plus ${b}, c’est le double de ${n}, plus 1 : ${answer}.` },
      };
    }
    let n;
    let answer;
    let text;
    let stage = { type: 'none' };
    let hint = '';
    if (level === 6) {
      // double d'un nombre à deux chiffres : le double des dizaines, puis des unités (et 15, 25, 35, 45)
      n = rng() < 0.25 ? pick(rng, [15, 25, 35, 45]) : 10 * randInt(rng, 1, 4) + randInt(rng, 1, 4);
      answer = 2 * n;
      text = `Quel est le double de ${n} ?`;
      hint = ' Pense au double des dizaines, puis au double des unités.';
    } else if (level === 7) {
      // moitié de 30, 50, 70, 90, ou d'un nombre aux chiffres pairs (46 → 23)
      n = rng() < 0.4 ? pick(rng, [30, 50, 70, 90]) : 10 * pick(rng, [2, 4, 6, 8]) + pick(rng, [2, 4, 6, 8]);
      answer = n / 2;
      text = `Quelle est la moitié de ${n} ?`;
      hint = n % 20 === 10 ? ` Pense : ${n} c’est ${n - 10} et encore 10.` : ' Pense à la moitié des dizaines, puis des unités.';
    } else if (level <= 2) {
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
      instruction: `${text}${hint}`,
      stage,
      choices: numberChoices(rng, answer, level === 1 ? 3 : 4, 0, 200, level === 4 ? 10 : level === 6 ? 2 : 1).map((v) => ({ value: v, label: String(v) })),
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
  { label: 'Heures de l’après-midi', minutes: [0, 15, 30, 45] },
  { label: 'Plus tard : quelle heure ?', minutes: [0, 15, 30, 45] },
  { label: 'Combien de temps ?', minutes: [0, 15, 30, 45] },
];

// Durées (en minutes) : comment on les dit, comment on les écrit.
const DURATIONS = {
  15: { say: 'un quart d’heure', label: '15 min' },
  30: { say: 'une demi-heure', label: '30 min' },
  45: { say: 'trois quarts d’heure', label: '45 min' },
  60: { say: 'une heure', label: '1 h' },
  90: { say: 'une heure et demie', label: '1 h 30' },
  120: { say: 'deux heures', label: '2 h' },
  150: { say: 'deux heures et demie', label: '2 h 30' },
  180: { say: 'trois heures', label: '3 h' },
};
const LATER = [15, 30, 60, 120]; // « Dans un quart d'heure… »
const EVENTS = ['Le goûter', 'Le dessin animé', 'La piscine', 'Le repas', 'Le spectacle', 'La récréation'];

/** Ajoute des minutes à une heure de l'horloge (de 1 h à 12 h). */
export function addMinutes(h, m, minutes) {
  const total = ((h % 12) * 60 + m + minutes + 720 * 10) % 720;
  return [Math.floor(total / 60) || 12, total % 60];
}

/** Niveaux 5 à 7 : l'heure de l'après-midi, l'heure qu'il sera, le temps qu'il reste. */
function heureBeyond(level, rng, minutes) {
  const h = randInt(rng, 1, level === 5 ? 11 : 12);
  const m = pick(rng, minutes);
  const options = new Set();
  let answer;
  let text;
  let instruction;
  let short;
  let speech;
  if (level === 5) {
    // sur l'horloge, 3 h ; l'après-midi, on dit 15 h
    answer = clockLabel(h + 12, m);
    for (const [hh, mm] of [[h + 12, m], [h, m], [h === 11 ? 12 : h + 13, m], [h + 12, (m + 30) % 60], [h + 11, m]]) options.add(clockLabel(hh, mm));
    text = 'C’est l’après-midi. Quelle heure est-il ?';
    instruction = 'C’est l’après-midi. Regarde l’horloge : quelle heure est-il ?';
    short = { key: 'heure:apres-midi', text: 'L’après-midi : quelle heure ?' };
    speech = `Il est ${h + 12} heures${m ? ` ${m}` : ''}.`;
  } else if (level === 6) {
    const later = pick(rng, LATER);
    const [h2, m2] = addMinutes(h, m, later);
    answer = clockLabel(h2, m2);
    options.add(answer);
    for (const shift of shuffle(rng, [-later, ...LATER.filter((d) => d !== later)])) options.add(clockLabel(...addMinutes(h, m, shift)));
    text = `Dans ${DURATIONS[later].say}, quelle heure sera-t-il ?`;
    instruction = `Regarde l’horloge. Dans ${DURATIONS[later].say}, quelle heure sera-t-il ?`;
    speech = `Dans ${DURATIONS[later].say}, il sera ${clockSpeech(h2, m2)}.`;
  } else {
    const wait = pick(rng, [15, 30, 45, 60, 90, 120]);
    const [h2, m2] = addMinutes(h, m, wait);
    const event = pick(rng, EVENTS);
    answer = DURATIONS[wait].label;
    options.add(answer);
    // les durées les plus proches (15 min de plus, de moins…)
    const near = Object.keys(DURATIONS).map(Number).filter((d) => d !== wait)
      .sort((a, b) => Math.abs(a - wait) - Math.abs(b - wait)).slice(0, 4);
    for (const d of sample(rng, near, 3)) options.add(DURATIONS[d].label);
    text = `${event} est à ${clockLabel(h2, m2)}. Dans combien de temps ?`;
    instruction = `Regarde l’horloge. ${event} est à ${clockSpeech(h2, m2)}. Dans combien de temps ?`;
    speech = `Il faut attendre ${DURATIONS[wait].say}.`;
  }
  // l'après-midi, le piège principal (l'heure lue sans ajouter 12) est toujours proposé
  const must = level === 5 ? [clockLabel(h, m)] : [];
  const others = shuffle(rng, [...options].filter((o) => o !== answer && !must.includes(o)));
  return {
    key: `heure:${level}:${h}:${m}:${answer}`,
    text,
    instruction,
    ...(short ? { short } : {}),
    stage: { type: 'clock', h, m },
    choices: shuffle(rng, [answer, ...must, ...others].slice(0, 4)).map((label) => ({ value: label, label })),
    choiceStyle: 'words',
    answer,
    success: { speak: speech },
  };
}

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
    if (level >= 5) return heureBeyond(level, rng, minutes);
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

// Des mots à lire, rangés par familles (un mot n'est que dans une famille).
const WORD_FAMILIES = [
  { name: 'des animaux', words: ['chat', 'chien', 'lapin', 'poule', 'vache', 'loup', 'lion', 'cochon'] },
  { name: 'des fruits', words: ['pomme', 'poire', 'banane', 'fraise', 'cerise', 'citron', 'melon'] },
  { name: 'des vêtements', words: ['robe', 'pull', 'jupe', 'bonnet', 'veste', 'gant', 'short'] },
  { name: 'des véhicules', words: ['vélo', 'moto', 'bus', 'train', 'avion', 'bateau', 'camion'] },
  { name: 'des couleurs', words: ['rouge', 'bleu', 'vert', 'jaune', 'noir', 'blanc', 'violet'] },
  { name: 'des parties du corps', words: ['main', 'pied', 'tête', 'nez', 'bras', 'jambe', 'dent'] },
];

/** Niveau 5 : trois nombres suivent une règle (dizaines, unités, centaines), pas le quatrième. */
function numberIntrus(rng) {
  const rule = pick(rng, ['dizaines', 'rondes', 'unites', 'centaines']);
  const [d, e] = sample(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9], 2);
  let group;
  let odd;
  let why;
  if (rule === 'dizaines') {
    // 34, 37, 31… et 43 (les chiffres inversés) ; pas de 30, qui serait « l'intrus » d'une autre façon
    const units = sample(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((u) => u !== d), 3);
    group = units.map((u) => 10 * d + u);
    odd = 10 * units[0] + d;
    why = `ont ${d} dizaine${d > 1 ? 's' : ''}`;
  } else if (rule === 'rondes') {
    group = sample(rng, [10, 20, 30, 40, 50, 60, 70, 80, 90], 3);
    odd = 10 * d + 5;
    why = 'finissent par 0';
  } else if (rule === 'unites') {
    const tens = sample(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((t) => t !== d), 3);
    group = tens.map((t) => 10 * t + d);
    odd = 10 * d + tens[0];
    why = `finissent par ${d}`;
  } else {
    // 245, 278, 213… et 545
    const rest = sample(rng, Array.from({ length: 90 }, (_, i) => i + 10), 3);
    group = rest.map((r) => 100 * d + r);
    odd = 100 * e + rest[0];
    why = `ont ${d} centaine${d > 1 ? 's' : ''}`;
  }
  return {
    key: `intrus:nombres:${group.join('-')}:${odd}`,
    text: 'Trouve le nombre intrus.',
    instruction: 'Trois nombres se ressemblent. Trouve l’intrus : le nombre qui n’est pas comme les autres.',
    short: { key: 'intrus:nombres', text: 'Trouve le nombre intrus.' },
    stage: { type: 'none' },
    choices: shuffle(rng, [...group, odd]).map((v) => ({ value: v, label: String(v) })),
    choiceStyle: 'numbers',
    answer: odd,
    success: { speak: `Oui ! Les autres ${why}.` },
  };
}

/** Un calcul (« 7 + 3 », « 12 − 2 ») qui donne ce résultat. */
function calcFor(rng, result) {
  if (rng() < 0.5) {
    const a = randInt(rng, 1, result - 1);
    return `${a} + ${result - a}`;
  }
  const b = randInt(rng, 1, 9);
  return `${result + b} − ${b}`;
}

/** Niveau 6 : trois calculs ont le même résultat, pas le quatrième. */
function calcIntrus(rng) {
  const result = pick(rng, [10, 12, 15, 20]);
  const group = new Set();
  while (group.size < 3) group.add(calcFor(rng, result));
  const odd = calcFor(rng, result + pick(rng, [-2, -1, 1, 2]));
  return {
    key: `intrus:calculs:${[...group].join(',')}:${odd}`,
    text: 'Trouve le calcul intrus.',
    instruction: 'Trois calculs donnent le même résultat. Trouve le calcul intrus.',
    short: { key: 'intrus:calculs', text: 'Trouve le calcul intrus.' },
    stage: { type: 'none' },
    choices: shuffle(rng, [...group, odd]).map((c) => ({ value: c, label: c })),
    choiceStyle: 'words',
    answer: odd,
    success: { speak: `Oui ! Les autres font ${result}.` },
  };
}

export const intrus = {
  id: 'intrus',
  domain: 'maths',
  section: 'Formes et logique',
  title: 'L’intrus',
  icon: '🕵️',
  skill: 'Trouver l’intrus : classer, comparer, raisonner',
  levels: ['Familles très différentes', 'Familles proches', 'Formes de toutes les couleurs', 'L’intrus des mots', 'L’intrus des nombres', 'L’intrus des calculs'],
  generate(level, rng) {
    if (level === 4) {
      const [fam, other] = sample(rng, WORD_FAMILIES, 2);
      const group = sample(rng, fam.words, 3);
      const odd = pick(rng, other.words);
      return {
        key: `intrus:mots:${odd}:${group.join(',')}`,
        text: 'Trouve le mot intrus.',
        instruction: 'Lis les mots. Trouve l’intrus : le mot qui n’est pas de la même famille que les autres.',
        short: { key: 'intrus:mots', text: 'Trouve le mot intrus.' },
        stage: { type: 'none' },
        choices: shuffle(rng, [...group, odd]).map((w) => ({ value: w, label: w })),
        choiceStyle: 'words',
        answer: odd,
        success: { speak: `Oui ! Les autres sont ${fam.name}.` },
      };
    }
    if (level === 5) return numberIntrus(rng);
    if (level === 6) return calcIntrus(rng);
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
// Des familles d'ombres qui se ressemblent (il faut regarder les détails).
const SHADOW_FAMILIES = [
  ['🐄', '🐖', '🐑', '🐐', '🐎', '🐕'],
  ['🐦', '🦆', '🦉', '🐧', '🦜', '🐓'],
  ['🍎', '🍐', '🍌', '🍇', '🍓', '🍒', '🍍'],
  ['🐞', '🐝', '🦋', '🐜', '🐛', '🐌'],
  ['🐟', '🐙', '🦀', '🐬', '🐳', '🦈'],
];
// « Quelle ombre est… » : la position à trouver, dite avec des mots.
const ORIENTATION_ASK = {
  miroir: { text: 'Quelle ombre est comme dans un miroir ?', speak: 'Oui, elle est retournée comme dans un miroir !' },
  'tete-en-bas': { text: 'Quelle ombre a la tête en bas ?', speak: 'Oui, elle a la tête en bas !' },
  couche: { text: 'Quelle ombre est couchée sur le côté ?', speak: 'Oui, elle est couchée sur le côté !' },
};

/** Niveaux 4 à 6 : ombres qui se ressemblent, positions à nommer, l'ombre qui n'est pas tournée comme les autres. */
function ombresBeyond(level, rng) {
  if (level === 4) {
    const options = sample(rng, pick(rng, SHADOW_FAMILIES), 4);
    const target = options[0];
    return {
      key: `ombres:famille:${target}:${options.join('')}`,
      text: 'Quelle est son ombre ?',
      instruction: 'Les ombres se ressemblent : regarde bien les détails. Touche l’ombre de l’image.',
      short: { key: 'ombres:famille', text: 'Quelle est son ombre ?' },
      stage: { type: 'picture', emoji: target },
      choices: shuffle(rng, options).map((e) => ({ value: e, shadow: e, name: 'ombre' })),
      choiceStyle: 'pictures',
      answer: target,
      success: { speak: 'Bravo, c’est la bonne ombre !' },
    };
  }
  const item = pick(rng, SHADOW_ITEMS);
  if (level === 5) {
    const ask = pick(rng, Object.keys(ORIENTATION_ASK));
    return {
      key: `ombres:position:${ask}:${item}`,
      text: ORIENTATION_ASK[ask].text,
      instruction: `Regarde bien l’image. ${ORIENTATION_ASK[ask].text}`,
      stage: { type: 'picture', emoji: item },
      choices: shuffle(rng, ORIENTATIONS).map((o) => ({ value: o.value, shadow: item, transform: o.transform, name: 'ombre' })),
      choiceStyle: 'pictures',
      answer: ask,
      success: { speak: ORIENTATION_ASK[ask].speak },
    };
  }
  // trois ombres tournées pareil, une autrement (sans modèle)
  const [same, odd] = sample(rng, ORIENTATIONS, 2);
  const options = [{ value: 'intrus', transform: odd.transform }, ...[1, 2, 3].map((i) => ({ value: `ombre${i}`, transform: same.transform }))];
  return {
    key: `ombres:intrus:${item}:${same.value}:${odd.value}`,
    text: 'Quelle ombre n’est pas tournée comme les autres ?',
    instruction: 'Trois ombres sont tournées pareil. Trouve celle qui n’est pas tournée comme les autres.',
    short: { key: 'ombres:intrus', text: 'Laquelle est tournée autrement ?' },
    stage: { type: 'none' },
    choices: shuffle(rng, options).map((o) => ({ ...o, shadow: item, name: 'ombre' })),
    choiceStyle: 'pictures',
    answer: 'intrus',
    success: { speak: 'Oui, elle n’est pas tournée comme les autres !' },
  };
}

export const ombres = {
  id: 'ombres',
  domain: 'maths',
  section: 'Formes et logique',
  title: 'Les ombres',
  icon: '👤',
  skill: 'Reconnaître une forme, repérer l’orientation (droite, gauche, à l’envers)',
  levels: ['Trouve l’ombre (3 ombres)', 'Trouve l’ombre (4 animaux)', 'Dans le bon sens', 'Ombres qui se ressemblent', 'Miroir, couché, à l’envers', 'L’intrus des ombres'],
  generate(level, rng) {
    if (level >= 4) return ombresBeyond(level, rng);
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
  { label: '6 × 6 avec des images', size: 6, holes: 20, pictures: true },
  { label: '6 × 6 avec des lettres', size: 6, holes: 22, letters: true },
  { label: '6 × 6 expert, 24 cases', size: 6, holes: 24 },
];
const SUDOKU_PICTURES = [['🍎', '🍌', '🍇', '🍓'], ['🐶', '🐱', '🐰', '🐻'], ['🚗', '🚲', '🚂', '✈️'], ['⭐', '🌙', '☀️', '☁️']];
const SUDOKU_PICTURES_6 = [
  ['🍎', '🍌', '🍇', '🍓', '🍐', '🍊'], ['🐶', '🐱', '🐰', '🐻', '🐸', '🐷'],
  ['🚗', '🚲', '🚂', '✈️', '🚀', '⛵'], ['⭐', '🌙', '☀️', '☁️', '🌈', '❄️'],
];
const range = (n) => Array.from({ length: n }, (_, i) => i);

/**
 * La grille se résout-elle sans essayer au hasard ? On remplit seulement les cases où un
 * seul symbole est possible, ou le seul endroit possible d'un symbole dans une ligne,
 * une colonne ou un carré. (Pour les grilles les plus dures : on ne doit jamais deviner.)
 */
export function solvesBySingles(puzzle, size) {
  const grid = [...puzzle];
  const [br, bc] = sudokuBox(size);
  const units = [
    ...range(size).map((r) => range(size).map((c) => r * size + c)),
    ...range(size).map((c) => range(size).map((r) => r * size + c)),
    ...range(size / br).flatMap((by) => range(size / bc).map((bx) =>
      range(br).flatMap((y) => range(bc).map((x) => (by * br + y) * size + bx * bc + x)))),
  ];
  for (let progress = true; progress;) {
    progress = false;
    grid.forEach((v, cell) => {
      if (v !== null) return;
      const options = range(size).filter((s) => sudokuAllows(grid, size, cell, s));
      if (options.length === 1) {
        grid[cell] = options[0];
        progress = true;
      }
    });
    for (const unit of units) {
      for (let s = 0; s < size; s++) {
        if (unit.some((cell) => grid[cell] === s)) continue;
        const spots = unit.filter((cell) => grid[cell] === null && sudokuAllows(grid, size, cell, s));
        if (spots.length === 1) {
          grid[spots[0]] = s;
          progress = true;
        }
      }
    }
  }
  return !grid.includes(null);
}

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
    const { size, holes, pictures, letters } = SUDOKU_LEVELS[level - 1];
    let grid = makeSudoku(rng, size, holes);
    // les nouvelles grilles (niveau 7 et plus) doivent se résoudre sans deviner
    while (level >= 7 && !solvesBySingles(grid.puzzle, size)) grid = makeSudoku(rng, size, holes);
    const { solution, puzzle } = grid;
    let symbols = range(size).map((i) => String(i + 1));
    if (pictures) symbols = pick(rng, size === 6 ? SUDOKU_PICTURES_6 : SUDOKU_PICTURES);
    if (letters) symbols = 'ABCDEF'.slice(0, size).split('');
    const kind = pictures ? 'image' : letters ? 'lettre' : 'chiffre';
    const what = `chaque ${kind}`;
    return {
      key: `sudoku:${puzzle.map((v) => (v === null ? '.' : v)).join('')}`,
      interaction: 'sudoku',
      text: `Complète la grille : ${what} une seule fois par ligne, par colonne et par carré.`,
      instruction: `Complète la grille. Dans chaque ligne, chaque colonne et chaque carré, ${what} doit être là une seule fois. Touche une case vide, puis ${kind === 'chiffre' ? 'un chiffre' : `une ${kind}`}.`,
      short: { key: letters ? `sudoku:${size}:lettres` : `sudoku:${size}:${Boolean(pictures)}`, text: 'Complète la grille !' },
      stage: { type: 'sudoku', size, box: sudokuBox(size), puzzle, solution, symbols },
      choices: [],
      answer: null,
      success: { speak: 'Bravo, la grille est complète !' },
    };
  },
};

export const MATHS_EXTRA_GAMES = [formes, algorithmes, intrus, ombres, sudoku, tables, relier, ranger, problemes, doubles, heure];
