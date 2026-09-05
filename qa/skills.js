// Development-only visual fixture. Not a production entry point and never changes a saved run.
import '@fontsource/oxanium/latin-500.css';
import '@fontsource/oxanium/latin-600.css';
import '@fontsource/oxanium/latin-700.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '../src/style.css';
import '../src/game-hud.css';
import '../src/juice.css';
import '../src/pixel-art.css';
import { Game, SKILLS, seededRandom } from '../src/game.js';
import { skillArt, skillPreview } from '../src/skill-art.js';
import { pixelIcon } from '../src/pixel-art.js';
import { setHTML, setLocale } from '../src/i18n.js';

const g = new Game({random:seededRandom(42)});
g.start(1);
g.player.hp=65;
const host=document.querySelector('#qa-skills');
const controls=document.querySelector('#qa-controls');
controls.innerHTML='<label>Language <select id="qa-language"><option value="pt-BR">Português</option><option value="en">English</option></select></label> <label>Cards <select id="qa-page"><option value="0">Capacity / Magnet / Speed</option><option value="1">Power / Range / Health</option><option value="2">Fuse / Dash / Heal</option><option value="3">Vampire / Health / Power</option></select></label>';
const style=document.createElement('style');
style.textContent='#qa-controls{padding:18px;display:flex;gap:16px;flex-wrap:wrap;justify-content:center}#qa-controls select{padding:8px;background:#282030;color:#fff;border:1px solid #8b709d}#qa-skills{padding:20px}#qa-skills>.modal{margin:auto;max-height:none;overflow:visible;width:min(950px,100%)}';
document.head.append(style);
const pages=[['capacity','magnet','speed'],['power','range','health'],['fuse','dash','heal'],['vampire','health','power']];
function render(){
  setLocale(document.querySelector('#qa-language').value);
  const selected=pages[Number(document.querySelector('#qa-page').value)];
  setHTML(host,`<section class="modal modal-upgrade wide"><div class="upgrade-sigil">${pixelIcon('Sparkles')}</div><span class="eyebrow orange">NÍVEL 2 · PODER DESPERTADO</span><h2>Escolha sua evolução.</h2><p>Três caminhos. Uma escolha. Faça a fenda lembrar de você.</p><div class="skill-options">${selected.map((id,i)=>{const s=SKILLS.find(s=>s.id===id);return `<button class="skill-option" style="--skill-color:${s.color}" data-skill="${id}"><span class="skill-option-top"><span>${pixelIcon(s.icon)} ${s.branch}</span><kbd>${i+1}</kbd></span><span class="skill-option-icon">${skillArt(id)}</span><h3>${s.name}</h3><p>${s.desc}</p>${skillPreview(g,id)}<span class="skill-option-bottom"><span>◆ NÍVEL 1</span>${pixelIcon('ArrowUpRight')}</span></button>`;}).join('')}</div><span class="upgrade-pause-note">TEMPO SUSPENSO · ESCOLHA COM CALMA</span></section>`);
}
controls.addEventListener('change',render);
render();
