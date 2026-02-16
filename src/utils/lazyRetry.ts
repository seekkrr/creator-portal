import { lazy, ComponentType, LazyExoticComponent } from 'react';

/**
 * A wrapper around React.lazy that automatically retries the import if it fails
 * due to a chunk load error (common during deployments).
 * 
 * It will reload the page once if a chunk fails to load, forcing the browser
 * to fetch the latest index.html and asset manifest.
 */
export const lazyRetry = <T extends ComponentType<any>>(
    factory: () => Promise<{ default: T }>
): LazyExoticComponent<T> => {
    return lazy(async () => {
        try {
            return await factory();
        } catch (error: any) {
            // Check if the error is a chunk load failure or a dynamic import failure
            const isChunkError =
                error?.message?.includes('Failed to fetch dynamically imported module') ||
                error?.message?.includes('Importing a module script failed') ||
                error?.name === 'ChunkLoadError';

            if (isChunkError) {
                // Check if we've already reloaded for this error to prevent infinite loops
                const storageKey = `retry-${window.location.pathname}`;
                const hasReloaded = sessionStorage.getItem(storageKey);

                if (!hasReloaded) {
                    console.log('Chunk load failed, reloading page to fetch latest version...');
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
