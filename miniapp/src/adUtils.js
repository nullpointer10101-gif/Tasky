/**
 * Ad Manager — Permanent Primary Ad Provider: GigaPub (Unit 8093) with Monetag Fallback
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
      s.async = true;
      document.head.appendChild(s);
      console.log('[AdManager] 🚀 Initialized GigaPub primary ad SDK (Unit 8093)');
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

  // Wait up to 3.0 seconds for GigaPub SDK to attach trigger function
  let waited = 0;
  while (!getFn() && waited < 3000) {
    await new Promise(r => setTimeout(r, 150));
    waited += 150;
  }

  let fn = getFn();
  if (typeof fn !== 'function') {
    console.warn('[AdManager] GigaPub SDK unit 8093 not ready. Seamlessly attempting fallback ad...');
    return await showAdexiumAd();
  }

  const startTime = Date.now();

  try {
    console.log(`[AdManager] 🚀 Executing GigaPub rewarded ad (Unit 8093, Placement: ${placement})...`);
    
    // Call window.showGiga() as per GigaPub official integration
    const adExecutionPromise = Promise.resolve().then(() => {
      return fn.call(window.GigaPub || window);
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Ad session timeout')), 35000);
    });

    // Await GigaPub ad completion
    await Promise.race([adExecutionPromise, timeoutPromise]);

    const elapsed = (Date.now() - startTime) / 1000;
    console.log(`[AdManager] ✅ GigaPub ad completed successfully! (${elapsed.toFixed(1)}s)`);
    return { success: true, network: 'gigapub' };
  } catch (err) {
    console.warn('[AdManager] GigaPub ad session caught:', err);
    const errMessage = String(err?.message || err || '').toLowerCase();
    
    // If user cancelled or dismissed
    if (errMessage.includes('cancel') || errMessage.includes('close') || errMessage.includes('skip') || errMessage.includes('dismiss') || errMessage.includes('early')) {
      return {
        success: false,
        network: 'gigapub',
        error: 'Ad was closed early. You must watch the entire ad to get progress.'
      };
    }

    // If GigaPub failed with no-fill or error, use fallback
    console.warn('[AdManager] GigaPub unfulfilled. Seamlessly trying backup ad...');
    return await showAdexiumAd();
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

const ADEXIUM_SCRIPT_URL = 'https://cdn.tgads.space/assets/js/adexium-widget.min.js';
const ADEXIUM_SCRIPT_ID  = 'adexium-ad-sdk';
const ADEXIUM_WID = 'e93d690f-bdc3-4ed5-8d9f-8f208afa3774';

/**
 * Initializes the Adexium Ad SDK script dynamically if not present
 */
export function initAdexiumAds() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!document.getElementById(ADEXIUM_SCRIPT_ID)) {
    try {
      const s = document.createElement('script');
      s.id = ADEXIUM_SCRIPT_ID;
      s.src = ADEXIUM_SCRIPT_URL;
      s.async = true;
      document.head.appendChild(s);
      console.log('[AdManager] 🚀 Initialized Adexium ad SDK (wid: ' + ADEXIUM_WID + ')');
    } catch (e) {
      console.error('[AdManager] Adexium script injection error:', e);
    }
  }
}

// Auto-initialize Adexium
initAdexiumAds();

/**
 * Executes a real on-demand Adexium interstitial/rewarded ad session
 */
export async function showAdexiumAd() {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Browser environment required' };
  }

  try {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
    }
  } catch(e) {}

  initAdexiumAds();

  // Wait up to 3.5 seconds for Adexium SDK
  let waited = 0;
  while (typeof window.AdexiumWidget !== 'function' && typeof window.TGAdsWidget !== 'function' && waited < 3500) {
    await new Promise(r => setTimeout(r, 150));
    waited += 150;
  }

  const WidgetClass = window.AdexiumWidget || window.TGAdsWidget;
  if (typeof WidgetClass !== 'function') {
    return {
      success: false,
      network: 'adexium',
      error: 'Adexium ad network is loading. Please tap again in a moment.'
    };
  }

  let widget;
  try {
    widget = new WidgetClass({
      wid: ADEXIUM_WID,
      adFormat: 'interstitial',
      adImpressionIntervalInSeconds: 0,
      firstAdImpressionIntervalInSeconds: 0
    });
  } catch (err) {
    console.error('[AdManager] AdexiumWidget initialization error:', err);
    return {
      success: false,
      network: 'adexium',
      error: 'Failed to initialize Adexium. Please try again.'
    };
  }

  // Clear rate limit caches so each user tap can request an ad
  try {
    if (widget.ls) {
      widget.ls.setItem('lastAdViewed', '1970-01-01T00:00:00.000Z');
    }
    if (widget.afV2) {
      widget.afV2.clearShowState(ADEXIUM_WID);
    }
  } catch(e) {}

  const startTime = Date.now();

  try {
    console.log('[AdManager] 🚀 Requesting real on-demand Adexium ad...');

    // Explicitly request real ad from Adexium bid server
    let ads = [];
    try {
      ads = await widget.requestAd('interstitial', true);
    } catch(e) {
      console.warn('[AdManager] Adexium requestAd error:', e);
    }

    if (!ads || !Array.isArray(ads) || ads.length === 0) {
      console.warn('[AdManager] Adexium returned no fill on bid-request. Seamlessly showing live backup ad...');
      return await showMonetagAd();
    }

    // Display the real ad overlay in the Mini App DOM
    widget.displayAd(ads, 'interstitial');

    // Wait for the ad timer completion (Adexium built-in 15s countdown) or close event
    const adResult = await new Promise((resolve) => {
      let isCompleted = false;

      const onCompleted = () => {
        isCompleted = true;
        console.log('[AdManager] Adexium adPlaybackCompleted fired.');
      };

      const onClosed = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        if (isCompleted || elapsed >= 14.0) {
          resolve({ success: true });
        } else {
          resolve({
            success: false,
            error: `Ad was closed early (${elapsed.toFixed(1)}s). You must watch the entire 15-second ad!`
          });
        }
      };

      widget.on('adPlaybackCompleted', onCompleted);
      widget.on('adClosed', onClosed);

      // Timeout safety: if ad is watched for 16s, mark completed
      setTimeout(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed >= 14.5) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: 'Ad session timed out. Please watch the full ad.' });
        }
      }, 20000);
    });

    if (!adResult.success) {
      return {
        success: false,
        network: 'adexium',
        error: adResult.error || 'Ad closed early.'
      };
    }

    const totalElapsed = (Date.now() - startTime) / 1000;
    console.log(`[AdManager] ✅ Adexium ad successfully watched & verified! (${totalElapsed.toFixed(1)}s)`);
    return { success: true, network: 'gigapub' };
  } catch (err) {
    console.error('[AdManager] Adexium on-demand execution error:', err);
    return {
      success: false,
      network: 'adexium',
      error: 'Ad playback error. Please try again.'
    };
  }
}

export function waitForGiga() { return Promise.resolve(true); }

