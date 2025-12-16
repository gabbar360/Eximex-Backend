import notificationService from '../services/notificationService.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await notificationService.getNotifications(req.user.id, req.query);
  return res.status(200).json(new ApiResponse(200, notifications, 'Notifications fetched successfully'));
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

export const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await notificationService.deleteNotification(Number(id), req.user.id);
  return res.status(200).json(new ApiResponse(200, null, 'Notification deleted successfully'));
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  await notificationService.markAllAsRead(req.user.id);
  return res.status(200).json(new ApiResponse(200, null, 'All notifications marked as read'));
});