import { portraitArt } from './pixel-art.js';
import { formatNumber, setHTML, setText, insertHTML } from './i18n.js';
import { SKILLS } from './game.js';
import { skillArt } from './skill-art.js';
import { GEAR, OUTFITS, RESOURCES } from './legacy.js';
import { rpgArt } from './rpg-art.js';
import { relicById } from './campaign.js';
import { PHASE_LABELS } from './boss-mechanics.js';

const escapeText = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class GameHud {
  constructor(game, { icon, icons, avatar }) {
    this.game = game; this.icon = icon; this.icons = icons; this.floaters = []; this.labels = new Map(); this.last = ''; this.buildStamp = ''; this.lifeRatio = 1;
    const face = avatar.replaceAll('id="helm"', 'id="hud-helm"').replaceAll('id="suit"', 'id="hud-suit"').replaceAll('#helm', '#hud-helm').replaceAll('#suit', '#hud-suit');
    insertHTML(document.querySelector('.arena-card'), 'beforeend', `
      <div class="combat-shade"></div><div class="hurt-vignette"></div>
      <div class="combat-hud">
        <div class="hud-rail hud-rail-tl">
          <div class="hero-hud"><div class="hero-portrait"><span class="hero-face">${face}</span><b id="combat-level">1</b></div><div class="hero-vitals"><div class="hero-heading"><strong>FAÍSCA</strong></div><div class="life-readout">${icon('Heart')}<strong id="combat-hp">100</strong><span id="combat-maxhp">/ 100</span><span id="combat-hp-state">VITALIDADE</span></div><div class="life-gauge" role="progressbar" aria-label="Vida do personagem" aria-valuemin="0" id="combat-life-gauge"><span class="life-ghost" id="combat-life-ghost"></span><span id="combat-life"></span><div class="life-notches"></div></div><div class="combat-xp"><span id="combat-xp-fill"></span></div><div class="hero-subline"><span id="combat-xp-text">0 / 36 XP</span><span id="combat-status">EXPLORADOR DA FENDA</span></div><button class="combat-lives" data-action="build" aria-label="Vidas e compra de vida extra">${icon('HeartPulse')}<b id="combat-lives">1</b><span id="combat-lives-label">VIDAS</span><small id="combat-difficulty">Easy</small></button></div></div>
          <div class="combat-location"><span id="combat-round">01</span><div><small id="combat-objective">SOBREVIVA À HORDA</small><strong id="combat-biome">RUÍNAS DO CREPÚSCULO</strong></div></div>
          <div class="player-status-chips"><span id="combat-ward" hidden>✦ ESCUDO</span><span id="combat-slow" hidden>❄ LENTO · SHIFT</span></div>
        </div>
        <div class="hud-rail hud-rail-tr">
          <div class="loot-hud"><div class="loot-token crystals">${icon('Gem')}<b id="combat-crystals">0</b><span>CRISTAIS</span></div><div class="loot-token">${icon('Skull')}<b id="combat-kills">0</b><span>ABATES</span></div></div>
          <div class="material-hud"><small>MATERIAIS DA EXPEDIÇÃO</small><div class="material-strip">${['scrap', 'cores'].map(id => `<span style="--resource-color:${RESOURCES[id].color}" title="${RESOURCES[id].name}: coleta desta fase">${rpgArt(id)}<b id="combat-${id}">0</b></span>`).join('')}</div></div>
          <div class="combo-hud" id="combo-hud"><strong id="combat-combo">2×</strong><span>CAOS EM CADEIA</span><div><span id="combo-fill"></span></div></div>
        </div>
        <div class="ability-dock"><button class="action-slot bomb-action" data-action="bomb" aria-label="Colocar bomba"><span class="action-key">ESPAÇO</span><span class="action-art" style="--skill-color:#ffab6b">${skillArt('capacity')}</span><span class="action-counter" id="combat-bombs">2/2</span><strong>BOMBA</strong><div class="action-mini" id="combat-bomb-pips"></div></button><button class="action-slot dash-action" data-action="dash" aria-label="Esquivar"><span class="action-key">SHIFT</span><span class="action-art" style="--skill-color:#76ead1">${skillArt('dash')}</span><span class="cooldown-wipe" id="dash-wipe"></span><span class="cooldown-number" id="combat-dash"></span><strong>ESQUIVA</strong><small id="dash-ready-label">PRONTA</small></button><span class="dock-divider"></span><button class="action-slot forge-action" data-action="forge" id="combat-forge" aria-label="Forjar habilidade"><span class="action-key">E</span><span class="forge-rune">${icon('Sparkles')}</span><strong>EVOLUIR</strong><small>${icon('Gem')}<b id="combat-forge-cost">20</b></small></button></div>
        <div class="hud-rail hud-rail-bl">
          <div id="event-feed" class="event-feed" role="status" aria-live="polite"></div>
          <div class="build-hud"><button data-action="build" class="build-heading"><span>${icon('Swords')} SUA BUILD</span><kbd>B</kbd></button><div class="build-runes" id="combat-build"></div><p id="combat-build-hint">SEU PODER COMEÇA AQUI</p></div>
        </div>
        <div class="combat-tools"><div class="zoom-tools"><button class="scene-control" data-action="zoom-out" aria-label="Afastar câmera" title="Afastar câmera">−</button><span>${icon('Crosshair')}</span><button class="scene-control" data-action="zoom-in" aria-label="Aproximar câmera" title="Aproximar câmera">+</button></div><button class="combat-menu-button" data-action="settings" aria-label="Configurações do jogo">${icon('Settings2')}</button><span class="move-hint"><kbd>WASD</kbd> MOVER <kbd>ESC</kbd> PAUSAR</span></div>
      </div><div class="world-overlay" id="world-overlay"><div class="player-tag" id="player-tag"><span id="player-tag-name">VOCÊ</span><div><span id="player-tag-life"></span></div></div></div>
    `);
    this.root = document.querySelector('.combat-hud');
    this.bossBar = document.querySelector('#boss-health');
    insertHTML(this.bossBar, 'afterbegin', '<div class="boss-identity"><span id="boss-title"></span><b id="boss-phase">I · O DESPERTAR</b></div>');
    insertHTML(this.bossBar, 'beforeend', '<div class="boss-attack-readout"><span id="boss-attack-name">OBSERVE OS SINAIS NO CHÃO</span><span id="boss-quote"></span></div><div class="boss-cast-track" aria-hidden="true"><span id="boss-cast-fill"></span></div>');
    // The two act thresholds live inside the track so the player can see how far
    // the guardian is from its next escalation, not only how much life is left.
    insertHTML(this.bossBar.querySelector('.boss-track'), 'beforeend', '<i class="boss-act-mark" style="left:60%"></i><i class="boss-act-mark" style="left:30%"></i>');
    insertHTML(document.querySelector('#combat-build'), 'beforebegin', '<div class="prepared-gear" id="combat-equipment"></div><div class="relic-belt" id="combat-relics"></div>');
    // Fora do combat-hud: precisa cobrir a arena inteira nos momentos narrativos.
    insertHTML(document.querySelector('.arena-card'), 'beforeend', '<div id="cinematic" class="cinematic" role="status" aria-live="polite"></div>');
    this.el = Object.fromEntries([...document.querySelectorAll('.combat-hud [id], .world-overlay [id], #cinematic')].map(el => [el.id, el]));
  }
  /** Restart a one-shot animation class. */
  pop(el, name) { if (!el) return; el.classList.remove(name); void el.offsetWidth; el.classList.add(name); }
  update() {
    const g = this.game, p = g.player, fighting = g.phase !== 'menu';
    document.body.classList.toggle('in-run', fighting);
    document.body.classList.toggle('boss-encounter', !!g.boss && fighting);
    this.bossBar.style.setProperty('--boss-color', g.biome.color);
    this.bossBar.classList.toggle('enraged', !!g.boss?.enraged);
    const act = g.boss?.phase || 1;
    this.bossBar.dataset.act = act;
    setText(document.querySelector('#boss-title'), g.biome.title.toUpperCase());
    setText(document.querySelector('#boss-phase'), PHASE_LABELS[act] || PHASE_LABELS[1]);
    document.body.classList.toggle('low-health', fighting && p.hp > 0 && p.hp / p.maxHp <= .3);
    document.body.classList.toggle('boss-desperation', act >= 3 && !!g.boss && fighting);
    const state = [g.lives, g.difficulty, g.phase, p.hp, p.maxHp, g.xp, g.level, g.crystals, g.kills, g.round, g.relics.join(','), g.bombs.length, Math.ceil(p.dashCooldown * 10), g.forgeCost, g.combo, Math.ceil(g.comboTimer * 10), g.boss?.enraged, act, g.boss?.intent, g.materials.scrap, g.materials.cores, p.ward, p.slow > 0, p.outfit, JSON.stringify(p.equipment)].join(':');
    if (state === this.last) return; this.last = state;
    const e = this.el, ratio = Math.max(0, p.hp / p.maxHp);
    setText(e['combat-lives'], g.lives); setText(e['combat-lives-label'], g.lives === 1 ? 'VIDA' : 'VIDAS'); setText(e['combat-difficulty'], g.challenge.label);
    setText(e['combat-level'], g.level); setText(e['combat-hp'], p.hp); setText(e['combat-maxhp'], `/ ${p.maxHp}`);
    setText(e['combat-hp-state'], ratio <= .3 ? 'VIDA CRÍTICA!' : 'VITALIDADE');
    // The ghost only trails a loss: healing has to read as instant, or the pale
    // bar would sit ahead of the real one and lie about how much life is there.
    e['combat-life'].style.width = `${ratio * 100}%`;
    e['combat-life-ghost'].classList.toggle('instant', ratio >= this.lifeRatio);
    e['combat-life-ghost'].style.width = `${ratio * 100}%`; this.lifeRatio = ratio;
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
    setText(e['combat-objective'], g.boss ? (g.boss.stagger ? 'VULNERÁVEL · ATAQUE AGORA' : g.boss.castTimer ? 'GOLPE PREPARANDO · SAIA DA MARCA' : g.boss.recovery ? 'CONTRA-ATAQUE!' : g.boss.intent === 'reposition' ? 'O GUARDIÃO ABRE DISTÂNCIA' : act >= 3 ? 'ATO III · ELE VAI DAR TUDO' : g.boss.enraged ? 'GUARDIÃO EM FÚRIA' : 'O GUARDIÃO ESTÁ TE CAÇANDO') : 'SOBREVIVA À HORDA');
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
      setText(e['combat-build-hint'], skills.length ? `${skills.length} ${skills.length === 1 ? 'HABILIDADE' : 'HABILIDADES'} · B PARA DETALHES` : 'SEU PODER COMEÇA AQUI');
    }
  }
  // Momento narrativo: ocupa o centro da tela, palavra por palavra, e sai sozinho.
  // Diferente do notice (canto, 3,5s, informativo) -- este interrompe a leitura
  // de proposito, entao so serve para viradas de verdade.
  cinematic(title, subtitle = '', { color = '#ffd39b', kind = '', hold = 2600, footer = '' } = {}) {
    const el = this.el['cinematic']; if (!el) return;
    el.style.setProperty('--cinematic-color', color);
    el.className = 'cinematic' + (kind ? ' ' + kind : '');
    const words = String(title).split(/\s+/).filter(Boolean);
    setHTML(el, '<strong>' + words.map((w, i) => '<i style="--step:' + i + '">' + escapeText(w) + '</i>').join(' ') + '</strong><small></small>' + (footer ? '<em class="cinematic-eco"></em>' : ''));
    setText(el.querySelector('small'), subtitle);
    if (footer) setText(el.querySelector('.cinematic-eco'), footer);
    void el.offsetWidth; el.classList.add('visible');
    clearTimeout(this.cinematicTimer);
    this.cinematicTimer = setTimeout(() => el.classList.remove('visible'), hold + words.length * 70);
  }
  floating(text, x, z, style = 'damage') {
    if (this.floaters.length >= 32) { this.floaters.shift().el.remove(); }
    const el = document.createElement('span'); el.className = `combat-floater ${style}`; setText(el, text);
    document.querySelector('#world-overlay').append(el); this.floaters.push({ el, x, z, age: 0, life: style === 'skill' ? 1.8 : style === 'signature' ? 1.5 : 1 });
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
    if (event.type === 'arena') { for (const f of this.floaters) f.el.remove(); this.floaters = []; this.gained = null; this.el['event-feed'].classList.remove('visible'); this.bossBar.classList.remove('signature', 'casting', 'casting-signature'); this.bossBar.dataset.act = 1; }
    if (event.type === 'enemyHit') this.floating(`−${event.damage}`, event.x, event.z, 'damage');
    if (event.type === 'pickup' && ['heart', 'crystal'].includes(event.entityType)) this.floating(event.entityType === 'heart' ? '+20 ♥' : `+${event.value} ◆`, event.x, event.z, event.entityType === 'heart' ? 'healing' : 'crystal');
    if (event.type === 'pickup' && ['scrap', 'cores'].includes(event.entityType)) this.pop(this.el[`combat-${event.entityType}`].parentElement, 'loot-pop');
    if (event.type === 'blocked') this.floating('BLOQUEADO', event.x, event.z, 'healing');
    if (event.type === 'snared') this.notice('Preso por um instante', 'Use SHIFT para romper a lentidão.', '#a6deed', 'dash');
    if (event.type === 'hurt') { this.floating(`−${event.amount}`, event.x, event.z, 'player-damage'); this.pop(this.root.querySelector('.hero-hud'), 'hud-hurt'); }
    if (event.type === 'skill') { const s = SKILLS.find(s => s.id === event.id); this.gained = s.id; this.notice(s.name, `NV. ${g.skillLevels[s.id]} · ${s.desc}`, s.color, s.id); }
    if (event.type === 'pickup' && event.entityType === 'crystal') this.pop(this.el['combat-crystals'].parentElement, 'loot-pop');
    if (event.type === 'boss') { setText(document.querySelector('#boss-quote'), `“${g.biome.quote}”`); this.bossBar.dataset.act = 1; this.pop(this.bossBar, 'boss-awakens'); this.notice(g.biome.boss, g.biome.title, g.biome.color); }
    if (event.type === 'mastery') this.notice('DESPERTAR · '+event.name,event.desc,event.color,event.id);
    if (event.type === 'arenaRite') this.notice(event.name,event.hint,event.color);
    if (event.type === 'anchorBroken') this.notice('GUARDIÃO ATORDOADO','4s para atacar · +50% de dano','#aaffe0');
    if (event.type === 'warning') { setText(document.querySelector('#boss-attack-name'), event.name); this.bossBar.querySelector('.boss-attack-readout').classList.toggle('signature', !!event.signature); }
    // The three acts drive the bar, not the legacy enraged flag: act II turns it
    // hot, act III is the desperation state the player must read at a glance.
    if (event.type === 'bossPhase') { this.bossBar.dataset.act = event.phase; setText(document.querySelector('#boss-phase'), event.label); this.pop(this.bossBar, 'boss-act-shift'); }
    if (event.type === 'bossSignature') {
      this.bossBar.classList.add('signature'); clearTimeout(this.signatureTimer);
      this.signatureTimer = setTimeout(() => this.bossBar.classList.remove('signature'), (event.duration || 1.2) * 1000 + 500);
      this.floating(`✸ ${event.name}`, event.x, event.z, 'signature');
    }
    if (event.type === 'bossDash') this.floating('⇒ INVESTIDA', event.x, event.z, 'guardian');
    if (event.type === 'bossDodge') this.floating('↯ DESVIOU', event.x, event.z, 'guardian');
    if (event.type === 'bossEnraged') { setText(document.querySelector('#boss-quote'), 'A fenda responde à sua fúria.'); this.notice(`${g.biome.boss} · FÚRIA`, 'Ataques mais rápidos. Observe a preparação.', '#ff8b91'); }
    if (event.type === 'bossEnraged') this.floating('FÚRIA!', event.x, event.z, 'player-damage');
    if (event.type === 'kill' && g.combo > 1) this.pop(this.el['combo-hud'], 'combo-pop');
  }
  frame(dt, scene) {
    if (this.game.phase === 'menu') return;
    const p = scene.projectPlayer(); const tag = this.el['player-tag'];
    tag.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-100%)`;
    const protegido = this.game.player.invincible > .1;
    setText(this.el['player-tag-name'], protegido ? 'VOCÊ ✦' : 'VOCÊ');
    this.el['player-tag']?.classList.toggle('protegido', protegido);
    const cast = this.game.warnings.find(w => w.duration);
    document.querySelector('#boss-cast-fill').style.width = cast ? `${(1 - cast.timer / cast.duration) * 100}%` : '0%';
    this.bossBar.classList.toggle('casting', !!cast);
    this.bossBar.classList.toggle('casting-signature', !!cast?.signature);
    const dashReady = this.game.player.dashCooldown <= 0;
    if (dashReady && this.dashWasCharging) this.pop(this.root.querySelector('.dash-action'), 'dash-recharged');
    this.dashWasCharging = !dashReady;
    const ids = new Set();
    for (const enemy of [...this.game.enemies, ...(this.game.boss ? [this.game.boss] : [])]) {
      if (enemy.hp === enemy.maxHp && !enemy.windup && enemy.intent !== 'evade' && enemy.type !== 'sentinel' && enemy.intent !== 'cast' && !enemy.slow && !enemy.mending && enemy.intent !== 'ambush') continue;
      ids.add(enemy.id);
      if (!this.labels.has(enemy.id)) {
        const el = document.createElement('div'); el.className = 'enemy-tag'; setHTML(el, '<span></span><div><i></i></div>'); document.querySelector('#world-overlay').append(el); this.labels.set(enemy.id, el);
      }
      const el = this.labels.get(enemy.id), pos = scene.projectEntity(enemy);
      el.style.transform = `translate(${pos.x}px,${pos.y}px) translate(-50%,-100%)`;
      setText(el.firstElementChild, enemy.mending ? '✦ CURANDO A HORDA' : enemy.intent === 'ambush' ? '⚠ EMBOSCADA' : enemy.windup ? '⚠ INVESTIDA' : enemy.slow ? '❄ LENTO' : enemy === this.game.champion ? '★ CAMPEÃO' : enemy.type === 'sentinel' ? '◆ SENTINELA' : enemy.intent === 'cast' ? '✦ CONJURANDO' : enemy.intent === 'evade' ? '↗' : '');
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
