import { useState, useCallback, type ChangeEvent, type DragEvent } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { cloudinaryService, type UploadProgress } from "@services/cloudinary.service";
import type { CloudinaryAsset } from "@/types";

interface ImageUploadProps {
    value?: CloudinaryAsset;
    onChange: (asset: CloudinaryAsset | undefined) => void;
    folder?: string;
    className?: string;
}

export function ImageUpload({
    value,
    onChange,
    folder = "creator-portal/quests",
    className = "",
}: ImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);

    const handleUpload = useCallback(
        async (file: File) => {
            // Validate file type
            if (!file.type.startsWith("image/")) {
                setError("Please select an image file");
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError("Image size must be less than 5MB");
                return;
            }

            setIsUploading(true);
            setProgress(0);
            setError(null);

            try {
                const result = await cloudinaryService.uploadImage(file, {
                    folder,
                    onProgress: (p: UploadProgress) => setProgress(p.percentage),
                });

                onChange({
                    public_id: result.public_id,
                    secure_url: result.secure_url,
                    width: result.width,
                    height: result.height,
                    format: result.format,
                });
            } catch (err) {
                setError(err instanceof Error ? err.message : "Upload failed");
                onChange(undefined);
            } finally {
                setIsUploading(false);
                setProgress(0);
            }
        },
        [folder, onChange]
    );

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleUpload(file);
        }
    };

    const handleDrag = (e: DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleUpload(file);
        }
    };

    const handleRemove = () => {
        onChange(undefined);
        setError(null);
    };

    if (value) {
        return (
            <div className={`relative ${className}`}>
                <div className="relative rounded-xl overflow-hidden border-2 border-neutral-200">
                    <img
                        src={cloudinaryService.getOptimizedUrl(value.public_id, {
                            width: 600,
                            height: 400,
                            crop: "fill",
                        })}
                        alt="Cover image"
                        className="w-full h-48 object-cover"
                    />
                    <button
                        onClick={handleRemove}
                        className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur rounded-full text-neutral-600 hover:text-red-600 transition-colors shadow-md"
                        aria-label="Remove image"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={className}>
            <label
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`
          relative flex flex-col items-center justify-center
          w-full h-48 border-2 border-dashed rounded-xl
          cursor-pointer transition-colors
          ${dragActive
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-neutral-300 bg-neutral-50 hover:border-neutral-400 hover:bg-neutral-100"
                    }
          ${isUploading ? "pointer-events-none" : ""}
        `}
            >
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploading}
                    aria-label="Upload image"
                />

                {isUploading ? (
                    <div className="text-center">
                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-3" />
                        <p className="text-sm text-neutral-600">Uploading... {progress}%</p>
                        <div className="w-48 h-2 bg-neutral-200 rounded-full mt-2 overflow-hidden">
                            <div
                                className="h-full bg-indigo-600 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="text-center">
                        {dragActive ? (
                            <Upload className="w-10 h-10 text-indigo-600 mx-auto mb-3" />
                        ) : (
                            <ImageIcon className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
                        )}
                        <p className="text-sm font-medium text-neutral-700 mb-1">
                            {dragActive ? "Drop image here" : "Click or drag to upload"}
                        </p>
                        <p className="text-xs text-neutral-500">PNG, JPG up to 5MB</p>
                    </div>
                )}
            </label>

            {error && (
                <p className="mt-2 text-sm text-red-600" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
