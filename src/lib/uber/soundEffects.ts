// Pure Web Audio API Synthesizer for Authentic Uber 2.0 Dispatch & Cashout Chimes
// Zero external mp3 dependencies, 100% reliable in all modern browsers

class UberSoundEffects {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {
        // Ignored: browser autoplay policy restriction will resolve on next user touch/click
      });
    }
    return this.ctx;
  }

  // Authentic Uber Dispatch Ping (Rising two-tone urgency beep)
  playDispatchAlert() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Tone 1: High pitch attention beep
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, now); // A5
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Tone 2: Higher pitch confirmation beep
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1174.66, now + 0.18); // D6
      gain2.gain.setValueAtTime(0.35, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.38);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.38);
    } catch (e) {
      console.warn("Audio chime prevented by browser autoplay policy:", e);
    }
  }

  // Triumphant Cash Register / Trip Completed Success Chime
  playTripCompletedCashChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 (Major chord arpeggio)

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + idx * 0.08;

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.4);
      });
    } catch (e) {
      console.warn("Audio chime error:", e);
    }
  }

  // Instant Bank IMPS Payout Chime
  playBankPayoutChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + idx * 0.07;

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.35);
      });
    } catch (e) {
      console.warn("Audio chime error:", e);
    }
  }
}

export const uberAudio = new UberSoundEffects();
