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
 * Used for Option 2 and fallback. Tracks active in-app focused watch time.
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

  // ── ACTIVE IN-APP FOCUS TRACKER ──
  // Pauses timer when user clicks an ad or navigates away from the app
  let focusedDurationMs = 0;
  let lastFocusTime = Date.now();
  let isTabFocused = typeof document !== 'undefined' ? !document.hidden : true;

  const onVisibilityChange = () => {
    const now = Date.now();
    if (document.hidden) {
      if (isTabFocused) {
        focusedDurationMs += (now - lastFocusTime);
        isTabFocused = false;
      }
    } else {
      if (!isTabFocused) {
        lastFocusTime = Date.now();
        isTabFocused = true;
      }
    }
  };

  const onBlur = () => {
    if (isTabFocused) {
      focusedDurationMs += (Date.now() - lastFocusTime);
      isTabFocused = false;
    }
  };

  const onFocus = () => {
    if (!isTabFocused) {
      lastFocusTime = Date.now();
      isTabFocused = true;
    }
  };

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
  }

  try {
    console.log(`[AdManager] 🚀 Executing GigaPub rewarded ad (Unit 8093, Placement: ${placement})...`);
    
    // Allow up to 75 seconds for full video ad loading and viewing
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('ad_timeout')), 75000)
    );

    const result = await Promise.race([
      fn.call(window.GigaPub || window),
      timeoutPromise
    ]);

    // Calculate final active in-app watch time
    if (isTabFocused) {
      focusedDurationMs += (Date.now() - lastFocusTime);
    }

    const activeSec = focusedDurationMs / 1000;
    console.log(`[AdManager] GigaPub returned:`, result, `Active In-App Time: ${activeSec.toFixed(1)}s`);

    // Strict validation: Must not return false, cancelled, or closed early
    if (result === false || (result && typeof result === 'object' && (result.completed === false || result.status === 'error' || result.userClosed === true || result.skipped === true || result.canceled === true))) {
      return {
        success: false,
        network: 'gigapub',
        error: 'Ad was closed early. You must watch the entire ad to get progress.'
      };
    }

    // Strict Active In-App Duration Guard: Rewarded ads require at least 15 seconds of active in-app watching
    if (activeSec < 15.0) {
      console.warn(`[AdManager] ❌ Rejected ad: active in-app time was only ${activeSec.toFixed(1)}s (clicked away or skipped)`);
      return {
        success: false,
        network: 'gigapub',
        error: `Ad was clicked away or closed early (${activeSec.toFixed(1)}s in-app). You must watch the full video (at least 15s) inside the app to earn credit.`
      };
    }

    console.log(`[AdManager] ✅ GigaPub ad completed successfully with verified in-app duration! (${activeSec.toFixed(1)}s)`);
    return { success: true, network: 'gigapub' };
  } catch (err) {
    console.warn('[AdManager] GigaPub ad session caught error:', err);
    const errMessage = String(err?.message || err || '').toLowerCase();
    
    if (errMessage.includes('timeout') || errMessage.includes('ad_timeout')) {
      return {
        success: false,
        network: 'gigapub',
        error: 'Ad network is currently busy or out of inventory. Please tap again to retry!'
      };
    }

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
  } finally {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    }
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
 * Executes Option 1: Direct Adsgram Rewarded Video (Block #44552) with GigaPub fallback
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

  // 1. Try Direct Adsgram Rewarded Video if available
  if (typeof window !== 'undefined' && window.Adsgram) {
    try {
      console.log('[AdManager] 🚀 Executing Adsgram Rewarded Video (Block #44552)...');
      const AdController = window.Adsgram.init({ blockId: '44552' });
      const startTime = Date.now();
      const res = await AdController.show();
      const elapsed = (Date.now() - startTime) / 1000;
      
      if (res && (res.done === true || res.state === 'reward')) {
        if (elapsed >= 15.0) {
          console.log(`[AdManager] ✅ Adsgram video completed successfully! (${elapsed.toFixed(1)}s)`);
          return { success: true, network: 'adsgram' };
        }
      }
      
      if (res && res.done === false) {
        return {
          success: false,
          network: 'adsgram',
          error: 'Ad was closed early. You must watch the complete video to earn progress.'
        };
      }
    } catch (adsgramErr) {
      console.warn('[AdManager] Adsgram show caught error/skip:', adsgramErr);
      if (adsgramErr?.error || adsgramErr?.state === 'closed' || String(adsgramErr).toLowerCase().includes('close')) {
        return {
          success: false,
          network: 'adsgram',
          error: 'You must watch the full rewarded video without closing or skipping.'
        };
      }
    }
  }

  // 2. Fallback to GigaPub with strict in-app focus duration tracking
  console.log('[AdManager] 🚀 Executing Monetag slot via GigaPub engine (Unit 8093)...');
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
