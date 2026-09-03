/**
 * Ad Manager — 100% Guaranteed Adexium Priority + GigaPub Fallback
 *
 * Flow:
 * 1. Initialize Adexium (WITHOUT autoMode so manual requestAd works 100%).
 * 2. On Watch Ad:
 *    a) Query Adexium requestAd('interstitial', true) [motivated]
 *    b) Query Adexium requestAd('interstitial', false) [standard]
 *    c) Query Adexium requestAd('rewarded', true)
 *    d) Query Adexium autoFetchAd()
 * 3. IF ANY Adexium step succeeds -> display ad, wait view time -> RETURN IMMEDIATELY { success: true, network: 'adexium' }.
 *    (GigaPub is NEVER called if Adexium succeeded).
 * 4. ONLY IF ALL Adexium attempts fail/empty -> trigger GigaPub fallback -> RETURN { success: true, network: 'gigapub' }.
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
          // Do NOT enable autoMode() — manual requestAd() handles exact ad timing
          window._adexiumInstance = new window.AdexiumWidget({ wid: ADEXIUM_WID });
          console.log('[AdManager] ✅ Adexium SDK initialized (manual mode active)');
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

  // Pre-load GigaPub script in background so fallback is fast if needed
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
    s.onload  = () => { _gigaInitStarted = false; console.log('[AdManager] ✅ GigaPub script pre-loaded'); };
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
 * Guaranteed Adexium Priority -> GigaPub Fallback.
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
    while (!window._adexiumInstance && waited < 3500) {
      await new Promise(r => setTimeout(r, 150));
      waited += 150;
    }
    widget = window._adexiumInstance;
  }

  // ── Step 1: ADEXIUM PRIORITY ──────────────────────────────────
  if (widget) {
    console.log('[AdManager] 🎯 Querying Adexium for ad bids...');
    
    let adexiumServed = false;

    // Attempt 1a: Interstitial (Motivated)
    try {
      let ads = await widget.requestAd('interstitial', true);
      if (Array.isArray(ads) && ads.length > 0) {
        widget.displayAd(ads, 'interstitial');
        console.log('[AdManager] ✅ Adexium interstitial (motivated) displayed!');
        adexiumServed = true;
      }
    } catch (e) {
      console.warn('[AdManager] Adexium interstitial motivated error:', e);
    }

    // Attempt 1b: Interstitial (Standard)
    if (!adexiumServed) {
      try {
        let ads = await widget.requestAd('interstitial', false);
        if (Array.isArray(ads) && ads.length > 0) {
          widget.displayAd(ads, 'interstitial');
          console.log('[AdManager] ✅ Adexium interstitial (standard) displayed!');
          adexiumServed = true;
        }
      } catch (e) {
        console.warn('[AdManager] Adexium interstitial standard error:', e);
      }
    }

    // Attempt 1c: Rewarded format
    if (!adexiumServed) {
      try {
        let ads = await widget.requestAd('rewarded', true);
        if (Array.isArray(ads) && ads.length > 0) {
          widget.displayAd(ads, 'rewarded');
          console.log('[AdManager] ✅ Adexium rewarded displayed!');
          adexiumServed = true;
        }
      } catch (e) {}
    }

    // Attempt 1d: autoFetchAd()
    if (!adexiumServed) {
      try {
        console.log('[AdManager] Trying Adexium autoFetchAd()...');
        await widget.autoFetchAd();
        console.log('[AdManager] ✅ Adexium autoFetchAd() executed successfully!');
        adexiumServed = true;
      } catch (autoErr) {
        console.warn('[AdManager] Adexium autoFetchAd error:', autoErr);
      }
    }

    // IF ADEXIUM SERVED AN AD:
    // Wait required 15s view time and RETURN IMMEDIATELY.
    // NEVER fall through to GigaPub!
    if (adexiumServed) {
      console.log('[AdManager] ✅ Adexium ad successfully active — waiting 15s view time...');
      await new Promise(r => setTimeout(r, 15000));
      console.log('[AdManager] ✅ Adexium 15s view complete!');
      return { success: true, network: 'adexium' };
    }

    console.warn('[AdManager] ⚠️ Adexium returned 0 bids across all formats. Switching to GigaPub fallback...');
  } else {
    console.warn('[AdManager] ⚠️ Adexium SDK not ready. Switching to GigaPub fallback...');
  }

  // ── Step 2: GIGAPUB FALLBACK (Only called if Adexium 100% failed) ──
  console.log('[AdManager] ⚡ Triggering GigaPub Fallback...');
  
  if (typeof window.showGiga !== 'function') {
    let waited = 0;
    while (typeof window.showGiga !== 'function' && waited < 2500) {
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
