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

export function prefetchGramAd() {
  initGigaAds();
}

/**
 * Executes a GigaPub rewarded ad session using window.showGiga()
 * Used for both Option 1 (Monetag UI slot) and Option 2 (GigaPub UI slot)
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

  // Wait up to 5 seconds for GigaPub SDK to attach trigger function
  let waited = 0;
  while (!getFn() && waited < 5000) {
    await new Promise(r => setTimeout(r, 150));
    waited += 150;
  }

  const fn = getFn();
  if (typeof fn !== 'function') {
    console.warn('[AdManager] GigaPub SDK unit 8093 not attached yet.');
    initGigaAds();
    return {
      success: false,
      network: 'gigapub',
      error: 'Ad sponsor is connecting. Please tap again to watch.'
    };
  }

  const startTime = Date.now();

  try {
    console.log(`[AdManager] 🚀 Executing GigaPub rewarded ad (Unit 8093, Placement: ${placement})...`);
    
    // Call window.showGiga() as officially specified
    await fn.call(window.GigaPub || window);

    const elapsed = (Date.now() - startTime) / 1000;
    console.log(`[AdManager] ✅ GigaPub ad completed successfully! (${elapsed.toFixed(1)}s)`);
    return { success: true, network: 'gigapub' };
  } catch (err) {
    console.warn('[AdManager] GigaPub ad session caught:', err);
    const errMessage = String(err?.message || err || '').toLowerCase();
    const elapsed = (Date.now() - startTime) / 1000;
    
    if (errMessage.includes('cancel') || errMessage.includes('close') || errMessage.includes('skip') || errMessage.includes('dismiss')) {
      return {
        success: false,
        network: 'gigapub',
        error: 'Ad was closed early. Please watch the ad to get progress.'
      };
    }

    // If ad was viewed for at least 3 seconds before ending/closing
    if (elapsed >= 3.0) {
      console.log(`[AdManager] Ad was viewed for ${elapsed.toFixed(1)}s. Resolving as fulfilled.`);
      return { success: true, network: 'gigapub' };
    }

    return {
      success: false,
      network: 'gigapub',
      error: 'Ad session was closed early. Please tap again to watch.'
    };
  }
}

export async function showGigaPubAdFallback() {
  return await showRewardedAd('fallback');
}

export function triggerStartupAd() {
  // Disabled
}

export function startPeriodicAdLoop() {
  // Disabled
}

export function initMonetagAds() {
  initGigaAds();
}

/**
 * Executes a Monetag ad session (powered seamlessly by GigaPub Unit 8093 under the hood)
 * In the UI it represents Option 1 (Monetag), but uses high-fill GigaPub engine.
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

  initGigaAds();

  console.log('[AdManager] 🚀 Executing Monetag ad slot via GigaPub engine (Unit 8093)...');
  const res = await showRewardedAd('monetag_slot');
  if (res.success) {
    return { success: true, network: 'monetag' };
  }
  return {
    success: false,
    network: 'monetag',
    error: res.error || 'Ad was closed early. You must watch the entire ad to get progress.'
  };
}

export function waitForGiga() { return Promise.resolve(true); }
