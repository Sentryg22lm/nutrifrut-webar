import * as THREE from './vendor/three.module.js';
import { scenePalette } from './colores-3d.js?v=2';
import { BATTERY_CONTOUR, TARGET } from './target-layout.js?v=1';
import {createBatteryCharge,batteryLevelAt} from './battery-charge.js?v=1';

// RAYOS ALREDEDOR DE LA BATERÍA: el soporte permanece fijo sobre el impreso.
// COLORES: amarillo y blanco en colores.css. GROSOR: haloWidth/coreWidth.
// La geometría irregular se dibuja progresivamente; nunca sacude el anclaje.
export function createBatteryContour(){
  const group=new THREE.Group(),colors=scenePalette();
  group.name='rayos-bateria-afiche-final';
  const haloWidth=.018,coreWidth=.0055;
  const segments=[],count=BATTERY_CONTOUR.length;
  function outward(point){
    const dx=point[0]-TARGET.batteryCenter[0],dy=point[1]-TARGET.batteryCenter[1],length=Math.hypot(dx,dy);
    return [dx/length,dy/length];
  }
  // Cada tramo respeta la zona oculta por el QR y el mensaje del afiche.
  function visibleSpan(start,length){
    for(let j=0;j<=length;j++)if(!BATTERY_CONTOUR[(start+j)%count][2])return false;
    return true;
  }
  function lightningPoint(index){
    const point=BATTERY_CONTOUR[index%count],normal=outward(point);
    const zigzag=(Math.floor(index/3)%2===0?.013:.003)+.002*Math.sin(index*1.7);
    return [point[0]+normal[0]*zigzag,point[1]+normal[1]*zigzag];
  }
  for(let i=0;i<count;i+=3){
    if(!visibleSpan(i,3))continue;
    const a=lightningPoint(i),b=lightningPoint(i+3);segments.push([a,b]);
    // Ramificaciones cortas: picos de energía hacia afuera de la silueta.
    if(i%27===0&&visibleSpan((i+count-9)%count,18)){
      const [nx,ny]=outward(BATTERY_CONTOUR[i]),tx=-ny,ty=nx;
      const elbow=[a[0]+nx*.019+tx*.012,a[1]+ny*.019+ty*.012];
      const tip=[a[0]+nx*.038-tx*.004,a[1]+ny*.038-ty*.004];
      segments.push([a,elbow],[elbow,tip]);
    }
  }
  // ORDEN DE CARGA: de abajo hacia arriba, según los aciertos reales.
  segments.sort((a,b)=>(batteryLevelAt(a[0])+batteryLevelAt(a[1]))-(batteryLevelAt(b[0])+batteryLevelAt(b[1])));
  const heights=segments.map(([a,b])=>(batteryLevelAt(a)+batteryLevelAt(b))/2);
  function ribbon(width,z){
    const positions=[];
    for(const [a,b] of segments){
      const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
      const nx=-(b[1]-a[1])/length*width/2,ny=(b[0]-a[0])/length*width/2;
      positions.push(a[0]+nx,a[1]+ny,z,a[0]-nx,a[1]-ny,z,b[0]+nx,b[1]+ny,z,
        b[0]+nx,b[1]+ny,z,a[0]-nx,a[1]-ny,z,b[0]-nx,b[1]-ny,z);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));return geometry;
  }
  const haloMat=new THREE.MeshBasicMaterial({color:colors.yellow,transparent:true,opacity:.3,depthWrite:false,side:THREE.DoubleSide});
  const coreMat=new THREE.MeshBasicMaterial({color:colors.white,transparent:true,opacity:.9,depthWrite:false,side:THREE.DoubleSide});
  const halo=new THREE.Mesh(ribbon(haloWidth,.005),haloMat),core=new THREE.Mesh(ribbon(coreWidth,.006),coreMat);
  halo.renderOrder=4;core.renderOrder=5;group.add(halo,core);
  const guide=new THREE.Mesh(core.geometry,new THREE.MeshBasicMaterial({color:colors.yellow,transparent:true,opacity:.09,depthWrite:false,side:THREE.DoubleSide}));
  // La guía usa otra geometría para que su borde tenue siga completo.
  guide.geometry=core.geometry.clone();guide.renderOrder=3;group.add(guide);
  const fill=createBatteryCharge(colors.yellow);group.add(fill.mesh);
  const sparkGeometry=new THREE.SphereGeometry(.0045,6,4),sparks=[];
  for(let i=0;i<12;i++){
    const material=new THREE.MeshBasicMaterial({color:colors.yellow,transparent:true,opacity:.9,depthWrite:false});
    const spark=new THREE.Mesh(sparkGeometry,material);spark.renderOrder=6;group.add(spark);sparks.push(spark);
  }
  let charge=5,visualCharge=5,last=null,openedAt=null,reopen=true,reveal=false,disposed=false;
  return {
    group,
    open(){reopen=true;reveal=false;},
    setCharge(value){if(Number.isFinite(value))charge=Math.max(5,Math.min(100,value));},
    setReveal(value=true){reveal=Boolean(value);},
    update(t,reduced=false,playing=false){
      if(disposed)return;
      if(reopen||openedAt===null){openedAt=t;reopen=false;}
      const dt=last===null?0:Math.max(0,Math.min(.1,t-last));last=t;
      visualCharge+=(charge-visualCharge)*(1-Math.exp(-dt/.28));
      if(Math.abs(charge-visualCharge)<.04)visualCharge=charge;
      const opening=reduced?1:Math.min(1,Math.max(0,(t-openedAt)/1.1));
      const strength=visualCharge/100,boost=reveal?.12:0;
      // Pulso suave, sin destellos bruscos ni cambios de posición.
      const pulse=reduced?1:.94+.06*Math.sin(t*3);
      haloMat.opacity=opening*(.32+strength*.18+boost)*pulse;
      coreMat.opacity=opening*(.78+strength*.16)*pulse;
      const level=visualCharge/100*opening;
      const drawn=heights.filter(height=>height<=level).length*6;
      fill.setCharge(visualCharge*opening);
      halo.geometry.setDrawRange(0,drawn);core.geometry.setDrawRange(0,drawn);
      for(let i=0;i<sparks.length;i++){
        const phase=(i/sparks.length+(reduced?0:t*(playing?.075:.045)*(1+strength*.6)))%1;
        const index=Math.floor(phase*count),next=(index+1)%count;
        const a=BATTERY_CONTOUR[index],b=BATTERY_CONTOUR[next],f=phase*count-index;
        const spark=sparks[i];spark.visible=!reduced&&opening>.5&&Boolean(a[2]&&b[2])&&batteryLevelAt(a)<=level;
        const normal=outward(a);
        spark.position.set(a[0]+(b[0]-a[0])*f+normal[0]*.009,a[1]+(b[1]-a[1])*f+normal[1]*.009,.009);
        spark.material.opacity=.55+strength*.35;spark.scale.setScalar(.8+strength*.5);
      }
    },
    dispose(){if(disposed)return;disposed=true;group.removeFromParent();halo.geometry.dispose();core.geometry.dispose();sparkGeometry.dispose();haloMat.dispose();coreMat.dispose();guide.geometry.dispose();guide.material.dispose();fill.dispose();for(const spark of sparks)spark.material.dispose();},
  };
}
