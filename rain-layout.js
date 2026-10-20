// ORIGEN DE LA LLUVIA: 60 % arriba, 20 % lateral izquierdo, 20 % derecho.
// Usa el azar de la partida: cada ingrediente conserva una trayectoria continua.
export function ingredientPosition(item,progress,screenWidth,screenHeight,size,reduced=false){
 const p=Math.max(0,Math.min(1,progress)),half=size/2,span=Math.max(0,screenWidth-size);
 const random=Number.isFinite(item.y)?item.y:.5;
 const mode=random<.2?'left':random>.8?'right':'top';
 const start=mode==='left'?-half:mode==='right'?screenWidth+half:half+item.x*span;
 const end=half+((item.phase/(Math.PI*2)+item.x*.618)%1)*span;
 // Las entradas laterales alcanzan el área visible durante el primer 12 %.
 const enter=Math.min(1,p/.12),inside=half+item.x*span;
 const origin=start+(inside-start)*enter;
 const diagonal=Math.min(1,p*(item.spawnMs>=20000?1:.65));
 const sway=reduced?0:Math.sin(p*Math.PI*2+item.phase)*size*.15*item.sway;
 const raw=origin+(end-inside)*diagonal+sway;
 const x=p<.12?raw:Math.max(half,Math.min(screenWidth-half,raw));
 return {x,y:-half+p*(screenHeight+size),mode};
}
