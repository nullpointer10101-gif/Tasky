/**
 * Ad Manager — 100% Guaranteed Adexium Priority + GigaPub Fallback
 *
 * Guaranteed Adexium Flow:
 * 1. Initialize Adexium instance with wid & adFormat ('push-like').
 * 2. On Watch Ad:
 *    a) Query Adexium requestAd('push-like', true / false)
 *    b) Query Adexium requestAd('interstitial', true / false)
 *    c) Call Adexium autoFetchAd()
 * 3. Detect if Adexium displayed an ad on screen (via DOM element / iframe inspection).
 * 4. IF Adexium displayed an ad:
 *    - Wait 15s view duration
 *    - RETURN IMMEDIATELY { success: true, network: 'adexium' }
 *    - GigaPub is NEVER called!
 * 5. ONLY IF Adexium produced ZERO ad overlay:
 *    - Fallback to GigaPub window.showGiga()
 *    - RETURN { success: true, network: 'gigapub' }
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
          window._adexiumInstance = new window.AdexiumWidget({ 
            wid: ADEXIUM_WID,
            adFormat: 'push-like' 
          });
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

/**
 * Helper to check if an Adexium ad overlay or iframe is currently on screen
 */
function _isAdexiumAdOnScreen() {
  if (typeof document === 'undefined') return false;

  // 1. Check for specific Adexium / TGAds elements
  const adSelectors = [
    'iframe[src*="tgads"]',
    'iframe[src*="adexium"]',
    '[class*="adexium"]',
    '[id*="adexium"]',
    '[class*="tgads"]',
    '[id*="tgads"]',
  ];
  for (const sel of adSelectors) {
    const el = document.querySelector(sel);
    if (el) {
      const style = window.getComputedStyle(el);
      if (style.display !== 'none' && style.visibility !== 'hidden') {
        return true;
      }
    }
  }

  // 2. Check for any full-screen fixed/absolute overlay added outside #root
  const allElements = document.querySelectorAll('body > div:not(#root), body > iframe, body > section');
  for (const el of allElements) {
    if (el.id === 'root') continue;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    if (
      rect.width > 200 && rect.height > 150 &&
      (style.position === 'fixed' || style.position === 'absolute') &&
      style.display !== 'none' && style.visibility !== 'hidden'
    ) {
      return true;
    }
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

  // Ensure SDKs are initialized
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
    console.log('[AdManager] 🎯 Attempting Adexium ad serving...');

    let adexiumDisplayed = false;

    // 1a. Try manual requestAd formats
    const formatsToTry = [
      { format: 'push-like', motivated: true },
      { format: 'push-like', motivated: false },
      { format: 'interstitial', motivated: true },
      { format: 'interstitial', motivated: false },
    ];

    for (const fmt of formatsToTry) {
      try {
        const ads = await widget.requestAd(fmt.format, fmt.motivated);
        if (Array.isArray(ads) && ads.length > 0) {
          widget.displayAd(ads, fmt.format);
          console.log(`[AdManager] ✅ Adexium displayAd() called with '${fmt.format}' format!`);
          adexiumDisplayed = true;
          break;
        }
      } catch (e) {}
    }

    // 1b. If requestAd returned 0 bids, try autoFetchAd()
    if (!adexiumDisplayed) {
      try {
        console.log('[AdManager] Calling Adexium autoFetchAd()...');
        await widget.autoFetchAd();
      } catch (e) {
        console.warn('[AdManager] autoFetchAd error:', e);
      }
    }

    // 1c. Poll for 2.5s to verify if Adexium rendered an ad on screen
    let adSeenOnScreen = false;
    for (let i = 0; i < 12; i++) {
      if (_isAdexiumAdOnScreen()) {
        adSeenOnScreen = true;
        break;
      }
      await new Promise(r => setTimeout(r, 200));
    }

    // IF ADEXIUM AD IS CONFIRMED ON SCREEN:
    // Wait required 15s view duration and RETURN IMMEDIATELY as Adexium.
    // NEVER fall back to GigaPub!
    if (adSeenOnScreen || adexiumDisplayed) {
      console.log('[AdManager] ✅ Adexium ad confirmed on screen! Waiting 15s view duration...');
      await new Promise(r => setTimeout(r, 15000));
      console.log('[AdManager] ✅ Adexium 15s view completed successfully!');
      return { success: true, network: 'adexium' };
    }

    console.warn('[AdManager] ⚠️ Adexium produced no visible ad on screen. Handing off to GigaPub fallback...');
  } else {
    console.warn('[AdManager] ⚠️ Adexium SDK not ready. Handing off to GigaPub fallback...');
  }

  // ── Step 2: GIGAPUB FALLBACK (Only executed if Adexium produced 0 ads) ──
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

  // ── Step 3: No fill from either network ───────────────────────
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
