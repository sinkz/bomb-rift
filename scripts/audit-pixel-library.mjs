import assert from 'node:assert/strict';
import {readFileSync,existsSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {SKILLS} from '../src/game.js';
import {RELICS,WORLDS,ENEMY_NAMES} from '../src/campaign.js';
import {TALENTS,GEAR,CONTRACTS,OUTFITS,RESOURCES,BRANCHES} from '../src/legacy.js';

const lib='public/pixel-library/',c=JSON.parse(readFileSync(lib+'catalog.json','utf8'));
const ids=new Set(c.items.map(i=>i.id));
assert.equal(ids.size,c.items.length,'Duplicate comparison ids');
const checks=[];
const covers=(label,prefix,entries)=>{const expected=entries.map(x=>prefix+(typeof x==='string'?x:x.id));for(const id of expected)assert(ids.has(id),'Missing '+id);checks.push({label,count:expected.length});};
covers('Habilidades','skill-',SKILLS);covers('Relíquias','relic-',RELICS);covers('Talentos','talent-',TALENTS);covers('Equipamentos','gear-',GEAR);covers('Contratos','contract-',CONTRACTS);covers('Bestiário','enemy-',Object.keys(ENEMY_NAMES));covers('Recursos','resource-',Object.keys(RESOURCES));covers('Retratos','portrait-',OUTFITS);covers('Tinturas','outfit-',OUTFITS);covers('Guardiões 2D','guardian-',WORLDS);covers('Mapas 2D','map-',WORLDS);covers('Ramos','branch-',BRANCHES);
const main=readFileSync('src/main.js','utf8');
const icons=main.match(/const ICONS = \{([^}]+)\}/)[1].split(',').map(s=>s.trim().split(':')[0]);
covers('Registro completo de controles','ui-',icons);
const artIds=[...readFileSync('src/rpg-art.js','utf8').matchAll(/^    ([\w-]+):/gm)].map(m=>m[1]);
assert.equal(artIds.length,9,'Review new RPG artwork kinds');
const grouped=Object.fromEntries([...new Set(c.items.map(i=>i.group))].map(g=>[g,c.items.filter(i=>i.group===g).length]));
for(const item of c.items){assert(item.old?.length>5,'Missing original '+item.id);assert(item.source,'Missing provenance '+item.id);assert(existsSync('public/'+item.new),'Missing PNG '+item.new);}
const baseline=JSON.parse(readFileSync(lib+'game-baseline.json','utf8'));
for(const [path,digest] of Object.entries(baseline))assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),digest,'Game changed: '+path);
const audit=JSON.parse(readFileSync(lib+'audit.json','utf8'));
assert.equal(audit.missing.length,0);assert.equal(audit.readyAssets,147);assert(audit.cells.every(x=>x.transparent),'Opaque sprite');
const result={ok:true,comparisons:c.items.length,uniqueAssets:new Set(c.items.map(i=>i.new)).size,categories:grouped,sourceCoverage:checks,gameFilesUnchanged:Object.keys(baseline).length,notes:'Cobertura comparada aos dados vivos e ao registro de controles. Molduras e glifos auditados visualmente; a galeria é uma prévia isolada.'};
writeFileSync(lib+'coverage.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
