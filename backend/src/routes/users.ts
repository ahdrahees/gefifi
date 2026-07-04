import { Router, Request, Response } from 'express';
import { FirestoreCollection } from '../data';
import { User, UserProfile } from '../interfaces';
import { authenticateToken, AuthenticatedRequest, JwtPayload } from '../auth';
import { uploadUserAvatar } from '../file-storage';
import { validateProfileData } from './shared/validation';
import { avatarUpload } from './shared/middleware';

// Initialize databases
const usersDB = new FirestoreCollection<User>('users');

const router = Router();

// fix add authentication middleware
// router.use(authenticateToken);

// --- User List Endpoints ---
router.get('/users/experts', async (_req: Request, res: Response) => {
	try {
		const allUsers = await usersDB.getAll();
		const experts = allUsers
			.filter((user: User) => user.userType === 'expert' && user.isActive)
			.map((expert: User) => {
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { password, ...expertData } = expert;
				return expertData;
			});
		res.status(200).json(experts);
	} catch (error: unknown) {
		console.error('Error fetching experts:', error);
		const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
		res.status(500).json({ message: 'Failed to fetch experts.', error: errorMessage });
	}
});

// fix add authentication middleware
router.get('/users/suppliers', async (_req: Request, res: Response) => {
	try {
		const allUsers = await usersDB.getAll();
		const suppliers = allUsers
			.filter((user: User) => user.userType === 'supplier' && user.isActive)
			.map((supplier: User) => {
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { password, ...supplierData } = supplier;
				return supplierData;
			});
		res.status(200).json(suppliers);
	} catch (error: unknown) {
		console.error('Error fetching suppliers:', error);
		const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
		res.status(500).json({ message: 'Failed to fetch suppliers.', error: errorMessage });
	}
});

// fix add authentication middleware
// --- Get User by ID Endpoint ---
router.get('/users/:userId', async (req: Request, res: Response) => {
	try {
		const userId = req.params.userId;
		if (!userId) {
			return res.status(400).json({ message: 'User ID parameter is required.' });
		}
		const user = await usersDB.findById(userId);
		if (!user) {
			return res.status(404).json({ message: 'User not found.' });
		}
		if (!user.isActive) {
			// Depending on policy, you might still show inactive users or treat as not found
			return res.status(404).json({ message: 'User account is inactive.' });
		}
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { password, ...userToReturn } = user;
		res.status(200).json(userToReturn);
	} catch (error: unknown) {
		console.error(`Error fetching user ${req.params.userId}:`, error);
		const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
		res.status(500).json({ message: 'Failed to fetch user.', error: errorMessage });
	}
});

// --- Endpoint to Update User Profile After Registration ---
router.put(
	'/users/me/profile',
	authenticateToken,
	avatarUpload.single('avatar'),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user as JwtPayload;
			const { email, phoneNumber, ...otherProfileFields } = req.body;
			const avatarFile = req.file;

			// Fetch the latest user data to ensure we're not overwriting anything unintentionally
			const existingUser = await usersDB.findById(user.id);
			if (!existingUser) {
				return res.status(404).json({ message: 'User not found.' });
			}

			const allUsers = await usersDB.getAll();
			const PHONE_REGEX = /^\+[1-9]\d{1,14}$/;
			const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

			let updatedTopLevelFields: Partial<Omit<User, 'id'>> = {};

			// 1. Phone number validation and uniqueness check
			if (phoneNumber !== undefined && phoneNumber !== existingUser.phoneNumber) {
				if (phoneNumber !== '') {
					if (!PHONE_REGEX.test(phoneNumber)) {
						return res.status(400).json({ message: 'A valid E.164 phone number is required (e.g. +919999999999).' });
					}
					const isDuplicatePhone = allUsers.some(
						(u: User) => u.phoneNumber === phoneNumber && u.id !== existingUser.id
					);
					if (isDuplicatePhone) {
						return res.status(409).json({ message: 'This phone number is already linked to another account.' });
					}
					updatedTopLevelFields.phoneNumber = phoneNumber;
				} else {
					updatedTopLevelFields.phoneNumber = undefined;
				}
			}

			// 2. Email validation and uniqueness check
			if (email !== undefined && email.toLowerCase() !== (existingUser.email || '').toLowerCase()) {
				if (email !== '') {
					if (!EMAIL_REGEX.test(email)) {
						return res.status(400).json({ message: 'A valid email address is required.' });
					}
					const isDuplicateEmail = allUsers.some(
						(u: User) => u.email && u.email.toLowerCase() === email.toLowerCase() && u.id !== existingUser.id
					);
					if (isDuplicateEmail) {
						return res.status(409).json({ message: 'This email address is already linked to another account.' });
					}
					updatedTopLevelFields.email = email.toLowerCase();
				} else {
					updatedTopLevelFields.email = undefined;
				}
			}

			// Validate the provided profile data against the user's type
			const profileValidation = validateProfileData(otherProfileFields, user.userType);
			if (!profileValidation.valid) {
				return res
					.status(400)
					.json({ message: profileValidation.message || 'Invalid profile data.' });
			}

			// Start with existing profile data
			let updatedProfile = {
				...existingUser.profile,
				...profileValidation.validatedProfile
			};

			// Sync phoneNumber into profile for backward compatibility
			if (phoneNumber !== undefined) {
				if (phoneNumber !== '') {
					updatedProfile.phoneNumber = phoneNumber;
				} else {
					delete updatedProfile.phoneNumber;
				}
			}

			// Handle avatar upload if provided
			if (avatarFile) {
				try {
					const avatarResult = await uploadUserAvatar(avatarFile, user.id);
					updatedProfile.avatarUrl = avatarResult.filePath;
				} catch (avatarError) {
					console.error('Avatar upload failed:', avatarError);
					return res.status(400).json({
						message: 'Avatar upload failed. Please try again.',
						error:
							avatarError instanceof Error ? avatarError.message : 'Unknown avatar upload error'
					});
				}
			}

			const now = new Date().toISOString();
			const updates = {
				...updatedTopLevelFields,
				profile: updatedProfile,
				updatedAt: now
			};

			// Update the user in the database
			const updatedUser = await usersDB.update(user.id, updates);

			if (!updatedUser) {
				return res.status(500).json({ message: 'Failed to update user in database.' });
			}

			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { password, ...userToReturn } = updatedUser;

			res.status(200).json({
				message: 'Profile updated successfully.',
				user: userToReturn
			});
		} catch (error) {
			console.error('Error updating user profile:', error);
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
			res.status(500).json({ message: 'Failed to update profile.', error: errorMessage });
		}
	}
);

export default router;
