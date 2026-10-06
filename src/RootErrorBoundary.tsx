import { Component, type ErrorInfo, type ReactNode } from 'react';

type RootErrorBoundaryProps = {
  children: ReactNode;
};

type RootErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

export class RootErrorBoundary extends Component<RootErrorBoundaryProps, RootErrorBoundaryState> {
  public state: RootErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  public static getDerivedStateFromError(error: unknown): RootErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Unexpected startup error.',
    };
  }

  public componentDidCatch(_error: unknown, _errorInfo: ErrorInfo) {}

  public render() {
    if (this.state.hasError) {
      return (
        <div className="app-shell">
          <section className="hero-card" aria-label="Startup error">
            <div className="status-banner" role="alert">
              <p>The dashboard could not finish starting.</p>
              <p>{this.state.message}</p>
              <p>Open the app in App Player or the Local Play URL from the global ms app dev command and reload the page.</p>
            </div>
          </section>
        </div>
      );
    }

    return this.props.children;
  }
}
