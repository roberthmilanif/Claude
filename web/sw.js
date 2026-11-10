// Service worker mínimo: deixa o app instalável e mostra a última versão guardada quando a internet cai.
// Estratégia "rede primeiro": com internet, sempre busca a versão nova; o cache só entra sem conexão.
// Nada do Supabase passa por aqui (outra origem).
const CACHE = 'tele-v1';
const NUCLEO = [
  '/', '/config.js', '/manifest.webmanifest',
  '/assets/base.css', '/assets/comum.js', '/assets/paciente.js', '/assets/video.js', '/assets/vendor/supabase.js',
  '/assets/fonts/figtree-latin-wght-normal.woff2', '/assets/fonts/bricolage-grotesque-latin-wght-normal.woff2',
  '/icons/favicon.svg', '/icons/icon-192.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(NUCLEO)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        if (resp.ok && !url.pathname.startsWith('/medico')) {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copia));
        }
        return resp;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || (e.request.mode === 'navigate' ? caches.match('/') : Response.error()))),
  );
});
