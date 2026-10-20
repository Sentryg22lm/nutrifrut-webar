import * as THREE from './vendor/three.module.js';
import {TARGET} from './target-layout.js?v=1';
import {positionCenteredReveal} from './centered-reveal.js?v=2';

// ORIGEN ÚNICO: rayos, destello y explosión usan este punto de la batería.
export const ENERGY_ORIGIN=Object.freeze([...TARGET.batteryCenter,.07]);
const world=new THREE.Vector3(),view=new THREE.Vector3();
// La explosión nace sobre el afiche. Solo después se centra el producto.
// Mantiene el tamaño aparente y respeta el near=10 de la cámara MindAR.
export function positionEnergyReveal(group,camera,anchor,age,{reducedMotion=false}={}){
  positionCenteredReveal(group,camera);
  anchor.updateWorldMatrix(true,false);
  world.fromArray(ENERGY_ORIGIN).applyMatrix4(anchor.matrixWorld);
  view.copy(world).applyMatrix4(camera.matrixWorldInverse);
  // Evita proyecciones inválidas al reiniciar o si no hay pose válida.
  if(!Number.isFinite(view.z)||view.z>=-camera.near)return;
  const ndc=world.clone().project(camera);
  const x=Math.max(0,Math.min(1,(age-1.6)/1.5));
  const settle=reducedMotion?0:x*x*(3-2*x);
  const distance=-group.position.clone().applyMatrix4(camera.matrixWorldInverse).z;
  group.position.set(ndc.x*distance/camera.projectionMatrix.elements[0]*(1-settle),ndc.y*distance/camera.projectionMatrix.elements[5]*(1-settle),-distance).applyMatrix4(camera.matrixWorld);
  group.updateMatrixWorld(true);
}
