self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Minimal fetch handler to pass PWA criteria
  // For a real offline PWA, you would add a cache-first strategy here.
});
