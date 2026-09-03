/**
 * Ad Manager — Guaranteed Adexium Priority + GigaPub Fallback
 *
 * Strict Rules:
 * 1. Adexium is ALWAYS queried first via requestAd().
 * 2. An Adexium ad is ONLY considered served if requestAd() returns an array with length > 0
 *    AND displayAd() is successfully called.
 * 3. Never fake a credit via autoFetchAd() resolving empty.
 * 4. GigaPub is ONLY called as a fallback if Adexium returns 0 bids.
 * 5. If neither network serves an ad, return { success: false } immediately — NO fake rewards!
 */

const ADEXIUM_SCRIPT_URL = 'https://cdn.tgads.space/assets/js/adexium-widget.min.js';
const ADEXIUM_SCRIPT_ID  = 'adexium-ad-sdk';
const ADEXIUM_WID        = 'e93d690f-bdc3-4ed5-8d9f-8f208afa3774';

const GIGA_SCRIPT_URL    = 'https://ad.gigapub.tech/script?id=7451';
const GIGA_SCRIPT_ID     = 'gigapub-ad-sdk';

let _adexiumInitStarted = false;
let _gigaInitStarted    = false;

export function initAdexiumAds() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  
  if (!window._adexiumInstance && !_adexiumInitStarted) {
    _adexiumInitStarted = true;
    const runAdexiumInit = () => {
      if (window.AdexiumWidget && !window._adexiumInstance) {
        try {
          window._adexiumInstance = new window.AdexiumWidget({ wid: ADEXIUM_WID });
          console.log('[AdManager] ✅ Adexium SDK initialized');
        } catch (err) {
          _adexiumInitStarted = false;
          console.error('[AdManager] Adexium init error:', err);
        }
      }
    };

    if (window.AdexiumWidget) {
      runAdexiumInit();
    } else if (!document.getElementById(ADEXIUM_SCRIPT_ID)) {
      try {
        const s = document.createElement('script');
        s.id = ADEXIUM_SCRIPT_ID;
        s.src = ADEXIUM_SCRIPT_URL;
        s.async = true;
        s.crossOrigin = 'anonymous';
        s.onload = runAdexiumInit;
        s.onerror = () => { _adexiumInitStarted = false; };
        document.head.appendChild(s);
      } catch (e) { _adexiumInitStarted = false; }
    }
  }

  // Pre-load GigaPub script in background so fallback is ready if needed
  initGigaAds();
}

export function initGigaAds() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (typeof window.showGiga === 'function') return;
  if (_gigaInitStarted || document.getElementById(GIGA_SCRIPT_ID)) return;
  _gigaInitStarted = true;

  try {
    const s = document.createElement('script');
    s.id = GIGA_SCRIPT_ID;
    s.src = GIGA_SCRIPT_URL;
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.onload  = () => { _gigaInitStarted = false; console.log('[AdManager] ✅ GigaPub script loaded'); };
    s.onerror = () => { _gigaInitStarted = false; console.warn('[AdManager] GigaPub script failed to load'); };
    document.head.appendChild(s);
  } catch (err) {
    _gigaInitStarted = false;
  }
}

export function prefetchGramAd() {
  initAdexiumAds();
}

/**
 * Show a rewarded ad.
 * Adexium Priority -> GigaPub Fallback.
 *
 * @param {string} placement
 * @returns {Promise<{ success: boolean, network?: 'adexium'|'gigapub', error?: string }>}
 */
export async function showRewardedAd(placement = 'main') {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Browser environment required' };
  }

  // 1. Ensure SDKs are initialized
  initAdexiumAds();

  let widget = window._adexiumInstance;
  if (!widget) {
    let waited = 0;
    while (!window._adexiumInstance && waited < 3000) {
      await new Promise(r => setTimeout(r, 150));
      waited += 150;
    }
    widget = window._adexiumInstance;
  }

  // ── Step 1: ADEXIUM PRIORITY ──────────────────────────────────
  if (widget) {
    console.log('[AdManager] 🎯 Querying Adexium for ad bids...');

    let adexiumAds = null;
    let formatUsed = 'interstitial';

    // Attempt 1a: Interstitial (Motivated)
    try {
      adexiumAds = await widget.requestAd('interstitial', true);
    } catch (e) {
      console.warn('[AdManager] Adexium interstitial motivated error:', e);
    }

    // Attempt 1b: Interstitial (Standard)
    if (!Array.isArray(adexiumAds) || adexiumAds.length === 0) {
      try {
        adexiumAds = await widget.requestAd('interstitial', false);
      } catch (e) {
        console.warn('[AdManager] Adexium interstitial standard error:', e);
      }
    }

    // Attempt 1c: Rewarded format
    if (!Array.isArray(adexiumAds) || adexiumAds.length === 0) {
      try {
        adexiumAds = await widget.requestAd('rewarded', true);
        if (Array.isArray(adexiumAds) && adexiumAds.length > 0) {
          formatUsed = 'rewarded';
        }
      } catch (e) {}
    }

    // ONLY IF REAL BIDS RETURNED -> DISPLAY ADEXIUM AD
    if (Array.isArray(adexiumAds) && adexiumAds.length > 0) {
      try {
        widget.displayAd(adexiumAds, formatUsed);
        console.log(`[AdManager] ✅ Adexium ${formatUsed} ad displayed on screen! Waiting 15s...`);
        // Wait required view duration
        await new Promise(r => setTimeout(r, 15000));
        console.log('[AdManager] ✅ Adexium view time completed!');
        return { success: true, network: 'adexium' };
      } catch (displayErr) {
        console.warn('[AdManager] Adexium displayAd failed:', displayErr);
      }
    }

    console.warn('[AdManager] ⚠️ Adexium returned 0 bids. Switching to GigaPub fallback...');
  } else {
    console.warn('[AdManager] ⚠️ Adexium SDK instance not ready. Switching to GigaPub fallback...');
  }

  // ── Step 2: GIGAPUB FALLBACK (Only called if Adexium returned 0 bids) ──
  console.log('[AdManager] ⚡ Triggering GigaPub Fallback...');
  
  if (typeof window.showGiga !== 'function') {
    let waited = 0;
    while (typeof window.showGiga !== 'function' && waited < 2000) {
      await new Promise(r => setTimeout(r, 200));
      waited += 200;
    }
  }

  if (typeof window.showGiga === 'function') {
    try {
      console.log('[AdManager] Calling window.showGiga()...');
      await window.showGiga(placement);
      console.log('[AdManager] ✅ GigaPub ad completed!');
      return { success: true, network: 'gigapub' };
    } catch (err) {
      console.warn('[AdManager] GigaPub ad error/closed:', err);
      return { 
        success: false, 
        error: typeof err === 'string' ? err : 'Ad was closed or unavailable. Please try again.' 
      };
    }
  }

  // ── Step 3: No fill from either network — DO NOT GIVE REWARD ─────
  console.warn('[AdManager] ❌ No ad available from Adexium or GigaPub.');
  return { 
    success: false, 
    error: 'No ad available right now. Please try again in a moment.' 
  };
}

// Backwards compat stubs
export function initMonetagAds() {}
export function waitForGiga() { return Promise.resolve(false); }
export function triggerStartupAd() {}
