import { Router, Request, Response } from 'express';
import { FirestoreCollection } from '../data';
import { User, UserProfile } from '../interfaces';
import {
    generateToken,
    authenticateToken,
    AuthenticatedRequest,
    JwtPayload
} from '../auth';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { validateProfileData } from './shared/validation';
import { otpService } from '../services/otp';
import admin from 'firebase-admin';

// Initialize databases
const usersDB = new FirestoreCollection<User>('users');

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// --- Authentication Routes ---

/**
 * Endpoint to request an OTP code for a phone number.
 */
router.post('/auth/send-otp', async (req: Request, res: Response) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) {
            return res.status(400).json({ message: 'Phone number is required.' });
        }
        if (!otpService.validatePhoneNumber(phoneNumber)) {
            return res.status(400).json({ message: 'A valid E.164 phone number is required (e.g. +919999999999).' });
        }

        // Trigger lazy cleanup of expired OTPs
        otpService.cleanupExpiredOtps().catch(err => console.error('Error in lazy OTP cleanup:', err));

        const result = await otpService.sendOtp(phoneNumber);
        if (!result.success) {
            return res.status(429).json({
                message: result.message,
                cooldownRemaining: result.cooldownRemaining
            });
        }

        return res.status(200).json({ message: result.message });
    } catch (error: unknown) {
        console.error('Error in send-otp:', error);
        const errMsg = error instanceof Error ? error.message : 'Failed to send OTP.';
        return res.status(500).json({ message: errMsg });
    }
});

/**
 * Endpoint to verify OTP and log in / initiate new account creation.
 */
router.post('/auth/verify-otp', async (req: Request, res: Response) => {
    try {
        const { phoneNumber, otpCode, userTypeForNewUser } = req.body;
        if (!phoneNumber || !otpCode) {
            return res.status(400).json({ message: 'Phone number and OTP code are required.' });
        }

        // Trigger lazy cleanup of expired OTPs
        otpService.cleanupExpiredOtps().catch(err => console.error('Error in lazy OTP cleanup:', err));

        const verification = await otpService.verifyOtp(phoneNumber, otpCode);
        if (!verification.valid) {
            return res.status(400).json({ message: verification.message || 'Verification failed.' });
        }

        // Check if user exists in the database
        const allUsers = await usersDB.getAll();
        let user = allUsers.find((u: User) => u.phoneNumber === phoneNumber);
        let isNewUser = false;

        if (!user) {
            // If no userType is provided, we assume it's a login attempt for a non-existent account
            if (!userTypeForNewUser) {
                return res.status(404).json({
                    message: "Account not found. Please register first.",
                    needsRegister: true
                });
            }

            // New user registration flow
            isNewUser = true;
            if (!['customer', 'expert', 'supplier'].includes(userTypeForNewUser)) {
                return res.status(400).json({
                    message: "Invalid user type. Must be customer, expert, or supplier.",
                    needsUserType: true
                });
            }

            const now = new Date().toISOString();
            const newUserId = crypto.randomUUID();
            const newUser: User = {
                id: newUserId,
                phoneNumber: phoneNumber,
                userType: userTypeForNewUser,
                profile: {
                    phoneNumber: phoneNumber // sync with profile
                },
                createdAt: now,
                updatedAt: now,
                isActive: true
            };
            user = await usersDB.create(newUser);
        }

        if (!user.isActive) {
            return res.status(403).json({ message: 'Account is inactive. Please contact support.' });
        }

        const token = generateToken({
            id: user.id,
            email: user.email,
            phoneNumber: user.phoneNumber,
            userType: user.userType
        });

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...userToReturn } = user;

        return res.status(200).json({
            user: userToReturn,
            token,
            isNewUser,
            message: 'OTP verified successfully.'
        });
    } catch (error: unknown) {
        console.error('Error in verify-otp:', error);
        const errMsg = error instanceof Error ? error.message : 'Verification failed.';
        return res.status(500).json({ message: errMsg });
    }
});

router.get('/auth/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const jwtPayload = req.user as JwtPayload;
        if (!jwtPayload || !jwtPayload.id) {
            return res
                .status(401)
                .json({ message: 'Authentication token did not provide valid user details.' });
        }
        const user = await usersDB.findById(jwtPayload.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found based on token.' });
        }
        if (!user.isActive) {
            return res.status(403).json({ message: 'User account is inactive.' });
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...userToReturn } = user;
        res.status(200).json(userToReturn);
    } catch (error: unknown) {
        console.error('Error fetching current user (/auth/me):', error);
        if (error instanceof Error) {
            res.status(500).json({ message: 'Error fetching user details.', error: error.message });
        } else {
            res.status(500).json({ message: 'An unknown error occurred fetching user details.' });
        }
    }
});

router.post('/auth/google', async (req: Request, res: Response) => {
    const { googleTokenId, userTypeForNewUser, profileForNewUser } = req.body;

    if (!googleTokenId) {
        return res.status(400).json({ message: 'Google ID Token is required.' });
    }

    try {
        // Verify the ID token with Google
        const ticket = await googleClient.verifyIdToken({
            idToken: googleTokenId,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        if (!payload) {
            return res.status(400).json({ message: 'Invalid Google token payload.' });
        }

        const { sub: googleId, email, name, picture: avatarUrl } = payload;
        if (!email) {
            return res.status(400).json({ message: 'Email not found in Google token.' });
        }

        const normalizedEmail = email.toLowerCase();
        const users = await usersDB.getAll();
        let user = users.find(
            (u: User) => u.googleId === googleId || u.email?.toLowerCase() === normalizedEmail
        );
        const now = new Date().toISOString();
        let isNewUser = false; // Flag to indicate if a new user was created

        if (user) {
            // --- Existing User Login Flow ---
            if (!user.isActive) {
                return res.status(403).json({ message: 'Account is inactive.' });
            }
            // Update user details if they've changed in their Google profile
            user.googleId = user.googleId || googleId; // Link account if they signed up with email/phone first
            user.email = user.email || normalizedEmail;
            user.profile.fullName = user.profile.fullName || name;
            user.profile.avatarUrl = user.profile.avatarUrl || avatarUrl;
            user.updatedAt = now;

            await usersDB.update(user.id, {
                googleId: user.googleId,
                email: user.email,
                profile: user.profile,
                updatedAt: user.updatedAt
            });
        } else {
            // --- New User Registration Flow ---
            isNewUser = true; // Set the flag to true
            if (!userTypeForNewUser || !['customer', 'expert', 'supplier'].includes(userTypeForNewUser)) {
                return res.status(400).json({
                    message:
                        "This Google account is not registered. Please provide a 'userTypeForNewUser' (customer, expert, or supplier) to create a new account."
                });
            }

            const profileData = {
                fullName: name,
                avatarUrl: avatarUrl,
                ...(profileForNewUser || {}) // Merge any additional profile data from frontend
            };

            const profileValidation = validateProfileData(profileData, userTypeForNewUser);
            if (!profileValidation.valid) {
                return res.status(400).json({ message: profileValidation.message });
            }

            const newUserId = crypto.randomUUID();
            user = {
                id: newUserId,
                email: normalizedEmail,
                googleId,
                userType: userTypeForNewUser,
                profile: profileValidation.validatedProfile,
                createdAt: now,
                updatedAt: now,
                isActive: true
            };
            await usersDB.create(user);
        }

        // --- Generate Token and Respond ---
        const token = generateToken({
            id: user.id,
            email: user.email || '',
            phoneNumber: user.phoneNumber || '',
            userType: user.userType
        });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...userToReturn } = user;
        res.status(200).json({
            user: userToReturn,
            token,
            isNewUser, // Include the flag in the response
            message: 'Google Sign-In successful.'
        });
    } catch (error: unknown) {
        console.error('Error during Google Sign-In:', error);
        if (error instanceof Error) {
            return res
                .status(500)
                .json({ message: 'Server error during Google Sign-In.', error: error.message });
        } else {
            return res
                .status(500)
                .json({ message: 'An unknown server error occurred during Google Sign-In.' });
        }
    }
});

// --- Firebase Token Exchange Endpoint ---
router.post(
    '/auth/firebase-token',
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const user = req.user as JwtPayload;

            if (!user || !user.id) {
                return res.status(401).json({ message: 'Invalid user authentication.' });
            }

            // Generate a Firebase custom token for the authenticated user
            const firebaseToken = await admin.auth().createCustomToken(user.id, {
                userType: user.userType,
                email: user.email || '',
                phoneNumber: user.phoneNumber || ''
            });

            res.status(200).json({ firebaseToken });
        } catch (error: unknown) {
            console.error('Firebase token generation error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred.';
            res.status(500).json({
                message: 'Failed to generate Firebase token.',
                error: errorMessage
            });
        }
    }
);

export default router;
