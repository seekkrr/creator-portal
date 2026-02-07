import { Link } from "react-router-dom";
import { CheckCircle2, Home, Plus } from "lucide-react";
import { Button, Card } from "@components/ui";

export function QuestSuccessPage() {
    return (
        <div className="animate-fade-in max-w-lg mx-auto text-center py-12">
            <Card padding="lg" shadow="lg">
                {/* Success Icon */}
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>

                {/* Message */}
                <h1 className="text-2xl font-bold text-neutral-900 mb-3">
                    Thank you for adding the Quest!
                </h1>
                <p className="text-neutral-600 mb-2">
                    You can view and edit the quest by clicking on the see your quest.
                </p>
                <p className="text-sm text-neutral-500 mb-8">
                    Our team will review the quest and send.
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link to="/creator/dashboard">
                        <Button
                            variant="primary"
                            size="lg"
                            leftIcon={<Home className="w-4 h-4" />}
                        >
                            Go to Homepage
                        </Button>
                    </Link>
                    <Link to="/creator/quest/create">
                        <Button
                            variant="outline"
                            size="lg"
                            leftIcon={<Plus className="w-4 h-4" />}
                        >
                            Create Another
                        </Button>
                    </Link>
                </div>
            </Card>
        </div>
    );
}
