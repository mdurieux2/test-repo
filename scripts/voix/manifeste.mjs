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
// Usage : node scripts/voix/manifeste.mjs
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const VOIX = join(ROOT, 'app/voix');
const PACK_SIZE = 4_000_000;
const list = JSON.parse(readFileSync(join(ROOT, 'scripts/voix/a-generer.json'), 'utf8'));

// 1. les paquets actuels : gardés s'ils servent encore aux trois quarts
const wanted = new Map(list.map((e) => [e.file, e]));
const old = existsSync(join(VOIX, 'manifest.json')) ? JSON.parse(readFileSync(join(VOIX, 'manifest.json'), 'utf8')) : {};
const kept = [];
const pool = new Map(); // fichier → octets, à ranger dans de nouveaux paquets
for (const pack of old.paquets || []) {
  const path = join(VOIX, pack.nom);
  if (!existsSync(path)) continue;
  const bytes = readFileSync(path);
  const useful = pack.sons.filter(([file]) => wanted.has(file)).reduce((sum, [, size]) => sum + size, 0);
  if (useful >= bytes.length * 0.75) {
    kept.push({ nom: pack.nom, body: bytes, sons: pack.sons });
    continue;
  }
  let offset = 0;
  for (const [file, size] of pack.sons) {
    if (wanted.has(file)) pool.set(file, bytes.subarray(offset, offset + size));
    offset += size;
  }
}
const inKept = new Set(kept.flatMap((p) => p.sons.map(([file]) => file)));
let added = 0;
for (const lang of ['fr', 'en']) {
  if (!existsSync(join(VOIX, lang))) continue;
  for (const name of readdirSync(join(VOIX, lang))) {
    const file = `${lang}/${name}`;
    if (!inKept.has(file) && wanted.has(file)) {
      pool.set(file, readFileSync(join(VOIX, lang, name)));
      added++;
    }
  }
}

// 2. les autres sons, dans l'ordre de la liste (les plus entendus d'abord), en nouveaux paquets
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
  const bytes = pool.get(e.file);
  if (!bytes) continue;
  pool.delete(e.file);
  current.push([e.file, bytes]);
  size += bytes.length;
  if (size >= PACK_SIZE) close();
}
close();
const stored = new Set(packs.flatMap((p) => p.sons.map(([file]) => file)));
const clips = {};
let missing = 0;
for (const e of list) {
  if (stored.has(e.file)) clips[e.key] = e.file;
  else missing++;
}

// 3. écrit les paquets, retire les paquets refaits et les sons rangés
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
