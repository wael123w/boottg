import React from 'react';
import { useGame } from '../context/GameContext';
import { Pickaxe, Zap, CheckSquare, Users, Trophy, Wallet } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, t, gameState } = useGame();

  const navItems = [
    { id: 'game' as const, label: t.game, icon: Pickaxe },
    { id: 'boosts' as const, label: t.boosts, icon: Zap, badge: gameState?.active_boosts?.length ? 'active' : null },
    { id: 'tasks' as const, label: t.tasks, icon: CheckSquare },
    { id: 'referrals' as const, label: t.referrals, icon: Users },
    { id: 'leaderboard' as const, label: t.leaderboard, icon: Trophy },
    { id: 'wallet' as const, label: t.wallet, icon: Wallet },
  ];

  return (
    <div className="fixed bottom-2 left-3 right-3 z-40 max-w-md mx-auto pointer-events-none">
      <nav className="glass rounded-3xl p-1.5 shadow-2xl shadow-black/80 border border-white/10 pointer-events-auto">
        <div className="grid grid-cols-6 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all relative ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-400/30 shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="relative">
                  <Icon size={19} className={isActive ? 'scale-110 text-cyan-400 transition-transform' : ''} />
                  {item.badge && (
                    <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  )}
                </div>
                <span className="text-[10px] mt-1 tracking-tight truncate max-w-full leading-none">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
