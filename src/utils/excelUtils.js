/**
 * Excel Data Processing Utilities
 * Handles spacing issues and data validation for bulk uploads
 */

/**
 * Safely extracts and trims string values from Excel cells
 * @param {any} cellValue - Raw cell value from Excel
 * @param {string} defaultValue - Default value if cell is empty
 * @returns {string} Trimmed string value
 */
export const safeStringExtract = (cellValue, defaultValue = '') => {
  if (cellValue === null || cellValue === undefined) {
    return defaultValue;
  }
  
  const stringValue = cellValue.toString().trim();
  return stringValue === '' ? defaultValue : stringValue;
};

/**
 * Safely extracts and validates numeric values from Excel cells
 * @param {any} cellValue - Raw cell value from Excel
 * @param {number} defaultValue - Default value if cell is empty or invalid
 * @returns {number|null} Parsed numeric value or null
 */
export const safeNumericExtract = (cellValue, defaultValue = null) => {
  if (cellValue === null || cellValue === undefined || cellValue === '') {
    return defaultValue;
  }
  
  const stringValue = cellValue.toString().trim();
  if (stringValue === '') {
    return defaultValue;
  }
  
  const numericValue = parseFloat(stringValue);
  return isNaN(numericValue) ? defaultValue : numericValue;
};

/**
 * Safely extracts and validates integer values from Excel cells
 * @param {any} cellValue - Raw cell value from Excel
 * @param {number} defaultValue - Default value if cell is empty or invalid
 * @returns {number|null} Parsed integer value or null
 */
export const safeIntegerExtract = (cellValue, defaultValue = null) => {
  if (cellValue === null || cellValue === undefined || cellValue === '') {
    return defaultValue;
  }
  
  const stringValue = cellValue.toString().trim();
  if (stringValue === '') {
    return defaultValue;
  }
  
  const integerValue = parseInt(stringValue);
  return isNaN(integerValue) ? defaultValue : integerValue;
};

/**
 * Validates and normalizes currency codes
 * @param {any} cellValue - Raw currency value from Excel
 * @returns {string} Normalized currency code
 */
export const validateCurrency = (cellValue) => {
  const currency = safeStringExtract(cellValue, 'USD').toUpperCase();
  const validCurrencies = ['USD', 'INR', 'EUR', 'GBP'];
  
  if (!validCurrencies.includes(currency)) {
    throw new Error(`Currency must be one of: ${validCurrencies.join(', ')}`);
  }
  
  return currency;
};

/**
 * Validates and normalizes weight units
 * @param {any} cellValue - Raw weight unit value from Excel
 * @returns {string} Normalized weight unit
 */
export const validateWeightUnit = (cellValue) => {
  const unit = safeStringExtract(cellValue, 'kg').toLowerCase();
  const validUnits = ['kg', 'g', 'lb', 'oz'];
  
  if (!validUnits.includes(unit)) {
    throw new Error(`Weight Unit must be one of: ${validUnits.join(', ')}`);
  }
  
  return unit;
};

/**
 * Validates required fields and throws descriptive errors
 * @param {object} row - Excel row data
 * @param {string[]} requiredFields - Array of required field names
 */
export const validateRequiredFields = (row, requiredFields) => {
  const errors = [];
  
  requiredFields.forEach(field => {
    const value = safeStringExtract(row[field]);
    if (!value) {
      errors.push(`${field} is required`);
    }
  });
  
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }
};

/**
 * Validates field length constraints
 * @param {string} fieldName - Name of the field being validated
 * @param {any} cellValue - Raw cell value from Excel
 * @param {number} maxLength - Maximum allowed length
 */
export const validateFieldLength = (fieldName, cellValue, maxLength) => {
  const value = safeStringExtract(cellValue);
  if (value && value.length > maxLength) {
    throw new Error(`${fieldName} cannot exceed ${maxLength} characters`);
  }
};

/**
 * Validates positive numeric values
 * @param {string} fieldName - Name of the field being validated
 * @param {any} cellValue - Raw cell value from Excel
 * @param {boolean} allowZero - Whether zero is allowed
 * @returns {number|null} Validated numeric value
 */
export const validatePositiveNumber = (fieldName, cellValue, allowZero = false) => {
  if (cellValue === null || cellValue === undefined || cellValue === '') {
    return null;
  }
  
  const numericValue = safeNumericExtract(cellValue);
  if (numericValue === null) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  
  const minValue = allowZero ? 0 : 0.000001;
  if (numericValue < minValue) {
    throw new Error(`${fieldName} must be a ${allowZero ? 'non-negative' : 'positive'} number`);
  }
  
  return numericValue;
};

/**
 * Validates positive integer values
 * @param {string} fieldName - Name of the field being validated
 * @param {any} cellValue - Raw cell value from Excel
 * @param {boolean} allowZero - Whether zero is allowed
 * @returns {number|null} Validated integer value
 */
export const validatePositiveInteger = (fieldName, cellValue, allowZero = false) => {
  if (cellValue === null || cellValue === undefined || cellValue === '') {
    return null;
  }
  
  const integerValue = safeIntegerExtract(cellValue);
  if (integerValue === null) {
    throw new Error(`${fieldName} must be a valid integer`);
  }
  
  const minValue = allowZero ? 0 : 1;
  if (integerValue < minValue) {
    throw new Error(`${fieldName} must be a ${allowZero ? 'non-negative' : 'positive'} integer`);
  }
  
  return integerValue;
};

/**
 * Processes packaging hierarchy fields with proper validation
 * @param {object} row - Excel row data
 * @param {array} packagingHierarchy - Packaging hierarchy configuration
 * @returns {object} Processed dynamic fields
 */
export const processPackagingHierarchy = (row, packagingHierarchy) => {
  const dynamicFields = {};
  
  // Process only first 2 levels as per component design
  packagingHierarchy.slice(0, 2).forEach((level) => {
    const quantityField = `${level.from}Per${level.to}`;
    
    if (row[quantityField]) {
      const quantity = validatePositiveNumber(quantityField, row[quantityField]);
      if (quantity !== null) {
        dynamicFields[quantityField] = quantity;
      }
    }
  });
  
  return dynamicFields;
};

/**
 * Processes packaging material and dimension fields
 * @param {object} row - Excel row data
 * @param {string} containerName - Name of the container (e.g., 'Box', 'Pallet')
 * @returns {object} Processed packaging data
 */
export const processPackagingMaterial = (row, containerName) => {
  const packagingData = {};
  
  // Material weight
  const materialWeightKey = `${containerName} Material Weight`;
  const materialWeightUnitKey = `${containerName} Material Weight Unit`;
  
  if (row[materialWeightKey]) {
    const materialWeight = validatePositiveNumber(materialWeightKey, row[materialWeightKey]);
    if (materialWeight !== null) {
      packagingData.packagingMaterialWeight = materialWeight;
    }
  }
  
  if (row[materialWeightUnitKey]) {
    packagingData.packagingMaterialWeightUnit = validateWeightUnit(row[materialWeightUnitKey]);
  }
  
  // Dimensions
  const dimensionFields = ['Length', 'Width', 'Height'];
  dimensionFields.forEach(dimension => {
    const key = `${containerName} ${dimension} (m)`;
    if (row[key]) {
      const value = validatePositiveNumber(key, row[key]);
      if (value !== null) {
        const fieldName = `packaging${dimension}`;
        packagingData[fieldName] = value;
      }
    }
  });
  
  return packagingData;
};

/**
 * Processes unit weight fields
 * @param {object} row - Excel row data
 * @returns {object} Processed unit weight data
 */
export const processUnitWeight = (row) => {
  const unitWeightData = {};
  
  if (row['Unit Weight']) {
    const unitWeight = validatePositiveNumber('Unit Weight', row['Unit Weight']);
    if (unitWeight !== null) {
      unitWeightData.unitWeight = unitWeight;
    }
  }
  
  if (row['Unit Weight Unit']) {
    unitWeightData.unitWeightUnit = validateWeightUnit(row['Unit Weight Unit']);
  }
  
  if (row['Weight Unit Type']) {
    unitWeightData.weightUnitType = safeStringExtract(row['Weight Unit Type']);
  }
  
  return unitWeightData;
};