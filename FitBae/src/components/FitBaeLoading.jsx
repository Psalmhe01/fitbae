import { BrandMark } from "./BrandMark";

// Shared with button/inline loaders: two weights taking alternating reps.
// SVG stays crisp in the APK without an image, video, or animation dependency.
export function PairedWeights() {
  return <svg className="fitbae-weights" viewBox="0 0 96 72" aria-hidden="true" focusable="false">
    <g className="fitbae-weight fitbae-weight-one" fill="var(--loader-color, var(--brand-strong))">
      <rect x="9" y="32" width="30" height="7" rx="3.5" />
      <rect x="7" y="23" width="9" height="25" rx="3" />
      <rect x="32" y="23" width="9" height="25" rx="3" />
    </g>
    <g className="fitbae-weight fitbae-weight-two" fill="var(--brand-coral)">
      <rect x="57" y="32" width="30" height="7" rx="3.5" />
      <rect x="55" y="23" width="9" height="25" rx="3" />
      <rect x="80" y="23" width="9" height="25" rx="3" />
    </g>
    <path className="fitbae-weight-floor" d="M7 61h34m14 0h34" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".15" />
  </svg>;
}

export function FitBaeLoading({ message = "Getting your space ready…", fullScreen = false }) {
  return <div className={`fitbae-loading${fullScreen ? " fitbae-loading-screen app-shell" : ""}`} role="status" aria-live="polite" aria-atomic="true">
    <div aria-hidden="true"><BrandMark /></div>
    <div className="fitbae-loading-scene"><PairedWeights /></div>
    <p className="fitbae-loading-title">Better together.</p>
    <p className="fitbae-loading-message">{message}</p>
    <span className="fitbae-loading-caption" aria-hidden="true">YOUR PACE. YOUR PERSON.</span>
  </div>;
}
