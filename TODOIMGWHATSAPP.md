# Plan: Previsualización de imagen en WhatsApp al compartir evento

## Contexto

Al compartir una partida por WhatsApp, actualmente se abre `wa.me/?text=...` con un mensaje formateado completo (fecha, hora, plazas, descripción, URL). WhatsApp no genera previsualización de URLs que van dentro de un texto pregenerado.

La idea es ofrecer **dos opciones** al compartir:
- **Opción A (actual):** mensaje formateado completo + URL al final
- **Opción B (nueva):** solo la URL del evento, con previsualización de imagen generada por WhatsApp via OG tags

La opción B requiere un endpoint en el backend Express que devuelva HTML estático con meta OG tags, porque WhatsApp no ejecuta JavaScript y la app es una SPA (React + Vite) que siempre devuelve el mismo `index.html` vacío.

---

## Arquitectura de la solución

### Backend — nuevo endpoint en Express

Ruta: `GET /preview/events/:id`

- **No requiere autenticación** (WhatsApp rastrea como bot anónimo)
- Consulta el evento en Prisma por `id`
- Devuelve HTML mínimo con:
  - Meta OG tags (`og:title`, `og:description`, `og:image`, `og:url`)
  - Meta tag de redirect inmediato al usuario: `<meta http-equiv="refresh" content="0; url=/events/:id">`
  - Alternativamente, un `<script>` de redirect para navegadores con JS
- Si el evento no existe, devuelve redirect a `/`

**Ejemplo de respuesta HTML:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta property="og:title" content="Partida: Azul — viernes 4 de abril" />
  <meta property="og:description" content="Plazas disponibles: 3 de 6 · 19:00 – 22:00" />
  <meta property="og:image" content="https://clubdn.up.railway.app/og-image.png" />
  <meta property="og:url" content="https://clubdn.up.railway.app/preview/events/abc123" />
  <meta property="og:type" content="website" />
  <meta http-equiv="refresh" content="0; url=https://clubdn.up.railway.app/events/abc123" />
</head>
<body>
  <script>window.location.replace('/events/abc123');</script>
</body>
</html>
```

### Frontend — segundo botón de compartir

En `EventDetail.tsx`, junto al botón actual "Compartir por WhatsApp", añadir un segundo botón:
- **"Compartir enlace"** (o icono de cadena) que abre `wa.me/?text=https://clubdn.up.railway.app/preview/events/:id`
- Solo la URL, sin texto adicional, para que WhatsApp genere la previsualización

---

## Pasos de implementación

### 1. Imagen OG estática
- Crear o elegir una imagen representativa del club (1200×630px, < 300KB, HTTPS)
- Colocarla en `client/public/og-image.png` (se sirve como estático en Vite)
- En producción Railway la URL sería `https://clubdn.up.railway.app/og-image.png`

### 2. Backend — ruta `/preview/events/:id`
- Crear `server/src/routes/previewRoutes.ts`
- Crear `server/src/controllers/previewController.ts`
  - Consulta `prisma.event.findUnique({ where: { id } })`
  - Formatea título, descripción (plazas, hora) y construye el HTML
- Registrar en `server/src/index.ts`: `app.use('/preview', previewRoutes)` **antes** del catch-all 404
- Esta ruta debe ir **sin** middleware de autenticación

### 3. Frontend — botón adicional en EventDetail.tsx
- En `handleShareWhatsApp` o junto a ese botón, añadir `handleShareLink`
- `handleShareLink` abre: `https://wa.me/?text=${encodeURIComponent(previewUrl)}`
  donde `previewUrl = https://clubdn.up.railway.app/preview/events/${event.id}`
- En local usar `window.location.origin` para construir la URL base

### 4. Pruebas
- Probar en local con ngrok o similar (WhatsApp requiere HTTPS público para leer OG tags)
- Verificar con [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) pegando la URL `/preview/events/:id`
- Comprobar que el redirect funciona correctamente para usuarios que hacen clic

---

## Notas importantes

- **WhatsApp cachea previsualizaciones.** Si se prueba con una URL y luego se cambia la imagen, hay que usar el Facebook Sharing Debugger para forzar el re-scraping.
- **La imagen debe ser HTTPS.** En local no funcionará sin un túnel tipo ngrok.
- **El endpoint `/preview` no debe requerir login** — WhatsApp rastrea como bot.
- **No eliminar la opción A** — ambas opciones coexisten en la UI.
- La descripción OG puede incluir: nombre del juego, fecha, hora, plazas disponibles.
