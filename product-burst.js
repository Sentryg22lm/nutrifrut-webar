import * as THREE from './vendor/three.module.js';
// Normalized around a bar about one unit wide. Real shaded meshes, no sprite cards.
export function createProductBurst({count=24,seed=5719}={}){
  const group=new THREE.Group(),entries=[],geometries=new Set(),materials=new Set();
  let rng=seed>>>0,disposed=false;
  const random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
  const material=(color,roughness=.75)=>{const m=new THREE.MeshStandardMaterial({color,roughness,metalness:0});materials.add(m);return m;};
  // INGREDIENTES 3D: tonos naturales de avena, frutos y cereal (formato 0xrrggbb).
  const oatMat=material(0xe7b76d,.9),grooveMat=material(0xb2813e),berryMat=material(0x9f1c2d,.8),berryLight=material(0xc53740,.85),cerealMat=material(0xe8b348,.95),cerealDark=material(0xba8038,.9);
  const shape=(w,h,roughness=0)=>{
    const geo=new THREE.SphereGeometry(1,w,h),pos=geo.attributes.position;
    if(roughness)for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),r=1+roughness*Math.sin(x*8+y*4)*Math.sin(z*7-y*6);pos.setXYZ(i,x*r,y*r,z*r);}
    geo.computeVertexNormals();geometries.add(geo);return geo;
  };
  const oatGeo=shape(14,10,.06),berryGeo=shape(16,12,.13),cerealGeo=shape(10,8,.1);
  const grooveGeo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-.7,0,.68),new THREE.Vector3(0,.025,1),new THREE.Vector3(.7,0,.68)]),8,.035,4,false);geometries.add(grooveGeo);
  function mesh(geometry,mat,parent,scale,x=0,y=0,z=0){const object=new THREE.Mesh(geometry,mat);object.scale.set(...scale);object.position.set(x,y,z);parent.add(object);return object;}
  for(let i=0;i<count;i++){
    const root=new THREE.Group(),kind=i%3;
    if(kind===0){
      const flake=new THREE.Group();flake.scale.set(.042,.022,.009);root.add(flake);mesh(oatGeo,oatMat,flake,[1,1,1]);mesh(grooveGeo,grooveMat,flake,[1,1,1]);
    }else if(kind===1){
      mesh(berryGeo,i%2?berryMat:berryLight,root,[.03,.025,.027]);mesh(berryGeo,berryMat,root,[.018,.017,.016],.019,-.003,-.003);
    }else{
      for(let j=0;j<5;j++){const angle=j*Math.PI*2/5;mesh(cerealGeo,j%2?cerealMat:cerealDark,root,[.018,.014,.015],Math.cos(angle)*.017,Math.sin(angle)*.012,j%2*.009);}
    }
    const angle=i*Math.PI*2/count,variation=.9+random()*.2;
    group.add(root);entries.push({root,kind,angle,radiusX:(.57+random()*.1)*variation,radiusY:.23+random()*.11,depth:.2+random()*.14,speed:.28+random()*.22,tilt:(i%2?1:-1)*(.45+random()*.35),size:.75+random()*.65,spin:[random()*2-1,random()*2-1,random()*2-1],scatter:new THREE.Vector3(Math.cos(angle)*(.69+random()*.1),Math.sin(angle)*(.32+random()*.12),(random()-.5)*.8)});
  }
  const orbit=new THREE.Vector3();
  function update(seconds,reducedMotion=false){
    if(disposed)return;const t=Math.max(0,Number.isFinite(seconds)?seconds:0),age=reducedMotion?3:t;
    for(const entry of entries){
      const {root,angle,scatter}=entry,theta=angle+(reducedMotion?0:Math.max(0,age-1.45)*entry.speed);
      orbit.set(Math.cos(theta)*entry.radiusX,Math.sin(theta)*entry.radiusY,Math.sin(theta+entry.tilt)*entry.depth);
      if(age<.65){const a=angle+(reducedMotion?0:age*7);root.position.set(Math.cos(a)*.085,Math.sin(a)*.065,Math.sin(a)*.04);}
      else if(age<1.45){const p=Math.min(1,(age-.65)/.8),ease=1-Math.pow(1-p,3);root.position.copy(scatter).multiplyScalar(ease);}
      else{const blend=Math.min(1,(age-1.45)/1.25),ease=blend*blend*(3-2*blend);root.position.copy(scatter).lerp(orbit,ease);}
      const size=entry.size*(age<.65?.1+.9*age/.65:1);root.scale.setScalar(size);
      const spinAge=reducedMotion?0:age;root.rotation.set(angle+spinAge*entry.spin[0],entry.tilt+spinAge*entry.spin[1],angle+spinAge*entry.spin[2]);
    }
  }
  update(0);
  return{group,entries,update,
    dispose(){if(disposed)return;disposed=true;group.removeFromParent();geometries.forEach(geo=>geo.dispose());materials.forEach(mat=>mat.dispose());entries.length=0;},
  };
}
