// server/src/services/membershipFeeService.ts
import { prisma } from '../config/database';

const DEFAULT_FEES: Record<string, number> = {
  SOCIO: 19,
  COLABORADOR: 15,
  FAMILIAR: 10,
  EN_PRUEBAS: 0,
  BAJA: 0,
};

/**
 * Devuelve el mapa completo tipo→precio leyendo ClubConfig.membershipTypes,
 * con fallback a los valores por defecto si la config no existe o falla.
 */
export async function getMembershipFeeMap(): Promise<Record<string, number>> {
  try {
    const config = await prisma.clubConfig.findUnique({
      where: { id: 'club_config' },
      select: { membershipTypes: true },
    });

    if (config?.membershipTypes && Array.isArray(config.membershipTypes)) {
      const map: Record<string, number> = { ...DEFAULT_FEES };
      for (const item of config.membershipTypes as Array<{ type: string; price?: number }>) {
        if (item.type && typeof item.price === 'number') {
          map[item.type] = item.price;
        }
      }
      return map;
    }
  } catch {
    // Fallback silencioso
  }

  return { ...DEFAULT_FEES };
}

/**
 * Devuelve el precio de un tipo de membresía concreto.
 */
export async function getMembershipFee(type: string): Promise<number> {
  const map = await getMembershipFeeMap();
  return map[type] ?? 0;
}
