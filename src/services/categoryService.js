import { DatabaseUtils } from '../utils/dbUtils.js';
import { cacheManager } from '../utils/cacheUtils.js';
import { ApiError } from '../utils/ApiError.js';
import { prisma } from '../config/dbConfig.js';

const createCategory = async (categoryData, userId, companyId) => {
  // 1️⃣ Validate parent_id if provided (must belong to same company)
  if (categoryData.parent_id) {
    const parentExists = await prisma.itemCategory.findFirst({
      where: {
        id: parseInt(categoryData.parent_id),
        companyId: Number(companyId),
      },
    });
    if (!parentExists) {
      throw new ApiError(
        404,
        "Parent category not found or doesn't belong to your company"
      );
    }
  }

  // 2️⃣ Extract subcategories and packaging levels from category data
  const subcategories = categoryData.subcategory || [];
  const packagingLevels = categoryData.packagingLevels || [];
  const {
    subcategory: _,
    packagingLevels: __,
    ...mainCategoryData
  } = categoryData;

  // 3️⃣ Set required fields for main category
  mainCategoryData.companyId = Number(companyId);
  mainCategoryData.createdBy = Number(userId);
  mainCategoryData.parentId = categoryData.parent_id
    ? parseInt(categoryData.parent_id)
    : null;

  // 4️⃣ Map fields to match schema
  const categoryToCreate = {
    name: mainCategoryData.name,
    description: mainCategoryData.desc || mainCategoryData.description,
    hsnCode: mainCategoryData.hsn_code || null,
    primary_unit: mainCategoryData.primary_unit,
    secondary_unit: mainCategoryData.secondary_unit,
    companyId: mainCategoryData.companyId,
    createdBy: mainCategoryData.createdBy,
    parentId: mainCategoryData.parentId,
    isActive: true,
    updatedAt: new Date(),
  };

  // 5️⃣ Create parent category
  const parentCategory = await prisma.itemCategory.create({
    data: categoryToCreate,
  });

  // 6️⃣ Create subcategories if provided
  if (subcategories.length > 0) {
    for (const sub of subcategories) {
      const hsnCode = sub.useParentHsnCode ? null : (sub.hsn_code || null);
      
      await prisma.itemCategory.create({
        data: {
          name: sub.name,
          description: sub.desc || sub.description,
          hsnCode: hsnCode,
          useParentHsnCode: sub.useParentHsnCode || false,
          primary_unit: sub.primary_unit || categoryToCreate.primary_unit,
          secondary_unit: sub.secondary_unit || categoryToCreate.secondary_unit,
          companyId: Number(companyId),
          createdBy: Number(userId),
          parentId: parentCategory.id,
          isActive: true,
          updatedAt: new Date(),
        },
      });
    }
  }

  // 7️⃣ Create packaging hierarchy if provided
  if (packagingLevels.length > 0) {
    // Delete any existing packaging hierarchy for this category (just in case)
    await prisma.packagingHierarchy.deleteMany({
      where: { categoryId: parentCategory.id },
    });

    // Create new packaging hierarchy
    const packagingPromises = packagingLevels.map((level, index) => {
      return prisma.packagingHierarchy.create({
        data: {
          categoryId: parentCategory.id,
          level: index + 1,
          parentUnitId: Number(level.parentUnitId),
          childUnitId: Number(level.childUnitId),
          conversionQuantity: Number(level.conversionQuantity),
          isActive: true,
        },
      });
    });

    await Promise.all(packagingPromises);
  }

  // 8️⃣ Clear cache
  cacheManager.delete(`category_${parentCategory.id}_false`);
  cacheManager.delete(`category_${parentCategory.id}_true`);

  // 9️⃣ Return full category with subcategories
  return await getCategoryById(parentCategory.id, true);
};

const getAllCategories = async (companyId, options = {}, dataFilters = {}) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
    parentId = null,
  } = options;

  const where = {
    companyId: Number(companyId),
    isActive: true,
    ...dataFilters,
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (parentId === 'null') {
    where.parentId = null;
  } else if (parentId) {
    where.parentId = Number(parentId);
  } else {
    where.parentId = null; // default fetch only parent categories
  }

  const orderBy = { [sortBy]: sortOrder };

  const parentCategories = await prisma.itemCategory.findMany({
    where,
    orderBy,
    skip: (page - 1) * limit,
    take: limit,
    include: {
      other_ItemCategory: true, // subcategories
    },
  });

  const total = await prisma.itemCategory.count({ where });

  // Get packaging hierarchy for all categories
  const categoryIds = parentCategories.map((cat) => cat.id);
  const packagingHierarchies = await prisma.packagingHierarchy.findMany({
    where: {
      categoryId: { in: categoryIds },
      isActive: true,
    },
    include: {
      parentUnit: true,
      childUnit: true,
    },
    orderBy: { level: 'asc' },
  });

  // Group packaging hierarchies by category ID
  const hierarchyByCategory = packagingHierarchies.reduce((acc, h) => {
    if (!acc[h.categoryId]) acc[h.categoryId] = [];
    acc[h.categoryId].push({
      level: h.level,
      from: h.parentUnit.name,
      fromAbbr: h.parentUnit.abbreviation,
      to: h.childUnit.name,
      toAbbr: h.childUnit.abbreviation,
      quantity: h.conversionQuantity,
      parentUnitId: h.parentUnitId,
      childUnitId: h.childUnitId,
      conversionQuantity: h.conversionQuantity,
    });
    return acc;
  }, {});

  const formatted = parentCategories.map((parent) => ({
    id: parent.id,
    name: parent.name,
    description: parent.description,
    hsn_code: parent.hsnCode,
    primary_unit: parent.primary_unit,
    secondary_unit: parent.secondary_unit,
    parentId: parent.parentId,
    isActive: parent.isActive,
    createdAt: parent.createdAt,
    packagingHierarchy: hierarchyByCategory[parent.id] || [],
    subcategories: parent.other_ItemCategory.map((sub) => ({
      id: sub.id,
      name: sub.name,
      description: sub.description,
      hsn_code: sub.hsnCode,
      useParentHsnCode: sub.useParentHsnCode,
      parentId: sub.parentId,
      isActive: sub.isActive,
      createdAt: sub.createdAt,
    })),
  }));

  return {
    data: formatted,
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

const getCategoryById = async (categoryId, includeRelations = false) => {
  const cacheKey = `category_${categoryId}_${includeRelations}`;
  const cached = cacheManager.get(cacheKey);
  if (cached) return cached;

  const include = includeRelations
    ? {
        ItemCategory: true, // parent
        other_ItemCategory: true, // subcategories
        CompanyDetails: true,
        User: true,
      }
    : undefined;

  const category = await prisma.itemCategory.findUnique({
    where: { id: parseInt(categoryId) },
    include,
  });

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  // Get packaging hierarchy for this category
  const packagingHierarchy = await prisma.packagingHierarchy.findMany({
    where: {
      categoryId: parseInt(categoryId),
      isActive: true,
    },
    include: {
      parentUnit: true,
      childUnit: true,
    },
    orderBy: { level: 'asc' },
  });

  // Format packaging hierarchy
  const formattedHierarchy = packagingHierarchy.map((h) => ({
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

  // Format response to match API expectations
  const formatted = {
    ...category,
    hsn_code: category.hsnCode,
    other_ItemCategory: category.other_ItemCategory?.map((sub) => ({
      ...sub,
      hsn_code: sub.useParentHsnCode ? category.hsnCode : sub.hsnCode,
      useParentHsnCode: sub.useParentHsnCode,
    })),
    packagingHierarchy: formattedHierarchy,
  };

  cacheManager.set(cacheKey, formatted, 10 * 60 * 1000);
  return formatted;
};

const updateCategory = async (categoryId, updateData, userId, companyId) => {
  const existingCategory = await getCategoryById(categoryId);

  // Ensure category belongs to user's company
  if (existingCategory.companyId !== Number(companyId)) {
    throw new ApiError(403, 'You can only update categories from your company');
  }

  if (updateData.parent_id) {
    if (parseInt(updateData.parent_id) === parseInt(categoryId)) {
      throw new ApiError(400, 'Category cannot be its own parent');
    }

    const parentExists = await prisma.itemCategory.findFirst({
      where: {
        id: parseInt(updateData.parent_id),
        companyId: Number(companyId),
      },
    });
    if (!parentExists) {
      throw new ApiError(404, 'Parent category not found in your company');
    }
  }

  // Extract subcategories and packaging levels if provided
  const subcategories = updateData.subcategory || [];
  const packagingLevels = updateData.packagingLevels || [];
  const { subcategory: _, packagingLevels: __, ...dataToUpdateRaw } = updateData;

  // Map update data to schema fields
  const dataToUpdate = {
    name: dataToUpdateRaw.name,
    description: dataToUpdateRaw.desc || dataToUpdateRaw.description,
    hsnCode: dataToUpdateRaw.useParentHsnCode ? null : (dataToUpdateRaw.hsn_code || null),
    useParentHsnCode: dataToUpdateRaw.useParentHsnCode || false,
    primary_unit: dataToUpdateRaw.primary_unit,
    secondary_unit: dataToUpdateRaw.secondary_unit,
    parentId: dataToUpdateRaw.parent_id
      ? parseInt(dataToUpdateRaw.parent_id)
      : null,
    updatedAt: new Date(),
  };

  const updatedCategory = await prisma.itemCategory.update({
    where: { id: parseInt(categoryId) },
    data: dataToUpdate,
  });

  // Update subcategories if provided
  if (subcategories.length > 0) {
    // Delete existing subcategories
    await prisma.itemCategory.deleteMany({
      where: { parentId: parseInt(categoryId) },
    });

    // Create new subcategories
    for (const sub of subcategories) {
      const hsnCode = sub.useParentHsnCode ? null : (sub.hsn_code || null);
      
      await prisma.itemCategory.create({
        data: {
          name: sub.name,
          description: sub.desc || sub.description,
          hsnCode: hsnCode,
          useParentHsnCode: sub.useParentHsnCode || false,
          primary_unit: sub.primary_unit || dataToUpdate.primary_unit,
          secondary_unit: sub.secondary_unit || dataToUpdate.secondary_unit,
          companyId: Number(companyId),
          createdBy: Number(userId),
          parentId: parseInt(categoryId),
          isActive: true,
          updatedAt: new Date(),
        },
      });
    }
  }

  // Update packaging hierarchy if provided
  if (packagingLevels.length > 0) {
    // Delete existing packaging hierarchy
    await prisma.packagingHierarchy.deleteMany({
      where: { categoryId: parseInt(categoryId) },
    });

    // Create new packaging hierarchy
    const packagingPromises = packagingLevels.map((level, index) => {
      return prisma.packagingHierarchy.create({
        data: {
          categoryId: parseInt(categoryId),
          level: index + 1,
          parentUnitId: Number(level.parentUnitId),
          childUnitId: Number(level.childUnitId),
          conversionQuantity: Number(level.conversionQuantity),
          isActive: true,
        },
      });
    });

    await Promise.all(packagingPromises);
  }

  cacheManager.delete(`category_${categoryId}_false`);
  cacheManager.delete(`category_${categoryId}_true`);

  return await getCategoryById(categoryId, true);
};

const deleteCategory = async (categoryId) => {
  const category = await prisma.itemCategory.findUnique({
    where: { id: parseInt(categoryId) },
  });
  if (!category) throw new ApiError(404, 'Category not found');

  // Find and delete subcategories recursively
  const subcategories = await prisma.itemCategory.findMany({
    where: { parentId: parseInt(categoryId) },
  });

  for (const sub of subcategories) {
    await deleteCategory(sub.id);
  }

  // Delete the category
  await prisma.itemCategory.delete({
    where: { id: parseInt(categoryId) },
  });

  cacheManager.delete(`category_${categoryId}_false`);
  cacheManager.delete(`category_${categoryId}_true`);

  return { message: 'Category deleted successfully' };
};

const getCategoryStats = async (companyId) => {
  const cacheKey = `category_stats_${companyId}`;
  const cached = cacheManager.get(cacheKey);
  if (cached) return cached;

  const [totalCategories, parentCategories, subcategories] = await Promise.all([
    prisma.itemCategory.count({
      where: { companyId: Number(companyId), isActive: true },
    }),
    prisma.itemCategory.count({
      where: { companyId: Number(companyId), parentId: null, isActive: true },
    }),
    prisma.itemCategory.count({
      where: {
        companyId: Number(companyId),
        NOT: { parentId: null },
        isActive: true,
      },
    }),
  ]);

  const stats = { totalCategories, parentCategories, subcategories };
  cacheManager.set(cacheKey, stats, 5 * 60 * 1000);
  return stats;
};

const getAttributeTemplatesByCategoryId = async (categoryId) => {
  const cacheKey = `attribute_templates_${categoryId}`;
  const cached = cacheManager.get(cacheKey);
  if (cached) return cached;

  const templates = await DatabaseUtils.findMany('attributeTemplate', {
    where: { categoryId },
    orderBy: { attributeName: 'asc' },
  });

  cacheManager.set(cacheKey, templates, 10 * 60 * 1000);
  return templates;
};

// Export as object
export const CategoryService = {
  getCategoryById,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryStats,
  getAttributeTemplatesByCategoryId,
};
