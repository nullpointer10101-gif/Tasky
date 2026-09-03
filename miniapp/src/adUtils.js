/**
 * Ad Manager — Adexium (primary) + GigaPub (fallback)
 *
 * Flow:
 * 1. Try Adexium via autoMode() + autoFetchAd() (bidding pipeline)
 * 2. If Adexium has no fill within 8s → fall back to GigaPub window.showGiga()
 * 3. Return { success, network } so UI can show which ad network served
 */

// ── Adexium config ──────────────────────────────────────────────
const ADEXIUM_SCRIPT_URL = 'https://cdn.tgads.space/assets/js/adexium-widget.min.js';
const ADEXIUM_SCRIPT_ID  = 'adexium-ad-sdk';
const ADEXIUM_WID        = 'e93d690f-bdc3-4ed5-8d9f-8f208afa3774';

// ── GigaPub config ───────────────────────────────────────────────
const GIGA_SCRIPT_URL = 'https://ad.gigapub.tech/script?id=7451';
const GIGA_SCRIPT_ID  = 'gigapub-ad-sdk';

let _adexiumInitStarted = false;
let _gigaInitStarted    = false;
let _prefetchDone       = false;

// ── Adexium init ─────────────────────────────────────────────────

export function initAdexiumAds() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window._adexiumInstance) return;
  if (_adexiumInitStarted) return;
  _adexiumInitStarted = true;

  const runInit = () => {
    if (window.AdexiumWidget && !window._adexiumInstance) {
      try {
        window._adexiumInstance = new window.AdexiumWidget({ wid: ADEXIUM_WID });
        window._adexiumInstance.autoMode(); // REQUIRED — activates bidding pipeline
        console.log('[AdManager] ✅ Adexium initialized (autoMode active)');
        setTimeout(_prefetchAdexium, 1000);
      } catch (err) {
        _adexiumInitStarted = false;
        console.error('[AdManager] Adexium init error:', err);
      }
    }
  };

  if (window.AdexiumWidget) { runInit(); return; }

  if (document.getElementById(ADEXIUM_SCRIPT_ID)) {
    const poll = setInterval(() => {
      if (window.AdexiumWidget) { clearInterval(poll); runInit(); }
    }, 100);
    setTimeout(() => clearInterval(poll), 12000);
    return;
  }

  try {
    const s = document.createElement('script');
    s.id = ADEXIUM_SCRIPT_ID;
    s.src = ADEXIUM_SCRIPT_URL;
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.onload = () => { console.log('[AdManager] Adexium script loaded'); runInit(); };
    s.onerror = () => { _adexiumInitStarted = false; console.warn('[AdManager] Adexium script failed'); };
    document.head.appendChild(s);
  } catch (err) {
    _adexiumInitStarted = false;
  }
}

// ── GigaPub init ─────────────────────────────────────────────────

export function initGigaAds() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (typeof window.showGiga === 'function') return;
  if (_gigaInitStarted) return;
  if (document.getElementById(GIGA_SCRIPT_ID)) return;
  _gigaInitStarted = true;

  try {
    const s = document.createElement('script');
    s.id = GIGA_SCRIPT_ID;
    s.src = GIGA_SCRIPT_URL;
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.onload  = () => { _gigaInitStarted = false; console.log('[AdManager] ✅ GigaPub script loaded'); };
    s.onerror = () => { _gigaInitStarted = false; console.warn('[AdManager] GigaPub script failed'); };
    document.head.appendChild(s);
  } catch (err) {
    _gigaInitStarted = false;
  }
}

// ── Prefetch ─────────────────────────────────────────────────────

async function _prefetchAdexium() {
  const widget = window._adexiumInstance;
  if (!widget || _prefetchDone) return;
  try {
    console.log('[AdManager] Pre-fetching Adexium ad...');
    await widget.autoFetchAd();
    _prefetchDone = true;
    console.log('[AdManager] ✅ Adexium ad pre-fetched');
  } catch (e) {
    console.warn('[AdManager] Prefetch error:', e);
  }
}

export function prefetchGramAd() {
  if (!window._adexiumInstance) {
    initAdexiumAds();
    setTimeout(_prefetchAdexium, 1500);
  } else {
    _prefetchAdexium();
  }
  // Also warm up GigaPub script in background
  initGigaAds();
}

// ── DOM detection helper ─────────────────────────────────────────

function _waitForAdOverlay(timeoutMs = 8000) {
  return new Promise(resolve => {
    let detected = false;

    const checkVisible = () => {
      const els = document.querySelectorAll('div, iframe, section');
      for (const el of els) {
        const s = window.getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (
          r.width  > window.innerWidth  * 0.7 &&
          r.height > window.innerHeight * 0.7 &&
          (s.position === 'fixed' || s.position === 'absolute') &&
          s.zIndex !== 'auto' &&
          parseInt(s.zIndex) > 100 &&
          s.display !== 'none' &&
          s.visibility !== 'hidden' &&
          el.id !== 'root'
        ) return true;
      }
      return false;
    };

    const onDetected = () => {
      if (detected) return;
      detected = true;
      observer.disconnect();
      resolve(true);
    };

    if (checkVisible()) { resolve(true); return; }

    const observer = new MutationObserver(() => {
      if (!detected && checkVisible()) onDetected();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    setTimeout(() => {
      if (!detected) { observer.disconnect(); resolve(false); }
    }, timeoutMs);
  });
}

// ── GigaPub ad helper ─────────────────────────────────────────────

function _waitForGiga(timeoutMs = 8000) {
  return new Promise(resolve => {
    if (typeof window.showGiga === 'function') { resolve(true); return; }
    initGigaAds();
    let waited = 0;
    const iv = setInterval(() => {
      waited += 200;
      if (typeof window.showGiga === 'function') { clearInterval(iv); resolve(true); }
      else if (waited >= timeoutMs) { clearInterval(iv); resolve(false); }
    }, 200);
  });
}

// ── Main entry point ──────────────────────────────────────────────

/**
 * Show a rewarded ad.
 * Tries Adexium first; falls back to GigaPub if no Adexium fill.
 *
 * @param {string} placement
 * @returns {Promise<{ success: boolean, network?: 'adexium'|'gigapub', error?: string }>}
 */
export async function showRewardedAd(placement = 'main') {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Browser environment required' };
  }

  // ── 1. Ensure Adexium is initialized ─────────────────────────
  if (!window._adexiumInstance) {
    initAdexiumAds();
    let w = 0;
    while (!window._adexiumInstance && w < 5000) {
      await new Promise(r => setTimeout(r, 200));
      w += 200;
    }
  }

  // ── 2. Try Adexium ───────────────────────────────────────────
  const widget = window._adexiumInstance;
  if (widget) {
    console.log('[AdManager] Trying Adexium...');
    try {
      await widget.autoFetchAd();
    } catch (e) {
      console.warn('[AdManager] Adexium autoFetchAd error:', e);
    }

    const adexiumShown = await _waitForAdOverlay(8000);

    if (adexiumShown) {
      console.log('[AdManager] ✅ Adexium ad confirmed — waiting 15s view time...');
      await new Promise(r => setTimeout(r, 15000));
      // Pre-fetch next ad in background
      _prefetchDone = false;
      setTimeout(_prefetchAdexium, 1000);
      return { success: true, network: 'adexium' };
    }

    console.warn('[AdManager] Adexium no fill — falling back to GigaPub...');
  }

  // ── 3. Fall back to GigaPub ──────────────────────────────────
  console.log('[AdManager] Trying GigaPub fallback...');
  const gigaReady = await _waitForGiga(6000);

  if (!gigaReady || typeof window.showGiga !== 'function') {
    return { success: false, error: 'No ad available right now. Please try again in a moment.' };
  }

  try {
    await window.showGiga(placement);
    console.log('[AdManager] ✅ GigaPub ad completed');
    return { success: true, network: 'gigapub' };
  } catch (err) {
    console.warn('[AdManager] GigaPub error:', err);
    return { success: false, error: 'No ad available right now. Please try again.' };
  }
}

// Stubs
export function initMonetagAds() {}
export function waitForGiga() { return Promise.resolve(false); }
export function triggerStartupAd() {}
