// gefifi-2/backend/src/file-storage.ts
import { Storage } from '@google-cloud/storage';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import crypto from 'crypto';

// --- Configuration ---
const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME;
const NODE_ENV = process.env.NODE_ENV || 'development';
const localUploadsDir = path.join(__dirname, '..', 'uploads');

// --- Lazy Initializer for GCS Client ---
let storage: Storage | null = null;

/**
 * Gets a singleton instance of the GCS client.
 * Initializes the client on the first call, which is safer for environments
 * like Cloud Run where env vars might not be immediately available on script load.
 * @returns The GCS client instance.
 */
function getStorageClient(): Storage {
	if (!storage) {
		console.log('[FileStorage] GCS client not initialized. Creating new instance...');
		if (NODE_ENV === 'production' && !GCS_BUCKET_NAME) {
			throw new Error('[FileStorage] GCS_BUCKET_NAME must be set in production environment.');
		}
		// In a GCP environment (like Cloud Run), the Storage client automatically
		// finds the necessary credentials from the environment.
		storage = new Storage();
		console.log('[FileStorage] GCS client instance created successfully.');
	}
	return storage;
}

// Ensure local uploads directory exists for development
if (NODE_ENV === 'development' && !fs.existsSync(localUploadsDir)) {
	fs.mkdirSync(localUploadsDir, { recursive: true });
	console.log(`[FileStorage] Created local uploads directory at: ${localUploadsDir}`);
}

const writeFileAsync = promisify(fs.writeFile);

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

	if (NODE_ENV === 'production') {
		// In production, upload to GCS using the lazy-loaded client
		const gcsClient = getStorageClient();
		if (!GCS_BUCKET_NAME) {
			throw new Error('[FileStorage] GCS_BUCKET_NAME is not set for production upload.');
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
	} else {
		// In development, save to local disk
		const localFilePath = path.join(localUploadsDir, uniqueFilename);
		await writeFileAsync(localFilePath, file.buffer);
		const filePath = `/uploads/${uniqueFilename}`; // The URL path
		return { filePath, fileName: uniqueFilename };
	}
};
