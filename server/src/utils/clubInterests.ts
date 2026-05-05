export interface ClubInterestConfig {
  key: string;
  label: string;
}

export const DEFAULT_CLUB_INTERESTS: ClubInterestConfig[] = [
  { key: 'eurogames', label: 'Eurogames' },
  { key: 'tematicos', label: 'Temáticos' },
  { key: 'wargames-historicos', label: 'Wargames/Históricos' },
  { key: 'rol', label: 'Rol' },
  { key: 'miniaturas', label: 'Miniaturas' },
  { key: 'warhammer', label: 'Warhammer' },
  { key: 'fillers-party', label: 'Fillers / Party' },
  { key: 'cartas-lcg-tcg', label: 'Cartas / LCG / TCG' },
  { key: 'abstractos', label: 'Abstractos' },
];

const normalizeText = (value: string) => value.trim().replace(/\s+/g, ' ');

export const normalizeClubInterestCatalog = (raw: unknown): ClubInterestConfig[] => {
  if (!Array.isArray(raw)) {
    return [...DEFAULT_CLUB_INTERESTS];
  }

  const normalized = raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;

      const key = 'key' in entry && typeof entry.key === 'string' ? normalizeText(entry.key) : '';
      const label = 'label' in entry && typeof entry.label === 'string' ? normalizeText(entry.label) : '';

      if (!key || !label) return null;

      return { key, label };
    })
    .filter((entry): entry is ClubInterestConfig => !!entry);

  const deduped: ClubInterestConfig[] = [];
  const seenKeys = new Set<string>();

  for (const entry of normalized) {
    if (seenKeys.has(entry.key)) continue;
    seenKeys.add(entry.key);
    deduped.push(entry);
  }

  return deduped.length > 0 ? deduped : [...DEFAULT_CLUB_INTERESTS];
};

export const parseClubInterestSelection = (raw: unknown): string[] | null => {
  if (raw === undefined || raw === null || raw === '') {
    return [];
  }

  let values: unknown = raw;

  if (typeof raw === 'string') {
    try {
      values = JSON.parse(raw);
    } catch {
      values = raw.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }

  if (!Array.isArray(values)) {
    return null;
  }

  const normalized = values
    .filter((item): item is string => typeof item === 'string')
    .map((item) => normalizeText(item))
    .filter(Boolean);

  return Array.from(new Set(normalized));
};

export const areClubInterestKeysValid = (selectedKeys: string[], catalog: ClubInterestConfig[]): boolean => {
  const allowed = new Set(catalog.map((entry) => entry.key));
  return selectedKeys.every((key) => allowed.has(key));
};
