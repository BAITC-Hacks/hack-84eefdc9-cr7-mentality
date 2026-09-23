import { Suspense } from "react";
import { ExportsLoading, ExportsPanel } from "../../components/exports/ExportsPanel";

export default function ExportsPage() {
  return <Suspense fallback={<ExportsLoading />}><ExportsPanel /></Suspense>;
}
