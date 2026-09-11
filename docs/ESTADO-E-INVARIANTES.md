# BOMB RIFT — estado atual e invariantes

**Atualizado:** 2026-09-11 · sobre o checkpoint `fb8316b` (v2.5.0-beta.1)

Este é o documento de referência único: o que o jogo **é hoje** e quais promessas ele faz que **nenhuma mudança pode quebrar**.

Ele existe porque a documentação anterior é histórica — `DESIGN-DA-CAMPANHA.md` (v2.0), `EXPANSAO-RPG.md` (v2.2), `docs/HISTORY.md` (v2.4), `README.md` (v2.5). Para saber como o jogo funciona hoje era preciso ler as quatro e fazer o diff de cabeça. Aquelas continuam valendo como registro do que cada versão foi; esta é a foto do presente.

---

## 1. O que o jogo é hoje

### O laço

Refúgio → atlas → fase → **120s de horda** → guardião → recompensa → próxima fase.

Uma **tentativa** (expedição) vai da fase 1 à 18. Skills, relíquias e cristais reiniciam a cada fase. Vidas e pontuação atravessam a tentativa. Talentos, equipamento, trajes e materiais são permanentes e sobrevivem à derrota.

A tentativa vive em memória: recarregar a aba começa outra.

### Números

| | |
|---|---|
| Mundos / fases | 6 mundos × 3 fases = **18** |
| Duração da horda | **120s**, depois o guardião |
| Dificuldades | `easy` · `medium` · `hard` (medium abre ao concluir easy; hard ao concluir medium) |
| Habilidades | **16**, com despertar na quinta escolha |
| Relíquias | **10** |
| Tipos de inimigo | **9** |
| Guardiões | 6, com **5 golpes cada** e **3 atos** |
| Metaprogressão | 9 talentos · 9 equipamentos · 5 trajes · 4 contratos |
| Recursos permanentes | essências (`shards`) · sucata (`scrap`) · núcleos (`cores`) |

### Combate de guardião

Três atos por limiar de vida — **100–60%**, **60–30%**, **<30%** (`bossPhaseFor`). Cada virada limpa as marcas pendentes, reabre a arena com âncoras novas e reseta o ritmo.

Cada guardião tem um repertório de 5 golpes montados a partir de formas componíveis (quadrado, anel, cruz, linhas, colunas, diagonais, faixa). O seletor evita repetir o golpe anterior e encadeia combos a partir do ato 2. O quinto golpe é o **assinatura**, exclusivo do ato 3, e paga uma janela de contra-ataque maior.

Identidade por mundo: Nyxara teleporta para dentro da marca, Fulgra investe em linha, Vulkar deixa o chão queimando num segundo golpe, Mórthos planta uma runa extra.

**Âncoras** (runas que nascem dos ritos de arena) são o contra-jogo central: explodir uma atordoa o guardião por 4s e cancela o combo.

### Ranking

Pontuação é gravada **só quando a tentativa acaba** — morte ou fase 18 concluída. A ficha completa e o formulário de publicação aparecem nesse momento. Fase concluída no meio da campanha mostra uma celebração curta, sem placar.

O ranking global depende da API na Cloudflare; offline o resultado fica no ranking local do navegador.

### Áudio

O grafo de áudio é montado e a trilha do refúgio é **decodificada logo após a primeira pintura**, com o contexto ainda suspenso. Qualquer gesto (`pointerdown`, `pointerup`, `keydown`, `touchend`, `wheel`) retoma o contexto e a música entra na hora, do cache. A política de autoplay do navegador continua exigindo **um** gesto — a diferença é que qualquer um serve e não há espera.

---

## 2. Invariantes

Regras que valem para qualquer mudança futura. Cada uma tem como é garantida.

### I1 — O HUD nunca cobre o tabuleiro

O canvas ocupa a tela inteira; quem respeita as faixas do HUD é o **enquadramento da câmera**, via frustum ortográfico assimétrico (`frameCamera()` em `scene.js`, lendo o elemento-sonda `#safe-area`).

Só se reserva a altura dos painéis **centrais** (timer no topo, dock no rodapé) — o tabuleiro é um losango isométrico e os cantos da tela já são livres, que é onde o HUD mora. Reservar a faixa inteira do HUD encolhe o tabuleiro em um terço sem necessidade.

*Como quebrou antes:* uma rodada encolheu `#scene` em vez de ajustar a câmera; o tabuleiro ficou 35% menor.

### I2 — Todo dano de guardião é telegrafado, e sempre há saída

Nenhum dano acontece sem um `warning` anterior com duração suficiente para reagir. No instante em que a marca nasce, tem de existir **casa limpa alcançável a pé** dentro do tempo do telégrafo, contando lentidão e descontando um passo de reação (`carveSafeHouse`). Marcas já no chão contam como perigo: dois padrões sobrepostos não podem somar xeque-mate.

**Garantido por teste:** `tests/boss-simulation.test.js` roda o jogo por 70s simulados em 12 estágios × 2 seeds com piloto automático e verifica o invariante a cada evento. `tests/boss-combat.test.js` cobre os seis guardiões golpe a golpe.

### I3 — O guardião continua iscável por bomba nos mundos iniciais

A esquiva de pavio só existe a partir do **ato 2 + rodada 7**, com 5s de recarga. Atrair o chefe para a própria bomba é o recurso que o jogador aprende primeiro; tirar isso descaracteriza a luta.

### I4 — Nenhuma tela corta conteúdo

Esconder atrás de `overflow:hidden` é pior que uma barra de rolagem, porque some sem aviso. Se não couber, o conteúdo encolhe, colapsa ou sai — nunca é recortado.

**Garantido por:** `bombRiftDev.audit()` mede rolagem e recorte separadamente e sinaliza recorte como falha.

### I5 — Uma região de rolagem por tela, sempre dentro da moldura

`.modal-root{overflow:hidden}` e `.modal{overflow-y:auto}`. O painel nunca se desloca; se algo precisa rolar, rola dentro do próprio quadro. O cromo — cabeçalho, abas, botões de ação — nunca rola junto.

*Como quebrou antes:* `.modal` só tinha `overflow-y:auto` dentro de uma media query de mobile. No desktop o conteúdo vazava para fora da moldura e quem rolava era o `.modal-root`, arrastando o painel inteiro.

### I6 — Limiar de media query vem de conta, não de chute

O limiar certo é a altura real do conteúdo dividida pelo teto do painel, e se verifica **dos dois lados da fronteira**.

> Exemplo: a ficha final pede 889px e o painel é limitado a 92dvh. A compactação tem de valer enquanto `0.92 × H < 889`, ou seja até `H ≈ 967` → arredondado para 1000px.

*Como quebrou antes:* limiar em 900px "porque cobre 768 e 720" deixou a faixa 901–967px sem compactação; a ficha rolava 47px em 910px de altura, invisível para quem só testa as resoluções redondas.

### I7 — A ficha de pontuação só abre quando a tentativa acaba

`runEnded()` (`!!lastRunScore?.report`) é a única condição. Fase concluída no meio da campanha é celebração, não placar — sem pontuação em destaque, sem a palavra "ranking".

**Garantido por teste:** `tests/result-screen.test.js`, incluindo uma campanha completa de 18 fases.

### I8 — O refúgio não abre em silêncio

A faixa é decodificada antes do primeiro gesto, e qualquer gesto em qualquer lugar da página retoma o áudio.

**Garantido por teste:** `tests/audio-warmup.test.js` (pré-aquecimento, caminho frio, faixa não selecionada).

### I9 — Tudo respeita `prefers-reduced-motion`

`reducedMotion` corta shake, hit-stop, marcas de queimado e eventos ambientais, e reduz partículas. Nenhum efeito novo pode ser obrigatório.

### I10 — O harness de QA não vai para produção

`window.bombRiftDev` fica atrás de `import.meta.env.DEV`. Conferir com `grep -rl bombRiftDev dist/assets/*.js` após o build (tem de sair vazio).

---

## 3. Como verificar

```sh
npm test     # 150 testes
npm run build
npm run dev  # http://127.0.0.1:5173/
```

No console do navegador, com o jogo aberto:

```js
await bombRiftDev.audit()   // abre as 12 telas e imprime rolagem/recorte
```

A auditoria mede a **altura de janela atual**. Redimensione e rode de novo para varrer. Alturas que já pegaram bug: **910** (buraco entre faixas), **768** e **720** (notebook), **1061**.

Outros atalhos do harness: `actions.start()`, `skipToBoss()`, `killBoss()`, `pump()`, `game`, `scene()`, `modalType`.

---

## 4. Pendências conhecidas

| Item | Situação |
|---|---|
| **Retrato mobile** (390×844) | Tabuleiro sai da tela, área morta no topo. **Anterior a esta rodada** — `shots/hud-390x844-antes.png` mostra o mesmo comportamento, e o README já registrava que a adaptação mobile de câmera e zoom não foi feita. |
| **Rolagem na Evolução** | 300–670px conforme a aba. Deliberado: são sete abas de itens. Cabeçalho, abas e coluna do herói ficam fixos; só a lista rola. Resolver de vez pede menos categorias ou paginação — muda a navegação. |
| **Rodada de HUD incompleta** | O agente que reescreveu `hud.js`/`game-hud.css`/`pixel-interface.css` parou por limite de sessão antes de verificar. O trabalho está aplicado e foi validado por mim no desktop; não se sabe o que ele ainda pretendia mudar. |
| **Código morto em `main.js`** | `scoreCard()` não é chamado e `saveWarning` só é escrito. Anterior a esta rodada. |
| **Eventos sem VFX** | `arenaRite` não ganhou tratamento próprio em `scene.js`. |
| **Atlas em 1280×720** | ~35px de rolagem residual. |

---

## 5. Onde ficam as decisões

Decisões arquiteturais com o *porquê* vivem em `docs/decisions/`. A desta rodada — fim de expedição, áudio, enquadramento de câmera, rolagem e simplificação de telas — está em `docs/decisions/2026-09-10-fim-de-expedicao-e-audio.md`.
