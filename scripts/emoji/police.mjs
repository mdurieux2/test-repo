// Fabrique app/fonts/twemoji.woff2 : la police Twemoji (COLR, en couleur) réduite aux seuls emoji
// de l'app. Elle n'est chargée que sur les appareils qui dessinent les emoji en noir et blanc
// (navigateur des voitures Tesla, Chromium sous Linux…), voir app/js/emoji.js.
// À relancer après avoir ajouté des emoji (un test le rappelle) :
//   pip install fonttools brotli
//   node scripts/emoji/police.mjs

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { emojiDeLApp } from './liste.mjs';

const RACINE = new URL('../../', import.meta.url).pathname;
const SOURCE = join(RACINE, 'node_modules/twemoji-colr-font/twemoji.woff2');
const POLICE = join(RACINE, 'app/fonts/twemoji.woff2');
const LISTE = join(RACINE, 'scripts/emoji/emoji.txt');

const emoji = emojiDeLApp();
const texte = join(mkdtempSync(join(tmpdir(), 'emoji-')), 'emoji.txt');
writeFileSync(texte, emoji.join('\n'));
execFileSync('pyftsubset', [
  SOURCE, `--text-file=${texte}`, '--unicodes=U+200D,U+FE0F', '--layout-features=*',
  '--flavor=woff2', `--output-file=${POLICE}`,
], { stdio: 'inherit' });
writeFileSync(LISTE, `${emoji.join('\n')}\n`);
console.log(`${emoji.length} emoji → app/fonts/twemoji.woff2`);
