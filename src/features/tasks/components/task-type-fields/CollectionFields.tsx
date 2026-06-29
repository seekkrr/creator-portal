import React from "react";
import type { UseFormWatch, UseFormSetValue } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@components/ui";
import type { TaskFormData } from "../../schemas/task.schema";

interface CollectionFieldsProps {
    watch: UseFormWatch<TaskFormData>;
    setValue: UseFormSetValue<TaskFormData>;
}

export function CollectionFields({ watch, setValue }: CollectionFieldsProps) {
    const items = (watch("collection_items") ?? []) as string[];

    const handleChange = (index: number, val: string) => {
        const next = [...items];
        next[index] = val;
        setValue("collection_items", next);
    };

    const handleAdd = () => {
        setValue("collection_items", [...items, ""]);
    };

    const handleRemove = (index: number) => {
        const next = items.filter((_, i) => i !== index);
        setValue("collection_items", next);
    };

    return (
        <div className="space-y-4 p-4 bg-purple-50/50 rounded-xl border border-purple-100">
            <h4 className="text-sm font-semibold text-purple-700 uppercase tracking-wider">Collection Items</h4>
            <div className="space-y-2">
                {items.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <div className="flex-1">
                            <Input
                                placeholder={`Item ${index + 1}`}
                                value={item}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(index, e.target.value)}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => handleRemove(index)}
                            className="shrink-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove item"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
                <button
                    type="button"
                    onClick={handleAdd}
                    className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-700 font-medium mt-1"
                >
                    <Plus className="w-4 h-4" /> Add Item
                </button>
            </div>
        </div>
    );
}
