import notificationService from '../services/notificationService.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getNotifications = asyncHandler(async (req, res) => {
  console.log('🔔 getNotifications called for user:', req.user.id, 'with query:', req.query);
  try {
    const notifications = await notificationService.getNotifications(req.user.id, req.query);
    console.log('✅ Notifications fetched successfully:', notifications);
    return res.status(200).json(new ApiResponse(200, notifications, 'Notifications fetched successfully'));
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    throw error;
  }
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user.id);
  return res.status(200).json(new ApiResponse(200, { count }, 'Unread count fetched successfully'));
});

export const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await notificationService.markAsRead(Number(id), req.user.id);
  return res.status(200).json(new ApiResponse(200, null, 'Notification marked as read'));
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  await notificationService.markAllAsRead(req.user.id);
  return res.status(200).json(new ApiResponse(200, null, 'All notifications marked as read'));
});