// gefifi-2/backend/src/file-storage.ts
import { Storage } from '@google-cloud/storage';
import path from 'path';
import crypto from 'crypto';

// --- Configuration ---
const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME;
const GCS_AUDIO_BUCKET_NAME = process.env.GCS_AUDIO_BUCKET_NAME;

// --- Lazy Initializer for GCS Client ---
let storage: Storage | null = null;
let audioStorage: Storage | null = null;

/**
 * Gets a singleton instance of the GCS client.
 * Initializes the client on the first call, which is safer for environments
 * like Cloud Run where env vars might not be immediately available on script load.
 * @returns The GCS client instance.
 */
function getStorageClient(): Storage {
	if (!storage) {
		console.log('[FileStorage] GCS client not initialized. Creating new instance...');
		if (!GCS_BUCKET_NAME) {
			throw new Error('[FileStorage] GCS_BUCKET_NAME must be set.');
		}

		const options: { projectId?: string; apiEndpoint?: string } = {
			projectId: process.env.GCP_PROJECT_ID || process.env.FIREBASE_PROJECT_ID
		};

		// If running in a development environment and the Storage emulator host is set,
		// connect to the emulator.
		if (process.env.NODE_ENV !== 'production' && process.env.STORAGE_EMULATOR_HOST) {
			console.log(
				`[FileStorage] Connecting to GCS Emulator at ${process.env.STORAGE_EMULATOR_HOST}`
			);
			// The gcloud-node library expects the full URL, including the protocol.
			// It doesn't need host/port separated like Firestore.
			options.apiEndpoint = `http://${process.env.STORAGE_EMULATOR_HOST}`;
		}

		storage = new Storage(options);
		console.log('[FileStorage] GCS client instance created successfully.');
	}
	return storage;
}

/**
 * Gets a singleton instance of the GCS client for audio files.
 * @returns The GCS client instance for audio storage.
 */
function getAudioStorageClient(): Storage {
	if (!audioStorage) {
		console.log('[FileStorage] Audio GCS client not initialized. Creating new instance...');
		if (!GCS_AUDIO_BUCKET_NAME) {
			throw new Error('[FileStorage] GCS_AUDIO_BUCKET_NAME must be set.');
		}

		const options: { projectId?: string; apiEndpoint?: string } = {
			projectId: process.env.GCP_PROJECT_ID || process.env.FIREBASE_PROJECT_ID
		};

		// If running in a development environment and the Storage emulator host is set,
		// connect to the emulator.
		if (process.env.NODE_ENV !== 'production' && process.env.STORAGE_EMULATOR_HOST) {
			console.log(
				`[FileStorage] Connecting to Audio GCS Emulator at ${process.env.STORAGE_EMULATOR_HOST}`
			);
			options.apiEndpoint = `http://${process.env.STORAGE_EMULATOR_HOST}`;
		}

		audioStorage = new Storage(options);
		console.log('[FileStorage] Audio GCS client instance created successfully.');
	}
	return audioStorage;
}

// No local directories needed - always use GCP buckets

// Remove writeFileAsync as we no longer use local file storage

const generateUniqueFilename = (originalName: string): string => {
	const extension = path.extname(originalName);
	const randomString = crypto.randomBytes(16).toString('hex');
	return `${Date.now()}-${randomString}${extension}`;
};

/**
 * The main file upload handler.
 * It determines whether to use local storage or GCS based on the NODE_ENV.
 * @param file The file object from multer (Express.Multer.File).
 * @returns An object containing the public URL (`filePath`) and the `fileName`.
 */
export const uploadFile = async (
	file: Express.Multer.File
): Promise<{ filePath: string; fileName: string }> => {
	if (!file) {
		throw new Error('No file provided for upload.');
	}

	const uniqueFilename = generateUniqueFilename(file.originalname);

	// Always upload to GCS (both development and production)
	const gcsClient = getStorageClient();
	if (!GCS_BUCKET_NAME) {
		throw new Error('[FileStorage] GCS_BUCKET_NAME is not set.');
	}
	const bucket = gcsClient.bucket(GCS_BUCKET_NAME);
	const blob = bucket.file(uniqueFilename);

	const blobStream = blob.createWriteStream({
		resumable: false,
		contentType: file.mimetype
	});

	await new Promise<void>((resolve, reject) => {
		blobStream.on('error', (err) => {
			console.error('[FileStorage] GCS Upload Error:', err);
			reject(new Error('Failed to upload file to Google Cloud Storage.'));
		});
		blobStream.on('finish', () => {
			resolve();
		});
		blobStream.end(file.buffer);
	});

	const filePath = `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${uniqueFilename}`;
	return { filePath, fileName: uniqueFilename };
};

/**
 * Uploads an audio file for voice messages.
 * Files are organized by chatId in separate folders.
 * @param file The audio file object from multer.
 * @param chatId The ID of the chat this audio belongs to.
 * @param messageId The ID of the message (used for filename).
 * @returns An object containing the private storage path and the fileName.
 */
export const uploadAudioFile = async (
	file: Express.Multer.File,
	chatId: string,
	messageId: string
): Promise<{ filePath: string; fileName: string }> => {
	if (!file) {
		throw new Error('No audio file provided for upload.');
	}

	if (!chatId || !messageId) {
		throw new Error('ChatId and messageId are required for audio upload.');
	}

	// Validate audio file
	if (!file.mimetype.startsWith('audio/')) {
		throw new Error('File must be an audio file.');
	}

	// Generate filename: <messageId>.webm
	const fileExtension =
		file.mimetype === 'audio/webm' ? '.webm' : file.mimetype === 'audio/ogg' ? '.ogg' : '.webm';
	const fileName = `${messageId}${fileExtension}`;
	const chatFolderPath = `${chatId}/${fileName}`;

	// Always upload to GCS audio bucket (both development and production)
	const gcsClient = getAudioStorageClient();
	if (!GCS_AUDIO_BUCKET_NAME) {
		throw new Error('[FileStorage] GCS_AUDIO_BUCKET_NAME is not set.');
	}

	const bucket = gcsClient.bucket(GCS_AUDIO_BUCKET_NAME);
	const blob = bucket.file(chatFolderPath);

	const blobStream = blob.createWriteStream({
		resumable: false,
		contentType: file.mimetype,
		metadata: {
			metadata: {
				chatId: chatId,
				messageId: messageId,
				uploadedAt: new Date().toISOString()
			}
		}
	});

	await new Promise<void>((resolve, reject) => {
		blobStream.on('error', (err) => {
			console.error('[FileStorage] Audio GCS Upload Error:', err);
			reject(new Error('Failed to upload audio file to Google Cloud Storage.'));
		});
		blobStream.on('finish', () => {
			resolve();
		});
		blobStream.end(file.buffer);
	});

	// Return the private GCS path (not a public URL)
	const filePath = chatFolderPath;
	return { filePath, fileName };
};

/**
 * Generates a signed URL for accessing a private audio file.
 * @param filePath The private GCS path of the audio file.
 * @param expirationMinutes The number of minutes until the URL expires (default: 15).
 * @returns The signed URL for accessing the file.
 */
export const getSignedAudioUrl = async (
	filePath: string,
	expirationMinutes: number = 15
): Promise<string> => {
	// Always use GCS signed URLs (both development and production)
	const gcsClient = getAudioStorageClient();
	if (!GCS_AUDIO_BUCKET_NAME) {
		throw new Error('[FileStorage] GCS_AUDIO_BUCKET_NAME is not set for signed URL generation.');
	}

	const bucket = gcsClient.bucket(GCS_AUDIO_BUCKET_NAME);
	const file = bucket.file(filePath);

	const [url] = await file.getSignedUrl({
		action: 'read',
		expires: Date.now() + expirationMinutes * 60 * 1000
	});

	return url;
};
