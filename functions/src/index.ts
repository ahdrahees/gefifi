import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK.
// It will automatically use the correct credentials in a deployed environment.
// For the emulator, we rely on the GOOGLE_APPLICATION_CREDENTIALS env var.
admin.initializeApp();

// Get Firestore and Storage instances
const db = admin.firestore();
const storage = admin.storage();

// Interface for the function request data
interface SignedUrlRequest {
	path: string;
	chatId?: string; // Optional chatId, can be extracted from path
}

/**
 * A callable Cloud Function to generate time-limited signed URLs for private audio files.
 * This function ensures that only authenticated users who are participants in a specific
 * chat can access the audio messages for that chat.
 */
export const getSignedAudioUrl = functions
	.region('asia-south1') // Specify a region for consistency
	.https.onCall(async (data: SignedUrlRequest, context) => {
		// 1. --- Authentication Check ---
		// Ensure the user is authenticated via Firebase Auth.
		if (!context.auth) {
			throw new functions.https.HttpsError(
				'unauthenticated',
				'User must be authenticated to access audio files.'
			);
		}

		const userId = context.auth.uid;
		const { path } = data;

		// 2. --- Input Validation ---
		// Ensure the file path is provided and is a non-empty string.
		if (!path || typeof path !== 'string' || path.trim() === '') {
			throw new functions.https.HttpsError(
				'invalid-argument',
				'The "path" argument is required and must be a non-empty string.'
			);
		}

		// The path should be in the format 'chatId/messageId.extension'.
		// We extract the chatId from the path for security verification.
		const pathParts = path.split('/');
		if (pathParts.length < 2) {
			throw new functions.https.HttpsError(
				'invalid-argument',
				'The "path" must be in the format "chatId/fileName".'
			);
		}
		const extractedChatId = pathParts[0];

		try {
			// 3. --- Authorization Check ---
			// Verify that the authenticated user is a participant in the requested chat.
			// This is the critical security step.
			const chatDoc = await db.collection('chats').doc(extractedChatId).get();

			if (!chatDoc.exists) {
				throw new functions.https.HttpsError('not-found', 'Chat not found.');
			}

			const chatData = chatDoc.data();
			if (!chatData?.participants?.includes(userId)) {
				// If the user is not in the chat's participant list, deny access.
				throw new functions.https.HttpsError(
					'permission-denied',
					'You are not a participant in this chat.'
				);
			}

			// 4. --- Signed URL Generation ---
			// Get the bucket name from the environment configuration.
			// In production, this uses the config set via `firebase functions:config:set`.
			// In the emulator, it falls back to the .env file (`process.env`).
			const bucketName =
				functions.config().gefifi?.gcs_audio_bucket_name || process.env.GCS_AUDIO_BUCKET_NAME;

			if (!bucketName) {
				functions.logger.error(
					"GCS_AUDIO_BUCKET_NAME is not configured. Deploy with 'firebase functions:config:set gefifi.gcs_audio_bucket_name=...'"
				);
				throw new functions.https.HttpsError('internal', 'Server configuration error.');
			}

			const bucket = storage.bucket(bucketName);
			const file = bucket.file(path);

			// Check if the file actually exists in the bucket before generating a URL.
			const [exists] = await file.exists();
			if (!exists) {
				throw new functions.https.HttpsError(
					'not-found',
					'The requested audio file does not exist.'
				);
			}

			// Generate a signed URL that is valid for 15 minutes.
			const expirationTime = Date.now() + 15 * 60 * 1000; // 15 minutes
			const [url] = await file.getSignedUrl({
				action: 'read',
				expires: expirationTime
			});

			// Log the successful generation for debugging purposes.
			functions.logger.info(`Generated signed URL for user ${userId} for path ${path}`);

			// Return the signed URL and its expiration date to the client.
			return {
				url,
				expiresAt: new Date(expirationTime).toISOString()
			};
		} catch (error: unknown) {
			// Log the detailed error on the server for debugging.
			functions.logger.error(
				`Error generating signed URL for user ${userId} and path ${path}:`,
				error
			);

			// If it's an error we've already thrown, re-throw it.
			if (error instanceof functions.https.HttpsError) {
				throw error;
			}

			// For any other unexpected errors, throw a generic internal error
			// to avoid exposing implementation details to the client.
			throw new functions.https.HttpsError(
				'internal',
				'An unexpected error occurred while trying to access the audio file.'
			);
		}
	});
