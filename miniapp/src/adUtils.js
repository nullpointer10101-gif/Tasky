/**
 * Ad Manager
 * - Option 1: Monetag (Zone 11395836)
 * - Option 2: GigaPub (Unit 8093) via window.showGiga()
 */

const GIGAPUB_SCRIPT_URL = 'https://ad.gigapub.tech/script?id=8093';
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
      s.async = false;
      document.head.appendChild(s);
      console.log('[AdManager] 🚀 Initialized GigaPub ad SDK (Unit 8093)');
    } catch (e) {
      console.error('[AdManager] GigaPub script injection error:', e);
    }
  }
}

// Auto-initialize GigaPub immediately on module load
initGigaAds();

// Block Adsgram script injection completely
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const origAppendChild = document.head.appendChild.bind(document.head);
  document.head.appendChild = function(node) {
    if (node && node.tagName === 'SCRIPT' && node.src && node.src.includes('adsgram')) {
      console.log('[AdManager] 🚫 Adsgram script blocked');
      return node;
    }
    return origAppendChild(node);
  };

  const origInsertBefore = document.head.insertBefore.bind(document.head);
  document.head.insertBefore = function(node, ref) {
    if (node && node.tagName === 'SCRIPT' && node.src && node.src.includes('adsgram')) {
      console.log('[AdManager] 🚫 Adsgram script blocked');
      return node;
    }
    return origInsertBefore(node, ref);
  };

  try {
    Object.defineProperty(window, 'Adsgram', {
      get: () => undefined,
      set: () => {},
      configurable: false
    });
  } catch(e) {}
}

export function prefetchGramAd() {
  initGigaAds();
}

/**
 * Executes a GigaPub rewarded ad session using window.showGiga()
 * Used strictly for Option 2 / Primary GigaPub tasks
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

  const getFn = () => window.showGiga || window.showGigaPubAd || window.showGigaAd || (window.GigaPub && (window.GigaPub.showAd || window.GigaPub.show)) || window.showAd;

  // Wait up to 3.5 seconds for GigaPub SDK to attach trigger function
  let waited = 0;
  while (!getFn() && waited < 3500) {
    await new Promise(r => setTimeout(r, 150));
    waited += 150;
  }

  const fn = getFn();
  if (typeof fn !== 'function') {
    console.warn('[AdManager] GigaPub SDK unit 8093 not attached yet.');
    return {
      success: false,
      network: 'gigapub',
      error: 'GigaPub ad network is loading. Please tap again in a moment.'
    };
  }

  const startTime = Date.now();

  try {
    console.log(`[AdManager] 🚀 Executing GigaPub rewarded ad (Unit 8093, Placement: ${placement})...`);
    
    // Call window.showGiga() as officially specified
    const adExecutionPromise = Promise.resolve().then(() => {
      return fn.call(window.GigaPub || window);
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Ad session timeout')), 45000);
    });

    // Await GigaPub ad completion
    await Promise.race([adExecutionPromise, timeoutPromise]);

    const elapsed = (Date.now() - startTime) / 1000;
    console.log(`[AdManager] ✅ GigaPub ad completed successfully! (${elapsed.toFixed(1)}s)`);
    return { success: true, network: 'gigapub' };
  } catch (err) {
    console.warn('[AdManager] GigaPub ad session caught:', err);
    const errMessage = String(err?.message || err || '').toLowerCase();
    
    if (errMessage.includes('cancel') || errMessage.includes('close') || errMessage.includes('skip') || errMessage.includes('dismiss') || errMessage.includes('early')) {
      return {
        success: false,
        network: 'gigapub',
        error: 'Ad was closed early. You must watch the entire GigaPub ad to get progress.'
      };
    }

    return {
      success: false,
      network: 'gigapub',
      error: 'GigaPub ad was closed early or unfulfilled. Please tap again to watch.'
    };
  }
}

export async function showGigaPubAdFallback() {
  return await showRewardedAd('fallback');
}

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
 * Used strictly for Option 1
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

export function waitForGiga() { return Promise.resolve(true); }
