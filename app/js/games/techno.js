// « L'électricité » et « Objets et machines » (rubrique Sciences, « La matière et les objets ») :
// explorer le monde des objets au cycle 1, questionner le monde des objets au cycle 2.
// Les dessins (circuit pile + fils + ampoule, interrupteur, levier, poulie, roues dentées) sont des
// SVG fabriqués ici par technoSvg et affichés par render.js : `generate` ne renvoie que des données.
// Jamais d'information portée par la couleur seule : les fils sont noirs, l'ampoule allumée a des
// rayons, l'interrupteur ouvert a son levier levé, la pile porte « + » et « − », le sens de rotation
// est une flèche.
// Chaque réponse a été vérifiée ; on évite les objets ambigus (la trottinette ou le vélo électriques,
// le téléphone qu'on recharge, l'eau, le corps humain, la mine de crayon pour le courant).

import { pick, sample, shuffle } from '../random.js';

const capitalize = (text) => `${text[0].toUpperCase()}${text.slice(1)}`;
/** « en bois, en métal ou en verre » : les réponses lues à voix haute. */
const spokenList = (labels) => (labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(', ')} ou ${labels.at(-1)}`);
const textChoices = (values) => values.map((v) => ({ value: v, label: v }));
/** Des images à toucher : l'emoji, et son nom pour les lecteurs d'écran. */
const pictureChoices = (items) => items.map((it) => ({ value: it.name, label: it.emoji, name: it.name }));
const drawing = (d, label) => ({ type: 'drawing', drawing: d, label });

/** Une question à deux réponses toujours dans le même ordre (« oui ou non », « ouvrir ou fermer »). */
function twoWay({ key, text, instruction = text, stage, emoji, options, labels, answer, success, style = 'words' }) {
  return {
    key,
    text,
    instruction,
    stage: stage || (emoji ? { type: 'picture', emoji } : { type: 'none' }),
    choices: options.map((v, i) => ({ value: v, label: labels ? labels[i] : v })),
    choiceStyle: style,
    answer,
    success: { speak: success },
  };
}

/** Une image à trouver parmi trois : la bonne, et deux autres d'une autre famille. */
function pictureQuestion({ key, text, instruction = text, stage, answer, others, success, rng }) {
  return {
    key,
    text,
    instruction,
    stage: stage || { type: 'none' },
    choices: pictureChoices(shuffle(rng, [answer, ...others])),
    choiceStyle: 'pictures',
    answer: answer.name,
    success: { speak: success },
  };
}

/** Une réponse écrite à choisir parmi trois (pour les lecteurs) : non lues, comme dans « La matière ». */
function answerQuestion({ key, text, stage, answer, others, success, rng }) {
  return {
    key,
    text,
    instruction: text,
    stage,
    choices: textChoices(shuffle(rng, [answer, ...others])),
    choiceStyle: 'answers',
    answer,
    success: { speak: success },
  };
}

const YES_NO = ['oui', 'non'];

// ================================================================ Les dessins (SVG)

const INK = '#2b2d42';
const METAL = '#aeb6c2';
const PLASTIC = '#e3e8ee';
const GLASS = '#f7f9fb';
const LIGHT = '#ffd84d';
const WOOD = '#c8935a';
const svgOpen = (w, h) => `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true">`;
const wire = (d) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`;
const text = (x, y, t, size, extra = '') => `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" dominant-baseline="central" ${extra}>${t}</text>`;
const emojiAt = (x, y, e, size) => text(x, y, e, size, 'class="dr-emoji"');

/** La pile plate : la petite lamelle (+) à gauche, la grande (−) à droite. */
function batterySvg(x, y) {
  return `<rect x="${x + 14}" y="${y - 14}" width="8" height="16" rx="1.5" fill="${METAL}" stroke="${INK}" stroke-width="2"/>`
    + `<rect x="${x + 54}" y="${y - 26}" width="8" height="28" rx="1.5" fill="${METAL}" stroke="${INK}" stroke-width="2"/>`
    + `<rect x="${x}" y="${y}" width="76" height="52" rx="5" fill="${PLASTIC}" stroke="${INK}" stroke-width="2.5"/>`
    + text(x + 18, y + 22, '+', 26, `font-weight="700" fill="${INK}"`)
    + text(x + 58, y + 22, '−', 26, `font-weight="700" fill="${INK}"`);
}

/** L'ampoule sur son support (deux bornes) ; allumée, elle est jaune et entourée de rayons. */
function bulbSvg(cx, base, lit) {
  const gy = base - 34; // centre du verre
  const rays = lit
    ? Array.from({ length: 8 }, (_, i) => {
      const a = (Math.PI / 4) * i - Math.PI / 2;
      if (Math.sin(a) > 0.5) return ''; // pas de rayon vers le bas (le culot)
      const [c, s] = [Math.cos(a), Math.sin(a)];
      return `<line x1="${(cx + 24 * c).toFixed(1)}" y1="${(gy + 24 * s).toFixed(1)}" x2="${(cx + 34 * c).toFixed(1)}" y2="${(gy + 34 * s).toFixed(1)}" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
    }).join('')
    : '';
  return rays
    + `<rect x="${cx - 32}" y="${base}" width="64" height="16" rx="3" fill="${PLASTIC}" stroke="${INK}" stroke-width="2.5"/>`
    + `<circle cx="${cx - 22}" cy="${base + 8}" r="4" fill="${METAL}" stroke="${INK}" stroke-width="2"/>`
    + `<circle cx="${cx + 22}" cy="${base + 8}" r="4" fill="${METAL}" stroke="${INK}" stroke-width="2"/>`
    + `<rect x="${cx - 9}" y="${base - 16}" width="18" height="16" fill="${METAL}" stroke="${INK}" stroke-width="2"/>`
    + `<line x1="${cx - 9}" y1="${base - 10}" x2="${cx + 9}" y2="${base - 10}" stroke="${INK}" stroke-width="1.5"/>`
    + `<line x1="${cx - 9}" y1="${base - 5}" x2="${cx + 9}" y2="${base - 5}" stroke="${INK}" stroke-width="1.5"/>`
    + `<circle cx="${cx}" cy="${gy}" r="19" fill="${lit ? LIGHT : GLASS}" stroke="${INK}" stroke-width="2.5"/>`
    + `<path d="M${cx - 5} ${base - 16} L${cx - 5} ${gy + 2} L${cx - 2} ${gy - 4} L${cx + 2} ${gy + 2} L${cx + 5} ${gy - 4} L${cx + 5} ${base - 16}" fill="none" stroke="${INK}" stroke-width="1.6"/>`;
}

/** L'interrupteur entre (x, y) et (x + 30, y) : fermé, la lame touche les deux bornes ; ouvert, elle est levée. */
function switchSvg(x, y, closed) {
  const blade = closed
    ? `<line x1="${x}" y1="${y - 3}" x2="${x + 30}" y2="${y - 3}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`
    : `<line x1="${x}" y1="${y - 3}" x2="${x + 24}" y2="${y - 21}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
  return `<rect x="${x - 7}" y="${y}" width="44" height="9" rx="2" fill="${WOOD}" stroke="${INK}" stroke-width="2"/>`
    + `<circle cx="${x}" cy="${y - 1}" r="3.5" fill="${METAL}" stroke="${INK}" stroke-width="2"/>`
    + `<circle cx="${x + 30}" cy="${y - 1}" r="3.5" fill="${METAL}" stroke="${INK}" stroke-width="2"/>`
    + blade;
}

/** Un petit embout rond au bout d'un fil débranché. */
const wireEnd = (x, y) => `<circle cx="${x}" cy="${y}" r="4.5" fill="${INK}"/>`;

// Les points du circuit (viewBox 240 × 166)
const PLUS = [32, 50]; // haut de la lamelle +
const MINUS = [72, 38]; // haut de la lamelle −
const SCREW_L = [158, 128];
const SCREW_R = [202, 128];

/**
 * Le circuit : une pile, deux fils noirs, une ampoule sur son support.
 * `state` : 'ok' (branché), 'open' (un fil débranché de l'ampoule), 'openPile' (débranché de la pile),
 * 'same' (les deux fils sur la borne + de la pile), 'cut' (un fil coupé).
 * `sw` : null, 'open' ou 'closed' (interrupteur sur le fil du bas) ; `gap` : un objet posé entre
 * deux fils (pour savoir s'il laisse passer le courant) ; `lit` : l'ampoule allumée.
 */
function circuitSvg({ state = 'ok', sw = null, gap = null, lit = false }) {
  const out = [svgOpen(240, 166), batterySvg(18, 64), bulbSvg(180, 120, lit)];
  // fil du haut : de la borne + à la borne gauche de l'ampoule, par-dessus
  out.push(state === 'openPile'
    ? wire(`M44 30 C44 6, 132 4, 140 50 S 150 128 ${SCREW_L.join(' ')}`) + wireEnd(44, 30)
    : wire(`M${PLUS.join(' ')} C32 4, 132 4, 140 50 S 150 128 ${SCREW_L.join(' ')}`));
  // fil du bas, en trois morceaux : de la borne − (ou de la borne + pour « same ») jusqu'en x = 112 ;
  // de x = 112 à x = 150 (interrupteur, objet, fil coupé) ; puis jusqu'à la borne droite de l'ampoule
  out.push(wire(state === 'same' ? `M${PLUS.join(' ')} C10 50, 6 150, 40 150 L112 150` : `M${MINUS.join(' ')} C110 38, 96 150, 112 150`));
  if (sw) out.push(wire('M112 150 L116 149'), wire('M146 149 L150 150'), switchSvg(116, 150, sw === 'closed'));
  else if (gap) out.push(wireEnd(112, 150), wireEnd(150, 150), emojiAt(131, 147, gap, 30));
  else if (state === 'cut') out.push(wireEnd(112, 150), wireEnd(150, 150));
  else out.push(wire('M112 150 L150 150'));
  out.push(state === 'open'
    ? wire('M150 150 L222 150 C236 150, 238 136, 232 124') + wireEnd(232, 124)
    : wire(`M150 150 L216 150 C230 150, 226 ${SCREW_R[1]} ${SCREW_R.join(' ')}`));
  out.push('</svg>');
  return out.join('');
}

/** Les pièces du circuit, une par bouton (niveau « Le circuit électrique »). */
function partSvg(part) {
  switch (part) {
    case 'pile': return `${svgOpen(100, 90)}${batterySvg(12, 32)}</svg>`;
    case 'ampoule': return `${svgOpen(100, 90)}${bulbSvg(50, 66, false)}</svg>`;
    case 'fil': return `${svgOpen(100, 90)}${wire('M14 70 C14 10, 86 80, 86 20')}${wireEnd(14, 70)}${wireEnd(86, 20)}</svg>`;
    case 'interrupteur': return `${svgOpen(100, 90)}${wire('M8 62 L32 62')}${wire('M68 62 L92 62')}${switchSvg(35, 62, false)}</svg>`;
    default: return '';
  }
}

/** Une roue dentée de `n` dents centrée en (cx, cy) ; `phase` tourne les dents. */
function gearPath(cx, cy, rOut, rIn, n, phase) {
  const s = (2 * Math.PI) / n;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = phase + i * s;
    for (const [r, da] of [[rIn, -0.32], [rOut, -0.17], [rOut, 0.17], [rIn, 0.32]]) {
      pts.push(`${(cx + r * Math.cos(a + da * s)).toFixed(1)},${(cy + r * Math.sin(a + da * s)).toFixed(1)}`);
    }
  }
  return `<polygon points="${pts.join(' ')}" fill="${PLASTIC}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`;
}

/** Une flèche en arc de cercle autour de (cx, cy), de l'angle a0 à a1 (en degrés, sens de l'écran). */
function arcArrow(cx, cy, r, a0, a1) {
  const rad = (d) => (d * Math.PI) / 180;
  const p = (d) => [cx + r * Math.cos(rad(d)), cy + r * Math.sin(rad(d))];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  const sweep = a1 > a0 ? 1 : 0;
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  // la pointe : dans le sens du mouvement, à la fin de l'arc
  const dir = sweep ? 1 : -1;
  const [tx, ty] = [-Math.sin(rad(a1)) * dir, Math.cos(rad(a1)) * dir];
  const [nx, ny] = [Math.cos(rad(a1)), Math.sin(rad(a1))];
  const head = [
    [x1 + tx * 9, y1 + ty * 9], [x1 - tx * 3 + nx * 7, y1 - ty * 3 + ny * 7], [x1 - tx * 3 - nx * 7, y1 - ty * 3 - ny * 7],
  ].map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${large} ${sweep} ${x1.toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`
    + `<polygon points="${head}" fill="${INK}"/>`;
}

/** Deux ou trois roues dentées en ligne, A, B (et C) ; la flèche dit dans quel sens tourne A. */
function gearsSvg({ count, clockwise }) {
  const n = 12;
  const s = (2 * Math.PI) / n;
  const w = count === 2 ? 160 : 222;
  const out = [svgOpen(w, 130)];
  for (let i = 0; i < count; i++) {
    const cx = 48 + i * 63;
    out.push(gearPath(cx, 80, 34, 26, n, i % 2 ? s / 2 : 0));
    out.push(`<circle cx="${cx}" cy="80" r="16" fill="#fff" stroke="${INK}" stroke-width="2"/>`);
    out.push(text(cx, 81, 'ABC'[i], 20, `font-weight="700" fill="${INK}"`));
  }
  out.push(clockwise ? arcArrow(48, 80, 44, -160, -55) : arcArrow(48, 80, 44, -55, -160));
  out.push('</svg>');
  return out.join('');
}

/** Le bouton « sens de rotation » : une flèche qui fait presque le tour d'une petite roue. */
function rotationSvg(clockwise) {
  return `${svgOpen(100, 100)}${gearPath(50, 50, 22, 16, 8, 0)}<circle cx="50" cy="50" r="7" fill="#fff" stroke="${INK}" stroke-width="2"/>`
    + `${clockwise ? arcArrow(50, 50, 36, -200, 60) : arcArrow(50, 50, 36, 20, -240)}</svg>`;
}

/**
 * Le levier : une planche posée sur une cale, le rocher à un bout.
 * `mode` 'appui' : trois endroits où appuyer (A, B, C) ; 'cale' : trois places pour la cale.
 * `mirror` : le rocher à droite.
 */
function leverSvg({ mode, mirror }) {
  const X = (x) => (mirror ? 240 - x : x);
  const out = [svgOpen(240, 130), `<line x1="4" y1="116" x2="236" y2="116" stroke="${INK}" stroke-width="3"/>`];
  const plank = `<rect x="${mirror ? 240 - 226 : 14}" y="74" width="212" height="9" rx="3" fill="${WOOD}" stroke="${INK}" stroke-width="2.5"/>`;
  const cale = (x, dashed) => `<polygon points="${X(x) - 20},116 ${X(x) + 20},116 ${X(x)},84" fill="${dashed ? 'none' : METAL}" stroke="${INK}" stroke-width="2.5"${dashed ? ' stroke-dasharray="5 4"' : ''}/>`;
  const letter = (x, y, l) => `<circle cx="${X(x)}" cy="${y}" r="12" fill="#fff" stroke="${INK}" stroke-width="2.5"/>${text(X(x), y + 1, l, 16, `font-weight="700" fill="${INK}"`)}`;
  const order = mirror ? ['C', 'B', 'A'] : ['A', 'B', 'C']; // les lettres restent de gauche à droite
  if (mode === 'appui') {
    out.push(cale(74, false), plank, emojiAt(X(38), 52, '🪨', 46));
    [110, 160, 210].forEach((x, i) => out.push(`<line x1="${X(x)}" y1="44" x2="${X(x)}" y2="68" stroke="${INK}" stroke-width="3"/>`
      + `<polygon points="${X(x) - 6},62 ${X(x) + 6},62 ${X(x)},72" fill="${INK}"/>`, letter(x, 30, order[i])));
  } else {
    out.push(plank, emojiAt(X(38), 52, '🪨', 46), emojiAt(X(214), 52, '👇', 30));
    [70, 120, 170].forEach((x, i) => out.push(cale(x, true), text(X(x), 106, order[i], 15, `font-weight="700" fill="${INK}"`)));
  }
  out.push('</svg>');
  return out.join('');
}

/** La poulie : une roue accrochée en haut, la corde passe dessus ; le seau à gauche, la main à droite. */
function pulleySvg({ pull }) {
  const arrow = pull === 'bas'
    ? `<line x1="132" y1="78" x2="132" y2="112" stroke="${INK}" stroke-width="4"/><polygon points="124,108 140,108 132,122" fill="${INK}"/>`
    : `<line x1="132" y1="122" x2="132" y2="88" stroke="${INK}" stroke-width="4"/><polygon points="124,92 140,92 132,78" fill="${INK}"/>`;
  return `${svgOpen(170, 150)}<rect x="20" y="4" width="130" height="10" fill="${WOOD}" stroke="${INK}" stroke-width="2.5"/>`
    + `<line x1="85" y1="14" x2="85" y2="30" stroke="${INK}" stroke-width="4"/>`
    + `<circle cx="85" cy="44" r="20" fill="${PLASTIC}" stroke="${INK}" stroke-width="3"/><circle cx="85" cy="44" r="4" fill="${INK}"/>`
    + `<path d="M65 44 A20 20 0 0 1 105 44" fill="none" stroke="${INK}" stroke-width="3.5"/>`
    + `<line x1="65" y1="44" x2="65" y2="104" stroke="${INK}" stroke-width="3.5"/><line x1="105" y1="44" x2="105" y2="92" stroke="${INK}" stroke-width="3.5"/>`
    + `<path d="M50 112 L80 112 L76 140 L54 140 Z" fill="${METAL}" stroke="${INK}" stroke-width="2.5"/><path d="M52 112 Q65 98 78 112" fill="none" stroke="${INK}" stroke-width="2.5"/>`
    + `${emojiAt(105, 104, '✊', 28)}${arrow}</svg>`;
}

/** Le dessin d'une question ou d'un bouton (appelé par render.js) ; null si ce n'est pas un dessin d'ici. */
export function technoSvg(d) {
  switch (d.kind) {
    case 'circuit': return circuitSvg(d);
    case 'piece-circuit': return partSvg(d.part);
    case 'engrenages': return gearsSvg(d);
    case 'rotation': return rotationSvg(d.clockwise);
    case 'levier': return leverSvg(d);
    case 'poulie': return pulleySvg(d);
    default: return null;
  }
}

// ================================================================ L'électricité

// ---------------------------------------------------------------- 1. Électrique ou pas ?

// Rien qui puisse exister dans les deux versions (vélo ou trottinette électriques, brosse à dents…)
// du côté « électrique » ; le vélo et les ciseaux d'un enfant marchent sans électricité.
export const ELECTRIC = [
  { emoji: '💡', name: 'l’ampoule' }, { emoji: '📺', name: 'la télévision' }, { emoji: '💻', name: 'l’ordinateur' },
  { emoji: '📻', name: 'la radio' }, { emoji: '🔦', name: 'la lampe de poche' }, { emoji: '🖨️', name: 'l’imprimante' },
  { emoji: '🚦', name: 'le feu tricolore' }, { emoji: '🎮', name: 'la console de jeux' },
];
export const NOT_ELECTRIC = [
  { emoji: '🚲', name: 'le vélo' }, { emoji: '✂️', name: 'les ciseaux' }, { emoji: '🔨', name: 'le marteau' },
  { emoji: '🕯️', name: 'la bougie' }, { emoji: '📕', name: 'le livre' }, { emoji: '🪁', name: 'le cerf-volant' },
  { emoji: '🧹', name: 'le balai' }, { emoji: '⚽', name: 'le ballon' }, { emoji: '🥄', name: 'la cuillère' },
  { emoji: '🪣', name: 'le seau' },
];

function electricOrNot(rng) {
  const needs = rng() < 0.6;
  const [yes, no] = needs ? [ELECTRIC, NOT_ELECTRIC] : [NOT_ELECTRIC, ELECTRIC];
  const answer = pick(rng, yes);
  return pictureQuestion({
    key: `electricite:objet:${needs}:${answer.name}`,
    text: needs ? 'Touche l’objet qui marche à l’électricité.' : 'Touche l’objet qui marche sans électricité.',
    answer,
    others: sample(rng, no, 2),
    success: needs ? 'Oui, cet objet a besoin d’électricité pour marcher.' : 'Oui, cet objet marche sans électricité.',
    rng,
  });
}

// ---------------------------------------------------------------- 2. Pile ou prise ?

// Seulement des objets qui marchent toujours d'une seule façon (pas le téléphone, qu'on recharge).
export const POWER = [
  { emoji: '🔦', text: 'La lampe de poche marche avec…', answer: 'pile' },
  { emoji: '🏎️', text: 'La petite voiture télécommandée marche avec…', answer: 'pile' },
  { emoji: '🧸', text: 'La peluche qui parle marche avec…', answer: 'pile' },
  { emoji: '📺', text: 'La télévision du salon marche avec…', answer: 'prise' },
  { emoji: '🍞', text: 'Le grille-pain marche avec…', answer: 'prise' },
  { emoji: '🧺', text: 'La machine à laver marche avec…', answer: 'prise' },
  { emoji: '🖨️', text: 'L’imprimante marche avec…', answer: 'prise' },
];
const POWER_LABELS = { pile: '🔋 une pile', prise: '🔌 la prise' };

function batteryOrPlug(rng) {
  const item = pick(rng, POWER);
  return twoWay({
    key: `electricite:pile:${item.text}`,
    text: item.text,
    instruction: [item.text, 'Une pile ou la prise ?'],
    emoji: item.emoji,
    options: ['pile', 'prise'],
    labels: [POWER_LABELS.pile, POWER_LABELS.prise],
    answer: item.answer,
    style: 'answers',
    success: item.answer === 'pile'
      ? 'Oui, avec des piles : on peut l’emporter partout.'
      : 'Oui, cet appareil se branche sur la prise.',
  });
}

// ---------------------------------------------------------------- 3. Attention, danger !

export const DANGERS = [
  { emoji: '🔌', text: 'On ne met jamais les doigts dans une prise.', answer: 'vrai', why: 'L’électricité de la prise est très dangereuse.' },
  { emoji: '🔌', text: 'On peut mettre une fourchette dans une prise.', answer: 'faux', why: 'Jamais d’objet dans une prise : c’est très dangereux.' },
  { emoji: '💧', text: 'On peut toucher un appareil électrique avec les mains mouillées.', answer: 'faux', why: 'L’eau et l’électricité ensemble, c’est très dangereux.' },
  { emoji: '🛁', text: 'Dans le bain, on n’utilise jamais d’appareil électrique.', answer: 'vrai', why: 'L’eau et l’électricité ensemble, c’est très dangereux.' },
  { emoji: '🔌', text: 'Pour débrancher un appareil, on tire sur le fil.', answer: 'faux', why: 'On tient la prise pour débrancher, jamais le fil.' },
  { emoji: '⚠️', text: 'On ne touche pas un fil électrique abîmé.', answer: 'vrai', why: 'On prévient tout de suite un adulte.' },
  { emoji: '🪁', text: 'On peut jouer au cerf-volant près des fils électriques.', answer: 'faux', why: 'On joue loin des lignes électriques.' },
  { emoji: '🔋', text: 'Pour les expériences en classe, on utilise une pile.', answer: 'vrai', why: 'Pour les expériences, une pile suffit : la prise est dangereuse.' },
  { emoji: '🔋', text: 'On peut mettre une petite pile dans sa bouche.', answer: 'faux', why: 'Une pile avalée, c’est très dangereux.' },
];

function trueOrFalse(rng, list, topic) {
  const item = pick(rng, list);
  return twoWay({
    key: `${topic}:${item.text}`,
    text: `${item.text} Vrai ou faux ?`,
    instruction: [item.text, 'Vrai ou faux ?'],
    emoji: item.emoji,
    options: ['vrai', 'faux'],
    answer: item.answer,
    success: [item.answer === 'vrai' ? 'C’est vrai !' : 'C’est faux !', item.why],
  });
}

// ---------------------------------------------------------------- 4. Économiser l'électricité

export const SAVING = [
  { emoji: '💡', text: 'Tu éteins la lumière en sortant de la pièce.', saves: true },
  { emoji: '💻', text: 'Tu éteins l’ordinateur quand tu as fini.', saves: true },
  { emoji: '🪟', text: 'Tu ouvres les rideaux pour avoir la lumière du jour.', saves: true },
  { emoji: '👕', text: 'Tu fais sécher le linge dehors, au soleil.', saves: true },
  { emoji: '📺', text: 'Tu laisses la télévision allumée dans une pièce vide.', saves: false },
  { emoji: '💡', text: 'Tu allumes toutes les lampes en plein jour.', saves: false },
  { emoji: '🧊', text: 'Tu laisses la porte du réfrigérateur ouverte.', saves: false },
  { emoji: '🔌', text: 'Tu laisses le chargeur branché, sans rien au bout.', saves: false },
];

function saving(rng) {
  const item = pick(rng, SAVING);
  const ask = 'Est-ce que ça économise l’électricité ?';
  return twoWay({
    key: `electricite:economie:${item.text}`,
    text: `${item.text} ${ask}`,
    instruction: [item.text, ask],
    emoji: item.emoji,
    options: YES_NO,
    answer: item.saves ? 'oui' : 'non',
    success: item.saves ? 'Oui, ce geste économise l’électricité.' : 'Non, ce geste gaspille l’électricité.',
  });
}

// ---------------------------------------------------------------- 5. Le circuit électrique

export const PARTS = [
  { part: 'pile', name: 'la pile', ask: 'Qu’est-ce qui donne l’électricité dans le circuit ?', says: 'Oui, la pile donne l’électricité.' },
  { part: 'ampoule', name: 'l’ampoule', ask: 'Qu’est-ce qui s’allume quand le courant passe ?', says: 'Oui, l’ampoule s’allume.' },
  { part: 'fil', name: 'le fil', ask: 'Qu’est-ce qui relie la pile à l’ampoule ?', says: 'Oui, les fils relient la pile à l’ampoule.' },
  { part: 'interrupteur', name: 'l’interrupteur', ask: 'Qu’est-ce qui sert à allumer et à éteindre ?', says: 'Oui, l’interrupteur allume et éteint.' },
];
const partChoice = (p) => ({ value: p.part, drawing: { kind: 'piece-circuit', part: p.part }, name: p.name });
const CIRCUIT_LIT = drawing({ kind: 'circuit', state: 'ok', sw: 'closed', lit: true }, 'Un circuit : une pile, deux fils, un interrupteur fermé et une ampoule allumée');

function circuitParts(rng) {
  const part = pick(rng, PARTS);
  // une fois sur deux, le nom (« Touche la pile. ») ; sinon, à quoi sert la pièce
  const byName = rng() < 0.5;
  const text = byName ? `Touche ${part.name}.` : part.ask;
  const options = shuffle(rng, [part, ...sample(rng, PARTS.filter((p) => p !== part), 2)]);
  return {
    key: `electricite:pieces:${text}`,
    text,
    instruction: text,
    stage: CIRCUIT_LIT,
    choices: options.map(partChoice),
    choiceStyle: 'drawings',
    answer: part.part,
    success: { speak: byName ? `Oui, c’est ${part.name}.` : part.says },
  };
}

// ---------------------------------------------------------------- 6 et 7. L'ampoule s'allume-t-elle ?

// Chaque montage, ce qu'on en dit, et son nom pour les lecteurs d'écran.
export const CIRCUITS = {
  ok: { lights: true, says: 'Oui : le circuit est fermé, le courant passe.', name: 'Les deux fils sont bien branchés' },
  open: { lights: false, says: 'Non : un fil est débranché, le circuit est ouvert.', name: 'Un fil est débranché de l’ampoule' },
  openPile: { lights: false, says: 'Non : un fil est débranché, le circuit est ouvert.', name: 'Un fil est débranché de la pile' },
  cut: { lights: false, says: 'Non : le fil est coupé, le circuit est ouvert.', name: 'Un fil est coupé' },
  same: { lights: false, says: 'Non : les deux fils sont sur la même borne de la pile.', name: 'Les deux fils sont sur la même borne' },
};
const circuitStage = (state, sw = null) => drawing({ kind: 'circuit', state, sw }, `Un circuit. ${CIRCUITS[state].name}${sw ? `, l’interrupteur est ${sw === 'open' ? 'ouvert' : 'fermé'}` : ''}.`);
const WILL_LIGHT = 'L’ampoule va-t-elle s’allumer ?';

function lightsUp(rng) {
  const state = rng() < 0.4 ? 'ok' : pick(rng, ['open', 'openPile', 'cut', 'same']);
  const c = CIRCUITS[state];
  return twoWay({
    key: `electricite:allume:${state}`,
    text: WILL_LIGHT,
    stage: circuitStage(state),
    options: YES_NO,
    answer: c.lights ? 'oui' : 'non',
    success: c.says,
  });
}

// Le bon circuit parmi trois : un qui marche (avec ou sans interrupteur fermé), deux qui ne marchent pas.
const GOOD = [{ state: 'ok', sw: null }, { state: 'ok', sw: 'closed' }];
const BAD = [
  { state: 'open', sw: null }, { state: 'openPile', sw: null }, { state: 'cut', sw: null }, { state: 'same', sw: null },
  { state: 'ok', sw: 'open' },
];
const circuitId = (c) => `${c.state}${c.sw ? `-${c.sw}` : ''}`;
const circuitName = (c) => (c.sw ? `L’interrupteur est ${c.sw === 'open' ? 'ouvert' : 'fermé'}` : CIRCUITS[c.state].name);

function goodCircuit(rng) {
  const good = pick(rng, GOOD);
  const options = shuffle(rng, [good, ...sample(rng, BAD, 2)]);
  const text = 'Touche le circuit où l’ampoule va s’allumer.';
  return {
    key: `electricite:bon-circuit:${options.map(circuitId).join(',')}`,
    text,
    instruction: text,
    stage: { type: 'none' },
    choices: options.map((c) => ({ value: circuitId(c), drawing: { kind: 'circuit', state: c.state, sw: c.sw }, name: circuitName(c) })),
    choiceStyle: 'circuits',
    answer: circuitId(good),
    success: { speak: 'Oui : tout est bien branché, le circuit est fermé.' },
  };
}

// ---------------------------------------------------------------- 8. L'interrupteur

function switchQuestion(rng) {
  const closed = rng() < 0.5;
  if (rng() < 0.5) {
    return twoWay({
      key: `electricite:interrupteur:${closed}`,
      text: WILL_LIGHT,
      stage: circuitStage('ok', closed ? 'closed' : 'open'),
      options: YES_NO,
      answer: closed ? 'oui' : 'non',
      success: closed ? 'Oui : l’interrupteur est fermé, le courant passe.' : 'Non : l’interrupteur est ouvert, le courant ne passe pas.',
    });
  }
  // l'ampoule allumée (interrupteur fermé) ou éteinte (ouvert) : que faut-il faire ?
  const ask = closed ? 'Pour éteindre l’ampoule, que fais-tu ?' : 'Pour allumer l’ampoule, que fais-tu ?';
  return twoWay({
    key: `electricite:interrupteur:${ask}`,
    text: ask,
    instruction: [ask, 'Ouvrir ou fermer l’interrupteur ?'],
    stage: drawing({ kind: 'circuit', state: 'ok', sw: closed ? 'closed' : 'open', lit: closed },
      closed ? 'Un circuit : l’interrupteur est fermé, l’ampoule est allumée.' : 'Un circuit : l’interrupteur est ouvert, l’ampoule est éteinte.'),
    options: ['ouvrir', 'fermer'],
    answer: closed ? 'ouvrir' : 'fermer',
    success: closed ? 'Oui : on ouvre l’interrupteur, le courant ne passe plus.' : 'Oui : on ferme l’interrupteur, le courant passe.',
  });
}

// ---------------------------------------------------------------- 9. Conducteur ou isolant ?

// Des objets tout en métal (conducteurs) ou sans aucun métal (isolants). Jamais l'eau, le corps,
// la mine de crayon (graphite), ni les ciseaux (lames en métal, poignées en plastique), ni le bocal
// en verre (son couvercle est en métal).
export const CONDUCTORS = [
  { emoji: '📎', name: 'le trombone' }, { emoji: '🔑', name: 'la clé' }, { emoji: '🥄', name: 'la cuillère en métal' },
  { emoji: '🪙', name: 'la pièce' }, { emoji: '🔩', name: 'le boulon' }, { emoji: '🍴', name: 'la fourchette en métal' },
];
export const INSULATORS = [
  { emoji: '🪵', name: 'le morceau de bois', matter: 'le bois' },
  { emoji: '📏', name: 'la règle en plastique', matter: 'le plastique' },
  { emoji: '🎈', name: 'le ballon de baudruche', matter: 'le caoutchouc' },
  { emoji: '🧶', name: 'la pelote de laine', matter: 'la laine' },
  { emoji: '🥢', name: 'les baguettes en bois', matter: 'le bois' },
  { emoji: '📄', name: 'la feuille de papier', matter: 'le papier' },
];
const conductorSays = 'Le métal laisse passer le courant : c’est un conducteur.';
const insulatorSays = (it) => `${capitalize(it.matter)} ne laisse pas passer le courant : c’est un isolant.`;

function conductors(rng) {
  const metal = rng() < 0.5;
  const item = pick(rng, metal ? CONDUCTORS : INSULATORS);
  if (rng() < 0.5) {
    const put = `On met ${item.name} entre les deux fils.`;
    return twoWay({
      key: `electricite:conducteur:${item.name}`,
      text: `${put} ${WILL_LIGHT}`,
      instruction: [put, WILL_LIGHT],
      stage: drawing({ kind: 'circuit', state: 'ok', gap: item.emoji }, `Un circuit ouvert ; entre les deux fils : ${item.name}.`),
      options: YES_NO,
      answer: metal ? 'oui' : 'non',
      success: metal ? ['Oui !', conductorSays] : ['Non !', insulatorSays(item)],
    });
  }
  const others = sample(rng, metal ? INSULATORS : CONDUCTORS, 2);
  return pictureQuestion({
    key: `electricite:conducteur:${metal}:${item.name}`,
    text: metal ? 'Touche l’objet qui laisse passer le courant.' : 'Touche l’objet qui ne laisse pas passer le courant.',
    answer: item,
    others,
    success: metal ? conductorSays : insulatorSays(item),
    rng,
  });
}

// ---------------------------------------------------------------- Le jeu

const ELECTRICITE_LEVELS = [
  electricOrNot, batteryOrPlug, (rng) => trueOrFalse(rng, DANGERS, 'electricite:danger'), saving, circuitParts,
  lightsUp, goodCircuit, switchQuestion, conductors,
];

export const electricite = {
  id: 'electricite',
  domain: 'sciences',
  title: 'L’électricité',
  icon: '💡',
  skill: 'Découvrir l’électricité : les appareils, les dangers, le circuit, l’interrupteur, les conducteurs',
  levels: [
    'Électrique ou pas ?', 'Pile ou prise ?', 'Attention, danger !', 'Économiser l’électricité', 'Le circuit électrique',
    'L’ampoule s’allume ?', 'Le bon circuit', 'L’interrupteur', 'Conducteur ou isolant ?', 'Toute l’électricité',
  ],
  generate(level, rng) {
    // niveau 10 : un peu de tout (sauf le premier niveau, trop facile)
    const make = level >= 10 ? pick(rng, ELECTRICITE_LEVELS.slice(1)) : ELECTRICITE_LEVELS[level - 1];
    return make(rng);
  },
};

// ================================================================ Objets et machines

// ---------------------------------------------------------------- 1. À quoi ça sert ?

// L'outil, ce qu'on fait avec. Les ciseaux et la scie (couper) ne sont jamais proposés ensemble.
export const USES = [
  { emoji: '✂️', name: 'les ciseaux', ask: 'Pour découper du papier, que prends-tu ?', group: 'couper' },
  { emoji: '🪚', name: 'la scie', ask: 'Pour couper une planche, que prends-tu ?', group: 'couper' },
  { emoji: '🔨', name: 'le marteau', ask: 'Pour planter un clou, que prends-tu ?' },
  { emoji: '🪛', name: 'le tournevis', ask: 'Pour serrer une vis, que prends-tu ?' },
  { emoji: '🪥', name: 'la brosse à dents', ask: 'Pour te brosser les dents, que prends-tu ?' },
  { emoji: '🧹', name: 'le balai', ask: 'Pour balayer le sol, que prends-tu ?' },
  { emoji: '🔑', name: 'la clé', ask: 'Pour ouvrir la porte fermée à clé, que prends-tu ?' },
  { emoji: '☂️', name: 'le parapluie', ask: 'Pour ne pas être mouillé sous la pluie, que prends-tu ?' },
  { emoji: '🪜', name: 'l’échelle', ask: 'Pour monter tout en haut de l’arbre, que prends-tu ?' },
  { emoji: '🥄', name: 'la cuillère', ask: 'Pour manger ta soupe, que prends-tu ?' },
  { emoji: '📏', name: 'la règle', ask: 'Pour tracer un trait bien droit, que prends-tu ?' },
  { emoji: '🖍️', name: 'la craie grasse', ask: 'Pour colorier un dessin, que prends-tu ?' },
  { emoji: '⏰', name: 'le réveil', ask: 'Pour te réveiller le matin, que prends-tu ?' },
];

function uses(rng) {
  const tool = pick(rng, USES);
  const chosen = [tool];
  for (const t of shuffle(rng, USES)) {
    if (chosen.length < 3 && !chosen.some((c) => c === t || (c.group && c.group === t.group))) chosen.push(t);
  }
  return pictureQuestion({
    key: `objets:usage:${tool.name}`,
    text: tool.ask,
    answer: tool,
    others: chosen.slice(1),
    success: `Oui, avec ${tool.name}.`,
    rng,
  });
}

// ---------------------------------------------------------------- 2. Qu'est-ce qui roule ?

export const WHEELED = [
  { emoji: '🚲', name: 'le vélo' }, { emoji: '🛴', name: 'la trottinette' }, { emoji: '🛹', name: 'la planche à roulettes' },
  { emoji: '🚗', name: 'la voiture' }, { emoji: '🛒', name: 'le chariot' }, { emoji: '🚜', name: 'le tracteur' },
  { emoji: '🛼', name: 'le patin à roulettes' }, { emoji: '🚌', name: 'le bus' },
];
// Ce qui roule sans roues : la balle, le ballon.
export const ROUND = [{ emoji: '⚽', name: 'le ballon' }, { emoji: '🏀', name: 'le ballon de basket' }, { emoji: '🎾', name: 'la balle de tennis' }];
// Ce qui ne roule pas : des objets plats ou carrés, ce qui glisse.
export const NOT_ROLLING = [
  { emoji: '📦', name: 'le carton' }, { emoji: '🧱', name: 'la brique' }, { emoji: '📕', name: 'le livre' },
  { emoji: '🛷', name: 'la luge' }, { emoji: '⛸️', name: 'le patin à glace' }, { emoji: '🪜', name: 'l’échelle' },
  { emoji: '🎁', name: 'le cadeau' },
];

function rolls(rng) {
  if (rng() < 0.5) {
    const answer = pick(rng, [...WHEELED, ...ROUND]);
    return pictureQuestion({
      key: `objets:roule:${answer.name}`,
      text: 'Touche ce qui roule.',
      answer,
      others: sample(rng, NOT_ROLLING, 2),
      success: ROUND.includes(answer) ? 'Oui, c’est rond : ça roule !' : 'Oui, ça roule sur ses roues !',
      rng,
    });
  }
  // a des roues : la balle, ronde, roule aussi mais n'a pas de roue (un piège pour les plus grands)
  const answer = pick(rng, WHEELED);
  return pictureQuestion({
    key: `objets:roues:${answer.name}`,
    text: 'Touche ce qui a des roues.',
    answer,
    others: [pick(rng, ROUND), pick(rng, NOT_ROLLING)],
    success: 'Oui, il y a des roues.',
    rng,
  });
}

// ---------------------------------------------------------------- 3. Objets d'avant et d'aujourd'hui

export const THEN_NOW = [
  {
    old: { emoji: '🕯️', name: 'la bougie' }, now: { emoji: '💡', name: 'l’ampoule' },
    text: 'Autrefois, on s’éclairait avec une bougie. Aujourd’hui, on utilise…', says: 'Oui, aujourd’hui, on s’éclaire avec des ampoules.',
  },
  {
    old: { emoji: '☎️', name: 'le téléphone à cadran' }, now: { emoji: '📱', name: 'le téléphone portable' },
    text: 'Autrefois, le téléphone avait un fil et un cadran. Aujourd’hui, on utilise…', says: 'Oui, aujourd’hui, on utilise le téléphone portable.',
  },
  {
    old: { emoji: '🚂', name: 'la locomotive à vapeur' }, now: { emoji: '🚄', name: 'le train à grande vitesse' },
    text: 'Autrefois, le train avançait grâce à la vapeur. Aujourd’hui, on prend…', says: 'Oui, aujourd’hui, on prend le train à grande vitesse.',
  },
  {
    old: { emoji: '🪶', name: 'la plume d’oie' }, now: { emoji: '🖊️', name: 'le stylo' },
    text: 'Autrefois, on écrivait avec une plume et de l’encre. Aujourd’hui, on écrit avec…', says: 'Oui, aujourd’hui, on écrit avec un stylo.',
  },
];

function thenAndNow(rng) {
  const pair = pick(rng, THEN_NOW);
  const others = THEN_NOW.filter((p) => p !== pair);
  if (rng() < 0.5) {
    return pictureQuestion({
      key: `objets:avant:${pair.now.name}`,
      text: pair.text,
      stage: { type: 'picture', emoji: pair.old.emoji },
      answer: pair.now,
      others: sample(rng, others, 2).map((p) => p.now),
      success: pair.says,
      rng,
    });
  }
  // l'objet d'autrefois parmi deux objets d'aujourd'hui
  return pictureQuestion({
    key: `objets:autrefois:${pair.old.name}`,
    text: 'Touche l’objet d’autrefois.',
    answer: pair.old,
    others: sample(rng, others, 2).map((p) => p.now),
    success: `Oui, ${pair.old.name}, c’est un objet d’autrefois.`,
    rng,
  });
}

// ---------------------------------------------------------------- 4. Monter un objet, dans l'ordre

export const BUILDS = [
  {
    title: 'Fabriquer un sandwich.',
    steps: [['🔪', 'couper le pain'], ['🧈', 'mettre le beurre'], ['🧀', 'ajouter le fromage'], ['🥪', 'refermer le pain']],
    says: 'On coupe le pain, on met le beurre, on ajoute le fromage, puis on referme.',
  },
  {
    title: 'Construire une cabane.',
    steps: [['✏️', 'dessiner le plan'], ['🪚', 'scier les planches'], ['🔨', 'clouer les planches'], ['🛖', 'la cabane est finie']],
    says: 'On dessine le plan, on scie les planches, on les cloue, et la cabane est finie.',
  },
  {
    title: 'Monter un vélo.',
    steps: [['📦', 'ouvrir le carton'], ['🔧', 'visser les pièces'], ['🚲', 'faire un essai']],
    says: 'On ouvre le carton, on visse les pièces, puis on fait un essai.',
  },
  {
    title: 'Préparer la lampe de poche.',
    steps: [['🪛', 'ouvrir la lampe'], ['🔋', 'mettre les piles'], ['🔦', 'allumer la lampe']],
    says: 'On ouvre la lampe, on met les piles, puis on l’allume.',
  },
  {
    title: 'Fabriquer un cerf-volant.',
    steps: [['✂️', 'découper le papier'], ['🧵', 'attacher la ficelle'], ['🪁', 'le faire voler']],
    says: 'On découpe le papier, on attache la ficelle, puis on le fait voler.',
  },
  {
    title: 'Faire un gâteau.',
    steps: [['🥣', 'mélanger la pâte'], ['🔥', 'faire cuire'], ['🎂', 'décorer le gâteau']],
    says: 'On mélange la pâte, on la fait cuire, puis on décore le gâteau.',
  },
  {
    title: 'Envoyer une lettre.',
    steps: [['✍️', 'écrire la lettre'], ['✉️', 'fermer l’enveloppe'], ['📮', 'la poster']],
    says: 'On écrit la lettre, on ferme l’enveloppe, puis on la poste.',
  },
];

function buildOrder(rng) {
  const build = pick(rng, BUILDS);
  let order = shuffle(rng, build.steps.map((_, i) => i));
  if (order.every((v, i) => v === i)) order = [...order.slice(1), order[0]]; // jamais déjà rangé
  const ask = 'Touche les images dans l’ordre.';
  return {
    key: `objets:monter:${build.title}:${order.join('')}`,
    interaction: 'order',
    text: `${build.title} ${ask}`,
    instruction: [build.title, ask],
    stage: { type: 'none' },
    items: order.map((i) => ({ value: i, emoji: build.steps[i][0], label: build.steps[i][1], caption: build.steps[i][1] })),
    order: 'asc',
    sign: '→',
    choices: [],
    answer: null,
    success: { speak: build.says },
  };
}

// ---------------------------------------------------------------- 5. Quelle énergie ?

export const ENERGIES = {
  muscles: { label: '💪 les muscles', spoken: 'les muscles', says: 'Oui : c’est la force de nos muscles.' },
  electricite: { label: '⚡ l’électricité', spoken: 'l’électricité', says: 'Oui : il faut de l’électricité.' },
  vent: { label: '🌬️ le vent', spoken: 'le vent', says: 'Oui : c’est le vent qui pousse.' },
  soleil: { label: '☀️ le soleil', spoken: 'le soleil', says: 'Oui : c’est la lumière du soleil.' },
};
const ENERGY_ORDER = Object.keys(ENERGIES);
export const ENERGY_USES = [
  { emoji: '🚲', text: 'Qu’est-ce qui fait avancer le vélo ?', answer: 'muscles' },
  { emoji: '🛶', text: 'Qu’est-ce qui fait avancer le canoë ?', answer: 'muscles' },
  { emoji: '🛒', text: 'Qu’est-ce qui fait avancer le chariot ?', answer: 'muscles' },
  { emoji: '🪀', text: 'Qu’est-ce qui fait monter et descendre le yoyo ?', answer: 'muscles' },
  { emoji: '📺', text: 'Qu’est-ce qui fait marcher la télévision ?', answer: 'electricite' },
  { emoji: '🔦', text: 'Qu’est-ce qui fait marcher la lampe de poche ?', answer: 'electricite' },
  { emoji: '🖨️', text: 'Qu’est-ce qui fait marcher l’imprimante ?', answer: 'electricite' },
  { emoji: '⛵', text: 'Qu’est-ce qui fait avancer le voilier ?', answer: 'vent' },
  { emoji: '🪁', text: 'Qu’est-ce qui fait voler le cerf-volant ?', answer: 'vent' },
  { emoji: null, text: 'Qu’est-ce qui fait tourner les ailes du moulin à vent ?', answer: 'vent' },
  // la lampe solaire marche à l'électricité fabriquée avec le soleil, le linge sèche au soleil et au
  // vent : la réponse qui irait aussi n'est jamais proposée
  { emoji: null, text: 'Qu’est-ce qui fait marcher la lampe solaire du jardin ?', answer: 'soleil', also: 'electricite' },
  { emoji: '👕', text: 'Qu’est-ce qui fait sécher le linge dehors ?', answer: 'soleil', also: 'vent' },
];

function energy(rng) {
  const item = pick(rng, ENERGY_USES);
  const others = sample(rng, ENERGY_ORDER.filter((e) => e !== item.answer && e !== item.also), 2);
  const options = ENERGY_ORDER.filter((e) => e === item.answer || others.includes(e));
  return {
    key: `objets:energie:${item.text}:${options.join(',')}`,
    text: item.text,
    instruction: [item.text, `${capitalize(spokenList(options.map((e) => ENERGIES[e].spoken)))} ?`],
    stage: item.emoji ? { type: 'picture', emoji: item.emoji } : { type: 'none' },
    choices: options.map((e) => ({ value: e, label: ENERGIES[e].label })),
    choiceStyle: 'answers',
    answer: item.answer,
    success: { speak: ENERGIES[item.answer].says },
  };
}

// ---------------------------------------------------------------- 6. La balance et le levier

// Des objets bien plus lourds ou bien plus légers les uns que les autres (poids en gros : 1 très léger,
// 7 très lourd) ; on ne compare que deux objets qui ont au moins 3 d'écart.
export const WEIGHTS = [
  { emoji: '🪶', name: 'la plume', w: 1 }, { emoji: '🍒', name: 'la cerise', w: 1 }, { emoji: '🍓', name: 'la fraise', w: 1 },
  { emoji: '🎈', name: 'le ballon de baudruche', w: 1 }, { emoji: '🍂', name: 'la feuille morte', w: 1 },
  { emoji: '🍎', name: 'la pomme', w: 3 }, { emoji: '📕', name: 'le livre', w: 4 },
  { emoji: '🍍', name: 'l’ananas', w: 5 }, { emoji: '🍉', name: 'la pastèque', w: 6 }, { emoji: '🧱', name: 'la brique', w: 6 },
  { emoji: '🎃', name: 'la citrouille', w: 6 }, { emoji: '🎳', name: 'la boule de bowling', w: 7 },
];

function balanceQuestion(rng) {
  const a = pick(rng, WEIGHTS);
  const b = pick(rng, WEIGHTS.filter((o) => Math.abs(o.w - a.w) >= 3));
  const [left, right] = rng() < 0.5 ? [a, b] : [b, a];
  const heavy = left.w > right.w ? left : right;
  const askHeavy = rng() < 0.6;
  const answer = askHeavy ? heavy : heavy === left ? right : left;
  return {
    key: `objets:balance:${askHeavy}:${left.name}:${right.name}`,
    text: askHeavy ? 'Quel objet est le plus lourd ?' : 'Quel objet est le plus léger ?',
    instruction: askHeavy ? 'Quel objet est le plus lourd ?' : 'Quel objet est le plus léger ?',
    stage: { type: 'balance', left: left.emoji, right: right.emoji, heavier: heavy === left ? 'left' : 'right' },
    choices: pictureChoices([left, right]),
    choiceStyle: 'pictures',
    answer: answer.name,
    success: { speak: askHeavy ? 'Oui : le côté le plus lourd descend.' : 'Oui : le côté le plus léger monte.' },
  };
}

export const LEVER_SAYS = {
  appui: 'Oui : plus on appuie loin de la cale, plus c’est facile.',
  cale: 'Oui : plus la cale est près du rocher, plus c’est facile.',
};

function lever(rng) {
  const mode = rng() < 0.5 ? 'appui' : 'cale';
  const mirror = rng() < 0.5;
  // appui : le plus loin de la cale ; cale : le plus près du rocher. Les lettres vont de gauche à droite.
  const answer = (mode === 'appui') === mirror ? 'A' : 'C';
  const text = mode === 'appui'
    ? 'Où faut-il appuyer pour soulever le rocher le plus facilement ?'
    : 'Où faut-il mettre la cale pour soulever le rocher le plus facilement ?';
  return {
    key: `objets:levier:${mode}:${mirror}`,
    text,
    instruction: [text, 'A, B ou C ?'],
    stage: drawing({ kind: 'levier', mode, mirror },
      mode === 'appui'
        ? `Un levier : un rocher au bout d’une planche posée sur une cale, trois endroits où appuyer, A, B et C.`
        : `Un levier : un rocher au bout d’une planche, trois places pour la cale, A, B et C.`),
    choices: textChoices(['A', 'B', 'C']),
    choiceStyle: 'answers',
    answer,
    success: { speak: LEVER_SAYS[mode] },
  };
}

const balanceOrLever = (rng) => (rng() < 0.5 ? balanceQuestion(rng) : lever(rng));

// ---------------------------------------------------------------- 7. Quel matériau choisir ?

// Chaque besoin, le bon matériau, deux matériaux qui ne conviennent pas du tout (et pourquoi).
// Les matériaux proposés sont toujours dans le même ordre (celui de MATTERS) : la phrase lue est fixe.
export const MATTERS = ['bois', 'métal', 'plastique', 'verre', 'papier', 'carton', 'laine', 'tissu', 'caoutchouc'];
export const CHOOSE = [
  { emoji: '🧥', text: 'Pour un manteau de pluie, quelle matière choisis-tu ?', answer: 'plastique', others: ['papier', 'laine'], why: 'Le plastique ne laisse pas passer l’eau.' },
  { emoji: '🪟', text: 'Pour une vitre, quelle matière choisis-tu ?', answer: 'verre', others: ['bois', 'métal'], why: 'Le verre est transparent : on voit à travers.' },
  { emoji: '🍲', text: 'Pour une casserole qui va sur le feu, quelle matière choisis-tu ?', answer: 'métal', others: ['plastique', 'papier'], why: 'Le métal ne brûle pas et ne fond pas sur le feu.' },
  { emoji: '❄️', text: 'Pour un bonnet bien chaud, quelle matière choisis-tu ?', answer: 'laine', others: ['métal', 'verre'], why: 'La laine garde la chaleur.' },
  { emoji: '🏀', text: 'Pour un ballon qui rebondit, quelle matière choisis-tu ?', answer: 'caoutchouc', others: ['bois', 'verre'], why: 'Le caoutchouc est souple et il rebondit.' },
  { emoji: '🌧️', text: 'Pour des bottes qui ne prennent pas l’eau, quelle matière choisis-tu ?', answer: 'caoutchouc', others: ['carton', 'tissu'], why: 'Le caoutchouc ne laisse pas passer l’eau.' },
  { emoji: '🌳', text: 'Pour une cabane dans un arbre, quelle matière choisis-tu ?', answer: 'bois', others: ['verre', 'papier'], why: 'Le bois est solide et facile à clouer.' },
  { emoji: '🔑', text: 'Pour une clé très solide, quelle matière choisis-tu ?', answer: 'métal', others: ['papier', 'laine'], why: 'Le métal est dur et solide.' },
  { emoji: '🍳', text: 'Pour un manche de casserole qui ne brûle pas les doigts, quelle matière choisis-tu ?', answer: 'bois', others: ['métal', 'verre'], why: 'Le bois ne devient pas brûlant.' },
];

function chooseMatter(rng) {
  const item = pick(rng, CHOOSE);
  const options = MATTERS.filter((m) => m === item.answer || item.others.includes(m));
  return {
    key: `objets:materiau:${item.text}`,
    text: item.text,
    instruction: [item.text, `${capitalize(spokenList(options.map((m) => `en ${m}`)))} ?`],
    stage: { type: 'picture', emoji: item.emoji },
    choices: textChoices(options),
    choiceStyle: 'words',
    answer: item.answer,
    success: { speak: [`Oui, en ${item.answer}.`, item.why] },
  };
}

// ---------------------------------------------------------------- 8. La poulie et la grue

export const LIFTING = [
  { emoji: '🏗️', text: 'À quoi sert une grue ?', answer: 'à soulever', others: ['à creuser', 'à arroser'], says: 'La grue soulève les charges très lourdes sur le chantier.' },
  { emoji: '👷', text: 'Sur le chantier, qu’est-ce qui monte les poutres tout en haut ?', answer: 'la grue', others: ['le vélo', 'la brouette'], says: 'La grue monte les poutres tout en haut.' },
  { emoji: '🪣', text: 'Pour remonter le seau du puits, on utilise…', answer: 'une poulie', others: ['un aimant', 'une loupe'], says: 'La corde passe sur la poulie : on tire, le seau monte.' },
  { emoji: '🚩', text: 'Pour monter le drapeau en haut du mât, on utilise…', answer: 'une poulie', others: ['un aimant', 'une pile'], says: 'La corde passe sur une poulie, en haut du mât.' },
  { emoji: null, text: 'Une poulie, c’est…', answer: 'une roue', others: ['une pile', 'un aimant'], says: 'Une poulie est une roue : une corde passe dessus.' },
];

function pulley(rng) {
  if (rng() < 0.4) {
    const item = pick(rng, LIFTING);
    return answerQuestion({
      key: `objets:grue:${item.text}`,
      text: item.text,
      stage: item.emoji ? { type: 'picture', emoji: item.emoji } : { type: 'none' },
      answer: item.answer,
      others: item.others,
      success: item.says,
      rng,
    });
  }
  // la corde passe sur la poulie : on tire vers le bas, le seau monte
  const pull = rng() < 0.6 ? 'bas' : 'haut';
  const ask = pull === 'bas' ? 'On tire la corde vers le bas. Que fait le seau ?' : 'On laisse remonter la corde. Que fait le seau ?';
  return twoWay({
    key: `objets:poulie:${pull}`,
    text: ask,
    instruction: [...ask.split(/(?<=\.) /), 'Il monte ou il descend ?'],
    stage: drawing({ kind: 'poulie', pull },
      `Une poulie : à gauche, un seau ; à droite, une main tire la corde vers ${pull === 'bas' ? 'le bas' : 'le haut'}.`),
    options: ['il monte', 'il descend'],
    answer: pull === 'bas' ? 'il monte' : 'il descend',
    success: pull === 'bas' ? 'Oui : on tire vers le bas, le seau monte.' : 'Oui : la corde remonte, le seau descend.',
  });
}

// ---------------------------------------------------------------- 9. Les engrenages

const ROTATIONS = [true, false].map((clockwise) => ({
  value: clockwise ? 'horaire' : 'inverse',
  drawing: { kind: 'rotation', clockwise },
  name: clockwise ? 'dans le sens des aiguilles d’une montre' : 'dans le sens inverse des aiguilles d’une montre',
}));

function gears(rng) {
  const count = rng() < 0.4 ? 2 : 3;
  const clockwise = rng() < 0.5;
  const stage = drawing({ kind: 'engrenages', count, clockwise },
    `${count === 2 ? 'Deux' : 'Trois'} roues dentées qui se touchent : ${count === 2 ? 'A et B' : 'A, B et C'}. La flèche montre que la roue A tourne ${ROTATIONS[clockwise ? 0 : 1].name}.`);
  const first = 'La roue A tourne dans le sens de la flèche.';
  if (count === 3 && rng() < 0.4) {
    // A et B se touchent (sens contraire) ; A et C tournent dans le même sens
    const other = rng() < 0.5 ? 'B' : 'C';
    const ask = `Les roues A et ${other} tournent-elles dans le même sens ?`;
    return twoWay({
      key: `objets:engrenages:meme:${other}:${clockwise}`,
      text: ask,
      stage,
      options: YES_NO,
      answer: other === 'C' ? 'oui' : 'non',
      success: other === 'C' ? 'Oui : B tourne à l’envers de A, et C à l’envers de B.' : 'Non : deux roues dentées qui se touchent tournent en sens contraire.',
    });
  }
  const wheel = count === 2 ? 'B' : pick(rng, ['B', 'C']);
  const ask = `Dans quel sens tourne la roue ${wheel} ?`;
  const same = wheel === 'C';
  return {
    key: `objets:engrenages:${count}:${wheel}:${clockwise}`,
    text: `${first} ${ask}`,
    instruction: [first, ask],
    stage,
    choices: ROTATIONS,
    choiceStyle: 'drawings',
    answer: (clockwise === same) ? 'horaire' : 'inverse',
    success: { speak: same ? 'Oui : la roue C tourne dans le même sens que la roue A.' : 'Oui : deux roues dentées qui se touchent tournent en sens contraire.' },
  };
}

// ---------------------------------------------------------------- Le jeu

const OBJETS_LEVELS = [uses, rolls, thenAndNow, buildOrder, energy, balanceOrLever, chooseMatter, pulley, gears];

export const objets = {
  id: 'objets',
  domain: 'sciences',
  title: 'Objets et machines',
  icon: '⚙️',
  skill: 'Découvrir les objets : leur usage, la roue, le levier, la poulie, les engrenages, les matériaux, l’énergie',
  levels: [
    'À quoi ça sert ?', 'Qu’est-ce qui roule ?', 'Avant et aujourd’hui', 'Monter un objet', 'Quelle énergie ?',
    'La balance et le levier', 'Quel matériau choisir ?', 'La poulie et la grue', 'Les engrenages', 'Tous les objets',
  ],
  generate(level, rng) {
    const make = level >= 10 ? pick(rng, OBJETS_LEVELS.slice(1)) : OBJETS_LEVELS[level - 1];
    return make(rng);
  },
};

export const TECHNO_GAMES = [electricite, objets];
