import { PiService } from '../services/piService.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import fs from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import paymentService from '../services/paymentService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const createPiInvoice = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId || req.body.companyId;
  const piInvoice = await PiService.createPiInvoice(
    { ...req.body, companyId },
    req.user.id,
    req
  );
  return res
    .status(201)
    .json(new ApiResponse(201, piInvoice, 'PI Invoice created successfully'));
});

export const getPiInvoices = asyncHandler(async (req, res) => {
  const result = await PiService.getPiInvoices(
    req.user.companyId,
    req.query,
    req.dataFilters || {}
  );
  return res
    .status(200)
    .json(new ApiResponse(200, result, 'PI Invoices retrieved successfully'));
});

export const getPiInvoiceById = asyncHandler(async (req, res) => {
  const piInvoice = await PiService.getPiInvoiceById(
    parseInt(req.params.id),
    req.user.companyId
  );
  return res
    .status(200)
    .json(new ApiResponse(200, piInvoice, 'PI Invoice retrieved successfully'));
});

export const updatePiInvoice = asyncHandler(async (req, res) => {
  const piInvoice = await PiService.updatePiInvoice(
    parseInt(req.params.id),
    req.body,
    req.user.id,
    req.user.companyId,
    req
  );
  return res
    .status(200)
    .json(new ApiResponse(200, piInvoice, 'PI Invoice updated successfully'));
});

export const deletePiInvoice = asyncHandler(async (req, res) => {
  const result = await PiService.deletePiInvoice(
    parseInt(req.params.id),
    req.user.companyId,
    req.user.id,
    req
  );
  return res
    .status(200)
    .json(new ApiResponse(200, result, 'PI Invoice deleted successfully'));
});

export const addPiProduct = asyncHandler(async (req, res) => {
  const product = await PiService.addPiProduct(
    parseInt(req.params.piId),
    req.body,
    req.user.companyId
  );
  return res
    .status(201)
    .json(new ApiResponse(201, product, 'Product added successfully'));
});

export const updatePiProduct = asyncHandler(async (req, res) => {
  const product = await PiService.updatePiProduct(
    parseInt(req.params.piId),
    parseInt(req.params.productId),
    req.body,
    req.user.companyId
  );
  return res
    .status(200)
    .json(new ApiResponse(200, product, 'Product updated successfully'));
});

export const deletePiProduct = asyncHandler(async (req, res) => {
  const result = await PiService.deletePiProduct(
    parseInt(req.params.piId),
    parseInt(req.params.productId),
    req.user.companyId
  );
  return res
    .status(200)
    .json(new ApiResponse(200, result, 'Product deleted successfully'));
});

export const updatePiStatus = asyncHandler(async (req, res) => {
  const piInvoice = await PiService.updatePiStatus(
    parseInt(req.params.id),
    req.body.status,
    req.user.id,
    req.user.companyId,
    req,
    req.body.paymentAmount || null // Optional payment amount
  );
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        piInvoice,
        piInvoice.message || 'PI Invoice status updated successfully'
      )
    );
});

export const downloadPiInvoicePdf = asyncHandler(async (req, res) => {
  try {
    const piInvoice = await PiService.getPiInvoiceById(
      parseInt(req.params.id),
      req.user.companyId
    );

    // Convert company logo to base64
    let logoBase64 = null;
    try {
      if (piInvoice.company?.logo) {
        const logoFilename = piInvoice.company.logo.split('/').pop();
        const logoPath = join(__dirname, '../../uploads/logos', logoFilename);
        if (fs.existsSync(logoPath)) {
          const logoBuffer = fs.readFileSync(logoPath);
          logoBase64 = logoBuffer.toString('base64');
        }
      }
    } catch (error) {
      console.error('Error reading company logo file:', error);
    }

    const pdfBuffer = await PiService.generatePiInvoicePdf(
      parseInt(req.params.id),
      req.user.companyId,
      logoBase64
    );

    // Generate a more descriptive filename
    const partyName = (
      piInvoice.partyName ||
      piInvoice.party?.companyName ||
      'Customer'
    ).replace(/[^a-zA-Z0-9]/g, '-');
    const piNumber = piInvoice.piNumber.replace(/[^a-zA-Z0-9]/g, '-');
    const date = new Date().toISOString().split('T')[0];
    const filename = `${partyName}-PI-${piNumber}-${date}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF download error:', error);
    return res.status(500).json({
      success: false,
      message:
        error.message || 'Failed to generate PDF. Please try again later.',
    });
  }
});

export const getPiInvoiceHistory = asyncHandler(async (req, res) => {
  const history = await PiService.getPiInvoiceHistory(
    parseInt(req.params.id),
    req.user.companyId
  );
  return res
    .status(200)
    .json(
      new ApiResponse(200, history, 'PI Invoice history retrieved successfully')
    );
});

export const getConfirmedPisForOrder = asyncHandler(async (req, res) => {
  const confirmedPis = await PiService.getPiInvoicesForOrderCreation(
    req.user.companyId
  );
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        confirmedPis,
        'Confirmed PI Invoices for order creation retrieved successfully'
      )
    );
});

export const updatePiAmount = asyncHandler(async (req, res) => {
  const piInvoice = await PiService.updatePiAmountDirect(
    parseInt(req.params.id),
    req.body.totalAmount,
    req.user.id,
    req.user.companyId,
    req.body.advanceAmount
  );
  return res
    .status(200)
    .json(
      new ApiResponse(200, piInvoice, 'PI Invoice amount updated successfully')
    );
});

export const emailInvoice = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const piId = parseInt(req.params.id);

  console.log('🚀 EMAIL CONTROLLER - Starting email process');

  const piInvoice = await PiService.getPiInvoiceById(piId, req.user.companyId);

  // Generate Razorpay payment link
  let paymentLink = null;
  try {
    const { createPaymentLink } = await import(
      '../services/razorpayService.js'
    );
    paymentLink = await createPaymentLink(piInvoice);
    console.log('💳 Payment link created:', paymentLink.short_url);
  } catch (error) {
    console.error('❌ Payment link creation failed:', error);
  }

  let logoBase64 = null;
  try {
    if (piInvoice.company?.logo) {
      const logoFilename = piInvoice.company.logo.split('/').pop();
      const logoPath = join(__dirname, '../../uploads/logos', logoFilename);
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        logoBase64 = logoBuffer.toString('base64');
      }
    }
  } catch (error) {
    console.error('❌ Error reading logo:', error);
  }

  const pdfBuffer = await PiService.generatePiInvoicePdf(
    piId,
    req.user.companyId,
    logoBase64,
    paymentLink
  );

  try {
    await paymentService.sendInvoiceEmail(
      email,
      piInvoice,
      pdfBuffer,
      paymentLink
    );
    console.log('✅ EMAIL CONTROLLER - Email sent successfully!');
  } catch (error) {
    console.error('❌ EMAIL CONTROLLER - Email send failed:', error.message);
    throw error;
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { paymentLink: paymentLink?.short_url },
        'Invoice sent successfully with payment link'
      )
    );
});
