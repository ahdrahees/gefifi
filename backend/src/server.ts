import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import admin from 'firebase-admin';

// --- Firebase Admin SDK Initialization ---
// This needs to be done once when the server starts.
// The SDK will automatically find the credentials in a GCP environment.
// For local development, you need to have the GOOGLE_APPLICATION_CREDENTIALS
// environment variable set to the path of your service account key file.

// Conditionally load .env file in development BEFORE Firebase init
if (process.env.NODE_ENV !== 'production') {
	dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
}

try {
	// Check if we're in development and have a credentials file
	const credentialsPath = path.resolve(__dirname, '..', 'gcp-credentials.json');
	const hasCredentialsFile = fs.existsSync(credentialsPath);

	if (process.env.NODE_ENV !== 'production' && hasCredentialsFile) {
		// Use service account key file for local development
		admin.initializeApp({
			credential: admin.credential.cert(credentialsPath),
			projectId: process.env.FIREBASE_PROJECT_ID || process.env.GCP_PROJECT_ID
		});
		console.log('[Firebase Admin] SDK initialized successfully with service account key.');
	} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
		// Use GOOGLE_APPLICATION_CREDENTIALS environment variable
		admin.initializeApp({
			credential: admin.credential.applicationDefault(),
			projectId: process.env.FIREBASE_PROJECT_ID || process.env.GCP_PROJECT_ID
		});
		console.log(
			'[Firebase Admin] SDK initialized successfully with application default credentials.'
		);
	} else {
		// Try application default (works in GCP environments)
		admin.initializeApp({
			credential: admin.credential.applicationDefault(),
			projectId: process.env.FIREBASE_PROJECT_ID || process.env.GCP_PROJECT_ID
		});
		console.log('[Firebase Admin] SDK initialized successfully with default credentials.');
	}
} catch (error) {
	console.error('[Firebase Admin] Initialization failed:', error);
	console.log('[Firebase Admin] Troubleshooting tips:');
	console.log('1. Make sure gcp-credentials.json exists in the backend directory');
	console.log('2. Or set GOOGLE_APPLICATION_CREDENTIALS environment variable');
	console.log('3. Or run in a GCP environment with default credentials');
	console.log('4. Ensure FIREBASE_PROJECT_ID or GCP_PROJECT_ID is set in .env');
}

// --- DIAGNOSTIC LOGGING ---
console.log('--- Cloud Run Environment Diagnosis ---');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`PORT: ${process.env.PORT}`);
console.log(`GCP_PROJECT_ID: ${process.env.GCP_PROJECT_ID}`);
console.log(`GCS_BUCKET_NAME: ${process.env.GCS_BUCKET_NAME}`);
console.log(`JWT_SECRET is set: ${!!process.env.JWT_SECRET}`);
console.log('--- END DIAGNOSTIC LOGGING ---');

// .env file is now loaded before Firebase initialization above

// Import API routes
import apiRoutes, { chatFileUpload } from './routes';
import { uploadFile, uploadAudioFile, uploadChatAttachment } from './file-storage';

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// --- File Upload Setup (Multer) ---
// We use memoryStorage() because our file-storage service handles uploading to GCS
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 10 * 1024 * 1024 } // Optional: Limit file size (e.g., 10MB)
});

// Multer configuration for audio files (voice messages)
const audioUpload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 25 * 1024 * 1024, // 25MB limit for audio files
		files: 1 // Only one file at a time
	},
	fileFilter: (req, file, cb) => {
		// Accept only audio files
		if (file.mimetype.startsWith('audio/')) {
			cb(null, true);
		} else {
			cb(new Error('Only audio files are allowed for voice messages.'));
		}
	}
});

// No local file serving needed - all files are stored in GCS buckets

// --- Basic Routes ---
app.get('/', (req: Request, res: Response) => {
	res.send('GEFIFI Backend Server is running!');
});

// --- API Routes ---
// Mount the imported API routes from routes.ts under the /api prefix
app.use('/api', apiRoutes);

// --- File Upload Endpoint ---
// This endpoint now uses our file-storage service to handle the upload.
app.post('/api/upload', upload.single('file'), async (req: Request, res: Response) => {
	try {
		if (!req.file) {
			return res.status(400).json({ message: 'No file uploaded. Please select a file to upload.' });
		}

		// The file-storage service handles whether to save locally or to GCS
		const { filePath, fileName } = await uploadFile(req.file);

		res.status(200).json({
			message: 'File uploaded successfully!',
			filePath: filePath, // This is now a full URL in production, or a relative path in dev
			fileName: fileName,
			originalName: req.file.originalname,
			mimeType: req.file.mimetype,
			size: req.file.size
		});
	} catch (error: unknown) {
		console.error('File upload endpoint error:', error);
		const message =
			error instanceof Error ? error.message : 'An unknown error occurred during file upload.';
		res.status(500).json({ message });
	}
});

// --- Voice Message Upload Endpoint ---
app.post(
	'/api/chat/:chatId/upload-voice',
	audioUpload.single('voice'),
	async (req: Request, res: Response) => {
		try {
			if (!req.file) {
				return res
					.status(400)
					.json({ message: 'No voice message uploaded. Please select an audio file.' });
			}

			const { chatId } = req.params;
			const { messageId } = req.body;

			if (!chatId || !messageId) {
				return res
					.status(400)
					.json({ message: 'ChatId and messageId are required for voice upload.' });
			}

			// Upload the audio file to the dedicated audio bucket
			const { filePath, fileName } = await uploadAudioFile(req.file, chatId, messageId);

			res.status(200).json({
				message: 'Voice message uploaded successfully!',
				filePath: filePath, // Private GCS path or local path
				fileName: fileName,
				originalName: req.file.originalname,
				mimeType: req.file.mimetype,
				size: req.file.size,
				chatId: chatId,
				messageId: messageId
			});
		} catch (error: unknown) {
			console.error('Voice upload endpoint error:', error);
			const message =
				error instanceof Error ? error.message : 'An unknown error occurred during voice upload.';
			res.status(500).json({ message });
		}
	}
);

// --- Chat File Attachment Upload Endpoint ---
app.post(
	'/api/chat/:chatId/upload-file',
	chatFileUpload.single('file'),
	async (req: Request, res: Response) => {
		try {
			if (!req.file) {
				return res
					.status(400)
					.json({ message: 'No file uploaded. Please select a file to upload.' });
			}

			const { chatId } = req.params;
			const { messageId } = req.body;

			console.log('🔍 [DEBUG] Chat file upload - chatId:', chatId, 'messageId from body:', messageId);

			if (!chatId) {
				return res
					.status(400)
					.json({ message: 'ChatId is required for file upload.' });
			}

			// Upload the file to the chat attachments bucket
			const { filePath, fileName, messageId: generatedMessageId } = await uploadChatAttachment(req.file, chatId, messageId);
			console.log('🔍 [DEBUG] Upload result - generatedMessageId:', generatedMessageId, 'fileName:', fileName);

			res.status(200).json({
				message: 'File uploaded successfully!',
				filePath: filePath, // Public GCS URL
				fileName: fileName,
				originalName: req.file.originalname,
				mimeType: req.file.mimetype,
				size: req.file.size,
				chatId: chatId,
				messageId: generatedMessageId
			});
		} catch (error: unknown) {
			console.error('Chat file upload endpoint error:', error);
			const message =
				error instanceof Error ? error.message : 'An unknown error occurred during file upload.';

			// Handle multer errors
			if (message.includes('File type not allowed')) {
				return res.status(400).json({ message });
			}
			if (message.includes('File too large')) {
				return res.status(400).json({ message: 'File too large. Maximum file size is 30MB.' });
			}

			res.status(500).json({ message });
		}
	}
);

// --- Error Handling Middleware (Basic) ---
// This should be one of the last middleware functions added.
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
	console.error('Global error handler:', err.stack);
	// If the error is from Multer (e.g., file too large, wrong file type)
	if (err instanceof multer.MulterError) {
		if (err.code === 'LIMIT_FILE_SIZE') {
			return res
				.status(400)
				.json({ message: 'File too large. Maximum size is 25MB for voice messages.' });
		}
		return res.status(400).json({ message: `File upload error: ${err.message}` });
	}
	// For other errors
	res.status(500).json({ message: 'An unexpected error occurred on the server.' });
});

// --- Test Audio Storage Endpoint ---
app.get('/api/test-audio-storage', async (req: Request, res: Response) => {
	try {
		console.log('[Test] Testing audio storage configuration...');
		console.log(`[Test] GCS_AUDIO_BUCKET_NAME: ${process.env.GCS_AUDIO_BUCKET_NAME}`);
		console.log(`[Test] FIREBASE_PROJECT_ID: ${process.env.FIREBASE_PROJECT_ID}`);

		// This will trigger the lazy initialization of the audio storage client
		const testPath = 'test-chat/test-message.webm';
		console.log(`[Test] Testing signed URL generation for path: ${testPath}`);

		// Import the function here to avoid early initialization
		const { getSignedAudioUrl } = await import('./file-storage');

		try {
			const signedUrl = await getSignedAudioUrl(testPath, 1);
			console.log('[Test] ✅ Audio storage client initialized successfully!');
			res.status(200).json({
				success: true,
				message: 'Audio storage is configured correctly',
				bucketName: process.env.GCS_AUDIO_BUCKET_NAME,
				projectId: process.env.FIREBASE_PROJECT_ID,
				testSignedUrl: signedUrl.substring(0, 100) + '...' // Show partial URL for security
			});
		} catch (storageError) {
			console.error('[Test] ❌ Audio storage configuration error:', storageError);
			res.status(500).json({
				success: false,
				message: 'Audio storage configuration issue',
				error: storageError instanceof Error ? storageError.message : 'Unknown error',
				bucketName: process.env.GCS_AUDIO_BUCKET_NAME,
				projectId: process.env.FIREBASE_PROJECT_ID
			});
		}
	} catch (error) {
		console.error('[Test] Test endpoint error:', error);
		res.status(500).json({
			success: false,
			message: 'Test endpoint error',
			error: error instanceof Error ? error.message : 'Unknown error'
		});
	}
});

// --- Test GCP Bucket Upload Endpoint ---
app.post(
	'/api/test-gcp-upload',
	audioUpload.single('voice'),
	async (req: Request, res: Response) => {
		try {
			if (!req.file) {
				return res.status(400).json({ message: 'No audio file provided for GCP upload test.' });
			}

			console.log('[Test GCP] Testing direct GCP bucket upload...');
			console.log(`[Test GCP] File: ${req.file.originalname}, Size: ${req.file.size} bytes`);

			const testChatId = 'test-chat-' + Date.now();
			const testMessageId = 'test-message-' + Date.now();

			// Import the function here
			const { uploadAudioFile } = await import('./file-storage');

			// No need to force production mode - always uploads to GCS now
			const { filePath, fileName } = await uploadAudioFile(req.file, testChatId, testMessageId);
			console.log('[Test GCP] ✅ File uploaded to GCP bucket successfully!');
			console.log(`[Test GCP] File path: ${filePath}`);

			res.status(200).json({
				success: true,
				message: 'File uploaded to GCP bucket successfully',
				filePath: filePath,
				fileName: fileName,
				bucketName: process.env.GCS_AUDIO_BUCKET_NAME,
				chatId: testChatId,
				messageId: testMessageId
			});
		} catch (error) {
			console.error('[Test GCP] Upload error:', error);
			res.status(500).json({
				success: false,
				message: 'GCP upload test failed',
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	}
);

// --- Start Server ---
// Listen on all network interfaces in containers.
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
app.listen(Number(PORT), HOST, () => {
	console.log(`Server is running on http://${HOST}:${PORT}`);
	console.log(`Current environment: ${process.env.NODE_ENV || 'development'}`);
	if (process.env.NODE_ENV !== 'production') {
		console.log(`Attempting to load .env file from: ${path.resolve(__dirname, '..', '.env')}`);
	}
});

export default app; // Export app for potential serverless deployment or testing
