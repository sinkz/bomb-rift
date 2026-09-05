import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalRanking, scoreRun } from '../src/ranking.js';

const run = (victory = true) => ({ kills: 8, collected: 22, level: 3, totalTime: 148, round: 1, player: { hp: 70 }, result: { victory } });
const storage = () => { const map = new Map(); return { getItem: key => map.get(key), setItem: (key, value) => map.set(key, value) }; };

test('score rewards combat, collected resources and victory without farming survival time forever', () => {
  const g = run(); assert.equal(scoreRun(g), 2710);
  g.totalTime = 5000; assert.equal(scoreRun(g), 2710);
  g.result.victory = false; assert.equal(scoreRun(g), 1420);
});
test('a result is recorded once, survives reload, and separate runs can each rank', () => {
  const disk = storage(), board = new LocalRanking(disk), g = run();
  assert.equal(board.record(g).place, 1); assert.equal(board.record(g), null);
  assert.equal(new LocalRanking(disk).records.length, 1);
  g.result = { victory: false }; board.record(g); assert.equal(board.records.length, 2);
  assert(board.records[0].score > board.records[1].score);
});
test('ranking keeps the ten highest results and rejects malformed stored rows', () => {
  const disk = storage(), board = new LocalRanking(disk);
  for (let i = 0; i < 15; i++) { const g = run(); g.kills = i; board.record(g); }
  assert.equal(board.records.length, 10); assert.equal(board.records[0].kills, 14); assert.equal(board.records.at(-1).kills, 5);
  const good = board.records[0]; disk.setItem('bomb-rift-ranking-v1', JSON.stringify([good, { ...good, id: '<script>' }, { ...good, score: -1 }, { ...good, stage: 0 }, null]));
  assert.deepEqual(new LocalRanking(disk).records, [good]);
});
test('unavailable storage preserves this session and unfinished runs are not ranked', () => {
  const board = new LocalRanking({ getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } });
  const g = run(); g.result = null; assert.equal(board.record(g), null);
  g.result = { victory: false }; board.record(g); assert.equal(board.records.length, 1); assert.equal(board.saved, false);
});
