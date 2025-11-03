import { prisma } from '../config/dbConfig.js';

export class PackagingService {
  // Packaging Hierarchy Operations
  static async deleteExistingHierarchy(categoryId) {
    return await prisma.packagingHierarchy.deleteMany({
      where: { categoryId: Number(categoryId) },
    });
  }

  static async createPackagingLevel(data) {
    return await prisma.packagingHierarchy.create({
      data,
      include: {
        parentUnit: true,
        childUnit: true,
      },
    });
  }

  static async createPackagingHierarchy(categoryId, packagingLevels) {
    // Delete existing hierarchy
    await this.deleteExistingHierarchy(categoryId);

    const createdHierarchy = [];

    for (let i = 0; i < packagingLevels.length; i++) {
      const level = packagingLevels[i];

      const hierarchy = await this.createPackagingLevel({
        categoryId: Number(categoryId),
        level: i + 1,
        parentUnitId: Number(level.parentUnitId),
        childUnitId: Number(level.childUnitId),
        conversionQuantity: Number(level.conversionQuantity),
        isActive: true,
      });

      createdHierarchy.push(hierarchy);
    }

    return createdHierarchy;
  }

  // Category Operations
  static async getCategoryById(categoryId) {
    return await prisma.itemCategory.findUnique({
      where: { id: Number(categoryId) },
      select: {
        id: true,
        name: true,
        primary_unit: true,
        secondary_unit: true,
      },
    });
  }

  // Hierarchy Retrieval
  static async getPackagingHierarchy(categoryId) {
    return await prisma.packagingHierarchy.findMany({
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
  }

  static formatHierarchy(hierarchy) {
    return hierarchy.map((h) => ({
      level: h.level,
      from: h.parentUnit.name,
      fromAbbr: h.parentUnit.abbreviation,
      to: h.childUnit.name,
      toAbbr: h.childUnit.abbreviation,
      quantity: h.conversionQuantity,
      parentUnitId: h.parentUnitId,
      childUnitId: h.childUnitId,
      conversionQuantity: h.conversionQuantity,
    }));
  }

  static buildPackagingStructure(category, hierarchy) {
    const formattedHierarchy = this.formatHierarchy(hierarchy);

    return {
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
  }

  // Unit Conversion Logic
  static convertUnits(hierarchy, fromUnit, toUnit, quantity) {
    if (fromUnit === toUnit) {
      return {
        originalQuantity: quantity,
        convertedQuantity: quantity,
        fromUnit,
        toUnit,
        conversionPath: [],
      };
    }

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
      throw new Error(`Cannot convert from ${fromUnit} to ${toUnit}. No conversion path found.`);
    }

    return {
      originalQuantity: Number(quantity),
      convertedQuantity: Math.round(currentQuantity * 100) / 100,
      fromUnit,
      toUnit,
      conversionPath,
    };
  }

  // Packaging Units Operations
  static async getAllPackagingUnits() {
    return await prisma.packagingUnit.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  static async findPackagingUnitByName(name) {
    return await prisma.packagingUnit.findUnique({
      where: { name },
    });
  }

  static async createPackagingUnit(data) {
    return await prisma.packagingUnit.create({
      data,
    });
  }

  static async createDefaultPackagingUnits() {
    const defaultUnits = [
      { name: 'Pieces', abbreviation: 'PCS', description: 'Individual pieces' },
      { name: 'Square Meter', abbreviation: 'SQMT', description: 'Square meter measurement' },
      { name: 'Square Feet', abbreviation: 'SQFT', description: 'Square feet measurement' },
      { name: 'Kilogram', abbreviation: 'KG', description: 'Weight in kilograms' },
      { name: 'Gram', abbreviation: 'GM', description: 'Weight in grams' },
      { name: 'Metric Ton', abbreviation: 'MT', description: 'Weight in metric tons' },
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
        const existingUnit = await this.findPackagingUnitByName(unit.name);

        if (!existingUnit) {
          const created = await this.createPackagingUnit(unit);
          createdUnits.push(created);
        }
      } catch (error) {
        console.log(`Unit ${unit.name} already exists, skipping...`);
      }
    }

    return createdUnits;
  }

  // Validation Methods
  static validatePackagingLevels(packagingLevels) {
    if (!Array.isArray(packagingLevels)) {
      throw new Error('Packaging levels must be an array');
    }

    for (let i = 0; i < packagingLevels.length; i++) {
      const level = packagingLevels[i];
      if (!level.parentUnitId || !level.childUnitId || !level.conversionQuantity) {
        throw new Error(`Invalid packaging level at index ${i}. parentUnitId, childUnitId, and conversionQuantity are required.`);
      }
    }
  }

  static validateConversionInput(categoryId, fromUnit, toUnit, quantity) {
    if (!categoryId || !fromUnit || !toUnit || quantity === undefined) {
      throw new Error('Category ID, fromUnit, toUnit, and quantity are required');
    }

    if (isNaN(quantity) || quantity < 0) {
      throw new Error('Quantity must be a valid positive number');
    }
  }
}