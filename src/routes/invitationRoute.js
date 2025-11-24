import { Router } from 'express';
import {
  setInvitedUserPassword,
  validateInvitationToken,
} from '../controller/superAdminController.js';

const router = Router();

// Public invitation routes (no auth required)
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Invitation routes are working!' });
});

router.get('/validate/:token', validateInvitationToken);
router.post('/set-password', setInvitedUserPassword);

export default router;
