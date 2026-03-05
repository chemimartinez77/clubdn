/**
 * Devuelve el nombre a mostrar públicamente:
 * - Si el usuario tiene nick, devuelve el nick
 * - Si no, devuelve el nombre real
 */
export function displayName(name: string, nick?: string | null): string {
  return nick?.trim() || name;
}

/**
 * Devuelve el nombre real completo (siempre), para usar en el tooltip
 * Solo devuelve valor si es diferente al displayName (es decir, si hay nick)
 */
export function fullNameTooltip(name: string, nick?: string | null): string | undefined {
  if (nick?.trim() && nick.trim() !== name) return name;
  return undefined;
}
