/**
 * Ad Manager — 100% Adexium Exclusive
 *
 * CRITICAL FINDING: Adexium REQUIRES autoMode() to be called during init.
 * autoMode() sets up Adexium's internal bidding pipeline. Without it,
 * requestAd() always returns an empty array regardless of fill availability.
 *
 * Correct flow:
 * 1. init: new AdexiumWidget + autoMode() (sets up bidding)
 * 2. prefetch: autoFetchAd() in background (preloads an ad)
 * 3. on user tap: autoFetchAd() to trigger immediate display
 * 4. detect ad on screen via DOM + wait required view time → credit
 */

const ADEXIUM_SCRIPT_URL = 'https://cdn.tgads.space/assets/js/adexium-widget.min.js';
const ADEXIUM_SCRIPT_ID = 'adexium-ad-sdk';
const ADEXIUM_WID = 'e93d690f-bdc3-4ed5-8d9f-8f208afa3774';

let _initStarted = false;
let _prefetchDone = false;

/**
 * Initialize Adexium SDK with autoMode().
 * autoMode() is REQUIRED — it initializes Adexium's bidding pipeline.
 * Safe to call multiple times.
 */
export function initAdexiumAds() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window._adexiumInstance) return;
  if (_initStarted) return;
  _initStarted = true;

  const runInit = () => {
    if (window.AdexiumWidget && !window._adexiumInstance) {
      try {
        window._adexiumInstance = new window.AdexiumWidget({ wid: ADEXIUM_WID });
        // REQUIRED: autoMode initializes Adexium's internal bidding pipeline
        window._adexiumInstance.autoMode();
        console.log('[AdManager] ✅ Adexium initialized with autoMode (bidding pipeline active)');
        // Prefetch an ad into Adexium's internal queue
        setTimeout(_prefetchBackground, 1000);
      } catch (err) {
        _initStarted = false;
        console.error('[AdManager] Adexium init error:', err);
      }
    }
  };

  if (window.AdexiumWidget) {
    runInit();
    return;
  }

  if (document.getElementById(ADEXIUM_SCRIPT_ID)) {
    const poll = setInterval(() => {
      if (window.AdexiumWidget) { clearInterval(poll); runInit(); }
    }, 100);
    setTimeout(() => clearInterval(poll), 12000);
    return;
  }

  // Inject script as fallback
  try {
    const script = document.createElement('script');
    script.id = ADEXIUM_SCRIPT_ID;
    script.src = ADEXIUM_SCRIPT_URL;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => { console.log('[AdManager] SDK loaded'); runInit(); };
    script.onerror = () => { _initStarted = false; console.warn('[AdManager] SDK load failed'); };
    document.head.appendChild(script);
  } catch (err) {
    _initStarted = false;
    console.error('[AdManager] Script inject failed:', err);
  }
}

/**
 * Pre-fetch an ad in the background so it's ready when user taps.
 */
async function _prefetchBackground() {
  const widget = window._adexiumInstance;
  if (!widget || _prefetchDone) return;
  try {
    console.log('[AdManager] Pre-fetching ad into Adexium queue...');
    await widget.autoFetchAd();
    _prefetchDone = true;
    console.log('[AdManager] ✅ Ad pre-fetched into queue');
  } catch (e) {
    console.warn('[AdManager] Prefetch error:', e);
  }
}

/**
 * Call when Gram page loads to warm up the ad queue.
 */
export function prefetchGramAd() {
  if (!window._adexiumInstance) {
    initAdexiumAds();
    setTimeout(_prefetchBackground, 1500);
  } else {
    _prefetchBackground();
  }
}

/**
 * Show a rewarded Adexium ad.
 *
 * Uses autoFetchAd() to trigger Adexium's internal ad display,
 * then detects the ad overlay on screen via MutationObserver.
 * Only credits user when a real ad is visually confirmed on screen.
 *
 * @param {string} placement
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function showRewardedAd(placement = 'main') {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Browser environment required' };
  }

  // Ensure initialized
  if (!window._adexiumInstance) {
    initAdexiumAds();
    let w = 0;
    while (!window._adexiumInstance && w < 5000) {
      await new Promise(r => setTimeout(r, 200));
      w += 200;
    }
  }

  const widget = window._adexiumInstance;
  if (!widget) {
    return { success: false, error: 'Ad provider not ready. Please refresh and try again.' };
  }

  console.log(`[AdManager] Triggering Adexium ad (placement: ${placement})...`);

  // Trigger ad display via autoFetchAd
  try {
    await widget.autoFetchAd();
    console.log('[AdManager] autoFetchAd() called — waiting for ad to appear on screen...');
  } catch (e) {
    console.warn('[AdManager] autoFetchAd error:', e);
    return { success: false, error: 'Ad network error. Please try again.' };
  }

  // Detect ad overlay appearing in DOM (confirms real ad rendered on screen)
  const adShown = await new Promise(resolve => {
    let detected = false;
    let viewTimer = null;

    // Adexium renders a full-screen overlay — detect any new full-screen element
    const checkVisible = () => {
      const allDivs = document.querySelectorAll('div, iframe, section');
      for (const el of allDivs) {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        if (
          rect.width > window.innerWidth * 0.7 &&
          rect.height > window.innerHeight * 0.7 &&
          (style.position === 'fixed' || style.position === 'absolute') &&
          style.zIndex !== 'auto' &&
          parseInt(style.zIndex) > 100 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          el.id !== 'root' // exclude our app root
        ) {
          return true;
        }
      }
      return false;
    };

    const onDetected = () => {
      if (detected) return;
      detected = true;
      console.log('[AdManager] ✅ Ad overlay detected on screen — starting view timer...');
      observer.disconnect();
      // Wait 15s view time from when ad appears
      viewTimer = setTimeout(() => {
        console.log('[AdManager] ✅ 15s view complete — crediting user');
        resolve(true);
      }, 15000);
    };

    // Check immediately (ad might already be visible)
    if (checkVisible()) { onDetected(); return; }

    const observer = new MutationObserver(() => {
      if (!detected && checkVisible()) onDetected();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    // Give 8 seconds for the ad to appear on screen
    setTimeout(() => {
      if (!detected) {
        observer.disconnect();
        if (viewTimer) clearTimeout(viewTimer);
        console.warn('[AdManager] ⚠️ No ad overlay appeared within 8s');
        resolve(false);
      }
    }, 8000);
  });

  // Pre-fetch next ad while processing result
  _prefetchDone = false;
  setTimeout(_prefetchBackground, 1000);

  if (!adShown) {
    return {
      success: false,
      error: 'No ad available right now. Please try again in a moment.',
    };
  }

  return { success: true };
}

// Backwards-compat stubs
export function initGigaAds() {}
export function initMonetagAds() {}
export function waitForGiga() { return Promise.resolve(false); }
export function triggerStartupAd() {}
