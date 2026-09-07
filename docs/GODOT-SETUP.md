# Preparação do protótipo Godot

Verificado em 07/09/2026. Lista de preparação; nenhum MCP ou SDK foi instalado nesta etapa.

## Baixar agora

1. **Godot Engine 4.7.2 Standard para Windows x86_64**, versão estável exibida no [site oficial](https://godotengine.org/download/windows/). Usaremos GDScript; escolha o download Standard, sem .NET. Extraia o ZIP em uma pasta estável.
2. **Export templates da mesma versão**. Instale pelo gerenciador de templates do editor ou use o download no site. Necessários para gerar versões web, Windows e Android, não para começar a editar/executar no editor. [Documentação](https://docs.godotengine.org/en/stable/tutorials/export/exporting_projects.html).

Godot + templates bastam para o primeiro teste no PC e navegador. O projeto deve usar o renderizador Compatibility se a web for um alvo do protótipo. A exportação web Godot 4 não suporta projetos C# atualmente. [Limitações de exportação web](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html).

## Para testar APK no Android depois

- [Android Studio](https://developer.android.com/studio), para instalar e administrar o Android SDK.
- [OpenJDK 17 / Temurin](https://adoptium.net/temurin/releases/?version=17), recomendado pela documentação do Godot.
- Configurar no SDK Manager os pacotes exigidos pela versão escolhida. A documentação estável consultada lista Platform-Tools 35+, Build-Tools 35.0.1, Platform 35, Command-line Tools, CMake 3.10.2.4988404 e NDK 28.1.13356709.
- Informar Java SDK Path e Android SDK Path nas configurações do Godot. Usar aparelho físico com depuração USB para validar toque e desempenho.

Confira os requisitos correspondentes ao editor instalado antes de baixar pacotes adicionais: [exportar para Android](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_android.html). Não é necessário baixar Android Studio para o primeiro protótipo desktop/web.

## MCP: existe, mas é opcional

Uma opção comunitária é [Coding-Solo/godot-mcp](https://github.com/Coding-Solo/godot-mcp). O README declara ferramentas para abrir o editor, executar/parar projetos, ler logs, inspecionar projetos e criar/editar cenas e nós.

- Requer Godot e Node.js >=18 com npm. Nesta máquina já foram verificados Node.js 24.12 e Git; não é necessário baixá-los novamente.
- O pacote publicado indicado pelo projeto é `@coding-solo/godot-mcp`.
- O servidor recebe `GODOT_PATH`, apontando para o executável extraído.
- É uma integração de terceiros, não um MCP oficial do Godot. Não foi instalada nem testada com este protótipo; revisar e fixar uma versão antes de configurar.
- Podemos trabalhar por arquivos GDScript/cenas e execução headless mesmo sem MCP. O MCP ajuda a obter feedback, mas não faz uma migração automática do Three.js.

Não é necessário instalar vários servidores Godot MCP ao mesmo tempo. Validar um servidor com criar cena → executar → ler erro/log → parar antes de usá-lo no projeto completo.

## Já aproveitável e opcional

- Modelos `.glb`, pixel art e músicas deste repositório podem compor o protótipo, conferindo importação, materiais e escala.
- Blender já faz parte do fluxo de assets; não é necessário reinstalá-lo para importar GLBs.
- Editor externo é opcional: o Godot inclui editor de scripts.
- Exportar para iOS requer Mac com Xcode; isso fica fora do primeiro teste no Windows. [Documentação](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_ios.html).

## Primeiro teste delimitado

Uma arena, Faísca, bombas em cruz, esquiva, Mórthos, transformação do mapa, HUD de toque e zoom. Comparar exportações web e Android com Three.js no mesmo aparelho: fidelidade, carregamento, FPS, controles e esforço de manutenção. Manter a versão Three.js preservada até decidir pela migração com base nesse resultado.
