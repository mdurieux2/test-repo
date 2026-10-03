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

/** Nombres proches + un distracteur à ±10 (erreur classique sur les dizaines). */
function choicesWithTens(rng, answer, count, min, max) {
  const values = numberChoices(rng, answer, count, min, max);
  const tens = [answer + 10, answer - 10].filter((n) => n >= min && n <= max && !values.includes(n));
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
  ],
  generate(level, rng) {
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
      text: `Combien y a-t-il de ${obj.many} ?`,
      instruction: `Combien y a-t-il de ${obj.many} ?${tip}`,
      stage,
      choices: numberOptions(choicesWithTens(rng, count, choiceCount, 1, Math.max(max, 6))),
      choiceStyle: 'numbers',
      answer: count,
      success: { speak: `${count} ${count > 1 ? obj.many : obj.one}` },
    };
  },
};

export const viteVu = {
  id: 'vite-vu',
  domain: 'maths',
  section: DENOMBREMENT,
  title: 'Vite vu !',
  icon: '👀',
  skill: 'Reconnaître une quantité d’un coup d’œil (dé, boîte de 10, dizaines)',
  levels: ['Les points du dé (1 à 6)', 'La boîte de 10 (1 à 10)', 'Deux boîtes de 10 (11 à 20)', 'Dizaines et unités (jusqu’à 50)'],
  generate(level, rng) {
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
      stage: { type: 'flash', duration: [2500, 2500, 3000, 3500][level - 1], inner },
      choices: numberOptions(choicesWithTens(rng, n, level >= 3 ? 4 : 3, 1, max)),
      choiceStyle: 'numbers',
      answer: n,
      success: { speak: String(n) },
    };
  },
};

export const panier = {
  id: 'panier',
  domain: 'maths',
  section: DENOMBREMENT,
  title: 'Le panier',
  icon: '🧺',
  skill: 'Fabriquer une collection d’un nombre donné, grouper par 10',
  levels: ["Jusqu'à 5", "Jusqu'à 10", 'De 11 à 20', 'De 20 à 50 avec des sachets de 10'],
  generate(level, rng) {
    const [min, max] = [[1, 5], [1, 10], [11, 20], [20, 50]][level - 1];
    const target = randInt(rng, min, max);
    const fruit = pick(rng, FRUITS);
    const what = target === 1 ? `${fruit.f ? 'une' : 'un'} ${fruit.one}` : `${target} ${fruit.many}`;
    const tens = level === 4;
    return {
      key: `panier:${target}`,
      interaction: 'build',
      text: `Mets ${what} dans le panier.`,
      instruction: `Mets ${what} dans le panier.${tens ? ` Un sachet contient 10 ${fruit.many}.` : ''}`,
      stage: { type: 'build', emoji: fruit.emoji, target, tens, perRow: level >= 3 ? 10 : 5, max: max + 10 },
      choices: [],
      answer: target,
      success: { speak: `${target} ${target > 1 ? fruit.many : fruit.one}` },
    };
  },
};

export const dizaines = {
  id: 'dizaines',
  domain: 'maths',
  section: DENOMBREMENT,
  title: 'Dizaines et unités',
  icon: '🧱',
  skill: 'Compter des dizaines (barres de 10) et des unités (cubes)',
  levels: ['De 10 à 19 (une barre)', "Jusqu'à 50", "Jusqu'à 99", 'Attention : plus de 10 cubes !', "Centaines : jusqu'à 999"],
  generate(level, rng) {
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
      stage: { type: 'blocks', tens, units },
      choices: numberOptions(values),
      choiceStyle: 'numbers',
      answer: n,
      success: { speak: `${tens} dizaine${tens > 1 ? 's' : ''} et ${units} unité${units > 1 ? 's' : ''} : ${n}` },
    };
  },
};

// ---------------------------------------------------------------- Nombres et calcul

export const comparer = {
  id: 'comparer',
  domain: 'maths',
  section: CALCUL,
  title: 'Le plus grand',
  icon: '⚖️',
  skill: 'Comparer des collections et des nombres',
  levels: ['Collections (le plus)', "Nombres jusqu'à 20", "Nombres jusqu'à 100", "Nombres jusqu'à 1000"],
  generate(level, rng) {
    if (level === 1) {
      const obj = pick(rng, OBJECTS);
      const a = randInt(rng, 1, 10);
      let b = randInt(rng, 1, 9);
      if (b >= a) b += 1;
      return {
        key: `comparer:${a}-${b}`,
        text: `Où y a-t-il le plus de ${obj.many} ?`,
        instruction: `Où y a-t-il le plus de ${obj.many} ?`,
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
      // mêmes chiffres dans un autre ordre (352 / 325) ou même centaine
      a = randInt(rng, 100, 999);
      const digits = String(a).split('');
      const swapped = Number(digits[0] + digits[2] + digits[1]);
      b = swapped !== a && rng() < 0.5 ? swapped : randInt(rng, 100, 998);
      if (b >= a && b !== swapped) b += 1;
      if (b === a) b = a === 999 ? 998 : a + 1;
    } else {
      // Pièges classiques : chiffres inversés (47 / 74) ou même dizaine (43 / 48).
      const tens = randInt(rng, 1, 9);
      const units = randInt(rng, 0, 9);
      a = tens * 10 + units;
      const trap = rng();
      if (trap < 0.3 && units !== tens && units !== 0) {
        b = units * 10 + tens;
      } else if (trap < 0.6) {
        b = tens * 10 + ((units + randInt(rng, 1, 9)) % 10);
      } else {
        b = randInt(rng, 10, 98);
        if (b >= a) b += 1;
      }
    }
    const biggest = rng() < 0.5;
    const answer = biggest ? Math.max(a, b) : Math.min(a, b);
    const word = biggest ? 'le plus grand' : 'le plus petit';
    return {
      key: `comparer:${Math.min(a, b)}-${Math.max(a, b)}`,
      text: `Touche le nombre ${word}.`,
      instruction: `Touche le nombre ${word}.`,
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
  skill: 'Connaître la suite des nombres',
  levels: ["Jusqu'à 10", "Jusqu'à 20", "Jusqu'à 100", 'De 2 en 2, de 10 en 10', "Jusqu'à 1000 (de 1, 10 ou 100 en 100)"],
  generate(level, rng) {
    const length = 5;
    let step = 1;
    let start;
    if (level === 1) start = randInt(rng, 1, 6);
    else if (level === 2) start = randInt(rng, 0, 16);
    else if (level === 3) start = randInt(rng, 20, 95);
    else if (level === 5) {
      step = pick(rng, [1, 10, 100]);
      start = step === 100 ? 100 * randInt(rng, 0, 5) : randInt(rng, 100, 995 - 4 * step);
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
    return {
      key: `suite:${start}-${step}-${gap}`,
      text: 'Quel nombre manque ?',
      instruction: step === 1 ? 'Quel nombre manque ?' : `On compte de ${step} en ${step}. Quel nombre manque ?`,
      stage: { type: 'sequence', items },
      choices: numberOptions(numberChoices(rng, answer, level >= 3 ? 4 : 3, 0, level === 5 ? 1000 : 100, step)),
      choiceStyle: 'numbers',
      answer,
      success: { speak: numbers.join(', ') },
    };
  },
};

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

function distinctOperations(rng, palier, n, keyOf) {
  const ops = [];
  const seen = new Set();
  for (let tries = 0; ops.length < n && tries < 300; tries++) {
    const o = palierOperation(rng, palier);
    if (!seen.has(keyOf(o))) {
      seen.add(keyOf(o));
      ops.push(o);
    }
  }
  return ops;
}

/** Calcul à taper sur le pavé numérique. */
function keypadQuestion(rng, palier) {
  const { a, b, op, answer } = palierOperation(rng, palier);
  return {
    key: `calcul:${a}${op}${b}`,
    interaction: 'keypad',
    text: 'Calcule !',
    instruction: `Combien font ${a} ${opWord(op)} ${b} ?`,
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
    stage: { type: 'none' },
    pairs: ops.map((o) => ({ left: `${o.a} ${o.op} ${o.b}`, right: o.answer })),
    rights: shuffle(rng, ops.map((o) => o.answer)),
    choices: [],
    answer: null,
    success: { speak: 'Tout est relié !' },
  };
}

/** « Complète » : placer les nombres dans les cases (□ + □ = 8). */
function fillQuestion(rng, palier) {
  const ops = distinctOperations(rng, palier, 3, (o) => `${o.op}${o.answer}`);
  return {
    key: `calcul:complete:${ops.map((o) => `${o.op}${o.answer}`).join(',')}`,
    interaction: 'fill',
    text: 'Place les nombres dans les cases.',
    instruction: 'Place les nombres dans les cases, pour que les calculs soient justes.',
    stage: { type: 'none' },
    equations: ops.map((o) => ({ op: o.op, result: o.answer, solution: [o.a, o.b] })),
    tiles: shuffle(rng, ops.flatMap((o) => [o.a, o.b])),
    choices: [],
    answer: null,
    success: { speak: 'Tous les calculs sont justes !' },
  };
}

/** Juste si les deux nombres placés donnent bien le résultat. */
export function equationHolds({ op, result }, x, y) {
  return op === '+' ? x + y === result : x - y === result;
}

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

export const faireDix = {
  id: 'faire-dix',
  domain: 'maths',
  section: CALCUL,
  title: 'Faire 10',
  icon: '🔟',
  skill: 'Connaître les compléments à 5 et à 10',
  levels: ['Compléments à 5', 'Compléments à 10 avec la boîte', 'Compléments à 10 sans la boîte'],
  generate(level, rng) {
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

export const MATHS_GAMES = [compter, viteVu, panier, dizaines, comparer, suite, calcul, faireDix];
