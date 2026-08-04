import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  const colors = {
    success: 'bg-success text-white',
    error: 'bg-danger text-white',
    info: 'bg-blue-500 text-white'
  };

  return (
    <AnimatePresence>
      <motion.div
        className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] px-6 py-4 rounded-2xl shadow-2xl font-bold text-center text-sm w-[85%] max-w-xs leading-relaxed ${colors[type]}`}
      >
        {message}
      </motion.div>
    </AnimatePresence>
  );
}
