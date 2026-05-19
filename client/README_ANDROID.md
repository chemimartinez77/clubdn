# Android con Capacitor

Este directorio contiene la versión Android generada con Capacitor a partir del build de Vite.

## Requisitos locales

- Android Studio instalado.
- JDK disponible en `PATH` o con `JAVA_HOME` configurado.
- SDK de Android instalado desde Android Studio.

## Variables de entorno

El build Android usa el modo `android` de Vite:

```bash
npm run build:android
```

Ese modo carga `client/.env.android`. El fichero está ignorado por Git. Usa `client/.env.android.example` como plantilla:

```bash
VITE_API_URL=https://clubdn-api.up.railway.app
```

## Comandos habituales

```bash
npm run android:sync
```

Compila React en modo Android y sincroniza los assets con `client/android`.

```bash
npm run android:open
```

Abre el proyecto nativo en Android Studio.

```bash
npm run android:run
```

Compila y lanza la app en un emulador o dispositivo conectado.

## Notas

- El backend sigue desplegado aparte en Railway.
- La app móvil llama a la API definida por `VITE_API_URL`.
- El plugin `@capacitor/camera` está instalado para preparar la integración nativa de cámara y galería.
- Las notificaciones push quedan pendientes para una fase posterior con Firebase Cloud Messaging.
