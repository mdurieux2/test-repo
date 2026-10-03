// Histoires lues par papa ou maman : les enregistrements restent sur l'appareil (IndexedDB),
// ils ne sont envoyés nulle part. Tout est asynchrone et rien ne casse sans IndexedDB
// (navigation privée, vieux navigateur) : get() renvoie null, list() une liste vide,
// save() et remove() renvoient false.

const DB_NAME = 'lire-et-compter-voix';
const DB_VERSION = 1;
const STORE = 'recordings'; // clé : l'identifiant de l'histoire (histoires.js)

/** Durée maximale d'un enregistrement, en secondes. */
export const MAX_SECONDS = 180;

/** Formats essayés dans l'ordre : MP4 (AAC) sur iPhone et iPad, WebM (Opus) sur Chrome et Android. */
export const MIME_TYPES = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];

/** Le premier format que l'appareil sait enregistrer (`isSupported` : MediaRecorder.isTypeSupported) ; '' : celui du navigateur. */
export function pickMime(isSupported) {
  if (typeof isSupported !== 'function') return '';
  return MIME_TYPES.find((type) => {
    try {
      return isSupported(type);
    } catch {
      return false;
    }
  }) || '';
}

/**
 * Karaoké d'un enregistrement : chaque phrase s'allume pendant une part de la durée
 * proportionnelle à sa longueur. Renvoie [{ start, end }] en secondes.
 */
export function sentenceTimeline(sentences, duration) {
  const length = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const sizes = sentences.map((s) => Math.max(1, String(s).length));
  const total = sizes.reduce((a, b) => a + b, 0);
  let t = 0;
  return sizes.map((size) => {
    const start = t;
    t += (length * size) / total;
    return { start, end: t };
  });
}

/** La phrase lue à l'instant `time` (en secondes) ; -1 si aucune (durée inconnue, fin de la lecture). */
export function sentenceAt(timeline, time) {
  if (!(time >= 0)) return -1;
  return timeline.findIndex(({ end }) => time < end);
}

/** « 1:05 » */
export function formatDuration(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const byKey = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Le magasin des enregistrements. `factory` : l'IndexedDB de la page (un faux dans les tests,
 * null s'il n'existe pas). Le son est gardé en ArrayBuffer (plus sûr que Blob sur les vieux Safari).
 */
export function createRecordings(factory = globalThis.indexedDB, { timeout = 3000 } = {}) {
  let opening = null;

  function open() {
    if (!factory) return Promise.resolve(null);
    if (!opening) {
      opening = new Promise((resolve) => {
        // certains Safari ne répondent jamais à la première ouverture : on n'attend pas indéfiniment
        const timer = setTimeout(() => resolve(null), timeout);
        const done = (db) => {
          clearTimeout(timer);
          resolve(db);
        };
        try {
          const request = factory.open(DB_NAME, DB_VERSION);
          request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
          };
          request.onsuccess = () => done(request.result);
          request.onerror = () => done(null);
          request.onblocked = () => done(null);
        } catch {
          done(null);
        }
      }).then((db) => {
        if (!db) opening = null; // on réessaiera la prochaine fois
        else {
          db.onversionchange = () => {
            db.close();
            opening = null;
          };
        }
        return db;
      });
    }
    return opening;
  }

  /** Une requête sur le magasin : { ok, value }, ok = false si quoi que ce soit échoue. */
  async function run(mode, action) {
    const db = await open();
    if (!db) return { ok: false };
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, mode);
        const request = action(tx.objectStore(STORE));
        tx.oncomplete = () => resolve({ ok: true, value: request.result });
        tx.onerror = () => resolve({ ok: false });
        tx.onabort = () => resolve({ ok: false });
      } catch {
        resolve({ ok: false });
      }
    });
  }

  return {
    /** Garde l'enregistrement d'une histoire (remplace le précédent). Renvoie true si c'est fait. */
    async save(id, blob, { mime = '', duration = 0 } = {}) {
      if (!id || !blob) return false;
      let data;
      try {
        data = await blob.arrayBuffer();
      } catch {
        return false;
      }
      const record = {
        id,
        data,
        mime: mime || blob.type || '',
        duration: Number.isFinite(Number(duration)) ? Math.max(0, Number(duration)) : 0,
        size: data.byteLength,
        savedAt: new Date().toISOString(),
      };
      return (await run('readwrite', (store) => store.put(record, id))).ok;
    },

    /** L'enregistrement d'une histoire : { id, blob, mime, duration, size, savedAt }, ou null. */
    async get(id) {
      if (!id) return null;
      const { ok, value } = await run('readonly', (store) => store.get(id));
      if (!ok || !value?.data) return null;
      const { mime = '', duration = 0, size = 0, savedAt = null } = value;
      return { id, blob: new Blob([value.data], mime ? { type: mime } : {}), mime, duration, size, savedAt };
    },

    /** Supprime l'enregistrement d'une histoire. Renvoie true si c'est fait. */
    async remove(id) {
      if (!id) return false;
      return (await run('readwrite', (store) => store.delete(id))).ok;
    },

    /** Les identifiants des histoires enregistrées, dans l'ordre des clés (sans charger le son). */
    async list() {
      const { ok, value } = await run('readonly', (store) => store.getAllKeys());
      return ok && Array.isArray(value) ? value.map(String).sort(byKey) : [];
    },
  };
}

// Le magasin de l'app (celui de la page).
const shared = createRecordings();
export const { save, get, remove, list } = shared;
