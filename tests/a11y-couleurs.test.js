// Couleurs nommées (réglage d'accessibilité « namedColors ») : partout où une couleur porte une
// information, elle a un nom ; simulation du daltonisme (protanopie, deutéranopie) sur les
// couleurs qui n'en ont pas ; retours juste / faux jamais par la couleur seule.
import './aides-dom.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { text, withClass } from './aides-dom.js';
import { GAMES } from '../app/js/games/index.js';
import { createRng } from '../app/js/random.js';
import { FLAGS } from '../app/js/games/drapeaux.js';
import { MAGIC_COLORS } from '../app/js/games/jeux.js';
import { EN_COLORS } from '../app/js/games/anglais-plus.js';
import { FIG_STYLES } from '../app/js/games/logique-plus.js';
import { couleurEmoji, nomAffiche } from '../app/js/couleurs.js';
import { emojiColorName, flagElement, renderChoiceContent, renderStage, setAides } from '../app/js/render.js';

const RUNS = 30;

function* everyQuestion() {
  for (const game of GAMES) {
    for (let level = 1; level <= game.levels.length; level++) {
      const rng = createRng(4242 + level);
      for (let i = 0; i < RUNS; i++) yield { game, level, q: game.generate(level, rng, i, { name: 'Zoé', season: 'ete' }) };
    }
  }
}

// Ce qui porte une couleur dans une question : { où, couleur (#hex ou émoji), nom }
function coloured(q, domain) {
  const items = [];
  for (const c of q.choices || []) {
    if (c.swatch) items.push({ where: 'choix', color: c.swatch, name: c.name });
    const emoji = typeof c.label === 'string' && !c.lang ? couleurEmoji(c.label, domain) : null;
    if (emoji) items.push({ where: 'choix (émoji)', color: c.label, name: emoji });
    if (c.flag && FLAGS[c.flag].bands) items.push({ where: 'drapeau', color: c.flag, name: FLAGS[c.flag].bands.colors.join(' ') });
  }
  const st = q.stage || {};
  if (st.type === 'swatch') items.push({ where: 'image', color: st.color, name: st.name });
  if (st.type === 'pattern') {
    for (const it of st.items) {
      if (typeof it === 'string' && /\p{Extended_Pictographic}/u.test(it) && /[🔴🟠🟡🟢🔵🟣🟤🟥🟧🟨🟩🟦🟪🟫⬛⬜⚫⚪]/u.test(it)) {
        items.push({ where: 'suite', color: it, name: couleurEmoji(it, domain) });
      }
    }
  }
  if (st.type === 'picture' && couleurEmoji(st.emoji, domain)) items.push({ where: 'image (émoji)', color: st.emoji, name: couleurEmoji(st.emoji, domain) });
  if (st.type === 'colorby') for (const c of st.legend) items.push({ where: 'palette', color: c.hex, name: c.name });
  if (st.type === 'flag' && FLAGS[st.code].bands) items.push({ where: 'drapeau', color: st.code, name: FLAGS[st.code].bands.colors.join(' ') });
  for (const p of q.pairs || []) if (p.swatch) items.push({ where: 'relie', color: p.swatch, name: p.left });
  for (const card of q.cards || []) {
    if (!card.word && /[🔴🟠🟡🟢🔵🟣🟤🟥🟧🟨🟩🟦🟪🟫⬛⬜⚫⚪❤🧡💛💚💙💜🖤🤍🤎]/u.test(String(card.label))) {
      items.push({ where: 'memory', color: card.label, name: couleurEmoji(card.label, domain) });
    }
  }
  return items;
}

test('couleurs nommées : dans chaque jeu et à chaque niveau, chaque couleur qui compte a un nom', () => {
  const missing = new Set();
  const games = new Set();
  for (const { game, level, q } of everyQuestion()) {
    for (const item of coloured(q, game.domain)) {
      games.add(game.id);
      if (typeof item.name !== 'string' || !item.name.trim()) missing.add(`${game.id} niveau ${level} : ${item.where} ${item.color} sans nom`);
    }
  }
  assert.deepEqual([...missing], []);
  // les jeux où la couleur porte l'information sont bien vus par ce test
  for (const id of ['couleurs-anglais', 'colorie-anglais', 'coloriage-magique', 'drapeaux', 'algorithmes', 'memory-anglais', 'ecoute', 'relie-anglais']) {
    assert.ok(games.has(id), `aucune couleur vue dans ${id}`);
  }
});

test('couleurs nommées : avec le réglage, le nom est écrit sous la pastille ; sans, rien ne change', () => {
  const swatch = { value: 'rouge', swatch: '#e0242f', name: 'rouge' };
  setAides({});
  const plain = renderChoiceContent(swatch);
  assert.equal(withClass(plain, 'color-name').length, 0);
  assert.equal(text(plain), '');
  assert.equal(emojiColorName('🟥'), null);
  setAides({ namedColors: true, domain: 'monde' });
  const named = renderChoiceContent(swatch);
  assert.equal(text(withClass(named, 'color-name')[0]), 'rouge');
  assert.equal(withClass(named, 'swatch')[0].getAttribute('aria-label'), 'rouge');
  // suite de motifs : le nom sous chaque carré de couleur, pas sous le « ? »
  const pattern = renderStage({ type: 'pattern', items: ['🔴', '🔵', '🔴', null] }, {});
  assert.deepEqual(withClass(pattern, 'color-name').map(text), ['rouge', 'bleu', 'rouge']);
  // un choix émoji de couleur
  assert.equal(text(withClass(renderChoiceContent({ value: '🟩', label: '🟩' }), 'color-name')[0]), 'vert');
  // drapeau : les couleurs des bandes, la bande effacée devient « ? »
  const flag = flagElement('fr', { dir: 'v', index: 1, count: 3 });
  assert.deepEqual(withClass(flag, 'flag-colors')[0].children.map(text), ['bleu', '?', 'rouge']);
  // une pomme n'a pas de nom de couleur… sauf dans les jeux d'anglais (« a red apple »)
  assert.equal(withClass(renderChoiceContent({ value: 'p', label: '🍎' }), 'color-name').length, 0);
  setAides({ namedColors: true, domain: 'anglais' });
  const apple = renderStage({ type: 'picture', emoji: '🍎' }, { replay() {} });
  assert.equal(text(withClass(apple, 'color-name')[0]), '(rouge)');
  // en anglais, le nom français entre parenthèses (le mot anglais reste à trouver)
  const stageSwatch = renderStage({ type: 'swatch', color: '#ff4d4d', name: 'rouge' }, {});
  assert.equal(text(withClass(stageSwatch, 'color-name')[0]), '(rouge)');
  assert.equal(nomAffiche('bleu', 'anglais'), '(bleu)');
  assert.equal(nomAffiche('bleu', 'jeux'), 'bleu');
  setAides({});
});

// ---------------------------------------------------------------- Simulation du daltonisme

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function rgb(hex) {
  const full = hex.length === 4 ? hex.replace(/^#(.)(.)(.)$/, '#$1$1$2$2$3$3') : hex;
  return [1, 3, 5].map((i) => toLinear(parseInt(full.slice(i, i + 2), 16) / 255));
}
// Machado, Oliveira et Fernandes (2009), sévérité 1 : la vision d'un enfant protanope ou deutéranope
const CVD = {
  protanopie: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutéranopie: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
};
const simulate = (lin, m) => m.map((row) => Math.min(1, Math.max(0, row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2])));
function lab([r, g, b]) {
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
  const y = f(0.2126 * r + 0.7152 * g + 0.0722 * b);
  const z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
/** Écart de couleur (ΔE 1976) entre deux couleurs, vues avec une forme de daltonisme. */
function deltaE(a, b, m) {
  const [p, q] = [lab(simulate(rgb(a), m)), lab(simulate(rgb(b), m))];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}
const SEUIL = 20; // en dessous, deux couleurs se confondent pour l'enfant

test('daltonisme : deux couleurs d’une même question qui se confondent portent un nom', () => {
  const problems = new Set();
  let confusables = 0;
  for (const { game, level, q } of everyQuestion()) {
    const hexes = coloured(q, game.domain).filter((it) => /^#/.test(it.color));
    for (let i = 0; i < hexes.length; i++) {
      for (let j = i + 1; j < hexes.length; j++) {
        const [a, b] = [hexes[i], hexes[j]];
        if (a.color.toLowerCase() === b.color.toLowerCase()) continue;
        for (const [vision, m] of Object.entries(CVD)) {
          if (deltaE(a.color, b.color, m) >= SEUIL) continue;
          confusables++;
          if (!a.name || !b.name) problems.add(`${game.id} niveau ${level} (${vision}) : ${a.color} et ${b.color} se confondent sans nom`);
        }
      }
    }
  }
  assert.deepEqual([...problems], []);
  // le test voit bien des couleurs qui se confondent (rouge et vert, bleu et violet…) : elles ont leur nom
  assert.ok(confusables > 0);
});

test('daltonisme : les palettes de couleurs ont toutes un nom, et les dessins du tableau logique un motif', () => {
  for (const c of MAGIC_COLORS) assert.ok(c.name, c.hex);
  for (const [en, c] of Object.entries(EN_COLORS)) assert.ok(c.fr, en);
  for (const [code, f] of Object.entries(FLAGS)) if (f.bands) assert.ok(f.bands.colors.every((c) => typeof c === 'string' && c), code);
  // tableau logique : deux styles qui se confondent pour un daltonien n'ont jamais le même motif
  const motif = (st) => (/rayures/.test(st.words[0]) ? 'rayures' : /pois/.test(st.words[0]) ? 'pois' : st.color === '#ffffff' ? 'vide' : 'uni');
  const styles = Object.values(FIG_STYLES);
  for (let i = 0; i < styles.length; i++) {
    for (let j = i + 1; j < styles.length; j++) {
      if (!Object.values(CVD).some((m) => deltaE(styles[i].color, styles[j].color, m) < SEUIL)) continue;
      assert.notEqual(motif(styles[i]), motif(styles[j]), `${styles[i].words[0]} et ${styles[j].words[0]}`);
    }
  }
  assert.equal(new Set(styles.map(motif)).size, styles.length);
});

test('daltonisme : les deux couleurs des syllabes restent bien différentes', () => {
  const css = readFileSync(new URL('../app/css/aides.css', import.meta.url), 'utf8');
  const a = css.match(/\.syl-a \{ color: (#[0-9a-f]{6})/)[1];
  const b = css.match(/\.syl-b \{ color: (#[0-9a-f]{6})/)[1];
  for (const [vision, m] of Object.entries(CVD)) assert.ok(deltaE(a, b, m) >= SEUIL, `${vision} : ${deltaE(a, b, m).toFixed(1)}`);
});

test('retours juste / faux : un signe ✓ ou ✗ en plus du vert et du rouge, pour tout le monde', () => {
  const css = readFileSync(new URL('../app/css/aides.css', import.meta.url), 'utf8');
  assert.match(css, /\.choice\.correct::after \{ content: '✓'/);
  assert.match(css, /\.choice\.wrong::after \{ content: '✗'/);
  assert.match(css, /\.memory-card\.found::after \{\s*content: '✓'/);
  // et la feuille est chargée par la page, et gardée hors ligne
  assert.match(readFileSync(new URL('../app/index.html', import.meta.url), 'utf8'), /href="css\/aides\.css"/);
  assert.match(readFileSync(new URL('../app/sw.js', import.meta.url), 'utf8'), /'\.\/css\/aides\.css'/);
});
