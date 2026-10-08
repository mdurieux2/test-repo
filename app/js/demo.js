// Démonstration au premier lancement : la première fois qu'un enfant ouvre un jeu dont le geste
// n'est pas évident (glisser, tracer, entourer, relier, placer…), une main montre le geste sur la
// vraie question pendant 2 à 3 secondes, puis disparaît. Le bouton « ? » la remontre.
//
// - Ce fichier décide quels jeux ont une démonstration et quel geste montrer, à partir des données
//   de la question (`demoPlan` : sans DOM, testé par tests/demo.test.js), puis joue la démonstration
//   sur l'écran affiché (`playDemo`).
// - Toucher plutôt que glisser (tapOnly) : la main montre des touchers, jamais un glissé.
// - Mode calme, ou « réduire les animations » sur l'appareil : rien ne bouge ; la main est posée au
//   départ et les étapes sont numérotées (1, 2…), avec une flèche pour un glissé.
// - La main ne capte pas le doigt : l'enfant peut jouer tout de suite ; le moindre toucher (ou une
//   touche du clavier) la fait disparaître.
// - Ce qui est vu est retenu avec l'enfant (demoSeen / markDemoSeen dans storage.js).
// - Rien n'est dit par Estelle : la démonstration est visuelle ; un texte caché la décrit aux
//   lecteurs d'écran.

import { lineX, NL } from './games/nombres-plus.js';

// ---------------------------------------------------------------- Les gestes (sans DOM)

// Une cible est un endroit de l'écran, trouvé au moment de jouer :
//   { el: sélecteur, data?: { clé: valeur }, index?: n, last?: true, fx?, fy? } : un élément (son
//     centre, ou le point fx, fy de son cadre, de 0 à 1) ;
//   { svg: sélecteur, x, y } : un point d'un dessin, dans les unités de son viewBox.
// Une étape : { kind: 'tap', at } (un toucher), { kind: 'drag', path: [cibles] } (un glissé) ou
// { kind: 'look', at } (la main va montrer l'endroit, entouré de pointillés, sans toucher) ou
// { kind: 'hover', path: [cibles] } (la main passe au-dessus, sans toucher : « cherche par là »).

const el = (sel, extra = {}) => ({ el: sel, ...extra });
const tap = (at) => ({ kind: 'tap', at });
const look = (at) => ({ kind: 'look', at });
const drag = (path) => ({ kind: 'drag', path });
const hover = (path) => ({ kind: 'hover', path });

/** Quelques points d'une ligne brisée, à peu près tous les `step` unités (le premier et le dernier compris). */
export function samplePath(points, step = 6, max = 14) {
  if (!points?.length) return [];
  const out = [points[0]];
  let run = 0;
  for (let i = 1; i < points.length; i++) {
    run += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    if (run >= step || i === points.length - 1) {
      out.push(points[i]);
      run = 0;
    }
  }
  if (out.length <= max) return out;
  return Array.from({ length: max }, (_, k) => out[Math.round((k * (out.length - 1)) / (max - 1))]);
}

/** Le début d'un trait : ses premières unités de longueur (assez pour montrer le sens). */
function strokeStart(points, length = 45) {
  const out = [points[0]];
  let run = 0;
  for (let i = 1; i < points.length && run < length; i++) {
    run += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    out.push(points[i]);
  }
  return out;
}

/** Centre d'une case du labyrinthe rond, en fraction du dessin (0 à 1), comme dans main.js. */
export function roundCellPoint(sectors, cell) {
  const T = 10;
  const V = sectors.length * T + 2;
  let ring = 0;
  let first = 0;
  while (ring < sectors.length - 1 && first + sectors[ring] <= cell) first += sectors[ring++];
  const a = 2 * Math.PI * ((cell - first + 0.5) / sectors[ring]);
  const rho = ring ? (ring + 0.5) * T : 0;
  return { fx: (rho * Math.sin(a) + V) / (2 * V), fy: (V - rho * Math.cos(a)) / (2 * V) };
}

/** Les objets d'un paquet de patates : le premier et ses plus proches voisins (en % du cadre). */
function lassoGroup(stage) {
  const spot = stage.positions.map((p) => [5 + p.x * 0.9, 5 + p.y * 0.9]);
  const [x0, y0] = spot[0];
  return spot.map((p, i) => ({ i, p, d: Math.hypot(p[0] - x0, p[1] - y0) }))
    .sort((a, b) => a.d - b.d).slice(0, stage.group);
}

const VALIDATE = (zone) => el(`.${zone} .validate-btn`);

/**
 * Chaque forme d'exercice qui a une démonstration : `label` (ce que fait la main, dit aux lecteurs
 * d'écran) et `plan(q, { tapOnly })` (les étapes). Les choix multiples, le pavé numérique, le
 * memory et l'addition posée n'en ont pas : on y touche simplement une réponse.
 */
const DEMOS = {
  trace: {
    label: (q, tapOnly) => (tapOnly ? 'Touche les points du chemin, un par un, en partant du point vert.'
      : 'Suis le chemin gris avec ton doigt, en partant du point vert.'),
    plan(q, { tapOnly }) {
      const stroke = q.stage.strokes[0];
      const at = (p) => ({ svg: '.trace-drawing', x: p[0], y: p[1] });
      // des touchers : les points de passage dessinés par le jeu, dans l'ordre
      if (tapOnly) return [0, 1, 2].map((index) => tap(el('.trace-drawing .trace-stop', { index })));
      return [drag(samplePath(strokeStart(stroke), 5).map(at))];
    },
  },
  dots: {
    label: (q, tapOnly) => (tapOnly ? 'Touche les points dans l’ordre des nombres.' : 'Glisse ton doigt d’un point au suivant, dans l’ordre des nombres.'),
    plan(q, { tapOnly }) {
      // seulement la première étape : du premier point au deuxième
      const pts = q.stage.points.slice(0, 2).map(([x, y]) => ({ svg: '.dots-drawing', x, y }));
      return tapOnly ? pts.map(tap) : [drag(pts)];
    },
  },
  maze: {
    label: (q, tapOnly) => (tapOnly ? 'Touche les cases du chemin, une par une.' : 'Glisse ton doigt sur le chemin, case après case.'),
    plan(q, { tapOnly }) {
      // seulement le premier pas sur le chemin
      const cells = q.stage.solution.slice(0, 2).map((c) => el('.maze-cell', { data: { cell: c } }));
      return tapOnly ? cells.slice(1).map(tap) : [drag(cells)];
    },
  },
  roundmaze: {
    label: (q, tapOnly) => (tapOnly ? 'Touche les cases du chemin, une par une.' : 'Glisse ton doigt sur le chemin, case après case.'),
    plan(q, { tapOnly }) {
      const cells = q.stage.solution.slice(0, 2).map((c) => el('.rmaze', roundCellPoint(q.stage.sectors, c)));
      return tapOnly ? cells.slice(1).map(tap) : [drag(cells)];
    },
  },
  path: {
    label: () => 'Touche les cases dans l’ordre, en partant de la case allumée.',
    plan: (q) => q.stage.path.slice(1, 2).map((c) => tap(el('.path-cell', { data: { cell: c } }))),
  },
  lasso: {
    label: (q, tapOnly) => (tapOnly ? 'Touche les objets un par un pour faire un paquet.' : 'Entoure des objets avec ton doigt pour faire un paquet.'),
    plan(q, { tapOnly }) {
      const group = lassoGroup(q.stage);
      // des touchers : le premier objet seulement (la suite est à l'enfant)
      if (tapOnly) return group.slice(0, 1).map(({ i }) => tap(el('.lasso-object', { data: { i } })));
      // une boucle autour du paquet (en % du cadre)
      const cx = group.reduce((s, g) => s + g.p[0], 0) / group.length;
      const cy = group.reduce((s, g) => s + g.p[1], 0) / group.length;
      const rx = Math.min(45, Math.max(...group.map((g) => Math.abs(g.p[0] - cx))) + 9);
      const ry = Math.min(45, Math.max(...group.map((g) => Math.abs(g.p[1] - cy))) + 9);
      const loop = Array.from({ length: 13 }, (_, k) => {
        const a = -Math.PI / 2 + (2 * Math.PI * k) / 12;
        const clamp = (v) => Math.min(0.99, Math.max(0.01, v));
        return el('.lasso-field', { fx: clamp((cx + rx * Math.cos(a)) / 100), fy: clamp((cy + ry * Math.sin(a)) / 100) });
      });
      return [drag(loop)];
    },
  },
  match: {
    label: (q, tapOnly) => (tapOnly ? 'Touche une étiquette à gauche, puis sa partenaire.' : 'Trace un trait d’une étiquette jusqu’à sa partenaire.'),
    plan(q, { tapOnly }) {
      const from = el('.match-item.left', { data: { left: 0 } });
      const to = el('.match-item.right', { data: { right: q.pairs[0].right } });
      return tapOnly ? [tap(from), tap(to)] : [drag([from, to])];
    },
  },
  fill: {
    label: (q, tapOnly) => (tapOnly ? 'Touche une case, puis un nombre.' : 'Glisse un nombre dans une case.'),
    plan(q, { tapOnly }) {
      const box = el('.fill-box', { data: { row: 0, col: 0 } });
      const tile = el('.tile', { data: { value: q.equations[0].solution[0] } });
      return tapOnly ? [tap(box), tap(tile)] : [drag([tile, box])];
    },
  },
  share: {
    label: (q, tapOnly) => (q.stage.size ? 'Mets les objets dans le paquet, un par un.'
      : tapOnly ? 'Touche un objet du tas, puis un enfant.' : 'Glisse un objet du tas jusqu’à un enfant.'),
    plan(q, { tapOnly }) {
      const object = el('.share-object', { last: true });
      const holder = q.stage.size ? el('.share-bag.open') : el('.share-plate', { data: { plate: 0 } });
      if (tapOnly) return q.stage.size ? [tap(object)] : [tap(object), tap(holder)];
      return [drag([object, holder])];
    },
  },
  swap: {
    label: () => 'Touche une pièce, puis une autre : elles changent de place.',
    plan(q) {
      const { order } = q.stage;
      const pos = Math.max(0, order.findIndex((v, i) => v !== i));
      const from = order.indexOf(pos);
      return [tap(el('.pz-tile', { data: { pos: from } })), tap(el('.pz-tile', { data: { pos } }))];
    },
  },
  colorby: {
    label: () => 'Touche une couleur en bas, puis une zone du dessin qui a son nombre.',
    plan(q) {
      const zone = q.stage.zones[0];
      return [tap(el('.magic-color', { data: { color: zone.c } })), tap({ svg: '.magic-drawing', x: zone.at[0], y: zone.at[1] })];
    },
  },
  numberline: {
    label: (q, tapOnly) => (tapOnly ? 'Touche la droite pour placer la flèche, puis « C’est ici ».'
      : 'Touche la droite et glisse la flèche, puis touche « C’est ici ».'),
    plan(q, { tapOnly }) {
      const st = q.stage;
      // deux graduations, sans montrer la réponse
      const ticks = [];
      for (let v = st.min; v <= st.max + 1e-9 && ticks.length < 40; v += st.snap) ticks.push(Math.round(v * 1000) / 1000);
      const far = ticks.filter((v) => Math.abs(v - q.target) > (q.tolerance || 0));
      const a = far[0] ?? st.min;
      const b = far[Math.min(far.length - 1, Math.max(1, Math.round(far.length / 4)))] ?? st.max;
      const at = (v) => ({ svg: '.nl-place svg', x: lineX(st, v), y: NL.y });
      const slide = [a, (a + b) / 2, b].map(at);
      return [tapOnly ? tap(at(b)) : drag(slide), tap(VALIDATE('numberline-zone'))];
    },
  },
  setclock: {
    label: (q, tapOnly) => (tapOnly ? 'Touche le cadran pour placer la grande aiguille, puis valide.'
      : 'Fais tourner la grande aiguille avec ton doigt, puis valide.'),
    plan(q, { tapOnly }) {
      const start = q.stage.start.m * 6;
      const at = (deg) => {
        const a = (deg * Math.PI) / 180;
        return { svg: '.setclock-dial svg', x: 50 + 34 * Math.sin(a), y: 50 - 34 * Math.cos(a) };
      };
      const turn = [0, 30, 60, 90].map((d) => at(start + d));
      return [tapOnly ? tap(turn.at(-1)) : drag(turn), tap(VALIDATE('setclock-zone'))];
    },
  },
  map: {
    label: () => 'Touche le bon endroit sur la carte.',
    // ce qu'il faut trouver, puis la main cherche sur la carte (sans toucher : ce serait montrer une
    // réponse, juste ou fausse)
    plan: () => [look(el('.map-clue')), hover([0.25, 0.5, 0.75].map((fx, k) => el('.stage-map', { fx, fy: k === 1 ? 0.4 : 0.6 })))],
  },
  body: {
    label: (q) => (q.sequence ? 'Touche les parties du dessin, dans l’ordre.' : 'Touche la bonne partie du dessin.'),
    plan: () => [look(el('.body-clue')), hover([0.3, 0.5, 0.7].map((fy, k) => el('.body-drawing', { fx: k === 1 ? 0.6 : 0.4, fy })))],
  },
  shade: {
    label: () => 'Touche les parts pour les colorier, puis « J’ai fini ».',
    plan: () => [tap(el('.fraction-shade [data-part]', { index: 0 })), tap(VALIDATE('shade-zone'))],
  },
  symmetry: {
    label: () => 'Touche les cases de l’autre côté du trait, comme dans un miroir, puis « J’ai fini ».',
    plan: (q) => [tap(el('.sym-cell.target', { data: { cell: q.stage.solution[0] } })), tap(VALIDATE('sym-zone'))],
  },
  picross: {
    label: (q, tapOnly) => (tapOnly ? 'Touche les cases pour les colorier, d’après les nombres.'
      : 'Touche les cases, ou glisse ton doigt, pour les colorier d’après les nombres.'),
    plan(q, { tapOnly }) {
      const { solution, given, cols } = q.stage;
      const goal = new Set(solution);
      const first = solution.find((c) => !given.includes(c)) ?? solution[0];
      const run = [first];
      while (run.length < 1) { // la première case seulement
        const next = run.at(-1) + 1;
        if (next % cols === 0 || !goal.has(next) || given.includes(next)) break;
        run.push(next);
      }
      const cells = run.map((c) => el('.pc-cell', { data: { cell: c } }));
      return tapOnly || cells.length < 2 ? cells.map(tap) : [drag(cells)];
    },
  },
  sudoku: {
    label: () => 'Touche une case vide, puis l’image qui va dedans.',
    // la case, puis les images en bas (sans toucher la bonne : ce serait donner la réponse)
    plan: (q) => [tap(el('.sudoku-cell', { data: { cell: q.stage.puzzle.indexOf(null) } })), look(el('.sudoku-palette'))],
  },
  order: {
    label: () => 'Touche les étiquettes dans l’ordre : elles montent dans les cases.',
    // les étiquettes, puis le chemin jusqu'à la première case (sans toucher une étiquette : ce
    // serait donner la première réponse, la première lettre de la dictée par exemple)
    plan: () => [look(el('.order-items')), hover([el('.order-items', { fy: 0.3 }), el('.order-slot', { index: 0 })])],
  },
  build: {
    label: () => 'Touche « +1 » pour mettre un objet dans le panier, puis « J’ai fini ».',
    plan: () => [tap(el('.add-btn', { data: { add: 1 } })), tap(el('.add-btn', { data: { add: 1 } })), tap(VALIDATE('build'))],
  },
  pay: {
    label: () => 'Touche les pièces et les billets, puis « Je paie ».',
    plan: () => [tap(el('.pay-add', { index: 0 })), look(el('.pay-tray')), tap(VALIDATE('pay'))],
  },
};

/** Les formes d'exercice qui ont une démonstration. */
export const DEMO_INTERACTIONS = Object.freeze(Object.keys(DEMOS));

/** Cette question a-t-elle une démonstration ? (pas les choix multiples simples) */
export function hasDemo(q) {
  return Boolean(q && DEMOS[q.interaction]);
}

/** Les étapes de la démonstration de cette question (vide s'il n'y en a pas). */
export function demoPlan(q, { tapOnly = false } = {}) {
  if (!hasDemo(q)) return [];
  try {
    const plan = DEMOS[q.interaction].plan(q, { tapOnly }).filter(Boolean);
    // toucher plutôt que glisser : pas même une main qui passe ; on montre l'endroit (cadre)
    const whole = ({ fx, fy, ...target }) => target; // l'élément entier, pas un point
    return tapOnly ? plan.map((s) => (s.kind === 'hover' ? look(whole(s.path.at(-1))) : s)) : plan;
  } catch {
    return []; // une question inattendue : pas de démonstration plutôt qu'une erreur
  }
}

/** Ce que montre la main, en une phrase (pour les lecteurs d'écran). */
export function demoLabel(q, { tapOnly = false } = {}) {
  return hasDemo(q) ? DEMOS[q.interaction].label(q, tapOnly) : '';
}

/** Le jeu a-t-il une démonstration ? (une de ses questions, à un de ses niveaux, en a une) */
export function gameHasDemo(game, { rng = Math.random, samples = 6 } = {}) {
  for (let level = 1; level <= game.levels.length; level++) {
    for (let i = 0; i < samples; i++) {
      if (hasDemo(game.generate(level, rng, i, { name: 'Lou', season: 'printemps' }))) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------- Sur l'écran

const SVG_NS = 'http://www.w3.org/2000/svg';
let current = null; // la démonstration en cours (une seule à la fois)

/** Arrête la démonstration en cours (s'il y en a une). */
export function stopDemo() {
  current?.stop();
}

/** Les éléments que désigne une cible, sur l'écran `root`. */
function targetElement(root, t) {
  let list = [...root.querySelectorAll(t.el)];
  if (t.data) list = list.filter((node) => Object.entries(t.data).every(([k, v]) => node.dataset[k] === String(v)));
  if (t.last) return list.at(-1) || null;
  return list[t.index || 0] || null;
}

/** Le point de l'écran (coordonnées de la fenêtre) d'une cible, ou null si elle n'est pas visible. */
function targetPoint(root, t) {
  if (t.svg) {
    const svg = root.querySelector(t.svg);
    const ctm = svg?.getScreenCTM?.();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = t.x;
    pt.y = t.y;
    const p = pt.matrixTransform(ctm);
    return [p.x, p.y];
  }
  const node = targetElement(root, t);
  if (!node) return null;
  const r = node.getBoundingClientRect();
  if (!r.width && !r.height) return null;
  return [r.left + r.width * (t.fx ?? 0.5), r.top + r.height * (t.fy ?? 0.5)];
}

/** Les étapes avec leurs points à l'écran (les étapes introuvables sont écartées). */
function placeSteps(root, plan) {
  const inView = ([x, y]) => x >= 0 && y >= 0 && x <= innerWidth && y <= innerHeight;
  const out = [];
  for (const step of plan) {
    const targets = step.path || [step.at];
    const points = targets.map((t) => targetPoint(root, t));
    if (points.some((p) => !p || !inView(p))) continue;
    const box = step.kind === 'look' && step.at.el ? targetElement(root, step.at)?.getBoundingClientRect() : null;
    out.push({ kind: step.kind, points, box });
  }
  return out;
}

const svgNode = (tag, attrs = {}) => {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
};
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** Mouvement le plus calme : mode calme de l'enfant, ou « réduire les animations » sur l'appareil. */
export function stillDemo(calm) {
  return Boolean(calm) || Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

/**
 * Joue la démonstration de la question `q` sur l'écran `root` (l'écran de jeu affiché).
 * Options : tapOnly (des touchers seulement), still (sans mouvement), onEnd (appelé à la fin).
 * Renvoie vrai si la démonstration a commencé.
 */
export function playDemo(root, q, { tapOnly = false, still = false, onEnd = null } = {}) {
  stopDemo();
  const steps = root?.isConnected ? placeSteps(root, demoPlan(q, { tapOnly })) : [];
  if (!steps.length) return false;

  const layer = document.createElement('div');
  layer.className = `demo-layer${still ? ' still' : ''}`;
  layer.dataset.demo = q.interaction;
  const art = svgNode('svg', { class: 'demo-art', 'aria-hidden': 'true', width: innerWidth, height: innerHeight, viewBox: `0 0 ${innerWidth} ${innerHeight}` });
  const defs = svgNode('defs');
  const marker = svgNode('marker', { id: 'demo-arrow', viewBox: '0 0 10 10', refX: 6, refY: 5, markerWidth: 4, markerHeight: 4, orient: 'auto-start-reverse' });
  marker.append(svgNode('path', { d: 'M0 0 L10 5 L0 10 Z', class: 'demo-arrow-head' }));
  defs.append(marker);
  art.append(defs);
  const hand = document.createElement('span');
  hand.className = 'demo-hand';
  hand.setAttribute('aria-hidden', 'true');
  hand.textContent = '👆';
  // pour les lecteurs d'écran : ce que montre la main
  const said = document.createElement('p');
  said.className = 'visually-hidden';
  said.setAttribute('role', 'status');
  layer.append(art, hand, said);
  document.body.append(layer);
  setTimeout(() => { said.textContent = `Regarde : ${demoLabel(q, { tapOnly })}`; }, 50);

  let stopped = false;
  const timers = [];
  const listeners = [];
  const listen = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    listeners.push([target, type, fn, opts]);
  };
  const stop = () => {
    if (stopped) return;
    stopped = true;
    timers.forEach(clearTimeout);
    listeners.forEach(([target, type, fn, opts]) => target.removeEventListener(type, fn, opts));
    layer.remove();
    if (current?.layer === layer) current = null;
    onEnd?.();
  };
  current = { stop, layer };
  // le moindre toucher, une touche du clavier, ou l'écran qui change : la main s'en va (et le
  // toucher sert au jeu : la main ne le capte pas)
  timers.push(setTimeout(() => {
    listen(window, 'pointerdown', stop, true);
    listen(window, 'keydown', stop, true);
    listen(window, 'resize', stop);
  }, 0));
  timers.push(setInterval(() => { if (!root.isConnected) stop(); }, 200)); // (clearTimeout arrête aussi un setInterval)
  const later = (ms, fn) => timers.push(setTimeout(() => !stopped && fn(), ms));

  const putHand = ([x, y]) => {
    hand.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  };
  // « regarde ici » : un cadre en pointillés autour de l'élément
  const outline = (box) => art.append(svgNode('rect', {
    class: 'demo-box', x: (box.left - 5).toFixed(1), y: (box.top - 5).toFixed(1),
    width: (box.width + 10).toFixed(1), height: (box.height + 10).toFixed(1), rx: 14,
  }));
  const ring = ([x, y], cls = 'demo-ring') => {
    const node = svgNode('circle', { class: cls, cx: x.toFixed(1), cy: y.toFixed(1), r: 18 });
    art.append(node);
    return node;
  };

  if (still) {
    // sans mouvement : la main posée au départ, les étapes numérotées, une flèche pour un glissé
    let n = 0;
    for (const step of steps) {
      if (step.kind === 'drag' || step.kind === 'hover') {
        art.append(svgNode('polyline', {
          class: `demo-path ${step.kind}`, points: step.points.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' '), 'marker-end': 'url(#demo-arrow)',
        }));
      }
      if (step.box) outline(step.box);
      // le numéro : au départ du geste (dans le coin du cadre pour « regarde ici »)
      const p = step.box ? [step.box.left, step.box.top] : step.points[0];
      const badge = svgNode('g', { class: step.kind === 'look' ? 'demo-step look' : 'demo-step' });
      badge.append(svgNode('circle', { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: 14 }));
      const label = svgNode('text', { x: p[0].toFixed(1), y: (p[1] + 1).toFixed(1) });
      label.textContent = String(++n);
      badge.append(label);
      art.append(badge);
    }
    // la main : au départ du premier geste (toucher, glisser), juste sous son numéro, sans le cacher
    const [x, y] = (steps.find((s) => s.kind !== 'look') || steps[0]).points[0];
    putHand([x, y + 12]);
    hand.classList.add('shown');
    later(3200, stop);
    return true;
  }

  // avec mouvement : la main va d'étape en étape, touche (un rond s'élargit) ou glisse (un trait la suit)
  const run = async () => {
    const frame = (ms, draw) => new Promise((resolve) => {
      const t0 = performance.now();
      const tick = (now) => {
        if (stopped) return resolve(false);
        const t = Math.min(1, (now - t0) / ms);
        draw(t);
        if (t < 1) requestAnimationFrame(tick);
        else resolve(true);
      };
      requestAnimationFrame(tick);
    });
    const wait = (ms) => new Promise((resolve) => later(ms, () => resolve(true)));
    let at = steps[0].points[0];
    putHand(at);
    hand.classList.add('shown');
    await wait(250);
    const moveTo = async (to) => {
      const from = at;
      const d = Math.hypot(to[0] - from[0], to[1] - from[1]);
      if (d < 2) return;
      await frame(Math.min(600, 250 + d), (t) => {
        const k = ease(t);
        putHand([from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k]);
      });
      at = to;
    };
    const press = async (down) => {
      hand.classList.toggle('pressed', down);
      await wait(160);
    };
    for (const step of steps) {
      if (stopped) return;
      await moveTo(step.points[0]);
      if (step.kind === 'tap') {
        await press(true);
        const r = ring(step.points[0]);
        await press(false);
        later(500, () => r.remove());
        await wait(150);
      } else if (step.kind === 'look') {
        if (step.box) outline(step.box);
        else ring(step.points[0], 'demo-ring look');
        await wait(350);
      } else {
        const pressing = step.kind === 'drag';
        if (pressing) await press(true);
        const trail = svgNode('polyline', { class: `demo-trail ${step.kind}`, points: '' });
        art.append(trail);
        const pts = step.points;
        const lengths = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
        const total = lengths.reduce((a, b) => a + b, 0) || 1;
        const drawn = [pts[0]];
        await frame(Math.min(1400, Math.max(700, total * 3)), (t) => {
          let left = ease(t) * total;
          let k = 0;
          while (k < lengths.length - 1 && left > lengths[k]) left -= lengths[k++];
          const f = lengths[k] ? Math.min(1, left / lengths[k]) : 1;
          const p = [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f];
          while (drawn.length <= k) drawn.push(pts[drawn.length]);
          trail.setAttribute('points', [...drawn, p].map((q2) => q2.map((v) => v.toFixed(1)).join(',')).join(' '));
          putHand(p);
        });
        at = pts.at(-1);
        if (pressing) await press(false);
      }
    }
    await wait(400);
    layer.classList.add('leaving');
    await wait(300);
    stop();
  };
  run();
  return true;
}
