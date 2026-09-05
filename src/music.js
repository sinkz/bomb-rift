// Original four-bar motifs. MIDI pitches, eighth-note grid; no downloaded audio.
export const THEMES = {
  menu: { name: 'Uma faísca no escuro', bpm: 82, roots: [50, 58, 53, 48], melody: [74,null,77,81,null,77,74,null,72,null,69,72,74,null,69,null], wave: 'sine' },
  ruins: { name: 'Ecos sob a pedra', bpm: 98, roots: [50, 53, 48, 55], melody: [74,null,77,76,74,null,69,72,74,77,null,81,79,null,77,72], wave: 'triangle' },
  forge: { name: 'Coração de brasa', bpm: 116, roots: [40, 43, 48, 47], melody: [76,76,null,79,83,null,81,79,76,null,74,76,79,78,74,null], wave: 'square' },
  abyss: { name: 'Maré das estrelas mortas', bpm: 90, roots: [45, 41, 48, 43], melody: [81,null,null,84,83,null,79,null,76,null,79,83,81,null,76,null], wave: 'sine' },
};
const hz = midi => 440 * 2 ** ((midi - 69) / 12);

export class Music {
  constructor(ctx, destination) {
    this.ctx = ctx; this.destination = destination; this.key = ''; this.step = 0; this.next = 0;
    this.enabled = true; this.volume = .42; this.boss = false; this.active = new Set();
    this.bus = ctx.createGain(); this.bus.gain.value = 0; this.bus.connect(destination);
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * .14), ctx.sampleRate);
    const data = buffer.getChannelData(0); let seed = 781;
    for (let i = 0; i < data.length; i++) { seed = (seed * 16807) % 2147483647; data[i] = (seed / 2147483647 * 2 - 1) * (1 - i / data.length) ** 3; }
    this.noise = buffer;
  }
  setScene(key = 'menu', boss = false, enraged = false, quiet = false) {
    if (!THEMES[key]) key = 'menu';
    if (this.key !== key || this.boss !== boss || this.enraged !== enraged) {
      this.key = key; this.boss = boss; this.enraged = enraged;
      for (const source of this.active) { try { source.stop(this.ctx.currentTime + .03); } catch {} }
      this.active.clear(); this.step = 0; this.next = this.ctx.currentTime + .06;
    }
    this.quiet = quiet;
    const target = this.enabled && !quiet ? this.volume * .32 : 0;
    if (this.target !== target) { this.target = target; this.bus.gain.setTargetAtTime(target, this.ctx.currentTime, .18); }
  }
  connect(source, tail) {
    this.active.add(source);
    source.onended = () => { this.active.delete(source); source.disconnect(); for (const node of tail) node.disconnect(); };
  }
  note(midi, at, duration, volume, wave = 'triangle', slide = false) {
    const ctx = this.ctx, osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = wave; osc.frequency.setValueAtTime(hz(midi), at);
    if (slide) osc.frequency.exponentialRampToValueAtTime(hz(midi - 22), at + duration);
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(volume, at + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    osc.connect(gain); gain.connect(this.bus); this.connect(osc, [gain]); osc.start(at); osc.stop(at + duration + .02);
  }
  hat(at, volume, low = false) {
    const src = this.ctx.createBufferSource(), gain = this.ctx.createGain(), filter = this.ctx.createBiquadFilter();
    src.buffer = this.noise; gain.gain.value = volume;
    filter.type = low ? 'bandpass' : 'highpass'; filter.frequency.value = low ? 1700 : 6500;
    src.connect(filter); filter.connect(gain); gain.connect(this.bus); this.connect(src, [filter, gain]); src.start(at);
  }
  schedule(step, at, beat) {
    const theme = THEMES[this.key], bar = Math.floor(step / 8) % 4, slot = step % 8, root = theme.roots[bar];
    const tense = this.boss, intensity = this.enraged ? 1.2 : 1;
    // Harmony, bass and melody occupy different registers to leave room for SFX.
    if (slot === 0) for (const pitch of [root + 12, root + 15, root + 19]) this.note(pitch, at, beat * 7.6, .075, 'sine');
    if (slot === 0 || slot === 4 || tense && slot === 6) this.note(root - (tense ? 12 : 0), at, beat * 1.7, .48, 'triangle');
    const pitch = theme.melody[step % theme.melody.length];
    if (pitch !== null) this.note(pitch + (bar === 2 ? -5 : bar === 3 ? -2 : 0), at, beat * (this.key === 'abyss' ? 2.3 : 1.3), theme.wave === 'square' ? .09 : .27, theme.wave);
    if (tense && slot % 2 === 1) this.note(root + [24,31,27,34][Math.floor(slot/2)], at, beat * .65, .10, 'sawtooth');
    if (this.key !== 'menu') {
      if (slot === 0 || slot === 4 || tense && slot === 3) this.note(46, at, .14, .7 * intensity, 'sine', true);
      if (slot === 2 || slot === 6) this.hat(at, .38 * intensity, true);
      this.hat(at, slot % 2 ? .10 : .06);
    }
  }
  update() {
    if (this.ctx.state !== 'running' || !this.key) return;
    const now = this.ctx.currentTime;
    if (!this.enabled || this.quiet) { this.next = now + .06; return; }
    if (this.next < now - .1) this.next = now + .025;
    const beat = 30 / (THEMES[this.key].bpm + (this.boss ? 22 : 0) + (this.enraged ? 8 : 0));
    while (this.next < now + .15) { this.schedule(this.step++, this.next, beat); this.next += beat; }
  }
}
