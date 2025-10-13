import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Create or update packaging hierarchy for a category
 */
const createPackagingHierarchy = async (
  categoryId,
  packagingLevels,
  userId
) => {
  // Validate packaging levels structure
  for (let i = 0; i < packagingLevels.length; i++) {
    const level = packagingLevels[i];
    if (
      !level.parentUnitId ||
      !level.childUnitId ||
      !level.conversionQuantity
    ) {
      throw new Error(
        `Invalid packaging level at index ${i}. parentUnitId, childUnitId, and conversionQuantity are required.`
      );
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

  return createdHierarchy;
};

/**
 * Get packaging hierarchy for a category
 */
const getPackagingHierarchy = async (categoryId) => {
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
    return {
      data: [],
      message: 'Category not found',
    };
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
    return {
      data: [],
    };
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

  return {
    data: formattedHierarchy,
  };
};

/**
 * Get full packaging structure for a category
 */
const getFullPackagingStructure = async (categoryId) => {
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
    throw new Error('Category not found');
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

  return structure;
};

/**
 * Convert units based on packaging hierarchy
 */
const convertUnits = async (categoryId, fromUnit, toUnit, quantity) => {
  if (isNaN(quantity) || quantity < 0) {
    throw new Error('Quantity must be a valid positive number');
  }

  if (fromUnit === toUnit) {
    return {
      originalQuantity: quantity,
      convertedQuantity: quantity,
      fromUnit,
      toUnit,
      conversionPath: [],
    };
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
    throw new Error('No packaging hierarchy found for this category');
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
    throw new Error(
      `Cannot convert from ${fromUnit} to ${toUnit}. No conversion path found.`
    );
  }

  return {
    originalQuantity: Number(quantity),
    convertedQuantity: Math.round(currentQuantity * 100) / 100, // Round to 2 decimal places
    fromUnit,
    toUnit,
    conversionPath,
  };
};

/**
 * Get all packaging units
 */
const getAllPackagingUnits = async () => {
  const units = await prisma.packagingUnit.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  return units;
};

/**
 * Create packaging units (seed data)
 */
const createPackagingUnits = async () => {
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

  return createdUnits;
};

export {
  createPackagingHierarchy,
  getPackagingHierarchy,
  getFullPackagingStructure,
  convertUnits,
  getAllPackagingUnits,
  createPackagingUnits,
};
