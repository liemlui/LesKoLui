import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.warn("[ErrorBoundary]", error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="p-6 text-center space-y-3">
            <p className="text-4xl">😵</p>
            <p className="text-lg font-bold text-[var(--ink-strong)]">Ada yang tidak beres</p>
            <p className="text-sm text-[var(--ink-muted)]">
              {this.state.error?.message ?? "Terjadi error yang tidak terduga."}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                window.location.reload();
              }}
              className="mt-2 px-6 py-2.5 rounded-xl bg-[var(--brand-solid)] text-[var(--on-strong)] font-semibold text-sm hover:bg-[var(--brand-solid)] transition-colors"
            >
              Muat Ulang
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
