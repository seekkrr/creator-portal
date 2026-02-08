/**
 * Utility functions for sanitization and security
 */

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param unsafe - The potentially unsafe string
 * @returns The escaped safe string
 */
export function escapeHtml(unsafe: string | undefined | null): string {
    if (unsafe === undefined || unsafe === null) {
        return '';
    }
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Generates a cryptographically random string for CSRF state tokens
 * @param length - Length of the random string (default: 32)
 * @returns Random string suitable for CSRF protection
 */
export function generateStateToken(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
