// Contrôle des contrastes (RGAA 3.2 et 3.3, WCAG 1.4.3 et 1.4.11), sans dépendance.
// Les fonctions de calcul servent aux tests unitaires (tests/a11y-contrastes.test.js) ; `auditPage`
// tourne dans le navigateur (scripts/smoke.mjs, PARTS=a11y) : ce fichier n'importe rien, pour pouvoir
// être injecté tel quel dans la page (voir `auditSource`).

/** Couleur CSS (#rgb, #rrggbb, #rrggbbaa, rgb(), rgba(), color(srgb …), transparent) → { r, g, b, a } (0–255, a : 0–1). */
export function parseColor(text) {
  const s = String(text || '').trim().toLowerCase();
  if (!s || s === 'transparent' || s === 'none') return { r: 0, g: 0, b: 0, a: 0 };
  let m = /^#([0-9a-f]{3,8})$/.exec(s);
  if (m) {
    let hex = m[1];
    if (hex.length === 3 || hex.length === 4) hex = hex.replace(/./g, '$&$&');
    if (hex.length !== 6 && hex.length !== 8) return null;
    const n = (i) => parseInt(hex.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: hex.length === 8 ? n(6) / 255 : 1 };
  }
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(s);
  if (m) {
    const alpha = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : Number(m[4]);
    return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]), a: alpha };
  }
  m = /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/.exec(s);
  if (m) {
    const alpha = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : Number(m[4]);
    return { r: Number(m[1]) * 255, g: Number(m[2]) * 255, b: Number(m[3]) * 255, a: alpha };
  }
  return null;
}

/** Luminance relative (WCAG 2.1) d'une couleur opaque : 0 (noir) à 1 (blanc). */
export function relativeLuminance({ r, g, b }) {
  const lin = (c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Pose une couleur (éventuellement transparente) sur un fond opaque. */
export function blend(top, bottom) {
  const a = top.a ?? 1;
  return {
    r: top.r * a + bottom.r * (1 - a), g: top.g * a + bottom.g * (1 - a), b: top.b * a + bottom.b * (1 - a), a: 1,
  };
}

/** Rapport de contraste entre deux couleurs (texte posé sur le fond s'il est transparent), de 1 à 21. */
export function contrastRatio(foreground, background) {
  const parse = (c) => (typeof c === 'string' ? parseColor(c) : c);
  const bg = blend(parse(background), { r: 255, g: 255, b: 255, a: 1 });
  const fg = blend(parse(foreground), bg);
  const [l1, l2] = [relativeLuminance(fg), relativeLuminance(bg)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Gros texte au sens des WCAG : 24 px (18 pt), ou 18,66 px (14 pt) en gras. */
export function isLargeText(fontSizePx, fontWeight) {
  return fontSizePx >= 24 || (fontSizePx >= 18.66 && Number(fontWeight) >= 700);
}

/** Seuil à atteindre : 4,5:1 pour le texte courant, 3:1 pour le gros texte. */
export function requiredRatio(fontSizePx, fontWeight) {
  return isLargeText(fontSizePx, fontWeight) ? 3 : 4.5;
}

export const toHex = ({ r, g, b }) => `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;

/**
 * Dans la page : contraste de chaque texte visible et des bords des champs.
 * Le fond d'un texte est cherché en remontant ses ancêtres (couleurs de fond superposées, opacité) ;
 * sur un dégradé, chacune de ses couleurs compte ; un texte posé sur une image, ou dans un dessin SVG,
 * n'est pas mesurable : il est listé à part.
 * Renvoie { checked, failures, skipped }.
 */
export function auditPage() {
  const WHITE = { r: 255, g: 255, b: 255, a: 1 };
  const chain = (el) => {
    const list = [];
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) list.push(node);
    return list.reverse(); // de <html> jusqu'à l'élément
  };
  /**
   * Fonds possibles sous chaque élément de la chaîne (avant opacité) : une seule couleur, ou les
   * couleurs d'un dégradé (le texte doit se lire sur chacune). Une image (url) rend le fond inconnu.
   */
  const backgrounds = (el) => {
    const nodes = chain(el);
    let bgs = [WHITE];
    let image = null;
    const below = []; // fonds sous l'élément i (avant de peindre son propre fond)
    for (const node of nodes) {
      below.push(bgs);
      const cs = getComputedStyle(node);
      const color = parseColor(cs.backgroundColor) || { r: 0, g: 0, b: 0, a: 0 };
      if (color.a >= 1) image = null;
      bgs = bgs.map((bg) => blend(color, bg));
      const layers = cs.backgroundImage && cs.backgroundImage !== 'none' ? cs.backgroundImage : '';
      if (layers) {
        const stops = (layers.match(/rgba?\([^)]*\)|color\(srgb[^)]*\)/g) || []).map(parseColor).filter(Boolean);
        if (/url\(/.test(layers) || !stops.length) image = `${node.tagName.toLowerCase()}.${[...node.classList].join('.')}`;
        else bgs = bgs.flatMap((bg) => stops.map((stop) => blend(stop, bg)));
      }
    }
    return { nodes, below, bgs, image };
  };
  /** Couleurs finales de `color` posée dans l'élément (opacité des ancêtres comprise) : une paire { fg, bg } par fond possible. */
  const finalColors = (el, color) => {
    const { nodes, below, bgs, image } = backgrounds(el);
    const pairs = bgs.map((bg, j) => {
      let fg = blend(color, bg);
      let back = bg;
      for (let i = nodes.length - 1; i >= 0; i--) {
        const opacity = Number(getComputedStyle(nodes[i]).opacity);
        if (opacity < 1) {
          const under = below[i][Math.min(j, below[i].length - 1)];
          fg = blend({ ...fg, a: opacity }, under);
          back = blend({ ...back, a: opacity }, under);
        }
      }
      return { fg, bg: back };
    });
    return { pairs, bg: pairs[0].bg, image };
  };
  const ratio = (a, b) => {
    const [l1, l2] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
  };
  const describe = (el) => {
    const cls = [...el.classList].filter((c) => !/^(on|off)$/.test(c)).slice(0, 3).join('.');
    return `${el.tagName.toLowerCase()}${cls ? `.${cls}` : ''}`;
  };
  const visible = (el) => {
    if (!el.getClientRects().length) return false;
    const r = el.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && !el.closest('.visually-hidden, [hidden]');
  };
  const failures = [];
  const skipped = [];
  let checked = 0;

  // 1. Textes : chaque élément qui porte directement du texte (lettres ou chiffres)
  const textOf = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
  const fields = 'input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=hidden]):not([type=file]), select, textarea';
  for (const el of document.body.querySelectorAll('*')) {
    if (el.closest('script, style, noscript, template')) continue;
    const isField = el.matches(fields);
    const text = isField ? (el.value || el.placeholder || '') : textOf(el);
    if (!/[\p{L}\p{N}]/u.test(text) || !visible(el)) continue;
    const label = `${describe(el)} « ${text.replace(/\s+/g, ' ').slice(0, 40)} »`;
    if (el.closest('svg')) {
      skipped.push(`${label} : texte dans un dessin`);
      continue;
    }
    // un bouton désactivé n'a pas d'exigence de contraste (WCAG 1.4.3, composant inactif)
    if (el.closest('button:disabled, [aria-disabled="true"], input:disabled')) continue;
    const cs = getComputedStyle(el, isField && !el.value ? '::placeholder' : null);
    const color = parseColor(cs.webkitTextFillColor || cs.color) || parseColor(cs.color);
    if (!color) {
      skipped.push(`${label} : couleur illisible (${cs.color})`);
      continue;
    }
    const { pairs, image } = finalColors(el, color);
    if (image) {
      skipped.push(`${label} : sur une image (${image})`);
      continue;
    }
    const size = parseFloat(getComputedStyle(el).fontSize);
    const weight = getComputedStyle(el).fontWeight;
    const need = requiredRatio(size, weight);
    // sur un dégradé, la couleur la moins contrastée compte
    const { fg, bg } = pairs.reduce((worst, p) => (ratio(p.fg, p.bg) < ratio(worst.fg, worst.bg) ? p : worst));
    const value = ratio(fg, bg);
    checked++;
    if (value < need - 0.005) {
      failures.push({
        kind: 'texte', label, ratio: Math.round(value * 100) / 100, need, color: toHex(fg), background: toHex(bg),
        size: Math.round(size * 10) / 10, weight: Number(weight),
      });
    }
  }

  // 2. Composants : le bord d'un champ de saisie (ou son fond) se distingue de ce qui l'entoure (3:1)
  const shadowColors = (shadow) => (shadow && shadow !== 'none'
    ? shadow.split(/,(?![^(]*\))/).map((part) => {
      const color = parseColor((/rgba?\([^)]*\)|#[0-9a-f]+/i.exec(part) || [])[0]);
      const lengths = (part.replace(/rgba?\([^)]*\)/, '').match(/-?[\d.]+px/g) || []).map(parseFloat);
      return { color, size: Math.max(Math.abs(lengths[0] || 0), Math.abs(lengths[1] || 0), lengths[3] || 0), inset: /inset/.test(part) };
    }).filter((s) => s.color && s.size >= 1)
    : []);
  for (const el of document.body.querySelectorAll(`${fields}, input[type=checkbox], input[type=radio]`)) {
    if (!visible(el) || el.disabled) continue;
    const cs = getComputedStyle(el);
    const outside = finalColors(el.parentElement, { r: 0, g: 0, b: 0, a: 0 }).bg;
    const own = blend(parseColor(cs.backgroundColor) || { r: 0, g: 0, b: 0, a: 0 }, outside);
    const candidates = [ratio(own, outside)];
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
      if (parseFloat(cs[`border${side}Width`]) >= 1) candidates.push(ratio(blend(parseColor(cs[`border${side}Color`]), outside), outside));
    }
    for (const s of shadowColors(cs.boxShadow)) candidates.push(ratio(blend(s.color, s.inset ? own : outside), s.inset ? own : outside));
    // case à cocher native (sans apparence personnalisée) : dessinée par le système, non mesurable
    if (el.matches('input[type=checkbox], input[type=radio]') && cs.appearance !== 'none') {
      skipped.push(`${describe(el)} : case dessinée par le navigateur`);
      continue;
    }
    checked++;
    const best = Math.max(...candidates);
    if (best < 3 - 0.005) {
      failures.push({
        kind: 'composant', label: `${describe(el)} (${el.getAttribute('aria-label') || el.name || el.type})`,
        ratio: Math.round(best * 100) / 100, need: 3, color: cs.borderTopColor, background: toHex(outside),
      });
    }
  }
  return { checked, failures, skipped };
}

/**
 * Contour de focus de l'élément actif : visible (≥ 2 px) et contrasté (≥ 3:1) avec le fond qui l'entoure.
 * Dans la page, après une touche Tab. Renvoie null si tout va bien, sinon une explication.
 */
export function focusProblem() {
  let el = document.activeElement;
  if (!el || el === document.body) return null;
  // un champ caché dans son étiquette (bouton « Choisir une photo ») : c'est l'étiquette qui montre le focus
  if (el.matches('.visually-hidden') && el.closest('label')) el = el.closest('label');
  const cs = getComputedStyle(el);
  const label = `${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 2).join('.')} « ${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30)} »`;
  const shadow = cs.boxShadow !== 'none' && /\b0px 0px 0px [3-9]/.test(cs.boxShadow);
  if ((cs.outlineStyle === 'none' || parseFloat(cs.outlineWidth) < 2) && !shadow) return `${label} : pas de contour de focus visible`;
  if (shadow && cs.outlineStyle === 'none') return null;
  // le contour est dessiné autour de l'élément : il se lit sur le fond de son parent
  let bg = { r: 255, g: 255, b: 255, a: 1 };
  const nodes = [];
  for (let node = el.parentElement; node; node = node.parentElement) nodes.unshift(node);
  for (const node of nodes) bg = blend(parseColor(getComputedStyle(node).backgroundColor) || { r: 0, g: 0, b: 0, a: 0 }, bg);
  const outline = blend(parseColor(cs.outlineColor), bg);
  const own = blend(parseColor(cs.backgroundColor) || { r: 0, g: 0, b: 0, a: 0 }, bg);
  const value = Math.max(contrastRatio(outline, bg), parseFloat(cs.outlineOffset) <= 0 ? contrastRatio(outline, own) : 0);
  return value < 3 ? `${label} : contour de focus peu visible (${value.toFixed(2)}:1, ${toHex(outline)} sur ${toHex(bg)})` : null;
}

/** Le code de ce fichier, à exécuter dans la page (page.evaluate ne charge pas de modules). */
export function auditSource(source) {
  return source.replace(/^export /gm, '');
}
