import { prisma } from '../config/dbConfig.js';

// Packing Lists Operations
const getPackingListsWithPagination = async (companyId, filters, pagination) => {
  const { search, status } = filters;
  const { page = 1, limit = 10 } = pagination;
  const skip = (page - 1) * limit;

  const where = {
    companyId,
    packingLists: {
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
        packingLists: {
          where: { isActive: true },
          select: {
            id: true,
            stepType: true,
            weight: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit),
    }),
    prisma.piInvoice.count({ where }),
  ]);

  return {
    piInvoices,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

const transformPackingLists = (piInvoices) => {
  return piInvoices.map((pi) => ({
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
};

// Packaging Step Operations
const findPackagingStepById = async (id) => {
  return await prisma.packingList.findFirst({
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
          packingLists: {
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
};

const findPiInvoiceById = async (id, companyId) => {
  return await prisma.piInvoice.findFirst({
    where: {
      id: parseInt(id),
      companyId,
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
      packingLists: {
        where: { isActive: true },
        include: {
          product: true,
          packagingUnit: true,
        },
      },
    },
  });
};

const buildPackingListResponse = (piInvoice) => {
  const packingListEntry = piInvoice.packingLists.find(
    (step) => step.productId === null && step.stepType === 'PACKING'
  );

  let packingListData = {};
  let actualNotes = '';
  let showToTheOrder = false;

  if (packingListEntry && packingListEntry.notes) {
    packingListData = packingListEntry.notes;
    actualNotes = packingListData.notes || '';
  }
  
  // Get showToTheOrder - prioritize notes data over entry data
  if (packingListEntry) {
    // First check notes data, then fallback to entry data
    if (packingListData.showToTheOrder !== undefined) {
      showToTheOrder = packingListData.showToTheOrder;
    } else {
      showToTheOrder = packingListEntry.showToTheOrder || false;
    }
  }

  return {
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
    totalSquareMeters:
      packingListData.totalSquareMeters || piInvoice.totalSquareMeters || 0,
    totalPallets:
      packingListData.totalPallets || piInvoice.totalPallets || 0,
    totalContainers:
      packingListData.totalContainers || piInvoice.requiredContainers || 1,
    dateOfIssue:
      packingListData.dateOfIssue || new Date().toISOString().split('T')[0],
    status: packingListData.status || piInvoice.status,
    showToTheOrder: showToTheOrder,
    createdAt: packingListEntry?.createdAt || piInvoice.createdAt,
    updatedAt: packingListEntry?.updatedAt || piInvoice.updatedAt,
    pi: piInvoice,
  };
};

// Create Operations
const checkExistingPackingList = async (piId) => {
  return await prisma.packingList.findFirst({
    where: {
      piInvoiceId: parseInt(piId),
      stepType: 'PACKING',
      isActive: true,
    },
  });
};

const getPiWithProducts = async (piId) => {
  return await prisma.piInvoice.findUnique({
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
};

const buildPackingListData = (data, existingPI) => {
  return {
    exportInvoiceNo: data.exportInvoiceNo || existingPI.piNumber,
    exportInvoiceDate: data.exportInvoiceDate || existingPI.invoiceDate,
    buyerReference: data.buyerReference || existingPI.partyName,
    consigneeDetails: data.consigneeDetails || '',
    buyerDetails: data.buyerDetails || '',
    sellerInfo: data.sellerInfo || '',
    methodOfDispatch: data.methodOfDispatch || '',
    shipmentType: data.shipmentType || '',
    countryOfOrigin: data.countryOfOrigin || 'India',
    finalDestinationCountry: data.finalDestinationCountry || '',
    portOfLoading: data.portOfLoading || '',
    portOfDischarge: data.portOfDischarge || '',
    vesselVoyageNo: data.vesselVoyageNo || '',
    dateOfDeparture: data.dateOfDeparture || null,
    containers: data.containers || [],
    notes: data.notes || '',
    totalBoxes: parseInt(data.totalBoxes) || 0,
    totalNetWeight: parseFloat(data.totalNetWeight) || 0,
    totalGrossWeight: parseFloat(data.totalGrossWeight) || 0,
    totalVolume: parseFloat(data.totalVolume) || 0,
    totalSquareMeters: parseFloat(data.totalSquareMeters) || 0,
    totalPallets: parseInt(data.totalPallets) || 0,
    totalContainers: parseInt(data.totalContainers) || 0,
    dateOfIssue: data.dateOfIssue || new Date().toISOString().split('T')[0],
    status: data.status || 'draft',
    showToTheOrder: data.showToTheOrder || false,
  };
};

const extractContainerInfo = (containers) => {
  let containerNumber = null;
  let sealNumber = null;
  let sealType = null;
  let material = 'Packing List Items';
  let quantity = 0;
  let weight = 0;

  if (containers && containers.length > 0) {
    const firstContainer = containers[0];
    containerNumber = firstContainer.containerNumber || null;
    sealNumber = firstContainer.sealNumber || null;
    sealType = firstContainer.sealType || null;

    if (firstContainer.products && firstContainer.products.length > 0) {
      material = firstContainer.products.map((p) => p.productName).join(', ');
    }

    if (firstContainer.totalNoOfBoxes) {
      quantity = parseInt(firstContainer.totalNoOfBoxes);
    }
    if (firstContainer.totalGrossWeight) {
      weight = parseFloat(firstContainer.totalGrossWeight);
    }
  }

  return {
    containerNumber,
    sealNumber,
    sealType,
    material,
    quantity,
    weight,
  };
};

const createPackingListTransaction = async (data, userId) => {
  return await prisma.$transaction(async (tx) => {
    const packingListEntry = await tx.packingList.create({
      data: {
        productId: data.productId,
        piInvoiceId: data.piId,
        categoryId: data.categoryId,
        packagingUnitId: data.packagingUnitId,
        stepNumber: 1,
        stepType: 'PACKING',
        description: `Packing List for PI ${data.piNumber}`,
        quantity: data.quantity,
        material: data.material,
        weight: data.weight,
        weightUnit: 'kg',
        dimensions: null,
        containerNumber: data.containerNumber,
        sealNumber: data.sealNumber,
        sealType: data.sealType,
        showToTheOrder: data.showToTheOrder || false,
        notes: data.packingListData,
        createdBy: userId,
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

    // All container information is stored in the main entry's notes field
    // No need to create separate database entries for each container

    // Calculate totals from containers data
    const totals = calculateTotalsFromContainers(data.containers || []);

    // Update PI invoice
    const updatedPI = await tx.piInvoice.update({
      where: { id: data.piId },
      data: {
        deliveryTerm: data.methodOfDispatch,
        containerType: data.shipmentType,
        totalBoxes: data.totalBoxes || data.existingPI.totalBoxes,
        totalWeight: data.totalGrossWeight || data.existingPI.totalWeight,
        totalVolume: data.totalVolume || data.existingPI.totalVolume,
        totalSquareMeters: totals.totalSquareMeters || data.existingPI.totalSquareMeters,
        totalPallets: totals.totalPallets || data.existingPI.totalPallets,
        requiredContainers:
          data.totalContainers || data.existingPI.requiredContainers,
        updatedBy: userId,
      },
      include: {
        party: true,
        company: true,
      },
    });

    return { packingListEntry, updatedPI };
  });
};

// Update Operations
const findPackingListForUpdate = async (id, companyId) => {
  let packingListEntry = await prisma.packingList.findFirst({
    where: {
      id: parseInt(id),
      stepType: 'PACKING',
      piInvoice: {
        companyId,
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

  if (!packingListEntry) {
    const piInvoice = await prisma.piInvoice.findFirst({
      where: {
        id: parseInt(id),
        companyId,
      },
      include: {
        packingLists: {
          where: {
            stepType: 'PACKING',
            isActive: true,
          },
        },
        party: true,
        company: true,
      },
    });

    if (piInvoice && piInvoice.packingLists.length > 0) {
      packingListEntry = piInvoice.packingLists[0];
      packingListEntry.piInvoice = piInvoice;
    }
  }

  return packingListEntry;
};

const mergePackingListData = (existingData, updateData) => {
  return {
    exportInvoiceNo:
      updateData.exportInvoiceNo !== undefined
        ? updateData.exportInvoiceNo
        : existingData.exportInvoiceNo,
    exportInvoiceDate:
      updateData.exportInvoiceDate !== undefined
        ? updateData.exportInvoiceDate
        : existingData.exportInvoiceDate,
    buyerReference:
      updateData.buyerReference !== undefined
        ? updateData.buyerReference
        : existingData.buyerReference,
    consigneeDetails:
      updateData.consigneeDetails !== undefined
        ? updateData.consigneeDetails
        : existingData.consigneeDetails,
    buyerDetails:
      updateData.buyerDetails !== undefined
        ? updateData.buyerDetails
        : existingData.buyerDetails,
    sellerInfo:
      updateData.sellerInfo !== undefined
        ? updateData.sellerInfo
        : existingData.sellerInfo,
    methodOfDispatch:
      updateData.methodOfDispatch !== undefined
        ? updateData.methodOfDispatch
        : existingData.methodOfDispatch,
    shipmentType:
      updateData.shipmentType !== undefined
        ? updateData.shipmentType
        : existingData.shipmentType,
    countryOfOrigin:
      updateData.countryOfOrigin !== undefined
        ? updateData.countryOfOrigin
        : existingData.countryOfOrigin,
    finalDestinationCountry:
      updateData.finalDestinationCountry !== undefined
        ? updateData.finalDestinationCountry
        : existingData.finalDestinationCountry,
    portOfLoading:
      updateData.portOfLoading !== undefined
        ? updateData.portOfLoading
        : existingData.portOfLoading,
    portOfDischarge:
      updateData.portOfDischarge !== undefined
        ? updateData.portOfDischarge
        : existingData.portOfDischarge,
    vesselVoyageNo:
      updateData.vesselVoyageNo !== undefined
        ? updateData.vesselVoyageNo
        : existingData.vesselVoyageNo,
    dateOfDeparture:
      updateData.dateOfDeparture !== undefined
        ? updateData.dateOfDeparture
        : existingData.dateOfDeparture,
    containers:
      updateData.containers !== undefined
        ? updateData.containers
        : existingData.containers,
    notes:
      updateData.notes !== undefined ? updateData.notes : existingData.notes,
    totalBoxes:
      updateData.totalBoxes !== undefined
        ? parseInt(updateData.totalBoxes) || 0
        : existingData.totalBoxes,
    totalNetWeight:
      updateData.totalNetWeight !== undefined
        ? parseFloat(updateData.totalNetWeight) || 0
        : existingData.totalNetWeight,
    totalGrossWeight:
      updateData.totalGrossWeight !== undefined
        ? parseFloat(updateData.totalGrossWeight) || 0
        : existingData.totalGrossWeight,
    totalVolume:
      updateData.totalVolume !== undefined
        ? parseFloat(updateData.totalVolume) || 0
        : existingData.totalVolume,
    totalContainers:
      updateData.totalContainers !== undefined
        ? parseInt(updateData.totalContainers) || 0
        : existingData.totalContainers,
    totalSquareMeters:
      updateData.totalSquareMeters !== undefined
        ? parseFloat(updateData.totalSquareMeters) || 0
        : existingData.totalSquareMeters,
    totalPallets:
      updateData.totalPallets !== undefined
        ? parseInt(updateData.totalPallets) || 0
        : existingData.totalPallets,
    dateOfIssue:
      updateData.dateOfIssue !== undefined
        ? updateData.dateOfIssue
        : existingData.dateOfIssue,
    status:
      updateData.status !== undefined
        ? updateData.status
        : existingData.status,
    showToTheOrder:
      updateData.showToTheOrder !== undefined
        ? updateData.showToTheOrder
        : (existingData.showToTheOrder || false),
  };
};

const updatePackingListEntry = async (id, data, userId) => {
  return await prisma.packingList.update({
    where: { id },
    data: {
      productId: data.productId,
      categoryId: data.categoryId,
      showToTheOrder: data.showToTheOrder,
      notes: data.updatedPackingData,
      updatedBy: userId,
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
};

const updatePiInvoice = async (piId, data, userId) => {
  return await prisma.piInvoice.update({
    where: { id: piId },
    data: {
      deliveryTerm: data.methodOfDispatch,
      containerType: data.shipmentType,
      totalBoxes: data.totalBoxes,
      totalWeight: data.totalGrossWeight,
      totalVolume: data.totalVolume,
      totalSquareMeters: data.totalSquareMeters,
      totalPallets: data.totalPallets,
      requiredContainers: data.totalContainers,
      updatedBy: userId,
    },
  });
};

// Delete Operations
const findPackingRecordForDelete = async (id, companyId) => {
  let packingRecord = await prisma.packingList.findFirst({
    where: {
      id: parseInt(id),
      piInvoice: {
        companyId,
      },
    },
  });

  if (!packingRecord) {
    packingRecord = await prisma.packingList.findFirst({
      where: {
        piInvoiceId: parseInt(id),
        stepType: 'PACKING',
        isActive: true,
        piInvoice: {
          companyId,
        },
      },
    });
  }

  return packingRecord;
};

const deletePackingRecord = async (id) => {
  return await prisma.packingList.delete({
    where: { id },
  });
};

// PDF Generation Support
const getPackingListForPDF = async (id, companyId) => {
  console.log(`Service: Looking for packing list with ID: ${id}, Company: ${companyId}`);
  
  const includeStructure = {
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
          packingLists: {
            where: { isActive: true },
          },
          orders: {
            include: {
              shipment: true,
            },
          },
        },
      },
    },
  };

  // Strategy 1: Find by packing list ID
  let packingListEntry = await prisma.packingList.findFirst({
    where: {
      id: parseInt(id),
      isActive: true,
      piInvoice: { companyId },
    },
    ...includeStructure,
  });
  console.log(`Strategy 1 (packing list ID): ${!!packingListEntry}`);

  // Strategy 2: Find by PI invoice ID
  if (!packingListEntry) {
    const piInvoice = await prisma.piInvoice.findFirst({
      where: { id: parseInt(id), companyId },
      include: {
        products: {
          include: {
            product: true,
            category: true,
          },
        },
        party: true,
        company: true,
        packingLists: {
          where: { isActive: true },
        },
        orders: {
          include: {
            shipment: true,
          },
        },
      },
    });
    console.log(`Strategy 2 (PI invoice ID): ${!!piInvoice}`);

    if (piInvoice) {
      const packingList = piInvoice.packingLists.find(pl => pl.stepType === 'PACKING') || piInvoice.packingLists[0];
      packingListEntry = {
        id: packingList?.id || piInvoice.id,
        notes: packingList?.notes || {},
        piInvoice: piInvoice,
      };
    }
  }

  // Strategy 3: Find by piInvoiceId reference
  if (!packingListEntry) {
    packingListEntry = await prisma.packingList.findFirst({
      where: {
        piInvoiceId: parseInt(id),
        isActive: true,
        piInvoice: { companyId },
      },
      ...includeStructure,
    });
    console.log(`Strategy 3 (piInvoiceId): ${!!packingListEntry}`);
  }

  // Strategy 4: Find any PI with this company and create dummy entry
  if (!packingListEntry) {
    const anyPI = await prisma.piInvoice.findFirst({
      where: { companyId },
      include: {
        products: {
          include: {
            product: true,
            category: true,
          },
        },
        party: true,
        company: true,
        packingLists: { where: { isActive: true } },
        orders: { include: { shipment: true } },
      },
    });
    console.log(`Strategy 4 (any PI): ${!!anyPI}`);

    if (anyPI) {
      packingListEntry = {
        id: parseInt(id),
        notes: {},
        piInvoice: anyPI,
      };
    }
  }

  console.log(`Final result: ${!!packingListEntry}`);
  return packingListEntry;
};

const groupPackagingStepsByProduct = (packagingSteps) => {
  const stepsByProduct = {};
  if (packagingSteps) {
    packagingSteps.forEach((step) => {
      if (step.productId) {
        if (!stepsByProduct[step.productId]) {
          stepsByProduct[step.productId] = [];
        }
        stepsByProduct[step.productId].push(step);
      }
    });
  }
  return stepsByProduct;
};

const addContainerInfoToProducts = (products, packingListData, packagingSteps) => {
  if (products) {
    products.forEach((product, index) => {
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
        const packingStep = packagingSteps?.find(
          (step) =>
            step.productId === product.productId ||
            step.stepType === 'PACKING'
        );
        product.containerNumber = packingStep?.containerNumber || '';
        product.sealNumber = packingStep?.sealNumber || '';
        product.sealType = packingStep?.sealType || '';
      }
    });
  }
  return products;
};

// Helper function to calculate totals from containers
const calculateTotalsFromContainers = (containers) => {
  let totalSquareMeters = 0;
  let totalPallets = 0;

  containers.forEach(container => {
    if (container.products && Array.isArray(container.products)) {
      container.products.forEach(product => {
        // Check if product unit is square meter or sqm
        if (product.unit && (product.unit.toLowerCase() === 'square meter' || product.unit.toLowerCase() === 'sqm')) {
          totalSquareMeters += parseFloat(product.packedQuantity) || 0;
          totalPallets += parseFloat(product.noOfPallets) || 0;
        }
      });
    }
  });

  return {
    totalSquareMeters,
    totalPallets
  };
};

export const PackagingStepsService = {
  getPackingListsWithPagination,
  transformPackingLists,
  findPackagingStepById,
  findPiInvoiceById,
  buildPackingListResponse,
  checkExistingPackingList,
  getPiWithProducts,
  buildPackingListData,
  extractContainerInfo,
  createPackingListTransaction,
  findPackingListForUpdate,
  mergePackingListData,
  updatePackingListEntry,
  updatePiInvoice,
  findPackingRecordForDelete,
  deletePackingRecord,
  getPackingListForPDF,
  groupPackagingStepsByProduct,
  addContainerInfoToProducts,
  calculateTotalsFromContainers,
};