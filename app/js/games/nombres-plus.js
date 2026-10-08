// Nombres et calcul, pour aller plus loin : la droite numérique et les fractions (programmes 2024).
// Les jeux renvoient des données pures ; les dessins (SVG, en texte) sont fabriqués ici aussi, sans
// DOM, pour être testés : render.js et main.js les insèrent dans la page.
//
// - « La droite numérique » : lire le nombre montré par une flèche (choix multiple) ou placer un
//   nombre en touchant la droite (interaction « numberline » : la flèche se cale sur la graduation
//   la plus proche, ou au plus près pour « à peu près »).
// - « Les fractions » : parts égales, moitié, tiers, quart, quelle fraction est coloriée, la moitié
//   et le quart d'une quantité, comparer. Colorier des parts : interaction « shade ».

import { pick, randInt, shuffle } from '../random.js';
import { numberChoices } from './helpers.js';

// ---------------------------------------------------------------- La droite : géométrie

/** Dimensions du dessin de la droite (unités du viewBox). */
export const NL = { width: 340, height: 100, x0: 24, x1: 316, y: 58 };

/** Abscisse (dans le viewBox) du nombre v sur la droite. */
export function lineX(stage, v) {
  return NL.x0 + ((v - stage.min) / (stage.max - stage.min)) * (NL.x1 - NL.x0);
}

/** Le nombre désigné par un doigt posé en x (viewBox), calé de `snap` en `snap`, sans sortir de la droite. */
export function lineValueAt(stage, x, snap = stage.snap) {
  const raw = stage.min + ((x - NL.x0) / (NL.x1 - NL.x0)) * (stage.max - stage.min);
  const snapped = stage.min + Math.round((raw - stage.min) / snap) * snap;
  return Math.min(stage.max, Math.max(stage.min, snapped));
}

/** La flèche vers le bas, posée au-dessus de la graduation (dessinée en x = 0, déplacée ensuite). */
function arrowMarkup(cls, x) {
  const { y } = NL;
  return `<g class="${cls}" transform="translate(${x.toFixed(2)} 0)">`
    + `<rect x="-3.5" y="${y - 46}" width="7" height="18" rx="2"/>`
    + `<polygon points="0,${y - 11} -10,${y - 30} 10,${y - 30}"/></g>`;
}

/** Le nombre écrit dans une case sous la droite (« ? » à trouver, ou réponse révélée). */
function boxMarkup(cls, x, text) {
  const { y } = NL;
  const w = Math.max(26, String(text).length * 10 + 10);
  return `<g class="${cls}" transform="translate(${x.toFixed(2)} 0)">`
    + `<rect x="${-w / 2}" y="${y + 14}" width="${w}" height="24" rx="6"/>`
    + `<text x="0" y="${y + 31}">${text}</text></g>`;
}

/**
 * La droite graduée en SVG (texte). stage : { min, max, ticks, labels, major, mark?, frog? }.
 * Options pour placer un nombre : `place` ajoute la flèche à déplacer (cachée au départ), les
 * pointillés de l'indice et la case de la réponse (cachés aussi) en `target`.
 */
export function numberLineSvg(stage, { place = false, target = null } = {}) {
  const { x0, x1, y } = NL;
  const labels = new Set(stage.labels);
  const major = new Set([...stage.major, ...stage.labels]);
  const ticks = stage.ticks.map((v) => {
    const x = lineX(stage, v).toFixed(2);
    const h = major.has(v) ? 11 : 7;
    return `<line class="nl-tick${major.has(v) ? ' major' : ''}" x1="${x}" y1="${y - h}" x2="${x}" y2="${y + h}"/>`;
  }).join('');
  const texts = stage.ticks.filter((v) => labels.has(v) && v !== stage.mark)
    .map((v) => `<text class="nl-label" x="${lineX(stage, v).toFixed(2)}" y="${y + 31}">${v}</text>`).join('');
  const parts = [
    `<line class="nl-axis" x1="${x0 - 12}" y1="${y}" x2="${x1 + 12}" y2="${y}"/>`,
    `<polygon class="nl-axis-head" points="${x1 + 22},${y} ${x1 + 10},${y - 7} ${x1 + 10},${y + 7}"/>`,
    ticks,
    texts,
  ];
  if (stage.mark !== undefined) parts.push(arrowMarkup('nl-mark', lineX(stage, stage.mark)), boxMarkup('nl-ask', lineX(stage, stage.mark), '?'));
  if (stage.frog !== undefined) parts.push(`<text class="nl-frog" x="${lineX(stage, stage.frog).toFixed(2)}" y="${y - 16}">🐸</text>`);
  if (place) {
    parts.push(arrowMarkup('nl-ghost', lineX(stage, target)), boxMarkup('nl-reveal', lineX(stage, target), target),
      arrowMarkup('nl-cursor', x0));
  }
  return `<svg class="nl-svg" viewBox="0 0 ${NL.width} ${NL.height}" aria-hidden="true">${parts.join('')}</svg>`;
}

// ---------------------------------------------------------------- La droite : le jeu

const range = (a, b, step) => Array.from({ length: Math.round((b - a) / step) + 1 }, (_, i) => a + i * step);

/** Une droite : graduations de `step` en `step`, nombres écrits (`labels`), graduations longues (`major`). */
function line(min, max, step, labels, major = []) {
  return { type: 'numberline', min, max, ticks: range(min, max, step), labels, major, snap: step };
}

// Niveaux : lire (flèche, choix multiple) et placer (toucher la droite). « both » : l'un ou l'autre.
const LINE_LEVELS = [
  'Lire de 0 à 10', 'Placer de 0 à 10', 'De 0 à 20, des repères', 'De 0 à 100, de 10 en 10',
  'Entre deux dizaines', 'De 40 à 60…', 'De 0 à 1000, de 100 en 100', 'Placer à peu près',
  'Le milieu, les bonds', 'Mélange',
];

/** La droite et les nombres à trouver de chaque niveau (2 à 7). */
function lineFor(level, rng) {
  switch (level) {
    case 1:
    case 2:
      return { stage: line(0, 10, 1, range(0, 10, 1)), targets: level === 1 ? range(1, 9, 1) : range(0, 10, 1) };
    case 3:
      return { stage: line(0, 20, 1, [0, 5, 10, 15, 20]), targets: range(1, 19, 1).filter((n) => n % 5) };
    case 4:
      return { stage: line(0, 100, 10, [0, 50, 100]), targets: [10, 20, 30, 40, 60, 70, 80, 90] };
    case 5: {
      // un morceau de la droite, d'une dizaine à la suivante : 37 est entre 30 et 40
      const d = 10 * randInt(rng, 0, 9);
      return { stage: line(d, d + 10, 1, [d, d + 10], [d + 5]), targets: range(d + 1, d + 9, 1) };
    }
    case 6: {
      // une droite qui ne commence pas à 0
      const a = 10 * randInt(rng, 2, 7);
      return { stage: line(a, a + 20, 1, [a, a + 10, a + 20], [a + 5, a + 15]), targets: range(a + 1, a + 19, 1).filter((n) => n % 10) };
    }
    default:
      return { stage: line(0, 1000, 100, [0, 500, 1000]), targets: [100, 200, 300, 400, 600, 700, 800, 900] };
  }
}

/**
 * Les choix pour lire la droite : les graduations voisines de la bonne, de préférence celles dont
 * le nombre n'est pas écrit (« 50 » est écrit sous la droite : ce serait un choix pour rien).
 */
export function readChoices(rng, stage, n, count) {
  const labels = new Set(stage.labels);
  const near = stage.ticks.filter((v) => v !== n)
    .sort((a, b) => (labels.has(a) - labels.has(b)) || (Math.abs(a - n) - Math.abs(b - n)));
  return shuffle(rng, [n, ...shuffle(rng, near.slice(0, count)).slice(0, count - 1)]);
}

/** Lire : la flèche montre une graduation (sans nombre écrit), le « ? » est dessous. */
function readQuestion(level, rng, stage, n) {
  const count = level === 1 ? 3 : 4;
  return {
    key: `droite-numerique:${level}:lire:${stage.min}-${stage.max}:${n}`,
    text: 'Quel nombre montre la flèche ?',
    instruction: 'Quel nombre montre la flèche ? Aide-toi des nombres écrits sur la droite.',
    short: { key: 'droite-numerique:lire', text: 'Quel nombre montre la flèche ?' },
    stage: { ...stage, mark: n },
    choices: readChoices(rng, stage, n, count).map((v) => ({ value: v, label: String(v) })),
    choiceStyle: 'numbers',
    answer: n,
    success: { speak: `La flèche montre ${n}.` },
  };
}

/** Placer : toucher (ou glisser) sur la droite, puis « C'est ici ». tolerance : écart accepté. */
function placeQuestion(level, stage, n, { tolerance = 0, text, instruction, short, success, key } = {}) {
  return {
    key: key || `droite-numerique:${level}:placer:${stage.min}-${stage.max}:${n}`,
    interaction: 'numberline',
    text: text || `Place ${n} sur la droite.`,
    instruction: instruction || `Où est le nombre ${n} ? Touche la droite pour placer la flèche, puis appuie sur « C’est ici ».`,
    ...(short === null ? {} : { short: short || { key: 'droite-numerique:placer', text: `Place ${n} sur la droite.`, speak: `Place le nombre ${n}.` } }),
    stage,
    target: n,
    tolerance,
    answer: n,
    choices: [],
    success: { speak: success || `Le nombre ${n} est bien ici.` },
  };
}

/** Niveau 8 : placer à peu près, avec seulement le début, le milieu et la fin de la droite. */
function aboutQuestion(rng) {
  const big = rng() < 0.4;
  const max = big ? 1000 : 100;
  const unit = max / 100; // la flèche se déplace de 1 en 1 (ou de 10 en 10 jusqu'à 1000)
  const n = unit * pick(rng, [10, 15, 20, 25, 30, 35, 40, 45, 55, 60, 65, 70, 75, 80, 85, 90]);
  const stage = { type: 'numberline', min: 0, max, ticks: [0, max / 2, max], labels: [0, max / 2, max], major: [], snap: unit };
  return placeQuestion(8, stage, n, {
    tolerance: 6 * unit,
    key: `droite-numerique:8:environ:${max}:${n}`,
    text: `Place ${n} à peu près.`,
    instruction: `Place le nombre ${n} à peu près au bon endroit. Regarde bien 0, ${max / 2} et ${max}.`,
    short: { key: 'droite-numerique:environ', text: `Place ${n} à peu près.`, speak: `Place ${n} à peu près.` },
    success: `Le nombre ${n} est exactement ici.`,
  });
}

// Niveau 9 : le nombre au milieu de deux nombres (la flèche est au milieu, sans autre graduation).
const MIDDLES = [[0, 10], [10, 20], [20, 30], [0, 20], [20, 40], [40, 60], [60, 80], [0, 100], [100, 200], [200, 400], [300, 500]];

function middleQuestion(rng) {
  const [a, b] = pick(rng, MIDDLES);
  const mid = (a + b) / 2;
  const stage = { type: 'numberline', min: a, max: b, ticks: [a, mid, b], labels: [a, b], major: [], snap: mid - a, mark: mid };
  return {
    key: `droite-numerique:9:milieu:${a}-${b}`,
    text: `Quel nombre est au milieu de ${a} et ${b} ?`,
    instruction: `Quel nombre est au milieu de ${a} et ${b} ? La flèche est juste au milieu.`,
    stage,
    choices: numberChoices(rng, mid, 4, a + 1, b - 1, (b - a) / 10).map((v) => ({ value: v, label: String(v) })),
    choiceStyle: 'numbers',
    answer: mid,
    success: { speak: `${mid} est au milieu de ${a} et ${b}.` },
  };
}

/** Niveau 9 : la grenouille part d'un nombre et fait des bonds ; où arrive-t-elle ? */
function jumpQuestion(rng) {
  const big = rng() < 0.5;
  const stage = big ? line(0, 100, 10, [0, 50, 100]) : line(0, 20, 1, [0, 5, 10, 15, 20]);
  const size = big ? 10 : pick(rng, [2, 5]);
  const count = big ? randInt(rng, 2, 4) : size === 2 ? randInt(rng, 2, 4) : 2;
  const start = big ? 10 * randInt(rng, 0, 10 - count) : randInt(rng, 0, 20 - size * count);
  const end = start + size * count;
  const text = `La grenouille part de ${start} et fait ${count} bonds de ${size}. Où arrive-t-elle ?`;
  return placeQuestion(9, { ...stage, frog: start }, end, {
    key: `droite-numerique:9:bonds:${start}:${count}x${size}`,
    text,
    instruction: `${text} Touche la droite, puis appuie sur « C’est ici ».`,
    short: null,
    success: `${count} bonds de ${size}, c’est ${size * count}. La grenouille arrive à ${end}.`,
  });
}

export const droiteNumerique = {
  id: 'droite-numerique',
  domain: 'maths',
  section: 'Nombres et calcul',
  title: 'La droite numérique',
  icon: '📏',
  skill: 'Lire et placer des nombres sur une droite graduée',
  levels: LINE_LEVELS,
  generate(level, rng, index = 0) {
    if (level === 10) return droiteNumerique.generate(randInt(rng, 3, 9), rng, index);
    if (level === 8) return aboutQuestion(rng);
    if (level === 9) return index % 2 ? jumpQuestion(rng) : middleQuestion(rng);
    const { stage, targets } = lineFor(level, rng);
    const n = pick(rng, targets);
    // niveaux 3, 4, 6 et 7 : on lit et on place à tour de rôle
    const read = level === 1 || ([3, 4, 6, 7].includes(level) && index % 2 === 1);
    return read ? readQuestion(level, rng, stage, n) : placeQuestion(level, stage, n);
  },
};

// ---------------------------------------------------------------- Les fractions : dessins

// Comment on dit et on écrit chaque fraction (la voix dit toujours les mots, jamais « 1/4 »).
export const FRACTIONS = {
  '1/2': { n: 1, d: 2, words: 'un demi', the: 'la moitié', fem: true },
  '1/3': { n: 1, d: 3, words: 'un tiers', the: 'le tiers' },
  '1/4': { n: 1, d: 4, words: 'un quart', the: 'le quart' },
  '2/3': { n: 2, d: 3, words: 'deux tiers', the: 'les deux tiers', plural: true },
  '2/4': { n: 2, d: 4, words: 'deux quarts', the: 'les deux quarts', plural: true },
  '3/4': { n: 3, d: 4, words: 'trois quarts', the: 'les trois quarts', plural: true },
};

// Couleurs : la part coloriée porte toujours des rayures (le motif dit « coloriée », pas la couleur seule).
const LOOK = {
  disc: { base: '#ffe08a', edge: '#8a4b14', crust: '#c9772b', fill: '#e4572e', stripe: '#a8321a' },
  bar: { base: '#f3e2c7', edge: '#5c3317', crust: '#5c3317', fill: '#9a5b2c', stripe: '#5c3317' },
};
const NOUN = { disc: 'pizza', bar: 'tablette' };

/** Les parts d'une pizza : secteurs proportionnels à `sizes`, en partant de `rotate` degrés (0 = en haut). */
function discParts(sizes, rotate = 0) {
  const total = sizes.reduce((a, b) => a + b, 0);
  const R = 44;
  const at = (deg) => {
    const a = (deg * Math.PI) / 180;
    return `${(R * Math.sin(a)).toFixed(2)} ${(-R * Math.cos(a)).toFixed(2)}`;
  };
  let angle = rotate;
  return sizes.map((s) => {
    const sweep = (360 * s) / total;
    const d = `M0 0 L${at(angle)} A${R} ${R} 0 ${sweep > 180 ? 1 : 0} 1 ${at(angle + sweep)} Z`;
    angle += sweep;
    return d;
  });
}

/**
 * Une pizza (disque) ou une tablette (rectangle de carrés) coupée en parts, en SVG (texte).
 * stage : { shape: 'disc' | 'bar', sizes: [taille de chaque part], shaded: [parts coloriées], rotate?, rows? }.
 * Pour la tablette, chaque part fait `sizes[i]` colonnes de `rows` carrés. Les parts portent data-part.
 */
export function fractionSvg(stage, uid) {
  const look = LOOK[stage.shape];
  const shaded = new Set(stage.shaded);
  const pattern = `fr-${uid}`;
  const defs = `<defs><pattern id="${pattern}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">`
    + `<rect width="7" height="7" fill="${look.fill}"/><rect width="2.6" height="7" fill="${look.stripe}"/></pattern></defs>`;
  const fill = (i) => (shaded.has(i) ? `url(#${pattern})` : look.base);
  const cls = (i) => `fr-part${shaded.has(i) ? ' on' : ''}`;
  if (stage.shape === 'disc') {
    const parts = discParts(stage.sizes, stage.rotate || 0)
      .map((d, i) => `<path class="${cls(i)}" data-part="${i}" d="${d}" fill="${fill(i)}" stroke="${look.edge}" stroke-width="1.6" stroke-linejoin="round"/>`).join('');
    return `<svg class="fraction-svg" viewBox="-50 -50 100 100" data-pattern="${pattern}" data-base="${look.base}" aria-hidden="true">${defs}${parts}`
      + `<circle r="44" fill="none" stroke="${look.crust}" stroke-width="4.5" pointer-events="none"/></svg>`;
  }
  const rows = stage.rows || 2;
  const C = 20;
  const cols = stage.sizes.reduce((a, b) => a + b, 0);
  let x = 0;
  const parts = [];
  const grid = [];
  stage.sizes.forEach((s, i) => {
    parts.push(`<rect class="${cls(i)}" data-part="${i}" x="${x * C}" y="0" width="${s * C}" height="${rows * C}" fill="${fill(i)}"/>`);
    // les carrés de la tablette (traits fins), puis le bord de la part (trait épais)
    for (let c = 1; c < s; c++) grid.push(`<line x1="${(x + c) * C}" y1="0" x2="${(x + c) * C}" y2="${rows * C}"/>`);
    for (let r = 1; r < rows; r++) grid.push(`<line x1="${x * C}" y1="${r * C}" x2="${(x + s) * C}" y2="${r * C}"/>`);
    x += s;
    if (i < stage.sizes.length - 1) grid.push(`<line class="fr-cut" x1="${x * C}" y1="0" x2="${x * C}" y2="${rows * C}"/>`);
  });
  return `<svg class="fraction-svg" viewBox="-3 -3 ${cols * C + 6} ${rows * C + 6}" data-pattern="${pattern}" data-base="${look.base}" aria-hidden="true">${defs}`
    + `${parts.join('')}<g class="fr-grid" stroke="${look.edge}" stroke-width="0.8" pointer-events="none">${grid.join('')}</g>`
    + `<rect x="0" y="0" width="${cols * C}" height="${rows * C}" rx="2" fill="none" stroke="${look.crust}" stroke-width="2.4" pointer-events="none"/></svg>`;
}

/** La part coloriée de l'ensemble, en fraction de l'aire (0 à 1). */
export function shadedArea({ sizes, shaded }) {
  const total = sizes.reduce((a, b) => a + b, 0);
  return shaded.reduce((sum, i) => sum + sizes[i], 0) / total;
}

/** Des parts toutes égales ? */
export function equalParts({ sizes }) {
  return sizes.every((s) => s === sizes[0]);
}

/** Description d'un dessin, pour les lecteurs d'écran. */
function describe(st) {
  const n = st.sizes.length;
  const noun = st.shape === 'disc' ? 'Une pizza' : 'Une tablette';
  return `${noun} coupée en ${n} parts${equalParts(st) ? ' égales' : ''}, ${st.shaded.length} coloriée${st.shaded.length > 1 ? 's' : ''}`;
}

// ---------------------------------------------------------------- Les fractions : le jeu

const FRACTION_LEVELS = [
  'Parts égales ou pas ?', 'La moitié', 'Le quart', 'Le tiers', 'Quelle fraction ?',
  'Deux quarts, trois quarts…', 'La moitié de 8 bonbons', 'Le quart d’une quantité', 'La plus grande part',
  'Mélange',
];

// Parts inégales : aucune part, ni aucune réunion de parts dessinée, ne fait la fraction demandée.
const UNEQUAL = { 2: [[1, 2], [1, 3], [2, 5]], 3: [[1, 2, 4], [2, 3, 5], [1, 1, 3]], 4: [[1, 2, 3, 4], [1, 2, 2, 5], [1, 1, 2, 5]] };
// Tablettes inégales (en colonnes de carrés)
const UNEQUAL_BAR = { 2: [[1, 2], [1, 3], [2, 3]], 3: [[1, 1, 3], [1, 2, 4], [1, 1, 4]], 4: [[1, 1, 2, 3], [1, 1, 1, 3], [1, 1, 3, 4]] };

/** Une pizza ou une tablette coupée en `d` parts égales ; `width` colonnes par part pour la tablette. */
function equalShape(rng, shape, d) {
  if (shape === 'disc') return { shape, sizes: Array(d).fill(1), rotate: pick(rng, [0, 0, 15, 30, 45, 90]) };
  const width = d <= 2 ? randInt(rng, 1, 3) : d <= 4 ? randInt(rng, 1, 2) : 1;
  return { shape, sizes: Array(d).fill(width), rows: 2 };
}

function unequalShape(rng, shape, d) {
  if (shape === 'disc') return { shape, sizes: shuffle(rng, pick(rng, UNEQUAL[d])), rotate: pick(rng, [0, 20, 45, 90]) };
  return { shape, sizes: shuffle(rng, pick(rng, UNEQUAL_BAR[d])), rows: 2 };
}

/** k parts coloriées, côte à côte, à partir d'une part au hasard. */
function shadeRun(rng, d, k) {
  const first = randInt(rng, 0, d - 1);
  return Array.from({ length: k }, (_, i) => (first + i) % d).sort((a, b) => a - b);
}

const pictureChoice = (st) => ({ value: `${st.sizes.join('-')}:${st.shaded.join('-')}:${st.rotate || 0}`, fraction: st, name: describe(st) });
const fracChoice = (f) => ({ value: f, label: f, frac: FRACTIONS[f], name: FRACTIONS[f].words });

/** Niveau 1 : touche celle coupée en 2 parts égales, ou « les 2 parts sont-elles égales ? ». */
function equalQuestion(rng, index) {
  const shape = pick(rng, ['disc', 'bar']);
  const noun = NOUN[shape];
  if (index % 2) {
    const equal = rng() < 0.5;
    const st = { ...(equal ? equalShape(rng, shape, 2) : unequalShape(rng, shape, 2)), shaded: [] };
    return {
      key: `fractions:1:oui-non:${shape}:${st.sizes.join('-')}:${st.rotate || 0}`,
      text: 'Les 2 parts sont-elles égales ?',
      instruction: `Regarde la ${noun}. Les 2 parts sont-elles égales ?`,
      stage: { type: 'fraction', ...st },
      choices: [{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }],
      choiceStyle: 'words',
      answer: equal ? 'oui' : 'non',
      success: { speak: equal ? 'Oui, les 2 parts ont la même taille.' : 'Non, une part est plus grande que l’autre.' },
    };
  }
  const good = { ...equalShape(rng, shape, 2), shaded: [] };
  const others = [];
  for (const sizes of shuffle(rng, shape === 'disc' ? UNEQUAL[2] : UNEQUAL_BAR[2]).slice(0, 2)) {
    others.push({ shape, sizes: rng() < 0.5 ? sizes : [...sizes].reverse(), rotate: shape === 'disc' ? pick(rng, [0, 30, 90]) : 0, rows: 2, shaded: [] });
  }
  const text = `Touche la ${noun} coupée en 2 parts égales.`;
  const choices = shuffle(rng, [good, ...others]).map(pictureChoice);
  return {
    key: `fractions:1:touche:${choices.map((c) => c.value).join('|')}`,
    text,
    instruction: `${text} Les 2 parts doivent avoir la même taille.`,
    short: { key: 'fractions:egales', text },
    stage: { type: 'none' },
    choices,
    choiceStyle: 'parts',
    answer: pictureChoice(good).value,
    success: { speak: 'Les 2 parts ont la même taille.' },
  };
}

/** Les distracteurs du niveau « touche celle où la moitié (le quart, le tiers) est coloriée ». */
function wrongPictures(rng, shape, f) {
  const { d } = FRACTIONS[f];
  const list = [
    { ...unequalShape(rng, shape, d), shaded: [randInt(rng, 0, d - 1)] }, // parts pas égales : ce n'est pas une fraction
    ...[2, 3, 4].filter((n) => n !== d).map((n) => ({ ...equalShape(rng, shape, n), shaded: [randInt(rng, 0, n - 1)] })),
    { ...equalShape(rng, shape, d), shaded: shadeRun(rng, d, d - 1) }, // trop de parts coloriées
  ].filter((st) => Math.abs(shadedArea(st) - 1 / d) > 1e-9);
  // les parts inégales d'abord (le piège le plus instructif), puis deux autres au hasard
  return [list[0], ...shuffle(rng, list.slice(1)).slice(0, 1)];
}

/** Niveaux 2 à 4 (et 6) : touche le bon dessin, ou colorie toi-même la fraction. */
function unitQuestion(level, rng, index, f) {
  const shape = pick(rng, ['disc', 'bar']);
  const noun = NOUN[shape];
  const info = FRACTIONS[f];
  if (index % 2 === 0) {
    // colorier : 1 part sur 2, ou 2 parts sur 4, 3 sur 6… (des parts égales)
    const times = info.d === 2 ? pick(rng, [1, 2, 3]) : info.d === 4 && info.n === 1 ? pick(rng, [1, 2]) : info.d === 3 && info.n === 1 ? pick(rng, [1, 2]) : 1;
    const d = info.d * times;
    const k = info.n * times;
    const st = { ...equalShape(rng, shape, d), shaded: [] };
    const text = `Colorie ${info.the} de la ${noun}.`;
    return {
      key: `fractions:${level}:colorie:${f}:${shape}:${d}`,
      interaction: 'shade',
      text,
      instruction: `${text} Touche les parts à colorier, puis appuie sur « J’ai fini ».`,
      short: { key: 'fractions:colorie', text },
      stage: { type: 'fraction', ...st },
      target: k,
      answer: `${k}/${d}`,
      choices: [],
      success: { speak: `Tu as colorié ${k} part${k > 1 ? 's' : ''} sur ${d} : ${info.plural ? 'ce sont' : 'c’est'} ${info.the}.` },
    };
  }
  const good = { ...equalShape(rng, shape, info.d), shaded: shadeRun(rng, info.d, info.n) };
  const choices = shuffle(rng, [good, ...wrongPictures(rng, shape, f)]).map(pictureChoice);
  const text = `Touche la ${noun} dont ${info.the} est colorié${info.fem ? 'e' : ''}.`;
  const hint = { '1/2': 'La moitié, c’est 1 part sur 2 parts égales.', '1/3': 'Le tiers, c’est 1 part sur 3 parts égales.', '1/4': 'Le quart, c’est 1 part sur 4 parts égales.' }[f];
  return {
    key: `fractions:${level}:touche:${choices.map((c) => c.value).join('|')}`,
    text,
    instruction: `${text} ${hint}`,
    short: { key: `fractions:touche:${f}`, text },
    stage: { type: 'none' },
    choices,
    choiceStyle: 'parts',
    answer: pictureChoice(good).value,
    success: { speak: `C’est ${info.the} : 1 part sur ${info.d}.` },
  };
}

/** Niveaux 5 et 6 : quelle fraction de la pizza est coloriée ? */
function whichQuestion(level, rng, f, pool) {
  const info = FRACTIONS[f];
  const shape = pick(rng, ['disc', 'bar']);
  const st = { ...equalShape(rng, shape, info.d), shaded: shadeRun(rng, info.d, info.n) };
  // jamais « un demi » à côté de « deux quarts » : les deux seraient justes
  const others = shuffle(rng, pool.filter((g) => g !== f && !(f === '2/4' && g === '1/2') && !(f === '1/2' && g === '2/4')));
  const choices = [f, ...others.slice(0, pool.length > 3 ? 3 : 2)].sort().map(fracChoice);
  const text = `Quelle fraction de la ${NOUN[shape]} est coloriée ?`;
  return {
    key: `fractions:${level}:quelle:${f}:${shape}:${st.shaded.join('-')}:${st.sizes[0]}`,
    text,
    instruction: `${text} Compte les parts coloriées, puis toutes les parts.`,
    short: { key: 'fractions:quelle', text },
    stage: { type: 'fraction', ...st },
    choices,
    choiceStyle: 'fractions',
    answer: f,
    success: { speak: `${info.plural ? 'Ce sont' : 'C’est'} ${info.words} : ${info.n} part${info.n > 1 ? 's' : ''} coloriée${info.n > 1 ? 's' : ''} sur ${info.d}.` },
  };
}

// Niveaux 7 et 8 : la moitié, le quart d'une quantité
const THINGS = [
  { emoji: '🍬', many: 'bonbons', de: 'de bonbons' },
  { emoji: '🍓', many: 'fraises', de: 'de fraises' },
  { emoji: '🍪', many: 'biscuits', de: 'de biscuits' },
  { emoji: '🐟', many: 'poissons', de: 'de poissons' },
  { emoji: '⭐', many: 'étoiles', de: 'd’étoiles' },
  { emoji: '🎈', many: 'ballons', de: 'de ballons' },
];

function quantityQuestion(level, rng, name) {
  const quarter = level === 8;
  const thing = pick(rng, THINGS);
  const n = quarter ? 4 * randInt(rng, 1, 5) : 2 * randInt(rng, 2, 10);
  const answer = quarter ? n / 4 : n / 2;
  const text = quarter ? `Quel est le quart de ${n} ${thing.many} ?` : `Quelle est la moitié de ${n} ${thing.many} ?`;
  return {
    key: `fractions:${level}:${n}:${thing.many}`,
    text,
    instruction: `${name} partage ${n} ${thing.many} en ${quarter ? 'quatre' : 'deux'} parts égales. Combien y a-t-il ${thing.de} dans chaque part ?`,
    short: { key: `fractions:quantite:${level}`, text },
    stage: { type: 'objects', emoji: thing.emoji, count: n, perRow: n > 10 ? 10 : 5 },
    choices: numberChoices(rng, answer, 4, 1, n).map((v) => ({ value: v, label: String(v) })),
    choiceStyle: 'numbers',
    answer,
    success: {
      speak: quarter ? `Le quart de ${n}, c’est ${answer}, car 4 fois ${answer} font ${n}.` : `La moitié de ${n}, c’est ${answer}, car ${answer} plus ${answer} font ${n}.`,
    },
  };
}

/** Niveau 9 : de deux parts de la même pizza, laquelle est la plus grande (ou la plus petite) ? */
function compareQuestion(rng, index) {
  const pair = pick(rng, [['1/2', '1/4'], ['1/2', '1/3'], ['1/3', '1/4']]);
  const biggest = rng() < 0.6;
  // 1/2 > 1/3 > 1/4 : le plus grand dénominateur fait la plus petite part
  const answer = biggest ? pair[0] : pair[1];
  const adj = biggest ? 'grande' : 'petite';
  const success = { speak: `La plus ${adj} part, c’est ${FRACTIONS[answer].the}.` };
  if (index % 2) {
    const [w1, w2] = shuffle(rng, pair).map((f) => FRACTIONS[f].words);
    const text = `Quelle part est la plus ${adj} : ${w1} ou ${w2} ?`;
    return {
      key: `fractions:9:mots:${pair.join('-')}:${adj}:${w1}`,
      text,
      instruction: `${text} C’est la même pizza, coupée en parts égales.`,
      stage: { type: 'none' },
      choices: pair.map(fracChoice),
      choiceStyle: 'fractions',
      answer,
      success,
    };
  }
  // deux pizzas de la même taille (une tablette de 3 ou 4 colonnes n'aurait pas la même taille)
  const choices = shuffle(rng, pair).map((f) => {
    const st = { shape: 'disc', sizes: Array(FRACTIONS[f].d).fill(1), rotate: 0, shaded: [0] };
    return { ...pictureChoice(st), value: f, caption: FRACTIONS[f].words };
  });
  const text = `Touche la pizza où la part coloriée est la plus ${adj}.`;
  return {
    key: `fractions:9:dessins:${choices.map((c) => c.value).join('-')}:${adj}`,
    text,
    instruction: `${text} Les deux pizzas ont la même taille.`,
    short: { key: `fractions:comparer:${adj}`, text },
    stage: { type: 'none' },
    choices,
    choiceStyle: 'parts',
    answer,
    success,
  };
}

export const fractions = {
  id: 'fractions',
  domain: 'maths',
  section: 'Nombres et calcul',
  title: 'Les fractions',
  icon: '🍕',
  skill: 'Partager en parts égales : moitié, tiers, quart',
  levels: FRACTION_LEVELS,
  generate(level, rng, index = 0, context = {}) {
    const name = context.name || 'Lou';
    switch (level) {
      case 1: return equalQuestion(rng, index);
      case 2: return unitQuestion(2, rng, index, '1/2');
      case 3: return unitQuestion(3, rng, index, '1/4');
      case 4: return unitQuestion(4, rng, index, '1/3');
      case 5: return whichQuestion(5, rng, pick(rng, ['1/2', '1/3', '1/4']), ['1/2', '1/3', '1/4']);
      case 6: {
        const f = pick(rng, ['2/4', '3/4', '2/3']);
        return index % 2 ? whichQuestion(6, rng, f, ['1/4', '2/4', '3/4', '1/3', '2/3', '1/2']) : unitQuestion(6, rng, 0, f);
      }
      case 7:
      case 8: return quantityQuestion(level, rng, name);
      case 9: return compareQuestion(rng, index);
      default: return fractions.generate(randInt(rng, 2, 9), rng, index + randInt(rng, 0, 1), context);
    }
  },
};

export const NOMBRES_PLUS_GAMES = [droiteNumerique, fractions];
