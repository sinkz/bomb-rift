// Small, original illustrations sharing the game's bevelled, luminous language.
export function rpgArt(kind) {
  const shapes = {
    shards: '<path d="M48 12 72 35 63 66 43 81 23 62 27 32Z" fill="currentColor"/><path d="m48 12-5 69M27 32l21 11 24-8M43 81l5-38" fill="none" stroke="#fff8d8" stroke-opacity=".55" stroke-width="2"/>',
    scrap: '<path d="m33 16 10 3 5-8 11 4-1 10 10 5 8-3 7 10-7 8 1 11 8 6-5 11-11-1-7 7-2 11-12 1-5-10-10-3-10 4-7-9 6-9-3-10-9-5 4-12 11-1Z" fill="currentColor"/><path d="m43 31 18 6 3 19-17 12-17-11 1-18Z" fill="#24212b"/><path d="m33 16 10 3 5-8 11 4M20 32l11-1" fill="none" stroke="#ffe4bc" stroke-width="3"/>',
    cores: '<path d="m48 8 25 18 10 31-19 26H31L13 57l10-31Z" fill="none" stroke="currentColor" stroke-width="5"/><path d="m48 19 17 29-17 30-17-30Z" fill="currentColor"/><path d="m48 19 0 59 17-30Z" fill="#fff" opacity=".35"/><path d="M8 47h14m52 0h14M48 3v10m0 69v10" stroke="currentColor" stroke-width="3"/>',
    reactor: '<path d="M27 29 36 16h24l10 13v47H27Z" fill="#352b42" stroke="currentColor" stroke-width="3"/><path d="M22 36h52v32H22Z" fill="currentColor" opacity=".45"/><circle cx="48" cy="51" r="21" fill="#211b31" stroke="currentColor" stroke-width="3"/><path d="m48 31 12 20-12 20-12-20Z" fill="currentColor"/><path d="M36 21h24M36 81h24" stroke="currentColor" stroke-width="4"/>',
    twin: '<path d="M24 25h24v52H17V38Z" fill="#33263f" stroke="currentColor" stroke-width="3"/><path d="M51 18h24l7 13v46H51Z" fill="#33263f" stroke="currentColor" stroke-width="3"/><circle cx="33" cy="52" r="13" fill="currentColor"/><circle cx="65" cy="45" r="13" fill="currentColor"/><path d="m31 25 4-14 13-1M61 18l5-10" stroke="#fff0b7" fill="none" stroke-width="3"/>',
    boots: '<path d="M26 17h38l-3 34 15 10 5 17H18l2-22Z" fill="currentColor"/><path d="M23 42h40M23 31h40M19 73h60" stroke="#392939" stroke-width="5"/><path d="M26 17h38l-1 9H25Z" fill="#fff3d6" opacity=".4"/><path d="M43 48v13l-10 8" stroke="#fff6d9" stroke-width="3" fill="none"/>',
    wing: '<path d="M32 29h30l-3 24 14 10 5 16H23l4-29Z" fill="currentColor"/><path d="M31 50 9 20l20 9-9-20 25 19-3 22M61 44l23-24-8 27-17 13" fill="currentColor" opacity=".65"/><path d="M24 72h51M34 37h26" stroke="#204139" stroke-width="4"/>',
    charm: '<path d="M30 16q18 21 36 0M25 10q23 24 46 0" fill="none" stroke="currentColor" stroke-width="3"/><path d="m48 33 26 21-9 26-17 9-17-9-9-26Z" fill="#28283b" stroke="currentColor" stroke-width="3"/><path d="m48 40 7 18 13 4-14 7-6 14-6-14-13-7 13-4Z" fill="currentColor"/>',
    salvage: '<path d="M20 18h20v36q8 13 16 0V18h20v37q-3 29-28 29T20 55Z" fill="currentColor"/><path d="M20 18h20v18H20Zm36 0h20v18H56Z" fill="#ece1cf"/><path d="m45 18 5 9-5 8-6-8Zm34 41 9 5-9 5-5-5Z" fill="#ffe1a2"/>',
  };
  return `<svg class="rpg-art" viewBox="0 0 96 96" aria-hidden="true"><ellipse cx="48" cy="82" rx="30" ry="6" fill="#080711" opacity=".35"/>${shapes[kind] || shapes.cores}</svg>`;
}
