// La monnaie (euros), les mesures (longueurs, masses, unités) et le calendrier.

import { pick, randInt, sample, shuffle } from '../random.js';
import { numberChoices } from './helpers.js';
import { DAYS, MONTHS } from './monde.js';

const euros = (n) => `${n} €`;
const numberOptions = (rng, answer, count, min, max) => numberChoices(rng, answer, count, min, max).map((v) => ({ value: v, label: euros(v) }));
const capitalize = (text) => `${text[0].toUpperCase()}${text.slice(1)}`;
/** « 1 euro », « 3 euros » (pour la voix). */
const eurosWord = (n) => `${n} euro${n > 1 ? 's' : ''}`;
/** « le livre coûte », « les crayons coûtent » */
const costs = (item) => (item.name.startsWith('les ') ? 'coûtent' : 'coûte');
/** « à la ferme, dans la mer ou dans la forêt » : les réponses lues à voix haute. */
const spokenList = (labels) => (labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(', ')} ou ${labels.at(-1)}`);

// ---------------------------------------------------------------- La monnaie

const SHOP = [
  { emoji: '🧸', name: 'l’ours en peluche' }, { emoji: '📕', name: 'le livre' }, { emoji: '⚽', name: 'le ballon' },
  { emoji: '🖍️', name: 'les crayons' }, { emoji: '🍦', name: 'la glace' }, { emoji: '🪁', name: 'le cerf-volant' },
  { emoji: '🚗', name: 'la petite voiture' }, { emoji: '🎲', name: 'le jeu' },
];

// Pièces et billets pour payer (en paysage sur téléphone, la zone est compacte : voir .pay dans le CSS).
const PAY_VALUES = [1, 2, 5, 10];

/** Une somme en pièces et billets, du plus grand au plus petit (sans dépasser un nombre de pièces raisonnable). */
export function makeChange(total, values) {
  const out = [];
  let rest = total;
  for (const v of [...values].sort((a, b) => b - a)) {
    while (rest >= v) {
      out.push(v);
      rest -= v;
    }
  }
  return out;
}

/** Niveaux 5 à 7 de la monnaie : comparer son argent à un prix, payer deux objets, retrouver un prix. */
function monnaiePlus(level, rng) {
  if (level === 5) {
    // compter son argent, puis le comparer aux prix : un seul objet n'est pas trop cher
    const total = randInt(rng, 6, 20);
    const coins = makeChange(total, [10, 5, 2, 1]);
    const [cheap, ...dear] = sample(rng, SHOP, 3);
    const offers = shuffle(rng, [
      { item: cheap, price: randInt(rng, Math.max(2, total - 5), total) },
      { item: dear[0], price: randInt(rng, total + 1, total + 5) },
      { item: dear[1], price: randInt(rng, total + 2, total + 9) },
    ]);
    const price = offers.find((o) => o.item === cheap).price;
    return {
      key: `monnaie:acheter:${coins.join('-')}:${cheap.emoji}`,
      text: 'Avec cet argent, que peux-tu acheter ?',
      instruction: 'Compte ton argent. Que peux-tu acheter ? Un seul objet n’est pas trop cher.',
      short: { key: 'monnaie:acheter', text: 'Que peux-tu acheter ?' },
      stage: { type: 'money', items: shuffle(rng, coins) },
      choices: offers.map((o) => ({ value: o.item.emoji, label: `${o.item.emoji} ${o.price}\u00a0€`, name: o.item.name })),
      choiceStyle: 'answers',
      answer: cheap.emoji,
      success: { speak: `Tu as ${total} euros : tu peux acheter ${cheap.name}, à ${price} euros.` },
    };
  }
  if (level === 6) {
    // payer deux objets d'un coup : il faut d'abord ajouter les deux prix
    const [a, b] = sample(rng, SHOP, 2);
    const [pa, pb] = [randInt(rng, 2, 9), randInt(rng, 2, 9)];
    const total = pa + pb;
    return {
      key: `monnaie:deux:${a.emoji}${pa}:${b.emoji}${pb}`,
      interaction: 'pay',
      text: `${a.emoji} et ${b.emoji} : paie les deux !`,
      instruction: `${capitalize(a.name)} ${costs(a)} ${pa} euros, et ${b.name} ${costs(b)} ${pb} euros. Touche les pièces et les billets pour payer les deux.`,
      short: { key: 'monnaie:deux', text: 'Paie les deux !', speak: `${pa} euros, et ${pb} euros.` },
      stage: { type: 'sentence', text: `${a.emoji} ${pa}\u00a0€ + ${b.emoji} ${pb}\u00a0€` },
      values: PAY_VALUES,
      choices: [],
      answer: total,
      success: { speak: `${pa} plus ${pb}, égale ${total}. Tu as payé ${total} euros.` },
    };
  }
  // retrouver le prix : on connaît le billet donné et la monnaie rendue
  const item = pick(rng, SHOP);
  const paid = pick(rng, [10, 20, 20]);
  const price = randInt(rng, paid === 10 ? 3 : 6, paid - 1);
  const change = paid - price;
  return {
    key: `monnaie:prix:${item.emoji}${price}:${paid}`,
    text: `Tu donnes ${paid} €. On te rend ${change} €. Combien coûte ${item.emoji} ?`,
    instruction: `Tu donnes un billet de ${paid} euros, et on te rend ${eurosWord(change)}. Combien ${costs(item)} ${item.name} ?`,
    short: { key: 'monnaie:prix', text: `On te rend ${change} €. Combien coûte ${item.emoji} ?`, speak: `On te rend ${eurosWord(change)}. Combien ${costs(item)} ${item.name} ?` },
    stage: { type: 'price', emoji: item.emoji, price: '?', paid },
    choices: numberOptions(rng, price, 4, 1, paid),
    choiceStyle: 'numbers',
    answer: price,
    success: { speak: `${price} plus ${change}, égale ${paid}. ${capitalize(item.name)} ${costs(item)} ${price} euros.` },
  };
}

export const monnaie = {
  id: 'monnaie',
  domain: 'maths',
  section: 'Heure et mesures',
  title: 'La monnaie',
  icon: '💶',
  skill: 'Compter avec des pièces et des billets, payer, rendre la monnaie',
  levels: [
    'Pièces de 1 € et 2 € (jusqu’à 10 €)', 'Pièces et billets (jusqu’à 50 €)', 'Payer le bon prix', 'Rendre la monnaie',
    'Que peux-tu acheter ?', 'Payer deux objets', 'Retrouver le prix',
  ],
  generate(level, rng) {
    if (level >= 5) return monnaiePlus(level, rng);
    if (level <= 2) {
      const total = level === 1 ? randInt(rng, 3, 10) : randInt(rng, 11, 50);
      const values = level === 1 ? [2, 1] : [20, 10, 5, 2, 1];
      // on mélange des petites pièces pour que ce ne soit pas toujours la décomposition la plus courte
      let coins = makeChange(total, values);
      if (level === 1 && coins.includes(2) && rng() < 0.5) coins = [...coins.slice(1), 1, 1];
      return {
        key: `monnaie:${level}:${coins.join('-')}`,
        text: 'Combien d’euros y a-t-il ?',
        instruction: 'Compte l’argent. Combien d’euros y a-t-il ?',
        short: { key: `monnaie:compter:${level}`, text: 'Combien d’euros ?' },
        stage: { type: 'money', items: shuffle(rng, coins) },
        choices: numberOptions(rng, total, level === 1 ? 3 : 4, 1, level === 1 ? 12 : 60),
        choiceStyle: 'numbers',
        answer: total,
        success: { speak: `Il y a ${total} euros.` },
      };
    }
    const item = pick(rng, SHOP);
    if (level === 3) {
      const price = randInt(rng, 3, 19);
      return {
        key: `monnaie:payer:${item.emoji}${price}`,
        interaction: 'pay',
        text: `${item.emoji} coûte ${price} €. Donne le bon prix.`,
        instruction: `${item.name[0].toUpperCase()}${item.name.slice(1)} coûte ${price} euros. Touche les pièces et les billets pour payer juste le bon prix.`,
        short: { key: 'monnaie:payer', text: `Paie ${price} € !`, speak: `${price} euros.` },
        stage: { type: 'price', emoji: item.emoji, price },
        values: PAY_VALUES,
        choices: [],
        answer: price,
        success: { speak: `Tu as payé ${price} euros.` },
      };
    }
    const price = randInt(rng, 2, 18);
    const paid = price < 5 ? 5 : price < 10 ? 10 : 20;
    const answer = paid - price;
    return {
      key: `monnaie:rendre:${item.emoji}${price}`,
      text: `${item.emoji} coûte ${price} €. Tu donnes ${paid} €. Combien te rend-on ?`,
      instruction: `${item.name[0].toUpperCase()}${item.name.slice(1)} coûte ${price} euros. Tu donnes un billet de ${paid} euros. Combien d’euros te rend-on ?`,
      short: { key: 'monnaie:rendre', text: `${price} €, tu donnes ${paid} € : on te rend ?` },
      stage: { type: 'price', emoji: item.emoji, price, paid },
      choices: numberOptions(rng, answer, 4, 1, 20),
      choiceStyle: 'numbers',
      answer,
      success: { speak: `${price} plus ${answer}, égale ${paid}. On te rend ${answer} euros.` },
    };
  },
};

// ---------------------------------------------------------------- Mesurer

const HEAVY = [
  { emoji: '🐘', name: 'l’éléphant', w: 9 }, { emoji: '🐄', name: 'la vache', w: 8 }, { emoji: '🚗', name: 'la voiture', w: 8 },
  { emoji: '🐶', name: 'le chien', w: 5 }, { emoji: '🍉', name: 'la pastèque', w: 4 }, { emoji: '📚', name: 'les livres', w: 4 },
  { emoji: '🍎', name: 'la pomme', w: 2 }, { emoji: '🐭', name: 'la souris', w: 1 }, { emoji: '🪶', name: 'la plume', w: 0 },
];
const UNITS = [
  { what: 'la longueur d’une table', unit: 'des mètres', wrong: ['des kilos', 'des litres'] },
  { what: 'la longueur d’un crayon', unit: 'des centimètres', wrong: ['des kilos', 'des litres'] },
  { what: 'le poids d’un melon', unit: 'des kilos', wrong: ['des mètres', 'des litres'] },
  { what: 'l’eau d’une bouteille', unit: 'des litres', wrong: ['des mètres', 'des kilos'] },
  { what: 'la distance jusqu’à l’école', unit: 'des kilomètres', wrong: ['des litres', 'des kilos'] },
  { what: 'le poids d’une lettre', unit: 'des grammes', wrong: ['des mètres', 'des litres'] },
];
const BAR_COLORS = ['#ff5c5c', '#3d7dff', '#2fbf5b', '#ffb020'];

// Estimer la taille d'un objet réel : une seule réponse est vraisemblable.
const ESTIMATES = [
  { emoji: '🚪', name: 'une porte', answer: '2 m', wrong: ['2 cm', '20 cm'] },
  { emoji: '🍴', name: 'une fourchette', answer: '20 cm', wrong: ['2 cm', '2 m'] },
  { emoji: '🦒', name: 'une girafe', answer: '5 m', wrong: ['5 cm', '50 cm'] },
  { emoji: '🚌', name: 'un bus', answer: '12 m', wrong: ['12 cm', '1 m'] },
  { emoji: '✏️', name: 'un crayon', answer: '15 cm', wrong: ['1 cm', '15 m'] },
  { emoji: '🛏️', name: 'un lit', answer: '2 m', wrong: ['20 cm', '20 m'] },
  { emoji: '🔑', name: 'une clé', answer: '5 cm', wrong: ['50 cm', '5 m'] },
  { emoji: '📕', name: 'un livre', answer: '25 cm', wrong: ['2 cm', '25 m'] },
  { emoji: '🐘', name: 'un éléphant', answer: '3 m', wrong: ['3 cm', '30 cm'] },
  { emoji: '🍌', name: 'une banane', answer: '20 cm', wrong: ['2 cm', '2 m'] },
  { emoji: '🐜', name: 'une fourmi', answer: '1 cm', wrong: ['1 m', '10 m'] },
];
// Les unités et leurs relations (programme de CE1 : m et cm, km et m, kg et g).
const UNIT_NAMES = { m: 'mètre', cm: 'centimètre', km: 'kilomètre', kg: 'kilo', g: 'gramme' };
const RELATIONS = [
  { big: 'm', small: 'cm', factor: 100 },
  { big: 'kg', small: 'g', factor: 1000 },
  { big: 'km', small: 'm', factor: 1000 },
];

/** « 20 cm » → « 20 centimètres » (pour la voix). */
function spokenMeasure(label) {
  const [n, unit] = label.split(' ');
  return `${n} ${UNIT_NAMES[unit]}${Number(n) > 1 ? 's' : ''}`;
}

/** Niveaux 6 à 8 de « Mesurer » : estimer, convertir, comparer des mesures écrites dans deux unités. */
function mesuresPlus(level, rng) {
  if (level === 6) {
    const item = pick(rng, ESTIMATES);
    const options = shuffle(rng, [item.answer, ...item.wrong]);
    const spoken = options.map(spokenMeasure);
    return {
      key: `mesures:estimer:${item.emoji}`,
      text: `En vrai, combien mesure ${item.name} ?`,
      instruction: [`En vrai, combien mesure ${item.name} ?`, `${capitalize(spokenList(spoken))} ?`],
      short: { key: 'mesures:estimer', text: `Combien mesure ${item.name} ?`, speak: [`${capitalize(item.name)} ?`, spokenList(spoken)] },
      stage: { type: 'picture', emoji: item.emoji },
      choices: options.map((o) => ({ value: o, label: o })),
      choiceStyle: 'answers',
      answer: item.answer,
      success: { speak: `${capitalize(item.name)} mesure à peu près ${spokenMeasure(item.answer)}.` },
    };
  }
  if (level === 7) {
    const rel = pick(rng, RELATIONS);
    const n = randInt(rng, 1, 5);
    const toSmall = rng() < 0.6; // « 2 m = ? cm » ou « 200 cm = ? m »
    const bigLabel = `${n} ${rel.big}`;
    const smallLabel = `${n * rel.factor} ${rel.small}`;
    const answer = toSmall ? n * rel.factor : n;
    const values = toSmall ? [n * 10, n * 100, n * 1000] : [n, n * 10, n * 100];
    const unit = toSmall ? rel.small : rel.big;
    const question = toSmall
      ? `${bigLabel}, c’est combien de ${UNIT_NAMES[rel.small]}s ?`
      : `${smallLabel}, c’est combien de ${UNIT_NAMES[rel.big]}s ?`;
    const spokenQuestion = `${spokenMeasure(toSmall ? bigLabel : smallLabel)}, c’est combien de ${UNIT_NAMES[unit]}s ?`;
    return {
      key: `mesures:convertir:${rel.big}:${n}:${toSmall}`,
      text: question,
      instruction: spokenQuestion,
      short: { key: 'mesures:convertir', text: question, speak: spokenQuestion },
      stage: { type: 'sentence', text: toSmall ? `${n}\u00a0${rel.big} = ?\u00a0${rel.small}` : `${n * rel.factor}\u00a0${rel.small} = ?\u00a0${rel.big}` },
      choices: shuffle(rng, values).map((v) => ({ value: v, label: `${v} ${unit}` })),
      choiceStyle: 'answers',
      answer,
      success: { speak: `${spokenMeasure(bigLabel)}, c’est ${spokenMeasure(smallLabel)}.` },
    };
  }
  // comparer : 1 m et 120 cm, 2 kg et 1800 g… il faut penser à convertir
  const mass = rng() < 0.4;
  const rel = mass ? RELATIONS[1] : RELATIONS[0];
  const k = randInt(rng, 1, mass ? 2 : 3);
  const step = rel.factor / 10;
  const near = [];
  for (let v = k * rel.factor - 5 * step; v <= k * rel.factor + 5 * step; v += step) if (v > 0 && v !== k * rel.factor) near.push(v);
  const values = shuffle(rng, [k * rel.factor, ...sample(rng, near, 2)]);
  const most = rng() < 0.6;
  const answer = most ? Math.max(...values) : Math.min(...values);
  const label = (v) => (v === k * rel.factor ? `${k} ${rel.big}` : `${v} ${rel.small}`);
  const spoken = values.map((v) => spokenMeasure(label(v)));
  const adjective = mass ? (most ? 'le plus lourd' : 'le plus léger') : (most ? 'le plus long' : 'le plus court');
  return {
    key: `mesures:comparer:${values.join('-')}:${most}`,
    text: `${mass ? 'Trois paquets 📦' : 'Trois rubans 🎀'} : lequel est ${adjective} ?`,
    instruction: `${mass ? 'Trois paquets pèsent' : 'Trois rubans mesurent'} ${spoken.slice(0, -1).join(', ')} et ${spoken.at(-1)}. Lequel est ${adjective} ?`,
    short: { key: `mesures:comparer:${mass}`, text: `Lequel est ${adjective} ?` },
    stage: { type: 'none' },
    choices: values.map((v) => ({ value: v, label: label(v) })),
    choiceStyle: 'words',
    answer,
    success: { speak: `${capitalize(spokenMeasure(label(answer)))}, c’est ${adjective}. ${capitalize(spokenMeasure(`${k} ${rel.big}`))}, c’est ${spokenMeasure(`${k * rel.factor} ${rel.small}`)}.` },
  };
}

export const mesures = {
  id: 'mesures',
  domain: 'maths',
  section: 'Heure et mesures',
  title: 'Mesurer',
  icon: '📏',
  skill: 'Comparer et mesurer des longueurs (règle en cm), comparer des masses, choisir l’unité',
  levels: [
    'Le plus long', 'Mesurer avec la règle', 'La règle sans partir de zéro', 'Le plus lourd', 'Quelle unité ?',
    'Estimer une longueur', 'Convertir les unités', 'Comparer des mesures',
  ],
  generate(level, rng) {
    if (level >= 6) return mesuresPlus(level, rng);
    if (level === 1) {
      const lengths = sample(rng, [3, 4, 5, 6, 7, 8, 9, 10], 3);
      const longest = Math.max(...lengths);
      const colors = sample(rng, BAR_COLORS, 3);
      return {
        key: `mesures:long:${lengths.join('-')}`,
        text: 'Touche le crayon le plus long.',
        instruction: 'Touche le crayon le plus long.',
        short: { key: 'mesures:long', text: 'Le plus long ?' },
        stage: { type: 'none' },
        choices: lengths.map((len, i) => ({ value: len, bar: { length: len, color: colors[i] }, name: `crayon de ${len}` })),
        choiceStyle: 'bars',
        answer: longest,
        success: { speak: 'Oui, c’est le plus long !' },
      };
    }
    if (level <= 3) {
      const start = level === 2 ? 0 : randInt(rng, 1, 4);
      const length = randInt(rng, 2, 10 - start);
      return {
        key: `mesures:regle:${start}-${length}`,
        text: 'Combien mesure le crayon ?',
        instruction: level === 2 ? 'Regarde la règle. Combien de centimètres mesure le crayon ?' : 'Attention, le crayon ne commence pas à zéro ! Combien de centimètres mesure-t-il ?',
        short: { key: `mesures:regle:${level}`, text: 'Combien de centimètres ?' },
        stage: { type: 'ruler', start, length },
        choices: numberChoices(rng, length, 4, 1, 10).map((v) => ({ value: v, label: `${v} cm` })),
        choiceStyle: 'words',
        answer: length,
        success: { speak: `Le crayon mesure ${length} centimètres.` },
      };
    }
    if (level === 4) {
      const [a, b] = sample(rng, HEAVY.filter((x, i, all) => all.findIndex((y) => y.w === x.w) === i), 2);
      const heavy = a.w > b.w ? a : b;
      return {
        key: `mesures:lourd:${a.emoji}${b.emoji}`,
        text: 'Lequel est le plus lourd ?',
        instruction: 'Regarde la balance. Lequel est le plus lourd ?',
        short: { key: 'mesures:lourd', text: 'Le plus lourd ?' },
        stage: { type: 'balance', left: a.emoji, right: b.emoji, heavier: heavy === a ? 'left' : 'right' },
        choices: shuffle(rng, [a, b]).map((x) => ({ value: x.emoji, label: x.emoji, name: x.name })),
        choiceStyle: 'pictures',
        answer: heavy.emoji,
        success: { speak: `Oui, ${heavy.name} est plus lourd !`.replace('les livres est', 'les livres sont') },
      };
    }
    const u = pick(rng, UNITS);
    const options = shuffle(rng, [u.unit, ...u.wrong]);
    return {
      key: `mesures:unite:${u.what}`,
      text: `Pour mesurer ${u.what}, on compte…`,
      instruction: `Pour mesurer ${u.what}, on compte en quoi ?`,
      short: { key: 'mesures:unite', text: `Pour ${u.what} ?` },
      stage: { type: 'none' },
      choices: options.map((o) => ({ value: o, label: o })),
      choiceStyle: 'answers',
      answer: u.unit,
      success: { speak: `Pour ${u.what}, on compte ${u.unit}.` },
    };
  },
};

// ---------------------------------------------------------------- Le calendrier

const FACTS = [
  { q: 'Combien y a-t-il de jours dans une semaine ?', a: 7 },
  { q: 'Combien y a-t-il de mois dans une année ?', a: 12 },
  { q: 'Combien y a-t-il de jours en janvier ?', a: 31 },
  { q: 'Combien y a-t-il de jours en avril ?', a: 30 },
];
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
// Se décaler de quelques jours dans la semaine (« après-demain », « il y a 3 jours »).
const DAY_SHIFTS = [
  { d: 2, lead: 'Après-demain', verb: 'ce sera' },
  { d: -2, lead: 'Avant-hier', verb: 'c’était' },
  { d: 3, lead: 'Dans 3 jours', verb: 'ce sera' },
  { d: -3, lead: 'Il y a 3 jours', verb: 'c’était' },
];
const ORDINALS = ['premier', 'deuxième', 'troisième', 'dernier'];

/** « 1er avril », « 12 avril » */
const dateLabel = (day, month) => `${day === 1 ? '1er' : day} ${MONTHS[month]}`;
/** « de mars », « d’avril » */
const ofMonth = (month) => (/^[aeiou]/.test(MONTHS[month]) ? `d’${MONTHS[month]}` : `de ${MONTHS[month]}`);

/** Niveaux 5 à 7 du calendrier : se décaler de 2 ou 3 jours, chercher une date, changer de mois. */
function calendrierPlus(level, rng) {
  if (level === 5) {
    const i = randInt(rng, 0, 6);
    const shift = pick(rng, DAY_SHIFTS);
    const day = (k) => DAYS[(((i + k) % 7) + 7) % 7];
    const answer = day(shift.d);
    // distracteurs instructifs : un jour de trop ou de moins, ou dans l'autre sens
    const sign = Math.sign(shift.d);
    const near = [day(shift.d - sign), day(shift.d + sign), day(-shift.d), ...shuffle(rng, DAYS)];
    const others = [...new Set(near)].filter((d) => d !== answer && d !== DAYS[i]).slice(0, 3);
    const options = shuffle(rng, [answer, ...others]);
    const text = `Aujourd’hui, c’est ${DAYS[i]}. ${shift.lead}, ${shift.verb}…`;
    return {
      key: `calendrier:decaler:${DAYS[i]}:${shift.d}`,
      text,
      instruction: [text, `${options.slice(0, -1).join(', ')} ou ${options.at(-1)} ?`],
      stage: { type: 'none' },
      choices: options.map((d) => ({ value: d, label: d })),
      choiceStyle: 'answers',
      answer,
      success: { speak: `${shift.lead}, ${shift.verb} ${answer}.` },
    };
  }
  const month = randInt(rng, 0, 11);
  const days = MONTH_DAYS[month];
  const firstWeekday = randInt(rng, 0, 6); // 0 = lundi
  if (level === 6) {
    // retrouver une date à partir du jour de la semaine : il faut suivre la colonne
    const weekday = randInt(rng, 0, 6);
    const first = ((weekday - firstWeekday + 7) % 7) + 1;
    const dates = [first, first + 7, first + 14, first + 21, first + 28].filter((d) => d <= days);
    const nth = randInt(rng, 0, 3);
    const answer = nth === 3 ? dates.at(-1) : dates[nth];
    const near = [...dates, answer - 1, answer + 1].filter((d) => d !== answer && d >= 1 && d <= days);
    const options = shuffle(rng, [answer, ...sample(rng, [...new Set(near)], 3)]);
    const question = `Le ${ORDINALS[nth]} ${DAYS[weekday]} ${ofMonth(month)}, c’est le…`;
    return {
      key: `calendrier:chercher:${month}:${firstWeekday}:${weekday}:${nth}`,
      text: question,
      // dit en phrases courtes, chacune enregistrée d'un seul tenant (le mois est sur le calendrier)
      instruction: `Regarde le calendrier ${ofMonth(month)}. Quelle est la date du ${ORDINALS[nth]} ${DAYS[weekday]} ?`,
      short: { key: 'calendrier:chercher', text: question, speak: `Le ${ORDINALS[nth]} ${DAYS[weekday]}, c’est le…` },
      stage: { type: 'calendar', month: MONTHS[month], days, firstWeekday },
      choices: options.map((d) => ({ value: d, label: dateLabel(d, month) })),
      choiceStyle: 'answers',
      answer,
      success: { speak: `Le ${ORDINALS[nth]} ${DAYS[weekday]}, c’est le ${dateLabel(answer, month)}.` },
    };
  }
  // passer au mois suivant : après le 30 ou le 31, on recommence au 1er
  const shift = randInt(rng, 2, 7);
  const date = randInt(rng, days - shift + 1, days);
  const next = (month + 1) % 12;
  const day = date + shift - days;
  const value = (d, m) => `${d}-${m}`;
  const answer = value(day, next);
  const candidates = [
    day > 1 ? [day - 1, next] : [days, month], [day + 1, next], [day + 2, next], [days, month], [days - 1, month],
  ].filter(([d, m]) => value(d, m) !== answer && !(m === month && d === date));
  const unique = [...new Map(candidates.map(([d, m]) => [value(d, m), [d, m]])).values()];
  const options = shuffle(rng, [[day, next], ...unique.slice(0, 3)]);
  const inDays = shift === 7 ? 'une semaine' : `${shift} jours`;
  return {
    key: `calendrier:mois:${month}:${date}:${shift}`,
    text: `Aujourd’hui, c’est le ${dateLabel(date, month)}. Dans ${inDays}, on sera le…`,
    instruction: `Aujourd’hui, c’est le ${dateLabel(date, month)}. Dans ${inDays}, quelle sera la date ? Attention, le mois change !`,
    short: { key: 'calendrier:mois', text: `Le ${dateLabel(date, month)}, dans ${inDays} ?` },
    stage: { type: 'calendar', month: MONTHS[month], days, firstWeekday, mark: date },
    choices: options.map(([d, m]) => ({ value: value(d, m), label: dateLabel(d, m) })),
    choiceStyle: 'answers',
    answer,
    success: { speak: `Le mois ${ofMonth(month)} a ${days} jours. Dans ${inDays}, on sera le ${dateLabel(day, next)}.` },
  };
}

export const calendrier = {
  id: 'calendrier',
  domain: 'monde',
  title: 'Le calendrier',
  icon: '📅',
  skill: 'Lire un calendrier, se repérer : hier, aujourd’hui, demain, dans quelques jours',
  levels: [
    'Hier, aujourd’hui, demain', 'Lire le calendrier', 'Dans quelques jours', 'Semaines, mois et année',
    'Avant-hier, après-demain', 'Le premier lundi du mois', 'Passer au mois suivant',
  ],
  generate(level, rng) {
    if (level >= 5) return calendrierPlus(level, rng);
    if (level === 1) {
      const i = randInt(rng, 0, 6);
      const tomorrow = rng() < 0.5;
      const answer = DAYS[(i + (tomorrow ? 1 : 6)) % 7];
      const options = shuffle(rng, [answer, ...sample(rng, DAYS.filter((d) => d !== answer && d !== DAYS[i]), 2)]);
      const text = tomorrow ? `Aujourd’hui, c’est ${DAYS[i]}. Demain, ce sera…` : `Aujourd’hui, c’est ${DAYS[i]}. Hier, c’était…`;
      return {
        key: `calendrier:${DAYS[i]}:${tomorrow}`,
        text,
        instruction: [text, `${options.slice(0, -1).join(', ')} ou ${options.at(-1)} ?`],
        stage: { type: 'none' },
        choices: options.map((d) => ({ value: d, label: d })),
        choiceStyle: 'answers',
        answer,
        success: { speak: `${tomorrow ? 'Demain' : 'Hier'}, ${tomorrow ? 'ce sera' : 'c’était'} ${answer}.` },
      };
    }
    const month = randInt(rng, 0, 11);
    const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
    const firstWeekday = randInt(rng, 0, 6); // 0 = lundi
    if (level === 2) {
      const date = randInt(rng, 1, days);
      const answer = DAYS[(firstWeekday + date - 1) % 7];
      const options = shuffle(rng, [answer, ...sample(rng, DAYS.filter((d) => d !== answer), 3)]);
      return {
        key: `calendrier:lire:${month}:${firstWeekday}:${date}`,
        text: `Quel jour de la semaine est le ${dateLabel(date, month)} ?`,
        instruction: `Regarde le calendrier. Quel jour de la semaine est le ${dateLabel(date, month)} ?`,
        short: { key: 'calendrier:lire', text: `Le ${dateLabel(date, month)}, c’est quel jour ?` },
        stage: { type: 'calendar', month: MONTHS[month], days, firstWeekday, mark: date },
        choices: options.map((d) => ({ value: d, label: d })),
        choiceStyle: 'answers',
        answer,
        success: { speak: `Le ${dateLabel(date, month)}, c’est un ${answer}.` },
      };
    }
    if (level === 3) {
      const shift = randInt(rng, 2, 6);
      const date = randInt(rng, 1, days - shift);
      const answer = date + shift;
      return {
        key: `calendrier:dans:${month}:${date}:${shift}`,
        text: `Aujourd’hui, c’est le ${dateLabel(date, month)}. Dans ${shift} jours, on sera le…`,
        instruction: `Aujourd’hui, c’est le ${dateLabel(date, month)}. Dans ${shift} jours, quelle sera la date ?`,
        short: { key: 'calendrier:dans', text: `Le ${date === 1 ? '1er' : date}, dans ${shift} jours ?` },
        stage: { type: 'calendar', month: MONTHS[month], days, firstWeekday, mark: date },
        choices: numberChoices(rng, answer, 4, 1, days).map((v) => ({ value: v, label: dateLabel(v, month) })),
        choiceStyle: 'answers',
        answer,
        success: { speak: `Dans ${shift} jours, on sera le ${dateLabel(answer, month)}.` },
      };
    }
    const fact = pick(rng, FACTS);
    return {
      key: `calendrier:fait:${fact.q}`,
      text: fact.q,
      instruction: fact.q,
      stage: { type: 'none' },
      choices: numberChoices(rng, fact.a, 4, 1, 40).map((v) => ({ value: v, label: String(v) })),
      choiceStyle: 'numbers',
      answer: fact.a,
      success: { speak: `${fact.a}, c’est juste !` },
    };
  },
};

export const MESURES_GAMES = [monnaie, mesures, calendrier];
