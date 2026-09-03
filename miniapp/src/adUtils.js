/**
 * Ad Manager — Fast Adexium Primary + Fast GigaPub Fallback
 *
 * Fast logic:
 * 1. Checks Adexium via requestAd('interstitial').
 * 2. If Adexium returns an ad -> calls displayAd() immediately.
 * 3. If Adexium has NO fill -> falls back IMMEDIATELY to GigaPub window.showGiga().
 * 4. Zero artificial multi-second delays.
 */

const ADEXIUM_SCRIPT_URL = 'https://cdn.tgads.space/assets/js/adexium-widget.min.js';
const ADEXIUM_SCRIPT_ID  = 'adexium-ad-sdk';
const ADEXIUM_WID        = 'e93d690f-bdc3-4ed5-8d9f-8f208afa3774';

const GIGA_SCRIPT_URL    = 'https://ad.gigapub.tech/script?id=7451';
const GIGA_SCRIPT_ID     = 'gigapub-ad-sdk';

let _adexiumInitStarted = false;
let _gigaInitStarted    = false;

// ── Initialize both ad networks in parallel ──────────────────────

export function initAdexiumAds() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  
  // Init Adexium
  if (!window._adexiumInstance && !_adexiumInitStarted) {
    _adexiumInitStarted = true;
    const runAdexiumInit = () => {
      if (window.AdexiumWidget && !window._adexiumInstance) {
        try {
          window._adexiumInstance = new window.AdexiumWidget({ wid: ADEXIUM_WID });
          if (typeof window._adexiumInstance.autoMode === 'function') {
            window._adexiumInstance.autoMode();
          }
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

  // Also pre-warm GigaPub in parallel
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
 * Fast attempt: Adexium -> GigaPub fallback -> Fail gracefully.
 *
 * @param {string} placement
 * @returns {Promise<{ success: boolean, network?: 'adexium'|'gigapub', error?: string }>}
 */
export async function showRewardedAd(placement = 'main') {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Browser environment required' };
  }

  // Make sure scripts are loading
  initAdexiumAds();

  // ── Step 1: Try Adexium ───────────────────────────────────────
  const widget = window._adexiumInstance;
  if (widget) {
    console.log('[AdManager] Requesting Adexium ad...');
    let ads = null;
    try {
      ads = await widget.requestAd('interstitial', true);
      if (!Array.isArray(ads) || ads.length === 0) {
        ads = await widget.requestAd('interstitial', false);
      }
    } catch (e) {
      console.warn('[AdManager] Adexium requestAd error:', e);
    }

    if (Array.isArray(ads) && ads.length > 0) {
      try {
        widget.displayAd(ads, 'interstitial');
        console.log('[AdManager] ✅ Adexium ad displayed — waiting 15s view time...');
        await new Promise(r => setTimeout(r, 15000));
        return { success: true, network: 'adexium' };
      } catch (displayErr) {
        console.warn('[AdManager] Adexium displayAd failed:', displayErr);
      }
    } else {
      console.log('[AdManager] Adexium returned no bids — trying GigaPub instantly...');
    }
  }

  // ── Step 2: Try GigaPub Fallback ─────────────────────────────
  console.log('[AdManager] Launching GigaPub fallback...');
  
  // Wait up to 2s if GigaPub script is still loading
  if (typeof window.showGiga !== 'function') {
    let waited = 0;
    while (typeof window.showGiga !== 'function' && waited < 2000) {
      await new Promise(r => setTimeout(r, 200));
      waited += 200;
    }
  }

  if (typeof window.showGiga === 'function') {
    try {
      console.log('[AdManager] Triggering window.showGiga()...');
      await window.showGiga(placement);
      console.log('[AdManager] ✅ GigaPub ad completed');
      return { success: true, network: 'gigapub' };
    } catch (err) {
      console.warn('[AdManager] GigaPub ad error/closed:', err);
      return { 
        success: false, 
        error: typeof err === 'string' ? err : 'Ad was closed or unavailable. Please try again.' 
      };
    }
  }

  // ── Step 3: No fill from either network ───────────────────────
  return { 
    success: false, 
    error: 'No ad available right now. Please try again in a moment.' 
  };
}

// Backwards compat stubs
export function initMonetagAds() {}
export function waitForGiga() { return Promise.resolve(false); }
export function triggerStartupAd() {}
