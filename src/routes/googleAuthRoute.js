import { Router } from 'express';
import { googleCallback, googleFailure } from '../controller/googleAuthController.js';
import passport from '../config/passport.js';

const router = Router();

// Google OAuth routes
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/api/v1/auth/google/failure' }),
  googleCallback
);
router.get('/auth/google/failure', googleFailure);

export default router;