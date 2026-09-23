"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Building2, UserRound } from "lucide-react";
import styles from "./landing.module.css";

type Audience = "all" | "people" | "business";

const tabs: { label: string; value: Audience }[] = [
  { label: "Все направления", value: "all" },
  { label: "Физическим лицам", value: "people" },
  { label: "Юридическим лицам", value: "business" },
];

const cards = [
  {
    value: "people" as const,
    title: "Физическим лицам",
    description: "Разберитесь, как связаны участники и переводы.",
    links: ["История переводов", "Связи между участниками", "Демонстрационный анализ"],
    icon: UserRound,
    href: "/workspace?demo=1",
  },
  {
    value: "business" as const,
    title: "Юридическим лицам",
    description: "Исследуйте сложные цепочки и риски в сети операций.",
    links: ["Анализ контрагентов", "Приоритетные сигналы", "Экспорт результатов"],
    icon: Building2,
    href: "/workspace",
  },
];

export function AudienceSection() {
  const [active, setActive] = useState<Audience>("all");
  return <section className={styles.audience} id="audience" aria-labelledby="audience-title">
    <div className={styles.audienceHeading}><span>Для разных задач</span><h2 id="audience-title">Что вас интересует?</h2><p>Выберите направление и начните исследование в рабочем пространстве.</p></div>
    <div className={styles.audienceTabs} role="group" aria-label="Категория пользователя">
      {tabs.map((tab) => <button key={tab.value} type="button" className={`${styles.audienceTab} ${active === tab.value ? styles.audienceTabActive : ""}`} onClick={() => setActive(tab.value)} aria-pressed={active === tab.value}>{tab.label}</button>)}
    </div>
    <div className={styles.audienceGrid}>
      {cards.filter((card) => active === "all" || active === card.value).map((card) => <article className={styles.audienceCard} key={card.value}>
        <div className={styles.audienceCopy}><h3>{card.title}</h3><p>{card.description}</p><ul>{card.links.map((label) => <li key={label}><Link href={card.href}>{label}</Link></li>)}</ul><Link className={styles.audienceAction} href={card.href}>Все инструменты <ArrowUpRight size={15} /></Link></div>
        <div className={`${styles.audienceArt} ${card.value === "people" ? styles.audienceArtPeople : styles.audienceArtBusiness}`} aria-hidden="true"><div className={styles.audienceArtCircle}><card.icon size={64} strokeWidth={1.2} /></div><span className={styles.audienceArtDot} /></div>
      </article>)}
    </div>
  </section>;
}
