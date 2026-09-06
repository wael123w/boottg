import React, { useState, useEffect, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import {
  X,
  ArrowRight,
  ArrowLeft,
  Pickaxe,
  Zap,
  Coins,
  CheckSquare,
  Users,
  Trophy,
  Flame,
  Gift,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Rocket,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { soundFx } from '../utils/audio';

export const TutorialModal: React.FC = () => {
  const { isTutorialOpen, closeTutorial, completeTutorial, t, language, setActiveTab } = useGame();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  // Reset to step 1 whenever opened
  useEffect(() => {
    if (isTutorialOpen) {
      setCurrentStep(1);
    }
  }, [isTutorialOpen]);

  // Keyboard navigation (Arrow keys & Escape)
  useEffect(() => {
    if (!isTutorialOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        completeTutorial();
      } else if (e.key === 'ArrowRight') {
        if (language === 'ar') {
          handlePrev();
        } else {
          handleNext();
        }
      } else if (e.key === 'ArrowLeft') {
        if (language === 'ar') {
          handleNext();
        } else {
          handlePrev();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTutorialOpen, currentStep, language]);

  const handleNext = () => {
    soundFx.triggerHaptic('selection');
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    } else {
      completeTutorial();
    }
  };

  const handlePrev = () => {
    soundFx.triggerHaptic('selection');
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    soundFx.triggerHaptic('selection');
    completeTutorial();
  };

  const handleGoToTab = (tab: 'tasks' | 'referrals' | 'game') => {
    soundFx.triggerHaptic('success');
    soundFx.playSuccess();
    completeTutorial();
    setActiveTab(tab);
  };

  if (!isTutorialOpen) return null;

  return (
    <div
      id="tutorial-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
    >
      <div className="relative w-full max-w-lg bg-[#080B12]/95 border border-white/10 rounded-3xl shadow-2xl shadow-cyan-950/40 flex flex-col overflow-hidden text-slate-100 max-h-[90vh]">
        {/* Ambient Top Glow Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_rgba(34,211,238,0.8)]" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.3)] shrink-0">
              <Sparkles size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono tracking-widest text-cyan-400 font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-400/20">
                  {t.tutorial_badge}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {t.tutorial_step_count
                    .replace('{current}', String(currentStep))
                    .replace('{total}', String(totalSteps))}
                </span>
              </div>
              <h2 id="tutorial-title" className="text-sm sm:text-base font-black text-slate-100 truncate">
                {t.tutorial_title}
              </h2>
            </div>
          </div>

          {/* Skip Tutorial Button (always visible and prominent) */}
          <button
            id="btn-skip-tutorial"
            onClick={handleSkip}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition-all shadow-sm shrink-0"
            title={t.tutorial_skip}
          >
            <span>{t.tutorial_skip}</span>
            <X size={14} className="text-slate-400" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="w-full bg-slate-900/80 h-1.5 relative overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-amber-400 shadow-[0_0_8px_rgba(34,211,238,0.5)] transition-all duration-300 ease-out"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto no-scrollbar flex-1">
          {/* STEP 1: Core Gameplay Loop */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                  {t.tutorial_step1_badge}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30 font-bold flex items-center gap-1">
                  <Pickaxe size={12} />
                  <span>Tap to Earn</span>
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-black text-slate-100 leading-snug">
                {t.tutorial_step1_title}
              </h3>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {t.tutorial_step1_desc}
              </p>

              {/* Interactive Visual: Mining Loop */}
              <div className="glass rounded-2xl p-4 border border-white/10 bg-slate-900/60 shadow-inner space-y-3">
                <div className="flex items-center justify-around py-2">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(245,158,11,0.4)] border-2 border-amber-300 animate-pulse">
                      🪙
                    </div>
                    <span className="text-[11px] font-bold text-amber-300 mt-1.5">1. Tap Coin</span>
                  </div>

                  <ArrowRight size={18} className="text-cyan-400 shrink-0 rtl:rotate-180" />

                  <div className="flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.3)] font-mono font-black text-sm">
                      +XP
                    </div>
                    <span className="text-[11px] font-bold text-cyan-300 mt-1.5">2. Gain XP</span>
                  </div>

                  <ArrowRight size={18} className="text-cyan-400 shrink-0 rtl:rotate-180" />

                  <div className="flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                      <Trophy size={24} className="text-amber-300" />
                    </div>
                    <span className="text-[11px] font-bold text-purple-300 mt-1.5">3. Level Up!</span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    <span>{t.tutorial_step1_point1}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    <span>{t.tutorial_step1_point2}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    <span>{t.tutorial_step1_point3}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: How to Earn Coins */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
                  {t.tutorial_step2_badge}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-400/15 text-cyan-300 border border-cyan-400/30 font-bold flex items-center gap-1">
                  <Coins size={12} />
                  <span>Economy</span>
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-black text-slate-100 leading-snug">
                {t.tutorial_step2_title}
              </h3>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {t.tutorial_step2_desc}
              </p>

              {/* 4 Earning Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="bg-slate-900/80 p-3 rounded-2xl border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                    <span className="text-base">🪙</span>
                    <span>1. Active Coin Tapping</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {t.tutorial_step2_point1}
                  </p>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-2xl border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
                    <Gift size={15} className="text-cyan-400" />
                    <span>2. 7-Day Streaks</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {t.tutorial_step2_point2}
                  </p>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-2xl border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-red-300 font-bold text-xs">
                    <Flame size={15} className="text-red-400" />
                    <span>3. Turbo Boosters (3X)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {t.tutorial_step2_point3}
                  </p>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-2xl border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                    <CheckSquare size={15} className="text-emerald-400" />
                    <span>4. Partner Quests</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {t.tutorial_step2_point4}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: The Energy System */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-yellow-400 uppercase tracking-wider">
                  {t.tutorial_step3_badge}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-400/15 text-yellow-300 border border-yellow-400/30 font-bold flex items-center gap-1">
                  <Zap size={12} />
                  <span>Capacitor</span>
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-black text-slate-100 leading-snug">
                {t.tutorial_step3_title}
              </h3>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {t.tutorial_step3_desc}
              </p>

              {/* Energy Capacitor Simulation Card */}
              <div className="glass rounded-2xl p-4 border border-white/10 bg-slate-900/60 shadow-inner space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    <span className="text-xl">⚡</span>
                    <span className="text-base text-slate-100 font-mono">1,000 / 1,000</span>
                    <span className="text-emerald-400 text-[11px] bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                      MAX FULL
                    </span>
                  </div>
                  <div className="text-amber-300 font-mono text-xs font-bold">
                    +3 Energy / sec
                  </div>
                </div>

                {/* Animated Energy Bar */}
                <div className="w-full h-3.5 bg-slate-900 rounded-full p-0.5 border border-white/10 overflow-hidden">
                  <div className="energy-fill h-full rounded-full w-full shadow-[0_0_12px_rgba(245,158,11,0.5)]" />
                </div>

                <div className="space-y-2 pt-1 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-cyan-400 shrink-0" />
                    <span>{t.tutorial_step3_point1}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-cyan-400 shrink-0" />
                    <span>{t.tutorial_step3_point2}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-cyan-400 shrink-0" />
                    <span>{t.tutorial_step3_point3}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Accessing Tasks & Quests */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-teal-400 uppercase tracking-wider">
                  {t.tutorial_step4_badge}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-400/15 text-teal-300 border border-teal-400/30 font-bold flex items-center gap-1">
                  <CheckSquare size={12} />
                  <span>Quests</span>
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-black text-slate-100 leading-snug">
                {t.tutorial_step4_title}
              </h3>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {t.tutorial_step4_desc}
              </p>

              {/* Task Preview Card */}
              <div className="bg-slate-900/90 rounded-2xl p-3.5 border border-cyan-400/30 space-y-2.5 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                      <CheckSquare size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-100">
                        Join Official Telegram Channel
                      </div>
                      <div className="text-[11px] text-amber-400 font-mono font-bold flex items-center gap-1">
                        <span>+5,000 EPC</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-cyan-400">+500 XP</span>
                      </div>
                    </div>
                  </div>

                  <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 text-black font-black text-xs shadow-md">
                    Verify & Claim
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 space-y-1 text-[11px] text-slate-300">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>{t.tutorial_step4_point1}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>{t.tutorial_step4_point2}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>{t.tutorial_step4_point3}</span>
                  </div>
                </div>
              </div>

              {/* Action shortcut to jump to Tasks immediately */}
              <button
                onClick={() => handleGoToTab('tasks')}
                className="w-full py-2.5 px-4 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Jump Directly to Tasks Tab</span>
                <ChevronRight size={14} className="rtl:rotate-180" />
              </button>
            </div>
          )}

          {/* STEP 5: Friends & Referrals */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-purple-400 uppercase tracking-wider">
                  {t.tutorial_step5_badge}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-400/15 text-purple-300 border border-purple-400/30 font-bold flex items-center gap-1">
                  <Users size={12} />
                  <span>Guild & Network</span>
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-black text-slate-100 leading-snug">
                {t.tutorial_step5_title}
              </h3>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {t.tutorial_step5_desc}
              </p>

              {/* 3-Tier Multi-Level Commission Cards */}
              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-cyan-400/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 font-black text-xs flex items-center justify-center font-mono">
                      1
                    </span>
                    <span className="text-xs font-bold text-slate-200">Tier 1: Direct Friends</span>
                  </div>
                  <span className="text-xs font-black text-cyan-400 font-mono">10% Lifetime</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 font-black text-xs flex items-center justify-center font-mono">
                      2
                    </span>
                    <span className="text-xs font-bold text-slate-300">Tier 2: Friends of Friends</span>
                  </div>
                  <span className="text-xs font-black text-purple-400 font-mono">3% Passive</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 font-black text-xs flex items-center justify-center font-mono">
                      3
                    </span>
                    <span className="text-xs font-bold text-slate-300">Tier 3: Extended Guild</span>
                  </div>
                  <span className="text-xs font-black text-amber-400 font-mono">1% Passive</span>
                </div>
              </div>

              <div className="p-3 bg-cyan-950/40 rounded-xl border border-cyan-400/20 text-[11px] text-cyan-200 flex items-center gap-2">
                <Users size={16} className="text-cyan-400 shrink-0" />
                <span>{t.tutorial_step5_point4}</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-950/80 flex items-center justify-between gap-3 shrink-0">
          {/* Step Dots indicator */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  soundFx.triggerHaptic('selection');
                  setCurrentStep(idx + 1);
                }}
                aria-label={`Jump to Step ${idx + 1}`}
                className={`h-2 rounded-full transition-all ${
                  currentStep === idx + 1
                    ? 'w-6 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]'
                    : 'w-2 bg-slate-700 hover:bg-slate-500'
                }`}
              />
            ))}
          </div>

          {/* Previous / Next Buttons */}
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <button
                id="btn-tutorial-prev"
                onClick={handlePrev}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center gap-1 border border-white/10 transition-colors"
              >
                <ArrowLeft size={14} className="rtl:rotate-180" />
                <span>{t.tutorial_prev}</span>
              </button>
            )}

            {currentStep < totalSteps ? (
              <button
                id="btn-tutorial-next"
                onClick={handleNext}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 text-black font-black text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(34,211,238,0.35)] hover:opacity-95 transition-all"
              >
                <span>{t.tutorial_next}</span>
                <ArrowRight size={14} className="rtl:rotate-180" />
              </button>
            ) : (
              <button
                id="btn-tutorial-finish"
                onClick={() => handleGoToTab('game')}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-black font-black text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(245,158,11,0.45)] hover:opacity-95 transition-all animate-pulse"
              >
                <Rocket size={14} />
                <span>{t.tutorial_finish}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
