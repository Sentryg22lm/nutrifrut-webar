import {TEXTOS} from './textos.js';
// RESULTADO DE LA BATERÍA: usa la energía final, no el puntaje ni el ranking.
export function roundOutcome(energy){
  const percent=Number.isFinite(energy)?Math.max(0,Math.min(100,Math.floor(energy))):0;
  const complete=percent===100;
  return {percent,complete,
    title:complete?TEXTOS.resultado.completoTitulo:TEXTOS.resultado.parcialTitulo.replace('{porcentaje}',String(percent)),
    subtitle:complete?TEXTOS.resultado.completoDetalle:TEXTOS.resultado.parcialDetalle};
}
