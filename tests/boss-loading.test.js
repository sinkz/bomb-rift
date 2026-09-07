import test from 'node:test';
import assert from 'node:assert/strict';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { loadBossLibrary } from '../src/boss-models.js';
test('boss loading fetches only requested worlds, shares pending requests and caches completed assets',async t=>{
  const sources={morthos:'/first.glb',vulkar:'/second.glb'},calls=[];
  t.mock.method(GLTFLoader.prototype,'loadAsync',async url=>{calls.push(url);return {scene:{},animations:[]};});
  const [a,b]=await Promise.all([loadBossLibrary(sources,['morthos']),loadBossLibrary(sources,['morthos'])]);
  assert.equal(a,b);assert.deepEqual(calls,['/first.glb']);assert.equal(a.has('ruins'),true);assert.equal(a.has('forge'),false);
  await loadBossLibrary(sources,['vulkar']);await loadBossLibrary(sources,['morthos']);assert.deepEqual(calls,['/first.glb','/second.glb']);assert.equal(a.has('forge'),true);
});
test('a failed boss asset can retry without poisoning the library cache',async t=>{
  const sources={morthos:'/retry.glb'};let tries=0;
  t.mock.method(GLTFLoader.prototype,'loadAsync',async()=>{if(!tries++)throw Error('offline');return {scene:{},animations:[]};});
  await assert.rejects(loadBossLibrary(sources,['morthos']),/offline/);
  const library=await loadBossLibrary(sources,['morthos']);assert.equal(library.has('ruins'),true);assert.equal(tries,2);
});
