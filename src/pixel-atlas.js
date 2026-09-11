import { difficultyPicker } from './expedition-ui.js';
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
      if (b.dataset.difficulty) { if(game.setDifficulty(b.dataset.difficulty)){this.selected=1;this.render();this.root.dispatchEvent(new CustomEvent('difficulty-change',{bubbles:true}));} return; }
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
    const stages=[0,1,2].map(i=>stageFor(start+i)),locked=s.number!==unlocked;
    this.root.style.setProperty('--world-color',w.color);
    const lives = this.game.expedition?.ended ? 1 : this.game.lives, points = this.game.expedition?.ended ? 0 : this.game.expeditionScore;
    // Titulo, status e dificuldade moravam em tres faixas empilhadas. Viraram uma
    // barra: o status usa icones no lugar dos rotulos, que ja se explicavam sozinhos.
    setHTML(this.root,`<div class="pixel-window atlas-window"><header class="window-heading"><div><small>O ATLAS DAS FENDAS</small><h1>Escolha seu destino</h1></div>${difficultyPicker(this.game)}<div class="atlas-status"><span title="Vidas restantes nesta tentativa">${art('ui-HeartPulse')}<b>${lives}</b></span><span title="Pontuação acumulada">${art('ui-Trophy')}<b>${points}</b></span><span title="Fase liberada">${art('part-compass')}<b>${unlocked}<small>/18</small></b></span></div><button class="square" data-action="home" aria-label="Voltar ao refúgio">${art('ui-X')}</button></header>
      <nav class="world-tabs" aria-label="Mundos">${WORLDS.map((world,i)=>`<button data-world="${i}" class="${i===s.worldIndex?'active':''}" aria-pressed="${i===s.worldIndex}">${art('map-'+world.id)}<span>${world.name}<i class="world-pips" aria-label="${Math.min(3,Math.max(0,unlocked-1-s.cycle*CAMPAIGN_LENGTH-i*3))} de 3 fendas">${[0,1,2].map(p=>`<i class="${p<Math.min(3,Math.max(0,unlocked-1-s.cycle*CAMPAIGN_LENGTH-i*3))?'done':''}"></i>`).join('')}</i></span>${s.cycle*CAMPAIGN_LENGTH+i*3+1>unlocked?art('ui-LockKeyhole'):''}</button>`).join('')}</nav>
      <div class="map-layout"><div class="map-canvas">${art('map-'+w.id,'island')}<svg class="map-route" viewBox="0 0 500 365" preserveAspectRatio="none" aria-hidden="true"><path d="M95 235 Q165 270 241 180 T400 120" fill="none" stroke="#281c35" stroke-width="14"/><path d="M95 235 Q165 270 241 180 T400 120" fill="none" stroke="#e9c998" stroke-width="3" stroke-dasharray="6 7"/></svg>${stages.map(st=>`<button class="node ${st.number===s.number?'selected':''} ${st.number<unlocked?'done':''} ${st.number>unlocked?'locked':''}" data-stage="${st.number}" aria-pressed="${st.number===s.number}" aria-label="Fase ${st.number}: ${st.name}${st.number>unlocked?', bloqueada, ver prévia':''}"><span>${st.number<unlocked?'✓':String(st.number).padStart(2,'0')}</span>${st.number>unlocked?art('ui-LockKeyhole','node-lock'):''}<small>${st.name}</small></button>`).join('')}</div>
      <aside class="boss-side"><div class="boss-preview">${art('guardian-'+w.id,'boss-fallback')}</div><div class="boss-title"><small>${w.title}</small><h2>${w.boss}</h2><p>“${w.quote}”</p><div class="boss-tags"><span title="Dois minutos de horda antes do guardião">${art('part-timer')}2 MIN</span><span title="Tamanho da arena">${art('part-compass')}${s.width}×${s.height}</span><span title="${s.miniboss?'Um minichefe aparece aos 60 segundos':'Horda seguida do guardião'}">${art('ui-Skull')}${s.miniboss?'MINICHEFE 60s':'HORDA'}</span></div><button class="text-button" data-taunt>Provocar o guardião ↗</button></div></aside></div>
      <div class="mission-tactics"><p><b>COMO O GUARDIÃO ATACA</b>${w.bossAttack}</p><p><b>DESAFIO DO MUNDO</b>${w.mechanic}</p><div class="map-loot">${w.loot.map(id=>{const r=relicById(id);return `<span title="${r.name}: ${r.desc}">${skillArt('relic-'+id)}</span>`;}).join('')}</div></div>
      <div class="stage-summary"><div><small>FASE ${String(s.number).padStart(2,'0')} · ${locked?'BLOQUEADA':s.number<unlocked?'CONQUISTADA':'DISPONÍVEL'}</small><h3>${s.name}</h3><p>${s.description}</p><p class="map-reward">VITÓRIA · +${s.reward} ESSÊNCIAS + 1 NÚCLEO</p></div><button class="primary-button" data-action="start" ${locked?'disabled':''}>${locked?`PRÓXIMO DESTINO · ${unlocked}`:'ENTRAR NA FENDA'} →</button></div>
      <footer class="map-footer"><span>Skills e relíquias duram uma fase. Seu legado permanece.</span><div><small>6 MUNDOS · 18 FASES</small></div></footer></div>`);
    this.icons();
  }
}
