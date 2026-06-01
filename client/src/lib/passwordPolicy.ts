export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_POLICY_HELP =
  'Mínimo 8 caracteres, con al menos una mayúscula, una minúscula y un número.';

export function validateStrongPassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return 'La contraseña debe tener al menos 8 caracteres';
  }

  if (!/[A-Z]/.test(password)) {
    return 'La contraseña debe contener al menos una mayúscula';
  }

  if (!/[a-z]/.test(password)) {
    return 'La contraseña debe contener al menos una minúscula';
  }

  if (!/[0-9]/.test(password)) {
    return 'La contraseña debe contener al menos un número';
  }

  return null;
}
