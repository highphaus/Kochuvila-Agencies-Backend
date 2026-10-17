import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

// Load .env explicitly
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  emailFrom: string;
  adminEmail: string;
}

export function getEmailConfig(): EmailConfig {
  const smtpPass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
  const smtpUser = (process.env.SMTP_USER || '').trim();
  const smtpHost = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
  const smtpSecure =
    process.env.SMTP_SECURE !== undefined
      ? process.env.SMTP_SECURE === 'true'
      : smtpPort === 465;

  const emailFrom = process.env.EMAIL_FROM || `Kochuvila Agencies <${smtpUser}>`;
  const adminEmail = (process.env.ADMIN_NOTIFICATION_EMAIL || smtpUser).trim();

  return { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, emailFrom, adminEmail };
}

export function getTransporter() {
  const config = getEmailConfig();
  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

export const transporter = getTransporter();

/**
 * Verify SMTP connection configuration
 */
export async function verifyEmailTransporter(): Promise<{ success: boolean; message: string }> {
  try {
    const config = getEmailConfig();
    if (!config.smtpUser || !config.smtpPass) {
      return {
        success: false,
        message: 'SMTP credentials missing. Please set SMTP_USER and SMTP_PASS in .env',
      };
    }
    const t = getTransporter();
    await t.verify();
    return { success: true, message: `SMTP connection verified for ${config.smtpUser}` };
  } catch (error) {
    const err = error as Error;
    return { success: false, message: `SMTP verification failed: ${err.message}` };
  }
}

/**
 * Common HTML wrapper with Kochuvila Agencies brand styling
 */
function wrapHtmlEmail(title: string, bodyContent: string): string {
  const config = getEmailConfig();
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
      body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
      .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
      .header { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); color: #ffffff; padding: 28px 24px; text-align: center; }
      .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
      .header p { margin: 6px 0 0 0; font-size: 13px; color: #93c5fd; }
      .content { padding: 32px 28px; line-height: 1.6; }
      .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b; }
      .otp-box { background: #eff6ff; border: 2px dashed #3b82f6; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8; }
      .card { background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 16px; margin: 16px 0; }
      .button { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 12px 28px; border-radius: 8px; font-weight: 600; text-decoration: none; margin-top: 16px; }
      .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: #dbeafe; color: #1e40af; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th { text-align: left; padding: 8px; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0; }
      td { padding: 10px 8px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Kochuvila Agencies</h1>
        <p>Premium Home Appliances & Teakwood Furniture • Kerala</p>
      </div>
      <div class="content">
        ${bodyContent}
      </div>
      <div class="footer">
        <p>Kochuvila Agencies, Near Pangode Junction, Trivandrum 695609 | Kallara 695608</p>
        <p>Helpline: +91 97451 11141 | Email: ${config.smtpUser || 'kochuvilapgd1141@gmail.com'}</p>
        <p style="margin-top: 8px; color: #94a3b8;">© ${new Date().getFullYear()} Kochuvila Agencies. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * 1. Send OTP Verification Email
 */
export async function sendOtpEmail(to: string, otp: string, purpose: 'login' | 'recovery' = 'login') {
  const config = getEmailConfig();
  const isRecovery = purpose === 'recovery';
  const subject = isRecovery
    ? `Your Password Reset Code: ${otp} - Kochuvila Agencies`
    : `Your Login Verification Code: ${otp} - Kochuvila Agencies`;

  const html = wrapHtmlEmail(
    subject,
    `
    <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">
      ${isRecovery ? 'Password Reset Verification' : 'Verification Code'}
    </h2>
    <p>Hello,</p>
    <p>
      ${
        isRecovery
          ? 'We received a request to reset your password for your Kochuvila Agencies account. Use the verification code below to proceed.'
          : 'Use the one-time code below to verify your email address and securely log into your Kochuvila Agencies account.'
      }
    </p>

    <div class="otp-box">${otp}</div>

    <p style="color: #64748b; font-size: 13px;">
      ⏱️ This one-time code is valid for <strong>10 minutes</strong>. Never share this code with anyone.
    </p>
    <p style="color: #64748b; font-size: 13px;">
      If you did not request this code, you can safely ignore this email.
    </p>
    `
  );

  const t = getTransporter();
  return t.sendMail({
    from: config.emailFrom,
    to,
    subject,
    html,
  });
}

/**
 * 2. Send Order Confirmation Email to Customer
 */
export async function sendOrderConfirmationEmail(order: any) {
  if (!order.customer?.email) return null;

  const config = getEmailConfig();
  const subject = `Order Confirmation #${order.orderNumber} - Kochuvila Agencies`;

  const itemsHtml = (order.items || [])
    .map(
      (item: any) => `
      <tr>
        <td>
          <strong>${item.name}</strong><br/>
          <span style="font-size: 11px; color: #64748b;">${item.brand || ''} (Qty: ${item.quantity})</span>
        </td>
        <td style="text-align: right; font-weight: 600;">₹${(item.price * item.quantity).toLocaleString('en-IN')}</td>
      </tr>
    `
    )
    .join('');

  const html = wrapHtmlEmail(
    subject,
    `
    <div style="text-align: center; margin-bottom: 20px;">
      <span class="badge">Order Placed Successfully</span>
      <h2 style="color: #0f172a; margin: 10px 0 4px 0;">Thank You for Your Order!</h2>
      <p style="color: #64748b; margin: 0; font-size: 14px;">Order Number: <strong>${order.orderNumber}</strong></p>
    </div>

    <p>Dear ${order.customer.fullName || 'Customer'},</p>
    <p>We are delighted to confirm that your order has been received by Kochuvila Agencies. Our dispatch and logistics desk will contact you prior to delivery.</p>

    <div class="card">
      <h3 style="margin-top: 0; font-size: 15px; color: #0f172a;">Delivery Information</h3>
      <p style="margin: 4px 0; font-size: 13px;">
        <strong>Recipient:</strong> ${order.customer.fullName} (${order.customer.phone})<br/>
        <strong>Address:</strong> ${order.customer.address?.street || ''}, ${order.customer.address?.city || ''}, ${order.customer.address?.district || ''}, Kerala - ${order.customer.address?.pincode || ''}
      </p>
      <p style="margin: 8px 0 0 0; font-size: 13px;">
        <strong>Payment Method:</strong> ${order.paymentMethod?.toUpperCase() || 'COD'} (${order.paymentStatus || 'Pending'})
      </p>
    </div>

    <h3 style="font-size: 15px; color: #0f172a; margin-top: 24px; margin-bottom: 8px;">Order Summary</h3>
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
        <tr>
          <td style="font-weight: 600; padding-top: 12px;">Subtotal</td>
          <td style="text-align: right; font-weight: 600; padding-top: 12px;">₹${(order.subtotal || 0).toLocaleString('en-IN')}</td>
        </tr>
        ${
          order.discount
            ? `<tr>
                <td style="color: #16a34a;">Coupon Discount (${order.couponCode || 'APPLIED'})</td>
                <td style="text-align: right; color: #16a34a;">-₹${(order.discount || 0).toLocaleString('en-IN')}</td>
              </tr>`
            : ''
        }
        <tr>
          <td>Delivery Charge</td>
          <td style="text-align: right;">${order.deliveryCharge === 0 ? 'FREE' : `₹${order.deliveryCharge}`}</td>
        </tr>
        <tr style="border-top: 2px solid #0f172a;">
          <td style="font-size: 16px; font-weight: 800; color: #0f172a; padding-top: 12px;">Total Amount</td>
          <td style="font-size: 16px; font-weight: 800; color: #0f172a; text-align: right; padding-top: 12px;">₹${(order.totalAmount || 0).toLocaleString('en-IN')}</td>
        </tr>
      </tbody>
    </table>

    <div style="margin-top: 28px; text-align: center;">
      <p style="font-size: 13px; color: #64748b;">Need assistance with your delivery or installation schedule?</p>
      <a href="tel:+919745111141" class="button">Call Showroom Helpline (+91 97451 11141)</a>
    </div>
    `
  );

  const t = getTransporter();
  return t.sendMail({
    from: config.emailFrom,
    to: order.customer.email,
    subject,
    html,
  });
}

/**
 * 3. Send New Order Alert to Admin / Showroom Desk
 */
export async function sendAdminOrderNotificationEmail(order: any) {
  const config = getEmailConfig();
  if (!config.adminEmail) return null;

  const subject = `🚨 NEW ORDER #${order.orderNumber} - ₹${(order.totalAmount || 0).toLocaleString('en-IN')} from ${order.customer?.fullName}`;

  const itemsList = (order.items || [])
    .map(
      (item: any) =>
        `• ${item.name} (${item.brand || 'Brand'}) x ${item.quantity} = ₹${(item.price * item.quantity).toLocaleString('en-IN')}`
    )
    .join('<br/>');

  const html = wrapHtmlEmail(
    subject,
    `
    <h2 style="color: #0f172a; margin-top: 0;">New Order Alert!</h2>
    <p>A new customer order has been placed on the Kochuvila Agencies website.</p>

    <div class="card">
      <p style="margin: 4px 0;"><strong>Order Number:</strong> ${order.orderNumber}</p>
      <p style="margin: 4px 0;"><strong>Customer Name:</strong> ${order.customer?.fullName}</p>
      <p style="margin: 4px 0;"><strong>Customer Phone:</strong> <a href="tel:${order.customer?.phone}">${order.customer?.phone}</a></p>
      <p style="margin: 4px 0;"><strong>Customer Email:</strong> ${order.customer?.email || 'N/A'}</p>
      <p style="margin: 4px 0;"><strong>Delivery Address:</strong> ${order.customer?.address?.street || ''}, ${order.customer?.address?.city || ''}, ${order.customer?.address?.district || ''} - ${order.customer?.address?.pincode || ''}</p>
      <p style="margin: 4px 0;"><strong>Payment Method:</strong> ${order.paymentMethod?.toUpperCase()} (${order.paymentStatus})</p>
      <p style="margin: 4px 0;"><strong>Total Amount:</strong> <span style="font-size: 16px; font-weight: 700; color: #047857;">₹${(order.totalAmount || 0).toLocaleString('en-IN')}</span></p>
    </div>

    <h3 style="font-size: 14px; margin-top: 16px;">Items Ordered:</h3>
    <div class="card" style="font-size: 13px; line-height: 1.8;">
      ${itemsList}
    </div>

    ${order.notes ? `<p><strong>Customer Notes:</strong> ${order.notes}</p>` : ''}
    `
  );

  const t = getTransporter();
  return t.sendMail({
    from: config.emailFrom,
    to: config.adminEmail,
    subject,
    html,
  });
}

/**
 * 4. Send Contact Inquiry to Admin & Acknowledgment to Customer
 */
export async function sendContactInquiryEmail(inquiry: {
  name: string;
  phone: string;
  email?: string;
  inquiryType: string;
  message: string;
}) {
  const config = getEmailConfig();
  const adminSubject = `📩 New Showroom Inquiry: [${inquiry.inquiryType.toUpperCase()}] from ${inquiry.name}`;

  const adminHtml = wrapHtmlEmail(
    adminSubject,
    `
    <h2 style="color: #0f172a; margin-top: 0;">New Website Inquiry</h2>
    <p>A customer has submitted an inquiry form on the Kochuvila Agencies contact page.</p>

    <div class="card">
      <p style="margin: 4px 0;"><strong>Customer Name:</strong> ${inquiry.name}</p>
      <p style="margin: 4px 0;"><strong>Phone:</strong> <a href="tel:${inquiry.phone}">${inquiry.phone}</a> | <a href="https://wa.me/${inquiry.phone.replace(/[^0-9]/g, '')}">Chat on WhatsApp</a></p>
      <p style="margin: 4px 0;"><strong>Email:</strong> ${inquiry.email || 'N/A'}</p>
      <p style="margin: 4px 0;"><strong>Department / Category:</strong> <span class="badge">${inquiry.inquiryType}</span></p>
    </div>

    <h3 style="font-size: 14px; margin-top: 16px;">Customer Message:</h3>
    <div class="card" style="background: #ffffff; border-left: 4px solid #3b82f6; font-size: 13px;">
      ${inquiry.message.replace(/\n/g, '<br/>')}
    </div>
    `
  );

  const t = getTransporter();
  const promises = [];

  // Notify showroom desk / admin
  if (config.adminEmail) {
    promises.push(
      t.sendMail({
        from: config.emailFrom,
        to: config.adminEmail,
        subject: adminSubject,
        html: adminHtml,
      })
    );
  }

  // Acknowledge customer if email was provided
  if (inquiry.email && inquiry.email.includes('@')) {
    const customerSubject = `Thank You for Contacting Kochuvila Agencies, ${inquiry.name}`;
    const customerHtml = wrapHtmlEmail(
      customerSubject,
      `
      <h2 style="color: #0f172a; margin-top: 0;">We Have Received Your Inquiry</h2>
      <p>Dear ${inquiry.name},</p>
      <p>Thank you for reaching out to Kochuvila Agencies. Our showroom retail desk has received your request regarding <strong>${inquiry.inquiryType}</strong>.</p>
      <p>One of our product specialists will contact you shortly on <strong>${inquiry.phone}</strong> with model availability, best bundle discounts, and free delivery options.</p>
      <div class="card">
        <strong>Your Message:</strong><br/>
        <em>"${inquiry.message}"</em>
      </div>
      <p>Need urgent showroom assistance? Feel free to call us directly at <a href="tel:+919745111141">+91 97451 11141</a>.</p>
      `
    );

    promises.push(
      t.sendMail({
        from: config.emailFrom,
        to: inquiry.email,
        subject: customerSubject,
        html: customerHtml,
      })
    );
  }

  return Promise.all(promises);
}

/**
 * 5. Send Welcome Email upon Registration
 */
export async function sendWelcomeEmail(to: string, name: string) {
  const config = getEmailConfig();
  const subject = `Welcome to Kochuvila Agencies, ${name}!`;
  const html = wrapHtmlEmail(
    subject,
    `
    <h2 style="color: #0f172a; margin-top: 0;">Welcome to Kochuvila Agencies!</h2>
    <p>Dear ${name},</p>
    <p>We are delighted to welcome you to Kerala's trusted destination for home appliances and custom teakwood furniture.</p>
    <div class="card">
      <h4 style="margin-top: 0; color: #1e3a8a;">Your Member Benefits:</h4>
      <ul style="padding-left: 20px; margin-bottom: 0; font-size: 13px; color: #334155;">
        <li>Authorized 100% manufacturer warranty on all top brands (LG, Samsung, Whirlpool, Bosch)</li>
        <li>Priority showroom scheduling & custom furniture consultations</li>
        <li>Free delivery and expert installation across Kerala</li>
        <li>Exclusive member discount coupons & festival offers</li>
      </ul>
    </div>
    <div style="text-align: center; margin-top: 24px;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="button">Explore Showroom Deals</a>
    </div>
    `
  );

  const t = getTransporter();
  return t.sendMail({
    from: config.emailFrom,
    to,
    subject,
    html,
  });
}
