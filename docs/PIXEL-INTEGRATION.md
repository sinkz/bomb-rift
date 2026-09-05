# Integração da biblioteca pixel art aprovada

## Runtime

- `src/pixel-assets.js`: mapa de 157 IDs semânticos para 147 URLs de WebP. Contém apenas IDs e URLs; não leva prompts, SVGs antigos, catálogo ou metadados de aprovação ao jogo.
- `src/assets/pixel/*.webp`: cópias lossless dos PNGs aprovados, 384 × 384 com alpha. Total: 9.180.980 bytes. Cada imagem é baixada quando um elemento a usa; o manifesto não faz preload de toda a biblioteca.
- `src/pixel-art.js`: gera um SVG com `<image>` interno para manter os seletores, dimensões responsivas e animações de UI que já usam SVG. A arte é decorativa (`aria-hidden`); nomes e descrições continuam nos controles/textos HTML.
- `src/pixel-art.css`: tratamento visual dos assets, miniaturas de mundos e tinturas. Não altera barras de vida/XP ou cooldown.
- `src/skill-art.js`: a função `skillArt` usa os assets. `skillPreview` foi preservada nesta frente para a internacionalização.
- `src/rpg-art.js`: recursos e equipamentos possuem ilustrações próprias; nomes antigos de formas ainda funcionam como fallback.

## Hooks de integração

Importar em `main.js`:

```js
import { pixelIcon, applyPixelIcons, portraitArt } from './pixel-art.js';
import './pixel-art.css';
const icon = pixelIcon;
const icons = () => {
  createIcons({ icons: ICONS, attrs: { 'stroke-width': 1.7 } });
  applyPixelIcons();
};
```

`applyPixelIcons` é um passe explícito para markup Lucide legado. Não usa MutationObserver, intervalos ou trabalho por frame. `pixelIcon` já retorna diretamente o asset para os 40 símbolos mapeados; nomes desconhecidos continuam disponíveis via Lucide.

Aplicar as identidades semânticas nas funções de renderização. Os helpers `skillArt` e `rpgArt` já importados atendem a maioria das trocas:

| Local/entidade | Antes | Depois |
| --- | --- | --- |
| Habilidade comum | `skillArt(s.id)` | manter |
| Relíquia no atlas, build e HUD | `skillArt(r.art)` | `skillArt('relic-' + r.id)` |
| Talento | `skillArt(t.art)` | `skillArt('talent-' + t.id)` |
| Contrato | `skillArt(c.art)` | `skillArt('contract-' + c.id)` |
| Bestiário | `skillArt(e.art)` | `skillArt('enemy-' + id)` |
| Equipamento no refúgio/HUD | `rpgArt(g.art)` / `rpgArt(item.art)` | `rpgArt(g.id)` / `rpgArt(item.id)` |
| Recurso | `rpgArt(key)` | manter |
| Retrato no menu, refúgio e HUD | SVG fixo/recolorido | `portraitArt(meta.outfit)` |
| Tintura | `<span class="outfit-swatch"></span>` | `<span class="outfit-swatch">${pixelArt('outfit-' + o.id)}</span>` |

Retratos devem ser renderizados com o ID de traje atual. A substituição de cores do SVG anterior não modifica os pixels de uma imagem; reavaliar `portraitArt(meta.outfit)` ao equipar um traje e no início da fase preserva a correspondência com o personagem 3D.

Para miniaturas de mundo, importar `pixelArt` em `atlas.js` e usar:

```js
pixelArt('map-' + world.id, 'world-pixel-thumb')
```

Substituir o pequeno número inicial de `.world-tab` pela miniatura, conservando nomes, estados e contagem de fendas. A classe tem 44px no desktop e 32px em telas pequenas. Manter o mapa SVG principal, sua rota e os nós interativos alinhados.

Os IDs `guardian-${world.id}` estão disponíveis para fallback 2D do retrato, mantendo a classe `boss-portrait` e a prévia de modelo 3D por cima. Um uso é `pixelArt('guardian-' + world.id, 'boss-portrait ' + world.id)`. Conservar a informação textual do nome/título adjacente.

Notificações de relíquia também devem passar `relic-${id}` quando o código conhece a identidade; a função de arte genérica anterior perdia essa informação.

## Elementos preservados

- Os modelos 3D dos três chefes e as entidades da arena permanecem intactos.
- A rota e os nós do atlas permanecem interativos e alinhados ao terreno aprovado.
- Vida, XP, vida do chefe, relógio, cargas, talentos e cooldown mantêm preenchimento proporcional e números HTML reais.
- As pranchas de botão, moldura, medidor e toggle são referências aprovadas disponíveis no manifesto, mas não substituem controles/barras por desenhos estáticos. Isso evita uma imagem de vida cheia quando o jogador está ferido ou um estado falso de cooldown.
- Áreas clicáveis, foco de teclado, legendas, layout das cartas e descrições não são rasterizados.

## Reprodução e validação

```sh
python scripts/prepare-pixel-runtime.py
node --test tests/pixel-assets.test.js
```

A preparação requer Pillow. Compara o alpha e os pixels compostos sobre fundos preto e branco, garantindo que a otimização lossless preserve a aparência aprovada. Não modifica a biblioteca de aprovação em `public/pixel-library`.

Os três testes verificam cobertura das entidades, integridade dos arquivos, todos os aliases do catálogo e identidade específica de equipamento/relíquia/traje. Passaram em 05/09/2026.

Revisão independente dos scripts de entrega em 05/09/2026, sem modificar `dist`: build Vite com `write:false` e `publicDir:false` emitiu os 147 WebP; todos os caminhos são literais `/assets/...webp` no JS e cobertos pela substituição do `standalone.mjs`. O build continha 164 arquivos antes dos arquivos auxiliares do Cloudflare, todos menores que 25 MiB. Nenhuma página/prancha/ZIP de aprovação entrou no bundle. A versão offline embute imagens em data URIs; Cloudflare usa arquivos com hash e cache imutável.

A revisão visual final deve cobrir menu, troca de traje, refúgio, skills/relíquias, HUD e telas pequenas após os hooks acima estarem aplicados.
