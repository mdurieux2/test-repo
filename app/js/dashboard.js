// Tableau de bord des parents : activité de la semaine, compétences, points à retravailler.

import { findGame } from './games/index.js';
import { CALC_PALIERS } from './games/maths.js';
import { fluenceBenchmark, fluenceSummary, fluenceWeeks, wordReadings } from './games/fluence.js';
import { GRADE_GOALS, nearestLevel, programFor } from './programs.js';
import { GRADES, gameStats } from './storage.js';
import { h } from './render.js';
import { resumeSons } from './graphemes.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Date locale « AAAA-MM-JJ ». */
export function dayKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Activité des 7 derniers jours (aujourd'hui compris), du plus ancien au plus récent. */
export function lastSevenDays(history, now = Date.now()) {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now - (6 - i) * DAY_MS);
    const key = dayKey(date);
    const sessions = history.filter((s) => dayKey(s.at) === key);
    return {
      date,
      key,
      sessions: sessions.length,
      minutes: Math.round(sessions.reduce((sum, s) => sum + (s.seconds || 0), 0) / 60),
      correct: sessions.reduce((sum, s) => sum + s.correct, 0),
      total: sessions.reduce((sum, s) => sum + s.total, 0),
    };
  });
}

/** Nombre de jours d'affilée avec au moins une partie (la série reste active si l'enfant a joué hier). */
export function streakDays(history, now = Date.now()) {
  const days = new Set(history.map((s) => dayKey(s.at)));
  const offset = days.has(dayKey(now)) ? 0 : 1;
  let streak = 0;
  while (days.has(dayKey(now - (offset + streak) * DAY_MS))) streak++;
  return streak;
}

/** État d'une compétence pour les parents. */
export function skillStatus(stats, max) {
  if (!stats.answered) return 'todo';
  if (stats.level >= max && stats.answered >= 10 && stats.correct / stats.answered >= 0.8) return 'done';
  return 'doing';
}

const STATUS = {
  todo: { icon: '⚪', label: 'Pas commencé' },
  doing: { icon: '🟡', label: 'En cours' },
  done: { icon: '✅', label: 'Acquis' },
};

/** Confusions les plus fréquentes (même jeu, même réponse attendue, même erreur). */
export function frequentMistakes(mistakes, limit = 5) {
  const counts = new Map();
  for (const m of mistakes) {
    if (m.expected === null || m.expected === undefined) continue;
    if (typeof m.given !== 'number' && typeof m.given !== 'string') continue;
    if (m.given === 'calcul faux' || m.given === 'solution montrée') continue;
    const key = `${m.game}|${m.expected}|${m.given}`;
    counts.set(key, { ...m, count: (counts.get(key)?.count || 0) + 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

function statTile(label, value) {
  return h('div', { class: 'stat-tile' }, h('span', { class: 'stat-label' }, label), h('span', { class: 'stat-value' }, value));
}

const DAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/** Histogramme du temps de jeu par jour (une seule série : pas de légende, le titre la nomme). */
function activityChart(days) {
  const max = Math.max(...days.map((d) => d.minutes), 1);
  const peak = days.reduce((best, d) => (d.minutes > best.minutes ? d : best), days[0]);
  const caption = h('p', { class: 'chart-caption muted small', 'aria-live': 'polite' });
  const describe = (d) => `${DAY_NAMES[d.date.getDay()]} ${d.date.getDate()} : ${d.minutes} min · ${d.sessions} partie${d.sessions > 1 ? 's' : ''}`;
  const columns = days.map((d, i) => {
    const today = i === days.length - 1;
    const showValue = d.minutes > 0 && (today || d === peak);
    const bar = h('span', { class: d.minutes ? 'bar-fill' : 'bar-fill empty', style: { height: `${Math.max(2, (d.minutes / max) * 100)}%` } });
    return h('button', {
      class: today ? 'chart-col today' : 'chart-col',
      'aria-label': describe(d),
      onclick: () => { caption.textContent = describe(d); },
    },
    h('span', { class: 'bar-area' }, showValue ? h('span', { class: 'bar-value', style: { bottom: `${(d.minutes / max) * 100}%` } }, `${d.minutes}`) : null, bar),
    h('span', { class: 'bar-day' }, DAY_NAMES[d.date.getDay()][0].toUpperCase()));
  });
  return h('figure', { class: 'chart' },
    h('figcaption', { class: 'chart-title' }, 'Minutes de jeu par jour'),
    h('div', { class: 'chart-cols' }, columns),
    caption);
}

function relativeDay(iso) {
  if (!iso) return 'jamais';
  const diff = Math.round((new Date(dayKey(Date.now())) - new Date(dayKey(iso))) / DAY_MS);
  if (diff <= 0) return "aujourd'hui";
  if (diff === 1) return 'hier';
  return `il y a ${diff} jours`;
}

function gameRow(kid, { game, min, max, levels }, onChange) {
  if (game.paliers) {
    const range = CALC_PALIERS.slice(min - 1, max);
    const done = range.filter((p) => (kid.paliers[p.id]?.stars || 0) >= 3).length;
    const started = range.some((p) => kid.paliers[p.id]);
    const status = !started ? 'todo' : done === range.length ? 'done' : 'doing';
    const next = range.find((p) => (kid.paliers[p.id]?.stars || 0) < 3);
    return h('div', { class: 'game-row', 'data-game': game.id },
      h('div', { class: 'game-row-head' },
        h('span', { class: 'game-row-title' }, `${game.icon} ${game.title}`),
        h('span', { class: `status status-${status}` }, STATUS[status].icon, ' ', STATUS[status].label)),
      h('p', { class: 'muted small' }, `${done}/${range.length} paliers réussis (3 étoiles ou plus)${next ? ` · prochain : ${next.op}${next.max}` : ''}`));
  }
  const stats = gameStats(kid, game.id, min);
  const level = nearestLevel(levels, stats.level);
  const status = skillStatus({ ...stats, level }, max);
  const rate = stats.answered ? Math.round((100 * stats.correct) / stats.answered) : null;
  const select = h('select', { class: 'select level-select', 'aria-label': `Niveau de ${game.title}` },
    levels.map((l, i) => h('option', { value: l, selected: l === level }, `${i + 1}. ${game.levels[l - 1]}`)));
  select.addEventListener('change', () => {
    kid.games[game.id] = { ...stats, level: Number(select.value), streak: 0, recent: [] };
    onChange();
  });
  return h('div', { class: 'game-row', 'data-game': game.id },
    h('div', { class: 'game-row-head' },
      h('span', { class: 'game-row-title' }, `${game.icon} ${game.title}`),
      h('span', { class: `status status-${status}` }, STATUS[status].icon, ' ', STATUS[status].label)),
    select,
    h('p', { class: 'muted small' },
      game.skill,
      stats.answered ? ` · ${rate} % de réussite · ${stats.sessions} partie${stats.sessions > 1 ? 's' : ''} · ${relativeDay(stats.lastPlayed)}` : ''));
}

// ---- Lecture à voix haute (jeu « Lire à voix haute ») : dernier et meilleur score, évolution par semaine

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** Barres du meilleur score de chaque semaine, avec la valeur écrite au-dessus (et une phrase pour les lecteurs d'écran). */
function fluenceChart(weeks, unit) {
  const max = Math.max(1, ...weeks.map((w) => w.best || 0));
  return h('figure', { class: 'chart fl-chart' },
    h('figcaption', { class: 'chart-title' }, `Meilleur score de chaque semaine (${unit} par minute)`),
    h('ol', { class: 'fl-weeks', style: { '--n': String(weeks.length) } }, weeks.map((w) => {
      const day = `${w.start.getDate()} ${MONTHS[w.start.getMonth()]}`;
      const said = w.best === null ? `Semaine du ${day} : pas de lecture.`
        : `Semaine du ${day} : meilleur score ${w.best} ${unit} par minute (${w.readings} lecture${w.readings > 1 ? 's' : ''}).`;
      return h('li', { class: 'fl-week' },
        h('span', { class: 'visually-hidden' }, said),
        h('span', { class: 'fl-week-value', 'aria-hidden': 'true' }, w.best === null ? '–' : String(w.best)),
        h('span', { class: w.best === null ? 'fl-week-bar empty' : 'fl-week-bar', 'aria-hidden': 'true', style: { height: `${w.best === null ? 2 : Math.max(4, (w.best / max) * 100)}%` } }),
        h('span', { class: 'fl-week-label', 'aria-hidden': 'true' }, `${w.start.getDate()} ${MONTHS_SHORT[w.start.getMonth()]}`));
    })));
}

/** La carte « Lecture à voix haute » du suivi. */
export function fluenceCard(kid, grade, now = Date.now()) {
  const all = Array.isArray(kid.fluence) ? kid.fluence : [];
  const wordsOnly = wordReadings(all);
  // les lectures de syllabes ne se mélangent pas aux lectures de mots
  const scores = wordsOnly.length ? wordsOnly : all;
  const unit = wordsOnly.length || !all.length ? 'mots' : 'syllabes';
  const summary = fluenceSummary(scores);
  const benchmark = fluenceBenchmark(grade);
  if (!summary) {
    return h('section', { class: 'card fluence-card' },
      h('h2', {}, '🗣️ Lecture à voix haute'),
      h('p', { class: 'muted' }, 'Pas encore de lecture. Dans « Lire et écrire », lancez « Lire à voix haute » et asseyez-vous à côté de l’enfant : il lit pendant 1 minute, vous touchez les mots ratés.'),
      benchmark ? h('p', { class: 'muted small fl-benchmark' }, benchmark) : null);
  }
  const syllables = wordsOnly.length && wordsOnly.length < all.length ? fluenceSummary(all.filter((s) => s.kind === 'syllabes')) : null;
  return h('section', { class: 'card fluence-card' },
    h('h2', {}, '🗣️ Lecture à voix haute'),
    h('p', { class: 'muted small' }, `${unit === 'mots' ? 'Mots' : 'Syllabes'} correctement ${unit === 'mots' ? 'lus' : 'lues'} par minute, avec un adulte qui écoute.`),
    h('div', { class: 'stat-tiles' },
      // tuiles à part (fl-tile) : les « chiffres clés » de la semaine restent les quatre du haut
      [['Dernier score', summary.last.mclm], ['Meilleur score', summary.best.mclm]].map(([label, value]) => h('div', { class: 'fl-tile' },
        h('span', { class: 'stat-label' }, label), h('span', { class: 'stat-value' }, `${value} / min`)))),
    h('p', { class: 'small fl-last' }, `${summary.count} lecture${summary.count > 1 ? 's' : ''} · dernière lecture : ${relativeDay(summary.last.at)} `
      + `(${summary.last.read} ${unit} lu${unit === 'mots' ? '' : 'e'}s, ${summary.last.errors} raté${unit === 'mots' ? '' : 'e'}${summary.last.errors > 1 ? 's' : ''}).`),
    fluenceChart(fluenceWeeks(scores, now), unit),
    syllables ? h('p', { class: 'muted small' }, `Syllabes : dernier score ${syllables.last.mclm} par minute, meilleur ${syllables.best.mclm}.`) : null,
    benchmark ? h('p', { class: 'muted small fl-benchmark' }, benchmark) : null);
}

function describeMistake(m) {
  const game = findGame(m.game);
  return `${game ? game.title : m.game} : « ${m.given} » au lieu de « ${m.expected} »`;
}

/**
 * Sections du tableau de bord pour un enfant.
 * @param {{kid: object, grade: string, onChange: () => void}} options
 */
export function dashboard({ kid, grade, onChange }) {
  const days = lastSevenDays(kid.history);
  const week = days.reduce((acc, d) => ({
    sessions: acc.sessions + d.sessions, minutes: acc.minutes + d.minutes, correct: acc.correct + d.correct, total: acc.total + d.total,
  }), { sessions: 0, minutes: 0, correct: 0, total: 0 });
  const streak = streakDays(kid.history);
  const domains = programFor(grade);

  const toRework = [];
  for (const d of domains) {
    for (const { game, min } of d.games) {
      const stats = gameStats(kid, game.id, min);
      if (!game.paliers && stats.answered >= 10 && stats.correct / stats.answered < 0.6) toRework.push(game);
    }
  }
  const mistakes = frequentMistakes(kid.mistakes);
  const sons = resumeSons(kid); // textes déchiffrables : les sons cochés par les parents
  // la lecture à voix haute : pour les classes où le jeu est au programme, ou s'il y a déjà des lectures
  const fluenceShown = domains.some((d) => d.games.some(({ game }) => game.id === 'fluence')) || kid.fluence?.length > 0;

  return [
    h('section', { class: 'card' },
      h('h2', {}, 'Cette semaine'),
      h('div', { class: 'stat-tiles' },
        statTile('Parties', String(week.sessions)),
        statTile('Temps de jeu', `${week.minutes} min`),
        statTile('Réussite', week.total ? `${Math.round((100 * week.correct) / week.total)} %` : '–'),
        statTile('Jours d’affilée', String(streak))),
      activityChart(days)),
    fluenceShown ? fluenceCard(kid, grade) : null,
    h('section', { class: 'card' },
      h('h2', {}, 'À retravailler'),
      toRework.length
        ? h('ul', { class: 'plain-list' }, toRework.map((g) => h('li', {}, `${g.icon} ${g.title} : moins de 60 % de réussite`)))
        : h('p', { class: 'muted' }, 'Rien à signaler pour le moment.'),
      h('h3', {}, 'Erreurs fréquentes'),
      mistakes.length
        ? h('ul', { class: 'plain-list' }, mistakes.map((m) => h('li', {}, describeMistake(m), h('span', { class: 'muted' }, ` (${m.count} fois)`))))
        : h('p', { class: 'muted' }, 'Aucune erreur répétée.')),
    // les attendus de fin d'année de sa classe, en quelques mots
    GRADE_GOALS[grade] ? h('section', { class: 'card grade-goals', 'data-grade-goals': grade },
      h('h2', {}, `Attendus de fin d’année (${GRADES[grade]})`),
      h('p', { class: 'muted' }, GRADE_GOALS[grade])) : null,
    ...domains.map((d) => h('section', { class: 'card' },
      h('h2', {}, `${d.icon} ${d.title} : compétences`),
      d.id === 'francais' && sons ? h('p', { class: 'muted small sons-vus-line', 'data-sons-vus': '' }, h('b', {}, 'Sons vus en classe : '), sons) : null,
      d.games.map((entry) => gameRow(kid, entry, onChange)))),
  ];
}
