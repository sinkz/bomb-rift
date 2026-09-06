import {build} from 'vite';
import {copyFileSync,writeFileSync,readdirSync,statSync} from 'node:fs';
import {resolve,dirname,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const out=resolve(root,'dist-cloudflare');
const rel=relative(root,out);
if(rel!=='dist-cloudflare'||isAbsolute(rel)||rel.startsWith('..'))throw Error('Unsafe build directory');
const review=process.argv.includes('--review');
await build({root,publicDir:false,build:{outDir:out,emptyOutDir:true,...(review?{rollupOptions:{input:{game:resolve(root,'index.html'),guardians:resolve(root,'GUARDIOES-APROVACAO.html')}}}:{})}});
copyFileSync(resolve(root,'public/favicon.svg'),resolve(out,'favicon.svg'));
writeFileSync(resolve(out,'_routes.json'),JSON.stringify({version:1,include:['/api/*'],exclude:[]}));
writeFileSync(resolve(out,'_headers'),`/assets/*
  Cache-Control: public, max-age=31536000, immutable

/
  Cache-Control: public, max-age=0, must-revalidate

/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
`);
writeFileSync(resolve(out,'_redirects'),'/BOMB-RIFT.html / 302\n/BOMB-RIFT / 302\n');
writeFileSync(resolve(out,'404.html'),'<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BOMB RIFT — 404</title><body style="background:#120e1a;color:#f6e9dd;font-family:system-ui;padding:3rem"><h1>Essa fenda não existe.</h1><p lang="en">This rift does not exist.</p><p><a style="color:#e8b57c" href="/">Voltar ao jogo <span lang="en">/ Back to the game</span></a></p></body></html>');
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(resolve(dir,e.name)):[resolve(dir,e.name)]);}
const list=files(out);
for(const f of list){if(statSync(f).size>25*1024*1024)throw Error('Asset exceeds Pages limit: '+relative(out,f));}
if(list.length>1000)throw Error('Too many files for dashboard upload');
console.log(JSON.stringify({directory:out,files:list.length,totalMiB:+(list.reduce((s,p)=>s+statSync(p).size,0)/1048576).toFixed(2),largestMiB:+(Math.max(...list.map(p=>statSync(p).size))/1048576).toFixed(2),includesPixelPreview:false},null,2));
