import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Uncaught application error:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="max-w-prose text-sm text-white/70">
          An unexpected error occurred. Please reload the page.
        </p>
        <a
          href="/"
          className="inline-flex items-center rounded-md bg-white px-4 py-2 font-mono text-sm font-medium text-black transition-colors hover:bg-white/85"
        >
          Reload
        </a>
      </div>
    );
  }
}
