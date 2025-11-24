import Joi from 'joi';

const createShipmentSchema = Joi.object({
  orderId: Joi.number().integer().positive().required(),
  bookingNumber: Joi.string().trim().allow('', null),
  bookingDate: Joi.date().allow(null),
  vesselVoyageInfo: Joi.string().trim().allow('', null),
  wayBillNumber: Joi.string().trim().allow('', null),
  truckNumber: Joi.string().trim().allow('', null),
  blNumber: Joi.string().trim().allow('', null),
});

const updateShipmentSchema = Joi.object({
  bookingNumber: Joi.string().trim().allow('', null),
  bookingDate: Joi.date().allow(null),
  vesselVoyageInfo: Joi.string().trim().allow('', null),
  wayBillNumber: Joi.string().trim().allow('', null),
  truckNumber: Joi.string().trim().allow('', null),
  blNumber: Joi.string().trim().allow('', null),
});

export { createShipmentSchema, updateShipmentSchema };
