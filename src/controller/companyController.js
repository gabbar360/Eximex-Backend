import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { CompanyService } from '../services/companyService.js';

export const createCompany = asyncHandler(async (req, res) => {
  const company = await CompanyService.createCompany(
    req.body,
    req.files?.logo?.[0] || null,
    req.files?.signature?.[0] || null,
    req.user.email
  );

  return res
    .status(201)
    .json(new ApiResponse(201, company, 'Company created successfully'));
});

export const updateCompany = asyncHandler(async (req, res) => {
  const updated = await CompanyService.updateCompany(
    req.params.id,
    req.body,
    req.files?.logo?.[0] || null,
    req.files?.signature?.[0] || null
  );

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

export const uploadSignature = asyncHandler(async (req, res) => {
  const companyId = req.params.id;
  const signatureFile = req.file;

  if (!signatureFile) {
    throw new ApiError(400, 'Signature file is required');
  }

  const updated = await CompanyService.updateCompany(
    companyId,
    {},
    null,
    signatureFile
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updated, 'Signature uploaded successfully'));
});
