// Service worker : met l'app en cache pour qu'elle fonctionne sans Internet.
// Changer VERSION à chaque mise à jour publiée.
// Tout nouveau fichier de l'app doit être ajouté à PRECACHE (vérifié par les tests).

const VERSION = 'v1';
const PREFIX = 'affiche-foot-';
const CACHE = `${PREFIX}${VERSION}`;

const PRECACHE = [
  './',
  './css/style.css',
  './fonts/anton.woff2',
  './fonts/archivo-black.woff2',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './index.html',
  './js/figures.js',
  './js/formats.js',
  './js/main.js',
  './js/pdf.js',
  './js/poster.js',
  './js/themes.js',
  './manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

// seulement nos anciens caches : d'autres applications peuvent partager ce site
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
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
