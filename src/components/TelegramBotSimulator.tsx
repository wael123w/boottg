import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Send, Bot, Play, RefreshCw } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  replyMarkup?: {
    inline_keyboard?: Array<Array<{ text: string; callback_data?: string; web_app?: { url: string } }>>;
  };
  time: string;
}

export const TelegramBotSimulator: React.FC = () => {
  const { gameState, setActiveTab } = useGame();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_1',
      sender: 'bot',
      text: `🎮 Welcome to ${gameState?.settings.game_name || 'TapEmpire'}!\n\nTap the coin, complete tasks and invite friends to earn internal ${gameState?.settings.coin_name || 'Empire Coin'} (${gameState?.settings.coin_symbol || 'EPC'}).\n\n⚡ Level up your mine, unlock Turbo multipliers, and claim daily streak rewards!`,
      replyMarkup: {
        inline_keyboard: [
          [{ text: '🎮 PLAY NOW', web_app: { url: window.location.origin } }],
          [
            { text: '💰 WALLET', callback_data: '/balance' },
            { text: '👥 REFERRALS', callback_data: '/referral' },
          ],
          [
            { text: '📋 TASKS', callback_data: '/tasks' },
            { text: '🏆 LEADERBOARD', callback_data: '/leaderboard' },
          ],
        ],
      },
      time: '12:00',
    },
  ]);

  const [inputVal, setInputVal] = useState('');
  const [sending, setSending] = useState(false);

  const sendCommand = async (commandText: string) => {
    const text = commandText.trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setSending(true);

    try {
      const res = await fetch('/api/bot/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            message_id: Date.now(),
            from: {
              id: gameState?.user.telegram_id || 12345678,
              first_name: gameState?.user.first_name || 'Miner',
              username: gameState?.user.username || 'miner_pro',
            },
            text,
          },
        }),
      });

      const data = await res.json();
      if (data.success && data.sent_message) {
        const botMsg: ChatMessage = {
          id: 'msg_bot_' + Date.now(),
          sender: 'bot',
          text: data.sent_message.text,
          replyMarkup: data.sent_message.reply_markup,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMsg]);
      }
    } catch {
      // Fallback
    } finally {
      setSending(false);
    }
  };

  const handleInlineClick = (btn: { text: string; callback_data?: string; web_app?: { url: string } }) => {
    if (btn.web_app) {
      setActiveTab('game');
    } else if (btn.callback_data) {
      sendCommand(btn.callback_data);
    }
  };

  return (
    <div className="max-w-md mx-auto px-3 py-3 pb-24 space-y-3 h-[calc(100vh-130px)] flex flex-col">
      {/* Bot Chat Header (Immersive UI Glass) */}
      <div className="glass rounded-3xl p-3.5 border border-white/10 flex items-center justify-between shrink-0 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 font-bold shadow-[0_0_10px_rgba(34,211,238,0.3)]">
            <Bot size={22} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-100 flex items-center gap-1.5">
              <span>{gameState?.settings.game_name} Bot</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h3>
            <span className="text-[11px] text-cyan-400 font-mono">
              @{gameState?.settings.telegram_bot_username} • Verified Bot
            </span>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('game')}
          className="px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-teal-400 text-black font-black text-xs flex items-center gap-1 shadow-[0_0_12px_rgba(34,211,238,0.3)] hover:opacity-95 active:scale-95 transition-all"
        >
          <Play size={13} fill="currentColor" />
          <span>PLAY NOW</span>
        </button>
      </div>

      {/* Quick Command Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar shrink-0 text-xs">
        {['/start', '/game', '/balance', '/tasks', '/referral', '/help'].map((cmd) => (
          <button
            key={cmd}
            id={`btn-cmd-${cmd.replace('/', '')}`}
            onClick={() => sendCommand(cmd)}
            className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 text-cyan-300 font-mono text-[11px] hover:border-cyan-400/40 whitespace-nowrap transition-colors"
          >
            {cmd}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 no-scrollbar">
        {messages.map((msg) => {
          const isBot = msg.sender === 'bot';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isBot ? 'items-start' : 'items-end'}`}
            >
              <div
                className={`max-w-[85%] rounded-3xl p-3.5 text-xs leading-relaxed shadow-md ${
                  isBot
                    ? 'glass text-slate-100 border border-white/10 rounded-tl-sm'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-semibold rounded-tr-sm shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                }`}
              >
                <p className="whitespace-pre-line">{msg.text}</p>
                <span className={`text-[9px] block text-right mt-1.5 ${isBot ? 'text-slate-400' : 'text-slate-900 font-bold'}`}>
                  {msg.time}
                </span>
              </div>

              {/* Inline Keyboard Buttons */}
              {msg.replyMarkup?.inline_keyboard && (
                <div className="w-[85%] mt-1.5 space-y-1">
                  {msg.replyMarkup.inline_keyboard.map((row, rIdx) => (
                    <div key={rIdx} className="grid grid-cols-2 gap-1.5">
                      {row.map((btn, bIdx) => (
                        <button
                          key={bIdx}
                          onClick={() => handleInlineClick(btn)}
                          className={`py-2 px-3 rounded-2xl font-bold text-xs border text-center transition-all ${
                            btn.web_app
                              ? 'col-span-2 bg-gradient-to-r from-amber-400 to-yellow-300 text-black border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.3)] font-black'
                              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-white/10 hover:border-cyan-400/40'
                          }`}
                        >
                          {btn.text}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Input row */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendCommand(inputVal);
        }}
        className="flex items-center gap-2 shrink-0 pt-1"
      >
        <input
          id="input-bot-command"
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Type command e.g. /game or /balance..."
          className="flex-1 bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
        />
        <button
          id="btn-bot-send"
          type="submit"
          disabled={sending || !inputVal.trim()}
          className="p-2.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-teal-400 text-black font-bold shadow-[0_0_12px_rgba(34,211,238,0.3)] hover:opacity-95 disabled:opacity-50 transition-all"
        >
          {sending ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  );
};
