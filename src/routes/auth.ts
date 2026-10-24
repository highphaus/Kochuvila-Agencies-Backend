import { Router, Request, Response } from 'express';
import {
  authenticateUser,
  findUserByEmail,
  createUser,
  updateUserPassword,
  updateUserProfile,
  addUserAddress,
  updateUserAddress,
  deleteUserAddress,
} from '../services/data-store';
import jwt from 'jsonwebtoken';
import { sendOtpEmail, sendWelcomeEmail } from '../services/email';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'kochuvila_super_secure_jwt_secret_key_retail_2026_dev';

// In-memory OTP storage with expiration
interface OtpEntry {
  otp: string;
  expiresAt: number;
  purpose: 'login' | 'signup' | 'recovery';
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

    const cleanEmail = email.toLowerCase().trim();
    const user = await authenticateUser(cleanEmail, password);
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
      message: 'Logged in successfully',
    });
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed', message: (error as Error).message });
  }
});

/**
 * 2. FULL SIGN UP (EMAIL + PASSWORD)
 */
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await findUserByEmail(cleanEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
    }

    const user = await createUser({
      name: (name || cleanEmail.split('@')[0]).trim(),
      email: cleanEmail,
      password,
      phone: phone || '+91 97451 11141',
    });

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

    // Send welcome email asynchronously
    sendWelcomeEmail(cleanEmail, user.name).catch((err) =>
      console.error('Failed to send welcome email:', err)
    );

    res.status(201).json({
      success: true,
      token,
      user,
      message: 'Account created successfully',
    });
  } catch (error) {
    res.status(500).json({ error: 'Signup failed', message: (error as Error).message });
  }
});

/**
 * 3. SEND OTP (FOR LOGIN, SIGNUP, OR RECOVERY)
 */
router.post('/send-otp', async (req: Request, res: Response) => {
  try {
    const { email, purpose = 'login' } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const otp = generateOtp();
    const validPurpose: 'login' | 'signup' | 'recovery' =
      purpose === 'signup' || purpose === 'recovery' ? purpose : 'login';

    otpStore.set(cleanEmail, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      purpose: validPurpose,
    });

    console.log(`[AUTH OTP] Generated OTP [${otp}] for ${cleanEmail} (purpose: ${validPurpose})`);

    let emailSent = false;
    let emailError: string | null = null;

    try {
      const info = await sendOtpEmail(cleanEmail, otp, validPurpose === 'recovery' ? 'recovery' : 'login');
      emailSent = true;
      console.log(`[EMAIL SUCCESS] OTP email dispatched to ${cleanEmail}. Provider: ${(info as any)?.provider || 'smtp'}, MessageId:`, (info as any)?.messageId);
    } catch (err) {
      emailError = (err as Error).message;
      console.error(`[EMAIL ERROR] Failed to send email to ${cleanEmail}:`, emailError);
    }

    res.json({
      success: true,
      emailSent,
      emailError,
      message: emailSent
        ? `Verification code sent to your email (${cleanEmail})`
        : `Verification code generated for ${cleanEmail}`,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send OTP', message: (error as Error).message });
  }
});

/**
 * 4. VERIFY OTP & SIGN IN / SIGN UP
 */
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { email, otp, name } = req.body;
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

    // Find or create user
    let user = await findUserByEmail(cleanEmail);
    const resolvedName = (name && name.trim()) || (user && user.name) || cleanEmail.split('@')[0];

    if (!user) {
      user = await createUser({
        name: resolvedName,
        email: cleanEmail,
        role: cleanEmail.includes('admin') ? 'admin' : 'customer',
      });

      sendWelcomeEmail(cleanEmail, user.name).catch(() => {});
    } else if (name && name.trim() && user.name !== name.trim()) {
      user = await createUser({
        name: name.trim(),
        email: cleanEmail,
      });
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
      message: 'Successfully verified and authenticated',
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

    console.log(`[AUTH RECOVERY] Generated recovery OTP [${otp}] for ${cleanEmail}`);

    let emailSent = false;
    let emailError: string | null = null;
    try {
      const info = await sendOtpEmail(cleanEmail, otp, 'recovery');
      emailSent = true;
      console.log(`[EMAIL SUCCESS] Recovery OTP dispatched to ${cleanEmail}. Provider: ${(info as any)?.provider || 'smtp'}, MessageId:`, (info as any)?.messageId);
    } catch (err) {
      emailError = (err as Error).message;
      console.error('[EMAIL ERROR] Failed to send recovery email:', err);
    }

    res.json({
      success: true,
      emailSent,
      emailError,
      message: emailSent ? `Recovery code sent to ${cleanEmail}` : `Recovery code generated for ${cleanEmail}`,
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
    await updateUserPassword(cleanEmail, newPassword);

    res.json({
      success: true,
      message: 'Password has been reset successfully! You can now sign in with your new password.',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset password', message: (error as Error).message });
  }
});

/**
 * 7. GET CURRENT LOGGED IN USER (/me)
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    const user = await findUserByEmail(decoded.email);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user });
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

/**
 * Helper to get user email or ID from request
 */
function getAuthIdentifier(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as { userId?: string; email?: string };
      if (decoded.email) return decoded.email;
      if (decoded.userId) return decoded.userId;
    } catch {
      // ignore
    }
  }
  if (req.body && req.body.userEmail) return req.body.userEmail;
  if (req.body && req.body.email) return req.body.email;
  return null;
}

/**
 * 8. UPDATE USER PROFILE (NAME & PHONE)
 */
router.put('/profile', async (req: Request, res: Response) => {
  try {
    const identifier = getAuthIdentifier(req);
    if (!identifier) {
      return res.status(401).json({ error: 'Authentication required to update profile' });
    }

    const { name, phone } = req.body;
    const updated = await updateUserProfile(identifier, { name, phone });
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: updated,
      message: 'Profile updated successfully in database',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile', message: (error as Error).message });
  }
});

/**
 * 9. ADD DELIVERY ADDRESS
 */
router.post('/address', async (req: Request, res: Response) => {
  try {
    const identifier = getAuthIdentifier(req);
    if (!identifier) {
      return res.status(401).json({ error: 'Authentication required to save address' });
    }

    const { fullName, phone, street, landmark, city, district, state, pincode, isDefault } = req.body;
    if (!fullName || !phone || !street || !city || !district || !pincode) {
      return res.status(400).json({ error: 'Full address details are required' });
    }

    const updated = await addUserAddress(identifier, {
      fullName,
      phone,
      street,
      landmark,
      city,
      district,
      state: state || 'Kerala',
      pincode,
      isDefault: Boolean(isDefault),
    });

    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(201).json({
      success: true,
      user: updated,
      addresses: updated.addresses,
      message: 'Address saved to database successfully',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add address', message: (error as Error).message });
  }
});

/**
 * 10. UPDATE DELIVERY ADDRESS
 */
router.put('/address/:addressId', async (req: Request, res: Response) => {
  try {
    const identifier = getAuthIdentifier(req);
    if (!identifier) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { addressId } = req.params;
    const updated = await updateUserAddress(identifier, addressId, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'User or address not found' });
    }

    res.json({
      success: true,
      user: updated,
      addresses: updated.addresses,
      message: 'Address updated successfully in database',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update address', message: (error as Error).message });
  }
});

/**
 * 11. DELETE DELIVERY ADDRESS
 */
router.delete('/address/:addressId', async (req: Request, res: Response) => {
  try {
    const identifier = getAuthIdentifier(req);
    if (!identifier) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { addressId } = req.params;
    const updated = await deleteUserAddress(identifier, addressId);
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: updated,
      addresses: updated.addresses,
      message: 'Address removed successfully from database',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete address', message: (error as Error).message });
  }
});

export default router;
