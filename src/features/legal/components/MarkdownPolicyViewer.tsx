import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "react-router-dom";

interface MarkdownPolicyViewerProps {
    cdnUrl: string;
}

export function MarkdownPolicyViewer({ cdnUrl }: MarkdownPolicyViewerProps) {
    const [content, setContent] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPolicy = async () => {
            try {
                setIsLoading(true);
                // Cache buster for immediate updates during transition
                const response = await fetch(`${cdnUrl}?t=${Date.now()}`);
                if (!response.ok) {
                    throw new Error("Failed to load policy");
                }
                const text = await response.text();
                setContent(text);
            } catch (err) {
                setError("Failed to load policy. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchPolicy();
    }, [cdnUrl]);

    const stripFrontmatter = (md: string) => {
        if (md.startsWith("---")) {
            const match = md.match(/^---[\s\S]*?---\n([\s\S]*)$/);
            if (match) return match[1];
        }
        return md;
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (error) {
        return <div className="text-center py-20 text-red-600">{error}</div>;
    }

    const cleanContent = stripFrontmatter(content);

    return (
        <div className="w-full text-neutral-800 font-sans">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h1: ({ node, ...props }) => <h1 className="text-4xl font-extrabold text-brand-purple mb-6 mt-8" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-2xl font-bold text-indigo-900 mt-10 mb-4 border-b border-indigo-100 pb-2" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-xl font-bold text-indigo-800 mt-6 mb-3" {...props} />,
                    p: ({ node, ...props }) => <p className="text-neutral-600 leading-relaxed mb-4 text-lg" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-6 space-y-2 text-neutral-600" {...props} />,
                    li: ({ node, ...props }) => <li className="pl-2" {...props} />,
                    a: ({ node, href, ...props }) => {
                        let mappedHref = href;
                        if (href?.endsWith(".md")) {
                            if (href.includes("privacy-policy")) mappedHref = "/privacy-policy";
                            else if (href.includes("terms-and-conditions")) mappedHref = "https://seekkrr.com/terms";
                            else if (href.includes("creator-terms")) mappedHref = "/terms-and-conditions";
                            else if (href.includes("refund-policy")) mappedHref = "https://seekkrr.com/refund";
                        }
                        return <a href={mappedHref} className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium" {...props} />;
                    },
                    strong: ({ node, ...props }) => <strong className="font-semibold text-neutral-900" {...props} />,
                    table: ({ node, ...props }) => (
                        <div className="overflow-x-auto my-6">
                            <table className="w-full border-collapse border border-neutral-200" {...props} />
                        </div>
                    ),
                    th: ({ node, ...props }) => <th className="border border-neutral-200 bg-neutral-50 p-3 text-left font-semibold text-neutral-900" {...props} />,
                    td: ({ node, ...props }) => <td className="border border-neutral-200 p-3 text-neutral-600" {...props} />,
                }}
            >
                {cleanContent}
            </ReactMarkdown>
        </div>
    );
}
