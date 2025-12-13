
/**
 * Generates a new random UUID v4 for use as a session ID.
 * Uses the native crypto.randomUUID() API available in modern browsers and Node environments.
 * 
 * @returns {string} A standard UUID string (e.g. "550e8400-e29b-41d4-a716-446655440000")
 */
export function generateSessionId(): string {
    // Fallback for environments where crypto might be missing (rare in modern contexts)
    if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') {
        console.warn('crypto.randomUUID() not available, falling back to manual UUID generation');
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    return crypto.randomUUID();
}

/**
 * Converts a File object to the inlineData format expected by the ADK API.
 * Reads the file and encodes it as base64.
 * 
 * @param file - The File object to convert
 * @returns Promise resolving to an object with inlineData containing displayName, mimeType, and base64 data
 */
export function fileToInlineData(file: File): Promise<{
    inlineData: {
        displayName: string;
        mimeType: string;
        data: string;
    };
}> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            // reader.result is "data:mime/type;base64,XXXXX..."
            // We need just the base64 part (after the comma)
            const base64 = (reader.result as string).split(',')[1];

            resolve({
                inlineData: {
                    displayName: file.name,
                    mimeType: file.type || 'application/octet-stream',
                    data: base64
                }
            });
        };

        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}
