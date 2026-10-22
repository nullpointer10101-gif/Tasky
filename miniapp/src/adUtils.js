/**
 * Ad Manager
 * - Provider 1: Adexium Interstitial / Rewarded Slot (WID: e93d690f-bdc3-4ed5-8d9f-8f208afa3774) - Shows all eligible ads without restrictions
 * - Provider 2: GigaPub Slot (Unit 7451) - High fill rate rewarded fallback
 */

// GigaPub Config
const GIGAPUB_SCRIPT_URL = 'https://ad.gigapub.tech/script?id=7451';
const GIGAPUB_SCRIPT_ID  = 'gigapub-ad-sdk';

// Adexium Config
const ADEXIUM_SCRIPT_URL = 'https://cdn.tgads.space/assets/js/adexium-widget.min.js';
const ADEXIUM_SCRIPT_ID  = 'adexium-widget-sdk';
const ADEXIUM_WID        = 'e93d690f-bdc3-4ed5-8d9f-8f208afa3774';

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
      console.log('[AdManager] 🚀 Initialized GigaPub ad SDK (Unit 7451)');
    } catch (e) {
      console.error('[AdManager] GigaPub script injection error:', e);
    }
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

export function prefetchGramAd() {
  initGigaAds();
  initAdexium();
}

/**
 * Executes an Adexium interstitial ad without restrictions,
 * with optional GigaPub fallback if allowFallback is true
 */
export async function showAdexiumAd(allowFallback = false) {
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
    while (!widget && waited < 4000) {
      await new Promise(r => setTimeout(r, 100));
      waited += 100;
      widget = getOrInitAdexiumWidget();
    }
  }

  // If widget is warming up or unavailable
  if (!widget) {
    console.warn('[AdManager] Adexium SDK warming up...');
    if (allowFallback) {
      console.warn('[AdManager] Trying GigaPub partner fallback...');
      const fallbackRes = await showGigaPubDirect('gigapub');
      return fallbackRes;
    }
    return {
      success: false,
      network: 'adexium',
      error: 'Adexium ad sponsor is warming up. Please tap again in a moment!'
    };
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

      if (elapsed >= 10.0 || playbackCompleted) {
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
      console.log('[AdManager] Adexium requestAdError (no fill / network busy)');
      if (allowFallback) {
        console.log('[AdManager] Falling back to GigaPub partner...');
        const fb = await showGigaPubDirect('gigapub');
        resolve(fb);
      } else {
        resolve({
          success: false,
          network: 'adexium',
          error: 'Adexium ad sponsor is temporarily busy. Please tap again to retry!'
        });
      }
    };

    const onNoAd = async () => {
      if (isSettled) return;
      isSettled = true;
      cleanup();
      console.log('[AdManager] Adexium noAdFound');
      if (allowFallback) {
        console.log('[AdManager] Falling back to GigaPub partner...');
        const fb = await showGigaPubDirect('gigapub');
        resolve(fb);
      } else {
        resolve({
          success: false,
          network: 'adexium',
          error: 'Adexium is currently refreshing inventory. Please tap again shortly.'
        });
      }
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
    console.warn('[AdManager] GigaPub SDK unit 7451 warming up.');
    initGigaAds();
    return {
      success: false,
      network: providerName,
      error: 'Ad network warming up. Please tap again to start instantly!'
    };
  }

  const startTime = Date.now();

  try {
    console.log(`[AdManager] 🚀 Executing GigaPub rewarded ad for ${providerName} (Unit 7451)...`);
    
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
 * ALWAYS strongly pushes 1st: Adexium -> 2nd: GigaPub (fallback)
 */
export async function showRewardedAd(providerName = 'adexium') {
  console.log(`[AdManager] 🎯 Executing Strong Push Ad Chain (1st Adexium -> 2nd GigaPub)...`);
  
  // 1st Priority: Always strongly attempt Adexium
  const adexiumRes = await showAdexiumAd(false);
  if (adexiumRes.success) {
    console.log('[AdManager] ✅ Rewarded ad served successfully via 1st Priority (Adexium)');
    return adexiumRes;
  }

  // If user actively closed Adexium early, return early with message so user completes duration
  if (adexiumRes.error && (adexiumRes.error.includes('closed early') || adexiumRes.error.includes('at least 10 seconds'))) {
    return adexiumRes;
  }

  // 2nd Priority: Fallback to GigaPub only if Adexium had no ad / error / no inventory
  console.log(`[AdManager] 🔄 Adexium unavailable or no fill — falling back to 2nd Priority GigaPub (${providerName})...`);
  return await showGigaPubDirect('gigapub');
}

// Backward-compatibility aliases
export const showTowerAd = showRewardedAd;
export const showUSLAd = showRewardedAd;
export const initTowerAds = () => {};
export const getOrInitTowerAds = () => null;

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
