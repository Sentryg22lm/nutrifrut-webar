export const COMBO_RULES=Object.freeze({durationMs:30000,points:10,bonus:50,minReactionMs:80,minGapMs:75});
export function comboSchedule(seed){
  let value=Math.trunc(Number(seed))%2147483647;if(value<=0)value=1;
  const next=()=>{value=value*48271%2147483647;return value/2147483647;};
  const items=[];let time=300;
  while(time<29700){
    const early=time<8000,final=time>=25000;
    items.push({id:items.length,spawnMs:time+Math.floor(next()*161)-80,lifetimeMs:(early?3400:final?2500:2900)+Math.floor(next()*601),type:Math.floor(next()*3),x:next(),y:next(),phase:next()*Math.PI*2,sway:(next()-.5)*.7});
    time+=early?420:final?200:300;
  }
  return items;
}
export function recipeFor(index,elapsed){
  const recipes=[[2,1,0],[0,2,1],[1,0,2],[1,1,1]];
  const needed=[...recipes[index%recipes.length]];
  if(elapsed>=8000)needed[index%3]++;
  return needed;
}
export function createComboState(){return{needed:recipeFor(0,0),filled:[0,0,0],score:0,completed:0,streak:0,bestStreak:0,multiplier:1,mistakes:0};}
export function applyIngredient(state,type,elapsed){
  if(!Number.isInteger(type)||type<0||type>2)throw new Error('Ingrediente inválido');
  if(state.filled[type]>=state.needed[type]){state.mistakes++;state.streak=0;state.multiplier=1;return{correct:false,points:0,bonus:0,completed:false};}
  const boost=elapsed>=25000?2:1,points=COMBO_RULES.points*state.multiplier*boost;
  state.filled[type]++;state.score+=points;
  let bonus=0,completed=false;
  if(state.filled.every((count,i)=>count>=state.needed[i])){
    completed=true;bonus=COMBO_RULES.bonus*state.multiplier*boost;state.score+=bonus;state.completed++;state.streak++;state.bestStreak=Math.max(state.bestStreak,state.streak);state.multiplier=Math.min(3,1+Math.floor(state.streak/2));
    state.needed=recipeFor(state.completed,elapsed);state.filled=[0,0,0];
  }
  return{correct:true,points,bonus,completed};
}
export function comboEnergy(state){return Math.min(100,5+state.completed*15+state.filled.reduce((a,b)=>a+b,0)*3);}
