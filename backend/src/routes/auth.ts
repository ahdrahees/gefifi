import { Router, Request, Response } from 'express';
import { FirestoreCollection } from '../data';
import { User, UserProfile } from '../interfaces';
import {
    hashPassword,
    comparePassword,
    generateToken,
    authenticateToken,
    AuthenticatedRequest,
    JwtPayload
} from '../auth';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { uploadUserAvatar } from '../file-storage';
import admin from 'firebase-admin';
import { validateProfileData } from './shared/validation';
import { avatarUpload } from './shared/middleware';

// Initialize databases
const usersDB = new FirestoreCollection<User>('users');

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// --- Authentication Routes ---
router.post('/auth/register', async (req: Request, res: Response) => {
    try {
        const { email, password, userType, profile } = req.body;
        if (!email || !password || !userType) {
            return res.status(400).json({ message: 'Email, password, and userType are required.' });
        }
        if (typeof email !== 'string' || !email.includes('@')) {
            return res.status(400).json({ message: 'A valid email is required.' });
        }
        if (typeof password !== 'string' || password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
        }
        if (!['customer', 'expert', 'supplier'].includes(userType)) {
            return res
                .status(400)
                .json({ message: 'Invalid userType. Must be customer, expert, or supplier.' });
        }
        const profileValidation = validateProfileData(profile, userType);
        if (!profileValidation.valid) {
            return res
                .status(400)
                .json({ message: profileValidation.message || 'Invalid profile data.' });
        }
        const existingUsers = await usersDB.getAll();
        if (existingUsers.some((u: User) => u.email.toLowerCase() === email.toLowerCase())) {
            return res.status(409).json({
                message: 'User with this email already exists. Please login or use a different email.'
            });
        }
        const hashedPassword = await hashPassword(password);
        const userId = crypto.randomUUID();
        const now = new Date().toISOString();
        const newUser: User = {
            id: userId,
            email: email.toLowerCase(),
            password: hashedPassword,
            userType,
            profile: profileValidation.validatedProfile,
            createdAt: now,
            updatedAt: now,
            isActive: true
        };
        const createdUser = await usersDB.create(newUser);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...userToReturn } = createdUser;
        const token = generateToken({
            id: createdUser.id,
            email: createdUser.email,
            userType: createdUser.userType
        });
        res.status(201).json({ user: userToReturn, token, message: 'User registered successfully.' });
    } catch (error: unknown) {
        console.error('Registration error:', error);
        if (error instanceof Error) {
            if (error.message && error.message.includes('already exists')) {
                return res.status(409).json({ message: error.message });
            }
            res
                .status(500)
                .json({ message: 'Internal server error during registration.', error: error.message });
        } else {
            res.status(500).json({ message: 'An unknown error occurred during registration.' });
        }
    }
});

router.post('/auth/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }
        if (typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ message: 'Email and password must be strings.' });
        }
        const users = await usersDB.getAll();
        const user = users.find((u: User) => u.email.toLowerCase() === email.toLowerCase());
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials. User not found.' });
        }
        if (!user.isActive) {
            return res.status(403).json({ message: 'Account is inactive. Please contact support.' });
        }
        if (!user.password) {
            return res
                .status(401)
                .json({ message: 'Login with email/password not available. Try Google Sign-In.' });
        }
        const isPasswordMatch = await comparePassword(password, user.password);
        if (!isPasswordMatch) {
            return res.status(401).json({ message: 'Invalid credentials. Password incorrect.' });
        }
        const token = generateToken({ id: user.id, email: user.email, userType: user.userType });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...userToReturn } = user;
        res.status(200).json({ user: userToReturn, token, message: 'Login successful.' });
    } catch (error: unknown) {
        console.error('Login error:', error);
        if (error instanceof Error) {
            res
                .status(500)
                .json({ message: 'Internal server error during login.', error: error.message });
        } else {
            res.status(500).json({ message: 'An unknown error occurred during login.' });
        }
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

        const users = await usersDB.getAll();
        let user = users.find((u: User) => u.googleId === googleId || u.email.toLowerCase() === email);
        const now = new Date().toISOString();
        let isNewUser = false; // Flag to indicate if a new user was created

        if (user) {
            // --- Existing User Login Flow ---
            if (!user.isActive) {
                return res.status(403).json({ message: 'Account is inactive.' });
            }
            // Update user details if they've changed in their Google profile
            user.googleId = user.googleId || googleId; // Link account if they signed up with email first
            user.profile.fullName = user.profile.fullName || name;
            user.profile.avatarUrl = user.profile.avatarUrl || avatarUrl;
            user.updatedAt = now;

            await usersDB.update(user.id, {
                googleId: user.googleId,
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
                email: email.toLowerCase(),
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
        const token = generateToken({ id: user.id, email: user.email, userType: user.userType });
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
                email: user.email
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
