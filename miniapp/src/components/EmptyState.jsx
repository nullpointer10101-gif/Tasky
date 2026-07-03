import React from 'react';
import { motion } from 'framer-motion';
import { PackageOpen } from 'lucide-react';

export default function EmptyState({ icon: Icon = PackageOpen, title = "Nothing here yet", message = "Check back later for updates." }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="flex flex-col items-center justify-center p-8 text-center"
    >
      <div className="bg-surface-soft p-4 rounded-full mb-4">
        <Icon size={32} className="text-ink-faint" />
      </div>
      <h3 className="text-lg font-bold text-ink mb-1">{title}</h3>
      <p className="text-sm text-ink-soft">{message}</p>
    </motion.div>
  );
}
