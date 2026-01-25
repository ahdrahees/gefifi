/**
 * Generate a UUID version 4 string suitable for use as a session identifier.
 *
 * If the platform lacks `crypto.randomUUID`, a fallback UUID v4 string is produced and a warning is logged.
 *
 * @returns A UUID v4 string (e.g., "550e8400-e29b-41d4-a716-446655440000")
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
 * Checks whether a string is a UUID v4 (the standard session ID format).
 *
 * @returns `true` if the string is a UUID v4, `false` otherwise.
 */
export function isValidSessionId(id: string): boolean {
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidV4Regex.test(id);
}

/**
 * Convert a File to the ADK API inlineData shape by encoding its contents as base64.
 *
 * @param file - The File to convert; `file.name` becomes `displayName` and `file.type` is used for `mimeType` (falls back to 'application/octet-stream').
 * @returns An object with `inlineData.displayName`, `inlineData.mimeType`, and `inlineData.data` containing the base64-encoded file contents.
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