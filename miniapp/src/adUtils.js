/**
 * Comprehensive & Resilient Ad Network Manager (OnClickA + Monetag + GigaPub Fallbacks)
 */

// --- OnClickA Config ---
// ⚠️ REPLACE THIS WITH YOUR ONCLICKA SPOT ID (e.g. 504287)
export const ONCLICKA_SPOT_ID = 458471; 
const ONCLICKA_SCRIPT_URL = 'https://js.onclckvd.com/in-stream-ad-admanager/tma.js';
const ONCLICKA_SCRIPT_ID = 'onclicka-ad-sdk';

let isInjectingOnClickA = false;
let onclickaInjectionAttempts = 0;

export function initOnClickAAds() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (typeof window.showOnClickA === 'function') return;
  if (isInjectingOnClickA) return;
  
  if (document.getElementById(ONCLICKA_SCRIPT_ID)) return;
  if (onclickaInjectionAttempts >= MAX_INJECTION_ATTEMPTS) return;

  isInjectingOnClickA = true;
  onclickaInjectionAttempts++;

  try {
    const script = document.createElement('script');
    script.id = ONCLICKA_SCRIPT_ID;
    script.src = ONCLICKA_SCRIPT_URL;
    script.async = true;

    script.onload = () => {
      isInjectingOnClickA = false;
      console.log('[AdManager] OnClickA script loaded successfully');
      if (typeof window.initCdTma === 'function') {
        window.initCdTma({ id: ONCLICKA_SPOT_ID })
          .then(show => {
            window.showOnClickA = show;
            console.log('[AdManager] OnClickA ad engine initialized successfully');
          })
          .catch(err => {
            console.warn('[AdManager] OnClickA initialization failed:', err);
          });
      }
    };

    script.onerror = (err) => {
      isInjectingOnClickA = false;
      console.warn('[AdManager] OnClickA script load error:', err);
    };

    document.head.appendChild(script);
  } catch (err) {
    isInjectingOnClickA = false;
    console.error('[AdManager] Failed to inject OnClickA script:', err);
  }
}
// -----------------------

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
 * High-level helper to play a rewarded ad reliably.
 * @param {string} placement - Placement name (default: "main")
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function showRewardedAd(placement = 'main') {
  const tryOnClickA = async () => {
    if (typeof window !== 'undefined' && typeof window.showOnClickA === 'function') {
      console.log('[AdManager] Trying OnClickA...');
      const startTime = Date.now();
      await Promise.race([
        window.showOnClickA(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('OnClickA timeout')), 60000))
      ]);
      const elapsed = (Date.now() - startTime) / 1000;
      console.log(`[AdManager] OnClickA completed in ${elapsed.toFixed(1)}s`);
      if (elapsed < 12) {
        throw new Error('Ad was closed early');
      }
      return { success: true };
    }
    throw new Error('OnClickA not available');
  };

  const tryMonetag = async () => {
    if (typeof window !== 'undefined' && typeof window.show_11395836 === 'function') {
      console.log('[AdManager] Trying Monetag fallback...');
      const startTime = Date.now();
      const res = await Promise.race([
        window.show_11395836(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Monetag timeout')), 60000))
      ]);
      const elapsed = (Date.now() - startTime) / 1000;
      console.log(`[AdManager] Monetag completed in ${elapsed.toFixed(1)}s. Result:`, res);
      if (!res || res.reward_event_type !== 'valued' || elapsed < 12) {
        throw new Error('Ad was closed early or not valued');
      }
      return { success: true };
    }
    throw new Error('Monetag not available');
  };

  const tryGiga = async () => {
    if (typeof window !== 'undefined' && typeof window.showGiga === 'function') {
      console.log('[AdManager] Trying GigaPub...');
      await Promise.race([
        window.showGiga(placement),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Ad network timeout')), 60000))
      ]);
      return { success: true };
    }
    throw new Error('GigaPub not available');
  };

  try {
    // 1. Try OnClickA first (primary network)
    try {
      return await tryOnClickA();
    } catch (onClickAErr) {
      console.warn('[AdManager] OnClickA failed/not ready, trying GigaPub...', onClickAErr);
    }

    // 2. Try GigaPub second
    try {
      return await tryGiga();
    } catch (gigaErr) {
      console.warn('[AdManager] GigaPub failed/not ready, trying Monetag as fallback...', gigaErr);
    }

    // 3. Try Monetag as a last resort
    try {
      return await tryMonetag();
    } catch (monetagErr) {
      console.warn('[AdManager] Monetag fallback failed, waiting for ad load...', monetagErr);
    }

    // 4. If all are not loaded, wait up to 4 seconds for OnClickA/Monetag/GigaPub
    let elapsed = 0;
    const isReady = await new Promise(resolve => {
      const interval = setInterval(() => {
        elapsed += 150;
        if (
          (typeof window !== 'undefined' && typeof window.showOnClickA === 'function') ||
          (typeof window.show_11395836 === 'function') ||
          (typeof window.showGiga === 'function')
        ) {
          clearInterval(interval);
          resolve(true);
        } else if (elapsed >= 4000) {
          clearInterval(interval);
          resolve(false);
        }
      }, 150);
    });

    if (isReady) {
      try {
        return await tryOnClickA();
      } catch (e) {
        try {
          return await tryGiga();
        } catch (e2) {
          try {
            return await tryMonetag();
          } catch (e3) {
            // fall through to error
          }
        }
      }
    }

    return {
      success: false,
      error: 'Ad is loading. Please check your connection and tap again in a moment.'
    };
  } catch (err) {
    console.error('[AdManager] Ad playback error:', err);
    
    // Check if user skipped or closed early
    const errMsg = String(err?.message || err || '');
    if (errMsg.toLowerCase().includes('closed') || errMsg.toLowerCase().includes('skip') || errMsg.toLowerCase().includes('cancel')) {
      return {
        success: false,
        error: 'You must watch the entire ad to receive credit.'
      };
    }

    return {
      success: false,
      error: 'You must watch the entire ad to get the reward.'
    };
  }
}

// Automatically initiate preloading when this module is imported
if (typeof window !== 'undefined') {
  initOnClickAAds();
  initGigaAds();
  initMonetagAds();
}
