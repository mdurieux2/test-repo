// Service worker : met l'app en cache pour qu'elle fonctionne sans Internet
// (en voiture, en vacances…). Changer VERSION à chaque mise à jour publiée.
// Tout nouveau fichier de l'app doit être ajouté à PRECACHE (vérifié par les tests).

const VERSION = 'v12';
const CACHE = `lire-et-compter-${VERSION}`;
// Sons de la voix naturelle (voix/fr/…, voix/en/…) : leurs noms changent avec leur contenu, on les
// garde donc d'une version à l'autre (seuls ceux qui ne sont plus dans voix/manifest.json sont retirés).
// Ils ne sont pas dans PRECACHE : l'app les télécharge peu à peu (voir prefetchVoices dans main.js).
const VOICE_CACHE = 'lire-et-compter-voix';
const isVoiceClip = (url) => /\/voix\/(fr|en)\/[0-9a-f]+\.mp3$/.test(url.pathname);

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
  './js/data/ecriture-data.js',
  './js/data/lecture-data.js',
  './js/games/anglais-plus.js',
  './js/games/anglais.js',
  './js/games/chrono.js',
  './js/games/dictee.js',
  './js/games/drapeaux.js',
  './js/games/ecriture.js',
  './js/games/francais-extra.js',
  './js/games/helpers.js',
  './js/games/histoires.js',
  './js/games/horloge.js',
  './js/games/index.js',
  './js/games/jeux.js',
  './js/games/labyrinthes.js',
  './js/games/lecture.js',
  './js/games/logique.js',
  './js/games/maths-extra.js',
  './js/games/maths.js',
  './js/games/mesures.js',
  './js/games/monde.js',
  './js/games/textes.js',
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
  // un son de la voix naturelle ne change jamais : le cache d'abord, le réseau s'il n'y est pas encore
  if (isVoiceClip(url)) {
    event.respondWith(caches.open(VOICE_CACHE).then(async (cache) => {
      const hit = await cache.match(event.request, { ignoreSearch: true });
      if (hit) return hit;
      const response = await fetch(event.request);
      if (response.ok && response.status === 200) cache.put(event.request, response.clone());
      return response;
    }));
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true })),
  );
});
