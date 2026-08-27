const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'miniapp', 'src', 'components', 'SpecialOfferPopup.jsx');
let code = fs.readFileSync(filePath, 'utf8');

// Replace getSeenTimestamp
code = code.replace(
    /function getSeenTimestamp\(\) \{\s*try \{\s*const v = localStorage\.getItem\(LS_SEEN_KEY\);\s*return v \? parseInt\(v, 10\) : Date\.now\(\);\s*\} catch \{ return Date\.now\(\); \}\s*\}/g,
    `function getSeenTimestamp() {
  try {
    const v = localStorage.getItem(LS_SEEN_KEY);
    let seenAt = v ? parseInt(v, 10) : Date.now();
    if (Date.now() - seenAt >= OFFER_DURATION_MS) {
      seenAt = Date.now();
      localStorage.setItem(LS_SEEN_KEY, seenAt.toString());
    }
    return seenAt;
  } catch { return Date.now(); }
}`
);

// Replace expiration logic inside useEffect
code = code.replace(
    /if \(tl\.total <= 0\) \{\s*clearInterval\(timerRef\.current\);\s*setShowBubble\(false\); \/\/ offer expired\s*\}/g,
    `if (tl.total <= 0) {
        // Reset the timer, don't hide the bubble
        localStorage.setItem(LS_SEEN_KEY, Date.now().toString());
      }`
);

fs.writeFileSync(filePath, code, 'utf8');
console.log("Fixed SpecialOfferPopup.jsx successfully.");
