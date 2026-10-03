// Écran de personnalisation : réglages, aperçu en direct, export JPG / PDF et impression.

import {
  POSTER_H, POSTER_W, drawPoster, jerseyName, jerseyNumber, loadFonts, withDefaults,
} from './poster.js';
import {
  ADULTS, CUSTOM_DEFAULT, GENDERS, HAIR_COLORS, LAYOUTS, SKINS, THEMES, adultHairsFor, findLayout, findTheme, hairsFor,
} from './themes.js';
import { HAIRS_BELOW } from './figures.js';
import { FORMATS, IOS_MAX_PIXELS, bands, exportSize, pageSizePt } from './formats.js';
import { imagesToPdf, setJpegDpi } from './pdf.js';

const STORAGE_KEY = 'affiche-foot';
const JPEG_QUALITY = 0.92;
const $ = (selector) => document.querySelector(selector);

const clone = (value) => JSON.parse(JSON.stringify(value));
let settings = load();

// ---------------------------------------------------------------- réglages enregistrés

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && typeof saved === 'object') return withDefaults(saved);
  } catch { /* stockage indisponible (navigation privée) : on garde le modèle */ }
  return withDefaults({});
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* sans importance */ }
}

const get = (path) => path.split('.').reduce((o, k) => o?.[k], settings);

function set(path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  keys.reduce((o, k) => o[k], settings)[last] = value;
}

// ---------------------------------------------------------------- choix (boutons radio)

const YES_NO = [{ id: 'oui', name: 'Oui' }, { id: 'non', name: 'Non' }];
const BOOLEAN_GROUPS = new Set(['showTitle', 'border']);

function groupOptions(group) {
  const [list, index, field] = group.split('.');
  if (list === 'children' || list === 'adults') {
    const person = settings[list][index];
    switch (field) {
      case 'gender': return GENDERS;
      case 'kind': return ADULTS;
      case 'hair': return list === 'children' ? hairsFor(person.gender) : adultHairsFor(person.kind);
      case 'hairColor': return HAIR_COLORS.map((h) => ({ ...h, dot: h.base }));
      case 'skin': return SKINS.map((k) => ({ ...k, dot: k.base }));
      default: return [];
    }
  }
  switch (group) {
    case 'layout': return LAYOUTS.map((l) => ({ id: l.id, name: l.name, hint: l.hint }));
    case 'showTitle':
    case 'border': return YES_NO;
    case 'theme': return [...THEMES, { id: 'perso', name: 'Personnalisé', perso: true }];
    case 'format': return Object.values(FORMATS).map((f) => ({ id: f.id, name: `${f.name} · ${f.hint}` }));
    default: return [];
  }
}

const groupValue = (group) => (BOOLEAN_GROUPS.has(group) ? (get(group) ? 'oui' : 'non') : get(group));

/** Petit drapeau du thème : fond, bande et maillot (le nom est écrit à côté). */
function themeFlag(option) {
  const flag = document.createElement('i');
  flag.className = 'mini-flag';
  const t = option.perso
    ? { bg: settings.custom.bg, stripe: [['#fff', 1], [settings.custom.stripe, 4], ['#fff', 1]], shirt: settings.custom.shirt }
    : option;
  const total = t.stripe.reduce((sum, [, w]) => sum + w, 0);
  let at = 30;
  const stops = [`${t.bg} 0 30%`];
  for (const [color, w] of t.stripe) {
    const end = at + (w / total) * 40;
    stops.push(`${color} ${at}% ${end}%`);
    at = end;
  }
  stops.push(`${t.bg} 70% 100%`);
  flag.style.background = `linear-gradient(${t.shirt}, ${t.shirt}) center bottom / 44% 34% no-repeat, linear-gradient(90deg, ${stops.join(', ')})`;
  return flag;
}

function buildGroup(container) {
  const group = container.dataset.group;
  const current = groupValue(group);
  container.replaceChildren(...groupOptions(group).map((option) => {
    const label = document.createElement('label');
    label.className = 'choice';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = group;
    input.value = option.id;
    input.checked = option.id === current;
    const span = document.createElement('span');
    if (option.dot) {
      const dot = document.createElement('i');
      dot.className = 'dot';
      dot.style.background = option.dot;
      span.append(dot);
    }
    if (group === 'theme') span.append(themeFlag(option));
    span.append(option.name);
    if (option.hint) {
      const hint = document.createElement('small');
      hint.textContent = option.hint;
      span.append(hint);
    }
    label.append(input, span);
    return label;
  }));
}

function buildAllGroups() {
  document.querySelectorAll('[data-group]').forEach(buildGroup);
}

function onChoice(group, value) {
  if (BOOLEAN_GROUPS.has(group)) {
    set(group, value === 'oui');
  } else if (group === 'theme') {
    // le titre suit le thème, sauf s'il a été personnalisé
    const before = findTheme(settings.theme).title;
    if (!settings.title || (settings.theme !== 'perso' && jerseyName(settings.title) === before)) {
      settings.title = value === 'perso' ? settings.title : findTheme(value).title;
    }
    settings.theme = value;
  } else {
    set(group, value);
  }
  const [list, index, field] = group.split('.');
  if (field === 'gender' || field === 'kind') {
    // coiffure toujours possible pour ce genre (garçon, fille, papa, maman)
    const person = settings[list][index];
    const allowed = (field === 'gender' ? hairsFor(value) : adultHairsFor(value)).map((h) => h.id);
    if (!allowed.includes(person.hair)) person.hair = { fille: 'queue', garcon: 'court', maman: 'long', papa: 'court' }[value];
    buildGroup(document.querySelector(`[data-group="${list}.${index}.hair"]`));
  }
  if (group === 'layout') buildPeople();
  syncForm();
  schedule();
}

// ---------------------------------------------------------------- fiches des personnes

/** Où se trouve chaque enfant, selon la composition. */
const CHILD_PLACES = {
  'deux-enfants': ['sur l’épaule gauche', 'sur l’épaule droite'],
  'deux-parents': ['avec le parent 1', 'avec le parent 2'],
  'deux-parents-quatre-enfants': ['parent 1, épaule gauche', 'parent 1, épaule droite', 'parent 2, épaule gauche', 'parent 2, épaule droite'],
};

function choiceField(id, label, group, swatches = false) {
  return `<div class="field"><span class="label" id="${id}">${label}</span>`
    + `<div class="choices${swatches ? ' swatches' : ''}" role="radiogroup" aria-labelledby="${id}" data-group="${group}"></div></div>`;
}

function nameFields(id, path, label) {
  return '<div class="row">'
    + `<div class="field grow"><label class="label" for="${id}-name" data-label="name">${label}</label>`
    + `<input id="${id}-name" name="${path}.name" type="text" maxlength="12" autocapitalize="characters" spellcheck="false"></div>`
    + `<div class="field number"><label class="label" for="${id}-number">Numéro <span class="count" data-count="${path}.number"></span></label>`
    + `<input id="${id}-number" name="${path}.number" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2"></div>`
    + '</div>';
}

function personCard(list, index) {
  const path = `${list}.${index}`;
  const id = `${list}-${index}`;
  const card = document.createElement('fieldset');
  card.className = 'card person';
  card.id = id;
  if (list === 'children') {
    card.innerHTML = '<legend></legend>'
      + choiceField(`${id}-gender`, 'Genre de l’enfant', `${path}.gender`)
      + nameFields(id, path, 'Prénom de l’enfant')
      + choiceField(`${id}-hair`, 'Cheveux', `${path}.hair`)
      + choiceField(`${id}-hair-color`, 'Couleur des cheveux', `${path}.hairColor`, true)
      + choiceField(`${id}-skin`, 'Couleur de peau de l’enfant', `${path}.skin`, true);
  } else {
    card.innerHTML = '<legend></legend>'
      + choiceField(`${id}-kind`, 'Papa ou maman ?', `${path}.kind`)
      + nameFields(id, path, 'Prénom')
      + choiceField(`${id}-hair`, 'Cheveux', `${path}.hair`)
      + '<p class="hint" data-hair-hint>Sa tête est cachée par l’enfant : seuls des cheveux longs ou une queue de cheval dépassent.</p>'
      + choiceField(`${id}-hair-color`, 'Couleur des cheveux', `${path}.hairColor`, true)
      + choiceField(`${id}-skin`, 'Couleur de peau', `${path}.skin`, true);
  }
  card.querySelectorAll('[data-group]').forEach(buildGroup);
  return card;
}

/** Une fiche par enfant puis par parent, selon la composition choisie. */
function buildPeople() {
  const layout = findLayout(settings.layout);
  const cards = [];
  for (let i = 0; i < layout.children; i += 1) cards.push(personCard('children', i));
  for (let i = 0; i < layout.adults; i += 1) cards.push(personCard('adults', i));
  $('#people').replaceChildren(...cards);
}

function syncPeople() {
  const layout = findLayout(settings.layout);
  for (let i = 0; i < layout.children; i += 1) {
    const place = CHILD_PLACES[layout.id]?.[i];
    $(`#children-${i} legend`).textContent = layout.children === 1 ? 'L’enfant' : `Enfant ${i + 1} · ${place}`;
  }
  const seated = layout.children / layout.adults;
  for (let i = 0; i < layout.adults; i += 1) {
    const adult = settings.adults[i];
    const mom = adult.kind === 'maman';
    const who = mom ? 'la maman' : 'le papa';
    const card = $(`#adults-${i}`);
    const side = i === 0 ? 'à gauche' : 'à droite';
    card.querySelector('legend').textContent = layout.adults === 1 ? (mom ? 'La maman' : 'Le papa') : `Parent ${i + 1} · ${who}, ${side}`;
    card.querySelector('[data-label="name"]').textContent = mom ? 'Prénom de la maman' : 'Prénom du papa';
    card.querySelector(`#adults-${i}-skin`).textContent = mom ? 'Couleur de peau de la maman' : 'Couleur de peau du papa';
    // tête cachée par un seul enfant : la couleur des cheveux ne compte que s'ils dépassent
    card.querySelector('[data-hair-hint]').hidden = seated !== 1;
    card.querySelector(`#adults-${i}-hair-color`).parentElement.hidden = seated === 1 && !HAIRS_BELOW.includes(adult.hair);
  }
}

// ---------------------------------------------------------------- champs texte et couleurs

function syncForm() {
  for (const input of document.querySelectorAll('input[type="text"], input[type="color"]')) {
    const value = get(input.name) ?? '';
    if (input.value !== value && document.activeElement !== input) input.value = value;
  }
  for (const counter of document.querySelectorAll('[data-count]')) {
    counter.textContent = `${String(get(counter.dataset.count) || '').length}/2`;
  }
  syncPeople();
  $('#title-field').hidden = !settings.showTitle;
  $('#custom-colors').classList.toggle('on', settings.theme === 'perso');

  const f = FORMATS[settings.format] || FORMATS.a4;
  const size = exportSize(f.id);
  $('#format-hint').textContent = `${f.name} (${f.hint}) en haute résolution : ${size.width} × ${size.height} pixels, ${size.dpi} dpi.`;
}

function onInput(event) {
  const input = event.target;
  if (!input.name) return;
  if (input.type === 'radio') {
    onChoice(input.name, input.value);
    return;
  }
  let { value } = input;
  if (input.name.endsWith('.number')) {
    value = jerseyNumber(value);
    if (input.value !== value) input.value = value;
  }
  set(input.name, value);
  if (input.type === 'color') buildGroup($('[data-group="theme"]'));
  syncForm();
  schedule();
}

// ---------------------------------------------------------------- aperçu

let pending = false;

function schedule() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    renderPreview();
  });
}

function renderPreview() {
  const canvas = $('#poster');
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const width = Math.max(200, Math.round(canvas.clientWidth * dpr));
  if (canvas.width !== width) {
    canvas.width = width;
    canvas.height = Math.round((width * POSTER_H) / POSTER_W);
  }
  drawPoster(canvas.getContext('2d'), settings, width / POSTER_W);
  canvas.setAttribute('aria-label', describe());

  const mini = $('#mini-canvas');
  const miniWidth = Math.round(84 * dpr);
  if (mini.width !== miniWidth) {
    mini.width = miniWidth;
    mini.height = Math.round((miniWidth * POSTER_H) / POSTER_W);
  }
  mini.getContext('2d').drawImage(canvas, 0, 0, mini.width, mini.height);
  save();
}

/** Personnes de la composition choisie. */
function people(s = settings) {
  const layout = findLayout(s.layout);
  return { children: s.children.slice(0, layout.children), adults: s.adults.slice(0, layout.adults) };
}

function describe() {
  const { children, adults } = people();
  const who = (p) => [jerseyName(p.name) || 'sans prénom', jerseyNumber(p.number) && `numéro ${jerseyNumber(p.number)}`].filter(Boolean).join(', ');
  const parents = adults.map((a) => `${a.kind === 'maman' ? 'la maman' : 'le papa'} (${who(a)})`).join(' et ');
  return `Affiche : ${parents} avec ${children.map((k) => `${k.gender === 'fille' ? 'la fille' : 'le garçon'} (${who(k)})`).join(', ')} sur les épaules`
    + `${settings.showTitle && settings.title ? `, titre « ${jerseyName(settings.title)} »` : ''}.`;
}

// ---------------------------------------------------------------- fichiers haute résolution

/** Canvas de cette taille, ou null si l'appareil le refuse (limite des iPhone/iPad). */
function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  try {
    if (!ctx) throw new Error('canvas');
    ctx.fillStyle = '#123456';
    ctx.fillRect(width - 1, height - 1, 1, 1);
    if (ctx.getImageData(width - 1, height - 1, 1, 1).data[3] !== 255) throw new Error('canvas');
  } catch {
    release(canvas);
    return null;
  }
  return canvas;
}

function release(canvas) {
  canvas.width = 0;
  canvas.height = 0;
}

function toBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('jpeg'))), 'image/jpeg', JPEG_QUALITY);
  });
}

const bytesOf = async (blob) => new Uint8Array(await blob.arrayBuffer());
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

/** JPG pleine page : 300 dpi, ou un peu moins si l'appareil ne peut pas (A3 sur iPhone). */
async function renderJpeg(s) {
  const tries = [exportSize(s.format), exportSize(s.format, { maxPixels: IOS_MAX_PIXELS }), exportSize(s.format, { maxPixels: 8_000_000 })];
  for (const size of tries) {
    const canvas = makeCanvas(size.width, size.height);
    if (!canvas) continue;
    drawPoster(canvas.getContext('2d'), s, size.width / POSTER_W);
    const blob = await toBlob(canvas);
    release(canvas);
    const jpeg = setJpegDpi(await bytesOf(blob), size.dpi);
    return { blob: new Blob([jpeg], { type: 'image/jpeg' }), size };
  }
  throw new Error('memoire');
}

/** PDF au format exact de la page, à 300 dpi : dessiné par bandes pour tenir sur téléphone. */
async function renderPdf(s) {
  const size = exportSize(s.format);
  const page = pageSizePt(s.format);
  const parts = [];
  for (const band of bands(size.width, size.height)) {
    const canvas = makeCanvas(size.width, band.height);
    if (!canvas) throw new Error('memoire');
    drawPoster(canvas.getContext('2d'), s, size.width / POSTER_W, { height: size.height, offsetY: band.top });
    const blob = await toBlob(canvas);
    release(canvas);
    const ratio = page.height / size.height;
    parts.push({ jpeg: await bytesOf(blob), x: 0, y: band.top * ratio, width: page.width, height: band.height * ratio });
    await nextFrame();
  }
  const pdf = imagesToPdf(parts, { ...page, title: fileTitle(s) });
  return { blob: new Blob([pdf], { type: 'application/pdf' }), size };
}

const slug = (text) => jerseyName(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function fileName(s, ext) {
  const { children, adults } = people(s);
  const parts = ['affiche', ...[...children, ...adults].map((p) => slug(p.name)), s.format].filter(Boolean);
  return `${parts.join('-')}.${ext}`;
}

function fileTitle(s) {
  const { children, adults } = people(s);
  const names = [...children, ...adults].map((p) => jerseyName(p.name)).filter(Boolean);
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} et ${names.at(-1)}` : names.join('');
  return `Affiche ${list}`.trim();
}

const megabytes = (bytes) => `${(bytes / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`;

// ---------------------------------------------------------------- fenêtre « fichier prêt »

let objectUrl = null;

function dialog({ title, text = '', busy = false, actions = [] }) {
  $('#dialog').hidden = false;
  $('#dialog-title').textContent = title;
  $('#dialog-text').textContent = text;
  $('#dialog-spinner').hidden = !busy;
  $('#dialog-close').hidden = busy;
  $('#dialog-actions').replaceChildren(...actions);
  (actions[0] || $('#dialog-close')).focus?.();
}

function closeDialog() {
  $('#dialog').hidden = true;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = null;
}

function button(text, onClick, className = 'btn') {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className;
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}

let busy = false;

async function exportFile(kind) {
  if (busy) return;
  busy = true;
  const s = clone(settings);
  const f = FORMATS[s.format] || FORMATS.a4;
  const label = kind === 'pdf' ? 'PDF' : 'JPG';
  dialog({
    title: kind === 'print' ? 'Préparation de l’impression' : `Création du ${label}`,
    text: `Affiche ${f.name} en haute résolution… quelques secondes.`,
    busy: true,
  });
  await nextFrame();
  try {
    await loadFonts();
    const { blob, size } = kind === 'pdf' ? await renderPdf(s) : await renderJpeg(s);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(blob);

    if (kind === 'print') {
      const img = $('#print-image');
      img.src = objectUrl;
      await img.decode().catch(() => {});
      $('#page-size').textContent = `@page { size: ${f.name} portrait; margin: 0; }`;
      dialog({
        title: 'Prêt à imprimer',
        text: `Choisissez le papier ${f.name} (${f.hint}) et l’échelle 100 % ou « Ajuster ». `
          + 'Si l’imprimante ne gère pas le A3, téléchargez le PDF pour un imprimeur.',
        actions: [button('Imprimer', () => window.print(), 'btn primary')],
      });
      return;
    }

    const name = fileName(s, kind === 'pdf' ? 'pdf' : 'jpg');
    const link = document.createElement('a');
    link.className = 'btn primary';
    link.href = objectUrl;
    link.download = name;
    link.textContent = `Enregistrer le ${label}`;
    const actions = [link];
    const file = typeof File === 'function' ? new File([blob], name, { type: blob.type }) : null;
    if (file && navigator.canShare?.({ files: [file] })) {
      actions.push(button(kind === 'pdf' ? 'Partager / imprimer…' : 'Partager / enregistrer dans Photos…', () => {
        navigator.share({ files: [file], title: fileTitle(s) }).catch(() => {});
      }));
    }
    dialog({
      title: 'Votre affiche est prête',
      text: `${label} ${f.name} (${f.hint}) · ${size.width} × ${size.height} pixels · ${size.dpi} dpi · ${megabytes(blob.size)}`,
      actions,
    });
  } catch (error) {
    console.error(error);
    dialog({
      title: 'Oups',
      text: 'Impossible de créer le fichier sur cet appareil (mémoire insuffisante). '
        + 'Fermez quelques onglets et réessayez, ou choisissez le format A4.',
    });
  } finally {
    busy = false;
  }
}

// ---------------------------------------------------------------- démarrage

function start() {
  buildPeople();
  buildAllGroups();
  syncForm();
  const form = $('#options');
  form.addEventListener('input', onInput);
  form.addEventListener('change', onInput);
  form.addEventListener('submit', (e) => e.preventDefault());
  for (const b of document.querySelectorAll('[data-export]')) b.addEventListener('click', () => exportFile(b.dataset.export));
  $('#dialog-close').addEventListener('click', closeDialog);
  $('#dialog').addEventListener('click', (e) => { if (e.target === e.currentTarget && !busy) closeDialog(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !busy && !$('#dialog').hidden) closeDialog(); });
  $('#reset').addEventListener('click', () => {
    settings = withDefaults({});
    settings.custom = { ...CUSTOM_DEFAULT };
    buildPeople();
    buildAllGroups();
    for (const input of document.querySelectorAll('input[type="text"], input[type="color"]')) input.value = get(input.name) ?? '';
    syncForm();
    schedule();
  });

  // mini aperçu flottant quand l'aperçu sort de l'écran (téléphone)
  const mini = $('#mini');
  mini.addEventListener('click', () => $('.preview').scrollIntoView({ behavior: 'smooth', block: 'start' }));
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { mini.hidden = entry.isIntersecting; }, { threshold: 0.15 }).observe($('#poster'));
  }
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe($('#poster'));
  window.addEventListener('resize', schedule);

  renderPreview();
  // les polices arrivent : on redessine avec les bonnes lettres
  loadFonts().then(schedule);
}

start();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
