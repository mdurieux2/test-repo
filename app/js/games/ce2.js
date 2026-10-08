// Jeux du CE2 (programmes de 2024, fin du cycle 2) : « Les grands nombres » (jusqu'à 10 000),
// « La multiplication posée », « La division » (partage et groupements), « Périmètres et
// longueurs » et « L'imparfait ».
// Les nombres s'écrivent avec une espace fine entre les classes (4 725) ; la voix les dit par
// morceaux qu'elle connaît (« 4 mille 725 »), jamais avec l'espace (elle dirait « 4 » puis « 725 »).

import { pick, randInt, sample, shuffle } from '../random.js';
import { textChoices } from './helpers.js';
import { conjugate, personOf, subjectOf } from './grammaire.js';

const CALCUL = 'Nombres et calcul';
const NNBSP = ' ';

/** 4725 → « 4 725 » (espace fine insécable entre les milliers et les centaines). */
export function ecrit(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
}

/** 4725 → « 4 mille 725 » : ce que dit la voix (des sons qu'elle a : 4, mille, 725). */
export function dit(n) {
  if (n < 1000) return String(n);
  const th = Math.floor(n / 1000);
  const rest = n % 1000;
  return `${th === 1 ? '' : `${th} `}mille${rest ? ` ${rest}` : ''}`;
}

const UNITS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
  'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];
const TENS = { 2: 'vingt', 3: 'trente', 4: 'quarante', 5: 'cinquante', 6: 'soixante' };

function below100(n) {
  if (n <= 16) return UNITS[n];
  if (n < 20) return `dix-${UNITS[n - 10]}`;
  const t = Math.floor(n / 10);
  const u = n % 10;
  if (t === 7) return u === 1 ? 'soixante et onze' : `soixante-${below100(10 + u)}`;
  if (t === 9) return `quatre-vingt-${below100(10 + u)}`;
  if (t === 8) return u === 0 ? 'quatre-vingts' : `quatre-vingt-${UNITS[u]}`;
  if (u === 0) return TENS[t];
  return u === 1 ? `${TENS[t]} et un` : `${TENS[t]}-${UNITS[u]}`;
}

function below1000(n) {
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (!h) return below100(r);
  const head = h === 1 ? 'cent' : `${UNITS[h]} cent${r ? '' : 's'}`;
  return r ? `${head} ${below100(r)}` : head;
}

/** Le nombre en lettres (orthographe traditionnelle) : 2304 → « deux mille trois cent quatre ». */
export function enLettres(n) {
  if (n < 1000) return below1000(n);
  const th = Math.floor(n / 1000);
  const r = n % 1000;
  const head = th === 1 ? 'mille' : `${below1000(th)} mille`;
  return r ? `${head} ${below1000(r)}` : head;
}

/** Le chiffre de la colonne `col` (0 : unités, 1 : dizaines, 2 : centaines, 3 : milliers). */
const digitAt = (n, col) => Math.floor(n / 10 ** col) % 10;

/**
 * `count` réponses entières distinctes : la bonne, les pièges (erreurs classiques) dans l'ordre,
 * puis des voisins de la bonne réponse. Toutes dans [min, max].
 */
export function withTraps(rng, answer, traps, count, { min = 0, max = 99999, step = 1 } = {}) {
  const out = [answer];
  const add = (t) => {
    if (out.length < count && Number.isInteger(t) && t >= min && t <= max && !out.includes(t)) out.push(t);
  };
  traps.forEach(add);
  for (let d = 1; out.length < count && d < 1000; d++) {
    add(answer + d * step);
    add(answer - d * step);
  }
  return shuffle(rng, out);
}

/** Des nombres à toucher : gros chiffres jusqu'à 999, une écriture plus petite (avec l'unité) au-delà. */
function numberChoices(values, unit = '') {
  const big = unit || values.some((v) => v >= 1000);
  return {
    choices: values.map((v) => ({ value: v, label: `${ecrit(v)}${unit ? ` ${unit}` : ''}` })),
    choiceStyle: big ? 'words' : 'numbers',
  };
}

const nbsp = (text) => text.replace(/ ([?!:;])/g, ' $1');
/** Une phrase dite qui commence par un nombre dit en mots (« mille 303… ») prend sa majuscule. */
const cap = (text) => text[0].toUpperCase() + text.slice(1);

// ================================================================ Les grands nombres

/** Un nombre de 4 chiffres, avec des zéros une fois sur trois (les nombres les plus piégeux). */
function bigNumber(rng, { zeros = true } = {}) {
  const digits = [randInt(rng, 1, 9), ...Array.from({ length: 3 }, () => (zeros && rng() < 0.3 ? 0 : randInt(rng, 1, 9)))];
  return Number(digits.join(''));
}

/** Échange deux chiffres d'un nombre de 4 chiffres (colonnes 0 à 3). */
function swapDigits(n, i, j) {
  const d = String(n).split('').reverse();
  [d[i], d[j]] = [d[j], d[i]];
  return Number(d.reverse().join(''));
}

const PLACES = [
  { col: 3, name: 'milliers' }, { col: 2, name: 'centaines' }, { col: 1, name: 'dizaines' }, { col: 0, name: 'unités' },
];

const GN_LEVELS = [
  { label: 'Lire les nombres en lettres', kind: 'lettres' },
  { label: 'Le chiffre des centaines…', kind: 'chiffre' },
  { label: 'Le nombre décomposé', kind: 'decompose' },
  { label: 'Le plus grand, le plus petit', kind: 'comparer' },
  { label: 'Range dans l’ordre', kind: 'ranger' },
  { label: 'De 100 en 100, de 1 000 en 1 000', kind: 'suite' },
  { label: 'Combien de centaines en tout ?', kind: 'combien' },
  { label: 'Entre deux milliers', kind: 'encadrer' },
];

/** Le nombre écrit en lettres : retrouver son écriture en chiffres (pièges : chiffres échangés, zéros). */
function lettersQuestion(rng) {
  const n = bigNumber(rng);
  const traps = shuffle(rng, [swapDigits(n, 1, 2), swapDigits(n, 0, 1), swapDigits(n, 0, 2), n + 100, n - 100, n + 1000, n - 1000, n + 10]);
  const values = withTraps(rng, n, traps, 4, { min: 1000, max: 9999 });
  return {
    key: `grands-nombres:lettres:${n}`,
    text: 'Quel est ce nombre ?',
    instruction: 'Lis le nombre écrit en lettres. Touche le même nombre, écrit en chiffres.',
    short: { key: 'grands-nombres:lettres', text: 'Quel est ce nombre ?', speak: 'Touche le même nombre, écrit en chiffres.' },
    stage: { type: 'sentence', text: enLettres(n) },
    ...numberChoices(values),
    answer: n,
    success: { speak: `C’est ${dit(n)}.` },
  };
}

/** Le chiffre d'une colonne : les quatre chiffres (tous différents) sont proposés. */
function digitQuestion(rng) {
  const digits = sample(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9], 1).concat(sample(rng, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 9));
  const unique = [digits[0], ...digits.slice(1).filter((d) => d !== digits[0]).slice(0, 3)];
  const n = Number(unique.join(''));
  const place = pick(rng, PLACES);
  const answer = digitAt(n, place.col);
  const text = `Dans ${ecrit(n)}, quel est le chiffre des ${place.name} ?`;
  const said = `Dans ${dit(n)}, quel est le chiffre des ${place.name} ?`;
  return {
    key: `grands-nombres:chiffre:${n}:${place.col}`,
    text: nbsp(text),
    instruction: said,
    short: { key: 'grands-nombres:chiffre', text: nbsp(`Le chiffre des ${place.name} ?`), speak: said },
    stage: { type: 'sentence', text: ecrit(n) },
    choices: shuffle(rng, unique).map((d) => ({ value: d, label: String(d) })),
    choiceStyle: 'numbers',
    answer,
    success: { speak: `Le chiffre des ${place.name} est ${answer}.` },
  };
}

/** 3 000 + 400 + 5 : le nombre décomposé (parfois dans le désordre), sans oublier les zéros. */
function decomposeQuestion(rng) {
  let n;
  do n = bigNumber(rng); while (!String(n).slice(1).includes('0') && rng() < 0.6);
  const parts = PLACES.map(({ col }) => digitAt(n, col) * 10 ** col).filter(Boolean);
  const shown = rng() < 0.35 ? shuffle(rng, parts) : parts;
  const traps = [swapDigits(n, 1, 2), swapDigits(n, 0, 1), swapDigits(n, 0, 2), n + 1000, n - 100];
  const values = withTraps(rng, n, traps, 4, { min: 1000, max: 9999 });
  return {
    key: `grands-nombres:decompose:${shown.join('+')}`,
    text: 'Quel nombre est-ce ?',
    instruction: `Combien font ${shown.map(dit).join(' plus ')} ?`,
    short: { key: 'grands-nombres:decompose', text: 'Quel nombre est-ce ?', speak: `Combien font ${shown.map(dit).join(' plus ')} ?` },
    stage: { type: 'sentence', text: `${shown.map(ecrit).join(' + ')} = ?` },
    ...numberChoices(values),
    answer: n,
    success: { speak: cap(`${shown.map(dit).join(' plus ')}, égale ${dit(n)}.`) },
  };
}

/** Le plus grand (ou le plus petit) de 3 nombres qui ont les mêmes chiffres ou presque. */
function compareQuestion(rng) {
  const n = bigNumber(rng, { zeros: false });
  const values = withTraps(rng, n, shuffle(rng, [swapDigits(n, 0, 1), swapDigits(n, 1, 2), swapDigits(n, 2, 3), n + 100, n - 1000]), 3, { min: 1000, max: 9999 });
  const biggest = rng() < 0.6;
  const answer = biggest ? Math.max(...values) : Math.min(...values);
  const text = biggest ? 'Touche le nombre le plus grand.' : 'Touche le nombre le plus petit.';
  return {
    key: `grands-nombres:comparer:${biggest}:${[...values].sort().join('-')}`,
    text,
    instruction: text,
    short: { key: `grands-nombres:comparer:${biggest}`, text: biggest ? 'Le plus grand ?' : 'Le plus petit ?', speak: text },
    stage: { type: 'none' },
    ...numberChoices(values),
    answer,
    success: { speak: `C’est ${dit(answer)}.` },
  };
}

/** Ranger 4 nombres (deux ont le même chiffre des milliers). */
function orderQuestion(rng) {
  const values = new Set();
  const base = randInt(rng, 1, 8);
  while (values.size < 4) {
    const th = values.size < 2 ? base : randInt(rng, 1, 9);
    values.add(th * 1000 + randInt(rng, 0, 999));
  }
  const list = shuffle(rng, [...values]);
  const asc = rng() < 0.7;
  const sorted = [...list].sort((a, b) => (asc ? a - b : b - a));
  return {
    key: `grands-nombres:ranger:${list.join('-')}`,
    interaction: 'order',
    text: asc ? 'Touche du plus petit au plus grand.' : 'Touche du plus grand au plus petit.',
    instruction: asc ? 'Touche les nombres, du plus petit au plus grand.' : 'Touche les nombres, du plus grand au plus petit.',
    short: { key: `grands-nombres:ranger:${asc}`, text: asc ? 'Du plus petit au plus grand.' : 'Du plus grand au plus petit.' },
    stage: { type: 'none' },
    items: list.map((v) => ({ value: v, label: ecrit(v) })),
    order: asc ? 'asc' : 'desc',
    choices: [],
    answer: null,
    success: { speak: cap(sorted.map(dit).join(', ')) },
  };
}

/** La suite de 10 en 10, de 100 en 100 ou de 1 000 en 1 000 (on passe le millier) : le nombre qui manque, au pavé. */
function sequenceQuestion(rng) {
  const step = pick(rng, [10, 100, 100, 1000]);
  const count = 4;
  let start;
  if (step === 1000) start = randInt(rng, 0, 9 - count + 1) * 1000 + pick(rng, [0, randInt(rng, 1, 9) * 100, randInt(rng, 1, 999)]);
  else start = randInt(rng, 1, 8) * 1000 + (step === 100 ? randInt(rng, 6, 8) * 100 : randInt(rng, 1, 9) * 100 + randInt(rng, 7, 8) * 10);
  start = Math.min(start, 10000 - (count - 1) * step);
  start = Math.max(start, step === 1000 ? 0 : 1000);
  const numbers = Array.from({ length: count }, (_, i) => start + i * step);
  const down = rng() < 0.35;
  if (down) numbers.reverse();
  const gap = randInt(rng, 1, count - 1);
  const answer = numbers[gap];
  const how = `On ${down ? 'recule' : 'avance'} de ${step} en ${step}.`;
  return {
    key: `grands-nombres:suite:${numbers.join('-')}:${gap}`,
    interaction: 'keypad',
    text: 'Tape le nombre qui manque.',
    instruction: `${how} Quel nombre manque ? Tape-le sur le pavé.`,
    short: { key: 'grands-nombres:suite', text: 'Tape le nombre qui manque.', speak: `${how} Quel nombre manque ?` },
    stage: { type: 'sequence', items: numbers.map((n, i) => (i === gap ? null : n)) },
    choices: [],
    answer,
    maxDigits: 5,
    success: { speak: cap(numbers.map(dit).join(', ')) },
  };
}

/** Combien de centaines (ou de dizaines) en tout : 4 725, c'est 47 centaines (et 25 unités). */
function howManyQuestion(rng) {
  const tens = rng() < 0.4;
  const n = tens ? randInt(rng, 110, 999) * (rng() < 0.3 ? 10 : 1) : bigNumber(rng);
  const unit = tens ? 'dizaines' : 'centaines';
  const size = tens ? 10 : 100;
  const answer = Math.floor(n / size);
  const digit = digitAt(n, tens ? 1 : 2);
  const traps = [digit, tens ? Math.floor(n / 100) : Math.floor(n / 1000), tens ? Math.floor(n / 1) : Math.floor(n / 10), answer + 1, answer - 1];
  const values = withTraps(rng, answer, traps, 4, { min: 0, max: 9999 });
  const text = `Dans ${ecrit(n)}, combien y a-t-il de ${unit} en tout ?`;
  const said = `Dans ${dit(n)}, combien y a-t-il de ${unit} en tout ?`;
  return {
    key: `grands-nombres:combien:${n}:${unit}`,
    text: nbsp(text),
    instruction: said,
    short: { key: 'grands-nombres:combien', text: nbsp(`Combien de ${unit} en tout ?`), speak: said },
    stage: { type: 'sentence', text: ecrit(n) },
    ...numberChoices(values),
    answer,
    success: { speak: `Il y a ${dit(answer)} ${unit} en tout.` },
  };
}

/** Entre quels milliers se trouve 4 725 ? (les trois paires de milliers qui se suivent les plus proches) */
function frameQuestion(rng) {
  let n;
  do n = bigNumber(rng); while (n % 1000 === 0);
  const k = Math.floor(n / 1000);
  const pairs = [k - 1, k, k + 1].filter((a) => a >= 0 && a + 1 <= 10);
  if (pairs.length < 3) pairs.push(k + 2 <= 9 ? k + 2 : k - 2);
  const label = (a) => `${ecrit(a * 1000)} et ${ecrit((a + 1) * 1000)}`;
  const said = `Entre quels milliers se trouve ${dit(n)} ?`;
  return {
    key: `grands-nombres:encadrer:${n}`,
    text: nbsp(`Entre quels milliers se trouve ${ecrit(n)} ?`),
    instruction: said,
    short: { key: 'grands-nombres:encadrer', text: 'Entre quels milliers ?', speak: said },
    stage: { type: 'sentence', text: ecrit(n) },
    choices: shuffle(rng, pairs).map((a) => ({ value: a * 1000, label: label(a) })),
    choiceStyle: 'sentences',
    answer: k * 1000,
    success: { speak: cap(`${dit(n)} est entre ${dit(k * 1000)} et ${dit((k + 1) * 1000)}.`) },
  };
}

export const grandsNombres = {
  id: 'grands-nombres',
  domain: 'maths',
  section: CALCUL,
  title: 'Les grands nombres',
  icon: '🏙️',
  skill: 'Lire, écrire, décomposer, comparer et ranger les nombres jusqu’à 10 000',
  levels: GN_LEVELS.map((l) => l.label),
  generate(level, rng) {
    switch (GN_LEVELS[level - 1].kind) {
      case 'lettres': return lettersQuestion(rng);
      case 'chiffre': return digitQuestion(rng);
      case 'decompose': return decomposeQuestion(rng);
      case 'comparer': return compareQuestion(rng);
      case 'ranger': return orderQuestion(rng);
      case 'suite': return sequenceQuestion(rng);
      case 'combien': return howManyQuestion(rng);
      default: return frameQuestion(rng);
    }
  },
};

// ================================================================ La multiplication posée

const PLACE_NAMES = ['Les unités', 'Les dizaines', 'Les centaines', 'Les milliers'];

/**
 * Les étapes de la multiplication posée par un nombre à un chiffre, de droite à gauche : le chiffre
 * posé dans chaque colonne et la retenue écrite en haut de la colonne suivante ; la dernière
 * retenue s'écrit directement au résultat (4 × 3 + 2 = 14 : on écrit 14).
 */
export function mulSteps(a, b) {
  const len = String(a).length;
  const steps = [];
  let carry = 0;
  for (let col = 0; col < len; col++) {
    const p = digitAt(a, col) * b + carry;
    steps.push({ kind: 'result', col, digit: p % 10, label: PLACE_NAMES[col] });
    carry = Math.floor(p / 10);
    if (carry && col < len - 1) steps.push({ kind: 'carry', col: col + 1, digit: carry, label: 'La retenue' });
    else if (carry) steps.push({ kind: 'result', col: col + 1, digit: carry, label: PLACE_NAMES[col + 1] });
  }
  return steps;
}

/** Un nombre de `len` chiffres et un multiplicateur de 2 à 9, avec ou sans retenue. */
export function makeProduct(rng, len, carry) {
  for (;;) {
    if (!carry) {
      const b = pick(rng, [2, 2, 3, 3, 4]);
      const top = Math.floor(9 / b);
      const digits = [randInt(rng, 1, top), ...Array.from({ length: len - 1 }, () => randInt(rng, 0, top))];
      return [Number(digits.join('')), b];
    }
    const a = randInt(rng, 10 ** (len - 1) + 1, 10 ** len - 1);
    const b = randInt(rng, 2, 9);
    if (mulSteps(a, b).some((s) => s.kind === 'carry')) return [a, b];
  }
}

const MUL_LEVELS = [
  { label: 'Fois 10, fois 100', kind: 'dix' },
  { label: 'Des dizaines et des centaines', kind: 'ronds' },
  { label: 'Décomposer : 23 × 4 = 80 + 12', kind: 'decompose' },
  { label: '2 chiffres, sans retenue', kind: 'col', len: 2, carry: false },
  { label: '2 chiffres, avec retenue', kind: 'col', len: 2, carry: true },
  { label: '3 chiffres × 1 chiffre', kind: 'col', len: 3, carry: true },
  { label: 'Problèmes de multiplication', kind: 'story' },
  { label: 'Mélange', kind: 'mix' },
];

/** Un calcul à taper sur le pavé : a × b = ? */
function productKeypad(rng, a, b, kind) {
  const answer = a * b;
  return {
    key: `multiplication-posee:${kind}:${a}x${b}`,
    interaction: 'keypad',
    text: 'Calcule !',
    instruction: `Combien font ${dit(a)} fois ${dit(b)} ?`,
    short: { key: `multiplication-posee:${kind}`, text: 'Calcule !', speak: `${dit(a)} fois ${dit(b)} ?` },
    stage: { type: 'equation', parts: [a, '×', b, '=', null] },
    choices: [],
    answer,
    maxDigits: 4,
    success: { speak: `${dit(a)} fois ${dit(b)}, égale ${dit(answer)}.` },
  };
}

/** 23 × 4, c'est 20 × 4 plus 3 × 4 : pièges, oublier de multiplier les unités ou la dizaine. */
function distributeQuestion(rng) {
  const t = randInt(rng, 1, 9);
  const u = randInt(rng, 1, 9);
  const b = randInt(rng, 2, 9);
  const a = t * 10 + u;
  const answer = a * b;
  const said = `${a} fois ${b}, c’est ${t * 10} fois ${b} plus ${u} fois ${b}.`;
  const values = withTraps(rng, answer, [t * 10 * b + u, t * b + u * b, answer + 10, answer - 10], 4, { min: 1, max: 999 });
  return {
    key: `multiplication-posee:decompose:${a}x${b}`,
    text: nbsp(`Combien font ${a} × ${b} ?`),
    instruction: `${said} Combien font ${a} fois ${b} ?`,
    short: { key: 'multiplication-posee:decompose', text: nbsp(`Combien font ${a} × ${b} ?`), speak: `${said} Combien font ${a} fois ${b} ?` },
    stage: { type: 'sentence', text: nbsp(`${a} × ${b} = ${t * 10} × ${b} + ${u} × ${b}`) },
    ...numberChoices(values),
    answer,
    success: { speak: `${t * 10 * b} plus ${u * b}, égale ${answer}.` },
  };
}

/** La multiplication en colonnes, à remplir chiffre par chiffre (comme l'addition posée). */
function columnProduct(rng, { len, carry }) {
  const [a, b] = makeProduct(rng, len, carry);
  const steps = mulSteps(a, b);
  const withCarry = steps.some((s) => s.kind === 'carry');
  const answer = a * b;
  return {
    key: `multiplication-posee:col:${a}x${b}`,
    interaction: 'column',
    text: 'Calcule la multiplication.',
    instruction: `Calcule la multiplication posée. Commence par les unités, à droite.${withCarry ? ' N’oublie pas la retenue !' : ''}`,
    short: { key: `multiplication-posee:${withCarry ? 'retenue' : 'colonnes'}`, text: withCarry ? 'N’oublie pas la retenue !' : 'Calcule la multiplication.' },
    stage: { type: 'column', op: '×', rows: [a, b], steps, width: Math.max(len, ...steps.map((s) => s.col + 1)) },
    choices: [],
    answer,
    success: { speak: `${dit(a)} fois ${b}, égale ${dit(answer)}.` },
  };
}

// Des problèmes : des paquets tous pareils (b paquets de a), avec le prénom de l'enfant.
const MUL_STORIES = [
  { facts: (name, a, b) => `${name} achète ${b} boîtes de ${a} crayons.`, ask: 'Combien de crayons y a-t-il en tout ?', says: (r) => `Il y a ${r} crayons.` },
  { facts: (name, a, b) => `Dans la salle de spectacle, il y a ${b} rangées de ${a} chaises.`, ask: 'Combien de chaises y a-t-il en tout ?', says: (r) => `Il y a ${r} chaises.` },
  { facts: (name, a, b) => `Un livre a ${a} pages. ${name} lit ${b} livres comme celui-là.`, ask: 'Combien de pages a-t-il fallu lire ?', says: (r) => `Il a fallu lire ${r} pages.` },
  { facts: (name, a, b) => `Un vélo coûte ${a} euros. L’école achète ${b} vélos.`, ask: 'Combien l’école paie-t-elle ?', says: (r) => `L’école paie ${r} euros.` },
  { facts: (name, a, b) => `Un car transporte ${a} enfants. ${b} cars partent en sortie.`, ask: 'Combien d’enfants partent en sortie ?', says: (r) => `${r} enfants partent en sortie.` },
  { facts: (name, a, b) => `${name} colle ${a} images sur chaque page de son album. L’album a ${b} pages.`, ask: 'Combien d’images y a-t-il dans l’album ?', says: (r) => `Il y a ${r} images.` },
];

function productStory(rng, name) {
  const story = pick(rng, MUL_STORIES);
  const a = rng() < 0.25 ? randInt(rng, 101, 250) : randInt(rng, 12, 99);
  const b = randInt(rng, 3, 9);
  const answer = a * b;
  const facts = story.facts(name, a, b);
  const values = withTraps(rng, answer, [a + b, a * (b - 1), answer + 10, answer - 10], 4, { min: 1, max: 9999 });
  return {
    key: `multiplication-posee:histoire:${facts}`,
    text: story.ask,
    instruction: `${facts} ${story.ask}`,
    replay: [`${facts} ${story.ask}`],
    stage: { type: 'story', text: facts },
    ...numberChoices(values),
    answer,
    success: { speak: story.says(dit(answer)) },
  };
}

export const multiplicationPosee = {
  id: 'multiplication-posee',
  domain: 'maths',
  section: CALCUL,
  title: 'La multiplication',
  icon: '✖️',
  skill: 'Multiplier par 10 et 100, décomposer, poser une multiplication par un nombre à un chiffre, résoudre des problèmes',
  levels: MUL_LEVELS.map((l) => l.label),
  generate(level, rng, index = 0, context = {}) {
    const config = MUL_LEVELS[level - 1];
    switch (config.kind) {
      case 'dix': {
        const b = pick(rng, [10, 10, 100, 100, 1000]);
        const a = b === 1000 ? randInt(rng, 2, 9) : b === 100 ? randInt(rng, 2, 99) : randInt(rng, 2, 999);
        return productKeypad(rng, a, b, 'dix');
      }
      case 'ronds': {
        const a = randInt(rng, 2, 9) * pick(rng, [10, 10, 100]);
        return productKeypad(rng, a, randInt(rng, 2, 9), 'ronds');
      }
      case 'decompose': return distributeQuestion(rng);
      case 'col': return columnProduct(rng, config);
      case 'story': return productStory(rng, context.name || 'Lou');
      default: return multiplicationPosee.generate(pick(rng, [2, 3, 4, 5, 6, 7]), rng, index, context);
    }
  },
};

// ================================================================ La division

const DIV_LEVELS = [
  { label: 'Combien de fois 5 dans 20 ?', kind: 'fois' },
  { label: 'Partager en parts égales', kind: 'parts' },
  { label: 'Diviser avec les tables', kind: 'tables' },
  { label: 'Des paquets, et ce qui reste', kind: 'paquets' },
  { label: 'Le reste de la division', kind: 'reste' },
  { label: 'Diviser 80, 600…', kind: 'ronds' },
  { label: 'Problèmes : partage ou paquets ?', kind: 'story' },
  { label: 'Mélange', kind: 'mix' },
];

/** Un diviseur de 2 à 9 et un quotient de 2 à 10 (les tables jusqu'à 10). */
function tableFact(rng) {
  return [randInt(rng, 2, 9), randInt(rng, 2, 10)];
}

/** Groupements : dans 20, combien de fois 5 ? (5 × ? = 20, au pavé) */
function timesQuestion(rng) {
  const [b, q] = tableFact(rng);
  const n = b * q;
  return {
    key: `division:fois:${n}/${b}`,
    interaction: 'keypad',
    text: nbsp(`Dans ${n}, combien de fois ${b} ?`),
    instruction: `Dans ${n}, combien de fois ${b} ? Tape la réponse sur le pavé.`,
    short: { key: 'division:fois', text: nbsp(`Dans ${n}, combien de fois ${b} ?`), speak: `Dans ${n}, combien de fois ${b} ?` },
    stage: { type: 'equation', parts: [b, '×', null, '=', n] },
    choices: [],
    answer: q,
    maxDigits: 2,
    success: { speak: `${q} fois ${b}, égale ${n}.` },
  };
}

const SHARE_THINGS = [
  { many: 'billes', one: 'bille' }, { many: 'cartes', one: 'carte' }, { many: 'images', one: 'image' },
  { many: 'bonbons', one: 'bonbon' }, { many: 'crayons', one: 'crayon' }, { many: 'gâteaux', one: 'gâteau' },
];
const de = (word) => (/^[aeiouyéèêâîôœ]/i.test(word) ? `d’${word}` : `de ${word}`);

/** Partager en parts égales : combien chacun ? (pièges : retirer, le nombre de parts) */
function partsQuestion(rng) {
  const thing = pick(rng, SHARE_THINGS);
  const k = randInt(rng, 2, 6);
  const q = randInt(rng, 3, 12);
  const n = k * q;
  const facts = `On partage ${n} ${thing.many} entre ${k} enfants, en parts égales.`;
  const ask = `Combien ${de(thing.many)} a chaque enfant ?`;
  const values = withTraps(rng, q, [n - k, k, q + 1, q - 1], 4, { min: 1, max: 99 });
  return {
    key: `division:parts:${n}/${k}:${thing.one}`,
    text: ask,
    instruction: `${facts} ${ask}`,
    replay: [`${facts} ${ask}`],
    short: { key: 'division:parts', text: ask, speak: `${facts} ${ask}` },
    stage: { type: 'story', text: facts },
    ...numberChoices(values),
    answer: q,
    success: { speak: `Chaque enfant a ${q} ${thing.many}.` },
  };
}

/** n ÷ b au pavé : on cherche dans la table de b. */
function divisionKeypad(rng, n, b, q, kind) {
  return {
    key: `division:${kind}:${n}/${b}`,
    interaction: 'keypad',
    text: 'Calcule la division.',
    instruction: kind === 'tables' ? `Combien font ${n} divisé par ${b} ? Pense à la table de ${b}.` : `Combien font ${dit(n)} divisé par ${b} ?`,
    short: { key: `division:${kind}`, text: 'Calcule la division.', speak: `${dit(n)} divisé par ${b} ?` },
    stage: { type: 'equation', parts: [n, '÷', b, '=', null] },
    choices: [],
    answer: q,
    maxDigits: 3,
    success: { speak: `${dit(n)} divisé par ${b}, égale ${q}.` },
  };
}

const BOXES = [
  { many: 'œufs', one: 'œuf', box: 'boîtes', per: 'boîte', f: true }, { many: 'fleurs', one: 'fleur', box: 'bouquets', per: 'bouquet' },
  { many: 'photos', one: 'photo', box: 'pages', per: 'page', f: true }, { many: 'élèves', one: 'élève', box: 'équipes', per: 'équipe', f: true },
  { many: 'livres', one: 'livre', box: 'étagères', per: 'étagère', f: true },
];

/** Des paquets, et ce qui reste : combien de paquets complets, ou combien il en reste. */
function packetsQuestion(rng, name) {
  const pack = pick(rng, BOXES);
  const b = randInt(rng, 3, 9);
  const q = randInt(rng, 2, 9);
  const r = randInt(rng, 1, b - 1);
  const n = b * q + r;
  const full = `${pack.box} ${pack.f ? 'complètes' : 'complets'}`;
  const facts = `${name} range ${n} ${pack.many}, ${b} par ${pack.per}.`;
  const askRest = rng() < 0.5;
  const question = askRest ? `Combien ${de(pack.many)} reste-t-il ?` : `Combien de ${full} y a-t-il ?`;
  const answer = askRest ? r : q;
  const values = withTraps(rng, answer, askRest ? [q, b - r, r + 1, r - 1] : [q + 1, r, q - 1], 3, { min: 0, max: 99 });
  return {
    key: `division:paquets:${n}/${b}:${askRest}:${pack.per}`,
    text: question,
    instruction: `${facts} ${question}`,
    replay: [`${facts} ${question}`],
    stage: { type: 'story', text: facts },
    ...numberChoices(values),
    answer,
    success: { speak: `${q} ${full}, et il reste ${r} ${r > 1 ? pack.many : pack.one}.` },
  };
}

/** Le reste : 23 divisé par 4, c'est 5 fois 4, et il reste 3. */
function restQuestion(rng) {
  const b = randInt(rng, 3, 9);
  const q = randInt(rng, 2, 9);
  const r = randInt(rng, 1, b - 1);
  const n = b * q + r;
  const values = withTraps(rng, r, [q, b - r, r + 1, r - 1], 3, { min: 0, max: b + 9 });
  return {
    key: `division:reste:${n}/${b}`,
    text: nbsp(`On divise ${n} par ${b}. Quel est le reste ?`),
    instruction: `On divise ${n} par ${b}. Quel est le reste ?`,
    short: { key: 'division:reste', text: 'Quel est le reste ?', speak: `On divise ${n} par ${b}. Quel est le reste ?` },
    stage: { type: 'sentence', text: nbsp(`${n} = (${b} × ${q}) + ?`) },
    ...numberChoices(values),
    answer: r,
    success: { speak: `${n} égale ${q} fois ${b}, plus ${r}.` },
  };
}

const DIV_STORIES = [
  { kind: 'share', facts: (name, n, k) => `${name} partage ${n} cartes entre ${k} amis, en parts égales.`, ask: 'Combien de cartes a chaque ami ?', says: (q) => `Chaque ami a ${q} cartes.` },
  { kind: 'share', facts: (name, n, k) => `La maîtresse partage ${n} feutres entre ${k} tables, en parts égales.`, ask: 'Combien de feutres a chaque table ?', says: (q) => `Chaque table a ${q} feutres.` },
  { kind: 'group', facts: (name, n, k) => `${name} range ${n} photos dans un album : ${k} photos par page.`, ask: 'Combien de pages faut-il ?', says: (q) => `Il faut ${q} pages.` },
  { kind: 'group', facts: (name, n, k) => `${n} enfants font des équipes de ${k}.`, ask: 'Combien d’équipes y a-t-il ?', says: (q) => `Il y a ${q} équipes.` },
  { kind: 'group', facts: (name, n, k) => `Un fleuriste fait des bouquets de ${k} roses avec ${n} roses.`, ask: 'Combien de bouquets fait-il ?', says: (q) => `Il fait ${q} bouquets.` },
];

/** Partage (combien chacun ?) ou groupements (combien de paquets ?) : c'est toujours une division. */
function divisionStory(rng, name) {
  const story = pick(rng, DIV_STORIES);
  const k = randInt(rng, 2, 9);
  const q = randInt(rng, 3, 12);
  const n = k * q;
  const facts = story.facts(name, n, k);
  const values = withTraps(rng, q, [n - k, n + k, k, q + 1], 4, { min: 1, max: 999 });
  return {
    key: `division:histoire:${facts}`,
    text: story.ask,
    instruction: `${facts} ${story.ask}`,
    replay: [`${facts} ${story.ask}`],
    stage: { type: 'story', text: facts },
    ...numberChoices(values),
    answer: q,
    success: { speak: story.says(q) },
  };
}

export const division = {
  id: 'division',
  domain: 'maths',
  section: CALCUL,
  title: 'La division',
  icon: '➗',
  skill: 'Partager en parts égales, faire des groupements, trouver le quotient et le reste avec les tables',
  levels: DIV_LEVELS.map((l) => l.label),
  generate(level, rng, index = 0, context = {}) {
    const name = context.name || 'Lou';
    switch (DIV_LEVELS[level - 1].kind) {
      case 'fois': return timesQuestion(rng);
      case 'parts': return partsQuestion(rng);
      case 'tables': {
        const [b, q] = tableFact(rng);
        return divisionKeypad(rng, b * q, b, q, 'tables');
      }
      case 'paquets': return packetsQuestion(rng, name);
      case 'reste': return restQuestion(rng);
      case 'ronds': {
        const b = randInt(rng, 2, 9);
        const q = randInt(rng, 2, 9) * pick(rng, [10, 10, 100]);
        return divisionKeypad(rng, b * q, b, q, 'ronds');
      }
      case 'story': return divisionStory(rng, name);
      default: return division.generate(pick(rng, [2, 3, 4, 5, 6, 7]), rng, index, context);
    }
  },
};

// ================================================================ Périmètres et longueurs

const UNIT_NAMES = { mm: 'millimètres', cm: 'centimètres', m: 'mètres', km: 'kilomètres' };
const UNIT_ONE = { mm: 'millimètre', cm: 'centimètre', m: 'mètre', km: 'kilomètre' };
const parle = (n, unit) => `${dit(n)} ${n === 1 ? UNIT_ONE[unit] : UNIT_NAMES[unit]}`;

// Quelle unité pour mesurer… ? Des longueurs que l'enfant connaît.
export const MEASURE_ITEMS = [
  { emoji: '🐜', what: 'une fourmi', unit: 'mm' }, { emoji: '🪙', what: 'l’épaisseur d’une pièce', unit: 'mm' },
  { emoji: '🍚', what: 'un grain de riz', unit: 'mm' }, { emoji: '✏️', what: 'la pointe d’un crayon', unit: 'mm' },
  { emoji: '🖍️', what: 'un crayon', unit: 'cm' }, { emoji: '📕', what: 'un livre', unit: 'cm' },
  { emoji: '👟', what: 'une chaussure', unit: 'cm' }, { emoji: '✋', what: 'ta main', unit: 'cm' },
  { emoji: '🚌', what: 'un bus', unit: 'm' }, { emoji: '🏊', what: 'une piscine', unit: 'm' },
  { emoji: '🏫', what: 'la cour de l’école', unit: 'm' }, { emoji: '🏠', what: 'la hauteur d’une maison', unit: 'm' },
  { emoji: '🚗', what: 'le trajet de Paris à Lyon', unit: 'km' }, { emoji: '🏞️', what: 'la longueur d’un fleuve', unit: 'km' },
  { emoji: '🚴', what: 'une course du Tour de France', unit: 'km' }, { emoji: '🏃', what: 'un marathon', unit: 'km' },
];

const PER_LEVELS = [
  { label: 'Quelle unité ? mm, cm, m, km', kind: 'unite' },
  { label: 'Mètres et centimètres', kind: 'convert', big: 'm', small: 'cm', ratio: 100 },
  { label: 'Centimètres et millimètres', kind: 'convert', big: 'cm', small: 'mm', ratio: 10 },
  { label: 'Kilomètres et mètres', kind: 'convert', big: 'km', small: 'm', ratio: 1000 },
  { label: 'La longueur la plus grande', kind: 'comparer' },
  { label: 'Périmètre : carré, rectangle', kind: 'rect' },
  { label: 'Périmètre d’un polygone', kind: 'poly' },
  { label: 'Problèmes de longueurs', kind: 'story' },
  { label: 'Mélange', kind: 'mix' },
];

function unitQuestion(rng) {
  const item = pick(rng, MEASURE_ITEMS);
  const text = `Pour mesurer ${item.what}, quelle unité choisis-tu ?`;
  return {
    key: `perimetres:unite:${item.what}`,
    text,
    instruction: text,
    short: { key: 'perimetres:unite', text: 'Quelle unité choisis-tu ?', speak: text },
    stage: { type: 'picture', emoji: item.emoji },
    choices: textChoices(['mm', 'cm', 'm', 'km']),
    choiceStyle: 'words',
    answer: item.unit,
    success: { speak: `En ${UNIT_NAMES[item.unit]}.` },
  };
}

/** 2 m 45 cm, c'est combien de centimètres ? (pièges : oublier le zéro, se tromper de rapport) */
function convertQuestion(rng, { big, small, ratio }) {
  const whole = rng() < 0.3;
  const a = randInt(rng, 1, 9);
  const b = whole ? 0 : ratio === 10 ? randInt(rng, 1, 9) : rng() < 0.3 ? randInt(rng, 1, 9) : randInt(rng, 10, ratio - 1);
  const answer = a * ratio + b;
  const shownText = whole ? `${a} ${big}` : `${a} ${big} ${ecrit(b)} ${small}`;
  const said = whole ? parle(a, big) : `${parle(a, big)} ${parle(b, small)}`;
  const otherRatios = [10, 100, 1000].filter((x) => x !== ratio);
  const traps = [...otherRatios.map((x) => a * x + b), whole ? a : Number(`${a}${b}`), a * ratio + b * 10];
  const values = withTraps(rng, answer, traps, 3, { min: 1, max: 99999 });
  return {
    key: `perimetres:convert:${big}:${a}:${b}`,
    text: nbsp(`${shownText}, c’est combien de ${UNIT_NAMES[small]} ?`),
    instruction: `${said}, c’est combien de ${UNIT_NAMES[small]} ?`,
    short: { key: `perimetres:convert:${big}`, text: nbsp(`${shownText} = ? ${small}`), speak: `${said}, c’est combien de ${UNIT_NAMES[small]} ?` },
    stage: { type: 'sentence', text: nbsp(`${shownText} = ? ${small}`) },
    ...numberChoices(values, small),
    answer,
    success: { speak: `${said}, c’est ${parle(answer, small)}.` },
  };
}

/** Une longueur en centimètres, écrite en cm ou en m et cm. */
function lengthLabel(cm, mixed) {
  if (!mixed || cm < 100) return `${cm} cm`;
  const m = Math.floor(cm / 100);
  const r = cm % 100;
  return r ? `${m} m ${r} cm` : `${m} m`;
}
function lengthSaid(cm, mixed) {
  if (!mixed || cm < 100) return parle(cm, 'cm');
  const m = Math.floor(cm / 100);
  const r = cm % 100;
  return r ? `${parle(m, 'm')} ${parle(r, 'cm')}` : parle(m, 'm');
}

/** La plus grande de trois longueurs écrites de façons différentes (1 m 5 cm, 120 cm, 1 m 20 cm…). */
function compareLengths(rng) {
  const m = randInt(rng, 1, 3);
  const r = randInt(rng, 1, 9);
  // 1 m 5 cm (105), 1 m 50 cm (150) et 1 m 15 cm (115) ou 150 cm : les mêmes chiffres, pas la même longueur
  const pool = [...new Set([m * 100 + r, m * 100 + r * 10, m * 100 + 10 + r, m * 100 + r * 10 + 1, (m + 1) * 100 + r, m * 10 + r])]
    .filter((v) => v >= 10);
  const values = sample(rng, pool, 3);
  const answer = Math.max(...values);
  const mixed = values.map(() => rng() < 0.6);
  return {
    key: `perimetres:comparer:${values.join('-')}`,
    text: 'Quelle est la longueur la plus grande ?',
    instruction: 'Quelle est la longueur la plus grande ?',
    short: { key: 'perimetres:comparer', text: 'La plus grande ?', speak: 'Quelle est la longueur la plus grande ?' },
    stage: { type: 'none' },
    choices: values.map((v, i) => ({ value: v, label: lengthLabel(v, mixed[i]) })),
    choiceStyle: 'sentences',
    answer,
    success: { speak: `C’est ${lengthSaid(answer, mixed[values.indexOf(answer)])}.` },
  };
}

/** Le périmètre d'un carré ou d'un rectangle (pièges : un seul tour de deux côtés, l'aire). */
function rectQuestion(rng) {
  const square = rng() < 0.35;
  const unit = rng() < 0.7 ? 'cm' : 'm';
  const L = randInt(rng, 3, 15);
  const l = square ? L : randInt(rng, 2, L - 1);
  const answer = 2 * (L + l);
  const name = square ? 'ce carré' : 'ce rectangle';
  const said = square
    ? `Ce carré a des côtés de ${parle(L, unit)}. Quel est son périmètre ?`
    : `Ce rectangle mesure ${parle(L, unit)} de long et ${parle(l, unit)} de large. Quel est son périmètre ?`;
  const traps = square ? [2 * L, 3 * L, L * L, 4 * L + 4] : [L + l, L * l, 2 * L + l, L + 2 * l];
  const values = withTraps(rng, answer, traps, 4, { min: 1, max: 999 });
  return {
    key: `perimetres:rect:${square}:${L}x${l}${unit}`,
    text: nbsp(`Quel est le périmètre de ${name} ?`),
    instruction: said,
    short: { key: 'perimetres:rect', text: 'Quel est son périmètre ?', speak: said },
    stage: {
      type: 'drawing',
      drawing: { kind: 'polygone', shape: square ? 'carre' : 'rect', sides: [L, l, L, l], labels: square ? [2] : [2, 1], unit },
      label: square ? `Un carré de ${L} ${unit} de côté.` : `Un rectangle de ${L} ${unit} de long et ${l} ${unit} de large.`,
    },
    ...numberChoices(values, unit),
    answer,
    success: { speak: `Le périmètre est de ${parle(answer, unit)}.` },
  };
}

const POLY_SHAPES = [
  { shape: 'triangle', name: 'ce triangle', sides: 3 },
  { shape: 'quadri', name: 'ce quadrilatère', sides: 4 },
  { shape: 'penta', name: 'ce pentagone', sides: 5 },
];

/** Le périmètre d'un polygone : la somme des longueurs de ses côtés (piège : un côté oublié). */
function polygonQuestion(rng) {
  const poly = pick(rng, POLY_SHAPES);
  const sides = Array.from({ length: poly.sides }, () => randInt(rng, 2, 12));
  const answer = sides.reduce((a, b) => a + b, 0);
  const traps = [answer - sides[0], answer - sides.at(-1), answer + 1, answer - 2];
  const values = withTraps(rng, answer, traps, 4, { min: 1, max: 999 });
  const text = nbsp(`Quel est le périmètre de ${poly.name} ?`);
  return {
    key: `perimetres:poly:${poly.shape}:${sides.join('-')}`,
    text,
    instruction: `Additionne les longueurs de tous les côtés. Quel est le périmètre de ${poly.name} ?`,
    short: { key: 'perimetres:poly', text: 'Quel est son périmètre ?', speak: `Quel est le périmètre de ${poly.name} ?` },
    stage: {
      type: 'drawing',
      drawing: { kind: 'polygone', shape: poly.shape, sides, labels: sides.map((_, i) => i), unit: 'cm' },
      label: `Les côtés mesurent ${sides.map((s) => `${s} cm`).join(', ')}.`,
    },
    ...numberChoices(values, 'cm'),
    answer,
    success: { speak: `${sides.join(' plus ')}, égale ${answer}. Le périmètre est de ${parle(answer, 'cm')}.` },
  };
}

/** Un problème de longueurs, avec le prénom de l'enfant : faire le tour, couper, mettre bout à bout. */
function lengthStory(rng, name) {
  const kind = pick(rng, ['tour', 'couper', 'marche']);
  if (kind === 'tour') {
    const L = randInt(rng, 6, 20);
    const l = randInt(rng, 3, L - 1);
    const answer = 2 * (L + l);
    const facts = `Le jardin de ${name} est un rectangle de ${L} mètres de long et ${l} mètres de large. On met une clôture tout autour.`;
    const ask = 'Combien de mètres de clôture faut-il ?';
    return {
      key: `perimetres:histoire:tour:${L}x${l}`, facts, ask, answer, unit: 'm',
      traps: [L + l, L * l, 2 * L + l], says: `Il faut ${parle(answer, 'm')} de clôture.`,
    };
  }
  if (kind === 'couper') {
    const m = randInt(rng, 1, 3);
    const cut = randInt(rng, 2, 9) * 10 + pick(rng, [0, 5]);
    const answer = m * 100 - cut;
    const facts = `${name} a une ficelle de ${m} ${m > 1 ? 'mètres' : 'mètre'}. ${name} en coupe ${cut} centimètres.`;
    const ask = 'Combien de centimètres de ficelle reste-t-il ?';
    return {
      key: `perimetres:histoire:couper:${m}-${cut}`, facts, ask, answer, unit: 'cm',
      traps: [m * 100 + cut, cut - m, m * 10 - cut], says: `Il reste ${parle(answer, 'cm')} de ficelle.`,
    };
  }
  const km = randInt(rng, 1, 3);
  const m1 = randInt(rng, 1, 9) * 100;
  const m2 = randInt(rng, 2, 9) * 100;
  const answer = km * 1000 + m1 + m2;
  const facts = `Le matin, ${name} marche ${parle(km, 'km')} ${parle(m1, 'm')}. L’après-midi, ${name} marche encore ${parle(m2, 'm')}.`;
  const ask = 'Combien de mètres a-t-on marché en tout ?';
  return {
    key: `perimetres:histoire:marche:${km}-${m1}-${m2}`, facts, ask, answer, unit: 'm',
    traps: [km + m1 + m2, km * 100 + m1 + m2, km * 1000 + m1], says: `En tout, ${parle(answer, 'm')}.`,
  };
}

function lengthStoryQuestion(rng, name) {
  const s = lengthStory(rng, name);
  const values = withTraps(rng, s.answer, s.traps, 4, { min: 1, max: 9999 });
  return {
    key: s.key,
    text: s.ask,
    instruction: `${s.facts} ${s.ask}`,
    replay: [`${s.facts} ${s.ask}`],
    stage: { type: 'story', text: s.facts },
    ...numberChoices(values, s.unit),
    answer: s.answer,
    success: { speak: s.says },
  };
}

export const perimetres = {
  id: 'perimetres',
  domain: 'temps',
  title: 'Périmètres et longueurs',
  icon: '📐',
  skill: 'Choisir l’unité, convertir (km, m, cm, mm), comparer des longueurs, calculer un périmètre',
  levels: PER_LEVELS.map((l) => l.label),
  generate(level, rng, index = 0, context = {}) {
    const config = PER_LEVELS[level - 1];
    switch (config.kind) {
      case 'unite': return unitQuestion(rng);
      case 'convert': return convertQuestion(rng, config);
      case 'comparer': return compareLengths(rng);
      case 'rect': return rectQuestion(rng);
      case 'poly': return polygonQuestion(rng);
      case 'story': return lengthStoryQuestion(rng, context.name || 'Lou');
      default: return perimetres.generate(pick(rng, [2, 3, 4, 5, 6, 7, 8]), rng, index, context);
    }
  },
};

// ---- Le dessin du polygone (appelé par render.js) : les côtés et leurs longueurs

const INK = '#2b2d42';
const POINTS = {
  triangle: [[30, 140], [200, 140], [105, 22]],
  quadri: [[28, 138], [200, 142], [178, 38], [64, 22]],
  penta: [[115, 14], [205, 78], [172, 148], [58, 148], [25, 78]],
};

function polygonPoints({ shape, sides }) {
  if (shape === 'rect' || shape === 'carre') {
    const [L, l] = sides;
    const s = Math.min(160 / L, 110 / l);
    const w = Math.max(60, L * s);
    const hgt = Math.max(36, Math.min(w, l * s));
    const x0 = 108 - w / 2;
    const y0 = 82 - hgt / 2;
    // dans l'ordre : en haut, à droite, en bas, à gauche (côté i : du point i au point i + 1)
    return [[x0, y0], [x0 + w, y0], [x0 + w, y0 + hgt], [x0, y0 + hgt]];
  }
  return POINTS[shape];
}

/** Le côté i va du point i au point i + 1 ; les côtés en bas et à droite sont ceux du rectangle. */
export function ce2Svg(d) {
  if (d.kind !== 'polygone') return null;
  const pts = polygonPoints(d);
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const labels = d.labels.map((i) => {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    // vers l'extérieur, perpendiculairement au côté ; plus loin sur le côté (le texte est large)
    const len = Math.hypot(x2 - x1, y2 - y1) || 1;
    let [nx, ny] = [(y2 - y1) / len, (x1 - x2) / len];
    if (nx * (mx - cx) + ny * (my - cy) < 0) [nx, ny] = [-nx, -ny];
    const x = mx + nx * (12 + 20 * Math.abs(nx));
    const y = my + ny * 17 + 5;
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="16" font-weight="700" fill="${INK}" text-anchor="middle">${d.sides[i]} ${d.unit}</text>`;
  }).join('');
  const marks = d.shape === 'rect' || d.shape === 'carre'
    ? pts.map(([x, y], i) => {
      // les angles droits : un petit carré dans chaque coin
      const [nx, ny] = pts[(i + 1) % 4];
      const [px, py] = pts[(i + 3) % 4];
      const ux = Math.sign(nx - x) * 9;
      const uy = Math.sign(ny - y) * 9;
      const vx = Math.sign(px - x) * 9;
      const vy = Math.sign(py - y) * 9;
      return `<path d="M${x + ux} ${y + uy} L${x + ux + vx} ${y + uy + vy} L${x + vx} ${y + vy}" fill="none" stroke="${INK}" stroke-width="1.5"/>`;
    }).join('')
    : '';
  const poly = `<polygon points="${pts.map((p) => p.join(',')).join(' ')}" fill="#e3f0ff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
  return `<svg viewBox="-24 -16 280 194" aria-hidden="true">${poly}${marks}${labels}</svg>`;
}

// ================================================================ L'imparfait

const IMP_STEMS = {
  être: 'ét', avoir: 'av', aller: 'all', faire: 'fais', dire: 'dis', venir: 'ven', pouvoir: 'pouv', voir: 'voy', vouloir: 'voul', prendre: 'pren',
};
const IMP_ENDINGS = ['ais', 'ais', 'ait', 'ions', 'iez', 'aient'];

/** La forme à l'imparfait (personnes : 0 je … 5 ils) ; mangeais, lançais, mais mangions, lancions. */
export function imparfait(verb, person) {
  let stem = IMP_STEMS[verb];
  if (!stem) {
    if (!verb.endsWith('er')) throw new Error(`verbe non prévu : ${verb}`);
    stem = verb.slice(0, -2);
    const beforeA = person !== 3 && person !== 4;
    if (beforeA && stem.endsWith('g')) stem += 'e';
    if (beforeA && stem.endsWith('c')) stem = `${stem.slice(0, -1)}ç`;
  }
  return stem + IMP_ENDINGS[person];
}

// « _ » marque le verbe ; le sujet est juste avant (après « Autrefois, »…).
const IMP_ETRE_AVOIR = [
  ['être', 'Avant, je _ à la crèche.'], ['être', 'Hier soir, tu _ dans ton lit.'], ['être', 'Autrefois, le village _ très calme.'],
  ['être', 'L’été dernier, nous _ à la mer.'], ['être', 'Avant, vous _ dans la même classe.'],
  ['être', 'Il y a très longtemps, les dinosaures _ énormes.'],
  ['avoir', 'Avant, je _ un petit vélo.'], ['avoir', 'Autrefois, tu _ les cheveux longs.'], ['avoir', 'Avant, Papi _ une vieille voiture.'],
  ['avoir', 'L’hiver dernier, nous _ très froid.'], ['avoir', 'Autrefois, vous _ un chien.'],
  ['avoir', 'Il y a très longtemps, les mammouths _ de longs poils.'],
];
const IMP_ER_SINGULIER = [
  ['jouer', 'Autrefois, je _ aux billes.'], ['chanter', 'Avant, tu _ sous la douche.'], ['habiter', 'Autrefois, Mamie _ à la campagne.'],
  ['manger', 'Avant, je _ à la cantine.'], ['nager', 'L’été dernier, il _ tous les jours.'], ['lancer', 'Avant, tu _ le ballon très loin.'],
  ['regarder', 'Le soir, elle _ les étoiles.'], ['porter', 'Autrefois, le chevalier _ une armure.'], ['marcher', 'Avant, je _ jusqu’à l’école.'],
  ['aimer', 'Avant, tu _ les dessins animés.'], ['travailler', 'Autrefois, le boulanger _ la nuit.'], ['écouter', 'Avant, je _ des comptines.'],
  ['ranger', 'Autrefois, Papa _ ses outils dans la cave.'], ['laver', 'Autrefois, on _ le linge à la rivière.'],
];
const IMP_ER_PLURIEL = [
  ['jouer', 'Autrefois, nous _ dans la rue.'], ['manger', 'Avant, nous _ à midi.'], ['chanter', 'Autrefois, vous _ à la chorale.'],
  ['habiter', 'Avant, ils _ dans une ferme.'], ['lancer', 'Autrefois, nous _ des cailloux dans la rivière.'], ['nager', 'L’été dernier, vous _ dans le lac.'],
  ['porter', 'Autrefois, les rois _ une couronne.'], ['travailler', 'Autrefois, les enfants _ dans les champs.'],
  ['marcher', 'Avant, elles _ jusqu’au village.'], ['écouter', 'Le soir, nous _ la radio.'], ['allumer', 'Autrefois, les gens _ des bougies.'],
  ['dessiner', 'Il y a très longtemps, les hommes _ sur les murs des grottes.'], ['chasser', 'Il y a très longtemps, les hommes _ le mammouth.'],
];
const IMP_ALLER_FAIRE = [
  ['aller', 'Avant, je _ à l’école à pied.'], ['aller', 'Autrefois, nous _ au marché le samedi.'], ['aller', 'L’été dernier, ils _ à la plage.'],
  ['faire', 'Avant, tu _ du judo.'], ['faire', 'Autrefois, Mamie _ des confitures.'], ['faire', 'L’hiver dernier, nous _ des bonshommes de neige.'],
  ['faire', 'Autrefois, vous _ du vélo.'], ['dire', 'Autrefois, on _ bonjour à tout le monde.'], ['dire', 'Avant, tu _ toujours merci.'],
  ['dire', 'Autrefois, les enfants _ des poèmes par cœur.'], ['venir', 'Avant, Papi _ nous voir le dimanche.'],
  ['venir', 'L’été dernier, vous _ chez nous.'], ['venir', 'Autrefois, les marchands _ de très loin.'],
];
const IMP_POUVOIR = [
  ['pouvoir', 'Avant, tu _ dormir partout.'], ['pouvoir', 'Autrefois, on _ voir les étoiles en ville.'], ['pouvoir', 'Avant, nous _ jouer dans la rue.'],
  ['voir', 'De ma fenêtre, je _ la mer.'], ['voir', 'Autrefois, vous _ des chevaux partout.'], ['voir', 'Avant, ils _ des loups dans la forêt.'],
  ['vouloir', 'Avant, tu _ être astronaute.'], ['vouloir', 'Autrefois, Papa _ un chien.'], ['vouloir', 'L’été dernier, nous _ voir la mer.'],
  ['prendre', 'Avant, je _ le bus.'], ['prendre', 'Autrefois, les gens _ le train à vapeur.'], ['prendre', 'Le matin, vous _ un bol de lait.'],
];

// Les autres personnes proposées : celles qui se prononcent pareil d'abord (chantais, chantait, chantaient).
const IMP_PREF = [[2, 5, 3], [2, 5, 4], [0, 5, 3], [4, 5, 2], [3, 5, 2], [2, 0, 3]];

const startsWithVowel = (w) => /^[aeéèêiouyh]/.test(w);

/** Met `shown` à la place du trou ; « je » devient « j’ » devant une voyelle (j’étais, j’allais). */
function place(template, form, shown = form) {
  return template
    .replace(/\b([Jj])e _/, (m, j) => (startsWithVowel(form) ? `${j}’${shown}` : `${j}e ${shown}`))
    .replace('_', shown);
}

/** La bonne forme et deux autres personnes du même verbe à l'imparfait, toutes différentes. */
function impForms(verb, person) {
  const out = [imparfait(verb, person)];
  for (const p of IMP_PREF[person]) {
    const form = imparfait(verb, p);
    if (!out.includes(form) && out.length < 3) out.push(form);
  }
  return out;
}

const styleFor = (labels) => (labels.some((l) => l.split(' ').some((w) => w.length > 9)) ? 'sentences' : 'words');

function formQuestion(rng, level, items) {
  const [verb, template] = pick(rng, items);
  const person = personOf(subjectOf(template));
  const answer = imparfait(verb, person);
  const labels = shuffle(rng, impForms(verb, person));
  const ending = IMP_ENDINGS[person];
  return {
    key: `imparfait:${level}:${template}`,
    text: 'Choisis le verbe à l’imparfait.',
    instruction: 'Choisis la bonne forme du verbe à l’imparfait.',
    short: { key: 'imparfait:forme', text: 'Quelle forme ?', speak: 'Choisis la bonne forme du verbe à l’imparfait.' },
    stage: { type: 'sentence', text: nbsp(place(template, answer, `… (${verb})`)) },
    choices: textChoices(labels),
    choiceStyle: styleFor(labels),
    answer,
    success: { speak: place(template, answer), reveal: answer, highlight: [[answer.length - ending.length, answer.length]] },
  };
}

/** La terminaison qui manque : « Autrefois, nous jou… dans la rue. » (pas de verbes en -ger, -cer). */
function endingQuestion(rng) {
  const items = [...IMP_ER_SINGULIER, ...IMP_ER_PLURIEL].filter(([verb]) => !/[gc]er$/.test(verb));
  const [verb, template] = pick(rng, items);
  const person = personOf(subjectOf(template));
  const stem = verb.slice(0, -2);
  const answer = IMP_ENDINGS[person];
  const others = IMP_PREF[person].map((p) => IMP_ENDINGS[p]).filter((e) => e !== answer).slice(0, 2);
  const form = stem + answer;
  return {
    key: `imparfait:terminaison:${template}`,
    text: 'Choisis la bonne terminaison.',
    instruction: 'Choisis la bonne terminaison du verbe à l’imparfait.',
    short: { key: 'imparfait:terminaison', text: 'Quelle terminaison ?', speak: 'Choisis la bonne terminaison du verbe à l’imparfait.' },
    stage: { type: 'sentence', text: nbsp(place(template, form, `${stem}…`)) },
    choices: shuffle(rng, [answer, ...others]).map((e) => ({ value: e, label: `-${e}` })),
    choiceStyle: 'words',
    answer,
    success: { speak: place(template, form), reveal: form, highlight: [[stem.length, form.length]] },
  };
}

// Des phrases sans mot du temps : on reconnaît le temps à la forme du verbe.
const TENSE_BASES = [
  ['Je', 'jouer', 'au ballon'], ['Tu', 'chanter', 'une chanson'], ['Le chat', 'regarder', 'les oiseaux'], ['Nous', 'danser', 'dans la cour'],
  ['Vous', 'dessiner', 'un château'], ['Les enfants', 'ramasser', 'des feuilles'], ['Je', 'écouter', 'une histoire'], ['Tu', 'ranger', 'tes jouets'],
  ['Elle', 'préparer', 'un gâteau'], ['Nous', 'planter', 'des fleurs'], ['Vous', 'laver', 'la voiture'], ['Ils', 'grimper', 'aux arbres'],
];
const TENSES = [
  { id: 'present', label: 'présent', says: 'le présent' }, { id: 'futur', label: 'futur', says: 'le futur' },
  { id: 'imparfait', label: 'imparfait', says: 'l’imparfait' }, { id: 'passe', label: 'passé composé', says: 'le passé composé' },
];

/** La forme du verbe à ce temps (présent, futur et passé composé : voir grammaire.js). */
function formAt(verb, tense, person) {
  return tense === 'imparfait' ? imparfait(verb, person) : conjugate(verb, tense, person);
}

/** La phrase : « J’écoutais une histoire. », « Nous dansions dans la cour. » */
function sentenceOf(subject, form, rest) {
  const s = subject === 'Je' && startsWithVowel(form) ? `J’${form}` : `${subject} ${form}`;
  return `${s} ${rest}.`;
}

function tenseQuestion(rng) {
  const [subject, verb, rest] = pick(rng, TENSE_BASES);
  const tense = pick(rng, TENSES);
  const person = personOf(subject);
  const sentence = sentenceOf(subject, formAt(verb, tense.id, person), rest);
  return {
    key: `imparfait:temps:${sentence}`,
    text: 'À quel temps est le verbe ?',
    instruction: 'Lis la phrase. À quel temps est le verbe ?',
    short: { key: 'imparfait:temps', text: 'À quel temps est le verbe ?' },
    stage: { type: 'sentence', text: sentence },
    choices: textChoices(TENSES.map((t) => t.label)),
    choiceStyle: 'words',
    answer: tense.label,
    success: { speak: `Oui, c’est ${tense.says}.` },
  };
}

// Autrefois (imparfait), aujourd'hui (présent), demain (futur) : le mot du temps donne la forme.
const MARKERS = { imparfait: 'Autrefois', present: 'Aujourd’hui', futur: 'Demain' };

function markerQuestion(rng) {
  const [subject, verb, rest] = pick(rng, TENSE_BASES);
  const tense = pick(rng, ['imparfait', 'present', 'futur']);
  const person = personOf(subject);
  const template = `${MARKERS[tense]}, ${subject[0].toLowerCase()}${subject.slice(1)} _ ${rest}.`;
  const forms = ['imparfait', 'present', 'futur'].map((t) => formAt(verb, t, person));
  const answer = formAt(verb, tense, person);
  const labels = shuffle(rng, forms);
  return {
    key: `imparfait:marqueur:${template}`,
    text: 'Autrefois, aujourd’hui ou demain ? Choisis la bonne forme.',
    instruction: ['Choisis la bonne forme du verbe.', 'Regarde bien le début de la phrase.'],
    short: { key: 'imparfait:marqueur', text: 'Quelle forme ?', speak: 'Choisis la bonne forme du verbe.' },
    stage: { type: 'sentence', text: nbsp(place(template, answer, `… (${verb})`)) },
    choices: textChoices(labels),
    choiceStyle: styleFor(labels),
    answer,
    success: { speak: place(template, answer) },
  };
}

const IMP_LEVELS = [
  { label: 'Être et avoir', items: IMP_ETRE_AVOIR },
  { label: 'Verbes en -er, singulier', items: IMP_ER_SINGULIER },
  { label: 'Verbes en -er, pluriel', items: IMP_ER_PLURIEL },
  { label: 'Aller, faire, dire, venir', items: IMP_ALLER_FAIRE },
  { label: 'Pouvoir, voir, vouloir, prendre', items: IMP_POUVOIR },
  { label: 'La bonne terminaison', kind: 'terminaison' },
  { label: 'Quel est le temps du verbe ?', kind: 'temps' },
  { label: 'Autrefois, aujourd’hui, demain', kind: 'marqueur' },
];

export const imparfaitGame = {
  id: 'imparfait',
  domain: 'francais',
  section: 'Grammaire',
  title: 'L’imparfait',
  icon: '🕰️',
  skill: 'Conjuguer à l’imparfait être, avoir, les verbes en -er et les verbes fréquents ; reconnaître le temps d’un verbe',
  levels: IMP_LEVELS.map((l) => l.label),
  generate(level, rng) {
    const config = IMP_LEVELS[level - 1];
    if (config.kind === 'terminaison') return endingQuestion(rng);
    if (config.kind === 'temps') return tenseQuestion(rng);
    if (config.kind === 'marqueur') return markerQuestion(rng);
    return formQuestion(rng, level, config.items);
  },
};

export const CE2_GAMES = [grandsNombres, multiplicationPosee, division, perimetres, imparfaitGame];
