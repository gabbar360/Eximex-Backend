import { prisma } from '../config/dbConfig.js';
import { cacheManager } from '../utils/cacheUtils.js';
import { ApiError } from '../utils/ApiError.js';
import { DatabaseUtils } from '../utils/dbUtils.js';
import { UserService } from './userService.js';

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

  cacheManager.set(cacheKey, product, 10 * 60 * 1000);
  return product;
};

const getAllProducts = async (companyId, options = {}, dataFilters = {}) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
    categoryId = null,
  } = options;

  const where = {
    companyId: Number(companyId),
    deletedAt: null,
    isActive: true,
    ...dataFilters,
  };

  if (search) {
    where.OR = [{ name: { contains: search, mode: 'insensitive' } }];
  }

  if (categoryId) {
    where.categoryId = parseInt(categoryId);
  }

  const orderBy = { [sortBy]: sortOrder };
  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: { category: true, subCategory: true, company: true, user: true },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    data: products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
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

  cacheManager.delete(`product_${product.id}_false`);
  cacheManager.delete(`product_${product.id}_true`);

  // Clear dashboard cache so admin sees updated counts
  UserService.clearCompanyDashboardCache(companyId);

  return product;
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

  cacheManager.delete(`product_${productId}_false`);
  cacheManager.delete(`product_${productId}_true`);

  return updatedProduct;
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
const getProductVariantById = async (variantId, includeRelations = false) => {
  const cacheKey = `product_variant_${variantId}_${includeRelations}`;
  const cached = cacheManager.get(cacheKey);
  if (cached) return cached;

  const include = includeRelations
    ? { product: true, company: true, user: true }
    : undefined;

  const variant = await DatabaseUtils.findOne(
    'productVariant',
    { id: variantId },
    undefined,
    include
  );
  if (!variant) throw new ApiError(404, 'Product Variant not found');

  cacheManager.set(cacheKey, variant, 10 * 60 * 1000);
  return variant;
};

const getAllProductVariants = async (companyId, options = {}) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    sortBy = 'sku',
    sortOrder = 'asc',
    productId = null,
  } = options;

  const where = { companyId: Number(companyId) };
  if (search) where.OR = [{ sku: { contains: search, mode: 'insensitive' } }];
  if (productId) where.productId = productId;

  return await DatabaseUtils.findMany('productVariant', {
    where,
    orderBy: { [sortBy]: sortOrder },
    page,
    limit,
    include: { product: true, company: true, user: true },
  });
};

const createProductVariant = async (variantData, userId, companyId) => {
  const productExists = await DatabaseUtils.exists('product', {
    id: variantData.productId,
  });
  if (!productExists) throw new ApiError(404, 'Product not found');

  variantData.companyId = Number(companyId);
  variantData.user_id = Number(userId);

  const variant = await DatabaseUtils.create('productVariant', variantData);

  cacheManager.delete(`product_variant_${variant.id}_false`);
  cacheManager.delete(`product_variant_${variant.id}_true`);

  return getProductVariantById(variant.id, true);
};

const updateProductVariant = async (variantId, updateData) => {
  const existingVariant = await getProductVariantById(variantId);

  if (updateData.productId) {
    const productExists = await DatabaseUtils.exists('product', {
      id: updateData.productId,
    });
    if (!productExists) throw new ApiError(404, 'Product not found');
  }

  const updatedVariant = await DatabaseUtils.update(
    'productVariant',
    { id: variantId },
    updateData
  );

  cacheManager.delete(`product_variant_${variantId}_false`);
  cacheManager.delete(`product_variant_${variantId}_true`);

  return updatedVariant;
};

const deleteProductVariant = async (variantId) => {
  const variant = await getProductVariantById(variantId);

  await DatabaseUtils.delete('productVariant', { id: variantId });

  cacheManager.delete(`product_variant_${variantId}_false`);
  cacheManager.delete(`product_variant_${variantId}_true`);

  return { message: 'Product Variant deleted successfully' };
};

export const ProductVariantService = {
  getProductVariantById,
  getAllProductVariants,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
};
