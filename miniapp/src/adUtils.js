/**
 * Ad Manager
 * - Option 1: Adexium Interstitial / Rewarded Slot (WID: e93d690f-bdc3-4ed5-8d9f-8f208afa3774) - 100% untouched
 * - Option 2: 60% USL Ads (TowerAds SDK v4) + 40% GigaPub Slot (Unit 8093) with seamless fallbacks
 */

// GigaPub Config
const GIGAPUB_SCRIPT_URL = 'https://ad.gigapub.tech/script?id=8093';
const GIGAPUB_SCRIPT_ID  = 'gigapub-ad-sdk';

// Adexium Config (Option 1 - Untouched)
const ADEXIUM_SCRIPT_URL = 'https://cdn.tgads.space/assets/js/adexium-widget.min.js';
const ADEXIUM_SCRIPT_ID  = 'adexium-widget-sdk';
const ADEXIUM_WID        = 'e93d690f-bdc3-4ed5-8d9f-8f208afa3774';

// USL Ads / TowerAds Config (Option 2 - 60% Weight)
const TOWER_ADS_API_KEY      = 'feb662719eb08611a669069ba17cb0e8';
const TOWER_ADS_PLACEMENT_ID = 'plc_c529a877186e2def';
const TOWER_ADS_SCRIPT_URL   = 'https://uslads.com/sdk/tower-ads-v4.js';
const TOWER_ADS_SCRIPT_ID    = 'tower-ads-sdk';

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

/**
 * Initializes the USL TowerAds SDK script
 */
export function initTowerAds() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!document.getElementById(TOWER_ADS_SCRIPT_ID)) {
    try {
      const s = document.createElement('script');
      s.id = TOWER_ADS_SCRIPT_ID;
      s.src = TOWER_ADS_SCRIPT_URL;
      s.async = true;
      document.head.appendChild(s);
      console.log('[AdManager] 🚀 Injected USL TowerAds SDK script');
    } catch (e) {
      console.error('[AdManager] TowerAds script injection error:', e);
    }
  }
}

/**
 * Returns or creates the singleton TowerAds instance
 */
export function getOrInitTowerAds() {
  if (typeof window === 'undefined') return null;
  if (window.__towerAdsInstance) return window.__towerAdsInstance;

  if (typeof window.TowerAds !== 'function') return null;

  try {
    const instance = new window.TowerAds({
      apiKey: TOWER_ADS_API_KEY,
      placementId: TOWER_ADS_PLACEMENT_ID,
      onRewardEarned(reward) {
        console.log('[AdManager] 🏆 TowerAds reward earned:', reward);
        if (typeof window.__towerAdsRewardCb === 'function') {
          window.__towerAdsRewardCb(reward);
        }
      },
      onError(error) {
        console.warn('[AdManager] ⚠️ TowerAds error:', error);
        if (typeof window.__towerAdsErrorCb === 'function') {
          window.__towerAdsErrorCb(error);
        }
      }
    });

    window.__towerAdsInstance = instance;
    console.log('[AdManager] 🚀 TowerAds instance created successfully');
    return instance;
  } catch (e) {
    console.error('[AdManager] Failed to construct TowerAds:', e);
    return null;
  }
}

/**
 * Initializes the Adexium Ad SDK script & instance
 */
export function initAdexium() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;

  // 1. Inject script tag if not in DOM
  if (!document.getElementById(ADEXIUM_SCRIPT_ID)) {
    try {
      const s = document.createElement('script');
      s.id = ADEXIUM_SCRIPT_ID;
      s.src = ADEXIUM_SCRIPT_URL;
      s.async = true;
      document.head.appendChild(s);
      console.log('[AdManager] 🚀 Injected Adexium SDK script');
    } catch (e) {
      console.error('[AdManager] Adexium script injection error:', e);
    }
  }

  // 2. Instantiate Adexium widget instance if SDK is ready
  return getOrInitAdexiumWidget();
}

/**
 * Returns or creates the singleton Adexium widget instance
 */
export function getOrInitAdexiumWidget() {
  if (typeof window === 'undefined') return null;
  if (window.__adexiumInstance) return window.__adexiumInstance;
  if (window.adexiumWidget) {
    window.__adexiumInstance = window.adexiumWidget;
    return window.__adexiumInstance;
  }

  const WidgetClass = window.AdexiumWidget || window.TGAdsWidget;
  if (typeof WidgetClass !== 'function') return null;

  try {
    const hasTgContext = !!(window.Telegram?.WebApp?.initDataUnsafe?.user?.id || window.Telegram?.WebApp?.initData);
    const instance = new WidgetClass({
      wid: ADEXIUM_WID,
      adFormat: 'interstitial',
      debug: false
    });

    // NOTE: autoMode is intentionally disabled to avoid unsolicited interstitial popups
    window.adexiumWidget = instance;
    window.__adexiumInstance = instance;
    console.log('[AdManager] 🚀 Adexium widget ready (Manual mode - no automatic spam)');
    return instance;
  } catch (e) {
    console.error('[AdManager] Failed to construct AdexiumWidget:', e);
    return null;
  }
}

// Auto-initialize ad networks immediately
initGigaAds();
initAdexium();
initTowerAds();

// Also hook to DOMContentLoaded for guaranteed execution
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initAdexium();
      getOrInitTowerAds();
    });
  } else {
    setTimeout(() => {
      initAdexium();
      getOrInitTowerAds();
    }, 100);
  }
}

export function prefetchGramAd() {
  initGigaAds();
  initAdexium();
  initTowerAds();
}

/**
 * Option 1: Executes an Adexium interstitial / rewarded ad (100% UNCHANGED)
 */
export async function showAdexiumAd() {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Browser environment required' };
  }

  // Ensure Telegram WebApp is ready
  try {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
    }
  } catch (e) {}

  initAdexium();

  // Check Adexium SDK instance
  let widget = getOrInitAdexiumWidget();
  if (!widget) {
    let waited = 0;
    while (!widget && waited < 1500) {
      await new Promise(r => setTimeout(r, 50));
      waited += 50;
      widget = getOrInitAdexiumWidget();
    }
  }

  // If widget is not available, immediately fallback to backup sponsor ad
  if (!widget) {
    console.warn('[AdManager] Adexium SDK warming up, playing fallback sponsor ad...');
    const fallbackRes = await showGigaPubDirect('gigapub');
    return { ...fallbackRes, network: 'adexium' };
  }

  const startTime = Date.now();

  try {
    console.log(`[AdManager] 🚀 Requesting Adexium ad (WID: ${ADEXIUM_WID})...`);
    
    // Try interstitial first, then video format
    let ads = null;
    try {
      ads = await widget.requestAd('interstitial');
      if (!ads || !Array.isArray(ads) || ads.length === 0) {
        ads = await widget.requestAd('video');
      }
    } catch (reqErr) {
      console.warn('[AdManager] Adexium request error:', reqErr);
    }

    // If Adexium has no inventory right now, serve fallback sponsor video seamlessly!
    if (!ads || !Array.isArray(ads) || ads.length === 0) {
      console.log('[AdManager] Adexium inventory empty for this slot, seamlessly serving fallback sponsor ad...');
      const fallbackRes = await showGigaPubDirect('gigapub');
      return { ...fallbackRes, network: 'adexium' };
    }

    return await new Promise(async (resolve) => {
      let isSettled = false;
      let playbackCompleted = false;

      const cleanup = () => {
        try {
          widget.off('adPlaybackCompleted', onCompleted);
          widget.off('adClosed', onClosed);
          widget.off('requestAdError', onError);
          widget.off('noAdFound', onNoAd);
        } catch (e) {}
      };

      const onCompleted = () => {
        console.log('[AdManager] ✅ Adexium ad playback completed');
        playbackCompleted = true;
      };

      const onClosed = () => {
        if (isSettled) return;
        isSettled = true;
        cleanup();
        const elapsed = (Date.now() - startTime) / 1000;
        console.log(`[AdManager] Adexium ad closed. Elapsed: ${elapsed.toFixed(1)}s, playbackCompleted: ${playbackCompleted}`);

        if (playbackCompleted || elapsed >= 14.0) {
          resolve({ success: true, network: 'adexium' });
        } else {
          resolve({
            success: false,
            network: 'adexium',
            error: 'Ad was closed early. You must watch the entire ad to get progress.'
          });
        }
      };

      const onError = async () => {
        if (isSettled) return;
        isSettled = true;
        cleanup();
        console.log('[AdManager] Adexium error event, switching to fallback sponsor ad...');
        const fb = await showGigaPubDirect('gigapub');
        resolve({ ...fb, network: 'adexium' });
      };

      const onNoAd = async () => {
        if (isSettled) return;
        isSettled = true;
        cleanup();
        console.log('[AdManager] Adexium noAdFound event, switching to fallback sponsor ad...');
        const fb = await showGigaPubDirect('gigapub');
        resolve({ ...fb, network: 'adexium' });
      };

      widget.on('adPlaybackCompleted', onCompleted);
      widget.on('adClosed', onClosed);
      widget.on('requestAdError', onError);
      widget.on('noAdFound', onNoAd);

      // Display the interstitial banner/video
      widget.displayAd(ads, ads[0]?.adFormat || 'interstitial');

      // Safety timeout of 50 seconds
      setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          cleanup();
          if (playbackCompleted) {
            resolve({ success: true, network: 'adexium' });
          } else {
            resolve({
              success: false,
              network: 'adexium',
              error: 'Ad session timed out. Please tap again.'
            });
          }
        }
      }, 50000);
    });
  } catch (err) {
    console.warn('[AdManager] Adexium exception, fallback to sponsor ad:', err);
    const fb = await showGigaPubDirect('gigapub');
    return { ...fb, network: 'adexium' };
  }
}

/**
 * Backward compatibility alias for Option 1
 */
export async function showMonetagAd() {
  return await showAdexiumAd();
}

/**
 * Executes a USL TowerAds rewarded ad session
 */
export async function showTowerAd(retryCount = 0) {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Browser environment required' };
  }

  // Ensure Telegram WebApp is ready
  try {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
    }
  } catch (e) {}

  initTowerAds();

  let ads = getOrInitTowerAds();
  if (!ads) {
    let waited = 0;
    while (!ads && waited < 2000) {
      await new Promise(r => setTimeout(r, 60));
      waited += 60;
      ads = getOrInitTowerAds();
    }
  }

  if (!ads) {
    console.warn('[AdManager] TowerAds SDK warming up or not ready');
    return { 
      success: false, 
      error: 'USL Ad sponsor is initializing. Please tap again in a moment!' 
    };
  }

  const startTime = Date.now();

  const formatUslError = (rawErr) => {
    const msg = String(rawErr?.message || rawErr || '').toLowerCase();
    if (msg.includes('no provider') || msg.includes('no inventory') || msg.includes('no ad') || msg.includes('empty') || msg.includes('fill')) {
      return 'USL Ads is fetching fresh video inventory. Please tap again in 3 seconds!';
    }
    if (msg.includes('cancel') || msg.includes('close') || msg.includes('skip') || msg.includes('dismiss')) {
      return 'USL ad was closed early. Watch the full ad to charge!';
    }
    return 'USL Ads is loading a fresh sponsor video. Please tap again in a few seconds!';
  };

  return await new Promise(async (resolve) => {
    let isSettled = false;
    let rewardEarned = false;

    window.__towerAdsRewardCb = (reward) => {
      rewardEarned = true;
      console.log('[AdManager] ✅ TowerAds reward callback triggered:', reward);
    };

    window.__towerAdsErrorCb = async (err) => {
      if (!isSettled) {
        console.warn('[AdManager] ⚠️ TowerAds error callback triggered:', err);
        const errMsg = String(err?.message || err || '').toLowerCase();
        
        // Auto-retry up to 2 times if temporary "no providers"
        if ((errMsg.includes('no provider') || errMsg.includes('busy') || errMsg.includes('fill')) && retryCount < 2) {
          console.log(`[AdManager] 🔄 Auto-retrying USL TowerAds (attempt ${retryCount + 1})...`);
          await new Promise(r => setTimeout(r, 800));
          const retryRes = await showTowerAd(retryCount + 1);
          if (!isSettled) {
            isSettled = true;
            resolve(retryRes);
          }
          return;
        }

        isSettled = true;
        resolve({ success: false, error: formatUslError(err) });
      }
    };

    // Safety timeout of 45 seconds
    const timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        const elapsed = (Date.now() - startTime) / 1000;
        if (rewardEarned || elapsed >= 14.0) {
          resolve({ success: true, network: 'usl' });
        } else {
          resolve({ success: false, error: 'USL ad session timed out. Tap to retry!' });
        }
      }
    }, 45000);

    try {
      console.log('[AdManager] 🚀 Calling TowerAds ads.loadAndShow()...');
      await ads.loadAndShow();
      clearTimeout(timer);
      const elapsed = (Date.now() - startTime) / 1000;
      console.log(`[AdManager] TowerAds loadAndShow completed. Elapsed: ${elapsed.toFixed(1)}s, rewardEarned: ${rewardEarned}`);
      
      if (!isSettled) {
        isSettled = true;
        if (rewardEarned || elapsed >= 12.0) {
          resolve({ success: true, network: 'usl' });
        } else {
          resolve({
            success: false,
            error: 'Ad was closed early. You must watch the full video to charge!'
          });
        }
      }
    } catch (err) {
      clearTimeout(timer);
      if (!isSettled) {
        console.warn('[AdManager] TowerAds loadAndShow caught error:', err);
        const errMsg = String(err?.message || err || '').toLowerCase();
        
        // Auto-retry up to 2 times if temporary "no providers"
        if ((errMsg.includes('no provider') || errMsg.includes('busy') || errMsg.includes('fill')) && retryCount < 2) {
          console.log(`[AdManager] 🔄 Auto-retrying USL TowerAds from catch (attempt ${retryCount + 1})...`);
          await new Promise(r => setTimeout(r, 800));
          const retryRes = await showTowerAd(retryCount + 1);
          if (!isSettled) {
            isSettled = true;
            resolve(retryRes);
          }
          return;
        }

        isSettled = true;
        resolve({ success: false, error: formatUslError(err) });
      }
    }
  });
}

export const showUSLAd = showTowerAd;

/**
 * Executes a direct GigaPub rewarded ad session using window.showGiga()
 */
export async function showGigaPubDirect(providerName = 'gigapub') {
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

  // Poll for SDK readiness (up to 3 seconds)
  let fn = getFn();
  if (typeof fn !== 'function') {
    let waited = 0;
    while (!getFn() && waited < 3000) {
      await new Promise(r => setTimeout(r, 50));
      waited += 50;
    }
    fn = getFn();
  }

  if (typeof fn !== 'function') {
    console.warn('[AdManager] GigaPub SDK unit 8093 not ready yet.');
    initGigaAds();
    return {
      success: false,
      network: providerName,
      error: 'Ad network is warming up. Please tap again to start instantly!'
    };
  }

  const startTime = Date.now();

  try {
    console.log(`[AdManager] 🚀 Executing GigaPub rewarded ad for ${providerName} (Unit 8093)...`);
    
    // Safety timeout of 45 seconds for video display & completion
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('ad_timeout')), 45000)
    );

    // Call showGiga with default placement ('main' / no args) so GigaPub never fails placement lookup
    const result = await Promise.race([
      fn.call(window.GigaPub || window),
      timeoutPromise
    ]);

    const elapsedSec = (Date.now() - startTime) / 1000;
    console.log(`[AdManager] GigaPub returned:`, result, `Elapsed Time: ${elapsedSec.toFixed(1)}s`);

    // Strict validation: Must not return false, cancelled, or closed early
    if (result === false || (result && typeof result === 'object' && (result.completed === false || result.status === 'error' || result.userClosed === true || result.skipped === true || result.canceled === true))) {
      return {
        success: false,
        network: providerName,
        error: 'Ad was closed early. You must watch the entire ad to get progress.'
      };
    }

    console.log(`[AdManager] ✅ GigaPub ad completed successfully (${elapsedSec.toFixed(1)}s)!`);
    return { success: true, network: providerName };
  } catch (err) {
    console.warn('[AdManager] GigaPub ad session caught error:', err);
    const errMessage = String(err?.message || err || '').toLowerCase();
    
    if (errMessage.includes('timeout') || errMessage.includes('ad_timeout')) {
      return {
        success: false,
        network: providerName,
        error: 'Ad network is currently busy or out of inventory. Please tap again to retry!'
      };
    }

    if (errMessage.includes('cancel') || errMessage.includes('close') || errMessage.includes('skip') || errMessage.includes('dismiss') || errMessage.includes('back')) {
      return {
        success: false,
        network: providerName,
        error: 'Ad was closed early. You must watch the full ad to earn progress.'
      };
    }

    if (errMessage.includes('no ad') || errMessage.includes('failed to show') || errMessage.includes('not found')) {
      return {
        success: false,
        network: providerName,
        error: 'Ad sponsor is loading a fresh video. Please tap again in a moment.'
      };
    }

    return {
      success: false,
      network: providerName,
      error: 'Ad was closed early or interrupted. Please tap again to watch the full ad.'
    };
  }
}

/**
 * Option 2 & General Rewarded Ads:
 * 80% USL Ads (TowerAds) / 20% GigaPub with automatic seamless fallback to GigaPub
 */
export async function showRewardedAd(providerName = 'gigapub') {
  if (providerName === 'adexium' || providerName === 'monetag') {
    return await showAdexiumAd();
  }

  // 80% chance to attempt USL Ads (TowerAds), 20% chance for GigaPub
  const roll = Math.random();
  const shouldTryUSL = roll < 0.80;

  if (shouldTryUSL) {
    console.log(`[AdManager] 🎲 Slot #2 Routing (Roll: ${roll.toFixed(2)} < 0.80): Serving USL Ads (80% weight)...`);
    try {
      const uslRes = await showTowerAd();
      if (uslRes.success) {
        console.log('[AdManager] 🏆 USL Ad completed successfully!');
        return { success: true, network: 'usl' };
      }
      console.log(`[AdManager] 🔄 USL Ad did not complete (${uslRes.error || 'fallback'}). Automatically switching to GigaPub fallback...`);
    } catch (e) {
      console.warn('[AdManager] USL error, triggering GigaPub fallback:', e);
    }
  } else {
    console.log(`[AdManager] 🎲 Slot #2 Routing (Roll: ${roll.toFixed(2)} >= 0.80): Serving GigaPub (20% weight)...`);
  }

  // GigaPub execution (direct or fallback)
  return await showGigaPubDirect(providerName);
}

export async function showGigaPubAdFallback() {
  return await showGigaPubDirect('gigapub');
}

export async function triggerStartupAd() {
  // Permanently disabled: No automatic ads on startup
  return { success: false, skipped: true };
}

export function startPeriodicAdLoop() {
  // Intentionally empty: No periodic or unwanted ads
}

export function initMonetagAds() {
  initAdexium();
}

export function waitForGiga() { return Promise.resolve(true); }
