import test from 'node:test';
import assert from 'node:assert/strict';
import { Sound } from '../src/audio.js';
import { Refuge } from '../src/refuge.js';
import { normalizeMeta, GEAR } from '../src/legacy.js';
import { SKILLS } from '../src/skills.js';
import { REFUGE_EN } from '../src/refuge-en.js';
import { setLocale, t } from '../src/i18n.js';

test('the selected refuge track survives reload without touching progression or ranking', () => {
  const store = new Map([['bomb-rift-v1','existing progress'],['bomb-rift-ranking-v1','existing scores']]);
  const original = Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>store.get(key),setItem:(key,value)=>store.set(key,value)}});
  try {
    const tracks=[{id:'violet'},{id:'sentinel'}];
    const sound=new Sound({refugeTracks:tracks});
    assert.equal(sound.refugeTrack,'violet'); sound.selectRefugeTrack('sentinel'); sound.volume=.23; sound.save();
    const reloaded=new Sound({refugeTracks:tracks}); assert.equal(reloaded.refugeTrack,'sentinel'); assert.equal(reloaded.volume,.23);
    assert.equal(reloaded.selectRefugeTrack('not-a-track'),false); assert.equal(reloaded.refugeTrack,'sentinel');
    reloaded.selectRefugeTrack(''); reloaded.save(); assert.equal(new Sound({refugeTracks:tracks}).refugeTrack,'');
    assert.equal(store.get('bomb-rift-v1'),'existing progress'); assert.equal(store.get('bomb-rift-ranking-v1'),'existing scores');
  } finally { if(original)Object.defineProperty(globalThis,'localStorage',original);else delete globalThis.localStorage; }
});

test('the bag displays owned equipment, keeps its filter when changing slots, and never invents unlocks', () => {
  const meta=normalizeMeta(),before=JSON.stringify(meta),refuge=new Refuge(meta,{avatar:'',icon:()=>''});refuge.tab='inventory';
  for (const slot of ['core','boots','charm']) {
    refuge.act({dataset:{refugeSlot:slot}});assert.equal(refuge.tab,'inventory');
    const markup=refuge.gear(true);
    for(const item of GEAR.filter(g=>g.slot===slot))assert.equal(markup.includes(`data-gear="${item.id}"`),meta.gear.includes(item.id));
  }
  assert.equal(JSON.stringify(meta),before);
});

test('the production grimoire explains all real skills without granting demo upgrades', () => {
  const meta=normalizeMeta(),refuge=new Refuge(meta,{avatar:'',icon:()=>''}),markup=refuge.skills();
  for(const skill of SKILLS) { assert(markup.includes(skill.name)); if(skill.mastery)assert(markup.includes(skill.awakening)); }
  assert.equal((markup.match(/<article/g)||[]).length,16);assert(!markup.includes('data-train'));assert(!markup.includes('data-skill='));
});

test('refuge labels and activity dialogue have authored English including whole taunt labels', () => {
  setLocale('en');
  for(const [pt,en] of Object.entries(REFUGE_EN))assert.equal(t(pt),en,pt);
  setLocale('pt-BR');
});
