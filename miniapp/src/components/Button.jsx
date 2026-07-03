import React from 'react';
import { motion } from 'framer-motion';

export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) {
  const baseStyle = "inline-flex items-center justify-center font-bold transition-all focus:outline-none rounded-pill";
  
  const variants = {
    primary: "bg-gradient-primary text-ink shadow-soft hover:opacity-90",
    secondary: "bg-surface-soft text-ink hover:bg-border border border-border",
    outline: "bg-transparent border border-border text-ink hover:bg-surface-soft",
    danger: "bg-danger text-ink hover:opacity-90",
  };
  
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-3 text-base",
    lg: "px-6 py-4 text-lg",
  };

  return (
    <motion.button 
      whileTap={{ scale: 0.97 }}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
