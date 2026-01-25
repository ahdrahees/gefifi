/**
 * Normalizes a timestamp to milliseconds. 
 * Handles seconds (e.g. 1766390561) and milliseconds.
 */
function normalizeTimestamp(ts: number): number {
    // If the timestamp is likely in seconds (less than the year 3000 in ms)
    if (ts < 30000000000) {
        return ts * 1000;
    }
    return ts;
}

/**
 * Formats a timestamp into a relative time string (e.g., "5m ago", "2h ago").
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
 * Categorizes a timestamp into temporal groups.
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
