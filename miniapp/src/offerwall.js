import { BACKEND_URL } from './api';

let offerWallSDKInstance = null;
let currentUserId = null;
let rewardListeners = new Set();

/**
 * Initialize the GigaPub Offerwall SDK
 * @param {string|number} telegramId
 * @param {Function} [onReward] Callback when a reward is successfully credited
 */
export function initOfferwall(telegramId, onReward) {
  if (telegramId) {
    currentUserId = String(telegramId);
  }

  if (onReward && typeof onReward === 'function') {
    rewardListeners.add(onReward);
  }

  if (offerWallSDKInstance) {
    return Promise.resolve(offerWallSDKInstance);
  }

  return new Promise((resolve) => {
    const initFn = () => {
      if (typeof window.loadOfferWallSDK === 'function') {
        window.loadOfferWallSDK({
          projectId: '8093',
          userId: currentUserId || undefined
        })
          .then((sdk) => {
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
            console.warn('[Offerwall] Error loading Offerwall SDK:', err);
            resolve(null);
          });
      } else {
        // Fallback: wait a moment for script to load
        setTimeout(() => {
          if (typeof window.loadOfferWallSDK === 'function') {
            initFn();
          } else {
            resolve(null);
          }
        }, 1000);
      }
    };

    (window.loadGigaSDKCallbacks || (window.loadGigaSDKCallbacks = [])).push(initFn);
    // If DOM already loaded and function exists, call immediately
    if (typeof window.loadOfferWallSDK === 'function') {
      initFn();
    }
  });
}

/**
 * Open the GigaPub Offerwall modal
 * @returns {boolean} true if opened, false if SDK not ready
 */
export function openOfferwall() {
  if (offerWallSDKInstance && typeof offerWallSDKInstance.open === 'function') {
    offerWallSDKInstance.open();
    return true;
  }
  if (window.gigaOfferWallSDK && typeof window.gigaOfferWallSDK.open === 'function') {
    window.gigaOfferWallSDK.open();
    return true;
  }
  console.warn('[Offerwall] SDK instance not ready yet.');
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
