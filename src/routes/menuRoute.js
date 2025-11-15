import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.js';
import {
  getAllMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem
} from '../controller/menuController.js';

const router = Router();

router.get('/get-menu-items', verifyJWT, getAllMenuItems);
router.get('/get-menu-items/:id', verifyJWT, getMenuItemById);
router.post('/add-menu-items', verifyJWT, createMenuItem);
router.put('/update-items/:id', verifyJWT, updateMenuItem);
router.delete('/delete-menu-items/:id', verifyJWT, deleteMenuItem);

export default router;