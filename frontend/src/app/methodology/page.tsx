// F2 handoff stub.
import Link from "next/link";
export default function MethodologyPage() {
  return (
    <main className="handoff-page">
      <span className="eyebrow">ГРАФ ДЕНЕГ</span>
      <h1>Методология</h1>
      <p>
        Страница подготовлена для F2. Критерии ролей и ограничения будут описаны
        здесь.
      </p>
      <Link href="/workspace">← Рабочее пространство</Link>
    </main>
  );
}
