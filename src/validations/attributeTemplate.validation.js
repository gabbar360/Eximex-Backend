import Joi from 'joi';

export const attributeTemplateValidation = {
  createAttributeTemplate: {
    body: Joi.object({
      attributeName: Joi.string().required().trim(),
      label: Joi.string().required().trim(),
      dataType: Joi.string()
        .required()
        .valid('TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'SELECT', 'MULTISELECT'),
      isPackingField: Joi.boolean().default(false),
      categoryId: Joi.string().uuid().required(),
    }),
  },

  updateAttributeTemplate: {
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
    body: Joi.object({
      attributeName: Joi.string().trim(),
      label: Joi.string().trim(),
      dataType: Joi.string().valid(
        'TEXT',
        'NUMBER',
        'BOOLEAN',
        'DATE',
        'SELECT',
        'MULTISELECT'
      ),
      isPackingField: Joi.boolean(),
      categoryId: Joi.string().uuid(),
    }).min(1),
  },

  getAttributeTemplate: {
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
  },
};
