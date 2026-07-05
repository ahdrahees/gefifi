import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { User } from './interfaces'; // Assuming User interface is in interfaces.ts

// Ensure JWT_SECRET is loaded from .env (server.ts already handles dotenv.config())
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
	console.error('FATAL ERROR: JWT_SECRET is not defined in .env. Authentication will not work.');
	// For a production app, you might throw an error to halt startup:
	// throw new Error("FATAL ERROR: JWT_SECRET is not defined. Halting application.");
}

// --- Password Hashing ---
const SALT_ROUNDS = 10; // Standard salt rounds for bcrypt

/**
 * Hashes a given password.
 * @param password The plain text password.
 * @returns A promise that resolves to the hashed password.
 */
export const hashPassword = async (password: string): Promise<string> => {
	if (!password) {
		throw new Error('Password cannot be null or empty for hashing.');
	}
	return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compares a plain text password with a stored hash.
 * @param password The plain text password to check.
 * @param hash The stored hashed password.
 * @returns A promise that resolves to true if passwords match, false otherwise.
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
	if (!password || !hash) {
		// Avoids bcrypt error if either is null/empty
		return false;
	}
	return bcrypt.compare(password, hash);
};

// --- JWT Generation & Verification ---

/**
 * Defines the structure of the JWT payload.
 */
export interface JwtPayload {
	id: string; // User's unique ID
	email?: string; // User's email
	phoneNumber?: string; // User's phone number
	userType: User['userType']; // User's role/type
	// You can add other non-sensitive, useful information here (e.g., fullName)
	// iat (issued at) and exp (expiration time) are added automatically by jwt.sign
}

/**
 * Generates a JWT for a given user.
 * @param user A partial User object containing id, email, phoneNumber, and userType.
 * @returns A JWT string.
 */
export const generateToken = (user: Pick<User, 'id' | 'email' | 'phoneNumber' | 'userType'>): string => {
	if (!JWT_SECRET) {
		// This check is crucial. If JWT_SECRET is missing, tokens cannot be signed securely.
		console.error('Cannot generate token: JWT_SECRET is not configured.');
		throw new Error('Server configuration error preventing token generation.');
	}
	const payload: JwtPayload = {
		id: user.id,
		email: user.email,
		phoneNumber: user.phoneNumber,
		userType: user.userType
	};
	// Token expiration: '1h' for 1 hour, '7d' for 7 days, etc.
	return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' }); // Example: token expires in 1 day
};

/**
 * Extends the Express Request interface to include the decoded user payload.
 */
export interface AuthenticatedRequest extends Request {
	user?: JwtPayload; // The decoded JWT payload will be attached here.
}

/**
 * Express middleware to authenticate requests using JWT.
 * It checks for a token in the 'Authorization' header (Bearer scheme).
 * If valid, it attaches the decoded payload to `req.user`.
 */
export const authenticateToken = (
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction
): void => {
	const authHeader = req.headers['authorization'];
	// Token is expected in the format: "Bearer <token>"
	const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

	if (!token) {
		// No token provided
		res.status(401).json({ message: 'Access denied. No token provided.' });
		return;
	}

	if (!JWT_SECRET) {
		console.error('Cannot verify token: JWT_SECRET is not configured.');
		res.status(500).json({ message: 'Server configuration error for token verification.' });
		return;
	}

	jwt.verify(token, JWT_SECRET, (err, decoded) => {
		if (err) {
			if (err.name === 'TokenExpiredError') {
				return res.status(401).json({ message: 'Token expired. Please log in again.' });
			}
			if (err.name === 'JsonWebTokenError') {
				return res.status(403).json({ message: 'Invalid token. Authentication failed.' });
			}
			// For other errors during verification
			console.error('JWT verification error:', err.message);
			return res.status(403).json({ message: 'Token verification failed.' }); // Forbidden
		}

		// Token is valid, attach payload to request object
		req.user = decoded as JwtPayload; // Assuming decoded is indeed JwtPayload structure
		next(); // Proceed to the next middleware or route handler
	});
};

console.log('Auth module loaded.');
if (!JWT_SECRET) {
	console.warn(
		'Warning: JWT_SECRET is not set in environment variables. Auth features will not work correctly.'
	);
} else {
	console.log('JWT_SECRET is loaded.');
}
