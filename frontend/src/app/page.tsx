<<<<<<< HEAD
import { LandingPage } from "@/components/landing/LandingPage";

export default function Home() {
  return <LandingPage />;
=======
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
>>>>>>> 25cf0ee23e5b9b1709fc59171720e723b9126bae
}
