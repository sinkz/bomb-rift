# BOMB RIFT 2.4

O refúgio aprovado passa a ser a entrada de produção. O controlador existente mantém a simulação, o salvamento, as recompensas e o ranking; os controladores de home e atlas recebem apenas dados reais. Nenhum saldo demonstrativo, desbloqueio de teste ou botão de antecipar chefes é importado da prévia.

- Save: `bomb-rift-v1`, com migração existente preservada.
- Ranking: `bomb-rift-ranking-v1`, apenas resultados locais.
- Áudio: `bomb-rift-audio-v1`, agora também salva `refugeTrack`.
- Idioma: `bomb-rift-language`, independente do progresso.
- Entrada: `index.html`; `/BOMB-RIFT.html` redireciona para `/` no Pages.
- Publicação: `npm run build:cloudflare`, seguida de `wrangler pages deploy dist-cloudflare --project-name=bomb-rift --branch=main`.

A pasta `dist-cloudflare` inclui somente os módulos e assets usados pelo jogo. Os HTMLs de aprovação, scripts de modelagem, referências e documentação ficam fora da publicação. A validação cobre progressão, dano instantâneo, IA gradual, maestrias, mecânicas de chefe, áudio, traduções e compra/equipamento. O fluxo visual foi verificado em desktop e em celulares nos dois sentidos.
