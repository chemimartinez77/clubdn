import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export const normalizeSearchTerm = (value: string) => value.trim().replace(/\s+/g, ' ');

const column = (alias: string, field: string) => Prisma.raw(`${alias}."${field}"`);

const sqlJoin = (parts: Prisma.Sql[], separator: Prisma.Sql) => {
  if (parts.length === 0) return Prisma.empty;

  return parts.slice(1).reduce(
    (acc, part) => Prisma.sql`${acc}${separator}${part}`,
    parts[0]
  );
};

const sqlAnd = (parts: Prisma.Sql[]) => sqlJoin(parts, Prisma.sql` AND `);
const sqlOr = (parts: Prisma.Sql[]) => sqlJoin(parts, Prisma.sql` OR `);

const buildUnaccentContains = (expr: Prisma.Sql, search: string) =>
  Prisma.sql`unaccent(lower(COALESCE(${expr}, ''))) LIKE unaccent(lower(${`%${search}%`}))`;

const buildProfileFirstNameExpr = (profileAlias: string) => Prisma.sql`${column(profileAlias, 'firstName')}`;
const buildProfileLastNameExpr = (profileAlias: string) => Prisma.sql`${column(profileAlias, 'lastName')}`;
const buildProfileNickExpr = (profileAlias: string) => Prisma.sql`${column(profileAlias, 'nick')}`;
const buildUserNameExpr = (userAlias: string) => Prisma.sql`${column(userAlias, 'name')}`;
const buildUserEmailExpr = (userAlias: string) => Prisma.sql`${column(userAlias, 'email')}`;

const buildProfileFullNameExpr = (profileAlias: string) =>
  Prisma.raw(
    `concat_ws(' ', NULLIF(BTRIM(${profileAlias}."firstName"), ''), NULLIF(BTRIM(${profileAlias}."lastName"), ''))`
  );

const buildProfileHasCompleteNameExpr = (profileAlias: string) =>
  Prisma.raw(
    `(NULLIF(BTRIM(${profileAlias}."firstName"), '') IS NOT NULL AND NULLIF(BTRIM(${profileAlias}."lastName"), '') IS NOT NULL)`
  );

const buildUserPersonSearchCondition = ({
  search,
  userAlias,
  profileAlias,
  includeNick,
  includeEmail,
}: {
  search: string;
  userAlias: string;
  profileAlias: string;
  includeNick: boolean;
  includeEmail: boolean;
}) => {
  const profileHasCompleteName = buildProfileHasCompleteNameExpr(profileAlias);

  const conditions: Prisma.Sql[] = [
    buildUnaccentContains(buildProfileFirstNameExpr(profileAlias), search),
    buildUnaccentContains(buildProfileLastNameExpr(profileAlias), search),
    buildUnaccentContains(buildProfileFullNameExpr(profileAlias), search),
    Prisma.sql`(NOT ${profileHasCompleteName} AND ${buildUnaccentContains(buildUserNameExpr(userAlias), search)})`,
  ];

  if (includeNick) {
    conditions.push(buildUnaccentContains(buildProfileNickExpr(profileAlias), search));
  }

  if (includeEmail) {
    conditions.push(buildUnaccentContains(buildUserEmailExpr(userAlias), search));
  }

  return Prisma.sql`(${sqlOr(conditions)})`;
};

const buildInvitationGuestSearchCondition = (search: string, invitationAlias: string) => {
  const guestFirstNameExpr = Prisma.sql`${column(invitationAlias, 'guestFirstName')}`;
  const guestLastNameExpr = Prisma.sql`${column(invitationAlias, 'guestLastName')}`;
  const guestFullNameExpr = Prisma.raw(
    `concat_ws(' ', NULLIF(BTRIM(${invitationAlias}."guestFirstName"), ''), NULLIF(BTRIM(${invitationAlias}."guestLastName"), ''))`
  );
  const guestPhoneExpr = Prisma.sql`${column(invitationAlias, 'guestPhone')}`;
  const guestDniExpr = Prisma.sql`${column(invitationAlias, 'guestDniNormalized')}`;

  return Prisma.sql`(${sqlOr([
    buildUnaccentContains(guestFirstNameExpr, search),
    buildUnaccentContains(guestLastNameExpr, search),
    buildUnaccentContains(guestFullNameExpr, search),
    buildUnaccentContains(guestPhoneExpr, search),
    buildUnaccentContains(guestDniExpr, search),
  ])})`;
};

export const findUserIdsByPersonSearch = async ({
  search,
  extraWhere = [],
  includeNick = true,
  includeEmail = false,
  orderBy = Prisma.raw('u."name" ASC'),
  limit,
}: {
  search: string;
  extraWhere?: Prisma.Sql[];
  includeNick?: boolean;
  includeEmail?: boolean;
  orderBy?: Prisma.Sql;
  limit?: number;
}): Promise<string[]> => {
  const normalizedSearch = normalizeSearchTerm(search);
  if (!normalizedSearch) return [];

  const where = sqlAnd([
    ...extraWhere,
    buildUserPersonSearchCondition({
      search: normalizedSearch,
      userAlias: 'u',
      profileAlias: 'up',
      includeNick,
      includeEmail,
    }),
  ]);

  const limitSql = typeof limit === 'number' ? Prisma.sql` LIMIT ${limit}` : Prisma.empty;

  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT DISTINCT u.id, u."name"
    FROM "User" u
    LEFT JOIN "UserProfile" up ON up."userId" = u.id
    LEFT JOIN "Membership" m ON m."userId" = u.id
    WHERE ${where}
    ORDER BY ${orderBy}
    ${limitSql}
  `);

  return rows.map(row => row.id);
};

export const findInvitationIdsByPersonSearch = async ({
  search,
  memberId,
  limit,
  offset = 0,
}: {
  search: string;
  memberId?: string;
  limit?: number;
  offset?: number;
}): Promise<string[]> => {
  const normalizedSearch = normalizeSearchTerm(search);
  if (!normalizedSearch) return [];

  const whereClauses: Prisma.Sql[] = [
    Prisma.sql`(${sqlOr([
      buildInvitationGuestSearchCondition(normalizedSearch, 'i'),
      buildUserPersonSearchCondition({
        search: normalizedSearch,
        userAlias: 'u',
        profileAlias: 'up',
        includeNick: true,
        includeEmail: false,
      }),
    ])})`,
  ];

  if (memberId) {
    whereClauses.unshift(Prisma.sql`i."memberId" = ${memberId}`);
  }

  const limitSql = typeof limit === 'number' ? Prisma.sql` LIMIT ${limit}` : Prisma.empty;
  const offsetSql = offset > 0 ? Prisma.sql` OFFSET ${offset}` : Prisma.empty;

  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT i.id
    FROM "Invitation" i
    INNER JOIN "User" u ON u.id = i."memberId"
    LEFT JOIN "UserProfile" up ON up."userId" = u.id
    WHERE ${sqlAnd(whereClauses)}
    ORDER BY i."createdAt" DESC
    ${limitSql}
    ${offsetSql}
  `);

  return rows.map(row => row.id);
};

export const countInvitationsByPersonSearch = async ({
  search,
  memberId,
}: {
  search: string;
  memberId?: string;
}): Promise<number> => {
  const normalizedSearch = normalizeSearchTerm(search);
  if (!normalizedSearch) return 0;

  const whereClauses: Prisma.Sql[] = [
    Prisma.sql`(${sqlOr([
      buildInvitationGuestSearchCondition(normalizedSearch, 'i'),
      buildUserPersonSearchCondition({
        search: normalizedSearch,
        userAlias: 'u',
        profileAlias: 'up',
        includeNick: true,
        includeEmail: false,
      }),
    ])})`,
  ];

  if (memberId) {
    whereClauses.unshift(Prisma.sql`i."memberId" = ${memberId}`);
  }

  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS count
    FROM "Invitation" i
    INNER JOIN "User" u ON u.id = i."memberId"
    LEFT JOIN "UserProfile" up ON up."userId" = u.id
    WHERE ${sqlAnd(whereClauses)}
  `);

  return Number(rows[0]?.count ?? 0n);
};

// Filtros por campo individual para el historial de invitaciones (se combinan con AND)
export const filterInvitationIdsByFields = async ({
  guestName,
  guestDni,
  guestPhone,
  memberName,
  memberId,
  limit,
  offset = 0,
}: {
  guestName?: string;
  guestDni?: string;
  guestPhone?: string;
  memberName?: string;
  memberId?: string;
  limit?: number;
  offset?: number;
}): Promise<string[]> => {
  const whereClauses: Prisma.Sql[] = [];

  if (memberId) {
    whereClauses.push(Prisma.sql`i."memberId" = ${memberId}`);
  }

  if (guestName) {
    const n = normalizeSearchTerm(guestName);
    const firstNameExpr = Prisma.sql`${column('i', 'guestFirstName')}`;
    const lastNameExpr = Prisma.sql`${column('i', 'guestLastName')}`;
    const fullNameExpr = Prisma.raw(`concat_ws(' ', NULLIF(BTRIM(i."guestFirstName"), ''), NULLIF(BTRIM(i."guestLastName"), ''))`);
    whereClauses.push(Prisma.sql`(${sqlOr([
      buildUnaccentContains(firstNameExpr, n),
      buildUnaccentContains(lastNameExpr, n),
      buildUnaccentContains(fullNameExpr, n),
    ])})`);
  }

  if (guestDni) {
    const d = normalizeSearchTerm(guestDni);
    whereClauses.push(buildUnaccentContains(Prisma.sql`${column('i', 'guestDniNormalized')}`, d));
  }

  if (guestPhone) {
    const p = normalizeSearchTerm(guestPhone);
    whereClauses.push(buildUnaccentContains(Prisma.sql`${column('i', 'guestPhone')}`, p));
  }

  if (memberName) {
    const m = normalizeSearchTerm(memberName);
    whereClauses.push(Prisma.sql`(${buildUserPersonSearchCondition({
      search: m,
      userAlias: 'u',
      profileAlias: 'up',
      includeNick: true,
      includeEmail: false,
    })})`);
  }

  if (whereClauses.length === 0) return [];

  const limitSql = typeof limit === 'number' ? Prisma.sql` LIMIT ${limit}` : Prisma.empty;
  const offsetSql = offset > 0 ? Prisma.sql` OFFSET ${offset}` : Prisma.empty;

  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT i.id
    FROM "Invitation" i
    INNER JOIN "User" u ON u.id = i."memberId"
    LEFT JOIN "UserProfile" up ON up."userId" = u.id
    WHERE ${sqlAnd(whereClauses)}
    ORDER BY i."createdAt" DESC
    ${limitSql}
    ${offsetSql}
  `);

  return rows.map(row => row.id);
};

export const countInvitationsByFields = async ({
  guestName,
  guestDni,
  guestPhone,
  memberName,
  memberId,
}: {
  guestName?: string;
  guestDni?: string;
  guestPhone?: string;
  memberName?: string;
  memberId?: string;
}): Promise<number> => {
  const whereClauses: Prisma.Sql[] = [];

  if (memberId) {
    whereClauses.push(Prisma.sql`i."memberId" = ${memberId}`);
  }

  if (guestName) {
    const n = normalizeSearchTerm(guestName);
    const firstNameExpr = Prisma.sql`${column('i', 'guestFirstName')}`;
    const lastNameExpr = Prisma.sql`${column('i', 'guestLastName')}`;
    const fullNameExpr = Prisma.raw(`concat_ws(' ', NULLIF(BTRIM(i."guestFirstName"), ''), NULLIF(BTRIM(i."guestLastName"), ''))`);
    whereClauses.push(Prisma.sql`(${sqlOr([
      buildUnaccentContains(firstNameExpr, n),
      buildUnaccentContains(lastNameExpr, n),
      buildUnaccentContains(fullNameExpr, n),
    ])})`);
  }

  if (guestDni) {
    const d = normalizeSearchTerm(guestDni);
    whereClauses.push(buildUnaccentContains(Prisma.sql`${column('i', 'guestDniNormalized')}`, d));
  }

  if (guestPhone) {
    const p = normalizeSearchTerm(guestPhone);
    whereClauses.push(buildUnaccentContains(Prisma.sql`${column('i', 'guestPhone')}`, p));
  }

  if (memberName) {
    const m = normalizeSearchTerm(memberName);
    whereClauses.push(Prisma.sql`(${buildUserPersonSearchCondition({
      search: m,
      userAlias: 'u',
      profileAlias: 'up',
      includeNick: true,
      includeEmail: false,
    })})`);
  }

  if (whereClauses.length === 0) return 0;

  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS count
    FROM "Invitation" i
    INNER JOIN "User" u ON u.id = i."memberId"
    LEFT JOIN "UserProfile" up ON up."userId" = u.id
    WHERE ${sqlAnd(whereClauses)}
  `);

  return Number(rows[0]?.count ?? 0n);
};
