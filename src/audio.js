export class Sound {
  constructor() { this.enabled = true; this.ctx = null; }
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = .19; this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }
  play(name) {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
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
      src.connect(filter); filter.connect(this.master); src.start(); return;
    }
    if (!notes[name]) return;
    const [from, to, duration, type] = notes[name], osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(from, now); osc.frequency.exponentialRampToValueAtTime(to, now + duration);
    gain.gain.setValueAtTime(.001, now); gain.gain.exponentialRampToValueAtTime(.35, now + .015); gain.gain.exponentialRampToValueAtTime(.001, now + duration);
    osc.connect(gain); gain.connect(this.master); osc.start(now); osc.stop(now + duration + .05);
  }
}
