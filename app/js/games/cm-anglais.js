// L'anglais du CM (CM1 et CM2, niveau A1 du cadre européen), d'après les attendus de fin de CM1 et de
// CM2 : épeler avec le nom anglais des lettres, les jours, les mois et la date, l'heure, la famille
// (his, her), dire ce qu'on aime ou pas, se décrire, situer un lieu de la ville, les mots des questions
// (who, what, where, when…), le présent simple à la 3e personne (-s, -es, doesn't, does).
// Chaque niveau mêle plusieurs formes de questions, qui alternent avec l'index de la question : à
// écouter (listenOnly : l'anglais n'est qu'entendu), à lire, du français vers l'anglais et de
// l'anglais vers le français. Les consignes françaises sont fixes et les phrases anglaises viennent de
// listes fermées : Estelle les dit d'un seul son. Les prénoms des phrases sont des prénoms anglais
// courants (jamais celui de l'enfant).

import { pick, randInt, sample, shuffle } from '../random.js';

const EN = 'en-GB';
/** Un morceau dit en anglais, un peu plus lentement que la normale. */
const say = (text, rate = 0.85) => ({ text, lang: EN, rate });
const enChoice = (value) => ({ value, label: value, lang: 'en' });
const frChoice = (value) => ({ value, label: value });
const capital = (text) => `${text[0].toUpperCase()}${text.slice(1)}`;

/** Un mot en gros caractères (8 lettres au plus : plus long, il ne tient pas sur un petit téléphone), sinon une ligne. */
function wordStage(text, lang) {
  return { type: text.length <= 8 ? 'word' : 'sentence', text, ...(lang ? { lang } : {}) };
}

/**
 * Une question à choix multiple : les `options` (la réponse comprise) sont mélangées, puis changées
 * en choix par `choice` ; avec `listen`, l'anglais n'est qu'entendu (scène « écoute », listenOnly).
 */
function question(rng, { key, text, instruction = text, short, replay, stage, listen = false, options, choice = enChoice, style, answer, success }) {
  return {
    key,
    text,
    instruction,
    short,
    ...(replay ? { replay } : {}),
    stage: listen ? { type: 'listen' } : stage,
    ...(listen ? { listenOnly: true } : {}),
    choices: shuffle(rng, options).map(choice),
    choiceStyle: style,
    answer,
    success: { speak: success },
  };
}

// ---------------------------------------------------------------- Niveau 1 : l'alphabet

// Les lettres qu'un petit Français confond en anglais : A se dit « é », E se dit « i », I se dit
// « aï », R presque « a », G et J s'échangent, Y se dit « ouaï »… Chaque lettre est proposée avec des
// lettres qui se disent presque pareil (Z n'est jamais dite : « zed » ou « zee » selon le pays).
const LETTER_TRAPS = {
  A: ['E', 'I', 'R', 'H'], E: ['I', 'A', 'G'], I: ['E', 'Y', 'A'], R: ['A', 'E', 'I'], G: ['J', 'E', 'I'], J: ['G', 'A', 'H'],
  H: ['A', 'J', 'K'], K: ['A', 'J', 'Q'], Y: ['W', 'I', 'U'], W: ['Y', 'U', 'V'], U: ['Y', 'W', 'Q'], Q: ['U', 'K', 'C'],
  C: ['S', 'E', 'K'], S: ['C', 'X', 'F'], X: ['S', 'Z', 'C'], V: ['W', 'B', 'E'], B: ['V', 'P', 'D'], O: ['U', 'A', 'E'],
};
// Des mots courts qui ne diffèrent que par une lettre piège : il faut reconnaître chaque lettre épelée.
const SPELL_SETS = [
  ['bag', 'big', 'bug'], ['pen', 'pin', 'pan'], ['hat', 'hot', 'hit'], ['cat', 'cut', 'cap', 'cup'], ['sit', 'set', 'sat'],
  ['pet', 'pat', 'put'], ['ship', 'shop', 'sheep'], ['hair', 'here', 'hear'], ['white', 'write', 'wide'], ['yes', 'yet', 'wet'],
  ['game', 'gym', 'jam'], ['red', 'read', 'road'], ['tree', 'three', 'there'], ['bike', 'bake', 'book'], ['week', 'weak', 'wake'],
  ['blue', 'glue', 'clue'], ['ball', 'bell', 'bill'], ['rain', 'ran', 'run'], ['hand', 'head', 'had'],
];
// Le mot de l'image, et deux façons de l'écrire « comme on l'entend » (à la française).
const SPELLINGS = [
  { en: 'house', emoji: '🏠', wrong: ['hause', 'hous'] }, { en: 'school', emoji: '🏫', wrong: ['scool', 'skool'] },
  { en: 'chair', emoji: '🪑', wrong: ['cher', 'chaire'] }, { en: 'tree', emoji: '🌳', wrong: ['tri', 'trea'] },
  { en: 'mouse', emoji: '🐭', wrong: ['maus', 'mause'] }, { en: 'horse', emoji: '🐴', wrong: ['hors', 'horce'] },
  { en: 'bird', emoji: '🐦', wrong: ['berd', 'beurd'] }, { en: 'water', emoji: '💧', wrong: ['woter', 'watter'] },
  { en: 'cheese', emoji: '🧀', wrong: ['chiz', 'cheeze'] }, { en: 'apple', emoji: '🍎', wrong: ['aple', 'appel'] },
  { en: 'pencil', emoji: '✏️', wrong: ['pensil', 'pencel'] }, { en: 'juice', emoji: '🧃', wrong: ['jus', 'juce'] },
  { en: 'eye', emoji: '👁️', wrong: ['ai', 'ey'] }, { en: 'clock', emoji: '⏰', wrong: ['klok', 'clok'] },
  { en: 'girl', emoji: '👧', wrong: ['gerl', 'girle'] }, { en: 'bike', emoji: '🚲', wrong: ['baik', 'bik'] },
  { en: 'key', emoji: '🔑', wrong: ['ki', 'kee'] }, { en: 'fish', emoji: '🐟', wrong: ['fich', 'fishe'] },
  { en: 'shoe', emoji: '👟', wrong: ['chou', 'shou'] }, { en: 'nose', emoji: '👃', wrong: ['noze', 'nos'] },
];

/** « bag » → « B, A, G. » : les lettres dites une à une. */
const spell = (word) => `${word.toUpperCase().split('').join(', ')}.`;

function lettre(rng) {
  const letter = pick(rng, Object.keys(LETTER_TRAPS));
  const sound = say(`The letter ${letter}.`, 0.8);
  return question(rng, {
    key: `anglais-cm:lettre:${letter}`,
    text: 'Écoute la lettre anglaise, et touche-la.',
    instruction: ['Écoute la lettre anglaise, et touche-la.', sound],
    short: { key: 'anglais-cm:lettre', text: 'Quelle lettre ?', speak: [sound] },
    replay: [sound],
    listen: true,
    options: [letter, ...sample(rng, LETTER_TRAPS[letter], 3)],
    style: 'letters',
    answer: letter,
    success: [sound],
  });
}

function motEpele(rng) {
  const set = pick(rng, SPELL_SETS);
  const word = pick(rng, set);
  const sound = say(spell(word), 0.8);
  return question(rng, {
    key: `anglais-cm:epele:${word}`,
    text: 'Écoute le mot épelé en anglais, et touche-le.',
    instruction: ['Écoute le mot épelé en anglais, et touche-le.', sound],
    short: { key: 'anglais-cm:epele', text: 'Quel mot ?', speak: [sound] },
    replay: [sound],
    listen: true,
    options: set,
    style: 'words',
    answer: word,
    success: [sound, say(word)],
  });
}

function orthographe(rng) {
  const item = pick(rng, SPELLINGS);
  const word = say(item.en);
  return question(rng, {
    key: `anglais-cm:orthographe:${item.en}`,
    text: 'Quel mot anglais est bien écrit ?',
    instruction: ['Regarde l’image, et écoute le mot anglais. Lequel est bien écrit ?', word],
    short: { key: 'anglais-cm:orthographe', text: 'Bien écrit ?', speak: [word] },
    replay: [word],
    stage: { type: 'picture', emoji: item.emoji },
    options: [item.en, ...item.wrong],
    style: 'words',
    answer: item.en,
    success: [say(spell(item.en), 0.8)],
  });
}

// ---------------------------------------------------------------- Niveau 2 : les jours, les mois, la date

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
// Les jours et les mois qu'on confond : Tuesday et Thursday, June et July, March et May…
const DAY_TRAPS = {
  Monday: ['Sunday', 'Tuesday', 'Friday'], Tuesday: ['Thursday', 'Wednesday', 'Monday'], Wednesday: ['Tuesday', 'Thursday', 'Monday'],
  Thursday: ['Tuesday', 'Friday', 'Wednesday'], Friday: ['Thursday', 'Saturday', 'Tuesday'], Saturday: ['Sunday', 'Friday', 'Thursday'],
  Sunday: ['Saturday', 'Monday', 'Tuesday'],
};
const MONTH_TRAPS = {
  January: ['June', 'July', 'February'], February: ['January', 'November', 'December'], March: ['May', 'April', 'August'],
  April: ['August', 'March', 'May'], May: ['March', 'June', 'April'], June: ['July', 'January', 'May'], July: ['June', 'January', 'August'],
  August: ['April', 'October', 'July'], September: ['November', 'December', 'October'], October: ['November', 'August', 'September'],
  November: ['September', 'December', 'October'], December: ['November', 'September', 'February'],
};
// Les dates à entendre et à écrire (jour, mois de 0 à 11) : les ordinaux qui se ressemblent
// (third, thirteenth, thirtieth…) et ceux qui ne finissent pas en -th (1st, 2nd, 3rd, 21st…).
const DATES = [
  [1, 0], [13, 0], [30, 0], [2, 1], [14, 1], [3, 2], [15, 2], [31, 2], [4, 3], [16, 3], [5, 4], [17, 4], [6, 5], [18, 5], [21, 5],
  [7, 6], [19, 6], [8, 7], [20, 7], [9, 8], [21, 8], [10, 9], [22, 9], [31, 9], [11, 10], [23, 10], [12, 11], [25, 11], [31, 11],
];
// Les jours qu'on confond à l'oreille ou à l'écrit (fifth et fifteenth, twelfth et twentieth…).
const DAY_ALIKES = {
  1: [21, 3], 2: [22, 12], 3: [13, 23], 4: [14], 5: [15], 6: [16], 7: [17], 8: [18], 9: [19], 10: [20, 11], 11: [10, 12], 12: [20, 2],
  13: [30, 3], 14: [4], 15: [5], 16: [6], 17: [7], 18: [8], 19: [9], 20: [12, 2], 21: [1, 23], 22: [2, 12], 23: [3, 13], 25: [5, 15],
  30: [13, 3], 31: [30, 13],
};
const ORDINALS = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh',
  'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth', 'twentieth'];
// Des fêtes dont le mois ne fait pas de doute.
const EVENTS = [
  { q: 'When is Christmas?', emoji: '🎄', month: 11, a: 'Christmas is in December.' },
  { q: 'When is Halloween?', emoji: '🎃', month: 9, a: 'Halloween is in October.' },
  { q: 'When is Valentine’s Day?', emoji: '❤️', month: 1, a: 'Valentine’s Day is in February.' },
  { q: 'When is New Year’s Day?', emoji: '🎉', month: 0, a: 'New Year’s Day is in January.' },
  { q: 'When is Bastille Day?', emoji: '🎆', month: 6, a: 'Bastille Day is in July.' },
  { q: 'When does school start in France?', emoji: '🎒', month: 8, a: 'School starts in September.' },
];

/** 21 → « twenty-first ». */
function ordinal(n) {
  if (n <= 20) return ORDINALS[n];
  if (n < 30) return `twenty-${ORDINALS[n - 20]}`;
  return n === 30 ? 'thirtieth' : 'thirty-first';
}
/** 1st, 2nd, 3rd, 4th… 11th, 12th, 13th… 21st, 22nd, 23rd. */
function suffix(n) {
  if (n >= 11 && n <= 13) return 'th';
  return { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th';
}
const writtenDate = (d, m) => `${d}${suffix(d)} ${MONTHS[m]}`;
const spokenDate = (d, m) => `The ${ordinal(d)} of ${MONTHS[m]}.`;

/**
 * Quatre dates écrites dont la bonne : la faute de suffixe (21th, 12nd) si `suffixe`, un jour qui se
 * ressemble, un mois qu'on confond, puis les deux à la fois ; toujours des dates qui existent.
 */
function dateOptions(rng, d, m, suffixe) {
  const exists = (day, month) => day >= 1 && day <= MONTH_DAYS[month];
  const out = new Set([writtenDate(d, m)]);
  const add = (label) => { if (out.size < 4) out.add(label); };
  if (suffixe && suffix(d) !== 'th') add(`${d}th ${MONTHS[m]}`);
  if (suffixe && d >= 11 && d <= 13) add(`${d}${['st', 'nd', 'rd'][d - 11]} ${MONTHS[m]}`);
  const days = shuffle(rng, DAY_ALIKES[d]);
  const months = shuffle(rng, MONTH_TRAPS[MONTHS[m]].map((name) => MONTHS.indexOf(name)));
  const day = days.find((x) => exists(x, m));
  const month = months.find((x) => exists(d, x));
  if (day) add(writtenDate(day, m));
  if (month !== undefined) add(writtenDate(d, month));
  for (const x of days) for (const y of months) if (exists(x, y)) add(writtenDate(x, y));
  for (const delta of [1, -1, 2, -2]) if (exists(d + delta, m)) add(writtenDate(d + delta, m));
  return [...out];
}

/** Hier ou demain : on lit la question (réponse en anglais) ou on l'entend (réponse en français). */
function jour(rng, listen) {
  const today = randInt(rng, 0, 6);
  const past = rng() < 0.5;
  const target = (today + (past ? 6 : 1)) % 7;
  const sound = say(`Today is ${DAYS[today]}. ${past ? 'What day was yesterday?' : 'What day is tomorrow?'}`);
  // l'autre voisin, le jour même, et deux jours avant (ou après)
  const others = [(today + (past ? 1 : 6)) % 7, today, (today + (past ? 5 : 2)) % 7];
  const names = listen ? JOURS : DAYS;
  const text = listen ? 'Écoute, et touche le bon jour.' : 'Lis, et touche le bon jour.';
  return question(rng, {
    key: `anglais-cm:jour:${listen ? 'ecoute' : 'lis'}:${DAYS[today]}:${past ? 'hier' : 'demain'}`,
    text,
    instruction: [text, sound],
    short: { key: `anglais-cm:jour-${listen ? 'ecoute' : 'lis'}`, text: 'Quel jour ?', speak: [sound] },
    replay: [sound],
    stage: { type: 'sentence', text: sound.text, lang: 'en' },
    listen,
    options: [target, ...others].map((i) => names[i]),
    choice: listen ? frChoice : enChoice,
    style: 'words',
    answer: names[target],
    success: [
      say(past ? `Yesterday was ${DAYS[target]}.` : `Tomorrow is ${DAYS[target]}.`),
      ...(listen ? [past ? `Hier, c’était ${JOURS[target]}.` : `Demain, ce sera ${JOURS[target]}.`] : []),
    ],
  });
}

function moisSuivant(rng) {
  const m = randInt(rng, 0, 11);
  const after = rng() < 0.5;
  const target = (m + (after ? 1 : 11)) % 12;
  const ask = say(`What month comes ${after ? 'after' : 'before'} ${MONTHS[m]}?`);
  return question(rng, {
    key: `anglais-cm:mois:${after ? 'apres' : 'avant'}:${MONTHS[m]}`,
    text: 'Lis la question, et touche le bon mois.',
    instruction: ['Lis la question, et touche le bon mois.', ask],
    short: { key: 'anglais-cm:mois', text: 'Quel mois ?', speak: [ask] },
    replay: [ask],
    stage: { type: 'sentence', text: ask.text, lang: 'en' },
    options: [target, (m + (after ? 11 : 1)) % 12, m, (m + (after ? 2 : 10)) % 12].map((i) => MONTHS[i]),
    style: 'words',
    answer: MONTHS[target],
    success: [say(`${MONTHS[target]} comes ${after ? 'after' : 'before'} ${MONTHS[m]}.`)],
  });
}

/** Un jour ou un mois, du français vers l'anglais. */
function jourOuMois(rng) {
  const day = rng() < 0.4;
  const i = randInt(rng, 0, day ? 6 : 11);
  const en = day ? DAYS[i] : MONTHS[i];
  return question(rng, {
    key: `anglais-cm:jour-mois:${en}`,
    text: 'Comment dit-on ce mot en anglais ?',
    short: { key: 'anglais-cm:jour-mois', text: 'En anglais ?' },
    stage: wordStage(day ? JOURS[i] : MOIS[i]),
    options: [en, ...(day ? DAY_TRAPS : MONTH_TRAPS)[en]],
    style: 'words',
    answer: en,
    success: [say(en)],
  });
}

function dateEntendue(rng) {
  const [d, m] = pick(rng, DATES);
  const sound = say(spokenDate(d, m));
  return question(rng, {
    key: `anglais-cm:date-ecoute:${d}:${m}`,
    text: 'Écoute la date en anglais, et touche-la.',
    instruction: ['Écoute la date en anglais, et touche-la.', sound],
    short: { key: 'anglais-cm:date-ecoute', text: 'Quelle date ?', speak: [sound] },
    replay: [sound],
    listen: true,
    options: dateOptions(rng, d, m, false),
    style: 'answers',
    answer: writtenDate(d, m),
    success: [sound],
  });
}

function dateEcrite(rng) {
  const [d, m] = pick(rng, DATES);
  return question(rng, {
    key: `anglais-cm:date-ecrite:${d}:${m}`,
    text: 'Comment écrit-on cette date en anglais ?',
    short: { key: 'anglais-cm:date-ecrite', text: 'En anglais ?' },
    stage: { type: 'sentence', text: `Le ${d === 1 ? '1er' : d} ${MOIS[m]}` },
    options: dateOptions(rng, d, m, true),
    style: 'answers',
    answer: writtenDate(d, m),
    success: [say(spokenDate(d, m))],
  });
}

function fete(rng) {
  const event = pick(rng, EVENTS);
  const ask = say(event.q);
  return question(rng, {
    key: `anglais-cm:fete:${event.q}`,
    text: 'Lis la question, et touche le bon mois.',
    instruction: ['Lis la question, et touche le bon mois.', ask],
    short: { key: 'anglais-cm:fete', text: 'Quel mois ?', speak: [ask] },
    replay: [ask],
    stage: { type: 'sentence', text: `${event.emoji} ${event.q}`, lang: 'en' },
    options: [MONTHS[event.month], ...MONTH_TRAPS[MONTHS[event.month]]],
    style: 'words',
    answer: MONTHS[event.month],
    success: [say(event.a)],
  });
}

// ---------------------------------------------------------------- Niveau 3 : l'heure

const HOURS = ['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven'];
const MINUTES = [0, 15, 30, 45];
/** Une heure du cadran, de 1 à 12 (0 → 12, 13 → 1). */
const clockHour = (h) => ((h + 11) % 12) + 1;

/** 6:45 → « It’s quarter to seven. » */
function timeSentence(h, m) {
  if (m === 0) return `It’s ${HOURS[h % 12]} o’clock.`;
  if (m === 15) return `It’s quarter past ${HOURS[h % 12]}.`;
  if (m === 30) return `It’s half past ${HOURS[h % 12]}.`;
  return `It’s quarter to ${HOURS[(h + 1) % 12]}.`;
}
const digits = (h, m) => `${h}:${String(m).padStart(2, '0')}`;

/**
 * Les heures pièges : « quarter to seven » n'est pas 7:45 mais 6:45 ; quarter past et quarter to
 * échangés, l'heure d'avant ou d'après, la demie.
 */
function timeTraps(rng, h, m) {
  const at = (hh, mm) => [clockHour(hh), mm];
  const traps = {
    0: [at(h + 1, 0), at(h - 1, 0), at(h, 30), at(h - 1, 45)],
    15: [at(h - 1, 45), at(h + 1, 15), at(h, 45), at(h, 30)],
    30: [at(h - 1, 30), at(h + 1, 30), at(h, 15), at(h, 0)],
    45: [at(h - 1, 45), at(h + 1, 15), at(h, 15), at(h, 30), at(h + 1, 45)],
  }[m];
  return [[h, m], ...sample(rng, traps, 3)];
}

/** L'heure en chiffres ou sur l'horloge : quelle phrase anglaise ? */
function heurePhrase(rng, clock) {
  const h = randInt(rng, 1, 12);
  const m = pick(rng, MINUTES);
  const ask = say('What time is it?');
  return question(rng, {
    key: `anglais-cm:heure-phrase:${clock ? 'horloge' : 'chiffres'}:${h}:${m}`,
    text: 'Quelle heure est-il ? Touche la bonne phrase en anglais.',
    instruction: ['Quelle heure est-il ? Touche la bonne phrase en anglais.', ask],
    short: { key: 'anglais-cm:heure-phrase', text: 'Quelle phrase ?', speak: [ask] },
    stage: clock ? { type: 'clock', h, m } : { type: 'word', text: digits(h, m) },
    options: timeTraps(rng, h, m).map(([hh, mm]) => timeSentence(hh, mm)),
    style: 'sentences',
    answer: timeSentence(h, m),
    success: [say(timeSentence(h, m))],
  });
}

/** La phrase anglaise (lue ou entendue) : quelle heure en chiffres ? */
function heureChiffres(rng, listen) {
  const h = randInt(rng, 1, 12);
  const m = pick(rng, MINUTES);
  const sound = say(timeSentence(h, m));
  const text = listen ? 'Écoute l’heure en anglais, et touche la bonne heure.' : 'Lis l’heure en anglais, et touche la bonne heure.';
  return question(rng, {
    key: `anglais-cm:heure-chiffres:${listen ? 'ecoute' : 'lis'}:${h}:${m}`,
    text,
    instruction: [text, sound],
    short: { key: `anglais-cm:heure-${listen ? 'ecoute' : 'lis'}`, text: 'Quelle heure ?', speak: [sound] },
    replay: [sound],
    stage: { type: 'sentence', text: sound.text, lang: 'en' },
    listen,
    options: timeTraps(rng, h, m).map(([hh, mm]) => digits(hh, mm)),
    choice: frChoice,
    style: 'words',
    answer: digits(h, m),
    success: [sound],
  });
}

// ---------------------------------------------------------------- Niveau 4 : la famille

// `near` : les mots qu'on confond avec lui (pièges) ; `ma` : « this is my… » en français.
const FAMILY = {
  mother: { fr: 'la mère', ma: 'ma mère', emoji: '👩', near: ['father', 'grandmother', 'aunt', 'sister'] },
  father: { fr: 'le père', ma: 'mon père', emoji: '👨', near: ['mother', 'grandfather', 'uncle', 'brother'] },
  sister: { fr: 'la sœur', ma: 'ma sœur', emoji: '👧', near: ['brother', 'cousin', 'mother', 'aunt'] },
  brother: { fr: 'le frère', ma: 'mon frère', emoji: '👦', near: ['sister', 'cousin', 'father', 'uncle'] },
  grandmother: { fr: 'la grand-mère', ma: 'ma grand-mère', emoji: '👵', near: ['grandfather', 'mother', 'aunt'] },
  grandfather: { fr: 'le grand-père', ma: 'mon grand-père', emoji: '👴', near: ['grandmother', 'father', 'uncle'] },
  aunt: { fr: 'la tante', near: ['uncle', 'cousin', 'mother', 'sister'] },
  uncle: { fr: 'l’oncle', near: ['aunt', 'cousin', 'father', 'brother'] },
  cousin: { fr: 'le cousin', alt: 'la cousine', near: ['aunt', 'uncle', 'sister', 'brother'] },
};
const FAMILY_WORDS = Object.keys(FAMILY);
// Qui est qui : « My mother’s sister is my… » (aunt).
const LINKS = [
  ['My mother’s sister is my…', 'aunt'], ['My father’s sister is my…', 'aunt'],
  ['My mother’s brother is my…', 'uncle'], ['My father’s brother is my…', 'uncle'],
  ['My mother’s mother is my…', 'grandmother'], ['My father’s mother is my…', 'grandmother'],
  ['My mother’s father is my…', 'grandfather'], ['My father’s father is my…', 'grandfather'],
  ['My aunt’s son is my…', 'cousin'], ['My aunt’s daughter is my…', 'cousin'],
  ['My uncle’s son is my…', 'cousin'], ['My uncle’s daughter is my…', 'cousin'],
];
const GIRLS = ['Anna', 'Lucy', 'Emma', 'Mia'];
const BOYS = ['Tom', 'Ben', 'Jack', 'Leo'];
// His ou her : la personne dont on parle, et le prénom de son frère, de sa sœur, de sa maman…
const RELATIVES = [
  { en: 'sister', names: GIRLS }, { en: 'brother', names: BOYS }, { en: 'cousin', names: [...GIRLS, ...BOYS] },
  { en: 'mum', names: ['Kate', 'Sarah'] }, { en: 'dad', names: ['Paul', 'Mark'] },
];

function familleFrancais(rng) {
  const word = pick(rng, FAMILY_WORDS);
  const fr = FAMILY[word].alt && rng() < 0.5 ? FAMILY[word].alt : FAMILY[word].fr;
  return question(rng, {
    key: `anglais-cm:famille-fr:${fr}`,
    text: 'Comment dit-on en anglais ?',
    instruction: 'Comment dit-on ce mot en anglais ?',
    short: { key: 'anglais-cm:famille-fr', text: 'En anglais ?' },
    stage: wordStage(fr),
    options: [word, ...sample(rng, FAMILY[word].near, 3)],
    style: 'words',
    answer: word,
    success: [say(word)],
  });
}

function familleAnglais(rng) {
  const word = pick(rng, FAMILY_WORDS);
  const sound = say(word);
  return question(rng, {
    key: `anglais-cm:famille-en:${word}`,
    text: 'Que veut dire ce mot anglais ?',
    instruction: ['Que veut dire ce mot anglais ?', sound],
    short: { key: 'anglais-cm:famille-en', text: 'Que veut dire ce mot ?', speak: [sound] },
    replay: [sound],
    stage: wordStage(word, 'en'),
    options: [word, ...sample(rng, FAMILY[word].near, 3)].map((w) => FAMILY[w].fr),
    choice: frChoice,
    style: 'words',
    answer: FAMILY[word].fr,
    success: [sound, `${capital(FAMILY[word].fr)} !`],
  });
}

function lien(rng) {
  const [sentence, word] = pick(rng, LINKS);
  const sound = say(sentence);
  return question(rng, {
    key: `anglais-cm:lien:${sentence}`,
    text: 'Lis la phrase, et trouve le mot qui manque.',
    instruction: ['Lis la phrase, et trouve le mot qui manque.', sound],
    short: { key: 'anglais-cm:lien', text: 'Le mot qui manque ?', speak: [sound] },
    replay: [sound],
    stage: { type: 'sentence', text: sentence, lang: 'en' },
    options: [word, ...sample(rng, FAMILY[word].near, 3)],
    style: 'words',
    answer: word,
    success: [say(sentence.replace('…', ` ${word}.`))],
  });
}

/** His ou her : en anglais, le mot dépend de la personne dont on parle (Tom → his, Anna → her). */
function hisHer(rng) {
  const girl = rng() < 0.5;
  const who = pick(rng, girl ? GIRLS : BOYS);
  const relative = pick(rng, RELATIVES);
  const name = pick(rng, relative.names.filter((n) => n !== who));
  const answer = girl ? 'Her' : 'His';
  const sound = say(`This is ${who}. … ${relative.en} is ${name}.`);
  return question(rng, {
    key: `anglais-cm:his-her:${who}:${relative.en}:${name}`,
    text: 'Lis les phrases, et trouve le mot qui manque.',
    instruction: ['Lis les phrases, et trouve le mot qui manque.', sound],
    short: { key: 'anglais-cm:his-her', text: 'Le mot qui manque ?', speak: [sound] },
    replay: [sound],
    stage: { type: 'sentence', text: `This is ${who}. ___ ${relative.en} is ${name}.`, lang: 'en' },
    options: ['Her', 'His', 'She', 'He'],
    style: 'words',
    answer,
    success: [say(`This is ${who}. ${answer} ${relative.en} is ${name}.`)],
  });
}

function familleEntendue(rng) {
  const word = pick(rng, FAMILY_WORDS.filter((w) => FAMILY[w].emoji));
  const sound = say(`This is my ${word}.`);
  const near = FAMILY[word].near.filter((w) => FAMILY[w].emoji);
  return question(rng, {
    key: `anglais-cm:famille-ecoute:${word}`,
    text: 'Écoute, et touche la bonne personne.',
    instruction: ['Écoute, et touche la bonne personne.', sound],
    short: { key: 'anglais-cm:famille-ecoute', text: 'Qui est-ce ?', speak: [sound] },
    replay: [sound],
    listen: true,
    options: [word, ...sample(rng, near, 2)],
    choice: (w) => ({ value: w, label: FAMILY[w].emoji, name: FAMILY[w].fr }),
    style: 'pictures',
    answer: word,
    success: [sound, `C’est ${FAMILY[word].ma}.`],
  });
}

// ---------------------------------------------------------------- Niveau 5 : I like, I don’t like

// À manger (food) et des activités ; `you` : la question « Do you like riding your bike? ».
const LIKES = [
  { en: 'apples', fr: 'les pommes', emoji: '🍎', food: true }, { en: 'bananas', fr: 'les bananes', emoji: '🍌', food: true },
  { en: 'carrots', fr: 'les carottes', emoji: '🥕', food: true }, { en: 'pizza', fr: 'la pizza', emoji: '🍕', food: true },
  { en: 'chocolate', fr: 'le chocolat', emoji: '🍫', food: true }, { en: 'cheese', fr: 'le fromage', emoji: '🧀', food: true },
  { en: 'milk', fr: 'le lait', emoji: '🥛', food: true }, { en: 'ice cream', fr: 'la glace', emoji: '🍦', food: true },
  { en: 'strawberries', fr: 'les fraises', emoji: '🍓', food: true }, { en: 'tomatoes', fr: 'les tomates', emoji: '🍅', food: true },
  { en: 'eggs', fr: 'les œufs', emoji: '🥚', food: true }, { en: 'fish', fr: 'le poisson', emoji: '🐟', food: true },
  { en: 'cake', fr: 'le gâteau', emoji: '🍰', food: true }, { en: 'broccoli', fr: 'le brocoli', emoji: '🥦', food: true },
  { en: 'bread', fr: 'le pain', emoji: '🍞', food: true }, { en: 'grapes', fr: 'le raisin', emoji: '🍇', food: true },
  { en: 'swimming', fr: 'nager', emoji: '🏊' }, { en: 'reading', fr: 'lire', emoji: '📚' },
  { en: 'dancing', fr: 'danser', emoji: '💃' }, { en: 'singing', fr: 'chanter', emoji: '🎤' },
  { en: 'drawing', fr: 'dessiner', emoji: '🎨' }, { en: 'cooking', fr: 'cuisiner', emoji: '🍳' },
  { en: 'playing football', fr: 'jouer au football', emoji: '⚽' }, { en: 'playing tennis', fr: 'jouer au tennis', emoji: '🎾' },
  { en: 'playing video games', fr: 'jouer aux jeux vidéo', emoji: '🎮' },
  { en: 'riding my bike', you: 'riding your bike', fr: 'faire du vélo', emoji: '🚲' },
  { en: 'skiing', fr: 'faire du ski', emoji: '🎿' }, { en: 'watching TV', fr: 'regarder la télé', emoji: '📺' },
  { en: 'playing the piano', fr: 'jouer du piano', emoji: '🎹' }, { en: 'playing basketball', fr: 'jouer au basket', emoji: '🏀' },
];
const likeEn = (item, like) => `I ${like ? 'like' : 'don’t like'} ${item.en}.`;
const likeFr = (item, like) => (like ? `J’aime ${item.fr}.` : `Je n’aime pas ${item.fr}.`);
/** Deux choses du même genre (deux aliments ou deux activités). */
function twoLikes(rng) {
  const item = pick(rng, LIKES);
  return [item, pick(rng, LIKES.filter((i) => i !== item && Boolean(i.food) === Boolean(item.food)))];
}

/** L'image, ✅ j’aime ou ❌ je n’aime pas (le symbole et les mots, jamais la couleur seule) : quelle phrase ? */
function aimeImage(rng) {
  const [item, other] = twoLikes(rng);
  const like = rng() < 0.5;
  return question(rng, {
    key: `anglais-cm:aime-image:${item.en}:${like ? 'oui' : 'non'}`,
    text: 'Quelle phrase anglaise va avec l’image ?',
    instruction: 'Regarde l’image, et touche la phrase anglaise qui va avec.',
    short: { key: 'anglais-cm:aime-image', text: 'Quelle phrase ?' },
    stage: { type: 'sentence', text: `${item.emoji} ${like ? '✅ j’aime' : '❌ je n’aime pas'}` },
    options: [likeEn(item, like), likeEn(item, !like), likeEn(other, like), likeEn(other, !like)],
    style: 'sentences',
    answer: likeEn(item, like),
    success: [say(likeEn(item, like))],
  });
}

/** La phrase anglaise, lue ou entendue : que veut-elle dire ? */
function aimeSens(rng, listen) {
  const [item, other] = twoLikes(rng);
  const like = rng() < 0.5;
  const sound = say(likeEn(item, like));
  const text = listen ? 'Écoute la phrase anglaise. Que veut-elle dire ?' : 'Lis la phrase anglaise. Que veut-elle dire ?';
  return question(rng, {
    key: `anglais-cm:aime-${listen ? 'ecoute' : 'lis'}:${item.en}:${like ? 'oui' : 'non'}`,
    text,
    instruction: [text, sound],
    short: { key: `anglais-cm:aime-${listen ? 'ecoute' : 'lis'}`, text: 'Que veut dire la phrase ?', speak: [sound] },
    replay: [sound],
    stage: { type: 'sentence', text: sound.text, lang: 'en' },
    listen,
    options: [likeFr(item, like), likeFr(item, !like), likeFr(other, like)],
    choice: frChoice,
    style: 'sentences',
    answer: likeFr(item, like),
    success: [sound, likeFr(item, like)],
  });
}

/** « Do you like pizza? » : la réponse courte (Yes, I do. / No, I don’t.), d'après ✅ ou ❌ et les mots. */
function tuAimes(rng) {
  const item = pick(rng, LIKES);
  const like = rng() < 0.5;
  const ask = say(`Do you like ${item.you || item.en}?`);
  const feeling = like ? 'Tu aimes ça.' : 'Tu n’aimes pas ça.';
  const mark = like ? '✅' : '❌';
  const answer = like ? 'Yes, I do.' : 'No, I don’t.';
  return question(rng, {
    key: `anglais-cm:tu-aimes:${item.en}:${like ? 'oui' : 'non'}`,
    text: `${mark} ${feeling} Que réponds-tu ?`,
    instruction: [`${feeling} Que réponds-tu ?`, ask],
    short: { key: 'anglais-cm:tu-aimes', text: `${mark} ${feeling}`, speak: [feeling, ask] },
    replay: [ask],
    stage: { type: 'sentence', text: `${item.emoji} ${ask.text}`, lang: 'en' },
    options: ['Yes, I do.', 'No, I don’t.', 'Yes, I am.', 'No, I’m not.'],
    style: 'answers',
    answer,
    success: [ask, say(answer)],
  });
}

/** « I don’t like football. I like swimming. » : qu'est-ce que l'enfant aime ? */
function prefere(rng) {
  const pool = rng() < 0.5 ? LIKES.filter((i) => i.food) : LIKES.filter((i) => !i.food);
  const [liked, disliked, third] = sample(rng, pool, 3);
  const parts = [likeEn(disliked, false), likeEn(liked, true)];
  const story = say((rng() < 0.5 ? parts : parts.reverse()).join(' '));
  return question(rng, {
    key: `anglais-cm:prefere:${liked.en}:${disliked.en}`,
    text: 'Écoute l’enfant, et touche ce qu’il aime.',
    instruction: ['Écoute l’enfant, et touche ce qu’il aime.', story],
    short: { key: 'anglais-cm:prefere', text: 'Qu’est-ce qu’il aime ?', speak: [story] },
    replay: [story],
    listen: true,
    options: [liked, disliked, third],
    choice: (i) => ({ value: i.en, label: i.emoji, name: i.fr }),
    style: 'pictures',
    answer: liked.en,
    success: [say(likeEn(liked, true)), likeFr(liked, true)],
  });
}

// ---------------------------------------------------------------- Niveau 6 : se décrire

// Le sujet : avoir (have got / has got) et être (am / is), les fautes d'accord, la phrase française.
const SUBJECTS = {
  I: { have: 'have', be: 'am', badHave: 'has', badBe: 'is', frHave: 'J’ai', frBe: 'Je suis' },
  He: { have: 'has', be: 'is', badHave: 'have', badBe: 'are', frHave: 'Il a', frBe: 'Il est', other: 'She' },
  She: { have: 'has', be: 'is', badHave: 'have', badBe: 'are', frHave: 'Elle a', frBe: 'Elle est', other: 'He' },
};
// Ce qu'on a (have got) ou ce qu'on est (be : tall, short). `order` : l'ordre des mots à la française
// (eyes blue) ; `others` / `frOthers` : d'autres descriptions, pour les pièges ; `bare` : sans « a ».
const LOOKS = [
  { id: 'blue-eyes', en: 'blue eyes', order: 'eyes blue', fr: 'les yeux bleus', others: ['brown eyes', 'green eyes', 'blue hair'], frOthers: ['les yeux marron', 'les yeux verts', 'les cheveux bleus'] },
  { id: 'brown-eyes', en: 'brown eyes', order: 'eyes brown', fr: 'les yeux marron', others: ['blue eyes', 'green eyes', 'brown hair'], frOthers: ['les yeux bleus', 'les yeux verts', 'les cheveux bruns'] },
  { id: 'green-eyes', en: 'green eyes', order: 'eyes green', fr: 'les yeux verts', others: ['blue eyes', 'brown eyes', 'green hair'], frOthers: ['les yeux bleus', 'les yeux marron', 'les cheveux verts'] },
  { id: 'long-hair', en: 'long hair', order: 'hair long', fr: 'les cheveux longs', others: ['short hair', 'curly hair'], frOthers: ['les cheveux courts', 'les cheveux bouclés'] },
  { id: 'short-hair', en: 'short hair', order: 'hair short', fr: 'les cheveux courts', others: ['long hair', 'straight hair'], frOthers: ['les cheveux longs', 'les cheveux raides'] },
  { id: 'curly-hair', en: 'curly hair', order: 'hair curly', fr: 'les cheveux bouclés', others: ['straight hair', 'long hair'], frOthers: ['les cheveux raides', 'les cheveux longs'] },
  { id: 'straight-hair', en: 'straight hair', order: 'hair straight', fr: 'les cheveux raides', others: ['curly hair', 'short hair'], frOthers: ['les cheveux bouclés', 'les cheveux courts'] },
  { id: 'blond-hair', en: 'blond hair', order: 'hair blond', fr: 'les cheveux blonds', others: ['black hair', 'brown hair'], frOthers: ['les cheveux noirs', 'les cheveux bruns'] },
  { id: 'black-hair', en: 'black hair', order: 'hair black', fr: 'les cheveux noirs', others: ['blond hair', 'black eyes'], frOthers: ['les cheveux blonds', 'les yeux noirs'] },
  { id: 'brown-hair', en: 'brown hair', order: 'hair brown', fr: 'les cheveux bruns', others: ['blond hair', 'brown eyes'], frOthers: ['les cheveux blonds', 'les yeux marron'] },
  { id: 'red-hair', en: 'red hair', order: 'hair red', fr: 'les cheveux roux', others: ['blond hair', 'black hair'], frOthers: ['les cheveux blonds', 'les cheveux noirs'] },
  { id: 'glasses', en: 'glasses', fr: 'des lunettes', others: ['blue eyes'], frOthers: ['les yeux bleus'] },
  { id: 'beard', en: 'a beard', bare: 'beard', fr: 'une barbe', he: true, others: ['glasses'], frOthers: ['des lunettes'] },
  { id: 'tall', be: true, en: 'tall', fr: ['grand', 'grande'], opposite: 'short' },
  { id: 'short', be: true, en: 'short', fr: ['petit', 'petite'], opposite: 'tall' },
];
const look = (id) => LOOKS.find((l) => l.id === id);
// Les parties du corps au pluriel (teeth, feet : des pluriels irréguliers ; hair : sans s).
const BODY = [
  { fr: 'les dents', en: 'teeth', wrong: ['tooths', 'tooth', 'feet'] }, { fr: 'les pieds', en: 'feet', wrong: ['foots', 'foot', 'teeth'] },
  { fr: 'les yeux', en: 'eyes', wrong: ['eye', 'ears', 'legs'] }, { fr: 'les oreilles', en: 'ears', wrong: ['ear', 'eyes', 'arms'] },
  { fr: 'les mains', en: 'hands', wrong: ['hand', 'arms', 'feet'] }, { fr: 'les bras', en: 'arms', wrong: ['arm', 'legs', 'hands'] },
  { fr: 'les jambes', en: 'legs', wrong: ['leg', 'arms', 'feet'] }, { fr: 'la tête', en: 'head', wrong: ['hair', 'hand', 'heart'] },
  { fr: 'le nez', en: 'nose', wrong: ['knees', 'mouth', 'ears'] }, { fr: 'la bouche', en: 'mouth', wrong: ['mouse', 'nose', 'month'] },
  { fr: 'les cheveux', en: 'hair', wrong: ['hairs', 'head', 'ears'] }, { fr: 'les genoux', en: 'knees', wrong: ['knee', 'nose', 'legs'] },
];
// Le sujet des phrases à trous : un prénom, « I », « my brother »…
const GAP_SUBJECTS = [['I', 'I'], ['Tom', 'He'], ['Anna', 'She'], ['My brother', 'He'], ['My mum', 'She']];

function lookEn(s, l) {
  return l.be ? `${s} ${SUBJECTS[s].be} ${l.en}.` : `${s} ${SUBJECTS[s].have} got ${l.en}.`;
}
function lookFr(s, l) {
  return l.be ? `${SUBJECTS[s].frBe} ${l.fr[s === 'She' ? 1 : 0]}.` : `${SUBJECTS[s].frHave} ${l.fr}.`;
}
/** Le sujet d'une description : « I » seulement avec have got (en français, « je suis grand » dirait si c'est un garçon). */
function lookSubject(rng, l) {
  if (l.he) return 'He';
  return pick(rng, l.be ? ['He', 'She'] : ['I', 'He', 'She']);
}
/** Les phrases anglaises fausses : l'ordre des mots, be au lieu de have, l'accord, hairs, une autre description, l'autre sujet. */
function enTraps(s, l) {
  const S = SUBJECTS[s];
  const traps = l.be
    ? [`${s} ${S.have} got ${l.en}.`, `${s} ${S.badBe} ${l.en}.`, lookEn(s, look(l.opposite))]
    : [`${s} ${S.be} ${l.en}.`, `${s} ${S.badHave} got ${l.en}.`, ...l.others.map((o) => `${s} ${S.have} got ${o}.`)];
  if (l.order) traps.push(`${s} ${S.have} got ${l.order}.`);
  if (l.en.endsWith(' hair')) traps.push(`${s} ${S.have} got ${l.en}s.`);
  if (l.bare) traps.push(`${s} ${S.have} got ${l.bare}.`);
  if (S.other) traps.push(lookEn(S.other, l));
  return traps;
}
/** Les phrases françaises fausses : un autre sujet, une autre description. */
function frTraps(s, l) {
  const S = SUBJECTS[s];
  if (l.be) return [lookFr(S.other, l), lookFr(s, look(l.opposite)), lookFr(S.other, look(l.opposite))];
  return [...Object.keys(SUBJECTS).filter((x) => x !== s).map((x) => lookFr(x, l)), ...l.frOthers.map((o) => `${S.frHave} ${o}.`)];
}

function decrireFrancais(rng) {
  const l = pick(rng, LOOKS);
  const s = lookSubject(rng, l);
  const answer = lookEn(s, l);
  return question(rng, {
    key: `anglais-cm:decrire-fr:${s}:${l.id}`,
    text: 'Comment dit-on cette phrase en anglais ?',
    instruction: 'Lis la phrase. Comment la dit-on en anglais ?',
    short: { key: 'anglais-cm:decrire-fr', text: 'En anglais ?' },
    stage: { type: 'sentence', text: lookFr(s, l) },
    options: [answer, ...sample(rng, enTraps(s, l), 3)],
    style: 'sentences',
    answer,
    success: [say(answer)],
  });
}

/** La description anglaise, lue ou entendue : que veut-elle dire ? */
function decrireSens(rng, listen) {
  const l = pick(rng, LOOKS);
  const s = lookSubject(rng, l);
  const sound = say(lookEn(s, l));
  const text = listen ? 'Écoute la phrase anglaise. Que veut-elle dire ?' : 'Lis la phrase anglaise. Que veut-elle dire ?';
  return question(rng, {
    key: `anglais-cm:decrire-${listen ? 'ecoute' : 'lis'}:${s}:${l.id}`,
    text,
    instruction: [text, sound],
    short: { key: `anglais-cm:decrire-${listen ? 'ecoute' : 'lis'}`, text: 'Que veut dire la phrase ?', speak: [sound] },
    replay: [sound],
    stage: { type: 'sentence', text: sound.text, lang: 'en' },
    listen,
    options: [lookFr(s, l), ...sample(rng, frTraps(s, l), listen ? 2 : 3)],
    choice: frChoice,
    style: 'sentences',
    answer: lookFr(s, l),
    success: [sound, lookFr(s, l)],
  });
}

/** Am, is, have got ou has got ? */
function verbeDecrire(rng) {
  const [subject, s] = pick(rng, GAP_SUBJECTS);
  const l = pick(rng, LOOKS.filter((x) => !x.he));
  const answer = l.be ? SUBJECTS[s].be : `${SUBJECTS[s].have} got`;
  const sound = say(`${subject} … ${l.en}.`);
  return question(rng, {
    key: `anglais-cm:verbe-decrire:${subject}:${l.id}`,
    text: 'Lis la phrase. Quel verbe manque ?',
    instruction: ['Lis la phrase. Quel verbe manque ?', sound],
    short: { key: 'anglais-cm:verbe-decrire', text: 'Quel verbe ?', speak: [sound] },
    replay: [sound],
    stage: { type: 'sentence', text: `${subject} ___ ${l.en}.`, lang: 'en' },
    options: ['am', 'is', 'have got', 'has got'],
    style: 'words',
    answer,
    success: [say(`${subject} ${answer} ${l.en}.`)],
  });
}

function corps(rng) {
  const part = pick(rng, BODY);
  return question(rng, {
    key: `anglais-cm:corps:${part.en}`,
    text: 'Comment dit-on en anglais ?',
    instruction: 'Comment dit-on ces mots en anglais ? Attention au pluriel !',
    short: { key: 'anglais-cm:corps', text: 'En anglais ?' },
    stage: wordStage(part.fr),
    options: [part.en, ...part.wrong],
    style: 'words',
    answer: part.en,
    success: [say(part.en)],
  });
}

// ---------------------------------------------------------------- Niveau 7 : où est-ce ?

const PLACES = {
  school: { fr: 'l’école', emoji: '🏫' }, park: { fr: 'le parc', emoji: '🏞️' }, library: { fr: 'la bibliothèque', emoji: '📚' },
  bakery: { fr: 'la boulangerie', emoji: '🥖' }, station: { fr: 'la gare', emoji: '🚉' }, hospital: { fr: 'l’hôpital', emoji: '🏥' },
  'swimming pool': { fr: 'la piscine', emoji: '🏊' }, cinema: { fr: 'le cinéma', emoji: '🎞️' },
  supermarket: { fr: 'le supermarché', emoji: '🛒' }, 'post office': { fr: 'la poste', emoji: '📮' }, museum: { fr: 'le musée', emoji: '🖼️' },
  restaurant: { fr: 'le restaurant', emoji: '🍽️' }, stadium: { fr: 'le stade', emoji: '🏟️' }, castle: { fr: 'le château', emoji: '🏰' },
};
const PLACE_WORDS = Object.keys(PLACES);
// Les faux amis : library n'est pas la librairie.
const FALSE_FRIENDS = { library: 'la librairie' };
/** « de » devant le lieu : du parc, de la gare, de l’école. */
const de = (fr) => (fr.startsWith('le ') ? `du ${fr.slice(3)}` : `de ${fr}`);
const PREPOSITIONS = {
  'next to': (fr) => `à côté ${de(fr)}`,
  near: (fr) => `près ${de(fr)}`,
  opposite: (fr) => `en face ${de(fr)}`,
  behind: (fr) => `derrière ${fr}`,
  'in front of': (fr) => `devant ${fr}`,
};
// « near » et « next to » ne sont jamais proposés ensemble (ce qui est à côté est aussi près).
const CLOSE = { near: 'next to', 'next to': 'near' };
// Les phrases de la rue : [lieu, préposition, lieu].
const STREET = [
  ['bakery', 'next to', 'school'], ['library', 'opposite', 'park'], ['hospital', 'near', 'station'], ['cinema', 'behind', 'supermarket'],
  ['swimming pool', 'in front of', 'stadium'], ['post office', 'next to', 'bakery'], ['museum', 'opposite', 'castle'],
  ['school', 'behind', 'park'], ['station', 'in front of', 'hospital'], ['restaurant', 'near', 'cinema'], ['park', 'next to', 'library'],
  ['supermarket', 'opposite', 'post office'], ['stadium', 'behind', 'swimming pool'], ['castle', 'near', 'museum'],
  ['bakery', 'in front of', 'station'], ['library', 'behind', 'school'],
];
// Trois lieux côte à côte dans la rue (de gauche à droite) : celui du milieu est « between ».
const ROWS = [
  ['school', 'bakery', 'hospital'], ['park', 'library', 'station'], ['cinema', 'restaurant', 'museum'], ['supermarket', 'post office', 'bakery'],
  ['castle', 'park', 'school'], ['station', 'hospital', 'stadium'], ['library', 'cinema', 'swimming pool'], ['museum', 'castle', 'restaurant'],
];

const streetEn = ([a, prep, b]) => `The ${a} is ${prep} the ${b}.`;
const streetFr = ([a, prep, b]) => `${capital(PLACES[a].fr)} est ${PREPOSITIONS[prep](PLACES[b].fr)}.`;
/** La phrase de la rue et les mêmes lieux avec d'autres prépositions (jamais les lieux échangés). */
function streetOptions(rng, [a, prep, b]) {
  const others = Object.keys(PREPOSITIONS).filter((p) => p !== prep && p !== CLOSE[prep]);
  return [[a, prep, b], ...sample(rng, others, 3).map((p) => [a, p, b])];
}

function lieuImage(rng) {
  const place = pick(rng, PLACE_WORDS);
  return question(rng, {
    key: `anglais-cm:lieu-image:${place}`,
    text: 'Comment dit-on ce lieu en anglais ?',
    instruction: 'Regarde l’image. Comment dit-on ce lieu en anglais ?',
    short: { key: 'anglais-cm:lieu-image', text: 'En anglais ?' },
    stage: { type: 'picture', emoji: PLACES[place].emoji },
    options: [place, ...sample(rng, PLACE_WORDS.filter((p) => p !== place), 3)],
    style: 'words',
    answer: place,
    success: [say(`It’s the ${place}.`)],
  });
}

function lieuAnglais(rng) {
  const place = pick(rng, PLACE_WORDS);
  const sound = say(place);
  const traps = [...(FALSE_FRIENDS[place] ? [FALSE_FRIENDS[place]] : []), ...shuffle(rng, PLACE_WORDS.filter((p) => p !== place)).map((p) => PLACES[p].fr)];
  return question(rng, {
    key: `anglais-cm:lieu-en:${place}`,
    text: 'Que veut dire ce mot anglais ?',
    instruction: ['Que veut dire ce mot anglais ?', sound],
    short: { key: 'anglais-cm:lieu-en', text: 'Que veut dire ce mot ?', speak: [sound] },
    replay: [sound],
    stage: wordStage(place, 'en'),
    options: [PLACES[place].fr, ...traps.slice(0, 3)],
    choice: frChoice,
    style: 'words',
    answer: PLACES[place].fr,
    success: [sound, `${capital(PLACES[place].fr)} !`],
  });
}

function rueFrancais(rng) {
  const street = pick(rng, STREET);
  return question(rng, {
    key: `anglais-cm:rue-fr:${street.join(':')}`,
    text: 'Comment dit-on cette phrase en anglais ?',
    instruction: 'Lis la phrase. Comment la dit-on en anglais ?',
    short: { key: 'anglais-cm:rue-fr', text: 'En anglais ?' },
    stage: { type: 'sentence', text: streetFr(street) },
    options: streetOptions(rng, street).map(streetEn),
    style: 'sentences',
    answer: streetEn(street),
    success: [say(streetEn(street))],
  });
}

/** La phrase anglaise, lue ou entendue : que veut-elle dire ? */
function rueSens(rng, listen) {
  const street = pick(rng, STREET);
  const sound = say(streetEn(street));
  const text = listen ? 'Écoute la phrase anglaise. Que veut-elle dire ?' : 'Lis la phrase anglaise. Que veut-elle dire ?';
  return question(rng, {
    key: `anglais-cm:rue-${listen ? 'ecoute' : 'lis'}:${street.join(':')}`,
    text,
    instruction: [text, sound],
    short: { key: `anglais-cm:rue-${listen ? 'ecoute' : 'lis'}`, text: 'Que veut dire la phrase ?', speak: [sound] },
    replay: [sound],
    stage: { type: 'sentence', text: sound.text, lang: 'en' },
    listen,
    options: streetOptions(rng, street).map(streetFr),
    choice: frChoice,
    style: 'sentences',
    answer: streetFr(street),
    success: [sound, streetFr(street)],
  });
}

/** Trois lieux côte à côte : lequel est « between » les deux autres ? */
function entre(rng) {
  const row = rng() < 0.5 ? pick(rng, ROWS) : [...pick(rng, ROWS)].reverse();
  const [left, middle, right] = row;
  const between = (m, a, b) => `The ${m} is between the ${a} and the ${b}.`;
  const answer = between(middle, left, right);
  return question(rng, {
    key: `anglais-cm:entre:${row.join(':')}`,
    text: 'Regarde la rue. Quelle phrase est vraie ?',
    instruction: 'Regarde la rue, et touche la phrase qui est vraie.',
    short: { key: 'anglais-cm:entre', text: 'Quelle phrase est vraie ?' },
    stage: { type: 'pattern', items: row.map((p) => PLACES[p].emoji) },
    options: [answer, between(left, middle, right), between(right, left, middle)],
    style: 'sentences',
    answer,
    success: [say(answer)],
  });
}

// ---------------------------------------------------------------- Niveau 8 : who, what, where, when?

// La question, sa réponse, son mot interrogatif (`w`) et les mots qui ne vont pas (`no`). Les réponses
// pièges viennent d'une autre catégorie (`cat`) : un lieu ne répond jamais à « when », un nombre à « who ».
const QUESTIONS = [
  { w: 'Where', q: 'Where do you live?', a: 'In Paris.', cat: 'lieu', no: ['When', 'Who', 'How old'] },
  { w: 'Where', q: 'Where is the cat?', a: 'It’s under the table.', cat: 'lieu', no: ['When', 'Who', 'How many'] },
  { w: 'Where', q: 'Where are you from?', a: 'I’m from France.', cat: 'lieu', no: ['When', 'Who', 'What'] },
  { w: 'When', q: 'When is your birthday?', a: 'In May.', cat: 'temps', no: ['Where', 'Who', 'How many'] },
  { w: 'When', q: 'When do you play football?', a: 'On Saturdays.', cat: 'temps', no: ['Where', 'Who', 'How old'] },
  { w: 'When', q: 'When do you get up?', a: 'At seven o’clock.', cat: 'temps', no: ['Where', 'Who', 'How many'] },
  { w: 'What time', q: 'What time is it?', a: 'It’s three o’clock.', cat: 'temps', no: ['Where', 'Who', 'How many'] },
  { w: 'Who', q: 'Who is your best friend?', a: 'Lucy.', cat: 'personne', no: ['Where', 'When', 'How old'] },
  { w: 'Who', q: 'Who is that?', a: 'It’s my sister.', cat: 'personne', no: ['Where', 'When', 'How old'] },
  { w: 'Who', q: 'Who is your teacher?', a: 'Mrs Smith.', cat: 'personne', no: ['Where', 'When', 'How old'] },
  { w: 'What', q: 'What is your name?', a: 'My name is Ben.', cat: 'personne', no: ['Where', 'When', 'How old'] },
  { w: 'What', q: 'What is your favourite colour?', a: 'Blue.', cat: 'chose', no: ['Who', 'Where', 'When'] },
  { w: 'What', q: 'What do you like?', a: 'I like pizza.', cat: 'chose', no: ['Who', 'Where', 'When'] },
  { w: 'What colour', q: 'What colour is your bag?', a: 'It’s red.', cat: 'chose', no: ['Where', 'Who', 'How many'] },
  { w: 'How old', q: 'How old are you?', a: 'I’m ten.', cat: 'nombre', no: ['Where', 'Who', 'When'] },
  { w: 'How many', q: 'How many brothers have you got?', a: 'Two.', cat: 'nombre', no: ['How old', 'Where', 'Who'] },
  { w: 'How many', q: 'How many pets have you got?', a: 'Three.', cat: 'nombre', no: ['How old', 'Who', 'When'] },
  { w: 'How', q: 'How are you?', a: 'I’m fine, thank you.', cat: 'humeur', no: ['Who', 'Where', 'When'] },
];
// Les mots des questions, du français vers l'anglais (Where, When, Who et What se confondent).
const QUESTION_WORDS = [
  ['Où ?', 'Where?'], ['Quand ?', 'When?'], ['Qui ?', 'Who?'], ['Quoi ?', 'What?'], ['Quel âge ?', 'How old?'],
  ['Combien ?', 'How many?'], ['Pourquoi ?', 'Why?'], ['Quelle heure ?', 'What time?'], ['Quelle couleur ?', 'What colour?'],
];
const W_WORDS = ['Where?', 'When?', 'Who?', 'What?'];

/** `count` réponses (ou questions) d'autres catégories : elles ne peuvent pas convenir. */
function otherTalks(rng, item, count) {
  return sample(rng, QUESTIONS.filter((t) => t.cat !== item.cat), count);
}

function motQuestion(rng) {
  const item = pick(rng, QUESTIONS);
  const rest = item.q.slice(item.w.length);
  const parts = [say(`…${rest}`), say(item.a)];
  return question(rng, {
    key: `anglais-cm:mot-question:${item.q}`,
    text: 'Quel mot manque dans la question ?',
    instruction: ['Lis la question et sa réponse. Quel mot manque ?', ...parts],
    short: { key: 'anglais-cm:mot-question', text: 'Quel mot manque ?', speak: parts },
    replay: parts,
    stage: { type: 'sentence', text: `___${rest} — ${item.a}`, lang: 'en' },
    options: [item.w, ...item.no],
    style: 'words',
    answer: item.w,
    success: [say(item.q), say(item.a)],
  });
}

/** La question, lue ou entendue : quelle est la bonne réponse ? */
function bonneReponse(rng, listen) {
  const item = pick(rng, QUESTIONS);
  const sound = say(item.q);
  const text = listen ? 'Écoute la question, et touche la bonne réponse.' : 'Lis la question, et touche la bonne réponse.';
  return question(rng, {
    key: `anglais-cm:reponse-${listen ? 'ecoute' : 'lis'}:${item.q}`,
    text,
    instruction: [text, sound],
    short: { key: `anglais-cm:reponse-${listen ? 'ecoute' : 'lis'}`, text: 'Quelle réponse ?', speak: [sound] },
    replay: [sound],
    stage: { type: 'sentence', text: item.q, lang: 'en' },
    listen,
    options: [item.a, ...otherTalks(rng, item, 3).map((t) => t.a)],
    style: 'sentences',
    answer: item.a,
    success: [sound, say(item.a)],
  });
}

function quelleQuestion(rng) {
  const item = pick(rng, QUESTIONS);
  const reply = say(item.a);
  return question(rng, {
    key: `anglais-cm:question:${item.q}`,
    text: 'Voici la réponse. Quelle était la question ?',
    instruction: ['Voici la réponse :', reply, 'Quelle était la question ?'],
    short: { key: 'anglais-cm:question', text: 'Quelle était la question ?', speak: [reply, 'Quelle était la question ?'] },
    replay: [reply],
    stage: { type: 'sentence', text: item.a, lang: 'en' },
    options: [item.q, ...otherTalks(rng, item, 2).map((t) => t.q)],
    style: 'sentences',
    answer: item.q,
    success: [say(item.q), reply],
  });
}

function motQuestionFrancais(rng) {
  const [fr, en] = pick(rng, QUESTION_WORDS);
  const pool = W_WORDS.includes(en) ? W_WORDS : QUESTION_WORDS.map(([, x]) => x);
  return question(rng, {
    key: `anglais-cm:mot-fr:${en}`,
    text: 'Comment dit-on en anglais ?',
    instruction: 'Comment dit-on ce mot en anglais ?',
    short: { key: 'anglais-cm:mot-fr', text: 'En anglais ?' },
    stage: wordStage(fr),
    options: [en, ...sample(rng, pool.filter((x) => x !== en), 3)],
    style: 'words',
    answer: en,
    success: [say(en)],
  });
}

// ---------------------------------------------------------------- Niveau 9 : le présent simple

// Les habitudes de chacun (3e personne) : le verbe (base, forme en -s, -ing, une faute d'orthographe),
// la suite de la phrase, le pronom des réponses courtes, et la phrase française (affirmative,
// négative, et une autre qui ne va pas). Pas de verbe dont le passé ressemble à la base (read, put) :
// « Grandpa read the newspaper » serait juste, au passé.
const HABITS = [
  {
    subj: 'Andy', pron: 'he', base: 'go', s: 'goes', ing: 'going', bad: 'gos', rest: 'to the cinema on Saturdays',
    fr: 'Andy va au cinéma le samedi.', frNeg: 'Andy ne va pas au cinéma le samedi.', frOther: 'Andy va à la piscine le samedi.',
  },
  {
    subj: 'Lucy', pron: 'she', base: 'watch', s: 'watches', ing: 'watching', bad: 'watchs', rest: 'TV after school',
    fr: 'Lucy regarde la télé après l’école.', frNeg: 'Lucy ne regarde pas la télé après l’école.', frOther: 'Lucy regarde la télé avant l’école.',
  },
  {
    subj: 'Tom', pron: 'he', base: 'play', s: 'plays', ing: 'playing', bad: 'plaies', rest: 'tennis on Wednesdays',
    fr: 'Tom joue au tennis le mercredi.', frNeg: 'Tom ne joue pas au tennis le mercredi.', frOther: 'Tom joue au football le mercredi.',
  },
  {
    subj: 'Emma', pron: 'she', base: 'do', s: 'does', ing: 'doing', bad: 'dos', rest: 'her homework in the evening',
    fr: 'Emma fait ses devoirs le soir.', frNeg: 'Emma ne fait pas ses devoirs le soir.', frOther: 'Emma fait ses devoirs le matin.',
  },
  {
    subj: 'Ben', pron: 'he', base: 'have', s: 'has', ing: 'having', bad: 'haves', rest: 'breakfast at seven o’clock',
    fr: 'Ben prend son petit-déjeuner à sept heures.', frNeg: 'Ben ne prend pas son petit-déjeuner à sept heures.',
    frOther: 'Ben prend son goûter à sept heures.',
  },
  {
    subj: 'My sister', pron: 'she', base: 'study', s: 'studies', ing: 'studying', bad: 'studys', rest: 'English at school',
    fr: 'Ma sœur étudie l’anglais à l’école.', frNeg: 'Ma sœur n’étudie pas l’anglais à l’école.', frOther: 'Ma sœur étudie l’anglais à la maison.',
  },
  {
    subj: 'Dad', pron: 'he', base: 'wash', s: 'washes', ing: 'washing', bad: 'washs', rest: 'the car on Sundays',
    fr: 'Papa lave la voiture le dimanche.', frNeg: 'Papa ne lave pas la voiture le dimanche.', frOther: 'Papa lave la voiture le lundi.',
  },
  {
    subj: 'Mia', pron: 'she', base: 'brush', s: 'brushes', ing: 'brushing', bad: 'brushs', rest: 'her teeth every morning',
    fr: 'Mia se brosse les dents tous les matins.', frNeg: 'Mia ne se brosse pas les dents tous les matins.',
    frOther: 'Mia se brosse les cheveux tous les matins.',
  },
  {
    subj: 'Leo', pron: 'he', base: 'live', s: 'lives', ing: 'living', bad: 'livs', rest: 'in London',
    fr: 'Leo habite à Londres.', frNeg: 'Leo n’habite pas à Londres.', frOther: 'Leo travaille à Londres.',
  },
  {
    subj: 'Jack', pron: 'he', base: 'get', s: 'gets', ing: 'getting', bad: 'getes', rest: 'up at seven o’clock',
    fr: 'Jack se lève à sept heures.', frNeg: 'Jack ne se lève pas à sept heures.', frOther: 'Jack se couche à sept heures.',
  },
  {
    subj: 'Anna', pron: 'she', base: 'like', s: 'likes', ing: 'liking', bad: 'likies', rest: 'chocolate',
    fr: 'Anna aime le chocolat.', frNeg: 'Anna n’aime pas le chocolat.', frOther: 'Anna aime le fromage.',
  },
  {
    subj: 'Mr Smith', pron: 'he', base: 'teach', s: 'teaches', ing: 'teaching', bad: 'teachs', rest: 'English',
    fr: 'Monsieur Smith enseigne l’anglais.', frNeg: 'Monsieur Smith n’enseigne pas l’anglais.', frOther: 'Monsieur Smith apprend l’anglais.',
  },
  {
    subj: 'Kate', pron: 'she', base: 'play', s: 'plays', ing: 'playing', bad: 'plaies', rest: 'the piano',
    fr: 'Kate joue du piano.', frNeg: 'Kate ne joue pas du piano.', frOther: 'Kate joue de la guitare.',
  },
  {
    subj: 'My brother', pron: 'he', base: 'swim', s: 'swims', ing: 'swimming', bad: 'swimes', rest: 'very fast',
    fr: 'Mon frère nage très vite.', frNeg: 'Mon frère ne nage pas très vite.', frOther: 'Mon frère court très vite.',
  },
  {
    subj: 'The cat', pron: 'it', base: 'drink', s: 'drinks', ing: 'drinking', bad: 'drinkes', rest: 'milk',
    fr: 'Le chat boit du lait.', frNeg: 'Le chat ne boit pas de lait.', frOther: 'Le chat boit de l’eau.',
  },
  {
    subj: 'The baby', base: 'cry', s: 'cries', ing: 'crying', bad: 'crys', rest: 'a lot',
    fr: 'Le bébé pleure beaucoup.', frNeg: 'Le bébé ne pleure pas beaucoup.', frOther: 'Le bébé rit beaucoup.',
  },
];
// Avec I, you, we, they ou un pluriel, le verbe ne prend pas de s.
const PLURAL_HABITS = [
  { subj: 'My parents', base: 'go', s: 'goes', ing: 'going', bad: 'gos', rest: 'to work by car' },
  { subj: 'I', base: 'play', s: 'plays', ing: 'playing', bad: 'plaies', rest: 'football with my friends' },
  { subj: 'We', base: 'have', s: 'has', ing: 'having', bad: 'haves', rest: 'lunch at school' },
  { subj: 'They', base: 'watch', s: 'watches', ing: 'watching', bad: 'watchs', rest: 'TV in the evening' },
  { subj: 'You', base: 'live', s: 'lives', ing: 'living', bad: 'livs', rest: 'in Paris' },
];

const affirmative = (h) => `${h.subj} ${h.s} ${h.rest}.`;
const negative = (h) => `${h.subj} doesn’t ${h.base} ${h.rest}.`;
/** Le sujet au milieu de la question : « my sister », « the cat » (un prénom garde sa majuscule). */
const inside = (subj) => (/^(My|The) /.test(subj) ? `${subj[0].toLowerCase()}${subj.slice(1)}` : subj);
const asked = (h) => `Does ${inside(h.subj)} ${h.base} ${h.rest}?`;

/** Le verbe qui manque : goes, watches, studies… ou, avec I, we, they, sans s. */
function formeVerbe(rng) {
  const plural = rng() < 0.25;
  const h = pick(rng, plural ? PLURAL_HABITS : HABITS);
  const answer = plural ? h.base : h.s;
  const sound = say(`${h.subj} … ${h.rest}.`);
  return question(rng, {
    key: `anglais-cm:forme:${h.subj}:${h.rest}`,
    text: 'Lis la phrase. Quel verbe manque ?',
    instruction: ['Lis la phrase. Quel verbe manque ?', sound],
    short: { key: 'anglais-cm:forme', text: 'Quel verbe ?', speak: [sound] },
    replay: [sound],
    stage: { type: 'sentence', text: `${h.subj} ___ ${h.rest}.`, lang: 'en' },
    options: [answer, plural ? h.s : h.base, h.bad, h.ing],
    style: 'words',
    answer,
    success: [say(`${h.subj} ${answer} ${h.rest}.`)],
  });
}

function negation(rng) {
  const h = pick(rng, HABITS);
  const sound = say(affirmative(h));
  const traps = [`${h.subj} don’t ${h.base} ${h.rest}.`, `${h.subj} doesn’t ${h.s} ${h.rest}.`, `${h.subj} isn’t ${h.base} ${h.rest}.`,
    `${h.subj} not ${h.s} ${h.rest}.`];
  return question(rng, {
    key: `anglais-cm:negation:${h.subj}:${h.rest}`,
    text: 'Quelle est la même phrase à la forme négative ?',
    instruction: ['Lis la phrase. Touche la même phrase à la forme négative.', sound],
    short: { key: 'anglais-cm:negation', text: 'La forme négative ?', speak: [sound] },
    replay: [sound],
    stage: { type: 'sentence', text: affirmative(h), lang: 'en' },
    options: [negative(h), ...sample(rng, traps, 3)],
    style: 'sentences',
    answer: negative(h),
    success: [say(negative(h))],
  });
}

function questionDoes(rng) {
  const h = pick(rng, HABITS);
  const sound = say(affirmative(h));
  const traps = [`Do ${inside(h.subj)} ${h.base} ${h.rest}?`, `Does ${inside(h.subj)} ${h.s} ${h.rest}?`, `Is ${inside(h.subj)} ${h.base} ${h.rest}?`];
  return question(rng, {
    key: `anglais-cm:question-does:${h.subj}:${h.rest}`,
    text: 'Quelle est la bonne question ?',
    instruction: ['Lis la phrase. Touche la bonne question pour la demander.', sound],
    short: { key: 'anglais-cm:question-does', text: 'La bonne question ?', speak: [sound] },
    replay: [sound],
    stage: { type: 'sentence', text: affirmative(h), lang: 'en' },
    options: [asked(h), ...traps],
    style: 'sentences',
    answer: asked(h),
    success: [say(asked(h))],
  });
}

/** La phrase entendue, affirmative ou négative : que veut-elle dire ? */
function presentEntendu(rng) {
  const h = pick(rng, HABITS);
  const neg = rng() < 0.5;
  const sound = say(neg ? negative(h) : affirmative(h));
  const answer = neg ? h.frNeg : h.fr;
  return question(rng, {
    key: `anglais-cm:present-ecoute:${h.subj}:${h.rest}:${neg ? 'non' : 'oui'}`,
    text: 'Écoute la phrase anglaise. Que veut-elle dire ?',
    instruction: ['Écoute la phrase anglaise. Que veut-elle dire ?', sound],
    short: { key: 'anglais-cm:present-ecoute', text: 'Que veut dire la phrase ?', speak: [sound] },
    replay: [sound],
    listen: true,
    options: [answer, neg ? h.fr : h.frNeg, h.frOther],
    choice: frChoice,
    style: 'sentences',
    answer,
    success: [sound, answer],
  });
}

/** « Does Tom play tennis? » : Yes, he does. / No, he doesn’t. (d'après ✅ ou ❌ et les mots). */
function reponseCourte(rng) {
  const h = pick(rng, HABITS.filter((x) => x.pron));
  const yes = rng() < 0.5;
  const ask = say(asked(h));
  const p = h.pron;
  const truth = yes ? 'C’est vrai.' : 'Ce n’est pas vrai.';
  const mark = yes ? '✅' : '❌';
  const options = yes
    ? [`Yes, ${p} does.`, `Yes, ${p} do.`, `Yes, ${p} is.`, `No, ${p} doesn’t.`]
    : [`No, ${p} doesn’t.`, `No, ${p} don’t.`, `No, ${p} isn’t.`, `Yes, ${p} does.`];
  return question(rng, {
    key: `anglais-cm:reponse-courte:${h.subj}:${h.rest}:${yes ? 'oui' : 'non'}`,
    text: `${mark} ${truth} Que répond-on ?`,
    instruction: [`${truth} Que répond-on ?`, ask],
    short: { key: 'anglais-cm:reponse-courte', text: `${mark} ${truth}`, speak: [truth, ask] },
    replay: [ask],
    stage: { type: 'sentence', text: ask.text, lang: 'en' },
    options,
    style: 'answers',
    answer: options[0],
    success: [ask, say(options[0])],
  });
}

// ---------------------------------------------------------------- Le jeu

// Les formes de questions de chaque niveau, dans l'ordre où elles alternent (l'écoute entre deux lectures).
const KINDS = [
  [lettre, orthographe, motEpele],
  [(rng) => jour(rng, false), dateEntendue, moisSuivant, jourOuMois, (rng) => jour(rng, true), dateEcrite, fete],
  [(rng) => heurePhrase(rng, false), (rng) => heureChiffres(rng, true), (rng) => heurePhrase(rng, true), (rng) => heureChiffres(rng, false)],
  [familleFrancais, familleEntendue, lien, familleAnglais, hisHer],
  [aimeImage, (rng) => aimeSens(rng, true), tuAimes, (rng) => aimeSens(rng, false), prefere],
  [decrireFrancais, (rng) => decrireSens(rng, true), verbeDecrire, (rng) => decrireSens(rng, false), corps],
  [lieuImage, (rng) => rueSens(rng, true), rueFrancais, lieuAnglais, entre, (rng) => rueSens(rng, false)],
  [motQuestion, (rng) => bonneReponse(rng, true), quelleQuestion, motQuestionFrancais, (rng) => bonneReponse(rng, false)],
  [formeVerbe, presentEntendu, negation, questionDoes, reponseCourte],
];

export const anglaisCm = {
  id: 'anglais-cm',
  domain: 'anglais',
  section: 'Mots et phrases',
  title: 'L’anglais du CM',
  icon: '🎒',
  skill: 'Épeler, dire la date et l’heure, parler de sa famille et de ses goûts, se décrire, situer un lieu, poser des questions, le présent simple (niveau A1)',
  levels: [
    'L’alphabet : épelle !', 'Les jours et les mois', 'What time is it?', 'Ma famille', 'I like, I don’t like', 'Se décrire',
    'Où est-ce ?', 'Who, what, where, when?', 'He plays, she goes', 'Grand mélange',
  ],
  generate(level, rng, index = 0) {
    // grand mélange : un niveau au hasard, et une de ses formes de questions au hasard
    const kinds = KINDS[level === 10 ? randInt(rng, 0, KINDS.length - 1) : level - 1];
    const kind = level === 10 ? pick(rng, kinds) : kinds[Math.abs(index) % kinds.length];
    return kind(rng);
  },
};

export const CM_ANGLAIS_GAMES = [anglaisCm];
