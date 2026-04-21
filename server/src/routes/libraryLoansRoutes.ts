import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import {
  searchItem,
  requestLoan,
  confirmDelivery,
  renewLoan,
  returnLoan,
  cancelLoan,
  getMyLoans,
  getActiveLoans,
  getItemQueue,
  joinQueue,
  leaveQueue,
  toggleLoanable,
} from '../controllers/libraryLoansController';

const router = Router();

router.get('/search-item', authenticate, requireAdmin, searchItem);
router.get('/active', authenticate, requireAdmin, getActiveLoans);
router.get('/me', authenticate, getMyLoans);
router.get('/queue/:itemId', authenticate, requireAdmin, getItemQueue);

router.post('/', authenticate, requestLoan);
router.patch('/:loanId/confirm-delivery', authenticate, requireAdmin, confirmDelivery);
router.post('/:loanId/renew', authenticate, renewLoan);
router.post('/:loanId/return', authenticate, requireAdmin, returnLoan);
router.post('/:loanId/cancel', authenticate, cancelLoan);

router.post('/queue', authenticate, joinQueue);
router.delete('/queue/:itemId', authenticate, leaveQueue);

router.patch('/items/:itemId/loanable', authenticate, requireAdmin, toggleLoanable);

export default router;
