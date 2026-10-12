import { CONFIG } from './config.js?v=8';
let sdkPromise;
export function validateConfiguration(config) {
  if (!config.supabaseUrl && !config.supabasePublicKey) return false;
  const url = new URL(config.supabaseUrl);
  if (url.protocol !== 'https:' || url.pathname !== '/' || url.username || url.password || url.search || url.hash) throw new Error('La URL de Supabase debe ser el origen HTTPS del proyecto.');
  const key = config.supabasePublicKey;
  if (key.startsWith('sb_publishable_')) return true;
  if (key.startsWith('eyJ')) {
    try { const data = JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))); if (data.role === 'anon') return true; } catch { /* Not a public JWT. */ }
  }
  throw new Error('Utiliza únicamente una clave pública publishable o anon.');
}
function loadSDK() {
  if (globalThis.supabase?.createClient) return Promise.resolve(globalThis.supabase);
  if (!sdkPromise) sdkPromise = new Promise((resolve,reject) => {
    const script = document.createElement('script'); script.src = './vendor/supabase.js'; script.async = true;
    const timer = setTimeout(()=>{script.remove();reject(new Error('No se pudo cargar la conexión con el ranking.'));},15000);
    script.onload = () => {clearTimeout(timer);globalThis.supabase?.createClient ? resolve(globalThis.supabase) : reject(new Error('No se cargó Supabase.'));};
    script.onerror = () => {clearTimeout(timer);script.remove();reject(new Error('No se pudo cargar Supabase.'));};
    document.head.appendChild(script);
  }).catch(error=>{sdkPromise=null;throw error;});
  return sdkPromise;
}
export class RankingClient {
  constructor(config=CONFIG, sdkLoader=loadSDK) { this.config=config;this.sdkLoader=sdkLoader;this.client=null;this.authPromise=null; }
  get configured() { return Boolean(this.config.supabaseUrl && this.config.supabasePublicKey); }
  async connect() {
    if (!this.configured) throw new Error('El ranking no está disponible por ahora.');
    validateConfiguration(this.config);
    if (!this.client) {
      const sdk=await this.sdkLoader();
      this.client=sdk.createClient(this.config.supabaseUrl,this.config.supabasePublicKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'nutrifrut-ranking-auth-v1'}});
    }
    if (!this.authPromise) this.authPromise=(async()=>{
      const {data,error}=await this.client.auth.getSession();if(error)throw error;
      if(data.session)return data.session;
      const result=await this.client.auth.signInAnonymously();if(result.error)throw result.error;
      if(!result.data.session)throw new Error('No se pudo crear tu sesión del ranking.');
      return result.data.session;
    })().finally(()=>{this.authPromise=null;});
    return this.authPromise;
  }
  async rpc(name,args) {
    await this.connect();
    const {data,error}=await this.client.rpc(name,args);if(error)throw error;
    if(!data || typeof data!=='object')throw new Error('El ranking devolvió una respuesta inválida.');
    return data;
  }
  startRun() { return this.rpc('nf_start_run',{p_campaign:this.config.campaign}); }
  finishRun(runId,nickname,hits) { return this.rpc('nf_finish_run',{p_run_id:runId,p_nickname:nickname,p_hits:hits}); }
  leaderboard() { return this.rpc('nf_leaderboard',{p_campaign:this.config.campaign}); }
}
export const ranking = new RankingClient();
