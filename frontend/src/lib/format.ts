export const integer = (value: number, locale = "ru-RU") =>
  new Intl.NumberFormat(locale).format(value);
/** Decimal strings stay exact, including values beyond Number.MAX_SAFE_INTEGER. */
export function money(value: string, withCurrency = true, locale = "ru-RU") {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) return "—";
  const fraction = (match[2] || "").padEnd(3, "0");
  let minor = BigInt(match[1]) * 100n + BigInt(fraction.slice(0, 2));
  if (fraction[2] >= "5") minor += 1n;
  const whole = new Intl.NumberFormat(locale).format(minor / 100n);
  const separator = new Intl.NumberFormat(locale).formatToParts(1.1).find((part) => part.type === "decimal")?.value ?? ".";
  return `${whole}${separator}${String(minor % 100n).padStart(2, "0")}${withCurrency ? " ₸" : ""}`;
}
export function compactMoney(value: string, locale = "ru-RU") {
  const whole = BigInt(value.split(".")[0] || "0");
  if (whole < 1_000n) return money(value, true, locale);
  return `${new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(whole)} ₸`;
}
export function dateLabel(value: string, locale = "ru-RU") {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }).format(parsed);
}
export const scoreLabel = (value: number, locale?: string) => locale
  ? new Intl.NumberFormat(locale, { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(value)
  : value.toFixed(3);
export function validateGid(value: string) {
  const raw = value.trim();
  if (!/^-?(0|[1-9][0-9]*)$/.test(raw))
    return "Введите целый gid без знака плюс и ведущих нулей.";
  const valueAsBigInt = BigInt(raw);
  if (
    valueAsBigInt < -9223372036854775808n ||
    valueAsBigInt > 9223372036854775807n
  )
    return "gid выходит за пределы int64.";
  return null;
}
export function canonicalGid(value: string | null) {
  if (value === null || validateGid(value) !== null) return null;
  return BigInt(value.trim()).toString();
}
