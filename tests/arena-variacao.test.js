import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, seededRandom } from '../src/game.js';

// "Cada batalha com os guardioes deve ser unica, o mapa vai mudar diferente em
// cada ocasiao" -- pedido do dono, e a regra que o reshapeArena implementa.
//
// A FORMA e a assinatura do guardiao e continua fixa de proposito: a Caldeira
// sempre abre faixas, a Mare sempre parte na diagonal. E isso que torna a luta
// dele reconhecivel. O que a semente da expedicao muda e ONDE.
//
// A VARIEDADE DE HOJE E BAIXA E ESTA MEDIDA AQUI: 'pillars' tem seis estados
// (passo x fase) e produz ~6 arenas distintas em 20 expedicoes; 'row' e
// 'column' tem as faixas espelhadas e ficam em dez estados.
//
// Eu tentei alargar isso em 2026-09-13 -- fase de z independente, desencontro
// entre linhas, offset proprio para a segunda faixa -- e cheguei a 13/20. E
// REVERTI. Com as arenas novas, o boss-simulation acusou inversao sistematica
// em quatro sementes na fase 12: o piloto que EVITA a brasa se queimava mais
// (11) que o que a ignora (5). O codigo original passa no mesmo teste agregado,
// entao nao era fragilidade do teste -- era injustica nova.
//
// Quem for alargar de novo tem de resolver a interacao com planHazards antes:
// mudar o desenho das paredes muda onde a mancha de brasa cai, e alguma dessas
// quedas transforma desviar em armadilha. Os limites abaixo guardam o estado
// atual contra REGRESSAO; subir os numeros exige resolver aquilo primeiro.

const duelos = [[3, 'ruins'], [6, 'forge'], [9, 'abyss'], [12, 'garden'], [15, 'storm'], [18, 'frost']];

function arena(fase, salt) {
  const g = new Game({ random: seededRandom(7), meta: { unlockedStage: 18 } });
  g.start(fase);
  g.expedition = { salt };
  g.reshapeArena();
  return g;
}
const impressao = g => g.grid.map(r => r.join('')).join('');

test('a mesma fase se remodela diferente entre expedicoes', () => {
  const sais = Array.from({ length: 20 }, (_, i) => i * 97531);
  for (const [fase, nome] of duelos) {
    const distintas = new Set(sais.map(s => impressao(arena(fase, s)))).size;
    // Guarda contra regressao do estado atual (6 a 12 em 20), nao um alvo.
    assert(distintas >= 5,
      `${nome}: so ${distintas} arenas distintas em 20 expedicoes -- o duelo repete`);
  }
});

test('a remodelagem nunca ilha um pedaco do chao', () => {
  // O invariante que impede a arena de virar armadilha. Vale para toda forma e
  // toda semente: se um pedaco do chao ficar inalcancavel, o jogador pode
  // perder itens, o chefe pode encalhar e a fase vira impossivel.
  const sais = Array.from({ length: 20 }, (_, i) => i * 97531);
  for (const [fase, nome] of duelos) {
    for (const salt of sais) {
      const g = arena(fase, salt);
      const p = g.player, vistos = new Set([`${p.x},${p.z}`]), fila = [[p.x, p.z]];
      while (fila.length) {
        const [x, z] = fila.pop();
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, nz = z + dz, k = `${nx},${nz}`;
          if (vistos.has(k) || g.tile(nx, nz) === 1) continue;
          vistos.add(k); fila.push([nx, nz]);
        }
      }
      let chao = 0;
      for (let z = 1; z < g.height - 1; z++) for (let x = 1; x < g.width - 1; x++) if (g.tile(x, z) !== 1) chao++;
      assert(vistos.size >= chao, `${nome} com semente ${salt}: ${chao - vistos.size} casas ilhadas`);
    }
  }
});

test('a forma continua sendo a assinatura do guardiao', () => {
  // O contrario do teste acima: variar demais apagaria o que torna cada duelo
  // reconhecivel. Duas expedicoes do MESMO guardiao tem de se parecer mais
  // entre si do que com as de outro guardiao.
  const parecenca = (a, b) => [...a].filter((c, i) => c === b[i]).length / a.length;
  for (const [fase, nome] of duelos) {
    const mesmas = [arena(fase, 11111), arena(fase, 22222)].map(impressao);
    const outro = impressao(arena(fase === 3 ? 6 : 3, 11111));
    const entreIguais = parecenca(mesmas[0], mesmas[1]);
    const entreOutros = parecenca(mesmas[0], outro);
    assert(entreIguais > entreOutros,
      `${nome}: duas expedicoes do mesmo guardiao (${entreIguais.toFixed(2)}) nao se parecem mais que as de outro (${entreOutros.toFixed(2)})`);
  }
});
