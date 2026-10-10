// Nombres et calcul du cours moyen (programme de mathématiques du cycle 3, 2025) :
//  - « Les très grands nombres » : jusqu'à 999 999 au CM1, jusqu'à 999 999 999 au CM2 (le milliard
//    est en 6e) ; multiples de 2, 5 et 10, diviseurs jusqu'à 10 (CM1) ; tous les diviseurs d'un nombre
//    jusqu'à 30, diviseurs et multiples communs (CM2) ;
//  - « Les nombres décimaux » : dixièmes et centièmes (CM1), millièmes (CM2) ; fractions décimales et
//    écriture à virgule, droite graduée, comparer, ranger, encadrer, partie entière, arrondi à l'unité ;
//    × et ÷ par 10 (CM1), par 100 et 1 000 (CM2) ;
//  - « Les fractions du CM » : dénominateurs jusqu'à 20 ; fractions plus grandes que 1, droite
//    graduée, encadrer, comparer, additionner, fraction unitaire d'une quantité (CM1), non unitaire et
//    entier × fraction (CM2), fractions usuelles et écritures décimales ;
//  - « Calcul mental du CM » : ± 8, 9, 18, 19…, × 10, 100, 1 000, × 4, × 8, × 5, tables, dizaines et
//    centaines, compléments, décimaux, doubles et moitiés (CM2), égalités à trou et parenthèses.
// Les nombres s'écrivent avec une espace fine (345 678). Les consignes dites sont des phrases fixes
// (enregistrées d'un seul son) ; quelques félicitations relisent un nombre, en morceaux que la voix
// connaît (« 345 mille 678 », « 3 virgule 0 5 »).

import { pick, randInt, sample, shuffle } from '../random.js';
import { dit, ecrit, enLettres, withTraps } from './ce2.js';
import { readChoices } from './nombres-plus.js';

const CALCUL = 'Nombres et calcul';
const SANS_MAX = 1e12;

const cap = (text) => text[0].toUpperCase() + text.slice(1);
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

/** Une question à toucher : consigne fixe, scène, réponses ; `dire` : ce que la voix ajoute au bravo. */
function aToucher({ key, consigne, court, stage, choices, style = 'numbers', answer, dire }) {
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

/** Une question au pavé numérique : l'égalité et sa case à remplir. */
function aTaper({ key, consigne, court = 'Tape le résultat.', parts, answer, dire }) {
  return {
    key,
    text: consigne,
    instruction: consigne,
    short: { key: `${key.split(':')[0]}:${consigne}`, text: court },
    stage: { type: 'equation', parts },
    interaction: 'keypad',
    choices: [],
    maxDigits: String(answer).length + 1,
    answer,
    ...(dire ? { success: { speak: dire } } : {}),
  };
}

/** Des nombres entiers à toucher, écrits avec leurs espaces (« 345 678 »). */
const entiers = (values) => values.map((v) => ({ value: v, label: ecrit(v) }));
/** Des réponses écrites (« 3 et 4 », « 2,45 ») : la valeur est l'écriture elle-même. */
const textes = (labels) => labels.map((label) => ({ value: label, label }));

/** `count` écritures distinctes : la bonne, puis les pièges dans l'ordre (le tout mélangé). */
function avecPieges(rng, bonne, pieges, count) {
  const out = [bonne];
  for (const p of pieges) if (out.length < count && p !== null && p !== undefined && p !== '' && !out.includes(p)) out.push(p);
  return shuffle(rng, out);
}

// ================================================================ Les très grands nombres

const RANGS = [
  'unités', 'dizaines', 'centaines', 'unités de mille', 'dizaines de mille', 'centaines de mille',
  'unités de millions', 'dizaines de millions', 'centaines de millions',
];
const chiffreDe = (n, rang) => Math.floor(n / 10 ** rang) % 10;

/** Un nombre de `taille` chiffres ; un chiffre sur quatre est un zéro (les nombres les plus piégeux). */
function grandNombre(rng, taille) {
  const d = [randInt(rng, 1, 9), ...Array.from({ length: taille - 1 }, () => (rng() < 0.25 ? 0 : randInt(rng, 1, 9)))];
  return Number(d.join(''));
}

/** Deux chiffres échangés (rangs i et j, à partir des unités). */
function echange(n, i, j) {
  const d = String(n).split('').reverse();
  [d[i], d[j]] = [d[j], d[i]];
  return Number(d.reverse().join(''));
}

/** Des nombres qui ressemblent à n (même nombre de chiffres) : deux chiffres voisins échangés, un chiffre changé. */
function voisins(rng, n) {
  const taille = String(n).length;
  const out = [];
  for (let i = 0; i < taille - 1; i++) out.push(echange(n, i, i + 1));
  for (let i = 1; i < taille - 1; i++) out.push(chiffreDe(n, i) < 9 ? n + 10 ** i : n - 10 ** i);
  return [...new Set(shuffle(rng, out))].filter((v) => v !== n && String(v).length === taille);
}

/** Lire et écrire : des lettres aux chiffres, ou des chiffres aux lettres. */
function lireEcrire(rng, taille) {
  const x = grandNombre(rng, taille);
  if (rng() < 0.5) {
    const values = shuffle(rng, [x, ...voisins(rng, x).slice(0, 3)]);
    return aToucher({
      key: `nombres-cm:lettres:${x}`,
      consigne: 'Lis le nombre écrit en lettres, puis touche le même nombre écrit en chiffres.',
      court: 'Touche ce nombre écrit en chiffres.',
      stage: { type: 'sentence', text: enLettres(x) },
      choices: entiers(values), style: 'words', answer: x,
      dire: `C’est ${dit(x)}.`,
    });
  }
  // trois réponses seulement : elles sont longues
  const values = shuffle(rng, [x, ...voisins(rng, x).slice(0, 2)]);
  return aToucher({
    key: `nombres-cm:chiffres:${x}`,
    consigne: 'Lis ce nombre, puis touche le même nombre écrit en lettres.',
    court: 'Touche ce nombre écrit en lettres.',
    stage: { type: 'equation', parts: [ecrit(x)] },
    choices: values.map((v) => ({ value: v, label: enLettres(v) })), style: 'sentences', answer: x,
    dire: `C’est ${dit(x)}.`,
  });
}

/** La valeur d'un chiffre : le chiffre des dizaines de mille de 345 678 ? */
function chiffreDuRang(rng, taille) {
  const x = grandNombre(rng, taille);
  const rang = randInt(rng, 1, taille - 1);
  const answer = chiffreDe(x, rang);
  const values = withTraps(rng, answer, [chiffreDe(x, rang - 1), chiffreDe(x, rang + 1), rang >= 2 ? chiffreDe(x, rang - 2) : 9 - answer], 4, { min: 0, max: 9 });
  return aToucher({
    key: `nombres-cm:chiffre:${x}:${rang}`,
    consigne: `Quel est le chiffre des ${RANGS[rang]} de ce nombre ?`,
    stage: { type: 'equation', parts: [ecrit(x)] },
    choices: entiers(values), answer,
  });
}

const PAQUETS = [['dizaines', 1, 'dizaines'], ['centaines', 2, 'centaines'], ['milliers', 3, 'unités de mille']];

/** Combien de centaines en tout dans 345 678 ? (3 456 : pas le chiffre des centaines, 6) */
function combienEnTout(rng, taille) {
  const x = grandNombre(rng, taille);
  const [nom, rang, colonne] = pick(rng, PAQUETS);
  const answer = Math.floor(x / 10 ** rang);
  const pieges = [chiffreDe(x, rang), Math.floor(x / 10 ** (rang + 1)), Math.floor(x / 10 ** (rang - 1)), answer + 1, answer - 1];
  const values = withTraps(rng, answer, pieges, 4, { max: SANS_MAX });
  return aToucher({
    key: `nombres-cm:combien:${x}:${rang}`,
    consigne: `Combien y a-t-il de ${nom} en tout dans ce nombre ?`,
    court: `Combien de ${nom} en tout ?`,
    stage: { type: 'equation', parts: [ecrit(x)] },
    choices: entiers(values), style: 'words', answer,
    dire: `On lit tous les chiffres, jusqu’à celui des ${colonne}.`,
  });
}

/** Le plus grand (ou le plus petit) de quatre nombres qui se ressemblent. */
function comparerEntiers(rng, taille) {
  const x = grandNombre(rng, taille);
  // les mêmes chiffres dans un autre ordre, un chiffre changé, et parfois un chiffre de moins
  const values = [x, ...voisins(rng, x).slice(0, rng() < 0.3 ? 2 : 3)];
  if (values.length < 4) values.push(Math.floor(x / 10));
  const plusPetit = rng() < 0.5;
  return aToucher({
    key: `nombres-cm:comparer:${values.join(',')}:${plusPetit ? 'petit' : 'grand'}`,
    consigne: plusPetit ? 'Touche le nombre le plus petit.' : 'Touche le nombre le plus grand.',
    stage: { type: 'none' },
    choices: entiers(shuffle(rng, values)), style: 'words',
    answer: plusPetit ? Math.min(...values) : Math.max(...values),
  });
}

/** La droite graduée de 1 000 en 1 000 (ou de 100 000 en 100 000) : quel nombre montre la flèche ? */
function droiteGrandsNombres(rng, taille) {
  const pas = taille >= 7 ? 100000 : 1000;
  const debut = randInt(rng, 1, 89) * 10;
  const ticks = range(debut, debut + 10);
  const n = debut + pick(rng, [1, 2, 3, 4, 6, 7, 8, 9]);
  const texts = Object.fromEntries(ticks.map((v) => [v, ecrit(v * pas)]));
  const stage = { type: 'numberline', min: debut, max: debut + 10, ticks, labels: [debut, debut + 10], major: [debut + 5], snap: 1, texts, mark: n };
  return aToucher({
    key: `nombres-cm:droite:${n * pas}`,
    consigne: 'Quel nombre montre la flèche ? Aide-toi des nombres écrits sur la droite.',
    court: 'Quel nombre montre la flèche ?',
    stage,
    choices: readChoices(rng, stage, n, 4).map((v) => ({ value: v * pas, label: ecrit(v * pas) })), style: 'words',
    answer: n * pas,
  });
}

/** Encadrer entre deux milliers (ou dizaines de mille…) qui se suivent ; une fois sur deux, la droite graduée. */
function encadrer(rng, taille, index) {
  if (index % 2 === 1) return droiteGrandsNombres(rng, taille);
  const rang = taille >= 7 ? pick(rng, [5, 6]) : pick(rng, [3, 4]);
  const pas = 10 ** rang;
  let x;
  do x = grandNombre(rng, taille); while (x % pas === 0);
  const bas = Math.floor(x / pas) * pas;
  const paire = (a) => `${ecrit(a)} et ${ecrit(a + pas)}`;
  const nom = { 3: 'quels milliers', 4: 'quelles dizaines de mille', 5: 'quelles centaines de mille', 6: 'quels millions' }[rang];
  return aToucher({
    key: `nombres-cm:encadrer:${x}:${rang}`,
    consigne: `Entre ${nom} se trouve ce nombre ?`,
    court: `Entre ${nom} ?`,
    stage: { type: 'equation', parts: [ecrit(x)] },
    choices: textes(avecPieges(rng, paire(bas), [paire(bas + pas), bas >= pas ? paire(bas - pas) : paire(bas + 2 * pas)], 3)),
    style: 'sentences', answer: paire(bas),
  });
}

/** CM1 : les multiples de 2, 5 et 10 ; un nombre jusqu'à 10 est-il un diviseur ? */
function multiplesDiviseurs(rng) {
  if (rng() < 0.5) {
    const d = pick(rng, [2, 5, 10]);
    const ok = randInt(rng, 12, 199) * d;
    const faux = shuffle(rng, [ok + 1, ok + 3, ok - 1, ok + (d === 2 ? 5 : 2)]).filter((v) => v % d !== 0).slice(0, 2);
    return aToucher({
      key: `nombres-cm:multiple:${ok}:${d}`,
      consigne: `Lequel de ces nombres est un multiple de ${d} ?`,
      court: `Un multiple de ${d} ?`,
      stage: { type: 'none' },
      choices: entiers(shuffle(rng, [ok, ...faux])), answer: ok,
      dire: { 2: 'Un multiple de 2 finit par 0, 2, 4, 6 ou 8.', 5: 'Un multiple de 5 finit par 0 ou par 5.', 10: 'Un multiple de 10 finit par 0.' }[d],
    });
  }
  const d = randInt(rng, 3, 9);
  const oui = rng() < 0.5;
  const nb = d * randInt(rng, 4, 12) + (oui ? 0 : randInt(rng, 1, d - 1));
  return aToucher({
    key: `nombres-cm:diviseur:${d}:${nb}`,
    consigne: 'Lis la question, puis réponds par oui ou par non.',
    court: 'Oui ou non ?',
    stage: { type: 'sentence', text: `${d} est-il un diviseur de ${nb} ?` },
    choices: textes(['oui', 'non']), style: 'words', answer: oui ? 'oui' : 'non',
    dire: oui ? 'Oui : la division tombe juste, sans reste.' : 'Non : la division a un reste.',
  });
}

const diviseursDe = (n) => range(1, n).filter((d) => n % d === 0);

/** CM2 : tous les diviseurs d'un nombre jusqu'à 30, diviseurs communs, multiples communs (moins de 15). */
function diviseursCommuns(rng) {
  const kind = pick(rng, ['tous', 'communs', 'multiples']);
  if (kind === 'tous') {
    const nb = pick(rng, [12, 15, 16, 18, 20, 21, 24, 27, 28, 30]);
    const ok = diviseursDe(nb);
    const liste = (l) => l.join(', ');
    const sansUn = ok.filter((v) => v !== 1);
    const manque = ok.filter((v, i) => i !== Math.floor(ok.length / 2));
    const intrus = range(2, 9).find((v) => nb % v !== 0);
    const enTrop = [...ok, intrus].sort((a, b) => a - b);
    return aToucher({
      key: `nombres-cm:diviseurs:${nb}`,
      consigne: 'Quelle liste donne tous les diviseurs de ce nombre ?',
      court: 'Tous les diviseurs ?',
      stage: { type: 'equation', parts: [String(nb)] },
      choices: textes(avecPieges(rng, liste(ok), [liste(manque), liste(enTrop), liste(sansUn)], 3)), style: 'sentences', answer: liste(ok),
    });
  }
  if (kind === 'communs') {
    const [a, b] = pick(rng, [[12, 18], [12, 30], [16, 24], [18, 24], [20, 30], [15, 25], [24, 30], [14, 21], [18, 27], [20, 28]]);
    const communs = range(2, 9).filter((d) => a % d === 0 && b % d === 0);
    const answer = pick(rng, communs);
    // pièges : des diviseurs d'un seul des deux nombres, puis d'aucun
    const unSeul = shuffle(rng, range(2, 9).filter((d) => (a % d === 0) !== (b % d === 0)));
    const aucun = shuffle(rng, range(2, 9).filter((d) => a % d && b % d));
    const values = shuffle(rng, [answer, ...[...unSeul, ...aucun].slice(0, 3)]);
    return aToucher({
      key: `nombres-cm:diviseur-commun:${a}:${b}:${answer}`,
      consigne: 'Quel nombre divise les deux nombres à la fois ?',
      court: 'Un diviseur des deux nombres ?',
      stage: { type: 'equation', parts: [String(a), 'et', String(b)] },
      choices: entiers(values), answer,
    });
  }
  const [a, b] = pick(rng, [[4, 6], [6, 8], [3, 4], [6, 9], [4, 10], [8, 12], [5, 6], [9, 12], [6, 10], [10, 12], [3, 5], [4, 14]]);
  let ppcm = a;
  while (ppcm % b) ppcm += a;
  // pièges : des multiples d'un seul des deux nombres (un multiple commun plus grand serait juste aussi)
  const faux = [ppcm + a, ppcm - b, a + b, ppcm + b, ppcm - a].filter((v) => v > 0 && (v % a || v % b));
  const values = withTraps(rng, ppcm, faux, 4, { min: 2, max: ppcm * 2 - 1 }).filter((v) => v === ppcm || v % a || v % b);
  return aToucher({
    key: `nombres-cm:multiple-commun:${a}:${b}`,
    consigne: 'Quel nombre est un multiple des deux nombres à la fois ?',
    court: 'Un multiple des deux nombres ?',
    stage: { type: 'equation', parts: [String(a), 'et', String(b)] },
    choices: entiers(values), answer: ppcm,
  });
}

function questionGrandsNombres(level, rng, index) {
  // CM1 : jusqu'à 999 999 (niveaux 1 à 6) ; CM2 : les millions (niveaux 7 à 10)
  const taille = level >= 7 ? randInt(rng, 7, 9) : randInt(rng, 5, 6);
  switch (level) {
    case 1: case 7: return lireEcrire(rng, taille);
    case 2: return chiffreDuRang(rng, taille);
    case 3: return combienEnTout(rng, taille);
    case 4: return comparerEntiers(rng, taille);
    case 5: return encadrer(rng, taille, index);
    case 6: return multiplesDiviseurs(rng);
    case 8: return [comparerEntiers, chiffreDuRang, combienEnTout, encadrer][index % 4](rng, taille, index >> 2);
    case 9: return diviseursCommuns(rng);
    default: return pick(rng, [lireEcrire, chiffreDuRang, combienEnTout, comparerEntiers, encadrer])(rng, taille, index);
  }
}

export const nombresCm = {
  id: 'nombres-cm',
  domain: 'maths',
  section: CALCUL,
  title: 'Les très grands nombres',
  icon: '🔭',
  skill: 'Lire, écrire, décomposer, comparer et encadrer les nombres jusqu’à 999 999, puis jusqu’aux centaines de millions ; multiples et diviseurs',
  levels: [
    'Lire et écrire jusqu’à 999 999', 'La valeur d’un chiffre', 'Combien de… en tout ?', 'Comparer', 'Encadrer, la droite graduée',
    'Multiples et diviseurs', 'Lire et écrire les millions', 'Les millions', 'Diviseurs et multiples communs', 'Grand mélange',
  ],
  generate(level, rng, index = 0) {
    return questionGrandsNombres(level, rng, index);
  },
};

// ================================================================ Les nombres décimaux

// Un décimal est un nombre entier de millièmes (2,05 → 2050) : pas d'erreur d'arrondi.

/** 2050 → « 2,05 » (sans zéro inutile à la fin). */
export function virgule(milli) {
  const ent = Math.floor(milli / 1000);
  const dec = String(milli % 1000).padStart(3, '0').replace(/0+$/, '');
  return `${ecrit(ent)}${dec ? `,${dec}` : ''}`;
}

/** 2050 → « 2 virgule 0 5 » : ce que dit la voix (les zéros après la virgule sont dits). */
export function ditVirgule(milli) {
  const ent = Math.floor(milli / 1000);
  const dec = String(milli % 1000).padStart(3, '0').replace(/0+$/, '');
  if (!dec) return dit(ent);
  const zeros = dec.match(/^0*/)[0].length;
  const reste = dec.length > zeros ? [String(Number(dec.slice(zeros)))] : [];
  return [dit(ent), 'virgule', ...Array(zeros).fill('0'), ...reste].join(' ');
}

const choixVirgule = (values) => values.map((v) => ({ value: v, label: virgule(v) }));

/** Un décimal : `places` chiffres après la virgule, le dernier jamais nul (2,45 ; 0,7 ; 13,105). */
function decimal(rng, places, entMin = 0, entMax = 99) {
  let dec = randInt(rng, 1, 10 ** places - 1);
  if (dec % 10 === 0) dec += 1;
  return randInt(rng, entMin, entMax) * 1000 + dec * 10 ** (3 - places);
}

/** Fraction décimale et écriture à virgule : 7/10 = 0,7 ; 35 + 7/10 + 8/100 = 35,78 ; 45/1000 = 0,045. */
function fractionDecimale(rng, places) {
  const den = 10 ** places;
  const pasDen = 1000 / den;
  const ent = rng() < 0.4 ? 0 : randInt(rng, 1, places === 1 ? 9 : 40);
  // CM1 : 35 + 7/10 + 8/100 (une fraction par rang)
  if (places === 2 && ent && rng() < 0.5) {
    const d = randInt(rng, 1, 9);
    const c = randInt(rng, 1, 9);
    const x = ent * 1000 + d * 100 + c * 10;
    return aToucher({
      key: `decimaux:decomposer:${x}`,
      consigne: 'Quelle est l’écriture à virgule de ce nombre ?',
      court: 'L’écriture à virgule ?',
      stage: { type: 'equation', parts: [ent, '+', frac(d, 10), '+', frac(c, 100)] },
      choices: choixVirgule(avecPieges(rng, x, [ent * 1000 + c * 100 + d * 10, ent * 1000 + d * 10 + c, ent * 100 + d * 10 + c], 4)),
      style: 'words', answer: x, dire: `C’est ${ditVirgule(x)}.`,
    });
  }
  const num = randInt(rng, 1, den - 1);
  const x = ent * 1000 + num * pasDen;
  // de l'écriture à virgule à la fraction, une fois sur trois
  if (!ent && rng() < 0.35) {
    const options = [[num, den], [num, den === 1000 ? 100 : den * 10], num * 10 < den ? [num * 10, den] : [num + 1, den]];
    return aToucher({
      key: `decimaux:en-fraction:${x}`,
      consigne: 'Quelle fraction est égale à ce nombre ?',
      stage: { type: 'equation', parts: [virgule(x)] },
      choices: shuffle(rng, options.filter(([a, b], i) => options.findIndex(([p, q]) => p === a && q === b) === i)).map(([a, b]) => frac(a, b)),
      style: 'fractions', answer: `${num}/${den}`,
    });
  }
  // pièges : le chiffre au mauvais rang (0,07 au lieu de 0,7), la virgule oubliée ou déplacée
  const pieges = [ent * 1000 + (num * pasDen) / 10, ent * 10000 + num * pasDen * 10, num * 1000 + ent * 100, ent * 1000 + num * pasDen * 10]
    .filter((v) => Number.isInteger(v) && v > 0 && v !== x);
  return aToucher({
    key: `decimaux:fraction:${ent}:${num}/${den}`,
    consigne: 'Quelle est l’écriture à virgule de ce nombre ?',
    court: 'L’écriture à virgule ?',
    stage: { type: 'equation', parts: ent ? [ent, '+', frac(num, den)] : [frac(num, den)] },
    choices: choixVirgule(avecPieges(rng, x, pieges, 4)), style: 'words', answer: x,
    dire: `C’est ${ditVirgule(x)}.`,
  });
}

/** La valeur d'un chiffre : le chiffre des dixièmes de 38,45 ? */
function chiffreDecimal(rng, places) {
  const x = decimal(rng, places, 10, 99);
  const rangs = [['dizaines', 10000], ['unités', 1000], ['dixièmes', 100], ['centièmes', 10], ['millièmes', 1]].slice(0, 2 + places);
  const [nom, valeur] = pick(rng, places === 3 ? rangs.slice(2) : rangs);
  const answer = Math.floor(x / valeur) % 10;
  const values = withTraps(rng, answer, rangs.map(([, v]) => Math.floor(x / v) % 10), 4, { min: 0, max: 9 });
  return aToucher({
    key: `decimaux:chiffre:${x}:${nom}`,
    consigne: `Quel est le chiffre des ${nom} de ce nombre ?`,
    stage: { type: 'equation', parts: [virgule(x)] },
    choices: entiers(values), answer,
  });
}

/**
 * La droite graduée : de 3 à 4 en dixièmes (CM1), de 3,4 à 3,5 en centièmes. On lit (la flèche,
 * choix multiple) et on place (toucher la droite) à tour de rôle.
 */
function droiteDecimale(rng, places, index) {
  const pas = places === 1 ? 100 : 10; // l'écart entre deux graduations, en millièmes
  const debut = places === 1 ? randInt(rng, 0, 12) * 10 : randInt(rng, 0, 9) * 100 + randInt(rng, 0, 9) * 10;
  const ticks = range(debut, debut + 10);
  const texts = Object.fromEntries(ticks.map((v) => [v, virgule(v * pas)]));
  const stage = { type: 'numberline', min: debut, max: debut + 10, ticks, labels: [debut, debut + 10], major: [debut + 5], snap: 1, texts };
  const n = debut + pick(rng, [1, 2, 3, 4, 6, 7, 8, 9]);
  const x = n * pas;
  if (index % 2 === 0) {
    return aToucher({
      key: `decimaux:droite:${x}`,
      consigne: 'Quel nombre montre la flèche ? Aide-toi des nombres écrits sur la droite.',
      court: 'Quel nombre montre la flèche ?',
      stage: { ...stage, mark: n },
      choices: readChoices(rng, stage, n, 4).map((v) => ({ value: v * pas, label: virgule(v * pas) })), style: 'words',
      answer: x,
    });
  }
  return {
    key: `decimaux:placer:${x}`,
    interaction: 'numberline',
    text: `Place ${virgule(x)} sur la droite.`,
    instruction: `Place ${ditVirgule(x)} sur la droite. Touche la droite pour placer la flèche, puis appuie sur « C’est ici ».`,
    short: { key: 'decimaux:placer', text: `Place ${virgule(x)} sur la droite.`, speak: `Place ${ditVirgule(x)}.` },
    stage,
    target: n,
    tolerance: 0,
    answer: n,
    choices: [],
  };
}

/** Comparer : 2,5 ou 2,45 ? (un nombre plus long n'est pas plus grand) ; avec les millièmes au CM2. */
function comparerDecimaux(rng, places) {
  const ent = randInt(rng, 0, 20) * 1000;
  const candidats = [ent + randInt(rng, 1, 9) * 100, ent + randInt(rng, 11, 99) * 10, ent + randInt(rng, 1, 9) * 10];
  if (places === 3) candidats.push(ent + randInt(rng, 101, 999));
  const values = [...new Set(candidats)].slice(0, places === 3 ? 4 : 3);
  if (values.length < 3) return comparerDecimaux(rng, places);
  const grand = rng() < 0.6;
  return aToucher({
    key: `decimaux:comparer:${values.join(',')}:${grand ? 'grand' : 'petit'}`,
    consigne: grand ? 'Touche le nombre le plus grand.' : 'Touche le nombre le plus petit.',
    stage: { type: 'none' },
    choices: choixVirgule(shuffle(rng, values)), style: 'words',
    answer: grand ? Math.max(...values) : Math.min(...values),
    dire: 'On compare d’abord les parties entières, puis les dixièmes, puis les centièmes.',
  });
}

/** Ranger quatre décimaux qui se ressemblent, du plus petit au plus grand. */
function rangerDecimaux(rng) {
  const ent = randInt(rng, 1, 15) * 1000;
  const d = sample(rng, range(1, 9), 3);
  const values = [...new Set([ent + d[0] * 100, ent + d[1] * 10, ent + d[0] * 100 + d[2] * 10, ent + 1000])];
  if (values.length < 4) return rangerDecimaux(rng);
  const items = shuffle(rng, values).map((v) => ({ value: v, label: virgule(v) }));
  return {
    key: `decimaux:ranger:${items.map((i) => i.label).join(',')}`,
    interaction: 'order',
    text: 'Touche du plus petit au plus grand.',
    instruction: 'Range ces nombres : touche-les du plus petit au plus grand. Regarde d’abord la partie entière, puis les dixièmes.',
    short: { key: 'decimaux:ranger', text: 'Du plus petit au plus grand.' },
    stage: { type: 'none' },
    items,
    order: 'asc',
    choices: [],
    answer: null,
  };
}

/** Partie entière, arrondi à l'unité, encadrer entre deux entiers, intercaler. */
function encadrerDecimal(rng, places) {
  const x = decimal(rng, places, 0, 49);
  const ent = Math.floor(x / 1000);
  const kind = pick(rng, ['entiere', 'arrondi', 'encadrer', 'entre']);
  if (kind === 'entiere') {
    const apres = Number(String(x % 1000).padStart(3, '0').replace(/0+$/, ''));
    const values = withTraps(rng, ent, [ent + 1, apres, ent - 1], 4, { min: 0, max: 999 });
    return aToucher({
      key: `decimaux:entiere:${x}`, consigne: 'Quelle est la partie entière de ce nombre ?', court: 'La partie entière ?',
      stage: { type: 'equation', parts: [virgule(x)] }, choices: entiers(values), answer: ent,
      dire: 'La partie entière, c’est ce qui est écrit avant la virgule.',
    });
  }
  if (kind === 'arrondi') {
    const arrondi = Math.round(x / 1000);
    const values = withTraps(rng, arrondi, [ent, ent + 1, ent + 2, ent - 1], 3, { min: 0, max: 999 });
    return aToucher({
      key: `decimaux:arrondi:${x}`, consigne: 'Quel est l’arrondi à l’unité de ce nombre ?', court: 'L’arrondi à l’unité ?',
      stage: { type: 'equation', parts: [virgule(x)] }, choices: entiers(values), answer: arrondi,
      dire: 'C’est le nombre entier le plus proche.',
    });
  }
  if (kind === 'encadrer') {
    const paire = (a) => `${a} et ${a + 1}`;
    return aToucher({
      key: `decimaux:encadrer:${x}`, consigne: 'Entre quels nombres entiers se trouve ce nombre ?', court: 'Entre quels entiers ?',
      stage: { type: 'equation', parts: [null, '<', virgule(x), '<', null] },
      choices: textes(avecPieges(rng, paire(ent), [paire(ent + 1), ent ? paire(ent - 1) : paire(ent + 2)], 3)), style: 'words', answer: paire(ent),
    });
  }
  // intercaler : un nombre entre 3,3 et 3,4 (centièmes), entre 3,45 et 3,46 (millièmes)
  const pas = places === 3 ? 10 : 100;
  const a = Math.floor(x / pas) * pas;
  const ok = a + randInt(rng, 1, 9) * (pas / 10);
  const pieges = [a - randInt(rng, 1, 9) * (pas / 10), a + pas + randInt(rng, 1, 9) * (pas / 10), a + 10 * pas].filter((v) => v > 0);
  return aToucher({
    key: `decimaux:entre:${a}:${ok}`, consigne: 'Quel nombre se trouve entre les deux nombres ?', court: 'Lequel est entre les deux ?',
    stage: { type: 'equation', parts: [virgule(a), '<', null, '<', virgule(a + pas)] },
    choices: choixVirgule(avecPieges(rng, ok, pieges, 3)), style: 'words', answer: ok,
  });
}

/** × et ÷ par 10 (CM1), par 100 et 1 000 (CM2) : chaque chiffre change de rang. */
function foisDecimal(rng, facteurs) {
  const f = pick(rng, facteurs);
  const fois = rng() < 0.5;
  // le nombre et le résultat ont au plus 2 chiffres après la virgule au CM1, 3 au CM2
  const max = f === 10 ? 2 : 3;
  let x;
  let result;
  if (fois) {
    x = decimal(rng, randInt(rng, 1, max), 0, f === 10 ? 99 : 9);
    result = x * f;
  } else {
    result = decimal(rng, randInt(rng, 1, max), 0, f === 10 ? 9 : 0);
    x = result * f;
  }
  if (x % 1000 === 0 && result % 1000 === 0) return foisDecimal(rng, facteurs);
  // pièges : l'autre opération, un rang de trop ou de moins, le zéro ajouté au bout (« 3,45 × 10 = 3,450 »)
  const ok = (v) => (Number.isInteger(v) && v > 0 && v < 1e9 ? virgule(v) : null);
  const pieges = [ok(fois ? x / f : x * f), ok(result * 10), ok(result / 10), fois && x % 1000 ? `${virgule(x)}${'0'.repeat(String(f).length - 1)}` : null];
  return aToucher({
    key: `decimaux:fois:${x}:${fois ? 'x' : '÷'}${f}`,
    consigne: 'Calcule, puis touche le résultat.',
    court: 'Calcule.',
    stage: { type: 'equation', parts: [virgule(x), fois ? '×' : '÷', ecrit(f), '=', null] },
    choices: textes(avecPieges(rng, virgule(result), pieges, 4)), style: 'words', answer: virgule(result),
    dire: fois ? 'Chaque chiffre prend une valeur plus grande : il se décale vers la gauche.' : 'Chaque chiffre prend une valeur plus petite : il se décale vers la droite.',
  });
}

function questionDecimaux(level, rng, index) {
  switch (level) {
    case 1: return fractionDecimale(rng, 1);
    case 2: return fractionDecimale(rng, 2);
    case 3: return chiffreDecimal(rng, 2);
    case 4: return droiteDecimale(rng, index % 4 < 2 ? 1 : 2, index);
    case 5: return comparerDecimaux(rng, 2);
    case 6: return rangerDecimaux(rng);
    case 7: return encadrerDecimal(rng, 2);
    case 8: return foisDecimal(rng, [10]);
    // CM2 : les millièmes, × et ÷ par 100 et 1 000
    case 9: return [fractionDecimale, chiffreDecimal, comparerDecimaux, encadrerDecimal][index % 4](rng, 3);
    default: return foisDecimal(rng, [100, 1000, 10]);
  }
}

export const decimaux = {
  id: 'decimaux',
  domain: 'maths',
  section: CALCUL,
  title: 'Les nombres décimaux',
  icon: '🧾',
  skill: 'Fractions décimales et écriture à virgule ; comparer, ranger, encadrer, arrondir ; × et ÷ par 10, 100, 1 000',
  levels: [
    'Les dixièmes', 'Les centièmes', 'La valeur d’un chiffre', 'La droite graduée', 'Comparer : 2,5 ou 2,45 ?',
    'Ranger', 'Encadrer, arrondir', 'Fois 10, divisé par 10', 'Les millièmes', 'Fois et divisé par 100, 1 000',
  ],
  generate(level, rng, index = 0) {
    return questionDecimaux(level, rng, index);
  },
};

// ================================================================ Les fractions du CM

const ORDINAUX = ['', '', 'demi', 'tiers', 'quart', 'cinquième', 'sixième', 'septième', 'huitième', 'neuvième', 'dixième',
  'onzième', 'douzième', 'treizième', 'quatorzième', 'quinzième', 'seizième', 'dix-septième', 'dix-huitième', 'dix-neuvième', 'vingtième'];
const NOM_DEN = { 100: 'centième', 1000: 'millième' };
const nomDen = (d) => ORDINAUX[d] || NOM_DEN[d] || null;

/** 7/4 → « sept quarts », 1/3 → « un tiers », 54/40 → « cinquante-quatre sur quarante ». */
export function fractionEnMots(n, d) {
  const nom = nomDen(d);
  if (!nom) return `${enLettres(n)} sur ${enLettres(d)}`;
  if (n === 1) return `un ${nom}`;
  return `${enLettres(n)} ${/[sx]$/.test(nom) ? nom : `${nom}s`}`;
}

/** Une fraction, à écrire dans une égalité ou à toucher (3 sur la barre, 4 dessous, et ses mots). */
function frac(n, d, hideWords = false) {
  const words = fractionEnMots(n, d);
  return { n, d, words, value: `${n}/${d}`, frac: { n, d, words, hideWords } };
}
const pgcd = (a, b) => (b ? pgcd(b, a % b) : a);
const DENS = [2, 3, 4, 5, 6, 8, 10];
/** Des fractions [n, d] sans doublon. */
const distinctes = (list) => list.filter(([a, b], i) => list.findIndex(([p, q]) => p === a && q === b) === i);

/** Lire : la fraction écrite en lettres, ou ses mots. */
function lireFraction(rng) {
  const d = pick(rng, [...DENS, 12, 20]);
  const n = randInt(rng, 1, 2 * d - 1);
  const pieges = [[d, n], [n, d === 20 ? 10 : d + 1], [n + 1 === d ? n + 2 : n + 1, d]].filter(([, b]) => b > 1 && nomDen(b));
  const all = distinctes([[n, d], ...pieges]).slice(0, 3);
  if (rng() < 0.5) {
    return aToucher({
      key: `fractions-cm:lettres:${n}/${d}`,
      consigne: 'Lis la fraction écrite en lettres, puis touche la même fraction écrite en chiffres.',
      court: 'Touche cette fraction.',
      stage: { type: 'sentence', text: fractionEnMots(n, d) },
      choices: shuffle(rng, all).map(([a, b]) => frac(a, b, true)), style: 'fractions', answer: `${n}/${d}`,
    });
  }
  return aToucher({
    key: `fractions-cm:mots:${n}/${d}`,
    consigne: 'Lis cette fraction, puis touche la même fraction écrite en lettres.',
    court: 'Touche cette fraction écrite en lettres.',
    stage: { type: 'equation', parts: [frac(n, d)] },
    choices: textes(shuffle(rng, all.map(([a, b]) => fractionEnMots(a, b)))), style: 'sentences', answer: fractionEnMots(n, d),
  });
}

/** 10/3 = 3 + 1/3, et inversement. */
function entierEtFraction(rng) {
  const d = pick(rng, [2, 3, 4, 5, 10]);
  const ent = randInt(rng, 1, 4);
  const r = randInt(rng, 1, d - 1);
  const n = ent * d + r;
  if (rng() < 0.5) {
    const ecriture = (e, x) => `${e} + ${x}/${d}`;
    const pieges = [ecriture(ent + 1, r), ent > 1 ? ecriture(ent - 1, r) : null, r + 1 < d ? ecriture(ent, r + 1) : r > 1 ? ecriture(ent, r - 1) : null];
    return aToucher({
      key: `fractions-cm:entier:${n}/${d}`,
      consigne: 'Quelle écriture avec un nombre entier est égale à cette fraction ?',
      court: 'Quelle écriture est égale ?',
      stage: { type: 'equation', parts: [frac(n, d), '=', null] },
      choices: textes(avecPieges(rng, ecriture(ent, r), pieges, 3)), style: 'words', answer: ecriture(ent, r),
    });
  }
  const pieges = [[ent + r, d], [n + 1, d], [n - 1, d]].filter(([a]) => a > 0 && a !== n);
  return aToucher({
    key: `fractions-cm:en-fraction:${ent}+${r}/${d}`,
    consigne: 'Quelle fraction est égale à ce nombre ?',
    stage: { type: 'equation', parts: [ent, '+', frac(r, d), '=', null] },
    choices: shuffle(rng, distinctes([[n, d], ...pieges]).slice(0, 3)).map(([a, b]) => frac(a, b)), style: 'fractions', answer: `${n}/${d}`,
  });
}

/** La droite graduée en demis, tiers, quarts… : quelle fraction montre la flèche ? */
function droiteFraction(rng) {
  const d = pick(rng, [2, 3, 4, 5, 10]);
  const unites = d === 10 ? 2 : 3;
  const ticks = range(0, unites * d);
  const texts = Object.fromEntries(range(0, unites).map((u) => [u * d, String(u)]));
  const n = pick(rng, ticks.filter((v) => v % d));
  const stage = { type: 'numberline', min: 0, max: unites * d, ticks, labels: range(0, unites).map((u) => u * d), major: [], snap: 1, texts, mark: n };
  return aToucher({
    key: `fractions-cm:droite:${n}/${d}`,
    consigne: 'Quelle fraction montre la flèche ? Compte les parts entre 0 et 1.',
    court: 'Quelle fraction montre la flèche ?',
    stage,
    choices: readChoices(rng, stage, n, 3).map((v) => frac(v, d)), style: 'fractions', answer: `${n}/${d}`,
  });
}

/** Encadrer une fraction entre deux nombres entiers qui se suivent. */
function encadrerFraction(rng) {
  const d = pick(rng, [2, 3, 4, 5, 6, 10]);
  let n;
  do n = randInt(rng, d + 1, 5 * d - 1); while (n % d === 0);
  const bas = Math.floor(n / d);
  const paire = (a) => `${a} et ${a + 1}`;
  return aToucher({
    key: `fractions-cm:encadrer:${n}/${d}`,
    consigne: 'Entre quels nombres entiers se trouve cette fraction ?',
    court: 'Entre quels entiers ?',
    stage: { type: 'equation', parts: [null, '<', frac(n, d), '<', null] },
    choices: textes(avecPieges(rng, paire(bas), [paire(bas + 1), paire(bas - 1)], 3)), style: 'words', answer: paire(bas),
  });
}

/** Comparer : même dénominateur, même numérateur, ou un dénominateur multiple de l'autre (1/2 et 3/8). */
function comparerFractions(rng) {
  const kind = pick(rng, ['den', 'num', 'multiple']);
  let a;
  let b;
  if (kind === 'den') {
    const d = pick(rng, DENS);
    a = [randInt(rng, 1, 2 * d), d];
    b = [randInt(rng, 1, 2 * d), d];
  } else if (kind === 'num') {
    const n = randInt(rng, 1, 5);
    [a, b] = sample(rng, DENS, 2).map((d) => [n, d]);
  } else {
    const d = pick(rng, [2, 3, 4, 5]);
    const k = d === 5 ? 2 : pick(rng, [2, 3]);
    a = [randInt(rng, 1, 2 * d), d];
    b = [randInt(rng, 1, 2 * d * k), d * k];
  }
  if (a[0] * b[1] === b[0] * a[1]) return comparerFractions(rng);
  const grand = rng() < 0.6;
  const plusGrand = a[0] * b[1] > b[0] * a[1] ? a : b;
  const plusPetit = plusGrand === a ? b : a;
  return aToucher({
    key: `fractions-cm:comparer:${a.join('/')}:${b.join('/')}:${grand ? 'grand' : 'petit'}`,
    consigne: grand ? 'Touche la fraction la plus grande.' : 'Touche la fraction la plus petite.',
    stage: { type: 'none' },
    choices: shuffle(rng, [frac(...a), frac(...b)]), style: 'fractions', answer: (grand ? plusGrand : plusPetit).join('/'),
    dire: {
      den: 'Les parts ont la même taille : on compare leur nombre.',
      num: 'Autant de parts : plus on partage, plus les parts sont petites.',
      multiple: 'On écrit les deux fractions avec le même dénominateur.',
    }[kind],
  });
}

/** Additionner, soustraire deux fractions de même dénominateur. */
function sommeFractions(rng) {
  const d = pick(rng, [4, 5, 6, 8, 10]);
  const plus = rng() < 0.6;
  const a = randInt(rng, 2, d);
  const b = plus ? randInt(rng, 1, d) : randInt(rng, 1, a - 1);
  const r = plus ? a + b : a - b;
  // pièges : les dénominateurs ajoutés (2/5 + 1/5 = 3/10), l'autre opération, un de plus
  const pieges = plus ? [[r, 2 * d], [r + 1, d], [r - 1, d]] : [[a + b, d], [r + 1, d], r > 1 ? [r - 1, d] : [r + 2, d]];
  const all = distinctes([[r, d], ...pieges].filter(([x]) => x > 0)).slice(0, 3);
  return aToucher({
    key: `fractions-cm:somme:${a}${plus ? '+' : '-'}${b}/${d}`,
    consigne: 'Calcule, puis touche le résultat.',
    court: 'Calcule.',
    stage: { type: 'equation', parts: [frac(a, d), plus ? '+' : '−', frac(b, d), '=', null] },
    choices: shuffle(rng, all).map(([x, y]) => frac(x, y)), style: 'fractions', answer: `${r}/${d}`,
    dire: 'Les parts ont la même taille : on ajoute ou on retire des parts.',
  });
}

const QUANTITES = ['billes', 'bonbons', 'élèves', 'euros', 'mètres', 'pages'];

/** Fraction d'une quantité : un tiers de 12 billes (CM1), deux tiers de 12 euros (CM2). */
function fractionQuantite(rng, unitaire) {
  const d = unitaire ? pick(rng, [2, 3, 4, 5, 10]) : pick(rng, [3, 4, 5, 6, 8, 10]);
  const num = unitaire ? 1 : randInt(rng, 2, d - 1);
  if (pgcd(num, d) > 1) return fractionQuantite(rng, unitaire);
  const k = d === 10 || d === 4 ? pick(rng, [2, 3, 5, 10, 25].filter((v) => v * d <= 100)) : randInt(rng, 2, 12);
  const total = d * k;
  const answer = num * k;
  const part = d === 2 ? 'La moitié' : cap(fractionEnMots(1, d));
  return aTaper({
    key: `fractions-cm:quantite:${num}/${d}:${total}`,
    consigne: unitaire ? 'Calcule cette part de la quantité, puis tape le résultat.' : 'Calcule d’abord une part, puis tape le résultat.',
    court: 'Tape le résultat.',
    parts: [frac(num, d), 'de', `${total} ${pick(rng, QUANTITES)}`, '=', null],
    answer,
    dire: num === 1 ? `${part} de ${total}, c’est ${k}.` : `${part} de ${total}, c’est ${k}. Donc ${fractionEnMots(num, d)}, c’est ${answer}.`,
  });
}

/** CM2 : un entier fois une fraction, 4 × 2/3 = 8/3. */
function produitFraction(rng) {
  const d = pick(rng, [3, 4, 5, 6, 8, 10]);
  const n = randInt(rng, 1, d - 1);
  const k = randInt(rng, 2, 6);
  const all = distinctes([[k * n, d], [k * n, k * d], [n, k * d], [k + n, d]]).slice(0, 3);
  return aToucher({
    key: `fractions-cm:produit:${k}x${n}/${d}`,
    consigne: 'Calcule, puis touche le résultat.',
    court: 'Calcule.',
    stage: { type: 'equation', parts: [k, '×', frac(n, d), '=', null] },
    choices: shuffle(rng, all).map(([x, y]) => frac(x, y)), style: 'fractions', answer: `${k * n}/${d}`,
    dire: 'On multiplie le nombre de parts ; leur taille ne change pas.',
  });
}

// Les fractions usuelles et leur écriture à virgule (calcul mental du CM1 et du CM2), avec les erreurs
// classiques (1/2 écrit 1,2).
const USUELLES = [
  [1, 2, 500, ['1,2', '0,2', '2,1']], [1, 4, 250, ['1,4', '0,4', '0,14']], [3, 4, 750, ['3,4', '0,34', '0,43']],
  [1, 5, 200, ['1,5', '0,5', '0,15']], [1, 10, 100, ['1,10', '0,01', '10']], [3, 2, 1500, ['3,2', '0,32', '2,3']],
  [5, 2, 2500, ['5,2', '0,52', '0,25']], [7, 10, 700, ['7,10', '0,07', '0,17']], [1, 100, 10, ['1,100', '0,1', '0,001']],
  [25, 100, 250, ['2,5', '25,100', '0,025']],
];
const EGALES = [[[1, 2], [2, 4], [5, 10], [50, 100]], [[1, 4], [25, 100]], [[3, 4], [75, 100]], [[1, 5], [2, 10], [20, 100]], [[1, 10], [10, 100]]];

/** Fractions usuelles : 1/2 = 0,5 ; 3/4 = 0,75 ; 1/2 = 5/10 = 50/100. */
function fractionsUsuelles(rng, index) {
  if (index % 2 === 0) {
    const [n, d, milli, pieges] = pick(rng, USUELLES);
    return aToucher({
      key: `fractions-cm:usuelle:${n}/${d}`,
      consigne: 'Quelle est l’écriture à virgule de cette fraction ?',
      court: 'L’écriture à virgule ?',
      stage: { type: 'equation', parts: [frac(n, d), '=', null] },
      choices: textes(avecPieges(rng, virgule(milli), pieges, 4)), style: 'words', answer: virgule(milli),
      dire: `C’est ${ditVirgule(milli)}.`,
    });
  }
  const groupe = pick(rng, EGALES);
  const [montree, bonne] = sample(rng, groupe, 2);
  const pieges = sample(rng, EGALES.filter((g) => g !== groupe).flat(), 2);
  return aToucher({
    key: `fractions-cm:egale:${montree.join('/')}:${bonne.join('/')}`,
    consigne: 'Quelle fraction est égale à celle-ci ?',
    stage: { type: 'equation', parts: [frac(...montree), '=', null] },
    choices: shuffle(rng, [bonne, ...pieges]).map(([x, y]) => frac(x, y)), style: 'fractions', answer: bonne.join('/'),
  });
}

function questionFractions(level, rng, index) {
  switch (level) {
    case 1: return lireFraction(rng);
    case 2: return entierEtFraction(rng);
    case 3: return droiteFraction(rng);
    case 4: return encadrerFraction(rng);
    case 5: return comparerFractions(rng);
    case 6: return sommeFractions(rng);
    case 7: return fractionQuantite(rng, true);
    // CM2
    case 8: return fractionQuantite(rng, false);
    case 9: return produitFraction(rng);
    default: return fractionsUsuelles(rng, index);
  }
}

export const fractionsCm = {
  id: 'fractions-cm',
  domain: 'maths',
  section: CALCUL,
  title: 'Les fractions du CM',
  icon: '🍰',
  skill: 'Fractions plus grandes que 1, droite graduée, encadrer, comparer, additionner ; fraction d’une quantité ; entier × fraction ; fractions usuelles',
  levels: [
    'Lire une fraction', 'Entier et fraction', 'La droite graduée', 'Encadrer une fraction', 'Comparer des fractions',
    'Additionner, soustraire', 'Un tiers de 12', 'Deux tiers de 12', 'Entier × fraction', 'Fractions usuelles : 1/2 = 0,5',
  ],
  generate(level, rng, index = 0) {
    return questionFractions(level, rng, index);
  },
};

// ================================================================ Calcul mental du CM

const CALCULE = 'Calcule de tête, puis tape le résultat.';

/** ± 8, 9, 18, 19, 28, 29, 38, 39 : on passe par la dizaine d'au-dessus, puis on corrige. */
function presqueDizaine(rng) {
  const b = pick(rng, [8, 9, 18, 19, 28, 29, 38, 39]);
  const a = randInt(rng, 120, 980);
  const plus = rng() < 0.5;
  const rond = Math.ceil(b / 10) * 10;
  const ecart = rond - b;
  return aTaper({
    key: `calcul-cm:presque:${a}${plus ? '+' : '-'}${b}`,
    consigne: CALCULE,
    parts: [a, plus ? '+' : '−', b, '=', null],
    answer: plus ? a + b : a - b,
    dire: plus ? `Pour ajouter ${b}, on ajoute ${rond}, puis on enlève ${ecart}.` : `Pour enlever ${b}, on enlève ${rond}, puis on ajoute ${ecart}.`,
  });
}

function fois10(rng) {
  const f = pick(rng, [10, 100, 1000]);
  const a = randInt(rng, 2, f === 1000 ? 99 : 999);
  return aTaper({
    key: `calcul-cm:fois10:${a}x${f}`, consigne: CALCULE, parts: [a, '×', ecrit(f), '=', null], answer: a * f,
    dire: { 10: 'Chaque chiffre prend une valeur dix fois plus grande : on écrit un zéro au bout.', 100: 'Chaque chiffre prend une valeur cent fois plus grande : on écrit deux zéros au bout.', 1000: 'Chaque chiffre prend une valeur mille fois plus grande : on écrit trois zéros au bout.' }[f],
  });
}

function fois458(rng) {
  const f = pick(rng, [4, 8, 5]);
  const a = randInt(rng, 12, f === 5 ? 98 : 49);
  const consigne = { 5: 'Calcule de tête : multiplie par 10, puis prends la moitié.', 4: 'Calcule de tête : prends le double, puis encore le double.', 8: 'Calcule de tête : prends le double, trois fois de suite.' }[f];
  return aTaper({ key: `calcul-cm:fois${f}:${a}`, consigne, parts: [a, '×', f, '=', null], answer: a * f });
}

function divisionTables(rng) {
  const b = randInt(rng, 3, 9);
  const q = randInt(rng, 3, 10);
  return aTaper({
    key: `calcul-cm:div:${b * q}:${b}`, consigne: 'Calcule de tête avec les tables, puis tape le résultat.', parts: [b * q, '÷', b, '=', null], answer: q,
  });
}

/** 6 × 40, 7 × 300 (CM1) ; 300 × 40 (CM2). */
function dizainesCentaines(rng) {
  const a = rng() < 0.6 ? randInt(rng, 2, 9) : randInt(rng, 2, 9) * pick(rng, [10, 100]);
  const b = randInt(rng, 2, 9) * pick(rng, [10, 100]);
  return aTaper({
    key: `calcul-cm:dizaines:${a}x${b}`, consigne: CALCULE, parts: [a, '×', b, '=', null], answer: a * b,
    dire: 'On multiplie les chiffres, puis on écrit les zéros.',
  });
}

function complement(rng) {
  const cible = pick(rng, [100, 1000]);
  const a = cible === 100 ? randInt(rng, 11, 89) : randInt(rng, 11, 98) * 10 + (rng() < 0.4 ? randInt(rng, 1, 9) : 0);
  return aTaper({
    key: `calcul-cm:complement:${a}:${cible}`, consigne: 'Combien faut-il ajouter pour arriver au nombre rond ?', court: 'Combien ajouter ?',
    parts: [a, '+', null, '=', ecrit(cible)], answer: cible - a,
  });
}

/** Décimaux sans retenue (CM1) : 3,4 + 0,5 ; 6,27 + 0,02 ; 7,8 − 0,6 ; 12,5 + 30. */
function decimauxSansRetenue(rng) {
  const kind = pick(rng, ['dixiemes', 'centiemes', 'moins', 'entier']);
  let a;
  let b;
  let plus = true;
  if (kind === 'dixiemes') {
    a = randInt(rng, 1, 20) * 1000 + randInt(rng, 1, 5) * 100;
    b = randInt(rng, 1, 9 - (a % 1000) / 100) * 100;
  } else if (kind === 'centiemes') {
    a = randInt(rng, 1, 20) * 1000 + randInt(rng, 1, 9) * 100 + randInt(rng, 1, 5) * 10;
    b = randInt(rng, 1, 9 - (a % 100) / 10) * 10;
  } else if (kind === 'moins') {
    plus = false;
    a = randInt(rng, 1, 20) * 1000 + randInt(rng, 5, 9) * 100;
    b = randInt(rng, 1, (a % 1000) / 100) * 100;
  } else {
    a = randInt(rng, 1, 40) * 1000 + randInt(rng, 1, 9) * 100;
    b = randInt(rng, 1, 9) * pick(rng, [1000, 10000]);
  }
  const r = plus ? a + b : a - b;
  // pièges : ajouté au mauvais rang (3,4 + 0,5 = 8,4), les chiffres mis bout à bout (3,45)
  const decale = b < 1000 ? b * 10 : b / 10;
  const autreRang = plus ? a + decale : a - decale;
  const pieges = [autreRang > 0 && Number.isInteger(autreRang) ? virgule(autreRang) : null,
    b < 1000 ? `${virgule(a)}${String(b).replace(/0+$/, '')}` : null, virgule(plus ? r + 100 : r - 100), virgule(r + 1000)];
  return aToucher({
    key: `calcul-cm:decimal:${a}${plus ? '+' : '-'}${b}`,
    consigne: 'Calcule de tête, puis touche le résultat.',
    court: 'Calcule.',
    stage: { type: 'equation', parts: [virgule(a), plus ? '+' : '−', virgule(b), '=', null] },
    choices: textes(avecPieges(rng, virgule(r), pieges, 4)), style: 'words', answer: virgule(r),
    dire: 'On ajoute ou on retire les chiffres du même rang : les dixièmes avec les dixièmes.',
  });
}

/** CM2 : moitié des nombres impairs jusqu'à 15, double et moitié d'un décimal, ÷ 4 et ÷ 8. */
function doublesMoities(rng) {
  const kind = pick(rng, ['impair', 'double', 'moitie', 'quart']);
  if (kind === 'quart') {
    const f = pick(rng, [4, 8]);
    const q = randInt(rng, 11, f === 4 ? 49 : 24);
    return aTaper({
      key: `calcul-cm:div${f}:${q * f}`,
      consigne: f === 4 ? 'Calcule de tête : prends la moitié, puis encore la moitié.' : 'Calcule de tête : prends la moitié, trois fois de suite.',
      parts: [q * f, '÷', f, '=', null], answer: q,
    });
  }
  let x;
  if (kind === 'impair') x = pick(rng, [1, 3, 5, 7, 9, 11, 13, 15]) * 1000;
  else if (kind === 'double') x = randInt(rng, 1, 9) * 1000 + randInt(rng, 1, 9) * 100;
  else x = randInt(rng, 1, 9) * 2000 + randInt(rng, 1, 4) * 200;
  const double = kind === 'double';
  const result = double ? x * 2 : x / 2;
  const pieges = [double ? x / 2 : x * 2, result + 1000, result - 100, result + 100].filter((v) => v > 0 && Number.isInteger(v)).map(virgule);
  return aToucher({
    key: `calcul-cm:${kind}:${x}`,
    consigne: double ? 'Quel est le double de ce nombre ?' : 'Quelle est la moitié de ce nombre ?',
    stage: { type: 'equation', parts: [double ? 'double de' : 'moitié de', virgule(x), '=', null] },
    choices: textes(avecPieges(rng, virgule(result), pieges, 4)), style: 'words', answer: virgule(result),
  });
}

/** Égalités à trou, distributivité et parenthèses (une paire au CM1, deux au CM2). */
function trousParentheses(rng) {
  const kind = pick(rng, ['trou', 'parentheses', 'distributivite', 'deux']);
  if (kind === 'trou') {
    const a = randInt(rng, 3, 9);
    const b = randInt(rng, 3, 9);
    const c = randInt(rng, a * b + 5, 199);
    return aTaper({ key: `calcul-cm:trou:${c}-${a}x${b}`, consigne: 'Trouve le nombre qui manque.', court: 'Le nombre qui manque ?', parts: [c, '−', null, '=', a, '×', b], answer: c - a * b });
  }
  if (kind === 'distributivite') {
    const a = randInt(rng, 3, 9);
    const u = randInt(rng, 1, 9);
    return aTaper({
      key: `calcul-cm:distrib:${a}x${10 + u}`, consigne: 'Trouve le nombre qui manque.', court: 'Le nombre qui manque ?',
      parts: [a, '×', 10 + u, '=', a, '×', 10, '+', a, '×', null], answer: u,
      dire: 'Pour multiplier, on peut couper le nombre en dizaines et en unités.',
    });
  }
  const a = randInt(rng, 2, 9);
  const b = randInt(rng, 2, 9);
  const c = randInt(rng, 4, 9);
  if (kind === 'deux') {
    const d = randInt(rng, 1, c - 2);
    return aTaper({
      key: `calcul-cm:deux:${a}+${b}x${c}-${d}`, consigne: 'Calcule d’abord ce qui est entre parenthèses.', court: 'Calcule.',
      parts: [`(${a} + ${b})`, '×', `(${c} − ${d})`, '=', null], answer: (a + b) * (c - d),
    });
  }
  return aTaper({
    key: `calcul-cm:parentheses:${a}+${b}x${c}`, consigne: 'Calcule d’abord ce qui est entre parenthèses.', court: 'Calcule.',
    parts: [`(${a} + ${b})`, '×', c, '=', null], answer: (a + b) * c,
  });
}

/** CM2 : décimaux avec retenue : 3,8 + 6,9 ; 5 + 2,75 ; 4,6 × 5 ; 1,2 × 50. */
function decimauxRetenue(rng) {
  const kind = pick(rng, ['deux', 'entier', 'fois5', 'fois50']);
  let parts;
  let r;
  let pieges;
  if (kind === 'deux') {
    // les dixièmes dépassent 10 : la retenue passe aux unités (3,8 + 6,9 = 10,7, pas 9,17)
    const da = randInt(rng, 2, 9);
    const db = randInt(rng, 11 - da, 9);
    const a = randInt(rng, 1, 9) * 1000 + da * 100;
    const b = randInt(rng, 1, 9) * 1000 + db * 100;
    r = a + b;
    parts = [virgule(a), '+', virgule(b)];
    pieges = [`${Math.floor(a / 1000) + Math.floor(b / 1000)},${da + db}`, virgule(r - 1000), virgule(r + 100)];
  } else if (kind === 'entier') {
    const e = randInt(rng, 2, 9) * 1000;
    const x = randInt(rng, 1, 9) * 1000 + randInt(rng, 11, 99) * 10;
    r = e + x;
    parts = [virgule(e), '+', virgule(x)];
    pieges = [virgule(x + e / 100), virgule(x + e / 10), virgule(r + 1000)];
  } else {
    const f = kind === 'fois5' ? 5 : 50;
    const x = randInt(rng, 1, 9) * 1000 + randInt(rng, 1, 4) * 200; // un nombre pair de dixièmes : la moitié tombe juste
    r = x * f;
    parts = [virgule(x), '×', f];
    pieges = [virgule(r * 10), virgule(r / 10), virgule(x * 2 * f)];
  }
  return aToucher({
    key: `calcul-cm:retenue:${kind}:${parts.join('')}`,
    consigne: kind.startsWith('fois') ? 'Calcule de tête : multiplie par 10, puis prends la moitié.' : 'Calcule de tête, puis touche le résultat.',
    court: 'Calcule.',
    stage: { type: 'equation', parts: [...parts, '=', null] },
    choices: textes(avecPieges(rng, virgule(r), pieges, 4)), style: 'words', answer: virgule(r),
  });
}

function questionCalcul(level, rng) {
  switch (level) {
    case 1: return presqueDizaine(rng);
    case 2: return fois10(rng);
    case 3: return fois458(rng);
    case 4: return divisionTables(rng);
    case 5: return dizainesCentaines(rng);
    case 6: return complement(rng);
    case 7: return decimauxSansRetenue(rng);
    // CM2
    case 8: return doublesMoities(rng);
    case 9: return trousParentheses(rng);
    default: return decimauxRetenue(rng);
  }
}

export const calculCm = {
  id: 'calcul-cm',
  domain: 'maths',
  section: CALCUL,
  title: 'Calcul mental du CM',
  icon: '⚡',
  skill: 'Calculer de tête : ± 9, 19…, × 10, 100, 1 000, × 4, × 8, × 5, tables, compléments, décimaux, doubles et moitiés, parenthèses',
  levels: [
    '+ ou − 9, 19, 29…', 'Fois 10, 100, 1 000', 'Fois 4, fois 8, fois 5', 'Diviser avec les tables', 'Dizaines et centaines',
    'Aller au nombre rond', 'Décimaux sans retenue', 'Doubles et moitiés', 'Trous et parenthèses', 'Décimaux avec retenue',
  ],
  generate(level, rng) {
    return questionCalcul(level, rng);
  },
};

export const CM_NOMBRES_GAMES = [nombresCm, decimaux, fractionsCm, calculCm];
