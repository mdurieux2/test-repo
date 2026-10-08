// Service worker : met l'app en cache pour qu'elle fonctionne sans Internet
// (en voiture, en vacances…). Changer VERSION à chaque mise à jour publiée.
// Tout nouveau fichier de l'app doit être ajouté à PRECACHE (vérifié par les tests).

const VERSION = 'v19';
const CACHE = `lire-et-compter-${VERSION}`;
// Sons de la voix naturelle (voix/fr/…, voix/en/…) : leurs noms changent avec leur contenu, on les
// garde donc d'une version à l'autre (seuls ceux qui ne sont plus dans voix/manifest.json sont retirés).
// Ils ne sont pas dans PRECACHE. Sur le site, ils sont rangés dans des paquets (voix/paquet-….mp3) :
// l'app télécharge les paquets et les redécoupe (voir prefetchVoices dans main.js) ; un son demandé
// avant est pris directement dans son paquet (une partie du fichier seulement).
const VOICE_CACHE = 'lire-et-compter-voix';
const isVoiceClip = (url) => /\/voix\/(fr|en)\/[0-9a-f]+\.mp3$/.test(url.pathname);
const isVoicePack = (url) => /\/voix\/paquet-[0-9a-f]+\.mp3$/.test(url.pathname);

const PRECACHE = [
  './',
  './css/style.css',
  './fonts/andika-400.woff2',
  './fonts/andika-700.woff2',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './index.html',
  './js/characters.js',
  './js/config.js',
  './js/dashboard.js',
  './js/data/anglais-data.js',
  './js/data/carte-data.js',
  './js/data/ecriture-data.js',
  './js/data/lecture-data.js',
  './js/games/anglais-plus.js',
  './js/games/anglais.js',
  './js/games/carte.js',
  './js/games/chrono.js',
  './js/games/comprendre.js',
  './js/games/dictee.js',
  './js/games/drapeaux.js',
  './js/games/ecriture.js',
  './js/games/francais-extra.js',
  './js/games/grammaire.js',
  './js/games/helpers.js',
  './js/games/histoires.js',
  './js/games/horloge.js',
  './js/games/index.js',
  './js/games/jeux.js',
  './js/games/labyrinthes.js',
  './js/games/lecture.js',
  './js/games/logique-plus.js',
  './js/games/logique.js',
  './js/games/maths-extra.js',
  './js/games/maths.js',
  './js/games/mesures.js',
  './js/games/monde.js',
  './js/games/sciences.js',
  './js/games/nombres-plus.js',
  './js/games/operations.js',
  './js/games/textes.js',
  './js/games/vocabulaire.js',
  './js/games/vivre.js',
  './js/main.js',
  './js/photo.js',
  './js/picks.js',
  './js/programs.js',
  './js/progress.js',
  './js/random.js',
  './js/recordings.js',
  './js/render.js',
  './js/rewards.js',
  './js/sounds.js',
  './js/speech.js',
  './js/voix-cles.js',
  './js/storage.js',
  './js/themes.js',
  './manifest.webmanifest',
  './voix/manifest.json',
  './voix/silence.mp3',
  './voix/pause-phrase.mp3',
  './voix/pause-virgule.mp3',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

/** Retire du cache des voix les sons qui ne sont plus dans le manifeste de cette version. */
async function pruneVoices() {
  const manifest = await caches.match('./voix/manifest.json');
  if (!manifest) return;
  const wanted = new Set(Object.values((await manifest.json()).clips || {}));
  const cache = await caches.open(VOICE_CACHE);
  for (const request of await cache.keys()) {
    const file = new URL(request.url).pathname.split('/voix/')[1];
    if (!wanted.has(file)) await cache.delete(request);
  }
}

let packIndex = null; // son → { nom du paquet, début, taille }

async function voiceIndex() {
  if (packIndex) return packIndex;
  const response = (await caches.match('./voix/manifest.json')) || (await fetch('./voix/manifest.json'));
  const index = new Map();
  for (const pack of (await response.json()).paquets || []) {
    let start = 0;
    for (const [file, size] of pack.sons) {
      index.set(file, { pack, start, size });
      start += size;
    }
  }
  packIndex = index;
  return index;
}

/** Un son pas encore sur l'appareil : sa partie du paquet (ou tout le paquet, si le serveur ne sait pas). */
async function voiceFromPack(request, cache) {
  const file = new URL(request.url).pathname.split('/voix/')[1];
  const where = (await voiceIndex()).get(file);
  if (!where) return fetch(request);
  const end = where.start + where.size - 1;
  const response = await fetch(new URL(`voix/${where.pack.nom}`, self.registration.scope), { headers: { Range: `bytes=${where.start}-${end}` } });
  if (!response.ok) return response;
  const body = await response.arrayBuffer();
  const clip = (bytes) => new Response(bytes, { headers: { 'Content-Type': 'audio/mpeg' } });
  if (response.status === 206) {
    await cache.put(request, clip(body));
    return clip(body);
  }
  // le paquet entier est arrivé : tous ses sons sont gardés
  let start = 0;
  await Promise.all(where.pack.sons.map(([name, size]) => {
    const part = body.slice(start, start + size);
    start += size;
    return cache.put(new URL(`voix/${name}`, self.registration.scope).href, clip(part));
  }));
  return clip(body.slice(where.start, end + 1));
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== VOICE_CACHE).map((k) => caches.delete(k))))
      .then(() => pruneVoices().catch(() => {}))
      .then(() => self.clients.claim()),
  );
});

// Réseau d'abord (pour recevoir les mises à jour), cache si hors ligne.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin) return;
  // un paquet de sons : téléchargé par l'app, qui le redécoupe (jamais gardé en entier)
  if (isVoicePack(url)) return;
  // un son de la voix naturelle ne change jamais : le cache d'abord, son paquet s'il n'y est pas encore.
  // Recherche par adresse exacte : avec ignoreSearch, le navigateur parcourt les 14 000 sons à chaque fois.
  if (isVoiceClip(url)) {
    event.respondWith(caches.open(VOICE_CACHE).then(async (cache) => {
      const hit = await cache.match(event.request);
      return hit || voiceFromPack(event.request, cache);
    }));
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // seulement une vraie réponse du site lui-même : jamais une redirection (page de connexion,
        // changement d'adresse), qui prendrait sinon la place de l'app dans le cache
        if (response.ok && response.type === 'basic' && !response.redirected) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      // hors ligne : seulement dans le cache de l'app (petit), jamais dans celui des voix, qui serait
      // parcouru en entier pour chaque fichier (l'app mettait alors des dizaines de secondes à s'ouvrir)
      .catch(() => caches.open(CACHE).then((cache) => cache.match(event.request, { ignoreSearch: true }))),
  );
});
