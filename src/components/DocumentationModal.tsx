import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { BookOpen, Server, Terminal, Shield, Bot, Database, Copy, Check } from 'lucide-react';

export const DocumentationModal: React.FC = () => {
  const { gameState, t } = useGame();
  const [activeDoc, setActiveDoc] = useState<'cpanel' | 'cron' | 'telegram' | 'laravel' | 'anticheat'>('cpanel');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 pb-24 space-y-4 text-xs">
      {/* Header (Immersive UI Glass) */}
      <div className="glass rounded-3xl p-5 border border-white/10 shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.25)]">
            <BookOpen size={20} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-cyan-400 font-semibold mb-0.5">
              DEPLOYMENT & ARCHITECTURE
            </div>
            <h2 className="text-base font-black text-slate-100">Production Deployment Documentation</h2>
            <p className="text-[11px] text-slate-400">cPanel, Shared Hosting, Telegram Bot & Laravel 12 Guide</p>
          </div>
        </div>
      </div>

      {/* Docs Nav Pills */}
      <div className="flex gap-1.5 glass p-1.5 rounded-2xl border border-white/10 overflow-x-auto no-scrollbar">
        {[
          { id: 'cpanel' as const, label: 'cPanel & Shared Hosting', icon: Server },
          { id: 'cron' as const, label: 'Cron Setup', icon: Terminal },
          { id: 'telegram' as const, label: 'BotFather Setup', icon: Bot },
          { id: 'laravel' as const, label: 'Laravel 12 Architecture', icon: Database },
          { id: 'anticheat' as const, label: 'Anti-Cheat Engine', icon: Shield },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeDoc === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveDoc(item.id)}
              className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={14} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Doc 1: cPanel Deployment */}
      {activeDoc === 'cpanel' && (
        <div className="glass rounded-3xl p-5 border border-white/10 space-y-4 leading-relaxed shadow-2xl">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Server className="text-cyan-400" size={16} />
            <span>Deploying on cPanel / DirectAdmin / Shared Hosting</span>
          </h3>

          <div className="space-y-3 text-slate-300">
            <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-white/5 space-y-1.5">
              <span className="font-bold text-cyan-400 block">Step 1: Uploading Files</span>
              <p className="text-slate-400">
                1. Compress the project root (excluding <code>node_modules</code> and <code>.git</code>) into a zip file.
                <br />
                2. In cPanel File Manager, upload and extract to <code>/home/username/public_html</code> or a subdomain root.
              </p>
            </div>

            <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-white/5 space-y-1.5">
              <span className="font-bold text-cyan-400 block">Step 2: MySQL Database Wizard</span>
              <p className="text-slate-400">
                1. Open cPanel <strong>MySQL Databases Wizard</strong>.
                <br />
                2. Create a database (e.g. <code>username_tapempire</code>).
                <br />
                3. Create a user and grant <strong>ALL PRIVILEGES</strong>.
              </p>
            </div>

            <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-white/5 space-y-1.5">
              <span className="font-bold text-cyan-400 block">Step 3: Run the Web Installer</span>
              <p className="text-slate-400">
                Navigate to <code>https://yourdomain.com/install</code> (or click the <strong>Installer</strong> tool icon in the header). The wizard will test DB credentials, create tables, and seed game records automatically!
              </p>
            </div>

            <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-white/5 space-y-1.5">
              <span className="font-bold text-cyan-400 block">Step 4: Node.js Selector (Optional for Full-Stack)</span>
              <p className="text-slate-400">
                If using the bundled Node.js full-stack engine in cPanel:
                <br />
                • Node.js Version: <strong>20.x</strong>
                <br />
                • Application Mode: <strong>Production</strong>
                <br />
                • Application Root: <code>/home/username/public_html</code>
                <br />
                • Application Startup File: <code>dist/server.cjs</code>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Doc 2: Cron Jobs */}
      {activeDoc === 'cron' && (
        <div className="glass rounded-3xl p-5 border border-white/10 space-y-4 shadow-2xl">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Terminal className="text-cyan-400" size={16} />
            <span>Configuring Cron Jobs on Shared Hosting (Without Supervisor)</span>
          </h3>

          <p className="text-slate-300 leading-relaxed">
            Shared hosting environments cannot run persistent daemon processes (like Supervisor or Redis daemons). TapEmpire uses standard cPanel Cron jobs to process asynchronous queues, energy updates, and streaks.
          </p>

          <div className="space-y-3">
            <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400">Primary Scheduler Cron (Every Minute):</span>
                <button
                  onClick={() =>
                    copyToClipboard(
                      '* * * * * cd /home/username/public_html && php artisan schedule:run >> /dev/null 2>&1',
                      'cron1'
                    )
                  }
                  className="text-cyan-400 hover:text-white flex items-center gap-1 font-mono"
                >
                  {copiedCode === 'cron1' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>Copy</span>
                </button>
              </div>
              <code className="block p-3 bg-black/60 rounded-xl text-cyan-300 font-mono select-all border border-white/5">
                * * * * * cd /home/username/public_html && php artisan schedule:run &gt;&gt; /dev/null 2&gt;&amp;1
              </code>
            </div>

            <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-400">Database Queue Worker (Every 2 Minutes):</span>
                <button
                  onClick={() =>
                    copyToClipboard(
                      '*/2 * * * * cd /home/username/public_html && php artisan queue:work --stop-when-empty >> /dev/null 2>&1',
                      'cron2'
                    )
                  }
                  className="text-cyan-400 hover:text-white flex items-center gap-1 font-mono"
                >
                  {copiedCode === 'cron2' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>Copy</span>
                </button>
              </div>
              <code className="block p-3 bg-black/60 rounded-xl text-cyan-300 font-mono select-all border border-white/5">
                */2 * * * * cd /home/username/public_html && php artisan queue:work --stop-when-empty &gt;&gt; /dev/null 2&gt;&amp;1
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Doc 3: Telegram Bot Setup */}
      {activeDoc === 'telegram' && (
        <div className="glass rounded-3xl p-5 border border-white/10 space-y-4 shadow-2xl">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Bot className="text-cyan-400" size={16} />
            <span>Configuring Telegram Bot & WebApp (@BotFather)</span>
          </h3>

          <div className="space-y-3 text-slate-300">
            <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-white/5 space-y-1">
              <span className="font-bold text-cyan-400">1. Create the Bot:</span>
              <p className="text-slate-400">
                Message <code>@BotFather</code> on Telegram, send <code>/newbot</code>, and follow the prompts to choose a Name and Username.
              </p>
            </div>

            <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-white/5 space-y-1">
              <span className="font-bold text-cyan-400">2. Configure the Mini App Menu Button:</span>
              <p className="text-slate-400">
                Send <code>/setmenubutton</code> to @BotFather. Select your bot, set button title (e.g. <code>🎮 PLAY NOW</code>), and enter your HTTPS WebApp URL.
              </p>
            </div>

            <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-white/5 space-y-1">
              <span className="font-bold text-cyan-400">3. Set Webhook URL:</span>
              <code className="block p-3 bg-black/60 rounded-xl text-cyan-300 font-mono mt-1 select-all border border-white/5">
                curl -F "url=https://yourdomain.com/api/telegram/webhook" https://api.telegram.org/botYOUR_TOKEN/setWebhook
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Doc 4: Laravel 12 Architecture */}
      {activeDoc === 'laravel' && (
        <div className="glass rounded-3xl p-5 border border-white/10 space-y-4 shadow-2xl">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Database className="text-cyan-400" size={16} />
            <span>Laravel 12 Backend Structure & Migration Guide</span>
          </h3>

          <p className="text-slate-300">
            All business logic implemented in <code>server/</code> has been structured to map 1:1 to Laravel 12 architecture:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-white/5">
              <span className="font-bold text-cyan-400 block mb-1">Models & Migrations</span>
              <ul className="text-slate-400 space-y-1 list-disc list-inside">
                <li><code>app/Models/User.php</code></li>
                <li><code>app/Models/Balance.php</code></li>
                <li><code>app/Models/Level.php</code></li>
                <li><code>app/Models/Boost.php</code></li>
                <li><code>app/Models/Task.php</code></li>
                <li><code>app/Models/Transaction.php</code></li>
                <li><code>app/Models/Withdrawal.php</code></li>
              </ul>
            </div>

            <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-white/5">
              <span className="font-bold text-cyan-400 block mb-1">Services & Middleware</span>
              <ul className="text-slate-400 space-y-1 list-disc list-inside">
                <li><code>app/Services/TelegramService.php</code></li>
                <li><code>app/Services/AntiCheatService.php</code></li>
                <li><code>app/Services/WalletService.php</code></li>
                <li><code>app/Http/Middleware/VerifyTelegramInitData.php</code></li>
                <li><code>app/Http/Middleware/AntiCheatMiddleware.php</code></li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Doc 5: Anti-Cheat Engine */}
      {activeDoc === 'anticheat' && (
        <div className="glass rounded-3xl p-5 border border-white/10 space-y-4 shadow-2xl">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Shield className="text-cyan-400" size={16} />
            <span>Anti-Cheat Specification & Verification Pipeline</span>
          </h3>

          <div className="space-y-2.5 text-slate-300">
            <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-white/5">
              <span className="font-bold text-cyan-400 block mb-0.5">1. Nonce Replay Protection</span>
              <p className="text-slate-400">
                Every batch tap synchronization must supply a unique cryptographic nonce. Used nonces are stored in memory and Redis/MySQL with TTL; duplicate nonces are rejected immediately.
              </p>
            </div>

            <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-white/5">
              <span className="font-bold text-cyan-400 block mb-0.5">2. TPS Speed Limit & Bot Detection</span>
              <p className="text-slate-400">
                Human tapping threshold is enforced at max 12 taps per second. Sustained automated bursts above threshold trigger automatic security flags and temporary tap cooldowns.
              </p>
            </div>

            <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-white/5">
              <span className="font-bold text-cyan-400 block mb-0.5">3. Server-Authoritative Energy & XP Math</span>
              <p className="text-slate-400">
                Energy calculations, regeneration timestamps, level thresholds, and coin balances are computed exclusively on the server. Client values are purely optimistic for 60fps UX.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
