# PWA (Progressive Web App) - Club Dreadnought

## 📱 Estado Actual

### ✅ Configuración Básica (COMPLETADO)

La aplicación ya tiene la configuración básica para PWA:

1. **Favicon configurado**
   - `public/favicon.ico` - Para navegadores de escritorio
   - `public/favico.jpeg` - Para dispositivos iOS (apple-touch-icon)

2. **Manifest.json creado**
   - Ubicación: `client/public/manifest.json`
   - Configurado con:
     - Nombre de la app: "Club Dreadnought"
     - Nombre corto: "ClubDN"
     - Color del tema: `#667eea` (morado del diseño)
     - Iconos básicos configurados
     - Idioma: Español (es-ES)
     - Modo: `standalone` (pantalla completa sin barra del navegador)

3. **HTML actualizado**
   - Link al manifest incluido
   - Meta tags para PWA añadidos
   - Theme color configurado

### 📲 Funcionalidades Actuales

Con la configuración actual, los usuarios YA pueden:
- ✅ Ver el favicon del club en las pestañas del navegador
- ✅ Añadir la web a marcadores con el icono correcto
- ✅ En dispositivos iOS: añadir a pantalla de inicio con el icono

---

## ⏳ Pendiente para PWA Completa

Para convertir la web en una **PWA completa e instalable**, faltan estos pasos:

### 1. Service Worker (Funcionamiento Offline)

**¿Qué es?**
Un script que corre en segundo plano y permite:
- Funcionar sin internet (cachea recursos)
- Notificaciones push
- Sincronización en segundo plano

**¿Cómo implementarlo?**
```javascript
// client/public/service-worker.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('clubdn-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/src/main.tsx',
        // Añadir otros recursos críticos
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

**Registrar en main.tsx:**
```typescript
// client/src/main.tsx
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(() => console.log('Service Worker registrado'))
    .catch((err) => console.error('Error al registrar SW:', err));
}
```

### 2. Iconos Optimizados

**Pendiente:** Crear iconos en tamaños específicos para mejor compatibilidad.

**Tamaños recomendados:**
- 72x72
- 96x96
- 128x128
- 144x144
- 152x152
- 192x192 ✅ (ya tenemos el JPEG base)
- 384x384
- 512x512 ✅ (ya tenemos el JPEG base)

**Herramientas para generar:**
- Online: https://realfavicongenerator.net/
- CLI: `npm install -g pwa-asset-generator`
  ```bash
  pwa-asset-generator public/favico.jpeg public/icons
  ```

### 3. Estrategia de Caché

Decidir qué cachear y cómo:

**Opciones:**
1. **Cache First** (primero caché): Para assets estáticos (CSS, JS, imágenes)
2. **Network First** (primero red): Para datos dinámicos (eventos, usuarios)
3. **Stale While Revalidate**: Muestra caché mientras actualiza en segundo plano

**Ejemplo con Workbox (librería recomendada):**
```javascript
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';

// Precachear recursos del build
precacheAndRoute(self.__WB_MANIFEST);

// Estrategia para imágenes
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({ cacheName: 'images' })
);

// Estrategia para API
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({ cacheName: 'api-responses' })
);
```

### 4. Notificaciones Push (Opcional)

**Requisitos:**
1. Service Worker activo
2. Permiso del usuario
3. Backend para enviar notificaciones (Firebase Cloud Messaging o similar)

**Implementación básica:**
```javascript
// Pedir permiso
Notification.requestPermission().then((permission) => {
  if (permission === 'granted') {
    console.log('Notificaciones permitidas');
  }
});

// En service worker
self.addEventListener('push', (event) => {
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/favico.jpeg',
  });
});
```

### 5. Prompt de Instalación

**Código para mostrar botón "Instalar App":**
```typescript
// En tu componente de React
let deferredPrompt: any;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Mostrar botón "Instalar App"
});

const handleInstallClick = async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Usuario ${outcome === 'accepted' ? 'aceptó' : 'rechazó'} instalar`);
    deferredPrompt = null;
  }
};
```

---

## 🎯 Roadmap para PWA Completa

### Fase 1: Básico (Actual) ✅
- [x] Favicon configurado
- [x] Manifest.json creado
- [x] Meta tags PWA

### Fase 2: Instalable
- [ ] Service Worker básico
- [ ] Iconos optimizados (192x192, 512x512)
- [ ] Prompt de instalación

### Fase 3: Offline
- [ ] Estrategia de caché para páginas
- [ ] Caché de assets estáticos
- [ ] Página offline personalizada

### Fase 4: Avanzado
- [ ] Notificaciones push
- [ ] Sincronización en segundo plano
- [ ] Actualización automática

---

## 📚 Recursos Útiles

### Documentación
- [MDN - Progressive Web Apps](https://developer.mozilla.org/es/docs/Web/Progressive_web_apps)
- [web.dev - PWA](https://web.dev/progressive-web-apps/)
- [Workbox (Google)](https://developer.chrome.com/docs/workbox/)

### Herramientas
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Auditoría de PWA
- [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator) - Generar iconos
- [Favicon Generator](https://realfavicongenerator.net/) - Crear favicons

### Testing
```bash
# Chrome DevTools > Application > Manifest
# Chrome DevTools > Application > Service Workers
# Chrome DevTools > Lighthouse > Progressive Web App
```

---

## 🚀 Cómo Continuar (Cuando Estés Listo)

### Opción 1: Vite PWA Plugin (Recomendado)

**Más fácil y automático:**
```bash
cd client
npm install -D vite-plugin-pwa
```

**Configurar en vite.config.ts:**
```typescript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        // Se importa automáticamente de public/manifest.json
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpeg}'],
      },
    }),
  ],
});
```

### Opción 2: Manual (Más Control)

1. Crear `public/service-worker.js` (código arriba)
2. Registrarlo en `main.tsx`
3. Configurar estrategias de caché

---

## ✅ Checklist Pre-Launch PWA

Antes de lanzar como PWA completa, verificar:

- [ ] Manifest.json sin errores (Chrome DevTools)
- [ ] Service Worker registrado correctamente
- [ ] App instalable en móvil (Android/iOS)
- [ ] Funciona offline (páginas cacheadas)
- [ ] Iconos se ven correctamente
- [ ] HTTPS habilitado (requerido para PWA)
- [ ] Lighthouse PWA score > 90

---

**Fecha de creación:** 15 Febrero 2026
**Estado:** Configuración básica completada, listo para expandir
**Próximo paso:** Implementar Service Worker cuando se necesite offline/notificaciones
