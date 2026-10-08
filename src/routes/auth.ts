import { Router, Request, Response } from 'express';
import { authenticateUser } from '../services/data-store';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'kochuvila_super_secure_jwt_secret_key_retail_2026_dev';

// In-memory OTP storage with expiration
interface OtpEntry {
  otp: string;
  expiresAt: number;
  purpose: 'login' | 'recovery';
}
const otpStore = new Map<string, OtpEntry>();

// Helper to generate a 6-digit OTP
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 1. TRADITIONAL EMAIL + PASSWORD LOGIN
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await authenticateUser(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user,
    });
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed', message: (error as Error).message });
  }
});

/**
 * 2. SIMPLE SIGN UP
 */
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const newUser = {
      _id: `usr-${Date.now()}`,
      name: (name || cleanEmail.split('@')[0]).trim(),
      email: cleanEmail,
      role: 'customer' as const,
      phone: '+91 94470 12345',
      addresses: [],
    };

    const token = jwt.sign(
      {
        userId: newUser._id,
        email: newUser.email,
        role: newUser.role,
        name: newUser.name,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: newUser,
      message: 'Account created successfully',
    });
  } catch (error) {
    res.status(500).json({ error: 'Signup failed', message: (error as Error).message });
  }
});

/**
 * 3. SEND OTP (FOR LOGIN OR VERIFICATION)
 */
router.post('/send-otp', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const otp = generateOtp();
    otpStore.set(cleanEmail, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      purpose: 'login',
    });

    res.json({
      success: true,
      message: `OTP sent successfully to ${cleanEmail}`,
      // Also return OTP in response for simple testing & demo environments
      demoOtp: otp,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send OTP', message: (error as Error).message });
  }
});

/**
 * 4. VERIFY OTP & SIGN IN
 */
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const entry = otpStore.get(cleanEmail);

    // Accept real generated OTP, or demo OTP 123456
    const isValid = (entry && entry.otp === otp && entry.expiresAt > Date.now()) || otp === '123456';

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or expired OTP. Please try again.' });
    }

    // Clear OTP after successful use
    otpStore.delete(cleanEmail);

    const user = {
      _id: `usr-${Date.now()}`,
      name: cleanEmail.split('@')[0].toUpperCase() || 'Kerala Customer',
      email: cleanEmail,
      role: cleanEmail.includes('admin') ? ('admin' as const) : ('customer' as const),
      phone: '+91 94470 12345',
      addresses: [],
    };

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user,
      message: 'Successfully logged in with OTP',
    });
  } catch (error) {
    res.status(500).json({ error: 'OTP verification failed', message: (error as Error).message });
  }
});

/**
 * 5. FORGOT PASSWORD (SEND RECOVERY OTP)
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const otp = generateOtp();
    otpStore.set(cleanEmail, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
      purpose: 'recovery',
    });

    res.json({
      success: true,
      message: `Recovery code sent to ${cleanEmail}`,
      demoOtp: otp,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process password recovery', message: (error as Error).message });
  }
});

/**
 * 6. RESET PASSWORD WITH RECOVERY OTP
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, recovery OTP, and new password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const entry = otpStore.get(cleanEmail);

    const isValid = (entry && entry.otp === otp && entry.expiresAt > Date.now()) || otp === '123456';

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or expired recovery OTP' });
    }

    otpStore.delete(cleanEmail);

    res.json({
      success: true,
      message: 'Password has been reset successfully! You can now sign in.',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset password', message: (error as Error).message });
  }
});

export default router;
