// server/src/tests/uat/tester1.uat.test.ts
/**
 * UAT - Tester 1: Usuario Básico
 * Casos automatizables:
 * - TC-001.1: Registro de Nuevo Usuario
 * - TC-001.2: Login de Usuario Aprobado
 * - TC-001.3: Login con Credenciales Incorrectas
 * - TC-009.2: Editar Perfil
 * - TC-009.3: Cambiar Contraseña
 */

import request from 'supertest';
import app from '../../index';
import { createTestUser, createApprovedTestUser } from '../helpers/auth.helper';
import { getUserByEmail, getUserById } from '../helpers/db.helper';

describe('UAT Tester 1: Usuario Básico', () => {

  describe('TC-001.1: Registro de Nuevo Usuario', () => {
    it('debe registrar un nuevo usuario con estado PENDING_VERIFICATION', async () => {
      const userData = {
        name: 'Juan Pérez',
        email: 'juan.perez@example.com',
        password: 'SecurePass123!',
        phone: '+34600111222',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Verificar respuesta API
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Registro exitoso');

      // Verificar en base de datos
      const user = await getUserByEmail(userData.email);
      expect(user).toBeDefined();
      expect(user?.name).toBe(userData.name);
      expect(user?.email).toBe(userData.email);
      expect(user?.status).toBe('PENDING_VERIFICATION');
      expect(user?.role).toBe('USER');

      // Verificar que la contraseña está hasheada (no en texto plano)
      expect(user?.password).not.toBe(userData.password);
    });

    it('no debe permitir registrar un email duplicado', async () => {
      const userData = {
        name: 'María González',
        email: 'maria.gonzalez@example.com',
        password: 'SecurePass123!',
        phone: '+34600333444',
      };

      // Primer registro
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Intento de segundo registro con mismo email
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('ya está registrado');
    });

    it('debe validar formato de email incorrecto', async () => {
      const userData = {
        name: 'Pedro López',
        email: 'email-invalido',
        password: 'SecurePass123!',
        phone: '+34600555666',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('debe validar contraseña débil', async () => {
      const userData = {
        name: 'Ana Martínez',
        email: 'ana.martinez@example.com',
        password: '12345',  // Contraseña demasiado corta
        phone: '+34600777888',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('TC-001.2: Login de Usuario Aprobado', () => {
    it('debe permitir login a usuario aprobado y devolver token JWT', async () => {
      // Crear usuario aprobado
      const testUser = await createApprovedTestUser({
        email: 'approved.user@example.com',
        password: 'Password123!',
        name: 'Usuario Aprobado',
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      // Verificar respuesta
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user.name).toBe(testUser.name);
      expect(response.body.data.user.status).toBe('APPROVED');

      // Verificar formato del token (JWT tiene 3 partes separadas por puntos)
      const token = response.body.data.token;
      expect(token.split('.').length).toBe(3);
    });

    it('debe poder acceder a endpoints protegidos con el token', async () => {
      // Crear usuario aprobado con token
      const testUser = await createApprovedTestUser({
        email: 'token.test@example.com',
        password: 'Password123!',
      });

      // Login para obtener token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      const token = loginResponse.body.data.token;

      // Intentar acceder a endpoint protegido /me
      const meResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(meResponse.body.success).toBe(true);
      expect(meResponse.body.data.user.email).toBe(testUser.email);
    });

    it('no debe permitir login a usuario pendiente de aprobación', async () => {
      // Crear usuario NO aprobado
      const pendingUser = await createTestUser({
        email: 'pending.user@example.com',
        password: 'Password123!',
        status: 'PENDING_APPROVAL',
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: pendingUser.email,
          password: pendingUser.password,
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('pendiente de aprobación');
    });
  });

  describe('TC-001.3: Login con Credenciales Incorrectas', () => {
    it('debe rechazar login con contraseña incorrecta', async () => {
      const testUser = await createApprovedTestUser({
        email: 'wrong.password@example.com',
        password: 'CorrectPassword123!',
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Credenciales incorrectas');
    });

    it('debe rechazar login con email inexistente', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'noexiste@example.com',
          password: 'Password123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Credenciales incorrectas');
    });

    it('no debe revelar si el email existe o no (mensaje genérico)', async () => {
      const testUser = await createApprovedTestUser({
        email: 'exists@example.com',
        password: 'Password123!',
      });

      // Login con email existente pero contraseña incorrecta
      const response1 = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        });

      // Login con email inexistente
      const response2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'notexists@example.com',
          password: 'SomePassword123!',
        });

      // Ambos deben devolver el mismo mensaje genérico
      expect(response1.body.message).toBe(response2.body.message);
    });

    it('debe rechazar login sin email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'Password123!',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('debe rechazar login sin contraseña', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('TC-009.2: Editar Perfil', () => {
    it('debe permitir actualizar teléfono y biografía', async () => {
      const testUser = await createApprovedTestUser({
        email: 'edit.profile@example.com',
        password: 'Password123!',
        name: 'Usuario Original',
      });

      const updateData = {
        phone: '+34611222333',
        bio: 'Amante de los juegos de mesa estratégicos',
      };

      const response = await request(app)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.profile.phone).toBe(updateData.phone);
      expect(response.body.data.profile.bio).toBe(updateData.bio);

      // Verificar en base de datos
      const updatedUser = await getUserById(testUser.id);
      expect(updatedUser?.profile?.phone).toBe(updateData.phone);
      expect(updatedUser?.profile?.bio).toBe(updateData.bio);
    });

    it('debe permitir actualizar biografía', async () => {
      const testUser = await createApprovedTestUser({
        email: 'change.bio@example.com',
        name: 'Usuario Test',
      });

      const response = await request(app)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          bio: 'Nueva biografía actualizada',
        })
        .expect(200);

      expect(response.body.data.profile.bio).toBe('Nueva biografía actualizada');
    });

    it('no debe permitir actualizar perfil sin autenticación', async () => {
      await request(app)
        .put('/api/profile/me')
        .send({
          phone: '+34999888777',
        })
        .expect(401);
    });
  });

  describe('TC-009.3: Cambiar Contraseña', () => {
    it('debe permitir cambiar contraseña con credenciales correctas', async () => {
      const originalPassword = 'OldPassword123!';
      const newPassword = 'NewPassword456!';

      const testUser = await createApprovedTestUser({
        email: 'change.password@example.com',
        password: originalPassword,
      });

      // Cambiar contraseña
      const changeResponse = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          currentPassword: originalPassword,
          newPassword: newPassword,
        })
        .expect(200);

      expect(changeResponse.body.success).toBe(true);

      // Verificar que NO se puede hacer login con contraseña antigua
      const oldPasswordResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: originalPassword,
        })
        .expect(401);

      expect(oldPasswordResponse.body.success).toBe(false);

      // Verificar que SÍ se puede hacer login con contraseña nueva
      const newPasswordResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: newPassword,
        })
        .expect(200);

      expect(newPasswordResponse.body.success).toBe(true);
      expect(newPasswordResponse.body.data).toHaveProperty('token');
    });

    it('debe rechazar cambio de contraseña si la actual es incorrecta', async () => {
      const testUser = await createApprovedTestUser({
        email: 'wrong.current.password@example.com',
        password: 'CorrectPassword123!',
      });

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          currentPassword: 'WrongCurrentPassword!',
          newPassword: 'NewPassword456!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('incorrecta');
    });

    it('debe validar que la nueva contraseña cumpla requisitos', async () => {
      const testUser = await createApprovedTestUser({
        email: 'weak.new.password@example.com',
        password: 'CurrentPassword123!',
      });

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          currentPassword: 'CurrentPassword123!',
          newPassword: '123',  // Contraseña demasiado débil
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('no debe permitir cambiar contraseña sin autenticación', async () => {
      await request(app)
        .post('/api/auth/change-password')
        .send({
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword456!',
        })
        .expect(401);
    });
  });
});
