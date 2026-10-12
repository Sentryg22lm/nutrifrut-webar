import {COMBO_RULES,comboSchedule,createComboState,applyIngredient,comboEnergy} from './combo-rules.js?test=1';
export function playRound({surface,timer,score,energy,progress,seed,onCharge=()=>{},onMission=()=>{},onFeedback=()=>{},onEnd,paused=false}){
  const schedule=comboSchedule(seed),active=new Map(),used=new Set(),state=createComboState();
  let frame=0,stopped=false,next=0,lastHit=-1000,elapsed=0,lastTime=performance.now(),finalPhase=false;
  const publish=()=>{const percent=comboEnergy(state);score.textContent=String(state.score);energy.style.width=percent+'%';progress.setAttribute('aria-valuenow',String(percent));onCharge(percent);surface.setNeeds?.(state.needed.map((n,i)=>n-state.filled[i]));onMission({...state,needed:[...state.needed],filled:[...state.filled],finalPhase});};
  function advance(){const now=performance.now();if(!paused)elapsed+=Math.max(0,now-lastTime);lastTime=now;}
  function clear(){cancelAnimationFrame(frame);surface.clear();surface.setCollect(null);}
  function finish(){if(stopped)return;stopped=true;clear();onEnd({hits:[],score:state.score,completed:state.completed,bestStreak:state.bestStreak,mistakes:state.mistakes});}
  function collect(id){
    if(stopped||paused||used.has(id))return;advance();if(elapsed>=COMBO_RULES.durationMs){finish();return;}
    const item=active.get(id),time=Math.floor(elapsed);
    if(!item||time<item.spawnMs+COMBO_RULES.minReactionMs||time>item.spawnMs+item.lifetimeMs||time<lastHit+COMBO_RULES.minGapMs)return;
    lastHit=time;used.add(id);active.delete(id);const feedback=applyIngredient(state,item.type,time);
    surface.collect(id,feedback);publish();onFeedback({...state,...feedback,finalPhase});
  }
  function tick(){
    if(stopped)return;advance();timer.textContent=String(Math.max(0,Math.ceil((COMBO_RULES.durationMs-elapsed)/1000)));
    if(elapsed>=COMBO_RULES.durationMs){finish();return;}
    if(!paused){
      if(!finalPhase&&elapsed>=25000){finalPhase=true;publish();onFeedback({finalPhase:true,phaseStarted:true});}
      while(next<schedule.length&&schedule[next].spawnMs<=elapsed){const item=schedule[next++];if(elapsed<=item.spawnMs+item.lifetimeMs){active.set(item.id,item);surface.add(item);}}
      for(const [id,item] of active){const age=elapsed-item.spawnMs;if(age>item.lifetimeMs){surface.remove(id);active.delete(id);}else surface.update(id,age);}
    }
    frame=requestAnimationFrame(tick);
  }
  surface.clear();surface.setCollect(collect);surface.setPaused(paused);publish();frame=requestAnimationFrame(tick);
  return{setPaused(value){if(stopped)return;advance();paused=Boolean(value);surface.setPaused(paused);},cancel(){if(stopped)return;stopped=true;clear();}};
}
