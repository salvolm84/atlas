"use client";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Orbit } from "lucide-react";

type Props = {
  children: ReactNode;
  /** Shown instead of the default panel. Receives a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** Changing this value clears a captured error, e.g. on a new selection. */
  resetKey?: unknown;
  /** Label naming the failed area, used in the default panel. */
  area?: string;
};

type State = { error: Error | null };

/**
 * The portable release runs from `file://` with no console the reader would
 * think to open, so an uncaught render error has to degrade to something
 * legible rather than a blank page.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(previous: Props) {
    if (this.state.error && previous.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Deep Sky Atlas — render error", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <div className="object-panel">
        <div className="empty-state">
          <Orbit size={28} />
          <h3>{this.props.area ?? "This section"} is unavailable</h3>
          <p>
            Something went wrong while displaying this. The rest of the atlas still works: try
            picking another object, or reload the page.
          </p>
          <div className="notice warning">{error.message || "Unknown error"}</div>
          <button onClick={this.reset}>Try again</button>
        </div>
      </div>
    );
  }
}
