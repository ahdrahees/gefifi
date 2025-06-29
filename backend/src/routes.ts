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
	Contract
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

// Initialize databases
const usersDB = new FirestoreCollection<User>('users');
const workRequestsDB = new FirestoreCollection<WorkRequest>('workRequests');
const materialRequestsDB = new FirestoreCollection<MaterialRequest>('materialRequests');
const projectsDB = new FirestoreCollection<Project>('projects');
const chatsDB = new FirestoreCollection<Chat>('chats');
const messagesDB = new FirestoreCollection<Message>('messages');
const contractsDB = new FirestoreCollection<Contract>('contracts');

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

			const newMaterialRequest: MaterialRequest = {
				id: materialRequestId,
				customerId: user.id,
				title,
				description,
				deliveryLocation,
				deliveryDate,
				linkedWorkRequestId,
				items,
				status: 'open',
				createdAt: now,
				updatedAt: now,
				interestedSuppliers: []
			};

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
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user as JwtPayload;
			const profileData: Partial<UserProfile> = req.body;

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

			// Merge the new profile data with any existing profile data
			const updatedProfile = {
				...existingUser.profile,
				...profileValidation.validatedProfile
			};

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

			const messageId = crypto.randomUUID();
			const newMessage: Message = {
				id: messageId,
				chatId: existingChat.id,
				senderId: sender.id,
				content: finalMessageContent,
				timestamp: now
			};
			await messagesDB.create(newMessage);
			existingChat.updatedAt = now;
			await chatsDB.update(existingChat.id, { updatedAt: now });

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
				initialMessage: newMessage
			});
		} catch (error: unknown) {
			console.error('Error expressing interest:', error);
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
			res.status(500).json({ message: 'Failed to express interest.', error: errorMessage });
		}
	}
);

// --- Chat Endpoints ---
router.get('/chat', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
	try {
		const user = req.user as JwtPayload;
		const allChats = await chatsDB.getAll();
		const userChats = allChats.filter((chat: Chat) => chat.participants.includes(user.id));
		userChats.sort(
			(a: Chat, b: Chat) =>
				new Date(b.updatedAt || b.createdAt).getTime() -
				new Date(a.updatedAt || a.createdAt).getTime()
		);
		res.status(200).json(userChats);
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
				chatId: createdChat.id,
				senderId: user.id,
				content: initialMessageContent,
				timestamp: now
			};
			await messagesDB.create(initialMessage);
		}
		res.status(201).json(createdChat);
	} catch (error: unknown) {
		console.error('Error creating chat:', error);
		const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
		res.status(500).json({ message: 'Failed to create chat.', error: errorMessage });
	}
});

router.post(
	'/chat/:chatId/messages',
	authenticateToken,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user as JwtPayload;
			const chatId = req.params.chatId;
			const { since } = req.query as { since?: string };

			const chat = await chatsDB.findById(chatId);
			if (!chat) {
				return res.status(404).json({ message: 'Chat not found.' });
			}
			if (!chat.participants.includes(user.id)) {
				return res
					.status(403)
					.json({ message: 'Forbidden. You are not a participant of this chat.' });
			}

			let chatMessages: Message[];

			if (since && !isNaN(new Date(since).getTime())) {
				// Fetch only new messages since the last timestamp
				chatMessages = await messagesDB.getSince(since, { chatId: chatId });
			} else {
				// Initial fetch: get all messages for the chat
				const allMessages = await messagesDB.getAll();
				chatMessages = allMessages.filter((msg: Message) => msg.chatId === chatId);
			}

			// Always sort by timestamp to ensure chronological order
			chatMessages.sort(
				(a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
			);

			res.status(200).json(chatMessages);
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
			contractDate
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
		const requestId = workRequestId || materialRequestId;

		// Validate that the request exists
		if (requestType === 'work') {
			const workRequest = await workRequestsDB.findById(requestId);
			if (!workRequest)
				return res.status(404).json({ message: `Work request with ID ${requestId} not found.` });
			if (workRequest.customerId !== customerId) {
				return res.status(400).json({
					message: 'Mismatch: workRequest.customerId does not match provided customerId.'
				});
			}
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
		}

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
		if (initiator.id !== customerId && initiator.id !== expertSupplierId) {
			return res.status(403).json({
				message:
					'Forbidden. Contract creator must be the customer or the designated expert/supplier.'
			});
		}
		const now = new Date().toISOString();
		const contractId = crypto.randomUUID();

		let initialCustomerSigned = false;
		let initialExpertSupplierSigned = false;
		let customerSigTimestamp: string | undefined = undefined;
		let expertSigTimestamp: string | undefined = undefined;
		let initialStatus: Contract['status'] = 'draft';

		if (initiator.id === customerId) {
			initialCustomerSigned = true;
			customerSigTimestamp = now;
			initialStatus = 'awaiting_signatures';
		} else if (initiator.id === expertSupplierId) {
			initialExpertSupplierSigned = true;
			expertSigTimestamp = now;
			initialStatus = 'awaiting_signatures';
		}
		// If, hypothetically, initiator could be both (e.g. self-contract which isn't the model here)
		// and both flags became true, status should be 'signed'.
		// For current model, one party signing on creation moves it to 'awaiting_signatures'.

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
			status: initialStatus,
			createdAt: now,
			updatedAt: now
		};

		if (workRequestId) newContract.workRequestId = workRequestId;
		if (materialRequestId) newContract.materialRequestId = materialRequestId;

		if (customerSigTimestamp) {
			newContract.customerSignatureTimestamp = customerSigTimestamp;
		}
		if (expertSigTimestamp) {
			newContract.expertSupplierSignatureTimestamp = expertSigTimestamp;
		}

		console.log(
			'[POST /api/contracts] Attempting to create contract with data:',
			JSON.stringify(newContract, null, 2)
		);
		const createdContract = await contractsDB.create(newContract as Contract);
		console.log(
			'[POST /api/contracts] Successfully created contract in DB, ID:',
			createdContract.id
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
			if (materialRequest && materialRequest.status === 'open') {
				await materialRequestsDB.update(materialRequest.id, { status: 'ordered', updatedAt: now });
			}
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
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const user = req.user as JwtPayload;
			const contractId = req.params.contractId;
			const contract = await contractsDB.findById(contractId);
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

				if (customerHasSigned && providerHasSigned) {
					updates.status = 'signed';
					const updatedContract = await contractsDB.update(contractId, updates);

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
			try {
				const allChats = await chatsDB.getAll();
				// Find a chat that exclusively contains these two participants.
				const relevantChat = allChats.find(
					(chat: Chat) =>
						chat.participants.length === 2 &&
						chat.participants.includes(contract.customerId) &&
						chat.participants.includes(contract.expertSupplierId)
				);

				if (relevantChat) {
					const messageId = crypto.randomUUID();
					const notificationMessage: Message = {
						id: messageId,
						chatId: relevantChat.id,
						senderId: 'system', // Indicates a system-generated message
						content: `[System] The project status was updated to: ${newStatus.replace(/_/g, ' ')}.`,
						timestamp: now
					};
					await messagesDB.create(notificationMessage);
					await chatsDB.update(relevantChat.id, { updatedAt: now });
					console.log(
						`[Status Update] Sent notification to chat ${relevantChat.id} for contract ${contract.id}`
					);
				} else {
					console.warn(
						`[Status Update] Could not find a chat between ${contract.customerId} and ${contract.expertSupplierId} to send notification for contract ${contract.id}`
					);
				}
			} catch (chatError) {
				console.error(
					`[Status Update] Failed to send chat notification for contract ${contract.id}:`,
					chatError
				);
			}

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

		const [allChats, workRequest, materialRequest, users] = await Promise.all([
			chatsDB.getAll(),
			project.workComponent ? workRequestsDB.findById(project.id) : Promise.resolve(null),
			project.materialComponent ? materialRequestsDB.findById(project.id) : Promise.resolve(null),
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

			let updatePayload: Partial<Project> = { updatedAt: now };

			if (component === 'work' && project.workComponent) {
				project.workComponent.status = newStatus as any; // Cast for now
				project.workComponent.statusHistory.push(historyEntry);
				updatePayload.workComponent = project.workComponent;
			} else if (component === 'material' && project.materialComponent) {
				project.materialComponent.status = newStatus as any; // Cast for now
				project.materialComponent.statusHistory.push(historyEntry);
				updatePayload.materialComponent = project.materialComponent;
			} else {
				return res.status(400).json({ message: 'Invalid component specified for this project.' });
			}

			const updatedProject = await projectsDB.update(projectId, updatePayload);
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
