import { Router } from 'express';
import { verifyJWT, authorizeRoles } from '../middleware/auth.js';
import { createTask, getTasks, updateTaskStatus, getTaskById, deleteTask, getStaffList } from '../controller/taskManagementController.js';

const router = Router();

// All routes require authentication
router.use(verifyJWT);

// Get staff list for assignment - specific route first
router.get('/task-management/staff-list', getStaffList);

// Get task by ID - specific route before general
router.get('/task-management/tasks/:id', getTaskById);

// Create task
router.post('/task-management/tasks', createTask);

// Update task status
router.patch('/task-management/tasks/:id/status', updateTaskStatus);

// Delete task
router.delete('/task-management/tasks/:id', deleteTask);

// Get tasks (Admin sees all, Staff sees assigned) - general route last
router.get('/task-management', getTasks);

export default router;