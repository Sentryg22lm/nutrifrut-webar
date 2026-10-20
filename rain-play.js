import {COMBO_RULES,comboSchedule,createComboState,applyIngredient,comboEnergy,difficultyFor,advanceTimedTravel} from './rain-rules.js?v=3';
export function playRound({surface,timer,score,energy,progress,seed,onCharge=()=>{},onFeedback=()=>{},onEnd,paused=false}){
  const schedule=comboSchedule(seed),active=new Map(),used=new Set(),hits=[],state=createComboState();
  let frame=0,stopped=false,next=0,lastHit=-1000,elapsed=0,lastTime=performance.now(),finalPhase=false,speed=COMBO_RULES.initialSpeed,travel=0,travelTime=0;
  const segments=[{t:0,travel:0,speed:COMBO_RULES.initialSpeed,target:COMBO_RULES.initialSpeed}];
  function travelAt(t){let segment=segments[0];for(const next of segments){if(next.t>t)break;segment=next;}return segment.travel+advanceTimedTravel(segment.speed,segment.target,segment.t,t).distance;}
  const publish=()=>{const percent=comboEnergy(state);score.textContent=String(state.score);energy.style.width=percent+'%';progress.setAttribute('aria-valuenow',String(percent));onCharge(percent);surface.setNeeds?.([1,1,1]);};
  function advance(){
    const now=performance.now(),delta=Math.max(0,now-lastTime);lastTime=now;
    if(paused)return;
    elapsed+=delta;
    const time=Math.floor(elapsed),step=advanceTimedTravel(speed,difficultyFor(state.score).speed,travelTime,time);
    travel+=step.distance;speed=step.speed;travelTime=time;
    for(const entry of active.values())entry.travelAge=travel-entry.birthTravel;
  }
  function clear(){cancelAnimationFrame(frame);surface.clear();surface.setCollect(null);}
  function finish(){if(stopped)return;stopped=true;clear();onEnd({hits:[...hits],score:state.score,completed:state.completed,bestStreak:state.bestStreak,mistakes:state.mistakes,energy:comboEnergy(state)});}
  function collect(id){
    if(stopped||paused||used.has(id))return;advance();if(elapsed>=COMBO_RULES.durationMs){finish();return;}
    const entry=active.get(id),time=Math.floor(elapsed);
    if(!entry||time<entry.item.spawnMs+COMBO_RULES.minReactionMs||entry.travelAge>entry.item.lifetimeMs||time<lastHit+COMBO_RULES.minGapMs)return;
    lastHit=time;used.add(id);active.delete(id);const feedback=applyIngredient(state,entry.item.type);hits.push({id,t:time});
    const target=difficultyFor(state.score).speed;if(target!==segments.at(-1).target)segments.push({t:time,travel,speed,target});
    surface.collect(id,feedback);publish();onFeedback({...state,...feedback,finalPhase});
  }
  function tick(){
    if(stopped)return;advance();timer.textContent=String(Math.max(0,Math.ceil((COMBO_RULES.durationMs-elapsed)/1000)));
    if(elapsed>=COMBO_RULES.durationMs){finish();return;}
    if(!paused){
      if(!finalPhase&&elapsed>=COMBO_RULES.durationMs-5000){finalPhase=true;publish();onFeedback({finalPhase:true,phaseStarted:true});}
      while(next<schedule.length&&schedule[next].spawnMs<=elapsed){const item=schedule[next++],birthTravel=travelAt(item.spawnMs),travelAge=travel-birthTravel;if(travelAge<=item.lifetimeMs){active.set(item.id,{item,travelAge,birthTravel});surface.add(item);}}
      for(const [id,entry] of active){if(entry.travelAge>entry.item.lifetimeMs){surface.remove(id);active.delete(id);}else surface.update(id,entry.travelAge);}
    }
    frame=requestAnimationFrame(tick);
  }
  surface.clear();surface.setCollect(collect);surface.setPaused(paused);publish();frame=requestAnimationFrame(tick);
  return{setPaused(value){if(stopped)return;advance();paused=Boolean(value);surface.setPaused(paused);},cancel(){if(stopped)return;stopped=true;clear();}};
}
