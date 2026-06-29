interface SkeletonProps {
    className?: string;
    variant?: "text" | "circular" | "rectangular";
    width?: string | number;
    height?: string | number;
}

export function Skeleton({
    className = "",
    variant = "rectangular",
    width,
    height,
}: SkeletonProps) {
    const variantStyles = {
        text: "rounded",
        circular: "rounded-full",
        rectangular: "rounded-lg",
    };

    const style = {
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
    };

    return (
        <div
            className={`
        bg-neutral-200 animate-pulse
        ${variantStyles[variant]}
        ${className}
      `}
            style={style}
            aria-hidden="true"
        />
    );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
    return (
        <div className="space-y-2">
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    variant="text"
                    height={16}
                    className={i === lines - 1 ? "w-3/4" : "w-full"}
                />
            ))}
        </div>
    );
}

export function SkeletonCard() {
    return (
        <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-4">
            <Skeleton height={200} className="w-full" />
            <Skeleton variant="text" height={24} className="w-3/4" />
            <SkeletonText lines={2} />
        </div>
    );
}

/**
 * Placeholder rows for table-based list pages so the layout doesn't jump
 * while data loads. Renders `rows` × `columns` skeleton cells.
 */
export function SkeletonTableRows({ rows = 5, columns }: { rows?: number; columns: number }) {
    return (
        <>
            {Array.from({ length: rows }).map((_, r) => (
                <tr key={r} className="border-b border-neutral-100">
                    {Array.from({ length: columns }).map((_, c) => (
                        <td key={c} className="py-4 px-6">
                            <Skeleton variant="text" height={16} className={c === 0 ? "w-3/4" : "w-1/2 mx-auto"} />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );
}
