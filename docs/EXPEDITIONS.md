# Campaign attempts and ranking

The production entry point enables `Game({ campaignMode: true })`. The stage sandbox default remains available for isolated combat/model previews and existing simulation tests.

- An attempt starts at stage 1 with one life and zero score. Only the next stage can be entered; previously completed stages cannot be farmed inside the same attempt.
- Each stage resets skills, relics and crystals as before. Lives and score carry across the attempt. Permanent equipment, talents, materials and explorer XP remain after defeat.
- Extra lives cost 40, 65, then 90 crystals. Maximum three lives at once and three purchases per attempt. Completing stages 3, 6, 9, 12 and 15 grants a life, up to the cap.
- Phoenix is consumed first. An extra life then revives the player at full health in the current stage with four seconds of protection. With no extras, death ends the attempt and resets stage access to 1.
- Completing all 18 stages on Easy unlocks Medium; completing Medium unlocks Hard. Difficulty is fixed during the attempt. HP/damage multipliers are 1/1, 1.55/1.4, and 2.3/1.85; harder modes also increase movement speed, awareness and spawn frequency.
- Attempts currently live in memory. Reloading starts a new attempt. Difficulty unlocks and permanent upgrades are saved locally. The atlas explains this before starting.

## Scores and server

Only final death/abandonment or victory at stage 18 creates a ranking entry. Stage wins show provisional accumulated points and the opportunity to buy a life before crystals reset.

Each stage retains its existing score breakdown, including its stage multiplier. The sum of stage totals receives the difficulty multiplier: Easy ×1, Medium ×1.5, Hard ×2.25. Statistics are summed except best combo (maximum), and the final build is explicitly labeled as such. Awakenings count across all stages.

The API creates one session at stage 1 and pins difficulty in the session version (`campaign-2:easy`, etc.), without a schema migration. It validates ordered stage reports, rejects intermediate victories and recalculates aggregate statistics and score. The JSON size cap is 64 KiB and session duration cap is four hours. Turnstile, owner cookies, URL validation and click counting remain intact.

New records use season `expeditions-2` and local storage key `bomb-rift-ranking-v2`. Old database rows and the old local key are retained, but excluded from the new board. The global board continues to show one best entry per player. This remains a casual, client-reported leaderboard, not a server-authoritative anti-cheat system.

## Verification

`npm test` covers campaign sequencing, full clears and unlocks, lives, reset boundaries, aggregate scores, API terminal-state enforcement, pinned difficulty, ownership, publication verification and analytics. `npm run build:cloudflare` produces the production bundle.

`/tests/fixtures/ranking-ui.html` is a local-only UI fixture using the real result components and an in-memory publication stub. It never contacts the ranking API and is excluded from the Cloudflare build. Use `?lang=en` to check the English form. Desktop and 390px mobile checks cover typing, preview, scroll containment and simulated submission; they do not solve the live Turnstile challenge or create public records.
