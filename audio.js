class AudioEngine {
  constructor() {
    this.ctx = null;
    this.waveform = 'triangle';
  }

  setWaveform(type) {
    this.waveform = type;
  }

  async init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  // Schedule a note to play
  // time: AudioContext time to start
  // duration: duration in seconds
  // frequency: Hz
  scheduleNote(frequency, time, duration) {
    if (!this.ctx) return;

    if (this.waveform === 'piano') {
      // FM Synthesis for Electric Piano
      const t = time;

      // Carrier
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.value = frequency;
      osc.type = 'sine';

      // Modulator
      const mod = this.ctx.createOscillator();
      const modGain = this.ctx.createGain();
      mod.frequency.value = frequency * 4;
      mod.type = 'sine';

      // Wiring
      mod.connect(modGain);
      modGain.connect(osc.frequency);
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      // Configuration
      const attack = 0.005;
      const decay = 0.3;

      // Carrier Envelope
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.8, t + attack);
      gain.gain.exponentialRampToValueAtTime(0.1, t + duration);
      gain.gain.setValueAtTime(0.1, t + duration - 0.05);
      gain.gain.linearRampToValueAtTime(0, t + duration);

      // Modulator Envelope
      const modIndex = frequency * 2;
      modGain.gain.setValueAtTime(0, t);
      modGain.gain.linearRampToValueAtTime(modIndex, t + attack);
      modGain.gain.exponentialRampToValueAtTime(1, t + decay);
      modGain.gain.linearRampToValueAtTime(0, t + duration);

      osc.start(t);
      mod.start(t);
      osc.stop(t + duration + 0.1);
      mod.stop(t + duration + 0.1);

      return;
    }

    // Basic Waveforms
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = this.waveform;
    osc.frequency.value = frequency;

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    // Envelope
    const attack = 0.01;
    const release = 0.05;

    // Prevent clicking
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.5, time + attack);
    gain.gain.setValueAtTime(0.5, time + duration - release);
    gain.gain.linearRampToValueAtTime(0, time + duration);

    osc.start(time);
    osc.stop(time + duration + 0.1); // Cleanup
  }

  getCurrentTime() {
    return this.ctx ? this.ctx.currentTime : 0;
  }
}
