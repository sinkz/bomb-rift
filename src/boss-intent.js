import { MIN_TELEGRAPH, carveSafeHouse } from './boss-mechanics.js';

// A intencao do guardiao. Ate aqui ele resolvia o caminho minimo ate o jogador
// e andava: perseguicao sem plano. Este modulo acrescenta as tres coisas que
// transformam "ele vem atras de mim" em "ele esta me prensando".
//
// Fica separado de boss-ai.js de proposito. O boss-ai decide QUANDO andar; este
// decide PARA ONDE e POR QUE. E a dificuldade mexe aqui, nao la.

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const distancia = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.z - b.z);

/**
 * A dificuldade finalmente chega na cabeca do guardiao.
 *
 * Ate 2026-09-11 a IA dele era IDENTICA nos tres niveis -- `intelligence` so era
 * lido pela horda, e a linha que o consulta exclui o chefe explicitamente. Subir
 * a dificuldade deixava o guardiao mais duro, nunca mais esperto.
 *
 * `cerco`: a partir de qual ato ele passa a escolher o passo que fecha saidas.
 * `arremesso`: a partir de qual ato ele pune quem fica longe, e de quantos em
 *              quantos segundos.
 * `alcance`: de quantas casas de distancia ele ja considera valer o arremesso.
 * `toque`: se ele fere so na mesma casa (false) ou tambem na casa vizinha.
 *
 * O `alcance` existe por causa de uma interacao que so apareceu medindo: no
 * hard ele cerca desde o ato 1, entao fica COLADO no jogador -- e quase nunca
 * satisfazia a condicao de "longe" para arremessar. Somados em tres sementes,
 * o hard arremessava MENOS que o medium (6 contra 7), o contrario do que a
 * tabela prometia. Um alcance menor no hard destrava o arremesso de perto.
 */
export const INTENCAO = Object.freeze({
  easy: { cerco: 3, arremesso: 0, recarga: 0, alcance: 99, toque: 3 },
  medium: { cerco: 2, arremesso: 2, recarga: 7, alcance: 4, toque: 2 },
  hard: { cerco: 1, arremesso: 1, recarga: 5, alcance: 3, toque: 1 },
});

export const intencaoDe = game => INTENCAO[game.difficulty] || INTENCAO.easy;

/** Casas livres ao redor de uma posicao, do ponto de vista de quem anda. */
function passosLivres(game, quem, de = quem) {
  return DIRS
    .map(([dx, dz]) => ({ x: de.x + dx, z: de.z + dz }))
    .filter(c => game.walkable(c.x, c.z, quem) && !game.occupied(c.x, c.z, quem));
}

/**
 * Quantas casas o jogador alcanca em dois passos, fingindo que o guardiao esta
 * em `bossEm`. E a medida de "quanto ar ele ainda tem".
 */
export function respiro(game, bossEm) {
  const p = game.player;
  const bloqueado = (x, z) => x === bossEm.x && z === bossEm.z;
  const vistos = new Set([`${p.x},${p.z}`]);
  let borda = [p], total = 0;
  for (let passo = 0; passo < 2; passo++) {
    const proxima = [];
    for (const c of borda) {
      for (const [dx, dz] of DIRS) {
        const x = c.x + dx, z = c.z + dz, k = `${x},${z}`;
        if (vistos.has(k) || !game.walkable(x, z) || bloqueado(x, z)) continue;
        // Chao aceso nao e ar: uma saida que queima nao e saida.
        if (game.harmful?.(x, z)) continue;
        vistos.add(k); proxima.push({ x, z }); total++;
      }
    }
    borda = proxima;
  }
  return total;
}

/**
 * O passo que mais fecha o jogador. Caminho minimo vira desempate, nao criterio.
 * Devolve null quando cercar nao e melhor que simplesmente avancar -- ai o
 * chamador usa o pathStep de sempre.
 */
export function passoDeCerco(game, boss) {
  const opcoes = passosLivres(game, boss);
  if (!opcoes.length) return null;
  const agora = respiro(game, boss);
  let melhor = null, menorAr = Infinity, menorDist = Infinity;
  for (const c of opcoes) {
    const ar = respiro(game, c);
    const dist = distancia(c, game.player);
    if (ar < menorAr || (ar === menorAr && dist < menorDist)) { melhor = c; menorAr = ar; menorDist = dist; }
  }
  // So vale a pena se de fato tirar ar. Cercar por cercar viraria dança.
  return melhor && menorAr < agora ? melhor : null;
}

/**
 * Punicao para quem faz kite eterno. E um golpe telegrafado como qualquer
 * outro -- passa por carveSafeHouse, entao nunca e xeque-mate.
 */
export function arremessar(game, boss) {
  const p = game.player;
  const duracao = MIN_TELEGRAPH + .15;
  const cells = carveSafeHouse(game, [{ x: p.x, z: p.z }], duracao);
  if (!cells.length) return false;
  boss.castTimer = duracao;
  boss.intent = 'cast';
  boss.throwCooldown = intencaoDe(game).recarga;
  game.warnings.push({ id: game.nextId++, bossId: boss.id, cells, duration: duracao, timer: duracao, damage: 16 });
  game.emit('warning', { id: boss.id, cells, duration: duracao, name: 'ARREMESSO', move: 'throw', phase: boss.phase || 1 });
  game.emit('bossThrow', { id: boss.id, x: boss.x, z: boss.z, target: { x: p.x, z: p.z }, color: game.biome.color });
  return true;
}

/** Vale arremessar agora? Longe, sem golpe em curso, e com a recarga vencida. */
export function querArremessar(game, boss) {
  const regra = intencaoDe(game);
  if (!regra.arremesso || (boss.phase || 1) < regra.arremesso) return false;
  if ((boss.throwCooldown || 0) > 0) return false;
  return distancia(boss, game.player) >= regra.alcance;
}

/**
 * Dano de proximidade. Ele ja existia, mas so na MESMA casa -- com o guardiao
 * andando a meio segundo por passo, quase nunca acontecia. Agora a casa vizinha
 * tambem dói, com recarga propria para nao virar moedor.
 */
export function toqueDoGuardiao(game, boss, dt) {
  boss.touchCooldown = Math.max(0, (boss.touchCooldown || 0) - dt);
  if (boss.touchCooldown > 0) return false;
  const dist = distancia(boss, game.player);
  const regra = intencaoDe(game);
  const alcanca = dist === 0 || (dist === 1 && (boss.phase || 1) >= regra.toque);
  if (!alcanca) return false;
  boss.touchCooldown = 1.5;
  game.hurt(dist === 0 ? 24 : 14, { de: { x: boss.x, z: boss.z, tipo: 'boss' } });
  game.emit('bossTouch', { id: boss.id, x: game.player.x, z: game.player.z, color: game.biome.color });
  return true;
}
