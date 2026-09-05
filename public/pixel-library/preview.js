(() => {
  'use strict';
  const catalog=window.PIXEL_CATALOG, items=catalog.items, byId=new Map(items.map(r=>[r.id,r]));
  const groups=[...new Set(items.map(r=>r.group))], paths=[...new Set(items.map(r=>r.new))];
  const $=s=>document.querySelector(s), esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  let style='pixel', demo='skills', group='Todos', picked=0, serial=0;
  function original(r){
    let html=r.old; const prefix='old-'+(++serial)+'-';
    // The same original SVG appears in several comparison contexts; keep gradients local.
    const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
    for(const id of ids)html=html.replaceAll('id="'+id+'"','id="'+prefix+id+'"').replaceAll('url(#'+id+')','url(#'+prefix+id+')');
    return html;
  }
  function art(id,mode=style){const r=byId.get(id);if(!r)throw Error('Missing catalog entry '+id);return `<span class="art" style="--c:${r.color};--skill-color:${r.color}" aria-hidden="true">${mode==='old'?original(r):`<img src="${r.new}" alt="" width="384" height="384">`}</span>`;}
  function comparison(r){return `<div class="comparison-surface"><div class="is-old">${art(r.id,'old')}<small>ATUAL</small></div><div class="is-new">${art(r.id,'pixel')}<small>PIXEL ART</small></div></div>`;}
  $('#asset-count').textContent=paths.length;$('#entry-count').textContent=items.length;$('#category-count').textContent=groups.length;
  $('#categories').innerHTML=['Todos',...groups].map(g=>`<button data-group="${esc(g)}" aria-pressed="${g===group}">${esc(g)}<span>${g==='Todos'?items.length:items.filter(i=>i.group===g).length}</span></button>`).join('');
  const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function gallery(){
    const q=normalize($('#search').value), visible=items.filter(r=>(group==='Todos'||r.group===group)&&normalize(r.name+' '+r.id+' '+r.group+' '+r.source).includes(q));
    $('#gallery').innerHTML=visible.map(r=>`<article class="asset-card" data-id="${r.id}" style="--c:${r.color}"><button data-detail="${r.id}" aria-label="Comparar ${esc(r.name)}">${comparison(r)}<h3>${esc(r.name)}</h3><p class="category">${esc(r.group.toUpperCase())}</p></button><div class="id" title="${esc(r.id)}">${esc(r.id)}</div></article>`).join('');
    $('#result-count').textContent=`${visible.length} de ${items.length} usos visuais`;$('#empty').hidden=visible.length>0;
  }
  function renderDemo(){
    const skillIds=['capacity','magnet','speed'], descriptions=['+1 bomba simultânea. Mais caos, mais possibilidades.','Atrai cristais a uma distância maior.','Mova-se 10% mais rápido pela masmorra.'];
    if(demo==='skills')$('#demo').innerHTML=`<div class="demo-heading"><p class="eyebrow">NÍVEL 2 · PODER DESPERTADO</p><h3>Escolha sua evolução.</h3><p>Três caminhos. Uma escolha. Faça a fenda lembrar de você.</p></div><div class="skill-cards">${skillIds.map((id,i)=>{const r=byId.get('skill-'+id);return `<button class="skill-card ${picked===i?'selected':''}" data-pick="${i}" style="--c:${r.color}" aria-pressed="${picked===i}"><span class="label"><span>${['ARSENAL','COLETA','MOBILIDADE'][i]}</span><span>${i+1}</span></span>${art(r.id)}<h4>${esc(r.name)}</h4><p>${descriptions[i]}</p><div class="skill-stat">${['2','1','5.5'][i]} → <b>${['3','2','6.1'][i]}</b><small>${['BOMBAS','RAIO DE COLETA','BLOCOS / S'][i]}</small></div><small>◆ NÍVEL 1</small></button>`;}).join('')}</div>`;
    if(demo==='hud')$('#demo').innerHTML=`<div class="demo-heading"><p class="eyebrow">LEITURA DURANTE O COMBATE</p><h3>A informação vem primeiro.</h3><p>Vida em destaque, recursos e poderes em tamanho de HUD.</p></div><div class="hud-demo"><div class="player-block">${art('portrait-ember')}<div><small>FAÍSCA · NÍVEL 4</small><div class="gauge-line">${art('ui-Heart')}<h4>8 / 8</h4></div><div class="gauge ${style==='pixel'?'pixel':''}">${style==='pixel'?'<img src="pixel-library/icons/part-life-full.png" alt="Prévia de moldura da barra de vida">':'<i></i>'}</div></div></div><div class="timer"><small>RUÍNAS VIOLETA</small><b>01:24</b><small>ONDA 02</small></div><div class="hud-actions">${[['ui-Volume2','Som'],['ui-Settings2','Configurações'],['ui-Pause','Pausar'],['ui-Maximize','Tela cheia']].map(([id,label])=>`<button data-hud="${label}" aria-label="Testar ${label}">${art(id)}</button>`).join('')}</div></div><div class="resources">${[['resource-shards','140'],['resource-scrap','36'],['resource-cores','4']].map(([id,n])=>`<span>${art(id)}${n}</span>`).join('')}</div><div class="hud-loadout">${['skill-power','skill-capacity','skill-speed','relic-azure','relic-clock'].map((id,i)=>`<span class="hud-slot" title="${esc(byId.get(id).name)}">${art(id)}<small>${i<3?'II':'◆'}</small></span>`).join('')}</div><p class="hud-caption">Observe se cada silhueta continua reconhecível com apenas 28–38 pixels de altura.</p><div class="boss-strip">${art('guardian-ruins')}<div><b>${esc(byId.get('guardian-ruins').name.split(' · ')[0])}</b><div class="old-bar boss"><i style="width:70%"></i></div></div></div>`;
    if(demo==='refuge')$('#demo').innerHTML=`<div class="demo-heading"><p class="eyebrow">O LEGADO CONTINUA</p><h3>Prepare a próxima expedição.</h3><p>Equipamentos com identidade própria e recursos fáceis de distinguir.</p></div><div class="gear-cards">${[['gear-azure-core','Núcleo · fogo azul'],['gear-wind-boots','Botas · mobilidade'],['gear-guardian-charm','Amuleto · proteção']].map(([id,desc])=>`<div class="gear-card">${art(id)}<h4>${esc(byId.get(id).name)}</h4><p>${desc}</p><small>FORJADO · NÍVEL 3</small><div class="upgrade-dots">${[1,1,1,0,0].map(n=>art('part-talent-'+(n?'on':'off'))).join('')}</div></div>`).join('')}</div><div class="resources">${[['resource-shards','140 essências'],['resource-scrap','36 sucatas'],['resource-cores','4 núcleos']].map(([id,n])=>`<span>${art(id)}${n}</span>`).join('')}</div>`;
    if(demo==='worlds')$('#demo').innerHTML=`<div class="demo-heading"><p class="eyebrow">SEIS MUNDOS · SEIS AMEAÇAS</p><h3>A fenda tem muitos rostos.</h3><p>Ilustrações 2D para a seleção de mundos e seus guardiões.</p></div><div class="world-cards">${catalog.scope.worlds.map(id=>{const m=byId.get('map-'+id),b=byId.get('guardian-'+id);return `<div class="world-card" style="--c:${m.color}"><div class="world-map">${art(m.id)}</div><div class="world-boss">${art(b.id)}</div><h4>${esc(m.name)}</h4><p>${esc(b.name.split(' · ')[0])}</p></div>`;}).join('')}</div>`;
  }
  function detail(id){
    const r=byId.get(id), shared=items.filter(x=>x.new===r.new&&x.id!==r.id);
    $('#detail-content').innerHTML=`<p class="detail-group">${esc(r.group.toUpperCase())}</p><h2 class="detail-title">${esc(r.name)}</h2><div class="detail-compare">${comparison(r)}</div><p class="detail-source">Origem: ${esc(r.source)}<br>Arquivo: ${esc(r.new)}</p>${r.group==='Molduras e estados'?'<p class="shared">Antes: reprodução do estado visual em CSS. Depois: proposta estática de asset; integração dinâmica pendente de aprovação.</p>':''}${shared.length?`<p class="shared">Asset compartilhado com: ${shared.map(s=>esc(s.name)).join(', ')}.</p>`:''}<a class="detail-download" href="${r.new}" download>Baixar PNG transparente ↓</a>`;
    $('#detail').showModal();
  }
  document.addEventListener('click',e=>{
    const target=e.target.closest('button');if(!target)return;
    if(target.dataset.style){style=target.dataset.style;document.querySelectorAll('[data-style]').forEach(b=>b.setAttribute('aria-pressed',String(b===target)));renderDemo();}
    if(target.dataset.demo){demo=target.dataset.demo;document.querySelectorAll('[data-demo]').forEach(b=>b.setAttribute('aria-pressed',String(b===target)));renderDemo();$('#demo-feedback').textContent='Apenas uma simulação visual: nenhuma alteração no progresso.';}
    if(target.dataset.group){group=target.dataset.group;document.querySelectorAll('[data-group]').forEach(b=>b.setAttribute('aria-pressed',String(b===target)));gallery();}
    if(target.dataset.detail)detail(target.dataset.detail);
    if(target.dataset.pick!==undefined){picked=Number(target.dataset.pick);renderDemo();$('#demo-feedback').textContent=byId.get('skill-'+['capacity','magnet','speed'][picked]).name+' selecionado na demonstração.';}
    if(target.dataset.hud)$('#demo-feedback').textContent=target.dataset.hud+': botão ilustrativo da HUD. Sua partida continua intacta.';
  });
  $('#search').addEventListener('input',gallery);
  $('#size').addEventListener('change',e=>document.documentElement.style.setProperty('--size',e.target.value+'px'));
  $('#surface').addEventListener('change',e=>{document.body.classList.remove('surface-light','surface-check');document.body.classList.add('surface-'+e.target.value);});
  $('#detail .close').addEventListener('click',()=>$('#detail').close());
  $('#detail').addEventListener('click',e=>{if(e.target===$('#detail')){const b=e.target.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)e.target.close();}});
  gallery();renderDemo();
  const results={loaded:0,missing:[]};window.pixelPreview={catalog,results};
  Promise.all(paths.map(path=>new Promise(resolve=>{const image=new Image();image.onload=()=>{results.loaded++;resolve();};image.onerror=()=>{results.missing.push(path);resolve();};image.src=path;}))).then(()=>{const el=$('#load-status');el.textContent=results.missing.length?`${results.missing.length} arquivos indisponíveis · recarregue após a geração`:`${results.loaded}/${paths.length} PNGs carregados · coleção completa`;el.className=results.missing.length?'bad':'good';});
})();
