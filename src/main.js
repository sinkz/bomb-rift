import { lifeShop } from './expedition-ui.js';
import { SCORE_VERSION } from '../shared/scoring.js';
import { masteryProgress } from './skills.js';
import './mastery.css';
import { pixelIcon, applyPixelIcons, portraitArt } from './pixel-art.js';
import './pixel-art.css';
import { formatNumber, t, setHTML, setText, setAttr, insertHTML, getLocale, setLocale, localeTag, languagePicker } from './i18n.js';
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
import { particleSources } from './particle-sources.js';
import { Sound } from './audio.js';
import { REFUGE_TRACKS } from './refuge-tracks.js';
import '@fontsource/silkscreen/latin-400.css';
import { GameHud } from './hud.js';
import { skillArt, skillPreview } from './skill-art.js';
import { Atlas } from './atlas.js';
import { relicById, CAMPAIGN_LENGTH, STAGES_PER_WORLD, stageFor } from './campaign.js';
import { normalizeMeta } from './legacy.js';
import { Refuge, resourceCost } from './refuge.js';
import { LocalRanking } from './ranking.js';
import { GlobalRanking } from './global-ranking.js';
import { resultMarkup, mountPublication, mountBoard } from './ranking-view.js';
import { LaunchScreen } from './launch.js';
import './style.css';
import './game-hud.css';
import './juice.css';
import './refuge.css';
import './i18n.css';
import './pixel-interface.css';
import './expedition.css';
import './ranking-view.css';

const ICONS = { Bomb, Flame, Expand, Heart, Wind, Magnet, Timer, Zap, HeartPulse, Droplets, ArrowUpRight, ArrowRight, ChevronRight, Gem, Skull, Trophy, Swords, Shield, LockKeyhole, Plus, Volume2, VolumeX, Maximize, Minimize, Settings2, Pause, Play, X, RotateCcw, BookOpen, Sparkles, CircleHelp, MoveUp, MoveDown, MoveLeft, MoveRight, Check, Target, Infinity: InfinityIcon, Crosshair, Sprout };
const icon = pixelIcon;
const icons = () => { createIcons({ icons: ICONS, attrs: { 'stroke-width': 1.7 } }); applyPixelIcons(); };
const $ = s => document.querySelector(s);
let meta;
try { meta = normalizeMeta(JSON.parse(localStorage.getItem('bomb-rift-v1') || '{}')); } catch { meta = normalizeMeta(); }
const game = new Game({ meta, campaignMode: true }); const sound = new Sound({ refugeTracks: REFUGE_TRACKS }); const keys = new Set();
let rankingStorage; try { rankingStorage = localStorage; } catch {}
const ranking = new LocalRanking(rankingStorage); let lastRunScore = null;
// Stage-only records remain stored under the old key; campaign scores have their own season.
ranking.records = ranking.records.filter(row => row.version === SCORE_VERSION && row.report?.kind === 'campaign');
const globalRanking = new GlobalRanking();
let scene, fatal = false, modalType = null, returnFocus = null, saveWarning = false;
let highQuality = true, reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const avatar = portraitArt(meta.outfit);

setHTML($('#app'), `
  <header class="site-header">
    <a class="brand" href="#" aria-label="BOMB RIFT, início"><span class="brand-mark">${icon('Bomb')}</span><span>BOMB<span class="brand-rift">RIFT</span><small>ROGUELIKE SURVIVAL</small></span></a>
    <nav aria-label="Navegação principal"><button class="nav-link active" data-action="explore">${icon('Crosshair')} Explorar</button><button class="nav-link" data-action="meta">${icon('Sprout')} Evolução</button><button class="nav-link" data-action="guide">${icon('BookOpen')} Como jogar</button></nav>
    <div class="header-actions"><span class="version"><span class="status-dot"></span> V.2.3</span><span class="header-divider"></span><button class="icon-button" id="sound-button" data-action="sound" aria-label="Desativar som" title="Som">${icon('Volume2')}</button><button class="icon-button" data-action="settings" aria-label="Configurações" title="Configurações">${icon('Settings2')}</button></div>
  </header>
  <main>
    <section class="page-heading"><div><div class="eyebrow"><span class="little-line"></span> A MASMORRA NUNCA É A MESMA</div><h1>Uma nova run. <span>Infinitas possibilidades.</span></h1></div><div class="record"><span class="record-icon">${icon('Trophy')}</span><div><span class="micro">SEU RECORDE</span><strong id="record-round">${meta.bestRound ? `RODADA ${String(meta.bestRound).padStart(2, '0')}` : 'A HISTÓRIA É SUA'}</strong></div></div></section>
    <div class="game-layout">
      <section class="arena-card" aria-label="Arena do jogo">
        <div id="scene"></div><div id="safe-area" aria-hidden="true"></div><div class="arena-vignette"></div>
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
`);
const refuge = new Refuge(meta, { avatar, icon });
const hud = new GameHud(game, { icon, icons, avatar });
const atlas = new Atlas(game, { icon, icons, bossSources });
const launch = new LaunchScreen(game, atlas, ranking, { icon, icons, avatar }); launch.show();
launch.globalRanking = globalRanking;
globalRanking.init().then(() => launch.refreshGlobal());
document.addEventListener('difficulty-change', () => { saveMeta(); updateHud(); });
document.addEventListener('guardian-taunt', () => { sound.init(); sound.play('boss'); });
document.body.classList.toggle('reduced-motion', reducedMotion);
insertHTML(document.body, 'beforeend', '<div class="relic-notice" id="relic-notice" role="status"></div>');
icons();

function saveMeta() { try { localStorage.setItem('bomb-rift-v1', JSON.stringify(meta)); } catch { saveWarning = true; toast('O navegador não permitiu salvar a evolução. Ela continuará disponível nesta sessão.'); } }
function toast(text) { setText($('#toast'), text); $('#toast').classList.add('visible'); clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').classList.remove('visible'), 3300); }
function announce(text, kind = '') { hud.notice(text, '', kind === 'danger' ? '#ff8e9c' : '#ffd39b'); }
function claimRun() { if (game.claimResult()) { lastRunScore = ranking.record(game); if (lastRunScore) globalRanking.finish(lastRunScore); saveMeta(); } }
// A scored row only exists once the whole expedition is closed: a death, or stage 18 cleared.
function runEnded() { return !!lastRunScore?.report; }
function scoreCard() { return lastRunScore ? `<div class="score-result"><div>${lastRunScore.place ? `${String(lastRunScore.place).padStart(2, '0')}º NO SEU RANKING` : 'RESULTADO DA EXPEDIÇÃO'}<small>${ranking.saved ? 'Salvo neste navegador' : 'Válido nesta sessão'} · abates, coleta e conquista</small></div><strong>${lastRunScore.score.toLocaleString(localeTag())} <small>PTS</small></strong></div>` : ''; }
function legacyResultCard() {
  const result = game.result?.legacy; if (!result) return '';
  return `<div class="legacy-result"><div class="recipe-cost">${resourceCost(result.materials, '+')}</div><span>+${result.xp} EXP DE EXPLORADOR <b>${result.rankedUp ? 'NOVO RANQUE ' : 'RANQUE '}${result.rank}</b></span><small>Materiais e experiência ficam com você.</small></div>`;
}
function closeModal() { $('#modal-root').classList.add('hidden'); setHTML($('#modal-root'), ''); modalType = null; document.querySelectorAll('#app > main, #launch, #atlas').forEach(el => el.inert = el.hidden); returnFocus?.focus?.(); }
function modal(type, content, { wide = false, closable = true } = {}) {
  touchMove = null;
  if (!modalType) returnFocus = document.activeElement;
  document.querySelectorAll('#app > main, #launch, #atlas').forEach(el => el.inert = true);
  // The full scorecard belongs to an expedition that is over — a death, or the
  // eighteenth guardian. Clearing a stage mid-run gets its own short celebration.
  if (runEnded() && ['dead', 'intermission'].includes(type)) { content = resultMarkup(lastRunScore, game, legacyResultCard()); wide = true; }
  keys.clear(); modalType = type;
  setHTML($('#modal-root'), `<section class="modal modal-${type} ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title">${closable ? `<button class="modal-close icon-button" data-action="close-modal" aria-label="Fechar">${icon('X')}</button>` : ''}${content}</section>`);
  $('#modal-root').classList.remove('hidden'); icons();
  // Focusing without preventScroll used to scroll the panel and clip its own heading.
  const panel = $('#modal-root .modal'); if (panel) panel.scrollTop = 0;
  ($('#modal-root .primary-button:not(:disabled)') || $('#modal-root button:not(:disabled)'))?.focus({ preventScroll: true });
  if (runEnded() && ['dead', 'intermission'].includes(type)) mountPublication($('#result-publication'), lastRunScore, globalRanking);
}
function resume() { closeModal(); if (game.phase === 'paused') game.pause(); updateHud(); }
function start() {
  if (fatal) return;
  const fresh = !game.expedition || game.expedition.ended;
  if (!game.start(fresh ? 1 : atlas.selected)) return;
  if (fresh) globalRanking.begin(1, game.difficulty);
  clearTimeout(toast.timer); $('#toast').classList.remove('visible');
  closeModal(); sound.init(); launch.hide(); atlas.hide(); keys.clear(); scene.preview?.clear(); lastRunScore = null;
  $('#start-banner').classList.add('hidden'); $('#in-game-bottom').classList.remove('hidden');
  $('#mobile-controls').classList.add('running'); $('#pause-button').disabled = false;
  updateBuild(); updateHud(); scene.resize(); announce(`${game.stage.name.toUpperCase()} · ${game.biome.boss} ESTÁ OBSERVANDO`);
}
function returnToMap() {
  claimRun(); closeModal(); keys.clear(); touchMove = null; launch.hide();
  game.returnToMap(); atlas.show(meta.unlockedStage || 1);
  $('#mobile-controls').classList.remove('running'); $('#relic-notice').classList.remove('visible'); updateBuild(); updateHud();
}
function showRelic(id) {
  const r = relicById(id); hud.notice(r.name, `${r.rarity} · EQUIPADA`, r.color, 'relic-' + r.id);
}
function pauseForModal() { if (game.active) game.pause(); }
function showPause() {
  modal('pause', `<div class="modal-emblem">${icon('Pause')}</div><span class="eyebrow orange">RESPIRE. O CAOS PODE ESPERAR.</span><h2 id="modal-title">Pavio em pausa.</h2><p>A sua expedição está exatamente onde você deixou.</p><button class="primary-button full-width" data-action="resume">Continuar expedição ${icon('Play')}</button>${lifeShop(game)}<button class="text-button" data-action="guide">Relembrar os controles</button><button class="text-button" data-action="abandon">Encerrar tentativa e ver pontuação</button>`, { closable: true });
}
function showGuide() {
  pauseForModal();
  modal('guide', `<span class="eyebrow orange">MANUAL DO PEQUENO CAOS</span><h2 id="modal-title">Um pavio. Muitas possibilidades.</h2><p>Sobreviva por <b>2 minutos</b>, derrote o chefe e atravesse a próxima fenda. A masmorra muda, a dificuldade aumenta e cada fase começa com uma build nova. Suas melhorias permanentes ficam.</p><div class="guide-grid"><div><span>${icon('Bomb')}</span><h3>Abra o caminho</h3><p>Bombas explodem em cruz. Caixas são destruídas, pedras bloqueiam o fogo e outras bombas explodem em cadeia. <b>Suas explosões também machucam você.</b></p></div><div><span>${icon('Gem')}</span><h3>Transforme o caos</h3><p>Recolha cristais para ganhar XP. Cada nível dá uma habilidade grátis. Use cristais para forjar outras escolhas com <b>E</b>.</p></div><div><span>${icon('Zap')}</span><h3>Tenha uma saída</h3><p>Use <b>Shift</b> para avançar até 3 casas na direção em que está olhando, com invulnerabilidade breve. Paredes bloqueiam a esquiva.</p></div><div><span>${icon('Skull')}</span><h3>Encare o guardião</h3><p>Quando o tempo terminar, o chefe aparece. Fuja das casas vermelhas e use bombas. A vitória desbloqueia a próxima fase e salva essências. Volte ao atlas para investir no seu legado.</p></div></div><div class="guide-controls"><span><kbd>W A S D</kbd> ou <kbd>↑ ← ↓ →</kbd> mover pela grade</span><span><kbd>ESPAÇO</kbd> colocar bomba</span><span><kbd>ESC / P</kbd> pausar</span></div><p class="small-note">Cada 5 abates rendem 1 essência. Minichefes rendem 3, uma relíquia e um núcleo para coletar. Cada fase mostra a recompensa do seu guardião no atlas. A cada duas caixas ou três abates, colete sucata. Use essências, sucata e núcleos no Refúgio: talentos, equipamentos e tinturas ficam para as próximas fases. Complete contratos para ganhar recursos extras. O progresso é salvo neste navegador.</p><button class="primary-button full-width" data-action="close-modal">Entendi. Vamos nessa. ${icon('ArrowRight')}</button>`, { wide: true });
}
function showUpgrade() {
  modal('upgrade', `<div class="upgrade-sigil">${icon('Sparkles')}</div><span class="eyebrow orange">${game.upgradeCost ? 'A FORJA RESPONDEU AO SEU CHAMADO' : `NÍVEL ${game.level} · PODER DESPERTADO`}</span><h2 id="modal-title">Escolha sua evolução.</h2><p>Três caminhos. Uma escolha. Faça a fenda lembrar de você.</p><div class="skill-options">${game.offers.map((skill, i) => `<button class="skill-option" data-skill="${skill.id}" style="--skill-color:${skill.color}"><span class="skill-option-top"><span>${icon(skill.icon)} ${skill.branch}</span><kbd>${i + 1}</kbd></span><span class="skill-option-icon">${skillArt(skill.id)}</span><h3>${skill.name}</h3><p>${skill.desc}</p>${skillPreview(game, skill.id)}${masteryProgress(game, skill.id)}<span class="skill-option-bottom"><span>◆ NÍVEL ${(game.skillLevels[skill.id] || 0) + 1}</span> ${icon('ArrowUpRight')}</span></button>`).join('')}</div><div class="upgrade-footer"><span>${icon('Gem')} ${game.crystals} cristais</span><button class="secondary-button" data-action="reroll" ${game.crystals < 6 ? 'disabled' : ''}>${icon('RotateCcw')} Sortear novamente <b>6 ${icon('Gem')}</b></button></div><span class="upgrade-pause-note">TEMPO SUSPENSO · ESCOLHA COM CALMA</span>`, { wide: true, closable: false });
}
function showBuild() {
  pauseForModal();
  const entries = SKILLS.filter(s => game.skillLevels[s.id]);
  modal('build', `<span class="eyebrow orange">ARSENAL DA FASE ${game.round} · NÍVEL ${game.level}</span><h2 id="modal-title">Seu tipo de caos.</h2>${lifeShop(game)}<div class="build-summary"><span>${icon('Flame')} ${game.player.damage} DANO</span><span>${icon('Expand')} ${game.player.range} ALCANCE</span><span>${icon('Bomb')} ${game.player.capacity} BOMBAS</span></div><div class="relic-codex">${game.relics.map(id => { const r = relicById(id); return `<div class="relic-entry" style="--skill-color:${r.color}">${skillArt('relic-' + r.id)}<div><h3>${r.name}${id === 'phoenix' && !game.player.revive ? ' · consumida' : ''}</h3><p>${r.desc}</p></div></div>`; }).join('')}</div><div class="equipped-skills">${entries.length ? entries.map(s => `<div class="equipped-skill" style="--skill-color:${s.color}">${skillArt(s.id)}<div><small>${s.branch} · NV. ${game.skillLevels[s.id]}</small><h3>${s.name}</h3><p>${s.desc}</p>${masteryProgress(game,s.id)}</div></div>`).join('') : '<p>Suba de nível ou colete cristais para forjar habilidades. Destrua o baú dourado e vença minichefes para encontrar relíquias.</p>'}</div><p class="small-note">Esta build dura só esta fase. Suas melhorias permanentes continuam na próxima.</p><button class="primary-button full-width" data-action="close-modal">Voltar ao combate ${icon('Swords')}</button>`, { wide: true });
}
function showIntermission() {
  // Mid-run this is a victory lap, not a scoreboard: the expedition is still open,
  // so it shows progress and what comes next instead of a ranking-shaped screen.
  const cleared = game.round, next = cleared + 1, nextStage = next <= CAMPAIGN_LENGTH ? stageFor(next) : null;
  const worldStep = game.stage.local, worldDone = worldStep === STAGES_PER_WORLD;
  const progress = `<div class="stage-progress" role="group" aria-label="Progresso da campanha"><div class="stage-progress-heading"><span>FASE ${String(cleared).padStart(2, '0')} DE ${CAMPAIGN_LENGTH}</span><b>${game.challenge.label.toUpperCase()}</b></div><div class="stage-progress-track"><span style="width:${cleared / CAMPAIGN_LENGTH * 100}%"></span></div><div class="stage-progress-pips">${Array.from({ length: CAMPAIGN_LENGTH }, (_, i) => `<i class="${i < cleared ? 'done' : ''}"></i>`).join('')}</div></div>`;
  const teaser = nextStage ? `<div class="next-stage" style="--world-color:${nextStage.world.color}"><span class="micro">A PRÓXIMA FENDA</span><strong>${nextStage.name}</strong><small>${nextStage.world.name} · ${nextStage.world.boss} · ${nextStage.description}</small></div>` : '';
  // Cada tipo de fase termina com a sua propria manchete: dizer que o guardiao
  // caiu numa cacada onde ele nunca apareceu seria mentira.
  const headline = { champion: 'O CAMPEÃO CAIU.', routed: `${game.biome.boss} FUGIU.`, slain: `${game.biome.boss} CAIU.` }[game.result?.outcome] || `${game.biome.boss} CAIU.`;
  modal('intermission', `<div class="modal-emblem victory">${icon('Trophy')}</div><span class="eyebrow orange">${headline}</span><h2 id="modal-title">Uma fenda a menos.</h2><p>${game.stage.name}${worldDone ? ` · ${game.biome.name} concluído` : ''}</p>${progress}${legacyResultCard()}${teaser}${lifeShop(game)}<p class="victory-map-note">Skills, relíquias e cristais reiniciam na próxima fase. Vidas extras continuam nesta tentativa.</p><button class="primary-button full-width" data-action="world-map">Continuar no atlas ${icon('ArrowRight')}</button><button class="secondary-button full-width" data-action="home">Voltar ao refúgio</button>`, { closable: false });
}
function showDead() {
  modal('dead', `<div class="modal-emblem">${icon('Skull')}</div><span class="eyebrow orange">TODA LENDA COMEÇA COM ALGUMAS EXPLOSÕES.</span><h2 id="modal-title">O pavio apagou.<br><span>A faísca continua.</span></h2><p>Sua build ficou na fenda. As essências e as evoluções permanentes vieram com você.</p><div class="results-row"><div><strong>${String(game.round).padStart(2, '0')}</strong><span>RODADA</span></div><div><strong>${game.kills}</strong><span>ABATES</span></div><div><strong>+${game.earnedShards}</strong><span>ESSÊNCIAS</span></div></div><button class="primary-button full-width" data-action="start">Mais uma expedição ${icon('RotateCcw')}</button><button class="secondary-button full-width" data-action="world-map">Voltar ao atlas ${icon('ArrowRight')}</button><button class="text-button" data-action="meta">Investir em evolução permanente ${icon('Sprout')}</button>`, { closable: false });
}
function showMeta() {
  pauseForModal();
  const previous = document.querySelector('.refuge-content'), sameTab = previous?.dataset.view === refuge.tab;
  const scroll = sameTab ? previous.scrollTop : 0, modalScroll = sameTab ? document.querySelector('.modal-meta')?.scrollTop || 0 : 0;
  const focused = document.activeElement, key = ['talent','gear','outfit','contract','refugeTab','refugeSlot'].find(k => focused?.dataset?.[k]);
  const selector = key ? `[data-${key.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}="${focused.dataset[key]}"]` : null;
  modal('meta', refuge.html() + lifeShop(game), { wide: true });
  if (previous) { document.querySelector('.modal-meta').style.animation = 'none'; document.querySelector('.refuge-content').scrollTop = scroll; document.querySelector('.modal-meta').scrollTop = modalScroll; }
  const nextFocus = selector && document.querySelector(`#modal-root ${selector}`);
  if (nextFocus && !nextFocus.disabled) nextFocus.focus({ preventScroll: true });
}
function showSettings() {
  pauseForModal();
  modal('settings', `<span class="eyebrow orange">DO SEU JEITO</span><h2 id="modal-title">Ajuste a experiência.</h2><div class="setting-row"><div><h3>Efeitos sonoros</h3><p>Explosões, cristais e pequenas vitórias.</p></div><button class="toggle ${sound.enabled ? 'on' : ''}" data-setting="sound" role="switch" aria-checked="${sound.enabled}" aria-label="Efeitos sonoros"><span></span></button></div><div class="setting-row"><div><h3>Qualidade visual</h3><p>Sombras suaves e brilho dos cristais.</p></div><button class="toggle ${highQuality ? 'on' : ''}" data-setting="quality" role="switch" aria-checked="${highQuality}" aria-label="Qualidade visual alta"><span></span></button></div><div class="setting-row"><div><h3>Reduzir movimento</h3><p>Sem tremor de câmera e com menos partículas.</p></div><button class="toggle ${reducedMotion ? 'on' : ''}" data-setting="motion" role="switch" aria-checked="${reducedMotion}" aria-label="Reduzir movimento"><span></span></button></div><button class="primary-button full-width" data-action="close-modal">Tudo pronto ${icon('Check')}</button>`);
  insertHTML($('#modal-root .setting-row'), 'beforebegin', `<div class="setting-row language-setting"><div><h3>Idioma</h3><p>Preferência salva neste navegador.</p></div>${languagePicker('settings-language')}</div>`);
  const row = document.createElement('div'); row.className = 'music-settings';
  setHTML(row, `<div class="setting-row"><div><h3>Trilha musical</h3><p>Temas próprios para cada mundo e seus guardiões.</p></div><button class="toggle ${sound.musicEnabled ? 'on' : ''}" data-setting="music" role="switch" aria-checked="${sound.musicEnabled}" aria-label="Trilha musical"><span></span></button></div><div class="setting-row"><div><h3>Volume da música</h3><p>Deixe as explosões em primeiro plano.</p></div><label><input class="music-volume" type="range" min="0" max="100" value="${Math.round(sound.volume * 100)}" aria-label="Volume da música"><output class="setting-volume-value">${Math.round(sound.volume * 100)}%</output></label></div>`);
  $('#modal-root .setting-row').after(row);
  insertHTML(row, 'beforeend', `<div class="setting-row track-setting"><div><h3>Trilha do refúgio</h3><p>Escolha a companhia para sua próxima pausa.</p></div><select id="refuge-track" aria-label="Trilha do refúgio">${REFUGE_TRACKS.map(track => `<option value="${track.id}" ${sound.refugeTrack === track.id ? 'selected' : ''}>${track.name}</option>`).join('')}<option value="" ${!sound.refugeTrack ? 'selected' : ''}>O pavio pode esperar</option></select></div>`);
  row.querySelector('#refuge-track').addEventListener('change', e => { sound.selectRefugeTrack(e.target.value); sound.init(); sound.save(); });
  row.querySelector('input').addEventListener('input', e => { sound.volume = Number(e.target.value) / 100; sound.save(); setText(row.querySelector('output'), `${e.target.value}%`); });
}
function updateBuild() {
  const entries = SKILLS.filter(s => game.skillLevels[s.id]);
  setText($('#build-count'), `${entries.length} HABILIDADE${entries.length === 1 ? '' : 'S'}`);
  if (!entries.length) setHTML($('#skill-list'), `<div class="empty-build"><div class="empty-slots">${[0, 1, 2, 3].map(() => `<span>${icon('Plus')}</span>`).join('')}</div><p>Cada escolha cria um novo caminho.</p></div>`);
  else setHTML($('#skill-list'), entries.map(s => `<div class="build-skill" style="--skill-color:${s.color}" title="${s.desc}"><span>${icon(s.icon)}</span><strong>${s.name}</strong><b>${game.skillLevels[s.id]}</b></div>`).join(''));
  icons();
}
let lastHud = '';
function updateHud() {
  hud.update();
  const p = game.player, remaining = Math.max(0, Math.ceil(ROUND_SECONDS - game.elapsed));
  const stamp = [remaining, game.phase, p.hp, p.maxHp, game.xp, game.crystals, game.kills, game.bombs.length, Math.ceil(p.dashCooldown * 10), game.boss?.hp, game.round, game.level, game.forgeCost].join('/');
  if (stamp === lastHud) return; lastHud = stamp;
  setHTML($('#timer'), `${String(Math.floor(remaining / 60)).padStart(2, '0')}<span>:</span>${String(remaining % 60).padStart(2, '0')}`);
  $('#timer').classList.toggle('urgent', remaining <= 20 && remaining > 0);
  $('#timer-fill').style.width = `${remaining / 120 * 100}%`;
  setText($('#timer-caption'), game.boss ? 'O GUARDIÃO DESPERTOU' : 'O CHEFE DESPERTA EM');
  setHTML($('#hp-label'), `${p.hp} <span>/ ${p.maxHp}</span>`); $('#hp-fill').style.width = `${p.hp / p.maxHp * 100}%`;
  $('#hp-fill').classList.toggle('low', p.hp < p.maxHp * .3);
  setText($('#xp-label'), `${game.xp} / ${game.nextXp} XP`); $('#xp-fill').style.width = `${game.xp / game.nextXp * 100}%`;
  setText($('#level-pill'), `NV. ${String(game.level).padStart(2, '0')}`);
  setText($('#crystal-count'), game.crystals); setText($('#kill-count'), game.kills);
  setText($('#damage-stat'), p.damage); setText($('#range-stat'), p.range); setText($('#capacity-stat'), p.capacity);
  setText($('#forge-cost'), game.forgeCost); $('#forge-button').disabled = !game.active || game.crystals < game.forgeCost;
  setAttr($('#forge-button'), 'title', game.crystals < game.forgeCost ? `Colete mais ${game.forgeCost - game.crystals} cristais para forjar uma habilidade` : 'Sortear 3 habilidades e escolher uma (E)');
  setText($('#round-label'), `EXPEDIÇÃO · RODADA ${String(game.round).padStart(2, '0')}`); setText($('#biome-name'), game.biome.name); setText($('#biome-tag'), game.biome.tag);
  const status = { menu: 'PRONTO PARA ENTRAR', playing: 'SOBREVIVA À HORDA', boss: 'DERROTE O GUARDIÃO', paused: 'EXPEDIÇÃO EM PAUSA', upgrade: 'ESCOLHA SUA EVOLUÇÃO', intermission: 'FENDA CONQUISTADA', dead: 'EXPEDIÇÃO ENCERRADA' };
  setHTML($('#live-label'), `<span class="status-dot ${game.active ? 'live' : ''}"></span> ${status[game.phase]}`);
  $('#boss-health').classList.toggle('hidden', !game.boss);
  if (game.boss) { setText($('#boss-name'), game.boss.name); setText($('#boss-hp'), `${game.boss.hp} / ${game.boss.maxHp}`); $('#boss-fill').style.width = `${game.boss.hp / game.boss.maxHp * 100}%`; }
  setHTML($('#bomb-slots'), Array.from({ length: p.capacity }, (_, i) => `<span class="bomb-pip ${i < p.capacity - game.bombs.length ? 'ready' : ''}"></span>`).join(''));
  setHTML($('#dash-status'), `${icon('Zap')} ${p.dashCooldown > 0 ? `ESQUIVA ${formatNumber(p.dashCooldown, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}s` : 'ESQUIVA PRONTA'}`);
  $('#pause-button').disabled = !game.active && game.phase !== 'paused'; icons();
}

function handleEvents() {
  let venceuFase = false;
  for (const event of game.drainEvents()) {
    scene?.handle(event); hud.handle(event); sound.play(event.type);
    if (event.type === 'upgrade') showUpgrade();
    if (event.type === 'skill') { closeModal(); updateBuild(); }
    // Marca e resolve depois do laco: assim o VFX da morte e a fala do finale
    // chegam na cena antes de o modal cobrir a arena.
    if (event.type === 'stageCleared') venceuFase = true;
    if (event.type === 'miniboss') announce('SENTINELA DA FENDA · RELÍQUIA GARANTIDA', 'danger');
    // Os tres momentos narrativos do novo ritmo de campanha.
    if (event.type === 'champion') hud.cinematic('O CAMPEÃO DESPERTA', 'Derrote-o para atravessar a fenda.', { color: '#ffb05a', hold: 2200 });
    if (event.type === 'bossFlee') hud.cinematic(`${event.name} FUGIU`, event.line, { color: event.color, kind: 'flee', hold: 2900 });
    if (event.type === 'bossRouted') announce('ELE ESPERA NA PRÓXIMA FENDA');
    if (event.type === 'arenaReshape') hud.cinematic('A ARENA SE PARTE', game.biome.tag, { color: event.color, kind: 'duel', hold: 2000 });
    // O letreiro entra junto com o guardiao, na batida do pouso, e nao no comeco
    // da transicao: antes ele tapava justamente o centro da coreografia.
    if (event.type === 'bossEntranceBeat' && event.kind === 'slam') hud.cinematic(event.name, event.line, { color: event.color, kind: 'duel', hold: 2200 });
    // Cada batida tem a propria voz; sound.play(event.type) sozinho daria uma so.
    if (event.type === 'bossEntranceBeat') sound.play('entrance' + event.kind[0].toUpperCase() + event.kind.slice(1));
    if (event.type === 'boss' && game.boss?.grudge) hud.notice(`${game.biome.boss} · RANCOR`, game.biome.grudgeLine || '', game.biome.color);
    // Act two already speaks through 'bossEnraged'; only the desperation turn
    // needs its own voice, or the same threshold would announce itself twice.
    if (event.type === 'bossPhase' && event.phase >= 3) { sound.play('bossDesperation'); announce(`${game.biome.boss} · ${event.label}`, 'danger'); }
    if (event.type === 'miniDefeated') announce('SENTINELA DERROTADO · COLETE A RELÍQUIA');
    if (event.type === 'relic') { showRelic(event.id); sound.play('skill'); }
    if (event.type === 'extraLife') { announce('VIDA EXTRA · MAIS UMA CHANCE'); sound.play('skill'); }
    if (event.type === 'revive') { announce('ÚLTIMA FAÍSCA · VOCÊ RENASCEU'); sound.play('skill'); }
    if (event.type === 'hurt') { $('.arena-card').classList.add('hit'); setTimeout(() => $('.arena-card').classList.remove('hit'), 230); }
    if (event.type === 'dead') {
      claimRun();
      setText($('#record-round'), `RODADA ${String(meta.bestRound).padStart(2, '0')}`); showDead();
    }
    if (event.type === 'nextRound') announce(`RODADA ${game.round} · ${game.biome.name.toUpperCase()}`);
  }
  if (venceuFase) { claimRun(); showIntermission(); }
}

const actions = {
  start,
  'buy-life'() { if (game.buyLife()) { if (modalType === 'meta') showMeta(); else if (modalType === 'intermission') showIntermission(); else if (modalType === 'build') showBuild(); else showPause(); } },
  atlas() { launch.hide(); atlas.show(); },
  workshop() { refuge.tab = 'talents'; showMeta(); },
  shop() { refuge.tab = 'gear'; showMeta(); },
  inventory() { refuge.tab = 'inventory'; showMeta(); },
  ranking() { pauseForModal(); modal('ranking', '<div id="global-ranking-body"></div>', { wide:true }); mountBoard($('#global-ranking-body'),globalRanking,()=>launch.rows()); },
  home() { if (game.active || game.phase === 'upgrade') return; claimRun(); closeModal(); game.returnToMap(); $('#mobile-controls').classList.remove('running'); updateHud(); launch.show(); },
  taunt() { atlas.bossPreview?.taunt(); sound.play('boss'); },
  music() { const wasReady = sound.ready; sound.init(); if (wasReady) sound.musicEnabled = !sound.musicEnabled; sound.save(); },
  'world-map': returnToMap,
  abandon() { game.die(); handleEvents(); },
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
  sound() { sound.init(); sound.muted = !sound.muted; setHTML($('#sound-button'), icon(sound.muted ? 'VolumeX' : 'Volume2')); setAttr($('#sound-button'), 'aria-label', sound.muted ? 'Ativar som' : 'Desativar som'); icons(); },
  async fullscreen() { try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); else await document.exitFullscreen(); } catch { toast('Tela cheia indisponível neste navegador. Abra o jogo em uma aba própria.'); } },
};
document.addEventListener('change', event => {
  if (event.target.matches('[data-language]')) setLocale(event.target.value);
});
document.addEventListener('bomb-rift:language', () => {
  const languageControlId = document.activeElement?.matches('[data-language]') ? document.activeElement.id : null;
  keys.clear(); touchMove = null;
  lastHud = ''; hud.last = ''; hud.buildStamp = '';
  updateBuild(); updateHud();
  if (!launch.root.hidden) launch.render();
  else if (!atlas.root.hidden) atlas.render();
  if (modalType === 'settings') { showSettings(); $('#settings-language')?.focus(); }
  document.querySelectorAll('[data-language]').forEach(select => { select.value = getLocale(); });
  if (languageControlId) document.getElementById(languageControlId)?.focus({ preventScroll: true });
});
document.addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button || button.disabled) return;
  if (button.dataset.action !== 'music') sound.init();
  if (button.dataset.action) actions[button.dataset.action]?.();
  if (button.dataset.skill) game.chooseSkill(button.dataset.skill);
  const refugeAction = refuge.act(button);
  if (refugeAction) { if (refugeAction.changed) { saveMeta(); if (refugeAction.message) toast(refugeAction.message); } showMeta(); }
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
  if (event.code === 'Tab' && modalType) {
    const list = [...document.querySelectorAll('#modal-root button:not(:disabled), #modal-root select:not(:disabled), #modal-root input:not(:disabled), #modal-root textarea:not(:disabled), #modal-root a[href], #modal-root summary')].filter(el=>el.getClientRects().length); const first = list[0], last = list.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    return;
  }
  if (event.target.matches('input, select, textarea') && event.code !== 'Escape') return;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code) && game.active) event.preventDefault();
  if (event.repeat) return;
  if (modalType === 'upgrade') { const index = Number(event.key) - 1; if (game.offers[index]) game.chooseSkill(game.offers[index].id); handleEvents(); return; }
  if (modalType === 'intermission' || modalType === 'dead') return;
  if (event.code === 'Escape' || event.code === 'KeyP') { if (modalType) actions['close-modal'](); else if (event.code === 'Escape' && game.phase === 'menu' && !atlas.root.hidden) actions.home(); else actions.pause(); return; }
  if (modalType) return;
  if (game.phase === 'menu') {
    const shortcut = { KeyM: 'atlas', KeyB: 'workshop', KeyL: 'shop', KeyI: 'inventory', KeyR: 'ranking' }[event.code];
    if (shortcut) { event.preventDefault(); actions[shortcut](); return; }
    if (event.code === 'Enter' && !event.target.closest('button')) { event.preventDefault(); if (launch.root.hidden) start(); else actions.atlas(); return; }
    if (event.code === 'Escape' && !atlas.root.hidden) { actions.home(); return; }
  }
  if (movement[event.code]) keys.add(event.code);
  if (event.code === 'Space' && game.active) { event.preventDefault(); game.plantBomb(); }
  if (event.code.startsWith('Shift') && game.active) game.dash();
  if (event.code === 'KeyE' && game.active) actions.forge();
  if (event.code === 'KeyB' && game.active) showBuild();
});
document.addEventListener('keyup', event => keys.delete(event.code));
let touchMove = null;

insertHTML($('.arena-card'), 'beforeend', '<div class="touch-joystick" id="touch-joystick" role="group" aria-label="Controle de movimento"><i aria-hidden="true">✥</i><span aria-hidden="true"></span></div>');
const joystick = $('#touch-joystick'); let stickPointer = null;
function steerStick(event) {
  const rect = joystick.getBoundingClientRect(), dx = event.clientX - rect.left - rect.width / 2, dy = event.clientY - rect.top - rect.height / 2;
  const length = Math.hypot(dx, dy), max = rect.width * .27, ratio = length > max ? max / length : 1;
  joystick.querySelector('span').style.transform = `translate(calc(-50% + ${dx * ratio}px),calc(-50% + ${dy * ratio}px))`;
  touchMove = length < 12 ? null : Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
}
joystick.addEventListener('pointerdown', e => { if (!game.active || stickPointer !== null) return; e.preventDefault(); sound.init(); stickPointer = e.pointerId; joystick.setPointerCapture(e.pointerId); steerStick(e); });
joystick.addEventListener('pointermove', e => { if (e.pointerId === stickPointer) steerStick(e); });
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) joystick.addEventListener(type, e => { if (e.pointerId !== stickPointer) return; stickPointer = null; touchMove = null; joystick.querySelector('span').style.transform = 'translate(-50%,-50%)'; });
document.querySelectorAll('[data-move]').forEach(button => {
  button.addEventListener('pointerdown', event => { event.preventDefault(); touchMove = button.dataset.move.split(',').map(Number); button.setPointerCapture(event.pointerId); });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, () => touchMove = null);
});
function updateSound() { sound.update(game, game.phase === 'menu' ? 'refuge' : null); }
function blurPause() { keys.clear(); touchMove = null; if (game.active) { game.pause(); showPause(); updateHud(); } updateSound(); }
window.addEventListener('blur', blurPause); document.addEventListener('visibilitychange', () => { if (document.hidden) blurPause(); });
document.querySelector('.brand').addEventListener('click', event => { event.preventDefault(); actions.explore(); });

// The refuge used to open in silence: audio only woke on a button click, and only then
// began downloading a three-megabyte master. Now the graph is built and decoded right
// after the first paint, and any gesture anywhere resumes it — instantly, from cache.
const WAKE_EVENTS = ['pointerdown', 'pointerup', 'keydown', 'touchend', 'wheel'];
function wakeAudio() { sound.init(); updateSound(); if (sound.ready) for (const type of WAKE_EVENTS) removeEventListener(type, wakeAudio, true); }
for (const type of WAKE_EVENTS) addEventListener(type, wakeAudio, { capture: true, passive: true });
function warmAudio() { sound.prefetch(); sound.init(); updateSound(); }
if (document.readyState === 'complete') (window.requestIdleCallback || (fn => setTimeout(fn, 400)))(warmAudio);
else addEventListener('load', () => (window.requestIdleCallback || (fn => setTimeout(fn, 400)))(warmAudio), { once: true });

try { scene = new ArenaScene($('#scene'), game, { reducedMotion, bossSources, particleSources }); game.drainEvents(); updateHud(); }
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
    if (game.phase !== 'menu') { scene.update(dt); hud.frame(dt, scene); } updateHud(); updateSound();
    if (!modalType && !document.hidden) launch.frame(now, reducedMotion);
    const musicState = $('#launch-music-state');
    const musicLabel = !sound.ready ? 'TOQUE PARA OUVIR' : !sound.musicEnabled || sound.muted ? 'PAUSADA · ATIVAR' : sound.refugeTrack && sound.recorded?.state === 'loading' ? 'CARREGANDO A TRILHA…' : 'TOCANDO · PAUSAR';
    if (musicState && musicState.textContent !== t(musicLabel)) setText(musicState, musicLabel);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Read-only diagnostics for browser verification; no gameplay shortcuts are shipped.
window.bombRiftBosses = () => ({ status: scene?.bossStatus, preview: atlas.bossPreview?.inspect(), playerOriginal: !scene?.playerMesh.userData.actor, active: scene ? [...scene.objects.values()].filter(o => o.userData.actor).map(o => o.userData.actor.key) : [] });
window.bombRiftAudio = () => sound.inspect();
window.bombRift = { snapshot: () => ({ phase: game.phase, difficulty: game.difficulty, lives: game.lives, expeditionScore: game.expeditionScore, expeditionEnded: game.expedition?.ended, round: game.round, stage: game.stage, selectedStage: atlas.selected, intelligence: game.intelligence, relics: [...game.relics], materials: { ...game.materials }, cratesBroken: game.cratesBroken, elapsed: game.elapsed, totalTime: game.totalTime, player: { ...game.player }, kills: game.kills, crystals: game.crystals, level: game.level, bombs: game.bombs.map(b => ({ ...b })), enemyCount: game.enemies.length, enemyIntents: game.enemies.map(e => ({ id: e.id, type: e.type, intent: e.intent, x: e.x, z: e.z })), boss: game.boss ? { ...game.boss } : null, skillLevels: { ...game.skillLevels }, meta: { ...meta }, camera: scene ? { span: scene.cameraSpan, zoom: scene.zoom, targetSpan: scene.targetSpan } : null, renderer: scene ? { calls: scene.renderer.info.render.calls, triangles: scene.renderer.info.render.triangles } : null, fatal }) };

// Dev-only QA harness. Vite strips this branch from production builds.
if (import.meta.env?.DEV) {
  window.bombRiftDev = {
    game, scene: () => scene, sound, actions, hud, atlas, launch, ranking, globalRanking,
    pump() { handleEvents(); updateHud(); },
    skipToBoss() { game.elapsed = ROUND_SECONDS - .05; this.pump(); },
    killBoss() { if (!game.boss) return false; game.boss.hp = 0; game.defeatBoss(); this.pump(); return true; },
    get lastRunScore() { return lastRunScore; },
    get modalType() { return modalType; },
    // Auditoria de layout: abre cada tela e mede quem rola e quem corta conteudo.
    // Roda na altura de janela atual — redimensione e rode de novo para varrer.
    async audit({ quiet = false } = {}) {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const inspect = () => {
        const rolam = [], cortam = [];
        for (const el of document.querySelectorAll('body *')) {
          if (!el.getClientRects().length) continue;
          const style = getComputedStyle(el), over = el.scrollHeight - el.clientHeight;
          if (over <= 3) continue;
          const name = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : el.id ? '#' + el.id : el.tagName;
          // A cena 3D e o overlay de mundo sao canvas de tamanho fixo, nao conteudo.
          if (/scene|world-overlay|combat-hud|arena-card/.test(name)) continue;
          if (/auto|scroll/.test(style.overflowY)) rolam.push(`${name}:${over}`);
          else if (style.overflowY === 'hidden') cortam.push(`${name}:${over}`);
        }
        return { rolam, cortam };
      };
      const linhas = [];
      const passo = async (nome, abrir, fechar) => {
        await abrir(); await sleep(600);
        const { rolam, cortam } = inspect();
        linhas.push({ tela: nome, rola: rolam.join(' ') || '—', CORTA: cortam.join(' ') || '—' });
        if (fechar) { await fechar(); await sleep(350); }
      };
      const estavaJogando = game.active;
      await passo('refugio', () => actions.home());
      await passo('atlas', () => actions.atlas(), () => actions.home());
      for (const tela of ['guide', 'settings', 'meta', 'ranking'])
        await passo(tela, () => actions[tela](), () => actions['close-modal']());
      await passo('em jogo', async () => { actions.start(); await sleep(700); game.player.invincible = 9999; game.crystals = 999; this.pump(); });
      await passo('build', () => actions.build(), () => actions['close-modal']());
      await passo('pause', () => actions.pause(), () => actions['close-modal']());
      await passo('upgrade', () => actions.forge(), async () => { game.chooseSkill(game.offers[0].id); this.pump(); });
      await passo('fase concluida', async () => { this.skipToBoss(); await sleep(700); this.killBoss(); });
      await passo('game over', async () => { actions.home(); await sleep(400); actions.start(); await sleep(600); game.die(); this.pump(); });
      if (!estavaJogando) { actions['close-modal'](); actions.home(); }
      const falhas = linhas.filter(l => l.CORTA !== '—');
      if (!quiet) {
        console.table(linhas);
        console.log(`Janela ${innerWidth}×${innerHeight} · ${falhas.length ? '⚠ CONTEUDO CORTADO — corrija' : '✔ nada cortado'}`);
      }
      return { viewport: `${innerWidth}x${innerHeight}`, linhas, cortando: falhas };
    },
  };
}
