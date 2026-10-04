// Logo importé par l'utilisateur (une image de son téléphone) : préparé une fois,
// gardé sur l'appareil (IndexedDB), jamais envoyé ailleurs.

const DB_NAME = 'affiche-foot';
const STORE = 'fichiers';
const KEY = 'logo';
/** Plus grand côté gardé : assez pour une affiche 40 × 60 cm en Ultra HD. */
export const LOGO_MAX_SIDE = 2400;

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, action) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const request = action(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

/** Logo enregistré (Blob), ou null. */
export async function loadLogoBlob() {
  try {
    return (await withStore('readonly', (s) => s.get(KEY))) || null;
  } catch {
    return null; // navigation privée : pas de stockage
  }
}

export async function saveLogoBlob(blob) {
  try { await withStore('readwrite', (s) => s.put(blob, KEY)); } catch { /* gardé seulement pour cette visite */ }
}

export async function removeLogoBlob() {
  try { await withStore('readwrite', (s) => s.delete(KEY)); } catch { /* rien à faire */ }
}

/**
 * Image affichable à partir d'un fichier ou d'un Blob. Son adresse temporaire reste valable
 * tant que l'image sert : `release(img)` la libère.
 */
export async function imageFromBlob(blob) {
  const img = new Image();
  img.src = URL.createObjectURL(blob);
  try {
    await img.decode();
  } catch (error) {
    release(img);
    throw error;
  }
  return img;
}

export function release(img) {
  if (img?.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
}

/**
 * Prépare l'image choisie : PNG (la transparence est gardée), plus grand côté limité
 * à LOGO_MAX_SIDE. Les images sans taille (certains SVG) sont dessinées en 1200 pixels.
 */
export async function prepareLogo(file) {
  const img = await imageFromBlob(file);
  const [w, h] = [img.naturalWidth || 1200, img.naturalHeight || 1200];
  const ratio = Math.min(1, LOGO_MAX_SIDE / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * ratio));
  canvas.height = Math.max(1, Math.round(h * ratio));
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  release(img);
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('png'))), 'image/png');
  });
  canvas.width = 0;
  canvas.height = 0;
  return blob;
}
