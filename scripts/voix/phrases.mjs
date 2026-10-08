// Choisit les sons de la voix naturelle et écrit scripts/voix/a-generer.json.
//
// Deux sources, pondérées par la fréquence à laquelle l'enfant les entend :
//  - les questions de tous les jeux, à tous les niveaux (tirages au hasard) ;
//  - ce que dit l'application pendant le parcours complet du test de bout en bout
//    (félicitations, menus, encouragements…) : scripts/voix/parole-e2e.json, produit par
//    « SPEECH_LOG=scripts/voix/parole-e2e.json PARTS=scenario npm run test:e2e ».
//
// Un énoncé est dit phrase par phrase (voix-cles.js, planLecture) : on enregistre d'abord les
// phrases entières les plus entendues, puis, pour les autres, leurs propositions (coupées aux
// virgules) et leurs morceaux, dans la limite d'un budget de caractères. Pour que rien ne soit
// jamais dit par une autre voix, tous les mots, les nombres de 0 à 1000 et les prénoms courants
// sont aussi enregistrés.
//
// Usage : node scripts/voix/phrases.mjs [budget en caractères, 200000 par défaut]
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { GAMES } from '../../app/js/games/index.js';
import { SPOKEN_SENTENCES } from '../../app/js/games/vocabulaire.js';
import { voiciPartie } from '../../app/js/games/corps.js';
import { tapText } from '../../app/js/a11y-jeux.js';
import { createRng } from '../../app/js/random.js';
import {
  autourDesPrenoms, cle, enMots, langue, morceaux, mots, normaliser, phrases, planLecture, propositions, qualitePlan, utile,
  vitesse,
} from '../../app/js/voix-cles.js';

const HERE = new URL('.', import.meta.url).pathname;
const BUDGET = Number(process.argv[2]) || 200000;
const SEEDS = 300;
const SEASONS = ['hiver', 'printemps', 'ete', 'automne', 'noel', 'halloween'];
const PLACEHOLDER = 'Zélie'; // prénom de l'enfant pendant les tirages (découpé ensuite)
const PRENOMS = readFileSync(`${HERE}prenoms.txt`, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
// une seule voix : Estelle, en français comme en anglais (modèle anglais de Pocket TTS)
export const VOICES = { fr: 'estelle', en: 'estelle' };
// change à chaque nouvelle façon de fabriquer les sons : les noms de fichiers changent avec
export const MODEL = 'pocket-tts-2:french,english';

/** Ce qu'une question fait dire : consigne, consigne courte, réécoute, félicitation, histoire, paires… */
export function spoken(q) {
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
  // le dessin du corps (main.js, bodyZone) : une partie touchée par erreur est nommée
  if (q.interaction === 'body') {
    push((q.choices || []).map((c) => voiciPartie(c.name)));
    push('Touche la partie qui brille !');
  }
  // réglage « toucher plutôt que glisser » (a11y-jeux.js) : les consignes qui demandent de glisser
  // ou de tracer sont dites autrement, et Estelle doit aussi les dire
  for (const part of [...out]) {
    const text = tapText(part.text);
    if (text !== part.text) out.push({ ...part, text });
  }
  return out;
}

/** Énoncés des jeux, avec leur poids (chaque jeu pèse autant, quel que soit son nombre de niveaux). */
export function gameUtterances(seeds = SEEDS, offset = 0) {
  const list = [];
  for (const game of GAMES) {
    for (let level = 1; level <= game.levels.length; level++) {
      for (let s = 0; s < seeds; s++) {
        let q;
        try {
          q = game.generate(level, createRng((s + offset) * 7919 + level * 31), s % 10, { name: PLACEHOLDER, season: SEASONS[s % SEASONS.length] });
        } catch {
          continue;
        }
        for (const part of spoken(q)) list.push({ ...part, game: game.id, poids: 1 / (seeds * game.levels.length), names: [PLACEHOLDER] });
      }
    }
  }
  return list;
}

// 1. ce que l'enfant entend
const LOG = `${HERE}parole-e2e.json`;
const SCENARIO_NAMES = ['Eva-Rose', 'Éva-Rose', 'Matteo', 'Lou', 'Zoé', 'Paris Saint-Germain Féminines'];
// phrases fixes toujours enregistrées (dont celle du bouton d'essai des Réglages, vérifiée par le test)
const TOUJOURS = ['Bravo ! Tu as trouvé la bonne réponse.', 'Essaie encore !', 'Bravo !', 'Choisis un jeu !', 'Choisis ton niveau !',
  // « Buenos Aires » se dit avec son « s » : seul, le mot « buenos » est refusé par le contrôle des phonèmes
  // (qui l'attend muet, comme en français) ; les phrases de la carte du monde sont donc enregistrées entières
  'Touche Buenos Aires, la capitale de l’Argentine.', 'Oui ! Buenos Aires est la capitale de l’Argentine.', 'Sa capitale est Buenos Aires.',
  // le partage : dit par main.js quand les parts ne sont pas égales
  'Ils n’en ont pas tous autant. Touche la flèche pour en reprendre.',
  // toucher plutôt que glisser (main.js) : écris au doigt, points à relier
  'Touche le point qui brille !', 'Regarde le point jaune, puis touche les points un par un !',
  // ponctuation : l'enfant choisit le signe d'après l'intonation, chaque phrase doit donc être dite d'un seul son
  ...SPOKEN_SENTENCES.flatMap(({ text, marks }) => [...marks].map((m) => (m === '.' ? `${text}.` : `${text} ${m}`)))];

export function allUtterances() {
  const list = gameUtterances();
  if (existsSync(LOG)) {
    for (const { text, lang, rate, count } of JSON.parse(readFileSync(LOG, 'utf8'))) {
      list.push({ text, lang, rate, poids: count * 0.2, names: SCENARIO_NAMES, game: 'app' });
    }
  }
  for (const text of TOUJOURS) list.push({ text, poids: 1, names: [], game: 'app' });
  return list;
}

const has = (names, t) => names.some((n) => t.includes(n));
const MANIFEST = new URL('../../app/voix/manifest.json', import.meta.url).pathname;

function select(utterances) {
  const units = new Map(); // clé → { lang, rate, text, type }
  const addUnit = (text, opts, type) => {
    const key = cle(text, opts);
    if (!units.has(key)) units.set(key, { lang: langue(opts.lang), rate: vitesse(opts.rate), text: normaliser(text), type });
    return key;
  };
  // regroupe les poids par phrase
  const sentenceW = new Map();
  const info = new Map(); // clé de phrase → { text, opts, names }
  for (const u of utterances) {
    const opts = { lang: u.lang, rate: u.rate };
    for (const s of phrases(enMots(u.text, langue(u.lang)))) {
      const key = cle(s, opts);
      sentenceW.set(key, (sentenceW.get(key) || 0) + u.poids);
      if (!info.has(key)) info.set(key, { text: s, opts, names: u.names });
    }
  }
  const score = (w, text) => w / (normaliser(text).length + 20);
  let spent = 0;
  const considered = new Map(); // tous les candidats, choisis ou non
  const pick = (candidates, limit, type) => {
    for (const [key, { text, opts }] of candidates) if (!considered.has(key)) considered.set(key, { text, opts, type });
    for (const [key, { w, text, opts }] of [...candidates].sort((a, b) => score(b[1].w, b[1].text) - score(a[1].w, a[1].text))) {
      if (spent >= limit) break;
      if (units.has(key)) continue;
      addUnit(text, opts, type);
      spent += normaliser(text).length;
    }
  };
  // a. phrases entières (sans prénom : il est dit à part)
  const sentences = new Map();
  for (const [key, w] of sentenceW) {
    const { text, opts, names } = info.get(key);
    if (!has(names, text)) sentences.set(key, { w, text, opts });
  }
  pick(sentences, BUDGET * 0.8, 'phrase');
  // b. propositions des phrases restantes
  const clauses = new Map();
  for (const [key, w] of sentenceW) {
    if (units.has(key)) continue;
    const { text, opts, names } = info.get(key);
    const props = propositions(text);
    if (props.length < 2) continue;
    for (const p of props) {
      if (has(names, p)) continue;
      const k = cle(p, opts);
      clauses.set(k, { w: (clauses.get(k)?.w || 0) + w, text: p, opts });
    }
  }
  pick(clauses, BUDGET * 0.92, 'proposition');
  // c. bouts entre les prénoms (« Zélie » + « a 2 pommes. »), puis morceaux entre les nombres
  const remaining = []; // [texte, opts, w] des propositions restantes
  for (const [key, w] of sentenceW) {
    if (units.has(key)) continue;
    const { text, opts, names } = info.get(key);
    for (const p of propositions(text)) {
      if (!units.has(cle(p, opts))) remaining.push({ text: p, opts, w, names });
    }
  }
  const segments = new Map();
  for (const { text, opts, w, names } of remaining) {
    const parts = autourDesPrenoms(text, names).filter((m) => m.type === 'texte');
    if (parts.length === autourDesPrenoms(text, names).length) continue; // sans prénom
    for (const m of parts) {
      const k = cle(m.text, opts);
      segments.set(k, { w: (segments.get(k)?.w || 0) + w, text: m.text, opts });
    }
  }
  pick(segments, BUDGET * 0.96, 'segment');
  const pieces = new Map();
  for (const { text, opts, w, names } of remaining) {
    for (const part of autourDesPrenoms(text, names)) {
      if (part.type !== 'texte' || units.has(cle(part.text, opts))) continue;
      for (const m of morceaux(part.text, [], langue(opts.lang))) {
        if (m.type !== 'texte') continue;
        const k = cle(m.text, opts);
        pieces.set(k, { w: (pieces.get(k)?.w || 0) + w, text: m.text, opts });
      }
    }
  }
  pick(pieces, BUDGET, 'morceau');
  const chosen = units.size;
  // d. toujours là : chaque mot (à la vitesse normale), les nombres, les prénoms ; les mots viennent
  // aussi de tirages supplémentaires, pour que des questions jamais vues trouvent tous leurs mots
  for (const u of [...utterances, ...gameUtterances(SEEDS * 3, 50000)]) {
    const l = langue(u.lang);
    for (const s of phrases(enMots(u.text, l))) {
      for (const m of morceaux(s, u.names, l)) {
        if (m.type === 'nombre') addUnit(m.text, { lang: u.lang, rate: u.rate }, 'nombre');
        if (m.type === 'texte') for (const w of mots(m.text)) addUnit(w, { lang: u.lang }, 'mot');
      }
    }
  }
  for (let n = 0; n <= 1000; n++) addUnit(String(n), {}, 'nombre');
  for (let n = 0; n <= 100; n++) addUnit(String(n), { lang: 'en' }, 'nombre');
  for (const name of PRENOMS) addUnit(name, {}, 'prenom');
  // e. ce qui serait encore dit mot à mot (« Regarde les grands lapins ! », « ou arbre ») est
  // enregistré d'un tenant, proposition par proposition, les plus entendues d'abord
  const available = (k) => units.has(k);
  const repair = new Map();
  for (const [key, w] of sentenceW) {
    if (units.has(key)) continue;
    const { text, opts, names } = info.get(key);
    for (const p of propositions(text)) {
      const k = cle(p, opts);
      if (units.has(k) || has(names, p)) continue;
      if (qualitePlan(planLecture(p, available, { ...opts, names })) !== 'mot') continue;
      repair.set(k, { w: (repair.get(k)?.w || 0) + w, text: p, opts });
    }
  }
  pick(repair, spent + BUDGET * 0.08, 'proposition');
  // f. un son déjà fabriqué qui sert encore est gardé, même hors budget : il ne coûte plus rien
  const made = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')).clips : {};
  for (const [key, { text, opts, type }] of considered) if (!units.has(key) && Object.hasOwn(made, key)) addUnit(text, opts, type);
  return { units, chosen, spent };
}

/** Comment chaque énoncé serait dit avec ces sons : part (pondérée) de chaque pire coupure. */
export function coverage(utterances, available) {
  const totals = {};
  let sum = 0;
  for (const u of utterances) {
    const q = qualitePlan(planLecture(u.text, (k) => available.has(k), { lang: u.lang, rate: u.rate, names: u.names }));
    totals[q] = (totals[q] || 0) + u.poids;
    sum += u.poids;
  }
  return Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, Math.round((v / sum) * 1000) / 10]));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const utterances = allUtterances().filter((u) => utile(u.text) || /\d/.test(u.text));
  const { units, chosen, spent } = select(utterances);
  const list = [];
  for (const [key, e] of units) {
    const voice = VOICES[e.lang];
    const file = `${e.lang}/${createHash('sha1').update(`${MODEL}|${voice}|${key}`).digest('hex').slice(0, 16)}.mp3`;
    list.push({ key, lang: e.lang, rate: e.rate, type: e.type, text: e.text, voice, file });
  }
  writeFileSync(`${HERE}a-generer.json`, `${JSON.stringify(list, null, 1)}\n`);
  const chars = list.reduce((s, e) => s + e.text.length, 0);
  console.log(`${utterances.length} énoncés ; ${chosen} phrases, propositions et morceaux choisis (${spent} caractères)`);
  console.log(`${list.length} sons au total, ${chars} caractères (~${Math.round((chars / 13.4) * 4 / 1000)} Mo) → ${HERE}a-generer.json`);
  const keys = new Set(units.keys());
  console.log('énoncés tirés pour la sélection :', coverage(utterances, keys));
  console.log('autres tirages (jamais vus) :', coverage(gameUtterances(40, 100000), keys));
}
