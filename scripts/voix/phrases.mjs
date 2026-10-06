// Choisit les phrases de la voix naturelle et écrit scripts/voix/a-generer.json.
//
// Deux sources, pondérées par la fréquence à laquelle l'enfant les entend :
//  - les questions de tous les jeux, à tous les niveaux (tirages au hasard) ;
//  - ce que dit l'application pendant le parcours complet du test de bout en bout
//    (félicitations, menus, encouragements…) : scripts/voix/parole-e2e.json, produit par
//    « SPEECH_LOG=scripts/voix/parole-e2e.json PARTS=scenario npm run test:e2e ».
// Une phrase sans nombre ni prénom est enregistrée telle quelle ; sinon elle est découpée en
// morceaux (texte, nombres, prénoms). Les nombres de 0 à 1000 et les prénoms courants sont
// toujours enregistrés. Le reste est dit par la voix de l'appareil.
//
// Usage : node scripts/voix/phrases.mjs [nombre maximal de phrases et morceaux, 6000 par défaut]
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { GAMES } from '../../app/js/games/index.js';
import { createRng } from '../../app/js/random.js';
import { cle, langue, morceaux, normaliser, utile, vitesse } from '../../app/js/voix-cles.js';

const HERE = new URL('.', import.meta.url).pathname;
const BUDGET = Number(process.argv[2]) || 6000;
const SEEDS = 150;
const SEASONS = ['hiver', 'printemps', 'ete', 'automne', 'noel', 'halloween'];
const PLACEHOLDER = 'Zélie'; // prénom de l'enfant pendant les tirages (découpé ensuite)
const PRENOMS = readFileSync(`${HERE}prenoms.txt`, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
export const VOICES = { fr: 'estelle', en: 'alba' };
export const MODEL = 'pocket-tts:french,english';

const weights = new Map(); // clé → { lang, rate, text, type, poids }
function add(text, { lang = 'fr-FR', rate } = {}, poids = 1, names = [PLACEHOLDER]) {
  const t = normaliser(text);
  if (!utile(t)) return;
  const l = langue(lang);
  const parts = /\d/.test(t) || names.some((n) => t.includes(n)) ? morceaux(t, names, l) : [{ type: 'texte', text: t }];
  for (const m of parts) {
    if (m.type === 'prenom') continue; // les prénoms viennent de la liste
    const key = cle(m.text, { lang, rate });
    const entry = weights.get(key) || { lang: l, rate: vitesse(rate), text: m.text, type: m.type, poids: 0 };
    entry.poids += poids;
    weights.set(key, entry);
  }
}

/** Ce qu'une question fait dire : consigne, consigne courte, réécoute, félicitation, histoire, paires… */
function spoken(q) {
  const out = [];
  const push = (p) => {
    if (p == null) return;
    if (Array.isArray(p)) p.forEach(push);
    else if (typeof p === 'string') out.push({ text: p });
    else if (typeof p === 'object' && typeof p.text === 'string') out.push(p);
  };
  push(q.instruction);
  push(q.short?.speak ?? q.short?.text);
  push(q.replay);
  push(q.success?.speak);
  // histoires en karaoké : lues plus lentement (main.js, karaoke)
  if (q.karaoke) push((q.stage?.sentences || []).map((text) => ({ text, rate: 0.85 })));
  for (const pair of q.pairs || []) push(pair.say);
  for (const card of q.cards || []) push(card.say);
  return out;
}

// 1. les questions de tous les jeux
let draws = 0;
for (const game of GAMES) {
  for (let level = 1; level <= game.levels.length; level++) {
    for (let s = 0; s < SEEDS; s++) {
      let q;
      try {
        q = game.generate(level, createRng(s * 7919 + level * 31), s % 10, { name: PLACEHOLDER, season: SEASONS[s % SEASONS.length] });
      } catch {
        continue;
      }
      draws++;
      // chaque jeu pèse autant, quel que soit son nombre de niveaux
      for (const part of spoken(q)) add(part.text, part, 1 / (SEEDS * game.levels.length));
    }
  }
}

// 2. ce que dit l'application pendant le parcours complet
const LOG = `${HERE}parole-e2e.json`;
const SCENARIO_NAMES = ['Eva-Rose', 'Éva-Rose', 'Matteo', 'Lou', 'Zoé', 'Paris Saint-Germain Féminines'];
if (existsSync(LOG)) {
  for (const { text, lang, rate, count } of JSON.parse(readFileSync(LOG, 'utf8'))) add(text, { lang, rate }, count * 0.2, SCENARIO_NAMES);
}

// phrases fixes toujours enregistrées (dont celle du bouton d'essai des Réglages, vérifiée par le test)
const TOUJOURS = ['Bravo ! Tu as trouvé la bonne réponse.', 'Essaie encore !', 'Bravo !', 'Choisis un jeu !', 'Choisis ton niveau !'];

// 3. sélection : les plus entendues d'abord
const ranked = [...weights].filter(([, e]) => e.type === 'texte').sort((a, b) => b[1].poids - a[1].poids);
const total = ranked.reduce((s, [, e]) => s + e.poids, 0);
const chosen = ranked.slice(0, BUDGET);
const covered = chosen.reduce((s, [, e]) => s + e.poids, 0);

// nombres et prénoms, toujours là
const extra = [];
for (let n = 0; n <= 1000; n++) extra.push([cle(String(n)), { lang: 'fr', rate: 1, text: String(n), type: 'nombre' }]);
for (let n = 0; n <= 100; n++) extra.push([cle(String(n), { lang: 'en' }), { lang: 'en', rate: 1, text: String(n), type: 'nombre' }]);
for (const [key, e] of weights) if (e.type === 'nombre' && !extra.some(([k]) => k === key)) extra.push([key, e]);
for (const name of PRENOMS) extra.push([cle(name), { lang: 'fr', rate: 1, text: normaliser(name), type: 'prenom' }]);

for (const text of TOUJOURS) extra.unshift([cle(text), { lang: 'fr', rate: 1, text: normaliser(text), type: 'texte' }]);

const seen = new Set();
const list = [];
for (const [key, e] of [...chosen, ...extra]) {
  if (seen.has(key)) continue;
  seen.add(key);
  const voice = VOICES[e.lang];
  const file = `${e.lang}/${createHash('sha1').update(`${MODEL}|${voice}|${key}`).digest('hex').slice(0, 16)}.mp3`;
  list.push({ key, lang: e.lang, rate: e.rate, type: e.type, text: e.text, voice, file });
}
writeFileSync(`${HERE}a-generer.json`, `${JSON.stringify(list, null, 1)}\n`);

const chars = list.reduce((s, e) => s + e.text.length, 0);
console.log(`${draws} questions tirées, ${ranked.length} phrases et morceaux différents`);
console.log(`${chosen.length} retenus : ${((covered / total) * 100).toFixed(1)} % de ce que l'enfant entend (hors nombres et prénoms)`);
console.log(`${list.length} sons au total (${extra.length} nombres et prénoms), ${chars} caractères → ${HERE}a-generer.json`);
