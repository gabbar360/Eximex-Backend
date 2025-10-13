import { prisma } from '../config/dbConfig.js';
import { DatabaseUtils } from '../utils/dbUtils.js';
import { cacheManager } from '../utils/cacheUtils.js';
import { ApiError } from '../utils/ApiError.js';
import { FileUtils } from '../utils/fileUtils.js';

const getCompanyById = async (companyId, includeRelations = false) => {
  const cacheKey = `company_${companyId}_${includeRelations}`;

  const cached = cacheManager.get(cacheKey);
  if (cached) return cached;

  const include = includeRelations ? { users: true, parties: true } : undefined;
  const company = await DatabaseUtils.findOne(
    'CompanyDetails',
    {
      id: Number(companyId),
      deletedAt: null,
    },
    undefined,
    include
  );

  if (!company) {
    throw new ApiError(404, 'Company not found');
  }

  // Ensure logo URL is properly formatted
  if (company.logo && !company.logo.startsWith('/uploads')) {
    company.logo = `/uploads/logos/${company.logo}`;
  }

  cacheManager.set(cacheKey, company, 10 * 60 * 1000);
  return company;
};

const getAllCompanies = async (options = {}) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    isActive = '',
    planId = '',
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = options;

  const where = {
    deletedAt: null,
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone_no: { contains: search, mode: 'insensitive' } },
      { gst_number: { contains: search, mode: 'insensitive' } },
      { iec_number: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (isActive !== '') {
    where.is_active = isActive === 'true';
  }

  if (planId) {
    where.plan_id = planId;
  }

  const orderBy = { [sortBy]: sortOrder };

  const result = await DatabaseUtils.findMany('CompanyDetails', {
    where,
    orderBy,
    page,
    limit,
    include: { users: true, parties: true },
  });

  // Format logo URLs for all companies
  if (result.data) {
    result.data = result.data.map((company) => {
      if (company.logo && !company.logo.startsWith('/uploads')) {
        company.logo = `/uploads/logos/${company.logo}`;
      }
      return company;
    });
  }

  return result;
};

const createCompany = async (
  companyData,
  logoFile = null,
  userEmail = null
) => {
  // Transform snake_case to camelCase for Prisma
  const transformedData = {
    name: companyData.name,
    address: companyData.address,
    phoneNo: companyData.phone_no,
    email: companyData.email,
    gstNumber: companyData.gst_number,
    iecNumber: companyData.iec_number,
    currencies: companyData.currencies,
    defaultCurrency: companyData.default_currency,
    allowedUnits: companyData.allowed_units,
    bankName: companyData.bank_name,
    bankAddress: companyData.bank_address,
    accountNumber: companyData.account_number,
    ifscCode: companyData.ifsc_code,
    swiftCode: companyData.swift_code,
    isActive: companyData.is_active,
    planId: companyData.plan_id || 'trial',
    trialEndsAt: companyData.trial_ends_at,
  };

  // Parse JSON stringified fields if needed
  if (typeof transformedData.currencies === 'string') {
    try {
      transformedData.currencies = JSON.parse(transformedData.currencies);
    } catch (e) {
      throw new Error('Invalid JSON in currencies field');
    }
  }

  if (typeof transformedData.allowedUnits === 'string') {
    try {
      transformedData.allowedUnits = JSON.parse(transformedData.allowedUnits);
    } catch (e) {
      throw new Error('Invalid JSON in allowedUnits field');
    }
  }

  // Convert boolean
  if (typeof transformedData.isActive === 'string') {
    transformedData.isActive = transformedData.isActive === 'true';
  }

  // Parse trialEndsAt to Date if it's a string
  if (
    transformedData.trialEndsAt &&
    typeof transformedData.trialEndsAt === 'string'
  ) {
    transformedData.trialEndsAt = new Date(transformedData.trialEndsAt);
  }

  // Set logo URL if file is uploaded
  if (logoFile) {
    transformedData.logo = `/uploads/logos/${logoFile.filename}`;
  }

  // Create company
  const company = await DatabaseUtils.create('CompanyDetails', transformedData);

  // Link user to company if userEmail provided
  if (userEmail) {
    await prisma.user.update({
      where: { email: userEmail },
      data: { companyId: company.id },
    });
  }

  // Ensure logo URL is properly formatted in response
  if (company.logo && !company.logo.startsWith('/uploads')) {
    company.logo = `/uploads/logos/${company.logo}`;
  }

  // Invalidate cache
  cacheManager.delete(`company_${company.id}_false`);
  cacheManager.delete(`company_${company.id}_true`);

  return company;
};

const updateCompany = async (companyId, updateData, logoFile = null) => {
  companyId = Number(companyId);
  const existingCompany = await getCompanyById(companyId);
  if (!existingCompany) {
    throw new ApiError(404, 'Company not found');
  }

  // Transform snake_case to camelCase for banking fields
  const transformedData = {};

  // Handle existing fields - both snake_case and camelCase
  if (updateData.name) transformedData.name = updateData.name;
  if (updateData.address) transformedData.address = updateData.address;
  if (updateData.phone_no) transformedData.phoneNo = updateData.phone_no;
  if (updateData.phoneNo) transformedData.phoneNo = updateData.phoneNo;
  if (updateData.email) transformedData.email = updateData.email;
  if (updateData.gst_number) transformedData.gstNumber = updateData.gst_number;
  if (updateData.gstNumber) transformedData.gstNumber = updateData.gstNumber;
  if (updateData.iec_number) transformedData.iecNumber = updateData.iec_number;
  if (updateData.iecNumber) transformedData.iecNumber = updateData.iecNumber;
  if (updateData.default_currency)
    transformedData.defaultCurrency = updateData.default_currency;
  if (updateData.defaultCurrency)
    transformedData.defaultCurrency = updateData.defaultCurrency;

  // Handle banking fields
  if (updateData.bankName !== undefined)
    transformedData.bankName = updateData.bankName;
  if (updateData.bankAddress !== undefined)
    transformedData.bankAddress = updateData.bankAddress;
  if (updateData.accountNumber !== undefined)
    transformedData.accountNumber = updateData.accountNumber;
  if (updateData.ifscCode !== undefined)
    transformedData.ifscCode = updateData.ifscCode;
  if (updateData.swiftCode !== undefined)
    transformedData.swiftCode = updateData.swiftCode;

  // Convert stringified JSON arrays to actual arrays
  if (typeof updateData.currencies === 'string') {
    try {
      transformedData.currencies = JSON.parse(updateData.currencies);
    } catch {
      throw new ApiError(400, 'Invalid format for currencies');
    }
  } else if (updateData.currencies) {
    transformedData.currencies = updateData.currencies;
  }

  if (typeof updateData.allowed_units === 'string') {
    try {
      transformedData.allowedUnits = JSON.parse(updateData.allowed_units);
    } catch {
      throw new ApiError(400, 'Invalid format for allowed_units');
    }
  } else if (updateData.allowed_units) {
    transformedData.allowedUnits = updateData.allowed_units;
  }

  // Convert string booleans to actual booleans
  if (typeof updateData.is_active === 'string') {
    transformedData.isActive = updateData.is_active === 'true';
  } else if (updateData.is_active !== undefined) {
    transformedData.isActive = updateData.is_active;
  }
  if (typeof updateData.isActive === 'boolean') {
    transformedData.isActive = updateData.isActive;
  }

  // Handle logo update and delete old logo
  if (logoFile) {
    transformedData.logo = `/uploads/logos/${logoFile.filename}`;

    // Delete old logo if it exists
    if (existingCompany.logo) {
      const filename = FileUtils.extractFilename(existingCompany.logo);
      const filePath = FileUtils.getFilePath(filename);
      FileUtils.deleteFile(filePath);
    }
  }

  // Proceed with update
  const updatedCompany = await DatabaseUtils.update(
    'CompanyDetails',
    { id: companyId },
    transformedData
  );

  // Ensure logo URL is properly formatted in response
  if (updatedCompany.logo && !updatedCompany.logo.startsWith('/uploads')) {
    updatedCompany.logo = `/uploads/logos/${updatedCompany.logo}`;
  }

  // Clear cache
  cacheManager.delete(`company_${companyId}_false`);
  cacheManager.delete(`company_${companyId}_true`);

  return updatedCompany;
};

const deleteCompany = async (companyId) => {
  // Get company without deleted_at filter to check if it exists
  const company = await DatabaseUtils.findOne('CompanyDetails', {
    id: Number(companyId),
  });
  if (!company) {
    throw new ApiError(404, 'Company not found');
  }

  // Soft delete by setting deleted_at timestamp
  await DatabaseUtils.update(
    'CompanyDetails',
    { id: Number(companyId) },
    {
      deleted_at: new Date(),
      is_active: false,
    }
  );

  cacheManager.delete(`company_${companyId}_false`);
  cacheManager.delete(`company_${companyId}_true`);

  return { message: 'Company deleted successfully' };
};

const restoreCompany = async (companyId) => {
  // Get company including deleted ones
  const company = await DatabaseUtils.findOne('CompanyDetails', {
    id: Number(companyId),
  });
  if (!company) {
    throw new ApiError(404, 'Company not found');
  }

  if (!company.deleted_at) {
    throw new ApiError(400, 'Company is not deleted');
  }

  // Restore by removing deleted_at timestamp
  await DatabaseUtils.update(
    'CompanyDetails',
    { id: Number(companyId) },
    {
      deleted_at: null,
      is_active: true,
    }
  );

  cacheManager.delete(`company_${companyId}_false`);
  cacheManager.delete(`company_${companyId}_true`);

  return { message: 'Company restored successfully' };
};

const getCompanyStats = async () => {
  const cacheKey = 'company_stats';

  const cached = cacheManager.get(cacheKey);
  if (cached) return cached;

  const [totalCompanies, activeCompanies, trialCompanies] = await Promise.all([
    DatabaseUtils.count('CompanyDetails', { deleted_at: null }),
    DatabaseUtils.count('CompanyDetails', {
      is_active: true,
      deleted_at: null,
    }),
    DatabaseUtils.count('CompanyDetails', {
      plan_id: 'trial',
      deleted_at: null,
    }),
  ]);

  const stats = {
    totalCompanies,
    activeCompanies,
    trialCompanies,
    inactiveCompanies: totalCompanies - activeCompanies,
  };

  cacheManager.set(cacheKey, stats, 5 * 60 * 1000);
  return stats;
};

export const CompanyService = {
  getCompanyById,
  getAllCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  restoreCompany,
  getCompanyStats,
};
