import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Get Firestore and Storage instances
const db = admin.firestore();
const storage = admin.storage();

// Interface for the function request data
interface SignedUrlRequest {
	path: string;
	chatId?: string;
}

/**
 * Cloud Function to generate signed URLs for audio files.
 * This is a callable function, invoked directly from the frontend client SDK.
 */
export const getSignedAudioUrl = functions
	.region('us-central1')
	.https.onCall(async (data: SignedUrlRequest, context) => {
		// 1. Check authentication
		if (!context.auth) {
			throw new functions.https.HttpsError(
				'unauthenticated',
				'User must be authenticated to access audio files.'
			);
		}

		const userId = context.auth.uid;
		const { path, chatId } = data;

		// 2. Validate input data
		if (!path || typeof path !== 'string') {
			throw new functions.https.HttpsError(
				'invalid-argument',
				'File path is required and must be a string.'
			);
		}

		// Extract chatId from path if not provided
		let extractedChatId = chatId;
		if (!extractedChatId) {
			const pathParts = path.split('/');
			if (pathParts.length >= 2) {
				extractedChatId = pathParts[0];
			}
		}

		if (!extractedChatId) {
			throw new functions.https.HttpsError(
				'invalid-argument',
				'Chat ID could not be determined from the file path.'
			);
		}

		try {
			// 3. Verify user is a participant in the chat
			const chatDoc = await db.collection('chats').doc(extractedChatId).get();

			if (!chatDoc.exists) {
				throw new functions.https.HttpsError('not-found', 'Chat not found.');
			}

			const chatData = chatDoc.data();
			if (!chatData?.participants?.includes(userId)) {
				throw new functions.https.HttpsError(
					'permission-denied',
					'User is not a participant in this chat.'
				);
			}

			// 4. Generate signed URL
			const bucketName = process.env.GCS_AUDIO_BUCKET_NAME || 'gefifi-audio-messages';
			const bucket = storage.bucket(bucketName);
			const file = bucket.file(path);

			const [exists] = await file.exists();
			if (!exists) {
				throw new functions.https.HttpsError('not-found', 'Audio file not found.');
			}

			const expirationTime = Date.now() + 15 * 60 * 1000; // 15 minutes
			const [url] = await file.getSignedUrl({
				action: 'read',
				expires: expirationTime
			});

			functions.logger.info('Generated signed URL for audio file', {
				userId,
				chatId: extractedChatId,
				path,
				expiresAt: new Date(expirationTime).toISOString()
			});

			return {
				url,
				expiresAt: new Date(expirationTime).toISOString()
			};
		} catch (error) {
			functions.logger.error('Error generating signed audio URL', {
				userId,
				chatId: extractedChatId,
				path,
				error: error instanceof Error ? error.message : String(error)
			});

			if (error instanceof functions.https.HttpsError) {
				throw error;
			}

			throw new functions.https.HttpsError(
				'internal',
				'Failed to generate signed URL for audio file.'
			);
		}
	});
