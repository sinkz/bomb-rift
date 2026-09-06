import { HeroWalk, sampleStroll } from '../mockups/refuge/hero-walk.js';
import { setText } from './i18n.js';

export function refugeLife(root) {
const $ = selector => root.querySelector(selector);
const toast = message => setText($('#hero-thought'), message);
let requestedActivity=null,activityChoice=0;
function invite(pose){const garden=pose==='birds'||pose==='water';requestedActivity={x:garden?48:60,y:garden?70:59,pose,facing:'front',thought:{birds:'Ei, pequenino. Pode vir!',read:'Escolheu uma boa história!',sleep:'Tá bom... só cinco minutinhos.',water:'Cresce, pequena.'}[pose],duration:pose==='sleep'?10:8,localTime:0};}
// Facing the camera toward the flowers; showing the back on the return.
const heroNode=$('#hero'), heroSkin=$('#hero-sprite'), heroThought=$('#hero-thought');
const heroCanvas=document.createElement('canvas');heroCanvas.className='hero-walk-canvas';heroSkin.append(heroCanvas);
const heroAnimator=new HeroWalk(heroCanvas);
heroAnimator.ready.then(()=>heroNode.classList.add('sprite-ready')).catch(()=>toast('Não foi possível carregar a animação do refúgio.'));
let strollTime=0,lastHeroTime=0,heroX=60,heroY=59,stridePhase=0,gaitWeight=0,lastFacing='front';
function frame(now, reduced = false){
  const dt=lastHeroTime?Math.min(.05,(now-lastHeroTime)/1000):0;lastHeroTime=now;
  if(reduced){const pose=requestedActivity?.pose||'idle';heroNode.dataset.walking='false';heroAnimator.draw({pose,activityTime:3,time:0});heroNode.dataset.pose=pose;setText(heroThought,requestedActivity?.thought||'Uma pausa tranquila.');return;}
  if(!requestedActivity)strollTime+=dt;
  const state=requestedActivity||sampleStroll(strollTime);
  const {x,y,thought}=state;
  const oldX=heroX,oldY=heroY,blend=1-Math.exp(-10*dt);
  heroX+=(x-heroX)*blend;heroY+=(y-heroY)*blend;
  const mobile=matchMedia('(max-width:700px)').matches,size=heroNode.offsetWidth;
  const dx=(heroX-oldX)*$('#hub').clientWidth/100*(mobile?.9:1);
  const dy=(heroY-oldY)*$('#hub').clientHeight/100*(mobile?.7:1);
  const distance=Math.hypot(dx,dy),speed=dt?distance/dt:0;
  stridePhase+=distance/(size*(22/.6)/128)*Math.PI*2;
  const targetWeight=Math.min(1,speed/(size*.19));gaitWeight+=(targetWeight-gaitWeight)*(1-Math.exp(-14*dt));
  const walking=gaitWeight>.055;
  if(Math.abs(dy)>.005)lastFacing=dy<0?'back':'front';
  heroNode.dataset.walking=String(walking);
  let viewX=heroX,viewY=heroY;if(mobile){viewY=51+(heroY-59)*.7;viewX=45+(heroX-48)*.9;}
  heroNode.style.left=viewX+'%';heroNode.style.top=viewY+'%';
  heroSkin.style.transform='';
  heroAnimator.draw({phase:stridePhase,weight:gaitWeight,facing:walking?lastFacing:state.facing,pose:walking?'walk':state.pose==='walk'?'idle':state.pose,time:requestedActivity?state.localTime:strollTime,activityTime:state.localTime||0,duration:state.duration||8});
  heroNode.dataset.pose=heroCanvas.dataset.pose;
  setText(heroThought,thought);
  if(requestedActivity&&!walking){requestedActivity.localTime+=dt;if(requestedActivity.localTime>=requestedActivity.duration){strollTime=requestedActivity.x===48?20:48;requestedActivity=null;}}
}
return { frame, invite, next() { const poses=['birds','read','sleep']; invite(poses[activityChoice++ % poses.length]); } };
}
