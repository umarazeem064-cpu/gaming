class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;

  public setEnabled(val: boolean) {
    this.enabled = val;
  }

  private getCtx(): AudioContext | null {
    if (!this.enabled) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public tone(freq: number, duration = 0.08, type: OscillatorType = 'sine', volume = 0.12) {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // Ignore audio failures on locked browsers
    }
  }

  public click() {
    this.tone(520, 0.04, 'triangle', 0.08);
  }

  public bounce() {
    this.tone(310, 0.06, 'sine', 0.1);
  }

  public slice() {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.09);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // ignore
    }
  }

  public score() {
    this.tone(660, 0.07, 'triangle', 0.11);
    setTimeout(() => this.tone(880, 0.09, 'triangle', 0.1), 55);
  }

  public laser() {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(720, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.08);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // ignore
    }
  }

  public hit() {
    this.tone(140, 0.12, 'sawtooth', 0.14);
  }

  public win() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      setTimeout(() => this.tone(f, 0.16, 'triangle', 0.12), idx * 80);
    });
  }

  public fail() {
    [320, 240, 170].forEach((f, idx) => {
      setTimeout(() => this.tone(f, 0.14, 'sawtooth', 0.1), idx * 95);
    });
  }

  public note(midiIndex: number) {
    const freq = 261.63 * Math.pow(2, midiIndex / 12);
    this.tone(freq, 0.22, 'triangle', 0.14);
  }
}

export const soundFX = new SoundEngine();

export function seededRandom(seed: number): () => number {
  let s = (seed * 9301 + 49297) % 233280;
  if (s <= 0) s += 233280;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
