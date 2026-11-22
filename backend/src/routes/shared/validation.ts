import { User, UserProfile } from '../../interfaces';

// --- Helper: Validate User Profile based on UserType ---
export const validateProfileData = (
	profile: Partial<UserProfile> | null | undefined,
	userType: User['userType']
): { valid: boolean; message?: string; validatedProfile: UserProfile } => {
	if (!profile || typeof profile !== 'object') {
		return { valid: true, validatedProfile: {} };
	}

	const validatedProfile: UserProfile = {};

	// Keep empty strings: the profile form uses them to clear optional fields.
	// Omitting a field still preserves the existing value.
	if (profile.fullName !== undefined && typeof profile.fullName === 'string')
		validatedProfile.fullName = profile.fullName;
	if (profile.phoneNumber !== undefined && typeof profile.phoneNumber === 'string')
		validatedProfile.phoneNumber = profile.phoneNumber;
	if (profile.location !== undefined && typeof profile.location === 'string')
		validatedProfile.location = profile.location;
	if (profile.avatarUrl !== undefined && typeof profile.avatarUrl === 'string')
		validatedProfile.avatarUrl = profile.avatarUrl;

	switch (userType) {
		case 'expert':
			if (profile.expertise !== undefined && typeof profile.expertise === 'string')
				validatedProfile.expertise = profile.expertise;
			if (profile.experience !== undefined && typeof profile.experience === 'string')
				validatedProfile.experience = profile.experience;
			break;
		case 'supplier':
			if (profile.companyName !== undefined && typeof profile.companyName === 'string')
				validatedProfile.companyName = profile.companyName;
			if (profile.category !== undefined && typeof profile.category === 'string')
				validatedProfile.category = profile.category;
			if (profile.experience !== undefined && typeof profile.experience === 'string')
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
