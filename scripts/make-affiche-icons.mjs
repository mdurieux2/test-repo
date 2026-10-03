// Génère les icônes PNG de l'application d'affiches (iOS exige du PNG pour l'écran d'accueil) :
// le haut de l'illustration (l'enfant sur les épaules), sans prénom ni numéro.
// Usage : npm run icons:affiche   (CHROMIUM_PATH=/chemin/vers/chrome pour un Chromium déjà installé)

import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { startServer } from './serve.mjs';

const PORT = Number(process.env.PORT) || 8131;
const ROOT = new URL('../affiche/', import.meta.url).pathname;
const OUT = new URL('../affiche/icons/', import.meta.url).pathname;

const server = await startServer(PORT, ROOT);
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage();
await page.goto(`http://localhost:${PORT}/manifest.webmanifest`);

for (const [name, size] of [['icon-512.png', 512], ['icon-192.png', 192], ['apple-touch-icon.png', 180]]) {
  const url = await page.evaluate(async (size) => {
    const { drawPoster } = await import('./js/poster.js');
    const settings = {
      showTitle: false,
      border: false,
      child: { name: '', number: '' },
      adult: { name: '', number: '' },
    };
    // zone carrée autour de l'enfant et des mains (unités de l'affiche)
    const [x, y, side] = [110, 190, 780];
    const scale = size / side;
    const poster = document.createElement('canvas');
    poster.width = Math.round(1000 * scale);
    poster.height = Math.round(1414 * scale);
    drawPoster(poster.getContext('2d'), settings, scale);
    const icon = document.createElement('canvas');
    icon.width = size;
    icon.height = size;
    icon.getContext('2d').drawImage(poster, -x * scale, -y * scale);
    return icon.toDataURL('image/png');
  }, size);
  writeFileSync(`${OUT}${name}`, Buffer.from(url.split(',')[1], 'base64'));
  console.log(`icône ${name} (${size}px)`);
}

await browser.close();
server.close();
