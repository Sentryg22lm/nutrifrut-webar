import * as THREE from './vendor/three.module.js';
// Isolate the visual pose from MindAR's raw anchor. Smooth rigid transforms,
// not matrix entries, so the poster cannot wobble by shearing or squashing.
export function createPoseStabilizer(){
  const group=new THREE.Group();group.matrixAutoUpdate=false;group.visible=false;
  const input=new THREE.Matrix4(),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();
  const targetPosition=new THREE.Vector3(),targetRotation=new THREE.Quaternion(),targetScale=new THREE.Vector3();
  const candidatePosition=new THREE.Vector3(),candidateRotation=new THREE.Quaternion(),candidateScale=new THREE.Vector3();
  const displayedPosition=new THREE.Vector3(),displayedRotation=new THREE.Quaternion(),displayedScale=new THREE.Vector3();
  let initialized=false,lastFrame=null,lastSample=null,pending=false,pendingSince=0;
  function commit(){group.matrix.compose(displayedPosition,displayedRotation,displayedScale);group.matrixWorldNeedsUpdate=true;}
  function reset(){initialized=false;lastFrame=null;lastSample=null;pending=false;group.visible=false;}
  function sample(matrix,visible=true,now=performance.now()){
    if(!visible){reset();return false;}
    if(!matrix?.elements||matrix.elements.length!==16||!matrix.elements.every(Number.isFinite))return false;
    input.copy(matrix);input.decompose(position,rotation,scale);
    if(![...position.toArray(),...rotation.toArray(),...scale.toArray()].every(Number.isFinite)||Math.min(scale.x,scale.y,scale.z)<=0)return false;
    rotation.normalize();const size=(scale.x+scale.y+scale.z)/3;scale.setScalar(size);
    if(initialized){
      const unit=Math.max(targetScale.x,1e-6),distance=position.distanceTo(targetPosition)/unit,angle=rotation.angleTo(targetRotation),scaleDelta=Math.abs(Math.log(size/targetScale.x));
      const jump=distance>.2||angle>Math.PI/5||scaleDelta>.25;
      if(jump){
        const corroborated=pending&&position.distanceTo(candidatePosition)/unit<.1&&rotation.angleTo(candidateRotation)<Math.PI/12&&Math.abs(Math.log(size/candidateScale.x))<.12;
        if(!corroborated&&(!pending||now-pendingSince<180)){
          if(!pending)pendingSince=now;pending=true;candidatePosition.copy(position);candidateRotation.copy(rotation);candidateScale.copy(scale);return false;
        }
      }
    }
    pending=false;targetPosition.copy(position);targetRotation.copy(rotation);targetScale.copy(scale);lastSample=now;group.visible=true;
    if(!initialized){initialized=true;displayedPosition.copy(position);displayedRotation.copy(rotation);displayedScale.copy(scale);lastFrame=now;commit();}
    return true;
  }
  function update(now=performance.now()){
    if(!initialized||!group.visible)return;
    const dt=Math.max(0,Math.min(.1,(now-lastFrame)/1000));lastFrame=now;
    const unit=Math.max(targetScale.x,1e-6),distance=displayedPosition.distanceTo(targetPosition)/unit,angle=displayedRotation.angleTo(targetRotation);
    const positionalMotion=Math.min(1,distance/.08),rotationalMotion=Math.min(1,angle/.15);
    const positionAlpha=1-Math.exp(-dt/(.13-.09*positionalMotion));
    const rotationAlpha=1-Math.exp(-dt/(.16-.12*rotationalMotion));
    const scaleAlpha=1-Math.exp(-dt/.15);
    displayedPosition.lerp(targetPosition,positionAlpha);displayedRotation.slerp(targetRotation,rotationAlpha);displayedScale.lerp(targetScale,scaleAlpha);commit();
  }
  return{group,sample,update,reset,dispose(){reset();group.removeFromParent();}};
}
