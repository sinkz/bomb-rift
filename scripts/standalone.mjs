import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
let html = await readFile(join(dist, 'index.html'), 'utf8');
const scriptMatch = html.match(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/);
const styleMatch = html.match(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);
if (!scriptMatch || !styleMatch) throw new Error('Bundle Vite não encontrado. Execute npm run build antes.');
const asset = name => join(dist, name.replace(/^\//, ''));
let script = await readFile(asset(scriptMatch[1]), 'utf8');
let style = await readFile(asset(styleMatch[1]), 'utf8');
const mimeTypes = { '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.avif': 'image/avif' };
const dataUri = async url => {
  const mime = mimeTypes[extname(url)];
  if (!mime) throw new Error(`Tipo de asset offline não suportado: ${url}`);
  return `data:${mime};base64,${(await readFile(asset(url))).toString('base64')}`;
};
const urls = [...new Set([...style.matchAll(/url\(([^)]+)\)/g)].map(m => m[1].replace(/["']/g, '')).filter(url => !url.startsWith('data:')))];
for (const url of urls) {
  style = style.split(url).join(await dataUri(url));
}
// Vite emits imported icon URLs into JS. Embed them too so the single file stays offline.
for (const filename of await readdir(join(dist, 'assets'))) {
  if (!mimeTypes[extname(filename)]) continue;
  const url = `/assets/${filename}`;
  if (script.includes(url)) script = script.split(url).join(await dataUri(url));
}
html = html.replace(scriptMatch[0], () => `<script type="module">${script.replace(/<\/script/gi, '<\\/script')}</script>`);
html = html.replace(styleMatch[0], () => `<style>${style}</style>`);
const favicon = await readFile(join(root, 'public', 'favicon.svg'), 'base64');
html = html.replace('href="/favicon.svg"', `href="data:image/svg+xml;base64,${favicon}"`);
await mkdir(join(root, 'standalone'), { recursive: true });
await writeFile(join(root, 'standalone', 'BOMB-RIFT.html'), html);
await writeFile(join(dist, 'BOMB-RIFT.html'), html);
console.log(`Versão offline criada: standalone/BOMB-RIFT.html (${Math.round(Buffer.byteLength(html) / 1024)} KB)`);
