import { openCamera } from './camera.js';
import { CONFIG } from './config.js?v=7';
import { ranking } from './ranking.js?v=7';
import { RULES } from './game-rules.js?v=7';
import { playRound } from './play.js?v=7';

const $ = id => document.getElementById(id);
let state = 'intro', operation = 0, session = null, viewer = null;
let enginePromise = null, product = null, THREE = null, MindARThree = null, OrbitControls = null, makeRecharge = null, makeARGame = null;
let targetVerified=false, game=null, gameOperation=0, lastRound=null, resultVersion=0, rankingOperation=0, rankFocus=null;
let revealFrame=0,revealFinish=null;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function screen(next) {
  state = next;
  $('intro').hidden = next !== 'intro';
  $('scan-ui').hidden = next !== 'scan';
  $('result-ui').hidden = next !== 'product';
  $('product-stage').hidden = next !== 'product';
  $('game-ui').hidden = next !== 'game';
  $('reveal-ui').hidden=next!=='reveal';
  $('error-panel').hidden = next !== 'error';
}

function failure(error, stage = 'camera') {
  const name = error?.name || 'Error';
  let title = 'No se pudo iniciar la cámara';
  let message = 'Abre el enlace en una pestaña de Safari o Chrome y vuelve a intentarlo.';
  const policy = document.permissionsPolicy || document.featurePolicy;
  const allowed = policy?.allowsFeature ? policy.allowsFeature('camera') : true;
  if (!isSecureContext) {
    title = 'Abre el enlace seguro';
    message = 'Utiliza el enlace publicado que empieza por https://.';
  } else if (!allowed) {
    title = 'La cámara está bloqueada en esta vista';
    message = 'Abre el enlace directamente en Safari o Chrome, fuera de la vista integrada de ChatGPT.';
  } else if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    title = 'El navegador no permitió la cámara';
    message = 'Permite la cámara en los ajustes de este sitio. Si abriste el enlace dentro de otra aplicación, ábrelo directamente en Safari o Chrome.';
  } else if (name === 'NotFoundError') {
    title = 'No encontramos una cámara';
    message = 'Abre esta prueba en un teléfono con cámara.';
  } else if (name === 'NotReadableError' || name === 'TrackStartError') {
    title = 'No se pudo acceder a la cámara';
    message = 'Cierra otras aplicaciones que estén utilizando la cámara y vuelve a intentarlo.';
  } else if (name === 'CameraTimeoutError') {
    title = 'La cámara no entregó imagen';
    message = 'Vuelve a intentarlo desde Safari o Chrome. Comprueba que el navegador tenga permiso para utilizar la cámara.';
  } else if (stage === 'product') {
    title = 'No se pudo mostrar el empaque';
    message = 'El navegador no pudo iniciar los gráficos 3D. Vuelve a intentarlo en Safari o Chrome.';
  }
  $('error-title').textContent = title;
  $('error-message').textContent = message;
  $('error-detail').textContent = `${name}: ${error?.message || 'Sin detalles del navegador.'}`;
  screen('error');
}

async function loadEngine() {
  if (!enginePromise) {
    enginePromise = (async () => {
      const [three, ar, controls, model, scene, arGame] = await Promise.all([
        import('./vendor/three.module.js'),
        import('./vendor/mindar-image-three.prod.js'),
        import('./vendor/OrbitControls.js'),
        import('./model.js'),
        import('./scene.js?v=7'),
        import('./ar-game.js?v=7'),
      ]);
      THREE = three; MindARThree = ar.MindARThree; OrbitControls = controls.OrbitControls; makeRecharge=scene.rechargeScene;makeARGame=arGame.createIngredientSurface;
      product = product || await model.createPackaging();
    })().catch(error => { enginePromise = null; throw error; });
  }
  return enginePromise;
}

function rendererSettings(renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
}
function lights(scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 1.3));
  for (const [color, intensity, x, y, z] of [[0xfff7ee,2.5,1,2,3],[0xe4ecff,1.2,-2,1,2],[0xffeedd,1.4,0,-1,-2]]) {
    const light = new THREE.DirectionalLight(color, intensity); light.position.set(x,y,z); scene.add(light);
  }
}
function disposeRun(run) {
  if (!run) return;
  run.closed = true;
  run.surface?.dispose();run.recharge?.dispose();
  clearTimeout(run.hintTimer); clearTimeout(run.startTimer); clearTimeout(run.permissionTimer);
  const ar = run.ar;
  if (ar) {
    ar.renderer.setAnimationLoop(null);
    ar.controller?.stopProcessVideo();
    ar.renderer.dispose();
    ar.video = null;
  }
  run.stream?.getTracks().forEach(track => track.stop());
  run.video?.remove();
  if (session === run) { session = null; $('ar-stage').replaceChildren(); }
}
function stopViewer() {
  if (!viewer) return;
  viewer.renderer.setAnimationLoop(null); viewer.controls.dispose(); viewer.renderer.dispose();
  $('product-stage').replaceChildren(); viewer = null;
}
function home() {
  cancelAnimationFrame(revealFrame);revealFinish=null;
  if(state==='reveal')product?.removeFromParent();
  ++operation; ++gameOperation; ++resultVersion; game?.cancel(); game=null;
  closeRanking(); disposeRun(session); stopViewer(); targetVerified=false;screen('intro');
  $('start').hidden=false;$('start').disabled = false; $('start').textContent = 'Permitir cámara';
  $('intro-note').textContent = 'Mantén el afiche a la vista durante el juego.';
}

async function startAR() {
  if (state !== 'intro') return;
  if (!isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    failure(Object.assign(new Error('La cámara no está disponible en esta vista.'), {name:'NotFoundError'})); return;
  }
  const run = { ticket: ++operation, closed: false, seen: false, tracked:false, video: null, stream: null, ar: null };
  session = run;
  const current = () => session === run && run.ticket === operation && !run.closed;
  $('start').disabled = true; $('start').textContent = 'Esperando permiso de cámara…';
  $('intro-note').textContent = 'Acepta el permiso de cámara cuando aparezca.';
  run.permissionTimer = setTimeout(() => {
    if (current()) $('intro-note').textContent = 'Si no aparece el permiso, abre el enlace directamente en Safari o Chrome.';
  }, 12000);
  try {
    const opened = await openCamera({
      mediaDevices: navigator.mediaDevices,
      createVideo: () => document.createElement('video'),
      isCurrent: current,
      container: $('ar-stage'),
    });
    clearTimeout(run.permissionTimer);
    Object.assign(run, opened);
    if (!current()) { disposeRun(run); return; }
    // Show the live camera before downloading or starting the AR engine.
    $('scan-heading').textContent = 'Cámara activa';
    $('scan-status').textContent = 'Preparando reconocimiento. Mantén el afiche a la vista.';
    $('scan-frame').hidden = false; $('start-game').hidden = false;$('start-game').disabled=true; $('retry-engine').hidden = true;
    screen('scan');
    await attachTracking(run);
  } catch (error) {
    const active = current(); disposeRun(run);
    if (active && error?.name !== 'AbortError') failure(error);
  } finally {
    if (run.ticket === operation) { $('start').disabled = false; $('start').textContent = 'Activar cámara'; }
  }
}

async function attachTracking(run) {
  const current = () => session === run && run.ticket === operation && !run.closed;
  if (!current() || run.loading || run.ar) return;
  run.loading = true;
  $('retry-engine').hidden = true;
  $('scan-heading').textContent = 'Cámara activa';
  $('scan-status').textContent = 'Cargando reconocimiento del afiche…';
  let ar;
  try {
    await loadEngine();
    if (!current()) return;
    ar = new MindARThree({ container:$('ar-stage'), imageTargetSrc:'./assets/targets.mind', maxTrack:1, uiLoading:'no', uiScanning:'no', uiError:'no' });
    run.ar = ar;
    // Reuse the camera stream that is already playing; never request it again.
    ar._startVideo = async () => {
      ar.video = run.video;
      ar.video.setAttribute('width', ar.video.videoWidth);
      ar.video.setAttribute('height', ar.video.videoHeight);
    };
    const resize = ar.resize.bind(ar);
    ar.resize = () => { if (ar.controller && ar.video?.videoWidth) resize(); };
    ar.renderer.domElement.style.zIndex = '1';
    ar.renderer.domElement.style.touchAction = 'none';
    ar.cssRenderer.domElement.style.zIndex = '2';
    ar.cssRenderer.domElement.style.pointerEvents = 'none';
    rendererSettings(ar.renderer); lights(ar.scene);
    const anchor = ar.addAnchor(0);
    const recharge=makeRecharge();run.recharge=recharge;run.anchor=anchor;
    anchor.group.add(recharge.group);
    run.surface=await makeARGame({anchor:anchor.group,camera:ar.camera,renderer:ar.renderer,field:$('game-field'),images:CONFIG.ingredientImages,reducedMotion});
    if(!current()){disposeRun(run);return;}
    anchor.onTargetFound = () => {
      if (!current()) return;
      run.seen = true;run.tracked=true; targetVerified=true; clearTimeout(run.hintTimer);
      $('scan-frame').hidden = true;
      $('scan-heading').textContent = 'Tu recarga comienza aquí';
      $('scan-status').textContent = 'Toca los ingredientes para recargar la batería. Tienes 15 segundos.';
      $('start-game').hidden = false;
      $('start-game').disabled=false;syncTrackingPause();
    };
    anchor.onTargetLost = () => {
      if (!current()) return;
      run.tracked=false;syncTrackingPause();$('start-game').disabled=true;
      $('scan-frame').hidden = false;
      $('scan-heading').textContent = 'Vuelve a apuntar al afiche';
      $('scan-status').textContent = 'Mantén el afiche completo a la vista para comenzar y jugar.';
    };
    await Promise.race([
      ar.start(),
      new Promise((_, reject) => { run.startTimer = setTimeout(() => reject(new Error('El reconocimiento tardó demasiado en iniciar.')), 35000); }),
    ]);
    clearTimeout(run.startTimer);
    if (!current() || run.ar !== ar) { ar.controller?.stopProcessVideo(); return; }
    $('scan-heading').textContent = run.seen ? 'Afiche reconocido' : 'Apunta al afiche';
    if (!run.seen) $('scan-status').textContent = 'Encuadra el diseño completo y mantén el teléfono quieto.';
    const began = performance.now();
    ar.renderer.setAnimationLoop(() => {
      const t = (performance.now() - began) / 1000;
      recharge.update(t,reducedMotion);
      ar.renderer.render(ar.scene, ar.camera);
    });
    run.hintTimer = setTimeout(() => {
      if (current() && !run.seen) $('scan-status').textContent = 'Acércate, evita reflejos y asegúrate de mirar el mismo afiche.';
    },18000);
  } catch (error) {
    clearTimeout(run.startTimer);
    if (ar) { ar.controller?.stopProcessVideo(); ar.renderer.setAnimationLoop(null); ar.renderer.dispose(); ar.renderer.domElement.remove(); ar.cssRenderer.domElement.remove(); ar.video = null; }
    run.ar = null;
    run.surface?.dispose();run.surface=null;run.recharge?.dispose();run.recharge=null;
    if (current()) {
      $('scan-heading').textContent = 'La cámara funciona';
      $('scan-status').textContent = `No inició el reconocimiento. ${error?.message || 'Revisa la conexión.'}`;
      $('retry-engine').hidden = false;
    }
  } finally { run.loading = false; }
}

function showProduct() {
  ++operation; disposeRun(session); screen('product');
  try {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38,innerWidth/innerHeight,.01,2000);
    const renderer = new THREE.WebGLRenderer({alpha:true,antialias:true});
    rendererSettings(renderer); renderer.setSize(innerWidth,innerHeight);
    $('product-stage').appendChild(renderer.domElement);
    product.position.set(0,0,0); product.rotation.set(0,0,0); product.scale.setScalar(1); scene.add(product); lights(scene);
    camera.position.set(0,35,Math.max(300,180/(2*Math.tan(THREE.MathUtils.degToRad(19))*camera.aspect*.82)));
    const controls = new OrbitControls(camera,renderer.domElement);
    controls.enableDamping = true; controls.enablePan = false; controls.enableZoom = false;
    controls.autoRotate = false; controls.autoRotateSpeed = .7;
    let touched=false;renderer.domElement.addEventListener('pointerdown',()=>{touched=true;controls.autoRotate=false;});
    const revealedAt=performance.now();
    viewer = {scene,camera,renderer,controls};
    renderer.setAnimationLoop(() => {const age=(performance.now()-revealedAt)/1000;const scale=reducedMotion?1:Math.min(1,.07+.93*(1-Math.pow(1-Math.min(1,age/.9),3)));product.scale.setScalar(scale);if(age>3&&!touched)controls.autoRotate=!reducedMotion;controls.update();renderer.render(scene,camera);});
  } catch (error) { stopViewer(); failure(error,'product'); }
}

function revealProduct(run,ticket) {
  screen('reveal');
  const began=performance.now();
  product.rotation.set(0,0,0);product.position.set(0,.05,.13);product.scale.setScalar(0);run.anchor.group.add(product);
  if(!reducedMotion)run.surface.reveal($('reveal-field'));
  const finish=()=>{if(ticket!==gameOperation||state!=='reveal')return;cancelAnimationFrame(revealFrame);revealFinish=null;product.removeFromParent();showProduct();};
  revealFinish=finish;
  const tick=()=>{
    if(ticket!==gameOperation||state!=='reveal')return;
    const age=performance.now()-began;
    const merge=reducedMotion?1:Math.min(1,age/1150),appear=reducedMotion?1:Math.max(0,Math.min(1,(age-1100)/650));
    run.recharge.group.position.y=-.43*(1-merge);run.recharge.group.scale.setScalar(.42*(1-appear));
    product.scale.setScalar(.0045*(1-Math.pow(1-appear,3)));
    $('reveal-line').textContent=age<1150?'Tu recarga toma forma…':'Tu próxima pausa tiene nombre: Nutrifruit';
    if(age>=(reducedMotion?1800:3200)){finish();return;}revealFrame=requestAnimationFrame(tick);
  };revealFrame=requestAnimationFrame(tick);
}

$('start').addEventListener('click',startAR);
$('close-ar').addEventListener('click',home);
$('start-game').addEventListener('click',startGame);
$('retry-engine').addEventListener('click',() => { if (session) attachTracking(session); });
$('scan-again').addEventListener('click',()=>{home();startAR();});
$('retry').addEventListener('click',()=>{home();startAR();});
addEventListener('resize',() => {
  if (!viewer) return;
  viewer.camera.aspect = innerWidth/innerHeight;
  viewer.camera.position.z = Math.max(300,180/(2*Math.tan(THREE.MathUtils.degToRad(19))*viewer.camera.aspect*.82));
  viewer.camera.updateProjectionMatrix(); viewer.renderer.setSize(innerWidth,innerHeight);
});
addEventListener('pagehide',home);
document.addEventListener('visibilitychange',() => { if (document.hidden && state === 'scan') home();else if(state==='game')syncTrackingPause(); });
$('start').disabled = false; $('start').textContent = 'Activar cámara';
$('intro-note').textContent = 'Mantén el afiche a la vista durante el juego.';

async function withTimeout(promise,ms) {let id;try{return await Promise.race([promise,new Promise((_,reject)=>{id=setTimeout(()=>reject(new Error('La conexión tardó demasiado.')),ms)})]);}finally{clearTimeout(id);}}
function syncTrackingPause() {
  if(state!=='game')return;
  const paused=!session?.tracked||document.hidden;
  $('tracking-pause').hidden=!paused;game?.setPaused(paused);
}
async function startGame() {
  const run=session;
  if(!targetVerified||state!=='scan'||!run?.tracked||!run.surface||document.hidden)return;
  const ticket=++gameOperation; ++resultVersion;
  closeRanking();stopViewer();game?.cancel();game=null;lastRound=null;
  screen('game');$('game-field').replaceChildren();$('game-score').textContent='0';$('game-timer').textContent='15';$('energy-fill').style.width='5%';$('energy-track').setAttribute('aria-valuenow','5');
  run.recharge.group.scale.setScalar(.42);run.recharge.group.position.y=-.43;run.recharge.setCharge(5);syncTrackingPause();
  $('countdown').hidden=false;$('countdown-label').textContent='PREPARANDO TU RECARGA';$('countdown-number').textContent='';$('countdown-note').textContent='Toca los ingredientes. Cada uno suma 10 puntos.';
  let cloud=null,cloudError='';
  if(ranking.configured) {
    try{cloud=await withTimeout(ranking.startRun(),12000);if(typeof cloud.run_id!=='string'||!Number.isInteger(cloud.seed)||cloud.duration_ms!==RULES.durationMs)throw new Error('La partida del ranking es inválida.');}
    catch(error){cloud=null;cloudError=error?.message||'No se pudo conectar el ranking.';}
  }
  if(ticket!==gameOperation||state!=='game')return;
  $('game-mode').textContent=cloud?'Partida para el ranking':'Partida de práctica';
  $('countdown-label').textContent='TOCA LOS INGREDIENTES';
  if(cloudError)$('countdown-note').textContent='El ranking no está disponible. Puedes jugar una partida de práctica.';
  $('countdown').hidden=true;
  const seed=cloud?.seed||Math.floor(Math.random()*2147483646)+1;
  game=playRound({surface:run.surface,timer:$('game-timer'),score:$('game-score'),energy:$('energy-fill'),progress:$('energy-track'),seed,paused:!run.tracked||document.hidden,onCharge:percent=>run.recharge.setCharge(percent),onEnd:result=>{
    if(ticket!==gameOperation)return;
    game=null;lastRound={...result,runId:cloud?.run_id||null,saved:false,cloudError};++resultVersion;
    $('final-score').textContent=String(result.score);
    $('result-line').textContent='Tu próxima pausa tiene nombre: Nutrifruit';
    $('save-form').hidden=true;$('save-score').disabled=!lastRound.runId;$('save-score').textContent='Guardar';
    $('save-status').textContent=lastRound.runId?'':ranking.configured?'Esta partida fue de práctica y no participa en el ranking.':'El ranking no está disponible por ahora. Tu resultado es de práctica.';
    $('save-status').hidden=true;
    try{$('nickname').value=cloud?.nickname||localStorage.getItem('nutrifrut-nickname')||'';}catch{$('nickname').value=cloud?.nickname||'';}
    $('nickname').readOnly=Boolean(cloud?.nickname);
    $('nickname-help').textContent=cloud?.nickname?'Este es tu nombre registrado. Guardaremos únicamente tu mejor puntaje.':'Elige tu nombre. Quedará fijo para las siguientes partidas de este navegador.';
    revealProduct(run,ticket);
  }});
  syncTrackingPause();
}

function renderRanking(data) {
  if(!data||!Array.isArray(data.entries))throw new Error('Respuesta del ranking inválida.');
  $('ranking-rows').replaceChildren();
  for(const row of data.entries){
    if(!Number.isInteger(row.position)||row.position<1||row.position>10||typeof row.nickname!=='string'||!Number.isInteger(row.score)||row.score<0||row.score>370)throw new Error('Fila del ranking inválida.');
    const tr=document.createElement('tr');if(row.is_me)tr.className='own-row';
    for(const value of [row.position,row.nickname,row.score]){const td=document.createElement('td');td.textContent=String(value);tr.appendChild(td);}
    $('ranking-rows').appendChild(tr);
  }
  $('ranking-table').hidden=data.entries.length===0;
  $('ranking-message').hidden=data.entries.length>0;
  $('ranking-message').textContent=data.entries.length?'':'Todavía no hay marcas. Guarda la primera.';
  $('my-ranking').hidden=!Number.isInteger(data.my_position);
  if(Number.isInteger(data.my_position))$('my-ranking').textContent=`Tu posición: ${data.my_position} · Mejor marca: ${data.best_score} puntos`;
}
async function loadRanking() {
  const ticket=++rankingOperation;$('refresh-ranking').disabled=true;$('ranking-message').hidden=false;$('ranking-message').textContent='Cargando ranking…';$('ranking-table').hidden=true;$('my-ranking').hidden=true;
  try{const data=await withTimeout(ranking.leaderboard(),15000);if(ticket===rankingOperation&&!$('ranking-panel').hidden)renderRanking(data);}
  catch(error){if(ticket===rankingOperation){$('ranking-message').textContent=ranking.configured?'No se pudo cargar el ranking. Vuelve a intentarlo.':'El ranking no está disponible por ahora.';}}
  finally{if(ticket===rankingOperation)$('refresh-ranking').disabled=false;}
}
function openRanking() {
  rankFocus=document.activeElement;
  $('ranking-panel').hidden=false;$('intro').inert=true;$('result-ui').inert=true;$('close-ranking').focus();loadRanking();
}
function closeRanking() {
  if($('ranking-panel').hidden)return;
  ++rankingOperation;$('ranking-panel').hidden=true;$('intro').inert=false;$('result-ui').inert=false;
  if(rankFocus?.isConnected)rankFocus.focus();rankFocus=null;
}
async function saveScore(event) {
  event.preventDefault();
  const round=lastRound,version=resultVersion;
  if(state!=='product'||!round?.runId||round.saved||$('save-score').disabled)return;
  const nickname=$('nickname').value.trim().normalize('NFC');
  if(!/^[A-Za-z0-9ÁÉÍÓÚáéíóúÑñÜü _.-]{3,18}$/.test(nickname)){$('save-status').textContent='Usa un alias de 3 a 18 caracteres: letras, números, espacios, punto, guion o guion bajo.';return;}
  $('save-score').disabled=true;$('save-score').textContent='Guardando…';$('save-status').textContent='Guardando tu mejor marca…';
  try{
    const data=await withTimeout(ranking.finishRun(round.runId,nickname,round.hits),15000);
    if(version!==resultVersion||round!==lastRound)return;
    if(data.score!==round.score||!data.saved)throw new Error('La puntuación no coincide.');
    round.saved=true;$('save-form').hidden=true;$('save-status').textContent=`Resultado guardado. Tu mejor marca es ${data.best_score} puntos.`;
    try{localStorage.setItem('nutrifrut-nickname',data.my_nickname||nickname);}catch{/* Optional preference. */}
    openRanking();++rankingOperation;renderRanking(data);$('refresh-ranking').disabled=false;
  }catch(error){if(version===resultVersion&&round===lastRound)$('save-status').textContent=error?.message||'No se pudo guardar. Puedes volver a intentarlo.';}
  finally{if(version===resultVersion&&round===lastRound){$('save-score').disabled=!round.runId;$('save-score').textContent='Guardar';}}
}
$('play-again').addEventListener('click',()=>{home();startAR();});
$('skip-reveal').addEventListener('click',()=>revealFinish?.());
$('show-score-form').addEventListener('click',()=>{$('save-form').hidden=false;$('save-status').hidden=false;$('nickname').focus();});
$('exit-game').addEventListener('click',home);
$('intro-ranking').addEventListener('click',openRanking);
$('result-ranking').addEventListener('click',openRanking);
$('close-ranking').addEventListener('click',closeRanking);
$('refresh-ranking').addEventListener('click',loadRanking);
$('save-form').addEventListener('submit',saveScore);
$('ranking-panel').addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();closeRanking();return;}
  if(event.key!=='Tab')return;
  const buttons=[...$('ranking-panel').querySelectorAll('button:not(:disabled)')];if(!buttons.length)return;
  const first=buttons[0],last=buttons.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
});

// Opening the QR URL requests the camera directly; retry remains available.
startAR();
