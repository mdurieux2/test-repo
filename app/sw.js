// Service worker : met l'app en cache pour qu'elle fonctionne sans Internet
// (en voiture, en vacances…). Changer VERSION à chaque mise à jour publiée.
// Tout nouveau fichier de l'app doit être ajouté à PRECACHE (vérifié par les tests).

const VERSION = 'v4';
const CACHE = `lire-et-compter-${VERSION}`;

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
  './js/data/lecture-data.js',
  './js/games/anglais.js',
  './js/games/francais-extra.js',
  './js/games/helpers.js',
  './js/games/index.js',
  './js/games/lecture.js',
  './js/games/maths-extra.js',
  './js/games/maths.js',
  './js/main.js',
  './js/photo.js',
  './js/programs.js',
  './js/progress.js',
  './js/random.js',
  './js/render.js',
  './js/rewards.js',
  './js/sounds.js',
  './js/speech.js',
  './js/storage.js',
  './manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Réseau d'abord (pour recevoir les mises à jour), cache si hors ligne.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;
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
