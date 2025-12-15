import { taskManagementService } from '../services/taskManagementService.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createTask = asyncHandler(async (req, res) => {
  const task = await taskManagementService.createTask(req.body, req.user.id);
  return res.status(201).json(new ApiResponse(201, task, 'Task assigned successfully'));
});

export const getTasks = asyncHandler(async (req, res) => {
  console.log('🎯 Controller getTasks called');
  console.log('🔍 req.query:', req.query);
  console.log('👤 req.user.id:', req.user.id);
  
  const tasks = await taskManagementService.getTasks(req.user.id, req.query);
  
  console.log('✅ Service returned:', { dataLength: tasks.data?.length, pagination: tasks.pagination });
  
  return res.status(200).json(new ApiResponse(200, tasks, 'Tasks fetched successfully'));
});

export const updateTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const task = await taskManagementService.updateTask(Number(id), req.body, req.user.id);
  return res.status(200).json(new ApiResponse(200, task, 'Task updated successfully...'));
});

export const getTaskById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const task = await taskManagementService.getTaskById(Number(id), req.user.id);
  return res.status(200).json(new ApiResponse(200, task, 'Task fetched successfully'));
});

export const deleteTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await taskManagementService.deleteTask(Number(id), req.user.id);
  return res.status(200).json(new ApiResponse(200, result, 'Task deleted successfully...'));
});

export const getStaffList = asyncHandler(async (req, res) => {
  const staff = await taskManagementService.getStaffList(req.user.id);
  return res.status(200).json(new ApiResponse(200, staff, 'Staff list fetched successfully'));
});