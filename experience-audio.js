// SONIDOS ORIGINALES: síntesis local, sin descargas ni música en bucle.
// VOLUMEN GENERAL: masterVolume. La preferencia de silencio se conserva.
export function createExperienceAudio({scope=globalThis,masterVolume=.22}={}){
  const Context=scope.AudioContext||scope.webkitAudioContext;
  let context=null,master=null,compressor=null,noise=null,paused=false,muted=false;
  const voices=new Set();
  try{muted=scope.localStorage?.getItem('nutrifruit-sonido-silenciado')==='1';}catch{}
  function stop(){
    for(const voice of voices){try{voice.source.stop();}catch{}voice.source.disconnect();voice.gain.disconnect();}
    voices.clear();
  }
  // Solo se invoca desde Iniciar juego o desde el control de sonido.
  async function unlock(){
    if(!Context||muted)return false;
    try{
      if(!context||context.state==='closed'){
        context=new Context();master=context.createGain();master.gain.value=masterVolume;
        compressor=context.createDynamicsCompressor();compressor.threshold.value=-16;
        compressor.knee.value=18;compressor.ratio.value=3;
        master.connect(compressor);compressor.connect(context.destination);
      }
      if(context.state==='suspended'||context.state==='interrupted')await context.resume();
      return context.state==='running';
    }catch{return false;}
  }
  function playable(){return context?.state==='running'&&!muted&&!paused&&voices.size<24;}
  function track(source,gain,end){
    const voice={source,gain};voices.add(voice);
    source.onended=()=>{voices.delete(voice);source.disconnect();gain.disconnect();};
    source.stop(end+.025);
  }
  function tone(frequency,duration=.12,delay=0,level=.25,type='sine',endFrequency=frequency){
    if(voices.size>=24)return;
    const start=context.currentTime+delay,end=start+duration;
    const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type=type;
    oscillator.frequency.setValueAtTime(frequency,start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20,endFrequency),end);
    gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(level,start+.008);
    gain.gain.exponentialRampToValueAtTime(.0001,end);
    oscillator.connect(gain);gain.connect(master);oscillator.start(start);track(oscillator,gain,end);
  }
  function rush(duration=.32,delay=0,level=.16){
    if(voices.size>=24)return;
    if(!noise){
      noise=context.createBuffer(1,Math.ceil(context.sampleRate*.8),context.sampleRate);
      const data=noise.getChannelData(0);let seed=9317,last=0;
      for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;last=.72*last+.28*(seed/2147483648-1);data[i]=last;}
    }
    const source=context.createBufferSource(),gain=context.createGain(),start=context.currentTime+delay;
    source.buffer=noise;gain.gain.setValueAtTime(0,start);
    gain.gain.linearRampToValueAtTime(level,start+.035);
    gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    source.connect(gain);gain.connect(master);source.start(start);track(source,gain,start+duration);
  }
  function play(callback){if(!playable())return;try{callback();}catch{stop();}}
  return {
    get supported(){return Boolean(Context);},get muted(){return muted;},unlock,stop,
    toggle(){muted=!muted;try{scope.localStorage?.setItem('nutrifruit-sonido-silenciado',muted?'1':'0');}catch{}if(muted)stop();else void unlock();return muted;},
    setPaused(value){if(Boolean(value)&&!paused)stop();paused=Boolean(value);},
    start(){play(()=>{tone(392,.16,0,.22);tone(523.25,.2,.11,.22);tone(783.99,.25,.23,.2);});},
    collect(multiplier=1){play(()=>tone(600+Math.min(3,multiplier)*85,.11,0,.23,'sine',1050));},
    miss(){play(()=>tone(210,.09,0,.13,'triangle',150));},
    combo(){play(()=>{[523.25,659.25,783.99,1046.5].forEach((f,i)=>tone(f,.23,i*.065,.24));});},
    countdown(){play(()=>tone(740,.065,0,.12));},
    revealCharge(){play(()=>{rush(.5,0,.12);tone(180,.55,0,.14,'sine',720);});},
    revealBurst(){play(()=>{rush(.35,0,.25);tone(150,.4,0,.3,'sine',55);tone(1046.5,.3,.04,.19);});},
    revealReady(){play(()=>{[523.25,659.25,783.99].forEach(f=>tone(f,.5,0,.12));tone(1046.5,.55,.17,.16);});},
  };
}
