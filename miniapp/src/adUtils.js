/**
 * Ad Manager — 100% Adexium Exclusive
 * Single source of truth for all ad operations.
 */

const ADEXIUM_SCRIPT_URL = 'https://cdn.tgads.space/assets/js/adexium-widget.min.js';
const ADEXIUM_SCRIPT_ID = 'adexium-ad-sdk';
const ADEXIUM_WID = 'e93d690f-bdc3-4ed5-8d9f-8f208afa3774';

// Guard: only initialize once
let _initStarted = false;

/**
 * Initialize the Adexium SDK.
 * Safe to call multiple times — only runs once.
 * Does NOT call autoMode() to avoid conflicting with manual requestAd().
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
        // NOTE: Do NOT call autoMode() here — it conflicts with manual requestAd() calls
        // and can exhaust ad fill before users tap Watch Ad.
        console.log('[AdManager] Adexium SDK initialized successfully');
      } catch (err) {
        _initStarted = false; // allow retry
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
    // Poll until AdexiumWidget class is available
    const poll = setInterval(() => {
      if (window.AdexiumWidget) {
        clearInterval(poll);
        runInit();
      }
    }, 100);
    // Give up after 10s
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
 * Show a rewarded Adexium interstitial ad.
 * Returns { success: true } ONLY when a real ad bid is returned and displayed.
 * Returns { success: false, error } when no fill or error — user is NOT credited.
 *
 * @param {string} placement - Placement identifier (for logging only)
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function showRewardedAd(placement = 'main') {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Browser environment required' };
  }

  // Ensure SDK is initialized
  if (!window._adexiumInstance) {
    initAdexiumAds();
    // Wait up to 3s for SDK to initialize
    let waited = 0;
    while (!window._adexiumInstance && waited < 3000) {
      await new Promise(r => setTimeout(r, 200));
      waited += 200;
    }
  }

  const widget = window._adexiumInstance;
  if (!widget) {
    return { success: false, error: 'Ad provider not ready. Please refresh and try again.' };
  }

  console.log(`[AdManager] Requesting Adexium ad (placement: ${placement})...`);

  try {
    // Step 1: Try motivated interstitial first (higher fill rate)
    let ads = await widget.requestAd('interstitial', true);

    // Step 2: Fall back to standard (unmotivated) if no motivated fill
    if (!Array.isArray(ads) || ads.length === 0) {
      console.log('[AdManager] No motivated fill — trying standard requestAd...');
      ads = await widget.requestAd('interstitial', false);
    }

    if (Array.isArray(ads) && ads.length > 0) {
      // Real ad bid received — show the interstitial overlay to the user
      widget.displayAd(ads, 'interstitial');
      console.log('[AdManager] ✅ Adexium ad displayed — user watching for 15s...');

      // Wait the full required view duration
      await new Promise(r => setTimeout(r, 15000));

      console.log('[AdManager] ✅ Ad view complete — crediting user');
      return { success: true };
    }

    // No fill from Adexium — do NOT credit the user
    console.warn('[AdManager] ⚠️ No ad bid returned by Adexium (no fill for this user/region right now)');
    return {
      success: false,
      error: 'No ad available right now. Adexium has no ads for your region at this moment. Please try again in a minute.',
    };

  } catch (err) {
    console.error('[AdManager] Adexium requestAd error:', err);
    return { success: false, error: 'Ad network error. Please try again.' };
  }
}

// Kept for backwards compat — no-ops
export function initGigaAds() {}
export function initMonetagAds() {}
export function waitForGiga() { return Promise.resolve(false); }
export function triggerStartupAd() {}
