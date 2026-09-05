/**
 * Ad Manager — Primary: Adexium (WID e93d690f-bdc3-4ed5-8d9f-8f208afa3774) | Fallback: GigaPub (7451)
 */

if (typeof window !== 'undefined' && window.fetch && !window._adexiumFetchIntercepted) {
  window._adexiumFetchIntercepted = true;
  const origFetch = window.fetch;
  window.fetch = async function(...args) {
    const url = args[0] ? String(args[0]) : '';
    if (url.includes('bid-request')) {
      console.log('[Adexium Diagnostic] Outgoing bid-request Payload:', args[1]?.body);
      try {
        const res = await origFetch.apply(this, args);
        const clone = res.clone();
        const text = await clone.text();
        console.log('[Adexium Diagnostic] Incoming bid-request Response:', res.status, text);
        window._lastAdexiumStatus = res.status;
        window._lastAdexiumBody = text;
        return res;
      } catch(err) {
        console.error('[Adexium Diagnostic] bid-request Network Error:', err);
        window._lastAdexiumBody = `Network Error: ${err.message}`;
        throw err;
      }
    }
    return origFetch.apply(this, args);
  };
}

const ADEXIUM_SCRIPT_URL = 'https://cdn.tgads.space/assets/js/adexium-widget.min.js';
const ADEXIUM_SCRIPT_ID  = 'adexium-ad-sdk';
const ADEXIUM_WID        = 'e93d690f-bdc3-4ed5-8d9f-8f208afa3774';

let _adexiumInitStarted = false;

export function initAdexiumAds() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  
  if (!window._adexiumInstance && !window.adexiumWidget && !_adexiumInitStarted) {
    _adexiumInitStarted = true;
    const runAdexiumInit = () => {
      if (typeof window.AdexiumWidget !== 'undefined' && !window._adexiumInstance && !window.adexiumWidget) {
        try {
          const hasTgUser = !!(window.Telegram?.WebApp?.initDataUnsafe?.user?.id || window.Telegram?.WebApp?.initData);
          const inst = new window.AdexiumWidget({ 
            wid: ADEXIUM_WID,
            adFormat: 'interstitial',
            debug: !hasTgUser
          });
          window._adexiumInstance = inst;
          window.adexiumWidget = inst;
          try { if (typeof inst.autoMode === 'function') inst.autoMode(); } catch(e) {}
          console.log('[AdManager] ✅ Adexium SDK initialized with Interstitial autoMode');
        } catch (err) {
          _adexiumInitStarted = false;
          console.error('[AdManager] Adexium init error:', err);
        }
      }
    };

    if (typeof window.AdexiumWidget !== 'undefined') {
      runAdexiumInit();
    } else if (!document.getElementById(ADEXIUM_SCRIPT_ID)) {
      try {
        const s = document.createElement('script');
        s.id = ADEXIUM_SCRIPT_ID;
        s.src = ADEXIUM_SCRIPT_URL;
        s.async = true;
        s.onload = runAdexiumInit;
        s.onerror = () => { _adexiumInitStarted = false; };
        document.head.appendChild(s);
      } catch (e) { _adexiumInitStarted = false; }
    }
  }
}

const GIGAPUB_SCRIPT_URL = 'https://ad.gigapub.tech/script?id=7451';
const GIGAPUB_SCRIPT_ID  = 'gigapub-ad-sdk';

export function initGigaAds() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!document.getElementById(GIGAPUB_SCRIPT_ID)) {
    try {
      const s = document.createElement('script');
      s.id = GIGAPUB_SCRIPT_ID;
      s.src = GIGAPUB_SCRIPT_URL;
      s.async = true;
      document.head.appendChild(s);
      console.log('[AdManager] 🚀 Initialized GigaPub fallback script');
    } catch(e) {}
  }
}

export function prefetchGramAd() {
  initAdexiumAds();
  initGigaAds();
}

/**
 * Helper to check if an Adexium, GigaPub, or Monetag ad overlay / iframe is currently on screen
 */
function _isAdexiumAdOnScreen() {
  if (typeof document === 'undefined') return false;

  // 1. Check for specific Adexium / TGAds / GigaPub / Monetag elements
  const adSelectors = [
    'iframe[src*="tgads"]',
    'iframe[src*="adexium"]',
    'iframe[src*="gigapub"]',
    'iframe[src*="monetag"]',
    'iframe[src*="ad"]',
    '[class*="adexium"]',
    '[id*="adexium"]',
    '[class*="tgads"]',
    '[id*="tgads"]',
    '[class*="gigapub"]',
    '[id*="gigapub"]',
    '[class*="monetag"]',
    '[id*="monetag"]',
    '#gigapub',
    '#monetag'
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

  // 2. Check for any full-screen fixed/absolute overlay added outside #root
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

/**
 * Show a rewarded ad.
 * Primary: Adexium (WID e93d690f-bdc3-4ed5-8d9f-8f208afa3774) | Fallback: GigaPub (7451)
 *
 * @param {string} placement
 * @param {{ allowFallback?: boolean, adexiumOnly?: boolean }} [options]
 * @returns {Promise<{ success: boolean, network: 'adexium' | 'gigapub', error?: string }>}
 */
export async function showRewardedAd(placement = 'main', options = {}) {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Browser environment required' };
  }

  const allowFallback = options.allowFallback !== false && !options.adexiumOnly && placement !== 'tasks';

  // Ensure Telegram WebApp ready signal is sent
  try {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
    }
  } catch(e) {}

  initAdexiumAds();
  if (allowFallback) {
    initGigaAds();
  }

  let widget = window._adexiumInstance || window.adexiumWidget;
  if (!widget) {
    let waited = 0;
    while (!window._adexiumInstance && !window.adexiumWidget && waited < 3500) {
      await new Promise(r => setTimeout(r, 150));
      waited += 150;
    }
    widget = window._adexiumInstance || window.adexiumWidget;
  }

  if (!widget) {
    if (allowFallback) {
      console.error('[AdManager] ❌ Adexium SDK initialization timeout. Falling back to GigaPub...');
      return await showGigaPubAdFallback();
    } else {
      console.error('[AdManager] ❌ Adexium SDK initialization timeout. Fallback disabled for Adexium-only task.');
      return { success: false, network: 'adexium', error: 'No Adexium ads available right now. Please try again in a moment.' };
    }
  }

  console.log(`[AdManager] 🎯 Requesting Rewarded Ad via Adexium (Placement: ${placement}, AdexiumOnly: ${!allowFallback})...`, widget);

  // Reset ad tracking flags
  window._adexiumLastAd = null;
  window._adexiumNoAdFound = false;
  const startTime = Date.now();

  try {
    localStorage.removeItem('tg-ads-co-push-like-lastAdViewed');
    localStorage.removeItem('tg-ads-co-interstitial-lastAdViewed');
    localStorage.removeItem('tg-ads-co-video-lastAdViewed');
    localStorage.removeItem('tg-ads-co-html-banner-lastAdViewed');
  } catch(e) {}

  // Ensure valid Telegram initData string
  if (widget.user) {
    if (window.Telegram?.WebApp?.initData) {
      widget.user.initData = window.Telegram.WebApp.initData;
    } else if (!widget.user.initData || typeof widget.user.initData !== 'string') {
      const mockUser = encodeURIComponent(JSON.stringify({ id: 999888777, first_name: "TaskyUser" }));
      const now = Math.floor(Date.now() / 1000);
      widget.user.initData = `auth_date=${now}&hash=0123456789abcdef0123456789abcdef&user=${mockUser}`;
    }
    if (!widget.user.telegramId) {
      widget.user.telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 999888777;
    }
  }

  // Execute Adexium ad request
  let adTriggered = false;
  try {
    if (widget.afV2 && typeof widget.afV2.clearShowState === 'function') {
      widget.afV2.clearShowState(ADEXIUM_WID);
    }

    let ads = null;
    const formatsToTry = ['interstitial', 'video', 'push-like'];
    for (const fmt of formatsToTry) {
      if (window._adexiumLastAd) break;
      console.log(`[AdManager] Requesting clean Adexium ad (${fmt})...`);
      
      try {
        if (typeof widget.requestAd === 'function') {
          ads = await widget.requestAd(fmt, false);
        }
      } catch (e) {
        console.warn(`[AdManager] requestAd error for ${fmt}:`, e);
      }

      if (Array.isArray(ads) && ads.length > 0) {
        console.log(`[AdManager] ✅ Adexium returned fill for format '${fmt}':`, ads);
        window._adexiumLastAd = ads[0];
        window._adexiumAdReceivedAt = Date.now();

        if (ads[0].notificationUrl) {
          try {
            fetch(ads[0].notificationUrl, { mode: 'no-cors' }).catch(() => {});
          } catch(e) {}
        }

        if (typeof widget.displayAd === 'function') {
          widget.displayAd(ads, fmt);
          adTriggered = true;
        }
        break;
      }
    }

    if (!adTriggered && typeof widget.showAd === 'function') {
      console.log('[AdManager] Attempting fallback widget.showAd()...');
      await widget.showAd();
      adTriggered = true;
    }
  } catch (err) {
    console.error('[AdManager] Adexium request call error:', err);
  }

  // Poll up to 4 seconds for ad confirmation
  let adConfirmed = adTriggered;
  if (!adConfirmed) {
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 200));

      if (window._adexiumLastAd && window._adexiumAdReceivedAt > startTime) {
        adConfirmed = true;
        break;
      }

      if (_isAdexiumAdOnScreen()) {
        adConfirmed = true;
        break;
      }

      if (window._adexiumNoAdFound && window._adexiumNoAdAt > startTime && i > 8) {
        break;
      }
    }
  }

  if (adConfirmed) {
    console.log('[AdManager] ✅ Adexium ad confirmed! Listening to completion events...');
    let closed = false;
    const onClosed = () => { closed = true; };

    if (widget.on) {
      try {
        widget.on('adClosed', onClosed);
        widget.on('adPlaybackCompleted', onClosed);
        widget.on('onReward', onClosed);
        widget.on('rewarded', onClosed);
      } catch(e) {}
    }

    // Wait for official SDK completion event or 15-second minimum watch duration
    const adStartTime = Date.now();
    for (let s = 0; s < 50; s++) {
      await new Promise(r => setTimeout(r, 300));
      const elapsedSec = (Date.now() - adStartTime) / 1000;

      // If official closed event fired (and at least 10s elapsed) OR 15 seconds have elapsed while ad was open
      if ((closed && elapsedSec >= 10) || elapsedSec >= 15) {
        console.log(`[AdManager] ✅ Adexium ad completed successfully! (${elapsedSec.toFixed(1)}s)`);
        break;
      }
    }

    if (widget.off) {
      try {
        widget.off('adClosed', onClosed);
        widget.off('adPlaybackCompleted', onClosed);
        widget.off('onReward', onClosed);
        widget.off('rewarded', onClosed);
      } catch(e) {}
    }

    return { success: true, network: 'adexium' };
  }

  if (allowFallback) {
    console.warn('[AdManager] ⚠️ Adexium produced no ad fill. Initiating GigaPub fallback...');
    return await showGigaPubAdFallback();
  }

  return {
    success: false,
    network: 'adexium',
    error: 'No Adexium ads available right now. Please try again in a moment.'
  };
}

/**
 * Fallback Handler for GigaPub (Unit 7451)
 */
export async function showGigaPubAdFallback() {
  initGigaAds();

  let waited = 0;
  while (!window.showGiga && !window.showGigaPubAd && !window.showGigaAd && !window.GigaPub && waited < 3500) {
    await new Promise(r => setTimeout(r, 150));
    waited += 150;
  }

  const gigaStartTime = Date.now();

  try {
    const fn = window.showGiga || window.showGigaPubAd || window.showGigaAd || (window.GigaPub && (window.GigaPub.showAd || window.GigaPub.show)) || window.showAd;
    if (typeof fn === 'function') {
      console.log('[AdManager] Executing GigaPub ad trigger function...');
      fn.call(window.GigaPub || window);

      // Wait 15 seconds for GigaPub ad display and completion
      for (let s = 0; s < 50; s++) {
        await new Promise(r => setTimeout(r, 300));
        const elapsedSec = (Date.now() - gigaStartTime) / 1000;
        if (elapsedSec >= 15) {
          console.log(`[AdManager] ✅ GigaPub ad session completed! (${elapsedSec.toFixed(1)}s)`);
          break;
        }
      }

      return { success: true, network: 'gigapub' };
    }
  } catch (err) {
    console.error('[AdManager] GigaPub fallback execution error:', err);
  }

  const diagInfo = window._lastAdexiumBody ? ` (Adexium: ${window._lastAdexiumStatus || 200})` : '';
  return {
    success: false,
    error: `No ads available right now${diagInfo}. Please try again in a moment.`
  };
}

// Backwards compat stubs
export function initMonetagAds() {}
export function waitForGiga() { return Promise.resolve(false); }

/**
 * Triggers an Adexium ad automatically when opening the bot / mini app.
 * Fallback to GigaPub if Adexium yields no fill on app launch.
 */
export function triggerStartupAd() {
  if (typeof window === 'undefined') return;
  initAdexiumAds();
  initGigaAds();

  setTimeout(async () => {
    console.log('[AdManager] 🚀 Startup ad trigger starting...');

    // Clear frequency capping locks
    try {
      localStorage.removeItem('tg-ads-co-push-like-lastAdViewed');
      localStorage.removeItem('tg-ads-co-interstitial-lastAdViewed');
      localStorage.removeItem('tg-ads-co-video-lastAdViewed');
    } catch(e) {}

    let widget = window._adexiumInstance || window.adexiumWidget;
    if (!widget) {
      let waited = 0;
      while (!window._adexiumInstance && !window.adexiumWidget && waited < 4000) {
        await new Promise(r => setTimeout(r, 150));
        waited += 150;
      }
      widget = window._adexiumInstance || window.adexiumWidget;
    }

    let adShown = false;

    if (widget) {
      console.log('[AdManager] 🎯 Executing startup Adexium ad request...', widget);

      // Ensure valid user context
      if (widget.user) {
        if (window.Telegram?.WebApp?.initData) {
          widget.user.initData = window.Telegram.WebApp.initData;
        } else if (!widget.user.initData || typeof widget.user.initData !== 'string') {
          const mockUser = encodeURIComponent(JSON.stringify({ id: 999888777, first_name: "TaskyUser" }));
          const now = Math.floor(Date.now() / 1000);
          widget.user.initData = `auth_date=${now}&hash=0123456789abcdef0123456789abcdef&user=${mockUser}`;
        }
        if (!widget.user.telegramId) {
          widget.user.telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 999888777;
        }
      }

      if (widget.afV2 && typeof widget.afV2.clearShowState === 'function') {
        widget.afV2.clearShowState(ADEXIUM_WID);
      }

      try {
        if (typeof widget.autoMode === 'function') {
          widget.autoMode();
        }

        // Try showAd first
        if (typeof widget.showAd === 'function') {
          try {
            await widget.showAd();
            console.log('[AdManager] ✅ Startup showAd() triggered!');
            adShown = true;
          } catch(e) {
            console.warn('[AdManager] Startup showAd() note:', e);
          }
        }

        // If not shown yet, iterate formats
        if (!adShown && typeof widget.requestAd === 'function') {
          const formatsToTry = ['interstitial', 'video', 'push-like', 'banner'];
          for (const fmt of formatsToTry) {
            if (adShown) break;
            for (const mot of [true, false]) {
              if (adShown) break;
              try {
                let ads = null;
                if (mot && typeof widget.requestRewardedAd === 'function') {
                  ads = await widget.requestRewardedAd(fmt);
                } else {
                  ads = await widget.requestAd(fmt, mot);
                }
                if (Array.isArray(ads) && ads.length > 0 && typeof widget.displayAd === 'function') {
                  widget.displayAd(ads, fmt);
                  console.log(`[AdManager] ✅ Startup displayAd('${fmt}', motivated: ${mot}) executed!`);
                  adShown = true;
                  break;
                }
              } catch(e) {
                console.warn(`[AdManager] Startup requestAd('${fmt}') error:`, e);
              }
            }
          }
        }

        if (!adShown && typeof widget.autoFetchAd === 'function') {
          try {
            await widget.autoFetchAd();
            adShown = true;
          } catch(e) {}
        }
      } catch (err) {
        console.error('[AdManager] ❌ Startup Adexium exception:', err);
      }
    }

    if (!adShown) {
      console.warn('[AdManager] ⚠️ Adexium produced no startup ad fill. Triggering GigaPub fallback on startup...');
      await showGigaPubAdFallback();
    }
  }, 800);
}

// Permanently trigger startup ad on module load in browser environment
if (typeof window !== 'undefined') {
  triggerStartupAd();
}
