const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'miniapp', 'src', 'components', 'SpecialOfferPopup.jsx');
let code = fs.readFileSync(filePath, 'utf8');

// Fix lingering broken emojis
code = code.replace(/ðŸŽ /g, '🎁');

// Fix Bubble Icon UI using safe substring
const bubbleMatch = code.indexOf('<span className="text-[22px] leading-none mb-0.5 select-none">');
if (bubbleMatch !== -1) {
    const endBubble = code.indexOf('20K TASKY</span>', bubbleMatch) + '20K TASKY</span>'.length;
    const newBubble = `<span className="text-[18px] leading-none mb-0.5 select-none">🎁</span>
                <span className="text-[11px] font-black leading-none mt-1 text-[#10b981]" style={{ textShadow: '0 0 10px rgba(16,185,129,0.9)' }}>1 USDT</span>
                <span className="text-[8px] font-bold leading-none mt-0.5" style={{ color: '#fbbf24' }}>+20K TASKY</span>`;
    code = code.substring(0, bubbleMatch) + newBubble + code.substring(endBubble);
}

// Fix Main Modal UI using safe substring
const mainMatch = code.indexOf('<div className="text-center mb-5">');
if (mainMatch !== -1) {
    const searchString = 'Invite {REQUIRED_REFERRALS} valid friends to claim';
    const endMain = code.indexOf(searchString, mainMatch) + searchString.length + 38; // account for closing tags
    const newMain = `<div className="text-center mb-5">
                      <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2.5 }}>
                        <div className="flex items-center justify-center gap-2 mb-1.5">
                           <span className="text-[64px] leading-none font-black text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #34d399, #10b981)', filter: 'drop-shadow(0 0 18px rgba(16,185,129,0.5))' }}>1</span>
                           <span className="text-[38px] leading-none font-black text-[#10b981]" style={{ filter: 'drop-shadow(0 0 12px rgba(16,185,129,0.4))' }}>USDT</span>
                        </div>
                        <div className="flex items-center justify-center gap-1.5">
                           <span className="text-2xl font-black text-amber-400">+{REWARD_TOKENS.toLocaleString()}</span>
                           <span className="text-lg font-bold text-white">TASKY</span>
                        </div>
                      </motion.div>
                      <p className="text-xs mt-3 font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        Invite {REQUIRED_REFERRALS} valid friends to claim
                      </p>
                    </div>`;
    code = code.substring(0, mainMatch) + newMain + code.substring(endMain);
}

fs.writeFileSync(filePath, code, 'utf8');
console.log("Fixed SpecialOfferPopup UI explicitly.");
