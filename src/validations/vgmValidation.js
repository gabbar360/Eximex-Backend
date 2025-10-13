const Joi = require('joi');

const createVgmSchema = Joi.object({
  piInvoiceId: Joi.number().integer().positive().required(),
  productPackagingStepId: Joi.number().integer().positive().optional(),
  verifiedGrossMass: Joi.number().positive().required(),
  method: Joi.string().valid('METHOD_1', 'METHOD_2').required(),
  cargoWeight: Joi.number().positive().when('method', {
    is: 'METHOD_2',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  packagingWeight: Joi.number().positive().when('method', {
    is: 'METHOD_2',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  containerTareWeight: Joi.number().positive().when('method', {
    is: 'METHOD_2',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  verifiedBy: Joi.string().min(1).max(100).required(),
  verifierPosition: Joi.string().max(100).optional(),
  verificationDate: Joi.date().required(),
  weighingLocation: Joi.string().max(200).optional(),
  vesselName: Joi.string().max(100).optional(),
  voyageNumber: Joi.string().max(50).optional(),
  portOfLoading: Joi.string().max(100).optional(),
  containerType: Joi.string()
    .valid('NORMAL', 'REEFER', 'HAZARDOUS', 'OTHER')
    .optional(),
  hazardousUnNo: Joi.string().max(20).optional(),
  imdgClass: Joi.string().max(50).optional(),
  remarks: Joi.string().max(500).optional(),
});

const updateVgmSchema = Joi.object({
  productPackagingStepId: Joi.number().integer().positive().optional(),
  verifiedGrossMass: Joi.number().positive().optional(),
  method: Joi.string().valid('METHOD_1', 'METHOD_2').optional(),
  cargoWeight: Joi.number().positive().optional(),
  packagingWeight: Joi.number().positive().optional(),
  containerTareWeight: Joi.number().positive().optional(),
  verifiedBy: Joi.string().min(1).max(100).optional(),
  verifierPosition: Joi.string().max(100).optional(),
  verificationDate: Joi.date().optional(),
  weighingLocation: Joi.string().max(200).optional(),
  vesselName: Joi.string().max(100).optional(),
  voyageNumber: Joi.string().max(50).optional(),
  portOfLoading: Joi.string().max(100).optional(),
  containerType: Joi.string()
    .valid('NORMAL', 'REEFER', 'HAZARDOUS', 'OTHER')
    .optional(),
  hazardousUnNo: Joi.string().max(20).optional(),
  imdgClass: Joi.string().max(50).optional(),
  remarks: Joi.string().max(500).optional(),
  status: Joi.string()
    .valid('PENDING', 'VERIFIED', 'SUBMITTED', 'APPROVED', 'REJECTED')
    .optional(),
});

module.exports = {
  createVgmSchema,
  updateVgmSchema,
};
