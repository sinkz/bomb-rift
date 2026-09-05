import { portraitArt } from './pixel-art.js';
import { setHTML, insertHTML, localeTag } from './i18n.js';
import { stageFor, WORLDS } from './campaign.js';
import { OUTFITS, rankInfo } from './legacy.js';
import { bossArt } from './atlas.js';

const number = n => n.toLocaleString(localeTag());
export class LaunchScreen {
  constructor(game, atlas, ranking, { icon, icons, avatar }) {
    Object.assign(this, { game, atlas, ranking, icon, icons });
    this.avatar = avatar.replaceAll('helm', 'launch-helm').replaceAll('suit', 'launch-suit');
    insertHTML(document.querySelector('#app'), 'beforeend', '<section id="launch" class="launch" aria-label="BOMB RIFT, menu inicial" hidden></section>');
    this.root = document.querySelector('#launch');
  }
  show() {
    this.atlas.hide(); this.root.hidden = false; this.root.inert = false; document.body.classList.add('in-launch');
    this.atlas.selected = Math.max(1, this.game.meta.unlockedStage || 1); this.render();
    this.root.querySelector('[data-action="start"]').focus({ preventScroll: true });
  }
  hide() { this.root.hidden = true; this.root.inert = true; document.body.classList.remove('in-launch'); this.atlas.bossPreview?.setVisible(false); }
  render() {
    const { game: g, icon, ranking } = this, stage = stageFor(Math.max(1, g.meta.unlockedStage || 1)), w = stage.world;
    this.root.style.setProperty('--world-color', w.color);
    const outfit = OUTFITS.find(o => o.id === g.meta.outfit); this.root.style.setProperty('--hero-outfit', outfit.color); this.root.style.setProperty('--hero-outfit-light', outfit.light);
    setHTML(this.root, `<div class="launch-grain"></div><header class="launch-header"><span class="launch-edition">${icon('Bomb')} CHRONICLES OF THE RIFT <i>◆</i> 02.3</span><div><button data-action="guide">${icon('BookOpen')} COMO JOGAR</button><button data-action="settings" aria-label="Configurações de áudio e imagem">${icon('Settings2')}</button><button data-action="fullscreen" aria-label="Tela cheia">${icon('Maximize')}</button></div></header>
      <div class="launch-content"><section class="launch-story"><div class="launch-kicker"><span></span> UMA FAÍSCA CONTRA O INFINITO</div><h1>BOMB<span>RIFT<i>✦</i></span></h1><p class="launch-tagline">Um pavio aceso.<br>Um mundo por conquistar.</p><p class="launch-description">Faça o caos jogar a seu favor. Encontre poderes, desafie guardiões e volte mais forte.</p><div class="launch-actions"><button class="launch-play" data-action="start">${icon('Play')}<span>${g.meta.runs ? 'CONTINUAR A JORNADA' : 'INICIAR EXPEDIÇÃO'}<small>FASE ${String(stage.number).padStart(2, '0')} · ${stage.name}</small></span><kbd>ENTER ↗</kbd></button><div class="launch-secondary"><button data-action="atlas">${icon('Swords')} ATLAS DOS MUNDOS ${icon('ArrowUpRight')}</button><button data-action="meta">${icon('Sprout')} REFÚGIO <b>${g.meta.shards}</b></button></div></div><div class="launch-record"><span>${icon('Trophy')}</span><div><small>SEU MELHOR RESULTADO</small><strong>${ranking.records.length ? `${number(ranking.records[0].score)} <em>PTS</em>` : 'A LENDA COMEÇA COM VOCÊ'}</strong></div></div></section>
      <section class="launch-guardian" aria-label="Seu próximo guardião"><div class="launch-orbit"><i></i><i></i><i></i></div><span class="guardian-topline">ELE JÁ SABE QUE VOCÊ VEM.</span><div class="launch-boss">${bossArt(w, 'launch')}<div class="launch-model" data-state="loading"></div></div><div class="launch-boss-caption"><small>GUARDIÃO DO ${({ ruins:'VALE', forge:'FOGO', abyss:'ABISMO', garden:'JARDIM', storm:'TROVÃO', frost:'GELO' })[w.id]}</small><h2>${w.boss}</h2><p>“${w.quote}”</p><button data-action="taunt">${icon('Swords')} DESAFIAR O GUARDIÃO</button></div><div class="launch-faisca">${portraitArt(g.meta.outfit)}<span>PEQUENO.<br><b>POR ENQUANTO.</b></span></div></section>
      <aside class="launch-ranking" aria-label="Ranking local"><div class="ranking-heading"><span>${icon('Trophy')}</span><div><small>AS SUAS MELHORES RUNS</small><h2>Salão das faíscas</h2></div><b>LOCAL</b></div>${this.rows()}<div class="ranking-note">${icon('Shield')} ${ranking.saved ? 'Seus resultados, salvos neste navegador.' : 'Salvamento indisponível. Resultados desta sessão.'}</div><div class="launch-tip"><small>UMA DICA ANTES DO SALTO</small><p>Deixe uma saída antes de soltar a bomba. O rastro depois do impacto é seguro.</p><span><kbd>WASD</kbd> MOVER <kbd>ESPAÇO</kbd> BOMBA <kbd>SHIFT</kbd> ESQUIVA</span></div></aside></div>
      <footer class="launch-footer"><span><i></i> ${WORLDS.length} MUNDOS <b>◆</b> FENDAS SEM FIM</span><button data-action="music">${icon('Volume2')} TRILHA ORIGINAL <small id="launch-music-state">TOQUE PARA OUVIR</small></button><span>RANQUE ${rankInfo(g.meta.legacyXp).level} · DESTRUA. COLETE. EVOLUA.</span></footer>`);
    this.icons(); this.atlas.bossPreview?.attach(this.root.querySelector('.launch-model'), w);
  }
  rows() {
    if (!this.ranking.records.length) return `<div class="ranking-empty"><span>01</span><div><strong>Seu nome pertence aqui.</strong><p>Conclua uma expedição para registrar seu primeiro resultado.</p></div><i>—</i></div><div class="ranking-formula"><span>ABATES <b>100 pts</b></span><span>CRISTAIS <b>10 pts</b></span><span>GUARDIÃO <b>1.000+ pts</b></span></div>`;
    return `<ol class="ranking-list">${this.ranking.records.slice(0, 5).map((r, i) => `<li><span class="rank-place">${String(i + 1).padStart(2, '0')}</span><div><strong>${r.victory ? 'FENDA CONQUISTADA' : 'A FAÍSCA RESISTIU'}</strong><small>Fase ${r.stage} · ${r.kills} abates · ${new Date(r.date).toLocaleDateString(localeTag(), { day: '2-digit', month: '2-digit' })}</small></div><b>${number(r.score)}<small>PTS</small></b></li>`).join('')}</ol>`;
  }
}
