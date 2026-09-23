"use client";

import { AnalysisLauncher } from "../components/landing/AnalysisLauncher";

export default function LandingPage() {
  return (
    <AnalysisLauncher
      onAnalysisStarted={(analysisId) => {
        window.location.assign(`/workspace?analysis=${encodeURIComponent(analysisId)}`);
      }}
    />
  );
}
