import { asyncHandler } from '../utils/asyncHandler.js';
import { PartyService } from '../services/partyService.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const createParty = asyncHandler(async (req, res) => {
  const party = await PartyService.createParty(
    req.body,
    req.user.companyId,
    req.user.id
  );
  return res
    .status(201)
    .json(new ApiResponse(201, party, 'Party created successfully'));
});

export const getParties = asyncHandler(async (req, res) => {
  const parties = await PartyService.getAllParties(
    req.user.companyId,
    req.query,
    req.roleFilter || {} // Role-based filters from middleware
  );
  return res
    .status(200)
    .json(new ApiResponse(200, parties, 'Parties fetched successfully'));
});

export const getPartyById = asyncHandler(async (req, res) => {
  const party = await PartyService.getPartyById(req.params.id, true);
  return res
    .status(200)
    .json(new ApiResponse(200, party, 'Party fetched successfully'));
});

export const updateParty = asyncHandler(async (req, res) => {
  const updated = await PartyService.updateParty(req.params.id, req.body);
  return res
    .status(200)
    .json(new ApiResponse(200, updated, 'Party updated successfully'));
});

export const deleteParty = asyncHandler(async (req, res) => {
  const result = await PartyService.deleteParty(req.params.id);
  return res.status(200).json(new ApiResponse(200, null, result.message));
});

export const getPartyStats = asyncHandler(async (req, res) => {
  const stats = await PartyService.getPartyStats(req.user.companyId);
  return res
    .status(200)
    .json(new ApiResponse(200, stats, 'Party stats fetched successfully'));
});
