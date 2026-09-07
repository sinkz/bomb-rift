// Bosses commit to attacks instead of borrowing the horde's evasive AI.
const DIRS = [[0,-1],[1,0],[0,1],[-1,0]];
function moveBoss(game, b, step) {
  b.facing = [step.x-b.x,step.z-b.z]; Object.assign(b,step);
  b.cooldown = (b.enraged ? .42 : .58) * (b.slow ? 1.8 : 1) / game.challenge.speed;
  game.emit('bossStep',{id:b.id,x:b.x,z:b.z});
}
export function updateBossAI(game, dt) {
  const b = game.boss; if (!b) return;
  b.cooldown -= dt;
  for (const key of ['hitFlash','slow','frozen','stagger','castTimer','recovery']) b[key] = Math.max(0,(b[key] || 0)-dt);
  if (b.stagger || b.frozen) { b.intent = 'stagger'; return; }
  if (b.entranceTimer > 0) {
    b.entranceTimer = Math.max(0,b.entranceTimer-dt);
    b.intent = 'spawn';
    if (!b.entranceTimer) game.openBossArena();
    return;
  }
  if (b.castTimer || b.recovery) { b.intent = b.castTimer ? 'cast' : 'recover'; return; }
  b.intent = 'hunt';
  if (b.cooldown > 0) return;
  // Ignore predicted explosions: the boss remains baitable into player bombs.
  const step = game.pathStep(b,game.player,new Map());
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
      game.emit('warning',{id:b.id,cells:[next],duration,name:'RUPTURA'});
    }
  }
  if(b.x===game.player.x&&b.z===game.player.z)game.hurt(24);
}
