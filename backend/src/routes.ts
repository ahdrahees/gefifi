import { Router, Request, Response } from 'express';
import { FirestoreCollection } from './data';
import { User, UserProfile, WorkRequest, Chat, Message, Contract } from './interfaces';
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
					(!workRequestId || chat.workRequestId === workRequestId)
			);

			const now = new Date().toISOString();

			if (!existingChat) {
				const chatId = crypto.randomUUID();
				const newChat: Chat = {
					id: chatId,
					participants: [sender.id, targetUserId].sort(),
					workRequestId: workRequestId,
					createdAt: now,
					updatedAt: now
				};
				existingChat = await chatsDB.create(newChat);
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
			// Destructure content and optionally images from request body
			const { content, images }: { content?: string; images?: string[] } = req.body;

			// Validate that either content or images are provided and correctly formatted
			const hasValidContent = content && typeof content === 'string' && content.trim() !== '';
			const hasValidImages =
				images &&
				Array.isArray(images) &&
				images.length > 0 &&
				images.every((img: string) => typeof img === 'string');

			if (!hasValidContent && !hasValidImages) {
				return res.status(400).json({ message: 'Message content or images are required.' });
			}
			// If images are provided, but not in the correct format (e.g. not an array of strings)
			if (images && Array.isArray(images) && images.length > 0 && !hasValidImages) {
				return res.status(400).json({
					message:
						'Images must be an array of strings (file paths) and cannot be empty strings if the array is not empty.'
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
			const messageId = crypto.randomUUID();
			const newMessage: Message = {
				id: messageId,
				chatId: chatId,
				senderId: user.id,
				content: content || '', // Use provided content, or empty string if only images are sent
				images: images && hasValidImages ? images : [], // Use validated images, or an empty array
				timestamp: now
			};
			const createdMessage = await messagesDB.create(newMessage);
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
			const allMessages = await messagesDB.getAll();
			const chatMessages = allMessages
				.filter((msg: Message) => msg.chatId === chatId)
				.sort(
					(a: Message, b: Message) =>
						new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
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
			customerId,
			expertSupplierId,
			workDetails,
			agreementSummary,
			contractDate
		} = req.body;

		if (!workRequestId || !customerId || !expertSupplierId || !workDetails || !agreementSummary) {
			return res.status(400).json({
				message:
					'workRequestId, customerId, expertSupplierId, workDetails, and agreementSummary are required.'
			});
		}
		const workRequest = await workRequestsDB.findById(workRequestId);
		if (!workRequest)
			return res.status(404).json({ message: `Work request with ID ${workRequestId} not found.` });
		if (workRequest.customerId !== customerId) {
			return res
				.status(400)
				.json({ message: 'Mismatch: workRequest.customerId does not match provided customerId.' });
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

		const newContract: Contract = {
			id: contractId,
			workRequestId,
			customerId,
			expertSupplierId,
			workDetails,
			agreementSummary,
			contractDate: contractDate || now,
			customerSigned: initialCustomerSigned,
			expertSupplierSigned: initialExpertSupplierSigned,
			status: initialStatus,
			createdAt: now,
			updatedAt: now
		};

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
		const createdContract = await contractsDB.create(newContract);
		console.log(
			'[POST /api/contracts] Successfully created contract in DB, ID:',
			createdContract.id
		);

		if (
			workRequest.status === 'in_discussion' ||
			workRequest.status === 'open' ||
			workRequest.status === 'awaiting_quotes'
		) {
			console.log(
				`[POST /api/contracts] Updating work request ${workRequest.id} status to 'contracted'.`
			);
			await workRequestsDB.update(workRequest.id, { status: 'contracted', updatedAt: now });
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
				} else {
					updates.status = 'awaiting_signatures';
				}
				const updatedContract = await contractsDB.update(contractId, updates);
				res.status(200).json(updatedContract);
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

console.log('API routes module (routes.ts) initialized with core endpoints.');
export default router;
