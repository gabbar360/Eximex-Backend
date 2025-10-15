import crypto from 'crypto';
import { prisma } from '../config/dbConfig.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const handleRazorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.stringify(req.body);

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac(
        'sha256',
        process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET
      )
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.log('❌ Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    console.log('🔔 Razorpay Webhook Event:', event.event);

    if (event.event === 'payment_link.paid') {
      const paymentLinkData = event.payload.payment_link.entity;
      const paymentData = event.payload.payment.entity;

      console.log('💳 Payment Link Paid:', paymentLinkData.id);
      console.log('💰 Payment Amount:', paymentData.amount / 100);

      // Extract PI details from notes
      const piNumber = paymentLinkData.notes?.pi_number;
      const companyId = parseInt(paymentLinkData.notes?.company_id);

      if (piNumber && companyId) {
        // Find PI Invoice
        const piInvoice = await prisma.piInvoice.findFirst({
          where: { piNumber, companyId },
        });

        if (piInvoice) {
          // Update payment record
          const payment = await prisma.payment.findFirst({
            where: { piInvoiceId: piInvoice.id },
          });

          if (payment) {
            const paidAmount = paymentData.amount / 100; // Convert from paise

            await prisma.payment.update({
              where: { id: payment.id },
              data: {
                status: 'paid',
                paidAmount: paidAmount,
                dueAmount: Math.max(0, payment.amount - paidAmount),
                paymentDate: new Date(),
                razorpayPaymentId: paymentData.id,
                razorpayOrderId: paymentData.order_id,
              },
            });

            console.log(
              `✅ Payment updated for PI ${piNumber}: ₹${paidAmount}`
            );
          }
        }
      }
    }

    res.status(200).json(new ApiResponse(200, {}, 'Webhook processed'));
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};
