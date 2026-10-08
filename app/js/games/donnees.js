// Organisation et gestion de données, et résolution de problèmes avec un schéma en barres :
//  - « Tableaux et graphiques » : lire un pictogramme, un tableau, un graphique en barres ;
//  - « Problèmes en schémas » : choisir le schéma en barres (le tout et les parties, la
//    comparaison) qui va avec un problème, puis calculer avec ce schéma.
// Les dessins sont fabriqués ici (chartMarkup, schemaMarkup, barModelMarkup : du HTML et du SVG
// en texte, sans DOM) et posés par render.js.

import { pick, randInt, sample, shuffle } from '../random.js';
import { numberChoices } from './helpers.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/** Espace insécable avant ? ! : ; (typographie française), comme dans la bulle de consigne. */
const fr = (s) => s.replace(/ ([?!:;])/g, ' $1');
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const sum = (list) => list.reduce((a, b) => a + b, 0);
/** n nombres distincts de lo à hi, de step en step. */
const distinct = (rng, n, lo, hi, step = 1) => sample(rng, Array.from({ length: Math.floor((hi - lo) / step) + 1 }, (_, i) => lo + i * step), n);

// ================================================================= Tableaux et graphiques

// Chaque thème : un sondage dans la classe (« Combien d’enfants aiment les pommes ? ») ou un
// comptage (les petites bêtes du jardin). Toutes les questions sont écrites ici, phrase entière.
const SURVEY = {
  count: (it) => `Combien d’enfants aiment ${it.the} ?`,
  diff: (a, b) => `Combien d’enfants de plus aiment ${a.the} que ${b.the} ?`,
  total: 'Combien d’enfants ont répondu en tout ?',
  cell: (it, col) => `Combien de ${col} aiment ${it.the} ?`,
  cols: ['filles', 'garçons'],
  unit: 'Enfants',
};

export const CHART_THEMES = [
  {
    id: 'fruits', ...SURVEY, title: 'Le fruit préféré des enfants', head: 'Fruit',
    most: 'Quel fruit est le plus aimé ?', least: 'Quel fruit est le moins aimé ?',
    items: [
      { emoji: '🍎', label: 'Pommes', the: 'les pommes' }, { emoji: '🍌', label: 'Bananes', the: 'les bananes' },
      { emoji: '🍓', label: 'Fraises', the: 'les fraises' }, { emoji: '🍒', label: 'Cerises', the: 'les cerises' },
      { emoji: '🍐', label: 'Poires', the: 'les poires' }, { emoji: '🍊', label: 'Oranges', the: 'les oranges' },
    ],
  },
  {
    id: 'animaux', ...SURVEY, title: 'L’animal préféré des enfants', head: 'Animal',
    most: 'Quel animal est le plus aimé ?', least: 'Quel animal est le moins aimé ?',
    items: [
      { emoji: '🐶', label: 'Chiens', the: 'les chiens' }, { emoji: '🐱', label: 'Chats', the: 'les chats' },
      { emoji: '🐰', label: 'Lapins', the: 'les lapins' }, { emoji: '🐟', label: 'Poissons', the: 'les poissons' },
      { emoji: '🐹', label: 'Hamsters', the: 'les hamsters' }, { emoji: '🐦', label: 'Oiseaux', the: 'les oiseaux' },
    ],
  },
  {
    id: 'sports', ...SURVEY, title: 'Le sport préféré des enfants', head: 'Sport',
    most: 'Quel sport est le plus aimé ?', least: 'Quel sport est le moins aimé ?',
    items: [
      { emoji: '⚽', label: 'Football', the: 'le football' }, { emoji: '🏀', label: 'Basket', the: 'le basket' },
      { emoji: '🚲', label: 'Vélo', the: 'le vélo' }, { emoji: '🏊', label: 'Natation', the: 'la natation' },
      { emoji: '💃', label: 'Danse', the: 'la danse' }, { emoji: '🎾', label: 'Tennis', the: 'le tennis' },
    ],
  },
  {
    id: 'jardin', title: 'Les petites bêtes du jardin', head: 'Petite bête', unit: 'Nombre',
    count: (it) => `Combien y a-t-il ${it.de} ?`,
    diff: (a, b) => `Combien y a-t-il ${a.de} de plus que ${b.de} ?`,
    total: 'Combien de petites bêtes y a-t-il en tout ?',
    cell: (it, col) => `Combien y avait-il ${it.de} ${col} ?`,
    cols: ['lundi', 'mardi'],
    most: 'Quelles petites bêtes sont les plus nombreuses ?', least: 'Quelles petites bêtes sont les moins nombreuses ?',
    items: [
      { emoji: '🦋', label: 'Papillons', the: 'les papillons', de: 'de papillons' },
      { emoji: '🐌', label: 'Escargots', the: 'les escargots', de: 'd’escargots' },
      { emoji: '🐝', label: 'Abeilles', the: 'les abeilles', de: 'd’abeilles' },
      { emoji: '🐜', label: 'Fourmis', the: 'les fourmis', de: 'de fourmis' },
      { emoji: '🐛', label: 'Chenilles', the: 'les chenilles', de: 'de chenilles' },
      { emoji: '🕷️', label: 'Araignées', the: 'les araignées', de: 'd’araignées' },
    ],
  },
];

const LEAD = { picto: 'Regarde les dessins.', table: 'Regarde le tableau.', table2: 'Regarde le tableau.', bars: 'Regarde le graphique.' };
const BAR_COLORS = ['#ffb37a', '#8ccfff', '#a8e48f', '#d2b6ff'];

/** Le dessin d'un tableau ou d'un graphique (HTML et SVG, en texte). */
export function chartMarkup(chart) {
  const title = `<p class="chart-title">${esc(chart.title)}</p>`;
  const name = (it) => `<span class="chart-emoji" aria-hidden="true">${it.emoji}</span> ${esc(it.label)}`;
  if (chart.kind === 'picto') {
    // une rangée de dessins par catégorie : chaque dessin compte pour 1 (on peut les toucher pour compter)
    return `${title}<div class="picto">${chart.items.map((it) => `<div class="picto-row"><span class="picto-label">${name(it)}</span><span class="picto-items">${
      `<span class="object">${it.emoji}</span>`.repeat(it.value)}</span></div>`).join('')}</div>`;
  }
  if (chart.kind === 'table' || chart.kind === 'table2') {
    const heads = chart.kind === 'table' ? [chart.unit] : chart.cols.map(cap);
    const rows = chart.items.map((it) => `<tr><th scope="row">${name(it)}</th>${(chart.kind === 'table' ? [it.value] : it.values).map((v) => `<td>${v}</td>`).join('')}</tr>`);
    return `${title}<table class="chart-table${chart.kind === 'table2' ? ' double' : ''}"><thead><tr><th scope="col">${esc(chart.head)}</th>${
      heads.map((hd) => `<th scope="col">${esc(hd)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
  }
  // graphique en barres : axe gradué à gauche, sous chaque barre son dessin et son nom
  const { max, step, items } = chart;
  const [x0, x1, yTop, yBottom] = [32, 276, 10, 146];
  const y = (v) => yBottom - (v / max) * (yBottom - yTop);
  const grid = [];
  for (let v = 0; v <= max; v += step) {
    grid.push(`<line x1="${x0}" y1="${y(v).toFixed(1)}" x2="${x1}" y2="${y(v).toFixed(1)}" class="${v ? 'chart-grid' : 'chart-axis'}"/>`,
      `<text x="${x0 - 5}" y="${(y(v) + 4).toFixed(1)}" class="chart-tick">${v}</text>`);
  }
  const slot = (x1 - x0) / items.length;
  const barWidth = Math.min(46, slot * 0.58);
  const bars = items.map((it, i) => {
    const cx = x0 + slot * (i + 0.5);
    const size = items.length > 3 ? 11.5 : 12.5;
    // un nom trop long pour sa place est resserré
    const fit = it.label.length * size * 0.56 > slot - 4 ? ` textLength="${(slot - 4).toFixed(1)}" lengthAdjust="spacingAndGlyphs"` : '';
    return `<rect x="${(cx - barWidth / 2).toFixed(1)}" y="${y(it.value).toFixed(1)}" width="${barWidth.toFixed(1)}" height="${(yBottom - y(it.value)).toFixed(1)}" fill="${BAR_COLORS[i % BAR_COLORS.length]}" class="chart-bar"/>`
      + `<text x="${cx.toFixed(1)}" y="${yBottom + 25}" class="chart-bar-emoji">${it.emoji}</text>`
      + `<text x="${cx.toFixed(1)}" y="${yBottom + 45}" font-size="${size}" class="chart-bar-label"${fit}>${esc(it.label)}</text>`;
  });
  return `${title}<svg viewBox="0 0 284 198" class="chart-svg" aria-hidden="true">${grid.join('')}${bars.join('')}`
    + `<line x1="${x0}" y1="${yTop - 6}" x2="${x0}" y2="${yBottom}" class="chart-axis"/></svg>`;
}

/** Ce que montre le dessin, pour les lecteurs d'écran : « Pommes : 4, Bananes : 6 ». */
export function describeChart(chart) {
  if (chart.kind === 'table2') {
    return `${chart.title}. ${chart.items.map((it) => `${it.label} : ${it.values.map((v, i) => `${v} ${chart.cols[i]}`).join(', ')}`).join(' ; ')}`;
  }
  return `${chart.title}. ${chart.items.map((it) => `${it.label} : ${it.value}`).join(', ')}`;
}

/** Les réponses d'une différence : l'écart juste, ses voisins, et les deux nombres lus (erreur fréquente). */
function diffChoices(rng, a, b, step) {
  const answer = a - b;
  const pool = [...new Set([answer - step, answer + step, a, b, answer + 2 * step])].filter((v) => v > 0 && v !== answer);
  return shuffle(rng, [answer, ...sample(rng, pool, 3)]);
}

const numbers = (values) => values.map((v) => ({ value: v, label: String(v) }));

function chartQuestion(level, rng) {
  // niveau 10 : un peu de tout (les niveaux 3 à 9)
  const kindLevel = level === 10 ? randInt(rng, 3, 9) : level;
  // jusqu'à 100 : des enfants (de toute l'école), pas 90 escargots dans le jardin
  const theme = pick(rng, kindLevel === 9 ? CHART_THEMES.filter((t) => t.cols[0] === 'filles') : CHART_THEMES);
  let kind;
  let count;
  let max = 10;
  let step = 1;
  if (kindLevel === 1) [kind, count] = ['picto', 3];
  else if (kindLevel === 2) [kind, count] = ['table', randInt(rng, 3, 4)];
  else if (kindLevel === 4 || kindLevel === 7) [kind, count] = [pick(rng, ['picto', 'table', 'bars']), kindLevel === 4 ? 4 : 3];
  else if (kindLevel === 8) [kind, count] = ['table2', 3];
  else [kind, count] = ['bars', randInt(rng, 3, 4)];
  if (kindLevel === 6) [max, step] = [20, 2];
  if (kindLevel === 9) [max, step] = rng() < 0.5 ? [30, 5] : [100, 10];
  const items = sample(rng, theme.items, count);
  if (kind === 'table2') {
    // six nombres tous différents : une erreur de ligne ou de colonne donne toujours une autre réponse
    const all = distinct(rng, count * 2, 2, 12);
    const chart = { kind, title: theme.title, head: theme.head, cols: theme.cols, items: items.map((it, i) => ({ ...it, values: all.slice(2 * i, 2 * i + 2) })) };
    const r = randInt(rng, 0, count - 1);
    const c = randInt(rng, 0, 1);
    const answer = chart.items[r].values[c];
    const others = [chart.items[r].values[1 - c], ...chart.items.filter((_, i) => i !== r).map((it) => it.values[c])];
    const question = theme.cell(chart.items[r], theme.cols[c]);
    return {
      key: `graphiques:${level}:${theme.id}:${all.join('-')}:${r}-${c}`,
      ...askChart(kind, question, chart),
      choices: numbers(shuffle(rng, [answer, ...others])),
      choiceStyle: 'numbers',
      answer,
      success: { speak: `${cap(chart.items[r].the)} : ${answer} !` },
    };
  }
  const top = kind === 'picto' ? 8 : max;
  const values = distinct(rng, count, step === 1 ? 2 : step, top, step);
  const chart = { kind, title: theme.title, head: theme.head, unit: theme.unit, max, step, items: items.map((it, i) => ({ ...it, value: values[i] })) };
  const base = `graphiques:${level}:${theme.id}:${kind}:${values.join('-')}`;

  if (kindLevel === 4) {
    // la plus grande ou la plus petite quantité (toujours une seule : les nombres sont différents)
    const most = rng() < 0.5;
    const target = chart.items.reduce((best, it) => ((most ? it.value > best.value : it.value < best.value) ? it : best));
    return {
      key: `${base}:${most ? 'plus' : 'moins'}`,
      ...askChart(kind, most ? theme.most : theme.least, chart),
      choices: chart.items.map((it) => ({ value: it.label, label: `${it.emoji} ${it.label}` })),
      choiceStyle: 'answers',
      answer: target.label,
      success: { speak: `${cap(target.the)} : ${target.value} !` },
    };
  }
  if (kindLevel === 7) {
    const answer = sum(values);
    return {
      key: `${base}:tout`,
      ...askChart(kind, theme.total, chart),
      choices: numbers(numberChoices(rng, answer, 4, 1, answer + 10)),
      choiceStyle: 'numbers',
      answer,
      success: { speak: `${values.join(' plus ')}, ça fait ${answer}.` },
    };
  }
  if (kindLevel === 5 || (kindLevel === 9 && rng() < 0.4)) {
    // combien de plus ? Toujours le plus grand moins le plus petit
    const [a, b] = sample(rng, chart.items, 2).sort((p, q) => q.value - p.value);
    const answer = a.value - b.value;
    return {
      key: `${base}:${a.label}-${b.label}`,
      ...askChart(kind, theme.diff(a, b), chart),
      choices: numbers(diffChoices(rng, a.value, b.value, step)),
      choiceStyle: 'numbers',
      answer,
      success: { speak: `${a.value} moins ${b.value}, ça fait ${answer}.` },
    };
  }
  // lire une valeur
  const target = pick(rng, chart.items);
  const answer = target.value;
  const choices = kind === 'table'
    ? shuffle(rng, values.slice(0, 3).includes(answer) ? values.slice(0, 3) : [answer, ...values.filter((v) => v !== answer).slice(0, 2)])
    : numberChoices(rng, answer, kind === 'picto' ? 3 : 4, step, kind === 'picto' ? 9 : max, step);
  return {
    key: `${base}:${target.label}`,
    ...askChart(kind, theme.count(target), chart),
    choices: numbers(choices),
    choiceStyle: 'numbers',
    answer,
    success: { speak: `${cap(target.the)} : ${answer} !` },
  };
}

/** Consigne et dessin : « Regarde le graphique. » la première fois, puis la question seule. */
function askChart(kind, question, chart) {
  return {
    text: question,
    instruction: `${LEAD[kind]} ${question}`,
    replay: [question],
    short: { key: `graphiques:${kind}`, text: question },
    stage: { type: 'chart', chart },
  };
}

export const graphiques = {
  id: 'graphiques',
  domain: 'maths',
  section: 'Nombres et calcul',
  title: 'Tableaux et graphiques',
  icon: '📊',
  skill: 'Lire un tableau, un pictogramme, un graphique en barres',
  levels: [
    'Pictogramme : compter',
    'Lire un tableau',
    'Barres de 1 en 1',
    'Le plus, le moins',
    'Combien de plus ?',
    'Barres de 2 en 2',
    'Combien en tout ?',
    'Tableau à double entrée',
    'De 5 en 5, de 10 en 10',
    'Mélange',
  ],
  generate(level, rng) {
    return chartQuestion(level, rng);
  },
};

// ================================================================= Problèmes en schémas

// Un schéma en barres (modèle en barres) :
//  - le tout et les parties : { kind: 'parts', whole, parts: [..], ask: 'whole' | n° de la partie } ;
//  - la comparaison : { kind: 'compare', rows: [{ label, value }, { label, value }], ask: 0 | 1 | 'diff' | 'total',
//    hide: [n° de barre sans nombre] } (l'écart est la case en pointillés au bout de la plus petite barre ;
//    'total' : l'accolade à droite réunit les deux barres).
// Toutes les valeurs sont vraies (calculées) ; le « ? » cache celle qu'on cherche.

/** La valeur cachée par le « ? ». */
export function askedValue(m) {
  if (m.kind === 'parts') return m.ask === 'whole' ? m.whole : m.parts[m.ask];
  const [a, b] = m.rows.map((r) => r.value);
  if (m.ask === 'diff') return Math.abs(a - b);
  if (m.ask === 'total') return a + b;
  return m.rows[m.ask].value;
}

/** Un schéma juste : des nombres entiers positifs, le tout égal à la somme des parties, deux barres différentes. */
export function validModel(m) {
  const ok = (v) => Number.isInteger(v) && v >= 1;
  if (m.kind === 'parts') return ok(m.whole) && m.parts.length >= 2 && m.parts.length <= 3 && m.parts.every(ok) && sum(m.parts) === m.whole;
  return m.rows.length === 2 && m.rows.every((r) => ok(r.value)) && m.rows[0].value !== m.rows[1].value;
}

/** Les nombres écrits sur le schéma (sans celui qu'on cherche ni les barres sans nombre). */
export function shownNumbers(m) {
  if (m.kind === 'parts') return [m.ask === 'whole' ? null : m.whole, ...m.parts.map((p, i) => (m.ask === i ? null : p))].filter((v) => v !== null);
  const hide = m.hide || [];
  const rows = m.rows.map((r, i) => (m.ask === i || hide.includes(i) ? null : r.value));
  return [...rows, m.ask === 'diff' ? null : Math.abs(m.rows[0].value - m.rows[1].value)].filter((v) => v !== null);
}

const parts = (whole, list, ask) => ({ kind: 'parts', whole, parts: list, ask });
const compare = (rows, ask, hide = []) => ({ kind: 'compare', rows, ask, hide });

/** Le schéma en barres (HTML en texte). gap : le « ? » reçoit les chiffres tapés au pavé. */
export function barModelMarkup(m, { gap = false } = {}) {
  const q = `<b class="bm-q${gap ? ' gap' : ''}">?</b>`;
  const label = (v, asked, hidden = false) => (asked ? q : hidden ? '' : `<b>${v}</b>`);
  const seg = (width, content, cls) => `<span class="bm-seg ${cls}" style="width:${width.toFixed(1)}%">${content}</span>`;
  const name = (text) => (text === null ? '' : `<span class="bm-name">${esc(text)}</span>`);
  const track = (segs) => `<span class="bm-track">${segs.join('')}</span>`;
  if (m.kind === 'parts') {
    // les petites parties gardent une place pour leur nombre (le schéma n'est pas tout à fait à l'échelle)
    const shown = m.parts.map((p) => Math.max(p, m.whole * 0.2));
    const total = sum(shown);
    return `<span class="bm bm-names">${name('Tout')}${track([seg(100, label(m.whole, m.ask === 'whole'), 'bm-whole')])}`
      + `${name('Parties')}${track(m.parts.map((p, i) => seg((shown[i] / total) * 100, label(p, m.ask === i), `bm-part bm-p${i}`)))}</span>`;
  }
  const values = m.rows.map((r) => r.value);
  const big = values[0] > values[1] ? 0 : 1;
  const small = 1 - big;
  const diff = values[big] - values[small];
  const [s, d] = [Math.max(values[small], values[big] * 0.22), Math.max(diff, values[big] * 0.22)];
  const hide = m.hide || [];
  const named = m.rows.some((r) => r.label);
  const rows = m.rows.map((r, i) => {
    const segs = i === big
      ? [seg(100, label(r.value, m.ask === i, hide.includes(i)), `bm-row${i}`)]
      : [seg((s / (s + d)) * 100, label(r.value, m.ask === i, hide.includes(i)), `bm-row${i}`), seg((d / (s + d)) * 100, label(diff, m.ask === 'diff'), 'bm-diff')];
    return `${named ? name(r.label) : ''}${track(segs)}`;
  });
  const brace = m.ask === 'total' ? `<span class="bm-brace">${q}</span>` : '';
  // l'accolade (3e colonne) se place après la première barre et couvre les deux lignes
  return `<span class="bm${named ? ' bm-names' : ''}${brace ? ' bm-total' : ''}">${rows[0]}${brace}${rows[1]}</span>`;
}

/** Ce que montre le schéma, pour les lecteurs d'écran. */
export function describeModel(m) {
  const say = (v, asked) => (asked ? 'point d’interrogation' : String(v));
  if (m.kind === 'parts') {
    return `Le tout : ${say(m.whole, m.ask === 'whole')}. Les parties : ${m.parts.map((p, i) => say(p, m.ask === i)).join(', ')}.`;
  }
  const hide = m.hide || [];
  const diff = Math.abs(m.rows[0].value - m.rows[1].value);
  return `${m.rows.map((r, i) => `${r.label || `Barre ${i + 1}`} : ${hide.includes(i) ? 'sans nombre' : say(r.value, m.ask === i)}`).join('. ')}. Écart : ${say(diff, m.ask === 'diff')}.${m.ask === 'total' ? ' Ensemble : point d’interrogation.' : ''}`;
}

/** L'histoire, et le schéma si on doit calculer avec. */
export function schemaMarkup({ text, model, gap }) {
  return `<p class="story-text schema-text">${esc(fr(text))}</p>${model ? barModelMarkup(model, { gap }) : ''}`;
}

/** « qu’Eva-Rose », « que Lou » */
const queName = (name) => (/^[aeiouyhàâäéèêëîïôöûü]/i.test(name) ? `qu’${name}` : `que ${name}`);

// Le tout et les parties : quatre petites histoires, avec 2 ou 3 parties.
const PARTS_STORIES = [
  {
    id: 'billes',
    whole: (n, p) => (p.length === 2
      ? [`${n} a ${p[0]} billes rouges et ${p[1]} billes bleues.`, `Combien de billes a ${n} en tout ?`]
      : [`${n} a ${p[0]} billes rouges, ${p[1]} billes bleues et ${p[2]} billes vertes.`, `Combien de billes a ${n} en tout ?`]),
    part: (n, w, p) => (p.length === 1
      ? [`${n} a ${w} billes : ${p[0]} rouges et des bleues.`, `Combien de billes bleues a ${n} ?`]
      : [`${n} a ${w} billes : ${p[0]} rouges, ${p[1]} bleues et des vertes.`, `Combien de billes vertes a ${n} ?`]),
  },
  {
    id: 'fleurs',
    whole: (n, p) => (p.length === 2
      ? [`${n} cueille ${p[0]} tulipes et ${p[1]} roses.`, `Combien de fleurs cueille ${n} en tout ?`]
      : [`${n} cueille ${p[0]} tulipes, ${p[1]} roses et ${p[2]} marguerites.`, `Combien de fleurs cueille ${n} en tout ?`]),
    part: (n, w, p) => (p.length === 1
      ? [`${n} cueille ${w} fleurs : ${p[0]} tulipes et des roses.`, `Combien de roses cueille ${n} ?`]
      : [`${n} cueille ${w} fleurs : ${p[0]} tulipes, ${p[1]} roses et des marguerites.`, `Combien de marguerites cueille ${n} ?`]),
  },
  {
    id: 'bus',
    whole: (n, p) => (p.length === 2
      ? [`${n} prend le bus. Il y a ${p[0]} enfants et ${p[1]} adultes.`, 'Combien de personnes y a-t-il dans le bus ?']
      : [`${n} prend le bus. Il y a ${p[0]} filles, ${p[1]} garçons et ${p[2]} adultes.`, 'Combien de personnes y a-t-il dans le bus ?']),
    part: (n, w, p) => (p.length === 1
      ? [`${n} prend le bus. Il y a ${w} personnes : ${p[0]} enfants et des adultes.`, 'Combien d’adultes y a-t-il ?']
      : [`${n} prend le bus. Il y a ${w} personnes : ${p[0]} filles, ${p[1]} garçons et des adultes.`, 'Combien d’adultes y a-t-il ?']),
  },
  {
    id: 'images',
    whole: (n, p) => (p.length === 2
      ? [`${n} a ${p[0]} images. Sa mamie lui en donne ${p[1]}.`, `Combien d’images a ${n} maintenant ?`]
      : [`${n} a ${p[0]} images. Sa mamie lui en donne ${p[1]}, puis son papi lui en donne ${p[2]}.`, `Combien d’images a ${n} maintenant ?`]),
    part: (n, w, p) => (p.length === 1
      ? [`${n} a ${w} images et en donne ${p[0]} à son copain.`, `Combien d’images reste-t-il à ${n} ?`]
      : [`${n} a ${w} images et en donne ${p[0]} à son copain, puis ${p[1]} à sa copine.`, `Combien d’images reste-t-il à ${n} ?`]),
  },
];

const THINGS = [
  { many: 'billes', de: 'de billes' }, { many: 'images', de: 'd’images' },
  { many: 'bonbons', de: 'de bonbons' }, { many: 'coquillages', de: 'de coquillages' },
];
const FRIENDS = [{ label: 'Son copain', the: 'son copain' }, { label: 'Sa copine', the: 'sa copine' }];

/**
 * Un problème : l'histoire (facts + question), son schéma juste, les schémas faux qu'on peut
 * proposer à côté (leur « ? » ne donne jamais la bonne réponse) et le calcul dit après la réponse.
 * Les nombres sont tous au moins 2 (jamais « 1 billes ») et les différences toujours positives.
 */
function makeProblem(type, rng, name, max) {
  if (type === 'whole' || type === 'part' || type === 'whole3' || type === 'part3') {
    const story = pick(rng, PARTS_STORIES);
    const three = type.endsWith('3');
    const n = three ? 3 : 2;
    // n parties d'au moins 2, différentes deux à deux, dont la somme ne dépasse pas max
    const low = max >= 100 ? 5 : 2;
    let list;
    do list = Array.from({ length: n }, () => randInt(rng, low, Math.floor(max / n) + (three ? 0 : Math.floor(max / 4))));
    while (sum(list) > max || new Set(list).size < n);
    const whole = sum(list);
    if (type.startsWith('whole')) {
      const [facts, question] = story.whole(name, list);
      const [x, y] = [Math.max(...list), Math.min(...list)];
      return {
        facts, question, model: parts(whole, list, 'whole'), story: story.id,
        wrong: three
          ? [parts(list[0] + list[1], list.slice(0, 2), 'whole'), compare([{ label: '', value: x }, { label: '', value: y }], 'diff')]
          : [parts(x, [y, x - y], 1), compare([{ label: '', value: x }, { label: '', value: y }], 'diff')],
        speech: `${list.join(' plus ')}, ça fait ${whole}.`,
      };
    }
    // une partie inconnue (la dernière) ; les autres sont données
    const known = list.slice(0, -1);
    const answer = list.at(-1);
    const [facts, question] = story.part(name, whole, known);
    return {
      facts, question, model: parts(whole, list, n - 1), story: story.id,
      wrong: three
        ? [parts(whole, [known[0], whole - known[0]], 1), parts(whole + sum(known), [whole, ...known], 'whole')]
        : [parts(whole + known[0], [whole, known[0]], 'whole'), compare([{ label: '', value: whole }, { label: '', value: whole + known[0] }], 1)],
      speech: `${whole} moins ${known.join(' moins ')}, ça fait ${answer}.`,
    };
  }
  const t = pick(rng, THINGS);
  const f = pick(rng, FRIENDS);
  const me = (value) => ({ label: name, value });
  const friend = (value) => ({ label: f.label, value });
  const ask = (q) => `Combien ${t.de} ${q} ?`;
  if (type === 'moreBig') {
    // l'autre a D de plus : on cherche son nombre (S + D) ; l'écart est plus petit que S
    const s = randInt(rng, 3, max - 2);
    const d = randInt(rng, 2, Math.min(s - 1, max - s));
    return {
      facts: `${name} a ${s} ${t.many}. ${cap(f.the)} a ${d} ${t.many} de plus ${queName(name)}.`, question: ask(`a ${f.the}`),
      model: compare([me(s), friend(s + d)], 1),
      wrong: [compare([me(s), friend(s - d)], 1), parts(s, [d, s - d], 1)],
      speech: `${s} plus ${d}, ça fait ${s + d}.`,
    };
  }
  if (type === 'lessSmall') {
    const b = randInt(rng, 5, max);
    const d = randInt(rng, 2, b - 3);
    return {
      facts: `${name} a ${b} ${t.many}. ${cap(f.the)} a ${d} ${t.many} de moins ${queName(name)}.`, question: ask(`a ${f.the}`),
      model: compare([me(b), friend(b - d)], 1),
      wrong: [compare([me(b), friend(b + d)], 1), parts(b + d, [b, d], 'whole')],
      speech: `${b} moins ${d}, ça fait ${b - d}.`,
    };
  }
  if (type === 'moreDiff' || type === 'lessDiff') {
    const big = randInt(rng, 5, max);
    const small = randInt(rng, 2, big - 2);
    const more = type === 'moreDiff'; // « de plus » : c'est l'enfant qui en a le plus
    const [mine, theirs] = more ? [big, small] : [small, big];
    return {
      facts: `${name} a ${mine} ${t.many}. ${cap(f.the)} en a ${theirs}.`, question: ask(`de ${more ? 'plus' : 'moins'} a ${name}`),
      model: compare([me(mine), friend(theirs)], 'diff'),
      wrong: [compare([me(mine), friend(mine + theirs)], 1), parts(big + small, [mine, theirs], 'whole')],
      speech: `${big} moins ${small}, ça fait ${big - small}.`,
    };
  }
  if (type === 'moreTotal' || type === 'lessTotal') {
    // deux étapes : le nombre de l'autre (A + D ou A − D), puis les deux ensemble (au plus max)
    const more = type === 'moreTotal';
    const a = randInt(rng, 4, Math.floor((max - 2) / 2));
    const d = randInt(rng, 2, more ? Math.min(a - 1, max - 2 * a) : a - 2);
    const other = more ? a + d : a - d;
    return {
      facts: `${name} a ${a} ${t.many}. ${cap(f.the)} a ${d} ${t.many} de ${more ? 'plus' : 'moins'} ${queName(name)}.`,
      question: `Combien ${t.de} ont ${name} et ${f.the} ensemble ?`,
      model: compare([me(a), friend(other)], 'total', [1]),
      wrong: more
        ? [compare([me(a), friend(a + d)], 1), parts(a + d, [a, d], 'whole')]
        : [compare([me(a), friend(a - d)], 1), parts(a, [d, a - d], 1)],
      speech: `${a} ${more ? 'plus' : 'moins'} ${d}, ça fait ${other}. ${a} plus ${other}, ça fait ${a + other}.`,
    };
  }
  throw new Error(`type de problème inconnu : ${type}`);
}

// Pour chaque niveau : les sortes de problèmes, le plus grand nombre, le nombre de schémas à comparer.
export const SCHEMA_LEVELS = [
  { types: ['whole'], max: 9, choices: 2, calcOnly: true },
  { types: ['part'], max: 9, choices: 2, calcOnly: true },
  { types: ['whole', 'part'], max: 9, choices: 2 },
  { types: ['whole', 'part'], max: 20, choices: 2 },
  { types: ['moreBig', 'moreDiff'], max: 20, choices: 3 },
  { types: ['lessSmall', 'lessDiff'], max: 20, choices: 3 },
  { types: ['whole', 'part', 'moreBig', 'moreDiff', 'lessSmall', 'lessDiff'], max: 100, choices: 3 },
  { types: ['whole3', 'part3'], max: 30, choices: 2 },
  { types: ['moreTotal', 'lessTotal', 'part3'], max: 50, choices: 3 },
];

const HINT = {
  whole: 'Le point d’interrogation est sur le tout.',
  part: 'Le point d’interrogation est sur une partie.',
  row: 'On compare les deux barres.',
  diff: 'On cherche l’écart entre les deux barres.',
  total: 'On cherche les deux barres ensemble.',
};
const hintFor = (m) => (m.kind === 'parts' ? (m.ask === 'whole' ? HINT.whole : HINT.part) : HINT[m.ask === 'diff' || m.ask === 'total' ? m.ask : 'row']);

function schemaQuestion(level, rng, index, name) {
  // niveau 10 : un mélange des niveaux 4 à 9
  const conf = SCHEMA_LEVELS[(level === 10 ? randInt(rng, 4, 9) : level) - 1];
  const p = makeProblem(pick(rng, conf.types), rng, name, conf.max);
  const answer = askedValue(p.model);
  // une question sur deux : choisir le schéma ; l'autre : calculer avec le schéma
  if (!conf.calcOnly && index % 2 === 0) {
    const options = shuffle(rng, [p.model, ...p.wrong.slice(0, conf.choices - 1)]);
    const choices = options.map((model, i) => ({ value: `s${i + 1}`, model, name: describeModel(model) }));
    const story = `${p.facts} ${p.question}`;
    return {
      key: `schemas:choisir:${p.facts}`,
      text: 'Quel schéma va avec l’histoire ?',
      instruction: `${story} Touche le schéma qui va avec l’histoire.`,
      replay: [story],
      short: { key: 'schemas:choisir', text: 'Quel schéma va avec l’histoire ?', speak: `${story} Quel schéma va avec l’histoire ?` },
      stage: { type: 'schema', text: story },
      choices,
      choiceStyle: 'schemas',
      answer: choices[options.indexOf(p.model)].value,
      problem: p,
      success: { speak: hintFor(p.model) },
    };
  }
  return {
    key: `schemas:calcul:${p.facts}`,
    interaction: 'keypad',
    text: p.question,
    instruction: `${p.facts} ${p.question}`,
    replay: [`${p.facts} ${p.question}`],
    stage: { type: 'schema', text: p.facts, model: p.model, gap: true },
    maxDigits: conf.max >= 30 ? 3 : 2,
    choices: [],
    answer,
    problem: p,
    success: { speak: p.speech },
  };
}

export const schemas = {
  id: 'schemas',
  domain: 'maths',
  section: 'Nombres et calcul',
  title: 'Problèmes en schémas',
  icon: '📏',
  skill: 'Choisir un schéma en barres pour résoudre un problème, puis calculer',
  // les questions alternent : choisir le schéma (index pair), calculer (index impair)
  formats: 2,
  levels: [
    'Trouver le tout',
    'Trouver une partie',
    'Choisir le bon schéma',
    'Jusqu’à 20',
    'Comparer : « de plus »',
    'Comparer : « de moins »',
    'Jusqu’à 100',
    'Trois parties',
    'Problèmes en deux étapes',
    'Mélange',
  ],
  generate(level, rng, index = 0, context = {}) {
    return schemaQuestion(level, rng, index, context.name || 'Lou');
  },
};

export const DONNEES_GAMES = [graphiques, schemas];
