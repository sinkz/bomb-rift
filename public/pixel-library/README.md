# BOMB RIFT — biblioteca pixel art para aprovação

**Atualização 2.3:** direção aprovada e integrada ao jogo por meio de cópias WebP sem perda em `src/assets/pixel`. Esta biblioteca preserva os originais e a comparação histórica com os ícones da versão 2.2. Consulte `docs/PIXEL-INTEGRATION.md` para o uso no jogo; os estudos estáticos de barras e botões continuam como referência, enquanto seus estados dinâmicos são renderizados pela interface.

Esta biblioteca é uma proposta visual isolada. Não altera os arquivos de gameplay, os modelos 3D, o progresso salvo ou os ícones usados pela versão 2.2.

Abra **PIXEL-ART-APROVACAO.html** na pasta public ou no servidor do jogo. A página compara todos os usos inventariados, possui busca e filtros, três tamanhos de leitura, fundos claro/escuro/transparência, ampliação e quatro demonstrações de interface.

## Conteúdo

- `icons/`: PNGs individuais de 384 × 384 px, com transparência e margem interna; nomes estáveis.
- `sheets/`: pranchas originais da geração em lotes.
- `contacts/`: pranchas com nomes para conferência dos recortes.
- `catalog.json`: usos visuais, SVG/HTML atual, arquivo proposto, categoria e origem no código.
- `prompts.json`: prompts completos utilizados com a ferramenta integrada image_gen.
- `audit.json`: disponibilidade, recortes, transparência e integridade do código do jogo.
- `bomb-rift-pixel-art.zip`: pacote de entrega, incluindo as pranchas e o inventário.

O inventário inclui habilidades, relíquias, talentos, equipamentos, contratos, bestiário, recursos, controles e símbolos de HUD, retratos, tinturas, guardiões 2D, mapas, barras, molduras e estados. Vários usos semânticos compartilham o mesmo arquivo de ícone. Os três assets do teste inicial aprovado foram preservados e recortados.

Os SVGs do comparativo são extraídos das funções usadas pelo jogo. Estados decorativos feitos em CSS são reproduções visuais para comparação, identificadas na ampliação. Texto, números dinâmicos, tipografia e layout não são rasterizados. As ilustrações dos chefes são alternativas 2D para a interface; os chefes 3D não são substituídos.

## Antes de integrar

Aprovar a direção visual, incluindo a leitura a 28 px. Barras, molduras e botões são estudos estáticos: a implementação posterior deve preservar o preenchimento proporcional, a área de interação e a acessibilidade. O exemplo de HUD usa valores fictícios. Recortes e arquivos podem ser preparados em atlas com padding e amostragem adequada depois da aprovação. Não há animações novas nesta biblioteca de ícones.

Geração: ferramenta integrada image_gen; recorte dos lotes autorizado pelo usuário. Os prompts e as pranchas são preservados para revisão e continuidade artística.

## Preparação e conferência

As pranchas geradas com fundo quadriculado foram recortadas por máscara, preservando as cores e a arte original; as pranchas-fonte permanecem intactas. Os ícones possuem canal alpha real. A separação segue os espaços entre os desenhos para evitar pedaços de ícones vizinhos. As áreas fechadas e os olhos dos guardiões foram revisados.

A prancha `corrections-ui.png` substitui os símbolos de minimizar e retornar do lote 07, corrigindo sua direção. Os PNGs em `icons/` e as pranchas `final-*` representam a seleção final. O inventário cobre 157 usos visuais com 147 assets distintos em 15 categorias.

Reproduzir: `node scripts/pixel-catalog.mjs`, `python scripts/crop-pixel-library.py`, `node scripts/audit-pixel-library.mjs`. O script de recorte requer Pillow e NumPy. A geração em si usa a ferramenta integrada, com prompts preservados em JSON.
