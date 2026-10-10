// « Le monde » : gauche ou droite ? Un jeu pour apprendre vraiment sa gauche et sa droite, comme
// dans les traces écrites de l'école (repérage dans l'espace), dans l'ordre des programmes :
//   MS  : l'image de gauche, à gauche de…, on lit de gauche à droite (niveaux 1 à 3) ;
//   GS  : sa gauche et sa droite sur soi (le dos des mains, l'astuce du L), les flèches (4 et 5) ;
//   CP  : tourner à gauche ou à droite : le robot qui pivote d'un quart de tour, la voiture qui tourne
//         au carrefour vue de dessus (6 à 8, plus difficile quand elle vient vers nous) ;
//   CE1 : la gauche et la droite de quelqu'un qui nous regarde, ou nous tourne le dos (9 et 10).
// Les dessins (flèche, carrefour, robot) sont des SVG fabriqués ici par gaucheDroiteSvg ; les mains
// et les enfants sont ceux de « Se repérer » (vivre.js). `generate` ne renvoie que des données.

import { pick, sample, shuffle } from '../random.js';

const INK = '#2b2d42';
const drawing = (d, label) => ({ type: 'drawing', drawing: d, label });
const GD = ['gauche', 'droite'];
const other = (side) => (side === 'gauche' ? 'droite' : 'gauche');
// les deux réponses écrites, toujours dans le même ordre : « à gauche » à gauche, « à droite » à droite
const sideChoices = (prefix) => GD.map((s) => ({ value: s, label: `${prefix}${s}` }));

/** « le chat » → « du chat », « la souris » → « de la souris », « l’ours » → « de l’ours » */
function deName(name) {
  return name.startsWith('le ') ? `du ${name.slice(3)}` : `de ${name}`;
}

const capitalize = (text) => `${text[0].toUpperCase()}${text.slice(1)}`;

const ANIMALS = [
  { emoji: '🐱', name: 'le chat' }, { emoji: '🐶', name: 'le chien' }, { emoji: '🐰', name: 'le lapin' },
  { emoji: '🐭', name: 'la souris' }, { emoji: '🐷', name: 'le cochon' }, { emoji: '🐸', name: 'la grenouille' },
];
const THINGS = [
  { emoji: '🍎', name: 'la pomme' }, { emoji: '⚽', name: 'le ballon' }, { emoji: '🚗', name: 'la voiture' },
  { emoji: '🌸', name: 'la fleur' }, { emoji: '⭐', name: 'l’étoile' }, { emoji: '🧸', name: 'le nounours' },
  { emoji: '🍌', name: 'la banane' }, { emoji: '🎁', name: 'le cadeau' },
];
// ce que tient l'enfant dessiné (de face ou de dos)
const HELD = [
  { emoji: '✏️', name: 'son crayon' }, { emoji: '🎈', name: 'son ballon' }, { emoji: '🍦', name: 'sa glace' },
  { emoji: '🌷', name: 'sa fleur' },
];
// mots de 3 ou 4 lettres, en capitales, avec leur image (le sens de la lecture)
const WORDS = [
  { word: 'LIT', emoji: '🛏️' }, { word: 'SAC', emoji: '🎒' }, { word: 'BUS', emoji: '🚌' }, { word: 'OURS', emoji: '🐻' },
  { word: 'LUNE', emoji: '🌙' }, { word: 'MOTO', emoji: '🏍️' }, { word: 'VÉLO', emoji: '🚲' }, { word: 'ROBE', emoji: '👗' },
  { word: 'PAIN', emoji: '🍞' }, { word: 'LOUP', emoji: '🐺' }, { word: 'COQ', emoji: '🐓' },
];

// ---------------------------------------------------------------- Les dessins (SVG)

const ARROW_ANGLE = { r: 0, d: 90, l: 180, u: 270 };
const DIR_WORDS = { u: 'vers le haut', r: 'vers la droite', d: 'vers le bas', l: 'vers la gauche' };

/** Une grosse flèche dans un carré blanc. */
function arrowSvg({ dir }) {
  return '<svg viewBox="0 0 100 100" aria-hidden="true">'
    + `<rect x="4" y="4" width="92" height="92" rx="18" fill="#fff" stroke="#b9b2a3" stroke-width="3"/>`
    + `<g transform="rotate(${ARROW_ANGLE[dir]} 50 50)" fill="${INK}">`
    + '<rect x="16" y="42" width="50" height="16" rx="5"/><path d="M58 24 L88 50 L58 76 Z" stroke-linejoin="round"/></g>'
    + '</svg>';
}

// Le carrefour vu de dessus. La voiture roule à droite (comme en France) ; elle est dessinée en bas,
// vers le haut, puis tout le dessin tourne pour qu'elle arrive de l'un des quatre côtés.
const HEADING_ANGLE = { n: 0, e: 90, s: 180, w: 270 };

function arrowHead(x, y, angle, color) {
  return `<path d="M0 -7 L12 0 L0 7 Z" fill="${color}" transform="translate(${x} ${y}) rotate(${angle})"/>`;
}

function carSvg(x, y) {
  return `<g transform="translate(${x} ${y})">`
    + `<rect x="-6.5" y="-10.5" width="13" height="21" rx="4" fill="#e03131" stroke="${INK}" stroke-width="1.2"/>`
    + '<rect x="-4.6" y="-6.5" width="9.2" height="5" rx="1.5" fill="#d0ebff"/>'
    + '<rect x="-4.6" y="4.2" width="9.2" height="3.4" rx="1.2" fill="#d0ebff"/>'
    + '<circle cx="-3.6" cy="-9.6" r="1.5" fill="#ffe066"/><circle cx="3.6" cy="-9.6" r="1.5" fill="#ffe066"/>'
    + '</g>';
}

function crossroadSvg({ heading, turn }) {
  const road = '#868e96';
  const paths = {
    droite: { d: 'M59 70 L59 65 Q59 59 65 59 L84 59', end: [84, 59, 0] },
    gauche: { d: 'M59 70 L59 47 Q59 41 53 41 L16 41', end: [16, 41, 180] },
    'tout droit': { d: 'M59 70 L59 16', end: [59, 16, 270] },
  };
  const path = paths[turn];
  const dashes = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#fff" stroke-width="1.6" stroke-dasharray="5 4"/>`;
  const arrow = (color, width) => `<path d="${path.d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
  return '<svg viewBox="0 0 100 100" aria-hidden="true">'
    + `<g transform="rotate(${HEADING_ANGLE[heading]} 50 50)">`
    + '<rect x="0" y="0" width="100" height="100" rx="10" fill="#b2dd8f"/>'
    + `<rect x="32" y="0" width="36" height="100" fill="${road}"/><rect x="0" y="32" width="100" height="36" fill="${road}"/>`
    + dashes(50, 0, 50, 30) + dashes(50, 70, 50, 100) + dashes(0, 50, 30, 50) + dashes(70, 50, 100, 50)
    + arrow('#fff', 7.5) + arrow('#1864ab', 4)
    + arrowHead(...path.end.slice(0, 2), path.end[2], '#1864ab')
    + carSvg(59, 84)
    + '</g></svg>';
}

/** Le robot vu de dessus : son nez (le triangle) et ses yeux montrent où il regarde. */
function robotSvg({ dir }) {
  return '<svg viewBox="0 0 100 100" aria-hidden="true">'
    + `<g transform="rotate(${{ u: 0, r: 90, d: 180, l: 270 }[dir]} 50 50)">`
    + `<rect x="18" y="34" width="10" height="30" rx="4" fill="${INK}"/><rect x="72" y="34" width="10" height="30" rx="4" fill="${INK}"/>`
    + `<rect x="26" y="24" width="48" height="58" rx="18" fill="#ffd43b" stroke="${INK}" stroke-width="3"/>`
    + `<rect x="27.5" y="56" width="45" height="7" fill="${INK}"/><rect x="27.5" y="68" width="45" height="6" fill="${INK}"/>`
    + `<circle cx="40" cy="38" r="7" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="60" cy="38" r="7" fill="#fff" stroke="${INK}" stroke-width="2"/>`
    + `<circle cx="40" cy="35" r="3.2" fill="${INK}"/><circle cx="60" cy="35" r="3.2" fill="${INK}"/>`
    + `<path d="M40 24 L50 8 L60 24 Z" fill="#e8590c" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`
    + '</g></svg>';
}

/** Les dessins de ce jeu (appelé par render.js) ; null pour un autre dessin. */
export function gaucheDroiteSvg(d) {
  if (d.kind === 'fleche') return arrowSvg(d);
  if (d.kind === 'carrefour') return crossroadSvg(d);
  if (d.kind === 'robot') return robotSvg(d);
  return null;
}

// ---------------------------------------------------------------- Les niveaux

/** Niveau 4 : le dos des mains ; la main gauche fait un L avec le pouce et l'index. */
function hands(rng) {
  const side = pick(rng, GD);
  const trick = 'Avec la main gauche, le pouce et l’index font un L.';
  const says = side === 'gauche' ? 'Oui, c’est la main gauche : le pouce et l’index font un L.' : 'Oui, c’est la main droite.';
  const kind = Math.floor(rng() * 3);
  if (kind === 0) {
    const text = 'Voici le dos d’une main. Est-ce la main gauche ou la main droite ?';
    return {
      key: `gd:main:${side}`,
      text,
      instruction: [text, 'Pose tes mains sur la table pour comparer.'],
      stage: drawing({ kind: 'main', side }, 'Le dos d’une main'),
      choices: GD.map((s) => ({ value: s, label: `Main ${s}` })),
      choiceStyle: 'words',
      answer: side,
      success: { speak: says },
    };
  }
  const order = shuffle(rng, GD);
  if (kind === 1) {
    const text = `Voici le dos de deux mains. Touche la main ${side}.`;
    return {
      key: `gd:mains:${side}:${order.join('')}`,
      text,
      instruction: [text, trick],
      stage: { type: 'none' },
      choices: order.map((s) => ({ value: s, drawing: { kind: 'main', side: s }, name: 'Le dos d’une main' })),
      choiceStyle: 'drawings',
      answer: side,
      success: { speak: says },
    };
  }
  const text = 'Quelle main fait un L avec le pouce et l’index ?';
  return {
    key: `gd:mains-l:${order.join('')}`,
    text,
    instruction: [text, 'Pose tes mains sur la table, et regarde bien.'],
    stage: { type: 'none' },
    choices: order.map((s) => ({ value: s, drawing: { kind: 'main', side: s }, name: 'Le dos d’une main' })),
    choiceStyle: 'drawings',
    answer: 'gauche',
    success: { speak: 'Oui, c’est la main gauche : le pouce et l’index font un L.' },
  };
}

/** Niveau 1 : toucher l'image de gauche ou de droite (2 ou 3 images, toujours sur une ligne). */
function leftPicture(rng) {
  const n = rng() < 0.5 ? 2 : 3;
  const row = sample(rng, THINGS, n);
  const side = pick(rng, GD);
  const target = side === 'gauche' ? row[0] : row.at(-1);
  const text = `Touche l’image de ${side}.`;
  return {
    key: `gd:image:${side}:${row.map((t) => t.emoji).join('')}`,
    text,
    instruction: text,
    stage: { type: 'none' },
    choices: row.map((t) => ({ value: t.name, label: t.emoji, name: t.name })),
    choiceStyle: 'pictures',
    answer: target.name,
    success: { speak: `Oui, ${target.name} est à ${side}.` },
  };
}

/** Niveau 2 : à gauche de…, à droite de… dans une rangée de quatre animaux. */
function nextTo(rng) {
  const row = sample(rng, ANIMALS, 4);
  const stage = { type: 'pattern', items: row.map((a) => a.emoji) };
  if (rng() < 0.5) {
    const side = pick(rng, GD);
    // un animal qui a un voisin de ce côté
    const i = side === 'droite' ? Math.floor(rng() * 3) : 1 + Math.floor(rng() * 3);
    const target = row[i];
    const answer = row[side === 'droite' ? i + 1 : i - 1];
    const trap = row[side === 'droite' ? i - 1 : i + 1]; // le voisin de l'autre côté
    const options = shuffle(rng, [...new Set([answer, target, trap].filter(Boolean)), ...row.filter((a) => a !== answer && a !== target && a !== trap)].slice(0, 3));
    const text = `Qui est juste à ${side} ${deName(target.name)} ?`;
    return {
      key: `gd:voisin:${row.map((a) => a.emoji).join('')}:${i}:${side}`,
      text,
      instruction: text,
      stage,
      choices: options.map((a) => ({ value: a.name, label: a.emoji, name: a.name })),
      choiceStyle: 'pictures',
      answer: answer.name,
      success: { speak: `Oui, ${answer.name} est juste à ${side} ${deName(target.name)}.` },
    };
  }
  const [i, j] = sample(rng, [0, 1, 2, 3], 2);
  const [a, b] = [row[i], row[j]];
  const side = i < j ? 'gauche' : 'droite';
  const text = `${capitalize(a.name)} est-il à gauche ou à droite ${deName(b.name)} ?`.replace(/^(La .*) est-il/, '$1 est-elle');
  return {
    key: `gd:cote:${row.map((x) => x.emoji).join('')}:${i}:${j}`,
    text,
    instruction: text,
    stage,
    choices: sideChoices('à '),
    choiceStyle: 'words',
    answer: side,
    success: { speak: `Oui, ${a.name} est à ${side} ${deName(b.name)}.` },
  };
}

/** Niveau 5 : les flèches. */
function arrows(rng) {
  if (rng() < 0.5) {
    const side = pick(rng, GD);
    const dir = side === 'gauche' ? 'l' : 'r';
    const text = 'Cette flèche va-t-elle vers la gauche ou vers la droite ?';
    return {
      key: `gd:fleche:${dir}`,
      text,
      instruction: text,
      stage: drawing({ kind: 'fleche', dir }, 'Une flèche'),
      choices: sideChoices('vers la '),
      choiceStyle: 'words',
      answer: side,
      success: { speak: `Oui, elle va vers la ${side}.` },
    };
  }
  const side = pick(rng, GD);
  const dirs = shuffle(rng, ['u', 'r', 'd', 'l']);
  const text = `Touche la flèche qui va vers la ${side}.`;
  return {
    key: `gd:fleches:${side}:${dirs.join('')}`,
    text,
    instruction: text,
    stage: { type: 'none' },
    choices: dirs.map((dir) => ({ value: dir, drawing: { kind: 'fleche', dir }, name: 'Une flèche' })),
    choiceStyle: 'drawings',
    answer: side === 'gauche' ? 'l' : 'r',
    success: { speak: `Oui, cette flèche va vers la ${side}.` },
  };
}

/** Niveau 3 : on lit de gauche à droite (la première et la dernière lettre d'un mot). */
function readingDirection(rng) {
  const { word, emoji } = pick(rng, WORDS);
  const letters = [...word];
  const first = rng() < 0.6;
  const text = `On lit de gauche à droite. Touche la ${first ? 'première' : 'dernière'} lettre du mot.`;
  return {
    key: `gd:lecture:${word}:${first}`,
    text,
    instruction: text,
    stage: { type: 'picture', emoji },
    choices: letters.map((l, k) => ({ value: k, label: l })),
    choiceStyle: 'letters',
    answer: first ? 0 : letters.length - 1,
    success: { speak: first ? 'Oui, le mot commence par cette lettre, à gauche.' : 'Oui, le mot finit par cette lettre, à droite.' },
  };
}

// L'enfant dessiné tient l'objet du côté `at` de l'écran ; de face, sa main droite est à notre gauche.
const handOf = (view, at) => (view === 'dos' ? at : other(at));

/** Niveau 9 : un copain qui nous regarde (de face) : dans quelle main tient-il son crayon ? */
function facing(rng) {
  const girl = rng() < 0.5;
  const held = pick(rng, HELD);
  if (rng() < 0.5) {
    const at = pick(rng, GD);
    const answer = handOf('face', at);
    const intro = girl ? 'Cette copine te regarde.' : 'Ce copain te regarde.';
    const question = `Dans quelle main tient-${girl ? 'elle' : 'il'} ${held.name} ?`;
    return {
      key: `gd:face:${girl}:${held.emoji}:${at}`,
      text: `${intro} ${question}`,
      instruction: [intro, question],
      stage: drawing({ kind: 'enfant', view: 'face', girl, hold: held.emoji, at }, 'Un enfant vu de face'),
      choices: GD.map((s) => ({ value: s, label: `Sa main ${s}` })),
      choiceStyle: 'words',
      answer,
      success: { speak: [`Oui, sa main ${answer} !`, 'Quand on est face à face, sa main droite est en face de ta main gauche.'] },
    };
  }
  const side = pick(rng, GD);
  const order = shuffle(rng, GD);
  const text = `Ces enfants te regardent. Touche celui qui tient ${held.name} dans sa main ${side}.`;
  return {
    key: `gd:faces:${held.emoji}:${side}:${order.join('')}`,
    text,
    instruction: text,
    stage: { type: 'none' },
    choices: order.map((at) => ({ value: at, drawing: { kind: 'enfant', view: 'face', girl, hold: held.emoji, at }, name: 'Un enfant vu de face' })),
    choiceStyle: 'drawings',
    answer: side === 'droite' ? 'gauche' : 'droite', // de face : sa droite est à notre gauche
    success: { speak: ['Oui, c’est lui !', 'Quand on est face à face, sa main droite est en face de ta main gauche.'] },
  };
}

/** Niveau 10 : de face ou de dos, trois enfants ; un seul tient son crayon dans la main demandée. */
function faceOrBack(rng) {
  const side = pick(rng, GD);
  const held = pick(rng, HELD);
  const all = ['face', 'dos'].flatMap((view) => GD.map((at) => ({ view, at })));
  const right = shuffle(rng, all.filter((k) => handOf(k.view, k.at) === side))[0];
  const wrong = all.filter((k) => handOf(k.view, k.at) !== side);
  const options = shuffle(rng, [right, ...wrong]);
  const text = `Touche l’enfant qui tient ${held.name} dans sa main ${side}.`;
  return {
    key: `gd:face-dos:${held.emoji}:${side}:${options.map((k) => k.view + k.at).join('')}`,
    text,
    instruction: [text, 'Attention : certains te regardent, d’autres te tournent le dos.'],
    stage: { type: 'none' },
    choices: options.map((k, n) => ({
      value: `${k.view}:${k.at}`,
      drawing: { kind: 'enfant', view: k.view, girl: n % 2 === 0, hold: held.emoji, at: k.at },
      name: k.view === 'face' ? 'Un enfant vu de face' : 'Un enfant vu de dos',
    })),
    choiceStyle: 'drawings',
    answer: `${right.view}:${right.at}`,
    success: {
      speak: [`Oui, c’est sa main ${side} !`, right.view === 'face'
        ? 'De face, sa main droite est en face de ta main gauche.'
        : 'De dos, sa main droite est du même côté que ta main droite.'],
    },
  };
}

const HEADINGS = ['n', 'e', 's', 'w'];
const crossroadName = (k) => `Le carrefour ${'ABC'[k]}, vu de dessus`;

/** Niveaux 7 et 8 : la voiture tourne-t-elle à gauche ou à droite ? (7 : elle monte ; 8 : elle vient d'ailleurs) */
function crossroad(rng, mode) {
  const heading = () => (mode === 'monte' ? 'n' : pick(rng, HEADINGS.slice(1)));
  const help = mode === 'monte' ? [] : ['Mets-toi à la place du conducteur : tourne la tablette dans le sens de la voiture.'];
  if (rng() < 0.5) {
    const turn = pick(rng, GD);
    const h = heading();
    const text = 'La voiture va-t-elle tourner à gauche ou à droite ?';
    return {
      key: `gd:carrefour:${h}:${turn}`,
      text,
      instruction: [text, ...help],
      stage: drawing({ kind: 'carrefour', heading: h, turn }, 'Un carrefour vu de dessus, avec une voiture et une flèche'),
      choices: sideChoices('à '),
      choiceStyle: 'words',
      answer: turn,
      success: { speak: `Oui, la voiture tourne à ${turn}.` },
    };
  }
  const side = pick(rng, GD);
  const turns = shuffle(rng, [side, other(side), 'tout droit']);
  const options = turns.map((turn) => ({ turn, heading: heading() }));
  const text = `Touche la voiture qui va tourner à ${side}.`;
  return {
    key: `gd:carrefours:${side}:${options.map((o) => o.heading + o.turn).join(',')}`,
    text,
    instruction: [text, ...help],
    stage: { type: 'none' },
    choices: options.map((o, k) => ({ value: o.turn, drawing: { kind: 'carrefour', heading: o.heading, turn: o.turn }, name: crossroadName(k) })),
    choiceStyle: 'drawings',
    answer: side,
    success: { speak: `Oui, cette voiture tourne à ${side}.` },
  };
}

const TURNS = [['droite'], ['gauche'], ['droite', 'droite'], ['gauche', 'gauche'], ['droite', 'gauche']];
const TURN_TEXT = {
  droite: 'Le robot fait un quart de tour à droite.',
  gauche: 'Le robot fait un quart de tour à gauche.',
  'droite,droite': 'Le robot fait un quart de tour à droite, puis encore un à droite.',
  'gauche,gauche': 'Le robot fait un quart de tour à gauche, puis encore un à gauche.',
  'droite,gauche': 'Le robot fait un quart de tour à droite, puis un à gauche.',
};
const CLOCKWISE = ['u', 'r', 'd', 'l'];

/** Le robot après ses quarts de tour (à droite : dans le sens des aiguilles d'une montre). */
export function robotAfter(dir, turns) {
  let k = CLOCKWISE.indexOf(dir);
  for (const t of turns) k = (k + (t === 'droite' ? 1 : 3)) % 4;
  return CLOCKWISE[k];
}

/** Niveaux 6 et 8 : le robot fait un quart de tour (6), ou deux (8) ; comment est-il ensuite ? */
function robot(rng, count) {
  const dir = pick(rng, CLOCKWISE);
  const turns = pick(rng, TURNS.filter((t) => t.length === count));
  const end = robotAfter(dir, turns);
  const options = shuffle(rng, CLOCKWISE);
  const intro = TURN_TEXT[turns.join(',')];
  const question = 'Touche le robot tel qu’il sera ensuite.';
  return {
    key: `gd:robot:${dir}:${turns.join(',')}`,
    text: `${intro} ${question}`,
    instruction: [intro, question],
    stage: drawing({ kind: 'robot', dir }, `Un robot vu de dessus, qui regarde ${DIR_WORDS[dir]}`),
    choices: options.map((d) => ({ value: d, drawing: { kind: 'robot', dir: d }, name: `Le robot regarde ${DIR_WORDS[d]}` })),
    choiceStyle: 'drawings',
    answer: end,
    success: { speak: `Oui, maintenant le robot regarde ${DIR_WORDS[end]}.` },
  };
}

export const gaucheDroite = {
  id: 'gauche-droite',
  domain: 'monde',
  title: 'Gauche ou droite ?',
  icon: '↔️',
  skill: 'Connaître sa gauche et sa droite, sur soi, sur la feuille, chez les autres et pour un déplacement',
  levels: [
    'L’image de gauche, de droite', 'À gauche de…, à droite de…', 'On lit de gauche à droite',
    'Ma main gauche, ma main droite', 'Les flèches', 'Le robot fait un quart de tour', 'La voiture tourne',
    'Virages plus difficiles', 'Sa main droite, de face', 'De face ou de dos',
  ],
  generate(level, rng) {
    switch (level) {
      case 1: return leftPicture(rng);
      case 2: return nextTo(rng);
      case 3: return readingDirection(rng);
      case 4: return hands(rng);
      case 5: return arrows(rng);
      case 6: return robot(rng, 1);
      case 7: return crossroad(rng, 'monte');
      // la voiture qui arrive d'un autre côté, ou le robot qui tourne deux fois
      case 8: return rng() < 0.6 ? crossroad(rng, 'partout') : robot(rng, 2);
      case 9: return facing(rng);
      default: return faceOrBack(rng);
    }
  },
};
