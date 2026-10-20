import * as THREE from './vendor/three.module.js';
import { TARGET } from './target-layout.js?v=1';
import { FILL_MASK } from './battery-fill-mask.js';

const angle=-7.99*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
// Posición exacta del interior blanco del SVG original; no modificar al cambiar colores.
export function batteryInnerPoint(u,v){
  const x=96.38+u*430.79,y=1002.78-v*889.46;
  const sx=c*x-s*y-74.57,sy=s*x+c*y+48.77,a=TARGET.calibration;
  return [a.offsetX+a.scaleX*sx/1052.64-.5,.5-a.offsetY-a.scaleY*sy/1064.41,.004];
}
export function batteryLevelAt(point){
  const a=TARGET.calibration,sx=(point[0]+.5-a.offsetX)*1052.64/a.scaleX+74.57;
  const sy=(.5-point[1]-a.offsetY)*1064.41/a.scaleY-48.77;
  return Math.max(0,Math.min(1,(1002.78-(-s*sx+c*sy))/889.46));
}
// CARGA VISIBLE: sube desde abajo en la batería impresa, respetando el QR.
export function createBatteryCharge(color){
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([
    ...batteryInnerPoint(0,0),...batteryInnerPoint(1,0),...batteryInnerPoint(1,1),
    ...batteryInnerPoint(0,0),...batteryInnerPoint(1,1),...batteryInnerPoint(0,1)],3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,0,1,1,0,1],2));
  const packed=Uint8Array.from(atob(FILL_MASK.bits),x=>x.charCodeAt(0));
  const pixels=new Uint8Array(FILL_MASK.width*FILL_MASK.height*4);
  for(let i=0;i<pixels.length/4;i++)pixels.fill((packed[i>>3]>>(i%8)&1)?255:0,i*4,i*4+4);
  const mask=new THREE.DataTexture(pixels,FILL_MASK.width,FILL_MASK.height,THREE.RGBAFormat);
  mask.magFilter=THREE.LinearFilter;mask.minFilter=THREE.LinearFilter;mask.needsUpdate=true;
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
    uniforms:{level:{value:.05},tint:{value:new THREE.Color(color)},mask:{value:mask}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`uniform float level;uniform vec3 tint;uniform sampler2D mask;varying vec2 vUv;
      void main(){float visible=texture2D(mask,vUv).r;if(visible<.1||vUv.y>level)discard;
      float edge=1.0-smoothstep(.0,.018,level-vUv.y);
      gl_FragColor=vec4(mix(tint,vec3(1.0),edge*.65),visible*(.44+edge*.42));}`});
  const mesh=new THREE.Mesh(geometry,material);mesh.name='carga-interior-bateria';mesh.renderOrder=3;
  return {mesh,setCharge(percent){material.uniforms.level.value=Math.max(.05,Math.min(1,percent/100));},
    dispose(){mesh.removeFromParent();geometry.dispose();material.dispose();mask.dispose();}};
}
