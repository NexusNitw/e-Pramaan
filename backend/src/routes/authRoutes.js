import express from 'express';
import {
  login,
  register,
  getMe,
  seedDefaultUsers,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/login', login);
router.post('/register', register);
router.post('/seed', async (req, res, next) => {
  try {
    await seedDefaultUsers();
    res.status(200).json({
      success: true,
      message: 'Demo accounts seeded successfully. You can log in using officer@aicte.gov.in or applicant@college.edu.in with password Password@123.',
    });
  } catch (err) {
    next(err);
  }
});

// Protected profile route
router.get('/me', authenticate, getMe);

export default router;
