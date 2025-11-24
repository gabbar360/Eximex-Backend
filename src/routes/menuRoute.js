import { Router } from 'express';
import { verifyJWT, authorizeRoles } from '../middleware/auth.js';
import {
  getAllMenus,
  getMenuById,
  createMenu,
  updateMenu,
  deleteMenu,
  createSubmenu,
  updateSubmenu,
  deleteSubmenu
} from '../controller/menuController.js';

const router = Router();

// Menu routes (Super Admin only)
router.get('/menus', verifyJWT, authorizeRoles('SUPER_ADMIN'), getAllMenus);
router.get('/menus/:id', verifyJWT, authorizeRoles('SUPER_ADMIN'), getMenuById);
router.post('/menus', verifyJWT, authorizeRoles('SUPER_ADMIN'), createMenu);
router.put('/menus/:id', verifyJWT, authorizeRoles('SUPER_ADMIN'), updateMenu);
router.delete('/menus/:id', verifyJWT, authorizeRoles('SUPER_ADMIN'), deleteMenu);

// Submenu routes (Super Admin only)
router.post('/submenus', verifyJWT, authorizeRoles('SUPER_ADMIN'), createSubmenu);
router.put('/submenus/:id', verifyJWT, authorizeRoles('SUPER_ADMIN'), updateSubmenu);
router.delete('/submenus/:id', verifyJWT, authorizeRoles('SUPER_ADMIN'), deleteSubmenu);

export default router;