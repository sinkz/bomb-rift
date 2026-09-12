// Vencer uma fase deixou de ser "matar o chefe": cada tipo tem o seu desfecho.
// Os testes de campanha usam este helper para nao repetir a bifurcacao.
import assert from 'node:assert/strict';
import { ROUND_SECONDS } from '../../src/game.js';

const settle = game => { let guard = 0; while (game.phase === 'transition' && guard++ < 600) game.tick(1 / 60); };

export function winStage(game, { seconds = 30 } = {}) {
  game.elapsed = ROUND_SECONDS; game.totalTime += ROUND_SECONDS;
  const kind = game.stage.kind;
  if (kind === 'hunt') {
    game.spawnChampion();
    assert(game.champion, `a cacada da fase ${game.round} precisa de um campeao`);
    game.totalTime += seconds;
    game.damageEnemy(game.champion, 1e5);
  } else {
    game.spawnBoss(); settle(game);
    assert(game.boss, `a fase ${game.round} precisa de um guardiao`);
    game.totalTime += seconds;
    game.damageEnemy(game.boss, 1e5);
    settle(game);
  }
  assert.equal(game.phase, 'intermission', `a fase ${game.round} (${kind}) devia ter sido vencida`);
  return game.result.outcome;
}

export const OUTCOME_BY_KIND = { hunt: 'champion', chase: 'routed', duel: 'slain' };
