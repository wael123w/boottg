import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Zap, Gift, Trophy, Sparkles, RefreshCw, Flame, HelpCircle } from 'lucide-react';

export const TapCoin: React.FC = () => {
  const {
    gameState,
    handleTap,
    tapSparks,
    t,
    setActiveTab,
    pendingTaps,
    isSyncing,
    openTutorial,
  } = useGame();

  const [isPressed, setIsPressed] = useState(false);

  if (!gameState) return null;

  const { balance, energy, level, current_xp, next_level_xp, rank, active_boosts, can_claim_daily, settings } = gameState;

  // Multiplier calculation
  const turboBoost = active_boosts.find((b) => b.type === 'turbo');
  const doubleProfit = active_boosts.find((b) => b.type === 'double_profit');
  const currentMultiplier = level.tap_multiplier * (turboBoost ? turboBoost.multiplier : 1) * (doubleProfit ? doubleProfit.multiplier : 1);

  // Energy percentage
  const energyPercent = Math.min(100, Math.max(0, (energy.current_energy / level.max_energy) * 100));

  // XP percentage
  const currentLevelBaseXp = level.xp_required;
  const xpInCurrentLevel = Math.max(0, current_xp - currentLevelBaseXp);
  const xpNeededForNext = Math.max(1, next_level_xp - currentLevelBaseXp);
  const xpPercent = Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForNext) * 100));

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-140px)] px-4 py-3 max-w-md mx-auto relative select-none">
      {/* Immersive Giant Background Watermark */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 text-cyan-400/10 font-black text-[130px] leading-none select-none pointer-events-none font-mono tracking-widest z-0">
        TAP
      </div>

      {/* Top Banner: Streak / Active Boosts */}
      <div className="w-full flex items-center justify-between gap-2 mb-2 z-10">
        {/* Daily Streak Pill */}
        <button
          id="btn-daily-streak"
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${
            can_claim_daily
              ? 'glass-cyan text-cyan-300 animate-pulse shadow-[0_0_15px_rgba(34,211,238,0.3)]'
              : 'glass text-slate-300 border-white/10'
          }`}
        >
          <Gift size={14} className="text-cyan-400" />
          <span>
            {t.streak}: {gameState.daily_streak}
          </span>
          {can_claim_daily && (
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping ml-0.5" />
          )}
        </button>

        {/* Active Boost Alert */}
        {turboBoost ? (
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-black animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.3)]">
            <Flame size={14} />
            <span>TURBO {turboBoost.multiplier}X ACTIVE!</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass border-white/10 text-xs font-bold text-slate-300">
            <Sparkles size={14} className="text-amber-400" />
            <span>
              +{currentMultiplier} {settings.coin_symbol} {t.per_tap}
            </span>
          </div>
        )}

        {/* Sync Status Badge */}
        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
          {isSyncing ? (
            <span className="flex items-center gap-1 text-cyan-400">
              <RefreshCw size={11} className="animate-spin text-cyan-400" />
              <span>Syncing</span>
            </span>
          ) : pendingTaps > 0 ? (
            <span className="text-cyan-400">+{pendingTaps} queued</span>
          ) : (
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Score Display (Immersive Card) */}
      <div className="glass px-6 py-2.5 rounded-2xl flex flex-col items-center my-2 border border-white/10 shadow-xl shadow-black/50 z-10">
        <div className="text-[10px] uppercase tracking-widest text-cyan-400 font-semibold mb-0.5">
          {t.available_balance || 'TOTAL BALANCE'}
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-3xl sm:text-4xl font-black text-amber-400 font-mono tracking-tight drop-shadow-md">
            {balance.coins.toLocaleString()}
          </span>
          <span className="text-xl text-amber-300/80">🪙</span>
        </div>
        <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mt-0.5 font-mono">
          {settings.coin_name} ({settings.coin_symbol})
        </span>
      </div>

      {/* The Central Coin Tap Button with Immersive Glow */}
      <div className="relative my-auto py-4 flex items-center justify-center z-10">
        {/* Ambient Back Glow */}
        <div
          className={`absolute w-72 h-72 rounded-full bg-[radial-gradient(circle,_rgba(34,211,238,0.35)_0%,_rgba(251,191,36,0.15)_50%,_transparent_70%)] blur-2xl pointer-events-none transition-all duration-300 ${
            isPressed ? 'scale-125 opacity-100' : 'scale-100 opacity-70'
          }`}
        />

        {/* Tap Coin Container */}
        <button
          id="coin-tap-button"
          onPointerDown={(e) => {
            setIsPressed(true);
            handleTap(e);
          }}
          onPointerUp={() => setIsPressed(false)}
          onPointerLeave={() => setIsPressed(false)}
          aria-label={t.tap_to_earn}
          className={`coin-glow relative w-64 h-64 sm:w-72 sm:h-72 rounded-full cursor-pointer focus:outline-none transition-transform duration-75 ease-out select-none active:outline-none ${
            isPressed ? 'scale-95 coin-glow-active' : 'hover:scale-[1.02]'
          }`}
          style={{
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {/* Coin Outer Ring */}
          <div className="w-full h-full rounded-full p-2 bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 shadow-2xl flex items-center justify-center border-4 border-amber-200/30">
            {/* Inner Ring with Texture */}
            <div className="w-full h-full rounded-full p-3 bg-gradient-to-tr from-[#121827] via-[#1f293d] to-[#0c101a] flex items-center justify-center border-2 border-amber-400/50 shadow-inner">
              {/* Coin Medallion */}
              <div className="w-full h-full rounded-full bg-gradient-to-b from-amber-400 via-amber-500 to-amber-700 flex flex-col items-center justify-center relative overflow-hidden shadow-lg">
                {/* Metallic diagonal shine overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/25 to-transparent pointer-events-none" />

                {/* Central Emblem */}
                <div className="text-6xl sm:text-7xl mb-1 filter drop-shadow-lg transform active:rotate-6 transition-transform">
                  🪙
                </div>
                <div className="font-black text-xs sm:text-sm tracking-widest text-amber-950 uppercase drop-shadow-sm font-mono">
                  {settings.game_name}
                </div>
                <div className="text-[10px] font-bold text-amber-900/90 tracking-tight">
                  {t.tap_to_earn}
                </div>
              </div>
            </div>
          </div>
        </button>

        {/* Floating Tap Spark Numbers (+1, +3, etc.) */}
        {tapSparks.map((spark) => (
          <div
            key={spark.id}
            className="absolute pointer-events-none font-black text-2xl text-amber-300 drop-shadow-[0_2px_8px_rgba(34,211,238,0.8)] animate-float-fade"
            style={{
              left: `${spark.x ? Math.max(20, Math.min(spark.x - 40, window.innerWidth - 80)) : 120}px`,
              top: `${spark.y ? spark.y - 120 : 150}px`,
            }}
          >
            +{spark.amount}
          </div>
        ))}
      </div>

      {/* Bottom Status Panel: Immersive Energy & Level Progression */}
      <div className="w-full space-y-3 mt-2 glass rounded-3xl p-4 border border-white/10 shadow-2xl z-10">
        {/* Energy Bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <span className="text-xl">⚡</span>
              <span className="font-bold text-base text-slate-100">{energy.current_energy}</span>
              <span className="text-slate-500 text-xs font-mono">/ {level.max_energy}</span>
            </div>
            <div className="text-xs text-amber-400 font-medium">
              {t.recharge || 'Recharge'}: +{energy.regen_rate}/s
            </div>
          </div>

          <div className="w-full h-3.5 bg-slate-900/90 rounded-full p-0.5 border border-white/10 overflow-hidden">
            <div
              className="energy-fill h-full rounded-full transition-all duration-300"
              style={{ width: `${energyPercent}%` }}
            />
          </div>
        </div>

        {/* Level & Rank info */}
        <div className="pt-2.5 border-t border-white/10">
          <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="text-cyan-400 font-mono">Lv.{level.level}</span>
              <span className="text-slate-100 font-medium">{level.name}</span>
            </div>
            <div className="flex items-center gap-1 text-slate-400 text-[11px]">
              <Trophy size={13} className="text-amber-400" />
              <span>
                {t.rank} #{rank}
              </span>
            </div>
          </div>

          <div className="w-full h-2 bg-slate-900/90 rounded-full p-0.5 border border-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.5)] transition-all duration-300"
              style={{ width: `${xpPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 font-mono">
            <span>{current_xp.toLocaleString()} XP</span>
            <button
              id="btn-open-tutorial-main"
              onClick={openTutorial}
              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold font-sans transition-colors py-0.5 px-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/20"
            >
              <HelpCircle size={11} />
              <span>{t.tutorial}</span>
            </button>
            <span>{next_level_xp.toLocaleString()} XP</span>
          </div>
        </div>
      </div>
    </div>
  );
};
