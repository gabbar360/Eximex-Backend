import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.js';
import {
  getUserPermissions,
  setUserPermissions,
  getUserSidebarMenu,
  getUserWithPermissions,
  updateUserPermissions,
  deleteUserPermissions,
  getAllUsersWithPermissions,
} from '../controller/userPermissionController.js';

const router = Router();

router.get('/user-permissions/:userId', verifyJWT, getUserPermissions);
router.post('/user-permissions/:userId', verifyJWT, setUserPermissions);
router.put('/user-permissions/:userId', verifyJWT, updateUserPermissions);
router.delete('/user-permissions/:userId', verifyJWT, deleteUserPermissions);
router.get('/my-sidebar-menu', verifyJWT, getUserSidebarMenu);
router.get('/user-with-permissions/:userId', verifyJWT, getUserWithPermissions);
router.get('/all-users-permissions', verifyJWT, getAllUsersWithPermissions);

export default router;
