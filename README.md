# BOMB RIFT — O último refúgio

Jogo de ação em grade com bombas, sobrevivência roguelike e progressão RPG, feito com Three.js. Interface em português brasileiro e inglês, refúgio animado em pixel art e seis guardiões 3D.

[Jogar na web](https://bomb-rift.pages.dev/) · **[Estado atual e invariantes](docs/ESTADO-E-INVARIANTES.md)** · [Plano de evolução](docs/plans/2026-09-07-evolucao-ux-mobile-progressao.md) · [Preparação para o teste Godot](docs/GODOT-SETUP.md)

## Versão 2.5 beta — checkpoint Three.js

Este repositório preserva o jogo web antes de um possível protótipo separado em Godot. A versão publicada na Cloudflare pode estar atrás do código deste repositório; publicar no GitHub não atualiza automaticamente o jogo.

- 18 fases em seis mundos. Cada fase tem dois minutos de horda, seguidos por um chefe.
- Seis modelos de guardião aprovados, com animações, perseguição e alterações na arena.
- 16 habilidades, com despertar na quinta escolha das habilidades evolutivas.
- Talentos, equipamentos, aparência, contratos e recursos permanentes no refúgio.
- Expedições com vidas extras e dificuldades Easy → Medium → Hard, desbloqueadas ao concluir a campanha anterior.
- Ranking global casual com nome e divulgação opcional de projeto; pontuação recalculada pela API na Cloudflare e armazenada em D1.
- Chefes carregados por mundo e assets otimizados para reduzir o download inicial.

Skills, relíquias e cristais reiniciam por fase. Vidas e score permanecem durante a tentativa; talentos, equipamento e materiais permanentes sobrevivem à derrota. A tentativa ainda fica em memória: recarregar inicia uma nova. Veja [as regras completas](docs/EXPEDITIONS.md).

## Rodar localmente

Use Node.js 24 LTS e npm; dependências fixadas em `package-lock.json`.

```sh
npm ci
npm run dev
```

Abra o endereço localhost exibido pelo Vite. Não é necessário configurar Cloudflare para experimentar o combate. O ranking global requer a API: no preview estático, o jogo usa o estado local/offline.

```sh
npm test
npm run build:cloudflare
```

O pacote de produção fica em `dist-cloudflare/`. Páginas de aprovação, fixtures e arquivos Blender não entram nesse build, mas estão versionados para edição e revisão.

Para gerar o HTML independente:

```sh
npm run build
npm run standalone
```

Arquivo resultante: `standalone/BOMB-RIFT.html`, com os assets e GLBs incorporados. Ranking online depende do ambiente de publicação; o HTML offline serve para jogar localmente.

## Controles

| Ação | Desktop |
|---|---|
| Mover | WASD ou setas |
| Bomba | Espaço |
| Esquiva | Shift |
| Forjar melhoria | E |
| Ver build | B |
| Pausar | Esc ou P |

Controles de toque estão disponíveis. A adaptação mobile de câmera, zoom e ergonomia está planejada; ainda não foi implementada como port dedicado.

## Estrutura

- `src/game.js`, `src/campaign.js`, `src/legacy.js`: simulação, campanha e metaprogressão.
- `src/scene.js`, `src/boss-models.js`, `src/boss-ai.js`, `src/boss-mechanics.js`: renderização e chefes.
- `src/main.js`, `src/refuge-home.js`, `src/pixel-interface.css`: interface e controles.
- `src/assets/`, `public/guardian-review/`, `public/pixel-library/`: arte, áudio e fontes de trabalho.
- `shared/`, `server/`, `functions/`, `migrations/`: pontuação, API e banco do ranking.
- `tests/`, `qa/`, páginas `*-APROVACAO.html`: validações e prévias locais.
- `docs/`: decisões, relatórios e planos.

## Cloudflare e dados

`wrangler.jsonc` registra a infraestrutura deste jogo. Quem publicar uma cópia deve configurar seu próprio Pages, D1 e widget Turnstile. Credenciais e variáveis secretas não estão incluídas; `.env*`, `.dev.vars*`, caches e logs ficam ignorados pelo Git.

Consulte [o registro da publicação 2.5](docs/RELEASE-2.5.md). Os scripts `setup-ranking-*.mjs` são utilitários específicos do ambiente original, não passos necessários para rodar localmente. O ranking é casual: o servidor valida relatórios e recalcula pontos, mas não reproduz a simulação para impedir toda trapaça.

## Verificação e histórico

126 testes passaram no checkpoint de 07/09/2026. [Relatório de desempenho](docs/PERFORMANCE-2026-09-07.md). O plano de melhorias é backlog, não funcionalidade entregue.

As descrições e verificações de versões anteriores estão preservadas em [HISTORY.md](docs/HISTORY.md); suas regras podem ter sido substituídas pelas expedições da versão 2.5.

## Dependências e assets

Three.js, Vite, Lucide e fontes distribuídas via Fontsource; versões em `package-lock.json`. Músicas do refúgio fornecidas para o projeto; procedência documentada em `src/assets/music/README.md`. Modelos e artes de trabalho acompanham o código. Este checkpoint não adiciona uma licença de redistribuição ao projeto ou aos assets; dependências mantêm suas próprias licenças.
