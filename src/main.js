import '@fontsource/oxanium/latin-500.css';
import '@fontsource/oxanium/latin-600.css';
import '@fontsource/oxanium/latin-700.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import { createIcons, Bomb, Flame, Expand, Heart, Wind, Magnet, Timer, Zap, HeartPulse, Droplets, ArrowUpRight, ArrowRight, ChevronRight, Gem, Skull, Trophy, Swords, Shield, LockKeyhole, Plus, Volume2, VolumeX, Maximize, Minimize, Settings2, Pause, Play, X, RotateCcw, BookOpen, Sparkles, CircleHelp, MoveUp, MoveDown, MoveLeft, MoveRight, Check, Target, Infinity as InfinityIcon, Crosshair, Sprout } from 'lucide';
import { Game, SKILLS, ROUND_SECONDS } from './game.js';
import { ArenaScene } from './scene.js';
import { bossSources } from './boss-sources.js';
import { Sound } from './audio.js';
import { GameHud } from './hud.js';
import { skillArt, skillPreview } from './skill-art.js';
import { Atlas } from './atlas.js';
import { relicById } from './campaign.js';
import { LocalRanking } from './ranking.js';
import { LaunchScreen } from './launch.js';
import './style.css';
import './game-hud.css';
import './atlas.css';
import './juice.css';

const ICONS = { Bomb, Flame, Expand, Heart, Wind, Magnet, Timer, Zap, HeartPulse, Droplets, ArrowUpRight, ArrowRight, ChevronRight, Gem, Skull, Trophy, Swords, Shield, LockKeyhole, Plus, Volume2, VolumeX, Maximize, Minimize, Settings2, Pause, Play, X, RotateCcw, BookOpen, Sparkles, CircleHelp, MoveUp, MoveDown, MoveLeft, MoveRight, Check, Target, Infinity: InfinityIcon, Crosshair, Sprout };
const icon = (name, cls = '') => `<i data-lucide="${name}" class="${cls}" aria-hidden="true"></i>`;
const icons = () => createIcons({ icons: ICONS, attrs: { 'stroke-width': 1.7 } });
const $ = s => document.querySelector(s);
const defaults = { shards: 0, health: 0, power: 0, bestRound: 0, bestKills: 0, runs: 0, unlockedStage: 1 };
let meta;
try { const saved = JSON.parse(localStorage.getItem('bomb-rift-v1') || '{}'); meta = { ...defaults }; for (const key of Object.keys(defaults)) if (Number.isFinite(saved[key])) meta[key] = Math.max(0, Math.floor(saved[key])); } catch { meta = { ...defaults }; }
const game = new Game({ meta }); const sound = new Sound(); const keys = new Set();
let rankingStorage; try { rankingStorage = localStorage; } catch {}
const ranking = new LocalRanking(rankingStorage); let lastRunScore = null;
let scene, fatal = false, modalType = null, returnFocus = null, saveWarning = false;
let highQuality = true, reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const avatar = `<svg viewBox="0 0 110 120" class="avatar-art" aria-hidden="true"><defs><linearGradient id="helm" x2="0" y2="1"><stop stop-color="#fffaf0"/><stop offset="1" stop-color="#b7aaa7"/></linearGradient><linearGradient id="suit" x2="0" y2="1"><stop stop-color="#ffaf64"/><stop offset="1" stop-color="#d36a38"/></linearGradient></defs><ellipse cx="55" cy="109" rx="32" ry="7" fill="#100f14" opacity=".4"/><path d="M37 93v15h15V94m7 0v14h16V93" stroke="#302b35" stroke-width="7" fill="#ed9357"/><rect x="32" y="63" width="47" height="34" rx="13" fill="url(#suit)"/><rect x="37" y="86" width="37" height="9" rx="3" fill="#4a3741"/><rect x="50" y="86" width="10" height="9" rx="2" fill="#ffcf89"/><rect x="18" y="69" width="18" height="20" rx="8" fill="url(#helm)"/><rect x="76" y="69" width="18" height="20" rx="8" fill="url(#helm)"/><rect x="23" y="23" width="65" height="49" rx="19" fill="url(#helm)"/><rect x="29" y="40" width="53" height="25" rx="9" fill="#312b38"/><rect x="34" y="44" width="43" height="17" rx="6" fill="#ffd4aa"/><rect x="43" y="46" width="4" height="11" rx="2" fill="#312b38"/><rect x="63" y="46" width="4" height="11" rx="2" fill="#312b38"/><path d="M55 26V18" stroke="#e9b47f" stroke-width="6"/><circle cx="55" cy="13" r="9" fill="#ffab59"/><path d="M31 31q12-7 24-4" fill="none" stroke="#fff" stroke-width="3" opacity=".8"/></svg>`;

$('#app').innerHTML = `
  <header class="site-header">
    <a class="brand" href="#" aria-label="BOMB RIFT, início"><span class="brand-mark">${icon('Bomb')}</span><span>BOMB<span class="brand-rift">RIFT</span><small>ROGUELIKE SURVIVAL</small></span></a>
    <nav aria-label="Navegação principal"><button class="nav-link active" data-action="explore">${icon('Crosshair')} Explorar</button><button class="nav-link" data-action="meta">${icon('Sprout')} Evolução</button><button class="nav-link" data-action="guide">${icon('BookOpen')} Como jogar</button></nav>
    <div class="header-actions"><span class="version"><span class="status-dot"></span> V.2.0</span><span class="header-divider"></span><button class="icon-button" id="sound-button" data-action="sound" aria-label="Desativar som" title="Som">${icon('Volume2')}</button><button class="icon-button" data-action="settings" aria-label="Configurações" title="Configurações">${icon('Settings2')}</button></div>
  </header>
  <main>
    <section class="page-heading"><div><div class="eyebrow"><span class="little-line"></span> A MASMORRA NUNCA É A MESMA</div><h1>Uma nova run. <span>Infinitas possibilidades.</span></h1></div><div class="record"><span class="record-icon">${icon('Trophy')}</span><div><span class="micro">SEU RECORDE</span><strong id="record-round">${meta.bestRound ? `RODADA ${String(meta.bestRound).padStart(2, '0')}` : 'A HISTÓRIA É SUA'}</strong></div></div></section>
    <div class="game-layout">
      <section class="arena-card" aria-label="Arena do jogo">
        <div id="scene"></div><div class="arena-vignette"></div>
        <div class="arena-top"><div class="arena-location"><span class="location-icon">${icon('Swords')}</span><div><span class="micro" id="round-label">EXPEDIÇÃO · RODADA 01</span><h2 id="biome-name">Ruínas do crepúsculo</h2></div></div><div class="arena-controls"><span class="live-label" id="live-label"><span class="status-dot"></span> PRONTO PARA ENTRAR</span><button class="scene-control" id="pause-button" data-action="pause" aria-label="Pausar jogo" disabled>${icon('Pause')}</button><button class="scene-control" data-action="fullscreen" aria-label="Tela cheia">${icon('Maximize')}</button></div></div>
        <div class="round-timer"><span class="micro" id="timer-caption">O CHEFE DESPERTA EM</span><div id="timer">02<span>:</span>00</div><div class="timer-track"><span id="timer-fill"></span></div></div>
        <div class="boss-health hidden" id="boss-health"><div>${icon('Skull')}<span id="boss-name"></span><b id="boss-hp"></b></div><div class="boss-track"><span id="boss-fill"></span></div></div>
        <div class="arena-corner-label"><span class="corner-cross">+</span><span id="biome-tag">UM LUGAR ESQUECIDO PELO TEMPO</span></div>
        <div class="floating-message" id="floating-message" role="status"></div>
        <div class="start-banner" id="start-banner"><div><span class="eyebrow orange">O DESCONHECIDO ESPERA</span><h3>Acenda o pavio. <span>Desafie o infinito.</span></h3><p>Destrua. Colete. Evolua. E tente voltar inteiro.</p></div><button class="primary-button" data-action="start">Iniciar expedição ${icon('ArrowUpRight')}<small>ENTER</small></button></div>
        <div class="in-game-bottom hidden" id="in-game-bottom"><span>${icon('Gem')} Cristais alimentam sua evolução</span><div class="bomb-indicator"><span id="bomb-slots"></span><span>BOMBAS</span></div><span class="dash-indicator" id="dash-status">${icon('Zap')} ESQUIVA PRONTA</span></div>
        <div class="mobile-controls" id="mobile-controls"><div class="dpad"><button data-move="0,-1" aria-label="Mover para cima">${icon('MoveUp')}</button><button data-move="-1,0" aria-label="Mover para esquerda">${icon('MoveLeft')}</button><button data-move="0,1" aria-label="Mover para baixo">${icon('MoveDown')}</button><button data-move="1,0" aria-label="Mover para direita">${icon('MoveRight')}</button></div><div class="touch-actions"><button data-action="dash" aria-label="Esquivar">${icon('Zap')}</button><button data-action="bomb" aria-label="Colocar bomba">${icon('Bomb')}</button></div></div>
      </section>
      <aside class="character-panel">
        <section class="character-section"><div class="panel-label">SEU EXPLORADOR <span class="level-pill" id="level-pill">NV. 01</span></div><div class="character-profile"><div class="avatar-wrap">${avatar}<span class="avatar-spark s1">+</span><span class="avatar-spark s2">+</span></div><div><span class="micro orange">O PEQUENO CAOS</span><h2>Faísca</h2><span class="class-badge">${icon('Bomb')} Especialista em demolição</span></div></div><div class="health-heading"><span>${icon('Heart')} Vitalidade</span><strong id="hp-label">100 <span>/ 100</span></strong></div><div class="health-track"><span id="hp-fill"></span></div><div class="xp-heading"><span id="xp-label">0 / 36 XP</span><span>PRÓXIMO NÍVEL ${icon('ChevronRight')}</span></div><div class="xp-track"><span id="xp-fill"></span></div></section>
        <section class="resource-section"><div class="resource-item"><span class="resource-icon crystal">${icon('Gem')}</span><div><strong id="crystal-count">0</strong><span>CRISTAIS</span></div><span class="resource-plus">+</span></div><div class="resource-item"><span class="resource-icon kills">${icon('Skull')}</span><div><strong id="kill-count">0</strong><span>ABATES</span></div></div></section>
        <section class="arsenal-section"><div class="panel-label">SEU ARSENAL <span class="subtle">01</span></div><div class="weapon-card"><span class="weapon-icon">${icon('Bomb')}</span><div><strong>Bomba de pulso</strong><span>O começo de uma bela destruição.</span></div><span class="weapon-level">I</span></div><div class="weapon-stats"><div>${icon('Flame')}<strong id="damage-stat">2</strong><span>DANO</span></div><div>${icon('Expand')}<strong id="range-stat">2</strong><span>ALCANCE</span></div><div>${icon('Bomb')}<strong id="capacity-stat">2</strong><span>BOMBAS</span></div></div></section>
        <section class="build-section"><div class="panel-label">SUA BUILD <span id="build-count" class="subtle">0 HABILIDADES</span></div><div id="skill-list" class="skill-list"><div class="empty-build"><div class="empty-slots">${[0, 1, 2, 3].map(() => `<span>${icon('Plus')}</span>`).join('')}</div><p>Cada escolha cria um novo caminho.</p></div></div><button id="forge-button" class="forge-button" data-action="forge" disabled><span>${icon('Sparkles')} Forjar habilidade</span><span>${icon('Gem')} <b id="forge-cost">20</b></span></button></section>
        <button class="legacy-card" data-action="meta"><span class="legacy-icon">${icon('Sprout')}</span><span><strong>O fim também é um começo.</strong><small>Evoluções permanentes ${icon('ArrowUpRight')}</small></span></button>
      </aside>
    </div>
    <footer class="game-footer"><div class="keyboard-guide"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Mover</span><span><kbd class="space-key">ESPAÇO</kbd> Bomba</span><span><kbd>SHIFT</kbd> Esquiva</span><span><kbd>E</kbd> Evoluir</span><span><kbd>ESC</kbd> Pausar</span></div><span class="endless-label">${icon('Infinity')} SEM FIM. SEM DUAS RUNS IGUAIS.</span></footer>
  </main>
  <div class="modal-root hidden" id="modal-root"></div><div class="toast" id="toast" role="status"></div>
`;
const hud = new GameHud(game, { icon, icons, avatar });
const atlas = new Atlas(game, { icon, icons, bossSources });
const launch = new LaunchScreen(game, atlas, ranking, { icon, icons, avatar }); launch.show();
document.body.classList.toggle('reduced-motion', reducedMotion);
document.body.insertAdjacentHTML('beforeend', '<div class="relic-notice" id="relic-notice" role="status"></div>');
icons();

function saveMeta() { try { localStorage.setItem('bomb-rift-v1', JSON.stringify(meta)); } catch { saveWarning = true; toast('O navegador não permitiu salvar a evolução. Ela continuará disponível nesta sessão.'); } }
function toast(text) { $('#toast').textContent = text; $('#toast').classList.add('visible'); clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').classList.remove('visible'), 3300); }
function announce(text, kind = '') { hud.notice(text, '', kind === 'danger' ? '#ff8e9c' : '#ffd39b'); }
function claimRun() { if (game.claimResult()) { lastRunScore = ranking.record(game); saveMeta(); } }
function scoreCard() { return lastRunScore ? `<div class="score-result"><div>${lastRunScore.place ? `${String(lastRunScore.place).padStart(2, '0')}º NO SEU RANKING` : 'RESULTADO DA EXPEDIÇÃO'}<small>${ranking.saved ? 'Salvo neste navegador' : 'Válido nesta sessão'} · abates, coleta e conquista</small></div><strong>${lastRunScore.score.toLocaleString('pt-BR')} <small>PTS</small></strong></div>` : ''; }
function closeModal() { $('#modal-root').classList.add('hidden'); $('#modal-root').innerHTML = ''; modalType = null; returnFocus?.focus?.(); }
function modal(type, content, { wide = false, closable = true } = {}) {
  if (type === 'dead' || type === 'intermission') content = content.replace('<button class="primary-button', `${scoreCard()}<button class="primary-button`) + `<button class="text-button" data-action="home">${icon('Trophy')} Menu inicial e ranking</button>`;
  keys.clear(); if (!modalType) returnFocus = document.activeElement; modalType = type;
  $('#modal-root').innerHTML = `<section class="modal modal-${type} ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title">${closable ? `<button class="modal-close icon-button" data-action="close-modal" aria-label="Fechar">${icon('X')}</button>` : ''}${content}</section>`;
  $('#modal-root').classList.remove('hidden'); icons(); $('#modal-root button:not(:disabled)')?.focus();
}
function resume() { closeModal(); if (game.phase === 'paused') game.pause(); updateHud(); }
function start() {
  if (fatal) return;
  if (!game.start(atlas.selected)) return;
  closeModal(); sound.init(); launch.hide(); atlas.hide(); keys.clear(); scene.preview?.clear(); lastRunScore = null;
  $('#start-banner').classList.add('hidden'); $('#in-game-bottom').classList.remove('hidden');
  $('#mobile-controls').classList.add('running'); $('#pause-button').disabled = false;
  updateBuild(); updateHud(); scene.resize(); announce(`${game.stage.name.toUpperCase()} · ${game.biome.boss} ESTÁ OBSERVANDO`);
}
function returnToMap() {
  claimRun(); closeModal(); keys.clear(); touchMove = null; launch.hide();
  game.returnToMap(); atlas.show(Math.max(game.round, meta.unlockedStage || 1));
  $('#mobile-controls').classList.remove('running'); $('#relic-notice').classList.remove('visible'); updateBuild(); updateHud();
}
function showRelic(id) {
  const r = relicById(id); hud.notice(r.name, `${r.rarity} · EQUIPADA`, r.color, r.art);
}
function pauseForModal() { if (game.active) game.pause(); }
function showPause() {
  modal('pause', `<div class="modal-emblem">${icon('Pause')}</div><span class="eyebrow orange">RESPIRE. O CAOS PODE ESPERAR.</span><h2 id="modal-title">Pavio em pausa.</h2><p>A sua expedição está exatamente onde você deixou.</p><button class="primary-button full-width" data-action="resume">Continuar expedição ${icon('Play')}</button><button class="text-button" data-action="guide">Relembrar os controles</button><button class="text-button" data-action="abandon">Encerrar esta fase e voltar ao atlas</button>`, { closable: true });
}
function showGuide() {
  pauseForModal();
  modal('guide', `<span class="eyebrow orange">MANUAL DO PEQUENO CAOS</span><h2 id="modal-title">Um pavio. Muitas possibilidades.</h2><p>Sobreviva por <b>2 minutos</b>, derrote o chefe e atravesse a próxima fenda. A masmorra muda, a dificuldade aumenta e cada fase começa com uma build nova. Suas melhorias permanentes ficam.</p><div class="guide-grid"><div><span>${icon('Bomb')}</span><h3>Abra o caminho</h3><p>Bombas explodem em cruz. Caixas são destruídas, pedras bloqueiam o fogo e outras bombas explodem em cadeia. <b>Suas explosões também machucam você.</b></p></div><div><span>${icon('Gem')}</span><h3>Transforme o caos</h3><p>Recolha cristais para ganhar XP. Cada nível dá uma habilidade grátis. Use cristais para forjar outras escolhas com <b>E</b>.</p></div><div><span>${icon('Zap')}</span><h3>Tenha uma saída</h3><p>Use <b>Shift</b> para avançar até 3 casas na direção em que está olhando, com invulnerabilidade breve. Paredes bloqueiam a esquiva.</p></div><div><span>${icon('Skull')}</span><h3>Encare o guardião</h3><p>Quando o tempo terminar, o chefe aparece. Fuja das casas vermelhas e use bombas. A vitória desbloqueia a próxima fase e salva essências. Volte ao atlas para investir no seu legado.</p></div></div><div class="guide-controls"><span><kbd>W A S D</kbd> ou <kbd>↑ ← ↓ →</kbd> mover pela grade</span><span><kbd>ESPAÇO</kbd> colocar bomba</span><span><kbd>ESC / P</kbd> pausar</span></div><p class="small-note">Cada 5 abates rendem 1 essência. Minichefes rendem 3 e uma relíquia. Cada fase mostra a recompensa do seu guardião no atlas. Compre melhorias permanentes na aba Evolução. O progresso é salvo neste navegador.</p><button class="primary-button full-width" data-action="close-modal">Entendi. Vamos nessa. ${icon('ArrowRight')}</button>`, { wide: true });
}
function showUpgrade() {
  modal('upgrade', `<div class="upgrade-sigil">${icon('Sparkles')}</div><span class="eyebrow orange">${game.upgradeCost ? 'A FORJA RESPONDEU AO SEU CHAMADO' : `NÍVEL ${game.level} · PODER DESPERTADO`}</span><h2 id="modal-title">Escolha sua evolução.</h2><p>Três caminhos. Uma escolha. Faça a fenda lembrar de você.</p><div class="skill-options">${game.offers.map((skill, i) => `<button class="skill-option" data-skill="${skill.id}" style="--skill-color:${skill.color}"><span class="skill-option-top"><span>${icon(skill.icon)} ${skill.branch}</span><kbd>${i + 1}</kbd></span><span class="skill-option-icon">${skillArt(skill.id)}</span><h3>${skill.name}</h3><p>${skill.desc}</p>${skillPreview(game, skill.id)}<span class="skill-option-bottom"><span>◆ NÍVEL ${(game.skillLevels[skill.id] || 0) + 1}</span> ${icon('ArrowUpRight')}</span></button>`).join('')}</div><div class="upgrade-footer"><span>${icon('Gem')} ${game.crystals} cristais</span><button class="secondary-button" data-action="reroll" ${game.crystals < 6 ? 'disabled' : ''}>${icon('RotateCcw')} Sortear novamente <b>6 ${icon('Gem')}</b></button></div><span class="upgrade-pause-note">TEMPO SUSPENSO · ESCOLHA COM CALMA</span>`, { wide: true, closable: false });
}
function showBuild() {
  pauseForModal();
  const entries = SKILLS.filter(s => game.skillLevels[s.id]);
  modal('build', `<span class="eyebrow orange">ARSENAL DA FASE ${game.round} · NÍVEL ${game.level}</span><h2 id="modal-title">Seu tipo de caos.</h2><div class="build-summary"><span>${icon('Flame')} ${game.player.damage} DANO</span><span>${icon('Expand')} ${game.player.range} ALCANCE</span><span>${icon('Bomb')} ${game.player.capacity} BOMBAS</span></div><div class="relic-codex">${game.relics.map(id => { const r = relicById(id); return `<div class="relic-entry" style="--skill-color:${r.color}">${skillArt(r.art)}<div><h3>${r.name}${id === 'phoenix' && !game.player.revive ? ' · consumida' : ''}</h3><p>${r.desc}</p></div></div>`; }).join('')}</div><div class="equipped-skills">${entries.length ? entries.map(s => `<div class="equipped-skill" style="--skill-color:${s.color}">${skillArt(s.id)}<div><small>${s.branch} · NV. ${game.skillLevels[s.id]}</small><h3>${s.name}</h3><p>${s.desc}</p></div></div>`).join('') : '<p>Suba de nível ou colete cristais para forjar habilidades. Destrua o baú dourado e vença minichefes para encontrar relíquias.</p>'}</div><p class="small-note">Esta build dura só esta fase. Suas melhorias permanentes continuam na próxima.</p><button class="primary-button full-width" data-action="close-modal">Voltar ao combate ${icon('Swords')}</button>`, { wide: true });
}
function showIntermission() {
  modal('intermission', `<div class="modal-emblem victory">${icon('Trophy')}</div><span class="eyebrow orange">${game.biome.boss} CAIU. SEU LEGADO CRESCE.</span><h2 id="modal-title">${game.round % 9 === 0 ? 'O infinito se abre.' : game.stage.local === 3 ? 'Um mundo conquistado.' : 'Uma fenda a menos.'}</h2><p>${game.stage.name} concluída. ${game.round % 9 === 0 ? 'Uma nova ascensão foi desbloqueada. Os três mundos retornam com inimigos mais fortes.' : `A fase ${game.round + 1} está disponível no atlas.`}</p><div class="results-row"><div><strong>${game.kills}</strong><span>ABATES</span></div><div><strong>${game.relics.length}</strong><span>RELÍQUIAS ENCONTRADAS</span></div><div><strong>+${game.earnedShards}</strong><span>ESSÊNCIAS SALVAS</span></div></div><p class="victory-map-note">Sua build cumpriu seu destino. <b>Skills, relíquias e cristais reiniciam na próxima fase.</b> Suas essências e evoluções permanentes continuam com você.</p><button class="primary-button full-width" data-action="world-map">Voltar ao atlas ${icon('ArrowUpRight')}</button><button class="text-button" data-action="meta">Investir em evolução permanente ${icon('Sprout')}</button>`, { closable: false });
}
function showDead() {
  modal('dead', `<div class="modal-emblem">${icon('Skull')}</div><span class="eyebrow orange">TODA LENDA COMEÇA COM ALGUMAS EXPLOSÕES.</span><h2 id="modal-title">O pavio apagou.<br><span>A faísca continua.</span></h2><p>Sua build ficou na fenda. As essências e as evoluções permanentes vieram com você.</p><div class="results-row"><div><strong>${String(game.round).padStart(2, '0')}</strong><span>RODADA</span></div><div><strong>${game.kills}</strong><span>ABATES</span></div><div><strong>+${game.earnedShards}</strong><span>ESSÊNCIAS</span></div></div><button class="primary-button full-width" data-action="start">Mais uma expedição ${icon('RotateCcw')}</button><button class="secondary-button full-width" data-action="world-map">Voltar ao atlas ${icon('ArrowRight')}</button><button class="text-button" data-action="meta">Investir em evolução permanente ${icon('Sprout')}</button>`, { closable: false });
}
function showMeta() {
  pauseForModal();
  modal('meta', `<span class="eyebrow orange">ALGO SEMPRE VOLTA COM VOCÊ</span><h2 id="modal-title">Cultive a sua faísca.</h2><p>Essências sobrevivem ao fim da expedição. Melhorias permanentes entram em ação na sua <b>próxima fase</b>.</p><div class="essence-wallet">${icon('Sprout')}<strong>${meta.shards}</strong><span>ESSÊNCIAS</span></div><div class="meta-upgrades">${[
    { id: 'health', name: 'Raízes da vida', icon: 'Heart', desc: '+10 de vida inicial por nível.', cost: 5 + meta.health * 5, max: 10 },
    { id: 'power', name: 'Chama ancestral', icon: 'Flame', desc: '+1 de dano inicial por nível.', cost: 12 + meta.power * 12, max: 5 },
  ].map(u => `<div class="meta-upgrade"><span class="meta-upgrade-icon">${icon(u.icon)}</span><div><h3>${u.name} <small>${meta[u.id]}/${u.max}</small></h3><p>${u.desc}</p></div><button class="secondary-button" data-meta="${u.id}" ${meta[u.id] >= u.max || meta.shards < u.cost ? 'disabled' : ''}>${meta[u.id] >= u.max ? 'MÁX.' : `${u.cost} ${icon('Sprout')}`}</button></div>`).join('')}</div><p class="small-note">Ganhe essências vencendo guardiões, minichefes e a cada 5 abates. Elas são creditadas ao vencer ou morrer. ${saveWarning ? 'Salvamento indisponível: progresso válido nesta sessão.' : 'Seu progresso fica salvo automaticamente neste navegador.'}</p><button class="primary-button full-width" data-action="close-modal">${game.phase === 'dead' ? 'Voltar aos resultados' : 'Voltar à expedição'} ${icon('ArrowRight')}</button>`);
}
function showSettings() {
  pauseForModal();
  modal('settings', `<span class="eyebrow orange">DO SEU JEITO</span><h2 id="modal-title">Ajuste a experiência.</h2><div class="setting-row"><div><h3>Efeitos sonoros</h3><p>Explosões, cristais e pequenas vitórias.</p></div><button class="toggle ${sound.enabled ? 'on' : ''}" data-setting="sound" role="switch" aria-checked="${sound.enabled}" aria-label="Efeitos sonoros"><span></span></button></div><div class="setting-row"><div><h3>Qualidade visual</h3><p>Sombras suaves e brilho dos cristais.</p></div><button class="toggle ${highQuality ? 'on' : ''}" data-setting="quality" role="switch" aria-checked="${highQuality}" aria-label="Qualidade visual alta"><span></span></button></div><div class="setting-row"><div><h3>Reduzir movimento</h3><p>Sem tremor de câmera e com menos partículas.</p></div><button class="toggle ${reducedMotion ? 'on' : ''}" data-setting="motion" role="switch" aria-checked="${reducedMotion}" aria-label="Reduzir movimento"><span></span></button></div><button class="primary-button full-width" data-action="close-modal">Tudo pronto ${icon('Check')}</button>`);
  const row = document.createElement('div'); row.className = 'music-settings';
  row.innerHTML = `<div class="setting-row"><div><h3>Trilha musical</h3><p>Temas próprios para cada mundo e seus guardiões.</p></div><button class="toggle ${sound.musicEnabled ? 'on' : ''}" data-setting="music" role="switch" aria-checked="${sound.musicEnabled}" aria-label="Trilha musical"><span></span></button></div><div class="setting-row"><div><h3>Volume da música</h3><p>Deixe as explosões em primeiro plano.</p></div><label><input class="music-volume" type="range" min="0" max="100" value="${Math.round(sound.volume * 100)}" aria-label="Volume da música"><output class="setting-volume-value">${Math.round(sound.volume * 100)}%</output></label></div>`;
  $('#modal-root .setting-row').after(row);
  row.querySelector('input').addEventListener('input', e => { sound.volume = Number(e.target.value) / 100; sound.save(); row.querySelector('output').textContent = `${e.target.value}%`; });
}
function updateBuild() {
  const entries = SKILLS.filter(s => game.skillLevels[s.id]);
  $('#build-count').textContent = `${entries.length} HABILIDADE${entries.length === 1 ? '' : 'S'}`;
  if (!entries.length) $('#skill-list').innerHTML = `<div class="empty-build"><div class="empty-slots">${[0, 1, 2, 3].map(() => `<span>${icon('Plus')}</span>`).join('')}</div><p>Cada escolha cria um novo caminho.</p></div>`;
  else $('#skill-list').innerHTML = entries.map(s => `<div class="build-skill" style="--skill-color:${s.color}" title="${s.desc}"><span>${icon(s.icon)}</span><strong>${s.name}</strong><b>${game.skillLevels[s.id]}</b></div>`).join('');
  icons();
}
let lastHud = '';
function updateHud() {
  hud.update();
  const p = game.player, remaining = Math.max(0, Math.ceil(ROUND_SECONDS - game.elapsed));
  const stamp = [remaining, game.phase, p.hp, p.maxHp, game.xp, game.crystals, game.kills, game.bombs.length, Math.ceil(p.dashCooldown * 10), game.boss?.hp, game.round, game.level, game.forgeCost].join('/');
  if (stamp === lastHud) return; lastHud = stamp;
  $('#timer').innerHTML = `${String(Math.floor(remaining / 60)).padStart(2, '0')}<span>:</span>${String(remaining % 60).padStart(2, '0')}`;
  $('#timer').classList.toggle('urgent', remaining <= 20 && remaining > 0);
  $('#timer-fill').style.width = `${remaining / 120 * 100}%`;
  $('#timer-caption').textContent = game.boss ? 'O GUARDIÃO DESPERTOU' : 'O CHEFE DESPERTA EM';
  $('#hp-label').innerHTML = `${p.hp} <span>/ ${p.maxHp}</span>`; $('#hp-fill').style.width = `${p.hp / p.maxHp * 100}%`;
  $('#hp-fill').classList.toggle('low', p.hp < p.maxHp * .3);
  $('#xp-label').textContent = `${game.xp} / ${game.nextXp} XP`; $('#xp-fill').style.width = `${game.xp / game.nextXp * 100}%`;
  $('#level-pill').textContent = `NV. ${String(game.level).padStart(2, '0')}`;
  $('#crystal-count').textContent = game.crystals; $('#kill-count').textContent = game.kills;
  $('#damage-stat').textContent = p.damage; $('#range-stat').textContent = p.range; $('#capacity-stat').textContent = p.capacity;
  $('#forge-cost').textContent = game.forgeCost; $('#forge-button').disabled = !game.active || game.crystals < game.forgeCost;
  $('#forge-button').title = game.crystals < game.forgeCost ? `Colete mais ${game.forgeCost - game.crystals} cristais para forjar uma habilidade` : 'Sortear 3 habilidades e escolher uma (E)';
  $('#round-label').textContent = `EXPEDIÇÃO · RODADA ${String(game.round).padStart(2, '0')}`; $('#biome-name').textContent = game.biome.name; $('#biome-tag').textContent = game.biome.tag;
  const status = { menu: 'PRONTO PARA ENTRAR', playing: 'SOBREVIVA À HORDA', boss: 'DERROTE O GUARDIÃO', paused: 'EXPEDIÇÃO EM PAUSA', upgrade: 'ESCOLHA SUA EVOLUÇÃO', intermission: 'FENDA CONQUISTADA', dead: 'EXPEDIÇÃO ENCERRADA' };
  $('#live-label').innerHTML = `<span class="status-dot ${game.active ? 'live' : ''}"></span> ${status[game.phase]}`;
  $('#boss-health').classList.toggle('hidden', !game.boss);
  if (game.boss) { $('#boss-name').textContent = game.boss.name; $('#boss-hp').textContent = `${game.boss.hp} / ${game.boss.maxHp}`; $('#boss-fill').style.width = `${game.boss.hp / game.boss.maxHp * 100}%`; }
  $('#bomb-slots').innerHTML = Array.from({ length: p.capacity }, (_, i) => `<span class="bomb-pip ${i < p.capacity - game.bombs.length ? 'ready' : ''}"></span>`).join('');
  $('#dash-status').innerHTML = `${icon('Zap')} ${p.dashCooldown > 0 ? `ESQUIVA ${p.dashCooldown.toFixed(1)}s` : 'ESQUIVA PRONTA'}`;
  $('#pause-button').disabled = !game.active && game.phase !== 'paused'; icons();
}

function handleEvents() {
  for (const event of game.drainEvents()) {
    scene?.handle(event); hud.handle(event); sound.play(event.type);
    if (event.type === 'upgrade') showUpgrade();
    if (event.type === 'skill') { closeModal(); updateBuild(); }
    if (event.type === 'bossDefeated') { claimRun(); showIntermission(); }
    if (event.type === 'miniboss') announce('SENTINELA DA FENDA · RELÍQUIA GARANTIDA', 'danger');
    if (event.type === 'miniDefeated') announce('SENTINELA DERROTADO · COLETE A RELÍQUIA');
    if (event.type === 'relic') { showRelic(event.id); sound.play('skill'); }
    if (event.type === 'revive') { announce('ÚLTIMA FAÍSCA · VOCÊ RENASCEU'); sound.play('skill'); }
    if (event.type === 'hurt') { $('.arena-card').classList.add('hit'); setTimeout(() => $('.arena-card').classList.remove('hit'), 230); }
    if (event.type === 'dead') {
      claimRun();
      $('#record-round').textContent = `RODADA ${String(meta.bestRound).padStart(2, '0')}`; showDead();
    }
    if (event.type === 'nextRound') announce(`RODADA ${game.round} · ${game.biome.name.toUpperCase()}`);
  }
}

const actions = {
  start,
  atlas() { launch.hide(); atlas.show(); },
  home() { if (game.active || game.phase === 'upgrade') return; claimRun(); closeModal(); game.returnToMap(); $('#mobile-controls').classList.remove('running'); updateHud(); launch.show(); },
  taunt() { atlas.bossPreview?.taunt(); sound.play('boss'); },
  music() { const wasReady = !!sound.ctx; sound.init(); if (wasReady) sound.musicEnabled = !sound.musicEnabled; sound.save(); },
  'world-map': returnToMap,
  abandon() { game.die(); handleEvents(); returnToMap(); },
  explore() { if (modalType === 'upgrade' || modalType === 'intermission') return; if (game.phase === 'dead') showDead(); else resume(); },
  guide: showGuide, settings: showSettings, meta: showMeta, build: showBuild,
  'zoom-in'() { scene?.adjustZoom(.12); },
  'zoom-out'() { scene?.adjustZoom(-.12); },
  pause() { if (game.active) { game.pause(); showPause(); } else if (game.phase === 'paused') resume(); },
  resume,
  'close-modal'() { const phase = game.phase; closeModal(); if (phase === 'dead') showDead(); else if (phase === 'intermission') showIntermission(); else if (phase === 'paused') game.pause(); else if (phase === 'menu') { if (!launch.root.hidden) launch.render(); else atlas.render(); } },
  bomb() { sound.init(); game.plantBomb(); }, dash() { game.dash(); },
  forge() { if (!game.openUpgrade(true) && game.active) toast(`Colete ${game.forgeCost} cristais para forjar uma habilidade.`); },
  reroll() { game.reroll(); },
  'next-round': returnToMap,
  sound() { sound.init(); sound.muted = !sound.muted; $('#sound-button').innerHTML = icon(sound.muted ? 'VolumeX' : 'Volume2'); $('#sound-button').setAttribute('aria-label', sound.muted ? 'Ativar som' : 'Desativar som'); icons(); },
  async fullscreen() { try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); else await document.exitFullscreen(); } catch { toast('Tela cheia indisponível neste navegador. Abra o jogo em uma aba própria.'); } },
};
document.addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button || button.disabled) return;
  if (button.dataset.action !== 'music') sound.init();
  if (button.dataset.action) actions[button.dataset.action]?.();
  if (button.dataset.skill) game.chooseSkill(button.dataset.skill);
  if (button.dataset.meta) {
    const id = button.dataset.meta, max = id === 'health' ? 10 : 5, cost = id === 'health' ? 5 + meta.health * 5 : 12 + meta.power * 12;
    if (meta.shards >= cost && meta[id] < max) { meta.shards -= cost; meta[id]++; saveMeta(); showMeta(); toast('Evolução permanente adquirida. Ativa na próxima expedição.'); }
  }
  if (button.dataset.setting) {
    if (button.dataset.setting === 'sound') { sound.enabled = !sound.enabled; sound.save(); }
    if (button.dataset.setting === 'music') { sound.musicEnabled = !sound.musicEnabled; sound.save(); }
    if (button.dataset.setting === 'quality') { highQuality = !highQuality; scene?.setQuality(highQuality); }
    if (button.dataset.setting === 'motion') { reducedMotion = !reducedMotion; if (scene) scene.reducedMotion = reducedMotion; document.body.classList.toggle('reduced-motion', reducedMotion); }
    showSettings();
  }
  handleEvents(); updateHud();
});
const movement = { KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };
document.addEventListener('keydown', event => {
  if (['Enter', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code) && !event.target.closest('[data-action="music"]')) sound.init();
  if (event.target.matches('input, select, textarea') && event.code !== 'Escape') return;
  if (event.code === 'Tab' && modalType) {
    const list = [...document.querySelectorAll('#modal-root button:not(:disabled)')]; const first = list[0], last = list.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    return;
  }
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code) && game.active) event.preventDefault();
  if (event.repeat) return;
  if (modalType === 'upgrade') { const index = Number(event.key) - 1; if (game.offers[index]) game.chooseSkill(game.offers[index].id); handleEvents(); return; }
  if (modalType === 'intermission' || modalType === 'dead') return;
  if (event.code === 'Escape' || event.code === 'KeyP') { if (modalType) actions['close-modal'](); else actions.pause(); return; }
  if (modalType) return;
  if (event.code === 'Enter' && game.phase === 'menu' && !event.target.closest('button')) { event.preventDefault(); start(); return; }
  if (movement[event.code]) keys.add(event.code);
  if (event.code === 'Space' && game.active) { event.preventDefault(); game.plantBomb(); }
  if (event.code.startsWith('Shift') && game.active) game.dash();
  if (event.code === 'KeyE' && game.active) actions.forge();
  if (event.code === 'KeyB' && game.active) showBuild();
});
document.addEventListener('keyup', event => keys.delete(event.code));
let touchMove = null;
document.querySelectorAll('[data-move]').forEach(button => {
  button.addEventListener('pointerdown', event => { event.preventDefault(); touchMove = button.dataset.move.split(',').map(Number); button.setPointerCapture(event.pointerId); });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, () => touchMove = null);
});
function blurPause() { keys.clear(); touchMove = null; if (game.active) { game.pause(); showPause(); updateHud(); } sound.update(game); }
window.addEventListener('blur', blurPause); document.addEventListener('visibilitychange', () => { if (document.hidden) blurPause(); });
document.querySelector('.brand').addEventListener('click', event => { event.preventDefault(); actions.explore(); });

try { scene = new ArenaScene($('#scene'), game, { reducedMotion, bossSources }); game.drainEvents(); updateHud(); }
catch (error) { fatal = true; console.error(error); modal('error', `<div class="modal-emblem">${icon('CircleHelp')}</div><h2 id="modal-title">A fenda não conseguiu abrir.</h2><p>Este jogo precisa de WebGL 2. Ative a aceleração de hardware e tente um navegador atualizado, como Chrome ou Edge.</p><p class="small-note">Detalhe: ${String(error.message).replace(/[<>&]/g, '')}</p>`, { closable: false }); }

let lastTime = performance.now(); let accumulator = 0;
function frame(now) {
  const dt = Math.min(.05, Math.max(0, (now - lastTime) / 1000)); lastTime = now;
  if (!fatal) {
    accumulator += dt;
    while (accumulator >= 1 / 60) {
      if (game.active) {
        const direction = touchMove || [...keys].reverse().map(k => movement[k]).find(Boolean);
        if (direction) game.move(...direction);
      }
      game.tick(1 / 60); handleEvents(); accumulator -= 1 / 60;
    }
    if (game.phase !== 'menu') { scene.update(dt); hud.frame(dt, scene); } updateHud(); sound.update(game);
    const musicState = $('#launch-music-state');
    const musicLabel = !sound.ctx ? 'TOQUE PARA OUVIR' : sound.musicEnabled && !sound.muted ? 'TOCANDO · PAUSAR' : 'PAUSADA · ATIVAR';
    if (musicState && musicState.textContent !== musicLabel) musicState.textContent = musicLabel;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Read-only diagnostics for browser verification; no gameplay shortcuts are shipped.
window.bombRiftBosses = () => ({ status: scene?.bossStatus, preview: atlas.bossPreview?.inspect(), playerOriginal: !scene?.playerMesh.userData.actor, active: scene ? [...scene.objects.values()].filter(o => o.userData.actor).map(o => o.userData.actor.key) : [] });
window.bombRiftAudio = () => sound.inspect();
window.bombRift = { snapshot: () => ({ phase: game.phase, round: game.round, stage: game.stage, selectedStage: atlas.selected, intelligence: game.intelligence, relics: [...game.relics], elapsed: game.elapsed, totalTime: game.totalTime, player: { ...game.player }, kills: game.kills, crystals: game.crystals, level: game.level, bombs: game.bombs.map(b => ({ ...b })), enemyCount: game.enemies.length, enemyIntents: game.enemies.map(e => ({ id: e.id, type: e.type, intent: e.intent, x: e.x, z: e.z })), boss: game.boss ? { ...game.boss } : null, skillLevels: { ...game.skillLevels }, meta: { ...meta }, camera: scene ? { span: scene.cameraSpan, zoom: scene.zoom, targetSpan: scene.targetSpan } : null, renderer: scene ? { calls: scene.renderer.info.render.calls, triangles: scene.renderer.info.render.triangles } : null, fatal }) };
