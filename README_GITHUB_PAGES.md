# Nutrifruit — Escanea y recárgate

Versión actual: lluvia libre de 35 segundos, ingredientes con puntos diferentes, combos de iguales consecutivos y ranking de récord personal. La cámara, los rayos flexibles, el transporte de ingredientes, la explosión y el portal del cierre se conservan.

## Publicar en GitHub Pages

1. Descomprime el ZIP y sube su contenido a la raíz del repositorio conservando `assets` y `vendor`
2. Reemplaza los archivos de la versión anterior; `index.html` debe quedar en la raíz
3. En Settings → Pages selecciona Deploy from a branch → main → /(root)
4. Abre la URL HTTPS en Safari o Chrome del teléfono y recarga si tenías la versión anterior abierta
5. Permite la cámara, enfoca el afiche y pulsa Iniciar juego

`index.html` y `experiencia-3d.html` abren la misma experiencia. No se necesita compilar ni instalar Node. Esta entrega no modifica tu GitHub. Supabase ya está actualizado: no ejecutes SQL para publicar esta web.

## Mecánica

La interfaz conserva el puntaje, el reloj, el logo y el indicador de carga. Se retiraron el panel rojo de recetas y sus contadores.

| Ingrediente | Puntos | Frecuencia media |
| --- | --- | --- |
| Avena | 10 | 50 % |
| Cereal | 20 | 32 % |
| Frutos rojos | 30 | 18 % |

Todos los ingredientes atrapados suman. Tres iguales consecutivos dan +10 de bono; el cuarto da +20 y el quinto y siguientes +30. Cambiar de ingrediente inicia una secuencia nueva, conservando todos los puntos anteriores. No hace falta atrapar todos los ingredientes que aparecen para mantener una secuencia: cuentan los que tocas. Un aviso breve confirma el combo; no hay un menú permanente.

La partida utiliza 59 ingredientes con posiciones, tipos y variaciones de aparición generados por semilla. Las apariciones se espacian alrededor de 580 ms, con variación aleatoria; antes eran alrededor de 380 ms. La velocidad inicial sube de ×1 a ×1,35 y alcanza hasta ×2,70 al final según el puntaje. La velocidad sube por puntaje y por tiempo activo; el refuerzo temporal llega al 15 % al final. La batería requiere 54 ingredientes atrapados para llegar al 100 %. El tamaño de los botones no se reduce. Perder el afiche o esconder la pestaña pausa el juego y los recorridos de los ingredientes.

Los puntos se cuentan al tocar. Cada ingrediente capturado aparece en 3D en la posición del toque, entra al rayo cercano y lo recorre hasta la batería. El relleno se actualiza al llegar. Los rayos se ondulan y se estiran al atrapar sin sacudir el anclaje.

## Cierre y ranking

Al acabar se fija la última pose: convergencia de 2 segundos, explosión desde ese punto y revelación del producto. El portal circular aparece detrás del empaque y ambos se desvanecen antes del CTA. El resultado usa el porcentaje real de batería. Después aparece el producto grande, la tienda online y el ranking.

El primer resultado pide un alias de 3 a 12 caracteres. Tras registrarlo, las partidas siguientes se guardan automáticamente al llegar al cierre. Si falla la conexión, el formulario permite reintentar.

El ranking conserva **el mayor puntaje registrado**. Ejemplo: 200 → 500 → 300 conserva 500. Una partida inferior o empatada no baja el récord ni cambia la fecha en que se logró. También se recuperan máximos históricos que todavía estén en las partidas guardadas. Se mantiene una sola fila por identidad y un alias fijo. El resumen muestra hasta tres posiciones reales; Ver más abre diez.

La identidad anónima se conserva en ese navegador. Borrar sus datos o usar otro dispositivo puede crear otra identidad; no equivale a una cuenta verificada por persona. La IP no se usa como identificador.

Supabase valida semilla, tiempo, ingredientes, puntuación, combos, duplicados y velocidad. La web envía los toques, no un total arbitrario. Si no se pudo iniciar una partida de ranking, la web la marca como práctica y no guarda su resultado. Las partidas previas conservan sus reglas de validación y no se borraron los registros existentes.

## Cambiar textos y aspecto

- **CTA y mensajes:** `textos.js`, comentario `EDITAR TEXTOS Y CTA`
- **Guía con ejemplos:** `EDITAR_TEXTOS.md`
- **Bienvenida:** `index.html`, comentario `EDITAR INICIO`
- **Colores:** `colores.css`
- **Interfaz despejada y aviso breve de combo:** `rain-ui.css`
- **Puntos, probabilidades y dificultad:** `rain-rules.js`; estos valores deben coincidir con Supabase
- **Partida, pausas y pulsaciones:** `rain-play.js`
- **Guardado automático y pantallas:** `burst-app.js`
- **Movimiento de los rayos:** `ray-motion.js` y `station-scene.js`
- **Transporte y carga al llegar:** `game-energy.js`
- **Portal del cierre:** `reveal-portal.js`
- **Volumen y efectos:** `experience-audio.js`

Los archivos del target oficial se mantienen. No cambies las coordenadas de `target-layout.js` sin sustituir y recalibrar el target. El efecto tiene profundidad relativa al afiche; no reconoce objetos reales alrededor.

## Base de datos

Proyecto: `uweahpzmydezhqqpnihx`, campaña `arma-recarga-v1`, reglas nuevas `rain-v4`. Para una instalación nueva en otro proyecto, los scripts de referencia se aplican en este orden: `ranking-current.sql`, `alias-policy.sql`, `balanced-timing.sql`, `free-rain.sql`, `record-rain-35.sql`. En el proyecto actual ya están aplicados.

La tabla `best_scores` y el campo de API `best_score` contienen el récord. `last_score` se conserva como alias de compatibilidad para clientes anteriores. Las tablas siguen privadas con acceso directo bloqueado; las funciones validan la identidad. Solo hay una clave pública publishable en el navegador.

## Verificación

Se verificaron puntos y probabilidades, bonos consecutivos y sus límites, cambio de ingrediente, carga, pausas, duración, origen del transporte y de la explosión, portal, CTA y guardado. El servidor pasó doce partidas completas con distintas estrategias, pruebas de versiones anteriores y la secuencia real 200 → 500 → 300 conservando 500. Esas pruebas se revirtieron y no dejaron marcas.

También se comprobaron el primer alias, el guardado automático, el reintento tras fallo de red y la prevención de doble envío. Son pruebas de código con dispositivos simulados y funciones reales de base de datos; falta validar visualmente esta nueva interfaz y su equilibrio con estudiantes en teléfonos reales.

## Equilibrio de 35 segundos

Se mantiene el valor de ingredientes y los combos. Hay 59 ingredientes en total y se requieren 54 para llenar la batería: aproximadamente el 92 % de la lluvia. Antes se ofrecían 77 en 30 segundos. El máximo por puntaje pasa de ×2,05 a ×2,35; con el refuerzo temporal llega a ×2,70. Las pausas no consumen segundos. Las señales finales aparecen en los últimos cinco segundos.

`rain-timing.js` contiene los tramos de tiempo de los 35 segundos, que coinciden con la función `nr_travel_v4` del servidor. La actualización ya está aplicada en Supabase; no hace falta ejecutar SQL al subir el ZIP a GitHub Pages.

### Ajuste de lluvia desde el segundo 20
- `rain-timing.js`: multiplicadores por tiempo (20 s: 1.20; 27 s: 1.30; 30 s: 1.38; 32 s: 1.45). La aceleración se suaviza durante 650 ms.
- `rain-layout.js`: entrada superior o lateral y trayectorias diagonales; se mantienen 59 ingredientes en 35 segundos.
- En una instalación nueva, ejecutar también `supabase/rain-surge-20.sql` después de `record-rain-35.sql`. En este proyecto Supabase ya está actualizado. Conserva el récord personal y las partidas anteriores.
