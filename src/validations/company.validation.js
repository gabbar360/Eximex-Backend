import Joi from 'joi';

const baseSchema = {
  name: Joi.string().required(),
  address: Joi.string().optional().allow(''),
  phone_no: Joi.string().optional().allow(''),
  phoneNo: Joi.string().optional().allow(''),
  email: Joi.string().email().optional().allow(''),
  gst_number: Joi.string().optional().allow(''),
  gstNumber: Joi.string().optional().allow(''),
  iec_number: Joi.string().optional().allow(''),
  iecNumber: Joi.string().optional().allow(''),
  currencies: Joi.alternatives()
    .try(Joi.array().items(Joi.string()).min(1), Joi.string())
    .optional(),
  default_currency: Joi.string().required(),
  defaultCurrency: Joi.string().optional().allow(''),
  allowed_units: Joi.alternatives()
    .try(Joi.array().items(Joi.string()).min(1), Joi.string())
    .optional(),
  plan_id: Joi.string().default('trial'),
  bank_name: Joi.string().optional().allow(''),
  bank_address: Joi.string().optional().allow(''),
  account_number: Joi.string().optional().allow(''),
  ifsc_code: Joi.string().optional().allow(''),
  swift_code: Joi.string().optional().allow(''),
  bankName: Joi.string().optional().allow(''),
  bankAddress: Joi.string().optional().allow(''),
  accountNumber: Joi.string().optional().allow(''),
  ifscCode: Joi.string().optional().allow(''),
  swiftCode: Joi.string().optional().allow(''),
};

const create = {
  body: Joi.object(baseSchema),
};

const update = {
  body: Joi.object({
    ...baseSchema,
    name: Joi.string().optional(),
    default_currency: Joi.string().optional(), // make optional for updates
  }),
};

export const companyValidation = {
  create,
  update,
};
