export async function openCamera({ mediaDevices, createVideo, isCurrent, container }) {
  const stream = await mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
  if (!isCurrent()) {
    stream.getTracks().forEach(track => track.stop());
    throw Object.assign(new Error('Operación cancelada'), { name: 'AbortError' });
  }
  const video = createVideo();
  video.autoplay = true; video.muted = true; video.playsInline = true;
  video.setAttribute('autoplay', ''); video.setAttribute('muted', ''); video.setAttribute('playsinline', '');
  Object.assign(video.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: 'cover', zIndex: '0' });
  container.appendChild(video);
  video.srcObject = stream;
  let timeout;
  try {
    await Promise.race([
      video.play(),
      new Promise((_, reject) => { timeout = setTimeout(() => reject(Object.assign(new Error('La cámara no entregó imagen a tiempo.'), { name: 'CameraTimeoutError' })), 15000); }),
    ]);
    if (!isCurrent()) throw Object.assign(new Error('Operación cancelada'), { name: 'AbortError' });
    return { video, stream };
  } catch (error) {
    stream.getTracks().forEach(track => track.stop());
    video.remove();
    throw error;
  } finally { clearTimeout(timeout); }
}
