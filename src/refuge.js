import { pixelArt, portraitArt } from './pixel-art.js';
import { formatNumber } from './i18n.js';
import { RESOURCES, TALENTS, BRANCHES, GEAR, SLOTS, OUTFITS, CONTRACTS, rankInfo, talentStatus, canAfford, startingStats, buyTalent, resetTalents, useGear, useOutfit, claimContract, contractProgress, seloStatus, useSigil } from './legacy.js';
import { selosDoRamo } from './sigils.js';
import { skillArt } from './skill-art.js';
import { SKILLS } from './skills.js';
import { rpgArt } from './rpg-art.js';
import { ENEMY_NAMES, ENEMY_TACTICS } from './campaign.js';

export function resourceCost(cost, prefix = '') {
  return Object.entries(cost).map(([key, value]) => `<span style="--resource-color:${RESOURCES[key].color}" title="${RESOURCES[key].name}">${rpgArt(key)}<b>${prefix}${value}</b><small>${RESOURCES[key].name}</small></span>`).join('');
}
export class Refuge {
  constructor(meta, { avatar, icon }) { Object.assign(this, { meta, icon }); this.avatar = avatar.replaceAll('helm', 'refuge-helm').replaceAll('suit', 'refuge-suit'); this.tab = 'talents'; this.slot = 'core'; }
  html() {
    const m = this.meta, rank = rankInfo(m.legacyXp), stats = startingStats(m), outfit = OUTFITS.find(o => o.id === m.outfit);
    const tabs = [['talents','Sprout','Talentos'],['gear','Swords','Loja'],['inventory','Bomb','Mochila'],['skills','BookOpen','Grimório'],['outfits','Sparkles','Visual'],['contracts','Target','Contratos'],['bestiary','Skull','Bestiário']];
    return `<div class="refuge-shell" style="--outfit:${outfit.color};--outfit-light:${outfit.light}"><header class="refuge-heading"><div><span class="eyebrow">ENTRE UMA FENDA E OUTRA</span><h2 id="modal-title">Refúgio da <em>Faísca.</em></h2><p>Prepare sua próxima expedição. Tudo que construir aqui permanece.</p></div><div class="refuge-wallet">${resourceCost(Object.fromEntries(Object.keys(RESOURCES).map(k => [k, m[k]])))}</div></header><div class="refuge-layout"><aside class="refuge-hero"><div class="refuge-rank"><span>RANQUE DO EXPLORADOR</span><b>${String(rank.level).padStart(2,'0')}</b><strong>${rank.level >= 5 ? 'DESBRAVADOR' : rank.level >= 3 ? 'AVENTUREIRO' : 'ANDARILHO'}</strong></div><div class="refuge-avatar"><i></i>${portraitArt(m.outfit)}</div><div class="refuge-xp"><span style="width:${Math.min(100,rank.current/rank.next*100)}%"></span></div><small class="refuge-xp-caption">${rank.current} / ${rank.next} EXP · GANHA AO ENCERRAR FASES</small><div class="refuge-stats"><span>${this.icon('Heart')}<b>${stats.maxHp}</b><small>VIDA</small></span><span>${this.icon('Flame')}<b>${stats.damage}</b><small>DANO</small></span><span>${this.icon('Expand')}<b>${stats.range}</b><small>ALCANCE</small></span><span>${this.icon('Bomb')}<b>${stats.capacity}</b><small>BOMBAS</small></span></div><div class="refuge-equipped">${Object.entries(SLOTS).map(([slot,label]) => { const g = GEAR.find(g => g.id === m.loadout[slot]); return `<button data-refuge-slot="${slot}" style="--gear-color:${g.color}">${rpgArt(g.id)}<span><small>${label}</small><strong>${g.name}</strong></span>${this.icon('ChevronRight')}</button>`; }).join('')}</div><dl class="refuge-secondary-stats"><div><dt>Proteção</dt><dd>${Math.round(stats.armor * 100)}%</dd></div><div><dt>Esquiva</dt><dd>${formatNumber(stats.dashMax, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}s</dd></div><div><dt>Atração</dt><dd>${Math.floor(stats.magnet)} ${Math.floor(stats.magnet) === 1 ? 'casa' : 'casas'}</dd></div><div><dt>Cura / abate</dt><dd>+${stats.vampire}</dd></div></dl><p class="refuge-fineprint">ATRIBUTOS PARA A PRÓXIMA FASE<br>Skills e relíquias encontradas na arena reiniciam. Seu equipamento e seus talentos ficam.</p></aside><section class="refuge-workshop"><nav class="refuge-tabs" aria-label="Seções do refúgio">${tabs.map(([id,icon,label]) => `<button data-refuge-tab="${id}" aria-pressed="${this.tab===id}" class="${this.tab===id?'active':''}">${this.icon(icon)}${label}</button>`).join('')}</nav><div class="refuge-content" data-view="${this.tab}">${this.tab === 'talents' ? this.talents() : this.tab === 'gear' ? this.gear() : this.tab === 'inventory' ? this.gear(true) : this.tab === 'skills' ? this.skills() : this.tab === 'outfits' ? this.outfits() : this.tab === 'contracts' ? this.contracts() : this.bestiary()}</div></section></div><footer class="refuge-footer"><span>${this.icon('Shield')} Evoluções disponíveis na próxima fase · progresso salvo neste navegador</span><button class="primary-button" data-action="close-modal">PREPARADO ${this.icon('ArrowRight')}</button></footer></div>`;
  }
  talents() {
    // A aba deixou de ser tres colunas de cartoes e virou tres arvores.
    //
    // O dado do pre-requisito ja existia: TALENTS tem `requires: [id, nivel]` e
    // os SELOS tem `requer`. Nenhum dos dois era desenhado -- zero ocorrencias
    // no render antigo. Quem olhava a tela via uma lista de compras, sem como
    // saber que os nos dependem uns dos outros nem por que um botao esta apagado.
    //
    // Tres estados por no, cada um dizendo uma coisa diferente:
    //   aprendido  voce ja investiu aqui
    //   aberto     da para comprar agora
    //   travado    falta ranque ou o no acima, e a linha ate ele fica pontilhada
    const travado = razao => /^REQUER/.test(razao || '');

    const noDeTalento = (t, proximo) => {
      const s = talentStatus(this.meta, t);
      const preso = travado(s.reason);
      // A linha que desce deste no so acende quando o de baixo ja esta
      // destravado: e ela que mostra o caminho que voce abriu.
      const fluindo = proximo && !travado(talentStatus(this.meta, proximo).reason);
      const classes = ['talent-node', s.level ? 'learned' : '', preso ? 'locked' : '', fluindo ? 'flows' : ''].filter(Boolean).join(' ');
      const cadeado = preso ? `<i class="node-lock">${this.icon('LockKeyhole')}</i>` : '';
      const pips = Array.from({ length: t.max }, (_, i) => `<i class="${i < s.level ? 'filled' : ''}"></i>`).join('');
      const custo = s.level < t.max ? resourceCost(s.cost) : '<span>◆ TALENTO DOMINADO</span>';
      return `<article class="${classes}"><div class="talent-node-heading"><span>${skillArt('talent-' + t.id)}</span><div><small>${s.level}/${t.max} · NV.</small><h5>${t.name}</h5></div>${cadeado}</div><p>${t.desc}</p><div class="talent-pips">${pips}</div><div class="recipe-cost">${custo}</div><button data-talent="${t.id}" ${s.available ? '' : 'disabled'}>${s.reason || 'EVOLUIR +1'}</button></article>`;
    };

    const cartaoDeSelo = selo => {
      const s = seloStatus(this.meta, selo);
      const rotulo = s.equipado ? 'EQUIPADO · Q' : s.comprado ? 'EQUIPAR' : s.available ? 'FORJAR E EQUIPAR' : s.reason;
      const classes = ['sigil-card', s.equipado ? 'equipped' : '', !s.comprado && !s.available ? 'locked' : ''].filter(Boolean).join(' ');
      const exigido = selo.requer && TALENTS.find(t => t.id === selo.requer[0]);
      const exigencia = exigido ? ` · EXIGE ${exigido.name.toUpperCase()} ${selo.requer[1]}` : '';
      const custo = s.comprado ? '<span>Troca gratuita entre fases</span>' : resourceCost(selo.custo);
      return `<article class="${classes}" style="--skill-color:${selo.cor}"><div class="sigil-card-top"><span class="sigil-art">${skillArt(selo.art)}</span><div><h5>${selo.nome}</h5><small>RECARGA ${selo.recarga}s${exigencia}</small></div>${this.icon(s.equipado ? 'Check' : s.comprado ? 'Zap' : s.available ? 'Sparkles' : 'LockKeyhole')}</div><p>${selo.desc}</p><p class="sigil-synergy">${selo.sinergia}</p><div class="recipe-cost">${custo}</div><button data-sigil="${selo.id}" ${s.comprado || s.available ? '' : 'disabled'}>${rotulo}</button></article>`;
    };

    const ramo = b => {
      const doRamo = TALENTS.filter(t => t.branch === b.id);
      // O ramo que carrega o selo equipado se destaca: e a sua identidade desta
      // expedicao, e tem de ser reconhecivel sem ler os cartoes.
      const carregando = selosDoRamo(b.id).some(s => this.meta.sigil === s.id);
      const nos = doRamo.map((t, i) => noDeTalento(t, doRamo[i + 1])).join('');
      const selos = selosDoRamo(b.id).map(cartaoDeSelo).join('');
      return `<section class="talent-branch ${carregando ? 'carrying' : ''}" style="--branch-color:${b.color}"><header>${pixelArt('branch-' + b.id, 'branch-pixel-icon')}<h4>${b.name}</h4><p>${b.motto}</p></header>${nos}<div class="sigil-tier"><span class="sigil-tier-label">SELOS · EQUIPE UM</span>${selos}</div></section>`;
    };

    const vazia = TALENTS.every(t => !talentStatus(this.meta, t).level);
    return `<div class="workshop-intro"><div><small>TRÊS CAMINHOS. O SEU ESTILO.</small><h3>Construa seu legado</h3><p>Desça um ramo até o fim: é lá que mora o <b>selo</b>, a terceira habilidade, usada com <b>Q</b>. Só um entra na expedição.</p></div><button class="refund-talents" data-refuge-reset ${vazia ? 'disabled' : ''}>${this.icon('RotateCcw')} REORGANIZAR<small>Devolve 100% dos recursos</small></button></div><div class="talent-branches">${BRANCHES.map(ramo).join('')}</div>`;
  }
  gear(ownedOnly = false) {
    const m=this.meta;
    return `<div class="workshop-intro"><div><small>FORJE UMA VEZ. USE EM TODAS AS FASES.</small><h3>Seu arsenal, suas regras</h3><p>Um núcleo, um par de botas e um talismã. Trocar peças já criadas é grátis.</p></div></div><div class="gear-slots">${Object.entries(SLOTS).map(([id,label])=>`<button data-refuge-slot="${id}" class="${this.slot===id?'active':''}" aria-pressed="${this.slot===id}">${label}</button>`).join('')}</div><div class="gear-grid">${GEAR.filter(g=>g.slot===this.slot && (!ownedOnly || m.gear.includes(g.id))).map(g=>{const owned=m.gear.includes(g.id), equipped=m.loadout[g.slot]===g.id, rank=rankInfo(m.legacyXp).level, locked=!owned&&rank<g.rank; return `<article class="gear-card ${equipped?'equipped':''}" style="--gear-color:${g.color}"><div class="gear-card-top"><small>${equipped?'EQUIPADO':owned?'NA SUA COLEÇÃO':`RECEITA · RANQUE ${g.rank}`}</small>${this.icon(equipped?'Check':owned?'Swords':'LockKeyhole')}</div><div class="gear-art">${rpgArt(g.id)}</div><h4>${g.name}</h4><p>${g.desc}</p><div class="recipe-cost">${owned?'<span>Troca gratuita entre fases</span>':resourceCost(g.cost)}</div><button data-gear="${g.id}" ${equipped||locked||!owned&&!canAfford(m,g.cost)?'disabled':''}>${equipped?'PRONTO PARA A EXPEDIÇÃO':owned?'EQUIPAR':locked?`REQUER RANQUE ${g.rank}`:canAfford(m,g.cost)?'FORJAR E EQUIPAR':'FALTAM RECURSOS'}</button></article>`;}).join('')}</div><div class="strategy-note">${this.icon('Sparkles')} <p><b>Uma estratégia para testar:</b> botas do vendaval + reator azul permitem posicionar uma explosão mais forte e sair antes do impacto. O ímã do sucateiro ajuda a financiar a próxima peça.</p></div>`;
  }
  skills() {
    return '<div class="workshop-intro"><div><small>SKILLS & DESPERTARES</small><h3>Seu próximo despertar</h3><p>Cada nível oferece três escolhas de uma coleção de 16 habilidades. Escolha a mesma cinco vezes para despertar seu poder especial.</p></div></div><div class="skill-library">' + SKILLS.map(s => `<article style="--skill-color:${s.color}">${skillArt(s.id)}<div><small>${s.branch}</small><h4>${s.name}</h4><p>${s.desc}</p></div><div class="awakening">${s.mastery ? `<small>5ª ESCOLHA · DESPERTAR</small><p><b>${s.mastery}</b></p><p>${s.awakening}</p>` : '<p>Consumível: cura imediata, sem despertar.</p>'}</div></article>`).join('') + '</div>';
  }
  outfits() {
    const m=this.meta;
    return `<div class="workshop-intro"><div><small>O MESMO PEQUENO CAOS. A SUA COR.</small><h3>Assine sua aventura</h3><p>As tinturas mudam o traje 3D e o retrato de Faísca. São apenas visuais.</p></div></div><div class="outfit-grid">${OUTFITS.map(o=>{const owned=m.outfits.includes(o.id),active=m.outfit===o.id;return `<article class="outfit-card ${active?'equipped':''}" style="--outfit:${o.color};--outfit-light:${o.light}"><span class="outfit-swatch">${pixelArt('outfit-' + o.id)}</span><h4>${o.name}</h4><div class="recipe-cost">${owned?'<span>NA SUA COLEÇÃO</span>':resourceCost(o.cost)}</div><button data-outfit="${o.id}" ${active||!owned&&!canAfford(m,o.cost)?'disabled':''}>${active?'EM USO':owned?'USAR TINTURA':canAfford(m,o.cost)?'CRIAR TINTURA':'FALTAM RECURSOS'}</button></article>`;}).join('')}</div><p class="workshop-footnote">Sua escolha aparece na prévia ao lado e entra no combate na próxima fase.</p>`;
  }
  contracts() {
    return `<div class="workshop-intro"><div><small>CADA EXPEDIÇÃO CONTA.</small><h3>Histórias com recompensa</h3><p>Objetivos acumulam progresso entre fases, mesmo nas tentativas em que você cai.</p></div></div><div class="contract-grid">${CONTRACTS.map(c=>{const done=this.meta.contracts.includes(c.id),n=contractProgress(this.meta,c),ready=n>=c.goal;return `<article class="contract-card ${done?'claimed':''}"><span class="contract-art" style="--skill-color:#e4c28e">${skillArt('contract-' + c.id)}</span><div><h4>${c.name}</h4><p>${c.desc}</p><div class="contract-progress"><span style="width:${Math.min(100,n/c.goal*100)}%"></span></div><small>${Math.min(n,c.goal)} / ${c.goal}</small></div><div class="contract-reward"><div class="recipe-cost">${resourceCost(c.reward,'+')}</div><button data-contract="${c.id}" ${done||!ready?'disabled':''}>${done?'RECEBIDO':ready?'RESGATAR':'EM ANDAMENTO'}</button></div></article>`;}).join('')}</div><div class="resource-guide">${Object.entries(RESOURCES).map(([key,r])=>`<div style="--resource-color:${r.color}">${rpgArt(key)}<span><strong>${r.name}</strong><p>${r.tip}</p></span></div>`).join('')}</div>`;
  }
  bestiary() {
    return `<div class="workshop-intro"><div><small>CONHECER TAMBÉM É EVOLUIR.</small><h3>Leia a horda</h3><p>Nem todo alvo tem a mesma prioridade. Elimine o suporte e guarde a esquiva para o controle.</p></div></div><div class="bestiary-grid">${Object.entries(ENEMY_TACTICS).map(([id,e])=>`<article style="--skill-color:${e.color}"><span>${skillArt('enemy-' + id)}</span><div><small>${e.role}</small><h4>${ENEMY_NAMES[id]}</h4><p>${e.tip}</p></div></article>`).join('')}</div>`;
  }
  act(button) {
    const d=button.dataset;
    if (d.refugeTab) { this.tab=d.refugeTab; return { changed:false }; }
    if (d.refugeSlot) { if(this.tab !== 'inventory') this.tab='gear';this.slot=d.refugeSlot;return { changed:false }; }
    if ('refugeReset' in d) return { changed:resetTalents(this.meta), message:'Talentos reorganizados. Todos os recursos foram devolvidos.' };
    if (d.talent) return { changed:buyTalent(this.meta,d.talent),message:'Talento aprendido. Ativo na próxima fase.' };
    if (d.gear) return { changed:useGear(this.meta,d.gear),message:'Equipamento preparado para a próxima fase.' };
    if (d.sigil) return { changed:useSigil(this.meta,d.sigil),message:'Selo preparado. Use com Q na próxima fase.' };
    if (d.outfit) return { changed:useOutfit(this.meta,d.outfit),message:'Tintura preparada. Sua próxima expedição já tem uma nova cor.' };
    if (d.contract) return { changed:claimContract(this.meta,d.contract),message:'Contrato concluído. Recompensa adicionada à sua bolsa.' };
    return null;
  }
}
