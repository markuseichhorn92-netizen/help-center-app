"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-red-50 p-6">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h1 className="text-2xl font-bold text-red-600 mb-4">
                Ein Fehler ist aufgetreten
              </h1>

              <div className="space-y-4">
                <div className="bg-red-100 rounded p-4">
                  <h2 className="font-semibold text-red-800 mb-2">Fehler:</h2>
                  <pre className="text-sm text-red-700 whitespace-pre-wrap break-all">
                    {this.state.error?.message || "Unbekannter Fehler"}
                  </pre>
                </div>

                {this.state.error?.stack && (
                  <div className="bg-gray-100 rounded p-4">
                    <h2 className="font-semibold text-gray-800 mb-2">Stack Trace:</h2>
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap break-all overflow-auto max-h-48">
                      {this.state.error.stack}
                    </pre>
                  </div>
                )}

                {this.state.errorInfo?.componentStack && (
                  <div className="bg-gray-100 rounded p-4">
                    <h2 className="font-semibold text-gray-800 mb-2">Component Stack:</h2>
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap break-all overflow-auto max-h-48">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                )}

                <div className="flex gap-4 mt-6">
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-brand text-white px-4 py-2 rounded hover:bg-brand-dark transition"
                  >
                    Seite neu laden
                  </button>
                  <a
                    href="/admin/tickets"
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition"
                  >
                    Zurück zur Übersicht
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
