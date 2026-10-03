// La monnaie (euros), les mesures (longueurs, masses, unités) et le calendrier.

import { pick, randInt, sample, shuffle } from '../random.js';
import { numberChoices } from './helpers.js';
import { DAYS, MONTHS } from './monde.js';

const euros = (n) => `${n} €`;
const numberOptions = (rng, answer, count, min, max) => numberChoices(rng, answer, count, min, max).map((v) => ({ value: v, label: euros(v) }));

// ---------------------------------------------------------------- La monnaie

const SHOP = [
  { emoji: '🧸', name: 'l’ours en peluche' }, { emoji: '📕', name: 'le livre' }, { emoji: '⚽', name: 'le ballon' },
  { emoji: '🖍️', name: 'les crayons' }, { emoji: '🍦', name: 'la glace' }, { emoji: '🪁', name: 'le cerf-volant' },
  { emoji: '🚗', name: 'la petite voiture' }, { emoji: '🎲', name: 'le jeu' },
];

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

export const monnaie = {
  id: 'monnaie',
  domain: 'maths',
  section: 'Heure et mesures',
  title: 'La monnaie',
  icon: '💶',
  skill: 'Compter avec des pièces et des billets, payer, rendre la monnaie',
  levels: ['Pièces de 1 € et 2 € (jusqu’à 10 €)', 'Pièces et billets (jusqu’à 50 €)', 'Payer le bon prix', 'Rendre la monnaie'],
  generate(level, rng) {
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
        values: [1, 2, 5, 10],
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

export const mesures = {
  id: 'mesures',
  domain: 'maths',
  section: 'Heure et mesures',
  title: 'Mesurer',
  icon: '📏',
  skill: 'Comparer et mesurer des longueurs (règle en cm), comparer des masses, choisir l’unité',
  levels: ['Le plus long', 'Mesurer avec la règle', 'La règle sans partir de zéro', 'Le plus lourd', 'Quelle unité ?'],
  generate(level, rng) {
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

export const calendrier = {
  id: 'calendrier',
  domain: 'monde',
  title: 'Le calendrier',
  icon: '📅',
  skill: 'Lire un calendrier, se repérer : hier, aujourd’hui, demain, dans quelques jours',
  levels: ['Hier, aujourd’hui, demain', 'Lire le calendrier', 'Dans quelques jours', 'Semaines, mois et année'],
  generate(level, rng) {
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
        text: `Quel jour de la semaine est le ${date} ${MONTHS[month]} ?`,
        instruction: `Regarde le calendrier. Quel jour de la semaine est le ${date} ${MONTHS[month]} ?`,
        short: { key: 'calendrier:lire', text: `Le ${date} ${MONTHS[month]}, c’est quel jour ?` },
        stage: { type: 'calendar', month: MONTHS[month], days, firstWeekday, mark: date },
        choices: options.map((d) => ({ value: d, label: d })),
        choiceStyle: 'answers',
        answer,
        success: { speak: `Le ${date} ${MONTHS[month]}, c’est un ${answer}.` },
      };
    }
    if (level === 3) {
      const shift = randInt(rng, 2, 6);
      const date = randInt(rng, 1, days - shift);
      const answer = date + shift;
      return {
        key: `calendrier:dans:${month}:${date}:${shift}`,
        text: `Aujourd’hui, c’est le ${date} ${MONTHS[month]}. Dans ${shift} jours, on sera le…`,
        instruction: `Aujourd’hui, c’est le ${date} ${MONTHS[month]}. Dans ${shift} jours, quelle sera la date ?`,
        short: { key: 'calendrier:dans', text: `Le ${date}, dans ${shift} jours ?` },
        stage: { type: 'calendar', month: MONTHS[month], days, firstWeekday, mark: date },
        choices: numberChoices(rng, answer, 4, 1, days).map((v) => ({ value: v, label: `${v} ${MONTHS[month]}` })),
        choiceStyle: 'answers',
        answer,
        success: { speak: `Dans ${shift} jours, on sera le ${answer} ${MONTHS[month]}.` },
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
