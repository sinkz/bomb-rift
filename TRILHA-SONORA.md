# BOMB RIFT — prompts para a trilha sonora

Há **9 fases, 3 guardiões e o atlas**. Comece pelas nove faixas de exploração abaixo; as quatro faixas extras dão identidade aos encontros e ao menu. Os nomes dos arquivos já correspondem ao `musicKey` de cada fase. As músicas ainda não estão incluídas no jogo: depois de geradas, envie os áudios para integrarmos.

## Como gerar

- Selecione **instrumental, sem voz e sem letra** na ferramenta. Os prompts estão em inglês para facilitar o uso em geradores diferentes.
- Gere exploração em torno de **2 minutos**, mas peça uma região que possa repetir sem corte. Não use uma conclusão triunfal aos 2 minutos: a luta do chefe terá uma faixa separada e pode durar mais.
- Exporte WAV estéreo, de preferência 48 kHz / 24-bit, se a ferramenta oferecer. MP3 também serve. Preserve os arquivos originais para cortarmos loops e fazermos transições depois.
- Reaproveite a mesma semente ou referência de áudio **da sua própria faixa** nas três fases de um mundo, quando a IA permitir. Isso ajuda a manter uma identidade musical. Os BPMs e durações são direção criativa; confira o áudio gerado porque a IA pode não respeitá-los exatamente.
- Evite explosões, sons de interface e ruídos de combate gravados na música. O jogo já produz esses efeitos.

## Mundo 1 — Vale dos Ecos

Misterioso, aventureiro e levemente travesso. O jogador ainda está descobrindo o mundo; não queremos uma música de chefe o tempo todo.

### Fase 01 — O primeiro eco

Arquivo: **ecos-1.wav** · 108 BPM · Ré menor

```text
Original instrumental soundtrack for a charming dark-fantasy bomb-action roguelite. An adventurous little explorer enters ancient violet ruins floating in the night. 108 BPM, D minor, steady 4/4. Warm marimba, soft pizzicato strings, rounded analog bass, dusty hand percussion, distant celesta and a memorable four-note ascending motif. Curious and mischievous with an undertone of ancient mystery, medium-low intensity, clearly readable rhythm. Build in three subtle layers over two minutes without a big climax. Leave space for gameplay sound effects. A short atmospheric lead-in, then a seamless repeating groove. No vocals, no choir, no lyrics, no explosion sounds, no long fade-out, no final resolving chord.
```

### Fase 02 — Pátio esquecido

Arquivo: **ecos-2.wav** · 116 BPM · Ré menor

```text
Original instrumental dark-fantasy roguelite level music, forgotten courtyard in a floating violet kingdom. 116 BPM, D minor, 4/4. Keep a playful four-note ascending motif on marimba and celesta, supported by pizzicato strings, resonant wooden drums, subtle breakbeat textures and a warm pulsing bass. More confident and energetic than the opening level. Around the midpoint introduce low toms and a restrained counter-melody, suggesting an approaching stone sentinel without interrupting the groove. Two-minute development with a loopable middle section. Whimsical danger, small hero versus a vast world. No vocals, no choir, no lyrics, no dialogue, no gameplay sound effects, no abrupt ending.
```

### Fase 03 — Campanário partido

Arquivo: **ecos-3.wav** · 124 BPM · Ré menor

```text
Original instrumental action-roguelite soundtrack for the shattered bell tower of a forgotten kingdom. 124 BPM, D minor, driving 4/4. Transform a four-note ascending marimba motif into tense staccato strings, tuned bronze bells, deep toms, celesta fragments and a gritty but warm synth bass. Heroic momentum with an ominous guardian watching from above. Clear rhythmic accents, climbing harmonic tension, no wall of sound. Start immediately, develop over about two minutes, and maintain a seamless loopable combat groove rather than a final climax. Distinctive handcrafted fantasy atmosphere with restrained electronic production. No vocals, no choir, no lyrics, no explosions, no victory ending or long fade.
```

## Mundo 2 — Caldeira Rubra

Pesado, mecânico, incandescente. Percussão metálica e pulsação forte, com pequenas pausas para dar sensação de pressão prestes a escapar.

### Fase 04 — Boca da fornalha

Arquivo: **caldeira-1.wav** · 122 BPM · Mi frígio

```text
Original instrumental soundtrack for a volcanic clockwork dungeon in a bomb-action roguelite. 122 BPM, E Phrygian, heavy steady 4/4. Metallic mallet percussion, muted industrial drums, distorted analog bass, short low-string ostinatos and glowing glass-pluck accents. Introduce a memorable three-hit rhythmic signature like a giant furnace breathing. Dangerous but playful, rhythmically precise and spacious enough to hear gameplay. Heat, sparks and pressure conveyed through instruments, not literal fire recordings. Two-minute evolving arrangement with a clean repeating groove and no conclusive ending. No vocals, no choir, no lyrics, no explosion samples, no extreme harshness, no long intro or fade-out.
```

### Fase 05 — Engrenagens em brasa

Arquivo: **caldeira-2.wav** · 130 BPM · Mi frígio

```text
Original instrumental industrial-fantasy roguelite level music. A little bomber dodges armored beetles between burning machinery. 130 BPM, E Phrygian, 4/4. Layer syncopated metallic percussion, hand-played toms, crunchy synth bass, plucked low strings and a short bright anvil-like tuned motif. Use a recurring three-hit furnace rhythm, with clockwork subdivisions gradually entering. At the midpoint add a heavier bass counter-rhythm to herald an iron sentinel, while preserving the same beat. Energetic, inventive and tactile, not realistic horror. About two minutes, loop-friendly transitions, controlled low end. No voices, no choir, no lyrics, no literal machinery recordings or bomb sound effects, no closing cadence.
```

### Fase 06 — Trono de escória

Arquivo: **caldeira-3.wav** · 138 BPM · Mi frígio

```text
Original instrumental action-roguelite music for a colossal throne room above rivers of lava. 138 BPM, E Phrygian, relentless 4/4 with a memorable three-hit furnace motif. Deep war drums, tuned metallic strikes, aggressive but controlled analog bass, staccato low brass and urgent string ostinatos. White-hot determination, mechanical menace and the thrill of a tiny hero challenging a giant. Add a brighter answering melody so the track feels adventurous rather than hopeless. Evolve in intensity across two minutes without reaching a final resolution; provide a seamless combat loop. Keep transient space for bombs and warning sounds. No vocals, no choir, no lyrics, no sound effects, no fade-out.
```

## Mundo 3 — Maré Espectral

Estranho e luminoso. Ameaça sobrenatural com movimento, evitando ambient parado: o jogador precisa continuar correndo.

### Fase 07 — Costa dos sussurros

Arquivo: **mare-1.wav** · 118 BPM · Fá sustenido menor

```text
Original instrumental soundtrack for a spectral ocean dungeon in a dark-fantasy action roguelite. 118 BPM, F-sharp minor, steady 4/4. Luminous glass bells, reversed piano tails, deep rounded sub-bass, light shuffling percussion and shimmering granular synth pads. A descending five-note motif suggests an ancient queen calling from the abyss. Eerie, elegant and kinetic, never sleepy or purely ambient. Clear rhythmic pulse for dodging, with restrained melodic detail and room for gameplay audio. A two-minute arrangement that deepens gradually and loops seamlessly. Convey water and ghosts musically, without literal waves or whisper samples. No vocals, no choir, no lyrics, no combat effects, no final cadence.
```

### Fase 08 — Jardim submerso

Arquivo: **mare-2.wav** · 126 BPM · Fá sustenido menor

```text
Original instrumental spectral-fantasy roguelite level music. An impossible submerged garden of turquoise crystals and stalking apparitions. 126 BPM, F-sharp minor, 4/4. Develop a descending five-note glass-bell motif over syncopated electronic percussion, plucked harp harmonics, deep pulse bass and distant bowed-metal textures. Mesmerizing but tense, graceful movement with a dangerous undertow. Around the midpoint introduce low ceremonial drums and a second rhythmic layer for the queen's herald. Avoid a dramatic stop; the player remains in combat. About two minutes with a seamlessly repeatable groove. No vocals, no choir, no spoken whispers, no lyrics, no water or explosion recordings, no long fade.
```

### Fase 09 — O último horizonte

Arquivo: **mare-3.wav** · 136 BPM · Fá sustenido menor

```text
Original instrumental final-world action-roguelite soundtrack. A tiny flame crosses the last floating sanctuary before an enormous spectral queen. 136 BPM, F-sharp minor, driving 4/4. Combine a descending five-note crystalline motif with urgent strings, thunderous but clean toms, luminous arpeggiators, deep analog bass and restrained brass swells. Cosmic scale, rising determination, supernatural elegance. Brief traces of a four-note ascending celesta answer the darkness, linking back to the hero's first adventure. Dynamic two-minute development with no final victory resolution and a seamless battle loop. Leave space for warning cues. No vocals, no choir, no lyrics, no explosions or dialogue, no abrupt ending.
```

## Extras recomendados — chefes e atlas

Estas faixas são independentes do cronômetro da fase. Peça cerca de 90–120 segundos com repetição contínua; a luta pode durar vários loops.

### Mórthos — O sino sem alma

Arquivo: **boss-morthos.wav** · 132 BPM

```text
Original instrumental boss battle music for Morthos, a horned stone bell guardian in a charming dark-fantasy roguelite. 132 BPM, D minor, 4/4. Three ominous tuned bell strikes introduce a driving groove of low strings, huge wooden drums, distorted plucked bass and sharp bronze accents. Twist a playful four-note ascending celesta motif into an imposing low-register threat. Weighty stomp rhythm with open spaces between hits so attacks remain readable. Add a denser second layer suitable for an enraged phase, without changing tempo. Dark, intimidating and exhilarating. Seamlessly loopable, no final cadence. No vocals, no choir, no lyrics, no dialogue, no sound effects.
```

### Vulkar — O coração da fornalha

Arquivo: **boss-vulkar.wav** · 146 BPM

```text
Original instrumental boss battle for Vulkar, a massive horned furnace king with a molten heart. 146 BPM, E Phrygian, heavy 4/4. A crushing three-hit industrial motif, tuned iron percussion, low brass stabs, driving toms and growling analog bass. Controlled syncopation evokes giant machinery threatening to burst. Fast, forceful and fiery, with a heroic answering phrase in high strings. Keep bass clean and percussion transients separated for gameplay clarity. Build a second, more furious variation over the same tempo and tonal center. A 90-to-120-second seamless looping arrangement. No vocals, no choir, no lyrics, no literal fire, machinery or explosion sound effects, no triumphant ending.
```

### Nyxara — A rainha do vazio

Arquivo: **boss-nyxara.wav** · 142 BPM

```text
Original instrumental final boss music for Nyxara, a crowned spectral queen hovering over a shattered turquoise sanctuary. 142 BPM, F-sharp minor, 4/4. Regal low brass, crystalline arpeggios, urgent string ostinatos, deep electronic percussion and a descending five-note bell motif. Elegant, terrifying and otherworldly, with huge spatial depth but crisp foreground rhythm. The tiny hero's ascending four-note motif briefly answers the queen before the tension returns. Develop an enraged variation using denser percussion and octave arpeggios, at the same tempo. Seamlessly loopable, no victory resolution. No vocals, no choir, no whispers, no lyrics, no dialogue or combat sound effects.
```

### Atlas das Fendas — tema do mapa

Arquivo: **atlas.wav** · 82 BPM

```text
Original instrumental world-map theme for BOMB RIFT, a handcrafted dark-fantasy adventure about a tiny persistent flame. 82 BPM, D minor with moments of warm modal brightness. A gentle four-note ascending celesta motif, felt piano, soft plucked strings, distant bowed glass and a very restrained warm bass pulse. Wonder, fragile hope and a vast dangerous world waiting beyond the next portal. Intimate rather than epic, spacious enough to think and choose upgrades. Subtle hints of metallic percussion and turquoise glass harmonics connect three different worlds. About two minutes, seamless calm loop, no dramatic climax. No vocals, no choir, no lyrics, no interface sound effects, no long fade-out.
```

## Expansão 2.2 — nove novas fases

O jogo já toca temas instrumentais procedurais nestas regiões. Estes prompts servem para gerar gravações que poderão substituí-los. Para todos: instrumental original, cerca de 2 minutos, loop contínuo, sem vozes, letras, efeitos do jogo, silêncio inicial ou fade-out longo. As faixas ainda precisam ser geradas e enviadas para integração.

**10 · Estufa dos sussurros — jardim-1.wav · 104 BPM**

```text
Original instrumental action roguelike score, 104 BPM, C minor with Dorian color. A hungry magical greenhouse at dusk: woody marimba ostinato, breathy flute fragments, plucked strings, dry hand drums, rounded synth bass and tiny glass pollen bells. A curious four-note descending motif becomes a playful predator. Clear rhythmic space for bomb explosions, warm organic timbres, subtle menace. Two-minute seamless exploration loop, no vocals, no sound effects, no long intro or fade-out.
```

**11 · Pomar de ossos — jardim-2.wav · 108 BPM**

```text
Original instrumental dark-fantasy roguelike loop, 108 BPM, C Dorian. A luminous orchard with roots wrapped around old bones. Wooden percussion and pizzicato cello, dancing marimba, sparse bass clarinet and bowed-glass harmonics. Reprise a short descending flute motif with uneasy call and response, add low toms for a stalking miniboss. Tense but adventurous and readable during combat. Two minutes, seamless loop, no voices, no environmental effects, no dramatic ending.
```

**12 · Árvore do primeiro sino — jardim-3.wav · 112 BPM**

```text
Original instrumental boss-approach roguelike music, 112 BPM, C minor. Beneath a colossal ancestral tree, an ancient bell awakens inside living roots. Layer pulsing low strings, hollow tuned wood drums, distant bronze bell notes, a four-note flute theme and a determined warm bass rhythm. Organic, solemn, growing courage; a restrained lift halfway through without drowning gameplay. Two-minute seamless loop, no choir or vocals, no sound effects, no long fade.
```

**13 · Pontes de cobre — trovao-1.wav · 122 BPM**

```text
Original instrumental clockwork fantasy action theme, 122 BPM, F-sharp minor. Narrow copper bridges above a storm. Syncopated analog bass, crisp brushed metal percussion, plucked synth arpeggios, muted brass stabs and a bright three-note celesta hook. Mechanical precision mixed with cheerful danger, forward motion with space between phrases. Two-minute seamless roguelike gameplay loop, no vocals, no thunder or explosions, no long opening or ending.
```

**14 · Relógio da tempestade — trovao-2.wav · 126 BPM**

```text
Original instrumental action roguelike score, 126 BPM, F-sharp minor. Inside an impossible clock tower that conducts lightning. Interlocking sixteenth-note plucked synths, sharp metallic snare, low tom accents, rubbery bass and tense brass pulses. A three-note celesta motif jumps between left and right channels; use brief rhythmic gaps to build anticipation. Playful engineering and a lurking mechanical guardian. Two-minute seamless loop, no voices, no literal ticking or game sound effects.
```

**15 · Trono do céu partido — trovao-3.wav · 128 BPM**

```text
Original instrumental dark-fantasy boss-approach music, 128 BPM, F-sharp minor. A bronze throne suspended in a fractured sky. Firm electronic bass and acoustic war drums, restrained low brass, radiant bell arpeggios and an urgent three-note hook. Feel gigantic and defiant without constant wall-of-sound orchestration; leave openings for combat feedback. Two-minute seamless loop, no vocals or choir, no thunder effects, no long fade-out.
```

**16 · Lago das memórias — aurora-1.wav · 88 BPM**

```text
Original instrumental frozen-fantasy roguelike score, 88 BPM, B minor. Walking over a lake that remembers every fallen adventurer. Delicate celesta, glass mallets, soft bowed strings, deep restrained bass and a gentle broken drum pulse. A sparse rising four-note theme feels fragile, mysterious and brave. Airy high register with a steady gameplay rhythm, not ambient drift. Two-minute seamless loop, no vocals, no wind or cracking ice effects, no long intro or fade-out.
```

**17 · Biblioteca congelada — aurora-2.wav · 94 BPM**

```text
Original instrumental dark-fantasy exploration and combat loop, 94 BPM, B minor. A frozen library where crystal oracles mend ancient monsters. Glass harmonica-like synth, pizzicato strings, intimate piano, icy celesta and muted frame drums. Reprise a rising four-note motif as a question answered by low strings; add an understated rhythmic tension for a miniboss. Two-minute seamless loop, no choir or voices, no environmental sounds, no large cinematic ending.
```

**18 · A última aurora — aurora-3.wav · 102 BPM**

```text
Original instrumental final-region roguelike score, 102 BPM, B minor with a luminous D major bridge. A tiny persistent flame faces an immortal ice queen beneath the last aurora. Shimmering celesta theme, expressive strings, deliberate deep drums, warm pulse bass and thin crystalline synth harmonics. Noble, intimate courage opening into a vast cold sky; memorable melody and room for bomb impacts. Two-minute seamless action loop, no vocals or choir, no game sound effects, no long fade-out.
```

Para as novas formas dos chefes, gere uma segunda versão do tema da fase 12, 15 ou 18, mantendo a melodia, com percussão mais firme e andamento cerca de 15–20 BPM acima. Nomes sugeridos: **morthos-ancestral.wav**, **vulkar-fulgurante.wav**, **nyxara-glacial.wav**. Peça um loop sem final cinematográfico: a luta pode durar mais que a faixa.

## Entrega e integração das gravações

Envie os arquivos com esses nomes. A integração poderá trocar o tema de exploração pelo tema do guardião aos 120s, reduzir o volume em pausa e fazer transições suaves ao retornar ao atlas. Para a ascensão seguinte, as mesmas faixas podem ser reutilizadas. Se sua IA gerar stems, envie **percussão, baixo, melodia e atmosfera separados**; isso permite acrescentar intensidade sem acelerar ou deformar o áudio.

Direção musical original para este jogo; nenhuma referência pede imitação de artista ou reprodução de trilha existente.
