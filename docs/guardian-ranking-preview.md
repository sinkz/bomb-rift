# BOMB RIFT 2.5 beta — prévia de guardiões e ranking

Implementação em 06/09/2026. A versão principal continua em 2.4.

- Jogo e ranking: https://guardians-ranking.bomb-rift.pages.dev/
- Galeria: https://guardians-ranking.bomb-rift.pages.dev/GUARDIOES-APROVACAO.html
- Deployment desta revisão: https://19f89ded.bomb-rift.pages.dev

## Entregue na prévia

O atlas usa retratos pixel art. Foram modelados no Blender Mórthos, Vulkar,
Nyxara, Briarok, Fulgra e Nivor com base em suas respectivas referências.
A galeria compara arte e volume, oferece render individual e oito animações
por modelo. Os GLBs ficam separados dos modelos de combate até aprovação.

Mórthos e Vulkar têm duas pernas com IK; Briarok e Nivor, quatro;
Fulgra tem seis patas com marcha em tripés. Nyxara levita intencionalmente.
Cada modelo tem uma malha com skin e materiais de cores chapadas. Os arquivos
Blender editáveis, renders e GLBs estão em `public/guardian-review`.
O script `scripts/guardian-sculptures.py` cria cenas isoladas no Blender;
`scripts/guardians-blender.py` fornece a geometria original de Mórthos e utilitários.
`node scripts/audit-guardian-models.mjs` verifica arquivos, clips, skin e apoio das patas.

Os três novos retratos foram gerados com ImageGen a partir da prancha
`docs/plans/assets/guardians-concept.png`. Os primeiros arquivos `*-pixel.png`
têm fundo quadriculado opaco e são apenas referências intermediárias.
Os arquivos `*-portrait.png` são as revisões com fundo preto uniforme;
a galeria usa composição screen. Não são anunciados como PNGs transparentes.

## Ranking

Pages Functions atende somente `/api/*`; o jogo e as artes são estáticos.
Cloudflare D1 `bomb-rift-ranking-preview` guarda perfis, sessões, fichas,
melhores resultados, promoções, cliques e denúncias. Produção não usa esse banco.

A fórmula `rift-1`, edição `founders-1`, fica em `shared/scoring.js`.
O servidor calcula o total e conserva as parcelas. A tela final mostra as regras,
limites, multiplicador, build e métricas reais, inclusive dano efetivo sem overkill.
Vitória e morte salvam uma ficha privada; o jogador decide publicá-la.
Uma expedição inteiramente offline continua no ranking local.

O perfil usa um cookie HttpOnly emitido pelo servidor. Nome e divulgação são
editáveis em Ranking → Meu perfil. A mensagem e o link são opcionais.
Limpar cookies remove o acesso ao perfil anônimo; não existe recuperação
por login nesta primeira versão. Saves e progressão anteriores são preservados.

A classificação mostra a melhor expedição de cada perfil, com filtro de fase
e paginação. Cliques de saída são contados separadamente, deduplicam eventos
e ignoram o próprio dono. Eles não medem conversões nem acessos efetivamente
concluídos no site de destino. Agregados de visitantes são diários aproximados.

Turnstile é validado no servidor para publicação e edição de perfil. Há checagem
de origem, propriedade, tamanho, duração, relações entre métricas e frequência;
consultas usam parâmetros. O ranking está identificado como **casual em beta**:
relatórios plausíveis adulterados ainda podem passar. Replay determinístico e
progressão confiável no servidor são trabalho futuro, antes de ranking competitivo.

## Verificação realizada

- 112 testes automatizados passaram: gameplay anterior, score, API, propriedade,
  reenvio idempotente, cliques, Turnstile e despertares inválidos.
- Seis GLBs carregaram no Three.js: uma cena, uma malha, uma skin e oito clips cada.
  A auditoria amostrou a caminhada e verificou vértices finitos e alturas das patas.
- Ranking e perfil revisados em 390 × 844, PT e EN, sem rolagem horizontal.
- Publicação, edição e recuperação de ficha testadas no runtime local do Workers.
- Partida real na prévia Cloudflare: 26 s, 1 bomba, 1 abate, 3 cristais,
  combo 1, 140 pontos. Turnstile passou e o servidor confirmou publicação.
- Build de prévia: 201 arquivos, 40,97 MiB, maior arquivo 2,94 MiB.
  As seis revisões 3D e renders são carregados pela galeria, não pela partida.

## Próxima integração após aprovação visual

Trocar os três modelos originais e atribuir Briarok/Fulgra/Nivor aos mundos
Jardim/Trovão/Gelo. Atualizar nomes, falas, portraits de runtime e adaptador de
animações juntos, para não apresentar uma arte nova com um chefe antigo em combate.
Os novos encontros de bulbos, circuitos e muralhas permanecem no plano; esta
prévia mantém as mecânicas de combate já aprovadas.

Antes de promover o backend à versão principal, criar banco D1 de produção,
aplicar a migração e configurar RANKING_SECRET, TURNSTILE_SECRET e a site key no
ambiente production. O bloco production do Wrangler deixa DB vazio de propósito,
para impedir que uma publicação acidental use o banco de testes.

## Comandos

```text
npm test
node scripts/audit-guardian-models.mjs
npm run build:cloudflare -- --review
npx --offline --cache .npm-cache wrangler pages deploy dist-cloudflare --project-name bomb-rift --branch guardians-ranking --commit-dirty=true
```

O build sem `--review` exclui a galeria e todos os assets de aprovação.
Credenciais não são versionadas: `.dev.vars`, `.wrangler` e logs estão ignorados.
Para desenvolvimento local, aplicar a migração D1 local, usar `.dev.vars` e
`wrangler pages dev dist-cloudflare --port 8788 --ip 127.0.0.1`.
