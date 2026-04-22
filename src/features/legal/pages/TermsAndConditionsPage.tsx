import { Card } from "@components/ui";
import { MarkdownPolicyViewer } from "../components/MarkdownPolicyViewer";

export function TermsAndConditionsPage() {
    return (
        <div className="min-h-screen bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-4xl mx-auto">
                <Card padding="none" className="bg-white shadow-xl rounded-3xl overflow-hidden mt-8">
                    <div className="p-8 sm:p-12">
                        <MarkdownPolicyViewer cdnUrl="https://cdn.jsdelivr.net/gh/seekkrr/policies@main/en/creator-terms.md" />
                    </div>
                </Card>
            </div>
        </div>
    );
}
