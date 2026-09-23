import ruCommon from "./ru/common.json";
import ruLanding from "./ru/landing.json";
import ruWorkspace from "./ru/workspace.json";
import ruExtras from "./ru/extras.json";
import kkCommon from "./kk/common.json";
import kkLanding from "./kk/landing.json";
import kkWorkspace from "./kk/workspace.json";
import kkExtras from "./kk/extras.json";
import enCommon from "./en/common.json";
import enLanding from "./en/landing.json";
import enWorkspace from "./en/workspace.json";
import enExtras from "./en/extras.json";
import type { Locale } from "@/lib/preferences";

export type Namespace = "common" | "landing" | "workspace" | "extras";
export const catalogs: Record<Locale, Record<Namespace, Record<string, string>>> = {
  ru: { common: ruCommon, landing: ruLanding, workspace: ruWorkspace, extras: ruExtras },
  kk: { common: kkCommon, landing: kkLanding, workspace: kkWorkspace, extras: kkExtras },
  en: { common: enCommon, landing: enLanding, workspace: enWorkspace, extras: enExtras },
};
