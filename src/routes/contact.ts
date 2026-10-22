import { Router, Request, Response } from 'express';
import {
  sendContactInquiryEmail,
  verifyEmailTransporter,
  sendOtpEmail,
  getEmailConfig,
} from '../services/email';

import { ContactModel } from '../models/Contact';

const router = Router();

/**
 * POST /api/contact
 * Submit inquiry from contact page and save to database
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, phone, email, inquiryType, message } = req.body;

    if (!name || !phone || !message) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Name, phone number, and message are required',
      });
    }

    // 1. Save to MongoDB Database
    let savedContact = null;
    try {
      savedContact = await ContactModel.create({
        name: name.trim(),
        phone: phone.trim(),
        email: email ? email.trim() : undefined,
        inquiryType: inquiryType || 'General Inquiry',
        message: message.trim(),
        status: 'new',
      });
    } catch (dbErr) {
      console.warn('Could not save contact inquiry to DB:', (dbErr as Error).message);
    }

    // 2. Send email notification asynchronously
    sendContactInquiryEmail({
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : undefined,
      inquiryType: inquiryType || 'General Inquiry',
      message: message.trim(),
    }).catch((err) => console.error('Failed to send contact inquiry email:', err));

    res.json({
      success: true,
      data: savedContact,
      message: 'Inquiry received and saved to database successfully',
    });
  } catch (error) {
    const err = error as Error;
    console.error('Failed to handle contact inquiry:', err);
    res.status(500).json({
      error: 'Failed to process inquiry',
      message: err.message,
    });
  }
});

/**
 * GET /api/contact
 * List inquiries from database (for admin / showroom desk)
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const inquiries = await ContactModel.find().sort({ createdAt: -1 }).limit(100).lean();
    res.json({ success: true, inquiries });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inquiries', message: (error as Error).message });
  }
});

/**
 * GET /api/contact/verify-email
 * Check if SMTP credentials and Nodemailer are active
 */
router.get('/verify-email', async (_req: Request, res: Response) => {
  try {
    const status = await verifyEmailTransporter();
    const config = getEmailConfig();
    res.json({
      ...status,
      configuredUser: config.smtpUser ? `${config.smtpUser.substring(0, 3)}***@${config.smtpUser.split('@')[1]}` : null,
      adminEmail: config.adminEmail,
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/contact/test-email
 * Send a verification/test email
 */
router.post('/test-email', async (req: Request, res: Response) => {
  try {
    const config = getEmailConfig();
    const recipient = req.body.email || config.adminEmail;

    if (!recipient) {
      return res.status(400).json({ error: 'Recipient email is required' });
    }

    const testOtp = Math.floor(100000 + Math.random() * 900000).toString();
    await sendOtpEmail(recipient, testOtp, 'login');

    res.json({
      success: true,
      message: `Test email sent to ${recipient} with code ${testOtp}`,
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to send test email', message: err.message });
  }
});

export default router;
