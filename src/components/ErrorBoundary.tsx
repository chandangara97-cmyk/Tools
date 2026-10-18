import React from 'react';

interface Props { children: React.ReactNode; /** Changing this clears a previous error, e.g. when the user opens another page. */ resetKey?: string; onBack?: () => void }
interface State { failed: boolean }

/** If a page crashes, the user sees this instead of a blank screen, and can go back. */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { failed: false };
  static getDerivedStateFromError(): State { return { failed: true }; }
  componentDidCatch(error: unknown) { console.error('Page error:', error); }
  componentDidUpdate(prev: Props) { if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false }); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="max-w-md mx-auto mt-10 bg-[#181f3d] border border-[#ff6b6f] rounded-2xl p-5 space-y-3 text-center">
        <h2 className="text-xl font-bold text-white">This page could not open</h2>
        <p className="text-sm text-[#aab4dc]">Nothing has been lost. Go back and try again.</p>
        <div className="flex gap-2 justify-center">
          <button type="button" onClick={() => this.setState({ failed: false })} className="text-sm font-bold px-4 py-2.5 rounded-xl bg-[#1d2547] border border-[#2f3a6b] text-white">Try again</button>
          {this.props.onBack && <button type="button" onClick={() => { this.setState({ failed: false }); this.props.onBack!(); }} className="text-sm font-bold px-4 py-2.5 rounded-xl bg-[#4f46e5] text-white">Back to menu</button>}
        </div>
      </div>
    );
  }
}
