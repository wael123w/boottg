import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { CheckSquare, Gift, ExternalLink, CheckCircle2, Sparkles, Send } from 'lucide-react';
import { TaskItem, DailyRewardDay } from '../types';

export const TasksView: React.FC = () => {
  const { gameState, completeTask, claimDailyReward, t } = useGame();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [dailyDays, setDailyDays] = useState<DailyRewardDay[]>([]);
  const [canClaimDaily, setCanClaimDaily] = useState(false);
  const [streakCount, setStreakCount] = useState(1);
  const [verifyingTaskId, setVerifyingTaskId] = useState<string | null>(null);
  const [isClaimingStreak, setIsClaimingStreak] = useState(false);

  const fetchTasksData = () => {
    fetch('/api/tasks')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setTasks(data.data);
      });

    fetch('/api/daily-reward')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDailyDays(data.data.days);
          setCanClaimDaily(data.data.can_claim);
          setStreakCount(data.data.current_streak);
        }
      });
  };

  useEffect(() => {
    fetchTasksData();
  }, []);

  const handleTaskClick = async (task: TaskItem) => {
    if (task.is_completed || verifyingTaskId) return;

    if (task.url) {
      window.open(task.url, '_blank', 'noopener,noreferrer');
    }

    setVerifyingTaskId(task.id);
    setTimeout(async () => {
      await completeTask(task.id);
      setVerifyingTaskId(null);
      fetchTasksData();
    }, 2800);
  };

  const handleClaimDaily = async () => {
    setIsClaimingStreak(true);
    await claimDailyReward();
    setIsClaimingStreak(false);
    fetchTasksData();
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-24 space-y-5">
      {/* 7-Day Daily Streak Roadmap (Immersive UI Glass Card) */}
      <div className="glass rounded-3xl p-4 border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.25)]">
              <Gift size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-100">{t.daily_reward}</h3>
              <p className="text-[11px] text-cyan-400 font-mono">
                {t.streak}: {streakCount} {streakCount === 1 ? 'day' : 'days'}
              </p>
            </div>
          </div>

          <button
            id="btn-claim-daily-reward"
            disabled={!canClaimDaily || isClaimingStreak}
            onClick={handleClaimDaily}
            className={`px-4 py-2 rounded-2xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-md ${
              canClaimDaily
                ? 'bg-gradient-to-r from-cyan-400 to-teal-400 text-black shadow-[0_0_12px_rgba(34,211,238,0.4)] animate-pulse hover:opacity-95'
                : 'bg-slate-900/80 text-slate-500 cursor-not-allowed border border-white/5'
            }`}
          >
            {isClaimingStreak ? (
              <span className="animate-pulse">...</span>
            ) : canClaimDaily ? (
              <>
                <Sparkles size={13} />
                <span>{t.claim_reward}</span>
              </>
            ) : (
              <span>Claimed</span>
            )}
          </button>
        </div>

        {/* 7 Days Row styled matching Immersive UI */}
        <div className="grid grid-cols-7 gap-1.5 pt-1">
          {dailyDays.map((d) => (
            <div
              key={d.day}
              className={`flex flex-col items-center py-2 px-1 rounded-2xl border text-center transition-all ${
                d.is_claimed
                  ? 'bg-slate-900/80 border-amber-400/40 text-amber-400'
                  : d.is_current && canClaimDaily
                  ? 'bg-cyan-500 text-white border-cyan-400 shadow-lg shadow-cyan-500/30'
                  : 'bg-slate-900/40 border-white/5 text-slate-400 opacity-60'
              }`}
            >
              <span className="text-[10px] font-bold opacity-75">D{d.day}</span>
              <span className="text-sm my-0.5">🪙</span>
              <span className="text-[9px] font-black tracking-tight leading-tight">
                {d.reward_coins >= 1000 ? `${d.reward_coins / 1000}k` : d.reward_coins}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Social & Community Tasks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <CheckSquare className="text-cyan-400" size={18} />
            <h3 className="text-sm font-bold text-slate-100">{t.earn_tasks}</h3>
          </div>
          <span className="text-xs text-cyan-400 font-mono">
            {tasks.filter((t) => t.is_completed).length} / {tasks.length} {t.completed}
          </span>
        </div>

        <div className="space-y-3">
          {tasks.map((task) => {
            const isVerifying = verifyingTaskId === task.id;
            return (
              <div
                key={task.id}
                className="glass rounded-3xl p-4 border border-white/10 flex items-center justify-between gap-3 hover:border-cyan-400/30 transition-all shadow-xl"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center shrink-0 text-cyan-300">
                    <Send size={18} />
                  </div>
                  <div className="truncate">
                    <h4 className="font-bold text-sm text-slate-100 truncate">{task.title}</h4>
                    <p className="text-xs text-slate-400 line-clamp-1">{task.description}</p>
                    <div className="flex items-center gap-2 mt-1 font-mono text-xs">
                      <span className="text-amber-400 font-bold">
                        +{task.reward_coins.toLocaleString()} {gameState?.settings.coin_symbol}
                      </span>
                      <span className="text-cyan-400 font-semibold">+{task.reward_xp} XP</span>
                    </div>
                  </div>
                </div>

                <button
                  id={`btn-task-${task.id}`}
                  disabled={task.is_completed || isVerifying}
                  onClick={() => handleTaskClick(task)}
                  className={`shrink-0 px-3.5 py-2 rounded-2xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm ${
                    task.is_completed
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      : isVerifying
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 animate-pulse'
                      : 'bg-slate-900/80 hover:bg-slate-800 text-slate-100 border border-white/10 hover:border-cyan-400/40'
                  }`}
                >
                  {task.is_completed ? (
                    <>
                      <CheckCircle2 size={14} />
                      <span>{t.completed}</span>
                    </>
                  ) : isVerifying ? (
                    <span>{t.verifying}</span>
                  ) : (
                    <>
                      <span>{t.verify_task}</span>
                      <ExternalLink size={12} />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
