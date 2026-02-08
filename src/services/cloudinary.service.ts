import { config } from "@config/env";
import type { CloudinaryUploadResponse } from "@/types";

export interface UploadProgress {
    loaded: number;
    total: number;
    percentage: number;
}

export interface UploadOptions {
    onProgress?: (progress: UploadProgress) => void;
    folder?: string;
    tags?: string[];
}

export const cloudinaryService = {
    /**
     * Upload image to Cloudinary using unsigned upload preset
     * Note: API Secret is NOT used here - we use unsigned preset for security
     */
    async uploadImage(
        file: File,
        options: UploadOptions = {}
    ): Promise<CloudinaryUploadResponse> {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", config.cloudinary.uploadPreset);

        if (options.folder) {
            formData.append("folder", options.folder);
        }

        if (options.tags && options.tags.length > 0) {
            formData.append("tags", options.tags.join(","));
        }

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener("progress", (event) => {
                if (event.lengthComputable && options.onProgress) {
                    options.onProgress({
                        loaded: event.loaded,
                        total: event.total,
                        percentage: Math.round((event.loaded / event.total) * 100),
                    });
                }
            });

            xhr.addEventListener("load", () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText) as CloudinaryUploadResponse;
                        resolve(response);
                    } catch {
                        reject(new Error("Failed to parse upload response"));
                    }
                } else {
                    reject(new Error(`Upload failed with status ${xhr.status}`));
                }
            });

            xhr.addEventListener("error", () => {
                reject(new Error("Upload failed due to network error"));
            });

            xhr.addEventListener("abort", () => {
                reject(new Error("Upload was aborted"));
            });

            xhr.open("POST", config.cloudinary.uploadUrl);
            xhr.send(formData);
        });
    },

    /**
     * Generate optimized Cloudinary URL with transformations
     */
    getOptimizedUrl(
        publicId: string,
        options: {
            width?: number;
            height?: number;
            crop?: "fill" | "fit" | "scale" | "thumb";
            quality?: "auto" | number;
            format?: "auto" | "webp" | "jpg" | "png";
        } = {}
    ): string {
        const {
            width,
            height,
            crop = "fill",
            quality = "auto",
            format = "auto",
        } = options;

        const transformations: string[] = [];

        if (width) transformations.push(`w_${width}`);
        if (height) transformations.push(`h_${height}`);
        if (width || height) transformations.push(`c_${crop}`);
        transformations.push(`q_${quality}`);
        transformations.push(`f_${format}`);

        const transformString = transformations.join(",");

        return `https://res.cloudinary.com/${config.cloudinary.cloudName}/image/upload/${transformString}/${publicId}`;
    },
};
