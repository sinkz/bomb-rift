import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadBossLibrary } from './boss-models.js';

export class BossPreview {
  constructor(sources) {
    this.library = loadBossLibrary(sources); this.ticket = 0; this.visible = false; this.actor = null;
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.4;
    this.canvas = this.renderer.domElement; this.canvas.tabIndex = 0;
    this.canvas.setAttribute('role', 'img');
    this.scene = new THREE.Scene(); this.camera = new THREE.OrthographicCamera(-2, 2, 1.65, -1.65, .01, 50);
    this.camera.position.set(3.1, 2.5, 6); this.camera.lookAt(0, 1.2, 0);
    this.controls = new OrbitControls(this.camera, this.canvas); this.controls.target.set(0, 1.2, 0);
    this.controls.enablePan = false; this.controls.enableZoom = false; this.controls.enableDamping = true;
    this.controls.minPolarAngle = .65; this.controls.maxPolarAngle = 1.6; this.controls.update();
    const room = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(room, .08); this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = .55; room.dispose(); pmrem.dispose();
    this.scene.add(new THREE.HemisphereLight(0xd5d6ff, 0x44364b, 2));
    const key = new THREE.DirectionalLight(0xffdec4, 3.5); key.position.set(-3, 5, 4); this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xafc9ff, 2); fill.position.set(3, 2, 3); this.scene.add(fill);
    this.rim = new THREE.DirectionalLight(0xc4a0ff, 4); this.rim.position.set(2, 3, -3); this.scene.add(this.rim);
    this.observer = new ResizeObserver(() => this.resize());
    this.canvas.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); if (this.actor) this.actor.root.rotation.y += e.key === 'ArrowLeft' ? -.2 : .2; }
      if (e.code === 'Space') { e.preventDefault(); this.taunt(); }
    });
    this.library.catch(error => { console.error('Prévia dos guardiões:', error); this.mount?.setAttribute('data-state', 'unavailable'); });
  }
  attach(mount, world) {
    this.observer.disconnect(); this.mount = mount; mount.append(this.canvas); this.observer.observe(mount);
    this.canvas.setAttribute('aria-label', `${world.boss}, ${world.title}. Arraste ou use as setas para girar. Espaço para provocar.`);
    this.resize(); this.setVisible(true);
    if (world.id === this.world && this.actor) { mount.dataset.state = 'ready'; return; }
    this.world = world.id; const ticket = ++this.ticket; mount.dataset.state = 'loading';
    if (this.actor) { this.actor.dispose(); this.actor = null; }
    this.library.then(library => {
      if (ticket !== this.ticket) return;
      this.actor = library.create(world.guardian || world.id); this.scene.add(this.actor.root); this.rim.color.set(world.color);
      this.camera.position.set(3.1, 2.5, 6); this.controls.target.set(0, 1.2, 0); this.controls.update();
      this.actor.play('Taunt'); this.mount.dataset.state = 'ready'; this.resize();
    }).catch(() => { if (ticket === this.ticket) this.mount.dataset.state = 'unavailable'; });
  }
  taunt() { this.actor?.play('Enrage'); this.manualUntil = performance.now() + 1600; }
  resize() {
    if (!this.mount) return;
    const { width, height } = this.mount.getBoundingClientRect(); if (!width || !height) return;
    const aspect = width / height, span = Math.max(1.55, 1.25 / aspect);
    this.camera.left = -span * aspect; this.camera.right = span * aspect; this.camera.top = span; this.camera.bottom = -span;
    this.camera.updateProjectionMatrix(); this.renderer.setSize(width, height, false);
  }
  setVisible(visible) {
    this.visible = visible; this.last = performance.now();
    this.renderer.setAnimationLoop(visible ? now => {
      const dt = Math.min(.05, (now - this.last) / 1000); this.last = now;
      if (document.hidden) return;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('reduced-motion');
      this.actor?.update(reduced && !(now < this.manualUntil) ? 0 : dt);
      this.controls.update(); this.renderer.render(this.scene, this.camera);
    } : null);
  }
  inspect() { return { world: this.world, model: this.actor?.key, animation: this.actor?.current?.getClip().name, visible: this.visible, state: this.mount?.dataset.state }; }
}
