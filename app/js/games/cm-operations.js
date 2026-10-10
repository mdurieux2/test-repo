// Opérations et problèmes du cours moyen (programme de mathématiques du cycle 3, 2025) :
//  - « Les opérations du CM » : poser et calculer additions et soustractions de décimaux (virgule
//    sous la virgule), multiplier par un nombre à deux chiffres, un décimal par un nombre à un chiffre
//    (CM1) puis par un entier (CM2), estimer un ordre de grandeur, la division euclidienne à un chiffre
//    (CM1) et la division décimale (CM2) ;
//  - « Les problèmes du CM » : problèmes additifs et multiplicatifs en une ou plusieurs étapes,
//    comparaison multiplicative, partage et groupement, prix, proportionnalité (par linéarité, sans
//    tableau ni retour à l'unité, comme le veut le programme), fractions, durées, programme de calcul.
// Le texte du problème est écrit à l'écran (le bouton 🔊 le lit) ; la consigne dite est fixe. Les
// problèmes utilisent le prénom de l'enfant (`context.name`).

import { pick, randInt, sample, shuffle } from '../random.js';
import { dit, ecrit } from './ce2.js';
import { virgule } from './cm-nombres.js';

const CALCUL = 'Nombres et calcul';

/** `count` écritures distinctes : la bonne, puis les pièges dans l'ordre (le tout mélangé). */
function avecPieges(rng, bonne, pieges, count) {
  const out = [bonne];
  for (const p of pieges) if (out.length < count && p !== null && p !== undefined && p !== '' && !out.includes(p)) out.push(p);
  return shuffle(rng, out);
}
const textes = (labels) => labels.map((label) => ({ value: label, label }));

function aToucher({ key, consigne, court, stage, choices, style = 'words', answer, dire }) {
  return {
    key,
    text: consigne,
    instruction: consigne,
    short: { key: `${key.split(':')[0]}:${consigne}`, text: court || consigne },
    stage,
    choices,
    choiceStyle: style,
    answer,
    ...(dire ? { success: { speak: dire } } : {}),
  };
}

function aTaper({ key, consigne, court = 'Tape le résultat.', stage, answer, dire }) {
  return {
    key,
    text: consigne,
    instruction: consigne,
    short: { key: `${key.split(':')[0]}:${consigne}`, text: court },
    stage,
    interaction: 'keypad',
    choices: [],
    maxDigits: String(answer).length + 1,
    answer,
    ...(dire ? { success: { speak: dire } } : {}),
  };
}

// ================================================================ Les opérations du CM

/** Un décimal en millièmes, avec `places` chiffres après la virgule (le dernier non nul). */
function decimal(rng, places, entMin, entMax) {
  let dec = randInt(rng, 1, 10 ** places - 1);
  if (dec % 10 === 0) dec += 1;
  return randInt(rng, entMin, entMax) * 1000 + dec * 10 ** (3 - places);
}
const places = (milli) => (milli % 10 ? 3 : milli % 100 ? 2 : milli % 1000 ? 1 : 0);

/**
 * Les mêmes nombres, mais calculés colonne par colonne sans retenue : 3,8 + 6,9 → 9,7 (le 1 de 17
 * oublié). Les deux nombres sont alignés à la virgule (en millièmes, 3 chiffres après la virgule).
 */
function sansRetenue(a, b, op) {
  const da = String(a).padStart(9, '0').split('').map(Number);
  const db = String(b).padStart(9, '0').split('').map(Number);
  const out = da.map((x, i) => (op === '+' ? (x + db[i]) % 10 : Math.abs(x - db[i])));
  return Number(out.join(''));
}

/** Poser : la virgule sous la virgule (les unités sous les unités). */
function poserDecimaux(rng) {
  // deux nombres qui n'ont pas autant de chiffres après la virgule (sinon, aligner à droite suffit)
  const pa = randInt(rng, 0, 1);
  const a = pa ? decimal(rng, pa, 10, 99) : randInt(rng, 10, 99) * 1000;
  const b = decimal(rng, 2, 1, 9);
  const op = rng() < 0.7 ? '+' : '−';
  const [x, y] = op === '−' ? [a, b].sort((p, q) => q - p) : shuffle(rng, [a, b]);
  const rows = [virgule(x), virgule(y)];
  // le nombre d'écritures après la virgule (la virgule elle-même compte pour une colonne)
  const apres = rows.map((r) => (r.includes(',') ? r.length - r.indexOf(',') : 0));
  const decalage = (i) => Math.max(...apres) - apres[i];
  const juste = [decalage(0), decalage(1)];
  const options = [['juste', juste], ['droite', [0, 0]], ['gauche', juste[0] ? [0, juste[0] + 1] : [juste[1] + 1, 0]]];
  const width = Math.max(...options.flatMap(([, off]) => rows.map((r, i) => r.length + off[i])));
  return {
    key: `operations-cm:poser:${rows.join(op)}`,
    text: 'Comment poser cette opération ?',
    instruction: 'Comment poser cette opération ? La virgule va sous la virgule, les unités sous les unités.',
    short: { key: 'operations-cm:poser', text: 'Comment poser cette opération ?' },
    stage: { type: 'equation', parts: [rows[0], op, rows[1]] },
    choices: shuffle(rng, options).map(([value, offsets]) => ({ value, label: '', column: { op, rows, offsets, width } })),
    choiceStyle: 'columns',
    answer: 'juste',
    success: { speak: 'La virgule est bien sous la virgule.' },
  };
}

/** Additionner ou soustraire deux décimaux (avec retenue) ; pièges : virgules mal alignées, retenue oubliée. */
function calculDecimaux(rng, op) {
  let a = decimal(rng, randInt(rng, 1, 2), 3, 60);
  let b = decimal(rng, randInt(rng, 1, 2), 1, op === '+' ? 60 : 9);
  if (op === '−' && b > a) [a, b] = [b, a];
  if (places(a) === places(b) && rng() < 0.6) return calculDecimaux(rng, op);
  const r = op === '+' ? a + b : a - b;
  // virgules mal alignées : les chiffres posés à droite, comme des entiers
  const pa = places(a);
  const pb = places(b);
  const ia = Math.round(a / 10 ** (3 - pa));
  const ib = Math.round(b / 10 ** (3 - pb));
  const p = Math.max(pa, pb);
  const mal = op === '+' ? (ia + ib) * 10 ** (3 - p) : (ia - ib) * 10 ** (3 - p);
  const pieges = [mal > 0 ? virgule(mal) : null, virgule(sansRetenue(a, b, op)), virgule(op === '+' ? r + 1000 : r - 100), virgule(r + 100)];
  return aToucher({
    key: `operations-cm:${op === '+' ? 'addition' : 'soustraction'}:${a}${op}${b}`,
    consigne: op === '+' ? 'Pose l’addition dans ta tête, virgule sous virgule, puis touche le résultat.' : 'Pose la soustraction dans ta tête, virgule sous virgule, puis touche le résultat.',
    court: 'Touche le résultat.',
    stage: { type: 'equation', parts: [virgule(a), op, virgule(b), '=', null] },
    choices: textes(avecPieges(rng, virgule(r), pieges, 4)),
    answer: virgule(r),
    dire: op === '+' ? 'On ajoute les chiffres du même rang, sans oublier les retenues.' : 'On retire les chiffres du même rang ; s’il manque un chiffre, on écrit un zéro.',
  });
}

/** Multiplier par un nombre à deux chiffres : 34 × 26 = 34 × 6 + 34 × 20. */
function foisDeuxChiffres(rng) {
  const a = rng() < 0.7 ? randInt(rng, 13, 99) : randInt(rng, 102, 450);
  const b = randInt(rng, 2, 9) * 10 + randInt(rng, 2, 9);
  const u = b % 10;
  const d = b - u;
  const answer = a * b;
  // pièges : le deuxième produit pas décalé (34 × 2 au lieu de 34 × 20), un seul produit, 10 de trop
  const pieges = [a * u + a * (d / 10), a * d, a * u + a * d + 10 * a, answer + 100];
  return aToucher({
    key: `operations-cm:fois2:${a}x${b}`,
    consigne: 'Calcule cette multiplication posée : multiplie par les unités, puis par les dizaines.',
    court: 'Touche le résultat.',
    stage: { type: 'equation', parts: [ecrit(a), '×', b, '=', null] },
    choices: textes(avecPieges(rng, ecrit(answer), pieges.map(ecrit), 4)),
    answer: ecrit(answer),
    dire: `${dit(a)} fois ${b}, c’est ${dit(a)} fois ${u}, plus ${dit(a)} fois ${d}.`,
  });
}

/** Un décimal × un nombre entier : à un chiffre au CM1, à deux chiffres au CM2. */
function decimalFoisEntier(rng, deuxChiffres) {
  const a = decimal(rng, randInt(rng, 1, 2), 1, deuxChiffres ? 30 : 60);
  const b = deuxChiffres ? randInt(rng, 11, 48) : randInt(rng, 3, 9);
  const r = a * b;
  // pièges : la virgule mal placée, la partie entière seule multipliée
  const pieges = [r * 10, r / 10, Math.floor(a / 1000) * b * 1000 + (a % 1000), r + 1000]
    .filter((v) => Number.isInteger(v) && v > 0).map(virgule);
  return aToucher({
    key: `operations-cm:decimal:${a}x${b}`,
    consigne: 'Multiplie comme avec des nombres entiers, puis place la virgule.',
    court: 'Touche le résultat.',
    stage: { type: 'equation', parts: [virgule(a), '×', b, '=', null] },
    choices: textes(avecPieges(rng, virgule(r), pieges, 4)),
    answer: virgule(r),
    dire: 'Le résultat a autant de chiffres après la virgule que le nombre décimal.',
  });
}

const arrondir = (n) => {
  const p = 10 ** (String(n).length - 1);
  return Math.round(n / p) * p;
};

/** L'ordre de grandeur : 398 × 21, c'est à peu près 400 × 20 = 8 000. */
function ordreDeGrandeur(rng) {
  const kind = pick(rng, ['+', '×', '÷']);
  let parts;
  let approx;
  if (kind === '+') {
    const a = randInt(rng, 11, 89) * 100 + randInt(rng, -12, 12);
    const b = randInt(rng, 11, 89) * 100 + randInt(rng, -12, 12);
    parts = [ecrit(a), '+', ecrit(b)];
    approx = Math.round(a / 1000) * 1000 + Math.round(b / 1000) * 1000;
  } else if (kind === '×') {
    const a = randInt(rng, 2, 9) * 100 + randInt(rng, -4, 4);
    const b = randInt(rng, 2, 9) * 10 + randInt(rng, -1, 1);
    parts = [ecrit(a), '×', b];
    approx = arrondir(a) * arrondir(b);
  } else {
    const d = randInt(rng, 2, 9);
    const q = randInt(rng, 2, 9) * 1000;
    const a = q * d + randInt(rng, 1, 90);
    parts = [ecrit(a), '÷', d];
    approx = q;
  }
  if (approx <= 0) return ordreDeGrandeur(rng);
  return aToucher({
    key: `operations-cm:ordre:${parts.join('')}`,
    consigne: 'Quel est l’ordre de grandeur du résultat ? Arrondis les nombres, puis calcule de tête.',
    court: 'L’ordre de grandeur ?',
    stage: { type: 'equation', parts: [...parts, '≈', null] },
    choices: textes(avecPieges(rng, ecrit(approx), [ecrit(approx * 10), ecrit(approx / 10), ecrit(approx * 2)], 4)),
    answer: ecrit(approx),
    dire: 'Avec des nombres ronds, on trouve vite le résultat à peu près.',
  });
}

/** Une division à un chiffre : le dividende, le diviseur, le quotient et le reste. */
function divisionCm(rng) {
  const d = randInt(rng, 3, 9);
  // un quotient de 2, 3 ou 4 chiffres
  const q = pick(rng, [() => randInt(rng, 12, 99), () => randInt(rng, 100, 999), () => randInt(rng, 1000, 1999)])();
  const r = randInt(rng, 0, d - 1);
  return { d, q, r, n: q * d + r };
}

/** Combien de chiffres aura le quotient ? (on cherche par quoi il commence) */
function chiffresQuotient(rng) {
  const { d, q, n } = divisionCm(rng);
  const answer = String(q).length;
  return aToucher({
    key: `operations-cm:chiffres:${n}:${d}`,
    consigne: 'Combien de chiffres aura le quotient de cette division ?',
    court: 'Combien de chiffres ?',
    stage: { type: 'equation', parts: [ecrit(n), '÷', d] },
    choices: [1, 2, 3, 4].map((v) => ({ value: v, label: String(v) })),
    style: 'numbers',
    answer,
    dire: 'Si le premier chiffre est plus petit que le diviseur, on prend les deux premiers.',
  });
}

/** Le quotient et le reste : 785 ÷ 4 = 196, reste 1 (le reste est toujours plus petit que le diviseur). */
function quotientReste(rng) {
  const { d, q, r, n } = divisionCm(rng);
  const ecriture = (a, b) => `${ecrit(a)}, reste ${b}`;
  // pièges : un reste trop grand (q − 1, reste r + d), 10 de moins au quotient, un autre reste
  const pieges = [q > 1 ? ecriture(q - 1, r + d) : null, ecriture(q - 10, r), ecriture(q, (r + 1) % d), ecriture(q + 1, r)];
  return aToucher({
    key: `operations-cm:reste:${n}:${d}`,
    consigne: 'Quel est le quotient, et quel est le reste ?',
    court: 'Le quotient et le reste ?',
    stage: { type: 'equation', parts: [ecrit(n), '÷', d] },
    choices: textes(avecPieges(rng, ecriture(q, r), pieges, 4)),
    style: 'sentences',
    answer: ecriture(q, r),
    dire: 'Le reste est toujours plus petit que le diviseur.',
  });
}

/** CM2 : la division décimale (le reste se partage encore en dixièmes, en centièmes). */
function divisionDecimale(rng) {
  const d = pick(rng, [2, 4, 5, 8]);
  // un quotient avec 1 ou 2 chiffres après la virgule, qui tombe juste
  const q = randInt(rng, 11, 299) * 1000 + pick(rng, d === 8 ? [125, 250, 375, 500, 625, 750, 875] : d === 4 ? [250, 500, 750] : d === 5 ? [200, 400, 600, 800] : [500]);
  const n = (q * d) / 1000;
  if (!Number.isInteger(n)) return divisionDecimale(rng);
  // pièges : le reste écrit après la virgule (196,1), la virgule mal placée, une unité de trop
  const pieges = [`${ecrit(Math.floor(q / 1000))},${n % d}`, virgule(q * 10), Number.isInteger(q / 10) ? virgule(q / 10) : null, virgule(q + 1000)];
  return aToucher({
    key: `operations-cm:decimale:${n}:${d}`,
    consigne: 'Calcule la division jusqu’à ce qu’elle tombe juste : après les unités, on continue avec les dixièmes.',
    court: 'Touche le quotient.',
    stage: { type: 'equation', parts: [ecrit(n), '÷', d, '=', null] },
    choices: textes(avecPieges(rng, virgule(q), pieges, 4)),
    answer: virgule(q),
    dire: 'Le reste n’est pas écrit après la virgule : on le partage en dixièmes, puis en centièmes.',
  });
}

function questionOperations(level, rng) {
  switch (level) {
    case 1: return poserDecimaux(rng);
    case 2: return calculDecimaux(rng, '+');
    case 3: return calculDecimaux(rng, '−');
    case 4: return foisDeuxChiffres(rng);
    case 5: return decimalFoisEntier(rng, false);
    case 6: return ordreDeGrandeur(rng);
    case 7: return chiffresQuotient(rng);
    case 8: return quotientReste(rng);
    // CM2
    case 9: return divisionDecimale(rng);
    default: return decimalFoisEntier(rng, true);
  }
}

export const operationsCm = {
  id: 'operations-cm',
  domain: 'maths',
  section: CALCUL,
  title: 'Les opérations du CM',
  icon: '✖️',
  skill: 'Poser et calculer avec des décimaux, multiplier par un nombre à deux chiffres, estimer, diviser (quotient, reste, quotient décimal)',
  levels: [
    'Poser avec des décimaux', 'Additionner des décimaux', 'Soustraire des décimaux', 'Multiplier par 26, par 48…', 'Décimal × 6',
    'L’ordre de grandeur', 'Combien de chiffres au quotient ?', 'Quotient et reste', 'La division décimale', 'Décimal × 24',
  ],
  generate(level, rng) {
    return questionOperations(level, rng);
  },
};

// ================================================================ Les problèmes du CM

const PROBLEME = 'Lis le problème, puis tape la réponse.';
const PROBLEME_CHOIX = 'Lis le problème, puis touche la réponse.';

/**
 * Le texte d'un problème tel que la voix le lit (bouton 🔊) : « 1 924 » se dit « mille 924 » (et non
 * « 1 » puis « 924 »), « 12,50 € » se dit « 12 euros 50 ».
 */
export function ditTexte(texte) {
  return texte
    .replace(/(\d+),(\d{2}) €/g, (_, e, c) => `${e} euros${Number(c) ? ` ${Number(c)}` : ''}`)
    .replace(/\d{1,3}(?:[\u00a0\u202f ]\d{3})+/g, (n) => dit(Number(n.replace(/\D/g, ''))));
}

/** Un problème : le texte à l'écran, la réponse au pavé (nombre entier) ou à toucher (décimal, heure). */
function probleme(level, rng, { texte, reponse, choix = null, dire }) {
  const said = ditTexte(texte);
  const stage = { type: 'text', text: texte, ...(said !== texte ? { say: said } : {}) };
  const key = `problemes-cm:${level}:${texte}`;
  if (choix) {
    return aToucher({ key, consigne: PROBLEME_CHOIX, court: 'Touche la réponse.', stage, choices: textes(choix), answer: reponse, dire });
  }
  return aTaper({ key, consigne: PROBLEME, court: 'Tape la réponse.', stage, answer: reponse, dire });
}

/** Des écritures de prix : 12,50 € (toujours deux chiffres après la virgule). */
const euros = (centimes) => `${ecrit(Math.floor(centimes / 100))},${String(centimes % 100).padStart(2, '0')} €`;

// Le prénom de l'enfant n'est jamais repris par « il » ou « elle » : les problèmes conviennent à tous.
const PB_ADDITIFS = [
  (n, r) => {
    const a = randInt(r, 120, 480);
    const b = randInt(r, 120, 480);
    return { texte: `Au spectacle de l’école, il y a ${a} adultes et ${b} enfants. Combien de personnes y a-t-il en tout ?`, reponse: a + b, dire: `Il y a ${a + b} personnes en tout.` };
  },
  (n, r) => {
    const total = randInt(r, 1200, 3500);
    const vendus = randInt(r, 300, total - 200);
    return { texte: `Un cinéma a ${ecrit(total)} places. ${ecrit(vendus)} places sont déjà vendues. Combien de places reste-t-il ?`, reponse: total - vendus, dire: `Il reste ${dit(total - vendus)} places.` };
  },
  (n, r) => {
    const a = randInt(r, 1500, 4800);
    const plus = randInt(r, 150, 900);
    return { texte: `${n} a parcouru ${ecrit(a)} mètres à vélo. Son frère a parcouru ${plus} mètres de plus. Combien de mètres son frère a-t-il parcourus ?`, reponse: a + plus, dire: `Son frère a parcouru ${dit(a + plus)} mètres.` };
  },
  (n, r) => {
    const avion = randInt(r, 80, 110) * 100;
    const helico = randInt(r, 8, 30) * 100;
    return { texte: `Un avion vole à ${ecrit(avion)} mètres d’altitude, un hélicoptère à ${ecrit(helico)} mètres. Combien de mètres plus haut vole l’avion ?`, reponse: avion - helico, dire: `L’avion vole ${dit(avion - helico)} mètres plus haut.` };
  },
  (n, r) => {
    const avant = randInt(r, 2000, 6000);
    const apres = avant + randInt(r, 300, 2500);
    return { texte: `Une ville comptait ${ecrit(avant)} habitants. Aujourd’hui, elle en compte ${ecrit(apres)}. De combien d’habitants la ville a-t-elle grandi ?`, reponse: apres - avant, dire: `Elle a grandi de ${dit(apres - avant)} habitants.` };
  },
];

const PB_DEUX_ETAPES = [
  (n, r) => {
    const a = randInt(r, 50, 150);
    const b = randInt(r, 50, 150);
    const total = Math.ceil((a + b) / 10) * 10 + randInt(r, 2, 30) * 10;
    return { texte: `${n} a ${total} cartes, en donne ${a} à sa sœur et ${b} à son cousin. Combien de cartes reste-t-il à ${n} ?`, reponse: total - a - b, dire: `Il reste ${total - a - b} cartes.` };
  },
  (n, r) => {
    const lundi = randInt(r, 120, 400);
    const ecart = randInt(r, 20, 90);
    return { texte: `Lundi, la bibliothèque a prêté ${lundi} livres. Mardi, elle en a prêté ${ecart} de plus que lundi. Combien de livres a-t-elle prêtés en deux jours ?`, reponse: 2 * lundi + ecart, dire: `Elle a prêté ${2 * lundi + ecart} livres.` };
  },
  (n, r) => {
    const depart = randInt(r, 300, 800);
    const montee = randInt(r, 40, 120);
    const descente = randInt(r, 40, 120);
    return { texte: `Un train part avec ${depart} voyageurs. À la première gare, ${descente} voyageurs descendent et ${montee} montent. Combien y a-t-il de voyageurs dans le train ?`, reponse: depart - descente + montee, dire: `Il y a ${depart - descente + montee} voyageurs.` };
  },
  (n, r) => {
    const budget = randInt(r, 50, 90) * 10;
    const velo = randInt(r, 18, 35) * 10;
    const casque = randInt(r, 3, 8) * 10;
    return { texte: `${n} a économisé ${budget} euros, puis achète un vélo à ${velo} euros et un casque à ${casque} euros. Combien d’euros reste-t-il ?`, reponse: budget - velo - casque, dire: `Il reste ${budget - velo - casque} euros.` };
  },
];

const PB_MULTIPLIER = [
  (n, r) => {
    const rangs = randInt(r, 12, 35);
    const places = randInt(r, 14, 28);
    return { texte: `Une salle de spectacle a ${rangs} rangées de ${places} fauteuils. Combien y a-t-il de fauteuils ?`, reponse: rangs * places, dire: `Il y a ${dit(rangs * places)} fauteuils.` };
  },
  (n, r) => {
    const prix = randInt(r, 12, 45);
    const nb = randInt(r, 12, 30);
    return { texte: `L’école achète ${nb} dictionnaires à ${prix} euros l’un. Combien l’école paie-t-elle ?`, reponse: prix * nb, dire: `L’école paie ${dit(prix * nb)} euros.` };
  },
  (n, r) => {
    const pages = randInt(r, 120, 320);
    const nb = randInt(r, 3, 9);
    return { texte: `${n} lit ${nb} livres de ${pages} pages chacun. Combien de pages cela fait-il en tout ?`, reponse: pages * nb, dire: `Cela fait ${dit(pages * nb)} pages.` };
  },
  (n, r) => {
    const boites = randInt(r, 15, 40);
    const oeufs = pick(r, [6, 12]);
    return { texte: `Un fermier remplit ${boites} boîtes de ${oeufs} œufs. Combien d’œufs a-t-il rangés ?`, reponse: boites * oeufs, dire: `Il a rangé ${boites * oeufs} œufs.` };
  },
];

const PB_FOIS = [
  (n, r) => {
    const a = randInt(r, 12, 60);
    const k = randInt(r, 3, 6);
    return { texte: `${n} a ${a} billes. Sa cousine en a ${k} fois plus. Combien de billes a sa cousine ?`, reponse: a * k, dire: `Sa cousine a ${a * k} billes.` };
  },
  (n, r) => {
    const k = randInt(r, 3, 8);
    const petit = randInt(r, 12, 40);
    return { texte: `Une camionnette transporte ${petit} caisses. Un camion en transporte ${k} fois plus. Combien de caisses transporte le camion ?`, reponse: petit * k, dire: `Le camion transporte ${petit * k} caisses.` };
  },
  (n, r) => {
    const k = randInt(r, 2, 5);
    const petit = randInt(r, 15, 90);
    return { texte: `Un pull coûte ${petit * k} euros. Un tee-shirt coûte ${k} fois moins cher. Combien coûte le tee-shirt ?`, reponse: petit, dire: `Le tee-shirt coûte ${petit} euros.` };
  },
  (n, r) => {
    const k = pick(r, [3, 5, 6, 10, 11]);
    return { texte: `La tour Eiffel mesure environ 330 mètres. Un immeuble est ${k} fois moins haut. Combien de mètres mesure l’immeuble ?`, reponse: 330 / k, dire: `L’immeuble mesure ${330 / k} mètres.` };
  },
];

const PB_PARTAGE = [
  (n, r) => {
    const parVoiture = 4;
    const personnes = randInt(r, 21, 58);
    const voitures = Math.ceil(personnes / parVoiture);
    return { texte: `${personnes} personnes partent en sortie. Chaque voiture transporte ${parVoiture} personnes. Combien faut-il de voitures pour que tout le monde parte ?`, reponse: voitures, dire: `Il faut ${voitures} voitures : la dernière n’est pas pleine.` };
  },
  (n, r) => {
    const parBoite = pick(r, [6, 8, 12]);
    const oeufs = randInt(r, 50, 200);
    const pleines = Math.floor(oeufs / parBoite);
    const reste = oeufs % parBoite;
    return {
      texte: `Un fermier range ${oeufs} œufs dans des boîtes de ${parBoite}. Combien de boîtes peut-il remplir complètement ?`,
      reponse: pleines,
      dire: reste ? `Il remplit ${pleines} boîtes, et il reste ${reste} œuf${reste > 1 ? 's' : ''}.` : `Il remplit ${pleines} boîtes, sans reste.`,
    };
  },
  (n, r) => {
    const enfants = randInt(r, 4, 9);
    const part = randInt(r, 12, 45);
    return { texte: `${n} et ses amis sont ${enfants} en tout. Ils se partagent équitablement ${enfants * part} images. Combien d’images chacun reçoit-il ?`, reponse: part, dire: `Chacun reçoit ${part} images.` };
  },
  (n, r) => {
    const table = pick(r, [6, 8, 10]);
    const invites = randInt(r, 40, 130);
    const tables = Math.ceil(invites / table);
    return { texte: `Pour une fête, ${invites} invités s’assoient à des tables de ${table} places. Combien de tables faut-il au minimum ?`, reponse: tables, dire: `Il faut ${tables} tables.` };
  },
];

/** Prix en euros et centimes : les réponses sont à toucher. */
function problemePrix(rng, name) {
  const kind = pick(rng, ['rendre', 'total', 'fois']);
  if (kind === 'rendre') {
    const prix = randInt(rng, 3, 17) * 100 + randInt(rng, 1, 19) * 5;
    const billet = prix < 1000 ? 1000 : 2000;
    const r = billet - prix;
    return {
      texte: `${name} achète un livre à ${euros(prix)} et donne un billet de ${billet / 100} euros. Combien d’argent doit-on rendre ?`,
      reponse: euros(r), choix: avecPieges(rng, euros(r), [r + 100, r - 100, r + 10, r - 5].filter((v) => v > 0).map(euros), 4),
      dire: 'On calcule ce qui manque pour aller du prix jusqu’au billet.',
    };
  }
  if (kind === 'total') {
    const a = randInt(rng, 1, 9) * 100 + randInt(rng, 1, 19) * 5;
    const b = randInt(rng, 1, 9) * 100 + randInt(rng, 1, 19) * 5;
    const r = a + b;
    // piège : la retenue des centimes oubliée
    const sansRetenueCentimes = Math.floor(a / 100) * 100 + Math.floor(b / 100) * 100 + (((a % 100) + (b % 100)) % 100);
    return {
      texte: `Au marché, ${name} achète des fraises à ${euros(a)} et du fromage à ${euros(b)}. Combien cela coûte-t-il en tout ?`,
      reponse: euros(r), choix: avecPieges(rng, euros(r), [sansRetenueCentimes, r + 100, r - 10, r + 10].filter((v) => v !== r).map(euros), 4),
      dire: 'On ajoute les centimes avec les centimes, puis les euros avec les euros.',
    };
  }
  const prix = randInt(rng, 1, 6) * 100 + pick(rng, [25, 50, 75]);
  const nb = randInt(rng, 3, 8);
  const r = prix * nb;
  return {
    texte: `Une place de cinéma coûte ${euros(prix)}. Combien coûtent ${nb} places ?`,
    reponse: euros(r), choix: avecPieges(rng, euros(r), [r + prix, r - prix, Math.floor(prix / 100) * nb * 100 + (prix % 100), r * 10].map(euros), 4),
    dire: 'On multiplie le prix d’une place par le nombre de places.',
  };
}

// Proportionnalité par linéarité (« 3 fois plus de cahiers, 3 fois plus cher »), sans tableau.
const PB_PROPORTION = [
  (n, r) => {
    const a = randInt(r, 2, 5);
    const pa = a * randInt(r, 2, 6);
    const k = randInt(r, 2, 4);
    return { texte: `${a} cahiers coûtent ${pa} euros. Combien coûtent ${a * k} cahiers ?`, reponse: pa * k, dire: `${k} fois plus de cahiers, c’est ${k} fois plus cher : ${pa * k} euros.` };
  },
  (n, r) => {
    const farine = randInt(r, 10, 25) * 10;
    const k = randInt(r, 2, 3);
    return { texte: `Pour un gâteau, il faut 3 œufs et ${farine} grammes de farine. ${n} utilise ${3 * k} œufs. Combien de grammes de farine faut-il ?`, reponse: farine * k, dire: `${k} fois plus d’œufs, ${k} fois plus de farine : ${farine * k} grammes.` };
  },
  (n, r) => {
    const [a, b] = sample(r, [2, 3, 4, 5], 2);
    const prix = randInt(r, 3, 9);
    return { texte: `${a} kilos de pommes coûtent ${a * prix} euros, et ${b} kilos coûtent ${b * prix} euros. Combien coûtent ${a + b} kilos de pommes ?`, reponse: (a + b) * prix, dire: `On ajoute les deux prix : ${(a + b) * prix} euros.` };
  },
  (n, r) => {
    const tours = randInt(r, 2, 4);
    const temps = tours * randInt(r, 3, 6);
    const k = randInt(r, 2, 3);
    return { texte: `${n} fait ${tours} tours de piste en ${temps} minutes. À la même allure, combien de minutes faut-il pour faire ${tours * k} tours ?`, reponse: temps * k, dire: `${k} fois plus de tours, ${k} fois plus de temps : ${temps * k} minutes.` };
  },
];

const PB_FRACTIONS = [
  (n, r) => {
    const d = pick(r, [3, 4, 5]);
    const total = d * randInt(r, 5, 9);
    const nom = { 3: 'Un tiers', 4: 'Un quart', 5: 'Un cinquième' }[d];
    return { texte: `Dans l’école, ${total} élèves vont à la piscine. ${nom} d’entre eux nagent déjà sans bouée. Combien d’élèves nagent sans bouée ?`, reponse: total / d, dire: `${nom} de ${total}, c’est ${total / d}.` };
  },
  (n, r) => {
    const longueur = pick(r, [100, 200, 400]);
    const d = pick(r, [2, 4, 5]);
    const nom = { 2: 'la moitié', 4: 'le quart', 5: 'le cinquième' }[d];
    return { texte: `Une piste mesure ${longueur} mètres. ${n} a déjà couru ${nom} de la piste. Combien de mètres cela fait-il ?`, reponse: longueur / d, dire: `${nom[0].toUpperCase()}${nom.slice(1)} de ${longueur} mètres, c’est ${longueur / d} mètres.` };
  },
  (n, r) => {
    const d = pick(r, [2, 3, 4, 10]);
    const part = randInt(r, 3, 12);
    const nom = { 2: 'la moitié', 3: 'le tiers', 4: 'le quart', 10: 'le dixième' }[d];
    return { texte: `${n} a ${d * part} euros et en dépense ${nom}. Combien d’euros ont été dépensés ?`, reponse: part, dire: `${nom[0].toUpperCase()}${nom.slice(1)} de ${d * part}, c’est ${part}.` };
  },
];

const heureEcrite = (min) => `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;

/** Durées et horaires : à quelle heure ? combien de temps ? */
function problemeDuree(rng, name) {
  const debut = randInt(rng, 8, 16) * 60 + randInt(rng, 1, 11) * 5;
  const duree = randInt(rng, 1, 2) * 60 + randInt(rng, 1, 11) * 5;
  const fin = debut + duree;
  if (rng() < 0.5) {
    // piège : 60 minutes comptées comme 100 (14 h 35 + 1 h 50 = 15 h 85 → 16 h 25 ; erreur 16 h 65 → 17 h 05…)
    const pieges = [fin + 60, fin - 60, fin + 40, fin - 40].filter((v) => v > debut && v !== fin).map(heureEcrite);
    return {
      texte: `Le film commence à ${heureEcrite(debut)} et dure ${heureEcrite(duree)}. À quelle heure finit-il ?`,
      reponse: heureEcrite(fin), choix: avecPieges(rng, heureEcrite(fin), pieges, 4), dire: 'On ajoute les heures, puis les minutes ; 60 minutes font une heure.',
    };
  }
  const pieges = [duree + 60, duree - 10, duree + 40, duree - 60].filter((v) => v > 0 && v !== duree).map(heureEcrite);
  return {
    texte: `${name} part de la maison à ${heureEcrite(debut)} et arrive chez sa grand-mère à ${heureEcrite(fin)}. Combien de temps a duré le voyage ?`,
    reponse: heureEcrite(duree), choix: avecPieges(rng, heureEcrite(duree), pieges, 4), dire: 'On compte jusqu’à l’heure pile, puis les heures, puis les minutes qui restent.',
  };
}

/** Plusieurs étapes, ou un programme de calcul (« choisis 7, multiplie par 3, ajoute 5 »). */
function problemeEtapes(rng, name) {
  if (rng() < 0.4) {
    const x = randInt(rng, 3, 12);
    const m = randInt(rng, 2, 6);
    const sous = rng() < 0.5;
    const a = sous ? randInt(rng, 1, x * m - 1) : randInt(rng, 3, 20);
    const r = sous ? x * m - a : x * m + a;
    return {
      texte: `Voici un programme de calcul. Choisis le nombre ${x}. Multiplie-le par ${m}. ${sous ? `Retire ${a}.` : `Ajoute ${a}.`} Quel nombre obtiens-tu ?`,
      reponse: r, dire: `On obtient ${r}.`,
    };
  }
  const paquets = randInt(rng, 4, 9);
  const parPaquet = randInt(rng, 6, 12);
  const mange = randInt(rng, 5, 15);
  const enfants = pick(rng, [2, 3, 4, 5]);
  const reste = paquets * parPaquet - mange;
  if (reste % enfants) return problemeEtapes(rng, name);
  return {
    texte: `${name} achète ${paquets} paquets de ${parPaquet} biscuits et en mange ${mange}. Le reste est partagé équitablement entre ${enfants} amis. Combien de biscuits chaque ami reçoit-il ?`,
    reponse: reste / enfants, dire: `Il reste ${reste} biscuits, soit ${reste / enfants} pour chacun.`,
  };
}

function questionProblemes(level, rng, name) {
  const banque = { 1: PB_ADDITIFS, 2: PB_DEUX_ETAPES, 3: PB_MULTIPLIER, 4: PB_FOIS, 5: PB_PARTAGE, 7: PB_PROPORTION, 8: PB_FRACTIONS }[level];
  if (banque) return probleme(level, rng, pick(rng, banque)(name, rng));
  if (level === 6) return probleme(level, rng, problemePrix(rng, name));
  if (level === 9) return probleme(level, rng, problemeDuree(rng, name));
  return probleme(level, rng, problemeEtapes(rng, name));
}

export const problemesCm = {
  id: 'problemes-cm',
  domain: 'maths',
  section: CALCUL,
  title: 'Les problèmes du CM',
  icon: '🧠',
  skill: 'Résoudre des problèmes en une ou plusieurs étapes : additifs, multiplicatifs, partage, prix, proportionnalité, fractions, durées',
  levels: [
    'Ajouter ou retirer', 'En deux étapes', 'Multiplier', 'Fois plus, fois moins', 'Partager, grouper',
    'Les prix', 'Proportionnalité', 'Avec des fractions', 'Durées et horaires', 'Plusieurs étapes',
  ],
  generate(level, rng, index = 0, context = {}) {
    return questionProblemes(level, rng, context.name || 'Lou');
  },
};

export const CM_OPERATIONS_GAMES = [operationsCm, problemesCm];
