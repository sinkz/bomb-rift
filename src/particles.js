import * as THREE from 'three';

// Campo de particulas em UM unico draw call: THREE.Points com atributos por
// particula. O sistema antigo criava um Mesh por destroco — 220 draw calls e
// um material compartilhado do cache, que e o motivo de nao existir fade nem
// gradiente de cor. Aqui cada particula carrega a propria cor e o proprio alpha.

// Ordem das celulas no atlas 4x2 (assado em blender/bake_particles.py).
export const SPRITE = { glow: 0, spark: 1, ember: 2, crack: 3, ring: 4, flame: 5, smoke: 6, bolt: 7 };
const GRID = [4, 2];
const MAX = 1200;

// Mapeia as formas que burst() ja aceitava para o sprite equivalente, para que
// as ~60 chamadas espalhadas pelo scene.js continuem valendo sem alteracao.
export const SPRITE_FOR_GEO = { box: SPRITE.glow, round: SPRITE.ember, sphere: SPRITE.smoke, crystal: SPRITE.spark, cone: SPRITE.spark, cylinder: SPRITE.glow };

const VERT = `
attribute float aSize;
attribute float aSprite;
attribute float aAlpha;
attribute float aRot;
attribute vec3 aColor;
uniform float uScale;
varying float vSprite;
varying float vAlpha;
varying float vRot;
varying vec3 vColor;
void main() {
  vSprite = aSprite; vAlpha = aAlpha; vRot = aRot; vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = max(1.0, aSize * uScale);
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = `
uniform sampler2D uAtlas;
uniform vec2 uGrid;
varying float vSprite;
varying float vAlpha;
varying float vRot;
varying vec3 vColor;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float c = cos(vRot), s = sin(vRot);
  vec2 pc = vec2(d.x * c - d.y * s, d.x * s + d.y * c) + 0.5;
  if (pc.x < 0.0 || pc.x > 1.0 || pc.y < 0.0 || pc.y > 1.0) discard;
  float col = mod(vSprite, uGrid.x);
  float row = floor(vSprite / uGrid.x);
  vec2 uv = vec2((col + pc.x) / uGrid.x, 1.0 - (row + pc.y) / uGrid.y);
  float a = texture2D(uAtlas, uv).a * vAlpha;
  if (a <= 0.003) discard;
  gl_FragColor = vec4(vColor * a, a);
}`;

// Rampa derivada da cor que a chamada ja passava: branco-quente -> a cor ->
// escurecendo. Assim toda chamada existente ganha gradiente sem mudar uma linha.
const rampCache = new Map();
export function rampFor(hex) {
  let ramp = rampCache.get(hex);
  if (ramp) return ramp;
  const base = new THREE.Color(hex);
  const hsl = {};
  base.getHSL(hsl);
  const at = (s, l) => new THREE.Color().setHSL(hsl.h, Math.min(1, s), Math.min(1, Math.max(0, l)));
  ramp = [
    at(hsl.s * .25, .97),
    at(hsl.s * .78, Math.max(hsl.l, .72)),
    base.clone(),
    at(Math.min(1, hsl.s * 1.1), hsl.l * .48),
    at(hsl.s * .9, hsl.l * .14),
  ];
  rampCache.set(hex, ramp);
  return ramp;
}

// Escreve no alvo em vez de devolver um temporario compartilhado, para que a
// cena possa amostrar a mesma rampa sem brigar com o laco das particulas.
export function rampColor(ramp, t, target) {
  const n = ramp.length - 1;
  const k = Math.min(n - 1e-5, Math.max(0, t) * n);
  const i = Math.floor(k);
  return target.copy(ramp[i]).lerp(ramp[i + 1], k - i);
}
const tmp = new THREE.Color();
const sample = (ramp, t) => rampColor(ramp, t, tmp);

export class ParticleField {
  // atlasUrl vem injetado (ver particle-sources.js). Sem ele o campo fica mudo.
  constructor(parent, atlasUrl) {
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(MAX * 3);
    this.col = new Float32Array(MAX * 3);
    this.size = new Float32Array(MAX);
    this.sprite = new Float32Array(MAX);
    this.alpha = new Float32Array(MAX);
    this.rot = new Float32Array(MAX);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    geo.setAttribute('aSprite', new THREE.BufferAttribute(this.sprite, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    geo.setAttribute('aRot', new THREE.BufferAttribute(this.rot, 1));
    geo.setDrawRange(0, 0);
    // A esfera de corte do frustum nao acompanha as particulas; sem isso o
    // Points some quando a primeira leva morre longe do centro.
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);

    const texture = atlasUrl ? new THREE.TextureLoader().load(atlasUrl) : null;
    if (texture) { texture.colorSpace = THREE.SRGBColorSpace; texture.minFilter = THREE.LinearFilter; texture.generateMipmaps = false; }

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uAtlas: { value: texture },
        uGrid: { value: new THREE.Vector2(GRID[0], GRID[1]) },
        uScale: { value: 40 },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 3;
    parent.add(this.points);
    this.geo = geo;
    this.live = [];
  }

  // A camera e ortografica: o tamanho em pixels de um ponto e constante,
  // proporcional a quantos pixels cabem numa unidade de mundo.
  setScale(camera, heightPx, pixelRatio) {
    const span = camera.top - camera.bottom;
    if (span > 0 && heightPx > 0) this.material.uniforms.uScale.value = heightPx * pixelRatio / span;
  }

  spawn(p) {
    if (this.live.length >= MAX) return;
    this.live.push(p);
  }

  clear() {
    this.live.length = 0;
    this.geo.setDrawRange(0, 0);
  }

  update(dt) {
    const live = this.live;
    let n = 0;
    for (let i = 0; i < live.length; i++) {
      const q = live[i];
      q.age += dt;
      if (q.age >= q.life) continue;
      q.vy -= q.g * dt;
      if (q.drag) {
        const d = Math.exp(-q.drag * dt);
        q.vx *= d; q.vy *= d; q.vz *= d;
      }
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      q.rot += q.spin * dt;

      const k = q.age / q.life;
      const c = sample(q.ramp, k);
      const fadeIn = q.swell ? Math.min(1, q.age / (q.life * .22)) : 1;
      const grow = q.swell ? .5 + .5 * Math.sin(k * Math.PI) ** .55 : 1 - k * .26;

      this.pos[n * 3] = q.x; this.pos[n * 3 + 1] = q.y; this.pos[n * 3 + 2] = q.z;
      this.col[n * 3] = c.r; this.col[n * 3 + 1] = c.g; this.col[n * 3 + 2] = c.b;
      this.size[n] = q.size * grow;
      this.sprite[n] = q.sprite;
      this.alpha[n] = Math.max(0, Math.min(1, (1 - k) * 2.9)) * fadeIn * q.gain;
      this.rot[n] = q.rot;
      live[n] = q;
      n++;
    }
    live.length = n;
    this.geo.setDrawRange(0, n);
    if (!n) return;
    for (const name of ['position', 'aColor', 'aSize', 'aSprite', 'aAlpha', 'aRot']) {
      const attr = this.geo.getAttribute(name);
      attr.updateRanges = [{ start: 0, count: n * attr.itemSize }];
      attr.needsUpdate = true;
    }
  }
}
