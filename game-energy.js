import * as THREE from './vendor/three.module.js';
import {createStationScene} from './station-scene.js?v=6';
// ACIERTO → RAYO → BATERÍA: puntaje inmediato, carga visual al llegar.
export function createGameEnergy({lowPower=false}={}){
  const scene=createStationScene({lowPower});
  const inverse=new THREE.Matrix4(),ray=new THREE.Ray(),plane=new THREE.Plane(new THREE.Vector3(0,0,1),-.12),local=new THREE.Vector3();
  let began=null,reopen=true,target=5,charge=5,visual=5,last=null,revealAge=null,elapsed=0,assignment=null,engaged=false;
  const api={group:scene.group,
    open(){reopen=true;revealAge=null;engaged=false;},
    collect({type,x,y,camera,renderer,anchor}){
      if(revealAge!==null||!camera||!renderer||!anchor)return false;
      camera.updateMatrixWorld();anchor.updateWorldMatrix(true,false);
      const rect=renderer.domElement.getBoundingClientRect();
      const point=new THREE.Vector3((x-rect.left)/Math.max(1,rect.width)*2-1,1-(y-rect.top)/Math.max(1,rect.height)*2,.5).unproject(camera);
      camera.getWorldPosition(ray.origin);ray.direction.copy(point).sub(ray.origin).normalize();
      inverse.copy(anchor.matrixWorld).invert();ray.applyMatrix4(inverse);
      if(!ray.intersectPlane(plane,local)||!local.toArray().every(Number.isFinite))return false;
      const flight=scene.collect(type,local.clone(),()=>{charge=Math.max(charge,flight?.charge??target);});
      if(!flight)return false;flight.charge=null;assignment=flight;engaged=true;return true;
    },
    setCharge(value){
      if(!Number.isFinite(value))return;target=Math.max(5,Math.min(100,value));
      if(assignment){assignment.charge=target;assignment=null;}
      else if(!scene.activeDeliveries)charge=target;
    },
    setRevealAge(seconds){if(seconds>=2){scene.finishDeliveries();charge=target;assignment=null;}revealAge=Math.max(0,seconds);},
    update(t,reducedMotion=false,running=true){
      const dt=last===null?0:Math.max(0,Math.min(.1,t-last));last=t;
      if(!running)return;
      if(began===null||reopen){began=t;reopen=false;}
      elapsed+=dt;visual+=(charge-visual)*(1-Math.exp(-dt/.14));
      const x=revealAge===null?0:Math.min(1,revealAge/2),g=x*x*(3-2*x);
      scene.update(elapsed,{reducedMotion,live:{charge:visual,opening:reducedMotion||engaged?1:Math.min(1,(t-began)/2.5),converge:g,revealAge}});
    },
    get deliveredCharge(){return charge;},
    get activeDeliveries(){return scene.activeDeliveries;},
    dispose:()=>scene.dispose(),
  };
  return api;
}
