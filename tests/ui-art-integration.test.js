import test from 'node:test';
import assert from 'node:assert/strict';
import { Refuge } from '../src/refuge.js';
import { normalizeMeta, TALENTS, GEAR, CONTRACTS, OUTFITS, useOutfit } from '../src/legacy.js';
import { ENEMY_NAMES } from '../src/campaign.js';
import { pixelIcon, portraitArt } from '../src/pixel-art.js';

test('refuge renders each entity with its own approved art and preserves action IDs', () => {
  const meta=normalizeMeta();
  const refuge=new Refuge(meta,{avatar:portraitArt(meta.outfit),icon:pixelIcon});
  for(const [method, items, prefix, action] of [
    ['talents',TALENTS,'talent','talent'],
    ['contracts',CONTRACTS,'contract','contract'],
    ['outfits',OUTFITS,'outfit','outfit']
  ]) {
    const html=refuge[method]();
    for(const {id} of items) {
      assert(html.includes(`data-pixel-art="${prefix}-${id}"`), `${prefix} ${id} has its specific art`);
      assert(html.includes(`data-${action}="${id}"`), `${prefix} ${id} retains its action`);
    }
  }
  for(const slot of ['core','boots','charm']) {
    refuge.slot=slot;
    const html=refuge.gear();
    for(const {id} of GEAR.filter(g=>g.slot===slot)) assert(html.includes(`data-pixel-art="gear-${id}"`));
  }
  for(const id of Object.keys(ENEMY_NAMES)) assert(refuge.bestiary().includes(`data-pixel-art="enemy-${id}"`));
});

test('selecting an owned outfit updates the portrait without changing resources or prepared equipment', () => {
  const meta=normalizeMeta({outfits:OUTFITS.map(o=>o.id)});
  const refuge=new Refuge(meta,{avatar:portraitArt(meta.outfit),icon:pixelIcon});
  const before=JSON.stringify({shards:meta.shards,scrap:meta.scrap,cores:meta.cores,loadout:meta.loadout});
  for(const {id} of OUTFITS) {
    useOutfit(meta,id);
    assert(refuge.html().includes(`data-pixel-art="portrait-${id}"`));
    assert.equal(JSON.stringify({shards:meta.shards,scrap:meta.scrap,cores:meta.cores,loadout:meta.loadout}),before);
  }
});
