export const integer = (value: number) =>
  new Intl.NumberFormat("ru-RU").format(value);
/** Decimal strings stay exact, including values beyond Number.MAX_SAFE_INTEGER. */
export function money(value: string, withCurrency = true) {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) return "—";
  const fraction = (match[2] || "").padEnd(3, "0");
  let minor = BigInt(match[1]) * 100n + BigInt(fraction.slice(0, 2));
  if (fraction[2] >= "5") minor += 1n;
  const whole = new Intl.NumberFormat("ru-RU").format(minor / 100n);
  return `${whole},${String(minor % 100n).padStart(2, "0")}${withCurrency ? " ₸" : ""}`;
}
export function compactMoney(value: string) {
  const whole = BigInt(value.split(".")[0] || "0");
  const unit =
    whole >= 1_000_000_000n
      ? ([1_000_000_000n, "млрд"] as const)
      : whole >= 1_000_000n
        ? ([1_000_000n, "млн"] as const)
        : whole >= 1_000n
          ? ([1_000n, "тыс."] as const)
          : null;
  if (!unit) return money(value);
  return `${whole / unit[0]},${((whole % unit[0]) * 10n) / unit[0]} ${unit[1]} ₸`;
}
export function dateLabel(value: string) {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }).format(parsed);
}
export const scoreLabel = (value: number) => value.toFixed(3);
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
