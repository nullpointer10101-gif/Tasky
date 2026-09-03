/**
 * Ad Manager — Guaranteed Adexium Priority + GigaPub Fallback
 *
 * Configured for Adexium Push-like / Interstitial / Rewarded formats.
 *
 * Flow:
 * 1. Initialize Adexium instance with wid & adFormat ('push-like').
 * 2. On Watch Ad:
 *    - Query Adexium requestAd('push-like', true / false)
 *    - Query Adexium requestAd('push', true / false)
 *    - Query Adexium requestAd('interstitial', true / false)
 *    - Query Adexium requestAd('rewarded', true / false)
 * 3. IF ANY format returns >0 bids:
 *    - Call displayAd(ads, format)
 *    - Wait 15s view duration
 *    - Return { success: true, network: 'adexium' } IMMEDIATELY.
 * 4. ONLY IF ALL Adexium formats return 0 bids:
 *    - Fallback to GigaPub window.showGiga()
 *    - Return { success: true, network: 'gigapub' } upon completion.
 * 5. IF neither network serves an ad -> return { success: false } — NO fake rewards!
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
          console.log('[AdManager] ✅ Adexium SDK initialized (push-like format)');
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
    console.log('[AdManager] 🎯 Querying Adexium for ad bids (push-like / interstitial / rewarded)...');

    let adexiumAds = null;
    let formatUsed = 'push-like';

    // Format attempts in priority order:
    const formatsToTry = [
      { format: 'push-like', motivated: true },
      { format: 'push-like', motivated: false },
      { format: 'push', motivated: true },
      { format: 'push', motivated: false },
      { format: 'interstitial', motivated: true },
      { format: 'interstitial', motivated: false },
      { format: 'rewarded', motivated: true }
    ];

    for (const fmt of formatsToTry) {
      try {
        const ads = await widget.requestAd(fmt.format, fmt.motivated);
        if (Array.isArray(ads) && ads.length > 0) {
          adexiumAds = ads;
          formatUsed = fmt.format;
          console.log(`[AdManager] ✅ Found Adexium bids for format '${fmt.format}' (motivated: ${fmt.motivated})!`);
          break;
        }
      } catch (e) {
        // Continue trying next format
      }
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

    console.warn('[AdManager] ⚠️ Adexium returned 0 bids across all formats. Switching to GigaPub fallback...');
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
