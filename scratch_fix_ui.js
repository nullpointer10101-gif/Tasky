const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'miniapp', 'src', 'components', 'SpecialOfferPopup.jsx');
let code = fs.readFileSync(filePath, 'utf8');

// Fix Corrupted Encodings
code = code.replace(/ðŸŽ /g, '🎁');
code = code.replace(/ðŸ”¥/g, '🔥');
code = code.replace(/ðŸš€/g, '🚀');
code = code.replace(/ðŸŽ‰/g, '🎉');
code = code.replace(/â†’/g, '→');
code = code.replace(/âœ…/g, '✅');
code = code.replace(/â”€â”€/g, '──');
code = code.replace(/â€”/g, '—');

// Fix Bubble Icon UI (add 1 USDT)
const oldBubble = `<span className="text-[22px] leading-none mb-0.5 select-none">🎁</span>
                <span className="text-[8px] font-black leading-none" style={{ color: '#fbbf24', letterSpacing: '0.03em' }}>20K TASKY</span>`;

const newBubble = `<span className="text-[18px] leading-none mb-0.5 select-none">🎁</span>
                <span className="text-[9px] font-black leading-none mt-0.5 text-[#10b981]" style={{ textShadow: '0 0 8px rgba(16,185,129,0.8)' }}>1 USDT</span>
                <span className="text-[7px] font-bold leading-none mt-0.5" style={{ color: '#fbbf24' }}>+20K TASKY</span>`;
code = code.replace(oldBubble, newBubble);

// Fix Main Modal UI
const oldMainNumbers = `<div className="text-center mb-5">
                      <motion.div animate={{ scale: [1, 1.03, 1] }} transition={{ repeat: Infinity, duration: 3 }}>
                        <div className="text-5xl font-black text-transparent bg-clip-text mb-1"
                          style={{ backgroundImage: 'linear-gradient(135deg, #f59e0b, #fbbf24, #f59e0b)' }}>
                          +{REWARD_TOKENS.toLocaleString()}
                        </div>
                        <div className="text-white font-black text-xl tracking-wide">TASKY</div>
                      </motion.div>
                      <p className="text-xs mt-1 font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        Invite {REQUIRED_REFERRALS} valid friends to claim
                      </p>
                    </div>`;

const newMainNumbers = `<div className="text-center mb-5">
                      <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2.5 }}>
                        <div className="flex items-center justify-center gap-1.5 mb-1.5">
                           <span className="text-[42px] leading-none font-black text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #34d399, #10b981)', filter: 'drop-shadow(0 0 10px rgba(16,185,129,0.4))' }}>1</span>
                           <span className="text-[28px] leading-none font-black text-[#10b981]">USDT</span>
                        </div>
                        <div className="flex items-center justify-center gap-1.5">
                           <span className="text-xl font-black text-amber-400">+{REWARD_TOKENS.toLocaleString()}</span>
                           <span className="text-base font-bold text-white">TASKY</span>
                        </div>
                      </motion.div>
                      <p className="text-xs mt-3 font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        Invite {REQUIRED_REFERRALS} valid friends to claim
                      </p>
                    </div>`;
code = code.replace(oldMainNumbers, newMainNumbers);

// Fix instructional text
code = code.replace(/→ Claim 20,000 TASKY!/g, '→ Claim 1 USDT + 20K TASKY!');

// Fix Button text
code = code.replace(/Claim \{REWARD_TOKENS\.toLocaleString\(\)\} TASKY!/g, 'Claim 1 USDT + 20K TASKY!');

// Fix submitted text
code = code.replace(/<span className="text-amber-400 font-bold">20,000 TASKY<\/span>/g, '<span className="text-[#10b981] font-bold">1 USDT</span> and <span className="text-amber-400 font-bold">20,000 TASKY</span>');

fs.writeFileSync(filePath, code, 'utf8');
console.log("Fixed SpecialOfferPopup UI successfully.");
