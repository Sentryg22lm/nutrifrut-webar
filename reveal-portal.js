import * as THREE from './vendor/three.module.js';
import {createPortalScene} from './portal-stable.js?stable=2';
// PORTAL DEL CIERRE: aparece con la explosión, detrás del empaque.
export function createRevealPortal(){
  const portal=createPortalScene(),group=new THREE.Group();group.name='portal-del-empaque';group.add(portal.group);portal.group.position.z=-.25;portal.setCharge(100);portal.open();
  const materials=[];portal.group.traverse(o=>{if(o.material)materials.push(o.material);});
  return {group,
    update(age,{duration=4.5,reducedMotion=false}={}){
      const opening=Math.max(0,Math.min(1,(age-.4)/.55)),closing=Math.max(0,Math.min(1,(duration-age)/.55));
      const strength=opening*closing;
      group.visible=strength>0;portal.update(Math.max(0,age-.4),reducedMotion,false);
      group.scale.setScalar(.78+.22*strength);group.rotation.z=reducedMotion?0:age*.15;
      materials.forEach(m=>{m.opacity*=strength;});
    },
    dispose(){portal.dispose();group.removeFromParent();},
  };
}
