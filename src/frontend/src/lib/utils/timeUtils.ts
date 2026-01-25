/**
 * Convert an epoch timestamp to milliseconds.
 *
 * If the input appears to be in seconds (less than 30000000000) it is multiplied by 1000; otherwise the value is returned unchanged.
 *
 * @param ts - Epoch timestamp in seconds or milliseconds
 * @returns The timestamp expressed in milliseconds
 */
function normalizeTimestamp(ts: number): number {
    // If the timestamp is likely in seconds (less than the year 3000 in ms)
    if (ts < 30000000000) {
        return ts * 1000;
    }
    return ts;
}

/**
 * Produce a human-readable relative time label for a given timestamp.
 *
 * @param timestamp - Unix timestamp in seconds or milliseconds. If omitted or falsy, no time is formatted.
 * @returns `'Just now'` for timestamps less than 1 minute old; `'<n>m ago'` for minutes; `'<n>h ago'` for hours; `'Yesterday'` if exactly one day old; `'<n>d ago'` for days fewer than 7; otherwise the timestamp's locale date string. An empty string is returned when `timestamp` is falsy.
 */
export function formatRelativeTime(timestamp?: number): string {
    if (!timestamp) return '';

    const ms = normalizeTimestamp(timestamp);
    const now = Date.now();
    const diff = now - ms;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;

    return new Date(ms).toLocaleDateString();
}

/**
 * Determine which temporal group a timestamp falls into.
 *
 * @param timestamp - Optional timestamp, in seconds or milliseconds. If omitted or falsy, the function treats it as absent.
 * @returns `'Today'` if the timestamp falls on the current calendar day, `'Yesterday'` if it falls on the previous calendar day, `'Earlier'` otherwise.
 */
export function getTemporalGroup(timestamp?: number): 'Today' | 'Yesterday' | 'Earlier' {
    if (!timestamp) return 'Earlier';

    const ms = normalizeTimestamp(timestamp);
    const now = new Date();
    const date = new Date(ms);

    const isToday = now.toDateString() === date.toDateString();

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = yesterday.toDateString() === date.toDateString();

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    return 'Earlier';
}