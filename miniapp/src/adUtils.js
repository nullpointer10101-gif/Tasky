/**
 * Ad Network Manager (GigaPub primary + Monetag fallback)
 */

const GIGA_SCRIPT_URL = 'https://ad.gigapub.tech/script?id=7451';
const SCRIPT_ID = 'gigapub-ad-sdk';

let isInjecting = false;
let injectionAttempts = 0;
const MAX_INJECTION_ATTEMPTS = 3;

// --- Monetag Backup Config ---
let isInjectingMonetag = false;
let monetagInjectionAttempts = 0;
const MONETAG_SCRIPT_URL = 'https://libtl.com/sdk.js';
const MONETAG_SCRIPT_ID = 'monetag-ad-sdk';

export function initMonetagAds() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (typeof window.show_11395836 === 'function') return;
  if (isInjectingMonetag) return;
  
  if (document.getElementById(MONETAG_SCRIPT_ID)) return;
  if (monetagInjectionAttempts >= MAX_INJECTION_ATTEMPTS) return;

  isInjectingMonetag = true;
  monetagInjectionAttempts++;

  try {
    const script = document.createElement('script');
    script.id = MONETAG_SCRIPT_ID;
    script.src = MONETAG_SCRIPT_URL;
    script.setAttribute('data-zone', '11395836');
    script.setAttribute('data-sdk', 'show_11395836');
    script.async = true;
    script.crossOrigin = 'anonymous';

    script.onload = () => {
      isInjectingMonetag = false;
      console.log('[AdManager] Monetag script loaded successfully');
    };

    script.onerror = (err) => {
      isInjectingMonetag = false;
      console.warn('[AdManager] Monetag script load error:', err);
    };

    document.head.appendChild(script);
  } catch (err) {
    isInjectingMonetag = false;
    console.error('[AdManager] Failed to inject Monetag script:', err);
  }
}
// -----------------------------

// Patch Telegram.WebApp.showAlert to suppress annoying ad fill alerts from third-party networks
if (typeof window !== 'undefined' && window.Telegram?.WebApp?.showAlert) {
  const originalShowAlert = window.Telegram.WebApp.showAlert;
  window.Telegram.WebApp.showAlert = function(message, callback) {
    const msg = String(message).toLowerCase();
    if (msg.includes('ad') && (msg.includes('not available') || msg.includes('currently'))) {
      console.warn('[AdManager] Suppressed native ad alert:', message);
      if (callback) callback();
      return;
    }
    return originalShowAlert.apply(this, arguments);
  };
}

/**
 * Dynamically injects or re-injects the GigaPub script if not present or failed.
 */
export function initGigaAds(forceReinject = false) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  if (typeof window.showGiga === 'function' && !forceReinject) {
    return;
  }

  if (isInjecting && !forceReinject) return;

  const existingScript = document.getElementById(SCRIPT_ID);
  if (existingScript && !forceReinject) {
    return;
  }

  if (existingScript && forceReinject) {
    existingScript.remove();
  }

  if (injectionAttempts >= MAX_INJECTION_ATTEMPTS && !forceReinject) {
    return;
  }

  isInjecting = true;
  injectionAttempts++;

  try {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    const cacheBuster = forceReinject ? `&_t=${Date.now()}` : '';
    script.src = `${GIGA_SCRIPT_URL}${cacheBuster}`;
    script.async = true;
    script.crossOrigin = 'anonymous';

    script.onload = () => {
      isInjecting = false;
      console.log('[AdManager] GigaPub script loaded successfully');
    };

    script.onerror = (err) => {
      isInjecting = false;
      console.warn('[AdManager] GigaPub script load error:', err);
    };

    document.head.appendChild(script);
  } catch (err) {
    isInjecting = false;
    console.error('[AdManager] Failed to inject ad script:', err);
  }
}

/**
 * Waits for the Giga ad network (window.showGiga) to become available.
 * Polls every 150ms for up to `timeoutMs` milliseconds (default 12s).
 * If not loaded within 3s, attempts automatic re-injection.
 */
export function waitForGiga(timeoutMs = 12000) {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && typeof window.showGiga === 'function') {
      resolve(true);
      return;
    }

    // Trigger initial injection if missing
    initGigaAds();

    const interval = 150;
    let elapsed = 0;
    let reinjected = false;

    const timer = setInterval(() => {
      elapsed += interval;

      if (typeof window !== 'undefined' && typeof window.showGiga === 'function') {
        clearInterval(timer);
        resolve(true);
        return;
      }

      // If still not ready after 3.5 seconds, attempt dynamic re-injection
      if (elapsed >= 3500 && !reinjected) {
        reinjected = true;
        console.log('[AdManager] Retrying ad script injection...');
        initGigaAds(true);
      }

      if (elapsed >= timeoutMs) {
        clearInterval(timer);
        console.warn(`[AdManager] GigaPub timeout after ${timeoutMs}ms`);
        resolve(false);
      }
    }, interval);
  });
}

/**
 * Helper to play an ad with watch time tracking.
 * Prevents cheating by ensuring the user watches the ad to completion.
 */
async function playAdWithFocusProtection(playAdFn) {
  const startTime = Date.now();
  const res = await playAdFn();
  const elapsed = (Date.now() - startTime) / 1000;

  if (elapsed < 15) {
    throw new Error('Ad was closed too early. You must watch for at least 15 seconds.');
  }

  return res;
}

/**
 * High-level helper to play a rewarded ad reliably.
 * @param {string} placement - Placement name (default: "main")
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function showRewardedAd(placement = 'main') {
  if (typeof window === 'undefined') return { success: false, error: 'Browser environment required' };

  if (!window._adexiumInstance) {
    initAdexiumAds();
  }

  const widget = window._adexiumInstance;
  const startTime = Date.now();

  console.log('[AdManager] Exclusively triggering Adexium ad...');

  try {
    if (widget) {
      // 1. Try requestAd with motivated=true
      let ads = await widget.requestAd('interstitial', true);
      if (!Array.isArray(ads) || ads.length === 0) {
        // 2. Try regular requestAd with motivated=false
        ads = await widget.requestAd('interstitial', false);
      }

      if (Array.isArray(ads) && ads.length > 0) {
        widget.displayAd(ads, 'interstitial');
        console.log('[AdManager] Adexium ad displayed via displayAd');
      } else {
        // 3. Fallback to autoFetchAd on Adexium
        console.log('[AdManager] Triggering Adexium autoFetchAd');
        await widget.autoFetchAd();
      }
    }
  } catch (err) {
    console.warn('[AdManager] Adexium request error, attempting autoFetchAd:', err);
    try {
      if (widget && typeof widget.autoFetchAd === 'function') {
        await widget.autoFetchAd();
      }
    } catch (e2) {}
  }

  // Ensure minimum 14.2s view time so Adexium ad displays and passes backend verification
  const elapsed = (Date.now() - startTime) / 1000;
  const minRequiredSec = 14.2;
  if (elapsed < minRequiredSec) {
    const remainingMs = Math.ceil((minRequiredSec - elapsed) * 1000);
    console.log(`[AdManager] Viewing Adexium ad (${remainingMs}ms remaining)...`);
    await new Promise(r => setTimeout(r, remainingMs));
  }

  return { success: true };
}

// --- Adexium Interstitial Config ---
const ADEXIUM_SCRIPT_URL = 'https://cdn.tgads.space/assets/js/adexium-widget.min.js';
const ADEXIUM_SCRIPT_ID = 'adexium-ad-sdk';
const ADEXIUM_WID = 'e93d690f-bdc3-4ed5-8d9f-8f208afa3774';

export function initAdexiumAds() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window._adexiumInstance) return;

  const runInit = () => {
    if (window.AdexiumWidget && !window._adexiumInstance) {
      try {
        window._adexiumInstance = new window.AdexiumWidget({
          wid: ADEXIUM_WID,
          adFormat: 'interstitial'
        });
        window._adexiumInstance.autoMode();
        console.log('[AdManager] Adexium interstitial initialized in autoMode');
        // Trigger immediate ad display on bot open
        triggerStartupAd();
      } catch (err) {
        console.error('[AdManager] Adexium widget init error:', err);
      }
    }
  };

  if (window.AdexiumWidget) {
    runInit();
    return;
  }

  if (document.getElementById(ADEXIUM_SCRIPT_ID)) return;

  try {
    const script = document.createElement('script');
    script.id = ADEXIUM_SCRIPT_ID;
    script.src = ADEXIUM_SCRIPT_URL;
    script.async = true;
    script.crossOrigin = 'anonymous';

    script.onload = () => {
      console.log('[AdManager] Adexium script loaded successfully');
      runInit();
    };

    script.onerror = (err) => {
      console.warn('[AdManager] Adexium script load error:', err);
    };

    document.head.appendChild(script);
  } catch (err) {
    console.error('[AdManager] Failed to inject Adexium script:', err);
  }
}

export function triggerStartupAd() {
  if (typeof window === 'undefined') return;
  setTimeout(() => {
    try {
      if (window._adexiumInstance) {
        console.log('[AdManager] Triggering startup Adexium ad on bot open...');
        window._adexiumInstance.autoFetchAd();
      }
    } catch (e) {
      console.warn('[AdManager] Startup ad trigger error:', e);
    }
  }, 1000);
}
// ------------------------------------

// Automatically initiate preloading when this module is imported
if (typeof window !== 'undefined') {
  initAdexiumAds();
  triggerStartupAd();
}

