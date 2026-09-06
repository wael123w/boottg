import React from 'react';
import { useGame } from '../context/GameContext';
import { Crown, Sparkles } from 'lucide-react';

export const LevelUpModal: React.FC = () => {
  const { levelUpData, dismissLevelUp, t } = useGame();

  if (!levelUpData) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="glass rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl relative animate-in fade-in zoom-in duration-200 border-2 border-cyan-400/50">
        {/* Immersive Glow */}
        <div className="absolute inset-0 bg-cyan-500/15 rounded-3xl blur-2xl pointer-events-none" />

        {/* Crown Icon with Immersive Gradient & Coin Glow */}
        <div className="coin-glow w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 via-amber-500 to-yellow-300 mx-auto flex items-center justify-center shadow-lg text-amber-950 border-2 border-amber-200/40">
          <Crown size={42} className="animate-bounce" />
        </div>

        <div>
          <div className="flex items-center justify-center gap-1.5 text-cyan-400 font-bold text-xs uppercase tracking-widest">
            <Sparkles size={14} />
            <span>{t.congratulations}</span>
            <Sparkles size={14} />
          </div>
          <h2 className="text-2xl font-black text-slate-100 mt-1">
            {t.level_up}!
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            You unlocked higher energy capacity & increased tap multipliers!
          </p>
        </div>

        {/* Level badge */}
        <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-cyan-400/30">
          <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block mb-0.5">
            NEW RANK UNLOCKED
          </span>
          <span className="text-lg font-black text-amber-300">
            Level {levelUpData.level}: {levelUpData.name}
          </span>
        </div>

        <button
          id="btn-dismiss-level-up"
          onClick={dismissLevelUp}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-teal-400 text-black font-black text-sm hover:opacity-95 shadow-[0_0_15px_rgba(34,211,238,0.4)] active:scale-95 transition-all"
        >
          {t.awesome}
        </button>
      </div>
    </div>
  );
};
