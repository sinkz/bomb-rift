const KEY = 'bomb-rift-ranking-v1';
const integer = (n, max = 1e8) => Number.isInteger(n) && n >= 0 && n <= max;

export function scoreRun(game) {
  const combat = game.kills * 100 + game.collected * 10 + (game.level - 1) * 80;
  const survival = Math.floor(Math.min(120, game.totalTime)) * 2;
  return combat + survival + (game.result?.victory ? 1000 + game.round * 150 + game.player.hp * 2 : 0);
}

export class LocalRanking {
  constructor(storage) {
    this.storage = storage; this.records = []; this.saved = !!storage; this.recorded = new WeakSet();
    try {
      const rows = JSON.parse(storage?.getItem(KEY) || '[]');
      if (Array.isArray(rows)) this.records = rows.filter(r => r && typeof r.id === 'string' && /^[\w-]{1,80}$/.test(r.id) && integer(r.score) && integer(r.stage, 100000) && r.stage > 0 && integer(r.kills) && integer(r.seconds, 1e7) && integer(r.date, 9e15) && typeof r.victory === 'boolean').sort((a, b) => b.score - a.score || b.date - a.date).slice(0, 10);
    } catch { this.saved = false; }
  }
  record(game) {
    if (!game.result || this.recorded.has(game.result)) return null;
    this.recorded.add(game.result);
    const row = { id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`, score: scoreRun(game), stage: game.round, kills: game.kills, seconds: Math.floor(game.totalTime), victory: game.result.victory, date: Date.now() };
    this.records = [...this.records, row].sort((a, b) => b.score - a.score || b.date - a.date).slice(0, 10);
    try { if (!this.storage) throw new Error('Storage unavailable'); this.storage.setItem(KEY, JSON.stringify(this.records)); this.saved = true; } catch { this.saved = false; }
    return { ...row, place: this.records.findIndex(r => r.id === row.id) + 1 };
  }
}
