"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Building2, UserRound } from "lucide-react";
import { useI18n } from "@/components/preferences/PreferencesProvider";
import { workspacePreviewHref } from "@/lib/demo";
import styles from "./landing.module.css";

type Audience = "all" | "people" | "business";

const tabs: Audience[] = ["all", "people", "business"];
const cards = [
  { value: "people" as const, icon: UserRound, href: workspacePreviewHref },
  { value: "business" as const, icon: Building2, href: "/workspace" },
];

export function AudienceSection() {
  const [active, setActive] = useState<Audience>("all");
  const { t } = useI18n("landing");
  return (
    <section className={styles.audience} id="audience" aria-labelledby="audience-title">
      <div className={styles.audienceHeading}><span>{t("audience.tag")}</span><h2 id="audience-title">{t("audience.title")}</h2><p>{t("audience.description")}</p></div>
      <div className={styles.audienceTabs} role="group" aria-label={t("audience.category")}>
        {tabs.map((tab) => <button key={tab} type="button" className={`${styles.audienceTab} ${active === tab ? styles.audienceTabActive : ""}`} onClick={() => setActive(tab)} aria-pressed={active === tab}>{t(`audience.${tab}.title`)}</button>)}
      </div>
      <div className={styles.audienceGrid}>
        {cards.filter((card) => active === "all" || active === card.value).map((card) => <article className={styles.audienceCard} key={card.value}>
          <div className={styles.audienceCopy}><h3>{t(`audience.${card.value}.title`)}</h3><p>{t(`audience.${card.value}.description`)}</p><ul>{[1, 2, 3].map((link) => <li key={link}><Link href={card.href}>{t(`audience.${card.value}.link${link}`)}</Link></li>)}</ul><Link className={styles.audienceAction} href={card.href}>{t("action.allTools")} <ArrowUpRight size={15} /></Link></div>
          <div className={`${styles.audienceArt} ${card.value === "people" ? styles.audienceArtPeople : styles.audienceArtBusiness}`} aria-hidden="true"><div className={styles.audienceArtCircle}><card.icon size={64} strokeWidth={1.2} /></div><span className={styles.audienceArtDot} /></div>
        </article>)}
      </div>
    </section>
  );
}
