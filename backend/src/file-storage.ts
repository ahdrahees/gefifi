// gefifi-2/backend/src/file-storage.ts
import { Storage } from '@google-cloud/storage';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import crypto from 'crypto';

// --- Configuration ---

const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME;
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Define the local storage path
const localUploadsDir = path.join(__dirname, '..', 'uploads');

// Ensure local uploads directory exists
if (NODE_ENV === 'development' && !fs.existsSync(localUploadsDir)) {
  fs.mkdirSync(localUploadsDir, { recursive: true });
  console.log(`[FileStorage] Created local uploads directory at: ${localUploadsDir}`);
}

// --- Initialize Google Cloud Storage Client (only in production) ---

let storage: Storage | null = null;
if (NODE_ENV === 'production') {
  if (!GCS_BUCKET_NAME || !GCP_PROJECT_ID) {
    console.error('[FileStorage] FATAL ERROR: GCS_BUCKET_NAME and GCP_PROJECT_ID must be set in production environment.');
    // In a real app, you might throw an error to prevent the server from starting.
    // throw new Error('Missing GCS configuration for production.');
  } else {
    try {
      // The Storage constructor will automatically use the service account credentials
      // if the GOOGLE_APPLICATION_CREDENTIALS environment variable is set in your hosting provider,
      // or if it finds the gcp-credentials.json file when running locally in a simulated prod env.
      storage = new Storage({
        projectId: GCP_PROJECT_ID,
      });
      console.log('[FileStorage] Google Cloud Storage client initialized for production.');
    } catch (error) {
      console.error('[FileStorage] FATAL ERROR: Could not initialize Google Cloud Storage client.', error);
      storage = null;
    }
  }
} else {
  console.log(`[FileStorage] Running in '${NODE_ENV}' mode. Using local file storage.`);
}

const writeFileAsync = promisify(fs.writeFile);

/**
 * Generates a unique filename while preserving the extension.
 * @param originalName The original name of the uploaded file.
 * @returns A unique filename string.
 */
const generateUniqueFilename = (originalName: string): string => {
  const extension = path.extname(originalName);
  const randomString = crypto.randomBytes(16).toString('hex');
  return `${Date.now()}-${randomString}${extension}`;
};


// --- Local Storage Implementation ---

/**
 * Saves a file to the local disk in the /uploads directory.
 * @param file The file buffer from multer.
 * @returns The publicly accessible path to the file.
 */
const uploadToLocalDisk = async (file: Express.Multer.File): Promise<string> => {
  const uniqueFilename = generateUniqueFilename(file.originalname);
  const localFilePath = path.join(localUploadsDir, uniqueFilename);

  await writeFileAsync(localFilePath, file.buffer);

  // Return the public URL path
  return `/uploads/${uniqueFilename}`;
};


// --- Google Cloud Storage Implementation ---

/**
 * Uploads a file to the configured GCS bucket.
 * @param file The file buffer from multer.
 * @returns The fully qualified public URL to the file on GCS.
 */
const uploadToGCS = async (file: Express.Multer.File): Promise<string> => {
    if (!storage || !GCS_BUCKET_NAME) {
        throw new Error('[FileStorage] GCS is not initialized. Cannot upload file.');
    }
    const bucket = storage.bucket(GCS_BUCKET_NAME);
    const uniqueFilename = generateUniqueFilename(file.originalname);
    const blob = bucket.file(uniqueFilename);

    const blobStream = blob.createWriteStream({
        resumable: false,
        contentType: file.mimetype,
    });

    return new Promise((resolve, reject) => {
        blobStream.on('error', (err) => {
            console.error('[FileStorage] GCS Upload Error:', err);
            reject(new Error('Failed to upload file to Google Cloud Storage.'));
        });

        blobStream.on('finish', () => {
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
            console.log(`[FileStorage] File uploaded to GCS: ${publicUrl}`);
            resolve(publicUrl);
        });

        blobStream.end(file.buffer);
    });
};


// --- Public API ---

/**
 * The main file upload handler.
 * It determines whether to use local storage or GCS based on the NODE_ENV.
 * @param file The file object from multer (Express.Multer.File).
 * @returns An object containing the public URL (`filePath`) and the `fileName`.
 */
export const uploadFile = async (file: Express.Multer.File): Promise<{ filePath: string; fileName: string }> => {
  if (!file) {
    throw new Error('No file provided for upload.');
  }

  let filePath: string;
  const fileName = generateUniqueFilename(file.originalname); // Generate once

  if (NODE_ENV === 'production' && storage) {
      // In production, upload to GCS
      const gcsBlob = storage.bucket(GCS_BUCKET_NAME!).file(fileName);
      const blobStream = gcsBlob.createWriteStream({
          resumable: false,
          contentType: file.mimetype,
      });

      await new Promise<void>((resolve, reject) => {
          blobStream.on('error', reject);
          blobStream.on('finish', () => resolve());
          blobStream.end(file.buffer);
      });

      filePath = `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${fileName}`;

  } else {
      // In development, save to local disk
      const localFilePath = path.join(localUploadsDir, fileName);
      await writeFileAsync(localFilePath, file.buffer);
      filePath = `/uploads/${fileName}`; // The URL path
  }

  return { filePath, fileName };
};
