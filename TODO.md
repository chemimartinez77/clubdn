# TODO

## Pendiente de implementación

### Previsualización WhatsApp: configurar Cloudflare Worker (pendiente colega de Cloudflare)
- Al compartir una partida, la URL del API aparece visible en el mensaje de WhatsApp
- Solución implementada en código, falta configuración en Cloudflare y Railway
- **Paso 1** — Cloudflare DNS: añadir CNAME `staging` → `clubdn-web-staging.up.railway.app` (proxy naranja activado)
- **Paso 2** — Cloudflare Workers: crear worker `clubdn-og-preview` con el código guardado más abajo
- **Paso 3** — Worker → Settings → Domains & Routes: añadir `staging.clubdreadnought.org` y `app.clubdreadnought.org`
- **Paso 4** — Railway: añadir `staging.clubdreadnought.org` como custom domain en el frontend de staging
- **Una vez validado staging**, pasos adicionales para producción:
  - **Paso 5** — Cloudflare DNS: el CNAME `app` → `clubdn-web-production.up.railway.app` ya existe, verificar que tiene proxy naranja activado
  - **Paso 6** — El Worker ya cubre `app.clubdreadnought.org` (añadido en Paso 3), no hay que tocar nada en Cloudflare
  - **Paso 7** — Railway: en el servicio frontend de **producción**, verificar que `app.clubdreadnought.org` ya está como custom domain (debería estarlo)

#### Código del Worker (`clubdn-og-preview`)
```javascript
export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Solo actuar en rutas /events/:id
    const match = url.pathname.match(/^\/events\/([^/]+)$/);
    if (!match) {
      return fetch(request);
    }

    const userAgent = request.headers.get('User-Agent') || '';
    const isCrawler = /whatsapp|facebookexternalhit|twitterbot|linkedinbot|telegrambot|slackbot|discordbot/i.test(userAgent);

    if (!isCrawler) {
      return fetch(request);
    }

    // Elegir API según dominio
    const host = url.hostname;
    const apiBase = host.startsWith('staging.')
      ? 'https://clubdn-api-staging.up.railway.app'
      : 'https://clubdn-api.up.railway.app';

    const eventId = match[1];
    return fetch(apiBase + '/preview/events/' + eventId, { headers: request.headers });
  }
};
```

### ~~Al crear partida, redirigir al detalle en lugar del calendario~~
- ✅ Resuelto: navega a `/events/:id` tras crear la partida

### ~~og-image.png de fallback para eventos sin imagen de juego~~
- ✅ Resuelto: `client/public/og-image.png` añadido (noughter.black.png)

---

### Traducción automática de descripciones de juegos (BGG)
- Las descripciones, categorías y mecánicas vienen de BGG en inglés y se guardan así en BD
- Traducir en el frontend con **MyMemory API** (gratuita, sin tarjeta) al abrir la modal de info del juego
- Cachear en memoria de sesión para no repetir llamadas al mismo juego
- Sin cambios en BD ni en schema — solo frontend, en la modal de `EventDetail.tsx`

---

## ~~Pendiente de decisión~~ RESUELTO

### ~~Membresía al aprobar usuario~~
- ✅ Opción A implementada: el modal de aprobación incluye un selector obligatorio de tipo de membresía (por defecto `EN_PRUEBAS`)
- ✅ Al aprobar, se crea la membresía en la misma transacción que la aprobación del usuario
- Archivos modificados: `ApproveUserModal.tsx`, `useAdminUsers.ts`, `PendingApprovals.tsx`, `adminController.ts`

---

## ~~Pendiente de fix~~ RESUELTO

### ~~NaN% en Logros y Badges~~
- ✅ Fix defensivo aplicado en `client/src/components/badges/BadgeGrid.tsx:66`
- ✅ 48 badge definitions insertados en BD con `server/prisma/seeds/badgeDefinitions.ts`
