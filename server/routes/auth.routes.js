import express from 'express';
import {
  signup,
  login,
  getMe,
  createGuestSession,
  convertGuestToUser,
  saveRoom,
  getUserRooms
} from '../controllers/auth.controllers.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/guest', createGuestSession);

// Protected routes
router.get('/me', protect, getMe);
router.post('/convert-guest', protect, convertGuestToUser);
router.post('/save-room', protect, saveRoom);
router.get('/rooms', protect, getUserRooms);

export default router;
