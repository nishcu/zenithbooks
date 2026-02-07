// ZenithBooks PWA - Minimal Service Worker
// Prevents /sw.js 404 and enables PWA install/preview
const CACHE_NAME = 'zenithbooks-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
