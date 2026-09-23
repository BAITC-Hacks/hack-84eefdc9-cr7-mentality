"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, LoaderCircle, Network, Play, ScanSearch, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/preferences/PreferencesProvider";

const features = [
  { icon: Network, key: "network" },
  { icon: ScanSearch, key: "signals" },
  { icon: ShieldCheck, key: "evidence" },
];

export function AnalysisStart({ onStart, running, showDemo }: {
  onStart: () => void;
  running: boolean;
  showDemo: boolean;
}) {
  const { t } = useI18n("workspace");
  const { t: landingText } = useI18n("landing");
  return <div className="analysis-start">
    <section className="start-panel" aria-labelledby="start-title">
      <div className="start-copy">
        <span className="start-tag"><span />{t("start.eyebrow")}</span>
        <h2 id="start-title">{t("start.title")}</h2>
        <p>{t("start.description")}</p>
        <div className="start-actions">
          <Button onClick={onStart} disabled={running}>
            {running ? <LoaderCircle size={17} className="spin" /> : <Play size={17} />}
            {t(running ? "start.running" : "start.action")}
          </Button>
          {showDemo && <Link className="button start-demo" href="/workspace?demo=1">{t("start.demo")}<ArrowUpRight size={16} /></Link>}
        </div>
        {running && <p className="start-progress" role="status">{t("start.wait")}</p>}
      </div>
      <div className="start-art" aria-hidden="true">
        <Image src="/landing/transaction-graph-hero.png" alt="" width={1536} height={1024} sizes="(max-width: 750px) 100vw, 50vw" priority />
      </div>
    </section>
    <section className="analysis-features" aria-label={landingText("features.label")}>
      {features.map(({ icon: Icon, key }) => <article className="analysis-feature" key={key}>
        <span className="analysis-feature-icon"><Icon size={25} strokeWidth={1.8} /></span>
        <h3>{landingText(`features.${key}.title`)}</h3>
        <p>{landingText(`features.${key}.description`)}</p>
      </article>)}
    </section>
    <p className="start-note"><ShieldCheck size={21} /><span>{t("start.note")}</span></p>
  </div>;
}
