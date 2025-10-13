import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Create or update packaging hierarchy for a category
 */
const createPackagingHierarchy = async (req, res) => {
  try {
    const { categoryId, packagingLevels } = req.body;
    const userId = req.user.id;

    if (!categoryId || !packagingLevels || !Array.isArray(packagingLevels)) {
      return res.status(400).json({
        success: false,
        message: 'Category ID and packaging levels array are required',
      });
    }

    // Validate packaging levels structure
    for (let i = 0; i < packagingLevels.length; i++) {
      const level = packagingLevels[i];
      if (
        !level.parentUnitId ||
        !level.childUnitId ||
        !level.conversionQuantity
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid packaging level at index ${i}. parentUnitId, childUnitId, and conversionQuantity are required.`,
        });
      }
    }

    // Delete existing packaging hierarchy for this category
    await prisma.packagingHierarchy.deleteMany({
      where: { categoryId: Number(categoryId) },
    });

    // Create new packaging hierarchy
    const createdHierarchy = [];

    for (let i = 0; i < packagingLevels.length; i++) {
      const level = packagingLevels[i];

      const hierarchy = await prisma.packagingHierarchy.create({
        data: {
          categoryId: Number(categoryId),
          level: i + 1,
          parentUnitId: Number(level.parentUnitId),
          childUnitId: Number(level.childUnitId),
          conversionQuantity: Number(level.conversionQuantity),
          isActive: true,
        },
        include: {
          parentUnit: true,
          childUnit: true,
        },
      });

      createdHierarchy.push(hierarchy);
    }

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

    // First check if the category exists
    const category = await prisma.itemCategory.findUnique({
      where: { id: Number(categoryId) },
      select: {
        id: true,
        name: true,
        primary_unit: true,
      },
    });

    // If category doesn't exist, return empty array with success true
    // This allows the frontend to handle the case gracefully
    if (!category) {
      return res.json({
        success: true,
        data: [],
        message: 'Category not found',
      });
    }

    const hierarchy = await prisma.packagingHierarchy.findMany({
      where: {
        categoryId: Number(categoryId),
        isActive: true,
      },
      include: {
        parentUnit: true,
        childUnit: true,
      },
      orderBy: { level: 'asc' },
    });

    // If no hierarchy exists, return an empty array but with success true
    if (hierarchy.length === 0) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const formattedHierarchy = hierarchy.map((h) => ({
      level: h.level,
      from: h.parentUnit.name,
      fromAbbr: h.parentUnit.abbreviation,
      to: h.childUnit.name,
      toAbbr: h.childUnit.abbreviation,
      quantity: h.conversionQuantity,
      parentUnitId: h.parentUnitId,
      childUnitId: h.childUnitId,
      conversionQuantity: h.conversionQuantity, // Make sure this field is included
    }));

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
    const category = await prisma.itemCategory.findUnique({
      where: { id: Number(categoryId) },
      select: {
        id: true,
        name: true,
        primary_unit: true,
        secondary_unit: true,
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Get packaging hierarchy
    const hierarchy = await prisma.packagingHierarchy.findMany({
      where: {
        categoryId: Number(categoryId),
        isActive: true,
      },
      include: {
        parentUnit: true,
        childUnit: true,
      },
      orderBy: { level: 'asc' },
    });

    const formattedHierarchy = hierarchy.map((h) => ({
      level: h.level,
      from: h.parentUnit.name,
      fromAbbr: h.parentUnit.abbreviation,
      to: h.childUnit.name,
      toAbbr: h.childUnit.abbreviation,
      quantity: h.conversionQuantity,
      parentUnitId: h.parentUnitId,
      childUnitId: h.childUnitId,
    }));

    // Build the complete structure
    const structure = {
      category: {
        id: category.id,
        name: category.name,
        primaryUnit: category.primary_unit,
        secondaryUnit: category.secondary_unit,
      },
      packagingLevels: formattedHierarchy,
      conversionChain: formattedHierarchy.map((level, index) => ({
        level: index + 1,
        conversion: `${level.quantity} ${level.from} = 1 ${level.to}`,
        ratio: level.quantity,
      })),
    };

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

    if (!categoryId || !fromUnit || !toUnit || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Category ID, fromUnit, toUnit, and quantity are required',
      });
    }

    if (isNaN(quantity) || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a valid positive number',
      });
    }

    if (fromUnit === toUnit) {
      return res.json({
        success: true,
        data: {
          originalQuantity: quantity,
          convertedQuantity: quantity,
          fromUnit,
          toUnit,
          conversionPath: [],
        },
      });
    }

    // Get packaging hierarchy for the category
    const hierarchy = await prisma.packagingHierarchy.findMany({
      where: {
        categoryId: Number(categoryId),
        isActive: true,
      },
      include: {
        parentUnit: true,
        childUnit: true,
      },
      orderBy: { level: 'asc' },
    });

    if (!hierarchy || hierarchy.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No packaging hierarchy found for this category',
      });
    }

    // Build conversion path
    const conversionPath = [];
    let currentQuantity = Number(quantity);
    let currentUnit = fromUnit;
    let found = false;

    // Try to convert step by step through the hierarchy
    for (const level of hierarchy) {
      if (
        level.parentUnit.name === currentUnit ||
        level.parentUnit.abbreviation === currentUnit
      ) {
        if (
          level.childUnit.name === toUnit ||
          level.childUnit.abbreviation === toUnit
        ) {
          // Direct conversion found
          currentQuantity = currentQuantity / level.conversionQuantity;
          conversionPath.push({
            from: currentUnit,
            to: level.childUnit.name,
            quantity: level.conversionQuantity,
            step: `${currentQuantity * level.conversionQuantity} ${currentUnit} = ${currentQuantity} ${level.childUnit.name}`,
          });
          currentUnit = level.childUnit.name;
          found = true;
          break;
        } else {
          // Intermediate conversion
          currentQuantity = currentQuantity / level.conversionQuantity;
          conversionPath.push({
            from: currentUnit,
            to: level.childUnit.name,
            quantity: level.conversionQuantity,
            step: `${currentQuantity * level.conversionQuantity} ${currentUnit} = ${currentQuantity} ${level.childUnit.name}`,
          });
          currentUnit = level.childUnit.name;
        }
      }
    }

    // Continue searching if not found yet
    if (!found && currentUnit !== toUnit) {
      for (const level of hierarchy) {
        if (
          (level.parentUnit.name === currentUnit ||
            level.parentUnit.abbreviation === currentUnit) &&
          (level.childUnit.name === toUnit ||
            level.childUnit.abbreviation === toUnit)
        ) {
          currentQuantity = currentQuantity / level.conversionQuantity;
          conversionPath.push({
            from: currentUnit,
            to: level.childUnit.name,
            quantity: level.conversionQuantity,
            step: `${currentQuantity * level.conversionQuantity} ${currentUnit} = ${currentQuantity} ${level.childUnit.name}`,
          });
          found = true;
          break;
        }
      }
    }

    if (!found) {
      return res.status(400).json({
        success: false,
        message: `Cannot convert from ${fromUnit} to ${toUnit}. No conversion path found.`,
      });
    }

    res.json({
      success: true,
      data: {
        originalQuantity: Number(quantity),
        convertedQuantity: Math.round(currentQuantity * 100) / 100, // Round to 2 decimal places
        fromUnit,
        toUnit,
        conversionPath,
      },
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
    const units = await prisma.packagingUnit.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

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
    const defaultUnits = [
      { name: 'Pieces', abbreviation: 'PCS', description: 'Individual pieces' },
      {
        name: 'Square Meter',
        abbreviation: 'SQMT',
        description: 'Square meter measurement',
      },
      {
        name: 'Square Feet',
        abbreviation: 'SQFT',
        description: 'Square feet measurement',
      },
      {
        name: 'Kilogram',
        abbreviation: 'KG',
        description: 'Weight in kilograms',
      },
      { name: 'Gram', abbreviation: 'GM', description: 'Weight in grams' },
      {
        name: 'Metric Ton',
        abbreviation: 'MT',
        description: 'Weight in metric tons',
      },
      { name: 'Liter', abbreviation: 'LTR', description: 'Volume in liters' },
      { name: 'Box', abbreviation: 'BOX', description: 'Packaging box' },
      { name: 'Package', abbreviation: 'PKG', description: 'Package unit' },
      { name: 'Pallet', abbreviation: 'PLT', description: 'Pallet unit' },
      { name: 'Carton', abbreviation: 'CTN', description: 'Carton packaging' },
      { name: 'Bundle', abbreviation: 'BDL', description: 'Bundle packaging' },
    ];

    const createdUnits = [];

    for (const unit of defaultUnits) {
      try {
        const existingUnit = await prisma.packagingUnit.findUnique({
          where: { name: unit.name },
        });

        if (!existingUnit) {
          const created = await prisma.packagingUnit.create({
            data: unit,
          });
          createdUnits.push(created);
        }
      } catch (error) {
        // Skip if unit already exists
        console.log(`Unit ${unit.name} already exists, skipping...`);
      }
    }

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
