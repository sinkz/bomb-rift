import fs from 'node:fs';
import postcss from 'postcss';

// Preserve the approved scene's breakpoints while isolating its styles from combat.
const css=postcss.parse(fs.readFileSync('mockups/refuge/style.css','utf8'));
const allowed=new Set('world scenery vignette portal-light embers top-hud playerplate frame xp-track hub-title purse square ranking panel-caption text-button scene-actions sign forge-sign portal-sign garden-hotspot next-run tiny pixel-button primary peace dock dock-primary prototype-label hero-shadow hero-walk-canvas hero-interact sprite-ready reduced-motion'.split(' '));
css.walkAtRules(a=>{if(a.name==='import'||a.name==='font-face')a.remove();});
css.walkRules(rule=>{
  if(rule.parent.type==='atrule'&&/keyframes$/.test(rule.parent.name))return;
  const selected=rule.selectors.filter(s=>!s.includes('dialog')&&[...s.matchAll(/\.([\w-]+)/g)].every(m=>allowed.has(m[1]))&&[...s.matchAll(/#([\w-]+)/g)].every(m=>['hub','hero','hero-sprite','hero-thought'].includes(m[1])));
  if(!selected.length){rule.remove();return;}
  rule.selectors=selected.map(s=>s===':root'||s==='body'?'#launch':s.startsWith('body.')?s.replace('body.','#launch.'):`#launch ${s}`);
});
css.walkAtRules(a=>{if(a.nodes&&!a.nodes.length)a.remove();});
fs.writeFileSync('src/refuge-home.css','/* Approved refuge scene; regenerate with node scripts/refuge-styles.mjs. */\n'+css.toString().replaceAll('./assets/','../mockups/refuge/assets/'));
