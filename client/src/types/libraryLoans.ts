export type LibraryItemLoanStatus = 'AVAILABLE' | 'REQUESTED' | 'ON_LOAN' | 'BLOCKED' | 'MAINTENANCE';
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
  isLoanable: boolean;
  notes: string | null;
  ownerEmail: string | null;
  loans: LibraryLoan[];
  queue: QueueEntry[];
}
