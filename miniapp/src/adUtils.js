/**
 * Ad Manager — 100% Adexium Exclusive
 * Single source of truth for all ad operations.
 *
 * Key strategy: Pre-warm ads in background (prefetchAd) so they are cached
 * and ready instantly when user taps Watch Ad. Multiple format attempts for
 * maximum fill rate.
 */

const ADEXIUM_SCRIPT_URL = 'https://cdn.tgads.space/assets/js/adexium-widget.min.js';
const ADEXIUM_SCRIPT_ID = 'adexium-ad-sdk';
const ADEXIUM_WID = 'e93d690f-bdc3-4ed5-8d9f-8f208afa3774';

// Guard: only initialize once
let _initStarted = false;

// Pre-fetched ad cache — filled in background so tap is instant
let _cachedAds = null;
let _prefetchInProgress = false;

/**
 * Initialize the Adexium SDK.
 * Safe to call multiple times — only runs once.
 */
export function initAdexiumAds() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window._adexiumInstance) return;
  if (_initStarted) return;
  _initStarted = true;

  const runInit = () => {
    if (window.AdexiumWidget && !window._adexiumInstance) {
      try {
        window._adexiumInstance = new window.AdexiumWidget({
          wid: ADEXIUM_WID,
          adFormat: 'interstitial',
        });
        console.log('[AdManager] Adexium SDK initialized successfully');
        // Start pre-fetching an ad immediately after init
        _prefetchAd();
      } catch (err) {
        _initStarted = false;
        console.error('[AdManager] Adexium widget init error:', err);
      }
    }
  };

  if (window.AdexiumWidget) {
    runInit();
    return;
  }

  // Script already in DOM (loaded by index.html) — wait for it
  if (document.getElementById(ADEXIUM_SCRIPT_ID)) {
    const poll = setInterval(() => {
      if (window.AdexiumWidget) {
        clearInterval(poll);
        runInit();
      }
    }, 100);
    setTimeout(() => clearInterval(poll), 10000);
    return;
  }

  // Inject script ourselves as fallback
  try {
    const script = document.createElement('script');
    script.id = ADEXIUM_SCRIPT_ID;
    script.src = ADEXIUM_SCRIPT_URL;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      console.log('[AdManager] Adexium script loaded');
      runInit();
    };
    script.onerror = () => {
      _initStarted = false;
      console.warn('[AdManager] Adexium script failed to load');
    };
    document.head.appendChild(script);
  } catch (err) {
    _initStarted = false;
    console.error('[AdManager] Failed to inject Adexium script:', err);
  }
}

/**
 * Pre-fetch an ad in the background so it's ready when the user taps.
 * Tries both motivated and unmotivated interstitial formats.
 * Caches result in _cachedAds.
 */
async function _prefetchAd() {
  if (_prefetchInProgress || _cachedAds) return;
  const widget = window._adexiumInstance;
  if (!widget) return;

  _prefetchInProgress = true;
  console.log('[AdManager] Pre-fetching Adexium ad in background...');

  try {
    let ads = await widget.requestAd('interstitial', true);
    if (!Array.isArray(ads) || ads.length === 0) {
      ads = await widget.requestAd('interstitial', false);
    }
    if (Array.isArray(ads) && ads.length > 0) {
      _cachedAds = ads;
      console.log('[AdManager] ✅ Ad pre-fetched and cached — ready to display instantly');
    } else {
      console.log('[AdManager] No fill during prefetch — will retry on demand');
    }
  } catch (e) {
    console.warn('[AdManager] Prefetch error:', e);
  } finally {
    _prefetchInProgress = false;
  }
}

/**
 * Call this when the Gram page loads to warm up the ad cache.
 */
export function prefetchGramAd() {
  if (!window._adexiumInstance) {
    initAdexiumAds();
    // Delay prefetch until SDK is ready
    setTimeout(_prefetchAd, 1500);
  } else {
    _prefetchAd();
  }
}

/**
 * Show a rewarded Adexium interstitial ad.
 *
 * Strategy:
 * 1. Use cached pre-fetched ad if available (instant display)
 * 2. Otherwise do a fresh requestAd (motivated, then unmotivated)
 * 3. Only return success=true when an ad was actually displayed
 * 4. After displaying, pre-fetch next ad for subsequent taps
 *
 * @param {string} placement - Placement identifier (for logging)
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function showRewardedAd(placement = 'main') {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Browser environment required' };
  }

  // Ensure SDK is initialized
  if (!window._adexiumInstance) {
    initAdexiumAds();
    let waited = 0;
    while (!window._adexiumInstance && waited < 4000) {
      await new Promise(r => setTimeout(r, 200));
      waited += 200;
    }
  }

  const widget = window._adexiumInstance;
  if (!widget) {
    return { success: false, error: 'Ad provider not ready. Please refresh the app and try again.' };
  }

  console.log(`[AdManager] Showing ad (placement: ${placement})...`);

  let ads = null;

  // Step 1: Use cached ad if available (fastest path)
  if (_cachedAds && _cachedAds.length > 0) {
    ads = _cachedAds;
    _cachedAds = null; // consume the cache
    console.log('[AdManager] Using pre-fetched cached ad');
  } else {
    // Step 2: Fresh request — try motivated first, then unmotivated
    console.log('[AdManager] No cache — requesting fresh ad...');
    try {
      ads = await widget.requestAd('interstitial', true);
      if (!Array.isArray(ads) || ads.length === 0) {
        ads = await widget.requestAd('interstitial', false);
      }
    } catch (e) {
      console.warn('[AdManager] requestAd error:', e);
    }
  }

  if (Array.isArray(ads) && ads.length > 0) {
    // Display the ad overlay to the user
    widget.displayAd(ads, 'interstitial');
    console.log('[AdManager] ✅ Adexium ad displayed — waiting 15s view time...');

    // Pre-fetch next ad in background while current one is being watched
    setTimeout(_prefetchAd, 2000);

    // Wait required view duration
    await new Promise(r => setTimeout(r, 15000));

    console.log('[AdManager] ✅ Ad view complete — crediting reward');
    return { success: true };
  }

  // No ad fill at all
  // Still pre-fetch for next attempt
  setTimeout(_prefetchAd, 3000);

  console.warn('[AdManager] ⚠️ No ad fill available from Adexium right now');
  return {
    success: false,
    error: 'No ad available right now. Please wait a moment and try again.',
  };
}

// Backwards-compat stubs
export function initGigaAds() {}
export function initMonetagAds() {}
export function waitForGiga() { return Promise.resolve(false); }
export function triggerStartupAd() {}
