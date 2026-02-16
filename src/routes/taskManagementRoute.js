import { Router } from 'express';
import { verifyJWT, authorizeRoles } from '../middleware/auth.js';
import {
  createTask,
  getTasks,
  updateTask,
  getTaskById,
  deleteTask,
  getStaffList,
} from '../controller/taskManagementController.js';

const router = Router();

// All routes require authentication
router.use(verifyJWT);

// Get staff list for assignment - specific route first
router.get('/task-management/staff-list', getStaffList);

// Get task by ID - specific route before general
router.get('/task-management/tasks/:id', getTaskById);

// Create task
router.post('/task-management/tasks', createTask);

// Update complete task
router.put('/task-management/tasks/:id', updateTask);

// Delete task
router.delete('/task-management/tasks/:id', deleteTask);

// Get tasks (Admin sees all, Staff sees assigned) - general route last
router.get('/task-management', getTasks);

export default router;
