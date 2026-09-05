import { pixelArt } from './pixel-art.js';

// Prefer item ids so equipment formerly sharing a shape gets unique artwork.
const legacy = { reactor: 'pulse', twin: 'twin-core', boots: 'traveler', wing: 'wind-boots', charm: 'compass', salvage: 'salvager' };
export function rpgArt(kind) {
  const id = ['shards', 'scrap', 'cores'].includes(kind) ? `resource-${kind}` : `gear-${legacy[kind] || kind}`;
  return pixelArt(id, 'rpg-art') || pixelArt('resource-cores', 'rpg-art');
}
