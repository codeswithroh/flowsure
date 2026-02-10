'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

type FloState = 'idle' | 'froth' | 'dapper' | 'success' | 'retry' | 'compensated';

interface FloMascotProps {
  state?: FloState;
  message?: string;
}

const stateConfig = {
  idle: {
    color: 'bg-blue-500',
    emoji: '🌊',
    defaultMessage: 'Welcome to FlowSure!',
  },
  froth: {
    color: 'bg-purple-500',
    emoji: '🫧',
    defaultMessage: 'Stake FROTH to unlock discounts! 🪙',
  },
  dapper: {
    color: 'bg-green-500',
    emoji: '🏀',
    defaultMessage: 'Protect your valuable NFTs!',
  },
  success: {
    color: 'bg-emerald-500',
    emoji: '😎',
    defaultMessage: 'Transaction succeeded!',
  },
  retry: {
    color: 'bg-yellow-500',
    emoji: '😰',
    defaultMessage: 'Retrying transaction...',
  },
  compensated: {
    color: 'bg-pink-500',
    emoji: '🥳',
    defaultMessage: 'You received compensation!',
  },
};

export function FloMascot({ state = 'idle', message }: FloMascotProps) {
  const [showTooltip, setShowTooltip] = useState(true);
  const config = stateConfig[state];
  const displayMessage = message || config.defaultMessage;

  useEffect(() => {
    setShowTooltip(true);
    const timer = setTimeout(() => {
      setShowTooltip(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [state, message]);

  return (
    <motion.div
      className="fixed bottom-8 right-8 z-50"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <div className="relative">
        <motion.div
          className={`w-20 h-20 rounded-full ${config.color} flex items-center justify-center text-4xl shadow-lg cursor-pointer`}
          animate={{
            y: [0, -10, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          whileHover={{ scale: 1.1 }}
          onClick={() => setShowTooltip(!showTooltip)}
        >
          <motion.span
            animate={{
              rotate: state === 'retry' ? [0, -10, 10, -10, 10, 0] : 0,
            }}
            transition={{
              duration: 0.5,
              repeat: state === 'retry' ? Infinity : 0,
              repeatDelay: 1,
            }}
          >
            {config.emoji}
          </motion.span>
        </motion.div>

        {showTooltip && (
          <motion.div
            className="absolute bottom-full right-0 mb-4 w-64"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <div className="bg-background border rounded-lg shadow-lg p-4 relative">
              <div className="absolute -bottom-2 right-8 w-4 h-4 bg-background border-r border-b transform rotate-45" />
              <p className="text-sm font-medium">{displayMessage}</p>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
