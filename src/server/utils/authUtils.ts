// src/server/utils/authUtils.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { User } from '@/types/user'; // Assuming User type definition

// Retrieve secret once at module load
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  // Throw an error during initialization if the secret is missing
  const errorMsg = 'CRITICAL: JWT_SECRET environment variable is not defined. Authentication will fail.';
  console.error(errorMsg);
  throw new Error(errorMsg);
} else {
   // Log confirmation and partial secret for verification during startup
   const secretPreview = JWT_SECRET.length > 8 ? `${JWT_SECRET.substring(0, 4)}...${JWT_SECRET.substring(JWT_SECRET.length - 4)}` : '********';
   console.log(`[Auth Utils Startup] JWT_SECRET loaded. Preview: ${secretPreview}`);
}

/**
 * Hashes a password using bcrypt.
 * @param password The plain text password.
 * @returns A promise that resolves to the hashed password.
 */
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10; // Adjust salt rounds as needed for security/performance balance
  return bcrypt.hash(password, saltRounds);
};

/**
 * Compares a plain text password with a hashed password.
 * @param plainPassword The plain text password to compare.
 * @param hashedPassword The hashed password from the database.
 * @returns A promise that resolves to true if passwords match, false otherwise.
 */
export const comparePassword = async (plainPassword: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

/**
 * Generates a JSON Web Token (JWT) for a user.
 * @param user The user object (ensure it contains the user ID).
 * @returns The generated JWT string.
 */
export const generateToken = (user: Pick<User, 'id' | 'email' | 'name'>): string => {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    // Add other relevant non-sensitive info if needed
  };
  // Ensure JWT_SECRET is available (already checked at module load)
  if (!JWT_SECRET) {
    const errorMsg = "[generateToken Error] generateToken failed: JWT_SECRET is missing at runtime.";
    console.error(errorMsg);
    throw new Error("Server configuration error: JWT secret not available for token generation.");
  }
  const secretPreview = JWT_SECRET.length > 8 ? `${JWT_SECRET.substring(0, 4)}...${JWT_SECRET.substring(JWT_SECRET.length - 4)}` : '********';
  console.log(`[generateToken] Generating token for user ID: ${user.id} using secret preview: ${secretPreview}`);
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' }); // Token expires in 1 day
};

/**
 * Verifies a JWT token.
 * @param token The JWT string to verify.
 * @returns The decoded user payload if the token is valid.
 * @throws {Error} With specific messages for invalid/expired tokens or verification failures.
 */
export const verifyToken = (token: string): Omit<User, 'password'> => { // Return User object shape
  // Ensure JWT_SECRET is available (checked at module load, re-check for safety)
  const currentSecret = process.env.JWT_SECRET;
  if (!currentSecret) {
    const errorMsg = "[verifyToken Error] JWT_SECRET is missing at runtime.";
    console.error(errorMsg);
    throw new Error("Server configuration error: JWT secret not found for verification.");
  }

  // Log token preview and partial secret for debugging
  const tokenPreview = token.length > 10 ? `${token.substring(0, 5)}...${token.substring(token.length - 5)}` : token;
  const secretPreview = currentSecret.length > 8 ? `${currentSecret.substring(0, 4)}...${currentSecret.substring(currentSecret.length - 4)}` : '********';
  console.log(`[verifyToken] Attempting verification. Token Preview: ${tokenPreview}, Secret Preview: ${secretPreview}`);

  try {
    // The 'jwt.verify' function throws specific errors for different failure reasons
    const decoded = jwt.verify(token, currentSecret);

    // Validate the structure of the decoded payload
    if (typeof decoded !== 'object' || decoded === null || !('id' in decoded) || !('email' in decoded) || !('name' in decoded)) {
        console.error('[verifyToken Error] Decoded token payload has unexpected structure:', decoded);
        throw new Error('Invalid token structure after verification.');
    }

    console.log('[verifyToken Success] Token verified. Decoded payload:', decoded);
    // Return the relevant parts of the decoded payload matching the User type (excluding password)
    return {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
        // Add other properties if they are part of your User type and included in the token
    } as Omit<User, 'password'>; // Cast to ensure type safety

  } catch (error: any) {
    // Log the specific JWT error AND the original error object for more details
    console.error('[verifyToken Failed] JWT verification error name:', error.name);
    console.error('[verifyToken Failed] JWT verification error message:', error.message);
    console.error('[verifyToken Failed] Full JWT verification error object:', error);

    // Throw a more specific error based on the type of JWT error
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired. Please log in again.');
    } else if (error instanceof jwt.JsonWebTokenError) {
      // Covers malformed tokens, invalid signatures, etc.
      throw new Error(`Invalid token: ${error.message}`);
    } else {
      // Catch unexpected errors during verification
      console.error('[verifyToken Failed] Caught unexpected verification error type:', typeof error);
      // Re-throw the original error but with a prefix to indicate it's unexpected
      throw new Error(`Token verification failed due to an unexpected error: ${error.message || 'Unknown reason'}`);
    }
  }
};