import { prisma } from '../config/dbConfig.js';
import { cacheManager } from '../utils/cacheUtils.js';
import { ApiError } from '../utils/ApiError.js';
import { DatabaseUtils } from '../utils/dbUtils.js';
import { UserService } from './userService.js';
import * as XLSX from 'xlsx';

// Utility function to transform product with packaging preview
const transformProductWithPackagingPreview = (product) => {
  const transformed = { ...product };

  if (product.packagingHierarchyData?.dynamicFields) {
    const dynamicFields = product.packagingHierarchyData.dynamicFields;
    transformed.packagingPreview = {
      hierarchy: [],
      weights: {},
      totals: {},
    };

    // Extract hierarchy information - handle various field name patterns
    Object.keys(dynamicFields).forEach((key) => {
      if (key.includes('Per') && !key.startsWith('weight')) {
        // Handle patterns like "Square MeterPerBox", "BoxPerPallet", "PiecesPerPackage"
        let from, to;
        if (key.includes(' ')) {
          // Handle "Square MeterPerBox" pattern
          const parts = key.split('Per');
          from = parts[0];
          to = parts[1];
        } else {
          // Handle "BoxPerPallet", "PiecesPerPackage" pattern
          const match = key.match(/^(.+)Per(.+)$/);
          if (match) {
            from = match[1];
            to = match[2];
          }
        }

        if (from && to) {
          transformed.packagingPreview.hierarchy.push({
            from: from,
            to: to,
            quantity: dynamicFields[key],
            field: key,
          });
        }
      }
    });

    // Extract weight information - handle various patterns
    Object.keys(dynamicFields).forEach((key) => {
      if (key.startsWith('weightPer')) {
        // Handle patterns like "weightPerSquare Meter", "weightPerPieces", "weightPerBox"
        let unit = key.replace('weightPer', '').replace('Unit', '');

        if (key.endsWith('Unit')) {
          transformed.packagingPreview.weights[unit + 'Unit'] =
            dynamicFields[key];
        } else {
          transformed.packagingPreview.weights[unit] = dynamicFields[key];
        }
      }
    });

    // Add calculated totals
    transformed.packagingPreview.totals = {
      totalPieces: product.totalPieces,
      totalGrossWeight: product.totalGrossWeight,
      totalGrossWeightUnit: product.totalGrossWeightUnit,
      totalBoxes: product.totalBoxes,
      grossWeightPerBox: product.grossWeightPerBox,
      packagingMaterialWeight: product.packagingMaterialWeight,
    };
  }

  return transformed;
};

// Product Service Functions
const getProductById = async (productId, includeRelations = false) => {
  const cacheKey = `product_${productId}_${includeRelations}`;
  const cached = cacheManager.get(cacheKey);
  if (cached) return cached;

  const include = includeRelations
    ? { category: true, subCategory: true, company: true, user: true }
    : undefined;

  const product = await prisma.product.findUnique({
    where: { id: parseInt(productId), deletedAt: null },
    include,
  });

  if (!product) throw new ApiError(404, 'Product not found');

  const transformed = transformProductWithPackagingPreview(product);

  cacheManager.set(cacheKey, transformed, 10 * 60 * 1000);
  return transformed;
};

const getAllProducts = async (companyId, options = {}, dataFilters = {}) => {
  const {
    page = 1,
    limit = 50,
    search = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
    categoryId = null,
    subCategoryId = null,
  } = options;

  // Convert to integers to avoid Prisma type errors
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 50;

  const where = {
    companyId: Number(companyId), // ✅ Always filter by company first
    deletedAt: null,
    isActive: true,
    ...dataFilters, // Then apply role-based filters (createdBy for staff)
  };

  if (search) {
    where.OR = [{ name: { contains: search, mode: 'insensitive' } }];
  }

  if (categoryId) {
    where.categoryId = parseInt(categoryId);
  }

  if (subCategoryId) {
    where.subCategoryId = parseInt(subCategoryId);
  }

  const orderBy = { [sortBy]: sortOrder };
  const skip = (pageNum - 1) * limitNum;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: limitNum,
      include: { category: true, subCategory: true, company: true, user: true },
    }),
    prisma.product.count({ where }),
  ]);

  // Transform products to include structured packaging preview
  const transformedProducts = products.map(
    transformProductWithPackagingPreview
  );

  return {
    data: transformedProducts,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNext: pageNum * limitNum < total,
      hasPrev: pageNum > 1,
    },
  };
};

const createProduct = async (productData, userId, companyId) => {
  // Check for duplicate SKU
  if (productData.sku) {
    const existingSku = await prisma.product.findFirst({
      where: {
        sku: productData.sku,
        companyId: Number(companyId),
        deletedAt: null,
      },
    });
    if (existingSku)
      throw new ApiError(400, 'Product with this SKU already exists');
  }

  if (productData.categoryId) {
    const categoryExists = await prisma.itemCategory.findFirst({
      where: {
        id: parseInt(productData.categoryId),
        companyId: Number(companyId),
      },
    });
    if (!categoryExists)
      throw new ApiError(404, 'Category not found in your company');
  }

  if (productData.subCategoryId) {
    const subCategoryExists = await prisma.itemCategory.findFirst({
      where: {
        id: parseInt(productData.subCategoryId),
        companyId: Number(companyId),
      },
    });
    if (!subCategoryExists)
      throw new ApiError(404, 'Subcategory not found in your company');
  }

  // Process dynamic packaging hierarchy data
  const packagingHierarchyData = {};
  const dynamicFields = {};

  // Extract dynamic packaging fields from productData
  Object.keys(productData).forEach((key) => {
    if (key.includes('Per') || key.startsWith('weightPer')) {
      dynamicFields[key] = productData[key];
    }
  });

  // Also add weightPerBox if it exists
  if (productData.weightPerBox) {
    dynamicFields.weightPerBox = productData.weightPerBox;
  }
  if (productData.weightPerBoxUnit) {
    dynamicFields.weightPerBoxUnit = productData.weightPerBoxUnit;
  }

  if (Object.keys(dynamicFields).length > 0) {
    packagingHierarchyData.dynamicFields = dynamicFields;
  }

  // Calculate totals before creating product
  const totalBoxes = productData.totalBoxes ? parseInt(productData.totalBoxes) : null;
  const piecePerBox = productData.piecePerBox ? parseInt(productData.piecePerBox) : null;
  const grossWeightPerBox = productData.grossWeightPerBox ? parseFloat(productData.grossWeightPerBox) : null;
  
  let calculatedTotalPieces = productData.totalPieces ? parseInt(productData.totalPieces) : null;
  let calculatedTotalGrossWeight = productData.totalGrossWeight ? parseFloat(productData.totalGrossWeight) : null;
  
  // Auto-calculate if not provided
  if (!calculatedTotalPieces && totalBoxes && piecePerBox) {
    calculatedTotalPieces = totalBoxes * piecePerBox;
  }
  
  if (!calculatedTotalGrossWeight && totalBoxes && grossWeightPerBox) {
    calculatedTotalGrossWeight = totalBoxes * grossWeightPerBox;
  }

  const productToCreate = {
    name: productData.name,
    sku: productData.sku || null,
    companyId: Number(companyId),
    createdBy: Number(userId),

    // Basic product info
    description: productData.description || null,
    price: productData.price ? parseFloat(productData.price) : null,
    currency: productData.currency || 'USD',

    // Category info
    categoryId: productData.categoryId
      ? parseInt(productData.categoryId)
      : null,
    subCategoryId: productData.subCategoryId
      ? parseInt(productData.subCategoryId)
      : null,

    // Legacy fields (keeping for backward compatibility)
    weightUnit: productData.weightUnit || 'kg',
    weightType: productData.weightType || 'per_piece',
    weight: productData.weight ? parseFloat(productData.weight) : null,
    areaUnit: productData.areaUnit || 'sqmt',
    areaType: productData.areaType || 'per_piece',
    coverArea: productData.coverArea ? parseFloat(productData.coverArea) : null,
    piecePerBox: piecePerBox,

    // New packaging fields
    totalBoxes: totalBoxes,
    grossWeightPerBox: grossWeightPerBox,
    grossWeightUnit: productData.grossWeightUnit || 'kg',
    packagingMaterialWeight: productData.packagingMaterialWeight
      ? parseFloat(productData.packagingMaterialWeight)
      : null,
    packagingMaterialWeightUnit: productData.packagingMaterialWeightUnit || 'g',

    // Unit weight fields
    unitWeight: productData.unitWeight
      ? parseFloat(productData.unitWeight)
      : null,
    unitWeightUnit: productData.unitWeightUnit || 'kg',
    weightUnitType: productData.weightUnitType || null,

    // Calculated fields
    totalPieces: calculatedTotalPieces,
    totalGrossWeight: calculatedTotalGrossWeight,
    totalGrossWeightUnit: productData.totalGrossWeightUnit || productData.grossWeightUnit || 'kg',

    // Volume fields
    volumeLength: productData.volumeLength
      ? parseFloat(productData.volumeLength)
      : null,
    volumeWidth: productData.volumeWidth
      ? parseFloat(productData.volumeWidth)
      : null,
    volumeHeight: productData.volumeHeight
      ? parseFloat(productData.volumeHeight)
      : null,
    volumePerBox: productData.volumePerBox
      ? parseFloat(productData.volumePerBox)
      : null,
    totalVolume: productData.totalVolume
      ? parseFloat(productData.totalVolume)
      : null,

    // Packaging dimensions fields (in meters)
    packagingLength: productData.packagingLength
      ? parseFloat(productData.packagingLength)
      : null,
    packagingWidth: productData.packagingWidth
      ? parseFloat(productData.packagingWidth)
      : null,
    packagingHeight: productData.packagingHeight
      ? parseFloat(productData.packagingHeight)
      : null,
    packagingVolume: productData.packagingVolume
      ? parseFloat(productData.packagingVolume)
      : null,

    // Dynamic packaging hierarchy data
    packagingHierarchyData:
      Object.keys(packagingHierarchyData).length > 0
        ? packagingHierarchyData
        : null,

    isActive: true,
  };

  const product = await prisma.product.create({
    data: productToCreate,
    include: { category: true, subCategory: true, company: true, user: true },
  });

  const transformed = transformProductWithPackagingPreview(product);

  cacheManager.delete(`product_${product.id}_false`);
  cacheManager.delete(`product_${product.id}_true`);

  // Clear dashboard cache so admin sees updated counts
  UserService.clearCompanyDashboardCache(companyId);

  return transformed;
};

const updateProduct = async (productId, updateData, companyId) => {
  const existingProduct = await prisma.product.findFirst({
    where: {
      id: parseInt(productId),
      companyId: Number(companyId),
      deletedAt: null,
    },
  });

  if (!existingProduct)
    throw new ApiError(404, 'Product not found in your company');

  // Check for duplicate SKU (excluding current product)
  if (updateData.sku && updateData.sku !== existingProduct.sku) {
    const existingSku = await prisma.product.findFirst({
      where: {
        sku: updateData.sku,
        companyId: Number(companyId),
        deletedAt: null,
        id: { not: parseInt(productId) },
      },
    });
    if (existingSku)
      throw new ApiError(400, 'Product with this SKU already exists');
  }

  // Process dynamic packaging hierarchy data for update
  const packagingHierarchyData = {};
  const dynamicFields = {};

  // Extract dynamic packaging fields from updateData
  Object.keys(updateData).forEach((key) => {
    if (key.includes('Per') || key.startsWith('weightPer')) {
      dynamicFields[key] = updateData[key];
    }
  });

  // Also add weightPerBox if it exists
  if (updateData.weightPerBox) {
    dynamicFields.weightPerBox = updateData.weightPerBox;
  }
  if (updateData.weightPerBoxUnit) {
    dynamicFields.weightPerBoxUnit = updateData.weightPerBoxUnit;
  }

  if (Object.keys(dynamicFields).length > 0) {
    packagingHierarchyData.dynamicFields = dynamicFields;
  }

  const dataToUpdate = {
    // Basic product info
    name: updateData.name,
    sku: updateData.sku,
    description: updateData.description,
    price: updateData.price ? parseFloat(updateData.price) : updateData.price,
    currency: updateData.currency,

    // Category info
    categoryId: updateData.categoryId
      ? parseInt(updateData.categoryId)
      : updateData.categoryId,
    subCategoryId: updateData.subCategoryId
      ? parseInt(updateData.subCategoryId)
      : updateData.subCategoryId,

    // Legacy fields
    weightUnit: updateData.weightUnit,
    weightType: updateData.weightType,
    weight: updateData.weight
      ? parseFloat(updateData.weight)
      : updateData.weight,
    areaUnit: updateData.areaUnit,
    areaType: updateData.areaType,
    coverArea: updateData.coverArea
      ? parseFloat(updateData.coverArea)
      : updateData.coverArea,
    piecePerBox: updateData.piecePerBox
      ? parseInt(updateData.piecePerBox)
      : updateData.piecePerBox,

    // New packaging fields
    totalBoxes: updateData.totalBoxes
      ? parseInt(updateData.totalBoxes)
      : updateData.totalBoxes,
    grossWeightPerBox: updateData.grossWeightPerBox
      ? parseFloat(updateData.grossWeightPerBox)
      : updateData.grossWeightPerBox,
    grossWeightUnit: updateData.grossWeightUnit,
    packagingMaterialWeight: updateData.packagingMaterialWeight
      ? parseFloat(updateData.packagingMaterialWeight)
      : updateData.packagingMaterialWeight,
    packagingMaterialWeightUnit: updateData.packagingMaterialWeightUnit,

    // Unit weight fields
    unitWeight: updateData.unitWeight
      ? parseFloat(updateData.unitWeight)
      : updateData.unitWeight,
    unitWeightUnit: updateData.unitWeightUnit,
    weightUnitType: updateData.weightUnitType,

    // Calculated fields
    totalPieces: updateData.totalPieces
      ? parseInt(updateData.totalPieces)
      : updateData.totalPieces,
    totalGrossWeight: updateData.totalGrossWeight
      ? parseFloat(updateData.totalGrossWeight)
      : updateData.totalGrossWeight,
    totalGrossWeightUnit: updateData.totalGrossWeightUnit,

    // Volume fields
    volumeLength: updateData.volumeLength
      ? parseFloat(updateData.volumeLength)
      : updateData.volumeLength,
    volumeWidth: updateData.volumeWidth
      ? parseFloat(updateData.volumeWidth)
      : updateData.volumeWidth,
    volumeHeight: updateData.volumeHeight
      ? parseFloat(updateData.volumeHeight)
      : updateData.volumeHeight,
    volumePerBox: updateData.volumePerBox
      ? parseFloat(updateData.volumePerBox)
      : updateData.volumePerBox,
    totalVolume: updateData.totalVolume
      ? parseFloat(updateData.totalVolume)
      : updateData.totalVolume,

    // Packaging dimensions fields (in meters)
    packagingLength: updateData.packagingLength
      ? parseFloat(updateData.packagingLength)
      : updateData.packagingLength,
    packagingWidth: updateData.packagingWidth
      ? parseFloat(updateData.packagingWidth)
      : updateData.packagingWidth,
    packagingHeight: updateData.packagingHeight
      ? parseFloat(updateData.packagingHeight)
      : updateData.packagingHeight,
    packagingVolume: updateData.packagingVolume
      ? parseFloat(updateData.packagingVolume)
      : updateData.packagingVolume,

    // Dynamic packaging hierarchy data
    packagingHierarchyData:
      Object.keys(packagingHierarchyData).length > 0
        ? packagingHierarchyData
        : updateData.packagingHierarchyData,

    updatedAt: new Date(),
  };

  Object.keys(dataToUpdate).forEach(
    (key) => dataToUpdate[key] === undefined && delete dataToUpdate[key]
  );

  const updatedProduct = await prisma.product.update({
    where: { id: parseInt(productId) },
    data: dataToUpdate,
    include: { category: true, subCategory: true, company: true, user: true },
  });

  const transformed = transformProductWithPackagingPreview(updatedProduct);

  cacheManager.delete(`product_${productId}_false`);
  cacheManager.delete(`product_${productId}_true`);

  return transformed;
};

const deleteProduct = async (productId, companyId) => {
  const product = await prisma.product.findFirst({
    where: {
      id: parseInt(productId),
      companyId: Number(companyId),
      deletedAt: null,
    },
  });
  if (!product) throw new ApiError(404, 'Product not found in your company');

  // Hard delete from database
  await prisma.product.delete({
    where: { id: parseInt(productId) },
  });

  cacheManager.delete(`product_${productId}_false`);
  cacheManager.delete(`product_${productId}_true`);

  return { message: 'Product deleted successfully' };
};

const getProductStats = async (companyId) => {
  const cacheKey = `product_stats_${companyId}`;
  const cached = cacheManager.get(cacheKey);
  if (cached) return cached;

  const [totalProducts, activeProducts, deletedProducts] = await Promise.all([
    prisma.product.count({
      where: { companyId: Number(companyId), deletedAt: null },
    }),
    prisma.product.count({
      where: { companyId: Number(companyId), deletedAt: null, isActive: true },
    }),
    prisma.product.count({
      where: { companyId: Number(companyId), deletedAt: { not: null } },
    }),
  ]);

  const stats = {
    totalProducts,
    activeProducts,
    inactiveProducts: totalProducts - activeProducts,
    deletedProducts,
  };

  cacheManager.set(cacheKey, stats, 5 * 60 * 1000);
  return stats;
};

// Bulk Upload Functions
const processProductExcel = async (file, userId, companyId) => {
  try {
    // Read Excel file
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (!data || data.length === 0) {
      throw new ApiError(400, 'Excel file is empty');
    }

    const results = {
      total: data.length,
      success: 0,
      failed: 0,
      errors: [],
      successProducts: []
    };

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // Excel row number (starting from 2)

      try {
        // Comprehensive field validation
        const validationErrors = [];
        
        // Required field validations
        if (!row['Product Name'] || row['Product Name'].toString().trim() === '') {
          validationErrors.push('Product Name is required');
        }
        
        if (!row['Category'] || row['Category'].toString().trim() === '') {
          validationErrors.push('Category is required');
        }
        
        // Data type and format validations
        if (row['Price'] && (isNaN(parseFloat(row['Price'])) || parseFloat(row['Price']) < 0)) {
          validationErrors.push('Price must be a valid positive number');
        }
        
        if (row['Weight'] && (isNaN(parseFloat(row['Weight'])) || parseFloat(row['Weight']) <= 0)) {
          validationErrors.push('Weight must be a valid positive number');
        }
        
        if (row['Total Boxes'] && (isNaN(parseInt(row['Total Boxes'])) || parseInt(row['Total Boxes']) <= 0)) {
          validationErrors.push('Total Boxes must be a valid positive integer');
        }
        
        if (row['Pieces Per Box'] && (isNaN(parseInt(row['Pieces Per Box'])) || parseInt(row['Pieces Per Box']) <= 0)) {
          validationErrors.push('Pieces Per Box must be a valid positive integer');
        }
        
        if (row['Gross Weight Per Box'] && (isNaN(parseFloat(row['Gross Weight Per Box'])) || parseFloat(row['Gross Weight Per Box']) <= 0)) {
          validationErrors.push('Gross Weight Per Box must be a valid positive number');
        }
        
        // SKU validation
        if (row['SKU'] && row['SKU'].toString().trim().length > 50) {
          validationErrors.push('SKU cannot exceed 50 characters');
        }
        
        // Currency validation
        if (row['Currency'] && !['USD', 'INR', 'EUR', 'GBP'].includes(row['Currency'])) {
          validationErrors.push('Currency must be one of: USD, INR, EUR, GBP');
        }
        
        // Weight unit validation
        if (row['Weight Unit'] && !['kg', 'g', 'lb', 'oz'].includes(row['Weight Unit'])) {
          validationErrors.push('Weight Unit must be one of: kg, g, lb, oz');
        }
        
        // Product name length validation
        if (row['Product Name'] && row['Product Name'].toString().trim().length > 255) {
          validationErrors.push('Product Name cannot exceed 255 characters');
        }
        
        // Description length validation
        if (row['Description'] && row['Description'].toString().length > 1000) {
          validationErrors.push('Description cannot exceed 1000 characters');
        }
        
        // If there are validation errors, throw them
        if (validationErrors.length > 0) {
          throw new Error(validationErrors.join('; '));
        }

        // Find or create category
        let categoryId = null;
        let packagingHierarchy = [];
        if (row['Category'] && row['Category'].trim()) {
          const category = await findOrCreateCategory(row['Category'], companyId, userId);
          categoryId = category.id;
          
          // Get packaging hierarchy for this category
          packagingHierarchy = await getCategoryWithPackagingHierarchy(categoryId);
        }

        // Find or create subcategory (only if category exists)
        let subCategoryId = null;
        if (row['Subcategory'] && row['Subcategory'].trim() && categoryId) {
          const subcategory = await findOrCreateSubcategory(
            row['Subcategory'], 
            categoryId, 
            companyId,
            userId
          );
          subCategoryId = subcategory.id;
        }

        // Prepare product data with packaging hierarchy support
        const productData = {
          name: row['Product Name'],
          sku: row['SKU'] || null,
          description: row['Description'] || null,
          price: row['Price'] ? parseFloat(row['Price']) : null,
          currency: row['Currency'] || 'USD',
          categoryId,
          subCategoryId,
          weight: row['Weight'] ? parseFloat(row['Weight']) : null,
          weightUnit: row['Weight Unit'] || 'kg',
          totalBoxes: row['Total Boxes'] ? parseInt(row['Total Boxes']) : null,
          piecePerBox: row['Pieces Per Box'] ? parseInt(row['Pieces Per Box']) : null,
          grossWeightPerBox: row['Gross Weight Per Box'] ? parseFloat(row['Gross Weight Per Box']) : null,
          companyId: Number(companyId),
          createdBy: Number(userId),
          isActive: true
        };

        // Handle packaging hierarchy dynamic fields - only first 2 levels as per PackagingDetails component
        const dynamicFields = {};
        
        // Validate and process only first 2 packaging hierarchy levels from Excel
        packagingHierarchy.slice(0, 2).forEach((level) => {
          const quantityField = `${level.from}Per${level.to}`;

          // Validate packaging hierarchy numeric fields
          if (row[quantityField]) {
            const quantity = parseFloat(row[quantityField]);
            if (isNaN(quantity) || quantity <= 0) {
              throw new Error(`${quantityField} must be a valid positive number`);
            }
            dynamicFields[quantityField] = quantity;
          }
        });

        // Process packaging material weight and dimensions
        const lastLevel = packagingHierarchy.length > 0 ? packagingHierarchy[packagingHierarchy.length - 1] : null;
        const containerName = lastLevel ? lastLevel.to : 'Box';
        
        // Validate and process packaging dimensions and material weight
        if (row[`${containerName} Material Weight`]) {
          const materialWeight = parseFloat(row[`${containerName} Material Weight`]);
          if (isNaN(materialWeight) || materialWeight <= 0) {
            throw new Error(`${containerName} Material Weight must be a valid positive number`);
          }
          dynamicFields.packagingMaterialWeight = materialWeight;
          productData.packagingMaterialWeight = materialWeight; // Store in main table
        }
        if (row[`${containerName} Material Weight Unit`]) {
          if (!['kg', 'g', 'lb', 'oz'].includes(row[`${containerName} Material Weight Unit`])) {
            throw new Error(`${containerName} Material Weight Unit must be one of: kg, g, lb, oz`);
          }
          dynamicFields.packagingMaterialWeightUnit = row[`${containerName} Material Weight Unit`];
          productData.packagingMaterialWeightUnit = row[`${containerName} Material Weight Unit`]; // Store in main table
        }
        if (row[`${containerName} Length (m)`]) {
          const length = parseFloat(row[`${containerName} Length (m)`]);
          if (isNaN(length) || length <= 0) {
            throw new Error(`${containerName} Length (m) must be a valid positive number`);
          }
          dynamicFields.packagingLength = length;
          productData.packagingLength = length; // Store in main table
        }
        if (row[`${containerName} Width (m)`]) {
          const width = parseFloat(row[`${containerName} Width (m)`]);
          if (isNaN(width) || width <= 0) {
            throw new Error(`${containerName} Width (m) must be a valid positive number`);
          }
          dynamicFields.packagingWidth = width;
          productData.packagingWidth = width; // Store in main table
        }
        if (row[`${containerName} Height (m)`]) {
          const height = parseFloat(row[`${containerName} Height (m)`]);
          if (isNaN(height) || height <= 0) {
            throw new Error(`${containerName} Height (m) must be a valid positive number`);
          }
          dynamicFields.packagingHeight = height;
          productData.packagingHeight = height; // Store in main table
        }
        
        // Process unit weight fields and store in main table
        if (row['Unit Weight']) {
          const unitWeight = parseFloat(row['Unit Weight']);
          if (isNaN(unitWeight) || unitWeight <= 0) {
            throw new Error('Unit Weight must be a valid positive number');
          }
          dynamicFields.unitWeight = unitWeight;
          productData.unitWeight = unitWeight; // Store in main table
        }
        if (row['Unit Weight Unit']) {
          if (!['kg', 'g', 'lb', 'oz'].includes(row['Unit Weight Unit'])) {
            throw new Error('Unit Weight Unit must be one of: kg, g, lb, oz');
          }
          dynamicFields.unitWeightUnit = row['Unit Weight Unit'];
          productData.unitWeightUnit = row['Unit Weight Unit']; // Store in main table
        }
        if (row['Weight Unit Type']) {
          dynamicFields.weightUnitType = row['Weight Unit Type'];
          productData.weightUnitType = row['Weight Unit Type']; // Store in main table
        }

        // Add packaging hierarchy data if dynamic fields exist
        if (Object.keys(dynamicFields).length > 0) {
          productData.packagingHierarchyData = { dynamicFields };
        }

        // Check for duplicate SKU
        if (productData.sku) {
          const existingSku = await prisma.product.findFirst({
            where: {
              sku: productData.sku,
              companyId: Number(companyId),
              deletedAt: null
            }
          });
          if (existingSku) {
            throw new Error(`SKU '${productData.sku}' already exists`);
          }
        }

        // Create product
        const product = await prisma.product.create({
          data: productData,
          include: { category: true, subCategory: true }
        });

        results.success++;
        results.successProducts.push({
          row: rowNumber,
          product: product.name,
          sku: product.sku
        });

      } catch (error) {
        results.failed++;
        results.errors.push({
          row: rowNumber,
          product: row['Product Name'] || 'Unknown',
          error: error.message
        });
      }
    }

    // Generate dynamic success message
    let message = '';
    if (results.success > 0 && results.failed === 0) {
      message = `Successfully uploaded ${results.success} product${results.success > 1 ? 's' : ''}`;
    } else if (results.success > 0 && results.failed > 0) {
      message = `Uploaded ${results.success} product${results.success > 1 ? 's' : ''} successfully, ${results.failed} failed`;
    } else if (results.failed > 0 && results.success === 0) {
      message = `Failed to upload ${results.failed} product${results.failed > 1 ? 's' : ''}. Please check errors.`;
    } else {
      message = 'No products processed';
    }
    
    results.message = message;
    return results;

  } catch (error) {
    throw new ApiError(500, `Excel processing failed: ${error.message}`);
  }
};

const findOrCreateCategory = async (categoryName, companyId, userId) => {
  // First try to find existing category
  let category = await prisma.itemCategory.findFirst({
    where: {
      name: { equals: categoryName.trim(), mode: 'insensitive' },
      companyId: Number(companyId),
      parentId: null // Only main categories
    }
  });

  // If not found, create new category
  if (!category) {
    category = await prisma.itemCategory.create({
      data: {
        name: categoryName.trim(),
        companyId: Number(companyId),
        createdBy: Number(userId),
        parentId: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  return category;
};

const getCategoryWithPackagingHierarchy = async (categoryId) => {
  // Get packaging hierarchy for this category
  const packagingHierarchy = await prisma.packagingHierarchy.findMany({
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

  // Format packaging hierarchy
  return packagingHierarchy.map((h) => ({
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
};

const findOrCreateSubcategory = async (subcategoryName, categoryId, companyId, userId) => {
  // First try to find existing subcategory under the specific category
  let subcategory = await prisma.itemCategory.findFirst({
    where: {
      name: { equals: subcategoryName.trim(), mode: 'insensitive' },
      companyId: Number(companyId),
      parentId: categoryId
    }
  });

  // If not found, create new subcategory
  if (!subcategory) {
    subcategory = await prisma.itemCategory.create({
      data: {
        name: subcategoryName.trim(),
        companyId: Number(companyId),
        createdBy: Number(userId),
        parentId: categoryId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  return subcategory;
};

const downloadTemplate = async (companyId, categoryId = null) => {
  console.log('Template download called with:', { companyId, categoryId });
  
  try {
    let selectedCategory = null;
    let packagingHierarchy = [];
    
    if (categoryId) {
      console.log('Fetching category:', categoryId);
      // Get specific category with packaging hierarchy
      selectedCategory = await prisma.itemCategory.findFirst({
        where: {
          id: Number(categoryId),
          companyId: Number(companyId),
          isActive: true
        },
        include: {
          other_ItemCategory: true // subcategories
        }
      });
      
      console.log('Found category:', selectedCategory?.name);
      
      if (selectedCategory) {
        packagingHierarchy = await getCategoryWithPackagingHierarchy(categoryId);
        console.log('Packaging hierarchy:', packagingHierarchy);
      }
    }

    // Create template rows - only include fields from PackagingDetails component
    const templateData = [];
    
    if (selectedCategory && selectedCategory.other_ItemCategory?.length > 0) {
      // Create sample for each subcategory
      selectedCategory.other_ItemCategory.forEach((subcat, index) => {
        const sampleRow = {
          'Product Name': `Sample Product ${index + 1}`,
          'SKU': `SP-00${index + 1}`,
          'Category': selectedCategory.name,
          'Subcategory': subcat.name,
          'Description': `${subcat.name} product description`,
          'Price': 1000 * (index + 1),
          'Currency': 'INR'
        };
        
        // Add only the first 2 packaging hierarchy fields (as shown in PackagingDetails component)
        if (packagingHierarchy && packagingHierarchy.length > 0) {
          packagingHierarchy.slice(0, 2).forEach((level) => {
            const quantityField = `${level.from}Per${level.to}`;
            sampleRow[quantityField] = level.quantity || 5;
          });
          
          // Add fields matching PackagingDetails component exactly
          sampleRow['Unit Weight'] = 0.5;
          sampleRow['Unit Weight Unit'] = 'kg';
          sampleRow['Weight Unit Type'] = packagingHierarchy[0]?.from || 'Pieces';
          
          // Add packaging material weight and dimensions (using last level container name)
          const lastLevel = packagingHierarchy[packagingHierarchy.length - 1] || { to: 'Box' };
          sampleRow[`${lastLevel.to} Material Weight`] = 0.1;
          sampleRow[`${lastLevel.to} Material Weight Unit`] = 'kg';
          sampleRow[`${lastLevel.to} Length (m)`] = 0.3;
          sampleRow[`${lastLevel.to} Width (m)`] = 0.2;
          sampleRow[`${lastLevel.to} Height (m)`] = 0.1;
        }
        
        templateData.push(sampleRow);
      });
    } else {
      // Single row template
      const baseTemplate = {
        'Product Name': 'Sample Product',
        'SKU': 'SP-001',
        'Category': selectedCategory?.name || 'Electronics',
        'Subcategory': 'YourSubcategory',
        'Description': 'Product description',
        'Price': 1000,
        'Currency': 'INR'
      };
      
      // Add only the first 2 packaging hierarchy fields (as shown in PackagingDetails component)
      if (packagingHierarchy && packagingHierarchy.length > 0) {
        packagingHierarchy.slice(0, 2).forEach((level) => {
          const quantityField = `${level.from}Per${level.to}`;
          baseTemplate[quantityField] = level.quantity || 5;
        });
        
        // Add fields matching PackagingDetails component exactly
        baseTemplate['Unit Weight'] = 0.5;
        baseTemplate['Unit Weight Unit'] = 'kg';
        baseTemplate['Weight Unit Type'] = packagingHierarchy[0]?.from || 'Pieces';
        
        // Add packaging material weight and dimensions (using last level container name)
        const lastLevel = packagingHierarchy[packagingHierarchy.length - 1] || { to: 'Box' };
        baseTemplate[`${lastLevel.to} Material Weight`] = 0.1;
        baseTemplate[`${lastLevel.to} Material Weight Unit`] = 'kg';
        baseTemplate[`${lastLevel.to} Length (m)`] = 0.3;
        baseTemplate[`${lastLevel.to} Width (m)`] = 0.2;
        baseTemplate[`${lastLevel.to} Height (m)`] = 0.1;
      } else {
        // Default fields when no packaging hierarchy
        baseTemplate['Unit Weight'] = 0.5;
        baseTemplate['Unit Weight Unit'] = 'kg';
        baseTemplate['Weight Unit Type'] = 'Pieces';
        baseTemplate['Box Material Weight'] = 0.1;
        baseTemplate['Box Material Weight Unit'] = 'kg';
        baseTemplate['Box Length (m)'] = 0.3;
        baseTemplate['Box Width (m)'] = 0.2;
        baseTemplate['Box Height (m)'] = 0.1;
      }
      
      templateData.push(baseTemplate);
    }

    console.log('Template data created with rows:', templateData.length);
    console.log('Final template data:', templateData);

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    
    // Add instructions
    const subcategoryList = selectedCategory?.other_ItemCategory?.map(s => s.name).join(', ') || 'None';
    const instructions = [
      { 'Field': 'Template Info', 'Description': categoryId ? `Category: ${selectedCategory?.name}` : 'General template' },
      { 'Field': 'Subcategories', 'Description': subcategoryList },
      { 'Field': 'Packaging Hierarchy', 'Description': packagingHierarchy.map(h => `${h.from} → ${h.to}`).join(', ') || 'None' },
      { 'Field': '', 'Description': '' },
      { 'Field': 'Required Fields', 'Description': 'Product Name, Category' },
      { 'Field': 'Packaging Fields', 'Description': 'Only first 2 hierarchy levels + unit weight + material weight + dimensions' },
      { 'Field': 'Note', 'Description': 'Template matches PackagingDetails component fields only' }
    ];
    
    const instructionSheet = XLSX.utils.json_to_sheet(instructions);
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    XLSX.utils.book_append_sheet(workbook, instructionSheet, 'Instructions');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    console.log('Excel buffer created, size:', buffer.length);
    
    return buffer;
  } catch (error) {
    console.error('Template generation error:', error);
    
    // Fallback simple template matching PackagingDetails component
    const fallbackTemplate = [
      {
        'Product Name': 'iPhone 15',
        'SKU': 'IP15-001', 
        'Category': 'Electronics',
        'Subcategory': 'Mobile Phones',
        'Description': 'Latest iPhone model',
        'Price': 50000,
        'Currency': 'INR',
        'Unit Weight': 0.2,
        'Unit Weight Unit': 'kg',
        'Weight Unit Type': 'Pieces',
        'Box Material Weight': 0.1,
        'Box Material Weight Unit': 'kg',
        'Box Length (m)': 0.3,
        'Box Width (m)': 0.2,
        'Box Height (m)': 0.1
      }
    ];
    
    const fallbackWorksheet = XLSX.utils.json_to_sheet(fallbackTemplate);
    const fallbackWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(fallbackWorkbook, fallbackWorksheet, 'Products');
    
    return XLSX.write(fallbackWorkbook, { type: 'buffer', bookType: 'xlsx' });
  }
};

export const ProductService = {
  getProductById,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
  processProductExcel,
  downloadTemplate,
};

// Product Variant Service Functions
