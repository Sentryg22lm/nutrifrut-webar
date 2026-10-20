// RESULTADO DE LA BATERÍA: usa la energía final, no el puntaje ni el ranking.
export function roundOutcome(energy){
  const percent=Number.isFinite(energy)?Math.max(0,Math.min(100,Math.floor(energy))):0;
  const complete=percent===100;
  return {percent,complete,
    title:complete?'¡Batería al 100 %!':`Tu recarga llegó al ${percent} %`,
    subtitle:complete?'Completaste tu recarga':'Supera tu marca en la próxima partida'};
}
