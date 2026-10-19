/**
 * Minimal Razorpay Checkout loader for subscription payments.
 * The script is injected on demand (only when an owner starts a checkout).
 */

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

export interface RazorpaySuccessResponse {
    razorpay_payment_id?: string;
    razorpay_subscription_id?: string;
    razorpay_signature?: string;
}

export interface RazorpayOptions {
    key: string;
    subscription_id: string;
    name: string;
    description?: string;
    image?: string;
    prefill?: { name?: string; email?: string; contact?: string };
    notes?: Record<string, string>;
    theme?: { color?: string };
    handler: (response: RazorpaySuccessResponse) => void;
    modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
    open: () => void;
    on: (event: string, cb: (payload: { error?: { description?: string } }) => void) => void;
}

type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance;

declare global {
    interface Window {
        Razorpay?: RazorpayConstructor;
    }
}

let loading: Promise<RazorpayConstructor> | null = null;

export function loadRazorpay(): Promise<RazorpayConstructor> {
    if (window.Razorpay) return Promise.resolve(window.Razorpay);
    if (loading) return loading;
    loading = new Promise<RazorpayConstructor>((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`);
        const script = existing ?? document.createElement("script");
        const done = () => {
            if (window.Razorpay) resolve(window.Razorpay);
            else reject(new Error("Razorpay Checkout failed to initialise"));
        };
        script.addEventListener("load", done, { once: true });
        script.addEventListener(
            "error",
            () => reject(new Error("Couldn't load Razorpay Checkout. Check your connection and try again.")),
            { once: true }
        );
        if (!existing) {
            script.src = CHECKOUT_SRC;
            script.async = true;
            document.body.appendChild(script);
        }
    }).catch((err: unknown) => {
        loading = null; // allow a retry after a failed load
        throw err;
    });
    return loading;
}

/** Load the script (if needed) and open Checkout. Resolves once the modal is open. */
export async function openRazorpayCheckout(
    options: RazorpayOptions,
    onFailure?: (message: string) => void
): Promise<void> {
    const Razorpay = await loadRazorpay();
    const instance = new Razorpay(options);
    if (onFailure) {
        instance.on("payment.failed", (payload) => {
            onFailure(payload?.error?.description || "Payment failed. Please try again.");
        });
    }
    instance.open();
}
