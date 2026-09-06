import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { Zap, Flame, BatteryCharging, Clock, ArrowRight } from 'lucide-react';
import { Boost } from '../types';

export const BoostModal: React.FC = () => {
  const { gameState, activateBoost, t } = useGame();
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/boosts')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setBoosts(data.data.available_boosts);
        }
      });
  }, []);

  const handleActivate = async (boostId: string) => {
    setLoadingId(boostId);
    await activateBoost(boostId);
    setLoadingId(null);
  };

  const getBoostIcon = (type: string) => {
    switch (type) {
      case 'turbo':
        return <Flame className="text-red-400" size={24} />;
      case 'full_energy':
        return <BatteryCharging className="text-cyan-400" size={24} />;
      case 'double_profit':
        return <Zap className="text-amber-400" size={24} />;
      default:
        return <Zap className="text-cyan-400" size={24} />;
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-24 space-y-4">
      {/* Immersive Glass Header */}
      <div className="glass rounded-3xl p-5 border border-white/10 text-center relative overflow-hidden shadow-2xl">
        <div className="absolute -right-8 -bottom-8 w-28 h-28 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="text-[10px] uppercase tracking-widest text-cyan-400 font-semibold mb-1">
          POWERUPS & ACCELERATORS
        </div>
        <h2 className="text-2xl font-black text-slate-100 mb-1">{t.boost_shop}</h2>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">{t.boost_desc}</p>
      </div>

      {/* Active Boosters */}
      {gameState?.active_boosts && gameState.active_boosts.length > 0 && (
        <div className="glass-cyan rounded-3xl p-4 space-y-2.5 shadow-xl shadow-cyan-950/30">
          <div className="flex items-center gap-2 text-xs font-black text-cyan-400 uppercase tracking-wider">
            <Clock size={15} />
            <span>{t.active_boosts}</span>
          </div>
          <div className="space-y-2">
            {gameState.active_boosts.map((ab) => (
              <div
                key={ab.id}
                className="flex items-center justify-between bg-slate-900/80 rounded-2xl px-3.5 py-2.5 border border-white/10 text-xs"
              >
                <div className="flex items-center gap-2">
                  <Flame size={16} className="text-red-400 animate-pulse" />
                  <span className="font-bold text-slate-100">{ab.name}</span>
                </div>
                <span className="font-mono text-cyan-400 font-bold">
                  {Math.max(0, Math.ceil((new Date(ab.expires_at).getTime() - Date.now()) / 1000))}s remaining
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Boost List */}
      <div className="space-y-3">
        {boosts.map((boost) => {
          const isFree = boost.is_free;
          const canAfford = (gameState?.balance.coins || 0) >= boost.cost;
          const isLoading = loadingId === boost.id;

          return (
            <div
              key={boost.id}
              className="glass rounded-3xl p-4 border border-white/10 flex items-center justify-between gap-3 hover:border-cyan-400/30 transition-all shadow-xl"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-slate-900/90 border border-white/10 flex items-center justify-center shrink-0 shadow-inner">
                  {getBoostIcon(boost.type)}
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-slate-100 truncate">{boost.name}</span>
                    {isFree && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                        {t.free_daily}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-1">{boost.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-amber-400 font-mono">
                      {isFree ? 'FREE' : `${boost.cost.toLocaleString()} ${gameState?.settings.coin_symbol}`}
                    </span>
                    {boost.duration_seconds > 0 && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        ⏱ {boost.duration_seconds}s
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                id={`btn-activate-boost-${boost.id}`}
                disabled={isLoading || (!isFree && !canAfford)}
                onClick={() => handleActivate(boost.id)}
                className={`shrink-0 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-md ${
                  isFree
                    ? 'bg-gradient-to-r from-cyan-400 to-teal-400 text-black hover:opacity-90 active:scale-95 shadow-[0_0_12px_rgba(34,211,238,0.35)]'
                    : canAfford
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-black hover:opacity-90 active:scale-95 shadow-[0_0_12px_rgba(251,191,36,0.35)]'
                    : 'bg-slate-900/70 text-slate-500 cursor-not-allowed border border-white/5'
                }`}
              >
                {isLoading ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  <>
                    <span>{t.activate}</span>
                    <ArrowRight size={13} />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
