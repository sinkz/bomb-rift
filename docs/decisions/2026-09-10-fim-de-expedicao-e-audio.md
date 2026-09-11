# Fim de expedição, ficha de pontuação e despertar do áudio

**Data:** 2026-09-10 · **Status:** aplicado · **Escopo:** `src/main.js`, `src/ranking-view.js`, `src/audio.js`, `src/expedition-ui.js`

## Contexto

Dois problemas relatados pelo jogador na versão 2.5 beta:

1. *"O ranking aparece sempre que eu finalizo uma fase, mas deveria aparecer quando eu morro ou termino o jogo."*
2. *"A música do refúgio só começa quando eu clico em algum lugar, e não quando o jogo abre."*

E um terceiro, observado na verificação: a ficha final abria **com o próprio título cortado**.

## Diagnóstico

### A ficha de pontuação

A regra de dados já estava certa: `LocalRanking.record()` devolve `null` enquanto `game.expedition.ended` for falso, então a ficha completa (`resultMarkup`) só era montada na morte ou na fase 18.

O problema era de **apresentação**. A tela de fim de fase (`showIntermission`) era dominada por um bloco `campaign-score-note` com a pontuação acumulada em destaque e a frase *"O ranking abre no game over ou após concluir as 18 fases"*. Para quem joga, aquilo **é** a tela de ranking: pontos grandes, linguagem de placar, a palavra "ranking". A percepção do jogador estava correta mesmo com o código correto.

### O título cortado

`modal()` chamava `$('#modal-root button:not(:disabled)')?.focus()`. Sem `preventScroll`, o navegador rolava o painel até o primeiro botão focável. Na ficha final — alta o bastante para rolar — isso deslocava o painel em 72px e cortava o `<h2>` "GAME OVER" para fora da área visível já na abertura.

### O silêncio do refúgio

Duas causas somadas:

- `sound.init()` só era chamado dentro do handler de clique **filtrado por botão** (`if (!button) return;` antes da chamada) e em um punhado de teclas. Clicar no cenário não acordava nada.
- Mesmo depois do gesto, `RecordedMusic.load()` só disparava quando `wanted` virava verdadeiro. Aí começava o download de um master de ~3 MB e a decodificação. O jogador clicava e continuava no silêncio por vários segundos.

## Decisão

**Separar "fase concluída" de "expedição encerrada".**
`runEnded()` (`!!lastRunScore?.report`) é a única condição que troca o conteúdo da modal pela ficha completa. Fase concluída passou a ser uma celebração curta: guardião derrotado, barra de progresso da campanha (18 pips), recompensas permanentes, prévia da próxima fenda e a loja de vidas. Sem pontuação em destaque, sem a palavra "ranking".

**Fixar o cabeçalho da ficha.**
`focus({ preventScroll: true })`, `panel.scrollTop = 0` na abertura, e `.result-heading` com `position: sticky` — a ficha é alta por natureza, então o título acompanha a rolagem em vez de sumir.

**Separar construir o grafo de áudio de retomá-lo.**
`Sound.prepare()` monta o `AudioContext` e o grafo; `Sound.prefetch()` baixa e decodifica a faixa do refúgio. Um contexto suspenso decodifica normalmente, então as duas coisas acontecem logo depois da primeira pintura, via `requestIdleCallback`. `Sound.init()` continua sendo o que pede `resume()`, e agora é chamado por um listener de captura em `pointerdown`, `pointerup`, `keydown`, `touchend` e `wheel` — qualquer gesto, em qualquer lugar da página. Quando o navegador libera o áudio, a faixa já está em cache e entra na hora.

`sound.ready` (contexto realmente em `running`) substituiu `!!sound.ctx` nos lugares que decidiam rótulo e toggle, porque agora o contexto existe desde o carregamento.

## Consequências

- O jogador só vê a ficha de pontuação quando a tentativa realmente acabou — morte ou 18 fases.
- A ficha ganhou um CTA explícito para o Salão das Faíscas; antes, offline, não havia caminho para o ranking a partir dela.
- O primeiro carregamento faz um download extra de ~3 MB. Fica atrás de `requestIdleCallback` e da primeira pintura, e só acontece se a trilha do refúgio estiver selecionada e a música ligada.
- A política de autoplay do navegador continua valendo: ainda é preciso **um** gesto. A diferença é que agora qualquer gesto serve e a música responde instantaneamente.

## Verificação

`npm test` — 129 testes (126 do baseline + 3 novos em `tests/audio-warmup.test.js`, que cobrem o pré-aquecimento, o caminho frio e a faixa não selecionada).
`npm run build` — sem erros; o harness de QA `window.bombRiftDev` fica atrás de `import.meta.env.DEV` e foi confirmado ausente do bundle de produção.

---

# Adendo 11/09 — enquadramento da câmera e o zoom do tabuleiro

## O que quebrou

A rodada de HUD encolheu o `#scene` para `inset: var(--hud-top) ... var(--hud-bottom)`, reservando as faixas do HUD no próprio canvas. Em 1600×900 isso deixou o canvas com **592px de altura dentro de um card de 900px**: a câmera espalhava o mesmo `cameraSpan` por dois terços da tela e o tabuleiro ficava **35% menor** (32 px por unidade de mundo contra 49 do baseline), com faixas pretas mortas em cima e embaixo.

A intenção era certa — "o HUD nunca pode cobrir o tabuleiro" — mas o ajuste foi no lugar errado: encolheu o *canvas* em vez de corrigir o *enquadramento*.

## Decisão

**O canvas volta a ocupar a tela inteira; quem respeita o HUD é a câmera.**

- `#scene` e `.world-overlay` voltam a `inset: 0`.
- Um elemento-sonda `#safe-area` recebe as faixas via CSS. `scene.js` mede esse elemento com `getBoundingClientRect()` — `getComputedStyle` de custom property devolve o texto `clamp(...)` sem resolver, então só o layout dá pixels reais.
- `frameCamera()` monta um frustum ortográfico **assimétrico** a partir dessa área: pixels continuam quadrados, `cameraSpan` continua significando "meia-altura da janela do tabuleiro", e o tabuleiro fica centrado na faixa livre no maior tamanho possível.

**A faixa reservada é só a dos painéis centrais, não a altura inteira do HUD.** O tabuleiro é um losango isométrico: os cantos da tela já ficam vazios e é onde o HUD mora. Só o timer (topo) e a dock de ações (rodapé) cobrem os vértices do losango. Reservar `--hud-top`/`--hud-bottom` inteiros (308px de 900) custava um terço da tela à toa; reservar `clamp(52px,7.4vh,74px)` / `clamp(56px,8.6vh,86px)` resolve a sobreposição real e devolve o tabuleiro a 41–50 px por unidade.

**O *camera punch* saiu.** O juice aplicava `targetSpan *= 1 - cameraKick` nas viradas de ato do chefe, o que mexia no zoom do mapa sozinho. Zoom é controle do jogador (`adjustZoom`, botões +/−); o impacto já é carregado por shake, hit-stop e luz. O estado `cameraKick` foi removido inteiro em vez de ficar como código morto.

## Verificação

1920×1080, 1600×900, 1366×768 e 1280×720: tabuleiro cheio, jogador sempre visível, nenhum painel sobre o jogo, zero erro de console.

**Pendência conhecida:** o retrato (390×844) continua com o tabuleiro saindo da tela e área morta no topo. Isso é **anterior** a esta rodada — o print `shots/hud-390x844-antes.png` mostra o mesmo comportamento — e corresponde ao que o README já registrava: "a adaptação mobile de câmera, zoom e ergonomia está planejada; ainda não foi implementada". A rodada de HUD que atacaria isso não chegou ao fim.

---

# Adendo 11/09 (2) — rolagem e sobreposição nos menus

## O que estava errado

Auditoria medida (`scrollHeight - clientHeight` em todo elemento visível, por tela e por resolução), não por impressão. Em 1366×768:

| Tela | Rolagem | Observação |
|---|---|---|
| Evolução (refúgio) | **3 barras aninhadas** | `.modal-meta` 73px + `.refuge-hero` 205px + `.refuge-content` 517px, e o rodapé cortado |
| Escolher habilidade | 112px | acontece várias vezes por partida, com o jogador em fluxo |
| Atlas | 269px | seletor de dificuldade ocupava 190px sozinho |
| Ajustes | 26px | — |

**Causa raiz comum:** `.modal` só recebia `overflow-y:auto` dentro de uma media query de mobile. No desktop ficava `overflow:visible` — o conteúdo **vazava para fora da moldura decorativa** e quem rolava era o `.modal-root`, movendo o painel inteiro. Daí a sensação de página web em vez de interface de jogo.

## Decisão

**Uma única região de rolagem por tela, sempre dentro da moldura.**
`.modal-root{overflow:hidden}` e `.modal{overflow-y:auto}` em `pixel-interface.css`, que carrega por último. Nenhum painel se desloca; se algo precisar rolar, rola dentro do próprio quadro.

**O conteúdo encolhe por faixas de altura, e o enfeite sai primeiro.** Faixas em 1100 / 900 / 860 / 820 / 800 / 780 / 730px. O que sai antes: emblemas decorativos, parágrafos redundantes com o título, descrições que cabem num `title`. O que nunca sai: botões de ação, abas de navegação, e o conteúdo da aba.

**Duas simplificações de verdade, não só compactação:**
- O seletor de dificuldade **colapsa para uma linha quando a tentativa está em andamento** — ali a dificuldade fica travada, então mostrar três cartas inertes só gastava 190px de tela. Classe `locked` aplicada em `difficultyPicker()`.
- Os três slots de equipamento do refúgio viraram uma **fileira de fichas** (164px → 78px) em vez de lista vertical.

**Regra que não pode ser violada: nada de conteúdo cortado.** Recortar com `overflow:hidden` é pior que uma barra de rolagem, porque some sem aviso. A auditoria mede clipping separadamente e ele está zerado em todas as telas e resoluções testadas.

## Resultado medido

1920×1080, 1366×768 e 1280×720 — refúgio, atlas, guia, ajustes, ranking, HUD em jogo, build, pause, escolher habilidade e fase concluída: **zero rolagem, zero conteúdo cortado.**

Duas exceções conscientes, ambas conteúdo genuinamente longo, agora rolando **dentro** do painel e não mais arrastando a moldura:

- **Evolução**, aba de conteúdo (~300–630px conforme a aba). São sete abas de itens; cabeçalho, abas e coluna do herói ficam fixos.
- **Ficha final de game over** (~190–280px em telas de 768px ou menos). São 16 métricas, a build e o formulário de publicação. O cabeçalho é `sticky`, então "GAME OVER" acompanha a rolagem.

Resta ~17px de rolagem no atlas em 1366×768 e ~35px em 1280×720.

## Nota de manutenção

Vários seletores destes ajustes precisam do prefixo `#atlas` ou de `.modal-meta` porque as regras base usam ID ou moram em `pixel-interface.css`, que carrega depois de `atlas.css` e `refuge.css`. Regras equivalentes escritas só com classe em `refuge.css` **perdem a cascata silenciosamente** — foi o que aconteceu na primeira tentativa.

---

# Adendo 11/09 (3) — simplificar em vez de só compactar

Compactar com media queries tirou a maior parte da rolagem, mas o atlas continuava com barra num notebook de 1218×769. O problema não era espaçamento: eram **faixas demais empilhadas**.

## Atlas: oito seções viraram quatro

O atlas empilhava `window-heading` → `difficulty-picker` → `attempt-progress` → `world-tabs` → `map-layout` → `mission-tactics` → `stage-summary` → `map-footer`.

Três dessas faixas diziam coisas do mesmo nível hierárquico e viraram **uma barra só**:

- O título (`ESCOLHA SEU DESTINO`) já anuncia a tela, então o rótulo `ESCOLHA O DESAFIO` do seletor saiu: as três fichas `Easy ×1.00 PTS` se explicam sozinhas.
- `1 VIDAS · 0 PTS | FASE 1 / 18` virou **ícone + número** (coração, troféu, bússola) com o texto no `title`. Três rótulos escritos viraram três glifos que se leem de relance — e corrigiu de quebra o "1 VIDAS".
- `O ATLAS DAS FENDAS · EASY` perdeu o `· EASY`, que agora está nas fichas ao lado.

Também por ícone:
- As abas de mundo trocaram `0/3 FENDAS` por **três pips**.
- As tags do guardião (`2 MIN + GUARDIÃO`, `17 × 15`, `HORDA + GUARDIÃO`) viraram ícone + valor curto, com a frase inteira no `title`.

Resultado em 1218×769, a janela exata do relato: **0px de rolagem** (era 269px no começo do dia). Verificado também em 1100×700, onde a barra única não quebra.

## Ficha final: 16 métricas em grade fluida

`grid-template-columns: repeat(auto-fit, minmax(148px, 1fr))` — em telas largas a mesma lista ocupa três colunas em vez de duas, cortando oito linhas. Com o retrato do guardião e o bloco de pontuação menores nas faixas curtas, a ficha inteira passou a caber.

## Estado medido

| Resolução | Telas sem rolagem | Exceções |
|---|---|---|
| 1920×1080 | todas | Evolução (conteúdo da aba, 297px) |
| 1366×768 | todas | Evolução (521px) |
| 1280×720 | todas | Evolução (671px), game over 9px |
| 1218×769 | atlas verificado a 0px | — |

Nenhum conteúdo cortado em nenhuma resolução. A rolagem da Evolução é deliberada: são sete abas de itens, e cabeçalho, abas e coluna do herói ficam fixos — só a lista da aba rola.

---

# Adendo 11/09 (4) — limiar de media query calculado, não chutado

Relato: "essa parece estar cortando ou é impressão?", com print da tela de fase concluída.

**Aquele print específico: não estava cortando.** Reproduzindo a geometria exata do print (modal de 700px de largura centralizada, topo a 102px da área útil) chega-se a uma viewport de ~1061px de altura. Nessa altura o modal mede 857px e termina em 917px — cabe inteiro, moldura de baixo e botão secundário inclusive. O print tinha sido cortado no momento da captura, ~106px acima do fim da janela.

**Mas investigar o relato achou um bug real.** As faixas de compactação tinham sido escolhidas por tentativa (`900px`, porque 768 e 720 eram os alvos), não calculadas. Isso deixou um **buraco entre 901px e ~967px**: a compactação já estava desligada e o painel ainda era curto demais. Medido em 910px de altura, a ficha de game over rolava 47px.

## Regra adotada

O limiar sai da conta, não do chute:

> A ficha sem compactação pede **889px**, e o painel é limitado a **92dvh**. A compactação precisa valer enquanto `0.92 × H < 889`, ou seja até `H ≈ 967`. Arredondado para **1000px**, com folga.

Acima de 1000px a compactação desliga e `0.92 × 1000 = 920 > 889` garante que cabe. Não sobra faixa descoberta.

## Verificação da faixa inteira

| Altura | Fase concluída | Game over | Atlas |
|---|---|---|---|
| 910 | 0 | 0 (era 47) | 0 |
| 985 | 0 | 0 | 0 |
| 1015 | 0 | 0 | 0 |
| 1061 | 0 | 0 | 0 |

**Lição para as próximas:** limiar de media query escolhido "porque cobre as resoluções que testei" esconde buracos entre os pontos testados. O limiar certo vem da altura real do conteúdo dividida pelo teto do painel — e depois se verifica dos dois lados da fronteira.
