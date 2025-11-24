import { prisma } from '../config/dbConfig.js';
import { cacheManager } from '../utils/cacheUtils.js';
import { ApiError } from '../utils/ApiError.js';
import { DatabaseUtils } from '../utils/dbUtils.js';
import { UserService } from './userService.js';

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
    piecePerBox: productData.piecePerBox
      ? parseInt(productData.piecePerBox)
      : null,

    // New packaging fields
    totalBoxes: productData.totalBoxes
      ? parseInt(productData.totalBoxes)
      : null,
    grossWeightPerBox: productData.grossWeightPerBox
      ? parseFloat(productData.grossWeightPerBox)
      : null,
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
    totalPieces: productData.totalPieces
      ? parseInt(productData.totalPieces)
      : null,
    totalGrossWeight: productData.totalGrossWeight
      ? parseFloat(productData.totalGrossWeight)
      : null,
    totalGrossWeightUnit: productData.totalGrossWeightUnit || 'kg',

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

export const ProductService = {
  getProductById,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
};

// Product Variant Service Functions
