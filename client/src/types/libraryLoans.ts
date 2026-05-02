export type LibraryItemLoanStatus = 'AVAILABLE' | 'REQUESTED' | 'ON_LOAN' | 'BLOCKED' | 'MAINTENANCE';
export type LibraryLoanPolicy = 'NOT_LOANABLE' | 'CONSULT' | 'LOANABLE';
export type LibraryLoanStatus = 'REQUESTED' | 'ACTIVE' | 'RETURNED' | 'CANCELLED';
export type LibraryQueueStatus = 'WAITING' | 'NOTIFIED' | 'FULFILLED' | 'CANCELLED';
export type GameCondition = 'NUEVO' | 'BUENO' | 'REGULAR' | 'MALO';

export interface LoanUser {
  id: string;
  name: string;
}

export interface LoanItem {
  id: string;
  internalId: string;
  name: string;
  gameType: string;
  condition: GameCondition;
  thumbnail: string | null;
  loanStatus: LibraryItemLoanStatus;
  loanPolicy: LibraryLoanPolicy;
}

export interface LibraryLoan {
  id: string;
  status: LibraryLoanStatus;
  loanedAt: string | null;
  dueAt: string | null;
  returnedAt: string | null;
  renewalCount: number;
  conditionOut: GameCondition | null;
  conditionIn: GameCondition | null;
  notesOut: string | null;
  notesIn: string | null;
  createdAt: string;
  libraryItem: LoanItem;
  user: LoanUser;
  loanedBy: LoanUser | null;
  returnedBy: LoanUser | null;
}

export interface QueueEntry {
  id: string;
  status: LibraryQueueStatus;
  notifiedAt: string | null;
  createdAt: string;
  user: LoanUser;
}

export interface ItemSearchResult {
  id: string;
  internalId: string;
  name: string;
  gameType: string;
  condition: GameCondition;
  thumbnail: string | null;
  loanStatus: LibraryItemLoanStatus;
  loanPolicy: LibraryLoanPolicy;
  notes: string | null;
  ownerEmail: string | null;
  loans: LibraryLoan[];
  queue: QueueEntry[];
}

export interface MemberSearchResult {
  id: string;
  name: string;
  email: string;
  nick: string | null;
  avatar: string | null;
  displayName: string;
}

export interface AdminInventoryItem {
  id: string;
  internalId: string;
  name: string;
  gameType: string;
  condition: GameCondition;
  thumbnail: string | null;
  loanStatus: LibraryItemLoanStatus;
  loanPolicy: LibraryLoanPolicy;
  notes: string | null;
  ownerEmail: string | null;
  ownerUserId: string | null;
  ownerDisplayName: string | null;
  donorUserId: string | null;
  donorDisplayName: string | null;
  acquisitionDate: string | null;
  bajaAt: string | null;
  createdAt: string;
  updatedAt: string;
  isClubOwned: boolean;
  isDonated: boolean;
  queueCount: number;
  hasActiveLoan: boolean;
}

export interface LibraryInventoryPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export type LibraryDonationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface DonationRequestAdminItem {
  id: string;
  bggId: string | null;
  name: string;
  gameType: string;
  condition: GameCondition;
  notes: string | null;
  acquisitionDate: string | null;
  status: LibraryDonationStatus;
  reviewedAt: string | null;
  rejectionReason: string | null;
  requesterUser: {
    id: string;
    name: string;
    email: string;
    profile?: {
      nick?: string | null;
      avatar?: string | null;
    } | null;
  };
  reviewerUser: {
    id: string;
    name: string;
    profile?: {
      nick?: string | null;
    } | null;
  } | null;
  requesterDisplayName: string;
  reviewerDisplayName: string | null;
  createdLibraryItemId: string | null;
  createdAt: string;
}

export interface MyQueueEntry {
  id: string;
  status: LibraryQueueStatus;
  notifiedAt: string | null;
  createdAt: string;
  libraryItem: {
    id: string;
    name: string;
    thumbnail: string | null;
    loanStatus: LibraryItemLoanStatus;
  };
}
