import { passoDeCerco, querArremessar, arremessar, toqueDoGuardiao, intencaoDe } from './boss-intent.js';

// Bosses commit to attacks instead of borrowing the horde's evasive AI.
const DIRS = [[0,-1],[1,0],[0,1],[-1,0]];
const distance = (a,b) => Math.abs(a.x-b.x)+Math.abs(a.z-b.z);
function moveBoss(game, b, step) {
  b.facing = [step.x-b.x,step.z-b.z]; Object.assign(b,step);
  b.cooldown = (b.enraged ? .42 : .58) * (b.slow ? 1.8 : 1) / game.challenge.speed;
  // Distance is the guardian's real enemy: a player kiting across the arena
  // gets closed down instead of being followed at a polite constant pace.
  if ((b.phase || 1) >= 2 && distance(b,game.player) > 6) b.cooldown *= .72;
  game.emit('bossStep',{id:b.id,x:b.x,z:b.z});
}
function freeSteps(game, b) {
  return DIRS.map(([dx,dz]) => ({x:b.x+dx,z:b.z+dz})).filter(c => game.walkable(c.x,c.z,b) && !game.occupied(c.x,c.z,b));
}
export function updateBossAI(game, dt, hazards = null) {
  const b = game.boss; if (!b) return;
  b.cooldown -= dt;
  for (const key of ['hitFlash','slow','frozen','stagger','castTimer','recovery','dodgeCooldown','throwCooldown']) b[key] = Math.max(0,(b[key] || 0)-dt);
  if (b.stagger || b.frozen) { b.intent = 'stagger'; return; }
  if (b.entranceTimer > 0) {
    b.entranceTimer = Math.max(0,b.entranceTimer-dt);
    b.intent = 'spawn';
    if (!b.entranceTimer) game.openBossArena();
    return;
  }
  if (b.castTimer || b.recovery) { b.intent = b.castTimer ? 'cast' : 'recover'; return; }
  // Backing off is part of the choreography: a guardian that just committed to
  // an attack centred on itself needs the player at arm's length to threaten.
  if (b.retreat > 0) {
    // The retreat clock only runs once the guardian is free to walk again, so a
    // long cast never eats the repositioning it was supposed to buy.
    b.retreat = Math.max(0, b.retreat - dt);
    b.intent = 'reposition';
    if (b.cooldown > 0) return;
    const away = freeSteps(game,b).filter(c => distance(c,game.player) > distance(b,game.player)).sort((a,c) => distance(c,game.player)-distance(a,game.player))[0];
    if (away) { moveBoss(game,b,away); game.emit('bossReposition',{id:b.id,x:b.x,z:b.z}); return; }
    b.retreat = 0;
  }
  b.intent = 'hunt';
  if (b.cooldown > 0) return;
  // Kite eterno passa a custar caro. E golpe telegrafado como qualquer outro.
  if (querArremessar(game, b) && arremessar(game, b)) return;
  // Late guardians in fury flinch away from a fuse about to reach them, but only
  // once every few seconds: baiting a boss onto a bomb stays the core counter-play.
  if ((b.phase || 1) >= 2 && game.round >= 7 && b.dodgeCooldown <= 0) {
    const map = hazards || game.dangerMap(), fuse = map.get(`${b.x},${b.z}`);
    if (fuse !== undefined && fuse < .6) {
      const shelter = freeSteps(game,b).filter(c => (map.get(`${c.x},${c.z}`) ?? Infinity) > 1.2).sort((a,c) => distance(a,game.player)-distance(c,game.player))[0];
      if (shelter) { b.dodgeCooldown = 5; moveBoss(game,b,shelter); game.emit('bossDodge',{id:b.id,x:b.x,z:b.z}); return; }
    }
  }
  // Ignore predicted explosions: the boss remains baitable into player bombs.
  // A partir do ato que a dificuldade manda, ele prefere o passo que FECHA
  // saidas ao passo que encurta distancia. Caminho minimo vira desempate.
  const regra = intencaoDe(game);
  const cerco = (b.phase || 1) >= regra.cerco ? passoDeCerco(game, b) : null;
  const step = cerco || game.pathStep(b,game.player,new Map());
  if (step) {
    moveBoss(game,b,step);
  } else {
    // A fresh crate blockade cannot strand a boss permanently. Break one
    // obstruction toward the player, with a visible warning and no instant hit.
    const queue=[{x:b.x,z:b.z,first:null}], seen=new Set([`${b.x},${b.z}`]);
    let next;
    while(queue.length) {
      const c=queue.shift();
      if(c.x===game.player.x&&c.z===game.player.z){next=c.first;break;}
      for(const [dx,dz] of DIRS) {
        const x=c.x+dx,z=c.z+dz,key=`${x},${z}`;
        if(x<1||z<1||x>=game.width-1||z>=game.height-1||seen.has(key))continue;
        if(game.bombs.some(bomb=>bomb.x===x&&bomb.z===z)||game.occupied(x,z,b))continue;
        seen.add(key);queue.push({x,z,first:c.first||{x,z}});
      }
    }
    b.cooldown=.35;
    if(next && game.walkable(next.x,next.z,b)) {
      // Approach a distant blockade before attempting to break its first tile.
      moveBoss(game,b,next);
    } else if(next && game.tile(next.x,next.z)>0) {
      const duration=1.2;
      b.castTimer=duration;b.intent='cast';b.castTarget=next;
      game.warnings.push({id:game.nextId++,bossId:b.id,cells:[next],duration,timer:duration,breach:true,damage:18});
      game.emit('warning',{id:b.id,cells:[next],duration,name:'RUPTURA',phase:b.phase||1});
    }
  }
  toqueDoGuardiao(game, b, dt);
}
