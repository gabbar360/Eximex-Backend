import Joi from 'joi';

const createOrder = {
  body: Joi.object()
    .keys({
      piInvoiceId: Joi.number().integer().positive().required(),
      deliveryTerms: Joi.string().allow('').optional(),
      paymentAmount: Joi.number().positive().allow(null).optional(),
      bookingNumber: Joi.string().allow('').allow(null).optional(),
      bookingDate: Joi.date().allow(null).optional(),
      wayBillNumber: Joi.string().allow('').allow(null).optional(),
      truckNumber: Joi.string().allow('').allow(null).optional(),
    })
    .unknown(false),
};

const updateOrder = {
  body: Joi.object().keys({
    deliveryTerms: Joi.string().optional(),
    bookingNumber: Joi.string().optional(),
    bookingDate: Joi.date().optional(),
    wayBillNumber: Joi.string().optional(),
    truckNumber: Joi.string().optional(),
    orderStatus: Joi.string()
      .valid(
        'pending',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'cancelled'
      )
      .optional(),
    paymentStatus: Joi.string()
      .valid('pending', 'partial', 'paid', 'overdue')
      .optional(),
    paymentAmount: Joi.number().optional(),
  }),
};

const updateOrderStatus = {
  body: Joi.object().keys({
    status: Joi.string()
      .valid(
        'pending',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'cancelled'
      )
      .required(),
  }),
};

const updatePaymentStatus = {
  body: Joi.object().keys({
    paymentStatus: Joi.string()
      .valid('pending', 'partial', 'paid', 'overdue')
      .required(),
  }),
};

export const orderValidation = {
  createOrder,
  updateOrder,
  updateOrderStatus,
  updatePaymentStatus,
};
