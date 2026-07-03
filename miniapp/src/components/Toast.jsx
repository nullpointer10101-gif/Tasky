import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: 'bg-success text-white',
    error: 'bg-danger text-white',
    info: 'bg-blue-500 text-white'
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, x: '-50%' }}
        animate={{ opacity: 1, y: 0, x: '-50%' }}
        exit={{ opacity: 0, y: -50, x: '-50%' }}
        className={`fixed top-4 left-1/2 z-50 px-4 py-2 rounded-pill shadow-soft font-medium text-sm whitespace-nowrap ${colors[type]}`}
      >
        {message}
      </motion.div>
    </AnimatePresence>
  );
}
