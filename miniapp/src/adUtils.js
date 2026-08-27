/**
 * Comprehensive & Resilient Ad Network Manager (AdsGram + GigaPub + Monetag Backup + Traffic Split)
 */

import { getWithdrawalSettings } from './api';

const GIGA_SCRIPT_URL = 'https://ad.gigapub.tech/script?id=7451';
const SCRIPT_ID = 'gigapub-ad-sdk';

let isInjecting = false;
let injectionAttempts = 0;
const MAX_INJECTION_ATTEMPTS = 3;

// --- AdsGram Config ---
let isInjectingAdsGram = false;
let adsgramInjectionAttempts = 0;
const ADSGRAM_SCRIPT_URL = 'https://sad.adsgram.ai/js/adgram.min.js';
const ADSGRAM_SCRIPT_ID = 'adsgram-ad-sdk';

// --- Monetag Backup Config ---
let isInjectingMonetag = false;
let monetagInjectionAttempts = 0;
const MONETAG_SCRIPT_URL = 'https://libtl.com/sdk.js';
const MONETAG_SCRIPT_ID = 'monetag-ad-sdk';

export function initAdsGram() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (typeof window.Adsgram === 'object') return;
  if (isInjectingAdsGram) return;
  
  if (document.getElementById(ADSGRAM_SCRIPT_ID)) return;
  if (adsgramInjectionAttempts >= MAX_INJECTION_ATTEMPTS) return;

  isInjectingAdsGram = true;
  adsgramInjectionAttempts++;

  try {
    const script = document.createElement('script');
    script.id = ADSGRAM_SCRIPT_ID;
    script.src = ADSGRAM_SCRIPT_URL;
    script.async = true;
    script.crossOrigin = 'anonymous';

    script.onload = () => {
      isInjectingAdsGram = false;
      console.log('[AdManager] AdsGram script loaded successfully');
    };

    script.onerror = (err) => {
      isInjectingAdsGram = false;
      console.warn('[AdManager] AdsGram script load error:', err);
    };

    document.head.appendChild(script);
  } catch (err) {
    isInjectingAdsGram = false;
    console.error('[AdManager] Failed to inject AdsGram script:', err);
  }
}

export function initMonetagAds() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (typeof window.show_11395836 === 'function') return;
  if (isInjectingMonetag) return;
  
  if (document.getElementById(MONETAG_SCRIPT_ID)) return;
  if (monetagInjectionAttempts >= MAX_INJECTION_ATTEMPTS) return;

  isInjectingMonetag = true;
  monetagInjectionAttempts++;

  try {
    const script = document.createElement('script');
    script.id = MONETAG_SCRIPT_ID;
    script.src = MONETAG_SCRIPT_URL;
    script.setAttribute('data-zone', '11395836');
    script.setAttribute('data-sdk', 'show_11395836');
    script.async = true;
    script.crossOrigin = 'anonymous';

    script.onload = () => {
      isInjectingMonetag = false;
      console.log('[AdManager] Monetag script loaded successfully');
    };

    script.onerror = (err) => {
      isInjectingMonetag = false;
      console.warn('[AdManager] Monetag script load error:', err);
    };

    document.head.appendChild(script);
  } catch (err) {
    isInjectingMonetag = false;
    console.error('[AdManager] Failed to inject Monetag script:', err);
  }
}

// Patch Telegram.WebApp.showAlert to suppress annoying ad fill alerts from third-party networks
if (typeof window !== 'undefined' && window.Telegram?.WebApp?.showAlert) {
  const originalShowAlert = window.Telegram.WebApp.showAlert;
  window.Telegram.WebApp.showAlert = function(message, callback) {
    const msg = String(message).toLowerCase();
    if (msg.includes('ad') && (msg.includes('not available') || msg.includes('currently'))) {
      console.warn('[AdManager] Suppressed native ad alert:', message);
      if (callback) callback();
      return;
    }
    return originalShowAlert.apply(this, arguments);
  };
}

/**
 * Dynamically injects or re-injects the GigaPub script if not present or failed.
 */
export function initGigaAds(forceReinject = false) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  if (typeof window.showGiga === 'function' && !forceReinject) {
    return;
  }

  if (isInjecting && !forceReinject) return;

  const existingScript = document.getElementById(SCRIPT_ID);
  if (existingScript && !forceReinject) {
    return;
  }

  if (existingScript && forceReinject) {
    existingScript.remove();
  }

  if (injectionAttempts >= MAX_INJECTION_ATTEMPTS && !forceReinject) {
    return;
  }

  isInjecting = true;
  injectionAttempts++;

  try {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    const cacheBuster = forceReinject ? `&_t=${Date.now()}` : '';
    script.src = `${GIGA_SCRIPT_URL}${cacheBuster}`;
    script.async = true;
    script.crossOrigin = 'anonymous';

    script.onload = () => {
      isInjecting = false;
      console.log('[AdManager] GigaPub script loaded successfully');
    };

    script.onerror = (err) => {
      isInjecting = false;
      console.warn('[AdManager] GigaPub script load error:', err);
    };

    document.head.appendChild(script);
  } catch (err) {
    isInjecting = false;
    console.error('[AdManager] Failed to inject ad script:', err);
  }
}

/**
 * Waits for the Giga ad network (window.showGiga) to become available.
 */
export function waitForGiga(timeoutMs = 12000) {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && typeof window.showGiga === 'function') {
      resolve(true);
      return;
    }

    initGigaAds();

    const interval = 150;
    let elapsed = 0;
    let reinjected = false;

    const timer = setInterval(() => {
      elapsed += interval;

      if (typeof window !== 'undefined' && typeof window.showGiga === 'function') {
        clearInterval(timer);
        resolve(true);
        return;
      }

      if (elapsed >= 3500 && !reinjected) {
        reinjected = true;
        console.log('[AdManager] Retrying GigaPub script injection...');
        initGigaAds(true);
      }

      if (elapsed >= timeoutMs) {
        clearInterval(timer);
        console.warn(`[AdManager] GigaPub timeout after ${timeoutMs}ms`);
        resolve(false);
      }
    }, interval);
  });
}

/**
 * Waits for the AdsGram SDK to load.
 */
export function waitForAdsGram(timeoutMs = 12000) {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && typeof window.Adsgram === 'object') {
      resolve(true);
      return;
    }

    initAdsGram();

    const interval = 150;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += interval;

      if (typeof window !== 'undefined' && typeof window.Adsgram === 'object') {
        clearInterval(timer);
        resolve(true);
        return;
      }

      if (elapsed >= timeoutMs) {
        clearInterval(timer);
        console.warn(`[AdManager] AdsGram timeout after ${timeoutMs}ms`);
        resolve(false);
      }
    }, interval);
  });
}

/**
 * High-level helper to play a rewarded ad reliably with traffic split and fallback routing.
 * @param {string} placement - Placement name (default: "main")
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function showRewardedAd(placement = 'main') {
  // 1. Fetch current dynamic traffic split settings
  let adsgramBlockId = '8223';
  let adsgramRatio = 50;
  let gigapubRatio = 50;

  try {
    const settingsRes = await getWithdrawalSettings();
    if (settingsRes && settingsRes.data) {
      adsgramBlockId = settingsRes.data.adsgram_block_id || '8223';
      adsgramRatio = settingsRes.data.adsgram_ratio !== undefined ? Number(settingsRes.data.adsgram_ratio) : 50;
      gigapubRatio = settingsRes.data.gigapub_ratio !== undefined ? Number(settingsRes.data.gigapub_ratio) : 50;
    }
  } catch (e) {
    console.warn('[AdManager] Failed to load dynamic ad split settings, using 50/50 default:', e);
  }

  const totalWeight = adsgramRatio + gigapubRatio;
  const rand = Math.floor(Math.random() * (totalWeight > 0 ? totalWeight : 100));
  const primaryIsAdsGram = rand < adsgramRatio;

  console.log(`[AdManager] Routing decision: primaryIsAdsGram=${primaryIsAdsGram} (AdsGram: ${adsgramRatio}%, GigaPub: ${gigapubRatio}%)`);

  const tryMonetag = async () => {
    if (typeof window !== 'undefined' && typeof window.show_11395836 === 'function') {
      console.log('[AdManager] Trying Monetag fallback...');
      await Promise.race([
        window.show_11395836(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Monetag timeout')), 60000))
      ]);
      return { success: true };
    }
    throw new Error('Monetag not available');
  };

  const tryGiga = async () => {
    if (typeof window !== 'undefined' && typeof window.showGiga === 'function') {
      console.log('[AdManager] Trying GigaPub...');
      await Promise.race([
        window.showGiga(placement),
        new Promise((_, reject) => setTimeout(() => reject(new Error('GigaPub timeout')), 60000))
      ]);
      return { success: true };
    }
    const isReady = await waitForGiga(4000);
    if (isReady && typeof window.showGiga === 'function') {
      console.log('[AdManager] GigaPub loaded after wait...');
      await Promise.race([
        window.showGiga(placement),
        new Promise((_, reject) => setTimeout(() => reject(new Error('GigaPub timeout')), 60000))
      ]);
      return { success: true };
    }
    throw new Error('GigaPub not available');
  };

  const tryAdsGram = async () => {
    if (typeof window !== 'undefined' && typeof window.Adsgram === 'object') {
      console.log('[AdManager] Trying AdsGram...');
      const adController = window.Adsgram.init({ blockId: adsgramBlockId });
      const result = await adController.show();
      if (result && result.done) {
        return { success: true };
      }
      throw new Error('AdsGram ad skipped or closed early');
    }
    const isReady = await waitForAdsGram(4000);
    if (isReady && typeof window.Adsgram === 'object') {
      console.log('[AdManager] AdsGram loaded after wait...');
      const adController = window.Adsgram.init({ blockId: adsgramBlockId });
      const result = await adController.show();
      if (result && result.done) {
        return { success: true };
      }
      throw new Error('AdsGram ad skipped or closed early');
    }
    throw new Error('AdsGram not available');
  };

  try {
    if (primaryIsAdsGram) {
      try {
        return await tryAdsGram();
      } catch (adsGramError) {
        const errStr = String(adsGramError.message || adsGramError).toLowerCase();
        if (errStr.includes('skip') || errStr.includes('closed') || errStr.includes('early')) {
          throw adsGramError; // User skipped the ad, do not trigger fallback!
        }
        console.warn('[AdManager] AdsGram failed, falling back to GigaPub:', adsGramError);
        try {
          return await tryGiga();
        } catch (gigaError) {
          const gigaErrStr = String(gigaError.message || gigaError).toLowerCase();
          if (gigaErrStr.includes('skip') || gigaErrStr.includes('closed') || gigaErrStr.includes('cancel') || gigaErrStr.includes('early')) {
            throw gigaError;
          }
          console.warn('[AdManager] GigaPub fallback failed, trying Monetag:', gigaError);
          return await tryMonetag();
        }
      }
    } else {
      try {
        return await tryGiga();
      } catch (gigaError) {
        const errStr = String(gigaError.message || gigaError).toLowerCase();
        if (errStr.includes('skip') || errStr.includes('closed') || errStr.includes('cancel') || errStr.includes('early')) {
          throw gigaError;
        }
        console.warn('[AdManager] GigaPub failed, falling back to AdsGram:', gigaError);
        try {
          return await tryAdsGram();
        } catch (adsGramError) {
          const adsGramErrStr = String(adsGramError.message || adsGramError).toLowerCase();
          if (adsGramErrStr.includes('skip') || adsGramErrStr.includes('closed') || adsGramErrStr.includes('early')) {
            throw adsGramError;
          }
          console.warn('[AdManager] AdsGram fallback failed, trying Monetag:', adsGramError);
          return await tryMonetag();
        }
      }
    }
  } catch (err) {
    console.error('[AdManager] Ad playback error:', err);
    
    // Check if user skipped or closed early
    const errMsg = String(err?.message || err || '').toLowerCase();
    if (errMsg.includes('closed') || errMsg.includes('skip') || errMsg.includes('cancel') || errMsg.includes('early')) {
      return {
        success: false,
        error: 'You must watch the entire ad to receive credit.'
      };
    }

    return {
      success: false,
      error: 'You must watch the entire ad to get the reward.'
    };
  }
}

// Automatically initiate preloading when this module is imported
if (typeof window !== 'undefined') {
  initGigaAds();
  initMonetagAds();
  initAdsGram();
}
