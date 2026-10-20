import * as THREE from './vendor/three.module.js';

// Game sprites fall in screen coordinates. The reveal stays attached to the poster.
// This avoids mobile SVG texture rendering while keeping the camera and 3D scene.
export async function createIngredientSurface({anchor,camera,renderer,field,images,reducedMotion=false,rechargePoint=[0,-.43,.15]}) {
  const group=new THREE.Group();anchor.add(group);
  const nodes=new Map(),center=new THREE.Vector3(),corner=new THREE.Vector3();
  const names=['Avena','Frutos rojos','Cereal'];
  let needs=[2,1,0],collect=null,paused=true,disposed=false,revealFrame=0,revealing=false;
  function remove(id){const entry=nodes.get(id);if(!entry)return;group.remove(entry.point);entry.button.remove();nodes.delete(id);}
  function clear(){cancelAnimationFrame(revealFrame);for(const id of [...nodes.keys()])remove(id);field.replaceChildren();}
  function update(id,age){
    const entry=nodes.get(id);if(!entry)return;
    const {point,button,item}=entry;entry.age=age;
    const rect=renderer.domElement.getBoundingClientRect();
    if(!revealing){
      const width=Math.max(60,Math.min(82,rect.width*.17));
      const progress=Math.max(0,Math.min(1,age/item.lifetimeMs));
      const x=width/2+item.x*(rect.width-width)+Math.sin(progress*Math.PI*2+item.phase)*Math.min(15,width*.15)*item.sway;
      const clampedX=Math.max(width/2,Math.min(rect.width-width/2,x));
      const y=-width/2+progress*(rect.height+width);
      button.style.left=rect.left+clampedX+'px';button.style.top=rect.top+y+'px';
      button.style.width=width+'px';button.style.height=width+'px';
      button.style.opacity=String(Math.max(.25,Math.min(1,age/100,(item.lifetimeMs-age)/180)));
      button.style.transform=`translate(-50%,-50%) rotate(${reducedMotion?0:age/12*(item.sway||.1)}deg)`;
      button.hidden=paused||!anchor.visible;return;
    }
    point.position.set(item.x,item.y,.16);
    anchor.updateWorldMatrix(true,true);camera.updateMatrixWorld();
    point.getWorldPosition(center);center.project(camera);
    corner.set(.11,0,0).applyMatrix4(point.matrixWorld).project(camera);
    const width=Math.max(58,Math.min(100,Math.abs(corner.x-center.x)*rect.width));
    button.style.left=rect.left+(center.x+1)*rect.width/2+'px';button.style.top=rect.top+(1-center.y)*rect.height/2+'px';
    button.style.width=width+'px';button.style.height=width+'px';
    const fade=Math.max(.15,Math.min(1,age/150,(item.lifetimeMs-age)/250));
    button.style.opacity=String(fade);button.style.transform=`translate(-50%,-50%) scale(${.65+fade*.35}) rotate(${age/8}deg)`;
    button.hidden=paused||!anchor.visible||center.z>1||center.z< -1||!Number.isFinite(center.x)||!Number.isFinite(center.y);
  }
  const surface={
    add(item){
      const point=new THREE.Object3D();group.add(point);
      const button=document.createElement('button');button.type='button';button.className='ingredient-object ar-hit-target';button.dataset.needed=String(needs[item.type]>0);button.setAttribute('aria-label',names[item.type]+', ingrediente');
      const fallback=document.createElement('span');fallback.className='ingredient-fallback';fallback.textContent=names[item.type];button.appendChild(fallback);
      const image=document.createElement('img');image.alt='';image.draggable=false;
      image.onload=()=>{fallback.hidden=true;};image.onerror=()=>{image.hidden=true;fallback.hidden=false;};image.src=images[item.type];button.appendChild(image);
      button.addEventListener('pointerdown',event=>{if(paused||disposed||!anchor.visible)return;event.preventDefault();collect?.(item.id);});
      button.addEventListener('click',event=>{if(event.detail===0&&!paused&&!disposed&&anchor.visible)collect?.(item.id);});
      field.appendChild(button);nodes.set(item.id,{point,button,item,age:0});update(item.id,0);
    },
    update,remove,clear,
    setNeeds(value){needs=[...value];for(const entry of nodes.values())entry.button.dataset.needed=String(needs[entry.item.type]>0);},
    collect(id,feedback={correct:true,points:10}){
      const entry=nodes.get(id);if(!entry)return;
      if(!reducedMotion&&feedback.correct){
        const trail=document.createElement('img');trail.src=images[entry.item.type];trail.alt='';trail.className='ingredient-trail';trail.style.left=entry.button.style.left;trail.style.top=entry.button.style.top;field.appendChild(trail);
        // AFICHE FINAL: la estela llega a la batería impresa, no al centro de pantalla.
        anchor.updateWorldMatrix(true,true);camera.updateMatrixWorld();
        corner.set(...rechargePoint).applyMatrix4(anchor.matrixWorld).project(camera);const rect=renderer.domElement.getBoundingClientRect();
        const dx=rect.left+(corner.x+1)*rect.width/2-parseFloat(trail.style.left),dy=rect.top+(1-corner.y)*rect.height/2-parseFloat(trail.style.top);
        if(trail.animate){const animation=trail.animate([{transform:'translate(-50%,-50%) scale(1)',opacity:1},{transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.15)`,opacity:0}],{duration:430,easing:'ease-in',fill:'forwards'});animation.finished.catch(()=>{}).then(()=>trail.remove());}else trail.remove();
      }
      // ERROR SIN TEXTO: solo un destello breve en el ingrediente pulsado.
      const popup=document.createElement('span');
      popup.className=feedback.correct?'point-popup':'ingredient-miss';
      if(feedback.correct)popup.textContent='+'+feedback.points;
      else {popup.setAttribute('aria-hidden','true');popup.style.width=entry.button.style.width;popup.style.height=entry.button.style.height;}
      popup.style.left=entry.button.style.left;popup.style.top=entry.button.style.top;
      field.appendChild(popup);setTimeout(()=>popup.remove(),feedback.correct?550:240);remove(id);
    },
    setCollect(callback){collect=callback;},
    reveal(nextField){
      clear();field=nextField;paused=false;collect=null;revealing=true;
      const began=performance.now(),items=Array.from({length:12},(_,i)=>({id:1000+i,type:i%images.length,x:0,y:0,phase:i*2,lifetimeMs:1800,sway:0}));
      items.forEach(item=>surface.add(item));
      const tick=()=>{if(disposed)return;const age=performance.now()-began;if(age>=1750){clear();return;}
        const radius=.52*(1-Math.min(1,age/1600));items.forEach((item,i)=>{const angle=i*Math.PI*2/items.length+age/160;item.x=Math.cos(angle)*radius;item.y=Math.sin(angle)*radius;surface.update(item.id,age);});revealFrame=requestAnimationFrame(tick);
      };revealFrame=requestAnimationFrame(tick);
    },
    setPaused(value){paused=Boolean(value);for(const [id,entry] of nodes)update(id,entry.age);},
    dispose(){if(disposed)return;disposed=true;collect=null;clear();anchor.remove(group);},
  };
  return surface;
}
