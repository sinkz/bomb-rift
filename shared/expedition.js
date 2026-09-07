export const CAMPAIGN_STAGES = 18;
export const DIFFICULTIES = Object.freeze({
  easy: { label: 'Easy', hp: 1, damage: 1, speed: 1, spawn: 1, intelligence: 0, score: 100 },
  medium: { label: 'Medium', hp: 1.55, damage: 1.4, speed: 1.2, spawn: .78, intelligence: .15, score: 150 },
  hard: { label: 'Hard', hp: 2.3, damage: 1.85, speed: 1.4, spawn: .58, intelligence: .3, score: 225 },
});
export const difficultyKeys = Object.keys(DIFFICULTIES);
export function difficultyUnlocked(meta, id) {
  const index = difficultyKeys.indexOf(id);
  return index === 0 || index > 0 && (meta.difficultyClears || []).includes(difficultyKeys[index - 1]);
}
// Derive all totals from stage reports, never from a client-supplied total score.
export function aggregateExpedition(stages, difficulty) {
  const last = stages.at(-1);
  if (!last || !DIFFICULTIES[difficulty]) throw new Error('invalid_campaign');
  const sum = key => stages.reduce((n, s) => n + s[key], 0);
  const metrics = Object.fromEntries(Object.keys(last.metrics).map(key => [key,
    key === 'maxCombo' ? Math.max(...stages.map(s => s.metrics[key])) : stages.reduce((n, s) => n + s.metrics[key], 0)]));
  return { ...structuredClone(last), kind: 'campaign', difficulty, stages: structuredClone(stages), metrics,
    seconds: sum('seconds'), bossSeconds: sum('bossSeconds'), bosses: sum('bosses'), crystals: sum('crystals'),
    crates: sum('crates'), levels: sum('levels'),
    awakenings: stages.reduce((n, s) => n + s.masteries.length, 0),
    materials: { scrap: stages.reduce((n,s) => n+s.materials.scrap,0), cores: stages.reduce((n,s) => n+s.materials.cores,0) },
  };
}
