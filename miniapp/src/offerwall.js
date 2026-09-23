import { BACKEND_URL } from './api';

let offerWallSDKInstance = null;
let currentUserId = null;
let rewardListeners = new Set();
let initPromise = null;
let fallbackModalContainer = null;

/**
 * Setup Telegram user session storage so GigaPub's TelegramParser never fails
 */
function ensureTelegramUserData(userId) {
  if (!userId) return;
  try {
    const numId = parseInt(userId, 10);
    if (!isNaN(numId) && numId > 0) {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('telegramWebApp', JSON.stringify({
          user: { id: numId, first_name: 'User' },
          platform: 'web',
          version: '7.0'
        }));
        window.sessionStorage.setItem('tgWebAppData', `user=${encodeURIComponent(JSON.stringify({ id: numId, is_premium: false }))}`);

        if (window.Telegram && window.Telegram.WebApp) {
          if (!window.Telegram.WebApp.initDataUnsafe || !window.Telegram.WebApp.initDataUnsafe.user) {
            window.Telegram.WebApp.initDataUnsafe = {
              ...(window.Telegram.WebApp.initDataUnsafe || {}),
              user: { id: numId }
            };
          }
        }
      }
    }
  } catch (e) {
    console.warn('[Offerwall] Failed to set session data:', e);
  }
}

/**
 * Handle server-side claim and local confirmation
 */
async function handleRewardClaim(data) {
  console.log('[Offerwall] Reward claim received:', data);
  try {
    const targetUserId = data.userId || currentUserId;
    const resp = await fetch(`${BACKEND_URL}/api/offerwall/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: targetUserId,
        rewardId: data.rewardId,
        projectId: data.projectId || '7451',
        amount: data.amount,
        hash: data.hash
      })
    });

    const result = await resp.json();
    console.log('[Offerwall] Server reward claim response:', result);

    // Confirm reward with GigaPub SDK if instance exists
    if (offerWallSDKInstance && typeof offerWallSDKInstance.confirmReward === 'function') {
      await offerWallSDKInstance.confirmReward(data.rewardId, data.hash);
    }

    // Notify all UI listeners
    rewardListeners.forEach((listener) => {
      try {
        listener({
          amount: data.amount,
          rewardId: data.rewardId,
          result
        });
      } catch (e) {
        console.error('[Offerwall] Error in reward listener:', e);
      }
    });
  } catch (err) {
    console.error('[Offerwall] Error handling reward claim:', err);
  }
}

/**
 * Initialize the GigaPub Offerwall SDK
 * @param {string|number} telegramId
 * @param {Function} [onReward] Callback when a reward is credited
 */
export function initOfferwall(telegramId, onReward) {
  if (telegramId) {
    currentUserId = String(telegramId);
    ensureTelegramUserData(currentUserId);
  }

  if (onReward && typeof onReward === 'function') {
    rewardListeners.add(onReward);
  }

  if (offerWallSDKInstance) {
    return Promise.resolve(offerWallSDKInstance);
  }

  if (initPromise) {
    return initPromise;
  }

  // Global message listener for iframe postMessage communication
  if (typeof window !== 'undefined' && !window._gigapub_message_listener_added) {
    window._gigapub_message_listener_added = true;
    window.addEventListener('message', (event) => {
      const data = event.data;
      if (data && typeof data === 'object') {
        if (data.action === 'REWARD_CLAIM' && data.payload) {
          handleRewardClaim(data.payload);
        } else if (data.action === 'CLOSE_OFFERWALL') {
          closeFallbackModal();
        } else if (data.action === 'OPEN_LINK' && data.payload?.url) {
          if (window.Telegram?.WebApp?.openLink) {
            window.Telegram.WebApp.openLink(data.payload.url);
          } else {
            window.open(data.payload.url, '_blank');
          }
        }
      }
    });
  }

  initPromise = new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 15;

    const tryInit = () => {
      attempts++;
      if (typeof window.loadOfferWallSDK === 'function') {
        ensureTelegramUserData(currentUserId);
        window.loadOfferWallSDK({
          projectId: '7451'
        })
          .then((sdk) => {
            offerWallSDKInstance = sdk;
            window.gigaOfferWallSDK = sdk;

            // Set up listener
            sdk.on('rewardClaim', (data) => handleRewardClaim(data));

            resolve(sdk);
          })
          .catch((err) => {
            console.warn('[Offerwall] loadOfferWallSDK warning:', err);
            resolve(null);
          });
      } else if (attempts < maxAttempts) {
        setTimeout(tryInit, 200);
      } else {
        resolve(null);
      }
    };

    if (typeof window.loadOfferWallSDK === 'function') {
      tryInit();
    } else {
      (window.loadGigaSDKCallbacks || (window.loadGigaSDKCallbacks = [])).push(tryInit);
      setTimeout(tryInit, 200);
    }
  });

  return initPromise;
}

/**
 * Open fallback modal iframe if SDK open is unavailable
 */
function openFallbackIframe(userId) {
  if (typeof document === 'undefined') return;

  closeFallbackModal();

  const uid = userId || currentUserId || '123456';
  const iframeUrl = `https://cdn.giga.pub/iframe/1.0.26/?userId=${encodeURIComponent(uid)}&projectId=7451&sdkVersion=1.0.13&platform=web&version=0.0.0&apiUrl=https://wall.giga.pub/api&_t=${Date.now()}`;

  const container = document.createElement('div');
  container.id = 'giga-offerwall-fallback-container';
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.zIndex = '999999';
  container.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
  container.style.backdropFilter = 'blur(4px)';
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'center';
  container.style.padding = '10px';
  container.style.boxSizing = 'border-box';

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕ Close';
  closeBtn.style.position = 'absolute';
  closeBtn.style.top = '12px';
  closeBtn.style.right = '12px';
  closeBtn.style.zIndex = '1000000';
  closeBtn.style.backgroundColor = '#1e1b4b';
  closeBtn.style.color = '#ffffff';
  closeBtn.style.border = '1px solid rgba(255,255,255,0.2)';
  closeBtn.style.borderRadius = '10px';
  closeBtn.style.padding = '8px 14px';
  closeBtn.style.fontWeight = 'bold';
  closeBtn.style.fontSize = '13px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.onclick = () => closeFallbackModal();

  const iframe = document.createElement('iframe');
  iframe.src = iframeUrl;
  iframe.style.border = 'none';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.maxWidth = '480px';
  iframe.style.maxHeight = '92vh';
  iframe.style.borderRadius = '16px';
  iframe.style.boxShadow = '0 10px 40px rgba(0,0,0,0.5)';
  iframe.style.backgroundColor = '#0f172a';
  iframe.allow = 'camera; microphone; payment';
  iframe.setAttribute('allowfullscreen', 'true');

  container.appendChild(closeBtn);
  container.appendChild(iframe);
  document.body.appendChild(container);
  fallbackModalContainer = container;

  // Background click to close
  container.addEventListener('click', (e) => {
    if (e.target === container) {
      closeFallbackModal();
    }
  });
}

function closeFallbackModal() {
  if (fallbackModalContainer && fallbackModalContainer.parentNode) {
    fallbackModalContainer.parentNode.removeChild(fallbackModalContainer);
  }
  fallbackModalContainer = null;
}

/**
 * Open the GigaPub Offerwall modal
 * @param {string|number} [telegramId]
 * @returns {Promise<boolean>}
 */
export async function openOfferwall(telegramId) {
  const uid = telegramId || currentUserId;
  if (uid) {
    ensureTelegramUserData(uid);
  }

  let sdk = offerWallSDKInstance || window.gigaOfferWallSDK;
  if (!sdk) {
    try {
      sdk = await initOfferwall(uid);
    } catch (e) {
      console.warn('[Offerwall] init error:', e);
    }
  }

  if (sdk && typeof sdk.open === 'function') {
    try {
      console.log('[Offerwall] Opening Offerwall through SDK...');
      sdk.open();
      return true;
    } catch (e) {
      console.warn('[Offerwall] SDK open failed, using fallback:', e);
    }
  }

  // Fallback direct iframe modal
  console.log('[Offerwall] Opening Offerwall through direct modal...');
  openFallbackIframe(uid);
  return true;
}

/**
 * Check if the Offerwall SDK is loaded
 */
export function isOfferwallReady() {
  return Boolean(offerWallSDKInstance || window.gigaOfferWallSDK);
}

/**
 * Add a reward claim listener
 */
export function addOfferwallRewardListener(fn) {
  if (typeof fn === 'function') {
    rewardListeners.add(fn);
  }
  return () => {
    rewardListeners.delete(fn);
  };
}
