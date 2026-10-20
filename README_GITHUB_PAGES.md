# Nutrifruit · Escanea y recárgate

Versión actual: Arma tu recarga, 30 segundos, cámara abierta y ranking conectado al proyecto webAR de Supabase (`uweahpzmydezhqqpnihx`). Anonymous Sign-Ins ya está activado. La configuración y las funciones de esta versión ya están instaladas: no necesitas añadir claves ni ejecutar SQL.

## Publicar en GitHub Pages

1. Descomprime el ZIP de entrega.
2. Sube su contenido a la raíz de tu repositorio, conservando las carpetas `assets` y `vendor`. Reemplaza los archivos de la versión anterior. Debe quedar `index.html` en la raíz, no dentro de otra carpeta.
3. En Settings → Pages selecciona Deploy from a branch → main → /(root), guarda y espera a que termine la publicación.
4. Abre la URL HTTPS de GitHub Pages en el teléfono. No abras el HTML como archivo local. Si aparece una versión anterior, recarga la página.
5. Acepta la cámara, enfoca el afiche y pulsa Iniciar juego. No hay selección previa de situaciones. Al terminar, el formulario aparece automáticamente. Escribe tu alias y pulsa Guardar y competir. Se actualizará el ranking resumido de tres puestos. Pulsa Ver más para abrir el top 10. Repite desde otro teléfono para verificar el ranking compartido.

El ZIP contiene la versión actual como `index.html`. `experiencia-3d.html` ofrece la misma experiencia. Las rutas son relativas y funcionan dentro de un repositorio de GitHub Pages. `.nojekyll` evita el procesamiento de archivos. No requiere compilar, instalar Node ni alojar un servidor propio. Esta entrega no modifica tu repositorio de GitHub.

## Mecánica y cierre

La web solicita la cámara al abrirse; si el navegador exige un toque, queda el botón Activar cámara. Reconoce el afiche definitivo, muestra el portal 3D y rayos de energía gruesos alineados con la batería impresa. Durante el juego, el interior se llena de amarillo desde abajo y se va encendiendo el borde según los aciertos. La máscara conserva visibles el CTA y el QR del impreso. Un único botón Iniciar juego permite comenzar directamente. Completa las combinaciones que aparecen durante 30 segundos activos. Los ingredientes caen aleatoriamente por la pantalla; solo suman los que faltan en la combinación. Los errores reinician la racha. Las combinaciones dan un bono y las rachas suben el multiplicador.

La lluvia acelera gradualmente según el puntaje, hasta 2,05 veces la velocidad inicial. La batería necesita 48 ingredientes correctos para llegar al 100 %. Perder el afiche o cambiar de pestaña pausa el juego sin consumir tiempo.

Al terminar, el empaque aparece con una explosión de ingredientes 3D que quedan orbitando. La revelación aparece en el centro de la pantalla con la cámara abierta, independientemente de dónde esté la batería del afiche. En el cierre, el producto tiene un visor propio más grande entre el título y los controles. El encuadre prioriza la barra y compacta las órbitas. El empaque oscila suavemente mostrando el frente; el usuario puede girarlo con el dedo. Los botones y el formulario siguen debajo, dentro de una página desplazable; no se superponen al 3D. El botón Adquiere Nutrifruit abre https://boliviasfruit.com/categoria-producto/frutosdeshidratados/ . El formulario de nombre aparece automáticamente. Debajo se muestran hasta tres puestos reales en una sección Ranking con cabecera amarilla. Ver más abre la lista completa de diez. Guardar actualiza el resumen sin abrir una pantalla que tape el empaque. La compra sigue siendo el botón principal. No se utiliza sampling.

La paleta es blanco, rojo y amarillo. La tipografía Nunito y su licencia están incluidas. Los logos, las texturas del empaque y los tres íconos de jornada se conservan.

## Ranking y validación

El primer alias guardado queda fijo para la identidad anónima de ese navegador. Los alias nuevos tienen de 3 a 12 caracteres y empiezan con una letra; admiten letras, números y guion bajo. Se rechazan términos ofensivos comunes y nombres reservados tanto en la web como en Supabase. El filtro comprueba mayúsculas, tildes, separación con guion bajo, repeticiones y algunas sustituciones por números; no garantiza detectar todo contenido inapropiado. Los nombres ya registrados se conservan. Otro jugador no puede registrar el mismo alias, sin distinguir mayúsculas. Se conserva una sola mejor marca por identidad; una partida inferior no la reemplaza. Los empates mantienen la fecha de la marca anterior.

Supabase genera la semilla de cada partida y calcula el resultado a partir de las pulsaciones. Comprueba identidad, duración, tipos y tiempos de los eventos, ingredientes repetidos, vencimiento con la aceleración y reglas de puntos. No acepta un total arbitrario enviado por el navegador. Reintentar un guardado no duplica la partida. Las partidas nuevas tienen un intervalo mínimo de 31 segundos y se pueden guardar durante 30 minutos desde su inicio. El tiempo activo del juego se conserva durante las pausas.

No se usa la IP como identificador: varios estudiantes pueden compartir la red de la universidad. Borrar los datos del navegador o cambiar de dispositivo puede crear otra identidad. La validación reduce resultados imposibles, pero no garantiza una única cuenta por persona ni impide pulsaciones automatizadas.

Si no se puede iniciar una partida en Supabase, el juego continúa en modo práctica, identificado en pantalla; ese resultado no se guarda. No se muestran jugadores ni puntos ficticios.

Las tablas están en `nutrifrut_private`, fuera de la Data API. Solo se exponen las funciones `nr_start_run`, `nr_finish_run` y `nr_leaderboard` para sesiones autenticadas. La web incluye únicamente la clave publishable, diseñada para el navegador; nunca secret ni service_role.

El asesor de Supabase muestra dos avisos informativos de [RLS sin políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). Es intencional: se deniega el acceso directo a las tablas; las operaciones pasan por funciones que verifican al jugador. No hace falta crear políticas que abran esas tablas.

## Archivos principales

- `index.html`: entrada actual para Pages.
- `burst-app.js`: cámara, estados de la experiencia, revelación y controles del ranking.
- `balanced-play.js` y `balanced-rules.js`: juego, combinaciones y velocidad gradual.
- `ranking-current.js` y `config-current.js`: conexión con Supabase.
- `supabase/ranking-current.sql`: copia de la migración ya instalada, para referencia técnica. No ejecutarla de nuevo en este proyecto.
- `assets/target-final.mind`: target definitivo recibido, conservado sin modificaciones.
- `assets/afiche-final.svg`: SVG oficial con el QR incrustado, conservado sin modificaciones.
- `assets/afiche-final-guia.png`: miniatura en escala de grises extraída del target compilado; solo guía de escaneo.
- `target-layout.js`: calibración del afiche y puntos del contorno de la batería.
- `battery-contour.js`: rayos con núcleo blanco grueso, halo amarillo, ramificaciones, formación progresiva y movimiento reducido.
- `experience-clean.css`: panel de inicio directo y distribución del cierre; altura del espacio 3D y tamaño de controles.
- `product-viewer-fit.js`: encuadre grande del empaque según el tamaño real del visor.
- `centered-reveal.js`: posición central de la revelación con respecto a la cámara.
- `battery-charge.js` y `battery-fill-mask.js`: relleno amarillo ascendente sobre el afiche y máscara que protege el CTA y QR.
- `assets/texture_front.png` y `assets/texture_back.png`: empaque original.
- `assets/jornada`: íconos SVG de clases, entrega y estudio.
- `vendor`: dependencias incluidas, MindAR, Three.js y Supabase JS.

La versión actual usa el `.mind` definitivo y ya no depende del target provisional. Los recursos anteriores se conservan para las pruebas históricas. Si cambia el diseño impreso o su encuadre de compilación, recompila el target y ajusta `target-layout.js`; no basta con reemplazar el SVG.

## Verificación realizada

Paridad JavaScript/PostgreSQL de puntajes y aceleración con cinco semillas y tres velocidades de fotogramas, incluyendo errores; reloj y pausas; permisos, alias fijo y único, mejor marca, top 10 y posición fuera de los primeros diez. Flujo automatizado de cámara, revelación, fallo y reintento de guardado, apertura del top y prevención de doble envío.

Prueba real por la API de Supabase: acceso anónimo, inicio, resultado de 1350 puntos, guardado, reintento idempotente y consulta del top. Los datos de esa prueba fueron retirados. El ranking muestra únicamente las marcas reales existentes. La versión AR anterior fue validada por el usuario desde su teléfono. Esta entrega requiere comprobar en teléfono el nuevo guardado y la interfaz final; no se afirma una prueba visual nueva de cámara en este entorno.

## Editar colores y textos en Visual Studio Code

Abre `colores.css` y busca «BLOQUE» con Ctrl+F. El bloque 1 contiene la paleta general; el 2, el botón top 10; el 3, el formulario y el podio; el 4, el interior de la batería 3D. Los bloques siguientes describen el tamaño, borde y brillo de cada elemento. Para cambiar un color sustituye su código, por ejemplo `#d71920`, guarda y vuelve a publicar los archivos.

`index.html` contiene comentarios PANTALLA 1 a 5, NOMBRE AUTOMÁTICO y BOTÓN TOP 10 para ubicar los textos y controles. `experience-clean.css` controla la distribución final y se carga después de los estilos anteriores. `balanced-ui.css` organiza la tipografía; `brand-white.css`, los elementos del tema. `scene-stable.js` y `portal-stable.js` leen la paleta de `colores.css`; `product-burst.js` indica dónde cambiar los tonos naturales de los ingredientes 3D. Las imágenes del envase, los logos y los íconos se editan en sus archivos originales, no mediante CSS.

`nickname-policy.js` contiene las reglas y términos del filtro. Si se cambia esa política, hay que sincronizar la función privada `nr_alias_error` de Supabase. Los colores y los textos visuales no requieren cambios en Supabase. `supabase/alias-policy.sql` conserva la actualización ya instalada.

El asesor también señala que la [protección frente a contraseñas filtradas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) está desactivada. Este juego utiliza acceso anónimo y no recoge contraseñas; ese aviso corresponde a métodos de acceso con contraseña.

## Integración del afiche definitivo · 19 de octubre de 2026

El QR del nuevo SVG está incrustado y el archivo `.mind` contiene un único target de 4500 × 4500. Los originales recibidos se conservan byte por byte. La transformación del SVG se alineó con la miniatura de seguimiento del `.mind`, incluyendo el margen de su exportación cuadrada.

La batería flotante de prueba se sustituyó por rayos de geometría irregular sobre el borde real de la batería impresa, incluido su terminal. El núcleo blanco mide 0,0055 del ancho del afiche y su halo amarillo 0,018. Se forman durante 1,1 segundos y tienen ramificaciones cortas; las partículas recorren el borde. La guía permanece tenue y fija. El borde se enciende de abajo hacia arriba según la carga ganada, acompañado por el relleno del interior. La carga se interpola suavemente y se ajusta al valor exacto para iluminar también el terminal al llegar al 100 %, sin cambiar escala, posición ni rotación del soporte. El efecto se interrumpe donde el CTA y el QR impresos pasan por delante. Con movimiento reducido los rayos aparecen completos y se ocultan las partículas móviles.

Las estelas de ingredientes terminan en el centro de la batería impresa. La revelación del producto se sitúa en el centro de la cámara; las estelas siguen terminando en la batería. Se mantienen el portal, los 30 segundos activos, la pausa al perder el afiche, los nombres, el top 10 y el botón de la tienda. La base de datos y sus reglas no se modificaron en esta actualización.

Pruebas nuevas: integridad de SVG/MIND, coordenadas finitas y huecos de oclusión, aumento de energía sin deformar el contorno, movimiento reducido, liberación de geometrías y materiales. Flujo simulado completo de cámara, pausa de seguimiento, juego, revelación, guardado de alias y apertura del ranking sin doble envío. Aún debe verificarse en un teléfono real la detección del afiche impreso y la precisión del borde durante el movimiento.

El SVG oficial conserva textos editables que dependen de Inter y Gotham. Esto no altera el reconocimiento, que usa el `.mind` ya compilado. Para volver a imprimir o recompilar desde el SVG, usa las fuentes originales en Illustrator o una copia con textos convertidos a contornos, para evitar sustituciones.

QR verificado mediante lectura del PNG incrustado: https://sentryg22lm.github.io/nutrifrut-webar/ . Para que ese QR abra esta actualización, publica el contenido del nuevo ZIP en la raíz de ese repositorio. No hace falta cambiar el QR ni ejecutar SQL.


## Inicio directo y cierre sin superposición

Se eliminó la elección de clases, entrega y estudio. Tras reconocer el target, Iniciar juego queda habilitado. Si el afiche se pierde antes de comenzar, el botón se desactiva hasta recuperarlo. La mecánica de combinaciones y sus reglas siguen siendo las mismas.

El visor 3D está dentro del flujo del resultado, antes de la tienda y del ranking. ResizeObserver ajusta su cámara y lienzo al espacio real cuando cambia el tamaño; en teléfonos pequeños se puede desplazar la página para completar el nombre. Al volver a jugar se desconecta el observador y se libera el visor anterior.

Pruebas de esta actualización: inicio sin selección previa y bloqueo sin target; 30 segundos activos con pausa; revelación con cámara abierta, alias, top 10 y prevención de doble envío; formación y grosor de rayos; proyección de los ingredientes en cinco tamaños de visor; integridad del afiche y target. El ajuste visual de los rayos y del cierre debe confirmarse en teléfono real.


## Carga visible, empaque grande y ranking resumido

La carga se obtiene de la misma regla del juego: 48 ingredientes correctos para llegar al 100 %. Los aciertos alimentan tanto el indicador superior como el relleno y los rayos del afiche. Los errores no suman carga. La forma interior y el borde están alineados con el target y se mantienen inmóviles; solo cambian la altura de la carga y los tramos encendidos.

El visor final aumenta a 43svh, con límites de 300–430 px en orientación vertical. El nuevo encuadre muestra el empaque al 73–75 % del ancho del visor en las comprobaciones geométricas con teléfonos verticales, frente al encuadre anterior que reservaba espacio para una esfera completa. Los ingredientes siguen orbitando, más cerca del producto. El movimiento automático conserva visible su frente; no da vueltas completas por sí solo. Los controles siguen debajo del visor, sin superposición.

La sección Ranking consulta la función existente de Supabase, ordena los resultados y muestra hasta tres. Si solo existe uno, aparece uno. Si no hay marcas, invita a guardar la primera. Si falla la conexión, muestra el error y Ver más permite reintentar. Al guardar se actualiza el resumen sin abrir automáticamente el ranking completo. El enlace Ver más conserva la tabla de diez puestos. Esta entrega no modifica la base de datos ni requiere ejecutar SQL.

Pruebas: relleno y tramos del borde al 5/25/50/75/100 %; alineación del interior; revelación centrada tras girar y desplazar la cámara; empaque real y órbitas dentro del visor en tamaños verticales y horizontales; acierto conectado al relleno durante una partida; pausa por pérdida del afiche; guardado, resumen, estados vacío/error, Ver más y prevención de doble envío. Consulta de lectura de la función real de ranking confirmada, sin crear marcas de prueba. La revisión visual en teléfono sigue siendo necesaria.


## Corrección de visibilidad de la explosión

El motor MindAR configura una cámara con plano cercano de 10 unidades. La revelación centrada se estaba colocando a una distancia menor y quedaba recortada, aunque su tiempo de animación sí se ejecutaba. `centered-reveal.js` ahora aumenta la distancia y la escala del conjunto en la misma proporción, según el plano cercano real. La explosión se conserva centrada, con el mismo tamaño aparente, antes de pasar al producto grande y al ranking.

Se comprobó la proyección de las mallas de ingredientes durante agrupación, explosión y órbita con planos cercanos de 0,01, 10 y 100, cámaras giradas y tamaños verticales/horizontales. También se verificó el flujo de 30 segundos → revelación visible → cierre con la configuración de cámara de MindAR. La comprobación visual final debe realizarse en teléfono.
