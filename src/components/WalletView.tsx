import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { Wallet, ArrowUpRight, ArrowDownLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { LedgerTransaction, WithdrawalRequest } from '../types';

export const WalletView: React.FC = () => {
  const { gameState, requestWithdrawal, t } = useGame();
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState<'USDT_TRC20' | 'TON' | 'INTERNAL_WALLET'>('USDT_TRC20');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);

  const fetchWalletData = () => {
    fetch('/api/transactions')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setTransactions(data.data);
      });

    fetch('/api/withdrawals')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setWithdrawals(data.data);
      });
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  const balance = gameState?.balance;
  const settings = gameState?.settings;

  const numAmount = parseInt(withdrawAmount, 10) || 0;
  const fee = Math.floor(numAmount * ((settings?.withdrawal_fee_percent || 5) / 100));
  const netAmount = Math.max(0, numAmount - fee);

  const handleSubmitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numAmount || !withdrawAddress.trim()) return;

    setSubmitting(true);
    setStatusMessage(null);

    const res = await requestWithdrawal(numAmount, withdrawMethod, withdrawAddress.trim());
    setSubmitting(false);

    if (res.success) {
      setStatusMessage({ type: 'success', text: res.message });
      setWithdrawAmount('');
      setWithdrawAddress('');
      setTimeout(() => {
        setShowWithdrawModal(false);
        setStatusMessage(null);
      }, 1800);
      fetchWalletData();
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-24 space-y-4">
      {/* Wallet Balance Hero Card (Immersive UI Glass) */}
      <div className="glass rounded-3xl p-5 border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.25)]">
              <Wallet size={18} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-cyan-400 font-semibold">
                TREASURY & WALLET
              </div>
              <span className="text-xs font-bold text-slate-200">{t.my_wallet}</span>
            </div>
          </div>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold">
            Verified
          </span>
        </div>

        {/* Primary Coins */}
        <div className="my-3">
          <div className="text-3xl sm:text-4xl font-black text-amber-400 font-mono tracking-tight flex items-baseline gap-2 drop-shadow-md">
            <span>{(balance?.coins || 0).toLocaleString()}</span>
            <span className="text-sm font-bold text-amber-300 uppercase font-sans">
              {settings?.coin_symbol}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Internal Game Currency • {settings?.coin_name}
          </span>
        </div>

        {/* Breakdown Grid */}
        <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-white/10 text-xs">
          <div className="bg-slate-900/80 rounded-2xl p-3 border border-white/10">
            <span className="text-[10px] text-slate-400 block mb-0.5">{t.available_balance}</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              {(balance?.available_balance || 0).toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-900/80 rounded-2xl p-3 border border-white/10">
            <span className="text-[10px] text-slate-400 block mb-0.5">{t.pending_balance}</span>
            <span className="font-mono font-bold text-amber-400 text-sm">
              {(balance?.pending_withdrawal || 0).toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-900/80 rounded-2xl p-3 border border-white/10">
            <span className="text-[10px] text-slate-400 block mb-0.5">{t.total_earned}</span>
            <span className="font-mono font-bold text-slate-200 text-sm">
              {(balance?.total_earned || 0).toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-900/80 rounded-2xl p-3 border border-white/10">
            <span className="text-[10px] text-slate-400 block mb-0.5">{t.total_withdrawn}</span>
            <span className="font-mono font-bold text-cyan-400 text-sm">
              {(balance?.total_withdrawn || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Withdraw Trigger Button */}
        <button
          id="btn-open-withdraw-modal"
          onClick={() => setShowWithdrawModal(true)}
          className="w-full mt-4 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-teal-400 hover:opacity-95 text-black font-black text-sm flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(34,211,238,0.35)] active:scale-95 transition-all"
        >
          <ArrowUpRight size={18} />
          <span>{t.request_withdrawal}</span>
        </button>
      </div>

      {/* Pending Withdrawals Queue if any */}
      {withdrawals.length > 0 && (
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold text-slate-300 px-1">Withdrawal Requests</h4>
          <div className="space-y-2">
            {withdrawals.map((wd) => (
              <div
                key={wd.id}
                className="glass rounded-2xl p-3.5 border border-white/10 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">#{wd.id}</span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                        wd.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : wd.status === 'rejected'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {wd.status}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {wd.method} • {wd.destination_address.substring(0, 10)}...
                  </span>
                </div>

                <div className="text-right font-mono">
                  <span className="font-bold text-slate-100 block">
                    {wd.amount.toLocaleString()} {settings?.coin_symbol}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Net: {wd.net_amount.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Immutable Transaction History */}
      <div className="glass rounded-3xl p-4 border border-white/10 space-y-3 shadow-xl">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold">📜</span>
            <h3 className="text-sm font-bold text-slate-100">{t.transaction_history}</h3>
          </div>
          <span className="text-xs text-cyan-400 font-mono">Ledger Verified</span>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1 no-scrollbar">
          {transactions.map((tx) => {
            const isCredit = tx.amount > 0;
            return (
              <div
                key={tx.id}
                className="bg-slate-900/80 rounded-2xl p-3 border border-white/5 flex items-center justify-between text-xs hover:border-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      isCredit
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/15 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {isCredit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                  </div>
                  <div>
                    <span className="font-bold text-slate-200 capitalize block">{tx.type.replace('_', ' ')}</span>
                    <span className="text-[10px] text-slate-400 line-clamp-1">{tx.reference}</span>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <span
                    className={`font-bold block ${
                      isCredit ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {isCredit ? '+' : ''}
                    {tx.amount.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Bal: {tx.balance_after.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl relative animate-in fade-in zoom-in duration-150 border border-white/15">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-black text-slate-100 text-base flex items-center gap-2">
                <ArrowUpRight className="text-cyan-400" size={18} />
                <span>{t.request_withdrawal}</span>
              </h3>
              <button
                id="btn-close-withdraw-modal"
                onClick={() => setShowWithdrawModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-xl"
              >
                ✕
              </button>
            </div>

            {statusMessage && (
              <div
                className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}
              >
                {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{statusMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmitWithdrawal} className="space-y-3.5 text-xs">
              {/* Method */}
              <div>
                <label className="text-slate-300 font-bold block mb-1.5">Select Method</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['USDT_TRC20', 'TON', 'INTERNAL_WALLET'] as const).map((m) => (
                    <button
                      type="button"
                      key={m}
                      id={`btn-method-${m}`}
                      onClick={() => setWithdrawMethod(m)}
                      className={`py-2 px-1 rounded-xl font-bold border transition-all text-center text-[11px] ${
                        withdrawMethod === m
                          ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                          : 'bg-slate-900/80 border-white/10 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {m === 'USDT_TRC20' ? 'USDT' : m === 'TON' ? 'TON' : 'Internal'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <div className="flex justify-between text-slate-300 font-bold mb-1.5">
                  <span>Amount ({settings?.coin_symbol})</span>
                  <span className="text-cyan-400 font-mono">
                    Avail: {(balance?.available_balance || 0).toLocaleString()}
                  </span>
                </div>
                <div className="relative">
                  <input
                    id="input-withdraw-amount"
                    type="number"
                    min={settings?.min_withdrawal || 10000}
                    max={balance?.available_balance || 0}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder={`Min: ${(settings?.min_withdrawal || 10000).toLocaleString()}`}
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(String(balance?.available_balance || 0))}
                    className="absolute right-2 top-2 px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-400/30"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Destination Address */}
              <div>
                <label className="text-slate-300 font-bold block mb-1.5">Destination Address / ID</label>
                <input
                  id="input-withdraw-address"
                  type="text"
                  value={withdrawAddress}
                  onChange={(e) => setWithdrawAddress(e.target.value)}
                  placeholder={
                    withdrawMethod === 'USDT_TRC20'
                      ? 'T...'
                      : withdrawMethod === 'TON'
                      ? 'EQ...'
                      : '@telegram_username or ID'
                  }
                  className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-slate-100 font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  required
                />
              </div>

              {/* Summary of Fees */}
              <div className="bg-slate-900/80 rounded-xl p-2.5 border border-white/10 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>Fee ({settings?.withdrawal_fee_percent || 5}%):</span>
                  <span>{fee.toLocaleString()} {settings?.coin_symbol}</span>
                </div>
                <div className="flex justify-between text-cyan-400 font-bold border-t border-white/10 pt-1">
                  <span>Net Payout:</span>
                  <span>{netAmount.toLocaleString()} {settings?.coin_symbol}</span>
                </div>
              </div>

              <button
                id="btn-confirm-withdrawal"
                type="submit"
                disabled={submitting || numAmount <= 0}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-teal-400 text-black font-black text-xs shadow-[0_0_15px_rgba(34,211,238,0.35)] hover:opacity-95 transition-all"
              >
                {submitting ? 'Submitting to Ledger...' : 'Confirm Withdrawal'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
