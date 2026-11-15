export class ChamberScore {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.seamX = 0.5;
    this.masterGain = null;
    this.londonGain = null;
    this.parisGain = null;
    this.reverb = null;
    this.noiseBuffer = null;
    this._drumTimer = null;
  }

  _ensureContext() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.0;
    this.masterGain.connect(this.ctx.destination);

    // Build shared algorithmic hall reverb
    this.reverb = this.ctx.createConvolver();
    this.reverb.buffer = this._createReverbImpulse(2.4, 2.8);
    const reverbMix = this.ctx.createGain();
    reverbMix.gain.value = 0.36;
    this.reverb.connect(reverbMix);
    reverbMix.connect(this.masterGain);

    // Pre-generate shared noise buffer
    this.noiseBuffer = this._createNoiseBuffer(2.0);

    this.londonGain = this.ctx.createGain();
    this.parisGain = this.ctx.createGain();
    this.londonGain.connect(this.masterGain);
    this.londonGain.connect(this.reverb);
    this.parisGain.connect(this.masterGain);
    this.parisGain.connect(this.reverb);

    this._buildLondonVoice();
    this._buildParisVoice();
    this._applySeamCrossfade();
  }

  _createReverbImpulse(seconds, decay) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  _createNoiseBuffer(seconds) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(1, len, rate);
    const data = buf.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.04 * white) / 1.04;
      lastOut = data[i];
      data[i] *= 2.2;
    }
    return buf;
  }

  _buildLondonVoice() {
    // Warm D-minor chamber cello/viola bed (D2, A2, F3)
    const freqs = [73.42, 110.0, 174.61];
    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = idx === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.value = f;

      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.18 + idx * 0.07;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 0.6;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = idx === 0 ? 290 : 480;

      const g = this.ctx.createGain();
      g.gain.value = idx === 0 ? 0.09 : 0.055;

      osc.connect(filter);
      filter.connect(g);
      g.connect(this.londonGain);

      osc.start();
      lfo.start();
    });

    // Soft London drizzle on cobbles
    const rainSrc = this.ctx.createBufferSource();
    rainSrc.buffer = this.noiseBuffer;
    rainSrc.loop = true;

    const rainFilter = this.ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 1850;
    rainFilter.Q.value = 0.65;

    const rainGain = this.ctx.createGain();
    rainGain.gain.value = 0.045;

    rainSrc.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(this.londonGain);
    rainSrc.start();
  }

  _buildParisVoice() {
    // Tense bourdon reed drone (C#2, G2 tritone shadow, D3)
    const freqs = [69.3, 98.0, 146.83];
    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = f;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 260 + idx * 90;

      const g = this.ctx.createGain();
      g.gain.value = idx === 0 ? 0.09 : 0.042;

      osc.connect(filter);
      filter.connect(g);
      g.connect(this.parisGain);
      osc.start();
    });

    // Low brazier / distant street murmur
    const fireSrc = this.ctx.createBufferSource();
    fireSrc.buffer = this.noiseBuffer;
    fireSrc.loop = true;

    const fireFilter = this.ctx.createBiquadFilter();
    fireFilter.type = 'lowpass';
    fireFilter.frequency.value = 420;

    const fireGain = this.ctx.createGain();
    fireGain.gain.value = 0.08;

    fireSrc.connect(fireFilter);
    fireFilter.connect(fireGain);
    fireGain.connect(this.parisGain);
    fireSrc.start();

    // Distant muffled revolutionary drum heartbeat
    this._drumTimer = setInterval(() => {
      if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
      if (this.seamX > 0.85) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(68, now);
      osc.frequency.exponentialRampToValueAtTime(34, now + 0.35);
      g.gain.setValueAtTime(0.11, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      osc.connect(g);
      g.connect(this.parisGain);
      osc.start(now);
      osc.stop(now + 0.45);
    }, 1900);
  }

  _applySeamCrossfade() {
    if (!this.ctx || !this.londonGain || !this.parisGain) return;
    // seamX near 1 -> mostly London visible; seamX near 0 -> mostly Paris visible
    const lonWeight = Math.sin(this.seamX * Math.PI * 0.5);
    const parWeight = Math.cos(this.seamX * Math.PI * 0.5);
    const now = this.ctx.currentTime;
    this.londonGain.gain.setTargetAtTime(lonWeight, now, 0.08);
    this.parisGain.gain.setTargetAtTime(parWeight, now, 0.08);
  }

  async toggle() {
    this._ensureContext();
    if (!this.ctx) return false;

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.enabled = !this.enabled;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.enabled ? 0.85 : 0.0, now, 0.15);
    return this.enabled;
  }

  updateSeam(seamX) {
    this.seamX = Math.max(0.04, Math.min(0.96, seamX));
    if (this.enabled) {
      this._applySeamCrossfade();
    }
  }

  playPageTurn() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1400, now);
    bp.frequency.exponentialRampToValueAtTime(2800, now + 0.12);
    bp.Q.value = 1.4;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.08, now + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    src.connect(bp);
    bp.connect(g);
    g.connect(this.masterGain);
    src.start(now);
    src.stop(now + 0.18);
  }

  playMirrorFlip(side) {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = side === 'london' ? 587.33 : 293.66;
    g.gain.setValueAtTime(0.05, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(g);
    g.connect(this.reverb);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  playWaxShatter() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Crisp brittle crack
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1200;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.22, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    src.connect(hp);
    hp.connect(ng);
    ng.connect(this.masterGain);
    src.start(now);
    src.stop(now + 0.16);

    // Resonant seal thud
    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.24);
    og.gain.setValueAtTime(0.18, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(og);
    og.connect(this.reverb);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  playUnlockChime() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [293.66, 369.99, 440.0, 587.33, 739.99]; // D major resolution ("Recalled to Life")
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.095;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.001, start);
      g.gain.linearRampToValueAtTime(0.09, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, start + 1.15);
      osc.connect(g);
      g.connect(this.reverb);
      osc.start(start);
      osc.stop(start + 1.2);
    });
  }

  speakEnglishSnippet(text) {
    if (!('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-GB';
    utter.rate = 0.88;
    const voices = window.speechSynthesis.getVoices();
    const gbVoice = voices.find((v) => v.lang && v.lang.toLowerCase().includes('en-gb'));
    if (gbVoice) utter.voice = gbVoice;
    window.speechSynthesis.speak(utter);
  }

  dispose() {
    if (this._drumTimer) clearInterval(this._drumTimer);
    if (this.ctx) {
      this.ctx.close().catch(() => {});
    }
  }
}
