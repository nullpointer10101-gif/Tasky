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

// Auto-initialize GigaPub immediately on module load
initGigaAds();

// Block Adsgram script injection completely so only GigaPub Direct and Monetag run
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // Prevent any Adsgram script tags from being added
  const origAppendChild = document.head.appendChild.bind(document.head);
  document.head.appendChild = function(node) {
    if (node && node.tagName === 'SCRIPT' && node.src && node.src.includes('adsgram')) {
      console.log('[AdManager] 🚫 Adsgram script blocked from loading');
      return node;
    }
    return origAppendChild(node);
  };

  const origInsertBefore = document.head.insertBefore.bind(document.head);
  document.head.insertBefore = function(node, ref) {
    if (node && node.tagName === 'SCRIPT' && node.src && node.src.includes('adsgram')) {
      console.log('[AdManager] 🚫 Adsgram script blocked from insertion');
      return node;
    }
    return origInsertBefore(node, ref);
  };

  // Block Adsgram global object
  try {
    Object.defineProperty(window, 'Adsgram', {
      get: () => undefined,
      set: () => {},
      configurable: false
    });
  } catch(e) {}

  // Auto-remove any Adsgram dialogs if dynamically rendered
  setInterval(() => {
    try {
      const dialogs = document.querySelectorAll('div, section, dialog');
      for (const el of dialogs) {
        if (el.textContent && el.textContent.includes('AdsgramError')) {
          el.remove();
        }
      }
    } catch (e) {}
  }, 500);
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

  const getFn = () => window.showGiga || window.showGigaPubAd || window.showGigaAd || (window.GigaPub && (window.GigaPub.showAd || window.GigaPub.show)) || window.showAd;

  // Wait up to 7 seconds for GigaPub SDK to attach trigger function
  let waited = 0;
  while (!getFn() && waited < 7000) {
    await new Promise(r => setTimeout(r, 150));
    waited += 150;
  }

  let fn = getFn();
  if (typeof fn !== 'function') {
    // If still not available, try to re-inject the script once
    const oldScript = document.getElementById(GIGAPUB_SCRIPT_ID);
    if (oldScript) oldScript.remove();
    initGigaAds();
    await new Promise(r => setTimeout(r, 1200));
    fn = getFn();
  }

  if (typeof fn !== 'function') {
    console.warn('[AdManager] GigaPub SDK not available after wait');
    return {
      success: false,
      network: 'gigapub',
      error: 'Ad is loading from sponsor network. Please tap again in a moment!'
    };
  }

  const startTime = Date.now();

  try {
    console.log(`[AdManager] 🚀 Executing GigaPub rewarded ad (Placement: ${placement})...`);
    
    // Call showGiga with a 30s timeout guard
    const adExecutionPromise = Promise.resolve().then(() => {
      return fn.call(window.GigaPub || window, placement);
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Ad session timeout')), 30000);
    });

    // Await GigaPub ad completion
    await Promise.race([adExecutionPromise, timeoutPromise]);

    const elapsed = (Date.now() - startTime) / 1000;
    // Rewarded video ads must last at least 14.0 seconds
    if (elapsed < 14.0) {
      console.warn(`[AdManager] Ad closed too early: only ${elapsed.toFixed(1)}s elapsed.`);
      return {
        success: false,
        network: 'gigapub',
        error: 'Ad was closed early. You must watch the entire video ad to get progress.'
      };
    }

    console.log(`[AdManager] ✅ GigaPub ad session completed successfully! (${elapsed.toFixed(1)}s)`);
    return { success: true, network: 'gigapub' };
  } catch (err) {
    console.error('[AdManager] GigaPub ad closed early or failed:', err);

    const errMsg = err?.message || '';
    if (errMsg.includes('already showing')) {
      return { success: false, network: 'gigapub', error: 'An ad is already in progress. Please wait a moment.' };
    }
    if (errMsg.includes('timeout')) {
      return { success: false, network: 'gigapub', error: 'Ad network took too long. Please tap to try again.' };
    }

    return {
      success: false,
      network: 'gigapub',
      error: 'Ad was closed early or skipped. Please watch the entire ad to completion!'
    };
  }
}

export async function showGigaPubAdFallback() {
  return await showRewardedAd('fallback');
}

/**
 * Startup and periodic automatic ads are completely disabled.
 * Ads are only shown when user explicitly taps a watch ad button.
 */
export function triggerStartupAd() {
  // Disabled: No automatic startup ads
}

export function startPeriodicAdLoop() {
  // Disabled: No automatic periodic popup ads
}

const MONETAG_ZONE_ID = '11395836';
const MONETAG_SDK_FN = 'show_11395836';

/**
 * Initializes the Monetag Ad SDK script dynamically if not present
 */
export function initMonetagAds() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!document.getElementById('monetag-ad-sdk')) {
    try {
      const s = document.createElement('script');
      s.id = 'monetag-ad-sdk';
      s.src = 'https://libtl.com/sdk.js';
      s.setAttribute('data-zone', MONETAG_ZONE_ID);
      s.setAttribute('data-sdk', MONETAG_SDK_FN);
      s.async = true;
      document.head.appendChild(s);
      console.log('[AdManager] 🚀 Initialized Monetag ad SDK (Zone 11395836)');
    } catch (e) {
      console.error('[AdManager] Monetag script injection error:', e);
    }
  }
}

// Auto-initialize Monetag
initMonetagAds();

/**
 * Executes a Monetag rewarded interstitial ad session using show_11395836()
 */
export async function showMonetagAd() {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Browser environment required' };
  }

  try {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
    }
  } catch(e) {}

  initMonetagAds();

  // Wait up to 5 seconds for Monetag SDK to attach trigger function
  let waited = 0;
  while (typeof window[MONETAG_SDK_FN] !== 'function' && typeof window.show_11395836 !== 'function' && waited < 5000) {
    await new Promise(r => setTimeout(r, 150));
    waited += 150;
  }

  const fn = window[MONETAG_SDK_FN] || window.show_11395836;
  if (typeof fn !== 'function') {
    console.warn('[AdManager] Monetag SDK not available after wait');
    return {
      success: false,
      network: 'monetag',
      error: 'Monetag ad network is loading. Please try again in a moment.'
    };
  }

  const startTime = Date.now();

  try {
    console.log('[AdManager] 🚀 Executing Monetag rewarded interstitial (show_11395836)...');

    // Monetag returns a promise that resolves when the user finishes viewing the rewarded ad
    await fn();

    const elapsed = (Date.now() - startTime) / 1000;
    console.log(`[AdManager] ✅ Monetag rewarded interstitial completed! (${elapsed.toFixed(1)}s)`);
    return { success: true, network: 'monetag' };
  } catch (err) {
    console.error('[AdManager] Monetag ad execution error / closed:', err);

    return {
      success: false,
      network: 'monetag',
      error: 'Monetag ad was closed early or skipped. You must watch the entire ad to completion!'
    };
  }
}

// Backwards compatibility stubs
export function initAdexiumAds() {}
export function waitForGiga() { return Promise.resolve(true); }

