// Données de l'app, conservées sur l'appareil (localStorage). Aucune donnée ne sort du téléphone.
// Un profil par enfant, créé par la famille au premier lancement : prénom, dessin, photo,
// classe, étoiles, niveaux, paliers, records (défis chrono) et historique. Chaque appareil a
// donc ses propres enfants, même quand le lien de l'app est partagé.

import { createGameState } from './progress.js';
import { isPhoto } from './photo.js';

export const STORAGE_KEY = 'lire-et-compter:v2';
export const HISTORY_LIMIT = 300;
export const MISTAKES_LIMIT = 100;

export const GRADES = {
  MS: 'Moyenne section',
  GS: 'Grande section',
  CP: 'CP',
  CE1: 'CE1',
};

export const MAX_CHILDREN = 6;
export const NAME_MAX = 20;

// Profils créés avant la version 1.3 (sans prénom enregistré) : on les retrouve tels quels.
const LEGACY = {
  'eva-rose': { name: 'Eva-Rose', spoken: 'Éva-Rose', look: 'fille', grade: 'CP' },
  matteo: { name: 'Matteo', spoken: 'Mattéo', look: 'garcon', grade: 'MS' },
};

export function defaultChild(grade = 'CP', { name = '', look = 'fille' } = {}) {
  return { name, look, grade, stars: 0, games: {}, paliers: {}, records: {}, history: [], mistakes: [], photo: null };
}

export function defaultStore() {
  return {
    active: null,
    order: [],
    settings: { voice: true, sounds: true, sessionLength: 10, voices: {}, seasonal: true, music: false },
    profiles: {},
  };
}

/** Prénom nettoyé : espaces en trop retirés, longueur limitée. */
export function cleanName(name) {
  return String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
}

/** Identifiant stable tiré du prénom : « Éva-Rose » → « eva-rose ». */
export function slugify(name) {
  const slug = cleanName(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug || 'enfant';
}

/** Ajoute un enfant ; renvoie son identifiant (ou null si le prénom est vide ou s'il y en a trop). */
export function addChild(store, { name, look = 'fille', grade = 'CP' }) {
  const clean = cleanName(name);
  if (!clean || store.order.length >= MAX_CHILDREN) return null;
  let id = slugify(clean);
  for (let n = 2; store.profiles[id]; n++) id = `${slugify(clean)}-${n}`;
  store.profiles[id] = defaultChild(GRADES[grade] ? grade : 'CP', { name: clean, look: look === 'garcon' ? 'garcon' : 'fille' });
  store.order = [...store.order, id];
  return id;
}

/** Supprime un enfant et toute sa progression. */
export function removeChild(store, id) {
  delete store.profiles[id];
  store.order = store.order.filter((x) => x !== id);
  if (store.active === id) store.active = null;
  return store;
}

export function defaultGameStats(level = 1) {
  return { ...createGameState(level), sessions: 0, answered: 0, correct: 0, bestStars: 0, lastPlayed: null };
}

/** Records des défis chrono : { 'tables-chrono': { 1: 42 } } (secondes) ; les valeurs abîmées sont écartées. */
function cleanRecords(records) {
  if (!records || typeof records !== 'object') return {};
  const out = {};
  for (const [gameId, levels] of Object.entries(records)) {
    if (!levels || typeof levels !== 'object') continue;
    const kept = Object.entries(levels).filter(([, seconds]) => Number.isFinite(seconds) && seconds > 0);
    if (kept.length) out[gameId] = Object.fromEntries(kept);
  }
  return out;
}

function mergeChild(id, saved) {
  if (!saved || typeof saved !== 'object') return null;
  const legacy = LEGACY[id] || {};
  const name = cleanName(saved.name) || legacy.name;
  if (!name) return null; // profil sans prénom : inutilisable
  const base = defaultChild(legacy.grade || 'CP');
  return {
    ...base,
    ...saved,
    name,
    look: saved.look === 'garcon' || saved.look === 'fille' ? saved.look : legacy.look || 'fille',
    // la prononciation d'origine ne vaut que tant que le prénom n'a pas changé
    ...(saved.name ? {} : legacy.spoken ? { spoken: legacy.spoken } : {}),
    grade: GRADES[saved.grade] ? saved.grade : base.grade,
    games: saved.games && typeof saved.games === 'object' ? saved.games : {},
    paliers: saved.paliers && typeof saved.paliers === 'object' ? saved.paliers : {},
    records: cleanRecords(saved.records),
    history: Array.isArray(saved.history) ? saved.history.slice(-HISTORY_LIMIT) : [],
    mistakes: Array.isArray(saved.mistakes) ? saved.mistakes.slice(-MISTAKES_LIMIT) : [],
    photo: isPhoto(saved.photo) ? saved.photo : null,
    review: saved.review && typeof saved.review === 'object' ? saved.review : {},
    goals: saved.goals && typeof saved.goals === 'object' ? saved.goals : {},
    style: saved.style && typeof saved.style === 'object' ? saved.style : {},
    easyRead: saved.easyRead === true,
  };
}

/** Lit les données ; renvoie des valeurs par défaut si rien n'est stocké ou si les données sont abîmées. */
export function loadStore(storage = globalThis.localStorage) {
  const base = defaultStore();
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== 'object') return base;
    const profiles = {};
    for (const [id, child] of Object.entries(saved.profiles && typeof saved.profiles === 'object' ? saved.profiles : {})) {
      const merged = mergeChild(id, child);
      if (merged) profiles[id] = merged;
    }
    const known = Array.isArray(saved.order) ? saved.order.filter((id) => profiles[id]) : [];
    const order = [...new Set([...known, ...Object.keys(profiles)])].slice(0, MAX_CHILDREN);
    for (const id of Object.keys(profiles)) if (!order.includes(id)) delete profiles[id];
    return {
      active: profiles[saved.active] ? saved.active : null,
      order,
      settings: { ...base.settings, ...(saved.settings || {}) },
      profiles,
    };
  } catch {
    return base;
  }
}

export function saveStore(store, storage = globalThis.localStorage) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

export function gameStats(child, gameId, minLevel = 1) {
  const stats = { ...defaultGameStats(minLevel), ...(child.games[gameId] || {}) };
  return stats;
}

/** Ajoute une partie à l'historique (pour le suivi des parents). */
export function logSession(child, entry) {
  child.history = [...child.history, entry].slice(-HISTORY_LIMIT);
}

/** Garde la trace d'une erreur (pour repérer les confusions fréquentes : b/d, 7 + 8…). */
export function logMistake(child, entry) {
  child.mistakes = [...child.mistakes, entry].slice(-MISTAKES_LIMIT);
}

/**
 * Efface la progression d'un enfant : étoiles, niveaux, paliers, records des défis chrono,
 * historique (prénom, dessin, classe, photo et réglages des parents sont conservés).
 */
export function resetChild(store, id) {
  const { name, look, grade, photo, spoken, goals, easyRead } = store.profiles[id] || {};
  store.profiles[id] = {
    ...defaultChild(grade || 'CP', { name, look }), photo: photo || null, goals: goals || {}, easyRead: Boolean(easyRead),
    ...(spoken ? { spoken } : {}),
  };
  return store;
}
