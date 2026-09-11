import * as THREE from 'three';

// Atmosfera declarativa por mundo. Cada entrada descreve céu, névoa, luz e o campo de partículas
// que dá identidade ao bioma; a cena só lê estes números. A única lógica de runtime é a nuvem
// compartilhada no fim do arquivo — um único THREE.Points reaproveitado entre todas as fases.
// particle: { rise } é a velocidade vertical base (negativo cai), { low/high } a faixa de altura
// em que a partícula vive — ficar acima de ~1.4 mantém o tabuleiro legível.
// event: { every: [min,max] } segundos entre eventos ambientais; eles acontecem na borda da arena,
// nunca sobre as casas jogáveis, e { flash } acende a luz de contorno por um instante.
export const BIOME_FX = {
  ruins: {
    sky: 0x15141c, fogDensity: .019,
    hemi: [0xc6c2ff, 0x35262d, 1.7], sun: [0xffd5a4, 2.8], rim: [0x9572ff, 2.5], glow: 0x9e74ff, ring: 0x582e9c,
    particle: { color: 0xbaa7d9, size: .055, opacity: .34, additive: false, count: 108, rise: -.3, sway: .2, swayRate: .55, swirl: .05, low: 1.5, high: 7.4 },
    event: { every: [4.5, 9], count: 9, spread: 1.6, speed: .7, lift: -2.1, from: 'sky', flash: .16, flashColor: 0xa98cff, punch: 1.1 },
  },
  forge: {
    sky: 0x1b1016, fogDensity: .023,
    hemi: [0xffd3bd, 0x3c1c17, 1.42], sun: [0xffc98c, 2.95], rim: [0xb05ad4, 2.15], glow: 0xff6c25, ring: 0xb03a12,
    particle: { color: 0xff9a48, size: .06, opacity: .62, additive: true, count: 120, rise: .62, sway: .28, swayRate: .9, swirl: .03, low: -.4, high: 7 },
    event: { every: [3.2, 6.5], count: 16, spread: 1.1, speed: 1.1, lift: 3.4, from: 'ground', flash: .42, flashColor: 0xff7a30, punch: 1.5 },
  },
  abyss: {
    sky: 0x0c1a21, fogDensity: .027,
    hemi: [0x8ee6ff, 0x0f2830, 1.5], sun: [0xbfe6ff, 2.25], rim: [0x2fb8c4, 2.7], glow: 0x47e4e5, ring: 0x12707a,
    particle: { color: 0x6ee7dc, size: .052, opacity: .5, additive: true, count: 114, rise: .08, sway: .15, swayRate: .35, swirl: .22, low: .9, high: 6.4 },
    event: { every: [4, 8], count: 14, spread: 2.2, speed: .5, lift: .9, from: 'air', flash: .26, flashColor: 0x59e8e0, punch: 1.3 },
  },
  garden: {
    sky: 0x131a15, fogDensity: .021,
    hemi: [0xc7e6c2, 0x1f2b1b, 1.5], sun: [0xffeeb4, 2.6], rim: [0x57a878, 2.2], glow: 0x9be477, ring: 0x3f7c2e,
    particle: { color: 0xd4e089, size: .055, opacity: .34, additive: false, count: 104, rise: .1, sway: .42, swayRate: .5, swirl: .07, low: 1.2, high: 6 },
    event: { every: [4, 8.5], count: 15, spread: 1.8, speed: 1.2, lift: 1.5, from: 'air', flash: .14, flashColor: 0xa2e58d, punch: 1 },
  },
  storm: {
    sky: 0x141526, fogDensity: .02,
    hemi: [0xcadcff, 0x2a2a3c, 1.6], sun: [0xffeec2, 2.85], rim: [0x9fb4ff, 2.5], glow: 0xf5d474, ring: 0x4a4aa0,
    particle: { color: 0xf7dc8e, size: .05, opacity: .58, additive: true, count: 112, rise: .95, sway: .22, swayRate: 1.6, swirl: .06, low: -.2, high: 7.6 },
    event: { every: [3.4, 7], count: 18, spread: .8, speed: 1.8, lift: 4.2, from: 'ground', flash: .95, flashColor: 0xdce8ff, punch: 2.6 },
  },
  frost: {
    sky: 0x14202c, fogDensity: .025,
    hemi: [0xe2f3ff, 0x2c3a4c, 1.82], sun: [0xe8f5ff, 2.6], rim: [0x74a8ff, 2.4], glow: 0x9ce9ff, ring: 0x2f6ba8,
    particle: { color: 0xe6f6ff, size: .062, opacity: .46, additive: false, count: 118, rise: -.42, sway: .38, swayRate: .4, swirl: .04, low: .15, high: 7.2 },
    event: { every: [4.5, 9], count: 16, spread: 2.6, speed: .6, lift: -.9, from: 'air', flash: .18, flashColor: 0xbfe4ff, punch: 1.1 },
  },
};
export const fxFor = id => BIOME_FX[id] || BIOME_FX.ruins;

// Cada inimigo morre com material próprio: gosma, brasa, ferro, cristal, madeira.
export const DEATH_FX = {
  slime: { color: 0xb07cf0, count: 16, force: 3.1, ring: 0xc49aff, size: .95, burst: { geo: 'sphere', gravity: 8, size: 1.15 } },
  ember: { color: 0xff9756, count: 21, force: 4.1, ring: 0xffb070, size: 1, scorch: .8, burst: { gravity: 6, spread: .8 } },
  beetle: { color: 0xa5b8d0, count: 19, force: 3.5, ring: 0x9fd7ff, size: .9, burst: { geo: 'round', gravity: 9, size: .9 } },
  wisp: { color: 0x7ff0e6, count: 15, force: 1.5, ring: 0x6ee7dc, size: 1.2, burst: { geo: 'crystal', gravity: -1.6, lift: .3, spread: 1.1 } },
  spore: { color: 0xa8d97a, count: 23, force: 2.1, ring: 0x9be477, size: 1.1, burst: { geo: 'sphere', gravity: 1.4, lift: .7, spread: 1 } },
  weaver: { color: 0xf5d474, count: 19, force: 3.6, ring: 0xffe9a8, size: .95, burst: { gravity: 7, size: .8 } },
  oracle: { color: 0x9debff, count: 21, force: 3, ring: 0xa3ddfa, size: 1.05, burst: { geo: 'crystal', gravity: 5.5 } },
  mimic: { color: 0xd7a05f, count: 22, force: 3.3, ring: 0xffd18a, size: 1, burst: { geo: 'round', gravity: 8.5, size: 1.2 } },
  sentinel: { color: 0xffc27a, count: 36, force: 5, ring: 0xffd695, size: 2.4, scorch: 1.5, shake: .24, stop: .055, burst: { geo: 'round', gravity: 8, size: 1.4, spread: 1.2 } },
  default: { color: 0xb39aff, count: 17, force: 4, ring: 0xc49aff, size: .9 },
};
export const deathFx = type => DEATH_FX[type] || DEATH_FX.default;

export const PICKUP_FX = {
  crystal: { color: 0x71ffc6, ring: 0x36eca8, count: 6, force: 1.2, size: .6 },
  scrap: { color: 0xe6b17f, ring: 0xd9a679, count: 8, force: 1.3, size: .7, burst: { geo: 'round' } },
  cores: { color: 0xa6cfff, ring: 0x68bdff, count: 10, force: 1.5, size: .85, burst: { geo: 'crystal' } },
  heart: { color: 0xff719a, ring: 0xe93565, count: 13, force: 1.6, size: 1.15, burst: { geo: 'sphere', gravity: 4 } },
  relic: { color: 0xffd88e, ring: 0xffc06a, count: 14, force: 2, size: 1.4, burst: { geo: 'crystal' } },
};
// Raridade decide o tamanho da comemoração; o texto vem do catálogo de relíquias.
export const RARITY_FX = {
  'ÉPICA': { count: 40, force: 3.6, rings: 3, light: 34, shake: .16 },
  'RARA': { count: 28, force: 3, rings: 2, light: 26, shake: .1 },
  'INCOMUM': { count: 18, force: 2.4, rings: 1, light: 18, shake: 0 },
};
export const rarityFx = rarity => RARITY_FX[rarity] || RARITY_FX.INCOMUM;

const MAX_MOTES = 200;

export class BiomeAtmosphere {
  constructor(parent) {
    this.positions = new Float32Array(MAX_MOTES * 3); this.velocities = new Float32Array(MAX_MOTES * 3); this.rises = new Float32Array(MAX_MOTES); this.phases = new Float32Array(MAX_MOTES);
    this.attribute = new THREE.BufferAttribute(this.positions, 3); this.attribute.setUsage(THREE.DynamicDrawUsage);
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', this.attribute);
    // A nuvem cobre a arena inteira e nunca sai de cena: dispensa o custo de recalcular culling.
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 64);
    this.material = new THREE.PointsMaterial({ size: .05, transparent: true, opacity: .5, depthWrite: false, sizeAttenuation: true });
    this.points = new THREE.Points(geometry, this.material); this.points.frustumCulled = false; parent.add(this.points);
    this.style = BIOME_FX.ruins; this.count = 0; this.cursor = 0; this.flash = 0; this.quiet = false; this.timer = 6;
    this.bounds = { x: 18, z: 15 };
  }
  apply(style, { width = 21, height = 19, reducedMotion = false, quality = true } = {}) {
    this.style = style; this.quiet = reducedMotion; const p = style.particle;
    this.bounds = { x: width * .55 + 4.5, z: height * .55 + 4 };
    this.count = Math.round(p.count * (reducedMotion ? .28 : quality ? 1 : .5));
    this.material.color.set(p.color); this.material.size = p.size; this.material.opacity = reducedMotion ? p.opacity * .7 : p.opacity;
    this.material.blending = p.additive ? THREE.AdditiveBlending : THREE.NormalBlending; this.material.needsUpdate = true;
    for (let i = 0; i < this.count; i++) this.seed(i, true);
    this.points.geometry.setDrawRange(0, this.count); this.attribute.needsUpdate = true;
    this.flash = 0; this.timer = this.delay();
  }
  delay() { const [min, max] = this.style.event.every; return min + Math.random() * (max - min); }
  seed(i, anywhere) {
    const p = this.style.particle, b = this.bounds, o = i * 3;
    this.positions[o] = (Math.random() - .5) * b.x * 2; this.positions[o + 2] = (Math.random() - .5) * b.z * 2;
    this.positions[o + 1] = anywhere ? p.low + Math.random() * (p.high - p.low) : p.rise >= 0 ? p.low : p.high;
    this.rises[i] = p.rise * (.55 + Math.random() * .9);
    this.velocities[o] = 0; this.velocities[o + 1] = this.rises[i]; this.velocities[o + 2] = 0; this.phases[i] = Math.random() * Math.PI * 2;
  }
  update(dt, t) {
    this.flash = Math.max(0, this.flash - dt * 3.6);
    if (!this.count || dt <= 0) return;
    const p = this.style.particle, b = this.bounds, pos = this.positions, vel = this.velocities;
    const damp = Math.exp(-dt * 1.5), turn = p.swirl * dt, cos = Math.cos(turn), sin = Math.sin(turn);
    for (let i = 0; i < this.count; i++) {
      const o = i * 3, phase = this.phases[i];
      pos[o] += (vel[o] + Math.sin(t * p.swayRate + phase) * p.sway) * dt;
      pos[o + 1] += vel[o + 1] * dt;
      pos[o + 2] += (vel[o + 2] + Math.cos(t * p.swayRate * .8 + phase) * p.sway) * dt;
      if (turn) { const x = pos[o], z = pos[o + 2]; pos[o] = x * cos - z * sin; pos[o + 2] = x * sin + z * cos; }
      vel[o] *= damp; vel[o + 2] *= damp; vel[o + 1] = this.rises[i] + (vel[o + 1] - this.rises[i]) * damp;
      if (pos[o + 1] > p.high || pos[o + 1] < p.low || Math.abs(pos[o]) > b.x || Math.abs(pos[o + 2]) > b.z) this.seed(i, false);
    }
    this.attribute.needsUpdate = true;
    this.timer -= dt;
    if (this.timer <= 0) { this.fire(); this.timer = this.delay(); }
  }
  // Eventos ambientais nascem no anel externo da arena: dão vida ao mundo sem sujar o tabuleiro.
  fire() {
    const e = this.style.event;
    if (this.quiet || !this.count) return;
    this.flash = Math.max(this.flash, e.flash);
    const angle = Math.random() * Math.PI * 2, b = this.bounds, p = this.style.particle;
    const x = Math.cos(angle) * b.x * .82, z = Math.sin(angle) * b.z * .82;
    const y = e.from === 'sky' ? p.high * .92 : e.from === 'ground' ? -.2 : p.low + (p.high - p.low) * .4;
    for (let k = 0; k < Math.min(e.count, this.count); k++) {
      const i = this.cursor = (this.cursor + 1) % this.count, o = i * 3;
      this.positions[o] = x + (Math.random() - .5) * e.spread * 2; this.positions[o + 1] = y + Math.random() * .9; this.positions[o + 2] = z + (Math.random() - .5) * e.spread * 2;
      this.velocities[o] = (Math.random() - .5) * e.speed; this.velocities[o + 2] = (Math.random() - .5) * e.speed;
      this.velocities[o + 1] = e.lift * (.55 + Math.random() * .9); this.rises[i] = p.rise * (.55 + Math.random() * .9);
    }
  }
}
