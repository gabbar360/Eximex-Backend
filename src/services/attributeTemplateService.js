import { DatabaseUtils } from '../utils/dbUtils.js';
import { cacheManager } from '../utils/cacheUtils.js';
import { ApiError } from '../utils/ApiError.js';

const getAttributeTemplateById = async (
  attributeTemplateId,
  includeRelations = false
) => {
  const cacheKey = `attribute_template_${attributeTemplateId}_${includeRelations}`;
  const cached = cacheManager.get(cacheKey);
  if (cached) return cached;

  const include = includeRelations ? { category: true } : undefined;

  const attributeTemplate = await DatabaseUtils.findOne(
    'attributeTemplate',
    { id: attributeTemplateId },
    undefined,
    include
  );

  if (!attributeTemplate) {
    throw new ApiError(404, 'Attribute template not found');
  }

  cacheManager.set(cacheKey, attributeTemplate, 10 * 60 * 1000);
  return attributeTemplate;
};

const getAllAttributeTemplates = async (companyId, options = {}) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    sortBy = 'attributeName',
    sortOrder = 'asc',
    categoryId = null,
  } = options;

  const where = { category: { companyId: Number(companyId) } };

  if (search) {
    where.OR = [
      { attributeName: { contains: search, mode: 'insensitive' } },
      { label: { contains: search, mode: 'insensitive' } },
      { dataType: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  const orderBy = { [sortBy]: sortOrder };

  return await DatabaseUtils.findMany('attributeTemplate', {
    where,
    orderBy,
    page,
    limit,
    include: { category: true },
  });
};

const createAttributeTemplate = async (attributeTemplateData, companyId) => {
  const categoryExists = await DatabaseUtils.exists('category', {
    id: attributeTemplateData.categoryId,
    companyId: Number(companyId),
  });

  if (!categoryExists) {
    throw new ApiError(404, 'Category not found');
  }

  if (attributeTemplateData.isPackingField === undefined) {
    attributeTemplateData.isPackingField = false;
  }

  const attributeTemplate = await DatabaseUtils.create(
    'attributeTemplate',
    attributeTemplateData
  );

  cacheManager.delete(`attribute_template_${attributeTemplate.id}_false`);
  cacheManager.delete(`attribute_template_${attributeTemplate.id}_true`);

  return await getAttributeTemplateById(attributeTemplate.id, true);
};

const updateAttributeTemplate = async (attributeTemplateId, updateData) => {
  await getAttributeTemplateById(attributeTemplateId);

  if (updateData.categoryId) {
    const categoryExists = await DatabaseUtils.exists('category', {
      id: updateData.categoryId,
    });
    if (!categoryExists) {
      throw new ApiError(404, 'Category not found');
    }
  }

  const updated = await DatabaseUtils.update(
    'attributeTemplate',
    { id: attributeTemplateId },
    updateData
  );

  cacheManager.delete(`attribute_template_${attributeTemplateId}_false`);
  cacheManager.delete(`attribute_template_${attributeTemplateId}_true`);

  return updated;
};

const deleteAttributeTemplate = async (attributeTemplateId) => {
  await getAttributeTemplateById(attributeTemplateId);

  await DatabaseUtils.delete('attributeTemplate', {
    id: attributeTemplateId,
  });

  cacheManager.delete(`attribute_template_${attributeTemplateId}_false`);
  cacheManager.delete(`attribute_template_${attributeTemplateId}_true`);

  return { message: 'Attribute template deleted successfully' };
};

const getAttributeTemplateStats = async (companyId) => {
  const cacheKey = `attribute_template_stats_${companyId}`;
  const cached = cacheManager.get(cacheKey);
  if (cached) return cached;

  const [totalTemplates, packingFields, nonPackingFields] = await Promise.all([
    DatabaseUtils.count('attributeTemplate', {
      category: { companyId: Number(companyId) },
    }),
    DatabaseUtils.count('attributeTemplate', {
      category: { companyId: Number(companyId) },
      isPackingField: true,
    }),
    DatabaseUtils.count('attributeTemplate', {
      category: { companyId: Number(companyId) },
      isPackingField: false,
    }),
  ]);

  const stats = { totalTemplates, packingFields, nonPackingFields };
  cacheManager.set(cacheKey, stats, 5 * 60 * 1000);
  return stats;
};

export const AttributeTemplateService = {
  getAttributeTemplateById,
  getAllAttributeTemplates,
  createAttributeTemplate,
  updateAttributeTemplate,
  deleteAttributeTemplate,
  getAttributeTemplateStats,
};
