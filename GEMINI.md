# Cancionero — contexto para Gemini

App móvil para iPhone (cancionero con acordes). Objetivo de esta etapa: **mejorar el front (UI/UX)** sin romper la lógica. Leé todo este archivo antes de tocar código.

## Qué es
- Guarda canciones con **letra + acordes** y deja **transponer** el tono.
- Todo funciona **local** (AsyncStorage); sin servidor ni cuenta.
- Idioma de la interfaz: **español rioplatense**, trato informal.

## Stack
- Expo (React Native), JavaScript, se prueba en iPhone con **Expo Go** (sin Mac). Correr: `npx expo start`.
- Dependencias: `@react-native-async-storage/async-storage`, `expo-document-picker`, `react-native-svg`, `react-native-webview`.
- Restricción: todo lo nuevo tiene que **funcionar en Expo Go**. No agregar librerías que pidan código nativo propio.

## Archivos
| Archivo | Qué hace |
|---|---|
| `App.js` | Toda la UI y el estado. Pantallas por `view`: `home`, `group`, `song`, `import`, `paste`, `web`, `save`. Temas `LIGHT`/`DARK`, estilos en `styles(c)`. |
| `transpose.js` | Lógica pura: `transposeChord`, `isChordLine`, `transposeChordLine`, `parseLine` (ChordPro `[Am]`). |
| `chords.js` | Calcula diagramas de acordes por instrumento (guitarra, bajo, ukelele, charango) buscando digitaciones válidas. Sin tabla fija. |
| `transpose.test.mjs`, `chords.test.mjs` | Tests. Correr: `node transpose.test.mjs && node chords.test.mjs`. |

## Modelo de datos (AsyncStorage)
- `groups`: `[{ id, title, versions: [{ id, name, body }] }]`. Una canción = un grupo; `v1`, `v2`… son versiones (renombrables).
- `body`: texto plano con la **línea de acordes arriba de la letra**; tipografía monoespaciada para que alineen.
- `theme` (`light`/`dark`; si no existe, sigue al sistema) e `inst` (instrumento elegido).

## Lo que ya existe
- Lista de canciones → versiones → vista de canción con transposición (−, Original, +).
- Modo oscuro (sigue al sistema + botón manual).
- Importar: archivo `.txt/.cho`, texto pegado, o navegador embebido (CifraClub / LaCuerda) que toma el `<pre>` de la página.
- Panel "Herramientas": instrumento, chips con los acordes de la canción, diagrama (SVG), tamaño de letra.
- Principios aplicados (reel "19 principles of UX & animation"): botones ≥ 48 pt (Fitts), pocas opciones por pantalla (Hick), transición < 400 ms (Doherty), feedback al tocar.

## Reglas que no hay que romper
1. **No cambiar el formato de `body`** ni las claves de AsyncStorage sin migración (hay datos de usuarios).
2. La lógica de acordes vive en `transpose.js` / `chords.js`: si la tocás, los tests tienen que seguir pasando.
3. Los acordes tienen que seguir **alineados** sobre la letra (monoespaciada, scroll horizontal en vez de partir líneas).
4. Textos de la UI en español. Contraste legible en claro y oscuro.
5. Cambios chicos y revisables; no reescribir `App.js` entero de una.
6. No scrapear servidores: el import corre en el teléfono, con lo que la persona abre.

## Limitaciones conocidas (por si querés atacarlas)
- `App.js` es un solo archivo grande; se puede separar en pantallas/componentes.
- No hay navegación real (es un `view` en el estado): sin gesto de volver ni historial.
- Sin buscador ni orden/ordenar en la lista de canciones.
- PDF no se importa (solo texto).
- Diagramas de **charango y bajo** son válidos pero no revisados por un músico; el charango no muestra las cuerdas dobles.
- Una línea de letra que sea solo `A` o `E` se detecta como acorde.
- No hay autoscroll, capo ni pantalla siempre encendida para tocar.
- Compartir desde Safari (menú Compartir) no está: requiere build propio, no Expo Go.

## Qué nos sirve de vos
1. **Propuesta de diseño**: paleta, tipografía, espaciado, íconos y estados vacíos, para claro y oscuro. Priorizá que se lea bien tocando con el teléfono en un atril.
2. **Mejoras de UX** concretas: navegación (gestos, pestañas), buscador, favoritos, modo escenario (letra grande, sin distracciones).
3. **Animaciones** útiles (apertura del panel, cambio de tono) sin pasar de ~300 ms.
4. **Ideas de funciones** de apps como OnSong, Songbook Buddy, JustChords, Chord Collect, evaluadas por esfuerzo/impacto.

Si proponés código: indicá archivo y qué reemplaza, y dejá corriendo `node transpose.test.mjs && node chords.test.mjs`.
