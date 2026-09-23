import { Suspense } from "react";
import { ExportsPanel } from "../../components/exports/ExportsPanel";

export default function ExportsPage() {
  return <Suspense fallback={<main>Загружаю выгрузки...</main>}><ExportsPanel /></Suspense>;
}
