import type { BusinessCategory } from "@services/business.types";
import { useBusinessCategories } from "../queries";

const MAX_CATEGORIES = 3;
const MAX_SUB_CATEGORIES = 10;

function Chips({
    label,
    options,
    selected,
    max,
    disabled,
    onToggle,
}: {
    label: string;
    options: string[];
    selected: string[];
    max: number;
    disabled?: boolean;
    onToggle: (value: string) => void;
}) {
    return (
        <div role="group" aria-label={label} className="flex flex-wrap gap-2">
            {options.map((option) => {
                const on = selected.includes(option);
                const blocked = !on && selected.length >= max;
                return (
                    <button
                        key={option}
                        type="button"
                        aria-pressed={on}
                        disabled={disabled || blocked}
                        onClick={() => onToggle(option)}
                        className={`px-3 py-1.5 rounded-full border text-sm transition-colors disabled:cursor-not-allowed ${
                            on
                                ? "bg-primary-600 border-primary-600 text-white"
                                : "bg-white border-neutral-300 text-neutral-700 hover:border-primary-400 disabled:opacity-50"
                        }`}
                    >
                        {option}
                    </button>
                );
            })}
        </div>
    );
}

/**
 * Category + type pickers fed by the predefined place categories
 * (`GET /businesses/categories`). Values outside the list (older free-text
 * picks) stay visible so they can be removed.
 */
export function CategoryPicker({
    categories,
    subCategories,
    onChange,
    disabled,
}: {
    categories: string[];
    subCategories: string[];
    onChange: (categories: string[], subCategories: string[]) => void;
    disabled?: boolean;
}) {
    const { data: catalog = [], isLoading, error, refetch } = useBusinessCategories();

    if (isLoading) return <p className="text-sm text-neutral-500">Loading categories…</p>;
    if (error) {
        return (
            <p className="text-sm text-neutral-500">
                Couldn't load categories.{" "}
                <button type="button" onClick={() => refetch()} className="text-primary-700 font-medium hover:underline">
                    Retry
                </button>
            </p>
        );
    }

    const byName = new Map<string, BusinessCategory>(catalog.map((c) => [c.name, c]));
    const categoryOptions = [...new Set([...catalog.map((c) => c.name), ...categories])];
    const subOptions = [
        ...new Set([...categories.flatMap((name) => byName.get(name)?.sub_categories ?? []), ...subCategories]),
    ];

    const toggleCategory = (name: string) => {
        if (categories.includes(name)) {
            const dropped = new Set(byName.get(name)?.sub_categories ?? []);
            onChange(categories.filter((c) => c !== name), subCategories.filter((s) => !dropped.has(s)));
        } else {
            onChange([...categories, name], subCategories);
        }
    };
    const toggleSub = (name: string) =>
        onChange(categories, subCategories.includes(name) ? subCategories.filter((s) => s !== name) : [...subCategories, name]);

    return (
        <div className="space-y-3">
            <Chips label="Categories" options={categoryOptions} selected={categories} max={MAX_CATEGORIES} disabled={disabled} onToggle={toggleCategory} />
            {subOptions.length > 0 && (
                <div className="space-y-1.5">
                    <p className="text-xs font-medium text-neutral-500">Type (pick what fits best)</p>
                    <Chips label="Types" options={subOptions} selected={subCategories} max={MAX_SUB_CATEGORIES} disabled={disabled} onToggle={toggleSub} />
                </div>
            )}
        </div>
    );
}
