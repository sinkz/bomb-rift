# Briefing de arte — 9 ícones

> **Status: concluído em 2026-09-13.** Os nove foram gerados e integrados. Este
> documento fica como o contrato de estilo para a próxima leva — as duas regras
> da seção "Composição" nasceram de ícones que falharam no teste de 40px e são a
> parte que mais importa.
>
> **Gerados por mim, não por você:** `codex exec` com `gpt-6-astra` e a skill
> `imagegen`. O caminho está documentado no fim deste arquivo.

## O veredito, por categoria

Levantei o que cada sistema do jogo realmente consome antes de pedir qualquer coisa.

| categoria | precisa? | por quê |
|---|---|---|
| **Ícones 2D (pixel art)** | **Sim — 9** | 6 selos usam arte emprestada de outras habilidades; 2 conceitos novos não têm arte; 1 talento existente não sobrevive à redução |
| **Animações 2D** | **Não** | A biblioteca inteira é PNG **estático** dentro de um contêiner SVG; todo movimento vem de CSS (`@keyframes`, `steps()`). Frames quebrariam o contrato de `pixelArt()` |
| **Modelos 3D** | **Não** | Os selos são só interface. O que aparece em cena é partícula e geometria procedural. Os únicos GLB do jogo são os seis guardiões, e eles nascem de **script Blender versionado** (`scripts/guardians-blender.py`) — um GLB gerado por IA não casaria com a direção low-poly nem com o pipeline |
| **Partículas extras** | **Sim, mas não é você** | O atlas tem 8 sprites assados por `blender/bake_particles.py`, que **já suporta frames**. Sprite novo é uma função Python no script, não uma imagem gerada — fica comigo |

Então: **você gera 9 PNGs. Eu faço as partículas no Blender se a gente quiser, e os efeitos 3D continuam procedurais.**

---

## Como usar este documento

O ChatGPT gera **um arquivo por vez**. Não peça prancha — recortar sempre perde qualidade e o pipeline já tem um passo de recorte que a gente evita se os arquivos vierem separados.

1. Abra uma conversa nova e cole o **Bloco de estilo** abaixo, junto com 2 imagens de referência: `public/pixel-library/icons/skill-dash.png` e `relic-frost.png`.
2. Para cada um dos 9 itens, mande o **Bloco de estilo + o briefing do item**. Um por mensagem.
3. Salve cada resultado com o **nome de arquivo exato** da tabela, todos na mesma pasta.
4. Me diga o caminho da pasta. Eu integro, testo, tiro prints e te mando o relatório **antes** de entrar no jogo.

---

## Bloco de estilo (cole em toda mensagem)

> You are producing a single game icon for BOMB RIFT, an original dark-fantasy bomber roguelike. The two attached images are the approved style reference — match them exactly.
>
> **Style:** hand-painted pixel art with chunky, clearly visible square pixel clusters. Every object has a dark contour (deep desaturated purple or teal, never pure black). One dominant jewel hue per icon, with a small ivory or near-white highlight on the focal point. Bronze or aged-brass accents on anything mechanical. A few small floating chips, shards or sparks around the main object to break the silhouette. Soft internal shading, no bloom, no outer glow, no gradient haze.
>
> **Composition:** one single object, centered, filling about 80% of the frame, with clear empty margin on all four sides. Slight three-quarter tilt on geometric forms. The silhouette alone must be identifiable — this is an ability icon read at 40 pixels in a dark UI.
>
> **Output:** square 1:1 canvas, 1024×1024, fully transparent background (real alpha). Absolutely NO checkerboard pattern drawn into the image, NO ground plane, NO drop shadow on the ground, NO text, NO labels, NO numbers, NO border, NO frame, NO UI chrome, NO grid lines. Not vector art, not 3D render, not photorealistic, not smooth airbrush.
>
> **Subject:**

*(e então a linha do item, abaixo)*

---

## Os 9 itens

### Selos — a terceira habilidade ativa (tecla Q)

| # | arquivo | cor dominante |
|---|---|---|
| 1 | `sigil-estouro.png` | âmbar `#f68b3d` |
| 2 | `sigil-ferrao.png` | âmbar claro `#ffb066` |
| 3 | `sigil-ancora.png` | jade `#7ecf9e` |
| 4 | `sigil-sangria.png` | carmesim `#e05c6e` |
| 5 | `sigil-fenda.png` | violeta `#a97ce0` |
| 6 | `sigil-brasa-fria.png` | azul-gelo `#5baccf` |

**1 · `sigil-estouro.png`** — *detona todas as suas bombas de uma vez*
> Three small round dark-violet bombs bursting outward at the same instant from one shared amber shockwave ring at the center, ivory-white blast cores, bronze fuse collars still visible on the bombs. Dominant color amber orange.

**2 · `sigil-ferrao.png`** — *armadilha que espera e estoura no contato*
> A single dark-violet round bomb standing upright on a thin bronze tripwire pin, with one sharp amber wasp stinger angled down from its underside and a taut bronze trigger wire running to the ground. Menacing but still, not exploding. Dominant color warm amber.

**3 · `sigil-ancora.png`** — *domo que bloqueia um golpe e empurra a horda*
> A translucent jade dome shield driven into cracked dark stone by one heavy bronze anchor spike, ivory rim highlight along the dome edge, two small jade shockwave arcs pushing outward at the base. Dominant color jade green.

**4 · `sigil-sangria.png`** — *paga vida por um estouro em cruz que cura*
> One large crimson blood drop at the center splitting into a four-way cross of thin crimson blades pointing up, down, left and right, with an ivory faceted gem embedded in the drop. Dominant color deep crimson.

**5 · `sigil-fenda.png`** — *troca de lugar com a sua bomba mais distante*
> Two violet keyhole-shaped portals facing each other at a slight angle, one small dark bomb caught mid-transit between them, thin mint-white edge glow on both portal rims, a few violet shards floating in the gap. Dominant color violet.

**6 · `sigil-brasa-fria.png`** — *apaga o perigo do chão e congela*
> A pale ice-blue crystalline snowflake pressing down on and smothering a dying orange ember, the composition split half frost and half fading fire, ivory frozen crust forming over the ember's edge. Dominant color ice blue with a small amber remnant.

### Conceitos novos

**7 · `mark-oath.png`** — *o Juramento: a segunda escolha da fase vira compromisso*
> A bronze oath seal disc stamped with a bold ivory upward chevron, bound across its face by a single violet ribbon knot, small bronze rivets around the rim, one ivory highlight on the upper left edge. Reads as a sworn seal, not a medal. Dominant color bronze with violet.

**8 · `sigil-empty.png`** — *vaga de selo vazia, antes da primeira compra*
> An empty hexagonal bronze socket seen straight on, its center a dim hollow violet void, six bronze rivets around the rim, no object inside it. Deliberately quiet and unlit — it must read as a slot waiting to be filled. Dominant color dark bronze.

### Substituição — um talento que não sobrevive à redução

Renderizei os 147 ícones no tamanho real em que o jogo os mostra e comparei cada suspeito com um irmão que funciona. **Só um falha.**

O assunto do `talent-dash` está certo — em tamanho cheio é um anel violeta com um raio verde atravessando. O que quebra é a **densidade**: o anel violeta tem contraste baixo demais contra o painel escuro (`#1b1b22`) e o raio é fino demais, então a 40px o ícone vira um risco indistinto. O `skill-dash`, ao lado dele na mesma tela, continua legível porque tem massa clara no centro.

*(Eu tinha acusado o `talent-stride` também e estava errado: a 160px são claramente duas pegadas com linhas de velocidade, e a 40px ainda se leem. Julguei pela folha de 28px, onde tudo vira mingau.)*

**9 · `talent-dash.png`** — *Fio do horizonte: recarga da esquiva 8% menor*
> A taut horizon thread stretched between two small bronze pins, with one thick bright mint lightning bolt striking down through the middle of it. The bolt is the dominant mass of the icon, wide and solid with a large ivory-white core, not a thin line. Keep the composition heavy and high-contrast so it survives being shrunk to 40 pixels. Dominant color mint green on a dark contour.

---

## Quando os arquivos chegarem

Me passe a pasta. O que eu faço, nesta ordem, **sem tocar no jogo**:

1. Conferir alpha real, dimensões e margem de cada PNG
2. Renderizar a folha de contato no tamanho real de uso (40px) contra o painel escuro do jogo
3. Comparar lado a lado com os ícones que ficam ao redor deles na tela — um ícone bom sozinho pode brigar com o vizinho
4. Montar o relatório com os prints e apontar o que precisa de nova rodada
5. **Só depois** integrar: `crop-pixel-library.py` → `prepare-pixel-runtime.py` → trocar o campo `art` dos selos → `npm test`

O passo 5 é uma linha de código por selo. Todo o resto é conferência.


---

## Como gerar (o caminho que funciona)

```sh
codex exec --skip-git-repo-check "Gere UMA imagem com a skill imagegen e salve
como <nome>.png no diretorio atual. Nao escreva codigo, nao explique.

PROMPT DA IMAGEM:
<bloco de estilo + assunto>" < /dev/null
```

Três coisas que só apareceram testando:

- **`< /dev/null` é obrigatório.** Sem ele, `codex exec` em segundo plano trava lendo stdin e sai com código 0 sem gerar nada — falha silenciosa, a pior espécie.
- **A saída tem alpha real.** 1254×1254 RGBA. A documentação da skill diz que `gpt-image-2` não tem transparência nativa e que é preciso chroma-key; na prática tem, e o `prepare-pixel-runtime.py` valida o alpha byte a byte.
- **~2 minutos por ícone.** Gerar em lote sequencial é mais seguro que paralelo.

## Integrar

1. PNGs em `public/pixel-library/icons/<id>.png`
2. Entrada em `public/pixel-library/catalog.json` com `id` e `new`
3. `python scripts/prepare-pixel-runtime.py` — gera o WebP lossless e reescreve `src/pixel-assets.js`
4. Apontar o campo `art` de quem usa
5. `npm test` e `npm run build`
