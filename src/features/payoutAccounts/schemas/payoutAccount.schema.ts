import { z } from "zod";
import type {
    CreatePayoutAccountPayload,
    UpdatePayoutAccountPayload,
} from "@/types";

export const PAYOUT_METHODS = ["bank_transfer", "upi"] as const;
export const PAYOUT_CURRENCIES = ["INR", "USD"] as const;

/** Indian Financial System Code, e.g. SBIN0001234 (4 letters, 0, 6 alnum). */
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
/** UPI VPA, e.g. name@bank. */
const UPI_RE = /^[\w.-]+@[\w]+$/;

/**
 * Build the form schema. `account_number` is only required when creating: on
 * edit the raw number is never returned by the backend (only a masked value),
 * so a blank account_number means "keep the existing one".
 */
export function makePayoutAccountFormSchema(isEdit: boolean) {
    return z
        .object({
            method: z.enum(PAYOUT_METHODS),
            currency: z.enum(PAYOUT_CURRENCIES),
            account_holder_name: z.string().max(200).optional().or(z.literal("")),
            account_number: z.string().max(30).optional().or(z.literal("")),
            ifsc_code: z.string().max(20).optional().or(z.literal("")),
            bank_name: z.string().max(100).optional().or(z.literal("")),
            upi_id: z.string().max(100).optional().or(z.literal("")),
        })
        .superRefine((d, ctx) => {
            if (d.method === "bank_transfer") {
                if (!d.account_holder_name) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ["account_holder_name"],
                        message: "Account holder name is required",
                    });
                }
                if (!isEdit && !d.account_number) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ["account_number"],
                        message: "Account number is required",
                    });
                }
                if (!d.ifsc_code || !IFSC_RE.test(d.ifsc_code)) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ["ifsc_code"],
                        message: "Enter a valid IFSC code (e.g. SBIN0001234)",
                    });
                }
                if (!d.bank_name) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ["bank_name"],
                        message: "Bank name is required",
                    });
                }
            } else if (d.method === "upi") {
                if (!d.upi_id || !UPI_RE.test(d.upi_id)) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ["upi_id"],
                        message: "Enter a valid UPI ID (e.g. name@bank)",
                    });
                }
            }
        });
}

export type PayoutAccountFormData = z.infer<
    ReturnType<typeof makePayoutAccountFormSchema>
>;

/** Drop empty-string / undefined values so optional fields stay optional. */
const clean = <T extends Record<string, unknown>>(o: T): Partial<T> =>
    Object.fromEntries(
        Object.entries(o).filter(([, v]) => v !== "" && v !== undefined)
    ) as Partial<T>;

export function toCreatePayload(d: PayoutAccountFormData): CreatePayoutAccountPayload {
    if (d.method === "upi") {
        return { method: d.method, currency: d.currency, upi_id: d.upi_id };
    }
    return {
        method: d.method,
        currency: d.currency,
        account_holder_name: d.account_holder_name || undefined,
        bank_details: clean({
            account_number: d.account_number,
            ifsc_code: d.ifsc_code,
            bank_name: d.bank_name,
        }),
    };
}

export function toUpdatePayload(d: PayoutAccountFormData): UpdatePayoutAccountPayload {
    if (d.method === "upi") {
        return { currency: d.currency, upi_id: d.upi_id };
    }
    return {
        currency: d.currency,
        account_holder_name: d.account_holder_name || undefined,
        // A blank account_number is dropped by `clean`, so the existing number
        // on the backend is preserved (UpdatePayoutAccountBody uses exclude_none).
        bank_details: clean({
            account_number: d.account_number,
            ifsc_code: d.ifsc_code,
            bank_name: d.bank_name,
        }),
    };
}
