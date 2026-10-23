/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string;
    readonly VITE_APP_NAME: string;
    readonly VITE_MAPBOX_ACCESS_TOKEN: string;
    readonly VITE_CLOUDINARY_CLOUD_NAME: string;
    readonly VITE_CLOUDINARY_UPLOAD_PRESET: string;
    /** "true" answers the command chat from the local mock (demos / before the backend lands). */
    readonly VITE_COMMANDS_MOCK?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
