import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@components/ui";

// Open overlays, innermost last — Escape closes only the topmost one
// (e.g. a confirm dialog on top of a drawer).
const overlayStack: symbol[] = [];

function useEscape(open: boolean, onClose: () => void) {
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;
    useEffect(() => {
        if (!open) return;
        const id = Symbol("overlay");
        overlayStack.push(id);
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && overlayStack[overlayStack.length - 1] === id) {
                e.stopPropagation();
                onCloseRef.current();
            }
        };
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("keydown", onKey);
            const idx = overlayStack.indexOf(id);
            if (idx !== -1) overlayStack.splice(idx, 1);
        };
    }, [open]);
}

function useBodyScrollLock(open: boolean) {
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);
}

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: ReactNode;
    description?: ReactNode;
    icon?: ReactNode;
    children?: ReactNode;
    footer?: ReactNode;
    size?: "sm" | "md" | "lg";
}

const MODAL_WIDTH = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" } as const;

/** Centered dialog in the portal's existing modal style. */
export function Modal({ open, onClose, title, description, icon, children, footer, size = "sm" }: ModalProps) {
    useEscape(open, onClose);
    useBodyScrollLock(open);
    if (!open) return null;
    return (
        <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-fade-in"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            role="presentation"
        >
            <div
                role="dialog"
                aria-modal="true"
                className={`w-full ${MODAL_WIDTH[size]} bg-white rounded-2xl shadow-2xl border border-neutral-200 max-h-[90vh] flex flex-col`}
            >
                <div className="flex items-start gap-3 p-6 pb-4">
                    {icon && <div className="shrink-0">{icon}</div>}
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-display font-semibold text-neutral-900">{title}</h3>
                        {description && <div className="text-sm text-neutral-500 mt-1">{description}</div>}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="p-1.5 -m-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                {children && <div className="px-6 pb-2 overflow-y-auto">{children}</div>}
                {footer && <div className="flex gap-3 justify-end p-6 pt-4">{footer}</div>}
            </div>
        </div>
    );
}

interface DrawerProps {
    open: boolean;
    onClose: () => void;
    title: ReactNode;
    subtitle?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    width?: "md" | "lg" | "xl";
}

const DRAWER_WIDTH = { md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-6xl" } as const;

/** Right-hand slide-over panel for detail views and editors. */
export function Drawer({ open, onClose, title, subtitle, children, footer, width = "md" }: DrawerProps) {
    useEscape(open, onClose);
    useBodyScrollLock(open);
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[100] flex justify-end bg-neutral-900/50 backdrop-blur-[2px] animate-fade-in">
            <button type="button" aria-label="Close panel" className="flex-1 cursor-default" onClick={onClose} />
            <aside
                role="dialog"
                aria-modal="true"
                className={`w-full ${DRAWER_WIDTH[width]} h-full bg-white shadow-2xl flex flex-col animate-slide-up`}
            >
                <header className="flex items-start gap-3 px-5 sm:px-6 py-4 border-b border-neutral-200">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-display font-semibold text-primary-900 truncate">{title}</h2>
                        {subtitle && <div className="text-sm text-neutral-500 mt-0.5">{subtitle}</div>}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="p-2 -m-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </header>
                <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">{children}</div>
                {footer && (
                    <footer className="px-5 sm:px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex flex-wrap gap-3 justify-end">
                        {footer}
                    </footer>
                )}
            </aside>
        </div>
    );
}

interface ConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    /** Throw (reject) to keep the dialog open after surfacing the error. */
    onConfirm: (reason: string) => unknown;
    title: ReactNode;
    body?: ReactNode;
    confirmLabel?: string;
    variant?: "primary" | "danger" | "accent";
    /** Show an optional free-text reason field (e.g. decline reason). */
    reasonLabel?: string;
    reasonPlaceholder?: string;
    icon?: ReactNode;
}

/** Yes/no confirmation, optionally collecting a short reason. */
export function ConfirmDialog({
    open,
    onClose,
    onConfirm,
    title,
    body,
    confirmLabel = "Confirm",
    variant = "primary",
    reasonLabel,
    reasonPlaceholder,
    icon,
}: ConfirmDialogProps) {
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (open) setReason("");
    }, [open]);

    const confirm = async () => {
        setBusy(true);
        try {
            await onConfirm(reason.trim());
            onClose();
        } catch {
            /* caller surfaces the error; keep the dialog open */
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={busy ? () => undefined : onClose}
            title={title}
            icon={icon}
            description={body}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose} disabled={busy}>
                        Cancel
                    </Button>
                    <Button variant={variant} onClick={() => void confirm()} isLoading={busy} disabled={busy}>
                        {confirmLabel}
                    </Button>
                </>
            }
        >
            {reasonLabel && (
                <div className="pb-2">
                    <label htmlFor="confirm-reason" className="block text-sm font-medium text-neutral-700 mb-1.5">
                        {reasonLabel}
                    </label>
                    <textarea
                        id="confirm-reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        maxLength={300}
                        rows={3}
                        placeholder={reasonPlaceholder}
                        className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500"
                    />
                </div>
            )}
        </Modal>
    );
}
