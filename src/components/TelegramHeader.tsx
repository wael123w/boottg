import React from 'react';
import { useGame } from '../context/GameContext';
import { Volume2, VolumeX, Smartphone, Globe, Shield, Wrench, MessageSquare, BookOpen, HelpCircle } from 'lucide-react';

export const TelegramHeader: React.FC = () => {
  const {
    gameState,
    language,
    setLanguage,
    soundEnabled,
    toggleSound,
    hapticEnabled,
    toggleHaptic,
    activeTab,
    setActiveTab,
    openTutorial,
    t,
  } = useGame();

  const user = gameState?.user;
  const level = gameState?.level;

  return (
    <header className="sticky top-0 z-40 glass border-b border-white/10 px-4 py-2.5 transition-all shadow-lg shadow-black/50">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
        {/* User profile with Immersive cyan-ringed avatar */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full border-2 border-cyan-400 p-0.5 bg-slate-800 shadow-[0_0_14px_rgba(34,211,238,0.4)]">
              <img
                src={user?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                alt={user?.first_name || 'Miner'}
                className="w-full h-full rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="absolute -bottom-1 -right-1 bg-gradient-to-r from-amber-400 to-yellow-300 text-black text-[10px] font-black px-1.5 rounded-full leading-tight shadow-md">
              {level?.level || 1}
            </span>
          </div>

          <div className="truncate">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-slate-100 tracking-wide truncate">
                {user?.first_name || 'Miner'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-semibold border border-cyan-400/30 whitespace-nowrap">
                {level?.name || 'Bronze'}
              </span>
            </div>
            <span className="text-xs text-slate-400 font-light">@{user?.username || 'player'}</span>
          </div>
        </div>

        {/* Quick Tools & Toggles */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Audio toggle */}
          <button
            id="btn-toggle-sound"
            onClick={toggleSound}
            aria-label="Toggle Sound"
            className={`p-1.5 rounded-xl border transition-all ${
              soundEnabled
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-400/40 shadow-[0_0_10px_rgba(34,211,238,0.25)]'
                : 'bg-slate-900/60 text-slate-500 border-white/5'
            }`}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Haptic toggle */}
          <button
            id="btn-toggle-haptic"
            onClick={toggleHaptic}
            aria-label="Toggle Haptics"
            className={`p-1.5 rounded-xl border transition-all ${
              hapticEnabled
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-400/40 shadow-[0_0_10px_rgba(34,211,238,0.25)]'
                : 'bg-slate-900/60 text-slate-500 border-white/5'
            }`}
          >
            <Smartphone size={16} />
          </button>

          {/* Tutorial / How to Play button */}
          <button
            id="btn-open-tutorial-header"
            onClick={openTutorial}
            title={t.tutorial}
            aria-label={t.tutorial}
            className="p-1.5 rounded-xl border bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border-cyan-400/30 transition-all shadow-[0_0_8px_rgba(34,211,238,0.2)]"
          >
            <HelpCircle size={16} />
          </button>

          {/* Language toggle (EN / AR) */}
          <button
            id="btn-toggle-lang"
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-xs font-bold text-slate-200 transition-colors shadow-sm"
          >
            <Globe size={14} className="text-cyan-400" />
            <span className="tracking-wider">{language.toUpperCase()}</span>
          </button>

          {/* Portal Switchers */}
          <div className="flex items-center gap-1 pl-1 border-l border-white/10">
            <button
              id="btn-nav-bot"
              onClick={() => setActiveTab(activeTab === 'bot_chat' ? 'game' : 'bot_chat')}
              title={t.bot_chat}
              className={`p-1.5 rounded-xl border transition-all ${
                activeTab === 'bot_chat'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                  : 'bg-slate-900/60 text-slate-400 border-white/5 hover:text-slate-200'
              }`}
            >
              <MessageSquare size={16} />
            </button>

            <button
              id="btn-nav-admin"
              onClick={() => setActiveTab(activeTab === 'admin' ? 'game' : 'admin')}
              title={t.admin}
              className={`p-1.5 rounded-xl border transition-all ${
                activeTab === 'admin'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-400/50 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                  : 'bg-slate-900/60 text-slate-400 border-white/5 hover:text-slate-200'
              }`}
            >
              <Shield size={16} />
            </button>

            <button
              id="btn-nav-installer"
              onClick={() => setActiveTab(activeTab === 'installer' ? 'game' : 'installer')}
              title={t.installer}
              className={`p-1.5 rounded-xl border transition-all ${
                activeTab === 'installer'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'bg-slate-900/60 text-slate-400 border-white/5 hover:text-slate-200'
              }`}
            >
              <Wrench size={16} />
            </button>

            <button
              id="btn-nav-docs"
              onClick={() => setActiveTab(activeTab === 'docs' ? 'game' : 'docs')}
              title={t.docs}
              className={`p-1.5 rounded-xl border transition-all ${
                activeTab === 'docs'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                  : 'bg-slate-900/60 text-slate-400 border-white/5 hover:text-slate-200'
              }`}
            >
              <BookOpen size={16} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
