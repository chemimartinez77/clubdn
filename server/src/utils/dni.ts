// server/src/utils/dni.ts
const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';

export const normalizeDni = (value: string): string =>
  value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

/**
 * Valida un DNI/NIE español.
 * DNI: 8 dígitos + letra de control.
 * NIE: X/Y/Z + 7 dígitos + letra de control (X→0, Y→1, Z→2).
 */
export const isValidSpanishDni = (raw: string): boolean => {
  const dni = normalizeDni(raw);

  // NIE: empieza por X, Y o Z
  if (/^[XYZ]/.test(dni)) {
    const nieMap: Record<string, string> = { X: '0', Y: '1', Z: '2' };
    const numericPart = nieMap[dni[0]!]! + dni.slice(1, -1);
    const letter = dni.slice(-1);
    if (!/^\d{8}$/.test(numericPart)) return false;
    return DNI_LETTERS[parseInt(numericPart, 10) % 23] === letter;
  }

  // DNI: 8 dígitos + letra
  if (!/^\d{8}[A-Z]$/.test(dni)) return false;
  const number = parseInt(dni.slice(0, 8), 10);
  const letter = dni.slice(-1);
  return DNI_LETTERS[number % 23] === letter;
};
