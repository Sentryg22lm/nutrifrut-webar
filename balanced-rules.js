export const COMBO_RULES=Object.freeze({version:'balanced-v1',maxScore:4000,durationMs:30000,points:10,bonus:30,minReactionMs:80,minGapMs:75,chargeHits:48});
export function comboSchedule(seed){
  let value=Math.trunc(Number(seed))%2147483647;if(value<=0)value=1;
  const next=()=>{value=value*48271%2147483647;return value/2147483647;};
  const items=[];let time=300;
  // A fixed supply: higher score shortens the time to catch, never adds easy drops.
  while(time<29500){
    items.push({id:items.length,spawnMs:time+Math.floor(next()*151)-75,lifetimeMs:3600+Math.floor(next()*501),type:Math.floor(next()*3),x:next(),y:next(),phase:next()*Math.PI*2,sway:(next()-.5)*.7});time+=380;
  }
  return items;
}
export function difficultyFor(score){
  const levels=[{score:0,speed:1},{score:80,speed:1.2},{score:180,speed:1.4},{score:320,speed:1.65},{score:520,speed:1.85},{score:800,speed:2.05}];
  return levels.reduce((current,level)=>score>=level.score?level:current,levels[0]);
}
export function recipeFor(index){
  const recipes=[[2,1,1],[1,2,1],[1,1,2],[2,2,0]],needed=[...recipes[index%recipes.length]];
  if(index>=3)needed[index%3]++;
  return needed;
}
export function createComboState(){return{needed:recipeFor(0),filled:[0,0,0],score:0,correctHits:0,completed:0,streak:0,bestStreak:0,multiplier:1,mistakes:0};}
export function applyIngredient(state,type){
  if(!Number.isInteger(type)||type<0||type>2)throw new Error('Ingrediente inválido');
  if(state.filled[type]>=state.needed[type]){state.mistakes++;state.streak=0;state.multiplier=1;return{correct:false,points:0,bonus:0,completed:false};}
  const points=COMBO_RULES.points*state.multiplier;state.filled[type]++;state.correctHits++;state.score+=points;
  let bonus=0,completed=false;
  if(state.filled.every((count,i)=>count>=state.needed[i])){
    completed=true;bonus=COMBO_RULES.bonus*state.multiplier;state.score+=bonus;state.completed++;state.streak++;state.bestStreak=Math.max(state.bestStreak,state.streak);state.multiplier=Math.min(3,1+Math.floor(state.streak/3));state.needed=recipeFor(state.completed);state.filled=[0,0,0];
  }
  return{correct:true,points,bonus,completed};
}
export function comboEnergy(state){return Math.min(100,5+Math.floor(Math.max(0,state.correctHits)*95/COMBO_RULES.chargeHits));}

// Exact travel integral so the database can replay a run independently of frame rate.
export function advanceTravel(speed,target,deltaMs){
 const delta=Math.max(0,deltaMs),decay=Math.exp(-delta/650);
 return {speed:target+(speed-target)*decay,distance:target*delta+(speed-target)*650*(1-decay)};
}
