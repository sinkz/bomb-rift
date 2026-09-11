# Brief compartilhado — rodada de melhorias 2026-09-10

Contexto comum para todos os agentes trabalhando nesta rodada. **Leia antes de editar.**

## O jogo

BOMB RIFT: roguelike de bombas em grade, Three.js + Vite, sem framework de UI (DOM puro + template strings).
Campanha de 18 fases em 6 mundos (`ruins, forge, garden, storm, frost, abyss`). Cada fase: 2 min de horda → chefe.

## Como rodar e verificar

```sh
npm run dev      # http://127.0.0.1:5173/
npm test         # node --test tests/*.test.js  — 126 testes passando no baseline
npm run build    # tem de continuar buildando
```

Existe um harness de QA **somente em dev** no fim de `src/main.js`, exposto como `window.bombRiftDev`:

| Chamada | O que faz |
|---|---|
| `bombRiftDev.game` | instância viva de `Game` |
| `bombRiftDev.actions.start()` | inicia a expedição |
| `bombRiftDev.skipToBoss()` | adianta o relógio para o chefe aparecer (espere ~1 frame) |
| `bombRiftDev.killBoss()` | mata o chefe atual |
| `bombRiftDev.pump()` | drena eventos + atualiza HUD |
| `bombRiftDev.modalType` / `.lastRunScore` | estado da modal |

Também existe `window.bombRift.snapshot()` (read-only, já existia) e `window.bombRiftAudio()`.

Esse bloco é embrulhado em `if (import.meta.env?.DEV)`, então **não vai para produção** — não remova, não exponha nada além dele.

## Regras do projeto (importantes)

- **Idioma da UI: pt-BR.** Textos novos em português. Há um catálogo de i18n (`src/i18n-catalog.js`) que traduz strings pt→en em runtime; strings novas visíveis ao jogador devem ganhar entrada lá quando forem relevantes (veja como as vizinhas fazem). Se não adicionar, o inglês cai de volta no pt — aceitável, mas evite para textos importantes.
- **Estilo de código:** o repo usa linhas longas, poucas abstrações, comentários raros e explicativos (só quando explicam um *porquê* não óbvio). Imite o arquivo em que está mexendo. Sem TypeScript, sem novas dependências.
- **Sem regressão de testes.** `npm test` tem de continuar em 126+ passando. Se mudar comportamento coberto por teste, atualize o teste e explique.
- **Acessibilidade:** manter `aria-label`, `role`, `aria-live` existentes. Não remova.
- **`prefers-reduced-motion`:** existe `reducedMotion` propagado para a cena e `document.body.classList.toggle('reduced-motion')`. Todo efeito novo tem de respeitar isso.
- **Performance:** alvo 60fps. Já existe teto de partículas (`this.particles.length > 220`). Não crie materiais/geometrias por frame.

## Divisão de arquivos nesta rodada (NÃO invada a faixa de outro agente)

| Agente | Arquivos que pode editar |
|---|---|
| **BOSS** | `src/boss-ai.js`, `src/boss-mechanics.js`, `src/game.js`, `tests/*` (novos arquivos de teste seus) |
| **JUICE** | `src/scene.js`, `src/juice.css`, novo `src/biome-fx.js` |
| **HUD** | `src/hud.js`, `src/game-hud.css`, `src/style.css`, `src/pixel-interface.css` |
| **Coordenador (humano/Claude principal)** | `src/main.js`, `src/ranking-view.js`, `src/ranking-view.css`, `src/audio.js`, `src/launch.js` |

Se precisar de uma mudança fora da sua faixa, **não faça** — descreva no relatório final exatamente o que é preciso (arquivo, função, trecho) e o coordenador aplica.

## Eventos do jogo

`game.emit(type, payload)` alimenta três consumidores: `scene.handle(event)` (VFX 3D), `hud.handle(event)` (UI/feed) e `sound.play(event.type)` (áudio).
Se você **criar** um evento novo em `game.js`, ele é inofensivo para quem não o trata. Liste os eventos novos no relatório para o coordenador ligar áudio/HUD.

## Entregável

No fim, reporte:
1. Arquivos alterados e o que mudou em cada um (1-2 linhas cada).
2. Resultado de `npm test` e `npm run build`.
3. Como verificar manualmente no navegador (passos concretos com `bombRiftDev`).
4. Mudanças que você precisou deixar para o coordenador (fora da sua faixa).
