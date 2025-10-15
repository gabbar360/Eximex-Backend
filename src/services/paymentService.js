import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import path from 'path';
import ejs from 'ejs';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendInvoiceEmail = async (to, invoiceData, pdfBuffer, paymentLink = null) => {
  const templatePath = path.join(__dirname, '../views/invoice-email-template.ejs');
  const htmlContent = await ejs.renderFile(templatePath, {
    invoiceData,
    paymentLink
  });
  
  const mailOptions = {
    from: `"${invoiceData.company?.name || invoiceData.companyName || 'Company'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject: `Proforma Invoice ${invoiceData.piNumber}`,
    text: `Dear ${invoiceData.party?.companyName || invoiceData.partyName || 'Customer'},\n\nPlease find attached your proforma invoice ${invoiceData.piNumber} for ${invoiceData.currency} ${invoiceData.totalAmount}.\n\nThank you for your business!\n\nBest regards,\n${invoiceData.company?.name || invoiceData.companyName || 'Company'}`,
    html: htmlContent,
    attachments: [
      {
        filename: `PI-${invoiceData.piNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  };

  await transporter.sendMail(mailOptions);
};

const createPayment = async (data, userId) => {
  return await prisma.payment.create({
    data: {
      ...data,
      createdBy: userId,
    },
    include: {
      piInvoice: true,
      party: true,
    },
  });
};

const getPayments = async (companyId, query = {}) => {
  const { status, startDate, endDate } = query;
  
  const where = { companyId };
  if (status) where.status = status;
  if (startDate && endDate) {
    where.dueDate = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  return await prisma.payment.findMany({
    where,
    include: {
      piInvoice: {
        select: { piNumber: true, partyName: true, totalAmount: true, advanceAmount: true }
      },
      party: {
        select: { companyName: true }
      },
    },
    orderBy: { dueDate: 'asc' },
  });
};

const updatePaymentStatus = async (id, status) => {
  return await prisma.payment.update({
    where: { id: parseInt(id) },
    data: { status },
  });
};

const getDuePayments = async (companyId) => {
  return await prisma.payment.findMany({
    where: {
      companyId,
      status: { in: ['pending', 'overdue'] },
      dueDate: { lte: new Date() },
    },
    include: {
      piInvoice: {
        select: { piNumber: true, partyName: true, totalAmount: true, advanceAmount: true }
      },
      party: {
        select: { companyName: true }
      },
    },
    orderBy: { dueDate: 'asc' },
  });
};

export default {
  createPayment,
  getPayments,
  updatePaymentStatus,
  getDuePayments,
  sendInvoiceEmail,
};