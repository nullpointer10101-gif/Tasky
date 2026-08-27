const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'miniapp', 'src', 'components', 'SpecialOfferPopup.jsx');
let code = fs.readFileSync(filePath, 'utf8');

// Replace getSeenTimestamp to reset if expired
const oldGetSeen = `function getSeenTimestamp() {
  try {
    const v = localStorage.getItem(LS_SEEN_KEY);
    return v ? parseInt(v, 10) : Date.now();
  } catch { return Date.now(); }
}`;

const newGetSeen = `function getSeenTimestamp() {
  try {
    const v = localStorage.getItem(LS_SEEN_KEY);
    let seenAt = v ? parseInt(v, 10) : Date.now();
    // Loop the timer if it expired so the offer stays visible
    if (Date.now() - seenAt >= OFFER_DURATION_MS) {
      seenAt = Date.now();
      localStorage.setItem(LS_SEEN_KEY, seenAt.toString());
    }
    return seenAt;
  } catch { return Date.now(); }
}`;

code = code.replace(oldGetSeen, newGetSeen);

// Replace live countdown expiration
const oldInterval = `      if (tl.total <= 0) {
        clearInterval(timerRef.current);
        setShowBubble(false); // offer expired
      }`;

const newInterval = `      if (tl.total <= 0) {
        // Restart the timer instead of hiding it
        localStorage.setItem(LS_SEEN_KEY, Date.now().toString());
      }`;

code = code.replace(oldInterval, newInterval);

// Make sure we didn't miss anything, write it back
fs.writeFileSync(filePath, code, 'utf8');
console.log("Updated SpecialOfferPopup.jsx successfully.");
