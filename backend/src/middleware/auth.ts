import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyMessage } from 'viem';

const prisma = new PrismaClient();

// Extend Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        wallet_address: string;
        current_level: number;
      };
    }
  }
}

// Message prefix for signing
const MESSAGE_PREFIX = 'Sign this message to authenticate with Narrative Vaults: ';

export async function authenticateUser(req: Request, res: Response, next: NextFunction) {
  const signature = req.headers['x-signature'] as string;
  const timestamp = req.headers['x-timestamp'] as string;
  const walletAddress = req.headers['x-wallet-address'] as string;

  // Allow requests without auth for certain endpoints (handled in routes)
  if (!signature || !timestamp || !walletAddress) {
    return res.status(401).json({
      message: 'Authentication required: Missing signature, timestamp, or wallet address.',
      required: ['x-signature', 'x-timestamp', 'x-wallet-address']
    });
  }

  try {
    // Validate timestamp (prevent replay attacks - allow 5 minute window)
    const requestTime = parseInt(timestamp);
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (isNaN(requestTime) || Math.abs(now - requestTime) > fiveMinutes) {
      return res.status(401).json({ message: 'Invalid or expired timestamp.' });
    }

    // Reconstruct the message that was signed
    const message = `${MESSAGE_PREFIX}${timestamp}`;

    // Verify the signature using viem
    const isValid = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message: message,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return res.status(401).json({ message: 'Invalid signature.' });
    }

    // Normalize wallet address to lowercase
    const normalizedAddress = walletAddress.toLowerCase();

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { wallet_address: normalizedAddress }
    });

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          wallet_address: normalizedAddress,
          total_xp: 0,
          current_level: 1,
          referral_code: generateReferralCode(),
        },
      });
      console.log(`[Auth] New user created: ${normalizedAddress}`);
    }

    // Attach user to request
    req.user = {
      id: user.id,
      wallet_address: user.wallet_address,
      current_level: user.current_level
    };

    next();
  } catch (error) {
    console.error('[Auth] Authentication error:', error);
    res.status(401).json({ message: 'Authentication failed.' });
  }
}

/**
 * Middleware to check if user meets minimum level requirement
 */
export function requireLevel(minLevel: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (req.user.current_level < minLevel) {
      return res.status(403).json({
        message: `Level ${minLevel} required. Your current level: ${req.user.current_level}`,
        required_level: minLevel,
        current_level: req.user.current_level
      });
    }

    next();
  };
}

/**
 * Optional authentication - doesn't fail if not authenticated
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const signature = req.headers['x-signature'] as string;
  const timestamp = req.headers['x-timestamp'] as string;
  const walletAddress = req.headers['x-wallet-address'] as string;

  // If no auth headers, continue without user
  if (!signature || !timestamp || !walletAddress) {
    return next();
  }

  // Try to authenticate, but don't fail if it doesn't work
  try {
    const requestTime = parseInt(timestamp);
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (isNaN(requestTime) || Math.abs(now - requestTime) > fiveMinutes) {
      return next(); // Invalid timestamp, continue without auth
    }

    const message = `${MESSAGE_PREFIX}${timestamp}`;

    const isValid = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message: message,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return next(); // Invalid signature, continue without auth
    }

    const normalizedAddress = walletAddress.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { wallet_address: normalizedAddress }
    });

    if (user) {
      req.user = {
        id: user.id,
        wallet_address: user.wallet_address,
        current_level: user.current_level
      };
    }

    next();
  } catch (error) {
    // Continue without auth on error
    next();
  }
}

/**
 * Generate a unique referral code
 */
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Get the message that should be signed for authentication
 */
export function getAuthMessage(timestamp: number): string {
  return `${MESSAGE_PREFIX}${timestamp}`;
}
