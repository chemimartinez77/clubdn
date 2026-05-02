import { Prisma } from '@prisma/client';

export const CLUB_OWNER_EMAIL = 'clubdreadnought.vlc@gmail.com';

export const buildClubOwnerWhere = (): Prisma.LibraryItemWhereInput => ({
  OR: [
    { ownerUserId: null, ownerEmail: null },
    { ownerEmail: CLUB_OWNER_EMAIL },
  ],
});

export const buildParticularOwnerWhere = (): Prisma.LibraryItemWhereInput => ({
  AND: [
    { ownerEmail: { not: null } },
    { ownerEmail: { not: CLUB_OWNER_EMAIL } },
  ],
});

export const isClubOwnerEmail = (ownerEmail: string | null | undefined): boolean =>
  !ownerEmail || ownerEmail === CLUB_OWNER_EMAIL;
