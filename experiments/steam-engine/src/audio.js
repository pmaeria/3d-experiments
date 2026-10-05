// Procedural sound: every noise is synthesised in the browser from filtered
// noise and oscillators — exhaust beats, fire roar, safety valve, whistle,
// injector, drain cocks, rod clank, shovel and the reverberant hall.

export class EngineAudio {
  constructor() {
    this.ctx = null;
    this.on = false;
    this.volume = 0.8;
  }

  async init() {
    if (this.ctx) return;
    const ctx = (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
    this.master = ctx.createGain(); this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.2;
    this.master.connect(comp).connect(ctx.destination);
    // hall reverb
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(3.2, 2.6);
    this.wet = ctx.createGain(); this.wet.gain.value = 0.42;
    this.reverb.connect(this.wet).connect(this.master);
    this.white = this.noiseBuffer('white', 3);
    this.brown = this.noiseBuffer('brown', 4);

    this.layers = {
      fire: this.loopLayer(this.brown, [['lowpass', 380, 0.7]], 0.0, 0.3),
      fireHigh: this.loopLayer(this.white, [['bandpass', 900, 0.5]], 0.0, 0.25),
      safety: this.loopLayer(this.white, [['highpass', 2400, 0.7], ['peaking', 5200, 1.2, 8]], 0.0, 0.5),
      blower: this.loopLayer(this.white, [['bandpass', 1300, 0.8]], 0.0, 0.35),
      injector: this.loopLayer(this.white, [['bandpass', 2300, 4]], 0.0, 0.3),
      drain: this.loopLayer(this.white, [['highpass', 1300, 0.6], ['lowpass', 7000, 0.7]], 0.0, 0.35),
      rumble: this.loopLayer(this.brown, [['lowpass', 140, 0.8]], 0.0, 0.2),
      room: this.loopLayer(this.brown, [['lowpass', 220, 0.5]], 0.012, 0.6),
    };
    // injector "singing"
    const sing = ctx.createOscillator(); sing.type = 'sine'; sing.frequency.value = 940;
    this.singGain = ctx.createGain(); this.singGain.gain.value = 0;
    sing.connect(this.singGain); this.route(this.singGain, 0.4); sing.start();
    this.buildWhistle();
    this.lastCrank = null;
    this.prevDoor = 0;
  }

  route(node, send = 0.3) {
    node.connect(this.master);
    const s = this.ctx.createGain(); s.gain.value = send;
    node.connect(s).connect(this.reverb);
  }

  impulse(seconds, decay) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * seconds);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (i < 400 ? i / 400 : 1);
      }
    }
    return b;
  }

  noiseBuffer(kind, seconds) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * seconds);
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
    return b;
  }

  loopLayer(buffer, filters, gain, send) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = buffer; src.loop = true;
    src.loopStart = Math.random(); src.playbackRate.value = 1;
    let node = src;
    for (const [type, f, q, g] of filters) {
      const bq = ctx.createBiquadFilter(); bq.type = type; bq.frequency.value = f; bq.Q.value = q;
      if (g !== undefined) bq.gain.value = g;
      node.connect(bq); node = bq;
    }
    const out = ctx.createGain(); out.gain.value = gain;
    node.connect(out); this.route(out, send);
    src.start(0, Math.random() * buffer.duration);
    return { src, out };
  }

  buildWhistle() {
    const ctx = this.ctx;
    this.whistleGain = ctx.createGain(); this.whistleGain.gain.value = 0;
    const f = 587;
    this.whistleOsc = [];
    for (const [mul, amp, type] of [[1, 0.5, 'sine'], [2.005, 0.18, 'sine'], [2.99, 0.08, 'triangle'], [1.498, 0.06, 'sine']]) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f * mul;
      const g = ctx.createGain(); g.gain.value = amp;
      o.connect(g).connect(this.whistleGain); o.start();
      this.whistleOsc.push({ o, mul });
    }
    // breathy edge of the whistle
    const n = ctx.createBufferSource(); n.buffer = this.white; n.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 6;
    const ng = ctx.createGain(); ng.gain.value = 0.7;
    n.connect(bp).connect(ng).connect(this.whistleGain); n.start();
    const vib = ctx.createOscillator(); vib.frequency.value = 5.5;
    const vg = ctx.createGain(); vg.gain.value = 3;
    vib.connect(vg);
    for (const { o } of this.whistleOsc) vg.connect(o.detune);
    vib.start();
    this.route(this.whistleGain, 0.8);
    this.whistleBase = f;
    this.whistleOn = false;
  }

  setEnabled(on) {
    this.on = on;
    if (!this.ctx) return;
    if (on && this.ctx.state === 'suspended') this.ctx.resume();
    this.master.gain.setTargetAtTime(on ? this.volume : 0, this.ctx.currentTime, 0.3);
  }

  set(layer, value, tc = 0.08) {
    this.layers[layer].out.gain.setTargetAtTime(value, this.ctx.currentTime, tc);
  }

  chuff(strength, speed, side) {
    const ctx = this.ctx, t = ctx.currentTime;
    const k = Math.min(1.5, strength);
    const decay = Math.max(0.07, 0.32 - speed * 0.012);
    // the breathy blast
    const src = ctx.createBufferSource(); src.buffer = this.white;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 260 + Math.random() * 120 + (side ? 30 : 0); bp.Q.value = 0.8;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400 + k * 1800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.55 * k + 0.02, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay * 2.2);
    src.connect(bp).connect(lp).connect(g);
    this.route(g, 0.55);
    src.start(t, Math.random() * 2, decay * 2.5);
    // a soft chest thump
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.15);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.32 * k + 0.01, t + 0.01);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(og); this.route(og, 0.3);
    o.start(t); o.stop(t + 0.3);
  }

  clank(intensity) {
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.white;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800 + Math.random() * 1600; bp.Q.value = 12;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05 + intensity * 0.12, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    src.connect(bp).connect(g); this.route(g, 0.5);
    src.start(t, Math.random() * 2, 0.12);
  }

  shovel() {
    const ctx = this.ctx, t0 = ctx.currentTime;
    // scrape of the shovel then coal rattling onto the fire
    const src = ctx.createBufferSource(); src.buffer = this.white;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 1.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
    src.connect(bp).connect(g); this.route(g, 0.4);
    src.start(t0, Math.random(), 0.4);
    for (let i = 0; i < 9; i++) {
      const t = t0 + 0.35 + Math.random() * 0.25;
      const s = ctx.createBufferSource(); s.buffer = this.white;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2500 + Math.random() * 3000; f.Q.value = 6;
      const gg = ctx.createGain();
      gg.gain.setValueAtTime(0.0001, t);
      gg.gain.exponentialRampToValueAtTime(0.08, t + 0.002);
      gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      s.connect(f).connect(gg); this.route(gg, 0.5);
      s.start(t, Math.random() * 2, 0.08);
    }
  }

  update(sim, timeScale) {
    if (!this.ctx || !this.on) return;
    for (const e of sim.events) {
      if (e.type === 'chuff') this.chuff(e.strength, Math.abs(sim.speed) * Math.min(1, timeScale * 1.5), e.side);
    }
    const heat = Math.max(0, Math.min(1.3, (sim.fireTemp - 300) / 1000));
    this.set('fire', 0.05 + heat * 0.12 * (0.4 + Math.min(1.5, sim.draught)), 0.3);
    this.set('fireHigh', heat * 0.02 * Math.min(1.5, sim.draught), 0.3);
    this.set('safety', Math.min(0.5, sim.safety * 0.18), 0.05);
    this.set('blower', sim.c.blower * 0.05, 0.2);
    this.set('injector', sim.injFlow > 0 ? 0.06 : 0, 0.1);
    this.singGain.gain.setTargetAtTime(sim.injFlow > 0 ? 0.012 : 0, this.ctx.currentTime, 0.2);
    let drain = 0;
    if (sim.c.drainCocks) for (const s of sim.sides) drain += Math.max(0, s.pF - 20) + Math.max(0, s.pR - 20);
    this.set('drain', Math.min(0.4, drain / 400), 0.02);
    const v = Math.abs(sim.speed) * Math.min(1, timeScale);
    this.set('rumble', Math.min(0.35, v * 0.02), 0.2);
    this.layers.rumble.src.playbackRate.setTargetAtTime(0.7 + Math.min(1.2, v * 0.04), this.ctx.currentTime, 0.3);
    // whistle
    const w = sim.c.whistle;
    const t = this.ctx.currentTime;
    if (w !== this.whistleOn) {
      this.whistleOn = w;
      this.whistleGain.gain.cancelScheduledValues(t);
      this.whistleGain.gain.setTargetAtTime(w ? 0.16 : 0, t, w ? 0.04 : 0.09);
      for (const { o, mul } of this.whistleOsc) {
        o.frequency.cancelScheduledValues(t);
        o.frequency.setValueAtTime(this.whistleBase * mul * (w ? 0.93 : 1), t);
        o.frequency.setTargetAtTime(this.whistleBase * mul * (w ? 1 : 0.95), t, w ? 0.06 : 0.12);
      }
    }
    // rod clank at each dead centre of the right-hand crank
    const crank = Math.floor((sim.theta + Math.PI / 4) / Math.PI);
    if (this.lastCrank !== null && crank !== this.lastCrank && Math.abs(sim.speed) > 0.2) this.clank(Math.min(1, sim.torque ? Math.abs(sim.torque) / 60000 : 0.3));
    this.lastCrank = crank;
    if ((sim.firingDoor ?? 0) > 0.5 && this.prevDoor <= 0.5) this.shovel();
    this.prevDoor = sim.firingDoor ?? 0;
  }
}
