import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import {
  Wrench,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Database,
  Bot,
  Sliders,
  UserCheck,
  Rocket,
  RefreshCw,
  Terminal,
} from 'lucide-react';
import { InstallerStatus } from '../types';

export const WebInstaller: React.FC = () => {
  const { setActiveTab } = useGame();
  const [currentStep, setCurrentStep] = useState(1);
  const [installerStatus, setInstallerStatus] = useState<InstallerStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    db_host: 'localhost',
    db_port: '3306',
    db_name: 'tapempire_db',
    db_user: 'cpanel_user',
    db_pass: 'StrongPassword123!',
    telegram_bot_token: '123456789:ABCdefGhIJKlmNoPQRstuVWXyz',
    telegram_bot_username: 'TapEmpireGameBot',
    webapp_url: window.location.origin,
    game_name: 'TapEmpire',
    coin_name: 'Empire Coin',
    coin_symbol: 'EPC',
    tap_reward: '1',
    max_energy: '1000',
    admin_username: 'admin',
    admin_email: 'admin@tapempire.io',
    admin_password: 'SuperSecretAdminPass123!',
  });

  const [installResult, setInstallResult] = useState<any>(null);

  useEffect(() => {
    fetch('/api/installer/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setInstallerStatus(data.data);
          setCurrentStep(data.data.step || 1);
        }
      });
  }, []);

  const handleNext = async () => {
    setErrorMsg(null);

    // Step 1: Verification
    if (currentStep === 1) {
      if (!installerStatus?.requirements.php.status || !installerStatus?.requirements.mysql.status) {
        setErrorMsg('Please ensure all system requirements are satisfied before proceeding.');
        return;
      }
      setCurrentStep(2);
      return;
    }

    // Step 2: Test Database
    if (currentStep === 2) {
      setLoading(true);
      try {
        const res = await fetch('/api/installer/test-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: formData.db_host,
            port: formData.db_port,
            database: formData.db_name,
            username: formData.db_user,
            password: formData.db_pass,
          }),
        });
        const data = await res.json();
        setLoading(false);
        if (data.success) {
          setCurrentStep(3);
        } else {
          setErrorMsg(data.message || 'Database connection test failed');
        }
      } catch {
        setLoading(false);
        setErrorMsg('Failed to communicate with installation server');
      }
      return;
    }

    // Step 3: Test Telegram
    if (currentStep === 3) {
      setLoading(true);
      try {
        const res = await fetch('/api/installer/test-telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bot_token: formData.telegram_bot_token,
            webapp_url: formData.webapp_url,
          }),
        });
        const data = await res.json();
        setLoading(false);
        if (data.success) {
          setCurrentStep(4);
        } else {
          setErrorMsg(data.message || 'Telegram Bot Token test failed');
        }
      } catch {
        setLoading(false);
        setErrorMsg('Error testing Telegram credentials');
      }
      return;
    }

    // Step 4: Economy parameters
    if (currentStep === 4) {
      setCurrentStep(5);
      return;
    }

    // Step 5: Admin Account
    if (currentStep === 5) {
      if (!formData.admin_username || !formData.admin_password) {
        setErrorMsg('Admin credentials cannot be empty');
        return;
      }
      setCurrentStep(6);
      return;
    }

    // Step 6: Execute Run Installation
    if (currentStep === 6) {
      setLoading(true);
      try {
        const res = await fetch('/api/installer/install', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        setLoading(false);
        if (data.success) {
          setInstallResult(data.data);
          setCurrentStep(7);
        } else {
          setErrorMsg(data.message || 'Installation execution failed');
        }
      } catch {
        setLoading(false);
        setErrorMsg('Network error executing installation');
      }
    }
  };

  const steps = [
    { num: 1, title: 'Requirements' },
    { num: 2, title: 'Database' },
    { num: 3, title: 'Telegram' },
    { num: 4, title: 'Economy' },
    { num: 5, title: 'Admin' },
    { num: 6, title: 'Install' },
    { num: 7, title: 'Complete' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-5 text-xs">
      {/* Wizard Header (Immersive UI Glass) */}
      <div className="glass rounded-3xl p-5 border border-white/10 shadow-2xl text-center relative overflow-hidden">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center mx-auto mb-2.5 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.25)]">
          <Wrench size={24} />
        </div>
        <div className="text-[10px] uppercase tracking-widest text-cyan-400 font-semibold mb-1">
          AUTOMATED DEPLOYMENT ENGINE
        </div>
        <h2 className="text-2xl font-black text-slate-100">TapEmpire Web Installer</h2>
        <p className="text-slate-400 mt-0.5">Automated cPanel & Shared Hosting Setup Wizard</p>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-1.5 mt-4 overflow-x-auto no-scrollbar py-1">
          {steps.map((s) => (
            <div
              key={s.num}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                currentStep === s.num
                  ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30'
                  : currentStep > s.num
                  ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-400/30'
                  : 'bg-slate-900/80 border border-white/5 text-slate-500'
              }`}
            >
              <span>{s.num}.</span>
              <span>{s.title}</span>
            </div>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-300 font-bold flex items-center gap-2 shadow-lg">
          <XCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Step 1: System Requirements */}
      {currentStep === 1 && installerStatus && (
        <div className="glass rounded-3xl p-5 border border-white/10 space-y-4 shadow-2xl">
          <h3 className="text-sm font-bold text-slate-200">1. System Compatibility Audit</h3>

          <div className="space-y-2">
            {Object.entries(installerStatus.requirements).map(([key, item]: [string, any]) => (
              <div
                key={key}
                className="bg-slate-900/80 rounded-2xl p-3 border border-white/5 flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-slate-200 uppercase">{key}</span>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Detected: {item.current} (Required: {item.required})
                  </div>
                </div>
                {item.status ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <CheckCircle2 size={16} />
                    <span>Pass</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-400 font-bold">
                    <XCircle size={16} />
                    <span>Fail</span>
                  </span>
                )}
              </div>
            ))}
          </div>

          <h4 className="text-xs font-bold text-slate-300 pt-2">PHP Extensions</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(installerStatus.extensions).map(([ext, status]: [string, any]) => (
              <div
                key={ext}
                className="bg-slate-900/80 rounded-xl p-2.5 border border-white/5 flex items-center justify-between text-xs font-mono"
              >
                <span className="text-slate-300">{ext}</span>
                {status ? (
                  <CheckCircle2 size={14} className="text-emerald-400" />
                ) : (
                  <XCircle size={14} className="text-red-400" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Database Configuration */}
      {currentStep === 2 && (
        <div className="glass rounded-3xl p-5 border border-white/10 space-y-4 shadow-2xl">
          <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
            <Database size={18} className="text-cyan-400" />
            <span>2. MySQL / MariaDB Connection</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Host</label>
              <input
                type="text"
                value={formData.db_host}
                onChange={(e) => setFormData({ ...formData, db_host: e.target.value })}
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-3.5 py-2.5 text-slate-100 font-mono text-xs focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Port</label>
              <input
                type="text"
                value={formData.db_port}
                onChange={(e) => setFormData({ ...formData, db_port: e.target.value })}
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-3.5 py-2.5 text-slate-100 font-mono text-xs focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Database Name</label>
              <input
                type="text"
                value={formData.db_name}
                onChange={(e) => setFormData({ ...formData, db_name: e.target.value })}
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-3.5 py-2.5 text-slate-100 font-mono text-xs focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Username</label>
              <input
                type="text"
                value={formData.db_user}
                onChange={(e) => setFormData({ ...formData, db_user: e.target.value })}
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-3.5 py-2.5 text-slate-100 font-mono text-xs focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-slate-400 block mb-1">Password</label>
              <input
                type="password"
                value={formData.db_pass}
                onChange={(e) => setFormData({ ...formData, db_pass: e.target.value })}
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-3.5 py-2.5 text-slate-100 font-mono text-xs focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Telegram Bot API */}
      {currentStep === 3 && (
        <div className="glass rounded-3xl p-5 border border-white/10 space-y-4 shadow-2xl">
          <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
            <Bot size={18} className="text-cyan-400" />
            <span>3. Telegram Bot API Integration</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-slate-400 block mb-1">Bot Token (From @BotFather)</label>
              <input
                type="text"
                value={formData.telegram_bot_token}
                onChange={(e) => setFormData({ ...formData, telegram_bot_token: e.target.value })}
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-3.5 py-2.5 text-slate-100 font-mono text-xs focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Bot Username</label>
              <input
                type="text"
                value={formData.telegram_bot_username}
                onChange={(e) => setFormData({ ...formData, telegram_bot_username: e.target.value })}
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-3.5 py-2.5 text-slate-100 font-mono text-xs focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Mini App Public Web URL</label>
              <input
                type="text"
                value={formData.webapp_url}
                onChange={(e) => setFormData({ ...formData, webapp_url: e.target.value })}
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-3.5 py-2.5 text-slate-100 font-mono text-xs focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Game Economy */}
      {currentStep === 4 && (
        <div className="glass rounded-3xl p-5 border border-white/10 space-y-4 shadow-2xl">
          <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
            <Sliders size={18} className="text-cyan-400" />
            <span>4. Game Economy Presets</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Game Brand Name</label>
              <input
                type="text"
                value={formData.game_name}
                onChange={(e) => setFormData({ ...formData, game_name: e.target.value })}
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-3.5 py-2.5 text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Coin Symbol</label>
              <input
                type="text"
                value={formData.coin_symbol}
                onChange={(e) => setFormData({ ...formData, coin_symbol: e.target.value })}
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-3.5 py-2.5 text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Base Tap Reward</label>
              <input
                type="number"
                value={formData.tap_reward}
                onChange={(e) => setFormData({ ...formData, tap_reward: e.target.value })}
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-3.5 py-2.5 text-slate-100 font-mono text-xs focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Max Energy Capacity</label>
              <input
                type="number"
                value={formData.max_energy}
                onChange={(e) => setFormData({ ...formData, max_energy: e.target.value })}
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-3.5 py-2.5 text-slate-100 font-mono text-xs focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Admin Account */}
      {currentStep === 5 && (
        <div className="glass rounded-3xl p-5 border border-white/10 space-y-4 shadow-2xl">
          <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
            <UserCheck size={18} className="text-cyan-400" />
            <span>5. Superadmin Account Credentials</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-slate-400 block mb-1">Admin Username</label>
              <input
                type="text"
                value={formData.admin_username}
                onChange={(e) => setFormData({ ...formData, admin_username: e.target.value })}
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-3.5 py-2.5 text-slate-100 font-mono text-xs focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Admin Email</label>
              <input
                type="email"
                value={formData.admin_email}
                onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-3.5 py-2.5 text-slate-100 font-mono text-xs focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Password</label>
              <input
                type="password"
                value={formData.admin_password}
                onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-3.5 py-2.5 text-slate-100 font-mono text-xs focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 6: Confirmation & Installation */}
      {currentStep === 6 && (
        <div className="glass rounded-3xl p-5 border border-white/10 space-y-4 shadow-2xl">
          <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
            <Rocket size={18} className="text-cyan-400" />
            <span>6. Execute Deployment</span>
          </div>

          <div className="bg-slate-900/80 rounded-2xl p-4 border border-white/5 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Database:</span>
              <span className="text-slate-200">{formData.db_name}@{formData.db_host}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Bot Username:</span>
              <span className="text-cyan-400">@{formData.telegram_bot_username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Economy:</span>
              <span className="text-amber-400">{formData.game_name} ({formData.coin_symbol})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Superadmin:</span>
              <span className="text-slate-200">{formData.admin_username}</span>
            </div>
          </div>

          <p className="text-slate-400 text-xs leading-relaxed">
            Clicking <b>Run Installation</b> will execute migrations, seed initial boosts, tasks, levels, register the Telegram Webhook, write production configuration, and lock the installer.
          </p>
        </div>
      )}

      {/* Step 7: Completed */}
      {currentStep === 7 && (
        <div className="glass rounded-3xl p-6 border border-white/10 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center mx-auto text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.3)]">
            <CheckCircle2 size={36} />
          </div>
          <h3 className="text-xl font-black text-slate-100">Installation Successful!</h3>
          <p className="text-slate-400 text-xs max-w-md mx-auto">
            {installResult?.message || 'Database migrated, default tasks seeded, Telegram Webhook registered, and security locks deployed.'}
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => setActiveTab('game')}
              className="py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-400 to-teal-400 text-black font-black text-xs hover:opacity-95 shadow-[0_0_15px_rgba(34,211,238,0.35)] transition-all"
            >
              Launch Game Now
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className="py-3 px-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-cyan-300 border border-cyan-400/40 font-black text-xs shadow-lg transition-all"
            >
              Open Admin Panel
            </button>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      {currentStep < 7 && (
        <div className="flex items-center justify-between pt-2">
          {currentStep > 1 ? (
            <button
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="px-4 py-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 font-bold flex items-center gap-1.5 border border-white/10 transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={handleNext}
            disabled={loading}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-teal-400 text-black font-black flex items-center gap-1.5 shadow-[0_0_15px_rgba(34,211,238,0.35)] hover:opacity-95 disabled:opacity-50 transition-all ml-auto"
          >
            {loading ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <>
                <span>{currentStep === 6 ? 'Run Installation' : 'Next Step'}</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
