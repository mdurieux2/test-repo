// Contrastes (RGAA 3.2 et 3.3, WCAG 1.4.3 et 1.4.11) : le calcul lui-même, puis les couleurs de
// style.css (variables principales, rubriques, thèmes des jeux). Le contrôle écran par écran est
// fait dans le navigateur par le test de bout en bout : PARTS=a11y npm run test:e2e.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  auditSource, blend, contrastRatio, isLargeText, parseColor, relativeLuminance, requiredRatio,
} from '../scripts/a11y-audit.mjs';
import { DOMAINS } from '../app/js/games/index.js';

const CSS = readFileSync(new URL('../app/css/style.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** Variables de :root (la dernière définition l'emporte). */
const ROOT = {};
for (const [, body] of CSS.matchAll(/:root\s*{([^}]*)}/g)) {
  for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) ROOT[name] = value.trim();
}
/** Une valeur CSS avec ses var() remplacées (variables propres à la règle d'abord, puis :root). */
function resolve(value, local = {}) {
  let out = value;
  for (let i = 0; i < 5 && /var\(/.test(out); i++) {
    out = out.replace(/var\((--[\w-]+)(?:,\s*([^)]+))?\)/g, (_, name, fallback) => local[name] ?? ROOT[name] ?? fallback ?? '');
  }
  return out.trim();
}
/** Déclarations de la dernière règle dont le sélecteur est exactement `selector` (les suivantes complètent). */
function rule(selector) {
  const out = {};
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const [, body] of CSS.matchAll(new RegExp(`(?:^|[}\\s])${escaped}\\s*{([^}]*)}`, 'g'))) {
    for (const [, name, value] of body.matchAll(/([\w-]+)\s*:\s*([^;]+);?/g)) out[name] = value.trim();
  }
  return out;
}
/** Couleur de fond d'une règle (background ou background-color), var() résolues. */
function backgroundOf(selector) {
  const decl = rule(selector);
  const value = resolve(decl['background-color'] || decl.background || '', decl);
  return /^#|^rgb/.test(value) ? value.split(/\s+/)[0] : null;
}

// ---------------------------------------------------------------- Le calcul

test('contraste : noir sur blanc 21:1, une couleur sur elle-même 1:1, dans les deux sens', () => {
  assert.equal(contrastRatio('#000', '#fff'), 21);
  assert.equal(contrastRatio('#fff', '#000'), 21);
  assert.equal(contrastRatio('#7257ff', '#7257ff'), 1);
  assert.equal(contrastRatio('#2b2d42', '#fff7e8'), contrastRatio('#fff7e8', '#2b2d42'));
});

test('contraste : valeurs connues (seuils des WCAG)', () => {
  // #767676 sur blanc : le gris le plus clair qui passe 4,5:1 ; #777777 ne passe pas
  assert.ok(contrastRatio('#767676', '#ffffff') >= 4.5);
  assert.ok(contrastRatio('#777777', '#ffffff') < 4.5);
  // #949494 sur blanc : juste au-dessus de 3:1
  assert.ok(Math.abs(contrastRatio('#949494', '#ffffff') - 3.03) < 0.01);
  assert.ok(Math.abs(relativeLuminance(parseColor('#808080')) - 0.2159) < 0.0005);
});

test('contraste : un texte ou un fond transparent est d’abord posé sur ce qu’il recouvre', () => {
  assert.deepEqual(blend({ r: 0, g: 0, b: 0, a: 0.5 }, { r: 255, g: 255, b: 255, a: 1 }), { r: 127.5, g: 127.5, b: 127.5, a: 1 });
  // texte noir à moitié transparent sur blanc = gris moyen
  assert.ok(Math.abs(contrastRatio('rgba(0, 0, 0, 0.5)', '#fff') - contrastRatio('rgb(127.5, 127.5, 127.5)', '#fff')) < 1e-9);
  // un fond transparent laisse voir le blanc de la page
  assert.equal(contrastRatio('#000', 'transparent'), 21);
});

test('couleurs CSS lues : #rgb, #rrggbb, #rrggbbaa, rgb(), rgba(), color(srgb), transparent', () => {
  assert.deepEqual(parseColor('#fa0'), { r: 255, g: 170, b: 0, a: 1 });
  assert.deepEqual(parseColor('#7257FF'), { r: 114, g: 87, b: 255, a: 1 });
  assert.deepEqual(parseColor('#00000080'), { r: 0, g: 0, b: 0, a: 128 / 255 });
  assert.deepEqual(parseColor('rgb(43, 45, 66)'), { r: 43, g: 45, b: 66, a: 1 });
  assert.deepEqual(parseColor('rgba(255, 255, 255, 0.25)'), { r: 255, g: 255, b: 255, a: 0.25 });
  assert.deepEqual(parseColor('rgb(0 0 0 / 50%)'), { r: 0, g: 0, b: 0, a: 0.5 });
  assert.deepEqual(parseColor('color(srgb 1 0 0)'), { r: 255, g: 0, b: 0, a: 1 });
  assert.equal(parseColor('transparent').a, 0);
  assert.equal(parseColor('oklch(50% 0.1 20)'), null);
});

test('gros texte : 24 px, ou 18,66 px en gras ; seuil 3:1 au lieu de 4,5:1', () => {
  assert.equal(isLargeText(24, 400), true);
  assert.equal(isLargeText(23.9, 400), false);
  assert.equal(isLargeText(18.66, 700), true);
  assert.equal(isLargeText(18.66, 600), false);
  assert.equal(isLargeText(17.6, 700), false); // tuile d'une rubrique sur un petit iPhone
  assert.equal(requiredRatio(16, 700), 4.5);
  assert.equal(requiredRatio(30.4, 700), 3);
});

test('le contrôle injecté dans la page n’a ni import ni export', () => {
  const source = auditSource(readFileSync(new URL('../scripts/a11y-audit.mjs', import.meta.url), 'utf8'));
  assert.doesNotMatch(source, /^\s*(import|export)\s/m);
  assert.match(source, /function auditPage\(/);
  assert.match(source, /function focusProblem\(/);
});

// ---------------------------------------------------------------- Les couleurs de l'app

test('variables principales : texte et texte secondaire lisibles sur le fond, les cartes et les fonds pastel', () => {
  for (const bg of ['--bg', '--card']) {
    assert.ok(contrastRatio(ROOT['--ink'], ROOT[bg]) >= 7, `--ink sur ${bg}`);
    assert.ok(contrastRatio(ROOT['--muted'], ROOT[bg]) >= 4.5, `--muted sur ${bg} : ${contrastRatio(ROOT['--muted'], ROOT[bg]).toFixed(2)}`);
  }
  for (const soft of ['--lecture-soft', '--maths-soft', '--anglais-soft']) {
    assert.ok(contrastRatio(ROOT['--muted'], ROOT[soft]) >= 4.5, `--muted sur ${soft}`);
  }
});

test('couleurs de la charte : texte blanc à 4,5:1 au moins (boutons, onglets, choix sélectionnés)', () => {
  for (const name of ['--lecture', '--lecture-dark', '--maths', '--maths-dark', '--anglais', '--anglais-dark', '--album', '--good', '--good-dark']) {
    const ratio = contrastRatio('#ffffff', ROOT[name]);
    assert.ok(ratio >= 4.5, `blanc sur ${name} (${ROOT[name]}) : ${ratio.toFixed(2)}:1`);
  }
});

test('couleurs foncées sur couleurs pastel : 4,5:1 au moins (badges de niveau, étiquettes)', () => {
  for (const domain of ['lecture', 'maths', 'anglais']) {
    const ratio = contrastRatio(ROOT[`--${domain}-dark`], ROOT[`--${domain}-soft`]);
    assert.ok(ratio >= 4.5, `--${domain}-dark sur --${domain}-soft : ${ratio.toFixed(2)}:1`);
  }
});

test('bord des champs et des interrupteurs : 3:1 au moins sur les cartes et sur le fond (composants)', () => {
  const line = ROOT['--field-line'];
  assert.ok(line, '--field-line est définie');
  for (const bg of ['--bg', '--card']) assert.ok(contrastRatio(line, ROOT[bg]) >= 3, `--field-line sur ${bg}`);
  assert.equal(resolve(rule('.select').border || ''), `2px solid ${line}`);
  assert.match(resolve(rule('.gate-input, .text-input').border || ''), new RegExp(`solid ${line}$`));
  assert.equal(resolve(rule('.setting input[type="checkbox"]').background || ''), line);
  // le rond blanc de l'interrupteur se voit sur le fond éteint comme allumé
  assert.ok(contrastRatio('#ffffff', line) >= 3);
  assert.ok(contrastRatio('#ffffff', ROOT['--good']) >= 3);
});

test('tuiles des rubriques : texte blanc à 4,5:1 (il rapetisse sous 18,66 px sur les petits écrans)', () => {
  const ids = [...DOMAINS.map((d) => d.id), 'album', 'defi', 'revision'];
  for (const id of ids) {
    const bg = backgroundOf(`.domain-${id}`);
    assert.ok(bg, `.domain-${id} a une couleur de fond`);
    const ratio = contrastRatio('#ffffff', bg);
    assert.ok(ratio >= 4.5, `blanc sur .domain-${id} (${bg}) : ${ratio.toFixed(2)}:1`);
  }
});

test('thèmes des rubriques dans les jeux : blanc sur la couleur, couleur foncée sur le pastel (4,5:1)', () => {
  const themes = [...new Set([...CSS.matchAll(/\.domain-theme-([\w-]+)\s*{/g)].map((m) => m[1]))];
  assert.ok(themes.length >= DOMAINS.length);
  for (const theme of themes) {
    const decl = rule(`.domain-theme-${theme}`);
    const accent = resolve(decl['--accent'], decl);
    const dark = resolve(decl['--accent-dark'], decl);
    const soft = resolve(decl['--accent-soft'], decl);
    assert.ok(contrastRatio('#ffffff', accent) >= 4.5, `blanc sur --accent de ${theme} (${accent}) : ${contrastRatio('#ffffff', accent).toFixed(2)}`);
    assert.ok(contrastRatio(dark, soft) >= 4.5, `--accent-dark sur --accent-soft de ${theme} : ${contrastRatio(dark, soft).toFixed(2)}`);
  }
});

test('cases à placer (« Les calculs à trous ») : gros chiffres blancs à 3:1 au moins', () => {
  for (const selector of ['.tile:nth-child(3n + 2)', '.tile:nth-child(3n)']) {
    const bg = backgroundOf(selector);
    assert.ok(contrastRatio('#ffffff', bg) >= 3, `${selector} (${bg})`);
  }
});

test('le zoom du navigateur n’est pas bloqué et la page est en français', () => {
  const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
  const viewport = /<meta name="viewport" content="([^"]*)"/.exec(html)[1];
  assert.doesNotMatch(viewport, /maximum-scale|user-scalable\s*=\s*(no|0)/);
  assert.match(html, /<html lang="fr">/);
});
