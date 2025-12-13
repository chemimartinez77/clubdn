# 🔐 Sistema de Autenticación - Flujo Completo

## 📊 Diagrama de Estados de Usuario

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUJO DE REGISTRO Y APROBACIÓN               │
└─────────────────────────────────────────────────────────────────┘

1. REGISTRO
   Usuario completa formulario (nombre, email, password)
   │
   ▼
   [PENDING_VERIFICATION]
   │
   ├─► Email enviado con token de verificación (24h)
   │
   │
2. VERIFICACIÓN DE EMAIL
   Usuario hace clic en el enlace del email
   │
   ▼
   [PENDING_APPROVAL]
   │
   ├─► Email enviado al admin notificando nueva solicitud
   │
   │
3. REVISIÓN POR ADMIN
   Admin revisa la solicitud en panel de administración
   │
   ├─► APROBAR ──────────► [APPROVED]
   │                       │
   │                       └─► Email enviado al usuario (aprobado)
   │
   └─► RECHAZAR ─────────► [REJECTED]
                           │
                           └─► Email enviado al usuario (rechazado)


Estados adicionales:
- [SUSPENDED]: Admin puede suspender temporalmente un usuario aprobado
```

---

## 🔄 Endpoints de la API

### 1. Registro de Usuario

**POST** `/api/auth/register`

**Request Body:**
```json
{
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "password": "Password123!"
}
```

**Validaciones:**
- Nombre: mínimo 2 caracteres
- Email: formato válido y único
- Password: mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula, 1 número

**Proceso:**
1. Validar datos
2. Verificar que el email no exista
3. Hash de password con bcrypt
4. Generar token de verificación (UUID)
5. Calcular fecha de expiración (24h)
6. Crear usuario con estado `PENDING_VERIFICATION`
7. Enviar email de verificación
8. Registrar email en `EmailLog`

**Response (200):**
```json
{
  "success": true,
  "message": "Registro exitoso. Por favor, verifica tu email.",
  "data": {
    "email": "juan@example.com"
  }
}
```

**Email Template: Verificación**
```
Asunto: Verifica tu email - Club de Juegos de Mesa

Hola Juan,

¡Gracias por registrarte en nuestro club!

Para completar tu registro, por favor verifica tu email haciendo clic en el siguiente enlace:

[VERIFICAR EMAIL] → http://localhost:5173/verify-email?token=abc123...

Este enlace expirará en 24 horas.

Si no solicitaste este registro, puedes ignorar este email.

Saludos,
El equipo del Club de Juegos de Mesa
```

---

### 2. Verificación de Email

**GET** `/api/auth/verify-email?token=abc123...`

**Proceso:**
1. Buscar usuario por `verificationToken`
2. Verificar que el token no haya expirado
3. Actualizar usuario:
   - `emailVerified = true`
   - `status = PENDING_APPROVAL`
   - `verificationToken = null`
4. Obtener email del admin por defecto
5. Enviar email al admin notificando
6. Registrar emails en `EmailLog`

**Response (200):**
```json
{
  "success": true,
  "message": "Email verificado. Tu solicitud será revisada por un administrador."
}
```

**Email Template: Notificación al Admin**
```
Asunto: Nueva solicitud de registro - Club de Juegos

Hola Admin,

Hay una nueva solicitud de registro pendiente de aprobación:

Nombre: Juan Pérez
Email: juan@example.com
Fecha de registro: 13/12/2024 10:30

Accede al panel de administración para aprobar o rechazar:
http://localhost:5173/admin/pending-approvals

Saludos,
Sistema del Club
```

---

### 3. Login

**POST** `/api/auth/login`

**Request Body:**
```json
{
  "email": "juan@example.com",
  "password": "Password123!"
}
```

**Proceso:**
1. Buscar usuario por email
2. Verificar password con bcrypt
3. Verificar estado del usuario:
   - `PENDING_VERIFICATION` → Error: "Debes verificar tu email"
   - `PENDING_APPROVAL` → Error: "Tu solicitud está pendiente de aprobación"
   - `REJECTED` → Error: "Tu solicitud fue rechazada"
   - `SUSPENDED` → Error: "Tu cuenta está suspendida"
   - `APPROVED` → Continuar
4. Generar JWT token
5. Actualizar `lastLoginAt`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "clx123...",
      "name": "Juan Pérez",
      "email": "juan@example.com",
      "role": "USER",
      "status": "APPROVED"
    }
  }
}
```

---

### 4. Listar Solicitudes Pendientes (Admin)

**GET** `/api/admin/pending-approvals`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Middleware:**
- Verificar JWT
- Verificar que el usuario sea ADMIN o SUPER_ADMIN

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "clx123...",
      "name": "Juan Pérez",
      "email": "juan@example.com",
      "createdAt": "2024-12-13T10:30:00Z",
      "status": "PENDING_APPROVAL"
    },
    {
      "id": "clx456...",
      "name": "María García",
      "email": "maria@example.com",
      "createdAt": "2024-12-12T15:20:00Z",
      "status": "PENDING_APPROVAL"
    }
  ]
}
```

---

### 5. Aprobar Usuario (Admin)

**POST** `/api/admin/approve/:userId`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Request Body (opcional):**
```json
{
  "customMessage": "Mensaje personalizado para el email (opcional)"
}
```

**Proceso:**
1. Verificar que el admin esté autenticado
2. Buscar usuario pendiente
3. Actualizar usuario:
   - `status = APPROVED`
   - `approvedBy = adminId`
   - `approvedAt = now()`
4. Enviar email de aprobación al usuario
5. Registrar email en `EmailLog`

**Response (200):**
```json
{
  "success": true,
  "message": "Usuario aprobado exitosamente"
}
```

**Email Template: Aprobación**
```
Asunto: ¡Bienvenido al Club de Juegos de Mesa!

Hola Juan,

¡Excelentes noticias! Tu solicitud para unirte al club ha sido aprobada.

Ya puedes acceder a la plataforma con tu email y contraseña:
http://localhost:5173/login

[MENSAJE PERSONALIZADO DEL ADMIN SI LO HAY]

¡Te esperamos en la próxima sesión de juegos!

Saludos,
El equipo del Club de Juegos de Mesa
```

---

### 6. Rechazar Usuario (Admin)

**POST** `/api/admin/reject/:userId`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Request Body:**
```json
{
  "reason": "Motivo del rechazo (opcional)",
  "customMessage": "Mensaje personalizado (opcional)"
}
```

**Proceso:**
1. Verificar que el admin esté autenticado
2. Buscar usuario pendiente
3. Actualizar usuario:
   - `status = REJECTED`
   - `rejectedBy = adminId`
   - `rejectedAt = now()`
   - `rejectionReason = reason` (si se proporciona)
4. Enviar email de rechazo al usuario
5. Registrar email en `EmailLog`

**Response (200):**
```json
{
  "success": true,
  "message": "Usuario rechazado"
}
```

**Email Template: Rechazo**
```
Asunto: Actualización sobre tu solicitud - Club de Juegos

Hola Juan,

Lamentamos informarte que tu solicitud para unirte al club no ha sido aprobada en este momento.

[MOTIVO DEL RECHAZO SI SE PROPORCIONÓ]

[MENSAJE PERSONALIZADO DEL ADMIN SI LO HAY]

Si tienes alguna pregunta, no dudes en contactarnos.

Saludos,
El equipo del Club de Juegos de Mesa
```

---

## 🔒 Middleware de Autenticación

### `server/src/middleware/auth.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token no proporcionado'
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as JwtPayload;

    // Adjuntar info del usuario al request
    req.user = decoded;
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token inválido o expirado'
    });
  }
};

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de administrador.'
    });
  }
  next();
};
```

---

## 📧 Servicio de Email

### `server/src/services/emailService.ts`

```typescript
import nodemailer from 'nodemailer';
import { prisma } from '../config/database';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  template: string;
}

export const sendEmail = async (options: EmailOptions) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    // Log exitoso
    await prisma.emailLog.create({
      data: {
        to: options.to,
        subject: options.subject,
        template: options.template,
        success: true,
      },
    });

    return { success: true };
  } catch (error) {
    // Log con error
    await prisma.emailLog.create({
      data: {
        to: options.to,
        subject: options.subject,
        template: options.template,
        success: false,
        errorMsg: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    throw error;
  }
};

// Templates específicos
export const sendVerificationEmail = async (
  email: string,
  name: string,
  token: string
) => {
  const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;

  const html = `
    <h2>¡Hola ${name}!</h2>
    <p>Gracias por registrarte en nuestro club de juegos de mesa.</p>
    <p>Para completar tu registro, por favor verifica tu email haciendo clic en el siguiente enlace:</p>
    <p><a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Verificar Email</a></p>
    <p>Este enlace expirará en 24 horas.</p>
    <p>Si no solicitaste este registro, puedes ignorar este email.</p>
    <br>
    <p>Saludos,<br>El equipo del Club de Juegos de Mesa</p>
  `;

  return sendEmail({
    to: email,
    subject: 'Verifica tu email - Club de Juegos de Mesa',
    html,
    template: 'verification',
  });
};

export const sendAdminNotification = async (
  adminEmail: string,
  userName: string,
  userEmail: string
) => {
  const adminUrl = `${process.env.CLIENT_URL}/admin/pending-approvals`;

  const html = `
    <h2>Nueva solicitud de registro</h2>
    <p>Hay una nueva solicitud pendiente de aprobación:</p>
    <ul>
      <li><strong>Nombre:</strong> ${userName}</li>
      <li><strong>Email:</strong> ${userEmail}</li>
      <li><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</li>
    </ul>
    <p><a href="${adminUrl}" style="background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Ver panel de administración</a></p>
  `;

  return sendEmail({
    to: adminEmail,
    subject: 'Nueva solicitud de registro - Club de Juegos',
    html,
    template: 'admin_notification',
  });
};

export const sendApprovalEmail = async (
  email: string,
  name: string,
  customMessage?: string
) => {
  const loginUrl = `${process.env.CLIENT_URL}/login`;

  const html = `
    <h2>¡Bienvenido al Club, ${name}!</h2>
    <p>¡Excelentes noticias! Tu solicitud para unirte al club ha sido aprobada.</p>
    <p>Ya puedes acceder a la plataforma:</p>
    <p><a href="${loginUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Iniciar Sesión</a></p>
    ${customMessage ? `<p>${customMessage}</p>` : ''}
    <p>¡Te esperamos en la próxima sesión de juegos!</p>
    <br>
    <p>Saludos,<br>El equipo del Club de Juegos de Mesa</p>
  `;

  return sendEmail({
    to: email,
    subject: '¡Bienvenido al Club de Juegos de Mesa!',
    html,
    template: 'approval',
  });
};

export const sendRejectionEmail = async (
  email: string,
  name: string,
  reason?: string,
  customMessage?: string
) => {
  const html = `
    <h2>Actualización sobre tu solicitud</h2>
    <p>Hola ${name},</p>
    <p>Lamentamos informarte que tu solicitud para unirte al club no ha sido aprobada en este momento.</p>
    ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ''}
    ${customMessage ? `<p>${customMessage}</p>` : ''}
    <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
    <br>
    <p>Saludos,<br>El equipo del Club de Juegos de Mesa</p>
  `;

  return sendEmail({
    to: email,
    subject: 'Actualización sobre tu solicitud - Club de Juegos',
    html,
    template: 'rejection',
  });
};
```

---

## 🎯 Casos de Uso y Validaciones

### Registro
- ✅ Email único (no puede haber duplicados)
- ✅ Password seguro (mínimo 8 caracteres, mayúscula, número)
- ✅ Nombre válido (mínimo 2 caracteres)

### Verificación
- ✅ Token válido y no expirado (24h)
- ✅ Usuario existe y está en estado `PENDING_VERIFICATION`
- ✅ Email único del admin configurado

### Login
- ✅ Credenciales correctas
- ✅ Email verificado
- ✅ Estado `APPROVED`
- ✅ No suspendido

### Aprobación/Rechazo
- ✅ Solo admins
- ✅ Usuario en estado `PENDING_APPROVAL`
- ✅ Mensajes personalizados opcionales

---

## 🔐 Seguridad

1. **Passwords:** Hash con bcrypt (salt rounds: 10)
2. **JWT:** Tokens firmados, expiración 7 días
3. **Tokens de verificación:** UUID únicos, expiración 24h
4. **Rate limiting:** Implementar en endpoints sensibles (próximo paso)
5. **CORS:** Configurado solo para CLIENT_URL
6. **Validación:** Todos los inputs sanitizados

---

## 📱 Responsive Design

- Mobile first con Tailwind
- Breakpoints: sm (640px), md (768px), lg (1024px)
- Formularios optimizados para móvil
- Botones de tamaño adecuado para touch
