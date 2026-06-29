import React from "react";
import type { UseFormWatch, UseFormSetValue } from "react-hook-form";
import { Input } from "@components/ui";
import type { TaskFormData } from "../../schemas/task.schema";

interface SocialFieldsProps {
    watch: UseFormWatch<TaskFormData>;
    setValue: UseFormSetValue<TaskFormData>;
}

export function SocialFields({ watch, setValue }: SocialFieldsProps) {
    const socialTask = watch("social_task") ?? {};
    const platform = typeof socialTask["platform"] === "string" ? socialTask["platform"] : "";
    const action = typeof socialTask["action"] === "string" ? socialTask["action"] : "";

    const handlePlatformChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue("social_task", { ...socialTask, platform: e.target.value });
    };

    const handleActionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue("social_task", { ...socialTask, action: e.target.value });
    };

    return (
        <div className="space-y-4 p-4 bg-pink-50/50 rounded-xl border border-pink-100">
            <h4 className="text-sm font-semibold text-pink-700 uppercase tracking-wider">Social Task Configuration</h4>
            <Input
                label="Platform"
                placeholder="e.g. Instagram, Twitter, Facebook..."
                value={platform}
                onChange={handlePlatformChange}
            />
            <Input
                label="Action"
                placeholder="e.g. Post a photo with #SeekKrr..."
                value={action}
                onChange={handleActionChange}
            />
        </div>
    );
}
