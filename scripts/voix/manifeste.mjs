// Écrit app/voix/manifest.json et les paquets de sons (app/voix/paquet-*.mp3).
//
// Les sons sont rangés dans une quinzaine de paquets d'environ 4 Mo, dans l'ordre de
// scripts/voix/a-generer.json (les plus entendus d'abord) : l'application télécharge ces
// paquets (quelques requêtes au lieu de milliers) et les redécoupe en sons. Un son est un MP3 à
// débit constant sans en-tête : un paquet est donc lui-même un MP3, et chaque son s'y retrouve
// par sa taille. Le manifeste donne, pour chaque phrase, son fichier (fr/….mp3, une adresse que le
// service worker sert depuis les paquets) et, pour chaque paquet, la liste de ses sons et leur taille.
//
// Les paquets déjà publiés restent tels quels (l'appareil n'a pas à les retélécharger) ; les
// nouveaux sons, posés dans app/voix/fr/ et app/voix/en/ par recuperer.sh (et retirés une fois
// rangés), vont dans de nouveaux paquets. Un paquet dont plus d'un quart ne sert plus est refait.
// Un son refait (generer.py --refaire) change de nom (empreinte de son contenu) : un appareil qui a
// gardé l'ancien son télécharge le nouveau, et l'ancien est retiré (service worker, pruneVoices).
// Usage : node scripts/voix/manifeste.mjs
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const VOIX = join(ROOT, 'app/voix');
const PACK_SIZE = 4_000_000;
const MIN_SIZE = 480; // un son plus court (un dixième de seconde) est raté : il sera refait
const list = JSON.parse(readFileSync(join(ROOT, 'scripts/voix/a-generer.json'), 'utf8'));

// 1. les nouveaux sons (posés par recuperer.sh sous le nom de a-generer.json) ; un son refait remplace l'ancien
const old = existsSync(join(VOIX, 'manifest.json')) ? JSON.parse(readFileSync(join(VOIX, 'manifest.json'), 'utf8')) : {};
const published = new Set((old.paquets || []).flatMap((p) => p.sons.map(([file]) => file)));
const loose = new Map(); // clé → [fichier, octets]
for (const e of list) {
  const path = join(VOIX, e.file);
  if (!existsSync(path)) continue;
  const bytes = readFileSync(path);
  if (bytes.length < MIN_SIZE) continue;
  // déjà publié sous ce nom : le son refait prend le nom de son contenu
  const file = published.has(e.file) || (old.clips?.[e.key] && old.clips[e.key] !== e.file)
    ? `${e.lang}/${createHash('sha1').update(bytes).digest('hex').slice(0, 16)}.mp3` : e.file;
  loose.set(e.key, [file, bytes]);
}
// le fichier de chaque clé : le nouveau son, sinon celui du manifeste actuel
const fileOf = new Map();
for (const e of list) {
  const file = loose.get(e.key)?.[0] || old.clips?.[e.key];
  if (file) fileOf.set(e.key, file);
}
const wanted = new Set(fileOf.values());

// 2. les paquets actuels : gardés s'ils servent encore aux trois quarts (un son refait ou retiré n'y sert plus)
const kept = [];
const pool = new Map(); // fichier → octets, à ranger dans de nouveaux paquets
for (const pack of old.paquets || []) {
  const path = join(VOIX, pack.nom);
  if (!existsSync(path)) continue;
  const bytes = readFileSync(path);
  const useful = pack.sons.filter(([file]) => wanted.has(file)).reduce((sum, [, size]) => sum + size, 0);
  if (useful >= bytes.length * 0.75 && !pack.sons.some(([, size]) => size < MIN_SIZE)) {
    kept.push({ nom: pack.nom, body: bytes, sons: pack.sons });
    continue;
  }
  let offset = 0;
  for (const [file, size] of pack.sons) {
    if (wanted.has(file) && size >= MIN_SIZE) pool.set(file, bytes.subarray(offset, offset + size));
    offset += size;
  }
}
let added = 0;
for (const [file, bytes] of loose.values()) {
  pool.set(file, bytes);
  added++;
}

// 3. les autres sons, dans l'ordre de la liste (les plus entendus d'abord), en nouveaux paquets
const packs = [...kept];
let current = [];
let size = 0;
const close = () => {
  if (!current.length) return;
  const content = Buffer.concat(current.map(([, bytes]) => bytes));
  const nom = `paquet-${createHash('sha1').update(content).digest('hex').slice(0, 12)}.mp3`;
  packs.push({ nom, body: content, sons: current.map(([file, bytes]) => [file, bytes.length]) });
  current = [];
  size = 0;
};
for (const e of list) {
  const file = fileOf.get(e.key);
  const bytes = pool.get(file);
  if (!bytes) continue;
  pool.delete(file);
  current.push([file, bytes]);
  size += bytes.length;
  if (size >= PACK_SIZE) close();
}
close();
const stored = new Set(packs.flatMap((p) => p.sons.map(([file]) => file)));
const clips = {};
let missing = 0;
for (const e of list) {
  if (stored.has(fileOf.get(e.key))) clips[e.key] = fileOf.get(e.key);
  else missing++;
}

// 4. écrit les paquets, retire les paquets refaits et les sons rangés
const names = new Set(packs.map((p) => p.nom));
for (const name of readdirSync(VOIX)) if (/^paquet-[0-9a-f]+\.mp3$/.test(name) && !names.has(name)) rmSync(join(VOIX, name));
for (const pack of packs) if (!existsSync(join(VOIX, pack.nom))) writeFileSync(join(VOIX, pack.nom), pack.body);
for (const lang of ['fr', 'en']) if (existsSync(join(VOIX, lang))) rmSync(join(VOIX, lang), { recursive: true });

const bytes = packs.reduce((sum, p) => sum + p.body.length, 0);
const manifest = {
  voix: 'Pocket TTS (Kyutai), voix « Estelle » (en français et en anglais), licence CC-BY 4.0',
  sons: Object.keys(clips).length,
  octets: bytes,
  clips: Object.fromEntries(Object.entries(clips).sort(([a], [b]) => a.localeCompare(b))),
  paquets: packs.map(({ nom, sons }) => ({ nom, sons })),
};
writeFileSync(join(VOIX, 'manifest.json'), `${JSON.stringify(manifest)}\n`);
console.log(`${manifest.sons} sons (${(bytes / 1e6).toFixed(1)} Mo) en ${packs.length} paquets (${kept.length} gardés), ${added} nouveaux, ${missing} manquants → app/voix/manifest.json`);
