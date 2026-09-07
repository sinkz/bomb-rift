# Carregamento inicial — 7 de setembro de 2026

## Diagnóstico em produção

Fonte: painel autenticado Cloudflare Web Analytics de bomb-rift.pages.dev, últimas 24 horas, BRT, bots excluídos.

| Indicador | Observado |
|---|---|
| Visitas / page views | 13 / 13 |
| Page load time (rótulo do painel) | 1.977 ms |
| LCP | 38% bom, 13% intermediário, 50% ruim |
| LCP P50 / P75 / P90 | 2.604 / 6.284 / 11.024 ms |
| INP | 67% bom, 33% intermediário, 0% ruim |
| CLS | 100% bom |

O gráfico de LCP contém 8 medições; INP, 3; CLS, 6. Percentuais arredondados podem somar 101%. A amostra é pequena e não sustenta uma conclusão estável sobre todos os jogadores. O painel também informa uma atualização na medição de navegações suaves que pode alterar agregados.

O debug de LCP identifica `#hub>div.world>div.scenery`, com a imagem `refuge-bimKCyfA.png`: 5 medições, P75 de 6.820 ms. Isso aponta o fundo do refúgio como prioridade. Não há evidência nesses dados de saturação da Cloudflare. O indicador de carregamento da página não equivale ao LCP.

Referências: [métricas e diagnóstico da Cloudflare](https://developers.cloudflare.com/web-analytics/data-metrics/core-web-vitals/) e [otimização de LCP](https://web.dev/articles/optimize-lcp). A referência de LCP bom é até 2,5 segundos no percentil 75.

## Alterações locais

| Arquivo/recurso | Antes | Depois | Redução |
|---|---:|---:|---:|
| JavaScript inicial, sem compressão | 6.499.832 B | 932.558 B | 85,7% |
| JavaScript inicial, gzip reportado pelo Vite (aproximado) | 1.139,52 KB | 265,3 KB | 76,7% |
| Fundo do refúgio | 2.336.188 B | 319.450 B | 86,3% |

- Seis GLBs deixaram de ser base64 no JavaScript inicial. Cada mundo carrega seu chefe ao iniciar a fase, antecipando o combate. Downloads concorrentes são compartilhados; falhas permitem nova tentativa e preservam o modelo procedural de reserva.
- O fundo usa WebP de qualidade 90 com dimensões originais e preload de alta prioridade, evitando esperar a descoberta via CSS. A conversão do fundo é com perda, com PSNR de 37,16 dB; foi conferida visualmente.
- Sprites, moldura e três retratos usam WebP sem perda. O script compara os pixels visíveis e dimensões. Não foram alteradas animações ou a arte original. Detalhes em `startup-assets.json`.
- Os arquivos emitidos em `/assets/` aproveitam a política existente de cache imutável por um ano, com nomes versionados por conteúdo.
- O empacotador offline incorpora também os GLBs e remove o preload externo.

## Validação e limites

Build Cloudflare e build padrão concluídos. Versão standalone gerada, com seis modelos incorporados e nenhuma URL externa de GLB. 126 testes passaram, incluindo carregamento sob demanda, cache e recuperação após falha. Refúgio inspecionado no navegador e entrada na fase sem erros de console. A API de ranking não está servida pelo preview estático local; nenhum resultado de teste foi enviado ao ranking público.

Não houve publicação nesta etapa, nem nova medição de campo ou benchmark controlado de LCP/INP. Redução de bytes não é uma promessa de redução proporcional do tempo. Após publicar, comparar a mesma janela e segmentar por dispositivo, navegador e país com mais amostras. Se INP continuar intermediário, perfilar a preparação dos sprites e a inicialização de WebGL antes de novas mudanças. O CLS já está bom na amostra observada.
