import notificationService from '../services/notificationService.js';

// Middleware to track user activities and create notifications
export const trackActivity = (entityType, action = 'VIEW') => {
  return async (req, res, next) => {
    // Store original res.json to intercept response
    const originalJson = res.json;
    
    res.json = function(data) {
      // Only track successful operations
      if (data.success !== false && req.user) {
        // Extract entity information from response or request
        const entityInfo = extractEntityInfo(req, data, entityType, action);
        
        if (entityInfo) {
          // Create notification asynchronously (don't block response)
          setImmediate(async () => {
            try {
              await notificationService.createActivityNotification({
                companyId: req.user.companyId,
                userId: req.user.id,
                createdBy: req.user.id,
                action: entityInfo.action,
                entityType: entityInfo.entityType,
                entityId: entityInfo.entityId,
                entityName: entityInfo.entityName,
                description: entityInfo.description,
                metadata: {
                  userAgent: req.get('User-Agent'),
                  ipAddress: req.ip,
                  method: req.method,
                  url: req.originalUrl
                }
              });
            } catch (error) {
              console.error('Error creating activity notification:', error);
            }
          });
        }
      }
      
      // Call original json method
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// Extract entity information from request/response
function extractEntityInfo(req, data, entityType, action) {
  try {
    let entityId = null;
    let entityName = null;
    let actualAction = action;
    
    // Determine action based on HTTP method if not specified
    if (action === 'AUTO') {
      switch (req.method) {
        case 'POST':
          actualAction = 'CREATE';
          break;
        case 'PUT':
        case 'PATCH':
          actualAction = 'UPDATE';
          break;
        case 'DELETE':
          actualAction = 'DELETE';
          break;
        default:
          actualAction = 'VIEW';
      }
    }
    
    // Extract entity ID from URL params or response data
    if (req.params.id) {
      entityId = parseInt(req.params.id);
    } else if (data.data?.id) {
      entityId = data.data.id;
    }
    
    // Extract entity name based on entity type
    switch (entityType) {
      case 'Party':
        entityName = data.data?.companyName || data.data?.contactPerson || req.body?.companyName;
        break;
      case 'Product':
        entityName = data.data?.name || req.body?.name;
        break;
      case 'Category':
        entityName = data.data?.name || req.body?.name;
        break;
      case 'PiInvoice':
        entityName = data.data?.piNumber || req.body?.piNumber;
        break;
      case 'Order':
        entityName = data.data?.orderNumber || req.body?.orderNumber;
        break;
      case 'VGM':
        entityName = data.data?.containerNumber || req.body?.containerNumber || `VGM #${entityId}`;
        break;
      case 'PurchaseOrder':
        entityName = data.data?.poNumber || req.body?.poNumber || `PO #${entityId}`;
        break;
      case 'PiProduct':
        entityName = data.data?.productName || req.body?.productName || `Product #${entityId}`;
        break;
      case 'User':
        entityName = data.data?.name || data.data?.email || req.body?.name || req.body?.email;
        break;
      case 'Company':
        entityName = data.data?.companyName || req.body?.companyName;
        break;
      case 'PackingList':
        entityName = data.data?.listName || req.body?.listName || `Packing List #${entityId}`;
        break;
      case 'PackagingHierarchy':
        entityName = data.data?.categoryName || req.body?.categoryName || `Hierarchy #${entityId}`;
        break;
      case 'PackagingUnit':
        entityName = data.data?.unitName || req.body?.unitName || `Unit #${entityId}`;
        break;
      case 'Role':
        entityName = data.data?.name || req.body?.name;
        break;
      case 'DataAssignment':
        entityName = `Data Assignment #${entityId}`;
        break;
      case 'PackagingConvert':
        entityName = `Unit Conversion #${entityId}`;
        break;
      case 'Auth':
        entityName = req.user?.name || req.user?.email || 'User';
        break;
      default:
        entityName = data.data?.name || data.data?.title || `${entityType} #${entityId}`;
    }
    
    // Generate description
    const description = generateDescription(actualAction, entityType, entityName, req);
    
    return {
      action: actualAction,
      entityType,
      entityId,
      entityName,
      description
    };
  } catch (error) {
    console.error('Error extracting entity info:', error);
    return null;
  }
}

// Generate activity description
function generateDescription(action, entityType, entityName, req) {
  const userName = req.user?.name || 'User';
  const actionMap = {
    CREATE: 'created',
    UPDATE: 'updated',
    DELETE: 'deleted',
    VIEW: 'viewed',
    LOGIN: 'logged in',
    LOGOUT: 'logged out'
  };
  
  const actionText = actionMap[action] || action.toLowerCase();
  
  if (entityName) {
    return `${userName} ${actionText} ${entityType.toLowerCase()} "${entityName}"`;
  }
  
  return `${userName} ${actionText} a ${entityType.toLowerCase()}`;
}

// Specific activity trackers for common entities
export const trackPartyActivity = (action = 'AUTO') => trackActivity('Party', action);
export const trackProductActivity = (action = 'AUTO') => trackActivity('Product', action);
export const trackCategoryActivity = (action = 'AUTO') => trackActivity('Category', action);
export const trackPiInvoiceActivity = (action = 'AUTO') => trackActivity('PiInvoice', action);
export const trackOrderActivity = (action = 'AUTO') => trackActivity('Order', action);
export const trackVgmActivity = (action = 'AUTO') => trackActivity('VGM', action);
export const trackPurchaseOrderActivity = (action = 'AUTO') => trackActivity('PurchaseOrder', action);
export const trackUserActivity = (action = 'AUTO') => trackActivity('User', action);
export const trackPaymentActivity = (action = 'AUTO') => trackActivity('Payment', action);