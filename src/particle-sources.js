import atlas from './assets/particles/atlas.webp?url&no-inline';
import ring from './assets/particles/ring.webp?url&no-inline';

// Isolado como boss-sources.js: o runner de testes do node nao sabe importar
// binario, entao a URL entra por injecao em vez de import direto no scene.js.
export const particleSources = { atlas, ring };
