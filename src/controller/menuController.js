import { MenuService } from '../services/menuService.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Get all menus with submenus
export const getAllMenus = asyncHandler(async (req, res) => {
  const menus = await MenuService.getAllMenus(req.query);
  return res
    .status(200)
    .json(new ApiResponse(200, menus, 'Menus fetched successfully'));
});

// Get menu by ID
export const getMenuById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const menu = await MenuService.getMenuById(parseInt(id));
  return res
    .status(200)
    .json(new ApiResponse(200, menu, 'Menu fetched successfully'));
});

// Create new menu
export const createMenu = asyncHandler(async (req, res) => {
  const menu = await MenuService.createMenu(req.body);
  return res
    .status(201)
    .json(new ApiResponse(201, menu, 'Menu created successfully'));
});

// Update menu
export const updateMenu = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const menu = await MenuService.updateMenu(parseInt(id), req.body);
  return res
    .status(200)
    .json(new ApiResponse(200, menu, 'Menu updated successfully'));
});

// Delete menu
export const deleteMenu = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await MenuService.deleteMenu(parseInt(id));
  return res
    .status(200)
    .json(new ApiResponse(200, null, 'Menu deleted successfully'));
});

// Create submenu
export const createSubmenu = asyncHandler(async (req, res) => {
  const submenu = await MenuService.createSubmenu(req.body);
  return res
    .status(201)
    .json(new ApiResponse(201, submenu, 'Submenu created successfully'));
});

// Update submenu
export const updateSubmenu = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const submenu = await MenuService.updateSubmenu(parseInt(id), req.body);
  return res
    .status(200)
    .json(new ApiResponse(200, submenu, 'Submenu updated successfully'));
});

// Delete submenu
export const deleteSubmenu = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await MenuService.deleteSubmenu(parseInt(id));
  return res
    .status(200)
    .json(new ApiResponse(200, null, 'Submenu deleted successfully'));
});
