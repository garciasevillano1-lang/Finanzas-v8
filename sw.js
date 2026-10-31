/* Iván Finanzas — service worker: la app abre sin internet y se actualiza sola.
   Tus datos NO viven aquí (siguen en el almacenamiento del navegador); esto solo guarda los archivos de la app. */
const CACHE = 'ivan-finanzas-v5.8.2';
const ARCHIVOS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png',
  './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k.startsWith('ivan-finanzas-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Red con límite de tiempo: si la señal es mala, abre la copia guardada en vez de quedarse cargando
const conLimite = (p, ms) => new Promise((ok, mal) => { const t = setTimeout(() => mal(new Error('lento')), ms); p.then(r => { clearTimeout(t); ok(r); }, err => { clearTimeout(t); mal(err); }); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // La app: primero internet (para recibir la versión nueva), si no hay o tarda, la copia guardada
  if (req.mode === 'navigate') {
    const red = fetch(req).then(r => { if (r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', copia)); } return r; });
    e.respondWith(conLimite(red, 4000).catch(() => caches.match('./index.html').then(hit => hit || red)));
    return;
  }
  // Íconos, tipografía y librería de Excel: primero la copia guardada
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r && (r.ok || r.type === 'opaque')) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
      return r;
    }).catch(() => hit))
  );
});
