import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full space-y-6">
            <div className="flex justify-center">
              <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 p-4 rounded-3xl inline-flex items-center justify-center">
                <AlertTriangle size={48} className="animate-bounce" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-gray-100">
                Something went wrong
              </h1>
              <p className="text-sm text-gray-400 max-w-sm mx-auto leading-relaxed">
                An unexpected error occurred in the application. Please try reloading the page or returning home.
              </p>
              {this.state.error && (
                <pre className="mt-4 p-4 bg-gray-900 border border-gray-800 rounded-2xl text-[10px] text-red-400 text-left overflow-auto max-h-40 font-mono">
                  {this.state.error.toString()}
                </pre>
              )}
            </div>

            <div className="pt-2 flex justify-center">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-2 bg-[#2563eb] hover:bg-blue-700 text-white font-medium text-sm px-6 py-2.5 rounded-full transition-all shadow-lg hover:shadow-blue-500/20 cursor-pointer"
              >
                <RotateCcw size={16} />
                Reload & Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
