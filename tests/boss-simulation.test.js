import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, seededRandom } from '../src/game.js';
import { MIN_TELEGRAPH, escapeSteps, safeHouses } from '../src/boss-mechanics.js';
import { CICLO } from '../src/hazard-cycle.js';
import * as intencaoImport from '../src/boss-intent.js';

// Headless fight simulator. Every world is fought from full health down to the
// desperation phase while an invariant checker watches every event the guardian
// produces. This is the regression net for "no damage the player could not read".
const DIRS = [[0,-1],[1,0],[0,1],[-1,0]];
const key = c => `${c.x},${c.z}`;
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
const STAGES = [3, 6, 9, 12, 15, 18, 21, 33];

function boot(stage, seed) {
  const g = new Game({ random: seededRandom(seed), meta: { unlockedStage: 40 } });
  assert(g.start(stage));
  g.enemies = []; g.pickups = []; g.spawnClock = Infinity; g.hazardClock = Infinity;
  g.elapsed = 119.9; g.tick(.2);
  // Num duelo a arena se transforma antes: atravesse a transicao congelada.
  while (g.phase === 'transition') g.tick(.2);
  assert(g.boss, 'the guardian must be awake');
  g.spawnClock = Infinity; g.hazardClock = Infinity; g.drainEvents();
  return g;
}
// The promise the fight makes is measured the instant a mark is painted: from
// where the player stands right then, a clean tile has to be within reach.
// Le as marcas de golpe mas ignora o chao aceso. Serve para medir se a brasa
// tem consequencia: se nem este se queima, o perigo e enfeite.
const cego = g => dodge(g, { veBrasa: false });
function trapped(g) {
  const p = g.player, live = g.warnings.filter(w => w.damage !== 0);
  const covering = live.filter(w => w.cells.some(c => c.x === p.x && c.z === p.z));
  if (!covering.length) return null;
  const budget = escapeSteps(g, Math.min(...covering.map(w => w.timer)));
  const danger = new Set(live.flatMap(w => w.cells).map(key));
  // Brasa acesa conta como perigo aqui: golpe e chao vem de sistemas diferentes
  // e nao podem somar num xeque-mate por acidente.
  for (const celula of g.hazardField.list()) danger.add(key(celula));
  const queue = [{ x: p.x, z: p.z, d: 0 }], seen = new Set([key(p)]);
  while (queue.length) {
    const cell = queue.shift();
    if (cell.d && !danger.has(key(cell))) return null;
    if (cell.d >= budget) continue;
    for (const [dx, dz] of DIRS) {
      const x = cell.x + dx, z = cell.z + dz;
      if (seen.has(`${x},${z}`) || !g.walkable(x, z)) continue;
      seen.add(`${x},${z}`); queue.push({ x, z, d: cell.d + 1 });
    }
  }
  return `no way out of ${key(p)} within ${budget} steps`;
}
function fight(stage, seed, { pilot = null, seconds = 70 } = {}) {
  const g = boot(stage, seed), announced = new Map(), brasa = new Map(), report = { faults: [], impacts: 0, casts: 0, moves: new Set(), phases: [], contact: 0, blind: 0, burned: 0, scorched: 0, toques: [] };
  let clock = 0;
  for (let i = 0; i < seconds * 20 && g.boss; i++) {
    // The horde is muted so only the guardian can be blamed for a hit.
    g.enemies = []; g.spawnClock = Infinity; g.hazardClock = Infinity;
    if (g.player.hp < 60) g.restoreHealth(200);
    // Bleed the guardian down so a single fight crosses all three acts.
    g.boss.hp = Math.max(1, Math.ceil(g.boss.maxHp * Math.max(.08, 1 - clock / seconds)));
    if (pilot) pilot(g);
    g.tick(.05); clock += .05;
    let cast = false;
    for (const event of g.drainEvents()) {
      if (event.type === 'warning') {
        cast = true; report.casts++; if (event.move) report.moves.add(event.move);
        if (event.duration < MIN_TELEGRAPH) report.faults.push(`${event.name} telegraphed only ${event.duration}s`);
        if (!safeHouses(g, event.cells, event.duration).length) report.faults.push(`${event.name} left no reachable safe tile`);
        for (const c of event.cells) {
          if (c.x <= 0 || c.z <= 0 || c.x >= g.width - 1 || c.z >= g.height - 1) report.faults.push(`${event.name} marked the boundary at ${key(c)}`);
          if (!announced.has(key(c))) announced.set(key(c), []);
          announced.get(key(c)).push({ at: clock, due: clock + event.duration });
        }
      }
      if (event.type === 'hazardAviso') for (const c of event.cells) brasa.set(key(c), { avisadoEm: clock, acesoEm: null });
      if (event.type === 'hazardAcendeu') for (const c of event.cells) { const b = brasa.get(key(c)); if (b) b.acesoEm = clock; else report.faults.push(`brasa acendeu sem aviso em ${key(c)}`); }
      if (event.type === 'hazardEsfriou') for (const c of event.cells) brasa.delete(key(c));
      if (event.type === 'bossPhase') report.phases.push(event.phase);
      if (event.type === 'enemyExplosion' || event.type === 'webBurst') {
        report.impacts++;
        // A mark loses one frame of its life on the tick that creates it, so the
        // impact is allowed to land one tick early — never sooner.
        for (const c of event.cells) {
          const marks = announced.get(key(c)) || [];
          if (!marks.some(m => m.due <= clock + .051 && clock - m.at >= MIN_TELEGRAPH - .051)) report.faults.push(`impact at ${key(c)} was never marked`);
        }
      }
      if (event.type === 'hurt') {
        const encostado = g.boss && distance(g.boss, event) <= 1;
        if (encostado) { report.contact++; report.toques.push(clock); }
        else {
          // Fire only hurts while its own mark is resolving: never before, and
          // never long after the flame that the mark promised has burned out.
          const b = brasa.get(key(event));
          const acesaComAviso = b && b.acesoEm !== null && b.acesoEm - b.avisadoEm >= CICLO.aviso - .051;
          const marks = announced.get(key(event)) || [];
          if (acesaComAviso) report.scorched++;
          else if (!marks.some(m => clock >= m.due - .051 && clock <= m.due + .8)) { report.blind++; report.faults.push(`unmarked damage at ${key(event)}`); }
          else report.burned++;
        }
      }
    }
    if (cast) { const trap = trapped(g); if (trap) report.faults.push(trap); }
    if (g.boss && (!g.walkable(g.boss.x, g.boss.z) && !g.bombs.some(b => b.x === g.boss.x && b.z === g.boss.z))) report.faults.push(`the guardian stands inside stone at ${key(g.boss)}`);
  }
  report.socorros = g.hazardRescues || 0;
  return report;
}

test('a full fight in every world never lands damage the player could not read', () => {
  for (const stage of STAGES) {
    const report = fight(stage, 5 + stage);
    assert.deepEqual(report.faults.slice(0, 4), [], `stage ${stage}`);
    assert(report.casts > 8, `stage ${stage} only cast ${report.casts} telegraphs`);
    assert(report.impacts > 4, `stage ${stage} resolved ${report.impacts} impacts`);
    assert.equal(report.blind, 0);
  }
});

test('a fight walks through the two act breaks and uses more than one pattern', () => {
  for (const stage of [12, 15, 18]) {
    const report = fight(stage, 91 + stage);
    assert.deepEqual(report.phases, [2, 3], `stage ${stage} phases ${report.phases}`);
    assert(report.moves.size >= 3, `stage ${stage} only used ${[...report.moves]}`);
  }
});

test('no pattern is ever a checkmate: a clean tile is in reach the moment it is painted', () => {
  for (const stage of [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36]) for (const seed of [11, 300 + stage]) {
    const report = fight(stage, seed, { pilot: dodge });
    assert.deepEqual(report.faults.slice(0, 3), [], `stage ${stage} seed ${seed}`);
    assert.equal(report.blind, 0, `stage ${stage} hit a dodging player without a mark`);
  }
});

// Agregado por fase, nao uma semente so. Uma unica partida produz contagens
// pequenas -- houve caso de "7 contra 9" e de "1 contra 1" -- e ai QUALQUER
// mudanca na arena vira a comparacao sem que a propriedade tenha mudado. Somar
// sementes mede o que o teste quer dizer: desviar paga, em media.
const SEMENTES = [11, 29, 53, 97];
test('reading the marks pays: a moving player is hit far less than a statue', () => {
  for (const stage of STAGES) {
    let estatua = 0, piloto = 0;
    for (const seed of SEMENTES) {
      const s = fight(stage, seed), p = fight(stage, seed, { pilot: dodge });
      estatua += s.burned + s.contact; piloto += p.burned + p.contact;
    }
    assert(piloto < estatua, `stage ${stage}: piloto ${piloto} contra estatua ${estatua} somando ${SEMENTES.length} sementes`);
  }
});

// A competent player: never walks across a marked tile unless it is boxed in,
// leaves any mark it is standing on, and does not volunteer to stand on the
// guardian. It is the load the fairness invariants are measured under.
function dodge(g, { veBrasa = true } = {}) {
  const p = g.player, danger = new Set(g.warnings.flatMap(w => w.cells).map(key));
  if (veBrasa) for (const celula of g.hazardField.list()) danger.add(key(celula));
  for (const bomb of g.bombs) for (const c of g.blastCells(bomb)) danger.add(key(c));
  const boss = g.boss, touching = c => boss && distance(c, boss) <= 1;
  if (!danger.has(key(p)) && !touching(p)) return;
  for (const mode of ['clear', 'close', 'through']) {
    const queue = [{ x: p.x, z: p.z, first: null }], seen = new Set([key(p)]);
    while (queue.length) {
      const cell = queue.shift();
      if (cell.first && !danger.has(key(cell)) && (mode !== 'clear' || !touching(cell))) { g.move(cell.first.x - p.x, cell.first.z - p.z); return; }
      for (const [dx, dz] of DIRS) {
        const x = cell.x + dx, z = cell.z + dz;
        if (seen.has(`${x},${z}`) || !g.walkable(x, z) || (boss && x === boss.x && z === boss.z)) continue;
        if (mode !== 'through' && danger.has(`${x},${z}`)) continue;
        seen.add(`${x},${z}`); queue.push({ x, z, first: cell.first || { x, z } });
      }
    }
  }
}

// A emenda ao I2 so vale se for exercida: um teste que passa porque a brasa
// nunca acendeu nao prova nada. Este confere que ela acende, queima, e que
// nenhuma queimadura veio sem a janela de aviso.
test('a brasa errante arde no duelo, sempre anunciada antes', () => {
  let queimadurasTotais = 0;
  for (const stage of [3, 12, 18]) {
    const report = fight(stage, 77 + stage, { pilot: cego });
    assert.equal(report.blind, 0, `stage ${stage}: ${report.blind} dano(s) sem marca`);
    assert.deepEqual(report.faults.filter(f => f.includes('brasa')), [], `stage ${stage}`);
    // O degrau de socorro do carveSafeHouse e rede, nao ferramenta: se ele
    // disparou, o orcamento de brasa esta grande demais.
    assert.equal(report.socorros, 0, `stage ${stage}: carveSafeHouse apagou brasa ${report.socorros}x`);
    queimadurasTotais += report.scorched;
  }
  assert(queimadurasTotais > 0, 'a brasa nunca queimou ninguem -- a emenda ao I2 nao foi exercida');
});

test('ler o chao paga: quem desvia da brasa se queima muito menos', () => {
  // Nem toda fase queima o piloto distraido: arena grande com pouca brasa pode
  // simplesmente nao cruzar o caminho dele. Onde cruzar, atento tem de levar
  // menos -- e tem de cruzar em alguma.
  // Somado por fase, pelo mesmo motivo do teste acima: com uma semente so a
  // conta chegou a ser "atento 1, distraido 1", e um empate em UM nao diz nada
  // sobre ler o chao.
  let mediu = 0;
  for (const stage of [3, 6, 12, 18]) {
    let atentoTotal = 0, distraidoTotal = 0;
    for (const seed of SEMENTES) {
      const atento = fight(stage, seed + stage, { pilot: dodge });
      const distraido = fight(stage, seed + stage, { pilot: cego });
      assert.equal(atento.blind, 0, `stage ${stage} seed ${seed}: dano sem marca no piloto atento`);
      atentoTotal += atento.scorched; distraidoTotal += distraido.scorched;
    }
    if (!distraidoTotal) continue;
    mediu++;
    assert(atentoTotal < distraidoTotal,
      `stage ${stage}: atento levou ${atentoTotal} e distraido ${distraidoTotal} somando ${SEMENTES.length} sementes`);
  }
  assert(mediu > 0, 'a brasa nao alcancou o piloto distraido em nenhuma fase');
});

// O toque de proximidade e pressao, nao moedor. Se a recarga falhar, o jogador
// cercado perde a vida em um segundo e a luta vira injusta sem aviso nenhum.
test('o toque do guardiao respeita a propria recarga', () => {
  for (const stage of [3, 12, 18]) {
    const report = fight(stage, 41 + stage);
    const toques = report.toques;
    for (let i = 1; i < toques.length; i++) {
      const intervalo = toques[i] - toques[i - 1];
      assert(intervalo >= 1.4, `stage ${stage}: dois toques a ${intervalo.toFixed(2)}s um do outro`);
    }
  }
});

// A dificuldade tem de chegar na CABECA do guardiao, nao so na vida dele.
// Ate 2026-09-11 a IA era identica nos tres niveis.
test('a dificuldade muda como o guardiao pensa, nao so quanto ele aguenta', () => {
  const { INTENCAO } = intencaoImport;
  const niveis = ['easy', 'medium', 'hard'];
  for (let i = 1; i < niveis.length; i++) {
    const antes = INTENCAO[niveis[i - 1]], agora = INTENCAO[niveis[i]];
    assert(agora.cerco <= antes.cerco, `${niveis[i]} devia cercar tao cedo quanto ${niveis[i - 1]}`);
    assert(agora.toque <= antes.toque, `${niveis[i]} devia tocar tao cedo quanto ${niveis[i - 1]}`);
  }
  assert.equal(INTENCAO.easy.arremesso, 0, 'no easy o guardiao nao arremessa');
  assert(INTENCAO.hard.arremesso > 0 && INTENCAO.hard.recarga < INTENCAO.medium.recarga,
    'no hard ele arremessa mais vezes');
});

// Prova que a intencao nova ACONTECE, e nao so existe no codigo. E a mesma
// licao da brasa: teste que passa por omissao nao prova nada.
test('o cerco aperta sem sufocar, e a dificuldade muda o comportamento na pratica', () => {
  const { respiro } = intencaoImport;
  // Somado em varias sementes: numa luta so a diferenca entre recarga de 5s e
  // de 7s cabe dentro do acaso, e o teste viraria moeda.
  const arremessosPor = { easy: 0, medium: 0, hard: 0 };
  for (const dificuldade of ['easy', 'medium', 'hard']) for (const semente of [31, 77, 123]) {
    const g = new Game({ random: seededRandom(semente), meta: { unlockedStage: 40 } });
    g.difficulty = dificuldade;
    assert(g.start(3));
    g.enemies = []; g.pickups = []; g.spawnClock = Infinity; g.hazardClock = Infinity;
    g.elapsed = 119.9; g.tick(.2);
    while (g.phase === 'transition') g.tick(.2);
    g.player.invincible = 1e9;

    let arremessos = 0, arMinimo = Infinity;
    for (let i = 0; i < 70 * 20 && g.boss; i++) {
      g.enemies = []; g.spawnClock = Infinity; g.hazardClock = Infinity;
      if (g.boss.hp > 4) g.boss.hp = Math.max(4, g.boss.hp - .5);
      g.tick(1 / 20);
      for (const e of g.drainEvents()) if (e.type === 'bossThrow') arremessos++;
      if (g.boss) arMinimo = Math.min(arMinimo, respiro(g, g.boss));
    }
    // A garantia do cerco: apertar ate o jogador ter pouco ar, nunca ate zero.
    assert(arMinimo > 0, `${dificuldade} semente ${semente}: o guardiao sufocou o jogador (${arMinimo} saidas)`);
    arremessosPor[dificuldade] += arremessos;
  }
  assert.equal(arremessosPor.easy, 0, 'no easy o guardiao arremessou');
  assert(arremessosPor.hard > arremessosPor.medium,
    `hard devia arremessar mais que medium: ${arremessosPor.hard} vs ${arremessosPor.medium}. ` +
    'Se caiu abaixo, provavelmente o cerco esta colando ele no jogador e sufocando o arremesso -- ver INTENCAO.alcance.');
});

// Relatado jogando: "passei em cima e nao tomei dano". Eram duas causas somadas
// -- o dano era pulso da REGIAO (quem atravessava entre dois pulsos passava de
// graca) e hurt() dava 1,4s de invencibilidade contra um perigo que bate a cada
// 0,55s, comendo dois de cada tres tiques. Agora e presenca, com janela propria.
test('ficar em brasa queima de forma continua, e sair para de queimar', () => {
  const g = boot(3, 5);
  g.player.invincible = 0;
  g.restoreHealth(999);

  // Acende uma casa debaixo do jogador pela porta dos fundos do campo, para
  // medir so a regra de dano -- o planejador nunca faria isso, de proposito.
  const p = g.player;
  g.hazardField.add(p.x, p.z, 'lava');
  const regra = g.hazardField.rules.lava;

  // Quem faz a invencibilidade decair e o tick(); chamando queimarJogador
  // sozinho ela ficaria congelada e so a primeira mordida passaria.
  const quadro = dt => { g.player.invincible = Math.max(0, g.player.invincible - dt); g.queimarJogador(dt); };

  const antes = g.player.hp;
  for (let i = 0; i < 2 / (1 / 60); i++) quadro(1 / 60);
  const levou = antes - g.player.hp;

  // Em 2s de lava (tique .55) cabem ~3 mordidas. Aceito 2 para folga de borda.
  assert(levou >= regra.damage * 2,
    `dois segundos em lava tiraram so ${levou} de vida -- devia tirar ao menos ${regra.damage * 2}`);

  // Saiu do fogo, parou de queimar.
  g.hazardField.clear();
  g.player.invincible = 0;
  const depois = g.player.hp;
  for (let i = 0; i < 2 / (1 / 60); i++) quadro(1 / 60);
  assert.equal(g.player.hp, depois, 'continuou queimando fora do fogo');
  assert.equal(g.player.burning, 0, 'o estado de queimadura nao zerou');
});

// O gelo prende em vez de ferir, e isso tem de valer tambem no caminho novo.
test('o gelo prende quem fica em cima, sem tirar vida', () => {
  const g = boot(3, 5);
  g.player.invincible = 0;
  g.restoreHealth(999);
  const antes = g.player.hp;
  g.hazardField.add(g.player.x, g.player.z, 'gelo');
  for (let i = 0; i < 2 / (1 / 60); i++) { g.player.invincible = Math.max(0, g.player.invincible - 1 / 60); g.queimarJogador(1 / 60); }
  assert.equal(g.player.hp, antes, 'o gelo tirou vida');
  assert(g.player.slow > 0, 'o gelo nao prendeu');
});

// Medido em 2026-09-12: com a brasa respeitando a invencibilidade dos golpes,
// lava (tique .55) e ruina (tique .75) tiravam a MESMA coisa numa luta cheia,
// porque o 1,4s dos golpes e maior que qualquer tique. A afinacao por bioma
// existia no codigo e nao chegava na vida do jogador. Agora ela chega.
test('cada perigo machuca no proprio ritmo, mesmo apanhando do guardiao', () => {
  const medir = (stage, kind) => {
    const g = boot(stage, 5);
    g.restoreHealth(999);
    g.player.invincible = 0;
    g.hazardField.clear();
    g.hazardField.add(g.player.x, g.player.z, kind);
    const antes = g.player.hp;
    for (let i = 0; i < 3 / (1 / 60); i++) {
      // Golpe do guardiao no meio do caminho: e ele que antes engolia os tiques.
      if (i === 30) g.hurt(1, { iframes: 1.4 });
      g.player.invincible = Math.max(0, g.player.invincible - 1 / 60);
      g.queimarJogador(1 / 60);
    }
    return antes - g.player.hp;
  };

  const lava = medir(6, 'lava');       // 16 a cada .55s -> ~5 mordidas em 3s
  const espinho = medir(6, 'espinho'); // 10 a cada .80s -> ~3 mordidas em 3s
  assert(lava > espinho * 1.5,
    `a lava devia machucar bem mais que o espinho: ${lava} vs ${espinho}`);
  // E o golpe do guardiao no meio nao pode ter blindado o jogador contra o chao.
  assert(lava >= 16 * 4, `a lava so tirou ${lava} em 3s -- a invencibilidade ainda engole tiques`);
});
