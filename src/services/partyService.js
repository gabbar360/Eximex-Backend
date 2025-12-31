import { DatabaseUtils } from '../utils/dbUtils.js';
import { cacheManager } from '../utils/cacheUtils.js';
import { ApiError } from '../utils/ApiError.js';
import bcrypt from 'bcryptjs';
import { UserService } from './userService.js';

const getPartyById = async (partyId, includeRelations = false) => {
  const cacheKey = `party_${partyId}_${includeRelations}`;
  const cached = cacheManager.get(cacheKey);
  if (cached) return cached;

  const include = includeRelations ? { company: true, user: true } : undefined;
  const party = await DatabaseUtils.findOne(
    'partyList',
    { id: Number(partyId) },
    undefined,
    include
  );

  if (!party) {
    throw new ApiError(404, 'Party not found');
  }

  cacheManager.set(cacheKey, party, 10 * 60 * 1000);
  return party;
};

const getAllParties = async (companyId, options = {}, dataFilters = {}) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    role = '',
    partyType = '',
    status = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  // Convert to integers
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;

  const where = {
    companyId: Number(companyId),
    ...dataFilters,
  };

  // Handle search with proper null checks
  if (search && search.trim() && search.trim().length > 0) {
    const searchTerm = search.trim();
    const searchConditions = [
      { companyName: { contains: searchTerm, mode: 'insensitive' } },
      { contactPerson: { contains: searchTerm, mode: 'insensitive' } },
      { email: { contains: searchTerm, mode: 'insensitive' } },
      { phone: { contains: searchTerm, mode: 'insensitive' } },
      { city: { contains: searchTerm, mode: 'insensitive' } },
      { country: { contains: searchTerm, mode: 'insensitive' } },
      { state: { contains: searchTerm, mode: 'insensitive' } },
      { address: { contains: searchTerm, mode: 'insensitive' } },
      { partyType: { contains: searchTerm, mode: 'insensitive' } },
    ];

    // Handle Role enum search
    const roleValues = ['Customer', 'Lead', 'Freight_Forwarder', 'Vendor', 'Agent', 'CHA', 'Transporter', 'Supplier'];
    const matchingRoles = roleValues.filter(role => 
      role.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (matchingRoles.length > 0) {
      searchConditions.push({ role: { in: matchingRoles } });
    }

    // Handle Stage enum search
    const stageValues = ['NEW', 'QUALIFIED', 'NEGOTIATION', 'QUOTATION_SENT', 'WON'];
    const matchingStages = stageValues.filter(stage => 
      stage.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (matchingStages.length > 0) {
      searchConditions.push({ stage: { in: matchingStages } });
    }

    // Handle Status boolean search
    if (searchTerm.toLowerCase().includes('active')) {
      searchConditions.push({ status: true });
    }
    if (searchTerm.toLowerCase().includes('inactive')) {
      searchConditions.push({ status: false });
    }

    where.OR = searchConditions;
  }

  if (role) where.role = role;
  if (partyType) where.partyType = partyType;
  if (status !== '') where.status = status === 'true';

  const orderBy = { [sortBy]: sortOrder };

  try {
    const result = await DatabaseUtils.findMany('partyList', {
      where,
      orderBy,
      page: pageNum,
      limit: limitNum,
      include: { company: true, user: true },
    });

    return result;
  } catch (error) {
    console.error('Party service error:', error);
    throw error;
  }
};

const createParty = async (partyData, companyId, userId = null) => {
  if (partyData.email) {
    const existingParty = await DatabaseUtils.findOne('partyList', {
      email: partyData.email,
    });
    if (existingParty) {
      throw new ApiError(409, 'Party with this email already exists');
    }
  }

  // Map frontend 'name' field to backend 'companyName' field
  if (partyData.name && !partyData.companyName) {
    partyData.companyName = partyData.name;
    delete partyData.name;
  }

  if (partyData.password) {
    partyData.password = await bcrypt.hash(partyData.password, 12);
  }

  partyData.companyId = Number(companyId);

  // Add createdBy field
  if (userId) {
    partyData.createdBy = Number(userId);
  }

  // Ensure companyName is set
  if (!partyData.companyName) {
    const company = await DatabaseUtils.findOne('companyDetails', {
      id: Number(companyId),
    });
    partyData.companyName = company?.name || 'Unknown';
  }

  // Map role values to match enum and set partyType
  if (partyData.role) {
    const roleMap = {
      customer: 'Customer',
      supplier: 'Supplier',
      vendor: 'Vendor',
    };

    const normalizedRole = partyData.role.toLowerCase();
    partyData.role = roleMap[normalizedRole] || 'Customer';

    // Set partyType based on role
    if (!partyData.partyType) {
      partyData.partyType =
        normalizedRole === 'supplier'
          ? 'supplier'
          : normalizedRole === 'vendor'
            ? 'vendor'
            : 'customer';
    }
  }

  // Ensure partyType is set
  if (!partyData.partyType) {
    partyData.partyType = 'customer'; // default
  }

  // Ensure status is boolean
  if (partyData.status !== undefined) {
    partyData.status = Boolean(partyData.status);
  }

  // Set default stage for Customer role
  if (partyData.role === 'Customer' && !partyData.stage) {
    partyData.stage = 'NEW';
  }

  const party = await DatabaseUtils.create('partyList', partyData);

  cacheManager.delete(`party_${party.id}_false`);
  cacheManager.delete(`party_${party.id}_true`);

  // Clear dashboard cache so admin sees updated counts
  UserService.clearCompanyDashboardCache(companyId);

  return party;
};

const updateParty = async (partyId, updateData) => {
  const existingParty = await getPartyById(partyId);

  // Map frontend 'name' field to backend 'companyName' field
  if (updateData.name && !updateData.companyName) {
    updateData.companyName = updateData.name;
    delete updateData.name;
  }

  if (updateData.email && updateData.email !== existingParty.email) {
    const conflictParty = await DatabaseUtils.findOne('partyList', {
      email: updateData.email,
    });
    if (conflictParty && conflictParty.id !== Number(partyId)) {
      throw new ApiError(409, 'Email already exists');
    }
  }

  // Map role values to match enum and set partyType
  if (updateData.role) {
    const roleMap = {
      customer: 'Customer',
      supplier: 'Supplier',
      vendor: 'Vendor',
    };

    const normalizedRole = updateData.role.toLowerCase();
    updateData.role = roleMap[normalizedRole] || 'Customer';

    // Set partyType based on role
    if (!updateData.partyType) {
      updateData.partyType =
        normalizedRole === 'supplier'
          ? 'supplier'
          : normalizedRole === 'vendor'
            ? 'vendor'
            : 'customer';
    }
  }

  // Ensure status is boolean
  if (updateData.status !== undefined) {
    updateData.status = Boolean(updateData.status);
  }

  if (updateData.password) {
    updateData.password = await bcrypt.hash(updateData.password, 12);
  }

  const updatedParty = await DatabaseUtils.update(
    'partyList',
    { id: Number(partyId) },
    updateData
  );

  cacheManager.delete(`party_${partyId}_false`);
  cacheManager.delete(`party_${partyId}_true`);

  return updatedParty;
};

const deleteParty = async (partyId) => {
  const party = await getPartyById(partyId);
  await DatabaseUtils.delete('partyList', { id: Number(partyId) });

  cacheManager.delete(`party_${partyId}_false`);
  cacheManager.delete(`party_${partyId}_true`);

  return { message: 'Party deleted successfully' };
};

const getPartyStats = async (companyId) => {
  const cacheKey = `party_stats_${companyId}`;
  const cached = cacheManager.get(cacheKey);
  if (cached) return cached;

  const [
    totalParties,
    activeParties,
    customerParties,
    vendorParties,
    customerTypeParties,
    vendorTypeParties,
  ] = await Promise.all([
    DatabaseUtils.count('partyList', { companyId: Number(companyId) }),
    DatabaseUtils.count('partyList', {
      companyId: Number(companyId),
      status: true,
    }),
    DatabaseUtils.count('partyList', {
      companyId: Number(companyId),
      role: 'Customer',
    }),
    DatabaseUtils.count('partyList', {
      companyId: Number(companyId),
      role: 'Vendor',
    }),
    DatabaseUtils.count('partyList', {
      companyId: Number(companyId),
      partyType: 'customer',
    }),
    DatabaseUtils.count('partyList', {
      companyId: Number(companyId),
      partyType: 'vendor',
    }),
  ]);

  const stats = {
    totalParties,
    activeParties,
    customerParties,
    vendorParties,
    customerTypeParties,
    vendorTypeParties,
    inactiveParties: totalParties - activeParties,
  };

  cacheManager.set(cacheKey, stats, 5 * 60 * 1000);
  return stats;
};


const updatePartyStage = async (partyId, stage) => {
  const validStages = ['NEW', 'QUALIFIED', 'NEGOTIATION', 'QUOTATION_SENT', 'WON', 'LOST'];
  
  if (!validStages.includes(stage)) {
    throw new ApiError(400, 'Invalid stage');
  }

  const updatedParty = await DatabaseUtils.update(
    'partyList',
    { id: Number(partyId) },
    { stage }
  );

  cacheManager.delete(`party_${partyId}_false`);
  cacheManager.delete(`party_${partyId}_true`);

  return updatedParty;
};

export const PartyService = {
  getPartyById,
  getAllParties,
  createParty,
  updateParty,
  deleteParty,
  getPartyStats,
  updatePartyStage,
};
