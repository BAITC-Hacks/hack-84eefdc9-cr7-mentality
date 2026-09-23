// F2 handoff stub. Workspace already exposes actual download links for a live analysis.
import Link from "next/link";
export default function ExportsPage() {
  return (
    <main className="handoff-page">
      <span className="eyebrow">ГРАФ ДЕНЕГ</span>
      <h1>Экспорт данных</h1>
      <p>
        Страница подготовлена для F2. До её подключения три CSV доступны в
        рабочем пространстве готового анализа.
      </p>
      <Link href="/workspace">← Рабочее пространство</Link>
    </main>
  );
}
