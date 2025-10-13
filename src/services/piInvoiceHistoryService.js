import { prisma } from '../config/dbConfig.js';

/**
 * Create a history record for PI invoice actions
 * @param {number} piInvoiceId - The ID of the PI invoice
 * @param {string} action - The action performed (CREATE, UPDATE, DELETE)
 * @param {object} changeData - Data that was changed
 * @param {number} userId - The ID of the user who performed the action
 * @param {object} options - Additional options for the history record
 * @param {string} options.ipAddress - IP address of the user
 * @param {string} options.deviceInfo - User agent or device information
 * @param {string} options.description - Human-readable description of the change
 * @param {string} options.statusBefore - Invoice status before change
 * @param {string} options.statusAfter - Invoice status after change
 * @param {string[]} options.changedFields - List of fields that were changed
 * @returns {Promise<object>} - The created history record
 */
const createPiInvoiceHistory = async (
  piInvoiceId,
  action,
  changeData,
  userId,
  options = {}
) => {
  try {
    console.log(
      `Creating history record for PI invoice ${piInvoiceId}, action: ${action}`
    );

    // Extract fields from previous and updated data for UPDATE actions
    let changedFields = options.changedFields || [];
    let statusBefore = options.statusBefore;
    let statusAfter = options.statusAfter;

    if (
      action === 'UPDATE' &&
      changeData &&
      changeData.previous &&
      changeData.updated
    ) {
      // If changedFields not provided, calculate them
      if (!changedFields.length) {
        changedFields = getChangedFields(
          changeData.previous,
          changeData.updated
        );
      }

      // If status fields not provided, extract them
      if (!statusBefore && changeData.previous.status) {
        statusBefore = changeData.previous.status;
      }

      if (!statusAfter && changeData.updated.status) {
        statusAfter = changeData.updated.status;
      }
    } else if (action === 'CREATE') {
      statusAfter = changeData.status || 'Pending';
    } else if (action === 'DELETE') {
      statusBefore = changeData.status;
    }

    const historyRecord = await prisma.piInvoiceHistory.create({
      data: {
        piInvoiceId,
        action,
        changeData,
        description:
          options.description || getDefaultDescription(action, piInvoiceId),
        ipAddress: options.ipAddress || null,
        deviceInfo: options.deviceInfo || null,
        statusBefore: statusBefore || null,
        statusAfter: statusAfter || null,
        changedFields: changedFields,
        createdBy: userId,
      },
    });

    console.log(`History record created successfully: ${historyRecord.id}`);
    return historyRecord;
  } catch (error) {
    console.error(
      `Error creating history record for PI invoice ${piInvoiceId}:`,
      error
    );
    throw error;
  }
};

/**
 * Generate a default description based on the action
 * @param {string} action - The action performed
 * @param {number} piInvoiceId - The PI invoice ID
 * @returns {string} - A human-readable description
 */
const getDefaultDescription = (action, piInvoiceId) => {
  switch (action) {
    case 'CREATE':
      return `PI Invoice #${piInvoiceId} was created`;
    case 'UPDATE':
      return `PI Invoice #${piInvoiceId} was updated`;
    case 'DELETE':
      return `PI Invoice #${piInvoiceId} was deleted`;
    default:
      return `Action '${action}' performed on PI Invoice #${piInvoiceId}`;
  }
};

/**
 * Compare two objects and return a list of changed field names
 * @param {object} previous - Previous state
 * @param {object} updated - Updated state
 * @returns {string[]} - List of changed field names
 */
const getChangedFields = (previous, updated) => {
  const changedFields = [];

  // Compare top-level fields
  Object.keys(updated).forEach((key) => {
    // Skip products array for special handling
    if (key === 'products') return;

    // Check if field exists in previous and has changed
    if (
      previous[key] !== undefined &&
      JSON.stringify(previous[key]) !== JSON.stringify(updated[key])
    ) {
      changedFields.push(key);
    }
    // Check if field is new
    else if (previous[key] === undefined) {
      changedFields.push(key);
    }
  });

  // Special handling for products array
  if (previous.products && updated.products) {
    if (previous.products.length !== updated.products.length) {
      changedFields.push('products');
    } else {
      // Compare products by ID
      const productsChanged = previous.products.some((prevProduct, index) => {
        const updatedProduct = updated.products[index];
        return JSON.stringify(prevProduct) !== JSON.stringify(updatedProduct);
      });

      if (productsChanged) {
        changedFields.push('products');
      }
    }
  } else if (
    (previous.products && !updated.products) ||
    (!previous.products && updated.products)
  ) {
    changedFields.push('products');
  }

  return changedFields;
};

/**
 * Get history records for a specific PI invoice
 * @param {number} piInvoiceId - The ID of the PI invoice
 * @returns {Promise<Array>} - List of history records
 */
const getPiInvoiceHistory = async (piInvoiceId) => {
  return await prisma.piInvoiceHistory.findMany({
    where: { piInvoiceId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const PiInvoiceHistoryService = {
  createPiInvoiceHistory,
  getPiInvoiceHistory,
};
