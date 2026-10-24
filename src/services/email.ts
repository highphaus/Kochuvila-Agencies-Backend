import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

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
  googleScriptOtpUrl?: string;
}

export function getEmailConfig(): EmailConfig {
  dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
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

  const DEFAULT_GOOGLE_SCRIPT_OTP_URL =
    'https://script.google.com/macros/s/AKfycbwZ0CLLef-MzBbcNuhj3WaACwUDa7hQn-iM7bQvQIVZoz2w_hMF3PKB2OXqfuz04zAO6w/exec';

  let googleScriptOtpUrl = (
    process.env.GOOGLE_SCRIPT_OTP_URL ||
    process.env.OTP_SCRIPT_URL ||
    process.env.GOOGLE_SCRIPT_URL ||
    ''
  ).trim();

  // Automatic fallback scanner in case raw script URL is present in backend/.env
  if (!googleScriptOtpUrl) {
    try {
      const rawEnv = fs.readFileSync(path.resolve(__dirname, '../../.env'), 'utf8');
      const match = rawEnv.match(/https:\/\/script\.google\.com\/macros\/s\/[^\s\r\n]+/);
      if (match) {
        googleScriptOtpUrl = match[0].trim();
      }
    } catch {}
  }

  // Always fallback to the official deployed Google Apps Script URL so Git deployments never fail
  if (!googleScriptOtpUrl) {
    googleScriptOtpUrl = DEFAULT_GOOGLE_SCRIPT_OTP_URL;
  }

  return { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, emailFrom, adminEmail, googleScriptOtpUrl };
}

export function getTransporter() {
  const config = getEmailConfig();
  if (config.smtpHost === 'smtp.gmail.com' || config.smtpUser.includes('@gmail.com')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    });
  }
  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
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
 * (100% table-based inline styles for maximum email client & Gmail inbox deliverability)
 */
function wrapHtmlEmail(title: string, bodyContent: string, recipientEmail?: string): string {
  const config = getEmailConfig();
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.03);">
    
    <!-- Showroom Brand Header -->
    <tr>
      <td align="center" style="background-color: #06121e; padding: 26px 20px; text-align: center;">
        <div style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          KOCHUVILA AGENCIES
        </div>
        <div style="font-size: 12px; color: #93c5fd; margin-top: 4px; font-weight: 500;">
          Home Appliances &amp; Teakwood Furniture • Kerala
        </div>
      </td>
    </tr>

    <!-- Main Message Body -->
    <tr>
      <td style="padding: 32px 28px; line-height: 1.6; font-size: 14px; color: #334155;">
        ${bodyContent}
      </td>
    </tr>

    <!-- Business & Regulatory Footer (Prevents spam classification) -->
    <tr>
      <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 24px; text-align: center; font-size: 11px; color: #64748b; line-height: 1.6;">
        <p style="margin: 0 0 3px 0; font-weight: 700; color: #334155;">Kochuvila Agencies</p>
        <p style="margin: 0 0 3px 0;">Near Pangode Junction, Trivandrum 695609 | Kallara 695608, Kerala, India</p>
        <p style="margin: 0 0 8px 0;">Helpline: +91 97451 11141 | Support: ${config.smtpUser}</p>
        <p style="margin: 0; color: #94a3b8; font-size: 10px;">
          This is an automated account security notification${recipientEmail ? ` sent to ${recipientEmail}` : ''}.
        </p>
      </td>
    </tr>

  </table>
</body>
</html>`;
}

/**
 * 0. Send OTP via Google Apps Script Web App
 */
export async function sendOtpViaGoogleScript(
  to: string,
  otp: string,
  purpose: 'login' | 'recovery' = 'login'
): Promise<{ messageId: string; provider: string; result?: any }> {
  const config = getEmailConfig();
  const scriptUrl = config.googleScriptOtpUrl;
  if (!scriptUrl) {
    throw new Error('Google Apps Script OTP URL is not configured');
  }

  const isRecovery = purpose === 'recovery';
  const subject = isRecovery
    ? `Your Kochuvila Agencies password reset code is ${otp}`
    : `Your Kochuvila Agencies verification code is ${otp}`;

  const res = await fetch(scriptUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to,
      email: to,
      recipient: to,
      otp,
      purpose,
      subject,
    }),
  });

  const responseText = await res.text();
  if (responseText.includes('Exception:') || responseText.includes('Failed to send email')) {
    throw new Error(`Google Apps Script error: ${responseText.replace(/<[^>]+>/g, '').trim()}`);
  }

  let parsed: any = null;
  try {
    parsed = JSON.parse(responseText);
  } catch {}

  console.log(`[GOOGLE SCRIPT OTP SUCCESS] Verification code [${otp}] dispatched to ${to} via Google Apps Script.`);
  return {
    messageId: `gas-${Date.now()}`,
    provider: 'google-apps-script',
    result: parsed,
  };
}

/**
 * 1. Send OTP Verification Email
 */
export async function sendOtpEmail(to: string, otp: string, purpose: 'login' | 'recovery' = 'login') {
  const config = getEmailConfig();

  // 1. Prioritize Google Apps Script endpoint if configured in backend/.env
  if (config.googleScriptOtpUrl) {
    try {
      return await sendOtpViaGoogleScript(to, otp, purpose);
    } catch (gasErr) {
      console.warn(`[OTP GOOGLE SCRIPT FALLBACK] Google Apps Script failed: ${(gasErr as Error).message}. Attempting Nodemailer SMTP...`);
    }
  }

  // 2. Nodemailer SMTP (fallback or primary when script is unset)
  const isRecovery = purpose === 'recovery';
  const subject = isRecovery
    ? `Your Kochuvila Agencies password reset code is ${otp}`
    : `Your Kochuvila Agencies verification code is ${otp}`;

  const text = `Hello,

Your verification code for Kochuvila Agencies is: ${otp}

Please enter this 6-digit code on the website to complete your sign in. This code is valid for 10 minutes.

If you did not request this code, you can safely ignore this email.

---
Kochuvila Agencies
Near Pangode Junction, Trivandrum 695609 | Kallara 695608, Kerala
Showroom Helpline: +91 97451 11141
Email: ${config.smtpUser}
`;

  const html = wrapHtmlEmail(
    subject,
    `
    <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #0f172a;">
      Hello,
    </p>
    <p style="margin: 0 0 20px 0; font-size: 14px; color: #334155; line-height: 1.6;">
      ${
        isRecovery
          ? 'We received a request to reset your password. Use the verification code below to set a new password:'
          : 'Use the one-time verification code below to verify your email and sign in to your Kochuvila Agencies account:'
      }
    </p>

    <!-- Copyable OTP Box with user-select -->
    <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 24px auto;">
      <tr>
        <td align="center" style="background-color: #f0f7ff; border: 1.5px solid #0097F3; border-radius: 12px; padding: 18px 36px; text-align: center;">
          <div style="font-size: 11px; font-weight: 700; color: #017ed0; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px;">
            One-Time Code
          </div>
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #06121e; user-select: all; -webkit-user-select: all; -moz-user-select: all; line-height: 1; padding: 4px 0;">
            ${otp}
          </div>
        </td>
      </tr>
    </table>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin: 20px 0;">
      <p style="color: #475569; font-size: 12px; margin: 0; line-height: 1.5;">
        This code expires in <strong>10 minutes</strong>. For your security, do not share this code with anyone.
      </p>
    </div>

    <p style="color: #94a3b8; font-size: 12px; margin: 16px 0 0 0;">
      If you did not request this verification code, you can safely disregard this message.
    </p>
    `,
    to
  );

  const t = getTransporter();
  return t.sendMail({
    from: `"Kochuvila Agencies" <${config.smtpUser}>`,
    to,
    replyTo: `"Kochuvila Support" <${config.smtpUser}>`,
    subject,
    text,
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
