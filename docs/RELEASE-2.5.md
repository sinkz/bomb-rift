# BOMB RIFT 2.5 beta — produção

Publicado em 06/09/2026 (America/Sao_Paulo).

- Site: https://bomb-rift.pages.dev/
- Deployment: https://8309d111.bomb-rift.pages.dev
- Branch de produção no Pages: `main`.
- Seis modelos de chefes aprovados, animações, perseguição, transformação da arena,
  ruptura de barreiras distantes e runas mais visíveis estão no jogo publicado.
- As páginas de teste e arquivos Blender de aprovação permanecem locais.

## Ranking global

Produção agora usa D1 `bomb-rift-ranking-production`
(`718c2a93-8caf-4501-b75e-cc35210eabad`), binding `DB`, migração
`0001_global_ranking.sql` aplicada. A prévia mantém seu banco separado.
RANKING_SECRET e TURNSTILE_SECRET foram configurados como secrets no Pages;
TURNSTILE_SITE_KEY está no ambiente production do Wrangler. Nenhum segredo
está neste documento, no build ou no código.

A home consulta o ranking público e destaca os três melhores perfis. O salão
completo abre em Global, oferece filtros de fase, fichas, projetos e cliques de
saída. A API mostra a melhor expedição publicada por perfil, por temporada/fase,
sem restringir a consulta ao visitante. A interface pagina até 100 posições.

Vitórias e mortes online geram ficha privada; o jogador publica explicitamente
nome, pontuação e divulgação opcional após a partida. Recordes antigos locais
não são migrados automaticamente. Dados da prévia não foram copiados: o banco
de produção estava vazio na verificação inicial. Ranking casual em beta;
o servidor valida métricas e recalcula pontos, mas não reproduz a partida.

## Validação

- 118 testes passaram; build Cloudflare concluído (32,07 MiB).
- API de produção `/api/config`: HTTP 200, `available: true`, site key presente.
- `/api/leaderboard`: HTTP 200, temporada founders-1, lista inicial vazia.
- Home entrega `index-EEPn3ESR.js`, correspondente ao build publicado.
- Configuração remota confirma o banco de produção e os três nomes de variáveis.
- Home e modal Global conferidos no navegador; estado vazio correto e sem erro.
- Não foram criadas pontuações públicas artificiais para validar o deploy.
  Publicação de partida com Turnstile havia sido testada na prévia; não repetida
  em produção nesta publicação.

## Próxima publicação

```text
npm test
npm run build:cloudflare
npx --offline --cache .npm-cache wrangler pages deploy dist-cloudflare --project-name bomb-rift --branch main --commit-dirty=true
```

`scripts/setup-ranking-production.mjs` consulta somente metadados por padrão;
`--apply` configura apenas segredos ausentes. Não rotaciona segredos existentes.
Logs do Wrangler podem ser direcionados a `.wrangler-logs` com WRANGLER_LOG_PATH.
