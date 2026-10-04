import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cle, enMots, morceaux, normaliser, vitesse } from '../app/js/voix-cles.js';
import { clipsFor } from '../app/js/speech.js';

const APP = new URL('../app/', import.meta.url).pathname;

test('voix naturelle : clés identiques malgré la typographie', () => {
  assert.equal(normaliser('C’est l’heure  !'), "C'est l'heure !");
  assert.equal(cle('Bravo !'), cle('Bravo !'));
  assert.equal(cle('Bravo !', { lang: 'fr-FR', rate: 0.95 }), 'fr|1|Bravo !');
  assert.equal(cle('Red', { lang: 'en-GB', rate: 0.8 }), 'en|0.85|Red');
  assert.equal(vitesse(undefined), 1);
});

test('voix naturelle : phrases découpées en texte, nombres et prénoms', () => {
  const texts = (t, names = [], lang) => morceaux(t, names, lang).map((m) => `${m.type}:${m.text}`);
  assert.deepEqual(texts('Combien font 7 + 5 ?'), ['texte:Combien font', 'nombre:7', 'texte:plus', 'nombre:5']);
  assert.deepEqual(texts('Bravo Eva-Rose !', ['Eva-Rose']), ['texte:Bravo', 'prenom:Eva-Rose']);
  assert.deepEqual(texts('Le 1er mai'), ['texte:Le', 'nombre:1er', 'texte:mai']);
  assert.deepEqual(texts('Il est 8 h 15.'), ['texte:Il est', 'nombre:8', 'texte:heures', 'nombre:15']);
  // un prénom n'est découpé qu'entier (« Eva-Roselyne » n'est pas « Eva-Rose »)
  assert.deepEqual(texts('Eva-Roselyne a 3 billes', ['Eva-Rose']), ['texte:Eva-Roselyne a', 'nombre:3', 'texte:billes']);
  assert.equal(enMots('12 − 4 = ?', 'en'), '12 minus 4 equals ?');
});

test('voix naturelle : la phrase entière, sinon tous ses morceaux, sinon rien (voix de l’appareil)', () => {
  const clips = {
    [cle('Bravo !')]: 'fr/a.mp3',
    [cle('Combien font')]: 'fr/b.mp3',
    [cle('plus')]: 'fr/c.mp3',
    [cle('7')]: 'fr/7.mp3',
    [cle('5')]: 'fr/5.mp3',
    [cle('Bravo')]: 'fr/d.mp3',
    [cle('Léa')]: 'fr/lea.mp3',
  };
  assert.deepEqual(clipsFor({ text: 'Bravo !' }, clips).map((c) => c.file), ['fr/a.mp3']);
  assert.deepEqual(clipsFor({ text: 'Combien font 7 + 5 ?' }, clips).map((c) => c.file), ['fr/b.mp3', 'fr/7.mp3', 'fr/c.mp3', 'fr/5.mp3']);
  assert.deepEqual(clipsFor({ text: 'Bravo Léa !' }, clips, ['Léa']).map((c) => c.file), ['fr/d.mp3', 'fr/lea.mp3']);
  // un nombre lu plus vite garde son son normal ; un morceau manquant : tout passe à la voix de l'appareil
  assert.deepEqual(clipsFor({ text: '7', rate: 1.1 }, clips).map((c) => c.file), ['fr/7.mp3']);
  assert.equal(clipsFor({ text: 'Combien font 7 moins 5 ?' }, clips), null);
  assert.equal(clipsFor({ text: 'Bravo Zoé !' }, clips, ['Léa']), null);
  assert.equal(clipsFor({ text: 'Bravo !' }, null), null);
});

test('voix naturelle : le manifeste et les sons correspondent', () => {
  const manifest = JSON.parse(readFileSync(join(APP, 'voix/manifest.json'), 'utf8'));
  const files = new Set(Object.values(manifest.clips));
  assert.equal(manifest.sons, Object.keys(manifest.clips).length);
  for (const file of files) assert.ok(existsSync(join(APP, 'voix', file)), `son absent : ${file}`);
  for (const lang of ['fr', 'en']) {
    if (!existsSync(join(APP, 'voix', lang))) continue;
    for (const name of readdirSync(join(APP, 'voix', lang))) assert.ok(files.has(`${lang}/${name}`), `son inutile : ${lang}/${name}`);
  }
  // les clés du manifeste sont bien celles que calcule l'application
  for (const key of Object.keys(manifest.clips).slice(0, 500)) {
    const [lang, rate, ...text] = key.split('|');
    assert.equal(cle(text.join('|'), { lang, rate: Number(rate) * 0.95 }), key);
  }
});
