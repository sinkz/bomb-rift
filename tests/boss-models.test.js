import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BossLibrary } from '../src/boss-models.js';
import { ArenaScene } from '../src/scene.js';

const names = ['morthos', 'vulkar', 'nyxara'];
const models = new Map(await Promise.all(names.map(async (name, i) => {
  const b = await readFile(new URL(`../src/assets/characters/0${i + 7}-${name}.glb`, import.meta.url));
  return [name, await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '')];
})));
const library = new BossLibrary(models);
const advance = (actor, seconds, options = {}) => { for (let t = 0; t < seconds - 1e-7; t += 1 / 120) actor.update(Math.min(1 / 120, seconds - t), options); };

test('only the three bosses use Blender models; hero, enemies and miniboss stay procedural', () => {
  const factory = { bossModels: library, enemyModels: new Map(), mergeModel: ArenaScene.prototype.mergeModel };
  const player = ArenaScene.prototype.makePlayer.call(factory);
  assert(!player.userData.actor); assert(player.children.every(o => !o.isSkinnedMesh));
  for (const type of ['slime', 'ember', 'beetle', 'wisp', 'sentinel']) {
    const enemy = ArenaScene.prototype.makeEnemy.call(factory, type);
    assert(!enemy.userData.actor, type); assert(enemy.children.every(o => !o.isSkinnedMesh));
  }
  for (const [world, key] of [['ruins', 'morthos'], ['forge', 'vulkar'], ['abyss', 'nyxara']]) {
    const boss = ArenaScene.prototype.makeEnemy.call(factory, 'boss', world);
    assert.equal(boss.userData.actor.key, key); boss.userData.actor.dispose();
  }
});

test('atlas and combat clones share geometry but have independent skeletons and transforms', () => {
  const a = library.create('ruins'), b = library.create('ruins');
  let ma, mb; a.model.traverse(o => { if (o.isSkinnedMesh) ma = o; }); b.model.traverse(o => { if (o.isSkinnedMesh) mb = o; });
  assert.equal(ma.geometry, mb.geometry); assert.notEqual(ma.skeleton, mb.skeleton);
  const pose = mb.skeleton.bones.map(b => b.quaternion.toArray());
  a.root.position.set(3, 0, 5); a.play('Enrage'); advance(a, .6);
  assert.deepEqual(mb.skeleton.bones.map(b => b.quaternion.toArray()), pose);
  assert.deepEqual(a.root.position.toArray(), [3, 0, 5]); a.dispose(); b.dispose();
});

test('all bosses fit the arena and release attacks at the existing warning expiry', () => {
  for (const key of names) for (const duration of [1.15, 1.35, 1.5, 1.7]) {
    const actor = library.create(key); actor.root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(actor.root, true);
    assert(bounds.max.y <= actor.definition.height + .001); assert(bounds.min.y >= -.025);
    actor.prepare(duration); assert.equal(actor.play('Hit', { priority: 60 }), false);
    advance(actor, duration); assert.equal(actor.current.getClip().name, actor.definition.attack);
    assert(Math.abs(actor.current.time - .125) <= 1 / 60); actor.dispose();
  }
});

test('pause holds the animation and a defeated boss plays its death outside the entity map', () => {
  const actor = library.create('forge'); actor.update(.1, { moving: true }); const time = actor.current.time;
  actor.update(0, { moving: true }); assert.equal(actor.current.time, time);
  const view = { objects: new Map([[7, actor.root]]), game: { boss: null }, retiredBoss: null };
  ArenaScene.prototype.animateBoss.call(view, { type: 'bossDefeated', id: 7 });
  assert.equal(view.objects.size, 0); assert.equal(view.retiredBoss, actor.root);
  advance(actor, 2); assert.equal(actor.current.getClip().name, 'Death'); assert(actor.current.paused); actor.dispose();
});
