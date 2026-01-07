import { AccountingService } from '../services/accountingService.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Auto-create accounting entries when PI Invoice status changes
export const handlePiInvoiceStatusChange = async (piInvoiceId, oldStatus, newStatus) => {
  try {
    console.log('📊 ACCOUNTING HOOK - Status change detected:', {
      piInvoiceId,
      oldStatus,
      newStatus
    });
    
    if (newStatus === 'confirmed' && oldStatus !== 'confirmed') {
      console.log('✅ Creating accounting entry for confirmed PI...');
      await AccountingService.createFromPiInvoice(piInvoiceId);
      console.log(`✅ Accounting entry created for PI Invoice: ${piInvoiceId}`);
    } else {
      console.log('⚠️ No accounting entry needed - status not confirmed or already confirmed');
    }
  } catch (error) {
    console.error('❌ Failed to create accounting entry:', error);
  }
};

// Auto-create accounting entries when payment is recorded
export const handlePaymentCreation = async (paymentId) => {
  try {
    await AccountingService.createFromPayment(paymentId);
    console.log(`✅ Accounting entry created for Payment: ${paymentId}`);
  } catch (error) {
    console.error('❌ Failed to create accounting entry:', error);
  }
};

// Auto-create accounting entries for purchase orders
export const handlePurchaseOrderCreation = async (purchaseOrderId) => {
  try {
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { vendor: true }
    });

    if (!purchaseOrder) return;

    await AccountingService.createEntry({
      companyId: purchaseOrder.companyId,
      entryType: 'PURCHASE',
      amount: purchaseOrder.totalAmount,
      description: `Purchase Order - ${purchaseOrder.poNumber}`,
      referenceType: 'PURCHASE_ORDER',
      referenceId: purchaseOrderId,
      referenceNumber: purchaseOrder.poNumber,
      partyName: purchaseOrder.vendorName,
      date: purchaseOrder.poDate,
      createdBy: purchaseOrder.createdBy
    });

    console.log(`✅ Accounting entry created for Purchase Order: ${purchaseOrderId}`);
  } catch (error) {
    console.error('❌ Failed to create accounting entry:', error);
  }
};