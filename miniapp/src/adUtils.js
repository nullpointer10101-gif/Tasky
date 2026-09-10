/**
 * Ad Manager
 * - Option 1: Adexium Interstitial / Rewarded Slot (WID: e93d690f-bdc3-4ed5-8d9f-8f208afa3774) with seamless fallback
 * - Option 2: GigaPub Slot (Unit 8093)
 */

const GIGAPUB_SCRIPT_URL = 'https://ad.gigapub.tech/script?id=8093';
const GIGAPUB_SCRIPT_ID  = 'gigapub-ad-sdk';

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
      console.log('[AdManager] 🚀 Initialized GigaPub ad SDK (Unit 8093)');
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

  const WidgetClass = window.AdexiumWidget || window.TGAdsWidget;
  if (typeof WidgetClass !== 'function') return null;

  try {
    const hasTgContext = !!(window.Telegram?.WebApp?.initDataUnsafe?.user?.id || window.Telegram?.WebApp?.initData);
    const instance = new WidgetClass({
      wid: ADEXIUM_WID,
      adFormat: 'interstitial',
      adImpressionIntervalInSeconds: 0,
      firstAdImpressionIntervalInSeconds: 0,
      debug: !hasTgContext // safe fallback if testing outside Telegram
    });

    try {
      instance.autoMode();
      console.log('[AdManager] 🚀 Adexium autoMode initialized successfully');
    } catch (e) {
      console.warn('[AdManager] Adexium autoMode notice:', e);
    }

    window.__adexiumInstance = instance;
    return instance;
  } catch (e) {
    console.error('[AdManager] Failed to construct AdexiumWidget:', e);
    return null;
  }
}

// Auto-initialize both ad networks immediately
initGigaAds();
initAdexium();

// Also hook to DOMContentLoaded for guaranteed autoMode execution
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initAdexium();
    });
  } else {
    setTimeout(initAdexium, 100);
  }
}

export function prefetchGramAd() {
  initGigaAds();
  initAdexium();
}

/**
 * Executes an Adexium interstitial / rewarded ad with 100% reliable fallback
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
    const fallbackRes = await showRewardedAd('gigapub');
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
      const fallbackRes = await showRewardedAd('gigapub');
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
        const fb = await showRewardedAd('gigapub');
        resolve({ ...fb, network: 'adexium' });
      };

      const onNoAd = async () => {
        if (isSettled) return;
        isSettled = true;
        cleanup();
        console.log('[AdManager] Adexium noAdFound event, switching to fallback sponsor ad...');
        const fb = await showRewardedAd('gigapub');
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
    const fb = await showRewardedAd('gigapub');
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
 * Executes a GigaPub rewarded ad session using window.showGiga()
 * Used for Option 2 and general app rewarded ads.
 */
export async function showRewardedAd(providerName = 'gigapub') {
  if (providerName === 'adexium' || providerName === 'monetag') {
    return await showAdexiumAd();
  }

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

export async function showGigaPubAdFallback() {
  return await showRewardedAd('gigapub');
}

export function triggerStartupAd() {
  // Handled via autoMode
}

export function startPeriodicAdLoop() {
  // Handled via autoMode
}

export function initMonetagAds() {
  initAdexium();
}

export function waitForGiga() { return Promise.resolve(true); }
