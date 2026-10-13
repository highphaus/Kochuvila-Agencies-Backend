import dotenv from 'dotenv';
import path from 'path';

// Explicitly load .env from the backend directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { verifyEmailTransporter, transporter } from '../services/email';

async function main() {
  console.log('Testing SMTP connection...');
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('SMTP_PASS length:', process.env.SMTP_PASS?.length || 0);

  const verification = await verifyEmailTransporter();
  console.log('Verification result:', verification);

  if (verification.success) {
    console.log('Sending test email to', process.env.SMTP_USER);
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: process.env.SMTP_USER,
      subject: '✅ Kochuvila Agencies - Nodemailer Test Verification',
      text: 'Congratulations! Nodemailer is successfully configured and working with your Gmail app password.',
      html: `
        <div style="font-family: sans-serif; padding: 20px; background: #f8fafc; border-radius: 8px;">
          <h2 style="color: #1e3a8a;">Nodemailer is Working!</h2>
          <p>Your Gmail App Password and Nodemailer configuration for <strong>Kochuvila Agencies</strong> are operational.</p>
          <p>Time sent: ${new Date().toLocaleString()}</p>
        </div>
      `,
    });
    console.log('Test email sent successfully! MessageId:', info.messageId);
  } else {
    console.error('SMTP verification failed.');
  }
}

main().catch((err) => {
  console.error('Error in test script:', err);
  process.exit(1);
});
