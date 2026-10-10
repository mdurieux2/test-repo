// Sauvegarde de la progression dans un fichier (espace parents, et premier lancement) : tout ce que
// l'app garde sur l'appareil (prénoms, photos, étoiles, niveaux, réglages, et les histoires lues par
// les parents), pour le retrouver dans un autre navigateur, sur un autre appareil, ou après un
// effacement des données. Le fichier reste chez la famille : il n'est envoyé nulle part.
//
// Le fichier est du JSON :
//   { app: 'lire-et-compter', format: 1, version: '1.16.0', date: '2026-10-10T14:30:00.000Z',
//     donnees: { …ce que storage.js enregistre… },
//     enregistrements: [{ id, mime, duration, savedAt, data: '<son en base64>' }] }

import { loadStore } from './storage.js';

export const APP_ID = 'lire-et-compter';
export const FORMAT = 1;

const PAS_UNE_SAUVEGARDE = 'Ce fichier n’est pas une sauvegarde de l’app.';

/** ArrayBuffer (ou Uint8Array) → base64, par morceaux (un seul appel dépasserait la pile). */
export function versBase64(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** base64 → Uint8Array ; null si le texte n'est pas du base64. */
export function depuisBase64(text) {
  try {
    const binary = atob(String(text));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/** Le contenu du fichier de sauvegarde. `donnees` : ce que storage.js enregistre (storeSnapshot). */
export function creerSauvegarde(donnees, { version = '', date = new Date(), enregistrements = [] } = {}) {
  return { app: APP_ID, format: FORMAT, version, date: date.toISOString(), donnees, enregistrements };
}

/** « lire-compter-sauvegarde-2026-10-10.json » */
export function nomFichier(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `lire-compter-sauvegarde-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** « 10 octobre 2026 », « 1er mars 2027 » ; '' si la date est absente ou abîmée. */
export function dateEnClair(iso) {
  if (typeof iso !== 'string' || !iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const day = date.getDate();
  return `${day === 1 ? '1er' : day} ${MOIS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Un enregistrement lisible : un identifiant d'histoire et un son. */
function enregistrementValide(e) {
  return e && typeof e === 'object' && typeof e.id === 'string' && e.id && typeof e.data === 'string' && e.data;
}

/**
 * Lit un fichier de sauvegarde. Renvoie { ok: true, store, enregistrements, date, version, enfants }
 * (store : les données nettoyées comme au chargement de l'app, enfants : leurs prénoms), ou
 * { ok: false, raison } avec une phrase à montrer aux parents.
 */
export function lireSauvegarde(texte) {
  let data;
  try {
    data = JSON.parse(texte);
  } catch {
    return { ok: false, raison: PAS_UNE_SAUVEGARDE };
  }
  if (!data || typeof data !== 'object' || data.app !== APP_ID || !data.donnees || typeof data.donnees !== 'object') {
    return { ok: false, raison: PAS_UNE_SAUVEGARDE };
  }
  if (Number(data.format) > FORMAT) {
    return { ok: false, raison: 'Cette sauvegarde vient d’une version plus récente de l’app : mettez l’app à jour, puis réessayez.' };
  }
  // les données passent par le même nettoyage qu'au lancement de l'app (profils abîmés écartés…)
  const store = loadStore({ getItem: () => JSON.stringify(data.donnees) });
  if (!store.order.length) return { ok: false, raison: 'Cette sauvegarde ne contient aucun enfant.' };
  const enregistrements = Array.isArray(data.enregistrements) ? data.enregistrements.filter(enregistrementValide) : [];
  return {
    ok: true,
    store,
    enregistrements,
    date: typeof data.date === 'string' ? data.date : '',
    version: typeof data.version === 'string' ? data.version : '',
    enfants: store.order.map((id) => store.profiles[id].name),
  };
}

/** Les histoires enregistrées par les parents (recordings.js), prêtes à entrer dans la sauvegarde. */
export async function exporterEnregistrements(recordings) {
  const out = [];
  for (const id of await recordings.list()) {
    const saved = await recordings.get(id);
    if (!saved?.blob) continue;
    out.push({
      id, mime: saved.mime || '', duration: saved.duration || 0, savedAt: saved.savedAt || null,
      data: versBase64(await saved.blob.arrayBuffer()),
    });
  }
  return out;
}

/** Remet les histoires enregistrées d'une sauvegarde (celles de l'appareil qui n'y sont pas restent). Renvoie le nombre remis. */
export async function importerEnregistrements(recordings, enregistrements) {
  let n = 0;
  for (const e of enregistrements) {
    const bytes = depuisBase64(e.data);
    if (!bytes) continue;
    const blob = new Blob([bytes], e.mime ? { type: e.mime } : {});
    if (await recordings.save(e.id, blob, { mime: e.mime, duration: e.duration })) n++;
  }
  return n;
}
