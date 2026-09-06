import { pixelArt } from './pixel-art.js';
import { refugeArt as art } from './refuge-art.js';
import { setHTML, insertHTML } from './i18n.js';
import { WORLDS, stageFor, relicById, CAMPAIGN_LENGTH } from './campaign.js';
import { skillArt } from './skill-art.js';
import './guardian-atlas.css';

export const bossArt = world => pixelArt('guardian-' + world.id, 'boss-portrait ' + world.id);

export class Atlas {
  constructor(game, { icons, bossSources }) {
    Object.assign(this, { game, icons }); this.selected=Math.max(1,game.meta.unlockedStage||1);
    insertHTML(document.querySelector('#app'),'beforeend','<section id="atlas" class="pixel-atlas" aria-label="Mapa dos mundos" hidden></section>');
    this.root=document.querySelector('#atlas');
    this.root.addEventListener('click',e=>{
      const b=e.target.closest('button'); if(!b||b.disabled)return;
      if(b.hasAttribute('data-taunt')) { const portrait=this.root.querySelector('.boss-preview'); portrait.classList.remove('taunting'); void portrait.offsetWidth; portrait.classList.add('taunting'); this.root.dispatchEvent(new CustomEvent('guardian-taunt',{bubbles:true})); return; }
      const kind=['stage','world','cycle'].find(key=>b.dataset[key]!==undefined); if(!kind)return;
      if(kind==='stage')this.selected=Number(b.dataset.stage);
      if(kind==='world') {const first=this.stage.cycle*CAMPAIGN_LENGTH+Number(b.dataset.world)*3+1;this.selected=Math.min(first+2,Math.max(first,game.meta.unlockedStage));}
      if(kind==='cycle')this.selected=Math.max(1,(this.stage.cycle+Number(b.dataset.cycle))*CAMPAIGN_LENGTH+1);
      const selector=`[data-${kind}="${b.dataset[kind]}"]`;this.render();this.root.querySelector(selector)?.focus({preventScroll:true});
    });
  }
  get stage(){return stageFor(this.selected);}
  hide(){this.root.hidden=true;this.root.inert=true;document.body.classList.remove('in-atlas');}
  show(stage=this.selected){this.selected=stage;this.root.hidden=false;this.root.inert=false;document.body.classList.add('in-atlas');this.render();this.root.querySelector('[data-action="home"]').focus({preventScroll:true});}
  render(){
    const s=this.stage,w=s.world,m=this.game.meta,unlocked=Math.max(1,m.unlockedStage),start=s.cycle*CAMPAIGN_LENGTH+s.worldIndex*3+1;
    const stages=[0,1,2].map(i=>stageFor(start+i)),locked=s.number>unlocked;
    this.root.style.setProperty('--world-color',w.color);
    setHTML(this.root,`<div class="pixel-window atlas-window"><header class="window-heading"><div><small>O ATLAS DAS FENDAS · ASCENSÃO ${s.cycle+1}</small><h1>Escolha seu destino</h1></div><button class="square" data-action="home" aria-label="Voltar ao refúgio">${art('ui-X')}</button></header>
      <nav class="world-tabs" aria-label="Mundos">${WORLDS.map((world,i)=>`<button data-world="${i}" class="${i===s.worldIndex?'active':''}" aria-pressed="${i===s.worldIndex}">${art('map-'+world.id)}<span>${world.name}<small>${Math.min(3,Math.max(0,unlocked-1-s.cycle*CAMPAIGN_LENGTH-i*3))}/3 FENDAS</small></span>${s.cycle*CAMPAIGN_LENGTH+i*3+1>unlocked?art('ui-LockKeyhole'):''}</button>`).join('')}</nav>
      <div class="map-layout"><div class="map-canvas">${art('map-'+w.id,'island')}<svg class="map-route" viewBox="0 0 500 365" preserveAspectRatio="none" aria-hidden="true"><path d="M95 235 Q165 270 241 180 T400 120" fill="none" stroke="#281c35" stroke-width="14"/><path d="M95 235 Q165 270 241 180 T400 120" fill="none" stroke="#e9c998" stroke-width="3" stroke-dasharray="6 7"/></svg>${stages.map(st=>`<button class="node ${st.number===s.number?'selected':''} ${st.number<unlocked?'done':''} ${st.number>unlocked?'locked':''}" data-stage="${st.number}" aria-pressed="${st.number===s.number}" aria-label="Fase ${st.number}: ${st.name}${st.number>unlocked?', bloqueada, ver prévia':''}"><span>${st.number<unlocked?'✓':String(st.number).padStart(2,'0')}</span>${st.number>unlocked?art('ui-LockKeyhole','node-lock'):''}<small>${st.name}</small></button>`).join('')}</div>
      <aside class="boss-side"><div class="boss-preview">${art('guardian-'+w.id,'boss-fallback')}</div><div class="boss-title"><small>${w.title}</small><h2>${w.boss}</h2><p>“${w.quote}”</p><div class="boss-tags"><span>2 MIN + GUARDIÃO</span><span>${s.width} × ${s.height}</span><span>${s.miniboss?'MINICHEFE AOS 60s':'HORDA + GUARDIÃO'}</span></div><button class="text-button" data-taunt>Provocar o guardião ↗</button></div></aside></div>
      <div class="mission-tactics"><p><b>COMO O GUARDIÃO ATACA</b>${w.bossAttack}</p><p><b>DESAFIO DO MUNDO</b>${w.mechanic}</p><div class="map-loot">${w.loot.map(id=>{const r=relicById(id);return `<span title="${r.name}: ${r.desc}">${skillArt('relic-'+id)}</span>`;}).join('')}</div></div>
      <div class="stage-summary"><div><small>FASE ${String(s.number).padStart(2,'0')} · ${locked?'BLOQUEADA':s.number<unlocked?'CONQUISTADA':'DISPONÍVEL'}</small><h3>${s.name}</h3><p>${s.description}</p><p class="map-reward">VITÓRIA · +${s.reward} ESSÊNCIAS + 1 NÚCLEO</p></div><button class="primary-button" data-action="start" ${locked?'disabled':''}>${locked?`CONQUISTE A FASE ${s.number-1}`:s.number<unlocked?'REVISITAR A FENDA':'ENTRAR NA FENDA'} →</button></div>
      <footer class="map-footer"><span>Skills e relíquias duram uma fase. Seu legado permanece.</span><div><button class="square" data-cycle="-1" aria-label="Ascensão anterior" ${s.cycle===0?'disabled':''}>←</button><small>CICLO ${s.cycle+1}</small><button class="square" data-cycle="1" aria-label="Próxima ascensão" ${(s.cycle+1)*CAMPAIGN_LENGTH+1>unlocked?'disabled':''}>→</button></div></footer></div>`);
    this.icons();
  }
}
