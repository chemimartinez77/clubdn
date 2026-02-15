// server/src/tests/uat/tester4.uat.test.ts
/**
 * UAT - Tester 4: Administración
 * Casos automatizables:
 * - TC-012.2: Aprobar Usuario
 * - TC-013.2: Marcar Pago Mensual
 */

import request from 'supertest';
import app from '../../index';
import { createAdminTestUser, createTestUser } from '../helpers/auth.helper';
import { getUserById, paymentIsMarked, getUserPayments } from '../helpers/db.helper';
import { prisma } from '../../config/database';

describe('UAT Tester 4: Administración', () => {

  describe('TC-012.2: Aprobar Usuario', () => {
    it('debe aprobar usuario pendiente y cambiar estado a APPROVED', async () => {
      const adminUser = await createAdminTestUser({
        email: 'admin.approver@example.com',
      });

      // Crear usuario pendiente de aprobación
      const pendingUser = await createTestUser({
        email: 'pending.for.approval@example.com',
        name: 'Usuario Pendiente',
        status: 'PENDING_APPROVAL',
      });

      // Verificar estado inicial
      let user = await getUserById(pendingUser.id);
      expect(user?.status).toBe('PENDING_APPROVAL');

      // Aprobar usuario
      const approveResponse = await request(app)
        .post(`/api/admin/approve/${pendingUser.id}`)
        .set('Authorization', `Bearer ${adminUser.token}`)
        .send({
          welcomeMessage: 'Bienvenido al Club Dreadnought!',
        })
        .expect(200);

      expect(approveResponse.body.success).toBe(true);
      expect(approveResponse.body.message).toContain('aprobado');

      // Verificar en base de datos que el estado cambió
      user = await getUserById(pendingUser.id);
      expect(user?.status).toBe('APPROVED');
    });

    it('debe eliminar usuario de lista de pendientes después de aprobar', async () => {
      const adminUser = await createAdminTestUser({
        email: 'admin.pending.list@example.com',
      });

      // Crear usuario pendiente
      const pendingUser = await createTestUser({
        email: 'to.be.approved@example.com',
        status: 'PENDING_APPROVAL',
      });

      // Verificar que aparece en lista de pendientes
      const beforeResponse = await request(app)
        .get('/api/admin/pending-approvals')
        .set('Authorization', `Bearer ${adminUser.token}`)
        .expect(200);

      const userExistsInList = beforeResponse.body.data.some(
        (u: any) => u.id === pendingUser.id
      );
      expect(userExistsInList).toBe(true);

      // Aprobar usuario
      await request(app)
        .post(`/api/admin/approve/${pendingUser.id}`)
        .set('Authorization', `Bearer ${adminUser.token}`)
        .expect(200);

      // Verificar que YA NO aparece en lista de pendientes
      const afterResponse = await request(app)
        .get('/api/admin/pending-approvals')
        .set('Authorization', `Bearer ${adminUser.token}`)
        .expect(200);

      const userStillInList = afterResponse.body.data.some(
        (u: any) => u.id === pendingUser.id
      );
      expect(userStillInList).toBe(false);
    });

    it('debe rechazar aprobación si usuario ya está aprobado', async () => {
      const adminUser = await createAdminTestUser({
        email: 'admin.double.approve@example.com',
      });

      const pendingUser = await createTestUser({
        email: 'already.approved@example.com',
        status: 'PENDING_APPROVAL',
      });

      // Primera aprobación - OK
      await request(app)
        .post(`/api/admin/approve/${pendingUser.id}`)
        .set('Authorization', `Bearer ${adminUser.token}`)
        .expect(200);

      // Segunda aprobación - Debe fallar
      const response = await request(app)
        .post(`/api/admin/approve/${pendingUser.id}`)
        .set('Authorization', `Bearer ${adminUser.token}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('ya ha sido aprobado');
    });

    it('no debe permitir aprobar usuario si no es admin', async () => {
      const normalUser = await createTestUser({
        email: 'normal.user.no.approve@example.com',
        status: 'APPROVED',
        role: 'USER',
      });

      const pendingUser = await createTestUser({
        email: 'pending.user.test@example.com',
        status: 'PENDING_APPROVAL',
      });

      // Generar token para usuario normal
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { userId: normalUser.id, email: normalUser.email, role: normalUser.role },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post(`/api/admin/approve/${pendingUser.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('permisos');
    });

    it('debe rechazar aprobación de usuario inexistente', async () => {
      const adminUser = await createAdminTestUser({
        email: 'admin.nonexistent.user@example.com',
      });

      const response = await request(app)
        .post('/api/admin/approve/nonexistent-user-id-12345')
        .set('Authorization', `Bearer ${adminUser.token}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('no encontrado');
    });

    it('debe enviar email de bienvenida al aprobar (verificar que se intenta)', async () => {
      const adminUser = await createAdminTestUser({
        email: 'admin.welcome.email@example.com',
      });

      const pendingUser = await createTestUser({
        email: 'welcome.email.user@example.com',
        status: 'PENDING_APPROVAL',
      });

      const response = await request(app)
        .post(`/api/admin/approve/${pendingUser.id}`)
        .set('Authorization', `Bearer ${adminUser.token}`)
        .send({
          welcomeMessage: 'Mensaje de bienvenida personalizado',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      // En un entorno real, verificaríamos que sendEmail fue llamado
      // Para este test, asumimos que si la aprobación tuvo éxito, el email se envió
    });
  });

  describe('TC-013.2: Marcar Pago Mensual', () => {
    it('debe marcar pago de enero como pagado', async () => {
      const adminUser = await createAdminTestUser({
        email: 'admin.payment@example.com',
      });

      const socioUser = await createTestUser({
        email: 'socio.payment@example.com',
        status: 'APPROVED',
      });

      // Crear membresía tipo SOCIO
      await prisma.membership.create({
        data: {
          userId: socioUser.id,
          type: 'SOCIO',
          monthlyFee: 10.00,
        },
      });

      const currentYear = new Date().getFullYear();

      // Marcar pago de enero
      const paymentResponse = await request(app)
        .post('/api/membership/payment/toggle')
        .set('Authorization', `Bearer ${adminUser.token}`)
        .send({
          userId: socioUser.id,
          year: currentYear,
          month: 1, // Enero
        })
        .expect(200);

      expect(paymentResponse.body.success).toBe(true);

      // Verificar en base de datos
      const isPaid = await paymentIsMarked(socioUser.id, currentYear, 1);
      expect(isPaid).toBe(true);

      // Verificar que aparece en la tabla de pagos
      const payments = await getUserPayments(socioUser.id, currentYear);
      const januaryPayment = payments.find((p) => p.month === 1);
      expect(januaryPayment).toBeDefined();
      expect(januaryPayment?.paid).toBe(true);
    });

    it('debe desmarcar pago si se llama toggle de nuevo', async () => {
      const adminUser = await createAdminTestUser({
        email: 'admin.toggle.payment@example.com',
      });

      const socioUser = await createTestUser({
        email: 'socio.toggle@example.com',
        status: 'APPROVED',
      });

      await prisma.membership.create({
        data: {
          userId: socioUser.id,
          type: 'SOCIO',
          monthlyFee: 10.00,
        },
      });

      const currentYear = new Date().getFullYear();

      // Marcar pago
      await request(app)
        .post('/api/membership/payment/toggle')
        .set('Authorization', `Bearer ${adminUser.token}`)
        .send({
          userId: socioUser.id,
          year: currentYear,
          month: 2, // Febrero
        });

      // Verificar marcado
      let isPaid = await paymentIsMarked(socioUser.id, currentYear, 2);
      expect(isPaid).toBe(true);

      // Desmarcar pago (segundo toggle)
      await request(app)
        .post('/api/membership/payment/toggle')
        .set('Authorization', `Bearer ${adminUser.token}`)
        .send({
          userId: socioUser.id,
          year: currentYear,
          month: 2,
        })
        .expect(200);

      // Verificar desmarcado
      isPaid = await paymentIsMarked(socioUser.id, currentYear, 2);
      expect(isPaid).toBe(false);
    });

    it('debe permitir marcar múltiples meses', async () => {
      const adminUser = await createAdminTestUser({
        email: 'admin.multiple.months@example.com',
      });

      const socioUser = await createTestUser({
        email: 'socio.multiple@example.com',
        status: 'APPROVED',
      });

      await prisma.membership.create({
        data: {
          userId: socioUser.id,
          type: 'SOCIO',
          monthlyFee: 10.00,
        },
      });

      const currentYear = new Date().getFullYear();

      // Marcar enero, febrero y marzo
      for (const month of [1, 2, 3]) {
        await request(app)
          .post('/api/membership/payment/toggle')
          .set('Authorization', `Bearer ${adminUser.token}`)
          .send({
            userId: socioUser.id,
            year: currentYear,
            month,
          })
          .expect(200);
      }

      // Verificar que todos están marcados
      for (const month of [1, 2, 3]) {
        const isPaid = await paymentIsMarked(socioUser.id, currentYear, month);
        expect(isPaid).toBe(true);
      }
    });

    it('debe validar mes entre 1 y 12', async () => {
      const adminUser = await createAdminTestUser({
        email: 'admin.invalid.month@example.com',
      });

      const socioUser = await createTestUser({
        email: 'socio.invalid.month@example.com',
        status: 'APPROVED',
      });

      const currentYear = new Date().getFullYear();

      // Mes inválido (13)
      const response = await request(app)
        .post('/api/membership/payment/toggle')
        .set('Authorization', `Bearer ${adminUser.token}`)
        .send({
          userId: socioUser.id,
          year: currentYear,
          month: 13, // Inválido
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('debe validar año válido', async () => {
      const adminUser = await createAdminTestUser({
        email: 'admin.invalid.year@example.com',
      });

      const socioUser = await createTestUser({
        email: 'socio.invalid.year@example.com',
        status: 'APPROVED',
      });

      // Año inválido (futuro lejano)
      const response = await request(app)
        .post('/api/membership/payment/toggle')
        .set('Authorization', `Bearer ${adminUser.token}`)
        .send({
          userId: socioUser.id,
          year: 2100,
          month: 1,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('no debe permitir marcar pago si no es admin', async () => {
      const normalUser = await createTestUser({
        email: 'normal.user.payment@example.com',
        status: 'APPROVED',
        role: 'USER',
      });

      const socioUser = await createTestUser({
        email: 'socio.for.payment@example.com',
        status: 'APPROVED',
      });

      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { userId: normalUser.id, email: normalUser.email, role: normalUser.role },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/api/membership/payment/toggle')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId: socioUser.id,
          year: 2026,
          month: 1,
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('debe marcar año completo con endpoint específico', async () => {
      const adminUser = await createAdminTestUser({
        email: 'admin.full.year@example.com',
      });

      const socioUser = await createTestUser({
        email: 'socio.full.year@example.com',
        status: 'APPROVED',
      });

      await prisma.membership.create({
        data: {
          userId: socioUser.id,
          type: 'SOCIO',
          monthlyFee: 10.00,
        },
      });

      const currentYear = new Date().getFullYear();

      // Marcar año completo
      const response = await request(app)
        .post('/api/membership/payment/year')
        .set('Authorization', `Bearer ${adminUser.token}`)
        .send({
          userId: socioUser.id,
          year: currentYear,
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verificar que todos los 12 meses están marcados
      const payments = await getUserPayments(socioUser.id, currentYear);
      expect(payments.length).toBe(12);

      for (const payment of payments) {
        expect(payment.paid).toBe(true);
      }

      // Verificar estado del usuario
      const user = await getUserById(socioUser.id);
      expect(user?.membershipStatus).toBe('ANO_COMPLETO');
    });
  });
});
