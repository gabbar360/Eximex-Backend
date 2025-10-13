import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createPaymentLink = async (piInvoice) => {
  try {
    // Convert amount to paise (multiply by 100)
    const amountInPaise = Math.round(parseFloat(piInvoice.totalAmount) * 100);
    
    const paymentLinkData = {
      amount: amountInPaise,
      currency: piInvoice.currency === 'USD' ? 'USD' : 'INR',
      accept_partial: false,
      description: `Payment for PI Invoice ${piInvoice.piNumber}`,
      customer: {
        name: piInvoice.partyName || piInvoice.party?.companyName || 'Customer',
        email: piInvoice.email || piInvoice.party?.email,
        contact: piInvoice.phone || piInvoice.party?.phone || '',
      },
      notify: {
        sms: true,
        email: true,
      },
      reminder_enable: true,
      notes: {
        pi_number: piInvoice.piNumber,
        company_id: piInvoice.companyId.toString(),
        pi_id: piInvoice.id.toString(),
      },
      callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-success?pi=${piInvoice.piNumber}`,
      callback_method: 'get',
      expire_by: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
    };

    const paymentLink = await razorpay.paymentLink.create(paymentLinkData);
    
    // Log for production monitoring
    console.log(`Payment link created for PI ${piInvoice.piNumber}: ${paymentLink.short_url}`);
    
    return paymentLink;
  } catch (error) {
    console.error('Razorpay payment link creation failed:', error);
    throw new Error(`Payment link creation failed: ${error.message}`);
  }
};

export const getPaymentLinkStatus = async (paymentLinkId) => {
  try {
    return await razorpay.paymentLink.fetch(paymentLinkId);
  } catch (error) {
    console.error('Error fetching payment link:', error);
    throw error;
  }
};

export const verifyPayment = async (paymentId, orderId, signature) => {
  try {
    const crypto = await import('crypto');
    const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(orderId + '|' + paymentId)
      .digest('hex');
    
    return expectedSignature === signature;
  } catch (error) {
    console.error('Payment verification failed:', error);
    return false;
  }
};