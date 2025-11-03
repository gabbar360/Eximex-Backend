import { PackagingService } from '../services/packagingService.js';

/**
 * Create or update packaging hierarchy for a category
 */
const createPackagingHierarchy = async (req, res) => {
  try {
    const { categoryId, packagingLevels } = req.body;

    if (!categoryId || !packagingLevels) {
      return res.status(400).json({
        success: false,
        message: 'Category ID and packaging levels array are required',
      });
    }

    // Validate packaging levels structure
    PackagingService.validatePackagingLevels(packagingLevels);

    // Create packaging hierarchy using service
    const createdHierarchy = await PackagingService.createPackagingHierarchy(
      categoryId,
      packagingLevels
    );

    res.status(201).json({
      success: true,
      data: createdHierarchy,
      message: 'Packaging hierarchy created successfully',
    });
  } catch (error) {
    console.error('Error creating packaging hierarchy:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create packaging hierarchy',
    });
  }
};

/**
 * Get packaging hierarchy for a category
 */
const getPackagingHierarchy = async (req, res) => {
  try {
    const { categoryId } = req.params;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: 'Category ID is required',
      });
    }

    // Check if category exists
    const category = await PackagingService.getCategoryById(categoryId);
    if (!category) {
      return res.json({
        success: true,
        data: [],
        message: 'Category not found',
      });
    }

    // Get packaging hierarchy
    const hierarchy = await PackagingService.getPackagingHierarchy(categoryId);

    if (hierarchy.length === 0) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const formattedHierarchy = PackagingService.formatHierarchy(hierarchy);

    res.json({
      success: true,
      data: formattedHierarchy,
    });
  } catch (error) {
    console.error('Error fetching packaging hierarchy:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch packaging hierarchy',
    });
  }
};

/**
 * Get full packaging structure for a category
 */
const getFullPackagingStructure = async (req, res) => {
  try {
    const { categoryId } = req.params;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: 'Category ID is required',
      });
    }

    // Get category details
    const category = await PackagingService.getCategoryById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Get packaging hierarchy
    const hierarchy = await PackagingService.getPackagingHierarchy(categoryId);

    // Build the complete structure
    const structure = PackagingService.buildPackagingStructure(category, hierarchy);

    res.json({
      success: true,
      data: structure,
    });
  } catch (error) {
    console.error('Error fetching packaging structure:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch packaging structure',
    });
  }
};

/**
 * Convert units based on packaging hierarchy
 */
const convertUnits = async (req, res) => {
  try {
    const { categoryId, fromUnit, toUnit, quantity } = req.body;

    // Validate input
    PackagingService.validateConversionInput(categoryId, fromUnit, toUnit, quantity);

    // Get packaging hierarchy for the category
    const hierarchy = await PackagingService.getPackagingHierarchy(categoryId);

    if (!hierarchy || hierarchy.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No packaging hierarchy found for this category',
      });
    }

    // Convert units using service
    const conversionResult = PackagingService.convertUnits(
      hierarchy,
      fromUnit,
      toUnit,
      quantity
    );

    res.json({
      success: true,
      data: conversionResult,
    });
  } catch (error) {
    console.error('Error converting units:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to convert units',
    });
  }
};

/**
 * Get all packaging units
 */
const getAllPackagingUnits = async (req, res) => {
  try {
    const units = await PackagingService.getAllPackagingUnits();

    res.json({
      success: true,
      data: units,
    });
  } catch (error) {
    console.error('Error fetching packaging units:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch packaging units',
    });
  }
};

/**
 * Create packaging units (seed data)
 */
const createPackagingUnits = async (req, res) => {
  try {
    const createdUnits = await PackagingService.createDefaultPackagingUnits();

    res.status(201).json({
      success: true,
      data: createdUnits,
      message: `${createdUnits.length} packaging units created successfully`,
    });
  } catch (error) {
    console.error('Error creating packaging units:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create packaging units',
    });
  }
};

export {
  createPackagingHierarchy,
  getPackagingHierarchy,
  getFullPackagingStructure,
  convertUnits,
  getAllPackagingUnits,
  createPackagingUnits,
};
