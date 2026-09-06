import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { Trophy, Crown } from 'lucide-react';
import { LeaderboardEntry } from '../types';

export const LeaderboardView: React.FC = () => {
  const { gameState, t } = useGame();
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'all_time'>('all_time');
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setLeaders(data.data.leaderboard);
          setUserRank(data.data.user_rank);
        }
      });
  }, [timeframe]);

  const topThree = leaders.slice(0, 3);
  const restLeaders = leaders.slice(3);

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-24 space-y-4">
      {/* Immersive Header Card */}
      <div className="glass rounded-3xl p-5 border border-white/10 text-center relative overflow-hidden shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center mx-auto mb-2 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.25)]">
          <Trophy size={24} />
        </div>
        <div className="text-[10px] uppercase tracking-widest text-cyan-400 font-semibold mb-1">
          GLOBAL MINING LEADERBOARD
        </div>
        <h2 className="text-2xl font-black text-slate-100 mb-1">{t.hall_of_fame}</h2>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">{t.leaderboard_desc}</p>

        {/* Timeframe selector matching Immersive UI */}
        <div className="flex p-1 bg-slate-900/90 rounded-2xl border border-white/10 mt-4">
          {(['daily', 'weekly', 'monthly', 'all_time'] as const).map((period) => (
            <button
              key={period}
              id={`btn-leaderboard-${period}`}
              onClick={() => setTimeframe(period)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all capitalize ${
                timeframe === period
                  ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {period === 'all_time' ? t.all_time : period}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 Podiums */}
      {topThree.length >= 3 && (
        <div className="grid grid-cols-3 gap-2 items-end pt-2 pb-1">
          {/* #2 Silver */}
          <div className="flex flex-col items-center glass rounded-3xl p-3 border border-white/10 text-center relative shadow-lg">
            <span className="text-xs font-black text-slate-300 mb-1 font-mono">#2</span>
            <img
              src={topThree[1].avatar_url}
              alt=""
              className="w-12 h-12 rounded-full border-2 border-slate-300 mb-1 object-cover shadow-sm"
              referrerPolicy="no-referrer"
            />
            <span className="font-bold text-xs text-slate-200 truncate max-w-full">
              @{topThree[1].username}
            </span>
            <span className="text-[10px] text-cyan-400 font-mono font-bold mt-0.5">
              {(topThree[1].score / 1000).toFixed(0)}k
            </span>
          </div>

          {/* #1 Gold */}
          <div className="flex flex-col items-center bg-gradient-to-b from-amber-500/20 via-slate-900/90 to-slate-950 rounded-3xl p-3.5 border-2 border-amber-400 text-center relative -translate-y-2 shadow-[0_0_20px_rgba(251,191,36,0.3)]">
            <Crown size={22} className="text-amber-400 mb-0.5 animate-bounce" />
            <span className="text-xs font-black text-amber-400 mb-1 font-mono">#1</span>
            <img
              src={topThree[0].avatar_url}
              alt=""
              className="w-14 h-14 rounded-full border-2 border-amber-400 mb-1 object-cover ring-4 ring-amber-400/20 shadow-md"
              referrerPolicy="no-referrer"
            />
            <span className="font-bold text-xs text-amber-300 truncate max-w-full">
              @{topThree[0].username}
            </span>
            <span className="text-xs text-amber-400 font-mono font-black mt-0.5">
              {(topThree[0].score / 1000).toFixed(0)}k
            </span>
          </div>

          {/* #3 Bronze */}
          <div className="flex flex-col items-center glass rounded-3xl p-3 border border-white/10 text-center relative shadow-lg">
            <span className="text-xs font-black text-amber-600 mb-1 font-mono">#3</span>
            <img
              src={topThree[2].avatar_url}
              alt=""
              className="w-12 h-12 rounded-full border-2 border-amber-600 mb-1 object-cover shadow-sm"
              referrerPolicy="no-referrer"
            />
            <span className="font-bold text-xs text-slate-200 truncate max-w-full">
              @{topThree[2].username}
            </span>
            <span className="text-[10px] text-cyan-400 font-mono font-bold mt-0.5">
              {(topThree[2].score / 1000).toFixed(0)}k
            </span>
          </div>
        </div>
      )}

      {/* User's Own Rank Sticky Card */}
      {userRank && (
        <div className="sticky top-14 z-20 glass-cyan rounded-2xl p-3.5 border border-cyan-400/40 flex items-center justify-between text-xs shadow-[0_0_15px_rgba(34,211,238,0.25)]">
          <div className="flex items-center gap-2.5">
            <span className="w-6 font-black text-cyan-400 text-center font-mono">#{userRank.rank}</span>
            <span className="font-bold text-slate-100">{t.your_rank}</span>
          </div>
          <span className="font-mono font-black text-amber-400 text-sm">
            {gameState?.balance.coins.toLocaleString()} {gameState?.settings.coin_symbol}
          </span>
        </div>
      )}

      {/* Ranks 4+ */}
      <div className="space-y-2.5">
        {restLeaders.map((player) => (
          <div
            key={player.user_id}
            className={`rounded-2xl p-3 border flex items-center justify-between text-xs transition-all ${
              player.is_current_user
                ? 'glass-cyan border-cyan-400/40'
                : 'glass border-white/10 hover:border-cyan-400/30'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-black text-slate-400 text-center font-mono text-[11px] border border-white/5">
                {player.rank}
              </span>
              <img
                src={player.avatar_url}
                alt=""
                className="w-9 h-9 rounded-full border border-cyan-400/40 object-cover"
                referrerPolicy="no-referrer"
              />
              <div>
                <span className="font-bold text-slate-100 block">@{player.username}</span>
                <span className="text-[10px] text-cyan-400 font-mono">Lv.{player.level}</span>
              </div>
            </div>

            <div className="text-right font-mono">
              <span className="text-amber-400 font-bold block">{player.score.toLocaleString()}</span>
              <span className="text-[10px] text-slate-400">{gameState?.settings.coin_symbol}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
