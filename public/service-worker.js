// ============================================================
// Gokul Mess — Service Worker
// Strategy: Runtime caching for Next.js SSR + Supabase auth
// ============================================================

const CACHE_VERSION = "v3";
const STATIC_CACHE = `gokul-mess-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `gokul-mess-runtime-${CACHE_VERSION}`;

// ------------------------------------------------------------
// Files to pre-cache on SW install (always available offline)
// ------------------------------------------------------------
const PRECACHE_ASSETS = [
  "/offline.html",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// ------------------------------------------------------------
// INSTALL — pre-cache essential static assets
// ------------------------------------------------------------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log("[SW] Pre-caching static assets");
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting()) // activate immediately
  );
});

// ------------------------------------------------------------
// ACTIVATE — delete old caches from previous SW versions
// ------------------------------------------------------------
self.addEventListener("activate", (event) => {
  const validCaches = [STATIC_CACHE, RUNTIME_CACHE];

  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !validCaches.includes(key))
            .map((key) => {
              console.log("[SW] Deleting old cache:", key);
              return caches.delete(key);
            })
        )
      )
      .then(() => self.clients.claim()) // take control immediately
  );
});

// ------------------------------------------------------------
// FETCH — main caching logic
// ------------------------------------------------------------
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Only handle GET requests
  if (request.method !== "GET") return;

  // 2. Only handle http/https (skip chrome-extension://, etc.)
  if (!url.protocol.startsWith("http")) return;

  // 3. Skip Supabase API — must always be live (auth, data)
  if (url.hostname.includes("supabase.co")) return;

  // 4. Skip Google OAuth and other external auth providers
  if (
    url.hostname.includes("google.com") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("accounts.google")
  )
    return;

  // 5. Next.js static chunks — Cache First (these never change, have hash in filename)
  //    e.g. /_next/static/chunks/abc123.js
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 6. Next.js image optimization — Network First with cache fallback
  if (url.pathname.startsWith("/_next/image")) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  // 7. PWA static files — Cache First (icons, manifest, offline page)
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.json" ||
    url.pathname === "/offline.html" ||
    url.pathname === "/service-worker.js" ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf)$/)
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 8. Next.js API routes — Network Only (never cache API responses)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkOnly(request));
    return;
  }

  // 9. Next.js RSC (React Server Component) data fetches — Network Only
  //    These are the ?_rsc= requests Next.js makes internally
  if (url.searchParams.has("_rsc")) {
    event.respondWith(networkOnly(request));
    return;
  }

  // 10. Auth routes — Network Only (login, callback must always be fresh)
  if (
    url.pathname === "/login" ||
    url.pathname.startsWith("/auth/")
  ) {
    event.respondWith(networkOnly(request));
    return;
  }

  // 11. App navigation routes (/student, /owner, /) — Network First
  //     Try network, fall back to cached version, then offline page
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // 12. Everything else — Network First with runtime cache
  event.respondWith(networkFirst(request, RUNTIME_CACHE));
});

// ============================================================
// Caching Strategy Helpers
// ============================================================

/**
 * Cache First: serve from cache, fetch from network if not cached.
 * Best for: static assets with hash in filename (JS, CSS, images)
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Return offline page for HTML, nothing for assets
    if (request.headers.get("accept")?.includes("text/html")) {
      return getOfflinePage();
    }
    return new Response("", { status: 408 });
  }
}

/**
 * Network First: try network, fall back to cache.
 * Best for: pages and dynamic content that should be fresh
 */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok && cacheName) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    if (request.headers.get("accept")?.includes("text/html")) {
      return getOfflinePage();
    }
    return new Response("", { status: 408 });
  }
}

/**
 * Network First with offline fallback page.
 * Best for: HTML navigation requests (/student, /owner, /)
 */
async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    // Cache successful HTML responses for offline use
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Try exact URL from cache first
    const cached = await caches.match(request);
    if (cached) return cached;

    // Show the offline page
    return getOfflinePage();
  }
}

/**
 * Network Only: always fetch from network, never cache.
 * Best for: API calls, auth routes, Supabase requests
 */
async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch {
    if (request.headers.get("accept")?.includes("text/html")) {
      return getOfflinePage();
    }
    return new Response(JSON.stringify({ error: "You are offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Returns the cached offline.html page.
 */
async function getOfflinePage() {
  const cached = await caches.match("/offline.html");
  if (cached) return cached;

  // Inline fallback if offline.html itself isn't cached yet
  return new Response(
    `<!DOCTYPE html>
    <html><head><meta charset="UTF-8"><title>Offline — Gokul Mess</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb;}
    .box{text-align:center;padding:2rem;max-width:360px;}
    h1{color:#111827;margin-bottom:.5rem;}p{color:#6b7280;}
    button{margin-top:1.5rem;background:#16a34a;color:white;border:none;padding:.75rem 2rem;border-radius:9999px;font-size:1rem;cursor:pointer;}
    </style></head>
    <body><div class="box">
    <h1>You're Offline</h1>
    <p>Please check your internet connection and try again.</p>
    <button onclick="location.reload()">Try Again</button>
    </div><script>window.addEventListener('online',()=>location.reload())</script></body></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}
