// ENCUADRE DEL EMPAQUE: ocupa aproximadamente 75 % del ancho del visor móvil.
// La órbita es más compacta para dar protagonismo a la marca.
export function fitProductCamera(width,height,fov=38){
  const aspect=Math.max(1,width)/Math.max(1,height);
  const vertical=fov*Math.PI/360;
  const horizontal=Math.atan(Math.tan(vertical)*aspect);
  return 30+Math.max(100/(Math.tan(horizontal)*.9),70/(Math.tan(vertical)*.9));
}
