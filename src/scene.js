import * as THREE from 'three';
import { setAttr } from './i18n.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { relicById } from './campaign.js';
import { skillById } from './skills.js';
import { OUTFITS } from './legacy.js';
import { loadBossLibrary, bossKeyFor } from './boss-models.js';
import { BiomeAtmosphere, fxFor, deathFx, PICKUP_FX, rarityFx } from './biome-fx.js';
import { ParticleField, SPRITE, SPRITE_FOR_GEO, rampFor, rampColor } from './particles.js';

const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  round: new RoundedBoxGeometry(1, 1, 1, 2, .09),
  sphere: new THREE.SphereGeometry(1, 16, 12),
  crystal: new THREE.OctahedronGeometry(1),
  cone: new THREE.ConeGeometry(1, 1, 5),
  ring: new THREE.TorusGeometry(1, .035, 6, 48),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
  plane: new THREE.PlaneGeometry(1, 1),
};
// O toro antigo tinha raio 1 (diametro 2). No sprite, o anel fica em .72 do
// meio-lado, entao o plano precisa de 1/.36 para desenhar um anel do mesmo
// tamanho que as 39 chamadas de pulse() ja esperavam.
const RING_FIT = 2.78;
const materialCache = new Map();
function mat(color, emissive = 0, intensity = 0, metalness = 0) {
  if (color?.isColor) color = color.getHex();
  if (emissive?.isColor) emissive = emissive.getHex();
  const key = `${color}:${emissive}:${intensity}:${metalness}`;
  if (!materialCache.has(key)) materialCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: .76, metalness, emissive, emissiveIntensity: intensity, flatShading: true }));
  return materialCache.get(key);
}
function mesh(parent, geometry, material, x, y, z, sx = 1, sy = sx, sz = sx, shadow = true) {
  const m = new THREE.Mesh(G[geometry], material); m.position.set(x, y, z); m.scale.set(sx, sy, sz);
  m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m;
}


export class ArenaScene {
  constructor(container, game, { reducedMotion = false, bossSources, particleSources } = {}) {
    this.container = container; this.game = game; this.reducedMotion = reducedMotion; this.time = 0; this.shake = 0;
    this.objects = new Map(); this.blocks = new Map(); this.pulses = [];
    this.cameraSpan = 10.7; this.targetSpan = 10.7; this.zoom = 1; this.cameraFocus = new THREE.Vector3();
    this.staticSlots = new Map(); this.enemyModels = new Map();
    this.quality = true; this.hitStop = 0; this.bossEntry = null; this.timers = []; this.scorches = []; this.scorchCursor = 0; this.arenaSize = { width: 21, height: 19 };
    this.style = fxFor('ruins'); this.eventColor = new THREE.Color(0xffffff); this.heroSpark = 0;
    this.dummy = new THREE.Object3D(); this.zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
    this.retiredBoss = null; this.bossSources = bossSources; this.bossStatus = bossSources ? 'deferred' : 'procedural';
    this.bombWarningMaterial = new THREE.MeshBasicMaterial({ color: 0xffb452, transparent: true, opacity: .14, depthWrite: false, blending: THREE.AdditiveBlending });
    this.chargeWarningMaterial = new THREE.MeshBasicMaterial({ color: 0xff945e, transparent: true, opacity: .36, depthWrite: false, blending: THREE.AdditiveBlending });
    this.echoWarningMaterial = new THREE.MeshBasicMaterial({ color: 0xb99aff, transparent: true, opacity: .4, depthWrite: false, blending: THREE.AdditiveBlending });
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0x15141c);
    this.scene.fog = new THREE.FogExp2(0x15141c, .019);
    this.camera = new THREE.OrthographicCamera(-12, 12, 10, -10, .1, 100);
    this.camera.position.set(10, 19, 15); this.camera.lookAt(0, 0, 0);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.info.autoReset = false;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.15;
    container.appendChild(this.renderer.domElement);
    setAttr(this.renderer.domElement, 'aria-label', 'Arena tridimensional de BOMB RIFT');
    this.renderer.domElement.setAttribute('role', 'img');
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1024, 768), .48, .45, 1.15);
    this.composer.addPass(this.bloom); this.composer.addPass(new OutputPass());
    this.hemi = new THREE.HemisphereLight(0xc5c4ff, 0x35262d, 1.7); this.scene.add(this.hemi);
    const sun = new THREE.DirectionalLight(0xffd5a4, 2.8); sun.position.set(-8, 16, 8); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 45 });
    sun.shadow.normalBias = .035; sun.shadow.bias = -.0005; this.scene.add(sun); this.sun = sun;
    const rim = new THREE.DirectionalLight(0x9572ff, 2.5); rim.position.set(5, 8, -9); this.scene.add(rim); this.rim = rim;
    // O antigo preenchimento fixo virou a luz reativa que acompanha o herói e pulsa nos impactos.
    const fill = new THREE.PointLight(0xff742f, 15, 11, 2); fill.position.set(-6, 3, 5); this.scene.add(fill); this.fill = fill;
    this.baseLight = { hemi: 1.7, sun: 2.8, rim: 2.5, fill: 15, rimColor: new THREE.Color(0x9572ff) };
    this.flashLight = new THREE.PointLight(0xffa04a, 0, 6, 2); this.scene.add(this.flashLight);
    this.static = new THREE.Group(); this.dynamic = new THREE.Group(); this.fx = new THREE.Group();
    this.scene.add(this.static, this.dynamic, this.fx);
    // Fica fora de this.fx de proposito: buildArena limpa aquele grupo inteiro.
    this.field = new ParticleField(this.scene, particleSources?.atlas);
    // O anel deita no chao, entao nao pode ser um ponto de Points: viraria um
    // disco virado para a camera. E um plano texturizado com o sprite assado.
    this.ringTexture = null;
    if (particleSources?.ring) {
      this.ringTexture = new THREE.TextureLoader().load(particleSources.ring);
      this.ringTexture.colorSpace = THREE.SRGBColorSpace;
      this.ringTexture.generateMipmaps = false;
      this.ringTexture.minFilter = THREE.LinearFilter;
    }
    this.playerMesh = this.makePlayer(); this.dynamic.add(this.playerMesh);
    this.addAtmosphere(); this.buildArena();
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(container); this.resize();
    this.bossesReady = Promise.resolve();
    if (game.active) this.prepareBoss();
  }
  prepareBoss() {
    if (!this.bossSources) return this.bossesReady;
    const key = bossKeyFor(this.game.biome.id);
    this.bossStatus = 'loading';
    this.bossesReady = loadBossLibrary(this.bossSources, [key]).then(library => {
      if (key !== bossKeyFor(this.game.biome.id)) return;
      this.bossModels = library; this.bossStatus = 'ready';
      const boss = this.game.boss, previous = boss && this.objects.get(boss.id);
      if (previous && !previous.userData.actor) {
        const next = this.makeEnemy('boss', boss.variant);
        next.position.copy(previous.position); next.quaternion.copy(previous.quaternion);
        this.dynamic.remove(previous); this.dynamic.add(next); this.objects.set(boss.id, next);
      }
    }).catch(error => { if (key === bossKeyFor(this.game.biome.id)) this.bossStatus = 'fallback'; console.error('Falha ao carregar os guardiões:', error); });
    return this.bossesReady;
  }
  at(x, z) { return [x - (this.game.width - 1) / 2, z - (this.game.height - 1) / 2]; }
  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h); this.composer.setSize(w, h);
    this.aspect = w / h;
    this.readSafeArea();
    this.frameCamera();
  }
  // The canvas fills the screen, but the HUD owns bands at its edges. Reading those
  // bands here lets the camera keep the board inside the free middle at full size,
  // instead of shrinking the canvas itself and wasting a third of the viewport.
  readSafeArea() {
    const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1;
    // Measured from a hidden probe rather than read as a custom property: computed
    // custom properties keep their clamp() text, so only layout gives real pixels.
    const probe = document.querySelector('#safe-area');
    if (!probe) { this.safeArea = { top: 0, bottom: 0, left: 0, right: 0 }; return; }
    const box = probe.getBoundingClientRect(), own = this.container.getBoundingClientRect();
    // Never surrender more than a third of either axis, however tall the HUD grows.
    const clampY = v => Math.max(0, Math.min(v, h * .34)), clampX = v => Math.max(0, Math.min(v, w * .3));
    this.safeArea = { top: clampY(box.top - own.top), bottom: clampY(own.bottom - box.bottom), left: clampX(box.left - own.left), right: clampX(own.right - box.right) };
  }
  // Asymmetric ortho frustum: square pixels are preserved, the board is centred in
  // the safe band, and cameraSpan keeps meaning "half-height of the board window".
  frameCamera() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    const { top = 0, bottom = 0, left = 0, right = 0 } = this.safeArea || {};
    const safeH = Math.max(1, h - top - bottom), safeW = Math.max(1, w - left - right);
    // World units per pixel, chosen so the board fits the safe box on both axes.
    const unit = Math.max(2 * this.cameraSpan / safeH, 2 * this.cameraSpan * this.aspect / safeW);
    this.camera.top = unit * (safeH / 2 + top); this.camera.bottom = -unit * (safeH / 2 + bottom);
    this.camera.left = -unit * (safeW / 2 + left); this.camera.right = unit * (safeW / 2 + right);
    this.camera.updateProjectionMatrix();
    this.field?.setScale(this.camera, h, this.renderer.getPixelRatio());
  }
  adjustZoom(change) { this.zoom = THREE.MathUtils.clamp(this.zoom + change, .82, 1.48); }
  projectWorld(x, z, y = 1.5) {
    const [wx, wz] = this.at(x, z); const pos = new THREE.Vector3(wx, y, wz).project(this.camera);
    return { x: (pos.x * .5 + .5) * this.container.clientWidth, y: (-pos.y * .5 + .5) * this.container.clientHeight };
  }
  projectMesh(object, height) {
    const pos = object.position.clone(); pos.y += height; pos.project(this.camera);
    return { x: (pos.x * .5 + .5) * this.container.clientWidth, y: (-pos.y * .5 + .5) * this.container.clientHeight };
  }
  projectPlayer() { return this.projectMesh(this.playerMesh, 1.6); }
  projectEntity(entity) { const obj = this.objects.get(entity.id); return obj ? this.projectMesh(obj, entity.type === 'boss' ? 2.4 : 1.05) : this.projectWorld(entity.x, entity.z); }
  addAtmosphere() {
    this.atmosphere = new BiomeAtmosphere(this.scene);
    this.underRing = mesh(this.scene, 'ring', mat(0x321e55, 0x582e9c, 1.3), 0, -1.45, 0, 8.4, 8.4, 8.4, false);
    this.underRing.rotation.x = Math.PI / 2;
    // Marcas de queimado: um único InstancedMesh reciclado, sem alocação por explosão.
    this.scorchMarks = new THREE.InstancedMesh(G.box, new THREE.MeshBasicMaterial({ color: 0x0c0910, transparent: true, opacity: .3, depthWrite: false }), 26);
    this.scorchMarks.frustumCulled = false; this.scorchMarks.castShadow = false; this.scorchMarks.receiveShadow = false;
    for (let i = 0; i < this.scorchMarks.count; i++) this.scorchMarks.setMatrixAt(i, this.zeroMatrix);
    this.scene.add(this.scorchMarks);
  }
  applyAtmosphere() {
    const biome = this.game.biome, style = this.style = fxFor(biome.id);
    this.scene.background.set(style.sky); this.scene.fog.color.set(style.sky); this.scene.fog.density = style.fogDensity;
    this.hemi.color.set(style.hemi[0]); this.hemi.groundColor.set(style.hemi[1]);
    this.sun.color.set(style.sun[0]); this.rim.color.set(style.rim[0]); this.fill.color.set(style.glow);
    this.baseLight = { hemi: style.hemi[2], sun: style.sun[1], rim: style.rim[1], fill: 15, rimColor: new THREE.Color(style.rim[0]) };
    this.hemi.intensity = style.hemi[2]; this.sun.intensity = style.sun[1]; this.rim.intensity = style.rim[1];
    this.eventColor.set(style.event.flashColor);
    this.atmosphere.apply(style, { ...this.arenaSize, reducedMotion: this.reducedMotion, quality: this.quality });
    this.atmosphere.reduced = this.reducedMotion;
    this.container.style.setProperty('--biome-tint', '#' + new THREE.Color(biome.color).getHexString());
  }
  buildArena() {
    this.static.traverse(object => { if (object.isInstancedMesh) object.dispose(); });
    this.staticSlots.clear();
    for (const child of [...this.static.children]) this.static.remove(child);
    this.objects.forEach(o => { o.userData.actor?.dispose(); this.dynamic.remove(o); }); this.objects.clear(); this.blocks.clear();
    if (this.retiredBoss) { this.retiredBoss.userData.actor.dispose(); this.retiredBoss = null; }
    for (const pulse of this.pulses) pulse.mesh.material.dispose();
    this.fx.clear(); this.field.clear(); this.pulses = [];
    const biome = this.game.biome, WIDTH = this.game.width, HEIGHT = this.game.height;
    this.timers = [];
    this.arenaSize = { width: WIDTH, height: HEIGHT }; this.bossEntry = null; this.signatureCharge = null; this.hitStop = 0;
    for (const scorch of this.scorches) this.scorchMarks.setMatrixAt(scorch.slot, this.zeroMatrix);
    this.scorches = []; this.scorchMarks.instanceMatrix.needsUpdate = true;
    this.applyAtmosphere();
    this.underRing.material = mat(biome.floor, this.style.ring, 1.3); this.underRing.scale.setScalar(WIDTH * .56);
    mesh(this.static, 'round', mat(0x29232f), 0, -.64, 0, WIDTH + .1, 1.1, HEIGHT + .1);
    mesh(this.static, 'box', mat(0x4a3c4d), 0, -.22, 0, WIDTH + .3, .2, HEIGHT + .3);
    const floor = new THREE.InstancedMesh(G.box, mat(0xffffff), WIDTH * HEIGHT);
    const dummy = new THREE.Object3D(); const baseColor = new THREE.Color(biome.floor);
    for (let z = 0; z < HEIGHT; z++) for (let x = 0; x < WIDTH; x++) {
      const [px, pz] = this.at(x, z), index = z * WIDTH + x;
      dummy.position.set(px, -.07, pz); dummy.scale.set(.96, .18, .96); dummy.updateMatrix(); floor.setMatrixAt(index, dummy.matrix);
      floor.setColorAt(index, baseColor.clone().multiplyScalar(.80 + ((x * 7 + z * 13) % 11) * .032));
    }
    floor.receiveShadow = true; this.static.add(floor);
    for (let z = 0; z < HEIGHT; z++) for (let x = 0; x < WIDTH; x++) {
      const tile = this.game.grid[z][x], [px, pz] = this.at(x, z);
      if (tile === 1) {
        const border = x === 0 || z === 0 || x === WIDTH - 1 || z === HEIGHT - 1;
        const group = new THREE.Group(); group.position.set(px, 0, pz);
        if (border) {
          mesh(group, 'round', mat(0x534654), 0, .21, 0, .97, .43, .97);
          mesh(group, 'box', mat(0x766471), 0, .44, 0, 1, .1, 1);
          if ((x + z) % 4 === 0) this.addCrystal(group, biome.crystal, .38, .5);
        } else {
          mesh(group, 'round', mat(biome.wall), 0, .50, 0, .88, 1, .88);
          mesh(group, 'round', mat(0x716575), 0, 1.04, 0, .99, .17, .99);
          mesh(group, 'box', mat(0x665972), 0, .11, 0, .96, .16, .96);
          if ((x * 3 + z) % 4 === 0) {
            mesh(group, 'box', mat(0x9ca0bf, biome.crystal, 1.5), 0, .65, .446, .055, .3, .012, false);
            mesh(group, 'box', mat(0x9ca0bf, biome.crystal, 1.5), 0, .65, .45, .24, .055, .013, false);
          }
          if ((x + z) % 6 === 0) this.addCrystal(group, biome.crystal, .24, 1.15);
        }
        this.static.add(group); this.blocks.set(`${x},${z}`, group);
      } else if (tile === 2) {
        const group = this.makeCrate();
        if (x === this.game.cacheCell?.x && z === this.game.cacheCell?.z) { mesh(group, 'crystal', mat(0xffda8a, 0xffb340, 2), 0, 1.04, 0, .18, .25, .18); const seal = mesh(group, 'ring', mat(0xffdd88, 0xffab32, 1.5), 0, .06, 0, .49, .49, .49, false); seal.rotation.x = Math.PI / 2; } group.position.set(px, 0, pz); this.static.add(group); this.blocks.set(`${x},${z}`, group);
      }
    }
    // Biome landmarks use the same batching path as the stone scenery.
    for (let z = 2; z < HEIGHT - 1; z += 4) for (let x = 2; x < WIDTH - 1; x += 4) {
      const [wx, wz] = this.at(x, z);
      if (biome.id === 'forge') {
        const vent = mesh(this.static, 'ring', mat(0x78402d, 0xff521b, .9), wx, .027, wz, .37, .37, .37, false); vent.rotation.x = Math.PI / 2;
      } else if (biome.id === 'abyss' && this.game.tile(x,z) === 1) {
        const coral = new THREE.Group(); coral.position.set(wx, 1.15, wz); this.addCrystal(coral, biome.crystal, .55, 0); this.blocks.get(x+','+z)?.add(coral); coral.position.set(0,1.15,0);
      }
    }
    // New regions decorate solid pillars, keeping the original walkable grid readable.
    for (const [cell, group] of this.blocks) {
      const [x, z] = cell.split(',').map(Number);
      if (this.game.tile(x, z) !== 1 || x === 0 || z === 0 || x === WIDTH - 1 || z === HEIGHT - 1 || (x + z) % 4 !== 0) continue;
      if (biome.id === 'garden') {
        mesh(group, 'sphere', mat(0x748f56), .22, 1.18, -.1, .65, .13, .36);
        mesh(group, 'sphere', mat(0xa6cb79, 0x80aa37, .2), -.18, 1.27, .1, .4, .18, .3);
        mesh(group, 'sphere', mat(0xe2ba88), .05, 1.42, .08, .15, .22, .15);
      } else if (biome.id === 'storm') {
        mesh(group, 'cylinder', mat(0x977958), 0, 1.35, 0, .12, .6, .12);
        const coil = mesh(group, 'ring', mat(0xdbc089, 0xf4c463, 1), 0, 1.47, 0, .27, .27, .27); coil.rotation.x = Math.PI / 2;
        mesh(group, 'sphere', mat(0xffe2a1, 0xf9bd53, 1.4), 0, 1.7, 0, .16, .16, .16);
      } else if (biome.id === 'frost') {
        mesh(group, 'round', mat(0xc3dbe2), 0, 1.14, 0, .92, .13, .88);
        this.addCrystal(group, 0x9ae4ff, .38, 1.22);
      }
    }
    // Small pieces under the platform make the dungeon read as a floating island.
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2;
      const rock = mesh(this.static, 'box', mat(0x302833), Math.cos(a) * (WIDTH / 2 - .8), -.9 - Math.random() * .35, Math.sin(a) * (HEIGHT / 2 - .9), 1.3, .6 + Math.random(), 1.2);
      rock.rotation.y = a * .3;
    }
    for (const [x, z] of [[-WIDTH/2+1, -HEIGHT/2+1], [WIDTH/2-1, -HEIGHT/2+1], [-WIDTH/2, HEIGHT/2-3], [WIDTH/2, HEIGHT/2-3]]) this.addTorch(x, z);
    this.addPortal(biome.crystal);
    const [px, pz] = this.at(this.game.player.x, this.game.player.z); this.playerMesh.position.set(px, 0, pz);
    // The landing scene is an idle arena; time starts only after entering the rift.
    this.preview = new THREE.Group();
    if (this.game.phase === 'menu') {
      for (const [x, z] of [[5, 5], [9, 7]]) { const bomb = this.makeBomb(); const [bx, bz] = this.at(x, z); bomb.position.set(bx, 0, bz); this.preview.add(bomb); }
    }
    this.static.add(this.preview);
    this.batchScenery();
  }
  batchScenery() {
    this.static.updateMatrixWorld(true);
    const buckets = new Map();
    this.static.traverse(object => {
      if (!object.isMesh || object.isInstancedMesh) return;
      const key = `${object.geometry.uuid}:${object.material.uuid}:${object.castShadow}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(object);
    });
    for (const objects of buckets.values()) {
      const first = objects[0], batch = new THREE.InstancedMesh(first.geometry, first.material, objects.length);
      batch.castShadow = first.castShadow; batch.receiveShadow = true;
      objects.forEach((object, index) => {
        batch.setMatrixAt(index, object.matrixWorld); object.visible = false;
        this.staticSlots.set(object.uuid, { batch, index });
      });
      batch.instanceMatrix.needsUpdate = true; this.static.add(batch);
    }
  }
  removeBlock(block) {
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    block.traverse(object => {
      const slot = this.staticSlots.get(object.uuid);
      if (slot) { slot.batch.setMatrixAt(slot.index, zero); slot.batch.instanceMatrix.needsUpdate = true; this.staticSlots.delete(object.uuid); }
    });
    this.static.remove(block);
  }
  mergeModel(group) {
    group.updateMatrixWorld(true); const buckets = new Map();
    group.traverse(object => {
      if (!object.isMesh) return;
      const key = object.material.uuid;
      if (!buckets.has(key)) buckets.set(key, { material: object.material, geometries: [] });
      const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
      buckets.get(key).geometries.push(geometry.applyMatrix4(object.matrixWorld));
    });
    group.clear();
    for (const { material, geometries } of buckets.values()) {
      const combined = mergeGeometries(geometries, false); geometries.forEach(geometry => geometry.dispose());
      const object = new THREE.Mesh(combined, material); object.castShadow = true; object.receiveShadow = true; group.add(object);
    }
    return group;
  }
  addCrystal(parent, color, size = .4, y = 0) {
    const material = mat(color, color, 1.4, .2);
    const c = mesh(parent, 'crystal', material, -.1, y + size * .55, 0, size * .38, size, size * .38); c.rotation.z = -.15;
    const c2 = mesh(parent, 'crystal', material, size * .35, y + size * .3, .06, size * .25, size * .6, size * .25); c2.rotation.z = -.4;
  }
  addTorch(x, z) {
    const group = new THREE.Group(); group.position.set(x, 0, z);
    mesh(group, 'round', mat(0x50404a), 0, .7, 0, .4, 1.2, .4);
    mesh(group, 'cylinder', mat(0x75605a), 0, 1.35, 0, .33, .18, .33);
    const flame = mesh(group, 'crystal', mat(0xffb65e, 0xff851f, 3), 0, 1.7, 0, .21, .45, .21); flame.rotation.z = .12;
    const fire = new THREE.PointLight(0xff983f, 7, 5); fire.position.set(0, 1.8, 0); group.add(fire);
    this.static.add(group);
  }
  addPortal(color) {
    const group = new THREE.Group(); group.position.set(0, 1.5, -this.game.height / 2 + .3);
    mesh(group, 'round', mat(0x423949), 0, -1.05, 0, 2.5, .35, 1.3);
    const ring = mesh(group, 'ring', mat(0x665a78, color, 1.6), 0, .13, 0, 1.06, 1.06, 1.06);
    ring.rotation.z = Math.PI / 6;
    this.portalRing = mesh(group, 'ring', mat(0x9c83ce, color, 2.5), 0, .13, 0, .86, .86, .86);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; const stone = mesh(group, 'round', mat(0x68586c), Math.cos(a) * 1.15, .13 + Math.sin(a) * 1.15, 0, .35, .45, .4); stone.rotation.z = a - Math.PI / 2; }
    const glow = new THREE.PointLight(color, 20, 7); glow.position.set(0, .2, .5); group.add(glow); this.static.add(group);
  }
  makeCrate() {
    const group = new THREE.Group();
    mesh(group, 'round', mat(0x88563b), 0, .39, 0, .81, .77, .81);
    mesh(group, 'box', mat(0xbb8759), 0, .78, 0, .88, .09, .88);
    for (const a of [-.28, .28]) {
      mesh(group, 'box', mat(0xc18a58), a, .41, .416, .09, .7, .04);
      mesh(group, 'box', mat(0xaa754a), .416, .41, a, .04, .7, .09);
      mesh(group, 'box', mat(0x70493a), a, .84, 0, .06, .04, .8);
    }
    const cross = mesh(group, 'box', mat(0xc28c5f), 0, .4, .44, .82, .09, .05); cross.rotation.z = .7;
    return group;
  }
  makePlayer() {
    const group = new THREE.Group(), ivory = mat(0xf4ecdf), orange = mat(0xf68b3d), dark = mat(0x211f2d), skin = mat(0xffc08d);
    const ring = mesh(group, 'ring', mat(0xffc180, 0xff9441, 2), 0, .04, 0, .44, .44, .44, false); ring.rotation.x = Math.PI / 2;
    mesh(group, 'round', orange, 0, .43, 0, .46, .48, .4);
    mesh(group, 'round', dark, 0, .20, 0, .42, .18, .38);
    mesh(group, 'round', orange, -.18, .13, .08, .23, .2, .32); mesh(group, 'round', orange, .18, .13, .08, .23, .2, .32);
    mesh(group, 'round', ivory, 0, .9, 0, .69, .62, .58);
    mesh(group, 'round', dark, 0, .90, .278, .53, .32, .06);
    mesh(group, 'round', skin, 0, .885, .31, .43, .22, .035);
    mesh(group, 'box', dark, -.11, .91, .335, .037, .095, .022); mesh(group, 'box', dark, .11, .91, .335, .037, .095, .022);
    mesh(group, 'sphere', orange, 0, 1.3, 0, .135);
    mesh(group, 'round', ivory, -.34, .44, 0, .2, .24, .2); mesh(group, 'round', ivory, .34, .44, 0, .2, .24, .2);
    mesh(group, 'round', mat(0x62516b), 0, .46, -.25, .32, .35, .19);
    mesh(group, 'box', mat(0xffcc85, 0xff982c, .5), 0, .43, .214, .15, .12, .03);
    const parts = [...group.children], body = new THREE.Group();
    for (const part of parts.slice(1)) body.add(part);
    group.add(body); ring.material = ring.material.clone();
    const suit = orange.clone(); for (const i of [1, 3, 4, 10]) parts[i].material = suit;
    group.userData.pose = { body, suit, boots: [parts[3], parts[4]], hands: [parts[11], parts[12]] };
    return group;
  }
  makeEnemy(type, variant = 'ruins') {
    if (type === 'boss' && this.bossModels?.has(variant)) {
      const actor = this.bossModels.create(variant);
      actor.play('Spawn', { priority: 20 });
      return actor.root;
    }
    const key = type + ':' + variant;
    if (this.enemyModels.has(key)) return this.enemyModels.get(key).clone(true);
    const group = new THREE.Group();
    if (type === 'boss' || type === 'sentinel') {
      const color = variant === 'forge' ? 0xff7d35 : variant === 'abyss' ? 0x6af5e4 : 0xc99bff;
      const stone = mat(variant === 'forge' ? 0x733b2f : variant === 'abyss' ? 0x344863 : 0x50364c), red = mat(color, color, 1.7);
      mesh(group, 'round', stone, 0, .8, 0, 1.15, 1.25, .9);
      mesh(group, 'round', mat(0x786070), 0, 1.52, 0, 1.05, .64, .85);
      mesh(group, 'box', red, -.25, 1.55, .44, .22, .1, .05); mesh(group, 'box', red, .25, 1.55, .44, .22, .1, .05);
      mesh(group, 'crystal', red, 0, .84, .5, .22, .33, .12);
      for (const sign of [-1, 1]) {
        mesh(group, 'round', stone, sign * .81, .85, 0, .48, 1, .55);
        mesh(group, 'cone', mat(0xc9b6a9), sign * .48, 2, 0, .19, .66, .19).rotation.z = -sign * .35;
        mesh(group, 'round', mat(0x7d626b), sign * .4, .2, .05, .48, .4, .6);
      }
      const ring = mesh(group, 'ring', red, 0, .08, 0, .84, .84, .84, false); ring.rotation.x = Math.PI / 2;
      if (variant === 'forge') for (const sign of [-1,1]) { mesh(group,'crystal', red, sign*.9,1.4,0,.26,.6,.25); mesh(group,'box',red,sign*.42,.75,.47,.05,.5,.04); }
      if (variant === 'abyss') { for (let i = -2; i <= 2; i++) mesh(group, 'cone', red, i*.23, 2.1+(.4-Math.abs(i)*.12), 0, .13, .65, .13); const halo = mesh(group,'ring',red,0,1.8,-.4,1.05,1.05,1.05); halo.rotation.x=.35; }
      if (type === 'sentinel') group.scale.setScalar(.7);
    } else if (type === 'beetle') {
      mesh(group,'sphere',mat(0x596779,0x263448,.2,.7),0,.37,0,.48,.36,.54);
      mesh(group,'box',mat(0xffd28c,0xe8862e,1),0,.63,0,.045,.045,.7);
      for (const sign of [-1,1]) { for (const z of [-.26,0,.26]) mesh(group,'box',mat(0x272535),sign*.45,.17,z,.28,.11,.10); mesh(group,'box',mat(0xffac58,0xff650e,2),sign*.15,.35,.49,.12,.07,.06); }
    } else if (type === 'wisp') {
      mesh(group,'crystal',mat(0x51637e,0x2ca0a4,.3),0,.62,0,.38,.57,.3);
      mesh(group,'sphere',mat(0xb0ffff,0x34dfdd,2),0,.65,.23,.18,.12,.09);
      const halo = mesh(group,'ring',mat(0x89eede,0x3cddca,1.3),0,.7,0,.43,.43,.43); halo.rotation.x=Math.PI/2;
      for (const sign of [-1,1]) mesh(group,'cone',mat(0x4b99a6,0x259fbb,.5),sign*.24,.22,0,.14,.45,.12).rotation.z=sign*.4;
    } else if (type === 'spore') {
      const moss = mat(0x7dba71, 0x344e28, .25), cap = mat(0xc2c974), stem = mat(0xe1ccac);
      mesh(group,'round',stem,0,.37,0,.37,.64,.34);
      mesh(group,'sphere',moss,0,.79,0,.55,.25,.49);
      for (let i=0;i<5;i++) { const a=i*Math.PI*2/5;mesh(group,'sphere',cap,Math.cos(a)*.34,.92,Math.sin(a)*.27,.075,.05,.075); }
      for (const sign of [-1,1]) { mesh(group,'sphere',mat(0x172d29),sign*.11,.49,.18,.05,.09,.03);mesh(group,'sphere',moss,sign*.29,.18,0,.19,.13,.22); }
    } else if (type === 'weaver') {
      const shell=mat(0x57506c), glow=mat(0xffd97c,0xf7ae32,1.2);
      mesh(group,'sphere',shell,0,.39,-.17,.36,.26,.39);mesh(group,'sphere',mat(0x393247),0,.3,.21,.25,.21,.25);
      for (const sign of [-1,1]) for(let i=0;i<4;i++) {const z=-.4+i*.22;mesh(group,'round',shell,sign*.38,.23,z,.42,.075,.09).rotation.z=sign*.45;mesh(group,'round',shell,sign*.56,.12,z+.035,.08,.28,.09).rotation.z=-sign*.25;}
      for (const x of [-.13,0,.13]) mesh(group,'sphere',glow,x,.36,.422,.04,.055,.032);
      mesh(group,'crystal',glow,0,.64,-.16,.14,.09,.2);
    } else if (type === 'oracle') {
      const stone=mat(0x626d89), glow=mat(0x9debff,0x54c8e8,1.3);
      mesh(group,'cylinder',stone,0,.15,0,.35,.23,.35);mesh(group,'crystal',stone,0,.51,0,.35,.5,.3);
      mesh(group,'crystal',glow,0,.78,0,.22,.39,.2);
      const halo=mesh(group,'ring',glow,0,.71,0,.4,.4,.4,false);halo.rotation.x=Math.PI/2;
      for(const sign of [-1,1])mesh(group,'crystal',glow,sign*.42,.52,0,.085,.16,.085);
      mesh(group,'box',mat(0x102831),0,.72,.19,.19,.06,.03);
    } else if (type === 'mimic') {
      const wood=mat(0x876045),gold=mat(0xd1a568),eye=mat(0xffad89,0xef7546,1.4);
      mesh(group,'round',wood,0,.39,0,.75,.64,.62);
      for(const sign of [-1,1])mesh(group,'box',gold,sign*.24,.42,0,.065,.63,.65);
      mesh(group,'box',mat(0x2a1722),0,.43,.321,.67,.15,.025);
      for(const x of [-.23,-.08,.08,.23])mesh(group,'cone',mat(0xe9d9ae),x,.46,.35,.05,.15,.04).rotation.z=Math.PI;
      for(const sign of [-1,1])mesh(group,'box',eye,sign*.16,.66,.32,.10,.055,.025);
      mesh(group,'box',gold,0,.4,.358,.13,.18,.03);
    } else if (type === 'ember') {
      mesh(group, 'round', mat(0xd16b46), 0, .45, 0, .58, .62, .52);
      for (const s of [-1, 1]) mesh(group, 'cone', mat(0xffd4a0), s * .22, .87, -.05, .10, .33, .10).rotation.z = -.35 * s;
      mesh(group, 'box', mat(0xffffca, 0xffad32, 2), -.14, .5, .267, .13, .09, .025);
      mesh(group, 'box', mat(0xffffca, 0xffad32, 2), .14, .5, .267, .13, .09, .025);
      mesh(group, 'round', mat(0x5e3339), 0, .19, .07, .7, .17, .43);
    } else {
      mesh(group, 'sphere', mat(0x8869c9, 0x533184, .15), 0, .33, 0, .4, .41, .4);
      mesh(group, 'sphere', mat(0xa584ed), -.14, .58, -.05, .13, .24, .12);
      for (const s of [-1, 1]) {
        mesh(group, 'sphere', mat(0xf8f0d8), s * .13, .39, .355, .087, .1, .032);
        mesh(group, 'sphere', mat(0x252033), s * .13, .39, .385, .039, .057, .025);
      }
    }
    this.mergeModel(group); this.enemyModels.set(key, group);
    return group.clone(true);
  }
  makeBomb() {
    const group = new THREE.Group();
    const blue = this.game?.player.fire === 'azure';
    mesh(group, 'sphere', mat(blue ? 0x22465b : 0x292935, blue ? 0x238bba : 0x371b10, .35, .35), 0, .32, 0, .31);
    if (this.game?.relics.includes('clock')) { mesh(group, 'cylinder', mat(0xe6b96e), 0, .35, .27, .20, .07, .20).rotation.x = Math.PI/2; mesh(group,'box',mat(0x201f2c),0,.39,.32,.025,.17,.04); mesh(group,'box',mat(0x201f2c),.05,.34,.32,.12,.025,.04); }
    mesh(group, 'cylinder', mat(0xb78b55), 0, .65, 0, .08, .15, .08);
    mesh(group, 'sphere', mat(0xffecae, 0xff8c22, 4), .03, .77, 0, .065);
    const ring = mesh(group, 'ring', mat(0xffac62, 0xff6622, 1.3), 0, .035, 0, .43, .43, .43, false); ring.rotation.x = Math.PI / 2;
    return group;
  }
  makePickup(type, value) {
    const group = new THREE.Group();
    if (type === 'scrap') {
      const metal=mat(0xd9a679,0xb77b3e,.25,.5);
      mesh(group,'cylinder',metal,0,.35,0,.2,.17,.2);
      for(let i=0;i<6;i++){const a=i*Math.PI/3;mesh(group,'box',metal,Math.cos(a)*.22,.35,Math.sin(a)*.22,.12,.14,.12);}
      mesh(group,'crystal',mat(0xffe0ac,0xdb9f5b,.7),0,.47,0,.075,.1,.075);
    } else if (type === 'cores') {
      const glow=mat(0xb0e3ff,0x68bdff,1.6);mesh(group,'crystal',glow,0,.5,0,.19,.32,.19);
      for(const angle of [.65,-.65])mesh(group,'ring',mat(0xdeb582),0,.5,0,.3,.3,.3,false).rotation.x=angle;
      mesh(group,'ring',glow,0,.06,0,.28,.28,.28,false).rotation.x=Math.PI/2;
    } else if (type === 'relic') {
      const color = new THREE.Color(relicById(value)?.color || '#ffdc89'); const material = mat(color.getHex(), color.getHex(), 1.6);
      mesh(group,'crystal',material,0,.6,0,.26,.36,.26);
      const ring = mesh(group,'ring',material,0,.07,0,.4,.4,.4,false); ring.rotation.x=Math.PI/2;
      const orbit = mesh(group,'ring',material,0,.6,0,.39,.39,.39,false); orbit.rotation.x=.6;
      mesh(group,'cylinder',mat(color.getHex(),color.getHex(),.6),0,.55,0,.018,1.1,.018,false);
    } else if (type === 'heart') {
      for (const s of [-1, 1]) mesh(group, 'sphere', mat(0xff7c92, 0xe93565, .6), s * .10, .42, 0, .15);
      mesh(group, 'crystal', mat(0xff7c92, 0xe93565, .6), 0, .32, 0, .2, .22, .14);
    } else {
      mesh(group, 'crystal', mat(0x85ffcb, 0x36eca8, 1.5), 0, .43, 0, .16, .29, .16);
      const ring = mesh(group, 'ring', mat(0x3e907b, 0x279e7e, .4), 0, .05, 0, .22, .22, .22, false); ring.rotation.x = Math.PI / 2;
    }
    return group;
  }
  ensureObject(id, factory, entity) {
    if (!this.objects.has(id)) {
      const obj = factory(); const [x, z] = this.at(entity.x, entity.z); obj.position.set(x, 0, z); this.dynamic.add(obj); this.objects.set(id, obj);
    }
    return this.objects.get(id);
  }
  // Destroços: a forma, a gravidade e a dispersão mudam por origem — gosma, ferro, cristal, madeira.
  burst(x, z, color, count = 12, force = 3, options) {
    if (this.reducedMotion) count = Math.min(4, count);
    else if (!this.quality) count = Math.max(2, Math.round(count * .6));
    const [px, pz] = this.at(x, z), { geo = 'box', size = 1, y = .35, gravity = 7, lift = 1, spread = 0 } = options || {};
    // A cor que a chamada ja passava vira o meio de uma rampa: branco-quente na
    // largada, a cor no meio, quase preto no fim. Nenhuma chamada existente muda.
    const ramp = rampFor(color?.isColor ? color.getHex() : color);
    const sprite = SPRITE_FOR_GEO[geo] ?? SPRITE.glow;
    const puff = geo === 'sphere';
    for (let i = 0; i < count; i++) {
      this.field.spawn({
        x: px + (Math.random() - .5) * spread, y, z: pz + (Math.random() - .5) * spread,
        vx: (Math.random() - .5) * force, vy: lift * (1 + Math.random() * force), vz: (Math.random() - .5) * force,
        g: gravity, drag: puff ? .95 : .3, age: 0, life: .5 + Math.random() * .5,
        size: (.17 + Math.random() * .14) * size * (puff ? 2.6 : 1),
        sprite, ramp, rot: Math.random() * 6.283, spin: (Math.random() - .5) * 7,
        gain: puff ? .5 : 1, swell: puff,
      });
    }
  }
  pulse(x, z, color, size = 2.1, duration = .5, delay = 0, implode = false) {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    if (this.ringTexture) { material.map = this.ringTexture; material.side = THREE.DoubleSide; }
    const fit = this.ringTexture ? RING_FIT : 1;
    const [wx, wz] = this.at(x, z), ring = new THREE.Mesh(this.ringTexture ? G.plane : G.ring, material);
    ring.rotation.x = Math.PI / 2; ring.position.set(wx, .07, wz); ring.scale.setScalar((implode ? .3 + size : .3) * fit); ring.visible = !delay; this.fx.add(ring);
    // A mesma rampa das particulas: o anel comeca branco-quente e esfria.
    this.pulses.push({ mesh: ring, age: 0, duration, size, delay, implode, fit, ramp: rampFor(color?.isColor ? color.getHex() : color) });
  }
  // Onda de choque: o anel rápido marca o ponto, o largo e atrasado devolve o peso do impacto.
  shock(x, z, color, size = 2.4, scorch = 0) {
    this.pulse(x, z, color, size, .42);
    if (!this.reducedMotion) this.pulse(x, z, color, size * 1.75, .8, .07);
    if (scorch) this.scorch(x, z, scorch);
  }
  scorch(x, z, scale = 1) {
    if (this.reducedMotion || !this.quality) return;
    const [wx, wz] = this.at(x, z), slot = this.scorchCursor = (this.scorchCursor + 1) % this.scorchMarks.count;
    this.scorches = this.scorches.filter(mark => mark.slot !== slot);
    this.scorches.push({ slot, x: wx, z: wz, age: 0, life: 2.2 + Math.random() * .6, scale: Math.min(1.5, .88 * scale) });
  }
  // Freeze-frame curto: só o tempo da cena para, a simulação segue no seu passo fixo.
  hit(seconds) { if (!this.reducedMotion) this.hitStop = Math.min(.13, Math.max(this.hitStop, seconds)); }
  // Agenda um efeito para daqui a alguns segundos. O relogio e o da cena, entao
  // pausa e hitStop seguram a coreografia junto com o resto.
  later(delay, fn) { this.timers.push({ delay, fn }); }
  runTimers(dt) {
    if (!this.timers.length) return;
    const due = [];
    for (const timer of this.timers) if ((timer.delay -= dt) <= 0) due.push(timer);
    if (due.length) this.timers = this.timers.filter(timer => timer.delay > 0);
    for (const timer of due) timer.fn();
  }
  impactLight(x, z, color, intensity, distance = 6, height = 1.2) {
    const [wx, wz] = this.at(x, z);
    this.flashLight.position.set(wx, height, wz); this.flashLight.color.set(color);
    this.flashLight.distance = distance; this.flashLight.intensity = this.reducedMotion ? Math.min(10, intensity * .3) : intensity;
  }
  dangerTiles(cells, material, width = .86) {
    const group = new THREE.Group();
    for (const c of cells) { const [x, z] = this.at(c.x, c.z); mesh(group, 'box', material, x, .045, z, width, .015, width, false); }
    return group;
  }
  handle(event) {
    if (['start','nextRound','boss'].includes(event.type)) this.prepareBoss();
    if (event.type === 'arena') this.buildArena();
    this.animateBoss(event);
    if (['bomb', 'dash', 'hurt', 'skill'].includes(event.type)) this.heroAction = { kind: event.type, age: 0, duration: event.type === 'skill' ? .65 : .3 };
    if (event.type === 'arena') { this.heroAction = null; this.skillAura = null; }
    if (event.type === 'start') { this.zoom = 1; this.pulse(this.game.player.x, this.game.player.z, 0xffd58b, 2, .9); }
    if (event.type === 'crate' || event.type === 'clear') {
      const block = this.blocks.get(`${event.x},${event.z}`); if (block) { this.removeBlock(block); this.blocks.delete(`${event.x},${event.z}`); }
      // Caixas viram tábuas e lascas, não cubos: peças chatas, giro alto e uma nuvem de pó por baixo.
      if (event.type === 'crate') { this.burst(event.x, event.z, 0xc18a58, 8, 2.6, { geo: 'round', size: 1.5, spread: .45 }); this.burst(event.x, event.z, 0x8a5f3f, 7, 2, { size: .8, gravity: 5, spread: .5 }); this.burst(event.x, event.z, 0xd8b78f, 5, 1.1, { geo: 'sphere', size: .7, gravity: 1.2, lift: .4, y: .2, spread: .7 }); }
    }
    if (event.type === 'explosion' || event.type === 'enemyExplosion' || event.type === 'echo') {
      const reach = event.cells.length;
      this.shake = this.reducedMotion ? 0 : Math.min(.36, .14 + reach * .011);
      const color = event.fire === 'azure' ? 0x64d9ff : event.type === 'echo' ? 0xc89aff : event.type === 'explosion' ? 0xffae55 : 0xff4359;
      for (const cell of event.cells) this.burst(cell.x, cell.z, color, 7, 3.5, { spread: .3 });
      const center = event.x !== undefined ? event : event.cells[0];
      if (center) {
        this.shock(center.x, center.z, color, 2.2 + reach * .07, event.type === 'echo' ? 0 : .95 + reach * .02);
        this.burst(center.x, center.z, color, this.quality ? 8 : 4, 1.4, { geo: 'sphere', size: 1.7, gravity: -2.2, lift: .5, y: .5, spread: .5 });
        this.impactLight(center.x, center.z, color, Math.min(62, 22 + reach * 1.8), 6 + reach * .16);
        if (reach >= 7 && event.type !== 'echo') this.hit(.035);
        this.heroSpark = Math.max(this.heroSpark, Math.min(1, .45 + reach * .03));
      }
      // Uma casa em cada três guarda a queimadura: o chão lembra por onde a horda passou.
      for (let i = 0; i < event.cells.length; i += 3) this.scorch(event.cells[i].x, event.cells[i].z, .8);
    }
    if (event.type === 'pickup') {
      const fx = PICKUP_FX[event.entityType] || PICKUP_FX.crystal;
      this.burst(event.x, event.z, fx.color, fx.count, fx.force, fx.burst);
      this.pulse(event.x, event.z, fx.ring, fx.size, .5);
      if (event.entityType === 'heart') this.impactLight(event.x, event.z, fx.color, 16, 5);
    }
    if (event.type === 'kill' || event.type === 'miniDefeated') {
      const fx = deathFx(event.entityType);
      this.burst(event.x, event.z, fx.color, fx.count, fx.force, fx.burst);
      this.pulse(event.x, event.z, fx.ring, fx.size, .45);
      if (fx.scorch) this.scorch(event.x, event.z, fx.scorch);
      if (fx.shake) { this.shake = this.reducedMotion ? 0 : Math.max(this.shake, fx.shake); this.pulse(event.x, event.z, fx.ring, fx.size * 1.7, .9, .08); this.impactLight(event.x, event.z, fx.ring, 38, 8); }
      if (fx.stop) this.hit(fx.stop);
    }
    if (event.type === 'enemyHit') this.burst(event.x, event.z, 0xffedd0, 4, 1.3);
    if (event.type === 'enemyHeal' || event.type === 'enemyMend') { this.pulse(event.x,event.z,0xabe8c9,.7,.6); this.burst(event.x,event.z,0x9feabf,7,1); }
    if (event.type === 'mimicAwake') { this.burst(event.x,event.z,0xe1ad7c,9,2); this.pulse(event.x,event.z,0xffb274,.8,.7); }
    if (event.type === 'blocked') { this.pulse(event.x,event.z,0xb4eafa,1.2,.6); this.burst(event.x,event.z,0xc7f2ff,10,2); }
    if (event.type === 'webBurst') for (const cell of event.cells) { this.pulse(cell.x,cell.z,0x90dfee,.65,.7); this.burst(cell.x,cell.z,0xb8e9f7,4,1); }
    if (event.type === 'hurt') { this.shake = this.reducedMotion ? 0 : .25; this.heroSpark = 1; this.hit(.05); }
    if (event.type === 'dash') {
      const steps = Math.abs(event.x - event.fromX) + Math.abs(event.z - event.fromZ);
      for (let i = 0; i <= steps; i++) { const x = event.fromX + Math.sign(event.x - event.fromX) * i, z = event.fromZ + Math.sign(event.z - event.fromZ) * i; this.burst(x, z, 0x9affe0, 5, 1); this.pulse(x, z, 0x93ffda, .55, .35); }
    }
    if (event.type === 'chargeTrail') this.burst(event.x, event.z, 0xff9067, 4, 1);
    if (event.type === 'revive' || event.type === 'miniboss') { this.pulse(event.x, event.z, event.type === 'miniboss' ? 0xff7c52 : 0xa9edff, 2.8, 1); this.burst(event.x, event.z, 0xffd88e, 26, 3); }
    if (event.type === 'relic' || event.type === 'relicDrop') {
      // A raridade dita o tamanho da festa: mais anéis, mais lascas e mais luz na épica.
      const relic = relicById(event.id), fx = rarityFx(relic?.rarity), color = new THREE.Color(relic?.color || '#ffdc89');
      for (let i = 0; i < fx.rings; i++) this.pulse(event.x, event.z, color, 1.9 + i * 1.4, .8 + i * .25, i * .12);
      this.burst(event.x, event.z, color, fx.count, fx.force, { geo: 'crystal', size: 1.2, spread: .4 });
      this.impactLight(event.x, event.z, color, fx.light, 7, 1.4);
      if (fx.shake) this.shake = this.reducedMotion ? 0 : Math.max(this.shake, fx.shake);
    }
    if (event.type === 'skill') {
      const colors = { power: 0xff985c, range: 0xff985c, capacity: 0xb5a0ff, fuse: 0xb5a0ff, health: 0xfb7993, heal: 0xfb7993, vampire: 0xfb7993, speed: 0x72dcc5, dash: 0x72dcc5, magnet: 0x72dcc5 };
      const p = this.game.player, color = colors[event.id] || skillById(event.id)?.color || '#d9b7ff'; this.skillAura = { color, life: 1.3 };
      this.pulse(p.x, p.z, color, 1.8, .75); this.pulse(p.x, p.z, color, .9, 1.1); this.burst(p.x, p.z, color, 24, 2.5);
    }
    if (event.type === 'bossEnraged') { const b = this.game.boss; if (b) { const color = new THREE.Color(this.game.biome.color); this.pulse(b.x, b.z, color, 4, 1.4); this.pulse(b.x, b.z, color, 2.5, .8); this.burst(b.x, b.z, color, 35, 4); this.shake = this.reducedMotion ? 0 : .25; this.hit(.04); } }
    // A entrada do primeiro guardiao e uma coreografia de quatro batidas. O jogo
    // esta congelado em phase 'transition', entao nada disso pode ferir ninguem.
    if (event.type === 'bossEntrance') {
      this.bossEntry = { age: 0, duration: event.duration + .4, depth: .9 };
      this.shake = this.reducedMotion ? 0 : .12;
    }
    if (event.type === 'bossEntranceBeat') {
      const color = new THREE.Color(event.color), { x, z } = event, soft = this.reducedMotion;
      if (event.kind === 'rumble') {
        // O chao acorda: poeira sobe num anel largo e a luz implode no trono.
        this.shake = soft ? 0 : .2;
        this.pulse(x, z, color, 1.3, 1.7, 0, true);
        for (let i = 0; i < (soft ? 5 : 16); i++) {
          const a = i / (soft ? 5 : 16) * Math.PI * 2, r = 3 + Math.random() * 2.2;
          this.burst(x + Math.cos(a) * r, z + Math.sin(a) * r, 0xb9a6c8, soft ? 1 : 3, 1,
            { geo: 'sphere', size: 1.3, gravity: -1.5, lift: .5, spread: .9 });
        }
      }
      if (event.kind === 'fissure') {
        // Quatro fendas correm para fora, uma casa por vez.
        this.shake = soft ? 0 : .28;
        this.pulse(x, z, color, 5.2, .95);
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          for (let step = 1; step <= 6; step++) {
            const cx = x + dx * step, cz = z + dz * step;
            this.later(step * .055, () => {
              this.burst(cx, cz, color, soft ? 1 : 4, 1.5, { geo: 'crystal', size: 1.1, spread: .35 });
              if (!soft) this.burst(cx, cz, 0xffffff, 2, .8, { size: .7, gravity: 3, spread: .3 });
              if (!soft && step % 2 === 0) this.scorch(cx, cz, .65);
            });
          }
        }
      }
      if (event.kind === 'summon') {
        // A escolta e puxada para dentro: anel que implode e depois estoura.
        this.shake = soft ? 0 : .18;
        for (const unit of event.escort || []) {
          this.pulse(unit.x, unit.z, color, 1.7, .75, 0, true);
          this.later(.28, () => {
            this.burst(unit.x, unit.z, color, soft ? 3 : 12, 2.2, { geo: 'crystal', size: 1 });
            this.impactLight(unit.x, unit.z, color, 22, 5, 1);
          });
        }
      }
      if (event.kind === 'slam') {
        // Ele pousa. E a unica batida que tem direito a hitStop.
        this.shake = soft ? 0 : .6;
        this.hit(.13);
        this.shock(x, z, color, 6.2, 2);
        this.burst(x, z, 0xffffff, soft ? 6 : 26, 3.4, { size: 1.9, gravity: 5, spread: .5 });
        this.burst(x, z, 0xf6ecff, soft ? 4 : 20, 2.4, { geo: 'sphere', size: 2.3, gravity: -2.2, lift: .5, y: .6, spread: 1.5 });
        this.pulse(x, z, 0xffffff, 3.2, .4);
        this.impactLight(x, z, color, 62, 16, 1.5);
        for (let i = 1; i <= 2; i++) this.later(i * .1, () => this.pulse(x, z, color, 4.5 + i * 3.6, .9 + i * .2));
      }
    }
    if (event.type === 'boss') {
      // Entrada do guardião: a arena escurece, o holofote acende nele e três ondas varrem o chão.
      const b = this.game.boss;
      if (b) {
        const color = new THREE.Color(this.game.biome.color);
        this.bossEntry = { age: 0, duration: 1.9 };
        for (let i = 0; i < 3; i++) this.pulse(b.x, b.z, color, 3.6 + i * 2.1, 1 + i * .3, i * .17);
        this.burst(b.x, b.z, color, 36, 4.2, { geo: 'crystal', size: 1.4, spread: .8 });
        this.burst(b.x, b.z, color, this.quality ? 14 : 6, 1.6, { geo: 'sphere', size: 2.2, gravity: -2.6, lift: .4, y: .6, spread: 1.4 });
        this.scorch(b.x, b.z, 1.7); this.shake = this.reducedMotion ? 0 : .34; this.hit(.1);
      }
    }
    if (event.type === 'bossDefeated') {
      this.burst(event.x, event.z, 0xffc778, 80, 8, { spread: 1.2 });
      this.burst(event.x, event.z, new THREE.Color(this.game.biome.color), 24, 3, { geo: 'crystal', size: 1.6, gravity: 4, spread: 1 });
      for (let i = 0; i < 3; i++) this.pulse(event.x, event.z, 0xffd695, 5 + i * 2.4, 1.1 + i * .3, i * .13);
      this.impactLight(event.x, event.z, 0xffd695, 52, 11, 2);
      this.scorch(event.x, event.z, 1.8); this.shake = this.reducedMotion ? 0 : .45; this.hit(.12);
    }
    if (event.type === 'mastery') {
      this.skillAura={color:event.color,life:2.5};
      for (const [i,size] of [1.2,2.3,3.5].entries()) this.pulse(event.x,event.z,event.color,size,1.4,i*.1);
      this.burst(event.x,event.z,event.color,55,4,{geo:'crystal',size:1.2,spread:.6}); this.heroAction={kind:'skill',age:0,duration:1};
      this.impactLight(event.x,event.z,event.color,40,8,1.6); this.hit(.07); this.heroSpark=1;
    }
    if (event.type === 'chainArc') {
      const steps=12;
      for(let i=0;i<=steps;i++) { const k=i/steps; this.burst(event.from.x+(event.x-event.from.x)*k,event.from.z+(event.z-event.from.z)*k,0xffe698,1,.4); }
      this.pulse(event.x,event.z,0xffe698,.5,.25);
    }
    if (event.type === 'comet') for(const c of event.cells) { this.pulse(c.x,c.z,0x6cf0d8,.7,.6);this.burst(c.x,c.z,0x6cf0d8,5,1.5); }
    if (event.type === 'arenaShift') {
      for(const c of event.cells) {this.burst(c.x,c.z,event.color,6,2);this.pulse(c.x,c.z,event.color,.8,.9);}
      this.shake=this.reducedMotion?0:.2;
    }
    if(event.type==='bossStep' && !this.reducedMotion) {
      this.burst(event.x,event.z,this.game.biome.color,4,.65);
      this.pulse(event.x,event.z,this.game.biome.color,.55,.22);
    }
    if(event.type==='bossImpact') {
      this.shock(event.x,event.z,event.color,2.6,1.2);
      this.burst(event.x,event.z,event.color,24,3,{spread:.6});
      for(const c of event.cells.slice(0,18))this.burst(c.x,c.z,event.color,3,1.2);
      this.impactLight(event.x,event.z,event.color,34,8);
      this.shake=this.reducedMotion?0:.22; this.hit(.045); this.signatureCharge=null;
    }
    if (event.type === 'anchorBroken') {
      this.pulse(event.x,event.z,0xaaffe0,2.4,1);this.burst(event.x,event.z,0xe6ffe9,28,3);
      if(event.target) {
        for(let i=0;i<=12;i++) {
          const k=i/12;
          this.burst(event.x+(event.target.x-event.x)*k,event.z+(event.target.z-event.z)*k,0xaaffe0,2,.3);
        }
        this.pulse(event.target.x,event.target.z,0xaaffe0,2.8,1);
      }
    }
    if (event.type === 'wardReady') this.pulse(event.x,event.z,0xb3e5d4,.8,.7);
    // O cenario ataca sozinho, sem inimigo por perto. A brasa sobe do chao no
    // instante do anuncio para separar 'o mapa te quer morto' de 'alguem te
    // quer morto' — o telegrafo sozinho nao dizia de onde vinha.
    if (event.type === 'hazard') {
      const color = new THREE.Color(this.game.biome.color);
      const cells = event.cells.slice(0, 24);
      // Duas respiradas, nao um flash: o anuncio sozinho se perde no meio da
      // partida, e o telegrafo ainda tem 1,65s de vida pela frente.
      const respirar = forca => {
        for (const cell of cells)
          this.burst(cell.x, cell.z, color, this.reducedMotion ? 1 : forca, 1,
            { geo: 'round', size: 1.15, gravity: -2.4, lift: .4, y: .08, spread: .6 });
      };
      respirar(5);
      if (!this.reducedMotion) this.later(.55, () => respirar(3));
      const first = cells[0];
      if (first) { this.pulse(first.x, first.z, color, 1.8, .9, 0, true); this.impactLight(first.x, first.z, color, 18, 6, 1); }
    }
    // A arena do duelo se reconstroi inteira: buildArena e puramente apresentacao,
    // entao o mesh do jogador sobrevive e os dinamicos voltam por ensureObject.
    if (event.type === 'arenaReshape') {
      this.buildArena();
      const cx = (this.game.width - 1) / 2, cz = (this.game.height - 1) / 2;
      for (const size of [3, 6, 10]) this.pulse(cx, cz, event.color, size, 1.1);
      for (const cell of event.cells.slice(0, 40)) {
        if (cell.to) this.burst(cell.x, cell.z, 0xb9a6c8, this.reducedMotion ? 1 : 6, 1.5, { geo: 'sphere', size: 1.5, gravity: -1.6, lift: .6, spread: .7 });
        else this.burst(cell.x, cell.z, event.color, this.reducedMotion ? 1 : 5, 2.4, { geo: 'crystal', size: 1.1, spread: .4 });
      }
      this.shake = this.reducedMotion ? 0 : .5; this.hit(.12);
      this.impactLight?.(cx, cz, event.color, 46, 14, 1.8);
    }
    // Uma casa que fecha merece o oposto do estilhaco: poeira subindo no lugar.
    if (event.type === 'raise') { this.burst(event.x, event.z, 0xb9a6c8, this.reducedMotion ? 2 : 7, 1.6); this.pulse(event.x, event.z, 0xcbb6da, .7, .5); }
    if (event.type === 'champion') { this.pulse(event.x, event.z, 0xffb05a, 3.4, 1.1); this.burst(event.x, event.z, 0xffc98a, 26, 3); this.shake = this.reducedMotion ? 0 : .26; }
    if (event.type === 'bossFlee') {
      // Some no escuro: a mesma coreografia da entrada, ao contrario.
      this.bossEntry = { age: 0, duration: 3, depth: 1 };
      for (const size of [4.4, 2.6, 1.2]) this.pulse(event.x, event.z, event.color, size, .9);
      this.burst(event.x, event.z, event.color, this.reducedMotion ? 6 : 44, 5);
      this.shake = this.reducedMotion ? 0 : .3; this.hit(.1);
    }
    if (event.type === 'bossTeleport') for(const c of [event.from,event]) {this.pulse(c.x,c.z,event.color,1.6,1);this.burst(c.x,c.z,event.color,20,2,{geo:'crystal',size:1.1});}
    if (event.type === 'bossPhase') {
      // Virada de ato. O III é o clímax da luta: escurece mais, sacode mais e para o tempo por um instante.
      const climax = event.phase >= 3, color = new THREE.Color(event.color);
      this.bossEntry = { age: 0, duration: climax ? 2.1 : 1.3, depth: climax ? 1 : .55 };
      for (let i = 0; i < (climax ? 4 : 2); i++) this.pulse(event.x, event.z, color, 3 + i * 2, .9 + i * .28, i * .14);
      this.burst(event.x, event.z, color, climax ? 44 : 26, climax ? 4.6 : 3.4, { geo: 'crystal', size: 1.4, spread: .9 });
      if (climax) this.burst(event.x, event.z, color, this.quality ? 16 : 6, 1.8, { geo: 'sphere', size: 2.4, gravity: -2.8, lift: .4, y: .7, spread: 1.6 });
      this.scorch(event.x, event.z, climax ? 1.7 : 1.1);
      this.shake = this.reducedMotion ? 0 : climax ? .42 : .26; this.hit(climax ? .12 : .06);
    }
    if (event.type === 'bossSignature') {
      // Acumulação: anéis que implodem no guardião durante todo o telégrafo, resolvidos no bossImpact.
      const color = new THREE.Color(event.color), rings = this.reducedMotion ? 1 : 3;
      for (let i = 0; i < rings; i++) this.pulse(event.x, event.z, color, 4.4, event.duration / rings, event.duration * i / rings, true);
      this.signatureCharge = { x: event.x, z: event.z, color, age: 0, duration: event.duration, next: 0 };
      this.impactLight(event.x, event.z, color, 20, 7, 1.8);
    }
    if (event.type === 'bossDash') {
      const cells = event.cells || [];
      for (const [i, cell] of cells.entries()) { this.burst(cell.x, cell.z, this.game.biome.color, 3, 1.6, { spread: .5 }); this.pulse(cell.x, cell.z, this.game.biome.color, .8, .35, i * .015); }
      if (event.from) this.burst(event.from.x, event.from.z, this.game.biome.color, 10, 2.4, { geo: 'round', size: 1.1, spread: .6 });
      this.shock(event.x, event.z, this.game.biome.color, 2, 1); this.shake = this.reducedMotion ? 0 : .2; this.hit(.035);
    }
    if (event.type === 'bossDodge') { this.burst(event.x, event.z, 0xd8e6ff, 8, 1.8, { geo: 'sphere', size: .8, gravity: 2, spread: .7 }); this.pulse(event.x, event.z, 0xd8e6ff, 1, .35); }
    // Recuo acontece o tempo todo: só um sopro de poeira, sem anel nem tremor.
    if (event.type === 'bossReposition' && !this.reducedMotion && this.time > (this.lastReposition || 0) + .45) { this.lastReposition = this.time; this.burst(event.x, event.z, this.game.biome.color, 3, .8, { size: .7, gravity: 4, y: .18, spread: .6 }); }
  }
  update(dt) {
    if (['paused', 'upgrade'].includes(this.game.phase)) dt = 0;
    if (this.hitStop > 0) { this.hitStop = Math.max(0, this.hitStop - dt); dt *= .16; }
    if (this.atmosphere.reduced !== this.reducedMotion) this.applyAtmosphere();
    this.runTimers(dt);
    this.time += dt; const t = this.time, game = this.game;
    const p = game.player, [px, pz] = this.at(p.x, p.z);
    this.playerMesh.position.x = THREE.MathUtils.damp(this.playerMesh.position.x, px, 25, dt);
    this.playerMesh.position.z = THREE.MathUtils.damp(this.playerMesh.position.z, pz, 25, dt);
    this.playerMesh.position.y = game.active && p.moveCooldown > .03 ? Math.abs(Math.sin(t * 20)) * .09 : Math.sin(t * 2) * .025;
    const angle = Math.atan2(p.facing[0], p.facing[1]);
    this.playerMesh.rotation.y = angle;
    this.playerMesh.visible = true;
    this.playerMesh.children[0].scale.setScalar(.44 + (p.invincible > 0 ? Math.sin(t * 8) * .05 : 0));
    const pose = this.playerMesh.userData.pose, walking = game.active && p.moveCooldown > .025 && !this.reducedMotion;
    if (this.playerMesh.userData.outfit !== p.outfit) { pose.suit.color.set(OUTFITS.find(o=>o.id===p.outfit)?.color || '#f68b3d'); this.playerMesh.userData.outfit=p.outfit; }
    const stride = walking ? Math.sin(t * 23) : 0;
    if (this.heroAction) this.heroAction.age += dt;
    const action = this.heroAction, kick = action && action.age < action.duration && !this.reducedMotion ? Math.sin(action.age / action.duration * Math.PI) : 0;
    pose.body.rotation.z = THREE.MathUtils.damp(pose.body.rotation.z, game.phase === 'dead' ? -1.2 : action?.kind === 'hurt' ? kick * -.2 : stride * .04, 15, dt);
    pose.body.rotation.x = action?.kind === 'dash' ? kick * .4 : action?.kind === 'bomb' ? kick * .17 : 0;
    pose.body.scale.set(1 + kick * .06, 1 - kick * .08, 1 + kick * .06);
    pose.body.position.y = game.phase === 'dead' ? -.12 : action?.kind === 'skill' ? kick * .17 : 0;
    pose.boots.forEach((boot, i) => { boot.position.z = .08 + stride * (i ? -.065 : .065); boot.position.y = .13 + Math.max(0, stride * (i ? -1 : 1)) * .045; });
    pose.hands.forEach((hand, i) => { hand.position.z = stride * (i ? .075 : -.075) + (action?.kind === 'bomb' ? kick * .15 : 0); hand.rotation.z = (i ? -1 : 1) * (kick * .25 + Math.abs(stride) * .08); });
    if (this.skillAura) this.skillAura.life -= dt;
    this.playerMesh.children[0].material.color.set(this.skillAura?.life > 0 ? this.skillAura.color : p.fire === 'azure' ? 0x59caff : 0xffc180);
    this.playerMesh.children[0].material.emissive.set(this.skillAura?.life > 0 ? this.skillAura.color : p.fire === 'azure' ? 0x189de8 : 0xff9441);
    const live = new Set();
    if (game.masteries?.length || p.ward) {
      const id='player-mastery'; live.add(id);
      const aura=this.ensureObject(id,()=>{
        const group=new THREE.Group();
        mesh(group,'ring',mat(0xf5dba1,0xe1a953,.7),0,.045,0,.48,.48,.48,false).rotation.x=Math.PI/2;
        for(let i=0;i<5;i++){const a=i*Math.PI*2/5;mesh(group,'crystal',mat(0xffe4a2,0xffcc6d,.8),Math.sin(a)*.5,.09,Math.cos(a)*.5,.045,.06,.045,false);}
        const shield=mesh(group,'ring',mat(0xa7ffe2,0x62e8cb,.8),0,.65,0,.52,.52,.52,false);shield.name='ward';
        return group;
      },p);
      aura.position.set(this.playerMesh.position.x,0,this.playerMesh.position.z);
      aura.rotation.y=this.reducedMotion?0:t*.65;
      aura.getObjectByName('ward').visible=!!p.ward;
      aura.children.slice(0,6).forEach(child=>child.visible=!!game.masteries?.length);
    }
    for(const anchor of game.anchors || []) {
      live.add(anchor.id);
      const obj=this.ensureObject(anchor.id,()=>{
        const group=new THREE.Group(), material=mat(anchor.color,anchor.color,1.2);
        mesh(group,'cylinder',mat(0x242033),0,.12,0,.46,.2,.46);
        const crystal=mesh(group,'crystal',material,0,.76,0,.36,.52,.36);crystal.name='rune-core';
        const ring=mesh(group,'ring',mat(0xe3ffe9,0x9dffd3,.9),0,.08,0,.65,.65,.65,false);
        ring.rotation.x=Math.PI/2;ring.name='rune-ring';
        for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          mesh(group,'crystal',material,dx*.52,.18,dz*.52,.09,.13,.09,false);
        }
        return group;
      },anchor);
      obj.getObjectByName('rune-core').rotation.y=this.reducedMotion?0:t;
      obj.getObjectByName('rune-core').position.y=.76+(this.reducedMotion?0:Math.sin(t*3)*.04);
      obj.getObjectByName('rune-ring').scale.setScalar(.65*(this.reducedMotion?1:1+Math.sin(t*3)*.06));
    }
    for (const entity of [...game.enemies, ...(game.boss ? [game.boss] : [])]) {
      live.add(entity.id); const obj = this.ensureObject(entity.id, () => this.makeEnemy(entity.type, entity.variant || game.biome.guardian || game.biome.id), entity); const [x, z] = this.at(entity.x, entity.z);
      const moving = Math.abs(obj.position.x - x) + Math.abs(obj.position.z - z) > .02;
      const damping = entity.chargeSteps > 0 ? 35 : 13;
      obj.position.x = THREE.MathUtils.damp(obj.position.x, x, damping, dt); obj.position.z = THREE.MathUtils.damp(obj.position.z, z, damping, dt);
      const actor = obj.userData.actor;
      obj.position.y = actor ? 0 : Math.abs(Math.sin(t * (entity.type === 'slime' ? 5 : 9) + entity.id)) * (moving ? .12 : .035);
      actor?.update(['paused', 'upgrade', 'menu'].includes(game.phase) ? 0 : dt, { moving: game.active && moving, slow: entity.slow > 0, casting:entity.castTimer>0, reducedMotion:this.reducedMotion });
      obj.scale.setScalar((entity.hitFlash > 0 ? 1.15 : 1) * (entity.type === 'sentinel' ? .8 : 1));
      if (entity.type === 'slime' && !this.reducedMotion) { const squash = Math.sin(t * (moving ? 10 : 4) + entity.id) * (moving ? .12 : .045); const hit = entity.hitFlash > 0 ? .16 : 0; obj.scale.set(1 + squash + hit, 1 - squash - hit * .5, 1 + squash + hit); }
      if (entity.type === 'spore' && !this.reducedMotion) { obj.scale.y=1+Math.sin(t*4+entity.id)*.035;obj.rotation.z=moving?Math.sin(t*11+entity.id)*.07:0; }
      if (entity.type === 'weaver' && moving && !this.reducedMotion) { obj.position.y+=Math.sin(t*23)*.025;obj.rotation.z=Math.sin(t*23)*.045; }
      if (entity.type === 'oracle') obj.position.y+=.045+Math.sin(t*3)*.035+(entity.mending>0?.1:0);
      if (entity.type === 'mimic') { obj.position.y=entity.awake&&moving?Math.abs(Math.sin(t*13))*.1:0;obj.rotation.z=entity.awake?Math.sin(t*7)*.025:0; }
      if (entity.type === 'beetle' && moving && !this.reducedMotion) obj.rotation.z = Math.sin(t * 22) * .065;
      if (entity.type === 'wisp') obj.position.y += .17 + Math.sin(t*3+entity.id)*.1;
      if (entity.slow > 0 && Math.sin(t*15+entity.id) > .94 && dt > 0 && !this.reducedMotion) this.burst(entity.x,entity.z,0x86f5ff,1,.3);
      if (entity.stagger > 0) {const id=`stagger-${entity.id}`;live.add(id);const stars=this.ensureObject(id,()=>{const g=new THREE.Group();for(let i=0;i<3;i++){const a=i*Math.PI*2/3;mesh(g,'crystal',mat(0xaaffe0,0x65efc7,.8),Math.sin(a)*.6,2,Math.cos(a)*.6,.08,.12,.08,false);}return g;},entity);const [sx,sz]=this.at(entity.x,entity.z);stars.position.set(sx,0,sz);stars.rotation.y=this.reducedMotion?0:t*2;}
      if (actor && game.active) {
        const target=entity.castTimer>0 && entity.castTarget ? entity.castTarget : game.player;
        const dir=moving&&entity.facing ? entity.facing : [target.x-entity.x,target.z-entity.z];
        if(dir[0]||dir[1]) {
          const angle=Math.atan2(dir[0],dir[1]);
          const delta=Math.atan2(Math.sin(angle-obj.rotation.y),Math.cos(angle-obj.rotation.y));
          obj.rotation.y+=delta*(1-Math.exp(-dt*10));
        }
      } else if (moving) obj.rotation.y = Math.atan2(x - obj.position.x, z - obj.position.z);
      if (entity.windup > 0) {
        obj.scale.set(1.12, .84 + Math.sin(t * 30) * .04, 1.12); obj.rotation.y = Math.atan2(entity.chargeDir[0], entity.chargeDir[1]);
        const id = `charge-${entity.id}`; live.add(id);
        const lane = this.ensureObject(id, () => this.dangerTiles(entity.chargeCells, this.chargeWarningMaterial, .64), { x: (game.width - 1) / 2, z: (game.height - 1) / 2 });
        lane.visible = this.reducedMotion || Math.sin(t * 16) > -.5;
      }
    }
    if (game.boss) {
      const b = game.boss, id = `boss-seal-${b.id}`; live.add(id);
      const seal = this.ensureObject(id, () => {
        const group = new THREE.Group(), color = new THREE.Color(game.biome.color), material = mat(color, color, .6);
        for (const radius of [1.05, 1.28]) mesh(group, 'ring', material, 0, .05, 0, radius, radius, radius, false).rotation.x = Math.PI / 2;
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; mesh(group, 'crystal', material, Math.sin(a) * 1.15, .06, Math.cos(a) * 1.15, .065, .08, .065, false); }
        return group;
      }, b);
      const [x, z] = this.at(b.x, b.z); seal.position.x = THREE.MathUtils.damp(seal.position.x, x, 13, dt); seal.position.z = THREE.MathUtils.damp(seal.position.z, z, 13, dt);
      seal.rotation.y = this.reducedMotion ? 0 : t * (b.enraged ? -.45 : .15);
      seal.scale.setScalar(b.enraged ? 1.07 : 1);
    }
    for (const bomb of game.bombs) {
      live.add(bomb.id); const obj = this.ensureObject(bomb.id, () => this.makeBomb(), bomb);
      const urgency = Math.max(0, 1 - bomb.fuse / bomb.maxFuse), beat = this.reducedMotion ? 0 : Math.sin(t * (bomb.fuse < .7 ? 22 : 9)) * (.035 + urgency * .09);
      obj.scale.set(1 + beat, 1 - beat * .8, 1 + beat); obj.rotation.y = Math.sin(t) * .08;
      if (game.active && !this.reducedMotion && t > (obj.userData.sparkAt || 0)) { obj.userData.sparkAt = t + .22; this.burst(bomb.x, bomb.z, p.fire === 'azure' ? 0x6ae7ff : 0xffc478, 1, .65); }
      if (bomb.fuse < 1.3) {
        const id = `bomb-warning-${bomb.id}`; live.add(id);
        this.ensureObject(id, () => this.dangerTiles(game.blastCells(bomb), this.bombWarningMaterial), { x: (game.width - 1) / 2, z: (game.height - 1) / 2 });
      }
    }
    for (const pickup of game.pickups) {
      live.add(pickup.id); const obj = this.ensureObject(pickup.id, () => this.makePickup(pickup.type, pickup.value), pickup);
      obj.position.y = Math.sin(t * 3 + pickup.id) * .055; obj.rotation.y = t * .9;
    }
    for (const echo of game.echoes) {
      const id = `echo-warning-${echo.id}`; live.add(id);
      this.ensureObject(id, () => this.dangerTiles(echo.cells, this.echoWarningMaterial, .55), { x: (game.width - 1) / 2, z: (game.height - 1) / 2 });
    }
    for (const flame of game.flames) {
      if (flame.effect === 'snare') continue;
      live.add(flame.id);
      const obj = this.ensureObject(flame.id, () => {
        const group = new THREE.Group(); group.userData.maxLife = flame.life;
        for (const c of flame.cells) {
          const [x, z] = this.at(c.x, c.z), material = mat(flame.fire === 'azure' ? 0xa0eeff : flame.fire === 'spectral' ? 0x80ffee : flame.enemy ? 0xff716d : 0xffcc76, flame.fire === 'azure' ? 0x189de8 : flame.fire === 'spectral' ? 0x28bfca : flame.enemy ? 0xff253b : 0xff6a12, 3);
          mesh(group, 'box', material, x, .14, z, .91, .25, .91, false);
          mesh(group, 'crystal', material, x, .45, z, .29, .65, .29, false);
        }
        return group;
      }, { x: (game.width - 1) / 2, z: (game.height - 1) / 2 });
      // The flash collapses quickly into low embers: the impact is already over.
      const age = obj.userData.maxLife - flame.life;
      obj.scale.y = Math.max(.015, Math.exp(-age * 12));
      obj.children.forEach((part, i) => { if (i % 2) part.visible = age < .2; });
    }
    for (const warning of game.warnings) {
      live.add(warning.id);
      const obj = this.ensureObject(warning.id, () => {
        // Uma marca de chão diz TRÊS coisas: onde bate, que tipo de golpe é, e
        // quanto falta. A terceira era a que faltava — o tempo vivia só na barra
        // do chefe, no topo da tela, longe de onde o olho do jogador está.
        const group = new THREE.Group(), signature = warning.signature;
        const color = warning.color || (warning.effect === 'snare' ? 0x9cddff : signature ? 0xff5fd2 : 0xf65a69);
        const fills = [], rims = [];
        for (const [i, c] of warning.cells.entries()) {
          const [x, z] = this.at(c.x, c.z);
          // Friso erguido na aresta: casas vizinhas formam um contorno contínuo,
          // então dá para ler o FORMATO do golpe, não só casas soltas.
          for (const [ox, oz, sx, sz] of [[-.44, 0, .055, .89], [.44, 0, .055, .89], [0, -.44, .89, .055], [0, .44, .89, .055]])
            rims.push(mesh(group, 'box', mat(color, color, signature ? 2.1 : 1.5), x + ox, .045, z + oz, sx, .075, sz, false));
          // Miolo que cresce do centro até estourar: é o relógio no chão.
          const fill = mesh(group, 'box', mat(color, color, signature ? 1.1 : .55), x, .03, z, .84, .02, .84, false);
          fill.material.transparent = true; fill.material.opacity = .5;
          fills.push(fill);
          if (warning.rite || (signature && i % 4 === 0)) mesh(group, 'crystal', mat(color, color, .5), x, signature ? .42 : 1.05, z, .09, signature ? .5 : .15, .09, false);
          // Forma por tipo, não só cor: a teia cruza fios, o rito crava runas nas quinas.
          if (warning.effect === 'snare') for (const rot of [Math.PI / 4, -Math.PI / 4])
            mesh(group, 'box', mat(color, color, 1.2), x, .05, z, 1.15, .03, .055, false).rotation.y = rot;
          if (warning.rite) for (const [ox, oz] of [[-.36, -.36], [.36, .36]])
            mesh(group, 'box', mat(color, color, 1.8), x + ox, .06, z + oz, .12, .05, .12, false);
        }
        group.userData.fills = fills; group.userData.rims = rims; group.userData.tint = color;
        // Destino do salto e fim da investida ganham um marco alto: o chão diz onde o guardião vai parar.
        for (const spot of [warning.landing, warning.path?.[warning.path.length - 1]]) {
          if (!spot) continue; const [x, z] = this.at(spot.x, spot.z);
          mesh(group, 'crystal', mat(color, color, 1.6), x, .75, z, .2, .55, .2, false);
        }
        return group;
      }, { x: (game.width - 1) / 2, z: (game.height - 1) / 2 });
      obj.visible = true;
      // Progresso real do telégrafo. Sem duração conhecida, trata como iminente.
      const done = warning.duration ? Math.min(1, Math.max(0, 1 - warning.timer / warning.duration)) : 1;
      const grow = done ** .72;
      for (const fill of obj.userData.fills || []) {
        fill.scale.set(.84 * grow, .02, .84 * grow);
        fill.material.opacity = .32 + done * .55;
      }
      // O friso acende no fim: nos últimos 25% o contorno pulsa forte, e esse é
      // o sinal de "agora". Sem movimento, ele ainda sobe de brilho.
      const urgent = done > .75 ? (done - .75) / .25 : 0;
      const beat = this.reducedMotion ? urgent : urgent * (.55 + .45 * Math.sin(t * 26));
      for (const rim of obj.userData.rims || []) rim.scale.y = .075 * (1 + beat * 2.6);
      obj.scale.y = 1 + (this.reducedMotion ? 0 : Math.sin(t * (warning.signature ? 13 : 8)) * (warning.signature ? .06 : .04));
      // Fagulhas convergindo marcam a contagem sem depender de cor: uma leva na
      // metade do tempo, outra pouco antes de estourar.
      if (!this.reducedMotion && this.quality) {
        const stage = done > .88 ? 2 : done > .5 ? 1 : 0;
        if (stage > (warning.pulsed || 0)) {
          warning.pulsed = stage;
          for (const c of warning.cells.slice(0, stage === 2 ? 8 : 4))
            this.burst(c.x, c.z, obj.userData.tint, stage === 2 ? 4 : 2, stage === 2 ? 1.5 : .8);
        }
      }
    }
    for (const [id, obj] of this.objects) if (!live.has(id)) { obj.userData.actor?.dispose(); this.dynamic.remove(obj); this.objects.delete(id); }
    if (this.retiredBoss) {
      const obj = this.retiredBoss, elapsed = ['paused', 'upgrade', 'menu'].includes(game.phase) ? 0 : dt;
      obj.userData.actor.update(elapsed); obj.userData.retireTime -= elapsed;
      if (obj.userData.retireTime <= 0) { obj.userData.actor.dispose(); this.retiredBoss = null; }
    }
    this.field.update(dt);
    for (const pulse of this.pulses) {
      if (pulse.delay > 0) { pulse.delay -= dt; if (pulse.delay <= 0) pulse.mesh.visible = true; continue; }
      pulse.age += dt; const progress = Math.min(1, pulse.age / pulse.duration);
      pulse.mesh.scale.setScalar((pulse.implode ? .3 + pulse.size * (1 - progress) ** 1.6 : .3 + pulse.size * (1 - (1 - progress) ** 2)) * (pulse.fit ?? 1));
      pulse.mesh.material.opacity = pulse.implode ? .2 + progress * .7 : (1 - progress) ** 2 * .8;
      // Amostra so ate 75% da rampa: o ultimo tom e quase preto e some sozinho
      // no aditivo, o que comeria o fim do anel duas vezes.
      rampColor(pulse.ramp, progress * .75, pulse.mesh.material.color);
      if (progress >= 1) { this.fx.remove(pulse.mesh); pulse.mesh.material.dispose(); }
    }
    this.pulses = this.pulses.filter(pulse => pulse.age < pulse.duration);
    this.flashLight.intensity *= Math.exp(-dt * 13);
    if (this.portalRing) this.portalRing.rotation.z = t * .12;
    if (!this.reducedMotion) this.underRing.rotation.z = t * .015;
    this.atmosphere.update(dt, t);
    const base = this.baseLight;
    if (this.bossEntry) {
      this.bossEntry.age += dt;
      const k = Math.min(1, this.bossEntry.age / this.bossEntry.duration), depth = this.bossEntry.depth ?? 1, dim = (k < .16 ? k / .16 : (1 - (k - .16) / .84) ** 1.5) * depth;
      this.hemi.intensity = base.hemi * (1 - dim * .58); this.sun.intensity = base.sun * (1 - dim * .5); this.rim.intensity = base.rim * (1 + dim * .55);
      const boss = game.boss;
      if (boss) { const [bx, bz] = this.at(boss.x, boss.z); this.flashLight.position.set(bx, 3.4, bz); this.flashLight.color.set(game.biome.color); this.flashLight.distance = 12; this.flashLight.intensity = Math.max(this.flashLight.intensity, 48 * dim); }
      if (k >= 1) { this.bossEntry = null; this.hemi.intensity = base.hemi; this.sun.intensity = base.sun; this.rim.intensity = base.rim; }
    } else {
      // Eventos ambientais (raio, gêiser, sopro de gelo) acendem só a luz de contorno, nunca a tela.
      const flash = this.atmosphere.flash;
      this.rim.intensity = base.rim * (1 + flash * this.style.event.punch); this.hemi.intensity = base.hemi * (1 + flash * .28); this.sun.intensity = base.sun;
      this.rim.color.copy(base.rimColor).lerp(this.eventColor, Math.min(.85, flash));
    }
    if (this.signatureCharge) {
      const charge = this.signatureCharge; charge.age += dt;
      const boss = game.boss; if (boss) { charge.x = boss.x; charge.z = boss.z; }
      if (!this.reducedMotion && charge.age > charge.next) {
        charge.next = charge.age + .09;
        const a = Math.random() * Math.PI * 2, radius = 1.4 + Math.random() * 1.3;
        this.burst(charge.x + Math.cos(a) * radius, charge.z + Math.sin(a) * radius, charge.color, 1, .25, { geo: 'crystal', size: 1.1, gravity: -3.4, lift: .2, y: .15 });
      }
      if (charge.age >= charge.duration) this.signatureCharge = null;
    }
    // A luz de preenchimento vira o brilho reativo do chão sob o herói: pulsa em dano e explosão.
    this.heroSpark = Math.max(0, this.heroSpark - dt * 2.4);
    this.fill.position.set(this.playerMesh.position.x, 2.4, this.playerMesh.position.z + .6);
    this.fill.intensity = base.fill * (1 + this.heroSpark * 1.7); this.fill.distance = 11 + this.heroSpark * 4;
    if (this.scorches.length) {
      for (const scorch of this.scorches) {
        scorch.age += dt; const fade = Math.max(0, 1 - scorch.age / scorch.life) ** .55;
        this.dummy.position.set(scorch.x, .03, scorch.z); this.dummy.scale.set(scorch.scale * fade, .01, scorch.scale * fade); this.dummy.updateMatrix();
        this.scorchMarks.setMatrixAt(scorch.slot, scorch.age >= scorch.life ? this.zeroMatrix : this.dummy.matrix);
      }
      this.scorches = this.scorches.filter(scorch => scorch.age < scorch.life);
      this.scorchMarks.instanceMatrix.needsUpdate = true;
    }
    this.shake = Math.max(0, this.shake - dt * 1.5);
    const inRun = game.phase !== 'menu', portrait = this.aspect < .85;
    this.targetSpan = (inRun ? Math.max(8.5 + (game.height - 13) * .35, (portrait ? 5.4 : 11 + (game.width - 15) * .55) / this.aspect) : Math.max(10.7, 12.4 / this.aspect)) / (inRun ? this.zoom : 1);
    this.safeClock = (this.safeClock || 0) - dt;
    if (this.safeClock <= 0) { this.safeClock = .25; this.readSafeArea(); }
    this.cameraSpan = this.reducedMotion ? this.targetSpan : THREE.MathUtils.damp(this.cameraSpan, this.targetSpan, 3.5, dt);
    this.frameCamera();
    const follow = inRun ? portrait ? .88 : Math.min(.65, Math.max(0, this.zoom - 1) * 1.8) : 0;
    this.cameraFocus.x = THREE.MathUtils.damp(this.cameraFocus.x, px * follow, 4, dt); this.cameraFocus.z = THREE.MathUtils.damp(this.cameraFocus.z, pz * follow, 4, dt);
    this.camera.position.set(this.cameraFocus.x + 10 + (Math.random() - .5) * this.shake, 19, this.cameraFocus.z + 15 + (Math.random() - .5) * this.shake);
    this.camera.lookAt(this.cameraFocus.x, -.1, this.cameraFocus.z); this.camera.updateMatrixWorld();
    this.renderer.info.reset(); this.composer.render();
  }
  setQuality(high) {
    this.quality = high; this.renderer.setPixelRatio(high ? Math.min(window.devicePixelRatio, 1.6) : 1); this.renderer.shadowMap.enabled = high; this.bloom.enabled = high;
    this.atmosphere.apply(this.style, { ...this.arenaSize, reducedMotion: this.reducedMotion, quality: high });
    if (!high) { for (const scorch of this.scorches) this.scorchMarks.setMatrixAt(scorch.slot, this.zeroMatrix); this.scorches = []; this.scorchMarks.instanceMatrix.needsUpdate = true; }
    this.resize();
  }
  animateBoss(event) {
    const boss = this.game.boss;
    if (event.type === 'boss' && boss) this.ensureObject(boss.id, () => this.makeEnemy('boss', boss.variant), boss);
    const obj = this.objects.get(event.id ?? boss?.id), actor = obj?.userData.actor;
    if (!actor) return;
    if (event.type === 'enemyHit') actor.play('Hit', { priority: 60 });
    if (event.type === 'warning') actor.prepare(event.duration);
    if (event.type === 'bossEnraged') actor.play('Enrage', { priority: 70 });
    if (event.type === 'bossStagger') actor.stagger();
    if (event.type === 'bossImpact') actor.impact();
    if (event.type === 'bossDefeated') {
      actor.play('Death', { priority: 100, hold: true });
      obj.userData.retireTime = actor.clips.get('Death').duration;
      this.objects.delete(event.id); this.retiredBoss = obj;
    }
  }
}
