import * as THREE from './vendor/three.module.js';
import { scenePalette } from './colores-3d.js?v=2';
export function rechargeScene() {
  // COLORES 3D: cambia la paleta en colores.css.
  const colors=scenePalette();
  const group=new THREE.Group();
  function box(w,h,d,color,x=0,y=0,z=0){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshBasicMaterial({color}));mesh.position.set(x,y,z);group.add(mesh);return mesh;}
  box(.8,.35,.04,colors.yellow);box(.73,.28,.045,colors.battery,0,0,.01);box(.07,.15,.035,colors.yellow,.435,0,0);
  const fill=box(.035,.22,.05,colors.red,-.32,0,.04);
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#'+colors.white.toString(16).padStart(6,'0');ctx.font='900 175px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('5%',256,137);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const label=new THREE.Mesh(new THREE.PlaneGeometry(.41,.205),new THREE.MeshBasicMaterial({map:texture,transparent:true}));label.position.set(.07,0,.065);group.add(label);
  const sparks=[];
  for(let i=0;i<16;i++){const spark=new THREE.Mesh(new THREE.SphereGeometry(i%3===0?.019:.009,6,4),new THREE.MeshBasicMaterial({color:i%2?colors.yellow:colors.red}));group.add(spark);sparks.push(spark);}
  group.position.z=.14;
  let charge=5;
  return {group,
    setCharge(percent){charge=percent;fill.scale.x=charge/5;fill.position.x=-.3375+.035*fill.scale.x/2;ctx.clearRect(0,0,512,256);ctx.fillText(charge+'%',256,137);texture.needsUpdate=true;},
    update(t,reduced,steady=false){fill.material.color.setHex(charge>20?colors.yellow:Math.sin(t*5)>0?colors.red:colors.red);group.rotation.z=(reduced||steady)?0:Math.sin(t*1.4)*.015;for(let i=0;i<sparks.length;i++){const a=i/sparks.length*Math.PI*2+(reduced?0:t*.45);sparks[i].position.set(Math.cos(a)*.56,Math.sin(a)*.3,.06+Math.sin(a*2)*.03);}},
    dispose(){group.removeFromParent();group.traverse(object=>{object.geometry?.dispose();object.material?.dispose();});texture.dispose();},
  };
}
