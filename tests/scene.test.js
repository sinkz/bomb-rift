import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ArenaScene } from '../src/scene.js';

test('all enemy models merge compatible geometry, including the boss mixed primitives', () => {
  const factory = { enemyModels: new Map(), mergeModel: ArenaScene.prototype.mergeModel };
  for (const type of ['slime', 'ember', 'beetle', 'wisp', 'sentinel', 'boss']) {
    const model = ArenaScene.prototype.makeEnemy.call(factory, type);
    assert(model.children.length > 0);
    for (const mesh of model.children) {
      assert(mesh.geometry.attributes.position.count > 0);
      assert.equal(mesh.geometry.attributes.position.count, mesh.geometry.attributes.normal.count);
      mesh.geometry.computeBoundingSphere();
      assert(Number.isFinite(mesh.geometry.boundingSphere.radius));
      assert(mesh.geometry.boundingSphere.radius > 0);
    }
  }
});

test('enemy clones share geometry but keep independent transforms', () => {
  const factory = { enemyModels: new Map(), mergeModel: ArenaScene.prototype.mergeModel };
  const first = ArenaScene.prototype.makeEnemy.call(factory, 'boss');
  const second = ArenaScene.prototype.makeEnemy.call(factory, 'boss');
  assert.notEqual(first, second); assert.equal(first.children[0].geometry, second.children[0].geometry);
  first.position.set(5, 1, 3); first.scale.setScalar(2);
  assert.equal(second.position.x, 0); assert.equal(second.scale.x, 1);
});

test('destroying an instanced block hides only that block and preserves neighboring instances', () => {
  const view = { static: new THREE.Group(), staticSlots: new Map() };
  const geometry = new THREE.BoxGeometry(), material = new THREE.MeshStandardMaterial();
  const blocks = [new THREE.Group(), new THREE.Group()];
  blocks.forEach((block, i) => { const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = true; block.add(mesh); block.position.set(i * 3, 0, 2); view.static.add(block); });
  ArenaScene.prototype.batchScenery.call(view);
  const first = view.staticSlots.get(blocks[0].children[0].uuid), second = view.staticSlots.get(blocks[1].children[0].uuid);
  assert.equal(first.batch, second.batch); assert.equal(first.batch.count, 2);
  ArenaScene.prototype.removeBlock.call(view, blocks[0]);
  const a = new THREE.Matrix4(), b = new THREE.Matrix4();
  first.batch.getMatrixAt(first.index, a); second.batch.getMatrixAt(second.index, b);
  assert.equal(a.elements[0], 0); assert.equal(a.elements[5], 0); assert.equal(a.elements[10], 0);
  assert.equal(b.elements[0], 1); assert.equal(b.elements[12], 3); assert.equal(b.elements[14], 2);
  assert.equal(view.staticSlots.size, 1);
});
