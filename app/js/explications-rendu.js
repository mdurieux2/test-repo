// Rendu de l'explication donnée après une première erreur (données : explications.js) :
// un petit encart dans la zone de retour, sous « Essaie encore ! » en plus petit.
// Les dessins (boîtes de 10, points, tableau des chiffres) répètent ce qui est écrit : ils sont
// cachés aux lecteurs d'écran, qui lisent les étapes. Ce qui distingue les points n'est jamais la
// couleur seule : point plein (le nombre de départ), rond creux (ce qu'on ajoute), point barré
// (ce qu'on enlève), case vide.

import { h } from './render.js';

/** Une étape : un calcul, ou une phrase avec un morceau mis en valeur (et ✔ / ✘ pour un essai). */
function stepEl(step) {
  if (typeof step === 'string') return h('span', { class: 'explain-step explain-calc' }, step);
  const { text, em, ok, at } = step;
  // le morceau mis en valeur : à sa place (at), sinon sa dernière apparition (« on ajoute e. »)
  const i = !em ? -1 : Number.isInteger(at) && text.startsWith(em, at) ? at : text.lastIndexOf(em);
  const body = i < 0 ? [text] : [text.slice(0, i), h('strong', { class: 'explain-em' }, em), text.slice(i + em.length)];
  const mark = ok === undefined ? null
    : h('span', { class: `explain-ok ${ok ? 'yes' : 'no'}`, role: 'img', 'aria-label': ok ? 'oui, ça marche' : 'non, ça ne marche pas' }, ok ? '✔' : '✘');
  return h('span', { class: 'explain-step explain-text' }, ...body, mark ? ' ' : null, mark);
}

const cell = (mark) => h('span', { class: `ec${mark ? ` ec-${mark}` : ''}` });

function framesEl({ frames, size = 10 }) {
  return h('div', { class: 'explain-frames', 'aria-hidden': 'true' },
    frames.map((marks) => h('div', { class: `explain-frame size-${size}` }, marks.map(cell))));
}

function groupsEl({ rows }) {
  return h('div', { class: 'explain-groups', 'aria-hidden': 'true' },
    rows.map((n) => h('div', { class: 'eg-row' }, Array.from({ length: n }, () => cell('a')))));
}

const PLACE_TITLES = { c: 'centaines', d: 'dizaines', u: 'unités' };

function placesEl({ heads, rows, mark }) {
  const td = (content, i, tag = 'td') => h(tag, { class: i === mark ? 'mark' : null }, content);
  return h('table', { class: 'explain-places', 'aria-hidden': 'true' },
    h('thead', {}, h('tr', {}, heads.map((head, i) => td(h('abbr', { title: PLACE_TITLES[head] }, head), i, 'th')))),
    h('tbody', {}, rows.map((digits) => h('tr', {}, digits.map((d, i) => td(d, i))))));
}

function gridEl({ cells }) {
  return h('div', { class: 'explain-grid' },
    cells.map(({ text, em }) => h(em ? 'strong' : 'span', { class: `eg-cell${em ? ' em' : ''}` }, text)));
}

const VISUALS = { frames: framesEl, groups: groupsEl, places: placesEl, grid: gridEl };

const floating = (box) => getComputedStyle(box.closest('.feedback') || box).position === 'fixed';

/**
 * L'encart dépasse-t-il du bas de l'écran (ou pousse-t-il les réponses dehors) ? En paysage, où il
 * flotte en haut de l'écran, cache-t-il les réponses ?
 */
function overflows(box) {
  const bottom = window.innerHeight + 1;
  const r = box.getBoundingClientRect();
  const zone = box.closest('.screen')?.querySelector('.choices')?.getBoundingClientRect();
  if (r.bottom > bottom || (zone && zone.bottom > bottom) || document.documentElement.scrollWidth > window.innerWidth) return true;
  if (!floating(box)) return false;
  // la bulle ne cache ni les réponses ni la question (le calcul, la phrase, le dessin)
  const hidden = [zone, ...[...(box.closest('.screen')?.querySelectorAll('.stage > :not(.count-reset)') || [])].map((el) => el.getBoundingClientRect())];
  return hidden.some((z) => z && z.width > 0 && r.bottom > z.top + 1 && r.top < z.bottom - 1 && r.right > z.left + 1 && r.left < z.right - 1);
}

// De plus en plus serré : en paysage, d'abord au-dessus de la colonne de gauche (pas sur les
// réponses) ; puis sans la règle écrite (elle est dite, et écrite dans les sous-titres), sans le
// dessin (les étapes disent la même chose), enfin « Essaie encore ! » tout seul.
const FIT_STEPS = ['explain-side', 'explain-compact', 'explain-tiny', 'explain-none'];

/**
 * Après l'affichage : si l'encart ne tient pas (petit écran, texte très grand), il se resserre
 * jusqu'à tenir, pour que les réponses restent dans l'écran.
 */
export function fitExplanation(box) {
  if (!box?.isConnected) return;
  for (const step of FIT_STEPS) {
    if (!overflows(box)) return;
    if (step !== 'explain-side' || floating(box)) box.classList.add(step);
  }
}

/**
 * L'encart : « Essaie encore ! » en petit, puis la règle (pour le français : ce que dit Estelle,
 * aussi écrit), les étapes et le dessin.
 */
export function explanationBox(ex) {
  const rule = ex.say && !ex.say.startsWith('Regarde') ? h('p', { class: 'explain-rule' }, ex.say) : null;
  const visual = ex.visual && VISUALS[ex.visual.type] ? VISUALS[ex.visual.type](ex.visual) : null;
  return h('div', { class: 'explain' },
    h('p', { class: 'try-again try-small' }, 'Essaie encore !'),
    h('div', { class: `explain-card${visual ? ' has-visual' : ''}`, role: 'note', 'aria-label': 'Pour t’aider' },
      rule,
      ex.steps.length ? h('p', { class: 'explain-steps' }, ex.steps.map(stepEl)) : null,
      visual));
}
