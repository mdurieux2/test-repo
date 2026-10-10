// Fiches à imprimer : le dessin de la fiche A4 (exercices, puis corrigé pour l'adulte) et l'écran
// de l'espace parents qui la prépare (enfant, jeu, niveau, aperçu, « Imprimer »). Les exercices
// viennent de fiches.js ; la mise en page et l'impression sont dans css/fiches.css.

import { clockSvg, h, objectsGrid, renderChoiceContent, renderStage, setAides } from './render.js';
import { answerText, choiceText, ficheLevels, isPrintable, isWide, makeFiche, FICHE_MIN } from './fiches.js';
import { levelRange, nearestLevel, programFor } from './programs.js';
import { gameStats } from './storage.js';
import { seasonOf } from './themes.js';
import { findGame } from './games/index.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const noop = () => {};

function svg(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) el.setAttribute(k, v);
  for (const c of children.flat()) if (c) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}

/** Un bouton devient un simple élément : rien ne se touche sur une feuille. */
function unbutton(btn) {
  const span = document.createElement('span');
  for (const { name, value } of [...btn.attributes]) {
    if (name === 'type' || (name === 'aria-label' && value === 'Réécouter')) continue;
    span.setAttribute(name, value);
  }
  span.append(...btn.childNodes);
  return span;
}

/** Le dessin d'une question (image, calcul, schéma…), tel que dans le jeu, sans ses boutons. */
function paperStage(stage, { emptyGaps = false } = {}) {
  let el = renderStage(stage, { replay: noop, speak: noop });
  el.querySelectorAll('.text-listen, .again-btn').forEach((b) => b.remove());
  if (el.tagName === 'BUTTON') el = unbutton(el);
  el.querySelectorAll('button').forEach((b) => b.replaceWith(unbutton(b)));
  if (emptyGaps) {
    el.querySelectorAll('.gap').forEach((g) => {
      g.textContent = '';
      g.classList.add('ex-gap-box');
    });
  }
  return h('div', { class: `ex-stage st-${stage.type}` }, el);
}

const box = (cls = '') => h('span', { class: `ex-box ${cls}`.trim() });

/** Le cadran d'une horloge, avec ou sans ses aiguilles. */
function clockFace(time, { hands = true, cls = '' } = {}) {
  const { h: hours = 0, m: minutes = 0 } = time || {};
  const el = h('span', { class: `ex-clock ${cls}`.trim(), role: 'img', 'aria-label': hands ? `Horloge : ${hours} h ${minutes}` : 'Horloge sans aiguilles' });
  el.innerHTML = hands ? clockSvg(hours, minutes) : clockSvg(0, 0).replace(/<line class="hand-[^>]*\/>/g, '');
  return el;
}

/** Une opération posée en colonnes, avec les cases du résultat (vides, ou remplies dans le corrigé). */
function columnPaper({ op, rows, width }, result = null) {
  const cols = Array.from({ length: width }, (_, i) => width - 1 - i);
  const digit = (n, c) => {
    const s = String(n);
    return c < s.length ? s[s.length - 1 - c] : '';
  };
  const cells = [];
  rows.forEach((n, r) => {
    cells.push(h('span', { class: 'col-op' }, r === rows.length - 1 ? op : ''));
    cols.forEach((c) => cells.push(h('span', { class: 'col-d' }, digit(n, c))));
  });
  cells.push(h('span', { class: 'col-rule', style: { gridColumn: `1 / span ${width + 1}` } }));
  cells.push(h('span', { class: 'col-op' }));
  cols.forEach((c) => cells.push(result === null ? box('col-box') : h('span', { class: 'col-d col-res' }, digit(result, c))));
  return h('div', { class: 'ex-column', style: { '--w': width + 1 }, role: 'img', 'aria-label': rows.join(` ${op} `) }, cells);
}

/** Une grille de sudoku : la grille à compléter, ou la solution. */
function sudokuGrid({ size, box: [br, bc], puzzle, solution, symbols }, { solved = false } = {}) {
  const values = solved ? solution : puzzle;
  return h('div', { class: `ex-sudoku n${size}`, style: { '--n': size }, role: 'img', 'aria-label': `Sudoku ${size} × ${size}` },
    values.map((v, i) => {
      const r = Math.floor(i / size);
      const c = i % size;
      const cls = ['sd-cell'];
      if (c % bc === bc - 1 && c < size - 1) cls.push('box-right');
      if (r % br === br - 1 && r < size - 1) cls.push('box-bottom');
      if (solved && puzzle[i] === null) cls.push('sd-found');
      return h('span', { class: cls.join(' ') }, v === null ? '' : symbols[v]);
    }));
}

/** Un labyrinthe dessiné : les murs, le départ, l'arrivée (et les clés) ; le chemin dans le corrigé. */
function mazeSvg({ cols, rows, open, start, goal, hero, goalEmoji, items = [], itemEmoji = '🔑', solution }, { path = false } = {}) {
  const S = 10;
  const lines = [];
  for (let i = 0; i < cols * rows; i++) {
    const x = (i % cols) * S;
    const y = Math.floor(i / cols) * S;
    if (!(open[i] & 1)) lines.push(`M${x} ${y}h${S}`);
    if (!(open[i] & 8)) lines.push(`M${x} ${y}v${S}`);
    if ((i % cols) === cols - 1 && !(open[i] & 2)) lines.push(`M${x + S} ${y}v${S}`);
    if (Math.floor(i / cols) === rows - 1 && !(open[i] & 4)) lines.push(`M${x} ${y + S}h${S}`);
  }
  const centre = (i) => [(i % cols) * S + S / 2, Math.floor(i / cols) * S + S / 2];
  const label = (i, emoji) => {
    const [x, y] = centre(i);
    return svg('text', { x, y: y + 0.4, class: 'maze-emoji' }, emoji);
  };
  return h('span', { class: 'ex-maze', role: 'img', 'aria-label': `Labyrinthe de ${cols} × ${rows} cases` },
    svg('svg', { viewBox: `-1 -1 ${cols * S + 2} ${rows * S + 2}` },
      path ? svg('polyline', { class: 'maze-path', points: solution.map((i) => centre(i).join(',')).join(' ') }) : null,
      svg('path', { class: 'maze-walls', d: lines.join('') }),
      label(start, hero), label(goal, goalEmoji), items.map((i) => label(i, itemEmoji))));
}

/** Une ligne d'écriture : le modèle (départ numéroté), puis des modèles en pointillés à repasser. */
function traceRow({ strokes, lines }, copies = 4) {
  const d = (st) => st.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('');
  const glyph = (dx, cls) => svg('g', { transform: `translate(${dx} 0)`, class: cls }, strokes.map((st) => svg('path', { d: d(st) })));
  const starts = strokes.map((st, i) => svg('g', { class: 'trace-start' },
    svg('circle', { cx: st[0][0], cy: st[0][1], r: 4.2 }),
    svg('text', { x: st[0][0], y: st[0][1] + 0.3 }, String(i + 1))));
  const width = 100 * (copies + 1);
  return h('span', { class: 'ex-trace', role: 'img', 'aria-label': 'Modèle à recopier' },
    svg('svg', { viewBox: `0 0 ${width} 100`, preserveAspectRatio: 'xMinYMid meet' },
      svg('line', { class: 'trace-base', x1: 0, x2: width, y1: lines ? lines.base : 88, y2: lines ? lines.base : 88 }),
      svg('line', { class: 'trace-top', x1: 0, x2: width, y1: lines ? lines.x : 12, y2: lines ? lines.x : 12 }),
      glyph(0, 'trace-model'), svg('g', {}, starts),
      Array.from({ length: copies }, (_, k) => glyph(100 * (k + 1), 'trace-dots'))));
}

/** Les points à relier (numérotés) ; le dessin terminé dans le corrigé. */
function dotsSvg({ points, labels, close }, { drawn = false } = {}) {
  const order = labels.map((n, i) => [n, points[i]]);
  return h('span', { class: 'ex-dots', role: 'img', 'aria-label': 'Points à relier' },
    svg('svg', { viewBox: '-6 -6 112 112' },
      drawn ? svg(close ? 'polygon' : 'polyline', { class: 'dots-line', points: points.map((p) => p.join(',')).join(' ') }) : null,
      order.map(([n, [x, y]]) => svg('g', {},
        svg('circle', { cx: x, cy: y, r: 1.6, class: 'dot' }),
        svg('text', { x: x + (x > 85 ? -3 : 3), y: y - 2.6, class: `dot-num${x > 85 ? ' end' : ''}` }, String(n))))));
}

/** Un quadrillage (symétrie, dessin caché) : cases noircies, cases hachurées (réponse), trait. */
function gridSvg({ cols, rows }, { dark = [], hatch = [], axis = null, rowClues = null, colClues = null }) {
  const S = 10;
  const left = rowClues ? Math.max(1, ...rowClues.map((c) => c.length)) * 6 + 2 : 0;
  const top = colClues ? Math.max(1, ...colClues.map((c) => c.length)) * 6 + 2 : 0;
  const cell = (i, cls) => svg('rect', { x: left + (i % cols) * S, y: top + Math.floor(i / cols) * S, width: S, height: S, class: cls });
  const lines = [];
  for (let c = 0; c <= cols; c++) lines.push(`M${left + c * S} ${top}v${rows * S}`);
  for (let r = 0; r <= rows; r++) lines.push(`M${left} ${top + r * S}h${cols * S}`);
  const clues = [];
  rowClues?.forEach((list, r) => clues.push(svg('text', { x: left - 2, y: top + r * S + S / 2 + 0.3, class: 'clue row-clue' }, list.length ? list.join(' ') : '0')));
  colClues?.forEach((list, c) => (list.length ? list : [0]).forEach((n, k, all) => clues.push(svg('text', {
    x: left + c * S + S / 2, y: top - 2 - (all.length - 1 - k) * 6, class: 'clue col-clue',
  }, String(n)))));
  const axisLine = axis === 'v'
    ? svg('line', { class: 'grid-axis', x1: left + (cols * S) / 2, x2: left + (cols * S) / 2, y1: top - 3, y2: top + rows * S + 3 })
    : axis === 'h' ? svg('line', { class: 'grid-axis', y1: top + (rows * S) / 2, y2: top + (rows * S) / 2, x1: left - 3, x2: left + cols * S + 3 }) : null;
  return svg('svg', { viewBox: `${-4} ${-4} ${left + cols * S + 8} ${top + rows * S + 8}` },
    dark.map((i) => cell(i, 'cell-dark')), hatch.map((i) => cell(i, 'cell-hatch')),
    svg('path', { class: 'grid-lines', d: lines.join('') }), axisLine, clues);
}

/** Motif de hachures (cases de la réponse) : dans chaque dessin, une seule fois par page. */
function hatchDefs() {
  return svg('svg', { class: 'fiche-defs', width: 0, height: 0, 'aria-hidden': 'true' },
    svg('defs', {}, svg('pattern', { id: 'fiche-hachures', width: 3, height: 3, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' },
      svg('line', { x1: 0, y1: 0, x2: 0, y2: 3, stroke: '#000', 'stroke-width': 1.4 }))));
}

/** Un élément d'une liste à ranger : image (à sa taille) et légende, ou étiquette écrite. */
function orderFace(item, lang) {
  if (item.emoji) {
    return h('span', { class: 'ord-pic' },
      h('span', { class: 'ord-emoji', style: { '--scale': item.scale ?? 1 }, 'aria-hidden': item.caption ? 'true' : undefined }, item.emoji),
      item.caption ? h('span', { class: 'ord-caption' }, item.caption) : null);
  }
  return h('span', { class: 'ord-tile', lang: lang || undefined }, item.label);
}

/** Ce qu'on voit à gauche d'une ligne « Relie » : les objets à compter, l'image ou le calcul. */
function matchLeft(pair) {
  if (pair.objects) return objectsGrid(pair.objects.emoji, pair.objects.count, 5, 'small');
  if (pair.emoji) return h('span', { class: 'match-emoji', role: 'img', 'aria-label': pair.left }, pair.emoji);
  return h('span', {}, pair.left);
}

// ---------------------------------------------------------------- Les exercices

function exerciseBody(ex) {
  switch (ex.kind) {
    case 'choice':
      return [
        ex.stage.type !== 'none' && !ex.sharedStage ? paperStage(ex.stage) : null,
        h('div', { class: `ex-choices${ex.tick ? ' tick' : ''} cs-${ex.choiceStyle || 'none'} n${ex.choices.length}` },
          ex.choices.map((c) => h('span', { class: 'ex-choice', lang: c.lang || undefined },
            ex.tick ? box('ex-tickbox') : null, h('span', { class: 'ex-choice-content' }, renderChoiceContent(c))))),
      ];
    case 'number': {
      const stage = ex.stage.type !== 'none' ? paperStage(ex.stage, { emptyGaps: true }) : null;
      const hasGap = stage?.querySelector('.ex-gap-box');
      return [stage, hasGap ? null : h('p', { class: 'ex-answer' }, 'Réponse : ', box('ex-answer-box'))];
    }
    case 'fill':
      return h('div', { class: 'ex-fill' },
        h('p', { class: 'ex-tiles' }, h('span', { class: 'ex-tiles-label' }, 'Nombres à placer :'), ex.tiles.map((n) => h('span', { class: 'ex-tile' }, n))),
        h('div', { class: 'ex-fill-rows' }, ex.equations.map((eq) => h('p', { class: 'ex-fill-row' },
          box(), h('span', { class: 'op' }, eq.op), box(), h('span', { class: 'op' }, '='), h('span', { class: 'num' }, eq.result)))));
    case 'match':
      return h('div', { class: 'ex-match' }, ex.pairs.flatMap((p, i) => [
        h('span', { class: 'match-l' }, matchLeft(p), h('span', { class: 'match-dot', 'aria-hidden': 'true' })),
        h('span', { class: 'match-gap' }),
        h('span', { class: 'match-r', lang: ex.rightLang || undefined }, h('span', { class: 'match-dot', 'aria-hidden': 'true' }), String(ex.rights[i])),
      ]));
    case 'order': {
      const stage = ex.stage.type !== 'none' ? paperStage(ex.stage) : null;
      if (ex.mode === 'write') {
        return [stage, h('div', { class: 'ord-tiles' }, ex.items.map((it) => orderFace(it, ex.lang))),
          h('p', { class: 'ex-write' }, h('span', { class: 'ex-write-line' }))];
      }
      if (ex.items.some((it) => it.emoji)) {
        return [stage, h('div', { class: `ord-pics n${ex.items.length}` }, ex.items.map((it) => h('span', { class: 'ord-item' }, orderFace(it), box('ord-box'))))];
      }
      return [stage, h('div', { class: 'ord-tiles' }, ex.items.map((it) => orderFace(it, ex.lang))),
        h('p', { class: 'ord-slots' }, ex.sorted.flatMap((_, i) => (i && ex.sign ? [h('span', { class: 'op' }, ex.sign), box('ord-slot')] : [box('ord-slot')])))];
    }
    case 'column':
      return columnPaper(ex.stage);
    case 'clock':
      return clockFace(null, { hands: false });
    case 'sudoku':
      return sudokuGrid(ex.stage);
    case 'maze':
      return mazeSvg(ex.stage);
    case 'trace':
      return traceRow(ex.stage);
    case 'dots':
      return dotsSvg(ex.stage);
    case 'symmetry':
      return h('span', { class: 'ex-grid', role: 'img', 'aria-label': 'Quadrillage' }, gridSvg(ex.stage, { dark: ex.stage.model, axis: ex.stage.axis }));
    case 'picross':
      return h('span', { class: 'ex-grid', role: 'img', 'aria-label': 'Dessin caché' }, gridSvg(ex.stage, {
        dark: ex.stage.given || [], rowClues: ex.stage.rowClues, colClues: ex.stage.colClues,
      }));
    default:
      return null;
  }
}

function exerciseItem(ex, n, sameText) {
  const content = h('div', { class: 'ex-content' }, exerciseBody(ex));
  if (!sameText) {
    // un petit texte se lit avant sa question ; sinon la question vient d'abord
    const question = h('p', { class: 'ex-text' }, ex.text);
    const text = ex.stage?.type === 'text' ? content.querySelector('.ex-stage') : null;
    if (text) text.after(question);
    else content.prepend(question);
  }
  return h('li', { class: `ex exk-${ex.kind}${isWide(ex) ? ' wide' : ''}`, 'data-ex': n },
    h('span', { class: 'ex-num', 'aria-hidden': 'true' }, n), content);
}

/** La réponse d'un exercice, pour le corrigé : en petit dessin quand c'est plus clair. */
function answerBody(ex) {
  switch (ex.kind) {
    case 'choice': {
      const c = ex.choices[ex.answer];
      // des crayons à comparer : leur place dans la liste (la couleur ne s'imprime pas toujours)
      const text = c.bar ? `le ${ex.answer ? `${ex.answer + 1}e` : '1er'} crayon (${choiceText(c)})` : choiceText(c);
      const content = renderChoiceContent(c);
      const visual = typeof content !== 'string';
      return [visual ? h('span', { class: 'ans-visual' }, content) : null, h('b', {}, text)];
    }
    case 'clock':
      return [clockFace(ex.target, { cls: 'mini' }), h('b', {}, ex.answer)];
    case 'column':
      return columnPaper(ex.stage, ex.answer);
    case 'fill':
      return [h('span', { class: 'muted-print' }, 'Une solution : '), h('b', {}, answerText(ex))];
    case 'match':
      return h('span', { class: 'ans-pairs' }, ex.pairs.map((p) => h('span', { class: 'ans-pair' },
        p.objects ? `${p.objects.count} ${p.objects.emoji}` : p.emoji ? `${p.emoji} ${p.left}` : p.left, ' → ', h('b', { lang: ex.rightLang || undefined }, String(p.right)))));
    case 'order':
      if (ex.mode === 'write') return h('b', { lang: ex.lang || undefined }, ex.answer);
      return h('span', { class: 'ans-order' }, ex.sorted.flatMap((it, i) => [
        i ? h('span', { class: 'op' }, ex.sign || '→') : null,
        it.emoji ? h('span', { class: 'ord-emoji mini', style: { '--scale': it.scale ?? 1 }, title: it.label || undefined }, it.emoji) : h('b', { lang: ex.lang || undefined }, it.label),
      ]));
    case 'sudoku':
      return sudokuGrid(ex.stage, { solved: true });
    case 'maze':
      return mazeSvg(ex.stage, { path: true });
    case 'trace':
      return h('b', {}, ex.answer);
    case 'dots':
      return [dotsSvg(ex.stage, { drawn: true }), h('b', {}, ex.answer)];
    case 'symmetry':
      return h('span', { class: 'ex-grid' }, gridSvg(ex.stage, { dark: ex.stage.model, hatch: ex.stage.solution, axis: ex.stage.axis }));
    case 'picross':
      return [h('span', { class: 'ex-grid' }, gridSvg(ex.stage, { hatch: ex.stage.solution, rowClues: ex.stage.rowClues, colClues: ex.stage.colClues })), h('b', {}, ex.answer)];
    default:
      return h('b', {}, answerText(ex));
  }
}

const BIG_ANSWERS = new Set(['sudoku', 'maze', 'dots', 'symmetry', 'picross']);

/** La date du jour, écrite en entier : « jeudi 8 octobre 2026 ». */
export function longDate(date = new Date()) {
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** La fiche : page 1, les exercices ; page 2, le corrigé (pour l'adulte). */
export function ficheElement(fiche, { name = '', date = longDate(), levelNumber = fiche.level } = {}) {
  // sur le papier, chaque couleur est aussi écrite (impression en noir et blanc)
  setAides({ namedColors: true, domain: findGame(fiche.gameId)?.domain ?? null });
  const header = (corrige) => h('header', { class: 'fiche-head' },
    h('div', { class: 'fiche-title' },
      h('span', { class: 'fiche-icon', 'aria-hidden': 'true' }, fiche.icon),
      h('h2', {}, corrige ? `Corrigé : ${fiche.title}` : fiche.title),
      h('span', { class: 'fiche-level' }, `Niveau ${levelNumber} · ${fiche.levelLabel}`)),
    corrige
      ? h('p', { class: 'fiche-for' }, fiche.exercises.some((e) => e.kind === 'trace')
        ? 'Pour l’adulte : regardez surtout le sens des traits (chaque trait part du point numéroté).'
        : 'Pour l’adulte : les réponses de la fiche, dans l’ordre.')
      : h('p', { class: 'fiche-who' },
        h('span', {}, 'Prénom : ', h('b', { class: 'fiche-name' }, name || '…………………')),
        h('span', {}, 'Date : ', h('b', {}, date))));
  const exercises = fiche.exercises;
  const page1 = h('section', { class: 'fiche-page fiche-exercices', 'aria-label': 'Page 1 : les exercices' },
    header(false),
    h('p', { class: 'fiche-consigne' }, h('b', {}, 'Consigne : '), fiche.consigne),
    h('ol', { class: 'fiche-list' }, exercises.map((ex, i) => exerciseItem(ex, i + 1, fiche.sameText))),
    h('footer', { class: 'fiche-foot' }, h('span', {}, 'Bravo ! ⭐ Colorie une étoile : ☆ ☆ ☆')));
  const page2 = h('section', { class: 'fiche-page fiche-corrige', 'aria-label': 'Page 2 : le corrigé' },
    header(true),
    h('ol', { class: 'corrige-list' }, exercises.map((ex, i) => h('li', {
      class: `ans ans-${ex.kind}${BIG_ANSWERS.has(ex.kind) ? ' big' : ''}${['match', 'fill'].includes(ex.kind) ? ' wide' : ''}`, 'data-ans': i + 1,
    }, h('span', { class: 'ex-num', 'aria-hidden': 'true' }, i + 1), h('span', { class: 'ans-body' }, answerBody(ex))))));
  return h('div', { class: 'fiche-sheets' }, hatchDefs(), page1, page2);
}

const MM = 96 / 25.4; // pixels CSS par millimètre

/**
 * Les dessins repris du jeu (tableaux, graphiques, scènes…) sont faits pour l'écran : trop grands
 * pour une case de la feuille, on les réduit (zoom) à 46 mm de haut et à la largeur de la case.
 */
function shrinkStages(sheets) {
  for (const stage of sheets.querySelectorAll('.ex-stage')) {
    const inner = stage.firstElementChild;
    if (!inner) continue;
    const limit = (stage.closest('.wide') ? 60 : 46) * MM;
    const height = inner.offsetHeight;
    const width = inner.scrollWidth;
    const zoom = Math.min(1, limit / Math.max(1, height), stage.clientWidth / Math.max(1, width));
    if (zoom < 0.98) inner.style.zoom = String(Math.max(0.3, zoom).toFixed(3));
  }
  return sheets;
}

/**
 * De combien (en pixels de la feuille) la liste dépasse la zone utile : la feuille moins sa marge du
 * bas (12 mm) et 2 mm de sécurité (à l'impression, la feuille est 1 mm plus courte). Mesuré sur
 * les rectangles affichés, pour tenir compte de la réduction de l'aperçu et du zoom de la liste.
 */
function excess(page) {
  const list = page.querySelector('.fiche-list, .corrige-list');
  if (!list) return 0;
  const box = page.getBoundingClientRect();
  if (!box.height) return 0;
  const bottom = ((list.getBoundingClientRect().bottom - box.top) / box.height) * page.clientHeight;
  return bottom - (page.clientHeight - 14 * MM);
}

/**
 * Retire les derniers exercices tant que la page déborde de sa feuille A4 (sans descendre sous 6).
 * La feuille doit être dans la page (on mesure sa hauteur). Renvoie la fiche ajustée.
 */
export function fitFiche(fiche, render) {
  let sheets = shrinkStages(render(fiche));
  const overflows = () => [...sheets.querySelectorAll('.fiche-page')].some((p) => excess(p) > 0);
  while (overflows() && fiche.exercises.length > FICHE_MIN) {
    fiche = { ...fiche, exercises: fiche.exercises.slice(0, -1) };
    sheets = shrinkStages(render(fiche));
  }
  // encore trop long avec 6 exercices : toute la liste est un peu réduite
  for (const page of sheets.querySelectorAll('.fiche-page')) {
    const list = page.querySelector('.fiche-list, .corrige-list');
    let zoom = 1;
    for (let k = 0; list && k < 8 && excess(page) > 0 && zoom > 0.5; k++) {
      const height = list.offsetHeight * zoom;
      zoom = Math.max(0.5, zoom * ((height - excess(page) - 4) / height));
      list.style.zoom = zoom.toFixed(3);
    }
  }
  return fiche;
}

// ---------------------------------------------------------------- L'écran (espace parents)

// le dernier choix des parents, gardé tant que l'app est ouverte
const memo = { childId: null, gameId: null, level: null };

/** Les jeux du programme de la classe qui ont une fiche, rangés par rubrique, avec leurs niveaux imprimables. */
export function ficheChoices(kid) {
  return programFor(kid.grade).map((domain) => ({
    ...domain,
    games: domain.games.filter(({ game }) => isPrintable(game.id)).map(({ game, min, levels }) => ({
      game, min, classLevels: levels, levels: ficheLevels(game).filter((l) => levels.includes(l)),
    })).filter((g) => g.levels.length),
  })).filter((d) => d.games.length);
}

/** Niveau proposé : celui où joue l'enfant (ou le niveau imprimable le plus proche). */
function defaultLevel(kid, entry) {
  const { min, levels } = levelRange(kid.grade, entry.game.id);
  const current = nearestLevel(levels, gameStats(kid, entry.game.id, min).level);
  return entry.levels.reduce((best, l) => (Math.abs(l - current) < Math.abs(best - current) ? l : best), entry.levels[0]);
}

/**
 * L'écran « Fiches à imprimer ». `deps` : { store, show, topBar, onBack, childId, gameId }.
 * L'enfant, le jeu et le niveau se choisissent en haut ; l'aperçu de la fiche est dessous.
 */
export function fichesScreen(deps) {
  const { store, show, topBar, onBack } = deps;
  const childId = [deps.childId, memo.childId, store.active, store.order[0]].find((id) => id && store.profiles[id]);
  const kid = store.profiles[childId];
  const choices = ficheChoices(kid);
  const entries = choices.flatMap((d) => d.games);
  const entry = entries.find((e) => e.game.id === (deps.gameId || memo.gameId)) || entries[0];
  const level = entry && memo.childId === childId && memo.gameId === entry.game.id && entry.levels.includes(memo.level)
    ? memo.level : entry ? defaultLevel(kid, entry) : null;
  Object.assign(memo, { childId, gameId: entry?.game.id ?? null, level });
  const again = (next) => fichesScreen({ ...deps, ...next });

  const childTabs = store.order.length > 1
    ? h('div', { class: 'segmented tabs child-tabs fiche-children', role: 'group', 'aria-label': 'Enfant' }, store.order.map((id) => h('button', {
      class: id === childId ? 'seg on' : 'seg', 'data-fiche-child': id, 'aria-pressed': String(id === childId),
      onclick: () => { memo.gameId = null; again({ childId: id, gameId: null }); },
    }, store.profiles[id].name)))
    : null;
  if (!entry) {
    show(h('main', { class: 'screen parents fiches', 'data-title': 'Fiches à imprimer' },
      topBar({ onBack, title: 'Fiches à imprimer' }), childTabs,
      h('section', { class: 'card' }, h('p', {}, `Aucun jeu de ${kid.name} ne s’imprime pour l’instant.`))));
    return;
  }
  const { levels: classLevels } = levelRange(kid.grade, entry.game.id);
  const gameSelect = h('select', { class: 'select', id: 'fiche-game', 'data-fiche-game': '' },
    choices.map((d) => h('optgroup', { label: `${d.icon} ${d.title}` },
      d.games.map((e) => h('option', { value: e.game.id, selected: e.game.id === entry.game.id }, `${e.game.icon} ${e.game.title}`)))));
  gameSelect.addEventListener('change', () => {
    memo.level = null;
    again({ childId, gameId: gameSelect.value });
  });
  const levelSelect = h('select', { class: 'select', id: 'fiche-level', 'data-fiche-level': '' },
    entry.levels.map((l) => h('option', { value: l, selected: l === level }, `Niveau ${classLevels.indexOf(l) + 1} : ${entry.game.levels[l - 1]}`)));
  levelSelect.addEventListener('change', () => {
    memo.level = Number(levelSelect.value);
    draw();
  });

  const status = h('p', { class: 'muted small fiche-status', role: 'status' });
  const scaler = h('div', { class: 'fiche-scale' });
  const preview = h('div', { class: 'fiche-preview', role: 'region', 'aria-label': 'Aperçu de la fiche' }, scaler);
  let seed = Date.now();
  // l'aperçu tient dans la largeur de l'écran (la feuille garde sa taille A4 pour l'impression)
  const rescale = () => {
    const sheets = scaler.firstElementChild;
    if (!sheets || !preview.isConnected) return;
    const scale = Math.min(1, preview.clientWidth / sheets.offsetWidth);
    scaler.style.setProperty('--scale', String(scale));
    scaler.style.height = `${Math.ceil(sheets.offsetHeight * scale)}px`;
  };
  const draw = () => {
    const lvl = Number(levelSelect.value);
    let fiche = makeFiche(entry.game, lvl, { seed, name: kid.name, season: seasonOf(new Date()).id });
    if (!fiche) {
      scaler.replaceChildren();
      status.textContent = 'Ce niveau ne donne pas assez d’exercices à imprimer. Choisissez un autre niveau.';
      return;
    }
    const render = (f) => {
      const sheets = ficheElement(f, { name: kid.name, levelNumber: classLevels.indexOf(lvl) + 1 });
      scaler.replaceChildren(sheets);
      return sheets;
    };
    fiche = fitFiche(fiche, render);
    scaler.dataset.count = String(fiche.exercises.length);
    status.textContent = `${fiche.exercises.length} exercices, et le corrigé en page 2.`;
    rescale();
  };
  const screen = h('main', { class: 'screen parents fiches', 'data-title': 'Fiches à imprimer' },
    topBar({ onBack, title: 'Fiches à imprimer' }),
    h('section', { class: 'card fiche-form' },
      h('p', { class: 'muted small' }, 'Pour les jours sans écran : une feuille A4 d’exercices du jeu choisi, au niveau de l’enfant, avec le corrigé en page 2.'),
      childTabs,
      h('label', { class: 'fiche-field', for: 'fiche-game' }, h('span', {}, 'Jeu'), gameSelect),
      h('label', { class: 'fiche-field', for: 'fiche-level' }, h('span', {}, 'Niveau'), levelSelect),
      h('div', { class: 'fiche-actions' },
        h('button', { class: 'big-btn primary', 'data-fiche-print': '', onclick: () => window.print() }, '🖨️ Imprimer'),
        h('button', { class: 'big-btn', 'data-fiche-new': '', onclick: () => { seed += 7919; draw(); } }, '🔄 Autres exercices'),
        h('button', { class: 'big-btn', 'data-fiche-back': '', onclick: onBack }, 'Retour')),
      status),
    preview);
  show(screen);
  draw();
  if (typeof ResizeObserver === 'function') new ResizeObserver(rescale).observe(preview);
}
