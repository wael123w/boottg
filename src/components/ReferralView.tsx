import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { Users, Copy, Check, Share2, Layers } from 'lucide-react';
import { ReferralStats } from '../types';

export const ReferralView: React.FC = () => {
  const { gameState, t } = useGame();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/referrals')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setStats(data.data);
      });
  }, []);

  const refLink = stats?.referral_link || `https://t.me/${gameState?.settings.telegram_bot_username}?start=${gameState?.user.referral_code}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareTelegram = () => {
    const shareText = encodeURIComponent(`🎮 Play ${gameState?.settings.game_name} with me! Tap, complete tasks, and earn ${gameState?.settings.coin_name}!`);
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${shareText}`;
    window.open(shareUrl, '_blank');
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-24 space-y-4">
      {/* Immersive Header card */}
      <div className="glass rounded-3xl p-5 border border-white/10 text-center relative overflow-hidden shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center mx-auto mb-2.5 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.25)]">
          <Users size={24} />
        </div>
        <div className="text-[10px] uppercase tracking-widest text-cyan-400 font-semibold mb-1">
          INVITE & EARN PASSIVE INCOME
        </div>
        <h2 className="text-2xl font-black text-slate-100 mb-1">{t.invite_friends}</h2>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">{t.invite_friends_desc}</p>
      </div>

      {/* Referral Link & Actions */}
      <div className="glass rounded-3xl p-4 border border-white/10 space-y-3 shadow-xl">
        <span className="text-xs font-bold text-slate-300 block">{t.your_referral_link}</span>
        <div className="flex items-center gap-2 bg-slate-900/90 rounded-2xl p-2.5 border border-white/10 text-xs font-mono">
          <span className="truncate text-cyan-300 flex-1">{refLink}</span>
          <button
            id="btn-copy-ref-link"
            onClick={handleCopy}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-colors shrink-0 border border-white/10"
            title={t.copy_link}
          >
            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            id="btn-share-telegram"
            onClick={handleShareTelegram}
            className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-teal-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(34,211,238,0.35)] hover:opacity-95 active:scale-95 transition-all"
          >
            <Share2 size={14} />
            <span>{t.share_telegram}</span>
          </button>

          <button
            id="btn-copy-ref-quick"
            onClick={handleCopy}
            className="w-full py-2.5 px-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-bold text-xs border border-white/10 flex items-center justify-center gap-1.5 transition-all hover:border-cyan-400/40"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copied ? t.copied : t.copy_link}</span>
          </button>
        </div>
      </div>

      {/* Multi-Tier Commission Breakdown */}
      <div className="glass rounded-3xl p-4 border border-white/10 space-y-3 shadow-xl">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
          <Layers size={16} className="text-cyan-400" />
          <span>Multi-Level Network Earnings</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-900/80 rounded-2xl p-3 border border-white/10">
            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Tier 1</span>
            <span className="text-base font-black text-amber-400 font-mono block">
              {gameState?.settings.referral_l1_percent || 10}%
            </span>
            <span className="text-[10px] text-slate-400">
              {stats?.tiers.l1.count || 0} friends
            </span>
          </div>

          <div className="bg-slate-900/80 rounded-2xl p-3 border border-white/10">
            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Tier 2</span>
            <span className="text-base font-black text-cyan-400 font-mono block">
              {gameState?.settings.referral_l2_percent || 3}%
            </span>
            <span className="text-[10px] text-slate-400">
              {stats?.tiers.l2.count || 0} friends
            </span>
          </div>

          <div className="bg-slate-900/80 rounded-2xl p-3 border border-white/10">
            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Tier 3</span>
            <span className="text-base font-black text-purple-400 font-mono block">
              {gameState?.settings.referral_l3_percent || 1}%
            </span>
            <span className="text-[10px] text-slate-400">
              {stats?.tiers.l3.count || 0} friends
            </span>
          </div>
        </div>

        <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">{t.total_referral_earned}</span>
          <span className="text-amber-400 font-mono font-black text-sm">
            {(stats?.total_earned_referral || 0).toLocaleString()} {gameState?.settings.coin_symbol}
          </span>
        </div>
      </div>

      {/* Friends list */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-bold text-slate-300">{t.invited_friends}</h4>
          <span className="text-xs text-cyan-400 font-mono">
            {stats?.total_invited || 0} total
          </span>
        </div>

        {stats?.recent_referrals && stats.recent_referrals.length > 0 ? (
          <div className="space-y-2">
            {stats.recent_referrals.map((friend, idx) => (
              <div
                key={idx}
                className="glass rounded-2xl p-3 border border-white/10 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full border border-cyan-400 bg-slate-800 flex items-center justify-center font-bold text-cyan-300 text-xs shadow-[0_0_8px_rgba(34,211,238,0.3)]">
                    {friend.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-bold text-slate-100 block">@{friend.username}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Lv.{friend.level} • Tier {friend.tier}
                    </span>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <span className="text-amber-400 font-bold block">+{friend.earned.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-400">{gameState?.settings.coin_symbol}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass rounded-3xl p-6 text-center border border-white/10 text-xs text-slate-400">
            {t.no_referrals_yet}
          </div>
        )}
      </div>
    </div>
  );
};
