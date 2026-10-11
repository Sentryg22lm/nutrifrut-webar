import { RULES, makeSchedule, validHit, batteryPercent } from './game-rules.js?v=7';

export function playRound({surface,timer,score,energy,progress,seed,onCharge=()=>{},onEnd,paused=false}) {
  const schedule=makeSchedule(seed),active=new Map(),hits=[],collected=new Set();
  let frame=0,stopped=false,next=0,lastHit=-1000,elapsed=0,lastTime=performance.now();
  function advance(now=performance.now()) {
    if(!paused)elapsed+=Math.max(0,now-lastTime);
    lastTime=now;
  }
  function clear() {cancelAnimationFrame(frame);surface.clear();surface.setCollect(null);}
  function finish() {
    if(stopped)return;
    stopped=true;clear();onEnd({hits:[...hits],score:hits.length*RULES.points});
  }
  function collect(id) {
    if(stopped||paused||collected.has(id))return;
    advance();
    if(elapsed>=RULES.durationMs){finish();return;}
    const item=active.get(id),time=Math.floor(elapsed);
    if(!item||!validHit(item,time,lastHit))return;
    lastHit=time;collected.add(id);hits.push({id,t:time});active.delete(id);surface.collect(id);
    const points=hits.length*RULES.points,percent=batteryPercent(points);
    score.textContent=String(points);energy.style.width=percent+'%';progress.setAttribute('aria-valuenow',String(percent));onCharge(percent);
  }
  function tick() {
    if(stopped)return;
    advance();timer.textContent=String(Math.max(0,Math.ceil((RULES.durationMs-elapsed)/1000)));
    if(elapsed>=RULES.durationMs){finish();return;}
    if(!paused){
      while(next<schedule.length&&schedule[next].spawnMs<=elapsed){const item=schedule[next++];if(elapsed<=item.spawnMs+item.lifetimeMs){active.set(item.id,item);surface.add(item);}}
      for(const [id,item] of active){const age=elapsed-item.spawnMs;if(age>item.lifetimeMs){surface.remove(id);active.delete(id);}else surface.update(id,age);}
    }
    frame=requestAnimationFrame(tick);
  }
  surface.clear();surface.setCollect(collect);surface.setPaused(paused);
  frame=requestAnimationFrame(tick);
  return {
    setPaused(value){if(stopped)return;advance();paused=Boolean(value);surface.setPaused(paused);},
    cancel(){if(stopped)return;stopped=true;clear();},
  };
}
