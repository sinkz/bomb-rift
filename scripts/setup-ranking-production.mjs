// Configure only this game's production secrets, using the existing Wrangler login.
// Credentials and secret values never enter the repository or console output.
import {readFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
const account='47e9c3a4775a46519e70dc86e7435513',project='bomb-rift';
const auth=readFileSync('C:/Users/Diego Augusto/AppData/Roaming/xdg.config/.wrangler/config/default.toml','utf8');
const token=auth.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
if(!token)throw Error('Wrangler login required');
async function api(path,method='GET',data){
  const response=await fetch('https://api.cloudflare.com/client/v4/accounts/'+account+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});
  const result=await response.json();
  if(!response.ok||!result.success)throw Error('Cloudflare request failed: '+response.status+' '+result.errors?.map(e=>e.code).join(','));
  return result.result;
}
const current=await api('/pages/projects/'+project);
const env=current.deployment_configs?.production?.env_vars||{};
const keys=['RANKING_SECRET','TURNSTILE_SECRET','TURNSTILE_SITE_KEY'];
if(process.argv.includes('--apply')){
  const sitekey=JSON.parse(readFileSync('wrangler.jsonc','utf8')).env.production.vars.TURNSTILE_SITE_KEY;
  const widget=await api('/challenges/widgets/'+sitekey);
  if(!widget.domains.includes('bomb-rift.pages.dev'))throw Error('Production hostname is not enabled for Turnstile');
  const additions={};
  if(!env.RANKING_SECRET)additions.RANKING_SECRET={type:'secret_text',value:randomBytes(32).toString('hex')};
  if(!env.TURNSTILE_SECRET){
    if(!widget.secret)throw Error('Turnstile secret unavailable');
    additions.TURNSTILE_SECRET={type:'secret_text',value:widget.secret};
  }
  if(!env.TURNSTILE_SITE_KEY)additions.TURNSTILE_SITE_KEY={type:'plain_text',value:sitekey};
  if(Object.keys(additions).length){
    // Preserve unknown variables, including opaque existing secrets, as returned by Pages.
    await api('/pages/projects/'+project,'PATCH',{deployment_configs:{production:{env_vars:{...env,...additions}}}});
  }
}
const checked=await api('/pages/projects/'+project);
console.log(JSON.stringify({productionBranch:checked.production_branch,productionSecretNames:Object.keys(checked.deployment_configs?.production?.env_vars||{}),configured:keys.every(k=>checked.deployment_configs?.production?.env_vars?.[k]),productionDatabases:checked.deployment_configs?.production?.d1_databases,latestDeployment:checked.canonical_deployment?.url}));
