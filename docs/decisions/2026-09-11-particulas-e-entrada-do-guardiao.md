# Partículas com sprite e a entrada cinematográfica do guardião

**Data:** 2026-09-11 · **Status:** aplicado · **Escopo:** `src/particles.js`, `src/particle-sources.js`, `src/scene.js`, `src/game.js`, `src/campaign.js`, `src/audio.js`, `src/main.js`

## Contexto

O jogador pediu efeitos "mais robustos e bonitos, não simples". A galeria de propostas anterior tinha sido desenhada dentro do que o sistema da época permitia, e foi justamente essa limitação que ele percebeu.

## Diagnóstico

O que impedia beleza não era falta de ideia, era o `materialCache` de `scene.js`:

```js
const materialCache = new Map();
...
mat(color, color, .45)   // dentro de burst()
```

Toda partícula de uma mesma cor compartilhava **um único objeto de material**. Disso decorriam três consequências que nenhum ajuste de gosto resolveria:

- **Sem fade de opacidade.** Mexer na opacidade de uma partícula mexeria em todas daquela cor. Por isso elas *minguavam* (`scale.multiplyScalar(exp(-dt*1.3))`) em vez de apagar.
- **Sem gradiente de cor ao longo da vida.** Mesmo motivo.
- **Teto de 220 partículas.** Cada destroço era um `THREE.Mesh` próprio, ou seja, uma draw call cada.

Bloom e tone mapping ACES **já existiam** (`UnrealBloomPass`, threshold 1.15). As partículas é que não os alimentavam: `MeshStandardMaterial` com `emissiveIntensity .45` só cruzava o limiar nas cores quase brancas.

## Decisões

### 1. Um `THREE.Points` com atributos por partícula

`src/particles.js` substitui o laço de meshes por um único `Points` com `aColor`, `aAlpha`, `aSize`, `aRot` e `aSprite`. **Uma draw call** para o campo inteiro. O material é `ShaderMaterial` aditivo, não iluminado, com `depthWrite: false`.

A câmera é ortográfica, então `gl_PointSize` é constante em pixels: `uScale = altura em px / (camera.top - camera.bottom)`, atualizado em `frameCamera()`.

### 2. Os sprites são assados no Blender, por script, e são brancos

`blender/bake_particles.py` produz sete texturas (brilho, risco, brasa, trinca, anel, chama, fumaça) em Cycles headless, câmera ortográfica, fundo transparente, `view_transform = Standard`. Elas são **brancas**: a cor entra em runtime, então o mesmo sprite serve para lava laranja e gelo azul.

**Por que Blender e não Effekseer:** o pacote `Effekseer1.80.7Win` traz só o editor — não existe modo headless (`Effekseer.exe --help` abre a janela e espera). O formato `.efkefc` é XML tokenizado comprimido em zlib, inseguro de autorar na mão. O Blender faz o mesmo trabalho por script, o que deixa o efeito versionado como código em vez de um binário que só a GUI edita.

### 3. `burst()` manteve a assinatura, e a cor virou o meio de uma rampa

`rampFor(hex)` deriva branco-quente → a cor → quase preto a partir do hex que a chamada já passava. As ~60 chamadas espalhadas pelo `scene.js` **não mudaram nenhuma linha** e ganharam gradiente. `SPRITE_FOR_GEO` mapeia as formas antigas (`box`, `crystal`, `sphere`, `round`) para o sprite equivalente.

### 4. A URL do atlas entra por injeção

`src/particle-sources.js` isola o `import ... from '*.webp?url'`, como `boss-sources.js` já fazia com os GLBs: o runner de testes do node não sabe importar binário. `ParticleField` aceita `atlasUrl` undefined e fica mudo, então `scene.test.js` continua rodando sem WebGL.

### 5. A entrada do guardião é opt-in por mundo, e só no duelo

`BOSS_ENTRANCES` em `campaign.js` tem **apenas `ruins`**. É deliberado: o jogador pediu para testar no primeiro chefe e avaliar antes de espalhar para os seis. `entranceFor(biome)` devolve `null` para os outros cinco e o chefe entra pelo caminho curto de sempre.

**Só o duelo tem entrada.** Na perseguição o guardião te caça e foge — ele não se apresenta, e 4,4 s de cinemática ali quebrariam o ritmo. Isso também mantém `spawnBoss()` síncrono para caçada e perseguição, que é o que `progression.test.js:75` assume.

A coreografia reusa a fase `'transition'` que já existia: o jogo **não simula nada** enquanto ela corre, então o invariante I2 (nenhum dano sem telégrafo) vale de graça — não há dano possível. As batidas são dados, não código:

| tempo | batida | o que acontece |
|---|---|---|
| 0,00 s | `rumble` | o chão treme, poeira sobe num anel largo, a luz implode no trono |
| 1,15 s | `fissure` | quatro fendas correm para fora, uma casa por vez |
| 2,10 s | `summon` | o guardião invoca três lacaios |
| 3,35 s | `slam` | ele pousa: onda de choque, clarão branco, `hitStop` |

Duelo encadeia: remodelagem da arena (2,6 s) → entrada (4,4 s) → `createBoss()`.

### 6. A escolta não afrouxa nenhum invariante de posicionamento

`summonEscort()` nasce pelo `spawnEnemy()` de sempre — andável, a mais de 5 casas do jogador, casa desocupada — e **só então** é puxada para perto do trono, e apenas para uma casa que passaria no mesmo teste. Se nenhuma casa perto servir, o inimigo fica onde o spawn normal o colocou.

### 7. Um agendador mínimo na cena

`scene.later(delay, fn)` existe porque coreografia com batidas precisa de atraso e `burst()` não tem o parâmetro que `pulse()` tem. Roda no relógio da cena, então pausa e `hitStop` seguram a coreografia junto com o resto.

## O que ficou de fora conscientemente

- **As ondas de choque (`pulse`) ainda usam `TorusGeometry`.** Trocar pelo sprite de anel macio melhoraria os impactos; não foi feito nesta rodada.
- **O teto de partículas ficou em 1200** (era 220). Poderia subir mais agora que é uma draw call só, mas sem medição não há motivo.
- **Cinco mundos sem entrada.** Por decisão do jogador: avaliar `ruins` primeiro.

## Verificação

- 152 testes passando, incluindo dois novos em `campaign.test.js` que travam a ordem das batidas, a chegada do chefe só no fim, e que a escolta nunca nasce em parede nem perto do jogador.
- GIFs gravados do jogo rodando em `localhost`, com relógio falso e passo fixo de 34 ms (sem isso o screenshot é mais lento que o efeito e uma explosão de 600 ms cabe em quatro quadros).
