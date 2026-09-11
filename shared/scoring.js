// Shared by the browser and API. Scores are always derived from metrics.
import { DIFFICULTIES } from './expedition.js';
export const SCORE_VERSION = 'campaign-3';
export const SEASON = 'expeditions-3';
export const METRIC_KEYS = ['bombsPlaced','bombsExploded','chainExplosions','echoExplosions','damageDealt','bossDamage','damageTaken','healed','hitsTaken','blocked','dashes','revives','normalKills','miniKills','maxCombo','anchorsBroken','choices'];
export const emptyMetrics = () => Object.fromEntries(METRIC_KEYS.map(k => [k, 0]));
const whole = value => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

export function captureRun(game) {
  return {
    stage: game.round, victory: !!game.result?.victory, outcome: game.result?.outcome || 'defeat', seconds: whole(game.totalTime),
    bossSeconds: game.stats?.bossStartedAt == null ? 0 : whole(game.totalTime - game.stats.bossStartedAt),
    bossEncountered: game.stats?.bossStartedAt != null,
    hp: whole(game.player.hp), maxHp: whole(game.player.maxHp),
    metrics: Object.fromEntries(METRIC_KEYS.map(k => [k, whole(game.stats?.[k])])),
    bosses: whole(game.bosses), crystals: whole(game.collected), crates: whole(game.cratesBroken),
    levels: whole(game.level - 1), masteries: [...new Set(game.masteries || [])],
    skills: { ...game.skillLevels }, relics: [...game.relics || []],
    materials: { scrap: whole(game.materials?.scrap), cores: whole(game.materials?.cores) },
  };
}

export function scoreReport(run) {
  if (run.kind === 'campaign') {
    const stages = run.stages.map(stage => ({ stage: stage.stage, ...scoreReport(stage) }));
    const subtotal = stages.reduce((n, s) => n + s.total, 0), multiplier = DIFFICULTIES[run.difficulty].score;
    return { version: SCORE_VERSION, parts: [], stages, difficulty: run.difficulty, subtotal, multiplier, total: Math.floor(subtotal * multiplier / 100) };
  }
  const m = run.metrics || {}, win = !!run.victory;
  const stage = Math.max(1, whole(run.stage)), index = (stage - 1) % 18;
  const multiplier = Math.min(200, 100 + Math.floor(index / 3) * 10 + index % 3 * 5 + Math.floor((stage - 1) / 18) * 10);
  const parts = [
    ['kills', whole(m.normalKills) * 100], ['champions', whole(m.miniKills) * 1800],
    ['routed', (run.outcome === 'routed' ? 1 : 0) * 2200], ['boss', whole(run.bosses) * 3600],
    ['crates', Math.min(500, whole(run.crates) * 10)], ['crystals', Math.min(500, whole(run.crystals) * 5)],
    ['levels', Math.min(800, whole(run.levels) * 80)], ['masteries', Math.min(750, new Set(run.masteries || []).size * 250)],
    ['victory', win ? 1000 : 0], ['combo', Math.min(500, whole(m.maxCombo) * 25)],
    ['speed', win ? Math.max(0, 600 - whole(run.bossSeconds) * 5) : 0],
    ['health', win && run.maxHp > 0 ? Math.floor(300 * Math.min(run.hp, run.maxHp) / run.maxHp) : 0],
    ['flawless', win && !m.damageTaken ? 500 : 0],
  ].map(([id, points]) => ({ id, points }));
  const subtotal = parts.reduce((sum, p) => sum + p.points, 0);
  return { version: SCORE_VERSION, parts, subtotal, multiplier, total: Math.floor(subtotal * multiplier / 100) };
}

export function compareRuns(a, b) {
  return b.score - a.score || Number(b.victory) - Number(a.victory) || (b.miniKills || 0) - (a.miniKills || 0) || a.seconds - b.seconds || a.date - b.date || a.id.localeCompare(b.id);
}
