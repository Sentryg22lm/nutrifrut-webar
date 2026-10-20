// Misma deformación en CPU (ingredientes) y GPU (rayos). El anclaje no se mueve.
// AMPLITUD de onda: .015 + .015*carga. ALCANCE al atrapar: máximo .16.
export function deformRayPoint(point,u,t,energy,phase,grab,pull=0,reduced=false){
  if(reduced)return point;
  const w=Math.sin(Math.PI*u),amplitude=.015+.015*energy;
  point.x+=Math.sin(t*1.9+u*8+phase)*amplitude*w;
  point.y+=Math.cos(t*1.6+u*10+phase)*amplitude*w;
  point.z+=Math.sin(t*1.2+u*7+phase)*amplitude*.6*w;
  if(grab&&pull>0){const reach=Math.exp(-Math.pow((u-grab.w)/.12,2))*pull;point.x+=grab.x*reach;point.y+=grab.y*reach;point.z+=grab.z*reach;}
  return point;
}
export const RAY_MOTION_GLSL=`
uniform float t,energy,offset,still,pull;uniform vec4 grab;
vec3 bendRay(vec3 point,float u){
  float w=sin(3.141592653589793*u),amplitude=.015+.015*energy;
  vec3 drift=vec3(sin(t*1.9+u*8.0+offset),cos(t*1.6+u*10.0+offset),sin(t*1.2+u*7.0+offset)*.6)*amplitude*w;
  float d=(u-grab.w)/.12;
  return point+(drift+grab.xyz*exp(-d*d)*pull)*(1.0-still);
}`;
