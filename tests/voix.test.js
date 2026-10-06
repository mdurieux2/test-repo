import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  autourDesPrenoms, cle, enMots, morceaux, mots, normaliser, phrases, planLecture, propositions, qualitePlan, vitesse,
} from '../app/js/voix-cles.js';
import { clipsFor, pauseBetween } from '../app/js/speech.js';
import { GAMES } from '../app/js/games/index.js';
import { createRng } from '../app/js/random.js';
import { spoken } from '../scripts/voix/phrases.mjs';

const APP = new URL('../app/', import.meta.url).pathname;
const manifest = JSON.parse(readFileSync(join(APP, 'voix/manifest.json'), 'utf8'));

test('voix naturelle : clés identiques malgré la typographie, quatre allures', () => {
  assert.equal(normaliser('C’est l’heure  !'), "C'est l'heure !");
  assert.equal(cle('Bravo !'), cle('Bravo !'));
  assert.equal(cle('Bravo !', { lang: 'fr-FR', rate: 0.95 }), 'fr|1|Bravo !');
  assert.equal(cle('Red', { lang: 'en-GB', rate: 0.8 }), 'en|0.8|Red');
  // ralentir davantage déformerait la voix : 0,6 et 0,7 sont dits à 0,8
  assert.deepEqual([0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 1, 1.05, 1.1].map(vitesse), [0.8, 0.8, 0.8, 0.9, 0.9, 1, 1, 1.1, 1.1]);
  assert.equal(vitesse(undefined), 1);
});

test('voix naturelle : phrases, propositions, prénoms, morceaux et mots', () => {
  assert.deepEqual(phrases('Oui ! Les autres ont 8 dizaines. Bien.'), ['Oui !', 'Les autres ont 8 dizaines.', 'Bien.']);
  assert.deepEqual(propositions('Le 24 janvier, c’est quel jour ?'), ['Le 24 janvier,', "c'est quel jour ?"]);
  assert.deepEqual(propositions('dragon : 2 syllabes !'), ['dragon :', '2 syllabes !']);
  assert.deepEqual(mots('L’arbre ! Est-ce ?'), ["l'arbre", 'est-ce']);
  assert.deepEqual(autourDesPrenoms('Combien de pommes a Zélie maintenant ?', ['Zélie']).map((m) => `${m.type}:${m.text}`),
    ['texte:Combien de pommes a', 'prenom:Zélie', 'texte:maintenant ?']);
  const texts = (t, names = [], lang) => morceaux(t, names, lang).map((m) => `${m.type}:${m.text}`);
  assert.deepEqual(texts('Combien font 7 + 5 ?'), ['texte:Combien font', 'nombre:7', 'texte:plus', 'nombre:5']);
  assert.deepEqual(texts('Bravo Eva-Rose !', ['Eva-Rose']), ['texte:Bravo', 'prenom:Eva-Rose']);
  assert.deepEqual(texts('Le 1er mai'), ['texte:Le', 'nombre:1er', 'texte:mai']);
  assert.deepEqual(texts('Il est 8 h 15.'), ['texte:Il est', 'nombre:8', 'texte:heures', 'nombre:15']);
  // un prénom n'est découpé qu'entier (« Eva-Roselyne » n'est pas « Eva-Rose »)
  assert.deepEqual(texts('Eva-Roselyne a 3 billes', ['Eva-Rose']), ['texte:Eva-Roselyne a', 'nombre:3', 'texte:billes']);
  assert.equal(enMots('12 − 4 = ?', 'en'), '12 minus 4 equals ?');
});

test('voix naturelle : chaque phrase d’un seul son, sinon par propositions, morceaux, puis mots', () => {
  const clips = Object.fromEntries([
    'Regarde le calendrier.', 'Quel jour sommes-nous ?', 'Bravo', 'a 2 pommes.', 'Combien font', 'plus', '7', '5',
    'fleur', 'souris', 'ou', 'gâteau', 'Le 24 janvier,', "c'est quel jour ?", 'Léa',
  ].map((t, i) => [cle(t), `fr/${i}.mp3`]).concat([[cle('Hello', { lang: 'en' }), 'en/0.mp3']]));
  const plan = (text, options = {}) => {
    const steps = clipsFor({ text, ...options }, clips, ['Léa', 'Zélie']);
    return steps && steps.map((c) => c.text);
  };
  assert.deepEqual(plan('Regarde le calendrier. Quel jour sommes-nous ?'), ['Regarde le calendrier.', 'Quel jour sommes-nous ?']);
  assert.deepEqual(plan('Le 24 janvier, c’est quel jour ?'), ['Le 24 janvier,', "c'est quel jour ?"]);
  assert.deepEqual(plan('Léa a 2 pommes.'), ['Léa', 'a 2 pommes.']);
  assert.deepEqual(plan('Combien font 7 + 5 ?'), ['Combien font', '7', 'plus', '5']);
  assert.deepEqual(plan('fleur, souris, ou gâteau'), ['fleur', 'souris', 'ou', 'gâteau']);
  // un nombre lu plus vite garde son son normal ; un prénom anglais garde son son français
  assert.deepEqual(plan('7', { rate: 1.1 }), ['7']);
  assert.deepEqual(plan('Hello Léa!', { lang: 'en-GB' }), ['Hello', 'Léa']);
  // il manque un mot : la voix de l'appareil dira ce morceau ; rien à dire : aucun son
  assert.equal(plan('Combien font 7 moins 5 ?'), null);
  assert.equal(plan('Bravo Zoé !'), null);
  assert.deepEqual(plan('!'), []);
  assert.equal(clipsFor({ text: 'Bravo !' }, null), null);
  // les pauses : entre les phrases, après une virgule, rien autour d'un nombre
  const steps = clipsFor({ text: 'Regarde le calendrier. Le 24 janvier, c’est quel jour ?' }, clips, []);
  assert.deepEqual(steps.map((s) => s.pause), ['phrase', 'virgule', 'phrase']);
  assert.equal(qualitePlan(steps), 'virgule');
  assert.equal(qualitePlan(clipsFor({ text: 'Léa a 2 pommes.' }, clips, ['Léa'])), 'prenom');
  assert.equal(qualitePlan(clipsFor({ text: 'Combien font 7 + 5 ?' }, clips, [])), 'court');
  assert.equal(qualitePlan(clipsFor({ text: 'fleur, souris, ou gâteau' }, clips, [])), 'mot');
  assert.equal(pauseBetween('Touche le mot :', 'chat'), 'virgule');
  assert.equal(pauseBetween('chat', 'Touche les lettres dans l’ordre.'), 'phrase');
  assert.equal(pauseBetween('Bravo !', 'ou'), 'phrase');
});

test('voix naturelle : le manifeste et les paquets de sons correspondent', () => {
  assert.equal(manifest.sons, Object.keys(manifest.clips).length);
  assert.ok(manifest.paquets.length >= 1);
  const stored = new Map();
  let bytes = 0;
  for (const pack of manifest.paquets) {
    assert.match(pack.nom, /^paquet-[0-9a-f]{12}\.mp3$/);
    const size = pack.sons.reduce((sum, [, n]) => sum + n, 0);
    assert.equal(statSync(join(APP, 'voix', pack.nom)).size, size, `${pack.nom} : taille`);
    bytes += size;
    for (const [file] of pack.sons) {
      assert.ok(!stored.has(file), `son en double : ${file}`);
      stored.set(file, pack.nom);
    }
  }
  assert.equal(manifest.octets, bytes);
  for (const file of new Set(Object.values(manifest.clips))) assert.ok(stored.has(file), `son absent des paquets : ${file}`);
  // pas de son en dehors des paquets, ni de paquet oublié
  for (const lang of ['fr', 'en']) assert.ok(!existsSync(join(APP, 'voix', lang)), `app/voix/${lang}/ doit être rangé en paquets`);
  const names = new Set(manifest.paquets.map((p) => p.nom));
  for (const name of readdirSync(join(APP, 'voix'))) if (name.startsWith('paquet-')) assert.ok(names.has(name), `paquet inutile : ${name}`);
  // les clés du manifeste sont bien celles que calcule l'application
  for (const key of Object.keys(manifest.clips).slice(0, 500)) {
    const [lang, rate, ...text] = key.split('|');
    assert.equal(cle(text.join('|'), { lang, rate: Number(rate) * 0.95 }), key);
  }
});

test('voix naturelle : sons et pauses en MP3 sans en-tête, mis bout à bout sans trou', () => {
  // 24 kHz, 32 kbit/s, mono, débit constant : des trames de 96 octets, la première dès le début
  const isMp3 = (bytes, name) => {
    assert.ok(bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0, `${name} : pas de trame MP3 au début`);
    assert.equal(bytes.length % 96, 0, `${name} : débit non constant`);
  };
  for (const name of ['pause-phrase.mp3', 'pause-virgule.mp3']) isMp3(readFileSync(join(APP, 'voix', name)), name);
  for (const pack of manifest.paquets) {
    const body = readFileSync(join(APP, 'voix', pack.nom));
    let start = 0;
    for (const [file, n] of pack.sons) {
      isMp3(body.subarray(start, start + n), file);
      start += n;
    }
  }
});

test('voix naturelle : tout ce que disent les jeux est dit par Estelle, presque toujours phrase par phrase', () => {
  const available = (key) => Object.hasOwn(manifest.clips, key);
  const counts = {};
  const missing = new Set();
  let total = 0;
  for (const game of GAMES) {
    for (let level = 1; level <= game.levels.length; level++) {
      for (let s = 0; s < 12; s++) {
        const q = game.generate(level, createRng(s * 104729 + level * 13 + 7), s, { name: 'Léa', season: ['hiver', 'noel', 'ete'][s % 3] });
        for (const part of spoken(q)) {
          const quality = qualitePlan(planLecture(part.text, available, { lang: part.lang, rate: part.rate, names: ['Léa'] }));
          counts[quality] = (counts[quality] || 0) + 1;
          total++;
          if (quality === 'absent') missing.add(`${game.id} : ${part.text}`);
        }
      }
    }
  }
  assert.deepEqual([...missing].slice(0, 10), [], 'jamais la voix de l’appareil');
  const share = (q) => (counts[q] || 0) / total;
  // ce qui est dit en entier ou coupé seulement à une virgule ou autour du prénom
  assert.ok(share('entier') + share('virgule') + share('prenom') > 0.9, JSON.stringify(counts));
  assert.ok(share('mot') < 0.03, JSON.stringify(counts));
});
