import React from 'react';
import { motion } from 'framer-motion';
import { Gamepad2 } from 'lucide-react';
import DailyCheckin from '../components/DailyCheckin';
import SpinWheel from '../components/SpinWheel';

const containerVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function Play({ user, refreshUser }) {
  if (!user) return null;

  return (
    <motion.div 
      className="p-4 space-y-6 pb-20 max-w-md mx-auto min-h-full relative"
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <Gamepad2 className="text-brand" size={24} /> 
            Play & Earn
          </h1>
          <p className="text-sm text-ink-soft mt-1">Spin the wheel and claim your daily bonuses!</p>
        </div>
      </div>

      <motion.div variants={itemVariants}>
        <SpinWheel user={user} refreshUser={refreshUser} />
      </motion.div>

      <motion.div variants={itemVariants}>
        <DailyCheckin user={user} refreshUser={refreshUser} />
      </motion.div>
    </motion.div>
  );
}
