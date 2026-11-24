import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const ICON_SRC = path.join(ROOT, 'assets', 'icon.png');

console.log('1/4 Exportando bundle web de Expo...');
execSync('npx expo export --platform web --output-dir dist', { stdio: 'inherit' });

console.log('2/4 Copiando íconos y generando manifest.json...');
if (fs.existsSync(ICON_SRC)) {
  fs.copyFileSync(ICON_SRC, path.join(DIST, 'apple-touch-icon.png'));
  fs.copyFileSync(ICON_SRC, path.join(DIST, 'icon-192.png'));
  fs.copyFileSync(ICON_SRC, path.join(DIST, 'icon-512.png'));
}

const manifest = {
  name: 'Cancionero',
  short_name: 'Cancionero',
  description: 'Cancionero offline con acordes, transposición directa y diagramas por instrumento.',
  lang: 'es-AR',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait',
  theme_color: '#09090B',
  background_color: '#09090B',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
  ],
};
fs.writeFileSync(path.join(DIST, 'manifest.json'), JSON.stringify(manifest, null, 2));

console.log('3/4 Inyectando meta tags PWA (iOS + Android) y Safe Area CSS en dist/index.html...');
const indexPath = path.join(DIST, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

html = html.replace(/<html[^>]*>/i, '<html lang="es">');
html = html.replace(/<title>[^<]*<\/title>/i, '<title>Cancionero</title>');
html = html.replace(
  /<meta\s+name="viewport"[^>]*>/i,
  '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />'
);

const pwaHead = `
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Cancionero" />
    <meta name="theme-color" content="#FAF8F4" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#09090B" media="(prefers-color-scheme: dark)" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <style>
      html, body, #root {
        height: 100%;
        margin: 0;
        padding: 0;
        background-color: #FAF8F4;
        overscroll-behavior: none;
        -webkit-tap-highlight-color: transparent;
      }
      @media (prefers-color-scheme: dark) {
        html, body, #root {
          background-color: #09090B;
        }
      }
    </style>
    <script>
      if ('serviceWorker' in navigator) {
        var refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', function () {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('/sw.js').then(function (reg) {
            reg.update().catch(function () {});
            document.addEventListener('visibilitychange', function () {
              if (document.visibilityState === 'visible') {
                reg.update().catch(function () {});
              }
            });
          }).catch(function () {});
        });
      }
    </script>
`;

html = html.replace('</head>', `${pwaHead}  </head>`);
fs.writeFileSync(indexPath, html, 'utf8');

console.log('4/4 Generando Service Worker offline (dist/sw.js)...');
function walkFiles(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full, base));
    else {
      const rel = '/' + path.relative(base, full).split(path.sep).join('/');
      if (rel !== '/sw.js' && rel !== '/_headers' && !rel.endsWith('.map')) out.push(rel);
    }
  }
  return out;
}

const precacheUrls = ['/', ...walkFiles(DIST)];
const hash = crypto
  .createHash('sha256')
  .update(precacheUrls.join('|') + fs.readFileSync(indexPath, 'utf8'))
  .digest('hex')
  .slice(0, 10);

const swSource = `// Service Worker offline-first generado automáticamente por scripts/build-pwa.mjs
const CACHE_NAME = 'cancionero-pwa-${hash}';
const PRECACHE_URLS = ${JSON.stringify(precacheUrls, null, 2)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return res;
      });
    })
  );
});
`;

fs.writeFileSync(path.join(DIST, 'sw.js'), swSource, 'utf8');

// Headers para Cloudflare Pages / Netlify (asegura que sw.js y manifest.json siempre se actualicen)
const headersContent = `/sw.js
  Cache-Control: public, max-age=0, must-revalidate
  Service-Worker-Allowed: /

/manifest.json
  Cache-Control: public, max-age=0, must-revalidate

/_expo/static/*
  Cache-Control: public, max-age=31536000, immutable
`;
fs.writeFileSync(path.join(DIST, '_headers'), headersContent, 'utf8');

console.log(`PWA lista en dist/ (${precacheUrls.length} archivos cacheados offline, caché ${hash}).`);
