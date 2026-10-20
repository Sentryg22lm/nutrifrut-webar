// CÁMARA: un solo stream; AR espera dimensiones y un fotograma utilizable.
export async function openCamera({mediaDevices,createVideo,isCurrent,container}){
  const constraints={video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false};
  let stream;
  try{stream=await mediaDevices.getUserMedia(constraints);}
  catch(error){
    // Algunos dispositivos rechazan restricciones aunque sí tengan cámara.
    if(error?.name!=='OverconstrainedError'&&error?.name!=='ConstraintNotSatisfiedError')throw error;
    if(!isCurrent())throw Object.assign(new Error('Operación cancelada'),{name:'AbortError'});
    stream=await mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
  }
  const abort=()=>Object.assign(new Error('Operación cancelada'),{name:'AbortError'});
  if(!isCurrent()){stream.getTracks().forEach(t=>t.stop());throw abort();}
  const video=createVideo();video.autoplay=true;video.muted=true;video.defaultMuted=true;video.playsInline=true;
  for(const attr of ['autoplay','muted','playsinline'])video.setAttribute(attr,'');
  Object.assign(video.style,{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:'cover',zIndex:'0'});
  container.appendChild(video);video.srcObject=stream;
  let timeout,poll,settled=false;
  try{
    const timeoutError=()=>Object.assign(new Error('La cámara no entregó imagen a tiempo.'),{name:'CameraTimeoutError'});
    await Promise.race([
      (async()=>{
        await video.play();
        // No depender solo de loadeddata: algunos móviles omiten ese evento.
        await new Promise((resolve,reject)=>{
          const check=()=>{
            if(settled||!isCurrent())return reject(abort());
            if(video.error)return reject(Object.assign(new Error('No se pudo leer el video de la cámara.'),{name:'NotReadableError'}));
            if(video.videoWidth>0&&video.videoHeight>0&&video.readyState>=2)return resolve();
            poll=setTimeout(check,50);
          };check();
        });
      })(),
      new Promise((_,reject)=>{timeout=setTimeout(()=>reject(timeoutError()),15000);}),
    ]);
    if(!isCurrent())throw abort();
    video.setAttribute('width',video.videoWidth);video.setAttribute('height',video.videoHeight);
    return {video,stream};
  }catch(error){stream.getTracks().forEach(t=>t.stop());video.srcObject=null;video.remove();throw error;}
  finally{settled=true;clearTimeout(timeout);clearTimeout(poll);}
}
