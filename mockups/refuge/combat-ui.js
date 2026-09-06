import { SKILLS, masteryProgress } from '/src/skills.js';
import { skillArt, skillPreview } from '/src/skill-art.js';
import { normalizeMeta, startingStats } from '/src/legacy.js';
import '/src/mastery.css';
import './progression.css';

const kitItems = {
  balanced: ['pulse','traveler','guardian-charm'],
  swift: ['pulse','wind-boots','salvager'],
  heavy: ['twin-core','bastion-boots','guardian-charm'],
};
export function kitMeta(id) {
  const gear=kitItems[id] || kitItems.balanced;
  return normalizeMeta({unlockedStage:18,gear,loadout:Object.fromEntries(['core','boots','charm'].map((slot,i)=>[slot,gear[i]]))});
}
export const kitStats = id => startingStats(kitMeta(id));
export function skillChoices(game) {
  return `<p class="balance-note">${game.upgradeCost ? `FORJA · ${game.upgradeCost} cristais investidos` : `NÍVEL ${game.level} · evolução gratuita`}<span>3 ofertas · ${SKILLS.length} habilidades no conjunto</span></p><div class="skill-grid">${game.offers.map((s,i)=>`<button class="skill-card" style="--skill-color:${s.color}" data-skill="${s.id}"><small>${s.branch}</small>${skillArt(s.id)}<h3>${s.name}</h3><p>${s.desc}</p>${skillPreview(game,s.id)}${masteryProgress(game,s.id)}<em>${i+1} · ${game.skillLevels[s.id]===4&&s.mastery?'DESPERTAR':'ESCOLHER'}</em></button>`).join('')}</div><div class="draft-footer"><span>${game.crystals} cristais · tempo suspenso</span><button class="pixel-button" id="reroll-skills" ${game.crystals<6?'disabled':''}>NOVAS OFERTAS · 6 ◆</button></div>`;
}
export function skillLibrary(game = null) {
  const run=game || {skillLevels:{}};
  return `<div class="strategy-row"><article><b>01 · SUPERNOVA</b><p>Pólvora + estilhaços + alcance. Abra diagonais e atravesse caixas.</p></article><article><b>02 · TEMPESTADE FRIA</b><p>Gelo + raios + alquimia. Controle grupos e acelere sua evolução.</p></article><article><b>03 · COMETA GUARDIÃO</b><p>Esquiva + cometa + égide. Cruze a horda com proteção e dano.</p></article></div><p class="balance-note">${game?'SUA BUILD NESTA FASE':'GRIMÓRIO · 16 HABILIDADES'}<span>Escolha a mesma 5 vezes para despertar.</span></p><div class="skill-library">${SKILLS.map(s=>`<article style="--skill-color:${s.color}" class="library-skill ${run.skillLevels[s.id]?'owned':''}"><div>${skillArt(s.id)}<span><small>${s.branch} · ${run.skillLevels[s.id]||0}${s.mastery?'/5':''}</small><h3>${s.name}</h3></span></div><p>${s.desc}</p>${masteryProgress(run,s.id)}${s.mastery?`<button class="pixel-button" data-train-skill="${s.id}">TESTAR DESPERTAR →</button>`:''}</article>`).join('')}</div><p class="map-help">O teste inicia uma arena separada com a habilidade em 4/5. A próxima carta aplica o despertar real. O save permanece intacto.</p>`;
}
export function updateCombatHUD(game) {
  const $=s=>document.querySelector(s), p=game.player, boss=game.boss;
  $('#hp-value').textContent=Math.ceil(p.hp); $('.combat-life strong em').textContent=' / '+p.maxHp;
  $('.combat-life small b').textContent='NV. '+game.level;
  $('#hp-fill').style.width=(p.hp/p.maxHp*100)+'%'; $('#hp-fill').classList.toggle('low',p.hp<p.maxHp*.3);
  $('.combat-life .xp-track i').style.width=(game.xp/game.nextXp*100)+'%';
  const seconds=Math.max(0,Math.ceil(120-game.elapsed));
  $('.combat-time>b').textContent=`${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`;
  $('.combat-time>span').textContent=game.biome.name.toUpperCase()+' · FASE '+game.round;
  $('.combat-wallet').lastChild.textContent=game.crystals;
  $('.boss-health').hidden=!boss; $('.combat-time').hidden=!!boss;
  if(boss){$('.boss-health>b').textContent=boss.name;$('.boss-health>small').textContent=boss.stagger>0?'ATORDOADO · +50% DANO RECEBIDO':game.biome.title.toUpperCase();$('.boss-track i').style.width=(boss.hp/boss.maxHp*100)+'%';}
  $('#bomb-action span b').textContent=`${p.capacity-game.bombs.length}/${p.capacity}`;
  $('#dash-action span').textContent=p.dashCooldown>0?'ESQUIVA '+p.dashCooldown.toFixed(1)+'s':'ESQUIVA';
  $('#evolve-action span').textContent='FORJAR · '+game.forgeCost+' ◆';
  $('#evolve-action').classList.toggle('ready',game.crystals>=game.forgeCost);
  $('#evolve-action').disabled=!game.active||game.crystals<game.forgeCost;
  $('#dash-action').disabled=!game.active||p.dashCooldown>0;
  $('#bomb-action').disabled=!game.active||game.bombs.length>=p.capacity;
  const stamp=JSON.stringify(game.skillLevels);
  if($('.build-strip').dataset.stamp!==stamp){$('.build-strip').dataset.stamp=stamp;$('.build-strip>div').innerHTML=SKILLS.filter(s=>game.skillLevels[s.id]).map(s=>`<button data-open="grimoire" title="${s.name} · ${game.skillLevels[s.id]}/5" class="run-rune ${game.masteries.includes(s.id)?'awakened':''}">${skillArt(s.id)}<b>${game.masteries.includes(s.id)?'★':game.skillLevels[s.id]}</b></button>`).join('')||'<small>Destrua caixas e colete XP.</small>';}
  $('#combat').dataset.phase=game.phase; $('#combat').dataset.level=game.level;
}
