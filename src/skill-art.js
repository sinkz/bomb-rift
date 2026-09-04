let serial = 0;
const drawings = {
  power: `<path d="M51 13c7 19-1 19 11 31 0-10 7-12 7-19 18 24 20 41 6 52-16 14-42 8-48-7-6-16 4-27 10-35-1 12 3 14 5 15 7-9 13-14 9-37Z" fill="url(#G)"/><path d="M51 45c8 13-6 14 5 22 2-4 5-5 5-10 12 14 5 25-7 25-16 0-20-15-10-27 0 7 3 8 5 10 3-5 5-10 2-20Z" fill="#fff4bd"/><path d="m24 31-6-9m56 28 9-5m-60 22-9 2" stroke="#ffd48e" stroke-width="3"/>`,
  range: `<path d="M44 15h10v26h27v12H54v27H42V53H15V41h27V15Z" fill="url(#G)"/><path d="m36 21 12-12 12 12M75 35l12 12-12 12M60 74 48 86 36 74M21 60 9 48l12-12" fill="none" stroke="#ffdc9e" stroke-width="4" stroke-linejoin="round"/><circle cx="48" cy="47" r="13" fill="#fff4ca"/><path d="m43 40 12 8-13 7" fill="none" stroke="#e98040" stroke-width="3"/>`,
  capacity: `<g stroke="#cbb5ff" stroke-width="2"><circle cx="29" cy="57" r="17" fill="#584877"/><circle cx="68" cy="57" r="17" fill="#584877"/><circle cx="48" cy="43" r="23" fill="url(#G)"/></g><path d="m49 19 5-8 10 1" stroke="#fff3cb" stroke-width="4" fill="none"/><path d="m33 36 9-7" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path d="m65 8 4-6m0 12 8 1m-9 5 5 5" stroke="#ffcf89" stroke-width="3"/><path d="M42 76h12m-6-6v12" stroke="#e6d5ff" stroke-width="4"/>`,
  speed: `<path d="M81 20 64 65 37 78l5-19L18 39l16-4 14 11L70 22Z" fill="url(#G)"/><path d="m78 24-27 35 13-3M36 44l-7-7" stroke="#e5fff6" stroke-width="3" fill="none"/><path d="M14 58h16M10 69h19M16 80h15" stroke="#80eed2" stroke-width="3" stroke-linecap="round"/><path d="m67 72 5 5-5 5-5-5Z" fill="#e2ffed"/>`,
  health: `<path d="M48 79 20 51C-1 22 28 7 48 29 67 7 96 22 76 51Z" fill="url(#G)" stroke="#ffafc4" stroke-width="2"/><path d="m48 30-13 19 13 29 13-29Z" fill="#ffe0d2"/><path d="M35 49h26L48 59Z" fill="#ffb9ba"/><path d="m18 20-5-7m67 8 6-7M16 66l-7 3" stroke="#ffc5d2" stroke-width="3"/>`,
  magnet: `<path d="M23 29v26c0 35 51 35 51 0V29H56v26c0 12-15 12-15 0V29Z" fill="url(#G)" stroke="#b7ffed" stroke-width="2"/><path d="M23 29h18v12H23zm33 0h18v12H56z" fill="#e9fff1"/><path d="m48 6 7 9-7 9-7-9ZM9 39l6 8-6 8-6-8Zm79 0 6 8-6 8-6-8Z" fill="#9effd3"/><path d="M15 21c-5 8-5 16-2 20m70-20c5 8 5 16 2 20" fill="none" stroke="#68c8ad" stroke-width="2"/>`,
  fuse: `<circle cx="48" cy="50" r="28" fill="url(#G)" stroke="#e3caff" stroke-width="3"/><circle cx="48" cy="50" r="21" fill="#44314f"/><path d="M48 31v20l13 8M40 14h16m-8 0v8M21 22l7 7" fill="none" stroke="#ffe0b1" stroke-width="5" stroke-linecap="round"/><path d="m74 40 9-10-1 10 8-2-13 20 1-13Z" fill="#ffc57c"/><path d="M20 75H9m22 8H17" stroke="#ad8ce9" stroke-width="3" stroke-linecap="round"/>`,
  dash: `<ellipse cx="47" cy="49" rx="24" ry="35" fill="#295956" stroke="#78f5d6" stroke-width="2" transform="rotate(25 47 49)"/><ellipse cx="47" cy="49" rx="16" ry="28" fill="#182e37" stroke="#438e80" transform="rotate(25 47 49)"/><path d="m57 9-31 43h22L36 86l38-49H51Z" fill="url(#G)" stroke="#d2ffe9" stroke-width="2"/><path d="M12 37h14M7 49h15M10 61h12" stroke="#afffed" stroke-width="3"/>`,
  heal: `<path d="M37 21h22v19l15 16c20 32-42 45-52 17-4-10 0-18 8-25l7-8Z" fill="#623b59" stroke="#e9a4c6" stroke-width="3"/><path d="M27 58c12-11 25 10 43 0 14 24-42 33-43 9Z" fill="url(#G)"/><rect x="34" y="14" width="28" height="12" rx="3" fill="#e5bd93"/><path d="M44 55h9v21h-9zm-6 6h22v9H38z" fill="#fff0de"/><circle cx="67" cy="33" r="4" fill="#ffbddb"/><path d="M22 22v12m-6-6h12" stroke="#ffccda" stroke-width="3"/>`,
  vampire: `<path d="M49 12C46 29 22 45 22 61c0 34 55 34 55 0 0-17-24-34-28-49Z" fill="url(#G)" stroke="#ff91b0" stroke-width="2"/><path d="M31 50c-9 18 0 24 9 25" stroke="#ffd0d2" stroke-width="4" fill="none" stroke-linecap="round"/><path d="m24 35-14-7 6 17m58-10 14-7-6 17" fill="#f6dcbd"/><path d="m48 47-7 10 7 16 7-16Z" fill="#ffccbd"/>`,
};

export function skillArt(id) {
  const uid = `skill-g-${serial++}`;
  return `<svg class="skill-art" viewBox="0 0 96 96" aria-hidden="true"><defs><linearGradient id="${uid}" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#fff0c4"/><stop offset=".34" stop-color="var(--skill-color,#ffab6b)"/><stop offset="1" stop-color="var(--skill-color,#ffab6b)" stop-opacity=".55"/></linearGradient></defs><circle cx="48" cy="48" r="44" fill="currentColor" opacity=".05"/><circle cx="48" cy="48" r="42" fill="none" stroke="currentColor" opacity=".18" stroke-dasharray="2 7"/><path d="m12 12 4 0m-2-2v4m66 66h4m-2-2v4" stroke="currentColor" stroke-width="2" opacity=".8"/>${(drawings[id] || drawings.capacity).replaceAll('#G', `#${uid}`)}</svg>`;
}

export function skillPreview(game, id) {
  const p = game.player;
  const stats = {
    power: [p.damage, p.damage + 1, 'DANO'], range: [p.range, p.range + 1, 'BLOCOS'], capacity: [p.capacity, p.capacity + 1, 'BOMBAS'],
    speed: [(1 / p.step).toFixed(1), (1 / (p.step * .9)).toFixed(1), 'BLOCOS / S'], health: [p.maxHp, p.maxHp + 25, 'VIDA MÁXIMA'],
    magnet: [Math.floor(p.magnet), Math.floor(p.magnet) + 1, 'RAIO DE COLETA'], fuse: [p.fuse.toFixed(1), (p.fuse * .88).toFixed(1), 'SEGUNDOS'],
    dash: [p.dashMax.toFixed(1), (p.dashMax * .82).toFixed(1), 'RECARGA'], heal: [p.hp, Math.min(p.maxHp, p.hp + 50), 'VIDA'], vampire: [p.vampire, p.vampire + 2, 'CURA POR ABATE'],
  };
  const [before, after, unit] = stats[id];
  return `<span class="skill-stat-change"><span>${before}</span><span class="stat-arrow">→</span><strong>${after}</strong><small>${unit}</small></span>`;
}
