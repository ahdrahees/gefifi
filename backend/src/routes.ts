import { Router, Request, Response } from 'express';
import { FirestoreCollection } from './data';
import {
	User,
	UserProfile,
	WorkRequest,
	MaterialRequest,
	Project,
	Chat,
	Message,
	Contract,
	ContractComment,
	Attachment
} from './interfaces';
import {
	hashPassword,
	comparePassword,
	generateToken,
	authenticateToken,
	AuthenticatedRequest,
	JwtPayload
} from './auth';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { getSignedAudioUrl, uploadEntityAttachment, uploadUserAvatar } from './file-storage';
import admin from 'firebase-admin';
import multer from 'multer';

// Initialize databases
const usersDB = new FirestoreCollection<User>('users');
const workRequestsDB = new FirestoreCollection<WorkRequest>('workRequests');
const materialRequestsDB = new FirestoreCollection<MaterialRequest>('materialRequests');
const projectsDB = new FirestoreCollection<Project>('projects');
const chatsDB = new FirestoreCollection<Chat>('chats');

const contractsDB = new FirestoreCollection<Contract>('contracts');

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// --- Multer Configuration for Entity Attachments ---
const attachmentUpload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 25 * 1024 * 1024, // 25MB limit per file
		files: 20 // Maximum files per request (higher than individual entity limits for flexibility)
	},
	fileFilter: (req, file, cb) => {
		// Accept common construction-related file types
		const allowedTypes = [
			// Images
			'image/jpeg',
			'image/jpg',
			'image/png',
			'image/gif',
			'image/webp',
			// Documents
			'application/pdf',
			'application/msword',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'application/vnd.ms-excel',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			// CAD files (some browsers may not set MIME types correctly for these)
			'application/octet-stream' // For .dwg, .dxf files
		];

		if (
			allowedTypes.includes(file.mimetype) ||
			file.originalname.toLowerCase().endsWith('.dwg') ||
			file.originalname.toLowerCase().endsWith('.dxf')
		) {
			cb(null, true);
		} else {
			cb(
				new Error(
					`File type not allowed: ${file.mimetype}. Allowed types: images, PDF, Word, Excel, DWG, DXF.`
				)
			);
		}
	}
});

// --- Multer Configuration for Avatar Uploads ---
const avatarUpload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 2 * 1024 * 1024, // 2MB limit for avatars
		files: 1 // Only one avatar file per request
	},
	fileFilter: (req, file, cb) => {
		// Accept only image files for avatars
		const allowedImageTypes = [
			'image/jpeg',
			'image/jpg',
			'image/png',
			'image/gif',
			'image/webp',
			'image/svg+xml'
		];

		if (allowedImageTypes.includes(file.mimetype)) {
			cb(null, true);
		} else {
			cb(
				new Error(
					`File type not allowed: ${file.mimetype}. Only image files (JPG, PNG, GIF, WebP, SVG) are allowed for avatars.`
				)
			);
		}
	}
});

// --- Multer Configuration for Chat File Attachments ---
const chatFileUpload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 30 * 1024 * 1024, // 30MB limit per file for chat attachments
		files: 1 // Only one file per request for chat
	},
	fileFilter: (req, file, cb) => {
		// Accept common construction-related file types
		const allowedTypes = [
			// Images
			'image/jpeg',
			'image/jpg',
			'image/png',
			'image/gif',
			'image/webp',
			// Documents
			'application/pdf',
			'application/msword',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'application/vnd.ms-excel',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			// CAD files (some browsers may not set MIME types correctly for these)
			'application/octet-stream' // For .dwg, .dxf files
		];

		if (
			allowedTypes.includes(file.mimetype) ||
			file.originalname.toLowerCase().endsWith('.dwg') ||
			file.originalname.toLowerCase().endsWith('.dxf')
		) {
			cb(null, true);
		} else {
			cb(
				new Error(
					`File type not allowed: ${file.mimetype}. Allowed types: images, PDF, Word, Excel, DWG, DXF.`
				)
			);
		}
	}
});

// Entity configuration for file limits
const ENTITY_CONFIG = {
	'material-requests': { maxFiles: 10, collection: materialRequestsDB },
	contracts: { maxFiles: 15, collection: contractsDB },
	'work-requests': { maxFiles: 10, collection: workRequestsDB }
} as const;

// --- Helper: Validate User Profile based on UserType ---
const validateProfileData = (
	profile: Partial<UserProfile> | null | undefined,
	userType: User['userType']
): { valid: boolean; message?: string; validatedProfile: UserProfile } => {
	if (!profile || typeof profile !== 'object') {
		return { valid: true, validatedProfile: {} };
	}

	const validatedProfile: UserProfile = {};

	if (profile.fullName && typeof profile.fullName === 'string')
		validatedProfile.fullName = profile.fullName;
	if (profile.phoneNumber && typeof profile.phoneNumber === 'string')
		validatedProfile.phoneNumber = profile.phoneNumber;
	if (profile.location && typeof profile.location === 'string')
		validatedProfile.location = profile.location;
	if (profile.avatarUrl && typeof profile.avatarUrl === 'string')
		validatedProfile.avatarUrl = profile.avatarUrl;

	switch (userType) {
		case 'expert':
			if (profile.expertise && typeof profile.expertise === 'string')
				validatedProfile.expertise = profile.expertise;
			if (profile.experience && typeof profile.experience === 'string')
				validatedProfile.experience = profile.experience;
			break;
		case 'supplier':
			if (profile.companyName && typeof profile.companyName === 'string')
				validatedProfile.companyName = profile.companyName;
			if (profile.category && typeof profile.category === 'string')
				validatedProfile.category = profile.category;
			if (profile.experience && typeof profile.experience === 'string')
				validatedProfile.experience = profile.experience;
			break;
		case 'customer':
			break;
		default:
			return {
				valid: false,
				message: 'Invalid userType for profile validation.',
				validatedProfile
			};
	}
	return { valid: true, validatedProfile };
};

// --- Helper: Send System Message to a Chat ---
async function sendSystemMessage(
	participant1Id: string,
	participant2Id: string,
	messageContent: string,
	entityIds?: { contractId?: string; ExpertRequestId?: string; MaterialRequestId?: string }
) {
	try {
		const allChats = await chatsDB.getAll();
		const relevantChat = allChats.find(
			(chat: Chat) =>
				chat.participants.length === 2 &&
				chat.participants.includes(participant1Id) &&
				chat.participants.includes(participant2Id)
		);

		if (relevantChat) {
			const now = new Date().toISOString();
			const messageId = crypto.randomUUID();
			const notificationMessage: Message = {
				id: messageId,
				senderId: 'system',
				content: `[System] ${messageContent}`,
				timestamp: now,
				...entityIds // Spread the optional entity IDs
			};
			await chatsDB.createInSubcollection(relevantChat.id, 'messages', notificationMessage);
			await chatsDB.update(relevantChat.id, { updatedAt: now });
			console.log(`[System Message] Sent notification to chat ${relevantChat.id}`);
		} else {
			console.warn(
				`[System Message] Could not find a chat between ${participant1Id} and ${participant2Id} to send notification.`
			);
		}
	} catch (error) {
		console.error('[System Message] Failed to send chat notification:', error);
	}
}

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

// --- Work Request Endpoints ---
router.get('/work-requests', async (req: Request, res: Response) => {
	try {
		const { customerId } = req.query as { customerId?: string };
		let workRequests = await workRequestsDB.getAll();

		// If a customerId is provided, filter the work requests
		if (customerId) {
			workRequests = workRequests.filter(
				(request: WorkRequest) => request.customerId === customerId
			);
		}

		const sortedWorkRequests = workRequests.sort(
			(a: WorkRequest, b: WorkRequest) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
		);
		res.status(200).json(sortedWorkRequests);
	} catch (error: unknown) {
		console.error('Error fetching work requests:', error);
		const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
		res.status(500).json({ message: 'Failed to fetch work requests.', error: errorMessage });
	}
});

router.post(
	'/work-requests',
	authenticateToken,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user as JwtPayload;
			if (user.userType !== 'customer') {
				return res
					.status(403)
					.json({ message: 'Forbidden. Only customers can create work requests.' });
			}
			const {
				title,
				description,
				images,
				location,
				expectedCost,
				timeline,
				materialsSuggested,
				category
			} = req.body;
			if (!title || !description || !location) {
				return res.status(400).json({ message: 'Title, description, and location are required.' });
			}
			if (
				images &&
				(!Array.isArray(images) || !images.every((img: string) => typeof img === 'string'))
			) {
				return res
					.status(400)
					.json({ message: 'Images must be an array of strings (file paths).' });
			}
			if (expectedCost !== undefined && typeof expectedCost !== 'number') {
				return res.status(400).json({ message: 'Expected cost must be a number if provided.' });
			}
			const now = new Date().toISOString();
			const workRequestId = crypto.randomUUID();
			const newWorkRequest: WorkRequest = {
				id: workRequestId,
				customerId: user.id,
				title,
				description,
				images: images || [],
				location,
				expectedCost: expectedCost,
				timeline: timeline || 'Not specified',
				materialsSuggested: materialsSuggested || '',
				status: 'open',
				createdAt: now,
				updatedAt: now,
				category: category || 'General',
				interestedExperts: [],
				interestedSuppliers: []
			};
			const createdWorkRequest = await workRequestsDB.create(newWorkRequest);
			res.status(201).json(createdWorkRequest);
		} catch (error: unknown) {
			console.error('Error creating work request:', error);
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
			if (errorMessage.includes('already exists')) {
				return res.status(409).json({ message: errorMessage });
			}
			res.status(500).json({ message: 'Failed to create work request.', error: errorMessage });
		}
	}
);

router.get('/work-requests/:id', async (req: Request, res: Response) => {
	try {
		const workRequestId = req.params.id;
		if (!workRequestId) {
			return res.status(400).json({ message: 'Work request ID parameter is required.' });
		}
		const workRequest = await workRequestsDB.findById(workRequestId);
		if (!workRequest) {
			return res.status(404).json({ message: 'Work request not found.' });
		}
		res.status(200).json(workRequest);
	} catch (error: unknown) {
		console.error(`Error fetching work request ${req.params.id}:`, error);
		const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
		res.status(500).json({ message: 'Failed to fetch work request.', error: errorMessage });
	}
});

// PUT /api/work-requests/:id - Update work request
router.put(
	'/work-requests/:id',
	authenticateToken,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user as JwtPayload;
			const workRequestId = req.params.id;
			const updateData = req.body;

			if (!workRequestId) {
				return res.status(400).json({ message: 'Work request ID parameter is required.' });
			}

			const workRequest = await workRequestsDB.findById(workRequestId);
			if (!workRequest) {
				return res.status(404).json({ message: 'Work request not found.' });
			}

			// Check permissions - only customer can update and only if status is 'open'
			if (user.id !== workRequest.customerId) {
				return res
					.status(403)
					.json({ message: 'You do not have permission to update this work request.' });
			}

			if (workRequest.status !== 'open') {
				return res.status(400).json({ message: 'Only open work requests can be edited.' });
			}

			// Validate and sanitize update data
			const allowedFields = [
				'title',
				'description',
				'location',
				'category',
				'expectedCost',
				'timeline',
				'materialsSuggested',
				'images'
			];
			const sanitizedData: any = {};

			for (const field of allowedFields) {
				if (updateData[field] !== undefined) {
					sanitizedData[field] = updateData[field];
				}
			}

			// Add updatedAt timestamp
			sanitizedData.updatedAt = new Date().toISOString();

			const updatedWorkRequest = await workRequestsDB.update(workRequestId, sanitizedData);

			if (!updatedWorkRequest) {
				return res.status(500).json({ message: 'Failed to update work request.' });
			}

			res.status(200).json(updatedWorkRequest);
		} catch (error: unknown) {
			console.error('Error updating work request:', error);
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
			res.status(500).json({ message: 'Failed to update work request.', error: errorMessage });
		}
	}
);

// PUT /api/work-requests/:id/status - Update work request status
router.put(
	'/work-requests/:id/status',
	authenticateToken,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user as JwtPayload;
			const workRequestId = req.params.id;
			const { status } = req.body;

			if (!workRequestId) {
				return res.status(400).json({ message: 'Work request ID parameter is required.' });
			}

			if (!status) {
				return res.status(400).json({ message: 'Status is required.' });
			}

			const workRequest = await workRequestsDB.findById(workRequestId);
			if (!workRequest) {
				return res.status(404).json({ message: 'Work request not found.' });
			}

			// Check permissions - only customer or associated expert can update status
			const isCustomer = user.id === workRequest.customerId;
			const isAssociatedExpert =
				workRequest.interestedExperts?.includes(user.id) ||
				workRequest.invitedExperts?.includes(user.id);

			if (!isCustomer && !isAssociatedExpert) {
				return res
					.status(403)
					.json({ message: 'You do not have permission to update this work request.' });
			}

			// Validate status transitions based on user role
			const validStatuses = [
				'open',
				'in_discussion',
				'awaiting_quotes',
				'contracted',
				'in_progress',
				'completed',
				'cancelled',
				'disputed'
			];
			if (!validStatuses.includes(status)) {
				return res.status(400).json({ message: 'Invalid status value.' });
			}

			const now = new Date().toISOString();
			const updatedWorkRequest = await workRequestsDB.update(workRequestId, {
				status,
				updatedAt: now
			});

			if (!updatedWorkRequest) {
				return res.status(500).json({ message: 'Failed to update work request status.' });
			}

			// Send system message to related chats
			if (isCustomer) {
				// Notify interested experts
				const interestedUsers = [
					...(workRequest.interestedExperts || []),
					...(workRequest.invitedExperts || [])
				];
				for (const expertId of interestedUsers) {
					await sendSystemMessage(
						user.id,
						expertId,
						`Work request "${workRequest.title}" status updated to: ${status}`,
						{ ExpertRequestId: workRequest.id }
					);
				}
			} else if (isAssociatedExpert) {
				// Notify customer
				await sendSystemMessage(
					user.id,
					workRequest.customerId,
					`Work request "${workRequest.title}" status updated to: ${status}`,
					{ ExpertRequestId: workRequest.id }
				);
			}

			res.status(200).json(updatedWorkRequest);
		} catch (error: unknown) {
			console.error('Error updating work request status:', error);
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
			res
				.status(500)
				.json({ message: 'Failed to update work request status.', error: errorMessage });
		}
	}
);

// --- Material Request Endpoints ---

// GET all material requests
router.get('/material-requests', async (req: Request, res: Response) => {
	try {
		const { customerId } = req.query as { customerId?: string };
		let materialRequests = await materialRequestsDB.getAll();

		if (customerId) {
			materialRequests = materialRequests.filter(
				(request: MaterialRequest) => request.customerId === customerId
			);
		}

		const sortedMaterialRequests = materialRequests.sort(
			(a: MaterialRequest, b: MaterialRequest) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
		);
		res.status(200).json(sortedMaterialRequests);
	} catch (error: unknown) {
		console.error('Error fetching material requests:', error);
		const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
		res.status(500).json({ message: 'Failed to fetch material requests.', error: errorMessage });
	}
});

// POST a new material request
router.post(
	'/material-requests',
	authenticateToken,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user as JwtPayload;
			if (user.userType !== 'customer') {
				return res
					.status(403)
					.json({ message: 'Forbidden. Only customers can create material requests.' });
			}

			const { title, description, deliveryLocation, deliveryDate, linkedWorkRequestId, items } =
				req.body;

			if (
				!title ||
				!description ||
				!deliveryLocation ||
				!items ||
				!Array.isArray(items) ||
				items.length === 0
			) {
				return res.status(400).json({
					message: 'Title, description, delivery location, and at least one item are required.'
				});
			}

			// Basic validation for items array
			for (const item of items) {
				if (!item.itemName || !item.quantity) {
					return res
						.status(400)
						.json({ message: 'Each item must have an itemName and a quantity.' });
				}
			}

			const now = new Date().toISOString();
			const materialRequestId = crypto.randomUUID();

			// Construct material request object, only including defined values (Firestore-safe)
			const newMaterialRequest: any = {
				id: materialRequestId,
				customerId: user.id,
				title,
				description,
				deliveryLocation,
				items,
				status: 'open',
				createdAt: now,
				updatedAt: now,
				interestedSuppliers: []
			};

			// Only include optional fields if they have values
			if (deliveryDate) {
				newMaterialRequest.deliveryDate = deliveryDate;
			}
			if (linkedWorkRequestId) {
				newMaterialRequest.linkedWorkRequestId = linkedWorkRequestId;
			}

			const createdMaterialRequest = await materialRequestsDB.create(newMaterialRequest);
			res.status(201).json(createdMaterialRequest);
		} catch (error: unknown) {
			console.error('Error creating material request:', error);
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
			res.status(500).json({ message: 'Failed to create material request.', error: errorMessage });
		}
	}
);

// GET a single material request by ID
router.get('/material-requests/:id', async (req: Request, res: Response) => {
	try {
		const materialRequestId = req.params.id;
		if (!materialRequestId) {
			return res.status(400).json({ message: 'Material request ID parameter is required.' });
		}
		const materialRequest = await materialRequestsDB.findById(materialRequestId);
		if (!materialRequest) {
			return res.status(404).json({ message: 'Material request not found.' });
		}
		res.status(200).json(materialRequest);
	} catch (error: unknown) {
		console.error(`Error fetching material request ${req.params.id}:`, error);
		const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
		res.status(500).json({ message: 'Failed to fetch material request.', error: errorMessage });
	}
});

// PUT /api/material-requests/:id - Update material request
router.put(
	'/material-requests/:id',
	authenticateToken,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user as JwtPayload;
			const materialRequestId = req.params.id;
			const updateData = req.body;

			if (!materialRequestId) {
				return res.status(400).json({ message: 'Material request ID parameter is required.' });
			}

			const materialRequest = await materialRequestsDB.findById(materialRequestId);
			if (!materialRequest) {
				return res.status(404).json({ message: 'Material request not found.' });
			}

			// Check permissions - only customer can update and only if status is 'open'
			if (user.id !== materialRequest.customerId) {
				return res
					.status(403)
					.json({ message: 'You do not have permission to update this material request.' });
			}

			if (materialRequest.status !== 'open') {
				return res.status(400).json({ message: 'Only open material requests can be edited.' });
			}

			// Validate and sanitize update data
			const allowedFields = [
				'title',
				'description',
				'deliveryLocation',
				'deliveryDate',
				'linkedWorkRequestId',
				'items',
				'attachments'
			];
			const sanitizedData: any = {};

			for (const field of allowedFields) {
				if (updateData[field] !== undefined) {
					sanitizedData[field] = updateData[field];
				}
			}

			// Add updatedAt timestamp
			sanitizedData.updatedAt = new Date().toISOString();

			const updatedMaterialRequest = await materialRequestsDB.update(
				materialRequestId,
				sanitizedData
			);

			if (!updatedMaterialRequest) {
				return res.status(500).json({ message: 'Failed to update material request.' });
			}

			res.status(200).json(updatedMaterialRequest);
		} catch (error: unknown) {
			console.error('Error updating material request:', error);
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
			res.status(500).json({ message: 'Failed to update material request.', error: errorMessage });
		}
	}
);

// PUT /api/material-requests/:id/status - Update material request status
router.put(
	'/material-requests/:id/status',
	authenticateToken,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user as JwtPayload;
			const materialRequestId = req.params.id;
			const { status } = req.body;

			if (!materialRequestId) {
				return res.status(400).json({ message: 'Material request ID parameter is required.' });
			}

			if (!status) {
				return res.status(400).json({ message: 'Status is required.' });
			}

			const materialRequest = await materialRequestsDB.findById(materialRequestId);
			if (!materialRequest) {
				return res.status(404).json({ message: 'Material request not found.' });
			}

			// Check permissions - only customer or associated supplier can update status
			const isCustomer = user.id === materialRequest.customerId;
			const isAssociatedSupplier =
				materialRequest.interestedSuppliers?.includes(user.id) ||
				materialRequest.invitedSuppliers?.includes(user.id);

			if (!isCustomer && !isAssociatedSupplier) {
				return res
					.status(403)
					.json({ message: 'You do not have permission to update this material request.' });
			}

			// Validate status transitions based on user role
			const validStatuses = ['open', 'quoting', 'ordered', 'contracted', 'completed', 'cancelled'];
			if (!validStatuses.includes(status)) {
				return res.status(400).json({ message: 'Invalid status value.' });
			}

			const now = new Date().toISOString();
			const updatedMaterialRequest = await materialRequestsDB.update(materialRequestId, {
				status,
				updatedAt: now
			});

			if (!updatedMaterialRequest) {
				return res.status(500).json({ message: 'Failed to update material request status.' });
			}

			// Send system message to related chats
			if (isCustomer) {
				// Notify interested suppliers
				const interestedUsers = [
					...(materialRequest.interestedSuppliers || []),
					...(materialRequest.invitedSuppliers || [])
				];
				for (const supplierId of interestedUsers) {
					await sendSystemMessage(
						user.id,
						supplierId,
						`Material request "${materialRequest.title}" status updated to: ${status}`,
						{ MaterialRequestId: materialRequest.id }
					);
				}
			} else if (isAssociatedSupplier) {
				// Notify customer
				await sendSystemMessage(
					user.id,
					materialRequest.customerId,
					`Material request "${materialRequest.title}" status updated to: ${status}`,
					{ MaterialRequestId: materialRequest.id }
				);
			}

			res.status(200).json(updatedMaterialRequest);
		} catch (error: unknown) {
			console.error('Error updating material request status:', error);
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
			res
				.status(500)
				.json({ message: 'Failed to update material request status.', error: errorMessage });
		}
	}
);

// --- Generic Entity Attachment Endpoint ---
router.post(
	'/attachments/:entityType/:entityId',
	authenticateToken,
	attachmentUpload.array('files', 20),
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user as JwtPayload;
			const { entityType, entityId } = req.params;
			const files = req.files as Express.Multer.File[];

			// Validate entity type
			if (!ENTITY_CONFIG[entityType as keyof typeof ENTITY_CONFIG]) {
				return res.status(400).json({
					message: `Invalid entity type: ${entityType}. Supported types: ${Object.keys(ENTITY_CONFIG).join(', ')}`
				});
			}

			const config = ENTITY_CONFIG[entityType as keyof typeof ENTITY_CONFIG];

			// Validate files were uploaded
			if (!files || files.length === 0) {
				return res
					.status(400)
					.json({ message: 'No files uploaded. Please select files to attach.' });
			}

			// Validate file count
			if (files.length > config.maxFiles) {
				return res.status(400).json({
					message: `Too many files. Maximum ${config.maxFiles} files allowed for ${entityType}.`
				});
			}

			// Validate entity exists and user has permission
			const entity = await config.collection.findById(entityId);
			if (!entity) {
				return res.status(404).json({ message: `${entityType.slice(0, -1)} not found.` });
			}

			// Check user permission and get current attachments (entity-type specific)
			let hasPermission = false;
			let currentAttachments: any[] = [];

			if (entityType === 'material-requests') {
				const materialRequest = entity as MaterialRequest;
				hasPermission = materialRequest.customerId === user.id;
				currentAttachments = materialRequest.attachments || [];
			} else if (entityType === 'work-requests') {
				const workRequest = entity as WorkRequest;
				hasPermission = workRequest.customerId === user.id;
				// Work requests don't have attachments yet, but we'll prepare for future support
				currentAttachments = [];
			} else if (entityType === 'contracts') {
				const contract = entity as Contract;
				hasPermission = contract.customerId === user.id || contract.expertSupplierId === user.id;
				// Contracts don't have attachments yet, but we'll prepare for future support
				currentAttachments = [];
			}

			if (!hasPermission) {
				return res.status(403).json({
					message: `Forbidden. You don't have permission to add attachments to this ${entityType.slice(0, -1)}.`
				});
			}

			// Upload files to GCS
			const uploadPromises = files.map((file) =>
				uploadEntityAttachment(file, entityType, entityId)
			);
			const uploadResults = await Promise.all(uploadPromises);

			// Create attachment objects (Firestore-safe, no undefined values)
			const newAttachments = uploadResults.map((result, index) => {
				const file = files[index];
				const attachment: any = {
					fileName: file.originalname,
					filePath: result.filePath,
					fileType: file.mimetype,
					size: file.size
				};
				return attachment;
			});

			// Get updated attachments list
			const updatedAttachments = [...currentAttachments, ...newAttachments];

			// Update entity with new attachments
			const updateData: any = {
				attachments: updatedAttachments,
				updatedAt: new Date().toISOString()
			};

			await config.collection.update(entityId, updateData);

			res.status(200).json({
				message: `${files.length} attachment(s) uploaded successfully!`,
				attachments: newAttachments,
				totalAttachments: updatedAttachments.length
			});
		} catch (error: unknown) {
			console.error('Error uploading entity attachments:', error);
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';

			// Handle multer errors
			if (errorMessage.includes('File type not allowed')) {
				return res.status(400).json({ message: errorMessage });
			}
			if (errorMessage.includes('File too large')) {
				return res.status(400).json({ message: 'File too large. Maximum file size is 25MB.' });
			}

			res.status(500).json({ message: 'Failed to upload attachments.', error: errorMessage });
		}
	}
);

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
			const profileData: Partial<UserProfile> = req.body;
			const avatarFile = req.file;

			// Fetch the latest user data to ensure we're not overwriting anything unintentionally
			const existingUser = await usersDB.findById(user.id);
			if (!existingUser) {
				return res.status(404).json({ message: 'User not found.' });
			}

			// Validate the provided profile data against the user's type
			const profileValidation = validateProfileData(profileData, user.userType);
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

// --- User Interest Endpoint (Creates Chat & Initial Message) ---
router.post(
	'/users/interest',
	authenticateToken,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const sender = req.user as JwtPayload;
			const {
				targetUserId,
				workRequestId,
				materialRequestId,
				predefinedMessageKey,
				initialMessageContent: customMessageFromBody
			} = req.body;

			if (!targetUserId) {
				return res.status(400).json({ message: 'targetUserId is required.' });
			}
			const targetUser = await usersDB.findById(targetUserId);
			if (!targetUser || !targetUser.isActive) {
				return res.status(404).json({ message: 'Target user not found or is inactive.' });
			}
			if (sender.id === targetUserId) {
				return res.status(400).json({ message: 'Cannot express interest in oneself.' });
			}

			let workRequest: WorkRequest | undefined;
			if (workRequestId) {
				workRequest = await workRequestsDB.findById(workRequestId);
				if (!workRequest) {
					return res.status(404).json({ message: 'Associated work request not found.' });
				}
			}

			let materialRequest: MaterialRequest | undefined;
			if (materialRequestId) {
				materialRequest = await materialRequestsDB.findById(materialRequestId);
				if (!materialRequest) {
					return res.status(404).json({ message: 'Associated material request not found.' });
				}
				// Check if the sender has already expressed interest
				if (
					sender.userType === 'supplier' &&
					materialRequest.interestedSuppliers?.includes(sender.id)
				) {
					return res
						.status(409) // 409 Conflict is a good status code for this
						.json({ message: 'You have already expressed interest in this material request.' });
				}
			}

			let finalMessageContent: string;

			if (
				customMessageFromBody &&
				typeof customMessageFromBody === 'string' &&
				customMessageFromBody.trim() !== ''
			) {
				finalMessageContent = customMessageFromBody.trim();
			} else if (predefinedMessageKey && typeof predefinedMessageKey === 'string') {
				if (predefinedMessageKey === 'CUSTOMER_INTEREST_IN_PROVIDER') {
					// Ensure targetUser is defined before accessing profile
					const targetName =
						targetUser?.profile?.fullName || targetUser?.email.split('@')[0] || 'User';
					finalMessageContent = `Hi ${targetName}, I'm interested in your services.`;
				} else if (predefinedMessageKey === 'PROVIDER_INTEREST_IN_WORK_REQUEST') {
					if (!workRequest) {
						return res.status(400).json({
							message:
								'workRequestId is required when using the PROVIDER_INTEREST_IN_WORK_REQUEST key.'
						});
					}
					finalMessageContent = `Hi, I saw your work request "${workRequest.title}" and I'm interested in discussing it further.`;
				} else if (predefinedMessageKey === 'SUPPLIER_INTEREST_IN_MATERIAL_REQUEST') {
					if (!materialRequest) {
						return res.status(400).json({
							message:
								'materialRequestId is required when using the SUPPLIER_INTEREST_IN_MATERIAL_REQUEST key.'
						});
					}
					finalMessageContent = `Hello, I've reviewed your request for materials titled "${materialRequest.title}" and I'm interested in providing a quote.`;
				} else {
					// If predefinedMessageKey is provided but not recognized
					return res.status(400).json({
						message: `Unknown or inapplicable predefinedMessageKey: ${predefinedMessageKey}`
					});
				}
			} else {
				// If neither custom message nor a valid predefined key is provided
				return res.status(400).json({
					message:
						'Either initialMessageContent or a valid predefinedMessageKey is required to initiate interest.'
				});
			}

			const allChats = await chatsDB.getAll();
			let existingChat = allChats.find(
				(chat: Chat) =>
					chat.participants.includes(sender.id) &&
					chat.participants.includes(targetUserId) &&
					(!workRequestId || chat.workRequestId === workRequestId) &&
					(!materialRequestId || chat.materialRequestId === materialRequestId)
			);

			const now = new Date().toISOString();

			if (!existingChat) {
				const chatId = crypto.randomUUID();
				const newChat: Partial<Chat> = {
					id: chatId,
					participants: [sender.id, targetUserId].sort(),
					createdAt: now,
					updatedAt: now
				};

				if (workRequestId) newChat.workRequestId = workRequestId;
				if (materialRequestId) newChat.materialRequestId = materialRequestId;

				existingChat = await chatsDB.create(newChat as Chat);
			}

			if (existingChat && sender && targetUser) {
				const messageId = crypto.randomUUID();
				const newMessage: Message = {
					id: messageId,
					senderId: sender.id,
					content: finalMessageContent,
					timestamp: now,
					// Add entity reference IDs for clickable messages
					...(workRequestId && { ExpertRequestId: workRequestId }),
					...(materialRequestId && { MaterialRequestId: materialRequestId })
				};
				await chatsDB.createInSubcollection(existingChat.id, 'messages', newMessage);
				existingChat.updatedAt = now;
				await chatsDB.update(existingChat.id, { updatedAt: now });
			}

			if (workRequest) {
				if (sender.userType === 'expert') {
					const wrExperts = workRequest.interestedExperts || [];
					if (!wrExperts.includes(sender.id)) {
						await workRequestsDB.update(workRequest.id, {
							interestedExperts: [...wrExperts, sender.id]
						});
					}
				} else if (sender.userType === 'supplier') {
					const wrSuppliers = workRequest.interestedSuppliers || [];
					if (!wrSuppliers.includes(sender.id)) {
						await workRequestsDB.update(workRequest.id, {
							interestedSuppliers: [...wrSuppliers, sender.id]
						});
					}
				}
			}

			if (materialRequest) {
				if (sender.userType === 'supplier') {
					const mrSuppliers = materialRequest.interestedSuppliers || [];
					if (!mrSuppliers.includes(sender.id)) {
						await materialRequestsDB.update(materialRequest.id, {
							interestedSuppliers: [...mrSuppliers, sender.id]
						});
					}
				}
			}

			res.status(201).json({
				message: 'Interest expressed successfully. Chat initiated/updated.',
				chatId: existingChat.id,
				initialMessage: existingChat ? 'Message sent successfully' : 'Chat created successfully'
			});
		} catch (error: unknown) {
			console.error('Error expressing interest:', error);
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
			res.status(500).json({ message: 'Failed to express interest.', error: errorMessage });
		}
	}
);

// --- Invitation Endpoints ---

// Invite users to a work request
router.post(
	'/work-requests/:id/invite',
	authenticateToken,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user as JwtPayload;
			const { id: workRequestId } = req.params;
			const { userIds, userType } = req.body;

			// Validate input
			if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
				return res
					.status(400)
					.json({ message: 'userIds array is required and must not be empty.' });
			}
			if (!userType || !['expert', 'supplier'].includes(userType)) {
				return res.status(400).json({ message: 'userType must be either "expert" or "supplier".' });
			}

			// Get the work request
			const workRequest = await workRequestsDB.findById(workRequestId);
			if (!workRequest) {
				return res.status(404).json({ message: 'Work request not found.' });
			}

			// Only the customer who owns the request can invite users
			if (workRequest.customerId !== user.id) {
				return res
					.status(403)
					.json({ message: 'Only the customer who created this request can invite users.' });
			}

			// Validate that the work request is in a valid status for invitations
			if (!['open', 'in_discussion', 'awaiting_quotes'].includes(workRequest.status)) {
				return res.status(400).json({
					message: `Cannot invite users to a work request with status: ${workRequest.status}`
				});
			}

			// Validate all user IDs exist and are of the correct type
			const validatedUsers = [];
			for (const userId of userIds) {
				const targetUser = await usersDB.findById(userId);
				if (!targetUser || !targetUser.isActive) {
					return res.status(404).json({ message: `User with ID ${userId} not found or inactive.` });
				}
				if (targetUser.userType !== userType) {
					return res.status(400).json({
						message: `User ${userId} is not a ${userType}. Cannot invite to work request.`
					});
				}
				validatedUsers.push(targetUser);
			}

			// Update the work request with invited users
			const updateField = userType === 'expert' ? 'invitedExperts' : 'invitedSuppliers';
			const currentInvited = workRequest[updateField] || [];
			const newInvited = [...new Set([...currentInvited, ...userIds])]; // Remove duplicates

			await workRequestsDB.update(workRequestId, {
				[updateField]: newInvited,
				updatedAt: new Date().toISOString()
			});

			res.status(200).json({
				message: `Successfully invited ${userIds.length} ${userType}(s) to the work request.`,
				invitedUsers: validatedUsers.map((u) => ({
					id: u.id,
					name: u.profile?.fullName || u.profile?.companyName
				}))
			});
		} catch (error: unknown) {
			console.error('Error inviting users to work request:', error);
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
			res.status(500).json({ message: 'Failed to invite users.', error: errorMessage });
		}
	}
);

// Invite users to a material request
router.post(
	'/material-requests/:id/invite',
	authenticateToken,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user as JwtPayload;
			const { id: materialRequestId } = req.params;
			const { userIds } = req.body;

			// Validate input
			if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
				return res
					.status(400)
					.json({ message: 'userIds array is required and must not be empty.' });
			}

			// Get the material request
			const materialRequest = await materialRequestsDB.findById(materialRequestId);
			if (!materialRequest) {
				return res.status(404).json({ message: 'Material request not found.' });
			}

			// Only the customer who owns the request can invite users
			if (materialRequest.customerId !== user.id) {
				return res
					.status(403)
					.json({ message: 'Only the customer who created this request can invite users.' });
			}

			// Validate that the material request is in a valid status for invitations
			if (!['open', 'quoting'].includes(materialRequest.status)) {
				return res.status(400).json({
					message: `Cannot invite users to a material request with status: ${materialRequest.status}`
				});
			}

			// Validate all user IDs exist and are suppliers
			const validatedUsers = [];
			for (const userId of userIds) {
				const targetUser = await usersDB.findById(userId);
				if (!targetUser || !targetUser.isActive) {
					return res.status(404).json({ message: `User with ID ${userId} not found or inactive.` });
				}
				if (targetUser.userType !== 'supplier') {
					return res.status(400).json({
						message: `User ${userId} is not a supplier. Cannot invite to material request.`
					});
				}
				validatedUsers.push(targetUser);
			}

			// Update the material request with invited users
			const currentInvited = materialRequest.invitedSuppliers || [];
			const newInvited = [...new Set([...currentInvited, ...userIds])]; // Remove duplicates

			await materialRequestsDB.update(materialRequestId, {
				invitedSuppliers: newInvited,
				updatedAt: new Date().toISOString()
			});

			res.status(200).json({
				message: `Successfully invited ${userIds.length} supplier(s) to the material request.`,
				invitedUsers: validatedUsers.map((u) => ({
					id: u.id,
					name: u.profile?.fullName || u.profile?.companyName
				}))
			});
		} catch (error: unknown) {
			console.error('Error inviting users to material request:', error);
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
			res.status(500).json({ message: 'Failed to invite users.', error: errorMessage });
		}
	}
);

// --- Chat Endpoints ---
router.get('/chat', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
	try {
		const user = req.user as JwtPayload;
		const allChats = await chatsDB.getAll();
		const userChats = allChats.filter((chat: Chat) => chat.participants.includes(user.id));

		// Enrich each chat with its last message
		const enrichedChats = await Promise.all(
			userChats.map(async (chat) => {
				const messages = await chatsDB.getAllFromSubcollection<Message>(chat.id, 'messages');

				let lastMessage = null;
				if (messages.length > 0) {
					// Sort messages by timestamp descending to find the most recent one
					messages.sort(
						(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
					);
					const latestMessage = messages[0];
					lastMessage = {
						id: latestMessage.id,
						content: latestMessage.content,
						timestamp: latestMessage.timestamp,
						senderId: latestMessage.senderId
					};
				}

				return {
					...chat,
					lastMessage: lastMessage
				};
			})
		);

		enrichedChats.sort(
			(a: any, b: any) =>
				new Date(b.updatedAt || b.createdAt).getTime() -
				new Date(a.updatedAt || a.createdAt).getTime()
		);

		res.status(200).json(enrichedChats);
	} catch (error: unknown) {
		console.error('Error fetching user chats:', error);
		const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
		res.status(500).json({ message: 'Failed to fetch chats.', error: errorMessage });
	}
});

router.post('/chat', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
	try {
		const user = req.user as JwtPayload;
		const { participantIds, workRequestId, initialMessageContent } = req.body;

		if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
			return res
				.status(400)
				.json({ message: 'Participant IDs array is required and must not be empty.' });
		}
		const allParticipantIds = [...new Set([user.id, ...participantIds])].sort();
		if (allParticipantIds.length < 2) {
			return res.status(400).json({ message: 'A chat requires at least two unique participants.' });
		}
		for (const pId of allParticipantIds) {
			const participantUser = await usersDB.findById(pId);
			if (!participantUser || !participantUser.isActive) {
				return res
					.status(404)
					.json({ message: `Participant with ID ${pId} not found or is inactive.` });
			}
		}
		const allChats = await chatsDB.getAll();
		const existingChat = allChats.find(
			(c: Chat) =>
				c.participants.length === allParticipantIds.length &&
				c.participants.every((p: string) => allParticipantIds.includes(p)) &&
				c.workRequestId === workRequestId
		);
		if (existingChat) {
			return res.status(200).json({
				message: 'Chat with these participants (and work request, if specified) already exists.',
				chat: existingChat
			});
		}
		const now = new Date().toISOString();
		const chatId = crypto.randomUUID();
		const newChatData: Chat = {
			id: chatId,
			participants: allParticipantIds,
			workRequestId: workRequestId,
			createdAt: now,
			updatedAt: now
		};
		const createdChat = await chatsDB.create(newChatData);
		if (
			initialMessageContent &&
			typeof initialMessageContent === 'string' &&
			initialMessageContent.trim() !== ''
		) {
			const messageId = crypto.randomUUID();
			const initialMessage: Message = {
				id: messageId,
				senderId: user.id,
				content: initialMessageContent,
				timestamp: now
			};
			await chatsDB.createInSubcollection(createdChat.id, 'messages', initialMessage);
		}
		res.status(201).json(createdChat);
	} catch (error: unknown) {
		console.error('Error creating chat:', error);
		const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
		res.status(500).json({ message: 'Failed to create chat.', error: errorMessage });
	}
});

// --- GET Chat by ID ---
router.get('/chat/:chatId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
	try {
		const user = req.user as JwtPayload;
		const chatId = req.params.chatId;

		const chat = await chatsDB.findById(chatId);

		if (!chat) {
			return res.status(404).json({ message: 'Chat not found.' });
		}

		if (!chat.participants.includes(user.id)) {
			return res
				.status(403)
				.json({ message: 'Forbidden. You are not a participant of this chat.' });
		}

		res.status(200).json(chat);
	} catch (error: unknown) {
		console.error(`Error fetching chat ${req.params.chatId}:`, error);
		const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
		res.status(500).json({ message: 'Failed to fetch chat details.', error: errorMessage });
	}
});

router.post(
	'/chat/:chatId/messages',
	authenticateToken,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user as JwtPayload;
			const chatId = req.params.chatId;
			// Destructure content, images, attachments, and voice message data from request body
			const {
				content,
				images,
				attachments,
				audioType,
				audioUrl,
				audioDuration,
				messageId
			}: {
				content?: string;
				images?: string[];
				attachments?: Array<{
					fileName: string;
					filePath: string;
					fileType: string;
					size: number;
				}>;
				audioType?: 'voice';
				audioUrl?: string;
				audioDuration?: number;
				messageId?: string;
			} = req.body;

			// Validate that either content, images, attachments, or voice message are provided and correctly formatted
			const hasValidContent = content && typeof content === 'string' && content.trim() !== '';
			const hasValidImages =
				images &&
				Array.isArray(images) &&
				images.length > 0 &&
				images.every((img: string) => typeof img === 'string');
			const hasValidAttachments =
				attachments &&
				Array.isArray(attachments) &&
				attachments.length > 0 &&
				attachments.every((att: any) =>
					att &&
					typeof att.fileName === 'string' &&
					typeof att.filePath === 'string' &&
					typeof att.fileType === 'string' &&
					typeof att.size === 'number'
				);
			const hasValidVoiceMessage =
				audioType === 'voice' &&
				audioUrl &&
				typeof audioUrl === 'string' &&
				audioUrl.trim() !== '' &&
				audioDuration &&
				typeof audioDuration === 'number' &&
				audioDuration > 0;

			if (!hasValidContent && !hasValidImages && !hasValidAttachments && !hasValidVoiceMessage) {
				return res
					.status(400)
					.json({ message: 'Message content, images, attachments, or voice message are required.' });
			}
			// If images are provided, but not in the correct format (e.g. not an array of strings)
			if (images && Array.isArray(images) && images.length > 0 && !hasValidImages) {
				return res.status(400).json({
					message:
						'Images must be an array of strings (file paths) and cannot be empty strings if the array is not empty.'
				});
			}
			// If attachments are provided, but not in the correct format
			if (attachments && Array.isArray(attachments) && attachments.length > 0 && !hasValidAttachments) {
				return res.status(400).json({
					message:
						'Attachments must be an array of objects with fileName, filePath, fileType, and size properties.'
				});
			}
			// Further check for empty strings within the images array if it's not empty.
			// This is implicitly handled by `images.every(img => typeof img === 'string')` if we assume file paths must be non-empty.
			// If paths can be empty strings and that's invalid, a more specific check might be needed,
			// but typically file paths from an upload process won't be empty strings.
			const chat = await chatsDB.findById(chatId);
			if (!chat) {
				return res.status(404).json({ message: 'Chat not found.' });
			}
			if (!chat.participants.includes(user.id)) {
				return res
					.status(403)
					.json({ message: 'Forbidden. You are not a participant of this chat.' });
			}
			const now = new Date().toISOString();
			const finalMessageId = messageId || crypto.randomUUID();
			console.log('🔍 [DEBUG] Message creation - messageId from body:', messageId, 'finalMessageId:', finalMessageId);
			const newMessage: Message = {
				id: finalMessageId,
				senderId: user.id,
				content: content || '', // Use provided content, or empty string if only images/attachments/voice are sent
				images: images && hasValidImages ? images : [], // Use validated images, or an empty array
				attachments: attachments && hasValidAttachments ? attachments : [], // Use validated attachments, or an empty array
				timestamp: now,
				// Add voice message fields if present
				...(hasValidVoiceMessage && {
					audioType: audioType,
					audioUrl: audioUrl,
					audioDuration: audioDuration
				})
			};
			const createdMessage = await chatsDB.createInSubcollection(chatId, 'messages', newMessage);
			await chatsDB.update(chatId, { updatedAt: now });
			res.status(201).json(createdMessage);
		} catch (error: unknown) {
			console.error('Error sending message:', error);
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
			res.status(500).json({ message: 'Failed to send message.', error: errorMessage });
		}
	}
);

router.get(
	'/chat/:chatId/messages',
	authenticateToken,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user as JwtPayload;
			const chatId = req.params.chatId;
			const chat = await chatsDB.findById(chatId);
			if (!chat) {
				return res.status(404).json({ message: 'Chat not found.' });
			}
			if (!chat.participants.includes(user.id)) {
				return res
					.status(403)
					.json({ message: 'Forbidden. You are not a participant of this chat.' });
			}

			// Get messages from subcollection with pagination (last 50 messages)
			const limit = parseInt(req.query.limit as string) || 50;
			const offset = parseInt(req.query.offset as string) || 0;

			try {
				const allMessages = await chatsDB.getAllFromSubcollection<Message>(chatId, 'messages');
				const sortedMessages = allMessages.sort(
					(a: Message, b: Message) =>
						new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
				);

				// Apply pagination
				const paginatedMessages = sortedMessages.slice(offset, offset + limit);

				// Generate signed URLs for voice messages
				const messagesWithSignedUrls = await Promise.all(
					paginatedMessages.map(async (message) => {
						if (message.audioType === 'voice' && message.audioUrl) {
							try {
								const signedUrl = await getSignedAudioUrl(message.audioUrl, 15);
								return {
									...message,
									signedAudioUrl: signedUrl
								};
							} catch (error) {
								console.error(`Failed to generate signed URL for message ${message.id}:`, error);
								return message; // Return message without signed URL if generation fails
							}
						}
						return message;
					})
				);

				res.status(200).json({
					messages: messagesWithSignedUrls,
					totalCount: sortedMessages.length,
					hasMore: offset + limit < sortedMessages.length
				});
			} catch (subcollectionError: unknown) {
				// Handle case where messages subcollection doesn't exist yet
				console.log(`Messages subcollection not found for chat ${chatId}, returning empty array`);
				console.log('Subcollection error:', subcollectionError);
				res.status(200).json({
					messages: [],
					totalCount: 0,
					hasMore: false
				});
			}
		} catch (error: unknown) {
			console.error(`Error fetching messages for chat ${req.params.chatId}:`, error);
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
			res.status(500).json({ message: 'Failed to fetch messages.', error: errorMessage });
		}
	}
);

// --- Contract Endpoints ---
router.get('/contracts', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
	try {
		const user = req.user as JwtPayload;
		const allContracts = await contractsDB.getAll();
		const userContracts = allContracts.filter(
			(contract: Contract) =>
				contract.customerId === user.id || contract.expertSupplierId === user.id
		);
		userContracts.sort(
			(a: Contract, b: Contract) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
		);
		res.status(200).json(userContracts);
	} catch (error: unknown) {
		console.error('Error fetching contracts:', error);
		const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
		res.status(500).json({ message: 'Failed to fetch contracts.', error: errorMessage });
	}
});

// --- Get Single Contract by ID ---
router.get(
	'/contracts/:contractId',
	authenticateToken,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user as JwtPayload;
			const contractId = req.params.contractId;

			if (!contractId) {
				return res.status(400).json({ message: 'Contract ID parameter is required.' });
			}

			const contract = await contractsDB.findById(contractId);
			if (!contract) {
				return res.status(404).json({ message: 'Contract not found.' });
			}

			// Authorization: Ensure the current user is a party to this contract
			if (contract.customerId !== user.id && contract.expertSupplierId !== user.id) {
				return res
					.status(403)
					.json({ message: 'Forbidden. You are not authorized to view this contract.' });
			}

			res.status(200).json(contract);
		} catch (error: unknown) {
			console.error(`Error fetching contract ${req.params.contractId}:`, error);
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
			res.status(500).json({ message: 'Failed to fetch contract details.', error: errorMessage });
		}
	}
);

router.post('/contracts', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
	try {
		const initiator = req.user as JwtPayload;
		const {
			workRequestId,
			materialRequestId,
			customerId,
			expertSupplierId,
			workDetails,
			agreementSummary,
			contractDate,
			// New optional fields
			totalAmount,
			paymentTerms,
			advanceAmount,
			startDate,
			expectedCompletionDate,
			termsAndConditions,
			warrantyPeriod,
			cancellationPolicy
		} = req.body;

		// --- Validation ---
		if (
			(!workRequestId && !materialRequestId) ||
			(workRequestId && materialRequestId) ||
			!customerId ||
			!expertSupplierId ||
			!workDetails ||
			!agreementSummary
		) {
			return res.status(400).json({
				message:
					'Exactly one of workRequestId or materialRequestId must be provided, along with all other required fields.'
			});
		}

		const requestType = workRequestId ? 'work' : 'material';
		const contractType = requestType === 'work' ? 'expert_contract' : 'material_contract';
		const requestId = workRequestId || materialRequestId;

		// Validate that the request exists and get request data for participant validation
		let requestData: any = null;
		if (requestType === 'work') {
			const workRequest = await workRequestsDB.findById(requestId);
			if (!workRequest)
				return res.status(404).json({ message: `Work request with ID ${requestId} not found.` });
			if (workRequest.customerId !== customerId) {
				return res.status(400).json({
					message: 'Mismatch: workRequest.customerId does not match provided customerId.'
				});
			}
			// Check if request is in valid status for contract creation
			if (!['open', 'in_discussion', 'awaiting_quotes'].includes(workRequest.status)) {
				return res.status(400).json({
					message: `Work request must be in 'open', 'in_discussion', or 'awaiting_quotes' status to create a contract. Current status: ${workRequest.status}`
				});
			}
			requestData = workRequest;
		} else {
			// requestType === 'material'
			const materialRequest = await materialRequestsDB.findById(requestId);
			if (!materialRequest)
				return res
					.status(404)
					.json({ message: `Material request with ID ${requestId} not found.` });
			if (materialRequest.customerId !== customerId) {
				return res.status(400).json({
					message: 'Mismatch: materialRequest.customerId does not match provided customerId.'
				});
			}
			// Check if request is in valid status for contract creation
			if (!['open', 'quoting'].includes(materialRequest.status)) {
				return res.status(400).json({
					message: `Material request must be in 'open' or 'quoting' status to create a contract. Current status: ${materialRequest.status}`
				});
			}
			requestData = materialRequest;
		}

		// Validate users exist and are active
		const customer = await usersDB.findById(customerId);
		const provider = await usersDB.findById(expertSupplierId);
		if (!customer || !customer.isActive)
			return res
				.status(404)
				.json({ message: `Customer with ID ${customerId} not found or inactive.` });
		if (!provider || !provider.isActive)
			return res
				.status(404)
				.json({ message: `Expert/Supplier with ID ${expertSupplierId} not found or inactive.` });
		if (provider.userType !== 'expert' && provider.userType !== 'supplier') {
			return res
				.status(400)
				.json({ message: 'expertSupplierId must belong to an expert or supplier user.' });
		}

		// Enhanced participant validation - check both interested and invited users
		const isProviderEligible = (() => {
			if (requestType === 'work') {
				// For work requests, check if provider is expert and is either interested or invited
				if (provider.userType === 'expert') {
					const interestedExperts = requestData.interestedExperts || [];
					const invitedExperts = requestData.invitedExperts || [];
					return (
						interestedExperts.includes(expertSupplierId) ||
						invitedExperts.includes(expertSupplierId)
					);
				}
				// Suppliers can also work on work requests in some cases
				if (provider.userType === 'supplier') {
					const interestedSuppliers = requestData.interestedSuppliers || [];
					const invitedSuppliers = requestData.invitedSuppliers || [];
					return (
						interestedSuppliers.includes(expertSupplierId) ||
						invitedSuppliers.includes(expertSupplierId)
					);
				}
				return false;
			} else {
				// For material requests, check if provider is supplier and is either interested or invited
				if (provider.userType === 'supplier') {
					const interestedSuppliers = requestData.interestedSuppliers || [];
					const invitedSuppliers = requestData.invitedSuppliers || [];
					return (
						interestedSuppliers.includes(expertSupplierId) ||
						invitedSuppliers.includes(expertSupplierId)
					);
				}
				return false;
			}
		})();

		if (!isProviderEligible) {
			return res.status(403).json({
				message: `The ${provider.userType} must be either interested in or invited to this ${requestType} request to create a contract.`
			});
		}

		// Authorization check - contract creator must be either customer or the eligible provider
		if (initiator.id !== customerId && initiator.id !== expertSupplierId) {
			return res.status(403).json({
				message:
					'Forbidden. Contract creator must be the customer or the designated expert/supplier.'
			});
		}

		// Check for existing active contracts
		const allContracts = await contractsDB.getAll();
		const existingActiveContract = allContracts.find((contract: any) => {
			const isForSameRequest =
				(requestType === 'work' && contract.workRequestId === requestId) ||
				(requestType === 'material' && contract.materialRequestId === requestId);
			const isActive = !['cancelled', 'terminated'].includes(contract.status);
			return isForSameRequest && isActive;
		});

		if (existingActiveContract) {
			return res.status(409).json({
				message: `An active contract already exists for this ${requestType} request. Contract ID: ${existingActiveContract.id}`
			});
		}
		const now = new Date().toISOString();
		const contractId = crypto.randomUUID();

		const initialCustomerSigned = false;
		const initialExpertSupplierSigned = false;
		const initialStatus: Contract['status'] = 'draft';

		// Construct contract object with all fields
		const newContract: Partial<Contract> = {
			id: contractId,
			customerId,
			expertSupplierId,
			workDetails,
			agreementSummary,
			contractDate: contractDate || now,
			customerSigned: initialCustomerSigned,
			expertSupplierSigned: initialExpertSupplierSigned,
			requestType: requestType,
			contractType: contractType,
			status: initialStatus,
			createdAt: now,
			updatedAt: now
		};

		// Add optional financial fields if provided
		if (totalAmount !== undefined) newContract.totalAmount = totalAmount;
		if (paymentTerms) newContract.paymentTerms = paymentTerms;
		if (advanceAmount !== undefined) newContract.advanceAmount = advanceAmount;

		// Add optional timeline fields if provided
		if (startDate) newContract.startDate = startDate;
		if (expectedCompletionDate) newContract.expectedCompletionDate = expectedCompletionDate;

		// Add optional legal fields if provided
		if (termsAndConditions) newContract.termsAndConditions = termsAndConditions;
		if (warrantyPeriod) newContract.warrantyPeriod = warrantyPeriod;
		if (cancellationPolicy) newContract.cancellationPolicy = cancellationPolicy;

		if (workRequestId) newContract.workRequestId = workRequestId;
		if (materialRequestId) newContract.materialRequestId = materialRequestId;

		console.log(
			'[POST /api/contracts] Attempting to create contract with data:',
			JSON.stringify(newContract, null, 2)
		);
		const createdContract = await contractsDB.create(newContract as Contract);
		console.log(
			'[POST /api/contracts] Successfully created contract in DB, ID:',
			createdContract.id
		);

		// Send a system message to the chat
		await sendSystemMessage(
			createdContract.customerId,
			createdContract.expertSupplierId,
			`A new contract draft (ID: ${createdContract.id.substring(
				0,
				8
			)}) has been created and is ready for review.`,
			{ contractId: createdContract.id }
		);

		// Optionally, update the status of the original request
		if (requestType === 'work') {
			const workRequest = await workRequestsDB.findById(requestId); // Refetch to be safe
			if (
				workRequest &&
				(workRequest.status === 'in_discussion' ||
					workRequest.status === 'open' ||
					workRequest.status === 'awaiting_quotes')
			) {
				console.log(
					`[POST /api/contracts] Updating work request ${workRequest.id} status to 'contracted'.`
				);
				await workRequestsDB.update(workRequest.id, { status: 'contracted', updatedAt: now });
			}
		} else {
			// requestType === 'material'
			const materialRequest = await materialRequestsDB.findById(requestId);
			if (
				materialRequest &&
				(materialRequest.status === 'open' || materialRequest.status === 'quoting')
			) {
				console.log(
					`[POST /api/contracts] Updating material request ${materialRequest.id} status to 'contracted'.`
				);
				await materialRequestsDB.update(materialRequest.id, {
					status: 'contracted',
					updatedAt: now
				});
			}
		}

		// Remove request IDs from associated chat documents to prevent duplicate contract creation
		try {
			const allChats = await chatsDB.getAll();
			const requestFieldName = requestType === 'work' ? 'workRequestId' : 'materialRequestId';

			// Find chats that have this specific request ID
			const chatsToUpdate = allChats.filter((chat: any) => chat[requestFieldName] === requestId);

			// Update each chat to remove the request ID
			for (const chat of chatsToUpdate) {
				const updateData: any = { updatedAt: now };
				updateData[requestFieldName] = null; // Remove the request ID

				console.log(
					`[POST /api/contracts] Removing ${requestFieldName} from chat ${chat.id} after contract creation`
				);
				await chatsDB.update(chat.id, updateData);
			}

			if (chatsToUpdate.length > 0) {
				console.log(
					`[POST /api/contracts] Updated ${chatsToUpdate.length} chat(s) to remove ${requestFieldName}`
				);
			}
		} catch (chatUpdateError: unknown) {
			console.error('Error updating chat documents after contract creation:', chatUpdateError);
			// Don't fail the contract creation if chat update fails
		}

		res.status(201).json(createdContract);
	} catch (error: unknown) {
		console.error('Error in POST /api/contracts route:', error); // More specific error origin
		const errorMessage =
			error instanceof Error
				? error.message
				: 'An unknown error occurred during contract creation.';
		if (errorMessage.includes('already exists')) {
			return res.status(409).json({ message: errorMessage });
		}
		res.status(500).json({ message: 'Failed to create contract.', error: errorMessage });
	}
});

router.put(
	'/contracts/:contractId/sign',
	authenticateToken,
	attachmentUpload.array('signatureFiles', 5), // Limit to 5 files for signature attachments
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user as JwtPayload;
			const contractId = req.params.contractId;
			const contract = await contractsDB.findById(contractId);

			// Extract signature comment and files from request
			const signatureComment = req.body.signatureComment;
			const signatureFiles = req.files as Express.Multer.File[];
			if (!contract) {
				return res.status(404).json({ message: 'Contract not found.' });
			}
			if (contract.status !== 'draft' && contract.status !== 'awaiting_signatures') {
				return res.status(400).json({
					message: `Contract in status '${contract.status}' cannot be signed. Must be 'draft' or 'awaiting_signatures'.`
				});
			}
			let signedByCurrentUser = false;
			const now = new Date().toISOString();
			const updates: Partial<Contract> = { updatedAt: now };

			if (user.id === contract.customerId) {
				if (contract.customerSigned)
					return res.status(400).json({ message: 'Customer has already signed this contract.' });
				updates.customerSigned = true;
				updates.customerSignatureTimestamp = now;
				signedByCurrentUser = true;
			} else if (user.id === contract.expertSupplierId) {
				if (contract.expertSupplierSigned)
					return res
						.status(400)
						.json({ message: 'Expert/Supplier has already signed this contract.' });
				updates.expertSupplierSigned = true;
				updates.expertSupplierSignatureTimestamp = now;
				signedByCurrentUser = true;
			} else {
				return res
					.status(403)
					.json({ message: 'Forbidden. You are not a party to this contract or cannot sign it.' });
			}

			if (signedByCurrentUser) {
				const customerHasSigned = updates.customerSigned || contract.customerSigned;
				const providerHasSigned = updates.expertSupplierSigned || contract.expertSupplierSigned;
				const signerRole = user.userType.charAt(0).toUpperCase() + user.userType.slice(1);

				if (customerHasSigned && providerHasSigned) {
					updates.status = 'signed';
					const updatedContract = await contractsDB.update(contractId, updates);

					// --- SIGNATURE COMMENT CREATION ---
					// If there's a signature comment, create it as a signature_comment type
					if (signatureComment && signatureComment.trim()) {
						try {
							// Get user profile for display name
							const userProfile = await usersDB.findById(user.id);
							const authorDisplayName =
								userProfile?.profile?.fullName || userProfile?.email.split('@')[0] || 'User';

							// Create signature comment
							const signatureCommentData: ContractComment = {
								id: crypto.randomUUID(),
								authorId: user.id,
								comment: signatureComment.trim(),
								timestamp: now,
								type: 'signature_comment',
								attachments: []
							};

							// Handle signature attachments if any
							if (signatureFiles && signatureFiles.length > 0) {
								const attachments: Attachment[] = [];
								for (const file of signatureFiles) {
									try {
										const uploadResult = await uploadEntityAttachment(
											file,
											'contracts',
											contractId
										);
										attachments.push({
											fileName: file.originalname,
											filePath: uploadResult.filePath,
											fileType: file.mimetype,
											size: file.size
										});
									} catch (uploadError) {
										console.error('Failed to upload signature attachment:', uploadError);
										// Continue with other files even if one fails
									}
								}
								if (attachments.length > 0) {
									signatureCommentData.attachments = attachments;
								}
							}

							// Add the signature comment to the contract
							if (updatedContract) {
								const comments = updatedContract.comments || [];
								comments.push(signatureCommentData);
								await contractsDB.update(contractId, { comments });
							}

							// Send system message about signature comment
							let signatureMessage = `The ${signerRole} has signed the contract with a comment: "${signatureComment.trim()}"`;
							if (signatureFiles && signatureFiles.length > 0) {
								signatureMessage += ` and ${signatureFiles.length} attachment${signatureFiles.length > 1 ? 's' : ''}`;
							}
							signatureMessage += '.';

							await sendSystemMessage(
								contract.customerId,
								contract.expertSupplierId,
								signatureMessage,
								{ contractId: contract.id }
							);
						} catch (commentError) {
							console.error('Failed to create signature comment:', commentError);
							// Don't fail the entire signing process if comment creation fails
						}
					} else {
						// Send system message that the contract is fully signed (no comment)
						await sendSystemMessage(
							contract.customerId,
							contract.expertSupplierId,
							`The contract has been fully signed by the ${signerRole} and is now active.`,
							{ contractId: contract.id }
						);
					}

					// This check is crucial to prevent trying to process a null object
					if (!updatedContract) {
						return res.status(500).json({ message: 'Failed to update contract after signing.' });
					}

					// --- PROJECT CREATION/UPDATE LOGIC ---
					// When a contract is fully signed, create or update the corresponding project.
					const projectId = updatedContract.workRequestId || updatedContract.materialRequestId;
					if (projectId) {
						const project = await projectsDB.findById(projectId);
						const workRequest = updatedContract.workRequestId
							? await workRequestsDB.findById(updatedContract.workRequestId)
							: null;
						const materialRequest = updatedContract.materialRequestId
							? await materialRequestsDB.findById(updatedContract.materialRequestId)
							: null;

						const projectUpdate: Partial<Project> = {
							updatedAt: now
						};

						const historyEntry = { status: 'Not Started', updatedAt: now, updatedBy: user.id };

						if (updatedContract.requestType === 'work') {
							projectUpdate.workComponent = {
								expertId: updatedContract.expertSupplierId,
								contractId: updatedContract.id,
								status: 'Not Started',
								statusHistory: [historyEntry]
							};
						} else {
							// 'material'
							projectUpdate.materialComponent = {
								supplierId: updatedContract.expertSupplierId,
								contractId: updatedContract.id,
								status: 'Awaiting Dispatch',
								statusHistory: [historyEntry]
							};
						}

						if (project) {
							// Project exists, just add the new component
							await projectsDB.update(projectId, projectUpdate);
						} else {
							// Project doesn't exist, create it
							const newProject: Project = {
								id: projectId,
								title: workRequest?.title || materialRequest?.title || 'Project',
								customerId: updatedContract.customerId,
								createdAt: now,
								updatedAt: now,
								...projectUpdate
							};
							await projectsDB.create(newProject);
						}
					}
					// --- END PROJECT LOGIC ---

					res.status(200).json(updatedContract);
				} else {
					updates.status = 'awaiting_signatures';
					const updatedContract = await contractsDB.update(contractId, updates);

					// --- SIGNATURE COMMENT CREATION FOR PARTIAL SIGNING ---
					// If there's a signature comment, create it as a signature_comment type
					if (signatureComment && signatureComment.trim()) {
						try {
							// Get user profile for display name
							const userProfile = await usersDB.findById(user.id);
							const authorDisplayName =
								userProfile?.profile?.fullName || userProfile?.email.split('@')[0] || 'User';

							// Create signature comment
							const signatureCommentData: ContractComment = {
								id: crypto.randomUUID(),
								authorId: user.id,
								comment: signatureComment.trim(),
								timestamp: now,
								type: 'signature_comment',
								attachments: []
							};

							// Handle signature attachments if any
							if (signatureFiles && signatureFiles.length > 0) {
								const attachments: Attachment[] = [];
								for (const file of signatureFiles) {
									try {
										const uploadResult = await uploadEntityAttachment(
											file,
											'contracts',
											contractId
										);
										attachments.push({
											fileName: file.originalname,
											filePath: uploadResult.filePath,
											fileType: file.mimetype,
											size: file.size
										});
									} catch (uploadError) {
										console.error('Failed to upload signature attachment:', uploadError);
										// Continue with other files even if one fails
									}
								}
								if (attachments.length > 0) {
									signatureCommentData.attachments = attachments;
								}
							}

							// Add the signature comment to the contract
							if (updatedContract) {
								const comments = updatedContract.comments || [];
								comments.push(signatureCommentData);
								await contractsDB.update(contractId, { comments });
							}

							// Send system message about signature comment
							let partialSignatureMessage = `The ${signerRole} has signed the contract with a comment: "${signatureComment.trim()}"`;
							if (signatureFiles && signatureFiles.length > 0) {
								partialSignatureMessage += ` and ${signatureFiles.length} attachment${signatureFiles.length > 1 ? 's' : ''}`;
							}
							partialSignatureMessage += '. Awaiting other party\'s signature.';

							await sendSystemMessage(
								contract.customerId,
								contract.expertSupplierId,
								partialSignatureMessage,
								{ contractId: contract.id }
							);
						} catch (commentError) {
							console.error('Failed to create signature comment:', commentError);
							// Don't fail the entire signing process if comment creation fails
						}
					} else {
						// Send system message that one party has signed (no comment)
						await sendSystemMessage(
							contract.customerId,
							contract.expertSupplierId,
							`The ${signerRole} has signed the contract. Awaiting other party's signature.`,
							{ contractId: contract.id }
						);
					}

					res.status(200).json(updatedContract);
				}
			} else {
				res.status(400).json({
					message:
						'No signature action was performed. User may have already signed or is not a party.'
				});
			}
		} catch (error: unknown) {
			console.error('Error signing contract:', error);
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
			res.status(500).json({ message: 'Failed to sign contract.', error: errorMessage });
		}
	}
);

// --- Contract Comments Endpoint ---
router.post(
	'/contracts/:contractId/comments',
	authenticateToken,
	attachmentUpload.array('files', 5), // Limit to 5 files for comments
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user as JwtPayload;
			const contractId = req.params.contractId;
			const { comment, type = 'general' } = req.body;
			const files = req.files as Express.Multer.File[];

			// --- Validation ---
			if (!comment || typeof comment !== 'string' || comment.trim().length < 1) {
				return res.status(400).json({
					message: 'Comment is required and must be at least 1 character long.'
				});
			}

			// Validate comment type
			const validTypes = ['general', 'revision_request', 'signature_comment'];
			if (!validTypes.includes(type)) {
				return res.status(400).json({
					message: `Invalid comment type. Must be one of: ${validTypes.join(', ')}`
				});
			}

			// --- Get Contract ---
			const contract = await contractsDB.findById(contractId);
			if (!contract) {
				return res.status(404).json({ message: 'Contract not found.' });
			}

			// --- Authorization ---
			if (contract.customerId !== user.id && contract.expertSupplierId !== user.id) {
				return res.status(403).json({
					message: 'Forbidden. You are not authorized to comment on this contract.'
				});
			}

			// --- Check Contract Status ---
			const allowedStatuses = [
				'draft',
				'revision_requested',
				'awaiting_signatures',
				'signed',
				'in_progress'
			];
			if (!allowedStatuses.includes(contract.status)) {
				return res.status(400).json({
					message: `Cannot add comments to contract in status '${contract.status}'.`
				});
			}

			// Only allow revision requests in draft/awaiting_signatures states
			if (
				type === 'revision_request' &&
				!['draft', 'awaiting_signatures'].includes(contract.status)
			) {
				return res.status(400).json({
					message: `Cannot add revision requests to contract in status '${contract.status}'.`
				});
			}

			// --- Get User Profile for Validation ---
			const userProfile = await usersDB.findById(user.id);
			if (!userProfile) {
				return res.status(404).json({ message: 'User profile not found.' });
			}

			// --- Upload Attachments (if any) ---
			let attachments: any[] = [];
			if (files && files.length > 0) {
				const uploadPromises = files.map((file) =>
					uploadEntityAttachment(file, 'contracts', contractId)
				);
				const uploadResults = await Promise.all(uploadPromises);

				attachments = uploadResults.map((result, index) => {
					const file = files[index];
					return {
						fileName: file.originalname,
						filePath: result.filePath,
						fileType: file.mimetype,
						size: file.size
					};
				});
			}

			// --- Create Comment ---
			const commentId = crypto.randomUUID();
			const now = new Date().toISOString();
			const newComment: ContractComment = {
				id: commentId,
				authorId: user.id,
				comment: comment.trim(),
				timestamp: now,
				type: type as ContractComment['type']
			};

			// Only add attachments if there are any
			if (attachments.length > 0) {
				newComment.attachments = attachments;
			}

			// --- Update Contract with New Comment ---
			const currentComments = contract.comments || [];
			const updatedComments = [...currentComments, newComment];

			const updateData: Partial<Contract> = {
				comments: updatedComments,
				updatedAt: now
			};

			// --- Update Status if Revision Request ---
			if (type === 'revision_request') {
				updateData.status = 'revision_requested';
			}

			const updatedContract = await contractsDB.update(contractId, updateData);

			// --- Send System Message ---
			const commentTypeLabel = type === 'revision_request' ? 'revision request' : 'comment';
			const authorDisplayName =
				userProfile.profile?.fullName || userProfile.email.split('@')[0] || 'User';

			// Create message with attachment info if applicable
			let systemMessageContent = `${authorDisplayName} has added a ${commentTypeLabel} to the contract`;
			if (attachments.length > 0) {
				systemMessageContent += ` with ${attachments.length} attachment${attachments.length > 1 ? 's' : ''}`;
			}
			systemMessageContent += '.';

			await sendSystemMessage(
				contract.customerId,
				contract.expertSupplierId,
				systemMessageContent,
				{ contractId: contract.id }
			);

			res.status(200).json({
				message: 'Comment added successfully!',
				comment: newComment,
				contract: updatedContract
			});
		} catch (error: unknown) {
			console.error('Error adding contract comment:', error);
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';

			// Handle multer errors
			if (errorMessage.includes('File type not allowed')) {
				return res.status(400).json({ message: errorMessage });
			}
			if (errorMessage.includes('File too large')) {
				return res.status(400).json({ message: 'File too large. Maximum file size is 25MB.' });
			}

			res.status(500).json({ message: 'Failed to add comment.', error: errorMessage });
		}
	}
);

// --- Update Contract Endpoint ---
router.put(
	'/contracts/:contractId',
	authenticateToken,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user as JwtPayload;
			const contractId = req.params.contractId;
			const updateData = req.body as Partial<Contract> & {
				removedAttachments?: string[];
				attachmentManagement?: {
					keepExisting: Array<{
						fileName: string;
						filePath: string;
						fileType: string;
						size: number;
					}>;
					removeExisting: string[];
					hasNewAttachments: boolean;
					newAttachments?: Array<{
						fileName: string;
						filePath: string;
						fileType: string;
						size: number;
					}>;
				};
			};

			// --- Get Contract ---
			const contract = await contractsDB.findById(contractId);
			if (!contract) {
				return res.status(404).json({ message: 'Contract not found.' });
			}

			// --- Authorization ---
			// Currently only customer can edit, but this may change in the future
			if (user.id !== contract.customerId) {
				return res.status(403).json({
					message: 'Forbidden. You are not authorized to edit this contract.'
				});
			}

			// --- Status Validation ---
			// Only allow editing contracts in revision_requested status
			if (contract.status !== 'revision_requested') {
				return res.status(400).json({
					message: 'Only contracts in revision_requested status can be edited.'
				});
			}

			// --- Enhanced Attachment Management ---
			let updatedAttachments = contract.attachments || [];

			// Handle new attachment management approach
			if (updateData.attachmentManagement) {
				const { keepExisting, removeExisting, hasNewAttachments, newAttachments } =
					updateData.attachmentManagement;

				// Use the explicit list of attachments to keep
				if (Array.isArray(keepExisting)) {
					updatedAttachments = keepExisting;
				}

				// Add new attachments if any were uploaded
				if (newAttachments && Array.isArray(newAttachments) && newAttachments.length > 0) {
					updatedAttachments = [...updatedAttachments, ...newAttachments];
				}
			} else {
				// Fallback to old approach for backward compatibility
				if (
					updateData.removedAttachments &&
					Array.isArray(updateData.removedAttachments) &&
					updateData.removedAttachments.length > 0
				) {
					updatedAttachments = updatedAttachments.filter(
						(attachment) => !updateData.removedAttachments!.includes(attachment.fileName)
					);
				}
			}

			// --- Update Contract ---
			const now = new Date().toISOString();
			const { removedAttachments, attachmentManagement, ...contractUpdates } = updateData;
			const updates: Partial<Contract> = {
				...contractUpdates,
				attachments: updatedAttachments,
				updatedAt: now
			};

			// Ensure status is reset to draft after editing
			updates.status = 'draft';

			const updatedContract = await contractsDB.update(contractId, updates);

			if (!updatedContract) {
				return res.status(500).json({ message: 'Failed to update contract.' });
			}

			// --- Send System Message ---
			await sendSystemMessage(
				contract.customerId,
				contract.expertSupplierId,
				'The contract has been updated to address the revision request and is ready for signing again.',
				{ contractId: contract.id }
			);

			res.status(200).json(updatedContract);
		} catch (error: unknown) {
			console.error('Error updating contract:', error);
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
			res.status(500).json({ message: 'Failed to update contract.', error: errorMessage });
		}
	}
);

router.put(
	'/contracts/:contractId/status',
	authenticateToken,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user as JwtPayload;
			const contractId = req.params.contractId;
			const { status: newStatus } = req.body;

			// --- Validation ---
			if (!newStatus) {
				return res.status(400).json({ message: 'New status is required in the request body.' });
			}
			const validStatuses: Contract['status'][] = [
				'draft',
				'awaiting_signatures',
				'signed',
				'in_progress',
				'completed',
				'disputed',
				'cancelled',
				'terminated'
			];
			if (!validStatuses.includes(newStatus)) {
				return res.status(400).json({
					message: `Invalid status provided. Must be one of: ${validStatuses.join(', ')}`
				});
			}

			const contract = await contractsDB.findById(contractId);
			if (!contract) {
				return res.status(404).json({ message: 'Contract not found.' });
			}

			// --- Authorization ---
			if (user.id !== contract.customerId && user.id !== contract.expertSupplierId) {
				return res
					.status(403)
					.json({ message: 'Forbidden. You are not a party to this contract.' });
			}

			// --- Update Logic ---
			const now = new Date().toISOString();
			const updates: Partial<Contract> = {
				status: newStatus,
				updatedAt: now
			};
			const updatedContract = await contractsDB.update(contractId, updates);

			if (!updatedContract) {
				return res.status(500).json({ message: 'Failed to update the contract in the database.' });
			}

			// --- Chat Notification Logic ---
			await sendSystemMessage(
				updatedContract.customerId,
				updatedContract.expertSupplierId,
				`The contract status was updated to: ${newStatus.replace(/_/g, ' ')}.`,
				{ contractId: updatedContract.id }
			);

			res.status(200).json(updatedContract);
		} catch (error: unknown) {
			console.error('Error updating contract status:', error);
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
			res.status(500).json({ message: 'Failed to update contract status.', error: errorMessage });
		}
	}
);

// --- Aggregated Projects Endpoint ---
router.get('/projects', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
	try {
		const user = req.user as JwtPayload;

		// 1. Fetch all projects where the user is involved.
		const allProjects = await projectsDB.getAll();
		const userProjects = allProjects.filter(
			(p) =>
				p.customerId === user.id ||
				p.workComponent?.expertId === user.id ||
				p.materialComponent?.supplierId === user.id
		);

		// 2. Tailor the response based on the user's role
		if (user.userType === 'expert') {
			const expertProjects = userProjects
				.filter((p) => p.workComponent?.expertId === user.id)
				.map((p) => ({ ...p, materialComponent: undefined })); // Strip material component
			return res.status(200).json(expertProjects);
		}

		if (user.userType === 'supplier') {
			const supplierProjects = userProjects
				.filter((p) => p.materialComponent?.supplierId === user.id)
				.map((p) => ({ ...p, workComponent: undefined })); // Strip work component
			return res.status(200).json(supplierProjects);
		}

		// For customers, return the full project objects
		res.status(200).json(userProjects);
	} catch (error: unknown) {
		console.error('Error fetching aggregated projects:', error);
		const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
		res.status(500).json({ message: 'Failed to fetch projects.', error: errorMessage });
	}
});

router.get('/projects/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
	try {
		const projectId = req.params.id;
		const project = await projectsDB.findById(projectId);

		if (!project) {
			return res.status(404).json({ message: 'Project not found.' });
		}

		// Basic authorization: user must be part of the project
		const user = req.user as JwtPayload;
		if (
			user.id !== project.customerId &&
			user.id !== project.workComponent?.expertId &&
			user.id !== project.materialComponent?.supplierId
		) {
			return res.status(403).json({ message: 'You are not authorized to view this project.' });
		}

		// Enrich project with full request details and user profiles
		const participantIds = new Set<string>([project.customerId]);
		if (project.workComponent) participantIds.add(project.workComponent.expertId);
		if (project.materialComponent) participantIds.add(project.materialComponent.supplierId);

		// Safely fetch requests - handle cases where request type doesn't match project component
		let workRequest = null;
		let materialRequest = null;

		try {
			if (project.workComponent) {
				workRequest = await workRequestsDB.findById(project.id);
			}
		} catch (error) {
			console.log(`Work request ${project.id} not found, skipping`);
		}

		try {
			if (project.materialComponent) {
				materialRequest = await materialRequestsDB.findById(project.id);
			}
		} catch (error) {
			console.log(`Material request ${project.id} not found, skipping`);
		}

		const [allChats, users] = await Promise.all([
			chatsDB.getAll(),
			usersDB.getByIds(Array.from(participantIds))
		]);

		const usersMap = new Map(users.map((u) => [u.id, u]));

		project.workRequest = workRequest || undefined;
		project.materialRequest = materialRequest || undefined;
		project.customer = usersMap.get(project.customerId);
		if (project.workComponent) project.expert = usersMap.get(project.workComponent.expertId);
		if (project.materialComponent)
			project.supplier = usersMap.get(project.materialComponent.supplierId);

		// Find and attach chat IDs
		if (project.workComponent) {
			const workChat = allChats.find(
				(c) =>
					c.participants.includes(project.customerId) &&
					c.participants.includes(project.workComponent!.expertId)
			);
			if (workChat) project.workComponent.chatId = workChat.id;
		}
		if (project.materialComponent) {
			const materialChat = allChats.find(
				(c) =>
					c.participants.includes(project.customerId) &&
					c.participants.includes(project.materialComponent!.supplierId)
			);
			if (materialChat) project.materialComponent.chatId = materialChat.id;
		}

		res.status(200).json(project);
	} catch (error: unknown) {
		console.error(`Error fetching project ${req.params.id}:`, error);
		const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
		res.status(500).json({ message: 'Failed to fetch project.', error: errorMessage });
	}
});

router.put(
	'/projects/:projectId/status',
	authenticateToken,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user as JwtPayload;
			const projectId = req.params.projectId;
			const { component, newStatus } = req.body as {
				component: 'work' | 'material';
				newStatus: string;
			};

			if (!component || !newStatus) {
				return res.status(400).json({ message: 'Component and newStatus are required.' });
			}

			const project = await projectsDB.findById(projectId);
			if (!project) {
				return res.status(404).json({ message: 'Project not found.' });
			}

			// Authorization check can be more granular here
			if (
				user.id !== project.customerId &&
				user.id !== project.workComponent?.expertId &&
				user.id !== project.materialComponent?.supplierId
			) {
				return res.status(403).json({ message: 'Only a party to the project can update status.' });
			}

			const now = new Date().toISOString();
			const historyEntry = { status: newStatus, updatedAt: now, updatedBy: user.id };

			const updatePayload: Partial<Project> = { updatedAt: now };

			if (component === 'work' && project.workComponent) {
				project.workComponent.status = newStatus as
					| 'Not Started'
					| 'In Progress'
					| 'Awaiting Review'
					| 'Completed'
					| 'Disputed'
					| 'Cancelled';
				project.workComponent.statusHistory.push(historyEntry);
				updatePayload.workComponent = project.workComponent;
			} else if (component === 'material' && project.materialComponent) {
				project.materialComponent.status = newStatus as
					| 'Awaiting Dispatch'
					| 'Dispatched'
					| 'Delivered'
					| 'Completed'
					| 'Issue Reported'
					| 'Cancelled';
				project.materialComponent.statusHistory.push(historyEntry);
				updatePayload.materialComponent = project.materialComponent;
			} else {
				return res.status(400).json({ message: 'Invalid component specified for this project.' });
			}

			const updatedProject = await projectsDB.update(projectId, updatePayload);

			// --- Chat Notification Logic ---
			if (updatedProject) {
				const recipientId =
					component === 'work'
						? updatedProject.workComponent?.expertId
						: updatedProject.materialComponent?.supplierId;
				if (recipientId) {
					await sendSystemMessage(
						updatedProject.customerId,
						recipientId,
						`The project's ${component} status was updated to: ${newStatus}.`
					);
				}
			}

			res.status(200).json(updatedProject);
		} catch (error: unknown) {
			console.error('Error updating project status:', error);
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
			res.status(500).json({ message: 'Failed to update project status.', error: errorMessage });
		}
	}
);

console.log('API routes module (routes.ts) initialized with core endpoints.');
export default router;
export { chatFileUpload };
