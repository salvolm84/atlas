"use client";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Orbit } from "lucide-react";

type Props = {
  children: ReactNode;
  /** Shown instead of the default panel. Receives a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** Changing this value clears a captured error, e.g. on a new selection. */
  resetKey?: unknown;
  /** Italian label naming the failed area, used in the default panel. */
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
    console.error("Atlante Deep Sky — errore di rendering", error, info.componentStack);
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
          <h3>{this.props.area ?? "Questa sezione"} non è disponibile</h3>
          <p>
            Si è verificato un errore inatteso durante la visualizzazione. Il resto dell’atlante
            resta utilizzabile: prova a scegliere un altro oggetto o a ricaricare la pagina.
          </p>
          <div className="notice warning">{error.message || "Errore sconosciuto"}</div>
          <button onClick={this.reset}>Riprova</button>
        </div>
      </div>
    );
  }
}
