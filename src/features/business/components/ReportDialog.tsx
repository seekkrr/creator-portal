import { useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@components/ui";
import { businessService } from "@services/business.service";
import type { ReportPayload, ReportReason } from "@services/business.types";
import { errorMessage } from "../utils";
import { Modal } from "./Overlay";
import { FieldLabel, selectClass } from "./bits";

const REASONS: { value: ReportReason; label: string }[] = [
    { value: "no_show", label: "Didn't show up" },
    { value: "not_honoured", label: "Didn't post what was agreed" },
    { value: "inappropriate", label: "Inappropriate behaviour or content" },
    { value: "harassment", label: "Harassment" },
    { value: "unsafe", label: "Felt unsafe" },
    { value: "fraud", label: "Fraud or fake account" },
    { value: "spam", label: "Spam" },
    { value: "other", label: "Something else" },
];

interface ReportDialogProps {
    open: boolean;
    onClose: () => void;
    targetType: ReportPayload["target_type"];
    targetId: string;
    targetName: string;
}

/** Report a creator (or an application) to SeekKrr's trust & safety team. */
export function ReportDialog({ open, onClose, targetType, targetId, targetName }: ReportDialogProps) {
    const [reason, setReason] = useState<ReportReason>("no_show");
    const [details, setDetails] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        setBusy(true);
        try {
            await businessService.report({ target_type: targetType, target_id: targetId, reason, details });
            toast.success("Report sent. Our team reviews every report.");
            setDetails("");
            onClose();
        } catch (e) {
            toast.error(errorMessage(e, "Couldn't send the report"));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            size="md"
            icon={
                <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                    <Flag className="w-5 h-5" />
                </div>
            }
            title={`Report ${targetName}`}
            description="Reports are confidential — the creator isn't told who reported them."
            footer={
                <>
                    <Button variant="ghost" onClick={onClose} disabled={busy}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={() => void submit()} isLoading={busy} disabled={busy}>
                        Send report
                    </Button>
                </>
            }
        >
            <div className="space-y-4 pb-2">
                <div>
                    <FieldLabel htmlFor="report-reason">What happened?</FieldLabel>
                    <select
                        id="report-reason"
                        className={selectClass}
                        value={reason}
                        onChange={(e) => setReason(e.target.value as ReportReason)}
                    >
                        {REASONS.map((r) => (
                            <option key={r.value} value={r.value}>
                                {r.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <FieldLabel htmlFor="report-details" hint="Optional, but it helps us act faster.">
                        Details
                    </FieldLabel>
                    <textarea
                        id="report-details"
                        rows={4}
                        maxLength={2000}
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500"
                    />
                </div>
            </div>
        </Modal>
    );
}
