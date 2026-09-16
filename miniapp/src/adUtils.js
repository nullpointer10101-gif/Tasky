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

// Taddy Ad Server Config
const TADDY_SCRIPT_URL = 'https://sdk.taddy.pro/web/taddy.min.js?1317';
const TADDY_SCRIPT_ID  = 'taddy-ad-sdk';
const TADDY_PUB_ID     = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_TADDY_PUB_ID) || '';

/**
 * Initializes the Taddy Ad SDK script & instance
 */
export function initTaddy(pubId) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const targetPubId = pubId || TADDY_PUB_ID;

  if (!document.getElementById(TADDY_SCRIPT_ID)) {
    try {
      const s = document.createElement('script');
      s.id = TADDY_SCRIPT_ID;
      s.src = TADDY_SCRIPT_URL;
      if (targetPubId) {
        s.setAttribute('data-pub-id', targetPubId);
      }
      s.async = true;
      document.head.appendChild(s);
      console.log('[AdManager] 🚀 Injected Taddy SDK script');
    } catch (e) {
      console.error('[AdManager] Taddy script injection error:', e);
    }
  } else if (window.Taddy && targetPubId) {
    try {
      if (typeof window.Taddy.init === 'function') {
        window.Taddy.init(targetPubId);
      }
    } catch (e) {}
  }
}

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

let towerAdsInstance = null;

/**
 * Returns or creates the singleton TowerAds instance
 */
export function getOrInitTowerAds() {
  if (typeof window === 'undefined') return null;
  if (towerAdsInstance) return towerAdsInstance;

  if (typeof window.TowerAds !== 'function') return null;

  try {
    towerAdsInstance = new window.TowerAds({
      apiKey: TOWER_ADS_API_KEY,
      placementId: TOWER_ADS_PLACEMENT_ID,
      onRewardEarned(reward) {
        console.log('[TowerAds] 🏆 Reward earned:', reward);
        if (typeof window.__onTowerReward === 'function') {
          window.__onTowerReward(reward);
        }
      },
      onError(error) {
        console.warn('[TowerAds] ⚠️ Error:', error);
        if (typeof window.__onTowerError === 'function') {
          window.__onTowerError(error);
        }
      }
    });

    console.log('[AdManager] 🚀 TowerAds instance created successfully');
    return towerAdsInstance;
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
initTaddy();

// Also hook to DOMContentLoaded for guaranteed execution
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initAdexium();
      initTaddy();
      getOrInitTowerAds();
    });
  } else {
    setTimeout(() => {
      initAdexium();
      initTaddy();
      getOrInitTowerAds();
    }, 100);
  }
}

export function prefetchGramAd() {
  initGigaAds();
  initAdexium();
  initTowerAds();
  initTaddy();
}

/**
 * Executes a Taddy Interstitial Ad session
 */
export async function showTaddyAd(pubId) {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Browser environment required' };
  }

  try {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
    }
  } catch (e) {}

  initTaddy(pubId);

  let taddy = window.Taddy;
  if (!taddy) {
    let waited = 0;
    while (!taddy && waited < 2000) {
      await new Promise(r => setTimeout(r, 60));
      waited += 60;
      taddy = window.Taddy;
    }
  }

  if (!taddy || typeof taddy.ads !== 'function') {
    console.warn('[AdManager] Taddy SDK not ready yet');
    return { success: false, error: 'Taddy SDK warming up. Please try again in a moment.' };
  }

  return new Promise((resolve) => {
    let isSettled = false;
    let viewedThrough = false;

    try {
      const adsService = taddy.ads();
      adsService.interstitial({
        onClosed: () => {
          if (isSettled) return;
          isSettled = true;
          console.log('[AdManager] Taddy ad closed. viewedThrough:', viewedThrough);
          if (viewedThrough) {
            resolve({ success: true, network: 'taddy' });
          } else {
            resolve({
              success: false,
              network: 'taddy',
              error: 'Ad was closed early. You must watch the entire ad to get progress.'
            });
          }
        },
        onViewThrough: (id) => {
          console.log('[AdManager] ✅ Taddy view-through achieved:', id);
          viewedThrough = true;
        }
      }).then((shown) => {
        console.log('[AdManager] Taddy interstitial call result (shown):', shown);
        if (shown === false && !isSettled) {
          isSettled = true;
          resolve({ success: false, network: 'taddy', error: 'No Taddy ad inventory available' });
        }
      }).catch((err) => {
        if (isSettled) return;
        isSettled = true;
        console.warn('[AdManager] Taddy ad error:', err);
        resolve({ success: false, network: 'taddy', error: err?.message || 'Taddy ad display failed' });
      });

      // Safety timeout of 40s
      setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          if (viewedThrough) {
            resolve({ success: true, network: 'taddy' });
          } else {
            resolve({ success: false, network: 'taddy', error: 'Taddy ad session timed out.' });
          }
        }
      }, 40000);
    } catch (e) {
      console.error('[AdManager] Exception in showTaddyAd:', e);
      resolve({ success: false, network: 'taddy', error: e?.message || 'Failed to request Taddy ad' });
    }
  });
}

/**
 * Option 1: Executes an Adexium interstitial ad properly using official Adexium SDK workflow,
 * with Taddy -> USL -> GigaPub fallback
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
  initTaddy();

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

  // If widget is not available, try Taddy fallback, then USL, then GigaPub
  if (!widget) {
    console.warn('[AdManager] Adexium SDK warming up, trying Taddy fallback...');
    const taddyRes = await showTaddyAd();
    if (taddyRes.success) return { ...taddyRes, network: 'taddy' };
    const uslRes = await showTowerAd();
    if (uslRes.success) return { ...uslRes, network: 'adexium' };
    const fallbackRes = await showGigaPubDirect('gigapub');
    return { ...fallbackRes, network: 'adexium' };
  }

  const startTime = Date.now();

  return new Promise((resolve) => {
    let isSettled = false;
    let playbackCompleted = false;

    const cleanup = () => {
      try {
        widget.off('adReceived', onAdReceived);
        widget.off('adPlaybackCompleted', onCompleted);
        widget.off('adClosed', onClosed);
        widget.off('requestAdError', onError);
        widget.off('noAdFound', onNoAd);
      } catch (e) {}
    };

    const onAdReceived = (ad) => {
      console.log('[AdManager] 🎯 Adexium adReceived, displaying ad...');
      try {
        if (typeof widget.displayAd === 'function') {
          widget.displayAd(ad);
        }
      } catch (e) {
        console.error('[AdManager] Error calling displayAd:', e);
        onError();
      }
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

      if (playbackCompleted || elapsed >= 12.0) {
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
      console.log('[AdManager] Adexium error — trying Taddy fallback...');
      const taddyRes = await showTaddyAd();
      if (taddyRes.success) { resolve({ ...taddyRes, network: 'taddy' }); return; }
      console.log('[AdManager] Taddy error — trying USL fallback...');
      const uslRes = await showTowerAd();
      if (uslRes.success) { resolve({ ...uslRes, network: 'adexium' }); return; }
      const fb = await showGigaPubDirect('gigapub');
      resolve({ ...fb, network: 'adexium' });
    };

    const onNoAd = async () => {
      if (isSettled) return;
      isSettled = true;
      cleanup();
      console.log('[AdManager] Adexium noAdFound — trying Taddy fallback...');
      const taddyRes = await showTaddyAd();
      if (taddyRes.success) { resolve({ ...taddyRes, network: 'taddy' }); return; }
      console.log('[AdManager] Taddy noAdFound — trying USL fallback...');
      const uslRes = await showTowerAd();
      if (uslRes.success) { resolve({ ...uslRes, network: 'adexium' }); return; }
      const fb = await showGigaPubDirect('gigapub');
      resolve({ ...fb, network: 'adexium' });
    };

    // 1. Subscribe to events BEFORE requesting ad (per official Adexium docs)
    widget.on('adReceived', onAdReceived);
    widget.on('adPlaybackCompleted', onCompleted);
    widget.on('adClosed', onClosed);
    widget.on('requestAdError', onError);
    widget.on('noAdFound', onNoAd);

    // 2. Request 'interstitial' ad
    try {
      console.log(`[AdManager] 🚀 Requesting Adexium interstitial ad (WID: ${ADEXIUM_WID})...`);
      widget.requestAd('interstitial');
    } catch (err) {
      console.warn('[AdManager] Exception requesting Adexium ad:', err);
      onError();
    }

    // Safety timeout of 40 seconds
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
    }, 40000);
  });
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
export async function showTowerAd() {
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

  return new Promise((resolve) => {
    let rewarded = false;
    let settled = false;

    window.__onTowerReward = (reward) => {
      console.log('[TowerAds] onRewardEarned triggered:', reward);
      rewarded = true;
    };

    window.__onTowerError = (err) => {
      console.warn('[TowerAds] onError callback triggered:', err);
    };

    ads.loadAndShow()
      .then((res) => {
        if (settled) return;
        settled = true;
        console.log('[TowerAds] loadAndShow resolved successfully:', res);
        resolve({ success: true, network: 'usl', result: res });
      })
      .catch((err) => {
        if (settled) return;
        settled = true;
        console.warn('[TowerAds] loadAndShow caught error:', err);
        const msg = String(err?.message || err || '').toLowerCase();

        if (rewarded) {
          resolve({ success: true, network: 'usl' });
        } else if (msg.includes('no provider') || msg.includes('no ad') || msg.includes('nofill')) {
          resolve({ 
            success: false, 
            error: 'No ad inventory currently available from USL sponsor. Please try again shortly!' 
          });
        } else {
          resolve({ 
            success: false, 
            error: err?.message || 'USL ad was closed early.' 
          });
        }
      });
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

  // 90% USL Ads (TowerAds), 10% GigaPub — maximise USL & Adexium impressions
  const roll = Math.random();
  const shouldTryUSL = roll < 0.90;

  if (shouldTryUSL) {
    console.log(`[AdManager] 🎲 Slot #2 Routing (Roll: ${roll.toFixed(2)} < 0.90): Serving USL Ads (90% weight)...`);
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
    console.log(`[AdManager] 🎲 Slot #2 Routing (Roll: ${roll.toFixed(2)} >= 0.90): Serving GigaPub (10% weight)...`);
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
