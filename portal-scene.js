import * as THREE from './vendor/three.module.js';
// Lightweight geometry stays anchored to the same poster; no downloaded models.
export function createPortalScene(){
  const group=new THREE.Group(),rings=[],sparks=[],rays=[];group.position.z=.1;
  const ringGeometry=new THREE.TorusGeometry(.55,.009,6,80),sparkGeometry=new THREE.SphereGeometry(.009,6,4),rayGeometry=new THREE.PlaneGeometry(.12,.007);
  for(let i=0;i<3;i++){
    const material=new THREE.MeshBasicMaterial({color:i===1?0xffffff:0xffe11b,transparent:true,opacity:.8,depthWrite:false});
    const ring=new THREE.Mesh(ringGeometry,material);ring.scale.setScalar(1+i*.13);ring.position.z=i*.012;group.add(ring);rings.push(ring);
  }
  for(let i=0;i<30;i++){
    const spark=new THREE.Mesh(sparkGeometry,new THREE.MeshBasicMaterial({color:i%3===0?0xffffff:i%3===1?0xffe11b:0xd71920,transparent:true,opacity:.8,depthWrite:false}));group.add(spark);sparks.push(spark);
  }
  for(let i=0;i<12;i++){
    const ray=new THREE.Mesh(rayGeometry,new THREE.MeshBasicMaterial({color:i%2?0xffe11b:0xffffff,transparent:true,opacity:.7,depthWrite:false,side:THREE.DoubleSide}));group.add(ray);rays.push(ray);
  }
  let charge=5,mode=0,began=null,reopen=true,disposed=false;
  return{group,
    open(){reopen=true;},setMode(value){mode=Math.max(0,Math.min(2,value));},setCharge(value){charge=Math.max(5,Math.min(100,value));},
    update(t,reduced=false){
      if(disposed)return;if(reopen||began===null){began=t;reopen=false;}
      const age=Math.max(0,t-began),opening=reduced?1:Math.min(1,age/1.6),pulse=reduced?0:Math.sin(t*1.8)*.012;
      group.scale.setScalar(.15+.85*(1-Math.pow(1-opening,3))+pulse+charge/100*.06);
      rings.forEach((ring,i)=>{ring.scale.setScalar((1+i*.13)*(1+(reduced?0:Math.sin(t*(.8+mode*.15)+i)*.035)));ring.rotation.set(reduced?0:Math.sin(t*.7+i)*.12,reduced?0:Math.cos(t*.8+i)*.12,0);ring.material.opacity=.25+opening*.45;});
      sparks.forEach((spark,i)=>{const angle=i*Math.PI*2/sparks.length+(reduced?0:t*(.23+mode*.08)),radius=.5+(i%4)*.047;spark.position.set(Math.cos(angle)*radius,Math.sin(angle)*radius,.04+Math.sin(angle*2)*.025);spark.scale.setScalar(.6+charge/100+(i%3)*.15);spark.material.opacity=.2+opening*.6;});
      rays.forEach((ray,i)=>{const angle=i*Math.PI*2/rays.length+(reduced?0:t*.1),radius=.72+(reduced?0:Math.sin(age*2+i)*.015);ray.position.set(Math.cos(angle)*radius,Math.sin(angle)*radius,.03);ray.rotation.z=angle;ray.scale.x=.4+charge/100*.6;ray.material.opacity=.15+opening*.35;});
    },
    dispose(){if(disposed)return;disposed=true;group.removeFromParent();ringGeometry.dispose();sparkGeometry.dispose();rayGeometry.dispose();group.traverse(node=>node.material?.dispose());},
  };
}
