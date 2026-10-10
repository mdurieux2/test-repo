import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { emojiDeLApp } from '../scripts/emoji/liste.mjs';

test('emoji en couleur de secours : la police Twemoji contient tous les emoji de l’app', () => {
  const liste = readFileSync(new URL('../scripts/emoji/emoji.txt', import.meta.url), 'utf8').trim().split('\n');
  const manquants = emojiDeLApp().filter((e) => !liste.includes(e));
  assert.deepEqual(manquants, [], 'nouveaux emoji : relancer « node scripts/emoji/police.mjs »');
  const taille = statSync(new URL('../app/fonts/twemoji.woff2', import.meta.url)).size;
  assert.ok(taille < 400_000, `police réduite aux emoji de l’app (${taille} octets)`);
});

test('emoji en couleur de secours : seulement pour les emoji, et seulement si l’appareil n’en a pas', () => {
  const css = readFileSync(new URL('../app/css/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.emoji-secours \*[^{]*\{\s*font-family: 'Emoji couleur', 'Andika'/);
  const js = readFileSync(new URL('../app/js/emoji.js', import.meta.url), 'utf8');
  // ni les lettres, ni les chiffres, ni la ponctuation ne sont pris dans la police des emoji
  const debuts = [...js.match(/const PLAGES = ([^;]+);/)[1].matchAll(/U\+([0-9A-F]+)/g)].map((m) => parseInt(m[1], 16));
  assert.ok(debuts.length && debuts.every((c) => c >= 0x200d), debuts.map((c) => c.toString(16)).join(' '));
});
