# A cerimônia de fim de fase, e o despacho da cena

**Data:** 2026-09-11 · **Status:** aplicado · **Escopo:** `src/finale.js`, `src/finale-fx.js`, `src/scene.js`, `src/main.js`, `src/campaign.js`

Passos 1 e 2 do GDD do perigo vivo. Os dois são pré-requisito do resto: um abre espaço para o código novo, o outro paga a dívida mais barata que existia.

## Contexto

Duas coisas foram encontradas medindo, não relatadas:

1. **A morte do guardião era invisível.** `defeatBoss()` chama `clearStage()`, que anuncia `stageCleared`, e o modal de vitória subia no mesmo instante. O clipe `Death` do modelo existia, o ator aposentado (`scene.retiredBoss`) existia, o estouro de 80 partículas existia — e nada disso era visto, porque a tela cobria a arena. O VFX estava pronto havia sessões.

2. **`scene.handle` tinha 249 linhas** numa corrente de ~60 `if (event.type === ...)`. Era o segundo maior método do projeto, e é exatamente onde o perigo persistente e a morte iriam parar.

## Decisões

### 1. O despacho da cena virou fatias, e ganhou um ponto de extensão

`handle()` agora chama cinco métodos por assunto: `handleFrame`, `handleCombat`, `handleGuardianEntry`, `handleAbilities`, `handleArenaLife`. O maior método do arquivo caiu de 249 para 79 linhas.

**As fatias são contíguas de propósito.** Cinco tipos de evento aparecem em mais de um bloco (`arena`, `skill`, `crate`, `explosion`, `echo`), então a ordem de execução importa e um mapa `{tipo: fn}` teria quebrado silenciosamente. O corte foi feito por script e verificado: as 248 linhas do corpo estão todas lá, na mesma ordem.

**`scene.use(modulo)` é o ponto de extensão.** Um módulo de efeitos recebe `(cena, evento)` e roda depois das fatias. Feature nova registra em vez de virar o `if` número 61 — e o `scene.js` não precisa conhecê-la.

### 2. A cerimônia é uma coisa só: tempo e texto

`src/finale.js` é dado puro. Diz quantos segundos a arena segura antes do modal e o que a tela fala, por desfecho:

| Desfecho | Espera | Título | Fala |
|---|---|---|---|
| `slain` | 3,0 s | O guardião caiu. | `deathLine` do mundo |
| `routed` | 1,2 s | Ele fugiu de você. | `fleeLine` do mundo |
| `champion` | 1,8 s | A fenda cedeu. | — |

**Por que a fuga espera menos:** ela já teve a própria cinemática de 3,2 s na transição. Repetir cansaria.

Quem desenha (`finale-fx.js`) e quem escreve (`main.js`) leem daqui, e não um do outro. Tempo e texto são a mesma decisão, então moram juntos.

### 3. O ganho de progresso é imediato; só a tela espera

`claimRun()` roda assim que `stageCleared` chega. Só o `showIntermission()` é adiado. Se o jogador fechar a aba durante a queda, a fase continua vencida.

### 4. Seis epitáfios, um por guardião

`deathLine` entrou em `WORLDS`, ao lado de `fleeLine` e `grudgeLine`. Texto é barato e é o que transforma "você venceu" em "você matou **aquele**".

> O sino parou no meio da badalada. · A fornalha engoliu a própria brasa. · O vazio se fechou sobre ela, sem eco. · As raízes soltaram o que prendiam. · O motor parou. O céu ficou quieto. · O gelo rachou de dentro para fora.

### 5. O que `finale-fx.js` acrescenta

Ele **não** repete o que já existia. O estouro de 80 partículas e os três anéis continuam no `handleGuardianEntry`. O módulo adiciona o *depois*, que é o que faltava:

- a arena escurece com holofote nele — o mesmo recurso da entrada, ao contrário;
- uma coluna de brasa sobe escalonada enquanto o corpo cai (em levas de 0,18 s, senão vira um estouro só e some antes de o clipe chegar na metade);
- aos 2,2 s ele se desfaz em poeira da cor do mundo, com anel no chão.

## Verificação

Medido de dentro da página, sem screenshot inflando o relógio:

| | |
|---|---|
| duração do clipe `Death` | 2,03 s |
| corpo desaparece | 2,16 s |
| o desfazer dispara | 2,20 s |
| modal sobe | 3,03 s |

O desfazer cai 40 ms depois de o corpo sumir, o que faz a troca ler como "ele virou pó" em vez de "ele sumiu". Foi sorte de calibragem, não projeto — mas é a leitura certa e ficou.

161 testes verdes, build ok, partida de fumaça no navegador sem erro de página.

## O que vem depois

Passo 3 do GDD: o perigo rotativo ligado ao jogo. O módulo puro (`src/hazards.js`) já existe com 8 testes próprios; falta o ciclo de brasa errante, os cinco pontos de contato e a emenda ao invariante I2.
