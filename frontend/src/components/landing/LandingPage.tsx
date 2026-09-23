import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, ChartNoAxesCombined, CircleCheck, GitBranch, Network, ScanSearch, ShieldCheck } from "lucide-react";
import { AudienceSection } from "./AudienceSection";
import styles from "./landing.module.css";

const filters = [
  { label: "Возможности", href: "#features" },
  { label: "Анализ связей", href: "#services" },
  { label: "Поиск рисков", href: "#services" },
  { label: "Для кого", href: "#audience" },
  { label: "Методология", href: "/methodology" },
];

const features = [
  { icon: Network, title: "Вся сеть перед глазами", description: "Связи между счетами, транзакциями и участниками складываются в понятную карту." },
  { icon: ScanSearch, title: "Важное — на виду", description: "Подозрительные цепочки и ключевые узлы проще заметить и проверить." },
  { icon: ShieldCheck, title: "Выводы с опорой на данные", description: "От обзора сети можно перейти к деталям операции и объяснить каждый вывод." },
];

function ActionLink({ children, href, secondary = false }: { children: React.ReactNode; href: string; secondary?: boolean }) {
  return <Link className={`${styles.action} ${secondary ? styles.actionSecondary : styles.actionPrimary}`} href={href}>{children}</Link>;
}

function Header() {
  return <header className={styles.header}>
    <Link className={styles.logo} href="/" aria-label="Граф денег — главная"><span className={styles.logoMark} aria-hidden="true"><i /><i /><i /></span><span>ГРАФ<span className={styles.logoAccent}>ДЕНЕГ</span></span></Link>
    <nav className={styles.mainNav} aria-label="Основная навигация"><a href="#features">Возможности</a><a href="#services">Как работает</a><a href="#audience">Для кого</a><Link href="/methodology">Методология</Link></nav>
    <div className={styles.headerActions}><Link className={styles.headerQuiet} href="/workspace?demo=1">Посмотреть демо</Link><ActionLink href="/workspace">Начать анализ <ArrowUpRight size={16} /></ActionLink></div>
  </header>;
}

function FilterNav() {
  return <nav className={styles.filterNav} aria-label="Разделы страницы">
    <div className={styles.filterScroll}>{filters.map((filter, index) => <Link className={`${styles.filter} ${index === 0 ? styles.filterActive : ""}`} href={filter.href} key={filter.label}>{filter.label}</Link>)}</div>
    <Link className={styles.filterAll} href="/workspace?demo=1">Открыть демо <ArrowRight size={15} /></Link>
  </nav>;
}

function Hero() {
  return <section className={styles.hero} aria-labelledby="hero-title">
    <div className={styles.heroContent}><span className={styles.outlineTag}>Платформа анализа транзакций</span><h1 id="hero-title">Увидьте всю картину денежных потоков</h1><p>Исследуйте связи, находите важные цепочки и переходите от сложных данных к ясным выводам.</p><div className={styles.heroActions}><ActionLink href="/workspace">Начать анализ <ArrowUpRight size={17} /></ActionLink><ActionLink href="#features" secondary>Узнать больше <ArrowRight size={17} /></ActionLink></div></div>
    <div className={styles.heroVisual} aria-hidden="true"><div className={styles.heroVisualHalo} /><Image src="/landing/transaction-graph-hero.png" alt="" width={1536} height={1024} priority className={styles.heroImage} /></div>
    <span className={styles.heroPagination} aria-hidden="true"><i /><i /><i /></span>
  </section>;
}

function Features() {
  return <section className={styles.features} id="features" aria-label="Преимущества платформы">{features.map(({ icon: Icon, title, description }) => <article className={styles.featureCard} key={title}><span className={styles.featureIcon}><Icon size={25} strokeWidth={1.8} /></span><h2>{title}</h2><p>{description}</p></article>)}</section>;
}

function HelpBanner() {
  return <section className={styles.helpBanner} aria-label="Запуск анализа"><div className={styles.helpMessage}><span className={styles.helpIcon}><GitBranch size={22} /></span><div><strong>Разберём сложную сеть вместе</strong><span>Откройте рабочее пространство и начните с демонстрационных данных.</span></div></div><ActionLink href="/workspace?demo=1">Попробовать демо <ArrowUpRight size={16} /></ActionLink></section>;
}

function ServiceVisual({ kind }: { kind: "graph" | "insights" }) {
  return <div className={`${styles.serviceVisual} ${kind === "graph" ? styles.graphVisual : styles.insightsVisual}`} aria-hidden="true">{kind === "graph" ? <><span className={styles.graphLineOne} /><span className={styles.graphLineTwo} /><span className={styles.graphLineThree} /><span className={`${styles.graphNode} ${styles.graphNodeOne}`}><CircleCheck size={21} /></span><span className={`${styles.graphNode} ${styles.graphNodeTwo}`}><GitBranch size={25} /></span><span className={`${styles.graphNode} ${styles.graphNodeThree}`}><ArrowUpRight size={21} /></span><span className={`${styles.graphNode} ${styles.graphNodeFour}`} /></> : <><div className={styles.insightsSheet}><span className={styles.insightsSheetLine} /><span className={styles.insightsSheetLineShort} /><div className={styles.insightsBars}><i /><i /><i /><i /><i /></div></div><span className={styles.insightsBadge}><ChartNoAxesCombined size={30} /></span></>}</div>;
}

function Services() {
  return <section className={styles.services} id="services" aria-label="Инструменты анализа">
    <article className={`${styles.serviceCard} ${styles.serviceDark}`}><div className={styles.serviceCopy}><span className={styles.outlineTag}>Анализ связей</span><h2>От транзакции<br />к полной сети</h2><p>Изучайте участников, направления переводов и скрытые связи в интерактивном графе.</p></div><ServiceVisual kind="graph" /><Link className={styles.arrowButton} href="/workspace" aria-label="Перейти к анализу связей"><ArrowUpRight size={21} /></Link></article>
    <article className={`${styles.serviceCard} ${styles.serviceLight}`}><div className={styles.serviceCopy}><span className={styles.outlineTag}>Оценка рисков</span><h2>Сигналы, которые<br />стоит проверить</h2><p>Сводка и приоритеты помогают быстрее выбрать путь дальнейшего расследования.</p></div><ServiceVisual kind="insights" /><Link className={styles.arrowButton} href="/workspace?demo=1" aria-label="Посмотреть оценку рисков"><ArrowUpRight size={21} /></Link></article>
  </section>;
}

export function LandingPage() {
  return <main className={styles.landing}><div className={styles.container}><Header /><FilterNav /><Hero /><Features /><HelpBanner /><Services /><AudienceSection /><footer className={styles.footer}><span className={styles.footerLogo}>ГРАФ<span>ДЕНЕГ</span></span><p>Инструмент для исследования денежных потоков и связей.</p><Link href="/workspace">В рабочее пространство <ArrowRight size={16} /></Link></footer></div></main>;
}
