import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), 2200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  const IconMap = {
    success: <CheckCircle2 className="text-emerald-400 shrink-0" size={18} />,
    error: <XCircle className="text-rose-400 shrink-0" size={18} />,
    info: <AlertCircle className="text-indigo-400 shrink-0" size={18} />
  };

  const styleMap = {
    success: 'bg-[#091514]/95 border-emerald-500/30 text-ink shadow-[0_8px_32px_rgba(16,185,129,0.15)]',
    error: 'bg-[#15090f]/95 border-rose-500/30 text-ink shadow-[0_8px_32px_rgba(244,63,94,0.15)]',
    info: 'bg-[#0d0a1b]/95 border-indigo-500/30 text-ink shadow-[0_8px_32px_rgba(99,102,241,0.15)]'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, x: '-50%', scale: 0.92 }}
      animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
      exit={{ opacity: 0, y: -10, x: '-50%', scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={`fixed top-8 left-1/2 z-[9999] px-4.5 py-3 rounded-2xl border backdrop-blur-md flex items-center gap-3 w-[88%] max-w-sm shadow-2xl ${styleMap[type]}`}
    >
      <div className="flex items-center justify-center p-1.5 rounded-xl bg-white/5 border border-white/10 shrink-0">
        {IconMap[type]}
      </div>
      <p className="text-xs font-bold leading-normal text-left tracking-wide select-none">{message}</p>
    </motion.div>
  );
}
