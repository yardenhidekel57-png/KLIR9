// Service Worker for the lobby notice board (index_he.html).
//
// Purpose: ONLY to make sure the very first navigation to the board
// (TV Bro opening it fresh after the streamer boots) never lands on the
// browser's own blank native "no internet connection" page if there's no
// network at that exact moment -- which is a real risk right after a power
// outage, since the box usually finishes booting before the home router/
// ISP modem finishes reconnecting. See the comment in index_he.html next
// to the registration call for the full reasoning.
//
// Strategy: network-first, cache as a fallback -- for the PAGE NAVIGATION
// (the HTML document) only. Every other request this page makes (weather/
// news/notices APIs, fonts, slide images) is left completely alone and
// goes straight to the network exactly as before; those already have
// their own failure handling inside the page's own JS (keep last-known
// data on a failed fetch), so there is no reason to add a second,
// redundant caching layer for them here -- doing so would only risk
// serving stale weather/news/notices, which is never what we want. This
// file's entire job is: "if the HTML document itself can't be fetched
// fresh, serve the last copy that DID load successfully, instead of
// nothing at all."

const CACHE_NAME = 'board-shell-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Only intervene for top-level page loads (what TV Bro does when it
  // opens the Home Page URL fresh). Everything else -- the API calls the
  // loaded page itself makes, fonts, images -- is untouched.
  if (event.request.mode !== 'navigate') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Fresh copy loaded successfully -- update the cache with it so
        // the fallback below always has the MOST RECENT working version,
        // not whatever happened to be first ever cached.
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() =>
        // Network failed (offline cold boot). Serve whatever copy of the
        // page we last managed to cache -- any working board beats a
        // blank error page. If nothing has ever been cached yet (e.g. the
        // very first install, before the board ever loaded once), this
        // resolves to undefined and the browser falls back to its normal
        // (native error page) behavior -- there's simply nothing to
        // recover from in that specific case.
        caches.match(event.request)
      )
  );
});
