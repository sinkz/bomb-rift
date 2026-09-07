import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
// Use an installed Sharp runtime. Sprites and UI retain every visible pixel.
const sharp=require(process.env.SHARP_PATH || 'sharp');
const files=['refuge','panel','faisca-front-back','faisca-sprites','faisca-refuge-life'].map(name=>({name,source:`mockups/refuge/assets/${name}.png`}))
  .concat(['briarok','fulgra','nivor'].map(name=>({name:`${name}-portrait`,source:`public/guardian-review/${name}-portrait.png`})));
await fs.mkdir('src/assets/optimized',{recursive:true});
const results=[];
for(const {name,source} of files){
  const output=`src/assets/optimized/${name}.webp`;
  await sharp(source).webp(name === 'refuge' ? {quality:90,effort:6} : {lossless:true,effort:6}).toFile(output);
  const before=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const after=await sharp(output).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  if(before.info.width!==after.info.width || before.info.height!==after.info.height)throw Error('Dimensions changed: '+source);
  let identical=true,squaredError=0;
  for(let i=0;i<before.data.length;i+=4){
    if(before.data[i+3]!==after.data[i+3] || before.data[i+3] && [0,1,2].some(c=>before.data[i+c]!==after.data[i+c]))identical=false;
    for(let c=0;c<3;c++)squaredError+=(before.data[i+c]-after.data[i+c])**2;
  }
  if(name!=='refuge' && !identical)throw Error('Visible pixels changed: '+source);
  const oldBytes=(await fs.stat(source)).size,newBytes=(await fs.stat(output)).size;
  results.push({source,output,oldBytes,newBytes,savedPercent:Math.round((1-newBytes/oldBytes)*1000)/10,visiblePixelsIdentical:identical,psnrDb:identical?null:+(10*Math.log10(255**2/(squaredError/(before.data.length/4*3)))).toFixed(2)});
}
await fs.writeFile('docs/startup-assets.json',JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2));
