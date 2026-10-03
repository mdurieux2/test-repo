import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const APP = new URL('../app/', import.meta.url).pathname;
const NOT_CACHED = new Set(['sw.js', 'fonts/OFL.txt']);

function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [relative(APP, path)];
  });
}

test('le service worker met en cache tous les fichiers de l’app (et seulement eux)', () => {
  const sw = readFileSync(join(APP, 'sw.js'), 'utf8');
  const list = sw.match(/const PRECACHE = \[([\s\S]*?)\];/)[1];
  const cached = [...list.matchAll(/'\.\/([^']*)'/g)].map((m) => m[1]).filter(Boolean);
  const files = listFiles(APP).filter((f) => !NOT_CACHED.has(f));
  assert.deepEqual([...cached].sort(), [...files].sort());
});

test('le manifeste et la page d’accueil pointent vers des fichiers existants', () => {
  const manifest = JSON.parse(readFileSync(join(APP, 'manifest.webmanifest'), 'utf8'));
  for (const icon of manifest.icons) assert.ok(statSync(join(APP, icon.src)).isFile(), icon.src);
  const html = readFileSync(join(APP, 'index.html'), 'utf8');
  for (const [, ref] of html.matchAll(/(?:href|src)="([^"#:]+)"/g)) {
    assert.ok(statSync(join(APP, ref)).isFile(), ref);
  }
});
