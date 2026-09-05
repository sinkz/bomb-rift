import { Music, THEMES } from './music.js';

export class Sound {
  constructor() {
    this.enabled = true; this.musicEnabled = true; this.volume = .42; this.muted = false; this.ctx = null;
    try { const p = JSON.parse(localStorage.getItem('bomb-rift-audio-v1') || '{}');
      if (typeof p.effects === 'boolean') this.enabled = p.effects;
      if (typeof p.music === 'boolean') this.musicEnabled = p.music;
      if (Number.isFinite(p.volume)) this.volume = Math.max(0, Math.min(1, p.volume));
    } catch { /* Defaults also work when storage is disabled. */ }
  }
  save() { try { localStorage.setItem('bomb-rift-audio-v1', JSON.stringify({ effects: this.enabled, music: this.musicEnabled, volume: this.volume })); } catch {} }
  init() {
    if (!this.ctx) {
      const Context = window.AudioContext || window.webkitAudioContext; if (!Context) return;
      this.ctx = new Context();
      const limiter = this.ctx.createDynamicsCompressor(); limiter.threshold.value = -8; limiter.ratio.value = 8; limiter.connect(this.ctx.destination);
      this.master = this.ctx.createGain(); this.master.gain.value = .19; this.master.connect(limiter);
      this.music = new Music(this.ctx, limiter);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }
  play(name) {
    if (!this.enabled || this.muted || !this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const notes = { bomb: [190, 90, .10, 'square'], pickup: [660, 1320, .13, 'sine'], dash: [180, 820, .2, 'sine'], hurt: [100, 45, .25, 'sawtooth'], skill: [440, 880, .5, 'sine'], start: [220, 660, .4, 'sine'], boss: [100, 60, 1, 'sawtooth'], bossDefeated: [330, 1320, 1, 'triangle'] };
    notes.enemyWindup = [230, 440, .55, 'triangle'];
    notes.enemyCharge = [300, 80, .19, 'sine'];
    notes.bossEnraged = [130, 45, .8, 'sawtooth'];
    notes.miniboss = [160, 65, .7, 'sawtooth'];
    notes.miniDefeated = [330, 990, .6, 'triangle'];
    notes.enemyCast = [480, 170, .4, 'sine'];
    notes.relicDrop = [740, 1480, .28, 'sine'];
    notes.echo = [140, 55, .3, 'triangle'];
    if (name === 'explosion' || name === 'enemyExplosion') {
      const length = this.ctx.sampleRate * .35, buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate), data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2;
      const src = this.ctx.createBufferSource(); src.buffer = buffer;
      const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 1200;
      src.connect(filter); filter.connect(this.master); src.onended = () => { src.disconnect(); filter.disconnect(); }; src.start(); return;
    }
    if (!notes[name]) return;
    const [from, to, duration, type] = notes[name], osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(from, now); osc.frequency.exponentialRampToValueAtTime(to, now + duration);
    gain.gain.setValueAtTime(.001, now); gain.gain.exponentialRampToValueAtTime(.35, now + .015); gain.gain.exponentialRampToValueAtTime(.001, now + duration);
    osc.connect(gain); gain.connect(this.master); osc.onended = () => { osc.disconnect(); gain.disconnect(); }; osc.start(now); osc.stop(now + duration + .05);
  }
  update(game) {
    if (!this.music) return;
    const menu = game.phase === 'menu', boss = !!game.boss && !['dead', 'intermission'].includes(game.phase);
    this.music.enabled = this.musicEnabled && !this.muted;
    this.music.volume = this.volume * (['paused', 'upgrade'].includes(game.phase) ? .4 : 1);
    this.music.setScene(menu || ['dead', 'intermission'].includes(game.phase) ? 'menu' : game.biome.id, boss, !!game.boss?.enraged, document.hidden);
    this.music.update();
  }
  inspect() { return { state: this.ctx?.state || 'awaiting-gesture', enabled: this.musicEnabled, muted: this.muted, volume: this.volume, track: THEMES[this.music?.key || 'menu'].name, boss: this.music?.boss || false }; }
}
