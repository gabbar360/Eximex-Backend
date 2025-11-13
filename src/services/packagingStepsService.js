import { prisma } from '../config/dbConfig.js';

export class PackagingStepsService {
  // Packing Lists Operations
  static async getPackingListsWithPagination(companyId, filters, pagination) {
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
  }

  static transformPackingLists(piInvoices) {
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
  }

  // Packaging Step Operations
  static async findPackagingStepById(id) {
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
  }

  static async findPiInvoiceById(id, companyId) {
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
  }

  static buildPackingListResponse(piInvoice) {
    const packingListEntry = piInvoice.packingLists.find(
      (step) => step.productId === null && step.stepType === 'PACKING'
    );

    let packingListData = {};
    let actualNotes = '';

    if (packingListEntry && packingListEntry.notes) {
      packingListData = packingListEntry.notes;
      actualNotes = packingListData.notes || '';
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
      totalContainers:
        packingListData.totalContainers || piInvoice.requiredContainers || 1,
      dateOfIssue:
        packingListData.dateOfIssue || new Date().toISOString().split('T')[0],
      status: packingListData.status || piInvoice.status,
      createdAt: packingListEntry?.createdAt || piInvoice.createdAt,
      updatedAt: packingListEntry?.updatedAt || piInvoice.updatedAt,
      pi: piInvoice,
    };
  }

  // Create Operations
  static async checkExistingPackingList(piId) {
    return await prisma.packingList.findFirst({
      where: {
        piInvoiceId: parseInt(piId),
        stepType: 'PACKING',
        isActive: true,
      },
    });
  }

  static async getPiWithProducts(piId) {
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
  }

  static buildPackingListData(data, existingPI) {
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
      totalContainers: parseInt(data.totalContainers) || 0,
      dateOfIssue: data.dateOfIssue || new Date().toISOString().split('T')[0],
      status: data.status || 'draft',
    };
  }

  static extractContainerInfo(containers) {
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

    return { containerNumber, sealNumber, sealType, material, quantity, weight };
  }

  static async createPackingListTransaction(data, userId) {
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

      // Create additional container entries
      const additionalEntries = [];
      if (data.containers && data.containers.length > 1) {
        for (let i = 1; i < data.containers.length; i++) {
          const container = data.containers[i];
          const containerMaterial =
            container.products && container.products.length > 0
              ? container.products.map((p) => p.productName).join(', ')
              : 'Container Items';

          const containerEntry = await tx.packingList.create({
            data: {
              productId: null,
              piInvoiceId: data.piId,
              categoryId: null,
              packagingUnitId: null,
              stepNumber: i + 1,
              stepType: 'CONTAINERIZING',
              description: `Container ${i + 1} for PI ${data.piNumber}`,
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
              createdBy: userId,
            },
          });
          additionalEntries.push(containerEntry);
        }
      }

      // Update PI invoice
      const updatedPI = await tx.piInvoice.update({
        where: { id: data.piId },
        data: {
          deliveryTerm: data.methodOfDispatch,
          containerType: data.shipmentType,
          totalBoxes: data.totalBoxes || data.existingPI.totalBoxes,
          totalWeight: data.totalGrossWeight || data.existingPI.totalWeight,
          totalVolume: data.totalVolume || data.existingPI.totalVolume,
          requiredContainers:
            data.totalContainers || data.existingPI.requiredContainers,
          updatedBy: userId,
        },
        include: {
          party: true,
          company: true,
        },
      });

      return { packingListEntry, additionalEntries, updatedPI };
    });
  }

  // Update Operations
  static async findPackingListForUpdate(id, companyId) {
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
  }

  static mergePackingListData(existingData, updateData) {
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
        updateData.notes !== undefined
          ? updateData.notes
          : existingData.notes,
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
      dateOfIssue:
        updateData.dateOfIssue !== undefined
          ? updateData.dateOfIssue
          : existingData.dateOfIssue,
      status:
        updateData.status !== undefined
          ? updateData.status
          : existingData.status,
    };
  }

  static async updatePackingListEntry(id, data, userId) {
    return await prisma.packingList.update({
      where: { id },
      data: {
        productId: data.productId,
        categoryId: data.categoryId,
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
  }

  static async updatePiInvoice(piId, data, userId) {
    return await prisma.piInvoice.update({
      where: { id: piId },
      data: {
        deliveryTerm: data.methodOfDispatch,
        containerType: data.shipmentType,
        totalBoxes: data.totalBoxes,
        totalWeight: data.totalGrossWeight,
        totalVolume: data.totalVolume,
        requiredContainers: data.totalContainers,
        updatedBy: userId,
      },
    });
  }

  // Delete Operations
  static async findPackingRecordForDelete(id, companyId) {
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
  }

  static async deletePackingRecord(id) {
    return await prisma.packingList.delete({
      where: { id },
    });
  }

  // PDF Generation Support
  static async getPackingListForPDF(id, companyId) {
    let packingListEntry = await prisma.packingList.findFirst({
      where: {
        id: parseInt(id),
        stepType: 'PACKING',
        isActive: true,
        piInvoice: {
          companyId,
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
            packingLists: {
              where: { isActive: true },
            },
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
          products: {
            include: {
              product: true,
              category: true,
            },
          },
          party: true,
          company: true,
          packingLists: {
            where: {
              stepType: 'PACKING',
              isActive: true,
            },
          },
        },
      });

      if (piInvoice) {
        packingListEntry = {
          piInvoice: piInvoice,
        };
      }
    }

    return packingListEntry;
  }

    static async getPackingListForPortPDF(id, companyId) {
    let packingListEntry = await prisma.packingList.findFirst({
      where: {
        id: parseInt(id),
        stepType: 'PACKING',
        isActive: true,
        piInvoice: {
          companyId,
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
            packingLists: {
              where: { isActive: true },
            },
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
          products: {
            include: {
              product: true,
              category: true,
            },
          },
          party: true,
          company: true,
          packingLists: {
            where: {
              stepType: 'PACKING',
              isActive: true,
            },
          },
        },
      });

      if (piInvoice) {
        packingListEntry = {
          piInvoice: piInvoice,
        };
      }
    }

    return packingListEntry;
  }

  static groupPackagingStepsByProduct(packagingSteps) {
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
  }

  static addContainerInfoToProducts(products, packingListData, packagingSteps) {
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
  }
}