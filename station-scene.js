import * as THREE from './vendor/three.module.js';
import {scenePalette} from './colores-3d.js?v=2';
import {stationFrame} from './station-timeline.js';
import {ENERGY_ORIGIN} from './energy-reveal.js?v=1';
import {createProductBurst} from './product-burst.js?burst=1';
import {deformRayPoint,RAY_MOTION_GLSL} from './ray-motion.js?v=1';

// ENERGÍA FUERA DEL AFICHE. Coordenadas relativas al target de una unidad.
// ANCHO: puntos de routes. GROSOR: tube(). COLORES: colores.css.
// El centro queda libre; solo las estelas de recarga llegan a la batería.
export function createStationScene({lowPower=false}={}){
  const palette=scenePalette(),group=new THREE.Group();group.name='energia-fuera-del-afiche';
  const geometries=new Set(),materials=new Set(),paths=[],halos=[];
  let disposed=false,clock=0,impactAt=-100,arrivalCount=0,motionTime=0,motionEnergy=0,motionReduced=false;
  const geo=g=>(geometries.add(g),g);
  const core=new THREE.MeshBasicMaterial({color:palette.white,toneMapped:false});materials.add(core);
  const yellow=new THREE.MeshBasicMaterial({color:palette.yellow,toneMapped:false});materials.add(yellow);
  const red=new THREE.MeshBasicMaterial({color:palette.red,toneMapped:false});materials.add(red);
  const v=a=>new THREE.Vector3(...a),center=v(ENERGY_ORIGIN);
  const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
  // Trayectos asimétricos; el QR queda dentro del espacio libre.
  const routes=[
    [[-.46,.29,.025],[-.57,.32,.04],[-.66,.48,.09],[-.76,.37,.18],[-.71,.08,.23],[-.80,-.12,.13],[-.65,-.40,.05],[-.54,-.54,.02]],
    [[-.29,.49,.025],[-.37,.59,.02],[-.19,.68,.08],[.07,.61,.12],[.30,.70,.03],[.54,.59,-.04],[.65,.41,.02]],
    [[.04,-.43,.03],[.15,-.57,.03],[.45,-.61,.10],[.67,-.45,.20],[.76,-.20,.27],[.64,.03,.19],[.73,.27,.07],[.60,.49,-.02]],
    [[-.47,-.20,.03],[-.57,-.11,.06],[-.60,.12,.15],[-.70,.19,.25],[-.76,.38,.10]],
    [[-.11,.49,.02],[-.02,.56,.07],[.19,.59,.18],[.35,.66,.29],[.59,.57,.15]],
    [[-.27,-.49,.02],[-.37,-.61,.10],[-.08,-.67,.17],[.16,-.59,.24],[.41,-.67,.11],[.61,-.51,.05]],
  ];
  // Un material por camino controla su aparición, pulso y desvanecimiento.
  function energyMaterial(color,{glow=false,offset=0}={}){
    const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:glow?THREE.AdditiveBlending:THREE.NormalBlending,toneMapped:false,
      uniforms:{t:{value:0},opening:{value:0},energy:{value:0},fade:{value:1},color:{value:new THREE.Color(color)},offset:{value:offset},still:{value:0},gather:{value:0},origin:{value:center.clone()},packets:{value:new THREE.Vector4(-10,-10,-10,-10)},hit:{value:0},grab:{value:new THREE.Vector4()},pull:{value:0}},
      vertexShader:`${RAY_MOTION_GLSL} varying vec2 p;uniform float gather;uniform vec3 origin;void main(){p=uv;vec3 local=mix(bendRay(position,uv.x),origin,gather);gl_Position=projectionMatrix*modelViewMatrix*vec4(local,1.0);}`,
      fragmentShader:`varying vec2 p;uniform float t,opening,energy,fade,offset,still;uniform vec3 color;uniform vec4 packets;uniform float hit;
      void main(){float mask=1.0-smoothstep(opening-.025,opening+.015,p.x);float pulse=pow(max(0.0,cos(p.x*23.0-t*4.0+offset)),12.0)*(1.0-still);float shimmer=(.5+.5*sin(t*13.0+offset))*(1.0-still);vec4 d=(vec4(p.x)-packets)/.045;vec4 peaks=exp(-d*d);float packet=min(1.0,dot(peaks,vec4(1.0)));float strength=.36+energy*.3+pulse*.24+shimmer*.1+packet*.6+hit*.12;
      gl_FragColor=vec4(color,mask*fade*strength*${glow?'.23':'1.0'});}`});materials.add(m);return m;
  }
  function tube(curve,radius,material,parent=group,segments=64,range=null){
    const geometry=geo(new THREE.TubeGeometry(curve,segments,radius,6,false));
    if(range){const uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,range[0]+uv.getX(i)*(range[1]-range[0]));}
    const o=new THREE.Mesh(geometry,material);parent.add(o);return o;
  }
  // Polilínea: las esquinas son quiebres reales, sin interpolación curva.
  class LightningPath extends THREE.Curve {
    constructor(points){super();this.points=points;}
    getPointAt(u,target=new THREE.Vector3()){return this.getPoint(u,target);}
    getTangentAt(u,target=new THREE.Vector3()){return this.getTangent(u,target);}
    getPoint(t,target=new THREE.Vector3()){
      const q=Math.max(0,Math.min(1,t))*(this.points.length-1),i=Math.min(this.points.length-2,Math.floor(q));
      return target.copy(this.points[i]).lerp(this.points[i+1],q-i);
    }
  }
  function jagged(points,seed){
    const result=[v(points[0])];
    for(let i=1;i<points.length;i++){
      const a=v(points[i-1]),b=v(points[i]),delta=b.clone().sub(a);
      const normal=new THREE.Vector3(-delta.y,delta.x,0).normalize();
      for(let j=1;j<=3;j++){
        const point=a.clone().lerp(b,j/3);
        if(j<3){const amplitude=Math.min(.047,delta.length()*.22);point.addScaledVector(normal,(j===1?1:-1)*amplitude*(.8+.2*Math.sin(i*3.7+seed)));point.z+=(j===1?1:-1)*.009;}
        result.push(point);
      }
    }
    return new LightningPath(result);
  }
  routes.forEach((points,i)=>{
    const curve=jagged(points,i),m=energyMaterial(palette.yellow,{offset:i*1.7}),glow=energyMaterial(palette.yellow,{glow:true,offset:i*1.7});
    const segments=(curve.points.length-1)*3;
    tube(curve,i<3?.007:.0035,m,group,segments);tube(curve,i<3?.021:.011,glow,group,segments);
    const white=energyMaterial(palette.white,{offset:i*1.7});tube(curve,i<3?.0028:.0015,white,group,segments);
    paths.push({curve,materials:[m,glow,white],heads:[],grab:new THREE.Vector4(),pull:0,delay:i<3?i*.23:.8+i*.12});
    if(i<3)for(let j=0;j<2;j++){
      const origin=curve.getPoint(.25+j*.37),side=i===0?-1:1;
      const branch=new LightningPath([origin,origin.clone().add(v([side*.055,.028,.012])),origin.clone().add(v([side*.034,.065,.017])),origin.clone().add(v([side*.10,.095,.026])),origin.clone().add(v([side*.082,.14,.03]))]);
      tube(branch,.004,m,group,12,[.25+j*.37,.35+j*.37]);tube(branch,.0014,white,group,12,[.25+j*.37,.35+j*.37]);
    }
  });
  function movingPoint(index,u,target=new THREE.Vector3()){
    const path=paths[index];path.curve.getPoint(u,target);
    return deformRayPoint(target,u,motionTime,motionEnergy,index*1.7,path.grab,path.pull,motionReduced);
  }
  // Ingredientes del mismo sistema 3D del cierre; solo se reutilizan sus mallas.
  const ingredients=createProductBurst({count:lowPower?9:12,seed:8271});group.add(ingredients.group);
  const ingredientPaths=ingredients.entries.map((entry,i)=>{
    const path=paths[i%3].curve,home=path.getPoint(.16+(i%4)*.19);
    home.z+=.025+(i%3)*.035;
    const end=center.clone();end.y+=((i%3)-1)*.08;
    const bend=home.clone().lerp(end,.42);bend.z+=.22;bend.y+=.12;
    return {entry,home,returning:new THREE.CatmullRomCurve3([home,bend,end]),delay:4.25+i*.53};
  });
  // ACIERTOS: pool limitado, siempre conserva el tipo de ingrediente tocado.
  // Un solo mesh por ingrediente transportado: evita multiplicar draw calls.
  const templates=createProductBurst({count:3,seed:3417}),cargo={group:new THREE.Group(),dispose(){this.group.removeFromParent();}};
  const cargoMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8});materials.add(cargoMaterial);
  const cargoGeometry=templates.entries.map(entry=>{
    entry.root.updateWorldMatrix(true,true);const inverse=entry.root.matrixWorld.clone().invert(),positions=[],normals=[],colors=[];
    entry.root.traverse(mesh=>{
      if(!mesh.isMesh)return;
      const relative=inverse.clone().multiply(mesh.matrixWorld),normalMatrix=new THREE.Matrix3().getNormalMatrix(relative),g=mesh.geometry;
      const position=g.attributes.position,normal=g.attributes.normal,color=mesh.material.color;
      for(let i=0;i<(g.index?.count??position.count);i++){
        const index=g.index?g.index.getX(i):i;
        const p=new THREE.Vector3().fromBufferAttribute(position,index).applyMatrix4(relative),n=new THREE.Vector3().fromBufferAttribute(normal,index).applyMatrix3(normalMatrix).normalize();
        positions.push(p.x,p.y,p.z);normals.push(n.x,n.y,n.z);colors.push(color.r,color.g,color.b);
      }
    });
    const merged=geo(new THREE.BufferGeometry());merged.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));merged.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));merged.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return merged;
  });templates.dispose();
  cargo.group.name='ingredientes-en-transito';group.add(cargo.group);
  // 21 lugares cubren los aciertos admitidos en los 1,4 segundos de recorrido.
  const deliveries=Array.from({length:21},(_,i)=>{
    const root=new THREE.Group();root.add(new THREE.Mesh(cargoGeometry[i%3],cargoMaterial));cargo.group.add(root);
    return {root,type:i%3,active:false,born:0,path:0,join:0,position:new THREE.Vector3(),grabOffset:new THREE.Vector3(),onArrive:null};
  });
  for(const delivery of deliveries)delivery.root.visible=false;
  const bridges=paths.slice(0,3).map(path=>{
    const end=path.curve.getPoint(0),material=new THREE.MeshBasicMaterial({color:palette.yellow,transparent:true,opacity:0,depthWrite:false,toneMapped:false});materials.add(material);
    const line=new THREE.LineCurve3(end,center);tube(line,.004,material,group,8);return material;
  });
  function deliver(item){
    item.active=false;item.root.visible=false;impactAt=clock;arrivalCount++;
    const callback=item.onArrive;item.onArrive=null;callback?.();
  }
  // El punto inicial se obtiene proyectando el toque sobre el plano del afiche.
  function collect(type,position,onArrive){
    if(disposed||!Number.isInteger(type)||type<0||type>2||!position?.isVector3)return null;
    let item=deliveries.find(d=>!d.active);
    if(!item){item=[...deliveries].sort((a,b)=>a.born-b.born)[0];deliver(item);}
    let distance=Infinity,pathIndex=0,join=.5;const sample=new THREE.Vector3();
    for(let path=0;path<3;path++)for(let j=4;j<=30;j++){
      const u=j/32;movingPoint(path,u,sample);const next=sample.distanceToSquared(position);
      if(next<distance){distance=next;pathIndex=path;join=u;}
    }
    item.root.children[0].geometry=cargoGeometry[type];
    Object.assign(item,{type,active:true,born:clock,path:pathIndex,join,onArrive,stage:'entry'});item.position.copy(position);item.grabOffset.copy(position).sub(movingPoint(pathIndex,join)).clampLength(0,.16);item.root.visible=true;item.root.position.copy(position);item.root.scale.setScalar(1.15);
    return item;
  }
  function cargoPoint(item,progress,target){
    // 180 ms para entrar, 1 s sobre el rayo y 220 ms hasta la batería.
    if(progress<.18){const join=movingPoint(item.path,item.join);return target.copy(item.position).lerp(join,Math.max(0,progress/.18));}
    if(progress<1.18)return movingPoint(item.path,item.join*(1-(progress-.18)),target);
    return target.copy(paths[item.path].curve.getPoint(0)).lerp(center,Math.min(1,(progress-1.18)/.22));
  }
  // Las estelas se dibujan solo durante el retorno de cada ingrediente.
  const tailCount=lowPower?54:96,tail=new THREE.InstancedMesh(geo(new THREE.SphereGeometry(.009,6,4)),yellow,tailCount);group.add(tail);
  const dummy=new THREE.Object3D(),point=new THREE.Vector3();
  const sparks=new THREE.InstancedMesh(geo(new THREE.OctahedronGeometry(.007)),core,lowPower?24:48);group.add(sparks);
  const ringGeometry=geo(new THREE.TorusGeometry(1,.009,5,48));
  for(let i=0;i<3;i++){
    const m=new THREE.MeshBasicMaterial({color:i===1?palette.white:palette.yellow,transparent:true,opacity:0,depthWrite:false,toneMapped:false});materials.add(m);
    const ring=new THREE.Mesh(ringGeometry,m);group.add(ring);halos.push(ring);
  }
  const nucleusMaterial=new THREE.MeshBasicMaterial({color:palette.white,transparent:true,opacity:0,depthWrite:false,toneMapped:false});materials.add(nucleusMaterial);
  const nucleus=new THREE.Mesh(geo(new THREE.SphereGeometry(1,12,8)),nucleusMaterial);group.add(nucleus);
  function update(seconds,{reducedMotion=false,live=null}={}){
    if(disposed)return;clock=seconds;const frame=live?{charge:live.charge,deploy:live.opening,converge:live.converge}:stationFrame(seconds),energy=(frame.charge-5)/95,t=reducedMotion?0:seconds;
    motionTime=t;motionEnergy=energy;motionReduced=reducedMotion;
    const gathering=live?live.revealAge!==null:seconds>=12;
    const endAge=live?(live.revealAge??0):seconds-12;
    group.visible=!gathering||endAge<2.85;const fade=1-smooth((frame.converge-.85)/.15);
    for(const path of paths)for(const m of path.materials){m.uniforms.t.value=t;m.uniforms.opening.value=reducedMotion?1:live?frame.deploy:smooth((seconds-path.delay)/2.5);m.uniforms.energy.value=energy;m.uniforms.fade.value=fade;m.uniforms.still.value=Number(reducedMotion);m.uniforms.gather.value=frame.converge;}
    paths.forEach(path=>{path.heads.length=0;path.pull=0;path.grab.set(0,0,0,0);});
    for(const item of deliveries){
      const age=seconds-item.born;
      if(item.active&&age>=0&&age<.18&&!reducedMotion){const path=paths[item.path];path.pull=Math.sin(Math.PI*age/.18);path.grab.set(item.grabOffset.x,item.grabOffset.y,item.grabOffset.z,item.join);}
    }bridges.forEach(m=>{m.opacity=0;});
    for(const item of deliveries){
      if(!item.active)continue;
      const age=(seconds-item.born)*(reducedMotion?5:1);
      if(age>=1.4){deliver(item);continue;}
      cargoPoint(item,age,item.root.position);if(gathering)item.root.position.lerp(center,frame.converge);item.stage=age<.18?'entry':age<1.18?'ray':'battery';
      item.root.scale.setScalar((1.15+.13*Math.sin(age*Math.PI))*(age>1.18?Math.max(.08,1-(age-1.18)/.22):1));
      item.root.rotation.set(reducedMotion?0:age*2+item.type,reducedMotion?0:age*3,0);
      if(item.stage==='ray')paths[item.path].heads.push(item.join*(1-(age-.18)));
      if(item.stage==='battery')bridges[item.path].opacity=.85;
    }
    const hit=Math.max(0,1-(seconds-impactAt)/.55);
    for(const path of paths)for(const m of path.materials){
      const heads=path.heads.slice(-4);while(heads.length<4)heads.push(-10);
      m.uniforms.packets.value.fromArray(heads);m.uniforms.hit.value=hit;m.uniforms.grab.value.copy(path.grab);m.uniforms.pull.value=path.pull;
    }
    const tailsPer=Math.floor(tailCount/ingredientPaths.length);
    for(let i=0;i<ingredientPaths.length;i++){
      const {entry,home,returning,delay}=ingredientPaths[i],age=seconds-delay;
      const cycle=age<0?-1:age%3.5,travel=!live&&cycle>=0&&cycle<.95,progress=travel?smooth(cycle/.95):0;
      const root=entry.root;root.visible=!gathering&&(reducedMotion||!travel||progress<.97);
      root.position.copy(home);
      if(live&&!reducedMotion){movingPoint(i%3,.18+.66*(.5+.5*Math.sin(t*.85+i*1.9)),root.position);root.position.z+=.018;}
      if(travel&&!reducedMotion)returning.getPoint(progress,root.position);
      else if(!reducedMotion){root.position.y+=Math.sin(t*1.2+i)*.02;root.position.z+=Math.cos(t*.8+i)*.015;}
      root.scale.setScalar((.9+(i%3)*.15)*frame.deploy*(1-frame.converge));
      root.rotation.set(i*.65+t*.16,i*.35+t*.23,i+t*.12);
      for(let j=0;j<tailsPer;j++){
        const f=progress-j*.045,visible=!reducedMotion&&travel&&f>0&&f<1;
        if(visible)returning.getPoint(f,point);else point.set(0,0,-10);
        dummy.position.copy(point);dummy.scale.setScalar(visible?(1-j/tailsPer)*.85:0);dummy.updateMatrix();tail.setMatrixAt(i*tailsPer+j,dummy.matrix);
      }
    }
    tail.instanceMatrix.needsUpdate=true;
    for(let i=0;i<sparks.count;i++){
      const path=paths[i%3].curve,q=1-(i/sparks.count+t*(.15+energy*.18))%1;
      movingPoint(i%3,q,point);dummy.position.copy(point);dummy.position.z+=.015;dummy.rotation.set(t+i,t*.5,0);dummy.scale.setScalar(frame.deploy*(.3+energy*.7)*fade);dummy.updateMatrix();sparks.setMatrixAt(i,dummy.matrix);
    }sparks.instanceMatrix.needsUpdate=true;
    for(let i=0;i<halos.length;i++){
      const ring=halos[i],g=smooth((endAge-i*.13)/(1.9-i*.13));
      ring.position.copy(center);ring.scale.setScalar(Math.max(.003,(.72+i*.08)*(1-g)));
      ring.material.opacity=gathering&&endAge<2?(Math.sin(g*Math.PI)*.6):0;
      if(!gathering&&hit>0){const age=seconds-impactAt;ring.scale.setScalar(.025+age*(.18+i*.045));ring.material.opacity=hit*(i===0?.65:.25);}
    }
    nucleus.position.copy(center);
    const flash=!gathering?hit*.6:endAge<2?smooth((endAge-1.25)/.75):Math.max(0,Math.min(1,1-(endAge-2.65)/.2));
    nucleus.scale.setScalar(.008+flash*.032);nucleus.material.opacity=flash;
    return frame;
  }
  update(0);
  return {group,update,collect,finishDeliveries(){deliveries.filter(d=>d.active).forEach(deliver);},get activeDeliveries(){return deliveries.filter(d=>d.active).length;},get arrivalCount(){return arrivalCount;},dispose(){if(disposed)return;disposed=true;deliveries.forEach(d=>{d.active=false;d.onArrive=null;});cargo.dispose();ingredients.dispose();tail.dispose();sparks.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());group.removeFromParent();},
    get metrics(){let meshes=0,triangles=0;group.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);}});return {meshes,triangles,materials:materials.size,geometries:geometries.size};},
  };
}
