import * as THREE from 'three';
import { setAttr } from './i18n.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { relicById } from './campaign.js';
import { OUTFITS } from './legacy.js';
import { loadBossLibrary } from './boss-models.js';

const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  round: new RoundedBoxGeometry(1, 1, 1, 2, .09),
  sphere: new THREE.SphereGeometry(1, 16, 12),
  crystal: new THREE.OctahedronGeometry(1),
  cone: new THREE.ConeGeometry(1, 1, 5),
  ring: new THREE.TorusGeometry(1, .035, 6, 48),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
};
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
  constructor(container, game, { reducedMotion = false, bossSources } = {}) {
    this.container = container; this.game = game; this.reducedMotion = reducedMotion; this.time = 0; this.shake = 0;
    this.objects = new Map(); this.blocks = new Map(); this.particles = []; this.pulses = [];
    this.cameraSpan = 10.7; this.targetSpan = 10.7; this.zoom = 1; this.cameraFocus = new THREE.Vector3();
    this.staticSlots = new Map(); this.enemyModels = new Map();
    this.retiredBoss = null; this.bossStatus = bossSources ? 'loading' : 'procedural';
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
    this.scene.add(new THREE.HemisphereLight(0xc5c4ff, 0x35262d, 1.7));
    const sun = new THREE.DirectionalLight(0xffd5a4, 2.8); sun.position.set(-8, 16, 8); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 45 });
    sun.shadow.normalBias = .035; sun.shadow.bias = -.0005; this.scene.add(sun);
    const rim = new THREE.DirectionalLight(0x9572ff, 2.5); rim.position.set(5, 8, -9); this.scene.add(rim);
    const fill = new THREE.PointLight(0xff742f, 18, 15, 2); fill.position.set(-6, 3, 5); this.scene.add(fill);
    this.flashLight = new THREE.PointLight(0xffa04a, 0, 6, 2); this.scene.add(this.flashLight);
    this.static = new THREE.Group(); this.dynamic = new THREE.Group(); this.fx = new THREE.Group();
    this.scene.add(this.static, this.dynamic, this.fx);
    this.playerMesh = this.makePlayer(); this.dynamic.add(this.playerMesh);
    this.addAtmosphere(); this.buildArena();
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(container); this.resize();
    this.bossesReady = bossSources ? loadBossLibrary(bossSources).then(library => {
      this.bossModels = library; this.bossStatus = 'ready';
      const boss = game.boss, previous = boss && this.objects.get(boss.id);
      if (previous) {
        const next = this.makeEnemy('boss', boss.variant);
        next.position.copy(previous.position); next.quaternion.copy(previous.quaternion);
        this.dynamic.remove(previous); this.dynamic.add(next); this.objects.set(boss.id, next);
      }
    }).catch(error => { this.bossStatus = 'fallback'; console.error('Falha ao carregar os guardiões:', error); }) : Promise.resolve();
  }
  at(x, z) { return [x - (this.game.width - 1) / 2, z - (this.game.height - 1) / 2]; }
  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h); this.composer.setSize(w, h);
    this.aspect = w / h;
    this.camera.left = -this.cameraSpan * this.aspect; this.camera.right = this.cameraSpan * this.aspect; this.camera.top = this.cameraSpan; this.camera.bottom = -this.cameraSpan;
    this.camera.updateProjectionMatrix();
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
    const positions = new Float32Array(130 * 3);
    for (let i = 0; i < positions.length; i += 3) { positions[i] = (Math.random() - .5) * 35; positions[i + 1] = Math.random() * 9 - 2; positions[i + 2] = (Math.random() - .5) * 28; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.dust = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xeeb799, size: .038, transparent: true, opacity: .6, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.scene.add(this.dust);
    this.underRing = mesh(this.scene, 'ring', mat(0x321e55, 0x582e9c, 1.3), 0, -1.45, 0, 8.4, 8.4, 8.4, false);
    this.underRing.rotation.x = Math.PI / 2;
  }
  buildArena() {
    this.static.traverse(object => { if (object.isInstancedMesh) object.dispose(); });
    this.staticSlots.clear();
    for (const child of [...this.static.children]) this.static.remove(child);
    this.objects.forEach(o => { o.userData.actor?.dispose(); this.dynamic.remove(o); }); this.objects.clear(); this.blocks.clear();
    if (this.retiredBoss) { this.retiredBoss.userData.actor.dispose(); this.retiredBoss = null; }
    for (const pulse of this.pulses) pulse.mesh.material.dispose();
    this.fx.clear(); this.particles = []; this.pulses = [];
    const biome = this.game.biome, WIDTH = this.game.width, HEIGHT = this.game.height;
    this.dust.material.color.set(biome.crystal); this.underRing.scale.setScalar(WIDTH * .56);
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
    if (type === 'boss' && this.bossModels) {
      const actor = this.bossModels.create(variant);
      actor.play('Spawn', { priority: 20, next: 'Taunt' });
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
  burst(x, z, color, count = 12, force = 3) {
    if (this.reducedMotion) count = Math.min(4, count);
    const [px, pz] = this.at(x, z);
    for (let i = 0; i < count; i++) {
      if (this.particles.length > 220) break;
      const particle = mesh(this.fx, 'box', mat(color, color, .45), px, .35, pz, .065 + Math.random() * .07, undefined, undefined, false);
      this.particles.push({ mesh: particle, vx: (Math.random() - .5) * force, vy: 1 + Math.random() * force, vz: (Math.random() - .5) * force, life: .5 + Math.random() * .5 });
    }
  }
  pulse(x, z, color, size = 2.1, duration = .5) {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const [wx, wz] = this.at(x, z), ring = new THREE.Mesh(G.ring, material);
    ring.rotation.x = Math.PI / 2; ring.position.set(wx, .07, wz); ring.scale.setScalar(.3); this.fx.add(ring);
    this.pulses.push({ mesh: ring, age: 0, duration, size });
  }
  dangerTiles(cells, material, width = .86) {
    const group = new THREE.Group();
    for (const c of cells) { const [x, z] = this.at(c.x, c.z); mesh(group, 'box', material, x, .045, z, width, .015, width, false); }
    return group;
  }
  handle(event) {
    if (event.type === 'arena') this.buildArena();
    this.animateBoss(event);
    if (['bomb', 'dash', 'hurt', 'skill'].includes(event.type)) this.heroAction = { kind: event.type, age: 0, duration: event.type === 'skill' ? .65 : .3 };
    if (event.type === 'arena') { this.heroAction = null; this.skillAura = null; }
    if (event.type === 'start') { this.zoom = 1; this.pulse(this.game.player.x, this.game.player.z, 0xffd58b, 2, .9); }
    if (event.type === 'crate' || event.type === 'clear') { const block = this.blocks.get(`${event.x},${event.z}`); if (block) { this.removeBlock(block); this.blocks.delete(`${event.x},${event.z}`); } if (event.type === 'crate') this.burst(event.x, event.z, 0xb58757, 9); }
    if (event.type === 'explosion' || event.type === 'enemyExplosion' || event.type === 'echo') {
      this.shake = this.reducedMotion ? 0 : .2;
      const color = event.fire === 'azure' ? 0x64d9ff : event.type === 'echo' ? 0xc89aff : event.type === 'explosion' ? 0xffae55 : 0xff4359;
      for (const cell of event.cells) this.burst(cell.x, cell.z, color, 7, 3.5);
      const center = event.x !== undefined ? event : event.cells[0];
      if (center) { this.pulse(center.x, center.z, color, 2.4); const [x, z] = this.at(center.x, center.z); this.flashLight.position.set(x, 1.2, z); this.flashLight.color.set(color); this.flashLight.intensity = this.reducedMotion ? 8 : 35; }
    }
    if (event.type === 'pickup') this.burst(event.x, event.z, ({ heart: 0xff719a, scrap: 0xe6b17f, cores: 0xa6cfff })[event.entityType] || 0x71ffc6, 5, 1.2);
    if (event.type === 'kill') { this.burst(event.x, event.z, event.entityType === 'ember' ? 0xff9756 : 0xb39aff, 17, 4); this.pulse(event.x, event.z, 0xc49aff, .8, .4); }
    if (event.type === 'enemyHit') this.burst(event.x, event.z, 0xffedd0, 4, 1.3);
    if (event.type === 'enemyHeal' || event.type === 'enemyMend') { this.pulse(event.x,event.z,0xabe8c9,.7,.6); this.burst(event.x,event.z,0x9feabf,7,1); }
    if (event.type === 'mimicAwake') { this.burst(event.x,event.z,0xe1ad7c,9,2); this.pulse(event.x,event.z,0xffb274,.8,.7); }
    if (event.type === 'blocked') { this.pulse(event.x,event.z,0xb4eafa,1.2,.6); this.burst(event.x,event.z,0xc7f2ff,10,2); }
    if (event.type === 'webBurst') for (const cell of event.cells) { this.pulse(cell.x,cell.z,0x90dfee,.65,.7); this.burst(cell.x,cell.z,0xb8e9f7,4,1); }
    if (event.type === 'hurt') this.shake = this.reducedMotion ? 0 : .25;
    if (event.type === 'dash') {
      const steps = Math.abs(event.x - event.fromX) + Math.abs(event.z - event.fromZ);
      for (let i = 0; i <= steps; i++) { const x = event.fromX + Math.sign(event.x - event.fromX) * i, z = event.fromZ + Math.sign(event.z - event.fromZ) * i; this.burst(x, z, 0x9affe0, 5, 1); this.pulse(x, z, 0x93ffda, .55, .35); }
    }
    if (event.type === 'chargeTrail') this.burst(event.x, event.z, 0xff9067, 4, 1);
    if (event.type === 'relic' || event.type === 'revive' || event.type === 'relicDrop' || event.type === 'miniboss' || event.type === 'miniDefeated') { this.pulse(event.x,event.z, event.type === 'miniboss' ? 0xff7c52 : 0xa9edff, 2.8, 1); this.burst(event.x,event.z,0xffd88e,26,3); }
    if (event.type === 'skill') {
      const colors = { power: 0xff985c, range: 0xff985c, capacity: 0xb5a0ff, fuse: 0xb5a0ff, health: 0xfb7993, heal: 0xfb7993, vampire: 0xfb7993, speed: 0x72dcc5, dash: 0x72dcc5, magnet: 0x72dcc5 };
      const p = this.game.player, color = colors[event.id]; this.skillAura = { color, life: 1.3 };
      this.pulse(p.x, p.z, color, 1.8, .75); this.pulse(p.x, p.z, color, .9, 1.1); this.burst(p.x, p.z, color, 24, 2.5);
    }
    if (event.type === 'boss' || event.type === 'bossEnraged') { const b = this.game.boss; if (b) { const color = new THREE.Color(this.game.biome.color); this.pulse(b.x, b.z, color, 4, 1.4); this.pulse(b.x, b.z, color, 2.5, .8); this.burst(b.x, b.z, color, 35, 4); this.shake = this.reducedMotion ? 0 : .25; } }
    if (event.type === 'bossDefeated') { this.burst(event.x, event.z, 0xffc778, 80, 8); this.pulse(event.x, event.z, 0xffd695, 5.5, 1.1); this.shake = this.reducedMotion ? 0 : .4; }
  }
  update(dt) {
    if (['paused', 'upgrade'].includes(this.game.phase)) dt = 0;
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
    for (const entity of [...game.enemies, ...(game.boss ? [game.boss] : [])]) {
      live.add(entity.id); const obj = this.ensureObject(entity.id, () => this.makeEnemy(entity.type, entity.variant || game.biome.guardian || game.biome.id), entity); const [x, z] = this.at(entity.x, entity.z);
      const moving = Math.abs(obj.position.x - x) + Math.abs(obj.position.z - z) > .02;
      const damping = entity.chargeSteps > 0 ? 35 : 13;
      obj.position.x = THREE.MathUtils.damp(obj.position.x, x, damping, dt); obj.position.z = THREE.MathUtils.damp(obj.position.z, z, damping, dt);
      const actor = obj.userData.actor;
      obj.position.y = actor ? 0 : Math.abs(Math.sin(t * (entity.type === 'slime' ? 5 : 9) + entity.id)) * (moving ? .12 : .035);
      actor?.update(['paused', 'upgrade', 'menu'].includes(game.phase) ? 0 : dt, { moving: game.active && moving, slow: entity.slow > 0 });
      obj.scale.setScalar((entity.hitFlash > 0 ? 1.15 : 1) * (entity.type === 'sentinel' ? .8 : 1));
      if (entity.type === 'slime' && !this.reducedMotion) { const squash = Math.sin(t * (moving ? 10 : 4) + entity.id) * (moving ? .12 : .045); const hit = entity.hitFlash > 0 ? .16 : 0; obj.scale.set(1 + squash + hit, 1 - squash - hit * .5, 1 + squash + hit); }
      if (entity.type === 'spore' && !this.reducedMotion) { obj.scale.y=1+Math.sin(t*4+entity.id)*.035;obj.rotation.z=moving?Math.sin(t*11+entity.id)*.07:0; }
      if (entity.type === 'weaver' && moving && !this.reducedMotion) { obj.position.y+=Math.sin(t*23)*.025;obj.rotation.z=Math.sin(t*23)*.045; }
      if (entity.type === 'oracle') obj.position.y+=.045+Math.sin(t*3)*.035+(entity.mending>0?.1:0);
      if (entity.type === 'mimic') { obj.position.y=entity.awake&&moving?Math.abs(Math.sin(t*13))*.1:0;obj.rotation.z=entity.awake?Math.sin(t*7)*.025:0; }
      if (entity.type === 'beetle' && moving && !this.reducedMotion) obj.rotation.z = Math.sin(t * 22) * .065;
      if (entity.type === 'wisp') obj.position.y += .17 + Math.sin(t*3+entity.id)*.1;
      if (entity.slow > 0 && Math.sin(t*15+entity.id) > .94) this.burst(entity.x,entity.z,0x86f5ff,1,.3);
      if (moving) obj.rotation.y = Math.atan2(x - obj.position.x, z - obj.position.z);
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
        const group = new THREE.Group(); for (const c of warning.cells) { const [x, z] = this.at(c.x, c.z); mesh(group, 'box', mat(warning.effect === 'snare' ? 0x9cddff : 0xf65a69, warning.effect === 'snare' ? 0x338ad3 : 0xff243b, 1), x, .035, z, .89, .025, .89, false); } return group;
      }, { x: (game.width - 1) / 2, z: (game.height - 1) / 2 });
      obj.visible = true;
      obj.scale.y = 1 + (this.reducedMotion ? 0 : Math.sin(t * 8) * .2);
    }
    for (const [id, obj] of this.objects) if (!live.has(id)) { obj.userData.actor?.dispose(); this.dynamic.remove(obj); this.objects.delete(id); }
    if (this.retiredBoss) {
      const obj = this.retiredBoss, elapsed = ['paused', 'upgrade', 'menu'].includes(game.phase) ? 0 : dt;
      obj.userData.actor.update(elapsed); obj.userData.retireTime -= elapsed;
      if (obj.userData.retireTime <= 0) { obj.userData.actor.dispose(); this.retiredBoss = null; }
    }
    for (const particle of this.particles) {
      particle.life -= dt; particle.vy -= dt * 7;
      particle.mesh.position.x += particle.vx * dt; particle.mesh.position.y += particle.vy * dt; particle.mesh.position.z += particle.vz * dt;
      particle.mesh.rotation.x += dt * 3; particle.mesh.scale.multiplyScalar(Math.exp(-dt * 1.3));
      if (particle.life <= 0) this.fx.remove(particle.mesh);
    }
    this.particles = this.particles.filter(particle => particle.life > 0);
    for (const pulse of this.pulses) {
      pulse.age += dt; const progress = Math.min(1, pulse.age / pulse.duration);
      pulse.mesh.scale.setScalar(.3 + pulse.size * (1 - (1 - progress) ** 2));
      pulse.mesh.material.opacity = (1 - progress) ** 2 * .8;
      if (progress >= 1) { this.fx.remove(pulse.mesh); pulse.mesh.material.dispose(); }
    }
    this.pulses = this.pulses.filter(pulse => pulse.age < pulse.duration);
    this.flashLight.intensity *= Math.exp(-dt * 13);
    if (this.portalRing) this.portalRing.rotation.z = t * .12;
    if (!this.reducedMotion) { this.dust.rotation.y = t * .008; this.underRing.rotation.z = t * .015; }
    this.shake = Math.max(0, this.shake - dt * 1.5);
    const inRun = game.phase !== 'menu', portrait = this.aspect < .85;
    this.targetSpan = (inRun ? Math.max(8.5 + (game.height - 13) * .35, (portrait ? 5.4 : 11 + (game.width - 15) * .55) / this.aspect) : Math.max(10.7, 12.4 / this.aspect)) / (inRun ? this.zoom : 1);
    this.cameraSpan = this.reducedMotion ? this.targetSpan : THREE.MathUtils.damp(this.cameraSpan, this.targetSpan, 3.5, dt);
    this.camera.left = -this.cameraSpan * this.aspect; this.camera.right = this.cameraSpan * this.aspect; this.camera.top = this.cameraSpan; this.camera.bottom = -this.cameraSpan; this.camera.updateProjectionMatrix();
    const follow = inRun ? portrait ? .88 : Math.min(.65, Math.max(0, this.zoom - 1) * 1.8) : 0;
    this.cameraFocus.x = THREE.MathUtils.damp(this.cameraFocus.x, px * follow, 4, dt); this.cameraFocus.z = THREE.MathUtils.damp(this.cameraFocus.z, pz * follow, 4, dt);
    this.camera.position.set(this.cameraFocus.x + 10 + (Math.random() - .5) * this.shake, 19, this.cameraFocus.z + 15 + (Math.random() - .5) * this.shake);
    this.camera.lookAt(this.cameraFocus.x, -.1, this.cameraFocus.z); this.camera.updateMatrixWorld();
    this.renderer.info.reset(); this.composer.render();
  }
  setQuality(high) { this.renderer.setPixelRatio(high ? Math.min(window.devicePixelRatio, 1.6) : 1); this.renderer.shadowMap.enabled = high; this.bloom.enabled = high; this.resize(); }
  animateBoss(event) {
    const boss = this.game.boss;
    if (event.type === 'boss' && boss) this.ensureObject(boss.id, () => this.makeEnemy('boss', boss.variant), boss);
    const obj = this.objects.get(event.id ?? boss?.id), actor = obj?.userData.actor;
    if (!actor) return;
    if (event.type === 'enemyHit') actor.play('Hit', { priority: 60 });
    if (event.type === 'warning') actor.prepare(event.duration);
    if (event.type === 'bossEnraged') actor.play('Enrage', { priority: 70 });
    if (event.type === 'bossDefeated') {
      actor.play('Death', { priority: 100, hold: true });
      obj.userData.retireTime = actor.clips.get('Death').duration;
      this.objects.delete(event.id); this.retiredBoss = obj;
    }
  }
}
