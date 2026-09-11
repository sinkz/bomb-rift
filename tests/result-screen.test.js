import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, seededRandom } from '../src/game.js';
import { LocalRanking } from '../src/ranking.js';
import { normalizeMeta } from '../src/legacy.js';
import { CAMPAIGN_LENGTH } from '../src/campaign.js';
import { resultMarkup } from '../src/ranking-view.js';

const create = () => new Game({ campaignMode: true, random: seededRandom(7), meta: normalizeMeta({ unlockedStage: 1 }) });
function clearStage(game) {
  game.elapsed = 120; game.totalTime += 120; game.spawnBoss(); game.totalTime += 30;
  game.damageEnemy(game.boss, 1e5);
  assert.equal(game.phase, 'intermission');
}

test('clearing a stage mid-expedition produces no scored row, so no scorecard can open', () => {
  const game = create(), board = new LocalRanking();
  assert.equal(game.start(1), true);
  clearStage(game); game.claimResult();
  assert.equal(board.record(game), null, 'a stage win is not the end of the expedition');
  assert.equal(game.expedition.ended, false);
  assert.equal(game.result.victory, true, 'the stage itself was still a victory');
});

test('dying ends the expedition and the scorecard reports a game over with the hall CTA', () => {
  const game = create(), board = new LocalRanking();
  game.start(1); clearStage(game); game.claimResult(); game.returnToMap();
  game.start(2); game.totalTime += 40; game.die(); game.claimResult();
  const row = board.record(game);
  assert.ok(row?.report, 'a terminal result must be scored');
  assert.equal(row.report.victory, false);
  assert.equal(row.report.kind, 'campaign');
  const html = resultMarkup(row, game, '');
  assert.match(html, /GAME OVER/);
  assert.doesNotMatch(html, /CAMPANHA CONCLUÍDA/);
  assert.match(html, /data-action="ranking"/, 'the hall of sparks must be reachable from the scorecard');
  assert.match(html, /data-action="start"/);
  assert.match(html, /id="result-publication"/);
});

test('clearing all 18 stages ends the expedition and the scorecard reports a campaign victory', () => {
  const game = create(), board = new LocalRanking();
  for (let stage = 1; stage <= CAMPAIGN_LENGTH; stage++) {
    assert.equal(game.start(stage), true, `stage ${stage} must be startable`);
    clearStage(game);
    assert.equal(board.record(game), null, `stage ${stage} must not be scored before it is claimed`);
    game.claimResult();
    if (stage < CAMPAIGN_LENGTH) { assert.equal(game.expedition.ended, false); game.returnToMap(); }
  }
  assert.equal(game.expedition.ended, true, 'stage 18 closes the expedition');
  const row = board.record(game);
  assert.equal(row.report.stages.length, CAMPAIGN_LENGTH);
  assert.equal(row.report.victory, true);
  const html = resultMarkup(row, game, '');
  assert.match(html, /CAMPANHA CONCLUÍDA/);
  assert.match(html, new RegExp(`FASE ${CAMPAIGN_LENGTH} / ${CAMPAIGN_LENGTH}`));
  assert.match(html, /data-action="ranking"/);
});

test('the scorecard renders every metric it promises without holes', () => {
  const game = create(), board = new LocalRanking();
  game.start(1); game.totalTime += 25; game.die(); game.claimResult();
  const row = board.record(game), html = resultMarkup(row, game, '<div class="legacy-result">legado</div>');
  for (const label of ['Inimigos derrotados', 'Minichefes', 'Bombas colocadas', 'Dano causado', 'Dano recebido', 'Maior combo', 'Cristais coletados', 'Despertares', 'Níveis conquistados'])
    assert.match(html, new RegExp(label), `missing metric: ${label}`);
  assert.doesNotMatch(html, /undefined|NaN|\[object Object\]/);
  assert.match(html, /legacy-result/, 'the permanent rewards card must survive into the scorecard');
});
