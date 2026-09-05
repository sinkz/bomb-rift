import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

const definitions = {
  morthos: { height: 2.40, width: 1.95, movement: 'Walk', attack: 'BellSlam' },
  vulkar: { height: 2.40, width: 2.05, movement: 'Walk', attack: 'Eruption' },
  nyxara: { height: 2.60, width: 1.95, movement: 'Float', attack: 'VoidCast' },
};

const loading = new WeakMap();
export function loadBossLibrary(sources) {
  if (!loading.has(sources)) {
    const loader = new GLTFLoader();
    const pending = Promise.all(Object.entries(sources).map(async ([key, url]) => [key, await loader.loadAsync(url)]))
      .then(loaded => new BossLibrary(new Map(loaded)));
    loading.set(sources, pending);
  }
  return loading.get(sources);
}

export class BossLibrary {
  constructor(models) { this.models = models; }
  create(world = 'ruins') {
    const key = { ruins: 'morthos', forge: 'vulkar', abyss: 'nyxara' }[world] || world;
    const gltf = this.models.get(key);
    if (!gltf) throw new Error(`Personagem indisponível: ${key}`);
    return new BossActor(key, gltf, definitions[key]);
  }
}

export class BossActor {
  constructor(key, gltf, definition) {
    this.key = key; this.definition = definition; this.root = new THREE.Group();
    this.model = clone(gltf.scene); this.root.add(this.model); this.root.userData.actor = this;
    this.mixer = new THREE.AnimationMixer(this.model);
    this.clips = new Map(gltf.animations.map(c => [c.name, c]));
    this.current = null; this.shot = null; this.motion = 'Idle'; this.slow = false;
    this.model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
    this.transition('Idle', true, 1, 0); this.mixer.update(0); this.model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(this.model, true), size = bounds.getSize(new THREE.Vector3());
    // Fit the animated silhouette to the existing arena's cell scale.
    this.model.scale.setScalar(Math.min(definition.height / bounds.max.y, definition.width / size.x));
  }
  transition(name, loop, timeScale = 1, fade = .09) {
    const clip = this.clips.get(name); if (!clip) return false;
    const action = this.mixer.clipAction(clip);
    if (this.current !== action) {
      const previous = this.current;
      // Reusing one-shot actions must restore their weight after a previous fade.
      action.reset().setEffectiveWeight(1).setEffectiveTimeScale(timeScale);
      action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
      action.clampWhenFinished = !loop; action.play();
      if (previous && fade) { previous.fadeOut(fade); action.fadeIn(fade); }
      else if (previous) previous.stop();
      this.current = action;
    } else {
      action.setEffectiveTimeScale(timeScale);
    }
    return true;
  }
  play(name, { duration, priority = 40, hold = false, next = null } = {}) {
    const clip = this.clips.get(name);
    if (!clip || (this.shot && this.shot.priority > priority)) return false;
    const seconds = duration ?? clip.duration;
    // Restart repeated hits and bomb placements, including a clamped action.
    if (this.current?.getClip() === clip) { this.current.stop(); this.current = null; }
    this.transition(name, false, clip.duration / Math.max(.01, seconds));
    this.shot = { name, remaining: seconds, priority, hold, next };
    return true;
  }
  prepare(seconds) {
    const attack = this.definition.attack;
    if (!attack) return;
    // Release reaches its impact frame when the existing warning expires.
    this.play('Windup', { duration: Math.max(.05, seconds - .125), priority: 75, next: attack });
  }
  update(dt, { moving = false, slow = false } = {}) {
    this.motion = moving ? this.definition.movement : 'Idle'; this.slow = slow;
    if (!this.shot) this.transition(this.motion, true, slow && moving ? 1 / 1.8 : 1);
    this.mixer.update(dt);
    if (this.shot && !this.shot.hold) {
      this.shot.remaining -= dt;
      if (this.shot.remaining <= 0) {
        const next = this.shot.next; this.shot = null;
        if (next) this.play(next, { priority: 75 });
        else this.transition(this.motion, true, slow && moving ? 1 / 1.8 : 1);
      }
    }
  }
  reset() {
    this.shot = null; this.current = null; this.motion = 'Idle'; this.mixer.stopAllAction();
    this.transition('Idle', true, 1, 0); this.mixer.update(0);
  }
  dispose() {
    this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.model);
    const skeletons = new Set(); this.model.traverse(o => { if (o.isSkinnedMesh) skeletons.add(o.skeleton); });
    for (const skeleton of skeletons) skeleton.dispose();
    this.root.removeFromParent();
  }
}
