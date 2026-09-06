import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import {
  Shield,
  Users,
  CreditCard,
  AlertTriangle,
  Activity,
  Check,
  X,
  Search,
  Save,
  CheckCircle2,
  RefreshCw,
  Sliders,
  LogOut,
  Lock,
  Key,
} from 'lucide-react';
import { AdminOverviewStats, SystemSettings, WithdrawalRequest } from '../types';

export const AdminDashboard: React.FC = () => {
  const { refreshGameState, t } = useGame();
  const [adminToken, setAdminToken] = useState<string | null>(() => sessionStorage.getItem('tapempire_admin_token'));
  const [adminUser, setAdminUser] = useState<any>(null);
  const [loginUsername, setLoginUsername] = useState('superadmin');
  const [loginPassword, setLoginPassword] = useState('SuperAdminPass2026!');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'withdrawals' | 'settings' | 'anticheat'>('overview');
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [settingsForm, setSettingsForm] = useState<SystemSettings | null>(null);
  const [cheatLogs, setCheatLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      const data = await res.json();
      if (data.success && data.data?.token) {
        sessionStorage.setItem('tapempire_admin_token', data.data.token);
        setAdminToken(data.data.token);
        setAdminUser(data.data.admin);
        setNotification(`Authenticated successfully as ${data.data.admin.username}`);
        setTimeout(() => setNotification(null), 3000);
      } else {
        setLoginError(data.message || 'Authentication failed. Please check credentials.');
      }
    } catch (err: any) {
      setLoginError('Server communication error: ' + (err.message || 'Check connection'));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('tapempire_admin_token');
    setAdminToken(null);
    setAdminUser(null);
    setNotification('Logged out successfully.');
    setTimeout(() => setNotification(null), 2500);
  };

  const fetchAdminData = async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const authHeaders = {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      };

      const [statsRes, usersRes, withRes, settRes, cheatRes] = await Promise.all([
        fetch('/api/admin/overview', { headers: authHeaders }).then((r) => {
          if (r.status === 401 || r.status === 403) throw new Error('UNAUTHORIZED');
          return r.json();
        }),
        fetch('/api/admin/users', { headers: authHeaders }).then((r) => r.json()),
        fetch('/api/admin/withdrawals', { headers: authHeaders }).then((r) => r.json()),
        fetch('/api/admin/settings', { headers: authHeaders }).then((r) => r.json()),
        fetch('/api/admin/anti-cheat', { headers: authHeaders }).then((r) => r.json()),
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (usersRes.success) setUsers(usersRes.data);
      if (withRes.success) setWithdrawals(withRes.data);
      if (settRes.success) setSettingsForm(settRes.data);
      if (cheatRes.success) setCheatLogs(cheatRes.data);
    } catch (err: any) {
      if (err.message === 'UNAUTHORIZED') {
        sessionStorage.removeItem('tapempire_admin_token');
        setAdminToken(null);
        setLoginError('Admin session expired or token unauthorized. Please log in again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminToken) {
      fetchAdminData();
    }
  }, [adminToken]);

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsForm || !adminToken) return;

    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settingsForm),
    });
    const data = await res.json();
    if (data.success) {
      setNotification('Settings saved successfully!');
      setTimeout(() => setNotification(null), 2500);
      refreshGameState();
    }
  };

  const handleApproveWithdrawal = async (id: string) => {
    if (!adminToken) return;
    const txHash = prompt('Enter Blockchain / Payout Transaction Hash:', '0x' + Math.random().toString(16).substring(2, 22));
    if (!txHash) return;

    await fetch(`/api/admin/withdrawals/${id}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tx_hash: txHash }),
    });
    fetchAdminData();
  };

  const handleRejectWithdrawal = async (id: string) => {
    if (!adminToken) return;
    const reason = prompt('Enter rejection reason (coins will be refunded):', 'Suspicious activity or invalid address');
    if (!reason) return;

    await fetch(`/api/admin/withdrawals/${id}/reject`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    });
    fetchAdminData();
  };

  const handleToggleBan = async (userId: string, currentBanned: boolean) => {
    if (!adminToken) return;
    await fetch(`/api/admin/users/${userId}/ban`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ banned: !currentBanned }),
    });
    fetchAdminData();
  };

  // If not authenticated as Admin, show high-security Login Screen
  if (!adminToken) {
    return (
      <div className="max-w-md mx-auto px-4 py-8 space-y-6 text-xs">
        <div className="glass rounded-3xl p-6 border border-white/10 shadow-2xl space-y-5">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.25)]">
              <Lock size={28} />
            </div>
            <h2 className="text-lg font-black text-slate-100 tracking-wide">
              {t.admin_portal} — Authentication Gate
            </h2>
            <p className="text-slate-400 text-[11px]">
              Access restricted to authorized personnel with active RBAC credentials.
            </p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-300 text-[11px] font-medium flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0 text-rose-400" />
              <span>{loginError}</span>
            </div>
          )}

          {notification && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-medium flex items-center gap-2">
              <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
              <span>{notification}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Admin Username or Email
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="superadmin"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/10 focus:border-cyan-400/60 focus:outline-none text-slate-100 placeholder-slate-500 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Security Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/10 focus:border-cyan-400/60 focus:outline-none text-slate-100 placeholder-slate-500 text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
            >
              <Key size={16} />
              <span>{isLoggingIn ? 'Verifying Credentials...' : 'Authenticate & Unlock'}</span>
            </button>
          </form>

          <div className="pt-3 border-t border-white/10 text-[10px] text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">Default Credentials:</p>
            <p className="font-mono text-cyan-400/90">Username: <span className="text-white">superadmin</span> | Password: <span className="text-white">SuperAdminPass2026!</span></p>
            <p className="font-mono text-cyan-400/90">Or Moderator: <span className="text-white">moderator</span> | Password: <span className="text-white">ModSecurePass2026!</span></p>
          </div>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(
    (u) =>
      u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(u.telegram_id).includes(searchQuery)
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 pb-24 space-y-4 text-xs">
      {/* Admin Top Header (Immersive UI Glass) */}
      <div className="glass rounded-3xl p-4 border border-white/10 flex flex-wrap items-center justify-between gap-3 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.25)]">
            <Shield size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-100 flex items-center gap-2">
              <span>{t.admin_portal}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-400/30 uppercase">
                {adminUser?.role || 'SUPERADMIN'}
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Active Admin: <span className="text-cyan-300 font-semibold">{adminUser?.username || 'superadmin'}</span> • Production Session Active
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAdminData}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-cyan-300 font-bold flex items-center gap-1.5 border border-white/10 hover:border-cyan-400/40 transition-colors shadow-sm"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Data</span>
          </button>

          <button
            onClick={handleAdminLogout}
            title="Sign out of Admin Portal"
            className="px-3 py-1.5 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-bold flex items-center gap-1.5 border border-rose-400/30 transition-colors shadow-sm"
          >
            <LogOut size={13} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold flex items-center gap-2 shadow-lg">
          <CheckCircle2 size={16} />
          <span>{notification}</span>
        </div>
      )}

      {/* Tabs styled matching Immersive UI */}
      <div className="flex gap-1.5 glass p-1.5 rounded-2xl border border-white/10 overflow-x-auto no-scrollbar">
        {[
          { id: 'overview' as const, label: 'Overview', icon: Activity },
          { id: 'users' as const, label: 'Users', icon: Users },
          { id: 'withdrawals' as const, label: 'Withdrawals', icon: CreditCard },
          { id: 'settings' as const, label: 'Game Settings', icon: Sliders },
          { id: 'anticheat' as const, label: 'Anti-Cheat', icon: AlertTriangle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="glass rounded-3xl p-4 border border-white/10 shadow-xl">
              <span className="text-[11px] text-slate-400 font-bold block mb-1">Total Users</span>
              <span className="text-xl font-black text-slate-100 font-mono">
                {stats.total_users.toLocaleString()}
              </span>
              <span className="text-[10px] text-cyan-400 block mt-1 font-mono">
                Active Today: {stats.active_users_today}
              </span>
            </div>

            <div className="glass rounded-3xl p-4 border border-white/10 shadow-xl">
              <span className="text-[11px] text-slate-400 font-bold block mb-1">Total Mined</span>
              <span className="text-xl font-black text-amber-400 font-mono">
                {stats.total_coins_mined.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 block mt-1 font-mono">
                Taps: {stats.total_taps.toLocaleString()}
              </span>
            </div>

            <div className="glass rounded-3xl p-4 border border-white/10 shadow-xl">
              <span className="text-[11px] text-slate-400 font-bold block mb-1">Total Withdrawn</span>
              <span className="text-xl font-black text-cyan-400 font-mono">
                {stats.total_coins_withdrawn.toLocaleString()}
              </span>
              <span className="text-[10px] text-amber-400 block mt-1 font-mono">
                Pending Requests: {stats.pending_withdrawals_count}
              </span>
            </div>

            <div className="glass rounded-3xl p-4 border border-white/10 shadow-xl">
              <span className="text-[11px] text-slate-400 font-bold block mb-1">Anti-Cheat Flags</span>
              <span className="text-xl font-black text-red-400 font-mono">
                {stats.anti_cheat_flags}
              </span>
              <span className="text-[10px] text-emerald-400 block mt-1 font-mono">
                System Health: {stats.system_health}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Users */}
      {activeTab === 'users' && (
        <div className="glass rounded-3xl p-5 border border-white/10 space-y-3.5 shadow-2xl">
          <div className="flex items-center gap-2 bg-slate-900/90 rounded-2xl px-3.5 py-2.5 border border-white/10">
            <Search size={15} className="text-cyan-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username, name, or Telegram ID..."
              className="bg-transparent flex-1 text-slate-200 placeholder:text-slate-500 focus:outline-none"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-[10px] uppercase">
                  <th className="py-2.5 px-2">User</th>
                  <th className="py-2.5 px-2">Balance</th>
                  <th className="py-2.5 px-2">Level</th>
                  <th className="py-2.5 px-2">Status</th>
                  <th className="py-2.5 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-2.5 px-2">
                      <div className="font-bold text-slate-200 font-sans">@{u.username}</div>
                      <div className="text-[10px] text-slate-500">TG: {u.telegram_id}</div>
                    </td>
                    <td className="py-2.5 px-2 text-amber-400 font-bold">
                      {u.balance_coins?.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-slate-300">Lv.{u.level}</td>
                    <td className="py-2.5 px-2 font-sans">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.is_banned ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {u.is_banned ? 'BANNED' : 'ACTIVE'}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <button
                        onClick={() => handleToggleBan(u.id, u.is_banned)}
                        className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-colors ${
                          u.is_banned
                            ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                            : 'bg-red-600 text-white hover:bg-red-500'
                        }`}
                      >
                        {u.is_banned ? 'Unban' : 'Ban'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Withdrawals */}
      {activeTab === 'withdrawals' && (
        <div className="glass rounded-3xl p-5 border border-white/10 space-y-3.5 shadow-2xl">
          <h3 className="font-bold text-slate-200 text-sm">Payout Requests ({withdrawals.length})</h3>
          <div className="space-y-2">
            {withdrawals.map((w) => (
              <div
                key={w.id}
                className="bg-slate-900/80 rounded-2xl p-3.5 border border-white/10 flex flex-wrap items-center justify-between gap-3 font-mono"
              >
                <div>
                  <div className="flex items-center gap-2 font-sans font-bold text-slate-200">
                    <span>User #{w.user_id}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full uppercase ${
                        w.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : w.status === 'rejected'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {w.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Method: {w.method} • Address: {w.destination_address}
                  </div>
                  <div className="text-[10px] text-slate-500">{w.created_at}</div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-amber-400 font-bold block">{w.amount.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-400">Net: {w.net_amount.toLocaleString()}</span>
                  </div>

                  {w.status === 'pending' && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleApproveWithdrawal(w.id)}
                        className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors shadow-sm"
                        title="Approve Payout"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => handleRejectWithdrawal(w.id)}
                        className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-colors shadow-sm"
                        title="Reject and Refund"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Game Settings Form */}
      {activeTab === 'settings' && settingsForm && (
        <form onSubmit={handleUpdateSettings} className="glass rounded-3xl p-5 border border-white/10 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="font-bold text-slate-200 text-sm">Economy & Engine Parameters</h3>
            <button
              type="submit"
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-teal-400 text-black font-bold flex items-center gap-1.5 shadow-[0_0_12px_rgba(34,211,238,0.3)] hover:opacity-95 transition-all"
            >
              <Save size={14} />
              <span>Save Changes</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-slate-400 block mb-1">Game Name</label>
              <input
                type="text"
                value={settingsForm.game_name}
                onChange={(e) => setSettingsForm({ ...settingsForm, game_name: e.target.value })}
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-3 py-2 text-slate-200 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Coin Symbol</label>
              <input
                type="text"
                value={settingsForm.coin_symbol}
                onChange={(e) => setSettingsForm({ ...settingsForm, coin_symbol: e.target.value })}
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-3 py-2 text-slate-200 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Tap Reward</label>
              <input
                type="number"
                value={settingsForm.tap_reward}
                onChange={(e) => setSettingsForm({ ...settingsForm, tap_reward: Number(e.target.value) })}
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-3 py-2 text-slate-200 font-mono focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Max Energy Limit</label>
              <input
                type="number"
                value={settingsForm.max_energy}
                onChange={(e) => setSettingsForm({ ...settingsForm, max_energy: Number(e.target.value) })}
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-3 py-2 text-slate-200 font-mono focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Energy Regen (units/sec)</label>
              <input
                type="number"
                value={settingsForm.energy_regen_rate}
                onChange={(e) => setSettingsForm({ ...settingsForm, energy_regen_rate: Number(e.target.value) })}
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-3 py-2 text-slate-200 font-mono focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Min Withdrawal Amount</label>
              <input
                type="number"
                value={settingsForm.min_withdrawal}
                onChange={(e) => setSettingsForm({ ...settingsForm, min_withdrawal: Number(e.target.value) })}
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-3 py-2 text-slate-200 font-mono focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Withdrawal Fee (%)</label>
              <input
                type="number"
                value={settingsForm.withdrawal_fee_percent}
                onChange={(e) => setSettingsForm({ ...settingsForm, withdrawal_fee_percent: Number(e.target.value) })}
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-3 py-2 text-slate-200 font-mono focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Maintenance Mode</label>
              <select
                value={settingsForm.is_maintenance ? 'true' : 'false'}
                onChange={(e) => setSettingsForm({ ...settingsForm, is_maintenance: e.target.value === 'true' })}
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-3 py-2 text-slate-200 focus:border-cyan-400 focus:outline-none"
              >
                <option value="false">Off (Online & Accepting Players)</option>
                <option value="true">On (Maintenance Lockout)</option>
              </select>
            </div>
          </div>
        </form>
      )}

      {/* Tab: Anti-Cheat */}
      {activeTab === 'anticheat' && (
        <div className="glass rounded-3xl p-5 border border-white/10 space-y-3.5 shadow-2xl">
          <h3 className="font-bold text-slate-200 text-sm">Real-Time Security & Violation Logs</h3>
          <div className="space-y-2">
            {cheatLogs.map((log) => (
              <div
                key={log.id}
                className="bg-slate-900/80 rounded-2xl p-3.5 border border-white/10 flex items-center justify-between font-mono text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 font-sans">
                    <span className="font-bold text-red-400">{log.action_type}</span>
                    <span className="text-[10px] text-cyan-400 font-mono">User #{log.user_id}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{log.reason}</div>
                  <div className="text-[10px] text-slate-500">{log.created_at}</div>
                </div>

                <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold">
                  FLAGGED
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
