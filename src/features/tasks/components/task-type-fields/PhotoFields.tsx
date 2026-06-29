import type { ChangeEvent } from "react";
import type { UseFormWatch, UseFormSetValue } from "react-hook-form";
import { Input } from "@components/ui";
import type { TaskFormData } from "../../schemas/task.schema";

interface PhotoFieldsProps {
    watch: UseFormWatch<TaskFormData>;
    setValue: UseFormSetValue<TaskFormData>;
}

export function PhotoFields({ watch, setValue }: PhotoFieldsProps) {
    const photoReqs = watch("photo_requirements") ?? {};
    const prompt = typeof photoReqs["prompt"] === "string" ? photoReqs["prompt"] : "";

    const handlePromptChange = (e: ChangeEvent<HTMLInputElement>) => {
        setValue("photo_requirements", { ...photoReqs, prompt: e.target.value });
    };

    return (
        <div className="space-y-4 p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
            <h4 className="text-sm font-semibold text-emerald-700 uppercase tracking-wider">Photo Challenge Configuration</h4>
            <Input
                label="Photo Prompt"
                placeholder="Describe what photo the user should take..."
                value={prompt}
                onChange={handlePromptChange}
            />
        </div>
    );
}
