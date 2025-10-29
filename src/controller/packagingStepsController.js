import { PrismaClient } from '@prisma/client';
import ejs from 'ejs';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { generatePDF } from '../utils/puppeteerConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const prisma = new PrismaClient();

const getAllPackingLists = async (req, res) => {
  try {
    const { search, page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    // Build where clause for PI invoices that have packaging steps
    const where = {
      companyId: req.user.companyId,
      packagingSteps: {
        some: {
          isActive: true,
        },
      },
    };

    if (search) {
      where.OR = [
        { piNumber: { contains: search, mode: 'insensitive' } },
        { partyName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [piInvoices, total] = await Promise.all([
      prisma.piInvoice.findMany({
        where,
        include: {
          party: {
            select: {
              id: true,
              companyName: true,
              contactPerson: true,
            },
          },
          packagingSteps: {
            where: { isActive: true },
            select: {
              id: true,
              stepType: true,
              weight: true,
              // cost: true
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit),
      }),
      prisma.piInvoice.count({ where }),
    ]);

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
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
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
    // Try to find by packaging step ID first
    let piInvoice = null;
    const packagingStep = await prisma.productPackagingSteps.findFirst({
      where: {
        id: parseInt(id),
        stepType: 'PACKING',
        isActive: true,
      },
      include: {
        piInvoice: {
          include: {
            products: {
              include: {
                product: true,
                category: true,
              },
            },
            party: true,
            company: true,
            packagingSteps: {
              where: { isActive: true },
              include: {
                product: true,
                packagingUnit: true,
              },
            },
          },
        },
      },
    });

    if (
      packagingStep &&
      packagingStep.piInvoice.companyId === req.user.companyId
    ) {
      piInvoice = packagingStep.piInvoice;
    } else {
      // If not found by packaging step, try by PI ID
      piInvoice = await prisma.piInvoice.findFirst({
        where: {
          id: parseInt(id),
          companyId: req.user.companyId,
        },
        include: {
          products: {
            include: {
              product: true,
              category: true,
            },
          },
          party: true,
          company: true,
          packagingSteps: {
            where: { isActive: true },
            include: {
              product: true,
              packagingUnit: true,
            },
          },
        },
      });

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

    // Find the packing list entry (stored as a packaging step with productId = null)
    const packingListEntry = piInvoice.packagingSteps.find(
      (step) => step.productId === null && step.stepType === 'PACKING'
    );

    let packingListData = {};
    let actualNotes = '';

    if (packingListEntry && packingListEntry.notes) {
      // With Json type, notes will be automatically parsed
      packingListData = packingListEntry.notes;
      actualNotes = packingListData.notes || '';
    }

    // Transform to match frontend expectations with stored data
    const packingList = {
      id: packingListEntry?.id || piInvoice.id,
      piId: piInvoice.id,
      exportInvoiceNo: packingListData.exportInvoiceNo || piInvoice.piNumber,
      exportInvoiceDate:
        packingListData.exportInvoiceDate ||
        piInvoice.invoiceDate.toISOString().split('T')[0],
      buyerReference: packingListData.buyerReference || piInvoice.partyName,
      consigneeDetails:
        packingListData.consigneeDetails || piInvoice.party?.address || '',
      buyerDetails:
        packingListData.buyerDetails ||
        `${piInvoice.party?.companyName || piInvoice.partyName}\n${piInvoice.party?.contactPerson || ''}\n${piInvoice.address || ''}`,
      sellerInfo:
        packingListData.sellerInfo ||
        `${piInvoice.company?.name || ''}\n${piInvoice.company?.address || ''}`,
      methodOfDispatch:
        packingListData.methodOfDispatch || piInvoice.deliveryTerm || '',
      shipmentType:
        packingListData.shipmentType || piInvoice.containerType || '',
      countryOfOrigin:
        packingListData.countryOfOrigin || piInvoice.country || 'India',
      finalDestinationCountry:
        packingListData.finalDestinationCountry ||
        piInvoice.party?.country ||
        '',
      portOfLoading: packingListData.portOfLoading || '',
      portOfDischarge: packingListData.portOfDischarge || '',
      vesselVoyageNo: packingListData.vesselVoyageNo || '',

      dateOfDeparture: packingListData.dateOfDeparture || '',
      containers: packingListData.containers || [],

      notes: actualNotes,
      totalBoxes: packingListData.totalBoxes || piInvoice.totalBoxes || 0,
      totalNetWeight:
        packingListData.totalNetWeight || piInvoice.totalWeight || 0,
      totalGrossWeight:
        packingListData.totalGrossWeight || piInvoice.totalWeight || 0,
      totalVolume: packingListData.totalVolume || piInvoice.totalVolume || 0,
      totalContainers:
        packingListData.totalContainers || piInvoice.requiredContainers || 1,
      dateOfIssue:
        packingListData.dateOfIssue || new Date().toISOString().split('T')[0],
      status: packingListData.status || piInvoice.status,
      createdAt: packingListEntry?.createdAt || piInvoice.createdAt,
      updatedAt: packingListEntry?.updatedAt || piInvoice.updatedAt,
      pi: piInvoice,
    };

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
    const {
      piId,
      exportInvoiceNo,
      exportInvoiceDate,
      buyerReference,
      consigneeDetails,
      buyerDetails,
      sellerInfo,
      methodOfDispatch,
      shipmentType,
      countryOfOrigin,
      finalDestinationCountry,
      portOfLoading,
      portOfDischarge,
      vesselVoyageNo,
      dateOfDeparture,
      containers,
      notes,
      totalBoxes,
      totalNetWeight,
      totalGrossWeight,
      totalVolume,
      totalContainers,
      dateOfIssue,
      status = 'draft',
    } = req.body;

    // Validate required fields
    if (!piId) {
      return res.status(400).json({
        success: false,
        message: 'PI ID is required',
      });
    }

    const existingPI = await prisma.piInvoice.findFirst({
      where: {
        id: parseInt(piId),
        companyId: req.user.companyId,
      },
    });

    if (!existingPI) {
      return res.status(404).json({
        success: false,
        message: 'PI Invoice not found',
      });
    }

    // Check if packing list already exists for this PI
    const existingPackingList = await prisma.productPackagingSteps.findFirst({
      where: {
        piInvoiceId: parseInt(piId),
        stepType: 'PACKING',
        isActive: true,
      },
    });

    if (existingPackingList) {
      return res.status(409).json({
        success: false,
        message: 'Packing list already exists for this PI. Use update instead.',
        existingPackingListId: existingPackingList.id,
      });
    }
    const piWithProducts = await prisma.piInvoice.findUnique({
      where: { id: parseInt(piId) },
      include: {
        products: {
          include: {
            product: true,
            category: true,
          },
        },
      },
    });
    const packingListData = {
      exportInvoiceNo: exportInvoiceNo || existingPI.piNumber,
      exportInvoiceDate: exportInvoiceDate || existingPI.invoiceDate,
      buyerReference: buyerReference || existingPI.partyName,
      consigneeDetails: consigneeDetails || '',
      buyerDetails: buyerDetails || '',
      sellerInfo: sellerInfo || '',
      methodOfDispatch: methodOfDispatch || '',
      shipmentType: shipmentType || '',
      countryOfOrigin: countryOfOrigin || 'India',
      finalDestinationCountry: finalDestinationCountry || '',
      portOfLoading: portOfLoading || '',
      portOfDischarge: portOfDischarge || '',
      vesselVoyageNo: vesselVoyageNo || '',
      dateOfDeparture: dateOfDeparture || null,
      containers: containers || [],

      notes: notes || '',
      totalBoxes: parseInt(totalBoxes) || 0,
      totalNetWeight: parseFloat(totalNetWeight) || 0,
      totalGrossWeight: parseFloat(totalGrossWeight) || 0,
      totalVolume: parseFloat(totalVolume) || 0,
      totalContainers: parseInt(totalContainers) || 0,
      dateOfIssue: dateOfIssue || new Date().toISOString().split('T')[0],
      status: status || 'draft',
    };
    let quantity = totalBoxes ? parseInt(totalBoxes) : 0;
    let weight = totalGrossWeight ? parseFloat(totalGrossWeight) : 0;
    let material = 'Packing List Items';
    let containerNumber = null;
    let sealNumber = null;
    let sealType = null;
    let productId = req.body.productId ? parseInt(req.body.productId) : null;
    let categoryId = req.body.categoryId ? parseInt(req.body.categoryId) : null;
    let packagingUnitId = req.body.packagingUnitId
      ? parseInt(req.body.packagingUnitId)
      : null;

    if (
      !productId &&
      piWithProducts.products &&
      piWithProducts.products.length > 0
    ) {
      const firstPiProduct = piWithProducts.products[0];
      productId = firstPiProduct.productId;
      categoryId = categoryId || firstPiProduct.categoryId;
      material = firstPiProduct.productName || material;
    }

    if (containers && containers.length > 0) {
      const firstContainer = containers[0];
      containerNumber = firstContainer.containerNumber || null;
      sealNumber = firstContainer.sealNumber || null;
      sealType = firstContainer.sealType || null;

      // Extract product names from products array
      if (firstContainer.products && firstContainer.products.length > 0) {
        material = firstContainer.products.map((p) => p.productName).join(', ');
      }

      // Use container totals if available
      if (firstContainer.totalNoOfBoxes) {
        quantity = parseInt(firstContainer.totalNoOfBoxes);
      }
      if (firstContainer.totalGrossWeight) {
        weight = parseFloat(firstContainer.totalGrossWeight);
      }
    }

    // Debug log to check container data
    console.log('Container data for PDF:', {
      containerNumber,
      sealNumber,
      containers: containers?.length || 0,
    });
    // Create the packing list entry with transaction for data consistency
    const result = await prisma.$transaction(async (tx) => {
      const packingListEntry = await tx.productPackagingSteps.create({
        data: {
          productId: productId,
          piInvoiceId: parseInt(piId),
          categoryId: categoryId,
          packagingUnitId: packagingUnitId,
          stepNumber: 1,
          stepType: 'PACKING',
          description: `Packing List for PI ${existingPI.piNumber}`,
          quantity: quantity,
          material: material,
          weight: weight,
          weightUnit: 'kg',
          dimensions: null,
          containerNumber: containerNumber,
          sealNumber: sealNumber,
          sealType: sealType,
          dimensions: null,
          notes: packingListData,
          createdBy: req.user.id,
        },
        include: {
          piInvoice: {
            include: {
              party: true,
              company: true,
            },
          },
        },
      });

      // Create additional entries for multiple containers within the same transaction
      const additionalEntries = [];
      if (containers && containers.length > 1) {
        for (let i = 1; i < containers.length; i++) {
          const container = containers[i];
          const containerMaterial =
            container.products && container.products.length > 0
              ? container.products.map((p) => p.productName).join(', ')
              : 'Container Items';

          const containerEntry = await tx.productPackagingSteps.create({
            data: {
              productId: null,
              piInvoiceId: parseInt(piId),
              categoryId: null,
              packagingUnitId: null,
              stepNumber: i + 1,
              stepType: 'CONTAINERIZING',
              description: `Container ${i + 1} for PI ${existingPI.piNumber}`,
              quantity: container.totalNoOfBoxes
                ? parseInt(container.totalNoOfBoxes)
                : 0,
              material: containerMaterial,
              weight: container.totalGrossWeight
                ? parseFloat(container.totalGrossWeight)
                : 0,
              weightUnit: 'kg',
              dimensions: container.totalMeasurement
                ? { measurement: container.totalMeasurement }
                : null,
              containerNumber: container.containerNumber || null,
              sealNumber: container.sealNumber || null,
              sealType: container.sealType || null,
              createdBy: req.user.id,
            },
          });
          additionalEntries.push(containerEntry);
        }
      }

      // Update PI invoice with basic packing info within the same transaction
      const updatedPI = await tx.piInvoice.update({
        where: { id: parseInt(piId) },
        data: {
          deliveryTerm: methodOfDispatch,
          containerType: shipmentType,
          totalBoxes: parseInt(totalBoxes) || existingPI.totalBoxes,
          totalWeight: parseFloat(totalGrossWeight) || existingPI.totalWeight,
          totalVolume: parseFloat(totalVolume) || existingPI.totalVolume,
          requiredContainers:
            parseInt(totalContainers) || existingPI.requiredContainers,
          updatedBy: req.user.id,
        },
        include: {
          party: true,
          company: true,
        },
      });

      return { packingListEntry, additionalEntries, updatedPI };
    });

    const { packingListEntry, updatedPI } = result;

    // Create response with actual database entry
    const packingList = {
      id: packingListEntry.id, // Use the actual packing list entry ID
      piId: parseInt(piId),
      exportInvoiceNo: exportInvoiceNo || updatedPI.piNumber,
      exportInvoiceDate: exportInvoiceDate || updatedPI.invoiceDate,
      buyerReference: buyerReference || updatedPI.partyName,
      consigneeDetails,
      buyerDetails,
      sellerInfo,
      methodOfDispatch,
      shipmentType,
      countryOfOrigin: countryOfOrigin || 'India',
      finalDestinationCountry,
      portOfLoading,
      portOfDischarge,
      vesselVoyageNo,
      dateOfDeparture,
      containers: containers || [],
      notes,
      totalBoxes: parseInt(totalBoxes) || 0,
      totalNetWeight: parseFloat(totalNetWeight) || 0,
      totalGrossWeight: parseFloat(totalGrossWeight) || 0,
      totalVolume: parseFloat(totalVolume) || 0,
      totalContainers: parseInt(totalContainers) || 0,
      dateOfIssue,
      status,
      createdAt: packingListEntry.createdAt,
      updatedAt: packingListEntry.updatedAt,
      piInvoice: {
        id: updatedPI.id,
        piNumber: updatedPI.piNumber,
        invoiceDate: updatedPI.invoiceDate,
        partyName: updatedPI.partyName,
      },
      packingListEntryId: packingListEntry.id, // Include the database entry ID
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

    // First, try to find the packing list entry by its ID with company validation
    let packingListEntry = await prisma.productPackagingSteps.findFirst({
      where: {
        id: parseInt(id),
        stepType: 'PACKING',
        piInvoice: {
          companyId: req.user.companyId,
        },
      },
      include: {
        piInvoice: {
          include: {
            party: true,
            company: true,
          },
        },
      },
    });

    // If not found by packing list entry ID, try to find by PI ID
    if (!packingListEntry) {
      const piInvoice = await prisma.piInvoice.findFirst({
        where: {
          id: parseInt(id),
          companyId: req.user.companyId,
        },
        include: {
          packagingSteps: {
            where: {
              stepType: 'PACKING',
              isActive: true,
            },
          },
          party: true,
          company: true,
        },
      });

      if (!piInvoice || piInvoice.packagingSteps.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Packing list not found',
        });
      }

      packingListEntry = piInvoice.packagingSteps[0];
      packingListEntry.piInvoice = piInvoice;
    }

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
        existingPackingData = JSON.parse(packingListEntry.notes);
      } catch (error) {
        console.error('Error parsing existing packing list data:', error);
      }
    }

    // Merge with update data - only include frontend form fields
    const updatedPackingData = {
      exportInvoiceNo:
        updateData.exportInvoiceNo !== undefined
          ? updateData.exportInvoiceNo
          : existingPackingData.exportInvoiceNo,
      exportInvoiceDate:
        updateData.exportInvoiceDate !== undefined
          ? updateData.exportInvoiceDate
          : existingPackingData.exportInvoiceDate,
      buyerReference:
        updateData.buyerReference !== undefined
          ? updateData.buyerReference
          : existingPackingData.buyerReference,
      consigneeDetails:
        updateData.consigneeDetails !== undefined
          ? updateData.consigneeDetails
          : existingPackingData.consigneeDetails,
      buyerDetails:
        updateData.buyerDetails !== undefined
          ? updateData.buyerDetails
          : existingPackingData.buyerDetails,
      sellerInfo:
        updateData.sellerInfo !== undefined
          ? updateData.sellerInfo
          : existingPackingData.sellerInfo,
      methodOfDispatch:
        updateData.methodOfDispatch !== undefined
          ? updateData.methodOfDispatch
          : existingPackingData.methodOfDispatch,
      shipmentType:
        updateData.shipmentType !== undefined
          ? updateData.shipmentType
          : existingPackingData.shipmentType,
      countryOfOrigin:
        updateData.countryOfOrigin !== undefined
          ? updateData.countryOfOrigin
          : existingPackingData.countryOfOrigin,
      finalDestinationCountry:
        updateData.finalDestinationCountry !== undefined
          ? updateData.finalDestinationCountry
          : existingPackingData.finalDestinationCountry,
      portOfLoading:
        updateData.portOfLoading !== undefined
          ? updateData.portOfLoading
          : existingPackingData.portOfLoading,
      portOfDischarge:
        updateData.portOfDischarge !== undefined
          ? updateData.portOfDischarge
          : existingPackingData.portOfDischarge,
      vesselVoyageNo:
        updateData.vesselVoyageNo !== undefined
          ? updateData.vesselVoyageNo
          : existingPackingData.vesselVoyageNo,

      dateOfDeparture:
        updateData.dateOfDeparture !== undefined
          ? updateData.dateOfDeparture
          : existingPackingData.dateOfDeparture,
      containers:
        updateData.containers !== undefined
          ? updateData.containers
          : existingPackingData.containers,

      notes:
        updateData.notes !== undefined
          ? updateData.notes
          : existingPackingData.notes,
      totalBoxes:
        updateData.totalBoxes !== undefined
          ? parseInt(updateData.totalBoxes) || 0
          : existingPackingData.totalBoxes,
      totalNetWeight:
        updateData.totalNetWeight !== undefined
          ? parseFloat(updateData.totalNetWeight) || 0
          : existingPackingData.totalNetWeight,
      totalGrossWeight:
        updateData.totalGrossWeight !== undefined
          ? parseFloat(updateData.totalGrossWeight) || 0
          : existingPackingData.totalGrossWeight,
      totalVolume:
        updateData.totalVolume !== undefined
          ? parseFloat(updateData.totalVolume) || 0
          : existingPackingData.totalVolume,
      totalContainers:
        updateData.totalContainers !== undefined
          ? parseInt(updateData.totalContainers) || 0
          : existingPackingData.totalContainers,
      dateOfIssue:
        updateData.dateOfIssue !== undefined
          ? updateData.dateOfIssue
          : existingPackingData.dateOfIssue,
      status:
        updateData.status !== undefined
          ? updateData.status
          : existingPackingData.status,
    };

    // Extract productId and categoryId for update if not already set
    let updateProductId = packingListEntry.productId;
    let updateCategoryId = packingListEntry.categoryId;

    if (!updateProductId || !updateCategoryId) {
      const piWithProducts = await prisma.piInvoice.findUnique({
        where: { id: packingListEntry.piInvoiceId },
        include: {
          products: {
            include: {
              product: true,
              category: true,
            },
          },
        },
      });

      if (piWithProducts.products && piWithProducts.products.length > 0) {
        const firstPiProduct = piWithProducts.products[0];
        updateProductId = updateProductId || firstPiProduct.productId;
        updateCategoryId = updateCategoryId || firstPiProduct.categoryId;
      }
    }

    // Update the packing list entry
    const updatedPackingListEntry = await prisma.productPackagingSteps.update({
      where: { id: packingListEntry.id },
      data: {
        productId: updateProductId,
        categoryId: updateCategoryId,
        notes: updatedPackingData,
        updatedBy: req.user.id,
      },
      include: {
        piInvoice: {
          include: {
            party: true,
            company: true,
          },
        },
      },
    });

    // Also update PI invoice with relevant data
    const updatedPI = await prisma.piInvoice.update({
      where: { id: packingListEntry.piInvoiceId },
      data: {
        deliveryTerm:
          updateData.methodOfDispatch ||
          packingListEntry.piInvoice.deliveryTerm,
        containerType:
          updateData.shipmentType || packingListEntry.piInvoice.containerType,
        totalBoxes:
          parseInt(updateData.totalBoxes) ||
          packingListEntry.piInvoice.totalBoxes,
        totalWeight:
          parseFloat(updateData.totalGrossWeight) ||
          packingListEntry.piInvoice.totalWeight,
        totalVolume:
          parseFloat(updateData.totalVolume) ||
          packingListEntry.piInvoice.totalVolume,
        requiredContainers:
          parseInt(updateData.totalContainers) ||
          packingListEntry.piInvoice.requiredContainers,
        updatedBy: req.user.id,
      },
    });

    // Create response matching frontend expectations
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

    // Try to find by packing list ID first
    let packingRecord = await prisma.productPackagingSteps.findFirst({
      where: {
        id: parseInt(id),
        piInvoice: {
          companyId: req.user.companyId,
        },
      },
    });

    // If not found by packing list ID, try to find by PI invoice ID
    if (!packingRecord) {
      packingRecord = await prisma.productPackagingSteps.findFirst({
        where: {
          piInvoiceId: parseInt(id),
          stepType: 'PACKING',
          isActive: true,
          piInvoice: {
            companyId: req.user.companyId,
          },
        },
      });
    }

    if (!packingRecord) {
      return res.status(404).json({
        success: false,
        message: 'Packing list not found',
      });
    }

    // Delete the packaging step
    await prisma.productPackagingSteps.delete({
      where: {
        id: packingRecord.id,
      },
    });

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
        packagingSteps: {
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
        packagingSteps: {
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

    // Get packing list data
    let packingListEntry = await prisma.productPackagingSteps.findFirst({
      where: {
        id: parseInt(id),
        stepType: 'PACKING',
        isActive: true,
        piInvoice: {
          companyId: req.user.companyId,
        },
      },
      include: {
        piInvoice: {
          include: {
            products: {
              include: {
                product: true,
                category: true,
              },
            },
            party: true,
            company: true,
            packagingSteps: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    if (!packingListEntry) {
      // Try to find by PI ID
      const piInvoice = await prisma.piInvoice.findFirst({
        where: {
          id: parseInt(id),
          companyId: req.user.companyId,
        },
        include: {
          products: {
            include: {
              product: true,
              category: true,
            },
          },
          party: true,
          company: true,
          packagingSteps: {
            where: {
              stepType: 'PACKING',
              isActive: true,
            },
          },
        },
      });

      if (!piInvoice) {
        return res.status(404).json({
          success: false,
          message: 'Packing list not found',
        });
      }

      // Create a mock packing list entry for template
      packingListEntry = {
        piInvoice: piInvoice,
      };
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

    // Group packaging steps by product
    const stepsByProduct = {};
    if (packingListEntry.piInvoice.packagingSteps) {
      packingListEntry.piInvoice.packagingSteps.forEach((step) => {
        if (step.productId) {
          if (!stepsByProduct[step.productId]) {
            stepsByProduct[step.productId] = [];
          }
          stepsByProduct[step.productId].push(step);
        }
      });
    }

    // Add container and seal numbers to products
    if (packingListEntry.piInvoice.products) {
      packingListEntry.piInvoice.products.forEach((product, index) => {
        // First try to get from packingListData.containers
        if (
          packingListData.containers &&
          packingListData.containers.length > 0
        ) {
          const container =
            packingListData.containers[index] ||
            packingListData.containers[0] ||
            {};
          product.containerNumber = container.containerNumber || '';
          product.sealNumber = container.sealNumber || '';
          product.sealType = container.sealType || '';
        } else {
          // Fallback: try to get from packaging steps
          const packingStep = packingListEntry.piInvoice.packagingSteps?.find(
            (step) =>
              step.productId === product.productId ||
              step.stepType === 'PACKING'
          );
          product.containerNumber = packingStep?.containerNumber || '';
          product.sealNumber = packingStep?.sealNumber || '';
          product.sealType = packingStep?.sealType || '';
        }

        console.log(`Product ${index + 1} container info:`, {
          productName: product.productName,
          containerNumber: product.containerNumber,
          sealNumber: product.sealNumber,
        });
      });
    }

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
    });

    // Generate PDF using improved configuration
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
};
