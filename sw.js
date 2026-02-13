/**
 * Service Worker for Skunked: Way of the Spray
 * ---------------------------------------------------
 * Caches all game assets so the game can load quickly and work offline.
 * Strategy: Cache-first for versioned assets, network-first for HTML.
 *
 * Bump CACHE_VERSION when you deploy new code/assets to bust the cache.
 */

const CACHE_VERSION = 'skunked-v3';
const CACHE_NAME = `${CACHE_VERSION}`;

// Determine base path from service worker location
// This allows the SW to work in subdirectories like /SkunkFU/
const getBasePath = () => {
  const scope = self.registration.scope;
  const url = new URL(scope);
  return url.pathname;
};

// Helper to resolve relative paths to full URLs based on SW scope
const resolveUrl = (path) => {
  const base = getBasePath();
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return base + cleanPath;
};

// Core shell files that must be cached for the app to work offline
// Use relative paths (no leading /)
const CORE_ASSETS_RELATIVE = [
  '',  // Root of scope (index.html)
  'index.html',
  'styles.css',
  'achievements.css',
  'manifest.json',

  // JS engine
  'js/config.js',
  'js/utils.js',
  'js/highscores.js',
  'js/spriteLoader.js',
  'js/audioManager.js',
  'js/visualEffects.js',
  'js/levelData.js',
  'js/level.js',
  'js/levelEditor.js',
  'js/player.js',
  'js/enemy.js',
  'js/enemyManager.js',
  'js/itemManager.js',
  'js/touchControls.js',
  'js/ui.js',
  'js/achievements.js',
  'js/game.js',
  'js/main.js',

  // Sprites — characters
  'assets/sprites/characters/ninja_attack.png',
  'assets/sprites/characters/ninja_death.png',
  'assets/sprites/characters/ninja_hurt.png',
  'assets/sprites/characters/ninja_idle.png',
  'assets/sprites/characters/ninja_jump.png',
  'assets/sprites/characters/ninja_shadow_strike.png',
  'assets/sprites/characters/ninja_skunk_shot.png',
  'assets/sprites/characters/ninja_walk.png',

  // Sprites — enemies
  'assets/sprites/enemies/basic_attack.png',
  'assets/sprites/enemies/basic_hurt.png',
  'assets/sprites/enemies/basic_idle.png',
  'assets/sprites/enemies/basic_walk.png',
  'assets/sprites/enemies/second_attack.png',
  'assets/sprites/enemies/second_hurt.png',
  'assets/sprites/enemies/second_idle.png',
  'assets/sprites/enemies/second_walk.png',
  'assets/sprites/enemies/third_attack.png',
  'assets/sprites/enemies/third_hurt.png',
  'assets/sprites/enemies/third_idle.png',
  'assets/sprites/enemies/third_walk.png',
  'assets/sprites/enemies/fourth_attack.png',
  'assets/sprites/enemies/fourth_hurt.png',
  'assets/sprites/enemies/fourth_idle.png',
  'assets/sprites/enemies/fourth_walk.png',
  'assets/sprites/enemies/fly_attack.png',
  'assets/sprites/enemies/fly_idle.png',
  'assets/sprites/enemies/fly_move.png',
  'assets/sprites/enemies/boss_attack1.png',
  'assets/sprites/enemies/boss_idle.png',
  'assets/sprites/enemies/boss_walk.png',
  'assets/sprites/enemies/boss2_attack.png',
  'assets/sprites/enemies/boss2_hurt.png',
  'assets/sprites/enemies/boss2_idle.png',
  'assets/sprites/enemies/boss2_walk.png',
  'assets/sprites/enemies/boss3_attack.png',
  'assets/sprites/enemies/boss3_hurt.png',
  'assets/sprites/enemies/boss3_idle.png',
  'assets/sprites/enemies/boss3_walk.png',
  'assets/sprites/enemies/boss4_attack.png',
  'assets/sprites/enemies/boss4_hurt.png',
  'assets/sprites/enemies/boss4_idle.png',
  'assets/sprites/enemies/boss4_walk.png',

  // Sprites — items
  'assets/sprites/items/extra_life.svg',
  'assets/sprites/items/golden_idol.svg',
  'assets/sprites/items/health_regen_item.svg',

  // Sprites — backgrounds & tiles
  'assets/sprites/backgrounds/cave_crystal_bg.png',
  'assets/sprites/backgrounds/cave_depths_bg.png',
  'assets/sprites/backgrounds/city_bg.png',
  'assets/sprites/backgrounds/forest_bg.png',
  'assets/sprites/backgrounds/mountains_bg.png',
  'assets/sprites/backgrounds/neon_bg.png',
  'assets/sprites/backgrounds/rotate_bg.png',
  'assets/sprites/backgrounds/tiles/ground_tile.png',
  'assets/sprites/backgrounds/tiles/platform_tile.png',
  'assets/sprites/backgrounds/tiles/wall_tile.png',

  // Audio — critical SFX (small, needed immediately)
  'assets/audio/sfx/jump.wav',
  'assets/audio/sfx/attack1.wav',
  'assets/audio/sfx/attack2.wav',
  'assets/audio/sfx/attack3.wav',
  'assets/audio/sfx/shadow_strike.wav',
  'assets/audio/sfx/shadow_strike_hit.wav',
  'assets/audio/sfx/player_hit.wav',
  'assets/audio/sfx/player_death.wav',
  'assets/audio/sfx/land.wav',
  'assets/audio/sfx/enemy_hit.wav',
  'assets/audio/sfx/enemy_death.wav',
  'assets/audio/sfx/ui_confirm.wav',
  'assets/audio/sfx/game_over.wav',
  'assets/audio/sfx/pause.wav'
];

// ────────────────────────────────────────────────────────────
// INSTALL — pre-cache core assets
// ────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Resolve all relative paths to full URLs based on SW scope
      const fullUrls = CORE_ASSETS_RELATIVE.map(path => resolveUrl(path));
      console.log('[SW] Caching', fullUrls.length, 'assets from scope:', getBasePath());
      
      // Use addAll with individual error handling so one missing
      // asset doesn't block the entire install.
      return Promise.all(
        fullUrls.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[SW] Failed to cache:', url, err.message || err);
          })
        )
      );
    }).then(() => {
      // Activate immediately without waiting for tabs to close
      return self.skipWaiting();
    })
  );
});

// ────────────────────────────────────────────────────────────
// ACTIVATE — clean up old caches
// ────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating', CACHE_NAME);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ────────────────────────────────────────────────────────────
// FETCH — cache-first for assets, network-first for HTML
// ────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (analytics, CDNs, etc.)
  if (!request.url.startsWith(self.location.origin)) return;

  const url = new URL(request.url);

  // Network-first for HTML (always get latest page shell)
  if (request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the fresh copy
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for everything else (JS, CSS, images, audio)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        // Don't cache errors
        if (!response || response.status !== 200) return response;

        // Cache the fetched resource for next time
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      });
    })
  );
});
