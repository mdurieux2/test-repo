// Génère les icônes PNG de l'app (iOS exige du PNG pour l'écran d'accueil) :
// Eva-Rose et Matteo sur fond violet (lecture) et orange (maths).
// Usage : npm run icons

import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { avatarSvg } from '../app/js/characters.js';

const font = readFileSync(new URL('../app/fonts/andika-700.woff2', import.meta.url)).toString('base64');
const OUT = new URL('../app/icons/', import.meta.url).pathname;

const page = (size) => `
<style>
  @font-face { font-family: Andika; font-weight: 700; src: url(data:font/woff2;base64,${font}); }
  html, body { margin: 0; }
  .icon { position: relative; width: ${size}px; height: ${size}px; overflow: hidden;
    background: linear-gradient(135deg, #7b61ff 0 50%, #ff8a3d 50% 100%); }
  .icon span { position: absolute; width: 44%; height: 44%; border-radius: 50%; overflow: hidden;
    box-shadow: 0 0 0 ${size * 0.018}px #fff; }
  .icon span svg { width: 100%; height: 100%; display: block; }
  .eva { left: 5%; top: 13%; }
  .matteo { right: 5%; bottom: 13%; }
</style>
<div class="icon">
  <span class="eva">${avatarSvg('eva-rose')}</span>
  <span class="matteo">${avatarSvg('matteo')}</span>
</div>`;

const browser = await chromium.launch();
const tab = await browser.newPage();
for (const [name, size] of [['icon-512.png', 512], ['icon-192.png', 192], ['apple-touch-icon.png', 180]]) {
  await tab.setViewportSize({ width: size, height: size });
  await tab.setContent(page(size));
  await tab.evaluate(() => document.fonts.ready);
  await tab.screenshot({ path: `${OUT}${name}` });
  console.log(`icône ${name} (${size}px)`);
}
await browser.close();
