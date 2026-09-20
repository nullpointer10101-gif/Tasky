import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, CheckCircle2, Clock, X, Award, Flame, Lock, Timer, 
  Sparkles, ChevronRight, Gem, AlertTriangle, Play, ShieldAlert,
  ArrowRight, Trophy, Radio, Target, BatteryCharging, Gauge,
  Coins, Star, Check
} from 'lucide-react';
import triggerConfetti from '../confetti';
import { showTowerAd } from '../adUtils';
import { getReactorStatus, startReactorAdView, recordReactorAdView, claimReactorReward } from '../api';
import { useToast } from '../App';

const DURATION_7_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const LS_START_KEY = 'tasky_reactor_7day_start';

export function getReactorDeadlineMs() {
  try {
    let saved = localStorage.getItem(LS_START_KEY);
    if (!saved) {
      saved = Date.now().toString();
      localStorage.setItem(LS_START_KEY, saved);
    }
    return parseInt(saved, 10) + DURATION_7_DAYS_MS;
  } catch {
    return Date.now() + DURATION_7_DAYS_MS;
  }
}

export function calcReactorTimeLeft() {
  const deadline = getReactorDeadlineMs();
  const diff = Math.max(0, deadline - Date.now());
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  return {
    total: diff,
    isExpired: diff <= 0,
    formatted: `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`,
    short: `${d}d ${h}h ${m}m`,
    d, h, m, s
  };
}

export function useReactorTimer() {
  return {
    total: 0,
    isExpired: true,
    formatted: '0d 00h 00m 00s',
    short: '0d 0h 0m',
    d: 0, h: 0, m: 0, s: 0
  };
}

export default function CyberReactorModal() {
  return null;
}

export function CyberReactorFloatingBubble() {
  return null;
}
