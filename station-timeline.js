// PRUEBA VISUAL: secuencia automática. No es una partida y no guarda puntajes.
export const STATION_DURATION=18.5;
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export function stationFrame(seconds){
  const t=Math.max(0,Number.isFinite(seconds)?seconds:0);
  return {seconds:t,deploy:1-Math.pow(1-clamp(t/3.8),3),charge:5+95*smooth((t-4)/8),
    converge:smooth((t-12)/2),heroAge:Math.max(0,t-14),hero:t>=14,done:t>=STATION_DURATION,
    phase:t<4?'deploy':t<12?'charge':t<14?'converge':t<STATION_DURATION?'reveal':'done'};
}
// El tiempo avanza solo mientras el afiche está reconocido y la pestaña visible.
export function createStationClock(){
  let elapsed=0,last=null;
  return {reset(now=0){elapsed=0;last=now;},step(now,running){
    if(last!==null&&running)elapsed=Math.min(STATION_DURATION,elapsed+Math.max(0,now-last)/1000);
    last=now;return stationFrame(elapsed);
  },get seconds(){return elapsed;}};
}
