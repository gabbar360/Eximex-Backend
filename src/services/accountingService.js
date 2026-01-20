import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const createEntry = async (data) => {
  return await prisma.accountingEntry.create({
    data: {
      companyId: data.companyId,
      entryType: data.entryType,
      amount: data.amount,
      description: data.description,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      referenceNumber: data.referenceNumber,
      partyName: data.partyName,
      date: new Date(data.date),
      createdBy: data.createdBy
    }
  });
};

const createFromPiInvoice = async (piInvoiceId) => {
  console.log('📊 ACCOUNTING SERVICE - Creating entry from PI Invoice:', piInvoiceId);
  
  const existingEntries = await prisma.accountingEntry.findMany({
    where: {
      referenceType: 'PI_INVOICE',
      referenceId: piInvoiceId
    }
  });
  
  if (existingEntries.length > 0) {
    console.log('⚠️ Accounting entries already exist for this PI Invoice, skipping');
    return;
  }
  
  const piInvoice = await prisma.piInvoice.findUnique({
    where: { id: piInvoiceId },
    include: { party: true }
  });

  console.log('📊 PI Invoice data:', {
    id: piInvoice?.id,
    status: piInvoice?.status,
    totalAmount: piInvoice?.totalAmount,
    advanceAmount: piInvoice?.advanceAmount,
    currency: piInvoice?.currency,
    partyName: piInvoice?.partyName
  });

  if (!piInvoice || piInvoice.status !== 'confirmed') {
    console.log('⚠️ PI Invoice not found or not confirmed, skipping accounting entry');
    return;
  }

  const exchangeRate = 84;
  const isUSD = piInvoice.currency === 'USD';
  const convertedAmount = isUSD ? piInvoice.totalAmount * exchangeRate : piInvoice.totalAmount;
  const convertedAdvance = isUSD && piInvoice.advanceAmount ? piInvoice.advanceAmount * exchangeRate : (piInvoice.advanceAmount || 0);

  const salesEntry = {
    companyId: piInvoice.companyId,
    entryType: 'SALES',
    amount: convertedAmount,
    description: `Sales Invoice - ${piInvoice.piNumber}${isUSD ? ' (USD converted)' : ''}`,
    referenceType: 'PI_INVOICE',
    referenceId: piInvoiceId,
    referenceNumber: piInvoice.piNumber,
    partyName: piInvoice.partyName,
    date: piInvoice.invoiceDate,
    createdBy: piInvoice.createdBy
  };

  console.log('📊 Creating SALES entry:', salesEntry);
  const salesResult = await createEntry(salesEntry);
  
  if (convertedAdvance > 0) {
    const receiptEntry = {
      companyId: piInvoice.companyId,
      entryType: 'RECEIPT',
      amount: convertedAdvance,
      description: `Advance Payment - ${piInvoice.piNumber}${isUSD ? ' (USD converted)' : ''}`,
      referenceType: 'PI_INVOICE',
      referenceId: piInvoiceId,
      referenceNumber: piInvoice.piNumber,
      partyName: piInvoice.partyName,
      date: piInvoice.invoiceDate,
      createdBy: piInvoice.createdBy
    };
    
    console.log('📊 Creating RECEIPT entry for advance:', receiptEntry);
    await createEntry(receiptEntry);
  }
  
  console.log('✅ Accounting entries created successfully');
  return salesResult;
};

const createFromPayment = async (paymentId) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { party: true, piInvoice: true }
  });

  if (!payment) return;

  await createEntry({
    companyId: payment.companyId,
    entryType: 'RECEIPT',
    amount: payment.paidAmount,
    description: `Payment received - ${payment.reference || 'Cash'}`,
    referenceType: 'PAYMENT',
    referenceId: paymentId,
    referenceNumber: payment.reference,
    partyName: payment.party?.companyName || payment.piInvoice?.partyName,
    date: new Date(),
    createdBy: payment.createdBy
  });
};

const getLedger = async (companyId, filters = {}, dataFilters = {}) => {
  const { fromDate, toDate, entryType, partyName } = filters;
  
  const where = {
    companyId: companyId,
    ...dataFilters, // Apply role-based filter (createdBy for staff)
  };
  
  if (fromDate) {
    where.date = { ...where.date, gte: new Date(fromDate) };
  }
  if (toDate) {
    const endOfDay = new Date(toDate);
    endOfDay.setHours(23, 59, 59, 999);
    where.date = { ...where.date, lte: endOfDay };
  }
  if (entryType) where.entryType = entryType;
  if (partyName) where.partyName = { contains: partyName, mode: 'insensitive' };

  console.log('📊 LEDGER QUERY - Where clause:', JSON.stringify(where, null, 2));

  return await prisma.accountingEntry.findMany({
    where,
    orderBy: [{ date: 'desc' }, { id: 'desc' }]
  });
};

const getProfitLoss = async (companyId, fromDate, toDate, dataFilters = {}) => {
  if (!fromDate || !toDate) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    fromDate = fromDate || startOfMonth.toISOString().split('T')[0];
    toDate = toDate || endOfMonth.toISOString().split('T')[0];
  }
  
  const endOfDay = new Date(toDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  const baseWhere = {
    companyId: companyId,
    ...dataFilters, // Apply role-based filter
    date: {
      gte: new Date(fromDate),
      lte: endOfDay
    }
  };
  
  const sales = await prisma.accountingEntry.aggregate({
    where: {
      ...baseWhere,
      entryType: 'SALES'
    },
    _sum: { amount: true }
  });

  const expenses = await prisma.accountingEntry.aggregate({
    where: {
      ...baseWhere,
      entryType: { in: ['PURCHASE', 'EXPENSE'] }
    },
    _sum: { amount: true }
  });

  const receipts = await prisma.accountingEntry.aggregate({
    where: {
      ...baseWhere,
      entryType: 'RECEIPT'
    },
    _sum: { amount: true }
  });

  const salesTotal = sales._sum.amount || 0;
  const expensesTotal = expenses._sum.amount || 0;
  const receiptsTotal = receipts._sum.amount || 0;
  const profit = salesTotal - expensesTotal;
  const outstandingReceivables = salesTotal - receiptsTotal;

  return {
    fromDate,
    toDate,
    revenue: salesTotal,
    expenses: expensesTotal,
    grossProfit: profit,
    cashReceived: receiptsTotal,
    outstandingReceivables: outstandingReceivables,
    cashFlow: receiptsTotal - expensesTotal
  };
};

const getBalanceSheet = async (companyId, asOfDate, dataFilters = {}) => {
  if (!asOfDate) {
    asOfDate = new Date().toISOString().split('T')[0];
  }
  
  const endOfDay = new Date(asOfDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  const baseWhere = {
    companyId: companyId,
    ...dataFilters, // Apply role-based filter
    date: { lte: endOfDay }
  };
  
  const receivables = await prisma.accountingEntry.aggregate({
    where: {
      ...baseWhere,
      entryType: 'SALES'
    },
    _sum: { amount: true }
  });

  const receipts = await prisma.accountingEntry.aggregate({
    where: {
      ...baseWhere,
      entryType: 'RECEIPT'
    },
    _sum: { amount: true }
  });

  const receivablesTotal = receivables._sum.amount || 0;
  const receiptsTotal = receipts._sum.amount || 0;
  const accountsReceivable = receivablesTotal - receiptsTotal;

  return {
    asOfDate,
    accountsReceivable: Math.max(accountsReceivable, 0),
    totalAssets: Math.max(accountsReceivable, 0)
  };
};

const getExportData = async (companyId, fromDate, toDate, dataFilters = {}) => {
  return await prisma.accountingEntry.findMany({
    where: {
      companyId: companyId,
      ...dataFilters, // Apply role-based filter
      date: {
        gte: new Date(fromDate),
        lte: new Date(toDate)
      }
    },
    select: {
      date: true,
      entryType: true,
      referenceNumber: true,
      partyName: true,
      description: true,
      amount: true,
      createdAt: true
    },
    orderBy: [{ date: 'asc' }, { id: 'asc' }]
  });
};

const deleteEntriesByReference = async (referenceType, referenceId) => {
  return await prisma.accountingEntry.deleteMany({
    where: {
      referenceType,
      referenceId: parseInt(referenceId)
    }
  });
};

const deleteEntriesByMultipleReferences = async (references) => {
  const deletePromises = references.map(ref => 
    prisma.accountingEntry.deleteMany({
      where: {
        referenceType: ref.type,
        referenceId: parseInt(ref.id)
      }
    })
  );
  
  return await Promise.all(deletePromises);
};

export const AccountingService = {
  createEntry,
  createFromPiInvoice,
  createFromPayment,
  getLedger,
  getProfitLoss,
  getBalanceSheet,
  getExportData,
  deleteEntriesByReference,
  deleteEntriesByMultipleReferences
};