// REVELACIÓN: centro de la cámara, independiente del lateral ocupado por el afiche.
export function positionCenteredReveal(group,camera){
  camera.updateMatrixWorld();
  const projection=camera.projectionMatrix.elements;
  const distance=Math.max(1.25,.76*projection[0]/.9,.45*projection[5]/.85);
  // MindAR usa near=10 (unidades del target), frente al near pequeño del visor.
  // Alejamos y escalamos todo a la vez: evita el recorte sin reducir el efecto.
  const scale=Math.max(1,camera.near*2);
  group.scale.setScalar(scale);
  group.position.set(0,0,-distance*scale).applyMatrix4(camera.matrixWorld);
  camera.getWorldQuaternion(group.quaternion);
  group.updateMatrixWorld(true);
}
