/**
 * Comprehensive & Resilient Ad Network Manager (GigaPub + Auto-loader + Dynamic Recovery)
 */

const GIGA_SCRIPT_URL = 'https://ad.gigapub.tech/script?id=7451';
const SCRIPT_ID = 'gigapub-ad-sdk';

let isInjecting = false;
let injectionAttempts = 0;
const MAX_INJECTION_ATTEMPTS = 3;

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
  try {
    const isReady = await waitForGiga(12000);

    if (!isReady || typeof window.showGiga !== 'function') {
      return {
        success: false,
        error: 'Ad network is loading. Please check your connection and tap again in a moment.'
      };
    }

    // Call the rewarded ad method
    await window.showGiga(placement);

    return { success: true };
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
  initGigaAds();
}
