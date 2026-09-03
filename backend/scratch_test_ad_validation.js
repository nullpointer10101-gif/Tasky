const globalRef = {};
globalRef.gramAdStartTimes = new Map();

function startWatch(telegram_id) {
  globalRef.gramAdStartTimes.set(telegram_id.toString(), Date.now());
}

function watchAd(telegram_id) {
  const adStartTime = globalRef.gramAdStartTimes.get(telegram_id.toString());
  if (!adStartTime) return { success: false, error: 'Must call startWatch first' };
  const elapsedSec = (Date.now() - adStartTime) / 1000;
  if (elapsedSec < 14) {
    return { success: false, error: `Ad closed too early (${elapsedSec.toFixed(1)}s elapsed). Min 15s required.` };
  }
  globalRef.gramAdStartTimes.delete(telegram_id.toString());
  return { success: true };
}

// Test 1: Immediate watch attempt (cheat)
startWatch('123456');
const cheatResult = watchAd('123456');
console.log('Test 1 (Immediate switch back):', cheatResult);

// Test 2: Honest 15s watch
startWatch('123456');
globalRef.gramAdStartTimes.set('123456', Date.now() - 15000); // simulate 15s elapsed
const honestResult = watchAd('123456');
console.log('Test 2 (15s watch time):', honestResult);
