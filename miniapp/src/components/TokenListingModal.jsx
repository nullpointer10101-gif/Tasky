import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Rocket, CheckCircle2, Clock, ShieldCheck, Zap } from 'lucide-react';

export default function TokenListingModal({ isOpen, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#05030f]/95"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="relative w-full max-w-sm bg-gradient-to-b from-[#181135] to-[#0d0924] border border-indigo-500/40 rounded-[2rem] p-6 overflow-hidden shadow-2xl"
          >
            {/* Background Glow removed for performance */}

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full text-ink-soft hover:text-ink hover:bg-surface-soft transition-all z-10"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center mb-6 relative z-10">
              <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-fuchsia-500 rounded-2xl flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                <Rocket size={32} className="text-white" />
              </div>
              <h2 className="text-xl font-black text-ink uppercase tracking-wide">
                TASKY Token Launch
              </h2>
              <p className="text-xs font-medium text-ink-soft mt-1">
                Roadmap to TGE & Exchange Listing
              </p>
            </div>

            <div className="space-y-4 relative z-10">
              {/* Phase 1 */}
              <div className="bg-surface-soft border border-indigo-500/40 rounded-xl p-3 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
                <div className="flex items-start gap-3 ml-2">
                  <CheckCircle2 size={18} className="text-indigo-500 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-sm font-black text-ink mb-0.5">Phase 1: Distribution</h4>
                    <p className="text-[11px] text-ink-soft leading-tight">
                      Community mining, tasks, and massive airdrop allocation.
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                      <span>In Progress</span>
                      <span>87%</span>
                    </div>
                    <div className="w-full h-1.5 bg-indigo-500/20 rounded-full mt-1 overflow-hidden">
                       <div className="h-full bg-indigo-500 w-[87%] rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Phase 2 */}
              <div className="bg-surface-soft border border-border rounded-xl p-3 opacity-80">
                <div className="flex items-start gap-3">
                  <ShieldCheck size={18} className="text-ink-soft mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-sm font-black text-ink mb-0.5">Phase 2: Security & Audit</h4>
                    <p className="text-[11px] text-ink-soft leading-tight">
                      Smart contract audits, anti-bot filtering, and security checks.
                    </p>
                    <span className="inline-block mt-1.5 px-2 py-0.5 bg-surface border border-border rounded text-[9px] font-bold uppercase text-ink-soft">
                      Upcoming
                    </span>
                  </div>
                </div>
              </div>

              {/* Phase 3 */}
              <div className="bg-surface-soft border border-border rounded-xl p-3 opacity-80">
                <div className="flex items-start gap-3">
                  <Clock size={18} className="text-ink-soft mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-sm font-black text-ink mb-0.5">Phase 3: Exchange Listing</h4>
                    <p className="text-[11px] text-ink-soft leading-tight">
                      TGE (Token Generation Event) and listing on major CEXs/DEXs.
                    </p>
                    <span className="inline-block mt-1.5 px-2 py-0.5 bg-surface border border-border rounded text-[9px] font-bold uppercase text-ink-soft">
                      Q4 2026
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 p-3 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center gap-2">
              <Zap size={16} className="text-indigo-500 shrink-0" />
              <p className="text-[10px] text-ink-soft font-medium leading-tight">
                All in-app <strong className="text-ink">TASKY</strong> will be converted 1:1 to the on-chain token at launch. Keep mining!
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full mt-4 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-sm uppercase tracking-wider active:scale-95 transition-all shadow-md"
            >
              GOT IT, LET'S MINE 🚀
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
