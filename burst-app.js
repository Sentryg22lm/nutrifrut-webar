import { openCamera } from './camera.js';
import { CONFIG } from './config-current.js?rank=1';
import { ranking } from './ranking-current.js?rank=1';
import { COMBO_RULES as RULES } from './balanced-rules.js?rank=1';
import { playRound } from './balanced-play.js?rank=1';
import { nicknameError, normalizeNickname, NICKNAME_MAX } from './nickname-policy.js?v=2';
import {createPortalScene} from './portal-stable.js?stable=2';
import {createPoseStabilizer} from './pose-stabilizer.js?stable=1';
import {createProductBurst} from './product-burst.js?burst=1';
import { TARGET } from './target-layout.js?v=1';
import { fitProductCamera } from './product-viewer-fit.js?v=2';
import {positionCenteredReveal} from './centered-reveal.js?v=2';
import {createExperienceAudio} from './experience-audio.js?v=1';
import {roundOutcome} from './round-outcome.js?v=1';

const $ = id => document.getElementById(id);
let state = 'intro', operation = 0, session = null, viewer = null;
let enginePromise = null, product = null, THREE = null, MindARThree = null, OrbitControls = null, makeRecharge = null, makeARGame = null;
let targetVerified=false, game=null, gameOperation=0, lastRound=null, resultVersion=0, rankingOperation=0, rankFocus=null,previewOperation=0;
let revealFrame=0,revealFinish=null,activeBurst=null,burstOrigin=0;
const sound=createExperienceAudio();
let feedbackTimer=0,lastSoundSecond=30;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function screen(next) {
  state = next;
  $('sound-toggle').hidden=!sound.supported||!['game','reveal'].includes(next);
  $('sound-toggle').dataset.phase=next;
  if(next!=='game'&&next!=='reveal')sound.stop();
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
        import('./battery-contour.js?v=3'),
        import('./combo-surface.js?outcome=2'),
      ]);
      THREE = three; MindARThree = ar.MindARThree; OrbitControls = controls.OrbitControls; makeRecharge=scene.createBatteryContour;makeARGame=arGame.createIngredientSurface;
      product = product || await model.createPackaging();
    })().catch(error => { enginePromise = null; throw error; });
  }
  return enginePromise;
}

function rendererSettings(renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2, Math.sqrt(3000000/(innerWidth*innerHeight))));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
}
function improveProductTextures(renderer){
  const level=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  product.traverse(object=>{for(const material of (Array.isArray(object.material)?object.material:[object.material])){
    if(material?.map){material.map.anisotropy=level;material.map.needsUpdate=true;}
  }});
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
  run.revealRoot?.removeFromParent();
  run.surface?.dispose();run.recharge?.dispose();run.portal?.dispose();run.pose?.dispose();
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
  activeBurst?.dispose();activeBurst=null;
  viewer.resizeObserver?.disconnect();
  viewer.renderer.setAnimationLoop(null); viewer.controls.dispose(); viewer.renderer.dispose();
  $('product-stage').replaceChildren(); viewer = null;
}
function home() {
  clearTimeout(feedbackTimer);sound.stop();sound.setPaused(false);
  cancelAnimationFrame(revealFrame);revealFinish=null;
  activeBurst?.dispose();activeBurst=null;
  $('reveal-effects').replaceChildren();
  if(state==='reveal')product?.removeFromParent();
  renderScanState();
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
    screen('scan');renderScanState();
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
    ar = new MindARThree({ container:$('ar-stage'), imageTargetSrc:TARGET.imageTarget, maxTrack:1, filterMinCF:.001, filterBeta:10, warmupTolerance:5, missTolerance:5, uiLoading:'no', uiScanning:'no', uiError:'no' });
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
    rendererSettings(ar.renderer);ar.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5,Math.sqrt(1800000/(innerWidth*innerHeight)))); improveProductTextures(ar.renderer); lights(ar.scene);
    const anchor = ar.addAnchor(0);
    const pose=createPoseStabilizer();run.pose=pose;ar.scene.add(pose.group);run.rawAnchor=anchor;run.anchor={group:pose.group};
    anchor.onTargetUpdate=()=>pose.sample(anchor.group.matrix,anchor.visible,performance.now());
    const recharge=makeRecharge();run.recharge=recharge;
    pose.group.add(recharge.group);
    run.portal=createPortalScene();pose.group.add(run.portal.group);
    run.surface=await makeARGame({anchor:pose.group,camera:ar.camera,renderer:ar.renderer,field:$('game-field'),images:CONFIG.ingredientImages,reducedMotion,rechargePoint:[...TARGET.batteryCenter,.01]});
    if(!current()){disposeRun(run);return;}
    anchor.onTargetFound = () => {
      if (!current()) return;
      if(!run.seen){run.portal.open();run.recharge.open();}run.seen = true;run.tracked=true; targetVerified=true; clearTimeout(run.hintTimer);
      $('scan-frame').hidden = true;
      $('scan-heading').textContent = 'Tu recarga comienza aquí';
      $('scan-status').textContent = 'Arma la combinación que aparece arriba. Toca solo lo que falta. Tienes 30 segundos.';
      $('start-game').hidden = false;
      renderScanState();syncTrackingPause();
    };
    anchor.onTargetLost = () => {
      if (!current()) return;
      run.tracked=false;pose.reset();syncTrackingPause();renderScanState();
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
    renderScanState();
    const began = performance.now();
    ar.renderer.setAnimationLoop(() => {
      const t = (performance.now() - began) / 1000;
      pose.update(performance.now());
      recharge.update(t,reducedMotion,state==='game');run.portal.update(t,reducedMotion,state==='game');
      updateGameSound();
      ar.renderer.render(ar.scene, ar.camera);
    });
    run.hintTimer = setTimeout(() => {
      if (current() && !run.seen) $('scan-status').textContent = 'Acércate, evita reflejos y asegúrate de mirar el mismo afiche.';
    },18000);
  } catch (error) {
    clearTimeout(run.startTimer);
    if (ar) { ar.controller?.stopProcessVideo(); ar.renderer.setAnimationLoop(null); ar.renderer.dispose(); ar.renderer.domElement.remove(); ar.cssRenderer.domElement.remove(); ar.video = null; }
    run.ar = null;
    run.surface?.dispose();run.surface=null;run.recharge?.dispose();run.recharge=null;run.portal?.dispose();run.portal=null;run.pose?.dispose();run.pose=null;
    if (current()) {
      $('scan-heading').textContent = 'La cámara funciona';
      $('scan-status').textContent = `No inició el reconocimiento. ${error?.message || 'Revisa la conexión.'}`;
      $('retry-engine').hidden = false;
    }
  } finally { run.loading = false; }
}

function showProduct() {
  activeBurst?.group.removeFromParent();
  ++operation; disposeRun(session); screen('product');
  $('result-ui').scrollTop=0;loadRankingPreview();
  try {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38,1,.01,2000);
    const renderer = new THREE.WebGLRenderer({alpha:true,antialias:true});
    rendererSettings(renderer); improveProductTextures(renderer);
    $('product-stage').appendChild(renderer.domElement);
    product.position.set(0,0,0); product.rotation.set(0,0,0); product.scale.setScalar(1); const hero=new THREE.Group();hero.add(product);if(activeBurst){activeBurst.group.scale.set(120,170,70);activeBurst.group.position.set(0,0,0);hero.add(activeBurst.group);}scene.add(hero);lights(scene);
    // VISOR DEL PRODUCTO: mide su propio espacio, nunca la pantalla completa.
    // Se encuadra el empaque; los ingredientes orbitan más cerca de él.
    const stage=$('product-stage');
    const resize=()=>{
      const rect=stage.getBoundingClientRect();
      const width=Math.max(1,rect.width),height=Math.max(1,rect.height);
      camera.aspect=width/height;
      camera.position.set(0,0,fitProductCamera(width,height,camera.fov));
      camera.lookAt(0,0,0);camera.updateProjectionMatrix();
      renderer.setSize(width,height);
    };
    resize();
    const controls = new OrbitControls(camera,renderer.domElement);
    controls.enableDamping = true; controls.enablePan = false; controls.enableZoom = false;
    controls.autoRotate = false;
    let touched=false;renderer.domElement.addEventListener('pointerdown',()=>{touched=true;controls.autoRotate=false;});
    const revealedAt=performance.now();
    viewer = {scene,camera,renderer,controls,resize,resizeObserver:null};
    if(typeof ResizeObserver!=='undefined'){
      viewer.resizeObserver=new ResizeObserver(resize);viewer.resizeObserver.observe(stage);
    }
    renderer.setAnimationLoop(() => {const age=(performance.now()-revealedAt)/1000;const scale=reducedMotion?1:Math.min(1,.07+.93*(1-Math.pow(1-Math.min(1,age/.9),3)));product.scale.setScalar(scale);if(!touched&&!reducedMotion){hero.rotation.y=Math.sin(age*.55)*.16;hero.rotation.z=Math.sin(age*.4)*.025;}activeBurst?.update(Math.max(2.7,(performance.now()-burstOrigin)/1000),reducedMotion);controls.update();renderer.render(scene,camera);});
  } catch (error) { stopViewer();activeBurst?.dispose();activeBurst=null; failure(error,'product'); }
}

// REVELACIÓN: explosión de ingredientes y transición al producto final.
function revealProduct(run,ticket) {
  screen('reveal');sound.setPaused(document.hidden);sound.revealCharge();
  // CIERRE: el resultado ocupa los últimos dos segundos de la revelación.
  const duration=reducedMotion?2200:4500,outcomeAt=duration-2000;
  const outcome=roundOutcome(lastRound?.energy??5);
  $('outcome-title').textContent=outcome.title;$('outcome-subtitle').textContent=outcome.subtitle;
  $('reveal-outcome').hidden=true;$('reveal-line').hidden=false;
  const began=performance.now(),effects=$('reveal-effects');effects.replaceChildren();
  activeBurst?.dispose();activeBurst=createProductBurst();burstOrigin=began;
  run.recharge.setReveal(true);
  // CENTRO DE PANTALLA: la revelación deja de depender del lado de la batería.
  const root=new THREE.Group();run.revealRoot=root;run.ar.scene.add(root);
  positionCenteredReveal(root,run.ar.camera);
  activeBurst.group.position.set(0,0,0);root.add(activeBurst.group);
  product.rotation.set(0,0,-.15);product.position.set(0,0,0);product.scale.setScalar(0);root.add(product);
  run.surface.clear();
  const center=new THREE.Vector3(),rings=[];let burstSound=false,readySound=false;
  if(!reducedMotion)for(const className of ['reveal-halo','reveal-ring','reveal-ring second']){const node=document.createElement('div');node.className=className;effects.appendChild(node);rings.push(node);}
  const finish=()=>{if(ticket!==gameOperation||state!=='reveal')return;cancelAnimationFrame(revealFrame);revealFinish=null;effects.replaceChildren();product.removeFromParent();showProduct();};
  revealFinish=finish;
  const tick=()=>{
    if(ticket!==gameOperation||state!=='reveal')return;
    const age=performance.now()-began;
    // SONIDO DE EXPLOSIÓN: sincronizado con la expansión real a los 650 ms.
    if(!burstSound&&age>=650){burstSound=true;if(age<1450)sound.revealBurst();}
    if(!readySound&&age>=1600){readySound=true;if(age<3000)sound.revealReady();}
    const appear=reducedMotion?1:Math.max(0,Math.min(1,(age-700)/900));
    // El contorno permanece alineado al papel durante toda la revelación.
    const ease=1-Math.pow(1-appear,3);
    product.scale.setScalar(.0055*ease*(1+(reducedMotion?0:Math.sin(appear*Math.PI)*.08)));
    product.rotation.y=reducedMotion?0:(1-ease)*Math.PI*2;
    product.rotation.z=reducedMotion?0:-.15*(1-ease)+Math.sin(age/700)*.02;
    activeBurst.update(age/1000,reducedMotion);
    positionCenteredReveal(root,run.ar.camera);
    center.setFromMatrixPosition(root.matrixWorld).project(run.ar.camera);
    const rect=run.ar.renderer.domElement.getBoundingClientRect(),x=rect.left+(center.x+1)*rect.width/2,y=rect.top+(1-center.y)*rect.height/2;
    const visible=Number.isFinite(x)&&Number.isFinite(y)&&Math.abs(center.z)<1;
    for(const node of rings){node.style.left=x+'px';node.style.top=y+'px';node.hidden=!visible;}
    $('reveal-line').textContent=age<700?'Tu recarga toma forma…':'Tu próxima pausa empieza aquí.';
    $('reveal-outcome').hidden=age<outcomeAt;$('reveal-line').hidden=age>=outcomeAt;
    if(age>=duration){finish();return;}revealFrame=requestAnimationFrame(tick);
  };revealFrame=requestAnimationFrame(tick);
}

$('start').addEventListener('click',startAR);
$('close-ar').addEventListener('click',home);
$('start-game').addEventListener('click',startGame);
$('retry-engine').addEventListener('click',() => { if (session) attachTracking(session); });
$('scan-again').addEventListener('click',()=>{home();startAR();});
$('retry').addEventListener('click',()=>{home();startAR();});
addEventListener('resize',()=>viewer?.resize());
addEventListener('pagehide',home);
document.addEventListener('visibilitychange',() => { sound.setPaused(document.hidden||(state==='game'&&!session?.tracked));if (document.hidden && state === 'scan') home();else if(state==='game')syncTrackingPause(); });
$('start').disabled = false; $('start').textContent = 'Activar cámara';
$('intro-note').textContent = 'Mantén el afiche a la vista durante el juego.';

async function withTimeout(promise,ms) {let id;try{return await Promise.race([promise,new Promise((_,reject)=>{id=setTimeout(()=>reject(new Error('La conexión tardó demasiado.')),ms)})]);}finally{clearTimeout(id);}}
function syncTrackingPause() {
  if(state!=='game')return;
  const paused=!session?.tracked||document.hidden;
  $('tracking-pause').hidden=!paused;game?.setPaused(paused);sound.setPaused(paused);
}
// JUEGO: conecta la partida al ranking antes de iniciar los 30 segundos.
async function startGame() {
  const run=session;
  if(!targetVerified||state!=='scan'||!run?.tracked||!run.surface||document.hidden)return;
  void sound.unlock();sound.setPaused(false);lastSoundSecond=30;clearTimeout(feedbackTimer);
  const ticket=++gameOperation; ++resultVersion;
  closeRanking();stopViewer();game?.cancel();game=null;lastRound=null;
  $('game-ui').classList.remove('final-phase');$('combo-feedback').hidden=true;$('combo-feedback').textContent='';screen('game');$('game-field').replaceChildren();$('game-score').textContent='0';$('game-timer').textContent=String(RULES.durationMs/1000);$('energy-fill').style.width='5%';$('energy-track').setAttribute('aria-valuenow','5');
  run.recharge.setReveal(false);run.recharge.setCharge(5);syncTrackingPause();
  $('countdown').hidden=false;$('countdown-label').textContent='PREPARANDO TU RECARGA';$('countdown-number').textContent='';$('countdown-note').textContent='Toca los ingredientes. Completa combinaciones para ganar bonos.';
  let cloud=null,cloudError='';
  if(ranking.configured) {
    try{cloud=await withTimeout(ranking.startRun(),12000);if(typeof cloud.run_id!=='string'||!Number.isInteger(cloud.seed)||(cloud.duration_ms!==RULES.durationMs||cloud.rules_version!==RULES.version))throw new Error('La partida del ranking es inválida.');}
    catch(error){cloud=null;cloudError=error?.message||'No se pudo conectar el ranking.';}
  }
  if(ticket!==gameOperation||state!=='game')return;
  $('game-mode').textContent=cloud?'':'Partida de práctica';$('game-mode').hidden=Boolean(cloud);
  $('countdown-label').textContent='TOCA LOS INGREDIENTES';
  if(cloudError)$('countdown-note').textContent='El ranking no está disponible. Puedes jugar una partida de práctica.';
  $('countdown').hidden=true;sound.start();
  const seed=cloud?.seed||Math.floor(Math.random()*2147483646)+1;
  game=playRound({surface:run.surface,timer:$('game-timer'),score:$('game-score'),energy:$('energy-fill'),progress:$('energy-track'),seed,paused:!run.tracked||document.hidden,onCharge:percent=>{run.recharge.setCharge(percent);run.portal.setCharge(percent);},onMission:renderMission,onFeedback:showComboFeedback,onEnd:result=>{
    if(ticket!==gameOperation)return;
    game=null;lastRound={...result,runId:cloud?.run_id||null,saved:false,cloudError};++resultVersion;
    // RESULTADO: pide el alias automáticamente; no hace falta pulsar otro botón.
    $('show-score-form').hidden=true;$('show-score-form').disabled=false;
    $('final-score').textContent=String(result.score);$('combo-result').textContent=`${result.completed} recargas completadas · mejor racha: ${result.bestStreak}`;
    $('result-line').textContent='Tu próxima pausa empieza aquí.';
    $('save-form').hidden=!lastRound.runId;$('save-score').disabled=!lastRound.runId;$('save-score').textContent='Guardar y competir';
    $('save-status').textContent=lastRound.runId?'':ranking.configured?'Esta partida fue de práctica y no participa en el ranking.':'El ranking no está disponible por ahora. Tu resultado es de práctica.';
    $('save-status').hidden=false;
    try{$('nickname').value=cloud?.nickname||localStorage.getItem('nutrifrut-nickname')||'';}catch{$('nickname').value=cloud?.nickname||'';}
    $('nickname').readOnly=Boolean(cloud?.nickname);
    if(!cloud?.nickname&&nicknameError($('nickname').value))$('nickname').value='';
    $('nickname-help').textContent=cloud?.nickname?'Tu alias está registrado. Guardaremos tu mejor marca.':'3–12 caracteres. Tu alias quedará fijo y será público.';
    updateNicknameCounter();
    revealProduct(run,ticket);
  }});
  syncTrackingPause();
}

// INICIO DIRECTO: solo requiere reconocer el afiche; no hay selección de situación.
function renderScanState(){
  $('start-game').disabled=!session?.tracked;
  if(session?.tracked){
    $('scan-heading').textContent='¡Afiche reconocido!';
    $('scan-status').textContent='Toca los ingredientes que faltan y completa recargas en 30 segundos.';
  }
}
function renderMission(mission){
  $('combo-number').textContent='Recarga '+(mission.completed+1);
  $('combo-multiplier').textContent='×'+mission.multiplier;
  $('combo-count').textContent=mission.completed+' completadas';
  $('game-ui').classList.toggle('final-phase',mission.finalPhase);
  mission.needed.forEach((needed,i)=>{
    const card=$('need-'+i),remaining=Math.max(0,needed-mission.filled[i]);
    card.classList.toggle('need-done',remaining===0);card.hidden=needed===0;
    $('need-count-'+i).textContent=remaining===0?'Listo':'×'+remaining;
    card.setAttribute('aria-label',(['Avena','Frutos rojos','Cereal'][i])+': '+(remaining===0?'completo':remaining+' por recoger'));
  });
}
// COMBOS: confirmaciones breves, sin mensajes permanentes sobre la cámara.
function showComboFeedback(result){
  if(result.phaseStarted){showFeedback('Últimos 5 s','time',1000);return;}
  if(!result.correct){sound.miss();clearTimeout(feedbackTimer);$('combo-feedback').hidden=true;return;}
  if(result.completed){
    sound.combo();showFeedback(`Recarga completa · +${result.bonus}`,'complete',1050);
    const strip=$('mission-card');
    if(strip.animate&&!reducedMotion)strip.animate([{opacity:.72},{opacity:1}],{duration:280});
  }else sound.collect(result.multiplier);
}
function showFeedback(text,kind,duration){
  clearTimeout(feedbackTimer);const node=$('combo-feedback');
  node.textContent=text;node.dataset.kind=kind;node.hidden=false;
  feedbackTimer=setTimeout(()=>{node.hidden=true;},duration);
}
// AVISO SONORO: una señal por segundo al final; se detiene en las pausas.
function updateGameSound(){
  if(state!=='game'||!session?.tracked||document.hidden||!$('countdown').hidden)return;
  const second=Number($('game-timer').textContent);
  if(second===lastSoundSecond)return;lastSoundSecond=second;
  if(second>0&&second<=5)sound.countdown();
}
function updateSoundButton(){
  $('sound-toggle').setAttribute('aria-pressed',String(!sound.muted));
  $('sound-toggle').title=sound.muted?'Activar sonido':'Silenciar sonido';
}
$('sound-toggle').addEventListener('click',()=>{sound.toggle();updateSoundButton();});
updateSoundButton();
// TOP 10: textos y filas. Los colores del podio están en colores.css.
function renderRanking(data) {
  renderRankingPreview(data);
  if(!data||!Array.isArray(data.entries))throw new Error('Respuesta del ranking inválida.');
  $('ranking-rows').replaceChildren();
  for(const row of data.entries){
    if(!Number.isInteger(row.position)||row.position<1||row.position>10||typeof row.nickname!=='string'||!Number.isInteger(row.score)||row.score<0||row.score>RULES.maxScore)throw new Error('Fila del ranking inválida.');
    const tr=document.createElement('tr');tr.className=[row.is_me?'own-row':'',row.position<=3?'podium podium-'+row.position:''].filter(Boolean).join(' ');
    for(const value of [row.position,row.nickname,row.score]){const td=document.createElement('td');td.textContent=String(value);tr.appendChild(td);}
    $('ranking-rows').appendChild(tr);
  }
  $('ranking-table').hidden=data.entries.length===0;
  $('ranking-message').hidden=data.entries.length>0;
  $('ranking-message').textContent=data.entries.length?'':'Todavía no hay marcas. Guarda la primera.';
  $('my-ranking').hidden=!Number.isInteger(data.my_position);
  if(Number.isInteger(data.my_position))$('my-ranking').textContent=`Tu posición: ${data.my_position} · Mejor marca: ${data.best_score} puntos`;
}
// RANKING EN EL CIERRE: tres puestos reales. «Ver más» abre los diez.
function renderRankingPreview(data){
  if(!data||!Array.isArray(data.entries))throw new Error('Respuesta del ranking inválida.');
  const entries=[...data.entries].sort((a,b)=>a.position-b.position);
  for(const row of entries){
    if(!Number.isInteger(row.position)||row.position<1||row.position>10||typeof row.nickname!=='string'||!Number.isInteger(row.score)||row.score<0||row.score>RULES.maxScore)throw new Error('Fila del ranking inválida.');
  }
  const list=$('ranking-preview-rows');list.replaceChildren();
  for(const row of entries.slice(0,3)){
    const li=document.createElement('li');li.className=row.is_me?'preview-row own-row':'preview-row';
    const place=document.createElement('span');place.className='preview-position';place.textContent=String(row.position);
    const name=document.createElement('span');name.className='preview-name';name.textContent=row.nickname;
    const score=document.createElement('strong');score.textContent=row.score+' pts';
    li.appendChild(place);li.appendChild(name);li.appendChild(score);list.appendChild(li);
  }
  list.hidden=entries.length===0;$('ranking-preview-status').hidden=entries.length>0;
  $('ranking-preview-status').textContent=entries.length?'':'Sé el primero en registrar tu marca.';
}
async function loadRankingPreview(){
  const ticket=++previewOperation,version=resultVersion;
  $('ranking-preview-rows').hidden=true;$('ranking-preview-status').hidden=false;
  $('ranking-preview-status').textContent='Cargando posiciones…';
  try{
    const data=await withTimeout(ranking.leaderboard(),12000);
    if(ticket===previewOperation&&version===resultVersion&&state==='product')renderRankingPreview(data);
  }catch{
    if(ticket===previewOperation&&version===resultVersion&&state==='product')$('ranking-preview-status').textContent=ranking.configured?'No se pudieron cargar las posiciones. Pulsa Ver más para reintentar.':'Ranking no disponible por ahora.';
  }
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
  if(rankFocus?.isConnected&&!rankFocus.hidden)rankFocus.focus();else if(state==='product')$('result-ranking').focus();rankFocus=null;
}
function updateNicknameCounter(){
  $('nickname-count').textContent=$('nickname').readOnly?'Alias registrado':`${$('nickname').value.length}/${NICKNAME_MAX}`;
}
// GUARDAR: valida el alias aquí y vuelve a comprobarlo en Supabase.
async function saveScore(event) {
  event.preventDefault();
  const round=lastRound,version=resultVersion;
  if(state!=='product'||!round?.runId||round.saved||$('save-score').disabled)return;
  const nickname=normalizeNickname($('nickname').value);
  const validation=$('nickname').readOnly?'':nicknameError(nickname);
  $('save-status').hidden=false;
  if(validation){$('save-status').textContent=validation;$('nickname').setAttribute('aria-invalid','true');$('nickname').focus();return;}
  $('nickname').setAttribute('aria-invalid','false');
  $('save-score').disabled=true;$('save-score').textContent='Guardando…';$('save-status').textContent='Guardando tu mejor marca…';
  try{
    const data=await withTimeout(ranking.finishRun(round.runId,nickname,round.hits),15000);
    if(version!==resultVersion||round!==lastRound)return;
    if(data.score!==round.score||!data.saved)throw new Error('La puntuación no coincide.');
    round.saved=true;$('show-score-form').hidden=true;$('save-form').hidden=true;$('save-status').textContent=`Resultado guardado. Tu mejor marca es ${data.best_score} puntos.`;
    try{localStorage.setItem('nutrifrut-nickname',data.my_nickname||nickname);}catch{/* Optional preference. */}
    ++previewOperation;
    if(!$('ranking-panel').hidden){++rankingOperation;renderRanking(data);$('refresh-ranking').disabled=false;}
    else renderRankingPreview(data);
  }catch(error){if(version===resultVersion&&round===lastRound)$('save-status').textContent=error?.message||'No se pudo guardar. Puedes volver a intentarlo.';}
  finally{if(version===resultVersion&&round===lastRound){$('save-score').disabled=!round.runId||round.saved;$('save-score').textContent='Guardar y competir';}}
}
$('nickname').addEventListener('input',()=>{updateNicknameCounter();$('nickname').setAttribute('aria-invalid','false');$('save-status').textContent='';});
$('play-again').addEventListener('click',()=>{home();startAR();});
$('skip-reveal').addEventListener('click',()=>revealFinish?.());
$('show-score-form').addEventListener('click',()=>{if(!lastRound?.runId||lastRound.saved)return;$('save-form').hidden=false;$('save-status').hidden=false;$('nickname').focus();});
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

renderScanState();
// Opening the QR URL requests the camera directly; retry remains available.
startAR();
