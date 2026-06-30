import React from "react";
import { Search } from "lucide-react";
import { Button } from "./Button";

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    placeholder?: string;
}

/**
 * Consistent filter-row search bar — matches the Markers page reference layout:
 * a form containing a left-icon text input (w-60 on sm+) + a "Search" outline button.
 * Place it inside a flex row with `sm:ml-auto` on the form to right-align it.
 */
export function SearchBar({ value, onChange, onSubmit, placeholder = "Search…" }: SearchBarProps) {
    return (
        <form onSubmit={onSubmit} className="flex gap-2 sm:ml-auto w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none sm:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400"
                />
            </div>
            <Button type="submit" variant="outline" size="sm">
                Search
            </Button>
        </form>
    );
}
