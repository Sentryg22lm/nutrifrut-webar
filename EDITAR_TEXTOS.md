# Cambiar el CTA y los mensajes sin tocar el juego

## Archivo principal: textos.js

1. Abre la carpeta del ZIP en Visual Studio Code
2. Abre `textos.js` y busca `EDITAR TEXTOS Y CTA`
3. Cambia solo el texto que está entre comillas, manteniendo las comillas y comas
4. Guarda el archivo y súbelo a GitHub reemplazando el anterior
5. Espera a que GitHub Pages termine y recarga sin caché; en PC: Ctrl + Shift + R

Ejemplo:

```js
cierre:{
  titulo:'Todavía queda día',
  botonCompra:'Conseguí tu Nutrifruit',
  enlaceTienda:'https://boliviasfruit.com/categoria-producto/frutosdeshidratados/',
  // ... conserva las otras propiedades
}
```

Este es solo un ejemplo de edición. Los textos publicados no se cambiaron.

| Qué quieres cambiar | Dónde está en textos.js |
| --- | --- |
| Título encima del producto | `cierre.titulo` |
| Texto del botón de compra | `cierre.botonCompra` |
| Dirección de la tienda | `cierre.enlaceTienda` |
| Título para registrar el nombre | `cierre.tituloFormulario` |
| Ejemplo dentro del campo de nombre | `cierre.ejemploNombre` |
| Título y botón del ranking | `cierre.tituloRanking` y `cierre.verRanking` |
| Botón para repetir | `cierre.volverJugar` |
| Mensajes durante convergencia y empaque | bloque `revelacion` |
| Felicitación o mensaje según la carga | bloque `resultado` |

En `resultado.parcialTitulo`, conserva `{porcentaje}` para que aparezca la carga real del jugador.

## Otros elementos

- Bienvenida y descripción inicial: abre `index.html` y busca `EDITAR INICIO`
- Colores: abre `colores.css`; los bloques tienen comentarios
- Tamaños y distribución del CTA: `experience-clean.css` y `balanced-ui.css`

La experiencia principal abre `index.html`. `experiencia-3d.html` es una copia de esa entrada; si modificas el texto de bienvenida en el HTML y quieres mantener ambas entradas iguales, copia también ese cambio allí. Los cambios de `textos.js` se aplican automáticamente a ambas.

Para cambiar una frase no hace falta editar JavaScript del juego ni Supabase. Los tiempos y las reglas están separados en `rain-rules.js`: esos valores también los verifica el servidor y no deben cambiarse solo en la web.
