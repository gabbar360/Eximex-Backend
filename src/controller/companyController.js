import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { CompanyService } from '../services/companyService.js';
import multer from 'multer';

const memoryStorage = multer.memoryStorage();

const upload = multer({
  storage: memoryStorage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB
  fileFilter: (req, file, cb) => {
    // Accept image only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  },
});

export const createCompany = asyncHandler(async (req, res) => {
  const company = await CompanyService.createCompany(
    req.body,
    req.file || null,
    req.user.email
  );

  return res
    .status(201)
    .json(new ApiResponse(201, company, 'Company created successfully'));
});

export const updateCompany = asyncHandler(async (req, res) => {
  console.log('Update company request - ID:', req.params.id);
  console.log('Update company request - Body:', req.body);
  console.log('Update company request - File:', req.file);

  const updated = await CompanyService.updateCompany(
    req.params.id,
    req.body,
    req.file || null
  );

  console.log('Company updated successfully:', updated);

  return res
    .status(200)
    .json(new ApiResponse(200, updated, 'Company updated successfully'));
});

export const getCompanies = asyncHandler(async (req, res) => {
  const companies = await CompanyService.getAllCompanies(req.query);
  return res
    .status(200)
    .json(new ApiResponse(200, companies, 'Companies fetched successfully'));
});

export const getCompanyById = asyncHandler(async (req, res) => {
  const company = await CompanyService.getCompanyById(req.params.id, true);
  return res
    .status(200)
    .json(new ApiResponse(200, company, 'Company fetched successfully'));
});

export const deleteCompany = asyncHandler(async (req, res) => {
  const result = await CompanyService.deleteCompany(req.params.id);
  return res.status(200).json(new ApiResponse(200, null, result.message));
});

export const restoreCompany = asyncHandler(async (req, res) => {
  const result = await CompanyService.restoreCompany(req.params.id);
  return res.status(200).json(new ApiResponse(200, null, result.message));
});
