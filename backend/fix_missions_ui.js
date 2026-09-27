const fs = require('fs');

const file = 'D:\\antigravity\\HashBee\\miniapp\\src\\pages\\Missions.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace milestone badge and completion progress rendering
const targetBlock = `            {milestones.map((mission) => {
              const count = mission.milestone_count || 10
              const progress = mission.progress || 0
              const isEligible = progress >= count && !mission.is_completed
              const percent = Math.min(100, Math.round((progress / count) * 100))

              return (
                <div
                  key={mission.id}
                  className="zentorno-card p-3.5 flex flex-col gap-2.5 border border-[#2c3e38]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#23332e] border border-[#344b43] flex items-center justify-center text-amber-300 font-black text-sm flex-shrink-0">
                        {count}👥
                      </div>
                      <div>
                        <div className="text-xs font-extrabold text-stone-200">{mission.title}</div>
                        <div className="text-[11px] font-bold text-[#93b3a6] mt-0.5">
                          +{mission.reward_power} GHS MINING POWER
                        </div>
                      </div>
                    </div>

                    <div>
                      {mission.is_completed ? (
                        <span className="px-3 py-1.5 rounded-xl bg-[#23332e] text-stone-500 font-extrabold text-xs inline-block">
                          DONE ✅
                        </span>
                      ) : isEligible ? (
                        <button
                          onClick={() => handleClaimMilestone(mission)}
                          disabled={actionId === mission.id}
                          className="px-4 py-2 rounded-xl zentorno-btn-primary font-black text-xs uppercase tracking-wider animate-bounce shadow-lg"
                        >
                          {actionId === mission.id ? '...' : ('CLAIM +' + mission.reward_power + ' GHS')}
                        </button>
                      ) : (
                        <button
                          onClick={handleShare}
                          className="px-3 py-1.5 rounded-xl bg-[#1a2622] border border-[#2e423b] text-stone-300 font-bold text-xs hover:border-[#93b3a6] transition-colors"
                        >
                          INVITE
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="w-full flex items-center gap-2.5 pt-1">
                    <div className="flex-1 h-2 bg-[#17231f] rounded-full overflow-hidden border border-[#273a33]">
                      <div
                        className="h-full bg-gradient-to-r from-[#93b3a6] to-emerald-400 transition-all duration-300"
                        style={{ width: percent + '%' }}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-stone-400 shrink-0">
                      {count <= 10 ? (progress + '/' + count + ' (' + percent + '%)') : (progress + '/' + count + ' Active (' + percent + '%)')}
                    </span>
                  </div>
                </div>
              )
            })}`;

const replacementBlock = `            {milestones.map((mission) => {
              const count = mission.milestone_count || 10
              const progress = mission.progress || 0
              const isEligible = progress >= count && !mission.is_completed
              const percent = mission.is_completed ? 100 : Math.min(100, Math.round((progress / count) * 100))

              return (
                <div
                  key={mission.id}
                  className="zentorno-card p-3.5 flex flex-col gap-2.5 border border-[#2c3e38]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 min-w-[54px] px-2.5 rounded-xl bg-[#23332e] border border-[#344b43] flex items-center justify-center gap-1 text-amber-300 font-black text-xs flex-shrink-0 whitespace-nowrap shadow-inner">
                        <span>{count}</span>
                        <span className="text-[11px]">👥</span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-extrabold text-stone-200 truncate">{mission.title}</div>
                        <div className="text-[11px] font-bold text-[#93b3a6] mt-0.5">
                          +{mission.reward_power} GHS MINING POWER
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {mission.is_completed ? (
                        <span className="px-3 py-1.5 rounded-xl bg-[#23332e] text-stone-500 font-extrabold text-xs inline-block whitespace-nowrap">
                          DONE ✅
                        </span>
                      ) : isEligible ? (
                        <button
                          onClick={() => handleClaimMilestone(mission)}
                          disabled={actionId === mission.id}
                          className="px-4 py-2 rounded-xl zentorno-btn-primary font-black text-xs uppercase tracking-wider animate-bounce shadow-lg whitespace-nowrap"
                        >
                          {actionId === mission.id ? '...' : ('CLAIM +' + mission.reward_power + ' GHS')}
                        </button>
                      ) : (
                        <button
                          onClick={handleShare}
                          className="px-3 py-1.5 rounded-xl bg-[#1a2622] border border-[#2e423b] text-stone-300 font-bold text-xs hover:border-[#93b3a6] transition-colors whitespace-nowrap"
                        >
                          INVITE
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="w-full flex items-center gap-2.5 pt-1">
                    <div className="flex-1 h-2 bg-[#17231f] rounded-full overflow-hidden border border-[#273a33]">
                      <div
                        className={'h-full transition-all duration-300 ' + (mission.is_completed ? 'bg-emerald-400' : 'bg-gradient-to-r from-[#93b3a6] to-emerald-400')}
                        style={{ width: percent + '%' }}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-stone-400 shrink-0">
                      {mission.is_completed
                        ? (count + '/' + count + ' (100%)')
                        : count <= 10
                        ? (progress + '/' + count + ' (' + percent + '%)')
                        : (progress + '/' + count + ' Active (' + percent + '%)')}
                    </span>
                  </div>
                </div>
              )
            })}`;

if (code.includes(targetBlock)) {
  code = code.replace(targetBlock, replacementBlock);
  fs.writeFileSync(file, code, 'utf8');
  console.log('Successfully updated Missions.tsx');
} else {
  console.error('targetBlock not found, check matching');
}
