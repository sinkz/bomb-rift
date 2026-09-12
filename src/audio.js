import { Music, THEMES } from './music.js';
import { RecordedMusic } from './recorded-music.js';

export class Sound {
  constructor({ refugeTracks = [] } = {}) {
    this.refugeTracks = refugeTracks; this.refugeTrack = refugeTracks[0]?.id || '';
    this.enabled = true; this.musicEnabled = true; this.volume = .42; this.muted = false; this.ctx = null;
    try { const p = JSON.parse(localStorage.getItem('bomb-rift-audio-v1') || '{}');
      if (typeof p.effects === 'boolean') this.enabled = p.effects;
      if (typeof p.music === 'boolean') this.musicEnabled = p.music;
      if (Number.isFinite(p.volume)) this.volume = Math.max(0, Math.min(1, p.volume));
      if (p.refugeTrack === '' || refugeTracks.some(track => track.id === p.refugeTrack)) this.refugeTrack = p.refugeTrack;
    } catch { /* Defaults also work when storage is disabled. */ }
  }
  save() { try { localStorage.setItem('bomb-rift-audio-v1', JSON.stringify({ effects: this.enabled, music: this.musicEnabled, volume: this.volume, refugeTrack: this.refugeTrack })); } catch {} }
  // Building the graph and resuming it are separate steps: a suspended context can
  // already fetch and decode, so the refuge track is ready the instant autoplay is allowed.
  prepare() {
    if (this.ctx) return this.ctx;
    const Context = window.AudioContext || window.webkitAudioContext; if (!Context) return null;
    this.ctx = new Context();
    const limiter = this.ctx.createDynamicsCompressor(); limiter.threshold.value = -8; limiter.ratio.value = 8; limiter.connect(this.ctx.destination);
    this.master = this.ctx.createGain(); this.master.gain.value = .19; this.master.connect(limiter);
    this.music = new Music(this.ctx, limiter);
    if(this.refugeTracks.length){this.recorded=new RecordedMusic(this.ctx,limiter,this.refugeTracks);this.recorded.select(this.refugeTrack);}
    // Keep the resumed state honest for the launch screen label.
    this.ctx.addEventListener?.('statechange', () => { this.running = this.ctx.state === 'running'; });
    return this.ctx;
  }
  // Decode ahead of the first gesture so the refuge does not open in silence for
  // the seconds it takes to download and decode a three-megabyte master.
  prefetch() { this.prepare(); if (this.musicEnabled && this.refugeTrack) this.recorded?.load(); }
  init() {
    this.prepare();
    if (!this.ctx) return;
    this.prefetch();
    if (this.ctx.state === 'suspended') this.ctx.resume().then(() => { this.running = true; }).catch(() => {});
    else this.running = this.ctx.state === 'running';
  }
  get ready() { return this.ctx?.state === 'running'; }
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
    notes.blocked = [880, 440, .2, 'sine'];
    notes.mimicAwake = [90, 230, .3, 'square'];
    notes.enemyMend = [390, 780, .65, 'triangle'];
    notes.webBurst = [790, 190, .24, 'sine'];
    notes.echo = [140, 55, .3, 'triangle'];
    notes.mastery = [440, 1760, 1.1, 'triangle'];
    notes.chainArc = [780, 150, .15, 'triangle'];
    notes.anchorBroken = [220, 1100, .7, 'sine'];
    notes.arenaShift = [90, 42, .55, 'triangle'];
    notes.bossImpact = [95, 32, .32, 'triangle'];
    notes.wardReady = [420, 680, .16, 'sine'];
    // Guardian acts: the signature wind-up and the desperation turn have to be
    // audible even when the player is reading the floor instead of the health bar.
    notes.bossSignature = [70, 210, 1.2, 'sawtooth'];
    notes.bossDesperation = [180, 38, 1.4, 'sawtooth'];
    notes.bossDash = [300, 85, .28, 'square'];
    notes.bossDodge = [430, 640, .14, 'sine'];
    notes.arenaRite = [150, 520, .9, 'triangle'];
    // Ritmo novo da campanha: campeao, fuga e a arena se partindo.
    notes.champion = [140, 300, .9, 'sawtooth'];
    notes.bossFlee = [420, 70, 1.1, 'sine'];
    notes.arenaReshape = [70, 190, 1.5, 'triangle'];
    notes.arenaCleared = [64, 168, 1.1, 'sawtooth'];
    // O arremesso: um assobio que sobe enquanto o projetil viaja.
    notes.bossThrow = [180, 520, .9, 'square'];
    // Entrada do guardiao: um grave que cresce e quatro batidas por cima.
    notes.bossEntrance = [92, 54, 2.2, 'sine'];
    notes.entranceRumble = [46, 32, 1.9, 'triangle'];
    notes.entranceFissure = [190, 58, .95, 'sawtooth'];
    notes.entranceSummon = [280, 640, .5, 'square'];
    notes.entranceSlam = [150, 26, .75, 'triangle'];
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
  selectRefugeTrack(id) {
    if(id && !this.refugeTracks.some(t=>t.id===id))return false;
    this.refugeTrack=id;this.recorded?.select(id);return true;
  }
  update(game, sceneKey = null) {
    if (!this.music) return;
    const menu = game.phase === 'menu', boss = !!game.boss && !['dead', 'intermission'].includes(game.phase);
    const recorded = sceneKey==='refuge' && !!this.refugeTrack && !!this.recorded;
    this.recorded?.update(recorded && this.musicEnabled && !this.muted && !document.hidden, this.volume);
    this.music.enabled = this.musicEnabled && !this.muted && (!recorded || this.recorded.failed);
    this.music.volume = this.volume * (['paused', 'upgrade'].includes(game.phase) ? .4 : 1);
    this.music.setScene(sceneKey || (menu || ['dead', 'intermission'].includes(game.phase) ? 'menu' : game.biome.id), boss, !!game.boss?.enraged, document.hidden);
    this.music.update();
  }
  inspect() { const recorded=this.music?.key==='refuge'&&this.refugeTrack&&this.recorded;return { state: this.ctx?.state || 'awaiting-gesture', enabled: this.musicEnabled, muted: this.muted, volume: this.volume, track: recorded&&!recorded.failed?recorded.name:THEMES[this.music?.key || 'menu'].name, playback: recorded?recorded.state:this.musicEnabled&&!this.muted?'playing':'paused', boss: this.music?.boss || false }; }
}
