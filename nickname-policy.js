// NOMBRES DEL RANKING. Esta misma política se comprueba en Supabase.
// No cambies solo este archivo: sincroniza los límites y términos con nr_alias_error.
export const NICKNAME_MIN = 3;
export const NICKNAME_MAX = 12;
const FORMAT = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü][A-Za-z0-9ÁÉÍÓÚáéíóúÑñÜü_]{2,11}$/;
// Términos completos: evita bloquear nombres normales por una coincidencia parcial.
const BLOCKED = new Set(['puta','puto','putas','putos','mierda','mierdas','pendejo','pendeja','pendejos','pendejas','carajo','carajos','cabron','cabrones','cojudo','cojuda','cojudos','cojudas','verga','vergas','culero','culera','maricon','maricones','concha','fuck','fucker','shit','bitch','nazi','hitler','troll','admin','administrador','moderador','nutrifruit','nutrifrut']);
const PHRASES = ['hijodeputa','hijadeputa','putamadre','chupapija','chupaverga','heilhitler'];
const LEET = {0:'o',1:'i',3:'e',4:'a',5:'s',7:'t'};
export function normalizeNickname(value) { return String(value || '').trim().normalize('NFC'); }
export function nicknameError(value) {
  const name = normalizeNickname(value);
  if (!FORMAT.test(name)) return 'Usa de 3 a 12 caracteres. Empieza con una letra; añade letras, números o guion bajo.';
  const plain = name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const variants = [plain, plain.replace(/[013457]/g,c=>LEET[c])];
  for (const variant of variants) {
    const compact = variant.replace(/_/g,'');
    const candidates = [...variant.split('_'), compact];
    for (const candidate of [...candidates]) candidates.push(candidate.replace(/([a-z])\1+/g,'$1'));
    if (candidates.some(word=>BLOCKED.has(word.replace(/[0-9]+$/,''))) || PHRASES.some(phrase=>compact.includes(phrase)))
      return 'Ese nombre no está permitido. Elige un alias respetuoso y personal.';
  }
  return '';
}
