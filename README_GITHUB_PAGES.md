# Nutrifruit — Escanea y recárgate

Entrega integrada: juego de 30 segundos con cámara, rayos vinculados a los aciertos, convergencia, explosión 3D, producto, tienda y ranking. `index.html` y `experiencia-3d.html` abren la misma experiencia. La demostración automática ya no es la entrada principal.

## Publicar en GitHub Pages

1. Descomprime el ZIP y sube su contenido a la raíz del repositorio conservando las carpetas `assets` y `vendor`
2. Reemplaza los archivos de la versión anterior; `index.html` debe quedar en la raíz
3. En Settings → Pages selecciona Deploy from a branch → main → /(root)
4. Abre la URL HTTPS publicada en Safari o Chrome del teléfono; no abras el HTML como archivo local
5. Permite la cámara, enfoca el afiche oficial y pulsa Iniciar juego

Esta entrega no modifica tu GitHub. No requiere instalar Node ni compilar. La base de datos existente ya está configurada: no ejecutes los SQL incluidos para actualizar esta web. La clave incluida es pública y está preparada para utilizarse desde el navegador.

## Experiencia

- La cámara solicita permiso al abrirse; queda un botón si el navegador exige tocar para activarla
- El reconocimiento utiliza un solo stream de cámara y espera a tener dimensiones y un fotograma válidos
- Aparecen descargas angulares fuera de los bordes del afiche y el contorno de su batería
- Los 30 segundos avanzan mientras se reconoce el afiche y la pestaña está visible
- Toca solo los ingredientes pendientes en la combinación; completarla da un bono y mejora el multiplicador
- Cada acierto transforma el ingrediente tocado en un ingrediente 3D del mismo tipo: entra al rayo más cercano, lo recorre hasta la batería y activa un pulso al llegar
- El puntaje cuenta al tocar; el relleno y el contorno de la batería se actualizan cuando llega el ingrediente
- Hay partículas y cereales recorriendo los rayos; los trayectos de aciertos y su carga se pausan si se pierde el afiche o se oculta la pestaña
- La lluvia acelera con los puntos; hacen falta 48 ingredientes correctos para llenar la batería
- Al terminar se fija la última pose válida; la cámara permanece abierta durante los 2 segundos de convergencia y los 4,5 segundos de explosión, empaque y mensaje de resultado
- La explosión nace en el punto donde converge la energía y después el empaque se acomoda al centro de pantalla
- Con movimiento reducido, el cierre usa una convergencia corta y conserva el tiempo de lectura del resultado
- El cierre muestra el producto grande en un espacio propio; la tienda y el formulario siguen debajo sin taparlo
- Adquiere Nutrifruit abre https://boliviasfruit.com/categoria-producto/frutosdeshidratados/
- Guarda tu alias y tu mejor marca; Ranking muestra hasta tres posiciones reales y Ver más abre el top 10

## Ranking existente

Supabase: `uweahpzmydezhqqpnihx`, campaña `arma-recarga-v1`. Las funciones de inicio, guardado y listado ya están instaladas. Las reglas de puntuación no cambian con las animaciones. El servidor calcula el resultado a partir de las pulsaciones y valida tiempos y repetición de ingredientes. No confía en un total enviado por el navegador.

Alias de 3 a 12 caracteres, con filtro de términos comunes en cliente y servidor. El primer alias queda fijo para la identidad anónima del navegador. Una marca inferior no sustituye la mejor. Borrar datos del navegador o cambiar de dispositivo puede crear otra identidad; no equivale a una cuenta única por persona. No se usa la IP para evitar penalizar estudiantes que compartan la red universitaria.

Si el ranking no conecta, el juego lo indica como partida de práctica y ese resultado no se guarda. Los resultados existentes no se modificaron en las verificaciones; los guardados de prueba se ejecutaron dentro de una transacción revertida.

## Editar desde Visual Studio Code

| Elemento | Archivo y comentario |
| --- | --- |
| Colores y contraste | `colores.css`, bloques de colores comentados |
| Posición, grosor y ramificaciones de los rayos | `station-scene.js`, `routes`, `jagged()` y `tube()` |
| Carga de los rayos según aciertos | `game-energy.js` |
| Origen compartido y movimiento del empaque | `energy-reveal.js`, `ENERGY_ORIGIN` y `positionEnergyReveal()` |
| Contorno de la batería | `battery-contour.js`, `haloWidth` y `coreWidth` |
| Relleno de la batería | `battery-charge.js` y `battery-fill-mask.js` |
| Franja de combinaciones | `energy-strip.css` |
| Cámara y espera de imagen | `camera.js` |
| Flujo del juego y duración del cierre | `burst-app.js`, `startGame()` y `revealProduct()` |
| Sonidos y volumen | `experience-audio.js`, `masterVolume` |
| Mensajes por porcentaje | `round-outcome.js` |
| Tamaño del producto en el CTA | `product-viewer-fit.js` y `experience-clean.css` |
| Conexión del ranking | `config-current.js` y `ranking-current.js` |

El SVG y el `.mind` del afiche se conservan. No cambies las coordenadas de `target-layout.js` sin cambiar y volver a calibrar el target. Los rayos tienen profundidad relativa al afiche; no detectan objetos reales.

## Verificación

Se comprobaron el arranque con video demorado, un solo stream, pérdida y recuperación del afiche, permisos rechazados, reintento de reconocimiento sin pedir otra cámara, cancelación durante el permiso, limpieza de GPU, partida de 30 segundos activos, sonidos, aceleración, carga real, origen proyectado de la explosión, resultado, CTA, tres posiciones y guardado sin duplicación. Se consultó el ranking real y se verificó el guardado y el alias fijo dentro de una transacción revertida.

Estas son verificaciones de código con dispositivos simulados y de las funciones reales de base de datos. La cámara, el seguimiento, el sonido y la composición final requieren validación visual en teléfonos reales; no se garantiza compatibilidad con todos los dispositivos.

## Movimiento de los aciertos

`combo-surface.js` captura la posición del toque y el tipo correcto. `game-energy.js` lo proyecta al espacio del afiche. `station-scene.js`, en `collect()` y `cargoPoint()`, selecciona el rayo cercano y anima el recorrido: entrada de 180 ms, viaje por el rayo de 1000 ms y entrada a la batería de 220 ms. Al llegar hay una onda y sube la carga visual. Los puntos y los eventos del ranking siguen contando al tocar, sin modificar las reglas del servidor. Los ingredientes incorrectos conservan su respuesta de error y no generan transporte.

El pool reutiliza 21 mallas; no crea modelos nuevos por cada toque. Se comprobaron el punto de nacimiento, las etapas del recorrido, el mismo tipo de ingrediente, la carga al llegar, las pausas, las pulsaciones rápidas y el cierre. El tamaño y los recorridos deben revisarse visualmente en teléfono.

## Rayos flexibles y portal del cierre

Los rayos ahora se ondulan en el espacio sin mover la pose del afiche. Al tocar un ingrediente correcto, el rayo cercano se estira brevemente hacia él y lo transporta. `ray-motion.js` comparte el cálculo de deformación entre las mallas y el recorrido de los ingredientes. La amplitud y las velocidades están comentadas; `station-scene.js` limita el alcance al atrapar a 0,16 unidades del target.

`reveal-portal.js` recupera el portal circular detrás del empaque durante la explosión. Aparece desde los 0,4 segundos de la revelación, permanece visible y se desvanece durante los últimos 0,55 segundos. El empaque y los ingredientes se desvanecen junto a él; al pasar al CTA se restaura la opacidad del visor del producto. El portal se elimina al salir o terminar.

Se verificaron deformación visible, extremos fijos, captura, coincidencia del recorrido con la geometría, movimiento reducido, aparición del portal, giro, desvanecimiento y restauración del producto en el CTA. Falta revisión visual en teléfono.

## Ritmo competitivo y edición de textos

La partida sigue durando 30 segundos y mantiene sus 77 ingredientes, recetas y puntos. La velocidad existente por puntaje recibe un factor por tiempo activo: 0–8 s ×1; 8–14 s ×1,025; 14–20 s ×1,05; 20–25 s ×1,08; 25–27 s ×1,12; 27–30 s ×1,15. Cada cambio se suaviza durante aproximadamente 650 ms. No se redujo la zona de toque ni se añadieron ingredientes fáciles para inflar los puntos.

El cliente y Supabase usan `balanced-v2`. La actualización `supabase/balanced-timing.sql` ya fue aplicada en el proyecto actual; no tienes que ejecutarla para publicar en GitHub Pages. Las partidas anteriores se validan con sus reglas originales y se conservan las mejores marcas. Para una instalación nueva en otro proyecto, instala `ranking-current.sql`, `alias-policy.sql` y después `balanced-timing.sql`.

Los textos actuales se conservan. Para cambiar CTA, botón, tienda, mensajes del cierre o del resultado, abre **textos.js** y busca **EDITAR TEXTOS Y CTA**. La guía **EDITAR_TEXTOS.md** incluye ejemplos y una tabla de cada propiedad. La bienvenida se encuentra en `index.html` bajo **EDITAR INICIO**.

Verificación: recorrido independiente de la tasa de cuadros y límites de cada fase; 300 simulaciones por versión con reacciones de 350/650/900 ms; diez casos de guardado real y rechazo de ingredientes vencidos en una transacción revertida; cámara, partida, sonidos, revelación y CTA/ranking. En esas simulaciones, la diferencia media fue menor de un acierto; no sustituye pruebas con estudiantes reales.
