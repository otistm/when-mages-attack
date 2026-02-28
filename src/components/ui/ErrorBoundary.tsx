import { Component, ReactNode, ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  /** Label for logging which boundary caught the error */
  name?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const label = this.props.name ?? 'Unknown';
    console.error(`[ErrorBoundary:${label}]`, error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            minHeight: '200px',
            background: 'rgba(0, 0, 0, 0.85)',
            color: '#f87171',
            padding: '2rem',
            textAlign: 'center',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#fbbf24' }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#a1a1aa', marginBottom: '1rem', maxWidth: '400px' }}>
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '0.5rem 1.5rem',
              background: '#7c3aed',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Minimal fallback for the 3D Canvas that shows a dark rectangle
 * instead of crashing the whole page.
 */
export function CanvasFallback() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: '#1a1a2e',
        color: '#a1a1aa',
        fontFamily: 'Inter, sans-serif',
        fontSize: '0.875rem',
      }}
    >
      3D scene failed to load. Please refresh the page.
    </div>
  );
}
