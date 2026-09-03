/**
 * Ad Manager — Guaranteed Adexium Priority + GigaPub Fallback
 *
 * Adexium-first flow:
 * 1. Ensure Adexium SDK & instance are fully loaded (waits up to 3s if needed).
 * 2. Try Adexium requestAd('interstitial', true) [motivated].
 * 3. Try Adexium requestAd('interstitial', false) [standard].
 * 4. Try Adexium requestAd('rewarded', true) / ('rewarded', false).
 * 5. Try Adexium autoFetchAd().
 * 6. If ANY Adexium method returns an ad / renders an overlay -> display it, wait 15s -> return { success: true, network: 'adexium' }.
 * 7. ONLY if all Adexium attempts return no fill -> fallback to GigaPub window.showGiga().
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

// DOM helper to check if an Adexium overlay has rendered
function _checkAdexiumOverlayVisible() {
  const els = document.querySelectorAll('div, iframe, section');
  for (const el of els) {
    const s = window.getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (
      r.width  > window.innerWidth  * 0.6 &&
      r.height > window.innerHeight * 0.6 &&
      (s.position === 'fixed' || s.position === 'absolute') &&
      s.zIndex !== 'auto' &&
      parseInt(s.zIndex) > 50 &&
      s.display !== 'none' &&
      s.visibility !== 'hidden' &&
      el.id !== 'root'
    ) return true;
  }
  return false;
}

/**
 * Show a rewarded ad.
 * Guaranteed Adexium Priority -> GigaPub Fallback.
 *
 * @param {string} placement
 * @returns {Promise<{ success: boolean, network?: 'adexium'|'gigapub', error?: string }>}
 */
export async function showRewardedAd(placement = 'main') {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Browser environment required' };
  }

  // Ensure Adexium SDK & instance are ready
  initAdexiumAds();

  let widget = window._adexiumInstance;
  if (!widget) {
    let waited = 0;
    while (!window._adexiumInstance && waited < 3500) {
      await new Promise(r => setTimeout(r, 150));
      waited += 150;
    }
    widget = window._adexiumInstance;
  }

  // ── Step 1: Exhaustive Adexium Attempt ────────────────────────
  if (widget) {
    console.log('[AdManager] 🎯 Attempting Adexium (Primary)...');
    let ads = null;

    // 1a. Try motivated interstitial
    try {
      ads = await widget.requestAd('interstitial', true);
    } catch (e) {}

    // 1b. Try unmotivated interstitial
    if (!Array.isArray(ads) || ads.length === 0) {
      try {
        ads = await widget.requestAd('interstitial', false);
      } catch (e) {}
    }

    // 1c. Try rewarded formats
    if (!Array.isArray(ads) || ads.length === 0) {
      try {
        ads = await widget.requestAd('rewarded', true);
      } catch (e) {}
    }
    if (!Array.isArray(ads) || ads.length === 0) {
      try {
        ads = await widget.requestAd('rewarded', false);
      } catch (e) {}
    }

    // If requestAd returned ads, display them!
    if (Array.isArray(ads) && ads.length > 0) {
      try {
        widget.displayAd(ads, 'interstitial');
        console.log('[AdManager] ✅ Adexium ad displayed via displayAd()! Waiting 15s...');
        await new Promise(r => setTimeout(r, 15000));
        return { success: true, network: 'adexium' };
      } catch (displayErr) {
        console.warn('[AdManager] Adexium displayAd error:', displayErr);
      }
    }

    // 1d. Fallback attempt: autoFetchAd()
    console.log('[AdManager] Trying Adexium autoFetchAd()...');
    try {
      await widget.autoFetchAd();
      // Check if autoFetchAd rendered an overlay
      let adexiumOverlaySeen = false;
      for (let i = 0; i < 15; i++) { // poll over 3 seconds
        await new Promise(r => setTimeout(r, 200));
        if (_checkAdexiumOverlayVisible()) {
          adexiumOverlaySeen = true;
          break;
        }
      }
      if (adexiumOverlaySeen) {
        console.log('[AdManager] ✅ Adexium ad overlay confirmed via autoFetchAd()! Waiting 15s...');
        await new Promise(r => setTimeout(r, 15000));
        return { success: true, network: 'adexium' };
      }
    } catch (autoErr) {
      console.warn('[AdManager] Adexium autoFetchAd error:', autoErr);
    }

    console.warn('[AdManager] ⚠️ Adexium returned no fill across all formats. Moving to GigaPub fallback...');
  } else {
    console.warn('[AdManager] ⚠️ Adexium SDK failed to load within timeout. Moving to GigaPub fallback...');
  }

  // ── Step 2: Try GigaPub Fallback ─────────────────────────────
  console.log('[AdManager] ⚡ Launching GigaPub Fallback...');
  
  if (typeof window.showGiga !== 'function') {
    let waited = 0;
    while (typeof window.showGiga !== 'function' && waited < 2500) {
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
