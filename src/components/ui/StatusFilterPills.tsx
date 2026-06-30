interface FilterOption<T extends string> {
    label: string;
    value: T;
}

interface StatusFilterPillsProps<T extends string> {
    filters: FilterOption<T>[];
    active: T;
    onChange: (value: T) => void;
    className?: string;
}

export function StatusFilterPills<T extends string>({
    filters,
    active,
    onChange,
    className = "",
}: StatusFilterPillsProps<T>) {
    return (
        <div className={`flex items-center gap-1 flex-wrap ${className}`}>
            {filters.map((f) => (
                <button
                    key={f.value}
                    onClick={() => onChange(f.value)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors
                        ${active === f.value
                            ? "bg-primary-600 text-white"
                            : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                        }`}
                >
                    {f.label}
                </button>
            ))}
        </div>
    );
}
