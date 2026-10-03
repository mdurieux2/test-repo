// Règle l'horloge : l'enfant place lui-même les aiguilles (interaction « setclock »).
// Ce fichier contient aussi la logique du cadran, sans DOM (testée dans tests/) :
// la grande aiguille se cale de 5 en 5 minutes et fait avancer ou reculer l'heure quand
// elle passe le 12 ; la petite aiguille se place sur l'heure. Une heure du cadran est
// codée en minutes depuis 12 h (de 0 à 719).

import { pick, randInt } from '../random.js';
import { clockLabel, clockSpeech } from './maths-extra.js';

export const HALF_DAY = 12 * 60;
const wrap = (t) => ((t % HALF_DAY) + HALF_DAY) % HALF_DAY;

/** { h: 3, m: 15 } (h de 1 à 12) → minutes depuis 12 h. */
export function toClockMinutes({ h, m }) {
  return wrap((h % 12) * 60 + m);
}

/** Minutes depuis 12 h → { h: 1 à 12, m: 0 à 59 }. */
export function fromClockMinutes(t) {
  const n = wrap(t);
  return { h: Math.floor(n / 60) || 12, m: n % 60 };
}

/** Avance (ou recule, si négatif) l'horloge de quelques minutes. */
export function shiftClock(t, minutes) {
  return wrap(t + minutes);
}

/** Angles des aiguilles en degrés (0 = le 12) ; la petite aiguille avance avec les minutes (h + m/60). */
export function handAngles(t) {
  const { h, m } = fromClockMinutes(t);
  return { hour: ((h % 12) + m / 60) * 30, minute: m * 6 };
}

/** Écart entre deux angles, de 0 à 180°. */
export function angleGap(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** Angle du doigt autour du centre (x vers la droite, y vers le bas), 0 = le 12. */
export function pointerAngle(x, y) {
  return ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360;
}

/**
 * L'aiguille qu'on attrape : la plus proche du doigt. Quand les deux aiguilles se
 * superposent, c'est la distance au centre qui décide (la petite aiguille est courte).
 * `radius` est en unités du cadran (rayon 50, petite aiguille longue de 21).
 */
export function pickHand(t, angle, radius) {
  const { hour, minute } = handAngles(t);
  const toHour = angleGap(angle, hour);
  const toMinute = angleGap(angle, minute);
  if (Math.abs(toHour - toMinute) < 20) return radius > 25 ? 'minute' : 'hour';
  return toMinute < toHour ? 'minute' : 'hour';
}

/**
 * La grande aiguille posée sur `angle` : les minutes se calent de 5 en 5. En passant
 * le 12, l'heure avance (dans le sens des aiguilles d'une montre) ou recule.
 */
export function dragMinuteHand(t, angle, step = 5) {
  const { m } = fromClockMinutes(t);
  const snapped = (Math.round(angle / (6 * step)) * step) % 60;
  let delta = snapped - m;
  if (delta > 30) delta -= 60; // on a reculé en passant le 12 : l'heure recule
  if (delta < -30) delta += 60; // on a avancé en passant le 12 : l'heure avance
  return shiftClock(t, delta);
}

/** La petite aiguille posée sur `angle` : l'heure dont la position (avec les minutes actuelles) est la plus proche. */
export function dragHourHand(t, angle) {
  const { m } = fromClockMinutes(t);
  const h = Math.round(angle / 30 - m / 60);
  return toClockMinutes({ h: ((h % 12) + 12) % 12, m });
}

/** Le conseil après une mauvaise réponse : quelle aiguille regarder. */
export function clockAdvice(t, target) {
  const set = fromClockMinutes(t);
  const want = fromClockMinutes(target);
  if (set.m !== want.m && set.h !== want.h) return 'La grande aiguille montre les minutes, la petite les heures.';
  if (set.m !== want.m) return 'La grande aiguille montre les minutes.';
  return 'La petite aiguille montre les heures.';
}

// ---------------------------------------------------------------- Le jeu

const LEVELS = [
  { label: 'Heures pile', minutes: [0] },
  { label: 'Et demie', minutes: [30, 30, 0] },
  { label: 'Et quart, moins le quart', minutes: [15, 45, 15, 45, 0, 30] },
  { label: 'De 5 en 5 minutes', minutes: Array.from({ length: 12 }, (_, i) => i * 5) },
  { label: 'Dans 1 h… Il y a 30 min…', minutes: [0, 15, 30, 45] },
  { label: 'Heures de l’après-midi', minutes: [0, 0, 15, 30, 30, 45, 5, 10, 20, 25, 35, 40, 50, 55] },
];

// « Dans 1 heure… », « Il y a 30 minutes… » : on calcule, puis on règle l'horloge.
const SHIFTS = [
  { minutes: 60, text: 'Dans 1 heure', say: 'Dans une heure' },
  { minutes: 30, text: 'Dans 30 minutes', say: 'Dans 30 minutes' },
  { minutes: 15, text: 'Dans 15 minutes', say: 'Dans un quart d’heure' },
  { minutes: 120, text: 'Dans 2 heures', say: 'Dans deux heures' },
  { minutes: -30, text: 'Il y a 30 minutes', say: 'Il y a 30 minutes' },
  { minutes: -60, text: 'Il y a 1 heure', say: 'Il y a une heure' },
  { minutes: -15, text: 'Il y a 15 minutes', say: 'Il y a un quart d’heure' },
];

const capitalize = (text) => `${text[0].toUpperCase()}${text.slice(1)}`;
/** « 15 heures 30 » (l'après-midi, on dit l'heure de 13 à 23). */
const hours24 = (h, m) => `${h} heures${m ? ` ${m}` : ''}`;

/** Une heure de départ du cadran, différente de la réponse (heures pile au niveau 1). */
function startTime(rng, level, target) {
  const minutes = level === 1 ? [0] : level === 2 ? [0, 30] : level === 3 ? [0, 15, 30, 45] : LEVELS[3].minutes;
  for (;;) {
    const start = { h: randInt(rng, 1, 12), m: pick(rng, minutes) };
    if (toClockMinutes(start) !== toClockMinutes(target)) return start;
  }
}

/** La question : l'heure à régler (target), l'heure de départ du cadran (stage.start). */
function question({ key, text, instruction, short, start, target, success, extra = {} }) {
  return {
    key,
    interaction: 'setclock',
    text,
    instruction,
    ...(short ? { short } : {}),
    stage: { type: 'setclock', start },
    target,
    answer: clockLabel(target.h, target.m),
    answerSpeech: clockSpeech(target.h, target.m),
    choices: [],
    success: { speak: success },
    ...extra,
  };
}

export const regleHorloge = {
  id: 'regle-horloge',
  domain: 'temps',
  section: 'L’heure et le calendrier',
  title: 'Règle l’horloge',
  icon: '🕰️',
  skill: 'Placer les aiguilles d’une horloge, calculer une heure',
  levels: LEVELS.map((l) => l.label),
  generate(level, rng) {
    const { minutes } = LEVELS[level - 1];
    if (level === 5) {
      // il est 3 h 15 (le cadran montre l'heure qu'il est) ; dans 1 heure, quelle heure sera-t-il ?
      const now = { h: randInt(rng, 1, 12), m: pick(rng, minutes) };
      const shift = pick(rng, SHIFTS);
      const target = fromClockMinutes(shiftClock(toClockMinutes(now), shift.minutes));
      const future = shift.minutes > 0;
      const verb = future ? 'sera-t-il' : 'était-il';
      return question({
        key: `regle-horloge:calcul:${now.h}:${now.m}:${shift.minutes}`,
        text: `Il est ${clockLabel(now.h, now.m)}. ${shift.text}, quelle heure ${verb} ?`,
        instruction: `Il est ${clockSpeech(now.h, now.m)}. ${shift.say}, quelle heure ${verb} ? Règle l’horloge.`,
        start: now,
        target,
        success: `${shift.say}, il ${future ? 'sera' : 'était'} ${clockSpeech(target.h, target.m)}.`,
        extra: { shift: shift.minutes },
      });
    }
    if (level === 6) {
      // l'après-midi, on dit « 15 h » : sur l'horloge, c'est 3 h
      const target = { h: randInt(rng, 1, 11), m: pick(rng, minutes) };
      const said = clockLabel(target.h + 12, target.m);
      return question({
        key: `regle-horloge:apres-midi:${target.h}:${target.m}`,
        text: `C’est l’après-midi. Règle l’horloge sur ${said}.`,
        instruction: `C’est l’après-midi. Mets l’horloge à ${hours24(target.h + 12, target.m)}. Sur l’horloge, on enlève 12 heures.`,
        short: { key: 'regle-horloge:apres-midi', text: `Règle l’horloge sur ${said}.`, speak: `${hours24(target.h + 12, target.m)}.` },
        start: startTime(rng, level, target),
        target,
        success: `${hours24(target.h + 12, target.m)}, c’est ${clockSpeech(target.h, target.m)} de l’après-midi.`,
        extra: { hour24: target.h + 12 },
      });
    }
    const target = { h: randInt(rng, 1, 12), m: pick(rng, minutes) };
    const label = clockLabel(target.h, target.m);
    const spoken = clockSpeech(target.h, target.m);
    return question({
      key: `regle-horloge:${level}:${target.h}:${target.m}`,
      text: `Règle l’horloge sur ${label}.`,
      instruction: `Déplace les aiguilles pour mettre l’horloge à ${spoken}. La petite aiguille montre les heures, la grande aiguille montre les minutes.`,
      short: { key: 'regle-horloge:poser', text: `Règle l’horloge sur ${label}.`, speak: `${capitalize(spoken)}.` },
      start: startTime(rng, level, target),
      target,
      success: `L’horloge montre ${spoken}.`,
    });
  },
};
