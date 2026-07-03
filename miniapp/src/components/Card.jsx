import React from 'react';
import { motion } from 'framer-motion';

export const cardVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export default function Card({ children, className = '', padding = 'p-4', ...props }) {
  return (
    <motion.div 
      variants={cardVariants}
      className={`bg-surface border border-border rounded-2xl shadow-soft overflow-hidden ${padding} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}
