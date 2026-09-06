import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { TelegramHeader } from './components/TelegramHeader';
import { BottomNav } from './components/BottomNav';
import { TapCoin } from './components/TapCoin';
import { BoostModal } from './components/BoostModal';
import { TasksView } from './components/TasksView';
import { ReferralView } from './components/ReferralView';
import { LeaderboardView } from './components/LeaderboardView';
import { WalletView } from './components/WalletView';
import { TelegramBotSimulator } from './components/TelegramBotSimulator';
import { AdminDashboard } from './components/AdminDashboard';
import { WebInstaller } from './components/WebInstaller';
import { DocumentationModal } from './components/DocumentationModal';
import { LevelUpModal } from './components/LevelUpModal';
import { TutorialModal } from './components/TutorialModal';
import { AlertCircle, RefreshCw } from 'lucide-react';

const MainContent: React.FC = () => {
  const { activeTab, loading, error, refreshGameState, gameState } = useGame();

  if (loading) {
    return (
      <div className="min-h-screen immersive-bg text-slate-100 flex flex-col items-center justify-center space-y-4 p-4">
        <div className="coin-glow w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-200 flex items-center justify-center text-3xl shadow-xl shadow-cyan-500/20 animate-pulse border border-amber-300/40">
          🪙
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-base font-black tracking-wide text-slate-100 uppercase">
            Loading TapEmpire
          </h2>
          <p className="text-xs text-cyan-400 font-mono flex items-center justify-center gap-1.5">
            <RefreshCw size={13} className="animate-spin text-cyan-400" />
            <span>Connecting to Telegram WebApp...</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen immersive-bg text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black font-['IBM_Plex_Sans_Arabic',sans-serif] relative overflow-x-hidden">
      {/* Telegram Sticky Header */}
      <TelegramHeader />

      {/* Global Alerts / Maintenance Banner if any */}
      {error && (
        <div className="bg-red-500/20 border-b border-red-500/40 px-4 py-2 text-xs text-red-300 font-bold flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-md mx-auto">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
          <button
            onClick={() => refreshGameState()}
            className="text-[11px] underline hover:text-white shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main View Router */}
      <main className="flex-1 w-full max-w-lg mx-auto">
        {activeTab === 'game' && <TapCoin />}
        {activeTab === 'boosts' && <BoostModal />}
        {activeTab === 'tasks' && <TasksView />}
        {activeTab === 'referrals' && <ReferralView />}
        {activeTab === 'leaderboard' && <LeaderboardView />}
        {activeTab === 'wallet' && <WalletView />}
        {activeTab === 'bot_chat' && <TelegramBotSimulator />}
        {activeTab === 'admin' && <AdminDashboard />}
        {activeTab === 'installer' && <WebInstaller />}
        {activeTab === 'docs' && <DocumentationModal />}
      </main>

      {/* Level Up Celebration Modal */}
      <LevelUpModal />

      {/* Introductory / On-Demand Tutorial Modal */}
      <TutorialModal />

      {/* Fixed Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default function App() {
  return (
    <GameProvider>
      <MainContent />
    </GameProvider>
  );
}
