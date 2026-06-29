import type { UseFormRegister, FieldErrors } from "react-hook-form";
import { Input } from "@components/ui";
import type { TaskFormData } from "../../schemas/task.schema";

interface QrFieldsProps {
    register: UseFormRegister<TaskFormData>;
    errors: FieldErrors<TaskFormData>;
}

export function QrFields({ register, errors }: QrFieldsProps) {
    const qrErrors = errors.qr_data as Record<string, { message?: string }> | undefined;

    return (
        <div className="space-y-4 p-4 bg-amber-50/50 rounded-xl border border-amber-100">
            <h4 className="text-sm font-semibold text-amber-700 uppercase tracking-wider">QR Scan Configuration</h4>
            <Input
                label="Expected Value"
                placeholder="Enter the expected QR code value..."
                error={qrErrors?.["expected_value"]?.message}
                {...register("qr_data.expected_value")}
            />
        </div>
    );
}
