// RITMO DE 35 SEGUNDOS. Debe coincidir con nr_travel_v5 en Supabase.
export const TIMING_STEPS=Object.freeze([
 {atMs:0,factor:1},{atMs:10000,factor:1.025},{atMs:20000,factor:1.20},
 {atMs:27000,factor:1.30},{atMs:30000,factor:1.38},{atMs:32000,factor:1.45},
]);
export function advanceTimedTravel(speed,baseTarget,fromMs,toMs){
 let at=Math.max(0,fromMs),distance=0,current=speed;const end=Math.max(at,toMs);
 while(at<end){
  const factor=TIMING_STEPS.reduce((value,step)=>at>=step.atMs?step.factor:value,1),next=TIMING_STEPS.find(step=>step.atMs>at)?.atMs??end;
  const until=Math.min(end,next),delta=until-at,target=baseTarget*factor,decay=Math.exp(-delta/650);
  distance+=target*delta+(current-target)*650*(1-decay);current=target+(current-target)*decay;at=until;
 }
 return {speed:current,distance};
}
