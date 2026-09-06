/**
 * Web Audio API synthesizer for clean sound effects without external audio files
 * Also handles Telegram WebApp Haptic Feedback
 */

class SoundController {
  private ctx: AudioContext | null = null;
  public soundEnabled: boolean = true;
  public hapticEnabled: boolean = true;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Telegram Haptic
  public triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error' = 'light') {
    if (!this.hapticEnabled) return;
    try {
      const tg = (window as unknown as { Telegram?: { WebApp?: { HapticFeedback?: {
        impactOccurred: (style: string) => void;
        selectionChanged: () => void;
        notificationOccurred: (type: string) => void;
      } } } }).Telegram?.WebApp?.HapticFeedback;

      if (tg) {
        if (type === 'selection') {
          tg.selectionChanged();
        } else if (['success', 'warning', 'error'].includes(type)) {
          tg.notificationOccurred(type);
        } else {
          tg.impactOccurred(type);
        }
      } else if ('vibrate' in navigator) {
        navigator.vibrate(type === 'heavy' ? 25 : 12);
      }
    } catch {
      // Ignore vibration error
    }
  }

  // Tap Coin Sound
  public playTap(multiplier: number = 1) {
    if (!this.soundEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const baseFreq = 520 + Math.min(multiplier * 40, 300) + (Math.random() * 30 - 15);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.09);
    } catch {
      // ignore
    }
  }

  // Success / Claim Sound
  public playSuccess() {
    if (!this.soundEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0.1, this.ctx!.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * 0.08 + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(this.ctx!.currentTime + idx * 0.08);
        osc.stop(this.ctx!.currentTime + idx * 0.08 + 0.22);
      });
    } catch {
      // ignore
    }
  }

  // Level Up Fanfare
  public playLevelUp() {
    if (!this.soundEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const chords = [523.25, 659.25, 783.99, 1046.50];
      chords.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.1);

        gain.gain.setValueAtTime(0.08, this.ctx!.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * 0.1 + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(this.ctx!.currentTime + idx * 0.1);
        osc.stop(this.ctx!.currentTime + idx * 0.1 + 0.4);
      });
    } catch {
      // ignore
    }
  }
}

export const soundFx = new SoundController();
