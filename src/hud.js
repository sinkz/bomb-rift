import { portraitArt } from './pixel-art.js';
import { formatNumber, setHTML, setText, insertHTML } from './i18n.js';
import { SKILLS } from './game.js';
import { skillArt } from './skill-art.js';
import { GEAR, OUTFITS, RESOURCES } from './legacy.js';
import { rpgArt } from './rpg-art.js';
import { relicById } from './campaign.js';

export class GameHud {
  constructor(game, { icon, icons, avatar }) {
    this.game = game; this.icon = icon; this.icons = icons; this.floaters = []; this.labels = new Map(); this.last = ''; this.buildStamp = '';
    const face = avatar.replaceAll('id="helm"', 'id="hud-helm"').replaceAll('id="suit"', 'id="hud-suit"').replaceAll('#helm', '#hud-helm').replaceAll('#suit', '#hud-suit');
    insertHTML(document.querySelector('.arena-card'), 'beforeend', `
      <div class="combat-shade"></div><div class="hurt-vignette"></div>
      <div class="combat-hud">
        <div class="hero-hud"><div class="hero-portrait"><span class="hero-face">${face}</span><b id="combat-level">1</b></div><div class="hero-vitals"><div class="hero-heading"><strong>FAÍSCA</strong><span id="combat-hp-state">VITALIDADE</span></div><div class="life-readout">${icon('Heart')}<strong id="combat-hp">100</strong><span id="combat-maxhp">/ 100</span></div><div class="life-gauge" role="progressbar" aria-label="Vida do personagem" aria-valuemin="0" id="combat-life-gauge"><span class="life-ghost" id="combat-life-ghost"></span><span id="combat-life"></span><div class="life-notches"></div></div><div class="combat-xp"><span id="combat-xp-fill"></span></div><div class="hero-subline"><span id="combat-xp-text">0 / 36 XP</span><span id="combat-status">EXPLORADOR DA FENDA</span></div></div></div>
        <div class="loot-hud"><div class="loot-token crystals">${icon('Gem')}<b id="combat-crystals">0</b><span>CRISTAIS</span></div><div class="loot-token">${icon('Skull')}<b id="combat-kills">0</b><span>ABATES</span></div></div>
        <div class="combat-location"><span id="combat-round">01</span><div><small id="combat-objective">SOBREVIVA À HORDA</small><strong id="combat-biome">RUÍNAS DO CREPÚSCULO</strong></div></div>
        <div class="combo-hud" id="combo-hud"><strong id="combat-combo">2×</strong><span>CAOS EM CADEIA</span><div><span id="combo-fill"></span></div></div>
        <div class="ability-dock"><button class="action-slot bomb-action" data-action="bomb" aria-label="Colocar bomba"><span class="action-key">ESPAÇO</span><span class="action-art" style="--skill-color:#ffab6b">${skillArt('capacity')}</span><span class="action-counter" id="combat-bombs">2/2</span><strong>BOMBA</strong><div class="action-mini" id="combat-bomb-pips"></div></button><button class="action-slot dash-action" data-action="dash" aria-label="Esquivar"><span class="action-key">SHIFT</span><span class="action-art" style="--skill-color:#76ead1">${skillArt('dash')}</span><span class="cooldown-wipe" id="dash-wipe"></span><span class="cooldown-number" id="combat-dash"></span><strong>ESQUIVA</strong><small id="dash-ready-label">PRONTA</small></button><span class="dock-divider"></span><button class="action-slot forge-action" data-action="forge" id="combat-forge" aria-label="Forjar habilidade"><span class="action-key">E</span><span class="forge-rune">${icon('Sparkles')}</span><strong>EVOLUIR</strong><small>${icon('Gem')}<b id="combat-forge-cost">20</b></small></button></div>
        <div class="build-hud"><button data-action="build" class="build-heading"><span>${icon('Swords')} SUA BUILD</span><kbd>B</kbd></button><div class="build-runes" id="combat-build"></div><p id="combat-build-hint">SEU PODER COMEÇA AQUI</p></div>
        <div class="combat-tools"><div class="zoom-tools"><button class="scene-control" data-action="zoom-out" aria-label="Afastar câmera" title="Afastar câmera">−</button><span>${icon('Crosshair')}</span><button class="scene-control" data-action="zoom-in" aria-label="Aproximar câmera" title="Aproximar câmera">+</button></div><button class="combat-menu-button" data-action="settings" aria-label="Configurações do jogo">${icon('Settings2')}</button><span class="move-hint"><kbd>WASD</kbd> MOVER <kbd>ESC</kbd> PAUSAR</span></div>
      </div><div class="world-overlay" id="world-overlay"><div class="player-tag" id="player-tag"><span id="player-tag-name">VOCÊ</span><div><span id="player-tag-life"></span></div></div></div>
    `);
    this.root = document.querySelector('.combat-hud');
    insertHTML(this.root, 'beforeend', `<div class="material-hud"><small>MATERIAIS DA EXPEDIÇÃO</small>${['scrap', 'cores'].map(id => `<span style="--resource-color:${RESOURCES[id].color}" title="${RESOURCES[id].name} coletados nesta fase">${rpgArt(id)}<b id="combat-${id}">0</b></span>`).join('')}</div><div class="player-status-chips"><span id="combat-ward" hidden>✦ ESCUDO</span><span id="combat-slow" hidden>❄ LENTO · SHIFT</span></div>`);
    insertHTML(this.root, 'beforeend', '<div id="event-feed" class="event-feed" role="status" aria-live="polite"></div>');
    this.bossBar = document.querySelector('#boss-health');
    insertHTML(this.bossBar, 'afterbegin', '<div class="boss-identity"><span id="boss-title"></span><b id="boss-phase">I · O DESPERTAR</b></div>');
    insertHTML(this.bossBar, 'beforeend', '<div class="boss-attack-readout"><span id="boss-attack-name">OBSERVE OS SINAIS NO CHÃO</span><span id="boss-quote"></span></div><div class="boss-cast-track"><span id="boss-cast-fill"></span></div>');
    insertHTML(document.querySelector('#combat-build'), 'beforebegin', '<div class="prepared-gear" id="combat-equipment"></div><div class="relic-belt" id="combat-relics"></div>');
    this.el = Object.fromEntries([...document.querySelectorAll('.combat-hud [id], .world-overlay [id]')].map(el => [el.id, el]));
  }
  update() {
    const g = this.game, p = g.player, fighting = g.phase !== 'menu';
    document.body.classList.toggle('in-run', fighting);
    document.body.classList.toggle('boss-encounter', !!g.boss && fighting);
    this.bossBar.style.setProperty('--boss-color', g.biome.color);
    this.bossBar.classList.toggle('enraged', !!g.boss?.enraged);
    setText(document.querySelector('#boss-title'), g.biome.title.toUpperCase());
    setText(document.querySelector('#boss-phase'), g.boss?.enraged ? 'II · FÚRIA' : 'I · O DESPERTAR');
    document.body.classList.toggle('low-health', fighting && p.hp > 0 && p.hp / p.maxHp <= .3);
    const state = [g.phase, p.hp, p.maxHp, g.xp, g.level, g.crystals, g.kills, g.round, g.relics.join(','), g.bombs.length, Math.ceil(p.dashCooldown * 10), g.forgeCost, g.combo, Math.ceil(g.comboTimer * 10), g.boss?.enraged, g.materials.scrap, g.materials.cores, p.ward, p.slow > 0, p.outfit, JSON.stringify(p.equipment)].join(':');
    if (state === this.last) return; this.last = state;
    const e = this.el, ratio = Math.max(0, p.hp / p.maxHp);
    setText(e['combat-level'], g.level); setText(e['combat-hp'], p.hp); setText(e['combat-maxhp'], `/ ${p.maxHp}`);
    setText(e['combat-hp-state'], ratio <= .3 ? 'VIDA CRÍTICA!' : 'VITALIDADE');
    e['combat-life'].style.width = `${ratio * 100}%`; e['combat-life-ghost'].style.width = `${ratio * 100}%`;
    e['combat-life-gauge'].setAttribute('aria-valuenow', p.hp); e['combat-life-gauge'].setAttribute('aria-valuemax', p.maxHp);
    e['combat-life-gauge'].style.setProperty('--life-color', ratio <= .3 ? '#ff576c' : ratio <= .55 ? '#ffbe6a' : '#7feab5');
    e['combat-xp-fill'].style.width = `${g.xp / g.nextXp * 100}%`; setText(e['combat-xp-text'], `${g.xp} / ${g.nextXp} XP`);
    e['player-tag-life'].style.width = `${ratio * 100}%`;
    const outfit = OUTFITS.find(o => o.id === p.outfit) || OUTFITS[0];
    this.root.style.setProperty('--hero-outfit', outfit.color); this.root.style.setProperty('--hero-outfit-light', outfit.light);
    if (this.portraitOutfit !== p.outfit) { setHTML(this.root.querySelector('.hero-face'), portraitArt(p.outfit)); this.portraitOutfit = p.outfit; }
    setText(e['combat-scrap'], g.materials.scrap); setText(e['combat-cores'], g.materials.cores);
    e['combat-ward'].hidden = !p.ward; e['combat-slow'].hidden = !p.slow;
    setText(e['combat-crystals'], g.crystals); setText(e['combat-kills'], g.kills);
    setText(e['combat-round'], String(g.round).padStart(2, '0')); setText(e['combat-biome'], g.stage.name.toUpperCase());
    setText(e['combat-objective'], g.boss ? (g.boss.enraged ? 'GUARDIÃO EM FÚRIA' : 'DERROTE O GUARDIÃO') : 'SOBREVIVA À HORDA');
    setText(e['combat-bombs'], `${p.capacity - g.bombs.length}/${p.capacity}`);
    setHTML(e['combat-bomb-pips'], Array.from({ length: p.capacity }, (_, i) => `<span class="${i < p.capacity - g.bombs.length ? 'available' : ''}"></span>`).join(''));
    setText(e['combat-dash'], p.dashCooldown > 0 ? formatNumber(p.dashCooldown, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '');
    setText(e['dash-ready-label'], p.dashCooldown > 0 ? 'RECARREGANDO' : 'PRONTA');
    e['dash-wipe'].style.height = `${p.dashCooldown / p.dashMax * 100}%`;
    setText(e['combat-forge-cost'], g.forgeCost); e['combat-forge'].disabled = !g.active || g.crystals < g.forgeCost;
    e['combat-forge'].classList.toggle('forge-ready', !e['combat-forge'].disabled);
    setText(e['combat-status'], !e['combat-forge'].disabled ? 'NOVA HABILIDADE DISPONÍVEL · E' : 'EXPLORADOR DA FENDA');
    e['combo-hud'].classList.toggle('visible', g.combo > 1 && g.comboTimer > 0);
    setText(e['combat-combo'], `${g.combo}×`); e['combo-fill'].style.width = `${g.comboTimer / 4 * 100}%`;
    const buildStamp = JSON.stringify([g.skillLevels, g.relics, p.equipment]);
    if (buildStamp !== this.buildStamp) {
      this.buildStamp = buildStamp;
      setHTML(e['combat-equipment'], Object.values(p.equipment).map(id => { const item = GEAR.find(g => g.id === id); return `<span style="--gear-color:${item.color}" title="${item.name}: ${item.desc}" aria-label="Equipado: ${item.name}">${rpgArt(item.id)}</span>`; }).join(''));
      const skills = SKILLS.filter(s => g.skillLevels[s.id]);
      setHTML(e['combat-relics'], g.relics.map(id => { const r = relicById(id); return `<button data-action="build" class="build-rune" title="${r.name}: ${r.desc}" aria-label="Relíquia ${r.name}" style="--skill-color:${r.color}">${skillArt('relic-' + r.id)}</button>`; }).join(''));
      setHTML(e['combat-build'], skills.length ? skills.map(s => `<button data-action="build" data-rune="${s.id}" class="build-rune ${this.gained === s.id ? 'rune-gained' : ''}" title="${s.name} · Nível ${g.skillLevels[s.id]} — ${s.desc}" aria-label="${s.name}, nível ${g.skillLevels[s.id]}" style="--skill-color:${s.color}">${skillArt(s.id)}<b>${g.skillLevels[s.id]}</b></button>`).join('') : Array.from({ length: 4 }, () => '<span class="rune-empty">◇</span>').join(''));
      setText(e['combat-build-hint'], skills.length ? `${skills.length} HABILIDADES · B PARA DETALHES` : 'SEU PODER COMEÇA AQUI');
    }
  }
  floating(text, x, z, style = 'damage') {
    if (this.floaters.length >= 32) { this.floaters.shift().el.remove(); }
    const el = document.createElement('span'); el.className = `combat-floater ${style}`; setText(el, text);
    document.querySelector('#world-overlay').append(el); this.floaters.push({ el, x, z, age: 0, life: style === 'skill' ? 1.8 : 1 });
  }
  notice(title, detail = '', color = '#ffd39b', art = null) {
    const el = this.el['event-feed']; el.style.setProperty('--notice-color', color);
    setHTML(el, `${art ? `<span class="notice-art" style="--skill-color:${color}">${skillArt(art)}</span>` : '<span class="notice-mark">✦</span>'}<div><strong></strong><small></small></div>`);
    setText(el.querySelector('strong'), title); setText(el.querySelector('small'), detail);
    el.classList.remove('visible'); void el.offsetWidth; el.classList.add('visible');
    clearTimeout(this.noticeTimer); this.noticeTimer = setTimeout(() => el.classList.remove('visible'), 3500);
  }
  handle(event) {
    const g = this.game;
    if (event.type === 'arena') { for (const f of this.floaters) f.el.remove(); this.floaters = []; this.gained = null; this.el['event-feed'].classList.remove('visible'); }
    if (event.type === 'enemyHit') this.floating(`−${event.damage}`, event.x, event.z, 'damage');
    if (event.type === 'pickup' && ['heart', 'crystal'].includes(event.entityType)) this.floating(event.entityType === 'heart' ? '+20 ♥' : `+${event.value} ◆`, event.x, event.z, event.entityType === 'heart' ? 'healing' : 'crystal');
    if (event.type === 'pickup' && ['scrap', 'cores'].includes(event.entityType)) { const token = this.el[`combat-${event.entityType}`].parentElement; token.classList.remove('loot-pop'); void token.offsetWidth; token.classList.add('loot-pop'); }
    if (event.type === 'blocked') this.floating('BLOQUEADO', event.x, event.z, 'healing');
    if (event.type === 'snared') this.notice('Preso por um instante', 'Use SHIFT para romper a lentidão.', '#a6deed', 'dash');
    if (event.type === 'hurt') this.floating(`−${event.amount}`, event.x, event.z, 'player-damage');
    if (event.type === 'skill') { const s = SKILLS.find(s => s.id === event.id); this.gained = s.id; this.notice(s.name, `NV. ${g.skillLevels[s.id]} · ${s.desc}`, s.color, s.id); }
    if (event.type === 'pickup' && event.entityType === 'crystal') { const el = this.el['combat-crystals'].parentElement; el.classList.remove('loot-pop'); void el.offsetWidth; el.classList.add('loot-pop'); }
    if (event.type === 'boss') { setText(document.querySelector('#boss-quote'), `“${g.biome.quote}”`); this.bossBar.classList.remove('boss-awakens'); void this.bossBar.offsetWidth; this.bossBar.classList.add('boss-awakens'); this.notice(g.biome.boss, g.biome.title, g.biome.color); }
    if (event.type === 'warning') setText(document.querySelector('#boss-attack-name'), event.name);
    if (event.type === 'bossEnraged') { setText(document.querySelector('#boss-quote'), 'A fenda responde à sua fúria.'); this.notice(`${g.biome.boss} · FÚRIA`, 'Ataques mais rápidos. Observe a preparação.', '#ff8b91'); }
    if (event.type === 'bossEnraged') this.floating('FÚRIA!', event.x, event.z, 'player-damage');
    if (event.type === 'kill' && g.combo > 1) {
      this.el['combo-hud'].classList.remove('combo-pop'); void this.el['combo-hud'].offsetWidth; this.el['combo-hud'].classList.add('combo-pop');
    }
  }
  frame(dt, scene) {
    if (this.game.phase === 'menu') return;
    const p = scene.projectPlayer(); const tag = this.el['player-tag'];
    tag.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-100%)`;
    setText(this.el['player-tag-name'], this.game.player.invincible > .1 ? '✦ PROTEGIDO' : 'VOCÊ');
    const cast = this.game.warnings.find(w => w.duration);
    document.querySelector('#boss-cast-fill').style.width = cast ? `${(1 - cast.timer / cast.duration) * 100}%` : '0%';
    this.bossBar.classList.toggle('casting', !!cast);
    const ids = new Set();
    for (const enemy of [...this.game.enemies, ...(this.game.boss ? [this.game.boss] : [])]) {
      if (enemy.hp === enemy.maxHp && !enemy.windup && enemy.intent !== 'evade' && enemy.type !== 'sentinel' && enemy.intent !== 'cast' && !enemy.slow && !enemy.mending && enemy.intent !== 'ambush') continue;
      ids.add(enemy.id);
      if (!this.labels.has(enemy.id)) {
        const el = document.createElement('div'); el.className = 'enemy-tag'; setHTML(el, '<span></span><div><i></i></div>'); document.querySelector('#world-overlay').append(el); this.labels.set(enemy.id, el);
      }
      const el = this.labels.get(enemy.id), pos = scene.projectEntity(enemy);
      el.style.transform = `translate(${pos.x}px,${pos.y}px) translate(-50%,-100%)`;
      setText(el.firstElementChild, enemy.mending ? '✦ CURANDO A HORDA' : enemy.intent === 'ambush' ? '⚠ EMBOSCADA' : enemy.windup ? '⚠ INVESTIDA' : enemy.slow ? '❄ LENTO' : enemy.type === 'sentinel' ? '◆ SENTINELA' : enemy.intent === 'cast' ? '✦ CONJURANDO' : enemy.intent === 'evade' ? '↗' : '');
      el.querySelector('i').style.width = `${Math.max(0, enemy.hp / enemy.maxHp * 100)}%`;
      el.classList.toggle('charging', enemy.windup > 0);
    }
    for (const [id, el] of this.labels) if (!ids.has(id)) { el.remove(); this.labels.delete(id); }
    for (const f of this.floaters) {
      f.age += dt; const pos = scene.projectWorld(f.x, f.z, 1.3 + f.age * .8);
      f.el.style.transform = `translate(${pos.x}px,${pos.y}px) translate(-50%,-100%)`;
      f.el.style.opacity = Math.min(1, (f.life - f.age) * 3);
      if (f.age >= f.life) f.el.remove();
    }
    this.floaters = this.floaters.filter(f => f.age < f.life);
  }
}
