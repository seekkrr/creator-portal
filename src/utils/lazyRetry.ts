import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';

/**
 * A wrapper around React.lazy that automatically retries the import if it fails
 * due to a chunk load error (common during deployments).
 * 
 * It will reload the page once if a chunk fails to load, forcing the browser
 * to fetch the latest index.html and asset manifest.
 */
export const lazyRetry = <T extends ComponentType<object>>(
    factory: () => Promise<{ default: T }>
): LazyExoticComponent<T> => {
    return lazy(async () => {
        try {
            const component = await factory();

            // Clear the retry flag for this path on success
            // This ensures that if the user stays on the app and a new deployment happens,
            // we can retry again if they navigate back to this path.
            sessionStorage.removeItem(`retry-${window.location.pathname}`);

            return component;
        } catch (error: unknown) {
            // Check if the error is a chunk load failure or a dynamic import failure
            const err = error as { message?: string; name?: string };
            const isChunkError =
                err?.message?.includes('Failed to fetch dynamically imported module') ||
                err?.message?.includes('Importing a module script failed') ||
                err?.name === 'ChunkLoadError';

            if (isChunkError) {
                // Check if we've already reloaded for this error to prevent infinite loops
                const storageKey = `retry-${window.location.pathname}`;
                const hasReloaded = sessionStorage.getItem(storageKey);

                if (!hasReloaded) {
                    console.warn('Chunk load failed, reloading page to fetch latest version...');
                    sessionStorage.setItem(storageKey, 'true');
                    window.location.reload();

                    // Return a promise that never resolves while reloading
                    // This prevents the error boundary from showing immediately
                    return new Promise(() => { });
                }
            }

            // If not a chunk error or we already reloaded, throw the error
            throw error;
        }
    });
};
