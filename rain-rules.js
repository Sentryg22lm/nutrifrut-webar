import {advanceTimedTravel} from './rain-timing.js?v=2';
export {advanceTimedTravel};
// LLUVIA MÁS RÁPIDA Y ESPACIADA: 59 ingredientes en 35 s; antes 77 en 30 s.
// LLUVIA LIBRE. Estos valores también los verifica Supabase.
export const COMBO_RULES=Object.freeze({version:'rain-v5',maxScore:8000,durationMs:35000,initialSpeed:1.35,minReactionMs:80,minGapMs:75,chargeHits:54});
// Tipo: 0 avena / 1 frutos rojos / 2 cereal. Probabilidad: 50 / 18 / 32 %.
export const INGREDIENTS=Object.freeze([
  Object.freeze({name:'Avena',points:10}),
  Object.freeze({name:'Frutos rojos',points:30}),
  Object.freeze({name:'Cereal',points:20}),
]);
export function comboSchedule(seed){
  let value=Math.trunc(Number(seed))%2147483647;if(value<=0)value=1;
  const next=()=>{value=value*48271%2147483647;return value/2147483647;};
  const items=[];
  for(let time=300;time<34500;time+=580){
    const spawnMs=time+Math.floor(next()*251)-125,lifetimeMs=3600+Math.floor(next()*501),choice=next();
    items.push({id:items.length,spawnMs,lifetimeMs,type:choice<.5?0:choice<.68?1:2,x:next(),y:next(),phase:next()*Math.PI*2,sway:(next()-.5)*.7});
  }
  return items;
}
export function difficultyFor(score){
  const levels=[{score:0,speed:1.35},{score:180,speed:1.55},{score:400,speed:1.75},{score:700,speed:1.95},{score:1100,speed:2.15},{score:1600,speed:2.35}];
  return levels.reduce((current,level)=>score>=level.score?level:current,levels[0]);
}
export function createComboState(){return {score:0,correctHits:0,completed:0,streak:0,bestStreak:0,lastType:null,multiplier:1,mistakes:0};}
export function applyIngredient(state,type){
  if(!Number.isInteger(type)||type<0||type>2)throw new Error('Ingrediente inválido');
  state.streak=state.lastType===type?state.streak+1:1;state.lastType=type;
  state.bestStreak=Math.max(state.bestStreak,state.streak);state.correctHits++;
  const points=INGREDIENTS[type].points,bonus=state.streak>=3?Math.min(30,(state.streak-2)*10):0;
  if(state.streak===3)state.completed++;
  state.score+=points+bonus;state.multiplier=Math.min(3,Math.max(1,state.streak-1));
  return {correct:true,points,bonus,completed:state.streak>=3,type,streak:state.streak};
}
export function comboEnergy(state){return Math.min(100,5+Math.floor(state.correctHits*95/COMBO_RULES.chargeHits));}
