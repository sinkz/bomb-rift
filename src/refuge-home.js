import { setHTML, insertHTML, localeTag, formatNumber } from './i18n.js';
import { stageFor } from './campaign.js';
import { rankInfo } from './legacy.js';
import { refugeArt as art } from './refuge-art.js';
import { refugeLife } from './refuge-life.js';
import './refuge-home.css';

export class LaunchScreen {
  constructor(game, atlas, ranking) {
    Object.assign(this, { game, atlas, ranking });
    insertHTML(document.querySelector('#app'), 'beforeend', '<section id="launch" class="refuge-home" aria-label="Refúgio de Faísca" hidden></section>');
    this.root = document.querySelector('#launch');
    this.root.addEventListener('click', e => {
      if (e.target.closest('#hero-interact')) this.life?.next();
      if (e.target.closest('#water')) this.life?.invite('water');
    });
  }
  show() {
    this.atlas.hide(); this.root.hidden = false; this.root.inert = false;
    document.body.classList.add('in-launch');
    this.atlas.selected = Math.max(1, this.game.meta.unlockedStage || 1);
    this.render(); this.root.querySelector('.next-run button').focus({ preventScroll: true });
  }
  hide() { this.root.hidden = true; this.root.inert = true; document.body.classList.remove('in-launch'); }
  frame(now, reduced) { if (!this.root.hidden) this.life?.frame(now, reduced); }
  render() {
    const m = this.game.meta, rank = rankInfo(m.legacyXp), stage = stageFor(Math.max(1,m.unlockedStage));
    const previousHub = this.root.querySelector('#hub'), previousHero = this.root.querySelector('#hero');
    // Retain the actual scene nodes: opening a menu never restarts the stroll.
    if (previousHero) previousHero.remove();
    setHTML(this.root, `<div id="hub">
      <div class="world"><div class="scenery" aria-hidden="true"></div><div class="portal-light" aria-hidden="true"></div><div class="embers" id="embers" aria-hidden="true"></div></div>
      <div id="hero"><div class="hero-shadow" aria-hidden="true"></div><div id="hero-sprite" aria-hidden="true"></div><button id="hero-interact" class="hero-interact" aria-label="Brincar com Faísca" title="Clique no Faísca: passarinhos, livro ou soneca"></button><span id="hero-thought" aria-hidden="true">Uma pausa. Só uma.</span></div>
      <div class="vignette"></div>
      <header class="top-hud"><button class="playerplate frame" data-action="workshop" aria-label="Abrir build permanente">${art('portrait-'+m.outfit)}<span><small>FAÍSCA <b>NV. ${String(rank.level).padStart(2,'0')}</b></small><strong>${rank.level>=5?'DESBRAVADOR':rank.level>=3?'AVENTUREIRO':'ANDARILHO'}</strong><span class="xp-track"><i style="width:${rank.current/rank.next*100}%"></i></span><em>${rank.current} / ${rank.next} XP</em></span></button>
      <div class="hub-title"><b>BOMB<span>RIFT</span></b><small>O ÚLTIMO REFÚGIO</small></div>
      <div class="purse">${['shards','scrap','cores'].map((id,i)=>`<span title="${['Essências','Sucata','Núcleos'][i]}">${art('resource-'+id)}<b>${formatNumber(m[id])}</b></span>`).join('')}<button class="square" data-action="settings" aria-label="Configurações">${art('ui-Settings2')}</button></div></header>
      <aside class="ranking frame"><div class="panel-caption">${art('ui-Trophy')}<span>SALÃO DAS FAÍSCAS<small>RANKING LOCAL</small></span></div>${this.rows(3)}<button class="text-button" data-action="ranking">Ver minhas expedições <span>→</span></button></aside>
      <div class="scene-actions"><button class="sign forge-sign" data-action="workshop">${art('ui-Swords')}OFICINA <kbd>B</kbd></button><button class="sign portal-sign" data-action="atlas">${art('part-compass')}EXPLORAR <kbd>M</kbd></button><button class="garden-hotspot" id="water" aria-label="Regar as flores com Faísca">${art('ui-Sprout')}<span>Regar flores</span></button></div>
      <section class="next-run"><span class="tiny">SUA PRÓXIMA AVENTURA</span><h1>${stage.world.name}</h1><p>Fase ${String(stage.number).padStart(2,'0')} · ${stage.name}</p><button class="pixel-button primary" data-action="atlas">${m.runs?'CONTINUAR EXPEDIÇÃO':'INICIAR EXPEDIÇÃO'} <span>→</span></button></section>
      <div class="peace"><span></span> Aqui, o pavio pode esperar.</div>
      <nav class="dock" aria-label="Menu do refúgio">${[['atlas','part-compass','MAPA','M'],['workshop','ui-Swords','BUILD','B'],['shop','gear-salvager','LOJA','L'],['inventory','skill-capacity','MOCHILA','I'],['ranking','ui-Trophy','RANKING','R']].map(([action,id,label,key],i)=>`<button data-action="${action}" class="${i===0?'dock-primary':''}">${art(id)}<span>${label}</span><kbd>${key}</kbd></button>`).join('')}</nav>
      <footer class="prototype-label"><span>V2.4 · SEU LEGADO PERMANECE</span><button data-action="music" id="launch-music-state">TOQUE PARA OUVIR</button><button data-action="guide">COMO JOGAR</button></footer>
    </div>`);
    if (previousHero) {
      this.root.querySelector('#hero').replaceWith(previousHero);
      // The animator uses a stable host, including its viewport measurements.
      const nextHub = this.root.querySelector('#hub');
      previousHub.replaceChildren(...nextHub.childNodes); nextHub.replaceWith(previousHub);
    } else this.life = refugeLife(this.root);
    const colors={ember:'none',jade:'hue-rotate(80deg)',polar:'hue-rotate(160deg)',rose:'hue-rotate(285deg)',royal:'hue-rotate(240deg)'};
    this.root.querySelector('.hero-walk-canvas').style.filter=colors[m.outfit]||'none';
    const embers = this.root.querySelector('#embers');
    for (let i=0;i<20;i++) { const dot=document.createElement('i'); dot.style.cssText=`left:${15+Math.random()*70}%;top:${25+Math.random()*53}%;--duration:${3+Math.random()*6}s;--delay:-${Math.random()*10}s`; embers.append(dot); }
  }
  rows(limit = 10) {
    if (!this.ranking.records.length) return '<div class="home-ranking-empty"><b>Seu nome pertence aqui.</b><p>Conclua uma expedição para registrar seu primeiro resultado.</p></div>';
    return `<ol class="home-ranking-list">${this.ranking.records.slice(0,limit).map((r,i)=>`<li>${i<3?art('part-medal-'+['first','second','third'][i]):`<em>${i+1}</em>`}<span>${r.victory?'FENDA CONQUISTADA':'A FAÍSCA RESISTIU'}<small>Fase ${r.stage} · ${r.kills} abates · ${new Date(r.date).toLocaleDateString(localeTag(),{day:'2-digit',month:'2-digit'})}</small></span><b>${formatNumber(r.score)}<small>PTS</small></b></li>`).join('')}</ol>`;
  }
}
