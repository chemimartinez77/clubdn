// server/src/tests/helpers/auth.helper.ts
import { prisma } from '../../config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRole, UserStatus } from '@prisma/client';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  token?: string;
}

/**
 * Crear un usuario de prueba en la base de datos
 */
export async function createTestUser(data: Partial<TestUser> = {}): Promise<TestUser> {
  const defaultPassword = 'Test123456!';
  const hashedPassword = await bcrypt.hash(data.password || defaultPassword, 10);

  const userData = {
    email: data.email || `test-${Date.now()}@example.com`,
    password: hashedPassword,
    name: data.name || 'Test User',
    role: data.role || 'USER',
    status: data.status || 'PENDING_APPROVAL',
  };

  const user = await prisma.user.create({
    data: {
      ...userData,
      profile: {
        create: {
          phone: '+34600000000',
        }
      }
    }
  });

  return {
    id: user.id,
    email: user.email,
    password: data.password || defaultPassword,
    name: user.name,
    role: user.role,
    status: user.status,
  };
}

/**
 * Crear un usuario aprobado de prueba con token
 */
export async function createApprovedTestUser(data: Partial<TestUser> = {}): Promise<TestUser> {
  const user = await createTestUser({
    ...data,
    status: 'APPROVED',
  });

  const token = generateToken(user.id, user.email, user.role);

  return {
    ...user,
    token,
  };
}

/**
 * Crear un usuario admin de prueba con token
 */
export async function createAdminTestUser(data: Partial<TestUser> = {}): Promise<TestUser> {
  const user = await createTestUser({
    ...data,
    role: 'ADMIN',
    status: 'APPROVED',
  });

  const token = generateToken(user.id, user.email, user.role);

  return {
    ...user,
    token,
  };
}

/**
 * Generar un token JWT para un usuario
 */
export function generateToken(userId: string, email: string, role: UserRole): string {
  return jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRATION || '7d' }
  );
}

/**
 * Verificar un token JWT
 */
export function verifyToken(token: string) {
  return jwt.verify(token, process.env.JWT_SECRET!);
}
