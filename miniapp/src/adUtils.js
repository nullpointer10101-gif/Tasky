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

  // Immediate check or ultra-fast poll (every 30ms up to 2.5s)
  let fn = getFn();
  if (typeof fn !== 'function') {
    let waited = 0;
    while (!getFn() && waited < 2500) {
      await new Promise(r => setTimeout(r, 30));
      waited += 30;
    }
    fn = getFn();
  }

  if (typeof fn !== 'function') {
    console.warn('[AdManager] GigaPub SDK unit 8093 not attached yet.');
    initGigaAds();
    return {
      success: false,
      network: 'gigapub',
      error: 'Ad network is warming up. Please tap again to start instantly!'
    };
  }

  const startTime = Date.now();

  try {
    console.log(`[AdManager] 🚀 Executing GigaPub rewarded ad (Unit 8093, Placement: ${placement})...`);
    
    // Call window.showGiga() as officially specified
    const result = await fn.call(window.GigaPub || window);
    const elapsed = (Date.now() - startTime) / 1000;
    console.log(`[AdManager] GigaPub returned:`, result, `Elapsed: ${elapsed.toFixed(1)}s`);

    // Strict validation: Must not return false, cancelled, or closed early
    if (result === false || (result && typeof result === 'object' && (result.completed === false || result.status === 'error' || result.userClosed === true || result.skipped === true || result.canceled === true))) {
      return {
        success: false,
        network: 'gigapub',
        error: 'Ad was closed early. You must watch the entire ad to get progress.'
      };
    }

    // Strict Duration Guard: Rewarded ads take at least 12-15 seconds
    if (elapsed < 12.0) {
      console.warn(`[AdManager] Rejected ad watch: Elapsed only ${elapsed.toFixed(1)}s`);
      return {
        success: false,
        network: 'gigapub',
        error: `Ad was closed early (${elapsed.toFixed(1)}s). You must watch the entire sponsor ad (at least 15s) to earn credit.`
      };
    }

    console.log(`[AdManager] ✅ GigaPub ad completed successfully! (${elapsed.toFixed(1)}s)`);
    return { success: true, network: 'gigapub' };
  } catch (err) {
    console.warn('[AdManager] GigaPub ad session caught error:', err);
    const errMessage = String(err?.message || err || '').toLowerCase();
    
    if (errMessage.includes('cancel') || errMessage.includes('close') || errMessage.includes('skip') || errMessage.includes('dismiss') || errMessage.includes('back')) {
      return {
        success: false,
        network: 'gigapub',
        error: 'Ad was closed early. You must watch the full ad to earn progress.'
      };
    }

    if (errMessage.includes('no ad') || errMessage.includes('failed to show')) {
      return {
        success: false,
        network: 'gigapub',
        error: 'Ad sponsor is loading a fresh video. Please tap again in a moment.'
      };
    }

    return {
      success: false,
      network: 'gigapub',
      error: 'Ad was closed early or interrupted. Please tap again to watch the full ad.'
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
