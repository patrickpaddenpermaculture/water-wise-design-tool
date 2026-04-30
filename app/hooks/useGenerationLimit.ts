import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'paddyo_gen_limit';
const FREE_LIMIT = 4;

interface LimitState {
  count: number;       // generations used today
  date: string;        // YYYY-MM-DD of today's reset
}

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

function loadState(): LimitState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: LimitState = JSON.parse(raw);
      // Reset if it's a new day
      if (parsed.date === todayString()) return parsed;
    }
  } catch {}
  return { count: 0, date: todayString() };
}

function saveState(state: LimitState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function useGenerationLimit() {
  const [state, setState] = useState<LimitState>({ count: 0, date: todayString() });

  // Load from localStorage after mount (client-only)
  useEffect(() => {
    setState(loadState());
  }, []);

  const remaining = Math.max(0, FREE_LIMIT - state.count);
  const isLimitReached = state.count >= FREE_LIMIT;

  const consume = useCallback((): boolean => {
    const current = loadState();
    if (current.count >= FREE_LIMIT) return false; // blocked
    const next = { ...current, count: current.count + 1 };
    saveState(next);
    setState(next);
    return true;
  }, []);

  return { remaining, isLimitReached, consume, FREE_LIMIT };
}
