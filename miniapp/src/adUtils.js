/**
 * Waits for the Giga ad network (window.showGiga) to become available.
 * Polls every 200ms for up to `timeoutMs` milliseconds (default 5s).
 * Resolves true if loaded, false if timed out.
 */
export function waitForGiga(timeoutMs = 5000) {
  return new Promise((resolve) => {
    if (typeof window.showGiga === 'function') {
      resolve(true);
      return;
    }
    const interval = 200;
    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += interval;
      if (typeof window.showGiga === 'function') {
        clearInterval(timer);
        resolve(true);
      } else if (elapsed >= timeoutMs) {
        clearInterval(timer);
        resolve(false);
      }
    }, interval);
  });
}
