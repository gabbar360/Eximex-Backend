import { DatabaseUtils } from '../utils/dbUtils.js';
import { cacheManager } from '../utils/cacheUtils.js';
import { ApiError } from '../utils/ApiError.js';

const getProductVariantById = async (
  productVariantId,
  includeRelations = false
) => {
  const cacheKey = `product_variant_${productVariantId}_${includeRelations}`;
  const cached = cacheManager.get(cacheKey);
  if (cached) return cached;

  const include = includeRelations
    ? { company: true, user: true, product: true }
    : undefined;

  const productVariant = await DatabaseUtils.findOne(
    'productVariant',
    { id: productVariantId },
    undefined,
    include
  );

  if (!productVariant) {
    throw new ApiError(404, 'Product variant not found');
  }

  cacheManager.set(cacheKey, productVariant, 10 * 60 * 1000);
  return productVariant;
};

const getAllProductVariants = async (companyId, options = {}) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
    productId = null,
  } = options;

  const where = { companyId: Number(companyId) };

  if (search) {
    where.OR = [{ sku: { contains: search, mode: 'insensitive' } }];
  }

  if (productId) {
    where.productId = productId;
  }

  const orderBy = { [sortBy]: sortOrder };

  return await DatabaseUtils.findMany('productVariant', {
    where,
    orderBy,
    page,
    limit,
    include: { company: true, user: true, product: true },
  });
};

const createProductVariant = async (productVariantData, userId, companyId) => {
  const productExists = await DatabaseUtils.exists('product', {
    id: productVariantData.productId,
    companyId: Number(companyId),
  });
  if (!productExists) {
    throw new ApiError(404, 'Product not found');
  }

  const skuExists = await DatabaseUtils.exists('productVariant', {
    sku: productVariantData.sku,
  });
  if (skuExists) {
    throw new ApiError(400, 'SKU already exists');
  }

  productVariantData.companyId = Number(companyId);
  productVariantData.user_id = Number(userId);

  ['variantAttributes', 'packingDetails', 'productSnapshot'].forEach(
    (field) => {
      if (productVariantData[field]) {
        try {
          JSON.parse(JSON.stringify(productVariantData[field]));
        } catch {
          throw new ApiError(400, `Invalid ${field} JSON`);
        }
      }
    }
  );

  const productVariant = await DatabaseUtils.create(
    'productVariant',
    productVariantData
  );

  cacheManager.delete(`product_variant_${productVariant.id}_false`);
  cacheManager.delete(`product_variant_${productVariant.id}_true`);

  return getProductVariantById(productVariant.id, true);
};

const updateProductVariant = async (productVariantId, updateData) => {
  await getProductVariantById(productVariantId);

  if (updateData.productId) {
    const productExists = await DatabaseUtils.exists('product', {
      id: updateData.productId,
    });
    if (!productExists) {
      throw new ApiError(404, 'Product not found');
    }
  }

  if (updateData.sku) {
    const skuExists = await DatabaseUtils.exists('productVariant', {
      sku: updateData.sku,
      NOT: { id: productVariantId },
    });
    if (skuExists) {
      throw new ApiError(400, 'SKU already exists');
    }
  }

  ['variantAttributes', 'packingDetails', 'productSnapshot'].forEach(
    (field) => {
      if (updateData[field]) {
        try {
          JSON.parse(JSON.stringify(updateData[field]));
        } catch {
          throw new ApiError(400, `Invalid ${field} JSON`);
        }
      }
    }
  );

  const updatedProductVariant = await DatabaseUtils.update(
    'productVariant',
    { id: productVariantId },
    updateData
  );

  cacheManager.delete(`product_variant_${productVariantId}_false`);
  cacheManager.delete(`product_variant_${productVariantId}_true`);

  return updatedProductVariant;
};

const deleteProductVariant = async (productVariantId) => {
  await getProductVariantById(productVariantId);

  await DatabaseUtils.delete('productVariant', { id: productVariantId });

  cacheManager.delete(`product_variant_${productVariantId}_false`);
  cacheManager.delete(`product_variant_${productVariantId}_true`);

  return { message: 'Product variant deleted successfully' };
};

const getProductVariantStats = async (companyId) => {
  const cacheKey = `product_variant_stats_${companyId}`;
  const cached = cacheManager.get(cacheKey);
  if (cached) return cached;

  const [totalVariants, variantsWithAttributes, variantsWithPackingDetails] =
    await Promise.all([
      DatabaseUtils.count('productVariant', { companyId: Number(companyId) }),
      DatabaseUtils.count('productVariant', {
        companyId: Number(companyId),
        NOT: { variantAttributes: null },
      }),
      DatabaseUtils.count('productVariant', {
        companyId: Number(companyId),
        NOT: { packingDetails: null },
      }),
    ]);

  const stats = {
    totalVariants,
    variantsWithAttributes,
    variantsWithPackingDetails,
  };

  cacheManager.set(cacheKey, stats, 5 * 60 * 1000);
  return stats;
};

// Export all functions at the bottom (clean approach)
export const ProductVariantService = {
  getProductVariantById,
  getAllProductVariants,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
  getProductVariantStats,
};
