const fs = require('fs');
const path = require('path');

const hashbeeDir = 'd:/antigravity/HashBee';
const missionsPath = path.join(hashbeeDir, 'miniapp/src/pages/Missions.tsx');

let code = fs.readFileSync(missionsPath, 'utf8');

// 1. Add requirement notice banner
const oldHeader = `          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-black text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
              <span>👥</span> REFERRAL MILESTONES (UP TO +500 GHS)
            </span>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
              VIRAL BOOST
            </span>
          </div>`;

const newHeader = `          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-black text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
              <span>👥</span> REFERRAL MILESTONES (UP TO +500 GHS)
            </span>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
              VIRAL BOOST
            </span>
          </div>

          {/* Requirement Info Box */}
          <div className="mb-3.5 p-3 rounded-2xl bg-[#141e1a] border border-[#283d35] flex items-start gap-2.5 text-xs text-stone-300 shadow-sm">
            <span className="text-amber-400 text-sm mt-0.5 flex-shrink-0">⚡</span>
            <div className="space-y-1">
              <div className="font-extrabold text-amber-300 tracking-wide text-[11px] uppercase">Invite Requirements</div>
              <div className="text-[11px] text-stone-300 leading-relaxed">
                • <strong className="text-stone-100">10 Friends Tier:</strong> Counts all new joins directly.<br/>
                • <strong className="text-emerald-400">20+ Milestones:</strong> Requires <strong className="text-emerald-300">Active Miners</strong> (friends who collect at least 1 harvest).
              </div>
            </div>
          </div>`;

if (code.includes(oldHeader)) {
  code = code.replace(oldHeader, newHeader);
  console.log('✅ Added Invite Requirement banner to Missions.tsx');
}

// 2. Enhance progress text with Active label
const oldProgressText = `{progress + '/' + count + ' (' + percent + '%)'}`;
const newProgressText = `{count <= 10 ? (progress + '/' + count + ' (' + percent + '%)') : (progress + '/' + count + ' Active (' + percent + '%)')}`;

if (code.includes(oldProgressText)) {
  code = code.replace(oldProgressText, newProgressText);
  console.log('✅ Updated progress text with Active label');
}

fs.writeFileSync(missionsPath, code, 'utf8');
console.log('✅ Saved Missions.tsx');
