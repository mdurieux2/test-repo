// Corriger en expliquant : après une première erreur, une courte explication visuelle et dite,
// adaptée à la question (calcul en passant par 10, compléments, tables, doubles, comparaisons,
// dizaines, monnaie ; règles des homophones, du genre, des accords et de la conjugaison).
//
// `explain(q)` renvoie des données pures (pas de DOM), ou null si le jeu n'a pas d'explication :
//   { say, steps, visual }
//   - say : UNE phrase (ou deux) de EXPLAIN_SENTENCES, dite par Estelle. Les nombres et les mots de
//     la question ne sont jamais dans ce qui est dit (sinon il faudrait des milliers de sons) : ils
//     sont à l'écran.
//   - steps : ce qui est écrit, étape par étape. Une chaîne est un calcul (« 7 + 3 = 10 », vérifié
//     par les tests) ; un objet { text, em, at, ok } est une phrase, avec un morceau mis en valeur
//     (em, à la position at, sinon sa dernière apparition) et, pour un essai de remplacement,
//     ✔ (ok: true) ou ✘ (ok: false).
//   - visual : un petit dessin (boîtes de 10, rangées de points, tableau des chiffres, tableau de
//     conjugaison), ou rien. Le rendu est dans explications-rendu.js.

import { GRAMMAR_DATA } from './games/francais-extra.js';
import { conjugate, GRAMMAIRE_DATA, personOf, subjectOf } from './games/grammaire.js';

/** Tout ce que l'explication peut faire dire à Estelle (une liste fermée, enregistrée à l'avance). */
export const SAY = Object.freeze({
  // additions et soustractions
  addCount: 'Regarde : on compte tous les points.',
  addTen: 'Regarde : on complète d’abord jusqu’à dix.',
  addDizaine: 'Regarde : on complète d’abord jusqu’à la dizaine.',
  addUnits: 'Regarde : on ajoute d’abord les unités.',
  addTens: 'Regarde : on ajoute les dizaines.',
  addTensUnits: 'Regarde : on ajoute d’abord les dizaines, puis les unités.',
  subCross: 'Regarde : on barre les points qu’on enlève.',
  subTen: 'Regarde : on recule d’abord jusqu’à dix.',
  subDizaine: 'Regarde : on recule d’abord jusqu’à la dizaine.',
  subFromTen: 'Regarde : on enlève dans une dizaine.',
  subUnits: 'Regarde : on enlève d’abord les unités.',
  subTens: 'Regarde : on enlève les dizaines.',
  subTensUnits: 'Regarde : on enlève d’abord les dizaines, puis les unités.',
  // compléments (faire 10)
  compEmpty: 'Regarde : on compte les cases vides.',
  compUnits: 'Regarde : on complète les unités jusqu’à dix.',
  compTens: 'Regarde : dix dizaines, ça fait cent.',
  compHundred: 'Regarde : on complète les dizaines jusqu’à cent.',
  compTwoSteps: 'Regarde : on va d’abord à la dizaine, puis jusqu’à cent.',
  // tables, doubles et moitiés
  tables: 'Regarde : on ajoute plusieurs fois le même nombre.',
  double: 'Regarde : le double, c’est deux fois le même nombre.',
  half: 'Regarde : la moitié, c’est partager en deux parts égales.',
  nearDouble: 'Regarde : on prend le double, puis on ajoute un.',
  doubleSplit: 'Regarde : on prend le double des dizaines, puis celui des unités.',
  halfSplit: 'Regarde : on prend la moitié des dizaines, puis celle des unités.',
  // comparer, encadrer
  compareCount: 'Regarde : quand on compte, le plus grand nombre vient après.',
  compareDigits: 'Regarde : le nombre qui a le plus de chiffres est le plus grand.',
  compareLeft: 'Regarde : on compare les chiffres un par un, en partant de la gauche.',
  compareCalcs: 'Regarde : on calcule d’abord, puis on compare.',
  frame10: 'Regarde : on cherche la dizaine juste avant, et celle juste après.',
  frame100: 'Regarde : on cherche la centaine juste avant, et celle juste après.',
  // dizaines et unités
  blocks: 'Regarde : une barre vaut dix, et un cube vaut un.',
  blocks100: 'Regarde : une plaque vaut cent, une barre vaut dix, et un cube vaut un.',
  blocksExchange: 'Regarde : dix cubes, c’est comme une barre de plus.',
  blocksTenBars: 'Regarde : dix barres, ça fait cent.',
  places: 'Regarde : chaque chiffre a sa place.',
  // monnaie
  moneyCount: 'Regarde : on ajoute la valeur de chaque pièce et de chaque billet.',
  moneyChange: 'Regarde : on part du prix, et on compte jusqu’à la somme donnée.',
  moneyPrice: 'Regarde : le prix et la monnaie rendue font la somme donnée.',
  // homophones
  homoA: 'Si on peut dire avait, on écrit a.',
  homoAs: 'Si on peut dire avais, on écrit as.',
  homoEst: 'Si on peut dire était, on écrit est.',
  homoSont: 'Si on peut dire étaient, on écrit sont.',
  homoOnt: 'Si on peut dire avaient, on écrit ont.',
  homoOu: 'Si on peut dire ou bien, on écrit ou, sans accent.',
  homoLa: 'Si on peut dire ici, on écrit là, avec un accent.',
  homoCe: 'Si on peut dire un, on écrit ce.',
  homoCest: 'Si on peut dire cela est, on écrit c’est.',
  // genre et nombre
  genreUn: 'Si on dit le, on dit un. Si on dit la, on dit une.',
  genreLe: 'Si on dit un, on écrit le. Si on dit une, on écrit la.',
  genreL: 'Devant une voyelle, on met une apostrophe.',
  genreMon: 'Si on dit un, on écrit mon. Si on dit une, on écrit ma.',
  genreCe: 'Si on dit un, on écrit ce. Si on dit une, on écrit cette.',
  genreCet: 'Devant une voyelle, ce devient cet.',
  plural: 'Quand il y en a plusieurs, on met le petit mot du pluriel.',
  unDes: 'Un seul : on écrit un ou une. Plusieurs : on écrit des.',
  adjAccord: 'Le mot qui décrit s’accorde avec le nom : un e au féminin, un s au pluriel.',
  groupAccord: 'Tout le groupe s’accorde : un e au féminin, un s au pluriel.',
  pluralS: 'Au pluriel, on ajoute souvent un s.',
  pluralX: 'Les mots en eau et en eu prennent un x au pluriel.',
  pluralAl: 'Les mots en al font leur pluriel en aux.',
  pluralOu: 'Sept mots en ou prennent un x : bijou, caillou, chou, genou, hibou, joujou, pou.',
  femE: 'Au féminin, on ajoute souvent un e à la fin du mot.',
  groupPlural: 'Au pluriel, le nom et le mot qui le décrit s’accordent tous les deux.',
  sentencePlural: 'Au pluriel, le nom, le mot qui le décrit et le verbe s’accordent.',
  verbPlural: 'Quand le sujet est au pluriel, le verbe finit par e, n, t.',
  verbSingular: 'Quand le sujet est au singulier, le verbe finit souvent par e.',
  // conjugaison
  conjTable: 'Regarde : ce verbe change à chaque personne.',
  conjEr: 'Regarde : la fin du verbe change avec la personne.',
  conjFutur: 'Au futur, on garde tout le verbe, puis on ajoute la fin.',
  conjPasse: 'Au passé composé, on met le verbe avoir, puis le verbe qui finit par é.',
  conjTemps: 'Regarde le début de la phrase : il dit quand ça se passe.',
});

/** Les phrases à enregistrer pour la voix d'Estelle (scripts/voix/phrases.mjs peut les reprendre). */
export const EXPLAIN_SENTENCES = Object.freeze(Object.values(SAY));

const q2 = (text) => `« ${text} »`;
const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;

// ---------------------------------------------------------------- additions et soustractions

/** Une boîte de 10 (ou de 5) : `marks` dans l'ordre, puis des cases vides. */
function frame(marks, size = 10) {
  return [...marks, ...Array(Math.max(0, size - marks.length)).fill('')];
}
const many = (n, mark) => Array(Math.max(0, n)).fill(mark);

/**
 * Explication d'une addition ou d'une soustraction (a op b) : en passant par la dizaine, dizaines
 * puis unités, ou en comptant des points dans des boîtes de 10 (résultats jusqu'à 20).
 * Marques des boîtes : 'a' le premier nombre (point plein), 'b' ce qu'on ajoute (rond creux),
 * 'x' ce qu'on enlève (point barré), '' une case vide.
 */
export function explainOperation(a, op, b) {
  return op === '+' ? explainAddition(a, b) : explainSubtraction(a, b);
}

function explainAddition(a, b) {
  const r = a + b;
  const aT = a - (a % 10);
  const aU = a % 10;
  if (b >= 10) {
    const bT = b - (b % 10);
    const bU = b % 10;
    if (!bU) {
      // 34 + 20 : 30 + 20 = 50, puis 50 + 4 = 54
      const steps = aU ? [`${aT} + ${b} = ${aT + b}`, `${aT + b} + ${aU} = ${r}`]
        : [`${plural(aT / 10, 'dizaine')} + ${plural(b / 10, 'dizaine')} = ${plural((aT + b) / 10, 'dizaine')}`, `${a} + ${b} = ${r}`];
      return { say: SAY.addTens, steps };
    }
    return { say: SAY.addTensUnits, steps: [`${a} + ${bT} = ${a + bT}`, `${a + bT} + ${bU} = ${r}`] };
  }
  if (a < 10 && r <= 10) {
    return { say: SAY.addCount, steps: [`${a} + ${b} = ${r}`], visual: { type: 'frames', frames: [frame([...many(a, 'a'), ...many(b, 'b')])] } };
  }
  if (aU + b > 10) {
    // 7 + 5 : 7 + 3 = 10, puis 10 + 2 = 12
    const c = 10 - aU;
    const ten = a + c;
    const out = { say: ten === 10 ? SAY.addTen : SAY.addDizaine, steps: [`${a} + ${c} = ${ten}`, `${ten} + ${b - c} = ${r}`] };
    if (r <= 20) out.visual = { type: 'frames', frames: [frame([...many(a, 'a'), ...many(c, 'b')]), frame(many(b - c, 'b'))] };
    return out;
  }
  // 30 + 7 : 3 dizaines et 7 unités
  if (!aU) return { say: SAY.places, steps: [`${plural(a / 10, 'dizaine')} + ${plural(b, 'unité')} = ${r}`], visual: placesVisual([r]) };
  // 23 + 4 : 3 + 4 = 7, puis 20 + 7 = 27 (aussi 27 + 3 : 7 + 3 = 10, puis 20 + 10 = 30)
  const out = { say: SAY.addUnits, steps: [`${aU} + ${b} = ${aU + b}`, `${aT} + ${aU + b} = ${r}`] };
  if (r <= 20) out.visual = { type: 'frames', frames: [frame(many(10, 'a')), frame([...many(aU, 'a'), ...many(b, 'b')])] };
  return out;
}

function explainSubtraction(a, b) {
  const r = a - b;
  const aT = a - (a % 10);
  const aU = a % 10;
  if (b >= 10) {
    const bT = b - (b % 10);
    const bU = b % 10;
    if (!bU) {
      const steps = aU ? [`${aT} − ${b} = ${aT - b}`, `${aT - b} + ${aU} = ${r}`]
        : [`${plural(a / 10, 'dizaine')} − ${plural(b / 10, 'dizaine')} = ${plural(r / 10, 'dizaine')}`, `${a} − ${b} = ${r}`];
      return { say: SAY.subTens, steps };
    }
    return { say: SAY.subTensUnits, steps: [`${a} − ${bT} = ${a - bT}`, `${a - bT} − ${bU} = ${r}`] };
  }
  if (a <= 10) {
    return { say: SAY.subCross, steps: [`${a} − ${b} = ${r}`], visual: { type: 'frames', frames: [frame([...many(r, 'a'), ...many(b, 'x')])] } };
  }
  if (!aU) {
    // 30 − 4 : 10 − 4 = 6, puis 20 + 6 = 26
    const out = { say: SAY.subFromTen, steps: [`10 − ${b} = ${10 - b}`, `${a - 10} + ${10 - b} = ${r}`] };
    if (a <= 20) out.visual = { type: 'frames', frames: [frame(many(10, 'a')), frame([...many(10 - b, 'a'), ...many(b, 'x')])] };
    return out;
  }
  if (aU < b) {
    // 13 − 5 : 13 − 3 = 10, puis 10 − 2 = 8
    const ten = a - aU;
    const out = { say: ten === 10 ? SAY.subTen : SAY.subDizaine, steps: [`${a} − ${aU} = ${ten}`, `${ten} − ${b - aU} = ${r}`] };
    if (a <= 20) out.visual = { type: 'frames', frames: [frame([...many(10 - (b - aU), 'a'), ...many(b - aU, 'x')]), frame(many(aU, 'x'))] };
    return out;
  }
  // 17 − 4 : 7 − 4 = 3, puis 10 + 3 = 13
  const out = { say: SAY.subUnits, steps: [`${aU} − ${b} = ${aU - b}`, `${aT} + ${aU - b} = ${r}`] };
  if (a <= 20) out.visual = { type: 'frames', frames: [frame(many(10, 'a')), frame([...many(aU - b, 'a'), ...many(b, 'x')])] };
  return out;
}

// ---------------------------------------------------------------- compléments, tables, doubles

/** « Combien pour faire total ? » : la boîte, l'unité jusqu'à 10, la dizaine jusqu'à 100. */
function explainComplement(n, total) {
  const answer = total - n;
  if (total <= 20) {
    const size = total === 5 ? 5 : 10;
    const frames = total === 20
      ? [frame(many(Math.min(n, 10), 'a')), frame(many(Math.max(0, n - 10), 'a'))]
      : [frame(many(n, 'a'), size)];
    return { say: SAY.compEmpty, steps: [`${n} + ${answer} = ${total}`], visual: { type: 'frames', size, frames } };
  }
  if (total % 100 === 0 && total > 100) {
    // 370 + ? = 400 : 70 + 30 = 100
    return { say: SAY.compHundred, steps: [`${n % 100} + ${answer} = 100`, `${n} + ${answer} = ${total}`] };
  }
  if (total === 100) {
    if (n % 10 === 0) {
      return { say: SAY.compTens, steps: [`${plural(n / 10, 'dizaine')} + ${plural(answer / 10, 'dizaine')} = 10 dizaines`, `${n} + ${answer} = 100`] };
    }
    // 47 + ? = 100 : 47 + 3 = 50, puis 50 + 50 = 100, et 3 + 50 = 53
    const c = 10 - (n % 10);
    return {
      say: SAY.compTwoSteps,
      steps: [`${n} + ${c} = ${n + c}`, `${n + c} + ${100 - n - c} = 100`, `${c} + ${100 - n - c} = ${answer}`],
    };
  }
  // 37 + ? = 40 : 7 + 3 = 10
  return { say: SAY.compUnits, steps: [`${n % 10} + ${answer} = 10`, `${n} + ${answer} = ${total}`] };
}

/** n × t, c'est t + t + … (n fois) ; de petits produits sont dessinés en rangées de points. */
function explainTable(n, t) {
  const sum = Array(n).fill(t).join(' + ');
  const steps = n === 1 ? [`1 × ${t} = ${t}`]
    : t === 10 ? [`${n} × 10 = ${plural(n, 'dizaine')} = ${n * 10}`]
      : [`${n} × ${t} = ${sum} = ${n * t}`];
  const out = { say: SAY.tables, steps };
  if (n >= 2 && n <= 5 && t <= 10) out.visual = { type: 'groups', rows: Array(n).fill(t) };
  return out;
}

function explainDouble(n) {
  if (n >= 10 && n % 10 && n < 100) {
    const t = n - (n % 10);
    const u = n % 10;
    return { say: SAY.doubleSplit, steps: [`${t} + ${t} = ${2 * t}`, `${u} + ${u} = ${2 * u}`, `${2 * t} + ${2 * u} = ${2 * n}`] };
  }
  const out = { say: SAY.double, steps: [`${n} + ${n} = ${2 * n}`] };
  if (n % 10 === 0 && n >= 10) out.steps.unshift(`${plural(n / 10, 'dizaine')} + ${plural(n / 10, 'dizaine')} = ${plural(n / 5, 'dizaine')}`);
  if (n <= 10) out.visual = { type: 'groups', rows: [n, n] };
  return out;
}

function explainHalf(n) {
  const h = n / 2;
  const t = n - (n % 10);
  const u = n % 10;
  if (n > 20 && u && t % 20 === 0 && u % 2 === 0) {
    // moitié de 46 : 20 + 20 = 40, 3 + 3 = 6, donc 23
    return { say: SAY.halfSplit, steps: [`${t / 2} + ${t / 2} = ${t}`, `${u / 2} + ${u / 2} = ${u}`, `${h} + ${h} = ${n}`] };
  }
  const out = { say: SAY.half, steps: [`${h} + ${h} = ${n}`] };
  if (n <= 20) out.visual = { type: 'groups', rows: [h, h] };
  return out;
}

// ---------------------------------------------------------------- comparer, dizaines, monnaie

const PLACE_HEADS = ['c', 'd', 'u'];
const PLACE_NAMES = ['centaine', 'dizaine', 'unité'];

/** Le tableau des chiffres (c, d, u) de quelques nombres, une colonne mise en valeur. */
function placesVisual(numbers, mark = null) {
  const width = Math.max(...numbers.map((n) => String(n).length));
  const heads = PLACE_HEADS.slice(3 - width);
  return {
    type: 'places',
    heads,
    rows: numbers.map((n) => String(n).padStart(width, ' ').split('').map((d) => (d === ' ' ? '' : d))),
    mark: mark === null ? null : mark - (3 - width),
  };
}

/** Pourquoi lo < hi : le nombre de chiffres, puis le premier chiffre différent en partant de la gauche. */
function comparison(lo, hi) {
  const [sl, sh] = [String(lo), String(hi)];
  if (sl.length !== sh.length) {
    return { say: SAY.compareDigits, steps: [`${lo} < ${hi}`], visual: placesVisual([lo, hi]) };
  }
  if (sl.length === 1) {
    return {
      say: SAY.compareCount,
      steps: [{ text: Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).join(', ') }, `${lo} < ${hi}`],
    };
  }
  const i = [...sl].findIndex((d, k) => d !== sh[k]);
  const place = PLACE_NAMES[3 - sl.length + i];
  return {
    say: SAY.compareLeft,
    steps: [`${plural(Number(sl[i]), place)} < ${plural(Number(sh[i]), place)}`, `${lo} < ${hi}`],
    visual: placesVisual([lo, hi], 3 - sl.length + i),
  };
}

/** Une barre, des cubes, des plaques : « 4 barres = 40 », « 7 cubes = 7 », « 40 + 7 = 47 ». */
function blocksSteps(hundreds, tens, units) {
  const parts = [];
  if (hundreds) parts.push([`${plural(hundreds, 'plaque')}`, hundreds * 100]);
  if (tens) parts.push([`${plural(tens, 'barre')}`, tens * 10]);
  if (units) parts.push([`${plural(units, 'cube')}`, units]);
  const steps = parts.map(([label, value]) => `${label} = ${value}`);
  if (parts.length > 1) steps.push(`${parts.map(([, v]) => v).join(' + ')} = ${hundreds * 100 + tens * 10 + units}`);
  return steps;
}

/** Une somme d'argent : les billets et les pièces, du plus grand au plus petit. */
function moneySum(items) {
  const values = [...items].sort((x, y) => y - x);
  return values.length > 1 ? `${values.join(' + ')} = ${values.reduce((s, v) => s + v, 0)}` : `${values[0]} = ${values[0]}`;
}

/** Un calcul écrit « 34 + 5 » ou « 50 − 8 ». */
function calcValue(label) {
  const m = label.match(/^(\d+)\s*([+−])\s*(\d+)$/);
  return m ? (m[2] === '+' ? Number(m[1]) + Number(m[3]) : Number(m[1]) - Number(m[3])) : null;
}

// ---------------------------------------------------------------- français

// Le test de remplacement de chaque homophone : le mot qui remplace, et l'homophone qu'il désigne.
const HOMO_TESTS = {
  a: ['avait', 'a', SAY.homoA], à: ['avait', 'a', SAY.homoA], as: ['avais', 'as', SAY.homoAs],
  et: ['était', 'est', SAY.homoEst], est: ['était', 'est', SAY.homoEst],
  son: ['étaient', 'sont', SAY.homoSont], sont: ['étaient', 'sont', SAY.homoSont],
  on: ['avaient', 'ont', SAY.homoOnt], ont: ['avaient', 'ont', SAY.homoOnt],
  ou: ['ou bien', 'ou', SAY.homoOu], où: ['ou bien', 'ou', SAY.homoOu],
  la: ['ici', 'là', SAY.homoLa], là: ['ici', 'là', SAY.homoLa],
  ce: ['un', 'ce', SAY.homoCe], se: ['un', 'ce', SAY.homoCe],
  'c’est': ['cela est', 'c’est', SAY.homoCest], 's’est': ['cela est', 'c’est', SAY.homoCest],
};

/** « Léo avait un vélo. ✔ » : la phrase où le trou est remplacé par le mot du test. */
function homophoneTest(sentence, answer, blank = 0) {
  const [word, yes] = HOMO_TESTS[answer];
  let k = 0;
  let at = -1;
  const text = sentence.replace(/___/g, (m, offset) => {
    if (k++ !== blank) return '…';
    at = offset - 2 * blank; // chaque « … » placé avant est plus court de 2 caractères que « ___ »
    return word;
  });
  return { text, em: word, at, ok: answer === yes };
}

function explainHomophone(rest, q) {
  if (rest.startsWith('deux:')) {
    const sentence = rest.slice(5);
    const answers = String(q.answer).split('|');
    if (!answers.every((w) => HOMO_TESTS[w])) return null;
    return { say: HOMO_TESTS[answers[0]][2], steps: answers.map((w, i) => homophoneTest(sentence, w, i)) };
  }
  const answer = String(q.answer);
  if (!HOMO_TESTS[answer] || !rest.includes('___')) return null;
  // a, as ou à : « tu as » se teste avec « avais », les autres avec « avait »
  return { say: HOMO_TESTS[answer][2], steps: [homophoneTest(rest, answer)] };
}

const VOWEL = /^[aeéèêiouyh]/i;
const { NOUNS, X_NOUNS } = GRAMMAR_DATA;
const nounOf = (shown) => [...NOUNS, ...X_NOUNS].find((n) => n.w === shown || n.pl === shown);
const OU_X = ['bijou', 'caillou', 'chou', 'genou', 'hibou', 'joujou', 'pou'];

/** Pourquoi s, x ou aux au pluriel : la fin du mot. */
function pluralRule(w) {
  if (w.endsWith('al')) return { say: SAY.pluralAl, steps: [{ text: `${w} finit par ${q2('al')}.`, em: 'al' }] };
  const end = ['eau', 'eu'].find((e) => w.endsWith(e));
  if (end) return { say: SAY.pluralX, steps: [{ text: `${w} finit par ${q2(end)}.`, em: end }] };
  if (w.endsWith('ou')) {
    const x = OU_X.includes(w);
    return { say: SAY.pluralOu, steps: [{ text: `${w} ${x ? 'est' : 'n’est pas'} dans la liste.`, em: w, ok: x }] };
  }
  return { say: SAY.pluralS, steps: [{ text: `${w} ne finit pas par eau, eu ou al.`, em: w }] };
}

/** « « avion » commence par « a », une voyelle. » (la lettre mise en valeur est celle entre guillemets) */
function vowelStep(w) {
  const before = `${q2(w)} commence par « `;
  return { text: `${before}${w[0]} », une voyelle.`, em: w[0], at: before.length };
}

/** « On dit « un chat ». » : le petit mot qui dit si le nom est masculin ou féminin. */
const onDit = (article, word) => ({ text: `On dit ${q2(`${article} ${word}`)}.`, em: article });

function explainGenre(rest, q) {
  const [level, ...parts] = rest.split(':');
  const shown = parts.at(-1);
  const answer = String(q.answer);
  if (level === '6' || level === '8') {
    const noun = level === '6' ? nounOf(shown) : nounOf(shown.split(' ').at(-1));
    if (!noun) return null;
    const pl = level === '6' ? shown === noun.pl : answer.startsWith('les ');
    const steps = [noun.g === 'f'
      ? { text: `${q2(noun.w)} est féminin : on ajoute e.`, em: 'e' }
      : { text: `${q2(noun.w)} est masculin : pas de e.`, em: 'masculin' }];
    steps.push(pl ? { text: 'Il y en a plusieurs : on ajoute s.', em: 's' } : { text: 'Il n’y en a qu’un : pas de s.', em: 'un' });
    return { say: level === '6' ? SAY.adjAccord : SAY.groupAccord, steps };
  }
  if (level === '7') {
    const noun = nounOf(shown);
    return noun ? pluralRule(noun.w) : null;
  }
  const noun = nounOf(shown);
  if (!noun) return null;
  const isPlural = shown === noun.pl && noun.pl !== noun.w;
  if (isPlural && level !== '1' && level !== '2') {
    return { say: SAY.plural, steps: [{ text: `${q2(shown)} : il y en a plusieurs.`, em: 'plusieurs' }] };
  }
  const article = noun.g === 'f' ? 'une' : 'un';
  if (level === '1') {
    // « l’avion » ne dit pas si le nom est masculin ou féminin : pas d'explication
    if (VOWEL.test(noun.w)) return null;
    return { say: SAY.genreUn, steps: [onDit(noun.g === 'f' ? 'la' : 'le', noun.w)] };
  }
  if (level === '2' && answer === "l'") return { say: SAY.genreL, steps: [vowelStep(noun.w)] };
  if (level === '5') {
    if (answer === 'cet') return { say: SAY.genreCet, steps: [onDit(article, noun.w), vowelStep(noun.w)] };
    return { say: SAY.genreCe, steps: [onDit(article, noun.w)] };
  }
  return { say: level === '4' ? SAY.genreMon : SAY.genreLe, steps: [onDit(article, noun.w)] };
}

function explainAccord(rest, q) {
  const [kind] = rest.split(':');
  const { NOMS } = GRAMMAIRE_DATA;
  if (kind === '1') {
    const count = q.stage?.count || 1;
    return { say: SAY.unDes, steps: [{ text: count > 1 ? `Il y en a ${count} : plusieurs.` : 'Il y en a un seul.', em: count > 1 ? 'plusieurs' : 'un seul' }] };
  }
  if (kind === 'pluriel') {
    // le nom au singulier : la réponse proposée dont une autre est le pluriel en s
    const labels = (q.choices || []).map((c) => String(c.value));
    const w = labels.find((l) => labels.includes(`${l}s`));
    return w ? pluralRule(w) : null;
  }
  if (kind === '4') {
    const w = rest.slice(2);
    const noun = NOMS.find(([n]) => n === w);
    if (!noun || VOWEL.test(w)) return null;
    return { say: SAY.genreUn, steps: [onDit(noun[1] === 'f' ? 'la' : 'le', w)] };
  }
  if (kind === '5') {
    const to = q.stage?.to || '';
    return { say: SAY.femE, steps: [{ text: `${q2(to)} : c’est féminin.`, em: 'féminin' }] };
  }
  if (kind === '6') return { say: SAY.groupPlural, steps: [{ text: `${q2('les …')} : c’est le pluriel.`, em: 'pluriel' }] };
  if (kind === '7') {
    const subject = (q.stage?.to || '').replace(/\s*…$/, '');
    const pl = personOf(subject) === 5;
    // le pronom se devine au singulier : « La poule » → elle, donc « Les poules » → elles
    const single = pl ? (q.stage?.from || '').split(' ').slice(0, -1).join(' ') : subject;
    const base = MASC.test(single) ? 'il' : FEM.test(single) ? 'elle' : 'il / elle';
    const pronoun = /^(il|elle)s?$/i.test(subject) ? '' : ` → ${q2(pl ? base.replace(/(il|elle)/g, '$1s') : base)}`;
    return {
      say: pl ? SAY.verbPlural : SAY.verbSingular,
      steps: [{ text: `${q2(subject)}${pronoun} : ${pl ? 'le pluriel' : 'le singulier'}.`, em: pl ? 'pluriel' : 'singulier' }],
    };
  }
  if (kind === '9') return { say: SAY.sentencePlural, steps: [{ text: `${q2(q.stage?.to || 'les …')} : c’est le pluriel.`, em: 'pluriel' }] };
  return null; // niveau 8 : les féminins particuliers s'apprennent un par un
}

const PRONOUNS = ['je', 'tu', 'il, elle', 'nous', 'vous', 'ils, elles'];
const PRONOUN_SHORT = ['je', 'tu', 'il', 'nous', 'vous', 'ils'];
const TENSE_NAMES = { passe: 'le passé', present: 'le présent', futur: 'le futur' };
const ER_ENDINGS = { present: ['e', 'es', 'e', 'ons', 'ez', 'ent'], futur: ['ai', 'as', 'a', 'ons', 'ez', 'ont'] };

const MASC = /^(le|un|mon|ton|son|ce|cet|papa|papi|tonton)\b/i;
const FEM = /^(la|une|ma|ta|sa|cette|maman|mamie|tata)\b/i;

/** « Le poisson → il » : le sujet remplacé par son pronom (s'il n'en est pas un). */
function pronounStep(subject, person) {
  if (PRONOUNS.some((p) => p.split(', ').includes(subject.toLowerCase()))) return null;
  let pronoun = PRONOUNS[person].replace(', ', ' / ');
  if (person === 2 && MASC.test(subject)) pronoun = 'il';
  if (person === 2 && FEM.test(subject)) pronoun = 'elle';
  return { text: `${q2(subject)} → ${q2(pronoun)}`, em: pronoun };
}

/** Les six formes d'un verbe (j’ devant une voyelle), celle de la personne mise en valeur. */
function conjugationGrid(verb, tense, person) {
  return {
    type: 'grid',
    cells: PRONOUN_SHORT.map((p, i) => {
      const form = conjugate(verb, tense, i);
      return { text: p === 'je' && VOWEL.test(form) ? `j’${form}` : `${p} ${form}`, em: i === person };
    }),
  };
}

function explainConjugation(rest, q) {
  const level = Number(rest.split(':')[0]);
  const template = rest.slice(rest.indexOf(':') + 1);
  const def = GRAMMAIRE_DATA.CONJ_LEVELS[level];
  if (!def || def.both) return null; // être ou avoir : pas de règle courte
  const item = def.items.find((it) => it[1] === template);
  if (!item) return null;
  const [verb, , itemTense] = item;
  const tense = itemTense || def.tense;
  const subject = subjectOf(template);
  const person = personOf(subject);
  const steps = [pronounStep(subject, person)].filter(Boolean);
  if (def.tenses) {
    const start = template.slice(0, template.lastIndexOf(', ', template.indexOf(' _')) + 1) || template.slice(0, template.indexOf(' _'));
    return { say: SAY.conjTemps, steps: [{ text: `${q2(start.replace(/,$/, ''))} : c’est ${TENSE_NAMES[tense]}.`, em: TENSE_NAMES[tense] }] };
  }
  if (tense === 'passe') {
    const stem = verb.slice(0, -2);
    steps.push({ text: `${verb} → ${stem}é`, em: 'é' });
    return { say: SAY.conjPasse, steps, visual: conjugationGrid('avoir', 'present', person) };
  }
  const irregular = GRAMMAIRE_DATA.IRREGULAR[tense]?.[verb];
  if (irregular) return { say: SAY.conjTable, steps, visual: conjugationGrid(verb, tense, person) };
  const endings = ER_ENDINGS[tense];
  if (tense === 'futur') steps.push({ text: `On garde ${q2(verb)}, et on ajoute la fin.`, em: verb });
  return {
    say: tense === 'futur' ? SAY.conjFutur : SAY.conjEr,
    steps,
    visual: { type: 'grid', cells: PRONOUN_SHORT.map((p, i) => ({ text: `${p} …${endings[i]}`, em: i === person })) },
  };
}

// ---------------------------------------------------------------- l'aiguillage

/** La clé de la question, sans les préfixes des parties à deux, des défis et des révisions. */
function baseKey(q) {
  return String(q?.key || '').replace(/^(?:(?:duo|defi|revision):)+/, '');
}

/** Les explications des jeux de maths (null si la question n'en a pas). */
function explainMaths(game, rest, q) {
  const { stage = {} } = q;
  if (game === 'calcul' && stage.type === 'operation') return explainOperation(stage.a, stage.op, stage.b);
  if (game === 'vite-vu' && stage.inner?.type === 'equation') {
    const [a, op, b] = stage.inner.parts;
    return explainOperation(a, op, b);
  }
  if (game === 'faire-dix') {
    // les boîtes sont déjà dessinées en grand : on y compte les cases vides
    if (stage.type === 'frame') return { ...explainComplement(stage.filled, stage.size), visual: null };
    if (stage.type === 'frames') return { ...explainComplement(stage.filled, 20), visual: null };
    if (stage.type === 'equation') return explainComplement(stage.parts[0], stage.parts[4]);
    return null;
  }
  if (game === 'tables') {
    if (stage.type === 'multiplication') return explainTable(stage.a, stage.b);
    if (stage.type === 'equation' && stage.parts[1] === '×') {
      const [a, , b, , product] = stage.parts;
      return a === null ? explainTable(product / b, b) : explainTable(a, product / a);
    }
    return null;
  }
  if (game === 'doubles') {
    if (rest.startsWith('presque:')) {
      const [a, b] = rest.slice(8).split('+').map(Number);
      const n = Math.min(a, b);
      return { say: SAY.nearDouble, steps: [`${n} + ${n} = ${2 * n}`, `${2 * n} + 1 = ${a + b}`] };
    }
    const n = Number(rest.match(/(\d+)/)?.[1]);
    if (/double de/.test(rest)) return explainDouble(n);
    if (/moitié de/.test(rest)) return explainHalf(n);
    return null;
  }
  if (game === 'comparer') {
    if (rest.startsWith('signe:')) {
      const [a, b] = rest.slice(6).split('-').map(Number);
      if (a === b) return { say: SAY.compareLeft, steps: [`${a} = ${b}`], visual: placesVisual([a, b]) };
      return comparison(Math.min(a, b), Math.max(a, b));
    }
    if (rest.startsWith('encadrer:')) {
      const [n, unit] = rest.slice(9).split(':').map(Number);
      const low = n - (n % unit);
      return {
        say: unit === 100 ? SAY.frame100 : SAY.frame10,
        steps: [`${low} < ${n} < ${low + unit}`],
        visual: placesVisual([n], unit === 100 ? 0 : 1),
      };
    }
    if (rest.startsWith('calculs:')) {
      const [x, y] = rest.slice(8).split('|');
      const [vx, vy] = [calcValue(x), calcValue(y)];
      if (vx === null || vy === null || vx === vy) return null;
      return { say: SAY.compareCalcs, steps: [`${x} = ${vx}`, `${y} = ${vy}`, `${Math.min(vx, vy)} < ${Math.max(vx, vy)}`] };
    }
    const m = rest.match(/^(\d+)-(\d+)$/);
    if (!m || !(q.choices || []).every((c) => typeof c.value === 'number')) return null; // niveau 1 : des collections
    return comparison(Number(m[1]), Number(m[2]));
  }
  if (game === 'dizaines') {
    if (stage.type === 'blocks') {
      const { hundreds = 0, tens = 0, units = 0 } = stage;
      const say = hundreds ? SAY.blocks100 : units >= 10 ? SAY.blocksExchange : tens >= 10 ? SAY.blocksTenBars : SAY.blocks;
      return { say, steps: blocksSteps(hundreds, tens, units) };
    }
    const n = Number(q.answer);
    if (rest.startsWith('chiffre:')) {
      const place = rest.split(':')[2];
      const i = ['centaines', 'dizaines', 'unités'].indexOf(place);
      const [c, d, u] = String(rest.split(':')[1]).split('').map(Number);
      return {
        say: SAY.places,
        steps: [`${rest.split(':')[1]} = ${plural(c, 'centaine')} + ${plural(d, 'dizaine')} + ${plural(u, 'unité')}`],
        visual: placesVisual([Number(rest.split(':')[1])], i),
      };
    }
    if (rest.startsWith('mots:') && Number.isInteger(n)) {
      const [c, d, u] = String(n).split('').map(Number);
      // les parties dans l'ordre des places (un zéro là où il n'y a rien)
      const parts = [[c, 'centaine'], [d, 'dizaine'], [u, 'unité']].filter(([v]) => v > 0);
      return { say: SAY.places, steps: [`${parts.map(([v, word]) => plural(v, word)).join(' + ')} = ${n}`], visual: placesVisual([n]) };
    }
    return null;
  }
  if (game === 'monnaie') {
    if (stage.type === 'money' && stage.items?.length) return { say: SAY.moneyCount, steps: [moneySum(stage.items)] };
    if (stage.type === 'price' && stage.paid && typeof stage.price === 'number') {
      return { say: SAY.moneyChange, steps: [`${stage.price} + ${stage.paid - stage.price} = ${stage.paid}`] };
    }
    if (stage.type === 'price' && stage.paid && stage.price === '?') {
      const price = Number(q.answer);
      return { say: SAY.moneyPrice, steps: [`${stage.paid} − ${stage.paid - price} = ${price}`, `${price} + ${stage.paid - price} = ${stage.paid}`] };
    }
    return null;
  }
  return null;
}

/**
 * L'explication d'une question après une erreur, ou null. Le jeu est reconnu par le début de
 * la clé de la question (les questions des révisions et des défis gardent la clé de leur jeu).
 */
export function explain(q) {
  if (!q || q.interaction && q.interaction !== 'keypad') return null; // choix multiple et pavé numérique
  const key = baseKey(q);
  const colon = key.indexOf(':');
  if (colon < 0) return null;
  const game = key.slice(0, colon);
  const rest = key.slice(colon + 1);
  let out = null;
  try {
    if (game === 'homophones') out = explainHomophone(rest, q);
    else if (game === 'genre') out = explainGenre(rest, q);
    else if (game === 'accords') out = explainAccord(rest, q);
    else if (game === 'conjugaison') out = explainConjugation(rest, q);
    else out = explainMaths(game, rest, q);
  } catch {
    out = null; // une question d'une forme inattendue : on garde « Essaie encore ! » tout seul
  }
  return out && (out.steps?.length || out.visual) ? { visual: null, ...out } : null;
}
