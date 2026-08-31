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

  if (elapsed < 6) {
    throw new Error('Ad was closed too early.');
  }

  return res;
}

/**
 * High-level helper to play a rewarded ad reliably.
 * @param {string} placement - Placement name (default: "main")
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function showRewardedAd(placement = 'main') {
  const tryGiga = async () => {
    if (typeof window !== 'undefined' && typeof window.showGiga === 'function') {
      console.log('[AdManager] Trying GigaPub...');
      await playAdWithFocusProtection(async () => {
        await Promise.race([
          window.showGiga(placement),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Ad network timeout')), 60000))
        ]);
      });
      return { success: true };
    }
    throw new Error('GigaPub not available');
  };

  const tryMonetag = async () => {
    if (typeof window !== 'undefined' && typeof window.show_11395836 === 'function') {
      console.log('[AdManager] Trying Monetag fallback (Zone 11395836)...');
      const res = await playAdWithFocusProtection(async () => {
        return await Promise.race([
          window.show_11395836(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Monetag timeout')), 60000))
        ]);
      });
      if (res && (res.reward_event_type === 'cancelled' || res.reward_event_type === 'closed' || res.status === 'error')) {
        throw new Error('Ad was closed early');
      }
      return { success: true };
    }
    throw new Error('Monetag not available');
  };

  try {
    // 1. Try GigaPub (primary)
    try {
      return await tryGiga();
    } catch (err) {
      const errMsg = String(err?.message || err || '');
      if (errMsg.includes('not available')) {
        console.warn('[AdManager] GigaPub not available, trying Monetag fallback...');
      } else {
        // Ad started playing but was closed early — do NOT fall through
        throw err;
      }
    }

    // 2. Try Monetag as fallback
    try {
      return await tryMonetag();
    } catch (monetagErr) {
      const errMsg = String(monetagErr?.message || monetagErr || '');
      if (!errMsg.includes('not available')) {
        throw monetagErr;
      }
      console.warn('[AdManager] Monetag not available either.');
    }

    // 3. Wait up to 4 seconds for GigaPub or Monetag to load
    let elapsed = 0;
    const isReady = await new Promise(resolve => {
      const interval = setInterval(() => {
        elapsed += 150;
        if (
          (typeof window !== 'undefined' && typeof window.showGiga === 'function') ||
          (typeof window.show_11395836 === 'function')
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
        return await tryGiga();
      } catch (e) {
        const errMsg = String(e?.message || e || '');
        if (errMsg.includes('not available')) {
          try {
            return await tryMonetag();
          } catch (e2) {
            // fall through
          }
        } else {
          throw e;
        }
      }
    }

    return {
      success: false,
      error: 'Ad is loading. Please check your connection and tap again in a moment.'
    };
  } catch (err) {
    console.error('[AdManager] Ad playback error:', err);
    const errMsg = String(err?.message || err || '');
    if (
      errMsg.toLowerCase().includes('closed') ||
      errMsg.toLowerCase().includes('skip') ||
      errMsg.toLowerCase().includes('cancel') ||
      errMsg.toLowerCase().includes('interrupted')
    ) {
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
  initGigaAds();
  initMonetagAds();
}
