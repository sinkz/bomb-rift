async(page)=>{
const results=[];
for(const width of [1440,390]){
 const ctx=await page.context().browser().newContext({viewport:{width,height:950}});
 try{
  const p=await ctx.newPage(),errors=[],failed=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
  await p.goto('http://127.0.0.1:4173/PIXEL-ART-APROVACAO.html');
  await p.waitForFunction(()=>window.pixelPreview?.results.loaded===147);
  const groups=await p.evaluate(()=>[...new Set(PIXEL_CATALOG.items.map(i=>i.group))]),checked=[];
  for(const group of groups){
   await p.locator('[data-group]').filter({hasText:group}).click();
   const expected=await p.evaluate(g=>PIXEL_CATALOG.items.filter(i=>i.group===g).length,group),count=await p.locator('.asset-card').count();
   if(count!==expected)throw Error(group+' count mismatch');checked.push([group,count]);
  }
  await p.locator('[data-group="Todos"]').click();
  await p.locator('#search').fill('xyz_nonexistent');
  if(!await p.locator('#empty').isVisible())throw Error('Empty state missing');
  await p.locator('#search').fill('bomba');const searchCount=await p.locator('.asset-card').count();await p.locator('#search').fill('');
  await p.locator('#size').selectOption('28');await p.locator('#surface').selectOption('check');
  await p.locator('[data-detail="ui-Minimize"]').click();await p.locator('#detail').waitFor({state:'visible'});await p.keyboard.press('Escape');
  await p.locator('#surface').selectOption('light');await p.locator('#surface').selectOption('dark');await p.locator('#size').selectOption('96');
  const overflows=[];
  for(const demo of ['skills','hud','refuge','worlds']){
   await p.locator('[data-demo="'+demo+'"]').click();
   for(const style of ['old','pixel']){
    await p.locator('[data-style="'+style+'"]').click();await p.locator('#context').scrollIntoViewIfNeeded();
    if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))overflows.push(demo+':'+style);
   }
   await p.locator('#context').screenshot({path:'C:/Users/Diego Augusto/Documents/Codex/2026-09-04/pre/outputs/bomb-rift/screenshots/pixel-library-'+width+'-'+demo+'.png'});
  }
  await p.locator('[data-demo="skills"]').click();await p.locator('[data-pick="1"]').click();
  if(await p.locator('[data-pick="1"]').getAttribute('aria-pressed')!=='true')throw Error('Selection failed');
  await p.locator('[data-group="Habilidades"]').click();
  await p.locator('#library').screenshot({path:'C:/Users/Diego Augusto/Documents/Codex/2026-09-04/pre/outputs/bomb-rift/screenshots/pixel-library-'+width+'-comparison.png'});
  results.push({width,errors,failed,overflows,searchCount,storage:await p.evaluate(()=>Object.keys(localStorage)),checked,loaded:await p.locator('#load-status').innerText()});
 }finally{await ctx.close();}
}
return results;
}
