// « Le monde » : vivre ensemble (émotions, politesse, règles, sécurité dans la rue et à la maison,
// numéros d'urgence) et se repérer dans l'espace (sur, sous, devant, derrière, gauche, droite,
// quadrillages et petits plans).
// Les dessins (feu des piétons, panneaux, mains, enfant de face ou de dos, quadrillages, flèches)
// sont des SVG fabriqués ici par drawingSvg et affichés par render.js : `generate` ne renvoie que
// des données. Jamais d'information portée par la couleur seule : le bonhomme rouge est arrêté et
// en haut, le vert marche et est en bas ; les panneaux se distinguent aussi par leur forme.

import { pick, sample, shuffle } from '../random.js';

const NB = ' '; // espace insécable avant « ? », « ! » et « : » dans les boutons

function capitalize(text) {
  return `${text[0].toUpperCase()}${text.slice(1)}`;
}

/** « Bonjour, Merci ou Pardon » : les réponses lues à voix haute. */
function spokenList(labels) {
  return labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(', ')} ou ${labels.at(-1)}`;
}

/** « le chat » → « du chat », « la souris » → « de la souris », « l’os » → « de l’os » */
function deName(name) {
  return name.startsWith('le ') ? `du ${name.slice(3)}` : `de ${name}`;
}

/** Une question à choix de réponses écrites, lues à voix haute (pour ceux qui ne lisent pas encore). */
function textQuestion({ key, text, stage, answer, wrong, style = 'sentences', success, rng }) {
  const options = shuffle(rng, [answer, ...wrong]);
  return {
    key,
    text,
    instruction: [text, `${capitalize(spokenList(options))} ?`],
    stage,
    choices: options.map((o) => ({ value: o, label: o })),
    choiceStyle: style,
    answer,
    success: { speak: success },
  };
}

const picture = (emoji) => ({ type: 'picture', emoji });
const drawing = (d, label) => ({ type: 'drawing', drawing: d, label });

// ================================================================ Les dessins (SVG)

const INK = '#2b2d42';
const RED = '#d6202a';
const BLUE = '#1f5fbf';
const SKIN = '#f6c9a4';
const SKIN_LINE = '#a86e4a';

/** Un pictogramme (dans un carré de 100 × 100) posé en (x, y), à l'échelle s. */
const place = (picto, x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">${picto}</g>`;

/** Piéton qui marche vers la droite. */
function walker(color) {
  return `<g fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round">`
    + `<circle cx="56" cy="13" r="10" fill="${color}" stroke="none"/>`
    + '<path d="M53 30 L45 60" stroke-width="15"/>'
    + '<path d="M51 34 L62 46 L71 50" stroke-width="7"/><path d="M50 34 L39 45 L33 55" stroke-width="7"/>'
    + '<path d="M46 59 L56 76 L60 95" stroke-width="9"/><path d="M45 59 L36 77 L25 91" stroke-width="9"/>'
    + '</g>';
}

/** Piéton immobile, bras le long du corps, jambes serrées. */
function stander(color) {
  return `<g fill="none" stroke="${color}" stroke-linecap="round">`
    + `<circle cx="50" cy="12" r="10" fill="${color}" stroke="none"/>`
    + '<path d="M50 32 L50 60" stroke-width="18"/>'
    + '<path d="M38 33 L36 60" stroke-width="7"/><path d="M62 33 L64 60" stroke-width="7"/>'
    + '<path d="M44 64 L44 95" stroke-width="9"/><path d="M56 64 L56 95" stroke-width="9"/>'
    + '</g>';
}

/** Vélo tourné vers la droite. */
function bike(color) {
  return `<g fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">`
    + '<circle cx="22" cy="66" r="17"/><circle cx="78" cy="66" r="17"/>'
    + '<path d="M22 66 L48 66 L39 40 Z"/><path d="M39 40 L68 40 L48 66"/><path d="M68 40 L78 66"/>'
    + '<path d="M68 40 L64 28 L75 28"/><path d="M39 40 L37 32 M31 32 L44 32"/>'
    + '</g>';
}

const WALKER_IN_DISC = (color) => place(walker(color), 22.7, 20.4, 0.58);
const BIKE_IN_DISC = (color) => place(bike(color), 20, 17, 0.6);
const EDGE = '<circle cx="50" cy="50" r="49.3" fill="none" stroke="#b9b2a3" stroke-width="1"/>';
const ringSign = (inner) => `<circle cx="50" cy="50" r="43" fill="#fff" stroke="${RED}" stroke-width="10"/>${EDGE}${inner}`;
const blueDisc = (inner) => `<circle cx="50" cy="50" r="47" fill="${BLUE}" stroke="#fff" stroke-width="3"/>${EDGE}${inner}`;
const octagon = Array.from({ length: 8 }, (_, i) => {
  const a = ((22.5 + 45 * i) * Math.PI) / 180;
  return `${(50 + 47 * Math.cos(a)).toFixed(1)},${(50 + 47 * Math.sin(a)).toFixed(1)}`;
}).join(' ');

/**
 * Panneaux pour les piétons et les vélos (code de la route français) : leur nom (bouton), ce qu'ils
 * veulent dire (dit après une bonne réponse) et leur dessin.
 */
export const SIGNS = {
  'interdit-pietons': {
    label: 'Interdit aux piétons', code: 'B9a',
    says: 'Le cercle rouge veut dire « interdit » : les piétons ne passent pas ici.',
    svg: () => ringSign(WALKER_IN_DISC(INK)),
  },
  'interdit-velos': {
    label: 'Interdit aux vélos', code: 'B9b',
    says: 'Le cercle rouge veut dire « interdit » : les vélos ne passent pas ici.',
    svg: () => ringSign(BIKE_IN_DISC(INK)),
  },
  'chemin-pietons': {
    label: 'Chemin pour les piétons', code: 'B40',
    says: 'Le rond bleu montre le chemin à prendre : ici, c’est le chemin des piétons.',
    svg: () => blueDisc(WALKER_IN_DISC('#fff')),
  },
  'piste-cyclable': {
    label: 'Piste pour les vélos', code: 'B22a',
    says: 'Le rond bleu montre le chemin à prendre : ici, c’est la piste des vélos.',
    svg: () => blueDisc(BIKE_IN_DISC('#fff')),
  },
  'passage-pietons': {
    label: 'Passage pour piétons', code: 'C20a',
    says: 'Ce panneau carré montre un passage pour piétons : c’est là qu’on traverse.',
    svg: () => `<rect x="3" y="3" width="94" height="94" rx="9" fill="${BLUE}" stroke="#fff" stroke-width="3"/>`
      + '<rect x="1.5" y="1.5" width="97" height="97" rx="10" fill="none" stroke="#b9b2a3" stroke-width="1"/>'
      + '<path d="M50 12 L88 80 L12 80 Z" fill="#fff" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>'
      + [28, 37, 46, 55, 64].map((x) => `<rect x="${x}" y="72" width="6" height="4" fill="${INK}"/>`).join('')
      + place(walker(INK), 30, 30, 0.4),
  },
  enfants: {
    label: `Attention, enfants`, code: 'A13a',
    says: 'Le triangle veut dire « attention » : ici, il y a souvent des enfants.',
    svg: () => `<path d="M50 8 L94 86 L6 86 Z" fill="#fff" stroke="${RED}" stroke-width="9" stroke-linejoin="round"/>`
      + place(walker(INK), 28, 36, 0.4) + place(walker(INK), 52, 52, 0.28),
  },
  stop: {
    label: `Stop${NB}: on s’arrête`, code: 'AB4',
    says: 'Au panneau stop, on s’arrête complètement, puis on regarde avant de repartir.',
    svg: () => `<polygon points="${octagon}" fill="${RED}" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>`
      + '<text x="50" y="59" font-size="25" font-weight="700" fill="#fff" text-anchor="middle" font-family="Arial, Helvetica, sans-serif">STOP</text>',
  },
  'sens-interdit': {
    label: 'Sens interdit', code: 'B1',
    says: 'Sens interdit : les voitures et les vélos ne peuvent pas entrer dans cette rue.',
    svg: () => `<circle cx="50" cy="50" r="47" fill="${RED}" stroke="#fff" stroke-width="3"/>${EDGE}`
      + '<rect x="17" y="41" width="66" height="18" rx="2" fill="#fff"/>',
  },
};

/** Le feu des piétons : le bonhomme rouge (immobile, en haut) ou le vert (qui marche, en bas) est allumé. */
function feuSvg(state) {
  const red = state === 'rouge';
  const off = '#33364a';
  return '<svg viewBox="0 0 70 130" aria-hidden="true">'
    + `<rect x="4" y="4" width="62" height="122" rx="10" fill="${INK}"/>`
    + `<rect x="11" y="11" width="48" height="52" rx="6" fill="${red ? '#3a1416' : '#15161f'}"/>`
    + `<rect x="11" y="67" width="48" height="52" rx="6" fill="${red ? '#15161f' : '#12301a'}"/>`
    + place(stander(red ? '#ff4d4d' : off), 14, 15, 0.42)
    + place(walker(red ? off : '#3ddc5a'), 15.3, 71, 0.42)
    + '</svg>';
}

/** Le dos d'une main, doigts vers le haut (on voit les ongles) : le pouce de la main gauche est à droite. */
function handSvg(side) {
  const shapes = (attrs) => `<g ${attrs}>`
    + '<rect x="64" y="52" width="13" height="34" rx="6.5" transform="rotate(38 70 84)"/>'
    + '<rect x="20" y="32" width="11" height="34" rx="5.5"/><rect x="33" y="18" width="12" height="46" rx="6"/>'
    + '<rect x="47" y="12" width="12" height="52" rx="6"/><rect x="61" y="20" width="11" height="44" rx="5.5"/>'
    + '<rect x="20" y="50" width="52" height="46" rx="16"/></g>';
  const nails = '<g fill="#fde7d9" stroke="#c9906c" stroke-width="1.2">'
    + '<rect x="22.5" y="35" width="6" height="8" rx="3"/><rect x="35.5" y="21" width="7" height="9" rx="3"/>'
    + '<rect x="49.5" y="15" width="7" height="9" rx="3"/><rect x="63" y="23" width="6" height="8" rx="3"/>'
    + '<rect x="67" y="55" width="7" height="8" rx="3" transform="rotate(38 70 84)"/></g>';
  const hand = shapes(`fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="5" stroke-linejoin="round"`)
    + shapes(`fill="${SKIN}"`) + nails
    + '<rect x="27" y="92" width="38" height="26" rx="5" fill="#4c6ef5"/>';
  const body = side === 'gauche' ? hand : `<g transform="translate(100 0) scale(-1 1)">${hand}</g>`;
  return `<svg viewBox="0 0 100 120" aria-hidden="true">${body}</svg>`;
}

/**
 * Un enfant vu de face (on voit son visage, les bretelles du sac) ou de dos (cheveux et sac à dos).
 * `at` : le côté de l'écran où il tient l'objet.
 */
function kidSvg({ view, girl, hold, at }) {
  const hair = girl ? '#7a3e1d' : '#3b2a1a';
  const shirt = girl ? '#e64980' : '#1c7ed6';
  const front = view === 'face';
  const x = at === 'gauche' ? 23 : 97;
  return '<svg viewBox="0 0 120 140" aria-hidden="true">'
    + '<rect x="46" y="96" width="11" height="32" rx="4" fill="#364fc7"/><rect x="63" y="96" width="11" height="32" rx="4" fill="#364fc7"/>'
    + `<ellipse cx="51" cy="130" rx="9" ry="5" fill="${INK}"/><ellipse cx="69" cy="130" rx="9" ry="5" fill="${INK}"/>`
    + `<path d="M43 60 L24 92 M77 60 L96 92" stroke="${shirt}" stroke-width="10" stroke-linecap="round"/>`
    + `<rect x="38" y="52" width="44" height="48" rx="12" fill="${shirt}"/>`
    + (front
      ? '<path d="M47 53 L47 84 M73 53 L73 84" stroke="#e8590c" stroke-width="5" stroke-linecap="round"/>'
      : '<rect x="43" y="58" width="34" height="36" rx="9" fill="#e8590c"/><rect x="49" y="76" width="22" height="12" rx="4" fill="#fd7e14"/>')
    + `<circle cx="23" cy="95" r="7" fill="${SKIN}"/><circle cx="97" cy="95" r="7" fill="${SKIN}"/>`
    + (girl ? `<circle cx="37" cy="31" r="8" fill="${hair}"/><circle cx="83" cy="31" r="8" fill="${hair}"/>` : '')
    + `<circle cx="60" cy="30" r="20" fill="${SKIN}"/>`
    + (front
      ? `<path d="M40 30 Q41 9 60 9 Q79 9 80 30 Q71 18 60 19 Q49 18 40 30 Z" fill="${hair}"/>`
        + `<circle cx="53" cy="32" r="2.8" fill="${INK}"/><circle cx="67" cy="32" r="2.8" fill="${INK}"/>`
        + `<path d="M52 40 Q60 47 68 40" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`
      : `<circle cx="60" cy="29" r="21" fill="${hair}"/>`)
    + `<text x="${x}" y="104" font-size="30" text-anchor="middle" class="dr-emoji">${hold}</text>`
    + '</svg>';
}

/** Un animal devant la boîte (plus bas, par-dessus) ou derrière (plus haut, en partie caché). */
function boxSvg({ who, where }) {
  const box = (x, y, s) => `<text x="${x}" y="${y}" font-size="${s}" text-anchor="middle" class="dr-emoji">📦</text>`;
  const pet = (x, y) => `<text x="${x}" y="${y}" font-size="40" text-anchor="middle" class="dr-emoji">${who}</text>`;
  return `<svg viewBox="0 0 100 100" aria-hidden="true">${where === 'derriere' ? pet(66, 52) + box(46, 90, 64) : box(50, 66, 54) + pet(50, 97)}</svg>`;
}

const CELL = 24;
const ARROW_ANGLE = { r: 0, d: 90, l: 180, u: -90 };

function arrowBox(x, y, dir) {
  return `<rect x="${x}" y="${y}" width="22" height="22" rx="5" fill="#fff" stroke="#b9b2a3" stroke-width="1.2"/>`
    + `<g transform="translate(${x + 11} ${y + 11}) rotate(${ARROW_ANGLE[dir]})" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">`
    + '<path d="M-6 0 H6"/><path d="M1 -5 L6 0 L1 5"/></g>';
}

/** Une suite de flèches (r, l, u, d : droite, gauche, haut, bas), chacune dans sa case. */
function arrowsSvg(moves) {
  return `<svg viewBox="0 0 ${moves.length * 26 + 2} 26" aria-hidden="true">${moves.map((m, k) => arrowBox(1 + k * 26, 2, m)).join('')}</svg>`;
}

/** Nom d'une case du quadrillage : la lettre de la colonne, puis le numéro de la ligne (« B2 »). */
export function cellName(cell, cols) {
  return `${'ABCDEF'[cell % cols]}${Math.floor(cell / cols) + 1}`;
}

/** Un quadrillage : des images dans les cases, les lettres et numéros des cases, des flèches en dessous. */
function gridSvg({ cols, rows, cells, labels = false, start = null, moves = null }) {
  const m = labels ? 15 : 2;
  const gw = m + cols * CELL + 2;
  const aw = moves ? moves.length * 26 + 2 : 0;
  const W = Math.max(gw, aw);
  const x0 = (W - gw) / 2 + m;
  const y0 = m;
  const H = y0 + rows * CELL + 2 + (moves ? 32 : 0);
  const at = (c) => [x0 + (c % cols) * CELL, y0 + Math.floor(c / cols) * CELL];
  const out = [`<rect x="${x0}" y="${y0}" width="${cols * CELL}" height="${rows * CELL}" rx="2" fill="#fff"/>`];
  if (start !== null) {
    const [x, y] = at(start);
    out.push(`<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" fill="#fff0b3"/>`);
  }
  for (let i = 1; i < cols; i++) out.push(`<line x1="${x0 + i * CELL}" y1="${y0}" x2="${x0 + i * CELL}" y2="${y0 + rows * CELL}" stroke="#b9b2a3" stroke-width="1"/>`);
  for (let j = 1; j < rows; j++) out.push(`<line x1="${x0}" y1="${y0 + j * CELL}" x2="${x0 + cols * CELL}" y2="${y0 + j * CELL}" stroke="#b9b2a3" stroke-width="1"/>`);
  out.push(`<rect x="${x0}" y="${y0}" width="${cols * CELL}" height="${rows * CELL}" rx="2" fill="none" stroke="${INK}" stroke-width="1.6"/>`);
  if (labels) {
    const text = (x, y, t) => `<text x="${x}" y="${y}" font-size="11" font-weight="700" fill="${INK}" text-anchor="middle">${t}</text>`;
    for (let i = 0; i < cols; i++) out.push(text(x0 + i * CELL + CELL / 2, y0 - 4, 'ABCDEF'[i]));
    for (let j = 0; j < rows; j++) out.push(text(x0 - 7.5, y0 + j * CELL + CELL / 2 + 4, j + 1));
  }
  cells.forEach((emoji, c) => {
    if (!emoji) return;
    const [x, y] = at(c);
    out.push(`<text x="${x + CELL / 2}" y="${y + CELL / 2 + 6}" font-size="17" text-anchor="middle" class="dr-emoji">${emoji}</text>`);
  });
  if (moves) {
    const ax = (W - aw) / 2 + 1;
    moves.forEach((mv, k) => out.push(arrowBox(ax + k * 26, y0 + rows * CELL + 9, mv)));
  }
  return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${out.join('')}</svg>`;
}

/** Le dessin d'une question ou d'un bouton (appelé par render.js). */
export function drawingSvg(d) {
  switch (d.kind) {
    case 'feu': return feuSvg(d.state);
    case 'panneau': return `<svg viewBox="0 0 100 100" aria-hidden="true">${SIGNS[d.sign].svg()}</svg>`;
    case 'main': return handSvg(d.side);
    case 'enfant': return kidSvg(d);
    case 'boite': return boxSvg(d);
    case 'quadrillage': return gridSvg(d);
    case 'fleches': return arrowsSvg(d.moves);
    default: return '<svg viewBox="0 0 10 10" aria-hidden="true"></svg>';
  }
}

// ================================================================ Sécurité et vivre ensemble

/** Les émotions : le visage, et la phrase dite quand on l'a trouvé. */
export const EMOTIONS = {
  content: { emoji: '😄', name: 'un visage content', ask: 'Touche le visage content.', says: 'Oui, ce visage est content : il sourit.', m: 'est content', f: 'est contente' },
  triste: { emoji: '😢', name: 'un visage triste', ask: 'Touche le visage triste.', says: 'Oui, ce visage est triste : il pleure.', m: 'est triste', f: 'est triste' },
  colere: { emoji: '😠', name: 'un visage en colère', ask: 'Touche le visage en colère.', says: 'Oui, ce visage est en colère : il fronce les sourcils.', m: 'est en colère', f: 'est en colère' },
  peur: { emoji: '😨', name: 'un visage qui a peur', ask: 'Touche le visage qui a peur.', says: 'Oui, ce visage a peur : il ouvre grand les yeux.', m: 'a peur', f: 'a peur' },
};

const faceChoice = (e) => ({ value: e, label: EMOTIONS[e].emoji, name: EMOTIONS[e].name });

// Les mots magiques : chaque situation, sa réponse, et des réponses qui ne conviennent pas du tout.
export const MAGIC_WORDS = [
  { emoji: '🏫', text: 'Le matin, tu arrives à l’école. Que dis-tu ?', answer: 'Bonjour', wrong: ['Au revoir', 'Merci', 'Pardon'] },
  { emoji: '🏠', text: 'Le matin, tu croises ta voisine. Que dis-tu ?', answer: 'Bonjour', wrong: ['Au revoir', 'Merci', 'Pardon'] },
  { emoji: '🍰', text: 'Mamie te donne une part de gâteau. Que dis-tu ?', answer: 'Merci', wrong: ['Bonjour', 'Au revoir', 'Pardon'] },
  { emoji: '🎁', text: 'On t’offre un cadeau. Que dis-tu ?', answer: 'Merci', wrong: ['Au revoir', 'Pardon', 'Bonjour'] },
  { emoji: '🧸', text: 'Un copain t’aide à ranger. Que dis-tu ?', answer: 'Merci', wrong: ['Au revoir', 'Pardon', 'Bonjour'] },
  { emoji: '🥛', text: 'Tu voudrais un verre d’eau. Que dis-tu pour le demander gentiment ?', answer: 'S’il te plaît', wrong: ['Au revoir', 'Pardon'] },
  { emoji: '🖍️', text: 'Tu veux emprunter un crayon. Que dis-tu pour le demander gentiment ?', answer: 'S’il te plaît', wrong: ['Au revoir', 'Pardon'] },
  { emoji: '🦶', text: 'Tu as marché sur le pied d’un copain. Que dis-tu ?', answer: 'Pardon', wrong: ['Merci', 'Bonjour', 'Au revoir'] },
  { emoji: '💥', text: 'Tu bouscules un enfant sans le faire exprès. Que dis-tu ?', answer: 'Pardon', wrong: ['Merci', 'Bonjour', 'S’il te plaît'] },
  { emoji: '👋', text: 'Le soir, tu quittes l’école. Que dis-tu ?', answer: 'Au revoir', wrong: ['Bonjour', 'Pardon', 'S’il te plaît'] },
];
const MAGIC_SAYS = {
  Bonjour: 'On dit bonjour quand on arrive ou qu’on rencontre quelqu’un.',
  Merci: 'On dit merci quand on reçoit quelque chose ou qu’on nous aide.',
  'S’il te plaît': 'On dit s’il te plaît pour demander gentiment.',
  Pardon: 'On dit pardon quand on a fait mal ou gêné quelqu’un.',
  'Au revoir': 'On dit au revoir quand on s’en va.',
};

// Traverser la rue (en plus du feu des piétons).
export const STREET = [
  { stage: drawing({ kind: 'panneau', sign: 'passage-pietons' }, 'Un panneau de passage pour piétons'), text: 'Où traverse-t-on la rue ?', answer: 'Sur le passage piéton', wrong: ['Entre deux voitures', 'Dans un virage'], says: 'On traverse sur le passage piéton : les voitures nous voient bien.' },
  { stage: picture('👀'), text: 'Avant de traverser, que fais-tu ?', answer: 'Je regarde des deux côtés', wrong: ['Je cours très vite', 'Je regarde mes pieds'], says: 'On regarde à gauche, à droite, puis encore à gauche.' },
  { stage: picture('🚶'), text: 'Dans la rue, où marche-t-on ?', answer: 'Sur le trottoir', wrong: ['Sur la route', 'Sur la piste cyclable'], says: 'Les piétons marchent sur le trottoir.' },
  { stage: picture('🤝'), text: 'Quand on est petit, avec qui traverse-t-on ?', answer: 'Avec un adulte', wrong: ['Tout seul', 'Avec son doudou'], says: 'Quand on est petit, on traverse avec un adulte, en lui donnant la main.' },
  { stage: picture('⚽'), text: 'Ton ballon roule sur la route. Que fais-tu ?', answer: 'Je demande à un adulte', wrong: ['Je cours le chercher', 'Je traverse vite'], says: 'On ne court jamais sur la route : un adulte ira chercher le ballon.' },
  { stage: picture('🚗'), text: 'Une voiture arrive. Que fais-tu ?', answer: 'J’attends qu’elle passe', wrong: ['Je traverse en courant', 'Je joue au ballon'], says: 'On attend que la voiture soit passée avant de traverser.' },
];

// Ce qui peut être dangereux à la maison, et ce qui ne l'est pas.
export const DANGERS = [
  { emoji: '🔪', name: 'le couteau', says: 'Un couteau coupe : c’est un adulte qui s’en sert.' },
  { emoji: '🔌', name: 'la prise électrique', says: 'On ne touche jamais une prise électrique.' },
  { emoji: '💊', name: 'les médicaments', says: 'Les médicaments, on les prend seulement avec un adulte.' },
  { emoji: '🕯️', name: 'la bougie allumée', says: 'La flamme d’une bougie brûle : on ne la touche pas.' },
  { emoji: '🍳', name: 'la poêle chaude', says: 'Une poêle sur le feu est très chaude : on ne la touche pas.' },
  { emoji: '🔥', name: 'le feu', says: 'Le feu brûle : on reste loin.' },
];
export const SAFE = [
  { emoji: '🧸', name: 'la peluche', says: 'Oui, la peluche n’est pas dangereuse.' },
  { emoji: '📚', name: 'les livres', says: 'Oui, les livres ne sont pas dangereux.' },
  { emoji: '🧩', name: 'le puzzle', says: 'Oui, le puzzle n’est pas dangereux.' },
  { emoji: '🖍️', name: 'les crayons de couleur', says: 'Oui, les crayons de couleur ne sont pas dangereux.' },
  { emoji: '⚽', name: 'le ballon', says: 'Oui, le ballon n’est pas dangereux.' },
  { emoji: '🍎', name: 'la pomme', says: 'Oui, la pomme n’est pas dangereuse.' },
  { emoji: '🧦', name: 'les chaussettes', says: 'Oui, les chaussettes ne sont pas dangereuses.' },
];

// Que faire si… : la bonne réaction, et deux réactions à éviter.
export const WHAT_IF = [
  { emoji: '🛒', text: 'Tu ne vois plus tes parents dans le magasin. Que fais-tu ?', answer: 'Je demande à un vendeur', wrong: ['Je sors du magasin', 'Je me cache'], says: 'Le vendeur va t’aider à retrouver tes parents.' },
  { emoji: '🏖️', text: 'Tu ne vois plus tes parents à la plage. Que fais-tu ?', answer: 'Je vais voir un sauveteur', wrong: ['Je vais me baigner', 'Je pars tout seul'], says: 'Les sauveteurs du poste de secours vont t’aider à retrouver tes parents.' },
  { emoji: '🩹', text: 'Tu t’es coupé le doigt. Que fais-tu ?', answer: 'Je le dis à un adulte', wrong: ['Je cache mon doigt', 'Je continue à jouer'], says: 'Un adulte va nettoyer la coupure et mettre un pansement.' },
  { emoji: '🤕', text: 'Un copain est tombé et il a très mal. Que fais-tu ?', answer: 'Je vais chercher un adulte', wrong: ['Je me moque de lui', 'Je le laisse seul'], says: 'Un adulte saura le soigner.' },
  { emoji: '🍬', text: 'Une personne que tu ne connais pas te propose des bonbons. Que fais-tu ?', answer: 'Je dis non', wrong: ['Je la suis', 'Je prends les bonbons'], says: 'On dit non, et on le raconte à un adulte qu’on connaît bien.' },
  { emoji: '💊', text: 'Tu trouves des médicaments par terre. Que fais-tu ?', answer: 'Je préviens un adulte', wrong: ['Je les goûte', 'Je les mets dans ma poche'], says: 'On ne touche pas aux médicaments : on prévient un adulte.' },
  { emoji: '💨', text: 'Il y a de la fumée dans la maison. Que fais-tu ?', answer: 'Je sors vite de la maison', wrong: ['Je me cache sous le lit', 'Je range mes jouets'], says: 'On sort vite, sans se cacher, et on prévient un adulte.' },
  { emoji: '🐕', text: 'Un chien que tu ne connais pas s’approche. Que fais-tu ?', answer: 'Je ne le touche pas', wrong: ['Je lui tire la queue', 'Je cours en criant'], says: 'On reste calme, et on ne touche pas un chien qu’on ne connaît pas.' },
];

// Les numéros d'urgence en France.
export const EMERGENCY = {
  15: { who: 'le SAMU', of: 'du SAMU', emoji: '🚑', says: 'Le 15, c’est le SAMU : les médecins des urgences.' },
  17: { who: 'la police', of: 'de la police', emoji: '🚓', says: 'Le 17, c’est la police.' },
  18: { who: 'les pompiers', of: 'des pompiers', emoji: '🚒', says: 'Le 18, ce sont les pompiers.' },
  112: { says: 'Le 112 est le numéro d’urgence européen : on peut l’appeler partout en Europe.' },
};
const CALL_ONLY_IF = 'On appelle seulement en cas de vraie urgence.';

// Les règles de la classe et du jeu.
export const RULES = [
  { emoji: '🙋', text: 'En classe, tu veux parler. Que fais-tu ?', answer: 'Je lève le doigt', wrong: ['Je crie très fort', 'Je parle en même temps'], says: 'On lève le doigt et on attend qu’on nous donne la parole.' },
  { emoji: '🎲', text: 'Ce n’est pas ton tour de jouer. Que fais-tu ?', answer: 'J’attends mon tour', wrong: ['Je joue quand même', 'Je prends le dé'], says: 'Chacun son tour : c’est plus juste pour tout le monde.' },
  { emoji: '🏆', text: 'Tu as perdu la partie. Que fais-tu ?', answer: 'Je dis bravo au gagnant', wrong: ['Je jette le jeu', 'Je dis que c’est nul'], says: 'Perdre, ça arrive : on félicite le gagnant, et on rejouera.' },
  { emoji: '👂', text: 'Un copain te parle. Que fais-tu ?', answer: 'Je l’écoute', wrong: ['Je lui tourne le dos', 'Je parle plus fort'], says: 'On écoute les autres, comme on aime être écouté.' },
  { emoji: '🧩', text: 'Le jeu est fini. Que fais-tu ?', answer: 'Je range avec les autres', wrong: ['Je laisse tout par terre', 'Je pars vite'], says: 'Après le jeu, on range tous ensemble.' },
  { emoji: '🧒', text: 'Un enfant est tout seul dans la cour. Que fais-tu ?', answer: 'Je lui propose de jouer', wrong: ['Je me moque de lui', 'Je lui fais peur'], says: 'C’est gentil de proposer à un enfant seul de jouer avec nous.' },
  { emoji: '🚂', text: 'Tu veux le jouet d’un copain. Que fais-tu ?', answer: 'Je lui demande gentiment', wrong: ['Je le prends', 'Je le pousse'], says: 'On demande gentiment, et on attend sa réponse.' },
  { emoji: '🤧', text: 'Tu tousses ou tu éternues. Que fais-tu ?', answer: 'Je tousse dans mon coude', wrong: ['Je tousse sur les autres', 'Je crie très fort'], says: 'On tousse dans son coude, pour ne pas donner ses microbes.' },
  { emoji: '🍽️', text: 'C’est l’heure de manger. Que fais-tu avant ?', answer: 'Je me lave les mains', wrong: ['Je cours partout', 'Je saute sur la table'], says: 'Avant de manger, on se lave les mains avec du savon.' },
];

// Les émotions des autres : des enfants aux prénoms variés (sans prénom de l'enfant qui joue), une
// situation, l'émotion attendue et deux émotions qui ne vont pas du tout avec la situation.
export const OTHERS = [
  { who: 'Léo', f: false, emoji: '🎁', text: 'Léo a reçu un beau cadeau.', answer: 'content', wrong: ['triste', 'peur'] },
  { who: 'Malo', f: false, emoji: '🏅', text: 'Malo a gagné la course.', answer: 'content', wrong: ['triste', 'peur'] },
  { who: 'Nino', f: false, emoji: '🎂', text: 'Nino fête son anniversaire avec ses copains.', answer: 'content', wrong: ['triste', 'colere'] },
  { who: 'Inès', f: true, emoji: '🧸', text: 'Inès a perdu son doudou.', answer: 'triste', wrong: ['content', 'colere'] },
  { who: 'Rose', f: true, emoji: '👋', text: 'Rose dit au revoir à sa meilleure amie, qui part habiter loin.', answer: 'triste', wrong: ['content', 'peur'] },
  { who: 'Jade', f: true, emoji: '⛈️', text: 'Jade entend un gros orage pendant la nuit.', answer: 'peur', wrong: ['content', 'colere'] },
  { who: 'Sacha', f: false, emoji: '🐕', text: 'Sacha voit un gros chien qui aboie très fort.', answer: 'peur', wrong: ['content', 'triste'] },
  { who: 'Adam', f: false, emoji: '🧱', text: 'Un copain a fait tomber la tour d’Adam exprès.', answer: 'colere', wrong: ['content', 'peur'] },
  { who: 'Lina', f: true, emoji: '🚂', text: 'Le frère de Lina lui a pris son jouet sans demander.', answer: 'colere', wrong: ['content', 'peur'] },
];
export const KINDNESS = [
  { emoji: '🧸', text: 'Inès est triste : elle a perdu son doudou. Que peux-tu faire ?', answer: 'Je l’aide à le chercher', wrong: ['Je me moque d’elle', 'Je cache le doudou'], says: 'C’est gentil de l’aider : à deux, on cherche mieux.' },
  { emoji: '🤕', text: 'Zoé est tombée dans la cour. Que peux-tu faire ?', answer: 'Je l’aide à se relever', wrong: ['Je ris très fort', 'Je pars jouer'], says: 'On l’aide, et on prévient un adulte si elle a mal.' },
  { emoji: '🏅', text: 'Malo a gagné la course. Que peux-tu lui dire ?', answer: `Bravo${NB}!`, wrong: ['Tu as triché', 'Ce n’est pas juste'], says: 'On félicite celui qui a gagné.' },
  { emoji: '😤', text: 'Adam est en colère. Que peut-il faire pour se calmer ?', answer: 'Respirer doucement', wrong: ['Taper un copain', 'Casser un jouet'], says: 'Quand on est en colère, on respire doucement, ou on le dit avec des mots.' },
];

// À vélo.
export const BIKE = [
  { emoji: '🚲', text: 'À vélo, que mets-tu sur ta tête ?', answer: 'Un casque', wrong: ['Une casquette', 'Un bonnet'], says: 'À vélo, le casque est obligatoire pour les enfants.' },
  { emoji: '🌙', text: 'Le soir, que portes-tu pour qu’on te voie bien ?', answer: 'Un gilet qui brille', wrong: ['Un pull noir', 'Un déguisement'], says: 'Un gilet qui brille aide les voitures à te voir.' },
];

function vivreLevel(level, rng) {
  if (level === 1) {
    const all = Object.keys(EMOTIONS);
    const target = pick(rng, all);
    const options = shuffle(rng, [target, ...sample(rng, all.filter((e) => e !== target), 2)]);
    return {
      key: `vivre:emotion:${target}:${options.join(',')}`,
      text: EMOTIONS[target].ask,
      instruction: EMOTIONS[target].ask,
      stage: { type: 'none' },
      choices: options.map(faceChoice),
      choiceStyle: 'pictures',
      answer: target,
      success: { speak: EMOTIONS[target].says },
    };
  }
  if (level === 2) {
    const item = pick(rng, MAGIC_WORDS);
    return textQuestion({
      key: `vivre:mots:${item.text}`, text: item.text, stage: picture(item.emoji), answer: item.answer, wrong: sample(rng, item.wrong, 2),
      style: 'answers', success: [`Oui, on dit ${item.answer.toLowerCase()} !`, MAGIC_SAYS[item.answer]], rng,
    });
  }
  if (level === 3) {
    if (rng() < 0.5) {
      const state = rng() < 0.5 ? 'rouge' : 'vert';
      const answer = state === 'rouge' ? 'J’attends' : 'Je traverse';
      const text = 'Regarde le feu des piétons. Que fais-tu ?';
      return {
        key: `vivre:feu:${state}`,
        text,
        instruction: [text, 'J’attends, ou je traverse ?'],
        stage: drawing({ kind: 'feu', state }, state === 'rouge' ? 'Le feu des piétons : le bonhomme rouge, immobile, est allumé' : 'Le feu des piétons : le bonhomme vert, qui marche, est allumé'),
        choices: [{ value: 'J’attends', label: '✋ J’attends' }, { value: 'Je traverse', label: '🚶 Je traverse' }],
        choiceStyle: 'words',
        answer,
        success: {
          speak: state === 'rouge'
            ? 'Le bonhomme rouge est immobile : on attend sur le trottoir.'
            : 'Le bonhomme vert marche : on peut traverser, en regardant bien des deux côtés.',
        },
      };
    }
    const item = pick(rng, STREET);
    return textQuestion({ key: `vivre:rue:${item.text}`, text: item.text, stage: item.stage, answer: item.answer, wrong: item.wrong, success: item.says, rng });
  }
  if (level === 4) {
    const safe = rng() < 0.3; // « Touche ce qui n'est pas dangereux. »
    const [target] = sample(rng, safe ? SAFE : DANGERS, 1);
    const others = sample(rng, safe ? DANGERS : SAFE, 2);
    const options = shuffle(rng, [target, ...others]);
    const text = safe ? 'Touche ce qui n’est pas dangereux.' : 'Touche ce qui peut être dangereux.';
    return {
      key: `vivre:danger:${safe}:${target.name}`,
      text,
      instruction: text,
      stage: { type: 'none' },
      choices: options.map((o) => ({ value: o.name, label: o.emoji, name: o.name })),
      choiceStyle: 'pictures',
      answer: target.name,
      success: { speak: safe ? target.says : ['Oui, attention !', target.says] },
    };
  }
  if (level === 5) {
    const item = pick(rng, WHAT_IF);
    return textQuestion({ key: `vivre:si:${item.text}`, text: item.text, stage: picture(item.emoji), answer: item.answer, wrong: item.wrong, success: ['Oui, c’est ça.', item.says], rng });
  }
  if (level === 6) return emergency(rng);
  if (level === 7) {
    const item = pick(rng, RULES);
    return textQuestion({ key: `vivre:regle:${item.text}`, text: item.text, stage: picture(item.emoji), answer: item.answer, wrong: item.wrong, success: ['Oui, c’est ça.', item.says], rng });
  }
  if (level === 8) {
    if (rng() < 0.35) {
      const item = pick(rng, KINDNESS);
      return textQuestion({ key: `vivre:gentil:${item.text}`, text: item.text, stage: picture(item.emoji), answer: item.answer, wrong: item.wrong, success: ['Oui, c’est gentil.', item.says], rng });
    }
    const item = pick(rng, OTHERS);
    const question = `Comment se sent ${item.who} ?`;
    const options = shuffle(rng, [item.answer, ...item.wrong]);
    return {
      key: `vivre:autres:${item.who}`,
      text: `${item.text} ${question}`,
      instruction: [item.text, question],
      stage: picture(item.emoji),
      choices: options.map(faceChoice),
      choiceStyle: 'pictures',
      answer: item.answer,
      success: { speak: `Oui, ${item.who} ${EMOTIONS[item.answer][item.f ? 'f' : 'm']}.` },
    };
  }
  // niveau 9 : les panneaux pour les piétons et les vélos, et la sécurité à vélo
  if (rng() < 0.25) {
    const item = pick(rng, BIKE);
    return textQuestion({ key: `vivre:velo:${item.text}`, text: item.text, stage: picture(item.emoji), answer: item.answer, wrong: item.wrong, success: ['Oui, c’est ça.', item.says], rng });
  }
  const ids = Object.keys(SIGNS);
  const sign = pick(rng, ids);
  // les panneaux qui se ressemblent d'abord (même dessin, ou même forme)
  const twin = { 'interdit-pietons': 'chemin-pietons', 'chemin-pietons': 'interdit-pietons', 'interdit-velos': 'piste-cyclable', 'piste-cyclable': 'interdit-velos' }[sign];
  const pool = ids.filter((s) => s !== sign && s !== twin);
  const others = twin && rng() < 0.7 ? [twin, pick(rng, pool)] : sample(rng, pool, 2);
  const options = shuffle(rng, [sign, ...others]);
  if (rng() < 0.6) {
    const text = 'Que veut dire ce panneau ?';
    return {
      key: `vivre:panneau:${sign}`,
      text,
      instruction: [text, `${capitalize(spokenList(options.map((s) => SIGNS[s].label)))} ?`],
      stage: drawing({ kind: 'panneau', sign }, 'Un panneau'),
      choices: options.map((s) => ({ value: s, label: SIGNS[s].label })),
      choiceStyle: 'sentences',
      answer: sign,
      success: { speak: SIGNS[sign].says },
    };
  }
  const text = `Touche le panneau «${NB}${SIGNS[sign].label}${NB}».`;
  return {
    key: `vivre:trouve-panneau:${sign}`,
    text,
    instruction: text,
    stage: { type: 'none' },
    choices: options.map((s) => ({ value: s, drawing: { kind: 'panneau', sign: s }, name: SIGNS[s].label })),
    choiceStyle: 'drawings',
    answer: sign,
    success: { speak: SIGNS[sign].says },
  };
}

/** Niveau 6 : les numéros d'urgence (15, 17, 18 et 112). */
function emergency(rng) {
  const roll = rng();
  if (roll < 0.15) {
    const text = 'Quel numéro d’urgence peut-on appeler partout en Europe ?';
    const options = shuffle(rng, [112, ...sample(rng, [15, 17, 18], 2)]);
    return {
      key: 'vivre:urgence:112',
      text,
      instruction: text,
      stage: picture('📞'),
      choices: options.map((n) => ({ value: n, label: String(n) })),
      choiceStyle: 'numbers',
      answer: 112,
      success: { speak: [EMERGENCY[112].says, CALL_ONLY_IF] },
    };
  }
  // pas de 112 dans les choix : il serait juste aussi
  const n = pick(rng, [15, 17, 18]);
  const info = EMERGENCY[n];
  if (roll < 0.45) {
    // « Le 18, c'est… »
    const text = `Qui répond quand on appelle le ${n} ?`;
    const options = shuffle(rng, [15, 17, 18]).map((m) => EMERGENCY[m].who);
    return {
      key: `vivre:urgence:qui:${n}`,
      text,
      instruction: [text, `${capitalize(spokenList(options))} ?`],
      stage: { type: 'word', text: `☎️ ${n}` },
      choices: options.map((o) => ({ value: o, label: o })),
      choiceStyle: 'answers',
      answer: info.who,
      success: { speak: [info.says, CALL_ONLY_IF] },
    };
  }
  const fire = n === 18 && rng() < 0.5;
  const text = fire ? 'Il y a le feu ! Quel numéro faut-il appeler ?' : `Quel est le numéro ${info.of} ?`;
  return {
    key: `vivre:urgence:${fire ? 'feu' : n}`,
    text,
    instruction: [text, 'Le 15, le 17 ou le 18 ?'],
    stage: picture(fire ? '🔥' : info.emoji),
    choices: [15, 17, 18].map((m) => ({ value: m, label: String(m) })),
    choiceStyle: 'numbers',
    answer: n,
    success: { speak: [info.says, CALL_ONLY_IF] },
  };
}

export const vivreEnsemble = {
  id: 'vivre-ensemble',
  domain: 'monde',
  title: 'Sécurité et vivre ensemble',
  icon: '🤝',
  skill: 'Vivre ensemble : émotions, politesse, règles de la classe, sécurité dans la rue et à la maison',
  levels: [
    'Les émotions', 'Les mots magiques', 'Traverser la rue', `Danger ou pas danger${NB}?`, 'Que faire si…',
    'Les numéros d’urgence', 'Les règles de la classe', 'Les émotions des autres', 'Panneaux piétons et vélos', 'Grand mélange',
  ],
  generate(level, rng) {
    // niveau 10 : un peu de tout (niveaux 2 à 9)
    const q = vivreLevel(level === 10 ? 2 + Math.floor(rng() * 8) : level, rng);
    return level === 10 ? { ...q, key: `melange:${q.key}` } : q;
  },
};

// ================================================================ Se repérer

const PETS = [
  { emoji: '🐱', name: 'le chat' }, { emoji: '🐶', name: 'le chien' }, { emoji: '🐰', name: 'le lapin' },
  { emoji: '🐭', name: 'la souris' }, { emoji: '🐥', name: 'le poussin' },
];
// Les scènes de render.js (table et panier).
const SPOTS = [
  { key: 'on', fr: 'sur la table' }, { key: 'under', fr: 'sous la table' }, { key: 'in', fr: 'dans le panier' },
];
const ROW_ANIMALS = [...PETS, { emoji: '🐸', name: 'la grenouille' }, { emoji: '🐷', name: 'le cochon' }];

// Qui se déplace sur le quadrillage, et ce qu'il va chercher.
export const MOVERS = [
  { emoji: '🐭', name: 'la souris', goal: '🧀', toGoal: 'au fromage' },
  { emoji: '🐰', name: 'le lapin', goal: '🥕', toGoal: 'à la carotte' },
  { emoji: '🐶', name: 'le chien', goal: '🦴', toGoal: 'à l’os' },
  { emoji: '🐝', name: 'l’abeille', goal: '🌻', toGoal: 'à la fleur' },
  { emoji: '🐵', name: 'le singe', goal: '🍌', toGoal: 'à la banane' },
];
const TREATS = [
  { emoji: '🍎', name: 'la pomme' }, { emoji: '🍓', name: 'la fraise' }, { emoji: '⭐', name: 'l’étoile' },
  { emoji: '🎈', name: 'le ballon' }, { emoji: '🍄', name: 'le champignon' }, { emoji: '🎁', name: 'le cadeau' },
];
// Les lieux du petit plan.
export const PLACES = [
  { emoji: '🥖', name: 'la boulangerie' }, { emoji: '🏫', name: 'l’école' }, { emoji: '🏠', name: 'la maison' },
  { emoji: '🌳', name: 'le parc' }, { emoji: '🏊', name: 'la piscine' }, { emoji: '🚉', name: 'la gare' },
  { emoji: '📚', name: 'la bibliothèque' }, { emoji: '🏥', name: 'l’hôpital' },
];
// Ce que tient l'enfant de face ou de dos.
const HELD = [
  { emoji: '🎈', name: 'le ballon' }, { emoji: '🍦', name: 'la glace' }, { emoji: '🌷', name: 'la fleur' },
  { emoji: '🚩', name: 'le drapeau' }, { emoji: '🍭', name: 'la sucette' },
];

const DIRS = { r: [1, 0], l: [-1, 0], u: [0, -1], d: [0, 1] };
const DIR_WORDS = { r: 'droite', l: 'gauche', u: 'haut', d: 'bas' };
const OPPOSITE = { r: 'l', l: 'r', u: 'd', d: 'u' };

/** La case atteinte en partant de `cell` et en suivant `moves` (null si on sort du quadrillage). */
export function follow(cell, moves, cols, rows) {
  let [x, y] = [cell % cols, Math.floor(cell / cols)];
  for (const m of moves) {
    x += DIRS[m][0];
    y += DIRS[m][1];
    if (x < 0 || y < 0 || x >= cols || y >= rows) return null;
  }
  return y * cols + x;
}

/** Les cases traversées (départ compris). */
function trail(cell, moves, cols) {
  const out = [cell];
  let [x, y] = [cell % cols, Math.floor(cell / cols)];
  for (const m of moves) {
    x += DIRS[m][0];
    y += DIRS[m][1];
    out.push(y * cols + x);
  }
  return out;
}

/** Un chemin de n flèches dans le quadrillage, sans repasser par une case. */
function randomWalk(rng, cols, rows, n) {
  for (;;) {
    const start = Math.floor(rng() * cols * rows);
    const moves = [];
    const seen = new Set([start]);
    let cell = start;
    for (let k = 0; k < n; k++) {
      const options = Object.keys(DIRS).filter((m) => {
        const next = follow(cell, [m], cols, rows);
        return next !== null && !seen.has(next);
      });
      if (!options.length) break;
      // on garde souvent la même direction : des chemins faciles à suivre
      const m = moves.length && options.includes(moves.at(-1)) && rng() < 0.4 ? moves.at(-1) : pick(rng, options);
      moves.push(m);
      cell = follow(cell, [m], cols, rows);
      seen.add(cell);
    }
    if (moves.length === n) return { start, moves, end: cell };
  }
}

const arrowName = (moves) => moves.map((m) => DIR_WORDS[m]).join(', ');

/** Niveau 6 : suivre les flèches depuis l'animal ; où arrive-t-on ? */
function followArrows(rng) {
  const [cols, rows] = [4, 4];
  const mover = pick(rng, MOVERS);
  const { start, moves, end } = randomWalk(rng, cols, rows, 3 + Math.floor(rng() * 2));
  const path = new Set(trail(start, moves, cols));
  const [target, ...others] = sample(rng, TREATS, 3);
  const cells = Array(cols * rows).fill(null);
  cells[start] = mover.emoji;
  cells[end] = target.emoji;
  // les pièges : là où l'on arrive en se trompant d'une flèche (gauche au lieu de droite…)
  const mistakes = shuffle(rng, moves.map((m, k) => follow(start, moves.map((x, j) => (j === k ? OPPOSITE[x] : x)), cols, rows)))
    .filter((c) => c !== null && !path.has(c));
  const free = shuffle(rng, cells.map((_, c) => c).filter((c) => !path.has(c)));
  const spots = [...new Set([...mistakes, ...free])].slice(0, 2);
  others.forEach((o, k) => { cells[spots[k]] = o.emoji; });
  const options = shuffle(rng, [target, ...others]);
  const text = `Pars de la case ${deName(mover.name)} et suis les flèches. Où arrives-tu ?`;
  return {
    key: `reperer:fleches:${start}:${moves.join('')}`,
    text,
    instruction: text,
    stage: drawing({ kind: 'quadrillage', cols, rows, cells, start, moves }, `Un quadrillage ; les flèches : ${arrowName(moves)}`),
    choices: options.map((o) => ({ value: o.name, label: o.emoji, name: o.name })),
    choiceStyle: 'pictures',
    answer: target.name,
    success: { speak: `Oui, tu arrives sur ${target.name} !` },
  };
}

/** Niveau 9 : quelle suite de flèches mène l'animal à ce qu'il cherche ? */
function codeMoves(rng) {
  const [cols, rows] = [5, 4];
  const mover = pick(rng, MOVERS);
  let start;
  let goal;
  let dx;
  let dy;
  do {
    start = Math.floor(rng() * cols * rows);
    goal = Math.floor(rng() * cols * rows);
    dx = (goal % cols) - (start % cols);
    dy = Math.floor(goal / cols) - Math.floor(start / cols);
  } while (!dx || !dy || Math.abs(dx) + Math.abs(dy) < 3 || Math.abs(dx) + Math.abs(dy) > 5);
  const h = Array(Math.abs(dx)).fill(dx > 0 ? 'r' : 'l');
  const v = Array(Math.abs(dy)).fill(dy > 0 ? 'd' : 'u');
  const moves = rng() < 0.5 ? [...h, ...v] : [...v, ...h];
  // les erreurs : une flèche à l'envers, une flèche dans l'autre sens (horizontal ↔ vertical),
  // une flèche oubliée ; aucune n'arrive au bon endroit
  const candidates = [];
  moves.forEach((m, k) => {
    candidates.push(moves.map((x, j) => (j === k ? OPPOSITE[x] : x)));
    candidates.push(moves.map((x, j) => (j === k ? (h.includes(x) ? v[0] : h[0]) : x)));
    candidates.push(moves.filter((_, j) => j !== k));
  });
  candidates.push(moves.map((x) => OPPOSITE[x]));
  const key = (ms) => ms.join('');
  const seen = new Set([key(moves)]);
  const wrongs = [];
  for (const c of shuffle(rng, candidates)) {
    const end = follow(start, c, cols, rows);
    if (end === null || end === goal || seen.has(key(c))) continue;
    seen.add(key(c));
    wrongs.push(c);
    if (wrongs.length === 2) break;
  }
  const cells = Array(cols * rows).fill(null);
  cells[start] = mover.emoji;
  cells[goal] = mover.goal;
  const options = shuffle(rng, [moves, ...wrongs]);
  const text = `Quel chemin mène ${mover.name} ${mover.toGoal} ?`;
  return {
    key: `reperer:code:${start}:${goal}`,
    text,
    instruction: text,
    stage: drawing({ kind: 'quadrillage', cols, rows, cells, start }, 'Un quadrillage'),
    choices: options.map((ms) => ({ value: key(ms), drawing: { kind: 'fleches', moves: ms }, name: arrowName(ms) })),
    choiceStyle: 'arrows',
    answer: key(moves),
    success: { speak: `Oui, ce chemin mène ${mover.name} ${mover.toGoal} !` },
  };
}

/** Niveau 7 : un petit plan quadrillé (colonnes A à D, lignes 1 à 3). */
function readMap(rng) {
  const [cols, rows] = [4, 3];
  const places = sample(rng, PLACES, 6);
  const spots = sample(rng, Array.from({ length: cols * rows }, (_, c) => c), places.length);
  const cells = Array(cols * rows).fill(null);
  places.forEach((p, k) => { cells[spots[k]] = p.emoji; });
  const k = Math.floor(rng() * places.length);
  const target = places[k];
  const cell = spots[k];
  const name = cellName(cell, cols);
  const stage = drawing({ kind: 'quadrillage', cols, rows, cells, labels: true }, 'Un plan quadrillé, colonnes A à D, lignes 1 à 3');
  if (rng() < 0.5) {
    // les cases qui se ressemblent (même lettre ou même numéro) d'abord
    const all = shuffle(rng, Array.from({ length: cols * rows }, (_, c) => c).filter((c) => c !== cell));
    const near = all.filter((c) => c % cols === cell % cols || Math.floor(c / cols) === Math.floor(cell / cols));
    const wrong = [...new Set([...near.slice(0, 1), ...all])].slice(0, 2);
    const options = shuffle(rng, [cell, ...wrong]).map((c) => cellName(c, cols));
    const text = `Où est ${target.name} ${target.emoji} ?`;
    return {
      key: `reperer:plan:ou:${target.name}:${name}`,
      text,
      instruction: `Où est ${target.name} ?`,
      stage,
      choices: options.map((o) => ({ value: o, label: o })),
      choiceStyle: 'words',
      answer: name,
      success: { speak: `Oui, ${target.name} est dans la case ${name}.` },
    };
  }
  const options = shuffle(rng, [target, ...sample(rng, places.filter((p) => p !== target), 2)]);
  const text = `Qu’y a-t-il dans la case ${name} ?`;
  return {
    key: `reperer:plan:quoi:${name}:${target.name}`,
    text,
    instruction: text,
    stage,
    choices: options.map((p) => ({ value: p.name, label: p.emoji, name: p.name })),
    choiceStyle: 'pictures',
    answer: target.name,
    success: { speak: `Oui, dans la case ${name}, il y a ${target.name}.` },
  };
}

function repererLevel(level, rng) {
  if (level === 1) {
    const pet = pick(rng, PETS);
    const spot = pick(rng, SPOTS);
    const text = `Touche ${pet.name} ${spot.fr}.`;
    return {
      key: `reperer:table:${pet.name}:${spot.key}`,
      text,
      instruction: text,
      stage: { type: 'none' },
      choices: shuffle(rng, SPOTS).map((s) => ({ value: s.key, scene: { who: pet.emoji, where: s.key }, name: `${pet.name} ${s.fr}` })),
      choiceStyle: 'scenes',
      answer: spot.key,
      success: { speak: `Oui, ${pet.name} est ${spot.fr}.` },
    };
  }
  if (level === 2) {
    const [pet, other] = sample(rng, PETS, 2);
    const where = rng() < 0.5 ? 'devant' : 'derriere';
    const word = { devant: 'devant', derriere: 'derrière' };
    const scene = (p, w) => ({ value: `${p.name}:${w}`, drawing: { kind: 'boite', who: p.emoji, where: w }, name: `${p.name} ${word[w]} la boîte` });
    const text = `Touche ${pet.name} ${word[where]} la boîte.`;
    return {
      key: `reperer:boite:${pet.name}:${where}`,
      text,
      instruction: text,
      stage: { type: 'none' },
      choices: shuffle(rng, [scene(pet, where), scene(pet, where === 'devant' ? 'derriere' : 'devant'), scene(other, where)]),
      choiceStyle: 'drawings',
      answer: `${pet.name}:${where}`,
      success: { speak: `Oui, ${pet.name} est ${word[where]} la boîte.` },
    };
  }
  if (level === 3) {
    const tree = '🌳';
    if (rng() < 0.5) {
      const [a, b] = sample(rng, PETS, 2);
      const left = rng() < 0.5;
      const answer = left ? a : b;
      const text = `Qui est à ${left ? 'gauche' : 'droite'} de l’arbre ?`;
      return {
        key: `reperer:arbre:${a.name}:${b.name}:${left}`,
        text,
        instruction: text,
        stage: { type: 'pattern', items: [a.emoji, tree, b.emoji] },
        choices: shuffle(rng, [a, b]).map((p) => ({ value: p.name, label: p.emoji, name: p.name })),
        choiceStyle: 'pictures',
        answer: answer.name,
        success: { speak: `Oui, ${answer.name} est à ${left ? 'gauche' : 'droite'} de l’arbre.` },
      };
    }
    const pet = pick(rng, PETS);
    const side = rng() < 0.5 ? 'gauche' : 'droite';
    const text = `Où est ${pet.name} : à gauche ou à droite de l’arbre ?`;
    return {
      key: `reperer:cote:${pet.name}:${side}`,
      text,
      instruction: text,
      stage: { type: 'pattern', items: side === 'gauche' ? [pet.emoji, tree] : [tree, pet.emoji] },
      choices: [{ value: 'gauche', label: '⬅️ à gauche' }, { value: 'droite', label: 'à droite ➡️' }],
      choiceStyle: 'words',
      answer: side,
      success: { speak: `Oui, ${pet.name} est à ${side} de l’arbre.` },
    };
  }
  if (level === 4) {
    const side = rng() < 0.5 ? 'gauche' : 'droite';
    const says = side === 'gauche'
      ? 'Pose ta main gauche sur la table : ton pouce est à droite.'
      : 'Pose ta main droite sur la table : ton pouce est à gauche.';
    if (rng() < 0.5) {
      const text = 'Voici le dos d’une main. Est-ce la main gauche ou la main droite ?';
      return {
        key: `reperer:main:${side}`,
        text,
        instruction: [text, 'Pose tes mains sur la table pour comparer.'],
        stage: drawing({ kind: 'main', side }, 'Le dos d’une main'),
        choices: [{ value: 'gauche', label: 'Main gauche' }, { value: 'droite', label: 'Main droite' }],
        choiceStyle: 'words',
        answer: side,
        success: { speak: [`Oui, c’est la main ${side}.`, says] },
      };
    }
    const text = `Voici le dos de deux mains. Touche la main ${side}.`;
    const order = shuffle(rng, ['gauche', 'droite']);
    return {
      key: `reperer:mains:${side}:${order.join('')}`,
      text,
      instruction: [text, 'Pose tes mains sur la table pour comparer.'],
      stage: { type: 'none' },
      choices: order.map((s) => ({ value: s, drawing: { kind: 'main', side: s }, name: 'Le dos d’une main' })),
      choiceStyle: 'drawings',
      answer: side,
      success: { speak: [`Oui, c’est la main ${side}.`, says] },
    };
  }
  if (level === 5) {
    const row = sample(rng, ROW_ANIMALS, 4);
    if (rng() < 0.5) {
      const i = 1 + Math.floor(rng() * 2);
      const answer = row[i];
      const text = `Qui est entre ${row[i - 1].name} et ${row[i + 1].name} ?`;
      const options = shuffle(rng, [answer, row[i - 1], row[i + 1]]);
      return {
        key: `reperer:entre:${row.map((a) => a.emoji).join('')}:${i}`,
        text,
        instruction: text,
        stage: { type: 'pattern', items: row.map((a) => a.emoji) },
        choices: options.map((a) => ({ value: a.name, label: a.emoji, name: a.name })),
        choiceStyle: 'pictures',
        answer: answer.name,
        success: { speak: `Oui, ${answer.name} est entre ${row[i - 1].name} et ${row[i + 1].name}.` },
      };
    }
    // au bout de la rangée : un seul voisin
    const end = rng() < 0.5 ? 0 : 3;
    const target = row[end];
    const answer = row[end === 0 ? 1 : 2];
    const options = shuffle(rng, row.filter((a) => a !== target));
    const text = `Qui est à côté ${deName(target.name)} ?`;
    return {
      key: `reperer:cote-de:${row.map((a) => a.emoji).join('')}:${end}`,
      text,
      instruction: text,
      stage: { type: 'pattern', items: row.map((a) => a.emoji) },
      choices: options.map((a) => ({ value: a.name, label: a.emoji, name: a.name })),
      choiceStyle: 'pictures',
      answer: answer.name,
      success: { speak: `Oui, ${answer.name} est à côté ${deName(target.name)}.` },
    };
  }
  if (level === 6) return followArrows(rng);
  if (level === 7) return readMap(rng);
  if (level === 8) {
    const view = rng() < 0.6 ? 'face' : 'dos';
    const girl = rng() < 0.5;
    const held = pick(rng, HELD);
    const at = rng() < 0.5 ? 'gauche' : 'droite'; // côté de l'écran
    // de face, sa droite est à notre gauche ; de dos, sa droite est à notre droite
    const answer = view === 'dos' ? at : at === 'gauche' ? 'droite' : 'gauche';
    const intro = `${girl ? 'Cette copine' : 'Ce copain'} ${view === 'face' ? 'te regarde' : 'te tourne le dos'}.`;
    const question = `Dans quelle main tient-${girl ? 'elle' : 'il'} ${held.name} ?`;
    return {
      key: `reperer:sa-main:${view}:${girl}:${held.name}:${at}`,
      text: `${intro} ${question}`,
      instruction: [intro, question],
      stage: drawing({ kind: 'enfant', view, girl, hold: held.emoji, at }, `Un enfant vu ${view === 'face' ? 'de face' : 'de dos'}`),
      choices: [{ value: 'gauche', label: 'Sa main gauche' }, { value: 'droite', label: 'Sa main droite' }],
      choiceStyle: 'words',
      answer,
      success: {
        speak: [`Oui, sa main ${answer} !`, view === 'face'
          ? 'Quand on est face à face, sa main droite est en face de ta main gauche.'
          : 'De dos, sa main droite est du même côté que ta main droite.'],
      },
    };
  }
  return codeMoves(rng);
}

export const seReperer = {
  id: 'se-reperer',
  domain: 'monde',
  title: 'Se repérer',
  icon: '🧭',
  skill: 'Se repérer dans l’espace : sur, sous, devant, derrière, gauche, droite, quadrillages et plans',
  levels: [
    'Sur, sous, dans', 'Devant, derrière', 'À gauche, à droite', 'Main gauche, main droite', 'Entre, à côté de',
    'Suis les flèches', 'Lire un plan', 'Sa gauche, sa droite', 'Coder un déplacement', 'Grand mélange',
  ],
  generate(level, rng) {
    // niveau 10 : un peu de tout (niveaux 3 à 9)
    const q = repererLevel(level === 10 ? 3 + Math.floor(rng() * 7) : level, rng);
    return level === 10 ? { ...q, key: `melange:${q.key}` } : q;
  },
};

export const VIVRE_GAMES = [vivreEnsemble, seReperer];
