"use client";

import { PreferencesControls } from "@/components/preferences/PreferencesControls";
import { useI18n } from "@/components/preferences/PreferencesProvider";
import { demoAvailable, workspacePreviewHref } from "@/lib/demo";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, ChartNoAxesCombined, CircleCheck, GitBranch, Network, ScanSearch, ShieldCheck } from "lucide-react";
import { AudienceSection } from "./AudienceSection";
import styles from "./landing.module.css";

const filters = [
  { label: "nav.features", href: "#features" },
  { label: "nav.connections", href: "#services" },
  { label: "nav.risks", href: "#services" },
  { label: "nav.audience", href: "#audience" },
  { label: "nav.methodology", href: "/methodology" },
];

const features = [
  { icon: Network, title: "features.network.title", description: "features.network.description" },
  { icon: ScanSearch, title: "features.signals.title", description: "features.signals.description" },
  { icon: ShieldCheck, title: "features.evidence.title", description: "features.evidence.description" },
];

function ActionLink({ children, href, secondary = false }: { children: React.ReactNode; href: string; secondary?: boolean }) {
  return <Link className={`${styles.action} ${secondary ? styles.actionSecondary : styles.actionPrimary}`} href={href}>{children}</Link>;
}

function Header() {
  const { t } = useI18n("landing");
  return <header className={styles.header}>
    <Link className={styles.logo} href="/" aria-label={t("brand.home")}><span className={styles.logoMark} aria-hidden="true"><i /><i /><i /></span><span>{t("brand.first")}<span className={styles.logoAccent}>{t("brand.second")}</span></span></Link>
    <nav className={styles.mainNav} aria-label={t("nav.main")}><a href="#features">{t("nav.features")}</a><a href="#services">{t("nav.howItWorks")}</a><a href="#audience">{t("nav.audience")}</a><Link href="/methodology">{t("nav.methodology")}</Link></nav>
    <div className={styles.headerActions}><PreferencesControls />{demoAvailable && <Link className={styles.headerQuiet} href={workspacePreviewHref}>{t("action.viewDemo")}</Link>}<ActionLink href="/workspace">{t("action.start")} <ArrowUpRight size={16} /></ActionLink></div>
  </header>;
}

function FilterNav() {
  const { t } = useI18n("landing");
  return <nav className={styles.filterNav} aria-label={t("nav.sections")}>
    <div className={styles.filterScroll}>{filters.map((filter, index) => <Link className={`${styles.filter} ${index === 0 ? styles.filterActive : ""}`} href={filter.href} key={filter.label}>{t(filter.label)}</Link>)}</div>
    <Link className={styles.filterAll} href={workspacePreviewHref}>{t(demoAvailable ? "action.openDemo" : "action.workspace")} <ArrowRight size={15} /></Link>
  </nav>;
}

function Hero() {
  const { t } = useI18n("landing");
  return <section className={styles.hero} aria-labelledby="hero-title">
    <div className={styles.heroContent}><span className={styles.outlineTag}>{t("hero.tag")}</span><h1 id="hero-title">{t("hero.title")}</h1><p>{t("hero.description")}</p><div className={styles.heroActions}><ActionLink href="/workspace">{t("action.start")} <ArrowUpRight size={17} /></ActionLink><ActionLink href="#features" secondary>{t("action.learnMore")} <ArrowRight size={17} /></ActionLink></div></div>
    <div className={styles.heroVisual} aria-hidden="true"><div className={styles.heroVisualHalo} /><Image src="/landing/transaction-graph-hero.png" alt="" width={1536} height={1024} priority className={styles.heroImage} /></div>
    <span className={styles.heroPagination} aria-hidden="true"><i /><i /><i /></span>
  </section>;
}

function Features() {
  const { t } = useI18n("landing");
  return <section className={styles.features} id="features" aria-label={t("features.label")}>{features.map(({ icon: Icon, title, description }) => <article className={styles.featureCard} key={title}><span className={styles.featureIcon}><Icon size={25} strokeWidth={1.8} /></span><h2>{t(title)}</h2><p>{t(description)}</p></article>)}</section>;
}

function HelpBanner() {
  const { t } = useI18n("landing");
  return <section className={styles.helpBanner} aria-label={t("banner.label")}><div className={styles.helpMessage}><span className={styles.helpIcon}><GitBranch size={22} /></span><div><strong>{t("banner.title")}</strong><span>{t("banner.description")}</span></div></div><ActionLink href={workspacePreviewHref}>{t(demoAvailable ? "action.tryDemo" : "action.start")} <ArrowUpRight size={16} /></ActionLink></section>;
}

function ServiceVisual({ kind }: { kind: "graph" | "insights" }) {
  return <div className={`${styles.serviceVisual} ${kind === "graph" ? styles.graphVisual : styles.insightsVisual}`} aria-hidden="true">{kind === "graph" ? <><span className={styles.graphLineOne} /><span className={styles.graphLineTwo} /><span className={styles.graphLineThree} /><span className={`${styles.graphNode} ${styles.graphNodeOne}`}><CircleCheck size={21} /></span><span className={`${styles.graphNode} ${styles.graphNodeTwo}`}><GitBranch size={25} /></span><span className={`${styles.graphNode} ${styles.graphNodeThree}`}><ArrowUpRight size={21} /></span><span className={`${styles.graphNode} ${styles.graphNodeFour}`} /></> : <><div className={styles.insightsSheet}><span className={styles.insightsSheetLine} /><span className={styles.insightsSheetLineShort} /><div className={styles.insightsBars}><i /><i /><i /><i /><i /></div></div><span className={styles.insightsBadge}><ChartNoAxesCombined size={30} /></span></>}</div>;
}

function Services() {
  const { t } = useI18n("landing");
  return <section className={styles.services} id="services" aria-label={t("services.label")}>
    <article className={`${styles.serviceCard} ${styles.serviceDark}`}><div className={styles.serviceCopy}><span className={styles.outlineTag}>{t("services.graph.tag")}</span><h2>{t("services.graph.title")}</h2><p>{t("services.graph.description")}</p></div><ServiceVisual kind="graph" /><Link className={styles.arrowButton} href="/workspace" aria-label={t("services.graph.action")}><ArrowUpRight size={21} /></Link></article>
    <article className={`${styles.serviceCard} ${styles.serviceLight}`}><div className={styles.serviceCopy}><span className={styles.outlineTag}>{t("services.risks.tag")}</span><h2>{t("services.risks.title")}</h2><p>{t("services.risks.description")}</p></div><ServiceVisual kind="insights" /><Link className={styles.arrowButton} href={workspacePreviewHref} aria-label={t("services.risks.action")}><ArrowUpRight size={21} /></Link></article>
  </section>;
}

export function LandingPage() {
  const { t } = useI18n("landing");
  return <main className={styles.landing}><div className={styles.container}><Header /><FilterNav /><Hero /><Features /><HelpBanner /><Services /><AudienceSection /><footer className={styles.footer}><span className={styles.footerLogo}>{t("brand.first")}<span>{t("brand.second")}</span></span><p>{t("footer.description")}</p><Link href="/workspace">{t("action.workspace")} <ArrowRight size={16} /></Link></footer></div></main>;
}
