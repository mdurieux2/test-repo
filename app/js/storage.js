// Données de l'app, conservées sur l'appareil (localStorage). Aucune donnée ne sort du téléphone.
// Un profil par enfant (Eva-Rose, Matteo) : classe, étoiles, niveaux, paliers et historique.

import { createGameState } from './progress.js';

export const STORAGE_KEY = 'lire-et-compter:v2';
export const HISTORY_LIMIT = 300;
export const MISTAKES_LIMIT = 100;

export const GRADES = {
  MS: 'Moyenne section',
  GS: 'Grande section',
  CP: 'CP',
  CE1: 'CE1',
};

const DEFAULT_GRADES = { 'eva-rose': 'CP', matteo: 'MS' };

export function defaultChild(grade = 'CP') {
  return { grade, stars: 0, games: {}, paliers: {}, history: [], mistakes: [] };
}

export function defaultStore() {
  return {
    active: null,
    settings: { voice: true, sounds: true, sessionLength: 10 },
    profiles: Object.fromEntries(Object.entries(DEFAULT_GRADES).map(([id, grade]) => [id, defaultChild(grade)])),
  };
}

export function defaultGameStats(level = 1) {
  return { ...createGameState(level), sessions: 0, answered: 0, correct: 0, bestStars: 0, lastPlayed: null };
}

function mergeChild(base, saved) {
  if (!saved || typeof saved !== 'object') return base;
  return {
    ...base,
    ...saved,
    grade: GRADES[saved.grade] ? saved.grade : base.grade,
    games: saved.games && typeof saved.games === 'object' ? saved.games : {},
    paliers: saved.paliers && typeof saved.paliers === 'object' ? saved.paliers : {},
    history: Array.isArray(saved.history) ? saved.history.slice(-HISTORY_LIMIT) : [],
    mistakes: Array.isArray(saved.mistakes) ? saved.mistakes.slice(-MISTAKES_LIMIT) : [],
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
    for (const [id, child] of Object.entries(base.profiles)) profiles[id] = mergeChild(child, saved.profiles?.[id]);
    return {
      active: profiles[saved.active] ? saved.active : null,
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

export function resetChild(store, id) {
  store.profiles[id] = defaultChild(store.profiles[id]?.grade || DEFAULT_GRADES[id]);
  return store;
}
