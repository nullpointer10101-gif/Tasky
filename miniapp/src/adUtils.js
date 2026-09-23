/**
 * Ad Manager
 * - Provider 1: Adexium Interstitial / Rewarded Slot (WID: e93d690f-bdc3-4ed5-8d9f-8f208afa3774) - Shows all eligible ads without restrictions
 * - Provider 2: USL Ads (TowerAds SDK v4) - Full partner ad network support with automatic GigaPub/Adexium fallback
 * - Provider 3: GigaPub Slot (Unit 8093) - High fill rate rewarded fallback
 */

// GigaPub Config
const GIGAPUB_SCRIPT_URL = 'https://ad.gigapub.tech/script?id=7451';
const GIGAPUB_SCRIPT_ID  = 'gigapub-ad-sdk';

// Adexium Config
const ADEXIUM_SCRIPT_URL = 'https://cdn.tgads.space/assets/js/adexium-widget.min.js';
const ADEXIUM_SCRIPT_ID  = 'adexium-widget-sdk';
const ADEXIUM_WID        = 'e93d690f-bdc3-4ed5-8d9f-8f208afa3774';

// USL Ads / TowerAds Config
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
    const instance = new WidgetClass({
      wid: ADEXIUM_WID,
      adFormat: 'interstitial',
      debug: false
    });

    window.adexiumWidget = instance;
    window.__adexiumInstance = instance;
    console.log('[AdManager] 🚀 Adexium widget ready — showing all eligible ads without restrictions');
    return instance;
  } catch (e) {
    console.error('[AdManager] Failed to construct AdexiumWidget:', e);
    return null;
  }
}

// Ad SDKs are loaded on-demand when a user requests an ad

export function prefetchGramAd() {
  initGigaAds();
  initAdexium();
  initTowerAds();
}

/**
 * Executes an Adexium interstitial ad without restrictions,
 * with seamless USL -> GigaPub fallback if no ad is returned
 */
export async function showAdexiumAd() {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Browser environment required' };
  }

  try {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
    }
  } catch (e) {}

  initAdexium();

  let widget = getOrInitAdexiumWidget();
  if (!widget) {
    let waited = 0;
    while (!widget && waited < 1500) {
      await new Promise(r => setTimeout(r, 50));
      waited += 50;
      widget = getOrInitAdexiumWidget();
    }
  }

  // If widget is warming up or unavailable, trigger USL fallback then GigaPub fallback
  if (!widget) {
    console.warn('[AdManager] Adexium SDK warming up, trying USL partner fallback...');
    const uslRes = await showTowerAdDirect();
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
      console.log('[AdManager] 🎯 Adexium adReceived — showing eligible ad instantly...');
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

      if (elapsed >= 10.0) {
        resolve({ success: true, network: 'adexium' });
      } else {
        resolve({
          success: false,
          network: 'adexium',
          error: `Ad was closed early (${elapsed.toFixed(1)}s). You must watch at least 10 seconds to receive credit.`
        });
      }
    };

    const onError = async () => {
      if (isSettled) return;
      isSettled = true;
      cleanup();
      console.log('[AdManager] Adexium no fill/error — trying USL partner fallback...');
      const uslRes = await showTowerAdDirect();
      if (uslRes.success) { resolve({ ...uslRes, network: 'adexium' }); return; }
      const fb = await showGigaPubDirect('gigapub');
      resolve({ ...fb, network: 'adexium' });
    };

    const onNoAd = async () => {
      if (isSettled) return;
      isSettled = true;
      cleanup();
      console.log('[AdManager] Adexium noAdFound — trying USL partner fallback...');
      const uslRes = await showTowerAdDirect();
      if (uslRes.success) { resolve({ ...uslRes, network: 'adexium' }); return; }
      const fb = await showGigaPubDirect('gigapub');
      resolve({ ...fb, network: 'adexium' });
    };

    widget.on('adReceived', onAdReceived);
    widget.on('adPlaybackCompleted', onCompleted);
    widget.on('adClosed', onClosed);
    widget.on('requestAdError', onError);
    widget.on('noAdFound', onNoAd);

    try {
      console.log(`[AdManager] 🚀 Requesting Adexium eligible ad (WID: ${ADEXIUM_WID})...`);
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
            error: 'Ad session timed out. Please tap again to watch an ad.'
          });
        }
      }
    }, 40000);
  });
}

/**
 * Backward compatibility alias
 */
export async function showMonetagAd() {
  return await showAdexiumAd();
}

/**
 * Direct execution of USL TowerAds without fallback
 */
function showTowerAdDirect() {
  let ads = getOrInitTowerAds();
  if (!ads) return Promise.resolve({ success: false, error: 'TowerAds not ready' });

  return new Promise((resolve) => {
    let rewarded = false;
    let settled = false;
    const startTime = Date.now();

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
        const elapsedSec = (Date.now() - startTime) / 1000;
        if (elapsedSec < 10.0) {
          resolve({ success: false, error: `Ad was closed early (${elapsedSec.toFixed(1)}s). You must watch at least 10 seconds to receive credit.` });
        } else {
          resolve({ success: true, network: 'usl', result: res });
        }
      })
      .catch((err) => {
        if (settled) return;
        settled = true;
        const elapsedSec = (Date.now() - startTime) / 1000;
        if (rewarded && elapsedSec >= 10.0) {
          resolve({ success: true, network: 'usl' });
        } else {
          resolve({ success: false, error: err?.message || `Ad was closed early (${elapsedSec.toFixed(1)}s). You must watch at least 10 seconds to receive credit.` });
        }
      });
  });
}

/**
 * Executes a USL Ads (TowerAds) session with seamless GigaPub/Adexium fallback
 * ensuring every partner ad is displayed properly
 */
export function showTowerAd() {
  if (typeof window === 'undefined') {
    return Promise.resolve({ success: false, error: 'Browser environment required' });
  }

  try {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
    }
  } catch (e) {}

  initTowerAds();

  let ads = getOrInitTowerAds();
  if (!ads) {
    let waited = 0;
    const checkAsync = async () => {
      while (!ads && waited < 2000) {
        await new Promise(r => setTimeout(r, 60));
        waited += 60;
        ads = getOrInitTowerAds();
      }
      if (!ads) {
        console.warn('[AdManager] USL SDK warming up — triggering GigaPub partner fallback...');
        return await showGigaPubDirect('usl');
      }
      return executeTowerAdsWithFallback(ads);
    };
    return checkAsync();
  }

  return executeTowerAdsWithFallback(ads);
}

function executeTowerAdsWithFallback(ads) {
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
      .catch(async (err) => {
        if (settled) return;
        settled = true;
        console.warn('[TowerAds] loadAndShow caught error:', err);
        const msg = String(err?.message || err || '').toLowerCase();

        if (rewarded) {
          resolve({ success: true, network: 'usl' });
        } else if (msg.includes('no provider') || msg.includes('no ad') || msg.includes('nofill') || msg.includes('not available')) {
          console.log('[AdManager] USL no-fill — automatically triggering GigaPub partner fallback...');
          const gigaRes = await showGigaPubDirect('usl');
          resolve(gigaRes);
        } else {
          resolve({ 
            success: false, 
            error: err?.message || 'Ad was closed early. You must watch the entire ad to get progress.' 
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

  try {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
    }
  } catch(e) {}

  initGigaAds();

  const getFn = () => window.showGiga || window.showGigaPubAd || window.showGigaAd || (window.GigaPub && (window.GigaPub.showAd || window.GigaPub.show)) || window.showAd;

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
    console.warn('[AdManager] GigaPub SDK unit 8093 warming up.');
    initGigaAds();
    return {
      success: false,
      network: providerName,
      error: 'Ad network warming up. Please tap again to start instantly!'
    };
  }

  const startTime = Date.now();

  try {
    console.log(`[AdManager] 🚀 Executing GigaPub rewarded ad for ${providerName} (Unit 8093)...`);
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('ad_timeout')), 45000)
    );

    const result = await Promise.race([
      fn.call(window.GigaPub || window),
      timeoutPromise
    ]);

    const elapsedSec = (Date.now() - startTime) / 1000;
    console.log(`[AdManager] GigaPub returned:`, result, `Elapsed Time: ${elapsedSec.toFixed(1)}s`);

    if (result === false || (result && typeof result === 'object' && (result.completed === false || result.status === 'error' || result.userClosed === true || result.skipped === true || result.canceled === true))) {
      return {
        success: false,
        network: providerName,
        error: 'Ad was closed early. You must watch the entire ad to get progress.'
      };
    }

    if (elapsedSec < 10.0) {
      console.warn(`[AdManager] GigaPub ad closed early (${elapsedSec.toFixed(1)}s < 10s). Credit denied.`);
      return {
        success: false,
        network: providerName,
        error: `Ad was closed early (${elapsedSec.toFixed(1)}s). You must watch at least 10 seconds to receive credit.`
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
 * Rewarded Ads Router:
 * Serves USL Ads, Adexium, and GigaPub with automatic partner fallbacks
 */
export async function showRewardedAd(providerName = 'adexium') {
  // Primary Cascade Order: 1st Adexium -> 2nd USL -> 3rd GigaPub
  console.log(`[AdManager] 🎯 Executing Primary Cascade (1st Adexium -> 2nd USL -> 3rd GigaPub)...`);
  
  // 1st: Try Adexium
  const adexiumRes = await showAdexiumAd();
  if (adexiumRes.success) {
    return adexiumRes;
  }

  // If user actively closed Adexium early, return early so they complete full ad
  if (adexiumRes.error && adexiumRes.error.includes('closed early')) {
    return adexiumRes;
  }

  // 2nd: Try USL
  console.log(`[AdManager] 🔄 Adexium unavailable — trying 2nd layer USL Ads...`);
  try {
    const uslRes = await showTowerAdDirect();
    if (uslRes.success) {
      return { success: true, network: 'usl' };
    }
  } catch (e) {
    console.warn('[AdManager] USL error:', e);
  }

  // 3rd: Try GigaPub
  console.log(`[AdManager] 🔄 USL unavailable — trying 3rd layer GigaPub...`);
  return await showGigaPubDirect(providerName);
}

export async function showGigaPubAdFallback() {
  return await showGigaPubDirect('gigapub');
}

export async function triggerStartupAd() {
  return { success: false, skipped: true };
}

export function startPeriodicAdLoop() {}

export function initMonetagAds() {
  initAdexium();
}

export function waitForGiga() { return Promise.resolve(true); }
