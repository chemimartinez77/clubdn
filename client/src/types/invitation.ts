// client/src/types/invitation.ts
export type InvitationStatus = 'PENDING' | 'USED' | 'EXPIRED' | 'CANCELLED';

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
  guestFirstName: string;
  guestLastName: string;
  guestDniMasked?: string;
  status: InvitationStatus;
  validDate: string;
  isExceptional?: boolean;
  usedAt?: string | null;
  qrUrl?: string;
  event?: InvitationEventInfo;
  inviter?: InvitationUserInfo;
  validatedBy?: InvitationUserInfo;
}

export interface CreateInvitationPayload {
  eventId: string;
  guestFirstName: string;
  guestLastName: string;
  guestDni: string;
  isExceptional?: boolean;
}

export interface InvitationCreateResponse {
  invitation: Invitation;
  qrUrl: string;
}
