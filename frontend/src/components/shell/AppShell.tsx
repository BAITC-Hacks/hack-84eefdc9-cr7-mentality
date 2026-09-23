import Link from "next/link";
import {
  ArrowUpRight,
  Download,
  GitFork,
  HelpCircle,
  Layers3,
  Network,
  PanelLeftClose,
  ShieldCheck,
} from "lucide-react";
export function AppShell({
  children,
  analysisId,
  demo = false,
}: {
  children: React.ReactNode;
  analysisId?: string | null;
  demo?: boolean;
}) {
  const query = analysisId
    ? `?analysis=${encodeURIComponent(analysisId)}${demo ? "&demo=1" : ""}`
    : "";
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-icon">
            <GitFork size={23} />
          </span>
          <span>
            Граф денег<span className="brand-sub">FINANCIAL INTELLIGENCE</span>
          </span>
        </Link>
        <div className="sidebar-label">
          РАБОЧЕЕ ПРОСТРАНСТВО <PanelLeftClose size={14} />
        </div>
        <nav aria-label="Основная навигация">
          <Link className="nav-link active" href={`/workspace${query}`}>
            <Network size={18} />
            Обзор сети
            <span className="nav-dot" />
          </Link>
          <Link className="nav-link" href="/methodology">
            <Layers3 size={18} />
            Методология
            <ArrowUpRight size={13} />
          </Link>
          <Link className="nav-link" href={`/exports${query}`}>
            <Download size={18} />
            Экспорт данных
            <ArrowUpRight size={13} />
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="scope-note">
            <ShieldCheck size={20} />
            <strong>От данных к гипотезе</strong>
            <p>Роли и приоритет помогают выбрать узлы для ручной проверки.</p>
          </div>
          <div className="team">
            <span className="team-avatar">C7</span>
            <div>
              CR7 Mentality<small>HackAlem · 2026</small>
            </div>
            <HelpCircle size={17} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            Рабочее пространство<span>/</span>
            <strong>Обзор сети</strong>
          </div>
          <div className="topbar-right">
            <span className={`connection-dot ${demo ? "demo" : ""}`} />
            {demo ? "Демонстрация интерфейса" : "Анализ денежных потоков"}
            <span className="avatar">C7</span>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
