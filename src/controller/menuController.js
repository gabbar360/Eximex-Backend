import { menuService } from '../services/menuService.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getAllMenuItems = asyncHandler(async (req, res) => {
  const menuItems = await menuService.getAllMenuItems();
  return res.status(200).json(
    new ApiResponse(200, menuItems, 'Menu items fetched successfully')
  );
});

export const getMenuItemById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const menuItem = await menuService.getMenuItemById(parseInt(id));
  
  if (!menuItem) {
    throw new ApiError(404, 'Menu item not found');
  }
  
  return res.status(200).json(
    new ApiResponse(200, menuItem, 'Menu item fetched successfully')
  );
});

export const createMenuItem = asyncHandler(async (req, res) => {
  const menuItem = await menuService.createMenuItem(req.body);
  return res.status(201).json(
    new ApiResponse(201, menuItem, 'Menu item created successfully')
  );
});

export const updateMenuItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const menuItem = await menuService.updateMenuItem(parseInt(id), req.body);
  return res.status(200).json(
    new ApiResponse(200, menuItem, 'Menu item updated successfully')
  );
});

export const deleteMenuItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await menuService.deleteMenuItem(parseInt(id));
  return res.status(200).json(
    new ApiResponse(200, null, 'Menu item deleted successfully')
  );
});