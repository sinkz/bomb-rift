import { SKILLS } from './skills.js';
import { ARENA_RITES } from './boss-mechanics.js';
const awakenings = {
  power:['Blue sun','Blue explosions and another +2 damage.'],
  range:['Siege lance','Explosions pierce the first crate in each direction.'],
  capacity:['Grand finale','The bomb filling your last slot gains +4 damage.'],
  speed:['Intangible','Each dash now protects you for 1 second.'],
  health:['Living fortress','Restore all health and gain an additional 20% armor.'],
  magnet:['Vital orbit','+3 collection radius. Each collected crystal restores 1 health.'],
  fuse:['First spark','Planting a bomb with all slots free grants it +3 damage.'],
  dash:['Rift dance','Each kill restores 0.6s of dash cooldown.'],
  vampire:['Immortal blood','A kill at full health restores one shield. Charges do not stack.'],
  chain:['Living storm','Lightning jumps to up to 5 enemies, dealing 5 damage per target.'],
  frost:['Absolute zero','Freeze enemies for 2s; hitting a frozen target deals +2 damage. Bosses resist.'],
  shrapnel:['Supernova','All four diagonals reach 4 tiles. Every bomb gains +1 damage.'],
  ward:['Portable sanctuary','A new shield every 6s. Blocking heals 10 health.'],
  alchemy:["Philosopher’s stone",'Forging skills costs 25% fewer crystals.'],
  afterglow:['Falling star','Dashing deals 8 damage with a cross-shaped impact on arrival, without hurting you.'],
};
const skills = {
  chain:['Voltaic arc','Bomb hits jump to up to 2 nearby enemies. +1 lightning damage per level.'],
  frost:['Winter crystal','Explosions slow enemies. Each selection extends the effect.'],
  shrapnel:['Shrapnel rose','Adds diagonal rays to bombs. Alternates diagonal range and damage upgrades.'],
  ward:['Crystal aegis','Periodically restores one shield. Each selection reduces the interval by 2s.'],
  alchemy:['Rift alchemy','+12% experience per crystal. Evolve more often this stage.'],
  afterglow:['Comet trail','Your dash instantly damages enemies along its path. +1 damage per level.'],
};
const rites = {
  ruins:['THE BELL TOWER FALLS','Pillars are about to fall. Blast the runes to stagger Mórthos!'],
  forge:['THE FURNACE OPENS','Leave the orange lane. Blast the valves to cool Vulkar down!'],
  abyss:['THE HORIZON SHATTERS','Nyxara is moving. Blast the mirrors to interrupt the queen!'],
  garden:['ROOTS BENEATH THE STONE','Roots break through pillars. Destroy the glowing bulbs!'],
  storm:['CORE OVERLOAD','Leave the yellow circuit. Destroy the conductors to stop Fulgra!'],
  frost:['WINTER SHATTERS','Ice opens a diagonal. Destroy the crystals to break the crown!'],
};
export const PROGRESSION_EN = {
  'Inimigos distraídos. Um campeão fecha a caçada.': 'Distracted enemies. A champion closes the hunt.',
  'Praça aberta. O guardião aparece — e não fica.': 'An open plaza. The guardian shows up — and does not stay.',
  'A arena se parte quando ele chega. Sem fuga agora.': 'The arena breaks apart when it arrives. No escape now.',
  'Seu pavio ainda é curto demais.': 'Your fuse is still far too short.',
  'Volte quando tiver mais que fagulhas.': 'Come back when you have more than sparks.',
  'Ainda não. O vazio escolhe a hora.': 'Not yet. The void picks the hour.',
  'As raízes ainda não terminaram de crescer.': 'The roots have not finished growing.',
  'O trovão não gasta seu melhor raio à toa.': 'Thunder does not waste its best bolt.',
  'O inverno tem paciência. Eu também.': 'Winter is patient. So am I.',
  'Você me fez correr. Isso não se repete.': 'You made me run. That will not happen twice.',
  'A fornalha lembra de quem a apagou.': 'The forge remembers who put it out.',
  'Eu voltei primeiro. Você chegou tarde.': 'I returned first. You arrived late.',
  'Enterrei você uma vez. Agora floresce.': 'I buried you once. Now it blooms.',
  'Guardei esse relâmpago para você.': 'I saved this lightning for you.',
  'O gelo guardou seu último suspiro.': 'The ice kept your last breath.',
  'TEMPESTADE':'STORM','CONTROLE':'CONTROL','DANO ELÉTRICO':'LIGHTNING DAMAGE','LENTIDÃO / S':'SLOW / S',
  'ALCANCE DIAGONAL':'DIAGONAL RANGE','RECARGA / S':'COOLDOWN / S','BÔNUS DE XP':'XP BONUS','DANO DA ESQUIVA':'DASH DAMAGE',
  'CURA IMEDIATA':'INSTANT HEAL','DESPERTA':'AWAKENED','DESPERTAR':'AWAKENING',
  'NESTA ESCOLHA:':'THIS SELECTION:','NA QUINTA ESCOLHA:':'ON YOUR FIFTH SELECTION:',
  'GUARDIÃO ATORDOADO':'GUARDIAN STAGGERED','4s para atacar · +50% de dano':'4s to attack · +50% damage',
  'O pavio pode esperar':'The fuse can wait',
};
for(const skill of SKILLS){
  if(awakenings[skill.id]){PROGRESSION_EN[skill.mastery]=awakenings[skill.id][0];PROGRESSION_EN[skill.awakening]=awakenings[skill.id][1];}
  if(skills[skill.id]){PROGRESSION_EN[skill.name]=skills[skill.id][0];PROGRESSION_EN[skill.desc]=skills[skill.id][1];}
}
for(const [id,rite] of Object.entries(ARENA_RITES)){PROGRESSION_EN[rite.name]=rites[id][0];PROGRESSION_EN[rite.hint]=rites[id][1];}
