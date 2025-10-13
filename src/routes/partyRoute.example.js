import { Router } from 'express';
import {
  verifyJWT,
  requireCompany,
  scopeToCompany,
  filterByRole,
} from '../middleware/auth.js';
import {
  applyDataFilters,
  checkEntityOwnership,
  ensureEntityScoping,
} from '../middleware/dataAccess.js';
import { ActivityLogService } from '../services/activityLogService.js';

const router = Router();

// Example of how to apply the new middleware to existing routes

// GET all parties - with role-based filtering
router.get(
  '/parties',
  verifyJWT,
  requireCompany,
  applyDataFilters('partyList'),
  filterByRole,
  ActivityLogService.createActivityLogger('Party'),
  async (req, res) => {
    // Your existing controller logic here
    // req.dataFilters will contain: { companyId: user.companyId, createdBy: user.id } for staff
    // req.dataFilters will contain: { companyId: user.companyId } for admins

    const parties = await prisma.partyList.findMany({
      where: {
        ...req.dataFilters,
        status: true,
      },
    });

    res.json({ success: true, data: parties });
  }
);

// GET single party - with ownership check
router.get(
  '/parties/:id',
  verifyJWT,
  requireCompany,
  checkEntityOwnership('partyList'),
  ActivityLogService.createActivityLogger('Party'),
  async (req, res) => {
    // Your existing controller logic here
    // The middleware already verified the user can access this party

    const party = await prisma.partyList.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    res.json({ success: true, data: party });
  }
);

// POST create party - with automatic scoping
router.post(
  '/parties',
  verifyJWT,
  requireCompany,
  ensureEntityScoping,
  ActivityLogService.createActivityLogger('Party'),
  async (req, res) => {
    // Your existing controller logic here
    // req.body.companyId and req.body.createdBy are automatically set

    const party = await prisma.partyList.create({
      data: req.body,
    });

    res.json({ success: true, data: party });
  }
);

// PUT update party - with ownership check
router.put(
  '/parties/:id',
  verifyJWT,
  requireCompany,
  checkEntityOwnership('partyList'),
  ActivityLogService.createActivityLogger('Party'),
  async (req, res) => {
    // Your existing controller logic here
    // The middleware already verified the user can update this party

    const party = await prisma.partyList.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });

    res.json({ success: true, data: party });
  }
);

// DELETE party - with ownership check
router.delete(
  '/parties/:id',
  verifyJWT,
  requireCompany,
  checkEntityOwnership('partyList'),
  ActivityLogService.createActivityLogger('Party'),
  async (req, res) => {
    // Your existing controller logic here

    await prisma.partyList.update({
      where: { id: parseInt(req.params.id) },
      data: { status: false },
    });

    res.json({ success: true, message: 'Party deleted successfully' });
  }
);

export default router;
