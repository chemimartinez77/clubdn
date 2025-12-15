import { z } from 'zod';

/**
 * Schema de validación para login
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Email inválido'),
  password: z
    .string()
    .min(1, 'La contraseña es requerida')
});

/**
 * Schema de validación para registro
 */
export const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Email inválido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número')
});

/**
 * Schema de validación para aprobar usuario
 */
export const approveUserSchema = z.object({
  customMessage: z
    .string()
    .max(500, 'El mensaje no puede exceder 500 caracteres')
    .optional()
});

/**
 * Schema de validación para rechazar usuario
 */
export const rejectUserSchema = z.object({
  reason: z
    .string()
    .max(200, 'El motivo no puede exceder 200 caracteres')
    .optional(),
  customMessage: z
    .string()
    .max(500, 'El mensaje no puede exceder 500 caracteres')
    .optional()
});

/**
 * Schema de validación para crear/editar eventos
 */
export const createEventSchema = z.object({
  title: z
    .string()
    .min(3, 'El título debe tener al menos 3 caracteres')
    .max(100, 'El título no puede exceder 100 caracteres'),
  description: z
    .string()
    .min(10, 'La descripción debe tener al menos 10 caracteres'),
  date: z
    .string()
    .refine((val) => new Date(val) > new Date(), {
      message: 'La fecha debe ser futura'
    }),
  location: z
    .string()
    .min(3, 'La ubicación es requerida'),
  address: z
    .string()
    .optional(),
  maxAttendees: z
    .number()
    .min(1, 'Debe permitir al menos 1 asistente')
    .max(1000, 'No puede exceder 1000 asistentes')
});

// Tipos inferidos de los esquemas
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ApproveUserFormData = z.infer<typeof approveUserSchema>;
export type RejectUserFormData = z.infer<typeof rejectUserSchema>;
export type CreateEventFormData = z.infer<typeof createEventSchema>;
