// gefifi-2/backend/src/services/otp.ts
import { FirestoreCollection } from '../data';
import { OtpSession } from '../interfaces';
import { twilioVerifyService } from './twilio-verify';

// Initialize the FirestoreCollection for OTP sessions using phone number as the document ID
export const otpDB = new FirestoreCollection<OtpSession>('otpSessions');

// E.164 phone number regex check
const PHONE_REGEX = /^\+[1-9]\d{1,14}$/;

export class OtpService {
	/**
	 * Formats and validates the phone number to E.164 format.
	 */
	public validatePhoneNumber(phone: string): boolean {
		return PHONE_REGEX.test(phone);
	}

	/**
	 * Sends an OTP to the given phone number, checking rate-limits / cooldowns.
	 */
	public async sendOtp(phone: string): Promise<{ success: boolean; message: string; cooldownRemaining?: number }> {
		if (!this.validatePhoneNumber(phone)) {
			throw new Error('Invalid phone number format. Must be in E.164 format (e.g. +919999999999).');
		}

		const now = new Date();
		const existingSession = await otpDB.findById(phone);

		if (existingSession) {
			const lastSent = new Date(existingSession.lastSentAt);
			const diffMs = now.getTime() - lastSent.getTime();
			const cooldownMs = 60000; // 1 minute in milliseconds

			if (diffMs < cooldownMs) {
				const remainingSec = Math.ceil((cooldownMs - diffMs) / 1000);
				return {
					success: false,
					message: `Please wait ${remainingSec} seconds before requesting another OTP.`,
					cooldownRemaining: remainingSec
				};
			}
		}

		if (existingSession?.twilioVerificationSid) {
			await twilioVerifyService.cancelVerification(existingSession.twilioVerificationSid);
		}

		let verification;
		try {
			verification = await twilioVerifyService.startSmsVerification(phone);
		} catch (error) {
			console.error(`[OtpService] Failed to start Twilio Verify SMS OTP for ${phone}:`, error);
			throw new Error('SMS delivery failed. Please check the phone number or try again later.');
		}

		// Track app-level OTP session metadata. Twilio owns OTP generation and code validation.
		const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes validity

		const sessionData: OtpSession = {
			id: phone, // Document ID is the phone number
			phoneNumber: phone,
			createdAt: now.toISOString(),
			lastSentAt: now.toISOString(),
			expiresAt: expiresAt.toISOString(),
			attempts: 0,
			resendCount: existingSession ? existingSession.resendCount + 1 : 1,
			twilioVerificationSid: verification.sid,
			twilioStatus: verification.status
		};

		// Write to Firestore (this also replaces old app-level OTP metadata for this phone number)
		await otpDB.create(sessionData);

		return {
			success: true,
			message: 'Verification code sent successfully.'
		};
	}

	/**
	 * Verifies the OTP code for a phone number.
	 */
	public async verifyOtp(phone: string, code: string): Promise<{ valid: boolean; message?: string }> {
		if (!this.validatePhoneNumber(phone)) {
			return { valid: false, message: 'Invalid phone number format.' };
		}

		const session = await otpDB.findById(phone);
		if (!session) {
			return { valid: false, message: 'No active OTP request found for this phone number. Please request a new code.' };
		}

		const now = new Date();
		const expiry = new Date(session.expiresAt);

		// 1. Check expiration
		if (now.getTime() > expiry.getTime()) {
			await otpDB.delete(phone);
			return { valid: false, message: 'Verification code has expired. Please request a new one.' };
		}

		// 2. Check retry attempts limit
		const maxAttempts = 3;
		if (session.attempts >= maxAttempts) {
			await otpDB.delete(phone);
			return { valid: false, message: 'Too many incorrect attempts. Please request a new OTP.' };
		}

		// Increment attempts
		const updatedAttempts = session.attempts + 1;
		await otpDB.update(phone, { attempts: updatedAttempts });

		let verificationCheck;
		try {
			verificationCheck = await twilioVerifyService.checkVerification(phone, code);
		} catch (error) {
			console.error(`[OtpService] Twilio Verify check failed for ${phone}:`, error);
			return { valid: false, message: 'Verification failed. Please try again.' };
		}

		// 3. Check Twilio Verify approval status
		if (verificationCheck.status !== 'approved') {
			const remainingAttempts = maxAttempts - updatedAttempts;
			if (remainingAttempts <= 0) {
				await otpDB.delete(phone);
				return { valid: false, message: 'Too many incorrect attempts. Please request a new OTP.' };
			}
			return {
				valid: false,
				message: `Incorrect code. ${remainingAttempts} attempts remaining.`
			};
		}

		// Success: invalidate OTP by deleting session
		await otpDB.delete(phone);
		return { valid: true };
	}

	/**
	 * Purges expired OTP sessions from Firestore.
	 */
	public async cleanupExpiredOtps(): Promise<number> {
		try {
			const allSessions = await otpDB.getAll();
			const now = new Date().getTime();
			let deleteCount = 0;

			for (const session of allSessions) {
				const expiry = new Date(session.expiresAt).getTime();
				if (now > expiry) {
					if (session.twilioVerificationSid) {
						await twilioVerifyService.cancelVerification(session.twilioVerificationSid);
					}
					await otpDB.delete(session.id);
					deleteCount++;
				}
			}

			if (deleteCount > 0) {
				console.log(`[OtpService] Cleaned up ${deleteCount} expired OTP sessions.`);
			}
			return deleteCount;
		} catch (error) {
			console.error('[OtpService] Error during OTP cleanup:', error);
			return 0;
		}
	}
}

export const otpService = new OtpService();
