// Lee la paleta editable de colores.css para la batería y el portal.
// Las texturas del envase y los ingredientes conservan sus colores originales.
export function scenePalette() {
  const style = typeof globalThis.getComputedStyle === 'function' ? getComputedStyle(document.documentElement) : null;
  function color(variable, fallback) {
    const value = style?.getPropertyValue(variable).trim();
    return /^#[0-9a-f]{6}$/i.test(value || '') ? parseInt(value.slice(1),16) : fallback;
  }
  return {red:color('--nf-rojo',0xd71920),yellow:color('--nf-amarillo',0xffe11b),white:color('--nf-blanco',0xffffff),battery:color('--nf-bateria-interior',0x97131b)};
}
