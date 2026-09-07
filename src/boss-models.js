import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

const definitions = {
  morthos: { height: 2.40, width: 1.95, movement: 'Walk', attack: 'BellSlam' },
  vulkar: { height: 2.40, width: 2.05, movement: 'Walk', attack: 'FurnaceBurst' },
  nyxara: { height: 2.60, width: 1.95, movement: 'Walk', attack: 'VoidCast' },
  briarok: { height: 2.40, width: 2.40, movement: 'Walk', attack: 'RootBloom' },
  fulgra: { height: 2.40, width: 2.40, movement: 'Walk', attack: 'Discharge' },
  nivor: { height: 2.80, width: 2.40, movement: 'Walk', attack: 'GlacierSlam' },
};

const loading = new WeakMap();
export const bossKeyFor = world => ({ ruins: 'morthos', forge: 'vulkar', abyss: 'nyxara', garden: 'briarok', storm: 'fulgra', frost: 'nivor' }[world] || world);
export function loadBossLibrary(sources, keys = Object.keys(sources)) {
  if (!loading.has(sources)) {
    loading.set(sources, { library: new BossLibrary(new Map()), pending: new Map(), loader: new GLTFLoader() });
  }
  const state = loading.get(sources);
  return Promise.all(keys.map(key => {
    if (state.library.models.has(key)) return;
    if (!state.pending.has(key)) {
      const promise = state.loader.loadAsync(sources[key]).then(model => state.library.models.set(key, model))
        .catch(error => { state.pending.delete(key); throw error; });
      state.pending.set(key, promise);
    }
    return state.pending.get(key);
  })).then(() => state.library);
}

export class BossLibrary {
  constructor(models) { this.models = models; }
  has(world) { return this.models.has(bossKeyFor(world)); }
  create(world = 'ruins') {
    const key = bossKeyFor(world);
    const gltf = this.models.get(key);
    if (!gltf) throw new Error(`Personagem indisponível: ${key}`);
    return new BossActor(key, gltf, definitions[key]);
  }
}

export class BossActor {
  constructor(key, gltf, definition) {
    this.key = key; this.definition = definition; this.root = new THREE.Group();
    this.pose = new THREE.Group(); this.root.add(this.pose);
    this.model = clone(gltf.scene); this.pose.add(this.model); this.root.userData.actor = this;
    this.poseTime=0; this.impactTime=0; this.walkHold=0;
    this.mixer = new THREE.AnimationMixer(this.model);
    this.clips = new Map(gltf.animations.map(c => {
      const clip = c.clone(); clip.name = clip.name.replace(/\.\d+$/, '');
      return [clip.name, clip];
    }));
    this.clips.set('Hit', this.clips.get('Hurt'));
    this.clips.set('Enrage', this.clips.get('Stagger'));
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
      action.stopFading().stopWarping().reset().setEffectiveWeight(1).setEffectiveTimeScale(timeScale);
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
    const seconds = duration ?? (name === this.definition.attack ? .85 : name === 'Hit' ? .24 : name === 'Spawn' ? 1.2 : clip.duration);
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
  impact() { this.impactTime=.4; }
  stagger() { this.shot=null; this.play('Stagger',{duration:4,priority:90}); }
  update(dt, { moving = false, slow = false, casting = false, reducedMotion = false } = {}) {
    this.poseTime+=dt; this.impactTime=Math.max(0,this.impactTime-dt);
    this.walkHold=moving?.24:Math.max(0,this.walkHold-dt); moving=moving||this.walkHold>0;
    const hit=this.impactTime/.4, breath=reducedMotion?0:Math.sin(this.poseTime*3)*.012;
    // Add readable anticipation/recoil above the imported rig without changing it.
    this.pose.scale.set(1+(casting?.045:hit*.09),1+breath-(casting?.06:hit*.12),1+(casting?.045:hit*.09));
    this.pose.rotation.x=reducedMotion?0:casting?-.1:hit*.12;
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
