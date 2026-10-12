# Nutrifrut · Escanea y recárgate

Web estática para GitHub Pages. El afiche activa una escena de recarga; un juego de 15 segundos recoge ingredientes y revela el empaque 3D. El ranking compartido utiliza Supabase. Esta entrega está conectada al proyecto webAR (pjnsmsycpuhjiqcszquz); las tablas y funciones ya se instalaron.

## Probar

Abre la web publicada en Safari o Chrome en el teléfono: solicitará la cámara automáticamente. Permite el acceso y apunta a `assets/afiche.png`, impreso o mostrado en otra pantalla. El botón **Empezar experiencia** aparece con la cámara y se habilita al reconocer el afiche. La cámara permanece abierta y los ingredientes flotan sobre el afiche. Mantén el afiche a la vista: al perderlo se pausa la partida y se conservan el tiempo y los puntos. Después de 15 segundos de juego activo, aparece el producto y puedes girarlo.

No abras `index.html` como archivo local: la cámara necesita HTTPS o localhost. El juego solo comienza después de reconocer el afiche. Puedes volver a jugar desde el resultado, enfocando de nuevo el afiche.

## Activar el ranking conectado

Ya se instaló el esquema y se completó `config.js` con la URL y la clave pública publishable de webAR. No necesitas introducir claves ni volver a ejecutar el SQL para esta entrega. Falta activar **Anonymous Sign-Ins** en Authentication → Sign In / Providers. Su estado estaba desactivado al comprobar el proyecto. Después de activarlo, comienza una partida nueva: las partidas de práctica anteriores no se guardan.

Para trasladarlo a otro proyecto:

1. En tu proyecto de Supabase abre **SQL Editor**, pega todo el contenido de `supabase/setup.sql` y ejecútalo. No contiene eliminaciones de las tablas de otras aplicaciones.
2. Activa **Authentication → Sign In / Providers → Anonymous Sign-Ins**. No se pide correo ni contraseña a los estudiantes.
3. En **Connect** o **Settings → API Keys**, copia la URL del proyecto y la clave **publishable**. También se admite una clave pública legacy `anon`. Nunca uses `secret` ni `service_role`.
4. Completa `supabaseUrl` y `supabasePublicKey` en `config.js` y vuelve a publicar.
5. Verifica que la **Data API** esté activada y exponga `public`. No expongas `nutrifrut_private`.
6. Haz una partida completa, guarda un alias y abre el ranking desde otro teléfono. Comprueba que ambos vean el resultado. Esta es la prueba pendiente hasta conectar tu proyecto real.

Si activaste CAPTCHA para los accesos anónimos, habrá que integrar su widget antes de iniciar partidas para el ranking. Revisa los límites de accesos anónimos por IP para la campaña: muchos estudiantes pueden compartir la red de la universidad.

## Ranking

- Top 10, con una mejor marca por identidad anónima de Supabase en ese navegador.
- Alias público de 3 a 18 caracteres; no se recopila correo.
- Cambiar de teléfono o borrar los datos del navegador crea otra identidad. No se garantiza una sola fila por persona real.
- Las tablas no permiten escritura directa desde la web. Las funciones comprueban propietario, duración mínima, ingredientes repetidos, tiempos de recogida y máximo de 370 puntos. El servidor calcula los puntos; no acepta un total enviado por el navegador.
- Los envíos se pueden reintentar sin duplicar resultados. Una puntuación menor no reemplaza la mejor.
- Esta validación reduce resultados imposibles; no demuestra que las pulsaciones provengan de una persona. Si agregas premios, habrá que reforzar la verificación de jugadores y partidas.
- Con Supabase sin configurar o sin conexión, se puede jugar en modo práctica. No se muestran puntuaciones ficticias ni se envían estas partidas al ranking.

## GitHub Pages

Los archivos están en la raíz, sin necesidad de compilar. En el repositorio selecciona **Settings → Pages → Deploy from a branch → main → /(root)**. La carpeta `target/` conserva los recursos anteriores, pero esta versión utiliza `assets/targets.mind`, correspondiente al afiche nuevo.

Todas las rutas son relativas y funcionan en `https://sentryg22lm.github.io/nutrifrut-webar/`. La plantilla no depende del alojamiento de Sites ni de sus permisos de cuenta. `.nojekyll` evita el procesamiento de archivos.

## Cambiar las imágenes

Reemplaza `assets/avena.svg`, `assets/frutos-rojos.svg` y `assets/cereal.svg`, o modifica sus rutas en `config.js` para utilizar PNG/WebP transparentes. Las ilustraciones actuales son provisionales; no añadas ingredientes que no correspondan a la formulación real.

El empaque usa `assets/texture_front.png` y `assets/texture_back.png`. Su geometría proviene del HTML entregado. Revisa la información y el nombre de marca del reverso antes de la campaña final.

Cuando agregues el QR al afiche, vuelve a compilar la imagen final en MindAR y reemplaza `assets/targets.mind` junto con `assets/afiche.png`.

## Dependencias incluidas

MindAR 1.2.5, Three.js 0.160.0 y Supabase JS 2.117.3. Se sirven junto a la web. La versión anterior de MindAR se adaptó para reutilizar la cámara ya abierta y propagar errores de inicio. No se solicita la cámara dos veces.

Comprobaciones realizadas: sintaxis e importaciones JavaScript, referencias de pantalla, reloj de 15 segundos activos y pausas, botones visibles y táctiles proyectados con Three.js tras mover el afiche, cierre de cámara al terminar, y funciones de ranking sobre PostgreSQL local. Se verificó que JavaScript y SQL reproducen la misma secuencia aleatoria. El usuario validó en teléfono la versión anterior: reconocimiento, escena 3D, juego y empaque. La nueva modalidad de juego con cámara requiere prueba en teléfono; Se instalaron y verificaron en el proyecto real las tablas, permisos y la respuesta vacía del top 10. La Data API está accesible y rechaza peticiones sin sesión. El guardado de una partida real queda pendiente de activar Anonymous Sign-Ins.

## Nombre fijo y top 10
El primer nombre guardado queda ligado a la identidad anónima de Supabase. Las siguientes partidas conservan ese nombre; los cambios enviados desde el navegador se ignoran en la base. Se mantiene solo el mejor puntaje y se muestran las primeras 10 posiciones. Los usuarios pueden mejorar su marca con el mismo nombre.

La IP no se utiliza para identificar estudiantes: varios pueden compartir la red de la universidad. La sesión del navegador es una barrera básica; al borrar datos, abrir otro navegador o cambiar de dispositivo puede crearse otra identidad. No garantiza una cuenta por persona ni impide automatizar eventos. Para un concurso con premios, utilizar una cuenta universitaria verificada o códigos individuales.

## Juego sobre el afiche
Los ingredientes usan las ilustraciones existentes como botones HTML visibles, proyectados desde el espacio del afiche. No necesitan modelos nuevos ni cargar texturas SVG en WebGL. Tienen un tamaño mínimo de 58 píxeles para facilitar los toques. Cambian su posición, tipo, profundidad, momento de aparición y permanencia. La batería 3D aumenta su carga con el puntaje. La cámara y el reconocimiento se mantienen durante toda la partida. La cuenta regresiva y el juego se pausan si se pierde el afiche o se oculta la pestaña.

La semilla de las partidas de ranking la genera Supabase. La base reproduce los tiempos de aparición y comprueba las pulsaciones contra esa secuencia. Los eventos cuentan tiempo activo; no se descuenta tiempo cuando falta el afiche. Ejecuta nuevamente el SQL incluido si instalaste una versión anterior del ranking.

## Revisión de acceso a la base
Las tablas privadas tienen RLS y no permiten acceso directo al navegador. Las operaciones utilizan funciones privadas que verifican la identidad; las funciones públicas actúan como invoker. El asesor de Supabase muestra dos avisos informativos de [RLS sin políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy): es intencional, porque las tablas rechazan todas las operaciones directas y solo se consultan desde las funciones autorizadas. No se conceden permisos directos para eliminar ese aviso.

## Inicio directo y compatibilidad de ingredientes
La web solicita la cámara al abrirse, sin botón previo. El botón de juego aparece en la vista de cámara y se activa al detectar el afiche. No hay cuenta regresiva de 3 segundos antes del juego. Si el navegador bloquea el inicio automático, se mantiene un botón para reintentar con un toque.

Las imágenes se dibujan en la capa HTML visible, conservando su relación con el afiche mediante proyección de coordenadas. Hay un nombre de respaldo si una imagen no carga. La batería y el empaque continúan siendo 3D. Esta corrección requiere comprobarse en el teléfono que presentó el fallo.

## Revelación y cierre comercial
Los ingredientes recogidos envían una estela hacia la batería. Al terminar los 15 segundos, se mantiene la cámara durante una revelación de 3,2 segundos: los ingredientes se reúnen y aparece el empaque sobre el afiche. Se puede omitir con Ver producto. Con movimiento reducido se muestra una transición simplificada.

El resultado prioriza el producto y la frase Tu próxima pausa tiene nombre: Nutrifruit. El botón principal Adquiere Nutrifruit abre https://boliviasfruit.com/categoria-producto/frutosdeshidratados/ en otra pestaña. Guardar el puntaje y el ranking son opciones secundarias. No se abren compras automáticamente ni se agregan productos al carrito.

Verificado con pruebas de flujo, conservación de cámara durante la revelación, proyección de ingredientes, controles y enlace exacto. La animación nueva debe comprobarse en teléfono.


## Versión 8: lluvia de ingredientes y revelación

- Paleta roja (#d71920), blanca (#ffffff) y amarilla (#ffe11b).
- 30 segundos de juego activo, con pausa al perder el afiche o salir de la pestaña.
- 99 ingredientes, hasta 990 puntos. Caen por todo el ancho de la cámara, con posición, velocidad, giro y tiempo de aparición aleatorios reproducibles por semilla. Los controles de la parte superior e inferior permanecen utilizables.
- Revelación AR de 4,5 segundos: remolino de 12 ingredientes, halo, dos ondas, 40 partículas y entrada del empaque con giro y escala. Respeta movimiento reducido. El producto se revela sobre el afiche; después se muestra el visor y enlace de compra.
- Renderizado de hasta 2x con presupuesto de 3 millones de píxeles y filtrado anisotrópico hasta 8x para mejorar nitidez. Texturas originales conservadas: 1807 × 532 px. No se inventaron detalles ni se modificaron los envases.
- Ranking nuevo `recargate-v2` separado del anterior, que se conserva. Supabase continúa aceptando clientes v1 de 15 s, evitando romper la web anterior durante el cambio manual en GitHub Pages.
- `supabase/upgrade-30s.sql` actualiza un proyecto previamente configurado. En este proyecto conectado la actualización ya está aplicada; no ejecutarla nuevamente. `setup.sql` es para instalación nueva.
- Verificación: reloj y pausa, posición y caída, entrada/salida de sprites, revelación y limpieza, reglas de puntuación y paridad SQL/JS con varias semillas, restricciones de permisos, ranking separado y compatibilidad v1. Falta comprobar visualmente la nueva versión en un teléfono real.

Auditoría posterior a v8: acceso directo a tablas privadas denegado y prueba real de guardado revertida sin añadir jugadores al top. Se mantienen dos avisos informativos por RLS sin políticas (denegación intencional): https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy . Supabase también informa que la protección frente a contraseñas filtradas está desactivada; esta experiencia usa sesiones anónimas sin contraseñas: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .
