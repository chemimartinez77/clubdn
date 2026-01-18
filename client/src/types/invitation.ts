// client/src/types/invitation.ts
export type InvitationStatus = 'PENDING' | 'USED' | 'EXPIRED';

export interface InvitationEventInfo {
  id: string;
  title: string;
  date: string;
}

export interface InvitationUserInfo {
  id: string;
  name: string;
}

export interface Invitation {
  id: string;
  guestName: string;
  status: InvitationStatus;
  validDate: string;
  isExceptional?: boolean;
  usedAt?: string | null;
  event?: InvitationEventInfo;
  inviter?: InvitationUserInfo;
  validatedBy?: InvitationUserInfo;
}

export interface CreateInvitationPayload {
  eventId: string;
  guestName: string;
  isExceptional?: boolean;
}

export interface InvitationCreateResponse {
  invitation: Invitation;
  qrUrl: string;
}
