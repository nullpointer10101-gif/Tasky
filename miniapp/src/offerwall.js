import { BACKEND_URL } from './api';

let offerWallSDKInstance = null;
let currentUserId = null;
let rewardListeners = new Set();
let initPromise = null;

/**
 * Initialize the GigaPub Offerwall SDK
 * @param {string|number} telegramId
 * @param {Function} [onReward] Callback when a reward is successfully credited
 */
export function initOfferwall(telegramId, onReward) {
  if (telegramId) {
    currentUserId = String(telegramId);
    
    // Ensure Telegram user data is detectable by GigaPub's TelegramParser
    try {
      const numId = parseInt(currentUserId, 10);
      if (!isNaN(numId) && numId > 0) {
        if (!window.sessionStorage.getItem('tgWebAppData')) {
          window.sessionStorage.setItem('tgWebAppData', `user=${encodeURIComponent(JSON.stringify({ id: numId }))}`);
        }
        if (!window.sessionStorage.getItem('telegramWebApp')) {
          window.sessionStorage.setItem('telegramWebApp', JSON.stringify({ user: { id: numId } }));
        }
      }
    } catch (e) {
      console.warn('[Offerwall] Session storage setup warning:', e);
    }
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

  initPromise = new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 20;

    const tryInit = () => {
      attempts++;
      if (typeof window.loadOfferWallSDK === 'function') {
        console.log('[Offerwall] Calling loadOfferWallSDK for project 8093...');
        window.loadOfferWallSDK({
          projectId: '8093'
        })
          .then((sdk) => {
            console.log('[Offerwall] SDK initialized successfully:', sdk);
            offerWallSDKInstance = sdk;
            window.gigaOfferWallSDK = sdk;

            // Set up listener for completed offer rewards
            sdk.on('rewardClaim', async (data) => {
              console.log('[Offerwall] Reward claim event received:', data);
              try {
                const targetUserId = data.userId || currentUserId;
                const resp = await fetch(`${BACKEND_URL}/api/offerwall/claim`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: targetUserId,
                    rewardId: data.rewardId,
                    projectId: data.projectId || '8093',
                    amount: data.amount,
                    hash: data.hash
                  })
                });

                const result = await resp.json();
                console.log('[Offerwall] Server reward claim response:', result);

                // Confirm reward with GigaPub SDK
                if (typeof sdk.confirmReward === 'function') {
                  await sdk.confirmReward(data.rewardId, data.hash);
                }

                // Notify all listeners
                rewardListeners.forEach((listener) => {
                  try {
                    listener({
                      amount: data.amount,
                      rewardId: data.rewardId,
                      result
                    });
                  } catch (e) {
                    console.error('[Offerwall] Error in reward listener callback:', e);
                  }
                });
              } catch (err) {
                console.error('[Offerwall] Error handling reward claim:', err);
              }
            });

            resolve(sdk);
          })
          .catch((err) => {
            console.error('[Offerwall] Error from loadOfferWallSDK:', err);
            initPromise = null;
            resolve(null);
          });
      } else if (attempts < maxAttempts) {
        setTimeout(tryInit, 250);
      } else {
        console.warn('[Offerwall] window.loadOfferWallSDK not found after timeout');
        initPromise = null;
        resolve(null);
      }
    };

    // Trigger initialization
    if (typeof window.loadOfferWallSDK === 'function') {
      tryInit();
    } else {
      (window.loadGigaSDKCallbacks || (window.loadGigaSDKCallbacks = [])).push(tryInit);
      setTimeout(tryInit, 300);
    }
  });

  return initPromise;
}

/**
 * Open the GigaPub Offerwall modal
 * @param {string|number} [telegramId]
 * @returns {Promise<boolean>} true if opened, false if failed
 */
export async function openOfferwall(telegramId) {
  let sdk = offerWallSDKInstance || window.gigaOfferWallSDK;
  if (!sdk) {
    sdk = await initOfferwall(telegramId || currentUserId);
  }

  if (sdk && typeof sdk.open === 'function') {
    try {
      console.log('[Offerwall] Opening Offerwall modal...');
      await sdk.open();
      return true;
    } catch (e) {
      console.error('[Offerwall] Error calling sdk.open():', e);
      return false;
    }
  }

  console.warn('[Offerwall] SDK instance could not be opened.');
  return false;
}

/**
 * Check if the Offerwall SDK is loaded and ready
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
