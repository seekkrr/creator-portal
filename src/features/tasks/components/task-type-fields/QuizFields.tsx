import React, { useState, useRef } from "react";
import type { UseFormRegister, UseFormWatch, UseFormSetValue, FieldErrors } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@components/ui";
import type { TaskFormData } from "../../schemas/task.schema";

interface QuizFieldsProps {
    register: UseFormRegister<TaskFormData>;
    watch: UseFormWatch<TaskFormData>;
    setValue: UseFormSetValue<TaskFormData>;
    errors: FieldErrors<TaskFormData>;
}

export function QuizFields({ register, watch, setValue, errors }: QuizFieldsProps) {
    const options = watch("quiz_data.options") ?? [];
    const correctAnswer = watch("quiz_data.correct_answer") ?? "";

    const quizErrors = errors.quiz_data as Record<string, { message?: string } | Array<{ message?: string }>> | undefined;

    // Stable keys for each option row — only used as React `key`s, never sent in the payload.
    const stableIdCounter = useRef(0);
    const [optionKeys, setOptionKeys] = useState<number[]>(() =>
        options.map(() => stableIdCounter.current++)
    );

    const handleAddOption = () => {
        const newKey = stableIdCounter.current++;
        setOptionKeys((prev) => [...prev, newKey]);
        setValue("quiz_data.options", [...options, ""], { shouldValidate: false });
    };

    const handleRemoveOption = (index: number) => {
        const removed = options[index] ?? "";
        if (removed !== "" && removed === correctAnswer) {
            setValue("quiz_data.correct_answer", "");
        }
        setOptionKeys((prev) => prev.filter((_, i) => i !== index));
        setValue("quiz_data.options", options.filter((_, i) => i !== index), { shouldValidate: false });
    };

    const handleOptionChange = (index: number, val: string) => {
        const prev = options[index] ?? "";
        const next = [...options];
        next[index] = val;
        setValue(`quiz_data.options`, next, { shouldValidate: false });
        // Keep correct_answer in sync: if this option WAS the correct answer, update it to the new text.
        if (prev !== "" && prev === correctAnswer) {
            setValue("quiz_data.correct_answer", val, { shouldValidate: true });
        }
    };

    const handleSetCorrect = (optionVal: string) => {
        setValue("quiz_data.correct_answer", optionVal, { shouldValidate: false });
    };

    return (
        <div className="space-y-4 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
            <h4 className="text-sm font-semibold text-indigo-700 uppercase tracking-wider">Quiz Configuration</h4>

            <Input
                label="Question"
                placeholder="Enter the quiz question..."
                error={quizErrors?.["question"] && !Array.isArray(quizErrors["question"]) ? quizErrors["question"].message : undefined}
                {...register("quiz_data.question")}
            />

            <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-700">
                    Answer Options <span className="text-neutral-400 font-normal">(select the correct one)</span>
                </label>

                {options.map((optionVal, index) => {
                    const isCorrect = optionVal !== "" && optionVal === correctAnswer;
                    const optionErrors = Array.isArray(quizErrors?.["options"]) ? quizErrors?.["options"] : undefined;
                    const optionError = optionErrors?.[index]?.message;
                    const stableKey = optionKeys[index] ?? index;

                    return (
                        <div key={stableKey} className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => handleSetCorrect(optionVal)}
                                className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
                                    ${isCorrect
                                        ? "border-indigo-600 bg-indigo-600"
                                        : "border-neutral-300 hover:border-indigo-400"
                                    }
                                `}
                                title="Set as correct answer"
                            >
                                {isCorrect && <span className="w-2 h-2 rounded-full bg-white block" />}
                            </button>
                            <div className="flex-1">
                                <Input
                                    placeholder={`Option ${index + 1}`}
                                    value={optionVal}
                                    error={optionError}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleOptionChange(index, e.target.value)}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => handleRemoveOption(index)}
                                className="shrink-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remove option"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    );
                })}

                <button
                    type="button"
                    onClick={handleAddOption}
                    className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium mt-1"
                >
                    <Plus className="w-4 h-4" /> Add Option
                </button>

                {quizErrors?.["correct_answer"] && !Array.isArray(quizErrors["correct_answer"]) && quizErrors["correct_answer"].message && (
                    <p className="text-sm text-red-600">{quizErrors["correct_answer"].message}</p>
                )}
            </div>
        </div>
    );
}
