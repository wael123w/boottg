import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { GameState, Language, TaskItem, Boost, DailyRewardDay, LeaderboardEntry, ReferralStats, LedgerTransaction, WithdrawalRequest } from '../types';
import { translations } from '../i18n/translations';
import { soundFx } from '../utils/audio';

interface TapSpark {
  id: number;
  x: number;
  y: number;
  amount: number;
}

interface GameContextType {
  gameState: GameState | null;
  loading: boolean;
  error: string | null;
  language: Language;
  t: typeof translations['en'];
  activeTab: 'game' | 'boosts' | 'tasks' | 'referrals' | 'leaderboard' | 'wallet' | 'admin' | 'installer' | 'docs' | 'bot_chat';
  setActiveTab: (tab: 'game' | 'boosts' | 'tasks' | 'referrals' | 'leaderboard' | 'wallet' | 'admin' | 'installer' | 'docs' | 'bot_chat') => void;
  setLanguage: (lang: Language) => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  hapticEnabled: boolean;
  toggleHaptic: () => void;
  // Game Actions
  handleTap: (e: React.MouseEvent | React.TouchEvent) => void;
  tapSparks: TapSpark[];
  pendingTaps: number;
  levelUpData: { level: number; name: string } | null;
  dismissLevelUp: () => void;
  claimDailyReward: () => Promise<boolean>;
  completeTask: (taskId: string) => Promise<boolean>;
  activateBoost: (boostId: string) => Promise<boolean>;
  requestWithdrawal: (amount: number, method: string, address: string) => Promise<{ success: boolean; message: string }>;
  refreshGameState: () => Promise<void>;
  isSyncing: boolean;
  // Tutorial
  isTutorialOpen: boolean;
  openTutorial: () => void;
  closeTutorial: () => void;
  completeTutorial: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguageState] = useState<Language>('en');
  const [activeTab, setActiveTab] = useState<'game' | 'boosts' | 'tasks' | 'referrals' | 'leaderboard' | 'wallet' | 'admin' | 'installer' | 'docs' | 'bot_chat'>('game');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [tapSparks, setTapSparks] = useState<TapSpark[]>([]);
  const [levelUpData, setLevelUpData] = useState<{ level: number; name: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  // Check if new user should see introductory tutorial
  useEffect(() => {
    if (!loading && gameState) {
      const hasCompleted = localStorage.getItem('tapempire_tutorial_completed');
      if (!hasCompleted) {
        const timer = setTimeout(() => {
          setIsTutorialOpen(true);
        }, 400);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, gameState]);

  const openTutorial = useCallback(() => {
    soundFx.triggerHaptic('selection');
    setIsTutorialOpen(true);
  }, []);

  const closeTutorial = useCallback(() => {
    soundFx.triggerHaptic('selection');
    setIsTutorialOpen(false);
  }, []);

  const completeTutorial = useCallback(() => {
    soundFx.triggerHaptic('success');
    soundFx.playSuccess();
    try {
      localStorage.setItem('tapempire_tutorial_completed', 'true');
    } catch {
      // ignore
    }
    setIsTutorialOpen(false);
  }, []);

  // Tap batch queuing
  const queuedTapsRef = useRef<number>(0);
  const sequenceRef = useRef<number>(1);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [pendingTaps, setPendingTaps] = useState(0);

  // Sync language with HTML document dir
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }
  }, []);

  const t = translations[language];

  // Initialize Telegram WebApp if available
  useEffect(() => {
    try {
      const tg = (window as unknown as { Telegram?: { WebApp?: any } }).Telegram?.WebApp;
      if (tg) {
        tg.ready();
        tg.expand();
        // Extract language from Telegram user if set to arabic
        if (tg.initDataUnsafe?.user?.language_code === 'ar') {
          setLanguage('ar');
        }
      }
    } catch {
      // Ignore
    }
  }, [setLanguage]);

  // Fetch initial game state
  const refreshGameState = useCallback(async () => {
    try {
      const res = await fetch('/api/game');
      const data = await res.json();
      if (data.success) {
        setGameState(data.data);
        setError(null);
      } else if (data.is_maintenance) {
        setError(data.message || 'Game is under maintenance');
      }
    } catch (err: any) {
      setError('Failed to connect to server. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshGameState();
  }, [refreshGameState]);

  // Local Energy regeneration ticker (updates client every second based on regen rate)
  useEffect(() => {
    if (!gameState) return;

    const interval = setInterval(() => {
      setGameState((prev) => {
        if (!prev) return prev;
        const max = prev.level.max_energy;
        if (prev.energy.current_energy >= max) return prev;

        const regenStep = prev.energy.regen_rate;
        return {
          ...prev,
          energy: {
            ...prev.energy,
            current_energy: Math.min(max, prev.energy.current_energy + regenStep),
          },
        };
      });
    }, (gameState?.settings.energy_regen_interval || 3) * 1000);

    return () => clearInterval(interval);
  }, [gameState?.level.max_energy, gameState?.settings.energy_regen_interval]);

  // Flush Queued Taps to Server
  const flushTaps = useCallback(async () => {
    const tapsToSend = queuedTapsRef.current;
    if (tapsToSend <= 0) return;

    queuedTapsRef.current = 0;
    setPendingTaps(0);
    setIsSyncing(true);

    sequenceRef.current += 1;
    const nonce = `nonce_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const res = await fetch('/api/game/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taps: tapsToSend,
          nonce,
          sequence: sequenceRef.current,
          timestamp: Date.now(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setGameState((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            balance: {
              ...prev.balance,
              coins: data.data.current_balance,
            },
            energy: {
              ...prev.energy,
              current_energy: data.data.current_energy,
            },
            current_xp: data.data.current_xp,
            level: data.data.level_info,
          };
        });

        if (data.data.level_up) {
          setLevelUpData({
            level: data.data.current_level,
            name: data.data.level_info.name,
          });
          soundFx.playLevelUp();
          soundFx.triggerHaptic('success');
        }
      } else {
        if (data.error_code === 'TAP_LIMIT_EXCEEDED' || data.error_code === 'SPEED_HACK_BANNED') {
          soundFx.triggerHaptic('error');
          setError(data.message);
        }
        // Rollback state by refreshing
        refreshGameState();
      }
    } catch {
      // Revert if network failed
      refreshGameState();
    } finally {
      setIsSyncing(false);
    }
  }, [refreshGameState]);

  // Tap handler (Instant response, particle animations, audio synthesis, queued sync)
  const handleTap = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!gameState) return;

      const currentEnergy = gameState.energy.current_energy;
      const tapCost = gameState.settings.tap_cost || 1;

      if (currentEnergy < tapCost) {
        soundFx.triggerHaptic('warning');
        return;
      }

      // Calculate multiplier
      const levelMultiplier = gameState.level.tap_multiplier;
      const turboBoost = gameState.active_boosts.find((b) => b.type === 'turbo');
      const multiplier = levelMultiplier * (turboBoost ? turboBoost.multiplier : 1);
      const coinsEarned = gameState.settings.tap_reward * multiplier;

      // Audio & Haptic
      soundFx.playTap(multiplier);
      soundFx.triggerHaptic('light');

      // Add visual spark
      let clientX = 0;
      let clientY = 0;
      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const sparkId = Date.now() + Math.random();
      setTapSparks((prev) => [...prev.slice(-15), { id: sparkId, x: clientX, y: clientY, amount: coinsEarned }]);
      setTimeout(() => {
        setTapSparks((prev) => prev.filter((s) => s.id !== sparkId));
      }, 900);

      // Optimistic balance & energy update
      setGameState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          balance: {
            ...prev.balance,
            coins: prev.balance.coins + coinsEarned,
          },
          energy: {
            ...prev.energy,
            current_energy: Math.max(0, prev.energy.current_energy - tapCost),
          },
          current_xp: prev.current_xp + (prev.settings.xp_per_tap || 1),
        };
      });

      // Queue tap
      queuedTapsRef.current += 1;
      setPendingTaps(queuedTapsRef.current);

      // Debounced or threshold sync
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      if (queuedTapsRef.current >= 12) {
        flushTaps();
      } else {
        syncTimeoutRef.current = setTimeout(() => {
          flushTaps();
        }, 1200);
      }
    },
    [gameState, flushTaps]
  );

  // Claim Daily Reward
  const claimDailyReward = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/daily-reward/claim', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        soundFx.playSuccess();
        soundFx.triggerHaptic('success');
        await refreshGameState();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Complete Task
  const completeTask = async (taskId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        soundFx.playSuccess();
        soundFx.triggerHaptic('success');
        await refreshGameState();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Activate Boost
  const activateBoost = async (boostId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/boosts/${boostId}/activate`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        soundFx.playSuccess();
        soundFx.triggerHaptic('medium');
        await refreshGameState();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Submit Withdrawal Request
  const requestWithdrawal = async (amount: number, method: string, address: string) => {
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, method, destination_address: address }),
      });
      const data = await res.json();
      if (data.success) {
        soundFx.playSuccess();
        soundFx.triggerHaptic('success');
        await refreshGameState();
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message || 'Withdrawal failed' };
    } catch {
      return { success: false, message: 'Network error submitting request' };
    }
  };

  const toggleSound = () => {
    soundFx.soundEnabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  const toggleHaptic = () => {
    soundFx.hapticEnabled = !hapticEnabled;
    setHapticEnabled(!hapticEnabled);
  };

  const dismissLevelUp = () => setLevelUpData(null);

  return (
    <GameContext.Provider
      value={{
        gameState,
        loading,
        error,
        language,
        t,
        activeTab,
        setActiveTab,
        setLanguage,
        soundEnabled,
        toggleSound,
        hapticEnabled,
        toggleHaptic,
        handleTap,
        tapSparks,
        pendingTaps,
        levelUpData,
        dismissLevelUp,
        claimDailyReward,
        completeTask,
        activateBoost,
        requestWithdrawal,
        refreshGameState,
        isSyncing,
        isTutorialOpen,
        openTutorial,
        closeTutorial,
        completeTutorial,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
