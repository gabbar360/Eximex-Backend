import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.js';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification } from '../controller/notificationController.js';

const router = Router();

// All routes require authentication
router.use(verifyJWT);

// Get notifications
router.get('/notifications', getNotifications);

// Get unread count
router.get('/notifications/unread-count', getUnreadCount);

// Mark notification as read
router.patch('/notifications/:id/read', markAsRead);

// Delete notification
router.delete('/notifications/:id', deleteNotification);

// Mark all notifications as read
router.patch('/notifications/mark-all-read', markAllAsRead);

export default router;