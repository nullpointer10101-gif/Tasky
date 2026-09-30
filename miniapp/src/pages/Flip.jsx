import React from 'react';
import { motion } from 'framer-motion';
import CyberFlip from '../components/CyberFlip';

export default function Flip({ user, refreshUser }) {
  if (!user) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 space-y-4 pb-24 max-w-md mx-auto min-h-full relative"
    >
      <CyberFlip user={user} refreshUser={refreshUser} />
    </motion.div>
  );
}
