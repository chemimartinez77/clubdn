# Guía Rápida de Testing - Club Dreadnought

## 🚀 Quick Start

### Ejecutar Tests
```bash
# Todos los tests UAT
npm run test:uat

# Solo tests que funcionan (Tester 1)
npm test -- tester1.uat.test.ts

# Modo watch (para desarrollo)
npm run test:watch
```

### Estado Actual
- ✅ **19 tests funcionando** (Tester 1 - Autenticación y Perfil)
- ⚠️ **42 tests pendientes de ajuste** (Testers 2, 3, 4)
- 📊 **31% de cobertura operativa**

---

## 📋 Checklist Pre-Deploy

### Tests Obligatorios (Deben pasar)
Antes de hacer deploy, ejecutar:
```bash
npm test -- tester1.uat.test.ts
```

**Resultado esperado: 19/19 tests pasando**

Si fallan tests, revisar:
1. Base de datos de test limpia (`rm server/test.db` y volver a ejecutar)
2. Variables de entorno en `.env.test`
3. JWT_SECRET configurado correctamente

### Tests Opcionales (Informativos)
```bash
npm run test:uat
```
Estos tests pueden fallar debido a ajustes pendientes en estructura de API. No son bloqueantes.

---

## 🔧 Troubleshooting

### Error: "Puerto 5000 en uso"
**Causa:** El servidor se inició fuera de modo test.

**Solución:**
```bash
# Matar procesos en puerto 5000
# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:5000 | xargs kill -9
```

### Error: "Cannot find name 'beforeAll'"
**Causa:** Falta import de Jest globals.

**Solución:** Ya está resuelto en `setup.ts` con `import '@jest/globals'`

### Error: "Database locked"
**Causa:** SQLite no cerró conexión correctamente.

**Solución:**
```bash
cd server
rm test.db
npm run test:uat
```

### Tests pasan localmente pero fallan en CI
**Causa probable:** Variables de entorno faltantes.

**Solución:** Verificar que `.env.test` existe y tiene:
```env
DATABASE_URL="file:./test.db"
JWT_SECRET="mismo_que_produccion"
JWT_EXPIRATION="7d"
NODE_ENV="test"
```

---

## 📝 Cómo Escribir Nuevos Tests

### Estructura Básica
```typescript
import request from 'supertest';
import app from '../../index';
import { createApprovedTestUser } from '../helpers/auth.helper';
import { getUserById } from '../helpers/db.helper';

describe('Mi Feature', () => {
  it('debe hacer algo específico', async () => {
    // 1. Setup: Crear datos de prueba
    const testUser = await createApprovedTestUser({
      email: 'test@example.com',
      password: 'Password123!',
    });

    // 2. Acción: Llamar al endpoint
    const response = await request(app)
      .post('/api/mi-endpoint')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({ data: 'valor' })
      .expect(200);

    // 3. Verificar respuesta API
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('id');

    // 4. Verificar base de datos (opcional)
    const updatedUser = await getUserById(testUser.id);
    expect(updatedUser?.someField).toBe('expectedValue');
  });
});
```

### Helpers Útiles

#### Crear usuarios
```typescript
// Usuario pendiente de aprobación
const pendingUser = await createTestUser({
  email: 'pending@example.com',
  status: 'PENDING_VERIFICATION',
});

// Usuario aprobado con token
const approvedUser = await createApprovedTestUser({
  email: 'approved@example.com',
  password: 'Password123!',
  name: 'Usuario Aprobado',
});

// Admin con token
const adminUser = await createAdminTestUser({
  email: 'admin@example.com',
});
```

#### Verificar datos en BD
```typescript
// Obtener usuario
const user = await getUserByEmail('test@example.com');
expect(user?.status).toBe('APPROVED');

// Verificar evento
const event = await getEventById(eventId);
expect(event?.title).toBe('Mi Evento');

// Contar asistentes
const count = await countEventAttendees(eventId);
expect(count).toBe(5);

// Verificar badge
const hasBadge = await userHasBadge(userId, badgeId);
expect(hasBadge).toBe(true);
```

### Tips Importantes

1. **Usa nombres descriptivos**
   ```typescript
   // ❌ Malo
   it('test 1', async () => { ... });

   // ✅ Bueno
   it('debe rechazar login con contraseña incorrecta', async () => { ... });
   ```

2. **Un concepto por test**
   ```typescript
   // ❌ Malo: Test hace 3 cosas
   it('debe crear usuario, hacer login y actualizar perfil', ...);

   // ✅ Bueno: Tests separados
   it('debe crear usuario con estado PENDING_VERIFICATION', ...);
   it('debe permitir login a usuario aprobado', ...);
   it('debe actualizar perfil correctamente', ...);
   ```

3. **Cleanup automático**
   No necesitas limpiar datos manualmente, `afterEach` lo hace automáticamente.

4. **Timeouts**
   Por defecto los tests tienen 30 segundos de timeout. Si necesitas más:
   ```typescript
   it('operación larga', async () => {
     // ...
   }, 60000); // 60 segundos
   ```

---

## 🎯 Endpoints Validados

### Autenticación (`/api/auth`)
| Método | Endpoint | Status | Notas |
|--------|----------|--------|-------|
| POST | `/api/auth/register` | ✅ | Valida email duplicado, contraseña débil |
| POST | `/api/auth/login` | ✅ | Devuelve JWT, valida credenciales |
| GET | `/api/auth/me` | ✅ | Requiere token, devuelve `{data: {user: {...}}}` |
| POST | `/api/auth/change-password` | ✅ | Valida contraseña actual, requiere token |

### Perfil (`/api/profile`)
| Método | Endpoint | Status | Notas |
|--------|----------|--------|-------|
| GET | `/api/profile/me` | ✅ | Devuelve `{data: {profile: {...}}}` |
| PUT | `/api/profile/me` | ✅ | Actualiza phone, bio, etc. |

### Eventos (`/api/events`)
| Método | Endpoint | Status | Notas |
|--------|----------|--------|-------|
| POST | `/api/events` | ⚠️ | Tests creados, requieren ajustes |
| POST | `/api/events/:id/register` | ⚠️ | Tests creados, requieren ajustes |
| DELETE | `/api/events/:id/register` | ⚠️ | Tests creados, requieren ajustes |

### Documentos (`/api/documents`)
| Método | Endpoint | Status | Notas |
|--------|----------|--------|-------|
| POST | `/api/documents/upload` | ⚠️ | Tests creados, pendiente validación |
| GET | `/api/documents/:id/download` | ⚠️ | Tests creados, pendiente validación |

### Administración (`/api/admin`)
| Método | Endpoint | Status | Notas |
|--------|----------|--------|-------|
| POST | `/api/admin/users/:id/approve` | ⚠️ | Tests creados, pendiente validación |
| POST | `/api/membership/payment/toggle` | ⚠️ | Tests creados, pendiente validación |

**Leyenda:**
- ✅ Validado y funcionando
- ⚠️ Test creado pero requiere ajustes
- ❌ No implementado

---

## 📊 Cobertura por Funcionalidad

| Funcionalidad | Cobertura | Tests Pasando | Prioridad |
|---------------|-----------|---------------|-----------|
| Autenticación (registro, login) | 100% | 12/12 ✅ | Alta |
| Perfil de usuario | 100% | 7/7 ✅ | Alta |
| Eventos y partidas | 17% | 2/12 ⚠️ | Media |
| Documentos | 0% | 0/16 ⚠️ | Baja |
| Administración | 0% | 0/14 ⚠️ | Media |
| **TOTAL** | **31%** | **21/61** | - |

---

## 🔒 Seguridad Validada

Tests que validan aspectos de seguridad:

✅ **Contraseñas hasheadas**: Verifica que contraseñas no se guardan en texto plano
✅ **Validación de JWT**: Verifica que tokens inválidos son rechazados
✅ **Autorización**: Verifica que endpoints protegidos requieren autenticación
✅ **Enumeración de usuarios**: Mensajes genéricos no revelan si email existe
✅ **Validación de input**: Formato de email, fortaleza de contraseña
✅ **Prevención de duplicados**: Email duplicado rechazado

---

## 💾 Base de Datos de Test

### Ubicación
`server/test.db` (SQLite file-based)

### Limpieza Automática
Después de cada test se ejecuta:
```javascript
afterEach(async () => {
  await prisma.$transaction([
    prisma.financialMovement.deleteMany(),
    prisma.financialCategory.deleteMany(),
    prisma.reportVote.deleteMany(),
    prisma.report.deleteMany(),
    prisma.document.deleteMany(),
    prisma.eventPhoto.deleteMany(),
    prisma.eventRegistration.deleteMany(),
    prisma.event.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.userBadge.deleteMany(),
    prisma.badgeDefinition.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.membership.deleteMany(),
    prisma.game.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});
```

### Resetear Manualmente
```bash
cd server
rm test.db
npm run test:uat
```

---

## 📞 Soporte

### Logs de Test
Para ver logs detallados:
```bash
npm test -- tester1.uat.test.ts --verbose
```

### Detectar Handles Abiertos
Si los tests no terminan:
```bash
npm test -- --detectOpenHandles
```

### Ver Cobertura de Código
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

---

**Última actualización:** 15 Febrero 2026
**Mantenedor:** Equipo Club DN
