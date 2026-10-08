// Jeux de logique « pour aller plus loin » (demande des parents : des jeux plus évolués) :
// le tableau logique (matrices à la Raven), les balances (déduire un poids) et le dessin
// caché (picross, ou nonogramme). Tout est décrit par des données ; les dessins sont faits
// en SVG (figureSvg, balanceSvg) par render.js, la grille du dessin caché par main.js.

import { pick, randInt, sample, shuffle } from '../random.js';
import { numberChoices } from './helpers.js';

const cap = (s) => s[0].toUpperCase() + s.slice(1);

// =====================================================================
// Le tableau logique : une grille 3 × 3 de dessins qui suivent des règles ;
// il faut trouver le dessin de la case vide.
// =====================================================================

// Chaque dessin : une forme, un nombre d'exemplaires (1 à 4), un style (couleur ET motif,
// jamais la couleur seule) et une orientation (pour la flèche qui tourne).
export const FIG_SHAPES = ['rond', 'carré', 'triangle', 'étoile', 'cœur', 'losange'];
const SHAPE_WORDS = {
  rond: { one: 'rond', many: 'ronds' },
  carré: { one: 'carré', many: 'carrés' },
  triangle: { one: 'triangle', many: 'triangles' },
  étoile: { one: 'étoile', many: 'étoiles', f: true },
  cœur: { one: 'cœur', many: 'cœurs' },
  losange: { one: 'losange', many: 'losanges' },
  flèche: { one: 'flèche', many: 'flèches', f: true },
};
// adjectifs : masculin, féminin, masculin pluriel, féminin pluriel
export const FIG_STYLES = {
  plein: { color: '#d62839', words: ['rouge', 'rouge', 'rouges', 'rouges'] },
  raye: { color: '#1d5fd1', words: ['bleu à rayures', 'bleue à rayures', 'bleus à rayures', 'bleues à rayures'] },
  pois: { color: '#1a7f3c', words: ['vert à pois', 'verte à pois', 'verts à pois', 'vertes à pois'] },
  vide: { color: '#ffffff', words: ['blanc', 'blanche', 'blancs', 'blanches'] },
};
const STYLE_IDS = Object.keys(FIG_STYLES);
const DIRECTIONS = { 0: 'le haut', 90: 'la droite', 180: 'le bas', 270: 'la gauche' };
const NUMBER_WORDS = ['', 'un', 'deux', 'trois', 'quatre'];

// Formes dans un carré de -1 à 1 (centrées), dessinées puis agrandies par figureSvg.
const UNIT_PATHS = {
  rond: 'M0 -0.95 A0.95 0.95 0 1 1 0 0.95 A0.95 0.95 0 1 1 0 -0.95 Z',
  carré: 'M-0.82 -0.82 H0.82 V0.82 H-0.82 Z',
  triangle: 'M0 -0.98 L0.98 0.78 L-0.98 0.78 Z',
  étoile: Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? 0.42 : 1;
    const a = (i * Math.PI) / 5;
    return `${i ? 'L' : 'M'}${(r * Math.sin(a)).toFixed(3)} ${(-r * Math.cos(a) + 0.08).toFixed(3)}`;
  }).join(' ').concat(' Z'),
  cœur: 'M0 0.92 C-1.25 0.05 -1.05 -0.92 -0.45 -0.92 C-0.15 -0.92 0 -0.68 0 -0.48 C0 -0.68 0.15 -0.92 0.45 -0.92 C1.05 -0.92 1.25 0.05 0 0.92 Z',
  losange: 'M0 -1 L0.72 0 L0 1 L-0.72 0 Z',
  flèche: 'M0 -1 L0.88 -0.08 L0.34 -0.08 L0.34 0.98 L-0.34 0.98 L-0.34 -0.08 L-0.88 -0.08 Z',
};
// Places des dessins dans la case (x, y, taille) selon leur nombre.
const SPOTS = {
  1: [[50, 50, 36]],
  2: [[27, 50, 20], [73, 50, 20]],
  3: [[50, 28, 19], [27, 72, 19], [73, 72, 19]],
  4: [[28, 28, 19], [72, 28, 19], [28, 72, 19], [72, 72, 19]],
};

/** Identifiant d'un dessin (sert de valeur aux réponses). */
export function figKey({ shape, n, style, rot }) {
  return `${shape}-${n}-${style}-${rot}`;
}

/** « deux étoiles rouges », « une flèche bleue à rayures qui pointe vers le haut ». */
export function describeFigure({ shape, n, style, rot }) {
  const w = SHAPE_WORDS[shape];
  const adj = FIG_STYLES[style].words[(w.f ? 1 : 0) + (n > 1 ? 2 : 0)];
  const count = n === 1 ? (w.f ? 'une' : 'un') : NUMBER_WORDS[n];
  const text = `${count} ${n > 1 ? w.many : w.one} ${adj}`;
  return shape === 'flèche' ? `${text} qui pointe vers ${DIRECTIONS[rot]}` : text;
}

/**
 * Le dessin en SVG (carré de 100). `uid` rend uniques les motifs (rayures, pois) quand
 * plusieurs dessins sont dans la même page.
 */
export function figureSvg(fig, uid = 'f') {
  const { shape, n, style, rot } = fig;
  const { color } = FIG_STYLES[style];
  const fill = style === 'raye' ? `url(#${uid}r)` : style === 'pois' ? `url(#${uid}p)` : color;
  // les motifs sont à l'échelle de la forme (même nombre de rayures quelle que soit la taille)
  const defs = style === 'raye'
    ? `<pattern id="${uid}r" patternUnits="userSpaceOnUse" width="0.46" height="0.46" patternTransform="rotate(45)"><rect width="0.46" height="0.46" fill="#fff"/><rect width="0.21" height="0.46" fill="${color}"/></pattern>`
    : style === 'pois'
      ? `<pattern id="${uid}p" patternUnits="userSpaceOnUse" width="0.5" height="0.5"><rect width="0.5" height="0.5" fill="#fff"/><circle cx="0.25" cy="0.25" r="0.13" fill="${color}"/></pattern>`
      : '';
  const items = SPOTS[n].map(([x, y, s]) => `<path d="${UNIT_PATHS[shape]}" transform="translate(${x} ${y}) scale(${s}) rotate(${rot})" fill="${fill}" stroke="#2b2d42" stroke-width="${(style === 'vide' ? 4.2 : 3) / s}" stroke-linejoin="round"/>`);
  return `<svg viewBox="0 0 100 100" aria-hidden="true">${defs ? `<defs>${defs}</defs>` : ''}${items.join('')}</svg>`;
}

// Règles possibles pour chaque caractéristique (forme, nombre, style, orientation) :
// fixed : la même partout ; row : la même sur chaque ligne, différente d'une ligne à l'autre ;
// col : pareil par colonne (le nombre qui augmente : 1, 2, 3) ; latin : chaque ligne et chaque
// colonne ont les trois mêmes valeurs, dans un autre ordre ; add : 3e case = 1re + 2e (nombre) ;
// turn : un quart de tour à chaque case (orientation).
export const MATRIX_LEVELS = [
  { label: 'Pareil sur la ligne', rules: { shape: 'row' }, choices: 4 },
  { label: 'Un de chaque par ligne', rules: { shape: 'latin' }, choices: 4 },
  { label: 'Le nombre augmente', rules: { shape: 'row', n: 'col' }, choices: 4 },
  { label: 'Couleur et motif', rules: { shape: 'row', style: 'latin' }, choices: 4 },
  { label: 'La flèche tourne', rules: { style: 'row', rot: 'turn' }, choices: 4 },
  { label: 'Deux règles à la fois', rules: { shape: 'latin', style: 'latin' }, choices: 5 },
  { label: 'On additionne', rules: { shape: 'row', n: 'add' }, choices: 5 },
  { label: 'Trois règles à la fois', rules: { shape: 'latin', style: 'latin', n: 'col' }, choices: 6 },
  { label: 'Le grand défi', rules: { shape: 'latin', style: 'latin', n: 'latin' }, choices: 6, anyGap: true },
];
const ATTRS = ['shape', 'n', 'style', 'rot'];

/** La règle de chaque caractéristique est-elle respectée par les 9 cases ? */
export function matrixHolds(cells, rules) {
  const at = (attr, r, c) => cells[r * 3 + c][attr];
  const rows = (attr) => [0, 1, 2].map((r) => [0, 1, 2].map((c) => at(attr, r, c)));
  const cols = (attr) => [0, 1, 2].map((c) => [0, 1, 2].map((r) => at(attr, r, c)));
  const same = (line) => line.every((v) => v === line[0]);
  const distinct = (line) => new Set(line).size === line.length;
  const setKey = (line) => [...line].sort().join('|');
  return ATTRS.every((attr) => {
    const rule = rules[attr] || 'fixed';
    const R = rows(attr);
    const C = cols(attr);
    switch (rule) {
      case 'fixed': return same(R.flat());
      case 'row': return R.every(same) && distinct(R.map((l) => l[0]));
      case 'col': return C.every(same) && distinct(C.map((l) => l[0]));
      case 'latin':
        // chaque ligne et chaque colonne : les trois mêmes valeurs, toutes différentes
        return [...R, ...C].every(distinct) && new Set([...R, ...C].map(setKey)).size === 1;
      case 'add': return R.every(([a, b, s]) => a + b === s);
      case 'turn': {
        const step = (R[0][1] - R[0][0] + 360) % 360;
        return (step === 90 || step === 270) && R.every((l) => (l[1] - l[0] + 360) % 360 === step && (l[2] - l[1] + 360) % 360 === step);
      }
      default: return false;
    }
  });
}

/** Les 9 cases d'un tableau qui suit les règles (tirées au hasard). */
function matrixCells(rng, rules) {
  const pickValues = {
    shape: () => sample(rng, FIG_SHAPES, 3),
    style: () => sample(rng, STYLE_IDS, 3),
    n: () => [1, 2, 3],
    rot: () => [0, 90, 180, 270],
  };
  const value = {};
  for (const attr of ATTRS) {
    const rule = rules[attr] || 'fixed';
    if (rule === 'fixed') {
      const v = attr === 'shape' ? (rules.rot ? 'flèche' : pick(rng, FIG_SHAPES))
        : attr === 'style' ? pick(rng, STYLE_IDS) : attr === 'n' ? 1 : 0;
      value[attr] = () => v;
    } else if (rule === 'row' || rule === 'col') {
      let vals = pickValues[attr]();
      if (attr === 'n') vals = rng() < 0.5 ? [1, 2, 3] : [3, 2, 1]; // le nombre augmente (ou diminue)
      else vals = shuffle(rng, vals);
      value[attr] = rule === 'row' ? (r) => vals[r] : (r, c) => vals[c];
    } else if (rule === 'latin') {
      const vals = shuffle(rng, pickValues[attr]());
      // deux caractéristiques « latines » tournent en sens contraire : toutes les paires sont différentes
      const dir = attr === 'style' ? 2 : 1;
      value[attr] = (r, c) => vals[(r + dir * c) % 3];
    } else if (rule === 'add') {
      const pairs = sample(rng, [[1, 1], [1, 2], [2, 1], [2, 2], [1, 3], [3, 1]], 3);
      value[attr] = (r, c) => (c < 2 ? pairs[r][c] : pairs[r][0] + pairs[r][1]);
    } else if (rule === 'turn') {
      const step = rng() < 0.5 ? 90 : 270;
      const starts = sample(rng, [0, 90, 180, 270], 3);
      value[attr] = (r, c) => (starts[r] + c * step) % 360;
    }
  }
  return Array.from({ length: 9 }, (_, i) => {
    const [r, c] = [Math.floor(i / 3), i % 3];
    return Object.fromEntries(ATTRS.map((attr) => [attr, value[attr](r, c)]));
  });
}

/**
 * Les intrus : une case voisine recopiée (le piège classique), puis le bon dessin avec une
 * seule caractéristique changée, à tour de rôle pour chaque règle (il faut toutes les
 * vérifier), en commençant par les valeurs du tableau. Aucun ne suit les règles.
 */
function matrixDistractors(rng, cells, gap, rules, count) {
  const answer = cells[gap];
  const domains = { shape: FIG_SHAPES, style: STYLE_IDS, n: [1, 2, 3, 4], rot: [0, 90, 180, 270] };
  const singles = ATTRS.filter((a) => rules[a]).map((attr) => {
    const inGrid = shuffle(rng, cells.filter((c, i) => i !== gap).map((c) => c[attr]));
    return [...inGrid, ...shuffle(rng, domains[attr])]
      .filter((v, i, all) => v !== answer[attr] && all.indexOf(v) === i)
      .map((v) => ({ ...answer, [attr]: v }));
  });
  const fits = (fig) => matrixHolds(cells.map((c, i) => (i === gap ? fig : c)), rules);
  const out = [];
  const add = (fig) => {
    if (out.length < count && !fits(fig) && ![answer, ...out].some((f) => figKey(f) === figKey(fig))) out.push(fig);
  };
  const [r, c] = [Math.floor(gap / 3), gap % 3];
  const neighbour = cells[r * 3 + (c ? c - 1 : 1)];
  if (rng() < 0.5) add(neighbour);
  for (let k = 0; out.length < count && k < 6; k++) singles.forEach((list) => list[k] && add(list[k]));
  return out;
}

/** Ce que dit la voix après la bonne réponse : la règle, en phrases courtes. */
function matrixExplanation(cells, rules) {
  const row = cells.slice(0, 3);
  const out = [];
  if (rules.shape === 'row') out.push('Sur chaque ligne, c’est la même forme.');
  if (rules.shape === 'latin') out.push('Sur chaque ligne, il y a une fois chaque forme.');
  if (rules.style === 'row') out.push('Sur chaque ligne, les dessins ont la même couleur et le même motif.');
  if (rules.style === 'latin') out.push('Sur chaque ligne, il y a une fois chaque couleur, avec son motif.');
  if (rules.n === 'col') out.push(row[0].n === 1 ? 'Le nombre de dessins augmente : 1, 2, 3.' : 'Le nombre de dessins diminue : 3, 2, 1.');
  if (rules.n === 'latin') out.push('Sur chaque ligne, il y a 1, 2 et 3 dessins.');
  if (rules.n === 'add') out.push('Sur chaque ligne, la dernière case a autant de dessins que les deux premières ensemble.');
  if (rules.rot === 'turn') {
    out.push((row[1].rot - row[0].rot + 360) % 360 === 90
      ? 'À chaque case, la flèche fait un quart de tour, comme les aiguilles d’une montre.'
      : 'À chaque case, la flèche fait un quart de tour, dans l’autre sens que les aiguilles d’une montre.');
  }
  return out;
}

const MATRIX_INSTRUCTIONS = {
  1: 'Regarde bien chaque ligne du tableau. Quel dessin va dans la case vide ?',
  5: 'Regarde comment la flèche tourne sur chaque ligne. Quelle flèche va dans la case vide ?',
  7: 'Sur chaque ligne, compte les dessins des deux premières cases. Quel dessin va dans la case vide ?',
};

export const tableauLogique = {
  id: 'tableau-logique',
  domain: 'jeux',
  section: 'Logique',
  title: 'Le tableau logique',
  icon: '🧠',
  skill: 'Trouver la règle d’un tableau (forme, nombre, couleur et motif, rotation) et la case qui manque',
  levels: MATRIX_LEVELS.map((l) => l.label),
  generate(level, rng) {
    const { rules, choices: count, anyGap } = MATRIX_LEVELS[level - 1];
    const cells = matrixCells(rng, rules);
    const gap = anyGap ? randInt(rng, 0, 8) : 8;
    const answer = cells[gap];
    const options = shuffle(rng, [answer, ...matrixDistractors(rng, cells, gap, rules, count - 1)]);
    const rot = Boolean(rules.rot);
    return {
      key: `tableau:${level}:${gap}:${cells.map(figKey).join(',')}`,
      text: rot ? 'Quelle flèche va dans la case vide ?' : 'Quel dessin va dans la case vide ?',
      instruction: MATRIX_INSTRUCTIONS[level] || 'Regarde bien les lignes et les colonnes du tableau. Quel dessin va dans la case vide ?',
      short: { key: `tableau:${rot ? 'fleche' : 'dessin'}`, text: rot ? 'Quelle flèche manque ?' : 'Quel dessin manque ?' },
      stage: { type: 'matrix', cells: cells.map((c, i) => (i === gap ? null : c)), rules },
      choices: options.map((fig) => ({ value: figKey(fig), figure: fig, name: describeFigure(fig) })),
      choiceStyle: 'figures',
      answer: figKey(answer),
      success: { speak: matrixExplanation(cells, rules) },
    };
  },
};

// =====================================================================
// Les balances : des balances en équilibre ; combien pèse l'animal ?
// =====================================================================

export const SCALE_ANIMALS = [
  { emoji: '🐱', one: 'chat', many: 'chats' },
  { emoji: '🐶', one: 'chien', many: 'chiens' },
  { emoji: '🐰', one: 'lapin', many: 'lapins' },
  { emoji: '🐔', one: 'poule', many: 'poules', f: true },
  { emoji: '🦆', one: 'canard', many: 'canards' },
  { emoji: '🐷', one: 'cochon', many: 'cochons' },
  { emoji: '🐢', one: 'tortue', many: 'tortues', f: true },
  { emoji: '🦊', one: 'renard', many: 'renards' },
];
const le = (a) => `${a.f ? 'la' : 'le'} ${a.one}`;
const un = (a) => `${a.f ? 'une' : 'un'} ${a.one}`;
const kilos = (n) => (n === 1 ? '1 kilo' : `${n} kilos`);

export const SCALE_LEVELS = [
  { label: 'Une balance', balances: 1 },
  { label: 'Deux animaux pareils', balances: 1 },
  { label: 'Un animal et un poids', balances: 1 },
  { label: 'Deux balances', balances: 2 },
  { label: 'Deux balances, des doubles', balances: 2 },
  { label: 'Trois balances', balances: 3 },
  { label: 'Deux animaux inconnus', balances: 2 },
  { label: 'Le grand défi', balances: 2 },
];

/** Un poids posé sur la balance, en un ou deux morceaux. */
function weights(rng, total, split = false) {
  if (!split || total < 3) return [{ kg: total }];
  const a = randInt(rng, 1, total - 1);
  return [{ kg: a }, { kg: total - a }];
}

/** Ce que pèse chaque côté, avec le poids de chaque animal. */
export function sideWeight(side, values) {
  return side.reduce((sum, item) => sum + (item.kg ?? values[item.animal]), 0);
}

/** Les balances de chaque niveau, le poids de chaque animal, l'animal demandé et l'explication. */
function scalePuzzle(level, rng) {
  const animals = sample(rng, SCALE_ANIMALS, 3);
  const [A, B, C] = animals;
  const a = { animal: 0 };
  const b = { animal: 1 };
  const c = { animal: 2 };
  switch (level) {
    case 1: {
      const x = randInt(rng, 2, 8);
      return { animals: [A], values: [x], ask: 0, balances: [{ left: [a], right: weights(rng, x, rng() < 0.5) }], why: [] };
    }
    case 2: {
      const x = randInt(rng, 2, 6);
      return {
        animals: [A], values: [x], ask: 0, balances: [{ left: [a, a], right: weights(rng, 2 * x, rng() < 0.3) }],
        why: [`Deux ${A.many} pèsent ${kilos(2 * x)}, donc ${un(A)} pèse ${kilos(x)}.`],
      };
    }
    case 3: {
      const x = randInt(rng, 2, 9);
      const p = randInt(rng, 1, 5);
      return {
        animals: [A], values: [x], ask: 0, balances: [{ left: [a, { kg: p }], right: [{ kg: x + p }] }],
        why: [`${x + p} moins ${p}, ça fait ${x}.`],
      };
    }
    case 4: {
      const x = randInt(rng, 2, 8);
      const p = randInt(rng, 1, 6);
      return {
        animals: [A, B], values: [x, x + p], ask: 1,
        balances: [{ left: [a], right: [{ kg: x }] }, { left: [b], right: [a, { kg: p }] }],
        why: [`${cap(le(A))} pèse ${kilos(x)}.`, `${cap(le(B))} pèse ${kilos(p)} de plus : ${kilos(x + p)}.`],
      };
    }
    case 5: {
      const x = randInt(rng, 2, 6);
      const p = randInt(rng, 1, 5);
      return {
        animals: [A, B], values: [x, x + p], ask: 1,
        balances: [{ left: [a, a], right: [{ kg: 2 * x }] }, { left: [b], right: [a, { kg: p }] }],
        why: [`Deux ${A.many} pèsent ${kilos(2 * x)}, donc ${un(A)} pèse ${kilos(x)}.`, `${cap(le(B))} pèse ${kilos(p)} de plus : ${kilos(x + p)}.`],
      };
    }
    case 6: {
      const x = randInt(rng, 1, 4);
      const withWeight = rng() < 0.5;
      const p = randInt(rng, 1, 5);
      const z = withWeight ? 2 * x + p : 3 * x;
      return {
        animals: [A, B, C], values: [x, 2 * x, z], ask: 2,
        balances: [
          { left: [a], right: [{ kg: x }] },
          { left: [b], right: [a, a] },
          { left: [c], right: withWeight ? [b, { kg: p }] : [b, a] },
        ],
        why: [`${cap(le(A))} pèse ${kilos(x)}, et ${le(B)} pèse ${kilos(2 * x)}.`, `Donc ${le(C)} pèse ${kilos(z)}.`],
      };
    }
    case 7: {
      // la deuxième balance a un animal de plus : la différence, c'est son poids
      const x = randInt(rng, 2, 6);
      const y = randInt(rng, 1, 8);
      return {
        animals: [A, B], values: [x, y], ask: 0,
        balances: [{ left: [a, b], right: [{ kg: x + y }] }, { left: [a, a, b], right: [{ kg: 2 * x + y }] }],
        why: [`Sur la deuxième balance, il y a ${un(A)} de plus, et ${kilos(x)} de plus.`, `Donc ${un(A)} pèse ${kilos(x)}.`],
      };
    }
    default: {
      // A pèse autant que deux B, et A + B ensemble : c'est comme trois B
      const y = randInt(rng, 1, 5);
      const askA = rng() < 0.5;
      return {
        animals: [A, B], values: [2 * y, y], ask: askA ? 0 : 1,
        balances: [{ left: [a], right: [b, b] }, { left: [a, b], right: [{ kg: 3 * y }] }],
        why: [
          `${cap(le(A))} pèse autant que deux ${B.many}.`,
          `Sur la deuxième balance, c’est comme trois ${B.many} : ${kilos(3 * y)}.`,
          askA ? `${cap(un(B))} pèse ${kilos(y)}, donc ${le(A)} pèse ${kilos(2 * y)}.` : `Donc ${un(B)} pèse ${kilos(y)}.`,
        ],
      };
    }
  }
}

export const balances = {
  id: 'balances',
  domain: 'jeux',
  section: 'Logique',
  title: 'Les balances',
  icon: '⚖️',
  skill: 'Raisonner avec des balances en équilibre : remplacer, comparer, déduire un poids',
  levels: SCALE_LEVELS.map((l) => l.label),
  generate(level, rng) {
    const { animals, values, ask, balances: scales, why } = scalePuzzle(level, rng);
    const target = animals[ask];
    const answer = values[ask];
    const several = scales.length > 1;
    // « Combien pèse le chat ? », ou « un chat » quand il y en a plusieurs sur la balance
    const who = scales.some((s) => [...s.left, ...s.right].filter((it) => it.animal === ask).length > 1) ? un(target) : le(target);
    const question = `Combien pèse ${who} ?`;
    const intro = level === 1
      ? 'La balance est en équilibre : les deux côtés pèsent pareil.'
      : several ? 'Les balances sont en équilibre.' : 'La balance est en équilibre.';
    return {
      key: `balances:${level}:${animals.map((x) => x.one).join('-')}:${values.join('-')}:${JSON.stringify(scales)}`,
      text: question,
      instruction: `${intro} ${question}`,
      short: { key: `balances:${scales.length}`, text: question },
      stage: {
        type: 'scales',
        animals: animals.map((x) => ({ emoji: x.emoji, name: x.one })),
        balances: scales,
        ask,
        values, // pour les tests (jamais affiché)
      },
      choices: numberChoices(rng, answer, 4, 1, 20).map((v) => ({ value: v, label: String(v) })),
      choiceStyle: 'numbers',
      answer,
      // l'explication finit par la réponse ; sinon (une seule balance), on la dit
      success: { speak: why.at(-1)?.endsWith(` ${kilos(answer)}.`) ? why : [...why, `${cap(who)} pèse ${kilos(answer)}.`] },
    };
  },
};

/** Une balance en équilibre (SVG), les animaux et les poids posés sur les plateaux. */
export function balanceSvg({ left, right }, animals) {
  const item = (it, x) => (it.kg !== undefined
    ? `<g class="scale-weight"><path d="M${x - 12.5} 40.5 L${x - 9.5} 24 H${x + 9.5} L${x + 12.5} 40.5 Z"/><text x="${x}" y="36.5">${it.kg}<tspan class="scale-kg" dx="0.6">kg</tspan></text></g>`
    : `<text x="${x}" y="38" class="scale-animal">${animals[it.animal].emoji}</text>`);
  const side = (items, cx) => {
    const step = Math.min(26, 84 / items.length);
    return items.map((it, i) => item(it, cx + (i - (items.length - 1) / 2) * step)).join('');
  };
  return `<svg viewBox="0 0 220 74" aria-hidden="true">
    <rect x="94" y="66" width="32" height="6" rx="3" class="scale-base"/>
    <path d="M110 46 L101 67 H119 Z" class="scale-post"/>
    <rect x="10" y="41" width="200" height="5" rx="2.5" class="scale-beam"/>
    <circle cx="110" cy="45" r="3.4" class="scale-pivot"/>
    <text x="110" y="62" class="scale-equal">=</text>
    ${side(left, 54)}${side(right, 166)}
  </svg>`;
}

/** Description d'une balance pour les lecteurs d'écran : « 2 lapins = 6 kg ». */
export function describeBalance({ left, right }, animals) {
  const words = (items) => {
    const counts = new Map();
    items.forEach((it) => {
      const k = it.kg !== undefined ? `${it.kg} kg` : animals[it.animal].name;
      counts.set(k, (counts.get(k) || 0) + 1);
    });
    return [...counts].map(([k, n]) => (n > 1 ? `${n} × ${k}` : k)).join(' et ');
  };
  return `${words(left)} pèsent autant que ${words(right)}`;
}

// =====================================================================
// Le dessin caché (picross) : colorier les cases d'après les nombres des lignes et des
// colonnes ; un dessin apparaît. Chaque dessin a une seule solution, trouvable ligne par
// ligne sans deviner (vérifié par les tests).
// =====================================================================

// Couleurs du dessin révélé à la fin (pendant le jeu, les cases coloriées sont foncées).
export const PIXEL_COLORS = {
  r: '#e63946', o: '#f08c00', y: '#f4c430', g: '#2a9d4b', b: '#1d6fd8', n: '#8a5a2b',
  k: '#2b2d42', p: '#f06595', v: '#8e5bd8', s: '#8d99ae', c: '#4cc9f0',
};

// Les dessins : '.' case vide, une lettre = case coloriée (et sa couleur à la fin).
export const PICTURES = [
  // 4 × 4
  { name: 'une flèche', rows: ['.bb.', 'bbbb', '.bb.', '.bb.'] },
  { name: 'un champignon', rows: ['rrrr', 'rrrr', '.oo.', '.oo.'] },
  { name: 'un bateau', rows: ['..r.', '.rr.', 'nnnn', '.nn.'] },
  { name: 'un sablier', rows: ['nnnn', '.yy.', '.yy.', 'nnnn'] },
  { name: 'une tasse', rows: ['ooo.', 'ooob', 'ooob', 'ooo.'] },
  // 5 × 5
  { name: 'un cœur', rows: ['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..'] },
  { name: 'une maison', rows: ['..r..', '.rrr.', 'rrrrr', '.o.o.', '.ooo.'] },
  { name: 'un sapin', rows: ['..g..', '.ggg.', 'ggggg', '..n..', '..n..'] },
  { name: 'un bonhomme', rows: ['..p..', 'bbbbb', '..b..', '.bbb.', 'bb.bb'] },
  { name: 'un chat', rows: ['k...k', 'kk.kk', 'kkkkk', 'k.k.k', '.kkk.'] },
  { name: 'une étoile', rows: ['..y..', 'yyyyy', '.yyy.', '.y.y.', 'y...y'] },
  { name: 'un parapluie', rows: ['.vvv.', 'vvvvv', '..k..', '..k..', '.kk..'] },
  // 6 × 6
  { name: 'un champignon', rows: ['..rr..', '.rrrr.', 'rrrrrr', 'r.rr.r', '..oo..', '..oo..'] },
  { name: 'une voiture', rows: ['......', '.rrr..', 'rrrrrr', 'rrrrrr', '.k..k.', '.k..k.'] },
  { name: 'un poisson', rows: ['......', '.oo..o', 'oooooo', 'o.oooo', '.oo..o', '......'] },
  { name: 'une fleur', rows: ['.p..p.', 'pppppp', '.pyyp.', '..gg..', 'g.gg.g', '.gggg.'] },
  { name: 'un robot', rows: ['ssssss', 's.ss.s', 'ssssss', '..ss..', 'ssssss', 's.ss.s'] },
  { name: 'un canard', rows: ['.yy...', 'yyo...', '.yy...', '.yyyyy', '.yyyy.', '..yy..'] },
  // 7 × 7
  { name: 'un cœur', rows: ['.rr.rr.', 'rrrrrrr', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'] },
  { name: 'une fusée', rows: ['...r...', '..rrr..', '..sss..', '..scs..', '.sssss.', 'ss.o.ss', '...o...'] },
  { name: 'un arbre', rows: ['.ggggg.', 'ggggggg', 'ggggggg', '.ggggg.', '...n...', '...n...', '..nnn..'] },
  { name: 'une maison', rows: ['...r...', '..rrr..', '.rrrrr.', 'rrrrrrr', '.o.o.o.', '.o.n.o.', '.ooooo.'] },
  { name: 'un papillon', rows: ['vv...vv', 'vvv.vvv', 'vvvkvvv', '..vkv..', '.vvkvv.', 'vv.k.vv', '.......'] },
  { name: 'un bonhomme de neige', rows: ['..kkk..', '..sss..', '..s.s..', '.sssss.', 'ssssss.', 'sssssss', '.sssss.'] },
  // 8 × 8
  { name: 'une pomme', rows: ['....n...', '...ng...', '.rrrrrr.', 'rrrrrrrr', 'rrrrrrrr', 'rrrrrrrr', '.rrrrrr.', '..rr.rr.'] },
  { name: 'un chat', rows: ['k.....k.', 'kk...kk.', 'kkkkkkk.', 'k.kkk.k.', 'kkkkkkk.', '.kkkkk..', '..kkk..k', '.kkkkkkk'] },
  { name: 'un bateau', rows: ['....r...', '...rr...', '..rrr...', '.rrrr...', '....n...', 'nnnnnnnn', '.nnnnnn.', '..nnnn..'] },
  { name: 'une tortue', rows: ['........', '..ggg...', '.ggggg..', 'gggggggp', 'gggggggp', '.p.p.p..', '.p...p..', '........'] },
  { name: 'un sapin', rows: ['...yy...', '...gg...', '..gggg..', '.gggggg.', '..gggg..', '.gggggg.', 'gggggggg', '...nn...'] },
  { name: 'une glace', rows: ['..pppp..', '.pppppp.', '.pppppp.', '..pppp..', '..oooo..', '...oo...', '...oo...', '...o....'] },
];

/** Les nombres d'une ligne : la longueur de chaque groupe de cases coloriées ([] si aucune). */
export function lineClue(line) {
  const out = [];
  let run = 0;
  for (const v of line) {
    if (v) run++;
    else if (run) { out.push(run); run = 0; }
  }
  if (run) out.push(run);
  return out;
}

const patternCache = new Map();
/** Toutes les lignes de longueur `len` qui ont ces nombres. */
function linePatterns(len, clue) {
  const key = `${len}:${clue.join(',')}`;
  if (!patternCache.has(key)) {
    const out = [];
    for (let m = 0; m < 2 ** len; m++) {
      const line = Array.from({ length: len }, (_, i) => (m >> i) & 1);
      if (lineClue(line).join(',') === clue.join(',')) out.push(line);
    }
    patternCache.set(key, out);
  }
  return patternCache.get(key);
}

/**
 * Résout ligne par ligne, comme un enfant : une case est sûre quand toutes les façons de
 * remplir sa ligne (ou sa colonne) avec ce qu'on sait déjà sont d'accord. Rend la grille
 * (1 colorié, 0 vide, null inconnu), ou null si c'est impossible.
 */
export function solveByLines(rowClues, colClues, start = null) {
  const R = rowClues.length;
  const C = colClues.length;
  const grid = start ? [...start] : Array(R * C).fill(null);
  const lines = [
    ...rowClues.map((clue, r) => ({ clue, cells: Array.from({ length: C }, (_, c) => r * C + c) })),
    ...colClues.map((clue, c) => ({ clue, cells: Array.from({ length: R }, (_, r) => r * C + c) })),
  ];
  for (let changed = true; changed;) {
    changed = false;
    for (const { clue, cells } of lines) {
      const fits = linePatterns(cells.length, clue).filter((p) => p.every((v, i) => grid[cells[i]] === null || grid[cells[i]] === v));
      if (!fits.length) return null;
      cells.forEach((cell, i) => {
        if (grid[cell] !== null) return;
        const v = fits[0][i];
        if (fits.every((p) => p[i] === v)) {
          grid[cell] = v;
          changed = true;
        }
      });
    }
  }
  return grid;
}

/** Nombre de solutions (on s'arrête à `limit`) : résolution ligne par ligne, puis essais. */
export function countPicrossSolutions(rowClues, colClues, limit = 2, start = null) {
  const grid = solveByLines(rowClues, colClues, start);
  if (!grid) return 0;
  const unknown = grid.indexOf(null);
  if (unknown < 0) return 1;
  let total = 0;
  for (const v of [1, 0]) {
    const next = [...grid];
    next[unknown] = v;
    total += countPicrossSolutions(rowClues, colClues, limit - total, next);
    if (total >= limit) break;
  }
  return total;
}

/** Les nombres des lignes et des colonnes d'un dessin. */
export function picrossClues(cells, cols, rows) {
  return {
    rowClues: Array.from({ length: rows }, (_, r) => lineClue(cells.slice(r * cols, (r + 1) * cols))),
    colClues: Array.from({ length: cols }, (_, c) => lineClue(Array.from({ length: rows }, (_, r) => cells[r * cols + c]))),
  };
}

const PICROSS_LEVELS = [
  { label: 'Petit dessin 4 × 4', size: 4 },
  { label: 'Dessin 5 × 5', size: 5 },
  { label: '6 × 6, des cases données', size: 6, given: 3 },
  { label: 'Dessin 6 × 6', size: 6 },
  { label: '7 × 7, des cases données', size: 7, given: 4 },
  { label: 'Dessin 7 × 7', size: 7 },
  { label: '8 × 8, des cases données', size: 8, given: 5 },
  { label: 'Grand dessin 8 × 8', size: 8 },
];

export const picross = {
  id: 'picross',
  domain: 'jeux',
  section: 'Logique',
  title: 'Le dessin caché',
  icon: '🖼️',
  skill: 'Picross : colorier les cases d’après les nombres des lignes et des colonnes (logique)',
  levels: PICROSS_LEVELS.map((l) => l.label),
  generate(level, rng) {
    const { size, given = 0 } = PICROSS_LEVELS[level - 1];
    const picture = pick(rng, PICTURES.filter((p) => p.rows.length === size));
    // le dessin, ou son reflet (une flèche, un bateau tournés vers l'autre côté)
    const flip = rng() < 0.5;
    const rows = picture.rows.map((r) => (flip ? [...r].reverse().join('') : r));
    const colors = rows.join('').split('').map((ch) => (ch === '.' ? null : ch));
    const cells = colors.map((ch) => (ch ? 1 : 0));
    const { rowClues, colClues } = picrossClues(cells, size, size);
    const solution = cells.flatMap((v, i) => (v ? [i] : []));
    // un coup de pouce : quelques cases déjà coloriées, prises d'abord dans les lignes à plusieurs nombres
    const harder = (i) => rowClues[Math.floor(i / size)].length > 1 || colClues[i % size].length > 1;
    const hints = [...shuffle(rng, solution.filter(harder)), ...shuffle(rng, solution.filter((i) => !harder(i)))]
      .slice(0, given).sort((a, b) => a - b);
    return {
      key: `picross:${level}:${picture.name}:${flip ? 'reflet' : 'droit'}:${hints.join('-')}`,
      interaction: 'picross',
      text: 'Colorie les cases pour trouver le dessin.',
      instruction: level === 1
        ? 'Colorie les cases pour trouver le dessin caché. Chaque nombre dit combien de cases se suivent sur la ligne ou la colonne.'
        : 'Colorie les cases pour trouver le dessin caché. Les nombres disent combien de cases se suivent, sur chaque ligne et sur chaque colonne.',
      short: { key: 'picross', text: 'Trouve le dessin caché !' },
      stage: { type: 'picross', cols: size, rows: size, rowClues, colClues, solution, given: hints, colors: colors.map((ch) => (ch ? PIXEL_COLORS[ch] : null)), name: picture.name },
      choices: [],
      answer: null,
      success: { speak: `Bravo, c’est ${picture.name} !` },
    };
  },
};

export const LOGIQUE_PLUS_GAMES = [tableauLogique, balances, picross];
