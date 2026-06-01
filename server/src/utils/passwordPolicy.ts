export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_POLICY_HINT =
  'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número';

export function validateStrongPassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return 'La contraseña debe tener al menos 8 caracteres';
  }

  if (!/[A-Z]/.test(password)) {
    return 'La contraseña debe contener al menos una letra mayúscula';
  }

  if (!/[a-z]/.test(password)) {
    return 'La contraseña debe contener al menos una letra minúscula';
  }

  if (!/[0-9]/.test(password)) {
    return 'La contraseña debe contener al menos un número';
  }

  return null;
}
