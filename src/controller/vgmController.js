import { PrismaClient } from '@prisma/client';
import ejs from 'ejs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { generatePDF } from '../utils/puppeteerConfig.js';
import { UserService } from '../services/userService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = new PrismaClient();

// Create VGM Document
const createVgmDocument = async (req, res) => {
  try {
    const { companyId, id: userId } = req.user;
    const {
      piInvoiceId,
      productPackagingStepId,
      verifiedGrossMass,
      method,
      cargoWeight,
      packagingWeight,
      containerTareWeight,
      verifiedBy,
      verifierPosition,
      verificationDate,
      weighingLocation,
      remarks,
    } = req.body;

    // If no productPackagingStepId provided, get the first packaging step from the PI
    let finalPackagingStepId = productPackagingStepId;
    if (!finalPackagingStepId) {
      const firstPackagingStep = await prisma.productPackagingSteps.findFirst({
        where: { piInvoiceId },
        orderBy: { stepNumber: 'asc' },
      });
      finalPackagingStepId = firstPackagingStep?.id || null;
    }

    const vgmDocument = await prisma.vgmDocument.create({
      data: {
        companyId,
        piInvoiceId,
        productPackagingStepId: finalPackagingStepId,
        verifiedGrossMass,
        method,
        cargoWeight,
        packagingWeight,
        containerTareWeight,
        verifiedBy,
        verifierPosition,
        verificationDate: new Date(verificationDate),
        weighingLocation,
        remarks,
        createdBy: userId,
      },
      include: {
        piInvoice: { select: { piNumber: true } },
        productPackagingStep: {
          select: {
            containerNumber: true,
            sealNumber: true,
            sealType: true,
          },
        },
        creator: { select: { name: true } },
      },
    });

    // Clear dashboard cache so admin sees updated counts
    UserService.clearCompanyDashboardCache(companyId);

    res.status(201).json({
      success: true,
      message: 'VGM document created successfully',
      data: vgmDocument,
    });
  } catch (error) {
    console.error('Error creating VGM document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create VGM document',
      error: error.message,
    });
  }
};

// Get VGM Documents
const getVgmDocuments = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { piInvoiceId, status, page = 1, limit = 10 } = req.query;

    const where = { companyId };
    if (piInvoiceId) where.piInvoiceId = parseInt(piInvoiceId);
    if (status) where.status = status;

    const vgmDocuments = await prisma.vgmDocument.findMany({
      where,
      include: {
        piInvoice: { select: { piNumber: true, partyName: true } },
        productPackagingStep: {
          select: {
            containerNumber: true,
            sealNumber: true,
            sealType: true,
          },
        },
        creator: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: parseInt(limit),
    });

    const total = await prisma.vgmDocument.count({ where });

    res.json({
      success: true,
      data: vgmDocuments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching VGM documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch VGM documents',
      error: error.message,
    });
  }
};

// Get Single VGM Document
const getVgmDocument = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    let vgmDocument = await prisma.vgmDocument.findFirst({
      where: { id: parseInt(id), companyId },
      include: {
        piInvoice: {
          select: {
            piNumber: true,
            partyName: true,
            containerType: true,
            numberOfContainers: true,
          },
        },
        productPackagingStep: {
          select: {
            containerNumber: true,
            sealNumber: true,
            sealType: true,
            description: true,
          },
        },
        creator: { select: { name: true } },
        updater: { select: { name: true } },
      },
    });

    if (!vgmDocument) {
      return res.status(404).json({
        success: false,
        message: 'VGM document not found',
      });
    }

    // If productPackagingStepId is null, try to link to first packaging step
    if (!vgmDocument.productPackagingStepId) {
      const firstPackagingStep = await prisma.productPackagingSteps.findFirst({
        where: { piInvoiceId: vgmDocument.piInvoiceId },
        orderBy: { stepNumber: 'asc' },
      });

      if (firstPackagingStep) {
        vgmDocument = await prisma.vgmDocument.update({
          where: { id: parseInt(id) },
          data: { productPackagingStepId: firstPackagingStep.id },
          include: {
            piInvoice: {
              select: {
                piNumber: true,
                partyName: true,
                containerType: true,
                numberOfContainers: true,
              },
            },
            productPackagingStep: {
              select: {
                containerNumber: true,
                sealNumber: true,
                sealType: true,
                description: true,
              },
            },
            creator: { select: { name: true } },
            updater: { select: { name: true } },
          },
        });
      }
    }

    res.json({
      success: true,
      data: vgmDocument,
    });
  } catch (error) {
    console.error('Error fetching VGM document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch VGM document',
      error: error.message,
    });
  }
};

// Update VGM Document
const updateVgmDocument = async (req, res) => {
  try {
    const { companyId, id: userId } = req.user;
    const { id } = req.params;
    const updateData = { ...req.body, updatedBy: userId };

    if (updateData.verificationDate) {
      updateData.verificationDate = new Date(updateData.verificationDate);
    }

    const vgmDocument = await prisma.vgmDocument.update({
      where: { id: parseInt(id), companyId },
      data: updateData,
      include: {
        piInvoice: { select: { piNumber: true } },
        productPackagingStep: {
          select: {
            containerNumber: true,
            sealNumber: true,
            sealType: true,
          },
        },
        creator: { select: { name: true } },
      },
    });

    res.json({
      success: true,
      message: 'VGM document updated successfully',
      data: vgmDocument,
    });
  } catch (error) {
    console.error('Error updating VGM document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update VGM document',
      error: error.message,
    });
  }
};

// Delete VGM Document
const deleteVgmDocument = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    await prisma.vgmDocument.delete({
      where: { id: parseInt(id), companyId },
    });

    res.json({
      success: true,
      message: 'VGM document deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting VGM document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete VGM document',
      error: error.message,
    });
  }
};

// Generate VGM PDF
const generateVgmPdf = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const vgmDocument = await prisma.vgmDocument.findFirst({
      where: { id: parseInt(id), companyId },
      include: {
        piInvoice: {
          select: {
            piNumber: true,
            partyName: true,
            containerType: true,
            portOfLoading: true,
            portOfDischarge: true,
            countryOfOrigin: true,
            countryOfDestination: true,
            finalDestination: true,
            packagingSteps: {
              where: {
                containerNumber: { not: null },
              },
              select: {
                containerNumber: true,
                sealNumber: true,
                sealType: true,
                description: true,
              },
              orderBy: { stepNumber: 'asc' },
            },
          },
        },
        productPackagingStep: {
          select: {
            containerNumber: true,
            sealNumber: true,
            sealType: true,
            description: true,
          },
        },
        company: {
          select: {
            name: true,
            address: true,
            phoneNo: true,
            email: true,
            iecNumber: true,
            logo: true,
          },
        },
      },
    });

    if (!vgmDocument) {
      return res.status(404).json({
        success: false,
        message: 'VGM document not found',
      });
    }

    // Extract packing list data
    let packingData = null;
    let vesselName = '';
    let voyageNumber = '';

    if (
      vgmDocument.piInvoice.packagingSteps &&
      vgmDocument.piInvoice.packagingSteps.length > 0
    ) {
      const packagingStep = vgmDocument.piInvoice.packagingSteps[0];
      if (packagingStep.notes) {
        try {
          packingData =
            typeof packagingStep.notes === 'string'
              ? JSON.parse(packagingStep.notes)
              : packagingStep.notes;

          if (packingData.vesselVoyageNo) {
            const parts = packingData.vesselVoyageNo.split('/');
            vesselName = parts[0]?.trim() || '';
            voyageNumber = parts[1]?.trim() || '';
          }
        } catch (e) {
          console.error('Failed to parse packing data:', e);
        }
      }
    }

    // Handle logo
    let logoBase64 = null;
    if (vgmDocument.company.logo) {
      try {
        const logoPath = path.join(
          process.cwd(),
          'uploads',
          vgmDocument.company.logo.replace('/uploads/', '')
        );
        if (fs.existsSync(logoPath)) {
          const logoBuffer = fs.readFileSync(logoPath);
          logoBase64 = logoBuffer.toString('base64');
        }
      } catch (error) {
        console.error('Error reading logo file:', error);
      }
    }

    const templatePath = path.join(__dirname, '../views/vgm-document.ejs');
    const html = await ejs.renderFile(templatePath, {
      vgm: vgmDocument,
      piInvoice: vgmDocument.piInvoice,
      company: vgmDocument.company,
      packingData,
      vesselName,
      voyageNumber,
      logoBase64,
    });

    const pdf = await generatePDF(html, {
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px',
      },
    });

    res.setHeader('Content-Type', 'application/pdf');
    const vgmId = parseInt(id) || vgmDocument.id || 'Unknown';
    const filename = `VGM-${vgmId}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(pdf);
  } catch (error) {
    console.error('Error generating VGM PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate VGM PDF',
      error: error.message,
    });
  }
};

export {
  createVgmDocument,
  getVgmDocuments,
  getVgmDocument,
  updateVgmDocument,
  deleteVgmDocument,
  generateVgmPdf,
};
