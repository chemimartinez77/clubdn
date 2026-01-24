// server/src/routes/invitationRoutes.ts
import { Router } from 'express';
import { MembershipType } from '@prisma/client';
import {
  createInvitation,
  cancelInvitation,
  listInvitations,
  getInvitationByToken,
  validateInvitation,
  expireInvitations
} from '../controllers/invitationController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { requireMembershipTypes } from '../middleware/membership';

const router = Router();
const doorValidators = requireMembershipTypes([MembershipType.SOCIO, MembershipType.COLABORADOR]);

router.post('/expire', authenticate, requireAdmin, expireInvitations);
router.get('/', authenticate, doorValidators, listInvitations);
router.post('/', authenticate, doorValidators, createInvitation);
router.delete('/:id', authenticate, doorValidators, cancelInvitation);
router.post('/:token/validate', authenticate, doorValidators, validateInvitation);
router.get('/:token', authenticate, doorValidators, getInvitationByToken);

export default router;
