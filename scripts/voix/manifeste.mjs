// Écrit app/voix/manifest.json : pour chaque phrase de scripts/voix/a-generer.json dont le son
// existe dans app/voix/, la clé et le fichier. Retire les sons qui ne servent plus.
// Usage : node scripts/voix/manifeste.mjs
import { readdirSync, readFileSync, rmSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const VOIX = join(ROOT, 'app/voix');
const list = JSON.parse(readFileSync(join(ROOT, 'scripts/voix/a-generer.json'), 'utf8'));

const clips = {};
let bytes = 0;
let missing = 0;
for (const e of list) {
  const path = join(VOIX, e.file);
  if (!existsSync(path)) {
    missing++;
    continue;
  }
  clips[e.key] = e.file;
  bytes += statSync(path).size;
}

// les sons qui ne sont plus dans la liste (phrase modifiée ou retirée) sont supprimés
const wanted = new Set(list.map((e) => e.file));
let removed = 0;
for (const lang of ['fr', 'en']) {
  if (!existsSync(join(VOIX, lang))) continue;
  for (const name of readdirSync(join(VOIX, lang))) {
    if (!wanted.has(`${lang}/${name}`)) {
      rmSync(join(VOIX, lang, name));
      removed++;
    }
  }
}

const manifest = {
  voix: 'Pocket TTS (Kyutai), voix « Estelle » (français) et « Alba » (anglais), licence CC-BY 4.0',
  sons: Object.keys(clips).length,
  octets: bytes,
  clips: Object.fromEntries(Object.entries(clips).sort(([a], [b]) => a.localeCompare(b))),
};
writeFileSync(join(VOIX, 'manifest.json'), `${JSON.stringify(manifest)}\n`);
console.log(`${manifest.sons} sons (${(bytes / 1e6).toFixed(1)} Mo), ${missing} manquants, ${removed} retirés → app/voix/manifest.json`);
