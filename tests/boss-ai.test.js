import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,seededRandom} from '../src/game.js';
const setup=(stage=1)=>{
  const g=new Game({random:seededRandom(13),meta:{unlockedStage:18}});g.start(stage);
  g.enemies=[];g.pickups=[];g.spawnClock=Infinity;g.hazardClock=Infinity;
  g.player.invincible=999;g.spawnBoss();g.spawnClock=Infinity;g.drainEvents();return g;
};
const advance=(g,t)=>{for(let s=0;s<t;s+=.05)g.tick(.05);};
test('all bosses announce an entrance transformation then reach a player behind intact crates',()=>{
  for(const stage of [1,4,7,10,13,16]) {
    const g=setup(stage), b=g.boss, initial=Math.abs(b.x-g.player.x)+Math.abs(b.z-g.player.z);
    for(const [dx,dz]of [[0,-1],[1,0],[0,1],[-1,0]])g.grid[b.z+dz][b.x+dx]=2;
    advance(g,1.25);const w=g.warnings.find(w=>w.rite);
    assert(w && w.duration>=2);assert.equal(w.damage,0);
    assert.equal(g.reachableWithin(b,g.player,100),false);
    advance(g,2.5);assert(g.reachableWithin(b,g.player,100));
    assert(g.anchors.length>0);
    advance(g,12);
    assert(g.drainEvents().some(e=>e.type==='bossStep'&&Math.abs(e.x-g.player.x)+Math.abs(e.z-g.player.z)<initial),`stage ${stage} pursues`);
    assert(g.grid[0].every(t=>t===1));assert(g.grid.at(-1).every(t=>t===1));
  }
});
test('boss commits to the warned position, stops walking, then gives a recovery window',()=>{
  const g=setup(),b=g.boss;b.entranceTimer=0;
  for(let z=1;z<g.height-1;z++)for(let x=1;x<g.width-1;x++)g.grid[z][x]=0;
  g.bossAttack();const w=g.warnings.at(-1),cells=structuredClone(w.cells),at={x:b.x,z:b.z};
  g.player.x=1;g.player.z=g.height-2;advance(g,.5);
  assert.deepEqual(w.cells,cells);assert.equal(b.x,at.x);assert.equal(b.z,at.z);
  advance(g,w.timer+.02);assert(b.recovery>0);assert(g.drainEvents().some(e=>e.type==='bossImpact'));
});
test('boss breaks a new blocking tile with warning, never walks through a live bomb',()=>{
  const g=setup(),b=g.boss;b.entranceTimer=0;b.cooldown=0;b.attackCooldown=99;
  for(const [dx,dz]of [[0,-1],[1,0],[0,1],[-1,0]])g.grid[b.z+dz][b.x+dx]=2;
  g.tick(.05);const w=g.warnings.find(w=>w.breach);assert(w);assert.equal(g.tile(w.cells[0].x,w.cells[0].z),2);
  advance(g,1.3);assert.equal(g.tile(w.cells[0].x,w.cells[0].z),0);
  const c=w.cells[0];g.bombs=[{id:900,x:c.x,z:c.z,fuse:50,range:1}];
  b.cooldown=0;b.recovery=0;g.tick(.05);assert(!(b.x===c.x&&b.z===c.z));
});
test('breaking an anchor interrupts the pending attack and pause freezes boss decisions',()=>{
  const g=setup(),b=g.boss;b.entranceTimer=0;g.bossAttack();
  g.anchors=[{id:999,x:2,z:1,hp:1,life:16}];
  g.applyFlame({cells:[{x:2,z:1}],damage:2,hit:new Set(),enemy:false});
  assert.equal(b.stagger,4);assert.equal(b.castTimer,0);assert(!g.warnings.some(w=>w.bossId===b.id));
  g.pause();const snapshot=structuredClone(b);g.tick(10);assert.deepEqual(b,snapshot);
});

test('boss approaches a distant barrier, warns before breaking it and resumes pursuit',()=>{
  const g=setup(),b=g.boss;
  for(let z=1;z<g.height-1;z++)for(let x=1;x<g.width-1;x++)g.grid[z][x]=x===4?2:0;
  Object.assign(b,{x:7,z:5,entranceTimer:0,attackCooldown:999,cooldown:0});
  Object.assign(g.player,{x:1,z:5});
  advance(g,1.3);
  assert.equal(b.x,5);assert.equal(b.z,5);
  const warning=g.warnings.find(w=>w.breach);
  assert(warning);assert(warning.timer>0);assert.equal(g.tile(4,5),2);
  advance(g,6);
  assert(b.x<4,'boss crosses the opened barrier');assert.equal(g.tile(4,5),0);
  assert(g.grid[0].every(t=>t===1));assert(g.grid.at(-1).every(t=>t===1));
});

test('barrier planning routes around live bombs and other enemies',()=>{
  for(const obstacle of ['bomb','enemy']) {
    const g=setup(),b=g.boss;
    for(let z=1;z<g.height-1;z++)for(let x=1;x<g.width-1;x++)g.grid[z][x]=x===4?2:0;
    Object.assign(b,{x:7,z:5,entranceTimer:0,attackCooldown:999,cooldown:0});
    Object.assign(g.player,{x:1,z:5});
    if(obstacle==='bomb')g.bombs=[{id:900,x:6,z:5,fuse:50,range:1}];
    else g.enemies=[{id:901,x:6,z:5,type:'slime',hp:10,cooldown:999,stagger:999}];
    advance(g,4);
    const steps=g.drainEvents().filter(e=>e.type==='bossStep');
    assert(steps.length>0);assert(steps.every(e=>e.x!==6||e.z!==5));
  }
});
