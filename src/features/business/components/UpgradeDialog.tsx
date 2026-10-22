import { useNavigate } from "react-router-dom";
import { Info, Sparkles } from "lucide-react";
import { Button } from "@components/ui";
import { Modal } from "./Overlay";
import { usePartnerPortal } from "../partnerPortal";
import { neutralPlanMessage } from "../utils";

interface UpgradeDialogProps {
    open: boolean;
    message: string;
    onClose: () => void;
}

/**
 * Shown when the API answers 402 QUOTA_EXCEEDED (plan limit or plan feature).
 * With plans hidden it's a plain notice: the message without plan wording and
 * a single OK.
 */
export function UpgradeDialog({ open, message, onClose }: UpgradeDialogProps) {
    const navigate = useNavigate();
    const { plansVisible } = usePartnerPortal();

    if (!plansVisible) {
        return (
            <Modal
                open={open}
                onClose={onClose}
                icon={
                    <div className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center">
                        <Info className="w-5 h-5" />
                    </div>
                }
                title="Limit reached"
                description={neutralPlanMessage(message)}
                footer={
                    <Button variant="accent" onClick={onClose}>
                        OK
                    </Button>
                }
            />
        );
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            icon={
                <div className="w-10 h-10 rounded-full bg-highlight/40 text-primary-800 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                </div>
            }
            title="Upgrade to keep going"
            description={message}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        Not now
                    </Button>
                    <Button
                        variant="accent"
                        onClick={() => {
                            onClose();
                            navigate("/business/billing");
                        }}
                    >
                        See plans
                    </Button>
                </>
            }
        >
            <p className="text-sm text-neutral-600 pb-2">
                Growth and Pro raise your monthly limits and unlock approval-mode UGC briefs, creator discovery, the
                content library and attribution. Owners can start a 14-day free trial from Billing.
            </p>
        </Modal>
    );
}
