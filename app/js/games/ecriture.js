// « Écris au doigt » : apprendre le geste d'écriture. L'enfant suit le chemin gris avec son
// doigt, en partant du point vert, trait après trait, dans l'ordre et le sens appris à l'école :
// graphisme, chiffres, capitales, minuscules attachées, puis les lettres de son prénom.

import { pick } from '../random.js';
import { LETTER_NAMES } from './francais-extra.js';
import {
  CAPITALES, CHIFFRES, CURSIVE, GRAPHISMES, WRITING_LINES, capitalName, nameLetters,
} from '../data/ecriture-data.js';

const FOLLOW = 'Suis le chemin avec ton doigt, en partant du point vert.';

/** Le nom d'une lettre, dit lentement (« bé », « ache »…). */
const spoken = (letter) => ({ text: LETTER_NAMES[letter.toLowerCase()] || letter, rate: 0.8 });

function traceQuestion({ key, set, glyph, strokes, text, instruction, short, success, word = null, position = null }) {
  return {
    key,
    interaction: 'trace',
    text,
    instruction,
    short,
    stage: { type: 'trace', set, glyph, strokes, lines: set === 'cursive' ? WRITING_LINES[glyph] : null, word, position },
    choices: [],
    answer: glyph,
    success,
  };
}

/** Une capitale au hasard (niveau 3, ou niveau 5 quand le prénom n'a pas de lettre). */
function capitalQuestion(rng, level) {
  const letter = pick(rng, Object.keys(CAPITALES));
  const text = `Écris la lettre ${letter}.`;
  return traceQuestion({
    key: `ecrire:${level}:${letter}`,
    set: 'capitales',
    glyph: letter,
    strokes: CAPITALES[letter],
    text,
    instruction: ['Écris la lettre', spoken(letter), FOLLOW],
    short: { key: 'ecrire:3', text, speak: ['La lettre', spoken(letter), '!'] },
    success: { speak: ['Voilà un beau', spoken(letter), '!'] },
  });
}

/** Niveau 5 : la lettre n°index du prénom (en capitales, sans accent). */
function nameQuestion(rng, index, name) {
  const letters = nameLetters(name);
  if (!letters) return capitalQuestion(rng, 5);
  const word = capitalName(name);
  const rank = index % letters.length;
  const letter = letters[rank];
  // la place de cette lettre dans le prénom écrit (tirets et espaces compris)
  let position = -1;
  for (let i = 0, n = -1; i < word.length; i++) {
    if (/[A-Z]/.test(word[i]) && ++n === rank) {
      position = i;
      break;
    }
  }
  const text = `Écris le ${letter} de ${word}.`;
  return traceQuestion({
    key: `ecrire:5:${rank}:${letter}`,
    set: 'capitales',
    glyph: letter,
    strokes: CAPITALES[letter],
    text,
    instruction: ['Écris le', spoken(letter), `de ${name}.`, FOLLOW],
    short: { key: 'ecrire:5', text, speak: ['Le', spoken(letter), `de ${name} !`] },
    success: { speak: ['Voilà le', spoken(letter), `de ${name} !`] },
    word,
    position,
  });
}

export const ecrire = {
  id: 'ecrire',
  domain: 'francais',
  section: 'Écrire',
  title: 'Écris au doigt',
  icon: '✍️',
  skill: 'Apprendre le geste d’écriture : tracer traits, chiffres et lettres dans le bon ordre et le bon sens',
  levels: ['Traits et boucles', 'Les chiffres', 'Les capitales', 'Les minuscules attachées', 'Ton prénom'],
  generate(level, rng, index = 0, context = {}) {
    if (level === 1) {
      const id = pick(rng, Object.keys(GRAPHISMES));
      const { text, strokes } = GRAPHISMES[id];
      return traceQuestion({
        key: `ecrire:1:${id}`,
        set: 'graphisme',
        glyph: id,
        strokes,
        text,
        instruction: `${text} ${FOLLOW}`,
        short: { key: 'ecrire:1', text },
        success: { speak: 'C’est bien tracé !' },
      });
    }
    if (level === 2) {
      const digit = pick(rng, Object.keys(CHIFFRES));
      const text = `Écris le chiffre ${digit}.`;
      return traceQuestion({
        key: `ecrire:2:${digit}`,
        set: 'chiffres',
        glyph: digit,
        strokes: CHIFFRES[digit],
        text,
        instruction: `${text} ${FOLLOW}`,
        short: { key: 'ecrire:2', text },
        success: { speak: `Voilà un beau ${digit} !` },
      });
    }
    if (level === 4) {
      const letter = pick(rng, Object.keys(CURSIVE));
      const text = `Écris le ${letter} en attaché.`;
      return traceQuestion({
        key: `ecrire:4:${letter}`,
        set: 'cursive',
        glyph: letter,
        strokes: CURSIVE[letter],
        text,
        instruction: ['Écris le', spoken(letter), 'en lettres attachées.', FOLLOW],
        short: { key: 'ecrire:4', text, speak: ['Le', spoken(letter), 'en attaché !'] },
        success: { speak: ['Voilà un beau', spoken(letter), '!'] },
      });
    }
    if (level === 5) return nameQuestion(rng, index, context?.name);
    return capitalQuestion(rng, 3);
  },
};
