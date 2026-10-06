// Rapport de la voix naturelle, écran par écran : pour chaque phrase dite pendant le parcours
// complet (scripts/voix/parole-e2e.json) et pour chaque jeu (tirages au hasard à tous les niveaux),
// comment Estelle la dit avec les sons de app/voix/ :
//   entier   chaque phrase d'un seul son (une pause naturelle entre les phrases)
//   virgule  coupée seulement aux virgules
//   prenom   coupée autour du prénom de l'enfant (dit à part : il change d'une famille à l'autre)
//   court    coupée autour d'un nombre ou d'un morceau de phrase
//   mot      dite mot à mot (rare : une phrase jamais vue)
//   absent   un mot manque : la voix de l'appareil la dit (à corriger)
// Écrit scripts/voix/rapport-voix.md.
// Usage : node scripts/voix/rapport.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { GAMES } from '../../app/js/games/index.js';
import { planLecture, qualitePlan } from '../../app/js/voix-cles.js';
import { gameUtterances } from './phrases.mjs';

const HERE = new URL('.', import.meta.url).pathname;
const clips = JSON.parse(readFileSync(`${HERE}../../app/voix/manifest.json`, 'utf8')).clips;
const available = (key) => Object.hasOwn(clips, key);
const LEVELS = ['entier', 'virgule', 'prenom', 'court', 'mot', 'absent'];
const SCENARIO_NAMES = ['Eva-Rose', 'Éva-Rose', 'Matteo', 'Lou', 'Zoé', 'Paris Saint-Germain Féminines'];

const plan = (u, names) => planLecture(u.text, available, { lang: u.lang, rate: u.rate, names });
const show = (steps) => (steps ? steps.map((s) => s.text).join(' ▸ ') : '—');
const pct = (counts, total) => LEVELS.map((l) => `${total ? Math.round(((counts[l] || 0) / total) * 1000) / 10 : 0} %`).join(' | ');

const lines = ['# Voix naturelle : écran par écran', ''];
lines.push(`${Object.keys(clips).length} sons. Colonnes : ${LEVELS.join(', ')} (voir scripts/voix/rapport.mjs).`, '');

// 1. les jeux
lines.push('## Jeux (tirages au hasard, tous les niveaux)', '', `| Jeu | ${LEVELS.join(' | ')} |`, `|---|${LEVELS.map(() => '---').join('|')}|`);
const byGame = new Map();
for (const u of gameUtterances(30, 200000)) {
  const q = qualitePlan(plan(u, u.names));
  const g = byGame.get(u.game) || { counts: {}, total: 0, worst: [] };
  g.counts[q] = (g.counts[q] || 0) + 1;
  g.total++;
  if (q === 'mot' || q === 'absent') g.worst.push(u);
  byGame.set(u.game, g);
}
const all = { counts: {}, total: 0 };
for (const game of GAMES) {
  const g = byGame.get(game.id);
  if (!g) continue;
  lines.push(`| ${game.title} | ${pct(g.counts, g.total)} |`);
  for (const [l, c] of Object.entries(g.counts)) all.counts[l] = (all.counts[l] || 0) + c;
  all.total += g.total;
}
lines.push(`| **Tous les jeux** | ${pct(all.counts, all.total)} |`, '');
const worst = [...byGame.values()].flatMap((g) => g.worst);
if (worst.length) {
  lines.push('### Phrases dites mot à mot ou par la voix de l’appareil', '');
  for (const u of worst.slice(0, 60)) lines.push(`- ${u.game} : « ${u.text} » → ${show(plan(u, u.names))}`);
  lines.push('');
}

// 2. le parcours complet, écran par écran
const LOG = `${HERE}parole-e2e.json`;
if (existsSync(LOG)) {
  const screens = new Map();
  for (const entry of JSON.parse(readFileSync(LOG, 'utf8'))) {
    for (const screen of entry.ecrans || ['?']) {
      if (!screens.has(screen)) screens.set(screen, []);
      screens.get(screen).push(entry);
    }
  }
  lines.push('## Parcours complet, écran par écran', '');
  for (const [screen, entries] of [...screens].sort((a, b) => a[0].localeCompare(b[0]))) {
    const counts = {};
    for (const e of entries) {
      const q = qualitePlan(plan(e, SCENARIO_NAMES));
      counts[q] = (counts[q] || 0) + 1;
      e.q = q;
    }
    lines.push(`### ${screen || '(sans écran)'} : ${entries.length} phrases`, '');
    for (const e of entries.sort((a, b) => LEVELS.indexOf(b.q) - LEVELS.indexOf(a.q)).slice(0, 25)) {
      lines.push(`- \`${e.q}\` « ${e.text} »${e.q === 'entier' ? '' : ` → ${show(plan(e, SCENARIO_NAMES))}`}`);
    }
    lines.push('');
  }
}

writeFileSync(`${HERE}rapport-voix.md`, `${lines.join('\n')}\n`);
console.log(`Tous les jeux : ${LEVELS.map((l, i) => `${l} ${pct(all.counts, all.total).split(' | ')[i]}`).join(', ')}`);
console.log(`→ ${HERE}rapport-voix.md`);
