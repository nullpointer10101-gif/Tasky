/**
 * Ad Manager — Permanent Primary Ad Provider: GigaPub (Unit 7451)
 */

const GIGAPUB_SCRIPT_URL = 'https://ad.gigapub.tech/script?id=7451';
const GIGAPUB_SCRIPT_ID  = 'gigapub-ad-sdk';

/**
 * Initializes the GigaPub Ad SDK script
 */
export function initGigaAds() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!document.getElementById(GIGAPUB_SCRIPT_ID)) {
    try {
      const s = document.createElement('script');
      s.id = GIGAPUB_SCRIPT_ID;
      s.src = GIGAPUB_SCRIPT_URL;
      s.async = true;
      document.head.appendChild(s);
      console.log('[AdManager] 🚀 Initialized GigaPub primary ad SDK (Unit 7451)');
    } catch (e) {
      console.error('[AdManager] GigaPub script injection error:', e);
    }
  }
}

export function prefetchGramAd() {
  initGigaAds();
}

/**
 * Helper to check if an ad overlay / iframe is currently on screen
 */
function _isAdOnScreen() {
  if (typeof document === 'undefined') return false;

  const adSelectors = [
    'iframe[src*="gigapub"]',
    'iframe[src*="ad"]',
    '[class*="gigapub"]',
    '[id*="gigapub"]',
    '#gigapub'
  ];
  for (const sel of adSelectors) {
    const el = document.querySelector(sel);
    if (el) {
      const style = window.getComputedStyle(el);
      if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
        return true;
      }
    }
  }

  const allElements = document.querySelectorAll('body > div:not(#root), body > iframe, body > section, body > dialog');
  for (const el of allElements) {
    if (el.id === 'root') continue;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    if (
      rect.width > 180 && rect.height > 150 &&
      (style.position === 'fixed' || style.position === 'absolute') &&
      style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Executes a GigaPub rewarded ad session.
 * 
 * @param {string} placement
 * @param {Object} [options]
 * @returns {Promise<{ success: boolean, network: 'gigapub', error?: string }>}
 */
export async function showRewardedAd(placement = 'main', options = {}) {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Browser environment required' };
  }

  // Ensure Telegram WebApp is ready
  try {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
    }
  } catch(e) {}

  initGigaAds();

  // Wait for GigaPub SDK to attach trigger function
  let waited = 0;
  while (!window.showGiga && !window.showGigaPubAd && !window.showGigaAd && !window.GigaPub && waited < 4000) {
    await new Promise(r => setTimeout(r, 150));
    waited += 150;
  }

  const startTime = Date.now();

  try {
    const fn = window.showGiga || window.showGigaPubAd || window.showGigaAd || (window.GigaPub && (window.GigaPub.showAd || window.GigaPub.show)) || window.showAd;

    if (typeof fn === 'function') {
      console.log(`[AdManager] 🚀 Executing GigaPub rewarded ad (Placement: ${placement})...`);
      fn.call(window.GigaPub || window);

      // Wait up to 15 seconds for ad display and user watch duration
      let adDetected = false;
      for (let s = 0; s < 50; s++) {
        await new Promise(r => setTimeout(r, 300));
        const elapsedSec = (Date.now() - startTime) / 1000;

        if (_isAdOnScreen()) {
          adDetected = true;
        }

        // Complete after 15s watch floor or once ad finished
        if (elapsedSec >= 15 || (adDetected && elapsedSec >= 10 && !_isAdOnScreen())) {
          console.log(`[AdManager] ✅ GigaPub ad completed successfully! (${elapsedSec.toFixed(1)}s)`);
          break;
        }
      }

      return { success: true, network: 'gigapub' };
    }
  } catch (err) {
    console.error('[AdManager] GigaPub ad execution error:', err);
  }

  // Fallback retry if function wasn't immediately attached
  try {
    if (window.GigaPub && typeof window.GigaPub.show === 'function') {
      window.GigaPub.show();
      await new Promise(r => setTimeout(r, 12000));
      return { success: true, network: 'gigapub' };
    }
  } catch(e) {}

  return {
    success: false,
    network: 'gigapub',
    error: 'No GigaPub ads available right now. Please try again in a moment.'
  };
}

export async function showGigaPubAdFallback() {
  return await showRewardedAd('fallback');
}

/**
 * Triggers a GigaPub startup ad on opening the Mini App
 */
export function triggerStartupAd() {
  if (typeof window === 'undefined') return;
  initGigaAds();

  setTimeout(async () => {
    console.log('[AdManager] 🚀 Triggering GigaPub startup ad...');
    try {
      await showRewardedAd('startup');
    } catch(e) {
      console.warn('[AdManager] Startup ad error:', e);
    }
  }, 1200);
}

let _periodicLoopStarted = false;

export function startPeriodicAdLoop() {
  if (typeof window === 'undefined' || _periodicLoopStarted) return;
  _periodicLoopStarted = true;

  console.log('[AdManager] 🚀 Starting periodic GigaPub ad loop (~110s interval)...');

  setInterval(async () => {
    try {
      if (document.hidden) return;
      console.log('[AdManager] ⏰ Periodic GigaPub ad check...');
      await showRewardedAd('periodic');
    } catch(e) {}
  }, 110000);
}

// Backwards compatibility stubs
export function initAdexiumAds() {}
export function initMonetagAds() {}
export function waitForGiga() { return Promise.resolve(true); }
