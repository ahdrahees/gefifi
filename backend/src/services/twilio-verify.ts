// gefifi-2/backend/src/services/twilio-verify.ts

type TwilioVerification = {
	sid: string;
	status: string;
	to: string;
	channel: string;
};

type TwilioVerificationCheck = {
	sid: string;
	status: string;
	to: string;
	valid?: boolean;
};

/**
 * Twilio Verify SMS OTP service.
 * Uses Twilio's Verify REST API directly to avoid adding an SDK dependency.
 */
export class TwilioVerifyService {
	private accountSid: string;
	private authToken: string;
	private verifyServiceSid: string;
	private apiBaseUrl = 'https://verify.twilio.com/v2';

	constructor() {
		this.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
		this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
		this.verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID || '';

		if (!this.accountSid || !this.authToken || !this.verifyServiceSid) {
			console.warn(
				'[TwilioVerifyService] WARNING: Twilio Verify environment variables are incomplete. SMS OTP delivery will fail.'
			);
		}
	}

	private assertConfigured() {
		if (!this.accountSid || !this.authToken || !this.verifyServiceSid) {
			throw new Error(
				'Twilio Verify is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID.'
			);
		}
	}

	private get authHeader(): string {
		return `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`;
	}

	private async postForm<T>(path: string, body: URLSearchParams): Promise<T> {
		this.assertConfigured();

		const response = await fetch(`${this.apiBaseUrl}${path}`, {
			method: 'POST',
			headers: {
				Authorization: this.authHeader,
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body
		});

		const responseText = await response.text();
		let responseData: any = {};
		if (responseText) {
			try {
				responseData = JSON.parse(responseText);
			} catch {
				responseData = { message: responseText };
			}
		}

		if (!response.ok) {
			const errorMessage =
				responseData?.message || `Twilio Verify request failed with status ${response.status}.`;
			console.error('[TwilioVerifyService] Twilio Verify API error:', {
				status: response.status,
				response: responseData
			});
			throw new Error(errorMessage);
		}

		return responseData as T;
	}

	public async startSmsVerification(phoneNumber: string): Promise<TwilioVerification> {
		const body = new URLSearchParams({
			To: phoneNumber,
			Channel: 'sms'
		});

		console.log(`[TwilioVerifyService] Starting SMS verification for ${phoneNumber}...`);
		return this.postForm<TwilioVerification>(
			`/Services/${this.verifyServiceSid}/Verifications`,
			body
		);
	}

	public async checkVerification(
		phoneNumber: string,
		code: string
	): Promise<TwilioVerificationCheck> {
		const body = new URLSearchParams({
			To: phoneNumber,
			Code: code
		});

		return this.postForm<TwilioVerificationCheck>(
			`/Services/${this.verifyServiceSid}/VerificationCheck`,
			body
		);
	}

	public async cancelVerification(verificationSid: string): Promise<void> {
		if (!verificationSid) return;

		const body = new URLSearchParams({
			Status: 'canceled'
		});

		try {
			await this.postForm<TwilioVerification>(
				`/Services/${this.verifyServiceSid}/Verifications/${verificationSid}`,
				body
			);
		} catch (error) {
			console.warn(
				`[TwilioVerifyService] Failed to cancel previous verification ${verificationSid}:`,
				error
			);
		}
	}
}

export const twilioVerifyService = new TwilioVerifyService();
