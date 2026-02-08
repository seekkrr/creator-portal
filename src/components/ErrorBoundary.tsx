import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@components/ui";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    public override state: State = {
        hasError: false,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: undefined });
    };

    public override render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-[400px] flex items-center justify-center p-8">
                    <div className="text-center max-w-md">
                        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-red-600" />
                        </div>
                        <h2 className="text-2xl font-semibold text-neutral-900 mb-2">
                            Something went wrong
                        </h2>
                        <p className="text-neutral-600 mb-6">
                            An unexpected error occurred. Please try again or contact support if the problem persists.
                        </p>
                        {this.state.error && (
                            <p className="text-sm text-neutral-500 mb-6 font-mono bg-neutral-100 p-3 rounded-lg">
                                {this.state.error.message}
                            </p>
                        )}
                        <Button
                            onClick={this.handleRetry}
                            leftIcon={<RefreshCw className="w-4 h-4" />}
                        >
                            Try Again
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
