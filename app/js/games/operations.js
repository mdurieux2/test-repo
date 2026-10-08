// Opérations : « Le partage » (début de la division : partager en parts égales, faire des paquets)
// et « L'addition posée » (en colonnes, unités sous les unités, avec la retenue).

import { pick, randInt, shuffle } from '../random.js';
import { numberChoices } from './helpers.js';

const CALCUL = 'Nombres et calcul';

/** « de bonbons », « d’étoiles », « d’œufs » */
function deMany(obj) {
  return /^[aeiouyéèêâîôœ]/i.test(obj.many) ? `d’${obj.many}` : `de ${obj.many}`;
}

/** « un bonbon », « une fraise », « 3 fraises » */
function amountOf(obj, n) {
  return n === 1 ? `${obj.f ? 'une' : 'un'} ${obj.one}` : `${n} ${obj.many}`;
}

const numberOptions = (values) => values.map((n) => ({ value: n, label: String(n) }));

/** Remplace un distracteur par `trap` (erreur classique), s'il n'est pas déjà parmi les choix. */
function withTrap(rng, values, answer, trap) {
  if (trap === answer || trap < 0 || values.includes(trap)) return values;
  const out = [...values];
  out[out.findIndex((v) => v !== answer)] = trap;
  return shuffle(rng, out);
}

// ---------------------------------------------------------------- Le partage

/** Ce qu'on partage entre les enfants. */
export const SHARE_OBJECTS = [
  { emoji: '🍬', one: 'bonbon', many: 'bonbons' },
  { emoji: '🍓', one: 'fraise', many: 'fraises', f: true },
  { emoji: '🍪', one: 'biscuit', many: 'biscuits' },
  { emoji: '🍎', one: 'pomme', many: 'pommes', f: true },
  { emoji: '🖍️', one: 'crayon', many: 'crayons' },
  { emoji: '🎈', one: 'ballon', many: 'ballons' },
  { emoji: '⭐', one: 'étoile', many: 'étoiles', f: true },
  { emoji: '🧁', one: 'gâteau', many: 'gâteaux' },
];

/** Les enfants (chacun a son assiette) : 5 au plus, tous différents. */
export const KIDS = ['👧', '👦', '🧒', '👧🏽', '👦🏾'];

// Problèmes racontés : on partage entre des copains, ou entre ses animaux.
const RECIPIENTS = [
  { one: 'copain', many: 'copains', objects: SHARE_OBJECTS },
  { one: 'lapin', many: 'lapins', objects: [{ emoji: '🥕', one: 'carotte', many: 'carottes', f: true }] },
  { one: 'chat', many: 'chats', objects: [{ emoji: '🐟', one: 'poisson', many: 'poissons' }] },
  { one: 'chien', many: 'chiens', objects: [{ emoji: '🦴', one: 'os', many: 'os' }] },
];

// Des paquets tous pareils : « 18 œufs dans des boîtes, 6 par boîte ».
const BOXES = [
  { box: 'boîte', boxes: 'boîtes', obj: { one: 'œuf', many: 'œufs' } },
  { box: 'sachet', boxes: 'sachets', obj: { one: 'bonbon', many: 'bonbons' } },
  { box: 'vase', boxes: 'vases', obj: { one: 'fleur', many: 'fleurs', f: true } },
  { box: 'pot', boxes: 'pots', obj: { one: 'crayon', many: 'crayons' } },
  { box: 'panier', boxes: 'paniers', obj: { one: 'pomme', many: 'pommes', f: true } },
];

const PARTAGE_LEVELS = [
  { label: 'Partager entre 2', mode: 'share', groups: [2], per: [2, 5] },
  { label: 'Partager entre 3', mode: 'share', groups: [3], per: [2, 5] },
  { label: 'Partager entre 4', mode: 'share', groups: [4], per: [2, 5] },
  { label: 'Combien chacun ?', mode: 'guess', groups: [2, 3, 4], per: [2, 5] },
  { label: 'Avec un reste', mode: 'rest', groups: [2, 3, 4], per: [2, 4] },
  { label: 'Des paquets de 5', mode: 'packets', size: 5 },
  { label: 'Partager jusqu’à 30', mode: 'share', groups: [2, 3, 4, 5], total: [12, 30] },
  { label: 'Problèmes de partage', mode: 'story' },
  { label: 'Paquets ou partage ?', mode: 'mixed-story' },
  { label: 'Mélange', mode: 'mix' },
];

/** Le dessin : les objets à partager et les enfants (ou les paquets à faire). */
function shareStage(obj, total, groups, size = null, who = []) {
  return { type: 'share', emoji: obj.emoji, one: obj.one, many: obj.many, f: Boolean(obj.f), total, groups, size, who };
}

/** Nombre d'enfants et part de chacun, d'après le niveau. */
function shareNumbers(rng, { groups, per, total }) {
  const n = pick(rng, groups);
  if (per) return [n, randInt(rng, ...per)];
  const [min, max] = total;
  return [n, randInt(rng, Math.max(2, Math.ceil(min / n)), Math.floor(max / n))];
}

/** Partager au doigt : toucher un enfant lui donne un objet ; avec un reste, dire ensuite combien il en reste. */
function shareQuestion(rng, config) {
  const obj = pick(rng, SHARE_OBJECTS);
  const [n, per] = shareNumbers(rng, config);
  const rest = config.mode === 'rest' ? randInt(rng, 1, n - 1) : 0;
  const total = n * per + rest;
  const who = shuffle(rng, KIDS).slice(0, n);
  const text = `Partage ${total} ${obj.many} entre ${n} enfants.`;
  const tip = `Touche un enfant pour lui en donner ${obj.f ? 'une' : 'un'}.`;
  const each = `Chacun a ${per} ${obj.many}.`;
  const base = {
    key: `partage:${config.mode}:${obj.emoji}${total}/${n}`,
    interaction: 'share',
    text,
    stage: shareStage(obj, total, n, null, who),
    choiceStyle: 'numbers',
  };
  if (!rest) {
    return {
      ...base,
      instruction: `${text} Chaque enfant doit en avoir autant. ${tip}`,
      short: { key: 'partage:share', text },
      choices: [],
      answer: per,
      success: { speak: each },
    };
  }
  return {
    ...base,
    instruction: `${text} Chaque enfant doit en avoir autant. Quand on ne peut plus partager, compte ce qui reste.`,
    short: { key: 'partage:rest', text },
    ask: { text: 'Combien en reste-t-il ?', summary: each },
    choices: numberOptions(numberChoices(rng, rest, 3, 0, n)),
    answer: rest,
    success: { speak: `Il en reste ${rest}.` },
  };
}

/** « Combien chacun ? » : le dessin, et trois réponses. */
function guessQuestion(rng, config) {
  const obj = pick(rng, SHARE_OBJECTS);
  const [n, per] = shareNumbers(rng, config);
  const total = n * per;
  const text = `On partage ${total} ${obj.many} entre ${n} enfants. Combien en a chaque enfant ?`;
  return {
    key: `partage:guess:${obj.emoji}${total}/${n}`,
    text,
    instruction: text,
    short: { key: 'partage:guess', text: 'Combien en a chaque enfant ?', speak: text },
    stage: shareStage(obj, total, n, null, shuffle(rng, KIDS).slice(0, n)),
    choices: numberOptions(withTrap(rng, numberChoices(rng, per, 3, 1, 10), per, n)),
    choiceStyle: 'numbers',
    answer: per,
    success: { speak: `Chacun a ${per} ${obj.many}.` },
  };
}

/** Faire des paquets de 5 au doigt, puis dire combien on en a fait. */
function packetsQuestion(rng, size) {
  const obj = pick(rng, SHARE_OBJECTS);
  const packs = randInt(rng, 2, 6);
  const rest = packs === 6 ? 0 : pick(rng, [0, 0, 1, 2, 3, 4]);
  const total = packs * size + rest;
  const text = `Fais des paquets de ${size} ${obj.many}.`;
  return {
    key: `partage:paquets:${obj.emoji}${total}`,
    interaction: 'share',
    text,
    instruction: `Il y a ${total} ${obj.many}. ${text} Touche le paquet pour y mettre ${obj.f ? 'une' : 'un'} ${obj.one}.`,
    short: { key: 'partage:paquets', text },
    stage: shareStage(obj, total, null, size),
    ask: { text: 'Combien de paquets as-tu faits ?' },
    choices: numberOptions(numberChoices(rng, packs, 3, 1, 8)),
    choiceStyle: 'numbers',
    answer: packs,
    success: { speak: rest ? `${packs} paquets de ${size}. Il en reste ${rest}.` : `${packs} paquets de ${size}.` },
  };
}

/** Un problème de partage raconté, avec le prénom de l'enfant ; parfois, il y a un reste. */
function shareStory(rng, name, { withRest = true } = {}) {
  const who = pick(rng, RECIPIENTS);
  const obj = pick(rng, who.objects);
  const n = randInt(rng, 2, 5);
  const per = randInt(rng, 2, Math.floor(30 / n) - (withRest ? 1 : 0));
  const rest = withRest && rng() < 0.5 ? randInt(rng, 1, n - 1) : 0;
  const total = n * per + rest;
  const facts = `${name} partage ${total} ${obj.many} entre ses ${n} ${who.many}, en parts égales.`;
  const askRest = rest > 0 && rng() < 0.5;
  const question = askRest ? `Combien ${deMany(obj)} reste-t-il ?` : `Combien ${deMany(obj)} a chaque ${who.one} ?`;
  const answer = askRest ? rest : per;
  let speech = `Chaque ${who.one} a ${amountOf(obj, per)}.`;
  if (rest) speech = `Chaque ${who.one} a ${amountOf(obj, per)}, et il en reste ${rest}.`;
  // pièges : retirer au lieu de partager, le nombre de parts, la part sans le reste
  let values = withTrap(rng, numberChoices(rng, answer, 4, 0, 15), answer, total - n);
  values = withTrap(rng, values, answer, askRest ? per : n);
  return {
    key: `partage:histoire:${total}/${n}:${askRest}`,
    text: question,
    instruction: `${facts} ${question}`,
    replay: [`${facts} ${question}`],
    stage: { type: 'story', text: facts },
    choices: numberOptions(values),
    choiceStyle: 'numbers',
    answer,
    success: { speak: speech },
  };
}

/** Un problème de paquets raconté : combien de boîtes faut-il ? */
function packetStory(rng, name) {
  const pack = pick(rng, BOXES);
  const { obj } = pack;
  const size = randInt(rng, 2, 6);
  const packs = randInt(rng, 2, Math.floor(30 / size));
  const total = packs * size;
  const facts = `${name} met ${total} ${obj.many} dans des ${pack.boxes}, ${size} par ${pack.box}.`;
  const question = `Combien ${deMany({ many: pack.boxes })} faut-il ?`;
  const values = withTrap(rng, numberChoices(rng, packs, 4, 1, 15), packs, total - size);
  return {
    key: `partage:paquets-histoire:${pack.box}${total}/${size}`,
    text: question,
    instruction: `${facts} ${question}`,
    replay: [`${facts} ${question}`],
    stage: { type: 'story', text: facts },
    choices: numberOptions(values),
    choiceStyle: 'numbers',
    answer: packs,
    success: { speak: `Il faut ${packs} ${pack.boxes}.` },
  };
}

export const partage = {
  id: 'partage',
  domain: 'maths',
  section: CALCUL,
  title: 'Le partage',
  icon: '🍬',
  skill: 'Partager en parts égales, faire des paquets, le reste : vers la division',
  levels: PARTAGE_LEVELS.map((l) => l.label),
  generate(level, rng, index = 0, context = {}) {
    const name = context.name || 'Lou';
    const config = PARTAGE_LEVELS[level - 1];
    switch (config.mode) {
      case 'guess': return guessQuestion(rng, config);
      case 'packets': return packetsQuestion(rng, config.size);
      case 'story': return shareStory(rng, name);
      case 'mixed-story': return rng() < 0.5 ? shareStory(rng, name, { withRest: false }) : packetStory(rng, name);
      case 'mix': return partage.generate(pick(rng, [4, 5, 6, 7, 8, 9]), rng, index, context);
      default: return shareQuestion(rng, config);
    }
  },
};

// ---------------------------------------------------------------- L'addition posée

/** Le chiffre de la colonne `col` (0 : unités, 1 : dizaines, 2 : centaines). */
export const digitAt = (n, col) => Math.floor(n / 10 ** col) % 10;
const lengthOf = (n) => String(n).length;
const PLACE_NAMES = ['Les unités', 'Les dizaines', 'Les centaines', 'Les milliers'];

/**
 * Les étapes du calcul posé, de droite à gauche : le chiffre du résultat de chaque colonne, et la
 * retenue posée en haut de la colonne suivante. La retenue de la dernière colonne s'écrit
 * directement au résultat (8 + 4 + 1 = 13 : on écrit 13). Soustraction : sans retenue.
 */
export function columnSteps(rows, op) {
  const len = Math.max(...rows.map(lengthOf));
  const steps = [];
  if (op === '−') {
    const [a, b] = rows;
    for (let col = 0; col < len; col++) steps.push({ kind: 'result', col, digit: digitAt(a, col) - digitAt(b, col), label: PLACE_NAMES[col] });
    return steps;
  }
  let carry = 0;
  for (let col = 0; col < len; col++) {
    const sum = rows.reduce((s, n) => s + digitAt(n, col), carry);
    steps.push({ kind: 'result', col, digit: sum % 10, label: PLACE_NAMES[col] });
    carry = Math.floor(sum / 10);
    if (carry && col < len - 1) steps.push({ kind: 'carry', col: col + 1, digit: carry, label: 'La retenue' });
    else if (carry) steps.push({ kind: 'result', col: col + 1, digit: carry, label: PLACE_NAMES[col + 1] });
  }
  return steps;
}

/**
 * Des nombres de `lens` chiffres (le premier est en haut) dont l'addition retient exactement
 * dans les colonnes `carries` (0 : les unités retiennent pour les dizaines…), sans chiffre de plus
 * au résultat. On tire les chiffres colonne par colonne, de droite à gauche.
 */
export function makeAddition(rng, lens, carries = []) {
  const len = Math.max(...lens);
  for (let tries = 0; tries < 200; tries++) {
    const digits = lens.map(() => []);
    let carry = 0;
    let ok = true;
    for (let col = 0; col < len && ok; col++) {
      ok = false;
      for (let t = 0; t < 80 && !ok; t++) {
        const d = lens.map((l) => (col < l ? randInt(rng, col === l - 1 ? 1 : 0, 9) : 0));
        const sum = d.reduce((a, b) => a + b, carry);
        if ((sum >= 10) !== carries.includes(col) || (col === len - 1 && sum >= 10)) continue;
        d.forEach((v, i) => { if (col < lens[i]) digits[i].push(v); });
        carry = Math.floor(sum / 10);
        ok = true;
      }
    }
    if (ok) return digits.map((ds) => Number([...ds].reverse().join('')));
  }
  throw new Error(`addition impossible : ${lens} ${carries}`);
}

/** Une soustraction sans retenue : chaque chiffre du haut est plus grand que celui du bas. */
export function makeSubtraction(rng, lens) {
  const [la, lb] = lens;
  const a = [];
  const b = [];
  for (let col = 0; col < la; col++) {
    const top = col === la - 1;
    if (col < lb) {
      // en haut à gauche, le chiffre du bas est plus petit : le résultat n'a pas de 0 devant
      const low = col === lb - 1 ? 1 : 0;
      const x = randInt(rng, top ? low + 1 : low, 9);
      a.push(x);
      b.push(randInt(rng, low, top ? x - 1 : x));
    } else {
      a.push(randInt(rng, top ? 1 : 0, 9));
    }
  }
  const num = (ds) => Number([...ds].reverse().join(''));
  return [num(a), num(b)];
}

const ADDITION_LEVELS = [
  { label: '2 chiffres, sans retenue', kind: 'add', lens: [[2, 2]], carries: [[]] },
  { label: '2 chiffres, avec retenue', kind: 'add', lens: [[2, 2]], carries: [[0]] },
  { label: 'La retenue toute seule', kind: 'carry', lens: [[2, 2], [2, 2], [2, 2, 2]], carries: [[0]] },
  { label: '3 nombres à 2 chiffres', kind: 'add', lens: [[2, 2, 2]], carries: [[0], [0], [0], []] },
  { label: '3 chiffres, sans retenue', kind: 'add', lens: [[3, 3], [3, 3], [3, 2]], carries: [[]] },
  { label: '3 chiffres, une retenue', kind: 'add', lens: [[3, 3], [3, 3], [3, 2]], carries: [[0], [1]] },
  { label: '3 chiffres, deux retenues', kind: 'add', lens: [[3, 3], [3, 3], [3, 2]], carries: [[0, 1]] },
  { label: 'Soustraction posée', kind: 'sub', lens: [[2, 2], [3, 2], [3, 3], [3, 3]] },
  { label: 'Bien poser l’opération', kind: 'layout' },
  { label: 'Mélange', kind: 'mix' },
];

const OP_WORD = { '+': 'plus', '−': 'moins' };
const START = 'Commence par les unités, à droite.';

/** Le calcul en colonnes, à remplir chiffre par chiffre sur le pavé. */
function columnQuestion(rng, { kind, lens, carries = [[]] }) {
  const op = kind === 'sub' ? '−' : '+';
  const rows = kind === 'sub' ? makeSubtraction(rng, pick(rng, lens)) : makeAddition(rng, pick(rng, lens), pick(rng, carries));
  const all = columnSteps(rows, op);
  const result = op === '+' ? rows.reduce((a, b) => a + b, 0) : rows[0] - rows[1];
  const said = `${rows.join(` ${OP_WORD[op]} `)}, égale ${result}`;
  const stage = (steps) => ({
    type: 'column', op, rows, steps, width: Math.max(...rows.map(lengthOf), ...steps.map((s) => s.col + 1)),
  });
  const base = { key: `addition-posee:${kind}:${rows.join(op)}`, interaction: 'column', choices: [] };
  if (kind === 'carry') {
    // la retenue toute seule : seulement la colonne des unités, puis la retenue
    const steps = all.slice(0, 2).map((s) => ({ ...s, label: s.kind === 'carry' ? 'Combien je retiens ?' : 'Combien je pose ?' }));
    const text = 'Combien je pose ? Combien je retiens ?';
    return {
      ...base,
      text,
      instruction: `Additionne les unités. ${text}`,
      short: { key: 'addition-posee:pose', text },
      stage: stage(steps),
      answer: steps[0].digit,
      success: { speak: `Je pose ${steps[0].digit}, je retiens ${steps[1].digit}.` },
    };
  }
  if (op === '−') {
    return {
      ...base,
      text: 'Calcule la soustraction.',
      instruction: `Calcule la soustraction posée. ${START}`,
      short: { key: 'addition-posee:soustraction', text: 'Calcule la soustraction.' },
      stage: stage(all),
      answer: result,
      success: { speak: said },
    };
  }
  const carry = all.some((s) => s.kind === 'carry');
  return {
    ...base,
    text: 'Calcule l’addition.',
    instruction: `Calcule l’addition posée. ${START}${carry ? ' N’oublie pas la retenue !' : ''}`,
    short: { key: `addition-posee:${carry ? 'retenue' : 'addition'}`, text: carry ? 'N’oublie pas la retenue !' : 'Calcule l’addition.' },
    stage: stage(all),
    answer: result,
    success: { speak: said },
  };
}

/** Poser soi-même : choisir la disposition où les unités sont sous les unités. */
function layoutQuestion(rng) {
  const [la, lb] = pick(rng, [[3, 2], [3, 2], [3, 1], [2, 1]]);
  const op = rng() < 0.75 ? '+' : '−';
  const [a, b] = op === '+' ? makeAddition(rng, [la, lb], pick(rng, [[], [0]])) : makeSubtraction(rng, [la, lb]);
  // 0 : bien aligné à droite ; 1 et 2 : le petit nombre est décalé vers la gauche
  const width = Math.max(la, lb + 2);
  const text = `Comment poser ${a}\u00a0${op}\u00a0${b} ?`; // l'opération ne se coupe pas en fin de ligne
  return {
    key: `addition-posee:poser:${a}${op}${b}`,
    text,
    instruction: `Comment poser ${a} ${OP_WORD[op]} ${b} ? Les unités vont sous les unités.`,
    short: { key: 'addition-posee:poser', text, speak: `Comment poser ${a} ${OP_WORD[op]} ${b} ?` },
    stage: { type: 'equation', parts: [a, op, b] },
    choices: shuffle(rng, [0, 1, 2]).map((offset) => ({
      value: offset,
      label: '',
      column: { op, rows: [a, b], offsets: [0, offset], width },
    })),
    choiceStyle: 'columns',
    answer: 0,
    success: { speak: 'Les unités sont bien sous les unités.' },
  };
}

export const additionPosee = {
  id: 'addition-posee',
  domain: 'maths',
  section: CALCUL,
  title: 'L’addition posée',
  icon: '🧮',
  skill: 'Poser et calculer une addition en colonnes avec la retenue, puis une soustraction sans retenue',
  levels: ADDITION_LEVELS.map((l) => l.label),
  generate(level, rng, index = 0, context = {}) {
    const config = ADDITION_LEVELS[level - 1];
    if (config.kind === 'mix') return additionPosee.generate(pick(rng, [2, 4, 6, 7, 8, 9]), rng, index, context);
    if (config.kind === 'layout') return layoutQuestion(rng);
    return columnQuestion(rng, config);
  },
};

export const OPERATIONS_GAMES = [partage, additionPosee];
