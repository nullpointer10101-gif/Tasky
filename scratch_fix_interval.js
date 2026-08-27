const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'miniapp', 'src', 'components', 'SpecialOfferPopup.jsx');
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(
    /const seenAt = getSeenTimestamp\(\);\s*timerRef\.current = setInterval\(\(\) => \{\s*const tl = calcTimeLeft\(seenAt\);\s*setTimeLeft\(tl\);\s*if \(tl\.total <= 0\) \{\s*\/\/ Reset the timer, don't hide the bubble\s*localStorage\.setItem\(LS_SEEN_KEY, Date\.now\(\)\.toString\(\)\);\s*\}\s*\}, 1000\);/g,
    `let seenAt = getSeenTimestamp();
    timerRef.current = setInterval(() => {
      let tl = calcTimeLeft(seenAt);
      if (tl.total <= 0) {
        seenAt = Date.now();
        localStorage.setItem(LS_SEEN_KEY, seenAt.toString());
        tl = calcTimeLeft(seenAt);
      }
      setTimeLeft(tl);
    }, 1000);`
);

fs.writeFileSync(filePath, code, 'utf8');
console.log("Fixed interval logic successfully.");
