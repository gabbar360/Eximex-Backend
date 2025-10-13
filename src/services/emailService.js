import nodemailer from 'nodemailer';
import path from 'path';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Test SMTP connection
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP Connection Failed:', error);
  } else {
    console.log('✅ SMTP Server Ready');
    console.log('📧 SMTP Config:', {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      user: process.env.SMTP_USER,
      from: process.env.SMTP_FROM
    });
  }
});

const sendInvoiceEmail = async (to, invoiceData, pdfBuffer, paymentLink = null) => {
  console.log('📧 EMAIL SERVICE - Starting email send process');
  console.log('📧 Recipient:', to);
  console.log('📧 Invoice Number:', invoiceData.piNumber);
  console.log('📧 Company Name:', invoiceData.company?.name || invoiceData.companyName);
  console.log('📧 Party Name:', invoiceData.party?.companyName || invoiceData.partyName);
  console.log('📧 Total Amount:', invoiceData.currency, invoiceData.totalAmount);
  console.log('📧 PDF Buffer Size:', pdfBuffer ? pdfBuffer.length : 'No PDF');
  console.log('📧 Payment Link:', paymentLink ? paymentLink.short_url : 'No payment link');
  console.log('📧 Full Invoice Data Keys:', Object.keys(invoiceData));
  
  const mailOptions = {
    from: `"${invoiceData.company?.name || invoiceData.companyName || 'Company'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject: `Proforma Invoice ${invoiceData.piNumber}`,
    text: `Dear ${invoiceData.party?.companyName || invoiceData.partyName || 'Customer'},\n\nPlease find attached your proforma invoice ${invoiceData.piNumber} for ${invoiceData.currency} ${invoiceData.totalAmount}.\n\nThank you for your business!\n\nBest regards,\n${invoiceData.company?.name || invoiceData.companyName || 'Company'}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Proforma Invoice ${invoiceData.piNumber}</h2>
          <p style="color: #555; line-height: 1.6;">Dear ${invoiceData.party?.companyName || invoiceData.partyName || 'Customer'},</p>
          <p style="color: #555; line-height: 1.6;">We hope this email finds you well. Please find attached your proforma invoice for the amount of <strong>${invoiceData.currency} ${invoiceData.totalAmount}</strong>.</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0; color: #666;"><strong>Invoice Number:</strong> ${invoiceData.piNumber}</p>
            <p style="margin: 5px 0; color: #666;"><strong>Amount:</strong> ${invoiceData.currency} ${invoiceData.totalAmount}</p>
            <p style="margin: 5px 0; color: #666;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          ${paymentLink ? `
          <div style="margin: 25px 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; text-align: center;">
            <h3 style="color: white; margin: 0 0 15px 0; font-size: 18px;">💳 Make Payment Now</h3>
            <a href="${paymentLink.short_url}" 
               style="display: inline-block; padding: 12px 30px; background-color: #28a745; color: white; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 8px rgba(0,0,0,0.2); transition: all 0.3s ease;">
              PAY ${invoiceData.currency} ${invoiceData.totalAmount}
            </a>
            <p style="color: #f8f9fa; margin: 10px 0 0 0; font-size: 12px;">🔒 Secure payment powered by Razorpay</p>
          </div>
          ` : ''}
          <p style="color: #555; line-height: 1.6;">If you have any questions regarding this invoice, please don't hesitate to contact us.</p>
          <p style="color: #555; line-height: 1.6;">Thank you for your continued business!</p>
          <br>
          <p style="color: #333; margin-top: 30px;">Best regards,<br><strong>${invoiceData.company?.name || invoiceData.companyName || 'Company'}</strong></p>
        </div>
      </div>
    `,
    headers: {
      'X-Priority': '3',
      'X-MSMail-Priority': 'Normal',
      'Importance': 'Normal',
      'X-Mailer': 'EximEx Invoice System'
    },
    attachments: [
      {
        filename: `PI-${invoiceData.piNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  };

  console.log('📧 Mail Options:', {
    from: mailOptions.from,
    to: mailOptions.to,
    subject: mailOptions.subject,
    attachmentCount: mailOptions.attachments.length
  });

  // Test connection before sending
  console.log('🔍 Testing SMTP connection...');
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified');
  } catch (verifyError) {
    console.error('❌ SMTP verification failed:', verifyError.message);
    throw new Error(`SMTP connection failed: ${verifyError.message}`);
  }

  try {
    console.log('📨 Sending email...');
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ EMAIL SENT SUCCESSFULLY!');
    console.log('📧 Message ID:', result.messageId);
    console.log('📧 Response:', result.response);
    console.log('📧 Accepted Recipients:', result.accepted);
    console.log('📧 Rejected Recipients:', result.rejected);
    console.log('📧 Envelope:', result.envelope);
    console.log('🔍 EMAIL DELIVERED TO GMAIL SERVER - Check these locations:');
    console.log('   1. SPAM/JUNK folder (most likely)');
    console.log('   2. Promotions tab in Gmail');
    console.log('   3. Search "PI251007-001" in Gmail');
    console.log('   4. Try different email address to test');
    console.log('📧 Gmail Search URL: https://mail.google.com/mail/u/0/#search/PI251007-001');
    return result;
  } catch (error) {
    console.error('❌ EMAIL SEND FAILED!');
    console.error('📧 Error Code:', error.code);
    console.error('📧 Error Message:', error.message);
    console.error('📧 Error Response:', error.response);
    console.error('📧 Full Error:', error);
    throw error;
  }
};

export {
  sendInvoiceEmail,
};