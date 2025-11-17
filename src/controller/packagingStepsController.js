import ejs from 'ejs';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { generatePDF } from '../utils/puppeteerConfig.js';
import { PackagingStepsService } from '../services/packagingStepsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const getAllPackingLists = async (req, res) => {
  try {
    const { search, page = 1, limit = 10, status } = req.query;
    
    const filters = { search, status };
    const pagination = { page, limit };
    
    const result = await PackagingStepsService.getPackingListsWithPagination(
      req.user.companyId,
      filters,
      pagination
    );
    
    const packingLists = PackagingStepsService.transformPackingLists(result.piInvoices);

    res.json({
      success: true,
      data: packingLists,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Error fetching packing lists:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch packing lists',
    });
  }
};

/**
 * Get packing list by ID (using PI invoice ID)
 */
const getPackingListById = async (req, res) => {
  try {
    const { id } = req.params;
    let piInvoice = null;
    
    // Try to find by packaging step ID first
    const packagingStep = await PackagingStepsService.findPackagingStepById(id);
    
    if (packagingStep && packagingStep.piInvoice.companyId === req.user.companyId) {
      piInvoice = packagingStep.piInvoice;
    } else {
      // If not found by packaging step, try by PI ID
      piInvoice = await PackagingStepsService.findPiInvoiceById(id, req.user.companyId);
      
      if (piInvoice) {
        console.log('Found PI by PI ID:', piInvoice.piNumber);
      }
    }

    if (!piInvoice) {
      return res.status(404).json({
        success: false,
        message: 'Packing list not found',
      });
    }

    const packingList = PackagingStepsService.buildPackingListResponse(piInvoice);

    res.json({
      success: true,
      data: packingList,
    });
  } catch (error) {
    console.error('Error fetching packing list:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch packing list',
    });
  }
};

/**
 * Create new packing list (creates/updates PI invoice with packing details)
 */
const createPackingList = async (req, res) => {
  try {
    const { piId } = req.body;

    // Validate required fields
    if (!piId) {
      return res.status(400).json({
        success: false,
        message: 'PI ID is required',
      });
    }

    const existingPI = await PackagingStepsService.findPiInvoiceById(piId, req.user.companyId);
    if (!existingPI) {
      return res.status(404).json({
        success: false,
        message: 'PI Invoice not found',
      });
    }

    // Check if packing list already exists
    const existingPackingList = await PackagingStepsService.checkExistingPackingList(piId);
    if (existingPackingList) {
      return res.status(409).json({
        success: false,
        message: 'Packing list already exists for this PI. Use update instead.',
        existingPackingListId: existingPackingList.id,
      });
    }

    const piWithProducts = await PackagingStepsService.getPiWithProducts(piId);
    const packingListData = PackagingStepsService.buildPackingListData(req.body, existingPI);
    
    // Extract container and product info
    const containerInfo = PackagingStepsService.extractContainerInfo(req.body.containers);
    
    let productId = req.body.productId ? parseInt(req.body.productId) : null;
    let categoryId = req.body.categoryId ? parseInt(req.body.categoryId) : null;
    let material = containerInfo.material;
    
    if (!productId && piWithProducts.products && piWithProducts.products.length > 0) {
      const firstPiProduct = piWithProducts.products[0];
      productId = firstPiProduct.productId;
      categoryId = categoryId || firstPiProduct.categoryId;
      material = firstPiProduct.productName || material;
    }

    // Prepare data for transaction
    const transactionData = {
      ...req.body,
      piId: parseInt(piId),
      piNumber: existingPI.piNumber,
      productId,
      categoryId,
      packagingUnitId: req.body.packagingUnitId ? parseInt(req.body.packagingUnitId) : null,
      quantity: containerInfo.quantity || parseInt(req.body.totalBoxes) || 0,
      weight: containerInfo.weight || parseFloat(req.body.totalGrossWeight) || 0,
      material,
      containerNumber: containerInfo.containerNumber,
      sealNumber: containerInfo.sealNumber,
      sealType: containerInfo.sealType,
      packingListData,
      existingPI,
      totalBoxes: parseInt(req.body.totalBoxes) || 0,
      totalGrossWeight: parseFloat(req.body.totalGrossWeight) || 0,
      totalVolume: parseFloat(req.body.totalVolume) || 0,
      totalContainers: parseInt(req.body.totalContainers) || 0,
      methodOfDispatch: req.body.methodOfDispatch,
      shipmentType: req.body.shipmentType,
    };

    const result = await PackagingStepsService.createPackingListTransaction(transactionData, req.user.id);
    const { packingListEntry, updatedPI } = result;

    // Create response
    const packingList = {
      id: packingListEntry.id,
      piId: parseInt(piId),
      ...req.body,
      countryOfOrigin: req.body.countryOfOrigin || 'India',
      containers: req.body.containers || [],
      totalBoxes: parseInt(req.body.totalBoxes) || 0,
      totalNetWeight: parseFloat(req.body.totalNetWeight) || 0,
      totalGrossWeight: parseFloat(req.body.totalGrossWeight) || 0,
      totalVolume: parseFloat(req.body.totalVolume) || 0,
      totalContainers: parseInt(req.body.totalContainers) || 0,
      createdAt: packingListEntry.createdAt,
      updatedAt: packingListEntry.updatedAt,
      piInvoice: {
        id: updatedPI.id,
        piNumber: updatedPI.piNumber,
        invoiceDate: updatedPI.invoiceDate,
        partyName: updatedPI.partyName,
      },
      packingListEntryId: packingListEntry.id,
    };

    res.status(201).json({
      success: true,
      data: packingList,
      message: 'Packing list created successfully',
    });
  } catch (error) {
    console.error('Error creating packing list:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create packing list',
    });
  }
};

/**
 * Update packing list (updates PI invoice and packing list entry)
 */
const updatePackingList = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    const packingListEntry = await PackagingStepsService.findPackingListForUpdate(id, req.user.companyId);
    
    if (!packingListEntry) {
      return res.status(404).json({
        success: false,
        message: 'Packing list entry not found',
      });
    }

    // Parse existing packing list data
    let existingPackingData = {};
    if (packingListEntry.notes) {
      try {
        existingPackingData = typeof packingListEntry.notes === 'string' 
          ? JSON.parse(packingListEntry.notes) 
          : packingListEntry.notes;
      } catch (error) {
        console.error('Error parsing existing packing list data:', error);
      }
    }

    // Merge with update data
    const updatedPackingData = PackagingStepsService.mergePackingListData(existingPackingData, updateData);

    // Extract productId and categoryId for update if not already set
    let updateProductId = packingListEntry.productId;
    let updateCategoryId = packingListEntry.categoryId;

    if (!updateProductId || !updateCategoryId) {
      const piWithProducts = await PackagingStepsService.getPiWithProducts(packingListEntry.piInvoiceId);
      
      if (piWithProducts.products && piWithProducts.products.length > 0) {
        const firstPiProduct = piWithProducts.products[0];
        updateProductId = updateProductId || firstPiProduct.productId;
        updateCategoryId = updateCategoryId || firstPiProduct.categoryId;
      }
    }

    // Update the packing list entry
    const updatedPackingListEntry = await PackagingStepsService.updatePackingListEntry(
      packingListEntry.id,
      {
        productId: updateProductId,
        categoryId: updateCategoryId,
        updatedPackingData,
      },
      req.user.id
    );

    // Update PI invoice with relevant data
    const updatedPI = await PackagingStepsService.updatePiInvoice(
      packingListEntry.piInvoiceId,
      {
        methodOfDispatch: updateData.methodOfDispatch || packingListEntry.piInvoice.deliveryTerm,
        shipmentType: updateData.shipmentType || packingListEntry.piInvoice.containerType,
        totalBoxes: parseInt(updateData.totalBoxes) || packingListEntry.piInvoice.totalBoxes,
        totalGrossWeight: parseFloat(updateData.totalGrossWeight) || packingListEntry.piInvoice.totalWeight,
        totalVolume: parseFloat(updateData.totalVolume) || packingListEntry.piInvoice.totalVolume,
        totalContainers: parseInt(updateData.totalContainers) || packingListEntry.piInvoice.requiredContainers,
      },
      req.user.id
    );

    // Create response
    const packingList = {
      id: updatedPackingListEntry.id,
      piId: updatedPI.id,
      ...updatedPackingData,
      updatedAt: updatedPackingListEntry.updatedAt,
      piInvoice: {
        id: updatedPI.id,
        piNumber: updatedPI.piNumber,
        invoiceDate: updatedPI.invoiceDate,
        partyName: updatedPI.partyName,
      },
    };

    res.json({
      success: true,
      data: packingList,
      message: 'Packing list updated successfully',
    });
  } catch (error) {
    console.error('Error updating packing list:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update packing list',
    });
  }
};

/**
 * Delete packing list (soft delete PI or remove packaging steps)
 */
const deletePackingList = async (req, res) => {
  try {
    const { id } = req.params;

    const packingRecord = await PackagingStepsService.findPackingRecordForDelete(id, req.user.companyId);
    
    if (!packingRecord) {
      return res.status(404).json({
        success: false,
        message: 'Packing list not found',
      });
    }

    await PackagingStepsService.deletePackingRecord(packingRecord.id);

    res.json({
      success: true,
      message: 'Packing list deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting packing list:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete packing list',
    });
  }
};

/**
 * Get packing lists by PI ID (alias for getPackingListById)
 */
const getPackingListsByPI = async (req, res) => {
  try {
    const { piId } = req.params;

    const piInvoices = await prisma.piInvoice.findMany({
      where: {
        id: parseInt(piId),
        companyId: req.user.companyId,
        packingLists: {
          some: {
            isActive: true,
          },
        },
      },
      include: {
        party: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true,
          },
        },
        packingLists: {
          where: { isActive: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform to match frontend expectations
    const packingLists = piInvoices.map((pi) => ({
      id: pi.id,
      piId: pi.id,
      exportInvoiceNo: pi.piNumber,
      exportInvoiceDate: pi.invoiceDate,
      buyerReference: pi.party?.companyName || pi.partyName || '',
      status: pi.status,
      totalBoxes: pi.totalBoxes || 0,
      totalWeight: pi.totalWeight || 0,
      totalVolume: pi.totalVolume || 0,
      createdAt: pi.createdAt,
      updatedAt: pi.updatedAt,
      piInvoice: {
        id: pi.id,
        piNumber: pi.piNumber,
        invoiceDate: pi.invoiceDate,
        partyName: pi.party?.companyName || pi.partyName || '',
        status: pi.status,
      },
    }));

    res.json({
      success: true,
      data: packingLists,
    });
  } catch (error) {
    console.error('Error fetching packing lists by PI:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch packing lists',
    });
  }
};

const downloadPackingListPDF = async (req, res) => {
  try {
    const { id } = req.params;

    let packingListEntry = await PackagingStepsService.getPackingListForPDF(id, req.user.companyId);
    
    if (!packingListEntry) {
      return res.status(404).json({
        success: false,
        message: 'Packing list not found',
      });
    }

    // Parse packing list data for container info
    let packingListData = {};
    if (packingListEntry.notes) {
      try {
        packingListData =
          typeof packingListEntry.notes === 'string'
            ? JSON.parse(packingListEntry.notes)
            : packingListEntry.notes;
      } catch (error) {
        console.error('Error parsing packing list data:', error);
      }
    }

    // Group packing lists by product
    const stepsByProduct = PackagingStepsService.groupPackagingStepsByProduct(
      packingListEntry.piInvoice.packingLists
    );

    // Add container and seal numbers to products
    PackagingStepsService.addContainerInfoToProducts(
      packingListEntry.piInvoice.products,
      packingListData,
      packingListEntry.piInvoice.packingLists
    );

    // Convert company logo to base64
    let logoBase64 = null;
    try {
      if (packingListEntry.piInvoice.company?.logo) {
        const logoFilename = packingListEntry.piInvoice.company.logo
          .split('/')
          .pop();
        const logoPath = join(__dirname, '../../uploads/logos', logoFilename);
        if (fs.existsSync(logoPath)) {
          const logoBuffer = fs.readFileSync(logoPath);
          logoBase64 = logoBuffer.toString('base64');
        }
      }
    } catch (error) {
      console.error('Error reading company logo file:', error);
    }

    // Get shipment data if available
    let shipment = null;
    if (packingListEntry.piInvoice.orders && packingListEntry.piInvoice.orders.length > 0) {
      const order = packingListEntry.piInvoice.orders[0];
      if (order.shipment) {
        shipment = order.shipment;
      }
    }

    // Render EJS template
    const templatePath = join(
      __dirname,
      '../views/packaging-details-template.ejs'
    );
    const htmlContent = await ejs.renderFile(templatePath, {
      piInvoice: packingListEntry.piInvoice,
      stepsByProduct: stepsByProduct,
      packingListData: packingListData,
      logoBase64: logoBase64,
      shipment: shipment,
    });

    // Generate PDF
    const pdfBuffer = await generatePDF(htmlContent, {
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
    });

    // Set response headers for PDF download
    const filename = `packing-list-${packingListEntry.piInvoice.piNumber}-${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error downloading packing list PDF:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to download packing list PDF',
    });
  }
};

const downloadPackingingListPortDetailsPDF = async (req, res) => {
  try {
    const { id } = req.params;

    let packingListEntry = await PackagingStepsService.getPackingListForPortPDF(id, req.user.companyId);
    
    if (!packingListEntry) {
      return res.status(404).json({
        success: false,
        message: 'Packing list not found',
      });
    }

    // Parse packing list data for container info
    let packingListData = {};
    if (packingListEntry.notes) {
      try {
        packingListData =
          typeof packingListEntry.notes === 'string'
            ? JSON.parse(packingListEntry.notes)
            : packingListEntry.notes;
      } catch (error) {
        console.error('Error parsing packing list data:', error);
      }
    }

    // Group packing lists by product
    const stepsByProduct = PackagingStepsService.groupPackagingStepsByProduct(
      packingListEntry.piInvoice.packingLists
    );

    // Add container and seal numbers to products
    PackagingStepsService.addContainerInfoToProducts(
      packingListEntry.piInvoice.products,
      packingListData,
      packingListEntry.piInvoice.packingLists
    );

    // Convert company logo to base64
    let logoBase64 = null;
    try {
      if (packingListEntry.piInvoice.company?.logo) {
        const logoFilename = packingListEntry.piInvoice.company.logo
          .split('/')
          .pop();
        const logoPath = join(__dirname, '../../uploads/logos', logoFilename);
        if (fs.existsSync(logoPath)) {
          const logoBuffer = fs.readFileSync(logoPath);
          logoBase64 = logoBuffer.toString('base64');
        }
      }
    } catch (error) {
      console.error('Error reading company logo file:', error);
    }

    // Get shipment data if available
    let shipment = null;
    if (packingListEntry.piInvoice.orders && packingListEntry.piInvoice.orders.length > 0) {
      const order = packingListEntry.piInvoice.orders[0];
      if (order.shipment) {
        shipment = order.shipment;
      }
    }

    // Render EJS template
    const templatePath = join(
      __dirname,
      '../views/packaging-port-delivery-details-template.ejs'
    );
    const htmlContent = await ejs.renderFile(templatePath, {
      piInvoice: packingListEntry.piInvoice,
      stepsByProduct: stepsByProduct,
      packingListData: packingListData,
      logoBase64: logoBase64,
      shipment: shipment,
    });

    // Generate PDF
    const pdfBuffer = await generatePDF(htmlContent, {
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
    });

    // Set response headers for PDF download
    const filename = `packing-list-${packingListEntry.piInvoice.piNumber}-${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error downloading packing list PDF:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to download packing list PDF',
    });
  }
};
export {
  getAllPackingLists,
  getPackingListById,
  createPackingList,
  updatePackingList,
  deletePackingList,
  getPackingListsByPI,
  downloadPackingListPDF,
  downloadPackingingListPortDetailsPDF
};
