// Test de bout en bout de l'application d'affiches :
// - mise en page sur iPhone, iPad, Android et ordinateur (portrait et paysage) : rien ne déborde,
//   l'aperçu est dessiné, aucune erreur ni violation de la règle de sécurité (CSP) ;
// - parcours complet sur iPhone : prénoms, numéros, genre, cheveux, couleurs, puis JPG et PDF
//   en A4 et en A3 (taille en pixels, résolution, format de page du PDF), impression ;
// - fonctionnement sans Internet (service worker).
// Usage : npm run test:e2e:affiche   (SCREENSHOTS=dossier pour enregistrer des captures)
//         CHROMIUM_PATH=/chemin/vers/chrome pour un Chromium déjà installé ; PORT=8125

import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
import { startServer } from './serve.mjs';

const PORT = Number(process.env.PORT) || 8125;
const BASE = `http://localhost:${PORT}/`;
const SHOTS = process.env.SCREENSHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const DEVICES = [
  ['iPhone SE', 375, 667, true],
  ['iPhone 15', 393, 852, true],
  ['iPhone 15 Pro Max', 430, 932, true],
  ['iPhone 15 paysage', 852, 393, true],
  ['iPhone SE paysage', 667, 375, true],
  ['iPad mini', 744, 1133, true],
  ['iPad Air paysage', 1180, 820, true],
  ['iPad Pro 12,9', 1024, 1366, true],
  ['Android Pixel 7', 412, 915, true],
  ['Android Galaxy S8', 360, 740, true],
  ['Android tablette paysage', 1280, 800, true],
  ['Ordinateur', 1440, 900, false],
];

const server = await startServer(PORT, new URL('../affiche/', import.meta.url).pathname);
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const errors = [];
const check = (ok, message) => { if (!ok) throw new Error(message); };

async function newPage([name, width, height, mobile], options = {}) {
  const context = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile, locale: 'fr-FR', acceptDownloads: true, ...options,
  });
  await context.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => console.error(`CSP ${e.violatedDirective} ${e.blockedURI}`));
  });
  const page = await context.newPage();
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`${name} : ${msg.text()}`); });
  page.on('pageerror', (e) => errors.push(`${name} : ${e.message}`));
  return { context, page };
}

/** L'aperçu est dessiné : pixels de couleurs variées au centre de l'affiche. */
async function previewDrawn(page) {
  return page.evaluate(() => {
    const c = document.getElementById('poster');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    const colors = new Set();
    for (let i = 0; i < d.length; i += 4 * 97) colors.add(`${d[i] >> 4},${d[i + 1] >> 4},${d[i + 2] >> 4}`);
    return c.width > 100 && colors.size > 20;
  });
}

async function layout(device) {
  const { context, page } = await newPage(device);
  await page.goto(BASE);
  await page.waitForFunction(() => document.fonts.status === 'loaded');
  await page.waitForTimeout(150);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 0, `${device[0]} : la page déborde de ${overflow}px en largeur`);
  check(await previewDrawn(page), `${device[0]} : aperçu vide`);
  const box = await page.locator('#poster').boundingBox();
  check(box.width >= 150, `${device[0]} : aperçu trop petit (${Math.round(box.width)}px)`);
  check(box.x >= 0 && box.x + box.width <= device[1], `${device[0]} : aperçu coupé`);
  // les boutons de réglage restent assez grands pour le doigt
  const small = await page.$$eval('.choice span, .btn, input[type="text"]', (els) => els
    .filter((el) => el.offsetParent)
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.height < 40).length);
  check(small === 0, `${device[0]} : ${small} commandes trop petites`);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${device[0].replace(/\W+/g, '-')}.png` });
  await context.close();
  console.log(`✓ mise en page ${device[0]} (${device[1]}×${device[2]})`);
}

/** Crée le fichier puis le télécharge par le lien « Enregistrer » ; renvoie son contenu. */
async function exportFile(page, kind) {
  await page.click(`[data-export="${kind}"]`);
  await page.waitForSelector('#dialog-actions a.btn', { timeout: 60000 });
  const info = await page.textContent('#dialog-text');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#dialog-actions a.btn')]);
  const bytes = readFileSync(await download.path());
  await page.click('#dialog-close');
  return { head: bytes.subarray(0, 4000), bytes, length: bytes.length, name: download.suggestedFilename(), info };
}

function jpegFacts(head) {
  let i = 2;
  const facts = {};
  if (head[2] === 0xff && head[3] === 0xe0) facts.dpi = head[13] === 1 ? (head[14] << 8) | head[15] : 0;
  while (i < head.length - 9) {
    if (head[i] !== 0xff) { i += 1; continue; }
    const marker = head[i + 1];
    const len = (head[i + 2] << 8) | head[i + 3];
    if (marker >= 0xc0 && marker <= 0xc3) {
      facts.height = (head[i + 5] << 8) | head[i + 6];
      facts.width = (head[i + 7] << 8) | head[i + 8];
      break;
    }
    i += 2 + len;
  }
  return facts;
}

async function journey() {
  const device = DEVICES[1];
  const { context, page } = await newPage(device);
  await page.goto(BASE);
  await page.waitForFunction(() => document.fonts.status === 'loaded');

  await page.fill('#children-0-name', 'Léa');
  await page.fill('#children-0-number', '7a');
  check(await page.inputValue('#children-0-number') === '7', 'le numéro garde des lettres');
  await page.fill('#adults-0-name', 'Jean-Pierre');
  await page.fill('#adults-0-number', '10');
  check((await page.textContent('[data-count="adults.0.number"]')).trim() === '2/2', 'compteur du numéro');

  // garçon : seulement les coiffures de garçon
  await page.click('[data-group="children.0.gender"] input[value="garcon"]');
  const boyHairs = await page.$$eval('[data-group="children.0.hair"] input', (els) => els.map((e) => e.value));
  check(!boyHairs.includes('queue') && boyHairs.includes('court') && boyHairs.includes('long'), `coiffures garçon : ${boyHairs}`);
  check(await page.isChecked('[data-group="children.0.hair"] input[value="court"]'), 'coiffure courte par défaut pour un garçon');
  await page.click('[data-group="children.0.hair"] input[value="long"]');
  await page.click('[data-group="children.0.hairColor"] input[value="roux"]');
  await page.click('[data-group="children.0.skin"] input[value="mat"]');
  await page.click('[data-group="adults.0.skin"] input[value="fonce"]');

  // maman : libellés ; ses cheveux ne comptent que s'ils dépassent sous l'enfant
  await page.click('[data-group="adults.0.kind"] input[value="maman"]');
  check((await page.textContent('#adults-0 legend')) === 'La maman', 'libellé maman');
  check(!(await page.isVisible('#adults-0-hair-color')), 'cheveux courts cachés : pas de couleur à choisir');
  await page.click('[data-group="adults.0.hair"] input[value="long"]');
  check(await page.isVisible('#adults-0-hair-color'), 'cheveux longs : couleur à choisir');

  // compositions : une fiche par personne
  await page.click('[data-group="layout"] input[value="deux-parents-quatre-enfants"]');
  check(await page.locator('#people .person').count() === 6, '2 parents et 4 enfants : 6 fiches');
  check((await page.textContent('#children-3 legend')).includes('parent 2'), 'place du 4e enfant');
  check(await page.isVisible('#adults-1-hair-color'), 'parent qui porte deux enfants : sa tête est visible');
  check(await previewDrawn(page), 'aperçu à 6 personnes');
  await page.click('[data-group="layout"] input[value="deux-enfants"]');
  check(await page.locator('#people .person').count() === 3, '1 parent et 2 enfants : 3 fiches');
  await page.click('[data-group="layout"] input[value="solo"]');
  check(await page.inputValue('#children-0-name') === 'Léa', 'prénom gardé en changeant de composition');

  // thème : le titre suit
  await page.click('[data-group="theme"] input[value="ciel-blanc"]');
  check(await page.inputValue('#title') === 'MARSEILLE', 'le titre suit le thème');
  await page.fill('#title', 'Allez Léa');
  await page.click('[data-group="theme"] input[value="vert"]');
  check(await page.inputValue('#title') === 'Allez Léa', 'un titre personnalisé est gardé');
  await page.click('[data-group="theme"] input[value="perso"]');
  check(await page.isVisible('#custom-colors'), 'couleurs personnalisées');
  await page.click('[data-group="showTitle"] input[value="non"]');
  check(!(await page.isVisible('#title')), 'titre masqué');
  await page.click('[data-group="showTitle"] input[value="oui"]');
  check(await previewDrawn(page), 'aperçu après réglages');

  // les réglages restent après rechargement
  await page.reload();
  check(await page.inputValue('#children-0-name') === 'Léa', 'réglages enregistrés');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/parcours.png`, fullPage: true });

  // JPG et PDF, A4 puis A3
  const expected = { a4: { w: 2480, h: 3508, pt: '595.28 841.89' }, a3: { w: 3508, h: 4961, pt: '841.89 1190.55' } };
  for (const format of ['a4', 'a3']) {
    await page.click(`[data-group="format"] input[value="${format}"]`);
    const jpg = await exportFile(page, 'jpg');
    const facts = jpegFacts(jpg.head);
    check(facts.width === expected[format].w && facts.height === expected[format].h, `JPG ${format} : ${facts.width}×${facts.height}`);
    check(facts.dpi === 300, `JPG ${format} : ${facts.dpi} dpi`);
    check(jpg.name === `affiche-lea-jean-pierre-${format}.jpg`, `nom du fichier : ${jpg.name}`);
    check(jpg.length > 300_000, `JPG ${format} trop léger (${jpg.length} octets)`);
    console.log(`✓ JPG ${format.toUpperCase()} ${facts.width}×${facts.height} à ${facts.dpi} dpi (${(jpg.length / 1e6).toFixed(1)} Mo)`);

    const pdf = await exportFile(page, 'pdf');
    const text = new TextDecoder('latin1').decode(pdf.head);
    check(text.startsWith('%PDF-1.4'), 'en-tête PDF');
    check(text.includes(`/MediaBox [0 0 ${expected[format].pt}]`), `PDF ${format} : format de page`);
    check(text.includes(`/Width ${expected[format].w}`), `PDF ${format} : largeur de l'image`);
    console.log(`✓ PDF ${format.toUpperCase()} (${(pdf.length / 1e6).toFixed(1)} Mo) : ${pdf.info}`);
  }

  // impression
  await page.click('[data-export="print"]');
  await page.waitForSelector('#dialog-actions .btn', { timeout: 60000 });
  check((await page.textContent('#dialog-title')) === 'Prêt à imprimer', 'impression prête');
  check((await page.textContent('#page-size')).includes('A3'), 'format de page à l’impression');
  await page.click('#dialog-close');

  // grande famille en A4
  await page.click('[data-group="format"] input[value="a4"]');
  await page.click('[data-group="layout"] input[value="deux-parents-quatre-enfants"]');
  const family = await exportFile(page, 'jpg');
  const familyFacts = jpegFacts(family.head);
  check(familyFacts.width === 2480 && familyFacts.height === 3508, `JPG famille : ${familyFacts.width}×${familyFacts.height}`);
  check(family.name === 'affiche-lea-leo-jade-tom-jean-pierre-claire-a4.jpg', `nom du fichier famille : ${family.name}`);
  console.log('✓ parcours complet sur iPhone (prénoms, cheveux, compositions, couleurs, JPG, PDF, impression)');
  await context.close();
}

async function offline() {
  const { context, page } = await newPage(DEVICES[0]);
  await page.goto(BASE);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await page.waitForFunction(() => document.fonts.status === 'loaded');
  check(await previewDrawn(page), 'hors ligne : aperçu vide');
  await context.close();
  console.log('✓ fonctionne sans Internet');
}

try {
  for (const device of DEVICES) await layout(device);
  await journey();
  await offline();
  check(errors.length === 0, `erreurs dans la page :\n${errors.join('\n')}`);
  console.log('Tout est bon.');
} catch (error) {
  console.error(`✗ ${error.message}`);
  if (errors.length) console.error(errors.join('\n'));
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
