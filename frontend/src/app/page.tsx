"use client";

import { useRouter } from "next/navigation";
import { AnalysisLauncher } from "../components/landing/AnalysisLauncher";

export default function LandingPage() {
  const router = useRouter();
  return (
    <AnalysisLauncher
      onAnalysisStarted={(analysisId) => {
        router.push(`/workspace?analysis=${encodeURIComponent(analysisId)}`);
      }}
    />
  );
}
